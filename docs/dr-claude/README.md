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
| 5 | [`raws/`](./raws/) | Espelhos exatos dos 4 docs fonte-de-verdade `.local/*` (microscópio Wave 10, mapa neuronal v1.1, arquitetura bounded contexts, session plan atual) | Pra deep-dive técnico de Wave atual |

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
