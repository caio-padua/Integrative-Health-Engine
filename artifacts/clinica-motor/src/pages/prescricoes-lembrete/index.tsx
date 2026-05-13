import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bell, Plus, Pencil, Power, PowerOff, X, Search, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useClinic } from "@/contexts/ClinicContext";
import { apiFetch } from "@/lib/api-fetch";

const HORARIO_HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface PrescricaoLembrete {
  id: number;
  pacienteId: number;
  unidadeId: number | null;
  ativo: boolean;
  periodos: PeriodoJson[];
  horariosEnvio: string[];
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

interface FormulaJson {
  nome: string;
  ativoPrincipal?: string;
  dose?: string;
  horario?: string;
  observacaoRefeicao?: string;
  posologia?: string;
}

interface PeriodoJson {
  nome: string;
  tipo: "tomar" | "nao_tomar";
  formulas: FormulaJson[];
}

interface Paciente {
  id: number;
  nome: string;
  unidadeId: number | null;
  telefone: string | null;
}

interface Unidade {
  id: number;
  nome: string;
  lembreteHorariosPadrao: string[] | null;
  lembreteToleranciaMinutos: number | null;
}

function novoPeriodo(): PeriodoJson {
  return { nome: "", tipo: "tomar", formulas: [{ nome: "" }] };
}

function PrescricaoFormDialog({
  prescricao,
  pacientes,
  unidades,
  open,
  onOpenChange,
  onSaved,
}: {
  prescricao: PrescricaoLembrete | null;
  pacientes: Paciente[];
  unidades: Unidade[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!prescricao;

  const [pacienteId, setPacienteId] = useState<number | "">("");
  const [observacao, setObservacao] = useState("");
  const [periodos, setPeriodos] = useState<PeriodoJson[]>([novoPeriodo()]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [novoHorario, setNovoHorario] = useState("");
  const [horarioErro, setHorarioErro] = useState<string | null>(null);

  // (re)inicializa quando dialog abre — useEffect (nao useMemo) porque
  // sao side-effects (setState) e useMemo nao garante execucao determinista.
  useEffect(() => {
    if (open) {
      if (prescricao) {
        setPacienteId(prescricao.pacienteId);
        setObservacao(prescricao.observacao ?? "");
        setPeriodos(
          Array.isArray(prescricao.periodos) && prescricao.periodos.length > 0
            ? prescricao.periodos
            : [novoPeriodo()],
        );
        setHorarios(Array.isArray(prescricao.horariosEnvio) ? prescricao.horariosEnvio : []);
      } else {
        setPacienteId("");
        setObservacao("");
        setPeriodos([novoPeriodo()]);
        setHorarios([]);
      }
      setNovoHorario("");
      setHorarioErro(null);
    }
  }, [open, prescricao]);

  const pacienteSelecionado = pacientes.find(p => p.id === pacienteId) ?? null;
  const unidadeDoPaciente = pacienteSelecionado
    ? unidades.find(u => u.id === pacienteSelecionado.unidadeId) ?? null
    : null;

  const addHorario = () => {
    const v = novoHorario.trim();
    if (!HORARIO_HHMM_RE.test(v)) {
      setHorarioErro("Formato invalido. Use HH:MM (ex: 07:00).");
      return;
    }
    if (horarios.includes(v)) {
      setHorarioErro("Esse horario ja foi adicionado.");
      return;
    }
    setHorarios([...horarios, v].sort());
    setNovoHorario("");
    setHorarioErro(null);
  };

  const removeHorario = (h: string) => setHorarios(horarios.filter(x => x !== h));

  const updatePeriodo = (idx: number, patch: Partial<PeriodoJson>) =>
    setPeriodos(periodos.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const updateFormula = (pIdx: number, fIdx: number, patch: Partial<FormulaJson>) =>
    setPeriodos(periodos.map((p, i) =>
      i !== pIdx ? p : { ...p, formulas: p.formulas.map((f, j) => j === fIdx ? { ...f, ...patch } : f) }
    ));

  const addFormula = (pIdx: number) =>
    setPeriodos(periodos.map((p, i) => i !== pIdx ? p : { ...p, formulas: [...p.formulas, { nome: "" }] }));

  const removeFormula = (pIdx: number, fIdx: number) =>
    setPeriodos(periodos.map((p, i) =>
      i !== pIdx ? p : { ...p, formulas: p.formulas.filter((_, j) => j !== fIdx) }
    ));

  const addPeriodo = () => setPeriodos([...periodos, novoPeriodo()]);
  const removePeriodo = (idx: number) => setPeriodos(periodos.filter((_, i) => i !== idx));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pacienteId) throw new Error("Selecione um paciente.");
      for (const h of horarios) {
        if (!HORARIO_HHMM_RE.test(h)) throw new Error(`Horario invalido: ${h}.`);
      }
      const periodosLimpos = periodos
        .map(p => ({
          nome: p.nome.trim(),
          tipo: p.tipo,
          formulas: p.formulas.map(f => ({ ...f, nome: f.nome.trim() })).filter(f => f.nome !== ""),
        }))
        .filter(p => p.nome !== "" || p.formulas.length > 0);

      const body = {
        pacienteId,
        unidadeId: pacienteSelecionado?.unidadeId ?? null,
        ativo: prescricao?.ativo ?? true,
        periodos: periodosLimpos,
        horariosEnvio: horarios,
        observacao: observacao.trim() || null,
      };

      const url = isEdit ? `/api/prescricoes-lembrete/${prescricao!.id}` : `/api/prescricoes-lembrete`;
      const method = isEdit ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Erro ao salvar prescricao.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Prescricao atualizada" : "Prescricao criada" });
      onSaved();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const horariosVazios = horarios.length === 0;
  const horariosUnidade = unidadeDoPaciente?.lembreteHorariosPadrao ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar prescricao" : "Nova prescricao"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Paciente</Label>
            {isEdit ? (
              <div className="rounded border px-3 py-2 text-sm bg-muted/30">
                {pacienteSelecionado?.nome ?? `Paciente #${pacienteId}`}
              </div>
            ) : (
              <Select value={pacienteId === "" ? "" : String(pacienteId)} onValueChange={v => setPacienteId(v ? parseInt(v, 10) : "")}>
                <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {pacientes.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome} {p.telefone ? `· ${p.telefone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="border rounded p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-bold">Periodos</Label>
              <Button type="button" size="sm" variant="outline" onClick={addPeriodo}>
                <Plus className="h-3 w-3 mr-1" /> Periodo
              </Button>
            </div>

            {periodos.map((p, pIdx) => (
              <div key={pIdx} className="border rounded p-2 space-y-2 bg-muted/20">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Nome do periodo</Label>
                    <Input
                      value={p.nome}
                      onChange={e => updatePeriodo(pIdx, { nome: e.target.value })}
                      placeholder="ex: Manha, Almoco, Noite"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="w-40">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={p.tipo} onValueChange={v => updatePeriodo(pIdx, { tipo: v as PeriodoJson["tipo"] })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tomar">Tomar</SelectItem>
                        <SelectItem value="nao_tomar">Nao tomar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removePeriodo(pIdx)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1.5 pl-2 border-l-2">
                  {p.formulas.map((f, fIdx) => (
                    <div key={fIdx} className="flex gap-1.5 items-center">
                      <Input
                        value={f.nome}
                        onChange={e => updateFormula(pIdx, fIdx, { nome: e.target.value })}
                        placeholder="Nome da formula/medicacao"
                        className="h-7 text-xs flex-1"
                      />
                      <Input
                        value={f.dose ?? ""}
                        onChange={e => updateFormula(pIdx, fIdx, { dose: e.target.value })}
                        placeholder="Dose"
                        className="h-7 text-xs w-24"
                      />
                      <Input
                        value={f.horario ?? ""}
                        onChange={e => updateFormula(pIdx, fIdx, { horario: e.target.value })}
                        placeholder="Horario"
                        className="h-7 text-xs w-20"
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeFormula(pIdx, fIdx)} className="text-destructive h-7 w-7 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="ghost" onClick={() => addFormula(pIdx)} className="h-6 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> formula
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border rounded p-3 space-y-2">
            <Label className="font-bold">Horarios de envio (HH:MM)</Label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
              {horarios.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">Sem horarios proprios.</span>
              ) : (
                horarios.map(h => (
                  <Badge key={h} variant="outline" className="font-mono text-xs gap-1 pr-1">
                    {h}
                    <button type="button" onClick={() => removeHorario(h)} className="hover:bg-destructive/20 rounded p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={novoHorario}
                onChange={e => { setNovoHorario(e.target.value); setHorarioErro(null); }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addHorario(); } }}
                placeholder="HH:MM"
                className="font-mono text-xs h-8 w-32"
                maxLength={5}
              />
              <Button type="button" size="sm" variant="outline" onClick={addHorario}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
            {horarioErro && <p className="text-xs text-red-400">{horarioErro}</p>}

            {horariosVazios && (
              <div className="rounded border border-amber-700/50 bg-amber-950/30 p-2 text-xs text-amber-300">
                Sem horarios proprios — esta prescricao vai herdar os horarios padrao da unidade
                {unidadeDoPaciente ? ` "${unidadeDoPaciente.nome}"` : ""}:{" "}
                {horariosUnidade.length > 0 ? (
                  <span className="font-mono">{horariosUnidade.join(", ")}</span>
                ) : (
                  <span className="italic">a unidade nao tem horarios padrao configurados — nenhum lembrete sera enviado.</span>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Observacao</Label>
            <Textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Notas internas (opcional)"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : (isEdit ? "Salvar" : "Criar prescricao")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PrescricoesLembretePage() {
  const { unidadeSelecionada } = useClinic();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [busca, setBusca] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState<number | "todas">(unidadeSelecionada ?? "todas");
  const [editando, setEditando] = useState<PrescricaoLembrete | null>(null);
  const [criandoOpen, setCriandoOpen] = useState(false);

  const { data: unidades = [] } = useQuery<Unidade[]>({
    queryKey: ["unidades"],
    queryFn: async () => {
      const r = await apiFetch("/api/unidades");
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
  });

  const { data: pacientes = [] } = useQuery<Paciente[]>({
    queryKey: ["pacientes-todos-lembrete"],
    queryFn: async () => {
      const r = await apiFetch("/api/pacientes");
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
  });

  const { data: prescricoes = [], isLoading } = useQuery<PrescricaoLembrete[]>({
    queryKey: ["prescricoes-lembrete"],
    queryFn: async () => {
      const r = await apiFetch("/api/prescricoes-lembrete");
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["prescricoes-lembrete"] });

  const toggleAtivoMutation = useMutation({
    mutationFn: async (p: PrescricaoLembrete) => {
      const r = await apiFetch(`/api/prescricoes-lembrete/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !p.ativo }),
      });
      if (!r.ok) throw new Error("Erro");
      return r.json();
    },
    onSuccess: () => { refresh(); toast({ title: "Status atualizado" }); },
    onError: () => toast({ title: "Erro ao alterar status", variant: "destructive" }),
  });

  const pacientesPorId = useMemo(() => {
    const m = new Map<number, Paciente>();
    pacientes.forEach(p => m.set(p.id, p));
    return m;
  }, [pacientes]);

  const linhas = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase();
    return prescricoes
      .map(p => ({ p, paciente: pacientesPorId.get(p.pacienteId) }))
      .filter(({ paciente, p }) => {
        const unidadeAlvo = p.unidadeId ?? paciente?.unidadeId ?? null;
        if (filtroUnidade !== "todas" && unidadeAlvo !== filtroUnidade) return false;
        if (buscaLower && !(paciente?.nome ?? "").toLowerCase().includes(buscaLower)) return false;
        return true;
      });
  }, [prescricoes, pacientesPorId, busca, filtroUnidade]);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-6 w-6" /> Lembretes de prescricao
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure as prescricoes que viram lembrete por WhatsApp. Sem horarios proprios, herda os horarios padrao da unidade.
            </p>
          </div>
          <Button onClick={() => setCriandoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova prescricao
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Buscar paciente</Label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Nome do paciente"
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Unidade</Label>
                <Select
                  value={filtroUnidade === "todas" ? "todas" : String(filtroUnidade)}
                  onValueChange={v => setFiltroUnidade(v === "todas" ? "todas" : parseInt(v, 10))}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as unidades</SelectItem>
                    {unidades.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Periodos</TableHead>
                    <TableHead>Horarios</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        Nenhuma prescricao encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    linhas.map(({ p, paciente }) => {
                      const unidadeAlvo = p.unidadeId ?? paciente?.unidadeId ?? null;
                      const unidade = unidades.find(u => u.id === unidadeAlvo) ?? null;
                      const horariosEfetivos = (p.horariosEnvio?.length ?? 0) > 0
                        ? p.horariosEnvio
                        : (unidade?.lembreteHorariosPadrao ?? []);
                      const herdado = (p.horariosEnvio?.length ?? 0) === 0;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            {paciente ? (
                              <Link href={`/pacientes/${paciente.id}`} className="font-medium text-sm hover:underline">
                                {paciente.nome}
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">Paciente #{p.pacienteId}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{unidade?.nome ?? "-"}</TableCell>
                          <TableCell className="text-xs">{p.periodos?.length ?? 0}</TableCell>
                          <TableCell className="text-xs font-mono">
                            {horariosEfetivos.length === 0 ? (
                              <span className="text-amber-500 italic">sem horarios</span>
                            ) : (
                              <>
                                {horariosEfetivos.join(", ")}
                                {herdado && <span className="ml-1 text-[10px] text-muted-foreground">(da unidade)</span>}
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.ativo ? "default" : "outline"} className="text-[10px]">
                              {p.ativo ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleAtivoMutation.mutate(p)}
                                title={p.ativo ? "Desativar" : "Ativar"}
                              >
                                {p.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditando(p)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <PrescricaoFormDialog
          prescricao={null}
          pacientes={pacientes}
          unidades={unidades}
          open={criandoOpen}
          onOpenChange={setCriandoOpen}
          onSaved={refresh}
        />

        {editando && (
          <PrescricaoFormDialog
            prescricao={editando}
            pacientes={pacientes}
            unidades={unidades}
            open={!!editando}
            onOpenChange={(o) => { if (!o) setEditando(null); }}
            onSaved={refresh}
          />
        )}
      </div>
    </Layout>
  );
}
