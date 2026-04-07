import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useListarFollowups, getListarFollowupsQueryKey, 
  useCriarFollowup,
  useConcluirFollowup,
  FollowupTipo,
  CriarFollowupBodyTipo,
  CriarFollowupBodyRecorrencia,
  useListarPacientes,
  getListarPacientesQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarClock, CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

const followupSchema = z.object({
  pacienteId: z.coerce.number().min(1, "Paciente é obrigatório"),
  tipo: z.nativeEnum(CriarFollowupBodyTipo),
  dataAgendada: z.string().min(1, "Data é obrigatória"),
  observacoes: z.string().optional(),
  recorrencia: z.nativeEnum(CriarFollowupBodyRecorrencia).default(CriarFollowupBodyRecorrencia.nenhuma),
  unidadeId: z.coerce.number().default(1),
});

export default function FollowupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: followups, isLoading } = useListarFollowups({}, {
    query: { queryKey: getListarFollowupsQueryKey({}) }
  });

  const { data: pacientes } = useListarPacientes({}, {
    query: { queryKey: getListarPacientesQueryKey({}) }
  });
  
  const [open, setOpen] = useState(false);
  const [concluirId, setConcluirId] = useState<number | null>(null);
  const [obsConcluir, setObsConcluir] = useState("");

  const criarFollowup = useCriarFollowup();
  const concluirFollowup = useConcluirFollowup();

  const form = useForm<z.infer<typeof followupSchema>>({
    resolver: zodResolver(followupSchema),
    defaultValues: {
      pacienteId: 0,
      tipo: CriarFollowupBodyTipo.consulta,
      dataAgendada: new Date().toISOString().split('T')[0],
      observacoes: "",
      recorrencia: CriarFollowupBodyRecorrencia.nenhuma,
      unidadeId: user?.unidadeId || 1,
    }
  });

  const onSubmit = (values: z.infer<typeof followupSchema>) => {
    criarFollowup.mutate({ data: { ...values, responsavelId: user?.id } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarFollowupsQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Follow-up agendado com sucesso." });
      }
    });
  };

  const handleConcluir = (id: number) => {
    if (!user) return;
    concluirFollowup.mutate({
      id,
      data: {
        responsavelId: user.id,
        observacoes: obsConcluir
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarFollowupsQueryKey({}) });
        setConcluirId(null);
        setObsConcluir("");
        toast({ title: "Follow-up concluído." });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "realizado": return "bg-green-500/20 text-green-500 border-none";
      case "cancelado": return "bg-red-500/20 text-red-500 border-none";
      case "atrasado": return "bg-red-500 text-white";
      default: return "bg-yellow-500/20 text-yellow-500 border-none";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarClock className="h-8 w-8 text-primary" />
              Follow-up
            </h1>
            <p className="text-muted-foreground mt-1">Acompanhamento contínuo e agendamentos.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Agendar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Novo Follow-up</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pacienteId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paciente</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(parseInt(val))} 
                          defaultValue={field.value ? field.value.toString() : ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um paciente..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pacientes?.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(CriarFollowupBodyTipo).map(t => (
                                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recorrencia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recorrência</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(CriarFollowupBodyRecorrencia).map(r => (
                                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="dataAgendada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Agendada</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={criarFollowup.isPending}>
                    {criarFollowup.isPending ? "Agendando..." : "Agendar"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo / Data</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followups?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        Nenhum follow-up agendado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    followups?.map((fw) => (
                      <TableRow key={fw.id}>
                        <TableCell className="font-medium">
                          {fw.pacienteNome}
                          {fw.observacoes && <div className="text-xs text-muted-foreground">{fw.observacoes}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit capitalize text-xs">{fw.tipo}</Badge>
                            <span className="text-sm flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(fw.dataAgendada).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize text-sm text-muted-foreground">{fw.recorrencia}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(fw.status)}>
                            <span className="capitalize">{fw.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {fw.status === 'agendado' || fw.status === 'atrasado' ? (
                            <Dialog open={concluirId === fw.id} onOpenChange={(open) => !open && setConcluirId(null)}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="border-green-500/30 text-green-500 hover:bg-green-500/10" onClick={() => setConcluirId(fw.id)}>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Concluir
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Concluir Follow-up</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Observações sobre a interação (opcional)</label>
                                    <Textarea 
                                      value={obsConcluir}
                                      onChange={(e) => setObsConcluir(e.target.value)}
                                      placeholder="Ex: Paciente relatou melhora nos sintomas..."
                                    />
                                  </div>
                                  <Button 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleConcluir(fw.id)}
                                    disabled={concluirFollowup.isPending}
                                  >
                                    Confirmar Conclusão
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}