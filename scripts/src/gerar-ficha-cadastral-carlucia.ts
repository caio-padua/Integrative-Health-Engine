// Gera a Ficha Cadastral oficial da Carlucia (Google Sheets 3 abas:
// CADASTRO 33 col / RESUMO CLINICO / LEGENDAS) usando a funcao oficial
// criarFichaCadastralPaciente() de lib/sheets/fichaCadastralPaciente.ts.
// Arquivo cai em 01 CADASTRO/DADOS PESSOAIS (cache drive_subpastas).

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const ficha = (await import(
  "../../artifacts/api-server/src/lib/sheets/fichaCadastralPaciente.js" as string
)) as {
  criarFichaCadastralPaciente: (opts: {
    paciente: Record<string, unknown>;
    dadosPessoaisFolderId: string;
    fileName: string;
    forceRecreate?: boolean;
    dadosClinicos?: Record<string, unknown>;
  }) => Promise<{ spreadsheetId: string; spreadsheetUrl: string; jaExistia: boolean }>;
};

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

async function main(): Promise<void> {
  const r = (await db.execute(sql`
    SELECT id, codigo_semantico, status_ativo, nome, nome_social, cpf, rg,
           data_nascimento, genero, estado_civil, escolaridade,
           telefone, whatsapp, telefone_fixo, email, instagram,
           cep, endereco, numero_endereco, complemento, bairro, cidade, estado,
           profissao, plano_saude, numero_plano,
           nome_mae, nome_pai, nome_conjuge,
           profissional_responsavel, como_nos_conheceu, observacoes,
           criado_em, atualizado_em, drive_subpastas
    FROM pacientes WHERE id=3497
  `)) as unknown as { rows: Array<Record<string, unknown>> };

  const p = r.rows[0];
  if (!p) throw new Error("Carlucia (id=3497) nao encontrada");

  const subpastas = (p.drive_subpastas ?? {}) as Record<string, string>;
  const dadosPessoaisFolderId = subpastas["01 CADASTRO/DADOS PESSOAIS"];
  if (!dadosPessoaisFolderId) {
    throw new Error("Pasta '01 CADASTRO/DADOS PESSOAIS' nao provisionada. Rode antes: pnpm --filter @workspace/scripts run provisionar-arvore-drive-carlucia");
  }
  delete (p as Record<string, unknown>).drive_subpastas;

  const fileName = `FICHA CADASTRAL ${semAcento(p.nome as string)} ${(p.codigo_semantico as string) ?? ""}`.trim();

  console.log(`[1/3] Buscando dados clinicos reais do DB (sem inventar)...`);
  const patR = (await db.execute(sql`
    SELECT pat.nome, pat.cid10, pp.status, pp.intensidade
    FROM pacientes_patologias pp
    JOIN patologias pat ON pat.id = pp.patologia_id
    WHERE pp.paciente_id = ${p.id}
    LIMIT 20
  `).catch(() => ({ rows: [] as Array<Record<string, unknown>> }))) as unknown as { rows: Array<{ nome: string; cid10: string | null; status: string | null; intensidade: string | null }> };

  const exR = (await db.execute(sql`
    SELECT nome, data_coleta AS data, resultado
    FROM exames_resultado
    WHERE paciente_id = ${p.id}
    ORDER BY data_coleta DESC NULLS LAST
    LIMIT 5
  `).catch(() => ({ rows: [] as Array<Record<string, unknown>> }))) as unknown as { rows: Array<{ nome: string; data: string | null; resultado: string | null }> };

  const recR = (await db.execute(sql`
    SELECT numero_receita AS numero, emitida_em, status, valor_total AS valor
    FROM revo_receitas
    WHERE paciente_id = ${p.id}
    ORDER BY emitida_em DESC NULLS LAST
    LIMIT 5
  `).catch(() => ({ rows: [] as Array<Record<string, unknown>> }))) as unknown as { rows: Array<{ numero: string; emitida_em: string | null; status: string | null; valor: number | null }> };

  const anR = (await db.execute(sql`
    SELECT criado_em, status, sinais_semanticos
    FROM anamneses
    WHERE paciente_id = ${p.id}
    ORDER BY criado_em DESC NULLS LAST
    LIMIT 1
  `).catch(() => ({ rows: [] as Array<Record<string, unknown>> }))) as unknown as { rows: Array<{ criado_em: string | null; status: string | null; sinais_semanticos: string[] | null }> };

  const dadosClinicos = {
    patologias: patR.rows,
    examesRecentes: exR.rows,
    receitasAtivas: recR.rows.map((r) => ({
      numero: r.numero,
      emitidaEm: r.emitida_em,
      status: r.status,
      valor: r.valor != null ? Number(r.valor) : null,
    })),
    ultimaAnamnese: anR.rows[0]
      ? { criadoEm: anR.rows[0].criado_em, status: anR.rows[0].status, sinaisSemanticos: anR.rows[0].sinais_semanticos }
      : null,
  };

  console.log(`  Patologias: ${dadosClinicos.patologias.length} | Exames: ${dadosClinicos.examesRecentes.length} | Receitas: ${dadosClinicos.receitasAtivas.length} | Anamnese: ${dadosClinicos.ultimaAnamnese ? "1" : "0"}`);

  console.log(`[2/3] Criando Google Sheets em DADOS PESSOAIS...`);
  console.log(`  Pasta destino: https://drive.google.com/drive/folders/${dadosPessoaisFolderId}`);
  console.log(`  Nome do arquivo: ${fileName}`);

  const out = await ficha.criarFichaCadastralPaciente({
    paciente: p,
    dadosPessoaisFolderId,
    fileName,
    forceRecreate: true,
    dadosClinicos,
  });

  console.log(`[3/3] Concluido.`);
  console.log(`  spreadsheetId: ${out.spreadsheetId}`);
  console.log(`  URL: ${out.spreadsheetUrl}`);
  console.log(`  jaExistia: ${out.jaExistia}`);
  process.exit(0);
}

main().catch((err) => { console.error("[ERRO]", err); process.exit(1); });
