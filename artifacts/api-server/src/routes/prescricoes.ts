/**
 * ROUTES — PRESCRIÇÃO PADCON UNIVERSAL
 * REST API para a tela única de prescrição + emissão multi-PDF.
 */
import { Router } from "express";
import { pool } from "@workspace/db";
import * as fs from "node:fs/promises";
import {
  emitirPrescricao,
  preverEmissao,
} from "../services/emitirPrescricaoService";
import type { BlocoEntrada } from "../services/prescricaoEngine";

const router = Router();

/**
 * Helper IDOR — garante que a prescrição pertence à mesma unidade do
 * médico autenticado. Usado em todas as rotas que tocam uma prescrição
 * por ID. Retorna a linha da prescrição ou null se não autorizada.
 */
async function carregarPrescricaoComEscopo(
  prescricaoId: number,
  req: any
): Promise<any | null> {
  const r = await pool.query(`SELECT * FROM prescricoes WHERE id=$1`, [prescricaoId]);
  if (r.rowCount === 0) return null;
  const p = r.rows[0];
  const userUnidade = req.user?.unidadeId ?? null;
  const perfil = String(req.user?.perfil ?? "");
  // admin/diretoria veem tudo; demais perfis ficam restritos à sua unidade
  if (perfil.includes("admin") || perfil.includes("diretor")) return p;
  if (userUnidade != null && p.unidade_id != null && p.unidade_id !== userUnidade) {
    return null;
  }
  return p;
}

