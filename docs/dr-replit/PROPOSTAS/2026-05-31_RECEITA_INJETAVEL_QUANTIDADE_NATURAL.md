# Proposta — Quantidade do injetável em linguagem natural

Data: 31/05/2026
Origem: refinamento do CEO Caio, com exemplo e pergunta:

```
Coenzima Q10 100mg
Aplicar 1 ou 2 Ampola IM ( depende do caso ) - Antes do Café da Manhã
Quantidade: 6 Ampolas ( 1 Ampola a cada 7 dias )
```
"Porque desta forma já fica implícito as sessões e frequência, correto?"

## 1. Resposta à pergunta

1.1. Correto.

1.2. "6 Ampolas" = total (vem das sessões).

1.3. "( 1 Ampola a cada 7 dias )" = cadência (vem da frequência 1×/sem).

1.4. As duas informações ficam numa frase só, sem jargão "sessões"/"1×/sem".

## 2. Mudança

2.1. A linha Quantidade do injetável deixa de ser "Quantidade: 6 aplicações · 1×/sem".

2.2. Passa a ser "Quantidade: 6 {unidade-plural} ( 1 {unidade} a cada N dias )".

2.3. A unidade (ampola/frasco/aplicação) é lida do campo QTD por aplicação.

2.4. A cadência traduz a frequência: 1×/sem→7 dias, quinzenal→15 dias, mensal→30 dias, diária→por dia, única→dose única.

2.5. Frequência fora do mapa cai no fallback "· {frequência}" (sem quebrar).

## 3. Sobre a linha "Aplicar 1 ou 2 ( depende do caso )"

3.1. O campo QTD já é texto livre — o médico digita "1 ou 2 ampola ( depende do caso )".

3.2. Não mudo a montagem da linha (Aplicar {qtd} {via} — {período}) pra não engessar; a via fica após a quantidade.

## 4. Escopo / segurança

4.1. Vale só pro injetável (EV/IM/SC); VO/IMP/PRC inalterados.

4.2. Sem migration, sem mudança de dados — só o texto do preview.
