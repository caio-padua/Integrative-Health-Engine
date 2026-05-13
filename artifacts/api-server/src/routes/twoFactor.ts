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
import {
  CODIGOS_RECUPERACAO_TOTAL,
  contarCodigosRestantes,
  gerarCodigosRecuperacao,
  pareceCodigoRecuperacao,
  tentarConsumirCodigoRecuperacao,
  type CodigoRecuperacaoArmazenado,
} from "../lib/auth/recoveryCodes";
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
// Task #123 — codigo pode ser TOTP de 6 digitos OU codigo de recuperacao
// formato XXXX-XXXX (8 chars + 1 hifen = 9), com folga pra espacos/lowercase
// que normalizamos antes de comparar.
const VerificarLoginBody = z.object({
  challenge: z.string().min(10),
  codigo: z.string().min(6).max(20),
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
    // Task #123 — gera N codigos de recuperacao novos junto com o secret.
    // Mostrados UMA UNICA VEZ aqui — depois sao bcrypt-hashed no DB.
    const recuperacao = await gerarCodigosRecuperacao();
    await db
      .update(usuariosTable)
      .set({
        totpSecretCifrado: cifrado,
        codigosRecuperacao2fa: recuperacao.armazenaveis,
      })
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
      codigosRecuperacao: recuperacao.planos,
      codigosRecuperacaoAviso:
        "Guarde estes codigos em local seguro (gerenciador de senhas, papel num cofre). Cada codigo e de uso unico e serve pra entrar caso voce perca o celular do app autenticador. Eles NAO serao mostrados de novo — se perder, gere novos via POST /usuarios/2fa/regenerar-codigos-recuperacao.",
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
 * POST /usuarios/2fa/reverificar { codigo }  (Task #124)
 * Step-up genérico de 2FA pro usuário logado: valida o código TOTP e
 * atualiza `ultimo_login_2fa_em = now()` SEM emitir novo JWT. Usado pelo
 * frontend quando o middleware `require2faRecente` devolve 403 com
 * `requer_reverificacao_2fa: true` e abre o modal pedindo o código.
 *
 * Espelha a lógica de /plataforma/2fa/step-up (Task #125) — mas exposto
 * em /usuarios/* pra que qualquer perfil com 2FA ativo possa renovar a
 * janela de 8h sem precisar deslogar.
 */
const ReverificarBody = z.object({
  codigo: z.string().regex(/^\d{6}$/, "codigo deve ter exatamente 6 digitos"),
});
router.post(
  "/usuarios/2fa/reverificar",
  async (req, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Autenticacao necessaria" });
      return;
    }
    const parsed = ReverificarBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "codigo invalido (6 digitos)" });
      return;
    }
    const userId = Number(req.user.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ error: "Token sem identidade valida" });
      return;
    }
    const [usuario] = await db
      .select()
      .from(usuariosTable)
      .where(eq(usuariosTable.id, userId))
      .limit(1);
    if (!usuario || !usuario.totpSecretCifrado || !usuario.totpAtivadoEm) {
      res.status(409).json({
        error: "Usuario nao tem 2FA ativo. Faca o enrollment em /usuarios/2fa/iniciar.",
        codigo: "2FA_NAO_ATIVO",
      });
      return;
    }
    if (await estaBloqueadoTotp(userId)) {
      res.status(429).json({
        error: "Muitas tentativas erradas. Aguarde 5 minutos e tente novamente.",
        codigo: "TOTP_RATE_LIMITED",
      });
      return;
    }
    if (!verificarCodigoTotp(usuario.totpSecretCifrado, parsed.data.codigo)) {
      const r = await registrarTentativaErradaTotp(userId);
      if (r.transicaoParaBloqueio) {
        void dispararAlertaBruteForceTotp({
          usuarioId: userId,
          ip: (req.ip || req.header("x-forwarded-for") || "").toString().slice(0, 200),
          userAgent: (req.header("user-agent") || "").slice(0, 500),
          janelaInicioEm: r.janelaInicioEm,
          contexto: "REVERIFICAR_ACAO_DESTRUTIVA",
          tentativas: TOTP_TENTATIVAS_MAX,
        });
      }
      res.status(401).json({ error: "Codigo invalido.", codigo: "TOTP_INVALIDO" });
      return;
    }
    await resetTentativasTotp(userId);
    const agora = new Date();
    await db
      .update(usuariosTable)
      .set({ ultimoLogin2faEm: agora })
      .where(eq(usuariosTable.id, usuario.id));
    res.json({ ok: true, ultimo_2fa_em: agora.toISOString() });
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
      .set({
        totpSecretCifrado: null,
        totpAtivadoEm: null,
        // Task #123 — desativar 2FA invalida tambem os codigos de recuperacao.
        codigosRecuperacao2fa: [],
      })
      .where(eq(usuariosTable.id, usuario.id));
    res.json({ ok: true });
  },
);

