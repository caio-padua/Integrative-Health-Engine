import { Router, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  gerarRelatorioOperacionalDia,
  type PayloadOperacionalDia,
} from "../pdf/relatorioOperacionalDia";

const router = Router();

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowBR(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

router.get("/relatorios/operacional-dia/pdf", async (req: Request, res: Response) => {
  try {
    const data = (req.query.data as string) || hojeISO();
    const unidadeIdRaw = req.query.unidadeId as string | undefined;
    const unidadeId = unidadeIdRaw ? parseInt(unidadeIdRaw, 10) : null;

    const filtroUnidadeAppt = unidadeId ? sql`AND a.unidade_id = ${unidadeId}` : sql``;
    const filtroUnidadeDem = unidadeId ? sql`AND d.unidade_id = ${unidadeId}` : sql``;

    // Unidade
    let unidadeNome = "Todas as Clínicas";
    if (unidadeId) {
      const r = await db.execute(sql`SELECT nome FROM unidades WHERE id = ${unidadeId} LIMIT 1`);
      const row = (r as any).rows?.[0];
      if (row?.nome) unidadeNome = row.nome;
    }

    // Appointments do dia
    const apptsRes = await db.execute(sql`
      SELECT a.hora_inicio, a.tipo_procedimento, a.status,
             p.nome AS paciente_nome, u.nome AS profissional_nome
      FROM appointments a
      LEFT JOIN pacientes p ON p.id = a.paciente_id
      LEFT JOIN usuarios u ON u.id = a.profissional_id
      WHERE a.data = ${data} ${filtroUnidadeAppt}
      ORDER BY a.hora_inicio ASC
      LIMIT 200
    `);
    const apptsRows = ((apptsRes as any).rows || []) as Array<any>;

    // Stats appointments
    const statsApptRes = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN status IN ('confirmado','realizado') THEN 1 ELSE 0 END)::int AS confirmados,
        SUM(CASE WHEN status = 'faltou' THEN 1 ELSE 0 END)::int AS faltas
      FROM appointments a
      WHERE a.data = ${data} ${filtroUnidadeAppt}
    `);
    const statsAppt = ((statsApptRes as any).rows?.[0] || {}) as any;

    // Task cards pendentes (filtro por unidade não aplica — task_cards não tem unidade_id)
    const tasksRes = await db.execute(sql`
      SELECT t.prioridade, t.assigned_role, t.titulo, t.prazo_horas, t.status,
             p.nome AS paciente_nome, t.criado_em
      FROM task_cards t
      LEFT JOIN pacientes p ON p.id = t.paciente_id
      WHERE t.status IN ('pendente','em_andamento')
      ORDER BY 
        CASE t.prioridade WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        t.criado_em DESC
      LIMIT 80
    `);
    const tasksRows = ((tasksRes as any).rows || []) as Array<any>;

    // Tarefas atrasadas (criado_em + prazo_horas < now)
    const atrasadasRes = await db.execute(sql`
      SELECT COUNT(*)::int AS atrasadas
      FROM task_cards
      WHERE status IN ('pendente','em_andamento')
        AND prazo_horas IS NOT NULL
        AND criado_em + (prazo_horas || ' hours')::interval < now()
    `);
    const tasksAtrasadas = ((atrasadasRes as any).rows?.[0]?.atrasadas as number) || 0;

    // Demandas abertas
    const demandasRes = await db.execute(sql`
      SELECT d.complexidade, d.tipo, d.titulo, d.status,
             p.nome AS paciente_nome, c.nome AS consultor_nome
      FROM demandas_servico d
      LEFT JOIN pacientes p ON p.id = d.paciente_id
      LEFT JOIN usuarios c ON c.id = d.consultor_id
      WHERE d.status IN ('aberta','em_andamento') ${filtroUnidadeDem}
      ORDER BY 
        CASE d.complexidade WHEN 'vermelha' THEN 1 WHEN 'amarela' THEN 2 ELSE 3 END,
        d.criado_em DESC
      LIMIT 60
    `);
    const demandasRows = ((demandasRes as any).rows || []) as Array<any>;

    // Lembretes do dia
    const filtroUnidadeLem = unidadeId ? sql`AND e.unidade_id = ${unidadeId}` : sql``;
    const lembretesRes = await db.execute(sql`
      SELECT
        SUM(CASE WHEN status = 'ENVIADO' THEN 1 ELSE 0 END)::int AS enviados,
        SUM(CASE WHEN status = 'FALHOU' THEN 1 ELSE 0 END)::int AS falhos
      FROM prescricao_lembrete_envios e
      WHERE DATE(e.enviado_em AT TIME ZONE 'America/Sao_Paulo') = ${data} ${filtroUnidadeLem}
    `);
    const lembretes = ((lembretesRes as any).rows?.[0] || {}) as any;

    const payload: PayloadOperacionalDia = {
      data,
      unidadeNome,
      geradoEm: nowBR(),
      resumo: {
        appointmentsHoje: statsAppt.total || 0,
        appointmentsConfirmados: statsAppt.confirmados || 0,
        appointmentsFaltas: statsAppt.faltas || 0,
        tasksPendentes: tasksRows.length,
        tasksAtrasadas,
        demandasAbertas: demandasRows.length,
        lembretesEnviados: lembretes.enviados || 0,
        lembretesFalhos: lembretes.falhos || 0,
      },
      appointments: apptsRows.map((a: any) => ({
        hora: a.hora_inicio,
        pacienteNome: a.paciente_nome || "—",
        profissionalNome: a.profissional_nome || "—",
        tipo: a.tipo_procedimento || "—",
        status: a.status || "agendado",
      })),
      tasks: tasksRows.map((t: any) => ({
        prioridade: t.prioridade || "normal",
        assignedRole: t.assigned_role || "—",
        titulo: t.titulo || "",
        prazoHoras: t.prazo_horas,
        pacienteNome: t.paciente_nome,
        status: t.status || "pendente",
      })),
      demandas: demandasRows.map((d: any) => ({
        complexidade: d.complexidade || "verde",
        tipo: d.tipo || "—",
        titulo: d.titulo || "",
        pacienteNome: d.paciente_nome,
        consultorNome: d.consultor_nome,
        status: d.status || "aberta",
      })),
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="operacional-${data}${unidadeId ? `-u${unidadeId}` : ""}.pdf"`,
    );
    const stream = gerarRelatorioOperacionalDia(payload);
    stream.pipe(res);
  } catch (err: any) {
    console.error("[relatorioOperacionalDia] erro", err);
    res.status(500).json({ erro: "Falha ao gerar relatório", detalhes: err?.message });
  }
});

router.get("/relatorios/operacional-dia/preview", async (req: Request, res: Response) => {
  // Mesma lógica mas devolve JSON pra debug
  const data = (req.query.data as string) || hojeISO();
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  res.json({ data, unidadeId, nota: "Use /pdf para baixar o relatório PDF Manifesto." });
});

export default router;
