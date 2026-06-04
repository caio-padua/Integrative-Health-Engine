---
name: Cognicao do Caio (como ele pensa layout)
description: O modelo mental do Caio (Asperger + TDAH + TOC) aplicado a design. O PORQUE por tras de cada regra PENUMBRA. Leia para entender o gosto e o raciocinio, nao so as regras.
---

# Como o Caio pensa um bom layout

Caio e o CEO da Pawards, medico, perfil **Asperger + TDAH + TOC**, e
frequentemente exausto (turnos de 12h). O sistema e o cockpit operacional dele.
Design, pra ele, e decisao COGNITIVA, nao estetica. Entender isto e o que
permite montar qualquer tela "do jeito dele" sem ele precisar revisar 5 vezes.

## 1. Os tres traços e como viram regra

1.1. **TDAH -> anti-dispersao.**
- So UM elemento pode estar "vivo" (animado) por tela (K1 Pulso Unico).
- Multiplos estimulos simultaneos = colapso cognitivo, ele perde o fio.
- Por isso respiracao e privilegio do item ATIVO, nunca de varios ao mesmo tempo.
- Ele opera por **batida de olho**: a tela tem que entregar a informacao em <2s
  sem ele caçar. Densidade alta e desejada; scroll pra achar o basico e inimigo.

1.2. **Asperger -> ordem explicita e literal.**
- Hierarquia nunca pode ser inferida; tem que estar dada por posicao, contraste e
  moldura. Nada de "o usuario entende que isto e mais importante".
- Linguagem literal e semantica: nomes completos, sem abreviacao, sem ambiguidade
  (`pode_emitir_receita`, nao `can_emit`; `perfil`, nunca `role`).
- Metafora estavel: o sistema e um "comodo de casa" / "instrumento calibrado",
  nao um "site". Ele reconhece o sistema pela chrome fixa em qualquer estado.

1.3. **TOC -> alinhamento e categorizacao absolutos.**
- **Linha vertical imaginaria**: tudo alinha por uma coluna invisivel a esquerda
  (LINHA_ESQ = 16px). Um elemento fora do eixo causa desconforto fisico real.
- Tudo embaixo do outro, tudo categorizado. Disposicao aleatoria e proibida.
- Numeros tabulares (tabular-nums) pra casa decimal alinhar verticalmente.
- Quina 90 graus: canto arredondado "vaza", a quina "fecha" o retangulo.

## 2. O que e "bonito" pro Caio (a estetica dele)

2.1. **Classico e austero**, nao moderno. Referencia: documento juridico bem
formatado, nao SaaS colorido com cards arredondados.

2.2. **Denso, tecnico, hierarquico, calmo.** A sintese de 6 referencias dele:
documento juridico + terminal Bloomberg + instrumento medico hospitalar +
cockpit de aeronave + interface de DAW profissional + visor de microscopio.

2.3. **Elegante = sobrio.** Elegancia vem da ausencia de ruido, do alinhamento
perfeito e da tipografia mono, nao de cor ou decoracao. Sem icone decorativo:
toda decoracao e tipografica ou estrutural (moldura).

2.4. **Neon com proposito.** A cor pastel-neon nao e enfeite: e o sistema de
memoria espacial dele (decora dominio pela cor). Neon aleatorio o irrita; neon
semantico o orienta.

2.5. **Penumbra.** Ele gosta de tela levemente rebaixada (filtro brightness/
contrast) — "monitor de hospital / CRT profissional" — reduz cansaco em turno
longo. Branco hospitalar puro e claro demais; por isso o claro e "papel azulado claro",
nao branco.

## 3. Como ele valida (e por que pede revisao)

3.1. Ele itera ao vivo, muitas horas, comparando variantes lado a lado no
mockup-sandbox/canvas. Ja gastou tempo e dinheiro nisto — respeite o investimento.

3.2. Se voce entregar rapido demais, ele vai pedir pra revisar tudo de novo.
Ele NAO quer velocidade; quer profundidade e fidelidade ao padrao. Antes de
entregar, releia os principios e o checklist.

3.3. Toda escolha deve vir como **A/B/C + default recomendado**, nunca pergunta
aberta — pergunta aberta o cansa e o trava.

3.4. Decisao vira `.md` antes do codigo (anti-ectoplasma): ele quer o raciocinio
registrado antes da implementacao, pra poder revisar a logica, nao so o pixel.

## 4. Heuristica rapida ("seria aprovado pelo Caio?")

Antes de mostrar qualquer tela, pergunte-se:
- Da pra pegar a informacao principal numa batida de olho (<2s)?
- Existe exatamente UM elemento vivo? (se >1, viola K1)
- Tudo alinha na coluna esquerda de 16px? Algum elemento "solto"?
- Toda quina e 90 graus? Algum radius escapou?
- Todo texto e JetBrains Mono, PT-BR, sem emoji?
- O neon marca identidade/onde-estou e o hover marca acao/o-que-faco? Sem trocar?
- Os nomes sao completos e semanticos? Tem algum `role` ou abreviacao?
Se qualquer resposta for "nao", ainda nao esta pronto.
