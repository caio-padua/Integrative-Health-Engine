/**
 * Wave 13 — disparo de teste real do canal WhatsApp do CEO.
 *
 * Por que existe:
 *   O CEO cadastra o telefone (Task #46), confirma por PIN (Task #244) e
 *   espera 8h ate o proximo aviso 2FA pra saber se Twilio/Gupshup esta
 *   entregando. Antes deste botao, "WhatsApp do CEO instavel" so era
 *   detectado depois de algum aviso oficial falhar — tarde demais.
 *
 * Acceptance criteria do code review:
 *   1. Pre-checks: telefone do CEO cadastrado + config WhatsApp ativa.
 *   2. Telefone resolvido pelo BACKEND a partir de usuarios.telefone do
 *      platform_owner ativo — UI nunca pode injetar telefone (impede CEO
 *      de mandar teste pro celular pessoal sem cadastrar oficialmente).
 *   3. Mensagem institucional fixa com timestamp BRT (America/Sao_Paulo)
 *      pra evidenciar momento exato no celular.
 *   4. Linha em assinatura_notificacoes com momento='TESTE_CANAL_CEO',
 *      is_sistema_ceo=true, status PENDENTE->PROCESSANDO->ENVIADO/FALHA.
 *   5. Em ENVIADO: resposta_provedor.sid armazena SID Twilio pra rastreio.
 *      Em FALHA: erro guarda mensagem traduzida do provedor.
 *   6. Idempotencia leve: rejeita disparar se ja existe TESTE_CANAL_CEO
 *      em PENDENTE/PROCESSANDO (evita double-click flood).
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  obterConfigWhatsapp as obterConfigWhatsappReal,
  enviarWhatsapp as enviarWhatsappReal,
  type EnvioResult,
} from "../../services/whatsappService";

/**
 * Deps injetaveis pra testabilidade. Os modulos ES nao permitem reatribuir
 * exports em tempo de teste, entao expomos o ponto de injecao aqui em vez
 * de tentar monkey-patch. Producao usa o default real.
 */
export interface TesteCanalCeoDeps {
  obterConfigWhatsapp: () => Promise<unknown | null>;
  enviarWhatsapp: (
    telefone: string,
    mensagem: string,
    opts?: { templateNome?: string },
  ) => Promise<EnvioResult & { logId?: number }>;
}

const depsDefault: TesteCanalCeoDeps = {
  obterConfigWhatsapp: () => obterConfigWhatsappReal(),
  enviarWhatsapp: (t, m, o) => enviarWhatsappReal(t, m, o),
};

export type StatusTesteCeo =
  | "PENDENTE"
  | "PROCESSANDO"
  | "ENVIADO"
  | "FALHA";

export type MotivoFalhaPre =
  | "SEM_TELEFONE_CEO"
  | "SEM_CONFIG_WHATSAPP_ATIVA"
  | "JA_EM_ANDAMENTO";

export interface TesteCanalCeoResultado {
  status: StatusTesteCeo;
  notifId?: number;
  destinatario?: string;
  /** SID Twilio (msg.sid) ou messageId Gupshup quando provedor aceitou. */
  provedorMsgId?: string;
  /** Mensagem traduzida do erro pro CEO ler na UI. */
  erro?: string;
  /** Motivo legivel quando falha pre-check (antes de tentar provedor). */
  motivoPre?: MotivoFalhaPre;
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
    "Se voce recebeu, o canal esta saudavel. Se nao, abra o painel CEO em",
    "/plataforma/perfil e cheque o status do ultimo teste.",
  ].join("\n");
}

/**
 * Traduz erros Twilio crus em mensagens uteis pro CEO. Mantemos o cru
 * em resposta_provedor pra suporte tecnico, mas a UI mostra o traduzido.
 */
export function traduzirErroProvedor(erroCru: string): string {
  const baixo = erroCru.toLowerCase();
  if (baixo.includes("21610") || baixo.includes("opted out")) {
    return "O CEO descadastrou (opt-out) este numero do WhatsApp. Envie STOP pra reativar.";
  }
  if (baixo.includes("21408") || baixo.includes("not enabled")) {
    return "Numero remetente nao habilitado pra WhatsApp na conta Twilio. Verifique a sandbox/aprovacao do numero.";
  }
  if (baixo.includes("21614") || baixo.includes("not a valid")) {
    return "Numero do CEO em formato invalido pro Twilio. Recadastre em /plataforma/perfil.";
  }
  if (baixo.includes("20003") || baixo.includes("authenticate")) {
    return "Credenciais Twilio (ACCOUNT_SID / AUTH_TOKEN) invalidas ou revogadas. Reconfigure em WhatsApp Config.";
  }
  if (baixo.includes("63016") || baixo.includes("freeform") || baixo.includes("template")) {
    return "Mensagem livre fora da janela de 24h. Use template HSM aprovado ou peca pro CEO mandar 'oi' antes.";
  }
  return `Provedor recusou: ${erroCru.slice(0, 220)}`;
}

