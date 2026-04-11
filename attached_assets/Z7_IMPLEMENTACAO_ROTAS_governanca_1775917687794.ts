/**
 * GAP 3: ROTAS DO PAINEL DE GOVERNANÇA
 * =====================================
 * Arquivo: artifacts/api-server/src/routes/governanca.ts
 * 
 * Painel de governança com semáforo VERDE/AMARELO/VERMELHO:
 * - GET /governanca/dashboard — Dashboard com KPIs
 * - GET /governanca/timeline — Timeline de últimas ações
 * - GET /governanca/semaforo — Status geral do sistema
 */

import { Router } from "express";
import { 
  db, 
  filaPreceptorTable, 
  validacoesCascataTable, 
  alertasTwilioTable,
  arquivosExamesTable,
  usuariosTable,
  auditoriaCascataTable,
  pacientesTable,
} from "@workspace/db";
import { eq, and, sql, lte } from "drizzle-orm";
import { calcularTempoRestante, determinarCorSemaforoFilaPreceptor } from "@workspace/db/schema";

const router = Router();

// ========== GET /governanca/dashboard — Dashboard com KPIs ==========
router.get("/governanca/dashboard", async (_req, res): Promise<void> => {
  try {
    // KPI 1: Fila do Preceptor Pendentes
    const filaPreceptorPendentes = await db
      .select({ count: sql<number>`count(*)` })
      .from(filaPreceptorTable)
      .where(eq(filaPreceptorTable.status, "PENDENTE"));
    
    // KPI 2: Validações Cascata Pendentes
    const validacoesPendentes = await db
      .select({ count: sql<number>`count(*)` })
      .from(validacoesCascataTable)
      .where(eq(validacoesCascataTable.status, "PENDENTE"));
    
    // KPI 3: Alertas Não Confirmados
    const alertasNaoConfirmados = await db
      .select({ count: sql<number>`count(*)` })
      .from(alertasTwilioTable)
      .where(sql`${alertasTwilioTable.status} IN ('ENVIADO', 'ENTREGUE', 'LIDO')`);
    
    // KPI 4: Exames Não Recebidos
    const examesNaoRecebidos = await db
      .select({ count: sql<number>`count(*)` })
      .from(arquivosExamesTable)
      .where(eq(arquivosExamesTable.status, "RECEBIDO"));
    
    // Determinar status geral
    let statusGeral: "VERDE" | "AMARELO" | "VERMELHO" = "VERDE";
    const filaCount = Number(filaPreceptorPendentes[0]?.count || 0);
    const validacaoCount = Number(validacoesPendentes[0]?.count || 0);
    const alertaCount = Number(alertasNaoConfirmados[0]?.count || 0);
    
    if (filaCount > 10 || validacaoCount > 20 || alertaCount > 5) {
      statusGeral = "VERMELHO";
    } else if (filaCount > 5 || validacaoCount > 10 || alertaCount > 3) {
      statusGeral = "AMARELO";
    }
    
    res.json({
      status_geral: statusGeral,
      timestamp: new Date(),
      kpis: {
        fila_preceptor_pendentes: {
          valor: filaCount,
          status: filaCount > 5 ? "VERMELHO" : filaCount > 2 ? "AMARELO" : "VERDE",
          descricao: `${filaCount} prontuários aguardando validação`,
        },
        validacoes_cascata_pendentes: {
          valor: validacaoCount,
          status: validacaoCount > 10 ? "VERMELHO" : validacaoCount > 5 ? "AMARELO" : "VERDE",
          descricao: `${validacaoCount} validações em cascata pendentes`,
        },
        alertas_nao_confirmados: {
          valor: alertaCount,
          status: alertaCount > 3 ? "VERMELHO" : alertaCount > 1 ? "AMARELO" : "VERDE",
          descricao: `${alertaCount} alertas não confirmados`,
        },
        exames_nao_recebidos: {
          valor: Number(examesNaoRecebidos[0]?.count || 0),
          status: Number(examesNaoRecebidos[0]?.count || 0) > 8 ? "AMARELO" : "VERDE",
          descricao: `${Number(examesNaoRecebidos[0]?.count || 0)} exames aguardando recebimento`,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /governanca/timeline — Timeline de últimas ações ==========
router.get("/governanca/timeline", async (req, res): Promise<void> => {
  const { limite } = req.query;
  const limit = limite ? parseInt(limite as string, 10) : 20;
  
  try {
    // Timeline de auditoria da cascata
    const timelineAuditoria = await db
      .select({
        timestamp: auditoriaCascataTable.realizadoEm,
        tipo: sql<string>`'CASCATA'`,
        evento: auditoriaCascataTable.acao,
        etapa: auditoriaCascataTable.etapa,
        usuario: usuariosTable.nome,
        motivo: auditoriaCascataTable.motivo,
      })
      .from(auditoriaCascataTable)
      .leftJoin(usuariosTable, eq(auditoriaCascataTable.realizadoPorId, usuariosTable.id))
      .limit(limit);
    
    // Timeline de validações
    const timelineValidacoes = await db
      .select({
        timestamp: validacoesCascataTable.validadoEm,
        tipo: sql<string>`'VALIDACAO'`,
        evento: validacoesCascataTable.status,
        etapa: validacoesCascataTable.etapa,
        usuario: usuariosTable.nome,
        motivo: validacoesCascataTable.observacao,
      })
      .from(validacoesCascataTable)
      .leftJoin(usuariosTable, eq(validacoesCascataTable.validadoPorId, usuariosTable.id))
      .where(sql`${validacoesCascataTable.validadoEm} IS NOT NULL`)
      .limit(limit);
    
    // Combinar e ordenar
    const timeline = [...timelineAuditoria, ...timelineValidacoes]
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
    
    res.json({
      total: timeline.length,
      timeline,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /governanca/semaforo — Status geral do sistema ==========
router.get("/governanca/semaforo", async (_req, res): Promise<void> => {
  try {
    // Verificar filas com prazo crítico
    const agora = new Date();
    const filasComPrazo = await db
      .select({
        id: filaPreceptorTable.id,
        prazoMaximo: filaPreceptorTable.prazoMaximo,
      })
      .from(filaPreceptorTable)
      .where(eq(filaPreceptorTable.status, "PENDENTE"));
    
    let filasCriticas = 0;
    let filasAtencao = 0;
    
    for (const fila of filasComPrazo) {
      const tempoRestante = calcularTempoRestante(fila.prazoMaximo);
      if (tempoRestante.expirado) {
        filasCriticas++;
      } else if (tempoRestante.horas < 6) {
        filasAtencao++;
      }
    }
    
    // Determinar semáforo
    let semaforo: "VERDE" | "AMARELO" | "VERMELHO" = "VERDE";
    if (filasCriticas > 0) {
      semaforo = "VERMELHO";
    } else if (filasAtencao > 0) {
      semaforo = "AMARELO";
    }
    
    res.json({
      semaforo,
      filas_criticas: filasCriticas,
      filas_atencao: filasAtencao,
      timestamp: new Date(),
      descricao: semaforo === "VERDE" 
        ? "Sistema operacional normal"
        : semaforo === "AMARELO"
        ? `${filasAtencao} prontuários com prazo crítico (< 6h)`
        : `${filasCriticas} prontuários com prazo expirado`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /governanca/relatorio — Relatório completo de governança ==========
router.get("/governanca/relatorio", async (req, res): Promise<void> => {
  const { dataInicio, dataFim } = req.query;
  
  try {
    const inicio = dataInicio ? new Date(dataInicio as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fim = dataFim ? new Date(dataFim as string) : new Date();
    
    // Validações realizadas no período
    const validacoesRealizadas = await db
      .select({
        total: sql<number>`count(*)`,
        aprovadas: sql<number>`count(CASE WHEN ${validacoesCascataTable.status} = 'APROVADO' THEN 1 END)`,
        rejeitadas: sql<number>`count(CASE WHEN ${validacoesCascataTable.status} = 'REJEITADO' THEN 1 END)`,
      })
      .from(validacoesCascataTable)
      .where(and(
        sql`${validacoesCascataTable.validadoEm} >= ${inicio}`,
        sql`${validacoesCascataTable.validadoEm} <= ${fim}`
      ));
    
    // Alterações na cascata
    const alteracoesCascata = await db
      .select({
        total: sql<number>`count(*)`,
        ligadas: sql<number>`count(CASE WHEN ${auditoriaCascataTable.acao} = 'LIGOU' THEN 1 END)`,
        desligadas: sql<number>`count(CASE WHEN ${auditoriaCascataTable.acao} = 'DESLIGOU' THEN 1 END)`,
      })
      .from(auditoriaCascataTable)
      .where(and(
        sql`${auditoriaCascataTable.realizadoEm} >= ${inicio}`,
        sql`${auditoriaCascataTable.realizadoEm} <= ${fim}`
      ));
    
    // Alertas enviados
    const alertasEnviados = await db
      .select({
        total: sql<number>`count(*)`,
        confirmados: sql<number>`count(CASE WHEN ${alertasTwilioTable.status} = 'CONFIRMADO' THEN 1 END)`,
        nao_confirmados: sql<number>`count(CASE WHEN ${alertasTwilioTable.status} != 'CONFIRMADO' THEN 1 END)`,
      })
      .from(alertasTwilioTable)
      .where(and(
        sql`${alertasTwilioTable.enviadoEm} >= ${inicio}`,
        sql`${alertasTwilioTable.enviadoEm} <= ${fim}`
      ));
    
    res.json({
      periodo: { inicio, fim },
      validacoes: validacoesRealizadas[0],
      cascata: alteracoesCascata[0],
      alertas: alertasEnviados[0],
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
