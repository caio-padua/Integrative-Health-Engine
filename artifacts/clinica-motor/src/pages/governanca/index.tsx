import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  FileCheck,
  Bell,
  Activity,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  TestTube,
  MessageSquare,
  Check,
  CheckCheck,
  X,
  ShieldCheck,
} from "lucide-react";

import { apiFetch } from "@/lib/api-fetch";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia). Nao inventar hex novo aqui: tudo vem de PW / MONO.
import { PW, MONO } from "../craniotomia-shared";

interface KpiData {
  valor: number;
  status: "VERDE" | "AMARELO" | "VERMELHO";
  descricao: string;
}

interface PainelData {
  statusGeral: "VERDE" | "AMARELO" | "VERMELHO";
  kpis: {
    filaPendente: KpiData;
    validacoesPendentes: KpiData;
    alertasAbertos: KpiData;
  };
  timestamp: string;
}

interface SemaforoData {
  semaforo: "VERDE" | "AMARELO" | "VERMELHO";
  filasCriticas: number;
  filasAtencao: number;
  descricao: string;
}

interface EventoTimeline {
  id: number;
  tipo: string;
  descricao: string;
  usuarioNome: string | null;
  pacienteId: number | null;
  criadoEm: string;
}

interface FilaStats {
  porStatus: { status: string; total: number }[];
  expirados: number;
}

interface CascataEtapa {
  etapa: "ENFERMEIRA03" | "CONSULTOR03" | "MEDICO03" | "MEDICO_SENIOR";
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
}

interface CascataItem {
  entidadeTipo: string;
  entidadeId: number;
  pacienteId: number | null;
  pacienteNome: string | null;
  selo: "VERDE" | "AMARELO" | "VERMELHO" | "CINZA";
  etapas: CascataEtapa[];
  aprovadas: number;
  total: number;
}

interface CascataPainel {
  total: number;
  resumo: { verde: number; amarelo: number; vermelho: number; cinza: number };
  cascatas: CascataItem[];
  timestamp: string;
}

interface ExamesSemaforoGeral {
  semaforo: "VERDE" | "AMARELO" | "VERMELHO";
  total: number;
  verdes: number;
  amarelos: number;
  vermelhos: number;
}

interface ExamePaciente {
  id: number;
  nome_exame: string;
  categoria: string | null;
  valor: number;
  unidade: string | null;
  valor_minimo: number;
  valor_maximo: number;
  terco: number | null;
  classificacao_automatica: string | null;
  classificacao_manual: string | null;
  tendencia: string | null;
  delta_percentual: number | null;
  formula_vigente: string | null;
  data_coleta: string | null;
  laboratorio: string | null;
  criado_em: string;
  corFinal: string;
}

interface DashboardExamesPaciente {
  pacienteId: number;
  semaforoGeral: "VERDE" | "AMARELO" | "VERMELHO";
  resumo: { verdes: number; amarelos: number; vermelhos: number; total: number };
  exames: ExamePaciente[];
}

// ── Mapa de status -> tokens PENUMBRA (cor + glow). CINZA = neutro/apagado. ──
const STATUS_COR: Record<string, string> = {
  VERDE: PW.ok,
  AMARELO: PW.warn,
  VERMELHO: PW.danger,
  CINZA: PW.muted,
};
const STATUS_GLOW: Record<string, string> = {
  VERDE: PW.cianoGlow,
  AMARELO: "rgba(255,210,122,0.50)",
  VERMELHO: "rgba(208,138,138,0.50)",
  CINZA: "transparent",
};
const SELO_COR = STATUS_COR;

// ── Estilos compartilhados (botoes / vazios) ────────────────────────────────
const btnOutline: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 12px",
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

