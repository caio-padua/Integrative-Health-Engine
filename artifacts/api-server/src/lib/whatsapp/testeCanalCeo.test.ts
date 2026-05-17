import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

import {
  dispararTesteCanalCeo,
  montarMensagemTesteCeo,
  obterUltimoTesteCanalCeo,
  resolverCeoEAtivo,
  timestampBrtAgora,
  traduzirErroProvedor,
  type TesteCanalCeoDeps,
} from "./testeCanalCeo";

const TELEFONE_TESTE = "+5511988887777";

function mkDeps(opts: {
  configRetorno?: unknown | null;
  envioRetorno?: { sucesso: boolean; provedorMsgId?: string; erro?: string; logId?: number };
} = {}): TesteCanalCeoDeps {
  return {
    obterConfigWhatsapp: async () =>
      opts.configRetorno === undefined
        ? { id: 1, provedor: "TWILIO", ativo: true }
        : opts.configRetorno,
    enviarWhatsapp: async () =>
      opts.envioRetorno ?? { sucesso: true, provedorMsgId: "SMtest", logId: 1 },
  };
}

describe("testeCanalCeo - puro", () => {
  it("montarMensagemTesteCeo inclui timestamp BRT fixo e label PAWARDS", () => {
    const m = montarMensagemTesteCeo("17/05/2026 14:32:05 BRT");
    assert.match(m, /PAWARDS — Teste de canal CEO/);
    assert.match(m, /Disparada em: 17\/05\/2026 14:32:05 BRT/);
    assert.match(m, /\/plataforma\/perfil/);
  });

  it("timestampBrtAgora gera string com sufixo BRT e data brasileira", () => {
    const s = timestampBrtAgora(new Date("2026-05-17T17:32:05Z"));
    // BRT = UTC-3 → 14:32:05
    assert.match(s, /14:32:05 BRT$/);
    assert.match(s, /^17\/05\/2026/);
  });

  it("traduzirErroProvedor mapeia erros conhecidos do Twilio", () => {
    assert.match(traduzirErroProvedor("Error 21610: opted out"), /opt-out/);
    assert.match(traduzirErroProvedor("Code 20003 authenticate failed"), /credenciais Twilio/i);
    assert.match(traduzirErroProvedor("21614 not a valid number"), /formato invalido/i);
    assert.match(traduzirErroProvedor("63016 freeform outside window"), /janela de 24h/i);
    assert.match(traduzirErroProvedor("totalmente desconhecido xyz"), /Provedor recusou/);
  });
});

describe("testeCanalCeo - integracao DB", () => {
  let ceoIdOriginal: number | null = null;
  let telefoneOriginal: string | null = null;

  before(async () => {
    const r: any = await db.execute(sql`
      SELECT id, telefone FROM usuarios
       WHERE perfil_plataforma='platform_owner' AND ativo=true
       ORDER BY id ASC LIMIT 1
    `);
    if (r.rows && r.rows[0]) {
      ceoIdOriginal = Number(r.rows[0].id);
      telefoneOriginal = r.rows[0].telefone ?? null;
    }
  });

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM assinatura_notificacoes WHERE momento='TESTE_CANAL_CEO'`);
  });

  after(async () => {
    if (ceoIdOriginal) {
      await db.execute(sql`UPDATE usuarios SET telefone = ${telefoneOriginal} WHERE id = ${ceoIdOriginal}`);
    }
    await db.execute(sql`DELETE FROM assinatura_notificacoes WHERE momento='TESTE_CANAL_CEO'`);
  });

  it("pre-check SEM_TELEFONE_CEO quando platform_owner sem telefone", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = NULL WHERE id = ${ceoIdOriginal}`);

    const r = await dispararTesteCanalCeo(mkDeps());
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "SEM_TELEFONE_CEO");
    assert.match(r.erro!, /nao cadastrado/i);
  });

  it("pre-check SEM_CONFIG_WHATSAPP_ATIVA quando nao tem config", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);

    const r = await dispararTesteCanalCeo(mkDeps({ configRetorno: null }));
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "SEM_CONFIG_WHATSAPP_ATIVA");
  });

  it("sucesso: persiste ENVIADO com SID Twilio e is_sistema_ceo=true", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);

    const r = await dispararTesteCanalCeo(mkDeps({
      envioRetorno: { sucesso: true, provedorMsgId: "SMxxxxxxxxxxxx1234", logId: 999 },
    }));
    assert.equal(r.status, "ENVIADO");
    assert.equal(r.provedorMsgId, "SMxxxxxxxxxxxx1234");
    assert.equal(r.destinatario, TELEFONE_TESTE);
    assert.ok(r.notifId);

    const row: any = await db.execute(sql`
      SELECT status, is_sistema_ceo, resposta_provedor, destinatario
        FROM assinatura_notificacoes WHERE id = ${r.notifId}
    `);
    assert.equal(row.rows[0].status, "ENVIADO");
    assert.equal(row.rows[0].is_sistema_ceo, true);
    assert.equal(row.rows[0].destinatario, TELEFONE_TESTE);
    assert.equal(row.rows[0].resposta_provedor.sid, "SMxxxxxxxxxxxx1234");
  });

  it("falha: persiste FALHA com erro traduzido e erroCru preservado", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);

    const r = await dispararTesteCanalCeo(mkDeps({
      envioRetorno: { sucesso: false, erro: "Error 21610: The recipient has opted out" },
    }));
    assert.equal(r.status, "FALHA");
    assert.match(r.erro!, /opt-out/);

    const row: any = await db.execute(sql`
      SELECT status, erro, resposta_provedor
        FROM assinatura_notificacoes WHERE id = ${r.notifId}
    `);
    assert.equal(row.rows[0].status, "FALHA");
    assert.match(row.rows[0].erro, /opt-out/);
    assert.match(row.rows[0].resposta_provedor.erroCru, /21610/);
  });

  it("anti double-click: bloqueia segundo disparo se ja tem PENDENTE", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);
    await db.execute(sql`
      INSERT INTO assinatura_notificacoes
        (canal, momento, destinatario, status, is_sistema_ceo)
      VALUES ('WHATSAPP', 'TESTE_CANAL_CEO', ${TELEFONE_TESTE}, 'PENDENTE', true)
    `);

    const r = await dispararTesteCanalCeo(mkDeps());
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "JA_EM_ANDAMENTO");
  });

  it("obterUltimoTesteCanalCeo retorna o disparo mais recente", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);
    const r = await dispararTesteCanalCeo(mkDeps({
      envioRetorno: { sucesso: true, provedorMsgId: "SMmaisrecente" },
    }));
    assert.equal(r.status, "ENVIADO");

    const ultimo = await obterUltimoTesteCanalCeo();
    assert.ok(ultimo);
    assert.equal(ultimo!.status, "ENVIADO");
    assert.equal(ultimo!.provedorMsgId, "SMmaisrecente");
  });

  it("resolverCeoEAtivo retorna primeiro platform_owner ativo", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);
    const ceo = await resolverCeoEAtivo();
    assert.ok(ceo);
    assert.equal(ceo!.telefone, TELEFONE_TESTE);
  });
});
