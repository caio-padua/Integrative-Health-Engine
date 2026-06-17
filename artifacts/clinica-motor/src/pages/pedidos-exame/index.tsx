import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api-fetch";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia, Governanca e Laboratorio). Nao inventar hex novo aqui.
import { PW, MONO, inputStyle, labelStyle } from "../craniotomia-shared";
import {
  FileText,
  Plus,
  Download,
  Eye,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  X,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface PedidoExame {
  id: number;
  pacienteId: number;
  medicoId: number;
  unidadeId: number | null;
  status: string;
  exames: Array<{
    codigoExame: string;
    nomeExame: string;
    blocoOficial: string | null;
    grauDoBloco: string | null;
    corpoPedido: string;
    preparo: string | null;
    hd: string | null;
    cid: string | null;
  }>;
  hipoteseDiagnostica: string | null;
  cidPrincipal: string | null;
  incluirJustificativa: boolean;
  tipoJustificativa: string | null;
  observacaoMedica: string | null;
  criadoEm: string;
  validadoEm: string | null;
}

interface Paciente {
  id: number;
  nome: string;
  cpf: string;
}

interface ExameBase {
  codigoExame: string;
  nomeExame: string;
  blocoOficial: string | null;
  modalidade: string | null;
}

interface PreviaJustificativa {
  codigoExame: string;
  nomeExame: string;
  justificativas: {
    objetiva: string;
    narrativa: string;
    robusta: string;
  };
}

// ── Status -> tokens PENUMBRA (cor de borda/texto na face escura) ────────────
const statusConfig: Record<string, { label: string; cor: string }> = {
  RASCUNHO: { label: "Rascunho", cor: PW.muted },
  VALIDADO: { label: "Validado", cor: PW.ciano },
  CANCELADO: { label: "Cancelado", cor: PW.danger },
};

// ── CSS PENUMBRA: hover "luz por tras", foco neon ───────────────────────────
const PE_CSS = `
.pe-painel { transition: border-color .25s, box-shadow .25s; }
.pe-painel:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 32px -14px ${PW.cianoGlow}; }
.pe-row { transition: background .15s; }
.pe-row:hover { background: ${PW.bg3}; }
.pe-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.pe-btn:hover:not(:disabled) { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.pe-btn:disabled { opacity: .45; cursor: not-allowed; }
.pe-input { transition: border-color .2s, box-shadow .2s; }
.pe-input:focus { border-color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; outline: none; }
.pe-overlay { position: fixed; inset: 0; background: rgba(2,10,20,0.82); display: flex; align-items: flex-start; justify-content: center; padding: 48px 16px; z-index: 60; overflow: auto; }
`;

// ── Estilos compartilhados ──────────────────────────────────────────────────
const btnOutline: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  background: PW.bg2,
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.t2,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontFamily: MONO,
};
const btnPrimario: CSSProperties = {
  ...btnOutline,
  background: "rgba(95,230,204,0.12)",
  border: `1px solid ${PW.ciano}`,
  color: PW.ciano,
};
const btnGhost: CSSProperties = {
  ...btnOutline,
  background: "transparent",
  color: PW.muted,
};
const btnIcon: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 6,
  background: "transparent",
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.t2,
};

