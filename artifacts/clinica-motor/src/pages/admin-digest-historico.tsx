// PAWARDS MEDCORE · Task #238 · /admin/digest-historico
// Historico (30d) do digest diario de alertas pro Caio. Le
// alertas_digest_envios (migration 050, Task #26) e mostra quando o digest
// saiu, pra quem foi e se algum envio falhou — sem precisar abrir o banco.
// Botao "Reenviar hoje" chama POST /painel-pawards/digest/reenviar com
// forcar:true (origem=MANUAL no service).
import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Mail,
  Send,
  Clock,
} from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const RED = "#dc2626";
const AMBER = "#d97706";
const GREEN = "#16a34a";
const ZINC = "#71717a";

type EnvioRow = {
  id: number;
  dia_brt: string;
  destinatario_email: string;
  enviado_em: string;
  status: "ENVIADO" | "ERRO" | string;
  gmail_message_id: string | null;
  total_alertas: number;
  clinicas_abaixo_min: number;
  kpis_fora_faixa: number;
  pendencias: number;
  erro: string | null;
  origem: string;
};

type DiaAgrupado = {
  dia_brt: string;
  envios: EnvioRow[];
  total_envios: number;
  total_enviados: number;
  total_erros: number;
  total_alertas_no_dia: number;
};

type Resposta = {
  dias: number;
  total_envios: number;
  total_dias: number;
  dias_agrupados: DiaAgrupado[];
};

type ReenvioResultado = {
  diaBrt: string;
  total: number;
  pulado: boolean;
  motivo?: string;
  envios: Array<{
    destinatario: string;
    enviado: boolean;
    motivo?: string;
    gmailMessageId?: string | null;
  }>;
};

function formatarDia(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y?.slice(2)}`;
}

function formatarHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function gmailUrl(messageId: string | null): string | null {
  if (!messageId) return null;
  return `https://mail.google.com/mail/u/0/#all/${messageId}`;
}

