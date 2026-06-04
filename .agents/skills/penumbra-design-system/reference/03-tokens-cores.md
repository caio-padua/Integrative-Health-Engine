---
name: Tokens de cor PENUMBRA (duas faces + 8 dominios)
description: Valores reais das faces PENUMBRA CLARO (Paper Ciano) e PENUMBRA ESCURO (Navy Ciano), os 8 dominios afinados por face, severidades, tipografia e a estrutura do tema PerfilPenumbra. Nao inventar hex novo; importar do codigo.
---

# Tokens de cor PENUMBRA

A FONTE DE VERDADE e o codigo, nao esta tabela. Os valores abaixo sao copia dos
perfis aprovados; se divergirem do codigo, o codigo vence. Importar de la, nunca
hardcodar hex solto no JSX.

- Faces aprovadas (par CLARO/ESCURO):
  `artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_perfisPenumbra.ts`
  (`PERFIL_PAPER_CIANO` e `PERFIL_NAVY_CIANO`).
- Paleta base escura + pasteis usados nas chromes navegacionais:
  `.../chromes-navegacionais/refinados/_design.ts`.

## 1. Estrutura do tema (`PerfilPenumbra`)

Cada face preenche este contrato (ver `_pawardsPenumbra.ts`):
- `id / nome / desc / modoClaro` — identidade da face.
- `bg / bg2 / bg3 / bg4` — 4 niveis de fundo (retangulo dentro de retangulo).
- `border / borderAccent` — bordas.
- `t1 / t2 / t3` — 3 niveis de texto.
- `accent / accent2 / accentGlow` — cor primaria, secundaria e brilho.
- `ok / warn / danger` — estados funcionais.
- `doms[8]` — as 8 cores de dominio do menu (ordem fixa, ver secao 4).

Construir nova face = preencher esse contrato. Nunca hex solto no markup.

## 2. PENUMBRA CLARO — "Paper Ciano" (valores reais)

- modoClaro: `true` · nome interno: `PENUMBRA PAPEL CIANO`.
- bg `#EEF2F4` · bg2 `#F8FBFC` · bg3 `#E2E8EC` · bg4 `#D2DCE0`
  (papel azulado claro — NUNCA branco hospitalar puro).
- border `#B8C4CA` · borderAccent `#2A8A7C77`.
- t1 `#0F1A1F` · t2 `#3F5258` · t3 `#6E8088`.
- accent `#1E7A6E` (teal escuro) · accent2 `#2A9D8F` · accentGlow `rgba(30,122,110,0.45)`.
- ok `#1E7A6E` · warn `#9C6E16` · danger `#8A2A2A`.
- Uso: consultorio, dia, luz forte.

## 3. PENUMBRA ESCURO — "Navy Ciano" (valores reais)

- modoClaro: `false` · nome interno: `PENUMBRA NAVY CIANO`.
- bg `#020A14` · bg2 `#061824` · bg3 `#0A2030` · bg4 `#0E2838` (navy profundo).
- border `#1A3848` · borderAccent `#5FE6CC66`.
- t1 `#D8EEEE` · t2 `#88B8BE` · t3 `#557A82`.
- accent `#5FE6CC` (ciano clinico) · accent2 `#5EE6E6` · accentGlow `rgba(95,230,204,0.55)`.
- ok `#5FE6CC` · warn `#FFD27A` · danger `#D08A8A`.
- Uso: sala de procedimento, foco, noite.

> As duas faces compartilham ESTRUTURA e a ordem dos 8 dominios; mudam os hex.
> Sao pares (`perfilPar`). Nao criar terceira face clara nem escura.

## 4. Os 8 dominios (identidade / neon) — AFINADOS POR FACE

O usuario decora o dominio pela COR, nao pela sigla. A familia de matiz e a
mesma nas duas faces, mas o hex e afinado: escuro/saturado sobre papel claro,
pastel-neon sobre navy. Ordem do array `doms[]` = ordem do menu.

| idx | Sigla | Dominio     | Familia  | CLARO `doms` | ESCURO `doms` |
|-----|-------|-------------|----------|--------------|---------------|
| 0   | DASHB | Dashboard   | Dourado  | `#9C6E16`    | `#FFD27A`     |
| 1   | PACTS | Pacientes   | Azul     | `#2E5C92`    | `#9CC2EA`     |
| 2   | AGEND | Agenda      | Ciano    | `#1E7A6E`    | `#5FE6CC`     |
| 3   | PRESC | Prescricao  | Lilas    | `#5A4A82`    | `#A89DFF`     |
| 4   | FATUR | Faturamento | Verde/menta | `#2A9D8F` | `#5EE6E6`     |
| 5   | MOTOR | Motor       | Rosa     | `#8A3F5C`    | `#FFA3C8`     |
| 6   | EQUIP | Equipe      | Verde    | `#3F6E3F`    | `#7CC4A0`     |
| 7   | AUDIT | Auditoria   | Vermelho | `#8A3F3F`    | `#D08A8A`     |

- Regra: numa face clara use sempre a coluna CLARO; numa escura, a coluna ESCURO.
- Regra de crescimento: ao se aproximar de ~12 dominios os pasteis se esgotam;
  propor paleta secundaria ou hachura — nunca repetir cor.
- Em projeto novo, mapeie os dominios DELE pra esta ordem/familias e afine os
  hex por face seguindo o mesmo criterio (saturado no claro, pastel no escuro).

## 5. Severidade (alertas e tags)

Mapear sempre aos tokens da face (`danger/warn/accent2/ok/t3`), nunca hex avulso:
- CRITICO -> `danger` · respira (unico vivo da tela, K1).
- URGENTE -> `warn` · estatico.
- ATENCAO -> `accent2`/rosa do dominio MOTOR · estatico.
- OK -> `ok` · estatico.
- OFF/arquivado -> `t3` (mute) · inativo.

## 6. Paleta base escura de referencia (`_design.ts`)

Usada nas exploracoes de chrome; util como reservatorio de matizes:
navy `#020406` · navyPanel `#0A1628` · border `#1A2D4F` · ink `#E8EEF7` ·
inkDim `#9FB0C9` · inkMute `#6B7E9E` · gold `#C89B3C` · cyan `#5EE6E6` ·
ok `#7CC4A0` · warn `#E0B062` · danger `#D08A8A`. Especiais: ativo/lupa
`#5FE6CC` · estado ON `#33FF66` · GLOBAL `#5BB6FF` · inset nivel-3 `#FFE600`.

## 7. Tipografia

- Familia: `JetBrains Mono, ui-monospace, Menlo, Consolas, monospace` (P02).
- Pesos: 400 corpo · 600 numeros KPI · 700 labels/botoes.
- Tamanhos: 8px caption · 9px sub-label/breadcrumb · 10px label menu/chrome ·
  11px botao/menu label · 12px header de bloco · 16px nome paciente · 20px valor KPI.
- Letter-spacing: 0.06em corpo · 0.10em botao · 0.14em labels uppercase.
- `text-transform: uppercase` em label/botao/breadcrumb.
- `font-variant-numeric: tabular-nums` em TODO numero (P16).

## 8. Filtro Penumbra++ (global)

A pagina inteira recebe `filter: brightness(0.99) saturate(0.97) contrast(1.16)`.
Reduz cansaco em sessao longa (sensacao de "monitor de hospital / CRT
profissional"). E o motivo de o claro ser papel azulado e nao branco puro.
