/**
 * PARMASUPRA-TSUNAMI · Wave 3 · cobrancasAuto.ts
 *
 * Centraliza a logica de cobrancas automaticas pra Dr. Caio cobrar das
 * clinicas parceiras. 3 funcoes publicas:
 *
 *  - registrarInclusaoSubstancia(unidadeId, substanciaId, userId)
 *      T5 · ao incluir substancia controlada nova, gera 1 cobranca pendente
 *      com valor de permissoes_delegadas.preco_inclusao_substancia_brl
 *
 *  - registrarCobrancasMensaisRecorrentes(anoMes)
 *      T6 · varre permissoes_delegadas com ativo=true e preco_mensal_brl>0
 *      e gera 1 cobranca/unidade/mes idempotente (UNIQUE referencia_tipo
 *      + referencia_id). Chamado pelo worker no dia 5 do mes.
 *
 *  - enviarEmailCobranca(cobrancaId)
 *      T7 · dispara e-mail pro responsavel da unidade. Defensivo: se
 *      integracao google-mail nao estiver acessivel, faz log e segue.
 *
 * Filosofia: TODO esse modulo eh DEFENSIVO. Falha em cobranca NUNCA pode
 * derrubar o fluxo principal (incluir substancia, criar receita, etc.).
 * Erros sao logados e silenciados pra preservar UX.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "./google-gmail";
import { wrapEmailMedcore } from "./recorrencia/notifTemplate";

// FATURAMENTO-TSUNAMI Wave 3: helper local pra montar raw email Gmail API
// (mesmo pattern de notifAssinatura.ts/buildEmailRaw).
function _sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}
function _buildEmailRawCobranca(to: string, subject: string, htmlBody: string): string {
  const fromAddr = "clinica.padua.agenda@gmail.com";
  const parts = [
    `From: PAWARDS MEDCORE - Faturamento <${fromAddr}>`,
    `To: ${_sanitizeHeader(to)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(htmlBody).toString("base64"),
  ];
  return Buffer.from(parts.join("\r\n")).toString("base64url");
}

// ════════════════════════════════════════════════════════════════════
// LOG defensivo (se logger global nao disponivel, cai no console)
// ════════════════════════════════════════════════════════════════════
function log(level: "info" | "warn" | "error", msg: string, ctx?: any) {
  const stamp = new Date().toISOString();
  const prefix = `[cobrancasAuto ${stamp}]`;
  if (level === "error") console.error(prefix, msg, ctx ?? "");
  else if (level === "warn") console.warn(prefix, msg, ctx ?? "");
  else console.log(prefix, msg, ctx ?? "");
}

// ════════════════════════════════════════════════════════════════════
// T5 · Hook: cobranca automatica ao incluir substancia controlada
// ════════════════════════════════════════════════════════════════════
export async function registrarInclusaoSubstancia(
  unidadeId: number | null | undefined,
  substanciaId: number,
  criadoPorUsuarioId: number | null | undefined,
): Promise<{ cobrado: boolean; motivo: string; cobranca_id?: number }> {
  // Defensivo: sem unidadeId (ADMIN_TOKEN, usuario master) nao cobra
  if (!unidadeId || unidadeId <= 0) {
    return { cobrado: false, motivo: "sem_unidade_no_contexto" };
  }
  if (!substanciaId || substanciaId <= 0) {
    return { cobrado: false, motivo: "substancia_invalida" };
  }

  try {
    // Busca permissao_delegada da unidade pra essa categoria
    const perm = await db.execute(sql`
      SELECT id, ativo, preco_inclusao_substancia_brl
      FROM permissoes_delegadas
      WHERE unidade_id = ${unidadeId}
        AND permissao = 'incluir_substancia_nova'
      LIMIT 1
    `);
    if (perm.rows.length === 0) {
      return { cobrado: false, motivo: "sem_permissao_delegada" };
    }
    const p: any = perm.rows[0];
    if (!p.ativo) {
      return { cobrado: false, motivo: "permissao_inativa" };
    }
    const valor = Number(p.preco_inclusao_substancia_brl);
    if (!Number.isFinite(valor) || valor <= 0) {
      return { cobrado: false, motivo: "preco_zerado" };
    }

    // Idempotencia: nao duplica cobranca pra mesma (unidade, substancia)
    const ja = await db.execute(sql`
      SELECT id FROM cobrancas_adicionais
      WHERE unidade_id = ${unidadeId}
        AND tipo = 'inclusao_substancia'
        AND referencia_id = ${substanciaId}
      LIMIT 1
    `);
    if (ja.rows.length > 0) {
      return { cobrado: false, motivo: "ja_cobrado", cobranca_id: (ja.rows[0] as any).id };
    }

    const inserido = await db.execute(sql`
      INSERT INTO cobrancas_adicionais
        (unidade_id, tipo, descricao, valor_brl, referencia_id, referencia_tipo, status, criado_por_usuario_id)
      VALUES
        (${unidadeId}, 'inclusao_substancia',
         ${`Inclusão de substância controlada #${substanciaId}`},
         ${valor.toFixed(2)},
         ${substanciaId}, 'substancia',
         'pendente',
         ${criadoPorUsuarioId ?? null})
      RETURNING id
    `);
    const cobrancaId = Number((inserido.rows[0] as any).id);
    log("info", "T5 cobranca inclusao gerada", { unidadeId, substanciaId, valor, cobrancaId });

    // T7: dispara e-mail (assincrono, defensivo)
    void enviarEmailCobranca(cobrancaId).catch((e) =>
      log("warn", "T7 envio email falhou", { cobrancaId, err: String(e) })
    );

    return { cobrado: true, motivo: "ok", cobranca_id: cobrancaId };
  } catch (err) {
    log("error", "T5 falha registrar cobranca inclusao", { unidadeId, substanciaId, err: String(err) });
    return { cobrado: false, motivo: "erro_interno" };
  }
}

// ════════════════════════════════════════════════════════════════════
// T6 · Worker mensal: cobranca recorrente das permissoes ativas
// ════════════════════════════════════════════════════════════════════
export async function registrarCobrancasMensaisRecorrentes(
  anoMesAlvo?: string,
): Promise<{ geradas: number; ja_existentes: number; mes: string; erros: number }> {
  const mes = anoMesAlvo ?? new Date().toISOString().slice(0, 7); // YYYY-MM
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    log("error", "T6 mes invalido", { mes });
    return { geradas: 0, ja_existentes: 0, mes, erros: 1 };
  }

  let geradas = 0, jaExistentes = 0, erros = 0;
  try {
    const ativas = await db.execute(sql`
      SELECT id, unidade_id, permissao, preco_mensal_brl
      FROM permissoes_delegadas
      WHERE ativo = true AND preco_mensal_brl > 0
    `);

    for (const p of ativas.rows as any[]) {
      const valor = Number(p.preco_mensal_brl);
      if (!Number.isFinite(valor) || valor <= 0) continue;

      try {
        // Idempotencia por (unidade, mes, tipo) — usa descricao com mes pra
        // permitir multiplas permissoes na mesma unidade (1 cobranca por permissao)
        const ja = await db.execute(sql`
          SELECT id FROM cobrancas_adicionais
          WHERE unidade_id = ${p.unidade_id}
            AND tipo = 'delegacao_mensal'
            AND referencia_id = ${p.id}
            AND TO_CHAR(criado_em AT TIME ZONE 'UTC', 'YYYY-MM') = ${mes}
          LIMIT 1
        `);
        if (ja.rows.length > 0) {
          jaExistentes++;
          continue;
        }

        const ins = await db.execute(sql`
          INSERT INTO cobrancas_adicionais
            (unidade_id, tipo, descricao, valor_brl,
             referencia_id, referencia_tipo, status)
          VALUES
            (${p.unidade_id}, 'delegacao_mensal',
             ${`Mensalidade permissão delegada '${p.permissao}' · ${mes}`},
             ${valor.toFixed(2)},
             ${p.id}, 'permissao_delegada',
             'pendente')
          RETURNING id
        `);
        geradas++;
        const cobrancaId = Number((ins.rows[0] as any).id);
        void enviarEmailCobranca(cobrancaId).catch((e) =>
          log("warn", "T7 envio email falhou (recorrente)", { cobrancaId, err: String(e) })
        );
      } catch (e) {
        erros++;
        log("error", "T6 falha gerar cobranca recorrente", { permId: p.id, err: String(e) });
      }
    }

    log("info", "T6 ciclo mensal concluido", { mes, geradas, jaExistentes, erros });
  } catch (err) {
    erros++;
    log("error", "T6 falha geral worker recorrente", { err: String(err) });
  }
  return { geradas, ja_existentes: jaExistentes, mes, erros };
}

// ════════════════════════════════════════════════════════════════════
// T7 · E-mail responsavel via google-mail (defensivo)
// ════════════════════════════════════════════════════════════════════
export async function enviarEmailCobranca(cobrancaId: number): Promise<{ enviado: boolean; motivo: string }> {
  if (!cobrancaId || cobrancaId <= 0) return { enviado: false, motivo: "id_invalido" };

  try {
    const r = await db.execute(sql`
      SELECT
        ca.id, ca.tipo, ca.descricao, ca.valor_brl, ca.status, ca.criado_em,
        ca.tentativas_envio,
        u.id AS unidade_id, u.nome AS unidade_nome,
        COALESCE(u.email_geral, u.email_agenda, u.email_supervisor01) AS email_destino
      FROM cobrancas_adicionais ca
      JOIN unidades u ON u.id = ca.unidade_id
      WHERE ca.id = ${cobrancaId}
      LIMIT 1
    `);
    if (r.rows.length === 0) return { enviado: false, motivo: "cobranca_nao_encontrada" };
    const c: any = r.rows[0];
    const destino: string = c.email_destino || "ceo@pawards.com.br"; // fallback Dr. Caio
    if (!destino.includes("@")) {
      return { enviado: false, motivo: "email_invalido" };
    }

    const valorFmt = `R$ ${Number(c.valor_brl).toFixed(2).replace(".", ",")}`;
    const assunto = `[PAWARDS MEDCORE] Nova cobrança: ${c.tipo} · ${c.unidade_nome}`;

    const corpoHtml = `
      <p>Foi gerada uma nova cobrança para a unidade <strong>${c.unidade_nome}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:8px;border:1px solid #ddd;background:#FAFAF7"><strong>Tipo</strong></td><td style="padding:8px;border:1px solid #ddd">${c.tipo}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;background:#FAFAF7"><strong>Descrição</strong></td><td style="padding:8px;border:1px solid #ddd">${c.descricao}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;background:#FAFAF7"><strong>Valor</strong></td><td style="padding:8px;border:1px solid #ddd;color:#020406;font-weight:bold;font-size:18px">${valorFmt}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;background:#FAFAF7"><strong>Status</strong></td><td style="padding:8px;border:1px solid #ddd">${String(c.status).toUpperCase()}</td></tr>
      </table>
      <p style="font-size:13px;color:#6B6B6B">
        Você pode visualizar o detalhamento e o histórico financeiro da unidade no
        painel administrativo PAWARDS MEDCORE. Em caso de dúvidas, fale com o Dr. Caio
        diretamente pelo WhatsApp do portal do paciente.
      </p>
    `;

    const htmlBody = wrapEmailMedcore({
      subject: assunto,
      bodyHtmlOrText: corpoHtml,
      pacienteNome: undefined,
      unidadeNick: c.unidade_nome,
      momento: undefined,
    });

    const gmail = await getGmailClient();
    const raw = _buildEmailRawCobranca(destino, assunto, htmlBody);
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    await db.execute(sql`
      UPDATE cobrancas_adicionais
      SET status           = CASE WHEN status = 'pendente' THEN 'cobrado' ELSE status END,
          cobrado_em       = COALESCE(cobrado_em, now()),
          enviado_em       = now(),
          erro_envio       = NULL,
          tentativas_envio = COALESCE(tentativas_envio, 0) + 1
      WHERE id = ${cobrancaId}
    `);

    log("info", "T7 cobranca email enviado branded", {
      cobrancaId, destino, unidade: c.unidade_nome, valor: c.valor_brl, gmailId: res.data?.id,
    });
    return { enviado: true, motivo: "ok" };
  } catch (err) {
    const msg = String(err);
    try {
      await db.execute(sql`
        UPDATE cobrancas_adicionais
        SET erro_envio       = ${msg.slice(0, 500)},
            tentativas_envio = COALESCE(tentativas_envio, 0) + 1
        WHERE id = ${cobrancaId}
      `);
    } catch { /* defensivo */ }
    log("error", "T7 falha enviar email", { cobrancaId, err: msg });
    return { enviado: false, motivo: msg.includes("Gmail not connected") ? "google_mail_pendente_de_credenciais_real" : "erro_interno" };
  }
}

// Bootstrap do worker NAO eh exposto aqui: a funcao
// `registrarCobrancasMensaisRecorrentes` ja esta plugada dentro do tick
// existente em `lib/recorrencia/cobrancaMensal.ts` (worker iniciado pelo
// `iniciarWorkerCobrancaMensal()` em index.ts). Idempotente, seguro rodar
// a cada 6h sem duplicar registros.
