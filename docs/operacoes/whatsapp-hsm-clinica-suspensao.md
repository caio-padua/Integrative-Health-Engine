# WhatsApp HSM — avisos de suspensão e reativação de clínica

## Por que precisa de HSM

Twilio e Gupshup só aceitam **texto livre** dentro da janela de 24 horas
após o destinatário ter mandado mensagem para o número da clínica. Como
os responsáveis (CEO, validador mestre, tenant_admin) raramente
conversam com o número institucional, na prática o aviso cai fora da
janela na maioria das vezes.

Fora da janela, a única coisa que o provedor entrega é um **template
HSM aprovado pelo Meta**. Sem HSM cadastrado, o aviso de "clínica
suspensa" pode ser silenciosamente bloqueado justamente nos momentos
mais críticos (madrugada, fim de semana, feriado).

O motor PAWARDS hoje envia, nessa ordem:

1. **HSM** se houver `whatsapp_config.metadados.hsmTemplates[<nome>]` configurado.
2. **Texto livre** (fallback) se o HSM não estiver configurado **ou**
   se o envio HSM falhar (e a janela de 24h ainda estiver aberta, o
   provedor entrega normalmente).

Os dois templates obrigatórios são:

- `CLINICA_SUSPENSA`
- `CLINICA_REATIVADA`

## Variáveis esperadas

`CLINICA_SUSPENSA`:

| Chave             | Exemplo                                  |
|-------------------|------------------------------------------|
| `unidadeNome`     | `Instituto Pádua`                        |
| `suspensoEm`      | `13/05/2026 14:32`                       |
| `motivo`          | `Inadimplência > 30 dias`                |
| `contatoRecurso`  | `o CEO da PAWARDS (Dr. Caio) ...`        |

`CLINICA_REATIVADA`:

| Chave           | Exemplo                |
|-----------------|------------------------|
| `unidadeNome`   | `Instituto Pádua`      |
| `reativadoEm`   | `15/05/2026 09:10`     |
| `motivo`        | `Pagamento confirmado` |

A ordem em que essas variáveis viram parâmetros `{{1}}, {{2}}, ...` no
template aprovado é controlada por `ordemVariaveis` no
`whatsapp_config.metadados` (ver abaixo). Se `ordemVariaveis` não
estiver definida, usamos a ordem natural das chaves do objeto.

## Como aprovar o template num novo provedor

### Twilio (Content Template Builder)

1. Console Twilio → **Messaging → Content Template Builder → Create new**.
2. Categoria: `UTILITY` (avisos operacionais não-promocionais).
3. Idioma: `pt_BR`.
4. Corpo (exemplo de `CLINICA_SUSPENSA`):

   ```text
   *PAWARDS — Clínica suspensa*

   Clínica: *{{1}}*
   Suspensa em: {{2}}
   Motivo: {{3}}

   Enquanto a suspensão estiver ativa, nenhum usuário consegue fazer login.
   Para recurso: {{4}}.
   ```

5. Salvar e clicar **Submit for WhatsApp Approval**. A aprovação leva
   de minutos a algumas horas. Anote o **Content SID** (`HX...`).
6. Repita para `CLINICA_REATIVADA` (3 variáveis).

### Gupshup

1. Painel Gupshup → **WhatsApp → Templates → Create**.
2. Categoria: `UTILITY`, idioma `pt_BR`.
3. Mesmo corpo do exemplo Twilio (Gupshup também usa `{{1}}, {{2}}, ...`).
4. Submeter. Quando aprovado, anote o **Template ID** (UUID).

## Como cadastrar no PAWARDS

Atualizar `whatsapp_config.metadados` (jsonb) da unidade — ou da config
global (`unidade_id IS NULL`) — com:

```json
{
  "hsmTemplates": {
    "CLINICA_SUSPENSA": {
      "twilioContentSid": "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "gupshupTemplateId": "00000000-0000-0000-0000-000000000000",
      "ordemVariaveis": ["unidadeNome", "suspensoEm", "motivo", "contatoRecurso"]
    },
    "CLINICA_REATIVADA": {
      "twilioContentSid": "HXyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      "gupshupTemplateId": "11111111-1111-1111-1111-111111111111",
      "ordemVariaveis": ["unidadeNome", "reativadoEm", "motivo"]
    }
  }
}
```

Use a chave correspondente ao provedor configurado (`twilioContentSid`
para `provedor = TWILIO`, `gupshupTemplateId` para `GUPSHUP`). Não é
preciso migration: o campo `metadados` já existe em `whatsapp_config`.

## Como verificar

- O resultado de `enviarWhatsappSuspensao` / `enviarWhatsappReativacao`
  passa a retornar também `viaHsm` (qtd entregue por HSM) e
  `viaTextoLivre` (qtd entregue pelo fallback).
- Em produção, conferir `whatsapp_mensagens_log.template_nome` =
  `CLINICA_SUSPENSA` / `CLINICA_REATIVADA` e `status = ENVIADO`
  imediatamente após uma suspensão de teste fora do horário comercial.
- Se `viaHsm = 0` e o destinatário **não** abriu conversa nas últimas
  24h, o aviso provavelmente foi bloqueado — cadastrar o HSM resolve.
