import crypto from "crypto";

export enum BlocoRAS {
  CLIN = "CLIN",
  JURI = "JURI",
  FINA = "FINA",
  ACOM = "ACOM",
  P4100 = "4100",
}

export enum SubgrupoCLIN {
  BASE = "CLIN.BASE",
  SESS = "CLIN.SESS",
  EVOL = "CLIN.EVOL",
  POSP = "CLIN.POSP",
}

export enum SubgrupoJURI {
  BASE = "JURI.BASE",
  CONS = "JURI.CONS",
  IMAG = "JURI.IMAG",
  DIGI = "JURI.DIGI",
}

export enum SubgrupoFINA {
  ORCA = "FINA.ORCA",
  PAGT = "FINA.PAGT",
  REEM = "FINA.REEM",
  CIEN = "FINA.CIEN",
}

export enum SubgrupoACOM {
  REVO = "ACOM.REVO",
  JORN = "ACOM.JORN",
  META = "ACOM.META",
  ALER = "ACOM.ALER",
}

export enum Subgrupo4100 {
  S4101 = "4101",
  S4102 = "4102",
  S4103 = "4103",
  S4104 = "4104",
}

export enum EventoRAS {
  START = "START",
  POS_PROCEDIMENTO = "POS_PROCEDIMENTO",
  CONSULTA_MENSAL = "CONSULTA_MENSAL",
  REVISAO_SEMESTRAL = "REVISAO_SEMESTRAL",
  SOLICITACAO_JURIDICA = "SOLICITACAO_JURIDICA",
  SOLICITACAO_FINANCEIRA = "SOLICITACAO_FINANCEIRA",
  FECHAMENTO_LAUDO = "FECHAMENTO_LAUDO",
}

export enum ClasseProcedimento {
  FORM = "FORM",
  INJM = "INJM",
  INJV = "INJV",
  IMPL = "IMPL",
  ESTI = "ESTI",
  ESTT = "ESTT",
}

export enum ConsentimentoEspecifico {
  CFOR = "CFOR",
  CIMU = "CIMU",
  CEND = "CEND",
  CIMP = "CIMP",
  CEIN = "CEIN",
  CETE = "CETE",
}

export const CLASSE_LABELS: Record<ClasseProcedimento, { descricao: string; consentimento: ConsentimentoEspecifico; eixoJuridico: string }> = {
  [ClasseProcedimento.FORM]: { descricao: "Formulas Manipuladas", consentimento: ConsentimentoEspecifico.CFOR, eixoJuridico: "Absorcao individual, interacoes, resposta variavel" },
  [ClasseProcedimento.INJM]: { descricao: "Injetaveis Intramusculares", consentimento: ConsentimentoEspecifico.CIMU, eixoJuridico: "Dor local, hematoma, nodulo, monitoramento" },
  [ClasseProcedimento.INJV]: { descricao: "Injetaveis Endovenosos", consentimento: ConsentimentoEspecifico.CEND, eixoJuridico: "Reacao imediata, ambiente controlado, seguranca" },
  [ClasseProcedimento.IMPL]: { descricao: "Implantes Hormonais/Terapeuticos", consentimento: ConsentimentoEspecifico.CIMP, eixoJuridico: "Efeitos sistemicos, exames, nao reversao imediata" },
  [ClasseProcedimento.ESTI]: { descricao: "Estetica Invasiva", consentimento: ConsentimentoEspecifico.CEIN, eixoJuridico: "Assimetria, hematoma, resultado variavel" },
  [ClasseProcedimento.ESTT]: { descricao: "Estetica por Tecnologia", consentimento: ConsentimentoEspecifico.CETE, eixoJuridico: "Queimadura, fototipo, hiperpigmentacao" },
};

export const BLOCO_LABELS: Record<BlocoRAS, { nome: string; funcao: string }> = {
  [BlocoRAS.CLIN]: { nome: "RAS Clinico", funcao: "Documento nuclear do tratamento" },
  [BlocoRAS.JURI]: { nome: "RAS Juridico", funcao: "Blindagem documental e termos" },
  [BlocoRAS.FINA]: { nome: "RAS Financeiro", funcao: "Transparencia economica" },
  [BlocoRAS.ACOM]: { nome: "RAS Evolutivo", funcao: "Devolutiva periodica" },
  [BlocoRAS.P4100]: { nome: "RAS Patologias", funcao: "Doencas, risco e medicacoes" },
};

