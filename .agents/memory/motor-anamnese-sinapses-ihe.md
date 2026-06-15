---
name: Motor de anamnese e tela de sinapses (IHE/Pawards)
description: Onde mora o motor de anamnese, o que é real x ectoplasma, e a semântica clínica de blocos/grades que a lógica atual ignora.
---

# Motor de anamnese + tela de sinapses no IHE

O CEO afirmou (15/06/2026) que já existia um motor de anamnese e uma tela de
sinapses "perdidos". Caçada confirmou: existem, mas mal ligados.

## Onde mora (cérebro, no banco/código — REAL, com dado)
- `regras_motor` (schema `regrasMotor.ts`) usada pela rota POST `/anamnese/:id/ativar-motor` em `routes/anamnese.ts`. Lógica POBRE: string-match palavra-chave→1 item; NÃO usa blocos nem grades.
- `sugestoes`/`sugestoes_clinicas` (`sugestoes.ts`, `routes/motorClinico.ts`) = saída do motor + fila de validação humana.
- `motor_decisao_clinica` e `mapa_anamnese_motor` (`schema/catalogo.ts`, usadas em `routes/catalogo.ts` + `genesis.ts`): mapas RICOS (pergunta/doença/eixo → exame+fórmula+injetável+implante+protocolo) mas ÓRFÃOS — presos no domínio catálogo/Genesis, fora da rota do motor.

## Tela de sinapses = "Craniotomia V4" — ECTOPLASMA
- `mockup-sandbox/src/components/mockups/craniotomia/` (GrafoSinapses, MatrizDensa, ArvoreDossier, TercoTablePanel, `_mockData.ts`), embutida via `clinica-motor/src/pages/craniotomia.tsx`.
- Grafo (linhas sintoma→ação) + blocos empilhados + inspector existem, mas rodam em `_mockData.SINAPSES` (mentira) e o editar NÃO grava. Forma da sinapse: `{b1,b2,sinal,tipo(EXAM/FORM/INJE/IMPL/PROT),peso,estado(ATIVO/PAUSADO/BLOQUEADO/AGUARDA_VALIDACAO),requerValidacao,governanca,hits30d}`.

## A semântica que a lógica atual IGNORA (alma do motor, palavra do CEO médico integrativo)
- **Why:** exame nunca é isolado; bloco = pacote semântico da doença; grade = profundidade da lupa (BASICA→INTERMEDIARIA→SOFISTICADA→AMPLIADA, + SEM GRADE). Um exame necessitado ARRASTA os outros do seu bloco/grade (M:N: 31 blocos, 409 relações). Mais exames = mais correlação.
- **How to apply:** motor correto = anamnese→suspeita(palavra_chave/codigo_doenca)→BLOCO da doença→exames na `ordem_no_bloco`→escala pela GRADE→+fórmula/injetável correlatos→fila de validação humana. NÃO é string-match de 1 item.

## Decisão clínica TRAVADA pelo CEO (15/06/2026) — opção C
- Grade SEM piso fixo: a GRAVIDADE dos sintomas/doenças aprofunda a grade automaticamente (mais grave = grade mais funda = exames mais detalhados).
- Sugestões saem prontas (AGUARDA_VALIDACAO); médico governa por CLIQUES: validar item, recusar 1 item, recusar a GRADE INTEIRA de uma vez, ativar/desativar, e DELEGAR a outro membro. Tudo auditado/versionado.
- Pendências que o Dr. Claude (orquestrador) deve fechar: fórmula do escore de gravidade; mapa suspeita→bloco quando a suspeita cai em vários blocos; governança da delegação.

## Delegação (3 modos, CEO 15/06/2026)
- (1) médico no comando; (2) delegar a humano assistente REAL (perfis conferidos: medico 25, enfermeira 38, validador_mestre 74, medico_tecnico 2, validador_enfermeiro 1; flags pode_validar/pode_assinar/pode_bypass/nunca_opera); (3) MODO AUTOMÁTICO (aceita sugestões e segue). Respeitar flags + auditar.

## Gravidade é POR BLOCO, não global (CEO 15/06/2026)
- Escore por bloco soma: intensidade do sintoma + nº de sistemas afetados + sinais de alarme (→ blocos oncológicos) + dano de órgão-alvo/comorbidade + exame prévio alterado. Cada bloco abre na SUA grade. Ex.: diabetes+renal aciona metabólico/lipídico/inflamatório/cancerígeno/renal, renal em GRADE AMPLIADA. Escada de nomes (básica<intermediária<sofisticada<ampliada) = escala de importância.

## Amarração editável do cadastro (gap a construir)
- Catálogos REAIS: doencas(58), sintomas(10, pobre), cid10(66), blocos(62), mapa_bloco_exame(409); itens: formulas(54)/injetaveis(305)/implantes(32); itens_terapeuticos(457, só 228 com bloco+grade → 229 órfãos). doencas já amarra bloco via coluna `bloco_motor`.
- Gap: itens NÃO têm `funcao` nem amarração estruturada a doença/sintoma. Arquitetura: campo `funcao` + ligações M:N `item_doenca` (casos indicados) e `item_sintoma` (objetivos), editáveis por clique, DB-driven (nunca hardcoded). Sintomas precisam enriquecer.

## Obra pendente (Wave, autorizada "sem perguntar")
Ligar Craniotomia↔banco (ler regras reais), unir os mapas órfãos à rota, atualizar a rota V9→semântica de bloco/grade + gravidade por bloco, dar persistência+versionamento ao editor, criar amarração editável item↔doença/sintoma, preencher 229 itens órfãos e enriquecer sintomas.
