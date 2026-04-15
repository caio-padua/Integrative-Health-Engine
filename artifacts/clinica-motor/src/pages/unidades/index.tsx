import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, MapPin, Pencil, Calendar, Trash2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface Unidade {
  id: number;
  nome: string;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  cnpj: string | null;
  telefone: string | null;
  tipo: string;
  nick: string | null;
  googleCalendarId: string | null;
  googleCalendarEmail: string | null;
  emailGeral: string | null;
  emailAgenda: string | null;
  emailEnfermagem01: string | null;
  emailEnfermagem02: string | null;
  emailConsultor01: string | null;
  emailConsultor02: string | null;
  emailSupervisor01: string | null;
  emailSupervisor02: string | null;
  emailFinanceiro01: string | null;
  emailOuvidoria01: string | null;
  cor: string;
  ativa: boolean;
}

const EMAIL_FIELDS = [
  { key: "emailGeral", label: "EMAIL PRINCIPAL", sublabel: "Comunicacoes gerais da clinica", suffix: "geral" },
  { key: "emailAgenda", label: "EMAIL AGENDA", sublabel: "Integracao Google Calendar — paciente recebe convite", suffix: "agenda" },
  { key: "emailEnfermagem01", label: "ENFERMAGEM 01", sublabel: "Cargo enfermagem — funcionario adota enquanto empregado", suffix: "enfermagem01" },
  { key: "emailEnfermagem02", label: "ENFERMAGEM 02", sublabel: "Cargo enfermagem — funcionario adota enquanto empregado", suffix: "enfermagem02" },
  { key: "emailConsultor01", label: "CONSULTOR 01", sublabel: "Consultoria clinica — tira duvidas de saude", suffix: "consultor01" },
  { key: "emailConsultor02", label: "CONSULTOR 02", sublabel: "Consultoria clinica — tira duvidas de saude", suffix: "consultor02" },
  { key: "emailSupervisor01", label: "SUPERVISOR 01", sublabel: "Supervisao de processos e qualidade", suffix: "supervisor01" },
  { key: "emailSupervisor02", label: "SUPERVISOR 02", sublabel: "Supervisao de processos e qualidade", suffix: "supervisor02" },
  { key: "emailFinanceiro01", label: "FINANCEIRO 01", sublabel: "Gestao financeira e cobrancas", suffix: "financeiro01" },
  { key: "emailOuvidoria01", label: "OUVIDORIA 01", sublabel: "Canal de manifestacoes e reclamacoes", suffix: "ouvidoria01" },
] as const;

function buildSuggestedEmail(nick: string, suffix: string): string {
  if (!nick) return "";
  const clean = nick.toLowerCase().replace(/instituto\s*/gi, "").replace(/medico\s*/gi, "").trim().split(/\s+/)[0];
  if (!clean) return "";
  return `pawards.${clean}.${suffix}@gmail.com`;
}

interface UnidadeForm {
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  cnpj: string;
  telefone: string;
  tipo: string;
  nick: string;
  cor: string;
  googleCalendarEmail: string;
  googleCalendarId: string;
  emailGeral: string;
  emailAgenda: string;
  emailEnfermagem01: string;
  emailEnfermagem02: string;
  emailConsultor01: string;
  emailConsultor02: string;
  emailSupervisor01: string;
  emailSupervisor02: string;
  emailFinanceiro01: string;
  emailOuvidoria01: string;
}

const defaultForm: UnidadeForm = {
  nome: "", endereco: "", bairro: "", cidade: "", estado: "",
  cep: "", cnpj: "", telefone: "", tipo: "clinic", nick: "", cor: "#3B82F6",
  googleCalendarEmail: "", googleCalendarId: "",
  emailGeral: "", emailAgenda: "",
  emailEnfermagem01: "", emailEnfermagem02: "",
  emailConsultor01: "", emailConsultor02: "",
  emailSupervisor01: "", emailSupervisor02: "",
  emailFinanceiro01: "", emailOuvidoria01: "",
};

function sanitizeNick(value: string): string {
  const noAccents = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = noAccents.trim().split(/\s+/).slice(0, 3);
  return words.join(" ").toUpperCase();
}

