/**
 * PRESCRIÇÃO PADCON UNIVERSAL — MOTOR DE DEDUÇÃO
 * Manifesto Blueprint v2.0 — REGRAS 04, 05, 13 e 14
 *
 * 4 funções puras (sem IO) — fáceis de testar:
 *   - deduzirDestino()       → REGRA 04 (1º retângulo do título)
 *   - deduzirMafia4()        → REGRA 05 (2º retângulo do título)
 *   - aplicarRegra14()       → explode bloco quando controlado+não-controlado
 *   - agruparEmPDFs()        → 1 prescrição → N PDFs por (cor, destino)
 *
 * Princípio: O médico só classifica clinicamente. O motor deduz tudo.
 */

// =====================================================================
// TIPOS DE DOMÍNIO
// =====================================================================

/** Códigos ANVISA reconhecidos pelo motor (REGRA 05) */
export type CodigoReceitaAnvisa =
  | "BRANCA_SIMPLES" // sem cor / industrializado comum
  | "ANTIBIOTICO_RDC20"
  | "C1" // Branca Controle Especial 2 vias
  | "C2" // Retinoides
  | "C3" // Talidomida
  | "C5" // Anabolizantes
  | "B1" // Azul Psicotrópico
  | "B2" // Azul Anorexígeno
  | "A1" // Amarela Entorpecente
  | "A2" // Amarela Psicoestimulante
  | "A3" // Amarela Psicotrópico
  | "MAGISTRAL" // RDC 67 manipulação
  | "LILAS_HORMONAL"
  | "VERDE_FITO";

/** Destino físico do PDF (REGRA 04) */
export type DestinoDispensacao =
  | "FAMA" // FArmácia de MAnipulação
  | "FACO" // FArmácia COmum
  | "FAOP" // FArmácia OPcional (paciente escolhe)
  | "FAMX" // FA Mistura — FAMA + FACO no bloco
  | "INJE" // Injetável aplicado clinicamente
  | "FITO" // Fitoterápico registrado
  | "HORM" // Hormonal Lilás
  | "CONT"; // Controlado puro isolado

/** Cor visual do PDF emitido */
export type CorPdf =
  | "branco"
  | "azul"
  | "amarelo"
  | "lilas"
  | "verde"
  | "magistral";

/** Ativo individual dentro de um bloco (entrada do motor) */
export interface AtivoEntrada {
  nome: string;
  dose_valor: number;
  dose_unidade: string;
  tipo_receita_anvisa_codigo: CodigoReceitaAnvisa;
  controlado: boolean;
  /** Farmácia onde naturalmente é dispensado (se conhecido) */
  farmacia_padrao?: DestinoDispensacao;
  observacao?: string;
}

/** Bloco de Fórmula como o médico cria na tela */
export interface BlocoEntrada {
  apelido: string; // "Performance Foco Ansiedade"
  via_administracao: string; // "ORAL", "SUBLINGUAL", "IM", etc.
  forma_farmaceutica_sugestao?: string;
  ativos: AtivoEntrada[];
  observacoes?: string;
}

/** Bloco já processado pelo motor (saída) */
export interface BlocoProcessado extends BlocoEntrada {
  destino_dispensacao: DestinoDispensacao;
  codigo_mafia4: string;
  /** Se este bloco veio de uma explosão pela REGRA 14, aponta pro pai */
  origem_apelido?: string;
  marcacao_manipular_junto?: string;
  formula_composta_apelido?: string;
}

/** PDF agrupado pronto para emissão (saída final) */
export interface PdfAgrupado {
  ordem: number;
  cor_visual: CorPdf;
  tipo_receita_anvisa_codigo: CodigoReceitaAnvisa;
  destino_dispensacao: DestinoDispensacao;
  blocos: BlocoProcessado[];
  exige_sncr: boolean;
  marcacao_manipular_junto?: string;
}

// =====================================================================
// TABELAS DE REFERÊNCIA
// =====================================================================

/** Códigos ANVISA que exigem numeração SNCR */
const EXIGE_SNCR: Set<CodigoReceitaAnvisa> = new Set([
  "B1",
  "B2",
  "A1",
  "A2",
  "A3",
]);

/** Cores legais por código ANVISA */
const COR_POR_CODIGO: Record<CodigoReceitaAnvisa, CorPdf> = {
  BRANCA_SIMPLES: "branco",
  ANTIBIOTICO_RDC20: "branco",
  C1: "branco",
  C2: "branco",
  C3: "branco",
  C5: "branco",
  B1: "azul",
  B2: "azul",
  A1: "amarelo",
  A2: "amarelo",
  A3: "amarelo",
  MAGISTRAL: "magistral",
  LILAS_HORMONAL: "lilas",
  VERDE_FITO: "verde",
};

