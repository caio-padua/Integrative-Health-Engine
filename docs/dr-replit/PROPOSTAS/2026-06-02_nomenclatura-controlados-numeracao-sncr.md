# Blueprint — Nomenclatura de Prescrição/Receita + Controlados + Numeração SNCR/Anvisa

Data: 02/06/2026
Autor: Dr. Replit
Status: PROPOSTA — aguardando validação do CEO Caio
Protocolo: anti-ectoplasma (decisao em .md antes do codigo)
Regra de ouro desta onda: SOMAR, nunca SUBTRAIR. Nao desconstruir o cockpit.

---

## 1. Objetivo

1. Revalidar por escrito o vocabulario (prescricao, receita manipulada, remedio
   de farmacia, controlado, tipo de receita Anvisa, via de administracao).
2. Sistematizar a NUMERACAO liberada pela Anvisa para controlados (faixas por
   UF + tipo), preparando o encaminhamento de receitas controladas pela internet.
3. Definir os campos ADITIVOS de cadastro pedidos: (a) tipo manipulada/remedio,
   (b) controlado sim/nao, (c) remedio de farmacia sim/nao, (d) numeracao Anvisa.

---

## 2. O QUE JA EXISTE (inventario — para nao ter retrabalho)

Tudo abaixo ja esta no banco/codigo real. A onda nova SOMA em cima disto.

2.1. Cadastro de substancia — `lib/db/src/schema/substancias.ts`
- `controlado` (boolean) — JA EXISTE.
- `tipoReceitaAnvisaCodigo` (text) — JA EXISTE (guarda B1, B2, A1...).
- `farmaciaPadrao` (text) e `via` (text) — JA EXISTEM.

2.2. Catalogos separados por natureza
- `formulas` (`lib/db/src/schema/catalogo.ts`) = fórmula MANIPULADA / magistral (PADCOM).
- `remedios_farmacia` (`lib/db/src/schema/catalogoFarmacia.ts`) = INDUSTRIALIZADO
  (Losartana, Metformina, Jardiance) com marca, fabricante, principio ativo,
  e lista canonica `VIAS_ADMINISTRACAO` (14 vias).

2.3. Infra SNCR (Sistema Nacional de Controle de Receituarios)
Migration `artifacts/api-server/src/db/migrations/002_prescricao_v2_isolamento_sncr.sql`:
- `usuarios.cota_sncr_b1 / b2 / a1 / a2 / a3` (int) — contadores de cota por tipo.
- `usuarios.uf_atuacao_principal`, `numeracao_local_vigilancia`, `numero_certificado_icp_brasil`, `data_ultima_atualizacao_cota`.
- Tabela `sncr_consumo_log` — log sanitario de cada numero consumido
  (`numero_consumido` text — hoje "white-label manual"), `cota_restante_apos`.
- Tabela `prescricao_pdfs_emitidos` — PDFs com `numero_sncr`, `cor_visual`, `destino_dispensacao`, hash.
- `substancias`, `prescricao_bloco_ativos`, `bloco_template_ativo` ganharam
  `controlado` + `tipo_receita_anvisa_codigo` + `farmacia_padrao`.
- REGRA 14 — isolamento legal de controlados (blocos separados, MANIPULAR JUNTO).

2.4. Catalogo de tipos de receita — tabela `tipos_receita_anvisa` (nivel banco)
Mapa em `artifacts/api-server/src/pdf/prescricaoPdf.ts` (ROTULO_TIPO_RECEITA):
- BRANCA_SIMPLES, ANTIBIOTICO_RDC20, C1, C2, C3, C5 (branco/controle especial)
- B1, B2 (azul — psicotropico / anorexigeno)
- A1, A2, A3 (amarelo — entorpecente / psicoestimulante / psicotropico)
- MAGISTRAL (RDC 67), LILAS_HORMONAL, VERDE_FITO
O PDF JA imprime "NUMERACAO ANVISA / SNCR: {numero}".

---

## 3. NOMENCLATURA VALIDADA (glossario oficial)

3.1. PRESCRICAO = o ato/documento clinico rico (periodo + dose + posologia +
mensagem). Nao e lista solta. E o guarda-chuva.

3.2. RECEITA MANIPULADA / formula magistral = item feito sob medida pela farmacia
de manipulacao. Mora em `formulas`.

3.3. REMEDIO DE FARMACIA = industrializado, comprado pronto. Mora em
`remedios_farmacia`.

3.4. CONTROLADO = atributo (sim/nao), NAO um tipo separado. Pode incidir tanto
sobre remedio de farmacia quanto sobre formula manipulada. Quando sim, dispara o
TIPO DE RECEITA Anvisa (cor + regra).

3.5. TIPO DE RECEITA ANVISA = a classe de receituario (B1, B2, A1, A2, A3, C1...).
Guardado em `tipoReceitaAnvisaCodigo`.

3.6. VIA DE ADMINISTRACAO = propriedade do item (oral, sublingual, topica...).
NUNCA e coluna nem "procedimento". "Via oral" como procedimento era ectoplasma.

3.7. ATENCAO — colisao de nomes "B1":
- B1 SEMANTICO = colunas b1/b2/b3/b4/seq dos catalogos (padrao de codificacao Caio).
- B1 ANVISA = tipo de receituario azul psicotropico (`tipoReceitaAnvisaCodigo`).
Sao coisas DIFERENTES. Nas telas, rotular sempre "Tipo de receita Anvisa" para o
caso Anvisa, evitando confusao com o codigo semantico.