const PENUMBRA_CSS = `
@keyframes gvSpin { to { transform: rotate(360deg); } }
@keyframes gvPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }
.gv-spin { animation: gvSpin 1s linear infinite; }
.gv-pulse { animation: gvPulse 2s ease-in-out infinite; }
.gv-painel { transition: border-color .25s, box-shadow .25s; }
.gv-painel:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 32px -14px ${PW.cianoGlow}; }
.gv-card { position: relative; isolation: isolate; transition: box-shadow .2s, transform .12s; }
.gv-card:hover { box-shadow: 0 0 30px -10px var(--gv-glow); }
.gv-card-click:hover { transform: translateY(-1px); }
.gv-row { transition: background .15s; }
.gv-row:hover { background: ${PW.bg3}; }
.gv-exrow { transition: background .15s; }
.gv-exrow:hover { background: ${PW.bg3}; }
.gv-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.gv-btn:hover:not(:disabled) { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.gv-btn:disabled { opacity: .45; cursor: not-allowed; }
.gv-top { display: grid; gap: 24px; grid-template-columns: 1fr; }
@media (min-width: 1024px) { .gv-top { grid-template-columns: 1fr 4fr; } }
.gv-kpis { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
@media (min-width: 768px) { .gv-kpis { grid-template-columns: repeat(4, 1fr); } }
.gv-two { display: grid; gap: 24px; grid-template-columns: 1fr; }
@media (min-width: 1024px) { .gv-two { grid-template-columns: 1fr 1fr; } }
`;