interface CeoRow {
  id: number;
  telefone: string | null;
}

/** Resolve o CEO (platform_owner ativo) e o telefone E.164 cadastrado. */
export async function resolverCeoEAtivo(): Promise<CeoRow | null> {
  const r: any = await db.execute(sql`
    SELECT id, telefone
      FROM usuarios
     WHERE perfil_plataforma = 'platform_owner'
       AND ativo = true
     ORDER BY id ASC
     LIMIT 1
  `);
  const row = r.rows?.[0];
  if (!row) return null;
  return { id: Number(row.id), telefone: row.telefone ?? null };
}

/**
 * Dispara o teste. Pure-function-ish: nao depende de req/res, so do DB.
 * A rota chama isto e devolve o resultado bruto pro frontend.
 */
export async function dispararTesteCanalCeo(
  deps: TesteCanalCeoDeps = depsDefault,
): Promise<TesteCanalCeoResultado> {
  // Pre-check 1: existe CEO ativo com telefone cadastrado?
  const ceo = await resolverCeoEAtivo();
  if (!ceo) {
    return {
      status: "FALHA",
      motivoPre: "SEM_TELEFONE_CEO",
      erro: "Nenhum platform_owner ativo encontrado.",
    };
  }
  if (!ceo.telefone || ceo.telefone.trim() === "") {
    return {
      status: "FALHA",
      motivoPre: "SEM_TELEFONE_CEO",
      erro: "Telefone do CEO nao cadastrado. Cadastre em /plataforma/perfil antes de testar.",
    };
  }

  // Pre-check 2: existe config WhatsApp ativa?
  const config = await deps.obterConfigWhatsapp();
  if (!config) {
    return {
      status: "FALHA",
      motivoPre: "SEM_CONFIG_WHATSAPP_ATIVA",
      erro: "Nenhuma configuracao WhatsApp ativa. Cadastre em /admin/whatsapp-config.",
    };
  }

  // Pre-check 3: ja ha um teste em andamento? (anti double-click)
  //
  // Janela curta de 5min: se o processo crashar entre o INSERT (PROCESSANDO)
  // e o UPDATE final, sem janela um unico registro travado bloquearia novos
  // testes pra sempre (lockout permanente). Code-review apontou isso. Tests
  // legitimos terminam em segundos, entao 5min e folga suficiente sem
  // permitir flood real.
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

  // Insert PENDENTE -> avanca pra PROCESSANDO antes do disparo.
  const timestampBrt = timestampBrtAgora();
  const corpo = montarMensagemTesteCeo(timestampBrt);

  const ins: any = await db.execute(sql`
    INSERT INTO assinatura_notificacoes
      (canal, momento, destinatario, corpo, status, is_sistema_ceo, processando_em)
    VALUES
      ('WHATSAPP', 'TESTE_CANAL_CEO', ${ceo.telefone}, ${corpo},
       'PROCESSANDO', true, now())
    RETURNING id
  `);
  const notifId = Number(ins.rows[0].id);

  // Dispara via service generico (cuida de Twilio vs Gupshup e ja loga em
  // whatsapp_mensagens_log). NAO passamos alertaNotificacaoId aqui porque
  // a coluna referencia alertas_notificacao (outro contexto, killswitch).
  const env = await deps.enviarWhatsapp(ceo.telefone, corpo, {
    templateNome: "TESTE_CANAL_CEO",
  });

  if (env.sucesso) {
    await db.execute(sql`
      UPDATE assinatura_notificacoes
         SET status = 'ENVIADO',
             enviado_em = now(),
             resposta_provedor = ${JSON.stringify({ sid: env.provedorMsgId, logId: env.logId })}::jsonb,
             tentativas = tentativas + 1
       WHERE id = ${notifId}
    `);
    return {
      status: "ENVIADO",
      notifId,
      destinatario: ceo.telefone,
      provedorMsgId: env.provedorMsgId,
      timestampBrt,
    };
  }

  const erroTraduzido = traduzirErroProvedor(env.erro ?? "erro desconhecido");
  await db.execute(sql`
    UPDATE assinatura_notificacoes
       SET status = 'FALHA',
           erro = ${erroTraduzido},
           resposta_provedor = ${JSON.stringify({ erroCru: env.erro, logId: env.logId })}::jsonb,
           tentativas = tentativas + 1
     WHERE id = ${notifId}
  `);
  return {
    status: "FALHA",
    notifId,
    destinatario: ceo.telefone,
    erro: erroTraduzido,
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
  const resp = (row.resposta_provedor ?? {}) as { sid?: string };
  return {
    id: Number(row.id),
    status: row.status,
    destinatario: row.destinatario,
    criadoEm: new Date(row.criado_em).toISOString(),
    enviadoEm: row.enviado_em ? new Date(row.enviado_em).toISOString() : null,
    provedorMsgId: resp.sid ?? null,
    erro: row.erro ?? null,
  };
}
