/**
 * Wave 13 — Teste real do canal WhatsApp do CEO via Twilio.
 *
 * Code-review v2 (rejected) endereçada:
 *  - Resolve CEO por (perfil='validador_mestre' AND perfil_plataforma=
 *    'platform_owner' AND ativo=true) — espelha lib/assinatura/service.ts
 *    e notifAssinatura.ts que ja usam validador_mestre como base, restringido
 *    pelo perfil_plataforma pra cair no UNICO CEO operacional.
 *  - Pre-checks completos: telefone do CEO + provedor=TWILIO + credenciais
 *    decriptaveis (accountSid + authToken) + numeroRemetente preenchido.
 *  - Persistencia segue a arquitetura: ENFILEIRA em PENDENTE, deixa o worker
 *    notifAssinatura fazer o dispatch e transicao PENDENTE→PROCESSANDO→
 *    ENVIADO/FALHA. O worker ja prioriza is_sistema_ceo DESC e ja bypassa
 *    opt-out/quiet hours pra essas linhas.
 *  - Idempotencia: rejeita disparar se ja existe TESTE_CANAL_CEO em
 *    PENDENTE/PROCESSANDO criado nos ultimos 5min (janela curta evita
 *    lockout permanente se processo crashar entre claim e UPDATE).
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type StatusTesteCeo =
  | "PENDENTE"
  | "PROCESSANDO"
  | "ENVIADO"
  | "FALHA";

export type MotivoFalhaPre =
  | "SEM_TELEFONE_CEO"
  | "SEM_CONFIG_WHATSAPP_ATIVA"
  | "CONFIG_NAO_ENCONTRADA"
  | "PROVEDOR_NAO_TWILIO"
  | "CREDENCIAIS_INVALIDAS"
  | "SEM_NUMERO_REMETENTE"
  /**
   * Code-review v2: o worker notifAssinatura dispatcha via
   * enviarWhatsapp(dest, corpo, ...) que escolhe a config ativa global via
   * obterConfigWhatsapp() — nao recebe configId da fila. Pra impedir que o
   * admin valide config A e o worker envie via config B, validamos no
   * pre-check que a configId pedida E A MESMA que o worker escolheria.
   */
  | "CONFIG_NAO_E_A_ATIVA_GLOBAL"
  | "JA_EM_ANDAMENTO";

export interface TesteCanalCeoResultado {
  /**
   * Status retornado pela rota. Como o despacho real foi delegado ao worker
   * notifAssinatura, sucesso aqui significa apenas que a notificacao foi
   * enfileirada em PENDENTE — o resultado final (ENVIADO/FALHA) vai aparecer
   * em /whatsapp/teste-ceo/ultimo no proximo tick (≤5min).
   */
  status: "PENDENTE" | "FALHA";
  notifId?: number;
  destinatario?: string;
  /** Motivo legivel quando falha pre-check (antes de enfileirar). */
  motivoPre?: MotivoFalhaPre;
  erro?: string;
  /** Timestamp BRT que entrou na mensagem (pro CEO conferir no celular). */
  timestampBrt?: string;
}

