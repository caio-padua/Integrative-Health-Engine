import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type ClassificacaoIntegrativa =
  | "CRITICO"     // abaixo do minimo (ou acima do maximo se invertido)
  | "ALERTA"      // borda inferior (em terco inferior se SUPERIOR=excelente; em terco superior se INFERIOR=excelente)
  | "ACEITAVEL"   // terco medio
  | "EXCELENTE"   // terco favoravel ao analito
  | "AVALIAR";    // acima do maximo (pode ser bom ou ruim - precisa contexto clinico)

export type CorClassificacao = "VERMELHO" | "AMARELO" | "LARANJA" | "VERDE" | "AZUL";

const COR_POR_CLASSIFICACAO: Record<ClassificacaoIntegrativa, CorClassificacao> = {
  CRITICO: "VERMELHO",
  ALERTA: "AMARELO",
  ACEITAVEL: "LARANJA",
  EXCELENTE: "VERDE",
  AVALIAR: "AZUL",
};

export type ResultadoAnalitoInput = {
  analitoCodigo: string;
  valorOriginal: number;
  unidadeOriginal: string;
  laboratorio?: string;
  sexo?: "M" | "F" | "AMBOS";
  idadeAnos?: number;
};

export type ResultadoAnalitoClassificado = {
  analito_codigo: string;
  analito_nome: string;
  grupo: string;
  laboratorio_usado: string;
  sexo_usado: string;
  valor_original: number;
  unidade_original: string;
  unidade_padrao: string;
  valor_normalizado: number;
  valor_min_ref: number;
  valor_max_ref: number;
  terco_excelente: string;
  terco_atual: "INFERIOR" | "MEDIO" | "SUPERIOR" | "ABAIXO" | "ACIMA";
  classificacao: ClassificacaoIntegrativa;
  cor: CorClassificacao;
  explicacao: string;
};

async function buscarFatorConversao(origem: string, destino: string, contexto: string | null): Promise<number | null> {
  if (origem === destino) return 1;
  const rows: any = await db.execute(sql`
    SELECT fator_multiplicacao FROM unidades_conversao
    WHERE unidade_origem = ${origem} AND unidade_destino = ${destino}
      AND (contexto = ${contexto} OR contexto IS NULL)
    ORDER BY contexto NULLS LAST LIMIT 1
  `);
  const f = (rows.rows ?? rows)[0];
  return f ? Number(f.fator_multiplicacao) : null;
}

