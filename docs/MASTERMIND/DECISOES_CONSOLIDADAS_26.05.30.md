# DECISÕES CONSOLIDADAS — Fonte Única de Verdade

> **De:** Dr. Replit · **Para:** Caio + Dr. Claude
> **Data:** 2026-05-30
> **Objetivo:** Caio para de ser pombo-correio. Tudo que foi REALMENTE decidido
> está aqui, em 1 lugar. Quem tiver dúvida do que ficou combinado, lê isto.

---

## 1. DECISÕES FIRMES (já batidas, não reabrir sem motivo)

### 1.1 Farmácia e Clínica
1.1.1 Farmácia mora num POOL (tabela `farmacias_parmavault`) — A2 aprovado.
1.1.2 Clínica liga na farmácia com **1 clique** (não propaga automático).
1.1.3 Clínica canônica = tabela `unidades` (NÃO existe tabela `clinicas`).

### 1.2 Prescrição (B1)
1.2.1 B1 aprovada: prescrição rica = período + dose + posologia + mensagem.
1.2.2 Mensagem cronobiológica: **9 períodos** (JE/IM/MM/AL/IT/MT/NO/FN/CE) — NÃO MEXER.
1.2.3 **1 mensagem por período** — regra de ferro.
1.2.4 Carta de Encantamento entra DEPOIS da B1 (opt-in).
1.2.5 B1 terá 3 MODOS de envio (simples / com farmácia / clínica completa).
1.2.6 Gate do MODO 3 = **toggles de GOVERNANÇA** (não "operador médico").

### 1.3 Fila de graduação de fantasmas (ordem)
1.3.1 GOVERNANÇA (âncora) → B1 → Carta → Craniotomia → Exames → Penumbra → PADSITE.
1.3.2 Regra: 1 fantasma por vez, virando vivo de verdade, marcado no `05_`.

### 1.4 Governança como sistema, não pessoal
1.4.1 O sistema é **PAWARDS**, não pessoal — sem nome próprio nas telas.
1.4.2 "GPS Pádua" → "GPS Clínico" (display) — FEITO em 30/mai.
1.4.3 Despersonalização completa = plano seguro (não blitz) — ver §3.

### 1.5 Processo de trabalho (triângulo)
1.5.1 Anti-ectoplasma: toda decisão vira `.md` ANTES de virar código.
1.5.2 Pastas: `docs/dr-claude/` · `docs/dr-replit/` · `docs/caio/` · `docs/MASTERMIND/`.
1.5.3 Nomenclatura de arquivos/planilhas: `<NOME_SEMANTICO>_<aa.mm.dd>`.
1.5.4 GitHub = `caio-padua/Integrative-Health-Engine` (Dr. Claude lê via raw URLs).
1.5.5 Comunicação com Caio: tópicos enumerados, 1 frase/linha, datas dd/mm/aaaa.

### 1.6 Integrações de agenda
1.6.1 Google Calendar: nativo no Replit, JÁ FUNCIONA (9 agendas lidas).
1.6.2 NÃO precisa clasp nem MCP para agenda.
1.6.3 Calendly: precisa ser CONECTADO ao projeto (hoje não está) — ver §4.

---

## 2. DOIS COCKPITS (conceito decidido, NOMES em conflito)

2.1 Decidido: existem DOIS cockpits.
   - Cockpit onde **Caio valida/edita por cliques** (recebe sugestão do motor).
   - Cockpit **autônomo/independente** (gera sem o Caio dirigir).
2.2 CONFLITO DE NOME a resolver (isto é pombo-correio puro):
   - Dr. Claude chama de **FORJA** (questionário) + **MAESTRO** (validação).
   - Caio chama de **VALIDADOR** + **AUTÔNOMO**.
2.3 PRECISA: 1 conjunto de nomes oficial. (martelo no §5)

---

## 3. DESPERSONALIZAÇÃO — POR QUE NÃO DÁ PRA APAGAR TUDO DE UMA VEZ

3.1 Achei **1.200+ referências** a "Pádua" (592) e "Caio" (630) no código.
3.2 Elas são de 4 tipos MUITO diferentes:
   - 3.2.1 Texto de tela (label) — SEGURO trocar.
   - 3.2.2 Nome de componente/arquivo (`GpsPadua`, `importarPacientesPadua`) — RISCO (quebra import).
   - 3.2.3 Dado real: **"Instituto Pádua" é uma CLÍNICA de verdade** (unidade 15, 3.872 pacientes). Apagar = corromper dados.
   - 3.2.4 Config funcional: dono do killswitch 2FA = Caio; email `clinica.padua.agenda@gmail.com`. Mexer = quebrar segurança/agenda.
3.3 CONCLUSÃO: trocar tudo "Pádua/Caio" de uma vez **quebra o sistema**.
3.4 Plano seguro (proposta `docs/dr-replit/PROPOSTAS/2026-05-30_DESPERSONALIZACAO_NOMES.md`):
   - Fase 1: só textos de tela visíveis ao paciente/clínica (zero risco).
   - Fase 2: nomes internos de componente (com teste, gradual).
   - NUNCA: nome da clínica real, dados de paciente, dono do killswitch, emails.

---

## 4. CALENDLY — CORREÇÃO HONESTA AO DR. CLAUDE

4.1 O print mostra Calendly "Active" — mas isso é na CONTA Replit do Caio.
4.2 No PROJETO PAWARDS, **não há conexão Calendly** (testei: 0 conexões).
4.3 Google Calendar SIM está ligado ao projeto e funciona.
4.4 Para usar Calendly no app, falta CONECTAR o Calendly a este projeto.
4.5 Enquanto isso: dá pra fazer agendamento 100% com Google Calendar (já temos).

---

## 5. MARTELOS PENDENTES (Caio responde 1 vez, aqui)

| # | Pergunta | Opções | Default sugerido |
|---|---|---|---|
| 5.1 | Ordem: governança → B1 → cockpits? | S / N | S |
| 5.2 | Nomes dos cockpits | FORJA+MAESTRO / VALIDADOR+AUTÔNOMO / outro | VALIDADOR + AUTÔNOMO (palavra do Caio) |
| 5.3 | Despersonalização: faço Fase 1 (telas) já? | S / N | S |
| 5.4 | Calendly: conecto ao projeto agora ou uso só Google Calendar? | conectar / só GCal | só GCal por enquanto |
| 5.5 | Casos de uso agenda: começar por consulta nova + injetável? | 1+2 / outros | 1+2 |
| 5.6 | MODO 2 da B1 (farmácia sem comissão): faço já (mexe trigger) ou depois? | já / depois | depois |

---

## 6. COMO USAR ESTE ARQUIVO

6.1 Este é o índice-mestre de decisões. Detalhe técnico mora nos docs linkados.
6.2 Quando algo for decidido, atualizo aqui (com data nova no nome do arquivo).
6.3 Caio não precisa lembrar de nada — está tudo aqui.
