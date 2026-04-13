import { Router } from "express";
import { db, usuariosTable, unidadesTable, consultorUnidadesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CriarUsuarioBody, LoginUsuarioBody } from "@workspace/api-zod";

const router = Router();

router.get("/usuarios", async (req, res): Promise<void> => {
  const perfil = req.query.perfil as string | undefined;
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  let usuarios = await db
    .select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      email: usuariosTable.email,
      perfil: usuariosTable.perfil,
      escopo: usuariosTable.escopo,
      unidadeId: usuariosTable.unidadeId,
      unidadeNome: unidadesTable.nome,
      consultoriaId: usuariosTable.consultoriaId,
      crm: usuariosTable.crm,
      cpf: usuariosTable.cpf,
      cns: usuariosTable.cns,
      especialidade: usuariosTable.especialidade,
      telefone: usuariosTable.telefone,
      ativo: usuariosTable.ativo,
      podeValidar: usuariosTable.podeValidar,
      podeAssinar: usuariosTable.podeAssinar,
      podeBypass: usuariosTable.podeBypass,
      nuncaOpera: usuariosTable.nuncaOpera,
      criadoEm: usuariosTable.criadoEm,
    })
    .from(usuariosTable)
    .leftJoin(unidadesTable, eq(usuariosTable.unidadeId, unidadesTable.id));

  if (perfil) {
    usuarios = usuarios.filter(u => u.perfil === perfil);
  }
  if (unidadeId) {
    usuarios = usuarios.filter(u => u.unidadeId === unidadeId);
  }

  res.json(usuarios);
});

router.post("/usuarios", async (req, res): Promise<void> => {
  const parsed = CriarUsuarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [usuario] = await db.insert(usuariosTable).values(parsed.data).returning();
  const { senha: _senha, ...safeUsuario } = usuario;
  res.status(201).json(safeUsuario);
});

router.post("/usuarios/login", async (req, res): Promise<void> => {
  const parsed = LoginUsuarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, senha } = parsed.data;
  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(and(eq(usuariosTable.email, email), eq(usuariosTable.senha, senha)));
  if (!usuario) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }
  const { senha: _senha, ...safeUsuario } = usuario;

  const vinculosConsultor = await db
    .select({ unidadeId: consultorUnidadesTable.unidadeId, unidadeNome: unidadesTable.nome, unidadeCor: unidadesTable.cor })
    .from(consultorUnidadesTable)
    .leftJoin(unidadesTable, eq(consultorUnidadesTable.unidadeId, unidadesTable.id))
    .where(and(eq(consultorUnidadesTable.usuarioId, usuario.id), eq(consultorUnidadesTable.ativo, true)));

  res.json({
    token: `token-${usuario.id}-${Date.now()}`,
    usuario: { ...safeUsuario, unidadesVinculadas: vinculosConsultor },
  });
});

router.get("/usuarios/perfil-atual", async (_req, res): Promise<void> => {
  const [usuario] = await db
    .select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      email: usuariosTable.email,
      perfil: usuariosTable.perfil,
      escopo: usuariosTable.escopo,
      unidadeId: usuariosTable.unidadeId,
      consultoriaId: usuariosTable.consultoriaId,
      unidadeNome: unidadesTable.nome,
      ativo: usuariosTable.ativo,
      criadoEm: usuariosTable.criadoEm,
    })
    .from(usuariosTable)
    .leftJoin(unidadesTable, eq(usuariosTable.unidadeId, unidadesTable.id))
    .where(eq(usuariosTable.perfil, "validador_mestre"))
    .limit(1);
  if (!usuario) {
    res.status(404).json({ error: "Nenhum usuário encontrado" });
    return;
  }

  let unidadesVinculadas: { unidadeId: number; unidadeNome: string | null; unidadeCor: string | null }[];

  if (usuario.escopo === "consultoria_master") {
    const vinculos = await db.selectDistinct({ unidadeId: consultorUnidadesTable.unidadeId }).from(consultorUnidadesTable);
    const idsConsultoria = vinculos.map(v => v.unidadeId);
    const todasUnidades = await db.select({ unidadeId: unidadesTable.id, unidadeNome: unidadesTable.nome, unidadeCor: unidadesTable.cor }).from(unidadesTable);
    unidadesVinculadas = idsConsultoria.length > 0
      ? todasUnidades.filter(u => idsConsultoria.includes(u.unidadeId))
      : todasUnidades;
  } else {
    unidadesVinculadas = await db
      .select({ unidadeId: consultorUnidadesTable.unidadeId, unidadeNome: unidadesTable.nome, unidadeCor: unidadesTable.cor })
      .from(consultorUnidadesTable)
      .leftJoin(unidadesTable, eq(consultorUnidadesTable.unidadeId, unidadesTable.id))
      .where(and(eq(consultorUnidadesTable.usuarioId, usuario.id), eq(consultorUnidadesTable.ativo, true)));
  }

  res.json({ ...usuario, unidadesVinculadas });
});

router.put("/usuarios/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "ID invalido" }); return; }
  const allowedFields = ["nome", "email", "perfil", "unidadeId", "ativo", "escopo", "consultoriaId", "crm", "cpf", "cns", "especialidade", "telefone", "podeValidar", "podeAssinar", "podeBypass", "nuncaOpera"];
  const updateData: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updateData[key] = req.body[key];
  }
  if (req.body.senha && req.body.senha.trim().length >= 6) {
    updateData.senha = req.body.senha;
  }
  try {
    const [updated] = await db.update(usuariosTable).set(updateData).where(eq(usuariosTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Usuario nao encontrado" }); return; }
    const { senha: _s, ...safe } = updated;
    res.json(safe);
  } catch (e: any) { res.status(500).json({ error: e.message || "Erro interno" }); }
});

router.delete("/usuarios/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "ID invalido" }); return; }
  try {
    const [deleted] = await db.delete(usuariosTable).where(eq(usuariosTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Usuario nao encontrado" }); return; }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message || "Erro interno" }); }
});

export default router;
