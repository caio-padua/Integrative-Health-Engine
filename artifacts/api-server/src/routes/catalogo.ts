import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  injetaveisTable, endovenososTable, implantesTable, formulasTable,
  doencasTable, regrasInjetaveisTable, regrasEndovenososTable, regrasImplantesTable,
  protocolosMasterTable, protocolosFasesTable, protocolosAcoesTable,
  mapaAnamneseMotorTable, motorDecisaoTable, dietasTable,
  questionarioMasterTable, psicologiaTable,
  blocosTable as blocosTableRef, mapaBlockExameTable as mapaBlockExameTableRef,
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

router.get("/fases", async (_req, res) => {
  const rows = await db.select().from(protocolosFasesTable).orderBy(protocolosFasesTable.codigoProtocolo);
  res.json(rows);
});

router.get("/acoes", async (_req, res) => {
  const rows = await db.select().from(protocolosAcoesTable).orderBy(protocolosAcoesTable.codigoProtocolo);
  res.json(rows);
});

router.get("/itens-unificados", async (_req, res) => {
  const [inj, endo, impl, form, proto, blocos, exames] = await Promise.all([
    db.select().from(injetaveisTable).orderBy(injetaveisTable.codigoPadcom),
    db.select().from(endovenososTable).orderBy(endovenososTable.codigoPadcom),
    db.select().from(implantesTable).orderBy(implantesTable.codigoPadcom),
    db.select().from(formulasTable).orderBy(formulasTable.codigoPadcom),
    db.select().from(protocolosMasterTable).orderBy(protocolosMasterTable.codigoProtocolo),
    db.select().from(blocosTableRef).orderBy(blocosTableRef.codigoBloco),
    db.select().from(mapaBlockExameTableRef),
  ]);

  const items: Array<{
    id: string; tipo: string; codigo: string; nome: string; 
    eixo?: string | null; via?: string | null; dosagem?: string | null;
    valor?: string | null; status?: string; blocoId?: string | null;
    grau?: string | null; composicao?: string | null; area?: string | null;
    frequencia?: string | null; classificacao?: string | null;
    palavraChave?: string | null; indicacao?: string | null;
    objetivo?: string | null;
  }> = [];

  inj.forEach(i => items.push({
    id: `INJ-${i.id}`, tipo: "INJETAVEL_IM", codigo: i.codigoPadcom,
    nome: i.nomeExibicao || i.nomeAmpola, eixo: i.eixoIntegrativo,
    via: i.via, dosagem: i.dosagem, valor: i.valorUnidade,
    status: i.statusCadastro, classificacao: i.classificacao,
    palavraChave: i.palavraChaveMotor,
  }));

  endo.forEach(i => items.push({
    id: `ENDO-${i.id}`, tipo: "INJETAVEL_EV", codigo: i.codigoPadcom,
    nome: i.nomeExibicao || i.nomeSoro, eixo: i.eixoIntegrativo,
    via: i.via, dosagem: i.dosagem, valor: i.valorUnidade,
    status: i.statusCadastro, frequencia: i.frequenciaPadrao,
    classificacao: i.classificacao, palavraChave: i.palavraChaveMotor,
  }));

  impl.forEach(i => items.push({
    id: `IMPL-${i.id}`, tipo: "IMPLANTE", codigo: i.codigoPadcom,
    nome: i.nomeImplante, via: i.via, dosagem: i.dosagem,
    valor: i.valorUnidade, status: i.statusCadastro,
    indicacao: i.indicacao,
  }));

  const formulaMap = new Map<string, { master: typeof form[0] | null; componentes: typeof form }>();
  form.forEach(f => {
    if (!formulaMap.has(f.codigoPadcom)) formulaMap.set(f.codigoPadcom, { master: null, componentes: [] });
    const entry = formulaMap.get(f.codigoPadcom)!;
    if (f.tipoLinha === "MASTER" || f.identificador === "TITL") {
      entry.master = f;
    } else {
      entry.componentes.push(f);
    }
  });
  formulaMap.forEach((entry, codigo) => {
    const m = entry.master;
    const nome = m?.conteudo || entry.componentes[0]?.conteudo || codigo;
    const comps = entry.componentes.map(c => c.conteudo).filter(Boolean);
    items.push({
      id: `FORM-${codigo}`, tipo: "FORMULA", codigo,
      nome, composicao: comps.length > 0 ? comps.join('\n') : null,
      area: m?.area || entry.componentes[0]?.area || null,
      valor: m?.valorUnidade || entry.componentes.find(c => c.valorUnidade)?.valorUnidade || null,
      status: m?.status || "ATIVO",
    });
  });

  proto.forEach(i => items.push({
    id: `PROTO-${i.id}`, tipo: "PROTOCOLO", codigo: i.codigoProtocolo,
    nome: i.nome, area: i.area, objetivo: i.objetivo,
    valor: i.valorTotal, status: i.status,
  }));

  const blocosExameMap = new Map<string, typeof exames>();
  exames.forEach(e => {
    const key = `${e.blocoId}-${e.grau}`;
    if (!blocosExameMap.has(key)) blocosExameMap.set(key, []);
    blocosExameMap.get(key)!.push(e);
  });

  blocos.forEach(b => {
    const grades = b.grausDisponiveis || [];
    grades.forEach(grau => {
      const examesGrade = blocosExameMap.get(`${b.codigoBloco}-${grau}`) || [];
      const nomes = examesGrade.sort((a, b2) => a.ordemNoBloco - b2.ordemNoBloco).map(e => e.nomeExame);
      items.push({
        id: `EXAM-${b.codigoBloco}-${grau.replace(/\s+/g, '_')}`,
        tipo: "EXAME",
        codigo: `EXAM ${b.codigoBloco.replace('BLK', '')} ${grau.replace('GRADE ', '').substring(0, 4).toUpperCase()}`,
        nome: `${b.nomeBloco.replace('BLOCO ', 'Bloco ')} - ${grau}`,
        blocoId: b.codigoBloco,
        grau: grau,
        composicao: nomes.join(', '),
        area: b.tipoMacro || null,
        status: b.ativo ? "ATIVO" : "INATIVO",
      });
    });
  });

  res.json({
    items,
    contagens: {
      INJETAVEL_IM: inj.length,
      INJETAVEL_EV: endo.length,
      IMPLANTE: impl.length,
      FORMULA: formulaMap.size,
      PROTOCOLO: proto.length,
      EXAME: items.filter(i => i.tipo === "EXAME").length,
    },
    total: items.length,
  });
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
