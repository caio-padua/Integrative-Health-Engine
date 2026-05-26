// Task #227 — Conciliacao do custo magistral pago a manipuladora.
// Lista por unidade e mes o estimado (faturamento_diario.comissao_magistral_estimada)
// versus o ja pago (contas_a_pagar categoria='magistral', status='pago').
// Confirmar a nota gera uma linha real em contas_a_pagar via
// POST /painel-pawards/conciliacao-magistral/confirmar — assim o card
// "Fluxo de Caixa 30d" passa a refletir o custo magistral real.
import { useEffect, useMemo, useState, useCallback } from "react";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";
import { RefreshCw, CheckCircle2, AlertTriangle, DollarSign, Filter } from "lucide-react";

type Linha = {
  unidade_id: number | null;
  unidade_nome: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  receitas_count: number;
  estimado: number;
  pago: number;
  pendente: number;
  lancamentos: number;
  status_conciliacao: "pendente" | "conciliado" | "parcial" | "excedido";
};

type Resposta = {
  linhas: Linha[];
  total_estimado: number;
  total_pago: number;
  total_pendente: number;
};

const NAVY = "#020406";
const GOLD = "#C89B3C";
const RED = "#dc2626";
const GREEN = "#16a34a";
const YELLOW = "#ca8a04";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtMes = (iso: string) => {
  const [y, m] = iso.split("-");
  return `${m}/${y}`;
};

function corStatus(s: Linha["status_conciliacao"]): string {
  switch (s) {
    case "conciliado": return GREEN;
    case "parcial":    return YELLOW;
    case "excedido":   return GOLD;
    default:           return RED;
  }
}

function rotuloStatus(s: Linha["status_conciliacao"]): string {
  switch (s) {
    case "conciliado": return "Conciliado";
    case "parcial":    return "Parcial";
    case "excedido":   return "Excedido";
    default:           return "Pendente";
  }
}

