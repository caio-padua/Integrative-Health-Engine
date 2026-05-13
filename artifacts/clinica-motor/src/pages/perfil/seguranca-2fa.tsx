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
} from "lucide-react";

interface PerfilAtual {
  id: number;
  nome: string;
  email: string;
  perfilPlataforma?: "platform_owner" | "tenant_admin" | "tenant_user" | null;
  totpAtivadoEm?: string | null;
  ultimoLogin2faEm?: string | null;
}

interface EnrollResposta {
  otpauthUrl: string;
  secretBase32: string;
  qrCodeDataUrl: string;
  instrucoes?: string;
}

interface ErroJson {
  error?: string;
}

interface ConfirmarResposta {
  ok: boolean;
  totpAtivadoEm?: string;
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
  }, [carregar]);

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
      </div>
    </Layout>
  );
}
