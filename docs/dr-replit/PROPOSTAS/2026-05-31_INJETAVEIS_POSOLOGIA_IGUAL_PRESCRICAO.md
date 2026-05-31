# Injetáveis EV/IM/SC — posologia igual à prescrição de fórmulas

Data: 31/05/2026
Tela: GPS CLÍNICO (mockup-sandbox · prescricao-rapida/GpsPadua)
Protocolo: anti-ectoplasma (proposta antes do código) + implementação na mesma rodada

## 1. O que o Caio pediu

1.1. IM e EV: frequência **sem dropdown** (texto livre).
1.2. SC: sessão e frequência **continuam com dropdown**.
1.3. Todo campo: **Enter** move pro próximo campo (Tab já fazia).
1.4. SC segue **todas as regras do IM**: pode ter mais de 2 aplicações por dia, mesmo esquema de doses e disposição de duração/horário/período.
1.5. Horário precisa poder ser **zerado/limpo** depois de preenchido.
1.6. SC tem que ficar **igual à prescrição de fórmulas** (período, horário, doses, frase/obs).
1.7. Ao **ver a prescrição**, IM/EV/SC não pareciam posologia — devem usar o mesmo formato da VO.
1.8. IM e EV devem mostrar a **miligramagem fixa** por ml/frasco/ampola — vem do cadastro da fórmula, **não editável** no cockpit.
1.9. IM e SC precisam de campo **quantidade por aplicação** (ex: 2 ampolas de CoQ10 por sessão).
1.10. Formato-alvo: `Coenzima Q10 100mg` + `Aplicar 1 Ampola IM — Antes do Café da Manhã`.

## 2. O que vou corrigir

2.1. **MG fixo (read-only)** — nos injetáveis a DOSE deixa de ser campo editável e vira retângulo somente-leitura (vem do cadastro da fórmula).
2.2. **QTD / APLICAÇÃO** — campo editável de quantidade por aplicação (ex: 1 ampola, 2 ampolas) em EV/IM/SC.
2.3. **Aplicação no dia = TomadasEditor** — EV/IM/SC passam a usar o MESMO editor da VO (horário + período + doses + obs por aplicação, com botão + TOMADA pra mais de 1 por dia).
2.4. **Horário zerável** — botão de limpar (×) ao lado do horário, some o valor sem precisar apagar dígito a dígito.
2.5. **Frequência** — SC mantém sugestões em dropdown (datalist); IM/EV viram texto livre puro.
2.6. **Enter navega** — Enter pula pro próximo campo, Shift+Enter pro anterior, em todos os campos do item.
2.7. **Prescrição igual à VO** — preview e FOLHA dos injetáveis usam o formato `Aplicar {qtd} {via} — {período} — às {hora}` + linha de quantidade (`N aplicações · frequência`).

## 3. Decisão sobre as SETAS (A/B/C)

3.1. Caio pediu Enter, Tab E seta pra mover de campo.
3.2. Problema: seta tem comportamento nativo em campo número (sobe/desce valor), horário (muda hora) e dropdown (troca opção) — sequestrar quebra esses.
3.3. **Opção A (default aplicado)**: Enter + Shift+Enter + Tab navegam; setas ficam com o comportamento nativo.
3.4. Opção B: setas também navegam, mas só nos campos de texto puro (frequência, mensagem, obs).
3.5. Opção C: setas navegam em tudo e o ajuste de número/hora passa a ser só digitando.
3.6. Recomendo **A** — não quebra o stepper de número nem o seletor de hora; se quiser B eu ligo em 2 minutos.

## 4. Escopo técnico

4.1. Arquivo único: `prescricao-rapida/GpsPadua.tsx` (e leitura de `_tokens.ts`).
4.2. Mockup-sandbox — sem backend, sem migration, sem schema.
4.3. Helpers tocados: `linhasPrescricao`, `dosesPorDia`, `NeonInput`, `NeonSelect`, `TomadasEditor`, card do item na `Pilha`, `FolhaConsolidada`.
4.4. Sem renomear rota nem arquivo (continua GpsPadua / display GPS CLÍNICO).
