import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useListarTratamentos, getListarTratamentosQueryKey,
  useDashboardFinanceiro, getDashboardFinanceiroQueryKey,
  useCriarTratamento,
  useRegistrarBaixa,
  useListarPacientes, getListarPacientesQueryKey,
  RegistrarBaixaBodyFormaPagamento,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, CreditCard, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, ChevronDown, ChevronRight,
  Receipt, ArrowDownCircle, XCircle, FileText, Pencil, X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const formaLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  pix: "PIX",
  boleto: "Boleto",
  plano_saude: "Plano Saúde",
};

const statusColors: Record<string, string> = {
  ativo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  concluido: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelado: "bg-red-500/20 text-red-400 border-red-500/30",
  desistencia: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  suspenso: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const statusLabels: Record<string, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
  desistencia: "Desistência",
  suspenso: "Suspenso",
};

function formatCurrency(value: number | null | undefined): string {
  return `R$ ${(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const color = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-orange-500";
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{formatCurrency(paid)} pago</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-sm overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: loadingDash } = useDashboardFinanceiro({
    query: { queryKey: getDashboardFinanceiroQueryKey() }
  });

  const { data: tratamentos, isLoading: loadingTrat } = useListarTratamentos({}, {
    query: { queryKey: getListarTratamentosQueryKey({}) }
  });

  const { data: pacientes } = useListarPacientes({}, {
    query: { queryKey: getListarPacientesQueryKey({}) }
  });

  const { data: substancias } = useQuery({
    queryKey: ["/api/substancias"],
    queryFn: () => fetch("/api/substancias").then(r => r.json()),
  });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openNovoTratamento, setOpenNovoTratamento] = useState(false);
  const [openBaixa, setOpenBaixa] = useState(false);
  const [selectedTratamentoId, setSelectedTratamentoId] = useState<number | null>(null);

  const criarTratamento = useCriarTratamento();
  const registrarBaixa = useRegistrarBaixa();

  const [novoForm, setNovoForm] = useState({
    pacienteId: 0,
    nome: "",
    descricao: "",
    valorBruto: 0,
    desconto: 0,
    numeroParcelas: 1,
    dataInicio: new Date().toISOString().split("T")[0],
    observacoes: "",
    itens: [] as Array<{ substanciaId?: number; descricao: string; tipo: string; quantidade: number; valorUnitario: number }>,
  });

  const [baixaForm, setBaixaForm] = useState({
    valor: 0,
    formaPagamento: "pix" as string,
    observacao: "",
  });

  const [novoItemForm, setNovoItemForm] = useState({
    substanciaId: 0,
    descricao: "",
    tipo: "substancia",
    quantidade: 1,
    valorUnitario: 0,
  });

  const [editingTrat, setEditingTrat] = useState<any>(null);
  const [editTratForm, setEditTratForm] = useState<any>({});
  const [editTratSaving, setEditTratSaving] = useState(false);

  const openEditTrat = (t: any) => {
    setEditTratForm({
      nome: t.nome || "",
      descricao: t.descricao || "",
      valorBruto: t.valorBruto || 0,
      desconto: t.desconto || 0,
      numeroParcelas: t.numeroParcelas || 1,
      dataPrevisaoFim: t.dataPrevisaoFim || "",
      observacoes: t.observacoes || "",
      status: t.status || "ativo",
    });
    setEditingTrat(t);
  };

  const saveEditTrat = async () => {
    if (!editingTrat) return;
    setEditTratSaving(true);
    try {
      const res = await fetch(`/api/financeiro/tratamentos/${editingTrat.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTratForm),
      });
      if (res.ok) {
        toast({ title: "Tratamento atualizado" });
        invalidateAll();
        setEditingTrat(null);
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.error || "Erro ao salvar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setEditTratSaving(false);
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getDashboardFinanceiroQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListarTratamentosQueryKey({}) });
  };

  const handleCriarTratamento = () => {
    if (!novoForm.pacienteId || !novoForm.nome) {
      toast({ title: "Preencha paciente e nome do tratamento", variant: "destructive" });
      return;
    }
    criarTratamento.mutate({
      data: {
        pacienteId: novoForm.pacienteId,
        nome: novoForm.nome,
        descricao: novoForm.descricao || undefined,
        valorBruto: novoForm.valorBruto,
        desconto: novoForm.desconto,
        numeroParcelas: novoForm.numeroParcelas,
        dataInicio: novoForm.dataInicio,
        observacoes: novoForm.observacoes || undefined,
        unidadeId: user?.unidadeId || 1,
        itens: novoForm.itens.map(i => ({
          substanciaId: i.substanciaId || undefined,
          descricao: i.descricao,
          tipo: i.tipo,
          quantidade: i.quantidade,
          valorUnitario: i.valorUnitario,
        })),
      }
    }, {
      onSuccess: () => {
        invalidateAll();
        setOpenNovoTratamento(false);
        setNovoForm({
          pacienteId: 0, nome: "", descricao: "", valorBruto: 0, desconto: 0,
          numeroParcelas: 1, dataInicio: new Date().toISOString().split("T")[0],
          observacoes: "", itens: [],
        });
        toast({ title: "Tratamento criado com sucesso." });
      }
    });
  };

  const handleBaixa = () => {
    if (!selectedTratamentoId || !baixaForm.valor || !baixaForm.formaPagamento) {
      toast({ title: "Preencha valor e forma de pagamento", variant: "destructive" });
      return;
    }
    registrarBaixa.mutate({
      id: selectedTratamentoId,
      data: {
        valor: baixaForm.valor,
        formaPagamento: baixaForm.formaPagamento as RegistrarBaixaBodyFormaPagamento,
        observacao: baixaForm.observacao || undefined,
      }
    }, {
      onSuccess: () => {
        invalidateAll();
        setOpenBaixa(false);
        setBaixaForm({ valor: 0, formaPagamento: "pix", observacao: "" });
        toast({ title: "Baixa registrada com sucesso." });
      }
    });
  };

  const addItem = () => {
    if (!novoItemForm.descricao) return;
    const sub = substancias?.find((s: any) => s.id === novoItemForm.substanciaId);
    setNovoForm(prev => ({
      ...prev,
      itens: [...prev.itens, {
        substanciaId: novoItemForm.substanciaId || undefined,
        descricao: novoItemForm.descricao || sub?.nome || "Item",
        tipo: novoItemForm.tipo,
        quantidade: novoItemForm.quantidade,
        valorUnitario: novoItemForm.valorUnitario,
      }],
      valorBruto: prev.valorBruto + (novoItemForm.quantidade * novoItemForm.valorUnitario),
    }));
    setNovoItemForm({ substanciaId: 0, descricao: "", tipo: "substancia", quantidade: 1, valorUnitario: 0 });
  };

  const removeItem = (idx: number) => {
    setNovoForm(prev => {
      const removed = prev.itens[idx];
      const newItens = prev.itens.filter((_, i) => i !== idx);
      return {
        ...prev,
        itens: newItens,
        valorBruto: prev.valorBruto - (removed.quantidade * removed.valorUnitario),
      };
    });
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
            <p className="text-muted-foreground mt-1">Gestão de tratamentos, pagamentos e faturamento</p>
          </div>
          <Dialog open={openNovoTratamento} onOpenChange={setOpenNovoTratamento}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Novo Tratamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Novo Tratamento
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Paciente *</Label>
                    <Select onValueChange={v => setNovoForm(f => ({ ...f, pacienteId: parseInt(v) }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {pacientes?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nome do Tratamento *</Label>
                    <Input value={novoForm.nome} onChange={e => setNovoForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Protocolo Detox IV + IM" />
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={novoForm.descricao} onChange={e => setNovoForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
                </div>
                <div className="border border-border rounded-sm p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    Itens do Tratamento
                  </h3>
                  <div className="grid grid-cols-6 gap-2 items-end">
                    <div className="col-span-2">
                      <Label className="text-xs">Substância</Label>
                      <Select onValueChange={v => {
                        const sub = substancias?.find((s: any) => s.id === parseInt(v));
                        setNovoItemForm(f => ({
                          ...f,
                          substanciaId: parseInt(v),
                          descricao: sub?.nome || "",
                          valorUnitario: sub?.precoReferencia || 0,
                        }));
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {substancias?.map((s: any) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.nome} ({s.via})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select value={novoItemForm.tipo} onValueChange={v => setNovoItemForm(f => ({ ...f, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="substancia">Substância</SelectItem>
                          <SelectItem value="insumo">Insumo</SelectItem>
                          <SelectItem value="taxa_administrativa">Taxa Adm.</SelectItem>
                          <SelectItem value="reserva_tecnica">Reserva Técnica</SelectItem>
                          <SelectItem value="honorario_medico">Honorário Médico</SelectItem>
                          <SelectItem value="honorario_enfermagem">Honorário Enf.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Qtde</Label>
                      <Input type="number" min={1} value={novoItemForm.quantidade} onChange={e => setNovoItemForm(f => ({ ...f, quantidade: parseInt(e.target.value) || 1 }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Valor Unit.</Label>
                      <Input type="number" step="0.01" value={novoItemForm.valorUnitario} onChange={e => setNovoItemForm(f => ({ ...f, valorUnitario: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <Button size="sm" onClick={addItem} disabled={!novoItemForm.descricao}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {novoForm.itens.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Qtde</TableHead>
                          <TableHead className="text-right">Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {novoForm.itens.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.descricao}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{item.tipo}</Badge></TableCell>
                            <TableCell className="text-right font-mono">{item.quantidade}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.valorUnitario)}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{formatCurrency(item.quantidade * item.valorUnitario)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                                <XCircle className="h-4 w-4 text-red-400" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Valor Bruto</Label>
                    <Input type="number" step="0.01" value={novoForm.valorBruto} onChange={e => setNovoForm(f => ({ ...f, valorBruto: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label>Desconto (R$)</Label>
                    <Input type="number" step="0.01" value={novoForm.desconto} onChange={e => setNovoForm(f => ({ ...f, desconto: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label>Nº Parcelas</Label>
                    <Input type="number" min={1} value={novoForm.numeroParcelas} onChange={e => setNovoForm(f => ({ ...f, numeroParcelas: parseInt(e.target.value) || 1 }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-sm border border-border">
                  <span className="text-sm font-medium">Valor Final:</span>
                  <span className="text-xl font-bold text-primary font-mono">
                    {formatCurrency(novoForm.valorBruto - novoForm.desconto)}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNovoTratamento(false)}>Cancelar</Button>
                <Button onClick={handleCriarTratamento} disabled={criarTratamento.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                  {criarTratamento.isPending ? "Criando..." : "Criar Tratamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loadingDash ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : dashboard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-sm bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Recebido</p>
                    <p className="text-xl font-bold font-mono text-green-400">{formatCurrency(dashboard.totalRecebido)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-sm bg-orange-500/10">
                    <TrendingDown className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pendente</p>
                    <p className="text-xl font-bold font-mono text-orange-400">{formatCurrency(dashboard.totalPendente)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-sm bg-blue-500/10">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Tratamentos Ativos</p>
                    <p className="text-xl font-bold font-mono">{dashboard.tratamentosAtivos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-sm bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Inadimplência</p>
                    <p className="text-xl font-bold font-mono text-red-400">{dashboard.inadimplencia}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Tratamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTrat ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !tratamentos || tratamentos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum tratamento registrado. Clique em "Novo Tratamento" para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tratamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Final</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tratamentos.map((t: any) => (
                    <React.Fragment key={t.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/30 group" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                        <TableCell>
                          {expandedId === t.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{t.pacienteNome}</p>
                            {t.pacienteCpf && <p className="text-xs text-muted-foreground">{t.pacienteCpf}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{t.nome}</p>
                          {t.dataInicio && <p className="text-xs text-muted-foreground">Início: {t.dataInicio}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[t.status] || ""} border text-xs`}>
                            {statusLabels[t.status] || t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatCurrency(t.valorFinal)}</TableCell>
                        <TableCell className="text-right font-mono text-green-400">{formatCurrency(t.valorPago)}</TableCell>
                        <TableCell className="text-right font-mono text-orange-400">{formatCurrency(t.saldoDevedor)}</TableCell>
                        <TableCell className="w-40">
                          <ProgressBar paid={t.valorPago || 0} total={t.valorFinal || 0} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-primary/10"
                              onClick={(e) => { e.stopPropagation(); openEditTrat(t); }}
                              title="Editar tratamento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {t.status === "ativo" && t.saldoDevedor > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTratamentoId(t.id);
                                  setBaixaForm({ valor: 0, formaPagamento: "pix", observacao: "" });
                                  setOpenBaixa(true);
                                }}
                              >
                                <ArrowDownCircle className="w-4 h-4 mr-1" />
                                Baixa
                              </Button>
                            )}
                            {t.status === "concluido" && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
                                <CheckCircle className="w-3 h-3 mr-1" /> Quitado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === t.id && (
                        <TableRow key={`${t.id}-detail`}>
                          <TableCell colSpan={9} className="bg-muted/10 p-4">
                            <TratamentoDetail tratamentoId={t.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={openBaixa} onOpenChange={setOpenBaixa}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-green-500" />
                Registrar Baixa
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedTratamentoId && (() => {
                const t = tratamentos?.find((tr: any) => tr.id === selectedTratamentoId);
                if (!t) return null;
                return (
                  <div className="p-3 bg-muted/30 rounded-sm border border-border space-y-1">
                    <p className="text-sm font-medium">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">{t.pacienteNome}</p>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Saldo devedor:</span>
                      <span className="font-mono font-bold text-orange-400">{formatCurrency(t.saldoDevedor)}</span>
                    </div>
                  </div>
                );
              })()}
              <div>
                <Label>Valor (R$) *</Label>
                {(() => {
                  const t = tratamentos?.find((tr: any) => tr.id === selectedTratamentoId);
                  const maxVal = t?.saldoDevedor || 0;
                  return (
                    <>
                      <Input type="number" step="0.01" min="0.01" max={maxVal} value={baixaForm.valor} onChange={e => {
                        const v = parseFloat(e.target.value) || 0;
                        setBaixaForm(f => ({ ...f, valor: Math.min(v, maxVal) }));
                      }} />
                      {maxVal > 0 && <p className="text-xs text-muted-foreground mt-1">Máximo: {formatCurrency(maxVal)}</p>}
                    </>
                  );
                })()}
              </div>
              <div>
                <Label>Forma de Pagamento *</Label>
                <Select value={baixaForm.formaPagamento} onValueChange={v => setBaixaForm(f => ({ ...f, formaPagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(formaLabels).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea value={baixaForm.observacao} onChange={e => setBaixaForm(f => ({ ...f, observacao: e.target.value }))} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenBaixa(false)}>Cancelar</Button>
              <Button onClick={handleBaixa} disabled={registrarBaixa.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {registrarBaixa.isPending ? "Registrando..." : "Confirmar Baixa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {editingTrat && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingTrat(null)}>
            <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Editar Tratamento</h3>
                <button onClick={() => setEditingTrat(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="text-sm text-muted-foreground">Paciente: <strong>{editingTrat.pacienteNome}</strong></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Nome</Label>
                  <Input value={editTratForm.nome} onChange={e => setEditTratForm({...editTratForm, nome: e.target.value})} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Descricao</Label>
                  <Textarea value={editTratForm.descricao} onChange={e => setEditTratForm({...editTratForm, descricao: e.target.value})} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status</Label>
                  <Select value={editTratForm.status} onValueChange={v => setEditTratForm({...editTratForm, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Parcelas</Label>
                  <Input type="number" min="1" value={editTratForm.numeroParcelas} onChange={e => setEditTratForm({...editTratForm, numeroParcelas: parseInt(e.target.value) || 1})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Valor Bruto (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={editTratForm.valorBruto} onChange={e => setEditTratForm({...editTratForm, valorBruto: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Desconto (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={editTratForm.desconto} onChange={e => setEditTratForm({...editTratForm, desconto: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Previsao Fim</Label>
                  <Input type="date" value={editTratForm.dataPrevisaoFim} onChange={e => setEditTratForm({...editTratForm, dataPrevisaoFim: e.target.value})} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Observacoes</Label>
                  <Textarea value={editTratForm.observacoes} onChange={e => setEditTratForm({...editTratForm, observacoes: e.target.value})} rows={2} />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button className="flex-1 text-xs h-9" onClick={saveEditTrat} disabled={editTratSaving}>
                  {editTratSaving ? "Salvando..." : "Salvar Alteracoes"}
                </Button>
                <Button variant="outline" className="text-xs h-9" onClick={() => setEditingTrat(null)}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function TratamentoDetail({ tratamentoId }: { tratamentoId: number }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/financeiro/tratamentos/${tratamentoId}`)
      .then(r => r.json())
      .then(d => { setData(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [tratamentoId]);

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (!data) return <p className="text-muted-foreground text-sm">Erro ao carregar detalhes</p>;

  return (
    <div className="grid grid-cols-2 gap-4">
      {data.itens && data.itens.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
            <Receipt className="h-4 w-4 text-primary" /> Itens
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Item</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.itens.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">{item.substanciaNome || item.descricao}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{item.tipo}</Badge></TableCell>
                  <TableCell className="text-xs text-right font-mono">{formatCurrency(item.valorTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {data.pagamentos && data.pagamentos.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-500" /> Pagamentos
          </h4>
          <div className="space-y-2">
            {data.pagamentos.map((pag: any) => (
              <div key={pag.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-sm border border-border text-sm">
                <div>
                  <Badge variant="outline" className="text-[10px] mr-2">
                    {formaLabels[pag.formaPagamento] || pag.formaPagamento}
                  </Badge>
                  {pag.parcela && <span className="text-xs text-muted-foreground">Parcela {pag.parcela}/{pag.totalParcelas || "?"}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-green-400">{formatCurrency(pag.valor)}</span>
                  {pag.paguEm && <span className="text-xs text-muted-foreground">{new Date(pag.paguEm).toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
