import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface CodigoValidacao {
  id: number;
  sessaoId: number;
  pacienteId: number;
  codigo: string;
  expiraEm: string;
  usado: boolean;
  usadoEm: string | null;
  criadoEm: string;
}

export default function CodigosValidacaoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [sessaoIdInput, setSessaoIdInput] = useState("");
  const [pacienteIdInput, setPacienteIdInput] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ valido: boolean; error?: string } | null>(null);

  const { data: codigos = [], isLoading } = useQuery<CodigoValidacao[]>({
    queryKey: ["codigos-validacao"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/codigos-validacao`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}api/codigos-validacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessaoId: Number(sessaoIdInput),
          pacienteId: Number(pacienteIdInput),
        }),
      });
      if (!res.ok) throw new Error("Erro ao gerar codigo");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Codigo gerado: ${data.codigo}` });
      queryClient.invalidateQueries({ queryKey: ["codigos-validacao"] });
      setCreateOpen(false);
      setSessaoIdInput("");
      setPacienteIdInput("");
    },
    onError: () => {
      toast({ title: "Erro ao gerar codigo", variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}api/codigos-validacao/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoInput.toUpperCase() }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setVerifyResult(data);
      if (data.valido) {
        toast({ title: "Codigo VALIDO!" });
        queryClient.invalidateQueries({ queryKey: ["codigos-validacao"] });
      } else {
        toast({ title: data.error || "Codigo invalido", variant: "destructive" });
      }
    },
  });

  const getStatus = (c: CodigoValidacao) => {
    if (c.usado) return { label: "Usado", color: "bg-green-500/20 text-green-500", icon: CheckCircle2 };
    if (new Date() > new Date(c.expiraEm)) return { label: "Expirado", color: "bg-red-500/20 text-red-500", icon: XCircle };
    return { label: "Ativo", color: "bg-blue-500/20 text-blue-500", icon: Clock };
  };

  const stats = {
    total: codigos.length,
    ativos: codigos.filter(c => !c.usado && new Date() <= new Date(c.expiraEm)).length,
    usados: codigos.filter(c => c.usado).length,
    expirados: codigos.filter(c => !c.usado && new Date() > new Date(c.expiraEm)).length,
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-primary" />
              Codigos de Validacao
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Codigos de 6 digitos para validacao de sessoes (expiracao 1 hora)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setVerifyOpen(true)}>
              <Search className="mr-2 h-4 w-4" />
              Verificar Codigo
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Codigo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Ativos", value: stats.ativos, color: "text-blue-500" },
            { label: "Usados", value: stats.usados, color: "text-green-500" },
            { label: "Expirados", value: stats.expirados, color: "text-red-500" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : codigos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <KeyRound className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-lg">Nenhum codigo gerado.</p>
                <p className="text-sm">Gere codigos de validacao para sessoes agendadas.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Sessao</TableHead>
                    <TableHead>Paciente ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expira Em</TableHead>
                    <TableHead>Usado Em</TableHead>
                    <TableHead>Criado Em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codigos.map(c => {
                    const status = getStatus(c);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <span className="font-mono text-lg font-bold tracking-widest">{c.codigo}</span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">Sessao #{c.sessaoId}</TableCell>
                        <TableCell className="font-mono text-sm">#{c.pacienteId}</TableCell>
                        <TableCell>
                          <Badge className={`${status.color} text-[10px]`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {new Date(c.expiraEm).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {c.usadoEm ? new Date(c.usadoEm).toLocaleString("pt-BR") : "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {new Date(c.criadoEm).toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Gerar Codigo de Validacao</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>ID da Sessao</Label>
                <Input type="number" value={sessaoIdInput} onChange={e => setSessaoIdInput(e.target.value)} placeholder="Ex: 1" />
              </div>
              <div>
                <Label>ID do Paciente</Label>
                <Input type="number" value={pacienteIdInput} onChange={e => setPacienteIdInput(e.target.value)} placeholder="Ex: 1" />
              </div>
              <Button onClick={() => createMutation.mutate()} className="w-full" disabled={createMutation.isPending || !sessaoIdInput || !pacienteIdInput}>
                {createMutation.isPending ? "Gerando..." : "Gerar Codigo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={verifyOpen} onOpenChange={(o) => { setVerifyOpen(o); if (!o) { setVerifyResult(null); setCodigoInput(""); } }}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Verificar Codigo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Codigo (6 caracteres)</Label>
                <Input
                  value={codigoInput}
                  onChange={e => setCodigoInput(e.target.value.toUpperCase())}
                  placeholder="EX: A3B7K2"
                  maxLength={6}
                  className="font-mono text-xl text-center tracking-[0.5em] uppercase"
                />
              </div>
              {verifyResult && (
                <div className={`p-3 rounded-md text-center ${verifyResult.valido ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                  {verifyResult.valido ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-bold">CODIGO VALIDO</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <XCircle className="h-5 w-5" />
                      <span className="font-bold">{verifyResult.error || "INVALIDO"}</span>
                    </div>
                  )}
                </div>
              )}
              <Button onClick={() => verifyMutation.mutate()} className="w-full" disabled={verifyMutation.isPending || codigoInput.length < 6}>
                {verifyMutation.isPending ? "Verificando..." : "Verificar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