/** Formata "now" em BRT (America/Sao_Paulo) padrao "17/05/2026 14:32:05 BRT". */
export function timestampBrtAgora(agora: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${fmt.format(agora)} BRT`;
}

/** Mensagem institucional FIXA. Nao aceita interpolacao do usuario. */
export function montarMensagemTesteCeo(timestampBrt: string): string {
  return [
    "PAWARDS — Teste de canal CEO",
    "",
    "Esta e uma mensagem de teste do canal WhatsApp configurado pra alertas",
    "operacionais (contratos ZapSign, brute-force 2FA, kill-switch).",
    "",
    `Disparada em: ${timestampBrt}`,
    "",
    "Se voce recebeu, o canal esta saudavel. Se nao, abra Configuracoes >",
    "WhatsApp e cheque o status do ultimo teste.",
  ].join("\n");
}

interface CeoRow {
  id: number;
  telefone: string | null;
}

/**
 * Resolve o CEO unico: perfil='validador_mestre' AND perfil_plataforma=
 * 'platform_owner' AND ativo=true. Outros workers (notifAssinatura.ts,
 * lib/assinatura/service.ts) usam apenas perfil='validador_mestre' porque
 * iteram em todos os validadores ativos pra notificar. Pra teste do canal
 * CEO o destinatario tem que ser o UNICO operacional — adicionamos o filtro
 * perfil_plataforma pra evitar mandar pro celular de validadores secundarios.
 */
export async function resolverCeoEAtivo(): Promise<CeoRow | null> {
  const r: any = await db.execute(sql`
    SELECT id, telefone
      FROM usuarios
     WHERE perfil = 'validador_mestre'
       AND perfil_plataforma = 'platform_owner'
       AND ativo = true
     ORDER BY id ASC
     LIMIT 1
  `);
  const row = r.rows?.[0];
  if (!row) return null;
  return { id: Number(row.id), telefone: row.telefone ?? null };
}

/**
 * Valida que a config indicada pode realmente disparar via Twilio. Retorna
 * motivoPre se algum requisito faltar; senao retorna null (config OK).
 *
 * decryptCredentialFn injetavel pra testes nao dependerem da chave real.
 */
export interface ConfigWhatsAppMin {
  id: number;
  provedor: string | null;
  ativo: boolean | null;
  numeroRemetente: string | null;
  accountSid: string | null;
  authToken: string | null;
}

export function validarConfigTwilio(
  config: ConfigWhatsAppMin | null | undefined,
  decryptCredentialFn: (s: string) => string,
): { motivoPre: MotivoFalhaPre; erro: string } | null {
  if (!config) {
    return {
      motivoPre: "CONFIG_NAO_ENCONTRADA",
      erro: "Configuracao WhatsApp nao encontrada. Cadastre/selecione antes de testar.",
    };
  }
  if (config.ativo !== true) {
    return {
      motivoPre: "SEM_CONFIG_WHATSAPP_ATIVA",
      erro: "Esta configuracao WhatsApp esta inativa. Ative em Configuracoes > WhatsApp.",
    };
  }
  if ((config.provedor ?? "").toUpperCase() !== "TWILIO") {
    return {
      motivoPre: "PROVEDOR_NAO_TWILIO",
      erro: "Teste do canal CEO so suporta provedor TWILIO. Esta config usa outro provedor.",
    };
  }
  if (!config.numeroRemetente || config.numeroRemetente.trim() === "") {
    return {
      motivoPre: "SEM_NUMERO_REMETENTE",
      erro: "numeroRemetente da config Twilio esta vazio. Reconfigure antes de testar.",
    };
  }
  if (!config.accountSid || !config.authToken) {
    return {
      motivoPre: "CREDENCIAIS_INVALIDAS",
      erro: "Credenciais Twilio (accountSid/authToken) ausentes nesta config.",
    };
  }
  try {
    const sid = decryptCredentialFn(config.accountSid);
    const tok = decryptCredentialFn(config.authToken);
    if (!sid || !tok) throw new Error("decriptacao retornou vazio");
  } catch (e: any) {
    return {
      motivoPre: "CREDENCIAIS_INVALIDAS",
      erro: `Credenciais Twilio desta config nao puderam ser decriptadas: ${String(e?.message ?? e).slice(0, 120)}.`,
    };
  }
  return null;
}

/** Dependencias injetaveis pra testabilidade (ES modules nao reatribuem exports). */
export interface TesteCanalCeoDeps {
  obterConfig: (configId: number) => Promise<ConfigWhatsAppMin | null>;
  /**
   * Retorna a config que o worker notifAssinatura REALMENTE vai usar quando
   * processar a row (via enviarWhatsapp -> obterConfigWhatsapp). Como a fila
   * nao carrega unidadeId, usamos a config ativa global (unidade_id IS NULL).
   * Pre-check rejeita disparo se configId != id desta.
   */
  obterConfigAtivaGlobal: () => Promise<{ id: number } | null>;
  decryptCredential: (s: string) => string;
}

async function obterConfigPadrao(configId: number): Promise<ConfigWhatsAppMin | null> {
  const r: any = await db.execute(sql`
    SELECT id, provedor, ativo, numero_remetente AS "numeroRemetente",
           account_sid AS "accountSid", auth_token AS "authToken"
      FROM whatsapp_config
     WHERE id = ${configId}
     LIMIT 1
  `);
  return r.rows?.[0] ?? null;
}

async function obterConfigAtivaGlobalPadrao(): Promise<{ id: number } | null> {
  // IMPORTANTE: reusa o MESMO seletor do worker (obterConfigWhatsapp) pra
  // garantir que pre-check e dispatch escolhem a MESMA row. Sem isso, se
  // existir mais de uma config ativa global (sem ORDER BY no worker),
  // pre-check valida config A e worker envia via config B (code-review v2).
  // Sem unidadeId -> branch de "config ativa global" do whatsappService.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { obterConfigWhatsapp } = require("../../services/whatsappService");
  const c = await obterConfigWhatsapp();
  return c ? { id: c.id } : null;
}

const depsDefault: TesteCanalCeoDeps = {
  obterConfig: (id) => obterConfigPadrao(id),
  obterConfigAtivaGlobal: () => obterConfigAtivaGlobalPadrao(),
  decryptCredential: (s) => {
    // import dinamico pra evitar quebrar bundler quando lib nao existir
    // em ambientes de teste isolados.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../services/credentialEncryption");
    return mod.decryptCredential(s);
  },
};

/**
 * Enfileira o teste pro worker dispatchar. NAO chama Twilio direto — isso
 * preserva FSM auditavel (PENDENTE→PROCESSANDO via claim do worker) e
 * permite que retry/quiet hours/templates HSM funcionem igual aos demais
 * alertas operacionais do CEO.
 */
export async function dispararTesteCanalCeo(
  configId: number,
  deps: TesteCanalCeoDeps = depsDefault,
): Promise<TesteCanalCeoResultado> {
  // Pre-check 1: CEO ativo com telefone cadastrado.
  const ceo = await resolverCeoEAtivo();
  if (!ceo) {
    return {
      status: "FALHA",
      motivoPre: "SEM_TELEFONE_CEO",
      erro: "Nenhum CEO encontrado (perfil='validador_mestre' + perfil_plataforma='platform_owner' + ativo=true).",
    };
  }
  if (!ceo.telefone || ceo.telefone.trim() === "") {
    return {
      status: "FALHA",
      motivoPre: "SEM_TELEFONE_CEO",
      erro: "Telefone do CEO nao cadastrado. Cadastre em /plataforma/perfil antes de testar.",
    };
  }

  // Pre-check 2: config TWILIO ativa + credenciais decriptaveis + numero remetente.
  const config = await deps.obterConfig(configId);
  const erroConfig = validarConfigTwilio(config, deps.decryptCredential);
  if (erroConfig) {
    return {
      status: "FALHA",
      motivoPre: erroConfig.motivoPre,
      erro: erroConfig.erro,
    };
  }

  // Pre-check 2.5: garante que configId pedida coincide com a que o worker
  // notifAssinatura vai escolher (config ativa global). Sem este check, admin
  // pode validar config TWILIO A e o worker enviar via config B (ex.: Gupshup
  // tambem ativa), quebrando "teste real via Twilio".
  const ativaGlobal = await deps.obterConfigAtivaGlobal();
  if (!ativaGlobal) {
    return {
      status: "FALHA",
      motivoPre: "SEM_CONFIG_WHATSAPP_ATIVA",
      erro: "Nenhuma config WhatsApp ativa global (unidade_id IS NULL). Worker nao tem por onde enviar.",
    };
  }
  if (ativaGlobal.id !== configId) {
    return {
      status: "FALHA",
      motivoPre: "CONFIG_NAO_E_A_ATIVA_GLOBAL",
      erro: `Esta config (#${configId}) nao e a ativa global que o worker usa (#${ativaGlobal.id}). Mude o ativo dela em Configuracoes > WhatsApp antes de testar.`,
    };
  }

  // Pre-check 3: anti double-click (janela 5min evita lockout permanente).
  const emAndamento: any = await db.execute(sql`
    SELECT id FROM assinatura_notificacoes
     WHERE momento = 'TESTE_CANAL_CEO'
       AND status IN ('PENDENTE', 'PROCESSANDO')
       AND criado_em > now() - interval '5 minutes'
     LIMIT 1
  `);
  if (emAndamento.rows && emAndamento.rows.length > 0) {
    return {
      status: "FALHA",
      motivoPre: "JA_EM_ANDAMENTO",
      erro: "Ja existe um teste em andamento. Aguarde alguns segundos e atualize.",
    };
  }

  // Enfileira PENDENTE. Worker notifAssinatura faz o claim no proximo tick
  // (≤5min), transiciona pra PROCESSANDO, dispara via enviarWhatsapp e
  // grava ENVIADO/FALHA com retry exponencial em caso de erro transiente.
  const timestampBrt = timestampBrtAgora();
  const corpo = montarMensagemTesteCeo(timestampBrt);
  const ins: any = await db.execute(sql`
    INSERT INTO assinatura_notificacoes
      (canal, momento, destinatario, corpo, status, is_sistema_ceo)
    VALUES
      ('WHATSAPP', 'TESTE_CANAL_CEO', ${ceo.telefone}, ${corpo},
       'PENDENTE', true)
    RETURNING id
  `);
  const notifId = Number(ins.rows[0].id);

  return {
    status: "PENDENTE",
    notifId,
    destinatario: ceo.telefone,
    timestampBrt,
  };
}

