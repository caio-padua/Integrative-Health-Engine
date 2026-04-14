import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useListarUsuarios, getListarUsuariosQueryKey, 
  useCriarUsuario,
  CriarUsuarioBodyPerfil,
  useListarUnidades, getListarUnidadesQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Settings, Users, ShieldAlert, CloudUpload, FileText, Loader2, CheckCircle2, ExternalLink, MessageSquare, Phone, Check, CheckCheck, X, Send, TestTube, Pencil, Shield, Layers, Timer, Zap, Clock, Trash2, Power } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const usuarioSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  perfil: z.nativeEnum(CriarUsuarioBodyPerfil),
  unidadeId: z.coerce.number().optional(),
});

function SmartReleaseConfigCard({ apiBase, toast, unidades }: { apiBase: string; toast: any; unidades: any[] }) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [newForm, setNewForm] = useState({
    unidadeId: "",
    turnoManhaInicio: "08:00",
    turnoManhaFim: "12:00",
    turnoTardeInicio: "13:00",
    turnoTardeFim: "18:00",
    limiarLiberacaoPercent: "70",
  });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/agenda-motor/smart-release-config`);
      if (res.ok) setConfigs(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, [apiBase]);

  const handleCreate = async () => {
    if (!newForm.unidadeId) { toast({ title: "Selecione uma unidade", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/agenda-motor/smart-release-config`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidadeId: Number(newForm.unidadeId),
          turnoManhaInicio: newForm.turnoManhaInicio,
          turnoManhaFim: newForm.turnoManhaFim,
          turnoTardeInicio: newForm.turnoTardeInicio,
          turnoTardeFim: newForm.turnoTardeFim,
          limiarLiberacaoPercent: Number(newForm.limiarLiberacaoPercent),
        }),
      });
      if (res.ok) {
        toast({ title: "Configuracao Smart Release criada" });
        setShowNew(false);
        setNewForm({ unidadeId: "", turnoManhaInicio: "08:00", turnoManhaFim: "12:00", turnoTardeInicio: "13:00", turnoTardeFim: "18:00", limiarLiberacaoPercent: "70" });
        fetchConfigs();
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.error || "Erro ao criar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir esta configuracao?")) return;
    try {
      const res = await fetch(`${apiBase}/agenda-motor/smart-release-config/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Configuracao removida" });
        fetchConfigs();
      } else {
        toast({ title: "Erro ao remover configuracao", variant: "destructive" });
      }
    } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
  };

  const openEdit = (cfg: any) => {
    setEditForm({
      turnoManhaInicio: cfg.turnoManhaInicio || "08:00",
      turnoManhaFim: cfg.turnoManhaFim || "12:00",
      turnoTardeInicio: cfg.turnoTardeInicio || "13:00",
      turnoTardeFim: cfg.turnoTardeFim || "18:00",
      limiarLiberacaoPercent: String(cfg.limiarLiberacaoPercent || 70),
      ativa: cfg.ativa ?? true,
    });
    setEditing(cfg);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/agenda-motor/smart-release-config/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turnoManhaInicio: editForm.turnoManhaInicio,
          turnoManhaFim: editForm.turnoManhaFim,
          turnoTardeInicio: editForm.turnoTardeInicio,
          turnoTardeFim: editForm.turnoTardeFim,
          limiarLiberacaoPercent: Number(editForm.limiarLiberacaoPercent),
          ativa: editForm.ativa,
        }),
      });
      if (res.ok) {
        toast({ title: "Configuracao atualizada" });
        setEditing(null);
        fetchConfigs();
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setSaving(false);
  };

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Smart Release — Liberacao Inteligente
        </CardTitle>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova Config
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configura turnos e limiares para liberacao automatica de horarios na agenda.
          Quando a ocupacao da agenda ultrapassa o limiar definido, horarios adicionais sao liberados automaticamente.
        </p>

        {showNew && (
          <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wider">Nova Configuracao</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Unidade</label>
                <select value={newForm.unidadeId} onChange={e => setNewForm({ ...newForm, unidadeId: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="">Selecione unidade...</option>
                  {unidades?.map((u: any) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Limiar Liberacao (%)</label>
                <Input type="number" value={newForm.limiarLiberacaoPercent} onChange={e => setNewForm({ ...newForm, limiarLiberacaoPercent: e.target.value })} min={0} max={100} />
              </div>
              <div />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Manha Inicio</label>
                <Input type="time" value={newForm.turnoManhaInicio} onChange={e => setNewForm({ ...newForm, turnoManhaInicio: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Manha Fim</label>
                <Input type="time" value={newForm.turnoManhaFim} onChange={e => setNewForm({ ...newForm, turnoManhaFim: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tarde Inicio</label>
                <Input type="time" value={newForm.turnoTardeInicio} onChange={e => setNewForm({ ...newForm, turnoTardeInicio: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tarde Fim</label>
                <Input type="time" value={newForm.turnoTardeFim} onChange={e => setNewForm({ ...newForm, turnoTardeFim: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />} Criar
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : configs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma configuracao Smart Release. Crie uma acima.</p>
        ) : (
          <div className="space-y-2">
            {configs.map((cfg: any) => (
              <div key={cfg.id} className="flex items-center justify-between p-3 border border-border rounded group hover:bg-muted/10">
                <div className="flex items-center gap-4">
                  <div className={`p-1.5 rounded ${cfg.ativa ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                    <Power className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{cfg.unidadeNome || "Global"}</span>
                      <Badge variant="outline" className="text-[10px]">{cfg.ativa ? "ATIVA" : "INATIVA"}</Badge>
                      <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400">Limiar: {cfg.limiarLiberacaoPercent}%</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Manha: {cfg.turnoManhaInicio}–{cfg.turnoManhaFim}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Tarde: {cfg.turnoTardeInicio}–{cfg.turnoTardeFim}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(cfg)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => handleDelete(cfg.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
            <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider">Editar Smart Release — {editing.unidadeNome || "Global"}</h3>
                <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Manha Inicio</label>
                  <Input type="time" value={editForm.turnoManhaInicio} onChange={e => setEditForm({ ...editForm, turnoManhaInicio: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Manha Fim</label>
                  <Input type="time" value={editForm.turnoManhaFim} onChange={e => setEditForm({ ...editForm, turnoManhaFim: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tarde Inicio</label>
                  <Input type="time" value={editForm.turnoTardeInicio} onChange={e => setEditForm({ ...editForm, turnoTardeInicio: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tarde Fim</label>
                  <Input type="time" value={editForm.turnoTardeFim} onChange={e => setEditForm({ ...editForm, turnoTardeFim: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Limiar Liberacao (%)</label>
                  <Input type="number" value={editForm.limiarLiberacaoPercent} onChange={e => setEditForm({ ...editForm, limiarLiberacaoPercent: e.target.value })} min={0} max={100} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</label>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, ativa: !editForm.ativa })}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border ${editForm.ativa ? "border-green-500/50 bg-green-500/10 text-green-400" : "border-red-500/50 bg-red-500/10 text-red-400"}`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {editForm.ativa ? "ATIVA" : "INATIVA"}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button className="flex-1 text-xs h-9" onClick={saveEdit} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Alteracoes"}
                </Button>
                <Button variant="outline" className="text-xs h-9" onClick={() => setEditing(null)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OperationalConfigCard({ apiBase, toast }: { apiBase: string; toast: any }) {
  const [soberaniaConfig, setSoberaniaConfig] = useState<any>(null);
  const [cascataStats, setCascataStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [soberaniaMotivo, setSoberaniaMotivo] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sobRes, casRes] = await Promise.all([
          fetch(`${apiBase}/soberania/config`),
          fetch(`${apiBase}/auditoria-cascata/stats`).catch(() => null),
        ]);
        if (sobRes.ok) setSoberaniaConfig(await sobRes.json());
        if (casRes?.ok) setCascataStats(await casRes.json());
      } catch {}
      setLoading(false);
    })();
  }, [apiBase]);

  const toggleSoberania = async (ativa: boolean) => {
    if (!soberaniaMotivo.trim()) {
      toast({ title: "Informe o motivo da alteracao", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/soberania/config`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validacaoSupremaAtiva: ativa, prazoHomologacaoHoras: soberaniaConfig?.prazoHomologacaoHoras || 48, alteradoPorId: 1, motivo: soberaniaMotivo }),
      });
      if (res.ok) {
        const data = await res.json();
        setSoberaniaConfig({ ...soberaniaConfig, validacaoSupremaAtiva: ativa, motivo: soberaniaMotivo });
        setSoberaniaMotivo("");
        toast({ title: `Soberania medica ${ativa ? "ATIVADA" : "DESATIVADA"}` });
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.error || "Erro ao alterar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setSaving(false);
  };

  const updatePrazo = async (prazo: number) => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/soberania/config`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validacaoSupremaAtiva: soberaniaConfig?.validacaoSupremaAtiva ?? true, prazoHomologacaoHoras: prazo, alteradoPorId: 1, motivo: `Prazo atualizado para ${prazo}h` }),
      });
      if (res.ok) {
        setSoberaniaConfig({ ...soberaniaConfig, prazoHomologacaoHoras: prazo });
        toast({ title: `Prazo homologacao: ${prazo}h` });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setSaving(false);
  };

  if (loading) return <Card className="bg-card"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>;

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Configuracoes Operacionais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Soberania Medica
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Validacao Suprema:</span>
              <Badge className={soberaniaConfig?.validacaoSupremaAtiva ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                {soberaniaConfig?.validacaoSupremaAtiva ? "ATIVA" : "INATIVA"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Prazo:</span>
              <Select value={String(soberaniaConfig?.prazoHomologacaoHoras || 48)} onValueChange={v => updatePrazo(parseInt(v))}>
                <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12h</SelectItem>
                  <SelectItem value="24">24h</SelectItem>
                  <SelectItem value="48">48h</SelectItem>
                  <SelectItem value="72">72h</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Motivo da alteracao..." value={soberaniaMotivo} onChange={e => setSoberaniaMotivo(e.target.value)} className="flex-1 h-8 text-sm" />
            <Button size="sm" variant={soberaniaConfig?.validacaoSupremaAtiva ? "destructive" : "default"} onClick={() => toggleSoberania(!soberaniaConfig?.validacaoSupremaAtiva)} disabled={saving}>
              {soberaniaConfig?.validacaoSupremaAtiva ? "Desativar" : "Ativar"}
            </Button>
          </div>
          {soberaniaConfig?.motivo && (
            <p className="text-xs text-muted-foreground">Ultimo motivo: {soberaniaConfig.motivo}</p>
          )}
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-400" />
            Auditoria Cascata
          </h4>
          {cascataStats ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded border border-border p-3 text-center">
                <div className="text-xl font-bold text-primary">{cascataStats.total ?? 0}</div>
                <div className="text-xs text-muted-foreground">Total validacoes</div>
              </div>
              <div className="rounded border border-border p-3 text-center">
                <div className="text-xl font-bold text-green-500">{cascataStats.aprovadas ?? 0}</div>
                <div className="text-xs text-muted-foreground">Aprovadas</div>
              </div>
              <div className="rounded border border-border p-3 text-center">
                <div className="text-xl font-bold text-red-500">{cascataStats.rejeitadas ?? 0}</div>
                <div className="text-xs text-muted-foreground">Rejeitadas</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Estatisticas de cascata nao disponiveis.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: usuarios, isLoading } = useListarUsuarios({}, {
    query: { queryKey: getListarUsuariosQueryKey({}) }
  });

  const { data: unidades } = useListarUnidades({
    query: { queryKey: getListarUnidadesQueryKey() }
  });
  
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);
  const criarUsuario = useCriarUsuario();
  const [backupResumo, setBackupResumo] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupResult, setBackupResult] = useState<any>(null);

  const [waConfigs, setWaConfigs] = useState<any[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waTestLoading, setWaTestLoading] = useState<number | null>(null);
  const [waTestResult, setWaTestResult] = useState<any>(null);
  const [waMensagens, setWaMensagens] = useState<any[]>([]);
  const [waStats, setWaStats] = useState<any>(null);
  const [waNewConfig, setWaNewConfig] = useState({
    provedor: "TWILIO" as "TWILIO" | "GUPSHUP",
    accountSid: "",
    authToken: "",
    apiKey: "",
    numeroRemetente: "",
    nomeExibicao: "Clinica Pawards",
    unidadeId: undefined as number | undefined,
  });
  const [waSavingConfig, setWaSavingConfig] = useState(false);
  const [waTesteSendOpen, setWaTesteSendOpen] = useState(false);
  const [waTesteTelefone, setWaTesteTelefone] = useState("");
  const [waTesteEnviando, setWaTesteEnviando] = useState(false);
  const [waEditConfig, setWaEditConfig] = useState<any>(null);
  const [waEditForm, setWaEditForm] = useState<any>({});
  const [waEditSaving, setWaEditSaving] = useState(false);

  const baseUrl = import.meta.env.BASE_URL || "/";
  const apiBase = `${window.location.origin}${baseUrl}api`.replace(/\/+/g, "/").replace(":/", "://");

  const fetchWaConfigs = async () => {
    setWaLoading(true);
    try {
      const res = await fetch(`${apiBase}/whatsapp/config`);
      if (res.ok) setWaConfigs(await res.json());
    } catch {}
    setWaLoading(false);
  };

  const fetchWaMensagens = async () => {
    try {
      const res = await fetch(`${apiBase}/whatsapp/mensagens?limite=10`);
      if (res.ok) setWaMensagens(await res.json());
    } catch {}
  };

  const fetchWaStats = async () => {
    try {
      const res = await fetch(`${apiBase}/whatsapp/mensagens/stats`);
      if (res.ok) setWaStats(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchWaConfigs();
    fetchWaMensagens();
    fetchWaStats();
  }, []);

  const handleSaveWaConfig = async () => {
    setWaSavingConfig(true);
    try {
      const res = await fetch(`${apiBase}/whatsapp/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(waNewConfig),
      });
      if (res.ok) {
        toast({ title: "Configuracao WhatsApp salva com sucesso!" });
        setWaDialogOpen(false);
        setWaNewConfig({ provedor: "TWILIO", accountSid: "", authToken: "", apiKey: "", numeroRemetente: "", nomeExibicao: "Clinica Pawards", unidadeId: undefined });
        fetchWaConfigs();
      } else {
        const data = await res.json();
        toast({ title: data.erro || "Erro ao salvar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
    setWaSavingConfig(false);
  };

  const handleTestWaConfig = async (configId: number) => {
    setWaTestLoading(configId);
    setWaTestResult(null);
    try {
      const res = await fetch(`${apiBase}/whatsapp/config/${configId}/testar`, { method: "POST" });
      const data = await res.json();
      setWaTestResult(data);
      toast({ title: data.sucesso ? "Conexao OK!" : `Falha: ${data.erro}`, variant: data.sucesso ? "default" : "destructive" });
    } catch {
      toast({ title: "Erro ao testar", variant: "destructive" });
    }
    setWaTestLoading(null);
  };

  const handleEnviarTeste = async (configId: number) => {
    if (!waTesteTelefone.trim()) {
      toast({ title: "Informe o telefone", variant: "destructive" });
      return;
    }
    setWaTesteEnviando(true);
    try {
      const res = await fetch(`${apiBase}/whatsapp/enviar-teste`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId, telefone: waTesteTelefone.trim() }),
      });
      const data = await res.json();
      toast({ title: data.sucesso ? "Mensagem de teste enviada!" : `Falha: ${data.erro}`, variant: data.sucesso ? "default" : "destructive" });
      if (data.sucesso) {
        setWaTesteSendOpen(false);
        setWaTesteTelefone("");
        fetchWaMensagens();
        fetchWaStats();
      }
    } catch {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    }
    setWaTesteEnviando(false);
  };

  const openEditWaConfig = (cfg: any) => {
    setWaEditForm({
      provedor: cfg.provedor || "TWILIO",
      numeroRemetente: cfg.numeroRemetente || "",
      nomeExibicao: cfg.nomeExibicao || "",
      accountSid: "",
      authToken: "",
      apiKey: "",
      ativo: cfg.ativo ?? true,
    });
    setWaEditConfig(cfg);
  };

  const saveEditWaConfig = async () => {
    setWaEditSaving(true);
    try {
      const body: any = { ...waEditForm };
      if (!body.accountSid) delete body.accountSid;
      if (!body.authToken) delete body.authToken;
      if (!body.apiKey) delete body.apiKey;
      const res = await fetch(`${apiBase}/whatsapp/config/${waEditConfig.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast({ title: "Configuracao WhatsApp atualizada" });
        setWaEditConfig(null);
        fetchWaConfigs();
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.erro || "Erro ao salvar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setWaEditSaving(false);
  };

  const handleDeleteWaConfig = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/whatsapp/config/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Configuracao removida" });
        fetchWaConfigs();
      }
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const statusIcone = (status: string) => {
    switch (status) {
      case "ENVIADO": return <Check className="w-3 h-3 text-muted-foreground" />;
      case "ENTREGUE": return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case "LIDO": return <CheckCheck className="w-3 h-3 text-blue-400" />;
      case "FALHOU": return <X className="w-3 h-3 text-red-400" />;
      default: return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
    }
  };

  const handleBackup = async () => {
    if (backupResumo.trim().length < 5) {
      toast({ title: "Informe um resumo com pelo menos 5 caracteres", variant: "destructive" });
      return;
    }
    setBackupLoading(true);
    setBackupResult(null);
    try {
      const baseUrl = import.meta.env.BASE_URL || "/";
      const apiUrl = `${window.location.origin}${baseUrl}api/backup-drive`.replace(/\/+/g, "/").replace(":/", "://");
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumo: backupResumo.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ erro: `Erro do servidor (${res.status})` }));
        toast({ title: errorData.erro || `Erro ${res.status}`, variant: "destructive" });
        return;
      }
      const data = await res.json();
      if (data.sucesso) {
        setBackupResult(data);
        setBackupResumo("");
        toast({ title: "Backup enviado com sucesso para o Google Drive!" });
      } else {
        toast({ title: data.erro || "Erro ao enviar backup", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro de conexao com o servidor", variant: "destructive" });
    } finally {
      setBackupLoading(false);
    }
  };

  const form = useForm<z.infer<typeof usuarioSchema>>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: "",
      email: "",
      senha: "",
      perfil: CriarUsuarioBodyPerfil.enfermeira,
      unidadeId: undefined,
    }
  });

  const onSubmit = (values: z.infer<typeof usuarioSchema>) => {
    criarUsuario.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarUsuariosQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Usuário criado com sucesso." });
      }
    });
  };

  const openEditUser = (u: any) => {
    setEditForm({
      nome: u.nome || "", email: u.email || "", perfil: u.perfil || "enfermeira",
      unidadeId: u.unidadeId || "", senha: "", ativo: u.ativo ?? true,
      crm: u.crm || "", cpf: u.cpf || "", cns: u.cns || "",
      especialidade: u.especialidade || "", telefone: u.telefone || "",
      podeValidar: u.podeValidar ?? false, podeAssinar: u.podeAssinar ?? false,
      podeBypass: u.podeBypass ?? false, nuncaOpera: u.nuncaOpera ?? false,
    });
    setEditingUser(u);
  };

  const saveEditUser = async () => {
    setEditSaving(true);
    try {
      const res = await fetch(`${apiBase}/usuarios/${editingUser.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast({ title: "Usuario atualizado" });
        queryClient.invalidateQueries({ queryKey: getListarUsuariosQueryKey({}) });
        setEditingUser(null);
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.error || "Erro ao salvar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setEditSaving(false);
  };

  const deleteUser = async () => {
    if (!confirm("Excluir este usuario permanentemente?")) return;
    try {
      await fetch(`${apiBase}/usuarios/${editingUser.id}`, { method: "DELETE" });
      toast({ title: "Usuario removido" });
      queryClient.invalidateQueries({ queryKey: getListarUsuariosQueryKey({}) });
      setEditingUser(null);
    } catch { toast({ title: "Erro ao excluir", variant: "destructive" }); }
  };

  const getPerfilBadge = (perfil: string) => {
    switch(perfil) {
      case 'validador_mestre': return <Badge className="bg-primary text-primary-foreground border-none shadow-[0_0_10px_rgba(var(--primary),0.5)]"><ShieldAlert className="w-3 h-3 mr-1"/> Mestre</Badge>;
      case 'medico_tecnico': return <Badge variant="outline" className="text-blue-500 border-blue-500/50">Médico Téc.</Badge>;
      case 'validador_enfermeiro': return <Badge variant="outline" className="text-orange-500 border-orange-500/50">Validador Enf.</Badge>;
      default: return <Badge variant="secondary">Enfermeira</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              Configurações
            </h1>
            <p className="text-muted-foreground mt-1">Configurações globais e gestão de usuários.</p>
          </div>
        </div>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Usuários do Sistema
            </CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Novo Usuário</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
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
                          <FormLabel>Senha Provisória</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="perfil"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Perfil</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(CriarUsuarioBodyPerfil).map(([k, v]) => (
                                  <SelectItem key={k} value={v} className="capitalize">{k.replace('_', ' ')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unidadeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidade</FormLabel>
                            <Select 
                              onValueChange={(val) => field.onChange(parseInt(val))} 
                              defaultValue={field.value ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {unidades?.map(u => (
                                  <SelectItem key={u.id} value={u.id.toString()}>{u.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={criarUsuario.isPending}>
                      {criarUsuario.isPending ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>CRM</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                        Nenhum usuário cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios?.map((u) => (
                      <TableRow key={u.id} className="group">
                        <TableCell>
                          <div className="font-medium">{u.nome}</div>
                          {(u as any).telefone && <div className="text-xs text-muted-foreground">{(u as any).telefone}</div>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell>{getPerfilBadge(u.perfil)}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{(u as any).crm || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{(u as any).especialidade || "-"}</TableCell>
                        <TableCell className="text-sm">{u.unidadeNome || "Global"}</TableCell>
                        <TableCell>
                          {u.ativo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">Ativo</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">Inativo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button onClick={() => openEditUser(u)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {editingUser && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
            <div className="bg-card border border-border w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Editar Usuario</h3>
                <button onClick={() => setEditingUser(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Nome</label>
                  <Input value={editForm.nome} onChange={e => setEditForm({...editForm, nome: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Email</label>
                  <Input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Perfil</label>
                  <Select value={editForm.perfil} onValueChange={v => setEditForm({...editForm, perfil: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CriarUsuarioBodyPerfil).map(([k, v]) => (
                        <SelectItem key={k} value={v}>{k.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Unidade</label>
                  <Select value={editForm.unidadeId?.toString() || ""} onValueChange={v => setEditForm({...editForm, unidadeId: parseInt(v)})}>
                    <SelectTrigger><SelectValue placeholder="Global" /></SelectTrigger>
                    <SelectContent>
                      {unidades?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">CRM</label>
                  <Input value={editForm.crm} onChange={e => setEditForm({...editForm, crm: e.target.value})} placeholder="CRM/UF 000000" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">CPF</label>
                  <Input value={editForm.cpf} onChange={e => setEditForm({...editForm, cpf: e.target.value})} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">CNS</label>
                  <Input value={editForm.cns} onChange={e => setEditForm({...editForm, cns: e.target.value})} placeholder="Cartao Nacional Saude" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Especialidade</label>
                  <Input value={editForm.especialidade} onChange={e => setEditForm({...editForm, especialidade: e.target.value})} placeholder="Medicina Integrativa" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Telefone</label>
                  <Input value={editForm.telefone} onChange={e => setEditForm({...editForm, telefone: e.target.value})} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Nova Senha (vazio = manter)</label>
                  <Input type="password" value={editForm.senha} onChange={e => setEditForm({...editForm, senha: e.target.value})} placeholder="Min. 6 caracteres" />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Permissoes</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.podeValidar} onChange={e => setEditForm({...editForm, podeValidar: e.target.checked})} className="rounded" />
                    <span className="text-sm">Pode Validar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.podeAssinar} onChange={e => setEditForm({...editForm, podeAssinar: e.target.checked})} className="rounded" />
                    <span className="text-sm">Pode Assinar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.podeBypass} onChange={e => setEditForm({...editForm, podeBypass: e.target.checked})} className="rounded" />
                    <span className="text-sm">Pode Bypass</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.nuncaOpera} onChange={e => setEditForm({...editForm, nuncaOpera: e.target.checked})} className="rounded" />
                    <span className="text-sm">Nunca Opera</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.ativo} onChange={e => setEditForm({...editForm, ativo: e.target.checked})} className="rounded" />
                  <span className="text-sm font-medium">Usuario Ativo</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button className="flex-1 text-xs h-9" onClick={saveEditUser} disabled={editSaving}>
                  {editSaving ? "Salvando..." : "Salvar Alteracoes"}
                </Button>
                <Button variant="outline" className="text-xs h-9" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button variant="destructive" className="text-xs h-9" onClick={deleteUser}>Excluir</Button>
              </div>
            </div>
          </div>
        )}

        <OperationalConfigCard apiBase={apiBase} toast={toast} />

        <SmartReleaseConfigCard apiBase={apiBase} toast={toast} unidades={unidades || []} />

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-primary" />
              Backup para Google Drive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envia 3 arquivos com CODIGO-FONTE COMPLETO para o Google Drive (Google Doc + TXT + MD).
              Backups anteriores sao movidos automaticamente para a subpasta BANCO CODIGOS REPLIT (ANTIGOS).
              Na raiz ficam sempre apenas os 3 arquivos mais recentes. Qualquer IA (ChatGPT, Claude, Manus, Gemini)
              consegue ler e entender o projeto inteiro abrindo qualquer um dos 3 arquivos.
            </p>
            <div className="flex gap-3">
              <Input
                placeholder="Descreva a melhoria implementada..."
                value={backupResumo}
                onChange={(e) => setBackupResumo(e.target.value)}
                className="flex-1"
                disabled={backupLoading}
              />
              <Button
                onClick={handleBackup}
                disabled={backupLoading || backupResumo.trim().length < 5}
              >
                {backupLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><CloudUpload className="mr-2 h-4 w-4" /> Enviar Backup</>
                )}
              </Button>
            </div>

            {backupResult && (
              <div className="rounded border border-green-500/30 bg-green-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Backup enviado com sucesso!
                </div>
                <div className="space-y-1">
                  {backupResult.arquivos?.map((arq: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span>{arq.tipo}: {arq.nome}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={backupResult.pasta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir pasta no Google Drive
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              WhatsApp — Integracao
            </CardTitle>
            <Dialog open={waDialogOpen} onOpenChange={setWaDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Configuracao
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Configurar Provedor WhatsApp</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Provedor</label>
                    <Select
                      value={waNewConfig.provedor}
                      onValueChange={(v) => setWaNewConfig({ ...waNewConfig, provedor: v as "TWILIO" | "GUPSHUP" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TWILIO">Twilio</SelectItem>
                        <SelectItem value="GUPSHUP">Gupshup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {waNewConfig.provedor === "TWILIO" ? (
                    <>
                      <div>
                        <label className="text-sm font-medium">Account SID</label>
                        <Input
                          value={waNewConfig.accountSid}
                          onChange={(e) => setWaNewConfig({ ...waNewConfig, accountSid: e.target.value })}
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Auth Token</label>
                        <Input
                          type="password"
                          value={waNewConfig.authToken}
                          onChange={(e) => setWaNewConfig({ ...waNewConfig, authToken: e.target.value })}
                          placeholder="Token secreto"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-sm font-medium">API Key</label>
                      <Input
                        type="password"
                        value={waNewConfig.apiKey}
                        onChange={(e) => setWaNewConfig({ ...waNewConfig, apiKey: e.target.value })}
                        placeholder="Chave da API Gupshup"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">Numero Remetente (com DDI)</label>
                    <Input
                      value={waNewConfig.numeroRemetente}
                      onChange={(e) => setWaNewConfig({ ...waNewConfig, numeroRemetente: e.target.value })}
                      placeholder="+5511999999999"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Nome de Exibicao</label>
                    <Input
                      value={waNewConfig.nomeExibicao}
                      onChange={(e) => setWaNewConfig({ ...waNewConfig, nomeExibicao: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Unidade (opcional)</label>
                    <Select
                      value={waNewConfig.unidadeId?.toString() || "GLOBAL"}
                      onValueChange={(v) => setWaNewConfig({ ...waNewConfig, unidadeId: v === "GLOBAL" ? undefined : parseInt(v) })}
                    >
                      <SelectTrigger><SelectValue placeholder="Global (todas)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GLOBAL">Global (todas)</SelectItem>
                        {unidades?.map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleSaveWaConfig} className="w-full" disabled={waSavingConfig || !waNewConfig.numeroRemetente}>
                    {waSavingConfig ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar Configuracao"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Integra envio real de mensagens via WhatsApp usando Twilio ou Gupshup.
              Quando configurado, o sistema envia lembretes, codigos e alertas automaticamente.
            </p>

            {waStats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded border border-border p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{waStats.totalHoje ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Mensagens hoje</div>
                </div>
                <div className="rounded border border-border p-3 text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {waStats.porStatus?.find((s: any) => s.status === "ENTREGUE")?.total ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Entregues</div>
                </div>
                <div className="rounded border border-border p-3 text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {waStats.porStatus?.find((s: any) => s.status === "FALHOU")?.total ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Falhas</div>
                </div>
              </div>
            )}

            {waLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : waConfigs.length === 0 ? (
              <div className="rounded border border-dashed border-border p-6 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum provedor configurado.</p>
                <p className="text-xs mt-1">Clique em "Nova Configuracao" para conectar Twilio ou Gupshup.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waConfigs.map((cfg) => (
                  <div key={cfg.id} className="rounded border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={cfg.ativo ? "bg-green-500/10 text-green-500 border-green-500/30" : "bg-red-500/10 text-red-500 border-red-500/30"}>
                          {cfg.provedor}
                        </Badge>
                        <span className="text-sm font-medium">{cfg.nomeExibicao}</span>
                        <span className="text-xs text-muted-foreground">
                          <Phone className="w-3 h-3 inline mr-1" />
                          {cfg.numeroRemetente}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestWaConfig(cfg.id)}
                          disabled={waTestLoading === cfg.id}
                        >
                          {waTestLoading === cfg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                          <span className="ml-1">Testar</span>
                        </Button>
                        <Dialog open={waTesteSendOpen} onOpenChange={setWaTesteSendOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Send className="h-3 w-3 mr-1" />
                              Enviar Teste
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader>
                              <DialogTitle>Enviar Mensagem de Teste</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Telefone (com DDD)</label>
                                <Input
                                  value={waTesteTelefone}
                                  onChange={(e) => setWaTesteTelefone(e.target.value)}
                                  placeholder="11999999999"
                                />
                              </div>
                              <Button
                                onClick={() => handleEnviarTeste(cfg.id)}
                                className="w-full"
                                disabled={waTesteEnviando}
                              >
                                {waTesteEnviando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Enviar Mensagem de Teste"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="ghost" onClick={() => openEditWaConfig(cfg)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleDeleteWaConfig(cfg.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {cfg.accountSid && <span className="text-xs text-muted-foreground">SID: {cfg.accountSid}</span>}
                  </div>
                ))}
              </div>
            )}

            {waMensagens.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Ultimas Mensagens
                </h4>
                <div className="space-y-1">
                  {waMensagens.map((msg) => (
                    <div key={msg.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                      <span className="flex items-center gap-1">{statusIcone(msg.status)}</span>
                      <span className="text-muted-foreground text-xs w-20">{msg.provedor}</span>
                      <span className="text-muted-foreground text-xs w-28">
                        <Phone className="w-3 h-3 inline mr-1" />
                        {msg.telefoneDestino}
                      </span>
                      <span className="flex-1 truncate text-xs">{msg.mensagem?.substring(0, 60)}...</span>
                      <span className="text-xs text-muted-foreground">
                        {msg.criadoEm ? new Date(msg.criadoEm).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {waEditConfig && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setWaEditConfig(null)}>
                <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Editar WhatsApp Config</h3>
                    <button onClick={() => setWaEditConfig(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Numero Remetente</label>
                      <Input value={waEditForm.numeroRemetente} onChange={e => setWaEditForm({...waEditForm, numeroRemetente: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Nome de Exibicao</label>
                      <Input value={waEditForm.nomeExibicao} onChange={e => setWaEditForm({...waEditForm, nomeExibicao: e.target.value})} />
                    </div>
                    {waEditConfig.provedor === "TWILIO" ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Account SID (deixe vazio para manter)</label>
                          <Input value={waEditForm.accountSid} onChange={e => setWaEditForm({...waEditForm, accountSid: e.target.value})} placeholder="Manter atual" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Auth Token (deixe vazio para manter)</label>
                          <Input type="password" value={waEditForm.authToken} onChange={e => setWaEditForm({...waEditForm, authToken: e.target.value})} placeholder="Manter atual" />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">API Key (deixe vazio para manter)</label>
                        <Input type="password" value={waEditForm.apiKey} onChange={e => setWaEditForm({...waEditForm, apiKey: e.target.value})} placeholder="Manter atual" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={waEditForm.ativo} onChange={e => setWaEditForm({...waEditForm, ativo: e.target.checked})} className="rounded" />
                        <span className="text-sm font-medium">Configuracao Ativa</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button className="flex-1 text-xs h-9" onClick={saveEditWaConfig} disabled={waEditSaving}>
                      {waEditSaving ? "Salvando..." : "Salvar Alteracoes"}
                    </Button>
                    <Button variant="outline" className="text-xs h-9" onClick={() => setWaEditConfig(null)}>Cancelar</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}