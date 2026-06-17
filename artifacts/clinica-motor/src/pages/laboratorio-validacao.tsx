import { Fragment, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { Edit3, ShieldCheck, History, AlertCircle, Search, X } from "lucide-react";

import { apiFetch } from "@/lib/api-fetch";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia e na Governanca). Nao inventar hex novo aqui.
import { PW, MONO, inputStyle, labelStyle } from "./craniotomia-shared";

type Analito = {
  codigo: string; nome: string; grupo: string;
  unidade_padrao_integrativa: string;
  terco_excelente: "SUPERIOR" | "INFERIOR" | "MEDIO";
  observacao_clinica: string | null;
  origem_referencia: string | null;
  ativo: boolean;
};

// Cores dos tercos na face escura (pasteis-neon, nao os verdes/azuis claros).
const COR_TERCO: Record<string, string> = {
  SUPERIOR: PW.ciano,   // excelente "para cima"
  MEDIO:    PW.gold,    // janela estreita do meio
  INFERIOR: PW.azul,    // invertido (azul da face)
};

const ROTULO_TERCO: Record<string, string> = {
  SUPERIOR: "Terco SUPERIOR e excelente",
  MEDIO:    "Terco MEDIO e excelente (janela estreita)",
  INFERIOR: "Terco INFERIOR e excelente (analito INVERTIDO)",
};

const LV_CSS = `
.lv-painel { transition: border-color .25s, box-shadow .25s; }
.lv-painel:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 32px -14px ${PW.cianoGlow}; }
.lv-row { transition: background .15s; }
.lv-row:hover { background: ${PW.bg3}; }
.lv-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.lv-btn:hover:not(:disabled) { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.lv-btn:disabled { opacity:.45; cursor:not-allowed; }
.lv-overlay { position: fixed; inset: 0; background: rgba(2,10,20,0.82); display: flex; align-items: flex-start; justify-content: center; padding: 48px 16px; z-index: 60; overflow: auto; }
`;

const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: PW.muted,
  borderBottom: `1px solid ${PW.border}`,
};
const td: CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: PW.text,
  borderBottom: `1px solid ${PW.border}`,
  verticalAlign: "top",
};

const btnOutline: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "transparent",
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.t2,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontFamily: MONO,
};
const btnPrimario: CSSProperties = {
  ...btnOutline,
  border: `1px solid ${PW.ciano}`,
  color: PW.ciano,
};

function badgeTerco(t: string) {
  const c = COR_TERCO[t] ?? PW.muted;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 8px",
        border: `1px solid ${c}`,
        borderRadius: 0,
        color: c,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: MONO,
      }}
    >
      {t}
    </span>
  );
}

