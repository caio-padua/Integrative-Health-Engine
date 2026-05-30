# PROPOSTA — B1 Prescrição Rica: Condicionais (farmácia / comissão / PARQ)

- **Tema:** modos de emissão da receita rica (B1)
- **Origem:** pergunta do Caio em 30/mai/2026
- **Status:** PROPOSTO (aguardando martelo do Caio)
- **Depende de:** B1 aprovada (doc 24 §2.3) · A2 farmácia pool aprovada
- **Link commit:** (preencher quando virar código)

---

## 1. PERGUNTA DO CAIO (literal)

1.1 A receita deve poder **escolher a farmácia que recebe a cópia da fórmula — ou não**.
1.2 O **comissionamento** deve poder ser **ativado ou não**.
1.3 Se o **PARQ** for acionado, o operador **tem que ser médico de uma clínica**.
1.4 Às vezes o operador **só quer encaminhar, sem acionar PARQ**.

---

## 2. COMO FUNCIONA HOJE (raio-X 30/mai)

2.1 Hoje a emissão é **tudo-ou-nada** (acoplada).
2.2 Quando a receita é EMITIDA (`/api/prescricoes/:id/emitir` → `emitirPrescricaoService.ts`):
   - 2.2.1 insere em `parmavault_receitas` (a fila que as farmácias leem)
   - 2.2.2 a trigger `trg_calc_comissao` calcula `comissao_estimada`
   - 2.2.3 a trigger `trg_sync_comissao_parq` espelha pra `parq_estimado`
2.3 Ou seja: **emitir = cópia farmácia + comissão + PARQ disparam JUNTOS, automático.**
2.4 Não existe hoje "encaminhar simples sem nada disso".

---

## 3. PROPOSTA — 3 MODOS DE ENVIO (1 carimbo por receita)

> Mapeia os 2 toggles do Caio (farmácia sim/não · comissão sim/não) em
> 3 opções claras, pra não dar carga cognitiva.

### 3.1 MODO 1 — ENCAMINHAMENTO SIMPLES
- 3.1.1 manda só pro paciente (PDF + mensagem cronobiológica por período)
- 3.1.2 NÃO escolhe farmácia · NÃO gera comissão · NÃO aciona PARQ
- 3.1.3 qualquer operador pode (enfermeira, secretária)
- 3.1.4 tecnicamente: NÃO insere em `parmavault_receitas`

### 3.2 MODO 2 — ENVIO COM FARMÁCIA (sem comissão/PARQ)
- 3.2.1 paciente + cópia pra 1 farmácia do pool (A2, 1 clique)
- 3.2.2 farmácia recebe pra manipular/dispensar
- 3.2.3 NÃO gera comissão · NÃO aciona PARQ
- 3.2.4 tecnicamente: insere em `parmavault_receitas` MAS com flag
  `aciona_comissao = false` → exige ajuste na trigger pra respeitar o flag

### 3.3 MODO 3 — RECEITA CLÍNICA COMPLETA (PARQ + comissão)
- 3.3.1 paciente + farmácia + registro financeiro completo
- 3.3.2 aciona `comissao_estimada` + `parq_estimado`
- 3.3.3 SÓ disponível se operador = **médico de clínica** (gate por perfil)
- 3.3.4 tecnicamente: comportamento atual, sem mudança de trigger

---

## 4. CONSEQUÊNCIA TÉCNICA (o Caio precisa saber)

4.1 MODO 1 e MODO 3 são fáceis (ligam/desligam o insert em `parmavault_receitas`).
4.2 MODO 2 (farmácia SIM, comissão NÃO) exige **1 mudança de banco**:
   - 4.2.1 nova coluna `aciona_comissao boolean default true` em `parmavault_receitas`
   - 4.2.2 a trigger de comissão passa a checar esse flag antes de calcular
   - 4.2.3 aditivo, não destrutivo (regra de ouro respeitada)

---

## 5. DECISÃO PENDENTE (A/B/C pro Caio)

- **A)** Aprovar os 3 modos como acima (recomendado).
- **B)** Preferir 2 toggles soltos (farmácia on/off · comissão on/off) em vez de 3 carimbos.
- **C)** Só MODO 1 + MODO 3 agora (deixar MODO 2 pra depois, evita mexer na trigger já).

**Default sugerido por Dr. Replit:** A, com o carimbo padrão = MODO 3 quando o
operador é médico, e MODO 1 quando não é.

**Pergunta extra:** o gate do PARQ (3.3.3) usa qual perfil como "médico de clínica"?
Hoje o PARQ no código exige `validador_mestre`/`admin`. Confirmar se é esse o
perfil ou se há um perfil `medico` específico.
