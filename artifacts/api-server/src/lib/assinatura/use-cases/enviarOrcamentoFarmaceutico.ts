/**
 * Use-case Familia 3 (Orcamento Farmaceutico) — Wave 10 F3.C.
 *
 * Dispara envelope ZapSign duplo quando uma receita do PARMAVAULT eh roteada
 * pra uma farmacia parceira (entidade orcamento documental MVP — Caminho 1
 * aprovado pelo Caio: orcamento = receita roteada com valor_formula_estimado).
 *
 * Signatarios:
 *   - PACIENTE (avancada, assinaturaTela-tokenWhatsApp) — Lei 14.063 art. 4 II
 *     + LGPD art. 11 §4º (consentimento ESPECIFICO ao tratamento farmaceutico)
 *   - FARMACIA_ECNPJ (qualificada_ecnpj, ICP-Brasil) — fecha triangulo
 *     CFM 2.386/2024 + CC 593-609 + STJ REsp 2.159.442/PR (defesa contra
 *     acusacao de favorecimento ou comissionamento opaco)
 *
 * Idempotente: 1 orcamento por receita. Se ja existe assinatura_solicitacoes
 * com metadata->>'receitaId' = X em status ENVIADO ou CONCLUIDO, retorna
 * existente sem reenviar (evita desperdicio de credito ZapSign R$ 0,50).
 *
 * Documento: usa template ORCAMENTO_FORMAL_V1 (id=4) ja cadastrado em
 * assinatura_templates. Hidratacao reusa caminho do enviar() padrao —
 * farmacia + valor entram via campo `procedimento` (texto livre, sem
 * mexer em placeholders pra MVP minimal Caminho 1).
 *
 * REGRA FERRO Wave 10 #14 (Manifesto PADCON Parte 6): paciente NUNCA em ICP.
 * Esta rota nao aceita override de auth_method do paciente.
 *
 * Early-fail (incorpora aprendizado Round 4 item 3): valida receita +
 * paciente + farmacia + valor ANTES de qualquer round-trip ZapSign.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { assinaturaService } from "../service";
import type { Signatario } from "../types";

const TEMPLATE_CODIGO = "ORCAMENTO_FORMAL_V1";
const TEMPLATE_ID = 4;

export interface EnviarOrcamentoFarmaceuticoInput {
  receitaId: number;
  /**
   * Override opcional dos dados de representacao da farmacia. Se ausente,
   * tenta env (FARMACIA_REPRESENTANTE_*_FALLBACK) — espelho do padrao F3.A.
   */
  farmaciaRepresentante?: {
    nome: string;
    cpf?: string;
    email?: string;
    telefone?: string;
  };
}

export interface EnviarOrcamentoFarmaceuticoResultado {
  ok: boolean;
  receitaId: number;
  numeroReceita: string;
  pacienteId: number;
  farmaciaId: number;
  templateCodigo: string;
  templateId: number;
  solicitacaoId: number;
  envelopeId: string;
  signatarioPacienteLink: string | null;
  signatarioFarmaciaLink: string | null;
  reaproveitado: boolean;
}

interface ReceitaRow {
  id: number;
  paciente_id: number | null;
  farmacia_id: number | null;
  unidade_id: number | null;
  numero_receita: string | null;
  valor_formula_estimado: string | null;
  prescricao_id: number | null;
  status: string | null;
}

interface PacienteRow {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
}

interface FarmaciaRow {
  id: number;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
}

interface SolicitacaoExistenteRow {
  id: number;
  provedor_envelope_id: string;
  status: string;
  metadata: {
    linksAssinatura?: Array<{ email: string; url: string }>;
  } | null;
  signatarios_snapshot: Signatario[] | null;
}

async function carregarReceita(id: number): Promise<ReceitaRow> {
  const r = await db.execute(sql`
    SELECT id, paciente_id, farmacia_id, unidade_id, numero_receita,
           valor_formula_estimado::text AS valor_formula_estimado,
           prescricao_id, status
    FROM parmavault_receitas WHERE id = ${id} LIMIT 1
  `);
  const row = ((r as unknown as { rows?: ReceitaRow[] }).rows || [])[0];
  if (!row) throw new Error(`Orcamento: receita PARMAVAULT ${id} nao encontrada`);
  return row;
}

async function carregarPaciente(id: number): Promise<PacienteRow> {
  const r = await db.execute(sql`
    SELECT id, nome, cpf, email, telefone
    FROM pacientes WHERE id = ${id} LIMIT 1
  `);
  const row = ((r as unknown as { rows?: PacienteRow[] }).rows || [])[0];
  if (!row) throw new Error(`Orcamento: paciente ${id} nao encontrado`);
  return row;
}

