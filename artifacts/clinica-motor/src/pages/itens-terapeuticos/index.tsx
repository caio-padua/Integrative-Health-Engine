import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListarItensTerapeuticos, getListarItensTerapeuticosQueryKey, useCriarItemTerapeutico, useToggleItemTerapeutico, ItemTerapeuticoCategoria } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pill } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const itemSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  categoria: z.nativeEnum(ItemTerapeuticoCategoria),
  preco: z.coerce.number().optional(),
  disponivel: z.boolean().default(true),
});

export default function ItensTerapeuticos() {
  const { data: itens, isLoading } = useListarItensTerapeuticos({}, {
    query: { queryKey: getListarItensTerapeuticosQueryKey({}) }
  });
  
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criarItem = useCriarItemTerapeutico();
  const toggleItem = useToggleItemTerapeutico();

  const form = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      categoria: ItemTerapeuticoCategoria.formula,
      preco: 0,
      disponivel: true,
    }
  });

  const onSubmit = (values: z.infer<typeof itemSchema>) => {
    criarItem.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarItensTerapeuticosQueryKey() });
        setOpen(false);
        form.reset();
      }
    });
  };

  const handleToggle = (id: number, disponivel: boolean) => {
    toggleItem.mutate({ id, data: { disponivel } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarItensTerapeuticosQueryKey() });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Pill className="h-8 w-8 text-primary" />
              Itens Terapêuticos
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie as fórmulas, exames, injetáveis e implantes disponíveis.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Novo Item Terapêutico</DialogTitle>
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
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ItemTerapeuticoCategoria).map(([key, value]) => (
                              <SelectItem key={key} value={value}>
                                {key.replace('_', ' ').toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço (Opcional)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="disponivel"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Disponível</FormLabel>
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
                  <Button type="submit" className="w-full" disabled={criarItem.isPending}>
                    {criarItem.isPending ? "Salvando..." : "Salvar Item"}
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
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead className="text-right">Disponibilidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        Nenhum item encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.categoria.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.preco ? `R$ ${item.preco.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-sm ${item.disponivel ? 'text-green-500' : 'text-muted-foreground'}`}>
                              {item.disponivel ? 'Ativo' : 'Inativo'}
                            </span>
                            <Switch 
                              checked={item.disponivel} 
                              onCheckedChange={(val) => handleToggle(item.id, val)}
                              className="scale-125 data-[state=checked]:bg-green-500"
                            />
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
      </div>
    </Layout>
  );
}
