import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import type { CSSProperties } from "react";
import { Search, Clock, CheckCircle2, AlertTriangle, User, ChevronRight } from "lucide-react";

import { apiFetch } from "@/lib/api-fetch";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia/Governanca). Nao inventar hex novo aqui: tudo vem de PW / MONO.
import { PW, MONO } from "../craniotomia-shared";

interface Sessao {
  id: string;
  pacienteId: string;
  status: string;
  scoreFinal: number | null;
  banda: string | null;
  perguntasRespondidas: number;
  totalPerguntas: number;
  origemCanal: string | null;
  criadoEm: string;
  finalizadaEm: string | null;
  validadaEm: string | null;
}

// ── Bandas -> tokens PENUMBRA (cor + glow). Severidade verde->vermelha. ──
const BANDAS_CONFIG: Record<string, { cor: string; glow: string; label: string }> = {
  verde: { cor: PW.ok, glow: PW.cianoGlow, label: "Verde — Manutenção" },
  amarela: { cor: PW.warn, glow: "rgba(255,210,122,0.50)", label: "Amarela — Atenção" },
  laranja: { cor: PW.rosa, glow: "rgba(255,163,200,0.50)", label: "Laranja — Intervenção" },
  vermelha: { cor: PW.danger, glow: "rgba(208,138,138,0.50)", label: "Vermelha — Urgência" },
};

const STATUS_CONFIG: Record<string, { icone: any; cor: string; label: string }> = {
  em_andamento: { icone: Clock, cor: PW.t2, label: "Em andamento" },
  finalizada: { icone: AlertTriangle, cor: PW.warn, label: "Aguardando validação" },
  validada: { icone: CheckCircle2, cor: PW.ok, label: "Validada" },
};

const PENUMBRA_CSS = `
@keyframes paPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
.pa-pulse { animation: paPulse 1.4s ease-in-out infinite; }
.pa-card { transition: border-color .25s, box-shadow .25s; }
.pa-card:hover { box-shadow: 0 0 30px -10px var(--pa-glow); }
.pa-row { position: relative; isolation: isolate; transition: border-color .2s, box-shadow .2s, background .2s; }
.pa-row:hover { border-color: ${PW.borderNeon}; background: ${PW.bg3}; box-shadow: 0 0 28px -12px ${PW.cianoGlow}; }
.pa-row:hover .pa-chevron { color: ${PW.ciano}; }
.pa-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.pa-btn:hover { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.pa-field { transition: border-color .2s, box-shadow .2s; }
.pa-field:focus { border-color: ${PW.ciano}; box-shadow: 0 0 18px -10px ${PW.cianoGlow}; }
.pa-grid { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); }
@media (max-width: 768px) { .pa-grid { grid-template-columns: 1fr 1fr; } }
`;

const fieldStyle: CSSProperties = {
  background: PW.bg3,
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.text,
  fontSize: 13,
  fontFamily: MONO,
  outline: "none",
};