async function carregarFarmacia(id: number): Promise<FarmaciaRow> {
  const r = await db.execute(sql`
    SELECT id, nome_fantasia, razao_social, cnpj, cidade, estado
    FROM farmacias_parmavault WHERE id = ${id} LIMIT 1
  `);
  const row = ((r as unknown as { rows?: FarmaciaRow[] }).rows || [])[0];
  if (!row) throw new Error(`Orcamento: farmacia ${id} nao encontrada`);
  return row;
}

async function buscarSolicitacaoExistente(
  pacienteId: number,
  receitaId: number,
): Promise<SolicitacaoExistenteRow | null> {
  // Idempotencia via metadata->>'receitaId' (sem index unico — busca seq pequena
  // pelo paciente_id + template_id ja indexado).
  const r = await db.execute(sql`
    SELECT id, provedor_envelope_id, status, metadata, signatarios_snapshot
    FROM assinatura_solicitacoes
    WHERE paciente_id = ${pacienteId}
      AND template_id = ${TEMPLATE_ID}
      AND status IN ('ENVIADO', 'CONCLUIDO')
      AND (metadata->>'receitaId')::bigint = ${receitaId}
    ORDER BY enviado_em DESC
    LIMIT 1
  `);
  const row = ((r as unknown as { rows?: SolicitacaoExistenteRow[] }).rows || [])[0];
  return row || null;
}

