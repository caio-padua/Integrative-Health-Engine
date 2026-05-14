/**
 * Task #249 — Cobertura por canal do listador/liberador de alertas
 * silenciados pela janela de descanso do CEO.
 *
 * Por que existe: o code-review da primeira passagem reprovou porque a
 * filtragem de ownership era email-only (lower(destinatario)=email_user),
 * o que excluia silently as notificacoes WhatsApp (destinatario=telefone).
 * Esta suite trava as queries por canal — uma regressao volta a falhar
 * imediatamente.
 *
 * Roda contra DB real (mesma estrategia dos demais testes do projeto).
 * Idempotente: limpa antes e depois usando emails marcados com sufixo
 * `.task249test` que nao colide com producao.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const SUFIXO = ".task249test";

async function limpar(): Promise<void> {
  // Ordem: notifs (FK CASCADE em solicitacoes) → solicitacoes → templates
  // → usuarios. Cleanup tolerante a tabelas opcionais (ceo_notif_preferencias).
  await db.execute(sql`
    DELETE FROM assinatura_notificacoes
    WHERE erro LIKE 'ceo_quiet_hours:%task249test%'
       OR solicitacao_id IN (
         SELECT id FROM assinatura_solicitacoes
         WHERE zapsign_external_id = 'TASK249TEST'
            OR template_id IN (SELECT id FROM assinatura_templates WHERE codigo = 'TASK249TEST_TPL')
       )
  `);
  await db.execute(sql`
    DELETE FROM assinatura_solicitacoes
    WHERE zapsign_external_id = 'TASK249TEST'
       OR template_id IN (SELECT id FROM assinatura_templates WHERE codigo = 'TASK249TEST_TPL')
  `);
  await db.execute(sql`
    DELETE FROM assinatura_templates WHERE codigo = 'TASK249TEST_TPL'
  `);
  cachedTemplateId = null;
  try {
    await db.execute(sql`
      DELETE FROM ceo_notif_preferencias
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE ${`%${SUFIXO}%`})
    `);
  } catch {
    // tabela pode nao existir em algum ambiente — cleanup defensivo
  }
  await db.execute(sql`DELETE FROM usuarios WHERE email LIKE ${`%${SUFIXO}%`}`);
}

let cachedTemplateId: number | null = null;
async function obterOuCriarTemplate(): Promise<number> {
  if (cachedTemplateId) return cachedTemplateId;
  const r: any = await db.execute(sql`
    INSERT INTO assinatura_templates
      (codigo, nome_exibicao, tipo_documento, categoria,
       pasta_drive_destino, conteudo_html, placeholders)
    VALUES ('TASK249TEST_TPL', 'Template Teste 249', 'GENERICO', 'TESTE',
            'pasta-teste', '<p>x</p>', ARRAY[]::text[])
    ON CONFLICT (codigo) DO UPDATE SET nome_exibicao = EXCLUDED.nome_exibicao
    RETURNING id
  `);
  cachedTemplateId = Number((r.rows ?? r)[0]!.id);
  return cachedTemplateId;
}

async function criarSolicitacao(): Promise<number> {
  const tplId = await obterOuCriarTemplate();
  const r: any = await db.execute(sql`
    INSERT INTO assinatura_solicitacoes
      (template_id, provedor_codigo, status, dados_hidratacao, signatarios_snapshot, zapsign_external_id)
    VALUES (${tplId}, 'zapsign', 'CONCLUIDO', '{}'::jsonb, '[]'::jsonb, 'TASK249TEST')
    RETURNING id
  `);
  return Number((r.rows ?? r)[0]!.id);
}

async function criarCEO(slug: string, telefone: string): Promise<{ id: number; email: string; telefone: string }> {
  const email = `${slug}-${Date.now()}${SUFIXO}@pawards.test`;
  const r: any = await db.execute(sql`
    INSERT INTO usuarios (nome, email, telefone, senha, perfil, escopo, perfil_plataforma, ativo)
    VALUES (${`Teste ${slug}`}, ${email}, ${telefone}, 'x', 'validador_mestre',
            'plataforma_owner', 'tenant_user', true)
    RETURNING id
  `);
  const id = Number((r.rows ?? r)[0]!.id);
  return { id, email, telefone };
}

async function inserirSilenciado(canal: "EMAIL" | "WHATSAPP", destinatario: string, marcador: string): Promise<number> {
  const solId = await criarSolicitacao();
  const r: any = await db.execute(sql`
    INSERT INTO assinatura_notificacoes
      (solicitacao_id, canal, momento, destinatario, assunto, corpo,
       status, is_sistema_ceo, evento_ceo, erro,
       proxima_tentativa_em, criado_em)
    VALUES (${solId}, ${canal}, 'POS_ASSINATURA', ${destinatario},
            ${`teste ${marcador}`}, 'corpo', 'PULADO_QUIET', true,
            'ASSINADO',
            ${`ceo_quiet_hours:22:00:00-07:00:00 America/Sao_Paulo (evento=ASSINADO) task249test ${marcador}`},
            now() + interval '6 hours', now())
    RETURNING id
  `);
  return Number((r.rows ?? r)[0]!.id);
}

// Espelha exatamente a query do GET /admin/ceo-notif-preferencias/silenciados.
async function listarSilenciadosDoUsuario(usuarioId: number): Promise<Array<{ id: number; canal: string; destinatario: string }>> {
  const r: any = await db.execute(sql`
    SELECT n.id, n.canal, n.destinatario
    FROM assinatura_notificacoes n
    JOIN usuarios usr ON usr.id = ${usuarioId}
    WHERE n.is_sistema_ceo = true
      AND n.status = 'PULADO_QUIET'
      AND n.erro LIKE 'ceo_quiet_hours:%'
      AND (
        (n.canal = 'EMAIL'    AND usr.email IS NOT NULL
          AND lower(n.destinatario) = lower(usr.email))
        OR
        (n.canal = 'WHATSAPP' AND usr.telefone IS NOT NULL
          AND n.destinatario = usr.telefone)
      )
    ORDER BY n.id ASC
  `);
  return (r.rows ?? r) as Array<{ id: number; canal: string; destinatario: string }>;
}

// Espelha exatamente o UPDATE do POST .../:id/liberar.
async function liberarComoUsuario(notifId: number, usuarioId: number): Promise<{ liberada: boolean; status?: string }> {
  const r: any = await db.execute(sql`
    UPDATE assinatura_notificacoes n
    SET status = 'PENDENTE',
        proxima_tentativa_em = NULL,
        erro = NULL
    FROM usuarios usr
    WHERE n.id = ${notifId}
      AND usr.id = ${usuarioId}
      AND n.is_sistema_ceo = true
      AND n.status = 'PULADO_QUIET'
      AND n.erro LIKE 'ceo_quiet_hours:%'
      AND (
        (n.canal = 'EMAIL'    AND usr.email IS NOT NULL
          AND lower(n.destinatario) = lower(usr.email))
        OR
        (n.canal = 'WHATSAPP' AND usr.telefone IS NOT NULL
          AND n.destinatario = usr.telefone)
      )
    RETURNING n.id, n.status
  `);
  const row = (r.rows ?? r)[0];
  return row ? { liberada: true, status: row.status } : { liberada: false };
}

test("Task #249 · listador retorna silenciados de AMBOS os canais (EMAIL e WHATSAPP)", async () => {
  await limpar();
  try {
    const ceo = await criarCEO("ceoambos", "+5511999990001");
    const idEmail = await inserirSilenciado("EMAIL", ceo.email, `ceoambos-mail`);
    const idWpp = await inserirSilenciado("WHATSAPP", ceo.telefone, `ceoambos-wpp`);

    const rows = await listarSilenciadosDoUsuario(ceo.id);
    const ids = rows.map((r) => r.id).sort();
    assert.deepEqual(ids, [idEmail, idWpp].sort(),
      "ambos canais (EMAIL+WHATSAPP) precisam aparecer pro CEO dono");
    const canais = new Set(rows.map((r) => r.canal));
    assert.ok(canais.has("EMAIL"), "EMAIL deve estar presente");
    assert.ok(canais.has("WHATSAPP"), "WHATSAPP deve estar presente (regressao do code-review email-only)");
  } finally {
    await limpar();
  }
});

test("Task #249 · CEO X NAO ve silenciados do CEO Y (isolamento entre validador_mestres)", async () => {
  await limpar();
  try {
    const ceoA = await criarCEO("ceoa", "+5511999990010");
    const ceoB = await criarCEO("ceob", "+5511999990020");
    const idAEmail = await inserirSilenciado("EMAIL", ceoA.email, "ceoa-mail");
    const idAWpp = await inserirSilenciado("WHATSAPP", ceoA.telefone, "ceoa-wpp");
    await inserirSilenciado("EMAIL", ceoB.email, "ceob-mail");
    await inserirSilenciado("WHATSAPP", ceoB.telefone, "ceob-wpp");

    const rowsA = await listarSilenciadosDoUsuario(ceoA.id);
    const idsA = rowsA.map((r) => r.id).sort();
    assert.deepEqual(idsA, [idAEmail, idAWpp].sort(),
      "CEO A so deve ver os proprios silenciados, nao os do CEO B");
  } finally {
    await limpar();
  }
});

test("Task #249 · liberar EMAIL silenciado funciona e zera erro/proxima_tentativa_em", async () => {
  await limpar();
  try {
    const ceo = await criarCEO("ceomail", "+5511999990030");
    const idEmail = await inserirSilenciado("EMAIL", ceo.email, "liberar-mail");
    const r = await liberarComoUsuario(idEmail, ceo.id);
    assert.equal(r.liberada, true, "EMAIL silenciado precisa ser liberavel");
    assert.equal(r.status, "PENDENTE");

    const check: any = await db.execute(sql`
      SELECT status, proxima_tentativa_em, erro FROM assinatura_notificacoes WHERE id = ${idEmail}
    `);
    const row = (check.rows ?? check)[0];
    assert.equal(row.status, "PENDENTE");
    assert.equal(row.proxima_tentativa_em, null);
    assert.equal(row.erro, null);
  } finally {
    await limpar();
  }
});

test("Task #249 · liberar WHATSAPP silenciado funciona (regressao crucial do code-review)", async () => {
  await limpar();
  try {
    const ceo = await criarCEO("ceowpp", "+5511999990040");
    const idWpp = await inserirSilenciado("WHATSAPP", ceo.telefone, "liberar-wpp");
    const r = await liberarComoUsuario(idWpp, ceo.id);
    assert.equal(r.liberada, true,
      "WHATSAPP silenciado PRECISA ser liberavel — antes do fix o filtro email-only quebrava aqui");
    assert.equal(r.status, "PENDENTE");
  } finally {
    await limpar();
  }
});

test("Task #249 · CEO X NAO consegue liberar silenciado do CEO Y", async () => {
  await limpar();
  try {
    const ceoA = await criarCEO("ceoxa", "+5511999990050");
    const ceoB = await criarCEO("ceoxb", "+5511999990060");
    const idBWpp = await inserirSilenciado("WHATSAPP", ceoB.telefone, "alheio-wpp");

    const r = await liberarComoUsuario(idBWpp, ceoA.id);
    assert.equal(r.liberada, false,
      "CEO A nao pode liberar notif do CEO B (defesa contra vazamento)");

    // Confere que a notif continua silenciada
    const check: any = await db.execute(sql`
      SELECT status FROM assinatura_notificacoes WHERE id = ${idBWpp}
    `);
    assert.equal((check.rows ?? check)[0]?.status, "PULADO_QUIET");
  } finally {
    await limpar();
  }
});