// ===== GET /prescricoes/tipos-receita-anvisa  → catálogo dos 14 tipos =====
// (REGISTRADA ANTES de /prescricoes/:id para evitar colisão de rota)
router.get("/prescricoes/tipos-receita-anvisa", async (_req, res): Promise<void> => {
  try {
    const r = await pool.query(
      `SELECT * FROM tipos_receita_anvisa WHERE ativo=true ORDER BY ordem, codigo`
    );
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== POST /prescricoes  → cria rascunho =====
router.post("/prescricoes", async (req, res): Promise<void> => {
  try {
    const {
      paciente_id,
      medico_id,
      unidade_id,
      cids = [],
      observacoes_gerais,
      duracao_dias,
    } = req.body ?? {};
    if (!paciente_id || !medico_id) {
      res.status(400).json({ error: "paciente_id e medico_id obrigatórios" });
      return;
    }
    const r = await pool.query(
      `INSERT INTO prescricoes
        (paciente_id, medico_id, unidade_id, cids, observacoes_gerais, duracao_dias, status)
       VALUES ($1,$2,$3,$4,$5,$6,'rascunho') RETURNING *`,
      [paciente_id, medico_id, unidade_id ?? null, cids, observacoes_gerais ?? null, duracao_dias ?? null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET /prescricoes/:id  → carrega prescrição completa =====
router.get("/prescricoes/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id inválido" }); return; }
    const p = await carregarPrescricaoComEscopo(id, req);
    if (!p) {
      res.status(404).json({ error: "não encontrada ou sem permissão" });
      return;
    }
    const blocos = await pool.query(
      `SELECT * FROM prescricao_blocos WHERE prescricao_id=$1 ORDER BY ordem`,
      [id]
    );
    const blocosOut: any[] = [];
    for (const b of blocos.rows) {
      const ativos = await pool.query(
        `SELECT * FROM prescricao_bloco_ativos WHERE bloco_id=$1 ORDER BY ordem`,
        [b.id]
      );
      blocosOut.push({ ...b, ativos: ativos.rows });
    }
    res.json({ ...p, blocos: blocosOut });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== POST /prescricoes/:id/blocos → adiciona bloco =====
router.post("/prescricoes/:id/blocos", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id inválido" }); return; }
    const escopo = await carregarPrescricaoComEscopo(id, req);
    if (!escopo) { res.status(404).json({ error: "não encontrada ou sem permissão" }); return; }
    const {
      titulo_apelido,
      titulo_categoria = "FÓRMULA",
      titulo_abrev_principal,
      via_administracao = "ORAL",
      forma_farmaceutica_sugestao,
      observacoes,
      ativos = [],
      tipo_bloco = "MANIPULADO_FARMACIA",
      destino_dispensacao = "FAMA",
    } = req.body ?? {};
    const ordemR = await pool.query(
      `SELECT COALESCE(MAX(ordem),0)+1 AS prox FROM prescricao_blocos WHERE prescricao_id=$1`,
      [id]
    );
    const ordem = ordemR.rows[0].prox;

    const ins = await pool.query(
      `INSERT INTO prescricao_blocos
        (prescricao_id, ordem, titulo_categoria, titulo_abrev_principal,
         titulo_apelido, tipo_bloco, via_administracao, forma_farmaceutica_sugestao,
         observacoes, destino_dispensacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        id,
        ordem,
        titulo_categoria,
        titulo_abrev_principal ?? null,
        titulo_apelido,
        tipo_bloco,
        via_administracao,
        forma_farmaceutica_sugestao ?? null,
        observacoes ?? null,
        destino_dispensacao,
      ]
    );
    const bloco = ins.rows[0];
    let ordemAtivo = 1;
    for (const a of ativos) {
      await pool.query(
        `INSERT INTO prescricao_bloco_ativos
          (bloco_id, ordem, nome_ativo, dose_valor, dose_unidade,
           observacao, tipo_receita_anvisa_codigo, controlado, farmacia_padrao)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          bloco.id,
          ordemAtivo++,
          a.nome_ativo ?? a.nome,
          a.dose_valor ?? 0,
          a.dose_unidade ?? "mg",
          a.observacao ?? null,
          a.tipo_receita_anvisa_codigo ?? "BRANCA_SIMPLES",
          !!a.controlado,
          a.farmacia_padrao ?? null,
        ]
      );
    }
    res.status(201).json(bloco);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== DELETE /prescricoes/:id/blocos/:blocoId =====
router.delete("/prescricoes/:id/blocos/:blocoId", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const blocoId = Number(req.params.blocoId);
    if (!Number.isFinite(id) || !Number.isFinite(blocoId)) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    const escopo = await carregarPrescricaoComEscopo(id, req);
    if (!escopo) { res.status(404).json({ error: "não encontrada ou sem permissão" }); return; }
    await pool.query(
      `DELETE FROM prescricao_blocos WHERE id=$1 AND prescricao_id=$2`,
      [blocoId, id]
    );
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== POST /prescricoes/preview  → preview live do motor (sem persistir) =====
router.post("/prescricoes/preview", async (req, res): Promise<void> => {
  try {
    const blocos: BlocoEntrada[] = req.body?.blocos ?? [];
    const result = preverEmissao(blocos);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ===== POST /prescricoes/:id/emitir  → gera PDFs =====
router.post("/prescricoes/:id/emitir", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id inválido" }); return; }
    const escopo = await carregarPrescricaoComEscopo(id, req);
    if (!escopo) { res.status(404).json({ error: "não encontrada ou sem permissão" }); return; }
    const result = await emitirPrescricao({ prescricao_id: id });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET /prescricoes/:id/pdfs  → lista PDFs emitidos =====
router.get("/prescricoes/:id/pdfs", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id inválido" }); return; }
    const escopo = await carregarPrescricaoComEscopo(id, req);
    if (!escopo) { res.status(404).json({ error: "não encontrada ou sem permissão" }); return; }
    const r = await pool.query(
      `SELECT * FROM prescricao_pdfs_emitidos WHERE prescricao_id=$1 ORDER BY ordem`,
      [id]
    );
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET /prescricoes/pdfs/:pdfId/download  → baixa o PDF binário =====
router.get("/prescricoes/pdfs/:pdfId/download", async (req, res): Promise<void> => {
  try {
    const pdfId = Number(req.params.pdfId);
    if (!Number.isFinite(pdfId)) { res.status(400).json({ error: "id inválido" }); return; }
    const r = await pool.query(
      `SELECT * FROM prescricao_pdfs_emitidos WHERE id=$1`,
      [pdfId]
    );
    if (r.rowCount === 0) {
      res.status(404).end();
      return;
    }
    // IDOR: garante que o PDF pertence a uma prescrição da unidade do usuário
    const escopo = await carregarPrescricaoComEscopo(r.rows[0].prescricao_id, req);
    if (!escopo) { res.status(404).end(); return; }
    const file = r.rows[0].arquivo_path;
    const buf = await fs.readFile(file);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="prescricao_${r.rows[0].prescricao_id}_${r.rows[0].ordem}.pdf"`
    );
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET /prescricoes/medico/:medicoId/cota-sncr  → consulta cotas =====
router.get("/prescricoes/medico/:medicoId/cota-sncr", async (req, res): Promise<void> => {
  try {
    const medicoId = Number(req.params.medicoId);
    const r = await pool.query(
      `SELECT id, nome, cota_sncr_b1, cota_sncr_b2, cota_sncr_a1,
              cota_sncr_a2, cota_sncr_a3,
              numero_certificado_icp_brasil, uf_atuacao_principal,
              numeracao_local_vigilancia, data_ultima_atualizacao_cota
       FROM usuarios WHERE id=$1`,
      [medicoId]
    );
    if (r.rowCount === 0) {
      res.status(404).end();
      return;
    }
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== PUT /prescricoes/medico/:medicoId/cota-sncr  → atualiza cotas =====
router.put("/prescricoes/medico/:medicoId/cota-sncr", async (req, res): Promise<void> => {
  try {
    const medicoId = Number(req.params.medicoId);
    const {
      cota_sncr_b1,
      cota_sncr_b2,
      cota_sncr_a1,
      cota_sncr_a2,
      cota_sncr_a3,
      numero_certificado_icp_brasil,
      uf_atuacao_principal,
      numeracao_local_vigilancia,
    } = req.body ?? {};
    await pool.query(
      `UPDATE usuarios SET
         cota_sncr_b1 = COALESCE($1, cota_sncr_b1),
         cota_sncr_b2 = COALESCE($2, cota_sncr_b2),
         cota_sncr_a1 = COALESCE($3, cota_sncr_a1),
         cota_sncr_a2 = COALESCE($4, cota_sncr_a2),
         cota_sncr_a3 = COALESCE($5, cota_sncr_a3),
         numero_certificado_icp_brasil = COALESCE($6, numero_certificado_icp_brasil),
         uf_atuacao_principal = COALESCE($7, uf_atuacao_principal),
         numeracao_local_vigilancia = COALESCE($8, numeracao_local_vigilancia),
         data_ultima_atualizacao_cota = now()
       WHERE id = $9`,
      [
        cota_sncr_b1 ?? null,
        cota_sncr_b2 ?? null,
        cota_sncr_a1 ?? null,
        cota_sncr_a2 ?? null,
        cota_sncr_a3 ?? null,
        numero_certificado_icp_brasil ?? null,
        uf_atuacao_principal ?? null,
        numeracao_local_vigilancia ?? null,
        medicoId,
      ]
    );
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET /prescricoes/medico/:medicoId/sncr-log  → log de consumo SNCR =====
router.get("/prescricoes/medico/:medicoId/sncr-log", async (req, res): Promise<void> => {
  try {
    const medicoId = Number(req.params.medicoId);
    const r = await pool.query(
      `SELECT * FROM sncr_consumo_log
       WHERE medico_id=$1
       ORDER BY consumido_em DESC LIMIT 200`,
      [medicoId]
    );
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
