# PACOTE — GERADOR DE CADERNOS RAS JURIDICO + NOVO TERMO CSUB

- De: Dr. Replit Pawards (repo `caio-padua/Integrative-Health-Engine` / IHE)
- Para: Dr. Replit Manager (repo `caio-padua/Protocolo-Manager` / Padcon Conect) e demais LLMs
- Intermediario: CEO Dr. Caio (controlador)
- Data: 17/06/2026
- Natureza: pacote tecnico autocontido. Tudo o que e preciso para entender e
  importar a ferramenta esta aqui.

> SIGLA EXPLICADA SEMPRE (regra do CEO Caio):
> RAS = Registro de Assistencia Sistemico (conjunto de cadernos do paciente).
> RACL = Registro Assistencial Clinico. RACJ = Registro Assistencial Juridico.
> CSUB = Consentimento de Peptideos / GLP-1 / GH (o termo NOVO deste pacote).
> GLP-1 = agonista do receptor do peptideo semelhante ao glucagon tipo 1
> (ex.: semaglutida, liraglutida, tirzepatida). GH = hormonio do crescimento
> (somatropina). off-label = uso fora da indicacao da bula, permitido sob
> autonomia medica. ANVISA = Agencia Nacional de Vigilancia Sanitaria.
> FDA = agencia sanitaria dos EUA. EMA = agencia sanitaria europeia.
> CFM = Conselho Federal de Medicina. LGPD = Lei Geral de Protecao de Dados
> (Lei 13.709/2018). PDF = documento portatil de saida. DB = banco de dados.
> UPSERT = inserir-se-nao-existe / atualizar-se-existe (idempotente).
> SELECT = leitura no banco. RAW = arquivo cru do GitHub lido por URL.
> Lembrete do seu produto: no Padcon Conect a pessoa atendida chama-se
> "cliente", nao "paciente".

---

## 1. CONCLUSAO PRIMEIRO

| Resumo executivo do pacote                                                        |
|-----------------------------------------------------------------------------------|
| 1. Existe no IHE uma ferramenta que gera os cadernos RAS JURIDICO em PDF.          |
| 2. Cada caderno e um termo de consentimento que nasce da tabela `termos_juridicos`.|
| 3. Foi criado um termo NOVO: CSUB (peptideos, GLP-1 e GH), com base legal real.    |
| 4. Regra de ouro do gerador: cada termo especifico so lista o item que CASA com ele.|
| 5. Voce vai importar SO essa ferramenta (a carta de pedido e a CARTA_09).          |

---

## 2. ARQUITETURA — ORGANOGRAMA DOS CADERNOS (blueprint)

Desenho replicado no Canvas do IHE (organograma visual). Aqui em texto para viajar:

```
                         RAS (Registro de Assistencia Sistemico)
                                        |
        +-------------------------------+-------------------------------+
        |                               |                               |
      RACL                            RACJ                       GERADOR DE PDF
 (11 cadernos clinicos)        (18 cadernos juridicos)        (categorias de saida)
                                        |                     COMPLETO/EVOLUTIVO/
                                        |                     ESTADO_SAUDE/FINANCEIRO/
                                        |                     CONTRATOS/ATESTADOS/LAUDOS/
                                        |                     TERMOS/JURIDICO/SEGUIMENTO
                +-----------------------+-----------------------+
                |                                               |
         TERMOS GLOBAIS                                 TERMOS ESPECIFICOS
   (listam TODOS os itens, por designo)        (item 7: so listam o que CASA)
                |                                               |
   CGLO  LGPD  RISC  NGAR  PRIV                CFOR  CIMU  CEND  CIMP  CEIN  CETE  CSUB
                                                                              ^^^^ NOVO
```

| Legenda das siglas de termo                                                       |
|-----------------------------------------------------------------------------------|
| CGLO = Consentimento Global (cobre tudo).                                          |
| CFOR = Consentimento de Formula manipulada (via oral).                             |
| CIMU = Consentimento Injetavel Intramuscular (IM).                                 |
| CEND = Consentimento Endovenoso (EV).                                              |
| CIMP = Consentimento de Implante / pellet subcutaneo.                              |
| CEIN = Consentimento Estetico Invasivo.                                            |
| CETE = Consentimento Estetico por Tecnologia.                                      |
| CSUB = Consentimento de Peptideos / GLP-1 / GH (NOVO).                             |
| LGPD = Termo de Protecao de Dados. RISC = Declaracao de Riscos.                    |
| NGAR = Termo de Nao-Garantia. PRIV = Privacidade e Sigilo.                         |

---

## 3. REGRA DE MONTAGEM (item 7 — anti-dupla-listagem)

Fluxo de decisao do gerador para cada medicamento prescrito:

```
   medicamento prescrito --> casa com a via/tipo do termo ESPECIFICO ?
        |                                   |
        | SIM                               | NAO
        v                                   v
   entra no termo especifico          nao entra naquele termo
   (1 unica vez)                      (sem dupla listagem)
        |
        +--> ALEM disso, sempre entra no termo GLOBAL CGLO (que lista tudo).
```

