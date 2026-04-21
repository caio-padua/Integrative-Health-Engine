// PARMAVAULT — painel das farmácias parceiras (visão master).
// Rota: /admin/farmacias
// Reusa pawards-tokens, KpiCard, Led, useRealtimeDashboard.

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { KpiCard } from "@/components/pawards/KpiCard";
import { Led } from "@/components/pawards/Led";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import { PAWARDS, fmtBRL, fmtInt } from "@/lib/pawards-tokens";

interface FarmaciaRanking {
  id: number;
  nome_fantasia: string;
  cidade: string;
  estado: string;
  percentual_comissao: string;
  meta_receitas_mes: number;
  meta_valor_mes: string;
  receitas_mes: number;
  valor_mes: string;
  receitas_semana: number;
  receitas_hoje: number;
  comissao_mes: string;
  pct_meta_receitas: string;
  pct_meta_valor: string;
}

interface TrendPoint {
  data: string;
  receitas: number;
  valor: string;
  comissao: string;
}

function bandColor(pct: number): string {
  if (pct >= 100) return PAWARDS.colors.status.excellent;
  if (pct >= 80) return PAWARDS.colors.status.good;
  if (pct >= 50) return PAWARDS.colors.status.warning;
  return PAWARDS.colors.status.critical;
}

