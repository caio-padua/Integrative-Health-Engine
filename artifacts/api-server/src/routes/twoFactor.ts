/**
 * Wave 13 F3 — Endpoints de cadastro e validacao do 2FA TOTP.
 *
 * Fluxo de enrollment (usuario ja autenticado por senha):
 *   1) POST /usuarios/2fa/iniciar  -> gera secret + otpauth url + QR
 *      (so persiste o secret cifrado, NAO marca totp_ativado_em ainda)
 *   2) POST /usuarios/2fa/confirmar { codigo }
 *      -> valida codigo, marca totp_ativado_em + ultimo_login_2fa_em.
 *
 * Fluxo de login com 2FA ativo:
 *   1) POST /usuarios/login  -> retorna { requires2fa: true, challenge }
 *      em vez do JWT final (ver routes/usuarios.ts).
 *   2) POST /usuarios/login/2fa-verificar { challenge, codigo }
 *      -> valida o challenge curto + codigo TOTP, retorna JWT final
 *      e atualiza ultimo_login_2fa_em.
 *
 * Whitelist requirePlataforma: enrollment so e oferecido p/ tenant_admin
 * e platform_owner (perfil de plataforma >= tenant_admin). Tenant_user
 * nao precisa de 2FA nesta MVP (Wave 14 oferece toggle premium por tenant).
 */
import { Router } from "express";
import { db, usuariosTable, unidadesTable, consultorUnidadesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import QRCode from "qrcode";
import { z } from "zod";
import { signJwt, verifyJwt, type JwtPayload } from "../lib/auth/jwt";
import { bloqueioLoginSuspenso } from "../lib/email/clinicaSuspensao";
import {
  encryptTotpSecret,
  gerarNovoSegredoTotp,
  verificarCodigoTotp,
} from "../lib/auth/totp";
import { requirePlataforma } from "../middlewares/requirePlataforma";
import {
  estaBloqueadoTotp,
  registrarTentativaErradaTotp,
  resetTentativasTotp,
  TOTP_TENTATIVAS_MAX,
} from "../lib/auth/rateLimitTotp";
import { dispararAlertaBruteForceTotp } from "../lib/auth/alertaBruteForceTotp";

const router = Router();

const ConfirmarBody = z.object({ codigo: z.string().min(6).max(8) });
const VerificarLoginBody = z.object({
  challenge: z.string().min(10),
  codigo: z.string().min(6).max(8),
});

/**
 * POST /usuarios/2fa/iniciar
 * Gera (ou regenera) o segredo TOTP do usuario logado e devolve o QR code
 * em data URL pra ele escanear no app autenticador.
 *
 * IMPORTANTE: NAO marca totp_ativado_em — isso so acontece depois que o
 * usuario provar que conseguiu cadastrar o secret enviando 1 codigo valido
 * via /usuarios/2fa/confirmar.
 */
router.post(
  "/usuarios/2fa/iniciar",
  requirePlataforma("tenant_admin"),
  async (req, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Autenticacao necessaria" });
      return;
    }
    const [usuario] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, req.user.sub))
      .limit(1);
    if (!usuario) {
      res.status(404).json({ error: "Usuario nao encontrado" });
      return;
    }
    if (usuario.totpAtivadoEm) {
      res.status(409).json({
        error:
          "2FA ja esta ativo nessa conta. Pra trocar de aparelho, desative primeiro via POST /usuarios/2fa/desativar.",
      });
      return;
    }

    const enroll = gerarNovoSegredoTotp(`PAWARDS:${usuario.email}`);
    const cifrado = encryptTotpSecret(enroll.secretBase32);
    await db
      .update(usuariosTable)
      .set({ totpSecretCifrado: cifrado })
      .where(eq(usuariosTable.id, usuario.id));

    const qrCodeDataUrl = await QRCode.toDataURL(enroll.otpauthUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 256,
    });

    res.json({
      otpauthUrl: enroll.otpauthUrl,
      secretBase32: enroll.secretBase32,
      qrCodeDataUrl,
      instrucoes:
        "Escaneie o QR no Google Authenticator / Authy / 1Password / Bitwarden e depois confirme com 1 codigo de 6 digitos em POST /usuarios/2fa/confirmar.",
    });
  },
);

/**
 * POST /usuarios/2fa/confirmar { codigo }
 * Confirma que o usuario conseguiu cadastrar o secret no app autenticador.
 * Marca totp_ativado_em (gate de login passa a exigir TOTP) e ja considera
 * essa confirmacao como o primeiro login 2fa (ultimo_login_2fa_em = now).
 */
router.post(
  "/usuarios/2fa/confirmar",
  requirePlataforma("tenant_admin"),
  async (req, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Autenticacao necessaria" });
      return;
    }
    const parsed = ConfirmarBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [usuario] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, req.user.sub))
      .limit(1);
    if (!usuario || !usuario.totpSecretCifrado) {
      res.status(409).json({
        error:
          "Nenhum enrollment pendente. Chame POST /usuarios/2fa/iniciar primeiro.",
      });
      return;
    }
    if (usuario.totpAtivadoEm) {
      res.status(409).json({ error: "2FA ja confirmado." });
      return;
    }
    if (!verificarCodigoTotp(usuario.totpSecretCifrado, parsed.data.codigo)) {
      res.status(401).json({ error: "Codigo invalido." });
      return;
    }
    const agora = new Date();
    await db
      .update(usuariosTable)
      .set({ totpAtivadoEm: agora, ultimoLogin2faEm: agora })
      .where(eq(usuariosTable.id, usuario.id));
    res.json({ ok: true, totpAtivadoEm: agora.toISOString() });
  },
);

