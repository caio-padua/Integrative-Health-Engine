/**
 * Use-case Familia 4 (PARQ) — Wave 10 F3.A.
 *
 * Carrega o acordo PARQ + clinica + farmacia, gera PDF do termo, calcula hash,
 * e dispara envelope ZapSign bilateral ICP-Brasil (e-CNPJ clinica primeiro,
 * e-CNPJ farmacia depois — signature_order_active=true).
 *
 * Idempotente: se o acordo ja tem zapsign_envelope_clinica ou
 * zapsign_envelope_farmacia, retorna o existente sem reenviar.
 *
 * REGRA FERRO: paciente nunca entra. So 2 e-CNPJ em modo qualificada_ecnpj.
 */

import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { assinaturaService } from "../service";
import { gerarPdfPARQ } from "../../parq/pdfPARQ";
import type { Signatario } from "../types";

export interface EnviarPARQInput {
  acordoId: number;
  /** Override opcional dos dados de representacao (se vier do front). */
  clinicaRepresentante?: { nome: string; cpf: string };
  farmaciaRepresentante?: { nome: string; cpf?: string; email?: string; telefone?: string };
  /** Email/telefone da clinica pra ZapSign disparar (env var fallback). */
  clinicaContato?: { email?: string; telefone?: string };
}

export interface EnviarPARQResultado {
  ok: boolean;
  acordoId: number;
  numeroSerie: string;
  envelopeId: string;
  externalId: string;
  sha256: string;
  signatarios: Array<{ papel: string; nome: string; link?: string }>;
  reaproveitado: boolean;
}

interface AcordoRow {
  id: number;
  unidade_id: number;
  farmacia_id: number;
  numero_serie: string;
  emitido_em: Date;
  validacao_simplificada: boolean;
  zapsign_envelope_clinica: string | null;
  zapsign_envelope_farmacia: string | null;
  pdf_url: string | null;
  sha256_hash: string;
}

interface UnidadeRow {
  id: number;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
}
interface FarmaciaRow {
  id: number;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
}

async function carregarAcordo(id: number): Promise<AcordoRow> {
  const r = await db.execute(sql`
    SELECT id, unidade_id, farmacia_id, numero_serie, emitido_em,
           validacao_simplificada, zapsign_envelope_clinica,
           zapsign_envelope_farmacia, pdf_url, sha256_hash
    FROM parq_acordos WHERE id = ${id} LIMIT 1
  `);
  const row = ((r as unknown as { rows?: AcordoRow[] }).rows || [])[0];
  if (!row) throw new Error(`PARQ acordo ${id} nao encontrado`);
  return row;
}

async function carregarUnidade(id: number): Promise<UnidadeRow> {
  const r = await db.execute(sql`
    SELECT id, nome,
           COALESCE(razao_social, nome) AS razao_social,
           cnpj
    FROM unidades WHERE id = ${id} LIMIT 1
  `);
  const row = ((r as unknown as { rows?: UnidadeRow[] }).rows || [])[0];
  if (!row) throw new Error(`Unidade ${id} nao encontrada`);
  return row;
}

async function carregarFarmacia(id: number): Promise<FarmaciaRow> {
  const r = await db.execute(sql`
    SELECT id, nome_fantasia, razao_social, cnpj, cidade, estado
    FROM farmacias_parmavault WHERE id = ${id} LIMIT 1
  `);
  const row = ((r as unknown as { rows?: FarmaciaRow[] }).rows || [])[0];
  if (!row) throw new Error(`Farmacia ${id} nao encontrada`);
  return row;
}

