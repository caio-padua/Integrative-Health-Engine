// Limpa pastas DUPLICADAS dentro da arvore Drive de um paciente.
//
// Causa raiz (Caio 18/mai/2026): catalogo migrou de "01_CADASTRO" pra
// "01 CADASTRO" sem rename no Drive. Estopim de upload (drive.ts) fazia
// match exato pelo nome via Drive API q="name=..." — nao encontrava a
// versao com underscore e CRIAVA uma nova vazia ao lado. Pior: o estopim
// tambem populou recursivamente as duplicatas com sub-estrutura vazia.
//
// Fix preventivo: findFolderByName agora normaliza separadores+case
// (drive.ts:69 normalizarNomePasta).
//
// Este script CURA o estrago: pra cada parent, agrupa folders por nome
// normalizado. Grupos com 2+ → MERGE recursivo do conteudo da MAIS NOVA
// pra MAIS ANTIGA (canonica), depois lixeira na duplicata vazia.
//
// MERGE recursivo:
//  - Pra cada item (folder/arquivo) dentro da duplicata:
//    - Se eh folder e existe folder canonico de mesmo nome normalizado
//      na canonica: recursivo merge(filho, irmao).
//    - Se eh folder e NAO existe irmao: move folder inteira pra canonica.
//    - Se eh arquivo: move pra canonica.
//  - Apos merge, duplicata deve ficar vazia → lixeira.
//
// Atualiza pacientes.drive_subpastas pra apontar pras canonicas reais.
//
// Uso: pnpm --filter @workspace/scripts run limpar-duplicatas-drive-paciente -- <pacienteId>

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const drv = (await import("../../artifacts/api-server/src/lib/arquivos/drive.js" as string)) as {
  normalizarNomePasta: (s: string) => string;
  listarTudoDoParent: (parentId: string) => Promise<Array<{ id: string; name: string; mimeType: string; createdTime: string }>>;
  pastaEstaVazia: (folderId: string) => Promise<boolean>;
  moverPastaPraLixeira: (folderId: string) => Promise<void>;
  moverItemParaPasta: (itemId: string, novoParentId: string, antigoParentId: string) => Promise<void>;
  MIME_FOLDER: string;
};

interface Estat {
  duplicatasRemovidas: number;
  itensMovidos: number;
  duplicatasComRestoNaoVazio: string[];
  canonicas: Record<string, string>;
}

async function mergePastas(dupId: string, canonicaId: string, prefixoLog: string, estat: Estat): Promise<void> {
  const filhos = await drv.listarTudoDoParent(dupId);
  const filhosCanonica = await drv.listarTudoDoParent(canonicaId);
  const indexCanonicaPorNome = new Map<string, { id: string; mimeType: string }>();
  for (const f of filhosCanonica) {
    indexCanonicaPorNome.set(drv.normalizarNomePasta(f.name), { id: f.id, mimeType: f.mimeType });
  }

  for (const filho of filhos) {
    const ehFolder = filho.mimeType === drv.MIME_FOLDER;
    const irmao = indexCanonicaPorNome.get(drv.normalizarNomePasta(filho.name));

    if (ehFolder && irmao && irmao.mimeType === drv.MIME_FOLDER) {
      console.log(`${prefixoLog}  merge subpasta "${filho.name}" → canonica ${irmao.id}`);
      await mergePastas(filho.id, irmao.id, prefixoLog + "  ", estat);
      // apos merge, se filho ficou vazio, lixeira
      const vazia = await drv.pastaEstaVazia(filho.id);
      if (vazia) {
        await drv.moverPastaPraLixeira(filho.id);
        console.log(`${prefixoLog}  -> LIXEIRA subpasta vazia "${filho.name}" (${filho.id})`);
        estat.duplicatasRemovidas++;
      }
    } else {
      // sem conflito: move o item inteiro pra canonica
      await drv.moverItemParaPasta(filho.id, canonicaId, dupId);
      const tipo = ehFolder ? "folder" : "arquivo";
      console.log(`${prefixoLog}  → MOVIDO ${tipo} "${filho.name}" pra canonica`);
      estat.itensMovidos++;
    }
  }
}

