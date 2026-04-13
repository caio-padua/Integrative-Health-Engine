import { Layout } from "@/components/Layout";
import { useRoute, Link } from "wouter";
import { useObterPaciente, getObterPacienteQueryKey, useAtualizarPaciente } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Activity, Clock, Edit, HeartPulse, MapPin, Mail, Phone, Calendar, FileText, Camera, Upload, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}

function formatCelular(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0,5)}-${digits.slice(5)}`;
}

const pacienteSchema = z.object({
  nome: z.string().min(1, "Nome e obrigatorio"),
  cpf: z.string().optional(),
  telefone: z.string().min(1, "Celular e obrigatorio"),
  email: z.string().email("E-mail invalido").optional().or(z.literal("")),
  dataNascimento: z.string().optional(),
  statusAtivo: z.boolean().optional(),
  planoAcompanhamento: z.enum(["diamante", "ouro", "prata", "cobre"]).optional(),
  googleDriveFolderId: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  pais: z.string().optional(),
  unidadeId: z.coerce.number().min(1, "Unidade e obrigatoria"),
});

export default function PacienteDetalhe() {
  const [, params] = useRoute("/pacientes/:id");
  const id = parseInt(params?.id || "0");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: paciente, isLoading } = useObterPaciente(id, {
    query: { enabled: !!id, queryKey: getObterPacienteQueryKey(id) }
  });

  const atualizarPaciente = useAtualizarPaciente();

  const form = useForm<z.infer<typeof pacienteSchema>>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: "", cpf: "", telefone: "", email: "", dataNascimento: "",
      statusAtivo: true, planoAcompanhamento: "cobre" as any, googleDriveFolderId: "",
      cep: "", endereco: "", complemento: "", bairro: "", cidade: "", estado: "", pais: "Brasil",
      unidadeId: 1,
    }
  });

  useEffect(() => {
    if (paciente) {
      form.reset({
        nome: paciente.nome,
        cpf: paciente.cpf || "",
        telefone: paciente.telefone,
        email: paciente.email || "",
        dataNascimento: p?.dataNascimento ? String(p.dataNascimento).slice(0, 10) : "",
        statusAtivo: paciente.statusAtivo ?? true,
        planoAcompanhamento: (p?.planoAcompanhamento || "cobre") as any,
        googleDriveFolderId: p?.googleDriveFolderId || "",
        cep: (paciente as any).cep || "",
        endereco: (paciente as any).endereco || "",
        complemento: (paciente as any).complemento || "",
        bairro: (paciente as any).bairro || "",
        cidade: (paciente as any).cidade || "",
        estado: (paciente as any).estado || "",
        pais: (paciente as any).pais || "Brasil",
        unidadeId: paciente.unidadeId,
      });
    }
  }, [paciente, form]);

  const buscarCep = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    try {
      const resp = await fetch(`${BASE_URL}api/cep/${digits}`);
      if (!resp.ok) return;
      const data = await resp.json();
      form.setValue("endereco", data.endereco || "");
      form.setValue("bairro", data.bairro || "");
      form.setValue("cidade", data.cidade || "");
      form.setValue("estado", data.estado || "");
      form.setValue("pais", data.pais || "Brasil");
    } catch {}
  }, [form]);

  const [saving, setSaving] = useState(false);
  const onSubmit = async (values: z.infer<typeof pacienteSchema>) => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}api/pacientes/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao salvar" }));
        toast({ title: err.error || "Erro ao salvar", variant: "destructive" });
        setSaving(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: getObterPacienteQueryKey(id) });
      setOpen(false);
      toast({ title: "Paciente atualizado com sucesso." });
    } catch {
      toast({ title: "Erro de conexao", variant: "destructive" });
    }
    setSaving(false);
  };

  const p = paciente as any;
  const enderecoCompleto = p ? [p.endereco, p.complemento, p.bairro, p.cidade, p.estado].filter(Boolean).join(', ') : '';

  const fotoRostoRef = useRef<HTMLInputElement>(null);
  const fotoCorpoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (tipo: "fotoRosto" | "fotoCorpo", file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch(`${BASE_URL}api/pacientes/${id}/fotos`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [tipo]: base64 }),
        });
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: getObterPacienteQueryKey(id) });
          toast({ title: tipo === "fotoRosto" ? "Foto do rosto salva" : "Foto do corpo salva" });
        }
      } catch {
        toast({ title: "Erro ao salvar foto", variant: "destructive" });
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 bg-primary/20 flex items-center justify-center text-primary cursor-pointer relative overflow-hidden group"
                  onClick={() => fotoRostoRef.current?.click()}
                >
                  {p?.fotoRosto ? (
                    <img src={p.fotoRosto} alt="Rosto" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <input
                    ref={fotoRostoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handlePhotoUpload("fotoRosto", e.target.files[0]); }}
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                    {paciente?.nome}
                    {paciente?.statusAtivo ? (
                      <Badge className="bg-green-500/20 text-green-500 border-none">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    CPF: {paciente?.cpf || "Nao informado"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const apiBase = `${BASE_URL}api/ras/pdf/paciente/${id}`;
                    window.open(apiBase, "_blank");
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar RAS PDF
                </Button>
                <Link href={`/pacientes/${id}/questionario`}>
                  <Button variant="outline">
                    <HeartPulse className="w-4 h-4 mr-2" />
                    Questionario de Saude
                  </Button>
                </Link>
                <Link href={`/pacientes/${id}/monitoramento`}>
                  <Button variant="outline">
                    <Activity className="w-4 h-4 mr-2" />
                    Monitoramento
                  </Button>
                </Link>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Paciente
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Editar Paciente</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField control={form.control} name="nome" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="cpf" render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input
                                value={field.value}
                                onChange={(e) => field.onChange(formatCpf(e.target.value))}
                                placeholder="000.000.000-00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="telefone" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Celular</FormLabel>
                            <FormControl>
                              <Input
                                value={field.value}
                                onChange={(e) => field.onChange(formatCelular(e.target.value))}
                                placeholder="(11) 99999-9999"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl><Input type="email" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="dataNascimento" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Nascimento</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="planoAcompanhamento" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plano de Acompanhamento</FormLabel>
                            <Select value={field.value || "cobre"} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="diamante">Diamante</SelectItem>
                                <SelectItem value="ouro">Ouro</SelectItem>
                                <SelectItem value="prata">Prata</SelectItem>
                                <SelectItem value="cobre">Cobre</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="statusAtivo" render={({ field }) => (
                          <FormItem className="flex items-center gap-3 space-y-0 pt-2">
                            <FormControl>
                              <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel>Paciente Ativo</FormLabel>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="googleDriveFolderId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Google Drive Folder ID</FormLabel>
                            <FormControl><Input {...field} placeholder="ID da pasta no Drive" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="border-t pt-4 mt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-3">Endereco</p>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField control={form.control} name="cep" render={({ field }) => (
                            <FormItem>
                              <FormLabel>CEP</FormLabel>
                              <FormControl>
                                <Input
                                  value={field.value}
                                  onChange={(e) => {
                                    const formatted = formatCep(e.target.value);
                                    field.onChange(formatted);
                                    if (formatted.replace(/\D/g, '').length === 8) buscarCep(formatted);
                                  }}
                                  placeholder="00000-000"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="col-span-2">
                            <FormField control={form.control} name="endereco" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Endereco</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <FormField control={form.control} name="complemento" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Complemento</FormLabel>
                              <FormControl><Input {...field} placeholder="Apto, Sala, Bloco..." /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="bairro" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <FormField control={form.control} name="cidade" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="estado" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <FormControl><Input {...field} placeholder="SP" maxLength={2} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="pais" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pais</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={saving}>
                        {saving ? "Salvando..." : "Salvar Alteracoes"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2 bg-card border-border/50">
                <CardHeader>
                  <CardTitle>Informacoes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{paciente?.telefone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{paciente?.email || "Nao informado"}</span>
                  </div>
                  {p?.dataNascimento && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{p.dataNascimento}</span>
                    </div>
                  )}
                  {enderecoCompleto && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{enderecoCompleto}{p?.cep ? ` - CEP ${p.cep}` : ''}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span>Plano: <Badge variant="outline" className="ml-1">{(p?.planoAcompanhamento || "cobre").toUpperCase()}</Badge></span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Fotos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rosto</p>
                      <div
                        className="w-full aspect-square bg-muted/20 border border-dashed border-border/40 flex items-center justify-center cursor-pointer relative overflow-hidden group"
                        onClick={() => fotoRostoRef.current?.click()}
                      >
                        {p?.fotoRosto ? (
                          <img src={p.fotoRosto} alt="Rosto" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <Upload className="w-5 h-5 mx-auto text-muted-foreground/40 mb-1" />
                            <span className="text-[9px] text-muted-foreground/40">Clique para enviar</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Corpo</p>
                      <div
                        className="w-full aspect-square bg-muted/20 border border-dashed border-border/40 flex items-center justify-center cursor-pointer relative overflow-hidden group"
                        onClick={() => fotoCorpoRef.current?.click()}
                      >
                        {p?.fotoCorpo ? (
                          <img src={p.fotoCorpo} alt="Corpo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <Upload className="w-5 h-5 mx-auto text-muted-foreground/40 mb-1" />
                            <span className="text-[9px] text-muted-foreground/40">Clique para enviar</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <input
                        ref={fotoCorpoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handlePhotoUpload("fotoCorpo", e.target.files[0]); }}
                      />
                    </div>
                  </div>
                  {uploading && <p className="text-[10px] text-primary animate-pulse">Enviando foto...</p>}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2 bg-card border-border/50">
                <CardHeader>
                  <CardTitle>Historico Clinico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-md border border-dashed">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>O historico de consultas, procedimentos e validacoes aparecera aqui.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle>Follow-ups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-md border border-dashed">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum follow-up pendente.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