export default function PadcomAdmin() {
  const [, navigate] = useLocation();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroBanda, setFiltroBanda] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  const { data: sessoes = [], isLoading } = useQuery<Sessao[]>({
    queryKey: ["padcom-sessoes", filtroStatus, filtroBanda],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtroStatus !== "todos") params.set("status", filtroStatus);
      if (filtroBanda !== "todas") params.set("banda", filtroBanda);
      const r = await apiFetch(`/api/padcom-sessoes?${params}`);
      if (!r.ok) throw new Error("Falha ao carregar sessões");
      return r.json();
    },
  });

  const sessoesFiltradas = sessoes.filter(s =>
    busca ? s.pacienteId.toLowerCase().includes(busca.toLowerCase()) : true
  );

  // Contadores do funil
  const contadores = {
    total: sessoes.length,
    emAndamento: sessoes.filter(s => s.status === "em_andamento").length,
    aguardando: sessoes.filter(s => s.status === "finalizada").length,
    validadas: sessoes.filter(s => s.status === "validada").length,
  };

  return (
    <Layout>
      <style>{PENUMBRA_CSS}</style>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, fontFamily: MONO, background: PW.bg, minHeight: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: PW.ciano,
                textShadow: `0 0 16px ${PW.cianoGlow}`,
                margin: 0,
              }}
            >
              PADCOM Admin
            </h1>
            <p style={{ fontSize: 13, color: PW.t2, marginTop: 6 }}>
              Fila de sessões de anamnese — gerencie, valide e acompanhe o motor clínico
            </p>
          </div>
          <button
            className="pa-btn"
            onClick={() => navigate("/padcom-admin/dashboard")}
            style={{
              display: "inline-flex",
              alignItems: "center",
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
            }}
          >
            Ver Dashboard
          </button>
        </div>

        {/* Funil de status — chips */}
        <div className="pa-grid">
          {[
            { label: "Total", valor: contadores.total, cor: PW.muted, glow: "transparent" },
            { label: "Em andamento", valor: contadores.emAndamento, cor: PW.t2, glow: PW.cianoGlow },
            { label: "Aguardando validação", valor: contadores.aguardando, cor: PW.warn, glow: "rgba(255,210,122,0.50)" },
            { label: "Validadas", valor: contadores.validadas, cor: PW.ok, glow: PW.cianoGlow },
          ].map((item, idx) => (
            <div
              key={idx}
              className="pa-card"
              style={{
                background: PW.bg2,
                border: `1px solid ${PW.border}`,
                borderLeft: `3px solid ${item.cor}`,
                borderRadius: 0,
                padding: "12px 16px",
                ["--pa-glow" as keyof CSSProperties]: item.glow,
              } as CSSProperties}
            >
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: item.cor,
                  textShadow: `0 0 14px ${item.glow}`,
                  fontFamily: MONO,
                  margin: 0,
                }}
              >
                {item.valor}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: PW.muted,
                  marginTop: 6,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                color: PW.muted,
              }}
            />
            <input
              type="text"
              placeholder="Buscar por paciente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pa-field"
              style={{ ...fieldStyle, width: "100%", padding: "8px 16px 8px 36px" }}
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="pa-field"
            style={{ ...fieldStyle, padding: "8px 12px" }}
          >
            <option value="todos">Todos os status</option>
            <option value="em_andamento">Em andamento</option>
            <option value="finalizada">Aguardando validação</option>
            <option value="validada">Validadas</option>
          </select>
          <select
            value={filtroBanda}
            onChange={(e) => setFiltroBanda(e.target.value)}
            className="pa-field"
            style={{ ...fieldStyle, padding: "8px 12px" }}
          >
            <option value="todas">Todas as bandas</option>
            <option value="verde">Verde</option>
            <option value="amarela">Amarela</option>
            <option value="laranja">Laranja</option>
            <option value="vermelha">Vermelha</option>
          </select>
        </div>

        {/* Lista de sessões */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="pa-pulse"
                style={{ height: 72, background: PW.bg2, border: `1px solid ${PW.border}`, borderRadius: 0 }}
              />
            ))}
          </div>
        ) : sessoesFiltradas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: PW.muted }}>
            <User style={{ width: 48, height: 48, margin: "0 auto 12px", opacity: 0.5 }} />
            <p style={{ fontSize: 13, margin: 0 }}>Nenhuma sessão encontrada</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sessoesFiltradas.map(sessao => {
              const bandaConfig = sessao.banda ? BANDAS_CONFIG[sessao.banda] : null;
              const statusConfig = STATUS_CONFIG[sessao.status] ?? STATUS_CONFIG.em_andamento;
              const StatusIcon = statusConfig.icone;

              return (
                <button
                  key={sessao.id}
                  className="pa-row"
                  onClick={() => navigate(`/padcom-admin/${sessao.id}`)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    background: PW.bg2,
                    border: `1px solid ${PW.border}`,
                    borderRadius: 0,
                    padding: "12px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: MONO,
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 0,
                      background: PW.bg3,
                      border: `1px solid ${PW.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <User style={{ width: 20, height: 20, color: PW.muted }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: PW.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 14,
                        }}
                      >
                        {sessao.pacienteId}
                      </span>
                      {bandaConfig && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 0,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            border: `1px solid ${bandaConfig.cor}`,
                            color: bandaConfig.cor,
                            background: PW.bg3,
                          }}
                        >
                          {sessao.banda}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginTop: 4,
                        fontSize: 11,
                        color: PW.muted,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: statusConfig.cor }}>
                        <StatusIcon style={{ width: 12, height: 12 }} />
                        {statusConfig.label}
                      </span>
                      {sessao.scoreFinal != null && (
                        <span>Score: {sessao.scoreFinal}</span>
                      )}
                      <span>{sessao.perguntasRespondidas}/{sessao.totalPerguntas} respostas</span>
                      {sessao.origemCanal && (
                        <span
                          style={{
                            padding: "1px 6px",
                            background: PW.bg3,
                            border: `1px solid ${PW.border}`,
                            borderRadius: 0,
                            color: PW.t2,
                          }}
                        >
                          {sessao.origemCanal}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Seta */}
                  <ChevronRight
                    className="pa-chevron"
                    style={{ width: 20, height: 20, color: PW.muted, flexShrink: 0, transition: "color .2s" }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
