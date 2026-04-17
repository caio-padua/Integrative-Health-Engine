import { db } from "@workspace/db";
import {
  farmaciasParceirasTable,
  comissoesConfigTable,
  descontosConfigTable,
  planosConsultaConfigTable,
  substanciasTable,
  pacientesTable,
  anamnesesTable,
  unidadesTable,
} from "@workspace/db";
import { sql, eq } from "drizzle-orm";

async function seedComercialConfig() {
  console.log("\n=== SEED COMERCIAL CONFIG (Dr. Caio) ===\n");

  let unidade = (await db.select().from(unidadesTable).limit(1))[0];
  if (!unidade) {
    console.log("[!] Nenhuma unidade encontrada — criando Instituto Pádua placeholder...");
    [unidade] = await db.insert(unidadesTable).values({
      nome: "Instituto Pádua (Mooca)",
      endereco: "Rua Modelo, 123",
      bairro: "Mooca",
      cidade: "Sao Paulo",
      estado: "SP",
      cnpj: "00.000.000/0001-00",
      telefone: "(11) 97715-4000",
      tipo: "clinic",
      nick: "PADUA-MOOCA",
    }).returning();
  }
  console.log(`[ok] Unidade base: ${unidade.nome} (id=${unidade.id})`);

  // ============== 5 FARMACIAS PARCEIRAS FICTICIAS ==============
  console.log("\n[1/6] 5 farmácias parceiras fictícias...");
  await db.delete(farmaciasParceirasTable).where(eq(farmaciasParceirasTable.ficticia, true));
  const farmacias = await db.insert(farmaciasParceirasTable).values([
    { nome: "Farmácia Vita Manipulação (FICTÍCIA)", cnpj: "11.111.111/0001-11", email: "vita@exemplo.com", telefone: "(11) 3000-1001", endereco: "Rua das Flores, 100", bairro: "Mooca", cidade: "São Paulo", estado: "SP", responsavel: "Dra. Joana Vita", comissaoPercentual: 30, modeloIntegracao: "portal", ficticia: true, observacoes: "Placeholder — substituir pela Farmácia Giroto ou similar." },
    { nome: "Manipulart Fórmulas (FICTÍCIA)", cnpj: "22.222.222/0001-22", email: "contato@manipulart.fake", telefone: "(11) 3000-1002", endereco: "Av. Paulista, 2000", bairro: "Bela Vista", cidade: "São Paulo", estado: "SP", responsavel: "Dr. Carlos Manipulart", comissaoPercentual: 30, modeloIntegracao: "marketplace", ficticia: true },
    { nome: "Botica Saúde+ (FICTÍCIA)", cnpj: "33.333.333/0001-33", email: "saude@botica.fake", telefone: "(11) 3000-1003", endereco: "Rua Augusta, 500", bairro: "Consolação", cidade: "São Paulo", estado: "SP", responsavel: "Farm. Ana Botica", comissaoPercentual: 28, modeloIntegracao: "drive", ficticia: true },
    { nome: "Pharma Premium Manipulação (FICTÍCIA)", cnpj: "44.444.444/0001-44", email: "premium@pharma.fake", telefone: "(11) 3000-1004", endereco: "Rua Oscar Freire, 300", bairro: "Jardins", cidade: "São Paulo", estado: "SP", responsavel: "Dr. Pedro Premium", comissaoPercentual: 32, modeloIntegracao: "portal", ficticia: true },
    { nome: "Farmácia Express Tatuapé (FICTÍCIA)", cnpj: "55.555.555/0001-55", email: "express@tatuape.fake", telefone: "(11) 3000-1005", endereco: "Rua Tuiuti, 800", bairro: "Tatuapé", cidade: "São Paulo", estado: "SP", responsavel: "Farm. Lucia Express", comissaoPercentual: 30, modeloIntegracao: "manual", ficticia: true },
  ]).returning();
  console.log(`[ok] ${farmacias.length} farmácias inseridas (todas fictícias).`);

  // ============== 3 PRODUTOS FICTICIOS (substancias) ==============
  console.log("\n[2/6] 3 produtos fictícios em substancias...");
  await db.delete(substanciasTable).where(sql`abreviacao IN ('VITD3-FIC', 'VITB12-FIC', 'GLUT-FIC')`);
  const produtos = await db.insert(substanciasTable).values([
    {
      nome: "Vitamina D3 5000UI IM (FICTÍCIO)",
      abreviacao: "VITD3-FIC",
      codigoSemantico: "PROD_VITD3_001",
      categoria: "vitamina_lipossoluvel",
      categoriaDetalhada: "Vitamina D injetável",
      cor: "#F59E0B",
      dosePadrao: "5000",
      unidadeDose: "UI",
      via: "im",
      duracaoMinutos: 10,
      precoReferencia: 180,
      maxSessoesPorSemana: 1,
      intervaloDias: 15,
      estoqueQuantidade: 100,
      estoqueUnidade: "ampola",
      descricao: "Protocolo padrão: 5 sessões intramusculares quinzenais. Reposição de calciferol em deficiência confirmada.",
      funcaoPrincipal: "Reposição de vitamina D",
      efeitosPercebidos: "Mais energia, melhora do humor e do sono em 30-60 dias",
      tempoParaEfeito: "30-60 dias",
      classificacaoEstrelas: 5,
      beneficioLongevidade: "Reduz risco cardiovascular e ósseo",
    },
    {
      nome: "Vitamina B12 (Metilcobalamina) IM (FICTÍCIO)",
      abreviacao: "VITB12-FIC",
      codigoSemantico: "PROD_VITB12_001",
      categoria: "vitamina_hidrossoluvel",
      categoriaDetalhada: "Vitamina B12 injetável",
      cor: "#EC4899",
      dosePadrao: "5000",
      unidadeDose: "mcg",
      via: "im",
      duracaoMinutos: 10,
      precoReferencia: 120,
      maxSessoesPorSemana: 1,
      intervaloDias: 7,
      estoqueQuantidade: 200,
      estoqueUnidade: "ampola",
      descricao: "Protocolo padrão: 10 sessões IM semanais. Reposição em deficiência ou quadros de fadiga e neuropatia.",
      funcaoPrincipal: "Energia, função neurológica, formação sanguínea",
      efeitosPercebidos: "Disposição, foco, redução de formigamento",
      tempoParaEfeito: "7-21 dias",
      classificacaoEstrelas: 5,
      beneficioLongevidade: "Suporte cognitivo e cardiovascular",
    },
    {
      nome: "Glutationa Endovenosa 1200mg (FICTÍCIO)",
      abreviacao: "GLUT-FIC",
      codigoSemantico: "PROD_GLUT_001",
      categoria: "antioxidante",
      categoriaDetalhada: "Glutationa IV",
      cor: "#10B981",
      dosePadrao: "1200",
      unidadeDose: "mg",
      via: "iv",
      duracaoMinutos: 30,
      precoReferencia: 350,
      maxSessoesPorSemana: 1,
      intervaloDias: 15,
      estoqueQuantidade: 60,
      estoqueUnidade: "frasco",
      descricao: "Protocolo padrão: 6 sessões EV quinzenais. Antioxidante master, detox hepático, qualidade de pele.",
      funcaoPrincipal: "Detoxificação e antioxidação celular",
      efeitosPercebidos: "Pele, energia, qualidade de sono",
      tempoParaEfeito: "15-45 dias",
      classificacaoEstrelas: 5,
      beneficioLongevidade: "Reduz estresse oxidativo sistêmico",
    },
  ]).returning();
  console.log(`[ok] ${produtos.length} produtos inseridos.`);

  // ============== COMISSOES EDITAVEIS ==============
  console.log("\n[3/6] Comissões editáveis...");
  await db.delete(comissoesConfigTable);
  const comissoes = await db.insert(comissoesConfigTable).values([
    { chave: "botox", rotulo: "Botox", categoria: "procedimento", percentual: 25, observacoes: "Toxina botulínica — comissão padrão." },
    { chave: "preenchimento", rotulo: "Preenchimento facial", categoria: "procedimento", percentual: 25 },
    { chave: "consulta_caio", rotulo: "Consulta com Dr. Caio", categoria: "consulta", percentual: 0, observacoes: "Caio é dono — sem comissão de terceiro." },
    { chave: "consulta_assistente", rotulo: "Consulta com médico assistente", categoria: "consulta", percentual: 30, observacoes: "Comissão paga pelo Caio ao assistente." },
    { chave: "protocolo_injetavel_indicacao", rotulo: "Indicação de protocolo injetável (médico júnior)", categoria: "indicacao", percentual: 10 },
    { chave: "formula_manipulada", rotulo: "Fórmula manipulada (farmácia parceira)", categoria: "produto", percentual: 30 },
    { chave: "produto_aplicacao", rotulo: "Aplicação ambulatorial (vit D, B12, etc.)", categoria: "procedimento", percentual: 20 },
    { chave: "vendedor_externo", rotulo: "Vendedor externo (porta-a-porta com tablet)", categoria: "venda_externa", percentual: 15 },
    { chave: "indicacao_paciente", rotulo: "Indicação paciente-paciente (member get member)", categoria: "indicacao", percentual: 5 },
    { chave: "indicacao_paciente_vip", rotulo: "Indicação top (escala automática)", categoria: "indicacao", percentual: 10 },
    { chave: "afiliado_externo", rotulo: "Afiliado (cabeleireiro/personal/salão)", categoria: "venda_externa", percentual: 12 },
    { chave: "consultor_homeoffice", rotulo: "Consultor home-office (ligação)", categoria: "consulta", percentual: 20 },
  ]).returning();
  console.log(`[ok] ${comissoes.length} regras de comissão inseridas.`);

  // ============== DESCONTOS EDITAVEIS ==============
  console.log("\n[4/6] Descontos editáveis...");
  await db.delete(descontosConfigTable);
  const descontos = await db.insert(descontosConfigTable).values([
    { chave: "forma_a_vista", rotulo: "À vista", tipo: "forma_pagamento", percentual: 15 },
    { chave: "forma_entrada_parcelado", rotulo: "Entrada + parcelado", tipo: "forma_pagamento", percentual: 8 },
    { chave: "forma_parcelado", rotulo: "Parcelado sem entrada", tipo: "forma_pagamento", percentual: 3 },
    { chave: "forma_avulso", rotulo: "Avulso (por unidade)", tipo: "forma_pagamento", percentual: 0, observacoes: "Sem desconto — preço cheio para não perder venda." },
    { chave: "forma_pagar_depois", rotulo: "Pagar depois (fiado, sob critério Caio)", tipo: "forma_pagamento", percentual: 0 },
    { chave: "duracao_3m", rotulo: "Tratamento 3 meses", tipo: "duracao_tratamento", percentual: 5, duracaoMeses: 3 },
    { chave: "duracao_6m", rotulo: "Tratamento 6 meses", tipo: "duracao_tratamento", percentual: 10, duracaoMeses: 6 },
    { chave: "duracao_9m", rotulo: "Tratamento 9 meses", tipo: "duracao_tratamento", percentual: 15, duracaoMeses: 9 },
    { chave: "duracao_12m", rotulo: "Tratamento 12 meses", tipo: "duracao_tratamento", percentual: 20, duracaoMeses: 12 },
    { chave: "indicacao_validada", rotulo: "Indicação por paciente ativo (com código)", tipo: "indicacao", percentual: 5 },
    { chave: "campanha_lancamento", rotulo: "Campanha de lançamento (placeholder)", tipo: "campanha", percentual: 10, ativa: false },
  ]).returning();
  console.log(`[ok] ${descontos.length} regras de desconto inseridas.`);

  // ============== 4 PLANOS DE CONSULTA ==============
  console.log("\n[5/6] 4 planos de consulta...");
  await db.delete(planosConsultaConfigTable);
  const planos = await db.insert(planosConsultaConfigTable).values([
    { chave: "premium", nome: "Premium — Dr. Caio Sênior", descricao: "Dr. Caio do começo ao fim. Atendimento personalizado, presencial ou online.", precoPresencial: 2500, precoOnline: 1800, envolveCaioInicio: true, envolveCaioContinuidade: true, ordem: 1 },
    { chave: "intermediario", nome: "Intermediário — Caio + Online", descricao: "Dr. Caio na primeira consulta, continuidade online com a equipe sênior.", precoPresencial: 1500, precoOnline: 1100, envolveCaioInicio: true, envolveCaioContinuidade: false, ordem: 2 },
    { chave: "standard", nome: "Standard — Caio + Assistente", descricao: "Dr. Caio na primeira consulta, retornos com médico assistente.", precoPresencial: 900, precoOnline: 700, envolveCaioInicio: true, envolveCaioContinuidade: false, ordem: 3 },
    { chave: "basic", nome: "Basic — Sem Caio", descricao: "Atendimento integral com equipe assistente, presencial ou online. Sem participação direta do Dr. Caio.", precoPresencial: 500, precoOnline: 350, envolveCaioInicio: false, envolveCaioContinuidade: false, ordem: 4 },
  ]).returning();
  console.log(`[ok] ${planos.length} planos inseridos.`);

  // ============== 5 PACIENTES FICTICIOS + 5 ANAMNESES VALIDADAS ==============
  console.log("\n[6/6] 5 pacientes fictícios + anamneses validadas...");
  const pacientesFake = [
    { nome: "Maria Aparecida Silva (FICTÍCIA)", telefone: "(11) 99000-1001", email: "maria.silva@exemplo.com", cpf: "111.111.111-11", bairro: "Mooca", cidade: "São Paulo", estado: "SP", senhaValidacao: "MARIA001", planoAcompanhamento: "ouro" as const },
    { nome: "João Carlos Pereira (FICTÍCIO)", telefone: "(11) 99000-1002", email: "joao.pereira@exemplo.com", cpf: "222.222.222-22", bairro: "Tatuapé", cidade: "São Paulo", estado: "SP", senhaValidacao: "JOAO002", planoAcompanhamento: "diamante" as const },
    { nome: "Ana Beatriz Costa (FICTÍCIA)", telefone: "(11) 99000-1003", email: "ana.costa@exemplo.com", cpf: "333.333.333-33", bairro: "Jardins", cidade: "São Paulo", estado: "SP", senhaValidacao: "ANA003", planoAcompanhamento: "ouro" as const },
    { nome: "Roberto Almeida Souza (FICTÍCIO)", telefone: "(11) 99000-1004", email: "roberto.souza@exemplo.com", cpf: "444.444.444-44", bairro: "Vila Madalena", cidade: "São Paulo", estado: "SP", senhaValidacao: "ROB004", planoAcompanhamento: "prata" as const },
    { nome: "Patricia Oliveira Rocha (FICTÍCIA)", telefone: "(11) 99000-1005", email: "patricia.rocha@exemplo.com", cpf: "555.555.555-55", bairro: "Pinheiros", cidade: "São Paulo", estado: "SP", senhaValidacao: "PAT005", planoAcompanhamento: "diamante" as const },
  ];

  const pacientesIds: number[] = [];
  for (const p of pacientesFake) {
    const exists = await db.select().from(pacientesTable).where(eq(pacientesTable.cpf, p.cpf!)).limit(1);
    if (exists.length > 0) {
      pacientesIds.push(exists[0].id);
      console.log(`  [skip] ${p.nome} já existe (id=${exists[0].id})`);
      continue;
    }
    const [novo] = await db.insert(pacientesTable).values({ ...p, unidadeId: unidade.id, statusAtivo: true }).returning();
    pacientesIds.push(novo.id);
    console.log(`  [ok] ${p.nome} (id=${novo.id})`);
  }

  // Anamneses já validadas para cada paciente
  const cenarios = [
    { sinais: ["fadiga_cronica", "deficiencia_vit_d", "qualidade_sono_baixa"], score: 65, banda: "AVANCADO" },
    { sinais: ["estresse_oxidativo", "neuropatia_leve", "deficiencia_b12"], score: 78, banda: "AVANCADO" },
    { sinais: ["pele_envelhecimento", "detox_hepatico"], score: 42, banda: "INTERMEDIARIO" },
    { sinais: ["fadiga_cronica", "humor_baixo"], score: 35, banda: "INTERMEDIARIO" },
    { sinais: ["deficiencia_vit_d", "deficiencia_b12", "estresse_oxidativo", "fadiga_cronica"], score: 92, banda: "FULL" },
  ];

  for (let i = 0; i < pacientesIds.length; i++) {
    const pid = pacientesIds[i];
    const cen = cenarios[i];
    const exists = await db.select().from(anamnesesTable).where(eq(anamnesesTable.pacienteId, pid)).limit(1);
    if (exists.length > 0) {
      console.log(`  [skip] anamnese paciente ${pid} já existe`);
      continue;
    }
    await db.insert(anamnesesTable).values({
      pacienteId: pid,
      status: "validada",
      respostasClincias: { fonte: "anamnese_unica_online_v15", scoreCalculado: cen.score, banda: cen.banda, perguntasRespondidas: 34 },
      respostasFinanceiras: { plano: i % 2 === 0 ? "intermediario" : "standard", forma: "entrada_parcelado", duracaoMeses: 6 },
      respostasPreferencias: { aceita_im: true, aceita_ev: i > 1, aceita_implante: false, aceita_nurse_car: i === 0 },
      sinaisSemanticos: cen.sinais,
      motorAtivadoEm: new Date(),
    });
    console.log(`  [ok] anamnese validada paciente ${pid} (banda ${cen.banda}, score ${cen.score})`);
  }

  console.log("\n=== SEED COMERCIAL CONFIG CONCLUIDO ===\n");
  console.log("Resumo:");
  console.log(`  - 5 farmácias parceiras fictícias`);
  console.log(`  - 3 produtos (Vit D3, Vit B12, Glutationa)`);
  console.log(`  - ${comissoes.length} regras de comissão (editáveis)`);
  console.log(`  - ${descontos.length} regras de desconto (editáveis)`);
  console.log(`  - ${planos.length} planos de consulta (Premium/Intermediário/Standard/Basic)`);
  console.log(`  - 5 pacientes fictícios com anamneses validadas`);
  console.log("\nEndpoints sugeridos: /api/farmacias-parceiras, /api/comissoes-config, /api/descontos-config, /api/planos-consulta\n");

  process.exit(0);
}

seedComercialConfig().catch((err) => {
  console.error("[ERRO seed comercial]:", err);
  process.exit(1);
});