export const SUBGRUPO_LABELS: Record<string, { nome: string; funcao: string }> = {
  [SubgrupoCLIN.BASE]: { nome: "Base Clinica", funcao: "Estado inicial, patologias, orgaos" },
  [SubgrupoCLIN.SESS]: { nome: "Sessao", funcao: "Medicamentos, formulas, execucao" },
  [SubgrupoCLIN.EVOL]: { nome: "Evolucao", funcao: "Curvas, comparativos, transicao" },
  [SubgrupoCLIN.POSP]: { nome: "Pos-Procedimento", funcao: "Orientacoes imediatas pos-sessao" },
  [SubgrupoJURI.BASE]: { nome: "Base Juridica", funcao: "LGPD, privacidade, nao-garantia" },
  [SubgrupoJURI.CONS]: { nome: "Consentimentos", funcao: "TCLE e consentimentos especificos por classe" },
  [SubgrupoJURI.IMAG]: { nome: "Direito de Imagem", funcao: "Autorizacao de uso de imagem" },
  [SubgrupoJURI.DIGI]: { nome: "Assinatura Digital", funcao: "Aceite digital e plataforma" },
  [SubgrupoFINA.ORCA]: { nome: "Orcamento", funcao: "Detalhamento financeiro do tratamento" },
  [SubgrupoFINA.PAGT]: { nome: "Pagamento", funcao: "Registro de pagamentos realizados" },
  [SubgrupoFINA.REEM]: { nome: "Reembolso", funcao: "Documentacao para reembolso" },
  [SubgrupoFINA.CIEN]: { nome: "Ciencia Financeira", funcao: "Termo de ciencia do valor" },
  [SubgrupoACOM.REVO]: { nome: "Revisao Evolutiva", funcao: "Devolutiva periodica de evolucao" },
  [SubgrupoACOM.JORN]: { nome: "Jornada", funcao: "Timeline do paciente" },
  [SubgrupoACOM.META]: { nome: "Metas", funcao: "Objetivos terapeuticos e progresso" },
  [SubgrupoACOM.ALER]: { nome: "Alertas", funcao: "Alertas clinicos e orientacoes" },
  [Subgrupo4100.S4101]: { nome: "Patologias", funcao: "Doencas diagnosticadas e potenciais" },
  [Subgrupo4100.S4102]: { nome: "Risco", funcao: "Fatores de risco e prevencao" },
  [Subgrupo4100.S4103]: { nome: "Medicacoes", funcao: "Farmacoterapia e integrativa" },
  [Subgrupo4100.S4104]: { nome: "Substituicoes", funcao: "Transicao e desmame terapeutico" },
};

export type PastaDestino =
  | "CADASTRO" | "PATOLOGIAS" | "EXAMES" | "RECEITAS"
  | "PROTOCOLOS" | "FINANCEIRO" | "CONTRATOS" | "ATESTADOS"
  | "LAUDOS" | "TERMOS" | "JURIDICO" | "SEGUIMENTO";

