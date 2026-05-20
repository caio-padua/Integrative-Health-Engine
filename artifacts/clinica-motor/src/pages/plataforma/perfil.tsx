import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { Platform2faExpiryBanner } from "@/lib/Platform2faExpiryBanner";
import { usePlatformStepUp } from "@/lib/usePlatformStepUp";
import { Bell, Key, Mail, MessageCircle, Phone, RefreshCw, Save, Send, ShieldAlert, UserCog } from "lucide-react";

// Task #159 — pagina de perfil do platform_owner pra escolher por quais
// canais quer receber o aviso de expiracao do 2FA (worker da Task #146).
// Default DB ['email','whatsapp']. Array vazio = mudo (so o banner in-app
// da Task #130 avisa). Esta tela nao exige 2FA recente — e leitura/edit
// da propria preferencia, nao acao destrutiva no kill-switch.
// Task #172 — terceiro canal opt-in "telegram" (default OFF).

type CanalAviso = "email" | "whatsapp" | "telegram";
const CANAIS_VALIDOS: CanalAviso[] = ["email", "whatsapp", "telegram"];

interface PerfilAtual {
  id: number;
  nome: string;
  email: string;
  perfilPlataforma: "platform_owner" | "tenant_admin" | "tenant_user";
  canaisAviso2fa?: string[] | null;
  // Task #173 — timestamp do ultimo aviso 2FA enviado pelo worker
  // (Migration 047). NULL = "ainda nao houve aviso nesta sessao".
  ultimoAviso2faEm?: string | null;
  // Task #123 — contagem de codigos de recuperacao 2FA ainda nao usados
  // (e total gerados). UI mostra "X de N restantes" + botao regerar.
  totpAtivadoEm?: string | null;
  codigosRecuperacao2faRestantes?: number;
  codigosRecuperacao2faTotal?: number;
  // Task #46 — telefone E.164 do CEO. Sem cadastro, o worker da Task #36
  // (notif assinatura ZapSign) so consegue mandar e-mail no doc_signed/
  // doc_refused. Cadastrar uma vez ativa o canal WhatsApp pro service
  // de assinatura (lib/assinatura/service.ts).
  telefone?: string | null;
}

// Task #186 — historico das ultimas N janelas de aviso 2FA do proprio
// owner. Cada linha = 1 aviso enviado pelo worker (Task #146) com
// canais usados, expiracao calculada e renovacao subsequente (NULL =
// usuario nao relogou dentro da janela de 8h).
// Task #245 — payload da rota GET /api/usuarios/me/ultimo-whatsapp-ceo.
// `status="sem_telefone"` quando o CEO ainda nao cadastrou o numero;
// `status="sem_tentativa"` quando ainda nao houve nenhum disparo pra ele.
// Demais valores espelham `whatsapp_mensagens_log.status` (PENDENTE,
// ENVIADO, ENTREGUE, LIDO, FALHOU) — ENTREGUE/LIDO = chegou no celular,
// FALHOU = Twilio/Gupshup recusou (rate-limit, opt-out, numero bloqueado),
// ENVIADO = provedor aceitou mas webhook ainda nao confirmou entrega.
interface UltimoWhatsappCeo {
  status:
    | "sem_telefone"
    | "sem_tentativa"
    | "PENDENTE"
    | "ENVIADO"
    | "ENTREGUE"
    | "LIDO"
    | "FALHOU";
  provedor?: "TWILIO" | "GUPSHUP";
  enviadoEm?: string | null;
  entregueEm?: string | null;
  lidoEm?: string | null;
  erroDetalhes?: string | null;
  criadoEm?: string;
}

interface HistoricoAviso2fa {
  id: number;
  ultimo_login_2fa_em: string;
  aviso_em: string;
  expira_em: string;
  renovado_em: string | null;
  canal_email_ok: boolean;
  canal_whatsapp_ok: boolean;
  canal_telegram_ok: boolean;
  status: "renovado" | "expirou" | "ignorado";
}

function formatarDataHoraCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Task #173 — formata o "Ultimo aviso enviado" como data/hora relativa
// curta tipo "ha 12min" / "ha 3h" / "ontem 14:30" pra cabecalho TDAH-friendly.
function formatarRelativo(iso: string): string {
  const agora = Date.now();
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const diffMs = agora - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `ha ${min}min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) {
    const restoMin = min % 60;
    return restoMin > 0 ? `ha ${horas}h${restoMin}min` : `ha ${horas}h`;
  }
  const dias = Math.floor(horas / 24);
  const data = new Date(iso);
  const hh = String(data.getHours()).padStart(2, "0");
  const mm = String(data.getMinutes()).padStart(2, "0");
  if (dias === 1) return `ontem ${hh}:${mm}`;
  if (dias < 7) return `ha ${dias}d (${hh}:${mm})`;
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}


// Task #46 — Mascara BR pra telefone celular ((11) 91234-5678) +
// validacao E.164 (+55 + DDD + 9 + 8 digitos). Mantemos a entrada
// formatada na UI mas guardamos no banco no formato E.164 puro
// (+5511912345678) que e o aceito pelos providers Twilio/Gupshup
// usados pelo worker de notificacao (Task #36).
function aplicarMascaraTelefoneBr(valor: string): string {
  const dig = valor.replace(/\D/g, "").slice(0, 11);
  if (dig.length === 0) return "";
  if (dig.length <= 2) return `(${dig}`;
  if (dig.length <= 6) return `(${dig.slice(0, 2)}) ${dig.slice(2)}`;
  if (dig.length <= 10)
    return `(${dig.slice(0, 2)}) ${dig.slice(2, 6)}-${dig.slice(6)}`;
  return `(${dig.slice(0, 2)}) ${dig.slice(2, 7)}-${dig.slice(7)}`;
}

function digitosTelefoneBr(formatado: string): string {
  return formatado.replace(/\D/g, "");
}

function validarTelefoneCelularBr(formatado: string): string | null {
  const dig = digitosTelefoneBr(formatado);
  if (dig.length === 0) return "Informe o numero do celular.";
  if (dig.length !== 11) return "Celular precisa ter DDD + 11 digitos (ex: 11 91234-5678).";
  const ddd = parseInt(dig.slice(0, 2), 10);
  if (!Number.isFinite(ddd) || ddd < 11 || ddd > 99) return "DDD invalido.";
  if (dig[2] !== "9") return "Celular brasileiro precisa comecar com 9 depois do DDD.";
  return null;
}

function paraE164Br(formatado: string): string {
  return `+55${digitosTelefoneBr(formatado)}`;
}

function deE164ParaMascaraBr(e164: string | null | undefined): string {
  if (!e164) return "";
  const dig = e164.replace(/\D/g, "");
  // Aceita +55XXXXXXXXXXX (13) ou ja sem +55 (11) — tenta normalizar
  const base = dig.length === 13 && dig.startsWith("55") ? dig.slice(2) : dig;
  return aplicarMascaraTelefoneBr(base);
}

export default function PlataformaPerfil() {
  const [perfil, setPerfil] = useState<PerfilAtual | null>(null);
  const [canais, setCanais] = useState<Set<CanalAviso>>(new Set());
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState<string | null>(null);
  const { openStepUp, modal: stepUpModal } = usePlatformStepUp();

  // Task #46 — campo de telefone WhatsApp do CEO. Editado nesta tela e
  // gravado em usuarios.telefone via PUT /api/usuarios/:id (rota ja
  // aceita "telefone" em SELF_FIELDS). Worker da Task #36 le essa
  // coluna pra disparar WhatsApp em doc_signed/doc_refused.
  // Task #244 — gravacao agora exige confirmacao por PIN enviado pelo
  // proprio canal WhatsApp antes de persistir o numero.
  const [telefone, setTelefone] = useState<string>("");
  const [telefoneInicial, setTelefoneInicial] = useState<string>("");
  const [salvandoTel, setSalvandoTel] = useState(false);
  const [erroTel, setErroTel] = useState<string | null>(null);
  const [okTel, setOkTel] = useState<string | null>(null);
  // Task #244 — pendencia de PIN (numero novo aguardando confirmacao
  // pelo WhatsApp). Quando ativo, mostramos input de PIN + botoes
  // Confirmar / Cancelar. Cancelar volta pro telefone anterior.
  const [pinPendente, setPinPendente] = useState<{
    telefoneE164: string;
    expiraEm: string;
  } | null>(null);
  const [pinDigitado, setPinDigitado] = useState<string>("");
  const [confirmandoPin, setConfirmandoPin] = useState(false);
  const [cancelandoPin, setCancelandoPin] = useState(false);
  const [tentativasRestantes, setTentativasRestantes] = useState<number | null>(null);
  // Task #245 — status do ultimo WhatsApp disparado pelo worker pro CEO
  // (doc_signed/doc_refused). Sem isso o CEO cadastra o numero e fica no
  // escuro: nao sabe se Twilio/Gupshup recusou silenciosamente.
  const [ultimoWa, setUltimoWa] = useState<UltimoWhatsappCeo | null>(null);
  const [loadingUltimoWa, setLoadingUltimoWa] = useState(false);
  // Task #186 — historico das ultimas 10 janelas de aviso 2FA pra
  // mini-tabela "Ultimos avisos" abaixo do banner do "Ultimo aviso enviado".
  const [historicoAvisos, setHistoricoAvisos] = useState<HistoricoAviso2fa[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const carregarUltimoWa = useCallback(async () => {
    setLoadingUltimoWa(true);
    try {
      const r = await apiFetch("/api/usuarios/me/ultimo-whatsapp-ceo", { credentials: "include" });
      if (r.ok) {
        const data = (await r.json()) as UltimoWhatsappCeo;
        setUltimoWa(data);
      } else {
        setUltimoWa(null);
      }
    } catch {
      setUltimoWa(null);
    }
    setLoadingUltimoWa(false);
  }, []);

  const carregarHistoricoAvisos = useCallback(async () => {
    setLoadingHistorico(true);
    try {
      const r = await apiFetch("/api/usuarios/me/historico-avisos-2fa?limite=10", { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setHistoricoAvisos(Array.isArray(data?.avisos) ? data.avisos : []);
      } else {
        setHistoricoAvisos([]);
      }
    } catch {
      setHistoricoAvisos([]);
    }
    setLoadingHistorico(false);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await apiFetch("/api/usuarios/perfil-atual", { credentials: "include" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErro(j.error ?? `Falha ao carregar (${r.status})`);
        setLoading(false);
        return;
      }
      const data: PerfilAtual = await r.json();
      setPerfil(data);
      const atuais = Array.isArray(data.canaisAviso2fa) ? data.canaisAviso2fa : ["email", "whatsapp"];
      setCanais(new Set(atuais.filter((c): c is CanalAviso => (CANAIS_VALIDOS as string[]).includes(c))));
      const telMascara = deE164ParaMascaraBr(data.telefone ?? null);
      setTelefone(telMascara);
      setTelefoneInicial(telMascara);
    } catch (e: any) {
      setErro(e?.message ?? "Erro inesperado");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { void carregarHistoricoAvisos(); }, [carregarHistoricoAvisos]);
  useEffect(() => { void carregarUltimoWa(); }, [carregarUltimoWa]);

  function toggleCanal(canal: CanalAviso) {
    setMsgOk(null);
    setCanais((prev) => {
      const next = new Set(prev);
      if (next.has(canal)) next.delete(canal); else next.add(canal);
      return next;
    });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setMsgOk(null);
    try {
      const r = await apiFetch("/api/usuarios/me/canais-aviso-2fa", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canaisAviso2fa: Array.from(canais) }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErro(j.error ?? `Falha ao salvar (${r.status})`);
        return;
      }
      const data = await r.json().catch(() => ({}));
      if (Array.isArray(data?.canaisAviso2fa)) {
        setCanais(new Set(data.canaisAviso2fa.filter((c: string): c is CanalAviso => (CANAIS_VALIDOS as string[]).includes(c))));
      }
      setMsgOk("Preferencias salvas. O proximo aviso ja respeita a sua escolha.");
    } catch (e: any) {
      setErro(e?.message ?? "Sem conexao com o servidor. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarTelefone() {
    setErroTel(null);
    setOkTel(null);
    setTentativasRestantes(null);
    if (!perfil) return;
    const erroVal = validarTelefoneCelularBr(telefone);
    if (erroVal) { setErroTel(erroVal); return; }
    setSalvandoTel(true);
    try {
      const r = await apiFetch(`/api/usuarios/${perfil.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: paraE164Br(telefone) }),
      });
      const data = await r.json().catch(() => ({}));
      // Task #244 — backend agora responde 202 com requerConfirmacaoPin
      // quando o numero e novo. So persistimos depois que o usuario digita
      // o PIN recebido pelo WhatsApp em /usuarios/me/telefone/confirmar.
      if (r.status === 202 && data?.requerConfirmacaoPin) {
        setPinPendente({ telefoneE164: data.telefoneE164, expiraEm: data.expiraEm });
        setPinDigitado("");
        setOkTel(
          data.mensagem ??
            "PIN enviado pelo WhatsApp pra esse numero. Digite-o pra confirmar.",
        );
        return;
      }
      if (!r.ok) {
        setErroTel(data.error ?? `Falha ao salvar (${r.status})`);
        return;
      }
      const novo = deE164ParaMascaraBr(data?.telefone ?? null);
      setTelefone(novo);
      setTelefoneInicial(novo);
      setOkTel("WhatsApp cadastrado. O proximo aviso de contrato assinado/recusado ja sai por aqui.");
      // Refetch o status do ultimo WhatsApp pra atualizar o card sem
      // exigir clique manual em "Atualizar".
      void carregarUltimoWa();
    } catch (e: any) {
      setErroTel(e?.message ?? "Sem conexao com o servidor.");
    } finally {
      setSalvandoTel(false);
    }
  }

  // Task #244 — confirma o PIN recebido pelo WhatsApp. So aqui o
  // backend efetivamente grava o numero novo em usuarios.telefone.
  async function confirmarPin() {
    if (!pinPendente) return;
    setErroTel(null);
    setOkTel(null);
    setTentativasRestantes(null);
    setConfirmandoPin(true);
    try {
      const r = await apiFetch("/api/usuarios/me/telefone/confirmar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinDigitado.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (typeof data?.tentativasRestantes === "number") {
          setTentativasRestantes(data.tentativasRestantes);
        }
        if (data?.expirado || data?.excedeuTentativas) {
          // Pendencia morta — o backend ja descartou. Limpa a UI pro
          // CEO digitar o numero de novo e pedir um PIN novo.
          setPinPendente(null);
          setPinDigitado("");
          // Volta o campo pro numero antigo.
          setTelefone(telefoneInicial);
        }
        setErroTel(data.error ?? `Falha ao confirmar (${r.status})`);
        return;
      }
      const novo = deE164ParaMascaraBr(data?.telefone ?? null);
      setTelefone(novo);
      setTelefoneInicial(novo);
      setPinPendente(null);
      setPinDigitado("");
      setOkTel("WhatsApp confirmado. O proximo aviso de contrato assinado/recusado ja sai por aqui.");
    } catch (e: any) {
      setErroTel(e?.message ?? "Sem conexao com o servidor.");
    } finally {
      setConfirmandoPin(false);
    }
  }

  // Task #244 — cancela a pendencia. Volta o campo pro numero antigo.
  async function cancelarPin() {
    setErroTel(null);
    setOkTel(null);
    setTentativasRestantes(null);
    setCancelandoPin(true);
    try {
      await apiFetch("/api/usuarios/me/telefone/cancelar", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // segue — limpamos o estado local mesmo se a chamada falhar.
    } finally {
      setPinPendente(null);
      setPinDigitado("");
      setTelefone(telefoneInicial);
      setCancelandoPin(false);
      setOkTel("Confirmacao cancelada. Continuamos com o numero anterior.");
    }
  }

  const telefoneSujo = telefone !== telefoneInicial;

  const isOwner = perfil?.perfilPlataforma === "platform_owner";
  const nenhumCanal = canais.size === 0;

  // Task #123 — gera codigos de recuperacao novos (invalida os antigos).
  // Pede o codigo TOTP atual do app autenticador no prompt — backend exige
  // pra evitar que session hijack roube codigos.
  const [codigosNovos, setCodigosNovos] = useState<string[] | null>(null);
  const [regerando, setRegerando] = useState(false);
  const [erroRegerar, setErroRegerar] = useState<string | null>(null);

  async function regerarCodigosRecuperacao() {
    setErroRegerar(null);
    const codigo = window.prompt(
      "Digite o codigo de 6 digitos do seu app autenticador pra confirmar a regeracao dos codigos de recuperacao.\n\nATENCAO: os codigos antigos serao INVALIDADOS imediatamente.",
    );
    if (!codigo || codigo.trim().length < 6) {
      if (codigo !== null) setErroRegerar("Codigo precisa ter 6 digitos.");
      return;
    }
    setRegerando(true);
    try {
      const r = await apiFetch("/api/usuarios/2fa/regenerar-codigos-recuperacao", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErroRegerar(data.error ?? `Falha ao regerar (${r.status})`);
        return;
      }
      setCodigosNovos(Array.isArray(data.codigosRecuperacao) ? data.codigosRecuperacao : []);
      await carregar();
    } catch (e: any) {
      setErroRegerar(e?.message ?? "Sem conexao.");
    } finally {
      setRegerando(false);
    }
  }

  function copiarCodigos() {
    if (!codigosNovos) return;
    void navigator.clipboard.writeText(codigosNovos.join("\n"));
  }

  // Task #223 — download dos codigos em TXT/PDF pra impressao/cofre fisico.
  // Padrao Google/GitHub: codigos de recuperacao tem que ter caminho
  // off-line caso o gerenciador de senhas tambem caia.
  function baixarTxt() {
    if (!codigosNovos || !perfil) return;
    void import("@/lib/codigos-recuperacao-export").then((m) =>
      m.baixarCodigosTxt(codigosNovos, perfil.nome, perfil.email),
    );
  }
  function baixarPdf() {
    if (!codigosNovos || !perfil) return;
    void import("@/lib/codigos-recuperacao-export").then((m) =>
      m.baixarCodigosPdf(codigosNovos, perfil.nome, perfil.email),
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            <UserCog size={28} /> Plataforma · Meu perfil
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure como voce quer ser avisado sobre eventos da plataforma.
          </p>
        </header>

        {erro && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/40 rounded text-red-300 flex items-start gap-2">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Falha</div>
              <div className="text-sm">{erro}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-zinc-500 text-sm">Carregando...</div>
        )}

        {!loading && perfil && (
          <div className="space-y-6">
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Identidade</div>
              <div className="font-semibold text-zinc-100">{perfil.nome}</div>
              <div className="text-sm text-zinc-400">{perfil.email}</div>
              <div className="text-xs font-mono mt-2 inline-block px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
                {perfil.perfilPlataforma}
              </div>
            </section>

            {/* Task #46 — cadastro do WhatsApp do CEO. Sem isso, o worker
                da Task #36 (notif ZapSign doc_signed/doc_refused) so manda
                e-mail. Cadastrado uma vez, o proximo evento ja dispara
                WhatsApp via Twilio/Gupshup (lib/assinatura/service.ts). */}
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
              <div className="flex items-start gap-3 mb-4">
                <Phone size={20} className="text-amber-400 mt-1" />
                <div>
                  <h2 className="font-semibold text-zinc-100">WhatsApp pra alertas no celular</h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    Numero usado pra avisar contratos assinados/recusados em
                    tempo real (alem do e-mail). Sem cadastrar, voce so
                    recebe por e-mail. Use o seu celular pessoal com 9
                    digito.
                  </p>
                </div>
              </div>

              <label className="block">
                <span className="text-xs uppercase tracking-wide text-zinc-500 mb-1 block">
                  Celular (DDD + 11 digitos)
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="(11) 91234-5678"
                  value={telefone}
                  onChange={(e) => {
                    setOkTel(null);
                    setErroTel(null);
                    setTelefone(aplicarMascaraTelefoneBr(e.target.value));
                  }}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-500/50"
                />
                <div className="text-xs text-zinc-500 mt-1">
                  Sera salvo como{" "}
                  <span className="font-mono text-zinc-300">
                    {telefone.trim() ? paraE164Br(telefone) : "+55..."}
                  </span>{" "}
                  (formato internacional E.164).
                </div>
              </label>

              {erroTel && (
                <div className="mt-3 p-3 text-xs text-red-200 bg-red-500/10 border border-red-500/40 rounded">
                  {erroTel}
                </div>
              )}
              {okTel && (
                <div className="mt-3 p-3 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded">
                  {okTel}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => void salvarTelefone()}
                  disabled={salvandoTel || !telefoneSujo || !!pinPendente}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded text-sm disabled:opacity-50"
                >
                  <Save size={16} /> {salvandoTel ? "Enviando PIN..." : "Salvar WhatsApp"}
                </button>
              </div>

              {/* Task #244 — confirmacao por PIN. Aparece DEPOIS do
                  primeiro POST quando o backend responde 202 com
                  requerConfirmacaoPin. So aqui o telefone e gravado
                  em usuarios.telefone (no /confirmar). */}
              {pinPendente && (
                <div className="mt-4 p-4 border border-amber-500/40 bg-amber-500/10 rounded">
                  <div className="text-xs uppercase tracking-wide text-amber-300 font-semibold mb-2">
                    Confirme o PIN recebido pelo WhatsApp
                  </div>
                  <p className="text-xs text-amber-100/90 mb-3">
                    Mandamos um codigo de 6 digitos pra{" "}
                    <span className="font-mono">{pinPendente.telefoneE164}</span>.
                    Digite o PIN abaixo pra confirmar que o numero e seu.
                    Se o codigo nao chegar em alguns minutes, cancele e
                    digite o numero de novo. O PIN expira em 10min.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      maxLength={6}
                      value={pinDigitado}
                      onChange={(e) =>
                        setPinDigitado(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="w-32 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-zinc-100 font-mono text-lg tracking-widest text-center focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                      onClick={() => void confirmarPin()}
                      disabled={confirmandoPin || pinDigitado.length !== 6}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 rounded text-sm disabled:opacity-50"
                    >
                      {confirmandoPin ? "Confirmando..." : "Confirmar PIN"}
                    </button>
                    <button
                      onClick={() => void cancelarPin()}
                      disabled={cancelandoPin}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded text-sm disabled:opacity-50"
                    >
                      {cancelandoPin ? "Cancelando..." : "Cancelar"}
                    </button>
                  </div>
                  {tentativasRestantes !== null && tentativasRestantes > 0 && (
                    <div className="mt-2 text-[11px] text-amber-300/80">
                      Tentativas restantes: {tentativasRestantes}
                    </div>
                  )}
                </div>
              )}

              {/* Task #245 — feedback do ultimo WhatsApp disparado pelo
                  worker (doc_signed/doc_refused). Sem isso o CEO nao
                  sabe se Twilio/Gupshup recusou silenciosamente
                  (rate-limit, opt-out, numero bloqueado). Verde =
                  entregue, vermelho = falhou (com dica), amarelo =
                  aceito pelo provedor mas sem confirmacao de entrega
                  ainda. */}
              {(() => {
                if (loadingUltimoWa && !ultimoWa) {
                  return (
                    <div className="mt-4 p-3 text-xs text-zinc-500 bg-zinc-950/50 border border-zinc-800 rounded">
                      Verificando status do ultimo WhatsApp...
                    </div>
                  );
                }
                if (!ultimoWa) return null;
                const headerLine = (
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-zinc-200">
                      Ultimo alerta WhatsApp
                    </span>
                    <button
                      type="button"
                      onClick={() => void carregarUltimoWa()}
                      disabled={loadingUltimoWa}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw size={10} /> {loadingUltimoWa ? "Atualizando..." : "Atualizar"}
                    </button>
                  </div>
                );

                if (ultimoWa.status === "sem_telefone") {
                  return (
                    <div className="mt-4 p-3 text-xs text-zinc-400 bg-zinc-950/50 border border-zinc-800 rounded">
                      {headerLine}
                      <span className="italic">
                        Cadastre o numero acima pra ativar o canal.
                      </span>
                    </div>
                  );
                }
                if (ultimoWa.status === "sem_tentativa") {
                  return (
                    <div className="mt-4 p-3 text-xs text-zinc-400 bg-zinc-950/50 border border-zinc-800 rounded">
                      {headerLine}
                      <span className="italic">
                        Nenhum alerta foi disparado ainda. O proximo
                        contrato assinado/recusado aparece aqui.
                      </span>
                    </div>
                  );
                }
                // Timestamp mais informativo: pra LIDO prefere quando o
                // CEO leu (mais recente que entrega); demais casos pega o
                // evento mais avancado que houver, caindo pra criadoEm.
                const ts =
                  (ultimoWa.status === "LIDO" ? ultimoWa.lidoEm : null) ||
                  ultimoWa.entregueEm ||
                  ultimoWa.lidoEm ||
                  ultimoWa.enviadoEm ||
                  ultimoWa.criadoEm ||
                  null;
                const quando = ts ? formatarRelativo(ts) : "agora";

                if (ultimoWa.status === "ENTREGUE" || ultimoWa.status === "LIDO") {
                  const verbo = ultimoWa.status === "LIDO" ? "lido" : "entregue";
                  return (
                    <div className="mt-4 p-3 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded">
                      {headerLine}
                      <div>
                        <span className="text-emerald-300">[OK]</span>{" "}
                        {verbo}{" "}
                        <span className="font-mono">{quando}</span>
                      </div>
                    </div>
                  );
                }
                if (ultimoWa.status === "FALHOU") {
                  // Dica curta baseada no padrao do erro do provedor.
                  // Twilio devolve mensagens contendo "opt-out", "blocked",
                  // "21610" (rate-limit), etc.
                  const erro = (ultimoWa.erroDetalhes || "").toLowerCase();
                  let dica =
                    "verifique se o numero esta certo e se voce nao bloqueou o remetente.";
                  if (erro.includes("opt-out") || erro.includes("opted out")) {
                    dica =
                      "voce optou por nao receber. Mande qualquer mensagem pro remetente pra reativar.";
                  } else if (erro.includes("blocked") || erro.includes("bloque")) {
                    dica =
                      "o numero parece ter bloqueado o remetente. Desbloqueie no app do WhatsApp.";
                  } else if (erro.includes("rate") || erro.includes("21610")) {
                    dica =
                      "o provedor limitou a taxa de envio (rate-limit). Tente de novo daqui a pouco.";
                  } else if (erro.includes("nao configura") || erro.includes("config")) {
                    dica =
                      "nao ha configuracao de WhatsApp ativa na plataforma. Avise o admin.";
                  }
                  return (
                    <div className="mt-4 p-3 text-xs text-red-200 bg-red-500/10 border border-red-500/40 rounded">
                      {headerLine}
                      <div>
                        <span className="text-red-300">[FALHOU]</span>{" "}
                        <span className="font-mono">{quando}</span>
                      </div>
                      <div className="mt-1 text-red-300/80">
                        Dica: {dica}
                      </div>
                      {ultimoWa.erroDetalhes && (
                        <div className="mt-1 text-[10px] text-red-300/60 font-mono break-all">
                          {ultimoWa.erroDetalhes}
                        </div>
                      )}
                    </div>
                  );
                }
                // PENDENTE / ENVIADO — provedor aceitou, mas nao chegou
                // a confirmacao de entrega via webhook ainda.
                return (
                  <div className="mt-4 p-3 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/40 rounded">
                    {headerLine}
                    <div>
                      <span className="text-amber-300">[...]</span>{" "}
                      enviado{" "}
                      <span className="font-mono">{quando}</span>, aguardando
                      confirmacao de entrega.
                    </div>
                  </div>
                );
              })()}
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
              <div className="flex items-start gap-3 mb-4">
                <Bell size={20} className="text-amber-400 mt-1" />
                <div>
                  <h2 className="font-semibold text-zinc-100">Aviso de expiracao do 2FA</h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    A janela de 8h do 2FA do painel <code>/plataforma</code> expira ~15min antes
                    o sistema te avisa. Escolha por onde quer receber.
                    {!isOwner && (
                      <span className="block mt-2 text-xs text-zinc-500 italic">
                        Esta preferencia so afeta o aviso quando voce e <code>platform_owner</code>.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded border border-zinc-800 hover:border-zinc-700 cursor-pointer bg-zinc-950/50">
                  <input
                    type="checkbox"
                    checked={canais.has("email")}
                    onChange={() => toggleCanal("email")}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <Mail size={18} className="text-zinc-400" />
                  <div className="flex-1">
                    <div className="text-zinc-100 text-sm font-semibold">E-mail</div>
                    <div className="text-xs text-zinc-500">
                      Enviado pra {perfil.email} via Gmail oficial da plataforma.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded border border-zinc-800 hover:border-zinc-700 cursor-pointer bg-zinc-950/50">
                  <input
                    type="checkbox"
                    checked={canais.has("whatsapp")}
                    onChange={() => toggleCanal("whatsapp")}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <MessageCircle size={18} className="text-zinc-400" />
                  <div className="flex-1">
                    <div className="text-zinc-100 text-sm font-semibold">WhatsApp</div>
                    <div className="text-xs text-zinc-500">
                      Enviado pro numero CEO_WHATSAPP cadastrado nas variaveis da plataforma.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded border border-zinc-800 hover:border-zinc-700 cursor-pointer bg-zinc-950/50">
                  <input
                    type="checkbox"
                    checked={canais.has("telegram")}
                    onChange={() => toggleCanal("telegram")}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <Send size={18} className="text-zinc-400" />
                  <div className="flex-1">
                    <div className="text-zinc-100 text-sm font-semibold">Telegram</div>
                    <div className="text-xs text-zinc-500">
                      Enviado via bot oficial (TELEGRAM_BOT_TOKEN) pro chat
                      pessoal CEO_TELEGRAM_CHAT_ID. Sem rate-limit, ideal
                      como backup quando o WhatsApp falha.
                    </div>
                  </div>
                </label>
              </div>

              {/* Task #173 — feedback "Ultimo aviso enviado" pra owner
                  confirmar que a preferencia salva esta funcionando e
                  que o worker da Task #146 esta vivo. Amarelo quando ja
                  passou de 7h45 (proximo de expirar a janela de 8h e
                  esperando renovacao via banner). */}
              {(() => {
                const ts = perfil.ultimoAviso2faEm;
                if (!ts) {
                  return (
                    <div className="mt-4 p-3 text-xs text-zinc-400 bg-zinc-950/50 border border-zinc-800 rounded">
                      Ultimo aviso enviado: <span className="text-zinc-500 italic">Ainda nao houve aviso nesta sessao</span>
                    </div>
                  );
                }
                const idadeMs = Date.now() - new Date(ts).getTime();
                const proximoExpirar = idadeMs >= 7 * 3600_000 + 45 * 60_000;
                const cls = proximoExpirar
                  ? "mt-4 p-3 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/40 rounded"
                  : "mt-4 p-3 text-xs text-zinc-300 bg-zinc-950/50 border border-zinc-800 rounded";
                return (
                  <div className={cls}>
                    Ultimo aviso enviado:{" "}
                    <span className="font-mono">{formatarRelativo(ts)}</span>
                    {proximoExpirar && (
                      <span className="block mt-1 text-amber-300/80">
                        A janela de 8h esta perto do fim — fique de olho no banner pra renovar.
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Task #186 — mini-tabela "Ultimos avisos" com as ultimas
                  10 janelas de aviso 2FA enviadas pelo worker. Permite
                  ao owner auditar comportamento (renovado / expirou /
                  em andamento) e debugar canais (email vs whatsapp). */}
              <div className="mt-4 p-3 text-xs bg-zinc-950/50 border border-zinc-800 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-300 font-semibold">Ultimos avisos enviados</span>
                  <button
                    type="button"
                    onClick={() => void carregarHistoricoAvisos()}
                    disabled={loadingHistorico}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw size={10} /> {loadingHistorico ? "Atualizando..." : "Atualizar"}
                  </button>
                </div>
                {historicoAvisos.length === 0 ? (
                  <div className="text-zinc-500 italic">
                    Nenhum aviso registrado ainda.
                  </div>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead className="text-zinc-500 text-left">
                      <tr>
                        <th className="font-normal pb-1">Aviso</th>
                        <th className="font-normal pb-1">Canais</th>
                        <th className="font-normal pb-1">Status</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-zinc-300">
                      {historicoAvisos.map((h) => {
                        const canais: string[] = [];
                        if (h.canal_email_ok) canais.push("email");
                        if (h.canal_whatsapp_ok) canais.push("whatsapp");
                        if (h.canal_telegram_ok) canais.push("telegram");
                        const canaisLbl = canais.length === 0 ? "—" : canais.join(", ");
                        let statusLbl: string;
                        let statusCls: string;
                        if (h.status === "renovado") {
                          const quando = h.renovado_em ? ` (${formatarDataHoraCurta(h.renovado_em)})` : "";
                          statusLbl = `\u2713 renovado${quando}`;
                          statusCls = "text-emerald-300";
                        } else if (h.status === "expirou") {
                          statusLbl = "\u23F0 expirou";
                          statusCls = "text-red-300";
                        } else {
                          statusLbl = "\u23F3 ignorado";
                          statusCls = "text-amber-300";
                        }
                        return (
                          <tr key={h.id} className="border-t border-zinc-800/60">
                            <td className="py-1 pr-2">{formatarDataHoraCurta(h.aviso_em)}</td>
                            <td className="py-1 pr-2">{canaisLbl}</td>
                            <td className={`py-1 ${statusCls}`}>{statusLbl}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {nenhumCanal && (
                <div className="mt-3 p-3 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded">
                  Com nenhum canal marcado, voce so vera o banner discreto dentro
                  do painel <code>/plataforma</code>. Se sair do navegador, nao
                  recebera nenhum aviso externo.
                </div>
              )}

              {msgOk && (
                <div className="mt-3 p-3 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded">
                  {msgOk}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => void salvar()}
                  disabled={salvando}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded text-sm disabled:opacity-50"
                >
                  <Save size={16} /> {salvando ? "Salvando..." : "Salvar preferencias"}
                </button>
              </div>
            </section>

            {/* Task #123 — codigos de recuperacao 2FA. So aparece se o
                usuario ja tem 2FA ativo (totpAtivadoEm != null). */}
            {perfil.totpAtivadoEm && (
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
                <div className="flex items-start gap-3 mb-4">
                  <Key size={20} className="text-amber-400 mt-1" />
                  <div className="flex-1">
                    <h2 className="font-semibold text-zinc-100">
                      Codigos de recuperacao 2FA
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      Caso voce perca o celular do app autenticador, use um destes
                      codigos pra entrar. Cada codigo serve UMA UNICA VEZ.
                    </p>
                  </div>
                  {(() => {
                    const restantes = perfil.codigosRecuperacao2faRestantes ?? 0;
                    const total = perfil.codigosRecuperacao2faTotal ?? 0;
                    const baixo = total > 0 && restantes <= 2;
                    const cls = baixo
                      ? "text-xs font-mono px-3 py-1 rounded border border-red-500/40 bg-red-500/10 text-red-300"
                      : "text-xs font-mono px-3 py-1 rounded border border-zinc-700 bg-zinc-950 text-zinc-200";
                    return (
                      <span className={cls}>
                        {restantes} de {total} restantes
                      </span>
                    );
                  })()}
                </div>

                {(perfil.codigosRecuperacao2faTotal ?? 0) === 0 && (
                  <div className="mb-3 p-3 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded">
                    Voce nao tem codigos de recuperacao gerados. Sem eles, perder
                    o celular = ficar trancado fora do painel. Gere agora.
                  </div>
                )}

                {(perfil.codigosRecuperacao2faRestantes ?? 0) <= 2 &&
                  (perfil.codigosRecuperacao2faTotal ?? 0) > 0 && (
                    <div className="mb-3 p-3 text-xs text-red-200 bg-red-500/10 border border-red-500/40 rounded">
                      Voce esta com poucos codigos. Recomendado regerar pra ter
                      uma lista nova completa antes que acabe.
                    </div>
                  )}

                {erroRegerar && (
                  <div className="mb-3 p-3 text-xs text-red-200 bg-red-500/10 border border-red-500/40 rounded">
                    {erroRegerar}
                  </div>
                )}

                {codigosNovos && (
                  <div className="mb-3 p-4 border border-emerald-500/40 bg-emerald-500/10 rounded">
                    <div className="text-xs uppercase tracking-wide text-emerald-300 mb-2 font-semibold">
                      Novos codigos · mostrados UMA UNICA VEZ
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm text-emerald-100 mb-3">
                      {codigosNovos.map((c) => (
                        <div key={c} className="px-3 py-2 bg-zinc-950 border border-emerald-500/30 rounded">
                          {c}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copiarCodigos}
                        className="px-3 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 rounded"
                      >
                        Copiar todos
                      </button>
                      <button
                        onClick={baixarTxt}
                        className="px-3 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 rounded"
                      >
                        Baixar TXT
                      </button>
                      <button
                        onClick={baixarPdf}
                        className="px-3 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 rounded"
                      >
                        Baixar PDF
                      </button>
                      <button
                        onClick={() => setCodigosNovos(null)}
                        className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded"
                      >
                        Fechar (ja guardei)
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-emerald-300/80">
                      Guarde em gerenciador de senhas ou papel num cofre. Nao
                      serao mostrados de novo.
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => void regerarCodigosRecuperacao()}
                    disabled={regerando}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded text-sm disabled:opacity-50"
                  >
                    <RefreshCw size={16} />
                    {regerando ? "Regerando..." : "Regerar codigos (invalida os antigos)"}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      <Platform2faExpiryBanner onRenovar={openStepUp} />
      {stepUpModal}
    </Layout>
  );
}
