// PARMAVAULT-TSUNAMI Wave 5 · Bloco B5 frontend · Painel CEO Reconciliacao
// /admin/parmavault-reconciliacao — master-only
//
// 3 niveis:
//   - KPIs topo (Previsto / Declarado / Recebido / GAP, com cores)
//   - Matriz farmacia × periodo (% editavel inline + Receitas + valores + Gap)
//   - Acoes por farmacia: gerar PDF/Excel, declarar manual, registrar repasse
//
// Tema navy/gold (PAWARDS MEDCORE).
import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import {
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Save,
  Upload,
  DollarSign,
  Filter,
} from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const RED = "#dc2626";
const GREEN = "#16a34a";

type Linha = {
  farmacia_id: number;
  farmacia_nome: string;
  percentual_comissao: number;
  qtd_receitas: number;
  previsto: number;
  declarado: number;
  recebido: number;
  gap: number;
  gap_pct: number;
};

type Kpis = {
  previsto: number;
  declarado: number;
  recebido: number;
  gap: number;
  qtd: number;
};

type Relatorio = {
  id: number;
  farmacia_id: number;
  farmacia_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  protocolo_hash: string;
  gerado_em: string;
  percentual_comissao_snapshot: number;
  total_previsto_snapshot: number;
  total_declarado_snapshot: number;
  total_recebido_snapshot: number;
  total_gap_snapshot: number;
  total_receitas: number;
};