export const EVENTO_PIPELINE: Record<EventoRAS, { blocos: BlocoRAS[]; subgrupos: string[]; pastas: PastaDestino[]; descricao: string }> = {
  [EventoRAS.START]: {
    blocos: [BlocoRAS.CLIN, BlocoRAS.JURI, BlocoRAS.FINA],
    subgrupos: [SubgrupoCLIN.BASE, SubgrupoCLIN.SESS, SubgrupoJURI.BASE, SubgrupoJURI.CONS, SubgrupoFINA.ORCA, SubgrupoFINA.CIEN],
    pastas: ["PROTOCOLOS", "JURIDICO", "FINANCEIRO"],
    descricao: "Inicio de tratamento: gerar CLIN + JURI + FINA",
  },
  [EventoRAS.POS_PROCEDIMENTO]: {
    blocos: [BlocoRAS.CLIN, BlocoRAS.ACOM],
    subgrupos: [SubgrupoCLIN.POSP, SubgrupoACOM.ALER],
    pastas: ["SEGUIMENTO"],
    descricao: "Pos-procedimento: orientacoes e alertas",
  },
  [EventoRAS.CONSULTA_MENSAL]: {
    blocos: [BlocoRAS.ACOM],
    subgrupos: [SubgrupoACOM.REVO, SubgrupoACOM.JORN, SubgrupoACOM.META],
    pastas: ["SEGUIMENTO"],
    descricao: "Consulta mensal: revisao evolutiva, jornada e metas",
  },
  [EventoRAS.REVISAO_SEMESTRAL]: {
    blocos: [BlocoRAS.P4100],
    subgrupos: [Subgrupo4100.S4101, Subgrupo4100.S4102, Subgrupo4100.S4103, Subgrupo4100.S4104],
    pastas: ["PATOLOGIAS"],
    descricao: "Revisao semestral: patologias, risco, medicacoes, substituicoes",
  },
  [EventoRAS.SOLICITACAO_JURIDICA]: {
    blocos: [BlocoRAS.JURI],
    subgrupos: [SubgrupoJURI.BASE, SubgrupoJURI.CONS, SubgrupoJURI.IMAG, SubgrupoJURI.DIGI],
    pastas: ["JURIDICO", "TERMOS", "CONTRATOS"],
    descricao: "Solicitacao juridica: todos os subgrupos JURI",
  },
  [EventoRAS.SOLICITACAO_FINANCEIRA]: {
    blocos: [BlocoRAS.FINA],
    subgrupos: [SubgrupoFINA.ORCA, SubgrupoFINA.PAGT, SubgrupoFINA.REEM, SubgrupoFINA.CIEN],
    pastas: ["FINANCEIRO"],
    descricao: "Solicitacao financeira: bloco FINA completo",
  },
  [EventoRAS.FECHAMENTO_LAUDO]: {
    blocos: [BlocoRAS.CLIN, BlocoRAS.JURI, BlocoRAS.FINA, BlocoRAS.ACOM, BlocoRAS.P4100],
    subgrupos: [
      SubgrupoCLIN.BASE, SubgrupoCLIN.SESS, SubgrupoCLIN.EVOL,
      SubgrupoJURI.BASE, SubgrupoJURI.CONS,
      SubgrupoFINA.CIEN,
      SubgrupoACOM.REVO, SubgrupoACOM.META,
      Subgrupo4100.S4101, Subgrupo4100.S4102, Subgrupo4100.S4103, Subgrupo4100.S4104,
    ],
    pastas: ["LAUDOS"],
    descricao: "Fechamento de laudo: consolidado completo do caso",
  },
};

export const BLOCO_SUBGRUPOS: Record<BlocoRAS, string[]> = {
  [BlocoRAS.CLIN]: Object.values(SubgrupoCLIN),
  [BlocoRAS.JURI]: Object.values(SubgrupoJURI),
  [BlocoRAS.FINA]: Object.values(SubgrupoFINA),
  [BlocoRAS.ACOM]: Object.values(SubgrupoACOM),
  [BlocoRAS.P4100]: Object.values(Subgrupo4100),
};

export const BLOCO_PASTA_PRINCIPAL: Record<BlocoRAS, PastaDestino> = {
  [BlocoRAS.CLIN]: "PROTOCOLOS",
  [BlocoRAS.JURI]: "JURIDICO",
  [BlocoRAS.FINA]: "FINANCEIRO",
  [BlocoRAS.ACOM]: "SEGUIMENTO",
  [BlocoRAS.P4100]: "PATOLOGIAS",
};

export const CLASSE_CONSENTIMENTO: Record<ClasseProcedimento, ConsentimentoEspecifico> = {
  [ClasseProcedimento.FORM]: ConsentimentoEspecifico.CFOR,
  [ClasseProcedimento.INJM]: ConsentimentoEspecifico.CIMU,
  [ClasseProcedimento.INJV]: ConsentimentoEspecifico.CEND,
  [ClasseProcedimento.IMPL]: ConsentimentoEspecifico.CIMP,
  [ClasseProcedimento.ESTI]: ConsentimentoEspecifico.CEIN,
  [ClasseProcedimento.ESTT]: ConsentimentoEspecifico.CETE,
};

