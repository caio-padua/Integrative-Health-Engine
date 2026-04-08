import { Router } from "express";
import { db } from "@workspace/db";
import { codigosSemanticosTable, insertCodigoSemanticoSchema } from "@workspace/db/schema";
import { eq, ilike, sql, and } from "drizzle-orm";

const router = Router();

router.get("/codigos-semanticos", async (req, res) => {
  const { search, tipo, grupo } = req.query;
  const conditions: any[] = [];
  if (search) {
    conditions.push(
      sql`(${ilike(codigosSemanticosTable.codigo, `%${search}%`)} OR ${ilike(codigosSemanticosTable.procedimentoOuSignificado, `%${search}%`)})`
    );
  }
  if (tipo) conditions.push(eq(codigosSemanticosTable.tipo, String(tipo)));
  if (grupo) conditions.push(eq(codigosSemanticosTable.grupoObs, String(grupo)));

  const result = await db
    .select()
    .from(codigosSemanticosTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(codigosSemanticosTable.codigo);
  res.json(result);
});

router.get("/codigos-semanticos/tipos", async (_req, res) => {
  const tipos = await db
    .selectDistinct({ tipo: codigosSemanticosTable.tipo })
    .from(codigosSemanticosTable)
    .orderBy(codigosSemanticosTable.tipo);
  const grupos = await db
    .selectDistinct({ grupo: codigosSemanticosTable.grupoObs })
    .from(codigosSemanticosTable)
    .orderBy(codigosSemanticosTable.grupoObs);
  res.json({
    tipos: tipos.map(t => t.tipo),
    grupos: grupos.map(g => g.grupo).filter(Boolean),
  });
});

router.post("/codigos-semanticos", async (req, res) => {
  const parsed = insertCodigoSemanticoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [created] = await db.insert(codigosSemanticosTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.get("/codigos-semanticos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID deve ser numerico" }); return; }
  const [item] = await db.select().from(codigosSemanticosTable).where(eq(codigosSemanticosTable.id, id));
  if (!item) { res.status(404).json({ error: "Codigo nao encontrado" }); return; }
  res.json(item);
});

router.put("/codigos-semanticos/:id", async (req, res) => {
  const allowedFields = [
    "codigo", "tipo", "procedimentoOuSignificado", "origemLida", "grupoObs",
    "prescricaoFormula", "injetavelIM", "injetavelEV", "implante", "exame",
    "protocolo", "dieta", "ativo",
  ];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nenhum campo para atualizar" }); return; }
  const [updated] = await db.update(codigosSemanticosTable).set(updates).where(eq(codigosSemanticosTable.id, Number(req.params.id))).returning();
  if (!updated) { res.status(404).json({ error: "Codigo nao encontrado" }); return; }
  res.json(updated);
});

