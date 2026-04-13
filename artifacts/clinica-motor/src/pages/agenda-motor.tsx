import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock,
  Settings2, RefreshCw, X, User, Phone, ArrowRightLeft,
  Lock, Unlock, Trash2, CloudUpload, Layers, AlertTriangle,
  PanelLeftClose, PanelLeftOpen, Eye, EyeOff, Palette, Check
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const DIAS_SEMANA_FULL = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

const TIPO_CORES: Record<string, string> = {
  CONSULTA_30_PRESENCIAL: "#3B82F6",
  CONSULTA_30_ONLINE: "#8B5CF6",
  CONSULTA_60_PRESENCIAL: "#2563EB",
  RETORNO_15_PRESENCIAL: "#06B6D4",
  INFUSAO_CURTA_60_PRESENCIAL: "#10B981",
  INFUSAO_MEDIA_120_PRESENCIAL: "#F59E0B",
  INFUSAO_LONGA_180_PRESENCIAL: "#EF4444",
  INFUSAO_EXTRA_240_PRESENCIAL: "#DC2626",
  IMPLANTE_120_PRESENCIAL: "#7C3AED",
  IM_15_PRESENCIAL: "#14B8A6",
  AVALIACAO_ENF_30_PRESENCIAL: "#F97316",
  EXAME_30_PRESENCIAL: "#64748B",
};

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function SlotCell({ slot, appointments, onBook, onBlock, onUnblock }: {
  slot: any; appointments: any[]; onBook: (slot: any) => void;
  onBlock: (slot: any) => void; onUnblock: (slot: any) => void;
}) {
  const appointment = appointments.find((a: any) => a.slotId === slot.id);
  const cor = TIPO_CORES[slot.tipoProcedimento] || "#64748B";

  if (slot.status === "bloqueado") {
    return (
      <div className="px-2 py-1.5 border border-border/50 bg-red-950/20 group relative">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-red-400/60 line-through">{slot.horaInicio}-{slot.horaFim}</span>
          <button onClick={() => onUnblock(slot)} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Unlock className="w-3 h-3 text-red-400" />
          </button>
        </div>
        {slot.bloqueadoMotivo && <div className="text-[9px] text-red-400/50 truncate">{slot.bloqueadoMotivo}</div>}
      </div>
    );
  }

  if (appointment) {
    return (
      <div className="px-2 py-1.5 border border-border/50 relative group" style={{ borderLeftColor: cor, borderLeftWidth: 3 }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{slot.horaInicio}-{slot.horaFim}</span>
          <span className={`text-[9px] px-1 py-0.5 uppercase font-bold ${
            appointment.status === "agendado" ? "text-blue-400 bg-blue-400/10" :
            appointment.status === "confirmado" ? "text-emerald-400 bg-emerald-400/10" :
            appointment.status === "faltou" ? "text-red-400 bg-red-400/10" :
            appointment.status === "realizado" ? "text-green-400 bg-green-400/10" :
            "text-muted-foreground bg-muted/50"
          }`}>{appointment.status}</span>
        </div>
        <div className="text-xs font-semibold text-foreground truncate mt-0.5">{appointment.pacienteNome || "Paciente"}</div>
        {appointment.pacienteTelefone && (
          <div className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Phone className="w-2.5 h-2.5" />{appointment.pacienteTelefone}
          </div>
        )}
        {appointment.googleEventId && (
          <CloudUpload className="w-2.5 h-2.5 text-emerald-400/60 absolute top-1 right-1" />
        )}
      </div>
    );
  }

  const isLiberado = slot.liberado !== false;
  const turnoLabel = slot.turno === "manha" ? "M" : slot.turno === "tarde" ? "T" : null;

  return (
    <div className={`px-2 py-1.5 border transition-all group relative ${
      isLiberado
        ? "border-border/30 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
        : "border-border/20 bg-muted/10 opacity-50 cursor-not-allowed"
    }`}
      onClick={() => isLiberado && onBook(slot)}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          {slot.horaInicio}-{slot.horaFim}
          {turnoLabel && (
            <span className={`text-[8px] font-bold px-1 rounded ${
              slot.turno === "manha" ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"
            }`}>{turnoLabel}</span>
          )}
          {!isLiberado && <Lock className="w-2.5 h-2.5 text-muted-foreground/40" />}
        </span>
        {isLiberado && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onBlock(slot); }} title="Bloquear">
              <Lock className="w-3 h-3 text-red-400" />
            </button>
            <Plus className="w-3 h-3 text-primary" />
          </div>
        )}
      </div>
      <div className="text-[9px] text-muted-foreground/50 mt-0.5 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cor }} />
        {slot.tipoProcedimento?.split("_").slice(0, 2).join(" ")}
      </div>
    </div>
  );
}

