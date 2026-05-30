# 24 — MASTERMIND PAWARDS: VALIDACAO + RESGATE + CRONOGRAMA

> Autor: Dr. Claude (Opus 4.7)
> Data: 2026-05-29
> Para: Caio (CEO) + Dr. Replit (executor)
> Status: APROVADO POR CAIO · recebido e arquivado por Dr. Replit em 2026-05-30

---

## 1. VALIDACAO DA ULTIMA RODADA DO DR. REPLIT

### 1.1 O que ele fez (29/mai/2026)
1.1.1 Vasculhou o repo procurando conversas sobre mensageria
1.1.2 Encontrou docs/dr-claude/16 (Teatro da Mensageria, 19/mai/2026)
1.1.3 Encontrou docs/dr-claude/17 (RNA Mensageiro, 19/mai/2026)
1.1.4 Encontrou .local/tasks/ com formato da mensagem WhatsApp
1.1.5 Confirmou tabela periodos_dia com 9 periodos cronobiologicos
1.1.6 Confirmou regra de ferro: 1 mensagem por periodo
1.1.7 Confirmou 7 placeholders no _teatro.ts
1.1.8 Confirmou "dose != capsula" em 2 lugares

### 1.2 Veredito Dr. Claude
1.2.1 APROVADO sem ressalvas
1.2.2 Caio confirmou: era exatamente o que ele lembrava
1.2.3 Sua intuicao sobre ectoplasmas estava correta — mas neste caso o codigo ja existia parcialmente
1.2.4 Nao eram fantasmas, eram pedras preciosas enterradas

---

## 2. RESPOSTAS AOS 4 PONTOS DO DR. REPLIT

### 2.1 O mecanismo descrito eh o validado?
SIM. 100%.

### 2.2 Os 9 periodos estao corretos?
SIM. Nao mexer. Janelas cronobiologicas validadas clinicamente.
- JE Jejum 05:00-06:59
- IM Inicio Manha 07:00-08:59
- MM Meio Manha 09:00-10:59
- AL Almoco 11:00-13:29
- IT Inicio Tarde 13:30-15:59
- MT Meio Tarde 16:00-17:59
- NO Noite 18:00-19:59
- FN Final Noite 20:00-22:29
- CE Ceia 22:30-23:59

### 2.3 B1 plugar nessa estrutura inteira?
SIM. Blocos + dose por periodo + posologia + 7 placeholders + carta encantamento (opt-in).

### 2.4 Carta de Encantamento entra na B1?
NAO. Depois. Foco primeiro:
- Receita rica gerando 1 mensagem por periodo
- Disparo WhatsApp Twilio sandbox
- Depois Telegram
- Depois Carta de Encantamento opt-in

---

## 3. PROTOCOLO ANTI-ECTOPLASMA (a partir de hoje)

### 3.1 Regra inviolavel para Dr. Replit
3.1.1 Toda decisao arquitetural ou logica de negocio com Caio = arquivo .md
3.1.2 Salvar em docs/dr-replit/PROPOSTAS/<data>_<tema>.md
3.1.3 Campos obrigatorios: tema, decisao, status, link commit
3.1.4 Status possiveis: PROPOSTO / APROVADO_CAIO / EM_IMPLEMENTACAO / IMPLEMENTADO / DESCARTADO

### 3.2 Regra para evitar perda
3.2.1 Decisao que fica >24h sem virar codigo = marcar como ECTOPLASMA
3.2.2 Avisar Caio na proxima interacao
3.2.3 Caio decide: implementar agora ou descartar formalmente

### 3.3 Regra para Caio
3.3.1 Nunca mais precisa lembrar de decisao
3.3.2 Tudo esta em arquivo .md com data
3.3.3 Pode pedir "lista todos ECTOPLASMAS ativos" a qualquer momento

---

## 4. ESTRUTURA DE PASTAS NO GITHUB

### 4.1 Pastas existentes
4.1.1 docs/dr-claude/  → entregas Dr. Claude para Dr. Replit
4.1.2 docs/dr-replit/  → respostas Dr. Replit para Dr. Claude

