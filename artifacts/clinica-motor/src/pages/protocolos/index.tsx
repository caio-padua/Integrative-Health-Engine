import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListarProtocolos, getListarProtocolosQueryKey, useCriarProtocolo } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, BookOpen, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const protocoloSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  ativo: z.boolean().default(true),
});

export default function Protocolos() {
  const { user } = useAuth();
  const { data: protocolos, isLoading } = useListarProtocolos({}, {
    query: { queryKey: getListarProtocolosQueryKey({}) }
  });
  
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criarProtocolo = useCriarProtocolo();

  const form = useForm<z.infer<typeof protocoloSchema>>({
    resolver: zodResolver(protocoloSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      categoria: "",
      ativo: true,
    }
  });

  const onSubmit = (values: z.infer<typeof protocoloSchema>) => {
    if (!user) return;
    criarProtocolo.mutate({ data: { ...values, criadoPorId: user.id } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarProtocolosQueryKey({}) });
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              Protocolos Terapêuticos
            </h1>
            <p className="text-muted-foreground mt-1">Configure agrupamentos de itens para prescrição rápida.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Protocolo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Novo Protocolo</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Protocolo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ativo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativo</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={criarProtocolo.isPending}>
                    {criarProtocolo.isPending ? "Salvando..." : "Salvar Protocolo"}
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocolos?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Nenhum protocolo cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    protocolos?.map((protocolo) => (
                      <TableRow key={protocolo.id}>
                        <TableCell className="font-medium">
                          {protocolo.nome}
                          {protocolo.descricao && <div className="text-xs text-muted-foreground">{protocolo.descricao}</div>}
                        </TableCell>
                        <TableCell>
                          {protocolo.categoria ? (
                            <Badge variant="outline">{protocolo.categoria}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-muted-foreground text-sm">
                            <Layers className="w-4 h-4 mr-1" />
                            {protocolo.itens?.length || 0} itens
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`text-sm font-medium ${protocolo.ativo ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {protocolo.ativo ? 'Ativo' : 'Inativo'}
                          </span>
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