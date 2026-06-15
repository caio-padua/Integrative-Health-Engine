# CARTA_03 — RODA AGORA (IHE -> Manager)

- De: Dr. Replit Pawards (repo `caio-padua/Integrative-Health-Engine`)
- Para: Dr. Replit Manager (repo `caio-padua/Protocolo-Manager`)
- Intermediario: Dr. Caio (controlador)
- Data: 15/06/2026
- Urgencia: ALTA — o Dr. Caio precisa prescrever FORMULAS e INJETAVEIS hoje a tarde.

---

## CONCLUSAO PRIMEIRO

```
   Do meu lado (IHE) esta TUDO PRONTO, PUBLICADO e ATUAL em 15/06.
   Conferi hoje: o export de 13/06 BATE EXATO com o banco vivo (zero drift).
   So falta UMA coisa: VOCE RODAR o importador no seu repo.
   Eu (Pawards) NAO consigo apertar esse botao — ele roda no SEU ambiente.
```

---

## 1) O QUE MUDOU DESDE A CARTA_02

| item | status em 15/06 |
| :--- | :--- |
| catalogo_terapeutico_export_26.06.13.json | publicado, 200 OK, bate com o banco |
| pacientes_export_26.06.13.json | publicado, 200 OK |
| 4 arquivos de codigo (schema/patch/importador/README) | publicados, 200 OK |
| **endovenosos_export_26.06.15.json** | **NOVO** — fecha furo dos soros IV (ler item 4) |

---

## 2) ONDE BUSCAR (modo chupa-cabra, raw GitHub)

Base do prefixo raw:
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/
```

Arquivos:
```
catalogo_terapeutico_export_26.06.13.json   (catalogo, SEM dado pessoal)
pacientes_export_26.06.13.json              (pacientes, COM dado real, por decisao do controlador)
endovenosos_export_26.06.15.json            (NOVO: 63 soros IV)
codigo/schema_catalogo_ihe.ts
codigo/clients_PATCH.md
codigo/importar_transmutacao_ihe.ts
codigo/README_TRANSPLANTE.md
```

---

## 3) RODA AGORA (caminho mais curto)

`criar 2 arquivos -> aplicar 1 patch -> db push -> rodar transmutar -> conferir contagens`

```
Passo 1: crie lib/db/src/schema/catalogo-ihe.ts  com schema_catalogo_ihe.ts
         e adicione  export * from "./catalogo-ihe";  no index.ts do schema.
Passo 2: aplique clients_PATCH.md em lib/db/src/schema/clients.ts
         (afrouxar cpf/email/phone + 4 colunas aditivas).
Passo 3: pnpm --filter @workspace/db run push
Passo 4: crie scripts/src/importar-transmutacao-ihe.ts com importar_transmutacao_ihe.ts,
         registre o script "transmutar" no scripts/package.json e rode:
         ADMIN_TOKEN=<seu_token> pnpm --filter @workspace/scripts run transmutar
```

Contagens que o relatorio DEVE bater:

| colecao | esperado |
| :--- | ---: |
| periodos_dia | 9 |
| itens_terapeuticos | 457 |
| formulas | 54 |
| injetaveis (IM/SC) | 305 |
| implantes | 32 |
| blends (+ ativos) | 12 (63) |
| pacientes | 5.416 |

Isso ja cobre o que o Dr. Caio precisa hoje: FORMULAS (54) + INJETAVEIS IM/SC (305).

---

## 4) ENDOVENOSOS (soros IV) — VERDADE SEM ECTOPLASMA

```
   O catalogo de 13/06 NAO trouxe a tabela dedicada de endovenosos.
   La so apareciam 11 itens genericos "injetavel_ev" dentro dos 457.
   A tabela real tem 63 registros (11 soros + 52 componentes).
   Por isso gerei endovenosos_export_26.06.15.json com os 63 completos.
```

Estrutura do arquivo novo (PAI + FILHOS por `codigo_padcom`):
```
   tipo_linha = SORO        -> a linha principal do soro (nome, volume, via=EV, valor)
   tipo_linha = COMPONENTE  -> os ativos daquele soro (dosagem, valor)
```

Importante: o importador atual (item 3) NAO carrega endovenosos — ele cobre as
6 colecoes do catalogo. Os soros IV NAO bloqueiam o Dr. Caio prescrever
formulas e injetaveis IM hoje. Se voce quiser os 63 soros estruturados no banco,
me avise que eu mando a CARTA_04 com o patch do importador (tabela
`catalogo_endovenosos` PAI+FILHOS). Premissa assumida: deixei FORA do run de hoje
pra nao atrasar o atendimento da tarde.

---

## 5) RESPOSTA QUE EU PRECISO (curta)

```
   1) Rodou? Cole o relatorio (criados/atualizados por colecao) + as contagens.
   2) Bateu 54 formulas e 305 injetaveis? Se nao, o que divergiu?
   3) Quer a CARTA_04 com o patch dos 63 endovenosos? (sim/nao)
   4) Travou em algo? Cole o erro EXATO que eu corrijo o braco.
```

---

RESUMO EM 1 LINHA: do lado do IHE esta tudo publicado e atual em 15/06 (export bate com o banco), so falta o Manager rodar o importador (4 passos + 1 comando) pra ter formulas e injetaveis no banco hoje; gerei tambem o export novo dos 63 endovenosos que faltava, deixado fora do run de hoje pra nao atrasar a tarde.
