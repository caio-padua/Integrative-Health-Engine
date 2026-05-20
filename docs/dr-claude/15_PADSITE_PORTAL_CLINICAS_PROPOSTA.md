# 15 — PADSITE: Portal-Porta-de-Entrada das Clínicas como Veia para o Coração PAWARDS

> **Autor:** Dr. Replit, a pedido de Caio (CEO) · **Data:** 2026-05-18
> **Destinatário:** Dr. Claude (orquestração)
> **Tipo:** Proposta estratégico-técnica + modelo comercial · **Status:** rascunho pra revisão antes de virar Wave
> **Pré-requisitos pra leitura:** [`00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md`](./00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md) · [`03_ARQUITETURA_GERAL_DO_CODIGO.md`](./03_ARQUITETURA_GERAL_DO_CODIGO.md)

---

## 0. TL;DR (1 parágrafo)

Caio quer transformar o **portal público da clínica** (ex.: `institutopadua.com.br`) em parte integrada do produto **PAWARDS**, e não num site solto comprado por fora. A clínica **NÃO compra** domínio, hospedagem, e-mail nem CMS — a **PAWARDS compra tudo no nome dela**, monta o portal a partir de um **template institucional repetível**, conecta ao **coração `pawards.com.br`** (motor clínico + RAS + prescrição + ZapSign + PARMAVAULT + agenda) e **cobra um plano mensal recorrente** da clínica. Sem adesão ao plano, o portal não fica de pé. Esta proposta nomeia o módulo, descreve a linha de produção repetível pra eliminar bugs/atrasos do tipo "site único feito do zero", e propõe um modelo comercial em camadas.

---

## 1. Metáfora (do próprio Caio) — fixar a linguagem

```
                ┌─────────────────────────────┐
                │      pawards.com.br         │
                │   ❤️  CORAÇÃO PAWARDS        │
                │  motor clínico · RAS · RACJ │
                │  PARMAVAULT · ZapSign · BI  │
                └──────────────┬──────────────┘
                               │  artérias (dados clínicos saem)
                               │  veias    (leads/agendamentos voltam)
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
 institutopadua.com.br   clinicaXYZ.com.br    consultorioABC.com.br
   🩸 PADSITE Pádua       🩸 PADSITE XYZ        🩸 PADSITE ABC
   (porta de entrada)    (porta de entrada)    (porta de entrada)
```

- **Coração:** `pawards.com.br` — onde mora o motor, o banco, os RAS, o ZapSign, o PARMAVAULT, a agenda, a equipe.
- **Veias e artérias:** cada `PADSITE` instalado pra uma clínica. O paciente entra pelo PADSITE da SUA clínica (`institutopadua.com.br`), agenda, preenche pré-anamnese, paga sinal, assina LGPD, recebe RAS — e tudo isso é **dado que vai para o coração** e volta classificado, prescrito, agendado.

**Não é site institucional vendido como serviço de marketing.** É **órgão do produto PAWARDS** alugado à clínica.

---

## 2. Denominação oficial proposta (anti-confusão)

Pra entrar em **linha de produção repetível** sem cada clínica virar um projeto único cheio de bug, fixo nomes agora:

| Camada | Nome oficial | O que é | Exemplo |
|---|---|---|---|
| **Módulo PAWARDS** | **PADSITE** | Décimo módulo oficial PAWARDS, irmão de MEDCORE/PARMAVAULT/PAREXAM/PAWTRACK/PAWVISION/PAWLEVEL/PADTEAM/PADLEGEX/PARASCLIN | — |
| **Template-mãe** | **PADSITE BASE** | Repositório-template no monorepo. UMA codebase, N instâncias parametrizadas | `artifacts/padsite-base` |
| **Instância clínica** | **PADSITE «slug»** | Provisionamento de uma clínica específica, sempre a partir do template | `padsite-padua`, `padsite-xyz` |
| **Domínio público** | **clinica.com.br** | Comprado pela PAWARDS via registro.br no CNPJ PAWARDS | `institutopadua.com.br` |
| **E-mail institucional** | **Zoho PAWARDS-Managed** | Conta Zoho criada/paga pela PAWARDS, vinculada ao domínio da clínica | `contato@institutopadua.com.br` |
| **Identidade no banco** | `unidades.slug_padsite` | Coluna nova na tabela `unidades` (não substitui nada). Liga PADSITE↔unidade↔coração | `slug_padsite = 'padua'` |
| **Cadastro do paciente entrando pelo PADSITE** | `origem='padsite:<slug>'` | Coluna `origem` já existe em todas as tabelas novas (regra ferro). Permite rastrear qual portal trouxe o paciente | `origem='padsite:padua'` |

