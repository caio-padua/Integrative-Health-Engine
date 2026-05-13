/**
 * Registry central de arquivos do paciente.
 *
 * Wave Cadastro Pádua — 13/mai/2026
 *
 * Este módulo é a ÚNICA porta de entrada pra registrar metadados de qualquer
 * arquivo gerado pelo sistema (RAS, NF, receita, TCLE, etc.) na tabela
 * `arquivos_paciente`.
 *
 * Por que centralizar: WhatsApp/IA/LGPD precisam achar arquivo do paciente
 * via 1 query SQL rápida sem chamar Drive. Auditoria preservada via SHA-256.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";
import { TIPOS_DOCUMENTO, type TipoDocumento, gerarNomeArquivo } from "./catalogo";

export interface RegistrarArquivoParams {
  pacienteId: number;
  unidadeId: number;
  tipo: TipoDocumento;
  identificador?: string;
  valor?: number | string;
  codigoSemantico: string;
  nomePaciente: string;
  data?: Date;
  driveFileId: string;
  driveUrl: string;
  driveFolderId?: string;
  mimeType: string;
  tamanhoBytes?: number;
  conteudoParaSha256?: Buffer | string; // se passar, calcula SHA-256
  geradoPorUserId?: number;
  referenciaId?: number;
  referenciaTabela?: string;
  metadataExtra?: Record<string, unknown>;
  origem?: "sistema" | "upload_manual" | "import_legado";
}

export interface ArquivoRegistrado {
  id: number;
  nomeArquivo: string;
  driveFileId: string;
  driveUrl: string;
  sha256: string | null;
}

export async function registrarArquivo(p: RegistrarArquivoParams): Promise<ArquivoRegistrado> {
  const cfg = TIPOS_DOCUMENTO[p.tipo];
  if (!cfg) throw new Error(`[registry] Tipo desconhecido: ${p.tipo}`);

  const nomeArquivo = gerarNomeArquivo({
    tipo: p.tipo,
    data: p.data,
    identificador: p.identificador,
    valor: p.valor,
    codigoSemantico: p.codigoSemantico,
    nomePaciente: p.nomePaciente,
  });

  let sha256: string | null = null;
  if (p.conteudoParaSha256) {
    const hash = crypto.createHash("sha256");
    hash.update(p.conteudoParaSha256);
    sha256 = hash.digest("hex");
  }

  const result = await db.execute(sql`
    INSERT INTO arquivos_paciente (
      paciente_id, unidade_id, tipo_documento, categoria, subcategoria,
      nome_arquivo, drive_file_id, drive_url, drive_folder_id,
      mime_type, tamanho_bytes, sha256,
      gerado_em, gerado_por_user_id,
      referencia_id, referencia_tabela, metadata_extra,
      origem, versao_schema
    ) VALUES (
      ${p.pacienteId}, ${p.unidadeId}, ${p.tipo}, ${cfg.categoria}, ${cfg.subcategoria},
      ${nomeArquivo}, ${p.driveFileId}, ${p.driveUrl}, ${p.driveFolderId ?? null},
      ${p.mimeType}, ${p.tamanhoBytes ?? null}, ${sha256},
      ${p.data ?? new Date()}, ${p.geradoPorUserId ?? null},
      ${p.referenciaId ?? null}, ${p.referenciaTabela ?? null}, ${p.metadataExtra ? JSON.stringify(p.metadataExtra) : null}::jsonb,
      ${p.origem ?? "sistema"}, '040'
    )
    RETURNING id
  `);
  const row = (result as unknown as { rows: Array<{ id: number }> }).rows[0];

  return {
    id: row.id,
    nomeArquivo,
    driveFileId: p.driveFileId,
    driveUrl: p.driveUrl,
    sha256,
  };
}

/**
 * Busca arquivos do paciente filtrando por tipo, categoria, etc.
 * Usado por: bot WhatsApp, IA, painel CEO, exports LGPD.
 */
export interface BuscarArquivosParams {
  pacienteId: number;
  tipo?: TipoDocumento;
  categoria?: string;
  subcategoria?: string;
  desde?: Date;
  ate?: Date;
  incluirArquivados?: boolean;
  limite?: number;
}

export async function buscarArquivos(p: BuscarArquivosParams) {
  const conds: ReturnType<typeof sql>[] = [sql`paciente_id = ${p.pacienteId}`];
  if (p.tipo) conds.push(sql`tipo_documento = ${p.tipo}`);
  if (p.categoria) conds.push(sql`categoria = ${p.categoria}`);
  if (p.subcategoria) conds.push(sql`subcategoria = ${p.subcategoria}`);
  if (p.desde) conds.push(sql`gerado_em >= ${p.desde}`);
  if (p.ate) conds.push(sql`gerado_em <= ${p.ate}`);
  if (!p.incluirArquivados) conds.push(sql`arquivado_em IS NULL`);

  const whereClause = conds.reduce((acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`));
  const limite = p.limite ?? 50;

  const result = await db.execute(sql`
    SELECT id, paciente_id, unidade_id, tipo_documento, categoria, subcategoria,
           nome_arquivo, drive_file_id, drive_url, mime_type, tamanho_bytes, sha256,
           gerado_em, gerado_por_user_id, referencia_id, referencia_tabela, metadata_extra
    FROM arquivos_paciente
    WHERE ${whereClause}
    ORDER BY gerado_em DESC
    LIMIT ${limite}
  `);
  return (result as unknown as { rows: unknown[] }).rows;
}

/**
 * Soft delete (LGPD).
 */
export async function arquivarArquivo(id: number, motivo?: string): Promise<void> {
  await db.execute(sql`
    UPDATE arquivos_paciente
    SET arquivado_em = now(),
        metadata_extra = COALESCE(metadata_extra, '{}'::jsonb) || ${JSON.stringify({ arquivado_motivo: motivo ?? "lgpd" })}::jsonb
    WHERE id = ${id}
  `);
}
