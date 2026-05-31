# PROPOSTA · DOSE POR PERÍODO + POSOLOGIA PADRÃO DA FÓRMULA

Data: 31/05/2026
Autor: Dr. Replit
Tema: Dose individualizada por período no cockpit de prescrição + fixar posologia
usual da fórmula + estado real do cockpit externo.
Status: PARCIAL CONSTRUÍDO (item 1 já no mockup) · aguarda martelo A/B/C dos itens 2 e 3.

---

## 1. Dose individualizada por período (CONSTRUÍDO)

1.1 Pedido do Caio: na mesma fórmula, doses diferentes por período.
1.2 Exemplo dele: blend = 2 doses de manhã (07h) + 1 dose à noite (20h).
1.3 Solução: cada item VO agora tem uma LISTA de "tomadas".
1.4 Cada tomada = PERÍODO + HORÁRIO + nº de DOSES, editável e removível.
1.5 Botão "+ TOMADA" adiciona quantas janelas o médico quiser.
1.6 O TOTAL/DIA é a SOMA das doses das tomadas (2 + 1 = 3).
1.7 A linha QUANTIDADE mostra o mapa: "QUANTIDADE: 3 DOSES/DIA · 2 MM + 1 NO".
1.8 Cada tomada vira uma janela própria de disparo na mensageria cronobiológica.
1.9 Injetáveis (EV/IM/SC) seguem com linha única (1 aplicação por sessão).

Decisão 1 — formato da dose por período:
- Opção A (RECOMENDADA · já construída): lista de tomadas no VO, soma automática.
- Opção B: campo único de texto livre ("2 manhã / 1 noite") sem estrutura.
- Opção C: matriz fixa manhã/tarde/noite com 3 caixinhas sempre visíveis.
- Default: A.

---

## 2. Fixar a posologia USUAL da fórmula

2.1 Pedido: ao cadastrar a fórmula, gravar o modelo de posologia mais usado.
2.2 Esse modelo aparece pré-preenchido toda vez que a fórmula é puxada no cockpit.
2.3 Sempre editável depois (no cockpit interno e no externo).
2.4 Fato técnico confirmado: o modelo de dados JÁ suporta isso.
2.5 Tabela `formulas_master` tem coluna `posologia_padrao`.
2.6 Tabela `formula_blend` tem coluna `posologia`.
2.7 A tela de cadastro fica em `clinica-motor` → Catálogo → aba "Fórmulas".
2.8 No mockup já marquei o blend de exemplo com `posologiaPadrao: true`.

Decisão 2 — onde o médico fixa a posologia padrão:
- Opção A (RECOMENDADA): na tela Catálogo → Fórmulas (fonte da verdade), MAIS
  um botão "FIXAR COMO PADRÃO" no próprio cockpit que grava de volta no catálogo.
- Opção B: só na tela Catálogo → Fórmulas (cockpit nunca grava padrão).
- Opção C: só no cockpit (memória local, não vai pro catálogo).
- Default: A.

---

## 3. Cockpit externo sugere fórmulas? (CORREÇÃO IMPORTANTE)

3.1 Você perguntou: o cockpit externo já sugere as fórmulas? Sim ou não?
3.2 Resposta honesta pelo código de HOJE: NÃO.
3.3 O portal do paciente hoje é só de feedback e aderência.
3.4 O paciente DIGITA o nome da fórmula pra relatar como se sentiu.
3.5 Ele informa aderência, bem-estar, resultado, efeitos colaterais.
3.6 Isso grava na tabela `acompanhamento_formula`.
3.7 NÃO existe hoje sugestão automática de fórmula pro paciente no portal.
3.8 A sugestão/pré-preenchimento de fórmula só existe no lado do médico.

Decisão 3 — o que fazer com o cockpit externo:
- Opção A: manter portal só como feedback (estado atual), sugestão só lado médico.
- Opção B (RECOMENDADA se a visão é essa): construir, no portal externo, a
  exibição das fórmulas JÁ prescritas com a posologia padrão, paciente confirma
  ou ajusta a tomada (puxando o mesmo `posologia_padrao` do catálogo).
- Opção C: portal externo sugere fórmulas NOVAS (não prescritas) — não recomendo,
  invade decisão médica.
- Default: B.

---

## Pendências pro Caio martelar

P1: Decisão 1 — confirmar A (dose por período em lista de tomadas).
P2: Decisão 2 — confirmar A (fixar padrão no catálogo + botão no cockpit).
P3: Decisão 3 — confirmar B (portal externo mostra fórmula prescrita + posologia
    padrão pro paciente confirmar/ajustar).
P4: Caso queira, posso aplicar a lista de tomadas também aos injetáveis.
