---
name: Receitas Clínicas — via de coluna vs via de administração
description: No mockup GpsPadua, "Via" é a COLUNA (agrupador); fórmula manipulada tem via de administração como propriedade separada.
---

# Via (coluna) ≠ via de administração (propriedade da fórmula)

No cockpit de prescrição (GpsPadua), `Via` é o **agrupador de coluna**
(EV/IM/SC/VO/IMP/PRC). A coluna VO foi renomeada para **RECEITAS CLÍNICAS** —
hub das fórmulas manipuladas.

Sublingual (e as demais rotas: oral, tópica, transdérmica, vaginal, retal,
nasal, otológica, oftálmica, intramuscular, subcutânea, endovenosa) **NÃO é
coluna**: é a `viaAdministracao` da fórmula, um campo à parte. Default = Oral.

**Why:** Caio (02/06/2026) explicitou que sublingual é só uma via de
administração, não um quadro. Acoplar via↔coluna fazia trocar de coluna ao
escolher a rota.

**How to apply:** existem **dois** dropdowns "VIA DE ADMINISTRAÇÃO" de fórmula
(o card compacto e o EditorBlend expandido) — ambos devem setar
`viaAdministracao` (nunca `via`) para itens da coluna VO. Só itens não-VO usam
o dropdown de coluna (`via`). O texto da receita de fórmula VO mostra a rota,
nunca o código "VO".