function Chip({ children, cor }: { children: React.ReactNode; cor?: string }) {
  const c = cor ?? PW.t2;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: c,
        border: `1px solid ${c}`,
        background: "transparent",
        borderRadius: 0,
        fontFamily: MONO,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function PedidosExame() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoExame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovo, setShowNovo] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [validandoId, setValidandoId] = useState<number | null>(null);
  const [previas, setPrevias] = useState<PreviaJustificativa[]>([]);
  const [carregandoPrevias, setCarregandoPrevias] = useState(false);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [examesDisponiveis, setExamesDisponiveis] = useState<ExameBase[]>([]);
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [buscaExame, setBuscaExame] = useState("");
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [examesSelecionados, setExamesSelecionados] = useState<string[]>([]);
  const [hd, setHd] = useState("");
  const [cid, setCid] = useState("");
  const [obs, setObs] = useState("");

  const [incluirJustificativa, setIncluirJustificativa] = useState(false);
  const [tipoJustificativa, setTipoJustificativa] = useState<string>("objetiva");

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    setLoading(true);
    const res = await apiFetch(`/api/pedidos-exame`);
    if (res.ok) setPedidos(await res.json());
    setLoading(false);
  }

  async function carregarPacientes() {
    const res = await apiFetch(`/api/pacientes`);
    if (res.ok) setPacientes(await res.json());
  }

  async function carregarExames() {
    const res = await apiFetch(`/api/catalogo/exames-base`);
    if (res.ok) {
      const data = await res.json();
      setExamesDisponiveis(data);
    }
  }

  function abrirNovo() {
    setShowNovo(true);
    setPacienteSelecionado(null);
    setExamesSelecionados([]);
    setHd("");
    setCid("");
    setObs("");
    carregarPacientes();
    carregarExames();
  }

  async function criarPedido() {
    if (!pacienteSelecionado || examesSelecionados.length === 0) return;
    const res = await apiFetch(`/api/pedidos-exame`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pacienteId: pacienteSelecionado.id,
        medicoId: user?.id,
        examesCodigos: examesSelecionados,
        hipoteseDiagnostica: hd || null,
        cidPrincipal: cid || null,
        observacaoMedica: obs || null,
      }),
    });
    if (res.ok) {
      setShowNovo(false);
      carregarPedidos();
    }
  }

  async function carregarPreviasJustificativa(pedidoId: number) {
    setCarregandoPrevias(true);
    const res = await apiFetch(`/api/pedidos-exame/${pedidoId}/previa-justificativas`);
    if (res.ok) {
      const data = await res.json();
      setPrevias(data.exames);
    }
    setCarregandoPrevias(false);
  }

  async function validarPedido(pedidoId: number) {
    const res = await apiFetch(`/api/pedidos-exame/${pedidoId}/validar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        validadoPor: user?.id,
        incluirJustificativa,
        tipoJustificativa: incluirJustificativa ? tipoJustificativa : null,
        hipoteseDiagnostica: hd || null,
        cidPrincipal: cid || null,
      }),
    });
    if (res.ok) {
      setValidandoId(null);
      setIncluirJustificativa(false);
      setPrevias([]);
      carregarPedidos();
    }
  }

  function abrirValidacao(pedido: PedidoExame) {
    setValidandoId(pedido.id);
    setIncluirJustificativa(false);
    setTipoJustificativa("objetiva");
    setHd(pedido.hipoteseDiagnostica || "");
    setCid(pedido.cidPrincipal || "");
    carregarPreviasJustificativa(pedido.id);
  }

  function abrirPdf(pedidoId: number, tipo: "solicitacao" | "justificativa") {
    window.open(`/api/pedidos-exame/${pedidoId}/pdf/${tipo}`, "_blank");
  }

  const pacientesFiltrados = pacientes.filter(
    (p) =>
      p.nome.toLowerCase().includes(buscaPaciente.toLowerCase()) ||
      p.cpf?.includes(buscaPaciente)
  );

  const examesFiltrados = examesDisponiveis.filter(
    (e) =>
      e.nomeExame.toLowerCase().includes(buscaExame.toLowerCase()) ||
      e.codigoExame.toLowerCase().includes(buscaExame.toLowerCase())
  );

  const toggleExame = (codigo: string) => {
    setExamesSelecionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  return (
    <Layout>
      <style>{PE_CSS}</style>
      <div style={{ padding: 24, minHeight: "100%", background: PW.bg, color: PW.text, fontFamily: MONO }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Cabecalho */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderLeft: `3px solid ${PW.ciano}`, paddingLeft: 14 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.04em", color: PW.text, margin: 0 }}>
                PEDIDOS DE EXAME
              </h1>
              <p style={{ fontSize: 12, color: PW.t2, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
                Solicitar exames, validar e gerar PDF com justificativa.
              </p>
            </div>
            <button className="pe-btn" style={btnPrimario} onClick={abrirNovo}>
              <Plus style={{ width: 14, height: 14 }} />
              Novo Pedido
            </button>
          </div>

          {showNovo && (
            <section className="pe-painel" style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}>
              <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${PW.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PW.t2 }}>
                  Novo Pedido de Exame
                </span>
                <button className="pe-btn" style={btnIcon} onClick={() => setShowNovo(false)} aria-label="Fechar">
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </header>

              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Paciente */}
                <div>
                  <label style={labelStyle}>Paciente</label>
                  {pacienteSelecionado ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, padding: "8px 12px", background: PW.bg3, border: `1px solid ${PW.border}` }}>
                      <span style={{ fontWeight: 700, color: PW.text }}>{pacienteSelecionado.nome}</span>
                      <span style={{ fontSize: 11, color: PW.muted }}>CPF: {pacienteSelecionado.cpf}</span>
                      <button className="pe-btn" style={{ ...btnIcon, marginLeft: "auto" }} onClick={() => setPacienteSelecionado(null)} aria-label="Remover paciente">
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ position: "relative" }}>
                        <Search style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: PW.muted }} />
                        <input
                          className="pe-input"
                          placeholder="Buscar paciente por nome ou CPF..."
                          value={buscaPaciente}
                          onChange={(e) => setBuscaPaciente(e.target.value)}
                          style={{ ...inputStyle, paddingLeft: 28 }}
                        />
                      </div>
                      {buscaPaciente && (
                        <div style={{ border: `1px solid ${PW.border}`, maxHeight: 160, overflowY: "auto", background: PW.bg }}>
                          {pacientesFiltrados.map((p) => (
                            <button
                              key={p.id}
                              className="pe-row"
                              style={{ width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, color: PW.text, background: "transparent", border: "none", borderBottom: `1px solid ${PW.border}`, cursor: "pointer", fontFamily: MONO }}
                              onClick={() => {
                                setPacienteSelecionado(p);
                                setBuscaPaciente("");
                              }}
                            >
                              <span style={{ fontWeight: 700, color: PW.text }}>{p.nome}</span>
                              <span style={{ fontSize: 11, color: PW.muted, marginLeft: 8 }}>CPF: {p.cpf}</span>
                            </button>
                          ))}
                          {pacientesFiltrados.length === 0 && (
                            <div style={{ padding: "8px 12px", fontSize: 13, color: PW.muted }}>Nenhum paciente encontrado</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Exames */}
                <div>
                  <label style={labelStyle}>Exames ({examesSelecionados.length} selecionados)</label>
                  <div style={{ position: "relative", marginTop: 4 }}>
                    <Search style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: PW.muted }} />
                    <input
                      className="pe-input"
                      placeholder="Buscar exame por nome ou codigo..."
                      value={buscaExame}
                      onChange={(e) => setBuscaExame(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 28 }}
                    />
                  </div>
                  {examesSelecionados.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {examesSelecionados.map((cod) => {
                        const ex = examesDisponiveis.find((e) => e.codigoExame === cod);
                        return (
                          <button
                            key={cod}
                            onClick={() => toggleExame(cod)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: PW.ciano,
                              border: `1px solid ${PW.ciano}`,
                              background: "rgba(95,230,204,0.10)",
                              borderRadius: 0,
                              fontFamily: MONO,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ex?.nomeExame || cod}
                            <X style={{ width: 12, height: 12, marginLeft: 2 }} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ border: `1px solid ${PW.border}`, marginTop: 8, maxHeight: 192, overflowY: "auto", background: PW.bg }}>
                    {examesFiltrados.slice(0, 50).map((e) => {
                      const selected = examesSelecionados.includes(e.codigoExame);
                      return (
                        <button
                          key={e.codigoExame}
                          className="pe-row"
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "6px 12px",
                            fontSize: 13,
                            border: "none",
                            borderBottom: `1px solid ${PW.border}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: selected ? "rgba(95,230,204,0.08)" : "transparent",
                            color: PW.text,
                            cursor: "pointer",
                            fontFamily: MONO,
                          }}
                          onClick={() => toggleExame(e.codigoExame)}
                        >
                          <div style={{ width: 16, height: 16, border: `1px solid ${selected ? PW.ciano : PW.border}`, background: selected ? "rgba(95,230,204,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {selected && <CheckCircle2 style={{ width: 12, height: 12, color: PW.ciano }} />}
                          </div>
                          <span style={{ fontSize: 11, color: PW.muted, width: 112, flexShrink: 0 }}>{e.codigoExame}</span>
                          <span style={{ color: PW.text }}>{e.nomeExame}</span>
                          {e.modalidade && (
                            <span style={{ fontSize: 10, background: PW.bg3, color: PW.t2, padding: "2px 6px", marginLeft: "auto", border: `1px solid ${PW.border}` }}>{e.modalidade}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Hipotese Diagnostica (HD)</label>
                    <input className="pe-input" value={hd} onChange={(e) => setHd(e.target.value)} placeholder="Ex: Investigacao metabolica" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>CID Principal</label>
                    <input className="pe-input" value={cid} onChange={(e) => setCid(e.target.value)} placeholder="Ex: Z00.0" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Observacao Medica</label>
                  <textarea className="pe-input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observacoes adicionais..." rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                  <button className="pe-btn" style={btnOutline} onClick={() => setShowNovo(false)}>Cancelar</button>
                  <button className="pe-btn" style={btnPrimario} onClick={criarPedido} disabled={!pacienteSelecionado || examesSelecionados.length === 0}>
                    Criar Pedido ({examesSelecionados.length} exames)
                  </button>
                </div>
              </div>
            </section>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: PW.muted, fontSize: 13 }}>Carregando pedidos...</div>
          ) : pedidos.length === 0 ? (
            <section className="pe-painel" style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}>
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <FileText style={{ width: 48, height: 48, color: PW.muted, margin: "0 auto 12px", display: "block" }} />
                <p style={{ color: PW.t2, fontSize: 13, margin: 0 }}>Nenhum pedido de exame ainda</p>
                <button className="pe-btn" style={{ ...btnOutline, marginTop: 16 }} onClick={abrirNovo}>
                  Criar primeiro pedido
                </button>
              </div>
            </section>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pedidos.map((pedido) => {
                const isExpanded = expandedId === pedido.id;
                const isValidando = validandoId === pedido.id;
                const cfg = statusConfig[pedido.status] || statusConfig.RASCUNHO;
                const examesList = pedido.exames || [];

                return (
                  <section
                    key={pedido.id}
                    className="pe-painel"
                    style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${isExpanded ? PW.ciano : PW.border}`, borderRadius: 0 }}
                  >
                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                          style={{ flexShrink: 0, background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                          onClick={() => setExpandedId(isExpanded ? null : pedido.id)}
                          aria-label={isExpanded ? "Recolher" : "Expandir"}
                        >
                          {isExpanded ? (
                            <ChevronDown style={{ width: 20, height: 20, color: PW.ciano }} />
                          ) : (
                            <ChevronRight style={{ width: 20, height: 20, color: PW.muted }} />
                          )}
                        </button>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: PW.muted }}>#{pedido.id}</span>
                            <Chip cor={cfg.cor}>{cfg.label}</Chip>
                            <span style={{ fontSize: 13, fontWeight: 700, color: PW.text }}>
                              {examesList.length} exame{examesList.length !== 1 ? "s" : ""}
                            </span>
                            {pedido.incluirJustificativa && (
                              <Chip cor={PW.gold}>Com Justificativa</Chip>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: PW.muted, marginTop: 4 }}>
                            Paciente ID: {pedido.pacienteId} | Criado: {new Date(pedido.criadoEm).toLocaleDateString("pt-BR")}{" "}
                            {new Date(pedido.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {pedido.status === "RASCUNHO" && (
                            <button className="pe-btn" style={btnOutline} onClick={() => abrirValidacao(pedido)}>
                              <CheckCircle2 style={{ width: 12, height: 12 }} />
                              Validar
                            </button>
                          )}
                          <button className="pe-btn" style={btnGhost} onClick={() => abrirPdf(pedido.id, "solicitacao")}>
                            <Eye style={{ width: 12, height: 12 }} />
                            PDF Solicitacao
                          </button>
                          {pedido.incluirJustificativa && pedido.status === "VALIDADO" && (
                            <button className="pe-btn" style={btnGhost} onClick={() => abrirPdf(pedido.id, "justificativa")}>
                              <Download style={{ width: 12, height: 12 }} />
                              PDF Justificativa
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${PW.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: PW.muted }}>
                            Exames do Pedido
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {examesList.map((exame, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, background: PW.bg3, border: `1px solid ${PW.border}`, padding: "8px 12px" }}>
                                <span style={{ fontSize: 11, color: PW.muted, width: 24, paddingTop: 2, flexShrink: 0 }}>{i + 1}.</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, color: PW.text }}>{exame.nomeExame}</div>
                                  <div style={{ fontSize: 11, color: PW.t2 }}>{exame.corpoPedido}</div>
                                  {exame.preparo && (
                                    <div style={{ fontSize: 11, color: PW.gold, marginTop: 2 }}>Preparo: {exame.preparo}</div>
                                  )}
                                  {exame.blocoOficial && (
                                    <span style={{ fontSize: 10, color: PW.ciano, border: `1px solid ${PW.ciano}`, padding: "1px 6px", marginTop: 4, display: "inline-block" }}>
                                      {exame.blocoOficial}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: 10, color: PW.muted }}>{exame.codigoExame}</span>
                              </div>
                            ))}
                          </div>

                          {pedido.hipoteseDiagnostica && (
                            <div style={{ fontSize: 13, color: PW.text }}>
                              <span style={{ fontWeight: 700, color: PW.t2 }}>HD:</span> {pedido.hipoteseDiagnostica}
                            </div>
                          )}
                          {pedido.cidPrincipal && (
                            <div style={{ fontSize: 13, color: PW.text }}>
                              <span style={{ fontWeight: 700, color: PW.t2 }}>CID:</span> {pedido.cidPrincipal}
                            </div>
                          )}
                          {pedido.observacaoMedica && (
                            <div style={{ fontSize: 13, color: PW.text }}>
                              <span style={{ fontWeight: 700, color: PW.t2 }}>Obs:</span> {pedido.observacaoMedica}
                            </div>
                          )}
                        </div>
                      )}

                      {isValidando && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${PW.ciano}`, display: "flex", flexDirection: "column", gap: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <AlertCircle style={{ width: 16, height: 16, color: PW.ciano }} />
                            <span style={{ fontWeight: 700, fontSize: 13, color: PW.text }}>Validar Pedido #{pedido.id}</span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div>
                              <label style={labelStyle}>Hipotese Diagnostica (HD)</label>
                              <input className="pe-input" value={hd} onChange={(e) => setHd(e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>CID</label>
                              <input className="pe-input" value={cid} onChange={(e) => setCid(e.target.value)} style={inputStyle} />
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                              <label style={{ ...labelStyle, marginBottom: 0 }}>Paciente precisa de justificativa para laboratorio/convenio?</label>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  className="pe-btn"
                                  style={incluirJustificativa ? btnPrimario : btnOutline}
                                  onClick={() => setIncluirJustificativa(true)}
                                >
                                  Sim
                                </button>
                                <button
                                  className="pe-btn"
                                  style={!incluirJustificativa ? btnPrimario : btnOutline}
                                  onClick={() => setIncluirJustificativa(false)}
                                >
                                  Nao
                                </button>
                              </div>
                            </div>

                            {incluirJustificativa && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, background: PW.bg3, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}` }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>Tipo de Justificativa:</label>
                                <div style={{ display: "flex", gap: 8 }}>
                                  {[
                                    { value: "objetiva", label: "Objetiva (curta)" },
                                    { value: "narrativa", label: "Narrativa (media)" },
                                    { value: "robusta", label: "Robusta (completa)" },
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      className="pe-btn"
                                      style={tipoJustificativa === opt.value ? btnPrimario : btnOutline}
                                      onClick={() => setTipoJustificativa(opt.value)}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>

                                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.10em", color: PW.muted, fontWeight: 700, marginTop: 4 }}>
                                  Previa das Justificativas
                                </div>
                                {carregandoPrevias ? (
                                  <div style={{ fontSize: 11, color: PW.muted }}>Carregando previas...</div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 256, overflowY: "auto" }}>
                                    {previas.map((p) => (
                                      <div key={p.codigoExame} style={{ background: PW.bg, border: `1px solid ${PW.border}`, padding: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: PW.text }}>{p.nomeExame}</div>
                                        <div style={{ fontSize: 11, color: PW.t2, marginTop: 4, lineHeight: 1.5 }}>
                                          {tipoJustificativa === "objetiva" && p.justificativas.objetiva}
                                          {tipoJustificativa === "narrativa" && p.justificativas.narrativa}
                                          {tipoJustificativa === "robusta" && p.justificativas.robusta}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                            <button className="pe-btn" style={btnOutline} onClick={() => { setValidandoId(null); setPrevias([]); }}>
                              Cancelar
                            </button>
                            <button className="pe-btn" style={btnPrimario} onClick={() => validarPedido(pedido.id)}>
                              <CheckCircle2 style={{ width: 12, height: 12 }} />
                              Confirmar Validacao
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div style={{ fontSize: 10, color: PW.muted, textAlign: "center", paddingTop: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Developed and Supervised by PADCON
          </div>
        </div>
      </div>
    </Layout>
  );
}
