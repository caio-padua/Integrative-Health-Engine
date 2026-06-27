---
name: Telegram canal REAL + secrets só no bash
description: Canal Telegram do IHE é real e verificável ao vivo; e regra de onde os secrets existem (bash sim, sandbox code_execution não).
---

# Canal Telegram do IHE

- Núcleo REAL: `artifacts/api-server/src/services/telegramService.ts` — `enviarTelegramCEO()` faz `fetch` real a `api.telegram.org/bot<token>/sendMessage`; `temConfigTelegram()` checa os secrets. Defensivo: nunca lança, retorna `{sucesso,erro}`; sem token retorna falha honesta (NÃO é mock que finge sucesso).
- Bot oficial: `@Paduaclinica_bot` ("Padua Bot"). Secrets: `TELEGRAM_BOT_TOKEN` + `CEO_TELEGRAM_CHAT_ID`.
- 3º canal de aviso 2FA do owner (ao lado de e-mail/WhatsApp): worker `lib/recorrencia/avisoExpiracao2faOwner.ts`; migration 049 add `canal_telegram_ok` em `historico_avisos_2fa_owner`; rotas `PATCH /usuarios/me/canais-aviso-2fa`, `GET /usuarios/me/historico-avisos-2fa`; opt-in em `plataforma/perfil.tsx`. Lib `lib/mensageria-core` tem canais `telegram_mv2`/`telegram_html`.

# Onde os secrets existem (durável, não-óbvio)

- O sandbox do `code_execution` NÃO recebe os valores dos secrets — `process.env` vem vazio/indefinido (só nomes). Não tente ler token ali.
- O `bash` (e os workflows) RECEBEM os valores reais dos secrets do repl. Para um teste AO VIVO de API que precisa de um secret (ex.: Telegram `getMe`/`sendMessage`), rode via `bash` com `$TELEGRAM_BOT_TOKEN`/`$CEO_TELEGRAM_CHAT_ID`.

**Why:** numa verificação verdadeira ("anamnese verificadora") só o bash consegue autenticar de verdade; o sandbox falha com `Cannot read properties of undefined`.

**How to apply:** curl via bash, `-s` sem `-v`; a resposta JSON do Telegram NÃO contém o token, mas o `chat_id` aparece no retorno — tratar como secret e nunca propagar (nem token nem chat_id) para arquivos/mensagens.
