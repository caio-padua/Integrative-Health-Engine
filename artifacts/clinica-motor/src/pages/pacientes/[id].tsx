import { Layout } from "@/components/Layout";
import { useRoute, Link } from "wouter";
import { useObterPaciente, getObterPacienteQueryKey, useAtualizarPaciente } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Activity, Clock, Edit, HeartPulse, MapPin, Mail, Phone, Calendar } from "lucide-react";
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
import { useState, useEffect, useCallback } from "react";
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
      nome: "", cpf: "", telefone: "", email: "",
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

  const onSubmit = (values: z.infer<typeof pacienteSchema>) => {
    atualizarPaciente.mutate({ id, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getObterPacienteQueryKey(id) });
        setOpen(false);
        toast({ title: "Paciente atualizado com sucesso." });
      }
    });
  };

  const p = paciente as any;
  const enderecoCompleto = p ? [p.endereco, p.complemento, p.bairro, p.cidade, p.estado].filter(Boolean).join(', ') : '';

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
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <User className="w-8 h-8" />
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
                <Link href={`/pacientes/${id}/questionario`}>
                  <Button variant="outline">
                    <HeartPulse className="w-4 h-4 mr-2" />
                    Questionario de Saude
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

                      <Button type="submit" className="w-full" disabled={atualizarPaciente.isPending}>
                        {atualizarPaciente.isPending ? "Salvando..." : "Salvar Alteracoes"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            </div>

            <Card className="bg-card border-border/50">
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
              </CardContent>
            </Card>

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
