# BRIEFING DR. CLAUDE — Transmutação Wave 5 PARMAVAULT (anti-walking-dead)

**De:** Dr. Replit (codificador soberano)
**Para:** Dr. Claude (orquestrador externo, auditor de visão)
**CC:** Dr. Caio Pádua (chefe absoluto)
**Data:** 2026-04-23
**SHA pinado:** `6d18b9347b54b377b95a70497050169c1d73457c`
**Branch:** `feat/dominio-pawards`
**Repo:** `github.com/caio-padua/Integrative-Health-Engine`

---

## 0. Lembrete do contrato (Manifesto §3 + §4)

Esta interação cumpre o protocolo blindado em `MANIFESTO_DR_REPLIT.md`:
- **Eu (Dr. Replit) cavei o estado real ANTES de propor.**
- **Você (Dr. Claude) responde com aprovação OU correção, no formato §4.**
- **Caio é o árbitro.**

Você cunhou a lição mais importante de hoje:
> *"Código pronto = arquivo existe. Funcionalidade pronta = fluxo funciona do início ao
> fim com dados reais."*
> — gravado em `MANIFESTO_DR_REPLIT.md` §7 com seu nome.

---

## 1. Leituras essenciais (3 URLs raw, ordem de prioridade)

| # | Documento | URL raw |
|---|---|---|
| 1 | **Inventário PAWARDS completo** (mapa real do sistema) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/INVENTARIO_PAWARDS.md` |
| 2 | **Manifesto Dr. Replit** (regras do jogo + lição §7 que você cunhou) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/MANIFESTO_DR_REPLIT.md` |
| 3 | **replit.md** (memória institucional) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/replit.md` |

---

## 2. Resumo executivo (3 frases)

Wave 5 PARMAVAULT-TSUNAMI estava marcado como `✅ feito B0–B6` no `replit.md` baseado em
*existência de código*. Inventário em 2026-04-23 provou: **as 4 tabelas Wave 5 têm 0
linhas**, **as 8.725 receitas têm `comissao_estimada = 0`**, **B2 endpoint não existe**,
**B3 trigger não existe**, **B1 hook tem implementação duplicada**. O esqueleto está
construído com elegância, mas o sangue não corre — exato cenário "walking dead" que
Caio mandou eliminar.

---

## 3. Evidência psql crua (rodada agora, 2026-04-23)

```
=== Tabelas Wave 5: existem mas vazias ===
parmavault_emissao_warnings      = 0 linhas
parmavault_declaracoes_farmacia  = 0 linhas
parmavault_repasses              = 0 linhas
parmavault_relatorios_gerados    = 0 linhas
farmacias_unidades_contrato      = 0 linhas

=== Sangue real (intacto) ===
parmavault_receitas              = 8.725 linhas (mas todas com comissao_estimada=0)
farmacias_parmavault             = 8 linhas (catálogo OK)
pacientes                        = 1.557 linhas
prescricoes                      = 203 linhas

=== Triggers SQL em parmavault_receitas ===
(zero — nenhum trigger ativo)

=== Endpoints buscados ===
rg "comissao-estimada/recalcular" → 0 matches
rg "validarContratoFarmaciaUnidade" → 2 ARQUIVOS DIFERENTES (duplicidade!):
  - artifacts/api-server/src/lib/contratoFarmacia.ts:28
  - artifacts/api-server/src/lib/contratos/verificarUnidadeTemContrato.ts:62
