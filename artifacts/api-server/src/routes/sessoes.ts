import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessoesTable, insertSessaoSchema,
  aplicacoesSubstanciasTable, insertAplicacaoSubstanciaSchema,
  pacientesTable, substanciasTable, unidadesTable, usuariosTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

router.get("/sessoes", async (req, res) => {
  const { pacienteId, status, profissionalId, dataFrom, dataTo, unidadeId } = req.query;
  const conditions: any[] = [];
  if (pacienteId) conditions.push(eq(sessoesTable.pacienteId, Number(pacienteId)));
  if (status) conditions.push(eq(sessoesTable.status, String(status)));
  if (profissionalId) conditions.push(eq(sessoesTable.profissionalId, Number(profissionalId)));
  if (unidadeId) conditions.push(eq(sessoesTable.unidadeId, Number(unidadeId)));
  if (dataFrom) conditions.push(gte(sessoesTable.dataAgendada, String(dataFrom)));
  if (dataTo) conditions.push(lte(sessoesTable.dataAgendada, String(dataTo)));

  const result = await db
    .select({
      sessao: sessoesTable,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      unidadeNome: unidadesTable.nome,
      profissionalNome: usuariosTable.nome,
    })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sessoesTable.dataAgendada, sessoesTable.horaAgendada);

  res.json(result);
});

router.post("/sessoes", async (req, res) => {
  const parsed = insertSessaoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [created] = await db.insert(sessoesTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.get("/sessoes/:id", async (req, res) => {
  const [sessao] = await db
    .select({
      sessao: sessoesTable,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      unidadeNome: unidadesTable.nome,
      profissionalNome: usuariosTable.nome,
    })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
    .where(eq(sessoesTable.id, Number(req.params.id)));

  if (!sessao) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  const aplicacoes = await db
    .select({
      aplicacao: aplicacoesSubstanciasTable,
      substanciaNome: substanciasTable.nome,
      substanciaCor: substanciasTable.cor,
      substanciaVia: substanciasTable.via,
    })
    .from(aplicacoesSubstanciasTable)
    .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
    .where(eq(aplicacoesSubstanciasTable.sessaoId, Number(req.params.id)));

  res.json({ ...sessao, aplicacoes });
});

router.put("/sessoes/:id", async (req, res) => {
  const { status, dataAgendada, horaAgendada, notas, profissionalId } = req.body;
  const updates: Record<string, any> = {};
  if (status !== undefined) updates.status = status;
  if (dataAgendada !== undefined) updates.dataAgendada = dataAgendada;
  if (horaAgendada !== undefined) updates.horaAgendada = horaAgendada;
  if (notas !== undefined) updates.notas = notas;
  if (profissionalId !== undefined) updates.profissionalId = profissionalId;

  const [updated] = await db.update(sessoesTable).set(updates).where(eq(sessoesTable.id, Number(req.params.id))).returning();
  if (!updated) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }
  res.json(updated);
});

router.post("/sessoes/:id/confirmar-substancia", async (req, res) => {
  const { substanciaId, confirmado, notas } = req.body;
  if (!substanciaId) { res.status(400).json({ error: "substanciaId obrigatorio" }); return; }

  const [aplicacao] = await db
    .select()
    .from(aplicacoesSubstanciasTable)
    .where(and(
      eq(aplicacoesSubstanciasTable.sessaoId, Number(req.params.id)),
      eq(aplicacoesSubstanciasTable.substanciaId, Number(substanciaId))
    ));

  if (!aplicacao) { res.status(404).json({ error: "Aplicacao nao encontrada" }); return; }

  const updates: Record<string, any> = {
    status: confirmado ? "aplicada" : "nao_aplicada",
  };
  if (confirmado) updates.aplicadoEm = new Date().toISOString();
  if (notas) updates.notas = notas;

  const [updated] = await db
    .update(aplicacoesSubstanciasTable)
    .set(updates)
    .where(eq(aplicacoesSubstanciasTable.id, aplicacao.id))
    .returning();

  const todasAplicacoes = await db
    .select()
    .from(aplicacoesSubstanciasTable)
    .where(eq(aplicacoesSubstanciasTable.sessaoId, Number(req.params.id)));

  const todasConfirmadas = todasAplicacoes
    .filter(a => a.disponibilidade === "disp")
    .every(a => a.status === "aplicada" || a.status === "nao_aplicada");

  const algumAplicada = todasAplicacoes.some(a => a.status === "aplicada");

  if (todasConfirmadas) {
    await db.update(sessoesTable).set({ status: "concluida" }).where(eq(sessoesTable.id, Number(req.params.id)));
  } else if (algumAplicada) {
    await db.update(sessoesTable).set({ status: "parcial" }).where(eq(sessoesTable.id, Number(req.params.id)));
  }

  res.json(updated);
});

router.post("/sessoes/:id/adicionar-substancias", async (req, res) => {
  const { substancias } = req.body;
  if (!substancias || !Array.isArray(substancias)) {
    res.status(400).json({ error: "Array de substancias obrigatorio" });
    return;
  }
  const created = [];
  for (const sub of substancias) {
    const parsed = insertAplicacaoSubstanciaSchema.safeParse({
      ...sub,
      sessaoId: Number(req.params.id),
    });
    if (parsed.success) {
      const [item] = await db.insert(aplicacoesSubstanciasTable).values(parsed.data).returning();
      created.push(item);
    }
  }
  res.status(201).json(created);
});

router.get("/agenda/semanal", async (req, res) => {
  const { dataFrom, dataTo, unidadeId } = req.query;
  if (!dataFrom || !dataTo) {
    res.status(400).json({ error: "dataFrom e dataTo obrigatorios (YYYY-MM-DD)" });
    return;
  }
  const conditions: any[] = [
    gte(sessoesTable.dataAgendada, String(dataFrom)),
    lte(sessoesTable.dataAgendada, String(dataTo)),
  ];
  if (unidadeId) conditions.push(eq(sessoesTable.unidadeId, Number(unidadeId)));

  const sessoes = await db
    .select({
      sessao: sessoesTable,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      unidadeNome: unidadesTable.nome,
      unidadeCor: unidadesTable.cor,
      unidadeEndereco: unidadesTable.endereco,
      unidadeBairro: unidadesTable.bairro,
      unidadeCidade: unidadesTable.cidade,
      unidadeEstado: unidadesTable.estado,
      unidadeCep: unidadesTable.cep,
      profissionalNome: usuariosTable.nome,
    })
    .from(sessoesTable)
    .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
    .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
    .where(and(...conditions))
    .orderBy(sessoesTable.dataAgendada, sessoesTable.horaAgendada);

  const sessoesComAplicacoes = await Promise.all(
    sessoes.map(async (s) => {
      const aplicacoes = await db
        .select({
          aplicacao: aplicacoesSubstanciasTable,
          substanciaNome: substanciasTable.nome,
          substanciaCor: substanciasTable.cor,
          substanciaVia: substanciasTable.via,
          substanciaDuracao: substanciasTable.duracaoMinutos,
        })
        .from(aplicacoesSubstanciasTable)
        .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
        .where(eq(aplicacoesSubstanciasTable.sessaoId, s.sessao.id));
      return { ...s, aplicacoes };
    })
  );

  const porDia: Record<string, typeof sessoesComAplicacoes> = {};
  for (const s of sessoesComAplicacoes) {
    const dia = s.sessao.dataAgendada;
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(s);
  }

  res.json({ dataFrom, dataTo, dias: porDia });
});

export default router;
