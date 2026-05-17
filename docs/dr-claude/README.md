# 📂 docs/dr-claude — Briefing & Raws para Dr. Claude (Orquestrador)

> **Para que serve esta pasta**
> Materializar, em arquivos versionados no GitHub, o panorama atual e
> as decisões tomadas pelo Triângulo **Caio (CEO TDAH/TOC, 4 personas) /
> Dr. Claude (orquestração) / Dr. Replit (código)**, de modo que o
> **Dr. Claude consiga ler tudo via raw GitHub** sem depender de
> espelhamento manual em cada conversa.
>
> Os arquivos `.local/*` que servem de fonte da verdade local **NÃO vão
> pro GitHub** (estão no `.gitignore`). Esta pasta é a **ponte oficial
> para o Dr. Claude**.

---

## 🗺️ Mapa de leitura recomendado (ordem TDAH-friendly)

Leia nessa ordem se for a primeira vez nesta pasta hoje:

| # | Arquivo | O que é | Quando ler |
|---|---------|---------|------------|
| 1 | [`00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md`](./00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md) | Painel CEO 1-página: onde estamos, números chave, semáforo | **SEMPRE primeiro** |
| 2 | [`01_DECISOES_TOMADAS_WAVE10_F3C.md`](./01_DECISOES_TOMADAS_WAVE10_F3C.md) | Histórico decisões Caio + code-review architect FAIL→PASS | Pra entender por que estamos aqui |
| 3 | [`02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md`](./02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md) | Perguntas abertas que precisam input do Dr. Claude **antes** de seguir | Antes de orquestrar próximo passo |
| 4 | [`03_ARQUITETURA_GERAL_DO_CODIGO.md`](./03_ARQUITETURA_GERAL_DO_CODIGO.md) | **Mapa macro→micro do código real** com raw URLs por domínio (clínico / farmácia / jurídico / financeiro / painéis / integrações) + Wave 10 detalhada | Quando precisar mergulhar em código específico ou entender arquitetura |
| 5 | [`04_BLUEPRINT_WAVE10_FASE_B_DIA1.md`](./04_BLUEPRINT_WAVE10_FASE_B_DIA1.md) | **Blueprint Wave 10 Fase B Dia 1** (snapshot 2026-05-01): TL;DR + invariantes + diagrama ASCII fluxo assinatura ICP-Brasil + raw URLs de todos os arquivos chave + 7 achados code-review resolvidos + perguntas abertas | **NOVO** — leitura prioritária pra orquestrar Fase B Dia 2 |
| 7 | [`06_WAVE13_F1_FOUNDATION_RBAC_2FA.md`](./06_WAVE13_F1_FOUNDATION_RBAC_2FA.md) | **Wave 13 F1 Foundation** (entregue 2026-05-13): Migration 044 RBAC + Kill-Switch + 2FA TOTP foundation, Caio promovido a `platform_owner`, naming respeitando regra ferro `perfil` (nunca `papel`/`role`), 4 perguntas abertas pra Dr. Claude refinar antes de F2/F3/F4 | **NOVO HOJE** — bloqueador pra orquestrar F2 (middleware enforcement) |
| 8 | [`08_IGNICAO_MOTOR_E_SINAPSES.md`](./08_IGNICAO_MOTOR_E_SINAPSES.md) | **Ignição do Motor PADCOM** (entregue 2026-05-17): cadeia front→back→DB da sinapse anamnese→sugestões (`POST /anamnese/:id/ativar-motor` linhas 182-351), estado real (37 regras / 7 codigos_referencia × 1.270+ catálogo = 0,5% cobertura), 24 blocos órfãos mapeados, 6 anomalias detectadas (duplicação BLK001 vs BLK0001, V13 vs V4, `includes()` bidirecional, falta score, etc.), proposta Dr. Replit em 5 sprints aditivos + 6 perguntas pra Dr. Claude | **NOVO HOJE** — bloqueador pra ignitar Sprint A/B |
| 9 | [`09_CATALOGO_CLINICO_ESTRATIFICADO.md`](./09_CATALOGO_CLINICO_ESTRATIFICADO.md) | **Catálogo Clínico V4.0 Dr. Manus** (entregue 2026-05-17): 2 visões dos 233 exames (BLOCO→GRADE→EXAME e EXAME→GRADE→BLOCO) + regra universal `B1 B2 B3 B4 SEQ` + 31 blocos + 11 fórmulas + 32 implantes + 11 soros + 49 doenças com bloco motor + 10 sintomas + 12 dietas + 373 nicks B4 + pontes V13↔V4 já existentes no DB | **NOVO HOJE** — fonte canônica pro Dr. Claude desenhar as sinapses |
| 10 | [`10_INJETAVEIS_IM_EV_E_IMPLANTES.md`](./10_INJETAVEIS_IM_EV_E_IMPLANTES.md) | **Catálogo Parenteral Completo** (entregue 2026-05-17): 162 injetáveis IM/EV/SC/ID agrupados em 10 categorias (vitaminas, neuro, metabólico, nutracêuticos, imuno, derm, orto, lipólise, hormonal, ferro) + 11 soros endovenosos prontos com indicação por anamnese + 32 pellets HRT bioidêntica (testosterona/estradiol/progesterona/gestrinona/anastrozol/hcg + DHEA/pregnenolona/T3T4/hidrocortisona + melatonina/NADH/naltrexona/bupropiona + metformina/sitagliptina/tadalafil) + 7 princípios de sinapse (filtro via, perfil financeiro, soro substitui combo, pellet substitui IM recorrente, anastrozol acompanha test, LDN dupla indicação, hidrocortisona segurança) + 6 gaps abertos | **NOVO HOJE** — fecha o panorama clínico completo |
| 6 | [`raws/`](./raws/) | Espelhos exatos dos 4 docs fonte-de-verdade `.local/*` (microscópio Wave 10, mapa neuronal v1.1, arquitetura bounded contexts, session plan atual) | Pra deep-dive técnico de Wave atual |

---

## 🔁 Política de atualização

- Sempre que terminamos uma fase F (F3.C, F4, F5…), **atualizamos
  primeiro o `.local/session_plan.md`** (fonte local) e em seguida
  espelhamos para `docs/dr-claude/raws/04_session_plan_wave10_atual.md`
  via `cp` no commit.
- O **Briefing Painel CEO (`00_*`)** é reescrito a cada vez que muda o
  semáforo (verde/amarelo/vermelho) ou o número da conversão potencial.
- O arquivo de **Decisões Tomadas (`01_*`)** é **append-only** — nunca
  reescrevemos histórico, só adicionamos linhas novas com data.
- O arquivo de **Decisões Pendentes (`02_*`)** é reescrito a cada
  rodada — quando a pendência vira tomada, ela migra pro `01_*`.

---

## 🌳 Branches relevantes (onde o Dr. Claude busca os raws)

| Branch | Uso | URL raw base |
|--------|-----|--------------|
| `main` | Produção / referência canônica | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/main/docs/dr-claude/` |
| `feat/dominio-pawards` | Feature branch ativa Wave 10 | `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/` |

**Recomendação ao Dr. Claude**: leia sempre da branch `feat/dominio-pawards`
quando estivermos no meio de uma Wave; só caia pra `main` se a feature
branch estiver fora de sincronia há mais de 2 dias.
