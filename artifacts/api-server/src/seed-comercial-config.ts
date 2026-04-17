import { db } from "@workspace/db";
import {
  farmaciasParceirasTable,
  comissoesConfigTable,
  descontosConfigTable,
  planosConsultaConfigTable,
  anamneseValidacaoTemplateTable,
  termosConsentimentoTable,
  substanciasTable,
  pacientesTable,
  anamnesesTable,
  unidadesTable,
} from "@workspace/db";
import { sql, eq } from "drizzle-orm";

async function seedComercialConfig() {
  console.log("\n=== SEED COMERCIAL CONFIG (Dr. Caio — V2 com nomes reais) ===\n");

  let unidade = (await db.select().from(unidadesTable).limit(1))[0];
  if (!unidade) {
    [unidade] = await db.insert(unidadesTable).values({
      nome: "Instituto Pádua (Mooca)",
      bairro: "Mooca", cidade: "Sao Paulo", estado: "SP",
      telefone: "(11) 97715-4000", tipo: "clinic", nick: "PADUA-MOOCA",
    }).returning();
  }
  console.log(`[ok] Unidade base: ${unidade.nome} (id=${unidade.id})`);

  // ============== 5 FARMACIAS PARCEIRAS — NOMES REAIS ==============
  console.log("\n[1/8] 5 farmácias parceiras (nomes reais, dados de contato pendentes)...");
  await db.delete(farmaciasParceirasTable);
  const farmacias = await db.insert(farmaciasParceirasTable).values([
    { nome: "Giroto", cnpj: null, email: null, telefone: null, cidade: "São Paulo", estado: "SP", responsavel: "(a confirmar)", comissaoPercentual: 30, modeloIntegracao: "portal", ficticia: false, observacoes: "Farmácia de manipulação parceira histórica do Dr. Caio. Confirmar CNPJ/contato/contrato." },
    { nome: "Farmadoctor", cnpj: null, email: null, telefone: null, cidade: "São Paulo", estado: "SP", responsavel: "(a confirmar)", comissaoPercentual: 30, modeloIntegracao: "portal", ficticia: false, observacoes: "Parceira para fórmulas e injetáveis. Confirmar dados oficiais." },
    { nome: "GrandPharma", cnpj: null, email: null, telefone: null, cidade: "São Paulo", estado: "SP", responsavel: "(a confirmar)", comissaoPercentual: 30, modeloIntegracao: "marketplace", ficticia: false, observacoes: "Modelo marketplace — split nativo via gateway." },
    { nome: "Bioathos", cnpj: null, email: null, telefone: null, cidade: "São Paulo", estado: "SP", responsavel: "(a confirmar)", comissaoPercentual: 30, modeloIntegracao: "portal", ficticia: false, observacoes: "Especializada em fórmulas integrativas / nutracêuticos." },
    { nome: "Prime", cnpj: null, email: null, telefone: null, cidade: "São Paulo", estado: "SP", responsavel: "(a confirmar)", comissaoPercentual: 30, modeloIntegracao: "portal", ficticia: false, observacoes: "Premium — produtos high-end e protocolos personalizados." },
  ]).returning();
  console.log(`[ok] ${farmacias.length} farmácias inseridas (Giroto, Farmadoctor, GrandPharma, Bioathos, Prime).`);

  // ============== 3 PRODUTOS FICTICIOS (substancias) ==============
  console.log("\n[2/8] 3 produtos placeholder em substancias...");
  await db.delete(substanciasTable).where(sql`abreviacao IN ('VITD3-FIC', 'VITB12-FIC', 'GLUT-FIC')`);
  const produtos = await db.insert(substanciasTable).values([
    { nome: "Vitamina D3 5000UI IM (placeholder)", abreviacao: "VITD3-FIC", codigoSemantico: "PROD_VITD3_001", categoria: "vitamina_lipossoluvel", categoriaDetalhada: "Vitamina D injetável", cor: "#F59E0B", dosePadrao: "5000", unidadeDose: "UI", via: "im", duracaoMinutos: 10, precoReferencia: 180, maxSessoesPorSemana: 1, intervaloDias: 15, estoqueQuantidade: 100, estoqueUnidade: "ampola", descricao: "Protocolo padrão: 5 sessões IM quinzenais. Reposição em deficiência confirmada.", funcaoPrincipal: "Reposição de vitamina D", efeitosPercebidos: "Energia, humor, sono", tempoParaEfeito: "30-60 dias", classificacaoEstrelas: 5 },
    { nome: "Vitamina B12 (Metilcobalamina) IM (placeholder)", abreviacao: "VITB12-FIC", codigoSemantico: "PROD_VITB12_001", categoria: "vitamina_hidrossoluvel", categoriaDetalhada: "Vitamina B12 injetável", cor: "#EC4899", dosePadrao: "5000", unidadeDose: "mcg", via: "im", duracaoMinutos: 10, precoReferencia: 120, maxSessoesPorSemana: 1, intervaloDias: 7, estoqueQuantidade: 200, estoqueUnidade: "ampola", descricao: "Protocolo padrão: 10 sessões IM semanais. Fadiga, neuropatia, deficiência.", funcaoPrincipal: "Energia, função neurológica, formação sanguínea", efeitosPercebidos: "Disposição, foco", tempoParaEfeito: "7-21 dias", classificacaoEstrelas: 5 },
    { nome: "Glutationa EV 1200mg (placeholder)", abreviacao: "GLUT-FIC", codigoSemantico: "PROD_GLUT_001", categoria: "antioxidante", categoriaDetalhada: "Glutationa IV", cor: "#10B981", dosePadrao: "1200", unidadeDose: "mg", via: "iv", duracaoMinutos: 30, precoReferencia: 350, maxSessoesPorSemana: 1, intervaloDias: 15, estoqueQuantidade: 60, estoqueUnidade: "frasco", descricao: "Protocolo padrão: 6 sessões EV quinzenais. Detox, antioxidante master, pele.", funcaoPrincipal: "Detoxificação e antioxidação celular", efeitosPercebidos: "Pele, energia, sono", tempoParaEfeito: "15-45 dias", classificacaoEstrelas: 5 },
  ]).returning();
  console.log(`[ok] ${produtos.length} produtos inseridos.`);

  // ============== COMISSOES — REFINADAS POR PRATICA DE MERCADO ==============
  console.log("\n[3/8] Comissões editáveis (refinadas com prática de medicina integrativa premium)...");
  await db.delete(comissoesConfigTable);
  const comissoes = await db.insert(comissoesConfigTable).values([
    // Procedimentos (clínica fica com 70-75%, profissional 25-30%)
    { chave: "botox", rotulo: "Botox / toxina botulínica", categoria: "procedimento", percentual: 25, observacoes: "Padrão de mercado: aplicador 25-30% sobre valor líquido." },
    { chave: "preenchimento", rotulo: "Preenchimento facial (HA)", categoria: "procedimento", percentual: 25 },
    { chave: "produto_aplicacao_im", rotulo: "Aplicação IM (Vit D, B12, etc.)", categoria: "procedimento", percentual: 15, observacoes: "Procedimento simples, executado por enfermagem." },
    { chave: "produto_aplicacao_ev", rotulo: "Aplicação EV (soro, glutationa)", categoria: "procedimento", percentual: 20, observacoes: "Maior complexidade — punção e tempo." },
    { chave: "implante_hormonal", rotulo: "Implante hormonal (chip)", categoria: "procedimento", percentual: 30, observacoes: "Procedimento médico restrito — comissão maior." },
    // Consultas
    { chave: "consulta_caio", rotulo: "Consulta com Dr. Caio (dono)", categoria: "consulta", percentual: 0, observacoes: "Caio é o dono — sem comissão de terceiros." },
    { chave: "consulta_assistente_senior", rotulo: "Consulta com médico assistente sênior", categoria: "consulta", percentual: 35, observacoes: "Assistente sênior recebe 35% — mercado vai de 30 a 40%." },
    { chave: "consulta_assistente_junior", rotulo: "Consulta com médico assistente júnior", categoria: "consulta", percentual: 25 },
    { chave: "consulta_homeoffice_online", rotulo: "Consulta home-office online (continuidade)", categoria: "consulta", percentual: 20, observacoes: "Modelo de continuidade remota — overhead menor." },
    // Indicações (cross-sell entre clínica/médicos)
    { chave: "indicacao_protocolo_injetavel", rotulo: "Indicação de protocolo injetável (médico → enfermagem)", categoria: "indicacao", percentual: 10 },
    { chave: "indicacao_paciente_paciente", rotulo: "Member-get-member (paciente indica paciente)", categoria: "indicacao", percentual: 5, observacoes: "5% padrão. Pode escalar para 10% em indicadores top." },
    { chave: "indicacao_paciente_top", rotulo: "Member-get-member TOP (10+ indicações/ano)", categoria: "indicacao", percentual: 10 },
    // Produtos / farmácia
    { chave: "formula_manipulada", rotulo: "Fórmula manipulada (split com farmácia)", categoria: "produto", percentual: 30, observacoes: "Clínica fica com 30% do valor da fórmula via split nativo (anti-fraude)." },
    // Vendas externas (vendedores tablet, afiliados)
    { chave: "vendedor_tablet_externo", rotulo: "Vendedor externo com tablet (porta-a-porta / evento)", categoria: "venda_externa", percentual: 15 },
    { chave: "afiliado_externo", rotulo: "Afiliado externo (cabeleireiro, personal, salão)", categoria: "venda_externa", percentual: 12 },
  ]).returning();
  console.log(`[ok] ${comissoes.length} regras de comissão inseridas.`);

  // ============== DESCONTOS — PRATICA DE MERCADO BR (CLINICAS PREMIUM) ==============
  console.log("\n[4/8] Descontos editáveis (pré-preenchidos por prática de mercado)...");
  await db.delete(descontosConfigTable);
  const descontos = await db.insert(descontosConfigTable).values([
    // Forma de pagamento — referência: clínicas premium SP, prática 2024-2026
    { chave: "forma_a_vista_pix", rotulo: "À vista — PIX / dinheiro / débito", tipo: "forma_pagamento", percentual: 12, observacoes: "Mercado pratica 10-15%. Recebimento imediato, zero taxa de cartão." },
    { chave: "forma_a_vista_credito", rotulo: "À vista — cartão de crédito (1x)", tipo: "forma_pagamento", percentual: 7, observacoes: "Mercado pratica 5-10%. Há taxa do cartão (~3-4%) embutida." },
    { chave: "forma_entrada_3x", rotulo: "Entrada + 2x (até 3x sem juros)", tipo: "forma_pagamento", percentual: 8, observacoes: "Padrão para tickets médios. Reduz inadimplência." },
    { chave: "forma_parcelado_6x", rotulo: "Parcelado 6x sem juros (sem entrada)", tipo: "forma_pagamento", percentual: 3, observacoes: "Margem zero — desconto simbólico para fechar venda." },
    { chave: "forma_parcelado_10x", rotulo: "Parcelado 10x sem juros", tipo: "forma_pagamento", percentual: 0, observacoes: "Sem desconto — repassa só o juro absorvido pela clínica." },
    { chave: "forma_parcelado_12x_juros", rotulo: "Parcelado 12x com juros embutidos", tipo: "forma_pagamento", percentual: -8, observacoes: "Acréscimo de 8% para cobrir juro do cartão. Negativo = preço sobe." },
    { chave: "forma_avulso", rotulo: "Avulso (uma sessão por vez)", tipo: "forma_pagamento", percentual: 0, observacoes: "Sem desconto — preço cheio." },
    { chave: "forma_pagar_depois", rotulo: "Pagar depois (fiado, sob critério Caio)", tipo: "forma_pagamento", percentual: 0, observacoes: "Casos especiais — autorização do Caio caso a caso." },
    // Duração (pacote/assinatura — mercado de assinatura premium)
    { chave: "duracao_3m", rotulo: "Pacote 3 meses (trimestral)", tipo: "duracao_tratamento", percentual: 5, duracaoMeses: 3, observacoes: "Compromisso curto — desconto introdutório." },
    { chave: "duracao_6m", rotulo: "Pacote 6 meses (semestral)", tipo: "duracao_tratamento", percentual: 10, duracaoMeses: 6, observacoes: "Sweet spot do mercado de assinatura saúde." },
    { chave: "duracao_9m", rotulo: "Pacote 9 meses", tipo: "duracao_tratamento", percentual: 15, duracaoMeses: 9 },
    { chave: "duracao_12m", rotulo: "Pacote 12 meses (anual)", tipo: "duracao_tratamento", percentual: 20, duracaoMeses: 12, observacoes: "Lock-in anual — compete com benefícios corporativos." },
    // Indicações
    { chave: "indicacao_validada", rotulo: "Indicado por paciente ativo (com código)", tipo: "indicacao", percentual: 5, observacoes: "5% para o indicado + 5% comissão para o indicador (member-get-member)." },
    // Campanhas (placeholders ativáveis)
    { chave: "campanha_lancamento_unidade", rotulo: "Campanha lançamento de unidade", tipo: "campanha", percentual: 15, ativa: false },
    { chave: "campanha_aniversario_paciente", rotulo: "Aniversário do paciente (mês)", tipo: "campanha", percentual: 10, ativa: false },
  ]).returning();
  console.log(`[ok] ${descontos.length} regras de desconto inseridas (todas pré-preenchidas e editáveis).`);

  // ============== 4 PLANOS DE CONSULTA — FAIXA R$1.500 a R$15.000 ==============
  console.log("\n[5/8] 4 planos de consulta (R$1.500 → R$15.000)...");
  await db.delete(planosConsultaConfigTable);
  const planos = await db.insert(planosConsultaConfigTable).values([
    { chave: "premium", nome: "Premium — Dr. Caio do início ao fim", descricao: "Atendimento integralmente conduzido pelo Dr. Caio, presencial ou online. Inclui plano de tratamento personalizado de longa duração.", precoPresencial: 15000, precoOnline: 12000, envolveCaioInicio: true, envolveCaioContinuidade: true, ordem: 1 },
    { chave: "intermediario", nome: "Intermediário — Caio inicia, sênior continua", descricao: "Primeira consulta + revisão de plano com Dr. Caio. Continuidade com equipe sênior (presencial/online).", precoPresencial: 7500, precoOnline: 5500, envolveCaioInicio: true, envolveCaioContinuidade: false, ordem: 2 },
    { chave: "standard", nome: "Standard — Caio inicia, assistente continua", descricao: "Primeira consulta com Dr. Caio. Retornos com médico assistente da clínica.", precoPresencial: 3500, precoOnline: 2500, envolveCaioInicio: true, envolveCaioContinuidade: false, ordem: 3 },
    { chave: "basic", nome: "Basic — Equipe assistente (entrada do funil)", descricao: "Atendimento integral com equipe assistente, presencial ou online. Sem participação direta do Dr. Caio. Porta de entrada do funil de venda rápida.", precoPresencial: 1500, precoOnline: 1000, envolveCaioInicio: false, envolveCaioContinuidade: false, ordem: 4 },
  ]).returning();
  console.log(`[ok] ${planos.length} planos: Basic R$1.5k → Standard R$3.5k → Intermediário R$7.5k → Premium R$15k.`);

  // ============== ANAMNESE DE VALIDACAO — 6 PERGUNTAS-CHAVE (10-15 min) ==============
  console.log("\n[6/8] Anamnese de validação pós-triagem (6 perguntas, 10-15 min)...");
  await db.delete(anamneseValidacaoTemplateTable);
  const perguntas = await db.insert(anamneseValidacaoTemplateTable).values([
    { ordem: 1, chave: "confirma_doencas_apontadas", pergunta: "Você confirma as condições/doenças que apontou na triagem inicial? Algo a acrescentar ou corrigir?", ajuda: "Mostrar lista de doenças marcadas na triagem online. Paciente só confirma ou ajusta.", tipoResposta: "confirmacao", obrigatoria: true, observacoes: "Validação rápida — não é nova anamnese." },
    { ordem: 2, chave: "confirma_sintomas_principais", pergunta: "Os sintomas principais hoje são os mesmos que você marcou? Em uma escala de 0 a 10, quanto te incomodam agora?", ajuda: "Listar sintomas marcados na triagem. Paciente confirma + dá nota.", tipoResposta: "escala_1_10", obrigatoria: true },
    { ordem: 3, chave: "confirma_objetivo_principal", pergunta: "Qual seu objetivo principal com este tratamento? (energia, longevidade, estética, performance, sono, etc.)", ajuda: "Pré-selecionar com base na triagem. Paciente confirma ou troca.", tipoResposta: "multipla_escolha", opcoes: ["Mais energia / disposição", "Longevidade e prevenção", "Estética e pele", "Performance física/mental", "Qualidade do sono", "Equilíbrio hormonal", "Detox / antioxidação", "Outro"], obrigatoria: true },
    { ordem: 4, chave: "alergias_medicacoes", pergunta: "Tem alguma alergia ou está usando alguma medicação contínua que devemos saber?", ajuda: "Resposta curta — segurança clínica básica.", tipoResposta: "texto_curto", obrigatoria: true },
    { ordem: 5, chave: "aceita_via_aplicacao", pergunta: "Você aceita receber medicação injetável (intramuscular ou endovenosa) e/ou fórmula manipulada via oral?", ajuda: "Define se motor pode propor IM/EV/oral. Caio fala: vou te injetar X pra avaliarmos no término.", tipoResposta: "multipla_escolha", opcoes: ["Aceito IM e EV e oral", "Só IM e oral", "Só oral", "Quero conversar antes de decidir"], obrigatoria: true },
    { ordem: 6, chave: "consentimento_protocolo_proposto", pergunta: "Confirma que está de acordo com o protocolo que será proposto pelo motor (com base no que você relatou) e autoriza início do tratamento?", ajuda: "Termo de consentimento curto + assinatura/confirmação verbal gravada. Respaldo jurídico.", tipoResposta: "assinatura", obrigatoria: true, observacoes: "Vincula automaticamente ao termo termo_consentimento_protocolo_v1." },
  ]).returning();
  console.log(`[ok] ${perguntas.length} perguntas de validação inseridas.`);

  // ============== TERMO DE CONSENTIMENTO JURIDICO ==============
  console.log("\n[7/8] Termos de consentimento (respaldo jurídico)...");
  await db.delete(termosConsentimentoTable);
  const termos = await db.insert(termosConsentimentoTable).values([
    {
      chave: "termo_consentimento_protocolo_v1",
      versao: "1.0",
      titulo: "Termo de Consentimento Livre e Esclarecido — Protocolo de Medicina Integrativa",
      textoConsentimento: `Eu, paciente identificado(a) no sistema PAWARDS, declaro:

1. Que respondi à triagem online e à anamnese de validação de forma livre e verdadeira.
2. Que recebi explicação clara, em linguagem acessível, sobre o protocolo proposto pelo sistema, incluindo:
   (a) os exames laboratoriais sugeridos;
   (b) as substâncias injetáveis (intramusculares ou endovenosas) e/ou fórmulas manipuladas que poderão ser aplicadas/prescritas;
   (c) a finalidade de cada item do protocolo, alinhada ao OBJETIVO que eu mesmo declarei.
3. Que estou ciente de que o protocolo será reavaliado ao término do ciclo, momento em que será proposto novo plano alinhado ao meu objetivo declarado.
4. Que confirmo verbalmente E por escrito (assinatura digital ou física) minha concordância com o início do tratamento.
5. Que autorizo o registro audiovisual desta confirmação para fins de respaldo jurídico, conforme LGPD (Lei 13.709/2018).
6. Que estou ciente do meu direito de interromper o tratamento a qualquer momento, sem penalidade clínica.

Confirmo: "Estou de acordo com o protocolo proposto e autorizo o início do tratamento."`,
      exigeAssinaturaEscrita: true,
      exigeConfirmacaoVerbal: true,
    },
    {
      chave: "termo_uso_dados_lgpd_v1",
      versao: "1.0",
      titulo: "Termo de Uso de Dados Pessoais (LGPD)",
      textoConsentimento: `Autorizo o tratamento dos meus dados pessoais e de saúde pelo PAWARDS / Instituto Pádua, conforme LGPD (Lei 13.709/2018), exclusivamente para fins de cuidado clínico, prescrição, comunicação e cobrança. Meus dados não serão compartilhados com terceiros sem meu consentimento explícito, exceto farmácias parceiras quando necessárias à manipulação prescrita.`,
      exigeAssinaturaEscrita: true,
      exigeConfirmacaoVerbal: false,
    },
  ]).returning();
  console.log(`[ok] ${termos.length} termos jurídicos inseridos.`);

  // ============== 5 PACIENTES FICTICIOS + 5 ANAMNESES VALIDADAS ==============
  console.log("\n[8/8] 5 pacientes fictícios + anamneses validadas...");
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
      continue;
    }
    const [novo] = await db.insert(pacientesTable).values({ ...p, unidadeId: unidade.id, statusAtivo: true }).returning();
    pacientesIds.push(novo.id);
  }
  console.log(`[ok] 5 pacientes prontos (ids ${pacientesIds.join(", ")}).`);

  const cenarios = [
    { sinais: ["fadiga_cronica", "deficiencia_vit_d", "qualidade_sono_baixa"], score: 65, banda: "AVANCADO", plano: "intermediario", objetivo: "Mais energia / disposição" },
    { sinais: ["estresse_oxidativo", "neuropatia_leve", "deficiencia_b12"], score: 78, banda: "AVANCADO", plano: "premium", objetivo: "Performance física/mental" },
    { sinais: ["pele_envelhecimento", "detox_hepatico"], score: 42, banda: "INTERMEDIARIO", plano: "standard", objetivo: "Estética e pele" },
    { sinais: ["fadiga_cronica", "humor_baixo"], score: 35, banda: "INTERMEDIARIO", plano: "basic", objetivo: "Mais energia / disposição" },
    { sinais: ["deficiencia_vit_d", "deficiencia_b12", "estresse_oxidativo", "fadiga_cronica"], score: 92, banda: "FULL", plano: "premium", objetivo: "Longevidade e prevenção" },
  ];

  for (let i = 0; i < pacientesIds.length; i++) {
    const pid = pacientesIds[i];
    const cen = cenarios[i];
    const exists = await db.select().from(anamnesesTable).where(eq(anamnesesTable.pacienteId, pid)).limit(1);
    if (exists.length > 0) continue;
    await db.insert(anamnesesTable).values({
      pacienteId: pid,
      status: "validada",
      respostasClincias: {
        fonte: "anamnese_validacao_pos_triagem_v1",
        scoreCalculado: cen.score,
        banda: cen.banda,
        perguntasRespondidas: 6,
        confirmacoes: {
          confirma_doencas_apontadas: true,
          confirma_sintomas_principais: cen.score > 70 ? 8 : cen.score > 40 ? 6 : 4,
          confirma_objetivo_principal: cen.objetivo,
          alergias_medicacoes: "Nenhuma relevante",
          aceita_via_aplicacao: cen.score > 60 ? "Aceito IM e EV e oral" : "Só IM e oral",
          consentimento_protocolo_proposto: { aceito: true, modo: "verbal+escrito", termo: "termo_consentimento_protocolo_v1" },
        },
      },
      respostasFinanceiras: { plano: cen.plano, forma: "forma_entrada_3x", duracaoMeses: 6 },
      respostasPreferencias: { aceita_im: true, aceita_ev: cen.score > 60, aceita_implante: false, aceita_nurse_car: i === 0 },
      sinaisSemanticos: cen.sinais,
      motorAtivadoEm: new Date(),
    });
  }
  console.log(`[ok] 5 anamneses validadas inseridas.`);

  console.log("\n=== SEED CONCLUIDO ===\n");
  console.log("Resumo:");
  console.log(`  - 5 farmácias REAIS: Giroto, Farmadoctor, GrandPharma, Bioathos, Prime`);
  console.log(`  - 3 produtos placeholder (Vit D3, B12, Glutationa)`);
  console.log(`  - ${comissoes.length} regras de comissão (refinadas por mercado)`);
  console.log(`  - ${descontos.length} regras de desconto (pré-preenchidas por prática de mercado, todas editáveis)`);
  console.log(`  - ${planos.length} planos: R$1.5k / R$3.5k / R$7.5k / R$15k`);
  console.log(`  - ${perguntas.length} perguntas de anamnese de validação (10-15 min)`);
  console.log(`  - ${termos.length} termos jurídicos (consentimento + LGPD)`);
  console.log(`  - 5 pacientes fictícios com anamneses validadas\n`);

  process.exit(0);
}

seedComercialConfig().catch((err) => {
  console.error("[ERRO seed comercial]:", err);
  process.exit(1);
});
