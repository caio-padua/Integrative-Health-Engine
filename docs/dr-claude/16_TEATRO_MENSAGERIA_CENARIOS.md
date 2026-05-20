# 16 — TEATRO DA MENSAGERIA · 4 cenários + carta de encantamento por matriz

> Atualizado em **2026-05-19** · sessão de desenho com Caio (CEO) ao vivo no canvas
> Lente raw GitHub deste doc (Dr. Claude): `https://raw.githubusercontent.com/<org>/<repo>/<branch>/docs/dr-claude/16_TEATRO_MENSAGERIA_CENARIOS.md`

---

## 0. TL;DR (Dr. Claude, leia aqui se tiver pressa)

- Caio quer **1 motor de mensageria genérico** servindo **4 cenários** distintos:
  `receita_manipulada` · `receita_industrializada` · `injetavel_implante` · `followup_estetico`.
- O **painel direito da mensageria não é preview por paciente** — é **TEMPLATE com placeholders editáveis** (`{NOME_PACIENTE}`, `{LISTA_FORMULAS}`, `{NOME_PROCEDIMENTO}` etc).
- Existe **1 placeholder especial** `{CARTA_ENCANTAMENTO}` que é controlado **por paciente** por uma **matriz períodos × cenários** + janela de validade (data início → fim).
  - Conceito: "encantar sem cansar" — evita repetir a mesma frase de carinho 9× ao dia.
  - Exemplo de Caio: paciente vai ser pai em 2 meses → frase *"o dia da grande bênção está chegando 👶"* aparece **só em IM × Receita Manipulada** + **FN × Receita Manipulada** entre 15/05/2026 → 15/07/2026. NÃO entra em follow-up estético, NÃO entra no jejum, NÃO entra na ceia.
- O cenário `followup_estetico` **emite 2 coisas ao mesmo tempo**:
  1. WhatsApp pro paciente (template editável)
  2. **Card no `task_cards`** com `assigned_role = "fechadora"` que sincroniza com Trello via `artifacts/api-server/src/lib/trello.ts` — pra fechadora de venda (SDR/closer) já pegar o lead.

---

## 1. Espelho de tabelas (banco real, já existente)

| Tabela | Registros hoje | Usada por que cenário |
|---|---|---|
| `periodos_dia` | 9 (JE/IM/MM/AL/IT/MT/NO/FN/CE) | receitas (cronobio) |
| `mensagens_catalogo` | seed Opus v3 (categoria/chave camelCase EXCEÇÃO MAIÚSCULAS) | todos os 4 cenários (1 template por cenário) |
| `prescricoes_lembrete` + `prescricao_lembrete_envios` | — | receitas |
| `whatsapp_mensagens_log` | — | todos |
| `followups` | 7 (tipos: `mensagem/procedimento/ligacao/exame/consulta` — falta `vencimento_estetico`) | follow-up estético |
| `task_cards` | 135 (66 enfermeira + 66 clinica_admin) | follow-up estético (cria card pra fechadora) |
| `catalogo_agentes` | 20 (Administrativo/Enfermagem/Consultor/Supervisor/Financeiro/Ouvidoria — titulares + auditores, presencial + remoto) | todos (executores) |
| `acompanhamento` | planos Diamante/Ouro/Prata/Cobre com `slaRespostaHoras`/`ligacaoDiaria`/`followupAtivo` | follow-up estético (prioriza Diamante) |

---

## 2. Os 4 cenários

| ID | Emoji | Gatilho | Destinatário | Canal |
|---|---|---|---|---|
| `receita_manipulada` | 🧪 | janela cronobiológica (`periodos_dia.janela_inicio`) | paciente | WhatsApp Beatriz |
| `receita_industrializada` | 💊 | janela cronobio + alerta de recompra de estoque | paciente | WhatsApp Beatriz |
| `injetavel_implante` | 💉 | data_agendada − 24h e − 2h | paciente | WhatsApp Beatriz |
| `followup_estetico` | 🌸 | `data_aplicacao + duracao_meses − 30 dias` | paciente **+ card Trello pra fechadora** | WhatsApp Beatriz **+ `task_cards`** |

### Regra ferro-fundida (vale pros 4)

> Múltiplos horários dentro da mesma janela cronobiológica = **1 ÚNICA mensagem WhatsApp**, listando todas as fórmulas/procedimentos a tomar/fazer nesse período. Paciente empresário não é incomodado a toda hora.

