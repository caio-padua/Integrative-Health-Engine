# 25 — VALIDACAO PACTOR · GERADOR DE RAS (blueprint + cockpit)

> De: Dr. Replit IHE  ·  Para: Dr. Claude (orquestrador)
> Data: 13/06/2026  ·  Branch: ver-l2-dr-claude
> Pedido do CEO: "valida via GitHub se esta tudo correto, quero operar rapido"

---

## 1. TL;DR (semaforo)

```
PRONTIDAO GERAL DA LINHA .................... 53%  [AMARELO]
  -> logica juridica (motor lib) ........... 100% [VERDE]  87 testes
  -> cockpit operavel (mockup) ............. casa ativo->juridico OK [VERDE]
  -> virar REAL (banco+PDF+assinatura) ..... pendente   [VERMELHO]
```

PERGUNTA-MESTRE PRO DR. CLAUDE:
```
[ ? ] O casamento via->consentimento esta CORRETO e COMPLETO?
[ ? ] A rota pra OPERAR rapido (secao 6) esta certa, ou inverto prioridade?
```

---

## 2. ORGANOGRAMA · linha de producao (12 estacoes)

```
                         FABRICA DE RAS
                              |
        +---------------------+----------------------+
        |                                            |
  ESTEIRA PRINCIPAL                          TRANSMUTACAO PAWARDS
  (paciente -> assinado)                     (traz do sistema atual)
        |                                            |
  01 SELECAO PACIENTE .......100% [VERDE]     10 PRESC. MANIPULADOS ...25% [VERMELHO]
        v                                     11 PRESC. INJETAVEIS ....25% [VERMELHO]
  02 CATALOGO ATIVOS ........ 60% [AMARELO]   12 MENSAGERIA CRONO .....30% [VERMELHO]
        v
  03 MONTAGEM PROTOCOLO ..... 60% [AMARELO]
        v
  04 RAS PREMIUM/SIMPLES .... 80% [AMARELO]
        v
  05 MOTOR JURIDICO (lib) ...100% [VERDE]  <- 87 testes verdes, fail-closed
        v
  06 RAS JURIDICO (casamento) 70% [AMARELO] <- nucleo da operacao
        v
  07 ORCAMENTO/CENARIOS ..... 50% [AMARELO]
        v
  08 ASSINATURA (ZapSign) ... 20% [VERMELHO]
        v
  09 AGENDA/LANCAMENTO ...... 10% [VERMELHO]
```

LEGENDA: quadradinho cheio = 100% daquela fracao · semi mostra o "%" · vazio = falta.

---

## 3. ORGANOGRAMA · cockpit (fluxo de operacao)

```
  [PACIENTE]
      |
      v
  [CATALOGO ATIVOS] --busca/filtro--> (INJETAVEL | MANIPULADO)
      |
      v
  [PROTOCOLO]  --add / remove / sessoes-->
      |
      v
  [PREVIA RAS] ----+----> PREMIUM
                   +----> SIMPLES
                   +----> JURIDICO --(casamento por via)--> [EMITIR]
                                                                |
                          via SEM consentimento --> [FALTA:] --X (botao BLOQUEADO)
                          todas as vias casadas ---> OK ------> (emite)
```

---

## 4. DADOS · casamento via -> consentimento (o ponto critico)

```
  via de aplicacao        ->  consentimento
  -------------------------------------------
  Endovenosa              ->  CEND
  Intramuscular           ->  CIMU
  Subcutanea              ->  CSUB
  Oral / Sublingual       ->  CFOR
```

BLOCOS JURIDICOS FIXOS (espelham as categorias do motor real):
```
  tcle_global  +  consentimento_especifico  +  nao_garantia  +  ciencia_financeira
```

REGRA: fail-closed — falta qualquer p? marca [FALTA:] e TRAVA a emissao.

---

## 5. RAW URLs · leia o codigo REAL aqui

```
  MOTOR JURIDICO (fonte da verdade, 87 testes):
  https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/lib/pactor-transmutacao/src/modules/juridico/juridico.ts

  BLUEPRINT (linha de producao):
  https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/pactor-gerador-ras/LinhaProducao.tsx

  COCKPIT (operavel):
  https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/pactor-gerador-ras/RasCockpit.tsx
```

NOTA: cockpit/blueprint sao MOCKUPS self-contained (regra do sandbox: nao importam
a lib, espelham a logica). O motor juridico (lib) e o codigo REAL rodavel.

---

## 6. ROTA PARA OPERAR RAPIDO (decisao A/B/C)

Caminho minimo pra sair do mockup e EMITIR um RAS de verdade:

```
  [VERDE 100%] motor juridico ja roda
       +
  [falta] catalogo real (02) ---> puxar ativos do banco
       +
  [falta] gerar PDF real (04/06) ---> RAS premium/simples/juridico em PDF
       +
  [falta] assinatura (08) ---> plugar ZapSign no fluxo
```

OPCOES:
```
  A) RAS juridico end-to-end primeiro (02 -> 06 -> PDF -> 08)   [DEFAULT recomendado]
     -> entrega o documento que carrega o peso legal; opera de verdade antes.
  B) Transmutacao PAWARDS primeiro (10/11/12)
     -> reaproveita prescricao existente, mas nao emite RAS assinado ainda.
  C) Orcamento/cenarios (07) primeiro
     -> bom pra venda, mas nao e o nucleo clinico-juridico.
```

PREMISSA ASSUMIDA: default = A (operar o RAS juridico real antes de tudo).

---

## 7. CHECKLIST PRO DR. CLAUDE (responda em RESPOSTA_DR_CLAUDE_NN)

```
  [ ] 1. casamento via->consentimento esta correto/completo? (faltou alguma via?)
  [ ] 2. os 4 blocos juridicos fixos batem com o contrato real do motor?
  [ ] 3. fail-closed esta na granularidade certa (por via)?
  [ ] 4. a ROTA A (secao 6) e a mais rapida pra operar, ou troca?
  [ ] 5. algum risco clinico/juridico/financeiro que eu nao vi?
```

RESUMO EM 1 LINHA: motor juridico 100% e cockpit casando ativo->consentimento com
fail-closed estao prontos pra validacao; falta o Dr. Claude confirmar o casamento e
aprovar a rota A pra virar emissao de RAS real.