/**
 * POST /usuarios/2fa/desativar { codigo }
 * Desativa o 2FA (zera secret + flags). Exige codigo valido pra evitar
 * que um session hijack desligue o 2FA do dono da conta.
 */
router.post(
  "/usuarios/2fa/desativar",
  requirePlataforma("tenant_admin"),
  async (req, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Autenticacao necessaria" });
      return;
    }
    const parsed = ConfirmarBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [usuario] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, req.user.sub))
      .limit(1);
    if (!usuario || !usuario.totpSecretCifrado || !usuario.totpAtivadoEm) {
      res.status(409).json({ error: "2FA nao esta ativo." });
      return;
    }
    if (!verificarCodigoTotp(usuario.totpSecretCifrado, parsed.data.codigo)) {
      res.status(401).json({ error: "Codigo invalido." });
      return;
    }
    await db
      .update(usuariosTable)
      .set({ totpSecretCifrado: null, totpAtivadoEm: null })
      .where(eq(usuariosTable.id, usuario.id));
    res.json({ ok: true });
  },
);

/**
 * POST /usuarios/login/2fa-verificar { challenge, codigo }  (PUBLICO)
 * Segunda etapa do login: troca o challenge curto (5min) + codigo TOTP
 * pelo JWT de sessao real. Sem 2FA valido, nao ha JWT.
 */
router.post("/usuarios/login/2fa-verificar", async (req, res): Promise<void> => {
  const parsed = VerificarLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let payload: JwtPayload;
  try {
    payload = verifyJwt(parsed.data.challenge);
  } catch {
    res.status(401).json({ error: "Challenge invalido ou expirado." });
    return;
  }
  if (payload.twoFactorChallenge !== true) {
    res.status(401).json({ error: "Challenge nao e de 2FA." });
    return;
  }
  if (await estaBloqueadoTotp(payload.sub)) {
    res.status(429).json({
      error:
        "Muitas tentativas erradas. Aguarde 5 minutos e tente novamente.",
    });
    return;
  }

  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(eq(usuariosTable.id, payload.sub))
    .limit(1);
  if (!usuario || !usuario.totpSecretCifrado || !usuario.totpAtivadoEm) {
    res.status(401).json({ error: "Usuario nao tem 2FA ativo." });
    return;
  }
  if (!verificarCodigoTotp(usuario.totpSecretCifrado, parsed.data.codigo)) {
    const r = await registrarTentativaErradaTotp(usuario.id);
    if (r.transicaoParaBloqueio) {
      // Task #143 — fire-and-forget. Helper e defensivo (nunca lanca).
      void dispararAlertaBruteForceTotp({
        usuarioId: usuario.id,
        ip: (req.ip || req.header("x-forwarded-for") || "").toString().slice(0, 200),
        userAgent: (req.header("user-agent") || "").slice(0, 500),
        janelaInicioEm: r.janelaInicioEm,
        contexto: "LOGIN_2FA",
        tentativas: TOTP_TENTATIVAS_MAX,
      });
    }
    res.status(401).json({ error: "Codigo invalido." });
    return;
  }
  await resetTentativasTotp(usuario.id);

  // Task #126 — bloqueia entrada se a clinica do usuario estiver SUSPENSA.
  // Mesmo apos validar 2FA o login nao prossegue. platform_owner passa.
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

  const agora = new Date();
  await db
    .update(usuariosTable)
    .set({ ultimoLogin2faEm: agora })
    .where(eq(usuariosTable.id, usuario.id));

  const vinculosConsultor = await db
    .select({
      unidadeId: consultorUnidadesTable.unidadeId,
      unidadeNome: unidadesTable.nome,
      unidadeCor: unidadesTable.cor,
    })
    .from(consultorUnidadesTable)
    .leftJoin(unidadesTable, eq(consultorUnidadesTable.unidadeId, unidadesTable.id))
    .where(
      and(
        eq(consultorUnidadesTable.usuarioId, usuario.id),
        eq(consultorUnidadesTable.ativo, true),
      ),
    );

  const token = signJwt({
    sub: usuario.id,
    email: usuario.email,
    perfil: usuario.perfil,
    escopo: usuario.escopo ?? null,
    unidadeId: usuario.unidadeId ?? null,
    consultoriaId: usuario.consultoriaId ?? null,
    perfilPlataforma: usuario.perfilPlataforma ?? "tenant_user",
  });

  const { senha: _s, totpSecretCifrado: _ts, ...safe } = usuario;
  res.json({
    token,
    usuario: { ...safe, unidadesVinculadas: vinculosConsultor },
  });
});

export default router;
