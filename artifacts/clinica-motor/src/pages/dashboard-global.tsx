// Dashboard Global PAWARDS MEDCORE — visão de CEO master.
// Rota: /admin/dashboard-global
// Atualiza KPIs a cada 60s, ranking a cada 60s, trend a cada 5min.

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { KpiCard } from "@/components/pawards/KpiCard";
import { Gauge } from "@/components/pawards/Gauge";
import { Led } from "@/components/pawards/Led";
import { RankingClinicas } from "@/components/pawards/RankingClinicas";
import { AgendaHoje, type AgendaItem } from "@/components/pawards/AgendaHoje";
import { AlertasPanel, type AlertasData } from "@/components/pawards/AlertasPanel";
import { CaixaPanel, type CaixaData } from "@/components/pawards/CaixaPanel";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import { PAWARDS, fmtBRL, fmtInt } from "@/lib/pawards-tokens";

interface GlobalKPI {
  total_clinicas: number;
  total_pacientes: number;
  fat_meta_total: string;
  fat_minimo_total: string;
  fat_maximo_total: string;
  fat_realizado_mes: string;
  consultas_hoje: number;
  receitas_fama_mes: number;
  comissao_total_mes: string;
  media_nps: string;
  media_ocupacao: string;
}

interface RankingRow {
  id: number; nome: string; nick: string;
  fat_realizado_mes: string; fat_meta_mensal: string;
  fat_minimo_mensal: string; fat_maximo_mensal: string;
  consultas_mes: number; receitas_fama_mes: number; comissao_mes: string;
  pct_meta: string | null; nps_medio: string;
}

interface TrendPoint {
  data: string;
  valor_realizado: string;
  valor_previsto: string;
  consultas: number;
  receitas_fama: number;
  comissao_estimada: string;
  ticket_medio: string;
}

