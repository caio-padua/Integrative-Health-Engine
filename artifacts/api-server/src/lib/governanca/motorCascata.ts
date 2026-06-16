// ============================================================================
// MOTOR DA CASCATA DE VALIDACAO — transicao de niveis REAL, auditada, idempotente.
// ----------------------------------------------------------------------------
// Opcao C (exterminar ectoplasma): a tabela validacoes_cascata existia mas
// nao tinha motor que (1) criasse as etapas em sequencia conforme a config e
// (2) avancasse o status checando QUEM pode validar cada etapa. Este motor faz
// as duas coisas e usa a FUNCAO JUIZA (avaliarDelegacao) como nucleo de decisao
// (Opcao A plugada de verdade). Toda decisao — aprovada OU negada — vira
// auditoria gravada na timeline (eventos_clinicos), que a tela de governanca
// ja consome.
//
// SIGLAS (explicadas SEMPRE, conforme diretriz do CEO):
//  - cascata: fila de validacao em niveis (enfermeira -> consultor -> medico
//    -> medico senior); cada nivel so abre quando o anterior aprova.
//  - I/O (entrada e saida): funcoes que leem/gravam no banco de dados.
//  - selo: cor-resumo do estado da cascata (VERDE = tudo aprovado).
//
// Arquitetura: NUCLEO PURO (sem banco, 100% testavel) + CAMADA I/O (grava).
// ============================================================================

