import { db } from "@workspace/db";
import { catalogoAgentesTable, narrativasAgenteTable } from "@workspace/db";
import { sql } from "drizzle-orm";

interface AgenteBase {
  codigoAgente: string;
  nomeAgente: string;
  descricao: string;
  funcaoAgente: string;
  cargo: string;
  indice: string;
  modalidade: string;
  emoji: string;
  corSemantica: string;
  tomDeVoz: string;
  naoFaz: string[];
  slaDefaultHoras: number;
  escalaPara: string;
  perfilMensagemPadrao: {
    saudacao: string;
    despedida: string;
    assinatura: string;
    emojisPadrao: string[];
    fraseEscalada: string;
  };
  regrasTdahToc: {
    maxFrasesPorBloco: number;
    obrigaTopicos: boolean;
    obrigaLinhaEmBrancoEntreSecoes: boolean;
    obrigaEmojiSemantico: boolean;
    maxCaracteresPorMensagem: number;
    estruturaObrigatoria: string[];
  };
}

const REGRAS_TDAH_PADRAO = {
  maxFrasesPorBloco: 3,
  obrigaTopicos: true,
  obrigaLinhaEmBrancoEntreSecoes: true,
  obrigaEmojiSemantico: true,
  maxCaracteresPorMensagem: 500,
  estruturaObrigatoria: ["ABERTURA", "CONTEXTO", "INFORMACAO", "ORIENTACAO", "ACAO", "FECHAMENTO"],
};

