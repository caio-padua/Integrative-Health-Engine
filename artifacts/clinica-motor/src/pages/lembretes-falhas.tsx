import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { useListarUnidades, type Unidade } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FalhaLembrete {
  id: number;
  prescricaoLembreteId: number;
  pacienteId: number;
  pacienteNome: string;
  unidadeId: number | null;
  janela: string;
  erro: string | null;
  whatsappLogId: number | null;
  enviadoEm: string;
}

export default function LembretesFalhasPage() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const apiBase = `${window.location.origin}${baseUrl}api`
    .replace(/\/+/g, "/")
    .replace(":/", "://");

  const { data: unidades } = useListarUnidades();
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [falhas, setFalhas] = useState<FalhaLembrete[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Pre-seleciona a primeira unidade disponivel: o backend exige unidadeId
  // quando nao ha tenantContext na sessao, entao listagem cross-unit nao e
  // suportada. Mostrar "Todas as unidades" levaria a erro 400.
  useEffect(() => {
    if (!unidadeId && unidades && unidades.length > 0) {
      setUnidadeId(String(unidades[0].id));
    }
  }, [unidades, unidadeId]);

  const fetchFalhas = async () => {
    if (!unidadeId) {
      setFalhas([]);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const qs = new URLSearchParams();
      qs.set("unidadeId", unidadeId);
      qs.set("limit", "100");
      const res = await fetch(
        `${apiBase}/prescricoes-lembrete/falhas?${qs.toString()}`,
      );
      if (res.ok) {
        setFalhas(await res.json());
      } else {
        setFalhas([]);
        setErro(`Falha ao carregar (HTTP ${res.status}).`);
      }
    } catch (e) {
      setFalhas([]);
      setErro((e as Error).message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFalhas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Falhas de lembrete de prescrição
            </h1>
            <p className="text-sm text-muted-foreground">
              Envios que terminaram com status FALHOU. Verifique o paciente e a
              configuração do canal antes da próxima janela.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFalhas}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Falhas recentes</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Unidade:</span>
                <Select
                  value={unidadeId}
                  onValueChange={(v) => setUnidadeId(v)}
                >
                  <SelectTrigger className="w-[220px]" data-testid="select-unidade">
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(unidades ?? []).map((u: Unidade) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {erro ? (
              <p className="text-sm text-red-600" data-testid="text-erro">
                {erro}
              </p>
            ) : null}
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !unidadeId ? (
              <p className="text-sm text-muted-foreground">
                Selecione uma unidade para ver as falhas.
              </p>
            ) : falhas.length === 0 ? (
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-empty"
              >
                Nenhuma falha registrada.
              </p>
            ) : (
              <Table data-testid="table-falhas">
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Janela esperada</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead className="w-[100px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {falhas.map((f) => (
                    <TableRow key={f.id} data-testid={`row-falha-${f.id}`}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(f.enviadoEm).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{f.pacienteNome}</div>
                        <div className="text-xs text-muted-foreground">
                          #{f.pacienteId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{f.janela}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="text-sm text-red-700 break-words">
                          {f.erro || "erro desconhecido"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/pacientes/${f.pacienteId}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`link-paciente-${f.pacienteId}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Abrir
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