Exemplo com Sr. Graco Pádua (id `1412212`, OURO):
- IM 🌅 07h–09h: Blend Energia (07h) + Blend Menopausa (08h) → **1 mensagem** às 07h
- AL 🍽️ 11h–13h30: Magnésio (12h) → 1 mensagem
- FN 🌙 20h–22h30: Blend Menopausa (20h) + Magnésio (22h) → **1 mensagem** às 20h

→ **3 mensagens/dia**, não 5.

---

## 3. Catálogo de placeholders disponíveis

Arquivo de verdade: `artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/_teatro.ts`
(constante `PLACEHOLDERS`). Resumo:

| Grupo | Placeholders | Cenários |
|---|---|---|
| **paciente** | `{NOME_PACIENTE}` · `{PRONOME_TRATAMENTO}` | todos |
| **cronobio** | `{SAUDACAO}` · `{NOME_PERIODO}` · `{EMOJI_PERIODO}` · `{JANELA_PERIODO}` · `{ABERTURA_PERIODO}` · `{DIA_SEMANA}` · `{SEMANA_DO_MES}` · `{LISTA_FORMULAS}` · `{POSOLOGIA}` · `{VIA}` · `{HORARIO_DOSE}` | receitas |
| **agendamento** | `{DATA_AGENDAMENTO}` · `{HORA_AGENDAMENTO}` · `{NOME_PROCEDIMENTO}` · `{SALA}` · `{ENFERMEIRA}` | injetável + estético |
| **vencimento** | `{DATA_ULTIMA_APLICACAO}` · `{DATA_VENCIMENTO}` · `{DIAS_RESTANTES}` · `{NOME_FECHADORA}` | follow-up estético |
| **clínica** | `{STATUS_DR_CAIO}` · `{FALA_DR_CAIO}` · `{OBS_DOSE}` | receitas |
| **encantamento** ✨ | `{CARTA_ENCANTAMENTO}` (matriz no GPS) | **todos** (mas filtrado pela matriz) |
| **assinatura** | `{ASSINATURA_BEATRIZ}` | todos |

---

## 4. Carta de Encantamento — matriz períodos × cenários

### Schema proposto (a aprovar pela Migration 105)

```sql
-- pacientes.carta_encantamento (jsonb opcional)
ALTER TABLE pacientes ADD COLUMN carta_encantamento jsonb NULL;

-- exemplo de payload:
{
  "ativo": true,
  "texto": "✨ o dia da grande bênção está chegando 👶",
  "data_inicio": "2026-05-15",
  "data_fim":    "2026-07-15",
  "matriz": {
    "JE": { "receita_manipulada": false, "receita_industrializada": false, "injetavel_implante": false, "followup_estetico": false },
    "IM": { "receita_manipulada": true,  "receita_industrializada": false, "injetavel_implante": false, "followup_estetico": false },
    "MM": { "receita_manipulada": false, "receita_industrializada": false, "injetavel_implante": false, "followup_estetico": false },
    "AL": { "receita_manipulada": false, "receita_industrializada": false, "injetavel_implante": false, "followup_estetico": false },
    "IT": { "receita_manipulada": false, "receita_industrializada": false, "injetavel_implante": false, "followup_estetico": false },
    "MT": { "receita_manipulada": false, "receita_industrializada": false, "injetavel_implante": false, "followup_estetico": false },
    "NO": { "receita_manipulada": false, "receita_industrializada": false, "injetavel_implante": false, "followup_estetico": false },
    "FN": { "receita_manipulada": true,  "receita_industrializada": false, "injetavel_implante": false, "followup_estetico": false },
    "CE": { "receita_manipulada": false, "receita_industrializada": false, "injetavel_implante": false, "followup_estetico": false }
  }
}
```

### Resolução em runtime (TS)

```ts
// _teatro.ts
export function cartaAtivaPara(
  carta: MatrizCartaEncantamento | null,
  periodoSigla: string,            // JE/IM/MM/AL/IT/MT/NO/FN/CE
  cenario: CenarioId,
  hoje = new Date(),
): boolean {
  if (!carta?.ativo) return false;
  if (hoje < new Date(carta.dataInicio) || hoje > new Date(carta.dataFim)) return false;
  return !!carta.matriz[periodoSigla]?.[cenario];
}
```

### UX no GPS

Quando o médico/operador edita uma fórmula do paciente no `EditorBlend` (3º andar do GPS Pádua), aparece **abaixo do `MapeamentoMensageria`** um card rosa-claro `✨ CARTA DE ENCANTAMENTO`:

