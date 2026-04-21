/**
 * UNIFICAR as duas pastas PAWARDS no Google Drive do Dr. Caio.
 *
 * Regras:
 *  - DESTINO (mantém): 1_OrE4iyq6dfa9gsK8CpOS0OkJ7TjENaP  (PAWARDS antiga, vasta)
 *  - ORIGEM (esvazia): 1du3bpcmmT5nfYAWh4BA5mjp4o69mRhNa  (PAWARDS nova, minha)
 *  - SISTEMAS CLINICO -> GESTAO CLINICA (renomeia + mescla)
 *  - Tudo MAIUSCULO sem acentos (recursivo)
 *  - Pastas homonimas: MERGE recursivo (move filhos um a um)
 *  - Arquivos homonimos: mantem ambos (renomeia o entrante com sufixo " (DUP)")
 *  - Nada e deletado: pasta de origem vazia recebe sufixo "[VAZIA]" para Caio decidir
 *  - Movimentacao por REPARENTING (reversivel no Drive)
 */
import { getDriveClient } from "../lib/google-drive";

const ANTIGA_ID = "1_OrE4iyq6dfa9gsK8CpOS0OkJ7TjENaP";
const NOVA_ID = "1du3bpcmmT5nfYAWh4BA5mjp4o69mRhNa";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

function escape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

let drive: any;
const stats = {
  pastasMovidas: 0,
  pastasMescladas: 0,
  arquivosMovidos: 0,
  duplicados: 0,
  renomeados: 0,
};

interface Node { id: string; name: string; isFolder: boolean; children?: Node[] }

