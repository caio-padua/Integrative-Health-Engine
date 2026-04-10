import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileCheck, User, Calendar, FolderOpen, Shield
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const CATEGORIAS = [
  "EXAME DE SANGUE", "ULTRASSOM", "COMPROVANTE DE PAGAMENTO",
  "FOTO / IMAGEM", "RECEITA", "LAUDO", "ATESTADO", "CONTRATO", "OUTRO"
];

const FORMATOS_ACEITOS = ".pdf,.jpg,.jpeg,.png,.heic,.heif,.doc,.docx";

export default function PortalClientePage() {
  const [step, setStep] = useState<"identificacao" | "upload" | "sucesso">("identificacao");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [paciente, setPaciente] = useState<{ id: number; nome: string } | null>(null);
  const [categoria, setCategoria] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
      const res = await fetch(`${BASE_URL}api/portal/identificar`, {
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
      setPaciente({ id: data.id, nome: data.nome });
      setStep("upload");
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
  };

  const handleUpload = async () => {
    if (!arquivo || !categoria || !paciente) {
      toast({ title: "Selecione categoria e arquivo", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(`${BASE_URL}api/portal/upload/${paciente.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoria,
            arquivo: base64,
            nomeArquivo: arquivo.name,
            mimeType: arquivo.type,
          }),
        });
        if (!res.ok) {
          toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
          setUploading(false);
          return;
        }

        const uploadResult = await res.json();
        if (uploadResult.driveUploadUrl) {
          const driveRes = await fetch(`${BASE_URL}${uploadResult.driveUploadUrl.replace("/api/", "api/")}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: base64,
              customFileName: arquivo.name,
              mimeType: arquivo.type,
            }),
          });
          if (!driveRes.ok) {
            toast({ title: "Erro ao enviar para Google Drive", variant: "destructive" });
            setUploading(false);
            return;
          }
        }

        setStep("sucesso");
        setUploading(false);
      };
      reader.readAsDataURL(arquivo);
    } catch {
      toast({ title: "Erro ao processar arquivo", variant: "destructive" });
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(215,28%,9%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center bg-white/90 border border-border p-2">
            <img src={`${BASE_URL}logo-dp.png`} alt="DP" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight uppercase">Portal do Cliente</h1>
          <p className="text-xs text-muted-foreground mt-1">PADCOM — Protocolos Injetaveis</p>
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
                  onChange={e => setDataNascimento(e.target.value)}
                  className="mt-1" />
              </div>
              <Button className="w-full" onClick={handleIdentificar}>Entrar</Button>
              <div className="text-[9px] text-center text-muted-foreground flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" />Seus dados estao protegidos pela LGPD (Lei 13.709/2018)
              </div>
            </CardContent>
          </Card>
        )}

        {step === "upload" && paciente && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" />Enviar Documento
              </CardTitle>
              <p className="text-xs text-muted-foreground">Ola, {paciente.nome.split(" ")[0]}!</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />Tipo de Documento
                </Label>
                <select className="w-full bg-card border border-border text-sm px-3 py-2 mt-1"
                  value={categoria} onChange={e => setCategoria(e.target.value)}>
                  <option value="">Selecione a categoria...</option>
                  {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Arquivo</Label>
                <div
                  className="mt-1 border-2 border-dashed border-border/60 p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {arquivo ? (
                    <div className="text-sm">
                      <FileCheck className="h-6 w-6 mx-auto mb-1 text-green-400" />
                      <span className="font-medium">{arquivo.name}</span>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {(arquivo.size / 1024).toFixed(0)} KB
                      </div>
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

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setStep("identificacao"); setPaciente(null); }}>
                  Voltar
                </Button>
                <Button className="flex-1" onClick={handleUpload} disabled={uploading || !arquivo || !categoria}>
                  {uploading ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "sucesso" && (
          <Card className="border-green-500/30">
            <CardContent className="p-6 text-center">
              <FileCheck className="h-12 w-12 mx-auto mb-3 text-green-400" />
              <h2 className="text-lg font-bold">Arquivo Enviado!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Seu documento foi recebido e sera processado pela equipe.
              </p>
              <Button className="mt-4" onClick={() => { setStep("upload"); setArquivo(null); setCategoria(""); }}>
                Enviar Outro Documento
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