- toggle ATIVA / DESLIGADA
- textarea com a frase (Georgia italic)
- 2 inputs `date` (janela início → fim)
- **matriz checkbox**: linhas = períodos com dose marcada (foco TDAH — não mostra os 9 sempre), colunas = 4 cenários, cor da coluna = cor do cenário
- contador *"X injeções/dia"* pra deixar evidente quando ele exagerar

---

## 5. Cenário follow-up estético — ponte com Trello

Pseudocódigo do worker (a implementar em `artifacts/api-server/src/cron/followupEstetico.ts`):

```ts
// roda 1x/dia às 06:00 BRT
async function dispararFollowupEstetico() {
  const procedimentos = await db.execute(sql`
    SELECT s.id, s.paciente_id, s.data_realizada, st.nome AS procedimento, st.duracao_meses
    FROM sessoes s
    JOIN substancias st ON st.id = s.substancia_id
    WHERE s.via = 'PRC' AND st.duracao_meses IS NOT NULL
      AND (s.data_realizada + (st.duracao_meses || ' months')::interval - INTERVAL '30 days')::date = CURRENT_DATE
  `);

  for (const p of procedimentos) {
    // 1. WhatsApp pro paciente (template followup_estetico)
    await enfileirarMensagem({
      cenario: "followup_estetico",
      pacienteId: p.paciente_id,
      contexto: {
        nome_procedimento: p.procedimento,
        data_ultima_aplicacao: p.data_realizada,
        data_vencimento:       addMonths(p.data_realizada, p.duracao_meses),
        dias_restantes: 30,
        nome_fechadora: await escolherFechadora(p.paciente_id),
      },
    });

    // 2. Card no task_cards pra fechadora (Trello bidirecional sync já vivo)
    await db.insert(taskCardsTable).values({
      pacienteId: p.paciente_id,
      assignedRole: "fechadora",
      titulo: `Renovar ${p.procedimento} — paciente ${p.paciente_id}`,
      descricao: `Vence em 30 dias. WhatsApp já disparado. Ligar nos próximos 5 dias úteis.`,
      prioridade: "alta",
      corAlerta: "#E8A5D8",
      prazoHoras: 120,
      status: "pendente",
    });
  }
}
```

---

## 6. Arquivos de verdade neste PR

- `artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/_teatro.ts` — tipos `Cenario`, `Placeholder`, `MatrizCartaEncantamento` + `PLACEHOLDERS` + `TEMPLATES_INICIAIS` + `resolverPlaceholder()` + `cartaAtivaPara()`.
- `artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/TeatroMensageriaPadua.tsx` — componente novo do canvas (substitui `MotorMensageriaPadua`).
- `artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/GpsPadua.tsx` — função `CartaEncantamentoMatriz` adicionada no `EditorBlend`.

Shape no canvas: `motor-mensageria-padua` (id mantido, componente apontando agora pro `TeatroMensageriaPadua`).

---

## 7. O que NÃO foi feito (deixado pendente pra próxima onda)

- [ ] Migration 105: `ALTER TABLE pacientes ADD COLUMN carta_encantamento jsonb`
- [ ] Migration 106: `ALTER TABLE followups` aceitar `tipo='vencimento_estetico'` no enum
- [ ] Endpoint `POST /api/prescricoes-lembrete` (salva matriz horários × períodos do GPS)
- [ ] Endpoint `PUT /api/pacientes/:id/carta-encantamento` (salva matriz da carta)
- [ ] Cron worker `cron/followupEstetico.ts` (varre vencimentos, enfileira WhatsApp + cria task_card)
- [ ] Sync Trello bidirecional pro `assigned_role='fechadora'` (`TRELLO_API_KEY` + `TRELLO_TOKEN` ainda como missing secret — anastomose #2)
- [ ] Twilio real (follow-up task #478 segue pendente — disparo teste no celular do CEO)

---

## 8. Regras Caio que entram em todo template

- **Siglas SEMPRE em MAIÚSCULAS** (`JE/IM/MM/AL/IT/MT/NO/FN/CE`) — exceção: `mensagens_catalogo.chave` em camelCase (identificador de config).
- **Campo de perfil sempre `perfil`, nunca `role`** (`task_cards.assigned_role` é exceção legada — fica anotado).
- **Templates ficam em `mensagens_catalogo.conteudo`** (jsonb) com `categoria = 'teatro'` + `chave = '<cenario_id>.template'`.
- **Carta é OPT-IN** — toggle padrão DESLIGADA. Encantamento mal-dosado é assédio.
