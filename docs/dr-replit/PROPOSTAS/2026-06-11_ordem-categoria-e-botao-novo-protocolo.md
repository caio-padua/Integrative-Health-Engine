# Proposta — Ordem por categoria + Botao "Novo Protocolo" (RAS KAIZEN v8)

> Data: 11/06/2026
> Autor: Dr. Replit
> Sistema: Apps Script PARALELO (conta clinica.padua.agenda), NAO o PAWARDS nativo.
> Status: **DECIDIDO + IMPLEMENTADO** em 11-12/06/2026 (decisoes confirmadas pelo Caio).

## Contexto tecnico

1. O catalogo `CATALOGO_SUBSTANCIAS` (Code.gs) ja tem o campo **categoria** na
   3a posicao: `[nome, dosagem, categoria, via, ...]`.
2. Categorias hoje no catalogo: ANTIOXIDANTE, POLIFENOL, VITAMINA, COMPLEXO VIT.,
   HORMONIO, ESTEROIDE, PEPTIDEO, MINERAL, AMINOACIDO, COENZIMA, METILACAO,
   QUELANTE, FITOTERAPICO, FOSFOLIPIDEO, OXIDATIVO, SILICIO ORG.
3. O COCKPIT monta o protocolo lendo o dropdown da aba **CADASTRO SUBSTANCIAS**
   (coluna A), que e populada a partir do catalogo.
4. A **TABELA GERAL** guarda cada substancia como um **bloco de 6 colunas**
   (com SIM/datas por paciente). `lerPaciente_` varre esses blocos de 6.
5. As colunas de controle da agenda (AGENDA HASH/EVENTOS/LANCADO/STATUS) ficam
   appendadas no FIM da TABELA GERAL.

## Risco

- Reordenar fisicamente as colunas da TABELA GERAL mexe em **dado real de
  paciente** e nos blocos de 6 que o `lerPaciente_` depende. Exige backup e
  cuidado. Mexer no dropdown do cockpit / catalogo NAO tem risco.

## DECISAO 1 — Onde aplicar a ordem por categoria  [RESPONDIDA]

> **Caio escolheu: ordem aplicada SO na geracao do RAS/RASCO. NADA muda na
> planilha** (nem TABELA GERAL, nem dropdown, nem CADASTRO SUBSTANCIAS).
> E uma variante mais limpa que as opcoes abaixo: zero risco ao dado E a
> organizacao aparece exatamente onde importa (o documento impresso).

- ~~A: ordenar so o cadastro/menu de substancias (dropdown).~~ (descartada)
- ~~B: reordenar as colunas da TABELA GERAL.~~ (descartada — mexe em dado real)
- ~~C: as duas.~~ (descartada)
- **ESCOLHIDA: ordenar em memoria so na montagem do RAS.**

## DECISAO 2 — O que o botao "Novo Protocolo" zera  [RESPONDIDA]

> **Caio escolheu: A.**

- **A (ESCOLHIDA):** Limpa so o **formulario do COCKPIT** (paciente B4, data
  B8:D8, linhas de substancia A13:I27) pra comecar outro protocolo. NAO apaga
  nada da TABELA GERAL nem o cadastro do paciente. `clearContent()` preserva
  bordas, titulos, instrucoes e validacoes dos dropdowns.
- ~~B: apaga um paciente especifico na TABELA GERAL.~~ (descartada)
- ~~C: zera a planilha inteira.~~ (descartada)

## Ordem de categorias  [TRAVADA pelo Caio]

> O Caio confirmou por sim/nao EXATAMENTE esta sequencia de 7 grupos.
> Conflito anterior (peptideo 4o x esteroide apos hormonio) resolvido: vale a
> lista abaixo, ao pe da letra.

1. ANTIOXIDANTE
2. VITAMINA  (inclui "COMPLEXO VIT.", que e literalmente um complexo vitaminico)
3. HORMONIO
4. ESTEROIDE
5. PEPTIDEO
6. MINERAL
7. DEMAIS  (qualquer outra categoria ou sem categoria)

### Dois casos de borda (decididos com default, ajustaveis em 1 linha)

1. **COMPLEXO VIT. -> grupo 2 (vitamina).**
   1.1. Motivo: e literalmente vitamina; o Caio so separou a apresentacao.
2. **POLIFENOL -> grupo 7 (demais), NAO junto do antioxidante.**
   2.1. Motivo: o Caio mantem ANTIOXIDANTE e POLIFENOL como categorias
        SEPARADAS no catalogo, entao o sistema respeita essa separacao.
   2.2. Se o Caio quiser polifenol contado como antioxidante (grupo 1), e 1
        linha em `rankCategoriaRas_` (adicionar `|| c.indexOf('POLIFENOL')`).
3. Demais (AMINOACIDO, COENZIMA, METILACAO, QUELANTE, FITOTERAPICO,
   FOSFOLIPIDEO, OXIDATIVO, SILICIO ORG., CONSULTA, RETORNO) caem no grupo 7.

## IMPLEMENTACAO (12/06/2026)

1. Arquivo novo `OrdenacaoCategoriaRas.gs`:
   1.1. `rankCategoriaRas_(categoria)` -> 1..7 (logica pura, casa por trecho).
   1.2. `categoriaCatalogoRas_(nome)` -> le a categoria no `CATALOGO_SUBSTANCIAS`.
   1.3. `ordenarSubstanciasRas_(subs)` -> copia ordenada e ESTAVEL (sem mexer
        no array original nem na planilha).
   1.4. `testesOrdenacaoCategoriaRas_()` + botao "RODAR TESTES SEMANTICOS
        (ordem por categoria no RAS)" no Panel.
2. Ligacao no RAS (1 linha ADITIVA no `Code.gs`, funcao `montarPaginasRAS_`):
   2.1. DE:    `var allSubst = paciente.substancias || [];`
   2.2. PARA:  `var allSubst = ordenarSubstanciasRas_(paciente.substancias || []);`
   2.3. So isso. A paginacao (grupos de 5) passa a sair por categoria. Nada
        mais muda; a planilha continua intacta.
3. Arquivo novo `NovoProtocoloCockpit.gs`:
   3.1. `novoProtocoloCockpit_()` limpa B4 + B8:D8 + A13:I27 com `clearContent()`.
   3.2. `runNovoProtocolo()` + botao "NOVO PROTOCOLO" + atalho Alt+O no Panel.
