import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  farmaciasParceirasTable,
  comissoesConfigTable,
  descontosConfigTable,
  planosConsultaConfigTable,
  anamneseValidacaoTemplateTable,
  termosConsentimentoTable,
  insertFarmaciaParceiraSchema,
  insertComissaoConfigSchema,
  insertDescontoConfigSchema,
  insertPlanoConsultaConfigSchema,
  insertAnamneseValidacaoTemplateSchema,
  insertTermoConsentimentoSchema,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

function makeCrud<TTable extends { id: any }>(
  basePath: string,
  table: any,
  insertSchema: any,
  orderBy: any,
) {
  router.get(basePath, async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(table).orderBy(orderBy);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post(basePath, async (req: Request, res: Response) => {
    try {
      const parsed = insertSchema.parse(req.body);
      const [row] = await db.insert(table).values(parsed).returning();
      res.status(201).json(row);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch(`${basePath}/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const parsed = insertSchema.partial().parse(req.body);
      const [row] = await db.update(table).set(parsed).where(eq(table.id, id)).returning();
      if (!row) return res.status(404).json({ error: "not found" });
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete(`${basePath}/:id`, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const [row] = await db.delete(table).where(eq(table.id, id)).returning();
      if (!row) return res.status(404).json({ error: "not found" });
      res.json({ ok: true, id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });
}

makeCrud("/farmacias-parceiras", farmaciasParceirasTable, insertFarmaciaParceiraSchema, asc(farmaciasParceirasTable.nome));
makeCrud("/comissoes-config", comissoesConfigTable, insertComissaoConfigSchema, asc(comissoesConfigTable.categoria));
makeCrud("/descontos-config", descontosConfigTable, insertDescontoConfigSchema, asc(descontosConfigTable.tipo));
makeCrud("/planos-consulta-config", planosConsultaConfigTable, insertPlanoConsultaConfigSchema, asc(planosConsultaConfigTable.ordem));
makeCrud("/anamnese-validacao-template", anamneseValidacaoTemplateTable, insertAnamneseValidacaoTemplateSchema, asc(anamneseValidacaoTemplateTable.ordem));
makeCrud("/termos-consentimento", termosConsentimentoTable, insertTermoConsentimentoSchema, asc(termosConsentimentoTable.chave));

export default router;
