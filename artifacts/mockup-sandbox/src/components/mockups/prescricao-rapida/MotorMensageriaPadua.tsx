import { useMemo, useState } from "react";
import { PACIENTE, CATALOGO, tk } from "./_tokens";
import {
  PERIODOS_DIA, DIAS_SEMANA, SEMANAS_MES, DR_CAIO_STATUS, DR_CAIO_FALAS,
  OBS_DOSE, ASSINATURA_BEATRIZ, horarioParaPeriodo,
  type PeriodoDia,
} from "./_mensageria";

// Pega Blend Menopausa (horários 08h e 20h) como base do preview
const blendMenopausa = CATALOGO.find(s => s.id === "blend-vo")!;
const blendEnergia   = CATALOGO.find(s => s.id === "blend-en")!;
const magnesio       = CATALOGO.find(s => s.id === "mag-vo")!;

// agrupa horários por período pra mostrar "1 disparo por período"
function agruparPorPeriodo(horarios: string[]): { periodo: PeriodoDia; horarios: string[] }[] {
  const map = new Map<string, { periodo: PeriodoDia; horarios: string[] }>();
  for (const h of horarios) {
    const p = horarioParaPeriodo(h);
    if (!p) continue;
    if (!map.has(p.sigla)) map.set(p.sigla, { periodo: p, horarios: [] });
    map.get(p.sigla)!.horarios.push(h);
  }
  return Array.from(map.values()).sort((a, b) => a.periodo.janela_inicio.localeCompare(b.periodo.janela_inicio));
}

// Coleta TODOS os horários das fórmulas VO do paciente
const todosHorariosDoDia = [
  ...(blendEnergia.horarios || []),    // 07h
  ...(blendMenopausa.horarios || []),  // 08h, 20h
  ...(magnesio.horarios || []),        // 12h, 22h
];
const periodosDoDia = agruparPorPeriodo(todosHorariosDoDia);

