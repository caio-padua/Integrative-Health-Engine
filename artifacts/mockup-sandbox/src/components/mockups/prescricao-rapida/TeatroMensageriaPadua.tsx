import { useMemo, useState } from "react";
import { PACIENTE, CATALOGO, tk } from "./_tokens";
import {
  PERIODOS_DIA, DIAS_SEMANA, SEMANAS_MES, DR_CAIO_STATUS, DR_CAIO_FALAS,
  OBS_DOSE, ASSINATURA_BEATRIZ, horarioParaPeriodo,
  type PeriodoDia,
} from "./_mensageria";
import {
  CENARIOS, PLACEHOLDERS, TEMPLATES_INICIAIS, exemploCartaFuturoPapai,
  resolverPlaceholder, cartaAtivaPara,
  VERSICULOS_BIBLICOS, addOnsPadrao, renderSlot,
  type CenarioId, type Placeholder, type MatrizCartaEncantamento,
  type AddOnsConfig, type AddOnId, type SlotPosicao,
} from "./_teatro";

const blendMenopausa = CATALOGO.find(s => s.id === "blend-vo")!;
const blendEnergia   = CATALOGO.find(s => s.id === "blend-en")!;
const magnesio       = CATALOGO.find(s => s.id === "mag-vo")!;
const FORMULAS_DO_PACIENTE = [blendEnergia, blendMenopausa, magnesio];
const TODOS_HORARIOS = FORMULAS_DO_PACIENTE.flatMap(f => f.horarios || []);

function periodosComDose(): PeriodoDia[] {
  const set = new Set<string>();
  for (const h of TODOS_HORARIOS) {
    const p = horarioParaPeriodo(h); if (p) set.add(p.sigla);
  }
  return PERIODOS_DIA.filter(p => set.has(p.sigla));
}

function renderListaFormulas(periodo: PeriodoDia): string {
  const formulas = FORMULAS_DO_PACIENTE.filter(f =>
    (f.horarios || []).some(h => horarioParaPeriodo(h)?.sigla === periodo.sigla),
  );
  if (formulas.length === 0) return "_(sem fórmulas neste período)_";
  return formulas.map((f, i) => {
    const horarios = (f.horarios || []).filter(h => horarioParaPeriodo(h)?.sigla === periodo.sigla);
    const ativos = (f.componentes || []).map((c, j) =>
      `${["❶","❷","❸","❹","❺","❻","❼","❽"][j] || "•"} ${c.nome} ${c.dose} _[${j+1}º ativo]_`,
    ).join("\n");
    return `*Fórmula ${String(i+1).padStart(2,"0")} — ${f.nome}*\n${ativos || `❶ ${f.nome} ${f.dose}`}\n   Horário: ${horarios.join(" e ")} _[${periodo.nome}]_\nTomar 1 dose via oral`;
  }).join("\n\n");
}

function renderTemplate(template: string, ctx: Parameters<typeof resolverPlaceholder>[1]): string {
  return template.replace(/\{[A-Z_]+\}/g, (m) => resolverPlaceholder(m, ctx) || "");
}

const GRUPO_COR: Record<Placeholder["grupo"], string> = {
  paciente: "#A8C7FA", clinica: "#F5C26B", cronobio: "#7BC9A5",
  agendamento: "#F5C26B", vencimento: "#E8A5D8",
  encantamento: "#E8A5D8", assinatura: "#9AA9C2",
};

const SLOT_COR: Record<SlotPosicao, string> = {
  topo: "#7BC9A5", meio: "#F5C26B", rodape: "#A8C7FA",
};