// Removido em 22/abr/2026 (PARMASUPRA-TSUNAMI T1): SAO_CONTROLADOS estava
// definido mas nunca consultado. A flag `controlado` no proprio AtivoEntrada
// e a fonte de verdade. Code review architect apontou como dead code.

// =====================================================================
// REGRA 05 — deduzirMafia4()
// =====================================================================

/**
 * Deduz o código MAFIA-4 (4 caracteres) que identifica as cores/grupos
 * presentes num bloco. Slots vazios viram '_'.
 */
export function deduzirMafia4(ativos: AtivoEntrada[]): string {
  const codigos = new Set(ativos.map((a) => a.tipo_receita_anvisa_codigo));

  // ===== Casos puros sozinhos =====
  if (codigos.size === 1) {
    const unico = [...codigos][0];
    switch (unico) {
      case "B1":
        return "B1__";
      case "B2":
        return "B2__";
      case "A1":
        return "A1__";
      case "A2":
        return "A2__";
      case "A3":
        return "A3__";
      case "C1":
        return "C1__";
      case "C2":
        return "C2__";
      case "C3":
        return "C3__";
      case "C5":
        return "C5__";
      case "BRANCA_SIMPLES":
      case "ANTIBIOTICO_RDC20":
        return "N___";
      case "MAGISTRAL":
        return "M___";
      case "LILAS_HORMONAL":
        return "L___";
      case "VERDE_FITO":
        return "V___";
    }
  }

  // ===== Combinações conhecidas multi-código =====
  const tem = (c: CodigoReceitaAnvisa) => codigos.has(c);
  const apenas = (...cs: CodigoReceitaAnvisa[]) =>
    codigos.size === cs.length && cs.every(tem);

  // Múltiplos B
  if (apenas("B1", "B2")) return "B12_";

  // Múltiplos A
  if (apenas("A1", "A2")) return "A12_";
  if (apenas("A1", "A3")) return "A13_";
  if (apenas("A2", "A3")) return "A23_";
  if (apenas("A1", "A2", "A3")) return "A123";

  // Múltiplos C
  if (apenas("C1", "C5")) return "C15_";

  // Híbridos 2 cores
  const grupos = new Set<string>();
  for (const c of codigos) {
    if (c === "B1" || c === "B2") grupos.add("B");
    else if (c === "A1" || c === "A2" || c === "A3") grupos.add("A");
    else if (
      c === "C1" ||
      c === "C2" ||
      c === "C3" ||
      c === "C5"
    )
      grupos.add("C");
    else if (c === "BRANCA_SIMPLES" || c === "ANTIBIOTICO_RDC20")
      grupos.add("N");
    else if (c === "MAGISTRAL") grupos.add("M");
    else if (c === "LILAS_HORMONAL") grupos.add("L");
    else if (c === "VERDE_FITO") grupos.add("V");
  }

  if (grupos.size === 2) {
    if (grupos.has("B") && grupos.has("C")) return "HBC_";
    if (grupos.has("M") && grupos.has("N")) return "HMN_";
    if (grupos.has("M") && grupos.has("L")) return "HML_";
    if (grupos.has("A") && grupos.has("B")) return "HAB_";
  }
  if (grupos.size === 3) {
    if (grupos.has("A") && grupos.has("B") && grupos.has("N")) return "HABN";
    if (grupos.has("A") && grupos.has("B") && grupos.has("C")) return "HABC";
  }
  if (grupos.size >= 4) return "HMIX";

  // fallback genérico
  return "HMIX";
}

// =====================================================================
// REGRA 04 — deduzirDestino()
// =====================================================================

/**
 * Deduz o destino físico de dispensação para um bloco.
 * Regras simplificadas (a tabela completa do Manifesto cobre 8 destinos):
 *   - Bloco com controlado SOZINHO            → FAOP (paciente escolhe)
 *   - Bloco com controlado + não-controlado   → FAMA (manipulação obrigatória)
 *   - Bloco só Magistral                      → FAMA
 *   - Bloco só Lilás Hormonal                 → HORM
 *   - Bloco só Verde Fito                     → FITO
 *   - Bloco só Branca Simples                 → FACO
 *   - Bloco mistura sem controlado            → FAMA (precisa juntar tudo)
 */
