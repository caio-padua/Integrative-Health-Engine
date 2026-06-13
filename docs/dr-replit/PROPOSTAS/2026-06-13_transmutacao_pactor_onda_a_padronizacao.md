# Proposta — Transmutacao Pactor / Onda A (Padronizacao)

Data: 13/06/2026
Autor: Dr. Replit IHE
Tema: Transmutar RAS KAIZEN v8 (Google Apps Script) em TypeScript puro
para o produto independente Pactor (caio-padua/Pactor).

## 1. Martelos batidos pelo CEO (13/06/2026)

1.1 Martelo 1 = Opcao 1.
1.2 O Dr. Replit IHE gesta e testa as Ondas A ate D no ambiente do IHE
    (logica pura + testes verdes) e transplanta pronto pro Pactor.

1.3 Martelo 2 = Opcao A.
1.4 O IHE empurra SO numa branch `ihe-transmutacao` no repo Pactor,
    NUNCA no main. O Dr. Replit Pactor faz o merge.

1.5 Doutrina 6.1 fica ajustada.
1.6 O IHE pode empurrar EXCLUSIVAMENTE em branches que comecem com
    `ihe-` no repo Pactor; nunca no main.

1.7 Ondas E (agendamento + Calendly) e F (WhatsApp + Telegram) NAO
    entram agora; viram Instrucao 03, depois da Onda D.

1.8 Ao fechar cada onda: devolver o numero do commit (SHA) no IHE;
    o Dr. Claude audita por raw URL antes da onda seguinte.

1.9 R3 (anti-fantasia) acima do prazo. Se apertar, PARA e fala.

## 2. Sequencia das ondas

2.1 Onda A = Padronizacao de nomes de substancia (fundacao).
2.2 Onda B = Protocolos (gerador + multi-cockpit + ordenacao por categoria).
2.3 Onda C = Orcamento (cenarios A/B/C + calculadora; caso Luciano ao centavo).
2.4 Onda D = Pacientes (tipos + validacao CPF/email/telefone + seed placeholders).

## 3. Fonte da Onda A

3.1 Origem: `docs/dr-replit/ras-kaizen-v8/Padronizacao.gs`.
3.2 Referencia de comportamento: `docs/dr-replit/ras-kaizen-v8/tests/test_padronizacao.mjs`.
3.3 Regra de ouro preservada: identidade da substancia = NOME + DOSE juntos.
3.4 Comportamento fail-closed preservado: sem correspondencia segura = null,
    nunca chuta dose nem casa errado em silencio.

## 4. Desvios honestos (R3 / R7) — preciso registrar, nao escondo

4.1 DESVIO D-A1 — runner de teste.
4.1.1 O CEO escreveu "32 testes Vitest verdes".
4.1.2 Verifiquei na fonte (R7): o repo IHE NAO usa Vitest; os 5 pacotes
      testam com `tsx --test` (runner nativo do Node). O Pactor (padcom)
      nao tem runner de teste nenhum.
4.1.3 Decisao (kaizen-first R5): uso `tsx --test`, o runner real do
      ambiente, que da a MESMA garantia de "testes verdes". A logica fica
      em TypeScript puro e portavel; quando o Dr. Replit Pactor plugar no
      padcom, ele escolhe o runner do lado dele.
4.1.4 Se o CEO exigir literalmente Vitest, eu adiciono — mas seria um
      runner novo, inconsistente com todo o repo (custo sem ganho real).

4.2 DESVIO D-A2 — contagem de testes.
4.2.1 O numero "32" estava desatualizado.
4.2.2 A referencia atual (`test_padronizacao.mjs`) cobre 66 verificacoes.
4.2.3 Vou portar TODAS as 66 (mais cobertura, nao menos).

## 5. Onde a Onda A foi gestada no IHE (o utero)

5.1 Pacote de estagio: `lib/pactor-transmutacao/`.
5.2 Caminho-espelho do destino no Pactor:
    `src/modules/padronizacao/padronizacao.ts` (+ `.test.ts`).
5.3 No transplante, copia-se `src/modules/padronizacao/*` pra
    `artifacts/padcom/src/modules/padronizacao/` no Pactor (branch ihe-transmutacao).
5.4 Esse pacote de estagio e temporario no IHE; pode ser removido depois
    do transplante e do merge pelo primo.

## 6. Criterio de aceite da Onda A

6.1 `padronizacao.ts` em TypeScript puro, sem dependencia de UI/banco/Sheet.
6.2 As 66 verificacoes passam verdes no ambiente do IHE.
6.3 SHA devolvido no IHE pro Dr. Claude auditar por raw URL antes da Onda B.
