import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type FunilLinha = { braco: string; iniciadas: number; finalizadas: number; validadas: number };
type DashBracos = {
  bracos: string[];
  porBraco: Array<{ braco: string | null; total: number; scoreMedio: string | null }>;
  porUtmSource: Array<{ utm: string | null; total: number }>;
  porStatus: Array<{ status: string; total: number }>;
  funil: FunilLinha[];
};

const BRACOS_LABEL: Record<string, string> = {
  trafego_pago: "Tráfego Pago",
  consultora: "Consultora Interna",
  site: "Site Autoatendimento",
  vendedor_externo: "Vendedor Externo",
  referral: "Indicação Paciente",
  whatsapp: "WhatsApp Bot",
  sem_braco: "Sem Braço",
};

const CORES = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export default function PadcomGovernanca() {
  const { data, isLoading } = useQuery<DashBracos>({
    queryKey: ["padcom-dashboard-bracos"],
    queryFn: async () => {
      const r = await fetch("/api/padcom-dashboard-bracos");
      if (!r.ok) throw new Error("erro ao buscar dashboard");
      return r.json();
    },
  });

  const { data: competencias } = useQuery({
    queryKey: ["padcom-competencias"],
    queryFn: async () => {
      const r = await fetch("/api/padcom-competencias");
      return r.json();
    },
  });

  if (isLoading || !data) {
    return (
      <Layout>
        <div className="p-6">Carregando dashboard de governança...</div>
      </Layout>
    );
  }

  const funilData = data.funil.map((f) => ({
    ...f,
    label: BRACOS_LABEL[f.braco] ?? f.braco,
  }));

  const totalSessoes = data.porBraco.reduce((acc, b) => acc + Number(b.total), 0);
  const competenciasPorCategoria: Record<string, number> = {};
  (competencias ?? []).forEach((c: { categoria: string }) => {
    competenciasPorCategoria[c.categoria] = (competenciasPorCategoria[c.categoria] ?? 0) + 1;
  });
  const pieData = Object.entries(competenciasPorCategoria).map(([k, v]) => ({ name: k, value: v }));

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">PADCOM — Governança Global</h1>
          <p className="text-muted-foreground">
            Visão de auditor independente: 6 braços de entrada, cascata N1/N2/N3 e
            catálogo regulatório.
          </p>
        </header>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total de Sessões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalSessoes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Braços Configurados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.bracos.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Itens no Catálogo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{competencias?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Status Distintos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.porStatus.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Funil por braço */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Conversão por Braço de Entrada (P3)</CardTitle>
          </CardHeader>
          <CardContent>
            {funilData.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                Nenhuma sessão registrada ainda. Crie sessões com{" "}
                <code>braco_entrada</code> definido para popular este funil.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={funilData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="iniciadas" fill="#3b82f6" name="Iniciadas" />
                  <Bar dataKey="finalizadas" fill="#10b981" name="Finalizadas" />
                  <Bar dataKey="validadas" fill="#8b5cf6" name="Validadas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Catálogo regulatório */}
        <Card>
          <CardHeader>
            <CardTitle>Catálogo Regulatório por Categoria (P1)</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                Catálogo vazio. Rode o seed 004-padcom-competencias.sql.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label={(e) => `${e.name}: ${e.value}`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CORES[i % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  <h3 className="font-semibold mb-2">Itens por competência mínima:</h3>
                  {(["farmaceutico", "enfermeiro", "medico", "preceptor"] as const).map(
                    (comp) => {
                      const total =
                        (competencias ?? []).filter(
                          (c: { competenciaMinima: string }) => c.competenciaMinima === comp,
                        ).length ?? 0;
                      return (
                        <div key={comp} className="flex items-center justify-between border-b py-2">
                          <span className="capitalize">{comp}</span>
                          <Badge variant="outline">{total} item(s)</Badge>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cascata N1/N2/N3 — Legenda */}
        <Card>
          <CardHeader>
            <CardTitle>Cascata de Validação N1 / N2 / N3 (P2)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded p-4 bg-emerald-50 dark:bg-emerald-950/20">
                <Badge className="mb-2 bg-emerald-600">N1 — Auto</Badge>
                <p className="text-sm">
                  IA valida sozinha. Itens de baixo risco (CoQ10 oral, Vit D, orientações).
                  Despacha para farmácia automaticamente.
                </p>
              </div>
              <div className="border rounded p-4 bg-amber-50 dark:bg-amber-950/20">
                <Badge className="mb-2 bg-amber-600">N2 — Semi</Badge>
                <p className="text-sm">
                  IA pré-valida + 1 clique do consultor. Itens médios (exames, orientações
                  específicas).
                </p>
              </div>
              <div className="border rounded p-4 bg-rose-50 dark:bg-rose-950/20">
                <Badge className="mb-2 bg-rose-600">N3 — Manual</Badge>
                <p className="text-sm">
                  Cascata completa: enfermeira → médico → preceptor. Injetáveis, implantes
                  e itens de alto risco.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Endpoint <code>POST /api/padcom-sessoes/:id/iniciar-cascata</code> cria
              automaticamente as etapas com base na banda da sessão.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
