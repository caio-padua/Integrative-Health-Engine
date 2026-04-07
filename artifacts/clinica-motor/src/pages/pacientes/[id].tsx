import { Layout } from "@/components/Layout";
import { useRoute } from "wouter";
import { useObterPaciente, getObterPacienteQueryKey, useAtualizarPaciente } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Activity, Clock, Edit } from "lucide-react";
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
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const pacienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().optional(),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  unidadeId: z.coerce.number().min(1, "Unidade é obrigatória"),
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
      nome: "",
      cpf: "",
      telefone: "",
      email: "",
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
        unidadeId: paciente.unidadeId,
      });
    }
  }, [paciente, form]);

  const onSubmit = (values: z.infer<typeof pacienteSchema>) => {
    atualizarPaciente.mutate({ id, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getObterPacienteQueryKey(id) });
        setOpen(false);
        toast({ title: "Paciente atualizado com sucesso." });
      }
    });
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
                  <p className="text-muted-foreground flex gap-4 mt-1">
                    <span>CPF: {paciente?.cpf || "Não informado"}</span>
                    <span>Tel: {paciente?.telefone}</span>
                    <span>Email: {paciente?.email || "Não informado"}</span>
                  </p>
                </div>
              </div>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Paciente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Paciente</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="cpf"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPF</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="telefone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={atualizarPaciente.isPending}>
                        {atualizarPaciente.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2 bg-card border-border/50">
                <CardHeader>
                  <CardTitle>Histórico Clínico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-md border border-dashed">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>O histórico de consultas, procedimentos e validações aparecerá aqui.</p>
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