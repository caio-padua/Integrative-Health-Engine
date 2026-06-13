---
name: Pactor arquitetura e doca
description: Onde mora código vs spec do Pactor, e o modelo v1 (cockpit sobre PAWARDS lendo via API)
---

# Pactor — arquitetura e doca

Regra de onde cada coisa mora:
- Lógica pura TypeScript (rodável/testável): lib `@workspace/pactor-transmutacao` (`lib/pactor-transmutacao/src/modules/{padronizacao,orcamento,varredura,ordenacao,...}`).
- Especificações e decisões por módulo: `docs/dr-replit/PARA_PACTOR/` (6 sub-pastas), legível via raw pelo Dr. Claude.
- Telas React: repositório próprio do Dr. Replit Pactor, puxando lógica da lib + specs da doca.

**Why:** o cacique mandou criar "doca exclusiva" e deixou o local à escolha; pôr `.ts` dentro de `docs/` o tira dos globs do pnpm e quebra os testes aprovados (ONDA A). Logo: código na lib, spec na doca.

**How to apply:** ao adicionar lógica nova do Pactor, criar em `lib/pactor-transmutacao` com teste; nunca mover `.ts` pra `docs/`. Specs/decisões vão em `docs/dr-replit/PARA_PACTOR/<modulo>`.

Modelo v1 (decisão do cacique 13/06/2026): Pactor LÊ do IHE via API (verdade única) usando pacientes reais da unidade 15 — é um cockpit em cima do PAWARDS (código separado, dado compartilhado). Independência total (banco próprio, vendável) é futuro, não agora.

Motor jurídico: mora em `lib/pactor-transmutacao/src/modules/juridico/juridico.ts` (puro, testável). Puxa os textos REAIS da tabela `termos_juridicos` do IHE (passados por parâmetro, não inventa), aplica placeholders fail-closed (`[FALTA: chave]`), escolhe o termo VIGENTE por maior versão ativa, e monta 5 documentos (RAS_PREMIUM, RAS_SIMPLES, RAS_JURIDICO, CONTRATO_COMPLETO, DISTRATO). Distrato é categoria 9 nova (adicionada ao enum `categoria` em `lib/db/src/schema/termosJuridicos.ts`, aditivo, coluna texto, sem migration); distrato sempre `requerRevisaoAdvogado=true` e nunca tem cláusula inventada (texto final vai a advogado).

**Why:** Kaizen-first — o arsenal jurídico já existia no PAWARDS (8 categorias, rotas, geradores de PDF, ZapSign); transmutar, não recriar. Nada rejeita `distrato` (OpenAPI sem enum de categoria; rota só checa campos obrigatórios; `racjPdf.ts` degrada gracioso pro título no default).

Prioridade v1 (carta ratificada Dr. Claude): CAIXA antes da Enfermagem. Ordem F0 gerador RAS+Orçamento (exemplo) → F1 conexão real pacientes un.15 → F2 RAS Premium/Simples → F3 Orçamento cenários/parcelas → F4 Agenda → F5 Enfermagem (PIN+rubrica) → F6 Jurídico/Distrato (placeholders, advogado revisa).
