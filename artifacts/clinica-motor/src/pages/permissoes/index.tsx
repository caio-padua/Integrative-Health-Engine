import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface PerfilPermissao {
  id: number;
  perfil: string;
  escopo: string;
  podeEditarQuestionario: boolean;
  podeValidar: boolean;
  podeBypass: boolean;
  podeEmitirNf: boolean;
  podeVerDadosOutrasEmpresas: boolean;
  observacao: string | null;
}

const ESCOPO_CORES: Record<string, string> = {
  "OPERACIONAL": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "EXECUCAO ASSISTENCIAL": "bg-green-500/10 text-green-400 border-green-500/30",
  "CLINICO": "bg-teal-500/10 text-teal-400 border-teal-500/30",
  "CLINICO + GESTAO": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "GOVERNANCA CENTRAL": "bg-primary/20 text-primary border-primary/30",
  "RECEBIMENTO": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  "EMISSAO": "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

function BoolCell({ val }: { val: boolean }) {
  return val ? (
    <span className="flex justify-center">
      <Check className="w-4 h-4 text-green-500" />
    </span>
  ) : (
    <span className="flex justify-center">
      <X className="w-4 h-4 text-muted-foreground/30" />
    </span>
  );
}

export default function PermissoesPage() {
  const { data, isLoading, isError } = useQuery<{ perfis: PerfilPermissao[]; total: number }>({
    queryKey: ["permissoes"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/permissoes`);
      if (!res.ok) throw new Error("Erro ao carregar permissoes");
      return res.json();
    },
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-primary" />
            Perfis e Permissoes
          </h1>
          <p className="text-muted-foreground mt-1">
            Mapa de permissoes por perfil de usuario — PADCOM V15.2.
          </p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="border-destructive/30">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">Erro ao carregar perfis de permissao.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && data && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {data.total} Perfis Configurados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Perfil</TableHead>
                      <TableHead className="min-w-[200px]">Escopo</TableHead>
                      <TableHead className="text-center">Editar Quest.</TableHead>
                      <TableHead className="text-center">Validar</TableHead>
                      <TableHead className="text-center">Bypass</TableHead>
                      <TableHead className="text-center">Emitir NF</TableHead>
                      <TableHead className="text-center">Ver Outras Unidades</TableHead>
                      <TableHead>Observacao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.perfis.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <span className="font-semibold text-sm">{p.perfil}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${ESCOPO_CORES[p.escopo] || "bg-muted text-muted-foreground"}`}>
                            {p.escopo}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <BoolCell val={p.podeEditarQuestionario} />
                        </TableCell>
                        <TableCell className="text-center">
                          <BoolCell val={p.podeValidar} />
                        </TableCell>
                        <TableCell className="text-center">
                          <BoolCell val={p.podeBypass} />
                        </TableCell>
                        <TableCell className="text-center">
                          <BoolCell val={p.podeEmitirNf} />
                        </TableCell>
                        <TableCell className="text-center">
                          <BoolCell val={p.podeVerDadosOutrasEmpresas} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {p.observacao || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
