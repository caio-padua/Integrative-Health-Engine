import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Heart, Activity, Scale, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Ruler, Plus
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const COR_OPTIONS = [
  { value: "green", label: "Verde - Normal", color: "bg-green-500" },
  { value: "yellow", label: "Amarelo - Atencao (gera card para enfermeira_02, prazo 36h)", color: "bg-yellow-500" },
  { value: "red", label: "Vermelho - Urgente (gera cards para enfermeira_02 + medico_02, imediato)", color: "bg-red-500" },
];

interface AvaliacaoForm {
  sessaoId: number | null;
  pacienteId: number;
  profissionalId: number | null;
  pressaoArterial: string;
  frequenciaCardiaca: string;
  peso: string;
  altura: string;
  percentualGordura: string;
  massaGorda: string;
  massaMuscular: string;
  dobraTricipital: string;
  dobraBicipital: string;
  dobraSubescapular: string;
  dobraSuprailiaca: string;
  dobraAbdominal: string;
  dobraPeitoral: string;
  dobraCoxaMedial: string;
  circunferenciaBraco: string;
  circunferenciaAntebraco: string;
  circunferenciaTorax: string;
  circunferenciaCintura: string;
  circunferenciaAbdomen: string;
  circunferenciaQuadril: string;
  circunferenciaCoxa: string;
  circunferenciaPanturrilha: string;
  corAlerta: string;
  observacoes: string;
  perguntaSemanal: string;
  nivelDor: string;
}

const emptyForm: AvaliacaoForm = {
  sessaoId: null, pacienteId: 0, profissionalId: null,
  pressaoArterial: "", frequenciaCardiaca: "", peso: "",
  altura: "", percentualGordura: "", massaGorda: "", massaMuscular: "",
  dobraTricipital: "", dobraBicipital: "", dobraSubescapular: "",
  dobraSuprailiaca: "", dobraAbdominal: "", dobraPeitoral: "", dobraCoxaMedial: "",
  circunferenciaBraco: "", circunferenciaAntebraco: "", circunferenciaTorax: "",
  circunferenciaCintura: "", circunferenciaAbdomen: "", circunferenciaQuadril: "",
  circunferenciaCoxa: "", circunferenciaPanturrilha: "",
  corAlerta: "green", observacoes: "", perguntaSemanal: "", nivelDor: "0",
};

function NumberInput({ label, value, onChange, unit, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void;
  unit?: string; icon?: any;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </Label>
      <div className="flex items-center gap-1">
        <Input type="number" step="0.1" value={value} onChange={e => onChange(e.target.value)}
          className="h-8 text-sm font-mono" placeholder="--" />
        {unit && <span className="text-[10px] text-muted-foreground w-8">{unit}</span>}
      </div>
    </div>
  );
}

