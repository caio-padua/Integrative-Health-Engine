import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListarPacientes, getListarPacientesQueryKey, useCriarPaciente, CriarPacienteBody } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { useClinic } from "@/contexts/ClinicContext";

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
  genero: z.enum(["masculino", "feminino", "outro", "nao_informado"]).default("nao_informado"),
  alturaCm: z.coerce.number().int().min(30).max(260).optional().or(z.literal("").transform(() => undefined)),
  pesoKg: z.coerce.number().min(0.5).max(500).optional().or(z.literal("").transform(() => undefined)),
  alergias: z.string().optional(),
  condicoesClinicas: z.string().optional(),
  medicamentosContinuos: z.string().optional(),
  gestante: z.boolean().default(false),
  fototipoFitzpatrick: z.enum(["I","II","III","IV","V","VI"]).optional().or(z.literal("").transform(() => undefined)),
  atividadeFisica: z.enum(["sedentario","leve","moderado","intenso","atleta"]).optional().or(z.literal("").transform(() => undefined)),
});

export default function Pacientes() {
  const { unidadeSelecionada } = useClinic();
  const [busca, setBusca] = useState("");
  const queryParams = { busca, ...(unidadeSelecionada ? { unidadeId: unidadeSelecionada } : {}) };
  const { data: pacientes, isLoading } = useListarPacientes(queryParams, {
    query: { queryKey: getListarPacientesQueryKey(queryParams) }
  });
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criarPaciente = useCriarPaciente();

  const form = useForm<z.infer<typeof pacienteSchema>>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: "", cpf: "", telefone: "", email: "",
      cep: "", endereco: "", complemento: "", bairro: "", cidade: "", estado: "", pais: "Brasil",
      unidadeId: 1,
      genero: "nao_informado",
      gestante: false,
    }
  });

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
    const payload: any = { ...values };
    if (payload.alturaCm === undefined || payload.alturaCm === null || (payload.alturaCm as any) === "") delete payload.alturaCm;
    if (payload.pesoKg === undefined || payload.pesoKg === null || (payload.pesoKg as any) === "") delete payload.pesoKg;
    if (!payload.fototipoFitzpatrick) delete payload.fototipoFitzpatrick;
    if (!payload.atividadeFisica) delete payload.atividadeFisica;
    if (typeof payload.pesoKg === "number") payload.pesoKg = String(payload.pesoKg);
    criarPaciente.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarPacientesQueryKey() });
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Pacientes</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Paciente</DialogTitle>
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

                  <FormField control={form.control} name="genero" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="nao_informado">Não informado</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Dados Clínicos</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="alturaCm" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altura (cm)</FormLabel>
                          <FormControl><Input type="number" min={30} max={260} placeholder="170" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="pesoKg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (kg)</FormLabel>
                          <FormControl><Input type="number" step="0.1" min={0.5} max={500} placeholder="70.5" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="fototipoFitzpatrick" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fototipo (Fitzpatrick)</FormLabel>
                          <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                            <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="I">I — Pele muito clara</SelectItem>
                              <SelectItem value="II">II — Pele clara</SelectItem>
                              <SelectItem value="III">III — Pele média</SelectItem>
                              <SelectItem value="IV">IV — Pele morena clara</SelectItem>
                              <SelectItem value="V">V — Pele morena</SelectItem>
                              <SelectItem value="VI">VI — Pele negra</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <FormField control={form.control} name="atividadeFisica" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Atividade Física</FormLabel>
                          <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                            <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="sedentario">Sedentário</SelectItem>
                              <SelectItem value="leve">Leve</SelectItem>
                              <SelectItem value="moderado">Moderado</SelectItem>
                              <SelectItem value="intenso">Intenso</SelectItem>
                              <SelectItem value="atleta">Atleta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="gestante" render={({ field }) => (
                        <FormItem className="flex flex-col gap-2">
                          <FormLabel>Gestante</FormLabel>
                          <div className="flex items-center gap-2 h-10">
                            <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                            <span className="text-sm text-muted-foreground">Marcar se gestante / lactante</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="alergias" render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Alergias <span className="text-red-500">⚠</span></FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder="Ex.: Dipirona, frutos do mar, látex…" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="condicoesClinicas" render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Condições Clínicas / Comorbidades</FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder="Ex.: Hipertensão, Diabetes tipo 2, Hipotireoidismo…" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="medicamentosContinuos" render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Medicamentos de Uso Contínuo</FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder="Ex.: Losartana 50mg 1x/dia, Levotiroxina 50mcg em jejum…" /></FormControl>
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

                  <Button type="submit" className="w-full" disabled={criarPaciente.isPending}>
                    {criarPaciente.isPending ? "Salvando..." : "Salvar Paciente"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pacientes por nome ou CPF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pacientes?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                          Nenhum paciente encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pacientes?.map((paciente) => (
                        <TableRow key={paciente.id}>
                          <TableCell className="font-medium">{paciente.nome}</TableCell>
                          <TableCell>{paciente.cpf || "-"}</TableCell>
                          <TableCell>{paciente.telefone}</TableCell>
                          <TableCell>
                            {paciente.statusAtivo ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                                Inativo
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/pacientes/${paciente.id}`} className="text-primary hover:underline text-sm">
                              Ver Detalhes
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