**Regra de naming Caio (mantida):**
- ZERO uso de `role`, `papel`, `site`, `tenant`. Sempre `padsite`, `unidade`, `clinica_cliente`.
- Tudo em português, semântico, sem abreviar. `padsite_instancia_provisionamento` ✅, não `psitProv` ❌.
- Prefixos: `pode_*`, `nunca_*`, `requer_*`.

---

## 3. O que a PAWARDS entrega — anatomia da assinatura

Quando uma clínica fecha contrato, a PAWARDS opera **tudo isso no nome dela**, sem a clínica precisar mexer:

### 3.1 Aquisição (PAWARDS faz, clínica só assina)
1. Compra **domínio `.com.br`** no registro.br (titularidade PAWARDS, contrato de uso pra clínica).
2. Compra **plano Zoho Mail** corporativo (caixas `contato@`, `agendamento@`, `medico@`, conforme plano).
3. Configura **DNS** (apontamento pra Replit Deploy + MX Zoho + SPF/DKIM/DMARC).
4. Provisiona **certificado HTTPS** automático.
5. Cria **registro `unidades`** no banco PAWARDS com `slug_padsite` único, `genesis_seed_origem=14` (Instituto Genesis).

### 3.2 Site público da clínica (PADSITE — entrega visual)
Template único parametrizado com:
- Identidade visual da clínica (logo, paleta, fontes — campos editáveis no admin PAWARDS).
- Página inicial institucional, equipe médica (puxando de `usuarios` filtrado pela unidade), serviços oferecidos (puxando dos **módulos contratados**), depoimentos, contato.
- **Agendar consulta** → bate no Agenda Motor (slots transacionais já existem).
- **Área do paciente** → login (CPF + OTP via WhatsApp/SMS, já temos `paciente_otp`), acesso ao Portal do Paciente (já existe), self-reschedule, RAS assinados, exames, recibos.
- **Pré-anamnese online** → grava em `anamneses` com `origem='padsite:<slug>'`, entra na fila de validação médica.
- **Pagamento de sinal/consulta** → adapter de pagamentos (Stripe/Asaas/Mercado Pago) já provisionado, basta ligar.
- **Assinatura LGPD/Termo Terapêutico** → ZapSign ICP-Brasil (já em produção pela Wave 10).

### 3.3 Módulos ATIVÁVEIS (cobrança casada — ver §5)
Cada módulo PAWARDS que a clínica contratar **acende um pedaço do PADSITE**:

| Módulo PAWARDS | O que liga no PADSITE da clínica |
|---|---|
| **MEDCORE** | Pré-anamnese online + portal do paciente + acesso ao prontuário próprio |
| **PAREXAM** | Upload de exames pelo paciente + vitrine de exames com 5 zonas |
| **PARMAVAULT** | Receitas chegam por WhatsApp/e-mail Zoho + rastreio de retirada na farmácia |
| **Motor de Sugestões (fórmulas/injetáveis/implantes)** | Médico vê sugestão no PADCON, paciente vê só a prescrição final no portal |
| **RAS / RACJ** | RAS assinado aparece no portal do paciente + PDF baixável + arquivo no Drive da clínica |
| **PADTEAM** | E-mails do Zoho roteiam pro time da clínica (atendimento, recepção, médico) |
| **PADLEGEX** | Termos versionados aparecem na assinatura digital |
| **PAWTRACK** | Questionário diário disparado por WhatsApp/portal (quando ativarmos de fato) |
| **PAWVISION** | Modo consulta em tela cheia, paciente vê narrativa clínica |
| **PAWLEVEL** | Gamificação (quando existir) — pontuação visível no portal |

