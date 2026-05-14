/**
 * Task #202 — Listagem e revogacao de sessoes JWT ativas do proprio usuario.
 *
 * Antes desta task o unico botao de "logout" disponivel pra um usuario que
 * perdeu o celular do 2FA ou trocou de aparelho era abrir chamado pra suporte
 * (que entao bumpa tokens_invalidos_apos via Task #154 e mata TUDO, inclusive
 * a sessao que o admin esta usando agora). Com este endpoint o proprio dono
 * (e os tenant_admin) ven cada sessao ativa (user-agent + IP + ultimo uso)
 * e revogam individualmente.
 *
 * Rotas:
 *   GET    /usuarios/sessoes-ativas          -> lista as sessoes do req.user.sub
 *   DELETE /usuarios/sessoes-ativas/:id      -> revoga UMA sessao do req.user.sub
 *
 * Escopo: cada usuario so pode listar/revogar as proprias sessoes (where
 * usuario_id = req.user.sub). Para "matar tudo" ainda existe o kill-switch
 * global via /api/plataforma/usuarios/:id/forcar-logout (Task #154).
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { sessoesJwtTable } from "@workspace/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

const router = Router();

router.get("/usuarios/sessoes-ativas", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }
  const usuarioId = Number(req.user.sub);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    res.status(400).json({ error: "Sessao sem usuario valido" });
    return;
  }

  const agora = new Date();
  const linhas = await db
    .select({
      id: sessoesJwtTable.id,
      jti: sessoesJwtTable.jti,
      userAgent: sessoesJwtTable.userAgent,
      ip: sessoesJwtTable.ip,
      criadaEm: sessoesJwtTable.criadaEm,
      ultimoUsoEm: sessoesJwtTable.ultimoUsoEm,
      expiraEm: sessoesJwtTable.expiraEm,
      revogadaEm: sessoesJwtTable.revogadaEm,
    })
    .from(sessoesJwtTable)
    .where(
      and(
        eq(sessoesJwtTable.usuarioId, usuarioId),
        isNull(sessoesJwtTable.revogadaEm),
      ),
    )
    .orderBy(desc(sessoesJwtTable.ultimoUsoEm));

  // Filtra expiradas (compat caso vire job de housekeeping no futuro).
  const ativas = linhas.filter((l) => l.expiraEm.getTime() > agora.getTime());

  // Marca a sessao atual (mesmo jti do JWT em uso) — UI usa pra desabilitar
  // o botao "Encerrar" (encerrar a propria seria efetivamente logout).
  const jtiAtual = req.user.jti;
  res.json({
    sessoes: ativas.map((s) => ({
      ...s,
      atual: !!jtiAtual && s.jti === jtiAtual,
    })),
  });
});

router.delete("/usuarios/sessoes-ativas/:id", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }
  const usuarioId = Number(req.user.sub);
  const sessaoId = Number(req.params.id);
  if (!Number.isInteger(sessaoId) || sessaoId <= 0) {
    res.status(400).json({ error: "id invalido" });
    return;
  }

  const [sessao] = await db
    .select()
    .from(sessoesJwtTable)
    .where(
      and(
        eq(sessoesJwtTable.id, sessaoId),
        eq(sessoesJwtTable.usuarioId, usuarioId),
      ),
    )
    .limit(1);

  if (!sessao) {
    res.status(404).json({ error: "Sessao nao encontrada" });
    return;
  }
  if (sessao.revogadaEm) {
    res.json({ ok: true, jaRevogada: true });
    return;
  }

  await db
    .update(sessoesJwtTable)
    .set({
      revogadaEm: new Date(),
      revogadaMotivo: "encerrada_pelo_usuario",
    })
    .where(eq(sessoesJwtTable.id, sessaoId));

  res.json({ ok: true });
});

export default router;