export default function DashboardGlobal() {
  const { data: globalKpi, lastUpdate, error: errKpi, refresh: refreshKpi } = useRealtimeDashboard<GlobalKPI>(
    "/painel-pawards/global", 60_000
  );
  const { data: ranking, refresh: refreshRanking } = useRealtimeDashboard<RankingRow[]>(
    "/painel-pawards/clinicas/ranking", 60_000
  );
  const { data: trend, refresh: refreshTrend } = useRealtimeDashboard<TrendPoint[]>(
    "/painel-pawards/global/trend?dias=30", 5 * 60_000
  );
  const { data: agenda, refresh: refreshAgenda } = useRealtimeDashboard<{ origem: "real" | "sintetico"; consultas: AgendaItem[] }>(
    "/painel-pawards/agenda-hoje", 60_000
  );
  const { data: alertas, refresh: refreshAlertas } = useRealtimeDashboard<AlertasData>(
    "/painel-pawards/alertas", 60_000
  );
  const { data: caixa, refresh: refreshCaixa } = useRealtimeDashboard<CaixaData>(
    "/painel-pawards/caixa-30d", 5 * 60_000
  );

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const at = url.searchParams.get("at");
    if (at && at.length >= 16) {
      localStorage.setItem("padcon_admin_token", at);
      url.searchParams.delete("at");
      window.history.replaceState({}, "", url.toString());
      window.location.reload();
    }
  }, []);

  const [tokenInput, setTokenInput] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("padcon_admin_token") ?? "" : ""
  );
  const needsAuth = errKpi?.includes("401");
  const saveToken = () => {
    localStorage.setItem("padcon_admin_token", tokenInput.trim());
    refreshKpi(); refreshRanking(); refreshTrend();
    refreshAgenda(); refreshAlertas(); refreshCaixa();
  };

  const realizado = Number(globalKpi?.fat_realizado_mes ?? 0);
  const meta = Number(globalKpi?.fat_meta_total ?? 0);
  const min = Number(globalKpi?.fat_minimo_total ?? 0);
  const max = Number(globalKpi?.fat_maximo_total ?? 0);
  const pctMeta = meta > 0 ? Math.round((realizado / meta) * 100) : 0;

  const trendArr = (trend ?? []).map((p) => ({
    data: new Date(p.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    realizado: Number(p.valor_realizado),
    previsto: Number(p.valor_previsto),
  }));

  return (
    <div style={{ background: PAWARDS.colors.bg[950], minHeight: "100vh", color: PAWARDS.colors.text.primary }}>
      {needsAuth && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(2,4,6,0.92)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: PAWARDS.colors.bg[900], border: `1px solid ${PAWARDS.colors.gold[600]}`,
            borderRadius: 12, padding: 32, maxWidth: 480, width: "100%",
          }}>
            <h2 style={{ color: PAWARDS.colors.gold[500], fontSize: 18, marginBottom: 8, letterSpacing: 1 }}>
              PAWARDS · MEDCORE
            </h2>
            <p style={{ color: PAWARDS.colors.text.muted, fontSize: 13, marginBottom: 16 }}>
              Cole seu admin token para acessar o dashboard global.
            </p>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="x-admin-token"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 6,
                background: PAWARDS.colors.bg[950], color: "#fff",
                border: `1px solid ${PAWARDS.colors.bg[700] ?? "#1a2530"}`,
                fontFamily: "monospace", fontSize: 13, marginBottom: 12,
              }}
              onKeyDown={(e) => { if (e.key === "Enter") saveToken(); }}
            />
            <button
              onClick={saveToken}
              style={{
                width: "100%", padding: "10px 16px", borderRadius: 6,
                background: PAWARDS.colors.gold[500], color: PAWARDS.colors.bg[950],
                border: "none", fontWeight: 600, cursor: "pointer",
                letterSpacing: 0.5,
              }}
            >Entrar</button>
          </div>
        </div>
      )}
      {/* HEADER */}
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(180deg, #06090F 0%, #020406 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div>
            <div
              style={{
                fontSize: 10, letterSpacing: "0.20em",
                color: PAWARDS.colors.gold[500], fontWeight: 700,
              }}
            >
              PAWARDS · MEDCORE
            </div>
            <div
              style={{
                fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em",
                marginTop: 2,
              }}
            >
              Dashboard Global · CEO Master
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginLeft: 24 }}>
            <Led state="online" label="API" />
            <Led state="online" label="DB" />
            <Led state="syncing" label="Tempo real" />
            <Led state={pctMeta >= 67 ? "excellent" : pctMeta >= 50 ? "online" : "warning"} label="Meta global" />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 28, fontWeight: 700,
              color: PAWARDS.colors.digital.amber,
              textShadow: `0 0 12px ${PAWARDS.colors.digital.amber}55`,
              letterSpacing: "0.06em",
            }}
          >
            {now.toLocaleTimeString("pt-BR")}
          </div>
          <div style={{ fontSize: 11, color: PAWARDS.colors.text.tertiary, marginTop: 2 }}>
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            {lastUpdate && ` · sync ${lastUpdate.toLocaleTimeString("pt-BR")}`}
          </div>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {/* KPIs ROW */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 14, marginBottom: 18,
          }}
        >
          <KpiCard label="Clínicas ativas" value={fmtInt(globalKpi?.total_clinicas)} />
          <KpiCard label="Pacientes ativos" value={fmtInt(globalKpi?.total_pacientes)} />
          <KpiCard
            label="Faturamento mês"
            value={fmtBRL(realizado, { compact: true })}
            realizado={realizado}
            meta={meta}
            digital
          />
          <KpiCard label="Meta global" value={fmtBRL(meta, { compact: true })} hint={`mín ${fmtBRL(min, { compact: true })} · máx ${fmtBRL(max, { compact: true })}`} />
          <KpiCard label="Consultas hoje" value={fmtInt(globalKpi?.consultas_hoje)} />
          <KpiCard
            label="Comissão magistral"
            value={fmtBRL(globalKpi?.comissao_total_mes, { compact: true })}
            digital
            hint={`${fmtInt(globalKpi?.receitas_fama_mes)} receitas no mês`}
          />
        </div>

        {/* GAUGE + RANKING */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: 18, marginBottom: 18,
          }}
        >
          <div
            style={{
              background: PAWARDS.colors.bg.panel,
              borderRadius: PAWARDS.radii.panel,
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: PAWARDS.shadows.blackPiano,
              padding: 24,
              display: "flex", flexDirection: "column", alignItems: "center",
            }}
          >
            <Gauge value={pctMeta} label="Meta global" unit="%" size={200} display={`${pctMeta}`} />
            <div
              style={{
                fontSize: 11, color: PAWARDS.colors.text.tertiary,
                marginTop: 14, textAlign: "center", lineHeight: 1.5,
              }}
            >
              <div>realizado <strong style={{ color: PAWARDS.colors.text.primary }}>{fmtBRL(realizado, { compact: true })}</strong></div>
              <div>meta <strong style={{ color: PAWARDS.colors.gold[500] }}>{fmtBRL(meta, { compact: true })}</strong></div>
              <div>NPS médio <strong style={{ color: PAWARDS.colors.text.primary }}>{Number(globalKpi?.media_nps ?? 0).toFixed(0)}</strong></div>
              <div>Ocupação <strong style={{ color: PAWARDS.colors.text.primary }}>{Number(globalKpi?.media_ocupacao ?? 0).toFixed(0)}%</strong></div>
            </div>
          </div>

          <RankingClinicas items={(ranking ?? []) as any} />
        </div>

        {/* TREND CHART */}
        <div
          style={{
            background: PAWARDS.colors.bg.panel,
            borderRadius: PAWARDS.radii.panel,
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: PAWARDS.shadows.blackPiano,
            padding: 24,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 10, letterSpacing: "0.12em",
                color: PAWARDS.colors.text.tertiary, fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Faturamento consolidado · últimos 30 dias
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 11, color: PAWARDS.colors.text.tertiary }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 2, background: PAWARDS.colors.gold[500], display: "inline-block" }} />
                Realizado
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 2, background: "rgba(170,180,195,0.5)", display: "inline-block" }} />
                Previsto
              </div>
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={trendArr} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PAWARDS.colors.gold[500]} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PAWARDS.colors.gold[500]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="data" stroke={PAWARDS.colors.text.muted} fontSize={11} tickLine={false} />
                <YAxis stroke={PAWARDS.colors.text.muted} fontSize={11} tickLine={false}
                  tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: PAWARDS.colors.bg[800],
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    color: PAWARDS.colors.text.primary,
                    fontSize: 12,
                  }}
                  formatter={(v: any) => fmtBRL(v, { compact: true })}
                />
                <Area type="monotone" dataKey="previsto"
                  stroke="rgba(170,180,195,0.5)" strokeDasharray="4 3" fill="transparent" />
                <Area type="monotone" dataKey="realizado"
                  stroke={PAWARDS.colors.gold[500]} strokeWidth={2} fill="url(#goldFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AGENDA + ALERTAS + CAIXA */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 18,
            marginBottom: 18,
          }}
        >
          <AgendaHoje consultas={agenda?.consultas ?? []} origem={agenda?.origem} />
          <AlertasPanel data={alertas ?? null} />
          <CaixaPanel data={caixa ?? null} />
        </div>

        {/* FOOTER */}
        <div
          style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 10, color: PAWARDS.colors.text.muted, letterSpacing: "0.1em",
            textTransform: "uppercase", padding: "8px 4px",
          }}
        >
          <span>PAWARDS MEDCORE · Visão consolidada multi-clínica</span>
          <span>5 clínicas ativas · 90 dias de histórico</span>
        </div>
      </div>
    </div>
  );
}
