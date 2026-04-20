import { Router } from "express";
import { db, usuariosTable, unidadesTable, consultorUnidadesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CriarUsuarioBody, LoginUsuarioBody } from "@workspace/api-zod";
import { signJwt } from "../lib/auth/jwt";
import bcrypt from "bcryptjs";

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
  if (!req.user || !(["validador_mestre", "consultoria_master"].includes(req.user.perfil) || req.user.escopo === "consultoria_master")) {
    res.status(403).json({ error: "Apenas admin pode criar usuarios" });
    return;
  }
  const parsed = CriarUsuarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = { ...parsed.data };
  if (data.senha && !data.senha.startsWith("$2")) {
    data.senha = await bcrypt.hash(data.senha, 10);
  }
  const [usuario] = await db.insert(usuariosTable).values(data).returning();
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
    .where(eq(usuariosTable.email, email));
  if (!usuario || !usuario.senha) {
    res.status(401).json({ error: "Credenciais invalidas" });
    return;
  }
  const isHash = usuario.senha.startsWith("$2");
  const senhaOk = isHash
    ? await bcrypt.compare(senha, usuario.senha)
    : usuario.senha === senha;
  if (!senhaOk) {
    res.status(401).json({ error: "Credenciais invalidas" });
    return;
  }
  if (!isHash) {
    const hashed = await bcrypt.hash(senha, 10);
    await db.update(usuariosTable).set({ senha: hashed }).where(eq(usuariosTable.id, usuario.id));
  }
  const { senha: _senha, ...safeUsuario } = usuario;

  const vinculosConsultor = await db
    .select({ unidadeId: consultorUnidadesTable.unidadeId, unidadeNome: unidadesTable.nome, unidadeCor: unidadesTable.cor })
    .from(consultorUnidadesTable)
    .leftJoin(unidadesTable, eq(consultorUnidadesTable.unidadeId, unidadesTable.id))
    .where(and(eq(consultorUnidadesTable.usuarioId, usuario.id), eq(consultorUnidadesTable.ativo, true)));

  const token = signJwt({
    sub: usuario.id,
    email: usuario.email,
    perfil: usuario.perfil,
    escopo: usuario.escopo ?? null,
    unidadeId: usuario.unidadeId ?? null,
    consultoriaId: usuario.consultoriaId ?? null,
  });

  res.json({
    token,
    usuario: { ...safeUsuario, unidadesVinculadas: vinculosConsultor },
  });
});

router.get("/usuarios/perfil-atual", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }
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
    .where(eq(usuariosTable.id, req.user.sub))
    .limit(1);
  if (!usuario) {
    res.status(404).json({ error: "Usuario nao encontrado" });
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

const PERFIS_ADMIN = new Set(["validador_mestre", "consultoria_master"]);
function isAdmin(req: any): boolean {
  return !!req.user && (PERFIS_ADMIN.has(req.user.perfil) || req.user.escopo === "consultoria_master");
}

router.put("/usuarios/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "ID invalido" }); return; }
  if (!req.user) { res.status(401).json({ error: "Nao autenticado" }); return; }
  const isSelf = req.user.sub === id;
  const admin = isAdmin(req);
  if (!isSelf && !admin) { res.status(403).json({ error: "Sem permissao para alterar este usuario" }); return; }

  // Campos seguros para o proprio usuario alterar (sem escalada de privilegio)
  const SELF_FIELDS = ["nome", "telefone", "crm", "cpf", "cns", "especialidade"];
  // Campos so admin pode alterar (perfil, escopo, unidade, flags de permissao)
  const ADMIN_ONLY_FIELDS = ["email", "perfil", "unidadeId", "ativo", "escopo", "consultoriaId", "podeValidar", "podeAssinar", "podeBypass", "nuncaOpera"];
  const allowed = admin ? [...SELF_FIELDS, ...ADMIN_ONLY_FIELDS] : SELF_FIELDS;
  const updateData: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updateData[key] = req.body[key];
  }

  // Senha so via troca explicita: exige senha_atual (ou admin pode resetar a propria, nao a de outros)
  if (req.body.senha && typeof req.body.senha === "string" && req.body.senha.trim().length >= 6) {
    if (!isSelf) {
      res.status(403).json({ error: "Senha de outro usuario so via fluxo de reset (nao implementado)" });
      return;
    }
    if (!req.body.senhaAtual) {
      res.status(400).json({ error: "Para alterar senha, envie senhaAtual" });
      return;
    }
    const [u] = await db.select().from(usuariosTable).where(eq(usuariosTable.id, id));
    if (!u || !u.senha) { res.status(404).json({ error: "Usuario nao encontrado" }); return; }
    const ok = u.senha.startsWith("$2")
      ? await bcrypt.compare(req.body.senhaAtual, u.senha)
      : u.senha === req.body.senhaAtual;
    if (!ok) { res.status(401).json({ error: "Senha atual incorreta" }); return; }
    updateData.senha = await bcrypt.hash(req.body.senha, 10);
  }

  if (Object.keys(updateData).length === 0) { res.status(400).json({ error: "Nada a atualizar" }); return; }

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
  if (!isAdmin(req)) { res.status(403).json({ error: "Apenas admin pode excluir usuarios" }); return; }
  if (req.user && req.user.sub === id) { res.status(400).json({ error: "Nao pode excluir a si mesmo" }); return; }
  try {
    const [deleted] = await db.delete(usuariosTable).where(eq(usuariosTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Usuario nao encontrado" }); return; }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message || "Erro interno" }); }
});


export default router;
