import { Fragment, useCallback, useEffect, useState } from "react";
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import {
  Building2, Power, PowerOff, RefreshCw, ShieldAlert,
  Trash2, Undo2, Download, Clock, Mail, ChevronDown, ChevronRight, Send,
  Phone, AlertTriangle, X, ShieldCheck, FileCheck2, Loader2,
} from "lucide-react";

type PreviaDestinatarios = {
  unidadeId: number;
  unidadeNome: string;
  emails: string[];
  telefones: string[];
  // Task #268 — versao enriquecida: cada destinatario carrega
  // `ultimas_falhas` (quantas das ultimas `tentativasJanelaFalhas`
  // tentativas de aviso por canal acabaram em falha pra ele).
  // Opcionais pra retrocompat com payloads antigos.
  emailsDetalhe?: Array<{ valor: string; ultimas_falhas: number }>;
  telefonesDetalhe?: Array<{ valor: string; ultimas_falhas: number }>;
  tentativasJanelaFalhas?: number;
  whatsappVazio: boolean;
  // Task #178: quando emailVazio === true, NENHUM responsavel da clinica
  // tem email cadastrado — combinado com whatsappVazio significa que
  // ninguem vai receber o aviso de suspensao.
  emailVazio: boolean;
  // Task #182 — pacientes com consulta na janela que receberao aviso
  pacientesAvisados: number;
  pacientesSemContato: number;
  janelaDias: number;
  janelaDiasMin: number;
  janelaDiasMax: number;
};

type RegistroAviso = {
  tipo:
    | "SUSPENSAO"
    | "REATIVACAO"
    | "REENVIO_SUSPENSAO"
    | "REENVIO_REATIVACAO"
    | "SUSPENSAO_PACIENTES"
    | "REENVIO_SUSPENSAO_PACIENTES";
  // Default "EMAIL" pra registros gravados antes da Task #176.
  canal?: "EMAIL" | "WHATSAPP";
  destinatarios: string[];
  enviados: number;
  falhas: number;
  erro: string | null;
  em: string;
  executado_por_usuario_id: number;
  via_hsm?: number;
  via_texto_livre?: number;
  detalhes_whatsapp?: Array<{
    destinatario: string;
    sucesso: boolean;
    viaHsm: boolean;
    viaTextoLivre: boolean;
    dentroJanela24h?: boolean;
    erro: string | null;
  }>;
  detalhes?: Record<string, unknown>;
  detalhes_pacientes?: Array<{
    pacienteId: number;
    pacienteNome: string;
    emailTentado: boolean;
    emailSucesso: boolean;
    whatsappTentado: boolean;
    whatsappSucesso: boolean;
    semContato: boolean;
  }>;
};

type EventoComAvisos = {
  id: number;
  acao: "SUSPENDER" | "REASSUMIR";
  criado_em: string;
  motivo: string | null;
  executor_nome: string | null;
  avisos: RegistroAviso[];
};

type Clinica = {
  id: number;
  nome: string;
  cidade: string | null;
  estado: string | null;
  cnpj: string | null;
  tipo: string;
  ativa: boolean;
  status: "ATIVO" | "SUSPENSO" | "EXCLUIDO_PENDENTE" | "EXCLUIDO";
  suspenso_em: string | null;
  suspenso_por_usuario_id: number | null;
  suspensao_motivo: string | null;
  suspenso_por_nome: string | null;
  exclusao_carencia_ate: string | null;
  lgpd_export_url?: string | null;
  lgpd_export_em?: string | null;
  lgpd_export_sha256?: string | null;
  lgpd_export_drive_file_id?: string | null;
  lgpd_export_tamanho_bytes?: number | string | null;
  lgpd_export_nome_arquivo?: string | null;
};

type VerificacaoIntegridade =
  | { status: "verificando" }
  | {
      status: "ok";
      sha256Calculado: string;
      sha256Esperado: string;
      tamanhoBytes: number;
    }
  | {
      status: "divergente";
      sha256Calculado: string;
      sha256Esperado: string;
      tamanhoBytes: number;
    }
  | { status: "erro"; mensagem: string };