export function deduzirDestino(ativos: AtivoEntrada[]): DestinoDispensacao {
  if (ativos.length === 0) return "FACO";

  const temControlado = ativos.some((a) => a.controlado);
  const todosControlados = ativos.every((a) => a.controlado);
  const codigos = new Set(ativos.map((a) => a.tipo_receita_anvisa_codigo));

  // Bloco com controlado + não-controlado: REGRA 14.3 → FAMA obrigatório
  if (temControlado && !todosControlados) return "FAMA";

  // Múltiplos controlados sem outros: REGRA 14.2 → FAOP por PDF
  if (todosControlados) return "FAOP";

  // Sem controlados — varia por código
  if (codigos.size === 1) {
    const unico = [...codigos][0];
    if (unico === "MAGISTRAL") return "FAMA";
    if (unico === "LILAS_HORMONAL") return "HORM";
    if (unico === "VERDE_FITO") return "FITO";
    if (unico === "BRANCA_SIMPLES" || unico === "ANTIBIOTICO_RDC20")
      return "FACO";
  }

  // Mistura sem controlados — precisa de manipulação para juntar
  return "FAMA";
}

// =====================================================================
// REGRA 14 — aplicarRegra14_isolamento()
// =====================================================================

/**
 * Aplica a REGRA 14 sobre um bloco de entrada e retorna 1+ blocos processados.
 *
 * REGRA 14.1 — Controlado sozinho           → 1 bloco, destino FAOP
 * REGRA 14.2 — Múltiplos controlados juntos → N blocos (1 por cor), destino FAOP
 * REGRA 14.3 — Controlado + não-controlado  → N+1 blocos (controlados separados +
 *                                              1 magistral c/ os não-controlados),
 *                                              todos com marcação MANIPULAR JUNTO,
 *                                              destino FAMA obrigatório
 */
export function aplicarRegra14(bloco: BlocoEntrada): BlocoProcessado[] {
  const ativos = bloco.ativos;
  const controlados = ativos.filter((a) => a.controlado);
  const naoControlados = ativos.filter((a) => !a.controlado);

  // Caso 14.1 — controlado sozinho num bloco mononumtrico
  if (controlados.length === 1 && naoControlados.length === 0) {
    // Removida variavel `codigo` nao consultada (PARMASUPRA-TSUNAMI T1).
    // O codigo_mafia4 vem de deduzirMafia4(ativos) abaixo.
    return [
      {
        ...bloco,
        destino_dispensacao: "FAOP",
        codigo_mafia4: deduzirMafia4(ativos),
      },
    ];
  }

  // Caso 14.2 — múltiplos controlados, sem não-controlados
  if (controlados.length > 1 && naoControlados.length === 0) {
    // Agrupa controlados por código (cada cor é 1 bloco)
    const porCodigo = new Map<CodigoReceitaAnvisa, AtivoEntrada[]>();
    for (const a of controlados) {
      const arr = porCodigo.get(a.tipo_receita_anvisa_codigo) ?? [];
      arr.push(a);
      porCodigo.set(a.tipo_receita_anvisa_codigo, arr);
    }
    const out: BlocoProcessado[] = [];
    for (const [codigo, ats] of porCodigo) {
      out.push({
        ...bloco,
        apelido: `${bloco.apelido} (${codigo})`,
        ativos: ats,
        destino_dispensacao: "FAOP",
        codigo_mafia4: deduzirMafia4(ats),
        origem_apelido: bloco.apelido,
      });
    }
    return out;
  }

  // Caso 14.3 — controlado + não-controlado: explode + marcação MANIPULAR JUNTO
  if (controlados.length >= 1 && naoControlados.length >= 1) {
    const marcacao = `MANIPULAR JUNTO — Fórmula Composta ${bloco.apelido}`;
    const out: BlocoProcessado[] = [];

    // Cada cor de controlado vira um bloco próprio com destino FAMA
    const porCodigo = new Map<CodigoReceitaAnvisa, AtivoEntrada[]>();
    for (const a of controlados) {
      const arr = porCodigo.get(a.tipo_receita_anvisa_codigo) ?? [];
      arr.push(a);
      porCodigo.set(a.tipo_receita_anvisa_codigo, arr);
    }
    for (const [codigo, ats] of porCodigo) {
      out.push({
        ...bloco,
        apelido: `${bloco.apelido} (controlado ${codigo})`,
        ativos: ats,
        destino_dispensacao: "FAMA",
        codigo_mafia4: deduzirMafia4(ats),
        marcacao_manipular_junto: marcacao,
        formula_composta_apelido: bloco.apelido,
        origem_apelido: bloco.apelido,
      });
    }

    // Os não-controlados viram 1 bloco MAGISTRAL com destino FAMA
    // (o tipo_receita de cada não-controlado é re-escrito como MAGISTRAL
    //  para fins de agrupamento — mas a substância individual mantém sua
    //  identidade; a farmácia magistral compõe tudo)
    const ativosMagistral = naoControlados.map((a) => ({
      ...a,
      tipo_receita_anvisa_codigo: "MAGISTRAL" as CodigoReceitaAnvisa,
    }));
    out.push({
      ...bloco,
      apelido: `${bloco.apelido} (magistral composta)`,
      ativos: ativosMagistral,
      destino_dispensacao: "FAMA",
      codigo_mafia4: "M___",
      marcacao_manipular_junto: marcacao,
      formula_composta_apelido: bloco.apelido,
      origem_apelido: bloco.apelido,
    });

    return out;
  }

  // Caso padrão — sem controlados.
  // Mesmo sem REGRA 14, cada bloco MANIPULADO_FARMACIA representa UMA
  // fórmula composta distinta — preservamos o apelido como chave de
  // agrupamento para que cada fórmula vire seu próprio PDF (a farmácia
  // magistral precisa de 1 receita por fórmula a manipular).
  return [
    {
      ...bloco,
      destino_dispensacao: deduzirDestino(ativos),
      codigo_mafia4: deduzirMafia4(ativos),
      formula_composta_apelido: bloco.apelido,
    },
  ];
}

