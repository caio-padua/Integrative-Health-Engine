# Proposta — Receita do injetável lidera com NOME + DOSE

Data: 31/05/2026
Origem: pedido do CEO Caio ("última coisa a ser corrigido"), com exemplo:

```
Coenzima Q10 100mg
Aplicar 1 Ampola IM - Antes do Café da Manhã
```

## 1. Diagnóstico

1.1. Hoje o bloco "PRESCRIÇÃO · COMO SAI NA RECEITA" do injetável NÃO nomeia o medicamento.

1.2. Ele começa direto em "Aplicar 1 ampola IM — Início da Manhã — às 08h".

1.3. Uma receita impressa precisa ser autocontida: dizer QUAL ativo + dose ANTES da instrução.

## 2. Mudanças

2.1. Bloco da receita do injetável passa a ter 1a linha = `{nome} {dose}` (ex: "CoQ10 Ubiquinol + PQQ 100 + 20 mg").

2.2. Linha de instrução fica "Aplicar {qtd} {via} — {período}".

2.3. O relógio "— às HHh" sai do TEXTO da receita do injetável (o horário continua vivo no campo e na mensageria).

## 3. Decisão relógio (A/B/C)

3.1. A (DEFAULT) — receita do injetável mostra só o período, sem "às HHh" (igual ao exemplo do Caio).

3.2. B — manter "— às HHh" no fim.

3.3. C — mover o horário pra uma linha de observação cinza.

3.4. Recomendo A porque o exemplo do Caio é período-only e injetável aplicado em clínica não precisa de relógio na receita.

## 4. Escopo / segurança

4.1. Vale só pro injetável (EV/IM/SC); VO/IMP/PRC inalterados.

4.2. Na FOLHA o nome+dose já aparece no cabeçalho do item — não duplica (título só no card via prop `comTitulo`).

4.3. Sem migration, sem mudança de dados — só layout do preview.