function fmtBRL(v: number | null | undefined) {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

export default function AdminParmavaultReconciliacao() {
  const [meses, setMeses] = useState<number>(6);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [kpis, setKpis] = useState<Kpis>({ previsto: 0, declarado: 0, recebido: 0, gap: 0, qtd: 0 });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editandoPct, setEditandoPct] = useState<Record<number, string>>({});
  const [savingPct, setSavingPct] = useState<number | null>(null);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);

  // Modais
  const [showRelatorio, setShowRelatorio] = useState<{ farmaciaId: number; nome: string } | null>(
    null,
  );
  const [periodoIni, setPeriodoIni] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");
  const [gerando, setGerando] = useState(false);

  const [showDeclaracao, setShowDeclaracao] = useState<{ farmaciaId: number; nome: string } | null>(
    null,
  );
  const [decReceitaId, setDecReceitaId] = useState("");
  const [decValor, setDecValor] = useState("");
  const [decData, setDecData] = useState("");
  const [decObs, setDecObs] = useState("");
  const [decCsv, setDecCsv] = useState("");

  const [showRepasse, setShowRepasse] = useState<{ farmaciaId: number; nome: string } | null>(null);
  const [rpAnoMes, setRpAnoMes] = useState("");
  const [rpValor, setRpValor] = useState("");
  const [rpData, setRpData] = useState("");
  const [rpEvid, setRpEvid] = useState("");

  const [recalcStatus, setRecalcStatus] = useState<string>("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const r1 = await fetch(`/api/admin/parmavault/matriz?meses=${meses}`, {
        credentials: "include",
      });
      const j1 = await r1.json();
      if (!r1.ok || !j1.ok) throw new Error(j1.error || "erro matriz");
      setLinhas(j1.linhas || []);
      setKpis(j1.kpis || { previsto: 0, declarado: 0, recebido: 0, gap: 0, qtd: 0 });

      const r2 = await fetch(`/api/admin/parmavault/relatorios`, { credentials: "include" });
      const j2 = await r2.json();
      if (r2.ok && j2.ok) setRelatorios(j2.relatorios || []);
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [meses]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarPercentual(farmaciaId: number) {
    const pct = Number(editandoPct[farmaciaId]);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setMsg("Percentual deve ser 0-100");
      return;
    }
    setSavingPct(farmaciaId);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/parmavault/farmacia/${farmaciaId}/percentual`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentual_comissao: pct }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro salvar");
      setMsg(`% atualizado para ${pct.toFixed(2)}%`);
      setEditandoPct((p) => {
        const cp = { ...p };
        delete cp[farmaciaId];
        return cp;
      });
      void carregar();
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setSavingPct(null);
    }
  }

  async function rodarJobRetroativo() {
    setRecalcStatus("Rodando...");
    try {
      const r = await fetch(`/api/admin/parmavault/comissao/recalcular`, {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro");
      setRecalcStatus(
        `Job OK · tocados=${j.tocados} · com_base=${j.com_base} · sem_base=${j.sem_base}`,
      );
      void carregar();
    } catch (e) {
      setRecalcStatus(`Erro: ${String(e)}`);
    }
  }

  async function gerarRelatorio() {
    if (!showRelatorio || !periodoIni || !periodoFim) return;
    setGerando(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/parmavault/relatorios/gerar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmacia_id: showRelatorio.farmaciaId,
          periodo_inicio: periodoIni,
          periodo_fim: periodoFim,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro");
      setMsg(`Relatório #${j.relatorio_id} gerado · Protocolo ${j.protocolo}`);
      setShowRelatorio(null);
      void carregar();
      window.open(j.pdf_url, "_blank");
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setGerando(false);
    }
  }

  async function salvarDeclaracaoManual() {
    if (!showDeclaracao) return;
    try {
      const r = await fetch(`/api/admin/parmavault/declaracoes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receita_id: Number(decReceitaId),
          valor_pago_paciente: Number(decValor),
          data_compra: decData || null,
          observacoes: decObs || null,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro");
      setMsg(`Declaração #${j.id} registrada`);
      setShowDeclaracao(null);
      setDecReceitaId("");
      setDecValor("");
      setDecData("");
      setDecObs("");
      void carregar();
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    }
  }

  async function importarCsv() {
    if (!showDeclaracao || !decCsv.trim()) return;
    try {
      const r = await fetch(`/api/admin/parmavault/declaracoes/csv`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_text: decCsv }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro");
      setMsg(`CSV: ${j.inseridos} inseridos · ${j.erros?.length || 0} erros`);
      setDecCsv("");
      void carregar();
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    }
  }

  async function salvarRepasse() {
    if (!showRepasse) return;
    try {
      const r = await fetch(`/api/admin/parmavault/repasses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmacia_id: showRepasse.farmaciaId,
          ano_mes: rpAnoMes,
          valor_repasse: Number(rpValor),
          data_recebido: rpData,
          evidencia_texto: rpEvid || null,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "erro");
      setMsg(`Repasse #${j.id} registrado`);
      setShowRepasse(null);
      setRpAnoMes("");
      setRpValor("");
      setRpData("");
      setRpEvid("");
      void carregar();
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    }
  }

  return (
    <Layout>
      <div style={{ padding: 24, background: "#f9fafb", minHeight: "100vh" }}>
        {/* Header */}
        <div
          style={{
            background: NAVY,
            color: GOLD,
            padding: "20px 24px",
            borderRadius: 12,
            borderBottom: `4px solid ${GOLD}`,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 2 }}>
                PARMAVAULT · Reconciliação CEO
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#fde68a" }}>
                Previsto × Declarado × Recebido × GAP — pressão moral com dados
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={meses}
                onChange={(e) => setMeses(Number(e.target.value))}
                style={{
                  background: "#0b1220",
                  color: GOLD,
                  border: `1px solid ${GOLD}`,
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <option value={1}>Último mês</option>
                <option value={3}>Últimos 3 meses</option>
                <option value={6}>Últimos 6 meses</option>
                <option value={12}>Últimos 12 meses</option>
                <option value={24}>Últimos 24 meses</option>
              </select>
              <button
                onClick={() => void carregar()}
                style={{
                  background: GOLD,
                  color: NAVY,
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RefreshCw size={14} /> Recarregar
              </button>
              <button
                onClick={() => void rodarJobRetroativo()}
                style={{
                  background: "transparent",
                  color: GOLD,
                  border: `1px solid ${GOLD}`,
                  padding: "6px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Wand2 size={14} /> Recalcular comissões
              </button>
            </div>
          </div>
          {recalcStatus && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#fde68a" }}>{recalcStatus}</div>
          )}
        </div>

        {/* KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 20,
          }}
        >
          {[
            { l: "PREVISTO", v: kpis.previsto, c: NAVY, sub: `${kpis.qtd} receitas` },
            { l: "DECLARADO", v: kpis.declarado, c: NAVY, sub: " " },
            { l: "RECEBIDO", v: kpis.recebido, c: NAVY, sub: " " },
            {
              l: "GAP",
              v: kpis.gap,
              c: kpis.gap > 0 ? RED : GREEN,
              sub:
                kpis.previsto > 0
                  ? `${((kpis.gap / kpis.previsto) * 100).toFixed(1)}% sobre previsto`
                  : " ",
            },
          ].map((k) => (
            <div
              key={k.l}
              style={{
                background: "white",
                padding: "16px 20px",
                borderRadius: 10,
                border: `1px solid #e5e7eb`,
                borderLeft: `4px solid ${k.c}`,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 1 }}>
                {k.l}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.c, marginTop: 4 }}>
                {fmtBRL(k.v)}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {msg && (
          <div
            style={{
              padding: "10px 14px",
              background: msg.startsWith("Erro") ? "#fee2e2" : "#dcfce7",
              color: msg.startsWith("Erro") ? "#991b1b" : "#166534",
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 13,
            }}
          >
            {msg}
          </div>
        )}

        {/* Matriz farmácia × valores */}
        <div
          style={{
            background: "white",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: NAVY,
              color: GOLD,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Filter size={14} /> MATRIZ POR FARMÁCIA · janela {meses}m
          </div>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>Carregando...</div>
          ) : linhas.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>
              Nenhuma farmácia no período.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f3f4f6", color: "#374151" }}>
                  <th style={th}>Farmácia</th>
                  <th style={th}>% Comissão</th>
                  <th style={th}>Receitas</th>
                  <th style={th}>Previsto</th>
                  <th style={th}>Declarado</th>
                  <th style={th}>Recebido</th>
                  <th style={th}>GAP (R$)</th>
                  <th style={th}>GAP (%)</th>
                  <th style={th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const pctEd = editandoPct[l.farmacia_id];
                  const isEdit = pctEd !== undefined;
                  return (
                    <tr key={l.farmacia_id} style={{ borderTop: "1px solid #e5e7eb" }}>
                      <td style={{ ...td, fontWeight: 600 }}>{l.farmacia_nome}</td>
                      <td style={td}>
                        {isEdit ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              max={100}
                              value={pctEd}
                              onChange={(e) =>
                                setEditandoPct((p) => ({ ...p, [l.farmacia_id]: e.target.value }))
                              }
                              style={{
                                width: 60,
                                padding: "2px 4px",
                                border: `1px solid ${GOLD}`,
                                borderRadius: 4,
                              }}
                            />
                            <button
                              onClick={() => void salvarPercentual(l.farmacia_id)}
                              disabled={savingPct === l.farmacia_id}
                              style={{
                                background: GOLD,
                                color: NAVY,
                                border: "none",
                                padding: "2px 8px",
                                borderRadius: 4,
                                cursor: "pointer",
                                fontSize: 11,
                              }}
                            >
                              <Save size={11} />
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              setEditandoPct((p) => ({
                                ...p,
                                [l.farmacia_id]: String(l.percentual_comissao),
                              }))
                            }
                            style={{
                              background: "transparent",
                              border: "none",
                              color: NAVY,
                              cursor: "pointer",
                              textDecoration: "underline dotted",
                            }}
                          >
                            {Number(l.percentual_comissao).toFixed(2)}%
                          </button>
                        )}
                      </td>
                      <td style={td}>{l.qtd_receitas.toLocaleString("pt-BR")}</td>
                      <td style={td}>{fmtBRL(l.previsto)}</td>
                      <td style={td}>{fmtBRL(l.declarado)}</td>
                      <td style={td}>{fmtBRL(l.recebido)}</td>
                      <td
                        style={{
                          ...td,
                          color: l.gap > 0 ? RED : GREEN,
                          fontWeight: 700,
                        }}
                      >
                        {fmtBRL(l.gap)}
                      </td>
                      <td
                        style={{
                          ...td,
                          color: l.gap > 0 ? RED : GREEN,
                          fontWeight: 700,
                        }}
                      >
                        {l.gap_pct.toFixed(1)}%
                        {l.gap > 0 ? (
                          <AlertTriangle size={12} style={{ marginLeft: 4 }} />
                        ) : (
                          <CheckCircle2 size={12} style={{ marginLeft: 4 }} />
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            title="Gerar PDF/Excel"
                            onClick={() => {
                              setShowRelatorio({ farmaciaId: l.farmacia_id, nome: l.farmacia_nome });
                              const hoje = new Date();
                              const ini = new Date(
                                hoje.getFullYear(),
                                hoje.getMonth() - meses,
                                1,
                              );
                              setPeriodoIni(ini.toISOString().slice(0, 10));
                              setPeriodoFim(hoje.toISOString().slice(0, 10));
                            }}
                            style={btnIcon(NAVY)}
                          >
                            <FileText size={12} />
                          </button>
                          <button
                            title="Declaração / CSV"
                            onClick={() =>
                              setShowDeclaracao({
                                farmaciaId: l.farmacia_id,
                                nome: l.farmacia_nome,
                              })
                            }
                            style={btnIcon(GOLD)}
                          >
                            <Upload size={12} />
                          </button>
                          <button
                            title="Registrar repasse"
                            onClick={() =>
                              setShowRepasse({ farmaciaId: l.farmacia_id, nome: l.farmacia_nome })
                            }
                            style={btnIcon(GREEN)}
                          >
                            <DollarSign size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Histórico de relatórios */}
        <div
          style={{
            background: "white",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: NAVY,
              color: GOLD,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            HISTÓRICO DE RELATÓRIOS GERADOS (snapshots imutáveis)
          </div>
          {relatorios.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
              Nenhum relatório gerado ainda.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f3f4f6", color: "#374151" }}>
                  <th style={th}>#</th>
                  <th style={th}>Farmácia</th>
                  <th style={th}>Período</th>
                  <th style={th}>Protocolo</th>
                  <th style={th}>%</th>
                  <th style={th}>Previsto</th>
                  <th style={th}>Recebido</th>
                  <th style={th}>GAP</th>
                  <th style={th}>Receitas</th>
                  <th style={th}>Gerado em</th>
                  <th style={th}>Download</th>
                </tr>
              </thead>
              <tbody>
                {relatorios.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={td}>#{r.id}</td>
                    <td style={td}>{r.farmacia_nome}</td>
                    <td style={td}>
                      {fmtData(r.periodo_inicio)} → {fmtData(r.periodo_fim)}
                    </td>
                    <td style={{ ...td, fontFamily: "monospace" }}>{r.protocolo_hash}</td>
                    <td style={td}>{Number(r.percentual_comissao_snapshot).toFixed(2)}%</td>
                    <td style={td}>{fmtBRL(r.total_previsto_snapshot)}</td>
                    <td style={td}>{fmtBRL(r.total_recebido_snapshot)}</td>
                    <td
                      style={{
                        ...td,
                        color: Number(r.total_gap_snapshot) > 0 ? RED : GREEN,
                        fontWeight: 600,
                      }}
                    >
                      {fmtBRL(r.total_gap_snapshot)}
                    </td>
                    <td style={td}>{r.total_receitas}</td>
                    <td style={td}>{fmtData(r.gerado_em)}</td>
                    <td style={td}>
                      <a
                        href={`/api/admin/parmavault/relatorios/${r.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: NAVY,
                          fontWeight: 600,
                          marginRight: 8,
                          textDecoration: "none",
                        }}
                      >
                        <FileText size={11} style={{ verticalAlign: "middle" }} /> PDF
                      </a>
                      <a
                        href={`/api/admin/parmavault/relatorios/${r.id}/excel`}
                        style={{ color: "#16a34a", fontWeight: 600, textDecoration: "none" }}
                      >
                        <FileSpreadsheet size={11} style={{ verticalAlign: "middle" }} /> Excel
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal — Gerar Relatório */}
        {showRelatorio && (
          <Modal title={`Gerar Relatório · ${showRelatorio.nome}`} onClose={() => setShowRelatorio(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={lbl}>
                Período início
                <input
                  type="date"
                  value={periodoIni}
                  onChange={(e) => setPeriodoIni(e.target.value)}
                  style={inp}
                />
              </label>
              <label style={lbl}>
                Período fim
                <input
                  type="date"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                  style={inp}
                />
              </label>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Snapshot imutável: o % de comissão vigente AGORA será gravado no documento e não muda
                se você editar depois.
              </div>
              <button
                disabled={gerando}
                onClick={() => void gerarRelatorio()}
                style={btnPrincipal()}
              >
                {gerando ? "Gerando..." : "Gerar PDF + Excel"}
              </button>
            </div>
          </Modal>
        )}

        {/* Modal — Declaração / CSV */}
        {showDeclaracao && (
          <Modal title={`Declarações · ${showDeclaracao.nome}`} onClose={() => setShowDeclaracao(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <fieldset style={{ border: "1px solid #e5e7eb", padding: 12, borderRadius: 6 }}>
                <legend style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Manual</legend>
                <label style={lbl}>
                  Receita ID
                  <input
                    type="number"
                    value={decReceitaId}
                    onChange={(e) => setDecReceitaId(e.target.value)}
                    style={inp}
                  />
                </label>
                <label style={lbl}>
                  Valor pago pelo paciente (R$)
                  <input
                    type="number"
                    step="0.01"
                    value={decValor}
                    onChange={(e) => setDecValor(e.target.value)}
                    style={inp}
                  />
                </label>
                <label style={lbl}>
                  Data da compra
                  <input
                    type="date"
                    value={decData}
                    onChange={(e) => setDecData(e.target.value)}
                    style={inp}
                  />
                </label>
                <label style={lbl}>
                  Observações
                  <input value={decObs} onChange={(e) => setDecObs(e.target.value)} style={inp} />
                </label>
                <button onClick={() => void salvarDeclaracaoManual()} style={btnPrincipal()}>
                  Salvar declaração manual
                </button>
              </fieldset>

              <fieldset style={{ border: "1px solid #e5e7eb", padding: 12, borderRadius: 6 }}>
                <legend style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>Upload CSV</legend>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
                  Formato: <code>receita_id,valor_pago,data_compra,observacoes</code> (1ª linha
                  cabeçalho ignorada)
                </div>
                <textarea
                  rows={6}
                  value={decCsv}
                  onChange={(e) => setDecCsv(e.target.value)}
                  placeholder={"receita_id,valor_pago,data_compra,observacoes\n123,250.00,2026-04-15,Pagamento em dinheiro"}
                  style={{ ...inp, fontFamily: "monospace" }}
                />
                <button onClick={() => void importarCsv()} style={btnPrincipal()}>
                  Importar CSV
                </button>
              </fieldset>
            </div>
          </Modal>
        )}

        {/* Modal — Repasse */}
        {showRepasse && (
          <Modal title={`Registrar Repasse · ${showRepasse.nome}`} onClose={() => setShowRepasse(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={lbl}>
                Ano-Mês (YYYY-MM)
                <input
                  type="text"
                  placeholder="2026-04"
                  value={rpAnoMes}
                  onChange={(e) => setRpAnoMes(e.target.value)}
                  style={inp}
                />
              </label>
              <label style={lbl}>
                Valor recebido (R$)
                <input
                  type="number"
                  step="0.01"
                  value={rpValor}
                  onChange={(e) => setRpValor(e.target.value)}
                  style={inp}
                />
              </label>
              <label style={lbl}>
                Data recebido
                <input
                  type="date"
                  value={rpData}
                  onChange={(e) => setRpData(e.target.value)}
                  style={inp}
                />
              </label>
              <label style={lbl}>
                Evidência (extrato bancário, comprovante Pix, etc)
                <input value={rpEvid} onChange={(e) => setRpEvid(e.target.value)} style={inp} />
              </label>
              <button onClick={() => void salvarRepasse()} style={btnPrincipal()}>
                Registrar repasse
              </button>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}

const th: any = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.5,
};
const td: any = { padding: "8px 12px", fontSize: 12, color: "#374151" };
const lbl: any = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#374151" };
const inp: any = {
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
};
function btnIcon(c: string): any {
  return {
    background: c,
    color: c === GOLD ? NAVY : "white",
    border: "none",
    padding: "5px 8px",
    borderRadius: 5,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
function btnPrincipal(): any {
  return {
    background: NAVY,
    color: GOLD,
    border: "none",
    padding: "10px 16px",
    borderRadius: 6,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  };
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: 20,
          borderRadius: 10,
          minWidth: 420,
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: `2px solid ${GOLD}`,
          }}
        >
          <h2 style={{ margin: 0, color: NAVY, fontSize: 16 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6b7280" }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
