/**
 * Task #251 — Cobertura ponta-a-ponta do silêncio de avisos do CEO (Task #45,
 * pre-check 2b do worker `tickNotifAssinatura`).
 *
 * Cenários:
 *   1. ASSINADO em janela com pref ligada              -> PULADO_QUIET
 *   2. REJEITADO em janela (pref ligada)               -> bypass (hard-lock)
 *   3. Sem pref cadastrada                             -> bypass
 *   4. ASSINADO em janela com pref desligada           -> bypass
 *   5. Helper dentroDoQuiet detecta wrap 22:00->07:00
 *   6. Helper calcProximoQuietFimCEO reagenda corretamente
 *
 * Drift vs descrição original do Task #251: o cenário "REJEITADO com
 * nunca_silenciar_recusa=false -> PULADO_QUIET" não é coberto porque o
 * código atual hard-locka recusa a sempre passar (worker não lê o flag,
 * rota força true). Os testes refletem o comportamento real e a invariante.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  tickNotifAssinatura,
  invalidarCacheNotifConfig,
  invalidarCacheCEOPrefs,
  dentroDoQuiet,
  parseHHMMSS,
  horaLocal,
  calcProximoQuietFimCEO,
} from "./notifAssinatura";

interface NotifRow {
  status: string;
  erro: string | null;
  proxima_tentativa_em: Date | null;
  tentativas: number;
}

interface ExecResult<T> {
  rows?: T[];
}

function rowsOf<T>(r: unknown): T[] {
  const cast = r as ExecResult<T> | T[];
  if (Array.isArray(cast)) return cast;
  return cast.rows ?? [];
}

function novoEmailTeste(): string {
  return `task251-ceo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@pawards.test`;
}

async function criarUsuarioCEO(email: string): Promise<number> {
  const r = await db.execute<{ id: number }>(sql`
    INSERT INTO usuarios (nome, email, senha, perfil, escopo, perfil_plataforma, ativo)
    VALUES ('Teste Task251 CEO', ${email}, 'x', 'validador_mestre',
            'consultoria_master', 'tenant_user', true)
    RETURNING id
  `);
  return r.rows[0]!.id;
}

async function setarPrefCEO(opts: {
  usuarioId: number;
  canal: "EMAIL" | "WHATSAPP";
  habilitar: boolean;
}): Promise<void> {
  await db.execute(sql`
    INSERT INTO ceo_notif_preferencias
      (usuario_id, canal, quiet_inicio, quiet_fim, tz,
       habilitar_quiet_hours, nunca_silenciar_recusa, atualizado_em)
    VALUES (${opts.usuarioId}, ${opts.canal}, '00:00:00'::time, '23:59:59'::time,
            'UTC', ${opts.habilitar}, true, NOW())
    ON CONFLICT (usuario_id, canal) DO UPDATE SET
      quiet_inicio = EXCLUDED.quiet_inicio,
      quiet_fim    = EXCLUDED.quiet_fim,
      tz           = EXCLUDED.tz,
      habilitar_quiet_hours = EXCLUDED.habilitar_quiet_hours,
      atualizado_em = NOW()
  `);
  invalidarCacheCEOPrefs();
}

/**
 * Garante que existe pelo menos uma `assinatura_solicitacoes` reutilizável
 * pelos testes (FK `assinatura_notificacoes.solicitacao_id` exige NOT NULL).
 * Cria fixtures completas (provedor, template, par testemunhas) se faltarem.
 */
async function garantirSolicitacaoFixture(): Promise<number> {
  const existente = await db.execute<{ id: number }>(sql`
    SELECT id FROM assinatura_solicitacoes ORDER BY id LIMIT 1
  `);
  const ja = rowsOf<{ id: number }>(existente)[0];
  if (ja) return ja.id;

  await db.execute(sql`
    INSERT INTO provedores_assinatura_digital (codigo, nome, ativo)
    VALUES ('TASK251_FAKE', 'Provedor Fake Task251', true)
    ON CONFLICT (codigo) DO NOTHING
  `);
  const tpl = await db.execute<{ id: number }>(sql`
    INSERT INTO assinatura_templates (codigo, nome, conteudo)
    VALUES ('TASK251_TPL', 'Template Task251', 'placeholder')
    ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `);
  const tplId = rowsOf<{ id: number }>(tpl)[0]!.id;

  const ins = await db.execute<{ id: number }>(sql`
    INSERT INTO assinatura_solicitacoes (template_id, provedor_codigo, status)
    VALUES (${tplId}, 'TASK251_FAKE', 'RASCUNHO')
    RETURNING id
  `);
  return rowsOf<{ id: number }>(ins)[0]!.id;
}