// =====================================================================
// agruparEmPDFs() — 1 prescrição → N PDFs por (cor, destino)
// =====================================================================

/**
 * Recebe TODOS os blocos de uma prescrição (já processados pela REGRA 14)
 * e agrupa em PDFs distintos.
 *
 * Chave de agrupamento: (tipo_receita_anvisa_codigo, destino_dispensacao,
 *                        formula_composta_apelido)
 * Pois receita Azul B1 não pode conter ativo Amarela A2; cada cor legal
 * exige seu próprio formato/folha. E PDFs de fórmulas compostas distintas
 * (REGRA 14.3) devem ficar separados mesmo que partilhem cor/destino —
 * cada Fórmula Composta tem sua marcação MANIPULAR JUNTO própria.
 */
export function agruparEmPDFs(blocos: BlocoProcessado[]): PdfAgrupado[] {
  // Para cada bloco, extrair (codigo, destino, formulaComposta) por ativo
  type Chave = string;
  const grupos = new Map<Chave, PdfAgrupado>();

  for (const bloco of blocos) {
    // Códigos únicos presentes no bloco
    const codigos = new Set(
      bloco.ativos.map((a) => a.tipo_receita_anvisa_codigo)
    );

    for (const codigo of codigos) {
      const fcomp = bloco.formula_composta_apelido ?? "";
      const chave: Chave = `${codigo}::${bloco.destino_dispensacao}::${fcomp}`;

      if (!grupos.has(chave)) {
        grupos.set(chave, {
          ordem: 0, // será preenchida ao fim
          cor_visual: COR_POR_CODIGO[codigo],
          tipo_receita_anvisa_codigo: codigo,
          destino_dispensacao: bloco.destino_dispensacao,
          blocos: [],
          exige_sncr: EXIGE_SNCR.has(codigo),
          marcacao_manipular_junto: bloco.marcacao_manipular_junto,
        });
      }

      // Filtra os ativos daquele código (caso o bloco ainda tenha mistura)
      const subBloco: BlocoProcessado = {
        ...bloco,
        ativos: bloco.ativos.filter(
          (a) => a.tipo_receita_anvisa_codigo === codigo
        ),
      };
      grupos.get(chave)!.blocos.push(subBloco);
    }
  }

  // Ordenação: primeiro brancas/magistrais (rotina), depois lilás/verde,
  // depois azuis/amarelas (controlados — mais "pesados")
  const ordemCor: Record<CorPdf, number> = {
    branco: 1,
    magistral: 2,
    lilas: 3,
    verde: 4,
    azul: 5,
    amarelo: 6,
  };
  const arr = [...grupos.values()].sort(
    (a, b) => ordemCor[a.cor_visual] - ordemCor[b.cor_visual]
  );
  arr.forEach((p, i) => (p.ordem = i + 1));
  return arr;
}

// =====================================================================
// FUNÇÃO ORQUESTRADORA — entrada única do motor
// =====================================================================

/**
 * Recebe os blocos crus da tela do médico e devolve a lista ordenada de
 * PDFs prontos pra emissão. Aplica REGRAs 04, 05, 13, 14 em sequência.
 */
export function processarPrescricao(
  blocosEntrada: BlocoEntrada[]
): {
  blocosProcessados: BlocoProcessado[];
  pdfs: PdfAgrupado[];
} {
  const blocosProcessados: BlocoProcessado[] = [];
  for (const b of blocosEntrada) {
    blocosProcessados.push(...aplicarRegra14(b));
  }
  const pdfs = agruparEmPDFs(blocosProcessados);
  return { blocosProcessados, pdfs };
}