function UnidadeFormDialog({ unidade, open, onOpenChange, onSaved }: {
  unidade?: Unidade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<UnidadeForm>(defaultForm);
  const [cepLoading, setCepLoading] = useState(false);

  const isEdit = !!unidade;

  useEffect(() => {
    if (open && unidade) {
      setForm({
        nome: unidade.nome || "",
        endereco: unidade.endereco || "",
        bairro: unidade.bairro || "",
        cidade: unidade.cidade || "",
        estado: unidade.estado || "",
        cep: unidade.cep || "",
        cnpj: unidade.cnpj || "",
        telefone: unidade.telefone || "",
        tipo: unidade.tipo || "clinic",
        nick: unidade.nick || "",
        cor: unidade.cor || "#3B82F6",
        googleCalendarEmail: unidade.googleCalendarEmail || "",
        googleCalendarId: unidade.googleCalendarId || "",
        emailGeral: unidade.emailGeral || "",
        emailAgenda: unidade.emailAgenda || "",
        emailEnfermagem01: unidade.emailEnfermagem01 || "",
        emailEnfermagem02: unidade.emailEnfermagem02 || "",
        emailConsultor01: unidade.emailConsultor01 || "",
        emailConsultor02: unidade.emailConsultor02 || "",
        emailSupervisor01: unidade.emailSupervisor01 || "",
        emailSupervisor02: unidade.emailSupervisor02 || "",
        emailFinanceiro01: unidade.emailFinanceiro01 || "",
        emailOuvidoria01: unidade.emailOuvidoria01 || "",
      });
    } else if (open) {
      setForm(defaultForm);
    }
  }, [open, unidade]);

  const update = (field: keyof UnidadeForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const autoFillEmails = (nickValue: string) => {
    const sanitized = sanitizeNick(nickValue);
    setForm(prev => {
      const updated = { ...prev, nick: sanitized };
      EMAIL_FIELDS.forEach(ef => {
        if (!prev[ef.key as keyof UnidadeForm]) {
          (updated as any)[ef.key] = buildSuggestedEmail(sanitized, ef.suffix);
        }
      });
      return updated;
    });
  };

  const buscarCep = useCallback(async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: data.logradouro ? data.logradouro.toUpperCase() : prev.endereco,
          bairro: data.bairro ? data.bairro.toUpperCase() : prev.bairro,
          cidade: data.localidade ? data.localidade.toUpperCase() : prev.cidade,
          estado: data.uf ? data.uf.toUpperCase() : prev.estado,
        }));
        toast({ title: "CEP encontrado", description: `${data.logradouro}, ${data.bairro}` });
      } else {
        toast({ title: "CEP nao encontrado", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setCepLoading(false);
    }
  }, [toast]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = isEdit
        ? `${BASE_URL}api/unidades/${unidade!.id}`
        : `${BASE_URL}api/unidades`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Unidade atualizada" : "Unidade criada" });
      onSaved();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao salvar unidade", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Nome da Unidade</Label>
            <Input value={form.nome} onChange={e => update("nome", e.target.value)} className="uppercase" />
          </div>

          <div>
            <Label>Nick da Empresa</Label>
            <Input
              value={form.nick}
              onChange={e => autoFillEmails(e.target.value)}
              placeholder="Ex: INSTITUTO PADUA"
              className="uppercase"
              maxLength={40}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Maximo 3 palavras, sem acentos, auto-convertido para MAIUSCULAS. Usado como identidade visual em todos os documentos, emails e WhatsApp.</p>
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">Preview: PAWARDS - {form.nick || "..."} | Agente: FINANCEIRO - {form.nick || "..."}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>CEP</Label>
              <div className="flex gap-1">
                <Input
                  value={form.cep}
                  onChange={e => update("cep", e.target.value)}
                  placeholder="00000-000"
                  onBlur={() => buscarCep(form.cep)}
                />
              </div>
              {cepLoading && <span className="text-xs text-muted-foreground">Buscando...</span>}
            </div>
            <div className="col-span-2">
              <Label>Endereco (Rua, Numero)</Label>
              <Input value={form.endereco} onChange={e => update("endereco", e.target.value)} className="uppercase" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={e => update("bairro", e.target.value)} className="uppercase" />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={e => update("cidade", e.target.value)} className="uppercase" />
            </div>
            <div>
              <Label>UF</Label>
              <Input value={form.estado} onChange={e => update("estado", e.target.value)} maxLength={2} className="uppercase" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => update("telefone", e.target.value)} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => update("cnpj", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tipo</Label>
              <select
                value={form.tipo}
                onChange={e => update("tipo", e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="clinic">Clinica</option>
                <option value="enfermagem">Enfermagem</option>
                <option value="domiciliar">Domiciliar</option>
                <option value="telemedicina">Telemedicina</option>
                <option value="personal">Pessoal</option>
              </select>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.cor} onChange={e => update("cor", e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                <Input value={form.cor} onChange={e => update("cor", e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
            <div>
              <Label>Google Calendar Email</Label>
              <Input value={form.googleCalendarEmail} onChange={e => update("googleCalendarEmail", e.target.value)} placeholder="email@gmail.com" />
            </div>
          </div>

          <div>
            <Label>Google Calendar ID</Label>
            <Input value={form.googleCalendarId} onChange={e => update("googleCalendarId", e.target.value)} placeholder="calendar-id (opcional)" />
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Emails PAWARDS — Auto-preenchidos</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">
              Todos os emails sao gerados automaticamente a partir do Nick. Editaveis — o Dr. Caio cria e mantem posse com 2FA.
            </p>
            <div className="space-y-3">
              {EMAIL_FIELDS.map((ef) => {
                const suggested = buildSuggestedEmail(form.nick, ef.suffix);
                const currentVal = form[ef.key as keyof UnidadeForm] as string;
                return (
                  <div key={ef.key}>
                    <Label className="text-xs font-bold">{ef.label}</Label>
                    <Input
                      value={currentVal}
                      onChange={e => update(ef.key as keyof UnidadeForm, e.target.value)}
                      placeholder={suggested || "Preencha o Nick primeiro"}
                      className="font-mono text-xs"
                    />
                    <p className="text-[9px] text-muted-foreground mt-0.5">{ef.sublabel}</p>
                    {suggested && !currentVal && (
                      <p className="text-[9px] text-amber-600 mt-0.5">Sugestao: {suggested}</p>
                    )}
                    {suggested && currentVal && currentVal !== suggested && (
                      <p className="text-[9px] text-blue-600 mt-0.5">Padrao sugerido: {suggested}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Button onClick={() => saveMutation.mutate()} className="w-full" disabled={saveMutation.isPending || !form.nome}>
            {saveMutation.isPending ? "Salvando..." : (isEdit ? "Salvar Alteracoes" : "Criar Unidade")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UnidadesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: unidades = [], isLoading } = useQuery<Unidade[]>({
    queryKey: ["unidades"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/unidades`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editUnidade, setEditUnidade] = useState<Unidade | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["unidades"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE_URL}api/unidades/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => { refresh(); toast({ title: "Unidade excluida" }); },
    onError: () => toast({ title: "Erro ao excluir unidade", variant: "destructive" }),
  });

  const handleDelete = (u: Unidade) => {
    if (!confirm(`Excluir a unidade "${u.nome}" permanentemente?`)) return;
    deleteMutation.mutate(u.id);
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Unidades
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestao das unidades da clinica - {unidades.length} unidades
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Unidade
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Cor</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereco</TableHead>
                    <TableHead>Bairro / CEP</TableHead>
                    <TableHead>Google Calendar</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unidades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        Nenhuma unidade cadastrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    unidades.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: u.cor }} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{u.nome}</div>
                          {u.nick && <div className="text-xs text-blue-600 font-medium">PAWARDS - {u.nick}</div>}
                          {u.telefone && <div className="text-xs text-muted-foreground">{u.telefone}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1 text-sm">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div>
                              <div>{u.endereco || "-"}</div>
                              {u.cidade && <div className="text-xs text-muted-foreground">{u.cidade} - {u.estado}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{u.bairro || "-"}</div>
                          {u.cep && <div className="text-xs text-muted-foreground font-mono">{u.cep}</div>}
                        </TableCell>
                        <TableCell>
                          {u.googleCalendarEmail ? (
                            <div className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{u.googleCalendarEmail}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {u.tipo === "clinic" ? "Clinica" : u.tipo === "enfermagem" ? "Enfermagem" : u.tipo === "domiciliar" ? "Domiciliar" : u.tipo === "telemedicina" ? "Telemedicina" : u.tipo === "personal" ? "Pessoal" : u.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditUnidade(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(u)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <UnidadeFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSaved={refresh}
        />

        {editUnidade && (
          <UnidadeFormDialog
            unidade={editUnidade}
            open={!!editUnidade}
            onOpenChange={(open) => { if (!open) setEditUnidade(null); }}
            onSaved={refresh}
          />
        )}
      </div>
    </Layout>
  );
}
