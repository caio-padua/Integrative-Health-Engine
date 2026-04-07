import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useListarPagamentos, getListarPagamentosQueryKey, 
  useCriarPagamento,
  useConfirmarPagamento,
  CriarPagamentoBodyFormaPagamento,
  useListarPacientes,
  getListarPacientesQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, CreditCard, DollarSign, CheckCircle } from "lucide-react";
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

const pagamentoSchema = z.object({
  pacienteId: z.coerce.number().min(1, "Paciente é obrigatório"),
  valor: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  formaPagamento: z.nativeEnum(CriarPagamentoBodyFormaPagamento),
  descricao: z.string().optional(),
  unidadeId: z.coerce.number().default(1),
});

export default function FinanceiroPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: pagamentos, isLoading } = useListarPagamentos({}, {
    query: { queryKey: getListarPagamentosQueryKey({}) }
  });

  const { data: pacientes } = useListarPacientes({}, {
    query: { queryKey: getListarPacientesQueryKey({}) }
  });
  
  const [open, setOpen] = useState(false);
  const criarPagamento = useCriarPagamento();
  const confirmarPagamento = useConfirmarPagamento();

  const form = useForm<z.infer<typeof pagamentoSchema>>({
    resolver: zodResolver(pagamentoSchema),
    defaultValues: {
      pacienteId: 0,
      valor: 0,
      formaPagamento: CriarPagamentoBodyFormaPagamento.pix,
      descricao: "",
      unidadeId: user?.unidadeId || 1,
    }
  });

  const onSubmit = (values: z.infer<typeof pagamentoSchema>) => {
    criarPagamento.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarPagamentosQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Lançamento financeiro registrado." });
      }
    });
  };

  const handleConfirmar = (id: number) => {
    confirmarPagamento.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarPagamentosQueryKey({}) });
        toast({ title: "Pagamento confirmado com sucesso." });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pago": return "bg-green-500/20 text-green-500 border-none";
      case "cancelado": return "bg-red-500/20 text-red-500 border-none";
      case "estornado": return "bg-orange-500/20 text-orange-500 border-none";
      default: return "bg-yellow-500/20 text-yellow-500 border-none";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-primary" />
              Financeiro
            </h1>
            <p className="text-muted-foreground mt-1">Gestão de pagamentos e faturamento.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Novo Pagamento</DialogTitle>
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
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição / Procedimento</FormLabel>
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
                      name="valor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="formaPagamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forma de Pagto</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(CriarPagamentoBodyFormaPagamento).map(([k, v]) => (
                                <SelectItem key={k} value={v} className="capitalize">{k.replace('_', ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={criarPagamento.isPending}>
                    {criarPagamento.isPending ? "Registrando..." : "Registrar Pagamento"}
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
                    <TableHead>Data</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagamentos?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        Nenhum pagamento registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagamentos?.map((pag) => (
                      <TableRow key={pag.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(pag.criadoEm).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{pag.pacienteNome}</TableCell>
                        <TableCell className="text-sm">{pag.descricao || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {(pag.formaPagamento || 'nd').replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(pag.status)}>
                            <span className="capitalize">{pag.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          R$ {pag.valor.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {pag.status === 'pendente' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                              onClick={() => handleConfirmar(pag.id)}
                              disabled={confirmarPagamento.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirmar
                            </Button>
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