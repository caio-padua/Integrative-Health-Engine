# CARTA 07 — VISÃO MÁXIMA PAWARDS/MANAGER
# Sistema Clínico Mais Moderno do Brasil — Julho 2026
# De: Dr. Replit Pawards (IHE) | Para: Dr. Replit Manager
# CEO: Dr. Caio Henrique Fernandes Pádua
# Data: 16/07/2026 | Prioridade: MÁXIMA

---

## PREÂMBULO — LEIA ANTES DE ESCREVER UMA LINHA

Esta carta define a FILOSOFIA e as FERRAMENTAS do sistema.
Não é sugestão. É ordem arquitetural do CEO.

Kaizen (改善) = melhoria contínua, incremental, sem parar.
Cada onda entrega algo pequeno que funciona de verdade.
Nada de mock. Nada de placeholder. Nada de "em construção".

Você está construindo o sistema clínico mais moderno do Brasil.
Nenhum concorrente tem o que está nesta carta.

---

## BLOCO 1 — INTELIGÊNCIA ARTIFICIAL INTEGRADA

### 1.1 — Motor de Linguagem Principal (LLM = Large Language Model)

**Ferramenta:** Claude claude-opus-4 via API Anthropic (Anthropic = empresa criadora do Claude)

**O que faz no sistema:**

| Trigger (gatilho) | O sistema faz sozinho |
|---|---|
| Paciente pede atestado pelo portal | Gera PDF do atestado com CRM do médico, data, CID |
| Paciente pergunta "que exame investigaria minha queixa X?" | Responde com lista de exames baseada em protocolo + histórico |
| Plano do paciente tem nível RUBI ou OURO | Laudos e pedidos de exame gerados automaticamente |
| Paciente faz anamnese nova | Motor clínico sugere fórmulas + injetáveis + protocolos |
| Paciente faltou consulta | Mensagem personalizada gerada com nome + próxima data disponível |

**Implementação:**
```typescript
// lib/ai/src/clinicalAgent.ts
import Anthropic from '@anthropic-ai/sdk';

export async function gerarAtestado(params: {
  pacienteNome: string;
  cid: string;
  diasAfastamento: number;
  medicoNome: string;
  medicoCRM: string;
  empresaId: number;
}): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Gere um atestado médico formal em português brasileiro para:
        Paciente: ${params.pacienteNome}
        CID: ${params.cid}
        Dias de afastamento: ${params.diasAfastamento}
        Médico: ${params.medicoNome} | CRM: ${params.medicoCRM}
        Data: ${new Date().toLocaleDateString('pt-BR')}
        Formato: documento formal, sem abreviações.`
    }]
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}
```

**Rota:**
```
POST /pacientes/:id/gerar-atestado
POST /pacientes/:id/sugerir-exames  { queixa: string }
POST /pacientes/:id/pedido-exame    { exames: string[] }
```

---

### 1.2 — Avatares com Voz do Médico (HeyGen + ElevenLabs)

**HeyGen** (heygen.com): Plataforma que cria vídeos com avatar realista do médico falando.
**ElevenLabs** (elevenlabs.io): Síntese de voz — clona a voz real do médico em segundos.

**Fluxo completo:**

```
CEO faz upload de 2 minutos de vídeo do médico
  ↓
HeyGen cria avatar digital fiel
  ↓
ElevenLabs clona a voz
  ↓
Sistema gera script personalizado:
  "Boa tarde, Luciano. Lembre-se de tomar sua Fórmula Metabólica 
   agora às 14h. Que seu dia seja de cura."
  ↓
HeyGen renderiza vídeo com avatar + voz clonada
  ↓