async function inserirNotifCEO(opts: {
  destinatario: string;
  canal: "EMAIL" | "WHATSAPP";
  evento: "ASSINADO" | "REJEITADO";
  solicitacaoId: number;
}): Promise<number> {
  const r = await db.execute<{ id: number }>(sql`
    INSERT INTO assinatura_notificacoes
      (solicitacao_id, canal, momento, destinatario, assunto, corpo, status,
       is_sistema_ceo, evento_ceo, criado_em)
    VALUES (${opts.solicitacaoId}, ${opts.canal}, 'LEMBRETE', ${opts.destinatario},
            'Task251 alerta CEO', 'corpo task251',
            'PENDENTE', true, ${opts.evento}, NOW())
    RETURNING id
  `);
  return r.rows[0]!.id;
}

async function lerNotif(id: number): Promise<NotifRow> {
  const r = await db.execute<NotifRow>(sql`
    SELECT status, erro, proxima_tentativa_em, tentativas
    FROM assinatura_notificacoes WHERE id = ${id}
  `);
  const row = rowsOf<NotifRow>(r)[0];
  return {
    status: String(row?.status ?? ""),
    erro: row?.erro ?? null,
    proxima_tentativa_em: row?.proxima_tentativa_em ?? null,
    tentativas: Number(row?.tentativas ?? 0),
  };
}

