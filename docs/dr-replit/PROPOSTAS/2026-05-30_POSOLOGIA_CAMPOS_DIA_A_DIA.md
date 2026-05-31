# Proposta — Posologia campo-a-campo (ferramenta do dia a dia)

Data: 30/05/2026
Tela: GPS CLINICO (mockup-sandbox · prescricao-rapida/GpsPadua.tsx)
Status: PROPOSTA (mockup funcional para teste + validacao de 2 campos)

## 1. Modelo de campos pedido pelo Caio

1.1 DOSE — concentracao do ativo (ex: 500 mg, 1 cap/dia).
1.2 VIA — rota de administracao (EV, IM, SC, VO, IMP, PRC).
1.3 PERIODO — janela cronobiologica (9 janelas JE/IM/MM/AL/IT/MT/NO/FN/CE).
1.4 MENSAGEM — instrucao livre do medico (ex: antes do cafe da tarde, com suco de limao).
1.5 HORARIO — horario exato dentro do periodo selecionado (HH:MM), critico.
1.6 DURACAO — extensao do tratamento em dias (ex: 30 dias, 60 dias, continuo).
1.7 QUANTIDADE — numero de doses por administracao (ex: 2 caps, 1 ampola).
1.8 SESSOES — campo a validar (ver item 3).
1.9 ANCORA — vinculo a algo, campo a validar (ver item 4).

## 2. Agrupamento visual (regra do Caio)

2.1 Campos de MESMO sentido ficam lado a lado.
2.2 Campos de sentido DIFERENTE ficam um embaixo do outro.
2.3 Tudo alinhado por uma linha imaginaria a esquerda (borda esquerda comum).
2.4 Quadradinhos VISIVEIS com borda solida em repouso.
2.5 NEON na cor da via ao passar o mouse ou digitar (foco/hover).

Clusters propostos (de cima para baixo):

2.6 QUANTO — DOSE + QUANTIDADE (lado a lado).
2.7 VIA — sozinho (sentido proprio).
2.8 QUANDO NO DIA — PERIODO + HORARIO (lado a lado).
2.9 EXTENSAO — DURACAO + SESSOES (lado a lado).
2.10 MENSAGEM — sozinho (instrucao livre).
2.11 ANCORA — sozinho (vinculo).

## 3. VALIDAR — o que e SESSOES

3.1 Hoje no codigo SESSOES e usado como multiplicador de custo (preco x sessoes).

Opcoes:

3.2 Opcao A (RECOMENDADO) — SESSOES = numero de comparecimentos do paciente
    para administrar o item (aplica a EV/IM/SC/IMP/PRC, onde o paciente vem a clinica).
    Para VO (uso continuo em casa), SESSOES nao se aplica e fica oculto/zerado.

3.3 Opcao B — SESSOES = numero de repeticoes/recargas (inclui VO como nº de meses).

3.4 Opcao C — SESSOES = numero de aplicacoes por sessao (raro, descartar).

## 4. VALIDAR — o que e ANCORA

4.1 Hoje no codigo ANCORA vincula o item a um marco da jornada
    (1a sessao, S01..S08, penultima, ultima).

Opcoes:

4.2 Opcao A (RECOMENDADO) — ANCORA = marco da jornada/protocolo
    (ex: aplicar na 1a sessao, exames na penultima, estetica na ultima).

4.3 Opcao B — ANCORA = vinculo a uma refeicao/evento do dia
    (ex: ancorado ao cafe, ao treino) — isso ja seria coberto por MENSAGEM + HORARIO.

4.4 Opcao C — ANCORA = vinculo a outro item da prescricao
    (ex: tomar X junto com Y) — util, mas e um 2o tipo de ancora.

4.5 Recomendacao: manter A como ancora-da-jornada e, se o Caio quiser C,
    adicionar um 2o campo ANCORA-ITEM separado depois (nao misturar sentidos).

## 5. Impacto tecnico (aditivo, sem quebra)

5.1 Tipo Substancia ganha 4 campos opcionais: quantidade, duracao, mensagem, horario.
5.2 Campo frequencia permanece (back-compat) = ritmo (diaria, 1x/sem), nao removido.
5.3 Nova const DURACOES (7/15/30/45/60/90 dias, 6 meses, continuo).
5.4 HORARIO ligado ao PERIODO via janelas de _mensageria.ts.
5.5 Mockup funcional e editavel para o Caio testar antes de levar ao app real.
