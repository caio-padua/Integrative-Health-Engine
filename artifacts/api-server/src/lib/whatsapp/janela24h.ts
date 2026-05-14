import { db, whatsappInboundTable, whatsappConfigTable } from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";

// Task #205 — janela de 24h do WhatsApp Business API.
//
// A regra do WhatsApp diz que mensagens fora de template HSM (texto livre)
// só são entregues nas 24h após o destinatário ter falado com a clínica.
// Esta helper consulta `whatsapp_inbound` pra dizer se a janela está
// aberta pra um telefone agora.
//
// O matching é por telefone normalizado (só dígitos, com prefixo 55 BR
// quando aplicável), o mesmo formato gravado em
// `whatsapp_mensagens_log.telefone_destino` e em
// `whatsapp_inbound.telefone_origem`. Aceita variações (com/sem +, com
// espaço, com parêntese) e normaliza antes da consulta.

export function normalizarTelefoneBr(telefone: string): string {
  const digitos = (telefone || "").replace(/\D/g, "");
  if (!digitos) return "";
  // Brasil: garante prefixo 55. Se já vier com 55 mantem.
  if (digitos.startsWith("55")) return digitos;
  // Se tem 10 ou 11 dígitos (DDD + número), assume BR e prefixa.
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

/**
 * Contexto opcional pra restringir o match da janela à conta WhatsApp
 * (configId) ou à clínica (unidadeId) específica. Quando informado,
 * a query exige que o inbound tenha sido recebido NAQUELA conta — evita
 * abrir janela errada quando dois pacientes de clínicas diferentes têm
 * o mesmo telefone (ou quando uma conta WhatsApp atende várias unidades).
 *
 * Quando ambos forem nulos, a busca é só por telefone (modo legado).
 */
export type Janela24hContexto = {
  configId?: number | null;
  unidadeId?: number | null;
};

/**
 * Retorna true se houve QUALQUER mensagem inbound do telefone informado
 * nas últimas 24h — ou seja, a janela do WhatsApp Business API está
 * aberta e a clínica pode mandar texto livre com entrega garantida.
 *
 * Aceita contexto pra restringir à config/unidade que vai mandar — em
 * ambiente multi-clínica isso eh OBRIGATORIO pra não abrir janela
 * errada.
 */
export async function janela24hAberta(
  telefone: string,
  contexto?: Janela24hContexto,
): Promise<boolean> {
  const normalizado = normalizarTelefoneBr(telefone);
  if (!normalizado) return false;
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const condicoes = [
    eq(whatsappInboundTable.telefoneOrigem, normalizado),
    gte(whatsappInboundTable.recebidoEm, limite),
  ];
  if (contexto?.configId != null) {
    condicoes.push(eq(whatsappInboundTable.configId, contexto.configId));
  } else if (contexto?.unidadeId != null) {
    condicoes.push(eq(whatsappInboundTable.unidadeId, contexto.unidadeId));
  }
  const linhas = await db
    .select({ id: whatsappInboundTable.id })
    .from(whatsappInboundTable)
    .where(and(...condicoes))
    .limit(1);
  return linhas.length > 0;
}

/**
 * Versão batch — recebe vários telefones e devolve um Set com aqueles
 * que têm a janela aberta. Útil pra evitar N queries quando a auditoria
 * de suspensão está calculando o alerta amarelo pra vários destinatários.
 *
 * Mesmo contexto opcional de `janela24hAberta` — quando informado,
 * filtra por configId/unidadeId pra evitar match cruzado entre clínicas.
 */
export async function janela24hAbertaParaTelefones(
  telefones: string[],
  contexto?: Janela24hContexto,
): Promise<Set<string>> {
  const normalizados = Array.from(
    new Set(telefones.map(normalizarTelefoneBr).filter(Boolean)),
  );
  if (normalizados.length === 0) return new Set();
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const condicoes = [
    sql`${whatsappInboundTable.telefoneOrigem} = ANY(${normalizados})`,
    gte(whatsappInboundTable.recebidoEm, limite),
  ];
  if (contexto?.configId != null) {
    condicoes.push(eq(whatsappInboundTable.configId, contexto.configId));
  } else if (contexto?.unidadeId != null) {
    condicoes.push(eq(whatsappInboundTable.unidadeId, contexto.unidadeId));
  }
  const linhas = await db
    .select({ telefone: whatsappInboundTable.telefoneOrigem })
    .from(whatsappInboundTable)
    .where(and(...condicoes));
  return new Set(linhas.map((l) => l.telefone));
}

/**
 * Localiza a config WhatsApp ativa pelo número de DESTINO (o número da
 * clínica que recebeu o inbound). É como o webhook descobre qual conta
 * WhatsApp recebeu a mensagem — Twilio manda em `To`, Gupshup em
 * `destination`. Retorna null se nenhuma config bater.
 *
 * Usado pra (1) atribuir o inbound à unidade correta e (2) escolher
 * a credencial certa pra validar a assinatura do webhook.
 */
export async function localizarConfigPorNumeroDestino(
  numeroDestino: string,
  provedor: "TWILIO" | "GUPSHUP",
): Promise<{ id: number; unidadeId: number | null; numeroRemetente: string } | null> {
  const normalizado = normalizarTelefoneBr(numeroDestino);
  if (!normalizado) return null;
  const configs = await db
    .select({
      id: whatsappConfigTable.id,
      unidadeId: whatsappConfigTable.unidadeId,
      numeroRemetente: whatsappConfigTable.numeroRemetente,
    })
    .from(whatsappConfigTable)
    .where(
      and(
        eq(whatsappConfigTable.ativo, true),
        eq(whatsappConfigTable.provedor, provedor),
      ),
    );
  // Match flexivel: o numero pode estar gravado com/sem +, com/sem 55,
  // com mascara. Compara normalizado contra normalizado.
  for (const c of configs) {
    if (normalizarTelefoneBr(c.numeroRemetente) === normalizado) {
      return c;
    }
  }
  return null;
}