export function MotorMensageriaPadua() {
  const [periodoSel, setPeriodoSel] = useState<PeriodoDia>(periodosDoDia[1]?.periodo || PERIODOS_DIA[1]);
  const [dia, setDia] = useState(DIAS_SEMANA[2]);
  const [semana, setSemana] = useState(SEMANAS_MES[2]);
  const [statusIdx, setStatusIdx] = useState(0);
  const [falaIdx, setFalaIdx] = useState(0);

  // Fórmulas que disparam neste período
  const formulasNoPeriodo = useMemo(() => {
    const horariosDoPeriodo = todosHorariosDoDia.filter(h => {
      const p = horarioParaPeriodo(h);
      return p && p.sigla === periodoSel.sigla;
    });
    return [blendEnergia, blendMenopausa, magnesio].filter(f =>
      (f.horarios || []).some(h => horariosDoPeriodo.includes(h))
    ).map(f => ({
      ...f,
      horariosNeste: (f.horarios || []).filter(h => horariosDoPeriodo.includes(h)),
    }));
  }, [periodoSel]);

  const mensagemFinal = useMemo(() => {
    let s = `${periodoSel.saudacao}!\n\nSr. ${PACIENTE.nome.split(" ")[0]}, tudo bem?\n\n`;
    s += `${DR_CAIO_STATUS[statusIdx]}\n\n`;
    s += `Hoje é *${dia.label.toLowerCase()}* — estamos na *${semana.frase}*.\n\n`;
    s += `${periodoSel.abertura}\n\n${dia.frase}\n\n${periodoSel.desejo}\n\n`;
    s += `*Período: ${periodoSel.nome}*\n*Programado* para administrar:\n\n`;
    formulasNoPeriodo.forEach((f, i) => {
      s += `*Fórmula ${String(i + 1).padStart(2, "0")} — ${f.nome}*\n`;
      (f.componentes || []).forEach((c, j) => {
        s += `${["❶","❷","❸","❹","❺","❻","❼","❽"][j] || "•"} ${c.nome} ${c.dose} _[${j === 0 ? "1º ativo" : `${j+1}º ativo`}]_\n`;
      });
      if (!f.componentes) s += `❶ ${f.nome} ${f.dose} _[ativo único]_\n`;
      s += `   Horário: ${f.horariosNeste.join(" e ")} _[${periodoSel.nome}]_\n`;
      s += `Tomar 1 dose via oral\n\n`;
    });
    s += DR_CAIO_FALAS[falaIdx].texto + "\n\n";
    s += OBS_DOSE + "\n\n";
    s += `${ASSINATURA_BEATRIZ.saudacao_fechamento}\n\n*${ASSINATURA_BEATRIZ.nome}*\n_${ASSINATURA_BEATRIZ.papel}_\n\n───────────\n${ASSINATURA_BEATRIZ.rodape_linha1}\n_${ASSINATURA_BEATRIZ.rodape_subtitulo1}_\n\n${ASSINATURA_BEATRIZ.rodape_linha2}\n_${ASSINATURA_BEATRIZ.rodape_subtitulo2}_\n───────────`;
    return s;
  }, [periodoSel, dia, semana, statusIdx, falaIdx, formulasNoPeriodo]);

  const totalDisparosDia = periodosDoDia.length;
  const cor = periodoSel;

  return (
    <div style={{
      minHeight: "100vh", background: tk.bg, color: tk.ink,
      fontFamily: tk.sans, padding: 16, display: "flex", flexDirection: "column", gap: 12, fontSize: 11,
    }}>
      {/* Topo */}
      <header style={{
        background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: "10px 16px",
        display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center",
      }}>
        <div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.accent, letterSpacing: 2.5 }}>
            MOTOR DE MENSAGERIA · BEATRIZ ROMANOV · v3 OPUS
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
            Sistema de Lembrete Clínico por Período
          </div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 1 }}>
            paciente: {PACIENTE.nome} · {totalDisparosDia} disparos hoje · 1 por período (não por horário)
          </div>
        </div>
        <div />
        <div style={{
          padding: "6px 12px", background: tk.bg, borderLeft: `3px solid ${tk.accent}`,
        }}>
          <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>TABELAS LIVE NO BANCO</div>
          <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.accent, marginTop: 2 }}>
            periodos_dia · mensagens_catalogo · prescricoes_lembrete · whatsapp_mensagens_log
          </div>
        </div>
      </header>

      {/* Mapeamento horários → períodos (timeline cronobiológica) */}
      <section style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1.5 }}>
            ▶ MAPEAMENTO HORÁRIO → PERÍODO · clique pra escolher qual mensagem ver no preview
          </span>
          <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted }}>
            {totalDisparosDia} mensagens/dia · uma por período cronobiológico
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 4 }}>
          {PERIODOS_DIA.map(p => {
            const grupo = periodosDoDia.find(g => g.periodo.sigla === p.sigla);
            const ativo = !!grupo;
            const selecionado = periodoSel.sigla === p.sigla;
            return (
              <button key={p.sigla}
                onClick={() => ativo && setPeriodoSel(p)}
                disabled={!ativo}
                style={{
                  background: selecionado ? p.cor_bg : ativo ? tk.bg : tk.bgSoft,
                  border: `1px solid ${selecionado ? p.cor_primary : ativo ? tk.border : tk.borderStrong}`,
                  borderTop: `3px solid ${ativo ? p.cor_primary : tk.borderStrong}`,
                  cursor: ativo ? "pointer" : "not-allowed", opacity: ativo ? 1 : 0.4,
                  padding: "8px 6px", textAlign: "left", color: tk.ink,
                  transition: "all 0.12s",
                  ...(selecionado ? { boxShadow: `0 0 10px ${p.cor_primary}55` } : {}),
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: ativo ? p.cor_primary : tk.inkSubtle, letterSpacing: 1.5 }}>
                    {p.sigla}
                  </span>
                  <span style={{ fontSize: 14 }}>{p.emoji}</span>
                </div>
                <div style={{ fontSize: 9, color: tk.ink, marginTop: 2, lineHeight: 1.2 }}>{p.nome}</div>
                <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkMuted, marginTop: 1 }}>
                  {p.janela_inicio}–{p.janela_fim}
                </div>
                {ativo && (
                  <div style={{
                    marginTop: 5, padding: "2px 4px",
                    background: p.cor_primary, color: tk.bg,
                    fontFamily: tk.mono, fontSize: 8, fontWeight: 700, letterSpacing: 1, textAlign: "center",
                  }}>
                    1 DISPARO · {grupo!.horarios.join(" + ")}
                  </div>
                )}
                {!ativo && (
                  <div style={{
                    marginTop: 5, padding: "2px 4px",
                    fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1, textAlign: "center",
                    border: `1px dashed ${tk.border}`,
                  }}>sem dose</div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: 8, padding: "8px 10px",
          background: tk.bg, borderLeft: `3px solid ${cor.cor_primary}`,
        }}>
          <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle }}>
            REGRA: cada horário marcado no GPS cai numa janela cronobiológica.
            Múltiplos horários dentro da mesma janela ({cor.sigla} {cor.janela_inicio}–{cor.janela_fim})
            = <strong style={{ color: cor.cor_primary }}>1 ÚNICA mensagem WhatsApp</strong>,
            listando todas as fórmulas a tomar nesse período. Paciente empresário não é incomodado a toda hora.
          </span>
        </div>
      </section>

      {/* Conteúdo: controles + preview WhatsApp */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>

        {/* Controles dia/semana/status/fala */}
        <div style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <Block label="DIA DA SEMANA">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {DIAS_SEMANA.map(d => (
                <button key={d.chave} onClick={() => setDia(d)}
                  style={chip(dia.chave === d.chave, cor.cor_primary)}>
                  {d.label.replace("-feira", "").substring(0, 3)}
                </button>
              ))}
            </div>
          </Block>

          <Block label="SEMANA DO MÊS">
            <div style={{ display: "flex", gap: 4 }}>
              {SEMANAS_MES.map(s => (
                <button key={s.chave} onClick={() => setSemana(s)}
                  style={{ ...chip(semana.chave === s.chave, cor.cor_primary), flex: 1 }}>
                  {s.chave}ª SEM
                </button>
              ))}
            </div>
          </Block>

          <Block label="STATUS DO DR. CAIO (cabeçalho)">
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {DR_CAIO_STATUS.map((txt, i) => (
                <button key={i} onClick={() => setStatusIdx(i)}
                  style={{
                    ...chip(statusIdx === i, cor.cor_primary),
                    textAlign: "left", padding: "5px 8px", fontSize: 10, lineHeight: 1.3,
                  }}>
                  {txt.substring(0, 70)}…
                </button>
              ))}
            </div>
          </Block>

          <Block label="FALA DO DR. CAIO (rodapé)">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {DR_CAIO_FALAS.map((f, i) => (
                <button key={f.label} onClick={() => setFalaIdx(i)}
                  style={chip(falaIdx === i, cor.cor_primary)}>
                  {f.label}
                </button>
              ))}
            </div>
          </Block>

          <Block label="FÓRMULAS NESTE PERÍODO">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {formulasNoPeriodo.length === 0 && (
                <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle }}>
                  Nenhuma fórmula nesse período pro paciente atual.
                </div>
              )}
              {formulasNoPeriodo.map(f => (
                <div key={f.id} style={{
                  background: tk.bg, padding: "5px 8px", borderLeft: `3px solid ${cor.cor_primary}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{f.nome}</span>
                  <span style={{ fontFamily: tk.mono, fontSize: 9, color: cor.cor_primary }}>{f.horariosNeste.join(" + ")}</span>
                </div>
              ))}
            </div>
          </Block>
        </div>

        {/* PREVIEW WHATSAPP — paleta verde + Beatriz β + cor do período */}
        <div style={{
          background: "#0a1a10", border: `1px solid ${cor.cor_primary}44`,
          boxShadow: `0 12px 40px ${cor.cor_primary}22`, display: "flex", flexDirection: "column",
        }}>
          {/* Header chat */}
          <div style={{
            background: "linear-gradient(90deg, #143820, #1a3d24)",
            padding: "12px 16px", borderBottom: `1px solid ${cor.cor_primary}33`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `linear-gradient(135deg, ${cor.cor_primary}, ${cor.cor_accent})`,
              display: "grid", placeItems: "center",
              fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif",
            }}>β</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "Georgia, serif" }}>
                Beatriz Romanov · PADCON
              </div>
              <div style={{ fontSize: 10, color: "#88bb99", fontFamily: "Georgia, serif" }}>
                {cor.emoji} {cor.nome} · {cor.janela_inicio}–{cor.janela_fim}
              </div>
            </div>
            <div style={{
              padding: "3px 8px", background: cor.cor_primary, color: "#0a1a10",
              fontFamily: tk.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1,
            }}>{cor.sigla}</div>
          </div>

          {/* Balão da mensagem */}
          <div style={{ padding: 14, background: "#0f1e13", overflowY: "auto", maxHeight: 900 }}>
            <div style={{
              background: "#1a2e1e", padding: "14px 18px",
              borderLeft: `3px solid ${cor.cor_primary}`,
              fontSize: 11.5, lineHeight: 1.7, color: "#d4e8d4",
              fontFamily: "Georgia, serif", whiteSpace: "pre-wrap",
            }}>{mensagemFinal}</div>
          </div>

          {/* Rodapé com hora simulada de envio */}
          <div style={{
            padding: "10px 16px", borderTop: `1px solid ${cor.cor_primary}33`,
            background: "#0a1a10", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: tk.mono, fontSize: 9, color: "#88bb99", letterSpacing: 1 }}>
              ✓✓ programado pra {cor.janela_inicio} · canal whatsapp · template v3 opus
            </span>
            <span style={{
              fontFamily: tk.mono, fontSize: 9, color: cor.cor_primary,
              padding: "3px 8px", border: `1px solid ${cor.cor_primary}55`,
            }}>PRESCRICOES_LEMBRETE #—</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function chip(ativo: boolean, cor: string): React.CSSProperties {
  return {
    fontFamily: tk.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
    padding: "5px 10px", cursor: "pointer",
    background: ativo ? cor : tk.bg, color: ativo ? tk.bg : tk.ink,
    border: `1px solid ${ativo ? cor : tk.border}`, transition: "all 0.12s",
    ...(ativo ? { boxShadow: `0 0 8px ${cor}55` } : {}),
  };
}
