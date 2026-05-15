# 07 — Estado Atual + Opções de Hospedagem (15/mai/2026)

> **Para o Dr. Claude (orquestrador)**
> Documento de situação executiva pro CEO Caio decidir caminho de
> hospedagem. Escrito pelo Dr. Replit em 15/mai/2026 ~01:45 BRT.
> Caio precisou pausar a sangria de créditos Replit (~R$ 2.451 acumulados)
> e cancelou 172+ tasks paralelas. Esta é a fotografia honesta do "onde
> estamos agora" + "pra onde podemos ir".

---

## 1. 🚨 Bloqueador #1 — Deploy Replit SUSPENSO

### Sintoma
```
GET https://webhooks.pawards.com.br/api/healthz
→ HTTP 404 (Replit Deployments retornando "deployment not found")
```

Aviso na aba `Publish` do workspace:
> *"Your deployment was suspended due to a billing failure. You can
> resume your deployment to make it available once again. If no action
> is taken your deployment will be deleted 30 days after the date it
> was suspended."*

**Status: `CAIO suspended`**

### Impacto operacional
- Pacientes/médicos abrindo o link público: erro
- Webhook ZapSign continua sendo emitido pelo provedor → cai no vazio
  (a worker `webhookAssinaturaSilencio` da Wave V256 vai disparar alerta
  CEO em 24h via fila `assinatura_notificacoes` — defesa funcionando)
- Toda fila de notificações WhatsApp/Email/Telegram **acumula** em
  `assinatura_notificacoes` aguardando processamento (não se perde)
- 30 dias de janela antes de deleção destrutiva

### Ação obrigatória do CEO
Resolver billing direto com Replit: **support@replit.com** ou painel
**replit.com/account/billing**. O Dr. Replit foi orientado a NÃO opinar
em cobrança/preço/refund.

---

## 2. 🟢 O que está SAUDÁVEL hoje

### Desenvolvimento (workspace `Integrative-Health-Engine`)
- API Server: rodando, `/api/healthz` HTTP 200
- Frontend Motor Clínico: rodando
- Mockup sandbox: rodando
- PostgreSQL: 4.278 pacientes Pádua (Wave Cadastro), 8.728 receitas-potencial
  (NUNCA citar como receita real — é projeção de fichas históricas migradas)

### Canais de notificação CEO
- **Telegram**: 100% funcional (`@Paduaclinica_bot`, chat_id=8911159822)
  — pode ser usado HOJE como canal único enquanto WhatsApp não fecha
- **WhatsApp Twilio Sandbox**: credenciais cifradas em
  `whatsapp_config` (id=4, número remetente `+14155238886`); falta:
  - CEO cadastrar telefone em `usuarios.telefone` (campo vazio hoje em id=1)
  - CEO mandar `join contain-stronger` do celular pro sandbox Twilio
- **Email Gmail API**: integração ativa, funciona
- **WhatsApp produção (HSM Meta-aprovado)**: NÃO existe ainda — precisa
  registro Meta Business + número dedicado + aprovação de templates HSM

### Wave 10 ZapSign (ICP-Brasil) — entregue
- 8.728 receitas históricas com manifesto SHA-256 auditável
- Webhook bidirecional ZapSign instalado
- Assinatura digital ICP-Brasil end-to-end
- Cães-de-guarda: V232 (retenção auditoria), V256 (silêncio webhook),
  Task #251 (upload preso), Task #252 (silêncio worker)

### Wave 13 F1 — RBAC + 2FA
- Migration 044 RBAC fundacional
- Kill-Switch global
- 2FA TOTP foundation (CEO promovido `platform_owner`)
- Naming respeita regra ferro: `perfil` (nunca `papel`/`role`)

---

## 3. 🟡 Dificuldades / Bloqueadores ATUAIS pra publicação

### Bloqueador A — Custo Replit Deployments
Replit cobra deployments por:
- vCPU/RAM alocados (auto-scale 2vCPU / 4 GiB / 3 max instâncias hoje)
- horas-instância
- transferência de dados
- storage do PostgreSQL

Pra um sistema clínico multi-tenant em produção 24/7, isso somou ~R$ 2.451
no período recente — caixa que o Caio não tem hoje (clínica sem receita
emitida pelo sistema ainda).

### Bloqueador B — Acoplamento ao Replit
Vários componentes assumem ambiente Replit:
- `$REPLIT_DEV_DOMAIN` em URLs
- Workflows do Replit pra orquestrar serviços
- Replit Deployments pra build/deploy
- Replit Object Storage (algumas partes)
- Replit Integrations (Google Drive/Calendar/Mail) — usam Connectors do Replit

