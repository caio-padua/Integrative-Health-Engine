import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useListarItensTerapeuticos, getListarItensTerapeuticosQueryKey,
  useCriarItemTerapeutico, useToggleItemTerapeutico, ItemTerapeuticoCategoria
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
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
  nome: z.string().min(1, "Nome e obrigatorio"),
  descricao: z.string().optional(),
  categoria: z.nativeEnum(ItemTerapeuticoCategoria),
  preco: z.coerce.number().optional(),
  disponivel: z.boolean().default(true),
});

const categoriaCores: Record<string, string> = {
  exame: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  formula: "bg-green-500/10 text-green-400 border-green-500/30",
  injetavel_im: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  injetavel_ev: "bg-red-500/10 text-red-400 border-red-500/30",
  implante: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  protocolo: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
};

const categoriaLabels: Record<string, string> = {
  exame: "EXAME",
  formula: "FORMULA",
  injetavel_im: "INJETAVEL IM",
  injetavel_ev: "INJETAVEL EV",
  implante: "IMPLANTE",
  protocolo: "PROTOCOLO",
};

export default function ItensTerapeuticos() {
  const { data: itens, isLoading } = useListarItensTerapeuticos({}, {
    query: { queryKey: getListarItensTerapeuticosQueryKey({}) }
  });

  const [open, setOpen] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const [filtroTexto, setFiltroTexto] = useState("");
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

  const itensFiltrados = itens?.filter(item => {
    const matchCategoria = filtroCategoria === "todos" || item.categoria === filtroCategoria;
    const matchTexto = !filtroTexto || 
      item.nome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (item.codigoPadcom || "").toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (item.areaSemantica || "").toLowerCase().includes(filtroTexto.toLowerCase());
    return matchCategoria && matchTexto;
  }) || [];

  // Contagem por categoria
  const contagens = itens?.reduce((acc, item) => {
    acc[item.categoria] = (acc[item.categoria] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Itens Terapeuticos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Catalogo PADCOM V9 — Formulas, Exames, Injetaveis, Implantes, Protocolos
            </p>
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
                <DialogTitle>Novo Item Terapeutico</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
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
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ItemTerapeuticoCategoria).map(([key, value]) => (
                              <SelectItem key={key} value={value}>
                                {categoriaLabels[value] || key.toUpperCase()}
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
                        <FormLabel>Preco (Opcional)</FormLabel>
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Disponivel</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
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

        {/* Resumo por categoria */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Object.entries(categoriaLabels).map(([cat, label]) => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(filtroCategoria === cat ? "todos" : cat)}
              className={`p-3 rounded-lg border text-center transition-all ${
                filtroCategoria === cat
                  ? `${categoriaCores[cat]} shadow-sm`
                  : "border-border bg-muted/10 hover:bg-muted/20"
              }`}
            >
              <p className="text-lg font-bold">{contagens[cat] || 0}</p>
              <p className="text-xs font-medium">{label}</p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-muted/30"
              placeholder="Buscar por nome ou codigo PADCOM..."
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
            />
          </div>
          {filtroCategoria !== "todos" && (
            <Button variant="outline" size="sm" onClick={() => setFiltroCategoria("todos")}>
              <Filter className="w-3 h-3 mr-1" />
              Limpar filtro
            </Button>
          )}
        </div>

        <Card className="bg-card">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {itensFiltrados.length} itens {filtroCategoria !== "todos" ? `em ${categoriaLabels[filtroCategoria]}` : "no total"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4,5].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Codigo PADCOM</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Area / Bloco</TableHead>
                    <TableHead>Via / Freq.</TableHead>
                    <TableHead className="text-right">Disponivel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        Nenhum item encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itensFiltrados.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/5">
                        <TableCell>
                          {item.codigoPadcom ? (
                            <code className="text-xs bg-muted/40 px-1.5 py-0.5 rounded font-mono text-primary/80">
                              {item.codigoPadcom}
                            </code>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.nome}</p>
                            {item.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.descricao}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${categoriaCores[item.categoria] || ""}`}>
                            {categoriaLabels[item.categoria] || item.categoria}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {item.areaSemantica && (
                              <span className="font-mono text-muted-foreground">{item.areaSemantica}</span>
                            )}
                            {item.blocoId && (
                              <span className="ml-1 text-muted-foreground/60">/ {item.blocoId}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {item.viaUso && <span>{item.viaUso}</span>}
                            {item.frequenciaBase && (
                              <span className="block text-xs opacity-60 truncate max-w-[100px]">{item.frequenciaBase}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-xs font-medium ${item.disponivel ? "text-green-500" : "text-muted-foreground"}`}>
                              {item.disponivel ? "Ativo" : "Inativo"}
                            </span>
                            <Switch
                              checked={item.disponivel}
                              onCheckedChange={(val) => handleToggle(item.id, val)}
                              className="scale-[0.85] data-[state=checked]:bg-green-500"
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
