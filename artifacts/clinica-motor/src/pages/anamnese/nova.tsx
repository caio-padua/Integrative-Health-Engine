import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCriarAnamnese, useListarPacientes, getListarPacientesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

const novaAnamneseSchema = z.object({
  pacienteId: z.coerce.number().min(1, "Paciente é obrigatório"),
});

export default function NovaAnamnese() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: pacientes } = useListarPacientes({}, { query: { queryKey: getListarPacientesQueryKey({}) } });
  
  const criarAnamnese = useCriarAnamnese();

  const form = useForm<z.infer<typeof novaAnamneseSchema>>({
    resolver: zodResolver(novaAnamneseSchema),
    defaultValues: {
      pacienteId: 0,
    }
  });

  const onSubmit = (values: z.infer<typeof novaAnamneseSchema>) => {
    criarAnamnese.mutate({ data: values }, {
      onSuccess: (data) => {
        setLocation(`/anamnese/${data.id}`);
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/anamnese">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nova Anamnese</h1>
            <p className="text-muted-foreground mt-1">Inicie uma nova avaliação para um paciente.</p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Selecionar Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            <SelectItem key={p.id} value={p.id.toString()}>{p.nome} - CPF: {p.cpf || "N/A"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={criarAnamnese.isPending}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {criarAnamnese.isPending ? "Iniciando..." : "Iniciar Avaliação"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}