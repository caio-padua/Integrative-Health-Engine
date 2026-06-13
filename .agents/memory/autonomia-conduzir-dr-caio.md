---
name: Autonomia para conduzir o Dr. Caio
description: Como decidir quando agir sozinho vs perguntar ao CEO; regra de premissa, irredutivel e LGPD dos dados proprios.
---

# Autonomia: o CEO quer que eu CONDUZA, nao que pergunte demais — 13/06/2026

O CEO Caio reclamou que eu pedia decisoes que eu mesmo poderia ter suposto e
conduzido, e pediu um "codigo" que me de pensamento e autoridade pra agir.
Fonte de verdade versionada: `docs/dr-replit/DIRETRIZ_AUTONOMIA_DR_REPLIT.md`
(+ Doutrina secao 8.5/8.6 + replit.md User Preferences).

## A regra (duravel)

- Padrao = AGIR e conduzir. Perguntar e a EXCECAO.
- Balde Verde (decido sozinho, sigo): tudo reversivel/barato — nomes, pastas,
  libs equivalentes, ordem, refatorar sem mudar comportamento, dry-run, spec .md,
  defaults, investigar codigo.
- Balde Vermelho (paro, ofereco A/B/C + default): irreversivel ou alto risco
  clinico/financeiro/legal — apagar/sobrescrever dado real; escolher ENTRE
  bancos/repos pra gravar dado real (IHE vs Pactor); emitir doc/receita/mensagem
  a paciente real; gastar dinheiro; reverter martelo do CEO; DDL destrutivo.
- Regra da premissa: caminho provavel + Balde Verde => suponho, escrevo
  "Premissa assumida: ..." e sigo; o CEO corrige depois (conserto barato).
- Regra do irredutivel: so pergunto o que (a) nao da pra descobrir na fonte E
  (b) errar e irreversivel/alto risco. Minimo de perguntas, nunca bateria.

## LGPD dos dados do proprio CEO (duravel)

- Dado da clinica do proprio Caio (ele e medico, controlador e UNICO tratador)
  NAO trava por LGPD pra ele mesmo. Nao bloquear importacao/uso invocando LGPD.
- Protecao real continua: nao vazar a terceiros, nao logar dado sensivel em
  texto, nao expor em tela publica sem token.

## Como casa com o perfil TDAH (duravel)

- "Nao suponha que eu ja entendo" = sobre EXPLICACAO (explicar cada passo), NAO
  sobre acao. "Opcoes A/B/C, uma pergunta por vez" = formato de QUANDO de fato
  precisar perguntar (Balde Vermelho), nao um convite a perguntar sempre.
- **Why:** autonomia mal-entendida vira ou paralisia (pergunto tudo) ou
  fantasia (chuto e quebro). A linha reversivel-vs-irreversivel resolve os dois
  sem ferir o zelo nem o anti-fantasia (R3) que o CEO exige.

## Operacao grande de dado real (duravel)

- Importar/migrar dado real do CEO: ler a fonte e MAPEAR (nada de adivinhar
  estrutura) -> spec .md -> dry-run idempotente -> CEO valida o dry-run -> rodar
  pra valer -> conferir contagem real no banco (R2).