Sistema envia via WhatsApp no horário da tomada
```

**Tabela no banco:**
```sql
CREATE TABLE avatares_medicos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id),
  medico_id INTEGER NOT NULL,
  heygen_avatar_id TEXT NOT NULL,        -- ID do avatar no HeyGen
  elevenlabs_voice_id TEXT NOT NULL,     -- ID da voz no ElevenLabs
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementação por ondas:**
- Onda 1: ElevenLabs TTS (Text-to-Speech = texto para fala) em áudio .mp3 via WhatsApp
- Onda 2: HeyGen vídeo curto (15s) enviado via WhatsApp
- Onda 3: Vídeo personalizado com nome do paciente + fórmula + período

**Custo estimado:**
- ElevenLabs: US$ 22/mês (100 mil caracteres)
- HeyGen: US$ 29/mês (30 créditos de vídeo)
- Por clínica licenciada: cobrar R$ 200/mês pelo módulo Avatar

---

### 1.3 — Mensageria Inteligente Multi-Canal

**Canais suportados:** WhatsApp (Gupshup/Twilio) + Telegram + Portal do Paciente + SMS

**Motor de mensagens por tomada de medicação:**

```
Período: MANHÃ (07h00)
  → "Bom dia, [NOME]. Hora da sua [FÓRMULA_MANHÃ].
     Dose: [DOSE]mg. Duração: [DIAS] dias restantes."

Período: ALMOÇO (12h00)
  → "Olá, [NOME]. Não esqueça: [FÓRMULA_ALMOCO] agora."

Período: NOITE (21h00)
  → "Boa noite, [NOME]. Última dose do dia: [FÓRMULA_NOITE].
     Amanhã às 07h lembro novamente."
```

**Cobrado por mensagem enviada:** R$ 0,15/mensagem (modelo Replit — por uso).

**Tabela de bilhetagem:**
```sql
CREATE TABLE mensagens_billing (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL,
  paciente_id INTEGER NOT NULL,
  canal TEXT NOT NULL,           -- whatsapp | telegram | sms | portal
  tipo TEXT NOT NULL,            -- tomada | atestado | lembrete | resposta_ia
  caracteres INTEGER,
  custo_centavos INTEGER,        -- custo unitário em centavos
  enviado_em TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'enviado'  -- enviado | entregue | lido | falhou
);
```

---

## BLOCO 2 — BILLING POR USO (Modelo Replit — Pague pelo que usa)

### 2.1 — Filosofia de Cobrança

O médico que licencia o sistema NÃO paga uma mensalidade fixa cega.
Ele paga pelo que usa — como Replit cobra por ciclos de CPU (Unidade Central de Processamento).

**Modelo de cobrança Pawards:**

| O que usa | Como cobra | Valor unitário |
|---|---|---|
| Mensagem WhatsApp enviada | Por mensagem | R$ 0,15 |
| Vídeo Avatar gerado (HeyGen) | Por vídeo | R$ 2,50 |
| Atestado gerado por IA | Por documento | R$ 1,00 |
| Pedido de exame por IA | Por documento | R$ 0,80 |
| Sugestão motor clínico | Por sessão | R$ 0,50 |
| Consulta ao motor de IA (LLM) | Por 1.000 tokens | R$ 0,05 |
| Assinatura digital ZapSign | Por documento | R$ 1,50 |
| Backup Drive automático | Por GB/mês | R$ 0,30 |

**Franquia mensal incluída no plano base:**
- Plano Básico R$ 1.500/mês: até R$ 500 em uso incluído
- Plano Avançado R$ 3.000/mês: até R$ 1.500 em uso incluído
- Excedente: cobrado automaticamente no cartão cadastrado

### 2.2 — Tela de Billing em Tempo Real (Como o Replit)

**O que o médico licenciado vê na tela:**

