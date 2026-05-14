// Task #122 — Tela de configuracao de 2FA pro dono e admins.
//
// Os endpoints (POST /usuarios/2fa/iniciar, /confirmar, /desativar) ja
// existem no backend (artifacts/api-server/src/routes/twoFactor.ts) e
// soh aceitam usuarios com perfilPlataforma >= tenant_admin. Esta tela
// e o que o Caio (platform_owner) e os tenant_admin de cada clinica usam
// pra ligar o 2FA do app autenticador (Google Authenticator / Authy /
// 1Password) sem precisar bater na API direto.
//
// Fluxo:
//   - Estado "inativo" (totpAtivadoEm null): botao "Iniciar cadastro" chama
//     /2fa/iniciar, mostra QR code + chave manual + campo de 6 digitos pra
//     confirmar. Sem confirmar nada eh persistido no JWT — pode-se sair.
//   - Estado "ativo" (totpAtivadoEm setado): mostra "Ativo desde <data>"
//     + botao "Desativar" que pede o codigo atual antes de desligar.
import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { apiFetch } from "@/lib/api-fetch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  ShieldCheck,
  ShieldOff,
  QrCode,
  Copy,
  Loader2,
  AlertTriangle,
  Smartphone,
  Monitor,
  LogOut,
  Key,
  RefreshCw,
  Printer,
} from "lucide-react";

interface PerfilAtual {
  id: number;
  nome: string;
  email: string;
  perfilPlataforma?: "platform_owner" | "tenant_admin" | "tenant_user" | null;
  totpAtivadoEm?: string | null;
  ultimoLogin2faEm?: string | null;
  // Codigos de recuperacao 2FA: restantes nao usados / total gerados.
  codigosRecuperacao2faRestantes?: number;
  codigosRecuperacao2faTotal?: number;
}

interface EnrollResposta {
  otpauthUrl: string;
  secretBase32: string;
  qrCodeDataUrl: string;
  instrucoes?: string;
  // Codigos de recuperacao 2FA mostrados uma unica vez no enrollment.
  codigosRecuperacao?: string[];
  codigosRecuperacaoAviso?: string;
}

interface RegenerarResposta {
  ok: boolean;
  codigosRecuperacao?: string[];
  total?: number;
  aviso?: string;
}

interface ErroJson {
  error?: string;
}

interface ConfirmarResposta {
  ok: boolean;
  totpAtivadoEm?: string;
}

// Task #202 — sessoes JWT ativas do proprio usuario.
interface SessaoAtiva {
  id: number;
  jti: string;
  userAgent: string | null;
  ip: string | null;
  criadaEm: string;
  ultimoUsoEm: string;
  expiraEm: string;
  revogadaEm: string | null;
  atual: boolean;
}

interface SessoesAtivasResposta {
  sessoes: SessaoAtiva[];
}