Migrar pra outro provedor exige refatoração desses pontos. **NÃO é
trivial**, mas também NÃO é catastrófico — é trabalho de 1-2 semanas
focado.

### Bloqueador C — Dependências externas com custo recorrente
Independente de onde hospedar, o sistema precisa:
- ZapSign (assinatura ICP-Brasil) — paga por documento assinado
- Twilio + WhatsApp HSM Meta-aprovado (futuro) — paga por mensagem
- Google Workspace APIs (Drive/Calendar/Mail) — quotas grátis suficientes hoje
- Domínio `pawards.com.br` — ~R$ 40/ano Registro.br (já pago)

### Bloqueador D — Banco de dados separado
Hoje o PostgreSQL está acoplado ao Replit (managed). Migrar significa:
1. Subir um Postgres em provedor escolhido
2. `pg_dump` do Replit + `pg_restore` no destino
3. Atualizar `DATABASE_URL` em produção
4. Trocar Replit Object Storage por S3/R2/equivalente

---

## 4. 🌍 Opções de Hospedagem — comparativo executivo

> **Aviso**: Dr. Replit NÃO opina em preço (preços mudam, cada conta
> tem situação). Os valores abaixo são **ordens de grandeza públicas**
> de mai/2026 pra um sistema com perfil deste (~2vCPU, 4GB RAM,
> Postgres ~5GB, tráfego baixo-médio). **Confirme no site do provedor
> antes de decidir.**

### Tier 1 — PaaS modernos (mais fáceis de migrar)

| Provedor | Vantagem principal | Desvantagem | Faixa USD/mês |
|---|---|---|---|
| **Railway.app** | Deploy automático via GitHub, Postgres incluso, dashboard simples, suporte BR-friendly | Sem datacenter BR (latência ~150ms US-East) | $20-80 |
| **Render.com** | Free tier generoso, blueprints multi-serviço | Cold start no free, sem BR | $25-100 |
| **Fly.io** | Datacenter em **GRU (São Paulo)** ✅ baixa latência, deploy via Docker | Curva mais técnica, sem dashboard amigável | $30-90 |
| **DigitalOcean App Platform** | Marca conhecida, Postgres managed | Sem BR | $25-80 |

**Recomendação Dr. Replit**: **Fly.io** pelo datacenter São Paulo —
clínica com pacientes BR sente diferença em latência de PDF, agenda
e assinatura digital.

### Tier 2 — VPS tradicional (mais barato, mais trabalho)

| Provedor | Vantagem | Desvantagem | Faixa BRL/mês |
|---|---|---|---|
| **Hostinger VPS BR** | Datacenter SP, suporte PT-BR, painel simples | Você gerencia tudo (Nginx, SSL, backup, segurança) | R$ 50-200 |
| **HostGator BR** | Idem | Idem + reputação mista | R$ 80-300 |
| **KingHost BR** | Suporte humano BR, Postgres managed disponível | Painel datado | R$ 100-400 |
| **Locaweb** | Marca BR estabelecida | Caro pra performance entregue | R$ 200-600 |
| **DigitalOcean Droplet** | Documentação excelente, comunidade enorme | Inglês, sem BR direto | $20-60 |
| **Hetzner Cloud** (Alemanha) | **Custo-benefício imbatível**, hardware top | Latência ~200ms BR, alemão/inglês | €5-30 |

**Recomendação Dr. Replit pra economia máxima**: Hetzner CX22 (~€7/mês,
2vCPU/4GB/40GB SSD) + Postgres self-hosted no mesmo VPS. Trade-off:
você ou um sysadmin assume a responsabilidade de manter o servidor.

### Tier 3 — Hyperscalers (overkill agora, opção futura)

| Provedor | Quando faz sentido | Custo realista |
|---|---|---|
| **AWS** (EC2 + RDS) | >50 clínicas, multi-região, compliance HIPAA-like rigoroso | $150-500/mês mínimo |
| **GCP** (Cloud Run + Cloud SQL) | Quer pay-per-request, escala 0→1000 sem ajuste | $80-300/mês |
| **Azure** | Empresa cliente exige Azure ou tem créditos enterprise | $150-500/mês |

**Recomendação Dr. Replit**: hyperscaler **NÃO faz sentido hoje** pro
Pawards. Sub-otimiza custo e adiciona complexidade desnecessária pra
1 clínica em operação.

### Tier 4 — Híbridos / específicos

| Opção | Quando faz sentido |
|---|---|
| **Vercel** (frontend) + **Supabase** (Postgres) + **Render** (API) | Quer separar camadas, frontend estático grátis |
| **Cloudflare Workers + D1 + R2** | Quer edge computing, latência mínima global |
| **Cloud Brasileira com BPO** (BluePex, Wirelink) | Quer suporte humano BR + LGPD certificado + você paga prêmio |