export interface PayloadRAS {
  patientId: number;
  nomePaciente: string;
  cpf?: string;
  idade?: number;
  protocoloId?: string;
  bloco: BlocoRAS;
  subgrupos: string[];
  classeProcedimento?: ClasseProcedimento;
  consentimentoEspecifico?: ConsentimentoEspecifico;
  medicamentos: { nome: string; apresentacao?: string; posologia?: string; dataInicio?: string; evento?: string; substituicao?: string }[];
  patologias: { nome: string; tipo: string; cid?: string }[];
  orgaos?: { nome: string; status: string }[];
  curvas?: { tipo: string; data: string; valor: number }[];
  proximasEtapas?: { descricao: string; data?: string }[];
  profissionalResponsavel: string;
  crmProfissional?: string;
  cargoProfissional?: string;
  executorTecnico?: string;
  registroExecutor?: string;
  unidade: string;
  nick: string;
  endereco?: string;
  dataGeracao: string;
  versao: string;
  evento: EventoRAS;
  financeiro?: {
    orcamento?: { item: string; valor: number }[];
    totalOrcamento?: number;
    pagamentos?: { data: string; valor: number; forma: string }[];
    totalPago?: number;
    saldo?: number;
  };
}

export interface LogRAS {
  id?: number;
  pacienteId: number;
  evento: EventoRAS;
  bloco: BlocoRAS;
  subgrupos: string[];
  classeProcedimento?: ClasseProcedimento;
  arquivo: string;
  pasta: PastaDestino;
  hash: string;
  versao: string;
  status: "gerado" | "enviado" | "erro";
  tamanhoBytes: number;
  criadoEm: string;
  metadados?: Record<string, any>;
}

export function resolverEvento(evento: string): EventoRAS {
  const upper = evento.toUpperCase();
  if (Object.values(EventoRAS).includes(upper as EventoRAS)) {
    return upper as EventoRAS;
  }
  return EventoRAS.START;
}

export function resolverClasseProcedimento(classe?: string): ClasseProcedimento | undefined {
  if (!classe) return undefined;
  const upper = classe.toUpperCase();
  if (Object.values(ClasseProcedimento).includes(upper as ClasseProcedimento)) {
    return upper as ClasseProcedimento;
  }
  return undefined;
}

export function resolverBloco(bloco: string): BlocoRAS {
  const upper = bloco.toUpperCase();
  if (upper === "4100" || upper === "P4100") return BlocoRAS.P4100;
  if (Object.values(BlocoRAS).includes(upper as BlocoRAS)) {
    return upper as BlocoRAS;
  }
  return BlocoRAS.CLIN;
}

export function resolverSubgrupos(bloco: BlocoRAS, evento?: EventoRAS): string[] {
  if (evento && EVENTO_PIPELINE[evento]) {
    const pipeline = EVENTO_PIPELINE[evento];
    return pipeline.subgrupos.filter(sg => sg.startsWith(bloco) || (bloco === BlocoRAS.P4100 && sg.startsWith("41")));
  }
  return BLOCO_SUBGRUPOS[bloco] || [];
}

export function resolverConsentimento(classe?: ClasseProcedimento): ConsentimentoEspecifico | undefined {
  if (!classe) return undefined;
  return CLASSE_CONSENTIMENTO[classe];
}

export function resolverPastaDestino(bloco: BlocoRAS, evento?: EventoRAS): PastaDestino {
  if (evento && EVENTO_PIPELINE[evento]) {
    return EVENTO_PIPELINE[evento].pastas[0];
  }
  return BLOCO_PASTA_PRINCIPAL[bloco];
}

export function resolverPastasDestino(evento: EventoRAS): PastaDestino[] {
  return EVENTO_PIPELINE[evento]?.pastas || ["LAUDOS"];
}