```
┌─────────────────────────────────────────────┐
│  USO DO MÊS — JULHO 2026          [Recarregar]
├─────────────────────────────────────────────┤
│  Plano: AVANÇADO         Limite: R$ 1.500   │
│  Usado até agora:        R$ 847,30          │
│  Disponível:             R$ 652,70          │
│  Previsão até 31/jul:    R$ 1.340,00 ✅     │
├─────────────────────────────────────────────┤
│  DETALHAMENTO                               │
│  Mensagens WhatsApp:  1.847 × R$0,15 = R$277│
│  Avatares HeyGen:        42 × R$2,50 = R$105│
│  Atestados IA:           23 × R$1,00 = R$ 23│
│  Motor clínico:         180 × R$0,50 = R$ 90│
│  ZapSign:                12 × R$1,50 = R$ 18│
├─────────────────────────────────────────────┤
│  Próxima fatura: 01/ago   [Ver histórico]   │
└─────────────────────────────────────────────┘
```

**Ferramenta:** Lago (open-source, auto-hospedado) — fatura automática, webhook Asaas.

**Tabela de eventos de billing:**
```sql
CREATE TABLE billing_eventos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL,
  evento TEXT NOT NULL,           -- mensagem_whatsapp | avatar_heygen | atestado_ia
  quantidade INTEGER DEFAULT 1,
  custo_centavos INTEGER NOT NULL,
  referencia_id TEXT,             -- ID do objeto relacionado
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_empresa_mes 
  ON billing_eventos(empresa_id, date_trunc('month', criado_em));
```

**Rota SSE (Server-Sent Events = fluxo contínuo) para billing ao vivo:**
```
GET /ceo/billing-stream?empresaId=5
  → emite evento a cada novo uso registrado
  → frontend atualiza o total sem precisar recarregar a página
```

---

## BLOCO 3 — UX MODERNA (Experiência do Usuário)

### 3.1 — Touch Screen + Tablets + Óculos AR

**Touch Screen (telas táteis):**
- Todos os botões: mínimo 48×48px (padrão Apple HIG — Human Interface Guidelines)
- Gestos: swipe horizontal entre clínicas, swipe vertical na fila operacional
- Sem hover dependency (hover = mouse em cima) — tudo funciona por toque

**Tablets (iPad, Galaxy Tab):**
- Layout responsivo em 3 colunas para larguras ≥ 768px
- Fila operacional + detalhes do paciente lado a lado
- Teclado virtual não cobre campos de formulário (scroll automático)

**Óculos AR (Meta Quest, Ray-Ban Meta, óculos chineses Android):**
- Interface serve como PWA (Progressive Web App — aplicativo web instalável)
- Modo compacto: 320px de largura máxima
- Comandos por voz via Web Speech API (API de Reconhecimento de Fala do browser)
- Sem animações pesadas (bateria dos óculos é limitada)

**Implementação no Manager:**
```css
/* Botões touch-friendly */
.btn-acao {
  min-height: 48px;
  min-width: 48px;
  touch-action: manipulation; /* elimina delay de 300ms no toque */
  cursor: pointer;
}

/* Swipe entre clínicas */
.clinicas-carrossel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.clinica-cartao {
  scroll-snap-align: start;
  flex-shrink: 0;
  width: 100vw;
}
```

### 3.2 — Validação Biométrica (Impressão Digital + Íris)

**Para quê serve:**
- Médico valida presença do paciente na consulta via leitor
- Paciente confirma aplicação de protocolo (injetável, implante)
- Acesso ao prontuário exige biometria do médico responsável

**Hardware suportado:**
- Leitor USB de impressão digital (DigitalPersona U.are.U 4500) — R$ 350
- Câmera IR para íris (IriShield MK2120) — R$ 1.200
- Integração: Web Authentication API (WebAuthn — padrão W3C para autenticação forte)

**Tabela:**
```sql
CREATE TABLE biometria_validacoes (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL,
  usuario_id INTEGER,     -- médico ou paciente
  paciente_id INTEGER,
  tipo TEXT NOT NULL,      -- digital | iris | face
  contexto TEXT NOT NULL,  -- consulta | protocolo | prontuario | aplicacao
  validado_em TIMESTAMPTZ DEFAULT NOW(),
  dispositivo TEXT,
  sucesso BOOLEAN NOT NULL
);
```