import { db, validacoesCascataTable, cascataValidacaoConfigTable, eventosClinicosTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { avaliarDelegacao, type Perfil, type ResultadoDelegacao, type Acao } from "./avaliarDelegacao";
import { carregarPerfilGovernanca } from "./carregarPerfilGovernanca";

// ----------------------------------------------------------------------------
// NUCLEO PURO (sem banco) — testavel isoladamente
// ----------------------------------------------------------------------------

export type EtapaCascata = "ENFERMEIRA03" | "CONSULTOR03" | "MEDICO03" | "MEDICO_SENIOR";
export type StatusEtapa = "PENDENTE" | "APROVADO" | "REJEITADO";
export type Selo = "VERDE" | "AMARELO" | "VERMELHO" | "CINZA";

/** Ordem canonica da cascata: cada etapa so abre quando a anterior aprova. */
export const ORDEM_ETAPAS: EtapaCascata[] = ["ENFERMEIRA03", "CONSULTOR03", "MEDICO03", "MEDICO_SENIOR"];

/** A etapa do medico senior ASSINA (exige pode_assinar); as demais VALIDAM. */
export function acaoDaEtapa(etapa: EtapaCascata): Acao {
  return etapa === "MEDICO_SENIOR" ? "assinar" : "validar";
}

/** Decisao pura: este perfil pode validar/assinar esta etapa? Delega na funcao juiza. */
export function decidirValidacaoEtapa(etapa: EtapaCascata, perfil: Perfil): ResultadoDelegacao {
  return avaliarDelegacao({
    origem: perfil,
    destino: perfil,
    acao: acaoDaEtapa(etapa),
    modo: "medico_no_comando",
  });
}

export interface ConfigCascata {
  ativa: boolean;
  requerEnfermeira03: boolean;
  requerConsultor03: boolean;
  requerMedico03: boolean;
  requerMedicoSenior: boolean;
}

/** Quais etapas a config exige, na ordem canonica. */
export function etapasRequeridas(config: ConfigCascata): EtapaCascata[] {
  const req: EtapaCascata[] = [];
  if (config.requerEnfermeira03) req.push("ENFERMEIRA03");
  if (config.requerConsultor03) req.push("CONSULTOR03");
  if (config.requerMedico03) req.push("MEDICO03");
  if (config.requerMedicoSenior) req.push("MEDICO_SENIOR");
  return req;
}

export interface EtapaStatus {
  etapa: EtapaCascata;
  status: StatusEtapa;
}

/**
 * Selo-resumo da cascata (cor que o CEO bate o olho):
 *  CINZA   = nao iniciada (sem etapas);
 *  VERMELHO= alguma etapa REJEITADA;
 *  VERDE   = todas as etapas APROVADAS;
 *  AMARELO = em andamento (ha pendente, nenhuma rejeitada).
 */
export function calcularSelo(etapas: EtapaStatus[]): Selo {
  if (etapas.length === 0) return "CINZA";
  if (etapas.some((e) => e.status === "REJEITADO")) return "VERMELHO";
  if (etapas.every((e) => e.status === "APROVADO")) return "VERDE";
  return "AMARELO";
}

/**
 * Regra de ordem (pura): so pode decidir a etapa se TODAS as anteriores
 * (na ordem canonica, dentre as requeridas) ja estiverem APROVADAS.
 */
export function etapaLiberadaParaDecisao(
  etapaAlvo: EtapaCascata,
  requeridas: EtapaCascata[],
  statusPorEtapa: Map<EtapaCascata, StatusEtapa>,
): { liberada: boolean; motivo: string } {
  const ordemReq = ORDEM_ETAPAS.filter((e) => requeridas.includes(e));
  const idxAlvo = ordemReq.indexOf(etapaAlvo);
  if (idxAlvo === -1) return { liberada: false, motivo: `etapa '${etapaAlvo}' nao e requerida nesta cascata` };
  for (let i = 0; i < idxAlvo; i++) {
    const anterior = ordemReq[i];
    if (statusPorEtapa.get(anterior) !== "APROVADO") {
      return { liberada: false, motivo: `etapa anterior '${anterior}' ainda nao foi aprovada (cascata fora de ordem)` };
    }
  }
  return { liberada: true, motivo: "etapa liberada" };
}

// ----------------------------------------------------------------------------
// CAMADA I/O (grava no banco) — usa o nucleo puro acima
// ----------------------------------------------------------------------------

export type EntidadeTipo = "ANAMNESE" | "EXAME" | "FORMULA" | "CHECKIN" | "VISITA";

async function lerConfig(): Promise<ConfigCascata | null> {
  const [c] = await db.select().from(cascataValidacaoConfigTable).limit(1);
  if (!c) return null;
  return {
    ativa: c.ativa,
    requerEnfermeira03: c.requerEnfermeira03,
    requerConsultor03: c.requerConsultor03,
    requerMedico03: c.requerMedico03,
    requerMedicoSenior: c.requerMedicoSenior,
  };
}

/**
 * Registra a decisao de governanca na timeline (eventos_clinicos).
 * EXTERMINA o ectoplasma "decisao sem auditoria": grava aprovada E negada.
 */
export async function registrarDecisaoGovernanca(args: {
  usuarioId: number | null;
  pacienteId?: number | null;
  entidadeTipo: string;
  entidadeId: number;
  etapa: EtapaCascata;
  resultado: ResultadoDelegacao;
  ip?: string | null;
}): Promise<void> {
  const veredicto = args.resultado.permitido ? "AUTORIZOU" : "NEGOU";
  await db.insert(eventosClinicosTable).values({
    tipo: "VALIDACAO_CASCATA",
    descricao: `[DECISAO] ${veredicto} ${acaoDaEtapa(args.etapa)} da etapa ${args.etapa} — ${args.resultado.motivo}`,
    usuarioId: args.usuarioId ?? null,
    pacienteId: args.pacienteId ?? null,
    entidadeTipo: args.entidadeTipo,
    entidadeId: args.entidadeId,
    metadados: JSON.stringify({ etapa: args.etapa, permitido: args.resultado.permitido, motivo: args.resultado.motivo }),
    ip: args.ip ?? null,
  });
}

/**
 * Abre a cascata para uma entidade: cria as etapas requeridas (PENDENTE) em
 * ordem. IDEMPOTENTE: nao duplica etapa que ja exista para a mesma entidade.
 */
export async function abrirCascata(args: {
  entidadeTipo: EntidadeTipo;
  entidadeId: number;
  pacienteId: number;
  usuarioId: number | null;
  ip?: string | null;
}): Promise<{ aberta: boolean; etapasCriadas: EtapaCascata[]; motivo: string }> {
  const config = await lerConfig();
  if (!config) return { aberta: false, etapasCriadas: [], motivo: "cascata sem configuracao cadastrada" };
  if (!config.ativa) return { aberta: false, etapasCriadas: [], motivo: "cascata desativada na configuracao" };

  const requeridas = etapasRequeridas(config);
  const existentes = await db
    .select({ etapa: validacoesCascataTable.etapa })
    .from(validacoesCascataTable)
    .where(and(eq(validacoesCascataTable.entidadeTipo, args.entidadeTipo), eq(validacoesCascataTable.entidadeId, args.entidadeId)));
  const jaExiste = new Set(existentes.map((e) => e.etapa));

  const paraInserir = requeridas.filter((etapa) => !jaExiste.has(etapa));
  let etapasCriadas: EtapaCascata[] = [];
  if (paraInserir.length > 0) {
    // Blindagem de concorrencia: o indice unico (entidade_tipo, entidade_id,
    // etapa) + onConflictDoNothing fecham a corrida. Se dois pedidos abrirem a
    // mesma cascata em paralelo, cada etapa e criada UMA so vez; o returning diz
    // quais etapas ESTE pedido realmente inseriu (o outro recebe lista vazia).
    const inseridas = await db
      .insert(validacoesCascataTable)
      .values(paraInserir.map((etapa) => ({
        entidadeTipo: args.entidadeTipo,
        entidadeId: args.entidadeId,
        pacienteId: args.pacienteId,
        etapa,
        status: "PENDENTE" as const,
      })))
      .onConflictDoNothing()
      .returning({ etapa: validacoesCascataTable.etapa });
    const criadas = new Set(inseridas.map((r) => r.etapa));
    etapasCriadas = ORDEM_ETAPAS.filter((e) => criadas.has(e));
  }

  if (etapasCriadas.length > 0) {
    await db.insert(eventosClinicosTable).values({
      tipo: "VALIDACAO_CASCATA",
      descricao: `[ABERTURA] Cascata aberta para ${args.entidadeTipo} #${args.entidadeId}: ${etapasCriadas.join(", ")}`,
      usuarioId: args.usuarioId ?? null,
      pacienteId: args.pacienteId,
      entidadeTipo: args.entidadeTipo,
      entidadeId: args.entidadeId,
      ip: args.ip ?? null,
    });
  }

  return {
    aberta: true,
    etapasCriadas,
    motivo: etapasCriadas.length > 0 ? "cascata aberta" : "cascata ja estava aberta (idempotente)",
  };
}

/**
 * Valida (aprova/rejeita) uma etapa. Coracao do motor:
 *  1. checa se a etapa esta PENDENTE (idempotente);
 *  2. carrega o perfil REAL do usuario (4 flags do banco);
 *  3. a FUNCAO JUIZA decide se ele pode; se nao, audita a NEGATIVA e para;
 *  4. checa a ordem da cascata (anteriores aprovadas);
 *  5. grava o novo status + auditoria da decisao + selo atualizado.
 */
export async function validarEtapa(args: {
  validacaoId: number;
  usuarioId: number;
  decisao: "APROVADO" | "REJEITADO";
  observacao?: string | null;
  assinaturaA1?: string | null;
  ip?: string | null;
}): Promise<{ permitido: boolean; motivo: string; selo?: Selo; statusEtapa?: StatusEtapa }> {
  const [validacao] = await db.select().from(validacoesCascataTable).where(eq(validacoesCascataTable.id, args.validacaoId)).limit(1);
  if (!validacao) return { permitido: false, motivo: "validacao inexistente" };
  if (validacao.status !== "PENDENTE") {
    return { permitido: false, motivo: `etapa ja decidida (status atual: ${validacao.status})`, statusEtapa: validacao.status as StatusEtapa };
  }

  const etapa = validacao.etapa as EtapaCascata;
  const perfil = await carregarPerfilGovernanca(args.usuarioId);
  if (!perfil) return { permitido: false, motivo: "usuario inexistente (fail-closed)" };

  const decisao = decidirValidacaoEtapa(etapa, perfil);
  if (!decisao.permitido) {
    await registrarDecisaoGovernanca({
      usuarioId: args.usuarioId,
      pacienteId: validacao.pacienteId,
      entidadeTipo: validacao.entidadeTipo,
      entidadeId: validacao.entidadeId,
      etapa,
      resultado: decisao,
      ip: args.ip,
    });
    return { permitido: false, motivo: decisao.motivo };
  }

  // Ordem da cascata: anteriores requeridas precisam estar aprovadas.
  const config = await lerConfig();
  const requeridas = config ? etapasRequeridas(config) : ORDEM_ETAPAS;
  const todas = await db
    .select({ etapa: validacoesCascataTable.etapa, status: validacoesCascataTable.status })
    .from(validacoesCascataTable)
    .where(and(eq(validacoesCascataTable.entidadeTipo, validacao.entidadeTipo), eq(validacoesCascataTable.entidadeId, validacao.entidadeId)));
  const statusPorEtapa = new Map<EtapaCascata, StatusEtapa>(todas.map((t) => [t.etapa as EtapaCascata, t.status as StatusEtapa]));

  if (args.decisao === "APROVADO") {
    const ordem = etapaLiberadaParaDecisao(etapa, requeridas, statusPorEtapa);
    if (!ordem.liberada) {
      const bloqueio: ResultadoDelegacao = { permitido: false, motivo: ordem.motivo, exigeAuditoria: true };
      await registrarDecisaoGovernanca({
        usuarioId: args.usuarioId,
        pacienteId: validacao.pacienteId,
        entidadeTipo: validacao.entidadeTipo,
        entidadeId: validacao.entidadeId,
        etapa,
        resultado: bloqueio,
        ip: args.ip,
      });
      return { permitido: false, motivo: ordem.motivo };
    }
  }

  // Update CONDICIONAL (otimista): so grava se a etapa ainda estiver PENDENTE.
  // Fecha a corrida entre a leitura inicial e esta escrita — se outra requisicao
  // decidiu a etapa no meio do caminho, este update afeta 0 linhas e abortamos
  // SEM auditar uma falsa aprovacao (sem dupla gravacao).
  const atualizadas = await db
    .update(validacoesCascataTable)
    .set({
      status: args.decisao,
      validadoPorId: args.usuarioId,
      validadoEm: new Date(),
      observacao: args.observacao ?? null,
      assinaturaA1: args.assinaturaA1 ?? null,
    })
    .where(and(eq(validacoesCascataTable.id, args.validacaoId), eq(validacoesCascataTable.status, "PENDENTE")))
    .returning({ id: validacoesCascataTable.id });
  if (atualizadas.length === 0) {
    return { permitido: false, motivo: "etapa ja foi decidida concorrentemente (corrida resolvida, sem dupla gravacao)" };
  }

  await registrarDecisaoGovernanca({
    usuarioId: args.usuarioId,
    pacienteId: validacao.pacienteId,
    entidadeTipo: validacao.entidadeTipo,
    entidadeId: validacao.entidadeId,
    etapa,
    resultado: { permitido: true, motivo: `${args.decisao} por usuario #${args.usuarioId}`, exigeAuditoria: true },
    ip: args.ip,
  });

  statusPorEtapa.set(etapa, args.decisao);
  const etapasFinais: EtapaStatus[] = requeridas.map((e) => ({ etapa: e, status: statusPorEtapa.get(e) ?? "PENDENTE" }));
  return { permitido: true, motivo: `etapa ${etapa} ${args.decisao}`, selo: calcularSelo(etapasFinais), statusEtapa: args.decisao };
}

/** Selo verde da cascata de uma entidade (cereja: prova ponta a ponta). */
export async function obterSeloCascata(args: { entidadeTipo: EntidadeTipo; entidadeId: number }): Promise<{ selo: Selo; etapas: EtapaStatus[] }> {
  const linhas = await db
    .select({ etapa: validacoesCascataTable.etapa, status: validacoesCascataTable.status })
    .from(validacoesCascataTable)
    .where(and(eq(validacoesCascataTable.entidadeTipo, args.entidadeTipo), eq(validacoesCascataTable.entidadeId, args.entidadeId)));
  const etapas: EtapaStatus[] = ORDEM_ETAPAS.filter((e) => linhas.some((l) => l.etapa === e)).map((e) => ({
    etapa: e,
    status: (linhas.find((l) => l.etapa === e)?.status ?? "PENDENTE") as StatusEtapa,
  }));
  return { selo: calcularSelo(etapas), etapas };
}
