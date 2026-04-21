/**
 * Rotas de AUDITORES — caixa do CEO
 * GET  /auditores                              → lista 4 personas
 * GET  /auditores/:apelido                     → 1 persona + visibilidade
 * GET  /auditor-mensagens                      → caixa do CEO (filtros, escopada por unidade)
 * POST /auditor-mensagens                      → cria mensagem (interno/teste)
 * POST /auditor-mensagens/:id/confirmar-leitura → CEO clica botao
 * GET  /auditor-eventos                        → últimos eventos Drive (paginado, escopado)
 * GET  /anastomoses                            → walking deads em aberto
 * PATCH /anastomoses/:id                       → mudar status / fechar
 *
 * MULTI-TENANT: extrai unidade_id do JWT (req.user.unidadeId). Perfil
 * 'validador_mestre' (Dr. Caio) ve TODAS as unidades; demais perfis ficam
 * escopados a sua propria unidade.
 */
import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

const PERFIS_CROSS_TENANT = new Set(["validador_mestre", "consultoria_master"]);

function escopo(req: any): { isMaster: boolean; unidadeId: number | null } {
  const perfil = String(req.user?.perfil ?? "");
  const unidadeId = req.user?.unidadeId ?? null;
  return { isMaster: PERFIS_CROSS_TENANT.has(perfil), unidadeId };
}

function fail(res: any, code: number, msg: string, e?: any) {
  if (e) console.error(`[auditores] ${msg}:`, e?.message ?? e);
  res.status(code).json({ error: msg });
}

// ===== AUDITORES (catalogo global, sem PII) =====
router.get("/auditores", async (_req, res): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT a.*, x.rotulo AS area_rotulo, x.descricao AS area_descricao
        FROM auditores a
        JOIN auditor_areas_atuacao x ON x.codigo = a.area_atuacao_codigo
       WHERE a.ativo = true
       ORDER BY x.ordem`);
    res.json(r.rows);
  } catch (e) { fail(res, 500, "erro ao listar auditores", e); }
});

router.get("/auditores/:apelido", async (req, res): Promise<void> => {
  try {
    const r = await pool.query(`
      SELECT a.*, x.rotulo AS area_rotulo, x.descricao AS area_descricao
        FROM auditores a
        JOIN auditor_areas_atuacao x ON x.codigo = a.area_atuacao_codigo
       WHERE a.apelido = $1`, [req.params.apelido]);
    if (r.rowCount === 0) { res.status(404).json({ error: "auditor nao encontrado" }); return; }
    const v = await pool.query(
      `SELECT recurso, escopo, observacao FROM auditor_visibilidade_regras WHERE auditor_id=$1 ORDER BY recurso`,
      [r.rows[0].id]
    );
    res.json({ ...r.rows[0], visibilidade: v.rows });
  } catch (e) { fail(res, 500, "erro ao buscar auditor", e); }
});

// ===== MENSAGENS / CAIXA DO CEO (escopadas por unidade) =====
router.get("/auditor-mensagens", async (req, res): Promise<void> => {
  try {
    const { isMaster, unidadeId } = escopo(req);
    if (!isMaster && unidadeId == null) { res.status(403).json({ error: "sem unidade no token" }); return; }
    const status = String(req.query.status || "PENDENTE").toUpperCase();
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const r = await pool.query(`
      SELECT m.*,
             a.apelido, a.nome AS auditor_nome, a.cor_hex, a.emoji, a.papel,
             x.codigo AS area_codigo, x.rotulo AS area_rotulo,
             u.nome AS unidade_nome
        FROM auditor_mensagens m
        JOIN auditores a ON a.id = m.auditor_id
        JOIN auditor_areas_atuacao x ON x.codigo = a.area_atuacao_codigo
        LEFT JOIN unidades u ON u.id = m.unidade_id
       WHERE ($1='TODAS' OR m.status = $1)
         AND ($2::int IS NULL OR m.unidade_id = $2 OR m.unidade_id IS NULL)
       ORDER BY
         CASE m.prioridade WHEN 'CRITICA' THEN 0 WHEN 'ALTA' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,
         m.criada_em DESC
       LIMIT $3`, [status, isMaster ? null : unidadeId, limit]);
    res.json(r.rows);
  } catch (e) { fail(res, 500, "erro ao listar mensagens", e); }
});

router.post("/auditor-mensagens", async (req, res): Promise<void> => {
  try {
    const { isMaster, unidadeId } = escopo(req);
    const b = req.body || {};
    // Forca a mensagem para a unidade do usuario, exceto master
    const targetUnidade = isMaster ? (b.unidade_id ?? null) : unidadeId;
    if (!isMaster && targetUnidade == null) { res.status(403).json({ error: "sem unidade no token" }); return; }
    if (!b.auditor_id || !b.titulo) { res.status(400).json({ error: "auditor_id e titulo obrigatorios" }); return; }
    const ceoId = req.user?.id ?? b.ceo_usuario_id;
    const r = await pool.query(`
      INSERT INTO auditor_mensagens
        (auditor_id, ceo_usuario_id, unidade_id, titulo, bullets, pergunta, prioridade, ref_categoria, ref_id, link_externo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b.auditor_id, ceoId, targetUnidade, b.titulo,
       JSON.stringify(b.bullets || []), b.pergunta || null,
       b.prioridade || 'NORMAL', b.ref_categoria || null, b.ref_id || null, b.link_externo || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { fail(res, 500, "erro ao criar mensagem", e); }
});

