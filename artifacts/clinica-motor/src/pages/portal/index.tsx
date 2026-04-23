import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileCheck, User, Calendar, Shield,
  Activity, Brain, Pill, AlertTriangle, FolderOpen,
  Heart, ChevronLeft, CalendarDays, Clock, RefreshCw,
  Lock, Eye, EyeOff, CheckCircle, Mail, History, MessageCircle, ExternalLink, FileText
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const CATEGORIAS_UPLOAD = [
  "EXAME DE SANGUE", "ULTRASSOM", "COMPROVANTE DE PAGAMENTO",
  "FOTO / IMAGEM", "RECEITA", "LAUDO", "ATESTADO", "CONTRATO", "OUTRO"
];

const FORMATOS_ACEITOS = ".pdf,.jpg,.jpeg,.png,.heic,.heif,.doc,.docx";

const TIPOS_ALERTA = [
  { value: "PRESSAO_ALTA", label: "Pressao Alta", icon: "🔴" },
  { value: "PRESSAO_BAIXA", label: "Pressao Baixa", icon: "🔵" },
  { value: "GLICEMIA_ALTA", label: "Glicemia Alta", icon: "🟠" },
  { value: "GLICEMIA_BAIXA", label: "Glicemia Baixa", icon: "🟡" },
  { value: "EFEITO_COLATERAL", label: "Efeito Colateral", icon: "⚠️" },
  { value: "DOR_AGUDA", label: "Dor Aguda", icon: "🔴" },
  { value: "MAL_ESTAR", label: "Mal Estar", icon: "🟠" },
  { value: "DUVIDA_MEDICACAO", label: "Duvida sobre Medicacao", icon: "❓" },
  { value: "ESQUECEU_DOSE", label: "Esqueceu uma Dose", icon: "⏰" },
  { value: "OUTRO", label: "Outro", icon: "📝" },
];

const INDICADORES_SINAIS = [
  { key: "PA_SISTOLICA", label: "PA Sistolica", unidade: "mmHg" },
  { key: "PA_DIASTOLICA", label: "PA Diastolica", unidade: "mmHg" },
  { key: "FREQUENCIA_CARDIACA", label: "Freq. Cardiaca", unidade: "bpm" },
  { key: "GLICEMIA_JEJUM", label: "Glicemia Jejum", unidade: "mg/dL" },
  { key: "PESO", label: "Peso", unidade: "kg" },
  { key: "CINTURA", label: "Cintura", unidade: "cm" },
];

const INDICADORES_SINTOMAS = [
  "Sono", "Energia", "Disposicao", "Atividade Fisica", "Foco",
  "Concentracao", "Libido", "Forca", "Emagrecimento", "Hipertrofia",
  "Definicao", "Resistencia", "Massa Magra", "Estresse", "Humor"
];

const INDICADORES_KEYS = [
  "sono", "energia", "disposicao", "atividadeFisica", "foco",
  "concentracao", "libido", "forca", "emagrecimento", "hipertrofia",
  "definicao", "resistencia", "massaMagra", "estresse", "humor"
];

type Section = "menu" | "sinais" | "sintomas" | "formulas" | "alertas" | "upload" | "agendamentos" | "historico" | "drive";

// Wave 4 PACIENTE-TSUNAMI · WhatsApp Dr. Caio (configurável via env futura)
const WHATSAPP_DR_CAIO = "554196050000";