**Princípio:** o PADSITE é a **fachada** dos módulos. Sem módulo contratado, a aba/feature **nem aparece** no site.

---

## 4. Linha de produção — como repetir SEM bug

O grande risco do "fazemos o site da clínica" é cair em **projeto único pra cada cliente** (= bug infinito, atraso infinito). A linha de produção evita isso com 3 invariantes:

### 4.1 Invariante #1 — UMA codebase, N instâncias
- `artifacts/padsite-base/` é o **único repositório de código** do PADSITE.
- Toda clínica roda **a mesma versão** do código.
- Diferenças entre clínicas vivem **apenas em dados** (`unidades`, `unidade_branding`, `unidade_modulos_contratados`).
- Atualização do template = atualiza todo mundo numa só vez (deploy único).

### 4.2 Invariante #2 — Provisionamento por playbook automatizado
Wave PADSITE precisa entregar um **comando único** `provisionarPadsite(unidadeId)` que:
1. Cria entrada em `padsite_instancias` com slug, status `provisionando`.
2. Chama API registro.br para checar/comprar domínio (ou registra manualmente se a API exigir — documentar).
3. Configura DNS (Cloudflare ou registro.br) com apontamento pro Deploy.
4. Provisiona caixa Zoho via API Zoho Mail.
5. Cria `unidade_branding` com defaults Instituto Genesis (seed `unidade_id=14`).
6. Marca todos os módulos contratados em `unidade_modulos_contratados`.
7. Gera senha provisória do admin da clínica e manda por e-mail/WhatsApp.
8. Marca `padsite_instancias.status = 'ativo'`.

**Sem playbook automatizado, cada cliente novo vira drama de 2 semanas.** O Instituto Pádua é o piloto: a primeira execução manual vira o roteiro, a segunda execução já é automática.

### 4.3 Invariante #3 — Suspensão imediata por inadimplência
- Coluna `unidade_modulos_contratados.suspenso_em` (NULL = ativo, timestamp = suspenso).
- Job mensal cruza `cobrancas_mensais_modulos` × `pagamentos`. Em atraso > N dias (parâmetro): suspende.
- PADSITE renderiza página "Em manutenção — entre em contato" quando suspenso. **NÃO derruba o domínio nem deleta dados.**

### 4.4 Tabelas novas necessárias (aditivas — regra ferro respeitada)
| Tabela | Propósito | Status hoje |
|---|---|---|
| `padsite_instancias` | 1 linha por clínica com PADSITE provisionado | ❌ criar |
| `padsite_branding` (ou usar `unidade_branding` se existir) | Logo, paleta, fontes, textos da home | ❓ verificar |
| `padsite_paginas` | Páginas editáveis (CMS leve) por clínica | ❌ criar |
| `padsite_dominios` | Histórico de domínios + status DNS + vencimento | ❌ criar |
| `padsite_zoho_caixas` | Caixas Zoho provisionadas + status | ❌ criar |
| `unidade_modulos_contratados` | Quais módulos a clínica pagou | ❓ provável que exista parcial em `comissoes_config` / `cobrancas_mensais_modulos` — auditar |
| `padsite_leads` | Lead capturado pelo formulário público (separa de `pacientes` enquanto não vira paciente) | ❌ criar |
| `padsite_auditoria` | Log do que o admin da clínica editou (LGPD + invariante origem/versaoSchema) | ❌ criar |

> **Nota Dr. Replit:** o INVENTARIO_PAWARDS.md (auditado 2026-05-18, ver doc separado) mostra que `cobrancas_mensais_modulos`, `cobrancas_adicionais`, `pagamentos`, `provedores_pagamento` e `pagamento_webhook_eventos` **já existem no banco**. O esqueleto financeiro está montado, falta a anastomose com PADSITE.

---

## 5. Modelo de cobrança proposto (ponto de discussão Dr. Claude)

Caio mencionou "ativaríamos módulos de receita". Proponho **3 camadas** de cobrança:

