---
name: Chrome da faixa 1 do cockpit Pawards (Penumbra)
description: Regras de posicionamento e composição da chrome superior do cockpit do paciente — ordem dos clusters, nome operador, busca dupla, toggles segmentados. Aplica-se a qualquer tela com chrome equivalente.
---

# Chrome faixa 1 · ordem de clusters (esquerda → direita)

```
[LOCAL][GLOBAL] · [1][2][3] · [CLARO][ESCURO] · [⌕ENTIDADES][⌕EVENTOS] · ←flex→ · [NOME·CARGO] | [♪SOM][CONFIG][SAIR]
```

Regras:

1. **Toggles segmentados** (LOCAL/GLOBAL, níveis 1·2·3, CLARO/ESCURO) ficam à esquerda, agrupados por função, com gap entre grupos.
 **Por quê**: estados bi/tri-modais ficam visualmente equivalentes (P15 simetria). Não usar botão único alternante — a baixa dispersão exige ambas as opções sempre visíveis.

2. **Buscas** ocupam o meio em `flex: 1`. Sempre 2 (Entidades teal · Eventos âmbar), nunca uma só. Cores distintas porque são canais cognitivos diferentes.

3. **Cluster operador** encostado na borda direita via `marginLeft: auto`. Estrutura:
 `[NOME · CARGO] | [SOM][CONFIG][SAIR]`
 Divisor vertical de 1px separa identidade (accent teal) de controles de sistema (ok/warn/danger). SAIR sempre na borda.

4. **Nome operador formatado**: primeiro nome completo + iniciais com ponto dos nomes do meio + último sobrenome completo, maiúsculas.
 Ex. (placeholder sintetico): `Nome Meio1 Meio2 Sobrenome` → `NOME M. M. SOBRENOME`.
 **Por quê**: chrome tem `fontSize: 10` uniforme (P08); nome completo polui, só primeiro perde formalidade institucional. Iniciais preservam identidade jurídica em ~18 chars.
 **Casos abertos** (Q015 do doc 23): "Filho/Junior/Neto", hifenizados, partículas ("de", "da") — regra ainda não fechada.

5. **Cargo na chrome** vem da função real do operador (`usuarios.perfil` ou campo dedicado — Q014 aberta), nunca hardcoded "MÉDICO". O CEO aparece como CEO, a enfermeira como ENFERMEIRA.

6. **SOM toggle** com ícone `♪` funcional: ON = accent ok verde + label "SOM"; OFF = `text-decoration: line-through` no ♪ + label "MUDO" + cor neutra. Posição: primeiro botão após o divisor identidade↔sistema.

# Como aplicar

Vale pra **toda tela com chrome equivalente** (Portal Paciente, Padcom, Padcon, Motor V4, qualquer dashboard novo). Quebrar essa ordem sem justificativa documentada como nova decisão D0NN no doc-edital correspondente = retrabalho garantido.