function formatarBytes(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

async function calcularSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function diasAteCarencia(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

const STATUS_COR: Record<string, string> = {
  ATIVO: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  SUSPENSO: "bg-red-500/20 text-red-300 border-red-500/40",
  EXCLUIDO_PENDENTE: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  EXCLUIDO: "bg-zinc-700/50 text-zinc-400 border-zinc-600",
};

export default function PlataformaClinicas() {
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<number | null>(null);
  const { runWithStepUp, openStepUp, modal: stepUpModal } = usePlatformStepUp();
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [avisosPorClinica, setAvisosPorClinica] = useState<
    Record<number, EventoComAvisos[] | "loading" | "erro">
  >({});
  const [reenviandoEventoId, setReenviandoEventoId] = useState<number | null>(null);
  const [reenviandoPacientesEventoId, setReenviandoPacientesEventoId] = useState<number | null>(null);
  const [previaSuspensao, setPreviaSuspensao] = useState<{
    clinica: Clinica;
    previa: PreviaDestinatarios;
    acao: "suspender" | "reativar" | "agendar_exclusao";
  } | null>(null);
  const [carregandoPreviaId, setCarregandoPreviaId] = useState<number | null>(null);
  const [verificacoes, setVerificacoes] = useState<Record<number, VerificacaoIntegridade>>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    const r = await runWithStepUp(() =>
      apiFetch("/api/plataforma/clinicas", { credentials: "include" }),
    );
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErro(j.error ?? `Falha ao carregar (${r.status})`);
      setLoading(false);
      return;
    }
    setClinicas(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  // Task #259 — deeplink ?gerar_export=<id> vindo do email VENCIDO_SEM_EXPORT
  // do worker avisoVencimentoCarenciaLgpd. Apos a lista carregar, rola ate
  // a linha da clinica e abre direto o prompt de export LGPD, economizando
  // cliques no momento critico em que o exclusaoCarenciaExecutor esta
  // bloqueado esperando o lgpd_export_url ser populado.
  const [autoExportConsumido, setAutoExportConsumido] = useState(false);
  useEffect(() => {
    if (loading || autoExportConsumido) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("gerar_export");
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return;
    const alvo = clinicas.find(c => c.id === id);
    if (!alvo) return;
    setAutoExportConsumido(true);
    // Limpa o param da URL pra nao re-disparar em recargas.
    params.delete("gerar_export");
    const novaQuery = params.toString();
    const novaUrl = window.location.pathname + (novaQuery ? `?${novaQuery}` : "");
    window.history.replaceState({}, "", novaUrl);
    // Rola ate a linha (se existir) e abre o prompt de export.
    setTimeout(() => {
      const linha = document.getElementById(`clinica-${id}`);
      if (linha) linha.scrollIntoView({ behavior: "smooth", block: "center" });
      void exportarLgpd(alvo);
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, clinicas, autoExportConsumido]);

  async function executar(c: Clinica, acao: "suspender" | "reativar" | "agendar_exclusao") {
    // SUSPENDER, REATIVAR e AGENDAR EXCLUSAO abrem modal com previa de
    // destinatarios antes de pedir motivo. Task #138 cobriu suspensao;
    // Task #179 estendeu pra reativacao porque os mesmos responsaveis
    // recebem aviso e a lista pode ter mudado; Task #195 estendeu pra
    // agendamento de exclusao (acao mais destrutiva — irreversivel apos
    // a janela LGPD de 30 dias) pra mostrar pra QUEM o aviso vai chegar.
    setCarregandoPreviaId(c.id);
    try {
      const r = await runWithStepUp(() =>
        apiFetch(`/api/plataforma/clinicas/${c.id}/destinatarios-aviso`, {
          credentials: "include",
        }),
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(`Falha ao carregar previa de destinatarios: ${j.error ?? r.statusText}`);
        return;
      }
      const previa = (await r.json()) as PreviaDestinatarios;
      setPreviaSuspensao({ clinica: c, previa, acao });
    } finally {
      setCarregandoPreviaId(null);
    }
  }

  async function confirmarAcaoComPrevia(motivo: string, janelaDias?: number) {
    if (!previaSuspensao) return;
    const c = previaSuspensao.clinica;
    const acao = previaSuspensao.acao;
    setAcaoId(c.id);
    // Task #195: agendar exclusao usa endpoint dedicado e exige
    // confirmacao dupla (nome da clinica). Os outros casos
    // (suspender/reativar) usam o endpoint /:acao tradicional.
    // Task #182: propaga janelaDias overridada pra suspender (reativar
    // e agendar_exclusao nao usam).
    const url =
      acao === "agendar_exclusao"
        ? `/api/plataforma/clinicas/${c.id}/exclusao/agendar`
        : `/api/plataforma/clinicas/${c.id}/${acao}`;
    const body: Record<string, unknown> =
      acao === "agendar_exclusao"
        ? { motivo: motivo.trim(), confirmacao: c.nome }
        : { motivo: motivo.trim() };
    if (acao === "suspender" && janelaDias !== undefined) {
      body.janelaDias = janelaDias;
    }
    const r = await runWithStepUp(() =>
      apiFetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    setAcaoId(null);
    setPreviaSuspensao(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    if (acao === "agendar_exclusao") {
      const j = await r.json().catch(() => ({}));
      alert(
        `Exclusao agendada.\n\nCarencia ate: ${
          j.carencia_ate ? new Date(j.carencia_ate).toLocaleString("pt-BR") : "—"
        }\n\nLEMBRE-SE de gerar o export LGPD antes do vencimento — sem ele o worker recusa executar.`,
      );
    }
    await carregar();
  }

  async function cancelarExclusao(c: Clinica) {
    const motivo = window.prompt(
      `CANCELAR exclusao agendada de "${c.nome}".\nMotivo (>= 8 chars):`,
    );
    if (!motivo || motivo.trim().length < 8) {
      if (motivo !== null) alert("Motivo precisa ter pelo menos 8 caracteres.");
      return;
    }
    setAcaoId(c.id);
    const r = await runWithStepUp(() =>
      apiFetch(`/api/plataforma/clinicas/${c.id}/exclusao/cancelar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      }),
    );
    setAcaoId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    alert("Exclusao cancelada. A clinica voltou para SUSPENSO — use Reativar se quiser religar.");
    await carregar();
  }

  const carregarAvisos = useCallback(async (clinicaId: number) => {
    setAvisosPorClinica(prev => ({ ...prev, [clinicaId]: "loading" }));
    const r = await apiFetch(`/api/plataforma/clinicas/${clinicaId}/avisos`, {
      credentials: "include",
    });
    if (!r.ok) {
      setAvisosPorClinica(prev => ({ ...prev, [clinicaId]: "erro" }));
      return;
    }
    const dados = (await r.json()) as EventoComAvisos[];
    setAvisosPorClinica(prev => ({ ...prev, [clinicaId]: dados }));
  }, []);

  async function alternarExpansao(c: Clinica) {
    if (expandidoId === c.id) {
      setExpandidoId(null);
      return;
    }
    setExpandidoId(c.id);
    if (!avisosPorClinica[c.id] || avisosPorClinica[c.id] === "erro") {
      await carregarAvisos(c.id);
    }
  }

  async function reenviarAvisosPacientes(clinicaId: number, eventoId: number) {
    if (!window.confirm(
      "Reenviar aviso de remarcacao pra pacientes deste evento de suspensao?\n\n" +
      "Sao avisados pacientes com consulta nos proximos 14 dias que AINDA NAO\n" +
      "receberam o aviso (email ou whatsapp) com sucesso em tentativas anteriores.\n" +
      "Pacientes ja entregues sao automaticamente pulados.",
    )) return;
    setReenviandoPacientesEventoId(eventoId);
    const r = await apiFetch(
      `/api/plataforma/auditoria/${eventoId}/reenviar-avisos-pacientes`,
      { method: "POST", credentials: "include" },
    );
    setReenviandoPacientesEventoId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    const j = await r.json();
    const p = j.pacientes ?? {};
    alert(
      `Reenvio aos pacientes concluido.\n\n` +
      `Pulados (ja entregues): ${j.pulados_por_idempotencia ?? 0}\n` +
      `Pacientes avisados: ${p.pacientesAvisados ?? 0}\n` +
      `Email enviados: ${p.emailEnviados ?? 0} (falhas: ${p.emailFalhas ?? 0})\n` +
      `WhatsApp enviados: ${p.whatsappEnviados ?? 0} (falhas: ${p.whatsappFalhas ?? 0})\n` +
      `Sem contato: ${p.pacientesSemContato ?? 0}` +
      (j.erro ? `\n\nErro geral: ${j.erro}` : ""),
    );
    await carregarAvisos(clinicaId);
  }

  async function reenviarAvisos(clinicaId: number, eventoId: number) {
    if (!window.confirm(
      "Reenviar emails de aviso pra todos os destinatarios deste evento?\n" +
      "O resultado ficara registrado no historico (auditoria_kill_switch).",
    )) return;
    setReenviandoEventoId(eventoId);
    const r = await apiFetch(
      `/api/plataforma/auditoria/${eventoId}/reenviar-avisos`,
      { method: "POST", credentials: "include" },
    );
    setReenviandoEventoId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    const j = await r.json();
    alert(
      `Reenvio concluido.\n\n` +
      `Destinatarios: ${j.email?.destinatarios?.length ?? 0}\n` +
      `Enviados: ${j.email?.enviados ?? 0}\n` +
      `Falhas: ${j.email?.falhas ?? 0}` +
      (j.erro ? `\n\nErro geral: ${j.erro}` : ""),
    );
    await carregarAvisos(clinicaId);
  }

  async function exportarLgpd(c: Clinica) {
    const motivo = window.prompt(
      `EXPORTAR LGPD da clinica "${c.nome}".\n\n` +
      `Vai gerar um snapshot JSON (data:URL) com dados da unidade + auditoria.\n` +
      `Motivo (>= 8 chars):`,
    );
    if (!motivo || motivo.trim().length < 8) {
      if (motivo !== null) alert("Motivo precisa ter pelo menos 8 caracteres.");
      return;
    }
    setAcaoId(c.id);
    const r = await runWithStepUp(() =>
      apiFetch(`/api/plataforma/clinicas/${c.id}/exclusao/exportar-lgpd`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      }),
    );
    setAcaoId(null);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro: ${j.error ?? r.statusText}`);
      return;
    }
    const j = await r.json();
    if (j.lgpd_export_url) {
      const a = document.createElement("a");
      a.href = j.lgpd_export_url;
      a.download = `lgpd-export-clinica-${c.id}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    await carregar();
  }

  // Task #261 — baixa o arquivo do Drive via proxy backend, recalcula
  // SHA-256 no navegador (Web Crypto) e compara com o hash gravado no DB.
  // Prova juridica de integridade: se divergir, o arquivo no Drive foi
  // adulterado depois do upload (ou alguem mexeu no DB).
  async function verificarIntegridade(c: Clinica) {
    if (!c.lgpd_export_sha256 || !c.lgpd_export_drive_file_id) return;
    setVerificacoes(prev => ({ ...prev, [c.id]: { status: "verificando" } }));
    try {
      const r = await apiFetch(
        `/api/plataforma/clinicas/${c.id}/exclusao/lgpd-export-arquivo`,
        { credentials: "include" },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as { error?: string }));
        setVerificacoes(prev => ({
          ...prev,
          [c.id]: { status: "erro", mensagem: j.error ?? r.statusText },
        }));
        return;
      }
      const buffer = await r.arrayBuffer();
      const sha256Calculado = await calcularSha256Hex(buffer);
      const sha256Esperado = c.lgpd_export_sha256.toLowerCase();
      const tamanhoBytes = buffer.byteLength;
      const igual = sha256Calculado === sha256Esperado;
      setVerificacoes(prev => ({
        ...prev,
        [c.id]: {
          status: igual ? "ok" : "divergente",
          sha256Calculado,
          sha256Esperado,
          tamanhoBytes,
        },
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setVerificacoes(prev => ({
        ...prev,
        [c.id]: { status: "erro", mensagem: msg },
      }));
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
              <Building2 size={28} /> Plataforma · Clinicas
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Suspende ou reativa o acesso de uma clinica inteira. Acao kill-switch
              registrada com IP/UA em <code>auditoria_kill_switch</code>.
            </p>
          </div>
          <button onClick={() => void carregar()} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm flex items-center gap-2">
            <RefreshCw size={16} /> Recarregar
          </button>
        </header>

        {erro && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/40 rounded text-red-300 flex items-start gap-2">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Acesso negado / falha</div>
              <div className="text-sm">{erro}</div>
              <div className="text-xs text-red-400/80 mt-1">
                Esta tela exige perfil <code>platform_owner</code> e 2FA recente (&lt;8h).
              </div>
            </div>
          </div>
        )}

        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-zinc-300">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="text-left px-4 py-3">Clinica</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Suspensao</th>
                <th className="text-left px-4 py-3">Avisos</th>
                <th className="text-center px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Carregando...</td></tr>}
              {!loading && clinicas.length === 0 && !erro && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Nenhuma clinica encontrada.</td></tr>
              )}
              {!loading && clinicas.map(c => {
                const cor = STATUS_COR[c.status] ?? STATUS_COR.ATIVO;
                const suspendido = c.status === "SUSPENSO";
                const pendenteExclusao = c.status === "EXCLUIDO_PENDENTE";
                const excluido = c.status === "EXCLUIDO";
                const podeAlterar = c.tipo !== "genesis_seed";
                const dias = diasAteCarencia(c.exclusao_carencia_ate);
                const desabilitado = acaoId === c.id;
                const expandido = expandidoId === c.id;
                const avisosState = avisosPorClinica[c.id];
                const totalEnviados = Array.isArray(avisosState)
                  ? avisosState.reduce(
                      (acc, ev) => acc + ev.avisos.reduce((a, av) => a + av.enviados, 0),
                      0,
                    )
                  : null;
                const totalFalhas = Array.isArray(avisosState)
                  ? avisosState.reduce(
                      (acc, ev) => acc + ev.avisos.reduce((a, av) => a + av.falhas, 0),
                      0,
                    )
                  : null;
                return (
                  <Fragment key={c.id}>
                  <tr id={`clinica-${c.id}`} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-2 py-3 text-center align-top">
                      <button
                        onClick={() => void alternarExpansao(c)}
                        className="text-zinc-500 hover:text-zinc-200"
                        title="Ver historico de avisos enviados"
                      >
                        {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-100">{c.nome}</div>
                      <div className="text-xs text-zinc-500">
                        id {c.id} · {c.cidade ?? "—"}/{c.estado ?? "—"} · {c.tipo}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-mono border ${cor}`}>
                        {c.status}
                      </span>
                      {pendenteExclusao && dias !== null && (
                        <div className="mt-1 text-xs text-amber-300 flex items-center gap-1">
                          <Clock size={10} />
                          {dias > 0 ? `faltam ${dias}d` : "vencido — aguardando worker"}
                        </div>
                      )}
                      {pendenteExclusao && !c.lgpd_export_url && (
                        <div className="mt-1 text-xs text-red-400">⚠ sem export LGPD</div>
                      )}
                      {pendenteExclusao && c.lgpd_export_url && (
                        <div className="mt-1 text-xs text-emerald-400">✓ export LGPD pronto</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {(suspendido || pendenteExclusao) ? (
                        <>
                          <div>em {c.suspenso_em ? new Date(c.suspenso_em).toLocaleString("pt-BR") : "—"}</div>
                          <div>por {c.suspenso_por_nome ?? `usuario ${c.suspenso_por_usuario_id ?? "?"}`}</div>
                          <div className="italic mt-1">"{c.suspensao_motivo ?? "—"}"</div>
                          {pendenteExclusao && c.exclusao_carencia_ate && (
                            <div className="mt-1 text-amber-300">
                              carencia ate {new Date(c.exclusao_carencia_ate).toLocaleString("pt-BR")}
                            </div>
                          )}
                        </>
                      ) : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 align-top">
                      {avisosState === "loading" && <span className="text-zinc-500">carregando...</span>}
                      {avisosState === "erro" && <span className="text-red-400">falha</span>}
                      {Array.isArray(avisosState) && avisosState.length === 0 && (
                        <span className="text-zinc-600">—</span>
                      )}
                      {Array.isArray(avisosState) && avisosState.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Mail size={12} className="text-zinc-500" />
                          <span className="text-emerald-300">{totalEnviados} enviados</span>
                          {totalFalhas !== null && totalFalhas > 0 && (
                            <span className="text-red-300">· {totalFalhas} falhas</span>
                          )}
                        </div>
                      )}
                      {!avisosState && (
                        <span className="text-zinc-600 italic">expanda pra ver</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!podeAlterar ? (
                        <span className="text-xs text-zinc-500 italic">Genesis (protegido)</span>
                      ) : excluido ? (
                        <span className="text-xs text-zinc-500 italic">Excluida</span>
                      ) : pendenteExclusao ? (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            disabled={desabilitado}
                            onClick={() => void cancelarExclusao(c)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                          >
                            <Undo2 size={12} /> Cancelar exclusao
                          </button>
                          {/* Task #259 — quando a clinica esta EXCLUIDO_PENDENTE
                              SEM lgpd_export_url, destaca o botao em vermelho
                              porque o exclusaoCarenciaExecutor esta bloqueado
                              esperando o export ser gerado. Eh tambem o alvo
                              do deeplink ?gerar_export=<id> que vem do email
                              VENCIDO_SEM_EXPORT. */}
                          {!c.lgpd_export_url ? (
                            <button
                              disabled={desabilitado}
                              onClick={() => void exportarLgpd(c)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-red-500/30 text-red-200 border border-red-500/60 hover:bg-red-500/50 disabled:opacity-50 font-semibold animate-pulse"
                              title="Gerar export LGPD agora — necessario antes do worker executar a exclusao"
                            >
                              <Download size={12} /> Gerar export LGPD agora
                            </button>
                          ) : (
                            <button
                              disabled={desabilitado}
                              onClick={() => void exportarLgpd(c)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
                            >
                              <Download size={12} /> Re-exportar LGPD
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {suspendido ? (
                            <button
                              disabled={desabilitado || carregandoPreviaId === c.id}
                              onClick={() => void executar(c, "reativar")}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                            >
                              <Power size={12} />
                              {carregandoPreviaId === c.id ? "carregando previa..." : "Reativar"}
                            </button>
                          ) : (
                            <button
                              disabled={desabilitado || carregandoPreviaId === c.id}
                              onClick={() => void executar(c, "suspender")}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                            >
                              <PowerOff size={12} />
                              {carregandoPreviaId === c.id ? "carregando previa..." : "Suspender"}
                            </button>
                          )}
                          <button
                            disabled={desabilitado}
                            onClick={() => void exportarLgpd(c)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
                          >
                            <Download size={12} /> Export LGPD
                          </button>
                          <button
                            disabled={desabilitado || carregandoPreviaId === c.id}
                            onClick={() => void executar(c, "agendar_exclusao")}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-red-700/30 text-red-200 hover:bg-red-700/50 disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            {carregandoPreviaId === c.id ? "carregando previa..." : "Agendar exclusao"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandido && (
                    <tr className="border-t border-zinc-800 bg-zinc-950/40">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="text-xs text-zinc-300">
                          {/* Task #261 — painel de integridade do export LGPD */}
                          <div className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
                            <FileCheck2 size={14} /> Export LGPD (prova juridica de integridade)
                          </div>
                          {(() => {
                            const v = verificacoes[c.id];
                            const temExport = !!c.lgpd_export_sha256 && !!c.lgpd_export_drive_file_id;
                            return (
                              <div className="mb-4 border border-zinc-800 rounded p-3 bg-zinc-900/40 space-y-2">
                                {!c.lgpd_export_url && (
                                  <div className="text-zinc-500 italic">
                                    Nenhum export LGPD gerado pra esta clinica ainda.
                                  </div>
                                )}
                                {c.lgpd_export_url && !temExport && (
                                  <div className="text-amber-300">
                                    Export antigo (sem hash gravado) — gere novamente pra ter prova de integridade.
                                  </div>
                                )}
                                {c.lgpd_export_url && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                    <div className="md:col-span-2">
                                      <span className="text-zinc-500">Nome do arquivo:</span>{" "}
                                      <code className="text-zinc-100 break-all">
                                        {c.lgpd_export_nome_arquivo ?? "—"}
                                      </code>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Gerado em:</span>{" "}
                                      <span className="text-zinc-200">
                                        {c.lgpd_export_em
                                          ? new Date(c.lgpd_export_em).toLocaleString("pt-BR")
                                          : "—"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500">Tamanho:</span>{" "}
                                      <span className="text-zinc-200">{formatarBytes(c.lgpd_export_tamanho_bytes)}</span>
                                    </div>
                                    <div className="md:col-span-2">
                                      <span className="text-zinc-500">SHA-256 gravado:</span>{" "}
                                      <code className="text-emerald-300 break-all">
                                        {c.lgpd_export_sha256 ?? "—"}
                                      </code>
                                    </div>
                                    <div className="md:col-span-2">
                                      <span className="text-zinc-500">Arquivo no Drive:</span>{" "}
                                      <a
                                        href={c.lgpd_export_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-cyan-300 hover:underline break-all"
                                      >
                                        abrir no Google Drive ↗
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {temExport && (
                                  <div className="flex items-center gap-2 pt-2">
                                    <button
                                      disabled={v?.status === "verificando"}
                                      onClick={() => void verificarIntegridade(c)}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded text-[11px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                                      title="Baixa o arquivo do Drive, recalcula SHA-256 no navegador e compara com o hash gravado"
                                    >
                                      {v?.status === "verificando" ? (
                                        <Loader2 size={11} className="animate-spin" />
                                      ) : (
                                        <ShieldCheck size={11} />
                                      )}
                                      {v?.status === "verificando" ? "Verificando..." : "Verificar integridade"}
                                    </button>
                                  </div>
                                )}
                                {v?.status === "ok" && (
                                  <div className="mt-2 p-2 border border-emerald-500/40 bg-emerald-500/10 rounded text-emerald-300 flex items-start gap-2">
                                    <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                                    <div>
                                      <div className="font-semibold">Integridade OK ✓</div>
                                      <div className="text-[11px] opacity-90">
                                        SHA-256 do arquivo baixado bate com o hash gravado no banco.
                                        Tamanho: {formatarBytes(v.tamanhoBytes)}.
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {v?.status === "divergente" && (
                                  <div className="mt-2 p-3 border-2 border-red-500 bg-red-500/15 rounded text-red-200 flex items-start gap-2">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                      <div className="font-bold text-red-100">⚠ HASH DIVERGENTE — arquivo possivelmente adulterado</div>
                                      <div className="text-[11px]">
                                        O SHA-256 calculado a partir do arquivo no Drive NAO bate com o hash
                                        gravado no banco no momento do export. Investigue antes de usar este
                                        arquivo como prova juridica.
                                      </div>
                                      <div className="text-[11px]">
                                        <div><span className="text-red-300">Esperado:</span> <code>{v.sha256Esperado}</code></div>
                                        <div><span className="text-red-300">Calculado:</span> <code>{v.sha256Calculado}</code></div>
                                        <div><span className="text-red-300">Tamanho baixado:</span> {formatarBytes(v.tamanhoBytes)}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {v?.status === "erro" && (
                                  <div className="mt-2 p-2 border border-red-500/40 bg-red-500/10 rounded text-red-300 flex items-start gap-2">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                    <div>
                                      <div className="font-semibold">Falha ao verificar</div>
                                      <div className="text-[11px]">{v.mensagem}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <div className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
                            <Mail size={14} /> Historico de avisos enviados (eventos SUSPENDER / REASSUMIR)
                          </div>
                          {avisosState === "loading" && <div className="text-zinc-500">Carregando...</div>}
                          {avisosState === "erro" && (
                            <div className="text-red-400">Falha ao carregar historico de avisos.</div>
                          )}
                          {Array.isArray(avisosState) && avisosState.length === 0 && (
                            <div className="text-zinc-500 italic">
                              Sem eventos de suspensao/reativacao registrados pra esta clinica.
                            </div>
                          )}
                          {Array.isArray(avisosState) && avisosState.length > 0 && (
                            <div className="space-y-3">
                              {avisosState.map(ev => {
                                const podeReenviar = ev.acao === "SUSPENDER" || ev.acao === "REASSUMIR";
                                const corAcao = ev.acao === "SUSPENDER"
                                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
                                return (
                                  <div key={ev.id} className="border border-zinc-800 rounded p-3 bg-zinc-900/40">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${corAcao}`}>
                                          {ev.acao}
                                        </span>
                                        <span className="text-zinc-400">
                                          {new Date(ev.criado_em).toLocaleString("pt-BR")}
                                        </span>
                                        <span className="text-zinc-500">
                                          por {ev.executor_nome ?? "—"}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {podeReenviar && (
                                          <button
                                            disabled={reenviandoEventoId === ev.id}
                                            onClick={() => void reenviarAvisos(c.id, ev.id)}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50"
                                            title="Reenviar emails de aviso pra responsaveis (e-mails da unidade)"
                                          >
                                            <Send size={11} />
                                            {reenviandoEventoId === ev.id ? "reenviando..." : "Reenviar avisos"}
                                          </button>
                                        )}
                                        {ev.acao === "SUSPENDER" && (
                                          <button
                                            disabled={reenviandoPacientesEventoId === ev.id}
                                            onClick={() => void reenviarAvisosPacientes(c.id, ev.id)}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50"
                                            title="Reenviar aviso de remarcacao a pacientes que ainda nao receberam (idempotente)"
                                          >
                                            <Send size={11} />
                                            {reenviandoPacientesEventoId === ev.id ? "reenviando..." : "Reenviar a pacientes"}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {ev.motivo && (
                                      <div className="italic text-zinc-400 mb-2">"{ev.motivo}"</div>
                                    )}
                                    {ev.avisos.length === 0 ? (
                                      <div className="text-zinc-600 italic">
                                        Nenhum aviso registrado neste evento (anterior ao Task #134
                                        ou envio nao executado).
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        {ev.avisos.map((av, i) => {
                                          const canal = av.canal ?? "EMAIL";
                                          const isWhatsapp = canal === "WHATSAPP";
                                          const viaHsm = av.via_hsm ?? 0;
                                          const viaTextoLivre = av.via_texto_livre ?? 0;
                                          const tudoTextoLivreBruto =
                                            isWhatsapp &&
                                            av.enviados > 0 &&
                                            viaHsm === 0 &&
                                            viaTextoLivre === av.enviados;
                                          // Task #205 — suprime alerta amarelo
                                          // quando TODOS os destinatarios tinham
                                          // a janela de 24h aberta no momento
                                          // do envio (entrega de texto livre
                                          // garantida pelo provedor).
                                          const detalhesTL = av.detalhes_whatsapp ?? [];
                                          const todosDentroJanela =
                                            detalhesTL.length > 0 &&
                                            detalhesTL.every(
                                              (d) =>
                                                d.dentroJanela24h === true ||
                                                (d.viaHsm && d.sucesso),
                                            );
                                          const tudoTextoLivre =
                                            tudoTextoLivreBruto && !todosDentroJanela;
                                          return (
                                          <div key={i} className="border-l-2 border-zinc-700 pl-2 text-[11px]">
                                            <div className="flex flex-wrap gap-2 items-center">
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                                isWhatsapp
                                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                                                  : "bg-blue-500/10 text-blue-300 border-blue-500/40"
                                              }`}>
                                                {canal}
                                              </span>
                                              <span className="text-zinc-300 font-mono">{av.tipo}</span>
                                              <span className="text-zinc-500">
                                                {new Date(av.em).toLocaleString("pt-BR")}
                                              </span>
                                              <span className="text-emerald-300">{av.enviados} enviados</span>
                                              {av.falhas > 0 && (
                                                <span className="text-red-300">{av.falhas} falhas</span>
                                              )}
                                              <span className="text-zinc-500">
                                                · {av.destinatarios.length} destinatario(s)
                                              </span>
                                              {isWhatsapp && viaHsm > 0 && (
                                                <span
                                                  className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                                                  title="Template HSM aprovado pelo Meta — entrega garantida fora da janela de 24h"
                                                >
                                                  HSM: {viaHsm}
                                                </span>
                                              )}
                                              {isWhatsapp && viaTextoLivre > 0 && (
                                                <span
                                                  className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/40"
                                                  title="Texto livre — so entrega dentro da janela de 24h apos o destinatario falar com a clinica"
                                                >
                                                  Texto livre: {viaTextoLivre}
                                                </span>
                                              )}
                                            </div>
                                            {tudoTextoLivre && (
                                              <div className="mt-1 px-2 py-1 bg-amber-500/10 border border-amber-500/40 rounded text-amber-200 text-[10px]">
                                                ⚠ aviso pode ter sido bloqueado pelo provedor: 100%
                                                saiu por texto livre. Se o destinatario nao falou
                                                com a clinica nas ultimas 24h, a entrega pode ter
                                                sido bloqueada silenciosamente.
                                              </div>
                                            )}
                                            {av.destinatarios.length > 0 && (
                                              <div className="text-zinc-500 mt-0.5 break-all">
                                                {av.destinatarios.join(", ")}
                                              </div>
                                            )}
                                            {av.erro && (
                                              <div className="text-red-400 mt-0.5">erro: {av.erro}</div>
                                            )}
                                          </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Platform2faExpiryBanner onRenovar={openStepUp} />
      {stepUpModal}
      {previaSuspensao && (
        <PreviaSuspensaoModalImpl
          clinica={previaSuspensao.clinica}
          previa={previaSuspensao.previa}
          acao={previaSuspensao.acao}
          desabilitado={acaoId === previaSuspensao.clinica.id}
          onCancelar={() => setPreviaSuspensao(null)}
          onConfirmar={(motivo, janelaDias) => void confirmarAcaoComPrevia(motivo, janelaDias)}
          onRecarregarPrevia={async (janelaDias) => {
            const c = previaSuspensao.clinica;
            const r = await runWithStepUp(() =>
              apiFetch(
                `/api/plataforma/clinicas/${c.id}/destinatarios-aviso?janelaDias=${janelaDias}`,
                { credentials: "include" },
              ),
            );
            if (!r.ok) return;
            const previa = (await r.json()) as PreviaDestinatarios;
            setPreviaSuspensao((prev) => (prev ? { ...prev, previa } : prev));
          }}
        />
      )}
    </Layout>
  );
}

function PreviaSuspensaoModalImpl({
  clinica,
  previa,
  acao,
  desabilitado,
  onCancelar,
  onConfirmar,
  onRecarregarPrevia,
}: {
  clinica: Clinica;
  previa: PreviaDestinatarios;
  acao: "suspender" | "reativar" | "agendar_exclusao";
  desabilitado: boolean;
  onCancelar: () => void;
  onConfirmar: (motivo: string, janelaDias?: number) => void;
  onRecarregarPrevia: (janelaDias: number) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [confirmacaoExtra, setConfirmacaoExtra] = useState("");
  // Task #182 — janela editavel pra suspender. Guardamos local pra
  // permitir digitar antes de "Aplicar"; so re-fetcha quando o usuario
  // confirma (debounce manual evita overload em digitacao lenta).
  const [janelaDiasInput, setJanelaDiasInput] = useState<string>(String(previa.janelaDias));
  const [recarregandoJanela, setRecarregandoJanela] = useState(false);
  useEffect(() => {
    setJanelaDiasInput(String(previa.janelaDias));
  }, [previa.janelaDias]);
  const motivoOk = motivo.trim().length >= 8;
  const ehSuspender = acao === "suspender";
  const ehExclusao = acao === "agendar_exclusao";
  // Confirmacao dupla:
  // - SUSPENDER (Task #138/#178): exige "SUSPENDER MESMO ASSIM" quando
  //   nenhum responsavel tem WhatsApp OU nenhum tem email — cenarios em
  //   que a clinica acorda offline sem aviso confiavel.
  // - AGENDAR EXCLUSAO (Task #195): SEMPRE exige digitar o nome exato da
  //   clinica — confirmacao dupla obrigatoria pre-existente, agora dentro
  //   do modal junto da previa de destinatarios.
  // - REATIVAR (Task #179): nao destrutivo, sem confirmacao extra.
  const exigeConfirmacaoExtra =
    ehExclusao || (ehSuspender && (previa.whatsappVazio || previa.emailVazio));
  // Cenario mais grave: NENHUM canal disponivel — clinica acorda offline
  // e ninguem (nem por email, nem por WhatsApp) sera avisado.
  const semNenhumCanal = previa.whatsappVazio && previa.emailVazio;
  const textoConfirmacaoEsperado = ehExclusao ? clinica.nome : "SUSPENDER MESMO ASSIM";
  const confirmacaoExtraOk = ehExclusao
    ? confirmacaoExtra === clinica.nome
    : !exigeConfirmacaoExtra ||
      confirmacaoExtra.trim().toUpperCase() === "SUSPENDER MESMO ASSIM";
  const podeConfirmar = motivoOk && confirmacaoExtraOk && !desabilitado;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-6"
      onClick={onCancelar}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-2xl w-full mt-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <h2
            className={`font-semibold flex items-center gap-2 ${
              ehExclusao ? "text-red-400" : ehSuspender ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {ehExclusao ? <Trash2 size={18} /> : ehSuspender ? <PowerOff size={18} /> : <Power size={18} />}
            {ehExclusao
              ? "Agendar exclusao · previa de avisos"
              : ehSuspender
              ? "Suspender clinica · previa de avisos"
              : "Reativar clinica · previa de avisos"}
          </h2>
          <button
            onClick={onCancelar}
            className="text-zinc-500 hover:text-zinc-200"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-5 py-4 space-y-4 text-sm text-zinc-300">
          <div>
            <div className="text-xs text-zinc-500">Clinica</div>
            <div className="font-semibold text-zinc-100">
              {clinica.nome} <span className="text-zinc-500 font-normal">(id {clinica.id})</span>
            </div>
          </div>

          <div className="text-xs text-zinc-400 bg-zinc-800/40 border border-zinc-800 rounded p-3">
            {ehExclusao
              ? "Agendar exclusao inicia uma janela de carencia LGPD de 30 dias. Voce pode CANCELAR a qualquer momento dentro da janela, mas apos o vencimento a exclusao e IRREVERSIVEL. O aviso de exclusao agendada vai pros responsaveis abaixo — confira pra QUEM antes de confirmar."
              : ehSuspender
              ? "Suspender paralisa a operacao inteira (login bloqueado, agenda/prescricoes/faturamento pausados). Antes de confirmar, verifique pra QUEM o aviso de suspensao vai chegar."
              : "Reativar religa a operacao da clinica. O aviso de reativacao vai pros mesmos responsaveis abaixo — confira a lista (pode ter mudado durante a suspensao) antes de confirmar."}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="border border-zinc-800 rounded p-3 bg-zinc-950/40">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold mb-2">
                <Mail size={14} /> Emails ({previa.emails.length})
              </div>
              {previa.emailVazio ? (
                <div className="text-xs text-red-300 italic">
                  Nenhum email cadastrado pros responsaveis desta clinica — o aviso por email NAO chegara em ninguem.
                </div>
              ) : (
                <ul className="text-xs text-zinc-300 space-y-1 break-all">
                  {(previa.emailsDetalhe ?? previa.emails.map((valor) => ({ valor, ultimas_falhas: 0 }))).map((d) => {
                    // Task #268 — `ultimas_falhas` ja vem enriquecido por
                    // destinatario direto do backend. Quando > 0 mostra
                    // icone amarelo + tooltip explicativo. Fallback 3 evita
                    // tooltip "x/0" se o payload vier sem o campo (pre-Task #268).
                    const falhas = d.ultimas_falhas;
                    const janela = previa.tentativasJanelaFalhas ?? 3;
                    return (
                      <li key={d.valor} className="flex items-start gap-1">
                        <span>·</span>
                        <span className="flex-1">{d.valor}</span>
                        {falhas > 0 && (
                          <span
                            title={`Este email falhou em ${falhas} das ultimas ${janela} tentativas de aviso desta clinica. Pode estar quebrado — confirme antes de suspender.`}
                            className="inline-flex items-center gap-0.5 text-amber-300 shrink-0"
                          >
                            <AlertTriangle size={12} />
                            <span className="tabular-nums">{falhas}/{janela}</span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border border-zinc-800 rounded p-3 bg-zinc-950/40">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold mb-2">
                <Phone size={14} /> WhatsApp ({previa.telefones.length})
              </div>
              {previa.whatsappVazio ? (
                <div className="text-xs text-red-300 italic">
                  Nenhum responsavel com telefone valido — o aviso de WhatsApp NAO chegara em
                  ninguem.
                </div>
              ) : (
                <ul className="text-xs text-zinc-300 space-y-1 break-all">
                  {(previa.telefonesDetalhe ?? previa.telefones.map((valor) => ({ valor, ultimas_falhas: 0 }))).map((d) => {
                    // Task #268 — `ultimas_falhas` ja vem enriquecido por
                    // destinatario direto do backend.
                    const falhas = d.ultimas_falhas;
                    const janela = previa.tentativasJanelaFalhas ?? 3;
                    return (
                      <li key={d.valor} className="flex items-start gap-1">
                        <span>·</span>
                        <span className="flex-1">{d.valor}</span>
                        {falhas > 0 && (
                          <span
                            title={`Este WhatsApp falhou em ${falhas} das ultimas ${janela} tentativas de aviso desta clinica. Pode estar quebrado — confirme antes de suspender.`}
                            className="inline-flex items-center gap-0.5 text-amber-300 shrink-0"
                          >
                            <AlertTriangle size={12} />
                            <span className="tabular-nums">{falhas}/{janela}</span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {semNenhumCanal ? (
            // Cenario MAIS grave (Task #178): nem email nem WhatsApp tem
            // destinatario — clinica acorda offline sem ninguem ser
            // avisado. Vermelho forte pra diferenciar do aviso amarelo
            // de WhatsApp-vazio-mas-email-ok.
            <div className="flex items-start gap-2 p-3 rounded border-2 border-red-500/60 bg-red-500/15 text-red-100 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">
                  Atencao critica: NENHUM canal de aviso disponivel.
                </div>
                {ehExclusao
                  ? "Esta clinica nao tem email NEM WhatsApp cadastrado pros responsaveis — o aviso de exclusao agendada nao chegara em ninguem e a clinica vai descobrir que foi excluida apenas quando o login parar de funcionar. Cadastre pelo menos um email ou telefone antes de agendar a exclusao."
                  : ehSuspender
                  ? "Esta clinica nao tem email NEM WhatsApp cadastrado pros responsaveis — o aviso de suspensao nao chegara em ninguem e a clinica vai acordar offline sem entender o motivo. Cadastre pelo menos um email ou telefone antes de suspender."
                  : "Esta clinica nao tem email NEM WhatsApp cadastrado pros responsaveis — ninguem sera avisado da reativacao."}
              </div>
            </div>
          ) : previa.emailVazio ? (
            <div className="flex items-start gap-2 p-3 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">
                  Atencao: lista de email vazia.
                </div>
                {ehExclusao
                  ? "Nenhum responsavel tem email cadastrado — o aviso de exclusao agendada so chegara via WhatsApp. Considere cadastrar pelo menos um email antes de agendar a exclusao."
                  : ehSuspender
                  ? "Nenhum responsavel tem email cadastrado — o aviso so chegara via WhatsApp. Considere cadastrar pelo menos um email antes de suspender."
                  : "Nenhum responsavel vai receber o aviso de reativacao por email — apenas por WhatsApp."}
              </div>
            </div>
          ) : previa.whatsappVazio ? (
            <div className="flex items-start gap-2 p-3 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1">
                  Atencao: lista de WhatsApp vazia.
                </div>
                {ehExclusao
                  ? "Nenhum responsavel vai receber o aviso de exclusao agendada no celular — apenas por email. Considere cadastrar pelo menos um telefone antes de agendar a exclusao."
                  : ehSuspender
                  ? "A clinica vai acordar offline sem aviso no celular. Considere cadastrar pelo menos um responsavel com telefone antes de suspender."
                  : "Nenhum responsavel vai receber o aviso de reativacao no celular — apenas por email."}
              </div>
            </div>
          ) : null}

          {ehSuspender && (
            <div className="border border-zinc-800 rounded p-3 bg-zinc-950/40 space-y-2">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Clock size={14} /> Pacientes com consulta nos proximos {previa.janelaDias} dia(s)
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-zinc-500">Receberao aviso</div>
                  <div className="text-emerald-300 text-lg font-semibold tabular-nums">
                    {previa.pacientesAvisados}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Sem contato (email/telefone)</div>
                  <div className={`text-lg font-semibold tabular-nums ${previa.pacientesSemContato > 0 ? "text-amber-300" : "text-zinc-400"}`}>
                    {previa.pacientesSemContato}
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-2 pt-1">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Janela (dias) — entre {previa.janelaDiasMin} e {previa.janelaDiasMax}
                  </label>
                  <input
                    type="number"
                    min={previa.janelaDiasMin}
                    max={previa.janelaDiasMax}
                    value={janelaDiasInput}
                    onChange={(e) => setJanelaDiasInput(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={recarregandoJanela || Number(janelaDiasInput) === previa.janelaDias || !Number.isFinite(Number(janelaDiasInput))}
                  onClick={async () => {
                    const n = Math.floor(Number(janelaDiasInput));
                    if (!Number.isFinite(n)) return;
                    const clamped = Math.min(previa.janelaDiasMax, Math.max(previa.janelaDiasMin, n));
                    setRecarregandoJanela(true);
                    try {
                      await onRecarregarPrevia(clamped);
                    } finally {
                      setRecarregandoJanela(false);
                    }
                  }}
                  className="px-3 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  <RefreshCw size={12} className={recarregandoJanela ? "animate-spin" : ""} />
                  {recarregandoJanela ? "Recalculando..." : "Aplicar janela"}
                </button>
              </div>
              {previa.pacientesSemContato > 0 && (
                <div className="text-xs text-amber-300 italic">
                  {previa.pacientesSemContato} paciente(s) tem consulta marcada mas nao tem email
                  nem telefone — vao descobrir a suspensao apenas pelo portal ou ao chegar na
                  clinica.
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Motivo (minimo 8 caracteres — registrado em <code>auditoria_kill_switch</code>)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              placeholder="Ex: Inadimplencia ha 60 dias sem retorno do contato"
            />
          </div>

          {exigeConfirmacaoExtra && (
            <div>
              <label
                className={`block text-xs mb-1 ${ehExclusao ? "text-red-300" : "text-amber-300"}`}
              >
                {ehExclusao
                  ? "Confirmacao dupla — digite EXATAMENTE o nome da clinica:"
                  : "Confirmacao dupla — digite EXATAMENTE "}
                <code className="font-mono">{textoConfirmacaoEsperado}</code>
              </label>
              <input
                type="text"
                value={confirmacaoExtra}
                onChange={(e) => setConfirmacaoExtra(e.target.value)}
                className={`w-full px-3 py-2 bg-zinc-950 border rounded text-sm text-zinc-100 focus:outline-none ${
                  ehExclusao
                    ? "border-red-500/40 focus:border-red-500"
                    : "border-amber-500/40 focus:border-amber-500"
                }`}
                placeholder={textoConfirmacaoEsperado}
              />
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-800 bg-zinc-950/40">
          <button
            onClick={onCancelar}
            className="px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200"
          >
            Cancelar
          </button>
          <button
            disabled={!podeConfirmar}
            onClick={() => onConfirmar(motivo, ehSuspender ? previa.janelaDias : undefined)}
            className={`inline-flex items-center gap-1 px-3 py-2 text-sm rounded disabled:opacity-40 disabled:cursor-not-allowed ${
              ehExclusao
                ? "bg-red-700/30 text-red-200 hover:bg-red-700/50"
                : ehSuspender
                ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            }`}
          >
            {ehExclusao ? <Trash2 size={14} /> : ehSuspender ? <PowerOff size={14} /> : <Power size={14} />}
            {ehExclusao
              ? (desabilitado ? "Agendando exclusao..." : "Agendar exclusao")
              : ehSuspender
              ? (desabilitado ? "Suspendendo..." : "Suspender")
              : (desabilitado ? "Reativando..." : "Reativar")}
          </button>
        </footer>
      </div>
    </div>
  );
}