### 3.3 — IoT Clínico (Aparelhos conectados ao sistema)

**Aparelhos que jogam dados direto no cadastro do paciente:**

| Aparelho | Protocolo | O que registra |
|---|---|---|
| Bioimpedância (InBody, Tanita) | Bluetooth LE / USB | Peso, gordura %, músculo %, água |
| Oxímetro de pulso | Bluetooth LE | SpO2 (saturação de oxigênio), FC |
| Termômetro digital | Bluetooth | Temperatura axilar/timpânica |
| Medidor de pressão | Bluetooth | PAS/PAD/FC (pressão sistólica/diastólica/frequência) |
| Glicosímetro | Bluetooth LE | Glicemia capilar mg/dL |

**Implementação via Web Bluetooth API:**
```typescript
// lib/iot/src/bioimpedancia.ts
export async function lerBioimpedancia(): Promise<LeituraBio> {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['body_composition'] }]
  });
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService('body_composition');
  const characteristic = await service.getCharacteristic('body_composition_measurement');
  const value = await characteristic.readValue();
  return parseBioimpedanciaValue(value);
}
```

**Rota:**
```
POST /pacientes/:id/leituras-iot
Body: { tipo: "bioimpedancia", dados: { peso: 82.3, gordura: 28.4, ... }, empresa_id: 5 }
```

---

## BLOCO 4 — TELA CEO — CENTRO DE COMANDO

### 4.1 — Swipe entre clínicas

```
LAYOUT HORIZONTAL COM SCROLL-SNAP:

[← Pádua] [Barros →] [Paluzze →] [Nova Clínica →]
    ↑
  ATIVA

Cada cartão mostra (atualizado via SSE — sem F5):
  • Consultas hoje: 12 feitas / 3 faltou / 5 pendentes
  • Caixa: R$ 4.200 pago / R$ 800 pendente
  • Fila: 2 RAS abertos / 1 assinatura pendente
  • Licença: ATIVA — vence em 23 dias
  • Royalty acumulado: R$ 900 este mês
  • Mensagens enviadas hoje: 47 (R$ 7,05)
  • IA usada hoje: 12 sugestões (R$ 6,00)
```

### 4.2 — Ferramentas de Auditoria

```
PAINEL AUDITORIA CEO:
  • Log de cada ação de cada usuário (quem fez o quê e quando)
  • Alertas de anomalia: usuário acessa 500 prontuários em 5min = suspeito
  • Exportação LGPD em 1 clique (Art. 18 LGPD — Lei Geral de Proteção de Dados)
  • Relatório de uso por módulo (qual módulo a clínica mais usa)
  • Rastreio de onde o médico passa mais tempo na tela (PostHog heatmap)
```

### 4.3 — Bilhetagem em tempo real

```
CONTADOR AO VIVO (como o Replit mostra ciclos de CPU):
  • Mensagens enviadas: [contador girando em tempo real]
  • Custo acumulado do dia: R$ 34,50 [atualiza a cada evento]
  • Alerta automático: "Você consumiu 80% da franquia" → email + WhatsApp CEO
```

---

## BLOCO 5 — ORDEM DE IMPLEMENTAÇÃO (Kaizen — pequeno e funcional)

```
AGORA (Fase C) → INSERT herda empresa_id automaticamente
  ↓
SEMANA 1 → Tela CEO swipe entre clínicas + SSE real-time
  ↓
SEMANA 2 → Motor IA: atestado + sugestão de exames via Claude
  ↓
SEMANA 3 → ElevenLabs: áudio do médico no WhatsApp (tomadas)
  ↓
SEMANA 4 → Billing por uso: tabela billing_eventos + tela em tempo real
  ↓
MÊS 2 → HeyGen: vídeo avatar do médico personalizado por paciente
  ↓
MÊS 2 → Lago: fatura automática mensal com detalhamento
  ↓
MÊS 3 → IoT: bioimpedância + oxímetro via Web Bluetooth
  ↓
MÊS 3 → WebAuthn: biometria digital/íris para validar consultas
  ↓
MÊS 4 → PWA para óculos AR (Meta, Android)
  ↓
MESES 5-6 → Primeira clínica licenciada pagando + PostHog analytics
```

