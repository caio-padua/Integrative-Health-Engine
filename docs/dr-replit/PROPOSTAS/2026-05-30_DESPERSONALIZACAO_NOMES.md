# PROPOSTA — Despersonalização (tirar nome próprio das telas)

- **Tema:** sistema é PAWARDS, não pessoal — remover "Pádua"/"Caio" das telas
- **Origem:** Caio, 30/mai/2026
- **Status:** PROPOSTO (Fase 1 segura pode começar com OK)
- **Medo do Caio:** "tenho medo de mudar e dar algum erro" — legítimo, ver §2

---

## 1. O QUE EU ENCONTREI (raio-X)

1.1 "Pádua/Padua": **592 ocorrências**.
1.2 "Caio": **630 ocorrências**.
1.3 Total: **1.200+** — espalhadas por telas, componentes, scripts, dados e migrations.

---

## 2. POR QUE NÃO DÁ PRA TROCAR TUDO DE UMA VEZ

2.1 As referências são de 4 tipos com risco MUITO diferente:

| tipo | exemplo | risco de trocar |
|---|---|---|
| Texto de tela | "GPS Pádua" no menu | NENHUM |
| Nome de componente/arquivo | `GpsPadua.tsx`, `importarPacientesPadua.ts` | MÉDIO (quebra import) |
| Dado real (clínica) | "Instituto Pádua" = unidade 15, 3.872 pacientes | ALTO (corrompe dado) |
| Config funcional | dono killswitch 2FA = Caio; email `clinica.padua.agenda@gmail.com` | CRÍTICO (quebra segurança/agenda) |

2.2 "Pádua" é sobrenome do Caio E o nome de uma clínica real ao mesmo tempo.
2.3 Por isso um "replace all Pádua → PAWARDS" **quebraria o sistema**.

---

## 3. PLANO SEGURO (em fases)

### 3.1 FASE 1 — Textos visíveis (ZERO risco) — pode começar já
3.1.1 Trocar labels de menu/tela que o usuário lê.
3.1.2 "GPS Pádua" → "GPS Clínico" (FEITO em 30/mai, 2 menus).
3.1.3 Varrer outros labels visíveis e trocar 1 por 1, testando a tela.

### 3.2 FASE 2 — Nomes internos de componente (risco médio) — depois
3.2.1 Renomear `GpsPadua` → `GpsClinico` etc., com ajuste de imports.
3.2.2 Feito gradual, com typecheck a cada passo.

### 3.3 NUNCA TOCAR (proibido)
3.3.1 Nome da clínica real "Instituto Pádua" (é entidade de negócio).
3.3.2 Dados de paciente importados.
3.3.3 Dono do killswitch 2FA / identidade de segurança.
3.3.4 Emails reais (`clinica.padua.agenda@gmail.com`).
3.3.5 Nomes de agenda no Google Calendar do Caio (isso ele muda no Google, não é código).

---

## 4. DECISÃO PENDENTE (Caio)

- **A)** Começo a Fase 1 (telas) agora, 1 tela por vez, testando (recomendo).
- **B)** Espero o Dr. Claude listar exatamente quais telas primeiro.
- **C)** Deixa pra depois da governança/B1.

**Default sugerido:** A — Fase 1 é segura e te dá o resultado visível rápido.
