import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  teamPositionsTable,
  teamMembersTable,
  taskAttemptsTable,
  taskValidationsTable,
  commissionEventsTable,
  disciplinaryEventsTable,
  agentActionsTable,
  slaMonitoringTable,
  unidadesTable,
} from "@workspace/db";
import { eq, desc, and, sql, count, sum, avg } from "drizzle-orm";

const router = Router();

router.get("/positions", async (req: Request, res: Response) => {
  try {
    const { unidadeId } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(teamPositionsTable.unidadeId, Number(unidadeId)));

    const positions = await db
      .select({
        id: teamPositionsTable.id,
        unidadeId: teamPositionsTable.unidadeId,
        unidadeNome: unidadesTable.nome,
        cargo: teamPositionsTable.cargo,
        indice: teamPositionsTable.indice,
        codigoCompleto: teamPositionsTable.codigoCompleto,
        modalidade: teamPositionsTable.modalidade,
        slaDefault: teamPositionsTable.slaDefault,
        reportaA: teamPositionsTable.reportaA,
        quandoReporta: teamPositionsTable.quandoReporta,
        descricaoFuncao: teamPositionsTable.descricaoFuncao,
        objetivos: teamPositionsTable.objetivos,
        metasPrincipais: teamPositionsTable.metasPrincipais,
        direitos: teamPositionsTable.direitos,
        deveres: teamPositionsTable.deveres,
        advertenciaTriggers: teamPositionsTable.advertenciaTriggers,
        demissaoTriggers: teamPositionsTable.demissaoTriggers,
        justaCausaTriggers: teamPositionsTable.justaCausaTriggers,
        permissoes: teamPositionsTable.permissoes,
        podeSupervisionarOutros: teamPositionsTable.podeSupervisionarOutros,
        podeAuditarCards: teamPositionsTable.podeAuditarCards,
        podeAprovarDespesas: teamPositionsTable.podeAprovarDespesas,
        podeEditarProtocolos: teamPositionsTable.podeEditarProtocolos,
        podeAcessarFinanceiro: teamPositionsTable.podeAcessarFinanceiro,
        podeVerOuvidoria: teamPositionsTable.podeVerOuvidoria,
        ativa: teamPositionsTable.ativa,
      })
      .from(teamPositionsTable)
      .leftJoin(unidadesTable, eq(teamPositionsTable.unidadeId, unidadesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(teamPositionsTable.cargo, teamPositionsTable.indice);

    res.json(positions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/members", async (req: Request, res: Response) => {
  try {
    const { unidadeId, posicaoId } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(teamMembersTable.unidadeId, Number(unidadeId)));
    if (posicaoId) conditions.push(eq(teamMembersTable.posicaoId, Number(posicaoId)));

    const members = await db
      .select({
        id: teamMembersTable.id,
        posicaoId: teamMembersTable.posicaoId,
        cargo: teamPositionsTable.cargo,
        indice: teamPositionsTable.indice,
        codigoCompleto: teamPositionsTable.codigoCompleto,
        modalidade: teamPositionsTable.modalidade,
        unidadeId: teamMembersTable.unidadeId,
        unidadeNome: unidadesTable.nome,
        nomeCompleto: teamMembersTable.nomeCompleto,
        emailFuncional: teamMembersTable.emailFuncional,
        telefone: teamMembersTable.telefone,
        dataAdmissao: teamMembersTable.dataAdmissao,
        statusAtivo: teamMembersTable.statusAtivo,
        slaDefault: teamPositionsTable.slaDefault,
        reportaA: teamPositionsTable.reportaA,
        quandoReporta: teamPositionsTable.quandoReporta,
        descricaoFuncao: teamPositionsTable.descricaoFuncao,
        objetivos: teamPositionsTable.objetivos,
        metasPrincipais: teamPositionsTable.metasPrincipais,
        direitos: teamPositionsTable.direitos,
        deveres: teamPositionsTable.deveres,
        advertenciaTriggers: teamPositionsTable.advertenciaTriggers,
        demissaoTriggers: teamPositionsTable.demissaoTriggers,
        justaCausaTriggers: teamPositionsTable.justaCausaTriggers,
      })
      .from(teamMembersTable)
      .leftJoin(teamPositionsTable, eq(teamMembersTable.posicaoId, teamPositionsTable.id))
      .leftJoin(unidadesTable, eq(teamMembersTable.unidadeId, unidadesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(teamPositionsTable.cargo, teamPositionsTable.indice);

    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/positions", async (req: Request, res: Response) => {
  try {
    const [position] = await db.insert(teamPositionsTable).values(req.body).returning();
    res.status(201).json(position);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/positions/:id", async (req: Request, res: Response) => {
  try {
    const [updated] = await db
      .update(teamPositionsTable)
      .set({ ...req.body, atualizadoEm: new Date() })
      .where(eq(teamPositionsTable.id, Number(req.params.id)))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/members", async (req: Request, res: Response) => {
  try {
    const [member] = await db.insert(teamMembersTable).values(req.body).returning();
    res.status(201).json(member);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/members/:id", async (req: Request, res: Response) => {
  try {
    const [updated] = await db
      .update(teamMembersTable)
      .set({ ...req.body, atualizadoEm: new Date() })
      .where(eq(teamMembersTable.id, Number(req.params.id)))
      .returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/commissions", async (req: Request, res: Response) => {
  try {
    const { unidadeId, membroId, periodoReferencia } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(commissionEventsTable.unidadeId, Number(unidadeId)));
    if (membroId) conditions.push(eq(commissionEventsTable.membroId, Number(membroId)));
    if (periodoReferencia) conditions.push(eq(commissionEventsTable.periodoReferencia, String(periodoReferencia)));

    const commissions = await db
      .select({
        id: commissionEventsTable.id,
        membroId: commissionEventsTable.membroId,
        membroNome: teamMembersTable.nomeCompleto,
        cargo: teamPositionsTable.cargo,
        codigoCompleto: teamPositionsTable.codigoCompleto,
        unidadeId: commissionEventsTable.unidadeId,
        categoria: commissionEventsTable.categoria,
        valorBase: commissionEventsTable.valorBase,
        multiplicador: commissionEventsTable.multiplicador,
        valorFinal: commissionEventsTable.valorFinal,
        bloqueadoPor: commissionEventsTable.bloqueadoPor,
        status: commissionEventsTable.status,
        periodoReferencia: commissionEventsTable.periodoReferencia,
        criadoEm: commissionEventsTable.criadoEm,
      })
      .from(commissionEventsTable)
      .leftJoin(teamMembersTable, eq(commissionEventsTable.membroId, teamMembersTable.id))
      .leftJoin(teamPositionsTable, eq(teamMembersTable.posicaoId, teamPositionsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(commissionEventsTable.criadoEm));

    res.json(commissions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/commissions/resumo", async (req: Request, res: Response) => {
  try {
    const { unidadeId, periodoReferencia } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(commissionEventsTable.unidadeId, Number(unidadeId)));
    if (periodoReferencia) conditions.push(eq(commissionEventsTable.periodoReferencia, String(periodoReferencia)));

    const resumo = await db
      .select({
        membroId: commissionEventsTable.membroId,
        membroNome: teamMembersTable.nomeCompleto,
        cargo: teamPositionsTable.cargo,
        codigoCompleto: teamPositionsTable.codigoCompleto,
        totalComissoes: count(commissionEventsTable.id),
        valorTotal: sum(commissionEventsTable.valorFinal),
      })
      .from(commissionEventsTable)
      .leftJoin(teamMembersTable, eq(commissionEventsTable.membroId, teamMembersTable.id))
      .leftJoin(teamPositionsTable, eq(teamMembersTable.posicaoId, teamPositionsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(commissionEventsTable.membroId, teamMembersTable.nomeCompleto, teamPositionsTable.cargo, teamPositionsTable.codigoCompleto)
      .orderBy(desc(sum(commissionEventsTable.valorFinal)));

    res.json(resumo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/disciplinary", async (req: Request, res: Response) => {
  try {
    const { unidadeId, membroId } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(disciplinaryEventsTable.unidadeId, Number(unidadeId)));
    if (membroId) conditions.push(eq(disciplinaryEventsTable.membroId, Number(membroId)));

    const events = await db
      .select({
        id: disciplinaryEventsTable.id,
        membroId: disciplinaryEventsTable.membroId,
        membroNome: teamMembersTable.nomeCompleto,
        cargo: teamPositionsTable.cargo,
        codigoCompleto: teamPositionsTable.codigoCompleto,
        nivel: disciplinaryEventsTable.nivel,
        fundamentacaoClt: disciplinaryEventsTable.fundamentacaoClt,
        motivo: disciplinaryEventsTable.motivo,
        triggers: disciplinaryEventsTable.triggers,
        validadeDias: disciplinaryEventsTable.validadeDias,
        dataExpiracao: disciplinaryEventsTable.dataExpiracao,
        status: disciplinaryEventsTable.status,
        observacoes: disciplinaryEventsTable.observacoes,
        criadoEm: disciplinaryEventsTable.criadoEm,
      })
      .from(disciplinaryEventsTable)
      .leftJoin(teamMembersTable, eq(disciplinaryEventsTable.membroId, teamMembersTable.id))
      .leftJoin(teamPositionsTable, eq(teamMembersTable.posicaoId, teamPositionsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(disciplinaryEventsTable.criadoEm));

    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/organograma", async (req: Request, res: Response) => {
  try {
    const { unidadeId } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(teamMembersTable.unidadeId, Number(unidadeId)));

    const members = await db
      .select({
        id: teamMembersTable.id,
        nomeCompleto: teamMembersTable.nomeCompleto,
        cargo: teamPositionsTable.cargo,
        indice: teamPositionsTable.indice,
        codigoCompleto: teamPositionsTable.codigoCompleto,
        modalidade: teamPositionsTable.modalidade,
        reportaA: teamPositionsTable.reportaA,
        slaDefault: teamPositionsTable.slaDefault,
        unidadeId: teamMembersTable.unidadeId,
        unidadeNome: unidadesTable.nome,
        statusAtivo: teamMembersTable.statusAtivo,
        emailFuncional: teamMembersTable.emailFuncional,
      })
      .from(teamMembersTable)
      .leftJoin(teamPositionsTable, eq(teamMembersTable.posicaoId, teamPositionsTable.id))
      .leftJoin(unidadesTable, eq(teamMembersTable.unidadeId, unidadesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(teamPositionsTable.cargo, teamPositionsTable.indice);

    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/agent-actions", async (req: Request, res: Response) => {
  try {
    const { unidadeId, agentType, status } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(agentActionsTable.unidadeId, Number(unidadeId)));
    if (agentType) conditions.push(eq(agentActionsTable.agentType, String(agentType)));
    if (status) conditions.push(eq(agentActionsTable.status, String(status)));

    const actions = await db
      .select()
      .from(agentActionsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(agentActionsTable.criadoEm))
      .limit(100);

    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/agent-actions", async (req: Request, res: Response) => {
  try {
    const [action] = await db.insert(agentActionsTable).values(req.body).returning();
    res.status(201).json(action);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/sla-monitoring", async (req: Request, res: Response) => {
  try {
    const { unidadeId, status } = req.query;
    const conditions: any[] = [];
    if (unidadeId) conditions.push(eq(slaMonitoringTable.unidadeId, Number(unidadeId)));
    if (status) conditions.push(eq(slaMonitoringTable.status, String(status)));

    const slas = await db
      .select({
        id: slaMonitoringTable.id,
        membroId: slaMonitoringTable.membroId,
        membroNome: teamMembersTable.nomeCompleto,
        cargo: teamPositionsTable.cargo,
        codigoCompleto: teamPositionsTable.codigoCompleto,
        tipoSla: slaMonitoringTable.tipoSla,
        prazoHoras: slaMonitoringTable.prazoHoras,
        inicioEm: slaMonitoringTable.inicioEm,
        venceEm: slaMonitoringTable.venceEm,
        resolvidoEm: slaMonitoringTable.resolvidoEm,
        status: slaMonitoringTable.status,
        escalonadoPara: slaMonitoringTable.escalonadoPara,
        alertaAmareloEnviado: slaMonitoringTable.alertaAmareloEnviado,
        alertaVermelhoEnviado: slaMonitoringTable.alertaVermelhoEnviado,
      })
      .from(slaMonitoringTable)
      .leftJoin(teamMembersTable, eq(slaMonitoringTable.membroId, teamMembersTable.id))
      .leftJoin(teamPositionsTable, eq(teamMembersTable.posicaoId, teamPositionsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(slaMonitoringTable.criadoEm));

    res.json(slas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/seed", async (req: Request, res: Response) => {
  try {
    const unidades = await db.select().from(unidadesTable);
    if (unidades.length === 0) {
      res.status(400).json({ error: "Nenhuma unidade cadastrada" });
      return;
    }

    const existing = await db.select().from(teamPositionsTable);
    if (existing.length > 0) {
      res.json({ mensagem: "Dados ja existem. Seed ignorado.", total: existing.length });
      return;
    }

    const CARGOS_TEMPLATE = [
      {
        cargo: "MEDICO", indice: "01", modalidade: "presencial", sla: "72h", reporta: "—",
        quandoReporta: "Sob demanda. E o topo da hierarquia clinica.",
        funcao: "Diretor clinico. Valida protocolos, homologa procedimentos, supervisiona toda a equipe medica.",
        objetivos: "Garantir qualidade clinica, aprovar protocolos, auditar casos complexos",
        metas: ["Zero protocolos sem homologacao", "Auditoria semanal de casos", "Tempo resposta escalacao < 72h"],
        direitos: ["Autonomia clinica total sobre protocolos", "Acesso irrestrito a todos os modulos do sistema", "Poder de veto em qualquer decisao operacional que afete a clinica"],
        deveres: ["Homologar todo protocolo novo antes de aplicacao", "Responder escalacoes clinicas em ate 72h", "Auditar semanalmente casos criticos"],
        advertencia: ["Protocolo liberado sem revisao formal"],
        demissao: [],
        justaCausa: ["Negligencia clinica comprovada (Art. 482-e CLT)"],
        permissoes: { supervisionar: true, auditar: true, aprovarDespesas: true, editarProtocolos: true, financeiro: true, ouvidoria: true },
      },
      {
        cargo: "MEDICO", indice: "02", modalidade: "remoto", sla: "72h", reporta: "medico01",
        quandoReporta: "Ao revisar exame alterado ou teleconsulta com intercorrencia.",
        funcao: "Medico de suporte. Atende teleconsultas, revisa exames alterados, suporte clinico remoto.",
        objetivos: "Suporte clinico remoto, revisao de exames, teleconsultas",
        metas: ["Responder exames alterados em 48h", "Teleconsultas agendadas sem atraso", "Documentar todos os pareceres"],
        direitos: ["Trabalhar remotamente com equipamento fornecido", "Acesso ao historico clinico necessario", "Nao ser acionado fora do horario contratual"],
        deveres: ["Documentar todo parecer clinico no sistema", "Responder exames alterados no prazo", "Escalar intercorrencias ao medico01 imediatamente"],
        advertencia: ["Parecer clinico sem registro no sistema", "Exame alterado nao revisado em 48h"],
        demissao: ["Teleconsulta realizada sem documentacao formal"],
        justaCausa: ["Falsificar parecer clinico (Art. 482-a CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: true, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "GERENTE", indice: "01", modalidade: "presencial", sla: "48h", reporta: "medico01",
        quandoReporta: "Relatorio semanal. Escalacao imediata quando necessario.",
        funcao: "Gerente geral da unidade. Coordena operacoes, supervisores e fluxo administrativo.",
        objetivos: "Eficiencia operacional, gestao de equipe, resolucao de conflitos",
        metas: ["Taxa resolucao equipe > 85%", "Reunioes semanais com supervisores", "Escalonamentos resolvidos em 48h"],
        direitos: ["Autoridade para contratar e desligar (com aprovacao do medico01)", "Acesso ao financeiro da unidade", "Poder de aplicar advertencia escrita"],
        deveres: ["Coordenar todos os supervisores", "Resolver conflitos operacionais em 48h", "Manter indicadores da unidade atualizados"],
        advertencia: ["Indicador critico ignorado por > 48h", "Conflito entre equipe nao mediado"],
        demissao: ["Gestao negligente resultando em perda financeira documentada"],
        justaCausa: ["Desvio financeiro (Art. 482-a CLT)", "Conivencia com infracao grave (Art. 482-b CLT)"],
        permissoes: { supervisionar: true, auditar: true, aprovarDespesas: true, editarProtocolos: false, financeiro: true, ouvidoria: true },
      },
      {
        cargo: "SUPERVISOR", indice: "01", modalidade: "presencial", sla: "24h", reporta: "gerente01",
        quandoReporta: "Relatorio diario ate 19h. Escalada imediata quando necessario.",
        funcao: "Supervisor presencial. Cobrar SLA. Auditar registros. Aplicar advertencias. Escalonar excecoes.",
        objetivos: "Garantir cumprimento de SLA, auditar qualidade, escalonar problemas",
        metas: ["Taxa de cards vencidos < 5% da semana", "Zero advertencias sem registro formal", "100% das sessoes com RAS gerado no prazo", "SLA global da unidade mantido"],
        direitos: ["Autoridade formal para aplicar advertencia verbal sem aprovacao previa", "Acesso de leitura a todos os quadros operacionais", "Treinamento de gestao de pessoas no onboarding", "Reuniao semanal com gerente01"],
        deveres: ["Registrar toda advertencia no sistema no mesmo dia", "Nunca encobrir falha de subordinado", "Cobrar justificativa para todo SLA vencido — sem excecao", "Escalar decisao clinica para medico — nunca decidir conduta"],
        advertencia: ["SLA proprio vencido sem justificativa", "Advertencia verbal aplicada sem registro no sistema", "Falha de subordinado omitida ao gerente"],
        demissao: ["Omissao sistematica de falhas de subordinados"],
        justaCausa: ["Manipular task card para esconder atraso (Art. 482-a CLT)", "Conivencia com infracao grave de subordinado (Art. 482-b CLT)"],
        permissoes: { supervisionar: true, auditar: true, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "SUPERVISOR", indice: "02", modalidade: "remoto", sla: "24h", reporta: "gerente01",
        quandoReporta: "Ao concluir auditoria de cada card fechado por indice 02.",
        funcao: "Supervisor remoto. Audita atendimentos dos indices 02 contatando diretamente o paciente. Anti-corporativismo.",
        objetivos: "Auditoria de qualidade remota, validacao pos-atendimento, contato direto com paciente",
        metas: ["Auditar 100% dos cards fechados por 02s", "Contatar paciente em 24h pos-fechamento", "Relatorio semanal de divergencias"],
        direitos: ["Trabalhar de home office", "Acesso ao historico de cards dos indices 02", "Canal direto com gerente01 para escalacoes"],
        deveres: ["Contatar paciente diretamente para validar relato do 02", "Registrar divergencias encontradas", "Nunca aceitar relato do 02 sem validacao independente"],
        advertencia: ["Card fechado por 02 sem auditoria em 24h", "Divergencia encontrada e nao registrada"],
        demissao: ["Aceitar relatos sem validacao sistematicamente"],
        justaCausa: ["Fabricar resultado de auditoria (Art. 482-a CLT)"],
        permissoes: { supervisionar: true, auditar: true, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "ADMINISTRATIVO", indice: "01", modalidade: "presencial", sla: "2h", reporta: "supervisor01",
        quandoReporta: "Ao fim de cada turno + imediatamente em caso de no-show ou lead nao respondido.",
        funcao: "Recepcao e agenda. Confirma sessoes D-1, recebe pacientes, gerencia agenda do dia.",
        objetivos: "Gestao de agenda, confirmacao de sessoes, primeiro contato com leads",
        metas: ["Confirmacao D-1 ate 18h = 100%", "Leads respondidos em 1h", "Zero no-show por falta de confirmacao"],
        direitos: ["Receber escala com 7 dias de antecedencia", "Nao ser acionada fora do turno por WhatsApp pessoal", "Treinamento de 3 dias antes de assumir recepcao solo"],
        deveres: ["Confirmar 100% das sessoes D-1 ate 18h", "Responder leads em ate 1h", "Registrar no-shows imediatamente no sistema"],
        advertencia: ["Sessao nao confirmada D-1 (>2x/semana)", "Lead nao respondido em 2h", "Uso de WhatsApp pessoal para contato operacional"],
        demissao: ["No-show recorrente por falta de confirmacao (apos advertencia)"],
        justaCausa: ["Vazar dados do paciente (LGPD — Art. 482-g CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "ADMINISTRATIVO", indice: "02", modalidade: "presencial", sla: "2h", reporta: "supervisor01",
        quandoReporta: "Ao recuperar vaga ou reativar paciente — registro imediato.",
        funcao: "Reagendamento e recuperacao de vagas. Converte faltas em novos agendamentos, recupera pacientes inativos.",
        objetivos: "Recuperacao de vagas, reagendamento, reativacao de pacientes",
        metas: ["Taxa recuperacao vagas > 60%", "Reagendamento em 2h apos falta", "Contato com inativos semanal"],
        direitos: ["Acesso ao historico de faltas e cancelamentos", "Ferramenta de discagem automatica (quando disponivel)", "Feedback semanal do supervisor sobre performance"],
        deveres: ["Reagendar vaga em ate 2h apos falta", "Registrar cada tentativa de contato", "Nunca fechar card de recuperacao sem 3 tentativas"],
        advertencia: ["Vaga perdida sem tentativa de recuperacao", "Card fechado com menos de 3 tentativas"],
        demissao: ["Taxa recuperacao < 30% apos plano de correcao"],
        justaCausa: ["Registro falso de tentativa de contato (Art. 482-a CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "ADMINISTRATIVO", indice: "05", modalidade: "remoto", sla: "2h", reporta: "supervisor02",
        quandoReporta: "Ao registrar cada tentativa de contato + ao fechar card.",
        funcao: "Suporte administrativo remoto. Follow-up pos-sessao, pesquisas de satisfacao, organizacao documental.",
        objetivos: "Suporte remoto, follow-up, organizacao",
        metas: ["Follow-up pos-sessao em 24h", "Pesquisa satisfacao para 100% dos atendidos", "Documentos organizados no Drive"],
        direitos: ["Trabalhar de home office", "Equipamento ou ajuda de custo fornecido", "Nao ser cobrada fora do sistema — apenas via task cards"],
        deveres: ["Registrar CADA tentativa de contato em task_attempts", "Nunca fechar card sem resposta real registrada", "Follow-up pos-sessao em 24h"],
        advertencia: ["SLA vencido sem contato registrado", "Card fechado sem resposta real"],
        demissao: ["Registrar contato falso (paciente nao foi contatado)"],
        justaCausa: ["Fabricar resposta de paciente (Art. 482-a CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "ENFERMAGEM", indice: "01", modalidade: "presencial", sla: "36h", reporta: "supervisor01",
        quandoReporta: "Ao fim de cada sessao + ao salvar avaliacao com alerta.",
        funcao: "Aplicar substancias. Validar codigo. Preencher avaliacao. Gerar RAS.",
        objetivos: "Execucao segura de procedimentos, registro completo, alerta de intercorrencias",
        metas: ["100% das sessoes com codigo de validacao verificado", "100% das avaliacoes preenchidas no mesmo dia", "Zero RAS com mais de 2h de atraso pos-sessao", "Zero uploads de exame na categoria errada"],
        direitos: ["Receber escala com 7 dias de antecedencia", "Nao ser acionada fora do turno por WhatsApp pessoal — canal oficial apenas", "Treinamento inicial de 5 dias antes de assumir sessoes independentes", "Feedback de desempenho mensal do supervisor01"],
        deveres: ["Usar APENAS canal oficial da clinica — nunca WhatsApp pessoal para operacao", "Nunca aplicar substancia sem codigo de validacao verificado no sistema", "Registrar avaliacao de enfermagem com todos os campos obrigatorios", "Escalar qualquer intercorrencia imediatamente — nunca omitir"],
        advertencia: ["Avaliacao nao preenchida em 2h apos sessao", "Upload de exame na categoria errada do Drive (> 2x/mes)", "Uso de WhatsApp pessoal para contato operacional", "Campo obrigatorio vazio ao fechar card"],
        demissao: ["Aplicar substancia sem protocolo validado ou sem codigo", "Falsificar dados clinicos ou de avaliacao", "Classificar alerta verde quando ha queixa documentada (omissao)"],
        justaCausa: ["Vazar dados do paciente (LGPD — Art. 482-g CLT)", "Aplicar substancia nao prescrita (Art. 482-h CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "ENFERMAGEM", indice: "02", modalidade: "remoto", sla: "36h", reporta: "supervisor02",
        quandoReporta: "Ao registrar cada tentativa de contato + ao fechar task card.",
        funcao: "Contatar paciente remotamente. Validar relato da enf01. Coletar nota.",
        objetivos: "Monitoramento remoto, follow-up de alertas, contato paciente",
        metas: ["100% de cards respondidos dentro do SLA", "Zero cards fechados sem resposta real do paciente registrada", "Taxa de divergencia detectada >= registros verificados", "Score medio do paciente >= 4/5"],
        direitos: ["Trabalhar de home office com equipamento fornecido ou ajuda de custo", "Nao ser cobrada por canal fora do sistema — apenas via task cards", "Acesso ao historico clinico necessario para o contato — nada alem", "Auditoria do supervisor02 comunicada com respeito e evidencia"],
        deveres: ["Registrar CADA tentativa de contato em task_attempts — canal, horario, outcome", "Nunca fechar card sem resposta real registrada", "Nunca ver ou compartilhar codigo de validacao diario do paciente", "Escalar imediatamente se relato do paciente divergir do relato da enf01"],
        advertencia: ["SLA vencido sem contato registrado", "Fechar task sem resposta real (campo generico ou vazio)", "Nao registrar tentativa de contato no sistema"],
        demissao: ["Registrar contato falso (paciente nao foi contatado)", "Omitir divergencia entre relato da enf01 e paciente"],
        justaCausa: ["Fabricar resposta de paciente (Art. 482-a CLT — ato de improbidade)", "Ignorar alerta vermelho ativo (Art. 482-i CLT — abandono de responsabilidade)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "CONSULTOR", indice: "01", modalidade: "presencial", sla: "36h", reporta: "supervisor01",
        quandoReporta: "Ao identificar exame alterado + ao encaminhar para medico.",
        funcao: "Avaliacao corporal completa (7 dobras, 8 circunferencias, bioimpedancia), exames iniciais.",
        objetivos: "Avaliacao corporal precisa, identificacao de exames alterados, encaminhamento medico",
        metas: ["Avaliacao completa em cada sessao", "Exames alterados encaminhados em 24h", "Nota paciente >= 4"],
        direitos: ["Material de avaliacao calibrado e disponivel", "Tempo adequado por paciente (minimo 40min)", "Treinamento em novos protocolos de avaliacao"],
        deveres: ["Realizar avaliacao corporal completa conforme protocolo", "Encaminhar exames alterados ao medico em 24h", "Registrar todos os dados de avaliacao no sistema"],
        advertencia: ["Avaliacao incompleta (campos obrigatorios vazios)", "Exame alterado nao encaminhado em 24h"],
        demissao: ["Falsificar dados de avaliacao corporal"],
        justaCausa: ["Alterar resultados de exames (Art. 482-a CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "CONSULTOR", indice: "02", modalidade: "remoto", sla: "36h", reporta: "supervisor02",
        quandoReporta: "Ao registrar cada contato de follow-up + ao reativar paciente.",
        funcao: "Follow-up de protocolo, monitoramento de adesao, reativacao de pacientes inativos.",
        objetivos: "Follow-up remoto, adesao ao protocolo, reativacao",
        metas: ["Follow-up semanal/quinzenal conforme protocolo", "Taxa reativacao > 40%", "Registro completo de cada contato"],
        direitos: ["Acesso ao historico do paciente para contexto", "Script de follow-up atualizado", "Meta de reativacao realista e revisada mensalmente"],
        deveres: ["Realizar follow-up conforme frequencia do protocolo", "Registrar CADA contato no sistema", "Nunca fechar follow-up sem resposta real"],
        advertencia: ["Follow-up atrasado sem justificativa", "Contato registrado sem conteudo real"],
        demissao: ["Taxa de reativacao < 20% apos plano de correcao"],
        justaCausa: ["Fabricar contato com paciente (Art. 482-a CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false },
      },
      {
        cargo: "FINANCEIRO", indice: "01", modalidade: "presencial", sla: "24h", reporta: "gerente01",
        quandoReporta: "Fechamento diario ate 19h. Inadimplente > R$500: imediato ao gerente.",
        funcao: "Recebimentos, NF, fechamento diario, controle de inadimplencia.",
        objetivos: "Controle financeiro, emissao de NF, cobranca",
        metas: ["NF emitida em 2h apos pagamento", "Fechamento diario ate 19h", "Inadimplentes contatados em 24h"],
        direitos: ["Acesso ao sistema financeiro completo", "Treinamento em emissao de NF e tributacao", "Canal direto com gerente01 para valores acima do limite"],
        deveres: ["Emitir NF em ate 2h apos recebimento", "Fechamento diario sem excecao", "Contatar inadimplente em 24h"],
        advertencia: ["NF nao emitida em 2h (>2x/semana)", "Fechamento diario atrasado"],
        demissao: ["Erro financeiro por negligencia recorrente"],
        justaCausa: ["Desvio financeiro (Art. 482-a CLT)", "Emissao de NF com dados falsos (Art. 482-a CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: true, ouvidoria: false },
      },
      {
        cargo: "FINANCEIRO", indice: "05", modalidade: "remoto", sla: "24h", reporta: "supervisor02",
        quandoReporta: "Ao fechar cada negociacao + relatorio semanal de recuperacao.",
        funcao: "Cobranca de inadimplentes, negociacao de acordos, follow-up de parcelas.",
        objetivos: "Recuperacao de receita, negociacao, follow-up de pagamentos",
        metas: ["3 tentativas de cobranca antes de escalonar", "Acordos formalizados em 48h", "Taxa recuperacao > 50%"],
        direitos: ["Acesso ao historico financeiro do paciente", "Script de negociacao padronizado", "Meta de recuperacao realista"],
        deveres: ["Realizar 3 tentativas antes de escalonar", "Formalizar acordos em 48h", "Registrar cada tentativa de cobranca"],
        advertencia: ["Acordo nao formalizado em 48h", "Cobranca sem registro"],
        demissao: ["Taxa recuperacao < 25% apos plano de correcao"],
        justaCausa: ["Desvio de valores cobrados (Art. 482-a CLT)", "Acordo paralelo com paciente fora do sistema (Art. 482-a CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: true, ouvidoria: false },
      },
      {
        cargo: "OUVIDORIA", indice: "06", modalidade: "remoto", sla: "24h", reporta: "gerente01",
        quandoReporta: "Ao receber reclamacao (triagem em 24h). Escalacao imediata se gravidade alta.",
        funcao: "Canal protegido com anonimizacao obrigatoria. Recebe, categoriza e encaminha reclamacoes sem revelar identidade.",
        objetivos: "Canal seguro de reclamacoes, anonimizacao, resolucao",
        metas: ["Triagem em 24h", "Anonimizacao 100%", "Resolucao comunicada ao paciente em 72h"],
        direitos: ["Acesso protegido ao canal de ouvidoria", "Anonimizacao garantida pelo sistema", "Canal direto com gerente01 para casos graves"],
        deveres: ["Triar toda reclamacao em 24h", "NUNCA revelar identidade do reclamante", "Comunicar resolucao ao paciente em 72h"],
        advertencia: ["Triagem atrasada > 24h", "Categorizacao incorreta da reclamacao"],
        demissao: ["Revelar identidade do reclamante a equipe operacional"],
        justaCausa: ["Vazar dados de ouvidoria (LGPD — Art. 482-g CLT)", "Represalia contra reclamante (Art. 482-j CLT)"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: true },
      },
    ];

    const NOMES_POR_CARGO: Record<string, string[][]> = {
      "MEDICO_01": [["Dr. Caio Henrique Fernandes de Padua"], ["Dra. Marina Costa Oliveira"], ["Dr. Rafael Santos Lima"], ["Dr. Eduardo Martins Rocha"], ["Dra. Beatriz Almeida Nunes"], ["Dr. Felipe Soares Costa"], ["Dra. Isabela Vieira Mendes"], ["Dr. Gabriel Nascimento Alves"], ["Dra. Larissa Torres Ribeiro"], ["Dr. Lucas Ferreira Gomes"]],
      "MEDICO_02": [["Dra. Juliana Ferreira Souza"], ["Dr. Bruno Nascimento Alves"], ["Dra. Camila Ribeiro Torres"], ["Dr. Andre Carvalho Mendes"], ["Dra. Fernanda Lopes Castro"], ["Dr. Rodrigo Lima Santos"], ["Dra. Amanda Silva Pereira"], ["Dr. Thiago Mendes Rocha"], ["Dra. Patricia Alves Costa"], ["Dr. Henrique Gomes Dias"]],
      "GERENTE_01": [["Patricia Oliveira Santos"], ["Ricardo Mendes Barbosa"], ["Amanda Souza Ferreira"], ["Marcos Almeida Junior"], ["Cristina Lima Rodrigues"], ["Fernanda Costa Dias"], ["Roberto Vieira Alves"], ["Sandra Mendes Lima"], ["Carlos Eduardo Pereira"], ["Lucia Ferreira Santos"]],
      "SUPERVISOR_01": [["Carlos Eduardo Monteiro"], ["Lucia Aparecida Silva"], ["Fernando Gomes Pereira"], ["Tatiana Costa Braga"], ["Roberto Dias Nascimento"], ["Ana Lucia Mendes"], ["Paulo Roberto Costa"], ["Marcela Vieira Lima"], ["Jorge Santos Alves"], ["Renata Gomes Pereira"]],
      "SUPERVISOR_02": [["Ana Carolina Duarte"], ["Paulo Henrique Souza"], ["Mariana Vieira Costa"], ["Diego Oliveira Santos"], ["Raquel Menezes Lima"], ["Fabio Costa Mendes"], ["Juliana Alves Pereira"], ["Ricardo Santos Gomes"], ["Camila Ferreira Dias"], ["Marcos Vieira Costa"]],
      "ADMINISTRATIVO_01": [["Jessica Santos Pereira"], ["Thiago Lima Costa"], ["Larissa Mendes Silva"], ["Gabriel Ferreira Nunes"], ["Natalia Almeida Rocha"], ["Bruna Costa Lima"], ["Felipe Santos Mendes"], ["Amanda Ferreira Alves"], ["Lucas Gomes Pereira"], ["Tatiana Lima Santos"]],
      "ADMINISTRATIVO_02": [["Bruna Oliveira Martins"], ["Lucas Souza Ribeiro"], ["Daniela Costa Alves"], ["Matheus Ferreira Lima"], ["Carolina Santos Gomes"], ["Pedro Almeida Costa"], ["Fernanda Lima Pereira"], ["Rodrigo Santos Vieira"], ["Isabela Mendes Alves"], ["Thiago Costa Ferreira"]],
      "ADMINISTRATIVO_05": [["Vanessa Ribeiro Costa"], ["Felipe Almeida Santos"], ["Aline Gomes Ferreira"], ["Rodrigo Lima Mendes"], ["Isabela Costa Nunes"], ["Mariana Santos Lima"], ["Bruno Ferreira Costa"], ["Patricia Mendes Alves"], ["Carlos Lima Gomes"], ["Amanda Costa Pereira"]],
      "ENFERMAGEM_01": [["Maria Silva Santos"], ["Renata Souza Lima"], ["Debora Santos Oliveira"], ["Claudia Ferreira Costa"], ["Sandra Almeida Gomes"], ["Ana Paula Lima"], ["Tatiana Costa Mendes"], ["Fernanda Santos Alves"], ["Juliana Gomes Pereira"], ["Patricia Vieira Costa"]],
      "ENFERMAGEM_02": [["Priscila Costa Santos"], ["Adriana Lima Ferreira"], ["Simone Oliveira Mendes"], ["Patricia Gomes Ribeiro"], ["Elaine Santos Costa"], ["Claudia Lima Alves"], ["Renata Ferreira Gomes"], ["Sandra Costa Pereira"], ["Monica Mendes Lima"], ["Debora Santos Vieira"]],
      "CONSULTOR_01": [["Dra. Helena Martins Rocha"], ["Dr. Gustavo Santos Almeida"], ["Dra. Renata Vieira Lima"], ["Dr. Thiago Mendes Costa"], ["Dra. Carolina Ferreira Nunes"], ["Dr. Andre Lima Santos"], ["Dra. Mariana Costa Alves"], ["Dr. Felipe Gomes Pereira"], ["Dra. Isabela Santos Lima"], ["Dr. Roberto Ferreira Costa"]],
      "CONSULTOR_02": [["Fabio Costa Pereira"], ["Viviane Santos Lima"], ["Pedro Oliveira Mendes"], ["Julia Ferreira Gomes"], ["Leonardo Almeida Costa"], ["Amanda Lima Santos"], ["Bruno Costa Pereira"], ["Camila Mendes Alves"], ["Ricardo Gomes Lima"], ["Fernanda Santos Costa"]],
      "FINANCEIRO_01": [["Ana Lima Santos"], ["Roberto Santos Costa"], ["Miriam Ferreira Alves"], ["Carlos Mendes Lima"], ["Fernanda Oliveira Santos"], ["Patricia Costa Pereira"], ["Marcos Lima Alves"], ["Sandra Gomes Ferreira"], ["Ricardo Costa Mendes"], ["Juliana Santos Lima"]],
      "FINANCEIRO_05": [["Carlos Menezes Santos"], ["Luciana Santos Ferreira"], ["Ricardo Oliveira Lima"], ["Tatiana Almeida Costa"], ["Marcelo Gomes Santos"], ["Amanda Lima Pereira"], ["Felipe Costa Mendes"], ["Bruna Ferreira Alves"], ["Rodrigo Santos Gomes"], ["Cristina Lima Costa"]],
      "OUVIDORIA_06": [["Silvana Pereira Costa"], ["Marcos Oliveira Lima"], ["Adriana Santos Ferreira"], ["Roberto Mendes Alves"], ["Cristiane Lima Gomes"], ["Paula Costa Santos"], ["Fernando Alves Lima"], ["Tatiana Gomes Pereira"], ["Carlos Mendes Costa"], ["Renata Santos Ferreira"]],
    };

    let totalPositions = 0;
    let totalMembers = 0;

    for (let uIdx = 0; uIdx < unidades.length; uIdx++) {
      const unidade = unidades[uIdx];

      for (const template of CARGOS_TEMPLATE) {
        const codigoCompleto = `${template.cargo.toLowerCase()}${template.indice}`;
        const [position] = await db.insert(teamPositionsTable).values({
          unidadeId: unidade.id,
          cargo: template.cargo,
          indice: template.indice,
          codigoCompleto,
          modalidade: template.modalidade,
          slaDefault: template.sla,
          reportaA: template.reporta,
          quandoReporta: template.quandoReporta,
          descricaoFuncao: template.funcao,
          objetivos: template.objetivos,
          metasPrincipais: template.metas,
          direitos: template.direitos,
          deveres: template.deveres,
          advertenciaTriggers: template.advertencia,
          demissaoTriggers: template.demissao,
          justaCausaTriggers: template.justaCausa,
          podeSupervisionarOutros: template.permissoes.supervisionar,
          podeAuditarCards: template.permissoes.auditar,
          podeAprovarDespesas: template.permissoes.aprovarDespesas,
          podeEditarProtocolos: template.permissoes.editarProtocolos,
          podeAcessarFinanceiro: template.permissoes.financeiro,
          podeVerOuvidoria: template.permissoes.ouvidoria,
          ativa: true,
        }).returning();
        totalPositions++;

        const key = `${template.cargo}_${template.indice}`;
        const nomes = NOMES_POR_CARGO[key];
        if (nomes && nomes[uIdx]) {
          const nome = nomes[uIdx][0];
          const emailBase = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
          await db.insert(teamMembersTable).values({
            posicaoId: position.id,
            unidadeId: unidade.id,
            nomeCompleto: nome,
            emailFuncional: `${emailBase}@${unidade.nome?.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") || "clinica"}.com.br`,
            telefone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            dataAdmissao: `2025-0${Math.floor(Math.random() * 9) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
            statusAtivo: true,
          });
          totalMembers++;
        }
      }
    }

    const members = await db.select().from(teamMembersTable);
    const comissionaveis = members.filter(() => Math.random() > 0.4);

    const COMISSAO_CATS = [
      { cat: "VAGA_RECUPERADA", base: 5, mult: 1.5 },
      { cat: "PACIENTE_REATIVADO", base: 15, mult: 2.0 },
      { cat: "RETORNO_CONVERTIDO", base: 10, mult: 1.5 },
      { cat: "COBRANCA_RESOLVIDA", base: 8, mult: 1.5 },
      { cat: "VALIDACAO_POS_SESSAO", base: 6, mult: 2.0 },
      { cat: "RECLAMACAO_RESOLVIDA", base: 12, mult: 1.5 },
    ];

    let totalCommissions = 0;
    for (const m of comissionaveis) {
      const numComissoes = Math.floor(Math.random() * 4) + 1;
      for (let c = 0; c < numComissoes; c++) {
        const cat = COMISSAO_CATS[Math.floor(Math.random() * COMISSAO_CATS.length)];
        const mult = Math.random() > 0.5 ? cat.mult : 1.0;
        await db.insert(commissionEventsTable).values({
          membroId: m.id,
          unidadeId: m.unidadeId,
          categoria: cat.cat,
          valorBase: cat.base,
          multiplicador: mult,
          valorFinal: Math.round(cat.base * mult * 100) / 100,
          status: Math.random() > 0.2 ? "aprovada" : "pendente",
          periodoReferencia: "2026-04",
        });
        totalCommissions++;
      }
    }

    const DISC_NIVEIS = [
      { nivel: "ADVERTENCIA_VERBAL", clt: null, validade: 90 },
      { nivel: "ADVERTENCIA_ESCRITA", clt: null, validade: 365 },
    ];
    const DISC_MOTIVOS = [
      "SLA vencido 3x sem justificativa",
      "Ausencia sem aviso previo",
      "Card fechado sem resolucao valida",
      "Atraso recorrente no registro de sessoes",
      "Uso de canal nao oficial para contato operacional",
      "Avaliacao de enfermagem nao preenchida no prazo",
    ];

    let totalDisc = 0;
    const membrosParaDisc = members.filter(() => Math.random() > 0.85);
    for (const m of membrosParaDisc) {
      const disc = DISC_NIVEIS[Math.floor(Math.random() * DISC_NIVEIS.length)];
      const motivo = DISC_MOTIVOS[Math.floor(Math.random() * DISC_MOTIVOS.length)];
      await db.insert(disciplinaryEventsTable).values({
        membroId: m.id,
        unidadeId: m.unidadeId,
        nivel: disc.nivel,
        fundamentacaoClt: disc.clt,
        motivo,
        validadeDias: disc.validade,
        status: "ativa",
      });
      totalDisc++;
    }

    res.json({
      mensagem: `Seed completo: ${totalPositions} posicoes, ${totalMembers} membros, ${totalCommissions} comissoes, ${totalDisc} disciplinares`,
      totalPositions,
      totalMembers,
      totalCommissions,
      totalDisc,
      unidades: unidades.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
