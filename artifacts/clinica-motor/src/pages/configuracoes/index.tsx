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
import { Plus, Settings, Users, ShieldAlert, CloudUpload, FileText, Loader2, CheckCircle2, ExternalLink, MessageSquare, Phone, Check, CheckCheck, X, Send, TestTube, Pencil, Shield, Layers, Timer } from "lucide-react";
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
    nomeExibicao: "Clinica PADCOM",
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
        setWaNewConfig({ provedor: "TWILIO", accountSid: "", authToken: "", apiKey: "", numeroRemetente: "", nomeExibicao: "Clinica PADCOM", unidadeId: undefined });
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
    setEditForm({ nome: u.nome || "", email: u.email || "", perfil: u.perfil || "enfermeira", unidadeId: u.unidadeId || "", senha: "", ativo: u.ativo ?? true });
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
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        Nenhum usuário cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios?.map((u) => (
                      <TableRow key={u.id} className="group">
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>{getPerfilBadge(u.perfil)}</TableCell>
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
            <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Nova Senha (deixe vazio para manter)</label>
                  <Input type="password" value={editForm.senha} onChange={e => setEditForm({...editForm, senha: e.target.value})} placeholder="Min. 6 caracteres" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.ativo} onChange={e => setEditForm({...editForm, ativo: e.target.checked})} className="rounded" />
                    <span className="text-sm font-medium">Usuario Ativo</span>
                  </label>
                </div>
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