router.post("/codigos-semanticos/seed", async (_req, res) => {
  const count = await db.select({ count: sql<number>`count(*)` }).from(codigosSemanticosTable);
  if (Number(count[0].count) > 0) {
    res.json({ message: "Codigos ja semeados", total: Number(count[0].count) });
    return;
  }

  const seedData = [
    { codigo: "EXAM META GLIJ 001", tipo: "exame/procedimento", procedimentoOuSignificado: "exame metabolico glicemico", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V9", grupoObs: "Exemplo de padrao AAAA BBBB CCCC 000", exame: "Glicemia de Jejum / HbA1c / Insulina Basal" },
    { codigo: "INJE META B12C 001", tipo: "injetavel", procedimentoOuSignificado: "injetavel metabolico B12", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V9", grupoObs: "Exemplo de padrao", injetavelIM: "Cianocobalamina 5000mcg IM" },
    { codigo: "FORM TIRE MODU 001", tipo: "formula", procedimentoOuSignificado: "formula tireoide modulacao", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V9", grupoObs: "Exemplo de padrao", prescricaoFormula: "T3/T4/Selenio/Zinco - Modulacao Tireoidiana" },
    { codigo: "PROC META BASE 001", tipo: "protocolo", procedimentoOuSignificado: "protocolo metabolico base", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V9", grupoObs: "Exemplo de padrao", protocolo: "Protocolo Metabolico Base - Exames + Formulas + Injetaveis" },
    { codigo: "JURI CONS TERM 001", tipo: "juridico", procedimentoOuSignificado: "consentimento/termo", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V9", grupoObs: "Exemplo de padrao" },
    { codigo: "DIET KETO 1000 001", tipo: "dieta", procedimentoOuSignificado: "dieta keto 1000", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V9", grupoObs: "Exemplo de padrao", dieta: "Dieta Cetogenica 1000kcal" },
    { codigo: "PSIC TDAH BASE 001", tipo: "psicologia", procedimentoOuSignificado: "psicologia TDAH base", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V9", grupoObs: "Exemplo de padrao" },
    { codigo: "RECO EXAM META 001", tipo: "recorrencia", procedimentoOuSignificado: "recorrencia de exame metabolico", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V9", grupoObs: "Exemplo de padrao" },
    { codigo: "PAGA META MENSAL 001", tipo: "pagamento", procedimentoOuSignificado: "pagamento metabolico mensal", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V9", grupoObs: "Exemplo de padrao" },
    { codigo: "EXAM TIRE DIAG 001", tipo: "exame/procedimento", procedimentoOuSignificado: "exame de tireoide diagnostico", origemLida: "PADCOM SAAS MOTOR CLINICO V13/V14/V15", grupoObs: "Exemplo explicito de exame/procedimento", exame: "TSH / T4L / T3L / Anti-TPO / Anti-Tg" },
    { codigo: "FISC EXAM GUIA 001", tipo: "fiscal/documento", procedimentoOuSignificado: "guia fiscal de exame", origemLida: "PADCOM SAAS MOTOR CLINICO V15.2", grupoObs: "Exemplo de codigo semantico global" },
    { codigo: "DADO IDEN NOME 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Qual seu nome completo?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Identificacao" },
    { codigo: "DADO IDEN NASC 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Qual sua data de nascimento?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Identificacao" },
    { codigo: "CARD DOEN HASA 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Voce tem pressao alta?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Cardio" },
    { codigo: "CARD DOEN INFA 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Ja teve infarto?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Cardio" },
    { codigo: "CARD DOEN AVCX 003", tipo: "pergunta anamnese", procedimentoOuSignificado: "Ja teve derrame?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Cardio" },
    { codigo: "META DOEN DIAB 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Voce tem diabetes?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Metabolico" },
    { codigo: "META DOEN DISL 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Voce tem colesterol ou triglicerides altos?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Metabolico" },
    { codigo: "ENDO DOEN HIPO 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Voce tem hipotireoidismo?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Endocrino" },
    { codigo: "ENDO DOEN HASH 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Voce tem Hashimoto?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Endocrino" },
    { codigo: "SONO SINT INSO 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Como esta seu sono?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Sono" },
    { codigo: "SONO SINT TIPO 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Dificuldade para iniciar ou manter sono?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Sono" },
    { codigo: "INST SINT FUNC 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Seu intestino funciona bem?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Intestino" },
    { codigo: "INST SINT TIPO 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Qual situacao representa melhor o seu intestino?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Intestino" },
    { codigo: "LIBI SINT SEXO 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Como esta sua libido?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Hormonal" },
    { codigo: "HUMO SINT ANSI 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Como esta seu humor e sua ansiedade?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Humor" },
    { codigo: "CIRU GERA COLE 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Ja retirou a vesicula?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Cirurgia" },
    { codigo: "CIRU GERA HIST 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Ja retirou o utero?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Cirurgia" },
    { codigo: "CIRU GERA OOFO 003", tipo: "pergunta anamnese", procedimentoOuSignificado: "Ja retirou os ovarios?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Cirurgia" },
    { codigo: "CIRU GERA ARTL 004", tipo: "pergunta anamnese", procedimentoOuSignificado: "Ja fez cirurgia de coluna?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Cirurgia" },
    { codigo: "MEDI USO CONT 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Usa medicamentos continuos?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Medicacao" },
    { codigo: "MEDI USO NOME 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Quais medicamentos voce usa?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Medicacao" },
    { codigo: "ATIV FREQ 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Voce pratica atividade fisica?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Atividade fisica" },
    { codigo: "ATIV TIPO 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Qual tipo de exercicio representa melhor sua rotina?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Atividade fisica" },
    { codigo: "ATIV ENER 003", tipo: "pergunta anamnese", procedimentoOuSignificado: "Qual seu nivel de energia para treinar?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Atividade fisica" },
    { codigo: "TERA PLANO 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Gostaria de um plano mais completo?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Terapia" },
    { codigo: "TERA IM 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Incluiria aplicacoes intramusculares?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Terapia" },
    { codigo: "TERA EV 003", tipo: "pergunta anamnese", procedimentoOuSignificado: "Incluiria terapias endovenosas?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Terapia" },
    { codigo: "TERA IMPL 004", tipo: "pergunta anamnese", procedimentoOuSignificado: "Incluiria implantes?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Terapia" },
    { codigo: "TERA LOGI 005", tipo: "pergunta anamnese", procedimentoOuSignificado: "Qual logistica combina mais com sua rotina?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Terapia" },
    { codigo: "TERA AGIM 006", tipo: "pergunta anamnese", procedimentoOuSignificado: "Como voce se sente em relacao a IM?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Terapia" },
    { codigo: "TERA AGEV 007", tipo: "pergunta anamnese", procedimentoOuSignificado: "Como voce se sente em relacao a EV?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Terapia" },
    { codigo: "FINA HORI 001", tipo: "pergunta anamnese", procedimentoOuSignificado: "Qual horizonte de tratamento faz mais sentido?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Financeiro" },
    { codigo: "FINA PERF 002", tipo: "pergunta anamnese", procedimentoOuSignificado: "Qual formato de investimento e mais confortavel?", origemLida: "PADCOM SAAS ANAMNESE V15", grupoObs: "Financeiro" },
    { codigo: "DOEN CARD HASA 001", tipo: "doenca", procedimentoOuSignificado: "Hipertensao arterial", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Cardio", exame: "ECG / Ecocardiograma / Holter", prescricaoFormula: "Anti-hipertensivo + Magnésio + CoQ10" },
    { codigo: "DOEN CARD ARRT 001", tipo: "doenca", procedimentoOuSignificado: "Arritmia", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Cardio", exame: "ECG / Holter 24h" },
    { codigo: "DOEN CARD VENO 001", tipo: "doenca", procedimentoOuSignificado: "Insuficiencia venosa", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Cardio" },
    { codigo: "DOEN CARD TROM 001", tipo: "doenca", procedimentoOuSignificado: "Trombose venosa", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Cardio", exame: "Doppler Venoso / D-dimero / Coagulograma" },
    { codigo: "DOEN CARD ICAR 001", tipo: "doenca", procedimentoOuSignificado: "Insuficiencia cardiaca", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Cardio", exame: "BNP / Ecocardiograma / RX Torax" },
    { codigo: "DOEN META DIAB 001", tipo: "doenca", procedimentoOuSignificado: "Diabetes tipo 2", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Metabolico", exame: "Glicemia / HbA1c / Insulina / Peptideo C", injetavelEV: "Glutationa EV", prescricaoFormula: "Metformina + Berberina + Cromo" },
    { codigo: "DOEN META PRED 001", tipo: "doenca", procedimentoOuSignificado: "Pre-diabetes", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Metabolico", exame: "TOTG / Insulina Basal / HbA1c" },
    { codigo: "DOEN META OBES 001", tipo: "doenca", procedimentoOuSignificado: "Obesidade", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Metabolico", exame: "Perfil Lipidico / Insulina / Leptina", injetavelIM: "Fosfatidilcolina IM" },
    { codigo: "DOEN META DLIP 001", tipo: "doenca", procedimentoOuSignificado: "Dislipidemia", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Metabolico", exame: "Perfil Lipidico Completo / Apo B / Lp(a)" },
    { codigo: "DOEN META GOTA 001", tipo: "doenca", procedimentoOuSignificado: "Gota", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Metabolico", exame: "Acido Urico / Funcao Renal" },
    { codigo: "DOEN ENDO HIPO 001", tipo: "doenca", procedimentoOuSignificado: "Hipotireoidismo", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Endocrino", exame: "TSH / T4L / T3L / Anti-TPO", prescricaoFormula: "Levotiroxina + Selenio + Zinco" },
    { codigo: "DOEN ENDO HIPR 001", tipo: "doenca", procedimentoOuSignificado: "Hipertireoidismo", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Endocrino", exame: "TSH / T4L / T3L / TRAb" },
    { codigo: "DOEN ENDO HASH 001", tipo: "doenca", procedimentoOuSignificado: "Tireoidite de Hashimoto", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Endocrino", exame: "TSH / T4L / Anti-TPO / Anti-Tg / USG Tireoide", prescricaoFormula: "Selenio + Zinco + Vit D + Omega 3", injetavelEV: "Vitamina C EV + Glutationa" },
    { codigo: "DOEN ENDO TIRE 001", tipo: "doenca", procedimentoOuSignificado: "Nodulo de tireoide", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Endocrino", exame: "USG Tireoide / PAAF / Calcitonina" },
    { codigo: "DOEN ENDO SOPC 001", tipo: "doenca", procedimentoOuSignificado: "Sindrome dos ovarios policisticos", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Endocrino", exame: "FSH / LH / Testosterona / DHEA-S / Insulina / USG Pelvica" },
    { codigo: "DOEN ENDO HIPO 002", tipo: "doenca", procedimentoOuSignificado: "Hipogonadismo", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Endocrino", exame: "Testosterona Total e Livre / FSH / LH / SHBG", implante: "Testosterona Implante Subcutaneo" },
    { codigo: "DOEN AUTO PSOR 001", tipo: "doenca", procedimentoOuSignificado: "Psoriase", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Autoimune" },
    { codigo: "DOEN AUTO VITI 001", tipo: "doenca", procedimentoOuSignificado: "Vitiligo", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Autoimune" },
    { codigo: "DOEN AUTO LUPU 001", tipo: "doenca", procedimentoOuSignificado: "Lupus", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Autoimune", exame: "FAN / Anti-DNA / Complemento C3 C4" },
    { codigo: "DOEN AUTO ARRE 001", tipo: "doenca", procedimentoOuSignificado: "Artrite reumatoide", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Autoimune", exame: "Fator Reumatoide / Anti-CCP / PCR / VHS" },
    { codigo: "DOEN AUTO CELI 001", tipo: "doenca", procedimentoOuSignificado: "Doenca celiaca", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Autoimune", exame: "Anti-Transglutaminase / Anti-Endomisio / IgA Total" },
    { codigo: "DOEN DERM ALOP 001", tipo: "doenca", procedimentoOuSignificado: "Alopecia areata", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Dermato" },
    { codigo: "DOEN DERM ROSA 001", tipo: "doenca", procedimentoOuSignificado: "Rosacea", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Dermato" },
    { codigo: "DOEN DERM ATOP 001", tipo: "doenca", procedimentoOuSignificado: "Dermatite atopica", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Dermato" },
    { codigo: "DOEN RESP ASMA 001", tipo: "doenca", procedimentoOuSignificado: "Asma", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Respiratorio" },
    { codigo: "DOEN RESP DPOC 001", tipo: "doenca", procedimentoOuSignificado: "DPOC", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Respiratorio" },
    { codigo: "DOEN RESP RINI 001", tipo: "doenca", procedimentoOuSignificado: "Rinite alergica", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Respiratorio" },
    { codigo: "DOEN RESP APNE 001", tipo: "doenca", procedimentoOuSignificado: "Apneia do sono", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Respiratorio", exame: "Polissonografia" },
    { codigo: "DOEN GAST REFL 001", tipo: "doenca", procedimentoOuSignificado: "Refluxo", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Gastro", exame: "Endoscopia" },
    { codigo: "DOEN GAST GAST 001", tipo: "doenca", procedimentoOuSignificado: "Gastrite", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Gastro", exame: "Endoscopia / H. pylori" },
    { codigo: "DOEN GAST IBSI 001", tipo: "doenca", procedimentoOuSignificado: "Intestino irritavel", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Gastro" },
    { codigo: "DOEN HEPA ESTE 001", tipo: "doenca", procedimentoOuSignificado: "Esteatose hepatica", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Hepatico", exame: "USG Abdome / TGO / TGP / GGT / Ferritina", injetavelEV: "Glutationa EV" },
    { codigo: "DOEN RENA CALC 001", tipo: "doenca", procedimentoOuSignificado: "Litiase renal", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Renal", exame: "Calcio Urinario 24h / Acido Urico / USG Rins" },
    { codigo: "DOEN RENA INSU 001", tipo: "doenca", procedimentoOuSignificado: "Insuficiencia renal", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Renal", exame: "Creatinina / TFG / Cistatina C / Microalbuminuria" },
    { codigo: "DOEN NEUR MIGR 001", tipo: "doenca", procedimentoOuSignificado: "Enxaqueca", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Neuro", injetavelEV: "Magnesio EV" },
    { codigo: "DOEN NEUR TDAH 001", tipo: "doenca", procedimentoOuSignificado: "TDAH", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Neuro", prescricaoFormula: "Metilfenidato / Lisdexanfetamina + Omega 3" },
    { codigo: "DOEN NEUR ANSI 001", tipo: "doenca", procedimentoOuSignificado: "Ansiedade", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Neuro", prescricaoFormula: "Magnésio + L-Teanina + Ashwagandha" },
    { codigo: "DOEN NEUR DEPR 001", tipo: "doenca", procedimentoOuSignificado: "Depressao", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Neuro", injetavelEV: "NAD+ EV" },
    { codigo: "DOEN NEUR INSO 001", tipo: "doenca", procedimentoOuSignificado: "Insonia", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Neuro", prescricaoFormula: "Melatonina + Magnésio + Glicina" },
    { codigo: "DOEN OSMU FIBR 001", tipo: "doenca", procedimentoOuSignificado: "Fibromialgia", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Osteomuscular", injetavelEV: "Vitamina C EV + Magnesio" },
    { codigo: "DOEN OSMU HERN 001", tipo: "doenca", procedimentoOuSignificado: "Hernia de disco lombar", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Osteomuscular" },
    { codigo: "DOEN OSMU ARTR 001", tipo: "doenca", procedimentoOuSignificado: "Artrose de joelho", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Osteomuscular" },
    { codigo: "DOEN OSMU OSTE 001", tipo: "doenca", procedimentoOuSignificado: "Osteoporose", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Osteomuscular", exame: "Densitometria / Calcio / Vitamina D / PTH", prescricaoFormula: "Vitamina D + K2 + Calcio + Magnésio" },
    { codigo: "DOEN OFTA KERA 001", tipo: "doenca", procedimentoOuSignificado: "Ceratocone", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Oftalmo" },
    { codigo: "DOEN OFTA GLAU 001", tipo: "doenca", procedimentoOuSignificado: "Glaucoma", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Oftalmo" },
    { codigo: "DOEN OFTA CATR 001", tipo: "doenca", procedimentoOuSignificado: "Catarata", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Oftalmo" },
    { codigo: "DOEN OFTA OSEC 001", tipo: "doenca", procedimentoOuSignificado: "Olho seco", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Oftalmo" },
    { codigo: "DOEN ODON IMPL 001", tipo: "doenca/procedimento", procedimentoOuSignificado: "Implante dentario", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Odonto" },
    { codigo: "DOEN ODON BRUX 001", tipo: "doenca", procedimentoOuSignificado: "Bruxismo", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Odonto" },
    { codigo: "DOEN ODON GENG 001", tipo: "doenca", procedimentoOuSignificado: "Gengivite", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Odonto" },
    { codigo: "DOEN ODON PERIOD 001", tipo: "doenca", procedimentoOuSignificado: "Periodontite", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Odonto" },
    { codigo: "DOEN GINE ENDO 001", tipo: "doenca", procedimentoOuSignificado: "Endometriose", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Urogenital", exame: "USG Transvaginal / CA-125" },
    { codigo: "DOEN GINE MIOM 001", tipo: "doenca", procedimentoOuSignificado: "Mioma uterino", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Urogenital", exame: "USG Pelvica" },
    { codigo: "DOEN UROL HPBA 001", tipo: "doenca", procedimentoOuSignificado: "HPB", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Urogenital", exame: "PSA / USG Prostata" },
    { codigo: "DOEN UROL PROS 001", tipo: "doenca", procedimentoOuSignificado: "Prostatite", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Urogenital" },
    { codigo: "DOEN ONCO TIRE 001", tipo: "doenca", procedimentoOuSignificado: "Cancer de tireoide", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Onco" },
    { codigo: "DOEN ONCO MAMA 001", tipo: "doenca", procedimentoOuSignificado: "Cancer de mama", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Onco", exame: "Mamografia / USG Mamas" },
    { codigo: "DOEN ONCO PROS 001", tipo: "doenca", procedimentoOuSignificado: "Cancer de prostata", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Onco", exame: "PSA / USG Prostata / RM Multiparametrica" },
    { codigo: "SINT CARD DISP 001", tipo: "sintoma", procedimentoOuSignificado: "Dispneia", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "SINT CARD EDEM 001", tipo: "sintoma", procedimentoOuSignificado: "Edema de pernas", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "SINT META FADI 001", tipo: "sintoma", procedimentoOuSignificado: "Fadiga", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma", injetavelIM: "Complexo B IM", injetavelEV: "NAD+ EV / Vitamina C EV" },
    { codigo: "SINT ENDO FRIO 001", tipo: "sintoma", procedimentoOuSignificado: "Intolerancia ao frio", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "SINT AUTO PRUR 001", tipo: "sintoma", procedimentoOuSignificado: "Prurido", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "SINT RESP TOSS 001", tipo: "sintoma", procedimentoOuSignificado: "Tosse", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "SINT GAST REGE 001", tipo: "sintoma", procedimentoOuSignificado: "Regurgitacao", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "SINT NEUR CEFA 001", tipo: "sintoma", procedimentoOuSignificado: "Cefaleia", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma", injetavelEV: "Magnesio EV" },
    { codigo: "SINT NEUR MEMO 001", tipo: "sintoma", procedimentoOuSignificado: "Falha de memoria", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma", injetavelEV: "NAD+ EV" },
    { codigo: "SINT OSMU DORL 001", tipo: "sintoma", procedimentoOuSignificado: "Dor lombar", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "SINT OFTA DIPL 001", tipo: "sintoma", procedimentoOuSignificado: "Visao dupla", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "SINT ODON DOATM 001", tipo: "sintoma", procedimentoOuSignificado: "Dor em ATM", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "SINT UROG DISP 001", tipo: "sintoma", procedimentoOuSignificado: "Dispareunia", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Sintoma" },
    { codigo: "CIRU ENDO TIRE 001", tipo: "cirurgia", procedimentoOuSignificado: "Tireoidectomia total", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Cirurgia" },
    { codigo: "CIRU ODON IMPL 001", tipo: "cirurgia", procedimentoOuSignificado: "Implante dentario", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Cirurgia" },
    { codigo: "CIRU GAST COLE 001", tipo: "cirurgia", procedimentoOuSignificado: "Colecistectomia", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Cirurgia" },
    { codigo: "CIRU OSMU JOEL 001", tipo: "cirurgia", procedimentoOuSignificado: "Artroplastia de joelho", origemLida: "SHEET ANAMNESE MOTOR CLINICO V1", grupoObs: "Cirurgia" },
  ];

  const created = await db.insert(codigosSemanticosTable).values(seedData).returning();
  res.status(201).json({ message: `${created.length} codigos semanticos semeados`, total: created.length });
});

export default router;