### 5.1 Setup único (one-shot, na adesão)
| Item | Sugestão | Justificativa |
|---|---|---|
| Compra domínio `.com.br` | R$ 40/ano repassado + taxa de gestão | Registro.br ~R$ 40. Cobra-se 1x e revalida ano a ano |
| Provisionamento Zoho | R$ 0 (incluso) | Plano Zoho da PAWARDS rateado |
| Provisionamento técnico (DNS, deploy, certificado, seed do banco) | **R$ X (setup)** | Pagar o trabalho da primeira execução do playbook |
| Treinamento da equipe da clínica (1-2h online) | incluso | Cria adesão e reduz suporte |

### 5.2 Mensalidade base (recorrente)
Cobre o **PADSITE de pé + MEDCORE + PADTEAM mínimo + PADLEGEX**. Sem isso, nem o site fica no ar.

- Sugestão: **R$ Y/mês** por clínica.
- Inclui: portal, agenda, prontuário, equipe básica (até N usuários), até N caixas Zoho, até N pacientes ativos/mês.
- Acima do limite → **cobrança adicional** (já temos `cobrancas_adicionais`).

### 5.3 Módulos opcionais (acendem features no PADSITE)
| Módulo | Mensal sugerido | Cobrança variável |
|---|---|---|
| PAREXAM | R$ Z/mês | + R$ por exame OCR'd acima do limite |
| PARMAVAULT | R$ Z/mês | + % por receita emitida (comissão já calculada em `comissao_estimada` — 8.728/8.728 hoje) |
| Motor de Sugestões (fórmulas/injetáveis/implantes) | R$ Z/mês | — |
| RAS Automático | R$ Z/mês | + R$ por RAS gerado acima do limite |
| ZapSign ICP-Brasil | R$ Z/mês | + R$ por envelope ICP (custo ZapSign repassado + margem) |
| PAWTRACK | R$ Z/mês | quando entregar |
| PAWVISION | R$ Z/mês | quando entregar |
| PAWLEVEL | R$ Z/mês | quando entregar |

### 5.4 Bônus comercial — pacotes
Espelhar o que o replit.md já chama de **"Motor Comercial — 3 modelos (Full / Pacote / Por Demanda) + 8 módulos vendáveis"**:
- **Full** — tudo ligado, preço fechado, sem surpresa.
- **Pacote** — combos (ex.: MEDCORE + RAS + PARMAVAULT).
- **Por Demanda** — base + módulos ligando/desligando mês a mês.

> **Pra fechar valores R$ X / Y / Z:** depende de custo Replit Deploy + Zoho + ZapSign por envelope + Twilio + margem PAWARDS. **Não tenho certeza dos custos atualizados — preciso fechar com o Caio antes de cravar tabela de preços.**

### 5.5 Argumentos comerciais pro dono da clínica (pra usar em proposta)
- "Você **não compra domínio, não compra hospedagem, não compra e-mail, não compra CMS**. Tudo já vem ligado."
- "Seu paciente entra pelo SEU site (`suaclinica.com.br`), com SUA cara — mas o motor é PAWARDS."
- "Você liga e desliga módulos no console — paga só pelo que usa."
- "Seu prontuário, seus RAS, suas receitas, sua agenda — TUDO num lugar só, integrado, sem 5 sistemas conversando torto."
- "LGPD blindada — termos versionados, ZapSign ICP-Brasil, auditoria de tudo."
- "Comissões de fórmulas magistrais com farmácias parceiras já vêm calculadas no painel CEO."
- "Sem adesão = sem site no ar. Adesão = porta de entrada ativa, leads chegando, agenda lotando."

---

## 6. Piloto: Instituto Pádua

- **Cliente:** Instituto Pádua (Caio é dono e CEO — piloto interno).
- **Domínio-alvo:** `institutopadua.com.br` (a PAWARDS compra).
- **Unidade no banco:** `unidades.id = 15` (já tem os 3.872 pacientes da Wave Cadastro Pádua de 13/mai).
- **Slug PADSITE proposto:** `padua` (`slug_padsite = 'padua'`).
- **Módulos pra ligar no piloto:** MEDCORE, PAREXAM, PARMAVAULT, Motor de Sugestões, RAS, ZapSign, PADTEAM, PADLEGEX.
- **Função do piloto:** **fazer manual a primeira vez pra virar o roteiro do playbook automatizado.** O segundo cliente (clínica externa) já entra no playbook pronto.

