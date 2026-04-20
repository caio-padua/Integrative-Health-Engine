# PADCON Monetização — Pacote Completo para Revisão

## Contexto crítico (LER ANTES)

1. **Regra de ferro**: NUNCA usar `db:push` — drift de 32 tabelas, 31 FKs em `unidades.id`. Schema é alterado via `ALTER`/`CREATE` direto no psql.
2. **Sem auth backend ainda**: `tenantContextMiddleware` só lê header. Não há `req.user` no servidor (status quo do projeto).
3. **Porta API**: 8080 (workflow externo mapeia 5000→8080).
4. **Preços cravados**: M1=297, M2=497, M3=197, M4=197, M5=397, M6=597, M7=397. E1=47, E2=0.80, E3=1.20, E4=0.15, E5=0.80, E6=4.90, E7=9.90, E8=1997, E9=97/mês.
5. **Drive provisionado em produção**: root `1du3bpcmmT5nfYAWh4BA5mjp4o69mRhNa` com 10 institutos.

## Schema das 8 tabelas (criadas via psql direto)
```sql
                                                                   Table "public.modulos_padcon"
    Column    |           Type           | Collation | Nullable |                  Default                   | Storage  | Compression | Stats target | Description 
--------------+--------------------------+-----------+----------+--------------------------------------------+----------+-------------+--------------+-------------
 id           | integer                  |           | not null | nextval('modulos_padcon_id_seq'::regclass) | plain    |             |              | 
 codigo       | text                     |           | not null |                                            | extended |             |              | 
 nome         | text                     |           | not null |                                            | extended |             |              | 
 descricao    | text                     |           |          |                                            | extended |             |              | 
 preco_mensal | numeric(10,2)            |           | not null | 0                                          | main     |             |              | 
 ordem        | integer                  |           | not null | 0                                          | plain    |             |              | 
 grupo        | text                     |           | not null |                                            | extended |             |              | 
 ativo        | boolean                  |           | not null | true                                       | plain    |             |              | 
 criado_em    | timestamp with time zone |           | not null | now()                                      | plain    |             |              | 
Indexes:
    "modulos_padcon_pkey" PRIMARY KEY, btree (id)
    "modulos_padcon_codigo_key" UNIQUE CONSTRAINT, btree (codigo)
Referenced by:
    TABLE "unidade_modulos_ativos" CONSTRAINT "unidade_modulos_ativos_modulo_id_fkey" FOREIGN KEY (modulo_id) REFERENCES modulos_padcon(id)
Access method: heap

                                                                    Table "public.eventos_cobraveis"
     Column     |           Type           | Collation | Nullable |                    Default                    | Storage  | Compression | Stats target | Description 
----------------+--------------------------+-----------+----------+-----------------------------------------------+----------+-------------+--------------+-------------
 id             | integer                  |           | not null | nextval('eventos_cobraveis_id_seq'::regclass) | plain    |             |              | 
 codigo         | text                     |           | not null |                                               | extended |             |              | 
 nome           | text                     |           | not null |                                               | extended |             |              | 
 descricao      | text                     |           |          |                                               | extended |             |              | 
 preco_unitario | numeric(10,2)            |           | not null | 0                                             | main     |             |              | 
 unidade_medida | text                     |           | not null | 'evento'::text                                | extended |             |              | 
 grupo          | text                     |           | not null |                                               | extended |             |              | 
 trigger_origem | text                     |           |          |                                               | extended |             |              | 
 ativo          | boolean                  |           | not null | true                                          | plain    |             |              | 
 criado_em      | timestamp with time zone |           | not null | now()                                         | plain    |             |              | 
Indexes:
    "eventos_cobraveis_pkey" PRIMARY KEY, btree (id)
    "eventos_cobraveis_codigo_key" UNIQUE CONSTRAINT, btree (codigo)
Referenced by:
    TABLE "pingue_pongue_log" CONSTRAINT "pingue_pongue_log_evento_cobravel_id_fkey" FOREIGN KEY (evento_cobravel_id) REFERENCES eventos_cobraveis(id)
    TABLE "unidade_eventos_ledger" CONSTRAINT "unidade_eventos_ledger_evento_id_fkey" FOREIGN KEY (evento_id) REFERENCES eventos_cobraveis(id)
Access method: heap

                                                                      Table "public.unidade_modulos_ativos"
       Column        |           Type           | Collation | Nullable |                      Default                       | Storage  | Compression | Stats target | Description 
---------------------+--------------------------+-----------+----------+----------------------------------------------------+----------+-------------+--------------+-------------
 id                  | integer                  |           | not null | nextval('unidade_modulos_ativos_id_seq'::regclass) | plain    |             |              | 
 unidade_id          | integer                  |           | not null |                                                    | plain    |             |              | 
 modulo_id           | integer                  |           | not null |                                                    | plain    |             |              | 
 ativo               | boolean                  |           | not null | false                                              | plain    |             |              | 
 preco_personalizado | numeric(10,2)            |           |          |                                                    | main     |             |              | 
 ativado_em          | timestamp with time zone |           |          |                                                    | plain    |             |              | 
 ativado_por         | text                     |           |          |                                                    | extended |             |              | 
 observacao          | text                     |           |          |                                                    | extended |             |              | 
Indexes:
    "unidade_modulos_ativos_pkey" PRIMARY KEY, btree (id)
    "unidade_modulos_ativos_unidade_id_modulo_id_key" UNIQUE CONSTRAINT, btree (unidade_id, modulo_id)
Foreign-key constraints:
    "unidade_modulos_ativos_modulo_id_fkey" FOREIGN KEY (modulo_id) REFERENCES modulos_padcon(id)
    "unidade_modulos_ativos_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Access method: heap

                                                                      Table "public.unidade_eventos_ledger"
       Column       |           Type           | Collation | Nullable |                      Default                       | Storage  | Compression | Stats target | Description 
--------------------+--------------------------+-----------+----------+----------------------------------------------------+----------+-------------+--------------+-------------
 id                 | integer                  |           | not null | nextval('unidade_eventos_ledger_id_seq'::regclass) | plain    |             |              | 
 unidade_id         | integer                  |           | not null |                                                    | plain    |             |              | 
 evento_id          | integer                  |           | not null |                                                    | plain    |             |              | 
 valor_cobrado      | numeric(10,2)            |           | not null |                                                    | main     |             |              | 
 referencia_externa | text                     |           |          |                                                    | extended |             |              | 
 metadados          | jsonb                    |           |          |                                                    | extended |             |              | 
 ocorrido_em        | timestamp with time zone |           | not null | now()                                              | plain    |             |              | 
 competencia_mes    | text                     |           | not null | to_char(now(), 'YYYY-MM'::text)                    | extended |             |              | 
 faturado           | boolean                  |           | not null | false                                              | plain    |             |              | 
Indexes:
    "unidade_eventos_ledger_pkey" PRIMARY KEY, btree (id)
    "idx_ledger_unid_comp" btree (unidade_id, competencia_mes)
Foreign-key constraints:
    "unidade_eventos_ledger_evento_id_fkey" FOREIGN KEY (evento_id) REFERENCES eventos_cobraveis(id)
    "unidade_eventos_ledger_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Access method: heap

                                                                        Table "public.agendas_nuvem_liberacao"
         Column         |           Type           | Collation | Nullable |                       Default                       | Storage  | Compression | Stats target | Description 
------------------------+--------------------------+-----------+----------+-----------------------------------------------------+----------+-------------+--------------+-------------
 id                     | integer                  |           | not null | nextval('agendas_nuvem_liberacao_id_seq'::regclass) | plain    |             |              | 
 unidade_id             | integer                  |           | not null |                                                     | plain    |             |              | 
 agenda_template_codigo | text                     |           | not null |                                                     | extended |             |              | 
 liberada               | boolean                  |           | not null | false                                               | plain    |             |              | 
 estado                 | text                     |           | not null | 'bloqueio_total'::text                              | extended |             |              | 
 liberada_em            | timestamp with time zone |           |          |                                                     | plain    |             |              | 
 liberada_por           | text                     |           |          |                                                     | extended |             |              | 
Indexes:
    "agendas_nuvem_liberacao_pkey" PRIMARY KEY, btree (id)
    "agendas_nuvem_liberacao_unidade_id_agenda_template_codigo_key" UNIQUE CONSTRAINT, btree (unidade_id, agenda_template_codigo)
Foreign-key constraints:
    "agendas_nuvem_liberacao_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Access method: heap

                                                                       Table "public.demandas_resolucao"
        Column        |           Type           | Collation | Nullable |                    Default                     | Storage  | Compression | Stats target | Description 
----------------------+--------------------------+-----------+----------+------------------------------------------------+----------+-------------+--------------+-------------
 id                   | integer                  |           | not null | nextval('demandas_resolucao_id_seq'::regclass) | plain    |             |              | 
 unidade_id           | integer                  |           | not null |                                                | plain    |             |              | 
 paciente_id          | integer                  |           |          |                                                | plain    |             |              | 
 canal_origem         | text                     |           | not null |                                                | extended |             |              | 
 assunto              | text                     |           |          |                                                | extended |             |              | 
 resolvido            | boolean                  |           | not null | false                                          | plain    |             |              | 
 resolvido_por        | text                     |           |          |                                                | extended |             |              | 
 resolvido_em         | timestamp with time zone |           |          |                                                | plain    |             |              | 
 turnos_pingue_pongue | integer                  |           | not null | 0                                              | plain    |             |              | 
 caminho_resolucao    | text                     |           |          |                                                | extended |             |              | 
 valor_total_cobrado  | numeric(10,2)            |           | not null | 0                                              | main     |             |              | 
 metadados            | jsonb                    |           |          |                                                | extended |             |              | 
 criado_em            | timestamp with time zone |           | not null | now()                                          | plain    |             |              | 
Indexes:
    "demandas_resolucao_pkey" PRIMARY KEY, btree (id)
    "idx_demandas_unid" btree (unidade_id, resolvido)
Foreign-key constraints:
    "demandas_resolucao_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Referenced by:
    TABLE "pingue_pongue_log" CONSTRAINT "pingue_pongue_log_demanda_id_fkey" FOREIGN KEY (demanda_id) REFERENCES demandas_resolucao(id) ON DELETE CASCADE
Access method: heap

                                                                      Table "public.pingue_pongue_log"
       Column       |           Type           | Collation | Nullable |                    Default                    | Storage  | Compression | Stats target | Description 
--------------------+--------------------------+-----------+----------+-----------------------------------------------+----------+-------------+--------------+-------------
 id                 | integer                  |           | not null | nextval('pingue_pongue_log_id_seq'::regclass) | plain    |             |              | 
 demanda_id         | integer                  |           | not null |                                               | plain    |             |              | 
 turno              | integer                  |           | not null |                                               | plain    |             |              | 
 autor_tipo         | text                     |           | not null |                                               | extended |             |              | 
 autor_nome         | text                     |           |          |                                               | extended |             |              | 
 canal              | text                     |           | not null |                                               | extended |             |              | 
 mensagem           | text                     |           |          |                                               | extended |             |              | 
 evento_cobravel_id | integer                  |           |          |                                               | plain    |             |              | 
 ocorrido_em        | timestamp with time zone |           | not null | now()                                         | plain    |             |              | 
Indexes:
    "pingue_pongue_log_pkey" PRIMARY KEY, btree (id)
    "idx_ppl_demanda" btree (demanda_id, turno)
Foreign-key constraints:
    "pingue_pongue_log_demanda_id_fkey" FOREIGN KEY (demanda_id) REFERENCES demandas_resolucao(id) ON DELETE CASCADE
    "pingue_pongue_log_evento_cobravel_id_fkey" FOREIGN KEY (evento_cobravel_id) REFERENCES eventos_cobraveis(id)
Access method: heap

                                                                       Table "public.clinica_drive_estrutura"
        Column        |           Type           | Collation | Nullable |                       Default                       | Storage  | Compression | Stats target | Description 
----------------------+--------------------------+-----------+----------+-----------------------------------------------------+----------+-------------+--------------+-------------
 id                   | integer                  |           | not null | nextval('clinica_drive_estrutura_id_seq'::regclass) | plain    |             |              | 
 unidade_id           | integer                  |           | not null |                                                     | plain    |             |              | 
 pasta_raiz_id        | text                     |           |          |                                                     | extended |             |              | 
 pasta_clientes_id    | text                     |           |          |                                                     | extended |             |              | 
 pasta_financeiro_id  | text                     |           |          |                                                     | extended |             |              | 
 pasta_recorrentes_id | text                     |           |          |                                                     | extended |             |              | 
 url_raiz             | text                     |           |          |                                                     | extended |             |              | 
 criada_em            | timestamp with time zone |           | not null | now()                                               | plain    |             |              | 
 criada_por           | text                     |           |          |                                                     | extended |             |              | 
Indexes:
    "clinica_drive_estrutura_pkey" PRIMARY KEY, btree (id)
    "clinica_drive_estrutura_unidade_id_key" UNIQUE CONSTRAINT, btree (unidade_id)
Foreign-key constraints:
    "clinica_drive_estrutura_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Access method: heap

```


