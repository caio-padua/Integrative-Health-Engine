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

## Tela de sinapses = "Craniotomia" — agora REAL (16/06/2026), era ECTOPLASMA
- `clinica-motor/src/pages/craniotomia.tsx` foi REESCRITA (não é mais iframe do mockup): página real com react-query (useQuery/useMutation), apiFetch, tema PENUMBRA, KPIs, filtros, tabela SE→ENTÃO, criar/editar/toggle persistidos. Estados loading/erro/vazio honestos (sem login mostra "Falha ao ler" = 401 esperado).
- Backend: 3 rotas em `routes/motorClinico.ts` — GET/POST/PATCH `/motor-clinico/regras` sobre `regras_motor`. Mock antigo (`mockup-sandbox/.../craniotomia/_mockData.ts`) ficou só no sandbox.
- **REGRA DE OURO descoberta no code review (16/06/2026):** `regras_motor` é GLOBAL (Genesis, sem unidade_id) e propaga a TODAS as unidades → as rotas de ESCRITA exigem `requirePlataforma("platform_owner")` (perfil "admin" do ADMIN_TOKEN passa); só `requireAuth` deixaria qualquer tenant_user alterar o motor global. GET pode ficar só com requireAuth (leitura da base clínica).
- **Bug de JOIN evitado:** leftJoin `regras_motor.codigo_referencia = itens_terapeuticos.codigo_padcom` MULTIPLICA a mesma regra em N linhas (codigo_padcom NÃO é único) → inflava KPIs. Solução: sem JOIN; montar Map codigo_padcom→item (1ª ocorrência = canônica) e colar nome em memória (1 regra = 1 linha). Filtros segmento/ativo validados e aplicados no SQL (where), não em memória.

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

## Mega Anamnese — espinha de classe mundial (CEO 15/06/2026)
- Anamnese atual POBRE: questionario_master só 19 perguntas (blocos IDENTIFICACAO/CLINICO/PREFERENCIA(S)/FINANCEIRO); dívidas: PREFERENCIA vs PREFERENCIAS duplicado + Q030 repetido. anamneses=48, questionario_respostas=1.
- Espinha ampliada (14 blocos) em `docs/dr-replit/ESPEC_MEGA_ANAMNESE_INTEGRATIVA_26.06.15.md`: identificação, QP+HMA(OPQRST), revisão por sistemas(ISDA 13 aparelhos), antecedentes, cirurgias, alergias, medicações, imunizações, hábitos/vícios(tabagismo maços-ano, etilismo AUDIT-C/CAGE, sono Epworth, Bristol), história familiar, psicossocial, gineco/andrológica, eixos IFM, preferências. Escalas: PHQ-9, GAD-7, AUDIT-C, CAGE, Epworth, Bristol, IPSS.
- Cada pergunta = gatilho → sintoma/doença → bloco → escore de gravidade → grade. Modelo de dados ADITIVO em questionario_master: colunas sistema/escala_validada/peso_gravidade/e_sinal_alarme + ligações M:N pergunta_sintoma/pergunta_doenca. Cartas de encaminhamento: CARTA_07 (Manager) e CARTA_MEGA_ANAMNESE (Dr. Claude).

## Briefings mestres + export de dados (15/06/2026)
- Export de catálogos (sem PII) em `docs/dr-replit/PARA_MANAGER/motor_anamnese_sinapses_export_26.06.15.json`: questionario_master/doencas/sintomas/blocos/cid10/regras_motor/motor_decisao_clinica/mapa_anamnese_motor/mapa_bloco_exame.
- BRIEFING MESTRE por agente (índice único + braços de dados + porquê de cada campo + evolução/roadmap + mandato kaizen + sinapses divergentes + layout Craniotomia + ordem de implementar/rodar): `docs/dr-claude/BRIEFING_MESTRE_MOTOR_ANAMNESE_SINAPSES_26.06.15.md` e `docs/dr-replit/PARA_MANAGER/BRIEFING_MESTRE_MOTOR_ANAMNESE_SINAPSES_26.06.15.md`.
- Branch: working branch atual = `ver-l2-dr-claude` (a skill do Dr. Claude já usa essa nos raws); README dr-claude lista `feat/dominio-pawards`/`main`. Push só após auto-commit do fim da task; devolver prova (raw URL + hash). NÃO commit manual (destrutivo p/ regras).

## Obra pendente (Wave, autorizada "sem perguntar")
Ligar Craniotomia↔banco (ler regras reais), unir os mapas órfãos à rota, atualizar a rota V9→semântica de bloco/grade + gravidade por bloco, dar persistência+versionamento ao editor, criar amarração editável item↔doença/sintoma, preencher 229 itens órfãos e enriquecer sintomas.
