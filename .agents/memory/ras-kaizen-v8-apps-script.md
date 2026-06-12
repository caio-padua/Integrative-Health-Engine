---
name: RAS KAIZEN v8 (Apps Script paralelo do CEO)
description: Como trabalhar no projeto Apps Script espelhado em docs/dr-replit/ras-kaizen-v8 — limites do agente e do Code.gs espelho.
---

# RAS KAIZEN v8 — sistema Apps Script PARALELO (NÃO é o PAWARDS)

Projeto Google Apps Script do CEO (conta `clinica.padua.agenda@gmail.com`),
espelhado em `docs/dr-replit/ras-kaizen-v8/` (.gs/.html) só pra versionar e o
Dr. Code ler via GitHub raw. É ES5-ish, escopo GLOBAL (todos os .gs se enxergam).

## Regras de trabalho (durável)

- O agente NÃO executa Apps Script. Validação é o CEO clicando os botões
  "RODAR TESTES ..." no Panel. Por isso toda feature precisa de testes
  semânticos puros (sem Calendar/Sheet) + um botão `runTestes...` no Panel.
- `Code.gs` é ESPELHO do script vivo do CEO (~3.4k linhas). NÃO refatorar.
  Features novas vão em ARQUIVOS .gs NOVOS (o escopo global junta tudo); botões
  funcionam de qualquer arquivo.
- **Exceção inevitável:** quando a feature precisa de um hook DENTRO de uma
  função que mora no `Code.gs` (ex.: ordenar substâncias em `montarPaginasRAS_`),
  não dá pra fazer de fora. Essa 1 linha aditiva é decisão do CEO (editar o
  espelho dessincroniza do vivo) — apresentar A/B/C, default = agente aplica a
  linha aditiva e o CEO re-cola no script vivo.

**Why:** o repo funciona como "fonte que o CEO copia pro Apps Script vivo", não
como mirror passivo — os .gs novos também não existem no script dele até ele
colar. Mas o CEO travou "não editar Code.gs" pra não confundir o espelho, então
qualquer toque no Code.gs vira decisão dele.

## Quirk de edição: `Code.gs` tem fim de linha CRLF

- `Code.gs` (e `Panel.html` tem emoji/box-chars) usa terminador **CRLF** (`\r\n`).
  O tool `edit` casa verbatim com `\n`, então qualquer `old_string` multilinha
  FALHA com "did not appear verbatim" — só edits de 1 linha passam.
- **How to apply:** pra edits multilinha no Code.gs, usar script Node via bash
  (`indexOf` + `slice`, montando blocos com `EOL='\r\n'`), validar unicidade do
  anchor, e `node --check` numa cópia `.js` no fim. Ancorar em tokens ASCII
  (evitar linhas com `═══` e blanks com trailing space).

## Detalhes do domínio que não estão óbvios no código

- Multi-cockpit: 4 abas (COCKPIT, COCKPIT 2/3/4). `lancarProtocolo` mira a ABA
  ATIVA via `cockpitAtivo_` (fallback 'COCKPIT'). Nº protocolo no B5 do cockpit
  (dropdown 000-100, texto 3 díg.), toggle agenda no F5. Grava colunas aditivas
  NUMERO PROTOCOLO + COCKPIT ORIGEM. Mesmo paciente = N linhas (1/protocolo).
- Toggle "lançar ao emitir" usa `lancarAgendaPaciente_(ras, nextRow, {modo:'novos'}, [])`
  — SÓ a linha emitida, NÃO `lancarAgendaTodos_` (esse varre o backlog inteiro e
  surpreende). O primitivo por-linha do motor é `lancarAgendaPaciente_`.
- Match de substância header↔nome é tolerante a espaço número/unidade via
  `normSemEspaco_` (remove TODOS espaços; "200 mg"=="200mg"). `normalizeHeader_`
  do Code.gs mantém 1 espaço — NÃO mexer nela (uso amplo).

- CONSULTA/RETORNO são itens da aba CADASTRO SUBSTANCIAS (categoria
  CONSULTA/RETORNO, sem via), NÃO estão no array `CATALOGO_SUBSTANCIAS`. Podem
  vir SEM categoria → classificar por categoria E por nome (cinto+suspensório).
- Roteamento de agenda: CONSULTA/RETORNO/IMPLANTE → médico; IM/EV/SC →
  enfermagem. Cada grupo vira evento SEPARADO; médico antes da enfermagem.
- Ordem por categoria no RAS é só EM MEMÓRIA na geração (`ordenarSubstanciasRas_`);
  nada muda na planilha. Ordem travada pelo CEO: antioxidante, vitamina,
  hormônio, esteroide, peptídeo, mineral, demais (POLIFENOL→demais, COMPLEXO
  VIT.→vitamina, ajustáveis em 1 linha).

- Sheets: `range.merge()` que abrange linhas 1-2 do topo QUEBRA com "mesclar
  congeladas com nao congeladas" se a aba ja tinha 1 linha congelada de versao
  antiga. `sheet.clear()` NAO reseta frozenRows. Regra: sempre `setFrozenRows(0)`
  ANTES de mesclar o topo nos rebuilders (garantirCabecalhoCadastro_,
  estruturarCadastroPacientes_, estruturarCockpit_) e recongelar no fim.