function BookingModal({ slot, onClose, onBooked }: { slot: any; onClose: () => void; onBooked: () => void }) {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [searchPaciente, setSearchPaciente] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [syncGCal, setSyncGCal] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/pacientes`)
      .then(r => r.json())
      .then(d => setPacientes(d))
      .catch(console.error);
  }, []);

  const filteredPacientes = pacientes.filter(p =>
    !searchPaciente || p.nome?.toLowerCase().includes(searchPaciente.toLowerCase())
  );

  const handleBook = async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/agenda-motor/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          pacienteId: Number(pacienteId),
          observacoes: observacoes || null,
          syncGoogleCalendar: syncGCal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.erro || "Erro ao agendar");
        return;
      }
      onBooked();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Agendar Paciente</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="p-3 bg-muted/30 border border-border text-xs space-y-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-3 h-3 text-primary" />
            <span className="font-semibold text-foreground">{slot.data}</span>
            <span className="text-muted-foreground">{slot.horaInicio} - {slot.horaFim}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TIPO_CORES[slot.tipoProcedimento] || "#64748B" }} />
            <span className="text-muted-foreground">{slot.tipoProcedimento?.split("_").join(" ")}</span>
            <span className="text-muted-foreground">({slot.duracaoMin}min)</span>
          </div>
          {slot.profissionalNome && <div className="text-muted-foreground">Profissional: {slot.profissionalNome}</div>}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Paciente</label>
          <input
            type="text"
            value={searchPaciente}
            onChange={e => setSearchPaciente(e.target.value)}
            className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            placeholder="Buscar paciente..."
          />
          <div className="max-h-32 overflow-y-auto border border-border">
            {filteredPacientes.slice(0, 20).map(p => (
              <button
                key={p.id}
                onClick={() => { setPacienteId(String(p.id)); setSearchPaciente(p.nome); }}
                className={`w-full text-left px-3 py-1.5 text-xs border-b border-border/50 transition-colors ${
                  String(p.id) === pacienteId ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/30 text-foreground"
                }`}
              >
                <div>{p.nome}</div>
                <div className="text-[10px] text-muted-foreground">{p.telefone}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Observacoes</label>
          <textarea
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            rows={2}
            className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            placeholder="Observacoes opcionais..."
          />
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={syncGCal} onChange={e => setSyncGCal(e.target.checked)} className="accent-primary" />
          <CloudUpload className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">Sincronizar com Google Calendar</span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 text-xs h-9" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 text-xs h-9" disabled={!pacienteId || loading} onClick={handleBook}>
            {loading ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  const [rules, setRules] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [subAgendaOptions, setSubAgendaOptions] = useState<SubAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ profissionalId: "", unidadeId: "1", diaSemana: "1", horaInicio: "08:00", horaFim: "12:00", duracaoSlotMin: "30", tipoProcedimento: "CONSULTA_30_PRESENCIAL", subAgendaId: "" });
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, profRes, subRes] = await Promise.all([
        fetch(`${API_BASE}/agenda-motor/availability-rules`).then(r => r.json()),
        fetch(`${API_BASE}/usuarios`).then(r => r.json()),
        fetch(`${API_BASE}/agenda-motor/sub-agendas`).then(r => r.json()),
      ]);
      setRules(rulesRes);
      setProfissionais(profRes);
      setSubAgendaOptions(subRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleAdd = async () => {
    if (!form.profissionalId) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/agenda-motor/availability-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profissionalId: Number(form.profissionalId),
          unidadeId: Number(form.unidadeId),
          subAgendaId: form.subAgendaId ? Number(form.subAgendaId) : null,
          diaSemana: Number(form.diaSemana),
          horaInicio: form.horaInicio,
          horaFim: form.horaFim,
          duracaoSlotMin: Number(form.duracaoSlotMin),
          tipoProcedimento: form.tipoProcedimento,
        }),
      });
      fetchRules();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_BASE}/agenda-motor/availability-rules/${id}`, { method: "DELETE" });
    fetchRules();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Regras de Disponibilidade</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="p-3 bg-muted/30 border border-border space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Nova Regra</div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.profissionalId} onChange={e => setForm({...form, profissionalId: e.target.value})}
              className="bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none">
              <option value="">Profissional...</option>
              {profissionais.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select value={form.diaSemana} onChange={e => setForm({...form, diaSemana: e.target.value})}
              className="bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none">
              {DIAS_SEMANA_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <input type="time" value={form.horaInicio} onChange={e => setForm({...form, horaInicio: e.target.value})}
              className="bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none" />
            <input type="time" value={form.horaFim} onChange={e => setForm({...form, horaFim: e.target.value})}
              className="bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none" />
            <select value={form.duracaoSlotMin} onChange={e => setForm({...form, duracaoSlotMin: e.target.value})}
              className="bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none">
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">60 min</option>
              <option value="120">120 min</option>
              <option value="180">180 min</option>
            </select>
            <select value={form.tipoProcedimento} onChange={e => setForm({...form, tipoProcedimento: e.target.value})}
              className="bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none">
              {Object.entries(TIPO_CORES).map(([k]) => <option key={k} value={k}>{k.split("_").join(" ")}</option>)}
            </select>
            <select value={form.subAgendaId} onChange={e => setForm({...form, subAgendaId: e.target.value})}
              className="bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none">
              <option value="">Sub-Agenda (opcional)</option>
              {subAgendaOptions.filter(s => s.ativa).map(s => (
                <option key={s.id} value={s.id}>{s.emoji || ""} {s.nome}</option>
              ))}
            </select>
          </div>
          <Button size="sm" className="text-xs h-7" onClick={handleAdd} disabled={!form.profissionalId || saving}>
            {saving ? "Salvando..." : "Adicionar Regra"}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((r: any) => (
              <div key={r.id} className="py-2 flex items-center justify-between">
                <div className="text-xs space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{r.profissionalNome || `Prof #${r.profissionalId}`}</span>
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase">
                      {DIAS_SEMANA[r.diaSemana]}
                    </span>
                    <span className="text-muted-foreground">{r.horaInicio}-{r.horaFim}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TIPO_CORES[r.tipoProcedimento] || "#64748B" }} />
                    {r.tipoProcedimento?.split("_").join(" ")} | {r.duracaoSlotMin}min/slot
                    {!r.ativa && <span className="text-red-400 font-bold ml-1">INATIVA</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {rules.length === 0 && <div className="py-4 text-center text-xs text-muted-foreground">Nenhuma regra cadastrada</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function GenerateSlotsModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [dataInicio, setDataInicio] = useState(() => getWeekStart(new Date()));
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 13);
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/agenda-motor/generate-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataInicio, dataFim }),
      });
      const data = await res.json();
      setResult(data);
      if (data.gerados > 0) setTimeout(onGenerated, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Gerar Slots</h3>
        <p className="text-xs text-muted-foreground">Gera slots de horario a partir das regras de disponibilidade cadastradas.</p>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Data Inicio</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none" />
          </div>
        </div>

        {result && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <div className="font-bold text-emerald-400">{result.gerados} slots gerados</div>
            {result.ignorados > 0 && <div className="text-muted-foreground">{result.ignorados} ignorados (ja existentes ou bloqueados)</div>}
            <div className="text-muted-foreground">{result.regras} regras processadas</div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 text-xs h-9" onClick={onClose}>Fechar</Button>
          <Button className="flex-1 text-xs h-9" disabled={loading} onClick={handleGenerate}>
            {loading ? "Gerando..." : "Gerar Slots"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SubAgenda {
  id: number;
  nome: string;
  cor: string;
  emoji: string | null;
  tipo: string;
  profissionalId: number | null;
  profissionalNome: string | null;
  modalidade: string;
  salaOuLocal: string | null;
  ativa: boolean;
  ordem: number;
}

function SubAgendaSidebar({ unidadeId, activeIds, onToggle, onSeedDone }: {
  unidadeId: number | null;
  activeIds: Set<number>;
  onToggle: (id: number) => void;
  onSeedDone: () => void;
}) {
  const [subAgendas, setSubAgendas] = useState<SubAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCor, setEditCor] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newCor, setNewCor] = useState("#3B82F6");
  const [newEmoji, setNewEmoji] = useState("");
  const [newTipo, setNewTipo] = useState("medico");
  const [newModalidade, setNewModalidade] = useState("presencial");
  const [newSala, setNewSala] = useState("");

  const PRESET_CORES = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
    "#EC4899", "#06B6D4", "#F97316", "#64748B", "#84CC16",
    "#14B8A6", "#A855F7", "#D946EF", "#0EA5E9",
  ];

  const fetchSubAgendas = useCallback(async () => {
    setLoading(true);
    try {
      const params = unidadeId ? `?unidadeId=${unidadeId}` : "";
      const res = await fetch(`${API_BASE}/agenda-motor/sub-agendas${params}`);
      const data = await res.json();
      setSubAgendas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [unidadeId]);

  useEffect(() => { fetchSubAgendas(); }, [fetchSubAgendas]);

  const handleSeed = async () => {
    const seedUnidadeId = unidadeId || 1;
    setSeeding(true);
    try {
      await fetch(`${API_BASE}/agenda-motor/sub-agendas/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidadeId: seedUnidadeId }),
      });
      await fetchSubAgendas();
      onSeedDone();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const handleCreate = async () => {
    if (!newNome.trim()) return;
    const createUnidadeId = unidadeId || 1;
    try {
      await fetch(`${API_BASE}/agenda-motor/sub-agendas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidadeId: createUnidadeId, nome: newNome.trim(), cor: newCor,
          emoji: newEmoji || null, tipo: newTipo,
          modalidade: newModalidade, salaOuLocal: newSala || null,
        }),
      });
      setNewNome(""); setNewEmoji(""); setNewSala(""); setShowNewForm(false);
      await fetchSubAgendas();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCor = async (id: number, cor: string) => {
    try {
      await fetch(`${API_BASE}/agenda-motor/sub-agendas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cor }),
      });
      setEditingId(null);
      await fetchSubAgendas();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAtiva = async (sub: SubAgenda) => {
    try {
      await fetch(`${API_BASE}/agenda-motor/sub-agendas/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativa: !sub.ativa }),
      });
      await fetchSubAgendas();
    } catch (err) {
      console.error(err);
    }
  };

  const allActive = subAgendas.filter(s => s.ativa).every(s => activeIds.has(s.id));

  return (
    <div className="w-56 shrink-0 border-r border-border bg-card/50 overflow-y-auto">
      <div className="p-3 border-b border-border">
        <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Sub-Agendas</div>
        {subAgendas.length > 0 && (
          <button
            onClick={() => {
              const activeFiltered = subAgendas.filter(s => s.ativa);
              if (allActive) {
                activeFiltered.forEach(s => { if (activeIds.has(s.id)) onToggle(s.id); });
              } else {
                activeFiltered.forEach(s => { if (!activeIds.has(s.id)) onToggle(s.id); });
              }
            }}
            className="text-[9px] text-primary hover:underline mb-1"
          >
            {allActive ? "Desmarcar todas" : "Marcar todas"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-3 space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-8" />)}
        </div>
      ) : subAgendas.length === 0 ? (
        <div className="p-3 space-y-3">
          <p className="text-[10px] text-muted-foreground text-center">Nenhuma sub-agenda cadastrada</p>
          <Button size="sm" className="w-full text-xs h-7" onClick={handleSeed} disabled={seeding}>
            {seeding ? "Criando..." : "Criar Sub-Agendas Padrao"}
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {subAgendas.map(sub => (
            <div key={sub.id} className={`group relative ${!sub.ativa ? "opacity-40" : ""}`}>
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 cursor-pointer"
                onClick={() => sub.ativa && onToggle(sub.id)}
              >
                <div
                  className="w-4 h-4 border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    borderColor: sub.cor,
                    backgroundColor: activeIds.has(sub.id) ? sub.cor : "transparent",
                  }}
                >
                  {activeIds.has(sub.id) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-foreground truncate flex items-center gap-1">
                    {sub.emoji && <span>{sub.emoji}</span>}
                    {sub.nome.replace(/^AGENDA\s+/, "").replace(/\s*—\s*/, " ")}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate">
                    {sub.modalidade} {sub.salaOuLocal ? `• ${sub.salaOuLocal}` : ""}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(editingId === sub.id ? null : sub.id); setEditCor(sub.cor); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                >
                  <Palette className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              {editingId === sub.id && (
                <div className="px-3 pb-2 space-y-1.5">
                  <div className="flex flex-wrap gap-1">
                    {PRESET_CORES.map(c => (
                      <button
                        key={c}
                        onClick={() => handleUpdateCor(sub.id, c)}
                        className="w-5 h-5 border border-border/50 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => handleToggleAtiva(sub)}
                    className="text-[9px] text-red-400 hover:underline flex items-center gap-1"
                  >
                    {sub.ativa ? <><EyeOff className="w-2.5 h-2.5" /> Desativar</> : <><Eye className="w-2.5 h-2.5" /> Ativar</>}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-border">
        {showNewForm ? (
          <div className="space-y-2">
            <input
              type="text" value={newNome} onChange={e => setNewNome(e.target.value)}
              placeholder="Nome da sub-agenda"
              className="w-full bg-background border border-border px-2 py-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text" value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
                placeholder="Emoji"
                className="bg-background border border-border px-2 py-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <input
                  type="color" value={newCor} onChange={e => setNewCor(e.target.value)}
                  className="w-6 h-6 border-0 bg-transparent cursor-pointer"
                />
                <span className="text-[9px] text-muted-foreground">Cor</span>
              </div>
            </div>
            <select value={newTipo} onChange={e => setNewTipo(e.target.value)}
              className="w-full bg-background border border-border px-2 py-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none">
              <option value="medico">Medico</option>
              <option value="enfermagem">Enfermagem</option>
              <option value="exames">Exames</option>
              <option value="administrativo">Administrativo</option>
            </select>
            <select value={newModalidade} onChange={e => setNewModalidade(e.target.value)}
              className="w-full bg-background border border-border px-2 py-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none">
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="domiciliar">Domiciliar</option>
              <option value="remoto">Remoto</option>
            </select>
            <input
              type="text" value={newSala} onChange={e => setNewSala(e.target.value)}
              placeholder="Sala / Local"
              className="w-full bg-background border border-border px-2 py-1.5 text-[11px] text-foreground focus:border-primary focus:outline-none"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="flex-1 text-[10px] h-6" onClick={handleCreate} disabled={!newNome.trim()}>Criar</Button>
              <Button variant="outline" size="sm" className="flex-1 text-[10px] h-6" onClick={() => setShowNewForm(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full text-[10px] h-7 gap-1" onClick={() => setShowNewForm(true)}>
            <Plus className="w-3 h-3" /> Nova Sub-Agenda
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AgendaMotorPage() {
  const { unidadeSelecionada } = useClinic();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<any>(null);
  const [showRules, setShowRules] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [profissionalFilter, setProfissionalFilter] = useState("");
  const [processandoFaltas, setProcessandoFaltas] = useState(false);
  const [processandoLiberacao, setProcessandoLiberacao] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSubAgendaIds, setActiveSubAgendaIds] = useState<Set<number>>(new Set());
  const [subAgendasLoaded, setSubAgendasLoaded] = useState(false);

  const handleToggleSubAgenda = useCallback((id: number) => {
    setActiveSubAgendaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const params = unidadeSelecionada ? `?unidadeId=${unidadeSelecionada}` : "";
    fetch(`${API_BASE}/agenda-motor/sub-agendas${params}`)
      .then(r => r.json())
      .then((subs: SubAgenda[]) => {
        setActiveSubAgendaIds(new Set(subs.filter(s => s.ativa).map(s => s.id)));
        setSubAgendasLoaded(true);
      })
      .catch(console.error);
  }, [unidadeSelecionada]);

  const processarLiberacao = async () => {
    setProcessandoLiberacao(true);
    try {
      const res = await fetch(`${API_BASE}/agenda-motor/smart-release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        alert(`${json.mensagem}`);
        fetchData();
      } else {
        alert(json.error || "Erro ao processar liberacao");
      }
    } catch {
      alert("Erro de conexao");
    }
    setProcessandoLiberacao(false);
  };

  const processarFaltas = async () => {
    setProcessandoFaltas(true);
    try {
      const res = await fetch(`${API_BASE}/agenda-motor/processar-faltas`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        alert(`${json.processados} falta(s) processada(s). ${json.detalhes?.filter((d: any) => d.autoReagendado).length || 0} auto-reagendamento(s).`);
        fetchData();
      } else {
        alert(json.error || "Erro ao processar faltas");
      }
    } catch {
      alert("Erro de conexao");
    }
    setProcessandoFaltas(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dataInicio: weekStart });
      if (profissionalFilter) params.set("profissionalId", profissionalFilter);
      if (unidadeSelecionada) params.set("unidadeId", String(unidadeSelecionada));

      const res = await fetch(`${API_BASE}/agenda-motor/weekly-view?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, profissionalFilter, unidadeSelecionada]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigateWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7 * dir);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const handleBlock = async (slot: any) => {
    const motivo = prompt("Motivo do bloqueio:");
    if (!motivo) return;
    await fetch(`${API_BASE}/agenda-motor/slots/${slot.id}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    fetchData();
  };

  const handleUnblock = async (slot: any) => {
    await fetch(`${API_BASE}/agenda-motor/slots/${slot.id}/unblock`, { method: "POST" });
    fetchData();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {sidebarOpen && (
          <SubAgendaSidebar
            unidadeId={unidadeSelecionada}
            activeIds={activeSubAgendaIds}
            onToggle={handleToggleSubAgenda}
            onSeedDone={fetchData}
          />
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-1 h-7 w-7" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </Button>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" /> Motor de Agenda
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Slots transacionais com lock • Booking com conflito • Google Calendar bidirecional
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowRules(true)}>
              <Settings2 className="w-3 h-3" /> Regras
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowGenerate(true)}>
              <Layers className="w-3 h-3" /> Gerar Slots
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={processarLiberacao} disabled={processandoLiberacao}>
              <Unlock className="w-3 h-3" /> {processandoLiberacao ? "Liberando..." : "Liberar Vagas"}
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={processarFaltas} disabled={processandoFaltas}>
              <AlertTriangle className="w-3 h-3" /> {processandoFaltas ? "Processando..." : "Processar Faltas"}
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={fetchData}>
              <RefreshCw className="w-3 h-3" /> Atualizar
            </Button>
          </div>
        </div>

        {data?.summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card><CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Total Slots</div>
              <div className="text-xl font-black text-foreground">{data.summary.totalSlots}</div>
            </CardContent></Card>
            <Card className="border-emerald-500/30"><CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Disponiveis</div>
              <div className="text-xl font-black text-emerald-400">{data.summary.slotsDisponiveis}</div>
            </CardContent></Card>
            <Card className="border-blue-500/30"><CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-blue-400">Ocupados</div>
              <div className="text-xl font-black text-blue-400">{data.summary.slotsOcupados}</div>
            </CardContent></Card>
            <Card className="border-red-500/30"><CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-red-400">Bloqueados</div>
              <div className="text-xl font-black text-red-400">{data.summary.slotsBloqueados}</div>
            </CardContent></Card>
            <Card className="border-primary/30"><CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-primary">Agendamentos</div>
              <div className="text-xl font-black text-primary">{data.summary.totalAppointments}</div>
            </CardContent></Card>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setWeekStart(getWeekStart(new Date()))}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}><ChevronRight className="w-4 h-4" /></Button>
            <span className="text-xs text-muted-foreground ml-2">
              {weekStart} a {data?.dataFim || "..."}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-2">
            {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : data?.days ? (
          <div className="grid grid-cols-7 gap-1">
            {data.days.map((day: any) => {
              const isToday = day.data === today;
              const isWeekend = day.diaSemana === 0 || day.diaSemana === 6;
              const filteredSlots = activeSubAgendaIds.size > 0
                ? day.slots.filter((s: any) => !s.subAgendaId || activeSubAgendaIds.has(s.subAgendaId))
                : day.slots;
              const filteredAppointments = day.appointments;
              return (
                <div key={day.data} className={`border border-border ${isToday ? "ring-1 ring-primary" : ""} ${isWeekend ? "bg-muted/10" : ""}`}>
                  <div className={`px-2 py-1.5 border-b border-border ${isToday ? "bg-primary/10" : "bg-muted/20"}`}>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      {DIAS_SEMANA[day.diaSemana]}
                    </div>
                    <div className={`text-xs font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {day.data.slice(8, 10)}/{day.data.slice(5, 7)}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {filteredSlots.length}s • {filteredAppointments.length}a
                    </div>
                  </div>
                  <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
                    {filteredSlots.length === 0 && filteredAppointments.length === 0 ? (
                      <div className="p-3 text-center text-[10px] text-muted-foreground/30">—</div>
                    ) : (
                      filteredSlots.map((slot: any) => (
                        <SlotCell
                          key={slot.id}
                          slot={slot}
                          appointments={filteredAppointments}
                          onBook={setBookingSlot}
                          onBlock={handleBlock}
                          onUnblock={handleUnblock}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-center gap-3 text-[9px] text-muted-foreground flex-wrap">
          {Object.entries(TIPO_CORES).map(([tipo, cor]) => (
            <div key={tipo} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cor }} />
              {tipo.split("_").slice(0, 2).join(" ")}
            </div>
          ))}
        </div>
        </div>
      </div>

      {bookingSlot && (
        <BookingModal
          slot={bookingSlot}
          onClose={() => setBookingSlot(null)}
          onBooked={() => { setBookingSlot(null); fetchData(); }}
        />
      )}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showGenerate && <GenerateSlotsModal onClose={() => setShowGenerate(false)} onGenerated={() => { setShowGenerate(false); fetchData(); }} />}
    </Layout>
  );
}
