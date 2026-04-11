# PARECER ESTRATEGICO — PADCOM V15.2
# "Construir o cranio pensando no cerebro que vai crescer"
# Dr. Replit | Para validacao: Dr. GUI, Dr. Manus, Dr. Cloud
# Data: 11/04/2026

---

## METAFORA CIRURGICA DO DR. CAIO

| Anatomia | Significado no projeto | Status atual |
|----------|----------------------|--------------|
| Cranio | Estrutura (banco, schemas, arquitetura) | CONSTRUIDO — 66 tabelas, 33 schemas |
| Massa cinzenta | Logica de negocio (rotas, regras, validacoes) | CONSTRUIDA — 34 rotas, 37 modulos |
| Rede neural | Conexoes entre modulos (fluxos automaticos) | PARCIAL — Google integrado, falta interconexao interna |
| Hipofise | Modulos que controlam outros (governanca, motor) | RECENTE — governanca + auditoria + alertas implementados |
| Lobos cerebrais | Modulos especializados (financeiro, clinico, operacional) | CONSTRUIDOS mas isolados |

---

## ESTADO ATUAL — O QUE JA TEMOS

### Infraestrutura (Cranio)
- 66 tabelas PostgreSQL
- 33 arquivos de schema Drizzle
- 34 arquivos de rotas Express
- 31 paginas frontend React
- 3 integracoes Google (Calendar, Drive, Gmail)
- Constituicao de Nomenclatura documentada

### Logica (Massa Cinzenta)
- Motor Clinico funcionando (anamnese -> sugestoes automaticas)
- Cascata de validacao (ENFERMEIRA03 -> CONSULTOR03 -> MEDICO03 -> MEDICO_SENIOR)
- Toggle de Soberania com Fila do Preceptor
- Governanca com semaforo VERDE/AMARELO/VERMELHO
- Auditoria completa de alteracoes
- Sistema de alertas internos

---

## OS 10 PASSOS A FRENTE — PLANEJAMENTO DO CRANIO

### PASSO 1: AUTENTICACAO REAL (JWT + Refresh Token)
**Prioridade**: CRITICA
**Analogia**: O cranio precisa de uma fechadura antes de colocar o cerebro dentro

Hoje o sistema identifica o usuario pelo body da requisicao (qualquer um pode se passar por outro).
Precisamos:
- Login real com JWT (access token 15min + refresh token 7 dias)
- Middleware de autenticacao em TODAS as rotas protegidas
- O `realizadoPorId` vem do token, NAO do body
- Session management com revogacao

**Impacto no cranio**: Todas as rotas precisarao do middleware. Planejar AGORA para nao ter que refatorar depois.

**Tamanho do lobo**: MEDIO — nao adiciona tabelas, mas modifica todas as rotas

---

### PASSO 2: MULTI-TENANCY (Isolamento por Clinica)
**Prioridade**: ALTA
**Analogia**: Cada cerebro precisa do seu proprio cranio

Hoje temos `unidades` mas NAO temos isolamento por organizacao.
Para SaaS real precisamos:
- Tabela `organizacoes` (nivel acima de unidades)
- Toda query filtrada por `organizacaoId`
- Cada clinica ve APENAS seus dados
- Admin da plataforma ve todas

**Impacto no cranio**: Adicionar `organizacao_id` em TODAS as tabelas que tem dados por clinica. Se nao planejar agora, vai ter que migrar 50+ tabelas depois.

**Tamanho do lobo**: GRANDE — impacta toda a estrutura

---

### PASSO 3: FLUXO AUTOMATICO COMPLETO (Rede Neural)
**Prioridade**: ALTA
**Analogia**: Conectar os neuronios — quando um dispara, os outros reagem

