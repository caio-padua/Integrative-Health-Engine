---
name: Vocabulario de posologia Pawards
description: Definicoes clinicas que o CEO travou para posologia, frequencia, tomada, via — usar exatamente assim em telas, glossarios e codigo.
---

o CEO travou estes significados (03/06/2026). Sao decisao de dominio, nao derivaveis do codigo.

- **Posologia** = instrucao completa de uso: dose + VIA DE ADMINISTRACAO + frequencia + periodo + observacao. A "via" nunca pode faltar.
- **Frequencia** = o INTERVALO, sempre em DIAS, em que o item SE REPETE (consulta, aplicacao injetavel IM/EV/SC, procedimento, receita recorrente). Ex: consulta a cada 30/45 dias; aplicacao IM a cada 21 dias; receita manipulada a cada 30 dias. NAO e numero de vezes por dia.
- **Tomada** = como o paciente usa DURANTE O DIA: a quantidade de doses e a forma (capsulas, comprimidos, ampolas, frascos, aplicacoes) por momento.
- **Dose** != capsula (regra de ferro ja existente).

**Why:** termos eram confundidos (frequencia x tomada); o CEO corrigiu manualmente no glossario revisado.
**How to apply:** em qualquer UI/PDF/glossario/campo de schema sobre posologia, respeitar estes nomes e significados. Frequencia de procedimentos/injetaveis/consultas e sempre em dias.
