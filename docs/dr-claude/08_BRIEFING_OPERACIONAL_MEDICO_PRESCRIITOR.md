# 08 — Briefing Operacional: Médico Prescritor + Motor Clínico (15/mai/2026)

> **Para o Dr. Claude (orquestrador)**
> Documento de situação operacional imediata. Caio (CEO + médico prescritor)
> quer começar a usar o sistema AGORA para emitir receitas, pedidos de exame
> e operar o motor clínico. Escrito pelo Dr. Replit em 15/mai/2026.
> Leia após o `07_ESTADO_ATUAL_E_OPCOES_HOSPEDAGEM.md`.

---

## 1. 🟢 Motor Clínico — O QUE JÁ FUNCIONA HOJE

### Dados confirmados no banco (15/mai/2026)

| Tabela | Registros |
|---|---|
| `regras_motor` (ativas) | **37 regras** |
| `itens_terapeuticos` | **447 itens** |
| `injetaveis` (catálogo) | **305** |
| `formulas` (catálogo) | **54** |
| `anamneses` (históricas) | **43** (29 pendentes, 8 concluídas, 6 validadas) |
| `pacientes` (ativos) | **4.278** (Wave Cadastro Pádua) |

### Regras do motor — snapshot atual

**Segmento EXAME (22 regras):**
| Regra | Palavra-chave | Código sugerido |
|---|---|---|
| MRE001 | FADIGA / CANSACO / FRAQUEZA | `EXAM TIRE BASI 001` |
| MRE002 | HIPOTIREOIDISMO / HASHIMOTO / TIREOIDITE | `EXAM TIRE AMPL 001` |
| MRE004 | SOBREPESO / OBESIDADE / IMC ALTO | `EXAM BASE BASI 001` |
| MRE005 | DIABETES / INSULINA / GLICEMIA | `EXAM GLIC AMPL 001` |
| MRE006 | GANHO DE PESO / RESISTÊNCIA INSULÍNICA | `EXAM GLIC BASI 001` |
| MRE007 | LUPUS / ARTRITE REUMATOIDE / AUTOIMUNE | `EXAM AUTO BASI 001` |
| MRE008 | COLESTEROL ALTO / DISLIPIDEMIA / TRIGLICÉRIDES | `EXAM LIPI BASI 001` |
| MRE009 | QUEDA DE CABELO / ALOPECIA | `EXAM GONA BASI 001` |

**Segmento FÓRMULA (7 regras):**
| Regra | Palavra-chave | Código sugerido |
|---|---|---|
| MRF001 | FADIGA / CANSACO | `FORM META MITO 001` |
| MRF002 | RESISTÊNCIA INSULÍNICA / DIABETES / GANHO DE PESO | `FORM GLIC INSU 001` |
| MRF003 | HIPOTIREOIDISMO / HASHIMOTO | `FORM TIRE MODU 001` |

**Segmento INJETÁVEL (5 regras):**
| Regra | Palavra-chave | Código sugerido |
|---|---|---|
| MRI001 | DEFICIÊNCIA B12 / NEUROPATIA / ANEMIA | `INJE META B12C 001` |
| MRI002 | IMUNIDADE BAIXA / INFECÇÕES RECORRENTES | `INJE VITA CEND 001` |

**Segmento PROTOCOLO (3 regras):**
| Regra | Palavra-chave | Código sugerido |
|---|---|---|
| MRP001 | AVALIAÇÃO COMPLETA / LONGEVIDADE / PREVENTIVO | `PROC META BASE 001` |

**Segmento IMPLANTE:** 0 regras (lacuna — expandir futuro)

---

## 2. 🔄 Fluxo completo: Anamnese → Sugestão → Receita