---

## BLOCO 6 — REGRAS DE FERRO (O que impede divergência)

**Você (Manager) NÃO pode:**
1. Criar tela nova antes da onda atual estar 100% funcional e testada
2. Usar dados mock em produção — zero placeholder
3. Alterar o modelo de billing sem aprovação escrita do CEO
4. Criar tabela sem `empresa_id` (exceto tabelas globais: empresas, planos, avatares_medicos)
5. Commitar código sem teste de isolamento (empresa 9999 = zero registros)

**Protocolo de commit obrigatório:**
```
feat(onda-X): [o que faz]
test: empresa 9999 → 0 registros em [tabela] ✅
billing: [sim/não] — se sim, qual evento registra
```

**Auditoria:** Dr. Replit Pawards (IHE) audita o seu GitHub a qualquer momento.
Quando o CEO digitar "audita o Manager", verificamos em 30 segundos.

---

## BLOCO 7 — PRÓXIMO COMMIT OBRIGATÓRIO

Fase C: garantir que INSERT/UPDATE em todas as 8 rotas grava empresa_id.

```typescript
// PADRÃO OBRIGATÓRIO em todo POST/PUT clínico:
const novoCliente = await db.insert(clientsTable).values({
  ...dadosValidados,
  empresaId: req.empresaId,  // ← SEMPRE do middleware, nunca do body
}).returning();
```

Confirme com:
```sql
SELECT COUNT(*) FROM clients WHERE empresa_id IS NULL;
-- Deve retornar: 0
```

---

## RESUMO EXECUTIVO

| Bloco | O que entrega | Quando |
|---|---|---|
| IA Clínica (Claude) | Atestado, exames, sugestões automáticas | Semana 2 |
| Avatar HeyGen + ElevenLabs | Vídeo/áudio do médico para paciente | Mês 2 |
| Mensageria inteligente | WhatsApp + Telegram por tomada de medicação | Semana 3 |
| Billing por uso (Lago) | Fatura automática por mensagem/IA/documento | Semana 4 |
| Tela CEO swipe | Todas as clínicas ao vivo numa tela | Semana 1 |
| IoT clínico | Bioimpedância, pressão, oxímetro conectados | Mês 3 |
| Biometria WebAuthn | Digital/íris para validar consulta | Mês 3 |
| PWA para óculos AR | Interface nos óculos Meta/Android | Mês 4 |

---

## FECHAMENTO — POR QUE ISSO VALE MILHÕES

O médico de clínica integrativa hoje paga:
- 2 recepcionistas: R$ 4.000/mês
- 1 enfermeira administrativa: R$ 3.500/mês
- Sistema de gestão genérico: R$ 800/mês
- Total: R$ 8.300/mês de custo operacional ineficiente

Com o Pawards Manager:
- Sistema responde WhatsApp dos pacientes: R$ 300/mês
- Atestados e pedidos de exame em 1 clique: R$ 80/mês
- Lembretes de tomada via avatar do médico: R$ 200/mês
- Billing automático (sem inadimplência): R$ 0 de esforço
- Total: R$ 2.500/mês pagos com GOSTO — economia de R$ 5.800/mês

50 clínicas pagando R$ 2.500/mês = R$ 125.000/mês = R$ 1.500.000/ano.

Isso é o produto. Construa com Kaizen. Pequeno e funcional primeiro.

---

*Carta 07 | Dr. Replit Pawards (IHE) | CEO Dr. Caio Henrique Fernandes Pádua*
*16/07/2026 — Todos os direitos reservados PADCOM*
