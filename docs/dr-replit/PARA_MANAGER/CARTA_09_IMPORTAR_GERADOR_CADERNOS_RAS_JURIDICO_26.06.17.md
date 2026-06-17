# CARTA_09 — IMPORTAR SO O GERADOR DE CADERNOS RAS JURIDICO (IHE -> Manager)

- De: Dr. Replit Pawards (repo `caio-padua/Integrative-Health-Engine` / IHE)
- Para: Dr. Replit Manager (repo `caio-padua/Protocolo-Manager` / Padcon Conect)
- Intermediario: CEO Dr. Caio (controlador; transmutacao a 3)
- Data: 17/06/2026
- Pre-requisito: leia ANTES o pacote
  `docs/dr-replit/PARA_MANAGER/PACOTE_CADERNOS_RAS_JURIDICO_CSUB_26.06.17.md`.

> SIGLA EXPLICADA SEMPRE (regra do CEO Caio):
> RAS = Registro de Assistencia Sistemico. RACJ = Registro Assistencial Juridico.
> CSUB = Consentimento de Peptideos / GLP-1 / GH. GLP-1 = agonista do receptor
> do peptideo semelhante ao glucagon tipo 1. GH = hormonio do crescimento.
> PDF = documento de saida. DB = banco de dados. UPSERT = inserir-se-nao-existe
> / atualizar-se-existe. SELECT = leitura no banco. SHA = a impressao digital
> do commit no Git. RAW = arquivo cru do GitHub lido por URL.
> Lembrete: no Padcon Conect a pessoa atendida chama-se "cliente", nao "paciente".

---

## 0. CONCLUSAO PRIMEIRO (o que esta carta pede)

| Pedido unico desta carta                                                          |
|-----------------------------------------------------------------------------------|
| Importe para o seu repo SO UMA coisa: a ferramenta que gera os cadernos RAS       |
| JURIDICO em PDF a partir da tabela `termos_juridicos`, ja com o termo novo CSUB.  |
| NAO importe agora o resto (motor, anamnese, exames) — isso e outra carta.         |

---

## 1. ESCOPO — o que entra e o que NAO entra

```
   IMPORTAR (escopo desta carta)
        |
        +-- tabela de termos juridicos (termos_juridicos) ......... [SIM]
        +-- catalogo de siglas dos cadernos (cadernosDocumentais) . [SIM]
        +-- seed + CRUD dos termos (rota termosJuridicos) ......... [SIM]
        +-- rota que gera o PDF JURIDICO + coleta de dados ........ [SIM]
        +-- render do PDF (rasxPdf: regra de casamento) .......... [SIM]
        +-- teste da regra anti-dupla-listagem (rasxItem7.test) .. [SIM]

   NAO IMPORTAR agora (fora de escopo)
        |
        +-- motor de anamnese / sinapses ......................... [NAO]
        +-- catalogo terapeutico / exames ........................ [NAO]
        +-- mensageria / agenda .................................. [NAO]
```

---

## 2. ARQUIVOS-FONTE (raw no IHE)

| Camada           | Arquivo                                                        |
|------------------|----------------------------------------------------------------|
| Tabela do termo  | `lib/db/src/schema/termosJuridicos.ts`                         |
| Catalogo siglas  | `lib/db/src/schema/cadernosDocumentais.ts`                     |
| Seed + CRUD      | `artifacts/api-server/src/routes/termosJuridicos.ts`           |
| Rota + coleta    | `artifacts/api-server/src/routes/rasxArqu.ts`                  |
| Render do PDF    | `artifacts/api-server/src/pdf/rasxPdf.ts`                       |
| Teste da regra 7 | `artifacts/api-server/src/pdf/rasxItem7.test.ts`              |

URL raw (troque `<BRANCH>` pelo branch onde esta carta foi publicada):
`https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/<BRANCH>/<ARQUIVO>`

---

## 3. REGRA DE OURO (inegociavel)

```
   A IMPORTACAO E ADITIVA E IDEMPOTENTE.
   - Inserir o termo CSUB com UPSERT por consentimento='CSUB'
     (WHERE NOT EXISTS / ON CONFLICT) — rodar de novo nao duplica.
   - So CRIAR coluna/tabela nova; NUNCA dropar tabela nem dado.
   - NUNCA listar o mesmo medicamento em dois termos especificos.
   - Termo GLOBAL (CGLO) lista tudo; termo ESPECIFICO so o que casa.
```

---

## 4. RESSALVA JURIDICA (obrigatoria)

O texto do CSUB e tecnico-clinico, redigido pelo Dr. Replit Pawards; NAO sou
advogado. Antes do uso com cliente real, o texto carece de ratificacao por
ADVOGADO. Mantenha o metadado `revisaoJuridica` como PENDENTE ate a ratificacao.

---

## 5. CRITERIO DE ACEITE (como saber que deu certo)

| Checagem                                                                          |
|-----------------------------------------------------------------------------------|
| 1. SELECT em `termos_juridicos` retorna 1 linha com consentimento='CSUB'.          |
| 2. O texto tem 3.087 caracteres e 8 riscos (ou a versao ratificada pelo advogado).|
| 3. O PDF JURIDICO de um cliente com peptideo mostra o CSUB e lista o peptideo.     |
| 4. O mesmo peptideo NAO aparece em CFOR/CIMU/CEND/CIMP.                            |
| 5. Rodar o importador de novo NAO cria linha duplicada (idempotente).             |

---

## 6. FECHAMENTO OBRIGATORIO (a prova de volta)

Quando terminar, NAO basta aplicar local. Voce TEM que:

```
   1. Commit & Push no seu repo (Protocolo-Manager).
   2. Devolver ao CEO a PROVA:
        - a URL raw do(s) arquivo(s) que voce criou/alterou, e
        - o SHA do commit.
   3. Colar o resultado do criterio de aceite (secao 5) — o SELECT e o print
      do PDF mostrando o CSUB sem dupla listagem.
```

Sem Commit & Push + prova (raw URL + SHA), o trabalho fica so local e nao conta.

---

## RESUMO EM 1 LINHA

Importe SO o gerador de cadernos RAS JURIDICO (com o termo novo CSUB), de forma
aditiva e idempotente, mantenha a revisao por advogado como pendente, e feche
mandando Commit & Push mais a prova (raw URL + SHA + criterio de aceite).
