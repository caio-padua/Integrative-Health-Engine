import { Router } from "express";
import { db, usuariosTable, unidadesTable, consultorUnidadesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CriarUsuarioBody, LoginUsuarioBody } from "@workspace/api-zod";
import { signJwt } from "../lib/auth/jwt";
import { bloqueioLoginSuspenso } from "../lib/email/clinicaSuspensao";
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

  // Task #126 — bloqueio explicito de login para clinicas suspensas.
  // platform_owner sem unidadeId NAO e bloqueado (precisa logar pra reativar).
  if (usuario.unidadeId) {
    const [unidade] = await db
      .select({
        nome: unidadesTable.nome,
        status: unidadesTable.status,
        suspensoEm: unidadesTable.suspensoEm,
        suspensaoMotivo: unidadesTable.suspensaoMotivo,
      })
      .from(unidadesTable)
      .where(eq(unidadesTable.id, usuario.unidadeId));
    if (unidade && unidade.status === "SUSPENSO" && usuario.perfilPlataforma !== "platform_owner") {
      res.status(403).json(bloqueioLoginSuspenso(unidade));
      return;
    }
  }

  // Wave 13 F3 — FAIL-CLOSED: se o usuario tem totpAtivadoEm marcado, login
  // SO pode prosseguir via fluxo 2FA. Estado inconsistente (ativado sem
  // secret) bloqueia totalmente em vez de cair pro password-only — assim
  // nenhum bug de admin/migration vira bypass silencioso de 2FA.
  if (usuario.totpAtivadoEm && !usuario.totpSecretCifrado) {
    res.status(500).json({
      error:
        "Conta com 2FA ativo mas sem segredo cadastrado. Procure o suporte pra reset manual — login bloqueado por seguranca.",
    });
    return;
  }
  // Se o usuario ja confirmou 2FA, NAO devolve JWT final aqui. Devolve um
  // challenge curto (5min) que o cliente troca em
  // POST /usuarios/login/2fa-verificar { challenge, codigo } pelo JWT real.
  if (usuario.totpAtivadoEm && usuario.totpSecretCifrado) {
    const challenge = signJwt(
      {
        sub: usuario.id,
        email: usuario.email,
        perfil: usuario.perfil,
        escopo: usuario.escopo ?? null,
        unidadeId: usuario.unidadeId ?? null,
        consultoriaId: usuario.consultoriaId ?? null,
        perfilPlataforma: usuario.perfilPlataforma ?? "tenant_user",
        twoFactorChallenge: true,
      },
      5 * 60,
    );
    res.json({
      requires2fa: true,
      challenge,
      proximoPasso: "POST /usuarios/login/2fa-verificar { challenge, codigo }",
    });
    return;
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
    perfilPlataforma: usuario.perfilPlataforma ?? "tenant_user",
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
      perfilPlataforma: usuariosTable.perfilPlataforma,
      telefone: usuariosTable.telefone,
      unidadeId: usuariosTable.unidadeId,
      consultoriaId: usuariosTable.consultoriaId,
      unidadeNome: unidadesTable.nome,
      ativo: usuariosTable.ativo,
      criadoEm: usuariosTable.criadoEm,
      // Task #130: usado pelo banner de aviso 2FA no painel /plataforma/*
      // pra mostrar countdown antes da janela de 8h expirar.
      ultimoLogin2faEm: usuariosTable.ultimoLogin2faEm,
      // Task #122: usado pela tela /perfil/seguranca-2fa pra decidir se
      // mostra o fluxo de cadastro (inativo) ou o de "Ativo em <data>
      // + Desativar". Sem esse campo a tela sempre renderiza inativo.
      totpAtivadoEm: usuariosTable.totpAtivadoEm,
      // Task #173 — timestamp do ultimo aviso de expiracao 2FA enviado
      // pelo worker (Migration 047). UI /plataforma/perfil mostra
      // "Ultimo aviso enviado: <data/hora relativa>" pro owner confirmar
      // que a preferencia de canais funciona e o worker esta vivo.
      ultimoAviso2faEm: usuariosTable.ultimoAviso2faEm,
      // Task #159 — preferencia de canais pra aviso de expiracao 2FA
      // (usado pela tela /plataforma/perfil pra mostrar o estado atual).
      canaisAviso2fa: usuariosTable.canaisAviso2fa,
      // Task #123 — codigos de recuperacao 2FA (lista de hashes bcrypt).
      // A UI so usa a CONTAGEM de nao-usados (X de N restantes) — nunca
      // os hashes em si. Mapeamos pra `codigosRecuperacao2faRestantes`
      // logo abaixo antes de devolver pro cliente.
      codigosRecuperacao2fa: usuariosTable.codigosRecuperacao2fa,
      totpAtivadoEm: usuariosTable.totpAtivadoEm,
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

  // Task #123 — projeta a contagem de codigos restantes em vez de devolver
  // os hashes bcrypt (nada util pro cliente e expoe estrutura interna).
  const codigosRaw = (usuario as any).codigosRecuperacao2fa as
    | Array<{ usadoEm: string | null }>
    | null
    | undefined;
  const codigosRecuperacao2faRestantes = Array.isArray(codigosRaw)
    ? codigosRaw.filter((c) => c && !c.usadoEm).length
    : 0;
  const codigosRecuperacao2faTotal = Array.isArray(codigosRaw) ? codigosRaw.length : 0;
  const { codigosRecuperacao2fa: _omitir, ...sanitizado } = usuario as any;

  res.json({
    ...sanitizado,
    unidadesVinculadas,
    codigosRecuperacao2faRestantes,
    codigosRecuperacao2faTotal,
  });
});

