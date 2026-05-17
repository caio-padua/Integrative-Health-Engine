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
  validarConfigTwilio,
  type ConfigWhatsAppMin,
  type TesteCanalCeoDeps,
} from "./testeCanalCeo";

const TELEFONE_TESTE = "+5511988887777";
const CONFIG_ID_FIXTURE = 999_001;
const decryptOk = (s: string) => `decrypted:${s}`;
const decryptThrows = () => {
  throw new Error("chave invalida");
};

function configFixture(over: Partial<ConfigWhatsAppMin> = {}): ConfigWhatsAppMin {
  return {
    id: CONFIG_ID_FIXTURE,
    provedor: "TWILIO",
    ativo: true,
    numeroRemetente: "+14155551234",
    accountSid: "enc:ACxxx",
    authToken: "enc:tok",
    ...over,
  };
}

function mkDeps(over: {
  config?: ConfigWhatsAppMin | null;
  ativaGlobalId?: number | null;
  decrypt?: (s: string) => string;
} = {}): TesteCanalCeoDeps {
  return {
    obterConfig: async () => (over.config === undefined ? configFixture() : over.config),
    obterConfigAtivaGlobal: async () => {
      const id = over.ativaGlobalId === undefined ? CONFIG_ID_FIXTURE : over.ativaGlobalId;
      return id === null ? null : { id };
    },
    decryptCredential: over.decrypt ?? decryptOk,
  };
}

describe("testeCanalCeo - puro", () => {
  it("montarMensagemTesteCeo inclui timestamp BRT fixo e label PAWARDS", () => {
    const m = montarMensagemTesteCeo("17/05/2026 14:32:05 BRT");
    assert.match(m, /PAWARDS — Teste de canal CEO/);
    assert.match(m, /Disparada em: 17\/05\/2026 14:32:05 BRT/);
    assert.match(m, /Configuracoes >\s*\n?WhatsApp/);
  });

  it("timestampBrtAgora gera string com sufixo BRT e data brasileira", () => {
    const s = timestampBrtAgora(new Date("2026-05-17T17:32:05Z"));
    assert.match(s, /14:32:05 BRT$/);
    assert.match(s, /^17\/05\/2026/);
  });

  it("validarConfigTwilio: rejeita config nula", () => {
    const r = validarConfigTwilio(null, decryptOk);
    assert.equal(r?.motivoPre, "CONFIG_NAO_ENCONTRADA");
  });

  it("validarConfigTwilio: rejeita config inativa", () => {
    const r = validarConfigTwilio(configFixture({ ativo: false }), decryptOk);
    assert.equal(r?.motivoPre, "SEM_CONFIG_WHATSAPP_ATIVA");
  });

  it("validarConfigTwilio: rejeita provedor diferente de TWILIO", () => {
    const r = validarConfigTwilio(configFixture({ provedor: "GUPSHUP" }), decryptOk);
    assert.equal(r?.motivoPre, "PROVEDOR_NAO_TWILIO");
  });

  it("validarConfigTwilio: rejeita numeroRemetente vazio", () => {
    const r = validarConfigTwilio(configFixture({ numeroRemetente: "" }), decryptOk);
    assert.equal(r?.motivoPre, "SEM_NUMERO_REMETENTE");
  });

  it("validarConfigTwilio: rejeita credenciais ausentes", () => {
    const r = validarConfigTwilio(configFixture({ accountSid: null }), decryptOk);
    assert.equal(r?.motivoPre, "CREDENCIAIS_INVALIDAS");
  });

  it("validarConfigTwilio: rejeita quando decriptacao lanca", () => {
    const r = validarConfigTwilio(configFixture(), decryptThrows);
    assert.equal(r?.motivoPre, "CREDENCIAIS_INVALIDAS");
    assert.match(r!.erro, /nao puderam ser decriptadas/);
  });

  it("validarConfigTwilio: aceita config TWILIO completa", () => {
    const r = validarConfigTwilio(configFixture(), decryptOk);
    assert.equal(r, null);
  });
});

