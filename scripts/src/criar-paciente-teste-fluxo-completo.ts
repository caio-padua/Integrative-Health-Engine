/**
 * Fluxo end-to-end pra "ligar o motor":
 * 1. Cria paciente teste na unidade Pádua (id=15)
 * 2. Cria anamnese com sintomas ricos (queixas + sintomas + doenças + preferências)
 * 3. Dispara o motor clínico (POST /api/anamnese/:id/ativar-motor)
 * 4. Lê sugestões geradas (sugestoes_clinicas)
 * 5. Imprime relatório legível pro Caio
 *
 * Uso:  pnpm --filter @workspace/scripts exec tsx src/criar-paciente-teste-fluxo-completo.ts
 */
import { pool } from "@workspace/db";

const ADMIN_TOKEN = process.env["ADMIN_TOKEN"];
const API_BASE = "http://localhost:80/api";

if (!ADMIN_TOKEN) throw new Error("ADMIN_TOKEN ausente");

const UNIDADE_ID_PADUA = 15;
const TIMESTAMP = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN!,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function main() {
  const pg = await pool.connect();

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  LIGANDO O MOTOR — Fluxo Paciente → Anamnese → Sugestões");
  console.log("══════════════════════════════════════════════════════════\n");

  // ── 1. Cria paciente teste via SQL direto ───────────────────────────────
  const nomeTeste = `PACIENTE TESTE MOTOR ${TIMESTAMP}`;
  const insertPaciente = await pg.query(
    `INSERT INTO pacientes (
       nome, cpf, telefone, whatsapp, email, unidade_id, genero,
       data_nascimento, codigo_externo, is_teste,
       alergias, condicoes_clinicas, medicamentos_continuos
     ) VALUES (
       $1, $2, $3, $3, $4, $5, $6, $7, $8, true,
       'Nenhuma alergia conhecida',
       'Hipotireoidismo subclínico, fadiga crônica',
       'Levotiroxina 50mcg/dia'
     ) RETURNING id, nome, codigo_semantico`,
    [
      nomeTeste,
      `999.888.777-${String(Math.floor(Math.random() * 90) + 10)}`,
      "+5511987654321",
      "ceo+teste-motor@pawards.com.br",
      UNIDADE_ID_PADUA,
      "feminino",
      "1980-05-15",
      `TESTE-MOTOR-${TIMESTAMP}`,
    ]
  );
  const paciente = insertPaciente.rows[0];
  console.log(`✅ Paciente criado:  id=${paciente.id}  nome="${paciente.nome}"`);
  console.log(`   código semântico: ${paciente.codigo_semantico ?? "(será calculado pelo trigger)"}\n`);

  // ── 2. Cria anamnese com sinais ricos ───────────────────────────────────
  const respostasClincias = {
    Q010: "Cansaço extremo, queda de cabelo intensa e dificuldade pra perder peso há 6 meses",
    Q011: "Início insidioso, piorou nos últimos 3 meses",
    Q012: ["FADIGA", "QUEDA DE CABELO", "INSÔNIA", "ANSIEDADE", "GANHO DE PESO", "CONSTIPAÇÃO"],
    Q013: ["HIPOTIREOIDISMO", "RESISTÊNCIA À INSULINA"],
    Q014: ["DIABETES TIPO 2", "DOENÇA TIREOIDIANA"],
    Q015: "Já tomou Levotiroxina, sem melhora plena",
  };
  const respostasPreferencias = {
    Q030: "NAO",
    Q031: "SIM",
    Q032: "SIM",
    Q033: "SIM",
  };
  const respostasFinanceiras = {
    Q041: "PREMIUM",
    Q042: "À vista",
  };

  const insertAnamnese = await pg.query(
    `INSERT INTO anamneses (paciente_id, status, respostas_clincias, respostas_preferencias, respostas_financeiras)
     VALUES ($1, 'pendente', $2::jsonb, $3::jsonb, $4::jsonb)
     RETURNING id`,
    [paciente.id, JSON.stringify(respostasClincias), JSON.stringify(respostasPreferencias), JSON.stringify(respostasFinanceiras)]
  );
  const anamneseId = insertAnamnese.rows[0].id;
  console.log(`✅ Anamnese criada:  id=${anamneseId}`);
  console.log(`   queixa principal: "${respostasClincias.Q010}"`);
  console.log(`   sintomas: ${respostasClincias.Q012.join(", ")}`);
  console.log(`   doenças: ${respostasClincias.Q013.join(", ")}`);
  console.log(`   perfil: ${respostasFinanceiras.Q041}\n`);

  // ── 3. Dispara o motor clínico via HTTP ─────────────────────────────────
  console.log("🔥 Disparando motor clínico (POST /anamnese/:id/ativar-motor)...");
  const motorResp = await api("POST", `/anamnese/${anamneseId}/ativar-motor`);
  console.log(`   HTTP status: ${motorResp.status}`);
  if (motorResp.status >= 400) {
    console.error("   ❌ Resposta:", JSON.stringify(motorResp.data, null, 2).slice(0, 500));
    throw new Error("Motor falhou");
  }
  const motorData = motorResp.data as { sinaisDetectados?: string[]; sugestoes?: unknown[]; total?: number };
  console.log(`   ✅ Motor processou OK`);
  console.log(`   sinais detectados: ${motorData.sinaisDetectados?.join(", ") ?? "(?)"}\n`);

  // ── 4. Lê sugestões geradas via SQL ─────────────────────────────────────
  const sugestoes = await pg.query(
    `SELECT s.id, s.tipo, s.item_nome, s.justificativa, s.prioridade, s.status,
            it.categoria, it.codigo_padcom AS codigo_referencia
     FROM sugestoes_clinicas s
     LEFT JOIN itens_terapeuticos it ON it.id = s.item_terapeutico_id
     WHERE s.anamnese_id = $1
     ORDER BY
       CASE s.prioridade WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
       s.tipo, s.item_nome`,
    [anamneseId]
  );

  console.log("══════════════════════════════════════════════════════════");
  console.log(`  SUGESTÕES GERADAS PELO MOTOR — ${sugestoes.rows.length} item(ns)`);
  console.log("══════════════════════════════════════════════════════════\n");

  if (sugestoes.rows.length === 0) {
    console.log("   ⚠️  ZERO sugestões geradas. Verificar:");
    console.log("       - regras_motor têm palavras-chave matching com os sinais?");
    console.log(`       - sinais usados: ${motorData.sinaisDetectados?.join(", ") ?? "?"}`);
  } else {
    const porTipo = sugestoes.rows.reduce((acc: Record<string, typeof sugestoes.rows>, s) => {
      (acc[s.tipo] ??= []).push(s);
      return acc;
    }, {});
    for (const [tipo, items] of Object.entries(porTipo)) {
      console.log(`\n📋 ${tipo.toUpperCase()} (${items.length}):`);
      for (const s of items) {
        const prio = s.prioridade === "alta" ? "🔴" : s.prioridade === "media" ? "🟡" : "🟢";
        console.log(`   ${prio} [${s.codigo_referencia ?? "—"}] ${s.item_nome}`);
        if (s.justificativa) console.log(`        💬 ${s.justificativa}`);
      }
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  PRÓXIMO PASSO PRO CAIO");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`\n  1. Abrir: $REPLIT_DEV_DOMAIN/pacientes/${paciente.id}`);
  console.log(`  2. Ir pra aba "Sugestões do Motor" (anamnese ${anamneseId})`);
  console.log(`  3. Validar cada sugestão (botão verde) ou rejeitar`);
  console.log(`  4. Após validar, montar prescrição → dispará-la pra farmácia\n`);

  await pg.end();
}

main().catch((err) => {
  console.error("\n❌ ERRO:", err.message);
  if (err.stack) console.error(err.stack.split("\n").slice(0, 5).join("\n"));
  process.exit(1);
});