/**
 * POST /usuarios/2fa/regenerar-codigos-recuperacao { codigo }
 * Task #123 — regera os N codigos de recuperacao 2FA. Invalida todos os
 * anteriores (usados ou nao). Exige codigo TOTP valido pra evitar que um
 * session hijack roube codigos novos. Mostra os novos UMA UNICA VEZ.
 */
router.post(
  "/usuarios/2fa/regenerar-codigos-recuperacao",
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
      res.status(409).json({ error: "2FA nao esta ativo nessa conta." });
      return;
    }
    if (!verificarCodigoTotp(usuario.totpSecretCifrado, parsed.data.codigo)) {
      res.status(401).json({ error: "Codigo invalido." });
      return;
    }
    const recuperacao = await gerarCodigosRecuperacao();
    await db
      .update(usuariosTable)
      .set({ codigosRecuperacao2fa: recuperacao.armazenaveis })
      .where(eq(usuariosTable.id, usuario.id));
    res.json({
      ok: true,
      codigosRecuperacao: recuperacao.planos,
      total: CODIGOS_RECUPERACAO_TOTAL,
      aviso:
        "Os codigos antigos foram invalidados. Guarde estes novos em local seguro — nao serao mostrados de novo.",
    });
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

  // Task #123 — aceita TOTP de 6 digitos OU codigo de recuperacao XXXX-XXXX.
  // Se o input parece codigo de recuperacao (>=8 chars com letras), tenta
  // consumir um da lista. Se nao, valida como TOTP. Codigo de recuperacao
  // consumido marca `usadoEm` na lista jsonb (UPDATE com lista nova).
  let autenticou = false;
  let usouCodigoRecuperacao = false;
  let codigosRecuperacaoRestantesAposLogin =
    contarCodigosRestantes(usuario.codigosRecuperacao2fa);

  if (pareceCodigoRecuperacao(parsed.data.codigo)) {
    const armazenados =
      (usuario.codigosRecuperacao2fa as CodigoRecuperacaoArmazenado[] | null) ?? [];
    const r = await tentarConsumirCodigoRecuperacao(
      armazenados,
      parsed.data.codigo,
    );
    if (r.consumido) {
      await db
        .update(usuariosTable)
        .set({ codigosRecuperacao2fa: r.atualizados })
        .where(eq(usuariosTable.id, usuario.id));
      autenticou = true;
      usouCodigoRecuperacao = true;
      codigosRecuperacaoRestantesAposLogin = contarCodigosRestantes(r.atualizados);
    }
  } else if (verificarCodigoTotp(usuario.totpSecretCifrado, parsed.data.codigo)) {
    autenticou = true;
  }

  if (!autenticou) {
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

  const { senha: _s, totpSecretCifrado: _ts, codigosRecuperacao2fa: _cr, ...safe } = usuario;
  res.json({
    token,
    usuario: {
      ...safe,
      unidadesVinculadas: vinculosConsultor,
      // Task #123 — devolve a contagem de codigos restantes pra UI poder
      // alertar quando o usuario consumiu um (ex: "Voce entrou com codigo
      // de recuperacao. Restam X de N codigos. Considere regenerar.").
      codigosRecuperacao2faRestantes: codigosRecuperacaoRestantesAposLogin,
    },
    usouCodigoRecuperacao,
    codigosRecuperacao2faRestantes: codigosRecuperacaoRestantesAposLogin,
  });
});

export default router;
