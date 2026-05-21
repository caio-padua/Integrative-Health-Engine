import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Activity, ShieldCheck, Loader2, AlertTriangle, Eye, EyeOff, KeyRound, Mail, Lock, FileSignature, KeySquare, Fingerprint, Scale, Network } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  senha: z.string().min(1, { message: "Senha é obrigatória" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Paleta institucional Pawards — deep navy + dourado + neon ciano de sotaque.
// Estética luxuosa clássica (Cartier/Patek), JetBrains Mono UPPERCASE,
// 0px radius em tudo. Pedido Caio 21/mai/2026: "mais elegante, formal e
// clássica, surpreenda com o que há de mais moderno".
const NAVY = "#0B1220";
const NAVY_DEEP = "#070C16";
const NAVY_SOFT = "#111A2E";
const GOLD = "#D4AF37";
const GOLD_BRIGHT = "#F0CE5A";
const CYAN = "#5EE6E6";
const INK = "#E5E7EB";
const INK_MUTED = "#9CA3AF";
const HAIRLINE = "#1F2937";

export default function Login() {
  const { user, login, isLoading, pendingTwoFactor, cancelTwoFactor, verifyTwoFactor } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [codigo2fa, setCodigo2fa] = useState("");
  const [verificando2fa, setVerificando2fa] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [avisoRecuperacao, setAvisoRecuperacao] = useState<{
    restantes: number;
    total: number;
  } | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", senha: "" },
  });

  useEffect(() => {
    if (user && !avisoRecuperacao) setLocation("/dashboard");
  }, [user, avisoRecuperacao, setLocation]);

  const onSubmit = (data: LoginFormValues) => login(data);

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
      toast({ title: "Codigo invalido", description: r.error, variant: "destructive" });
      setCodigo2fa("");
      return;
    }
    if (r.usouCodigoRecuperacao) {
      setAvisoRecuperacao({
        restantes: typeof r.codigosRecuperacao2faRestantes === "number" ? r.codigosRecuperacao2faRestantes : 0,
        total: typeof r.codigosRecuperacao2faTotal === "number" ? r.codigosRecuperacao2faTotal : 0,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY_DEEP }}>
        <Activity className="animate-spin w-10 h-10" style={{ color: GOLD }} />
      </div>
    );
  }

  // Letterhead — fina linha dourada decorativa, igual a brasão de cabeçalho clássico.
  const linhaDourada = (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${GOLD}88, transparent)` }} />
      <div className="w-1 h-1 rotate-45" style={{ background: GOLD }} />
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${GOLD}88, transparent)` }} />
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: `radial-gradient(circle at 20% 20%, ${NAVY_SOFT} 0%, ${NAVY} 40%, ${NAVY_DEEP} 100%)`,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Vinheta dourada sutil — efeito de "papel timbrado iluminado" */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `radial-gradient(ellipse at center, transparent 30%, ${NAVY_DEEP} 80%)`,
        }}
      />
      {/* Grid técnico de fundo — referência sutil ao "GRID/SISTEMA" da logo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(${CYAN} 1px, transparent 1px), linear-gradient(90deg, ${CYAN} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Assinaturas institucionais — réplica fiel do rodapé WhatsApp.
          Esquerda: PAWARDS MedCore® · Clinical Intelligence System
          Direita: PADCON Platform® · Advanced Systems Architecture
          Sem moldura, sem caixa — texto puro, respiração total. */}
      <div className="absolute top-6 left-8 z-10 hidden md:block">
        <div
          className="text-[9px] font-bold uppercase tracking-[0.4em]"
          style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
        >
          PAWARDS MedCore<sup style={{ color: CYAN, fontSize: "7px" }}>®</sup>
        </div>
        <div
          className="text-[8px] mt-0.5 tracking-[0.3em] uppercase italic"
          style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
        >
          Clinical Intelligence System
        </div>
      </div>
      <div className="absolute top-6 right-8 z-10 hidden md:block text-right">
        <div
          className="text-[9px] font-bold uppercase tracking-[0.4em]"
          style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
        >
          PADCON Platform<sup style={{ color: CYAN, fontSize: "7px" }}>®</sup>
        </div>
        <div
          className="text-[8px] mt-0.5 tracking-[0.3em] uppercase italic"
          style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
        >
          Advanced Systems Architecture
        </div>
      </div>

      {/* PAINEL HORIZONTAL — sem moldura externa dourada.
          Layout 2 colunas: esquerda (logo + branding + citação) /
          direita (formulário). Selos de segurança em rodapé full-width.
          Ritmo TDAH/TOC: tudo respira no mesmo grid, sem caixas
          aninhadas. Elegância pela ausência de adornos. */}
      <div className="relative z-20 w-full max-w-[980px]">
        <div
          className="relative grid grid-cols-1 md:grid-cols-[1.1fr_1fr]"
          style={{
            background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
            boxShadow: `0 30px 80px rgba(0,0,0,0.6)`,
            borderTop: `1px solid ${GOLD}66`,
            borderBottom: `1px solid ${GOLD}66`,
          }}
        >
          {/* ============ COLUNA ESQUERDA — IDENTIDADE ============ */}
          <div
            className="relative flex flex-col justify-between px-10 py-12 md:border-r"
            style={{ borderColor: `${GOLD}22` }}
          >
            {/* Selo discreto canto sup esq */}
            <div
              className="text-[9px] font-bold uppercase tracking-[0.5em] mb-8"
              style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="inline-block w-2 h-2 mr-2 align-middle" style={{ background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
              Acesso Restrito
            </div>

            {/* Logo grande, alinhado à esquerda, sem moldura */}
            <div className="flex-1 flex flex-col justify-center">
              <img
                src={`${import.meta.env.BASE_URL}logo-pawards-medcore-transparent.png`}
                alt="PAWARDS MedCore"
                className="h-48 w-auto object-contain object-left"
                style={{
                  filter: "drop-shadow(0 0 32px rgba(212,175,55,0.4)) drop-shadow(0 0 12px rgba(212,175,55,0.22))",
                }}
                data-testid="login-logo-principal"
              />
              <div
                className="mt-5 text-[10px] uppercase tracking-[0.4em]"
                style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
              >
                Motor Clínico Integrativo
              </div>
            </div>

            {/* CITAÇÃO INTEGRADA — conectada visualmente ao logo
                via barra dourada vertical à esquerda. Nome do fundador
                fica na MESMA linha-base da frase (não solto embaixo),
                garantindo coesão TDAH-friendly. */}
            <figure
              className="mt-10 pl-5 relative"
              data-testid="login-citacao"
              style={{ borderLeft: `2px solid ${GOLD}` }}
            >
              <blockquote
                className="text-[13px] italic leading-relaxed"
                style={{
                  color: INK,
                  fontFamily: "'Georgia', serif",
                  letterSpacing: "0.01em",
                }}
              >
                A excelência clínica começa pela consciência operacional.
              </blockquote>
              <figcaption
                className="mt-3 text-[9px] uppercase tracking-[0.4em] flex items-center gap-2"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <span style={{ color: GOLD }}>Caio Pádua</span>
                <span style={{ color: `${GOLD}66` }}>—</span>
                <span style={{ color: INK_MUTED }}>Fundador, Pawards Medcore</span>
              </figcaption>
            </figure>
          </div>

          {/* ============ COLUNA DIREITA — FORMULÁRIO ============ */}
          <div className="relative flex flex-col justify-center px-10 py-12">
            {/* Selo discreto canto sup dir */}
            <div
              className="text-[9px] font-bold uppercase tracking-[0.5em] mb-8 text-right"
              style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Entrada Segura
              <span className="inline-block w-2 h-2 ml-2 align-middle" style={{ background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
            </div>

            {/* CONTEÚDO DINÂMICO — mantém os 3 estados originais */}
            <div className="flex-1 flex flex-col justify-center">
              {avisoRecuperacao ? (
                <div className="space-y-5" data-testid="banner-recuperacao-2fa">
                  <div className="p-4 border-l-[3px]" style={{ background: "rgba(245,185,70,0.08)", borderLeftColor: "#F5B946" }} role="alert">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#F5B946" }} />
                      <div className="space-y-2">
                        <div className="font-bold uppercase tracking-[0.2em] text-xs" style={{ color: "#F5B946", fontFamily: "'JetBrains Mono', monospace" }}>
                          Login via código de recuperação
                        </div>
                        <div className="text-xs leading-relaxed" style={{ color: INK }}>
                          Restam <span className="font-mono font-bold" style={{ color: GOLD }}>{avisoRecuperacao.restantes}</span>
                          {avisoRecuperacao.total > 0 && (<> de <span className="font-mono font-bold" style={{ color: GOLD }}>{avisoRecuperacao.total}</span></>)} códigos. Recupere acesso ao app autenticador o quanto antes.
                        </div>
                        {avisoRecuperacao.restantes <= 2 && (
                          <div className="text-xs font-semibold pt-2 mt-2 border-t" style={{ color: "#E07A5F", borderColor: "#F5B94644" }}>
                            Restam apenas {avisoRecuperacao.restantes} códigos — regere agora.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvisoRecuperacao(null)}
                    className="w-full h-12 font-bold uppercase tracking-[0.25em] text-xs transition-all relative overflow-hidden group"
                    style={{ background: GOLD, color: NAVY_DEEP, fontFamily: "'JetBrains Mono', monospace" }}
                    data-testid="button-prosseguir-recuperacao"
                  >
                    <span className="relative z-10">Entendi, continuar</span>
                  </button>
                </div>
              ) : pendingTwoFactor ? (
                <div className="space-y-5" data-testid="form-2fa">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 mx-auto" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}44` }}>
                      <ShieldCheck className="w-6 h-6" style={{ color: CYAN }} />
                    </div>
                    <div className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}>
                      Verificação em duas etapas
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: INK_MUTED }}>
                      Digite o código de 6 dígitos do seu app autenticador. Sem o celular? Use um código de recuperação <span className="font-mono" style={{ color: GOLD }}>XXXX-XXXX</span>.
                    </div>
                    {pendingTwoFactor.email && (
                      <div className="text-[10px] uppercase tracking-[0.3em] pt-1" style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}>
                        {pendingTwoFactor.email}
                      </div>
                    )}
                  </div>
                  <Input
                    autoFocus
                    value={codigo2fa}
                    onChange={(e) => setCodigo2fa(e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, "").slice(0, 9))}
                    maxLength={9}
                    onKeyDown={(e) => { if (e.key === "Enter") void onSubmit2fa(); }}
                    autoComplete="one-time-code"
                    placeholder="000000 ou XXXX-XXXX"
                    disabled={verificando2fa}
                    className="rounded-none h-14 text-center text-xl tracking-[0.4em] font-mono border-2"
                    style={{
                      background: NAVY_DEEP,
                      borderColor: HAIRLINE,
                      color: GOLD_BRIGHT,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                    data-testid="input-codigo-2fa"
                  />
                  <button
                    type="button"
                    onClick={() => void onSubmit2fa()}
                    disabled={verificando2fa || codigo2fa.trim().length < 6}
                    className="w-full h-12 font-bold uppercase tracking-[0.25em] text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    style={{ background: GOLD, color: NAVY_DEEP, fontFamily: "'JetBrains Mono', monospace" }}
                    data-testid="button-verificar-2fa"
                  >
                    {verificando2fa ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Confirmar e entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => { cancelTwoFactor(); setCodigo2fa(""); }}
                    disabled={verificando2fa}
                    className="w-full text-[10px] uppercase tracking-[0.3em] py-2 transition-colors"
                    style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
                    data-testid="button-cancelar-2fa"
                  >
                    ← Voltar e usar outra conta
                  </button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            className="text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-1.5"
                            style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            <Mail className="w-3 h-3" /> Identificação
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="usuario@pawards.com.br"
                              {...field}
                              className="rounded-none h-12 border-2 text-sm"
                              style={{
                                background: NAVY_DEEP,
                                borderColor: HAIRLINE,
                                color: INK,
                                fontFamily: "'JetBrains Mono', monospace",
                                letterSpacing: "0.05em",
                              }}
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage style={{ color: "#E07A5F" }} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="senha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel
                            className="text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-1.5"
                            style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            <KeyRound className="w-3 h-3" /> Chave de Acesso
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={mostrarSenha ? "text" : "password"}
                                placeholder="••••••••••"
                                {...field}
                                className="rounded-none h-12 pr-11 border-2 text-sm"
                                style={{
                                  background: NAVY_DEEP,
                                  borderColor: HAIRLINE,
                                  color: INK,
                                  fontFamily: "'JetBrains Mono', monospace",
                                  letterSpacing: "0.15em",
                                }}
                                data-testid="input-senha"
                              />
                              <button
                                type="button"
                                onClick={() => setMostrarSenha((v) => !v)}
                                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                                tabIndex={-1}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-colors"
                                style={{ color: INK_MUTED }}
                                data-testid="button-mostrar-senha"
                              >
                                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage style={{ color: "#E07A5F" }} />
                        </FormItem>
                      )}
                    />

                    {/* Botão de entrada — gold sólido com glow sutil */}
                    <Button
                      type="submit"
                      className="w-full h-12 mt-6 font-bold uppercase tracking-[0.3em] rounded-none text-xs border-2 transition-all relative overflow-hidden group"
                      style={{
                        background: GOLD,
                        color: NAVY_DEEP,
                        borderColor: GOLD_BRIGHT,
                        boxShadow: `0 0 20px rgba(212,175,55,0.3), inset 0 0 0 1px rgba(255,255,255,0.15)`,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                      data-testid="button-login"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Entrar no Motor
                      </span>
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </div>
          {/* fim grid 2 colunas */}
        </div>

        {/* RÉGUA DE SELOS DE SEGURANÇA — full-width abaixo do painel.
            6 certificações reais, espaçadas igualmente (TDAH/TOC).
            Hover mostra tooltip sem mover layout. */}
        <div
          className="grid grid-cols-6"
          style={{ background: NAVY_DEEP, borderTop: `1px solid ${GOLD}33`, borderBottom: `1px solid ${GOLD}33` }}
          data-testid="login-selos-seguranca"
        >
          {[
            { icone: Scale, label: "LGPD", titulo: "Lei Geral de Proteção de Dados — auditoria + retenção 12 meses" },
            { icone: FileSignature, label: "ICP-BR", titulo: "Assinatura digital ICP-Brasil via ZapSign" },
            { icone: Fingerprint, label: "2FA", titulo: "Autenticação em duas etapas (TOTP)" },
            { icone: KeySquare, label: "JWT", titulo: "Sessão blindada com JSON Web Token + refresh seguro" },
            { icone: Lock, label: "AUDIT", titulo: "Auditoria cascata em todas as operações sensíveis" },
            { icone: Network, label: "mTLS", titulo: "Mutual TLS no perímetro de rede" },
          ].map(({ icone: Icone, label, titulo }) => (
            <div
              key={label}
              title={titulo}
              className="flex items-center justify-center gap-2 py-3 border-r last:border-r-0"
              style={{ borderColor: `${GOLD}15` }}
            >
              <Icone className="w-3 h-3" style={{ color: CYAN, opacity: 0.85 }} strokeWidth={1.5} />
              <span
                className="text-[8px] font-bold uppercase tracking-[0.3em]"
                style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Rodapé externo — assinatura institucional dupla
            espelhando o rodapé do WhatsApp oficial. */}
        <div
          className="mt-6 flex items-center justify-center gap-4 text-[8px] uppercase tracking-[0.35em]"
          style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span style={{ color: GOLD }}>PAWARDS MedCore<sup style={{ color: CYAN, fontSize: "6px" }}>®</sup></span>
          <span style={{ color: HAIRLINE }}>│</span>
          <span style={{ color: GOLD }}>PADCON Platform<sup style={{ color: CYAN, fontSize: "6px" }}>®</sup></span>
        </div>
      </div>
    </div>
  );
}
