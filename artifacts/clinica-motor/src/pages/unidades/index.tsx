import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useListarUnidades, getListarUnidadesQueryKey, 
  useCriarUnidade 
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const unidadeSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  telefone: z.string().optional(),
});

export default function UnidadesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: unidades, isLoading } = useListarUnidades({
    query: { queryKey: getListarUnidadesQueryKey() }
  });
  
  const [open, setOpen] = useState(false);
  const criarUnidade = useCriarUnidade();

  const form = useForm<z.infer<typeof unidadeSchema>>({
    resolver: zodResolver(unidadeSchema),
    defaultValues: {
      nome: "",
      endereco: "",
      cidade: "",
      estado: "",
      telefone: "",
    }
  });

  const onSubmit = (values: z.infer<typeof unidadeSchema>) => {
    criarUnidade.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarUnidadesQueryKey() });
        setOpen(false);
        form.reset();
        toast({ title: "Unidade criada com sucesso." });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              Unidades
            </h1>
            <p className="text-muted-foreground mt-1">Gestão das unidades da clínica.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Unidade
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nova Unidade</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Unidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endereco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
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
                      name="cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado (UF)</FormLabel>
                          <FormControl>
                            <Input {...field} maxLength={2} className="uppercase" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                  <Button type="submit" className="w-full" disabled={criarUnidade.isPending}>
                    {criarUnidade.isPending ? "Criando..." : "Criar Unidade"}
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
                {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unidades?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Nenhuma unidade cadastrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    unidades?.map((unidade) => (
                      <TableRow key={unidade.id}>
                        <TableCell className="font-medium text-base">{unidade.nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 mr-1 text-primary/70" />
                            {unidade.cidade && unidade.estado ? `${unidade.cidade} - ${unidade.estado}` : (unidade.endereco || "Não informado")}
                          </div>
                        </TableCell>
                        <TableCell>{unidade.telefone || "-"}</TableCell>
                        <TableCell className="text-right">
                          {unidade.ativa ? (
                            <Badge className="bg-green-500/20 text-green-500 border-none">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
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