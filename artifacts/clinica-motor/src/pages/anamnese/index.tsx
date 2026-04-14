import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListarAnamneses, getListarAnamnesesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Plus, ClipboardList, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Anamneses() {
  const { data: anamneses, isLoading } = useListarAnamneses({}, {
    query: { queryKey: getListarAnamnesesQueryKey({}) }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluida":
        return <Badge className="bg-blue-500 text-white">Concluída</Badge>;
      case "validada":
        return <Badge className="bg-green-500 text-white">Validada</Badge>;
      case "em_andamento":
        return <Badge className="bg-yellow-500 text-black">Em Andamento</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              Anamneses
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie as avaliações clínicas dos pacientes.</p>
          </div>
          
          <Link href="/anamnese/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Anamnese
            </Button>
          </Link>
        </div>

        <Card className="bg-card border-border/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-md" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Motor Pawards</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anamneses?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        Nenhuma anamnese encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    anamneses?.map((anamnese) => (
                      <TableRow key={anamnese.id}>
                        <TableCell className="font-medium">{anamnese.pacienteNome}</TableCell>
                        <TableCell>{getStatusBadge(anamnese.status)}</TableCell>
                        <TableCell>
                          {anamnese.motorAtivadoEm ? (
                            <span className="flex items-center text-sm text-green-500">
                              <CheckCircle className="w-4 h-4 mr-1" /> Ativado
                            </span>
                          ) : (
                            <span className="flex items-center text-sm text-muted-foreground">
                              <Clock className="w-4 h-4 mr-1" /> Não ativado
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(anamnese.criadoEm).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/anamnese/${anamnese.id}`} className="text-primary hover:underline text-sm font-medium">
                            Ver Detalhes
                          </Link>
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