export default function FarmaciasParmavault() {
  const { data: ranking, lastUpdate, error: errRanking, refresh: refreshRanking } =
    useRealtimeDashboard<FarmaciaRanking[]>("/painel-pawards/parmavault/farmacias/ranking", 60_000);

  const [farmaciaSel, setFarmaciaSel] = useState<number | null>(null);
  useEffect(() => {
    if (ranking && ranking.length > 0 && farmaciaSel === null) {
      setFarmaciaSel(ranking[0].id);
    }
  }, [ranking, farmaciaSel]);

  const { data: trend } = useRealtimeDashboard<TrendPoint[]>(
    farmaciaSel ? `/painel-pawards/parmavault/${farmaciaSel}/trend` : "",
    5 * 60_000,
    { enabled: farmaciaSel !== null }
  );

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-set token via ?at= na URL
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
  const needsAuth = errRanking?.includes("401");
  const saveToken = () => {
    localStorage.setItem("padcon_admin_token", tokenInput.trim());
    refreshRanking();
  };

  const totais = (ranking ?? []).reduce(
    (acc, f) => ({
      receitas_mes: acc.receitas_mes + (f.receitas_mes || 0),
      valor_mes: acc.valor_mes + Number(f.valor_mes || 0),
      comissao_mes: acc.comissao_mes + Number(f.comissao_mes || 0),
      receitas_hoje: acc.receitas_hoje + (f.receitas_hoje || 0),
      meta_valor_mes: acc.meta_valor_mes + Number(f.meta_valor_mes || 0),
    }),
    { receitas_mes: 0, valor_mes: 0, comissao_mes: 0, receitas_hoje: 0, meta_valor_mes: 0 }
  );
  const pctTotal = totais.meta_valor_mes > 0
    ? Math.round((totais.valor_mes / totais.meta_valor_mes) * 100)
    : 0;

  const farmaciaSelData = ranking?.find((f) => f.id === farmaciaSel);
  const trendArr = (trend ?? []).map((p) => ({
    data: new Date(p.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    receitas: p.receitas,
    valor: Number(p.valor),
    comissao: Number(p.comissao),
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
            background: PAWARDS.colors.bg[900], border: `1px solid ${PAWARDS.colors.gold[500]}`,
            borderRadius: 12, padding: 32, maxWidth: 480, width: "100%",
          }}>
            <h2 style={{ color: PAWARDS.colors.gold[500], fontSize: 18, marginBottom: 8, letterSpacing: 1 }}>
              PAWARDS · PARMAVAULT
            </h2>
            <p style={{ color: PAWARDS.colors.text.muted, fontSize: 13, marginBottom: 16 }}>
              Cole seu admin token para acessar o painel das farmácias parceiras.
            </p>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="x-admin-token"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 6,
                background: PAWARDS.colors.bg[950], color: "#fff",
                border: `1px solid ${PAWARDS.colors.bg[800]}`,
                fontFamily: "monospace", fontSize: 13, marginBottom: 12,
              }}
              onKeyDown={(e) => { if (e.key === "Enter") saveToken(); }}
            />
            <button
              onClick={saveToken}
              style={{
                width: "100%", padding: "10px 16px", borderRadius: 6,
                background: PAWARDS.colors.gold[500], color: PAWARDS.colors.bg[950],
                border: "none", fontWeight: 600, cursor: "pointer", letterSpacing: 0.5,
              }}
            >Entrar</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{
        padding: "18px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(180deg, #06090F 0%, #020406 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.20em", color: PAWARDS.colors.gold[500], fontWeight: 700 }}>
              PAWARDS · PARMAVAULT
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 2 }}>
              Farmácias Parceiras
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginLeft: 24 }}>
            <Led state="online" label="API" />
            <Led state="syncing" label="Tempo real" />
            <Led state={pctTotal >= 80 ? "excellent" : pctTotal >= 50 ? "online" : "warning"} label={`Meta global ${pctTotal}%`} />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "ui-monospace, monospace", fontSize: 28, fontWeight: 700,
            color: PAWARDS.colors.digital.amber,
            textShadow: `0 0 12px ${PAWARDS.colors.digital.amber}55`,
            letterSpacing: "0.06em",
          }}>
            {now.toLocaleTimeString("pt-BR")}
          </div>
          <div style={{ fontSize: 11, color: PAWARDS.colors.text.tertiary, marginTop: 2 }}>
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            {lastUpdate && ` · sync ${lastUpdate.toLocaleTimeString("pt-BR")}`}
          </div>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {/* KPIs CONSOLIDADOS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 18 }}>
          <KpiCard label="Farmácias ativas" value={fmtInt(ranking?.length ?? 0)} />
          <KpiCard label="Receitas mês" value={fmtInt(totais.receitas_mes)} />
          <KpiCard label="Valor entregue mês" value={fmtBRL(totais.valor_mes)} digital
            realizado={totais.valor_mes} meta={totais.meta_valor_mes} />
          <KpiCard label="Comissão mês" value={fmtBRL(totais.comissao_mes)} />
          <KpiCard label="Receitas hoje" value={fmtInt(totais.receitas_hoje)} />
        </div>

        {/* CARDS DE FARMÁCIA — termômetros */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14, marginBottom: 18 }}>
          {(ranking ?? []).map((f) => {
            const pctR = Number(f.pct_meta_receitas);
            const pctV = Number(f.pct_meta_valor);
            const isSel = farmaciaSel === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFarmaciaSel(f.id)}
                style={{
                  textAlign: "left",
                  background: PAWARDS.colors.bg[900],
                  border: `1px solid ${isSel ? PAWARDS.colors.gold[500] : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12, padding: 18, cursor: "pointer",
                  boxShadow: isSel ? `0 0 0 2px ${PAWARDS.colors.gold[500]}33` : "none",
                  transition: "all 0.18s ease",
                  color: PAWARDS.colors.text.primary,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{f.nome_fantasia}</div>
                    <div style={{ fontSize: 11, color: PAWARDS.colors.text.tertiary, marginTop: 2 }}>
                      {f.cidade}/{f.estado} · comissão {Number(f.percentual_comissao).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "ui-monospace, monospace", fontSize: 18, fontWeight: 700,
                    color: bandColor(pctV),
                  }}>
                    {pctV}%
                  </div>
                </div>

                {/* termômetro RECEITAS */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: PAWARDS.colors.text.muted, marginBottom: 4 }}>
                    <span>Receitas mês</span>
                    <span>{fmtInt(f.receitas_mes)} / {fmtInt(f.meta_receitas_mes)}</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(pctR, 100)}%`, height: "100%",
                      background: bandColor(pctR),
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>

                {/* termômetro VALOR */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: PAWARDS.colors.text.muted, marginBottom: 4 }}>
                    <span>Valor entregue mês</span>
                    <span>{fmtBRL(f.valor_mes)} / {fmtBRL(f.meta_valor_mes)}</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(pctV, 100)}%`, height: "100%",
                      background: bandColor(pctV),
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>

                {/* mini KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <div style={{ fontSize: 9, color: PAWARDS.colors.text.tertiary, letterSpacing: "0.1em" }}>HOJE</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{fmtInt(f.receitas_hoje)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: PAWARDS.colors.text.tertiary, letterSpacing: "0.1em" }}>SEMANA</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{fmtInt(f.receitas_semana)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: PAWARDS.colors.text.tertiary, letterSpacing: "0.1em" }}>COMISSÃO</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: PAWARDS.colors.gold[500] }}>
                      {fmtBRL(f.comissao_mes)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* TREND DA FARMÁCIA SELECIONADA */}
        {farmaciaSelData && (
          <div style={{
            background: PAWARDS.colors.bg[900],
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12, padding: 18, height: 360,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: PAWARDS.colors.text.tertiary, letterSpacing: "0.12em", fontWeight: 600 }}>
                  EVOLUÇÃO 30 DIAS
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                  {farmaciaSelData.nome_fantasia}
                </div>
              </div>
              <div style={{ fontSize: 11, color: PAWARDS.colors.text.muted }}>
                clique em outra farmácia acima pra alternar
              </div>
            </div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendArr} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={PAWARDS.colors.gold[500]} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={PAWARDS.colors.gold[500]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="data" tick={{ fill: PAWARDS.colors.text.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: PAWARDS.colors.text.muted, fontSize: 10 }}
                    tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: PAWARDS.colors.bg[950],
                      border: `1px solid ${PAWARDS.colors.gold[500]}`,
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: PAWARDS.colors.gold[500] }}
                    formatter={(v: number) => fmtBRL(v)}
                  />
                  <Area type="monotone" dataKey="valor" stroke={PAWARDS.colors.gold[500]}
                    fill="url(#gradValor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
