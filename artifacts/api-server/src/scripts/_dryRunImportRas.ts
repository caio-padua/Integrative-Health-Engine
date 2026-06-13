import { getAccessToken } from "../lib/google-drive";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const SHEET_ID = "1SoCXulI-Ohb71JdW1Pcsro09-Wam8BCKOJQw9QUlrgs";

function norm(s: unknown): string {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}
function mask(s: unknown): string {
  const t = (s ?? "").toString();
  if (!t) return "(vazio)";
  return t.length <= 4 ? "***" : t.slice(0, 2) + "***" + t.slice(-2);
}

async function main() {
  const token = await getAccessToken();
  const range = encodeURIComponent("TABELA GERAL!A1:FZ999");
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const values = ((await r.json()) as { values?: string[][] }).values ?? [];
  const head0 = values[0] ?? [];
  const dataRows = values.slice(2); // pula 2 linhas de cabecalho

  const BLOCO_INI = 14;
  const BLOCO_TAM = 6;
  const nomesBloco: string[] = [];
  for (let c = BLOCO_INI; c < 182; c += BLOCO_TAM) {
    nomesBloco.push((head0[c] ?? "").toString().trim());
  }

  type Item = { nome: string; sess: string; freq: string; dia: string; mes: string; ano: string };
  type Pac = {
    nome: string; cpf: string; cel: string; email: string;
    nd: string; nm: string; na: string;
    protocolo: string; vTrat: string; vPago: string; vPend: string;
    itens: Item[];
  };
  const pacientes: Pac[] = [];
  for (const row of dataRows) {
    const nome = (row[1] ?? "").toString().trim();
    if (!nome) continue;
    const itens: Item[] = [];
    for (let i = 0; i < nomesBloco.length; i++) {
      const base = BLOCO_INI + i * BLOCO_TAM;
      const sn = (row[base] ?? "").toString().trim().toUpperCase();
      if (sn === "SIM") {
        itens.push({
          nome: nomesBloco[i],
          sess: (row[base + 1] ?? "").toString().trim(),
          freq: (row[base + 2] ?? "").toString().trim(),
          dia: (row[base + 3] ?? "").toString().trim(),
          mes: (row[base + 4] ?? "").toString().trim(),
          ano: (row[base + 5] ?? "").toString().trim(),
        });
      }
    }
    pacientes.push({
      nome,
      cpf: (row[2] ?? "").toString().trim(),
      cel: (row[3] ?? "").toString().trim(),
      email: (row[4] ?? "").toString().trim(),
      nd: (row[5] ?? "").toString().trim(),
      nm: (row[6] ?? "").toString().trim(),
      na: (row[7] ?? "").toString().trim(),
      protocolo: (row[8] ?? "").toString().trim(),
      vTrat: (row[9] ?? "").toString().trim(),
      vPago: (row[10] ?? "").toString().trim(),
      vPend: (row[11] ?? "").toString().trim(),
      itens,
    });
  }

  const total = pacientes.length;
  const comEmail = pacientes.filter((p) => p.email).length;
  const comNasc = pacientes.filter((p) => p.nd && p.nm && p.na).length;
  const cpfFalso = "12345678900";
  const comCpfReal = pacientes.filter((p) => {
    const d = (p.cpf || "").replace(/\D/g, "");
    return d.length === 11 && d !== cpfFalso;
  }).length;
  const comCel = pacientes.filter((p) => p.cel).length;
  const comProtocolo = pacientes.filter((p) => p.protocolo).length;
  const totalItens = pacientes.reduce((a, p) => a + p.itens.length, 0);

  const q15 = await db.execute(sql`SELECT nome FROM pacientes WHERE unidade_id = 15`);
  const setU15 = new Set((q15.rows as Array<{ nome: string }>).map((x) => norm(x.nome)));
  const qAll = await db.execute(sql`SELECT nome FROM pacientes`);
  const setAll = new Set((qAll.rows as Array<{ nome: string }>).map((x) => norm(x.nome)));

  const jaNa15 = pacientes.filter((p) => setU15.has(norm(p.nome))).length;
  const noutra = pacientes.filter((p) => !setU15.has(norm(p.nome)) && setAll.has(norm(p.nome))).length;
  const novos = pacientes.filter((p) => !setAll.has(norm(p.nome))).length;

  console.log("===== DRY-RUN CADASTRO — aba TABELA GERAL =====");
  console.log("Total pacientes na planilha (linhas com nome):", total);
  console.log("  com email:", comEmail);
  console.log("  com data nascimento (dia+mes+ano):", comNasc);
  console.log("  com CPF real (11 digitos, != placeholder):", comCpfReal);
  console.log("  com celular:", comCel);
  console.log("  com protocolo nomeado:", comProtocolo);
  console.log("Total de itens clinicos marcados SIM:", totalItens);
  console.log(`Blocos clinicos detectados (${nomesBloco.length}):`);
  console.log("  " + nomesBloco.join(" | "));
  console.log("\n--- Cruzamento por NOME (normalizado) com o banco ---");
  console.log("  ja existem na unidade 15 (Padua):", jaNa15);
  console.log("  existem em outra unidade (nao 15):", noutra);
  console.log("  totalmente novos (nome inedito no banco):", novos);
  console.log("\n--- AMOSTRA (2 pacientes; CPF/email mascarados) ---");
  for (const p of pacientes.slice(0, 2)) {
    console.log(`\n* ${p.nome}  cpf=${mask(p.cpf)} email=${mask(p.email)} nasc=${p.nd}/${p.nm}/${p.na}`);
    console.log(`  protocolo="${p.protocolo}" trat=${p.vTrat} pago=${p.vPago} pend=${p.vPend}`);
    console.log(`  itens (${p.itens.length}): ` + p.itens.map((i) => `${i.nome}[${i.sess}sess/${i.freq}d @${i.dia}/${i.mes}/${i.ano}]`).join(" ; "));
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