router.post("/auditor-mensagens/:id/confirmar-leitura", async (req, res): Promise<void> => {
  try {
    const { isMaster, unidadeId } = escopo(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id invalido" }); return; }
    const decisao = String(req.body?.decisao || 'LI').toUpperCase();
    if (!["LI", "DECIDIR", "ADIAR"].includes(decisao)) { res.status(400).json({ error: "decisao invalida" }); return; }
    const proxima_em = decisao === 'ADIAR' ? `now() + interval '24 hours'` : `NULL`;
    const novoStatus = decisao === 'LI' ? 'LIDA' : decisao === 'DECIDIR' ? 'DECIDIDA' : 'ADIADA';
    const r = await pool.query(`
      UPDATE auditor_mensagens
         SET status=$2, decisao=$3,
             lida_em = COALESCE(lida_em, now()),
             decidida_em = CASE WHEN $2='DECIDIDA' THEN now() ELSE decidida_em END,
             proximo_lembrete_em = ${proxima_em},
             decisao_payload = $4
       WHERE id=$1
         AND ($5::int IS NULL OR unidade_id = $5 OR unidade_id IS NULL)
       RETURNING *`,
      [id, novoStatus, decisao, JSON.stringify(req.body?.payload || {}), isMaster ? null : unidadeId]);
    if (r.rowCount === 0) { res.status(404).json({ error: "mensagem nao encontrada ou sem acesso" }); return; }
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, "erro ao confirmar leitura", e); }
});

// ===== EVENTOS DRIVE (escopados) =====
router.get("/auditor-eventos", async (req, res): Promise<void> => {
  try {
    const { isMaster, unidadeId } = escopo(req);
    if (!isMaster && unidadeId == null) { res.status(403).json({ error: "sem unidade no token" }); return; }
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const r = await pool.query(
      `SELECT * FROM auditor_eventos_drive
        WHERE ($1::int IS NULL OR unidade_id = $1 OR unidade_id IS NULL)
        ORDER BY ts DESC LIMIT $2`,
      [isMaster ? null : unidadeId, limit]
    );
    res.json(r.rows);
  } catch (e) { fail(res, 500, "erro ao listar eventos", e); }
});

// ===== ANASTOMOSES (so master) =====
router.get("/anastomoses", async (req, res): Promise<void> => {
  try {
    const { isMaster } = escopo(req);
    if (!isMaster) { res.status(403).json({ error: "anastomoses sao do CEO/master" }); return; }
    const status = String(req.query.status || "aberta");
    const r = await pool.query(
      `SELECT * FROM anastomoses_pendentes
        WHERE ($1='todas' OR status=$1)
        ORDER BY CASE criticidade WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
                 criada_em DESC`,
      [status]);
    res.json(r.rows);
  } catch (e) { fail(res, 500, "erro ao listar anastomoses", e); }
});

router.patch("/anastomoses/:id", async (req, res): Promise<void> => {
  try {
    const { isMaster } = escopo(req);
    if (!isMaster) { res.status(403).json({ error: "anastomoses sao do CEO/master" }); return; }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id invalido" }); return; }
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE anastomoses_pendentes
          SET status = COALESCE($2, status),
              proximo_passo = COALESCE($3, proximo_passo),
              fechada_em = CASE WHEN $2='fechada' THEN now() ELSE fechada_em END,
              fechamento_nota = COALESCE($4, fechamento_nota)
        WHERE id=$1 RETURNING *`,
      [id, b.status || null, b.proximo_passo || null, b.fechamento_nota || null]);
    if (r.rowCount === 0) { res.status(404).json({ error: "nao encontrada" }); return; }
    res.json(r.rows[0]);
  } catch (e) { fail(res, 500, "erro ao atualizar anastomose", e); }
});

export default router;
