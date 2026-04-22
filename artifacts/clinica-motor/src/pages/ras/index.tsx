import React from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck, Eye, Plus, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface RasSubstancia {
  substanciaNome: string;
  dose: string;
  numeroSessao: number;
  totalSessoes: number;
  status: string;
}

interface Ras {
  id: number;
  sessaoId: number;
  protocoloId: number | null;
  pacienteId: number;
  nomePaciente: string;
  cpfPaciente: string;
  nomeProfissional: string;
  crmProfissional: string | null;
  unidade: string;
  dataServico: string;
  tipoServico: string;
  substancias: RasSubstancia[];
  observacoes: string | null;
  assinaturaPaciente: boolean;
  assinaturaProfissional: boolean;
  criadoEm: string;
}

export default function RasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sessaoIdInput, setSessaoIdInput] = useState("");
  const [obsInput, setObsInput] = useState("");

  const { data: rasList = [], isLoading } = useQuery<Ras[]>({
    queryKey: ["ras"],
    queryFn: async () => {
      const res = await fetch(`/api/ras`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessaoId: Number(sessaoIdInput), observacoes: obsInput || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao gerar RAS");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "RAS gerado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["ras"] });
      setCreateOpen(false);
      setSessaoIdInput("");
      setObsInput("");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const formatDate = (d: string) => {
    try {
      const parts = d.split("-");
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
      return d;
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-primary" />
              RAS - Registro de Atendimento em Saude
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {rasList.length} registros de atendimento
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Gerar RAS
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : rasList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <FileCheck className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-lg">Nenhum RAS registrado.</p>
                <p className="text-sm">Gere um RAS a partir de uma sessao concluida.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Data Servico</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Substancias</TableHead>
                    <TableHead>Assinaturas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rasList.map(ras => (
                    <React.Fragment key={ras.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === ras.id ? null : ras.id)}
                      >
                        <TableCell>
                          {expandedId === ras.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">RAS-{String(ras.id).padStart(4, "0")}</span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{ras.nomePaciente}</div>
                          <div className="text-xs text-muted-foreground font-mono">{ras.cpfPaciente}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{ras.nomeProfissional}</div>
                          {ras.crmProfissional && (
                            <div className="text-xs text-muted-foreground">CRM {ras.crmProfissional}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{ras.unidade}</TableCell>
                        <TableCell className="text-sm font-mono">{formatDate(ras.dataServico)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">{ras.tipoServico}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary/20 text-primary text-[10px]">
                            {Array.isArray(ras.substancias) ? ras.substancias.length : 0} itens
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {ras.assinaturaPaciente ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            {ras.assinaturaProfissional ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === ras.id && (
                        <TableRow key={`${ras.id}-detail`}>
                          <TableCell colSpan={9} className="bg-muted/20 p-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground block text-xs">Sessao ID</span>
                                  <span className="font-mono">{ras.sessaoId}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Protocolo ID</span>
                                  <span className="font-mono">{ras.protocoloId || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Criado Em</span>
                                  <span className="font-mono text-xs">{new Date(ras.criadoEm).toLocaleString("pt-BR")}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Assinaturas</span>
                                  <span>Paciente: {ras.assinaturaPaciente ? "Sim" : "Nao"} | Prof: {ras.assinaturaProfissional ? "Sim" : "Nao"}</span>
                                </div>
                              </div>

                              {ras.observacoes && (
                                <div className="p-3 bg-muted/30 rounded-md border text-sm">
                                  <span className="text-muted-foreground text-xs block mb-1">Observacoes</span>
                                  {ras.observacoes}
                                </div>
                              )}

                              {Array.isArray(ras.substancias) && ras.substancias.length > 0 && (
                                <div>
                                  <span className="text-xs text-muted-foreground block mb-2">Substancias Aplicadas</span>
                                  <div className="grid gap-2">
                                    {ras.substancias.map((s: RasSubstancia, i: number) => (
                                      <div key={i} className="flex items-center gap-3 bg-background border rounded-md p-2 text-sm">
                                        <span className="font-medium flex-1">{s.substanciaNome}</span>
                                        <Badge variant="outline" className="text-[10px] font-mono">{s.dose}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                          Sessao {s.numeroSessao}/{s.totalSessoes}
                                        </span>
                                        <Badge className={`text-[10px] ${s.status === "aplicado" ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"}`}>
                                          {s.status}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
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

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Gerar RAS a partir de Sessao</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>ID da Sessao</Label>
                <Input
                  type="number"
                  value={sessaoIdInput}
                  onChange={e => setSessaoIdInput(e.target.value)}
                  placeholder="Ex: 1"
                />
              </div>
              <div>
                <Label>Observacoes (opcional)</Label>
                <Textarea
                  value={obsInput}
                  onChange={e => setObsInput(e.target.value)}
                  placeholder="Observacoes sobre o atendimento..."
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                className="w-full"
                disabled={createMutation.isPending || !sessaoIdInput}
              >
                {createMutation.isPending ? "Gerando..." : "Gerar RAS"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