```
[1] ANAMNESE
  Caio abre: /anamnese/nova
  Seleciona paciente
  Sistema cria registro, redireciona pra /anamnese/{id}

[2] QUESTIONÁRIO PADCOM V9
  Bloco IDENTIFICAÇÃO: Q001 (nome), Q002 (CPF)
  Bloco CLÍNICO:
    Q010 — Queixa Principal (texto livre)
    Q011 — Duração da Queixa
    Q012 — Sintomas Atuais (multiselecao: FADIGA, INSONIA, ANSIEDADE...)
    Q013 — Doenças Diagnosticadas (HIPOTIREOIDISMO, DIABETES...)
    Q014 — Histórico Familiar
  Bloco PREFERÊNCIAS:
    Q030 — Quer somente exames? (SIM/NÃO)
    Q031 — Aceita injetável? (SIM/NÃO) → desbloqueia regras IM
    Q033 — Aceita implante? (SIM/NÃO) → desbloqueia regras implante
  Bloco FINANCEIRO:
    Q041 — Perfil financeiro (BÁSICO/INTERMEDIÁRIO/AVANÇADO)
           BÁSICO = bloqueia implante e protocolo

[3] ATIVAR MOTOR
  POST /anamnese/{id}/ativar-motor
  Sistema:
    → extrai sinais semânticos (Q010+Q012+Q013+Q014)
    → cruza com 37 regras ativas
    → filtra por preferências (injetável/implante/somente exames)
    → filtra por perfil financeiro (BÁSICO bloqueia implante/protocolo)
    → deduplica por código de referência
    → insere em `sugestoes` (tipo: exame/formula/injetavel_im/injetavel_ev/implante/protocolo)
    → fallback: se zero matches → sugere EXAM BASE BASI 001

[4] SUGESTÕES → RECEITA RAS
  Sugestões viram itens_terapeuticos da receita
  Gera PDF via RASX Engine (5 Blocos: CLIN/JURI/FINA/ACOM/4100)
  Assinatura digital ICP-Brasil via ZapSign

[5] PEDIDO DE EXAME
  Página /pedidos-exame → gera PDF de solicitação
  Integrado ao catálogo de exames (305 injetáveis, blocos por grau)
```

---

## 3. 👤 Perfis de usuário ativos no banco

| Perfil | Quantidade | O que faz |
|---|---|---|
| `validador_mestre` | 65 | CEO / Caio — acesso total |
| `enfermeira` | 35 | Triagem, avaliação enfermagem |
| `medico` | 25 | Consulta, prescrição, anamnese |
| `medico_tecnico` | 2 | Validação técnica |
| `validador_enfermeiro` | 1 | Validação enfermagem |

**Caio** (`usuarios.id=1`, `perfil=validador_mestre`, agora também `platform_owner` via Wave 13 F1).

---

## 4. 🎯 O que Caio quer agora (pedido explícito 15/mai/2026)

1. **Usar o sistema como médico prescritor IMEDIATAMENTE** — via preview Replit (dev funciona hoje, R$ 0 extra)
2. **Emitir receitas reais** pro seu consultório (pacientes da clínica Pádua)
3. **Usar o motor**: anamnese → sugestão automática de exames/fórmulas/injetáveis
4. **Comissão farmácia**: deixar PAUSADA — Caio não quer monetizar isso ainda
5. **Colocar no ar pra pacientes**: depende de decisão billing (ver doc 07)

---

## 5. 🚧 Lacunas identificadas (Dr. Replit para Dr. Claude)

### Lacuna A — Regras do motor escassas (37 → precisa ~200+)
37 regras cobrem apenas: tireoide, glicose, lipídio, autoimune, gonadal, B12, Vitamina C.
Não cobrem: hormônios sexuais, adrenal, sono, neuropsiquiatria, pele, digestivo, cardiovascular avançado, oncológico preventivo.

**Solução**: sessão de trabalho Caio + Dr. Replit → Caio dita regras clínicas ("quando X → sugerir Y") → Dr. Replit popula `regras_motor` via SQL ou UI.

### Lacuna B — Zero regras de implante
`implantes` tem registros no catálogo mas nenhuma `regra_motor` com `segmento='implante'`.
Pacientes que marcam "aceita implante" não recebem sugestão de implante.

### Lacuna C — Questionário V9 parcialmente preenchido na UI
A página `/anamnese/{id}` existe mas não foi auditada se todos os Q001-Q041 estão renderizados com validação correta. Pode precisar de polish antes de uso clínico real.