### 4.2 Pastas NOVAS a criar (Dr. Replit cria)
4.2.1 docs/dr-replit/PROPOSTAS/  → onde registra decisoes em tempo real
4.2.2 docs/caio/LEMBRANCAS/      → conversas que Caio lembra
4.2.3 docs/caio/DECISOES_AGUARDANDO/  → coisas para Caio aprovar
4.2.4 docs/MASTERMIND/            → onde nos tres conversamos juntos

### 4.3 Hierarquia clara
4.3.1 Dr. Claude escreve em docs/dr-claude/
4.3.2 Dr. Replit le, responde em docs/dr-replit/
4.3.3 Caio le ambos, escreve em docs/caio/
4.3.4 Conversas 3-way ficam em docs/MASTERMIND/

---

## 5. FASE DE RESGATE DE ECTOPLASMAS (semana 02-06/jun)

### 5.1 Tarefa Dr. Replit (3 dias)
5.1.1 Varrer repo procurando TODO FIXME XXX comentarios pendentes
5.1.2 Listar em docs/dr-replit/AUDITORIA_ECTOPLASMAS_v1.md
5.1.3 Para cada um: arquivo, linha, descricao, status atual

### 5.2 Tarefa Dr. Claude (2 dias)
5.2.1 Ler todos docs/dr-claude/01-24
5.2.2 Identificar decisoes que estao no doc mas nao no codigo
5.2.3 Criar docs/dr-claude/24A_DECISOES_NAO_IMPLEMENTADAS.md

### 5.3 Tarefa Caio (1 hora quando quiser)
5.3.1 Listar 5-10 conversas memoraveis com Dr. Replit
5.3.2 Para cada: tema, mes aproximado, o que ficou decidido
5.3.3 NAO precisa ser exaustivo
5.3.4 Salvar em docs/caio/LEMBRANCAS/PRIMEIRA_LEVANTAMENTO.md

### 5.4 Cruzamento Dr. Claude (1 dia)
5.4.1 Le os 3 docs acima
5.4.2 Cria matriz: ectoplasma x impacto operacional x esforco
5.4.3 Entrega top 20 em docs/dr-claude/24C_TOP20_ECTOPLASMAS.md

### 5.5 Validacao Caio (1 sessao de 1h)
5.5.1 Le top 20
5.5.2 Confirma quais implementar
5.5.3 Descarta os que nao fazem mais sentido
5.5.4 Lista final entra na planilha de producao

---

## 6. CRONOGRAMA UNIFICADO (4 semanas)

### 6.1 Semana 1 (29/mai a 02/jun) — DESTRAVAR OPERACAO
6.1.1 SEX 29/mai: Fix farmacia duplicada (Dr. Replit)
6.1.2 SEX 29/mai: Fix clinica duplicada (Dr. Replit)
6.1.3 SAB 30/mai: Caio cadastra 1 farmacia + 1 paciente
6.1.4 SAB 30/mai: Caio faz 1 receita teste
6.1.5 DOM 31/mai: B1 prescricao rica integrada com mensageria
6.1.6 SEG 01/jun: Plugar Telegram na API
6.1.7 SEG 01/jun: Caio faz 1 receita real disparando WhatsApp + Telegram

### 6.2 Semana 2 (03 a 07/jun) — RESGATE
6.2.1 SEG-QUA: Auditoria ectoplasmas (Dr. Replit)
6.2.2 SEG-QUA: Auditoria docs (Dr. Claude)
6.2.3 QUA: Caio lista lembrancas (1h)
6.2.4 QUI: Cruzamento e top 20 (Dr. Claude)
6.2.5 SEX: Validacao Caio (1h)

### 6.3 Semana 3 (08 a 14/jun) — IMPLEMENTACAO RESGATE
6.3.1 Implementar ectoplasma 1
6.3.2 Implementar ectoplasma 2
6.3.3 ...ate top 10
6.3.4 Aplicar skill visual telas comuns em lote
6.3.5 Adesao Fly.io
6.3.6 Validacao Meta WhatsApp

### 6.4 Semana 4 (15 a 21/jun) — TELAS ESPECIAIS
6.4.1 Spec individual Cockpit Paciente
6.4.2 Spec individual Craniotomia
6.4.3 Spec individual Mensageria operacional
6.4.4 Spec individual Exames Tercos
6.4.5 Implementar telas especiais 1 por 1