## `artifacts/api-server/src/routes/monetizacaoPadcon.ts`
```ts
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// ═══════════════════════════════════════════════════════════════════
// MÓDULOS PADCON (M1-M7) — catálogo + ativação por unidade
// ═══════════════════════════════════════════════════════════════════

router.get("/modulos-padcon", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT id, codigo, nome, descricao, preco_mensal, ordem, grupo, ativo
      FROM modulos_padcon
      WHERE ativo = TRUE
      ORDER BY ordem
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/modulos-padcon/matriz", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        m.id AS modulo_id,
        m.codigo AS modulo_codigo,
        m.nome AS modulo_nome,
        m.preco_mensal,
        m.grupo,
        COALESCE(uma.ativo, FALSE) AS ativo,
        uma.preco_personalizado,
        uma.ativado_em,
        uma.ativado_por
      FROM unidades u
      CROSS JOIN modulos_padcon m
      LEFT JOIN unidade_modulos_ativos uma ON uma.unidade_id = u.id AND uma.modulo_id = m.id
      WHERE u.id NOT BETWEEN 1 AND 7 AND m.ativo = TRUE
      ORDER BY u.id, m.ordem
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/modulos-padcon/ativar/:unidadeId/:moduloId", async (req, res): Promise<void> => {
  const { unidadeId, moduloId } = req.params;
  const { ativo, usuario, precoPersonalizado } = req.body ?? {};
  if (typeof ativo !== "boolean") {
    res.status(400).json({ error: "ativo (boolean) obrigatorio" });
    return;
  }
  try {
    const result = await db.execute(sql`
      INSERT INTO unidade_modulos_ativos (unidade_id, modulo_id, ativo, ativado_em, ativado_por, preco_personalizado)
      VALUES (${parseInt(unidadeId, 10)}, ${parseInt(moduloId, 10)}, ${ativo}, NOW(), ${usuario ?? "caio"}, ${precoPersonalizado ?? null})
      ON CONFLICT (unidade_id, modulo_id)
      DO UPDATE SET ativo = ${ativo}, ativado_em = NOW(), ativado_por = ${usuario ?? "caio"},
                    preco_personalizado = COALESCE(${precoPersonalizado ?? null}, unidade_modulos_ativos.preco_personalizado)
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// EVENTOS COBRÁVEIS (E1-E9) — catálogo + disparo (CORAÇÃO)
// ═══════════════════════════════════════════════════════════════════