### Lacuna D — Conexão Sugestão → Receita (UI)
O motor gera `sugestoes` no banco. Mas há um passo manual entre "ver sugestões" e "incluir na receita RAS". Precisa verificar se há botão "aprovar sugestão → incluir em prescrição" na UI ou se é só no backend.

---

## 6. 📅 Próximos 3 passos recomendados (pra Dr. Claude priorizar)

### Passo 1 — Hoje (30 min de Caio)
Caio usa o sistema via preview Replit:
- Login → Paciente teste → Anamnese → Preenche → Ativa Motor → vê sugestões
- Objetivo: validar que o fluxo funciona na prática e identificar atritos de UX

### Passo 2 — Esta semana (2h Caio + Dr. Replit)
Sessão de expansão das regras do motor:
- Caio dita: "para INSÔNIA → sugira Melatonina, Magnésio, Triptofano"
- Dr. Replit popula `regras_motor` + conecta a `itens_terapeuticos`
- Meta: 37 → 80+ regras cobrindo os principais quadros da medicina integrativa

### Passo 3 — Semana 2 (decisão billing resolvida)
Ou reativar deploy Replit (support@replit.com) ou migrar Fly.io GRU.
Pra Dr. Claude: **qual caminho recomenda** considerando caixa zero + urgência operacional?

---

## 7. 🔗 URLs raw atualizadas — todos os documentos Dr. Claude

Branch: `feat/dominio-pawards`
Base: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/`

```
README.md (índice + política de atualização)
00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md (painel CEO 1-página)
01_DECISOES_TOMADAS_WAVE10_F3C.md (histórico append-only)
02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md (perguntas abertas)
03_ARQUITETURA_GERAL_DO_CODIGO.md (mapa macro→micro + raw URLs)
04_BLUEPRINT_WAVE10_FASE_B_DIA1.md (ZapSign ICP-Brasil completo)
05_BRIEFING_PLANILHA_SANDBOX_PACIENTE.md (V25 PADCOM Luciano demo)
06_WAVE13_F1_FOUNDATION_RBAC_2FA.md (RBAC + 2FA + Kill-Switch)
07_ESTADO_ATUAL_E_OPCOES_HOSPEDAGEM.md (deploy suspenso + 4 caminhos)
08_BRIEFING_OPERACIONAL_MEDICO_PRESCRITOR.md (este documento — motor clínico)
```

```
replit.md (overview + user preferences):
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/replit.md

Browse GitHub completo:
https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards
```

---

## 8. ❓ Perguntas abertas pra Dr. Claude

### Q1 — Billing / deploy (urgência: 30 dias)
Caminho A (continua Replit, resolve billing) ou Caminho B (migra Fly.io BR)?
Considerando: caixa zero, sem equipe técnica, Caio precisa operar JÁ.

### Q2 — Regras do motor: protocolo de expansão
Caio tem ~2h/semana pra trabalhar com Dr. Replit.
Qual prioridade de quadros clínicos expandir primeiro:
- (a) Hormônios sexuais (testosterona, progesterona, estrogênio)
- (b) Sono/neuropsiquiatria (melatonina, serotonina, cortisol noturno)
- (c) Digestivo/metabólico (microbioma, permeabilidade intestinal)
- (d) Cardiovascular (homocisteína, PCR-us, LP(a))

### Q3 — Wave 13 F2/F3/F4 (RBAC enforcement)
F1 entregue (Migration 044 RBAC + 2FA foundation).
F2 (middleware enforcement), F3 (UI permissões por perfil), F4 (Kill-Switch UI) estão paradas desde cancelamento de tasks paralelas.
Retomar ou pausar indefinidamente enquanto Caio não tem time usando?

### Q4 — Comissão farmácia (pausada por decisão explícita de Caio)
Quando retomar: após 1º contrato pago? após X pacientes ativos?
Qual critério pra reativar esta monetização?

---

*Última atualização: 2026-05-15 por Dr. Replit (Build mode).*
*Próximo documento quando: após Caio usar o sistema pela 1ª vez e reportar atritos.*