---

## 7. O que precisa Dr. Claude decidir / orquestrar

1. **Aprovar a nomenclatura** PADSITE / PADSITE BASE / PADSITE «slug» (ou propor melhor).
2. **Aprovar o piloto Instituto Pádua** como roteiro pra automatizar.
3. **Definir tabela de preços** (R$ X setup, R$ Y mensalidade base, R$ Z por módulo) — preciso de input do Caio sobre custos atualizados (Zoho, ZapSign por envelope, Twilio, margem desejada).
4. **Decidir registro.br: API automática ou compra manual no piloto?** API do registro.br exige certificado digital e é burocrática. Talvez o piloto manualize e a wave 2 automatize.
5. **Decidir Zoho: Zoho Mail puro ou Zoho One?** Zoho One traz CRM/Books que poderia ajudar gestão, mas custa mais.
6. **Definir limite "free" da mensalidade base** (até quantos pacientes ativos, usuários, e-mails) antes de cair em `cobrancas_adicionais`.
7. **Sequenciar Waves PADSITE:**
   - **Wave PADSITE 0** — modelar tabelas (`padsite_instancias`, `padsite_branding`, `padsite_paginas`, `padsite_dominios`, `padsite_zoho_caixas`, `padsite_leads`, `padsite_auditoria`) + auditar `unidade_modulos_contratados` existente.
   - **Wave PADSITE 1** — template `artifacts/padsite-base` com home + equipe + agendamento + área do paciente + LGPD, parametrizado por unidade.
   - **Wave PADSITE 2 (piloto)** — provisionar `institutopadua.com.br` MANUAL, popular branding, ligar módulos, treinar Caio.
   - **Wave PADSITE 3** — playbook `provisionarPadsite(unidadeId)` automatizando o que foi manual no piloto.
   - **Wave PADSITE 4** — admin de cobrança/suspensão automática + painel comercial pra fechar contratos.
8. **Anastomose com módulos existentes:** pra cada módulo PAWARDS, definir QUE feature acende no PADSITE quando o módulo for contratado (esboço na §3.3).

---

## 8. Anti-padrões a evitar (lições do INVENTARIO)

O inventário 23/abr mostrou padrões de bug/walking-dead que NÃO podemos repetir no PADSITE:
- **NÃO** criar tabelas vazias sem rota/hook (B2/B3 ficaram zumbis 25 dias).
- **NÃO** duplicar serviço (`validarContratoFarmaciaUnidade` virou 2 implementações concorrentes).
- **NÃO** esquecer `origem`, `versaoSchema`, `arquivadoEm` (regra ferro LGPD).
- **NÃO** usar `role` (sempre `perfil`).
- **NÃO** fazer site único por clínica (= projeto único = bug infinito). **UMA codebase, N instâncias.**

---

## 9. Próximo passo concreto pedido pelo Caio

Aguardo Dr. Claude:
1. Validar (ou ajustar) a nomenclatura e a metáfora.
2. Validar os 3 invariantes da §4 e o sequenciamento das Waves PADSITE 0→4 da §7.
3. Fechar com Caio os parâmetros comerciais da §5 (R$ X, Y, Z e os limites do plano base).
4. Liberar Wave PADSITE 0 (modelagem aditiva de tabelas) — é zero risco, 100% aditivo, e desbloqueia o resto.

> **Sem decisão do Dr. Claude nestes 4 pontos, eu (Dr. Replit) não toco em código. Aguardo orquestração.** Esta proposta cobre o pedido literal do Caio: *"como o pawards pode criar receita? recursos e argumentos pros donos de clínica? cobrança? linha de produção sem bug?"* — em formato versionado, raw GitHub-friendly, lente das 4 personas (🩺 médico / 💰 CEO / 📈 empresário / 🛡️ investidor) implícita em §5.5.