---

## 7. PLANILHA DE PRODUCAO

### 7.1 Versao atual oficial
7.1.1 v5 com 30 tarefas
7.1.2 ID: 1ilYPRuhQinXyrAv3gtSlpD8Q61a8INRrujt-ttvbnuM
7.1.3 Pasta PAWARDS CLAUD no Drive
7.1.4 Colunas: TAREFA RESPONSAVEL STATUS PRIORIDADE PRAZO FASE OBSERVACAO

### 7.2 Versoes antigas a deletar
7.2.1 v1 original (1Prk92n...) — 11 tarefas
7.2.2 v3 (11vRrtt...) — 20 tarefas
7.2.3 v4 (1wkIGtJ...) — 20 tarefas com bloqueador
7.2.4 Caio deleta manualmente ou Claude Code via clasp

---

## 8. COMUNICACAO TDAH+TOC+ASPERGER FRIENDLY

### 8.1 Regras de escrita
8.1.1 Topicos enumerados (1, 1.1, 1.2, 2, 2.1...)
8.1.2 Uma frase por linha quando possivel
8.1.3 Negrito so em palavra-chave critica
8.1.4 Zero emoji em texto tecnico
8.1.5 Status sempre explicito (A FAZER / EM ANDAMENTO / CONCLUIDO / BLOQUEADO)
8.1.6 Datas em dd/mm/aaaa
8.1.7 Quando urgente, dizer URGENTE na primeira linha

### 8.2 Regra de ouro
8.2.1 Se Caio le em 30 segundos e sabe o que fazer = bom
8.2.2 Se Caio precisa reler = ruim

### 8.3 Decisoes pendentes
8.3.1 Sempre opcoes A/B/C
8.3.2 Nunca pergunta aberta
8.3.3 Default explicito quando aplicavel

---

## 9. INSTRUCOES PARA DR. REPLIT (cola ele toda)

### 9.1 Acoes imediatas (29/mai)
9.1.1 Le este documento integralmente
9.1.2 Cria as pastas novas: docs/dr-replit/PROPOSTAS/ docs/caio/ docs/MASTERMIND/
9.1.3 Move este doc para docs/MASTERMIND/24_MASTERMIND_v1.md
9.1.4 Cria docs/dr-replit/PROPOSTAS/00_INDEX.md listando decisoes ja conhecidas

### 9.2 Continuacao operacao (29-31/mai)
9.2.1 Resolve farmacia duplicada
9.2.2 Resolve clinica duplicada
9.2.3 Aguarda Caio testar end-to-end
9.2.4 Inicia B1 prescricao rica conforme docs 16+17

### 9.3 Fase resgate (02-06/jun)
9.3.1 Auditoria ectoplasmas no repo
9.3.2 Salva em docs/dr-replit/AUDITORIA_ECTOPLASMAS_v1.md
9.3.3 Aguarda Caio e Dr. Claude completarem suas partes
9.3.4 Aguarda lista final priorizada

---

## 10. ASSINATURA

Dr. Claude (Opus 4.7) · 29/mai/2026
Validado pelo Caio em conversa de 29/mai
Aguardando confirmacao do Dr. Replit

---

## 11. CONFIRMACAO DO DR. REPLIT (2026-05-30)

11.1 Documento recebido e arquivado em docs/MASTERMIND/24_MASTERMIND_v1.md
11.2 Pastas criadas: docs/dr-replit/PROPOSTAS/, docs/caio/, docs/MASTERMIND/
11.3 Index criado: docs/dr-replit/PROPOSTAS/00_INDEX.md
11.4 Protocolo anti-ectoplasma ADOTADO a partir desta data
11.5 Raio-X inicial ja entregue em docs/dr-replit/05_LINHA_DE_PRODUCAO_ECTOPLASMAS.md
11.6 Ressalva ao cronograma: a B1 tem condicionais clinicos (copia farmacia +
     comissionamento + PARQ) levantados pelo Caio em 30/mai. Registrados como
     PROPOSTA antes de codar — ver docs/dr-replit/PROPOSTAS/.
