import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Activity, Sparkles, ShieldCheck, Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  senha: z.string().min(1, { message: "Senha é obrigatória" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { user, login, isLoading, pendingTwoFactor, cancelTwoFactor, verifyTwoFactor } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [codigo2fa, setCodigo2fa] = useState("");
  const [verificando2fa, setVerificando2fa] = useState(false);
  // Task — olhinho mostrar/ocultar senha pra Caio conferir o que digitou.
  const [mostrarSenha, setMostrarSenha] = useState(false);
  // Task #222 — quando o login aceita codigo de recuperacao, segura o
  // redirecionamento e mostra banner amarelo na propria tela de login.
  // O dono so prossegue depois de clicar "Entendi, continuar".
  const [avisoRecuperacao, setAvisoRecuperacao] = useState<{
    restantes: number;
    total: number;
  } | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      senha: "",
    },
  });

  useEffect(() => {
    // Task #222 — segura o redirect enquanto o banner de codigo de
    // recuperacao estiver visivel; navega so quando o dono clicar
    // "Entendi, continuar" (que zera `avisoRecuperacao`).
    if (user && !avisoRecuperacao) {
      setLocation("/dashboard");
    }
  }, [user, avisoRecuperacao, setLocation]);

  const onSubmit = (data: LoginFormValues) => {
    login(data);
  };

  // Task #122 — segunda etapa do login: usuario digitou o codigo do app
  // autenticador OU um codigo de recuperacao (Task #203 — XXXX-XXXX).
  // Troca challenge+codigo pelo JWT real via AuthContext.
  const onSubmit2fa = async () => {
    const codigo = codigo2fa.trim();
    if (codigo.length < 6) {
      toast({ title: "Digite os 6 digitos do app autenticador", variant: "destructive" });
      return;
    }
    setVerificando2fa(true);
    const r = await verifyTwoFactor(codigo);
    setVerificando2fa(false);
    if (!r.ok) {
      toast({
        title: "Codigo invalido",
        description: r.error,
        variant: "destructive",
      });
      setCodigo2fa("");
      return;
    }
    // Task #222 — login aceitou codigo de recuperacao: ativa o banner
    // amarelo na tela de login. O useEffect acima nao redireciona
    // enquanto `avisoRecuperacao` for != null.
    if (r.usouCodigoRecuperacao) {
      setAvisoRecuperacao({
        restantes:
          typeof r.codigosRecuperacao2faRestantes === "number"
            ? r.codigosRecuperacao2faRestantes
            : 0,
        total:
          typeof r.codigosRecuperacao2faTotal === "number"
            ? r.codigosRecuperacao2faTotal
            : 0,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--pw-pergaminho)]">
        <Activity className="animate-spin text-[var(--pw-petroleo)] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--pw-pergaminho)]">
      {/* Padrão sutil de pergaminho — gradiente diagonal */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, var(--pw-marfim) 0%, transparent 40%),
                            radial-gradient(circle at 80% 70%, var(--pw-dourado-suave) 0%, transparent 50%)`,
        }}
      />

      <Card className="w-full max-w-md relative z-10 pw-card rounded-none border-2 border-[var(--pw-marfim)] bg-[var(--pw-offwhite)]">
        {/* Borda dourada superior */}
        <div className="h-1 bg-gradient-to-r from-[var(--pw-dourado)] via-[var(--pw-dourado-vivo)] to-[var(--pw-dourado)]" />

        <CardHeader className="space-y-3 text-center pb-6 border-b border-[var(--pw-marfim)] pt-8">
          <div className="flex justify-center mb-2">
            <div className="w-20 h-20 flex items-center justify-center border-2 border-[var(--pw-dourado)] bg-white p-2 rounded-none">
              <img src={`${import.meta.env.BASE_URL}logo-dp.png`} alt="DP" className="w-full h-full object-contain" />
            </div>
          </div>
          <CardTitle className="pw-titulo-manifesto text-3xl text-[var(--pw-petroleo)] uppercase">
            PAWARDS
          </CardTitle>
          <span className="pw-selo-dourado px-3 py-1 inline-block mx-auto text-[10px] tracking-[0.3em]">
            <Sparkles className="w-3 h-3 inline mr-1 mb-[2px]" />
            PADCON · MEDCORE
          </span>
          <p className="text-xs text-[var(--pw-cinza-bruma)] tracking-[0.2em] uppercase pt-1">
            Onde o caos vira fluxo
          </p>
        </CardHeader>

        <CardContent className="pt-6 pb-8 px-8">
          {avisoRecuperacao ? (
            <div className="space-y-5" data-testid="banner-recuperacao-2fa">
              <div
                className="border-2 border-[#d97a3c] bg-[#fff7e6] p-5 space-y-3"
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-[#d97a3c] flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <div className="font-semibold text-[var(--pw-tinta)] uppercase tracking-[0.15em] text-sm">
                      Voce entrou com codigo de recuperacao
                    </div>
                    <div className="text-xs text-[var(--pw-tinta)] leading-relaxed">
                      Restam{" "}
                      <span className="font-mono font-bold">
                        {avisoRecuperacao.restantes}
                      </span>
                      {avisoRecuperacao.total > 0 ? (
                        <>
                          {" de "}
                          <span className="font-mono font-bold">
                            {avisoRecuperacao.total}
                          </span>
                        </>
                      ) : null}{" "}
                      codigos de recuperacao na sua conta. Recupere acesso ao
                      app autenticador (Google Authenticator / Authy /
                      1Password) o quanto antes — codigos sao um atalho de
                      emergencia, nao a forma normal de entrar.
                    </div>
                    <div className="text-xs text-[var(--pw-tinta)] leading-relaxed">
                      Enviamos um aviso por email e WhatsApp pra voce
                      confirmar que o login foi seu. Se nao foi, troque a
                      senha + regere os codigos imediatamente.
                    </div>
                    {avisoRecuperacao.restantes <= 2 && (
                      <div className="text-xs text-[#7d1d2e] font-semibold border-t border-[#d97a3c] pt-2 mt-2">
                        Atencao: restam apenas {avisoRecuperacao.restantes}{" "}
                        codigos. Considere regerar agora pra nao ficar sem
                        acesso de emergencia.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setAvisoRecuperacao(null)}
                className="w-full h-12 font-semibold uppercase tracking-[0.2em] rounded-none bg-[var(--pw-petroleo)] hover:bg-[var(--pw-petroleo-escuro)] text-white text-sm transition-all"
                data-testid="button-prosseguir-recuperacao"
              >
                Entendi, continuar
              </Button>
            </div>
          ) : pendingTwoFactor ? (
            <div className="space-y-5" data-testid="form-2fa">
              <div className="text-center space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-[var(--pw-petroleo)]" />
                <div className="text-sm font-semibold text-[var(--pw-tinta)]">
                  Verificacao em duas etapas
                </div>
                <div className="text-xs text-[var(--pw-cinza-bruma)]">
                  Sua conta tem 2FA ativo. Digite o codigo atual de 6 digitos
                  do seu app autenticador (Google Authenticator / Authy /
                  1Password) pra concluir o login. Sem o celular? Use um dos
                  seus codigos de recuperacao no formato{" "}
                  <span className="font-mono">XXXX-XXXX</span>.
                </div>
                {pendingTwoFactor.email && (
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--pw-cinza-bruma)]">
                    Conta: {pendingTwoFactor.email}
                  </div>
                )}
              </div>
              {/* Task #203 — aceita TOTP (6 digitos) OU codigo de
                  recuperacao (XXXX-XXXX, charset alfanumerico sem 0/O/1/I/L).
                  Permitimos digitos, letras A-Z e hifen. Limite 9 chars
                  cobre o formato XXXX-XXXX; o backend normaliza e decide. */}
              <Input
                autoFocus
                value={codigo2fa}
                onChange={(e) =>
                  setCodigo2fa(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^0-9A-Z-]/g, "")
                      .slice(0, 9),
                  )
                }
                maxLength={9}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void onSubmit2fa();
                }}
                autoComplete="one-time-code"
                placeholder="000000 ou XXXX-XXXX"
                disabled={verificando2fa}
                className="bg-white border-[var(--pw-marfim)] rounded-none h-14 focus:border-[var(--pw-petroleo)] text-[var(--pw-grafite)] text-center text-xl tracking-[0.3em] font-mono"
                data-testid="input-codigo-2fa"
              />
              <Button
                type="button"
                onClick={() => void onSubmit2fa()}
                disabled={verificando2fa || codigo2fa.trim().length < 6}
                className="w-full h-12 font-semibold uppercase tracking-[0.2em] rounded-none bg-[var(--pw-petroleo)] hover:bg-[var(--pw-petroleo-escuro)] text-white text-sm transition-all"
                data-testid="button-verificar-2fa"
              >
                {verificando2fa ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                Confirmar e entrar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  cancelTwoFactor();
                  setCodigo2fa("");
                }}
                disabled={verificando2fa}
                className="w-full text-xs text-[var(--pw-cinza-bruma)] hover:text-[var(--pw-tinta)]"
                data-testid="button-cancelar-2fa"
              >
                Voltar e usar outra conta
              </Button>
            </div>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-[0.2em] text-[var(--pw-tinta)] font-semibold">
                      E-mail
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="usuario@pawards.com.br"
                        {...field}
                        className="bg-white border-[var(--pw-marfim)] rounded-none h-11 focus:border-[var(--pw-petroleo)] text-[var(--pw-grafite)]"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-[0.2em] text-[var(--pw-tinta)] font-semibold">
                      Senha
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={mostrarSenha ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          className="bg-white border-[var(--pw-marfim)] rounded-none h-11 pr-11 focus:border-[var(--pw-petroleo)] text-[var(--pw-grafite)]"
                          data-testid="input-senha"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenha((v) => !v)}
                          aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                          aria-pressed={mostrarSenha}
                          tabIndex={-1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--pw-cinza-bruma)] hover:text-[var(--pw-petroleo)] transition-colors"
                          data-testid="button-mostrar-senha"
                        >
                          {mostrarSenha ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 mt-6 font-semibold uppercase tracking-[0.2em] rounded-none bg-[var(--pw-petroleo)] hover:bg-[var(--pw-petroleo-escuro)] text-white text-sm transition-all"
                data-testid="button-login"
              >
                Entrar no Motor
              </Button>
            </form>
          </Form>
          )}

          <p className="text-center text-[10px] text-[var(--pw-cinza-bruma)] mt-6 italic font-serif">
            "A excelência clínica começa pela consciência operacional."
          </p>
        </CardContent>

        {/* Borda dourada inferior */}
        <div className="h-1 bg-gradient-to-r from-[var(--pw-dourado)] via-[var(--pw-dourado-vivo)] to-[var(--pw-dourado)]" />
      </Card>
    </div>
  );
}