export async function classificarAnalito(input: ResultadoAnalitoInput): Promise<ResultadoAnalitoClassificado> {
  const catRows: any = await db.execute(sql`
    SELECT * FROM analitos_catalogo WHERE codigo = ${input.analitoCodigo} AND ativo = true
  `);
  const cat = (catRows.rows ?? catRows)[0];
  if (!cat) throw new Error(`Analito ${input.analitoCodigo} nao catalogado`);

  const sexoBusca = input.sexo ?? "AMBOS";
  const idade = input.idadeAnos ?? 30;
  const labBusca = input.laboratorio ?? "GENERICO";

  // Busca referencia: prioriza lab+sexo+faixa_etaria; cai pra GENERICO; cai pra AMBOS
  const refRows: any = await db.execute(sql`
    SELECT * FROM analitos_referencia_laboratorio
    WHERE analito_codigo = ${input.analitoCodigo}
      AND (laboratorio = ${labBusca} OR laboratorio = 'GENERICO')
      AND (sexo = ${sexoBusca} OR sexo = 'AMBOS')
      AND (faixa_etaria_min IS NULL OR faixa_etaria_min <= ${idade})
      AND (faixa_etaria_max IS NULL OR faixa_etaria_max >= ${idade})
    ORDER BY
      CASE WHEN laboratorio = ${labBusca} THEN 0 ELSE 1 END,
      CASE WHEN sexo = ${sexoBusca} THEN 0 ELSE 1 END
    LIMIT 1
  `);
  const ref = (refRows.rows ?? refRows)[0];
  if (!ref) throw new Error(`Sem referencia laboratorial para ${input.analitoCodigo}`);

  // Conversao para unidade padrao da clinica
  const unidadePadrao = String(cat.unidade_padrao_integrativa);
  let valorNormalizado = Number(input.valorOriginal);
  let valorMinRef = Number(ref.valor_min_ref);
  let valorMaxRef = Number(ref.valor_max_ref);
  const unidadeRef = String(ref.unidade_origem);

  if (input.unidadeOriginal !== unidadePadrao) {
    const f = await buscarFatorConversao(input.unidadeOriginal, unidadePadrao, input.analitoCodigo);
    if (f == null) throw new Error(`Sem conversao de ${input.unidadeOriginal} para ${unidadePadrao}`);
    valorNormalizado = Number(input.valorOriginal) * f;
  }
  if (unidadeRef !== unidadePadrao) {
    const f2 = await buscarFatorConversao(unidadeRef, unidadePadrao, input.analitoCodigo);
    if (f2 == null) throw new Error(`Sem conversao da referencia ${unidadeRef} para ${unidadePadrao}`);
    valorMinRef = valorMinRef * f2;
    valorMaxRef = valorMaxRef * f2;
  }

  // Divide a faixa em 3 tercos iguais
  const faixa = valorMaxRef - valorMinRef;
  const limiteInferiorMedio = valorMinRef + faixa / 3;
  const limiteMedioSuperior = valorMinRef + (2 * faixa) / 3;

  let tercoAtual: ResultadoAnalitoClassificado["terco_atual"];
  if (valorNormalizado < valorMinRef) tercoAtual = "ABAIXO";
  else if (valorNormalizado > valorMaxRef) tercoAtual = "ACIMA";
  else if (valorNormalizado < limiteInferiorMedio) tercoAtual = "INFERIOR";
  else if (valorNormalizado < limiteMedioSuperior) tercoAtual = "MEDIO";
  else tercoAtual = "SUPERIOR";

  const tercoExcelente = String(cat.terco_excelente); // SUPERIOR | INFERIOR | MEDIO

  // Mapeia terco -> classificacao integrativa segundo a regra do analito
  let classificacao: ClassificacaoIntegrativa;
  let explicacao: string;
  if (tercoAtual === "ABAIXO") {
    if (tercoExcelente === "INFERIOR") { classificacao = "ALERTA"; explicacao = "Abaixo do minimo, mas analito favorece valores baixos: monitorar."; }
    else { classificacao = "CRITICO"; explicacao = "Abaixo do minimo de referencia. Reposicao indicada."; }
  } else if (tercoAtual === "ACIMA") {
    if (tercoExcelente === "INFERIOR") { classificacao = "CRITICO"; explicacao = "Acima do maximo em analito que deveria ser baixo. Critico."; }
    else { classificacao = "AVALIAR"; explicacao = "Acima do maximo: pode ser excelente ou alerta - avaliar contexto clinico."; }
  } else if (tercoAtual === tercoExcelente) {
    classificacao = "EXCELENTE"; explicacao = `No terco ${tercoAtual.toLowerCase()} dentro da faixa - excelente para ${cat.nome}.`;
  } else if (tercoAtual === "MEDIO") {
    classificacao = "ACEITAVEL"; explicacao = "No terco medio - aceitavel, ha espaco para otimizacao.";
  } else {
    classificacao = "ALERTA"; explicacao = `No terco ${tercoAtual.toLowerCase()} - atencao, longe do alvo integrativo.`;
  }

  return {
    analito_codigo: String(cat.codigo),
    analito_nome: String(cat.nome),
    grupo: String(cat.grupo),
    laboratorio_usado: String(ref.laboratorio),
    sexo_usado: String(ref.sexo),
    valor_original: Number(input.valorOriginal),
    unidade_original: input.unidadeOriginal,
    unidade_padrao: unidadePadrao,
    valor_normalizado: Math.round(valorNormalizado * 100) / 100,
    valor_min_ref: Math.round(valorMinRef * 100) / 100,
    valor_max_ref: Math.round(valorMaxRef * 100) / 100,
    terco_excelente: tercoExcelente,
    terco_atual: tercoAtual,
    classificacao,
    cor: COR_POR_CLASSIFICACAO[classificacao],
    explicacao,
  };
}

export async function classificarLote(inputs: ResultadoAnalitoInput[]) {
  const resultados: Array<ResultadoAnalitoClassificado | { erro: string; input: ResultadoAnalitoInput }> = [];
  for (const inp of inputs) {
    try { resultados.push(await classificarAnalito(inp)); }
    catch (e) { resultados.push({ erro: (e as Error).message, input: inp }); }
  }
  return resultados;
}