export function gerarNomeArquivoRAS(payload: PayloadRAS): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${yy}.${mm}.${dd}`;

  const blocoLabel = BLOCO_LABELS[payload.bloco]?.nome.replace("RAS ", "") || payload.bloco;
  const nomePaciente = payload.nomePaciente.split(" ")[0].toUpperCase();
  const codigos = payload.subgrupos.join(" ");

  return `${datePrefix} RAS ${blocoLabel.toUpperCase()} "${nomePaciente}" (${codigos})`;
}

export function gerarHashDocumental(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex").substring(0, 16);
}

export function montarPayloadRAS(params: {
  pacienteId: number;
  nomePaciente: string;
  cpf?: string;
  idade?: number;
  evento: EventoRAS;
  bloco: BlocoRAS;
  classeProcedimento?: ClasseProcedimento;
  medicamentos?: any[];
  patologias?: any[];
  orgaos?: any[];
  curvas?: any[];
  proximasEtapas?: any[];
  profissionalResponsavel: string;
  crmProfissional?: string;
  nick: string;
  unidade: string;
  endereco?: string;
  protocoloId?: string;
  financeiro?: PayloadRAS["financeiro"];
}): PayloadRAS {
  const subgrupos = resolverSubgrupos(params.bloco, params.evento);
  const consentimento = params.classeProcedimento
    ? resolverConsentimento(params.classeProcedimento)
    : undefined;

  return {
    patientId: params.pacienteId,
    nomePaciente: params.nomePaciente,
    cpf: params.cpf,
    idade: params.idade,
    protocoloId: params.protocoloId,
    bloco: params.bloco,
    subgrupos,
    classeProcedimento: params.classeProcedimento,
    consentimentoEspecifico: consentimento,
    medicamentos: (params.medicamentos || []).map(m => ({
      nome: m.medicamentoDoseInline || m.nome || m,
      apresentacao: m.apresentacao,
      posologia: m.posologia,
      dataInicio: m.dataInicio,
      evento: m.evento,
      substituicao: m.substituicao,
    })),
    patologias: (params.patologias || []).map(p => ({
      nome: p.nome || p,
      tipo: p.tipo || "diagnosticada",
      cid: p.cid,
    })),
    orgaos: params.orgaos,
    curvas: params.curvas,
    proximasEtapas: params.proximasEtapas,
    profissionalResponsavel: params.profissionalResponsavel,
    crmProfissional: params.crmProfissional,
    unidade: params.unidade,
    nick: params.nick,
    endereco: params.endereco,
    dataGeracao: new Date().toISOString(),
    versao: "RASX-MATRIZ V6",
    evento: params.evento,
    financeiro: params.financeiro,
  };
}

export function buildLogRAS(params: {
  pacienteId: number;
  evento: EventoRAS;
  bloco: BlocoRAS;
  subgrupos: string[];
  classeProcedimento?: ClasseProcedimento;
  arquivo: string;
  pasta: PastaDestino;
  buffer: Buffer;
}): LogRAS {
  return {
    pacienteId: params.pacienteId,
    evento: params.evento,
    bloco: params.bloco,
    subgrupos: params.subgrupos,
    classeProcedimento: params.classeProcedimento,
    arquivo: params.arquivo,
    pasta: params.pasta,
    hash: gerarHashDocumental(params.buffer),
    versao: "RASX-MATRIZ V6",
    status: "gerado",
    tamanhoBytes: params.buffer.length,
    criadoEm: new Date().toISOString(),
  };
}

export function resolverBlocosDoEvento(evento: EventoRAS): BlocoRAS[] {
  return EVENTO_PIPELINE[evento]?.blocos || [BlocoRAS.CLIN];
}

export function getArquiteturaCompleta() {
  return {
    versao: "RASX-MATRIZ V6",
    blocos: Object.entries(BLOCO_LABELS).map(([bloco, info]) => ({
      bloco,
      ...info,
      subgrupos: BLOCO_SUBGRUPOS[bloco as BlocoRAS].map(sg => ({
        codigo: sg,
        ...SUBGRUPO_LABELS[sg],
      })),
      pastaPrincipal: BLOCO_PASTA_PRINCIPAL[bloco as BlocoRAS],
    })),
    classesProcedimento: Object.entries(CLASSE_LABELS).map(([classe, info]) => ({
      classe,
      ...info,
      consentimento: info.consentimento,
    })),
    eventos: Object.entries(EVENTO_PIPELINE).map(([evento, pipeline]) => ({
      evento,
      ...pipeline,
    })),
    nomenclatura: 'YY.MM.DD RAS [BLOCO] "PACIENTE" ([CODIGOS])',
    totalBlocos: Object.keys(BlocoRAS).length,
    totalSubgrupos: Object.keys(SUBGRUPO_LABELS).length,
    totalClasses: Object.keys(ClasseProcedimento).length,
    totalEventos: Object.keys(EventoRAS).length,
    totalConsentimentos: Object.keys(ConsentimentoEspecifico).length,
  };
}
