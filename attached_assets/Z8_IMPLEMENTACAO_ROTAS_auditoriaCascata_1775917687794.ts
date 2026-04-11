/**
 * GAP 4: ROTAS DE AUDITORIA DA CASCATA
 * =====================================
 * Arquivo: artifacts/api-server/src/routes/auditoriaCascata.ts
 * 
 * Rotas para gerenciar auditoria de toggle da cascata:
 * - GET /cascata-validacao/auditoria — Listar log de auditoria
 * - POST /cascata-validacao/toggle — Ligar/desligar etapa com log
 * - GET /cascata-validacao/auditoria/stats — Estatísticas
 */

import { Router } from "express";
import { 
  db, 
  auditoriaCascataTable, 
  cascataValidacaoConfigTable,
  usuariosTable 
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { 
  formatarAcaoAuditoria, 
  criarEntradaAuditoria 
} from "@workspace/db/schema";

const router = Router();

// ========== GET /cascata-validacao/auditoria — Listar log de auditoria ==========
router.get("/cascata-validacao/auditoria", async (req, res): Promise<void> => {
  const { etapa, acao, limite } = req.query;
  const limit = limite ? parseInt(limite as string, 10) : 50;
  
  try {
    const conditions: any[] = [];
    
    if (etapa) {
      conditions.push(eq(auditoriaCascataTable.etapa, String(etapa)));
    }
    
    if (acao) {
      conditions.push(eq(auditoriaCascataTable.acao, String(acao)));
    }
    
    const auditoria = await db
      .select({
        id: auditoriaCascataTable.id,
        acao: auditoriaCascataTable.acao,
        etapa: auditoriaCascataTable.etapa,
        valorAnterior: auditoriaCascataTable.valorAnterior,
        valorNovo: auditoriaCascataTable.valorNovo,
        usuario: usuariosTable.nome,
        usuarioId: auditoriaCascataTable.realizadoPorId,
        motivo: auditoriaCascataTable.motivo,
        realizadoEm: auditoriaCascataTable.realizadoEm,
      })
      .from(auditoriaCascataTable)
      .leftJoin(usuariosTable, eq(auditoriaCascataTable.realizadoPorId, usuariosTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${auditoriaCascataTable.realizadoEm} DESC`)
      .limit(limit);
    
    // Formatar ações para exibição
    const auditoriaFormatada = auditoria.map(a => ({
      ...a,
      acaoFormatada: formatarAcaoAuditoria(a as any),
    }));
    
    res.json(auditoriaFormatada);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POST /cascata-validacao/toggle — Ligar/desligar etapa com log ==========
router.post("/cascata-validacao/toggle", async (req, res): Promise<void> => {
  const { 
    etapa, 
    novoValor, 
    realizadoPorId, 
    motivo 
  } = req.body;
  
  if (!etapa || novoValor === undefined || !realizadoPorId) {
    res.status(400).json({ 
      error: "etapa, novoValor e realizadoPorId são obrigatórios" 
    });
    return;
  }
  
  try {
    // Buscar valor anterior
    const [configAnterior] = await db
      .select()
      .from(cascataValidacaoConfigTable)
      .limit(1);
    
    const valorAnterior = configAnterior ? (configAnterior as any)[etapa.toLowerCase()] : false;
    
    // Atualizar configuração
    const [configNova] = await db
      .update(cascataValidacaoConfigTable)
      .set({
        [etapa.toLowerCase()]: novoValor,
        atualizadoEm: new Date(),
      })
      .returning();
    
    // Registrar na auditoria
    const acao = novoValor ? "LIGOU" : "DESLIGOU";
    const entradaAuditoria = criarEntradaAuditoria(
      acao,
      etapa as any,
      realizadoPorId,
      motivo,
      valorAnterior,
      novoValor
    );
    
    const [auditoria] = await db
      .insert(auditoriaCascataTable)
      .values(entradaAuditoria)
      .returning();
    
    res.json({
      config: configNova,
      auditoria,
      mensagem: `${acao} ${etapa} com sucesso`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /cascata-validacao/config — Obter configuração atual ==========
router.get("/cascata-validacao/config", async (_req, res): Promise<void> => {
  try {
    const [config] = await db
      .select()
      .from(cascataValidacaoConfigTable)
      .limit(1);
    
    if (!config) {
      res.status(404).json({ error: "Configuração não encontrada" });
      return;
    }
    
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /cascata-validacao/auditoria/stats — Estatísticas ==========
router.get("/cascata-validacao/auditoria/stats", async (_req, res): Promise<void> => {
  try {
    // Contar por ação
    const porAcao = await db
      .select({
        acao: auditoriaCascataTable.acao,
        count: sql<number>`count(*)`,
      })
      .from(auditoriaCascataTable)
      .groupBy(auditoriaCascataTable.acao);
    
    // Contar por etapa
    const porEtapa = await db
      .select({
        etapa: auditoriaCascataTable.etapa,
        count: sql<number>`count(*)`,
      })
      .from(auditoriaCascataTable)
      .groupBy(auditoriaCascataTable.etapa);
    
    // Contar por usuário (últimos 10 que fizeram mudanças)
    const porUsuario = await db
      .select({
        usuario: usuariosTable.nome,
        usuarioId: auditoriaCascataTable.realizadoPorId,
        count: sql<number>`count(*)`,
      })
      .from(auditoriaCascataTable)
      .leftJoin(usuariosTable, eq(auditoriaCascataTable.realizadoPorId, usuariosTable.id))
      .groupBy(auditoriaCascataTable.realizadoPorId, usuariosTable.nome)
      .orderBy(sql`count(*) DESC`)
      .limit(10);
    
    // Última mudança
    const [ultimaMudanca] = await db
      .select({
        acao: auditoriaCascataTable.acao,
        etapa: auditoriaCascataTable.etapa,
        usuario: usuariosTable.nome,
        realizadoEm: auditoriaCascataTable.realizadoEm,
      })
      .from(auditoriaCascataTable)
      .leftJoin(usuariosTable, eq(auditoriaCascataTable.realizadoPorId, usuariosTable.id))
      .orderBy(sql`${auditoriaCascataTable.realizadoEm} DESC`)
      .limit(1);
    
    res.json({
      por_acao: porAcao,
      por_etapa: porEtapa,
      por_usuario: porUsuario,
      ultima_mudanca: ultimaMudanca,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /cascata-validacao/auditoria/usuario/:usuarioId — Auditoria por usuário ==========
router.get("/cascata-validacao/auditoria/usuario/:usuarioId", async (req, res): Promise<void> => {
  const usuarioId = parseInt(req.params.usuarioId as string, 10);
  
  try {
    const auditoria = await db
      .select({
        id: auditoriaCascataTable.id,
        acao: auditoriaCascataTable.acao,
        etapa: auditoriaCascataTable.etapa,
        motivo: auditoriaCascataTable.motivo,
        realizadoEm: auditoriaCascataTable.realizadoEm,
      })
      .from(auditoriaCascataTable)
      .where(eq(auditoriaCascataTable.realizadoPorId, usuarioId))
      .orderBy(sql`${auditoriaCascataTable.realizadoEm} DESC`);
    
    res.json(auditoria);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
