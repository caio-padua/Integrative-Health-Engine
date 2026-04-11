/**
 * GAP 2: ROTAS DA FILA DO PRECEPTOR
 * ==================================
 * Arquivo: artifacts/api-server/src/routes/filaPreceptor.ts
 * 
 * Rotas para gerenciar fila do preceptor:
 * - GET /fila-preceptor — Lista prontuários pendentes
 * - POST /fila-preceptor/:id/validar — Validar prontuário
 * - POST /fila-preceptor/:id/rejeitar — Rejeitar prontuário
 * - POST /fila-preceptor/:id/assinar — Assinar digitalmente
 * - GET /fila-preceptor/stats — Estatísticas
 */

import { Router } from "express";
import { db, filaPreceptorTable, pacientesTable, usuariosTable } from "@workspace/db";
import { eq, and, lte, sql } from "drizzle-orm";
import { calcularTempoRestante, determinarCorSemaforoFilaPreceptor } from "@workspace/db/schema";

const router = Router();

// ========== GET /fila-preceptor — Lista prontuários pendentes ==========
router.get("/fila-preceptor", async (req, res): Promise<void> => {
  const { status, ordenar } = req.query;
  
  const conditions: any[] = [];
  if (status) conditions.push(eq(filaPreceptorTable.status, String(status)));
  
  const filas = await db
    .select({
      id: filaPreceptorTable.id,
      pacienteId: filaPreceptorTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      status: filaPreceptorTable.status,
      prazoMaximo: filaPreceptorTable.prazoMaximo,
      escalationAtivo: filaPreceptorTable.escalationAtivo,
      validadoPorNome: usuariosTable.nome,
      criadoEm: filaPreceptorTable.criadoEm,
    })
    .from(filaPreceptorTable)
    .leftJoin(pacientesTable, eq(filaPreceptorTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(filaPreceptorTable.validadoPorId, usuariosTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      ordenar === "prazo" 
        ? filaPreceptorTable.prazoMaximo 
        : filaPreceptorTable.criadoEm
    );
  
  // Adicionar tempo restante e cor do semáforo
  const filasComTempo = filas.map(fila => {
    const tempoRestante = calcularTempoRestante(fila.prazoMaximo);
    const cor = determinarCorSemaforoFilaPreceptor(tempoRestante.horas);
    
    return {
      ...fila,
      tempoRestante,
      corSemaforoPreceptor: cor,
    };
  });
  
  res.json(filasComTempo);
});

// ========== GET /fila-preceptor/:id — Detalhe de um prontuário ==========
router.get("/fila-preceptor/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  
  const [fila] = await db
    .select({
      fila: filaPreceptorTable,
      pacienteNome: pacientesTable.nome,
      pacienteCpf: pacientesTable.cpf,
      validadoPorNome: usuariosTable.nome,
    })
    .from(filaPreceptorTable)
    .leftJoin(pacientesTable, eq(filaPreceptorTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(filaPreceptorTable.validadoPorId, usuariosTable.id))
    .where(eq(filaPreceptorTable.id, id));
  
  if (!fila) {
    res.status(404).json({ error: "Fila do preceptor não encontrada" });
    return;
  }
  
  const tempoRestante = calcularTempoRestante(fila.fila.prazoMaximo);
  const cor = determinarCorSemaforoFilaPreceptor(tempoRestante.horas);
  
  res.json({
    ...fila,
    tempoRestante,
    corSemaforoPreceptor: cor,
  });
});

// ========== POST /fila-preceptor/:id/validar — Validar prontuário ==========
router.post("/fila-preceptor/:id/validar", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { validadoPorId, observacao } = req.body;
  
  if (!validadoPorId) {
    res.status(400).json({ error: "validadoPorId é obrigatório" });
    return;
  }
  
  try {
    const [fila] = await db
      .update(filaPreceptorTable)
      .set({
        status: "VALIDADO",
        validadoPorId,
        validadoEm: new Date(),
        observacaoValidacao: observacao,
      })
      .where(eq(filaPreceptorTable.id, id))
      .returning();
    
    if (!fila) {
      res.status(404).json({ error: "Fila do preceptor não encontrada" });
      return;
    }
    
    res.json(fila);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POST /fila-preceptor/:id/rejeitar — Rejeitar prontuário ==========
router.post("/fila-preceptor/:id/rejeitar", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { motivoRejeicao } = req.body;
  
  if (!motivoRejeicao) {
    res.status(400).json({ error: "motivoRejeicao é obrigatório" });
    return;
  }
  
  try {
    const [fila] = await db
      .update(filaPreceptorTable)
      .set({
        status: "REJEITADO",
        rejeitadoEm: new Date(),
        motivoRejeicao,
      })
      .where(eq(filaPreceptorTable.id, id))
      .returning();
    
    if (!fila) {
      res.status(404).json({ error: "Fila do preceptor não encontrada" });
      return;
    }
    
    res.json(fila);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POST /fila-preceptor/:id/assinar — Assinar digitalmente ==========
router.post("/fila-preceptor/:id/assinar", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { assinaturaDigital } = req.body;
  
  if (!assinaturaDigital) {
    res.status(400).json({ error: "assinaturaDigital é obrigatória" });
    return;
  }
  
  try {
    const [fila] = await db
      .update(filaPreceptorTable)
      .set({
        status: "ASSINADO",
        assinaturaDigital,
        assinadoEm: new Date(),
      })
      .where(eq(filaPreceptorTable.id, id))
      .returning();
    
    if (!fila) {
      res.status(404).json({ error: "Fila do preceptor não encontrada" });
      return;
    }
    
    res.json(fila);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /fila-preceptor/stats — Estatísticas ==========
router.get("/fila-preceptor/stats", async (_req, res): Promise<void> => {
  try {
    const stats = await db
      .select({
        status: filaPreceptorTable.status,
        count: sql<number>`count(*)`,
      })
      .from(filaPreceptorTable)
      .groupBy(filaPreceptorTable.status);
    
    // Contar expirados (prazo máximo < agora)
    const expirados = await db
      .select({ count: sql<number>`count(*)` })
      .from(filaPreceptorTable)
      .where(and(
        lte(filaPreceptorTable.prazoMaximo, new Date()),
        eq(filaPreceptorTable.status, "PENDENTE")
      ));
    
    // Contar com escalation ativo
    const comEscalation = await db
      .select({ count: sql<number>`count(*)` })
      .from(filaPreceptorTable)
      .where(eq(filaPreceptorTable.escalationAtivo, true));
    
    res.json({
      por_status: stats,
      expirados: Number(expirados[0]?.count || 0),
      com_escalation: Number(comEscalation[0]?.count || 0),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POST /fila-preceptor/escalation — Disparar escalation automática ==========
/**
 * Rota auxiliar para disparar escalation automática
 * Deve ser chamada por um job/cron a cada 6h
 */
router.post("/fila-preceptor/escalation", async (_req, res): Promise<void> => {
  try {
    const agora = new Date();
    const seisHorasAtras = new Date(agora.getTime() - 6 * 60 * 60 * 1000);
    
    // Encontrar filas pendentes que não tiveram escalation e estão próximas do prazo
    const filasParaEscalar = await db
      .select()
      .from(filaPreceptorTable)
      .where(and(
        eq(filaPreceptorTable.status, "PENDENTE"),
        eq(filaPreceptorTable.escalationAtivo, false),
        lte(filaPreceptorTable.prazoMaximo, new Date(agora.getTime() + 6 * 60 * 60 * 1000))
      ));
    
    // Ativar escalation
    for (const fila of filasParaEscalar) {
      await db
        .update(filaPreceptorTable)
        .set({
          escalationAtivo: true,
          escalationEnviadoEm: new Date(),
        })
        .where(eq(filaPreceptorTable.id, fila.id));
      
      // TODO: Enviar alerta via Twilio para Dr. Caio
      console.log(`[ESCALATION] Fila ${fila.id} escalada para Dr. Caio`);
    }
    
    res.json({
      escaladas: filasParaEscalar.length,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