describe("testeCanalCeo - integracao DB", () => {
  let ceoIdOriginal: number | null = null;
  let telefoneOriginal: string | null = null;

  before(async () => {
    const r: any = await db.execute(sql`
      SELECT id, telefone FROM usuarios
       WHERE perfil='validador_mestre' AND perfil_plataforma='platform_owner' AND ativo=true
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

  it("pre-check SEM_TELEFONE_CEO quando CEO sem telefone", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = NULL WHERE id = ${ceoIdOriginal}`);

    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps());
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "SEM_TELEFONE_CEO");
    assert.match(r.erro!, /nao cadastrado/i);
  });

  it("pre-check CONFIG_NAO_ENCONTRADA quando configId invalido", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);

    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps({ config: null }));
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "CONFIG_NAO_ENCONTRADA");
  });

  it("pre-check PROVEDOR_NAO_TWILIO bloqueia Gupshup", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);

    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps({ config: configFixture({ provedor: "GUPSHUP" }) }));
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "PROVEDOR_NAO_TWILIO");
  });

  it("pre-check CONFIG_NAO_E_A_ATIVA_GLOBAL quando configId difere da que o worker escolheria", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);
    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps({ ativaGlobalId: 99_999 }));
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "CONFIG_NAO_E_A_ATIVA_GLOBAL");
    assert.match(r.erro!, /worker usa/);
  });

  it("pre-check SEM_CONFIG_WHATSAPP_ATIVA quando nao ha config ativa global", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);
    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps({ ativaGlobalId: null }));
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "SEM_CONFIG_WHATSAPP_ATIVA");
  });

  it("pre-check CREDENCIAIS_INVALIDAS quando decriptacao falha", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);

    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps({ decrypt: decryptThrows }));
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "CREDENCIAIS_INVALIDAS");
  });

  it("sucesso: enfileira PENDENTE com is_sistema_ceo=true sem disparar provedor", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);

    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps());
    assert.equal(r.status, "PENDENTE");
    assert.equal(r.destinatario, TELEFONE_TESTE);
    assert.ok(r.notifId);

    const row: any = await db.execute(sql`
      SELECT status, is_sistema_ceo, canal, momento, destinatario, corpo
        FROM assinatura_notificacoes WHERE id = ${r.notifId}
    `);
    assert.equal(row.rows[0].status, "PENDENTE");
    assert.equal(row.rows[0].is_sistema_ceo, true);
    assert.equal(row.rows[0].canal, "WHATSAPP");
    assert.equal(row.rows[0].momento, "TESTE_CANAL_CEO");
    assert.equal(row.rows[0].destinatario, TELEFONE_TESTE);
    assert.match(row.rows[0].corpo, /PAWARDS — Teste de canal CEO/);
  });

  it("anti double-click: bloqueia segundo disparo se ja tem PENDENTE recente", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);
    await db.execute(sql`
      INSERT INTO assinatura_notificacoes
        (canal, momento, destinatario, status, is_sistema_ceo)
      VALUES ('WHATSAPP', 'TESTE_CANAL_CEO', ${TELEFONE_TESTE}, 'PENDENTE', true)
    `);

    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps());
    assert.equal(r.status, "FALHA");
    assert.equal(r.motivoPre, "JA_EM_ANDAMENTO");
  });

  it("anti double-click: NAO bloqueia se PENDENTE for > 5min (anti-lockout)", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);
    await db.execute(sql`
      INSERT INTO assinatura_notificacoes
        (canal, momento, destinatario, status, is_sistema_ceo, criado_em)
      VALUES ('WHATSAPP', 'TESTE_CANAL_CEO', ${TELEFONE_TESTE}, 'PROCESSANDO', true,
              now() - interval '10 minutes')
    `);

    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps());
    assert.equal(r.status, "PENDENTE");
  });

  it("obterUltimoTesteCanalCeo retorna o disparo mais recente", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);
    const r = await dispararTesteCanalCeo(CONFIG_ID_FIXTURE, mkDeps());
    assert.equal(r.status, "PENDENTE");

    const ultimo = await obterUltimoTesteCanalCeo();
    assert.ok(ultimo);
    assert.equal(ultimo!.status, "PENDENTE");
    assert.equal(ultimo!.destinatario, TELEFONE_TESTE);
  });

  it("resolverCeoEAtivo respeita filtro composto (validador_mestre + platform_owner + ativo)", async () => {
    if (!ceoIdOriginal) return;
    await db.execute(sql`UPDATE usuarios SET telefone = ${TELEFONE_TESTE} WHERE id = ${ceoIdOriginal}`);
    const ceo = await resolverCeoEAtivo();
    assert.ok(ceo);
    assert.equal(ceo!.id, ceoIdOriginal);
    assert.equal(ceo!.telefone, TELEFONE_TESTE);
  });
});