async function limpar(parentId: string, prefixoLog: string, estat: Estat, chaveAcum: string): Promise<void> {
  const folders = (await drv.listarTudoDoParent(parentId)).filter((f) => f.mimeType === drv.MIME_FOLDER);
  const grupos = new Map<string, Array<{ id: string; name: string; createdTime: string }>>();
  for (const f of folders) {
    const k = drv.normalizarNomePasta(f.name);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push({ id: f.id, name: f.name, createdTime: f.createdTime });
  }

  for (const [, lista] of grupos) {
    lista.sort((a, b) => (a.createdTime || "").localeCompare(b.createdTime || ""));
    const canonica = lista[0]!;
    const chaveFilha = chaveAcum ? `${chaveAcum}/${canonica.name}` : canonica.name;
    estat.canonicas[chaveFilha] = canonica.id;

    if (lista.length > 1) {
      console.log(`${prefixoLog}GRUPO "${canonica.name}" (${lista.length} variantes): canonica=${canonica.id} (${canonica.createdTime})`);
      for (let i = 1; i < lista.length; i++) {
        const dup = lista[i]!;
        console.log(`${prefixoLog}  merge dup "${dup.name}" (${dup.id}) → canonica ${canonica.id}`);
        await mergePastas(dup.id, canonica.id, prefixoLog + "  ", estat);
        const vazia = await drv.pastaEstaVazia(dup.id);
        if (vazia) {
          await drv.moverPastaPraLixeira(dup.id);
          console.log(`${prefixoLog}  -> LIXEIRA "${dup.name}" (${dup.id})`);
          estat.duplicatasRemovidas++;
        } else {
          console.log(`${prefixoLog}  !! "${dup.name}" (${dup.id}) ainda nao vazia apos merge — mantida pra inspecao`);
          estat.duplicatasComRestoNaoVazio.push(`${dup.name} (${dup.id})`);
        }
      }
    }

    // recursivo na canonica (pode ter duplicatas dentro tbm)
    await limpar(canonica.id, prefixoLog + "  ", estat, chaveFilha);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const pacienteId = Number(args[0]);
  if (!Number.isFinite(pacienteId)) {
    console.error("Uso: pnpm ... limpar-duplicatas-drive-paciente -- <pacienteId>");
    process.exit(1);
  }

  const r = (await db.execute(sql`
    SELECT id, nome, google_drive_folder_id FROM pacientes WHERE id = ${pacienteId}
  `)) as unknown as { rows: Array<{ id: number; nome: string; google_drive_folder_id: string | null }> };
  const pac = r.rows[0];
  if (!pac) { console.error(`paciente ${pacienteId} nao encontrado`); process.exit(1); }
  if (!pac.google_drive_folder_id) { console.error(`paciente ${pacienteId} sem google_drive_folder_id`); process.exit(1); }

  console.log(`[limpar-duplicatas] paciente ${pac.id} ${pac.nome}`);
  console.log(`  raiz: ${pac.google_drive_folder_id}\n`);

  const estat: Estat = { duplicatasRemovidas: 0, itensMovidos: 0, duplicatasComRestoNaoVazio: [], canonicas: {} };
  await limpar(pac.google_drive_folder_id, "", estat, "");

  console.log(`\n=== RESULTADO ===`);
  console.log(`  itens movidos pra canonica:           ${estat.itensMovidos}`);
  console.log(`  duplicatas movidas pra lixeira:       ${estat.duplicatasRemovidas}`);
  console.log(`  duplicatas com resto nao vazio:       ${estat.duplicatasComRestoNaoVazio.length}`);
  for (const c of estat.duplicatasComRestoNaoVazio) console.log(`    - ${c}`);

  console.log(`\n  atualizando cache pacientes.drive_subpastas com ${Object.keys(estat.canonicas).length} canonicas...`);
  await db.execute(sql`
    UPDATE pacientes SET drive_subpastas = ${JSON.stringify(estat.canonicas)}::jsonb WHERE id = ${pac.id}
  `);
  console.log(`  cache atualizado.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
