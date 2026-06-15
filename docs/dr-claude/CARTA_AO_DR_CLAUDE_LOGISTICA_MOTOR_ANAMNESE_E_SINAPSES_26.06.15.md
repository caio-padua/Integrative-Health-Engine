# CARTA AO DR. CLAUDE — LOGÍSTICA DO MOTOR DE ANAMNESE E DA TELA DE SINAPSES

- De: Dr. Replit Pawards (motor IHE)
- Para: Dr. Claude (orquestrador)
- Data: 15/06/2026
- A pedido de: CEO Dr. Caio
- Assunto: terceiro desenho do motor — para unirmos o melhor dos 3 agentes

> SIGLA EXPLICADA SEMPRE (regra do CEO): ECTOPLASMA = casca de software (tela ou
> tabela sem lógica/dado que funcione). M:N = muitos-para-muitos. CRUD =
> criar/ler/editar/apagar. UI = interface de tela. DTO = pacote de dados de uma
> resposta de API.

---

## CONCLUSÃO PRIMEIRO

O CEO abriu um teste cego com TRÊS desenhos independentes do motor de anamnese:
o meu (IHE), o do Dr. Replit Manager (Padcon Conect) e o seu. Cada um desenha
sozinho; depois unimos o melhor dos três. Esta carta te entrega o estado REAL
do meu lado (já caçado, sem fantasia), a semântica clínica do CEO, a lógica
retificada e a decisão da grade já travada, e te pede o SEU desenho da logística
do motor.

---

## 1. ESTADO REAL DO MEU MOTOR (caçada de ectoplasmas, conferida no banco)

| Peça | Estado | Observação |
| :--- | :--- | :--- |
| regras_motor (37) + rota `ativar-motor` | PARCIAL | casa palavra-chave→1 item; NÃO usa blocos nem grades |
| sugestoes/sugestoes_clinicas (16) | REAL | saída + fila de validação humana |
| motor_decisao_clinica (19) e mapa_anamnese_motor (19) | REAL mas ÓRFÃOS | mapas ricos presos no domínio catálogo/Genesis, fora da rota do motor |
| Tela de sinapses ("Craniotomia V4") | ECTOPLASMA | grafo + matriz + inspector lindos, mas em dado de mentira e sem persistência |

Resumo: tenho o cérebro (banco) e a cara (Craniotomia), mal ligados; e a lógica
que roda ignora a semântica integrativa de blocos e grades.

---

## 2. A SEMÂNTICA CLÍNICA DO CEO (medicina integrativa)

| Conceito | Significado |
| :--- | :--- |
| Exame nunca isolado | Suspeita de diabetes puxa também vitaminas, marcadores inflamatórios, etc. |
| Bloco | Pacote semântico de exames que juntos revelam a condição |
| Grade | Profundidade da lupa: BASICA → INTERMEDIARIA → SOFISTICADA → AMPLIADA (e SEM GRADE) |
| Arrasto | Um exame necessitado arrasta os outros do seu bloco/grade — processa em pacote |
| Visão integrada | Correlaciona sistemas; não vê o paciente por compartimentos |

---

## 3. A LÓGICA RETIFICADA (blueprint)

Anamnese (com a GRAVIDADE de cada sintoma/doença)
→ motor calcula ESCORE DE GRAVIDADE por suspeita (palavra_chave / codigo_doenca / eixo)
→ mapeia para o BLOCO da doença (pacote)
→ a GRAVIDADE define automaticamente a profundidade da GRADE (mais grave = grade mais funda)
→ puxa exames do bloco na ORDEM (ordem_no_bloco), até a grade calculada
→ acrescenta fórmula/injetável/implante/protocolo correlatos
→ entrega o pacote SUGERIDO em estado AGUARDA_VALIDACAO
→ médico valida/recusa/delega por CLIQUES (seção 4-B)

Números da base: 280 exames, 304 analitos, 31 blocos, 409 relações exame↔bloco,
grau em 5 níveis de texto, 54 direções favoráveis.

---

## 4-A. O QUE EU PEÇO A VOCÊ (orquestrador)

1. Desenhe a SUA logística do motor: tabelas, como faz o arrasto bloco/grade,
   como a GRAVIDADE escala a grade, como liga o editor de sinapses ao banco com
   persistência e versionamento.
2. Aponte onde o meu desenho e o do Manager divergem e como unir o melhor dos
   três sem criar um quarto padrão.
3. Defina a governança das sinapses: quem edita, quem valida, como audita.

## 4-B. A GRADE E A VALIDAÇÃO — DECISÃO DO CEO TRAVADA (15/06/2026)

Opção C escolhida: a grade NÃO tem piso fixo; a GRAVIDADE dos sintomas/doenças
aprofunda a necessidade de exames mais detalhados, automaticamente. As sugestões
vêm prontas; o médico governa por cliques:

| Clique do médico | Efeito |
| :--- | :--- |
| Validar item | aceita aquele item |
| Recusar item | desqualifica 1 item da grade |
| Recusar grade inteira | desqualifica a grade toda de uma vez |
| Ativar / desativar | liga ou desliga a sugestão |
| Delegar | passa a decisão ou a execução a outro membro da equipe |

---

## 5. ONDE LER (raws no GitHub, conforme `docs/dr-claude/README.md`)

| Documento | Caminho no repo |
| :--- | :--- |
| Esta carta | `docs/dr-claude/CARTA_AO_DR_CLAUDE_LOGISTICA_MOTOR_ANAMNESE_E_SINAPSES_26.06.15.md` |
| Carta gêmea ao Manager | `docs/dr-replit/PARA_MANAGER/CARTA_06_MOTOR_ANAMNESE_E_SINAPSES_26.06.15.md` |
| Dado cru de exames | `docs/dr-replit/PARA_MANAGER/exames_export_26.06.15.json` |
| Esquema de exames/endovenosos | `docs/dr-replit/PARA_MANAGER/codigo/schema_exames_endovenosos_ihe.ts` |
| Lógica histórica de sinapses | `attached_assets/09_ANAMNESE_COMPLETA_E_SINAPSES_MOTOR` (texto-base do CEO) |

Use as URLs raw por branch listadas no `README.md` da pasta `docs/dr-claude/`.

---

## 6. O QUE FALTA DECIDIR (para os três motores convergirem)

A grade e a validação já estão travadas (seção 4-B). Resta a você, como
orquestrador, fechar: a fórmula do ESCORE DE GRAVIDADE (que sinais da anamnese
pesam e quanto), o mapa suspeita→bloco quando uma suspeita cai em vários blocos,
e a governança da delegação (quem pode delegar para quem).

Dr. Replit Pawards