const baseUrl = import.meta.env.BASE_URL || "/";
const apiBase = `${baseUrl}api`.replace(/\/\//g, "/");

async function fetchApi<T>(path: string): Promise<T> {
  const res = await apiFetch(`${apiBase}${path}`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

// ── Painel PENUMBRA (retangulo-dentro-retangulo + faixa de titulo + neon) ────
function Painel({
  titulo,
  icon: Icon,
  acessorio,
  children,
  bodyStyle,
}: {
  titulo: string;
  icon: typeof Shield;
  acessorio?: ReactNode;
  children: ReactNode;
  bodyStyle?: CSSProperties;
}) {
  return (
    <section
      className="gv-painel"
      style={{
        background: PW.bg2,
        border: `1px solid ${PW.border}`,
        borderLeft: `3px solid ${PW.ciano}`,
        borderRadius: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 16px",
          borderBottom: `1px solid ${PW.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 16, height: 16, color: PW.ciano }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: PW.t2,
            }}
          >
            {titulo}
          </span>
        </div>
        {acessorio}
      </header>
      <div style={{ padding: 16, ...bodyStyle }}>{children}</div>
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 0", color: PW.muted, fontSize: 13 }}>
      {texto}
    </div>
  );
}

function SemaforoGrande({ status }: { status: "VERDE" | "AMARELO" | "VERMELHO" }) {
  const luzes: ("VERMELHO" | "AMARELO" | "VERDE")[] = ["VERMELHO", "AMARELO", "VERDE"];
  const label =
    status === "VERDE"
      ? "OPERACAO NORMAL"
      : status === "AMARELO"
        ? "ATENCAO NECESSARIA"
        : "INTERVENCAO URGENTE";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 16,
        background: PW.bg2,
        border: `1px solid ${PW.border}`,
        borderRadius: 0,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: PW.muted,
        }}
      >
        ESTADO DA CLINICA
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 14,
          background: PW.bg,
          border: `1px solid ${PW.border}`,
          borderRadius: 0,
        }}
      >
        {luzes.map((cor) => {
          const ativo = status === cor;
          const c = STATUS_COR[cor];
          return (
            <div
              key={cor}
              className={ativo ? "gv-pulse" : undefined}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: ativo ? c : PW.bg3,
                border: `1px solid ${ativo ? c : PW.border}`,
                boxShadow: ativo ? `0 0 26px 2px ${STATUS_GLOW[cor]}` : "none",
                transition: "all .5s",
              }}
            />
          );
        })}
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: STATUS_COR[status],
          textShadow: `0 0 12px ${STATUS_GLOW[status]}`,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function KpiCard({
  titulo,
  valor,
  status,
  descricao,
  icon: Icon,
  onClick,
}: {
  titulo: string;
  valor: number;
  status: "VERDE" | "AMARELO" | "VERMELHO";
  descricao: string;
  icon: typeof Shield;
  onClick?: () => void;
}) {
  const cor = STATUS_COR[status];
  const glow = STATUS_GLOW[status];
  return (
    <div
      className={`gv-card${onClick ? " gv-card-click" : ""}`}
      onClick={onClick}
      style={{
        background: PW.bg2,
        border: `1px solid ${PW.border}`,
        borderLeft: `3px solid ${cor}`,
        borderRadius: 0,
        padding: 16,
        cursor: onClick ? "pointer" : "default",
        ["--gv-glow" as keyof CSSProperties]: glow,
      } as CSSProperties}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: PW.muted,
          }}
        >
          {titulo}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {onClick && <ChevronDown style={{ width: 12, height: 12, color: PW.muted }} />}
          <Icon style={{ width: 18, height: 18, color: cor }} />
        </div>
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: cor,
          textShadow: `0 0 16px ${glow}`,
        }}
      >
        {valor}
      </div>
      <p style={{ fontSize: 11, color: PW.t2, marginTop: 8 }}>{descricao}</p>
    </div>
  );
}

function TimelineEventos({ eventos }: { eventos: EventoTimeline[] }) {
  if (eventos.length === 0) {
    return <Vazio texto="Nenhum evento clinico registrado ainda" />;
  }

  const iconeEvento: Record<string, typeof Activity> = {
    ANAMNESE: FileCheck,
    VALIDACAO: CheckCircle2,
    ALERTA: AlertTriangle,
    SESSAO: Activity,
    FILA: Users,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {eventos.map((evento) => {
        const Icon = iconeEvento[evento.tipo] || Activity;
        const data = new Date(evento.criadoEm);
        const horaFormatada = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const dataFormatada = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

        return (
          <div
            key={evento.id}
            className="gv-row"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "8px 12px",
              borderLeft: `2px solid ${PW.border}`,
            }}
          >
            <Icon style={{ width: 16, height: 16, color: PW.muted, marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  color: PW.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  margin: 0,
                }}
              >
                {evento.descricao}
              </p>
              <p style={{ fontSize: 11, color: PW.muted, margin: 0 }}>
                {evento.usuarioNome && <span>{evento.usuarioNome} — </span>}
                {dataFormatada} {horaFormatada}
              </p>
            </div>
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                background: PW.bg3,
                color: PW.t2,
                fontFamily: MONO,
                textTransform: "uppercase",
                border: `1px solid ${PW.border}`,
                flexShrink: 0,
              }}
            >
              {evento.tipo}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FilaPreceptorStats({ stats }: { stats: FilaStats | null }) {
  if (!stats) return null;

  const statusMap: Record<string, { label: string; cor: string; icon: typeof Clock }> = {
    AGUARDANDO: { label: "Aguardando", cor: PW.warn, icon: Clock },
    HOMOLOGADO: { label: "Homologado", cor: PW.ok, icon: CheckCircle2 },
    REJEITADO: { label: "Rejeitado", cor: PW.danger, icon: XCircle },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {stats.porStatus.map((item) => {
        const config = statusMap[item.status] || { label: item.status, cor: PW.muted, icon: Activity };
        const Icon = config.icon;
        return (
          <div
            key={item.status}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderLeft: `2px solid ${config.cor}`,
              background: PW.bg3,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon style={{ width: 16, height: 16, color: config.cor }} />
              <span style={{ fontSize: 13, color: PW.text }}>{config.label}</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: config.cor, fontFamily: MONO }}>
              {Number(item.total)}
            </span>
          </div>
        );
      })}
      {stats.expirados > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderLeft: `2px solid ${PW.danger}`,
            background: "rgba(208,138,138,0.10)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle style={{ width: 16, height: 16, color: PW.danger }} />
            <span style={{ fontSize: 13, color: PW.danger, fontWeight: 700 }}>Prazo Expirado</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: PW.danger, fontFamily: MONO }}>
            {stats.expirados}
          </span>
        </div>
      )}
    </div>
  );
}

function TendenciaIcon({ tendencia, delta }: { tendencia: string | null; delta: number | null }) {
  if (!tendencia || tendencia === "ESTAVEL") {
    return <Minus style={{ width: 16, height: 16, color: PW.muted }} />;
  }
  if (tendencia === "SUBINDO") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: PW.warn }}>
        <TrendingUp style={{ width: 16, height: 16 }} />
        {delta !== null && <span>+{delta}%</span>}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: PW.ciano }}>
      <TrendingDown style={{ width: 16, height: 16 }} />
      {delta !== null && <span>{delta}%</span>}
    </span>
  );
}

function BarraVisualTerco({ valor, min, max, cor }: { valor: number; min: number; max: number; cor: string }) {
  const range = max - min;
  const clamped = Math.max(min, Math.min(max, valor));
  const percent = range > 0 ? ((clamped - min) / range) * 100 : 50;
  const c = STATUS_COR[cor] || PW.muted;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 12,
        background: PW.bg,
        borderRadius: 0,
        border: `1px solid ${PW.border}`,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: "33%", width: 1, height: "100%", background: PW.border }} />
      <div style={{ position: "absolute", top: 0, left: "66%", width: 1, height: "100%", background: PW.border }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: `${percent}%`,
          background: c,
          boxShadow: `0 0 10px ${c}`,
          transition: "width .5s",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -2,
          height: "calc(100% + 4px)",
          width: 8,
          background: PW.text,
          borderRadius: 0,
          left: `calc(${percent}% - 4px)`,
        }}
      />
    </div>
  );
}

function SubDashboardExames({
  pacienteId,
  aberto,
  onFechar,
}: {
  pacienteId: number;
  aberto: boolean;
  onFechar: () => void;
}) {
  const [dados, setDados] = useState<DashboardExamesPaciente | null>(null);
  const [exameExpandido, setExameExpandido] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (aberto && pacienteId > 0) {
      setCarregando(true);
      fetchApi<DashboardExamesPaciente>(`/pacientes/${pacienteId}/exames/dashboard`)
        .then(setDados)
        .catch(console.error)
        .finally(() => setCarregando(false));
    }
  }, [aberto, pacienteId]);

  if (!aberto) return null;

  return (
    <section
      style={{
        background: PW.bg2,
        border: `1px solid ${PW.border}`,
        borderTop: `3px solid ${PW.ciano}`,
        borderRadius: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${PW.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TestTube style={{ width: 16, height: 16, color: PW.ciano }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: PW.t2,
            }}
          >
            Exames do Paciente #{pacienteId} — Sub-Dashboard
          </span>
        </div>
        <button className="gv-btn" onClick={onFechar} style={btnIcon}>
          <ChevronUp style={{ width: 16, height: 16 }} />
        </button>
      </header>
      <div style={{ padding: 16 }}>
        {carregando && (
          <div className="gv-pulse" style={{ textAlign: "center", padding: "24px 0", color: PW.muted, fontSize: 13 }}>
            Carregando exames...
          </div>
        )}

        {!carregando && dados && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 12,
                background: PW.bg3,
                border: `1px solid ${PW.border}`,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: STATUS_COR[dados.semaforoGeral],
                  boxShadow: `0 0 12px ${STATUS_GLOW[dados.semaforoGeral]}`,
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COR[dados.semaforoGeral] }}>
                {dados.semaforoGeral === "VERDE"
                  ? "Todos exames normais"
                  : dados.semaforoGeral === "AMARELO"
                    ? "Exames requerem atencao"
                    : "Exames criticos detectados"}
              </span>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
                <span style={{ color: PW.ok }}>{dados.resumo.verdes} verdes</span>
                <span style={{ color: PW.warn }}>{dados.resumo.amarelos} amarelos</span>
                <span style={{ color: PW.danger }}>{dados.resumo.vermelhos} vermelhos</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {dados.exames.map((exame) => {
                const expandido = exameExpandido === exame.nome_exame;
                return (
                  <div key={exame.id} style={{ border: `1px solid ${PW.border}` }}>
                    <button
                      className="gv-exrow"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: PW.text,
                        fontFamily: MONO,
                      }}
                      onClick={() => setExameExpandido(expandido ? null : exame.nome_exame)}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: STATUS_COR[exame.corFinal] || PW.muted,
                          boxShadow: `0 0 8px ${STATUS_GLOW[exame.corFinal] || "transparent"}`,
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500, color: PW.text, flex: 1 }}>{exame.nome_exame}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: PW.text }}>{exame.valor}</span>
                      <span style={{ fontSize: 11, color: PW.muted }}>{exame.unidade}</span>
                      <TendenciaIcon tendencia={exame.tendencia} delta={exame.delta_percentual} />
                      {expandido ? (
                        <ChevronUp style={{ width: 12, height: 12, color: PW.muted }} />
                      ) : (
                        <ChevronDown style={{ width: 12, height: 12, color: PW.muted }} />
                      )}
                    </button>

                    {expandido && (
                      <div
                        style={{
                          padding: "4px 12px 12px",
                          background: PW.bg,
                          borderTop: `1px solid ${PW.border}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        <BarraVisualTerco
                          valor={exame.valor}
                          min={exame.valor_minimo}
                          max={exame.valor_maximo}
                          cor={exame.corFinal}
                        />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: PW.muted,
                          }}
                        >
                          <span>Min: {exame.valor_minimo}</span>
                          <span style={{ fontSize: 10 }}>T1 | T2 | T3</span>
                          <span>Max: {exame.valor_maximo}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                          <div>
                            <span style={{ color: PW.muted }}>Categoria:</span>{" "}
                            <span style={{ color: PW.text }}>{exame.categoria || "—"}</span>
                          </div>
                          <div>
                            <span style={{ color: PW.muted }}>Laboratorio:</span>{" "}
                            <span style={{ color: PW.text }}>{exame.laboratorio || "—"}</span>
                          </div>
                          <div>
                            <span style={{ color: PW.muted }}>Data Coleta:</span>{" "}
                            <span style={{ color: PW.text }}>{exame.data_coleta || "—"}</span>
                          </div>
                          <div>
                            <span style={{ color: PW.muted }}>Terco:</span>{" "}
                            <span style={{ fontWeight: 700, color: STATUS_COR[exame.corFinal] || PW.text }}>
                              {exame.terco === 1
                                ? "Inferior"
                                : exame.terco === 2
                                  ? "Medio"
                                  : exame.terco === 3
                                    ? "Superior"
                                    : exame.terco === 0
                                      ? "Abaixo min"
                                      : exame.terco === 4
                                        ? "Acima max"
                                        : "—"}
                            </span>
                          </div>
                          {exame.formula_vigente && (
                            <div style={{ gridColumn: "span 2" }}>
                              <span style={{ color: PW.muted }}>Formula Vigente:</span>{" "}
                              <span style={{ color: PW.text, fontFamily: MONO, fontSize: 11 }}>
                                {exame.formula_vigente}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {dados.exames.length === 0 && (
                <Vazio texto="Nenhum exame registrado para este paciente" />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CascatasCard({ painel }: { painel: CascataPainel | null }) {
  const etapaLabel: Record<string, string> = {
    ENFERMEIRA03: "ENF",
    CONSULTOR03: "CON",
    MEDICO03: "MED",
    MEDICO_SENIOR: "SEN",
  };
  const pill = (status: string): { color: string; border: string; bg: string } => {
    if (status === "APROVADO") return { color: PW.ok, border: PW.ok, bg: "rgba(95,230,204,0.12)" };
    if (status === "REJEITADO") return { color: PW.danger, border: PW.danger, bg: "rgba(208,138,138,0.12)" };
    return { color: PW.muted, border: PW.border, bg: PW.bg3 };
  };

  return (
    <Painel
      titulo="Cascatas de Validacao — Ao Vivo"
      icon={ShieldCheck}
      acessorio={
        painel && painel.total > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, fontFamily: MONO }}>
            <span style={{ color: PW.ok }}>{painel.resumo.verde} selo verde</span>
            <span style={{ color: PW.warn }}>{painel.resumo.amarelo} em andamento</span>
            <span style={{ color: PW.danger }}>{painel.resumo.vermelho} rejeitada</span>
          </div>
        ) : undefined
      }
    >
      {!painel || painel.total === 0 ? (
        <Vazio texto="Nenhuma cascata de validacao aberta — o farol acende quando a primeira for iniciada" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {painel.cascatas.map((c) => (
            <div
              key={`${c.entidadeTipo}#${c.entidadeId}`}
              className="gv-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                border: `1px solid ${PW.border}`,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: SELO_COR[c.selo] || PW.muted,
                  boxShadow: `0 0 8px ${STATUS_GLOW[c.selo] || "transparent"}`,
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: 13, fontFamily: MONO, color: PW.text }}>
                  {c.entidadeTipo} #{c.entidadeId}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: PW.muted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.pacienteNome ? c.pacienteNome : `Paciente #${c.pacienteId ?? "—"}`}
                </span>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {c.etapas.map((e) => {
                  const p = pill(e.status);
                  return (
                    <span
                      key={e.etapa}
                      title={`${e.etapa}: ${e.status}`}
                      style={{
                        fontSize: 10,
                        fontFamily: MONO,
                        padding: "2px 6px",
                        border: `1px solid ${p.border}`,
                        color: p.color,
                        background: p.bg,
                      }}
                    >
                      {etapaLabel[e.etapa] ?? e.etapa}
                    </span>
                  );
                })}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: MONO,
                  fontWeight: 700,
                  width: 48,
                  textAlign: "right",
                  color: SELO_COR[c.selo] || PW.muted,
                }}
              >
                {c.aprovadas}/{c.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </Painel>
  );
}

export default function Governanca() {
  const { user } = useAuth();
  const { unidadeSelecionada } = useClinic();
  const [painel, setPainel] = useState<PainelData | null>(null);
  const [semaforo, setSemaforo] = useState<SemaforoData | null>(null);
  const [timeline, setTimeline] = useState<EventoTimeline[]>([]);
  const [filaStats, setFilaStats] = useState<FilaStats | null>(null);
  const [cascataPainel, setCascataPainel] = useState<CascataPainel | null>(null);
  const [examesSemaforo, setExamesSemaforo] = useState<ExamesSemaforoGeral | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [subDashboardPacienteId, setSubDashboardPacienteId] = useState<number>(0);
  const [subDashboardAberto, setSubDashboardAberto] = useState(false);
  const [pacienteIdInput, setPacienteIdInput] = useState("");
  const [whatsappMensagens, setWhatsappMensagens] = useState<{
    id: number;
    telefoneDestino: string;
    templateNome: string | null;
    mensagem: string;
    status: string;
    provedor: string;
    erroDetalhes: string | null;
    criadoEm: string;
  }[]>([]);

  const carregarDados = async () => {
    setCarregando(true);
    const uf = unidadeSelecionada ? `unidadeId=${unidadeSelecionada}` : "";
    const q = (base: string) => base.includes("?") ? `${base}&${uf}` : `${base}?${uf}`;
    try {
      const [painelRes, semaforoRes, timelineRes, filaRes, examesRes, whatsappRes, cascataRes] = await Promise.all([
        fetchApi<PainelData>(uf ? q("/governanca/painel") : "/governanca/painel"),
        fetchApi<SemaforoData>(uf ? q("/governanca/semaforo") : "/governanca/semaforo"),
        fetchApi<{ eventos: EventoTimeline[] }>(uf ? q("/governanca/timeline?limite=15") : "/governanca/timeline?limite=15"),
        fetchApi<FilaStats>(uf ? q("/fila-preceptor/stats") : "/fila-preceptor/stats"),
        fetchApi<ExamesSemaforoGeral>(uf ? q("/exames/semaforo-geral") : "/exames/semaforo-geral"),
        fetchApi<typeof whatsappMensagens>(uf ? q("/whatsapp/mensagens?limite=10") : "/whatsapp/mensagens?limite=10").catch(() => []),
        fetchApi<CascataPainel>(uf ? q("/governanca/cascata/painel") : "/governanca/cascata/painel").catch(() => null),
      ]);
      setPainel(painelRes);
      setSemaforo(semaforoRes);
      setTimeline(timelineRes.eventos);
      setFilaStats(filaRes);
      setExamesSemaforo(examesRes);
      setWhatsappMensagens(whatsappRes);
      setCascataPainel(cascataRes);
      setUltimaAtualizacao(new Date());
    } catch (e) {
      console.error("Erro ao carregar governanca:", e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (user) carregarDados();
  }, [user, unidadeSelecionada]);

  useEffect(() => {
    if (!user) return;
    const intervalo = setInterval(carregarDados, 60000);
    return () => clearInterval(intervalo);
  }, [user, unidadeSelecionada]);

  const abrirSubDashboardExames = () => {
    const id = parseInt(pacienteIdInput, 10);
    if (id > 0) {
      setSubDashboardPacienteId(id);
      setSubDashboardAberto(true);
    }
  };

  if (!user) return null;

  const examesKpiStatus: "VERDE" | "AMARELO" | "VERMELHO" = examesSemaforo?.semaforo || "VERDE";

  return (
    <Layout>
      <style>{PENUMBRA_CSS}</style>
      <div style={{ fontFamily: MONO, color: PW.text, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: PW.text,
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              Governanca Clinica
            </h1>
            <p style={{ fontSize: 12, color: PW.muted, marginTop: 4 }}>
              Painel de soberania operacional — Pawards
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {ultimaAtualizacao && (
              <span style={{ fontSize: 11, color: PW.muted }}>
                Atualizado: {ultimaAtualizacao.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button className="gv-btn" onClick={carregarDados} disabled={carregando} style={btnOutline}>
              <RefreshCw
                className={carregando ? "gv-spin" : undefined}
                style={{ width: 14, height: 14, marginRight: 8 }}
              />
              Atualizar
            </button>
          </div>
        </div>

        <div className="gv-top">
          <div>
            <SemaforoGrande status={semaforo?.semaforo || painel?.statusGeral || "VERDE"} />
            {semaforo && (
              <p style={{ fontSize: 11, color: PW.muted, textAlign: "center", marginTop: 8, padding: "0 8px" }}>
                {semaforo.descricao}
              </p>
            )}
          </div>

          <div className="gv-kpis">
            {painel && (
              <>
                <KpiCard
                  titulo="Fila do Preceptor"
                  valor={painel.kpis.filaPendente.valor}
                  status={painel.kpis.filaPendente.status}
                  descricao={painel.kpis.filaPendente.descricao}
                  icon={Users}
                />
                <KpiCard
                  titulo="Validacoes Cascata"
                  valor={painel.kpis.validacoesPendentes.valor}
                  status={painel.kpis.validacoesPendentes.status}
                  descricao={painel.kpis.validacoesPendentes.descricao}
                  icon={FileCheck}
                />
                <KpiCard
                  titulo="Alertas Abertos"
                  valor={painel.kpis.alertasAbertos.valor}
                  status={painel.kpis.alertasAbertos.status}
                  descricao={painel.kpis.alertasAbertos.descricao}
                  icon={Bell}
                />
              </>
            )}
            <KpiCard
              titulo="Exames Inteligentes"
              valor={examesSemaforo?.total || 0}
              status={examesKpiStatus}
              descricao={`${examesSemaforo?.verdes || 0}V ${examesSemaforo?.amarelos || 0}A ${examesSemaforo?.vermelhos || 0}R`}
              icon={TestTube}
            />
          </div>
        </div>

        <CascatasCard painel={cascataPainel} />

        <Painel titulo="Consulta Rapida — Exames por Paciente" icon={TestTube}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="number"
              placeholder="ID do Paciente"
              value={pacienteIdInput}
              onChange={(e) => setPacienteIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && abrirSubDashboardExames()}
              style={{
                width: 160,
                background: PW.bg3,
                border: `1px solid ${PW.border}`,
                borderRadius: 0,
                color: PW.text,
                padding: "8px 10px",
                fontSize: 13,
                fontFamily: MONO,
                outline: "none",
              }}
            />
            <button
              className="gv-btn"
              onClick={abrirSubDashboardExames}
              disabled={!pacienteIdInput || parseInt(pacienteIdInput, 10) <= 0}
              style={btnOutline}
            >
              <TestTube style={{ width: 14, height: 14, marginRight: 8 }} />
              Ver Exames
            </button>
            {subDashboardAberto && (
              <button className="gv-btn" onClick={() => setSubDashboardAberto(false)} style={btnGhost}>
                Fechar
              </button>
            )}
          </div>
        </Painel>

        <SubDashboardExames
          pacienteId={subDashboardPacienteId}
          aberto={subDashboardAberto}
          onFechar={() => setSubDashboardAberto(false)}
        />

        <div className="gv-two">
          <Painel
            titulo="Timeline de Eventos Clinicos"
            icon={Activity}
            bodyStyle={{ padding: "12px 0", maxHeight: 400, overflowY: "auto" }}
          >
            <TimelineEventos eventos={timeline} />
          </Painel>

          <Painel titulo="Fila do Preceptor — Estatisticas" icon={Shield}>
            <FilaPreceptorStats stats={filaStats} />
            {filaStats && filaStats.porStatus.length === 0 && (
              <Vazio texto="Nenhum item na fila do preceptor" />
            )}
          </Painel>
        </div>

        <Painel titulo="WhatsApp — Status de Entregas" icon={MessageSquare}>
          {whatsappMensagens.length === 0 ? (
            <Vazio texto="Nenhuma mensagem WhatsApp enviada recentemente" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {whatsappMensagens.map((msg) => {
                const statusConfig: Record<string, { icon: typeof Check; cor: string; label: string }> = {
                  PENDENTE: { icon: Clock, cor: PW.muted, label: "Pendente" },
                  ENVIADO: { icon: Check, cor: PW.t2, label: "Enviado" },
                  ENTREGUE: { icon: CheckCheck, cor: PW.t2, label: "Entregue" },
                  LIDO: { icon: CheckCheck, cor: PW.ciano, label: "Lido" },
                  FALHOU: { icon: X, cor: PW.danger, label: "Falhou" },
                };
                const cfg = statusConfig[msg.status] || statusConfig.PENDENTE;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 12px",
                      background: PW.bg3,
                      border: `1px solid ${PW.border}`,
                    }}
                  >
                    <StatusIcon style={{ width: 16, height: 16, flexShrink: 0, color: cfg.cor }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontFamily: MONO, color: PW.muted }}>{msg.telefoneDestino}</span>
                        {msg.templateNome && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              background: "rgba(95,230,204,0.10)",
                              color: PW.ciano,
                              border: `1px solid ${PW.borderNeon}`,
                            }}
                          >
                            {msg.templateNome}
                          </span>
                        )}
                        <span style={{ fontSize: 10, fontWeight: 700, color: cfg.cor }}>{cfg.label}</span>
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: PW.muted,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: 2,
                        }}
                      >
                        {msg.mensagem}
                      </p>
                      {msg.erroDetalhes && (
                        <p style={{ fontSize: 10, color: PW.danger, marginTop: 2 }}>{msg.erroDetalhes}</p>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: PW.muted, flexShrink: 0 }}>
                      {new Date(msg.criadoEm).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Painel>
      </div>
    </Layout>
  );
}
