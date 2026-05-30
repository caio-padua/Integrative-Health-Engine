# RAIO-X — Ectoplasma de Ectoplasma: Anamnese dupla + Prescrição sem ponte

> **De:** Dr. Replit · **Para:** Caio + Dr. Claude · **Data:** 2026-05-30
> Caio apontou 2 fantasmas escondidos. Os dois CONFIRMADOS via exploração cruzada.

---

## 1. ECTOPLASMA A — DUAS ANAMNESES QUE NÃO SE FALAM

### 1.1 Existem DUAS anamneses, em estruturas separadas
1.1.1 EXTERNA (paciente, portal público por token):
   - tabela `questionario_respostas` + `estado_saude_paciente`
   - catálogo `questionario_master` filtro `aplicavel_em = 'ACOMPANHAMENTO'`
   - rota `POST /api/portal-paciente/pulso/:token` (`origem='PACIENTE'`)
   - lógica = **observação/tracking** (Pulso Diário)
1.1.2 INTERNA (staff, dentro do cockpit/ficha):
   - tabela `anamneses` (OUTRA tabela)
   - catálogo `questionario_master` filtro `aplicavel_em = 'INICIAL'`
   - rota `POST /api/anamnese` + `POST /api/anamnese/:id/ativar-motor`
   - lógica = **motor clínico** (`regras_motor` → `sugestoes`)

### 1.2 A divergência REAL (o fantasma)
1.2.1 O catálogo de perguntas começou a unificar (migration 079, coluna `aplicavel_em`).
1.2.2 MAS o ARMAZENAMENTO segue em 2 tabelas separadas (`questionario_respostas` vs `anamneses`).
1.2.3 E o MOTOR só roda na INTERNA — a EXTERNA não dispara `ativar-motor`.
1.2.4 Tradução: hoje **a anamnese pública NÃO é INICIAL, é só acompanhamento**.
1.2.5 Não existe um caminho público que receba a anamnese INICIAL de um cliente novo e gere sugestão.

### 1.3 Por que isso trava o seu objetivo de ESCALAR
1.3.1 Seu sonho: cliente externo preenche → motor sugere → você valida por cliques.
1.3.2 O elo que falta: uma anamnese INICIAL pública (FORJA) que grave em `anamneses` (ou estrutura compartilhada) e chame o motor.
1.3.3 Sem essa ponte, todo paciente novo ainda depende de alguém preencher por dentro.

### 1.4 Decisão proposta (martelo)
- **A)** Criar rota pública de anamnese INICIAL (FORJA) que grava + dispara motor (recomendo).
- **B)** Unificar `questionario_respostas` e `anamneses` numa estrutura só primeiro.
- **C)** Deixar para depois da governança/B1.
- **Default:** A — é o elo que liga a FORJA ao MANDRIL.

---

## 2. ECTOPLASMA B — MOCKUP LINDO DE PRESCRIÇÃO SEM PONTE PRA MENSAGERIA

### 2.1 O mockup que você gostou
2.1.1 É o `CockpitMedicoV1.tsx` (`mockup-sandbox/.../consultorio/`).
2.1.2 Ele seleciona fórmulas, injetáveis, implantes, protocolos.
2.1.3 Ele CAPTURA sim os campos certos — inclusive os 9 períodos (JE/IM/MM/AL/IT/MT/NO/FN/CE).
2.1.4 A "Craniotomia" (`CraniotomiaV4.tsx`) é só o lado decisão/dossiê — NÃO captura posologia granular.

### 2.2 O fantasma que você sentiu ("campos obrigatórios não atrelados à mensageria")
2.2.1 Os campos existem na tela, MAS não existe a PONTE que transforma o que o mockup captura no formato que a mensageria espera.
2.2.2 O mockup vive em `mockup-sandbox` com estado local (`useState`) — não persiste no banco.
2.2.3 A mensageria (`whatsappTemplates.ts`) espera `PeriodoLembrete` / `FormulaLembrete` (strings achatadas).

### 2.3 Os "7 erros quânticos" (gaps precisos)
2.3.1 Dose: mockup = valor + unidade (2 campos); template = 1 string `dose`.
2.3.2 Período: faltam mapear a sigla direto pra `periodo_sigla` no `FormulaLembrete`.
2.3.3 Injetável: template só sabe dizer "tomar"; falta "administrar" para IM/EV.
2.3.4 Frequência × Período: "1x ao dia" marcando 2 períodos = conflito sem validação.
2.3.5 Relação com alimentação: mockup = dropdown estruturado; template = string crua.
2.3.6 Craniotomia: foca decisão, não posologia — integração com posologia ausente.
2.3.7 Persistência: falta o "Bridge Service" que pega o JSON do mockup e gera os lembretes.

### 2.4 Conclusão honesta
2.4.1 O mockup é CAPAZ de alimentar a mensageria (captura os 9 períodos certos).
2.4.2 O que falta NÃO é o campo — é a **ponte de tradução** (Bridge Service) + persistência.
2.4.3 Esse é o ectoplasma: tela linda, sem fio ligando na mensageria real.

### 2.5 Decisão proposta (martelo)
- **A)** Construir o Bridge Service (mockup → `PeriodoLembrete`) na graduação da B1 (recomendo).
- **B)** Construir agora, antes da B1.
- **C)** Depois.
- **Default:** A — é exatamente o coração da B1.

---

## 3. ATUALIZAÇÃO DA FILA DE GRADUAÇÃO

3.1 Os 2 fantasmas acima entram amarrados:
   - "Anamnese pública INICIAL (FORJA)→motor" entra junto da FORJA.
   - "Bridge Service prescrição→mensageria" entra dentro da B1.
3.2 Fila: governança → **B1 (inclui Bridge)** → **FORJA (inclui anamnese pública)** → Carta → Craniotomia → Exames → Penumbra → PADSITE.
