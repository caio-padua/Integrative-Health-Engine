/**
 * Hook fire-and-forget para provisionar Drive completo do paciente.
 *
 * Wave Cadastro Pádua — 13/mai/2026 (Caio madrugada — REGRA DO SISTEMA)
 *
 * Decisão Caio: ao criar um paciente NOVO ou ao gerar o 1º arquivo dele,
 * o sistema cria EAGER toda a árvore de pastas (raiz + 7 categorias macro
 * + ~22 subpastas + sub-subs) E gera a planilha "FICHA CADASTRAL" em
 * 01 CADASTRO/DADOS PESSOAIS/.
 *
 * Idempotente: re-roda sem duplicar.
 * Não-bloqueante: roda fire-and-forget — paciente continua cadastrado se Drive falhar.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { criarArvoreCompletaPaciente, getOrCreatePacienteRootFolder } from "../arquivos/drive";
import {
  criarFichaCadastralPaciente,
  type PacienteFicha,
} from "../sheets/fichaCadastralPaciente";

export interface AutoProvisionParams {
  id: number;
  nome: string;
  codigoSemantico: string;
  unidadeId: number;
  cpf?: string | null;
  jaProvisionado?: boolean;
}

/**
 * Provisiona Drive completo (árvore + ficha) em background. Não-bloqueante.
 */
export function autoProvisionDriveAsync(p: AutoProvisionParams): void {
  if (p.jaProvisionado) return;
  void provisionarDriveCompleto(p).catch((e) => {
    console.error(`[autoProvisionDrive] Falha paciente ${p.id}:`, (e as Error).message);
  });
}

/**
 * Provisiona Drive completo de forma SÍNCRONA (use em scripts e demos onde
 * você quer aguardar o resultado).
 *
 * Faz:
 *  1. Cria pasta-raiz do paciente (NOME + CPF)
 *  2. Cria árvore completa de pastas (~30 nodes)
 *  3. Carrega dados completos do paciente do DB
 *  4. Cria/atualiza FICHA CADASTRAL (Sheets) em 01 CADASTRO/DADOS PESSOAIS/
 *  5. Persiste ficha_cadastral_sheet_id/url no paciente
 */
export async function provisionarDriveCompleto(p: AutoProvisionParams): Promise<{
  rootId: string;
  pastasCriadas: number;
  fichaSpreadsheetId: string;
  fichaUrl: string;
  fichaJaExistia: boolean;
}> {
  // 1+2. raiz + árvore completa
  const { rootId, pastasCriadas, cache } = await criarArvoreCompletaPaciente({
    id: p.id,
    nome: p.nome,
    codigoSemantico: p.codigoSemantico,
    unidadeId: p.unidadeId,
    cpf: p.cpf,
  });

  // 3. dados completos do paciente
  const row = (await db.execute(sql`
    SELECT id, status_ativo, nome, nome_social, cpf, rg, data_nascimento, genero, estado_civil, escolaridade,
           telefone, whatsapp, telefone_fixo, email, instagram,
           cep, endereco, numero_endereco, complemento, bairro, cidade, estado,
           profissao, plano_saude, numero_plano,
           nome_mae, nome_pai, nome_conjuge,
           profissional_responsavel, como_nos_conheceu, observacoes,
           criado_em, atualizado_em
    FROM pacientes WHERE id = ${p.id}
  `)) as unknown as { rows: PacienteFicha[] };
  const paciente = row.rows[0];
  if (!paciente) throw new Error(`[autoProvisionDrive] paciente ${p.id} não encontrado`);

  // 4. ficha cadastral (Sheet) na subpasta DADOS PESSOAIS
  const dadosPessoaisFolderId = cache["01 CADASTRO/DADOS PESSOAIS"];
  if (!dadosPessoaisFolderId) {
    throw new Error(`[autoProvisionDrive] Subpasta DADOS PESSOAIS não foi criada — checar SUBCATEGORIAS`);
  }

  const nomeLimpo = p.nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const fileName = `${nomeLimpo} - FICHA CADASTRAL`;

  const ficha = await criarFichaCadastralPaciente({
    paciente,
    dadosPessoaisFolderId,
    fileName,
  });

  // 5. persiste IDs da ficha
  await db.execute(sql`
    UPDATE pacientes
    SET ficha_cadastral_sheet_id = ${ficha.spreadsheetId},
        ficha_cadastral_sheet_url = ${ficha.spreadsheetUrl}
    WHERE id = ${p.id}
  `);

  return {
    rootId,
    pastasCriadas,
    fichaSpreadsheetId: ficha.spreadsheetId,
    fichaUrl: ficha.spreadsheetUrl,
    fichaJaExistia: ficha.jaExistia,
  };
}