| Regra                                                                             |
|-----------------------------------------------------------------------------------|
| 1. Termo ESPECIFICO so lista o item prescrito que casa com a SUA via/tipo.        |
| 2. CSUB casa por NOME: semaglutida, liraglutida, tirzepatida, somatropina,        |
|    BPC-157, TB-500 — independe da via de aplicacao.                                |
| 3. Peptideo NAO aparece em CFOR/CIMU/CEND/CIMP (sem dupla listagem).              |
| 4. Termo GLOBAL (CGLO) lista TODOS os medicamentos, por designo.                  |
| 5. Termo sem codigo (LGPD, aceite digital) nao casa medicamento.                 |

---

## 4. O TERMO NOVO — CSUB (validado ao vivo)

| Identidade do termo CSUB                                                           |
|-----------------------------------------------------------------------------------|
| Bloco / subgrupo: JURI / JURI.CONS.                                               |
| Codigo consentimento: CSUB.                                                        |
| Categoria: consentimento_especifico.                                               |
| Titulo: Consentimento Especifico — Peptideos, Agonistas de GLP-1 e Hormonio do    |
| Crescimento (CSUB).                                                                |
| Tamanho do texto: 3.087 caracteres.                                               |
| Riscos especificos: 8 itens.                                                       |
| Casamento por nome: semaglutida, liraglutida, tirzepatida, somatropina, BPC-157,  |
| TB-500.                                                                            |
| Status juridico: revisao por advogado PENDENTE (ver RESSALVA na secao 6).          |

Prova viva (paciente de teste id 44): o PDF JURIDICO sai com HTTP 200 e mostra o
CSUB no CADERNO 23, com a semaglutida listada. A semaglutida aparece SO no termo
global CGLO e no CSUB — NAO em CFOR/CIMU/CEND/CIMP (sem dupla listagem).

---

## 5. BASE LEGAL PESQUISADA (peptideos)

| Substancia / classe | Situacao regulatoria resumida                               |
|---------------------|-------------------------------------------------------------|
| Agonistas de GLP-1  | Registrados (bula = diabetes tipo 2); uso para emagrecimento |
| (semaglutida etc.)  | sem essa indicacao e off-label; RDC no 973/2025, IN no       |
|                     | 360/2025, NT no 200/2025, Alerta no 02/2026 (farmacovigilancia).|
| Somatropina (GH)    | Registrada na ANVISA com indicacoes especificas; uso         |
|                     | estetico/performance e off-label; exige monitoramento.      |
| BPC-157 / TB-500    | SEM registro como medicamento na ANVISA, FDA ou EMA;        |
|                     | carater experimental; eficacia e seguranca nao estabelecidas.|

---

## 6. POR QUE (fundamento) + RESSALVA

| Fundamento                                                                        |
|-----------------------------------------------------------------------------------|
| - Off-label e permitido sob autonomia do CFM, com base em evidencia cientifica.   |
| - BPC-157 e TB-500 sem registro => consentimento de risco experimental dedicado.  |
| - GLP-1 sob regras de farmacovigilancia vigentes (retencao de receita, criterios).|
| - Somatropina off-label exige investigacao previa e monitoramento continuo.       |
| - Rastreabilidade juridica: cada via/risco tem termo dedicado e assinavel.         |

RESSALVA OBRIGATORIA: o texto e tecnico-clinico, redigido pelo Dr. Replit Pawards;
NAO sou advogado. Antes do uso com cliente real, o texto carece de ratificacao por
ADVOGADO. Trate o campo de metadados `revisaoJuridica` como PENDENTE ate la.

---

## 7. A FERRAMENTA A IMPORTAR (mapa dos arquivos no IHE)

| Camada           | Arquivo (raw no repo IHE)                                       |
|------------------|----------------------------------------------------------------|
| Tabela do termo  | `lib/db/src/schema/termosJuridicos.ts`                         |
| Catalogo siglas  | `lib/db/src/schema/cadernosDocumentais.ts`                     |
| Seed + CRUD      | `artifacts/api-server/src/routes/termosJuridicos.ts`           |
| Rota + coleta    | `artifacts/api-server/src/routes/rasxArqu.ts` (GET             |
|                  | `/rasx/:pacienteId/arqu/pdf/JURIDICO` + `collectPdfData`)       |
| Render do PDF    | `artifacts/api-server/src/pdf/rasxPdf.ts`                       |
|                  | (`codigoEspecificoDoTermo`, `termoCasaMedicamento`)            |
| Teste da regra 7 | `artifacts/api-server/src/pdf/rasxItem7.test.ts`               |

Esquema da tabela `termos_juridicos` (colunas que importam):

```
  id, bloco, subgrupo, consentimento (ex.: 'CSUB'),
  titulo, categoria (enum), texto_completo (TEXT),
  riscos_especificos (JSONB array), metadados (JSONB),
  origem, versao_schema, arquivado_em
```

REGRA DE OURO (igual a transmutacao): a importacao e ADITIVA e idempotente.
Inserir o termo com UPSERT por `consentimento='CSUB'` (WHERE NOT EXISTS / ON
CONFLICT). NUNCA dropar tabela, NUNCA trocar schema que funciona, NUNCA listar o
mesmo item em dois termos especificos.

---

## RESUMO EM 1 LINHA

Pacote autocontido do gerador de cadernos RAS JURIDICO mais o termo novo CSUB
(peptideos/GLP-1/GH), validado ao vivo, com regra anti-dupla-listagem, base legal
e ressalva de revisao por advogado — pronto para o Manager importar SO essa
ferramenta via CARTA_09.
