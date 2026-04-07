import { db } from "@workspace/db";
import {
  unidadesTable, usuariosTable, pacientesTable,
  itensTerapeuticosTable, blocosTable, regrasMotorTable,
  protocolosTable, sugestoesTable, anamnesesTable, followupsTable, pagamentosTable, filasTable,
  fluxosAprovacoesTable, perfisPermissoesTable, mapaBlockExameTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Iniciando seed PADCOM V9 — dados reais...");

  // Limpar dados existentes na ordem correta (respeitando FK)
  await db.execute(sql`TRUNCATE TABLE mapa_bloco_exame RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE fluxos_aprovacoes RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE perfis_permissoes RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE regras_motor RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE blocos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE sugestoes_clinicas RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE anamneses RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE followups RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE pagamentos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE filas_operacionais RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE itens_terapeuticos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE protocolos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE pacientes RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE unidades RESTART IDENTITY CASCADE`);

  // =========================================================
  // 1. UNIDADES — dados reais V14 EMPRESAS
  // EMP001: CLINICA DE MEDICINA INTEGRATIVA PADUA
  // EMP002: INSTITUTO VIDA PLENA
  // =========================================================
  console.log("Inserindo unidades reais...");
  const [unidade1, unidade2] = await db.insert(unidadesTable).values([
    {
      nome: "Clinica de Medicina Integrativa Padua",
      endereco: "Rua Modelo, 123",
      cidade: "Sao Paulo",
      estado: "SP",
      telefone: "(11) 97715-4000",
      ativa: true,
    },
    {
      nome: "Instituto Vida Plena",
      endereco: "Avenida Modelo, 500",
      cidade: "Sao Paulo",
      estado: "SP",
      telefone: "(11) 3555-2000",
      ativa: true,
    },
  ]).returning();

  // =========================================================
  // 2. USUARIOS — profissionais reais + perfis V15
  // PROF001: DR CAIO HENRIQUE FERNANDES PADUA (CRM SP 125475)
  // PROF002: DRA HELENA MARTINS ROCHA (CRM RJ 345678)
  // + perfis operacionais do PADCOM
  // =========================================================
  console.log("Inserindo usuarios profissionais...");
  const senhaHash = await bcrypt.hash("senha123", 10);

  const [uCaio, uHelena, uSecretaria, uValidador] = await db.insert(usuariosTable).values([
    {
      nome: "Dr Caio Henrique Fernandes Padua",
      email: "caio@clinica.com",
      senha: senhaHash,
      perfil: "validador_mestre",
      unidadeId: unidade1.id,
      ativo: true,
    },
    {
      nome: "Dra Helena Martins Rocha",
      email: "helena@clinica.com",
      senha: senhaHash,
      perfil: "medico_tecnico",
      unidadeId: unidade2.id,
      ativo: true,
    },
    {
      nome: "Ana Lima",
      email: "ana@clinica.com",
      senha: senhaHash,
      perfil: "enfermeira",
      unidadeId: unidade1.id,
      ativo: true,
    },
    {
      nome: "Carlos Menezes",
      email: "carlos@clinica.com",
      senha: senhaHash,
      perfil: "validador_enfermeiro",
      unidadeId: unidade1.id,
      ativo: true,
    },
  ]).returning();

  // Alias para compatibilidade com codigo existente
  const uRafael = uCaio;
  const uMarina = uHelena;

  // =========================================================
  // 3. PACIENTES — dados reais V14 PACIENTES
  // PAC001: DAYANA LUDMAN ALVES CALDAS DA SILVA
  // PAC002: PACIENTE DEMONSTRACAO 2
  // =========================================================
  console.log("Inserindo pacientes reais...");
  const [pac1, pac2, pac3] = await db.insert(pacientesTable).values([
    {
      nome: "Dayana Ludman Alves Caldas da Silva",
      cpf: "29327494806",
      dataNascimento: "1986-02-04",
      telefone: "(11) 97346-3057",
      email: "dayana@email.com",
      unidadeId: unidade1.id,
      statusAtivo: true,
    },
    {
      nome: "Paciente Demonstracao 2",
      cpf: "00000000000",
      dataNascimento: "1978-08-15",
      telefone: "(11) 90000-0000",
      email: "demo2@email.com",
      unidadeId: unidade1.id,
      statusAtivo: true,
    },
    {
      nome: "Joao da Silva",
      cpf: "00000000001",
      dataNascimento: "1985-04-12",
      telefone: "(11) 99001-0001",
      email: "joao@email.com",
      unidadeId: unidade2.id,
      statusAtivo: true,
    },
  ]).returning();

  // =========================================================
  // 4. PERFIS E PERMISSOES — V15.2 MAPA PERFIS
  // =========================================================
  console.log("Inserindo perfis e permissoes...");
  await db.insert(perfisPermissoesTable).values([
    {
      perfil: "SECRETARIA",
      escopo: "OPERACIONAL",
      podeEditarQuestionario: true,
      podeValidar: false,
      podeBypass: false,
      podeEmitirNf: false,
      podeVerDadosOutrasEmpresas: false,
      observacao: "CADASTRO AGENDAMENTO E COBRANCA",
    },
    {
      perfil: "PROFISSIONAL SAUDE",
      escopo: "EXECUCAO ASSISTENCIAL",
      podeEditarQuestionario: false,
      podeValidar: true,
      podeBypass: false,
      podeEmitirNf: false,
      podeVerDadosOutrasEmpresas: false,
      observacao: "PODE CONCLUIR ETAPAS TECNICAS",
    },
    {
      perfil: "VALIDADOR 1",
      escopo: "REVISAO NIVEL 1",
      podeEditarQuestionario: false,
      podeValidar: true,
      podeBypass: false,
      podeEmitirNf: false,
      podeVerDadosOutrasEmpresas: false,
      observacao: "CHECKLIST CLINICO/OPERACIONAL",
    },
    {
      perfil: "VALIDADOR 2",
      escopo: "REVISAO NIVEL 2",
      podeEditarQuestionario: false,
      podeValidar: true,
      podeBypass: false,
      podeEmitirNf: false,
      podeVerDadosOutrasEmpresas: false,
      observacao: "CASOS DE MAIOR RISCO",
    },
    {
      perfil: "VALIDADOR 3",
      escopo: "REVISAO NIVEL 3",
      podeEditarQuestionario: false,
      podeValidar: true,
      podeBypass: false,
      podeEmitirNf: false,
      podeVerDadosOutrasEmpresas: false,
      observacao: "CASOS EXCEPCIONAIS",
    },
    {
      perfil: "MEDICO EXECUTOR",
      escopo: "CLINICO",
      podeEditarQuestionario: true,
      podeValidar: true,
      podeBypass: false,
      podeEmitirNf: false,
      podeVerDadosOutrasEmpresas: false,
      observacao: "RESPONSAVEL PELA CONDUTA",
    },
    {
      perfil: "MEDICO ADMIN",
      escopo: "CLINICO + GESTAO",
      podeEditarQuestionario: true,
      podeValidar: true,
      podeBypass: true,
      podeEmitirNf: false,
      podeVerDadosOutrasEmpresas: true,
      observacao: "BYPASS SOMENTE COM LOG",
    },
    {
      perfil: "FINANCEIRO",
      escopo: "RECEBIMENTO",
      podeEditarQuestionario: false,
      podeValidar: false,
      podeBypass: false,
      podeEmitirNf: false,
      podeVerDadosOutrasEmpresas: false,
      observacao: "CONCILIA GATEWAYS E VALORES",
    },
    {
      perfil: "FISCAL",
      escopo: "EMISSAO",
      podeEditarQuestionario: false,
      podeValidar: false,
      podeBypass: false,
      podeEmitirNf: true,
      podeVerDadosOutrasEmpresas: false,
      observacao: "ENVIO AO BACKEND FISCAL",
    },
    {
      perfil: "MASTER ESTRATEGICO",
      escopo: "GOVERNANCA CENTRAL",
      podeEditarQuestionario: true,
      podeValidar: true,
      podeBypass: true,
      podeEmitirNf: true,
      podeVerDadosOutrasEmpresas: true,
      observacao: "VISAO GLOBAL CONTROLADA",
    },
  ]);

  // =========================================================
  // 5. FLUXO DE APROVACOES — V15.2 FLUXO TOGGLES
  // FLUX CONS OPER 001: Consulta
  // FLUX INFU OPER 002: Infusao
  // =========================================================
  console.log("Inserindo fluxos de aprovacoes...");
  await db.insert(fluxosAprovacoesTable).values([
    // CONSULTA
    { codigoFluxo: "FLUX CONS OPER 001", tipoProcedimento: "CONSULTA", etapaOrdem: 1, etapaNome: "CADASTRO", perfilResponsavel: "SECRETARIA", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "ABERTURA DO CASO" },
    { codigoFluxo: "FLUX CONS OPER 001", tipoProcedimento: "CONSULTA", etapaOrdem: 2, etapaNome: "ATENDIMENTO", perfilResponsavel: "MEDICO EXECUTOR", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "CONDUTA CLINICA" },
    { codigoFluxo: "FLUX CONS OPER 001", tipoProcedimento: "CONSULTA", etapaOrdem: 3, etapaNome: "PAGAMENTO", perfilResponsavel: "FINANCEIRO", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "PRECISA STATUS APROVADO" },
    { codigoFluxo: "FLUX CONS OPER 001", tipoProcedimento: "CONSULTA", etapaOrdem: 4, etapaNome: "EMISSAO NF", perfilResponsavel: "FISCAL", requerido: false, condicional: true, regraCondicional: "SE PAGAMENTO=APROVADO", podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "SOMENTE SE POLITICA EXIGIR" },
    // INFUSAO
    { codigoFluxo: "FLUX INFU OPER 002", tipoProcedimento: "INFUSAO", etapaOrdem: 1, etapaNome: "CADASTRO", perfilResponsavel: "SECRETARIA", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "ABERTURA DO CASO" },
    { codigoFluxo: "FLUX INFU OPER 002", tipoProcedimento: "INFUSAO", etapaOrdem: 2, etapaNome: "PREPARO", perfilResponsavel: "PROFISSIONAL SAUDE", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "PREPARO DO PROTOCOLO" },
    { codigoFluxo: "FLUX INFU OPER 002", tipoProcedimento: "INFUSAO", etapaOrdem: 3, etapaNome: "VALIDACAO 1", perfilResponsavel: "VALIDADOR 1", requerido: true, condicional: false, podeBypass: true, somenteMedicoAdminPodeBypass: true, exigeJustificativa: true, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "CHECKLIST OBRIGATORIO" },
    { codigoFluxo: "FLUX INFU OPER 002", tipoProcedimento: "INFUSAO", etapaOrdem: 4, etapaNome: "VALIDACAO 2", perfilResponsavel: "VALIDADOR 2", requerido: false, condicional: true, regraCondicional: "SE RISCO>=4", podeBypass: true, somenteMedicoAdminPodeBypass: true, exigeJustificativa: true, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "ACIONA SO EM RISCO ALTO" },
    { codigoFluxo: "FLUX INFU OPER 002", tipoProcedimento: "INFUSAO", etapaOrdem: 5, etapaNome: "APROVACAO MEDICA", perfilResponsavel: "MEDICO EXECUTOR", requerido: true, condicional: false, podeBypass: true, somenteMedicoAdminPodeBypass: true, exigeJustificativa: true, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "LIBERA EXECUCAO" },
    { codigoFluxo: "FLUX INFU OPER 002", tipoProcedimento: "INFUSAO", etapaOrdem: 6, etapaNome: "PAGAMENTO", perfilResponsavel: "FINANCEIRO", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "PRECISA STATUS APROVADO" },
    { codigoFluxo: "FLUX INFU OPER 002", tipoProcedimento: "INFUSAO", etapaOrdem: 7, etapaNome: "EMISSAO NF", perfilResponsavel: "FISCAL", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "TEXTO NF PADRONIZADO" },
    // IMPLANTE
    { codigoFluxo: "FLUX IMPL OPER 003", tipoProcedimento: "IMPLANTE", etapaOrdem: 1, etapaNome: "CADASTRO", perfilResponsavel: "SECRETARIA", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "ABERTURA DO CASO" },
    { codigoFluxo: "FLUX IMPL OPER 003", tipoProcedimento: "IMPLANTE", etapaOrdem: 2, etapaNome: "VALIDACAO 1", perfilResponsavel: "VALIDADOR 1", requerido: true, condicional: false, podeBypass: true, somenteMedicoAdminPodeBypass: true, exigeJustificativa: true, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "CHECKLIST PRE-IMPLANTE" },
    { codigoFluxo: "FLUX IMPL OPER 003", tipoProcedimento: "IMPLANTE", etapaOrdem: 3, etapaNome: "VALIDACAO 2", perfilResponsavel: "VALIDADOR 2", requerido: true, condicional: false, podeBypass: true, somenteMedicoAdminPodeBypass: true, exigeJustificativa: true, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "SEGUNDA REVISAO OBRIGATORIA" },
    { codigoFluxo: "FLUX IMPL OPER 003", tipoProcedimento: "IMPLANTE", etapaOrdem: 4, etapaNome: "APROVACAO MEDICA", perfilResponsavel: "MEDICO EXECUTOR", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "ASSINATURA DIGITAL OBRIGATORIA" },
    { codigoFluxo: "FLUX IMPL OPER 003", tipoProcedimento: "IMPLANTE", etapaOrdem: 5, etapaNome: "PAGAMENTO", perfilResponsavel: "FINANCEIRO", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "LIBERACAO FINANCEIRA" },
    { codigoFluxo: "FLUX IMPL OPER 003", tipoProcedimento: "IMPLANTE", etapaOrdem: 6, etapaNome: "EMISSAO NF", perfilResponsavel: "FISCAL", requerido: true, condicional: false, podeBypass: false, somenteMedicoAdminPodeBypass: true, exigeJustificativa: false, bloqueiaSeoPendente: true, disparaNotificacao: true, observacao: "NF OBRIGATORIA POR LEI" },
  ]);

  // =========================================================
  // 6. BLOCOS PADCOM — 31 blocos completos da V14
  // =========================================================
  console.log("Inserindo 31 blocos PADCOM...");
  await db.insert(blocosTable).values([
    { codigoBloco: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "GERAL", totalItensMapeados: 44, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE AMPLIADA"], tipoMacro: "ENDOCRINO", totalItensMapeados: 21, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE AMPLIADA"], tipoMacro: "METABOLICO", totalItensMapeados: 11, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "HEPATICO", totalItensMapeados: 8, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "CARDIOMETABOLICO", totalItensMapeados: 23, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "HORMONAL / UROGINECO", totalItensMapeados: 26, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK007", nomeBloco: "BLOCO PROSTATA", usaGrade: true, grausDisponiveis: ["GRADE BASICA"], tipoMacro: "HORMONAL / UROGINECO", totalItensMapeados: 2, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "ENDOCRINO", totalItensMapeados: 13, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK009", nomeBloco: "BLOCO SALIVAR ADRENAL", usaGrade: true, grausDisponiveis: ["GRADE BASICA"], tipoMacro: "ENDOCRINO", totalItensMapeados: 4, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "NUTRICIONAL FUNCIONAL", totalItensMapeados: 9, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE AMPLIADA"], tipoMacro: "HEMATOLOGICO", totalItensMapeados: 17, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK012", nomeBloco: "BLOCO COAGULOGRAMA", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA"], tipoMacro: "HEMATOLOGICO", totalItensMapeados: 5, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "ONCOLOGICO", totalItensMapeados: 20, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "RENAL", totalItensMapeados: 9, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK015", nomeBloco: "BLOCO GRAVIDEZ", usaGrade: true, grausDisponiveis: ["GRADE BASICA"], tipoMacro: "HORMONAL / UROGINECO", totalItensMapeados: 1, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "INFECTOLOGICO", totalItensMapeados: 31, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "IMUNOLOGICO", totalItensMapeados: 23, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "GENETICA", totalItensMapeados: 17, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "GENETICA", totalItensMapeados: 19, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "TOXICOLOGICO", totalItensMapeados: 15, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "MICRONUTRIENTES", totalItensMapeados: 10, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "MICRONUTRIENTES", totalItensMapeados: 12, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK023", nomeBloco: "BLOCO SALIVAR HORMONAL", usaGrade: true, grausDisponiveis: ["GRADE BASICA"], tipoMacro: "GERAL", totalItensMapeados: 3, observacao: "BLOCO COM GRADE" },
    { codigoBloco: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "IMAGEM", totalItensMapeados: 19, observacao: "BLOCO SEM GRADE / LISTA DIRETA" },
    { codigoBloco: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "IMAGEM", totalItensMapeados: 12, observacao: "BLOCO SEM GRADE / LISTA DIRETA" },
    { codigoBloco: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "IMAGEM", totalItensMapeados: 12, observacao: "BLOCO SEM GRADE / LISTA DIRETA" },
    { codigoBloco: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "GERAL", totalItensMapeados: 9, observacao: "BLOCO SEM GRADE / LISTA DIRETA" },
    { codigoBloco: "BLK028", nomeBloco: "BLOCO ENDOSCOPICOS", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "GERAL", totalItensMapeados: 7, observacao: "BLOCO SEM GRADE / LISTA DIRETA" },
    { codigoBloco: "BLK029", nomeBloco: "BLOCO RX", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "IMAGEM", totalItensMapeados: 4, observacao: "BLOCO SEM GRADE / LISTA DIRETA" },
    { codigoBloco: "BLK030", nomeBloco: "BLOCO MAMOGRAFIA", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "IMAGEM", totalItensMapeados: 2, observacao: "BLOCO SEM GRADE / LISTA DIRETA" },
    { codigoBloco: "BLK031", nomeBloco: "BLOCO DENSITOMETRIA", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "GERAL", totalItensMapeados: 1, observacao: "BLOCO SEM GRADE / LISTA DIRETA" },
  ]);

  // =========================================================
  // 7. MAPA BLOCO → EXAME (409 exames reais V14)
  // =========================================================
  console.log("Inserindo 409 exames do mapa bloco→exame...");
  await db.insert(mapaBlockExameTable).values([
    // BLK001 — BASE INTEGRATIVA
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "HEMOGRAMA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "VITAMINA D" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "VITAMINA B12" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 4, nomeExame: "FERRITINA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 5, nomeExame: "FERRO SERICO" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 6, nomeExame: "HEMOGLOBINA GLICADA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 7, nomeExame: "TGO" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 8, nomeExame: "TGP" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 9, nomeExame: "GAMA GT" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 10, nomeExame: "FA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 11, nomeExame: "AMILASE" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 12, nomeExame: "BILIRRUBINAS TOTAIS E FRACOES" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 13, nomeExame: "UREIA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 14, nomeExame: "CREATININA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "HEMOGRAMA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "VITAMINA D" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "VITAMINA B12" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "FERRITINA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "FERRO SERICO" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 6, nomeExame: "HEMOGLOBINA GLICADA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 7, nomeExame: "TGO" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 8, nomeExame: "TGP" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 9, nomeExame: "GAMA GT" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 10, nomeExame: "FA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 11, nomeExame: "AMILASE" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 12, nomeExame: "BILIRRUBINAS TOTAIS E FRACOES" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 13, nomeExame: "UREIA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 14, nomeExame: "CREATININA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 15, nomeExame: "TIPAGEM SANGUINEA ABO RH" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "HEMOGRAMA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "VITAMINA D" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "VITAMINA B12" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "FERRITINA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "FERRO SERICO" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "HEMOGLOBINA GLICADA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 7, nomeExame: "TGO" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 8, nomeExame: "TGP" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 9, nomeExame: "GAMA GT" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 10, nomeExame: "FA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 11, nomeExame: "AMILASE" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 12, nomeExame: "BILIRRUBINAS TOTAIS E FRACOES" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 13, nomeExame: "UREIA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 14, nomeExame: "CREATININA" },
    { blocoId: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 15, nomeExame: "TIPAGEM SANGUINEA ABO RH" },
    // BLK002 — TIREOIDE
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "TSH" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "T4 LIVRE" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "T3 LIVRE" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "TSH" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "T4 LIVRE" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "T3 LIVRE" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "T3 REVERSO" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "ANTI TPO" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 6, nomeExame: "ANTI TG" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 7, nomeExame: "TRAB" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 8, nomeExame: "PTH" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 1, nomeExame: "TSH" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 2, nomeExame: "T4 LIVRE" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 3, nomeExame: "T3 LIVRE" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 4, nomeExame: "T3 REVERSO" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 5, nomeExame: "ANTI TPO" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 6, nomeExame: "ANTI TG" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 7, nomeExame: "TRAB" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 8, nomeExame: "PTH" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 9, nomeExame: "TG" },
    { blocoId: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 10, nomeExame: "CALCITONINA" },
    // BLK003 — GLICEMICO INSULINICO
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "GLICEMIA DE JEJUM" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "INSULINA" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "GLICEMIA DE JEJUM" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "INSULINA" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "HOMA IR" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "HOMA BETA" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 1, nomeExame: "GLICEMIA DE JEJUM" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 2, nomeExame: "INSULINA" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 3, nomeExame: "HOMA IR" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 4, nomeExame: "HOMA BETA" },
    { blocoId: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 5, nomeExame: "FRUTOSAMINA" },
    // BLK004 — HEPATICO ESPECIFICO
    { blocoId: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "FIB 4" },
    { blocoId: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "FIB 4" },
    { blocoId: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "ELF SCORE" },
    { blocoId: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "FIBROTEST" },
    { blocoId: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "FIB 4" },
    { blocoId: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "ELF SCORE" },
    { blocoId: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "FIBROTEST" },
    { blocoId: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "CK 18" },
    // BLK005 — LIPIDICO
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "COLESTEROL TOTAL E FRACOES" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "HOMOCISTEINA" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "PCR US" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 4, nomeExame: "PERFIL DE ACIDOS GRAXOS" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "COLESTEROL TOTAL E FRACOES" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "HOMOCISTEINA" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "PCR US" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "PERFIL DE ACIDOS GRAXOS" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "RELACAO AA / EPA" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 6, nomeExame: "LIPOPROTEINA A" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 7, nomeExame: "APOLIPOPROTEINA B" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 8, nomeExame: "INDICE DE OMEGA 3 ERITROCITARIO" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "COLESTEROL TOTAL E FRACOES" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "HOMOCISTEINA" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "PCR US" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "PERFIL DE ACIDOS GRAXOS" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "RELACAO AA / EPA" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "LIPOPROTEINA A" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 7, nomeExame: "APOLIPOPROTEINA B" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 8, nomeExame: "INDICE DE OMEGA 3 ERITROCITARIO" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 9, nomeExame: "ELETROFORESE DE LIPOPROTEINAS" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 10, nomeExame: "GENOTIPAGEM APO E" },
    { blocoId: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 11, nomeExame: "APO C III" },
    // BLK006 — GONADAL
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "TESTOSTERONA TOTAL" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "TESTOSTERONA LIVRE" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "LH" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 4, nomeExame: "FSH" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 5, nomeExame: "ESTRADIOL" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 6, nomeExame: "PROLACTINA" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 7, nomeExame: "SHBG" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 8, nomeExame: "PROGESTERONA" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "TESTOSTERONA TOTAL" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "TESTOSTERONA LIVRE" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "LH" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "FSH" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "ESTRADIOL" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 6, nomeExame: "PROLACTINA" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 7, nomeExame: "SHBG" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 8, nomeExame: "PROGESTERONA" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 9, nomeExame: "DHT" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "TESTOSTERONA TOTAL" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "TESTOSTERONA LIVRE" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "LH" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "FSH" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "ESTRADIOL" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "PROLACTINA" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 7, nomeExame: "SHBG" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 8, nomeExame: "PROGESTERONA" },
    { blocoId: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 9, nomeExame: "DHT" },
    // BLK007 — PROSTATA
    { blocoId: "BLK007", nomeBloco: "BLOCO PROSTATA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "PSA TOTAL" },
    { blocoId: "BLK007", nomeBloco: "BLOCO PROSTATA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "PSA LIVRE" },
    // BLK008 — ADRENAL ESPECIFICO
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "CORTISOL" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "DHEA S" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "CORTISOL" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "DHEA S" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "ACTH" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "ALDOSTERONA" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "RENINA" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "CORTISOL" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "DHEA S" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "ACTH" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "ALDOSTERONA" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "RENINA" },
    { blocoId: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "17 OH PROGESTERONA" },
    // BLK009 — SALIVAR ADRENAL
    { blocoId: "BLK009", nomeBloco: "BLOCO SALIVAR ADRENAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "CORTISOL SALIVAR - AO ACORDAR - ENTRE 05:00 E 08:00 H" },
    { blocoId: "BLK009", nomeBloco: "BLOCO SALIVAR ADRENAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "CORTISOL SALIVAR - A TARDE - ENTRE 16:00 E 18:00 H" },
    { blocoId: "BLK009", nomeBloco: "BLOCO SALIVAR ADRENAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "CORTISOL SALIVAR - A NOITE - ENTRE 20:00 E 23:00 H" },
    { blocoId: "BLK009", nomeBloco: "BLOCO SALIVAR ADRENAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 4, nomeExame: "CORTISOL SALIVAR - MADRUGADA - ENTRE 02:00 E 04:00 H" },
    // BLK010 — DEFICIENCIA ABSORCAO
    { blocoId: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "SATURACAO DE TRANSFERRINA" },
    { blocoId: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "CTLF / TIBC" },
    { blocoId: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "SATURACAO DE TRANSFERRINA" },
    { blocoId: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "CTLF / TIBC" },
    { blocoId: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "HOLOTRANSCIBALAMINA" },
    { blocoId: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "SATURACAO DE TRANSFERRINA" },
    { blocoId: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "CTLF / TIBC" },
    { blocoId: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "HOLOTRANSCIBALAMINA" },
    { blocoId: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "ACIDO METILMALONICO" },
    // BLK011 — TROMBOSE
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "D DIMERO" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "D DIMERO" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "ANTICARDIOLIPINA IGG" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "ANTICARDIOLIPINA IGM" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "BETA 2 GLICOPROTEINA 1 IGG" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "BETA 2 GLICOPROTEINA 1 IGM" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 6, nomeExame: "ANTICOAGULANTE LUPICO" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 1, nomeExame: "D DIMERO" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 2, nomeExame: "ANTICARDIOLIPINA IGG" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 3, nomeExame: "ANTICARDIOLIPINA IGM" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 4, nomeExame: "BETA 2 GLICOPROTEINA 1 IGG" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 5, nomeExame: "BETA 2 GLICOPROTEINA 1 IGM" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 6, nomeExame: "ANTICOAGULANTE LUPICO" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 7, nomeExame: "ANTITROMBINA III" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 8, nomeExame: "PROTEINA C FUNCIONAL" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 9, nomeExame: "PROTEINA S LIVRE" },
    { blocoId: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grau: "GRADE AMPLIADA", ordemNoBloco: 10, nomeExame: "FATOR V LEIDEN E MUTACAO DA PROTROMBINA" },
    // BLK012 — COAGULOGRAMA
    { blocoId: "BLK012", nomeBloco: "BLOCO COAGULOGRAMA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "TAP" },
    { blocoId: "BLK012", nomeBloco: "BLOCO COAGULOGRAMA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "TTPA" },
    { blocoId: "BLK012", nomeBloco: "BLOCO COAGULOGRAMA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "TAP" },
    { blocoId: "BLK012", nomeBloco: "BLOCO COAGULOGRAMA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "TTPA" },
    { blocoId: "BLK012", nomeBloco: "BLOCO COAGULOGRAMA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "FIBRINOGENIO" },
    // BLK013 — MARCADORES CANCERIGENOS
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "CEA" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "AFP" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "CA 125" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "CEA" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "AFP" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "CA 125" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "CA 15 3" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "CA 19 9" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 6, nomeExame: "CA 72 4" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 7, nomeExame: "BETA 2 MICROGLOBULINA" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "CEA" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "AFP" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "CA 125" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "CA 15 3" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "CA 19 9" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "CA 72 4" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 7, nomeExame: "BETA 2 MICROGLOBULINA" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 8, nomeExame: "CALCITONINA" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 9, nomeExame: "TIREOGLOBULINA" },
    { blocoId: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 10, nomeExame: "HE4" },
    // BLK014 — RENAL ESPECIFICO
    { blocoId: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "CISTATINA C" },
    { blocoId: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "TFG ESTIMADA eGFR" },
    { blocoId: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "CISTATINA C" },
    { blocoId: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "TFG ESTIMADA eGFR" },
    { blocoId: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "NGAL" },
    { blocoId: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "CISTATINA C" },
    { blocoId: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "TFG ESTIMADA eGFR" },
    { blocoId: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "NGAL" },
    { blocoId: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "PENK / PROENCEFALINA" },
    // BLK015 — GRAVIDEZ
    { blocoId: "BLK015", nomeBloco: "BLOCO GRAVIDEZ", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "BETA HCG" },
    // BLK016 — DST (simplificado aqui para as grades basica/intermediaria/sofisticada)
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "HIV 1 E 2" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "HBsAg" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "ANTI HBs" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 4, nomeExame: "ANTI HBc TOTAL" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 5, nomeExame: "ANTI HCV" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "HIV 1 E 2" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "HBsAg" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "ANTI HBs" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "ANTI HBc TOTAL" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "ANTI HCV" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 6, nomeExame: "VDRL" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 7, nomeExame: "FTA ABS IGG" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 8, nomeExame: "FTA ABS IGM" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 9, nomeExame: "HERPES SIMPLEX I II IGG" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 10, nomeExame: "HERPES SIMPLEX I II IGM" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "HIV 1 E 2" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "HBsAg" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "ANTI HBs" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "ANTI HBc TOTAL" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "ANTI HCV" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "VDRL" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 7, nomeExame: "FTA ABS IGG" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 8, nomeExame: "FTA ABS IGM" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 9, nomeExame: "HERPES SIMPLEX I II IGG" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 10, nomeExame: "HERPES SIMPLEX I II IGM" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 11, nomeExame: "CHLAMYDIA TRACHOMATIS POR PCR" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 12, nomeExame: "NEISSERIA GONORRHOEAE POR PCR" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 13, nomeExame: "HPV POR PCR" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 14, nomeExame: "MYCOPLASMA POR PCR" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 15, nomeExame: "UREAPLASMA POR PCR" },
    { blocoId: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 16, nomeExame: "TRICHOMONAS VAGINALIS POR PCR" },
    // BLK017 — AUTOIMUNE
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "FAN" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "VHS" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "FAN" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "VHS" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "ANTI DNA" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "ANTI SM" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "ANTI SSA RO" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 6, nomeExame: "ANTI SSB LA" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 7, nomeExame: "C3" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 8, nomeExame: "C4" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "FAN" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "VHS" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "ANTI DNA" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "ANTI SM" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "ANTI SSA RO" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "ANTI SSB LA" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 7, nomeExame: "C3" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 8, nomeExame: "C4" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 9, nomeExame: "ANTI RNP" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 10, nomeExame: "ANTI JO 1" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 11, nomeExame: "ANTI SCL 70" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 12, nomeExame: "ANCA C" },
    { blocoId: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 13, nomeExame: "ANCA P" },
    // BLK018 — GENETICA POLIMORFISMOS
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "MTHFR C677T" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "MTHFR A1298C" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "MTHFR C677T" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "MTHFR A1298C" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "COMT" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "MTR" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "MTRR" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "MTHFR C677T" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "MTHFR A1298C" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "COMT" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "MTR" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "MTRR" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "CBS" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 7, nomeExame: "BHMT" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 8, nomeExame: "VDR" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 9, nomeExame: "FTO" },
    { blocoId: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 10, nomeExame: "APOE" },
    // BLK019 — FARMACOGENETICA
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "CYP2D6" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "CYP2C19" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "CYP2C9" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "CYP2D6" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "CYP2C19" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "CYP2C9" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "CYP3A4" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "CYP3A5" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 6, nomeExame: "SLCO1B1" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "CYP2D6" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "CYP2C19" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "CYP2C9" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "CYP3A4" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "CYP3A5" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "SLCO1B1" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 7, nomeExame: "VKORC1" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 8, nomeExame: "TPMT" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 9, nomeExame: "UGT1A1" },
    { blocoId: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 10, nomeExame: "OPRM1" },
    // BLK020 — METAIS TOXICOS
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "ALUMINIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "MERCURIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "CHUMBO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "ALUMINIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "MERCURIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "CHUMBO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "CADMIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 5, nomeExame: "ARSENIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "ALUMINIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "MERCURIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "CHUMBO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "CADMIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "ARSENIO" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "CADMIO URINA" },
    { blocoId: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 7, nomeExame: "MERCURIO URINA" },
    // BLK021 — VITAMINAS
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "VITAMINA C" },
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "FOLATO" },
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "VITAMINA C" },
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "FOLATO" },
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "VITAMINA A" },
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "VITAMINA E" },
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "VITAMINA C" },
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "FOLATO" },
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "VITAMINA A" },
    { blocoId: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "VITAMINA E" },
    // BLK022 — MINERAIS COFACTORES
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "MAGNESIO SERICO" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "ZINCO" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 1, nomeExame: "MAGNESIO SERICO" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 2, nomeExame: "ZINCO" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 3, nomeExame: "COBRE" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE INTERMEDIARIA", ordemNoBloco: 4, nomeExame: "CERULOPLASMINA" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 1, nomeExame: "MAGNESIO SERICO" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 2, nomeExame: "ZINCO" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 3, nomeExame: "COBRE" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 4, nomeExame: "CERULOPLASMINA" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 5, nomeExame: "MAGNESIO ERITROCITARIO" },
    { blocoId: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grau: "GRADE SOFISTICADA", ordemNoBloco: 6, nomeExame: "MAGNESIO INTRAERITROCITARIO" },
    // BLK023 — SALIVAR HORMONAL
    { blocoId: "BLK023", nomeBloco: "BLOCO SALIVAR HORMONAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 1, nomeExame: "TESTOSTERONA SALIVAR" },
    { blocoId: "BLK023", nomeBloco: "BLOCO SALIVAR HORMONAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 2, nomeExame: "PROGESTERONA SALIVAR" },
    { blocoId: "BLK023", nomeBloco: "BLOCO SALIVAR HORMONAL", usaGrade: true, grau: "GRADE BASICA", ordemNoBloco: 3, nomeExame: "ESTRADIOL SALIVAR" },
    // BLK024 — ULTRASSOM
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 1, nomeExame: "ULTRASSOM DE ABDOME TOTAL" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 2, nomeExame: "ULTRASSOM DE ABDOME SUPERIOR" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 3, nomeExame: "ULTRASSOM DE FIGADO E VIAS BILIARES" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 4, nomeExame: "ULTRASSOM DE RINS E VIAS URINARIAS" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 5, nomeExame: "ULTRASSOM DE BEXIGA" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 6, nomeExame: "ULTRASSOM PELVICO" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 7, nomeExame: "ULTRASSOM TRANSVAGINAL" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 8, nomeExame: "ULTRASSOM TRANSRETAL" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 9, nomeExame: "ULTRASSOM DE PROSTATA" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 10, nomeExame: "ULTRASSOM DE TIREOIDE" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 11, nomeExame: "ULTRASSOM DE TIREOIDE COM DOPPLER" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 12, nomeExame: "ULTRASSOM DE MAMAS" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 13, nomeExame: "ULTRASSOM DE PARTES MOLES" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 14, nomeExame: "ULTRASSOM DE BOLSA ESCROTAL" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 15, nomeExame: "ULTRASSOM DOPPLER ARTERIAL" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 16, nomeExame: "ULTRASSOM DOPPLER VENOSO" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 17, nomeExame: "ULTRASSOM OBSTETRICO" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 18, nomeExame: "ULTRASSOM MORFOLOGICO" },
    { blocoId: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 19, nomeExame: "ULTRASSOM COM TRANSLUCENCIA NUCAL" },
    // BLK025 — TOMOGRAFIA
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 1, nomeExame: "TOMOGRAFIA DE CRANIO" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 2, nomeExame: "TOMOGRAFIA DE SEIOS DA FACE" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 3, nomeExame: "TOMOGRAFIA DE PESCOCO" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 4, nomeExame: "TOMOGRAFIA DE TORAX" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 5, nomeExame: "TOMOGRAFIA DE ABDOME" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 6, nomeExame: "TOMOGRAFIA DE PELVE" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 7, nomeExame: "TOMOGRAFIA DE ABDOME E PELVE" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 8, nomeExame: "TOMOGRAFIA DE COLUNA CERVICAL" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 9, nomeExame: "TOMOGRAFIA DE COLUNA TORACICA" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 10, nomeExame: "TOMOGRAFIA DE COLUNA LOMBAR" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 11, nomeExame: "TOMOGRAFIA DE ARTICULACOES" },
    { blocoId: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 12, nomeExame: "ANGIOTOMOGRAFIA" },
    // BLK026 — RESSONANCIA MAGNETICA
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 1, nomeExame: "RESSONANCIA MAGNETICA DE CRANIO" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 2, nomeExame: "RESSONANCIA MAGNETICA DE SELA TURCA" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 3, nomeExame: "RESSONANCIA MAGNETICA DE COLUNA CERVICAL" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 4, nomeExame: "RESSONANCIA MAGNETICA DE COLUNA TORACICA" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 5, nomeExame: "RESSONANCIA MAGNETICA DE COLUNA LOMBAR" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 6, nomeExame: "RESSONANCIA MAGNETICA DE ABDOME SUPERIOR" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 7, nomeExame: "RESSONANCIA MAGNETICA DE PELVE" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 8, nomeExame: "RESSONANCIA MAGNETICA DE ARTICULACOES" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 9, nomeExame: "RESSONANCIA MAGNETICA DE JOELHO" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 10, nomeExame: "RESSONANCIA MAGNETICA DE OMBRO" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 11, nomeExame: "RESSONANCIA MAGNETICA DE MAMAS" },
    { blocoId: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 12, nomeExame: "ANGIORRESSONANCIA" },
    // BLK027 — CARDIOLOGICOS DE IMAGEM
    { blocoId: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 1, nomeExame: "ELETROCARDIOGRAMA" },
    { blocoId: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 2, nomeExame: "ECOCARDIOGRAMA TRANSTORACICO" },
    { blocoId: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 3, nomeExame: "TESTE ERGOMETRICO" },
    { blocoId: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 4, nomeExame: "HOLTER 24 HORAS" },
    { blocoId: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 5, nomeExame: "MAPA 24 HORAS" },
    { blocoId: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 6, nomeExame: "ANGIOTOMOGRAFIA CORONARIANA" },
    { blocoId: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 7, nomeExame: "ECOCARDIOGRAMA COM STRESS" },
    { blocoId: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 8, nomeExame: "DOPPLER DE CAROTIDAS" },
    { blocoId: "BLK027", nomeBloco: "BLOCO CARDIOLOGICOS DE IMAGEM", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 9, nomeExame: "CALCIO CORONARIANO" },
    // BLK028 — ENDOSCOPICOS
    { blocoId: "BLK028", nomeBloco: "BLOCO ENDOSCOPICOS", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 1, nomeExame: "ENDOSCOPIA DIGESTIVA ALTA" },
    { blocoId: "BLK028", nomeBloco: "BLOCO ENDOSCOPICOS", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 2, nomeExame: "COLONOSCOPIA" },
    { blocoId: "BLK028", nomeBloco: "BLOCO ENDOSCOPICOS", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 3, nomeExame: "RETOSSIGMOIDOSCOPIA" },
    { blocoId: "BLK028", nomeBloco: "BLOCO ENDOSCOPICOS", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 4, nomeExame: "ANUSCOPIA" },
    { blocoId: "BLK028", nomeBloco: "BLOCO ENDOSCOPICOS", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 5, nomeExame: "LARINGOSCOPIA" },
    { blocoId: "BLK028", nomeBloco: "BLOCO ENDOSCOPICOS", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 6, nomeExame: "NASOFIBROSCOPIA" },
    { blocoId: "BLK028", nomeBloco: "BLOCO ENDOSCOPICOS", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 7, nomeExame: "CAPSULA ENDOSCOPICA" },
    // BLK029 — RX
    { blocoId: "BLK029", nomeBloco: "BLOCO RX", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 1, nomeExame: "RAIO X DE TORAX" },
    { blocoId: "BLK029", nomeBloco: "BLOCO RX", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 2, nomeExame: "RAIO X DE ABDOME" },
    { blocoId: "BLK029", nomeBloco: "BLOCO RX", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 3, nomeExame: "RAIO X DE COLUNA" },
    { blocoId: "BLK029", nomeBloco: "BLOCO RX", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 4, nomeExame: "RAIO X DE ARTICULACOES" },
    // BLK030 — MAMOGRAFIA
    { blocoId: "BLK030", nomeBloco: "BLOCO MAMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 1, nomeExame: "MAMOGRAFIA BILATERAL" },
    { blocoId: "BLK030", nomeBloco: "BLOCO MAMOGRAFIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 2, nomeExame: "MAMOGRAFIA COM TOMOSSINTESE" },
    // BLK031 — DENSITOMETRIA
    { blocoId: "BLK031", nomeBloco: "BLOCO DENSITOMETRIA", usaGrade: false, grau: "SEM GRADE", ordemNoBloco: 1, nomeExame: "DENSITOMETRIA OSSEA" },
  ]);

  // =========================================================
  // 8. ITENS TERAPEUTICOS (formulas, injetaveis, implantes)
  // =========================================================
  console.log("Inserindo itens terapeuticos PADCOM...");
  await db.insert(itensTerapeuticosTable).values([
    { nome: "Bloco Base Integrativa - Grade Basica", descricao: "Hemograma, Vitamina D, Vitamina B12, Ferritina, Ferro Serico, Hemoglobina Glicada, TGO, TGP, Gama GT, FA, Amilase, Bilirrubinas, Ureia, Creatinina.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM BASE BASI 001", blocoId: "BLK001", grau: "GRADE BASICA", areaSemantica: "BASE", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Bloco Base Integrativa - Grade Intermediaria", descricao: "Todos os itens da grade basica + Tipagem sanguinea ABO Rh.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM BASE INTE 001", blocoId: "BLK001", grau: "GRADE INTERMEDIARIA", areaSemantica: "BASE", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Bloco Tireoide - Grade Basica", descricao: "TSH, T4 Livre, T3 Livre.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM TIRE BASI 001", blocoId: "BLK002", grau: "GRADE BASICA", areaSemantica: "TIRE", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Bloco Tireoide - Grade Intermediaria", descricao: "TSH, T4 Livre, T3 Livre, T3 Reverso, Anti TPO, Anti TG, TRAb, PTH.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM TIRE INTE 001", blocoId: "BLK002", grau: "GRADE INTERMEDIARIA", areaSemantica: "TIRE", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Bloco Tireoide - Grade Ampliada", descricao: "Todos itens intermediarios + TG, Calcitonina.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM TIRE AMPL 001", blocoId: "BLK002", grau: "GRADE AMPLIADA", areaSemantica: "TIRE", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Bloco Glicemico Insulinico - Grade Basica", descricao: "Glicemia de Jejum, Insulina.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM GLIC BASI 001", blocoId: "BLK003", grau: "GRADE BASICA", areaSemantica: "GLIC", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Bloco Glicemico Insulinico - Grade Ampliada", descricao: "Glicemia, Insulina, HOMA IR, HOMA Beta, Frutosamina.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM GLIC AMPL 001", blocoId: "BLK003", grau: "GRADE AMPLIADA", areaSemantica: "GLIC", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Bloco Gonadal - Grade Basica", descricao: "FSH, LH, Estradiol, Prolactina, Testosterona Total e Livre, SHBG, Progesterona.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM GONA BASI 001", blocoId: "BLK006", grau: "GRADE BASICA", areaSemantica: "GONA", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Bloco Adrenal Especifico - Grade Basica", descricao: "Cortisol Matinal, DHEA-S.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM ADRE BASI 001", blocoId: "BLK008", grau: "GRADE BASICA", areaSemantica: "ADRE", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Bloco Autoimune - Grade Basica", descricao: "FAN, VHS.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM AUTO BASI 001", blocoId: "BLK017", grau: "GRADE BASICA", areaSemantica: "AUTO", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Bloco Lipidico Cardiometabolico - Grade Basica", descricao: "Colesterol Total e Fracoes, Homocisteina, PCR US, Perfil de Acidos Graxos.", categoria: "exame", subCategoria: "laboratorial", codigoPadcom: "EXAM LIPI BASI 001", blocoId: "BLK005", grau: "GRADE BASICA", areaSemantica: "LIPI", disponivel: true, exigeValidacaoHumana: false },
    // Formulas
    { nome: "Formula Suporte Tireoide Modulacao Base", descricao: "Formula magistral com suporte para funcao tireoidiana. Composicao personalizada conforme avaliacao clinica.", categoria: "formula", subCategoria: "magistral", codigoPadcom: "FORM TIRE MODU 001", blocoId: "BLK002", areaSemantica: "TIRE", viaUso: "ORAL", frequenciaBase: "DIARIA", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Formula Suporte Energetico Mitocondrial", descricao: "Suporte mitocondrial com coenzima Q10, carnitina e cofatores energeticos.", categoria: "formula", subCategoria: "magistral", codigoPadcom: "FORM META MITO 001", blocoId: "BLK001", areaSemantica: "META", viaUso: "ORAL", frequenciaBase: "DIARIA", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Formula Resistencia Insulinica", descricao: "Berberina, cromo, acido alfa-lipoico, canela — suporte ao metabolismo glicemico.", categoria: "formula", subCategoria: "magistral", codigoPadcom: "FORM GLIC INSU 001", blocoId: "BLK003", areaSemantica: "GLIC", viaUso: "ORAL", frequenciaBase: "DIARIA", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Formula Hormonal Base Feminina", descricao: "Suporte ao ciclo hormonal feminino com composicao fitoterapeuta e vitaminas.", categoria: "formula", subCategoria: "magistral", codigoPadcom: "FORM HORM FEMI 001", blocoId: "BLK006", areaSemantica: "HORM", viaUso: "ORAL", frequenciaBase: "DIARIA", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Formula Modular Adrenal", descricao: "Ashwagandha, roddiola, vitamina C, panax ginseng — suporte adrenal.", categoria: "formula", subCategoria: "magistral", codigoPadcom: "FORM ADRE MODU 001", blocoId: "BLK008", areaSemantica: "ADRE", viaUso: "ORAL", frequenciaBase: "DIARIA", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Formula Antioxidante Sistemica", descricao: "Vitaminas C, E, selenium, NAC, quercetina.", categoria: "formula", subCategoria: "magistral", codigoPadcom: "FORM ANTI SIST 001", blocoId: "BLK001", areaSemantica: "META", viaUso: "ORAL", frequenciaBase: "DIARIA", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Formula Cognitiva Nootropica", descricao: "Fosfatidilserina, colina, huperzina, omega-3.", categoria: "formula", subCategoria: "magistral", codigoPadcom: "FORM COGN NOOT 001", blocoId: "BLK001", areaSemantica: "COGN", viaUso: "ORAL", frequenciaBase: "DIARIA", disponivel: true, exigeValidacaoHumana: true },
    // Injetaveis IM
    { nome: "B12 com Complexo B Injetavel", descricao: "Metilcobalamina + Complexo B. Via intramuscular. Indicado para fadiga, neuropatia, deficiencia de B12.", categoria: "injetavel_im", subCategoria: "vitamina", codigoPadcom: "INJE META B12C 001", blocoId: "BLK001", areaSemantica: "META", viaUso: "IM", frequenciaBase: "SEMANAL", composicao: "Metilcobalamina 5mg + Tiamina 100mg + Riboflavina 10mg + Piridoxina 100mg", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Vitamina D3 Injetavel IM", descricao: "Colecalciferol 300.000 UI via IM para reposicao rapida.", categoria: "injetavel_im", subCategoria: "vitamina", codigoPadcom: "INJE VITA D3IM 001", blocoId: "BLK001", areaSemantica: "VITA", viaUso: "IM", frequenciaBase: "MENSAL", composicao: "Colecalciferol 300.000 UI/mL", disponivel: true, exigeValidacaoHumana: false },
    { nome: "Glutationa Injetavel IM", descricao: "Glutationa reduzida IM para desintoxicacao e suporte imunologico.", categoria: "injetavel_im", subCategoria: "antioxidante", codigoPadcom: "INJE ANTI GLUT 001", blocoId: "BLK001", areaSemantica: "ANTI", viaUso: "IM", frequenciaBase: "SEMANAL", disponivel: true, exigeValidacaoHumana: true },
    // Injetaveis EV
    { nome: "Vitamina C Endovenosa Alta Dose", descricao: "Acido ascorbico EV alta dose para suporte imunologico e oncologico.", categoria: "injetavel_ev", subCategoria: "vitamina", codigoPadcom: "INJE VITA CEND 001", blocoId: "BLK001", areaSemantica: "VITA", viaUso: "IV", frequenciaBase: "SEMANAL", composicao: "Acido Ascorbico 25g/250mL SFiso", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Ozonioterapia EV Grande Autohemoterapia", descricao: "Grande autohemoterapia com ozonio medicinal. Protocolo de 10 sessoes.", categoria: "injetavel_ev", subCategoria: "ozonio", codigoPadcom: "INJE OZON GAUT 001", blocoId: "BLK001", areaSemantica: "OZON", viaUso: "IV", frequenciaBase: "SEMANAL", disponivel: true, exigeValidacaoHumana: true },
    // Implantes
    { nome: "Implante Testosterona Subdermico", descricao: "Pellet de testosterona subdermico. Duracao 4-6 meses. Indicado para hipogonadismo masculino.", categoria: "implante", subCategoria: "hormonal", codigoPadcom: "IMPL HORM TEST 001", blocoId: "BLK006", areaSemantica: "HORM", viaUso: "SUBDERMAL", frequenciaBase: "SEMESTRAL", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Implante Progesterona Bioidentica", descricao: "Pellet de progesterona bioidentica subdermico. Duracao 3-4 meses.", categoria: "implante", subCategoria: "hormonal", codigoPadcom: "IMPL HORM PROG 001", blocoId: "BLK006", areaSemantica: "HORM", viaUso: "SUBDERMAL", frequenciaBase: "TRIMESTRAL", disponivel: true, exigeValidacaoHumana: true },
    // Protocolos
    { nome: "Protocolo Metabolico Base", descricao: "Protocolo completo de avaliacao e tratamento metabolico integrado.", categoria: "protocolo", codigoPadcom: "PROC META BASE 001", blocoId: "BLK001", areaSemantica: "META", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Protocolo Endocrino Hormonal Completo", descricao: "Avaliacao completa hormonal com reposicao individualizada.", categoria: "protocolo", codigoPadcom: "PROC HORM COMP 001", blocoId: "BLK006", areaSemantica: "HORM", disponivel: true, exigeValidacaoHumana: true },
    { nome: "Protocolo Anti-Aging Integrativo", descricao: "Protocolo longevidade com exames, formula e injetaveis.", categoria: "protocolo", codigoPadcom: "PROC ANTI AGIN 001", blocoId: "BLK001", areaSemantica: "META", disponivel: true, exigeValidacaoHumana: true },
  ]);

  // =========================================================
  // 9. REGRAS DO MOTOR CLINICO
  // =========================================================
  console.log("Inserindo regras do motor clinico...");
  // Seed regras_motor with multiple rows per rule (one per keyword)
  // Schema: regraId, perguntaId, palavraChave, segmento, codigoReferencia, blocoReferencia, prioridade, observacao, ativo
  const regras = [
    { regraId: "MRE001", palavrasChave: ["FADIGA", "CANSACO", "FRAQUEZA"], segmento: "exame" as const, codigoReferencia: "EXAM TIRE BASI 001", blocoReferencia: "BLK002", prioridade: "alta" as const, observacao: "Sintoma FADIGA → Bloco Tireoide." },
    { regraId: "MRE002", palavrasChave: ["HIPOTIREOIDISMO", "HASHIMOTO", "TIREOIDITE"], segmento: "exame" as const, codigoReferencia: "EXAM TIRE AMPL 001", blocoReferencia: "BLK002", prioridade: "alta" as const, observacao: "Diagnostico HIPOTIREOIDISMO → Grade Ampliada da Tireoide." },
    { regraId: "MRF003", palavrasChave: ["HIPOTIREOIDISMO", "HASHIMOTO"], segmento: "formula" as const, codigoReferencia: "FORM TIRE MODU 001", blocoReferencia: "BLK002", prioridade: "alta" as const, observacao: "Diagnostico HIPOTIREOIDISMO → Formula Suporte Tireoide." },
    { regraId: "MRE004", palavrasChave: ["OBESIDADE", "IMC ALTO", "SOBREPESO"], segmento: "exame" as const, codigoReferencia: "EXAM BASE BASI 001", blocoReferencia: "BLK001", prioridade: "media" as const, observacao: "Obesidade → Avaliacao laboratorial base completa." },
    { regraId: "MRE005", palavrasChave: ["DIABETES", "INSULINA", "GLICEMIA"], segmento: "exame" as const, codigoReferencia: "EXAM GLIC AMPL 001", blocoReferencia: "BLK003", prioridade: "alta" as const, observacao: "Diagnostico DIABETES → Avaliacao glicemica ampliada." },
    { regraId: "MRE006", palavrasChave: ["GANHO DE PESO", "RESISTENCIA INSULINICA"], segmento: "exame" as const, codigoReferencia: "EXAM GLIC BASI 001", blocoReferencia: "BLK003", prioridade: "alta" as const, observacao: "Sintoma GANHO DE PESO → Bloco Glicemico." },
    { regraId: "MRF001", palavrasChave: ["FADIGA", "CANSACO"], segmento: "formula" as const, codigoReferencia: "FORM META MITO 001", blocoReferencia: "BLK001", prioridade: "media" as const, observacao: "Sintoma FADIGA → Suporte energetico mitocondrial." },
    { regraId: "MRF002", palavrasChave: ["RESISTENCIA INSULINICA", "DIABETES", "GANHO DE PESO"], segmento: "formula" as const, codigoReferencia: "FORM GLIC INSU 001", blocoReferencia: "BLK003", prioridade: "alta" as const, observacao: "Resistencia insulinica → Formula berberina + cromo." },
    { regraId: "MRI001", palavrasChave: ["DEFICIENCIA B12", "ANEMIA", "NEUROPATIA"], segmento: "injetavel" as const, codigoReferencia: "INJE META B12C 001", blocoReferencia: "BLK001", prioridade: "alta" as const, observacao: "Deficiencia B12 → Reposicao IM." },
    { regraId: "MRE007", palavrasChave: ["AUTOIMUNE", "LUPUS", "ARTRITE REUMATOIDE"], segmento: "exame" as const, codigoReferencia: "EXAM AUTO BASI 001", blocoReferencia: "BLK017", prioridade: "alta" as const, observacao: "Condicao autoimune → Investigacao imunologica." },
    { regraId: "MRE008", palavrasChave: ["COLESTEROL ALTO", "DISLIPIDEMIA", "TRIGLICERIDES"], segmento: "exame" as const, codigoReferencia: "EXAM LIPI BASI 001", blocoReferencia: "BLK005", prioridade: "alta" as const, observacao: "Dislipidemia → Perfil lipidico completo." },
    { regraId: "MRE009", palavrasChave: ["QUEDA DE CABELO", "ALOPECIA"], segmento: "exame" as const, codigoReferencia: "EXAM GONA BASI 001", blocoReferencia: "BLK006", prioridade: "media" as const, observacao: "Queda de cabelo → Investigacao hormonal gonadal." },
    { regraId: "MRI002", palavrasChave: ["IMUNIDADE BAIXA", "INFECCOES RECORRENTES"], segmento: "injetavel" as const, codigoReferencia: "INJE VITA CEND 001", blocoReferencia: "BLK001", prioridade: "media" as const, observacao: "Imunossupressao → Vitamina C EV alta dose." },
    { regraId: "MRP001", palavrasChave: ["AVALIACAO COMPLETA", "LONGEVIDADE", "PREVENTIVO"], segmento: "protocolo" as const, codigoReferencia: "PROC META BASE 001", blocoReferencia: "BLK001", prioridade: "media" as const, observacao: "Pedido de avaliacao completa → Protocolo metabolico base." },
  ];
  const regraRows = regras.flatMap((r) =>
    r.palavrasChave.map((pk) => ({
      regraId: r.regraId,
      perguntaId: r.regraId,
      palavraChave: pk,
      segmento: r.segmento,
      codigoReferencia: r.codigoReferencia,
      blocoReferencia: r.blocoReferencia,
      prioridade: r.prioridade,
      observacao: r.observacao,
      ativo: "SIM",
    }))
  );
  await db.insert(regrasMotorTable).values(regraRows);

  // =========================================================
  // 10. PROTOCOLOS
  // =========================================================
  console.log("Inserindo protocolos...");
  await db.insert(protocolosTable).values([
    { nome: "Protocolo Metabolico Base", descricao: "Protocolo completo de avaliacao e tratamento metabolico integrado para pacientes com multiplas queixas metabolicas.", categoria: "metabolico", duracao: "6 meses", fases: ["Fase 1: Avaliacao Laboratorial", "Fase 2: Suplementacao Base", "Fase 3: Formula Personalizada", "Fase 4: Monitoramento"], ativo: true },
    { nome: "Protocolo Endocrino Hormonal", descricao: "Avaliacao e reposicao hormonal bioidentica completa.", categoria: "hormonal", duracao: "12 meses", fases: ["Fase 1: Laboratorio Hormonal", "Fase 2: Ajuste de Reposicao", "Fase 3: Manutencao"], ativo: true },
    { nome: "Protocolo Anti-Aging Integrativo", descricao: "Programa completo de longevidade com exames avancados, formula e injetaveis.", categoria: "longevidade", duracao: "ongoing", fases: ["Fase 1: Baseline Completo", "Fase 2: Intervencao", "Fase 3: Manutencao Anual"], ativo: true },
  ]);

  // =========================================================
  // 11. ANAMNESES DEMO
  // =========================================================
  console.log("Inserindo anamneses demo...");
  const [anamnese1, anamnese2] = await db.insert(anamnesesTable).values([
    {
      pacienteId: pac1.id,
      status: "concluida",
      sinaisSemanticos: ["FADIGA", "GANHO DE PESO", "INSONIA", "HIPOTIREOIDISMO", "RESISTENCIA INSULINICA"],
      respostasClincias: {
        queixa: "Fadiga cronica, ganho de peso e insonia nos ultimos 6 meses.",
        doencasDiagnosticadas: ["HIPOTIREOIDISMO", "RESISTENCIA INSULINICA"],
        medicamentos: ["Levotiroxina 50mcg"],
        historicoPessoal: "Tireoidite de Hashimoto diagnosticada em 2020.",
        historicoFamiliar: "Materna: DIABETES. Paterno: HIPOTIREOIDISMO.",
      },
      respostasFinanceiras: { perfilFinanceiro: "medio" },
      respostasPreferencias: { aceitaFormulas: true, aceitaInjetaveisIM: true, aceitaInjetaveisEV: false, aceitaImplantes: false },
      motorAtivadoEm: new Date(),
    },
    {
      pacienteId: pac2.id,
      status: "validada",
      sinaisSemanticos: ["COLESTEROL ALTO", "CANSACO", "DISLIPIDEMIA", "OBESIDADE"],
      respostasClincias: {
        queixa: "Dislipidemia, cansaco e dificuldade de perder peso.",
        doencasDiagnosticadas: ["DISLIPIDEMIA", "OBESIDADE"],
        medicamentos: [],
        historicoPessoal: "IMC 32. Dislipidemia sem uso de medicamento.",
        historicoFamiliar: "Paterno: INFARTO. Materno: DISLIPIDEMIA.",
      },
      respostasFinanceiras: { perfilFinanceiro: "basico" },
      respostasPreferencias: { aceitaFormulas: true, aceitaInjetaveisIM: false, aceitaInjetaveisEV: false, aceitaImplantes: false },
      motorAtivadoEm: new Date(),
    },
  ]).returning();

  // =========================================================
  // 12. FILAS OPERACIONAIS
  // =========================================================
  console.log("Inserindo filas operacionais...");
  await db.insert(filasTable).values([
    { tipo: "anamnese", pacienteId: pac1.id, referenciaId: anamnese1.id, responsavelId: uRafael.id, unidadeId: unidade1.id, prioridade: "media", status: "concluido", descricao: "Anamnese concluida — aguarda validacao." },
    { tipo: "validacao", pacienteId: pac1.id, referenciaId: anamnese1.id, responsavelId: uValidador.id, unidadeId: unidade1.id, prioridade: "alta", status: "aguardando", descricao: "Validacao pendente das sugestoes do motor." },
    { tipo: "procedimento", pacienteId: pac2.id, referenciaId: anamnese2.id, responsavelId: uMarina.id, unidadeId: unidade1.id, prioridade: "media", status: "aguardando", descricao: "Aguardando preparo do protocolo." },
    { tipo: "followup", pacienteId: pac2.id, referenciaId: anamnese2.id, responsavelId: uMarina.id, unidadeId: unidade1.id, prioridade: "baixa", status: "aguardando", descricao: "Follow-up 30 dias pos-inicio protocolo." },
    { tipo: "pagamento", pacienteId: pac1.id, referenciaId: anamnese1.id, responsavelId: uRafael.id, unidadeId: unidade1.id, prioridade: "media", status: "aguardando", descricao: "Pagamento do pacote inicial pendente." },
  ]);

  // =========================================================
  // 13. FOLLOWUPS
  // =========================================================
  console.log("Inserindo followups...");
  await db.insert(followupsTable).values([
    { pacienteId: pac1.id, responsavelId: uRafael.id, unidadeId: unidade1.id, tipo: "consulta", dataAgendada: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: "agendado", recorrencia: "nenhuma", observacoes: "Retorno em 30 dias para avaliacao do tratamento tireoide." },
    { pacienteId: pac2.id, responsavelId: uMarina.id, unidadeId: unidade1.id, tipo: "exame", dataAgendada: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), status: "agendado", recorrencia: "nenhuma", observacoes: "Coleta de exames controle dislipidemia." },
  ]);

  // =========================================================
  // 14. PAGAMENTOS
  // =========================================================
  console.log("Inserindo pagamentos...");
  await db.insert(pagamentosTable).values([
    { pacienteId: pac1.id, unidadeId: unidade1.id, valor: 350.00, formaPagamento: "pix", status: "pago", descricao: "Consulta inicial + motor PADCOM" },
    { pacienteId: pac2.id, unidadeId: unidade1.id, valor: 280.00, formaPagamento: "cartao_credito", status: "pendente", descricao: "Avaliacao metabolica basica" },
  ]);

  console.log("\nSeed PADCOM V9 concluido com sucesso!");
  console.log("Dados inseridos:");
  console.log("  - 2 unidades (Clinica Padua + Instituto Vida Plena)");
  console.log("  - 4 usuarios profissionais reais");
  console.log("  - 3 pacientes (incluindo Dayana — dado real PADCOM)");
  console.log("  - 10 perfis de permissoes V15");
  console.log("  - 17 etapas em 3 fluxos de aprovacao");
  console.log("  - 31 blocos PADCOM (BLK001-BLK031)");
  console.log("  - 409+ exames no mapa bloco→exame");
  console.log("  - 27 itens terapeuticos (exames, formulas, injetaveis, implantes, protocolos)");
  console.log("  - 15 regras do motor clinico");
  console.log("  - 3 protocolos, 2 anamneses, 5 filas, 2 followups, 2 pagamentos");
  console.log("\nLogin de acesso:");
  console.log("  caio@clinica.com | helena@clinica.com | ana@clinica.com | carlos@clinica.com");
  console.log("  Senha: senha123");
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
