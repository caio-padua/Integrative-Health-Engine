# SPEC A — Painel de Licenciamento de Módulos IHE

**Data:** 16/07/2026
**Método:** Paxter Loop

## Objetivo
Criar tela `/admin/licenciamento` que exibe a matriz empresa × módulo (`modulos_sistema`) com toggle ativo/inativo por empresa, substituindo a referência incorreta a `modulos_padcon` na rota de faturamento.

## Contexto técnico (auditado)
- `modulos_sistema` (8 módulos reais: MSG_WHATSAPP a AGENDA_INTELIGENTE) — NENHUMA tela os exibe
- `modulos_padcon` (M1–M7, sistema PADCON/Manager) — tabela distinta, usada pelo `/monetizar`
- `unidade_modulos_ativos.modulo_id` FK → `modulos_padcon`, mas IDs 1–8 existem em ambas as tabelas; JOIN com `modulos_sistema` funciona tecnicamente
- A rota `/api/ledger/faturamento-live` calcula `total_modulos` fazendo JOIN com `modulos_padcon` — incorreto; deve usar `modulos_sistema`

## Requisitos exatos
1. Nova rota `GET /api/modulos-sistema/matriz` — retorna array cruzado empresa × módulo com campo `ativo`, excluindo unidades arquivadas (IDs 1–7) e Genesis (14)
2. Nova rota `PATCH /api/modulos-sistema/:unidadeId/:moduloId` — faz UPSERT em `unidade_modulos_ativos` com campo `ativo` e `ativado_por = 'ceo'`; requer `requireAdminToken`
3. Rota inclui `contrato_clinica` de cada empresa (modelo_cobranca, valor_mensal_fixo, status)
4. Nova tela `/admin/licenciamento` com layout PENUMBRA Navy (LayoutPawards)
5. Tela exibe tabela: linhas = módulos, colunas = empresas, célula = Switch ativo/inativo
6. Cabeçalho de cada empresa mostra: nome abreviado + modelo de contrato (badge)
7. Rodapé de cada coluna mostra total de módulos ativos e valor mensal calculado
8. Rota na App.tsx: `<Route path="/admin/licenciamento" component={AdminLicenciamentoPage} />`
9. Link no menu lateral (LayoutPawards.tsx) no grupo "Admin" — texto "Licenciamento"
10. Fix: substituir `JOIN modulos_padcon` por `JOIN modulos_sistema` na subquery `total_modulos` da rota `/api/ledger/faturamento-live`

## Casos extremos
- Empresa sem contrato em `contrato_clinica` → exibir "sem contrato" sem quebrar
- `AGENDA_INTELIGENTE` (módulo 8) não está em nenhuma `unidade_modulos_ativos` → aparece na tabela com todos os switches OFF
- Toggle falha no backend → manter estado anterior + mostrar toast de erro

## Definição de PRONTO
- [ ] Tela `/admin/licenciamento` carrega sem erro no browser
- [ ] 8 módulos aparecem como linhas
- [ ] Todas as empresas ativas (exceto arquivadas e Genesis) aparecem como colunas
- [ ] Switch de cada célula reflete o banco e persiste ao alternar
- [ ] Totais por coluna batem com query SQL direta
- [ ] Link "Licenciamento" aparece no menu lateral
- [ ] Rota `/api/ledger/faturamento-live` passa a usar `modulos_sistema` no cálculo de total_modulos

## Linhas vermelhas
- NÃO alterar `modulos_padcon` nem a tela `/monetizar` existente
- NÃO usar `role` (sempre `perfil`)
- NÃO fazer DROP nem ALTER TABLE em `unidade_modulos_ativos`
- Zero emoji na tela
