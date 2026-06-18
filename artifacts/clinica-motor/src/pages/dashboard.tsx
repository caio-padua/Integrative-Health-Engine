import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { 
  useObterResumoDashboard, 
  useObterMetricasMotor, 
  useObterAtividadeRecente, 
  useObterResumoFilas,
  getObterResumoDashboardQueryKey,
  getObterMetricasMotorQueryKey,
  getObterAtividadeRecenteQueryKey,
  getObterResumoFilasQueryKey
} from "@workspace/api-client-react";
import { Activity, Users, ClipboardList, CheckSquare, TrendingUp, AlertTriangle, Clock, Building2, ArrowUpRight, ArrowDownRight, Diamond, Award, Shield, Coins, FileText, DollarSign, Target, Zap, Search, ArrowLeft, BarChart3, Gauge, CircleDollarSign, Flame, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { BotaoImprimirFlutuante } from "@/components/BotaoImprimirRelatorio";
import { PainelSinapticoBanner } from "@/components/sinaptico";
import { PW, MONO, inputStyle, labelStyle } from "./penumbra-claro";

import { apiFetch } from "@/lib/api-fetch";
const API_BASE = "/api";

const PLANO_CORES: Record<string, { cor: string; icon: any; label: string; sla: string }> = {
  diamante: { cor: "#B9F2FF", icon: Diamond, label: "Diamante", sla: "4h" },
  ouro: { cor: "#FFD700", icon: Award, label: "Ouro", sla: "12h" },
  prata: { cor: "#C0C0C0", icon: Shield, label: "Prata", sla: "24h" },
  cobre: { cor: "#B87333", icon: Coins, label: "Cobre", sla: "72h" },
};

const COMPLEX_CORES: Record<string, { cor: string; label: string }> = {
  verde: { cor: "#22C55E", label: "Simples" },
  amarela: { cor: "#EAB308", label: "Moderada" },
  vermelha: { cor: "#EF4444", label: "Complexa" },
};

const MODELO_LABEL: Record<string, { label: string; cor: string }> = {
  full: { label: "Full", cor: "#3B82F6" },
  pacote: { label: "Pacote", cor: "#A855F7" },
  por_demanda: { label: "Demanda", cor: "#22C55E" },
};

const R = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

const tituloPainel: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: PW.text,
  fontWeight: 700,
};

const headerPainel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 14px",
  borderBottom: `1px solid ${PW.border}`,
};

