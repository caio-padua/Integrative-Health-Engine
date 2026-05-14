/**
 * Migra exports LGPD antigos (data:URL) pro Drive — Task #260
 *
 * Antes da Task #136, a rota
 * `POST /plataforma/clinicas/:id/exclusao/exportar-lgpd` gravava o JSON
 * do snapshot LGPD diretamente em `unidades.lgpd_export_url` como
 * `data:application/json;base64,...`. O blob continua válido (o executor
 * só checa que a coluna não é nula), mas infla a tabela `unidades` e
 * atrapalha dump/replicação.
 *
 * Este script percorre todas as unidades cuja `lgpd_export_url` começa
 * com `data:`, decodifica o base64, sobe pro Drive via
 * `uploadExportLgpdUnidade()` e atualiza url + sha256 + tamanho_bytes +
 * drive_file_id, registrando uma linha em `auditoria_kill_switch` com
 * ação `EXPORTAR_LGPD` e motivo
 * "migracao data:URL → Drive (Task #136 follow-up)".
 *
 * Idempotente: a query de seleção já filtra por `LIKE 'data:%'`, então
 * re-executar pula linhas que já são http(s).
 *
 * Uso:
 *   pnpm --filter @workspace/scripts run migrar-lgpd-exports-data-url
 *   pnpm --filter @workspace/scripts run migrar-lgpd-exports-data-url -- --dry-run
 */

import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

import { uploadExportLgpdUnidade } from "../../artifacts/api-server/src/lib/arquivos/drive.js";

const MOTIVO = "migracao data:URL → Drive (Task #136 follow-up)";

// Decodifica `data:application/json;base64,XXXX` (ou variantes com utf8 inline).
// Retorna o JSON como string. Lança se o formato não bater.
function decodificarDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;,]+)(;[^,]*)?,(.*)$/s);
  if (!m) throw new Error("data:URL malformada");
  const params = (m[2] ?? "").toLowerCase();
  const payload = m[3] ?? "";
  if (params.includes(";base64")) {
    return Buffer.from(payload, "base64").toString("utf8");
  }
  return decodeURIComponent(payload);
}

interface LinhaUnidade {
  id: number;
  nome: string;
  nick: string | null;
  lgpd_export_url: string;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  console.log("=".repeat(72));
  console.log("MIGRAR EXPORTS LGPD data:URL → Drive — Task #260");
  console.log("=".repeat(72));
  console.log(`Modo: ${dryRun ? "DRY-RUN (nenhuma escrita)" : "EXECUCAO"}`);
  console.log("");

  const r = await db.execute(sql`
    SELECT id, nome, nick, lgpd_export_url
      FROM unidades
     WHERE lgpd_export_url LIKE 'data:%'
     ORDER BY id
  `);
  const candidatas = r.rows as unknown as LinhaUnidade[];

  console.log(`Unidades com lgpd_export_url em data:URL: ${candidatas.length}`);
  for (const u of candidatas) {
    const tamanhoAprox = u.lgpd_export_url.length;
    console.log(`  - [${u.id}] ${u.nome} (~${tamanhoAprox} chars na coluna)`);
  }

  if (candidatas.length === 0) {
    console.log("\nNada a fazer — nenhuma unidade com data:URL pendente.");
    return;
  }

  if (dryRun) {
    console.log(`\n[DRY-RUN] Migraria ${candidatas.length} unidade(s). Nenhuma escrita feita.`);
    return;
  }

  // `auditoria_kill_switch.executado_por_usuario_id` tem FK NOT NULL pra
  // `usuarios(id)` (migration 044). Como o backfill nao tem ator humano,
  // atribui ao platform_owner ativo de menor id (CEO/dono da plataforma).
  const ownerR = await db.execute(sql`
    SELECT id FROM usuarios
     WHERE perfil_plataforma = 'platform_owner' AND ativo = true
     ORDER BY id ASC LIMIT 1
  `);
  const ownerRow = (ownerR.rows?.[0] ?? null) as { id?: number } | null;
  if (!ownerRow?.id) {
    throw new Error(
      "Nenhum usuario platform_owner ativo encontrado — necessario pra atribuir a auditoria do backfill.",
    );
  }
  const executorId = ownerRow.id;
  console.log(`Atribuindo auditoria ao platform_owner ativo id=${executorId}.`);

  let migradas = 0;
  let erros = 0;
  for (const u of candidatas) {
    try {
      const json = decodificarDataUrl(u.lgpd_export_url);

      const upload = await uploadExportLgpdUnidade({
        unidadeId: u.id,
        unidadeNome: u.nome,
        nick: u.nick,
        json,
      });

      await db.transaction(async (tx) => {
        // Re-checa LIKE 'data:%' dentro do UPDATE pra preservar idempotencia
        // mesmo se outra escrita ocorrer entre SELECT e UPDATE.
        await tx.execute(sql`
          UPDATE unidades
             SET lgpd_export_url           = ${upload.driveUrl},
                 lgpd_export_sha256        = ${upload.sha256},
                 lgpd_export_tamanho_bytes = ${upload.tamanhoBytes},
                 lgpd_export_drive_file_id = ${upload.driveFileId}
           WHERE id = ${u.id}
             AND lgpd_export_url LIKE 'data:%'
        `);
        await tx.execute(sql`
          INSERT INTO auditoria_kill_switch
            (acao, unidade_id, executado_por_usuario_id, motivo, ip, user_agent, metadata)
          VALUES
            ('EXPORTAR_LGPD', ${u.id}, ${executorId}, ${MOTIVO}, '', 'script:migrar-lgpd-exports-data-url',
             ${JSON.stringify({
               nome: u.nome,
               tamanho_bytes: upload.tamanhoBytes,
               sha256: upload.sha256,
               drive_file_id: upload.driveFileId,
               drive_url: upload.driveUrl,
               nome_arquivo: upload.nomeArquivo,
               origem: "backfill-data-url",
               task: 260,
               motivo: MOTIVO,
             })}::jsonb)
        `);
      });
      migradas += 1;
      console.log(
        `  ✓ [${u.id}] ${u.nome} → ${upload.driveFileId} (${upload.tamanhoBytes} bytes, sha256=${upload.sha256.slice(0, 12)}…)`,
      );
    } catch (e) {
      erros += 1;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ [${u.id}] ${u.nome} — ${msg}`);
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log("RELATORIO FINAL");
  console.log("=".repeat(72));
  console.log(`Total candidatas: ${candidatas.length}`);
  console.log(`Migradas:         ${migradas}`);
  console.log(`Erros:            ${erros}`);
  console.log("=".repeat(72));

  if (erros > 0) process.exitCode = 1;
}

main()
  .then(async () => {
    await pool.end();
    process.exit(process.exitCode ?? 0);
  })
  .catch(async (err) => {
    console.error("[migrar-lgpd-exports-data-url] ERRO:", err);
    await pool.end();
    process.exit(1);
  });