export default function AvaliacaoEnfermagemPage() {
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<AvaliacaoForm>({ ...emptyForm });
  const [selectedPaciente, setSelectedPaciente] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: avaliacoes = [], isLoading } = useQuery<any[]>({
    queryKey: ["avaliacoes-enfermagem"],
    queryFn: async () => {
      const res = await fetch(`/api/avaliacao-enfermagem`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: pacientes = [] } = useQuery<any[]>({
    queryKey: ["pacientes-lista"],
    queryFn: async () => {
      const res = await fetch(`/api/pacientes`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/avaliacao-enfermagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["avaliacoes-enfermagem"] });
      queryClient.invalidateQueries({ queryKey: ["task-cards"] });
      const msg = result.corAlerta === "red" ? "ALERTA VERMELHO - Task cards criados para enfermeira_02 e medico_02"
        : result.corAlerta === "yellow" ? "ALERTA AMARELO - Task card criado para enfermeira_02 (prazo 36h)"
        : "Avaliacao salva com sucesso";
      toast({ title: msg });
      setForm({ ...emptyForm });
      setShowForm(false);
      setShowAdvanced(false);
    },
    onError: () => toast({ title: "Erro ao salvar avaliacao", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!form.pacienteId || form.pacienteId === 0) {
      toast({ title: "Selecione um paciente", variant: "destructive" });
      return;
    }

    const payload: any = {
      pacienteId: form.pacienteId,
      corAlerta: form.corAlerta,
    };

    if (form.sessaoId) payload.sessaoId = form.sessaoId;
    if (form.profissionalId) payload.profissionalId = form.profissionalId;
    if (form.pressaoArterial) payload.pressaoArterial = form.pressaoArterial;
    if (form.frequenciaCardiaca) payload.frequenciaCardiaca = parseInt(form.frequenciaCardiaca);
    if (form.peso) payload.peso = parseFloat(form.peso);
    if (form.observacoes) payload.observacoes = form.observacoes;
    if (form.perguntaSemanal) payload.perguntaSemanal = form.perguntaSemanal;
    if (form.nivelDor && form.nivelDor !== "0") payload.nivelDor = parseInt(form.nivelDor);

    if (showAdvanced) {
      const numFields = [
        "altura", "percentualGordura", "massaGorda", "massaMuscular",
        "dobraTricipital", "dobraBicipital", "dobraSubescapular",
        "dobraSuprailiaca", "dobraAbdominal", "dobraPeitoral", "dobraCoxaMedial",
        "circunferenciaBraco", "circunferenciaAntebraco", "circunferenciaTorax",
        "circunferenciaCintura", "circunferenciaAbdomen", "circunferenciaQuadril",
        "circunferenciaCoxa", "circunferenciaPanturrilha",
      ];
      for (const f of numFields) {
        const val = (form as any)[f];
        if (val) payload[f] = parseFloat(val);
      }
    }

    saveMutation.mutate(payload);
  };

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Avaliacao de Enfermagem</h1>
            <p className="text-sm text-muted-foreground">Sinais vitais, composicao corporal e alertas clinicos</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />Nova Avaliacao
          </Button>
        </div>

        {showForm && (
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Nova Avaliacao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Paciente</Label>
                <select className="w-full bg-card border border-border text-sm px-3 py-2 mt-1"
                  value={form.pacienteId}
                  onChange={e => set("pacienteId", parseInt(e.target.value))}>
                  <option value={0}>Selecione...</option>
                  {pacientes.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nome} {p.cpf ? `(${p.cpf})` : ""}</option>
                  ))}
                </select>
              </div>

              <div className="border border-border/60 p-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />Sinais Vitais + Peso
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                      <Activity className="h-3 w-3" />PA (Pressao Arterial)
                    </Label>
                    <Input placeholder="120/80" value={form.pressaoArterial} onChange={e => set("pressaoArterial", e.target.value)}
                      className="h-8 text-sm font-mono" />
                  </div>
                  <NumberInput label="FC (bpm)" value={form.frequenciaCardiaca} onChange={v => set("frequenciaCardiaca", v)} unit="bpm" icon={Heart} />
                  <NumberInput label="Peso" value={form.peso} onChange={v => set("peso", v)} unit="kg" icon={Scale} />
                </div>
              </div>

              <div className="border border-border/60">
                <button
                  className="w-full flex items-center justify-between p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span className="flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5" />
                    Avaliacao Corporal Completa (adm / consultor / biomedico)
                  </span>
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showAdvanced && (
                  <div className="p-3 pt-0 space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      <NumberInput label="Altura" value={form.altura} onChange={v => set("altura", v)} unit="cm" />
                      <NumberInput label="% Gordura" value={form.percentualGordura} onChange={v => set("percentualGordura", v)} unit="%" />
                      <NumberInput label="Massa Gorda" value={form.massaGorda} onChange={v => set("massaGorda", v)} unit="kg" />
                      <NumberInput label="Massa Muscular" value={form.massaMuscular} onChange={v => set("massaMuscular", v)} unit="kg" />
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">7 Dobras Cutaneas (mm)</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <NumberInput label="Tricipital" value={form.dobraTricipital} onChange={v => set("dobraTricipital", v)} unit="mm" />
                        <NumberInput label="Bicipital" value={form.dobraBicipital} onChange={v => set("dobraBicipital", v)} unit="mm" />
                        <NumberInput label="Subescapular" value={form.dobraSubescapular} onChange={v => set("dobraSubescapular", v)} unit="mm" />
                        <NumberInput label="Suprailiaca" value={form.dobraSuprailiaca} onChange={v => set("dobraSuprailiaca", v)} unit="mm" />
                        <NumberInput label="Abdominal" value={form.dobraAbdominal} onChange={v => set("dobraAbdominal", v)} unit="mm" />
                        <NumberInput label="Peitoral" value={form.dobraPeitoral} onChange={v => set("dobraPeitoral", v)} unit="mm" />
                        <NumberInput label="Coxa Medial" value={form.dobraCoxaMedial} onChange={v => set("dobraCoxaMedial", v)} unit="mm" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">8 Circunferencias (cm)</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <NumberInput label="Braco" value={form.circunferenciaBraco} onChange={v => set("circunferenciaBraco", v)} unit="cm" />
                        <NumberInput label="Antebraco" value={form.circunferenciaAntebraco} onChange={v => set("circunferenciaAntebraco", v)} unit="cm" />
                        <NumberInput label="Torax" value={form.circunferenciaTorax} onChange={v => set("circunferenciaTorax", v)} unit="cm" />
                        <NumberInput label="Cintura" value={form.circunferenciaCintura} onChange={v => set("circunferenciaCintura", v)} unit="cm" />
                        <NumberInput label="Abdomen" value={form.circunferenciaAbdomen} onChange={v => set("circunferenciaAbdomen", v)} unit="cm" />
                        <NumberInput label="Quadril" value={form.circunferenciaQuadril} onChange={v => set("circunferenciaQuadril", v)} unit="cm" />
                        <NumberInput label="Coxa" value={form.circunferenciaCoxa} onChange={v => set("circunferenciaCoxa", v)} unit="cm" />
                        <NumberInput label="Panturrilha" value={form.circunferenciaPanturrilha} onChange={v => set("circunferenciaPanturrilha", v)} unit="cm" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                    Como foi sua semana?
                  </Label>
                  <Textarea placeholder="Relato do paciente..." value={form.perguntaSemanal}
                    onChange={e => set("perguntaSemanal", e.target.value)} className="text-sm h-20" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                    Observacoes
                  </Label>
                  <Textarea placeholder="Observacoes clinicas..." value={form.observacoes}
                    onChange={e => set("observacoes", e.target.value)} className="text-sm h-20" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                    Nivel de Dor (0-10)
                  </Label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0" max="10" value={form.nivelDor}
                      onChange={e => set("nivelDor", e.target.value)}
                      className="flex-1" />
                    <span className="font-mono font-bold text-sm w-6 text-center">{form.nivelDor}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />Cor de Alerta
                  </Label>
                  <div className="flex gap-2 mt-1">
                    {COR_OPTIONS.map(opt => (
                      <button key={opt.value}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs transition-all ${
                          form.corAlerta === opt.value ? "border-foreground bg-foreground/10 font-bold" : "border-border/50"
                        }`}
                        onClick={() => set("corAlerta", opt.value)}>
                        <span className={`w-3 h-3 rounded-full ${opt.color}`} />
                        {opt.value === "green" ? "Verde" : opt.value === "yellow" ? "Amarelo" : "Vermelho"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {form.corAlerta !== "green" && (
                <div className={`p-3 text-xs border-l-[3px] ${
                  form.corAlerta === "red" ? "border-l-red-500 bg-red-500/10 text-red-400" : "border-l-yellow-500 bg-yellow-500/10 text-yellow-400"
                }`}>
                  {form.corAlerta === "red" ? (
                    <><AlertTriangle className="h-4 w-4 inline mr-1" />ALERTA VERMELHO: Serao criados 2 task cards automaticamente — 1 para enfermeira_02 e 1 para medico_02, ambos com prioridade URGENTE e prazo IMEDIATO.</>
                  ) : (
                    <><AlertTriangle className="h-4 w-4 inline mr-1" />ALERTA AMARELO: Sera criado 1 task card para enfermeira_02 com prioridade ALTA e prazo de 36 horas.</>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setForm({ ...emptyForm }); }}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : "Salvar Avaliacao"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {isLoading ? (
            [1, 2, 3].map(i => <Card key={i} className="h-16 animate-pulse bg-muted/30" />)
          ) : avaliacoes.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma avaliacao registrada</p>
            </Card>
          ) : (
            avaliacoes.map((av: any) => {
              const cor = av.corAlerta === "red" ? "border-l-red-500 bg-red-500/5" :
                av.corAlerta === "yellow" ? "border-l-yellow-500 bg-yellow-500/5" :
                "border-l-green-500";
              return (
                <Card key={av.id} className={`border-l-[3px] ${cor}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${av.corAlerta === "red" ? "bg-red-500" : av.corAlerta === "yellow" ? "bg-yellow-500" : "bg-green-500"}`} />
                        <div>
                          <div className="text-xs font-bold">Paciente #{av.pacienteId}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {av.pressaoArterial && `PA: ${av.pressaoArterial}`}
                            {av.frequenciaCardiaca && ` | FC: ${av.frequenciaCardiaca}bpm`}
                            {av.peso && ` | Peso: ${av.peso}kg`}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(av.criadoEm).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
