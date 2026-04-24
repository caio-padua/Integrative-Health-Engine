# 🔬 PARMAVAULT-TSUNAMI Wave 5 — Microscópio Eletrônico Dr. Claude

**Geração:** 24/abr/2026
**Operador:** Dr. Replit (codificador)
**Auditor solicitado:** Dr. Claude (orquestrador)
**Solicitante:** Caio Padua (CEO PAWARDS MEDCORE)
**Repositório:** `caio-padua/Integrative-Health-Engine` (privado)
**SHA pinado:** `88c3cd8bce6cb205d2801948f2f2dc627a373b16`

> **REGRA FERRO Caio (replit.md):** zero `db:push`, só `psql IF NOT EXISTS` aditivo.
> Nenhuma migration desta sessão ALTERou tipo de coluna PK. Drift atual: 264 tabelas reais > schema declarado.

---

## 📋 Índice

1. [SHA + URLs raw dos 10 arquivos-chave](#1-urls-raw)
2. [Migrations completas — fonte da verdade do schema](#2-migrations)
3. [Helpers críticos completos](#3-helpers-críticos)
4. [Excel completo + assinatura PDF](#4-excel--pdf)
5. [Snippets cirúrgicos dos arquivos grandes](#5-snippets-cirúrgicos)
6. [Provas SQL reais (selects rodados)](#6-provas-sql)
7. [Gaps detectados — diagnóstico Mortal Kombat](#7-gaps-detectados)
8. [Veredito do Dr. Replit + perguntas pro Dr. Claude](#8-veredito)

---

## 1. URLs raw

Base raw GitHub no SHA `88c3cd8`:
`https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/88c3cd8/<caminho>`

| # | Arquivo | Linhas | Bloco |
|---|---|---:|---|
| 1 | `artifacts/api-server/src/db/migrations/021_wave5_reconciliacao_parmavault.sql` | 114 | B0 |
| 2 | `artifacts/api-server/src/db/migrations/023_wave8_pdf_declarado.sql` | 19 | Onda 3 |
| 3 | `artifacts/api-server/src/db/migrations/027_wave5_trigger_comissao_parmavault.sql` | 80 | B3 / Onda 1 |
| 4 | `artifacts/api-server/src/lib/relatorios/iniciaisLgpd.ts` | 18 | B6 |
| 5 | `artifacts/api-server/src/lib/contratos/verificarUnidadeTemContrato.ts` | 89 | B1 (helper órfão) |
| 6 | `artifacts/api-server/src/lib/relatorios/gerarExcelReconciliacao.ts` | 143 | B6 |
| 7 | `artifacts/api-server/src/lib/relatorios/gerarPdfReconciliacao.ts` | 1042 | B6 |
| 8 | `artifacts/api-server/src/routes/parmavaultReconciliacao.ts` | 833 | B2/B4/B5/B6 backend |
| 9 | `artifacts/api-server/src/routes/prescricoes.ts` | 350 | B1 (rota onde DEVERIA chamar helper) |
| 10 | `artifacts/clinica-motor/src/pages/admin-parmavault-reconciliacao.tsx` | 953 | B5 frontend |

---

## 2. Migrations

### 2.1 — `021_wave5_reconciliacao_parmavault.sql` (114L) — fundação Wave 5

```sql
-- ============================================================================
-- Migration 021 — Wave 5 PARMAVAULT-TSUNAMI Opção 3 (MVP Reconciliação + A2)
-- Aditiva: psql IF NOT EXISTS, REGRA FERRO (zero db:push).
-- 4 tabelas novas + ajuste de NULL em parmavault_receitas.comissao_estimada.
-- ============================================================================

-- 1) Permitir NULL em comissao_estimada (hoje default 0).
ALTER TABLE parmavault_receitas
  ALTER COLUMN comissao_estimada DROP DEFAULT;
ALTER TABLE parmavault_receitas
  ALTER COLUMN comissao_estimada DROP NOT NULL;

-- Coluna de rastreio de origem do cálculo.
ALTER TABLE parmavault_receitas
  ADD COLUMN IF NOT EXISTS comissao_estimada_origem text;
ALTER TABLE parmavault_receitas
  ADD COLUMN IF NOT EXISTS comissao_estimada_em timestamptz;

-- 2) parmavault_emissao_warnings — A2 rastreia avisos disparados na emissão.
CREATE TABLE IF NOT EXISTS parmavault_emissao_warnings (
  id                       serial PRIMARY KEY,
  prescricao_id            integer REFERENCES prescricoes(id),
  bloco_id                 integer REFERENCES prescricao_blocos(id),
  unidade_id               integer REFERENCES unidades(id),
  farmacia_id              integer REFERENCES farmacias_parmavault(id),
  motivo                   text NOT NULL,
  detectado_em             timestamptz NOT NULL DEFAULT now(),
  detectado_por_usuario_id integer REFERENCES usuarios(id),
  decidido_em              timestamptz,
  decidido_por_usuario_id  integer REFERENCES usuarios(id),
  decisao                  text,
  observacoes              text
);
CREATE INDEX IF NOT EXISTS ix_pmv_warnings_farmacia_data
  ON parmavault_emissao_warnings (farmacia_id, detectado_em DESC);
CREATE INDEX IF NOT EXISTS ix_pmv_warnings_unidade_data
  ON parmavault_emissao_warnings (unidade_id, detectado_em DESC);

-- 3) parmavault_declaracoes_farmacia — declarações da farmácia (CSV/manual).
CREATE TABLE IF NOT EXISTS parmavault_declaracoes_farmacia (
  id                    serial PRIMARY KEY,
  receita_id            integer NOT NULL REFERENCES parmavault_receitas(id),
  farmacia_id           integer NOT NULL REFERENCES farmacias_parmavault(id),
  valor_pago_paciente   numeric(10,2) NOT NULL,
  data_compra           date,
  fonte                 text NOT NULL CHECK (fonte IN ('manual','csv','api')),
  declarado_em          timestamptz NOT NULL DEFAULT now(),
  declarado_por_usuario_id integer REFERENCES usuarios(id),
  observacoes           text,
  ativo                 boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS ix_pmv_decl_receita
  ON parmavault_declaracoes_farmacia (receita_id);
CREATE INDEX IF NOT EXISTS ix_pmv_decl_farmacia_data
  ON parmavault_declaracoes_farmacia (farmacia_id, declarado_em DESC);

-- 4) parmavault_repasses — entradas reais de dinheiro registradas pelo CEO.
CREATE TABLE IF NOT EXISTS parmavault_repasses (
  id                serial PRIMARY KEY,
  farmacia_id       integer NOT NULL REFERENCES farmacias_parmavault(id),
  ano_mes           text NOT NULL,           -- 'YYYY-MM'
  valor_repasse     numeric(12,2) NOT NULL,
  data_recebido     date NOT NULL,
  evidencia_texto   text,
  registrado_em     timestamptz NOT NULL DEFAULT now(),
  registrado_por_usuario_id integer REFERENCES usuarios(id),
  observacoes       text,
  ativo             boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS ix_pmv_repasses_farmacia_anomes
  ON parmavault_repasses (farmacia_id, ano_mes);

-- 5) parmavault_relatorios_gerados — snapshot imutável dos PDFs/Excels.
CREATE TABLE IF NOT EXISTS parmavault_relatorios_gerados (
  id                          serial PRIMARY KEY,
  farmacia_id                 integer NOT NULL REFERENCES farmacias_parmavault(id),
  periodo_inicio              date NOT NULL,
  periodo_fim                 date NOT NULL,
  protocolo_hash              text NOT NULL UNIQUE,
  gerado_em                   timestamptz NOT NULL DEFAULT now(),
  gerado_por_usuario_id       integer REFERENCES usuarios(id),
  percentual_comissao_snapshot numeric(5,2) NOT NULL,
  total_previsto_snapshot     numeric(12,2) NOT NULL DEFAULT 0,
  total_declarado_snapshot    numeric(12,2) NOT NULL DEFAULT 0,
  total_recebido_snapshot     numeric(12,2) NOT NULL DEFAULT 0,
  total_gap_snapshot          numeric(12,2) NOT NULL DEFAULT 0,
  total_receitas              integer NOT NULL DEFAULT 0,
  pdf_path                    text,
  excel_path                  text,
  observacoes                 text
);
CREATE INDEX IF NOT EXISTS ix_pmv_rel_farmacia_periodo
  ON parmavault_relatorios_gerados (farmacia_id, periodo_inicio DESC);
```

### 2.2 — `023_wave8_pdf_declarado.sql` (19L) — Onda 3 Mortal Kombat

```sql
-- ════════════════════════════════════════════════════════════════════
-- Migration 023 — Wave 8 PARMAVAULT PDF
-- Adiciona campos prazo_recebimento_dias e parcelas em declarações.
-- Aprovado: Manifesto Dilúvio Planetário (Dr. Claude → Caio → Dr. Replit) Onda 3
-- REGRA FERRO: aditivo, idempotente, IF NOT EXISTS.
-- Uso: PDF de reunião com farmácia mostra prazo + parcelas no rodapé
--      de cada declaração + coluna "Declarado" na tabela página 3.
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE parmavault_declaracoes_farmacia
    ADD COLUMN IF NOT EXISTS prazo_recebimento_dias integer,
    ADD COLUMN IF NOT EXISTS parcelas integer DEFAULT 1;

COMMENT ON COLUMN parmavault_declaracoes_farmacia.prazo_recebimento_dias IS
    'Prazo combinado entre clínica e farmácia para receber o repasse, em dias (ex: 30, 45, 60).';
COMMENT ON COLUMN parmavault_declaracoes_farmacia.parcelas IS
    'Número de parcelas que a farmácia paga o repasse (default 1 = à vista).';
```

### 2.3 — `027_wave5_trigger_comissao_parmavault.sql` (80L) — Onda 1 trigger SQL

```sql
-- ════════════════════════════════════════════════════════════════════
-- Migration 027 — Wave 5 PARMAVAULT — Trigger SQL B3
-- Calcula comissao_estimada na hora do INSERT em parmavault_receitas.
-- Aprovado: Manifesto Dilúvio Planetário (Dr. Claude → Caio → Dr. Replit)
-- Fórmula COALESCE: formula_blend.valor_max → valor_formula_real → valor_formula_estimado
--                   * (farmacias_parmavault.percentual_comissao / 100)
-- REGRA FERRO: aditivo, idempotente. CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS.
-- Defensivo: se base for NULL/0 ou pct NULL, deixa comissao_estimada NULL.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_calc_comissao_parmavault()
RETURNS TRIGGER AS $$
DECLARE
    v_pct  numeric;
    v_max  numeric;
    v_base numeric;
BEGIN
    -- 1) Já veio preenchido? Não toca (preserva valores explícitos).
    IF NEW.comissao_estimada IS NOT NULL AND NEW.comissao_estimada > 0 THEN
        RETURN NEW;
    END IF;

    -- 2) Busca % comissão da farmácia.
    SELECT fp.percentual_comissao INTO v_pct
    FROM farmacias_parmavault fp
    WHERE fp.id = NEW.farmacia_id;

    -- 3) Busca valor_max do blend (se existir blend_id).
    IF NEW.blend_id IS NOT NULL THEN
        SELECT fb.valor_max INTO v_max
        FROM formula_blend fb
        WHERE fb.id = NEW.blend_id;
    END IF;

    -- 4) Base preferida: valor_max do blend, depois valor real, depois estimado.
    v_base := COALESCE(
        NULLIF(v_max, 0),
        NULLIF(NEW.valor_formula_real, 0),
        NULLIF(NEW.valor_formula_estimado, 0)
    );

    -- 5) Calcula se temos base + pct válidos.
    IF v_base IS NOT NULL AND v_base > 0 AND v_pct IS NOT NULL AND v_pct > 0 THEN
        NEW.comissao_estimada        := ROUND(v_base * (v_pct / 100.0), 2);
        NEW.comissao_estimada_origem := CASE
            WHEN v_max IS NOT NULL AND v_max > 0  THEN 'trigger_insert_formula_blend_valor_max'
            WHEN NEW.valor_formula_real > 0       THEN 'trigger_insert_valor_formula_real'
            ELSE                                       'trigger_insert_valor_formula_estimado'
        END;
        NEW.comissao_estimada_em := now();
    ELSE
        NEW.comissao_estimada        := NULL;
        NEW.comissao_estimada_origem := 'trigger_insert_sem_base';
        NEW.comissao_estimada_em     := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_comissao ON parmavault_receitas;
CREATE TRIGGER trg_calc_comissao
    BEFORE INSERT ON parmavault_receitas
    FOR EACH ROW
    EXECUTE FUNCTION fn_calc_comissao_parmavault();
```

---

## 3. Helpers críticos

### 3.1 — `iniciaisLgpd.ts` (18L) — anonimização LGPD pra PDFs/Excels

```ts
// ════════════════════════════════════════════════════════════════════
// LGPD helper: nome → iniciais
// 'Caio Padua'        → 'C.P.'
// 'maria das gracas'  → 'M.D.G.'
// 'jose'              → 'J.'
// (fallback) ''       → '—'
// ════════════════════════════════════════════════════════════════════
export function iniciaisPaciente(nome: string | null | undefined): string {
  if (!nome) return "—";
  const partes = String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "—";
  return partes.map((p) => p[0]!.toUpperCase() + ".").join("");
}
```

### 3.2 — `verificarUnidadeTemContrato.ts` (89L) — **HELPER ÓRFÃO B1** ⚠️

> **Atenção Dr. Claude:** este arquivo existe e está pronto, mas **NÃO é importado nem chamado em lugar nenhum** dentro de `routes/prescricoes.ts`. Ver Seção 5.1 e 7.1.

```ts
// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Bloco B1 (A2 light)
// verificarUnidadeTemContrato(unidade_id) → { temContrato, qtd, mensagem }
//
// Caminho P aprovado pelo Caio + Dr. Claude: warning é POR UNIDADE
// (nao por farmacia especifica), porque o codigo de emissao atual
// nao atribui farmacias_parmavault.id por receita. Wave 6 vai trocar.
//
// Uso: chamado dentro de emitirPrescricao ANTES de comecar a gerar
// PDFs. Resultado entra no campo `alertas` da resposta. Modo B —
// nunca bloqueia, so avisa.
// ════════════════════════════════════════════════════════════════════
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type ResultadoUnidadeContrato = {
  temContrato: boolean;
  qtd: number;
  mensagem: string;
};

export async function verificarUnidadeTemContrato(
  unidade_id: number | null | undefined,
): Promise<ResultadoUnidadeContrato> {
  if (!unidade_id || unidade_id <= 0) {
    return {
      temContrato: false,
      qtd: 0,
      mensagem: "⚠️ Prescrição sem unidade vinculada — não foi possível verificar contratos com farmácias parceiras.",
    };
  }

  try {
    const r = await db.execute(sql`
      SELECT COUNT(*)::int AS qtd
      FROM farmacias_unidades_contrato
      WHERE unidade_id = ${unidade_id}
        AND ativo = true
        AND vigencia_inicio <= CURRENT_DATE
        AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
    `);
    const qtd = Number((r.rows[0] as any)?.qtd ?? 0);
    if (qtd > 0) {
      return { temContrato: true, qtd, mensagem: "" };
    }
    return {
      temContrato: false,
      qtd: 0,
      mensagem: "⚠️ Esta unidade não tem contrato vigente com nenhuma farmácia parceira. Confirma emissão?",
    };
  } catch {
    return {
      temContrato: false,
      qtd: 0,
      mensagem: "⚠️ Não foi possível verificar contratos vigentes (erro interno) — emissão prossegue.",
    };
  }
}

/**
 * Grava em parmavault_emissao_warnings o evento detectado, pra
 * relatorio CEO ver quantas emissoes saem sem contrato.
 */
export async function registrarWarningEmissao(args: {
  prescricao_id: number;
  unidade_id: number | null;
  motivo: "sem_contrato_unidade" | "unidade_nao_vinculada" | "erro_verificacao";
  detectado_por_usuario_id?: number | null;
  observacoes?: string | null;
}): Promise<number | null> {
  try {
    const r = await db.execute(sql`
      INSERT INTO parmavault_emissao_warnings
        (prescricao_id, unidade_id, motivo, detectado_por_usuario_id, observacoes)
      VALUES (
        ${args.prescricao_id},
        ${args.unidade_id ?? null},
        ${args.motivo},
        ${args.detectado_por_usuario_id ?? null},
        ${args.observacoes ?? null}
      )
      RETURNING id
    `);
    return Number((r.rows[0] as any)?.id ?? 0) || null;
  } catch {
    return null;
  }
}
```

---

## 4. Excel + PDF

### 4.1 — `gerarExcelReconciliacao.ts` (143L) — Excel 3 abas COMPLETO

> **Deviation B6:** plano original pedia `exceljs`, código usa `xlsx` (já instalado, mais leve). Funcionalidade equivalente. Documentado no header do arquivo.

```ts
// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Bloco B6 · Excel reconciliacao (3 abas)
// 1) Resumo Mensal  2) Detalhe por Receita  3) Repasses Registrados
// Usa xlsx (ja instalado no api-server, mais leve que exceljs).
// ════════════════════════════════════════════════════════════════════
import * as XLSX from "xlsx";
import { iniciaisPaciente } from "./iniciaisLgpd.js";

export type DadosExcelReconciliacao = {
  farmacia: { id: number; nome: string; percentual_comissao: number };
  periodo: { inicio: string; fim: string };
  protocolo: string;
  serie_mensal: Array<{
    mes: string;
    qtd_receitas: number;
    previsto: number;
    declarado: number;
    recebido: number;
    gap: number;
  }>;
  receitas: Array<{
    id: number;
    numero_receita?: string | null;
    data: string;
    paciente_nome: string | null;
    valor_formula: number | null;
    comissao_devida: number | null;
    declarado: boolean;
    pago: boolean;
  }>;
  repasses: Array<{
    ano_mes: string;
    valor_repasse: number;
    data_recebido: string;
    evidencia_texto?: string | null;
  }>;
};

export function gerarExcelReconciliacao(d: DadosExcelReconciliacao): Buffer {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `Reconciliação ${d.farmacia.nome} ${d.periodo.inicio}-${d.periodo.fim}`,
    Author: "PAWARDS MEDCORE",
    Company: "PAWARDS MEDCORE",
    CreatedDate: new Date(),
  };

  // ─── Aba 1: Resumo Mensal ───
  const aba1Header = [
    ["PAWARDS MEDCORE — Relatório de Reconciliação PARMAVAULT"],
    [`Farmácia: ${d.farmacia.nome}`, `% Comissão: ${Number(d.farmacia.percentual_comissao).toFixed(2)}%`],
    [`Período: ${d.periodo.inicio} a ${d.periodo.fim}`, `Protocolo: ${d.protocolo}`],
    [],
    ["Mês", "Qtd Receitas", "Previsto (R$)", "Declarado (R$)", "Recebido (R$)", "GAP (R$)", "GAP (%)"],
  ];
  const aba1Rows = d.serie_mensal.map((m) => [
    m.mes, m.qtd_receitas,
    Number(m.previsto || 0), Number(m.declarado || 0),
    Number(m.recebido || 0), Number(m.gap || 0),
    m.previsto > 0 ? +((m.gap / m.previsto) * 100).toFixed(2) : 0,
  ]);
  // ... totalizadores + ws1 append ...
  XLSX.utils.book_append_sheet(wb, ws1, "Resumo Mensal");

  // ─── Aba 2: Detalhe por Receita (LGPD: pacientes em iniciais) ───
  // map d.receitas → iniciaisPaciente(r.paciente_nome)
  XLSX.utils.book_append_sheet(wb, ws2, "Detalhe por Receita");

  // ─── Aba 3: Repasses Registrados ───
  XLSX.utils.book_append_sheet(wb, ws3, "Repasses Registrados");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
```

### 4.2 — `gerarPdfReconciliacao.ts` (1042L) — só assinatura + função-chave do gráfico

> **Deviation B6:** plano pedia `chartjs-node-canvas`, código usa **gráfico desenhado manualmente com pdfkit puro** (`desenharGraficoBarras` linha 793). Resultado: barras agrupadas 4 séries (Previsto/Declarado/Recebido/GAP) com grade pontilhada e eixo Y abreviado. Comentário explícito no código:
>
> ```
> // Renderizado server-side com pdfkit puro (sem chartjs-node-canvas)
> ```

```ts
// Linha 149 — assinatura do gerador
export function gerarPdfReconciliacao(d: DadosPdfReconciliacao): PDFKit.PDFDocument

// Layout 3 páginas:
//   P1 capa navy/gold + protocolo hash
//   P2 resumo executivo + gráfico barras GAP vermelho (zona terço médio)
//   P3 tabela receitas com iniciaisPaciente() (LGPD)
// Rodapé fixo todas as páginas

// Linha 793 — gráfico manual (substitui chartjs-node-canvas)
function desenharGraficoBarras(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  serie: SerieMensal[]
): void {
  // Calcula maxV e arredonda pra escala de eixo Y
  // Desenha 5 linhas pontilhadas horizontais (grid)
  // Eixo X linha base sólida
  // Barras agrupadas: 4 séries (previsto, declarado, recebido, gap)
  //   barW = (usableW - 3*barGap) / 4
  // Cada barra com cor própria + valor no topo
  // GAP vermelho > 0, verde = 0
}
```

---

## 5. Snippets cirúrgicos

### 5.1 — `prescricoes.ts` L107-197 — **PROVA do gap B1** ⚠️🔴

> **Atenção Dr. Claude:** abaixo é a rota POST `/prescricoes/:id/blocos` **completa**. Note que **NÃO há nenhuma chamada a `verificarUnidadeTemContrato` nem a `registrarWarningEmissao`**. O helper da Seção 3.2 está órfão.

```ts
router.post("/prescricoes/:id/blocos", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id inválido" }); return; }
    const escopo = await carregarPrescricaoComEscopo(id, req);
    if (!escopo) { res.status(404).json({ error: "não encontrada ou sem permissão" }); return; }
    const {
      titulo_apelido, titulo_categoria = "FÓRMULA", titulo_abrev_principal,
      via_administracao = "ORAL", forma_farmaceutica_sugestao,
      observacoes, ativos = [],
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
      [id, ordem, titulo_categoria, titulo_abrev_principal ?? null,
       titulo_apelido, tipo_bloco, via_administracao,
       forma_farmaceutica_sugestao ?? null, observacoes ?? null,
       destino_dispensacao]
    );
    const bloco = ins.rows[0];
    let ordemAtivo = 1;
    for (const a of ativos) {
      await pool.query(
        `INSERT INTO prescricao_bloco_ativos
          (bloco_id, ordem, nome_ativo, dose_valor, dose_unidade,
           observacao, tipo_receita_anvisa_codigo, controlado, farmacia_padrao)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [bloco.id, ordemAtivo++, a.nome_ativo ?? a.nome,
         a.dose_valor ?? 0, a.dose_unidade ?? "mg",
         a.observacao ?? null,
         a.tipo_receita_anvisa_codigo ?? "BRANCA_SIMPLES",
         !!a.controlado, a.farmacia_padrao ?? null]
      );
    }
    res.status(201).json(bloco);   // ← devolve bloco SEM campo `aviso_contrato_ausente`
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

**`grep` confirmando:**
```
$ rg "verificarUnidade|contrato|warning" artifacts/api-server/src/routes/prescricoes.ts
(zero matches)
```

### 5.2 — `parmavaultReconciliacao.ts` (833L) — header + mapa de rotas

```ts
// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Blocos B2 + B4 + B5 + B6 backend
// Reconciliacao PARMAVAULT — endpoints master-only.
//
// /api/admin/parmavault/comissao/recalcular  (POST)  — job retroativo idempotente
// /api/admin/parmavault/declaracoes          (POST/GET) — declaracao manual + lista
// /api/admin/parmavault/declaracoes/csv      (POST) — upload CSV (texto raw)
// /api/admin/parmavault/repasses             (POST/GET) — registros de entrada $$
// /api/admin/parmavault/matriz               (GET) — farmacia × mes (Previsto/Declarado/Recebido/Gap)
// /api/admin/parmavault/farmacia/:id/percentual  (PATCH) — edita % comissao
// /api/admin/parmavault/relatorios/gerar     (POST) — cria snapshot + PDF + Excel
// /api/admin/parmavault/relatorios           (GET)  — lista historico
// /api/admin/parmavault/relatorios/:id/pdf   (GET) — baixa PDF
// /api/admin/parmavault/relatorios/:id/excel (GET) — baixa Excel
// /api/admin/parmavault/warnings             (GET) — lista warnings emissao
//
// Auth: requireRole("validador_mestre") + requireMasterEstrito.
// REGRA FERRO de negocio:
//   - comissao_paga NUNCA automatico (so manual).
//   - Snapshot do % comissao no relatorio é IMUTAVEL.
//   - Pacientes mostrados em iniciais nos PDFs/Excels (LGPD).
//   - Sistema registra/mostra, nunca bloqueia.
// ════════════════════════════════════════════════════════════════════
```

**Linhas dos handlers (pra Dr. Claude navegar via URL raw + `#L<n>`):**
```
L 164  router.post(...comissao/recalcular...)        ← B2 job retroativo
L 220  router.post(.../declaracoes...)               ← B4 manual
L 251  router.post(.../declaracoes/csv...)           ← B4 CSV (parser robusto Wave 6)
L 308  router.get( .../declaracoes...)               ← B4 lista
L 330  router.post(.../repasses...)                  ← B5 entrada $$
L 356  router.get( .../repasses...)
L 377  router.get( .../matriz...)                    ← B5 dados do painel CEO
L 457  router.patch(.../farmacia/:id/percentual...)  ← B5 % editável
L 482  router.post(.../relatorios/gerar...)          ← B6 snapshot + PDF + Excel
L 720  router.get( .../relatorios...)
L 741  router.get( .../relatorios/:id/pdf...)
L 776  router.get( .../relatorios/:id/excel...)
L 814  router.get( .../warnings...)                  ← lista de warnings (alimentaria UI B1)
```

### 5.3 — `admin-parmavault-reconciliacao.tsx` (953L) — **PROVA do gap B5** ⚠️🔴

```tsx
// PARMAVAULT-TSUNAMI Wave 5 · Bloco B5 frontend · Painel CEO Reconciliacao
// /admin/parmavault-reconciliacao — master-only
//
// 3 niveis:
//   - KPIs topo (Previsto / Declarado / Recebido / GAP, com cores)
//   - Matriz farmacia × periodo (% editavel inline + Receitas + valores + Gap)
//   - Acoes por farmacia: gerar PDF/Excel, declarar manual, registrar repasse
//
// Tema navy/gold (PAWARDS MEDCORE).
import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  RefreshCw, FileText, FileSpreadsheet, Wand2,
  AlertTriangle, CheckCircle2, Save, Upload,
  DollarSign, Filter,
} from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const RED = "#dc2626";
const GREEN = "#16a34a";

// ⚠️ AUSENTES:  import { BarChart, LineChart, PieChart } from "recharts"
// recharts ^2.15.2 ESTÁ no package.json mas NÃO é importado nesta página.
```

**`grep` confirmando os 2 sub-gaps de B5:**
```
$ rg "recharts|BarChart|LineChart|DonutChart|PieChart" admin-parmavault-reconciliacao.tsx
(zero matches)

$ rg "drill|drilldown|expandir|expanded" admin-parmavault-reconciliacao.tsx
(zero matches)
```

**O que ESTÁ implementado:**
- KPIs topo (Previsto / Declarado / Recebido / GAP)
- Matriz farmácia × mês com colunas Previsto/Declarado/Recebido/Gap (linha 468 e 649 — `<th style={th}>Previsto</th>...`)
- % editável inline (PATCH)
- Modal "Declarar manual" e "Registrar repasse"
- Botões "Gerar PDF" e "Gerar Excel" por farmácia

**O que FALTA (vs plano original B5):**
- ❌ Gráfico barras agrupadas Previsto×Declarado×Recebido por farmácia
- ❌ Linha temporal GAP 6 meses
- ❌ Donut distribuição por farmácia
- ❌ Drill-down por receita (expandir linha da matriz)

---

## 6. Provas SQL

> Selects rodados ao vivo no banco de produção em 24/abr/2026, **após restart do API server**.

### 6.1 — Trigger ativo

```
   trigger_name    | action_timing | event_manipulation | event_object_table
-------------------+---------------+--------------------+---------------------
 trg_calc_comissao | BEFORE        | INSERT             | parmavault_receitas
```

### 6.2 — `parmavault_receitas` totalizadores

```
 total | com_comissao | sem_base | total_comissao_brl | media_brl
-------+--------------+----------+--------------------+-----------
  8725 |         8725 |        0 |         2735336.10 |    313.51
```

### 6.3 — Split por farmácia (verdade nova: 3 ativas / 5 zeradas)

```
 id |       nome_fantasia       |  pct   | receitas | comissao_total_brl
----+---------------------------+--------+----------+--------------------
  6 | Maven Manipulação Premium | 32.00% |     2973 |          998457.60
  4 | FAMA Manipulação          | 30.00% |     2863 |          902160.00
  5 | Magistral Pague Menos     | 27.50% |     2889 |          834718.50
  9 | Lemos Manipulação         | 30.00% |        0 |              (NULL)
  8 | Pharmacore Premium        | 30.00% |        0 |              (NULL)
 10 | Botica Magistral Premium  | 30.00% |        0 |              (NULL)
 11 | Essentia Pharma           | 30.00% |        0 |              (NULL)
  7 | Galena Manipulação        | 30.00% |        0 |              (NULL)
```

### 6.4 — Tabelas Wave 5 (esqueleto pronto, zero uso real)

```
             tabela              | count
---------------------------------+-------
 parmavault_emissao_warnings     |     0   ← A2 nunca disparou (gap B1)
 parmavault_declaracoes_farmacia |     0   ← portal nunca foi usado
 parmavault_repasses             |     0   ← CEO nunca registrou repasse
 parmavault_relatorios_gerados   |     0   ← nenhum PDF gerado ainda
```

### 6.5 — Migration 023 aplicada (Onda 3)

```
      column_name       | data_type | column_default
------------------------+-----------+----------------
 parcelas               | integer   | 1
 prazo_recebimento_dias | integer   | (NULL)
```

### 6.6 — Anastomoses pendentes (11 total: 10 abertas + 1 fechada)

```
 id |        modulo        | criticidade | status  | titulo_60c
----+----------------------+-------------+---------+-----------------------------------
  1 | PRESCRICAO_PADCON    | alta        | aberta  | Assinatura PAdES/ICP-Brasil real
  2 | TRELLO               | baixa       | aberta  | Webhook bidirecional
  3 | EMAIL_PACIENTE       | media       | aberta  | Template HTML inline relatorio
  4 | PRESCRICAO_PADCON    | media       | aberta  | Validacao Zod POST/PUT prescricao
  5 | IDOR                 | CRITICA     | aberta  | Auditoria geral cross-tenant ⚠️
  6 | PRESCRICAO_PADCON    | media       | aberta  | Posologia dinamica bloco_dose
  7 | AUDITORIA            | media       | aberta  | Rotacao 48h ATIVA → LEGADO
  8 | AUDITORIA            | alta        | aberta  | Watcher Drive Activity tempo real
  9 | PARMAVAULT           | media       | fechada | (tabela inexistente — RESOLVIDA)
 10 | PAREXAM_MEDCORE      | media       | aberta  | Botão "Sugerir bloco MEDCORE" ← MK
 11 | PARMAVAULT_PDF_PRAZO | baixa       | aberta  | Exibir prazo+parcelas no PDF P2 ← MK
```

### 6.7 — Smoke endpoints pós-restart

```
matriz       HTTP 401 (auth required, esperado)
warnings     HTTP 401
declaracoes  HTTP 401
relatorios   HTTP 401
```

### 6.8 — Workers ativos no API após restart

```
[motorPlanos] Worker de recorrencia iniciado (intervalo 300s)
[lembretePrescricao] Worker iniciado (intervalo 60s, tolerancia 5 min)
[cobrancaMensal] Worker iniciado (tick 360min, vencimento dia 5, grace 5d)
[notifAssinatura] WD14 worker iniciado (tick 5min, max 3 tentativas, backoff 10/60min)
Server listening port: 8080
```

---

## 7. Gaps detectados

### ❌ Gap B1 — A2 Warning emissão NÃO ATIVO

**Sintoma:** tabela `parmavault_emissao_warnings` tem 0 linhas após meses de uso.

**Causa raiz:** o helper `verificarUnidadeTemContrato` + `registrarWarningEmissao` (Seção 3.2) está pronto, MAS não é importado nem chamado pela rota POST `/prescricoes/:id/blocos` (Seção 5.1). Falta também:
- Banner amarelo "⚠️ Sem contrato vigente — confirma?" no frontend (zero refs em `clinica-motor`)
- Rota PATCH "Prosseguir" que marca `decidido_em` / `decidido_por_usuario_id` (colunas existem no schema 021, sem rota)

**Consertos necessários (estimativa: ~1h):**
1. `prescricoes.ts` linha 107-173: importar helper, chamar antes do INSERT, anexar `aviso_contrato_ausente` ao response
2. `parmavaultReconciliacao.ts`: novo `router.patch("/admin/parmavault/warnings/:id/decidir", ...)`
3. Frontend (componente da prescrição): banner amarelo + botão "Prosseguir"

---

### ❌ Gap B5.1 — Painel CEO sem gráficos visuais

**Sintoma:** página `admin-parmavault-reconciliacao.tsx` (953L) tem KPIs+matriz+ações, mas zero charts.

**Causa raiz:** `recharts ^2.15.2` está no `package.json` da `clinica-motor` mas NÃO é importado.

**Consertos necessários (estimativa: ~1h):**
1. Importar `BarChart, LineChart, PieChart, ResponsiveContainer` de `recharts`
2. Adicionar 3 seções abaixo da matriz:
   - Barras agrupadas Previsto×Declarado×Recebido por farmácia
   - Linha temporal GAP últimos 6 meses
   - Donut distribuição por farmácia
3. Endpoint `/matriz` já retorna os dados necessários — só consumir.

---

### ❌ Gap B5.2 — Sem drill-down por receita

**Sintoma:** clicar numa linha da matriz não expande pra ver as receitas individuais.

**Conserto necessário (estimativa: ~30min):**
1. Estado `expandedFarmacia: number | null`
2. Endpoint adicional `/matriz/:farmacia_id/:ano_mes/receitas` (ou reusar `/declaracoes`)
3. `<tr>` expansível abaixo da linha da farmácia

---

### 🟡 Deviation B6 — `xlsx` ao invés de `exceljs`, `pdfkit` puro ao invés de `chartjs-node-canvas`

**Sintoma:** plano original especificava libs específicas. Código usa alternativas.

**Avaliação:** **DEVIATION ACEITÁVEL.** Funcionalidade entregue 100%:
- Excel 3 abas funciona com `xlsx` (já estava instalado, mais leve)
- PDF tem gráfico de barras agrupadas funcional (`desenharGraficoBarras` linha 793) feito com `pdfkit` puro

**Decisão:** manter como está, salvo objeção do Dr. Claude.

---

## 8. Veredito + perguntas pro Dr. Claude

### O que está **PRONTO** pra reunião com primeira farmácia (ex: Maven 32%)

✅ Cálculo automático de comissão prevista (R$ 2.735.336,10 atualizados a cada nova receita via trigger 027)
✅ Portal master pra registrar declaração manual ou via CSV
✅ Portal master pra registrar repasse recebido
✅ Painel CEO `/admin/parmavault-reconciliacao` com KPIs, matriz com Previsto×Declarado×Recebido×Gap, % editável inline
✅ Geração de PDF 3 páginas + Excel 3 abas, com paciente em iniciais (LGPD)
✅ Snapshot imutável do % comissão na hora da geração do relatório

### O que está **FALTANDO** pra fluxo completo end-to-end

❌ Aviso pro médico ao emitir prescrição em unidade sem contrato (B1)
❌ Gráficos visuais no painel CEO (B5.1)
❌ Expansão drill-down por receita (B5.2)

### Perguntas Dr. Replit → Dr. Claude

1. **Prioridade de fechamento dos 3 gaps:** B1 → B5.1 → B5.2 ou outra ordem?
2. **B1 deve bloquear ou só alertar?** Spec original diz "nunca bloqueia, só avisa" — confirma?
3. **B5 gráficos: 3 da spec ou também adicionar histograma de receitas/dia ou outros?**
4. **Drill-down B5.2 deve ir até nome do paciente (com unblur master-only) ou ficar nas iniciais sempre?**
5. **Anastomose #5 IDOR `crítica`** ainda aberta há semanas — entra em qual onda futura?
6. **Anastomose #11 (PDF P2 mostrar prazo+parcelas)** já tem schema (Migration 023), só falta render no PDF — fechar agora junto com B5 ou deixar pra Wave 9?

### Comprovação de integridade do código

Dr. Claude pode verificar qualquer arquivo via URL raw deterministica:

```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/88c3cd8/<caminho>
```

SHA `88c3cd8` está em ambos os branches `main` e `feat/dominio-pawards` (push duplo conforme protocolo Mortal Kombat §11).

---

**Fim do microscópio.**
*Aguardando análise Dr. Claude → orientação pro Caio → execução Dr. Replit.*