async function listChildren(parentId: string): Promise<Node[]> {
  const out: Node[] = [];
  let pageToken: string | undefined;
  do {
    const r = await drive.files.list({
      q: `'${parentId}' in parents and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 1000,
      pageToken,
    });
    for (const f of r.data.files || []) {
      out.push({ id: f.id, name: f.name, isFolder: f.mimeType === FOLDER_MIME });
    }
    pageToken = r.data.nextPageToken;
  } while (pageToken);
  return out;
}

async function tree(parentId: string, depth = 0): Promise<Node[]> {
  const kids = await listChildren(parentId);
  for (const k of kids) {
    if (k.isFolder) k.children = await tree(k.id, depth + 1);
  }
  return kids;
}

function printTree(nodes: Node[], indent = "") {
  for (const n of nodes) {
    console.log(`${indent}${n.isFolder ? "📁" : "📄"} ${n.name}  (${n.id})`);
    if (n.children) printTree(n.children, indent + "  ");
  }
}

async function moveItem(itemId: string, fromParent: string, toParent: string) {
  await drive.files.update({
    fileId: itemId,
    addParents: toParent,
    removeParents: fromParent,
    fields: "id, parents",
  });
}

async function renameItem(itemId: string, newName: string) {
  await drive.files.update({
    fileId: itemId,
    requestBody: { name: newName },
    fields: "id, name",
  });
}

/**
 * Mescla `srcId` -> `dstId`. Para cada filho de src:
 *  - Se nome (normalizado) existir em dst e ambos forem pasta -> recursao
 *  - Se nome existir e for arquivo -> reparent + sufixo " (DUP)"
 *  - Senao -> reparent simples
 * Retorna numero de items processados.
 */
async function mergeInto(srcId: string, dstId: string): Promise<number> {
  let count = 0;
  const srcKids = await listChildren(srcId);
  const dstKids = await listChildren(dstId);
  const dstByNorm = new Map<string, Node>();
  for (const d of dstKids) dstByNorm.set(norm(d.name), d);

  for (const s of srcKids) {
    const key = norm(s.name);
    const collision = dstByNorm.get(key);

    if (collision && collision.isFolder && s.isFolder) {
      console.log(`  ↪ MERGE pasta "${s.name}" -> "${collision.name}"`);
      stats.pastasMescladas++;
      count += await mergeInto(s.id, collision.id);
      // src vazio agora — pode ser removido por reparent? Nao; deixa Caio decidir.
      // Vamos move-la pra dst com sufixo " [MESCLADA-VAZIA]" so se ainda tiver filhos.
      const remaining = await listChildren(s.id);
      if (remaining.length === 0) {
        // pasta vazia: move pra lixeira virtual? Vamos so reparent + sufixo
        await renameItem(s.id, `${s.name} [MESCLADA-VAZIA]`);
        await moveItem(s.id, srcId, dstId);
      }
    } else if (collision) {
      const novoNome = s.isFolder ? `${s.name} (DUP)` : `${s.name} (DUP)`;
      console.log(`  ⚠ DUP: "${s.name}" ja existe em destino -> renomeia para "${novoNome}"`);
      await renameItem(s.id, novoNome);
      await moveItem(s.id, srcId, dstId);
      stats.duplicados++;
      count++;
    } else {
      console.log(`  → MOVE "${s.name}" (${s.isFolder ? "pasta" : "arquivo"})`);
      await moveItem(s.id, srcId, dstId);
      if (s.isFolder) stats.pastasMovidas++;
      else stats.arquivosMovidos++;
      count++;
    }
  }
  return count;
}

/** Aplica UPPERCASE + sem acentos recursivo a todos os filhos de `parentId`. */
async function normalizarRecursivo(parentId: string, indent = "  ") {
  const kids = await listChildren(parentId);
  for (const k of kids) {
    const novo = norm(k.name);
    if (novo !== k.name && novo.length > 0) {
      console.log(`${indent}✎ "${k.name}" -> "${novo}"`);
      try {
        await renameItem(k.id, novo);
        stats.renomeados++;
      } catch (e: any) {
        // colisao de nome no mesmo nivel — Drive permite, mas se der erro deixa quieto
        console.log(`${indent}  (skip rename: ${e?.message ?? e})`);
      }
    }
    if (k.isFolder) await normalizarRecursivo(k.id, indent + "  ");
  }
}

async function main() {
  drive = await getDriveClient();

  console.log("\n========== FASE 1: DESCOBERTA ==========");
  const [antigaMeta, novaMeta] = await Promise.all([
    drive.files.get({ fileId: ANTIGA_ID, fields: "id, name, parents" }),
    drive.files.get({ fileId: NOVA_ID,   fields: "id, name, parents" }),
  ]);
  console.log(`ANTIGA (destino): "${antigaMeta.data.name}"  (${ANTIGA_ID})`);
  console.log(`NOVA (origem):    "${novaMeta.data.name}"   (${NOVA_ID})`);

  console.log("\n--- arvore ANTIGA ---");
  printTree(await tree(ANTIGA_ID));
  console.log("\n--- arvore NOVA ---");
  printTree(await tree(NOVA_ID));

  console.log("\n========== FASE 2: MERGE NOVA -> ANTIGA ==========");
  await mergeInto(NOVA_ID, ANTIGA_ID);

  console.log("\n========== FASE 3: SISTEMAS CLINICO -> GESTAO CLINICA ==========");
  // Apos merge, dentro de ANTIGA pode haver SISTEMAS CLINICO E GESTAO CLINICA.
  // Se houver SISTEMAS CLINICO, mescla seu conteudo em GESTAO CLINICA (criando se nao existir).
  const filhosAntiga = await listChildren(ANTIGA_ID);
  const sistemasClinico = filhosAntiga.find(f => f.isFolder && norm(f.name) === "SISTEMAS CLINICO");
  let gestaoClinica = filhosAntiga.find(f => f.isFolder && norm(f.name) === "GESTAO CLINICA");

  if (sistemasClinico) {
    if (!gestaoClinica) {
      // simplesmente renomeia
      console.log(`renomeando "${sistemasClinico.name}" -> "GESTAO CLINICA"`);
      await renameItem(sistemasClinico.id, "GESTAO CLINICA");
      stats.renomeados++;
    } else {
      console.log(`mesclando "${sistemasClinico.name}" -> "${gestaoClinica.name}"`);
      await mergeInto(sistemasClinico.id, gestaoClinica.id);
      const sobra = await listChildren(sistemasClinico.id);
      if (sobra.length === 0) {
        await renameItem(sistemasClinico.id, `${sistemasClinico.name} [MESCLADA-VAZIA]`);
      }
      stats.pastasMescladas++;
    }
  } else {
    console.log("SISTEMAS CLINICO nao encontrado em ANTIGA — nada a renomear.");
  }

  console.log("\n========== FASE 4: MAIUSCULAS SEM ACENTOS ==========");
  // Tambem renomeia a propria PAWARDS antiga e marca a NOVA vazia
  const antigaNovo = norm(antigaMeta.data.name);
  if (antigaNovo !== antigaMeta.data.name) {
    await renameItem(ANTIGA_ID, antigaNovo);
    stats.renomeados++;
    console.log(`✎ pasta-raiz: "${antigaMeta.data.name}" -> "${antigaNovo}"`);
  }
  await normalizarRecursivo(ANTIGA_ID);

  console.log("\n========== FASE 5: MARCA NOVA VAZIA ==========");
  const restoNova = await listChildren(NOVA_ID);
  if (restoNova.length === 0) {
    const tag = "PAWARDS [DUPLICADA-VAZIA-PODE-EXCLUIR]";
    await renameItem(NOVA_ID, tag);
    console.log(`pasta NOVA esta vazia — renomeada para "${tag}" (Caio decide se exclui)`);
  } else {
    console.log(`ATENCAO: pasta NOVA ainda tem ${restoNova.length} item(ns):`);
    for (const r of restoNova) console.log(`  - ${r.name} (${r.id})`);
  }

  console.log("\n========== FASE 6: ARVORE FINAL ==========");
  printTree(await tree(ANTIGA_ID));

  console.log("\n========== STATS ==========");
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nlink: https://drive.google.com/drive/folders/${ANTIGA_ID}`);
  process.exit(0);
}

main().catch(e => { console.error("ERRO:", e); process.exit(1); });
