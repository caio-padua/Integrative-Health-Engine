import { Router } from "express";
import { db, pacientesTable, unidadesTable } from "@workspace/db";
import { eq, ilike, like, or, and, sql, type SQL } from "drizzle-orm";
import { CriarPacienteBody } from "@workspace/api-zod";
import { autoProvisionDriveAsync } from "../lib/pacientes/autoProvisionDrive";

const router = Router();

// Task #98 — whitelist + fragmentos `ORDER BY` por coluna pra ordenacao
// multi-coluna server-side. Mesmo padrao da timeline de assinaturas
// (ver routes/assinaturas.ts ORDENACOES_TIMELINE_FRAGMENT). Cada fragmento
// referencia a coluna tipada do schema Drizzle (`pacientesTable.nome` etc)
// pra zero acoplamento com nomes crus de banco — se o schema mover/renomear
// uma coluna, o typecheck quebra aqui antes do deploy.
//
// `id DESC` final NUNCA vem deste mapa — e sempre adicionado por
// `montarOrderBy()` como tiebreaker estavel pra paginacao manter ordem
// mesmo quando 2 linhas empatam em todos os criterios solicitados.
const ORDENACOES_PACIENTES_FRAGMENT: Record<string, SQL> = {
  nome_desc:     sql`${pacientesTable.nome} DESC NULLS LAST`,
  nome_asc:      sql`${pacientesTable.nome} ASC NULLS LAST`,
  cpf_desc:      sql`${pacientesTable.cpf} DESC NULLS LAST`,
  cpf_asc:       sql`${pacientesTable.cpf} ASC NULLS LAST`,
  telefone_desc: sql`${pacientesTable.telefone} DESC NULLS LAST`,
  telefone_asc:  sql`${pacientesTable.telefone} ASC NULLS LAST`,
  status_desc:   sql`${pacientesTable.statusAtivo} DESC`,
  status_asc:    sql`${pacientesTable.statusAtivo} ASC`,
  criado_desc:   sql`${pacientesTable.criadoEm} DESC NULLS LAST`,
  criado_asc:    sql`${pacientesTable.criadoEm} ASC NULLS LAST`,
};
const MAX_ORDENACOES_PACIENTES = 4;
function parseTokensOrdenacaoPacientes(raw: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const bruto of raw.split(",")) {
    const t = bruto.trim();
    if (!ORDENACOES_PACIENTES_FRAGMENT[t]) continue;
    // Dedupe por coluna (nome_asc e nome_desc nao podem coexistir).
    const colKey = t.replace(/_(desc|asc)$/, "");
    if (seen.has(colKey)) continue;
    seen.add(colKey);
    out.push(t);
    if (out.length >= MAX_ORDENACOES_PACIENTES) break;
  }
  return out;
}
function montarOrderByPacientes(tokens: string[]): SQL[] {
  const fragments = tokens.map((t) => ORDENACOES_PACIENTES_FRAGMENT[t]!);
  // Tiebreaker estavel sempre por ultimo (mesmo padrao da timeline).
  fragments.push(sql`${pacientesTable.id} DESC`);
  return fragments;
}

router.get("/pacientes", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;
  const busca = req.query.busca as string | undefined;
  const ordenarPorRaw = typeof req.query["ordenarPor"] === "string"
    ? (req.query["ordenarPor"] as string).toLowerCase()
    : "";
  const tokens = parseTokensOrdenacaoPacientes(ordenarPorRaw);
  const orderByFragments = montarOrderByPacientes(tokens);

  // Filtros tipados via operadores Drizzle (eq, ilike, like, or, and).
  // Nada de SQL cru aqui — o ORDER BY dinamico e o unico ponto que usa
  // sql template fragments, e mesmo assim so valores ja whitelisted.
  const condicoes: SQL[] = [];
  if (unidadeId !== undefined && Number.isFinite(unidadeId)) {
    condicoes.push(eq(pacientesTable.unidadeId, unidadeId));
  }
  if (busca && busca.trim() !== "") {
    const padrao = `%${busca.toLowerCase()}%`;
    const buscaCondicoes: SQL[] = [
      ilike(pacientesTable.nome, padrao),
    ];
    const padraoDigitos = busca.replace(/\D/g, "");
    if (padraoDigitos !== "") {
      const padraoDigitosLike = `%${padraoDigitos}%`;
      buscaCondicoes.push(like(pacientesTable.cpf, padraoDigitosLike));
      buscaCondicoes.push(like(pacientesTable.telefone, padraoDigitosLike));
    }
    const orBusca = or(...buscaCondicoes);
    if (orBusca) condicoes.push(orBusca);
  }

  // `pacientes` aqui e tipado como `Paciente[]` pelo Drizzle —
  // sem any cast, sem mapping manual, contrato preservado.
  const pacientes = condicoes.length > 0
    ? await db
        .select()
        .from(pacientesTable)
        .where(and(...condicoes))
        .orderBy(...orderByFragments)
    : await db
        .select()
        .from(pacientesTable)
        .orderBy(...orderByFragments);

  res.json(pacientes);
});

