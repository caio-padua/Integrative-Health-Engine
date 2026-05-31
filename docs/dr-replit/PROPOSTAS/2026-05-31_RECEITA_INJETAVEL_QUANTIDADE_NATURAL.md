# Proposta — Rodapé do injetável em linhas rotuladas explícitas

Data: 31/05/2026
Origem: refinamento do CEO Caio. Primeiro testei a frase consolidada
"Quantidade: 6 ampolas ( 1 ampola a cada 7 dias )". Caio respondeu que a
fórmula está perfeita e propôs, pros injetáveis, o formato rotulado:

```
Coenzima Q10 100mg
Aplicar 1 ou 2 Ampola IM ( depende do caso ) - Antes do Café da Manhã
Quantidade: 6 Ampolas
Sessões: 6
Frequência: A cada 7 dias
```

## 1. Decisão

1.1. Escolhido o formato rotulado explícito (opção do Caio) em vez da frase consolidada.

1.2. Motivo: um fato por linha, escaneável, alinhado à preferência TDAH do Caio.

## 2. Formato final do rodapé (só injetável)

2.1. "Quantidade: N {unidade-plural}" — total a dispensar (vem das sessões).

2.2. "Sessões: N" — número de aplicações.

2.3. "Frequência: A cada 7 dias" — frequência traduzida em linguagem natural.

## 3. Traduções de frequência

3.1. 1×/sem ou semanal → "A cada 7 dias".

3.2. quinzenal → "A cada 15 dias"; mensal → "A cada 30 dias".

3.3. diária → "Diária"; única → "Dose única".

3.4. 2×/sem → "2× por semana"; fora do mapa → texto original (sem quebrar).

## 4. A linha "Aplicar 1 ou 2 Ampola ( depende do caso )"

4.1. O campo QTD é texto livre — o médico digita "1 ou 2 ampola ( depende do caso )".

4.2. Sai como "Aplicar {qtd} {via} — {período}", sem relógio (horário vive na mensageria).

## 5. Escopo / segurança

5.1. Vale só pro injetável (EV/IM/SC); VO/IMP/PRC mantêm a linha única "Quantidade: ...".

5.2. Sem migration, sem mudança de dados — só o texto do preview.