function formatarBRL(valor: string | null): string {
  if (!valor) return "0,00";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "0,00";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function enviarOrcamentoFarmaceutico(
  input: EnviarOrcamentoFarmaceuticoInput,
): Promise<EnviarOrcamentoFarmaceuticoResultado> {
  // ──── Early-fails: valida ANTES de tocar template/ZapSign ────
  const receita = await carregarReceita(input.receitaId);

  if (!receita.paciente_id) {
    throw new Error(
      `Orcamento receita ${receita.id}: sem paciente_id (receita orfa, ` +
      `nao pode disparar consentimento LGPD art. 11 §4º).`,
    );
  }
  if (!receita.farmacia_id) {
    throw new Error(
      `Orcamento receita ${receita.id}: sem farmacia_id (nao roteada). ` +
      `Rotear via roteamentoFarmacia antes de chamar este use-case.`,
    );
  }
  const valorNum = Number(receita.valor_formula_estimado || "0");
  if (!Number.isFinite(valorNum) || valorNum <= 0) {
    throw new Error(
      `Orcamento receita ${receita.id}: valor_formula_estimado invalido ` +
      `(${receita.valor_formula_estimado}). Aviar so com valor > 0.`,
    );
  }

  // Idempotencia: 1 orcamento por receita.
  const existente = await buscarSolicitacaoExistente(receita.paciente_id, receita.id);
  if (existente) {
    const links = existente.metadata?.linksAssinatura || [];
    const sigs = existente.signatarios_snapshot || [];
    const pacSig = sigs.find((s) => s.papel === "PACIENTE");
    const farmSig = sigs.find((s) => s.papel === "FARMACIA_ECNPJ");
    return {
      ok: true,
      receitaId: receita.id,
      numeroReceita: receita.numero_receita || `R-${receita.id}`,
      pacienteId: receita.paciente_id,
      farmaciaId: receita.farmacia_id,
      templateCodigo: TEMPLATE_CODIGO,
      templateId: TEMPLATE_ID,
      solicitacaoId: existente.id,
      envelopeId: existente.provedor_envelope_id,
      signatarioPacienteLink: links.find((l) => l.email === pacSig?.email)?.url || null,
      signatarioFarmaciaLink: links.find((l) => l.email === farmSig?.email)?.url || null,
      reaproveitado: true,
    };
  }

  const [paciente, farmacia] = await Promise.all([
    carregarPaciente(receita.paciente_id),
    carregarFarmacia(receita.farmacia_id),
  ]);

  // Early-fail #2: paciente precisa de canal pra ZapSign avancada.
  if (!paciente.telefone && !paciente.email) {
    throw new Error(
      `Orcamento receita ${receita.id}: paciente ${paciente.id} sem email NEM ` +
      `telefone. ZapSign avancada exige ao menos 1 canal pra disparar token.`,
    );
  }
  if (!paciente.nome || paciente.nome.trim().length < 3) {
    throw new Error(`Orcamento receita ${receita.id}: paciente sem nome valido.`);
  }

  // Early-fail #3: farmacia precisa de representante ICP — fallback via env.
  // farmacias_parmavault NAO tem campos representante_* (sujeira herdada
  // Wave 5 — registrar em MAPA_NEURONAL_v1.1_LIMPEZA pra Wave 10.5 corrigir).
  const farmaciaRep = input.farmaciaRepresentante || {
    nome:
      process.env["FARMACIA_REPRESENTANTE_NOME_FALLBACK"] ||
      farmacia.razao_social ||
      farmacia.nome_fantasia,
    cpf: process.env["FARMACIA_REPRESENTANTE_CPF_FALLBACK"],
    email: process.env["FARMACIA_REPRESENTANTE_EMAIL_FALLBACK"],
    telefone: process.env["FARMACIA_REPRESENTANTE_TEL_FALLBACK"],
  };

  const cpfDigits = (farmaciaRep.cpf || "").replace(/\D/g, "");
  if (!cpfDigits || cpfDigits === "00000000000" || cpfDigits.length !== 11) {
    throw new Error(
      `Orcamento receita ${receita.id}: farmacia ${farmacia.id} sem CPF do ` +
      `representante (ICP-Brasil exige 11 digitos reais). Configure via ` +
      `input.farmaciaRepresentante.cpf ou env FARMACIA_REPRESENTANTE_CPF_FALLBACK.`,
    );
  }
  if (!farmaciaRep.email && !farmaciaRep.telefone) {
    throw new Error(
      `Orcamento receita ${receita.id}: farmacia ${farmacia.id} sem email NEM ` +
      `telefone do representante. ZapSign precisa de canal pra disparar link.`,
    );
  }

  // ──── Disparo ZapSign duplo (paciente avancada + farmacia ICP, paralelo) ────
  // Mapeamento auth_mode:
  //   PACIENTE        -> avancada (assinaturaTela-tokenWhatsApp) — default papel
  //   FARMACIA_ECNPJ  -> qualificada_ecnpj (ICP-Brasil)         — default papel
  // Sem ordemAssinaturaAtiva: assinatura paralela (UX mais rapida).
  const farmaciaSignatario: Signatario = {
    papel: "FARMACIA_ECNPJ",
    nome: farmaciaRep.nome,
    cpf: farmaciaRep.cpf,
    email: farmaciaRep.email,
    telefone: farmaciaRep.telefone,
    ordem: 2,
  };

  // Procedimento textual injeta dados da farmacia e do medicamento direto na
  // hidratacao (sem precisar adicionar placeholders novos ao template — MVP
  // minimal Caminho 1). Valor entra como VALOR_ORCAMENTO ja hidratado.
  const procedimentoTexto =
    `Aviamento da formula manipulada (receita ${receita.numero_receita || `R-${receita.id}`}) ` +
    `na Farmacia ${farmacia.razao_social || farmacia.nome_fantasia} ` +
    `(CNPJ ${farmacia.cnpj}` +
    (farmacia.cidade ? `, ${farmacia.cidade}/${farmacia.estado || "??"}` : "") +
    `).`;

  // CORRECAO POS-CODE-REVIEW Wave 10 F3.C:
  // 1. externalId deterministico `orc-${receitaId}-${ts}` — F4 webhook reconcilia 1:1
  //    via zapsign_external_id (regex /^orc-(\d+)-\d+$/) sem ambiguidade.
  // 2. metadataExtra mergeada NO INSERT inicial (atomico) — elimina janela de race
  //    entre INSERT e UPDATE pos-INSERT que existia na v1.
  // 3. forcarProvedor: "zapsign" — evita risco funcional-juridico de fallback pra
  //    Clicksign que nao garante semantica ICP qualificada pra FARMACIA_ECNPJ.
  const externalIdDeterministico = `orc-${receita.id}-${Date.now()}`;
  const r = await assinaturaService.enviar({
    pacienteId: paciente.id,
    templateCodigo: TEMPLATE_CODIGO,
    procedimento: procedimentoTexto,
    valorOrcamento: formatarBRL(receita.valor_formula_estimado),
    signatariosExtras: [farmaciaSignatario],
    forcarProvedor: "zapsign",
    externalId: externalIdDeterministico,
    metadataExtra: {
      receitaId: receita.id,
      farmaciaId: farmacia.id,
      numeroReceita: receita.numero_receita,
      valorFormulaEstimado: receita.valor_formula_estimado,
      familia: 3,
      wave: 10,
    },
  });

  const pacienteLink = r.signatarios.find((s) => s.papel === "PACIENTE")?.link ?? null;
  const farmaciaLink = r.signatarios.find((s) => s.papel === "FARMACIA_ECNPJ")?.link ?? null;

  return {
    ok: true,
    receitaId: receita.id,
    numeroReceita: receita.numero_receita || `R-${receita.id}`,
    pacienteId: paciente.id,
    farmaciaId: farmacia.id,
    templateCodigo: TEMPLATE_CODIGO,
    templateId: TEMPLATE_ID,
    solicitacaoId: r.solicitacaoId,
    envelopeId: r.envelopeId,
    signatarioPacienteLink: pacienteLink,
    signatarioFarmaciaLink: farmaciaLink,
    reaproveitado: false,
  };
}
