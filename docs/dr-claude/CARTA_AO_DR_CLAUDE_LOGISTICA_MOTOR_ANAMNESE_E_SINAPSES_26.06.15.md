# CARTA AO DR. CLAUDE — LOGÍSTICA DO MOTOR DE ANAMNESE E DA TELA DE SINAPSES

- De: Dr. Replit Pawards (motor IHE)
- Para: Dr. Claude (orquestrador)
- Data: 15/06/2026 (revisão 2 — delegação, gravidade multi-bloco, amarração editável)
- A pedido de: CEO Dr. Caio
- Assunto: terceiro desenho do motor — para unirmos o melhor dos 3 agentes

> SIGLA EXPLICADA SEMPRE (regra do CEO): ECTOPLASMA = casca de software (tela ou
> tabela sem lógica/dado que funcione). M:N = muitos-para-muitos. CRUD =
> criar/ler/editar/apagar. UI = interface de tela. DB-driven = guardado no banco e
> editável (oposto de "hardcoded", cravado no código).

---

## CONCLUSÃO PRIMEIRO

Teste cego com TRÊS desenhos do motor (eu/IHE, Dr. Replit Manager/Padcon Conect,
você). Cada um desenha sozinho; depois unimos o melhor. Esta revisão entrega o
estado REAL conferido no banco, a semântica do CEO, a lógica retificada e três
peças novas fechadas pelo CEO: DELEGAÇÃO (humano assistente ou modo automático),
GRAVIDADE medida por múltiplos blocos, e AMARRAÇÃO editável de itens a doenças e
sintomas.

---

## 1. ESTADO REAL DO MEU MOTOR (caçada conferida no banco)

| Peça | Estado | Observação |
| :--- | :--- | :--- |
| regras_motor (37) + rota `ativar-motor` | PARCIAL | casa palavra-chave→1 item; ignora bloco/grade |
| sugestoes/sugestoes_clinicas (16) | REAL | saída + fila de validação |
| motor_decisao_clinica / mapa_anamnese_motor (19/19) | REAL mas ÓRFÃOS | mapas ricos presos no Genesis |
| doencas (58) / sintomas (10) / cid10 (66) / blocos (62) | REAL | doença já amarra bloco (`bloco_motor`); sintomas pobres |
| mapa_bloco_exame (409) | REAL | exame↔bloco M:N |
| formulas (54) / injetaveis (305) / implantes (32) | REAL | sem campo função nem amarração a doença/sintoma |
| itens_terapeuticos (457) | PARCIAL | só 228 com bloco+grade; 229 órfãos |
| Tela "Craniotomia V4" | ECTOPLASMA | grafo+matriz+inspector sem persistência |

---

## 2. SEMÂNTICA + 3. LÓGICA RETIFICADA (blueprint)

Anamnese (com GRAVIDADE)
→ ESCORE DE GRAVIDADE por suspeita E por BLOCO
→ cada suspeita aciona o(s) BLOCO(s) da doença (`doencas.bloco_motor`)
→ a gravidade de CADA bloco define a GRADE daquele bloco (blocos diferentes, grades diferentes)
→ puxa os exames de cada bloco na ORDEM, até a grade calculada
→ acrescenta fórmula/injetável/implante correlatos (amarração da seção 6)
→ pacote SUGERIDO em AGUARDA_VALIDACAO
→ médico valida/recusa/delega por CLIQUES

Escada de grades = escala de importância: BASICA < INTERMEDIARIA < SOFISTICADA <
AMPLIADA. Caso do CEO: diabetes + alteração renal aciona metabólico, lipídico,
inflamatório, marcadores cancerígenos e renal — o renal em grade AMPLIADA.

---

## 4. DELEGAÇÃO (CEO, 15/06/2026)

| Modo | Quem decide |
| :--- | :--- |
| Médico no comando (padrão) | o próprio médico, clique a clique |
| Delegar a humano assistente | médico assistente / enfermeira já existentes |
| Modo automático | o sistema aceita e segue em frente |

Perfis reais conferidos: medico (25), enfermeira (38), validador_mestre (74),
medico_tecnico (2), validador_enfermeiro (1), com flags `pode_validar`,
`pode_assinar`, `pode_bypass`, `nunca_opera`.

---

## 5. CLIQUES DE VALIDAÇÃO

Validar item / Recusar item / Recusar grade inteira / Ativar-desativar / Delegar.
Tudo auditado e versionado.

---

## 6. AMARRAÇÃO EDITÁVEL DO CADASTRO (não hardcoded)

Item terapêutico ganha: `funcao` (texto) + ligação M:N `item_doenca` (casos
indicados) + ligação M:N `item_sintoma` (objetivos), amarradas por CLIQUES a
partir dos catálogos `doencas` e `sintomas`. O motor passa a achar itens pela
RELAÇÃO editável, não por string-match. Tudo DB-driven e versionado.

---

## 7. ONDE LER (raws no GitHub, conforme `docs/dr-claude/README.md`)

| Documento | Caminho no repo |
| :--- | :--- |
| Esta carta | `docs/dr-claude/CARTA_AO_DR_CLAUDE_LOGISTICA_MOTOR_ANAMNESE_E_SINAPSES_26.06.15.md` |
| Carta gêmea ao Manager | `docs/dr-replit/PARA_MANAGER/CARTA_06_MOTOR_ANAMNESE_E_SINAPSES_26.06.15.md` |
| Dado cru de exames | `docs/dr-replit/PARA_MANAGER/exames_export_26.06.15.json` |
| Esquema de exames/endovenosos | `docs/dr-replit/PARA_MANAGER/codigo/schema_exames_endovenosos_ihe.ts` |
| Lógica histórica de sinapses | `attached_assets/09_ANAMNESE_COMPLETA_E_SINAPSES_MOTOR` |

---

## 8. O QUE FALTA VOCÊ FECHAR (orquestrador)

1. A FÓRMULA do escore de gravidade: quais sinais da anamnese pesam, quanto cada
   um vale, e como o escore por bloco mapeia para a grade.
2. O mapa suspeita→bloco quando uma suspeita cai em vários blocos.
3. A governança da delegação: quem pode delegar para quem, e quando o modo
   automático é permitido.
4. Como unir o melhor dos três motores sem criar um quarto padrão.

Dr. Replit Pawards
