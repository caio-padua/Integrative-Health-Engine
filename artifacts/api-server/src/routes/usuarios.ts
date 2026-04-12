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
      unidadeId: usuariosTable.unidadeId,
      unidadeNome: unidadesTable.nome,
      ativo: usuariosTable.ativo,
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
    const todasUnidades = await db.select({ unidadeId: unidadesTable.id, unidadeNome: unidadesTable.nome, unidadeCor: unidadesTable.cor }).from(unidadesTable);
    unidadesVinculadas = todasUnidades;
  } else {
    unidadesVinculadas = await db
      .select({ unidadeId: consultorUnidadesTable.unidadeId, unidadeNome: unidadesTable.nome, unidadeCor: unidadesTable.cor })
      .from(consultorUnidadesTable)
      .leftJoin(unidadesTable, eq(consultorUnidadesTable.unidadeId, unidadesTable.id))
      .where(and(eq(consultorUnidadesTable.usuarioId, usuario.id), eq(consultorUnidadesTable.ativo, true)));
  }

  res.json({ ...usuario, unidadesVinculadas });
});

export default router;