export default function AdminConciliacaoMagistral() {
  const [data, setData] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");

  const [confirmando, setConfirmando] = useState<Linha | null>(null);
  const [valorReal, setValorReal] = useState<string>("");
  const [fornecedor, setFornecedor] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");
  const [dataPag, setDataPag] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [salvando, setSalvando] = useState(false);
  const [erroConfirmar, setErroConfirmar] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const qs = new URLSearchParams();
      if (inicio) qs.set("inicio", inicio);
      if (fim)    qs.set("fim", fim);
      if (unidadeId) qs.set("unidade_id", unidadeId);
      const r = await apiFetch(`/api/painel-pawards/conciliacao-magistral?${qs.toString()}`);
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }
      const j = (await r.json()) as Resposta;
      setData(j);
    } catch (e: any) {
      setErro(e?.message ?? "Erro ao carregar conciliacao");
    } finally {
      setLoading(false);
    }
  }, [inicio, fim, unidadeId]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirConfirmar = (l: Linha) => {
    setConfirmando(l);
    setValorReal(l.estimado > 0 ? l.estimado.toFixed(2) : "");
    setFornecedor("");
    setObservacao("");
    setDataPag(new Date().toISOString().slice(0, 10));
    setErroConfirmar(null);
  };

  const submeterConfirmacao = async () => {
    if (!confirmando) return;
    setSalvando(true);
    setErroConfirmar(null);
    try {
      const valor = Number(valorReal.replace(",", "."));
      if (!Number.isFinite(valor) || valor < 0) {
        throw new Error("Valor real invalido");
      }
      const r = await apiFetch("/api/painel-pawards/conciliacao-magistral/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidade_id: confirmando.unidade_id,
          periodo_inicio: confirmando.periodo_inicio,
          periodo_fim: confirmando.periodo_fim,
          valor_real: valor,
          fornecedor: fornecedor || undefined,
          observacao: observacao || undefined,
          data_pagamento: dataPag || undefined,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${r.status}`);
      }
      setConfirmando(null);
      await carregar();
    } catch (e: any) {
      setErroConfirmar(e?.message ?? "Erro ao confirmar");
    } finally {
      setSalvando(false);
    }
  };

  const totais = useMemo(() => ({
    estimado: data?.total_estimado ?? 0,
    pago: data?.total_pago ?? 0,
    pendente: data?.total_pendente ?? 0,
  }), [data]);

  return (
    <Layout>
      <div style={{ padding: "24px", color: "#e8e8e8", background: NAVY, minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: GOLD, margin: 0 }}>
              Conciliacao Magistral
            </h1>
            <p style={{ fontSize: 12, opacity: 0.75, margin: "4px 0 0 0" }}>
              Confirme as notas pagas a manipuladora pra trocar a estimativa por custo real no Fluxo de Caixa 30d.
            </p>
          </div>
          <button
            onClick={carregar}
            disabled={loading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "transparent", color: GOLD, border: `1px solid ${GOLD}`,
              padding: "6px 12px", cursor: "pointer", fontSize: 13,
            }}
          >
            <RefreshCw size={14} /> Recarregar
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 12, alignItems: "end", marginBottom: 16, flexWrap: "wrap" }}>
          <Filter size={16} style={{ marginBottom: 8, opacity: 0.7 }} />
          <Campo label="Inicio (data)" value={inicio} onChange={setInicio} type="date" />
          <Campo label="Fim (data)"    value={fim}    onChange={setFim}    type="date" />
          <Campo label="Unidade ID"    value={unidadeId} onChange={setUnidadeId} type="number" placeholder="todas" />
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          <Kpi label="Estimado total" valor={totais.estimado} cor={GOLD} />
          <Kpi label="Pago real"      valor={totais.pago}     cor={GREEN} />
          <Kpi label="A conciliar"    valor={totais.pendente} cor={totais.pendente > 0 ? RED : GREEN} />
        </div>

        {erro && (
          <div style={{ background: "#3a0a0a", border: `1px solid ${RED}`, color: "#ffd1d1", padding: 10, marginBottom: 12, fontSize: 13 }}>
            <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
            {erro}
          </div>
        )}

        {/* Tabela */}
        <div style={{ overflowX: "auto", border: "1px solid #1c2433" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0a1220", color: GOLD }}>
                <Th>Unidade</Th>
                <Th>Competencia</Th>
                <Th>Receitas</Th>
                <Th align="right">Estimado</Th>
                <Th align="right">Pago real</Th>
                <Th align="right">Pendente</Th>
                <Th>Lanc.</Th>
                <Th>Status</Th>
                <Th>Acao</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} style={{ padding: 20, textAlign: "center", opacity: 0.7 }}>Carregando...</td></tr>
              )}
              {!loading && data && data.linhas.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 20, textAlign: "center", opacity: 0.7 }}>
                  Nenhuma linha no periodo. Ajuste o filtro.
                </td></tr>
              )}
              {!loading && data?.linhas.map((l) => (
                <tr key={`${l.unidade_id ?? "x"}-${l.periodo_inicio}`} style={{ borderTop: "1px solid #14202f" }}>
                  <Td>{l.unidade_nome ?? `(unidade ${l.unidade_id ?? "?"})`}</Td>
                  <Td>{fmtMes(l.periodo_inicio)}</Td>
                  <Td>{l.receitas_count}</Td>
                  <Td align="right">{fmtBRL(l.estimado)}</Td>
                  <Td align="right" style={{ color: l.pago > 0 ? GREEN : "#888" }}>{fmtBRL(l.pago)}</Td>
                  <Td align="right" style={{ color: l.pendente > 0 ? RED : (l.pendente < 0 ? GOLD : GREEN) }}>
                    {fmtBRL(l.pendente)}
                  </Td>
                  <Td>{l.lancamentos}</Td>
                  <Td>
                    <span style={{ color: corStatus(l.status_conciliacao), fontWeight: 600 }}>
                      {rotuloStatus(l.status_conciliacao)}
                    </span>
                  </Td>
                  <Td>
                    <button
                      onClick={() => abrirConfirmar(l)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        background: GOLD, color: NAVY, border: "none",
                        padding: "4px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      }}
                    >
                      <DollarSign size={12} /> Confirmar nota
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {confirmando && (
          <div
            onClick={() => !salvando && setConfirmando(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#0a1220", border: `1px solid ${GOLD}`, color: "#e8e8e8",
                padding: 20, width: 460, maxWidth: "90vw",
              }}
            >
              <h2 style={{ fontSize: 16, color: GOLD, margin: "0 0 4px 0" }}>Confirmar nota da manipuladora</h2>
              <p style={{ fontSize: 12, opacity: 0.75, margin: "0 0 14px 0" }}>
                {confirmando.unidade_nome ?? `Unidade ${confirmando.unidade_id ?? "?"}`} ·
                competencia {fmtMes(confirmando.periodo_inicio)} ·
                estimado {fmtBRL(confirmando.estimado)} · ja pago {fmtBRL(confirmando.pago)}
              </p>

              <Campo label="Valor real pago (R$)" value={valorReal} onChange={setValorReal} type="text" />
              <Campo label="Data do pagamento"   value={dataPag}   onChange={setDataPag}   type="date" />
              <Campo label="Fornecedor"          value={fornecedor} onChange={setFornecedor} type="text" placeholder="Manipuladora X" />
              <Campo label="Observacao"          value={observacao} onChange={setObservacao} type="text" placeholder="Numero da NF, lote, etc" />

              {erroConfirmar && (
                <div style={{ background: "#3a0a0a", color: "#ffd1d1", padding: 8, fontSize: 12, marginTop: 8 }}>
                  {erroConfirmar}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => setConfirmando(null)}
                  disabled={salvando}
                  style={{ background: "transparent", color: "#aaa", border: "1px solid #444", padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={submeterConfirmacao}
                  disabled={salvando}
                  style={{
                    background: GREEN, color: "white", border: "none", padding: "6px 14px",
                    fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                >
                  <CheckCircle2 size={14} /> {salvando ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Kpi({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div style={{ background: "#0a1220", border: "1px solid #1c2433", padding: 14 }}>
      <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor, marginTop: 4 }}>
        {valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </div>
    </div>
  );
}

function Campo({
  label, value, onChange, type, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type: string; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
      <label style={{ fontSize: 11, opacity: 0.75 }}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "#020406", color: "#e8e8e8", border: "1px solid #2a3548",
          padding: "6px 8px", fontSize: 13, minWidth: 140,
        }}
      />
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{ padding: "8px 10px", textAlign: align ?? "left", fontWeight: 600, fontSize: 12 }}>
      {children}
    </th>
  );
}

function Td({
  children, align, style,
}: { children: React.ReactNode; align?: "left" | "right"; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "8px 10px", textAlign: align ?? "left", ...style }}>
      {children}
    </td>
  );
}
