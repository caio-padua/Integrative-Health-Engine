import { Router } from "express";
import { db } from "@workspace/db";
import {
  pacientesTable,
  appointmentsTable,
  agendaSlotsTable,
  appointmentReschedulesTable,
  agendaAuditEventsTable,
  usuariosTable,
  unidadesTable,
  TIPOS_PROCEDIMENTO,
} from "@workspace/db/schema";
import { eq, and, gte, or, desc, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { solicitarOtp, validarOtp } from "../lib/portalPaciente/otpService";

const router = Router();

const CATEGORIAS_UPLOAD: Record<string, string> = {
  "EXAME DE SANGUE": "EXAMES",
  "ULTRASSOM": "EXAMES",
  "COMPROVANTE DE PAGAMENTO": "FINANCEIRO",
  "FOTO / IMAGEM": "IMAGENS",
  "RECEITA": "RECEITAS",
  "LAUDO": "LAUDOS",
  "ATESTADO": "ATESTADOS",
  "CONTRATO": "CONTRATOS",
  "OUTRO": "CADASTRO",
};

router.get("/portal/categorias", async (_req, res) => {
  res.json(Object.keys(CATEGORIAS_UPLOAD));
});

router.post("/portal/identificar", async (req, res) => {
  const { cpf, dataNascimento } = req.body;
  if (!cpf || !dataNascimento) {
    res.status(400).json({ error: "CPF e data de nascimento obrigatorios" });
    return;
  }

  const cpfLimpo = cpf.replace(/\D/g, "");

  const pacientes = await db.select().from(pacientesTable);
  const paciente = pacientes.find(p => {
    const pCpfLimpo = (p.cpf || "").replace(/\D/g, "");
    return pCpfLimpo === cpfLimpo;
  });

  if (!paciente) {
    res.status(401).json({ error: "Dados nao conferem. Verifique CPF e data de nascimento." });
    return;
  }

  if (paciente.dataNascimento) {
    const dbDate = String(paciente.dataNascimento);
    const inputDate = String(dataNascimento);
    if (dbDate !== inputDate) {
      res.status(401).json({ error: "Dados nao conferem. Verifique CPF e data de nascimento." });
      return;
    }
  }

  res.json({
    id: paciente.id,
    nome: paciente.nome,
    temSenha: !!paciente.senhaPortal,
    categorias: Object.keys(CATEGORIAS_UPLOAD),
  });
});

router.post("/portal/definir-senha", async (req, res) => {
  const { cpf, dataNascimento, senha } = req.body;
  if (!cpf || !dataNascimento || !senha) {
    res.status(400).json({ error: "CPF, data de nascimento e senha obrigatorios" });
    return;
  }

  if (senha.length < 6) {
    res.status(400).json({ error: "Senha deve ter no minimo 6 caracteres" });
    return;
  }

  const cpfLimpo = cpf.replace(/\D/g, "");
  const pacientes = await db.select().from(pacientesTable);
  const paciente = pacientes.find(p => {
    const pCpfLimpo = (p.cpf || "").replace(/\D/g, "");
    return pCpfLimpo === cpfLimpo;
  });

  if (!paciente) {
    res.status(401).json({ error: "Dados nao conferem" });
    return;
  }

  if (paciente.dataNascimento) {
    if (String(paciente.dataNascimento) !== String(dataNascimento)) {
      res.status(401).json({ error: "Dados nao conferem" });
      return;
    }
  }

  const hash = await bcrypt.hash(senha, 10);
  await db.update(pacientesTable).set({ senhaPortal: hash }).where(eq(pacientesTable.id, paciente.id));

  res.json({ success: true, mensagem: "Senha definida com sucesso" });
});

router.post("/portal/login", async (req, res) => {
  const { cpf, senha } = req.body;
  if (!cpf || !senha) {
    res.status(400).json({ error: "CPF e senha obrigatorios" });
    return;
  }

  const cpfLimpo = cpf.replace(/\D/g, "");
  const pacientes = await db.select().from(pacientesTable);
  const paciente = pacientes.find(p => {
    const pCpfLimpo = (p.cpf || "").replace(/\D/g, "");
    return pCpfLimpo === cpfLimpo;
  });

  if (!paciente || !paciente.senhaPortal) {
    res.status(401).json({ error: "CPF ou senha incorretos" });
    return;
  }

  const senhaValida = await bcrypt.compare(senha, paciente.senhaPortal);
  if (!senhaValida) {
    res.status(401).json({ error: "CPF ou senha incorretos" });
    return;
  }

  res.json({
    id: paciente.id,
    nome: paciente.nome,
    categorias: Object.keys(CATEGORIAS_UPLOAD),
  });
});

router.get("/portal/meus-agendamentos/:pacienteId", async (req, res) => {
  try {
    const pacienteId = Number(req.params.pacienteId);
    const hoje = new Date().toISOString().split("T")[0];

    const agendamentos = await db
      .select({
        id: appointmentsTable.id,
        slotId: appointmentsTable.slotId,
        data: appointmentsTable.data,
        horaInicio: appointmentsTable.horaInicio,
        horaFim: appointmentsTable.horaFim,
        duracaoMin: appointmentsTable.duracaoMin,
        tipoProcedimento: appointmentsTable.tipoProcedimento,
        status: appointmentsTable.status,
        observacoes: appointmentsTable.observacoes,
        origemAgendamento: appointmentsTable.origemAgendamento,
        reagendamentoAutomaticoDeId: appointmentsTable.reagendamentoAutomaticoDeId,
        profissionalNome: usuariosTable.nome,
        unidadeNome: unidadesTable.nome,
      })
      .from(appointmentsTable)
      .leftJoin(usuariosTable, eq(appointmentsTable.profissionalId, usuariosTable.id))
      .leftJoin(unidadesTable, eq(appointmentsTable.unidadeId, unidadesTable.id))
      .where(
        and(
          eq(appointmentsTable.pacienteId, pacienteId),
          or(
            gte(appointmentsTable.data, hoje),
            inArray(appointmentsTable.status, ["agendado", "confirmado"])
          )
        )
      )
      .orderBy(appointmentsTable.data, appointmentsTable.horaInicio);

    const agendamentosComInfo = agendamentos.map(a => {
      const tipoInfo = TIPOS_PROCEDIMENTO[a.tipoProcedimento as keyof typeof TIPOS_PROCEDIMENTO];
      const dataAppt = new Date(a.data + "T00:00:00");
      const agora = new Date();
      const meiaNoiteAnterior = new Date(dataAppt);
      meiaNoiteAnterior.setHours(0, 0, 0, 0);
      const podeReagendar = (a.status === "agendado" || a.status === "confirmado") && agora < meiaNoiteAnterior;

      return {
        ...a,
        tipoProcedimentoLabel: tipoInfo?.label || a.tipoProcedimento,
        tipoProcedimentoCor: tipoInfo?.cor || "#6B7280",
        podeReagendar,
      };
    });

    res.json(agendamentosComInfo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/portal/slots-disponiveis", async (req, res) => {
  try {
    const { profissionalId, tipoProcedimento, dataInicio, dataFim } = req.query;

    if (!dataInicio || !dataFim) {
      res.status(400).json({ error: "dataInicio e dataFim obrigatorios" });
      return;
    }

    const conditions: any[] = [
      eq(agendaSlotsTable.status, "disponivel"),
      eq(agendaSlotsTable.liberado, true),
      gte(agendaSlotsTable.data, String(dataInicio)),
    ];

    if (dataFim) {
      const { lte: lteFn } = await import("drizzle-orm");
      conditions.push(lteFn(agendaSlotsTable.data, String(dataFim)));
    }

    if (profissionalId) {
      conditions.push(eq(agendaSlotsTable.profissionalId, Number(profissionalId)));
    }
    if (tipoProcedimento) {
      conditions.push(eq(agendaSlotsTable.tipoProcedimento, String(tipoProcedimento)));
    }

    const slots = await db
      .select({
        id: agendaSlotsTable.id,
        data: agendaSlotsTable.data,
        horaInicio: agendaSlotsTable.horaInicio,
        horaFim: agendaSlotsTable.horaFim,
        duracaoMin: agendaSlotsTable.duracaoMin,
        tipoProcedimento: agendaSlotsTable.tipoProcedimento,
        profissionalId: agendaSlotsTable.profissionalId,
        profissionalNome: usuariosTable.nome,
      })
      .from(agendaSlotsTable)
      .leftJoin(usuariosTable, eq(agendaSlotsTable.profissionalId, usuariosTable.id))
      .where(and(...conditions))
      .orderBy(agendaSlotsTable.data, agendaSlotsTable.horaInicio)
      .limit(100);

    const hoje = new Date().toISOString().split("T")[0];
    const slotsValidos = slots.filter(s => s.data >= hoje);

    res.json(slotsValidos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/portal/reagendar", async (req, res) => {
  try {
    const { appointmentId, novoSlotId, pacienteId, motivo } = req.body;

    if (!appointmentId || !novoSlotId || !pacienteId) {
      res.status(400).json({ error: "appointmentId, novoSlotId e pacienteId obrigatorios" });
      return;
    }

    const [appointment] = await db
      .select()
      .from(appointmentsTable)
      .where(and(
        eq(appointmentsTable.id, Number(appointmentId)),
        eq(appointmentsTable.pacienteId, Number(pacienteId))
      ));

    if (!appointment) {
      res.status(404).json({ error: "Agendamento nao encontrado" });
      return;
    }

    if (appointment.status !== "agendado" && appointment.status !== "confirmado") {
      res.status(400).json({ error: "Agendamento nao pode ser reagendado neste status" });
      return;
    }

    const dataAppt = new Date(appointment.data + "T00:00:00");
    const agora = new Date();
    const meiaNoiteAnterior = new Date(dataAppt);
    meiaNoiteAnterior.setHours(0, 0, 0, 0);

    if (agora >= meiaNoiteAnterior) {
      res.status(400).json({
        error: "Reagendamento so e permitido ate 00:00 do dia do agendamento. Entre em contato com a clinica.",
      });
      return;
    }

    const [novoSlot] = await db
      .select()
      .from(agendaSlotsTable)
      .where(eq(agendaSlotsTable.id, Number(novoSlotId)));

    if (!novoSlot || novoSlot.status !== "disponivel") {
      res.status(409).json({ error: "Slot nao disponivel. Escolha outro horario." });
      return;
    }

    await db.insert(appointmentReschedulesTable).values({
      appointmentId: appointment.id,
      slotAnteriorId: appointment.slotId,
      slotNovoId: novoSlot.id,
      dataAnterior: appointment.data,
      horaAnterior: appointment.horaInicio,
      dataNova: novoSlot.data,
      horaNova: novoSlot.horaInicio,
      motivo: motivo || "Reagendado pelo paciente via portal",
      origemReagendamento: "portal_paciente",
    });

    await db.update(agendaSlotsTable).set({ status: "disponivel" }).where(eq(agendaSlotsTable.id, appointment.slotId));
    await db.update(agendaSlotsTable).set({ status: "ocupado" }).where(eq(agendaSlotsTable.id, novoSlot.id));

    await db.update(appointmentsTable).set({
      slotId: novoSlot.id,
      data: novoSlot.data,
      horaInicio: novoSlot.horaInicio,
      horaFim: novoSlot.horaFim,
      duracaoMin: novoSlot.duracaoMin,
    }).where(eq(appointmentsTable.id, appointment.id));

    await db.insert(agendaAuditEventsTable).values({
      entidadeTipo: "appointment",
      entidadeId: appointment.id,
      acao: "reagendamento_portal_paciente",
      detalhes: {
        slotAnteriorId: appointment.slotId,
        slotNovoId: novoSlot.id,
        dataAnterior: appointment.data,
        dataNova: novoSlot.data,
        horaAnterior: appointment.horaInicio,
        horaNova: novoSlot.horaInicio,
        motivo: motivo || "Reagendado pelo paciente via portal",
      },
    });

    res.json({
      success: true,
      mensagem: `Agendamento reagendado para ${novoSlot.data} as ${novoSlot.horaInicio}`,
      novaData: novoSlot.data,
      novaHora: novoSlot.horaInicio,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/portal/upload/:pacienteId", async (req, res) => {
  const pacienteId = Number(req.params.pacienteId);
  const { categoria, arquivo, nomeArquivo, mimeType } = req.body;

  if (!categoria || !arquivo || !nomeArquivo) {
    res.status(400).json({ error: "Categoria, arquivo (base64) e nomeArquivo obrigatorios" });
    return;
  }

  const subfolder = CATEGORIAS_UPLOAD[categoria] || "CADASTRO";

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Cliente nao encontrado" }); return; }

  try {
    const driveBaseUrl = `/api/google-drive/upload/${pacienteId}/${subfolder}`;
    res.json({
      success: true,
      driveUploadUrl: driveBaseUrl,
      subfolder,
      pacienteId,
      nomeArquivo,
      mensagem: `Arquivo '${nomeArquivo}' preparado para upload na pasta ${subfolder}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao processar upload" });
  }
});

// =====================================================================
// Wave 4 PACIENTE-TSUNAMI · OTP login + histórico unificado + Drive links
// =====================================================================

/**
 * POST /portal/otp/solicitar
 * Body: { cpf, dataNascimento }
 * Retorna: { ok, paciente_id, nome, destino_mascarado, expira_em }
 * Envia código 6 dígitos por email (template branded MEDCORE) — Wave 2 reuse.
 */
router.post("/portal/otp/solicitar", async (req, res) => {
  try {
    const { cpf, dataNascimento } = req.body || {};
    if (!cpf || !dataNascimento) {
      res.status(400).json({ error: "CPF e data de nascimento obrigatorios" });
      return;
    }
    const cpfLimpo = String(cpf).replace(/\D/g, "");
    const pacientes = await db.select().from(pacientesTable);
    const paciente = pacientes.find(p => (p.cpf || "").replace(/\D/g, "") === cpfLimpo);
    if (!paciente) {
      res.status(401).json({ error: "Dados nao conferem" });
      return;
    }
    if (paciente.dataNascimento && String(paciente.dataNascimento) !== String(dataNascimento)) {
      res.status(401).json({ error: "Dados nao conferem" });
      return;
    }
    if (!paciente.email) {
      res.status(400).json({
        error: "Paciente nao tem email cadastrado. Use login com senha ou contate a clinica.",
      });
      return;
    }

    let unidadeNick: string | undefined;
    if (paciente.unidadeId) {
      const u = await db.execute(sql`SELECT nick, nome FROM unidades WHERE id = ${paciente.unidadeId} LIMIT 1`);
      const uRows = ((u as any).rows ?? u) as any[];
      unidadeNick = uRows[0]?.nick || uRows[0]?.nome || undefined;
    }

    const result = await solicitarOtp({
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      email: paciente.email,
      unidadeNick,
      ipOrigem: (req.ip || "").split(",")[0].trim() || undefined,
    });

    if (!result.ok) {
      const isFlood = result.erro === "aguarde_60_segundos";
      res.status(isFlood ? 429 : 502).json({ error: result.erro, destino_mascarado: result.destino_mascarado });
      return;
    }

    res.json({
      ok: true,
      paciente_id: paciente.id,
      nome: paciente.nome,
      destino_mascarado: result.destino_mascarado,
      expira_em: result.expiraEm,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao solicitar OTP" });
  }
});

/**
 * POST /portal/otp/validar
 * Body: { paciente_id, codigo }
 * Retorna: { id, nome, categorias }
 */
router.post("/portal/otp/validar", async (req, res) => {
  try {
    const { paciente_id, codigo } = req.body || {};
    const pid = Number(paciente_id);
    if (!pid || !codigo) {
      res.status(400).json({ error: "paciente_id e codigo obrigatorios" });
      return;
    }
    const r = await validarOtp({ pacienteId: pid, codigo: String(codigo) });
    if (!r.ok) {
      const isFmt = r.erro === "codigo_formato_invalido";
      res.status(isFmt ? 400 : 401).json({ error: r.erro });
      return;
    }
    const paciente = (await db.select().from(pacientesTable).where(eq(pacientesTable.id, pid)))[0];
    if (!paciente) {
      res.status(404).json({ error: "paciente_nao_encontrado" });
      return;
    }
    res.json({
      id: paciente.id,
      nome: paciente.nome,
      categorias: Object.keys(CATEGORIAS_UPLOAD),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao validar OTP" });
  }
});

/**
 * GET /portal/historico/:pacienteId
 * Retorna lista unificada (assinaturas digitais + cobranças adicionais),
 * ordenada DESC por data. Cada item tem { tipo, descricao, status, data, link }.
 */
router.get("/portal/historico/:pacienteId", async (req, res) => {
  try {
    const pid = Number(req.params.pacienteId);
    if (!pid) {
      res.status(400).json({ error: "paciente_id invalido" });
      return;
    }

    // 1) Assinaturas digitais (PDFs assinados/pendentes)
    const assRes = await db.execute(sql`
      SELECT id, documento_tipo, status, criado_em, assinado_em, pdf_assinado_url
      FROM assinaturas_digitais
      WHERE paciente_id = ${pid}
      ORDER BY criado_em DESC
      LIMIT 100
    `);
    const assRows = ((assRes as any).rows ?? assRes) as any[];
    const assinaturas = assRows.map(r => ({
      tipo: "ASSINATURA",
      id: r.id,
      descricao: r.documento_tipo || "Documento",
      status: r.status,
      data: r.assinado_em || r.criado_em,
      link: r.pdf_assinado_url || null,
    }));

    // 2) Solicitações de assinatura (envios pendentes)
    const solRes = await db.execute(sql`
      SELECT s.id, s.status, s.criado_em, s.concluido_em, s.pdf_assinado_url, t.nome_exibicao AS template_nome
      FROM assinatura_solicitacoes s
      LEFT JOIN assinatura_templates t ON t.id = s.template_id
      WHERE s.paciente_id = ${pid}
      ORDER BY s.criado_em DESC
      LIMIT 100
    `);
    const solRows = ((solRes as any).rows ?? solRes) as any[];
    const solicitacoes = solRows.map(r => ({
      tipo: "SOLICITACAO",
      id: r.id,
      descricao: r.template_nome || "Solicitação de assinatura",
      status: r.status,
      data: r.concluido_em || r.criado_em,
      link: r.pdf_assinado_url || null,
    }));

    // 3) Cobranças adicionais (referencia_id pode apontar pro paciente)
    const cobRes = await db.execute(sql`
      SELECT id, tipo, descricao, valor_brl, status, criado_em, pago_em
      FROM cobrancas_adicionais
      WHERE referencia_tipo = 'paciente' AND referencia_id = ${pid}
      ORDER BY criado_em DESC
      LIMIT 100
    `);
    const cobRows = ((cobRes as any).rows ?? cobRes) as any[];
    const cobrancas = cobRows.map(r => ({
      tipo: "COBRANCA",
      id: r.id,
      descricao: `${r.tipo}: ${r.descricao}`,
      valor_brl: Number(r.valor_brl),
      status: r.status,
      data: r.pago_em || r.criado_em,
      link: null,
    }));

    const unificado = [...assinaturas, ...solicitacoes, ...cobrancas]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    res.json({
      paciente_id: pid,
      total: unificado.length,
      itens: unificado,
      por_tipo: {
        assinaturas: assinaturas.length,
        solicitacoes: solicitacoes.length,
        cobrancas: cobrancas.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao listar historico" });
  }
});

/**
 * GET /portal/drive-links/:pacienteId
 * Retorna folder_id do Google Drive do paciente + URL pública (Wave 1).
 */
router.get("/portal/drive-links/:pacienteId", async (req, res) => {
  try {
    const pid = Number(req.params.pacienteId);
    if (!pid) {
      res.status(400).json({ error: "paciente_id invalido" });
      return;
    }
    const paciente = (await db.select().from(pacientesTable).where(eq(pacientesTable.id, pid)))[0];
    if (!paciente) {
      res.status(404).json({ error: "paciente_nao_encontrado" });
      return;
    }
    const folderId = paciente.googleDriveFolderId;
    res.json({
      paciente_id: pid,
      folder_id: folderId || null,
      drive_url: folderId ? `https://drive.google.com/drive/folders/${folderId}` : null,
      tem_drive: !!folderId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Erro ao buscar drive" });
  }
});

export default router;