export function TeatroMensageriaPadua() {
  const [cenarioId, setCenarioId] = useState<CenarioId>("receita_manipulada");
  const [periodoSel, setPeriodoSel] = useState<PeriodoDia>(PERIODOS_DIA[1]); // IM default
  const [diaSel, setDiaSel] = useState(DIAS_SEMANA[2]); // quarta
  const [semanaSel, setSemanaSel] = useState(SEMANAS_MES[2]); // 3ª
  const [statusIdx, setStatusIdx] = useState(0);
  const [falaIdx, setFalaIdx] = useState(0);
  const [template, setTemplate] = useState<Record<CenarioId, string>>(TEMPLATES_INICIAIS);
  const [carta] = useState<MatrizCartaEncantamento>(exemploCartaFuturoPapai());
  const [addons, setAddons] = useState<AddOnsConfig>(addOnsPadrao());

  const cenario = CENARIOS.find(c => c.id === cenarioId)!;
  const phsCenario = PLACEHOLDERS.filter(p => p.cenarios.includes(cenarioId));
  const periodosAtivos = useMemo(() => periodosComDose(), []);

  const slotTopo   = useMemo(() => renderSlot(addons, "topo"),   [addons]);
  const slotMeio   = useMemo(() => renderSlot(addons, "meio"),   [addons]);
  const slotRodape = useMemo(() => renderSlot(addons, "rodape"), [addons]);

  const ctx = useMemo(() => ({
    periodo: cenario.usaPeriodos ? periodoSel : undefined,
    carta,
    cenario: cenarioId,
    listaFormulasRendered: cenario.usaPeriodos ? renderListaFormulas(periodoSel) : undefined,
    diaSemana: diaSel.label.toLowerCase(),
    semanaMes: semanaSel.frase,
    statusDrCaio: DR_CAIO_STATUS[statusIdx],
    falaDrCaio: DR_CAIO_FALAS[falaIdx].texto,
    obsDose: OBS_DOSE,
    assinatura: `${ASSINATURA_BEATRIZ.saudacao_fechamento}\n\n*${ASSINATURA_BEATRIZ.nome}*\n_${ASSINATURA_BEATRIZ.papel}_\n\n───────────\n${ASSINATURA_BEATRIZ.rodape_linha1}\n_${ASSINATURA_BEATRIZ.rodape_subtitulo1}_\n\n${ASSINATURA_BEATRIZ.rodape_linha2}\n_${ASSINATURA_BEATRIZ.rodape_subtitulo2}_\n───────────`,
    slotTopo, slotMeio, slotRodape,
  }), [cenarioId, periodoSel, diaSel, semanaSel, statusIdx, falaIdx, carta, cenario.usaPeriodos, slotTopo, slotMeio, slotRodape]);

  const preview = useMemo(
    () => renderTemplate(template[cenarioId], ctx).replace(/\n{3,}/g, "\n\n"),
    [template, cenarioId, ctx],
  );

  const cartaInjetada = cartaAtivaPara(carta, periodoSel.sigla, cenarioId);

  function insereTemplate(chave: string) {
    setTemplate(t => ({ ...t, [cenarioId]: t[cenarioId] + " " + chave }));
  }

  function patchAddon(id: AddOnId, patch: Partial<AddOnsConfig[AddOnId]>) {
    setAddons(a => ({ ...a, [id]: { ...a[id], ...patch } }));
  }

  function escolherVersiculo(idx: number) {
    const v = VERSICULOS_BIBLICOS[idx];
    patchAddon("versiculo", { texto: `_"${v.texto}"_`, meta: v.ref });
  }

  function escolherDia(idx: number) {
    const d = DIAS_SEMANA[idx];
    setDiaSel(d);
    patchAddon("dia_semana", { texto: `Hoje é *${d.label.toLowerCase()}* — ${d.frase.toLowerCase().replace(/\.$/, "")}.`, meta: d.chave });
  }

  function escolherSemana(idx: number) {
    const s = SEMANAS_MES[idx];
    setSemanaSel(s);
    patchAddon("semana_mes", { texto: `Estamos na *${s.frase}*.`, meta: s.chave });
  }

  return (
    <div style={{ minHeight: "100vh", background: tk.bg, color: tk.ink, fontFamily: tk.sans, padding: 14, display: "flex", flexDirection: "column", gap: 10, fontSize: 11 }}>

      {/* TOPO institucional */}
      <header style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: "10px 14px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.accent, letterSpacing: 2.5 }}>
            ★ TEATRO DA MENSAGERIA · 4 CENÁRIOS · TEMPLATE EDITÁVEL · 4 ADD-ONS · BEATRIZ ROMANOV v3 OPUS
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            Motor genérico de lembretes · placeholders + slots TOPO/MEIO/RODAPÉ pra mensagens opcionais
          </div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 1 }}>
            paciente exemplo: {PACIENTE.nome} · plano {PACIENTE.plano} · template renderiza pra QUALQUER paciente
          </div>
        </div>
        <div />
        <div style={{ padding: "6px 12px", background: tk.bg, borderLeft: `3px solid ${tk.accent}` }}>
          <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>TABELAS LIVE</div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.accent, marginTop: 2 }}>
            periodos_dia · mensagens_catalogo · catalogo_agentes · task_cards · followups · mensagens_addons
          </div>
        </div>
      </header>

      {/* SELETOR DE CENÁRIO · 4 abas */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {CENARIOS.map(c => {
          const sel = c.id === cenarioId;
          return (
            <button key={c.id} onClick={() => setCenarioId(c.id)} style={{
              padding: "10px 12px", textAlign: "left", cursor: "pointer",
              background: sel ? c.cor_bg : tk.bgAlt,
              border: `1px solid ${sel ? c.cor_primary : tk.border}`,
              borderTop: `3px solid ${sel ? c.cor_primary : tk.borderStrong}`,
              color: tk.ink, transition: "all 0.12s",
              ...(sel ? { boxShadow: `0 0 12px ${c.cor_primary}44` } : {}),
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: sel ? c.cor_primary : tk.inkSubtle, letterSpacing: 1.5 }}>
                  CENÁRIO {String(CENARIOS.indexOf(c)+1).padStart(2,"0")}
                </span>
                <span style={{ fontSize: 18 }}>{c.emoji}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: tk.ink }}>{c.nome}</div>
              <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkMuted, marginTop: 2, lineHeight: 1.4 }}>{c.subtitulo}</div>
              <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${tk.border}` }}>
                <div>🎯 {c.gatilho}</div>
                <div style={{ marginTop: 2 }}>📨 {c.destinatario}</div>
              </div>
            </button>
          );
        })}
      </section>

      {/* PERÍODOS (só pra cenários cronobiológicos) */}
      {cenario.usaPeriodos && (
        <section style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
              ▶ JANELA CRONOBIOLÓGICA · clique pra ver o preview daquele período
            </span>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>
              {periodosAtivos.length} mensagens/dia · 1 por período · agrega todas as fórmulas
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 3 }}>
            {PERIODOS_DIA.map(p => {
              const ativo = periodosAtivos.some(x => x.sigla === p.sigla);
              const sel = p.sigla === periodoSel.sigla;
              const cartaPiscando = cartaAtivaPara(carta, p.sigla, cenarioId);
              return (
                <button key={p.sigla} onClick={() => ativo && setPeriodoSel(p)} disabled={!ativo} style={{
                  background: sel ? p.cor_bg : ativo ? tk.bg : tk.bgSoft,
                  border: `1px solid ${sel ? p.cor_primary : ativo ? tk.border : tk.borderStrong}`,
                  borderTop: `3px solid ${ativo ? p.cor_primary : tk.borderStrong}`,
                  cursor: ativo ? "pointer" : "not-allowed", opacity: ativo ? 1 : 0.35,
                  padding: "6px 5px", textAlign: "left", color: tk.ink, transition: "all 0.12s",
                  ...(sel ? { boxShadow: `0 0 10px ${p.cor_primary}55` } : {}),
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: tk.mono, fontSize: 10, fontWeight: 700, color: ativo ? p.cor_primary : tk.inkSubtle, letterSpacing: 1.3 }}>{p.sigla}</span>
                    <span style={{ fontSize: 12 }}>{p.emoji}</span>
                  </div>
                  <div style={{ fontSize: 8, color: tk.ink, marginTop: 2, lineHeight: 1.2 }}>{p.nome}</div>
                  <div style={{ fontFamily: tk.mono, fontSize: 7, color: tk.inkMuted, marginTop: 1 }}>{p.janela_inicio}</div>
                  {cartaPiscando && (
                    <div style={{ marginTop: 3, padding: "1px 3px", background: "#E8A5D8", color: tk.bg, fontFamily: tk.mono, fontSize: 7, fontWeight: 700, letterSpacing: 0.5, textAlign: "center" }}>
                      ✨ CARTA
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* DIAS DA SEMANA + SEMANAS DO MÊS · seletores temporais */}
      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
        <div style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 10 }}>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 6 }}>
            ▶ DIA DA SEMANA · alimenta o add-on 📅 e o placeholder {`{DIA_SEMANA}`}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {DIAS_SEMANA.map((d, i) => {
              const sel = d.chave === diaSel.chave;
              return (
                <button key={d.chave} onClick={() => escolherDia(i)} style={{
                  padding: "5px 4px", textAlign: "left", cursor: "pointer",
                  background: sel ? "#7BC9A522" : tk.bg, color: sel ? "#7BC9A5" : tk.ink,
                  border: `1px solid ${sel ? "#7BC9A5" : tk.border}`,
                  borderTop: `3px solid ${sel ? "#7BC9A5" : tk.borderStrong}`,
                  fontFamily: tk.mono, fontSize: 8, fontWeight: sel ? 700 : 400, letterSpacing: 1,
                }}>
                  {d.label.slice(0, 3).toUpperCase()}
                </button>
              );
            })}
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 10, fontStyle: "italic", color: tk.inkMuted, marginTop: 6, padding: "4px 8px", borderLeft: `2px solid #7BC9A5`, background: tk.bg }}>
            "{diaSel.frase}"
          </div>
        </div>
        <div style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 10 }}>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 6 }}>
            ▶ SEMANA DO MÊS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3 }}>
            {SEMANAS_MES.map((s, i) => {
              const sel = s.chave === semanaSel.chave;
              return (
                <button key={s.chave} onClick={() => escolherSemana(i)} style={{
                  padding: "5px 4px", textAlign: "center", cursor: "pointer",
                  background: sel ? "#7BC9A522" : tk.bg, color: sel ? "#7BC9A5" : tk.ink,
                  border: `1px solid ${sel ? "#7BC9A5" : tk.border}`,
                  borderTop: `3px solid ${sel ? "#7BC9A5" : tk.borderStrong}`,
                  fontFamily: tk.mono, fontSize: 9, fontWeight: sel ? 700 : 400,
                }}>
                  {s.chave}ª
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ★★★ 4 ADD-ONS · toggle ON/OFF + texto editável + posição ★★★ */}
      <section style={{ background: tk.bgAlt, border: `1px solid #7BC9A555`, borderLeft: `3px solid #7BC9A5`, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 9, color: "#7BC9A5", letterSpacing: 1.5 }}>
            ★ 4 ADD-ONS · mensagens opcionais com posição configurável (topo · meio · rodapé)
          </span>
          <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkMuted }}>
            {Object.values(addons).filter(a => a.ativo).length}/4 ativos · injetados nos slots do template
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {Object.values(addons).map(a => (
            <div key={a.id} style={{
              padding: 10,
              background: a.ativo ? tk.bg : tk.bgSoft,
              border: `1px solid ${a.ativo ? SLOT_COR[a.posicao] + "55" : tk.border}`,
              borderLeft: `3px solid ${a.ativo ? SLOT_COR[a.posicao] : tk.borderStrong}`,
              opacity: a.ativo ? 1 : 0.55,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: tk.mono, fontSize: 10, color: tk.ink, cursor: "pointer", fontWeight: 700 }}>
                  <input type="checkbox" checked={a.ativo} onChange={e => patchAddon(a.id, { ativo: e.target.checked })}
                    aria-label={`Ativar add-on ${a.rotulo}`}
                    style={{ accentColor: SLOT_COR[a.posicao] }} />
                  <span style={{ fontSize: 14 }}>{a.emoji}</span> {a.rotulo}
                </label>
                <div style={{ display: "flex", gap: 2 }}>
                  {(["topo", "meio", "rodape"] as SlotPosicao[]).map(pos => (
                    <button key={pos} onClick={() => patchAddon(a.id, { posicao: pos })}
                      disabled={!a.ativo}
                      aria-label={`Posição ${pos}`}
                      style={{
                        padding: "2px 7px", cursor: a.ativo ? "pointer" : "not-allowed",
                        background: a.posicao === pos ? SLOT_COR[pos] : tk.bgAlt,
                        color: a.posicao === pos ? tk.bg : tk.inkMuted,
                        border: `1px solid ${a.posicao === pos ? SLOT_COR[pos] : tk.border}`,
                        fontFamily: tk.mono, fontSize: 8, letterSpacing: 1, fontWeight: a.posicao === pos ? 700 : 400,
                      }}>
                      {pos === "rodape" ? "RODAPÉ" : pos.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* atalho do versículo: chips com 6 versículos pré-prontos */}
              {a.id === "versiculo" && a.ativo && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 5 }}>
                  {VERSICULOS_BIBLICOS.map((v, i) => {
                    const sel = a.meta === v.ref;
                    return (
                      <button key={v.ref} onClick={() => escolherVersiculo(i)} title={v.texto}
                        style={{
                          padding: "2px 6px", cursor: "pointer",
                          background: sel ? "#A8C7FA22" : tk.bgAlt, color: sel ? "#A8C7FA" : tk.inkMuted,
                          border: `1px solid ${sel ? "#A8C7FA" : tk.border}`,
                          fontFamily: tk.mono, fontSize: 8, fontWeight: sel ? 700 : 400,
                        }}>
                        {v.ref}
                      </button>
                    );
                  })}
                </div>
              )}

              <textarea value={a.texto} onChange={e => patchAddon(a.id, { texto: e.target.value })}
                disabled={!a.ativo}
                placeholder={a.id === "custom" ? "ex: Bom mês de aniversário! 🎂" : "(texto da mensagem)"}
                aria-label={`Texto do add-on ${a.rotulo}`}
                style={{
                  width: "100%", minHeight: 42, background: tk.bg, color: tk.ink,
                  border: `1px solid ${tk.border}`, padding: 6,
                  fontFamily: a.id === "versiculo" ? "Georgia, serif" : tk.mono,
                  fontSize: 9, lineHeight: 1.4, resize: "vertical", outline: "none",
                  opacity: a.ativo ? 1 : 0.5,
                  fontStyle: a.id === "versiculo" ? "italic" : "normal",
                }} />

              <div style={{ fontFamily: tk.mono, fontSize: 7, color: tk.inkSubtle, marginTop: 4 }}>
                injetado em <strong style={{ color: SLOT_COR[a.posicao] }}>{`{SLOT_${a.posicao.toUpperCase()}}`}</strong>
                {a.id === "versiculo" && a.meta && <span> · ref: <em>{a.meta}</em></span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 8, lineHeight: 1.4 }}>
          <span style={{ color: "#7BC9A5" }}>regra Caio:</span> os 4 add-ons NÃO precisam estar todos ligados.
          marque os que quer + escolha onde (topo abre a mensagem, meio fica entre conteúdo, rodapé fecha antes da assinatura).
          o template tem 3 marcadores <strong style={{ color: "#7BC9A5" }}>{`{SLOT_TOPO}`}</strong>{" "}
          <strong style={{ color: "#F5C26B" }}>{`{SLOT_MEIO}`}</strong>{" "}
          <strong style={{ color: "#A8C7FA" }}>{`{SLOT_RODAPE}`}</strong> que recebem essas mensagens.
        </div>
      </section>

      {/* CORPO · 2 colunas: editor de template + preview WhatsApp */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 10, alignItems: "start" }}>

        {/* COLUNA ESQUERDA · TEMPLATE EDITOR + PLACEHOLDER PALETTE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

          <div style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${cenario.cor_primary}`, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>
                ▶ TEMPLATE GENÉRICO · {cenario.nome.toUpperCase()}
              </span>
              <span style={{ fontFamily: tk.mono, fontSize: 8, color: cenario.cor_primary }}>
                serve TODOS os pacientes · placeholders preenchidos por paciente
              </span>
            </div>
            <textarea
              value={template[cenarioId]}
              onChange={e => setTemplate(t => ({ ...t, [cenarioId]: e.target.value }))}
              spellCheck={false}
              aria-label={`Template do cenário ${cenario.nome}`}
              style={{
                width: "100%", minHeight: 360, background: tk.bg, color: tk.ink,
                border: `1px solid ${tk.border}`, padding: 10,
                fontFamily: tk.mono, fontSize: 10, lineHeight: 1.5, resize: "vertical",
                outline: "none",
              }}
            />
            <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 6, lineHeight: 1.4 }}>
              dica: edite livremente. clique num placeholder abaixo pra inserir no final.
              salvo em <code style={{ color: tk.accent }}>mensagens_catalogo.conteudo</code> chave=<code style={{ color: tk.accent }}>{cenario.id}.template</code>.
            </div>
          </div>

          <div style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 12 }}>
            <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 6 }}>
              ▶ PALETA DE PLACEHOLDERS · {phsCenario.length} disponíveis pra este cenário + 3 slots de add-on
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(["{SLOT_TOPO}","{SLOT_MEIO}","{SLOT_RODAPE}"] as const).map(s => {
                const pos = s.replace(/[{}]/g, "").replace("SLOT_", "").toLowerCase() as SlotPosicao;
                const cor = SLOT_COR[pos];
                return (
                  <button key={s} onClick={() => insereTemplate(s)} title={`slot de add-on (${pos})`}
                    style={{
                      padding: "4px 7px", cursor: "pointer",
                      background: tk.bg, color: cor,
                      border: `1px solid ${cor}55`, borderLeft: `2px solid ${cor}`,
                      fontFamily: tk.mono, fontSize: 9, fontWeight: 700,
                    }}>
                    {s}
                  </button>
                );
              })}
              {phsCenario.map(ph => {
                const cor = GRUPO_COR[ph.grupo];
                return (
                  <button key={ph.chave} onClick={() => insereTemplate(ph.chave)} title={ph.rotulo + " · ex: " + ph.exemplo}
                    style={{
                      padding: "4px 7px", cursor: "pointer",
                      background: tk.bg, color: cor,
                      border: `1px solid ${cor}55`, borderLeft: `2px solid ${cor}`,
                      fontFamily: tk.mono, fontSize: 9, fontWeight: 600,
                    }}>
                    {ph.chave}{ph.obrigatorio && <span style={{ color: tk.warn, marginLeft: 3 }}>*</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, auto)", gap: 6, marginTop: 8, fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle }}>
              {Object.entries(GRUPO_COR).map(([g, c]) => (
                <span key={g}><span style={{ display: "inline-block", width: 6, height: 6, background: c, marginRight: 3 }} />{g}</span>
              ))}
              <span><span style={{ color: tk.warn }}>*</span> obrigatório</span>
            </div>
          </div>

          {/* CONTROLES auxiliares */}
          {cenario.usaPeriodos && (
            <div style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 4 }}>STATUS DR. CAIO</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {DR_CAIO_STATUS.map((s, i) => (
                    <button key={i} onClick={() => setStatusIdx(i)} style={chipStyle(statusIdx === i, cenario.cor_primary)}>{s.substring(0, 55)}…</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 4 }}>FALA DR. CAIO</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {DR_CAIO_FALAS.map((f, i) => (
                    <button key={f.label} onClick={() => setFalaIdx(i)} style={chipStyle(falaIdx === i, cenario.cor_primary)}>{f.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Card CARTA ENCANTAMENTO ATIVA */}
          <div style={{ background: cartaInjetada ? "rgba(232,165,216,0.10)" : tk.bgAlt, border: `1px solid ${cartaInjetada ? "#E8A5D8" : tk.border}`, borderLeft: `3px solid #E8A5D8`, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: "#E8A5D8", letterSpacing: 1.5 }}>
                ✨ CARTA DE ENCANTAMENTO · {cartaInjetada ? "INJETADA AGORA" : "não aparece neste período/cenário"}
              </span>
              <span style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkMuted }}>
                janela {carta.dataInicio} → {carta.dataFim}
              </span>
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 11, color: tk.ink, fontStyle: "italic", padding: "4px 8px", background: tk.bg, borderLeft: `2px solid #E8A5D8` }}>
              "{carta.texto}"
            </div>
            <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, marginTop: 6, lineHeight: 1.4 }}>
              <span style={{ color: "#E8A5D8" }}>regra Caio:</span> a carta SÓ aparece em IM × Receita Manipulada + FN × Receita Manipulada
              (não 9x/dia). Matriz controlada no GPS · card{" "}
              <strong>"CARTA DE ENCANTAMENTO"</strong> embaixo do EditorBlend.
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA · PREVIEW WHATSAPP */}
        <div style={{ background: "#0a1a10", border: `1px solid ${cenario.cor_primary}44`, boxShadow: `0 12px 40px ${cenario.cor_primary}22`, display: "flex", flexDirection: "column", maxHeight: 1300 }}>
          <div style={{ background: "linear-gradient(90deg, #143820, #1a3d24)", padding: "11px 14px", borderBottom: `1px solid ${cenario.cor_primary}33`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${cenario.cor_primary}, ${cenario.cor_primary}aa)`, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif" }}>β</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif" }}>Beatriz Romanov · PADCON</div>
              <div style={{ fontSize: 10, color: "#88bb99", fontFamily: "Georgia, serif" }}>
                {cenario.emoji} {cenario.nome}{cenario.usaPeriodos ? ` · ${periodoSel.emoji} ${periodoSel.nome} · ${periodoSel.janela_inicio}` : ""}
              </div>
            </div>
            <div style={{ padding: "3px 8px", background: cenario.cor_primary, color: "#0a1a10", fontFamily: tk.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>
              {cenario.usaPeriodos ? periodoSel.sigla : cenario.id.split("_")[0].toUpperCase()}
            </div>
          </div>
          <div style={{ padding: 12, background: "#0f1e13", overflowY: "auto", flex: 1 }}>
            <div style={{ background: "#1a2e1e", padding: "13px 16px", borderLeft: `3px solid ${cenario.cor_primary}`, fontSize: 11, lineHeight: 1.7, color: "#d4e8d4", fontFamily: "Georgia, serif", whiteSpace: "pre-wrap" }}>
              {preview}
            </div>
          </div>
          <div style={{ padding: "9px 14px", borderTop: `1px solid ${cenario.cor_primary}33`, background: "#0a1a10", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: "#88bb99", letterSpacing: 1 }}>
              ✓✓ {cenario.canal} · template "{cenario.id}"
            </span>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: cenario.cor_primary, padding: "3px 8px", border: `1px solid ${cenario.cor_primary}55` }}>
              {cenario.id === "followup_estetico" ? "+ TASK_CARD pra fechadora" : "PRESCRICOES_LEMBRETE #—"}
            </span>
          </div>
        </div>
      </section>

      {/* RODAPÉ · matriz visual cenário × placeholders + gatilhos */}
      <section style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 10 }}>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 8 }}>
          ▶ MATRIZ MENSAGERIA · {CENARIOS.length} cenários × {PLACEHOLDERS.length} placeholders + 4 add-ons em 3 slots
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: tk.mono, fontSize: 8 }}>
            <thead>
              <tr>
                <th style={th()}>CENÁRIO</th>
                <th style={th()}>GATILHO</th>
                <th style={th()}>DESTINATÁRIO</th>
                <th style={th()}>CANAL</th>
                <th style={th()}>TABELAS</th>
                <th style={th()}>EXEMPLO</th>
              </tr>
            </thead>
            <tbody>
              {CENARIOS.map(c => (
                <tr key={c.id}>
                  <td style={{ ...td(), borderLeft: `3px solid ${c.cor_primary}` }}>
                    <strong style={{ color: c.cor_primary }}>{c.emoji} {c.nome}</strong>
                  </td>
                  <td style={td()}>{c.gatilho}</td>
                  <td style={td()}>{c.destinatario}</td>
                  <td style={td()}>{c.canal}</td>
                  <td style={td()}>
                    {c.id === "followup_estetico" ? "followups + task_cards + catalogo_agentes" : "prescricoes_lembrete + mensagens_catalogo + periodos_dia"}
                  </td>
                  <td style={{ ...td(), color: tk.inkMuted }}>{c.exemploTrigger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function chipStyle(ativo: boolean, cor: string): React.CSSProperties {
  return {
    fontFamily: tk.mono, fontSize: 9, padding: "4px 7px", cursor: "pointer", textAlign: "left",
    background: ativo ? cor : tk.bg, color: ativo ? tk.bg : tk.ink,
    border: `1px solid ${ativo ? cor : tk.border}`, fontWeight: ativo ? 700 : 400, letterSpacing: 0.5,
  };
}
function th(): React.CSSProperties { return { textAlign: "left", padding: "5px 8px", color: tk.inkSubtle, borderBottom: `1px solid ${tk.border}`, letterSpacing: 1, fontSize: 8 }; }
function td(): React.CSSProperties { return { padding: "6px 8px", color: tk.ink, borderBottom: `1px solid ${tk.border}`, verticalAlign: "top" }; }
