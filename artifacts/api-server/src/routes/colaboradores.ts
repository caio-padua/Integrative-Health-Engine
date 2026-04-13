import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  teamPositionsTable,
  teamMembersTable,
  taskAttemptsTable,
  taskValidationsTable,
  commissionEventsTable,
  disciplinaryEventsTable,
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
        descricaoFuncao: teamPositionsTable.descricaoFuncao,
        objetivos: teamPositionsTable.objetivos,
        metasPrincipais: teamPositionsTable.metasPrincipais,
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
        descricaoFuncao: teamPositionsTable.descricaoFuncao,
        objetivos: teamPositionsTable.objetivos,
        metasPrincipais: teamPositionsTable.metasPrincipais,
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
      { cargo: "MEDICO", indice: "01", modalidade: "presencial", sla: "72h", reporta: "—",
        funcao: "Diretor clinico. Valida protocolos, homologa procedimentos, supervisiona toda a equipe medica.",
        objetivos: "Garantir qualidade clinica, aprovar protocolos, auditar casos complexos",
        metas: ["Zero protocolos sem homologacao", "Auditoria semanal de casos", "Tempo resposta escalacao < 72h"],
        permissoes: { supervisionar: true, auditar: true, aprovarDespesas: true, editarProtocolos: true, financeiro: true, ouvidoria: true } },
      { cargo: "MEDICO", indice: "02", modalidade: "remoto", sla: "72h", reporta: "medico01",
        funcao: "Medico de suporte. Atende teleconsultas, revisa exames alterados, suporte clinico remoto.",
        objetivos: "Suporte clinico remoto, revisao de exames, teleconsultas",
        metas: ["Responder exames alterados em 48h", "Teleconsultas agendadas sem atraso", "Documentar todos os pareceres"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: true, financeiro: false, ouvidoria: false } },
      { cargo: "GERENTE", indice: "01", modalidade: "presencial", sla: "48h", reporta: "medico01",
        funcao: "Gerente geral da unidade. Coordena operacoes, supervisores e fluxo administrativo. Ponto focal para decisoes operacionais.",
        objetivos: "Eficiencia operacional, gestao de equipe, resolucao de conflitos",
        metas: ["Taxa resolucao equipe > 85%", "Reunioes semanais com supervisores", "Escalonamentos resolvidos em 48h"],
        permissoes: { supervisionar: true, auditar: true, aprovarDespesas: true, editarProtocolos: false, financeiro: true, ouvidoria: true } },
      { cargo: "SUPERVISOR", indice: "01", modalidade: "presencial", sla: "24h", reporta: "gerente01",
        funcao: "Supervisor presencial. Monitora SLA da equipe, audita cards, cobra justificativas de atrasos.",
        objetivos: "Garantir cumprimento de SLA, auditar qualidade, escalonar problemas",
        metas: ["SLA vencido sem justificativa = 0", "Auditoria diaria de cards fechados", "Feedback semanal para cada supervisionado"],
        permissoes: { supervisionar: true, auditar: true, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false } },
      { cargo: "SUPERVISOR", indice: "02", modalidade: "remoto", sla: "24h", reporta: "gerente01",
        funcao: "Supervisor remoto. Audita atendimentos dos indices 02 contatando diretamente o paciente. Anti-corporativismo.",
        objetivos: "Auditoria de qualidade remota, validacao pos-atendimento, contato direto com paciente",
        metas: ["Auditar 100% dos cards fechados por 02s", "Contatar paciente em 24h pos-fechamento", "Relatorio semanal de divergencias"],
        permissoes: { supervisionar: true, auditar: true, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false } },
      { cargo: "ADMINISTRATIVO", indice: "01", modalidade: "presencial", sla: "2h", reporta: "supervisor01",
        funcao: "Recepcao e agenda. Confirma sessoes D-1, recebe pacientes, gerencia agenda do dia.",
        objetivos: "Gestao de agenda, confirmacao de sessoes, primeiro contato com leads",
        metas: ["Confirmacao D-1 ate 18h = 100%", "Leads respondidos em 1h", "Zero no-show por falta de confirmacao"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false } },
      { cargo: "ADMINISTRATIVO", indice: "02", modalidade: "presencial", sla: "2h", reporta: "supervisor01",
        funcao: "Reagendamento e recuperacao de vagas. Converte faltas em novos agendamentos, recupera pacientes inativos.",
        objetivos: "Recuperacao de vagas, reagendamento, reativacao de pacientes",
        metas: ["Taxa recuperacao vagas > 60%", "Reagendamento em 2h apos falta", "Contato com inativos semanal"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false } },
      { cargo: "ADMINISTRATIVO", indice: "05", modalidade: "remoto", sla: "2h", reporta: "supervisor02",
        funcao: "Suporte administrativo remoto. Follow-up pos-sessao, pesquisas de satisfacao, organizacao documental.",
        objetivos: "Suporte remoto, follow-up, organizacao",
        metas: ["Follow-up pos-sessao em 24h", "Pesquisa satisfacao enviada para 100% dos atendidos", "Documentos organizados no Drive"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false } },
      { cargo: "ENFERMAGEM", indice: "01", modalidade: "presencial", sla: "36h", reporta: "supervisor01",
        funcao: "Enfermeira presencial. Executa sessoes (infusoes, injetaveis, implantes), registra avaliacoes pos-procedimento.",
        objetivos: "Execucao segura de procedimentos, registro completo, alerta de intercorrencias",
        metas: ["100% das sessoes com avaliacao registrada", "Zero procedimentos sem checklist", "Alertas amarelos respondidos em 36h"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false } },
      { cargo: "ENFERMAGEM", indice: "02", modalidade: "remoto", sla: "36h", reporta: "supervisor02",
        funcao: "Enfermeira remota. Contato pos-sessao, monitoramento de sintomas, follow-up de alertas amarelo/vermelho.",
        objetivos: "Monitoramento remoto, follow-up de alertas, contato paciente",
        metas: ["Contato pos-alerta em 36h", "3 tentativas antes de escalonar", "Registro de todas as tentativas"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false } },
      { cargo: "CONSULTOR", indice: "01", modalidade: "presencial", sla: "36h", reporta: "supervisor01",
        funcao: "Consultor presencial. Avaliacao corporal completa (7 dobras, 8 circunferencias, bioimpedancia), exames iniciais.",
        objetivos: "Avaliacao corporal precisa, identificacao de exames alterados, encaminhamento medico",
        metas: ["Avaliacao completa em cada sessao", "Exames alterados encaminhados em 24h", "Nota paciente >= 4"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false } },
      { cargo: "CONSULTOR", indice: "02", modalidade: "remoto", sla: "36h", reporta: "supervisor02",
        funcao: "Consultor remoto. Follow-up de protocolo, monitoramento de adesao, reativacao de pacientes inativos.",
        objetivos: "Follow-up remoto, adesao ao protocolo, reativacao",
        metas: ["Follow-up semanal/quinzenal conforme protocolo", "Taxa reativacao > 40%", "Registro completo de cada contato"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: false } },
      { cargo: "FINANCEIRO", indice: "01", modalidade: "presencial", sla: "24h", reporta: "gerente01",
        funcao: "Financeiro presencial. Recebimentos, NF, fechamento diario, controle de inadimplencia.",
        objetivos: "Controle financeiro, emissao de NF, cobranca",
        metas: ["NF emitida em 2h apos pagamento", "Fechamento diario ate 19h", "Inadimplentes contatados em 24h"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: true, ouvidoria: false } },
      { cargo: "FINANCEIRO", indice: "05", modalidade: "remoto", sla: "24h", reporta: "supervisor02",
        funcao: "Financeiro remoto. Cobranca de inadimplentes, negociacao de acordos, follow-up de parcelas.",
        objetivos: "Recuperacao de receita, negociacao, follow-up de pagamentos",
        metas: ["3 tentativas de cobranca antes de escalonar", "Acordos formalizados em 48h", "Taxa recuperacao > 50%"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: true, ouvidoria: false } },
      { cargo: "OUVIDORIA", indice: "06", modalidade: "remoto", sla: "24h", reporta: "gerente01",
        funcao: "Ouvidoria remota. Canal protegido com anonimizacao obrigatoria. Recebe, categoriza e encaminha reclamacoes sem revelar identidade do paciente.",
        objetivos: "Canal seguro de reclamacoes, anonimizacao, resolucao",
        metas: ["Triagem em 24h", "Anonimizacao 100%", "Resolucao comunicada ao paciente em 72h"],
        permissoes: { supervisionar: false, auditar: false, aprovarDespesas: false, editarProtocolos: false, financeiro: false, ouvidoria: true } },
    ];

    const NOMES_POR_CARGO: Record<string, string[][]> = {
      "MEDICO_01": [["Dr. Caio Henrique Fernandes de Padua"], ["Dra. Marina Costa Oliveira"], ["Dr. Rafael Santos Lima"], ["Dr. Eduardo Martins Rocha"], ["Dra. Beatriz Almeida Nunes"]],
      "MEDICO_02": [["Dra. Juliana Ferreira Souza"], ["Dr. Bruno Nascimento Alves"], ["Dra. Camila Ribeiro Torres"], ["Dr. Andre Carvalho Mendes"], ["Dra. Fernanda Lopes Castro"]],
      "GERENTE_01": [["Patricia Oliveira Santos"], ["Ricardo Mendes Barbosa"], ["Amanda Souza Ferreira"], ["Marcos Almeida Junior"], ["Cristina Lima Rodrigues"]],
      "SUPERVISOR_01": [["Carlos Eduardo Monteiro"], ["Lucia Aparecida Silva"], ["Fernando Gomes Pereira"], ["Tatiana Costa Braga"], ["Roberto Dias Nascimento"]],
      "SUPERVISOR_02": [["Ana Carolina Duarte"], ["Paulo Henrique Souza"], ["Mariana Vieira Costa"], ["Diego Oliveira Santos"], ["Raquel Menezes Lima"]],
      "ADMINISTRATIVO_01": [["Jessica Santos Pereira"], ["Thiago Lima Costa"], ["Larissa Mendes Silva"], ["Gabriel Ferreira Nunes"], ["Natalia Almeida Rocha"]],
      "ADMINISTRATIVO_02": [["Bruna Oliveira Martins"], ["Lucas Souza Ribeiro"], ["Daniela Costa Alves"], ["Matheus Ferreira Lima"], ["Carolina Santos Gomes"]],
      "ADMINISTRATIVO_05": [["Vanessa Ribeiro Costa"], ["Felipe Almeida Santos"], ["Aline Gomes Ferreira"], ["Rodrigo Lima Mendes"], ["Isabela Costa Nunes"]],
      "ENFERMAGEM_01": [["Maria Silva Fisioterapeuta"], ["Renata Souza Lima"], ["Debora Santos Oliveira"], ["Claudia Ferreira Costa"], ["Sandra Almeida Gomes"]],
      "ENFERMAGEM_02": [["Priscila Costa Santos"], ["Adriana Lima Ferreira"], ["Simone Oliveira Mendes"], ["Patricia Gomes Ribeiro"], ["Elaine Santos Costa"]],
      "CONSULTOR_01": [["Dra. Helena Martins Rocha"], ["Dr. Gustavo Santos Almeida"], ["Dra. Renata Vieira Lima"], ["Dr. Thiago Mendes Costa"], ["Dra. Carolina Ferreira Nunes"]],
      "CONSULTOR_02": [["Fabio Costa Pereira"], ["Viviane Santos Lima"], ["Pedro Oliveira Mendes"], ["Julia Ferreira Gomes"], ["Leonardo Almeida Costa"]],
      "FINANCEIRO_01": [["Ana Lima"], ["Roberto Santos Costa"], ["Miriam Ferreira Alves"], ["Carlos Mendes Lima"], ["Fernanda Oliveira Santos"]],
      "FINANCEIRO_05": [["Carlos Menezes"], ["Luciana Santos Ferreira"], ["Ricardo Oliveira Lima"], ["Tatiana Almeida Costa"], ["Marcelo Gomes Santos"]],
      "OUVIDORIA_06": [["Silvana Pereira Costa"], ["Marcos Oliveira Lima"], ["Adriana Santos Ferreira"], ["Roberto Mendes Alves"], ["Cristiane Lima Gomes"]],
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
          descricaoFuncao: template.funcao,
          objetivos: template.objetivos,
          metasPrincipais: template.metas,
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
            emailFuncional: `${emailBase}@${unidade.nome.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.com.br`,
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
