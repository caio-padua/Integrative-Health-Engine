import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface EstoqueItem {
  item: {
    id: number;
    substanciaId: number;
    quantidade: number;
    unidade: string;
    estoqueMinimo: number;
    lote: string | null;
    dataValidade: string | null;
    fornecedor: string | null;
    custoUnitario: number | null;
    atualizadoEm: string;
  };
  substanciaNome: string | null;
  substanciaCor: string | null;
}

interface EstoqueForm {
  substanciaId: string;
  quantidade: string;
  unidade: string;
  estoqueMinimo: string;
  lote: string;
  dataValidade: string;
  fornecedor: string;
  custoUnitario: string;
}

const defaultForm: EstoqueForm = {
  substanciaId: "", quantidade: "", unidade: "ml",
  estoqueMinimo: "0", lote: "", dataValidade: "",
  fornecedor: "", custoUnitario: "",
};

export default function EstoquePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<EstoqueItem | null>(null);
  const [form, setForm] = useState<EstoqueForm>(defaultForm);
  const [filterLow, setFilterLow] = useState(false);

  const { data: items = [], isLoading } = useQuery<EstoqueItem[]>({
    queryKey: ["estoque"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/estoque`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: substancias = [] } = useQuery<{ id: number; nome: string }[]>({
    queryKey: ["substancias-list"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/substancias`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isEdit = !!editItem;
      const body: any = {
        substanciaId: Number(form.substanciaId),
        quantidade: Number(form.quantidade),
        unidade: form.unidade,
        estoqueMinimo: Number(form.estoqueMinimo),
        lote: form.lote || null,
        dataValidade: form.dataValidade || null,
        fornecedor: form.fornecedor || null,
        custoUnitario: form.custoUnitario ? Number(form.custoUnitario) : null,
      };
      const url = isEdit ? `${BASE_URL}api/estoque/${editItem!.item.id}` : `${BASE_URL}api/estoque`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editItem ? "Item atualizado" : "Item adicionado ao estoque" });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      setCreateOpen(false);
      setEditItem(null);
      setForm(defaultForm);
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const openEdit = (item: EstoqueItem) => {
    setEditItem(item);
    setForm({
      substanciaId: String(item.item.substanciaId),
      quantidade: String(item.item.quantidade),
      unidade: item.item.unidade,
      estoqueMinimo: String(item.item.estoqueMinimo),
      lote: item.item.lote || "",
      dataValidade: item.item.dataValidade || "",
      fornecedor: item.item.fornecedor || "",
      custoUnitario: item.item.custoUnitario ? String(item.item.custoUnitario) : "",
    });
  };

  const openCreate = () => {
    setEditItem(null);
    setForm(defaultForm);
    setCreateOpen(true);
  };

  const update = (field: keyof EstoqueForm, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const displayItems = filterLow ? items.filter(i => i.item.quantidade <= i.item.estoqueMinimo) : items;

  const lowCount = items.filter(i => i.item.quantidade <= i.item.estoqueMinimo).length;

  const formatCurrency = (v: number | null) => {
    if (v === null) return "-";
    return `R$ ${v.toFixed(2)}`;
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Estoque de Substancias
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {items.length} itens em estoque
              {lowCount > 0 && (
                <span className="text-red-500 ml-2">
                  ({lowCount} abaixo do minimo)
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {lowCount > 0 && (
              <Button variant={filterLow ? "default" : "outline"} onClick={() => setFilterLow(!filterLow)} className={filterLow ? "bg-red-500 hover:bg-red-600" : "text-red-500 border-red-500/30"}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                {filterLow ? "Mostrando Baixos" : `${lowCount} Abaixo Minimo`}
              </Button>
            )}
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <Package className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-lg">{filterLow ? "Nenhum item abaixo do minimo." : "Estoque vazio."}</p>
                <p className="text-sm">Adicione itens para controlar o estoque de substancias.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Cor</TableHead>
                    <TableHead>Substancia</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Minimo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map(e => {
                    const isLow = e.item.quantidade <= e.item.estoqueMinimo;
                    return (
                      <TableRow key={e.item.id} className={isLow ? "bg-red-500/5" : ""}>
                        <TableCell>
                          <div className="w-5 h-5 rounded-full" style={{ backgroundColor: e.substanciaCor || "#888" }} />
                        </TableCell>
                        <TableCell className="font-medium text-sm">{e.substanciaNome || `ID ${e.item.substanciaId}`}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{e.item.quantidade} {e.item.unidade}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{e.item.estoqueMinimo} {e.item.unidade}</TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge className="bg-red-500/20 text-red-500 text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-1" /> BAIXO
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-500 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.item.lote || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{e.item.dataValidade || "-"}</TableCell>
                        <TableCell className="text-sm">{e.item.fornecedor || "-"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(e.item.custoUnitario)}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {new Date(e.item.atualizadoEm).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={createOpen || !!editItem} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditItem(null); } }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar Item do Estoque" : "Adicionar ao Estoque"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Substancia</Label>
                <select
                  value={form.substanciaId}
                  onChange={e => update("substanciaId", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">Selecione...</option>
                  {substancias.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" value={form.quantidade} onChange={e => update("quantidade", e.target.value)} />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <select value={form.unidade} onChange={e => update("unidade", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="ml">ml</option>
                    <option value="mg">mg</option>
                    <option value="g">g</option>
                    <option value="un">un</option>
                    <option value="amp">amp</option>
                    <option value="fr">fr</option>
                  </select>
                </div>
                <div>
                  <Label>Estoque Minimo</Label>
                  <Input type="number" value={form.estoqueMinimo} onChange={e => update("estoqueMinimo", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Lote</Label>
                  <Input value={form.lote} onChange={e => update("lote", e.target.value)} placeholder="Ex: LOT-2026-001" />
                </div>
                <div>
                  <Label>Data Validade</Label>
                  <Input type="date" value={form.dataValidade} onChange={e => update("dataValidade", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fornecedor</Label>
                  <Input value={form.fornecedor} onChange={e => update("fornecedor", e.target.value)} placeholder="Nome do fornecedor" />
                </div>
                <div>
                  <Label>Custo Unitario (R$)</Label>
                  <Input type="number" step="0.01" value={form.custoUnitario} onChange={e => update("custoUnitario", e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate()} className="w-full" disabled={saveMutation.isPending || !form.substanciaId || !form.quantidade}>
                {saveMutation.isPending ? "Salvando..." : (editItem ? "Salvar Alteracoes" : "Adicionar ao Estoque")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
