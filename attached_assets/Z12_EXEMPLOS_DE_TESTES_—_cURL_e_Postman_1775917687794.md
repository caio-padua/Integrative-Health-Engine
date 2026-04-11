# 🧪 EXEMPLOS DE TESTES — cURL e Postman

**Data**: 11/04/2026  
**Objetivo**: Testar todos os 23 endpoints novos  

---

## 📋 ÍNDICE

1. [Fila do Preceptor (7 endpoints)](#fila-do-preceptor)
2. [Alertas Twilio (7 endpoints)](#alertas-twilio)
3. [Governança (4 endpoints)](#governança)
4. [Auditoria Cascata (5 endpoints)](#auditoria-cascata)
5. [Postman Collection](#postman-collection)

---

## 🎯 FILA DO PRECEPTOR

### 1. GET /fila-preceptor — Listar prontuários pendentes

```bash
curl -X GET "http://localhost:3000/api/fila-preceptor?status=PENDENTE&ordenar=prazo" \
  -H "Content-Type: application/json"
```

**Response esperado:**
```json
[
  {
    "id": 1,
    "pacienteId": 1,
    "pacienteNome": "Dayana Ludman Alves Caldas da Silva",
    "status": "PENDENTE",
    "prazoMaximo": "2026-04-13T02:29:05.000Z",
    "escalationAtivo": false,
    "validadoPorNome": null,
    "criadoEm": "2026-04-11T02:29:05.000Z",
    "tempoRestante": {
      "horas": 48,
      "minutos": 0,
      "segundos": 0,
      "expirado": false
    },
    "corSemaforoPreceptor": "VERDE"
  }
]
```

### 2. GET /fila-preceptor/:id — Detalhe de um prontuário

```bash
curl -X GET "http://localhost:3000/api/fila-preceptor/1" \
  -H "Content-Type: application/json"
```

### 3. POST /fila-preceptor/:id/validar — Validar prontuário

```bash
curl -X POST "http://localhost:3000/api/fila-preceptor/1/validar" \
  -H "Content-Type: application/json" \
  -d '{
    "validadoPorId": 1,
    "observacao": "Prontuário validado com sucesso. Paciente pronto para assinatura."
  }'
```

**Response esperado:**
```json
{
  "id": 1,
  "pacienteId": 1,
  "prontuarioId": null,
  "status": "VALIDADO",
  "prazoMaximo": "2026-04-13T02:29:05.000Z",
  "escalationAtivo": false,
  "validadoPorId": 1,
  "validadoEm": "2026-04-11T03:00:00.000Z",
  "observacaoValidacao": "Prontuário validado com sucesso. Paciente pronto para assinatura.",
  "rejeitadoEm": null,
  "motivoRejeicao": null,
  "assinaturaDigital": null,
  "assinadoEm": null,
  "criadoEm": "2026-04-11T02:29:05.000Z",
  "atualizadoEm": "2026-04-11T03:00:00.000Z"
}
```

### 4. POST /fila-preceptor/:id/rejeitar — Rejeitar prontuário

```bash
curl -X POST "http://localhost:3000/api/fila-preceptor/1/rejeitar" \
  -H "Content-Type: application/json" \
  -d '{
    "motivoRejeicao": "Dados incompletos. Faltam exames de sangue."
  }'
```

### 5. POST /fila-preceptor/:id/assinar — Assinar digitalmente

```bash
curl -X POST "http://localhost:3000/api/fila-preceptor/1/assinar" \
  -H "Content-Type: application/json" \
  -d '{
    "assinaturaDigital": "-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAJC1/iNAZwqDMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV\n-----END CERTIFICATE-----"
  }'
```

### 6. GET /fila-preceptor/stats — Estatísticas

```bash
curl -X GET "http://localhost:3000/api/fila-preceptor/stats" \
  -H "Content-Type: application/json"
```

**Response esperado:**
```json
{
  "por_status": [
    { "status": "PENDENTE", "count": "5" },
    { "status": "VALIDADO", "count": "3" },
    { "status": "ASSINADO", "count": "2" },
    { "status": "REJEITADO", "count": "1" }
  ],
  "expirados": 0,
  "com_escalation": 1
}
```

### 7. POST /fila-preceptor/escalation — Disparar escalation automática

```bash
curl -X POST "http://localhost:3000/api/fila-preceptor/escalation" \
  -H "Content-Type: application/json"
```

---

## 🔔 ALERTAS TWILIO

### 1. POST /alertas — Criar alerta

```bash
curl -X POST "http://localhost:3000/api/alertas" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "FILA_PRECEPTOR_PENDENTE",
    "destinatarioId": 1,
    "numeroWhatsapp": "11987654321",
    "mensagem": "🔴 ALERTA: Prontuário de Dayana aguardando validação há 24h. Prazo: 24h",
    "linkAcao": "https://seu-dominio.com/fila-preceptor/1"
  }'
```

### 2. GET /alertas — Listar alertas do usuário

```bash
curl -X GET "http://localhost:3000/api/alertas?destinatarioId=1&status=ENVIADO" \
  -H "Content-Type: application/json"
```

### 3. GET /alertas/:id — Detalhe de um alerta

```bash
curl -X GET "http://localhost:3000/api/alertas/1" \
  -H "Content-Type: application/json"
```

### 4. POST /alertas/:id/ack — Confirmar leitura

```bash
curl -X POST "http://localhost:3000/api/alertas/1/ack" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmadoPorId": 1
  }'
```

### 5. GET /alertas/stats — Estatísticas

```bash
curl -X GET "http://localhost:3000/api/alertas/stats" \
  -H "Content-Type: application/json"
```

**Response esperado:**
```json
{
  "por_status": [
    { "status": "ENVIADO", "count": "2" },
    { "status": "ENTREGUE", "count": "3" },
    { "status": "CONFIRMADO", "count": "5" }
  ],
  "expirados": 0,
  "nao_confirmados": 5
}
```

### 6. POST /webhooks/twilio/status — Webhook de status Twilio

```bash
# Simulado (Twilio envia automaticamente)
curl -X POST "http://localhost:3000/api/webhooks/twilio/status" \
  -H "Content-Type: application/json" \
  -d '{
    "MessageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "MessageStatus": "delivered"
  }'
```

### 7. POST /alertas/limpar-expirados — Limpar alertas expirados

```bash
curl -X POST "http://localhost:3000/api/alertas/limpar-expirados" \
  -H "Content-Type: application/json"
```

---

## 📊 GOVERNANÇA

### 1. GET /governanca/dashboard — Dashboard com KPIs

```bash
curl -X GET "http://localhost:3000/api/governanca/dashboard" \
  -H "Content-Type: application/json"
```

**Response esperado:**
```json
{
  "status_geral": "VERDE",
  "timestamp": "2026-04-11T03:30:00.000Z",
  "kpis": {
    "fila_preceptor_pendentes": {
      "valor": 2,
      "status": "VERDE",
      "descricao": "2 prontuários aguardando validação"
    },
    "validacoes_cascata_pendentes": {
      "valor": 5,
      "status": "VERDE",
      "descricao": "5 validações em cascata pendentes"
    },
    "alertas_nao_confirmados": {
      "valor": 1,
      "status": "VERDE",
      "descricao": "1 alertas não confirmados"
    },
    "exames_nao_recebidos": {
      "valor": 3,
      "status": "VERDE",
      "descricao": "3 exames aguardando recebimento"
    }
  }
}
```

### 2. GET /governanca/timeline — Timeline de últimas ações

```bash
curl -X GET "http://localhost:3000/api/governanca/timeline?limite=10" \
  -H "Content-Type: application/json"
```

### 3. GET /governanca/semaforo — Status geral do sistema

```bash
curl -X GET "http://localhost:3000/api/governanca/semaforo" \
  -H "Content-Type: application/json"
```

**Response esperado:**
```json
{
  "semaforo": "VERDE",
  "filas_criticas": 0,
  "filas_atencao": 0,
  "timestamp": "2026-04-11T03:30:00.000Z",
  "descricao": "Sistema operacional normal"
}
```

### 4. GET /governanca/relatorio — Relatório por período

```bash
curl -X GET "http://localhost:3000/api/governanca/relatorio?dataInicio=2026-04-01&dataFim=2026-04-11" \
  -H "Content-Type: application/json"
```

---

## 🔍 AUDITORIA CASCATA

### 1. GET /cascata-validacao/auditoria — Listar log

```bash
curl -X GET "http://localhost:3000/api/cascata-validacao/auditoria?etapa=ENFERMEIRA03&limite=20" \
  -H "Content-Type: application/json"
```

**Response esperado:**
```json
[
  {
    "id": 1,
    "acao": "LIGOU",
    "etapa": "ENFERMEIRA03",
    "valorAnterior": null,
    "valorNovo": true,
    "usuario": "Dr Caio Henrique Fernandes Padua",
    "usuarioId": 1,
    "motivo": "Inicialização da cascata de validação",
    "realizadoEm": "2026-04-11T02:29:05.000Z",
    "acaoFormatada": "🟢 LIGOU ENFERMEIRA03"
  }
]
```

### 2. POST /cascata-validacao/toggle — Ligar/desligar etapa

```bash
curl -X POST "http://localhost:3000/api/cascata-validacao/toggle" \
  -H "Content-Type: application/json" \
  -d '{
    "etapa": "MEDICO03",
    "novoValor": false,
    "realizadoPorId": 1,
    "motivo": "Desligando validação de médico por manutenção"
  }'
```

### 3. GET /cascata-validacao/config — Obter configuração atual

```bash
curl -X GET "http://localhost:3000/api/cascata-validacao/config" \
  -H "Content-Type: application/json"
```

### 4. GET /cascata-validacao/auditoria/stats — Estatísticas

```bash
curl -X GET "http://localhost:3000/api/cascata-validacao/auditoria/stats" \
  -H "Content-Type: application/json"
```

### 5. GET /cascata-validacao/auditoria/usuario/:usuarioId — Por usuário

```bash
curl -X GET "http://localhost:3000/api/cascata-validacao/auditoria/usuario/1" \
  -H "Content-Type: application/json"
```

---

## 📮 POSTMAN COLLECTION

Copie o JSON abaixo e importe no Postman:

```json
{
  "info": {
    "name": "PADCOM Governança API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Fila Preceptor",
      "item": [
        {
          "name": "GET /fila-preceptor",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/fila-preceptor?status=PENDENTE"
          }
        },
        {
          "name": "POST /fila-preceptor/:id/validar",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/fila-preceptor/1/validar",
            "body": {
              "mode": "raw",
              "raw": "{\"validadoPorId\": 1, \"observacao\": \"Validado\"}"
            }
          }
        }
      ]
    },
    {
      "name": "Alertas",
      "item": [
        {
          "name": "POST /alertas",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/alertas",
            "body": {
              "mode": "raw",
              "raw": "{\"tipo\": \"FILA_PRECEPTOR_PENDENTE\", \"destinatarioId\": 1, \"numeroWhatsapp\": \"11987654321\", \"mensagem\": \"Alerta teste\"}"
            }
          }
        }
      ]
    },
    {
      "name": "Governança",
      "item": [
        {
          "name": "GET /governanca/dashboard",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/governanca/dashboard"
          }
        }
      ]
    },
    {
      "name": "Auditoria",
      "item": [
        {
          "name": "GET /cascata-validacao/auditoria",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/cascata-validacao/auditoria"
          }
        }
      ]
    }
  ]
}
```

---

## 🎯 SCRIPT DE TESTE COMPLETO

```bash
#!/bin/bash

# Script para testar todos os endpoints

BASE_URL="http://localhost:3000/api"

echo "🧪 Iniciando testes..."

# 1. Fila Preceptor
echo "\n📋 Testando Fila Preceptor..."
curl -s -X GET "$BASE_URL/fila-preceptor" | jq .

# 2. Governança
echo "\n📊 Testando Governança..."
curl -s -X GET "$BASE_URL/governanca/dashboard" | jq .

# 3. Auditoria
echo "\n🔍 Testando Auditoria..."
curl -s -X GET "$BASE_URL/cascata-validacao/auditoria" | jq .

# 4. Alertas
echo "\n🔔 Testando Alertas..."
curl -s -X GET "$BASE_URL/alertas?destinatarioId=1" | jq .

echo "\n✅ Testes concluídos!"
```

Salvar como `test-endpoints.sh` e executar:

```bash
chmod +x test-endpoints.sh
./test-endpoints.sh
```

---

**Criado por**: Manus AI Dragon 🐉  
**Data**: 11/04/2026  
**Status**: ✅ PRONTO PARA TESTES
