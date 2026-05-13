/**
 * Regenera as 3 fichas dos pacientes demo com a versão v2.1 visual fixada
 * (cores no cabeçalho + 3 abas CADASTRO/RESUMO CLINICO/LEGENDAS + tudo MAIUSCULO sem acento).
 *
 * v2.1 (13/mai noite — joiazinha TDAH): puxa dados clínicos reais do DB
 * (patologias, exames recentes, receitas ativas, última anamnese) e popula
 * a 3ª aba RESUMO CLINICO. Sem dados = placeholder "AGUARDANDO PRIMEIRA CONSULTA".
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { criarFichaCadastralPaciente, type PacienteFicha, type DadosClinicos } from "../lib/sheets/fichaCadastralPaciente";

async function carregarDadosClinicos(pacienteId: number): Promise<DadosClinicos> {
  // Patologias (revo_patologias)
  const pats = await db.execute<any>(sql`
    SELECT nome, cid10, status_semaforo AS status, intensidade_atual AS intensidade
      FROM revo_patologias
     WHERE paciente_id = ${pacienteId}
     ORDER BY id DESC
     LIMIT 10
  `);
  // Exames recentes (pedidos_exame join exames_base)
  const exs = await db.execute<any>(sql`
    SELECT eb.nome_exame AS nome, pe.criado_em AS data, pe.status AS resultado
      FROM pedidos_exame pe
      LEFT JOIN exames_base eb ON eb.id = pe.exame_base_id
     WHERE pe.paciente_id = ${pacienteId}
     ORDER BY pe.criado_em DESC
     LIMIT 10
  `).catch(() => ({ rows: [] as any[] }));
  // Receitas ativas (parmavault_receitas)
  const recs = await db.execute<any>(sql`
    SELECT numero_receita AS numero, emitida_em AS emitida_em, status, valor_formula_estimado AS valor
      FROM parmavault_receitas
     WHERE paciente_id = ${pacienteId}
       AND status NOT IN ('cancelada','expirada')
     ORDER BY emitida_em DESC
     LIMIT 10
  `);
  // Última anamnese
  const ans = await db.execute<any>(sql`
    SELECT criado_em, status, sinais_semanticos
      FROM anamneses
     WHERE paciente_id = ${pacienteId}
     ORDER BY criado_em DESC
     LIMIT 1
  `);
  const a = (ans.rows as any[])[0];
  return {
    patologias: (pats.rows as any[]).map((r) => ({ nome: r.nome, cid10: r.cid10, status: r.status, intensidade: r.intensidade })),
    examesRecentes: (exs.rows as any[]).map((r) => ({ nome: r.nome ?? "EXAME", data: r.data, resultado: r.resultado })),
    receitasAtivas: (recs.rows as any[]).map((r) => ({ numero: r.numero, emitidaEm: r.emitida_em, status: r.status, valor: r.valor != null ? Number(r.valor) : null })),
    ultimaAnamnese: a ? { criadoEm: a.criado_em, status: a.status, sinaisSemanticos: a.sinais_semanticos ?? [] } : null,
  };
}

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
    const dadosClinicos = await carregarDadosClinicos(p.id);
    console.log(`  clinical: ${dadosClinicos.patologias?.length ?? 0} pat / ${dadosClinicos.examesRecentes?.length ?? 0} ex / ${dadosClinicos.receitasAtivas?.length ?? 0} rec / anamnese=${dadosClinicos.ultimaAnamnese ? "sim" : "não"}`);
    const r = await criarFichaCadastralPaciente({
      paciente: p as PacienteFicha,
      dadosPessoaisFolderId: dadosPessoaisId,
      fileName,
      forceRecreate: true,
      dadosClinicos,
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
  console.log("\n[OK] 3 fichas regeradas com v2.1 visual + RESUMO CLINICO");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
