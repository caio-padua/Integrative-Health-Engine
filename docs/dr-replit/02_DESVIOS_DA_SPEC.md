# 02 — Desvios da Spec (append-only, auditável pelo Dr. Claude)

> Quando eu implemento diferente da spec do Dr. Claude, justifico aqui.
> Cada desvio é numerado D###, descreve **o que a spec dizia**, **o que
> eu fiz**, **por quê**, e linka o commit. Dr. Claude pode contestar e
> pedir reversão via `docs/dr-claude/`.

---

## D001 — Bug #2: coluna NÚMERO do endereço reaproveita coluna existente

**Data:** 21/mai/2026
**Spec original (fila Caio):** "Adicionar campo NÚMERO separado do logradouro
no cadastro de paciente, com migration nova pra coluna `numero`."

**O que eu fiz:** Em vez de criar migration 078 nova, descobri via
`information_schema.columns` que a coluna `pacientes.numero_endereco` JÁ
EXISTE no banco (criada por wave anterior — provavelmente Wave Cadastro
Pádua). Mapeei essa coluna existente no schema Drizzle (`numeroEndereco:
text("numero_endereco")`), no OpenAPI (`numeroEndereco`), na whitelist
PUT do backend e no formulário do frontend.

**Por quê:** (1) Evita duplicidade de colunas com mesma semântica. (2) O
`pnpm db push` está PERIGOSAMENTE dessincronizado — detectou 25+ colunas
do banco real (todas criadas por migrations manuais 040+) como "novas"
e propôs renomear cada uma delas pra `numero`. Aplicar push cego teria
sido um desastre (perda de dados). (3) Migration aditiva separada seria
desnecessária pra coluna que já existe.

**Dívida técnica gerada:** O schema Drizzle `lib/db/src/schema/pacientes.ts`
continua sem ~24 colunas reais (`codigo_externo`, `codigo_semantico`,
`estado_civil`, `escolaridade`, `profissao`, `nome_mae`, `instagram`,
`telefone_fixo`, `whatsapp`, `drive_subpastas`, `origem_cadastro`,
`nome_social`, `rg`, `plano_saude`, `numero_plano`, `nome_pai`,
`nome_conjuge`, `profissional_responsavel`, `como_nos_conheceu`,
`observacoes`, `ficha_cadastral_sheet_id`, `ficha_cadastral_sheet_url`,
`arvore_drive_provisionada_em`, `telegram_chat_id`). **Próxima wave de
arrumação deve sincronizar o schema com a realidade do banco antes que
`pnpm push` cause acidente.** Vira P008 em
`03_PERGUNTAS_PRO_DR_CLAUDE.md`.

---

## D002 — Bug #4: SELECT de Unidade aparece SEMPRE no step 1, não só em Visão Global

**Data:** 21/mai/2026
**Spec original (fila Caio):** "Quando o usuário está em Visão Global e
clica em criar paciente, mostrar SELECT pra escolher a unidade destino."

**O que eu fiz:** O SELECT aparece SEMPRE no step 1, em qualquer contexto.
A diferença: quando `unidadeSelecionada !== null` (usuário tem unidade
escolhida no switcher do header), o campo vem pré-preenchido com essa
unidade. Quando está em Visão Global, vem vazio com badge laranja
"Visão Global ativa — escolha manualmente" e o Zod `min(1)` bloqueia
o avanço.

**Por quê:** Padrão TDAH-friendly + auditabilidade. Caio pode estar em
Visão Global mentalmente mas com a unidade 1 ainda travada do switcher.
Mostrar o campo SEMPRE força ele a confirmar o destino conscientemente
e elimina a categoria inteira de paciente-órfão por desatenção.
Defesa em profundidade: backend também valida via
`existe = SELECT FROM unidades WHERE id = ?`.

