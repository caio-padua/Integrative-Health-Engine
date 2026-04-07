import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  injetaveisTable, endovenososTable, implantesTable, formulasTable,
  doencasTable, regrasInjetaveisTable, regrasEndovenososTable, regrasImplantesTable,
  protocolosMasterTable, protocolosFasesTable, protocolosAcoesTable,
  mapaAnamneseMotorTable, motorDecisaoTable, dietasTable,
  questionarioMasterTable, psicologiaTable,
} from "@workspace/db";

const router = Router();

router.get("/injetaveis", async (_req, res) => {
  const rows = await db.select().from(injetaveisTable).orderBy(injetaveisTable.codigoPadcom);
  res.json(rows);
});

router.get("/endovenosos", async (_req, res) => {
  const rows = await db.select().from(endovenososTable).orderBy(endovenososTable.codigoPadcom);
  res.json(rows);
});

router.get("/implantes", async (_req, res) => {
  const rows = await db.select().from(implantesTable).orderBy(implantesTable.codigoPadcom);
  res.json(rows);
});

router.get("/formulas", async (_req, res) => {
  const rows = await db.select().from(formulasTable).orderBy(formulasTable.codigoPadcom);
  res.json(rows);
});

router.get("/doencas", async (_req, res) => {
  const rows = await db.select().from(doencasTable).orderBy(doencasTable.codigoDoenca);
  res.json(rows);
});

router.get("/regras-injetaveis", async (_req, res) => {
  const rows = await db.select().from(regrasInjetaveisTable).orderBy(regrasInjetaveisTable.regraId);
  res.json(rows);
});

router.get("/regras-endovenosos", async (_req, res) => {
  const rows = await db.select().from(regrasEndovenososTable).orderBy(regrasEndovenososTable.regraId);
  res.json(rows);
});

router.get("/regras-implantes", async (_req, res) => {
  const rows = await db.select().from(regrasImplantesTable);
  res.json(rows);
});

router.get("/protocolos-master", async (_req, res) => {
  const protocolos = await db.select().from(protocolosMasterTable).orderBy(protocolosMasterTable.codigoProtocolo);
  const fases = await db.select().from(protocolosFasesTable);
  const acoes = await db.select().from(protocolosAcoesTable);
  const result = protocolos.map(p => ({
    ...p,
    fases: fases.filter(f => f.codigoProtocolo === p.codigoProtocolo),
    acoes: acoes.filter(a => a.codigoProtocolo === p.codigoProtocolo),
  }));
  res.json(result);
});

router.get("/mapa-anamnese", async (_req, res) => {
  const rows = await db.select().from(mapaAnamneseMotorTable);
  res.json(rows);
});

router.get("/motor-decisao", async (_req, res) => {
  const rows = await db.select().from(motorDecisaoTable).orderBy(motorDecisaoTable.casoId);
  res.json(rows);
});

router.get("/dietas", async (_req, res) => {
  const rows = await db.select().from(dietasTable).orderBy(dietasTable.codigoDieta);
  res.json(rows);
});

router.get("/questionario", async (_req, res) => {
  const rows = await db.select().from(questionarioMasterTable).orderBy(questionarioMasterTable.perguntaId);
  res.json(rows);
});

router.get("/psicologia", async (_req, res) => {
  const rows = await db.select().from(psicologiaTable);
  res.json(rows);
});

router.get("/resumo", async (_req, res) => {
  const counts = await Promise.all([
    db.execute(sql`SELECT count(*)::int as c FROM injetaveis`),
    db.execute(sql`SELECT count(*)::int as c FROM endovenosos`),
    db.execute(sql`SELECT count(*)::int as c FROM implantes`),
    db.execute(sql`SELECT count(*)::int as c FROM formulas`),
    db.execute(sql`SELECT count(*)::int as c FROM doencas`),
    db.execute(sql`SELECT count(*)::int as c FROM regras_injetaveis`),
    db.execute(sql`SELECT count(*)::int as c FROM regras_endovenosos`),
    db.execute(sql`SELECT count(*)::int as c FROM regras_implantes`),
    db.execute(sql`SELECT count(*)::int as c FROM protocolos_master`),
    db.execute(sql`SELECT count(*)::int as c FROM dietas`),
    db.execute(sql`SELECT count(*)::int as c FROM questionario_master`),
    db.execute(sql`SELECT count(*)::int as c FROM psicologia`),
    db.execute(sql`SELECT count(*)::int as c FROM mapa_anamnese_motor`),
    db.execute(sql`SELECT count(*)::int as c FROM motor_decisao_clinica`),
  ]);
  const labels = [
    "injetaveis", "endovenosos", "implantes", "formulas", "doencas",
    "regrasInjetaveis", "regrasEndovenosos", "regrasImplantes", "protocolos",
    "dietas", "questionario", "psicologia", "mapaAnamnese", "motorDecisao",
  ];
  const result: Record<string, number> = {};
  labels.forEach((l, i) => {
    const rows = counts[i] as any;
    result[l] = rows.rows?.[0]?.c ?? rows[0]?.c ?? 0;
  });
  result.total = Object.values(result).reduce((a, b) => a + b, 0);
  res.json(result);
});

export default router;