export interface UltimoTesteCeo {
  id: number;
  status: StatusTesteCeo | "PULADO_QUIET" | "PULADO_OPTOUT" | "AGRUPADO_DIGEST" | "ENVIADO_AGRUPADO";
  destinatario: string;
  criadoEm: string;
  enviadoEm: string | null;
  provedorMsgId: string | null;
  erro: string | null;
}

/** Le o ultimo teste pra hidratar o card na UI. */
export async function obterUltimoTesteCanalCeo(): Promise<UltimoTesteCeo | null> {
  const r: any = await db.execute(sql`
    SELECT id, status, destinatario, criado_em, enviado_em, resposta_provedor, erro
      FROM assinatura_notificacoes
     WHERE momento = 'TESTE_CANAL_CEO'
     ORDER BY criado_em DESC
     LIMIT 1
  `);
  const row = r.rows?.[0];
  if (!row) return null;
  const resp = (row.resposta_provedor ?? {}) as { msgId?: string; sid?: string };
  return {
    id: Number(row.id),
    status: row.status,
    destinatario: row.destinatario,
    criadoEm: new Date(row.criado_em).toISOString(),
    enviadoEm: row.enviado_em ? new Date(row.enviado_em).toISOString() : null,
    provedorMsgId: resp.msgId ?? resp.sid ?? null,
    erro: row.erro ?? null,
  };
}
