import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { PAWARDS } from "@/lib/pawards-tokens";

interface AcessoRow {
  id: number;
  usuario_id: number | null;
  email: string | null;
  perfil: string | null;
  metodo: string;
  endpoint: string;
  ip: string | null;
  user_agent: string | null;
  acessado_em: string;
}

interface RespostaAuditoria {
  items: AcessoRow[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZES = [25, 50, 100, 200];

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shortUserAgent(ua: string | null): string {
  if (!ua) return "—";
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/i);
  if (m) return m[0];
  return ua.length > 40 ? `${ua.slice(0, 37)}…` : ua;
}

export function AuditoriaAcessosPanel() {
  const [usuarioId, setUsuarioId] = useState<string>("");
  const [desde, setDesde] = useState<string>("");
  const [endpointBusca, setEndpointBusca] = useState<string>("");
  const [metodo, setMetodo] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  const [data, setData] = useState<RespostaAuditoria | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(offset));
      if (usuarioId.trim()) params.set("usuario_id", usuarioId.trim());
      if (desde) {
        // input datetime-local entrega "YYYY-MM-DDTHH:mm"; backend aceita timestamptz.
        params.set("desde", desde);
      }
      if (endpointBusca.trim()) params.set("endpoint", endpointBusca.trim());
      if (metodo) params.set("metodo", metodo);
      const res = await apiFetch(`/api/painel-pawards/auditoria/acessos?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as RespostaAuditoria;
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [pageSize, offset, usuarioId, desde, endpointBusca, metodo]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const total = data?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + pageSize, total);
  const canPrev = offset > 0;
  const canNext = offset + pageSize < total;

  const aplicarFiltros = (e: React.FormEvent) => {
    e.preventDefault();
    // Apenas reseta o offset; o useEffect dispara o fetch novo. Evita race
    // entre o fetch imediato (com offset stale) e o fetch do efeito.
    if (offset === 0) {
      fetchPage();
    } else {
      setOffset(0);
    }
  };

  const limpar = () => {
    setUsuarioId("");
    setDesde("");
    setEndpointBusca("");
    setMetodo("");
    setOffset(0);
  };

  const [baixandoCsv, setBaixandoCsv] = useState(false);
  const baixarCsv = useCallback(async () => {
    setBaixandoCsv(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("formato", "csv");
      if (usuarioId.trim()) params.set("usuario_id", usuarioId.trim());
      if (desde) params.set("desde", desde);
      const res = await apiFetch(`/api/painel-pawards/auditoria/acessos?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const hoje = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria-acessos-${hoje}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBaixandoCsv(false);
    }
  }, [usuarioId, desde]);

  return (
    <div
      style={{
        background: PAWARDS.colors.bg.panel,
        borderRadius: PAWARDS.radii.panel,
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: PAWARDS.shadows.blackPiano,
        padding: 24,
        marginBottom: 18,
      }}
      data-testid="panel-auditoria-acessos"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              color: PAWARDS.colors.text.tertiary,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Auditoria de acessos · Painel PAWARDS
          </div>
          <div
            style={{
              fontSize: 11,
              color: PAWARDS.colors.text.muted,
              marginTop: 4,
            }}
          >
            Trilha persistida em painel_pawards_auditoria · apenas perfil master visualiza.
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: PAWARDS.colors.text.tertiary,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {loading ? "carregando…" : `${pageStart}–${pageEnd} de ${total}`}
        </div>
      </div>

      <form
        onSubmit={aplicarFiltros}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: 14,
          padding: 12,
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: PAWARDS.colors.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Usuário (id)
          <input
            type="number"
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            placeholder="ex: 42"
            data-testid="input-filtro-usuario-id"
            style={{
              padding: "6px 10px",
              minWidth: 120,
              background: PAWARDS.colors.bg[800],
              color: PAWARDS.colors.text.primary,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: PAWARDS.colors.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Desde
          <input
            type="datetime-local"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            data-testid="input-filtro-desde"
            style={{
              padding: "6px 10px",
              background: PAWARDS.colors.bg[800],
              color: PAWARDS.colors.text.primary,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: PAWARDS.colors.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Endpoint contém
          <input
            type="text"
            value={endpointBusca}
            onChange={(e) => setEndpointBusca(e.target.value)}
            placeholder="ex: parmavault"
            data-testid="input-filtro-endpoint"
            style={{
              padding: "6px 10px",
              minWidth: 180,
              background: PAWARDS.colors.bg[800],
              color: PAWARDS.colors.text.primary,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: PAWARDS.colors.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Método
          <select
            value={metodo}
            onChange={(e) => { setMetodo(e.target.value); setOffset(0); }}
            data-testid="select-filtro-metodo"
            style={{
              padding: "6px 10px",
              background: PAWARDS.colors.bg[800],
              color: PAWARDS.colors.text.primary,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <option value="">Todos</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: PAWARDS.colors.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Por página
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setOffset(0); }}
            data-testid="select-page-size"
            style={{
              padding: "6px 10px",
              background: PAWARDS.colors.bg[800],
              color: PAWARDS.colors.text.primary,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          data-testid="button-aplicar-filtros"
          style={{
            padding: "8px 16px",
            background: PAWARDS.colors.gold[700],
            color: PAWARDS.colors.bg[950],
            border: "none",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Aplicar
        </button>
        <button
          type="button"
          onClick={limpar}
          data-testid="button-limpar-filtros"
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: PAWARDS.colors.text.tertiary,
            border: `1px solid rgba(255,255,255,0.12)`,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={baixarCsv}
          disabled={baixandoCsv || loading}
          data-testid="button-baixar-csv"
          title="Baixa todos os acessos que correspondem aos filtros atuais (não só a página visível)"
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: PAWARDS.colors.gold[500],
            border: `1px solid ${PAWARDS.colors.gold[700]}`,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: baixandoCsv || loading ? "not-allowed" : "pointer",
            opacity: baixandoCsv || loading ? 0.5 : 1,
          }}
        >
          {baixandoCsv ? "Baixando…" : "Baixar CSV"}
        </button>
      </form>

      {error && (
        <div
          style={{
            padding: 10,
            marginBottom: 10,
            background: "rgba(220,80,80,0.08)",
            border: "1px solid rgba(220,80,80,0.3)",
            borderRadius: 6,
            color: PAWARDS.colors.status.critical,
            fontSize: 12,
          }}
          data-testid="text-erro-auditoria"
        >
          Erro ao carregar auditoria: {error}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11,
            fontFamily: "ui-monospace, monospace",
          }}
          data-testid="tabela-auditoria-acessos"
        >
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: PAWARDS.colors.text.tertiary }}>
              <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>Quando</th>
              <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>Email</th>
              <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>Perfil</th>
              <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>Endpoint</th>
              <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>IP</th>
              <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((r) => (
              <tr
                key={r.id}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", color: PAWARDS.colors.text.primary }}
                data-testid={`row-acesso-${r.id}`}
              >
                <td style={{ padding: "6px 6px", whiteSpace: "nowrap", color: PAWARDS.colors.text.tertiary }}>{formatTimestamp(r.acessado_em)}</td>
                <td style={{ padding: "6px 6px", whiteSpace: "nowrap" }}>{r.email ?? <span style={{ color: PAWARDS.colors.text.muted }}>—</span>}</td>
                <td style={{ padding: "6px 6px", whiteSpace: "nowrap", color: PAWARDS.colors.gold[500] }}>{r.perfil ?? "—"}</td>
                <td style={{ padding: "6px 6px" }}>
                  <span style={{ color: PAWARDS.colors.text.muted, marginRight: 6 }}>{r.metodo}</span>
                  {r.endpoint}
                </td>
                <td style={{ padding: "6px 6px", whiteSpace: "nowrap", color: PAWARDS.colors.text.tertiary }}>{r.ip ?? "—"}</td>
                <td style={{ padding: "6px 6px", color: PAWARDS.colors.text.muted }} title={r.user_agent ?? ""}>{shortUserAgent(r.user_agent)}</td>
              </tr>
            ))}
            {!loading && (data?.items ?? []).length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 18, textAlign: "center", color: PAWARDS.colors.text.muted, fontSize: 12 }}>
                  Nenhum acesso encontrado para os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 14,
          fontSize: 11,
          color: PAWARDS.colors.text.tertiary,
        }}
      >
        <div>
          Página {Math.floor(offset / pageSize) + 1} de {Math.max(1, Math.ceil(total / pageSize))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
            disabled={!canPrev || loading}
            data-testid="button-pagina-anterior"
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: canPrev ? PAWARDS.colors.text.primary : PAWARDS.colors.text.muted,
              border: `1px solid rgba(255,255,255,0.12)`,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: canPrev ? "pointer" : "not-allowed",
              opacity: canPrev ? 1 : 0.4,
            }}
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={() => setOffset(offset + pageSize)}
            disabled={!canNext || loading}
            data-testid="button-pagina-proxima"
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: canNext ? PAWARDS.colors.text.primary : PAWARDS.colors.text.muted,
              border: `1px solid rgba(255,255,255,0.12)`,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: canNext ? "pointer" : "not-allowed",
              opacity: canNext ? 1 : 0.4,
            }}
          >
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
}