async function limpar(usuarioId: number | null, email: string): Promise<void> {
  await db.execute(sql`
    DELETE FROM assinatura_notificacoes WHERE destinatario = ${email}
  `);
  if (usuarioId) {
    await db.execute(sql`DELETE FROM ceo_notif_preferencias WHERE usuario_id = ${usuarioId}`);
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${usuarioId}`);
  }
  invalidarCacheCEOPrefs();
  invalidarCacheNotifConfig();
}

test("Task #251 · pre-check 2b: ASSINADO em janela com pref ligada -> PULADO_QUIET", async () => {
  const solicId = await garantirSolicitacaoFixture();
  const email = novoEmailTeste();
  let usuarioId: number | null = null;
  try {
    usuarioId = await criarUsuarioCEO(email);
    await setarPrefCEO({ usuarioId, canal: "EMAIL", habilitar: true });
    const id = await inserirNotifCEO({
      destinatario: email,
      canal: "EMAIL",
      evento: "ASSINADO",
      solicitacaoId: solicId,
    });

    const r = await tickNotifAssinatura();
    assert.ok(r.processadas >= 1);

    const row = await lerNotif(id);
    assert.equal(row.status, "PULADO_QUIET");
    assert.match(String(row.erro ?? ""), /ceo_quiet_hours/i);
    assert.ok(row.proxima_tentativa_em);
    assert.equal(row.tentativas, 0);
  } finally {
    await limpar(usuarioId, email);
  }
});

test("Task #251 · pre-check 2b: REJEITADO em janela bypassa quiet (hard-lock)", async () => {
  const solicId = await garantirSolicitacaoFixture();
  const email = novoEmailTeste();
  let usuarioId: number | null = null;
  try {
    usuarioId = await criarUsuarioCEO(email);
    await setarPrefCEO({ usuarioId, canal: "EMAIL", habilitar: true });
    const id = await inserirNotifCEO({
      destinatario: email,
      canal: "EMAIL",
      evento: "REJEITADO",
      solicitacaoId: solicId,
    });

    await tickNotifAssinatura();

    const row = await lerNotif(id);
    assert.notEqual(row.status, "PULADO_QUIET");
    assert.doesNotMatch(String(row.erro ?? ""), /ceo_quiet_hours/i);
    assert.ok(row.tentativas >= 1);
  } finally {
    await limpar(usuarioId, email);
  }
});

test("Task #251 · pre-check 2b: sem pref cadastrada, ASSINADO passa 24/7", async () => {
  const solicId = await garantirSolicitacaoFixture();
  const email = novoEmailTeste();
  let usuarioId: number | null = null;
  try {
    usuarioId = await criarUsuarioCEO(email);
    const id = await inserirNotifCEO({
      destinatario: email,
      canal: "EMAIL",
      evento: "ASSINADO",
      solicitacaoId: solicId,
    });

    await tickNotifAssinatura();

    const row = await lerNotif(id);
    assert.notEqual(row.status, "PULADO_QUIET");
    assert.doesNotMatch(String(row.erro ?? ""), /ceo_quiet_hours/i);
    assert.ok(row.tentativas >= 1);
  } finally {
    await limpar(usuarioId, email);
  }
});

test("Task #251 · pre-check 2b: pref desligada (habilitar_quiet_hours=false) bypassa", async () => {
  const solicId = await garantirSolicitacaoFixture();
  const email = novoEmailTeste();
  let usuarioId: number | null = null;
  try {
    usuarioId = await criarUsuarioCEO(email);
    await setarPrefCEO({ usuarioId, canal: "EMAIL", habilitar: false });
    const id = await inserirNotifCEO({
      destinatario: email,
      canal: "EMAIL",
      evento: "ASSINADO",
      solicitacaoId: solicId,
    });

    await tickNotifAssinatura();

    const row = await lerNotif(id);
    assert.notEqual(row.status, "PULADO_QUIET");
    assert.doesNotMatch(String(row.erro ?? ""), /ceo_quiet_hours/i);
  } finally {
    await limpar(usuarioId, email);
  }
});

test("Task #251 · helper dentroDoQuiet detecta wrap 22:00->07:00", () => {
  const inicio = parseHHMMSS("22:00:00");
  const fim = parseHHMMSS("07:00:00");
  assert.equal(dentroDoQuiet({ h: 23, m: 0, s: 0 }, inicio, fim), true);
  assert.equal(dentroDoQuiet({ h: 0, m: 0, s: 0 }, inicio, fim), true);
  assert.equal(dentroDoQuiet({ h: 3, m: 0, s: 0 }, inicio, fim), true);
  assert.equal(dentroDoQuiet({ h: 6, m: 59, s: 59 }, inicio, fim), true);
  assert.equal(dentroDoQuiet({ h: 7, m: 0, s: 0 }, inicio, fim), false);
  assert.equal(dentroDoQuiet({ h: 12, m: 0, s: 0 }, inicio, fim), false);
  assert.equal(dentroDoQuiet({ h: 21, m: 59, s: 59 }, inicio, fim), false);
});

test("Task #251 · helper calcProximoQuietFimCEO reagenda pro proximo 07:00 (wrap)", () => {
  const pref = {
    quiet_inicio: "22:00:00",
    quiet_fim: "07:00:00",
    tz: "UTC",
    habilitar_quiet_hours: true,
    nunca_silenciar_recusa: true,
  };

  const base1 = new Date(Date.UTC(2026, 0, 1, 23, 0, 0));
  const r1 = calcProximoQuietFimCEO(pref, base1);
  const horas1 = (r1.getTime() - base1.getTime()) / 3600000;
  assert.ok(horas1 > 8 && horas1 < 8.1, `esperava ~8h+1min, deu ${horas1}h`);
  assert.equal(horaLocal("UTC", r1).h, 7);

  const base2 = new Date(Date.UTC(2026, 0, 1, 3, 0, 0));
  const r2 = calcProximoQuietFimCEO(pref, base2);
  const horas2 = (r2.getTime() - base2.getTime()) / 3600000;
  assert.ok(horas2 > 4 && horas2 < 4.1, `esperava ~4h+1min, deu ${horas2}h`);
  assert.equal(horaLocal("UTC", r2).h, 7);

  const base3 = new Date(Date.UTC(2026, 0, 1, 7, 0, 0));
  const r3 = calcProximoQuietFimCEO(pref, base3);
  const horas3 = (r3.getTime() - base3.getTime()) / 3600000;
  assert.ok(horas3 > 23.9 && horas3 < 24.1, `esperava ~24h, deu ${horas3}h`);
});
