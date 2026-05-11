/**
 * Rotas REST do modulo Assinatura Digital.
 * Expoe as 5 operacoes basicas + 2 webhooks (clicksign/zapsign).
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { assinaturaService } from "../lib/assinatura/service";
import type { ProvedorCodigo } from "../lib/assinatura/types";
import { requireRole as _requireRole } from "../middlewares/requireRole.js";
import { requireMasterEstrito as _requireMaster } from "../middlewares/requireMasterEstrito.js";
import { logger } from "../lib/logger.js";
import {
  calcularResumoAssinaturas,
  variacaoPct,
  semanticoCor,
  corRejeicao,
} from "../lib/assinaturas/calcularResumo.js";

const router: IRouter = Router();

// Wave 10 F5 · gate alinhado ao padrao parq.ts (validador_mestre + master estrito).
// Endpoints que retornam manifesto SHA-256, IP, geo e CPF integral DEVEM
// passar por aqui — caso contrario abrem IDOR cross-tenant + vazamento PII.
const guardMaster = [_requireRole("validador_mestre"), _requireMaster];

// Mascaramento server-side defensivo (mesmo com guardMaster acima, principio
// de menor exposicao: CPF e IP completos viram log de auditoria, nao payload
// rotineiro de tela). Se um dia precisar de versao "raw" para forensics,
// criar endpoint dedicado /assinaturas/:id/forense com auditoria propria.
function mascararCpfServer(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const limpo = cpf.replace(/\D/g, "");
  if (limpo.length < 11) return "***";
  return `${limpo.slice(0, 3)}.***.***-${limpo.slice(-2)}`;
}

function mascararIpServer(ip: string | null | undefined): string {
  if (!ip) return "";
  // IPv4: mantem 2 primeiros octetos; IPv6: mantem prefixo /32
  if (ip.includes(".")) {
    const partes = ip.split(".");
    if (partes.length === 4) return `${partes[0]}.${partes[1]}.***.***`;
  }
  if (ip.includes(":")) {
    const partes = ip.split(":");
    return partes.slice(0, 2).join(":") + ":****::***";
  }
  return "***";
}

function reduzirGeoServer(geo: unknown): Record<string, unknown> | null {
  if (!geo || typeof geo !== "object") return null;
  const g = geo as Record<string, unknown>;
  return {
    city: g["city"] ?? null,
    region: g["region"] ?? g["state"] ?? null,
    country: g["country"] ?? null,
    // lat/lng raw NAO expostos — somente cidade/estado/pais.
  };
}

/** GET /api/assinaturas/config — toggles + provedores + textos */
router.get("/assinaturas/config", async (_req: Request, res: Response) => {
  const [toggles, provedores, textos] = await Promise.all([
    db.execute(sql`SELECT * FROM assinatura_toggles_admin WHERE id = 1`),
    db.execute(sql`SELECT codigo, nome, prioridade, is_principal, is_failover, recomendado_pelo_manifesto, status_integracao FROM provedores_assinatura_digital ORDER BY prioridade`),
    db.execute(sql`SELECT codigo, canal, momento, assunto FROM assinatura_textos_institucionais WHERE ativo = true ORDER BY codigo`),
  ]);
  res.json({
    toggles: ((toggles as unknown as { rows?: unknown[] }).rows || [])[0],
    provedores: (provedores as unknown as { rows?: unknown[] }).rows || [],
    textos: (textos as unknown as { rows?: unknown[] }).rows || [],
  });
});

/** GET /api/assinaturas/templates — catalogo de templates */
router.get("/assinaturas/templates", async (_req: Request, res: Response) => {
  const r = await db.execute(sql`SELECT id, codigo, nome_exibicao, tipo_documento, categoria, exige_medico, exige_testemunhas, exige_clinica, ativo FROM assinatura_templates ORDER BY id`);
  res.json({ templates: (r as unknown as { rows?: unknown[] }).rows || [] });
});

/** GET /api/assinaturas/testemunhas — lista testemunhas + pares */
router.get("/assinaturas/testemunhas", async (_req: Request, res: Response) => {
  const [testemunhas, pares] = await Promise.all([
    db.execute(sql`SELECT id, nome_completo, cargo, par_preferencial, ordem_assinatura, ativa FROM assinatura_testemunhas ORDER BY id`),
    db.execute(sql`SELECT p.id, p.nome_par, p.uso_padrao, ta.nome_completo as testemunha_a, tb.nome_completo as testemunha_b
                   FROM assinatura_pares_testemunhas p
                   JOIN assinatura_testemunhas ta ON ta.id = p.testemunha_a_id
                   JOIN assinatura_testemunhas tb ON tb.id = p.testemunha_b_id
                   ORDER BY p.id`),
  ]);
  res.json({
    testemunhas: (testemunhas as unknown as { rows?: unknown[] }).rows || [],
    pares: (pares as unknown as { rows?: unknown[] }).rows || [],
  });
});

/** PATCH /api/assinaturas/toggles — atualiza singleton */
router.patch("/assinaturas/toggles", async (req: Request, res: Response) => {
  const allowed = [
    "provedor_principal_codigo", "provedor_failover_codigo", "failover_automatico",
    "exigir_assinatura_medico", "exigir_testemunhas", "modo_testemunhas", "par_fixo_id",
    "enviar_por_email", "enviar_por_whatsapp", "arquivar_no_drive",
  ];
  const updates: string[] = [];
  const body = req.body as Record<string, unknown>;
  for (const k of allowed) {
    if (k in body) updates.push(`${k} = ${typeof body[k] === "string" ? `'${(body[k] as string).replace(/'/g, "''")}'` : body[k]}`);
  }
  if (updates.length === 0) { res.status(400).json({ error: "Nenhum campo valido enviado" }); return; }
  await db.execute(sql.raw(`UPDATE assinatura_toggles_admin SET ${updates.join(", ")}, atualizado_em = now() WHERE id = 1`));
  const r = await db.execute(sql`SELECT * FROM assinatura_toggles_admin WHERE id = 1`);
  res.json({ ok: true, toggles: ((r as unknown as { rows?: unknown[] }).rows || [])[0] });
});