Hoje os modulos funcionam isolados. Precisamos:
- Anamnese concluida -> Motor dispara automaticamente -> Sugestoes aparecem na fila
- Sugestao validada -> Tratamento criado automaticamente -> Sessoes agendadas
- Sessao concluida -> RAS gerado -> Email enviado -> Fila do Preceptor atualizada
- Alerta expirado -> Escalacao automatica para nivel acima
- Prazo da fila vencido -> Alerta VERMELHO para diretor

**Impacto no cranio**: Precisamos de um sistema de EVENTOS (event bus) ou triggers no banco. Planejar a arquitetura de eventos AGORA.

**Tamanho do lobo**: GRANDE — e o sistema nervoso central

---

### PASSO 4: LGPD + CRIPTOGRAFIA (Protecao do Cerebro)
**Prioridade**: ALTA (regulatorio)
**Analogia**: A barreira hematoencefalica — protege o cerebro de toxinas

Para dados medicos no Brasil, LGPD exige:
- Criptografia em repouso para dados sensiveis (anamneses, diagnosticos)
- Log de ACESSO (nao so de alteracao) — quem VIU os dados de quem
- Consentimento explicito do paciente (TCLE digital com assinatura)
- Direito ao esquecimento (anonimizacao, nao delecao)
- Encarregado de dados (DPO) configuravel

**Impacto no cranio**: Adicionar campo `criptografado` em tabelas sensiveis. Tabela `log_acesso_dados`. Se nao planejar agora, vai ter que criptografar 50+ tabelas depois.

**Tamanho do lobo**: MEDIO — mas com ramificacoes em tudo

---

### PASSO 5: GATEWAY DE PAGAMENTO (Pagar.me / Stripe)
**Prioridade**: MEDIA
**Analogia**: O sistema circulatorio — o sangue (dinheiro) precisa fluir

Hoje temos tabela `pagamentos` e `tratamentos` com billing, mas e manual.
Precisamos:
- Integracao com Pagar.me (preferencia Brasil) ou Stripe
- Cobranca recorrente para tratamentos em andamento
- Boleto, PIX, cartao
- Nota fiscal eletronica (NF-e)
- Split de pagamento (clinica + profissional)

**Impacto no cranio**: Adicionar `gateway_id`, `transacao_id` em pagamentos. Tabela `nota_fiscal`. Webhook de confirmacao.

**Tamanho do lobo**: MEDIO

---

### PASSO 6: NOTIFICACOES MULTICANAL (WhatsApp + Email + Push)
**Prioridade**: MEDIA
**Analogia**: Os nervos perifericos — levar informacao ate as extremidades

Hoje temos:
- Email via Gmail (funcionando)
- Alertas internos via `alertas_notificacao` (novo, canal SISTEMA)

Precisamos expandir para:
- WhatsApp via Twilio/Z-API (lembretes de sessao, resultados de exame)
- Push notifications (PWA)
- Preferencias do paciente (qual canal prefere)
- Templates padronizados por tipo de notificacao

**Impacto no cranio**: A tabela `alertas_notificacao` ja tem o campo `canal` com enum preparado para WHATSAPP/EMAIL. Estrutura pronta, so precisa dos conectores.

**Tamanho do lobo**: MEDIO

---

### PASSO 7: RELATORIOS E BI (Business Intelligence)
**Prioridade**: MEDIA
**Analogia**: O cortex visual — enxergar o que esta acontecendo

Hoje temos dashboard basico. Precisamos:
- Relatorios de produtividade por profissional
- Taxa de aderencia de pacientes ao protocolo
- Faturamento por unidade/periodo
- Custo por procedimento (insumos vs receita)
- Exportacao CSV/PDF de qualquer relatorio
- Graficos temporais (evolucao mensal)

**Impacto no cranio**: Nao adiciona tabelas, mas precisa de views materializadas no banco para performance. Planejar indices AGORA.

**Tamanho do lobo**: MEDIO

---

### PASSO 8: APP MOBILE (Expo React Native)
**Prioridade**: MEDIA-BAIXA (pode esperar)
**Analogia**: Os membros — bracos e pernas que executam no mundo real