router.get("/eventos-cobraveis", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT id, codigo, nome, descricao, preco_unitario, unidade_medida, grupo, trigger_origem
      FROM eventos_cobraveis WHERE ativo = TRUE ORDER BY codigo
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CORAÇÃO: endpoint genérico que QUALQUER ação interna chama pra registrar consumo
router.post("/eventos-cobraveis/disparar", async (req, res): Promise<void> => {
  const { unidadeId, eventoCodigo, referenciaExterna, metadados } = req.body ?? {};
  if (!unidadeId || !eventoCodigo) {
    res.status(400).json({ error: "unidadeId e eventoCodigo obrigatorios" });
    return;
  }
  try {
    const evt = await db.execute(sql`
      SELECT id, preco_unitario FROM eventos_cobraveis WHERE codigo = ${eventoCodigo} AND ativo = TRUE
    `);
    if (evt.rows.length === 0) {
      res.status(404).json({ error: `Evento ${eventoCodigo} nao encontrado` });
      return;
    }
    const evento: any = evt.rows[0];
    const result = await db.execute(sql`
      INSERT INTO unidade_eventos_ledger (unidade_id, evento_id, valor_cobrado, referencia_externa, metadados)
      VALUES (${unidadeId}, ${evento.id}, ${evento.preco_unitario}, ${referenciaExterna ?? null}, ${metadados ? JSON.stringify(metadados) : null}::jsonb)
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// LEDGER + FATURAMENTO LIVE
// ═══════════════════════════════════════════════════════════════════

router.get("/ledger/faturamento-live", async (req, res): Promise<void> => {
  const competencia = (req.query.competencia as string) ?? new Date().toISOString().slice(0, 7);
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        e.grupo,
        e.codigo AS evento_codigo,
        e.nome AS evento_nome,
        COUNT(l.id) AS qtd,
        COALESCE(SUM(l.valor_cobrado), 0) AS subtotal
      FROM unidades u
      LEFT JOIN unidade_eventos_ledger l ON l.unidade_id = u.id AND l.competencia_mes = ${competencia}
      LEFT JOIN eventos_cobraveis e ON e.id = l.evento_id
      WHERE u.id NOT BETWEEN 1 AND 7
      GROUP BY u.id, u.nome, u.cor, e.grupo, e.codigo, e.nome
      ORDER BY u.id, e.grupo NULLS LAST, e.codigo NULLS LAST
    `);
    const totaisPorUnidade = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        COALESCE(SUM(l.valor_cobrado), 0) AS total_eventos,
        (SELECT COALESCE(SUM(m.preco_mensal), 0)
           FROM unidade_modulos_ativos uma
           JOIN modulos_padcon m ON m.id = uma.modulo_id
          WHERE uma.unidade_id = u.id AND uma.ativo = TRUE) AS total_modulos
      FROM unidades u
      LEFT JOIN unidade_eventos_ledger l ON l.unidade_id = u.id AND l.competencia_mes = ${competencia}
      WHERE u.id NOT BETWEEN 1 AND 7
      GROUP BY u.id, u.nome
      ORDER BY u.id
    `);
    res.json({ competencia, detalhe: result.rows, totaisPorUnidade: totaisPorUnidade.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// AGENDAS NUVEM — LIBERAÇÃO POR UNIDADE
// ═══════════════════════════════════════════════════════════════════

router.get("/agendas-nuvem-liberacao", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        l.agenda_template_codigo,
        l.liberada,
        l.estado,
        l.liberada_em,
        l.liberada_por
      FROM unidades u
      JOIN agendas_nuvem_liberacao l ON l.unidade_id = u.id
      WHERE u.id NOT BETWEEN 1 AND 7
      ORDER BY u.id, l.agenda_template_codigo
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/agendas-nuvem-liberacao/:unidadeId/:templateCodigo", async (req, res): Promise<void> => {
  const { unidadeId, templateCodigo } = req.params;
  const { liberada, estado, usuario } = req.body ?? {};
  try {
    const result = await db.execute(sql`
      UPDATE agendas_nuvem_liberacao
      SET liberada = COALESCE(${liberada ?? null}, liberada),
          estado = COALESCE(${estado ?? null}, estado),
          liberada_em = NOW(),
          liberada_por = ${usuario ?? "caio"}
      WHERE unidade_id = ${parseInt(unidadeId, 10)} AND agenda_template_codigo = ${templateCodigo}
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DEMANDAS DE RESOLUÇÃO — Robô / IA / Humano + ping-pong
// ═══════════════════════════════════════════════════════════════════

router.get("/demandas-resolucao", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  try {
    const result = await db.execute(sql`
      SELECT
        d.*,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor
      FROM demandas_resolucao d
      JOIN unidades u ON u.id = d.unidade_id
      WHERE (${unidadeId}::int IS NULL OR d.unidade_id = ${unidadeId}::int)
      ORDER BY d.criado_em DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/demandas-resolucao", async (req, res): Promise<void> => {
  const { unidadeId, pacienteId, canalOrigem, assunto } = req.body ?? {};
  if (!unidadeId || !canalOrigem) {
    res.status(400).json({ error: "unidadeId e canalOrigem obrigatorios" });
    return;
  }
  try {
    const result = await db.execute(sql`
      INSERT INTO demandas_resolucao (unidade_id, paciente_id, canal_origem, assunto)
      VALUES (${unidadeId}, ${pacienteId ?? null}, ${canalOrigem}, ${assunto ?? null})
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/demandas-resolucao/:id/turno", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { autorTipo, autorNome, canal, mensagem, eventoCobravelCodigo } = req.body ?? {};
  if (!autorTipo || !canal) {
    res.status(400).json({ error: "autorTipo e canal obrigatorios" });
    return;
  }
  try {
    const evtId = eventoCobravelCodigo
      ? (await db.execute(sql`SELECT id FROM eventos_cobraveis WHERE codigo = ${eventoCobravelCodigo}`)).rows[0]?.id ?? null
      : null;

    const turnoRes = await db.execute(sql`
      SELECT COALESCE(MAX(turno), 0) + 1 AS proximo FROM pingue_pongue_log WHERE demanda_id = ${id}
    `);
    const turno = (turnoRes.rows[0] as any).proximo;

    const inserted = await db.execute(sql`
      INSERT INTO pingue_pongue_log (demanda_id, turno, autor_tipo, autor_nome, canal, mensagem, evento_cobravel_id)
      VALUES (${id}, ${turno}, ${autorTipo}, ${autorNome ?? null}, ${canal}, ${mensagem ?? null}, ${evtId})
      RETURNING *
    `);

    // Atualiza contador da demanda + dispara evento cobrável se houver
    await db.execute(sql`
      UPDATE demandas_resolucao
      SET turnos_pingue_pongue = turnos_pingue_pongue + 1
      WHERE id = ${id}
    `);

    // Se há evento cobrável: dispara e contabiliza no ledger + valor_total da demanda
    if (evtId) {
      const demanda = (await db.execute(sql`SELECT unidade_id FROM demandas_resolucao WHERE id = ${id}`)).rows[0] as any;
      const evento = (await db.execute(sql`SELECT preco_unitario FROM eventos_cobraveis WHERE id = ${evtId}`)).rows[0] as any;
      await db.execute(sql`
        INSERT INTO unidade_eventos_ledger (unidade_id, evento_id, valor_cobrado, referencia_externa)
        VALUES (${demanda.unidade_id}, ${evtId}, ${evento.preco_unitario}, ${"demanda#" + id})
      `);
      await db.execute(sql`
        UPDATE demandas_resolucao SET valor_total_cobrado = valor_total_cobrado + ${evento.preco_unitario} WHERE id = ${id}
      `);
    }

    res.status(201).json(inserted.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/demandas-resolucao/:id/concluir", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { resolvidoPor, caminhoResolucao } = req.body ?? {};
  if (!resolvidoPor) {
    res.status(400).json({ error: "resolvidoPor (robo/ia/humano) obrigatorio" });
    return;
  }
  try {
    const result = await db.execute(sql`
      UPDATE demandas_resolucao
      SET resolvido = TRUE,
          resolvido_por = ${resolvidoPor},
          resolvido_em = NOW(),
          caminho_resolucao = ${caminhoResolucao ?? null}
      WHERE id = ${id}
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/demandas-resolucao/:id/timeline", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await db.execute(sql`
      SELECT p.*, e.codigo AS evento_codigo, e.preco_unitario AS evento_preco
      FROM pingue_pongue_log p
      LEFT JOIN eventos_cobraveis e ON e.id = p.evento_cobravel_id
      WHERE p.demanda_id = ${id}
      ORDER BY p.turno
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

## `artifacts/api-server/src/routes/drivePawards.ts`
```ts
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getDriveClient, escapeDriveQuery } from "../lib/google-drive.js";

const router: IRouter = Router();

const PAWARDS_ROOT = "PAWARDS";
const SISTEMAS_CLINICO = "Sistemas Clinico";
const EMPRESAS = "Empresas";
const SUBPASTAS = ["Clientes", "Financeiro"] as const;
const SUBSUB_FINANCEIRO = ["Recorrentes", "Avulsos", "Faturas Mensais"] as const;

async function findOrCreate(drive: any, name: string, parentId?: string): Promise<{ id: string; created: boolean }> {
  const safe = escapeDriveQuery(name);
  const q = parentId
    ? `name='${safe}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${safe}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await drive.files.list({ q, fields: "files(id,name)", spaces: "drive" });
  if (list.data.files && list.data.files.length > 0) return { id: list.data.files[0].id, created: false };
  const meta: any = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) meta.parents = [parentId];
  const created = await drive.files.create({ requestBody: meta, fields: "id" });
  return { id: created.data.id, created: true };
}

// Provisiona estrutura PAWARDS completa pra TODAS as 10 clínicas (ou só uma específica)
router.post("/drive-pawards/provisionar", async (req, res): Promise<void> => {
  const rawId = req.body?.unidadeId;
  const parsed = rawId !== undefined && rawId !== null && rawId !== "" ? Number(rawId) : null;
  if (rawId !== undefined && rawId !== null && rawId !== "" && !Number.isInteger(parsed)) {
    res.status(400).json({ error: "unidadeId invalido" });
    return;
  }
  const unidadeIdOnly = Number.isInteger(parsed) ? parsed : null;
  try {
    const drive = await getDriveClient();
    const root = await findOrCreate(drive, PAWARDS_ROOT);
    const sistemasClinico = await findOrCreate(drive, SISTEMAS_CLINICO, root.id);
    const empresas = await findOrCreate(drive, EMPRESAS, sistemasClinico.id);

    const unidades = await db.execute(sql`
      SELECT id, nome FROM unidades
      WHERE id NOT BETWEEN 1 AND 7
      ${unidadeIdOnly ? sql`AND id = ${unidadeIdOnly}` : sql``}
      ORDER BY id
    `);

    const provisionadas: any[] = [];
    for (const u of unidades.rows as any[]) {
      const empresa = await findOrCreate(drive, u.nome, empresas.id);
      const clientes = await findOrCreate(drive, "Clientes", empresa.id);
      const financeiro = await findOrCreate(drive, "Financeiro", empresa.id);
      const recorrentes = await findOrCreate(drive, "Recorrentes", financeiro.id);
      for (const sub of SUBSUB_FINANCEIRO.slice(1)) {
        await findOrCreate(drive, sub, financeiro.id);
      }

      await db.execute(sql`
        INSERT INTO clinica_drive_estrutura (unidade_id, pasta_raiz_id, pasta_clientes_id, pasta_financeiro_id, pasta_recorrentes_id, url_raiz, criada_por)
        VALUES (${u.id}, ${empresa.id}, ${clientes.id}, ${financeiro.id}, ${recorrentes.id},
                ${"https://drive.google.com/drive/folders/" + empresa.id}, 'caio_provisionar')
        ON CONFLICT (unidade_id) DO UPDATE SET
          pasta_raiz_id = EXCLUDED.pasta_raiz_id,
          pasta_clientes_id = EXCLUDED.pasta_clientes_id,
          pasta_financeiro_id = EXCLUDED.pasta_financeiro_id,
          pasta_recorrentes_id = EXCLUDED.pasta_recorrentes_id,
          url_raiz = EXCLUDED.url_raiz
      `);

      provisionadas.push({
        unidadeId: u.id,
        nome: u.nome,
        empresaFolderId: empresa.id,
        clientesFolderId: clientes.id,
        financeiroFolderId: financeiro.id,
        recorrentesFolderId: recorrentes.id,
        url: `https://drive.google.com/drive/folders/${empresa.id}`,
      });
    }

    res.json({
      success: true,
      pawardsRootId: root.id,
      pawardsRootUrl: `https://drive.google.com/drive/folders/${root.id}`,
      empresasContainerId: empresas.id,
      provisionadas,
      total: provisionadas.length,
    });
  } catch (err: any) {
    console.error("[DrivePawards] provisionar error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/drive-pawards/estrutura", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        cde.unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        cde.pasta_raiz_id,
        cde.pasta_clientes_id,
        cde.pasta_financeiro_id,
        cde.pasta_recorrentes_id,
        cde.url_raiz,
        cde.criada_em
      FROM clinica_drive_estrutura cde
      JOIN unidades u ON u.id = cde.unidade_id
      WHERE u.id NOT BETWEEN 1 AND 7
      ORDER BY cde.unidade_id
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

## `artifacts/api-server/src/routes/unidades.ts`
```ts
import { Router } from "express";
import { db, unidadesTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { CriarUnidadeBody } from "@workspace/api-zod";

const router = Router();

router.get("/unidades", async (req, res): Promise<void> => {
  // Por padrao filtra arquivadas (ids 1-7 sao agendas-historicas confundidas).
  // ?incluirArquivadas=true para auditoria.
  const incluirArquivadas = req.query.incluirArquivadas === "true";
  const unidades = incluirArquivadas
    ? await db.select().from(unidadesTable).orderBy(unidadesTable.id)
    : await db.select().from(unidadesTable).where(gt(unidadesTable.id, 7)).orderBy(unidadesTable.id);
  res.json(unidades);
});

router.post("/unidades", async (req, res): Promise<void> => {
  const parsed = CriarUnidadeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [unidade] = await db.insert(unidadesTable).values(parsed.data).returning();
  res.status(201).json(unidade);
});

router.get("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
  res.json(unidade);
});

router.put("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existente] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!existente) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
  if (existente.tipo === "genesis_seed") {
    res.status(403).json({ error: "Instituto Genesis e semente perene — somente o administrador geral pode altera-la." });
    return;
  }
  const allowedFields = [
    "nome", "endereco", "bairro", "cidade", "estado", "cep", "cnpj",
    "telefone", "tipo", "googleCalendarId", "googleCalendarEmail", "cor", "ativa", "nick",
    "emailGeral", "emailAgenda", "emailEnfermagem01", "emailEnfermagem02",
    "emailConsultor01", "emailConsultor02", "emailSupervisor01", "emailSupervisor02",
    "emailFinanceiro01", "emailOuvidoria01",
  ];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }
  const [updated] = await db.update(unidadesTable).set(updates).where(eq(unidadesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
  res.json(updated);
});

router.delete("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
  if (unidade.tipo === "genesis_seed") {
    res.status(403).json({ error: "Instituto Genesis e semente perene — nao pode ser excluido. Apenas adicoes sao permitidas." });
    return;
  }
  const [deleted] = await db.delete(unidadesTable).where(eq(unidadesTable.id, id)).returning();
  res.json({ ok: true });
});

export default router;
```

## `artifacts/api-server/src/routes/index.ts`
```ts
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import comercialAdminRouter from "./comercialAdmin";
import paymentsRouter from "./payments";
import unidadesRouter from "./unidades";
import usuariosRouter from "./usuarios";
import pacientesRouter from "./pacientes";
import anamneseRouter from "./anamnese";
import motorClinicoRouter from "./motorClinico";
import blocosRouter from "./blocos";
import protocolosRouter from "./protocolos";
import filasRouter from "./filas";
import followupRouter from "./followup";
import financeiroRouter from "./financeiro";
import dashboardRouter from "./dashboard";
import fluxosRouter from "./fluxos";
import catalogoRouter from "./catalogo";
import questionarioPacienteRouter from "./questionarioPaciente";
import pedidosExameRouter from "./pedidosExame";
import substanciasRouter from "./substancias";
import sessoesRouter from "./sessoes";
import rasRouter from "./rasRoute";
import codigosSemanticosRouter from "./codigosSemanticos";
import googleCalendarRouter from "./googleCalendar";
import googleDriveRouter from "./googleDrive";
import googleGmailRouter from "./googleGmail";
import avaliacaoEnfermagemRouter from "./avaliacaoEnfermagem";
import taskCardsRouter from "./taskCards";
import rasEvolutivoRouter from "./rasEvolutivo";
import avaliacoesClienteRouter from "./avaliacoesCliente";
import portalClienteRouter from "./portalCliente";
import cavaloClinicalRouter from "./cavaloClinical";
import soberaniaRouter from "./soberania";
import auditoriaCascataRouter from "./auditoriaCascata";
import alertasRouter from "./alertas";
import mensagensRouter from "./mensagens";
import governancaRouter from "./governanca";
import examesInteligenteRouter from "./examesInteligente";
import monitoramentoPacienteRouter from "./monitoramentoPaciente";
import alertaPacienteRouter from "./alertaPaciente";
import direcaoExameRouter from "./direcaoExame";
import formulaBlendRouter from "./formulaBlend";
import backupDriveRouter from "./backupDrive";
import whatsappRouter from "./whatsapp";
import seedSemanticoRouter from "./seedSemantico";
import semanticoRouter from "./semantico";
import segurancaRouter from "./seguranca";
import delegacaoRouter from "./delegacao";
import seedConsultoriaRouter from "./seedConsultoria";
import acompanhamentoRouter from "./acompanhamento";
import comissaoRouter from "./comissao";
import comercialRouter from "./comercial";
import slaRouter from "./sla";
import matrixRouter from "./matrix";
import agendaMotorRouter from "./agenda-motor";
import colaboradoresRouter from "./colaboradores";
import agentesVirtuaisRouter from "./agentesVirtuais";
import rasDistribuirRouter from "./rasDistribuir";
import consultoriasRouter from "./consultoriasRoute";
import inundacaoRouter from "./inundacao";
import contratosRouter from "./contratosRoute";
import raclRacjRouter from "./raclRacj";
import rasxRevoRouter from "./rasxRevo";
import rasxArquRouter from "./rasxArqu";
import emailComunicacaoRouter from "./emailComunicacao";
import termosJuridicosRouter from "./termosJuridicos";
import genesisRouter from "./genesis";
import genesisPopularRouter from "./genesisPopular";
import documentosReferenciaRouter from "./documentosReferencia";
import assinaturasRouter from "./assinaturas";
import assinaturasWebhookRouter from "./assinaturasWebhook";
import juridicoNotaFiscalRouter from "./juridicoNotaFiscal";
import assinaturaCRUDRouter from "./assinaturaCRUD";
import manifestoNacionalRouter from "./manifestoNacional";
import planosTerapeuticosRouter from "./planosTerapeuticos";
import laboratorioIntegrativoRouter from "./laboratorioIntegrativo";
import prescricoesLembreteRouter from "./prescricoesLembrete";
import examesRouter from "./exames";
import agendasProfissionaisRouter from "./agendasProfissionais";
import matrixGovernancaCategoriaRouter from "./matrixGovernancaCategoria";
import monetizacaoPadconRouter from "./monetizacaoPadcon";
import drivePawardsRouter from "./drivePawards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(unidadesRouter);
router.use(usuariosRouter);
router.use(pacientesRouter);
router.use(anamneseRouter);
router.use(motorClinicoRouter);
router.use(blocosRouter);
router.use(protocolosRouter);
router.use(filasRouter);
router.use(followupRouter);
router.use(financeiroRouter);
router.use(dashboardRouter);
router.use(fluxosRouter);
router.use("/catalogo", catalogoRouter);
router.use(questionarioPacienteRouter);
router.use("/pedidos-exame", pedidosExameRouter);
router.use(substanciasRouter);
router.use(sessoesRouter);
router.use(rasRouter);
router.use(codigosSemanticosRouter);
router.use(googleCalendarRouter);
router.use(googleDriveRouter);
router.use(googleGmailRouter);
router.use(avaliacaoEnfermagemRouter);
router.use(taskCardsRouter);
router.use(rasEvolutivoRouter);
router.use(avaliacoesClienteRouter);
router.use(portalClienteRouter);
router.use(cavaloClinicalRouter);
router.use(soberaniaRouter);
router.use(auditoriaCascataRouter);
router.use(alertasRouter);
router.use(mensagensRouter);
router.use(governancaRouter);
router.use(examesInteligenteRouter);
router.use(monitoramentoPacienteRouter);
router.use(alertaPacienteRouter);
router.use(direcaoExameRouter);
router.use(formulaBlendRouter);
router.use(backupDriveRouter);
router.use(whatsappRouter);
router.use("/seed-semantico", seedSemanticoRouter);
router.use("/semantico", semanticoRouter);
router.use(segurancaRouter);
router.use("/delegacao", delegacaoRouter);
router.use("/seed-consultoria", seedConsultoriaRouter);
router.use(acompanhamentoRouter);
router.use(comissaoRouter);
router.use(comercialRouter);
router.use(slaRouter);
router.use(matrixRouter);
router.use(agendaMotorRouter);
router.use("/colaboradores", colaboradoresRouter);
router.use("/agentes-virtuais", agentesVirtuaisRouter);
router.use(rasDistribuirRouter);
router.use(consultoriasRouter);
router.use(inundacaoRouter);
router.use(contratosRouter);
router.use(raclRacjRouter);
router.use(rasxRevoRouter);
router.use(rasxArquRouter);
router.use(emailComunicacaoRouter);
router.use(termosJuridicosRouter);
router.use("/genesis", genesisRouter);
router.use("/genesis-popular", genesisPopularRouter);
router.use(documentosReferenciaRouter);
router.use(assinaturasRouter);
router.use(assinaturasWebhookRouter);
router.use(juridicoNotaFiscalRouter);
router.use(assinaturaCRUDRouter);
router.use(manifestoNacionalRouter);
router.use(planosTerapeuticosRouter);
router.use(laboratorioIntegrativoRouter);
router.use(prescricoesLembreteRouter);
router.use(examesRouter);
router.use(agendasProfissionaisRouter);
router.use(matrixGovernancaCategoriaRouter);
router.use(monetizacaoPadconRouter);
router.use(drivePawardsRouter);
router.use("/payments", paymentsRouter);
router.use(comercialAdminRouter);

// PADCOM V15 — Anamnese Integrativa Estruturada (Manus Bundle)
import padcomRouter from "./padcom";
router.use(padcomRouter);

export default router;
```

## `artifacts/api-server/src/middlewares/tenantContext.ts`
```ts
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      tenantContext?: {
        unidadeId: number | null;
        origem: "header" | "query" | "session" | "default";
      };
    }
  }
}

export function tenantContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const headerVal = req.header("x-unidade-id");
  const queryVal = typeof req.query["unidade_id"] === "string" ? req.query["unidade_id"] : undefined;
  const sessionVal = (req as any).session?.unidadeId;

  let unidadeId: number | null = null;
  let origem: "header" | "query" | "session" | "default" = "default";

  if (headerVal && !Number.isNaN(Number(headerVal))) { unidadeId = Number(headerVal); origem = "header"; }
  else if (queryVal && !Number.isNaN(Number(queryVal))) { unidadeId = Number(queryVal); origem = "query"; }
  else if (sessionVal != null && !Number.isNaN(Number(sessionVal))) { unidadeId = Number(sessionVal); origem = "session"; }

  req.tenantContext = { unidadeId, origem };
  next();
}
```

## `artifacts/clinica-motor/src/components/Layout.tsx`
```tsx
import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useLembretesFalhasContagem } from "@/hooks/useLembretesFalhasContagem";
import {
  LayoutDashboard, ClipboardList, CheckSquare, ListOrdered, Users, Pill, BookOpen, CalendarClock, CreditCard,
  Building2, Settings, LogOut, Activity, GitBranch, ShieldCheck, Database, FileText, FlaskConical, CalendarDays,
  FileCheck, KeyRound, Package, ClipboardCheck, AlertTriangle, BarChart3, Shield, Lock, Radar, Send,
  ChevronDown, ChevronRight, Globe, Diamond, DollarSign, TrendingUp, Scale, Grid3X3, UserCheck, Bot, Apple, Brain,
  ClipboardList as ClipboardListIcon, Building, FileSignature, BellRing, MessageSquareText, Cloud, Mountain, Heart, Sparkles, MessageCircle,
} from "lucide-react";
import { Button } from "./ui/button";

function ClinicSwitcher() {
  const { unidadeSelecionada, setUnidadeSelecionada, unidadesDisponiveis, nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas, escopo } = useClinic();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canSwitch = escopo === "consultoria_master" || (escopo === "consultor_campo" && unidadesDisponiveis.length > 1);
  if (unidadesDisponiveis.length === 0) return null;

  // Pádua (15) e Genesis (14) sobem pro topo com destaque
  const padua = unidadesDisponiveis.find((u) => u.unidadeId === 15);
  const genesis = unidadesDisponiveis.find((u) => u.unidadeId === 14);
  const outras = unidadesDisponiveis.filter((u) => u.unidadeId !== 14 && u.unidadeId !== 15);

  const decorarNome = (uid: number, nome: string) => {
    if (uid === 15) return `⭐ ${nome}`;
    if (uid === 14) return `🧬 ${nome}`;
    return nome;
  };

  return (
    <div ref={ref} className="px-3 py-2 border-b border-border relative">
      <button
        onClick={() => canSwitch && setOpen(!open)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors rounded ${canSwitch ? "hover:bg-sidebar-accent/50 cursor-pointer" : "cursor-default"}`}
        data-testid="clinic-switcher-toggle"
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: corUnidadeSelecionada || "hsl(210, 45%, 65%)" }} />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-sidebar-foreground truncate block">
            {unidadeSelecionada ? decorarNome(unidadeSelecionada, nomeUnidadeSelecionada) : nomeUnidadeSelecionada}
          </span>
          <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: isTodasClinicas ? "hsl(210, 45%, 65%)" : corUnidadeSelecionada || "#6B7280" }}>
            {isTodasClinicas ? "Visao Global" : "Visao Local"}
          </span>
        </div>
        {canSwitch && <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-card border border-border rounded shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
          {(escopo === "consultoria_master" || escopo === "consultor_campo") && (
            <button
              onClick={() => { setUnidadeSelecionada(null); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-sidebar-accent/50 transition-colors ${isTodasClinicas ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground"}`}
              data-testid="clinic-option-todas"
            >
              <Globe className="w-3.5 h-3.5" />
              Todas as Clínicas
            </button>
          )}
          {padua && (
            <button
              key={padua.unidadeId}
              onClick={() => { setUnidadeSelecionada(padua.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#B8941F]/10 transition-colors border-l-2 ${unidadeSelecionada === padua.unidadeId ? "bg-[#B8941F]/15 font-semibold border-l-[#B8941F]" : "border-l-[#B8941F]/40 text-sidebar-foreground"}`}
              data-testid="clinic-option-padua"
            >
              <span className="text-base">⭐</span>
              <span className="font-medium">{padua.unidadeNome}</span>
              <span className="ml-auto text-[9px] text-[#B8941F] uppercase font-bold">PRINCIPAL</span>
            </button>
          )}
          {genesis && (
            <button
              key={genesis.unidadeId}
              onClick={() => { setUnidadeSelecionada(genesis.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-purple-500/10 transition-colors border-l-2 ${unidadeSelecionada === genesis.unidadeId ? "bg-purple-500/15 font-semibold border-l-purple-500" : "border-l-purple-500/40 text-sidebar-foreground"}`}
              data-testid="clinic-option-genesis"
            >
              <span className="text-base">🧬</span>
              <span className="font-medium">{genesis.unidadeNome}</span>
              <span className="ml-auto text-[9px] text-purple-500 uppercase font-bold">COFRE</span>
            </button>
          )}
          {(padua || genesis) && outras.length > 0 && <div className="my-1 mx-3 border-t border-border" />}
          {outras.map((u) => (
            <button
              key={u.unidadeId}
              onClick={() => { setUnidadeSelecionada(u.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-sidebar-accent/50 transition-colors ${unidadeSelecionada === u.unidadeId ? "bg-primary/10 font-semibold" : "text-sidebar-foreground"}`}
              data-testid={`clinic-option-${u.unidadeId}`}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: u.unidadeCor || "#6B7280" }} />
              {u.unidadeNome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Item = { name: string; path: string; icon: any; slug: string };
type Grupo = { id: string; nome: string; icon: any; cor?: string; items: Item[] };

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { unidadeSelecionada, setUnidadeSelecionada, unidadesDisponiveis } = useClinic();
  const { total: falhasLembrete } = useLembretesFalhasContagem(unidadeSelecionada);

  // Default Pádua APENAS na primeira sessão (não anula escolha "Todas as Clínicas")
  useEffect(() => {
    const jaInicializou = localStorage.getItem("padua_default_aplicado");
    if (!jaInicializou && unidadeSelecionada === null && unidadesDisponiveis.length > 0) {
      const padua = unidadesDisponiveis.find((u) => u.unidadeId === 15);
      if (padua) {
        setUnidadeSelecionada(15);
        localStorage.setItem("padua_default_aplicado", "1");
      }
    }
  }, [unidadesDisponiveis, unidadeSelecionada, setUnidadeSelecionada]);

  // Estado de colapso por grupo (lembrar via localStorage) — DEVE vir antes do early return
  const [colapsados, setColapsados] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("layout_grupos_colapsados") || "{}");
    } catch { return {}; }
  });
  const toggleGrupo = (id: string) => {
    setColapsados((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("layout_grupos_colapsados", JSON.stringify(next));
      return next;
    });
  };

  if (!user) return <>{children}</>;

  const VISIBILIDADE_POR_ESCOPO: Record<string, string[]> = {
    consultoria_master: [
      "dashboard", "dashboard-local", "monetizar", "demandas-resolucao",
      "painel-comando", "governanca", "justificativas", "matriz-analitica",
      "agenda-motor", "anamnese", "validacao",
      "filas", "pacientes", "itens-terapeuticos", "protocolos", "followup",
      "financeiro", "unidades", "fluxos", "pedidos-exame", "substancias",
      "agenda", "ras", "codigos-validacao", "estoque", "avaliacao-enfermagem",
      "task-cards", "ras-evolutivo", "catalogo", "permissoes", "seguranca",
      "configuracoes", "delegacao", "colaboradores", "agentes-virtuais", "acompanhamento", "comissao", "comercial",
      "dietas", "psicologia", "questionario-master", "consultorias", "contratos", "lembretes-falhas", "mensagens",
      "exames", "inundacao", "blueprint", "agendas", "governanca-matrix",
    ],
    consultor_campo: [
      "delegacao", "colaboradores", "pacientes", "anamnese", "followup", "agenda",
      "task-cards", "filas", "avaliacao-enfermagem", "estoque", "acompanhamento", "comissao",
      "justificativas", "lembretes-falhas", "dashboard-local", "demandas-resolucao",
    ],
    clinica_medico: ["anamnese","validacao","pacientes","itens-terapeuticos","pedidos-exame","agenda","ras","ras-evolutivo","followup","delegacao","colaboradores","lembretes-falhas","dashboard-local"],
    clinica_enfermeira: ["anamnese","filas","pacientes","followup","agenda","estoque","avaliacao-enfermagem","task-cards","delegacao","colaboradores","lembretes-falhas","dashboard-local"],
    clinica_admin: ["anamnese","filas","pacientes","followup","agenda","estoque","avaliacao-enfermagem","task-cards","financeiro","delegacao","colaboradores","lembretes-falhas","dashboard-local"],
  };

  const grupos: Grupo[] = [
    {
      id: "global",
      nome: "DASHBOARD GLOBAL",
      icon: Cloud,
      cor: "#1F4E5F",
      items: [
        { name: "Visão Geral", path: "/dashboard", icon: LayoutDashboard, slug: "dashboard" },
        { name: "Painel de Comando", path: "/painel-comando", icon: Radar, slug: "painel-comando" },
        { name: "💰 Monetizar PADCON", path: "/monetizar", icon: Heart, slug: "monetizar" },
        { name: "🛡️ Matrix Governança", path: "/governanca-matrix", icon: Shield, slug: "governanca-matrix" },
        { name: "Governança Geral", path: "/governanca", icon: Shield, slug: "governanca" },
        { name: "SLA Justificativas", path: "/justificativas", icon: Scale, slug: "justificativas" },
        { name: "Matriz Analítica", path: "/matriz-analitica", icon: Grid3X3, slug: "matriz-analitica" },
        { name: "🏛️ Blueprint Arquitetura", path: "/blueprint", icon: Building, slug: "blueprint" },
        { name: "💧 Inundação Genesis", path: "/inundacao", icon: Database, slug: "inundacao" },
      ],
    },
    {
      id: "local",
      nome: "DASHBOARD LOCAL",
      icon: Mountain,
      cor: "#A78B5F",
      items: [
        { name: "⛰️ Visão da Clínica", path: "/dashboard-local", icon: Mountain, slug: "dashboard-local" },
        { name: "🏷️ Demandas Resolução", path: "/demandas-resolucao", icon: MessageCircle, slug: "demandas-resolucao" },
        { name: "Lembretes & Falhas", path: "/lembretes-falhas", icon: BellRing, slug: "lembretes-falhas" },
        { name: "Mensagens", path: "/mensagens", icon: MessageSquareText, slug: "mensagens" },
        { name: "Acompanhamento", path: "/acompanhamento", icon: Diamond, slug: "acompanhamento" },
      ],
    },
    {
      id: "agendas",
      nome: "AGENDAS & MOTOR",
      icon: CalendarDays,
      cor: "#5C7C8A",
      items: [
        { name: "🏔️ Matriz de Agenda", path: "/agendas", icon: CalendarDays, slug: "agendas" },
        { name: "Motor de Agenda", path: "/agenda-motor", icon: CalendarDays, slug: "agenda-motor" },
        { name: "Agenda Semanal", path: "/agenda", icon: CalendarDays, slug: "agenda" },
        { name: "Follow-up", path: "/followup", icon: CalendarClock, slug: "followup" },
      ],
    },
    {
      id: "pacientes",
      nome: "CLÍNICA & PACIENTES",
      icon: Users,
      cor: "#7B6450",
      items: [
        { name: "Anamnese", path: "/anamnese", icon: ClipboardList, slug: "anamnese" },
        { name: "Validação", path: "/validacao", icon: CheckSquare, slug: "validacao" },
        { name: "Filas", path: "/filas", icon: ListOrdered, slug: "filas" },
        { name: "Pacientes", path: "/pacientes", icon: Users, slug: "pacientes" },
        { name: "Pedidos de Exame", path: "/pedidos-exame", icon: FileText, slug: "pedidos-exame" },
        { name: "RAS", path: "/ras", icon: FileCheck, slug: "ras" },
        { name: "RAS Evolutivo", path: "/ras-evolutivo", icon: BarChart3, slug: "ras-evolutivo" },
        { name: "Aval. Enfermagem", path: "/avaliacao-enfermagem", icon: ClipboardCheck, slug: "avaliacao-enfermagem" },
        { name: "Task Cards", path: "/task-cards", icon: AlertTriangle, slug: "task-cards" },
        { name: "Dietas", path: "/dietas", icon: Apple, slug: "dietas" },
        { name: "Psicologia", path: "/psicologia", icon: Brain, slug: "psicologia" },
      ],
    },
    {
      id: "catalogos",
      nome: "CATÁLOGOS GLOBAIS",
      icon: Database,
      cor: "#B8941F",
      items: [
        { name: "Catalogo Pawards", path: "/catalogo", icon: Database, slug: "catalogo" },
        { name: "Itens Terapêuticos", path: "/itens-terapeuticos", icon: Pill, slug: "itens-terapeuticos" },
        { name: "Protocolos", path: "/protocolos", icon: BookOpen, slug: "protocolos" },
        { name: "Substâncias", path: "/substancias", icon: FlaskConical, slug: "substancias" },
        { name: "Exames (Catálogo)", path: "/exames", icon: FlaskConical, slug: "exames" },
        { name: "Estoque", path: "/estoque", icon: Package, slug: "estoque" },
        { name: "Códigos Validação", path: "/codigos-validacao", icon: KeyRound, slug: "codigos-validacao" },
        { name: "Questionário Master", path: "/questionario-master", icon: ClipboardListIcon, slug: "questionario-master" },
      ],
    },
    {
      id: "estrutura",
      nome: "ESTRUTURA & RH",
      icon: Building,
      cor: "#1F4E5F",
      items: [
        { name: "Unidades", path: "/unidades", icon: Building2, slug: "unidades" },
        { name: "Consultorias", path: "/consultorias", icon: Building, slug: "consultorias" },
        { name: "Contratos", path: "/contratos", icon: FileSignature, slug: "contratos" },
        { name: "Colaboradores & RH", path: "/colaboradores", icon: UserCheck, slug: "colaboradores" },
        { name: "Delegação", path: "/delegacao", icon: Send, slug: "delegacao" },
        { name: "Agentes Virtuais", path: "/agentes-virtuais", icon: Bot, slug: "agentes-virtuais" },
        { name: "Comissão & Metas", path: "/comissao", icon: DollarSign, slug: "comissao" },
        { name: "Comercial", path: "/comercial", icon: TrendingUp, slug: "comercial" },
        { name: "Financeiro", path: "/financeiro", icon: CreditCard, slug: "financeiro" },
        { name: "Fluxos Aprovação", path: "/fluxos", icon: GitBranch, slug: "fluxos" },
        { name: "Permissões", path: "/permissoes", icon: ShieldCheck, slug: "permissoes" },
        { name: "Segurança", path: "/seguranca", icon: Lock, slug: "seguranca" },
        { name: "Configurações", path: "/configuracoes", icon: Settings, slug: "configuracoes" },
      ],
    },
  ];

  const escopo = (user as any).escopo || "consultoria_master";
  const modulosPermitidos = VISIBILIDADE_POR_ESCOPO[escopo] || VISIBILIDADE_POR_ESCOPO.consultoria_master;
  const escopoLabel = escopo === "consultoria_master" ? "Master" : escopo === "consultor_campo" ? "Consultor" : escopo.replace("clinica_", "").replace("_", " ");

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <div className="w-9 h-9 flex items-center justify-center bg-white/90 border border-border mr-3 p-1">
            <img src={`${import.meta.env.BASE_URL}logo-dp.png`} alt="DP" className="w-full h-full object-contain invert-0" />
          </div>
          <div>
            <span className="font-bold text-sm text-sidebar-foreground tracking-tight uppercase">Pawards</span>
            <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">Developed by Pawards MedCore</span>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-border">
          <div className="text-sm font-semibold text-sidebar-foreground truncate">{user.nome}</div>
          <div className="text-[11px] text-muted-foreground capitalize tracking-wide">{user.perfil.replace("_", " ")}</div>
          <div className="text-[9px] text-primary/70 uppercase tracking-widest mt-0.5">{escopoLabel}</div>
        </div>
        <ClinicSwitcher />
        <nav className="flex-1 overflow-y-auto py-2 px-1">
          {grupos.map((g) => {
            const items = g.items.filter((i) => modulosPermitidos.includes(i.slug));
            if (items.length === 0) return null;
            const colapsado = !!colapsados[g.id];
            const GIcon = g.icon;
            return (
              <div key={g.id} className="mb-1.5">
                <button
                  onClick={() => toggleGrupo(g.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`grupo-toggle-${g.id}`}
                >
                  <GIcon className="w-3 h-3" style={{ color: g.cor }} />
                  <span className="flex-1 text-left">{g.nome}</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${colapsado ? "" : "rotate-90"}`} />
                </button>
                {!colapsado && (
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.path || location.startsWith(item.path + "/");
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          className={`flex items-center px-3 py-1.5 text-[12px] transition-colors border-l-2 ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-primary"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-transparent"
                          }`}
                          data-testid={`menu-${item.slug}`}
                        >
                          <Icon className="mr-2.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span className="flex-1 truncate">{item.name}</span>
                          {item.slug === "lembretes-falhas" && falhasLembrete > 0 ? (
                            <span data-testid="badge-lembretes-falhas"
                              className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none">
                              {falhasLembrete > 99 ? "99+" : falhasLembrete}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs" onClick={logout}>
            <LogOut className="mr-3 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
```

## `artifacts/clinica-motor/src/pages/monetizar.tsx`
```tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Activity, DollarSign, Calendar, MessageSquare, Sparkles, Cloud, Mountain, Heart } from "lucide-react";

type Aba = "agenda" | "aplicacao" | "mensageria" | "provisionamento" | "live";

const ABAS: { id: Aba; nome: string; icon: any; cor: string }[] = [
  { id: "agenda", nome: "Monetizar Agenda", icon: Calendar, cor: "#1F4E5F" },
  { id: "aplicacao", nome: "Monetizar Aplicação", icon: Sparkles, cor: "#A78B5F" },
  { id: "mensageria", nome: "Monetizar Mensageria", icon: MessageSquare, cor: "#5C7C8A" },
  { id: "provisionamento", nome: "Monetizar Provisionamento", icon: Cloud, cor: "#7B6450" },
  { id: "live", nome: "Faturamento Live", icon: Activity, cor: "#B8941F" },
];

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MonetizarPage() {
  const [aba, setAba] = useState<Aba>("agenda");
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <Heart className="w-7 h-7 text-[#B8941F]" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">💰 Monetizar PADCON</h1>
          <p className="text-xs text-muted-foreground">Coração que bombeia: cada ação clínica = 1 evento gravado no ledger = 1 centavo cobrado</p>
        </div>
      </header>

      <div className="flex gap-1 border-b border-border overflow-x-auto" data-testid="tabs-monetizar">
        {ABAS.map((a) => {
          const Icon = a.icon;
          const ativo = aba === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              data-testid={`tab-${a.id}`}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                ativo
                  ? "border-[#B8941F] text-[#1F4E5F] bg-[#B8941F]/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: ativo ? a.cor : undefined }} />
              {a.nome}
            </button>
          );
        })}
      </div>

      {aba === "live" ? <FaturamentoLive /> : <MatrizModulosEventos grupo={aba} />}
    </div>
  );
}

function MatrizModulosEventos({ grupo }: { grupo: Exclude<Aba, "live"> }) {
  const qc = useQueryClient();
  const { data: matriz = [], isLoading } = useQuery<any[]>({
    queryKey: ["modulos-padcon-matriz"],
    queryFn: () => fetch("/api/modulos-padcon/matriz").then((r) => r.json()),
  });
  const { data: eventos = [] } = useQuery<any[]>({
    queryKey: ["eventos-cobraveis"],
    queryFn: () => fetch("/api/eventos-cobraveis").then((r) => r.json()),
  });

  const mut = useMutation({
    mutationFn: ({ unidadeId, moduloId, ativo }: any) =>
      fetch(`/api/modulos-padcon/ativar/${unidadeId}/${moduloId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo, usuario: "caio" }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modulos-padcon-matriz"] }),
  });

  const dispMut = useMutation({
    mutationFn: ({ unidadeId, eventoCodigo }: any) =>
      fetch(`/api/eventos-cobraveis/disparar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidadeId, eventoCodigo, referenciaExterna: "teste-manual-painel" }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faturamento-live"] }),
  });

  const matrizFiltrada = useMemo(() => matriz.filter((m: any) => m.grupo === grupo), [matriz, grupo]);
  const eventosFiltrados = useMemo(() => eventos.filter((e: any) => e.grupo === grupo), [eventos, grupo]);

  const unidades = useMemo(() => {
    const seen = new Set();
    return matrizFiltrada
      .filter((m: any) => (seen.has(m.unidade_id) ? false : (seen.add(m.unidade_id), true)))
      .map((m: any) => ({ id: m.unidade_id, nome: m.unidade_nome, cor: m.unidade_cor }));
  }, [matrizFiltrada]);

  const modulos = useMemo(() => {
    const seen = new Set();
    return matrizFiltrada
      .filter((m: any) => (seen.has(m.modulo_id) ? false : (seen.add(m.modulo_id), true)))
      .map((m: any) => ({ id: m.modulo_id, codigo: m.modulo_codigo, nome: m.modulo_nome, preco: m.preco_mensal }));
  }, [matrizFiltrada]);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando matriz...</div>;

  return (
    <div className="space-y-6">
      {/* MÓDULOS — mensalidade */}
      <Card className="p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F4E5F] mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> MÓDULOS (mensalidade)
        </h2>
        {modulos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem módulos neste grupo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-2 font-semibold">Módulo</th>
                  <th className="text-right p-2 font-semibold">Preço/mês</th>
                  {unidades.map((u: any) => (
                    <th key={u.id} className="text-center p-2 font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.cor || "#999" }} />
                        <span className="text-[10px] uppercase">{u.nome.replace("INSTITUTO ", "")}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modulos.map((m: any) => (
                  <tr key={m.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="p-2 font-mono text-[11px]">
                      <span className="text-[#B8941F] font-bold">{m.codigo}</span> {m.nome}
                    </td>
                    <td className="p-2 text-right font-mono text-[11px] font-semibold text-[#1F4E5F]">{fmt(m.preco)}</td>
                    {unidades.map((u: any) => {
                      const cell = matrizFiltrada.find((x: any) => x.unidade_id === u.id && x.modulo_id === m.id);
                      const ativo = cell?.ativo ?? false;
                      return (
                        <td key={u.id} className="p-2 text-center">
                          <Switch
                            checked={ativo}
                            onCheckedChange={(v) => mut.mutate({ unidadeId: u.id, moduloId: m.id, ativo: v })}
                            data-testid={`switch-${m.codigo}-${u.id}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* EVENTOS — pay per use */}
      <Card className="p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F4E5F] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" /> EVENTOS COBRÁVEIS (pay-per-use)
        </h2>
        {eventosFiltrados.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem eventos neste grupo.</p>
        ) : (
          <div className="space-y-2">
            {eventosFiltrados.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded border border-border/40 bg-muted/20">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono">
                    <span className="text-[#B8941F] font-bold">{e.codigo}</span> · {e.nome}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Trigger: <code className="text-[#5C7C8A]">{e.trigger_origem ?? "—"}</code>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-sm font-mono font-bold text-[#1F4E5F]">{fmt(e.preco_unitario)}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">por {e.unidade_medida}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3 text-[10px] h-7"
                  onClick={() => {
                    const u = prompt("ID da unidade pra disparar teste? (ex: 15 = Pádua)");
                    if (u) dispMut.mutate({ unidadeId: parseInt(u, 10), eventoCodigo: e.codigo });
                  }}
                  data-testid={`btn-disparar-${e.codigo}`}
                >
                  Disparar
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function FaturamentoLive() {
  const competencia = new Date().toISOString().slice(0, 7);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["faturamento-live", competencia],
    queryFn: () => fetch(`/api/ledger/faturamento-live?competencia=${competencia}`).then((r) => r.json()),
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando faturamento...</div>;
  if (!data) return null;

  const totais = data.totaisPorUnidade ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-r from-[#1F4E5F]/5 to-[#B8941F]/5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F4E5F] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#B8941F]" /> Faturamento Live · Competência {competencia}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {totais.map((t: any) => {
            const total = Number(t.total_eventos ?? 0) + Number(t.total_modulos ?? 0);
            return (
              <div key={t.unidade_id} className="p-3 rounded border border-border bg-card" data-testid={`fatura-card-${t.unidade_id}`}>
                <div className="text-[11px] uppercase font-semibold text-muted-foreground">{t.unidade_nome}</div>
                <div className="text-2xl font-mono font-bold text-[#1F4E5F] mt-1">{fmt(total)}</div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
                  <span>Módulos: {fmt(t.total_modulos)}</span>
                  <span>Eventos: {fmt(t.total_eventos)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Detalhamento por evento</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-2">Unidade</th>
                <th className="text-left p-2">Grupo</th>
                <th className="text-left p-2">Evento</th>
                <th className="text-right p-2">Qtd</th>
                <th className="text-right p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.detalhe.filter((d: any) => d.evento_codigo).map((d: any, i: number) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="p-2">{d.unidade_nome}</td>
                  <td className="p-2 text-muted-foreground uppercase text-[10px]">{d.grupo}</td>
                  <td className="p-2 font-mono"><span className="text-[#B8941F]">{d.evento_codigo}</span> · {d.evento_nome}</td>
                  <td className="p-2 text-right font-mono">{d.qtd}</td>
                  <td className="p-2 text-right font-mono font-semibold text-[#1F4E5F]">{fmt(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
```

## `artifacts/clinica-motor/src/pages/dashboard-local.tsx`
```tsx
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useClinic } from "@/contexts/ClinicContext";
import { AlertTriangle, Activity, Syringe, MessageSquareWarning, CalendarClock, FileText, DollarSign, Mountain } from "lucide-react";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function DashboardLocalPage() {
  const { unidadeSelecionada, nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas } = useClinic();

  const competencia = new Date().toISOString().slice(0, 7);
  const { data: faturamento } = useQuery<any>({
    queryKey: ["faturamento-live-local", competencia, unidadeSelecionada],
    queryFn: () => fetch(`/api/ledger/faturamento-live?competencia=${competencia}`).then((r) => r.json()),
    refetchInterval: 15000,
    enabled: !isTodasClinicas,
  });

  if (isTodasClinicas) {
    return (
      <Card className="p-6 text-center">
        <Mountain className="w-12 h-12 mx-auto text-[#1F4E5F]/40 mb-3" />
        <h2 className="text-lg font-bold text-[#1F4E5F]">Selecione uma clínica no canto superior esquerdo</h2>
        <p className="text-sm text-muted-foreground mt-1">O Dashboard Local mostra o que está acontecendo dentro da unidade escolhida.</p>
      </Card>
    );
  }

  const meuFat = faturamento?.totaisPorUnidade?.find((t: any) => t.unidade_id === unidadeSelecionada);
  const totalLocal = Number(meuFat?.total_eventos ?? 0) + Number(meuFat?.total_modulos ?? 0);

  const cards = [
    { titulo: "Pacientes com demanda atrasada", valor: "—", icon: AlertTriangle, cor: "#C0392B" },
    { titulo: "Em atendimento agora", valor: "—", icon: Activity, cor: "#27AE60" },
    { titulo: "Atrasos de aplicação semanal", valor: "—", icon: Syringe, cor: "#E67E22" },
    { titulo: "Reclamações da unidade", valor: "—", icon: MessageSquareWarning, cor: "#8E44AD" },
    { titulo: "Reagendamentos pendentes", valor: "—", icon: CalendarClock, cor: "#2980B9" },
    { titulo: "Log de atividades local", valor: "—", icon: FileText, cor: "#5C7C8A" },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: corUnidadeSelecionada || "#999" }} />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">⛰️ {nomeUnidadeSelecionada}</h1>
          <p className="text-xs text-muted-foreground">Dashboard Local · visão da clínica selecionada</p>
        </div>
      </header>

      <Card className="p-4 bg-gradient-to-r from-[#B8941F]/10 to-transparent">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-[#B8941F]" />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Consumo PADCON · {competencia}</div>
            <div className="text-3xl font-mono font-bold text-[#1F4E5F]">{fmt(totalLocal)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Módulos: {fmt(meuFat?.total_modulos)} · Eventos: {fmt(meuFat?.total_eventos)}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="p-4 hover:shadow-md transition-shadow" data-testid={`local-card-${i}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{c.titulo}</div>
                  <div className="text-3xl font-mono font-bold mt-1" style={{ color: c.cor }}>{c.valor}</div>
                </div>
                <Icon className="w-6 h-6 opacity-60" style={{ color: c.cor }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">Em breve · ligando ao banco real</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

## `artifacts/clinica-motor/src/pages/demandas-resolucao.tsx`
```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClinic } from "@/contexts/ClinicContext";
import { Bot, Brain, User, CheckCircle2, MessageCircle, Phone } from "lucide-react";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const RESOLVEDORES = [
  { tipo: "robo", nome: "🤖 Robô", icon: Bot, cor: "#5C7C8A" },
  { tipo: "ia", nome: "🧠 IA", icon: Brain, cor: "#7B6450" },
  { tipo: "humano", nome: "🙋 Humano", icon: User, cor: "#B8941F" },
];

export default function DemandasResolucaoPage() {
  const { unidadeSelecionada, isTodasClinicas } = useClinic();
  const qc = useQueryClient();
  const [demandaAberta, setDemandaAberta] = useState<number | null>(null);

  const { data: demandas = [] } = useQuery<any[]>({
    queryKey: ["demandas-resolucao", unidadeSelecionada],
    queryFn: () =>
      fetch(`/api/demandas-resolucao${!isTodasClinicas ? `?unidadeId=${unidadeSelecionada}` : ""}`).then((r) => r.json()),
  });

  const concluir = useMutation({
    mutationFn: ({ id, resolvidoPor }: any) =>
      fetch(`/api/demandas-resolucao/${id}/concluir`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvidoPor, caminhoResolucao: `concluido-via-${resolvidoPor}` }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demandas-resolucao"] }),
  });

  const criarSeed = useMutation({
    mutationFn: () =>
      fetch(`/api/demandas-resolucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidadeId: unidadeSelecionada || 15,
          canalOrigem: "whatsapp",
          assunto: "Confirmação de retorno - paciente teste",
        }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demandas-resolucao"] }),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">🏷️ Demandas de Resolução</h1>
          <p className="text-xs text-muted-foreground">Pingue-pongue até a conclusão · Robô / IA / Humano</p>
        </div>
        <Button onClick={() => criarSeed.mutate()} variant="outline" data-testid="btn-criar-demanda-teste">
          + Demanda de teste
        </Button>
      </header>

      <Card className="p-4">
        {demandas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma demanda registrada ainda. Clique em "+ Demanda de teste".</p>
        ) : (
          <div className="space-y-2">
            {demandas.map((d: any) => (
              <div key={d.id} className="border border-border/50 rounded p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">#{d.id}</Badge>
                      <span className="text-xs text-muted-foreground">{d.unidade_nome}</span>
                      {d.resolvido && (
                        <Badge className="bg-green-600 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluída</Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium mt-1">{d.assunto || "(sem assunto)"}</div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        {d.canal_origem === "whatsapp" ? <MessageCircle className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {d.canal_origem}
                      </span>
                      <span>🔁 {d.turnos_pingue_pongue} turnos</span>
                      <span className="font-mono font-semibold text-[#B8941F]">{fmt(d.valor_total_cobrado)}</span>
                      {d.resolvido_por && <span>Resolvido por: <strong>{d.resolvido_por}</strong></span>}
                    </div>
                  </div>
                  {!d.resolvido && (
                    <div className="flex gap-1">
                      {RESOLVEDORES.map((r) => {
                        const Icon = r.icon;
                        return (
                          <Button
                            key={r.tipo}
                            size="sm"
                            variant="outline"
                            onClick={() => concluir.mutate({ id: d.id, resolvidoPor: r.tipo })}
                            data-testid={`btn-concluir-${d.id}-${r.tipo}`}
                            style={{ borderColor: r.cor, color: r.cor }}
                            className="text-[10px] h-7"
                          >
                            <Icon className="w-3 h-3 mr-1" /> {r.nome}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
```

## `artifacts/clinica-motor/src/contexts/ClinicContext.tsx`
```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface UnidadeVinculada {
  unidadeId: number;
  unidadeNome: string;
  unidadeCor: string;
}

type ModoVisao = "arquiteto_mestre" | "dono_clinica" | "consultor" | "operacional";

interface ClinicContextType {
  unidadeSelecionada: number | null;
  setUnidadeSelecionada: (id: number | null) => void;
  unidadesDisponiveis: UnidadeVinculada[];
  nomeUnidadeSelecionada: string;
  corUnidadeSelecionada: string | null;
  isTodasClinicas: boolean;
  escopo: string;
  modoVisao: ModoVisao;
  modoLabel: string;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<number | null>(null);

  const escopo = (user as any)?.escopo || "consultoria_master";
  const unidadesVinculadas: UnidadeVinculada[] = (user as any)?.unidadesVinculadas || [];

  const unidadesDisponiveis: UnidadeVinculada[] = (() => {
    if (escopo === "consultoria_master") {
      return unidadesVinculadas;
    }
    if (escopo === "consultor_campo") {
      return unidadesVinculadas;
    }
    if ((user as any)?.unidadeId) {
      return [{
        unidadeId: (user as any).unidadeId,
        unidadeNome: (user as any).unidadeNome || "Minha Clínica",
        unidadeCor: "#6B7280",
      }];
    }
    return [];
  })();

  useEffect(() => {
    if (escopo === "consultoria_master") {
      setUnidadeSelecionada(null);
    } else if (escopo === "consultor_campo") {
      setUnidadeSelecionada(null);
    } else if (unidadesDisponiveis.length === 1) {
      setUnidadeSelecionada(unidadesDisponiveis[0].unidadeId);
    }
  }, [escopo, user]);

  const selecionada = unidadesDisponiveis.find(u => u.unidadeId === unidadeSelecionada);
  const nomeUnidadeSelecionada = selecionada?.unidadeNome || "Todas as Clínicas";
  const corUnidadeSelecionada = selecionada?.unidadeCor || null;
  const isTodasClinicas = unidadeSelecionada === null;

  const modoVisao: ModoVisao = (() => {
    if (escopo === "consultoria_master" && isTodasClinicas) return "arquiteto_mestre";
    if (escopo === "consultoria_master" && !isTodasClinicas) return "dono_clinica";
    if (escopo === "consultor_campo") return "consultor";
    return "operacional";
  })();

  const modoLabel = (() => {
    switch (modoVisao) {
      case "arquiteto_mestre": return "Visao Global";
      case "dono_clinica": return "Visao Local";
      case "consultor": return "Consultor";
      case "operacional": return "Operacional";
    }
  })();

  return (
    <ClinicContext.Provider value={{
      unidadeSelecionada,
      setUnidadeSelecionada,
      unidadesDisponiveis,
      nomeUnidadeSelecionada,
      corUnidadeSelecionada,
      isTodasClinicas,
      escopo,
      modoVisao,
      modoLabel,
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
}
```

## `artifacts/clinica-motor/src/App.tsx`
```tsx
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClinicProvider } from "@/contexts/ClinicContext";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Anamneses from "@/pages/anamnese";
import NovaAnamnese from "@/pages/anamnese/nova";
import AnamneseDetalhe from "@/pages/anamnese/[id]";
import Validacao from "@/pages/validacao";
import Filas from "@/pages/filas";
import Pacientes from "@/pages/pacientes";
import ExamesGrafico from "@/pages/pacientes/exames-grafico";
import LaboratorioValidacao from "@/pages/laboratorio-validacao";
import PacienteDetalhe from "@/pages/pacientes/[id]";
import ItensTerapeuticos from "@/pages/itens-terapeuticos";
import Protocolos from "@/pages/protocolos";
import Followup from "@/pages/followup";
import Financeiro from "@/pages/financeiro";
import Unidades from "@/pages/unidades";
import Configuracoes from "@/pages/configuracoes";
import Fluxos from "@/pages/fluxos";
import Permissoes from "@/pages/permissoes";
import Catalogo from "@/pages/catalogo";
import QuestionarioPaciente from "@/pages/pacientes/questionario";
import PedidosExame from "@/pages/pedidos-exame";
import Substancias from "@/pages/substancias";
import AgendaSemanal from "@/pages/agenda";
import CodigosSemanticos from "@/pages/codigos-semanticos";
import RasPage from "@/pages/ras";
import CodigosValidacaoPage from "@/pages/codigos-validacao";
import EstoquePage from "@/pages/estoque";
import TaskCardsPage from "@/pages/task-cards";
import AvaliacaoEnfermagemPage from "@/pages/avaliacao-enfermagem";
import RasEvolutivoPage from "@/pages/ras-evolutivo";
import PortalClientePage from "@/pages/portal";
import GovernancaPage from "@/pages/governanca";
import MonitoramentoPacientePage from "@/pages/pacientes/monitoramento";
import SegurancaPage from "@/pages/seguranca";
import PainelComandoPage from "@/pages/painel-comando";
import PainelTransmutacao from "@/pages/painel-transmutacao";
import ProtocoloNatacha from "@/pages/protocolo-natacha";
import DelegacaoPage from "@/pages/delegacao";
import ColaboradoresPage from "@/pages/colaboradores";
import AgentesVirtuaisPage from "@/pages/agentes-virtuais";
import AcompanhamentoPage from "@/pages/acompanhamento";
import ComissaoPage from "@/pages/comissao";
import ComercialPage from "@/pages/comercial";
import JustificativasPage from "@/pages/justificativas";
import MatrizAnaliticaPage from "@/pages/matriz-analitica";
import AgendaMotorPage from "@/pages/agenda-motor";
import DietasPage from "@/pages/dietas";
import PsicologiaPage from "@/pages/psicologia";
import QuestionarioMasterPage from "@/pages/questionario-master";
import ConsultoriasPage from "@/pages/consultorias";
import ContratosPage from "@/pages/contratos";
import AdminComercialPage from "@/pages/admin-comercial";
import InundacaoPage from "@/pages/inundacao";
import BlueprintPage from "@/pages/blueprint";
// PADCOM V15 — Anamnese Integrativa Estruturada (Manus Bundle)
import PadcomPaciente from "@/pages/padcom/paciente";
import PadcomConcluido from "@/pages/padcom/concluido";
import PadcomAdmin from "@/pages/padcom/admin";
import PadcomAdminDetalhe from "@/pages/padcom/admin-detalhe";
import PadcomAdminDashboard from "@/pages/padcom/admin-dashboard";
import PadcomGovernanca from "@/pages/padcom/governanca";
import PadcomAgendaRetornos from "@/pages/padcom/agenda-retornos";
import LembretesFalhasPage from "@/pages/lembretes-falhas";
import MensagensPage from "@/pages/mensagens";
import ExamesPage from "@/pages/exames";
import AgendasPage from "@/pages/agendas";
import GovernancaMatrixPage from "@/pages/governanca-matrix";
import MonetizarPage from "@/pages/monetizar";
import DashboardLocalPage from "@/pages/dashboard-local";
import DemandasResolucaoPage from "@/pages/demandas-resolucao";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/anamnese" component={Anamneses} />
      <Route path="/anamnese/nova" component={NovaAnamnese} />
      <Route path="/anamnese/:id" component={AnamneseDetalhe} />
      <Route path="/validacao" component={Validacao} />
      <Route path="/filas" component={Filas} />
      <Route path="/pacientes" component={Pacientes} />
      <Route path="/pacientes/:id/questionario" component={QuestionarioPaciente} />
      <Route path="/pacientes/:id/exames-grafico" component={ExamesGrafico} />
      <Route path="/laboratorio/validacao" component={LaboratorioValidacao} />
      <Route path="/pacientes/:id" component={PacienteDetalhe} />
      <Route path="/itens-terapeuticos" component={ItensTerapeuticos} />
      <Route path="/protocolos" component={Protocolos} />
      <Route path="/followup" component={Followup} />
      <Route path="/financeiro" component={Financeiro} />
      <Route path="/unidades" component={Unidades} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/fluxos" component={Fluxos} />
      <Route path="/permissoes" component={Permissoes} />
      <Route path="/pedidos-exame" component={PedidosExame} />
      <Route path="/catalogo" component={Catalogo} />
      <Route path="/substancias" component={Substancias} />
      <Route path="/agenda" component={AgendaSemanal} />
      <Route path="/codigos-semanticos" component={CodigosSemanticos} />
      <Route path="/ras" component={RasPage} />
      <Route path="/codigos-validacao" component={CodigosValidacaoPage} />
      <Route path="/inundacao" component={InundacaoPage} />
      <Route path="/blueprint" component={BlueprintPage} />
      <Route path="/agendas" component={AgendasPage} />
      <Route path="/governanca-matrix" component={GovernancaMatrixPage} />
      <Route path="/estoque" component={EstoquePage} />
      <Route path="/task-cards" component={TaskCardsPage} />
      <Route path="/avaliacao-enfermagem" component={AvaliacaoEnfermagemPage} />
      <Route path="/ras-evolutivo" component={RasEvolutivoPage} />
      <Route path="/pacientes/:id/monitoramento" component={MonitoramentoPacientePage} />
      <Route path="/portal" component={PortalClientePage} />
      <Route path="/governanca" component={GovernancaPage} />
      <Route path="/seguranca" component={SegurancaPage} />
      <Route path="/painel-comando" component={PainelComandoPage} />
      <Route path="/painel-transmutacao" component={PainelTransmutacao} />
      <Route path="/protocolo-natacha" component={ProtocoloNatacha} />
      <Route path="/delegacao" component={DelegacaoPage} />
      <Route path="/colaboradores" component={ColaboradoresPage} />
      <Route path="/agentes-virtuais" component={AgentesVirtuaisPage} />
      <Route path="/acompanhamento" component={AcompanhamentoPage} />
      <Route path="/comissao" component={ComissaoPage} />
      <Route path="/comercial" component={ComercialPage} />
      <Route path="/justificativas" component={JustificativasPage} />
      <Route path="/matriz-analitica" component={MatrizAnaliticaPage} />
      <Route path="/agenda-motor" component={AgendaMotorPage} />
      <Route path="/dietas" component={DietasPage} />
      <Route path="/psicologia" component={PsicologiaPage} />
      <Route path="/questionario-master" component={QuestionarioMasterPage} />
      <Route path="/consultorias" component={ConsultoriasPage} />
      <Route path="/contratos" component={ContratosPage} />
      <Route path="/admin-comercial" component={AdminComercialPage} />
      {/* ══════ PADCOM V15 — Anamnese Integrativa (Manus Bundle) ══════ */}
      <Route path="/padcom" component={PadcomPaciente} />
      <Route path="/padcom/concluido" component={PadcomConcluido} />
      <Route path="/padcom-admin/dashboard" component={PadcomAdminDashboard} />
      <Route path="/padcom-admin/:sessaoId" component={PadcomAdminDetalhe} />
      <Route path="/padcom-admin" component={PadcomAdmin} />
      <Route path="/padcom-governanca" component={PadcomGovernanca} />
      <Route path="/padcom-agenda-retornos" component={PadcomAgendaRetornos} />
      <Route path="/lembretes-falhas" component={LembretesFalhasPage} />
      <Route path="/mensagens" component={MensagensPage} />
      <Route path="/exames" component={ExamesPage} />
      <Route path="/monetizar" component={MonetizarPage} />
      <Route path="/dashboard-local" component={DashboardLocalPage} />
      <Route path="/demandas-resolucao" component={DemandasResolucaoPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ClinicProvider>
            <Router />
            <Toaster />
          </ClinicProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
```
