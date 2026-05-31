---
name: Tomadas → horários → mensageria/carta (GpsPadua)
description: Por que derivar horário de tomadas sem hora; consumidores de mensageria mapeiam por HORA, não por sigla de período.
---

# Regra

No GpsPadua (mockup-sandbox/prescricao-rapida), `MapeamentoMensageria` e
`CartaEncantamentoMatriz` recebem `horarios: string[]` e resolvem o período via
`horarioParaPeriodo(hh)` (faixa janela_inicio/janela_fim em `_mensageria.ts`).

Uma "tomada" pode ter SÓ período manual (sem hora — fluxo R5). Nesse caso
`horariosDeTomadas()` precisa emitir um horário representativo = `janela_inicio`
do período, senão a tomada fica **invisível** pra mensageria/carta (lista vazia),
mesmo aparecendo certinha no preview da prescrição (que usa `periodoResolvido`).

**Why:** os dois consumidores só entendem HORA, não sigla de período. Sem o
horário sintético, dose por período sem hora não dispara WhatsApp nem entra na
carta — bug silencioso (preview OK, motor cego).

**How to apply:** qualquer mudança em `horariosDeTomadas` deve manter o fallback
período→janela_inicio; se um dia mensageria/carta passarem a aceitar sigla de
período direto, aí sim pode simplificar.