router.post("/pacientes", async (req, res): Promise<void> => {
  const parsed = CriarPacienteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [paciente] = await db.insert(pacientesTable).values(parsed.data).returning();
  // Onda 6.4 - provisionamento Drive + planilha GPS+RAS automatico (fire-and-forget)
  if (paciente) autoProvisionDriveAsync({ id: paciente.id, nome: paciente.nome, cpf: paciente.cpf, googleDriveFolderId: paciente.googleDriveFolderId });
  res.status(201).json(paciente);
});

router.get("/pacientes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, id));
  if (!paciente) { res.status(404).json({ error: "Paciente não encontrado" }); return; }
  res.json(paciente);
});

router.put("/pacientes/:id", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "ID invalido" }); return; }
    const body = req.body;
    const allowed: Record<string, any> = {};
    const whitelist = ["nome", "cpf", "telefone", "email", "cep", "endereco", "complemento", "bairro", "cidade", "estado", "pais", "unidadeId", "dataNascimento", "statusAtivo", "planoAcompanhamento", "googleDriveFolderId", "genero", "alturaCm", "pesoKg", "alergias", "condicoesClinicas", "medicamentosContinuos", "gestante", "fototipoFitzpatrick", "atividadeFisica"];
    for (const k of whitelist) {
      if (body[k] !== undefined) allowed[k] = body[k];
    }
    if (allowed.dataNascimento && typeof allowed.dataNascimento === "string") {
      allowed.dataNascimento = new Date(allowed.dataNascimento);
    }
    if (Object.keys(allowed).length === 0) { res.status(400).json({ error: "Nenhum campo para atualizar" }); return; }
    const [paciente] = await db.update(pacientesTable).set(allowed).where(eq(pacientesTable.id, id)).returning();
    if (!paciente) { res.status(404).json({ error: "Paciente não encontrado" }); return; }
    res.json(paciente);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro interno" });
  }
});

router.patch("/pacientes/:id/fotos", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { fotoRosto, fotoCorpo } = req.body;
  const updates: Record<string, string | null> = {};

  const validarBase64 = (v: unknown): boolean => {
    if (v === null) return true;
    if (typeof v !== "string") return false;
    if (!v.startsWith("data:image/")) return false;
    if (v.length > 5 * 1024 * 1024) return false;
    return true;
  };

  if (fotoRosto !== undefined) {
    if (!validarBase64(fotoRosto)) { res.status(400).json({ error: "Formato de foto de rosto invalido" }); return; }
    updates.fotoRosto = fotoRosto;
  }
  if (fotoCorpo !== undefined) {
    if (!validarBase64(fotoCorpo)) { res.status(400).json({ error: "Formato de foto de corpo invalido" }); return; }
    updates.fotoCorpo = fotoCorpo;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhuma foto fornecida" });
    return;
  }
  const [paciente] = await db.update(pacientesTable).set(updates).where(eq(pacientesTable.id, id)).returning();
  if (!paciente) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }
  res.json(paciente);
});

router.get("/cep/:cep", async (req, res): Promise<void> => {
  const cep = req.params.cep.replace(/\D/g, '');
  if (cep.length !== 8) { res.status(400).json({ error: "CEP invalido" }); return; }
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await resp.json();
    if (data.erro) { res.status(404).json({ error: "CEP nao encontrado" }); return; }
    res.json({
      cep: data.cep,
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
      pais: "Brasil",
    });
  } catch {
    res.status(500).json({ error: "Erro ao consultar CEP" });
  }
});

export default router;
