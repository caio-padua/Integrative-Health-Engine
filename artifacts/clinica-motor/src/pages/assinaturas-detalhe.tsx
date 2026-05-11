// PAWARDS MEDCORE · Wave 10 F5 · /assinaturas/:id
// Detalhe completo de uma solicitação: signatários × auditoria × manifesto SHA-256.
import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "wouter";
import { Layout } from "@/components/Layout";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileSignature,
  Hash,
  MapPin,
  KeyRound,
  Download,
} from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#d97706";
const BLUE = "#2563eb";
const ZINC = "#71717a";

type Signatario = {
  id: number;
  papel: string;
  nome: string;
  email: string | null;
  ordem: number;
  status: string;
  link_assinatura: string | null;
  assinado_em: string | null;
};

type Auditoria = {
  signature_id: string;
  signer_papel: string;
  signer_name: string;
  signer_cpf: string;
  signer_ip: string;
  signer_geo: any;
  auth_method: string;
  document_hash_sha256: string;
  document_hash_assinado: string | null;
  icp_brasil_serial: string | null;
  icp_brasil_ac: string | null;
  validation_url: string;
  pdf_storage_key: string | null;
  timestamp_utc: string;
  criado_em: string;
};

type Solicitacao = {
  id: number;
  paciente_id: number | null;
  paciente_nome: string | null;
  template: string;
  template_nome: string;
  provedor_codigo: string;
  provedor_envelope_id: string | null;
  zapsign_external_id: string | null;
  status: string;
  criado_em: string;
  enviado_em: string | null;
  concluido_em: string | null;
  expira_em: string | null;
  pdf_assinado_url: string | null;
  metadata: any;
};

const SIG_STATUS: Record<string, { color: string; icon: any; label: string }> = {
  PENDENTE: { color: ZINC, icon: Clock, label: "PENDENTE" },
  ENVIADO: { color: BLUE, icon: FileSignature, label: "ENVIADO" },
  ASSINADO: { color: GREEN, icon: CheckCircle2, label: "ASSINADO" },
  REJEITADO: { color: RED, icon: XCircle, label: "REJEITADO" },
  EXPIRADO: { color: ZINC, icon: XCircle, label: "EXPIRADO" },
};

const AUTH_METHOD_LABELS: Record<string, string> = {
  email: "E-mail (link)",
  sms: "SMS",
  whatsapp: "WhatsApp",
  selfie: "Selfie + documento",
  certificadoDigital: "ICP-Brasil (certificado)",
  ICP_BRASIL: "ICP-Brasil (certificado)",
  TOKEN_OTP: "Token OTP",
  ASSINATURA_TELA_ZAPSIGN: "Tela ZapSign + token",
};

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function mascararCpf(cpf: string): string {
  if (!cpf || cpf.length < 11) return cpf || "—";
  return `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`;
}