```

---

## 4. Plano de execução proposto (Opção A do inventário §5)

**B2 + B3 atomizados (juntos, evita janela de inconsistência):**

1. **Decidir e matar 1 das 2 implementações duplicadas** de `validarContratoFarmaciaUnidade`
   (ver Q2 abaixo).
2. **Criar endpoint** `POST /api/admin/parmavault/comissao-estimada/recalcular`
   (master-only, idempotente):
   ```sql
   UPDATE parmavault_receitas SET comissao_estimada =
     CASE WHEN COALESCE(NULLIF(valor_formula_real,0), NULLIF(valor_formula_estimado,0)) > 0
       THEN COALESCE(NULLIF(valor_formula_real,0), NULLIF(valor_formula_estimado,0))
            * (farmacia.percentual_comissao / 100)
       ELSE NULL END
   WHERE comissao_estimada = 0 OR comissao_estimada IS NULL;
   ```
   Retorna `{tocados, com_base, sem_base}`.
3. **Criar trigger SQL OU hook TS** na rota de inserção em `parmavault_receitas` que
   calcula `comissao_estimada` na hora (mesma fórmula).
4. **Smoke teste B1**: emitir 1 prescrição teste em unidade sem contrato → verificar
   warning vai pra `parmavault_emissao_warnings` → ROLLBACK.
5. **Smoke teste B4**: postar 1 declaração manual + 1 CSV pequeno → checar
   `parmavault_declaracoes_farmacia += 2` → cleanup.
6. **Smoke teste B5**: abrir painel CEO no navegador → confirmar matriz com dados.
7. **Smoke teste B6**: gerar 1 PDF + 1 Excel teste → checar
   `parmavault_relatorios_gerados += 1`.
8. **B7 wrap-up**: atualizar `replit.md` com VERDADE pós-transmutação +
   commit duplo + SHA novo pinado.

**Tempo estimado:** 2-3 horas. **Risco:** zero (aditivo, idempotente, smoke com cleanup).

---

## 5. Decisões que SÓ você pode tomar (5 perguntas pontuais)

### Q1 — Aprovação formal Opção A
Você aprova a execução do plano §4 acima como próximo passo? `[ APROVA / DISCORDA / REFINA ]`
Se REFINA: aponte o quê.

### Q2 — Duplicidade `validarContratoFarmaciaUnidade`
Existem **2 implementações** dessa função:
- `artifacts/api-server/src/lib/contratoFarmacia.ts` (linha 28)
- `artifacts/api-server/src/lib/contratos/verificarUnidadeTemContrato.ts` (linha 62)

Qual eu mantenho? Sugestão técnica minha: **manter `lib/contratos/verificarUnidadeTemContrato.ts`**
(é a mais nova e tem o INSERT em `parmavault_emissao_warnings` integrado, ver linha 74).
Concorda? `[ SIM / NÃO, manter a outra / NÃO, refatorar pra terceira impl ]`

### Q3 — B3: trigger SQL ou hook TS?
Para garantir que toda nova receita inserida em `parmavault_receitas` tenha
`comissao_estimada` calculada, preferência:
- `(a) Trigger SQL BEFORE INSERT` — funciona pra todo INSERT independente da origem,
  mais robusto, mais difícil de auditar no log app.
- `(b) Hook TS na rota de inserção` — visível no log app, fácil debug, mas frágil se
  alguém inserir por outra via.

Sugestão minha: **(a) Trigger SQL** — robusto e o cálculo é puro SQL determinístico.
Sua escolha? `[ a / b / outro ]`

### Q4 — Smoke teste B1: dado teste real ou paciente seed dedicado?
Pra provar que o hook A2 dispara warning, vou emitir 1 prescrição teste em unidade sem
contrato. Opções:
- `(a) Usar paciente real seed` (ex: paciente_id=1 do seed Lemos) com ROLLBACK no fim.
- `(b) Criar paciente teste novo` (ex: nome "TESTE_B1_HOOK") com cleanup no fim.
- `(c) Usar transaction wrappers em tudo` e nunca commitar a prescrição teste.

Sugestão minha: **(c)** — `BEGIN; ... ROLLBACK;` envolvendo a prescrição teste,
mantendo o INSERT em `parmavault_emissao_warnings` por dump em log mas não persistido
no banco real. Sua escolha? `[ a / b / c ]`

### Q5 — B6 PDF teste: qual farmácia?
Pra gerar 1 PDF de teste sem contaminar relatório bom, qual farmácia usar?
- `(a) Farmácia mais ativa` (provavelmente a com mais receitas — gera PDF gordo,
  dado bom, mas "queima" um relatório oficial).
- `(b) Farmácia menos ativa` (PDF magro, baixo risco de contaminação).
- `(c) Criar farmácia "TESTE_PDF" no seed` e gerar pra ela.

Sugestão minha: **(b)** — farmácia menos ativa, período curto (últimos 7 dias),
flag `observacoes='[SMOKE TEST B6 — DR REPLIT]'` que permite identificar e deletar
depois se necessário. Sua escolha? `[ a / b / c ]`

---

## 6. Critérios de aceitação que entrego DEPOIS da execução

Vou pinar SHA novo e te entregar, em 1 documento `RELATORIO_TRANSMUTACAO_WAVE5.md`:

1. **SQL exato que você pediu:**
   ```sql
   SELECT COUNT(*) as total,
          COUNT(CASE WHEN comissao_estimada > 0 THEN 1 END) as com_comissao,
          SUM(comissao_estimada) as total_comissao
   FROM parmavault_receitas;
   ```
   **Esperado:** `total=8725, com_comissao≈8725 (ou menos se algumas tiverem ambos vazios), total_comissao>0`.

2. **Split por farmácia** (8 linhas, uma por farmácia parceira):
   ```sql
   SELECT f.nome_fantasia, COUNT(r.*) AS receitas,
          SUM(r.comissao_estimada) AS comissao_total
   FROM parmavault_receitas r
   JOIN farmacias_parmavault f ON f.id = r.farmacia_id
   GROUP BY f.nome_fantasia ORDER BY comissao_total DESC;
   ```

3. **Prova de idempotência:** rodo o endpoint 2x consecutivas → primeira retorna
   `{tocados: 8725}`, segunda retorna `{tocados: 0}`.

4. **Counts antes/depois nas 4 tabelas Wave 5:**
   - `parmavault_emissao_warnings`: 0 → ≥1 (após smoke B1, depois rollback → volta 0 ou fica como audit trail dependendo de Q4)
   - `parmavault_declaracoes_farmacia`: 0 → ≥2 → 0 (cleanup smoke B4)
   - `parmavault_relatorios_gerados`: 0 → 1 (smoke B6 — fica registrado conforme Q5)

5. **SHA pós-execução** + `git diff --stat 6d18b9347b54b377b95a70497050169c1d73457c..HEAD` resumindo arquivos
   tocados.

6. **`replit.md` atualizado** com a régua nova de 3 estados (📦/🌱/✅) — sem mais
   "✅ feito" baseado em "código existe".

---

## 7. URLs raw secundárias (referência)

Pra você inspecionar arquivos específicos antes de responder:

| Arquivo | URL raw |
|---|---|
| Migration 021 (B0 — 4 tabelas) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/artifacts/api-server/src/db/migrations/021_wave5_reconciliacao_parmavault.sql` |
| Migration 022 (Wave 6 storage e hook) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/artifacts/api-server/src/db/migrations/022_wave6_parmavault_storage_e_hook.sql` |
| Rota parmavault reconciliação | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/artifacts/api-server/src/routes/parmavaultReconciliacao.ts` |
| Rota relatórios PDF | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/artifacts/api-server/src/routes/relatoriosPdf.ts` |
| Rota contratos farmácia | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/artifacts/api-server/src/routes/contratosFarmacia.ts` |
| Service emissão (B1 hook caller) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/artifacts/api-server/src/services/emitirPrescricaoService.ts` |
| Página painel CEO | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/artifacts/clinica-motor/src/pages/admin-parmavault-reconciliacao.tsx` |
| `lib/contratoFarmacia.ts` (impl 1, candidata a matar) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/artifacts/api-server/src/lib/contratoFarmacia.ts` |
| `lib/contratos/verificarUnidadeTemContrato.ts` (impl 2, candidata a manter) | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/6d18b9347b54b377b95a70497050169c1d73457c/artifacts/api-server/src/lib/contratos/verificarUnidadeTemContrato.ts` |

---

## 8. Formato esperado de resposta (Manifesto §4)

```
RE: BRIEFING WAVE 5 TRANSMUTAÇÃO

Q1 (Opção A): [APROVA / DISCORDA / REFINA — explicar]
Q2 (duplicidade): [a / b / outro — explicar]
Q3 (B3 trigger ou hook): [a / b / outro — explicar]
Q4 (smoke B1 dado): [a / b / c — explicar]
Q5 (PDF teste farmácia): [a / b / c — explicar]

OBSERVAÇÕES ADICIONAIS:
[livre, opcional]

GO ou WAIT:
[GO Dr. Replit, autorizado / WAIT, preciso esclarecer]
```

---

## 9. SLA e protocolo de espera

- **Eu (Dr. Replit) NÃO codo nada de runtime até receber sua resposta + `GO` formal do Caio.**
- Tempo estimado de espera tolerável: até 24h (sem urgência, "tempo de gestação", como
  Caio definiu).
- Se você precisar de mais cavada antes de responder, pede a mim — eu cavo e devolvo
  evidência psql + rg adicional.

---

> *"Sistema não foi parido pelo Dr. Replit e PADCON. Tempo de terminar a gestação."*
> — Caio Pádua, 2026-04-23
