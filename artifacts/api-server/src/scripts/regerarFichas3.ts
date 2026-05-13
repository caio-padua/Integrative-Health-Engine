/**
 * Regenera as 3 fichas dos pacientes demo com a versão v2 visual fixada
 * (cores no cabeçalho + abas CADASTRO/LEGENDAS + tudo MAIUSCULO sem acento).
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { criarFichaCadastralPaciente, type PacienteFicha } from "../lib/sheets/fichaCadastralPaciente";

async function main() {
  const rows = await db.execute<any>(sql`
    SELECT id, status_ativo, nome, nome_social, cpf, rg, data_nascimento,
           genero, estado_civil, escolaridade, telefone, whatsapp, telefone_fixo,
           email, instagram, cep, endereco, numero_endereco, complemento, bairro,
           cidade, estado, profissao, plano_saude, numero_plano, nome_mae,
           nome_pai, nome_conjuge, profissional_responsavel, como_nos_conheceu,
           observacoes, criado_em, atualizado_em, drive_subpastas
      FROM pacientes
     WHERE id IN (3114, 3115, 3116)
     ORDER BY id
  `);

  for (const p of rows.rows as any[]) {
    const subs = (p.drive_subpastas ?? {}) as Record<string, string>;
    const dadosPessoaisId = subs["01 CADASTRO/DADOS PESSOAIS"];
    if (!dadosPessoaisId) {
      console.log(`✗ paciente ${p.id} sem subpasta DADOS PESSOAIS, pulando`);
      continue;
    }
    const fileName = `${(p.nome ?? "").toUpperCase()} - FICHA CADASTRAL`.replace(/\s+/g, " ").trim();
    console.log(`\n=== Regerando ficha ${p.id} ${p.nome} ===`);
    const t0 = Date.now();
    const r = await criarFichaCadastralPaciente({
      paciente: p as PacienteFicha,
      dadosPessoaisFolderId: dadosPessoaisId,
      fileName,
      forceRecreate: true,
    });
    await db.execute(sql`
      UPDATE pacientes
         SET ficha_cadastral_sheet_id = ${r.spreadsheetId},
             ficha_cadastral_sheet_url = ${r.spreadsheetUrl}
       WHERE id = ${p.id}
    `);
    console.log(`  novo id: ${r.spreadsheetId}`);
    console.log(`  url:     ${r.spreadsheetUrl}`);
    console.log(`  tempo:   ${((Date.now()-t0)/1000).toFixed(1)}s`);
  }
  console.log("\n[OK] 3 fichas regeradas com v2 visual");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