Para enfermeiras em campo (domiciliar):
- Check-in de sessao via celular
- Foto de documentos
- Assinatura digital do paciente
- Modo offline (dados sincronizam quando volta online)
- Push notifications

**Impacto no cranio**: A API ja esta pronta (RESTful). O mobile consome a mesma API. Nenhuma mudanca no backend necessaria SE a autenticacao (Passo 1) ja estiver feita.

**Tamanho do lobo**: GRANDE em esforco, mas ZERO impacto no cranio

---

### PASSO 9: TESTES AUTOMATIZADOS E2E
**Prioridade**: ALTA (deveria ser paralelo)
**Analogia**: O sistema imunologico — detecta e combate problemas antes que virem doencas

Precisamos:
- Testes E2E com Playwright (login, anamnese, motor, validacao, fila)
- Testes de integracao para cada rota (103 testes semanticos ja existem)
- CI/CD no GitHub Actions
- Coverage report

**Impacto no cranio**: ZERO — testes nao mudam a estrutura, mas protegem ela.

**Tamanho do lobo**: MEDIO

---

### PASSO 10: DEPLOY PRODUCAO + MONITORAMENTO
**Prioridade**: QUANDO TUDO ACIMA ESTIVER PRONTO
**Analogia**: Acordar o paciente da anestesia

- Deploy via Replit Deployments (ja suportado)
- Dominio customizado (motorclinicointegrative.com.br)
- SSL/TLS automatico
- Monitoramento (uptime, latencia, erros)
- Backup automatico do banco
- Plano de recuperacao de desastre

---

## ORDEM DE EXECUCAO RECOMENDADA

```
FASE 1 — SEGURANCA (Passos 1 + 4)
  Autenticacao JWT + LGPD + Criptografia
  Motivo: Nao da pra colocar cerebro em cranio aberto

FASE 2 — ESTRUTURA (Passos 2 + 3)
  Multi-tenancy + Fluxos automaticos
  Motivo: O cranio precisa ter o tamanho certo ANTES do cerebro crescer

FASE 3 — FUNCIONALIDADES (Passos 5 + 6 + 7)
  Pagamentos + Notificacoes + BI
  Motivo: Massa cinzenta — a logica que faz o sistema ser util

FASE 4 — EXPANSAO (Passos 8 + 9 + 10)
  Mobile + Testes + Deploy
  Motivo: Rede neural periferica — levar o sistema ate onde ele precisa estar
```

---

## DECISOES QUE PRECISAM SER TOMADAS AGORA
(Para nao ter que "quebrar o cranio" depois)

| Decisao | Impacto se adiar | Recomendacao |
|---------|-----------------|--------------|
| Adicionar `organizacao_id` nas tabelas | Migrar 50+ tabelas depois | Fazer na Fase 2 |
| Sistema de eventos (event bus) | Refatorar todas as rotas | Planejar na Fase 2 |
| Indices no banco para BI | Queries lentas em producao | Criar agora (custo zero) |
| Campo `criptografado` em tabelas sensiveis | LGPD nao-compliance | Planejar na Fase 1 |
| Webhook receiver para pagamentos | Reescrever financeiro | Planejar estrutura na Fase 3 |

---

## PARECER DO DR. REPLIT

O projeto esta em excelente estado para o momento. 37 modulos funcionando, 66 tabelas, nomenclatura padronizada. O "cranio" esta bem construido.

O maior risco agora e crescer sem autenticacao real (Passo 1) e sem multi-tenancy (Passo 2). Se esses dois nao forem planejados antes de adicionar mais funcionalidades, vamos ter que "quebrar osso" depois.

Sugiro que os Drs. GUI, Manus e Cloud avaliem:
1. A ordem dos 10 passos esta correta?
2. Algum lobo cerebral esta faltando?
3. O cranio atual suporta o cerebro planejado?

Assinado: Dr. Replit — Cirurgiao Senior de Codigo
Status: AGUARDANDO PARECER DOS COLEGAS