export async function enviarPARQ(input: EnviarPARQInput): Promise<EnviarPARQResultado> {
  const acordo = await carregarAcordo(input.acordoId);

  // Idempotencia: se ja foi enviado (qualquer dos dois envelopes) reaproveita.
  if (acordo.zapsign_envelope_clinica || acordo.zapsign_envelope_farmacia) {
    const envelopeId = acordo.zapsign_envelope_clinica || acordo.zapsign_envelope_farmacia!;
    return {
      ok: true,
      acordoId: acordo.id,
      numeroSerie: acordo.numero_serie,
      envelopeId,
      externalId: `parq-${acordo.id}`,
      sha256: acordo.sha256_hash,
      signatarios: [],
      reaproveitado: true,
    };
  }

  const [unidade, farmacia] = await Promise.all([
    carregarUnidade(acordo.unidade_id),
    carregarFarmacia(acordo.farmacia_id),
  ]);

  // Dados do representante da clinica vem do payload OU env (fallback dev).
  const clinicaRep = input.clinicaRepresentante || {
    nome: process.env["CLINICA_REPRESENTANTE_NOME"] || unidade.nome,
    cpf: process.env["CLINICA_REPRESENTANTE_CPF"] || "00000000000",
  };
  const farmaciaRep = input.farmaciaRepresentante || {
    nome: farmacia.razao_social || farmacia.nome_fantasia,
    cpf: process.env["FARMACIA_REPRESENTANTE_CPF_FALLBACK"],
    email: process.env["FARMACIA_REPRESENTANTE_EMAIL_FALLBACK"],
    telefone: process.env["FARMACIA_REPRESENTANTE_TEL_FALLBACK"],
  };
  const clinicaContato = input.clinicaContato || {
    email: process.env["CLINICA_EMAIL"],
    telefone: process.env["CLINICA_TELEFONE"],
  };

  // Gera PDF. URL de verificacao usa numero_serie (estavel) e nao hash —
  // o hash provisorio do INSERT e sobrescrito pelo hash real abaixo, entao
  // gravar hash provisorio no QR quebraria o lookup publico.
  // O endpoint /api/parq/verificar/:numeroSerie resolve ambas direcoes
  // (numero -> hash atual + hash -> integridade).
  const baseUrl = process.env["PUBLIC_BASE_URL"] || "https://app.pawards.com.br";
  const urlVerificacao = `${baseUrl}/api/parq/verificar/${acordo.numero_serie}`;

  const pdf = await gerarPdfPARQ({
    numeroSerie: acordo.numero_serie,
    emitidoEm: new Date(acordo.emitido_em),
    clinica: {
      nomeFantasia: unidade.nome,
      razaoSocial: unidade.razao_social || unidade.nome,
      cnpj: unidade.cnpj || "00.000.000/0000-00",
      representante: clinicaRep.nome,
      cpfRepresentante: clinicaRep.cpf,
    },
    farmacia: {
      nomeFantasia: farmacia.nome_fantasia,
      razaoSocial: farmacia.razao_social || farmacia.nome_fantasia,
      cnpj: farmacia.cnpj,
      cidade: farmacia.cidade || undefined,
      estado: farmacia.estado || undefined,
      representante: farmaciaRep.nome,
    },
    validacaoSimplificada: acordo.validacao_simplificada,
    urlVerificacao,
  });

  // Persiste sha256 real no acordo (sobrepoe shaProvisorio do INSERT).
  await db.execute(sql`
    UPDATE parq_acordos
       SET sha256_hash = ${pdf.sha256}, updated_at = now()
     WHERE id = ${acordo.id}
  `);

  // Monta os 2 signatarios ICP (clinica primeiro, farmacia depois).
  const signatarios: Signatario[] = [
    {
      papel: "CLINICA_ECNPJ",
      nome: clinicaRep.nome,
      cpf: clinicaRep.cpf,
      email: clinicaContato.email,
      telefone: clinicaContato.telefone,
      ordem: 1,
    },
    {
      papel: "FARMACIA_ECNPJ",
      nome: farmaciaRep.nome,
      cpf: farmaciaRep.cpf,
      email: farmaciaRep.email,
      telefone: farmaciaRep.telefone,
      ordem: 2,
    },
  ];

  // Early-fail ICP-Brasil: ZapSign rejeita create se signatario qualificada_ecnpj
  // nao tem CPF real (regra ICP) ou nenhum canal de contato (email/telefone).
  // Falha ANTES de gerar PDF/UPDATE pra deixar acordo num estado limpo.
  for (const s of signatarios) {
    const cpfDigits = (s.cpf || "").replace(/\D/g, "");
    if (!cpfDigits || cpfDigits === "00000000000" || cpfDigits.length !== 11) {
      throw new Error(
        `PARQ ${acordo.numero_serie}: signatario ${s.papel} sem CPF valido. ` +
        `ICP-Brasil exige CPF do representante legal (11 digitos, real). ` +
        `Configure via input do payload ou env (CLINICA_REPRESENTANTE_CPF / FARMACIA_REPRESENTANTE_CPF_FALLBACK).`,
      );
    }
    if (!s.email && !s.telefone) {
      throw new Error(
        `PARQ ${acordo.numero_serie}: signatario ${s.papel} sem email NEM telefone. ` +
        `ZapSign precisa de pelo menos 1 canal pra disparar o link de assinatura.`,
      );
    }
    if (!s.nome || s.nome.length < 3) {
      throw new Error(
        `PARQ ${acordo.numero_serie}: signatario ${s.papel} com nome invalido (< 3 chars).`,
      );
    }
  }

  const externalId = `parq-${acordo.id}-${Date.now()}`;
  const r = await assinaturaService.enviarBilateralIcp({
    templateCodigo: "parq_acordo",
    templateCodigoFallback: "parq_acordo",
    externalId,
    pdfBase64: pdf.base64,
    hashOriginal: pdf.sha256,
    signatarios,
    metadata: {
      acordoId: acordo.id,
      numeroSerie: acordo.numero_serie,
      farmaciaId: farmacia.id,
      unidadeId: unidade.id,
      familia: 4,
      wave: 10,
    },
  });

  // Linka envelope a ambas colunas (sera atualizado pelo webhook ao completar).
  await db.execute(sql`
    UPDATE parq_acordos
       SET zapsign_envelope_clinica = ${r.envelopeId},
           zapsign_envelope_farmacia = ${r.envelopeId},
           updated_at = now()
     WHERE id = ${acordo.id}
  `);

  return {
    ok: true,
    acordoId: acordo.id,
    numeroSerie: acordo.numero_serie,
    envelopeId: r.envelopeId,
    externalId,
    sha256: pdf.sha256,
    signatarios: r.signatarios,
    reaproveitado: false,
  };
}

/** Marca compilador feliz quando enviarPARQ for usado so como side-effect. */
export const _enviarPARQTouch = createHash("sha256");
