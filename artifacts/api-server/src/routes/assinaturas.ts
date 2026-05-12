/**
 * Rotas REST do modulo Assinatura Digital.
 * Expoe as 5 operacoes basicas + 2 webhooks (clicksign/zapsign).
 */

import { Router, type IRouter, type Request, type Response } from "express";
import ExcelJS from "exceljs";
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

// Task #96 — whitelist + fragmentos `ORDER BY` por coluna, compartilhados pelos
// 3 endpoints de timeline (JSON, CSV, XLSX). Centralizar aqui evita drift
// entre eles (achado historico das Tasks #83/#93/#95). `s.id DESC` final NUNCA
// vem deste mapa — e sempre adicionado por `montarOrderBy()` como tiebreaker
// estavel pra paginacao determinar ordem mesmo quando 2 linhas empatam em
// todos os criterios solicitados.
const ORDENACOES_TIMELINE_FRAGMENT: Record<string, ReturnType<typeof sql>> = {
  valor_desc:    sql`rec.valor_formula_estimado DESC NULLS LAST`,
  valor_asc:     sql`rec.valor_formula_estimado ASC NULLS LAST`,
  criado_desc:   sql`s.criado_em DESC NULLS LAST`,
  criado_asc:    sql`s.criado_em ASC NULLS LAST`,
  concluido_desc: sql`s.concluido_em DESC NULLS LAST`,
  concluido_asc:  sql`s.concluido_em ASC NULLS LAST`,
  status_desc:   sql`s.status DESC`,
  status_asc:    sql`s.status ASC`,
  paciente_desc: sql`p.nome DESC NULLS LAST`,
  paciente_asc:  sql`p.nome ASC NULLS LAST`,
  medico_desc:   sql`med.nome DESC NULLS LAST`,
  medico_asc:    sql`med.nome ASC NULLS LAST`,
  farmacia_desc: sql`COALESCE(f.razao_social, f.nome_fantasia) DESC NULLS LAST`,
  farmacia_asc:  sql`COALESCE(f.razao_social, f.nome_fantasia) ASC NULLS LAST`,
  clinica_desc:  sql`u.nome DESC NULLS LAST`,
  clinica_asc:   sql`u.nome ASC NULLS LAST`,
  template_desc: sql`t.codigo DESC NULLS LAST`,
  template_asc:  sql`t.codigo ASC NULLS LAST`,
};
const MAX_ORDENACOES_TIMELINE = 4;
export function parseTokensOrdenacao(raw: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const bruto of raw.split(",")) {
    const t = bruto.trim();
    if (!ORDENACOES_TIMELINE_FRAGMENT[t]) continue;
    // Dedupe por coluna (template_asc e template_desc nao podem coexistir).
    const colKey = t.replace(/_(desc|asc)$/, "");
    if (seen.has(colKey)) continue;
    seen.add(colKey);
    out.push(t);
    if (out.length >= MAX_ORDENACOES_TIMELINE) break;
  }
  return out;
}
function montarOrderBy(tokens: string[]): ReturnType<typeof sql> {
  if (tokens.length === 0) return sql`ORDER BY s.id DESC`;
  const fragments = tokens.map((t) => ORDENACOES_TIMELINE_FRAGMENT[t]!);
  return sql`ORDER BY ${sql.join(fragments, sql`, `)}, s.id DESC`;
}

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
 * Resposta: { ok: true, marcados: N, ids: number[] } onde N = quantidade
 * efetivamente atualizada nesta chamada (RETURNING id). `ids` permite que o
 * frontend ofereca undo (Task #69) chamando /desfazer-vistos com a lista exata.
 */
router.post("/assinaturas/alertas-ceo/marcar-todos-vistos", guardMaster, async (_req: Request, res: Response) => {
  try {
    const r = await db.execute(sql`
      UPDATE alertas_ceo_assinaturas
      SET visualizado_em = NOW()
      WHERE visualizado_em IS NULL
      RETURNING id
    `);
    const rows = ((r as unknown as { rows?: { id: number }[] }).rows) || [];
    const ids = rows.map((row) => Number(row.id));
    res.json({ ok: true, marcados: ids.length, ids });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/assinaturas/alertas-ceo/desfazer-vistos — Task #69
 *
 * Recebe { ids: number[] } e reverte visualizado_em para NULL nesses alertas.
 * Pensado pra ser chamado dentro da janela de undo (8s) logo apos
 * marcar-todos-vistos. Idempotente: rodar 2x nao quebra nada.
 *
 * Mesmo guardMaster — quem pode marcar pode desfazer.
 *
 * Resposta: { ok: true, desfeitos: N } onde N = quantidade efetivamente
 * revertida (RETURNING id).
 */
router.post("/assinaturas/alertas-ceo/desfazer-vistos", guardMaster, async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as { ids?: unknown };
    const idsRaw = Array.isArray(body.ids) ? body.ids : [];
    const ids = idsRaw
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) {
      res.json({ ok: true, desfeitos: 0 });
      return;
    }
    const r = await db.execute(sql`
      UPDATE alertas_ceo_assinaturas
      SET visualizado_em = NULL
      WHERE id = ANY(${ids}::bigint[])
      RETURNING id
    `);
    const rows = ((r as unknown as { rows?: unknown[] }).rows) || [];
    res.json({ ok: true, desfeitos: rows.length });
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
    // Task #73 — paginacao explicita. `limit` default 50 (compat retro com a
    // primeira versao Wave 10 F5), max 200 pra evitar payload gigante. `offset`
    // habilita "Carregar mais" no frontend sem perder filtros. `total` vem de
    // um COUNT(*) separado pra UI poder mostrar "mostrando X de N" e decidir
    // se exibe o botao de paginacao.
    const limitRaw = Number(req.query["limit"] ?? 50);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200)
      : 50;
    const offsetRaw = Number(req.query["offset"] ?? 0);
    const offset = Number.isFinite(offsetRaw)
      ? Math.max(Math.trunc(offsetRaw), 0)
      : 0;
    // Task #80 + Task #84 — ordenacao opcional. Whitelist defensiva server-side:
    // qualquer valor fora do enum cai no default (id desc = mais recente primeiro),
    // pra nao abrir vetor de SQL injection via interpolacao no ORDER BY. NULLS LAST
    // garante que linhas sem o campo (TCLE sem valor, solicitacoes ainda nao
    // concluidas) ficam no fim. Fallback `s.id DESC` como segundo criterio mantem
    // ordem estavel quando ha empate (varios orcamentos do mesmo valor/dia/status).
    // Task #84 expandiu o whitelist com criado/concluido/status (asc/desc cada).
    // Task #89 expandiu com paciente/medico/farmacia (asc/desc) — reaproveita
    // os JOINs ja existentes (pacientes p, usuarios med, farmacias_parmavault f).
    // Task #92 expandiu com clinica (asc/desc) — usa o JOIN ja existente em
    // `unidades u` (pelo unidade_id do paciente). Aparece como coluna clicavel
    // na tela apenas no modo rede-wide (sem filtro de unidade), pra agrupar
    // visualmente "tudo da Padua Clinic em sequencia".
    // Task #96 — `ordenar_por` agora aceita LISTA de colunas separadas por
    // virgula (ex: `template_asc,criado_desc` = "todos os PARQ juntos, e
    // dentro de cada bloco os mais recentes primeiro"). Cada token e
    // validado contra a whitelist; tokens invalidos sao silenciosamente
    // descartados. Dedupe por coluna (mantem 1a ocorrencia) evita conflito
    // entre `template_asc` e `template_desc` no mesmo pedido. Cap de 4
    // dimensoes pra nao explodir o planner do Postgres em ordenacoes
    // absurdas. Single-token continua compativel com o contrato anterior.
    const ordenarPorRaw = typeof req.query["ordenar_por"] === "string"
      ? (req.query["ordenar_por"] as string).toLowerCase()
      : "";
    const tokens = parseTokensOrdenacao(ordenarPorRaw);
    const ordenarPor = tokens.length > 0 ? tokens.join(",") : "id_desc";
    const orderByClause = montarOrderBy(tokens);
    const countR = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t   ON t.id = s.template_id
      LEFT JOIN pacientes p         ON p.id = s.paciente_id
      LEFT JOIN unidades u          ON u.id = p.unidade_id
      ${filtroUnidadeJoin}
      ${filtroStatusWhere}
    `);
    const total = Number(
      (((countR as unknown as { rows?: Record<string, unknown>[] }).rows || [])[0] || {})["total"] || 0,
    );
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
        ) AS auditoria_eventos,
        rec.valor_formula_estimado   AS receita_valor,
        f.razao_social               AS farmacia_razao_social,
        f.nome_fantasia              AS farmacia_nome_fantasia,
        med.nome                     AS medico_nome
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t   ON t.id = s.template_id
      LEFT JOIN pacientes p         ON p.id = s.paciente_id
      LEFT JOIN unidades u          ON u.id = p.unidade_id
      LEFT JOIN parmavault_receitas rec
        ON (s.metadata->>'receitaId') ~ '^[0-9]+$'
       AND rec.id = (s.metadata->>'receitaId')::bigint
      LEFT JOIN farmacias_parmavault f
        ON f.id = COALESCE(
             rec.farmacia_id,
             CASE WHEN (s.metadata->>'farmaciaId') ~ '^[0-9]+$'
                  THEN (s.metadata->>'farmaciaId')::bigint END
           )
      LEFT JOIN usuarios med        ON med.id = rec.medico_id
      ${filtroUnidadeJoin}
      ${filtroStatusWhere}
      ${orderByClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `);
    // Task #79 — normaliza valor/farmacia/medico no payload pro frontend nao
    // precisar fazer COALESCE de razao_social/nome_fantasia. Mesmas regras dos
    // exports CSV/XLSX (Task #77): vazio quando o template nao tem essa
    // dimensao (ex: TCLE = sem farmacia, sem valor).
    const rowsRaw = (((r as unknown as { rows?: Record<string, unknown>[] }).rows) || []);
    const rowsEnriquecidas = rowsRaw.map((row) => {
      const valorNum = row["receita_valor"] !== null && row["receita_valor"] !== undefined
        ? Number(row["receita_valor"])
        : null;
      const farmaciaNome = row["farmacia_razao_social"] || row["farmacia_nome_fantasia"] || null;
      return {
        ...row,
        valor_brl: valorNum !== null && Number.isFinite(valorNum) ? valorNum : null,
        farmacia: farmaciaNome ? String(farmaciaNome) : null,
        medico: row["medico_nome"] ? String(row["medico_nome"]) : null,
      };
    });
    const rows = rowsEnriquecidas;
    const hasMore = offset + rows.length < total;
    res.json({
      solicitacoes: rows,
      // `total` agora reflete o COUNT(*) real (pode ser > rows.length quando
      // truncado pelo LIMIT). `retornados` traz o tamanho da pagina atual pra
      // UI nao precisar inferir do array.
      total,
      retornados: rows.length,
      limit,
      offset,
      has_more: hasMore,
      filtro_unidade_id: unidadeIdFiltro,
      filtro_status: statusFiltro,
      filtro_desde: desdeFiltro,
      filtro_ate: ateFiltro,
      ordenar_por: ordenarPor,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/assinaturas/timeline.csv — Task #60 · export CSV da timeline filtrada
 *
 * Mesmo gate (guardMaster) e mesmos filtros (`unidade_id`, `status`) do endpoint
 * /assinaturas/timeline. Retorna CSV (UTF-8 com BOM pra Excel renderizar acentos)
 * com colunas: id, template_codigo, template_nome, paciente, status,
 * signatarios_assinados, signatarios_total, criado_em, concluido_em.
 *
 * Mascaramento PII server-side: o nome do paciente sai mascarado no CSV
 * (primeiro nome + iniciais dos sobrenomes) porque CSVs viram anexo de
 * e-mail e podem vazar pra terceiros (contador, advogado externo). Em tela,
 * o mestre continua vendo o nome completo. Mesma filosofia de defesa em
 * profundidade do helper `mascararCpfServer` acima.
 *
 * IMPORTANTE: declarado ANTES de `/assinaturas/:id` por causa do match em
 * ordem do express (mesma razao de /timeline).
 */
router.get("/assinaturas/timeline.csv", guardMaster, async (req: Request, res: Response) => {
  try {
    const unidadeIdRaw = req.query["unidade_id"];
    const unidadeIdFiltro = unidadeIdRaw !== undefined && unidadeIdRaw !== "" && Number.isFinite(Number(unidadeIdRaw))
      ? Number(unidadeIdRaw)
      : null;
    const filtroUnidadeJoin = unidadeIdFiltro !== null
      ? sql`JOIN pacientes p_filt ON p_filt.id = s.paciente_id AND p_filt.unidade_id = ${unidadeIdFiltro}`
      : sql``;
    const STATUS_VALIDOS = new Set([
      "RASCUNHO", "ENVIADO", "PARCIAL", "CONCLUIDO", "REJEITADO", "EXPIRADO",
    ]);
    const statusRaw = req.query["status"];
    const statusFiltro: string[] = typeof statusRaw === "string" && statusRaw.length > 0
      ? statusRaw.split(",").map(s => s.trim().toUpperCase()).filter(s => STATUS_VALIDOS.has(s))
      : [];
    // Task #66 — filtro opcional por intervalo de datas (criado_em). Mesma
    // validacao defensiva (regex + checagem calendario) e mesma semantica
    // half-open do endpoint JSON /assinaturas/timeline pra que o CSV exportado
    // bata exatamente com a tabela renderizada na tela.
    const DATA_REGEX_CSV = /^(\d{4})-(\d{2})-(\d{2})$/;
    function parseDataOuNullCsv(raw: unknown): string | null {
      if (typeof raw !== "string") return null;
      const m = DATA_REGEX_CSV.exec(raw);
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
    const desdeFiltroCsv = parseDataOuNullCsv(req.query["desde"]);
    const ateFiltroCsv = parseDataOuNullCsv(req.query["ate"]);
    const filtrosWhereCsv: ReturnType<typeof sql>[] = [];
    if (statusFiltro.length > 0) {
      filtrosWhereCsv.push(sql`s.status IN (${sql.join(statusFiltro.map(s => sql`${s}`), sql`, `)})`);
    }
    if (desdeFiltroCsv !== null) {
      filtrosWhereCsv.push(sql`s.criado_em >= ${desdeFiltroCsv}::date`);
    }
    if (ateFiltroCsv !== null) {
      filtrosWhereCsv.push(sql`s.criado_em < (${ateFiltroCsv}::date + INTERVAL '1 day')`);
    }
    const filtroStatusWhere = filtrosWhereCsv.length > 0
      ? sql`WHERE ${sql.join(filtrosWhereCsv, sql` AND `)}`
      : sql``;
    // Task #76 — quando ha filtro de datas (desde ou ate), libera o cap de 50
    // pra permitir extrato mensal/trimestral pedido por contador/advogado.
    // Sem filtro de datas, mantem 50 (mesmo cap da tela). Cap defensivo de
    // 5000 em qualquer caso pra nao explodir memoria/timeout do Express.
    const temFiltroData = desdeFiltroCsv !== null || ateFiltroCsv !== null;
    const limiteCsv = temFiltroData ? 5000 : 50;
    // Task #83 — replica a whitelist de ordenacao do endpoint JSON pra que o
    // CSV exportado saia na MESMA ordem renderizada na tela quando o usuario
    // ordenou por valor. Default continua `s.id DESC` quando o param ausente
    // ou invalido (mesmo fallback defensivo do /timeline).
    // Task #93 — expandido pra whitelist completa (status/criado/concluido/
    // paciente/medico/farmacia, asc+desc) pra bater com Tasks #84 e #89: a
    // tela ja aceita ordenar por todas essas dimensoes, e o anexo CSV
    // precisa sair na MESMA ordem pra contador/advogado nao se confundir.
    // Task #95 — adicionado clinica (asc+desc) pra fechar o whitelist com o
    // endpoint JSON: Caio exporta extrato ordenado por Clínica pra contador
    // e o arquivo precisa sair na MESMA ordem que ele viu na tela.
    // Task #96 — mesma logica multi-coluna do JSON. CSV exportado precisa
    // bater 1:1 com a ordem visivel na tela (contador/advogado nao se
    // confunde). Fragmentos compartilhados em ORDENACOES_TIMELINE_FRAGMENT.
    const ordenarPorRawCsv = typeof req.query["ordenar_por"] === "string"
      ? (req.query["ordenar_por"] as string).toLowerCase()
      : "";
    const tokensCsv = parseTokensOrdenacao(ordenarPorRawCsv);
    const orderByClauseCsv = montarOrderBy(tokensCsv);
    const r = await db.execute(sql`
      SELECT
        s.id,
        s.status,
        s.criado_em,
        s.concluido_em,
        t.codigo                     AS template_codigo,
        t.nome_exibicao              AS template_nome,
        p.nome                       AS paciente_nome,
        u.nome                       AS paciente_unidade_nome,
        rec.valor_formula_estimado   AS receita_valor,
        f.razao_social               AS farmacia_razao_social,
        f.nome_fantasia              AS farmacia_nome_fantasia,
        med.nome                     AS medico_nome,
        (SELECT COUNT(*)::int FROM assinatura_signatarios sg WHERE sg.solicitacao_id = s.id) AS signatarios_total,
        (SELECT COUNT(*)::int FROM assinatura_signatarios sg WHERE sg.solicitacao_id = s.id AND sg.status = 'ASSINADO') AS signatarios_assinados
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t   ON t.id = s.template_id
      LEFT JOIN pacientes p         ON p.id = s.paciente_id
      LEFT JOIN unidades u          ON u.id = p.unidade_id
      LEFT JOIN parmavault_receitas rec
        ON (s.metadata->>'receitaId') ~ '^[0-9]+$'
       AND rec.id = (s.metadata->>'receitaId')::bigint
      LEFT JOIN farmacias_parmavault f
        ON f.id = COALESCE(
             rec.farmacia_id,
             CASE WHEN (s.metadata->>'farmaciaId') ~ '^[0-9]+$'
                  THEN (s.metadata->>'farmaciaId')::bigint END
           )
      LEFT JOIN usuarios med        ON med.id = rec.medico_id
      ${filtroUnidadeJoin}
      ${filtroStatusWhere}
      ${orderByClauseCsv}
      LIMIT ${limiteCsv}
    `);
    const rows = ((r as unknown as { rows?: Record<string, unknown>[] }).rows) || [];

    // CSV escape: envolve em aspas duplas e duplica aspas internas.
    // Aceita null/undefined virando string vazia. Nunca interpola CRLF/aspas
    // crus no payload — Excel/LibreOffice quebram com isso.
    // Neutraliza CSV/Excel formula injection: celulas que comecam com
    // =, +, -, @, TAB ou CR podem ser interpretadas como formula pelo Excel/
    // LibreOffice/Google Sheets. Como o CSV vai virar anexo de e-mail,
    // prefixa com aspa simples (padrao OWASP) pra forcar leitura como texto.
    const esc = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      let s = String(v);
      if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const isoOuVazio = (v: unknown): string => {
      if (!v) return "";
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    };
    // Mascaramento de nome de paciente pra CSV (anexo de e-mail vaza facil).
    // Regra: mantem primeiro nome + inicial maiuscula de cada sobrenome
    // ("Patricia Oliveira Rocha" -> "Patricia O. R."). Nome unico fica intacto.
    // Vazio/nulo vira marcador "— sem vinculo —" pra nao confundir com erro.
    const mascararNome = (n: unknown): string => {
      if (!n) return "— sem vínculo —";
      // Considera apenas tokens que comecam com letra (descarta sufixos
      // tipo "(FICTÍCIA)", "[teste]" — vira ruido em "(. [."). Usa unicode
      // \p{L} pra aceitar acentos (Á, É, ã, ç).
      const partes = String(n).trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p));
      if (partes.length === 0) return "— sem vínculo —";
      if (partes.length === 1) return partes[0]!;
      const primeiro = partes[0]!;
      const iniciais = partes.slice(1).map((p) => `${p.charAt(0).toUpperCase()}.`).join(" ");
      return `${primeiro} ${iniciais}`;
    };

    // Schema alinhado ao contrato da Task #60 + Task #77:
    // id | template | paciente (mascarado) | status | signatarios X/Y |
    // criado em | concluido em | valor_brl | farmacia | medico
    // Task #77: valor/farmacia/medico vem do JOIN com parmavault_receitas
    // (pra orcamento) e farmacias_parmavault (PARQ via metadata->>'farmaciaId').
    // Vazio quando o template nao tem essa dimensao (ex: TCLE = sem farmacia).
    // valor_brl no CSV vai como numero cru (sem R$/separador) pra contador
    // somar facil; o XLSX abaixo formata como moeda BRL nativo do Excel.
    const valorCsv = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      const n = Number(v);
      if (!Number.isFinite(n)) return "";
      return n.toFixed(2);
    };
    const farmaciaNome = (row: Record<string, unknown>): string => {
      return String(row["farmacia_razao_social"] || row["farmacia_nome_fantasia"] || "");
    };
    const header = [
      "id", "template", "paciente", "status",
      "signatarios", "criado_em", "concluido_em",
      "valor_brl", "farmacia", "medico",
    ].map(esc).join(",");
    const linhas = rows.map((row) => [
      row["id"],
      row["template_codigo"],
      mascararNome(row["paciente_nome"]),
      row["status"],
      `${row["signatarios_assinados"] ?? 0}/${row["signatarios_total"] ?? 0}`,
      isoOuVazio(row["criado_em"]),
      isoOuVazio(row["concluido_em"]),
      valorCsv(row["receita_valor"]),
      farmaciaNome(row),
      row["medico_nome"] ?? "",
    ].map(esc).join(","));

    // BOM UTF-8 (\uFEFF) faz o Excel reconhecer encoding e renderizar acentos.
    const csv = "\uFEFF" + [header, ...linhas].join("\r\n") + "\r\n";

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `assinaturas-timeline-${stamp}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/assinaturas/timeline.xlsx — Task #65 · export XLSX da timeline filtrada
 *
 * Mesmo gate (guardMaster) e mesmos filtros (`unidade_id`, `status`) do CSV.
 * Diferenca: planilha .xlsx com (i) datas como tipo `date` nativo do Excel
 * (formato dd/mm/yyyy hh:mm), (ii) header em negrito + fundo navy/gold
 * institucional, (iii) larguras minimas por coluna (sem precisar do usuario
 * arrastar pra ler), (iv) painel congelado na primeira linha pra rolar
 * mantendo o header visivel — pedido de escritorios contabeis/juridicos.
 *
 * Mesmo mascaramento de paciente (primeiro nome + iniciais) — anexo de
 * e-mail vaza facil. Mesma protecao contra formula injection (prefixa aspa
 * simples se celula de texto comeca com =/+/-/@).
 *
 * IMPORTANTE: declarado ANTES de `/assinaturas/:id` por causa do match em
 * ordem do express (mesma razao de /timeline e /timeline.csv).
 */
router.get("/assinaturas/timeline.xlsx", guardMaster, async (req: Request, res: Response) => {
  try {
    const unidadeIdRaw = req.query["unidade_id"];
    const unidadeIdFiltro = unidadeIdRaw !== undefined && unidadeIdRaw !== "" && Number.isFinite(Number(unidadeIdRaw))
      ? Number(unidadeIdRaw)
      : null;
    const filtroUnidadeJoin = unidadeIdFiltro !== null
      ? sql`JOIN pacientes p_filt ON p_filt.id = s.paciente_id AND p_filt.unidade_id = ${unidadeIdFiltro}`
      : sql``;
    const STATUS_VALIDOS = new Set([
      "RASCUNHO", "ENVIADO", "PARCIAL", "CONCLUIDO", "REJEITADO", "EXPIRADO",
    ]);
    const statusRaw = req.query["status"];
    const statusFiltro: string[] = typeof statusRaw === "string" && statusRaw.length > 0
      ? statusRaw.split(",").map(s => s.trim().toUpperCase()).filter(s => STATUS_VALIDOS.has(s))
      : [];
    // Task #76 — XLSX agora tambem aceita filtro de datas (mesmo formato e
    // semantica half-open do CSV/JSON: ate inclusivo via ate+1day).
    const DATA_REGEX_XLSX = /^(\d{4})-(\d{2})-(\d{2})$/;
    function parseDataOuNullXlsx(raw: unknown): string | null {
      if (typeof raw !== "string") return null;
      const m = DATA_REGEX_XLSX.exec(raw);
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
    const desdeFiltroXlsx = parseDataOuNullXlsx(req.query["desde"]);
    const ateFiltroXlsx = parseDataOuNullXlsx(req.query["ate"]);
    const filtrosWhereXlsx: ReturnType<typeof sql>[] = [];
    if (statusFiltro.length > 0) {
      filtrosWhereXlsx.push(sql`s.status IN (${sql.join(statusFiltro.map(s => sql`${s}`), sql`, `)})`);
    }
    if (desdeFiltroXlsx !== null) {
      filtrosWhereXlsx.push(sql`s.criado_em >= ${desdeFiltroXlsx}::date`);
    }
    if (ateFiltroXlsx !== null) {
      filtrosWhereXlsx.push(sql`s.criado_em < (${ateFiltroXlsx}::date + INTERVAL '1 day')`);
    }
    const filtroStatusWhere = filtrosWhereXlsx.length > 0
      ? sql`WHERE ${sql.join(filtrosWhereXlsx, sql` AND `)}`
      : sql``;
    // Task #76 — mesma logica do CSV: com filtro de data libera ate 5000,
    // sem filtro mantem 50 (mesmo cap da tela).
    const temFiltroDataXlsx = desdeFiltroXlsx !== null || ateFiltroXlsx !== null;
    const limiteXlsx = temFiltroDataXlsx ? 5000 : 50;
    // Task #83 — mesma whitelist de ordenacao do JSON/CSV pra que o XLSX
    // exportado bata com a ordem visivel na tela. Default `s.id DESC`.
    // Task #93 — expandido pra whitelist completa (status/criado/concluido/
    // paciente/medico/farmacia, asc+desc) batendo com Tasks #84 e #89.
    // Task #95 — adicionado clinica (asc+desc) pra fechar o whitelist com o
    // endpoint JSON: extrato XLSX precisa sair na MESMA ordem da tela.
    // Task #96 — mesma logica multi-coluna do JSON/CSV. XLSX precisa bater
    // 1:1 com a ordem visivel na tela. Fragmentos compartilhados em
    // ORDENACOES_TIMELINE_FRAGMENT (modulo-level).
    const ordenarPorRawXlsx = typeof req.query["ordenar_por"] === "string"
      ? (req.query["ordenar_por"] as string).toLowerCase()
      : "";
    const tokensXlsx = parseTokensOrdenacao(ordenarPorRawXlsx);
    const orderByClauseXlsx = montarOrderBy(tokensXlsx);
    const r = await db.execute(sql`
      SELECT
        s.id,
        s.status,
        s.criado_em,
        s.concluido_em,
        t.codigo                     AS template_codigo,
        t.nome_exibicao              AS template_nome,
        p.nome                       AS paciente_nome,
        u.nome                       AS paciente_unidade_nome,
        rec.valor_formula_estimado   AS receita_valor,
        f.razao_social               AS farmacia_razao_social,
        f.nome_fantasia              AS farmacia_nome_fantasia,
        med.nome                     AS medico_nome,
        (SELECT COUNT(*)::int FROM assinatura_signatarios sg WHERE sg.solicitacao_id = s.id) AS signatarios_total,
        (SELECT COUNT(*)::int FROM assinatura_signatarios sg WHERE sg.solicitacao_id = s.id AND sg.status = 'ASSINADO') AS signatarios_assinados
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t   ON t.id = s.template_id
      LEFT JOIN pacientes p         ON p.id = s.paciente_id
      LEFT JOIN unidades u          ON u.id = p.unidade_id
      LEFT JOIN parmavault_receitas rec
        ON (s.metadata->>'receitaId') ~ '^[0-9]+$'
       AND rec.id = (s.metadata->>'receitaId')::bigint
      LEFT JOIN farmacias_parmavault f
        ON f.id = COALESCE(
             rec.farmacia_id,
             CASE WHEN (s.metadata->>'farmaciaId') ~ '^[0-9]+$'
                  THEN (s.metadata->>'farmaciaId')::bigint END
           )
      LEFT JOIN usuarios med        ON med.id = rec.medico_id
      ${filtroUnidadeJoin}
      ${filtroStatusWhere}
      ${orderByClauseXlsx}
      LIMIT ${limiteXlsx}
    `);
    const rows = ((r as unknown as { rows?: Record<string, unknown>[] }).rows) || [];

    // Mesmas defesas do CSV: mascarar nome de paciente (anexo de e-mail
    // vaza facil) e neutralizar formula injection em celulas de texto.
    const mascararNome = (n: unknown): string => {
      if (!n) return "— sem vínculo —";
      const partes = String(n).trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p));
      if (partes.length === 0) return "— sem vínculo —";
      if (partes.length === 1) return partes[0]!;
      const primeiro = partes[0]!;
      const iniciais = partes.slice(1).map((p) => `${p.charAt(0).toUpperCase()}.`).join(" ");
      return `${primeiro} ${iniciais}`;
    };
    const sanitizarTexto = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) return `'${s}`;
      return s;
    };
    const dataOuNull = (v: unknown): Date | null => {
      if (!v) return null;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = "PAWARDS MEDCORE";
    wb.created = new Date();
    const ws = wb.addWorksheet("Timeline", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    // Task #77: 3 colunas novas — valor da receita (orcamento), farmacia
    // parceira (orcamento/PARQ), medico responsavel (orcamento). numFmt
    // `R$ #,##0.00` faz o Excel ja somar como moeda BRL no SUM/SUBTOTAL.
    ws.columns = [
      { header: "ID",                key: "id",            width: 8 },
      { header: "Template",          key: "template",      width: 20 },
      { header: "Paciente",          key: "paciente",      width: 32 },
      { header: "Status",            key: "status",        width: 14 },
      { header: "Signatários",       key: "signatarios",   width: 14 },
      { header: "Criado em",         key: "criado_em",     width: 18, style: { numFmt: "dd/mm/yyyy hh:mm" } },
      { header: "Concluído em",      key: "concluido_em",  width: 18, style: { numFmt: "dd/mm/yyyy hh:mm" } },
      { header: "Valor (R$)",        key: "valor_brl",     width: 14, style: { numFmt: "[$R$ ]#,##0.00;[Red]-[$R$ ]#,##0.00" } },
      { header: "Farmácia",          key: "farmacia",      width: 32 },
      { header: "Médico",            key: "medico",        width: 28 },
    ];
    // Header em negrito + fundo navy/gold institucional + congelado.
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFC89B3C" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF020406" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "left" };
    headerRow.height = 22;

    // Task #77: valor como NUMBER nativo (nao string) pra Excel ja somar
    // com SUM(). Vazio = null = celula em branco (nao zero, pra contador
    // ver claramente quando o template nao tem valor — ex: TCLE).
    const valorNumOuNull = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const farmaciaNomeXlsx = (row: Record<string, unknown>): string => {
      return sanitizarTexto(row["farmacia_razao_social"] || row["farmacia_nome_fantasia"] || "");
    };
    for (const row of rows) {
      ws.addRow({
        id: Number(row["id"]),
        template: sanitizarTexto(row["template_codigo"]),
        paciente: mascararNome(row["paciente_nome"]),
        status: sanitizarTexto(row["status"]),
        signatarios: `${row["signatarios_assinados"] ?? 0}/${row["signatarios_total"] ?? 0}`,
        criado_em: dataOuNull(row["criado_em"]),
        concluido_em: dataOuNull(row["concluido_em"]),
        valor_brl: valorNumOuNull(row["receita_valor"]),
        farmacia: farmaciaNomeXlsx(row),
        medico: sanitizarTexto(row["medico_nome"]),
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `assinaturas-timeline-${stamp}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(buf));
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