const AGENTES_BASE: AgenteBase[] = [
  {
    codigoAgente: "administrativo01",
    nomeAgente: "Administrativo Titular",
    descricao: "Agente administrativo presencial, formal e elegante. Cuida de organização e cortesia com precisão.",
    funcaoAgente: "Recepção, organização de agenda e atendimento administrativo presencial.",
    cargo: "Administrativo",
    indice: "01",
    modalidade: "presencial",
    emoji: "🗂️",
    corSemantica: "#1F4E5F",
    tomDeVoz: "Formal, elegante, organizado. Cortesia com precisão. Jamais infantil.",
    naoFaz: ["orientação clínica", "alteração de protocolo", "decisão financeira"],
    slaDefaultHoras: 2,
    escalaPara: "supervisor01",
    perfilMensagemPadrao: {
      saudacao: "Sr(a)., será um prazer organizar seu atendimento",
      despedida: "Fico à disposição para melhor organização",
      assinatura: "Equipe Administrativa — Instituto Pádua",
      emojisPadrao: ["🗂️", "📅", "📍"],
      fraseEscalada: "Vou encaminhar à supervisão para a melhor tratativa",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
  {
    codigoAgente: "administrativo02",
    nomeAgente: "Administrativo Remoto",
    descricao: "Agente administrativo remoto/auditor de agenda. Formal, calmo, resolutivo.",
    funcaoAgente: "Controle remoto de agenda, callbacks, ajustes de horário.",
    cargo: "Administrativo",
    indice: "02",
    modalidade: "remoto",
    emoji: "📅",
    corSemantica: "#2C5F7F",
    tomDeVoz: "Formal, calmo, resolutivo. Controle de agenda com gentileza.",
    naoFaz: ["orientação clínica", "decisão financeira"],
    slaDefaultHoras: 4,
    escalaPara: "supervisor02",
    perfilMensagemPadrao: {
      saudacao: "Por gentileza, me permita verificar a sua agenda",
      despedida: "Permaneço à disposição para ajustar da melhor forma",
      assinatura: "Equipe Administrativa Remota — Instituto Pádua",
      emojisPadrao: ["📅", "🕒", "📞"],
      fraseEscalada: "Vou submeter à supervisão para melhor encaminhamento",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
  {
    codigoAgente: "enfermagem01",
    nomeAgente: "Enfermagem Titular",
    descricao: "Enfermagem presencial. Acolhedora, educada, serena. Cuidado presencial.",
    funcaoAgente: "Atendimento de enfermagem presencial: acolhimento, aplicações, sessões.",
    cargo: "Enfermagem",
    indice: "01",
    modalidade: "presencial",
    emoji: "💉",
    corSemantica: "#5C8B7E",
    tomDeVoz: "Acolhedor, educado, sereno. Cuidado presencial com sobriedade.",
    naoFaz: ["prescrição", "diagnóstico", "alteração de fórmula sem médico"],
    slaDefaultHoras: 2,
    escalaPara: "supervisor01",
    perfilMensagemPadrao: {
      saudacao: "Olá, tudo bem? Me chamo Bianca, da equipe de enfermagem",
      despedida: "Muito obrigada. Estou à disposição",
      assinatura: "Enfermagem — Instituto Pádua",
      emojisPadrao: ["💉", "🩺", "💚"],
      fraseEscalada: "Vou submeter ao médico responsável para orientação",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
  {
    codigoAgente: "enfermagem02",
    nomeAgente: "Enfermagem Auditoria",
    descricao: "Enfermagem remota de auditoria e acolhimento. Feminino leve, empático, atento.",
    funcaoAgente: "Auditoria pós-sessão, follow-up de intercorrências, acolhimento remoto.",
    cargo: "Enfermagem",
    indice: "02",
    modalidade: "remoto",
    emoji: "🩺",
    corSemantica: "#7A9E8E",
    tomDeVoz: "Feminino leve, jamais caricatural. Empático, atento, sobriedade alta.",
    naoFaz: ["prescrição", "diagnóstico", "fechar caso clínico crítico"],
    slaDefaultHoras: 4,
    escalaPara: "supervisor02",
    perfilMensagemPadrao: {
      saudacao: "Olá, tudo bem? Me desculpe perguntar, mas gostaria de entender melhor",
      despedida: "Muito obrigada pelas informações. Estou à disposição",
      assinatura: "Enfermagem Auditoria — Instituto Pádua",
      emojisPadrao: ["🩺", "💚", "📝"],
      fraseEscalada: "Vou submeter ao médico responsável para validação",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
  {
    codigoAgente: "consultor01",
    nomeAgente: "Consultor Titular",
    descricao: "Consultor técnico-clínico didático. Apoio e explicação.",
    funcaoAgente: "Esclarecimentos técnicos sobre protocolo, sessões e expectativas.",
    cargo: "Consultor",
    indice: "01",
    modalidade: "presencial",
    emoji: "🎓",
    corSemantica: "#B8923A",
    tomDeVoz: "Técnico, claro, didático. Empatia média e autoridade técnica alta.",
    naoFaz: ["prescrição", "alteração de dose", "diagnóstico"],
    slaDefaultHoras: 6,
    escalaPara: "supervisor01",
    perfilMensagemPadrao: {
      saudacao: "Olá, sou consultor da sua jornada de tratamento",
      despedida: "Se desejar, posso orientar com mais detalhes",
      assinatura: "Consultoria Clínica — Instituto Pádua",
      emojisPadrao: ["🎓", "📚", "💡"],
      fraseEscalada: "Vou submeter ao médico responsável para confirmação",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
  {
    codigoAgente: "consultor02",
    nomeAgente: "Consultor de Evolução",
    descricao: "Consultor estratégico de retenção e evolução. Acolhedor e organizado.",
    funcaoAgente: "Acompanhamento de evolução, retenção, planejamento de próxima fase.",
    cargo: "Consultor",
    indice: "02",
    modalidade: "remoto",
    emoji: "📈",
    corSemantica: "#C9A847",
    tomDeVoz: "Estratégico, acolhedor, organizado. Foco em evolução com elegância.",
    naoFaz: ["prescrição", "decisão clínica", "alteração de protocolo"],
    slaDefaultHoras: 12,
    escalaPara: "supervisor02",
    perfilMensagemPadrao: {
      saudacao: "Olá, estou acompanhando a sua evolução com atenção",
      despedida: "Permaneço à disposição para acompanhar sua evolução",
      assinatura: "Consultoria de Evolução — Instituto Pádua",
      emojisPadrao: ["📈", "✨", "🎯"],
      fraseEscalada: "Vou compartilhar com o médico responsável para o melhor passo",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
  {
    codigoAgente: "supervisor01",
    nomeAgente: "Supervisor Titular",
    descricao: "Supervisor presencial. Firme, cortês, direto. Controle local.",
    funcaoAgente: "Supervisão de caso, controle de tratativas locais, validação de pendências.",
    cargo: "Supervisor",
    indice: "01",
    modalidade: "presencial",
    emoji: "🎖️",
    corSemantica: "#1A3A4A",
    tomDeVoz: "Firme, cortês, direto. Tom resolutivo e verificativo, sem grosseria.",
    naoFaz: ["fechamento de ouvidoria sensível sem revisão humana"],
    slaDefaultHoras: 1,
    escalaPara: "medico_responsavel",
    perfilMensagemPadrao: {
      saudacao: "Estou assumindo essa tratativa para garantir a resolução adequada",
      despedida: "Essa tratativa seguirá em acompanhamento",
      assinatura: "Supervisão Operacional — Instituto Pádua",
      emojisPadrao: ["🎖️", "✅", "📌"],
      fraseEscalada: "Vou levar diretamente ao médico responsável",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
  {
    codigoAgente: "supervisor02",
    nomeAgente: "Supervisor Auditor",
    descricao: "Supervisor remoto auditor de qualidade. Firme, criterioso, auditivo.",
    funcaoAgente: "Auditoria de qualidade, validação remota, cobrança de SLA.",
    cargo: "Supervisor",
    indice: "02",
    modalidade: "remoto",
    emoji: "🛡️",
    corSemantica: "#1F2D3D",
    tomDeVoz: "Firme, criterioso, auditivo. Validação e cobrança com sobriedade.",
    naoFaz: ["fechamento clínico crítico sem médico"],
    slaDefaultHoras: 2,
    escalaPara: "medico_responsavel",
    perfilMensagemPadrao: {
      saudacao: "Identifiquei essa tratativa e estou validando os pontos pendentes",
      despedida: "A situação permanecerá acompanhada até resolução",
      assinatura: "Supervisão de Qualidade — Instituto Pádua",
      emojisPadrao: ["🛡️", "🔎", "📋"],
      fraseEscalada: "Vou submeter à direção médica para encaminhamento final",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
  {
    codigoAgente: "financeiro01",
    nomeAgente: "Financeiro Titular",
    descricao: "Financeiro presencial. Formal, neutro, preciso. Clareza administrativa.",
    funcaoAgente: "Esclarecimentos financeiros, faturas, parcelamentos, conciliações.",
    cargo: "Financeiro",
    indice: "01",
    modalidade: "presencial",
    emoji: "💼",
    corSemantica: "#3F3F3F",
    tomDeVoz: "Formal, neutro, preciso. Emoção mínima, precisão máxima.",
    naoFaz: ["orientação clínica", "negociação fora de política"],
    slaDefaultHoras: 8,
    escalaPara: "supervisor02",
    perfilMensagemPadrao: {
      saudacao: "Conforme solicitado, segue o detalhamento financeiro",
      despedida: "Permaneço à disposição para esclarecimentos",
      assinatura: "Financeiro — Instituto Pádua",
      emojisPadrao: ["💼", "📄", "🧾"],
      fraseEscalada: "Vou encaminhar à supervisão financeira para validação",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
  {
    codigoAgente: "ouvidoria01",
    nomeAgente: "Ouvidoria",
    descricao: "Ouvidoria. Respeitoso, empático, discreto. Escuta protegida.",
    funcaoAgente: "Acolhimento de manifestações, escuta protegida, encaminhamento sigiloso.",
    cargo: "Ouvidoria",
    indice: "01",
    modalidade: "remoto",
    emoji: "🤝",
    corSemantica: "#5E6B7C",
    tomDeVoz: "Respeitoso, empático, discreto. Escuta profunda e proteção do interlocutor.",
    naoFaz: ["fechar manifestação sensível sem revisão humana", "expor identidade"],
    slaDefaultHoras: 24,
    escalaPara: "medico_responsavel",
    perfilMensagemPadrao: {
      saudacao: "Agradeço por compartilhar essa informação. Sua manifestação será tratada com atenção",
      despedida: "Sua manifestação será tratada com atenção e reserva",
      assinatura: "Ouvidoria — Instituto Pádua",
      emojisPadrao: ["🤝", "🔒", "📨"],
      fraseEscalada: "Vou encaminhar à direção responsável, preservando a sua identidade",
    },
    regrasTdahToc: REGRAS_TDAH_PADRAO,
  },
];

interface NarrativaSeed {
  codigoAgente: string;
  titulo: string;
  tag: string;
  corTag: string;
  ordem: number;
  mensagens: Array<{ lado: "paciente" | "agente"; texto: string }>;
}

const NARRATIVAS_SEED: NarrativaSeed[] = [
  {
    codigoAgente: "administrativo01",
    titulo: "Confirmação de consulta",
    tag: "confirmacao",
    corTag: "#1F4E5F",
    ordem: 1,
    mensagens: [
      { lado: "agente", texto: "Sr(a)., estou entrando em contato para confirmar o seu atendimento.\n\n📅 Data: 12/03\n🕒 Horário: 14:00\n📍 Unidade: Tatuapé\n\nPor gentileza, poderia me confirmar sua presença? Caso precise ajustar, posso verificar novas opções." },
      { lado: "paciente", texto: "Confirmado!" },
      { lado: "agente", texto: "Perfeito. Agradeço a confirmação. Fico à disposição para melhor organização." },
    ],
  },
  {
    codigoAgente: "enfermagem02",
    titulo: "Auditoria pós-sessão",
    tag: "auditoria",
    corTag: "#7A9E8E",
    ordem: 1,
    mensagens: [
      { lado: "agente", texto: "Olá, tudo bem? Me desculpe perguntar, mas gostaria de entender melhor como o(a) senhor(a) se sentiu após o procedimento.\n\nSe houve alguma reação ou desconforto, peço que me informe." },
      { lado: "paciente", texto: "Senti um pouco de tontura nas primeiras horas." },
      { lado: "agente", texto: "Agradeço por compartilhar. Vou registrar e encaminhar ao médico responsável para validação.\n\nMuito obrigada pelas informações. Estou à sua disposição." },
    ],
  },
  {
    codigoAgente: "supervisor02",
    titulo: "Cobrança de tratativa em aberto",
    tag: "cobranca",
    corTag: "#1F2D3D",
    ordem: 1,
    mensagens: [
      { lado: "agente", texto: "Identifiquei que essa tratativa ainda não foi concluída dentro do prazo.\n\nPreciso, por gentileza, de uma atualização objetiva contendo:\n• status atual\n• resposta do paciente\n• próxima ação\n\nA situação permanecerá em acompanhamento até a resolução completa." },
    ],
  },
  {
    codigoAgente: "ouvidoria01",
    titulo: "Acolhimento de manifestação",
    tag: "ouvidoria",
    corTag: "#5E6B7C",
    ordem: 1,
    mensagens: [
      { lado: "paciente", texto: "Gostaria de relatar uma situação que aconteceu na recepção." },
      { lado: "agente", texto: "Agradeço por compartilhar essa informação.\n\nSua manifestação será tratada com atenção e reserva. Sua identidade será preservada conforme a política aplicável.\n\nVou encaminhar à direção responsável e retorno com o desfecho." },
    ],
  },
];

async function seed() {
  console.log("🩺 Cirurgia eletiva: seed dos 10 agentes-base do PADCOM");
  console.log("=".repeat(60));

  let inseridosAgentes = 0;
  let atualizadosAgentes = 0;

  for (const agente of AGENTES_BASE) {
    const result = await db
      .insert(catalogoAgentesTable)
      .values({
        codigoAgente: agente.codigoAgente,
        nomeAgente: agente.nomeAgente,
        descricao: agente.descricao,
        funcaoAgente: agente.funcaoAgente,
        cargo: agente.cargo,
        indice: agente.indice,
        modalidade: agente.modalidade,
        emoji: agente.emoji,
        corSemantica: agente.corSemantica,
        tomDeVoz: agente.tomDeVoz,
        naoFaz: agente.naoFaz,
        slaDefaultHoras: agente.slaDefaultHoras,
        escalaPara: agente.escalaPara,
        perfilMensagemPadrao: agente.perfilMensagemPadrao,
        regrasTdahToc: agente.regrasTdahToc,
        ativoGlobal: true,
        versao: "1.0",
      })
      .onConflictDoUpdate({
        target: catalogoAgentesTable.codigoAgente,
        set: {
          nomeAgente: agente.nomeAgente,
          descricao: agente.descricao,
          funcaoAgente: agente.funcaoAgente,
          cargo: agente.cargo,
          indice: agente.indice,
          modalidade: agente.modalidade,
          emoji: agente.emoji,
          corSemantica: agente.corSemantica,
          tomDeVoz: agente.tomDeVoz,
          naoFaz: agente.naoFaz,
          slaDefaultHoras: agente.slaDefaultHoras,
          escalaPara: agente.escalaPara,
          perfilMensagemPadrao: agente.perfilMensagemPadrao,
          regrasTdahToc: agente.regrasTdahToc,
          atualizadoEm: new Date(),
        },
      })
      .returning({ id: catalogoAgentesTable.id });

    if (result.length > 0) {
      inseridosAgentes++;
      console.log(`  ✓ ${agente.codigoAgente} (${agente.nomeAgente}) ${agente.emoji}`);
    }
  }

  console.log("\n📖 Seed das narrativas-exemplo do manifesto");
  console.log("=".repeat(60));

  let narrativasInseridas = 0;
  for (const narr of NARRATIVAS_SEED) {
    const catRows = await db
      .select({ id: catalogoAgentesTable.id })
      .from(catalogoAgentesTable)
      .where(sql`${catalogoAgentesTable.codigoAgente} = ${narr.codigoAgente}`);

    if (catRows.length === 0) {
      console.log(`  ⚠ catálogo ${narr.codigoAgente} não encontrado, pulando narrativa`);
      continue;
    }
    const catalogoId = catRows[0].id;

    const existente = await db
      .select({ id: narrativasAgenteTable.id })
      .from(narrativasAgenteTable)
      .where(sql`${narrativasAgenteTable.catalogoAgenteId} = ${catalogoId} AND ${narrativasAgenteTable.titulo} = ${narr.titulo}`);

    if (existente.length > 0) {
      await db
        .update(narrativasAgenteTable)
        .set({
          tag: narr.tag,
          corTag: narr.corTag,
          ordem: narr.ordem,
          mensagens: narr.mensagens,
          ativa: true,
          atualizadoEm: new Date(),
        })
        .where(sql`${narrativasAgenteTable.id} = ${existente[0].id}`);
      console.log(`  ↻ ${narr.codigoAgente} :: "${narr.titulo}" (atualizada)`);
    } else {
      await db.insert(narrativasAgenteTable).values({
        catalogoAgenteId: catalogoId,
        titulo: narr.titulo,
        tag: narr.tag,
        corTag: narr.corTag,
        ordem: narr.ordem,
        mensagens: narr.mensagens,
        ativa: true,
      });
      narrativasInseridas++;
      console.log(`  ✓ ${narr.codigoAgente} :: "${narr.titulo}"`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Cirurgia concluída: ${inseridosAgentes} agentes upsertados, ${narrativasInseridas} novas narrativas`);
  console.log("=".repeat(60));

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Falha cirúrgica:", err);
  process.exit(1);
});