export default function LaboratorioValidacao() {
  const [analitos, setAnalitos] = useState<Analito[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Analito | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Form fields
  const [tercoEx, setTercoEx] = useState<"SUPERIOR" | "INFERIOR" | "MEDIO">("SUPERIOR");
  const [obs, setObs] = useState("");
  const [origem, setOrigem] = useState("");
  const [validador, setValidador] = useState("");

  function carregar() {
    apiFetch(`/api/laboratorio/analitos`)
      .then(r => r.json())
      .then(j => setAnalitos(j.analitos || []))
      .catch(e => setErro(String(e)));
  }
  useEffect(carregar, []);

  function abrirEdicao(a: Analito) {
    setEditando(a);
    setTercoEx(a.terco_excelente);
    setObs(a.observacao_clinica ?? "");
    setOrigem(a.origem_referencia ?? "");
    setValidador("");
    apiFetch(`/api/laboratorio/analitos/${a.codigo}/historico-validacoes`)
      .then(r => r.json()).then(j => setHistorico(j.validacoes || []))
      .catch(() => setHistorico([]));
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    try {
      const resp = await apiFetch(`/api/laboratorio/analitos/${editando.codigo}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terco_excelente: tercoEx,
          observacao_clinica: obs,
          origem_referencia: origem,
          validado_por: validador || "validador-anonimo",
        }),
      });
      const j = await resp.json();
      if (!resp.ok) { setErro(j.error || "falha ao salvar"); return; }
      setEditando(null);
      carregar();
    } finally { setSalvando(false); }
  }

  const filtrados = analitos.filter(a =>
    !busca ||
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    a.codigo.toLowerCase().includes(busca.toLowerCase()) ||
    a.grupo.toLowerCase().includes(busca.toLowerCase())
  );

  const grupos = Array.from(new Set(filtrados.map(a => a.grupo))).sort();

  return (
    <Layout>
      <style>{LV_CSS}</style>
      <div style={{ padding: 24, minHeight: "100%", background: PW.bg, color: PW.text, fontFamily: MONO }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Cabecalho */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderLeft: `3px solid ${PW.ciano}`, paddingLeft: 14 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.04em", color: PW.text, margin: 0 }}>
                VALIDACAO SEMANTICA DE ANALITOS
              </h1>
              <p style={{ fontSize: 12, color: PW.t2, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
                Para cada analito, defina qual <strong style={{ color: PW.ciano }}>terco da faixa de referencia e o excelente</strong> na medicina integrativa.
                A maioria favorece o terco superior; alguns (SHBG, TSH, insulina, PCR, glicose, homocisteina) sao <strong style={{ color: PW.text }}>invertidos</strong>; potassio e ferritina favorecem o terco medio.
              </p>
            </div>
            <ShieldCheck style={{ width: 28, height: 28, color: PW.ciano, flexShrink: 0 }} />
          </div>

          {erro && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: PW.bg2, border: `1px solid ${PW.danger}`, borderLeft: `3px solid ${PW.danger}`, color: PW.danger, fontSize: 12 }}>
              <AlertCircle style={{ width: 16, height: 16 }} />{erro}
            </div>
          )}

          {/* Painel da tabela */}
          <section className="lv-painel" style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${PW.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck style={{ width: 16, height: 16, color: PW.ciano }} />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PW.t2 }}>
                  Analitos cadastrados ({filtrados.length})
                </span>
              </div>
              <div style={{ position: "relative", maxWidth: 320, width: "100%" }}>
                <Search style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: PW.muted }} />
                <input
                  placeholder="Buscar por nome, codigo ou grupo..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 28 }}
                />
              </div>
            </header>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO }}>
                <thead>
                  <tr>
                    <th style={th}>Analito</th>
                    <th style={th}>Grupo</th>
                    <th style={th}>Unidade</th>
                    <th style={th}>Terco excelente</th>
                    <th style={th}>Origem da regra</th>
                    <th style={{ ...th, textAlign: "right" }}>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map(g => (
                    <Fragment key={g}>
                      <tr style={{ background: PW.bg3 }}>
                        <td colSpan={6} style={{ ...td, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: PW.muted, padding: "6px 12px" }}>{g}</td>
                      </tr>
                      {filtrados.filter(a => a.grupo === g).map(a => (
                        <tr key={a.codigo} className="lv-row">
                          <td style={td}>
                            <div style={{ fontWeight: 700, color: PW.text }}>{a.nome}</div>
                            <div style={{ fontSize: 10, color: PW.muted }}>{a.codigo}</div>
                          </td>
                          <td style={{ ...td, color: PW.t2 }}>{a.grupo}</td>
                          <td style={{ ...td, color: PW.t2 }}>{a.unidade_padrao_integrativa}</td>
                          <td style={td}>
                            {badgeTerco(a.terco_excelente)}
                            <div style={{ fontSize: 10, color: PW.muted, marginTop: 4 }}>{ROTULO_TERCO[a.terco_excelente]}</div>
                          </td>
                          <td style={{ ...td, color: PW.t2 }}>
                            {a.origem_referencia || <span style={{ color: PW.muted, fontStyle: "italic" }}>sem origem</span>}
                          </td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <button className="lv-btn" style={btnOutline} onClick={() => abrirEdicao(a)}>
                              <Edit3 style={{ width: 12, height: 12 }} /> Validar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {grupos.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ ...td, textAlign: "center", color: PW.muted, padding: "24px 0" }}>Nenhum analito encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div style={{ fontSize: 10, color: PW.muted, textAlign: "center", paddingTop: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Developed and Supervised by PADCON
          </div>
        </div>
      </div>

      {/* Modal de validacao (PENUMBRA proprio, substitui shadcn Dialog) */}
      {editando && (
        <div className="lv-overlay" onClick={() => setEditando(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 640, background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}
          >
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${PW.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: PW.ciano }}>
                Validar regra integrativa: {editando.nome}
              </span>
              <button className="lv-btn" style={{ ...btnOutline, padding: 6 }} onClick={() => setEditando(null)} aria-label="Fechar">
                <X style={{ width: 14, height: 14 }} />
              </button>
            </header>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Qual terco da faixa e o excelente?</label>
                <select value={tercoEx} onChange={(e) => setTercoEx(e.target.value as any)} style={inputStyle}>
                  <option value="SUPERIOR">SUPERIOR — terco de cima (padrao para hormonios, vitaminas, minerais)</option>
                  <option value="INFERIOR">INFERIOR — terco de baixo (INVERTIDO: SHBG, TSH, insulina, PCR, glicose)</option>
                  <option value="MEDIO">MEDIO — terco do meio (janela estreita: potassio, ferritina)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Observacao clinica (aparece no grafico do paciente)</label>
                <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                  placeholder="Ex: SHBG alto sequestra testosterona livre. Terco inferior = excelente."
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Origem da regra</label>
                  <input value={origem} onChange={e => setOrigem(e.target.value)} placeholder="ex: JOAO_HIPOCONDRIACO, INSTITUTO_PADUA" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Quem esta validando</label>
                  <input value={validador} onChange={e => setValidador(e.target.value)} placeholder="ex: Dr. Caio" style={inputStyle} />
                </div>
              </div>

              {historico.length > 0 && (
                <div style={{ background: PW.bg, border: `1px solid ${PW.border}`, borderRadius: 0, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: PW.t2, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    <History style={{ width: 12, height: 12 }} /> Validacoes anteriores
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 128, overflowY: "auto" }}>
                    {historico.map((h: any) => (
                      <div key={h.id} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", gap: 8, borderBottom: `1px dashed ${PW.border}`, paddingBottom: 4 }}>
                        <span style={{ color: PW.text }}><strong style={{ color: PW.ciano }}>{h.validado_por || "anon"}</strong> &rarr; {h.terco_excelente_novo || "(sem mudanca)"}</span>
                        <span style={{ color: PW.muted }}>{new Date(h.criado_em).toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                <button className="lv-btn" style={btnOutline} onClick={() => setEditando(null)}>Cancelar</button>
                <button className="lv-btn" style={btnPrimario} onClick={salvar} disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar validacao"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