const PERFIS_ADMIN = new Set(["validador_mestre", "consultoria_master"]);
function isAdmin(req: any): boolean {
  return !!req.user && (PERFIS_ADMIN.has(req.user.perfil) || req.user.escopo === "consultoria_master");
}

// Task #159 — PATCH dedicado pra preferencia de canais de aviso 2FA do
// platform_owner. Isolado do PUT /usuarios/:id pra evitar misturar com
// SELF_FIELDS (e o owner editando a propria preferencia, nao um campo
// cadastral). Aceita "email" e "whatsapp" — array vazio = mudo (so o
// banner in-app da Task #130 avisa). Sempre normaliza removendo dupes
// e valores invalidos.
router.patch("/usuarios/me/canais-aviso-2fa", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Nao autenticado" }); return; }
  // Hardening pos-code-review: a preferencia so faz sentido pra
  // platform_owner (o worker filtra por esse perfil antes de disparar).
  // Bloqueia escrita pra evitar drift silencioso em outras contas.
  if (req.user.perfilPlataforma !== "platform_owner") {
    res.status(403).json({
      error: "Preferencia de aviso 2FA e exclusiva do platform_owner.",
      perfil_minimo: "platform_owner",
    });
    return;
  }
  const body = req.body as { canaisAviso2fa?: unknown };
  if (!Array.isArray(body.canaisAviso2fa)) {
    res.status(400).json({ error: "canaisAviso2fa deve ser array" });
    return;
  }
  // Task #172 — "telegram" aceito como terceiro canal opt-in.
  const VALIDOS = new Set(["email", "whatsapp", "telegram"]);
  const canais = Array.from(
    new Set(
      body.canaisAviso2fa
        .filter((c): c is string => typeof c === "string")
        .filter((c) => VALIDOS.has(c)),
    ),
  );
  try {
    const [updated] = await db
      .update(usuariosTable)
      .set({ canaisAviso2fa: canais })
      .where(eq(usuariosTable.id, req.user.sub))
      .returning({ canaisAviso2fa: usuariosTable.canaisAviso2fa });
    if (!updated) { res.status(404).json({ error: "Usuario nao encontrado" }); return; }
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro interno" });
  }
});

// Task #186 — historico dos ultimos avisos 2FA enviados ao proprio usuario
// (versao self-service da rota /plataforma/seguranca/avisos-2fa, que e
// global e exige guardas de seguranca). Devolve as ultimas N janelas
// (default 10) com canais usados, expiracao e renovacao, pra UI
// /plataforma/perfil exibir uma mini-tabela "Ultimos avisos" abaixo do
// banner "Ultimo aviso enviado" (Task #173) — visao historica do
// comportamento do worker e debug por canal.
router.get("/usuarios/me/historico-avisos-2fa", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Nao autenticado" }); return; }
  const limiteRaw = Number(req.query["limite"] ?? 10);
  const limite = Math.min(Math.max(Number.isFinite(limiteRaw) ? limiteRaw : 10, 1), 50);
  const result = await db.execute(sql`
    SELECT
      h.id,
      h.ultimo_login_2fa_em,
      h.aviso_em,
      h.expira_em,
      h.renovado_em,
      h.canal_email_ok,
      h.canal_whatsapp_ok,
      CASE
        WHEN h.renovado_em IS NOT NULL THEN 'renovado'
        WHEN h.expira_em <= now()      THEN 'expirou'
        ELSE 'ignorado'
      END AS status
    FROM historico_avisos_2fa_owner h
    WHERE h.usuario_id = ${req.user.sub}
    ORDER BY h.aviso_em DESC
    LIMIT ${limite}
  `);
  res.json({ avisos: result.rows ?? [] });
});

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