---

## 5. 🎯 Recomendação consolidada (Dr. Replit ao Dr. Claude)

### Caminho A — Continuar no Replit (menor mudança)
1. Caio resolve billing com `support@replit.com`
2. Reativa deploy
3. Sistema volta ao ar em horas
4. **Risco**: mesmo problema de custo daqui a 3-6 meses se a clínica não
   monetizar via sistema

### Caminho B — Migrar pra Fly.io (latência BR, custo médio)
1. Setup conta Fly.io + datacenter GRU
2. Containerizar API server (Dockerfile já viável, Express puro)
3. Migrar Postgres pra Fly Postgres ou Neon (managed serverless)
4. Trocar Object Storage por S3-compatible (Cloudflare R2)
5. Apontar DNS `webhooks.pawards.com.br` pro Fly
6. **Custo estimado**: $30-50/mês após migração
7. **Esforço**: 1-2 semanas focadas (Dr. Replit sozinho consegue, sem agentes paralelos)

### Caminho C — Hetzner + self-hosted (mais barato, mais responsabilidade)
1. VPS Hetzner CX22 (~€7/mês)
2. Docker Compose com API + Postgres + Nginx + Certbot
3. Backup automático S3-compatível (Backblaze B2 ~$1/mês)
4. Apontar DNS Cloudflare grátis (proxy + WAF)
5. **Custo total estimado**: ~R$ 60/mês (Hetzner + backup + Cloudflare grátis)
6. **Esforço**: 2-3 semanas + necessidade de sysadmin part-time pra
   manutenção (security patches, upgrades, backup verification)

### Caminho D — Modo "fechado pra balanço"
1. Pausar produção temporariamente
2. Manter só desenvolvimento local rodando
3. Continuar evolução do código (Wave 13 F2/F3, polish, etc.)
4. **Republicar quando**: clínica tiver caixa OU tiver primeiro contrato
   pago do sistema fechado
5. **Custo**: ~R$ 0/mês (dev local em workspace Replit grátis)

---

## 6. 🔗 URLs raw GitHub atualizadas (branch `feat/dominio-pawards`)

> **Atenção**: o último commit (`886d942 Add images to documentation
> for Replit deployment and Twilio integration`) ainda está local —
> precisa um `git push` pra origin pra Dr. Claude conseguir ler via raw.
> Próximo push exporta TUDO incluindo este documento `07_*`.

### Documentos chave Dr. Claude (após push)
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/README.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/01_DECISOES_TOMADAS_WAVE10_F3C.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/03_ARQUITETURA_GERAL_DO_CODIGO.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/04_BLUEPRINT_WAVE10_FASE_B_DIA1.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/05_BRIEFING_PLANILHA_SANDBOX_PACIENTE.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/06_WAVE13_F1_FOUNDATION_RBAC_2FA.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/07_ESTADO_ATUAL_E_OPCOES_HOSPEDAGEM.md
```

### Histórico arquivado
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/historico-waves-5-a-8.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/historico-waves-9-e-anteriores.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/historico-wave-10-jwt-pagamentos-ondas-6x-7x.md
```

### `replit.md` (overview projeto, fonte canônica)
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/replit.md
```

### Browse direto via GitHub (com syntax highlight pra código)
```
https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards
https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/artifacts/api-server/src
https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/artifacts/api-server/src/db/migrations
https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/artifacts/clinica-motor/src/pages
```

---

## 7. ❓ Pergunta direta ao Dr. Claude

Caio precisa decidir entre os 4 caminhos da seção 5. Como
orquestrador-consultor com visão das 4 personas dele
(🩺 médico / 💰 CEO / 📈 empresário / 🛡️ investidor),
qual caminho você recomenda **considerando**:

1. Caixa atual da clínica (sem receita emitida pelo sistema ainda)
2. Pressão temporal (deploy deletado em 30 dias se nada for feito)
3. Aversão dele a sysadmin/devops (não tem equipe técnica além do Dr. Replit)
4. Necessidade de continuar evoluindo o código (Wave 13 F2/F3 pendente)
5. Risco de migração quebrar invariantes da Wave 10 (8.728 receitas-potencial,
   manifesto SHA-256, webhook ZapSign)

**Resposta esperada**: 1 caminho escolhido + justificativa em 3 linhas
+ próximos 3 passos concretos pro Dr. Replit executar.

---

*Última atualização: 2026-05-15 ~01:45 BRT por Dr. Replit (main agent
em Build mode após cancelamento de tasks paralelas pra economia).*
