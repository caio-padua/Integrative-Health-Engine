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
const NAVY = "#000000";
const NAVY_DEEP = "#000000";
const NAVY_SOFT = "#000000";
const GOLD = "#D4AF37";
const GOLD_BRIGHT = "#F0CE5A";
const CYAN = "#5EE6E6";
const INK = "#E5E7EB";
const INK_MUTED = "#9CA3AF";
const HAIRLINE = "#1F2937";

export default function Login() {
  const { user, login, isLoading, pendingTwoFactor, cancelTwoFactor, verifyTwoFactor, loginDev } = useAuth();
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
        background: "#000000",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Keyframes locais — pulso "ATIVO" das bolinhas de status e
          dos selos de segurança. Velocidade lenta (2.4s) pra não
          virar ruído visual TDAH. */}
      <style>{`
        @keyframes pulseStatus {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px ${CYAN}, 0 0 0 0 ${CYAN}66; }
          50%      { opacity: 0.45; box-shadow: 0 0 12px ${CYAN}, 0 0 0 6px ${CYAN}11; }
        }
        @keyframes pulseSeal {
          0%, 100% { box-shadow: inset 0 0 0 1px ${GOLD}66, 0 0 0 0 ${CYAN}00; }
          50%      { box-shadow: inset 0 0 0 1px ${GOLD}AA, 0 0 8px ${CYAN}55; }
        }
        .pulse-status { animation: pulseStatus 2.4s ease-in-out infinite; }
        .pulse-seal   { animation: pulseSeal 3.2s ease-in-out infinite; }
      `}</style>
      {/* Sem vinheta, sem grid técnico — pedido Caio 21/mai/2026:
          fundo PRETO PURO, nada de linhas horizontais/verticais. */}

      {/* As assinaturas PAWARDS / PADCON foram movidas pro canto
          inferior direito do painel (maiores e em bloco coeso). */}

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
          {/* ============ COLUNA ESQUERDA — IDENTIDADE ============
              Logo único (símbolo D + wordmark PAWARDS MEDCORE) ocupa
              a coluna inteira. Ambas as colunas com a MESMA altura
              (min-h-[380px]) + padding idêntico (py-12) pra que:
              · TOPO do símbolo se alinhe com label IDENTIFICAÇÃO
              · BASE do wordmark se alinhe com base do BOTÃO ENTRAR. */}
          <div
            className="relative flex flex-col items-start px-10 py-12 md:border-r min-h-[380px]"
            style={{ borderColor: `${GOLD}22` }}
          >
            <img
              src={`${import.meta.env.BASE_URL}logo-pawards-medcore-transparent.png`}
              alt="PAWARDS MedCore"
              className="h-full w-auto object-contain object-left"
              style={{
                filter: "drop-shadow(0 0 32px rgba(212,175,55,0.4)) drop-shadow(0 0 12px rgba(212,175,55,0.22))",
              }}
              data-testid="login-logo-principal"
            />
          </div>

          {/* ============ COLUNA DIREITA — FORMULÁRIO ============ */}
          <div className="relative flex flex-col justify-center px-10 py-12 min-h-[380px]">
            <div className="flex flex-col">
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
                <>
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
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={() => void loginDev()}
                    className="w-full h-11 mt-3 font-bold uppercase tracking-[0.18em] text-[11px] flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: "transparent",
                      color: CYAN,
                      border: `1px dashed ${CYAN}88`,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                    data-testid="button-login-dev"
                  >
                    Entrar em modo teste (DEV) — sem email nem senha
                  </button>
                )}
                </>
              )}
            </div>
          </div>
          {/* fim grid 2 colunas */}
        </div>

        {/* FAIXA INFERIOR — citação institucional centralizada
            (alinhada visualmente entre a coluna do logo e a coluna
            dos inputs) + bloco de assinaturas PAWARDS / PADCON no
            canto inferior direito, maiores e em bloco coeso.
            Grid 3 colunas: spacer-esquerdo / citação centro /
            assinaturas direita. Garante que a citação fique
            opticamente centrada entre o eixo do logo e o eixo
            dos campos de entrada. */}
        <div
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-10 py-6"
          style={{ background: NAVY_DEEP, borderTop: `1px solid ${GOLD}33` }}
        >
          {/* Coluna esquerda — spacer (mantém centro óptico) */}
          <div />

          {/* Citação centralizada — nome do fundador na MESMA fonte
              e cor da frase (Georgia/INK) por pedido Caio. Hierarquia
              mantida: frase em itálico, nome em redondo. */}
          <figure
            className="text-center max-w-[560px] mx-auto"
            data-testid="login-citacao"
          >
            <blockquote
              className="text-[13px] italic leading-relaxed"
              style={{
                color: INK,
                fontFamily: "'Georgia', serif",
                letterSpacing: "0.01em",
              }}
            >
              “A excelência clínica começa pela consciência operacional.”
            </blockquote>
            <figcaption
              className="mt-3 flex items-center justify-center gap-3"
              style={{
                fontFamily: "'Georgia', serif",
                color: INK,
              }}
            >
              <span className="text-[13px]">Dr. Caio Henrique Fernandes Pádua</span>
            </figcaption>
          </figure>

          {/* BLOCO ASSINATURAS + STATUS — canto inferior direito.
              Topo: PAWARDS MedCore® + PADCON Platform® com ® em
              DOURADO (mesma cor da marca) e linhas delimitando
              acima e abaixo de cada marca.
              Base: 2 indicadores "ATIVO" com bolinhas ciano pulsando
              — resumo das ferramentas de segurança em uso. */}
          <div
            className="justify-self-end text-right pl-6"
            style={{ borderLeft: `1px solid ${GOLD}33` }}
            data-testid="login-assinaturas"
          >
            {/* PAWARDS — sem linhas horizontais (pedido Caio) */}
            <div className="py-2">
              <div
                className="text-[13px] font-bold uppercase tracking-[0.35em]"
                style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
              >
                PAWARDS MedCore<sup style={{ color: GOLD, fontSize: "9px" }}>®</sup>
              </div>
              <div
                className="text-[8px] mt-0.5 tracking-[0.3em] uppercase italic"
                style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
              >
                Clinical Intelligence System
              </div>
            </div>

            {/* PADCON — sem linhas horizontais */}
            <div className="py-2">
              <div
                className="text-[13px] font-bold uppercase tracking-[0.35em]"
                style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
              >
                PADCON Platform<sup style={{ color: GOLD, fontSize: "9px" }}>®</sup>
              </div>
              <div
                className="text-[8px] mt-0.5 tracking-[0.3em] uppercase italic"
                style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
              >
                Advanced Systems Architecture
              </div>
            </div>

            {/* INDICADORES DE STATUS — bolinhas ciano pulsando lento.
                Funcionam como "resumo executivo" dos 6 selos abaixo:
                "tudo isto está ATIVO neste momento". */}
            <div className="pt-3 flex flex-col items-end gap-1.5">
              {[
                { label: "Acesso Restrito" },
                { label: "Entrada Segura" },
              ].map(({ label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className="text-[9px] uppercase tracking-[0.35em] font-bold"
                    style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {label}
                  </span>
                  <span
                    className="pulse-status inline-block w-2 h-2 rounded-full"
                    style={{ background: CYAN }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RÉGUA DE SELOS DE SEGURANÇA — full-width abaixo do painel.
            Cada ícone agora vive numa CAIXA com borda dourada que
            pulsa lentamente (efeito "ativação"). Ícone ciano maior
            e label dourada legível. Aproxima a estética de um painel
            técnico militar/aeronáutico ativo. */}
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
          ].map(({ icone: Icone, label, titulo }, idx) => (
            <div
              key={label}
              title={titulo}
              className="flex items-center justify-center gap-3 py-4 border-r last:border-r-0"
              style={{ borderColor: `${GOLD}15` }}
            >
              <div
                className="pulse-seal flex items-center justify-center w-9 h-9"
                style={{ background: `${CYAN}10`, animationDelay: `${idx * 0.35}s` }}
              >
                <Icone className="w-5 h-5" style={{ color: CYAN }} strokeWidth={1.8} />
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.35em]"
                style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