function resumirUserAgent(ua: string | null): string {
  if (!ua) return "Aparelho desconhecido";
  const lower = ua.toLowerCase();
  let so = "Sistema desconhecido";
  if (lower.includes("windows")) so = "Windows";
  else if (lower.includes("iphone") || lower.includes("ipad")) so = "iOS";
  else if (lower.includes("android")) so = "Android";
  else if (lower.includes("mac os") || lower.includes("macintosh")) so = "macOS";
  else if (lower.includes("linux")) so = "Linux";
  let nav = "Navegador";
  if (lower.includes("edg/")) nav = "Edge";
  else if (lower.includes("chrome/") && !lower.includes("edg/")) nav = "Chrome";
  else if (lower.includes("firefox/")) nav = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome/")) nav = "Safari";
  return `${nav} em ${so}`;
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function PerfilSeguranca2faPage() {
  const { toast } = useToast();

  const [perfil, setPerfil] = useState<PerfilAtual | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  // Enrollment em curso (depois de /iniciar, antes de /confirmar).
  const [enroll, setEnroll] = useState<EnrollResposta | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [codigoConfirmar, setCodigoConfirmar] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  // Desativacao.
  const [codigoDesativar, setCodigoDesativar] = useState("");
  const [desativando, setDesativando] = useState(false);
  const [pedindoDesativar, setPedindoDesativar] = useState(false);

  // Task #202 — sessoes ativas do proprio usuario.
  const [sessoes, setSessoes] = useState<SessaoAtiva[] | null>(null);
  const [carregandoSessoes, setCarregandoSessoes] = useState(false);
  const [erroSessoes, setErroSessoes] = useState<string | null>(null);
  const [revogandoId, setRevogandoId] = useState<number | null>(null);

  // Task #203 — codigos de recuperacao (mostrados uma unica vez):
  // - codigosRegerados: vem de /regenerar-codigos-recuperacao
  // - codigosPosConfirmacao: copia dos codigos do enrollment que sobrevivem
  //   a confirmacao do TOTP, pra que o usuario consiga salvar/imprimir
  //   APOS confirmar (requisito da task: "Ao confirmar o cadastro do 2FA,
  //   a tela mostra 8-10 codigos de uso unico pra imprimir/salvar").
  // Ambos sao limpos ao fechar a caixa "Ja guardei".
  const [codigosRegerados, setCodigosRegerados] = useState<string[] | null>(null);
  const [codigosPosConfirmacao, setCodigosPosConfirmacao] = useState<string[] | null>(null);
  const [regerando, setRegerando] = useState(false);
  const [erroRegerar, setErroRegerar] = useState<string | null>(null);
  const [pedindoRegerar, setPedindoRegerar] = useState(false);
  const [codigoRegerar, setCodigoRegerar] = useState("");

  const carregarSessoes = useCallback(async () => {
    setCarregandoSessoes(true);
    setErroSessoes(null);
    try {
      const r = await apiFetch("/api/usuarios/sessoes-ativas");
      if (!r.ok) {
        const erro = (await r.json().catch(() => ({}) as ErroJson)) as ErroJson;
        setErroSessoes(erro.error ?? `Falha ao carregar sessoes (${r.status})`);
        return;
      }
      const data = (await r.json()) as SessoesAtivasResposta;
      setSessoes(data.sessoes ?? []);
    } catch (e) {
      setErroSessoes(e instanceof Error ? e.message : "Sem conexao com o servidor.");
    } finally {
      setCarregandoSessoes(false);
    }
  }, []);

  async function revogarSessao(s: SessaoAtiva) {
    if (s.atual) {
      toast({
        title: "Nao da pra encerrar a sessao atual por aqui",
        description: "Use o botao Sair no menu superior pra encerrar a propria sessao.",
        variant: "destructive",
      });
      return;
    }
    setRevogandoId(s.id);
    try {
      const r = await apiFetch(`/api/usuarios/sessoes-ativas/${s.id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const erro = (await r.json().catch(() => ({}) as ErroJson)) as ErroJson;
        toast({
          title: "Nao foi possivel encerrar a sessao",
          description: erro.error ?? `Erro ${r.status}`,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Sessao encerrada",
        description: "O outro aparelho vai precisar fazer login de novo.",
      });
      await carregarSessoes();
    } catch {
      toast({ title: "Sem conexao com o servidor", variant: "destructive" });
    } finally {
      setRevogandoId(null);
    }
  }

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregar(null);
    try {
      const r = await apiFetch("/api/usuarios/perfil-atual");
      if (!r.ok) {
        const erro = (await r.json().catch(() => ({}) as ErroJson)) as ErroJson;
        setErroCarregar(erro.error ?? `Falha ao carregar perfil (${r.status})`);
        return;
      }
      const data = (await r.json()) as PerfilAtual;
      setPerfil(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sem conexao com o servidor.";
      setErroCarregar(msg);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    void carregarSessoes();
  }, [carregar, carregarSessoes]);

  const podeUsar2fa =
    perfil?.perfilPlataforma === "platform_owner" ||
    perfil?.perfilPlataforma === "tenant_admin";

  async function iniciarEnroll() {
    setIniciando(true);
    try {
      const r = await apiFetch("/api/usuarios/2fa/iniciar", { method: "POST" });
      if (!r.ok) {
        const erro = (await r.json().catch(() => ({}) as ErroJson)) as ErroJson;
        toast({
          title: "Nao foi possivel iniciar o cadastro",
          description: erro.error ?? `Erro ${r.status}`,
          variant: "destructive",
        });
        return;
      }
      const data = (await r.json()) as EnrollResposta;
      setEnroll(data);
      setCodigoConfirmar("");
    } catch {
      toast({
        title: "Sem conexao com o servidor",
        variant: "destructive",
      });
    } finally {
      setIniciando(false);
    }
  }

  async function confirmarEnroll() {
    const codigo = codigoConfirmar.trim();
    if (codigo.length !== 6) {
      toast({
        title: "Digite exatamente 6 digitos do app autenticador",
        variant: "destructive",
      });
      return;
    }
    setConfirmando(true);
    try {
      const r = await apiFetch("/api/usuarios/2fa/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      if (!r.ok) {
        const erro = (await r.json().catch(() => ({}) as ErroJson)) as ErroJson;
        toast({
          title: "Codigo invalido",
          description: erro.error ?? `Erro ${r.status}`,
          variant: "destructive",
        });
        return;
      }
      // Resposta tipada (ConfirmarResposta) — consumida pra garantir parsing
      // OK; o estado vem de /perfil-atual no carregar() abaixo.
      (await r.json().catch(() => ({ ok: true }))) as ConfirmarResposta;
      toast({
        title: "2FA ativado com sucesso",
        description:
          "A partir do proximo login o sistema vai pedir o codigo do app autenticador.",
      });
      // Preserva os codigos de recuperacao do enrollment pra que o usuario
      // possa salvar/imprimir AINDA depois de confirmar o 2FA — sao
      // mostrados uma unica vez (a UI seguinte mostra a caixa verde com
      // Copiar / Imprimir / Ja guardei).
      if (Array.isArray(enroll?.codigosRecuperacao) && enroll.codigosRecuperacao.length > 0) {
        setCodigosPosConfirmacao(enroll.codigosRecuperacao);
      }
      setEnroll(null);
      setCodigoConfirmar("");
      await carregar();
    } catch {
      toast({
        title: "Sem conexao com o servidor",
        variant: "destructive",
      });
    } finally {
      setConfirmando(false);
    }
  }

  async function desativar() {
    const codigo = codigoDesativar.trim();
    if (codigo.length !== 6) {
      toast({
        title: "Digite exatamente 6 digitos pra desativar",
        variant: "destructive",
      });
      return;
    }
    setDesativando(true);
    try {
      const r = await apiFetch("/api/usuarios/2fa/desativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      if (!r.ok) {
        const erro = (await r.json().catch(() => ({}) as ErroJson)) as ErroJson;
        toast({
          title: "Nao foi possivel desativar",
          description: erro.error ?? `Erro ${r.status}`,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "2FA desativado",
        description:
          "Voce pode reativar a qualquer momento iniciando um novo cadastro.",
      });
      setCodigoDesativar("");
      setPedindoDesativar(false);
      await carregar();
    } catch {
      toast({
        title: "Sem conexao com o servidor",
        variant: "destructive",
      });
    } finally {
      setDesativando(false);
    }
  }

  function copiarSegredo() {
    if (!enroll?.secretBase32) return;
    void navigator.clipboard
      .writeText(enroll.secretBase32)
      .then(() => toast({ title: "Chave copiada" }))
      .catch(() =>
        toast({ title: "Nao foi possivel copiar", variant: "destructive" }),
      );
  }

  // Copia/imprime a lista de codigos de recuperacao mostrada uma unica vez.
  function copiarCodigosLista(codigos: string[]) {
    if (!codigos.length) return;
    void navigator.clipboard
      .writeText(codigos.join("\n"))
      .then(() => toast({ title: "Codigos copiados" }))
      .catch(() =>
        toast({ title: "Nao foi possivel copiar", variant: "destructive" }),
      );
  }

  function imprimirCodigosLista(codigos: string[]) {
    if (!codigos.length) return;
    const w = window.open("", "_blank", "width=520,height=640");
    if (!w) {
      toast({
        title: "Bloqueador de pop-up impediu a impressao",
        description: "Libere pop-ups pra esta pagina e tente de novo.",
        variant: "destructive",
      });
      return;
    }
    const dataAgora = new Date().toLocaleString("pt-BR", {
      dateStyle: "long",
      timeStyle: "short",
    });
    const escHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const linhas = codigos
      .map((c) => `<li style="margin:6px 0;">${escHtml(c)}</li>`)
      .join("");
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>Codigos de recuperacao 2FA · PAWARDS</title>
<style>
  body { font-family: 'JetBrains Mono', monospace; padding:32px; color:#111; }
  h1 { font-size:18px; margin:0 0 4px 0; }
  .sub { font-size:12px; color:#444; margin-bottom:24px; }
  ol { font-size:20px; letter-spacing:0.1em; padding-left:24px; }
  .aviso { font-size:11px; color:#7d1d2e; border:1px solid #7d1d2e; padding:12px; margin-top:24px; }
</style></head><body>
<h1>PAWARDS · Codigos de recuperacao 2FA</h1>
<div class="sub">Conta: ${escHtml(perfil?.email ?? "")} · Gerados em ${escHtml(dataAgora)}</div>
<ol>${linhas}</ol>
<div class="aviso">Cada codigo e de uso unico. Use apenas se voce perder o celular do app autenticador. Guarde este papel em local seguro (cofre, pasta trancada). Nao compartilhe.</div>
</body></html>`,
    );
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        /* noop */
      }
    }, 250);
  }

  // Regera codigos de recuperacao. Exige TOTP atual (anti session hijack).
  async function regerarCodigos() {
    const codigo = codigoRegerar.trim();
    if (codigo.length !== 6) {
      toast({
        title: "Digite exatamente 6 digitos do app autenticador",
        variant: "destructive",
      });
      return;
    }
    setErroRegerar(null);
    setRegerando(true);
    try {
      const r = await apiFetch(
        "/api/usuarios/2fa/regenerar-codigos-recuperacao",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo }),
        },
      );
      const data = (await r.json().catch(() => ({}) as RegenerarResposta)) as
        | RegenerarResposta
        | ErroJson;
      if (!r.ok) {
        const msg = (data as ErroJson).error ?? `Falha (${r.status})`;
        setErroRegerar(msg);
        toast({
          title: "Nao foi possivel regerar",
          description: msg,
          variant: "destructive",
        });
        return;
      }
      const novos = Array.isArray((data as RegenerarResposta).codigosRecuperacao)
        ? ((data as RegenerarResposta).codigosRecuperacao as string[])
        : [];
      setCodigosRegerados(novos);
      setPedindoRegerar(false);
      setCodigoRegerar("");
      toast({
        title: "Codigos novos gerados",
        description:
          "Os antigos foram invalidados. Guarde os novos agora — nao serao mostrados de novo.",
      });
      await carregar();
    } catch {
      setErroRegerar("Sem conexao com o servidor.");
    } finally {
      setRegerando(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6" /> Seguranca · 2FA
          </h1>
          <p className="text-sm text-muted-foreground">
            Verificacao em duas etapas com app autenticador (Google Authenticator,
            Authy, 1Password, Bitwarden). Recomendado pro dono da plataforma e pros
            administradores de cada clinica.
          </p>
        </header>

        {erroCarregar && (
          <div className="border border-destructive/50 bg-destructive/10 text-destructive p-4 rounded-none flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Falha ao carregar perfil</div>
              <div className="text-sm">{erroCarregar}</div>
            </div>
          </div>
        )}

        {carregando && (
          <div className="text-muted-foreground text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando perfil...
          </div>
        )}

        {!carregando && perfil && !podeUsar2fa && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  O cadastro de 2FA por aqui e oferecido apenas pra perfis de
                  plataforma <code>tenant_admin</code> ou{" "}
                  <code>platform_owner</code>. Seu perfil atual eh{" "}
                  <Badge variant="outline">
                    {perfil.perfilPlataforma ?? "tenant_user"}
                  </Badge>
                  . Fale com o administrador da clinica se voce precisa habilitar
                  2FA na sua conta.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!carregando && perfil && podeUsar2fa && perfil.totpAtivadoEm && (
          <Card data-testid="card-2fa-ativo">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                2FA esta ativo nesta conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  Ativo desde
                </div>
                <div className="font-medium" data-testid="text-totp-ativado-em">
                  {formatarData(perfil.totpAtivadoEm)}
                </div>
              </div>
              {perfil.ultimoLogin2faEm && (
                <div className="text-sm">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Ultima validacao
                  </div>
                  <div className="font-medium">
                    {formatarData(perfil.ultimoLogin2faEm)}
                  </div>
                </div>
              )}

              {/* Codigos de recuperacao do enrollment recem-confirmado:
                  permite ao usuario salvar/imprimir agora que o 2FA ja
                  esta ativo (sao mostrados uma unica vez). */}
              {codigosPosConfirmacao && (
                <div className="border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-2" data-testid="bloco-codigos-pos-confirmacao">
                  <div className="flex items-start gap-2">
                    <Key className="w-4 h-4 mt-0.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
                    <div className="flex-1 text-xs uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-300">
                      Codigos de recuperacao · 2FA ativado · mostrados UMA UNICA VEZ
                    </div>
                  </div>
                  <div className="text-xs text-emerald-800 dark:text-emerald-200">
                    Cada codigo serve uma unica vez pra entrar caso voce
                    perca o celular do app autenticador. Salve agora —
                    nao serao mostrados de novo.
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {codigosPosConfirmacao.map((c) => (
                      <div
                        key={c}
                        className="px-2 py-1.5 bg-background border border-emerald-500/30 text-center"
                        data-testid={`codigo-recuperacao-pos-${c}`}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => copiarCodigosLista(codigosPosConfirmacao)}
                      data-testid="button-copiar-codigos-pos"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar todos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => imprimirCodigosLista(codigosPosConfirmacao)}
                      data-testid="button-imprimir-codigos-pos"
                    >
                      <Printer className="w-3.5 h-3.5" /> Imprimir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCodigosPosConfirmacao(null)}
                      data-testid="button-fechar-codigos-pos"
                    >
                      Ja guardei
                    </Button>
                  </div>
                </div>
              )}

              {/* Codigos de recuperacao 2FA: contagem + regerar. */}
              <div className="border border-border p-4 rounded-none space-y-3" data-testid="bloco-codigos-recuperacao">
                <div className="flex items-start gap-2">
                  <Key className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">
                      Codigos de recuperacao
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Cada codigo e de uso unico. Use pra entrar caso voce
                      perca o celular do app autenticador.
                    </div>
                  </div>
                  {(() => {
                    const restantes = perfil.codigosRecuperacao2faRestantes ?? 0;
                    const total = perfil.codigosRecuperacao2faTotal ?? 0;
                    const baixo = total > 0 && restantes <= 2;
                    return (
                      <Badge
                        variant={baixo ? "destructive" : "outline"}
                        className="font-mono"
                        data-testid="badge-codigos-restantes"
                      >
                        {restantes} de {total} restantes
                      </Badge>
                    );
                  })()}
                </div>

                {(perfil.codigosRecuperacao2faTotal ?? 0) === 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-500/10 border border-amber-500/40 p-2">
                    Voce nao tem codigos de recuperacao gerados. Sem eles,
                    perder o celular = ficar trancado fora do sistema. Gere
                    agora.
                  </div>
                )}
                {(perfil.codigosRecuperacao2faRestantes ?? 0) <= 2 &&
                  (perfil.codigosRecuperacao2faTotal ?? 0) > 0 && (
                    <div className="text-xs text-destructive bg-destructive/10 border border-destructive/40 p-2">
                      Voce esta com poucos codigos. Gere uma lista nova antes
                      que acabe.
                    </div>
                  )}

                {codigosRegerados && (
                  <div className="border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-2" data-testid="bloco-codigos-novos">
                    <div className="text-xs uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-300">
                      Novos codigos · mostrados UMA UNICA VEZ
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {codigosRegerados.map((c) => (
                        <div
                          key={c}
                          className="px-2 py-1.5 bg-background border border-emerald-500/30 text-center"
                          data-testid={`codigo-recuperacao-${c}`}
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => copiarCodigosLista(codigosRegerados)}
                        data-testid="button-copiar-codigos-novos"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar todos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => imprimirCodigosLista(codigosRegerados)}
                        data-testid="button-imprimir-codigos-novos"
                      >
                        <Printer className="w-3.5 h-3.5" /> Imprimir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCodigosRegerados(null)}
                        data-testid="button-fechar-codigos-novos"
                      >
                        Ja guardei
                      </Button>
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                      Guarde em gerenciador de senhas ou em papel num cofre.
                      Nao serao mostrados de novo.
                    </div>
                  </div>
                )}

                {!pedindoRegerar ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setPedindoRegerar(true);
                      setErroRegerar(null);
                    }}
                    data-testid="button-pedir-regerar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Gerar novos codigos
                  </Button>
                ) : (
                  <div className="border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                    <div className="text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Os codigos antigos serao INVALIDADOS imediatamente.
                        Digite o codigo de 6 digitos do app autenticador pra
                        confirmar.
                      </span>
                    </div>
                    <Input
                      autoFocus
                      value={codigoRegerar}
                      onChange={(e) =>
                        setCodigoRegerar(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      maxLength={6}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void regerarCodigos();
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      disabled={regerando}
                      className="text-center text-lg tracking-[0.4em] font-mono h-11"
                      data-testid="input-codigo-regerar"
                    />
                    {erroRegerar && (
                      <div className="text-xs text-destructive">{erroRegerar}</div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPedindoRegerar(false);
                          setCodigoRegerar("");
                          setErroRegerar(null);
                        }}
                        disabled={regerando}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void regerarCodigos()}
                        disabled={regerando || codigoRegerar.trim().length < 6}
                        data-testid="button-confirmar-regerar"
                        className="gap-2"
                      >
                        {regerando ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Gerar e invalidar antigos
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {!pedindoDesativar ? (
                <Button
                  variant="outline"
                  onClick={() => setPedindoDesativar(true)}
                  data-testid="button-pedir-desativar"
                  className="gap-2"
                >
                  <ShieldOff className="w-4 h-4" /> Desativar
                </Button>
              ) : (
                <div className="border border-amber-500/40 bg-amber-500/5 p-4 rounded-none space-y-3">
                  <div className="text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Pra desativar voce precisa do codigo atual de 6 digitos do app
                      autenticador. Isso evita que alguem com acesso a sua sessao
                      consiga desligar a protecao sem ter o aparelho.
                    </span>
                  </div>
                  <Input
                    autoFocus
                    value={codigoDesativar}
                    onChange={(e) =>
                      setCodigoDesativar(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    maxLength={6}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void desativar();
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    disabled={desativando}
                    className="text-center text-xl tracking-[0.4em] font-mono h-12"
                    data-testid="input-codigo-desativar"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setPedindoDesativar(false);
                        setCodigoDesativar("");
                      }}
                      disabled={desativando}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => void desativar()}
                      disabled={desativando || codigoDesativar.trim().length < 6}
                      data-testid="button-confirmar-desativar"
                    >
                      {desativando ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Desativar 2FA
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!carregando && perfil && podeUsar2fa && !perfil.totpAtivadoEm && (
          <Card data-testid="card-2fa-inativo">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldOff className="w-5 h-5 text-muted-foreground" />
                2FA ainda nao esta ativo nesta conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!enroll && (
                <>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="flex items-start gap-2">
                      <Smartphone className="w-4 h-4 mt-0.5 shrink-0" />
                      Tenha um app autenticador instalado no celular antes de
                      iniciar o cadastro. Recomendados: Google Authenticator,
                      Authy, 1Password ou Bitwarden.
                    </p>
                  </div>
                  <Button
                    onClick={() => void iniciarEnroll()}
                    disabled={iniciando}
                    data-testid="button-iniciar-2fa"
                    className="gap-2"
                  >
                    {iniciando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    Iniciar cadastro
                  </Button>
                </>
              )}

              {enroll && (
                <div className="space-y-4">
                  {/* Codigos de recuperacao mostrados uma unica vez no enrollment. */}
                  {Array.isArray(enroll.codigosRecuperacao) &&
                    enroll.codigosRecuperacao.length > 0 && (
                      <div className="border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-2" data-testid="bloco-codigos-recuperacao-enroll">
                        <div className="flex items-start gap-2">
                          <Key className="w-4 h-4 mt-0.5 text-emerald-700 dark:text-emerald-300 shrink-0" />
                          <div className="flex-1 text-xs uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-300">
                            Codigos de recuperacao · mostrados UMA UNICA VEZ
                          </div>
                        </div>
                        <div className="text-xs text-emerald-800 dark:text-emerald-200">
                          {enroll.codigosRecuperacaoAviso ??
                            "Cada codigo e de uso unico e serve pra entrar caso voce perca o celular do app autenticador. Guarde agora — nao serao mostrados de novo."}
                        </div>
                        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                          {enroll.codigosRecuperacao.map((c) => (
                            <div
                              key={c}
                              className="px-2 py-1.5 bg-background border border-emerald-500/30 text-center"
                              data-testid={`codigo-recuperacao-enroll-${c}`}
                            >
                              {c}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() =>
                              copiarCodigosLista(enroll.codigosRecuperacao ?? [])
                            }
                            data-testid="button-copiar-codigos-enroll"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copiar todos
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() =>
                              imprimirCodigosLista(enroll.codigosRecuperacao ?? [])
                            }
                            data-testid="button-imprimir-codigos-enroll"
                          >
                            <Printer className="w-3.5 h-3.5" /> Imprimir
                          </Button>
                        </div>
                      </div>
                    )}

                  <div className="text-sm">
                    <div className="font-semibold mb-1">
                      1. Escaneie o QR code no seu app autenticador
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Se nao conseguir escanear, use a chave manual abaixo.
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={enroll.qrCodeDataUrl}
                      alt="QR code do 2FA"
                      className="border border-border bg-white p-2"
                      width={256}
                      height={256}
                      data-testid="img-qr-2fa"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Chave manual
                    </div>
                    <div className="flex items-center gap-2">
                      <code
                        className="flex-1 bg-muted px-3 py-2 text-xs font-mono break-all"
                        data-testid="text-secret-base32"
                      >
                        {enroll.secretBase32}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copiarSegredo}
                        className="gap-1"
                        data-testid="button-copiar-secret"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">
                      2. Confirme com o codigo de 6 digitos gerado pelo app
                    </div>
                    <Input
                      autoFocus
                      value={codigoConfirmar}
                      onChange={(e) =>
                        setCodigoConfirmar(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      maxLength={6}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void confirmarEnroll();
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      disabled={confirmando}
                      className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                      data-testid="input-codigo-confirmar"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEnroll(null);
                        setCodigoConfirmar("");
                      }}
                      disabled={confirmando}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => void confirmarEnroll()}
                      disabled={
                        confirmando || codigoConfirmar.trim().length < 6
                      }
                      data-testid="button-confirmar-2fa"
                      className="gap-2"
                    >
                      {confirmando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      Confirmar e ativar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Task #202 — Sessoes ativas (lista de aparelhos logados na conta) */}
        <Card data-testid="card-sessoes-ativas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="w-5 h-5" /> Aparelhos com sessao ativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cada login (senha + 2FA) abre uma sessao independente. Se voce
              perdeu o celular, trocou de aparelho ou suspeita que alguem ficou
              logado num computador publico, encerre a sessao por aqui — o
              outro aparelho vai precisar refazer o login.
            </p>

            {erroSessoes && (
              <div className="border border-destructive/50 bg-destructive/10 text-destructive p-3 rounded-none flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{erroSessoes}</span>
              </div>
            )}

            {carregandoSessoes && !sessoes && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando sessoes...
              </div>
            )}

            {sessoes && sessoes.length === 0 && (
              <div className="text-sm text-muted-foreground italic">
                Nenhuma sessao ativa encontrada (logins anteriores ao registro
                de sessoes nao aparecem aqui — sao tokens antigos que expiram
                naturalmente).
              </div>
            )}

            {sessoes && sessoes.length > 0 && (
              <ul className="divide-y divide-border border border-border">
                {sessoes.map((s) => (
                  <li
                    key={s.id}
                    className="p-3 flex items-start gap-3 justify-between"
                    data-testid={`row-sessao-${s.id}`}
                  >
                    <div className="space-y-1 text-sm flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {resumirUserAgent(s.userAgent)}
                        </span>
                        {s.atual && (
                          <Badge variant="outline" className="text-emerald-700 border-emerald-700">
                            Sessao atual
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        IP: <span className="font-mono">{s.ip ?? "-"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ultimo acesso: {formatarData(s.ultimoUsoEm)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Iniciada em: {formatarData(s.criadaEm)} · Expira em{" "}
                        {formatarData(s.expiraEm)}
                      </div>
                      {s.userAgent && (
                        <div
                          className="text-[10px] text-muted-foreground/70 font-mono break-all"
                          title={s.userAgent}
                        >
                          {s.userAgent}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 shrink-0"
                      onClick={() => void revogarSessao(s)}
                      disabled={s.atual || revogandoId === s.id}
                      data-testid={`button-encerrar-sessao-${s.id}`}
                    >
                      {revogandoId === s.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      Encerrar
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void carregarSessoes()}
                disabled={carregandoSessoes}
                data-testid="button-recarregar-sessoes"
              >
                {carregandoSessoes ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : null}
                Recarregar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