export default function PortalClientePage() {
  const [step, setStep] = useState<"identificacao" | "senha" | "definir_senha" | "portal" | "otp_codigo">("identificacao");
  const [section, setSection] = useState<Section>("menu");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [senha, setSenha] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [paciente, setPaciente] = useState<{ id: number; nome: string } | null>(null);
  // Wave 4 PACIENTE-TSUNAMI · OTP state
  const [otpCodigo, setOtpCodigo] = useState("");
  const [otpDestinoMascarado, setOtpDestinoMascarado] = useState("");
  const [otpPacienteId, setOtpPacienteId] = useState<number | null>(null);
  const [otpEnviando, setOtpEnviando] = useState(false);
  const { toast } = useToast();

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleIdentificar = async () => {
    if (!cpf || !dataNascimento) {
      toast({ title: "Informe CPF e data de nascimento", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/portal/identificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, dataNascimento }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Erro ao identificar", variant: "destructive" });
        return;
      }
      const data = await res.json();
      if (data.temSenha) {
        setStep("senha");
      } else {
        setStep("definir_senha");
      }
      setPaciente({ id: data.id, nome: data.nome });
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
  };

  const handleLogin = async () => {
    if (!senha) {
      toast({ title: "Informe sua senha", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, senha }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Senha incorreta", variant: "destructive" });
        return;
      }
      const data = await res.json();
      setPaciente({ id: data.id, nome: data.nome });
      setStep("portal");
      setSection("menu");
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
  };

  const handleDefinirSenha = async () => {
    if (!novaSenha || novaSenha.length < 6) {
      toast({ title: "Senha deve ter no minimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast({ title: "As senhas nao conferem", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/portal/definir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, dataNascimento, senha: novaSenha }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Erro ao definir senha", variant: "destructive" });
        return;
      }
      toast({ title: "Senha definida com sucesso!" });
      setStep("portal");
      setSection("menu");
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
  };

  // ===== Wave 4 PACIENTE-TSUNAMI · OTP handlers =====
  const handleSolicitarOtp = async () => {
    if (!cpf || !dataNascimento) {
      toast({ title: "Preencha CPF e data de nascimento", variant: "destructive" });
      return;
    }
    setOtpEnviando(true);
    try {
      const res = await fetch(`/api/portal/otp/solicitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, dataNascimento }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Erro ao solicitar codigo", variant: "destructive" });
        setOtpEnviando(false);
        return;
      }
      setOtpPacienteId(data.paciente_id);
      setOtpDestinoMascarado(data.destino_mascarado || "");
      setPaciente({ id: data.paciente_id, nome: data.nome });
      setStep("otp_codigo");
      toast({ title: `Codigo enviado para ${data.destino_mascarado}` });
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    } finally {
      setOtpEnviando(false);
    }
  };

  const handleValidarOtp = async () => {
    if (!otpCodigo || !/^\d{6}$/.test(otpCodigo.trim())) {
      toast({ title: "Digite o codigo de 6 digitos", variant: "destructive" });
      return;
    }
    if (!otpPacienteId) {
      toast({ title: "Sessao OTP perdida — solicite novamente", variant: "destructive" });
      setStep("identificacao");
      return;
    }
    try {
      const res = await fetch(`/api/portal/otp/validar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paciente_id: otpPacienteId, codigo: otpCodigo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Codigo invalido", variant: "destructive" });
        return;
      }
      setPaciente({ id: data.id, nome: data.nome });
      setStep("portal");
      setSection("menu");
      setOtpCodigo("");
      toast({ title: "Acesso liberado!" });
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(215,28%,9%)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center bg-white/90 border border-border p-2">
            <img src={`${BASE_URL}logo-dp.png`} alt="DP" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight uppercase">Portal do Cliente</h1>
          <p className="text-xs text-muted-foreground mt-1">Pawards — Acompanhamento Clinico</p>
        </div>

        {step === "identificacao" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />Identificacao
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">CPF</Label>
                <Input placeholder="000.000.000-00" value={cpf}
                  onChange={e => setCpf(formatCPF(e.target.value))}
                  className="mt-1 font-mono text-center text-lg tracking-wider" maxLength={14} />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />Data de Nascimento
                </Label>
                <Input type="date" value={dataNascimento}
                  onChange={e => setDataNascimento(e.target.value)} className="mt-1" />
              </div>
              <Button className="w-full" onClick={handleIdentificar}>Continuar com senha</Button>
              <Button
                variant="outline"
                className="w-full border-[#C89B3C]/40 text-[#C89B3C] hover:bg-[#C89B3C]/10"
                disabled={otpEnviando}
                onClick={handleSolicitarOtp}
              >
                <Mail className="h-4 w-4 mr-2" />
                {otpEnviando ? "Enviando..." : "Receber codigo por email"}
              </Button>
              <div className="text-[9px] text-center text-muted-foreground flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" />Seus dados estao protegidos pela LGPD (Lei 13.709/2018)
              </div>
            </CardContent>
          </Card>
        )}

        {step === "otp_codigo" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />Codigo por Email
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Enviamos um codigo de 6 digitos para <strong>{otpDestinoMascarado}</strong>.
                Verifique sua caixa de entrada (e o spam). Validade: 10 minutos.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Codigo de 6 digitos</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCodigo}
                  onChange={e => setOtpCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={e => e.key === "Enter" && handleValidarOtp()}
                  className="mt-1 font-mono text-center text-2xl tracking-[8px]"
                />
              </div>
              <Button className="w-full" onClick={handleValidarOtp}>Validar codigo</Button>
              <Button
                variant="ghost" size="sm" className="w-full text-muted-foreground"
                onClick={() => { setStep("identificacao"); setOtpCodigo(""); setOtpPacienteId(null); }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Voltar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "senha" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4" />Senha
              </CardTitle>
              {paciente && <p className="text-xs text-muted-foreground">Ola, {paciente.nome.split(" ")[0]}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sua Senha</Label>
                <div className="relative mt-1">
                  <Input type={showSenha ? "text" : "password"} value={senha}
                    onChange={e => setSenha(e.target.value)} placeholder="Digite sua senha"
                    onKeyDown={e => e.key === "Enter" && handleLogin()} />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowSenha(!showSenha)}>
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full" onClick={handleLogin}>Entrar</Button>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground"
                onClick={() => { setStep("identificacao"); setSenha(""); }}>
                <ChevronLeft className="h-4 w-4 mr-1" />Voltar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "definir_senha" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4" />Primeiro Acesso
              </CardTitle>
              {paciente && <p className="text-xs text-muted-foreground">Ola, {paciente.nome.split(" ")[0]}! Crie uma senha para acessar o portal.</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nova Senha</Label>
                <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Minimo 6 caracteres" className="mt-1" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Confirmar Senha</Label>
                <Input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha" className="mt-1"
                  onKeyDown={e => e.key === "Enter" && handleDefinirSenha()} />
              </div>
              <Button className="w-full" onClick={handleDefinirSenha}>Criar Senha e Entrar</Button>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground"
                onClick={() => { setStep("identificacao"); setNovaSenha(""); setConfirmarSenha(""); }}>
                <ChevronLeft className="h-4 w-4 mr-1" />Voltar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "portal" && paciente && (
          <>
            {section !== "menu" && (
              <Button variant="ghost" size="sm" className="text-muted-foreground mb-2"
                onClick={() => setSection("menu")}>
                <ChevronLeft className="h-4 w-4 mr-1" />Voltar ao Menu
              </Button>
            )}

            {section === "menu" && <PortalMenu paciente={paciente} onSelect={setSection} onLogout={() => { setStep("identificacao"); setPaciente(null); setSenha(""); }} />}
            {section === "agendamentos" && <AgendamentosSection pacienteId={paciente.id} pacienteNome={paciente.nome} />}
            {section === "sinais" && <SinaisVitaisForm pacienteId={paciente.id} />}
            {section === "sintomas" && <SintomasForm pacienteId={paciente.id} />}
            {section === "formulas" && <FormulasForm pacienteId={paciente.id} />}
            {section === "alertas" && <AlertasForm pacienteId={paciente.id} />}
            {section === "upload" && <UploadForm pacienteId={paciente.id} pacienteNome={paciente.nome} />}
            {section === "historico" && <HistoricoSection pacienteId={paciente.id} />}
            {section === "drive" && <DriveSection pacienteId={paciente.id} />}
          </>
        )}
      </div>
    </div>
  );
}

function PortalMenu({ paciente, onSelect, onLogout }: { paciente: { id: number; nome: string }; onSelect: (s: Section) => void; onLogout: () => void }) {
  const menuItems = [
    { key: "agendamentos" as Section, icon: CalendarDays, label: "Meus Agendamentos", desc: "Consultas, reagendamentos", color: "text-cyan-400" },
    { key: "sinais" as Section, icon: Activity, label: "Mapa de Sinais Vitais", desc: "PA, glicemia, peso, cintura", color: "text-red-400" },
    { key: "sintomas" as Section, icon: Brain, label: "Sintomas e Bem-Estar", desc: "Sono, energia, foco, humor...", color: "text-blue-400" },
    { key: "formulas" as Section, icon: Pill, label: "Formulas em Uso", desc: "Aderencia e efeitos colaterais", color: "text-green-400" },
    { key: "alertas" as Section, icon: AlertTriangle, label: "Enviar Alerta", desc: "Sinais de alerta para a equipe", color: "text-yellow-400" },
    { key: "upload" as Section, icon: Upload, label: "Enviar Documentos", desc: "Exames, comprovantes, laudos", color: "text-purple-400" },
    { key: "historico" as Section, icon: History, label: "Meu Historico", desc: "Documentos, assinaturas e cobrancas", color: "text-amber-400" },
    { key: "drive" as Section, icon: FolderOpen, label: "Meus Documentos no Drive", desc: "Pasta da clinica e arquivos", color: "text-orange-400" },
  ];

  return (
    <div className="space-y-3">
      <Card className="border-primary/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Heart className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-white">Ola, {paciente.nome.split(" ")[0]}!</p>
            <p className="text-[10px] text-muted-foreground">Selecione o que deseja registrar</p>
          </div>
        </CardContent>
      </Card>

      {menuItems.map(item => (
        <Card key={item.key} className="cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => onSelect(item.key)}>
          <CardContent className="p-4 flex items-center gap-3">
            <item.icon className={`h-6 w-6 ${item.color}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
          </CardContent>
        </Card>
      ))}

      <a
        href={`https://wa.me/${WHATSAPP_DR_CAIO}?text=${encodeURIComponent(`Ola, sou ${paciente.nome.split(" ")[0]} (paciente #${paciente.id}). Preciso falar com o Dr. Caio.`)}`}
        target="_blank" rel="noopener noreferrer"
      >
        <Button variant="outline" className="w-full mt-2 border-green-500/40 text-green-400 hover:bg-green-500/10">
          <MessageCircle className="h-4 w-4 mr-2" />Falar com Dr. Caio (WhatsApp)
        </Button>
      </a>

      <Button variant="outline" size="sm" className="w-full mt-2" onClick={onLogout}>Sair</Button>
    </div>
  );
}

// ===== Wave 4 PACIENTE-TSUNAMI · Historico =====
function HistoricoSection({ pacienteId }: { pacienteId: number }) {
  const [itens, setItens] = useState<Array<{ tipo: string; id: number | string; descricao: string; status: string; data: string; link: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/historico/${pacienteId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelado) setItens(data.itens || []);
      } catch (e: any) {
        if (!cancelado) setErro(e.message || "Erro ao carregar");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [pacienteId]);

  const tipoIcon = (t: string) => t === "ASSINATURA" ? FileCheck : t === "SOLICITACAO" ? FileText : t === "COBRANCA" ? Pill : History;
  const tipoColor = (t: string) => t === "ASSINATURA" ? "text-green-400" : t === "SOLICITACAO" ? "text-amber-400" : t === "COBRANCA" ? "text-cyan-400" : "text-muted-foreground";

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" />Meu Historico</CardTitle>
          <p className="text-xs text-muted-foreground">Documentos, assinaturas e cobrancas</p>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-xs text-muted-foreground py-4 text-center">Carregando...</p>}
          {erro && <p className="text-xs text-red-400 py-4 text-center">{erro}</p>}
          {!loading && !erro && itens.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum registro encontrado.</p>
          )}
          {!loading && itens.length > 0 && (
            <div className="space-y-2">
              {itens.map((it, idx) => {
                const Icon = tipoIcon(it.tipo);
                return (
                  <div key={`${it.tipo}-${it.id}-${idx}`} className="flex items-start gap-2 p-2 border border-border/40 rounded">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${tipoColor(it.tipo)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{it.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {it.tipo} · {it.status} · {new Date(it.data).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {it.link && (
                      <a href={it.link} target="_blank" rel="noopener noreferrer" className="text-[#C89B3C]">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Wave 4 PACIENTE-TSUNAMI · Drive =====
function DriveSection({ pacienteId }: { pacienteId: number }) {
  const [info, setInfo] = useState<{ folder_id: string | null; folder_url: string | null; nome: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/drive-links/${pacienteId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelado) setInfo(data);
      } catch (e: any) {
        if (!cancelado) setErro(e.message || "Erro ao carregar");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [pacienteId]);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="h-4 w-4" />Meus Documentos no Drive</CardTitle>
          <p className="text-xs text-muted-foreground">Pasta com seus exames, contratos e laudos</p>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-xs text-muted-foreground py-4 text-center">Carregando...</p>}
          {erro && <p className="text-xs text-red-400 py-4 text-center">{erro}</p>}
          {!loading && info && !info.folder_id && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Sua pasta no Drive ainda nao foi criada. Fale com a equipe.
            </p>
          )}
          {!loading && info?.folder_url && (
            <div className="space-y-3">
              <div className="p-3 border border-border/40 rounded">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pasta de</p>
                <p className="text-sm font-medium text-white">{info.nome}</p>
              </div>
              <a href={info.folder_url} target="_blank" rel="noopener noreferrer">
                <Button className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />Abrir minha pasta no Google Drive
                </Button>
              </a>
              <p className="text-[9px] text-center text-muted-foreground">
                A pasta abre em uma nova aba. Voce precisara estar logado na conta do Google que tem acesso.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SinaisVitaisForm({ pacienteId }: { pacienteId: number }) {
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().split("T")[0]);
  const [valores, setValores] = useState<Record<string, { valor: string; horario: string }[]>>(() => {
    const init: Record<string, { valor: string; horario: string }[]> = {};
    INDICADORES_SINAIS.forEach(ind => {
      init[ind.key] = Array.from({ length: 4 }, () => ({ valor: "", horario: "" }));
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const indicadores = [];
      for (const ind of INDICADORES_SINAIS) {
        const slots = valores[ind.key];
        const hasData = slots.some(s => s.valor !== "");
        if (!hasData) continue;

        const registro: any = { indicador: ind.key, origem: "PACIENTE" };
        slots.forEach((s, i) => {
          if (s.valor) {
            registro[`hora${i + 1}Valor`] = parseFloat(s.valor);
            registro[`hora${i + 1}Horario`] = s.horario || undefined;
          }
        });
        indicadores.push(registro);
      }

      if (indicadores.length === 0) {
        toast({ title: "Preencha pelo menos um valor", variant: "destructive" });
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/monitoramento/sinais-vitais/lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId, dataRegistro, indicadores }),
      });

      if (!res.ok) throw new Error("Erro ao salvar");
      toast({ title: "Sinais vitais registrados!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-red-400" />Mapa de Sinais Vitais
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Registre ate 4 medicoes por dia</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data</Label>
          <Input type="date" value={dataRegistro} onChange={e => setDataRegistro(e.target.value)} className="mt-1" />
        </div>

        {INDICADORES_SINAIS.map(ind => (
          <div key={ind.key} className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {ind.label} ({ind.unidade})
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {valores[ind.key].map((slot, i) => (
                <div key={i} className="flex gap-1">
                  <Input
                    type="number"
                    placeholder={`Med ${i + 1}`}
                    value={slot.valor}
                    onChange={e => {
                      const copy = { ...valores };
                      copy[ind.key] = [...copy[ind.key]];
                      copy[ind.key][i] = { ...copy[ind.key][i], valor: e.target.value };
                      setValores(copy);
                    }}
                    className="flex-1 text-xs"
                  />
                  <Input
                    type="time"
                    value={slot.horario}
                    onChange={e => {
                      const copy = { ...valores };
                      copy[ind.key] = [...copy[ind.key]];
                      copy[ind.key][i] = { ...copy[ind.key][i], horario: e.target.value };
                      setValores(copy);
                    }}
                    className="w-24 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Registrar Sinais"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SintomasForm({ pacienteId }: { pacienteId: number }) {
  const [dataSemana, setDataSemana] = useState(new Date().toISOString().split("T")[0]);
  const [valores, setValores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    INDICADORES_KEYS.forEach(k => { init[k] = 5; });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const getColor = (key: string, value: number) => {
    const isInvertido = key === "estresse";
    if (isInvertido) {
      if (value > 7) return "bg-red-500";
      if (value > 5) return "bg-yellow-500";
      if (value > 3) return "bg-blue-400";
      return "bg-green-500";
    }
    if (value >= 7) return "bg-green-500";
    if (value >= 5) return "bg-blue-400";
    if (value >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/monitoramento/tracking-sintomas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId, dataSemana, ...valores, origem: "PACIENTE" }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      toast({ title: "Sintomas registrados!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-400" />Sintomas e Bem-Estar
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Avalie de 0 (pessimo) a 10 (excelente). Estresse: 0 = sem estresse</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Semana de referencia</Label>
          <Input type="date" value={dataSemana} onChange={e => setDataSemana(e.target.value)} className="mt-1" />
        </div>

        {INDICADORES_KEYS.map((key, i) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs w-28 text-muted-foreground">{INDICADORES_SINTOMAS[i]}</span>
            <input
              type="range"
              min="0" max="10" step="0.5"
              value={valores[key]}
              onChange={e => setValores({ ...valores, [key]: parseFloat(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className={`text-xs font-mono w-8 text-center px-1 py-0.5 ${getColor(key, valores[key])} text-white`}>
              {valores[key]}
            </span>
          </div>
        ))}

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Registrar Sintomas"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FormulasForm({ pacienteId }: { pacienteId: number }) {
  const [nomeBlend, setNomeBlend] = useState("");
  const [aderencia, setAderencia] = useState("ALTA");
  const [bemEstar, setBemEstar] = useState(true);
  const [senteResultado, setSenteResultado] = useState("SIM");
  const [efeitoColateral1, setEfeitoColateral1] = useState("NENHUM");
  const [efeitoColateral2, setEfeitoColateral2] = useState("NENHUM");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!nomeBlend) {
      toast({ title: "Informe o nome da formula", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/monitoramento/acompanhamento-formula`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId, nomeBlend, aderencia, bemEstar, senteResultado,
          efeitoColateral1, efeitoColateral2, observacao, origem: "PACIENTE",
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      toast({ title: "Feedback registrado!" });
      setNomeBlend(""); setObservacao("");
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Pill className="h-4 w-4 text-green-400" />Feedback das Formulas
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Nos conte como voce esta se sentindo com as formulas</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome da Formula / Blend</Label>
          <Input placeholder="Ex: Blend Sono Noite" value={nomeBlend} onChange={e => setNomeBlend(e.target.value)} className="mt-1" />
        </div>

        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Aderencia</Label>
          <select className="w-full bg-card border border-border text-sm px-3 py-2 mt-1"
            value={aderencia} onChange={e => setAderencia(e.target.value)}>
            <option value="ALTA">Alta - Tomo todos os dias</option>
            <option value="MEDIA">Media - Esqueco as vezes</option>
            <option value="BAIXA">Baixa - Esqueco frequentemente</option>
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Bem-estar</Label>
            <select className="w-full bg-card border border-border text-sm px-3 py-2 mt-1"
              value={bemEstar ? "SIM" : "NAO"} onChange={e => setBemEstar(e.target.value === "SIM")}>
              <option value="SIM">Sim</option>
              <option value="NAO">Nao</option>
            </select>
          </div>
          <div className="flex-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sente resultado?</Label>
            <select className="w-full bg-card border border-border text-sm px-3 py-2 mt-1"
              value={senteResultado} onChange={e => setSenteResultado(e.target.value)}>
              <option value="SIM">Sim</option>
              <option value="PARCIAL">Parcial</option>
              <option value="NAO">Nao</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Efeito Colateral 1</Label>
            <Input placeholder="Nenhum" value={efeitoColateral1} onChange={e => setEfeitoColateral1(e.target.value)} className="mt-1" />
          </div>
          <div className="flex-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Efeito Colateral 2</Label>
            <Input placeholder="Nenhum" value={efeitoColateral2} onChange={e => setEfeitoColateral2(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Observacao</Label>
          <textarea className="w-full bg-card border border-border text-sm px-3 py-2 mt-1 min-h-[60px]"
            placeholder="Algo que queira nos contar..." value={observacao} onChange={e => setObservacao(e.target.value)} />
        </div>

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Enviando..." : "Enviar Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AlertasForm({ pacienteId }: { pacienteId: number }) {
  const [tipoAlerta, setTipoAlerta] = useState("");
  const [gravidade, setGravidade] = useState("LEVE");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!tipoAlerta) {
      toast({ title: "Selecione o tipo de alerta", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/alerta-paciente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId, tipoAlerta, gravidade, descricao }),
      });
      if (!res.ok) throw new Error("Erro ao enviar");
      setEnviado(true);
    } catch {
      toast({ title: "Erro ao enviar alerta", variant: "destructive" });
    }
    setSaving(false);
  };

  if (enviado) {
    return (
      <Card className="border-yellow-500/30">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-yellow-400" />
          <h2 className="text-lg font-bold">Alerta Enviado!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Nossa equipe recebeu seu alerta e entrara em contato em breve.
          </p>
          <Button className="mt-4" onClick={() => { setEnviado(false); setTipoAlerta(""); setDescricao(""); }}>
            Enviar Outro Alerta
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />Enviar Alerta
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Selecione o tipo e nossa equipe sera notificada</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {TIPOS_ALERTA.map(tipo => (
            <div
              key={tipo.value}
              className={`border p-3 cursor-pointer text-center transition-colors ${
                tipoAlerta === tipo.value ? "border-yellow-500 bg-yellow-500/10" : "border-border hover:border-border/80"
              }`}
              onClick={() => setTipoAlerta(tipo.value)}
            >
              <span className="text-lg">{tipo.icon}</span>
              <p className="text-[10px] mt-1">{tipo.label}</p>
            </div>
          ))}
        </div>

        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Gravidade</Label>
          <select className="w-full bg-card border border-border text-sm px-3 py-2 mt-1"
            value={gravidade} onChange={e => setGravidade(e.target.value)}>
            <option value="LEVE">Leve - Nao urgente</option>
            <option value="MODERADO">Moderado - Preciso de orientacao</option>
            <option value="GRAVE">Grave - Preciso de atencao urgente</option>
          </select>
        </div>

        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Descreva o que esta sentindo</Label>
          <textarea className="w-full bg-card border border-border text-sm px-3 py-2 mt-1 min-h-[80px]"
            placeholder="Descreva com suas palavras..." value={descricao} onChange={e => setDescricao(e.target.value)} />
        </div>

        <Button className="w-full bg-yellow-600 hover:bg-yellow-700" onClick={handleSave} disabled={saving || !tipoAlerta}>
          {saving ? "Enviando..." : "Enviar Alerta para a Equipe"}
        </Button>
      </CardContent>
    </Card>
  );
}

function UploadForm({ pacienteId, pacienteNome }: { pacienteId: number; pacienteNome: string }) {
  const [categoria, setCategoria] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!arquivo || !categoria) {
      toast({ title: "Selecione categoria e arquivo", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(`/api/portal/upload/${pacienteId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoria, arquivo: base64, nomeArquivo: arquivo.name, mimeType: arquivo.type }),
        });
        if (!res.ok) {
          toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
          setUploading(false);
          return;
        }
        setSucesso(true);
        setUploading(false);
      };
      reader.readAsDataURL(arquivo);
    } catch {
      toast({ title: "Erro ao processar arquivo", variant: "destructive" });
      setUploading(false);
    }
  };

  if (sucesso) {
    return (
      <Card className="border-green-500/30">
        <CardContent className="p-6 text-center">
          <FileCheck className="h-12 w-12 mx-auto mb-3 text-green-400" />
          <h2 className="text-lg font-bold">Arquivo Enviado!</h2>
          <p className="text-sm text-muted-foreground mt-1">Seu documento foi recebido e sera processado pela equipe.</p>
          <Button className="mt-4" onClick={() => { setSucesso(false); setArquivo(null); setCategoria(""); }}>
            Enviar Outro Documento
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="h-4 w-4 text-purple-400" />Enviar Documento
        </CardTitle>
        <p className="text-xs text-muted-foreground">Ola, {pacienteNome.split(" ")[0]}!</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <FolderOpen className="h-3 w-3" />Tipo de Documento
          </Label>
          <select className="w-full bg-card border border-border text-sm px-3 py-2 mt-1"
            value={categoria} onChange={e => setCategoria(e.target.value)}>
            <option value="">Selecione a categoria...</option>
            {CATEGORIAS_UPLOAD.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Arquivo</Label>
          <div className="mt-1 border-2 border-dashed border-border/60 p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}>
            {arquivo ? (
              <div className="text-sm">
                <FileCheck className="h-6 w-6 mx-auto mb-1 text-green-400" />
                <span className="font-medium">{arquivo.name}</span>
                <div className="text-[10px] text-muted-foreground mt-1">{(arquivo.size / 1024).toFixed(0)} KB</div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                <Upload className="h-6 w-6 mx-auto mb-1" />
                Clique para selecionar arquivo
                <div className="text-[9px] mt-1">PDF, JPG, PNG, DOC (max 10MB)</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" accept={FORMATOS_ACEITOS}
            onChange={e => setArquivo(e.target.files?.[0] || null)} />
        </div>

        <Button className="w-full" onClick={handleUpload} disabled={uploading || !arquivo || !categoria}>
          {uploading ? "Enviando..." : "Enviar"}
        </Button>
      </CardContent>
    </Card>
  );
}

type Agendamento = {
  id: number;
  slotId: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoMin: number;
  tipoProcedimento: string;
  tipoProcedimentoLabel: string;
  tipoProcedimentoCor: string;
  status: string;
  profissionalNome: string | null;
  unidadeNome: string | null;
  podeReagendar: boolean;
  reagendamentoAutomaticoDeId: number | null;
  observacoes: string | null;
};

type SlotDisponivel = {
  id: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  duracaoMin: number;
  tipoProcedimento: string;
  profissionalId: number;
  profissionalNome: string | null;
};

function AgendamentosSection({ pacienteId, pacienteNome }: { pacienteId: number; pacienteNome: string }) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [reagendando, setReagendando] = useState<Agendamento | null>(null);
  const [slotsDisponiveis, setSlotsDisponiveis] = useState<SlotDisponivel[]>([]);
  const [slotSelecionado, setSlotSelecionado] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/meus-agendamentos/${pacienteId}`);
      if (res.ok) {
        const data = await res.json();
        setAgendamentos(data);
      }
    } catch {
      toast({ title: "Erro ao carregar agendamentos", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchAgendamentos(); }, [pacienteId]);

  const handleReagendar = async (appt: Agendamento) => {
    setReagendando(appt);
    setSlotSelecionado(null);
    setMotivo("");
    setLoadingSlots(true);

    try {
      const hoje = new Date();
      const dataFim = new Date(hoje);
      dataFim.setDate(dataFim.getDate() + 30);
      const params = new URLSearchParams({
        dataInicio: hoje.toISOString().split("T")[0],
        dataFim: dataFim.toISOString().split("T")[0],
        tipoProcedimento: appt.tipoProcedimento,
      });

      const res = await fetch(`/api/portal/slots-disponiveis?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSlotsDisponiveis(data);
      }
    } catch {
      toast({ title: "Erro ao buscar horarios", variant: "destructive" });
    }
    setLoadingSlots(false);
  };

  const confirmarReagendamento = async () => {
    if (!reagendando || !slotSelecionado) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/portal/reagendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: reagendando.id,
          novoSlotId: slotSelecionado,
          pacienteId,
          motivo: motivo || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Erro ao reagendar", variant: "destructive" });
        setSaving(false);
        return;
      }
      const data = await res.json();
      toast({ title: data.mensagem || "Reagendado com sucesso!" });
      setReagendando(null);
      fetchAgendamentos();
    } catch {
      toast({ title: "Erro ao reagendar", variant: "destructive" });
    }
    setSaving(false);
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const getDiaSemana = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return diasSemana[date.getDay()];
  };

  const statusLabel: Record<string, { text: string; color: string }> = {
    agendado: { text: "AGENDADO", color: "bg-blue-500/20 text-blue-400" },
    confirmado: { text: "CONFIRMADO", color: "bg-green-500/20 text-green-400" },
    cancelado: { text: "CANCELADO", color: "bg-gray-500/20 text-gray-400" },
    faltou: { text: "FALTOU", color: "bg-red-500/20 text-red-400" },
    realizado: { text: "REALIZADO", color: "bg-emerald-500/20 text-emerald-400" },
  };

  if (reagendando) {
    const slotsPorDia = slotsDisponiveis.reduce<Record<string, SlotDisponivel[]>>((acc, s) => {
      if (!acc[s.data]) acc[s.data] = [];
      acc[s.data].push(s);
      return acc;
    }, {});

    return (
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-cyan-400" />Reagendar Consulta
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Agendamento atual: {formatDate(reagendando.data)} ({getDiaSemana(reagendando.data)}) as {reagendando.horaInicio} — {reagendando.tipoProcedimentoLabel}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Motivo (opcional)</Label>
              <Input placeholder="Ex: compromisso pessoal" value={motivo} onChange={e => setMotivo(e.target.value)} className="mt-1" />
            </div>

            {loadingSlots ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Buscando horarios disponiveis...</div>
            ) : slotsDisponiveis.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Nenhum horario disponivel nos proximos 30 dias. Entre em contato com a clinica.</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {Object.entries(slotsPorDia).map(([dia, slots]) => (
                  <div key={dia}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-bold">
                      {getDiaSemana(dia)} — {formatDate(dia)}
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {slots.map(s => (
                        <button
                          key={s.id}
                          className={`p-2 border text-xs text-center transition-colors ${
                            slotSelecionado === s.id
                              ? "border-primary bg-primary/20 text-white"
                              : "border-border hover:border-primary/40"
                          }`}
                          onClick={() => setSlotSelecionado(s.id)}
                        >
                          <span className="font-mono">{s.horaInicio}</span>
                          <span className="block text-[9px] text-muted-foreground">{s.profissionalNome?.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setReagendando(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={confirmarReagendamento}
                disabled={saving || !slotSelecionado}>
                {saving ? "Reagendando..." : "Confirmar Reagendamento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-cyan-400" />Meus Agendamentos
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Ola, {pacienteNome.split(" ")[0]}! Seus proximos agendamentos:</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Carregando...</div>
        ) : agendamentos.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Nenhum agendamento encontrado.</div>
        ) : (
          <div className="space-y-2">
            {agendamentos.map(appt => {
              const st = statusLabel[appt.status] || { text: appt.status.toUpperCase(), color: "bg-gray-500/20 text-gray-400" };
              return (
                <div key={appt.id} className="border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold">
                        {getDiaSemana(appt.data)} — {formatDate(appt.data)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{appt.horaInicio} - {appt.horaFim}
                      </p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 font-bold tracking-wider ${st.color}`}>
                      {st.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2" style={{ backgroundColor: appt.tipoProcedimentoCor }} />
                    <span className="text-xs">{appt.tipoProcedimentoLabel}</span>
                  </div>

                  {appt.profissionalNome && (
                    <p className="text-[10px] text-muted-foreground">
                      Profissional: {appt.profissionalNome}
                    </p>
                  )}

                  {appt.unidadeNome && (
                    <p className="text-[10px] text-muted-foreground">
                      Unidade: {appt.unidadeNome}
                    </p>
                  )}

                  {appt.reagendamentoAutomaticoDeId && (
                    <p className="text-[9px] text-yellow-400 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />Reagendamento automatico (falta anterior)
                    </p>
                  )}

                  {appt.podeReagendar && (
                    <Button size="sm" variant="outline" className="w-full text-xs mt-1"
                      onClick={() => handleReagendar(appt)}>
                      <RefreshCw className="h-3 w-3 mr-1" />Reagendar
                    </Button>
                  )}

                  {!appt.podeReagendar && (appt.status === "agendado" || appt.status === "confirmado") && (
                    <p className="text-[9px] text-muted-foreground italic">
                      Reagendamento indisponivel — entre em contato com a clinica
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground" onClick={fetchAgendamentos}>
          <RefreshCw className="h-3 w-3 mr-1" />Atualizar
        </Button>
      </CardContent>
    </Card>
  );
}