---

## 4. O QUE FALTA (o gap real desta onda)

4.1. FAIXA DE NUMERACAO Anvisa estruturada.
Hoje so existe um CONTADOR (`cota_sncr_*` int) e o numero entra como TEXTO manual
no log. A Anvisa libera FAIXAS: por UF + tipo, com numero inicial -> final.
Exemplo do Caio: "UF SP 01 022271 ate tal" (UF + serie + sequencial).
Falta: estrutura que guarde inicio/fim/atual e gere o PROXIMO numero
automaticamente na emissao (essencial pro encaminhamento via internet).

4.2. TIPO explicito no cadastro unificado.
Manipulada vs remedio de farmacia hoje so existe como TABELAS separadas. No
cockpit/cadastro unificado falta um campo `tipo` legivel.

4.3. CONTROLADO nas tabelas `formulas` e `remedios_farmacia`.
Hoje so `substancias` tem `controlado`/`tipoReceitaAnvisaCodigo`. Para uma formula
manipulada ou remedio de farmacia marcado controlado, falta o flag nessas tabelas
(aditivo).

---

## 5. PROPOSTA ADITIVA (somar, nao subtrair)

5.1. Cadastro (campos pedidos a/b/c/d)
- (a) `tipo`: ENUM `manipulada` | `remedio_farmacia` (recomendado: campo unico).
- (b) `controlado`: boolean (ja existe em substancias; ADICIONAR em formulas e
  remedios_farmacia).
- (c) "remedio de farmacia sim/nao": derivado de (a) — ver Duvida 1 (evitar
  campo redundante que permita estado contraditorio).
- (d) `tipoReceitaAnvisaCodigo`: ja existe; expor no cadastro quando controlado=sim.

5.2. Nova tabela `faixa_numeracao_sncr` (ADITIVA, nao toca nas existentes)
Campos propostos:
- `id`
- `uf` (ex: SP)
- `serie` (ex: 01)
- `tipoReceitaAnvisaCodigo` (B1, B2, A1...)
- `medicoId` (FK usuarios) OU `unidadeId` — ver Duvida 2
- `numeroInicial` (ex: 022271)
- `numeroFinal` (ex: 022500)
- `numeroAtual` (proximo a usar; default = numeroInicial)
- `status` (ativa | esgotada | suspensa)
- `origem`, `versaoSchema`, `arquivadoEm` (padrao auditoria/LGPD do projeto)
- `criadoEm`
Consumo: ao emitir controlado, o sistema pega `numeroAtual` da faixa
correspondente (UF + tipo + medico), grava em `sncr_consumo_log` + no PDF
(`numero_sncr`), e incrementa `numeroAtual`. Ao chegar em `numeroFinal`,
status=esgotada + bloqueia emissao + alerta CEO (ver Duvida 6).

5.3. Mockup/cockpit (GpsPadua) — somar, nao desconstruir
- Manter as vias de administracao atuais (decisao Caio 02/06/2026).
- No item da coluna Receitas Clinicas, exibir badges: TIPO (manipulada/remedio),
  CONTROLADO, e TIPO DE RECEITA ANVISA quando controlado.
- Numeracao NAO aparece no cadastro do item (e consumida na emissao) — ver Duvida 5.

---

## 6. DUVIDAS REAIS PARA VALIDAR (somente o que e ambiguo)

Duvida 1 — Campo unico ou dois booleanos?
Recomendo `tipo` ENUM (manipulada | remedio_farmacia) em vez de dois booleanos
(b + c), porque dois booleanos permitem estado contraditorio (manipulada=sim E
remedio=sim). `controlado` fica separado (ortogonal). Confirma?

Duvida 2 — Faixa vinculada ao MEDICO ou a UNIDADE?
A Anvisa costuma liberar por profissional prescritor (CRM). A cota hoje ja mora em
`usuarios`. Recomendo faixa por `medicoId` + UF. Confirma?

Duvida 3 — Formato/mascara do numero.
Entendi "UF + serie(2) + sequencial(6)" -> SP 01 022271. A serie existe sempre?
Quantos digitos no sequencial? Confirma a mascara?

Duvida 4 — Uma faixa por TIPO de controlado.
Cada tipo (B1, B2, A1...) tem sua propria faixa independente. Confirma?

Duvida 5 — "numeracao no cadastro das formulas".
O numero NAO fica fixo na formula (cada emissao consome um novo da faixa). No
cadastro fica o TIPO (B1...); o sistema puxa o proximo numero na emissao.
Confirma esse entendimento?

Duvida 6 — Esgotamento da faixa.
Quando o numeroFinal for atingido: recomendo BLOQUEAR emissao do tipo + disparar
alerta ao CEO (WhatsApp) pedindo nova faixa. Confirma?

---

## 7. Recomendacao (default)

Opcao A (recomendo): voce valida as 6 duvidas acima; eu implemento ADITIVAMENTE
(campos de cadastro + tabela faixa_numeracao_sncr + badges no cockpit), sem tocar
no que ja existe.
Opcao B: voce ajusta o blueprint primeiro (corrige nomenclatura/modelo) e eu
reviso este .md antes de codar.
Opcao C: implemento so a parte de cadastro (a/b/c/d) agora e deixo a faixa de
numeracao para a proxima onda.