export default function AssinaturasDetalhe() {
  const params = useParams();
  const id = Number((params as any)?.id);
  const [data, setData] = useState<{
    solicitacao: Solicitacao | null;
    signatarios: Signatario[];
    auditoria: Auditoria[];
    notificacoes: any[];
    live: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reenviandoId, setReenviandoId] = useState<number | null>(null);
  const [reenvioMsg, setReenvioMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const reenviarLembrete = useCallback(async (signatarioId: number) => {
    setReenviandoId(signatarioId);
    setReenvioMsg(null);
    try {
      const r = await fetch(`/api/assinaturas/${id}/signatario/${signatarioId}/reenviar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setReenvioMsg({ ok: false, texto: body.error || `HTTP ${r.status}` });
      } else {
        setReenvioMsg({
          ok: true,
          texto: body.mock
            ? "Reenvio registrado (mock — sem ZAPSIGN_API_TOKEN configurado)"
            : "Lembrete WhatsApp reenviado via ZapSign",
        });
      }
    } catch (e) {
      setReenvioMsg({ ok: false, texto: (e as Error).message });
    } finally {
      setReenviandoId(null);
    }
  }, [id]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch(`/api/assinaturas/${id}`, {
        credentials: "include",
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      setData(await r.json());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) carregar();
  }, [id, carregar]);

  if (!id) {
    return (
      <Layout>
        <div className="p-6">ID inválido.</div>
      </Layout>
    );
  }

  const sol = data?.solicitacao;

  return (
    <Layout>
      <div
        data-pdf-titulo={`Assinatura #${id} — Detalhe Auditável`}
        className="p-6 space-y-6"
      >
        {/* Voltar + título */}
        <div className="flex items-center justify-between">
          <Link
            href="/assinaturas/timeline"
            className="nao-imprimir inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color: BLUE }}
          >
            <ArrowLeft size={14} />
            Voltar à timeline
          </Link>
          <button
            onClick={carregar}
            disabled={loading}
            className="nao-imprimir flex items-center gap-2 px-3 py-1.5 rounded text-sm"
            style={{ background: GOLD, color: NAVY }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {/* Header solicitação */}
        <div
          className="rounded-lg p-5"
          style={{ background: NAVY, color: "#F9FAFB" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={18} style={{ color: GOLD }} />
            <h1 className="text-xl font-bold">
              Solicitação #{id} {sol?.template ? `· ${sol.template}` : ""}
            </h1>
          </div>
          {sol && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mt-3">
              <div>
                <div className="text-xs opacity-70">Paciente</div>
                <div className="font-semibold">
                  {sol.paciente_nome || "—"}{" "}
                  {sol.paciente_id ? `(id ${sol.paciente_id})` : ""}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70">Status</div>
                <div className="font-semibold">{sol.status}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Provedor</div>
                <div className="font-semibold uppercase">
                  {sol.provedor_codigo}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70">Envelope ZapSign</div>
                <div className="font-mono text-xs break-all">
                  {sol.provedor_envelope_id || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70">External ID</div>
                <div className="font-mono text-xs break-all">
                  {sol.zapsign_external_id || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70">Concluído em</div>
                <div>{formatarData(sol.concluido_em)}</div>
              </div>
            </div>
          )}
        </div>

        {erro && (
          <div
            className="rounded p-3 text-sm"
            style={{ background: "#FEE2E2", color: RED }}
          >
            <strong>Erro:</strong> {erro}
          </div>
        )}

        {reenvioMsg && (
          <div
            className="rounded p-3 text-sm nao-imprimir"
            style={{
              background: reenvioMsg.ok ? "#DCFCE7" : "#FEE2E2",
              color: reenvioMsg.ok ? GREEN : RED,
            }}
            data-testid="reenvio-feedback"
          >
            <strong>{reenvioMsg.ok ? "OK:" : "Erro:"}</strong> {reenvioMsg.texto}
          </div>
        )}

        {/* Signatários */}
        <section className="bg-white border rounded p-4">
          <h2
            className="text-base font-bold mb-3 flex items-center gap-2"
            style={{ color: NAVY }}
          >
            <FileSignature size={16} style={{ color: GOLD }} />
            Signatários ({data?.signatarios.length || 0})
          </h2>
          {data?.signatarios.length === 0 && (
            <div className="text-sm" style={{ color: ZINC }}>
              Nenhum signatário registrado.
            </div>
          )}
          <div className="space-y-2">
            {data?.signatarios.map((s, i) => {
              const cfg = SIG_STATUS[s.status] || SIG_STATUS["PENDENTE"]!;
              const Icon = cfg.icon;
              // Task #35 — botao de reenvio so aparece pra PENDENTE/ENVIADO ha mais de 24h
              const criadoEmSol = data?.solicitacao?.criado_em
                ? new Date(data.solicitacao.criado_em).getTime()
                : null;
              const horasDesde = criadoEmSol
                ? (Date.now() - criadoEmSol) / (1000 * 60 * 60)
                : 0;
              const podeReenviar =
                (s.status === "PENDENTE" || s.status === "ENVIADO") && horasDesde >= 24;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between border rounded p-3"
                >
                  <div>
                    <div className="font-semibold" style={{ color: NAVY }}>
                      {s.ordem}. {s.nome}
                    </div>
                    <div className="text-xs" style={{ color: ZINC }}>
                      {s.papel} {s.email ? `· ${s.email}` : ""}
                    </div>
                    {s.assinado_em && (
                      <div className="text-xs mt-1" style={{ color: GREEN }}>
                        Assinado em {formatarData(s.assinado_em)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {podeReenviar && (
                      <button
                        onClick={() => reenviarLembrete(s.id)}
                        disabled={reenviandoId === s.id}
                        className="nao-imprimir inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border"
                        style={{ borderColor: GOLD, color: NAVY, background: "#FFFBEB" }}
                        data-testid={`btn-reenviar-${s.id}`}
                      >
                        <RefreshCw
                          size={11}
                          className={reenviandoId === s.id ? "animate-spin" : ""}
                        />
                        {reenviandoId === s.id ? "Reenviando…" : "Reenviar lembrete WhatsApp"}
                      </button>
                    )}
                    {s.link_assinatura && s.status !== "ASSINADO" && (
                      <a
                        href={s.link_assinatura}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nao-imprimir text-xs font-semibold"
                        style={{ color: BLUE }}
                      >
                        Abrir link
                      </a>
                    )}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background:
                          cfg.color === GREEN
                            ? "#DCFCE7"
                            : cfg.color === RED
                              ? "#FEE2E2"
                              : "#F4F4F5",
                        color: cfg.color,
                      }}
                    >
                      <Icon size={12} />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Auditoria — manifesto SHA-256 */}
        <section className="bg-white border rounded p-4">
          <h2
            className="text-base font-bold mb-3 flex items-center gap-2"
            style={{ color: NAVY }}
          >
            <Hash size={16} style={{ color: GOLD }} />
            Auditoria — manifesto SHA-256 ({data?.auditoria.length || 0})
          </h2>
          {data?.auditoria.length === 0 && (
            <div
              className="text-sm rounded p-3"
              style={{ background: "#FEF9E7", color: AMBER }}
            >
              <AlertTriangle size={14} className="inline mr-1" />
              Nenhum evento de auditoria gravado ainda. O manifesto é criado
              automaticamente quando o webhook ZapSign recebe{" "}
              <code>doc_signed</code>.
            </div>
          )}
          <div className="space-y-3">
            {data?.auditoria.map((a, i) => (
              <div
                key={i}
                className="border rounded p-3"
                style={{ borderLeft: `3px solid ${GOLD}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold" style={{ color: NAVY }}>
                      {a.signer_name}{" "}
                      <span
                        className="text-xs font-normal"
                        style={{ color: ZINC }}
                      >
                        · {a.signer_papel} · CPF {mascararCpf(a.signer_cpf)}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: ZINC }}>
                      {formatarData(a.timestamp_utc)}
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                    style={{ background: "#DCFCE7", color: GREEN }}
                  >
                    <KeyRound size={10} />
                    {AUTH_METHOD_LABELS[a.auth_method] || a.auth_method}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-semibold" style={{ color: NAVY }}>
                      Hash original:
                    </span>{" "}
                    <span className="font-mono break-all" style={{ color: ZINC }}>
                      {a.document_hash_sha256}
                    </span>
                  </div>
                  {a.document_hash_assinado && (
                    <div>
                      <span className="font-semibold" style={{ color: NAVY }}>
                        Hash assinado:
                      </span>{" "}
                      <span
                        className="font-mono break-all"
                        style={{ color: ZINC }}
                      >
                        {a.document_hash_assinado}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold" style={{ color: NAVY }}>
                      <MapPin size={10} className="inline" /> IP:
                    </span>{" "}
                    <span className="font-mono" style={{ color: ZINC }}>
                      {a.signer_ip}
                    </span>
                    {a.signer_geo && (
                      <span style={{ color: ZINC }}>
                        {" "}
                        · {a.signer_geo.city || ""} {a.signer_geo.country || ""}
                      </span>
                    )}
                  </div>
                  {a.icp_brasil_serial && (
                    <div>
                      <span className="font-semibold" style={{ color: NAVY }}>
                        ICP-Brasil:
                      </span>{" "}
                      <span className="font-mono" style={{ color: ZINC }}>
                        {a.icp_brasil_serial} ({a.icp_brasil_ac})
                      </span>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <a
                      href={a.validation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nao-imprimir font-semibold"
                      style={{ color: BLUE }}
                    >
                      Verificar no ZapSign →
                    </a>
                    {a.pdf_storage_key && (
                      <span className="ml-3" style={{ color: ZINC }}>
                        <Download size={10} className="inline" /> {a.pdf_storage_key}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Notificações */}
        {data && data.notificacoes.length > 0 && (
          <section className="bg-white border rounded p-4">
            <h2
              className="text-base font-bold mb-3"
              style={{ color: NAVY }}
            >
              Notificações ({data.notificacoes.length})
            </h2>
            <div className="space-y-1 text-xs">
              {data.notificacoes.map((n: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-t py-1"
                >
                  <span>
                    <strong>{n.canal}</strong> · {n.momento} ·{" "}
                    <span style={{ color: ZINC }}>{n.destinatario}</span>
                  </span>
                  <span
                    style={{
                      color: n.status === "ENVIADO" ? GREEN : AMBER,
                    }}
                  >
                    {n.status} ({n.tentativas}x){" "}
                    {n.enviado_em ? `· ${formatarData(n.enviado_em)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