/** POST /api/assinaturas/enviar — orquestra hidratacao + envio + persistencia */
router.post("/assinaturas/enviar", async (req: Request, res: Response) => {
  try {
    const { pacienteId, templateCodigo, procedimento, valorOrcamento, riscos, forcarProvedor, canais } = req.body as Record<string, unknown>;
    if (!pacienteId || !templateCodigo) { res.status(400).json({ error: "pacienteId e templateCodigo obrigatorios" }); return; }
    const result = await assinaturaService.enviar({
      pacienteId: Number(pacienteId), templateCodigo: String(templateCodigo),
      procedimento: procedimento as string | undefined, valorOrcamento: valorOrcamento as string | undefined, riscos: riscos as string | undefined,
      forcarProvedor: forcarProvedor as ProvedorCodigo | undefined, canais: canais as ("EMAIL" | "WHATSAPP" | "DRIVE")[] | undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/assinaturas/resumo-hoje — Task #35 · resumo diario pra Painel CEO
 *
 * Agrega contagem de solicitacoes na janela ultimas 24h por status:
 *   - enviadas: criadas nas ultimas 24h (qualquer status)
 *   - assinadas: concluidas (CONCLUIDO) nas ultimas 24h
 *   - rejeitadas: REJEITADO nas ultimas 24h
 *   - pendentes: ENVIADO/CRIADO ainda em aberto nas ultimas 24h
 *
 * Mesmo guardMaster da timeline (validador_mestre + master estrito) — banner
 * so aparece pro CEO autenticado, nao vaza contagem pra outros perfis.
 */
router.get("/assinaturas/resumo-hoje", guardMaster, async (req: Request, res: Response) => {
  try {
    // Task #43 — filtro opcional por unidade clinica. assinatura_solicitacoes
    // nao tem unidade_id direta; helper deriva via JOIN pacientes.unidade_id.
    // Quando ausente: mantem agregado da rede inteira (compat retro Task #35/#37).
    const unidadeIdRaw = req.query["unidade_id"];
    const unidadeIdFiltro = unidadeIdRaw !== undefined && unidadeIdRaw !== "" && Number.isFinite(Number(unidadeIdRaw))
      ? Number(unidadeIdRaw)
      : null;

    // Wave 10.6 (Task #44) + Task #43: rota agora consome o helper compartilhado
    // `calcularResumoAssinaturas()` (com filtro opcional por unidade) pra
    // garantir que worker `alertaCEO` e banner CEO usem EXATAMENTE o mesmo
    // calculo (anti-drift). Worker chama sem `unidadeId` (rede-wide); rota
    // repassa o filtro do query string quando presente.
    const r = await calcularResumoAssinaturas({ unidadeId: unidadeIdFiltro });

    // Task #43 — quebra por unidade clinica (7d atual + prev_7d + serie diaria).
    // INTENCIONALMENTE rede-wide SEMPRE (ignora filtroUnidadeJoin) — serve de
    // mini-tabela diagnostica comparativa: "rejeicoes subiram +30%? em qual
    // clinica?". Mesmo quando o usuario filtrou por uma unidade especifica
    // nos cards 24h, manter a tabela `por_unidade` rede-wide permite comparar
    // a unidade selecionada contra as outras ("estou pior que a media?").
    // Ordenada por enviadas_7d desc, sem cap real (LIMIT 50 = todas as
    // clinicas ativas — rede atual tem 10, espaco de sobra ate Wave 14).
    const porUnidadeR = await db.execute(sql`
      WITH ref AS (
        SELECT date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')::date AS hoje
      ), dias AS (
        SELECT generate_series((SELECT hoje FROM ref) - 6, (SELECT hoje FROM ref), interval '1 day')::date AS dia
      ), base AS (
        SELECT s.id, s.status, s.criado_em, s.concluido_em, p.unidade_id, u.nome AS unidade_nome
        FROM assinatura_solicitacoes s
        JOIN pacientes p ON p.id = s.paciente_id
        JOIN unidades u  ON u.id = p.unidade_id
        WHERE s.criado_em    >= now() - interval '14 days'
           OR s.concluido_em >= now() - interval '14 days'
      ), serie_unid AS (
        SELECT
          b.unidade_id,
          to_char(d.dia, 'YYYY-MM-DD') AS dia,
          COUNT(b.id) FILTER (WHERE (b.criado_em AT TIME ZONE 'America/Sao_Paulo')::date = d.dia)::int AS enviadas,
          COUNT(b.id) FILTER (WHERE b.status = 'CONCLUIDO' AND (b.concluido_em AT TIME ZONE 'America/Sao_Paulo')::date = d.dia)::int AS assinadas,
          COUNT(b.id) FILTER (WHERE b.status = 'REJEITADO' AND (b.criado_em AT TIME ZONE 'America/Sao_Paulo')::date = d.dia)::int AS rejeitadas
        FROM base b
        CROSS JOIN dias d
        GROUP BY b.unidade_id, d.dia
      ), agg AS (
        SELECT
          b.unidade_id,
          MAX(b.unidade_nome) AS unidade_nome,
          COUNT(*) FILTER (WHERE (b.criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (SELECT hoje FROM ref) - 6  AND (SELECT hoje FROM ref))::int AS enviadas_7d,
          COUNT(*) FILTER (WHERE b.status = 'CONCLUIDO' AND (b.concluido_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (SELECT hoje FROM ref) - 6  AND (SELECT hoje FROM ref))::int AS assinadas_7d,
          COUNT(*) FILTER (WHERE b.status = 'REJEITADO' AND (b.criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (SELECT hoje FROM ref) - 6  AND (SELECT hoje FROM ref))::int AS rejeitadas_7d,
          COUNT(*) FILTER (WHERE (b.criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (SELECT hoje FROM ref) - 13 AND (SELECT hoje FROM ref) - 7)::int AS enviadas_prev,
          COUNT(*) FILTER (WHERE b.status = 'CONCLUIDO' AND (b.concluido_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (SELECT hoje FROM ref) - 13 AND (SELECT hoje FROM ref) - 7)::int AS assinadas_prev,
          COUNT(*) FILTER (WHERE b.status = 'REJEITADO' AND (b.criado_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (SELECT hoje FROM ref) - 13 AND (SELECT hoje FROM ref) - 7)::int AS rejeitadas_prev
        FROM base b
        GROUP BY b.unidade_id
      )
      SELECT
        a.unidade_id, a.unidade_nome,
        a.enviadas_7d, a.assinadas_7d, a.rejeitadas_7d,
        a.enviadas_prev, a.assinadas_prev, a.rejeitadas_prev,
        COALESCE(json_agg(json_build_object(
          'dia', s.dia, 'enviadas', s.enviadas, 'assinadas', s.assinadas, 'rejeitadas', s.rejeitadas
        ) ORDER BY s.dia) FILTER (WHERE s.dia IS NOT NULL), '[]'::json) AS serie_7d
      FROM agg a
      LEFT JOIN serie_unid s ON s.unidade_id = a.unidade_id
      WHERE (a.enviadas_7d + a.assinadas_7d + a.rejeitadas_7d + a.enviadas_prev + a.assinadas_prev + a.rejeitadas_prev) > 0
      GROUP BY a.unidade_id, a.unidade_nome, a.enviadas_7d, a.assinadas_7d, a.rejeitadas_7d, a.enviadas_prev, a.assinadas_prev, a.rejeitadas_prev
      ORDER BY a.enviadas_7d DESC, a.assinadas_7d DESC
      LIMIT 50
    `);
    const porUnidadeRows = (porUnidadeR as unknown as { rows?: Record<string, unknown>[] }).rows || [];
    const porUnidade = porUnidadeRows.map((u) => {
      const enviadas7dU   = Number(u["enviadas_7d"]   || 0);
      const assinadas7dU  = Number(u["assinadas_7d"]  || 0);
      const rejeitadas7dU = Number(u["rejeitadas_7d"] || 0);
      const enviadasPrevU   = Number(u["enviadas_prev"]   || 0);
      const assinadasPrevU  = Number(u["assinadas_prev"]  || 0);
      const rejeitadasPrevU = Number(u["rejeitadas_prev"] || 0);
      const varEnv = variacaoPct(enviadas7dU,   enviadasPrevU);
      const varAss = variacaoPct(assinadas7dU,  assinadasPrevU);
      const varRej = variacaoPct(rejeitadas7dU, rejeitadasPrevU);
      return {
        unidade_id: Number(u["unidade_id"]),
        unidade_nome: String(u["unidade_nome"] || ""),
        totais_7d:      { enviadas: enviadas7dU,   assinadas: assinadas7dU,  rejeitadas: rejeitadas7dU },
        totais_prev_7d: { enviadas: enviadasPrevU, assinadas: assinadasPrevU, rejeitadas: rejeitadasPrevU },
        variacao_pct:   { enviadas: varEnv,        assinadas: varAss,         rejeitadas: varRej },
        cor: {
          enviadas:   semanticoCor(varEnv),
          assinadas:  semanticoCor(varAss),
          rejeitadas: corRejeicao(varRej),
        },
        serie_7d: (u["serie_7d"] as Array<Record<string, unknown>> | null || []).map((p) => ({
          dia: String(p["dia"]),
          enviadas: Number(p["enviadas"] || 0),
          assinadas: Number(p["assinadas"] || 0),
          rejeitadas: Number(p["rejeitadas"] || 0),
        })),
      };
    });

    res.json({
      janela_horas: 24,
      gerado_em: new Date().toISOString(),
      enviadas: r.janela24h.enviadas,
      assinadas: r.janela24h.assinadas,
      rejeitadas: r.janela24h.rejeitadas,
      pendentes: r.janela24h.pendentes,
      serie_7d: r.serie7d,
      totais_7d: { enviadas: r.enviadas7d, assinadas: r.assinadas7d, rejeitadas: r.rejeitadas7d },
      totais_prev_7d: { enviadas: r.enviadasPrev, assinadas: r.assinadasPrev, rejeitadas: r.rejeitadasPrev },
      variacao_pct: {
        enviadas: r.variacaoEnviadasPct,
        assinadas: r.variacaoAssinadasPct,
        rejeitadas: r.variacaoRejeitadasPct,
      },
      cor: {
        enviadas: r.corEnviadas,
        assinadas: r.corAssinadas,
        rejeitadas: r.corRejeitadas,
      },
      taxa_conversao_pct: r.taxaConversao,
      taxa_conversao_prev_pct: r.taxaConversaoPrev,
      variacao_conversao_pp: r.variacaoConversaoPp,
      cor_conversao: r.corConversao,
      // Task #43 — eco do filtro aplicado + quebra por unidade clinica
      filtro_unidade_id: unidadeIdFiltro,
      por_unidade: porUnidade,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/assinaturas/:id/signatario/:signatarioId/reenviar — Task #35
 *
 * Reenvia lembrete WhatsApp/email pro signatario via ZapSign
 * (POST /api/v1/docs/{token}/resend/). So funciona se o signatario estiver
 * PENDENTE/ENVIADO ha mais de 24h. Mesmo guardMaster da timeline/detalhe.
 *
 * Em ambiente sem ZAPSIGN_API_TOKEN (mock), apenas registra a tentativa em
 * `assinatura_notificacoes` e retorna `{ ok: true, mock: true }`.
 */
router.post("/assinaturas/:id/signatario/:signatarioId/reenviar", guardMaster, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    const signatarioId = Number(req.params["signatarioId"]);
    if (!id || !signatarioId) { res.status(400).json({ error: "id e signatarioId obrigatorios" }); return; }

    const sigRow = await db.execute(sql`
      SELECT s.id, s.solicitacao_id, s.status, s.email, s.telefone, s.link_assinatura, s.papel,
             sol.provedor_codigo, sol.provedor_envelope_id, sol.criado_em
      FROM assinatura_signatarios s
      JOIN assinatura_solicitacoes sol ON sol.id = s.solicitacao_id
      WHERE s.id = ${signatarioId} AND s.solicitacao_id = ${id}
    `);
    const sig = ((sigRow as unknown as { rows?: Record<string, unknown>[] }).rows || [])[0];
    if (!sig) { res.status(404).json({ error: "Signatario nao encontrado" }); return; }
    // Enforce explicito server-side: somente PENDENTE ou ENVIADO podem ser
    // reenviados. ASSINADO/REJEITADO/EXPIRADO/qualquer outro = 409 (UI ja
    // esconde o botao, mas backend nao confia em UI).
    if (sig["status"] !== "PENDENTE" && sig["status"] !== "ENVIADO") {
      res.status(409).json({ error: `Signatario com status ${sig["status"]}, reenvio aplicavel apenas a PENDENTE/ENVIADO` });
      return;
    }
    const criadoEm = new Date(String(sig["criado_em"]));
    const horasDesde = (Date.now() - criadoEm.getTime()) / (1000 * 60 * 60);
    if (horasDesde < 24) {
      res.status(409).json({ error: "Signatario tem menos de 24h, aguarde antes de reenviar", horas_desde: Math.round(horasDesde * 10) / 10 });
      return;
    }

    const provedor = String(sig["provedor_codigo"] || "");
    const docToken = String(sig["provedor_envelope_id"] || "");
    const apiToken = process.env["ZAPSIGN_API_TOKEN"] || process.env["ZAPSIGN_TOKEN"];
    const baseUrl = process.env["ZAPSIGN_BASE_URL"] ||
      (process.env["NODE_ENV"] === "production" ? "https://api.zapsign.com.br" : "https://sandbox.api.zapsign.com.br");

    let providerStatus = 0;
    let providerBody: unknown = null;
    let mock = false;
    const isMockEnvelope = docToken.startsWith("MOCK-");

    if (provedor === "zapsign" && apiToken && !isMockEnvelope) {
      // ZapSign resend usa o doc token canonico (provedor_envelope_id), nao
      // parse de URL de signer. Falhar alto se nao houver doc token.
      if (!docToken) {
        res.status(409).json({ error: "Solicitacao sem provedor_envelope_id; resend ZapSign indisponivel" });
        return;
      }
      const r = await fetch(`${baseUrl}/api/v1/docs/${docToken}/resend/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ resend_type: "whatsapp" }),
      });
      providerStatus = r.status;
      providerBody = await r.text().catch(() => null);
      if (!r.ok) {
        res.status(502).json({ error: `ZapSign resend falhou ${providerStatus}`, body: providerBody });
        return;
      }
    } else if (!apiToken || isMockEnvelope) {
      // Mock so quando ambiente nao tem credencial real OU envelope foi criado
      // em modo MOCK (BaseMockableAdapter). Demais casos = erro explicito.
      mock = true;
    } else {
      res.status(409).json({ error: `Reenvio nao suportado para provedor ${provedor || "(nenhum)"}` });
      return;
    }

    let notificacaoPersistida = true;
    try {
      await db.execute(sql`
        INSERT INTO assinatura_notificacoes (solicitacao_id, canal, momento, destinatario, status, tentativas, enviado_em)
        VALUES (${id}, 'WHATSAPP', 'REENVIO_LEMBRETE_24H', ${String(sig["telefone"] || sig["email"] || "")}, ${mock ? "MOCK" : "ENVIADO"}, 1, now())
      `);
    } catch (err) {
      notificacaoPersistida = false;
      logger.warn(
        { err, solicitacao_id: id, signatario_id: signatarioId, mock },
        "[assinaturas/reenviar] Falha ao persistir notificacao em assinatura_notificacoes (reenvio ZapSign ja foi disparado, registro manual necessario)",
      );
    }

    res.json({ ok: true, mock, provedor, provider_status: providerStatus, notificacao_persistida: notificacaoPersistida });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/assinaturas/alertas-ceo — Wave 10.6 · fila de alertas proativos
 *
 * Lista os ultimos N alertas disparados pelo worker `alertaAssinaturasCEO`.
 * Mesmo guardMaster da timeline (validador_mestre + master estrito) — quem
 * pode ver o banner pode ver a fila historica de alertas.
 */
router.get("/assinaturas/alertas-ceo", guardMaster, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query["limit"] ?? 50), 1), 200);
    const r = await db.execute(sql`
      SELECT id, dia_brt, metrica, tipo_transicao, cor_anterior, cor_atual,
             variacao_pct, conversao_pp, totais_atual, totais_prev,
             notif_email_id, notif_wpp_id, visualizado_em, criado_em
      FROM alertas_ceo_assinaturas
      ORDER BY criado_em DESC
      LIMIT ${limit}
    `);
    const rows = (r as unknown as { rows?: unknown[] }).rows || [];
    res.json({ alertas: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/assinaturas/alertas-ceo/marcar-todos-vistos — Task #61
 *
 * Marca em lote TODOS os alertas pendentes (visualizado_em IS NULL) como
 * vistos agora. Idempotente: rodar 2x nao reabre nada. Mesmo guardMaster
 * dos demais endpoints da fila.
 *
 * Resposta: { ok: true, marcados: N } onde N = quantidade efetivamente
 * atualizada nesta chamada (RETURNING id).
 */
router.post("/assinaturas/alertas-ceo/marcar-todos-vistos", guardMaster, async (_req: Request, res: Response) => {
  try {
    const r = await db.execute(sql`
      UPDATE alertas_ceo_assinaturas
      SET visualizado_em = NOW()
      WHERE visualizado_em IS NULL
      RETURNING id
    `);
    const rows = (r as unknown as { rows?: unknown[] }).rows || [];
    res.json({ ok: true, marcados: rows.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/assinaturas/alertas-ceo/:id/visualizar — marca alerta como lido
 * (timestamp visualizado_em). Idempotente: nao atualiza se ja visualizado.
 */
router.post("/assinaturas/alertas-ceo/:id/visualizar", guardMaster, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!id) { res.status(400).json({ error: "id obrigatorio" }); return; }
    await db.execute(sql`
      UPDATE alertas_ceo_assinaturas
      SET visualizado_em = COALESCE(visualizado_em, NOW())
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/assinaturas/cofre/ausentes — Task #47 · cofre LGPD/CFM
 *
 * Lista as auditoria_assinaturas dos ultimos 30 dias com `pdf_verificado_ok = false`
 * (PDF some do bucket `assinaturas-pawards`). Worker `verificarPdfsCofre` (task #38)
 * popula essas colunas 1x/dia e dispara e-mail; este endpoint serve o card visivel
 * no painel CEO como segunda camada de defesa (e-mail pode cair em filtro).
 *
 * Gate guardMaster = mesma protecao da timeline/detalhe (validador_mestre + master).
 *
 * Resposta:
 *   total: COUNT(*) real (independente do LIMIT da lista)
 *   ausentes: lista [{ id, signature_id, solicitacao_id, signer_name, signer_papel,
 *                      storage_key, criado_em, pdf_verificado_em, pdf_verificado_erro }]
 *   limit / has_more: paginacao explicita
 *
 * `solicitacao_id` permite o frontend linkar pra `/assinaturas/:id` (Wave 10 F5).
 */
router.get("/assinaturas/cofre/ausentes", guardMaster, async (_req: Request, res: Response) => {
  try {
    const LIMITE = 200;
    // Count separado pra que o `total` reflita a contagem REAL na janela 30d
    // (independente do LIMIT da lista), atendendo a regra "card mostra
    // quantas auditorias estao ausentes".
    const countR = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM auditoria_assinaturas a
      WHERE a.pdf_storage_key IS NOT NULL
        AND a.pdf_verificado_ok = false
        AND a.criado_em >= NOW() - INTERVAL '30 days'
    `);
    const total = Number(
      (((countR as unknown as { rows?: Record<string, unknown>[] }).rows || [])[0] || {})["total"] || 0,
    );

    const r = await db.execute(sql`
      SELECT
        a.id,
        a.signature_id,
        a.solicitacao_id,
        a.signer_name,
        a.signer_papel,
        a.pdf_storage_key                        AS storage_key,
        a.criado_em,
        a.pdf_verificado_em,
        a.pdf_verificado_erro
      FROM auditoria_assinaturas a
      WHERE a.pdf_storage_key IS NOT NULL
        AND a.pdf_verificado_ok = false
        AND a.criado_em >= NOW() - INTERVAL '30 days'
      ORDER BY a.criado_em DESC
      LIMIT ${LIMITE}
    `);
    const ausentes = (r as unknown as { rows?: unknown[] }).rows || [];
    res.json({
      janela_dias: 30,
      total,
      limit: LIMITE,
      has_more: total > ausentes.length,
      gerado_em: new Date().toISOString(),
      ausentes,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/assinaturas/timeline — Wave 10 F5 · ultimas 50 solicitacoes enriquecidas
 *
 * Endpoint dedicado ao frontend `/assinaturas/timeline` (validador_mestre + admin).
 * Retorna agregado pronto pra tabela: template, paciente, status, contagem de
 * signatarios, data envio/conclusao, envelope ZapSign, marcador de auditoria.
 *
 * IMPORTANTE: declarado ANTES de `/assinaturas/:id` por causa do match em ordem
 * do express — senao /timeline cairia no handler dinamico.
 */
router.get("/assinaturas/timeline", guardMaster, async (req: Request, res: Response) => {
  try {
    // Task #51 — filtro opcional por unidade clinica. assinatura_solicitacoes
    // nao tem unidade_id direta; derivamos via JOIN pacientes.unidade_id
    // (mesmo padrao usado em /assinaturas/resumo-hoje). Quando ausente,
    // mantem comportamento original: ultimas 50 da rede toda.
    const unidadeIdRaw = req.query["unidade_id"];
    const unidadeIdFiltro = unidadeIdRaw !== undefined && unidadeIdRaw !== "" && Number.isFinite(Number(unidadeIdRaw))
      ? Number(unidadeIdRaw)
      : null;
    const filtroUnidadeJoin = unidadeIdFiltro !== null
      ? sql`JOIN pacientes p_filt ON p_filt.id = s.paciente_id AND p_filt.unidade_id = ${unidadeIdFiltro}`
      : sql``;
    // Task #55 — filtro opcional por status. Aceita lista separada por virgula
    // (ex.: ?status=ENVIADO,PARCIAL) pra permitir agrupar "em andamento".
    // Whitelist defensiva server-side: backend nao confia no input do cliente,
    // valores fora do enum sao descartados (silenciosamente, evita 400 ruidoso
    // se UI mandar status novo num deploy parcial).
    const STATUS_VALIDOS = new Set([
      "RASCUNHO", "ENVIADO", "PARCIAL", "CONCLUIDO", "REJEITADO", "EXPIRADO",
    ]);
    const statusRaw = req.query["status"];
    const statusFiltro: string[] = typeof statusRaw === "string" && statusRaw.length > 0
      ? statusRaw.split(",").map(s => s.trim().toUpperCase()).filter(s => STATUS_VALIDOS.has(s))
      : [];
    // Task #64 — filtro opcional por intervalo de datas (criado_em).
    // Aceita `?desde=YYYY-MM-DD&ate=YYYY-MM-DD`. Validacao defensiva: regex
    // estrita pra evitar SQL injection via interpolacao + descarta valores
    // mal-formados silenciosamente (mesmo padrao da whitelist de status).
    // `desde` inclui o dia inteiro (>= 00:00). `ate` inclui o dia inteiro
    // (< dia+1 — comparacao half-open pra cobrir registros com timestamp
    // ate 23:59:59.999 sem precisar somar horas no SQL).
    // Validacao em 2 etapas: regex de forma + checagem de data real (ano,
    // mes 1-12, dia bate com calendario). Sem isso, "2026-99-99" passaria
    // a regex e estouraria 500 no `::date`.
    const DATA_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
    function parseDataOuNull(raw: unknown): string | null {
      if (typeof raw !== "string") return null;
      const m = DATA_REGEX.exec(raw);
      if (!m) return null;
      const ano = Number(m[1]);
      const mes = Number(m[2]);
      const dia = Number(m[3]);
      if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
      const d = new Date(Date.UTC(ano, mes - 1, dia));
      if (
        d.getUTCFullYear() !== ano ||
        d.getUTCMonth() !== mes - 1 ||
        d.getUTCDate() !== dia
      ) return null;
      return raw;
    }
    const desdeFiltro = parseDataOuNull(req.query["desde"]);
    const ateFiltro = parseDataOuNull(req.query["ate"]);
    const filtrosWhere: ReturnType<typeof sql>[] = [];
    if (statusFiltro.length > 0) {
      filtrosWhere.push(sql`s.status IN (${sql.join(statusFiltro.map(s => sql`${s}`), sql`, `)})`);
    }
    if (desdeFiltro !== null) {
      filtrosWhere.push(sql`s.criado_em >= ${desdeFiltro}::date`);
    }
    if (ateFiltro !== null) {
      filtrosWhere.push(sql`s.criado_em < (${ateFiltro}::date + INTERVAL '1 day')`);
    }
    const filtroStatusWhere = filtrosWhere.length > 0
      ? sql`WHERE ${sql.join(filtrosWhere, sql` AND `)}`
      : sql``;
    const r = await db.execute(sql`
      SELECT
        s.id,
        s.status,
        s.provedor_codigo,
        s.provedor_envelope_id,
        s.criado_em,
        s.enviado_em,
        s.concluido_em,
        s.expira_em,
        s.zapsign_external_id,
        t.codigo                     AS template_codigo,
        t.nome_exibicao              AS template_nome,
        t.tipo_documento             AS template_tipo,
        s.paciente_id,
        p.nome                       AS paciente_nome,
        p.unidade_id                 AS paciente_unidade_id,
        u.nome                       AS paciente_unidade_nome,
        (
          SELECT COUNT(*)::int FROM assinatura_signatarios sg
          WHERE sg.solicitacao_id = s.id
        ) AS signatarios_total,
        (
          SELECT COUNT(*)::int FROM assinatura_signatarios sg
          WHERE sg.solicitacao_id = s.id AND sg.status = 'ASSINADO'
        ) AS signatarios_assinados,
        (
          SELECT COUNT(*)::int FROM auditoria_assinaturas a
          WHERE a.solicitacao_id = s.id
        ) AS auditoria_eventos
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t   ON t.id = s.template_id
      LEFT JOIN pacientes p         ON p.id = s.paciente_id
      LEFT JOIN unidades u          ON u.id = p.unidade_id
      ${filtroUnidadeJoin}
      ${filtroStatusWhere}
      ORDER BY s.id DESC
      LIMIT 50
    `);
    const rows = (r as unknown as { rows?: unknown[] }).rows || [];
    res.json({
      solicitacoes: rows,
      total: rows.length,
      filtro_unidade_id: unidadeIdFiltro,
      filtro_status: statusFiltro,
      filtro_desde: desdeFiltro,
      filtro_ate: ateFiltro,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/assinaturas/uploads-falhos — Wave 10.5 task #49
 *
 * Lista eventos de webhook em que o upload do PDF assinado pro bucket falhou.
 * Agrupa por status pra Caio (master-only) ver o que ainda esta em retry, o
 * que ja esgotou tentativas e o que caiu fora da janela de varredura do
 * worker (`pdfRetryUpload.ts` — janela 7d, max 5 tentativas).
 *
 * Status:
 *   - em_retry           : prefixo `pdf_upload_falhou:` + tentativas < 5 + recebido nos ultimos 7d
 *   - esgotado           : prefixo `pdf_upload_falhou:` + tentativas >= 5 (precisa Caio na unha)
 *   - fora_janela        : prefixo `pdf_upload_falhou:` + recebido_em <= 7d atras (worker nao varre mais)
 *   - aguardando_webhook : prefixo `pdf_upload_falhou_sem_manifesto:` (esperando ZapSign reentregar)
 *
 * IMPORTANTE: declarado ANTES de `/assinaturas/:id` por ordem de matching.
 */
router.get("/assinaturas/uploads-falhos", guardMaster, async (_req: Request, res: Response) => {
  try {
    const r = await db.execute(sql`
      SELECT
        e.id,
        e.provedor_codigo,
        e.envelope_id,
        e.event_type,
        e.solicitacao_id,
        e.tentativas_retry,
        e.ultima_tentativa_em,
        e.recebido_em,
        e.erro_processamento,
        sol.id            AS sol_id,
        sol.status        AS sol_status,
        sol.paciente_id,
        p.nome            AS paciente_nome,
        t.codigo          AS template_codigo,
        t.nome_exibicao   AS template_nome,
        CASE
          WHEN e.erro_processamento LIKE 'pdf_upload_falhou_sem_manifesto:%' THEN 'aguardando_webhook'
          WHEN e.recebido_em <= NOW() - INTERVAL '7 days' THEN 'fora_janela'
          WHEN e.tentativas_retry >= 5 THEN 'esgotado'
          ELSE 'em_retry'
        END AS status_retry
      FROM assinatura_webhook_eventos e
      LEFT JOIN assinatura_solicitacoes sol
        ON sol.provedor_envelope_id = e.envelope_id
       AND sol.provedor_codigo = e.provedor_codigo
      LEFT JOIN assinatura_templates t ON t.id = sol.template_id
      LEFT JOIN pacientes p            ON p.id = sol.paciente_id
      WHERE e.erro_processamento LIKE 'pdf_upload_falhou%'
      ORDER BY e.recebido_em DESC
      LIMIT 200
    `);
    const rows = ((r as unknown as { rows?: Record<string, unknown>[] }).rows) || [];

    const grupos = {
      em_retry: [] as Record<string, unknown>[],
      esgotado: [] as Record<string, unknown>[],
      fora_janela: [] as Record<string, unknown>[],
      aguardando_webhook: [] as Record<string, unknown>[],
    };
    for (const row of rows) {
      const status = String(row["status_retry"] || "em_retry") as keyof typeof grupos;
      (grupos[status] || grupos.em_retry).push(row);
    }

    res.json({
      gerado_em: new Date().toISOString(),
      total: rows.length,
      contagem: {
        em_retry: grupos.em_retry.length,
        esgotado: grupos.esgotado.length,
        fora_janela: grupos.fora_janela.length,
        aguardando_webhook: grupos.aguardando_webhook.length,
      },
      grupos,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/assinaturas/uploads-falhos/:eventoId/resetar — Wave 10.5 task #57
 *
 * Reseta manualmente o retry de upload de PDF assinado depois que o operador
 * (validador_mestre) corrigiu a causa raiz (bucket cheio, credencial revogada,
 * rede). Hoje, quando `tentativas_retry` chega a 5, o evento fica preso pra
 * sempre — sem este reset o PDF nunca sobe ao bucket e o risco juridico
 * (LGPD/CFM 20 anos) continua aberto.
 *
 * Operacao atomica:
 *   1. Valida que o evento esta com erro `pdf_upload_falhou*` (so esses sao
 *      reseta veis — qualquer outro tipo de erro indica fluxo diferente).
 *   2. Zera `tentativas_retry`, limpa `ultima_tentativa_em` e re-marca o
 *      `erro_processamento` com o prefixo retriable (`pdf_upload_falhou: reset
 *      manual ...`) pra worker re-elegelo no proximo tick.
 *   3. Incrementa contador de auditoria (`resets_manuais_count`) + grava
 *      operador (`ultimo_reset_por`) + motivo opcional (`ultimo_reset_motivo`).
 *   4. Dispara um ciclo imediato do worker pra economizar a espera de 5min.
 *
 * Body: { motivo?: string } — texto livre (max 500 chars) pra rastreabilidade.
 *
 * Idempotente: chamadas repetidas sempre re-zeram, sempre re-disparam.
 * Mesmo gate master das outras rotas Wave 10.
 */
router.post("/assinaturas/uploads-falhos/:eventoId/resetar", guardMaster, async (req: Request, res: Response) => {
  try {
    const eventoId = Number(req.params["eventoId"]);
    if (!Number.isFinite(eventoId)) {
      res.status(400).json({ error: "eventoId invalido" });
      return;
    }
    const motivoRaw = typeof req.body?.motivo === "string" ? req.body.motivo.trim() : "";
    const motivo = motivoRaw.slice(0, 500) || null;
    const operador = ((req.user as any)?.email as string | undefined)
      || ((req.user as any)?.nome as string | undefined)
      || "(desconhecido)";

    // 1. Valida elegibilidade — so reseta evento com erro de upload
    const ev: any = await db.execute(sql`
      SELECT id, erro_processamento, tentativas_retry, solicitacao_id, envelope_id
      FROM assinatura_webhook_eventos
      WHERE id = ${eventoId}
      LIMIT 1
    `);
    const evRow = ((ev.rows ?? ev) as Array<{ id: number; erro_processamento: string | null; tentativas_retry: number; solicitacao_id: number | null; envelope_id: string | null }>)[0];
    if (!evRow) {
      res.status(404).json({ error: "Evento nao encontrado" });
      return;
    }
    if (!evRow.erro_processamento || !/^pdf_upload_falhou/.test(evRow.erro_processamento)) {
      res.status(409).json({
        error: "Evento nao esta em estado de falha de upload de PDF",
        erro_atual: evRow.erro_processamento,
      });
      return;
    }

    // 2. Reset atomico + 3. audit trail
    //
    // NOTA DE DESIGN (code-review task #57): nao limpamos `erro_processamento`
    // pra NULL como sugeria a leitura literal do "Done looks like" — a
    // elegibilidade do worker `pdfRetryUpload` filtra por
    // `LIKE 'pdf_upload_falhou:%'`, entao zerar pra NULL retiraria o evento
    // da fila. Em vez disso, regravamos com prefixo retriable + carimbo
    // operacional (operador + ts) pra preservar contexto e ainda assim ser
    // re-elegivel no proximo tick. Mudancas futuras no criterio de
    // elegibilidade do worker DEVEM revisitar este marcador.
    //
    // O WHERE revalida o prefixo dentro do UPDATE (nao so no SELECT acima)
    // pra fechar a janela de corrida em que dois operadores apertam
    // "Tentar enviar de novo" simultaneamente — o segundo recebe rowCount=0
    // e respondemos 409 sem incrementar contador duplicado.
    const novoMarcador = `pdf_upload_falhou: reset manual em ${new Date().toISOString()} por ${operador}`;
    const updRes: any = await db.execute(sql`
      UPDATE assinatura_webhook_eventos
      SET tentativas_retry = 0,
          ultima_tentativa_em = NULL,
          erro_processamento = ${novoMarcador},
          processado = false,
          processado_em = NULL,
          resets_manuais_count = resets_manuais_count + 1,
          ultimo_reset_em = NOW(),
          ultimo_reset_por = ${operador},
          ultimo_reset_motivo = ${motivo}
      WHERE id = ${eventoId}
        AND erro_processamento LIKE 'pdf_upload_falhou%'
      RETURNING id
    `);
    const linhasAtualizadas = ((updRes.rows ?? updRes) as Array<unknown>).length;
    if (linhasAtualizadas === 0) {
      res.status(409).json({
        error: "Evento mudou de estado entre a verificacao e o reset (corrida com outro operador ou worker). Recarregue e tente novamente.",
      });
      return;
    }

    // 4. Dispara worker imediatamente — sem esperar 5min
    let stats: { tentados: number; sucesso: number; falhou: number; bloqueados: number; alertaCeo: number } | null = null;
    try {
      const { rodarPdfRetryUploadAgora } = await import("../lib/recorrencia/pdfRetryUpload.js");
      stats = await rodarPdfRetryUploadAgora();
    } catch (workerErr) {
      // Reset ja foi gravado — worker no proximo tick pega de qualquer jeito.
      console.warn(`[assinaturas/resetar] reset OK mas worker imediato falhou: ${(workerErr as Error).message}`);
    }

    res.json({
      ok: true,
      evento_id: eventoId,
      operador,
      motivo,
      worker_executado: stats !== null,
      stats,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/assinaturas/uploads-falhos/retentar — Wave 10.5 task #49
 *
 * Dispara um ciclo manual do worker `pdfRetryUpload`. Retorna stats agregadas.
 * Util pra Caio nao precisar esperar os 5min do tick depois de mexer em
 * algo (rede, bucket, sidecar). Mesmo gate master.
 */
router.post("/assinaturas/uploads-falhos/retentar", guardMaster, async (_req: Request, res: Response) => {
  try {
    const { rodarPdfRetryUploadAgora } = await import("../lib/recorrencia/pdfRetryUpload.js");
    const stats = await rodarPdfRetryUploadAgora();
    res.json({ ok: true, stats });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/assinaturas/:id — status atual (pull live no provedor se ainda nao concluido)
 *  Wave 10 F5: gate master + mascaramento PII server-side (CPF, IP, geo). */
router.get("/assinaturas/:id", guardMaster, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    const status = await assinaturaService.consultarStatus(id);
    const detalhes = await db.execute(sql`
      SELECT s.id, s.paciente_id, p.nome as paciente_nome, t.codigo as template, t.nome_exibicao as template_nome, s.provedor_codigo, s.provedor_envelope_id, s.zapsign_external_id, s.status, s.criado_em, s.enviado_em, s.concluido_em, s.expira_em, s.pdf_assinado_url, s.canais_distribuir, s.metadata
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t ON t.id = s.template_id
      LEFT JOIN pacientes p ON p.id = s.paciente_id
      WHERE s.id = ${id}
    `);
    const sigs = await db.execute(sql`SELECT id, papel, nome, email, ordem, status, link_assinatura, assinado_em FROM assinatura_signatarios WHERE solicitacao_id = ${id} ORDER BY ordem`);
    const notifs = await db.execute(sql`SELECT canal, momento, destinatario, status, tentativas, enviado_em FROM assinatura_notificacoes WHERE solicitacao_id = ${id} ORDER BY id`);
    // Wave 10 F5: junta auditoria (manifesto SHA-256 + IP + geo + auth_method) por signatario
    const audit = await db.execute(sql`
      SELECT signature_id, signer_papel, signer_name, signer_cpf, signer_ip::text AS signer_ip, signer_geo, auth_method, document_hash_sha256, document_hash_assinado, icp_brasil_serial, icp_brasil_ac, validation_url, pdf_storage_key, timestamp_utc, criado_em
      FROM auditoria_assinaturas
      WHERE solicitacao_id = ${id}
      ORDER BY timestamp_utc
    `);
    const auditoriaRaw = (audit as unknown as { rows?: Record<string, unknown>[] }).rows || [];
    const auditoria = auditoriaRaw.map((row) => ({
      ...row,
      signer_cpf: mascararCpfServer(row["signer_cpf"] as string | null),
      signer_ip: mascararIpServer(row["signer_ip"] as string | null),
      signer_geo: reduzirGeoServer(row["signer_geo"]),
    }));
    // Wave 10.5 task #57: expoe eventos de webhook com falha de upload de PDF
    // pra o frontend mostrar o botao "Tentar enviar de novo". Liga via
    // solicitacao_id direto OU por envelope_id+provedor (alguns eventos antigos
    // ficaram com solicitacao_id NULL quando o upload falhou antes do binding).
    const solRow0 = ((detalhes as unknown as { rows?: Array<{ provedor_envelope_id?: string | null; provedor_codigo?: string | null }> }).rows || [])[0];
    const envelopeId = solRow0?.provedor_envelope_id ?? null;
    const provedorCod = solRow0?.provedor_codigo ?? null;
    const uploadsFalhos = await db.execute(sql`
      SELECT id, provedor_codigo, envelope_id, event_type, recebido_em,
             tentativas_retry, ultima_tentativa_em, erro_processamento,
             resets_manuais_count, ultimo_reset_em, ultimo_reset_por,
             ultimo_reset_motivo, processado
      FROM assinatura_webhook_eventos
      WHERE erro_processamento LIKE 'pdf_upload_falhou%'
        AND (
          solicitacao_id = ${id}
          OR (envelope_id IS NOT NULL AND envelope_id = ${envelopeId} AND provedor_codigo = ${provedorCod})
        )
      ORDER BY recebido_em DESC
      LIMIT 20
    `);
    res.json({
      live: status,
      solicitacao: ((detalhes as unknown as { rows?: unknown[] }).rows || [])[0],
      signatarios: (sigs as unknown as { rows?: unknown[] }).rows || [],
      notificacoes: (notifs as unknown as { rows?: unknown[] }).rows || [],
      auditoria,
      uploads_falhos: (uploadsFalhos as unknown as { rows?: unknown[] }).rows || [],
    });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/assinaturas/:id/pdf-assinado — Wave 10.5 task #34
 *
 * Devolve **redirect 302** pra uma URL assinada GCS de TTL curto (5min, default)
 * apontando pro PDF assinado no bucket "assinaturas-pawards" (App Storage).
 * Defesa em profundidade: nao depende mais do ZapSign manter o arquivo
 * disponivel — temos copia local pra retencao 20 anos (CFM/LGPD).
 *
 * Por que 302 + signed URL em vez de stream pelo backend?
 *  - Escala: nao segura conexao HTTP do API server por minutos pra PDFs grandes.
 *  - Defesa: o bucket NAO eh publico, a unica forma de acessar sem credencial
 *    GCS eh atraves desta URL assinada de TTL curto, gerada **apos** o
 *    guardMaster autorizar o validador master. Quem nao passou no gate
 *    nunca recebe a URL.
 *  - Cliente baixa direto do GCS (latencia minima).
 *
 * Resolucao da chave: prefere o ultimo manifesto da auditoria (mais recente
 * timestamp_utc) com pdf_storage_key nao-nulo. Cai pro `external_id` como
 * ultimo recurso (fluxos historicos sem manifesto registrado).
 *
 * `?json=1` retorna `{ url, expiresAt }` em vez de redirect — util pra o
 * frontend renderizar contagem regressiva ou abrir em nova aba via JS.
 */
router.get("/assinaturas/:id/pdf-assinado", guardMaster, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id invalido" }); return; }
    const r = await db.execute(sql`
      SELECT a.pdf_storage_key, s.zapsign_external_id, s.provedor_envelope_id
      FROM assinatura_solicitacoes s
      LEFT JOIN auditoria_assinaturas a
        ON a.solicitacao_id = s.id AND a.pdf_storage_key IS NOT NULL
      WHERE s.id = ${id}
      ORDER BY a.timestamp_utc DESC NULLS LAST
      LIMIT 1
    `);
    const row = ((r as unknown as { rows?: Array<{ pdf_storage_key: string | null; zapsign_external_id: string | null; provedor_envelope_id: string | null }> }).rows || [])[0];
    if (!row) { res.status(404).json({ error: "Solicitacao nao encontrada" }); return; }
    const chave = row.pdf_storage_key
      || (row.zapsign_external_id ? `assinaturas/${row.zapsign_external_id}.pdf` : null)
      || (row.provedor_envelope_id ? `assinaturas/${row.provedor_envelope_id}.pdf` : null);
    if (!chave) { res.status(404).json({ error: "PDF assinado ainda nao disponivel" }); return; }

    const { gerarUrlAssinadaPdf, PdfAssinadoNaoEncontradoError } = await import("../lib/assinatura/objectStorage.js");
    try {
      const signed = await gerarUrlAssinadaPdf(chave, 300);
      res.setHeader("Cache-Control", "private, no-store");
      if (req.query["json"] === "1") {
        res.json({ url: signed.url, expiresAt: signed.expiresAt, ttlSec: 300 });
        return;
      }
      res.redirect(302, signed.url);
    } catch (err) {
      if (err instanceof PdfAssinadoNaoEncontradoError) {
        res.status(404).json({ error: "PDF assinado nao encontrado no bucket", chave });
        return;
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/assinaturas — lista (filtros opcionais paciente_id, status) */
router.get("/assinaturas", async (req: Request, res: Response) => {
  const filtros: string[] = ["1=1"];
  if (req.query["paciente_id"]) filtros.push(`paciente_id = ${Number(req.query["paciente_id"])}`);
  if (req.query["status"]) filtros.push(`status = '${String(req.query["status"]).replace(/'/g, "")}'`);
  const r = await db.execute(sql.raw(`
    SELECT id, paciente_id, template_id, provedor_codigo, status, criado_em, concluido_em
    FROM assinatura_solicitacoes WHERE ${filtros.join(" AND ")} ORDER BY id DESC LIMIT 100
  `));
  res.json({ solicitacoes: (r as unknown as { rows?: unknown[] }).rows || [] });
});

export default router;