export default function Dashboard() {
  const { user } = useAuth();
  const { isTodasClinicas, escopo, unidadeSelecionada, nomeUnidadeSelecionada, corUnidadeSelecionada, modoVisao, setUnidadeSelecionada } = useClinic();

  const { data: dashboard, isLoading: loadingDash } = useObterResumoDashboard({
    query: { enabled: !!user, queryKey: getObterResumoDashboardQueryKey() }
  });

  const { data: metricas, isLoading: loadingMetricas } = useObterMetricasMotor({
    query: { enabled: !!user, queryKey: getObterMetricasMotorQueryKey() }
  });

  const { data: atividade, isLoading: loadingAtiv } = useObterAtividadeRecente(undefined, {
    query: { enabled: !!user, queryKey: getObterAtividadeRecenteQueryKey() }
  });

  const { data: filas, isLoading: loadingFilas } = useObterResumoFilas({
    query: { enabled: !!user, queryKey: getObterResumoFilasQueryKey() }
  });

  const { data: consultoria, isLoading: loadingConsultoria } = useQuery({
    queryKey: ["dashboard-consultoria"],
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE}/dashboard/consultoria`);
      if (!res.ok) throw new Error("Erro ao carregar consultoria");
      return res.json();
    },
    enabled: !!user && isTodasClinicas && escopo === "consultoria_master",
  });

  const { data: cockpit, isLoading: loadingCockpit } = useQuery({
    queryKey: ["dashboard-cockpit"],
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE}/dashboard/cockpit`);
      if (!res.ok) throw new Error("Erro ao carregar cockpit");
      return res.json();
    },
    enabled: !!user && isTodasClinicas && escopo === "consultoria_master",
  });

  const { data: donoClinica, isLoading: loadingDono } = useQuery({
    queryKey: ["dashboard-dono-clinica", unidadeSelecionada],
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE}/dashboard/dono-clinica/${unidadeSelecionada}`);
      if (!res.ok) throw new Error("Erro ao carregar dados da clinica");
      return res.json();
    },
    enabled: !!user && !!unidadeSelecionada && modoVisao === "dono_clinica",
  });

  const StatCard = ({ title, value, icon: Icon, cor, subtitle, loading }: any) => (
    <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${cor || PW.ciano}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 6px" }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: PW.muted, fontWeight: 700 }}>{title}</span>
        <Icon className="w-5 h-5" style={{ color: cor || PW.ciano }} />
      </div>
      <div style={{ padding: "0 14px 12px" }}>
        {loading ? (
          <div style={{ fontFamily: MONO, fontSize: 12, color: PW.muted }}>Carregando...</div>
        ) : (
          <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: PW.text }} data-testid={`stat-${title}`}>{value}</div>
        )}
        {subtitle && (
          <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 4 }}>{subtitle}</p>
        )}
      </div>
    </section>
  );

  if (modoVisao === "dono_clinica" && unidadeSelecionada) {
    return (
      <Layout face="claro">
        <style>{`
          .db-back:hover { color: ${PW.text}; border-color: ${PW.ciano}; }
          .db-clinica { transition: box-shadow .15s ease, border-color .15s ease; }
          .db-clinica:hover { box-shadow: 0 0 0 1px ${PW.cianoGlow}, 0 0 18px ${PW.cianoGlow}; }
        `}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Wave Sináptico — banner topo TDAH-friendly Caio (CEO) */}
          <PainelSinapticoBanner
            titulo={`Sinapses · ${nomeUnidadeSelecionada ?? "Unidade"}`}
            subtitulo="Sinais vitais da operação em tempo real"
            corAcento={corUnidadeSelecionada || "#5EE6E6"}
            relogios={[
              {
                label: "Saúde do Motor",
                valor: Math.round(Number((metricas as any)?.scoreSaude ?? (metricas as any)?.score ?? 78)),
                cor: "#22C55E",
              },
              {
                label: "Filas Pendentes",
                valor: Number((filas as any)?.totalPendentes ?? (filas as any)?.total ?? 0),
                total: Math.max(50, Number((filas as any)?.total ?? 50)),
                formato: "absoluto",
                cor: "#F5C26B",
              },
              {
                label: "Cockpit Hoje",
                valor: Number((cockpit as any)?.kpis?.atendimentosHoje ?? 0),
                total: Math.max(20, Number((cockpit as any)?.kpis?.atendimentosHoje ?? 0) + 5),
                formato: "absoluto",
                cor: "#A8C7FA",
              },
              {
                label: "PADCON Mês",
                valor: Math.round(Number((dashboard as any)?.padconMesPct ?? 65)),
                cor: "#7BC9A5",
              },
            ]}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {escopo === "consultoria_master" && (
                <button
                  className="db-back"
                  onClick={() => setUnidadeSelecionada(null)}
                  style={{ background: "none", border: `1px solid ${PW.border}`, color: PW.muted, cursor: "pointer", padding: 6, lineHeight: 0 }}
                  title="Voltar ao Dashboard Global"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div style={{ width: 14, height: 14, flexShrink: 0, background: corUnidadeSelecionada || PW.muted }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <BotaoImprimirFlutuante titulo="Dashboard Unidade · PADCON Local" />
                  <h1 style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: PW.text }}>Dashboard Unidade</h1>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: PW.gold, border: `1px solid ${PW.border}`, padding: "2px 8px", fontWeight: 700 }}>PADCON · VISÃO LOCAL</span>
                </div>
                <p style={{ fontFamily: MONO, fontSize: 13, marginTop: 4, fontWeight: 600, color: corUnidadeSelecionada || PW.ciano }}>{nomeUnidadeSelecionada}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 12, color: corUnidadeSelecionada || PW.muted }}>
              <span style={{ width: 10, height: 10, background: corUnidadeSelecionada || PW.muted }} />
              Visao Local
            </div>
          </div>

          {loadingDono ? (
            <div style={{ fontFamily: MONO, fontSize: 12, color: PW.muted, padding: "24px 0" }}>
              Carregando...
            </div>
          ) : donoClinica ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <StatCard title="Pacientes Ativos" value={donoClinica.pacientes.ativos} icon={Users} cor={PW.azul} loading={false} subtitle={`${donoClinica.pacientes.total} total`} />
                <StatCard title="Demandas Abertas" value={donoClinica.demandas.abertas} icon={FileText} cor={PW.gold} loading={false} subtitle={`${donoClinica.demandas.total} total`} />
                <StatCard title="Taxa Resolucao" value={`${donoClinica.delegacoes.taxaResolucao}%`} icon={TrendingUp} cor={PW.verde} loading={false} subtitle={`${donoClinica.delegacoes.concluidas}/${donoClinica.delegacoes.total} delegacoes`} />
                <StatCard title="Custo Demandas" value={`R$ ${donoClinica.demandas.custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} cor={PW.gold} loading={false} subtitle={`${donoClinica.demandas.concluidas} concluidas`} />
              </div>

              {donoClinica.delegacoes.atrasadas > 0 && (
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.danger}`, display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: PW.danger }} />
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: PW.danger }}>
                    {donoClinica.delegacoes.atrasadas} delegacoes atrasadas nesta clinica
                  </span>
                </section>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}` }}>
                  <header style={headerPainel}>
                    <Diamond className="w-4 h-4" style={{ color: PW.ciano }} />
                    <span style={tituloPainel}>Distribuicao de Planos</span>
                  </header>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                      {Object.entries(donoClinica.pacientes.distribuicaoPlanos).map(([key, val]) => {
                        const cfg = PLANO_CORES[key];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        return (
                          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: PW.bg3, border: `1px solid ${PW.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Icon className="w-4 h-4" style={{ color: cfg.cor }} />
                              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: PW.text }}>{cfg.label}</span>
                            </div>
                            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: cfg.cor }}>{val as number}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.verde}` }}>
                  <header style={headerPainel}>
                    <Zap className="w-4 h-4" style={{ color: PW.verde }} />
                    <span style={tituloPainel}>Demandas por Complexidade</span>
                  </header>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {Object.entries(donoClinica.demandas.porComplexidade).map(([key, val]) => {
                        const cfg = COMPLEX_CORES[key];
                        if (!cfg) return null;
                        const total = donoClinica.demandas.total || 1;
                        const pct = Math.round(((val as number) / total) * 100);
                        return (
                          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, background: cfg.cor }} />
                                <span style={{ fontFamily: MONO, fontSize: 13, color: PW.text }}>{cfg.label}</span>
                              </div>
                              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: PW.text }}>{val as number}</span>
                            </div>
                            <div style={{ height: 8, background: PW.bg3, border: `1px solid ${PW.border}`, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: cfg.cor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${PW.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: PW.muted }}>Tempo total investido</span>
                      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: PW.text }}>{Math.round(donoClinica.demandas.tempoTotalMin / 60)}h {donoClinica.demandas.tempoTotalMin % 60}min</span>
                    </div>
                  </div>
                </section>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.azul}` }}>
                  <header style={headerPainel}>
                    <Target className="w-4 h-4" style={{ color: PW.azul }} />
                    <span style={tituloPainel}>Delegacoes</span>
                  </header>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                      <div style={{ padding: 12, background: PW.bg3, border: `1px solid ${PW.border}`, textAlign: "center" }}>
                        <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: PW.gold }}>{donoClinica.delegacoes.pendentes}</p>
                        <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 4 }}>Pendentes</p>
                      </div>
                      <div style={{ padding: 12, background: PW.bg3, border: `1px solid ${PW.border}`, textAlign: "center" }}>
                        <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: PW.azul }}>{donoClinica.delegacoes.emAndamento}</p>
                        <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 4 }}>Em Andamento</p>
                      </div>
                      <div style={{ padding: 12, background: PW.bg3, border: `1px solid ${PW.border}`, textAlign: "center" }}>
                        <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: PW.verde }}>{donoClinica.delegacoes.concluidas}</p>
                        <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 4 }}>Concluidas</p>
                      </div>
                      <div style={{ padding: 12, background: PW.bg3, border: `1px solid ${PW.border}`, textAlign: "center" }}>
                        <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: PW.danger }}>{donoClinica.delegacoes.atrasadas}</p>
                        <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 4 }}>Atrasadas</p>
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: PW.muted }}>Taxa de resolucao</span>
                        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: PW.text }}>{donoClinica.delegacoes.taxaResolucao}%</span>
                      </div>
                      <div style={{ height: 8, background: PW.bg3, border: `1px solid ${PW.border}`, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${donoClinica.delegacoes.taxaResolucao}%`, background: corUnidadeSelecionada || PW.ciano }} />
                      </div>
                    </div>
                  </div>
                </section>

                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.gold}` }}>
                  <header style={headerPainel}>
                    <ClipboardList className="w-4 h-4" style={{ color: PW.gold }} />
                    <span style={tituloPainel}>Filas Operacionais</span>
                  </header>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: PW.bg3, border: `1px solid ${PW.border}` }}>
                        <span style={{ fontFamily: MONO, fontSize: 13, color: PW.text }}>Anamnese</span>
                        <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: PW.text }}>{donoClinica.filas.anamnese}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: PW.bg3, border: `1px solid ${PW.border}` }}>
                        <span style={{ fontFamily: MONO, fontSize: 13, color: PW.text }}>Validacao</span>
                        <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: PW.text }}>{donoClinica.filas.validacao}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: PW.bg3, border: `1px solid ${PW.border}` }}>
                        <span style={{ fontFamily: MONO, fontSize: 13, color: PW.text }}>Procedimento</span>
                        <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: PW.text }}>{donoClinica.filas.procedimento}</span>
                      </div>
                      {donoClinica.filas.urgentes > 0 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: PW.bg3, border: `1px solid ${PW.danger}` }}>
                          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: PW.danger }}>Urgencias</span>
                          <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: PW.danger }}>{donoClinica.filas.urgentes}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${PW.border}` }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: PW.muted }}>{donoClinica.anamnesesPendentes} anamneses pendentes</span>
                    </div>
                  </div>
                </section>
              </div>

              {donoClinica.demandas.recentes?.length > 0 && (
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}` }}>
                  <header style={headerPainel}>
                    <span style={tituloPainel}>Ultimas Demandas</span>
                  </header>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {donoClinica.demandas.recentes.map((d: any) => {
                        const corStatus = d.status === "concluida" ? PW.verde : d.status === "aberta" ? PW.gold : PW.azul;
                        return (
                          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: PW.bg3, border: `1px solid ${PW.border}` }}>
                            <div style={{ width: 10, height: 10, flexShrink: 0, background: COMPLEX_CORES[d.complexidade]?.cor || PW.muted }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontFamily: MONO, fontSize: 13, fontWeight: 600, color: PW.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.titulo}</span>
                              <span style={{ fontFamily: MONO, fontSize: 10, color: PW.muted }}>{d.tipo.replace(/_/g, " ")}</span>
                            </div>
                            <span style={{ fontFamily: MONO, fontSize: 10, padding: "1px 8px", border: `1px solid ${corStatus}`, color: corStatus, fontWeight: 600, textTransform: "capitalize" }}>
                              {d.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>
      </Layout>
    );
  }

  if (isTodasClinicas && escopo === "consultoria_master") {
    const isLoadingGlobal = loadingConsultoria || loadingCockpit;
    return (
      <Layout face="claro">
        <style>{`
          .db-clinica { transition: box-shadow .15s ease, border-color .15s ease; }
          .db-clinica:hover { box-shadow: 0 0 0 1px ${PW.cianoGlow}, 0 0 18px ${PW.cianoGlow}; }
        `}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: PW.text }}>Dashboard Global</h1>
              <p style={{ fontFamily: MONO, fontSize: 12, color: PW.muted, marginTop: 4 }}>Cockpit operacional do ecossistema</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 12, color: PW.muted }}>
              <span style={{ width: 10, height: 10, background: PW.ciano }} />
              Visao Global
            </div>
          </div>

          {isLoadingGlobal ? (
            <div style={{ fontFamily: MONO, fontSize: 12, color: PW.muted, padding: "24px 0" }}>
              Carregando...
            </div>
          ) : (
            <>
              <DuploEspelhoPaduaGenesis />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.verde}` }}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, fontWeight: 700 }}>Receita</span>
                      <CircleDollarSign className="w-4 h-4" style={{ color: PW.verde }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: PW.verde }}>{cockpit ? R(cockpit.financeiro.receitaMes) : "---"}</p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 2 }}>{cockpit?.financeiro.contratosAtivos || 0} contratos ativos</p>
                  </div>
                </section>
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}` }}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, fontWeight: 700 }}>Lucro</span>
                      <TrendingUp className="w-4 h-4" style={{ color: PW.ciano }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: PW.ciano }}>{cockpit ? R(cockpit.financeiro.lucroMes) : "---"}</p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 2 }}>Margem {cockpit?.financeiro.margemLucro || 0}%</p>
                  </div>
                </section>
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.azul}` }}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, fontWeight: 700 }}>Clinicas</span>
                      <Building2 className="w-4 h-4" style={{ color: PW.azul }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: PW.azul }}>{cockpit?.totalClinicas || 0}</p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 2 }}>{cockpit?.totalPacientes || 0} pacientes</p>
                  </div>
                </section>
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.gold}` }}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, fontWeight: 700 }}>Demandas</span>
                      <Flame className="w-4 h-4" style={{ color: PW.gold }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: PW.gold }}>{cockpit?.demandas.abertas || 0}</p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 2 }}>{cockpit?.demandas.total || 0} total | {cockpit?.demandas.concluidas || 0} concl.</p>
                  </div>
                </section>
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.gold}` }}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, fontWeight: 700 }}>Resolucao</span>
                      <Gauge className="w-4 h-4" style={{ color: PW.gold }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: PW.gold }}>{consultoria?.totalGeral.taxaResolucaoGeral || 0}%</p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 2 }}>{consultoria?.totalGeral.delegacoesConcluidas || 0}/{consultoria?.totalGeral.delegacoesTotal || 0}</p>
                  </div>
                </section>
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${(cockpit?.delegacoesAtrasadas || 0) > 0 ? PW.danger : PW.verde}` }}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, fontWeight: 700 }}>Atrasadas</span>
                      <AlertTriangle className="w-4 h-4" style={{ color: (cockpit?.delegacoesAtrasadas || 0) > 0 ? PW.danger : PW.verde }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: (cockpit?.delegacoesAtrasadas || 0) > 0 ? PW.danger : PW.verde }}>{cockpit?.delegacoesAtrasadas || 0}</p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, marginTop: 2 }}>delegacoes vencidas</p>
                  </div>
                </section>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.verde}` }}>
                  <header style={headerPainel}>
                    <Zap className="w-4 h-4" style={{ color: PW.verde }} />
                    <span style={tituloPainel}>Pipeline de Demandas</span>
                  </header>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { label: "Abertas", value: cockpit?.demandas.abertas || 0, cor: "#F59E0B" },
                        { label: "Em Atendimento", value: cockpit?.demandas.emAtendimento || 0, cor: "#3B82F6" },
                        { label: "Concluidas", value: cockpit?.demandas.concluidas || 0, cor: "#22C55E" },
                      ].map(item => {
                        const total = cockpit?.demandas.total || 1;
                        const pct = Math.round((item.value / total) * 100);
                        return (
                          <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 9, height: 9, background: item.cor }} />
                                <span style={{ fontFamily: MONO, fontSize: 13, color: PW.text }}>{item.label}</span>
                              </div>
                              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: PW.text }}>{item.value}</span>
                            </div>
                            <div style={{ height: 6, background: PW.bg3, border: `1px solid ${PW.border}`, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: item.cor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PW.border}` }}>
                      <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, marginBottom: 8 }}>Complexidade</p>
                      <div style={{ display: "flex", gap: 12 }}>
                        {Object.entries(cockpit?.demandas.porComplexidade || { verde: 0, amarela: 0, vermelha: 0 }).map(([key, val]) => {
                          const cfg = COMPLEX_CORES[key];
                          if (!cfg) return null;
                          return (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 9, height: 9, background: cfg.cor }} />
                              <span style={{ fontFamily: MONO, fontSize: 11, color: PW.muted }}>{cfg.label}</span>
                              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: PW.text }}>{val as number}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.gold}` }}>
                  <header style={headerPainel}>
                    <Trophy className="w-4 h-4" style={{ color: PW.gold }} />
                    <span style={tituloPainel}>Consultores — Ranking</span>
                  </header>
                  <div style={{ padding: 14 }}>
                    {cockpit?.consultores?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {cockpit.consultores.map((c: any, idx: number) => {
                          const corRank = idx === 0 ? PW.gold : idx === 1 ? PW.muted : PW.t2;
                          return (
                            <div key={c.id} style={{ padding: 12, background: PW.bg3, border: `1px solid ${PW.border}` }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${corRank}`, color: corRank }}>
                                    {idx + 1}
                                  </span>
                                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: PW.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</span>
                                </div>
                                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: PW.verde }}>{R(c.comissao)}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <div style={{ flex: 1, height: 6, background: PW.bg2, border: `1px solid ${PW.border}`, overflow: "hidden" }}>
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${c.progressoMeta}%`,
                                      background: c.progressoMeta >= 100 ? "#22C55E" : c.progressoMeta >= 75 ? "#EAB308" : c.progressoMeta >= 50 ? "#F59E0B" : "#EF4444",
                                    }}
                                  />
                                </div>
                                <span style={{ fontFamily: MONO, fontSize: 10, color: PW.muted, width: 32, textAlign: "right" }}>{c.progressoMeta}%</span>
                              </div>
                              <div style={{ display: "flex", gap: 8, fontFamily: MONO, fontSize: 10 }}>
                                <span style={{ color: PW.verde }}>{c.verdes}V</span>
                                <span style={{ color: PW.gold }}>{c.amarelas}A</span>
                                <span style={{ color: PW.danger }}>{c.vermelhas}R</span>
                                <span style={{ color: PW.muted, marginLeft: "auto" }}>{c.total}/40 meta</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ fontFamily: MONO, fontSize: 13, color: PW.muted }}>Nenhum consultor registrado</p>
                    )}
                  </div>
                </section>

                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}` }}>
                  <header style={headerPainel}>
                    <Diamond className="w-4 h-4" style={{ color: PW.ciano }} />
                    <span style={tituloPainel}>Saude SLA — Planos</span>
                  </header>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {Object.entries(cockpit?.sla || { diamante: 0, ouro: 0, prata: 0, cobre: 0 }).map(([key, val]) => {
                        const cfg = PLANO_CORES[key];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        const totalPac = Object.values(cockpit?.sla || {}).reduce((a: number, b: any) => a + (b as number), 0) as number;
                        const pct = totalPac > 0 ? Math.round(((val as number) / totalPac) * 100) : 0;
                        return (
                          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: PW.bg3, border: `1px solid ${PW.border}` }}>
                            <Icon className="w-4 h-4" style={{ flexShrink: 0, color: cfg.cor }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: PW.text }}>{cfg.label}</span>
                                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: cfg.cor }}>{val as number}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                                <span style={{ fontFamily: MONO, fontSize: 10, color: PW.muted }}>SLA {cfg.sla}</span>
                                <span style={{ fontFamily: MONO, fontSize: 10, color: PW.muted }}>{pct}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>

              {cockpit?.porClinicaFinanceiro?.length > 0 && (
                <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.azul}` }}>
                  <header style={headerPainel}>
                    <BarChart3 className="w-4 h-4" style={{ color: PW.azul }} />
                    <span style={tituloPainel}>Receita por Clinica</span>
                  </header>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {cockpit.porClinicaFinanceiro.map((c: any) => {
                        const maxReceita = Math.max(...cockpit.porClinicaFinanceiro.map((x: any) => x.receita));
                        const pct = maxReceita > 0 ? Math.round((c.receita / maxReceita) * 100) : 0;
                        const modeloCfg = MODELO_LABEL[c.modelo] || { label: c.modelo, cor: PW.muted };
                        return (
                          <div key={c.unidadeId} style={{ padding: 12, background: PW.bg3, border: `1px solid ${PW.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, background: c.cor }} />
                                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: PW.text }}>{c.nome}</span>
                                <span style={{ fontFamily: MONO, fontSize: 10, padding: "1px 6px", border: `1px solid ${modeloCfg.cor}`, color: modeloCfg.cor }}>{modeloCfg.label}</span>
                              </div>
                              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: PW.verde }}>{R(c.receita)}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: MONO, fontSize: 11, color: PW.muted, marginBottom: 8 }}>
                              <span>Lucro: <span style={{ color: PW.ciano, fontWeight: 600 }}>{R(c.lucro)}</span></span>
                              <span>{c.demandas} demandas</span>
                            </div>
                            <div style={{ height: 6, background: PW.bg2, border: `1px solid ${PW.border}`, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: c.cor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: PW.text }}>
                <Building2 className="w-5 h-5" style={{ color: PW.azul }} />
                Clinicas do Ecossistema
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
                {consultoria?.porClinica?.map((c: any) => (
                  <section
                    key={c.unidadeId}
                    className="db-clinica"
                    style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${c.unidadeCor || PW.muted}`, cursor: "pointer" }}
                    onClick={() => setUnidadeSelecionada(c.unidadeId)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${PW.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, background: c.unidadeCor || PW.muted }} />
                        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: PW.text }}>{c.unidadeNome}</span>
                      </div>
                      <Search className="w-3.5 h-3.5" style={{ color: PW.muted }} />
                    </div>
                    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                        <div>
                          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted }}>Pacientes</div>
                          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: PW.text }}>{c.totalPacientes}</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted }}>Resolucao</div>
                          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: PW.text, display: "flex", alignItems: "center", gap: 4 }}>
                            {c.taxaResolucao}%
                            {c.taxaResolucao >= 70 ? (
                              <ArrowUpRight className="w-4 h-4" style={{ color: PW.verde }} />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" style={{ color: PW.danger }} />
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontFamily: MONO, fontSize: 10 }}>
                        <span style={{ padding: "1px 8px", border: `1px solid ${PW.gold}`, color: PW.gold }}>{c.delegacoes.pendentes} pendentes</span>
                        <span style={{ padding: "1px 8px", border: `1px solid ${PW.azul}`, color: PW.azul }}>{c.delegacoes.emAndamento} em andamento</span>
                        {c.delegacoes.atrasadas > 0 && (
                          <span style={{ padding: "1px 8px", border: `1px solid ${PW.danger}`, color: PW.danger }}>{c.delegacoes.atrasadas} atrasadas</span>
                        )}
                      </div>
                      <div style={{ height: 6, background: PW.bg3, border: `1px solid ${PW.border}`, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${c.taxaResolucao}%`, background: c.unidadeCor || PW.muted }} />
                      </div>
                    </div>
                  </section>
                ))}
              </div>

              <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}` }}>
                <header style={headerPainel}>
                  <span style={tituloPainel}>Delegacoes por Clinica</span>
                </header>
                <div style={{ padding: 14, height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultoria?.porClinica || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <XAxis dataKey="unidadeNome" stroke={PW.muted} fontSize={11} tickLine={false} axisLine={false} style={{ fontFamily: MONO }} />
                      <YAxis stroke={PW.muted} fontSize={12} tickLine={false} axisLine={false} style={{ fontFamily: MONO }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: PW.bg2, borderColor: PW.border, borderRadius: 0, color: PW.text, fontFamily: MONO }} />
                      <Bar dataKey="delegacoes.total" name="Total" radius={[0, 0, 0, 0]}>
                        {(consultoria?.porClinica || []).map((c: any, i: number) => (
                          <Cell key={`cell-${i}`} fill={c.unidadeCor || PW.ciano} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout face="claro">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: PW.text }}>Visao Geral do Motor</h1>
            {unidadeSelecionada && <p style={{ fontFamily: MONO, fontSize: 12, color: PW.muted, marginTop: 4 }}>{nomeUnidadeSelecionada}</p>}
          </div>
        </div>
        <DuploEspelhoPaduaGenesis />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <StatCard title="Pacientes" value={dashboard?.totalPacientes ?? "..."} icon={Users} cor={PW.azul} loading={loadingDash} subtitle="total cadastrados" />
          <StatCard title="Anamneses Pendentes" value={dashboard?.anamnesesPendentes ?? "..."} icon={ClipboardList} cor={PW.gold} loading={loadingDash} />
          <StatCard title="Validacoes" value={dashboard?.sugestoesPendentesValidacao ?? "..."} icon={CheckSquare} cor={PW.verde} loading={loadingDash} subtitle="aguardando validacao" />
          <StatCard title="Follow-ups Atrasados" value={dashboard?.followupAtrasados ?? "..."} icon={Clock} cor={PW.danger} loading={loadingDash} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <StatCard title="Procedimentos Hoje" value={dashboard?.procedimentosHoje ?? "..."} icon={Activity} cor={PW.lilas} loading={loadingDash} />
          <StatCard title="Receita Hoje" value={`R$ ${(dashboard?.receitaHoje ?? 0).toFixed(2)}`} icon={DollarSign} cor={PW.verde} loading={loadingDash} />
          <StatCard title="Taxa Validacao" value={`${metricas?.taxaValidacao ?? 0}%`} icon={TrendingUp} cor={PW.verde} loading={loadingMetricas} subtitle={`${metricas?.sugestoesValidadas ?? 0} de ${metricas?.totalSugestoes ?? 0}`} />
          <StatCard title="Pagamentos Pendentes" value={dashboard?.pagamentosPendentes ?? "..."} icon={AlertTriangle} cor={PW.gold} loading={loadingDash} />
        </div>

        {filas && (
          <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}` }}>
            <header style={headerPainel}>
              <span style={tituloPainel}>Filas Operacionais</span>
            </header>
            <div style={{ padding: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                {[
                  { label: "Anamnese", value: filas.anamnese, cor: PW.azul },
                  { label: "Validacao", value: filas.validacao, cor: PW.verde },
                  { label: "Procedimento", value: filas.procedimento, cor: PW.lilas },
                  { label: "Follow-up", value: filas.followup, cor: PW.gold },
                  { label: "Pagamento", value: filas.pagamento, cor: PW.verde },
                ].map(f => (
                  <div key={f.label} style={{ textAlign: "center", padding: 12, background: PW.bg3, border: `1px solid ${PW.border}` }}>
                    <p style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: f.cor }}>{f.value}</p>
                    <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, marginTop: 4 }}>{f.label}</p>
                  </div>
                ))}
              </div>
              {(filas.totalUrgente ?? 0) > 0 && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, color: PW.danger }}>
                  <AlertTriangle className="w-4 h-4" />
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>{filas.totalUrgente} urgencia(s) na fila</span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

function DuploEspelhoPaduaGenesis() {
  const { data } = useQuery<Array<{ unidade_id: number; unidade_nome: string; total_agendas: number; total_pacientes: number }>>({
    queryKey: ["resumo-agendas-padua-genesis"],
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE}/agendas-profissionais/resumo`);
      if (!res.ok) throw new Error("erro");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const padua = data?.find(d => d.unidade_id === 15);
  const genesis = data?.find(d => d.unidade_id === 14);
  const paduaPac = padua?.total_pacientes ?? "...";
  const paduaAg = padua?.total_agendas ?? "...";
  const genPac = genesis?.total_pacientes ?? "...";
  const genAg = genesis?.total_agendas ?? "...";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
      <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.gold}` }}>
        <header style={{ ...headerPainel, justifyContent: "space-between" }}>
          <span style={{ ...tituloPainel, display: "flex", alignItems: "center", gap: 8, color: PW.gold }}>
            <Trophy className="w-5 h-5" />
            Instituto Padua
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", border: `1px solid ${PW.gold}`, color: PW.gold, fontWeight: 700 }}>
            Clinica Ativa · Onde Eu Trabalho
          </span>
        </header>
        <div style={{ padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            <div>
              <p style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: PW.text }}>{paduaPac ?? "..."}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, marginTop: 4 }}>Pacientes Reais</p>
            </div>
            <div>
              <p style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: PW.text }}>{paduaAg ?? "..."}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, marginTop: 4 }}>Agendas Ativas</p>
            </div>
          </div>
          <p style={{ fontFamily: MONO, fontSize: 11, color: PW.muted, marginTop: 12, fontStyle: "italic" }}>
            Toda validacao visual aparece aqui — Dr Caio Padua, dados de producao
          </p>
        </div>
      </section>

      <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.lilas}` }}>
        <header style={{ ...headerPainel, justifyContent: "space-between" }}>
          <span style={{ ...tituloPainel, display: "flex", alignItems: "center", gap: 8, color: PW.lilas }}>
            <Flame className="w-5 h-5" />
            Instituto Genesis
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", border: `1px solid ${PW.lilas}`, color: PW.lilas, fontWeight: 700 }}>
            Cofre-Mae · Base Anatomica
          </span>
        </header>
        <div style={{ padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            <div>
              <p style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: PW.text }}>{genPac ?? "..."}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, marginTop: 4 }}>Pacientes Semente</p>
            </div>
            <div>
              <p style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: PW.text }}>{genAg ?? "..."}</p>
              <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: PW.muted, marginTop: 4 }}>Agendas-Espelho</p>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 11, color: PW.muted }}>
            <span>Sangue · Linfa · Ossos · Musculo · Cerebro</span>
            <span style={{ color: PW.lilas }}>→</span>
            <span style={{ fontWeight: 700, color: PW.text }}>espelha PADUA automaticamente</span>
          </div>
        </div>
      </section>
    </div>
  );
}