export default function AdminDigestHistorico() {
  const [data, setData] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [ultimoReenvio, setUltimoReenvio] = useState<ReenvioResultado | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await apiFetch("/api/painel-pawards/digest/historico?dias=30", {
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as Resposta;
      setData(j);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const reenviarHoje = useCallback(async () => {
    if (reenviando) return;
    const ok = window.confirm(
      "Disparar agora o digest de hoje pra todos os destinatarios configurados?\n\n" +
        "(forcar:true — vai sobrescrever envios ja registrados pra hoje)",
    );
    if (!ok) return;
    setReenviando(true);
    setUltimoReenvio(null);
    try {
      const r = await apiFetch("/api/painel-pawards/digest/reenviar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as ReenvioResultado;
      setUltimoReenvio(j);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setReenviando(false);
    }
  }, [reenviando, carregar]);

  return (
    <Layout>
      <div style={{ background: NAVY, minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 18,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: GOLD,
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                PAWARDS · Task #238
              </div>
              <h1
                style={{
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 700,
                  margin: "4px 0 0 0",
                }}
              >
                Historico do digest diario de alertas
              </h1>
              <div style={{ color: ZINC, fontSize: 12, marginTop: 4 }}>
                Ultimos 30 dias · cada linha = 1 envio (dia × destinatario) ·
                fonte: <code>alertas_digest_envios</code>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={carregar}
                disabled={loading}
                data-testid="button-recarregar"
                style={{
                  padding: "8px 14px",
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <RefreshCw size={14} /> Recarregar
              </button>
              <button
                onClick={reenviarHoje}
                disabled={reenviando}
                data-testid="button-reenviar-hoje"
                style={{
                  padding: "8px 14px",
                  background: GOLD,
                  color: NAVY,
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: reenviando ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: reenviando ? 0.5 : 1,
                }}
              >
                <Send size={14} /> {reenviando ? "Enviando…" : "Reenviar hoje"}
              </button>
            </div>
          </div>

          {erro && (
            <div
              style={{
                padding: 12,
                marginBottom: 14,
                background: "rgba(220,80,80,0.1)",
                border: "1px solid rgba(220,80,80,0.35)",
                borderRadius: 6,
                color: "#fca5a5",
                fontSize: 13,
              }}
              data-testid="text-erro-digest"
            >
              <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
              {erro}
            </div>
          )}

          {ultimoReenvio && (
            <div
              style={{
                padding: 12,
                marginBottom: 14,
                background: ultimoReenvio.pulado
                  ? "rgba(217,119,6,0.12)"
                  : "rgba(22,163,74,0.12)",
                border: `1px solid ${ultimoReenvio.pulado ? AMBER : GREEN}`,
                borderRadius: 6,
                color: "#fff",
                fontSize: 13,
              }}
              data-testid="text-resultado-reenvio"
            >
              {ultimoReenvio.pulado ? (
                <>
                  <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Disparo pulado — motivo: <strong>{ultimoReenvio.motivo}</strong>{" "}
                  (dia {formatarDia(ultimoReenvio.diaBrt)})
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Digest reenviado pro dia {formatarDia(ultimoReenvio.diaBrt)} —{" "}
                  {ultimoReenvio.envios.filter((e) => e.enviado).length}/
                  {ultimoReenvio.envios.length} destinatarios OK,{" "}
                  {ultimoReenvio.total} alertas no payload.
                </>
              )}
            </div>
          )}

          {loading && !data && (
            <div style={{ color: ZINC, fontSize: 13, padding: 20 }}>
              Carregando historico…
            </div>
          )}

          {data && data.dias_agrupados.length === 0 && (
            <div
              style={{
                padding: 20,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 6,
                color: ZINC,
                fontSize: 13,
                textAlign: "center",
              }}
              data-testid="text-vazio"
            >
              Nenhum envio de digest nos ultimos {data.dias} dias.
            </div>
          )}

          {data && data.dias_agrupados.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
              data-testid="lista-dias"
            >
              {data.dias_agrupados.map((dia) => (
                <DiaCard key={dia.dia_brt} dia={dia} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function DiaCard({ dia }: { dia: DiaAgrupado }) {
  const algumErro = dia.total_erros > 0;
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${algumErro ? "rgba(220,80,80,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 6,
        padding: 14,
      }}
      data-testid={`dia-card-${dia.dia_brt}`}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {formatarDia(dia.dia_brt)}
          </div>
          <div style={{ color: ZINC, fontSize: 11, marginTop: 2 }}>
            {dia.total_envios} envio{dia.total_envios === 1 ? "" : "s"} ·{" "}
            {dia.total_alertas_no_dia} alerta{dia.total_alertas_no_dia === 1 ? "" : "s"} no payload
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Pill cor={GREEN} icon={<CheckCircle2 size={12} />} label={`${dia.total_enviados} OK`} />
          {dia.total_erros > 0 && (
            <Pill cor={RED} icon={<AlertTriangle size={12} />} label={`${dia.total_erros} ERRO`} />
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: ZINC }}>
              <th style={thStyle}>Quando</th>
              <th style={thStyle}>Destinatario</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Origem</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Alertas (clinicas/kpis/pend)</th>
              <th style={thStyle}>Gmail</th>
            </tr>
          </thead>
          <tbody>
            {dia.envios.map((e) => (
              <tr
                key={e.id}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#fff" }}
                data-testid={`envio-row-${e.id}`}
              >
                <td style={tdStyle}>
                  <Clock size={11} style={{ verticalAlign: "middle", marginRight: 4, color: ZINC }} />
                  {formatarHora(e.enviado_em)}
                </td>
                <td style={tdStyle}>
                  <Mail size={11} style={{ verticalAlign: "middle", marginRight: 4, color: ZINC }} />
                  {e.destinatario_email}
                </td>
                <td style={tdStyle}>
                  {e.status === "ENVIADO" ? (
                    <span style={{ color: GREEN, fontWeight: 700 }}>ENVIADO</span>
                  ) : (
                    <span
                      style={{ color: RED, fontWeight: 700 }}
                      title={e.erro ?? undefined}
                    >
                      {e.status}
                      {e.erro ? ` — ${e.erro.slice(0, 60)}${e.erro.length > 60 ? "…" : ""}` : ""}
                    </span>
                  )}
                </td>
                <td style={{ ...tdStyle, color: ZINC }}>{e.origem}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <strong>{e.total_alertas}</strong>{" "}
                  <span style={{ color: ZINC }}>
                    ({e.clinicas_abaixo_min}/{e.kpis_fora_faixa}/{e.pendencias})
                  </span>
                </td>
                <td style={tdStyle}>
                  {e.gmail_message_id ? (
                    <a
                      href={gmailUrl(e.gmail_message_id) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: GOLD, display: "inline-flex", alignItems: "center", gap: 4 }}
                      data-testid={`link-gmail-${e.id}`}
                      title={e.gmail_message_id}
                    >
                      abrir <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span style={{ color: ZINC }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "6px 6px",
  textAlign: "left",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontSize: 10,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 6px",
  whiteSpace: "nowrap",
};

function Pill({
  cor,
  icon,
  label,
}: {
  cor: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        background: `${cor}22`,
        color: cor,
        border: `1px solid ${cor}66`,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {icon}
      {label}
    </span>
  );
}
