---
name: Mensageria cronobiológica + posologia (fonte-de-verdade)
description: Onde vive a arquitetura validada de disparo de WhatsApp por período do dia, campos de posologia e a regra dose≠cápsula. Consultar antes de mexer em prescrição/mensageria.
---

# Mensageria cronobiológica + posologia — fonte de verdade

Caio validou ao vivo (sessões 19/mai/2026) toda a arquitetura. NÃO reinventar — já está desenhado.

## Onde está documentado/validado
- `docs/dr-claude/16_TEATRO_MENSAGERIA_CENARIOS.md` — sessão ao vivo com Caio: 4 cenários, disparo por janela cronobiológica, placeholders, carta de encantamento.
- `docs/dr-claude/17_RNA_MENSAGEIRO_UNIFICACAO.md` — lib `@workspace/mensageria-core` (gramática inline única canvas+backend).
- `.local/tasks/whatsapp-lembrete-prescricao.md` — formato EXATO da mensagem (quadradinhos coloridos, negrito/itálico por regra, saudação por gênero).
- `artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/_teatro.ts` — `PLACEHOLDERS` reais + `resolverPlaceholder()` + `TEMPLATES_INICIAIS`.

## Regras-chave validadas
- **Disparo é POR PERÍODO (janela cronobiológica), não por fórmula.** Múltiplos horários na mesma janela = 1 ÚNICA mensagem listando tudo. "Paciente empresário não é incomodado a toda hora."
- **9 períodos pré-cadastrados** em `periodos_dia` (sigla SEMPRE maiúscula): JE/IM/MM/AL/IT/MT/NO/FN/CE, cada um com janela_inicio/fim, emoji, cor_hex, descrição cronobiológica.
- **Mensagem é RICA, não "fórmula encaminhada":** placeholders `{NOME_PERIODO}` `{EMOJI_PERIODO}` `{JANELA_PERIODO}` `{LISTA_FORMULAS}` `{POSOLOGIA}` `{VIA}` `{HORARIO_DOSE}` `{OBS_DOSE}` + carta de encantamento opt-in.
- **dose ≠ cápsula** já é placeholder oficial `{OBS_DOSE}` (exemplo: "dose não é sempre igual a 1 cápsula"). Confirma a "Regra de Ferro" do `001_prescricao_universal.sql`: dose = princípio ativo (mg), farmácia desdobra em cápsulas.
- **Carta de Encantamento** = matriz períodos × cenários + janela de validade, OPT-IN (default desligada). "Encantar sem cansar."

## Decisões Caio (bate-martelo desta wave)
- Cadastro farmácia: **A2** (pool disponível no Parmavault, cada clínica liga com 1 clique — NÃO propaga automático).
- Prescrição rápida: **B1** (turbinar a `/prescricao-rapida` existente com estrutura completa: blocos+dose+período/horário+posologia estruturada), o mais completo possível.
