---
name: Calendly connector (Replit native)
description: Como acessar o Calendly neste projeto e a pegadinha do token.
---

# Calendly via conector nativo Replit

O Calendly está ligado como CONEXÃO nativa do Replit (não via token manual).

**Pegadinha:** `listConnections('calendly')` retorna 0 e NÃO expõe access_token.
Não dá pra montar `Authorization: Bearer` manual como se faz com google-calendar.

**Como usar:** sempre via proxy do SDK, com prefixo `/v2`:
```js
import { ReplitConnectors } from "@replit/connectors-sdk";
const connectors = new ReplitConnectors();
const r = await connectors.proxy("calendly", "/v2/users/me", { method:"GET" });
const j = await r.json(); // proxy retorna response cru, precisa .json()
```

**Permissões:** somente LEITURA (users:read, event_types:read, scheduled_events:read).
Criar tipo de evento NÃO dá pela API — Caio cria no painel calendly.com.

**Why:** perdi um ciclo tentando ler por token (igual GCal) antes de descobrir
que Calendly só funciona pelo proxy SDK. Google Calendar SIM expõe token via
listConnections; Calendly NÃO. Convenções diferentes para conectores diferentes.
