import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Layers,
  Microscope,
  Syringe,
  Droplets,
  CircleDot,
  FlaskConical,
  Brain,
  Thermometer,
  Scissors,
  Apple,
  ArrowRight,
  Shield,
  Info,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

type SubTab = "base-dados" | "regras-nomenclatura" | "itens-pendentes";

const SUB_TABS: { key: SubTab; label: string; icon: typeof Database }[] = [
  { key: "base-dados", label: "Base de Dados", icon: Database },
  { key: "regras-nomenclatura", label: "Regras de Nomenclatura", icon: BookOpen },
  { key: "itens-pendentes", label: "Itens sem Codigo", icon: AlertTriangle },
];

const ICON_MAP: Record<string, typeof Microscope> = {
  microscope: Microscope,
  layers: Layers,
  syringe: Syringe,
  droplets: Droplets,
  "circle-dot": CircleDot,
  "flask-conical": FlaskConical,
  brain: Brain,
  thermometer: Thermometer,
  scissors: Scissors,
  apple: Apple,
};

function ProgressBar({ total, filled }: { total: number; filled: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const color = pct === 100 ? "bg-emerald-500" : pct >= 80 ? "bg-blue-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-10 text-right">{pct}%</span>
    </div>
  );
}

function BaseDadosTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["seguranca-base-dados"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/seguranca/base-dados`);
      if (!res.ok) throw new Error("Erro ao carregar dados");
      return res.json();
    },
  });

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando estatisticas...</div>;
  if (!data?.resumo) return <div className="text-destructive py-8 text-center">Erro ao carregar dados da base</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-2xl font-bold text-foreground">{data.resumo.totalItens}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total de Itens</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-2xl font-bold text-emerald-500">{data.resumo.totalComCodigo}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Com Codigo Semantico</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-2xl font-bold text-amber-500">{data.resumo.totalSemCodigo}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Sem Codigo</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-2xl font-bold text-primary">{data.resumo.coberturaPct}%</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Cobertura</div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground w-8"></th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Tabela</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Total</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Com Codigo</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center">Sem Codigo</th>
              <th className="px-4 py-3 font-medium text-muted-foreground w-40">Cobertura</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-center w-12">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.tabelas.map((t: any) => {
              const IconComp = ICON_MAP[t.icone] || Database;
              const sem = t.total - t.comCodigo;
              const completo = sem === 0 && t.total > 0;
              return (
                <tr key={t.tabela} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3"><IconComp className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="px-4 py-3 font-medium">{t.tabela}</td>
                  <td className="px-4 py-3 text-center font-mono">{t.total}</td>
                  <td className="px-4 py-3 text-center font-mono text-emerald-500">{t.comCodigo}</td>
                  <td className="px-4 py-3 text-center font-mono text-amber-500">{sem}</td>
                  <td className="px-4 py-3"><ProgressBar total={t.total} filled={t.comCodigo} /></td>
                  <td className="px-4 py-3 text-center">
                    {completo ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                    ) : t.total === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-500 mx-auto" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegrasNomenclaturaTab() {
  const [expandedCampo, setExpandedCampo] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["seguranca-regras"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/seguranca/regras-nomenclatura`);
      if (!res.ok) throw new Error("Erro ao carregar regras");
      return res.json();
    },
  });

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando regras...</div>;
  if (!data?.regras) return <div className="text-destructive py-8 text-center">Erro ao carregar regras de nomenclatura</div>;

  const { regras, blocosAtivos, gradesDisponiveis } = data;

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-5 bg-card">
        <div className="flex items-start gap-3 mb-4">
          <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-sm mb-1">Sistema de Codificacao Semantica Dr. Manus</div>
            <div className="text-xs text-muted-foreground">{regras.descricao}</div>
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-center">
          <div className="text-lg tracking-widest text-primary font-bold">{regras.formato}</div>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Tipo</span>
            <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded">Bloco</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">Grade</span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Item</span>
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded">Seq</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-5 bg-card">
        <div className="font-semibold text-sm mb-1 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Aplicacao Automatica
        </div>
        <div className="text-xs text-muted-foreground mt-1">{regras.autoAplicacao}</div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">Campos do Codigo</h3>
        {regras.campos.map((campo: any) => (
          <div key={campo.campo} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedCampo(expandedCampo === campo.campo ? null : campo.campo)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedCampo === campo.campo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-mono font-bold text-primary text-sm">{campo.campo}</span>
                <span className="font-semibold text-sm">{campo.nome}</span>
                <Badge variant="outline" className="text-xs">{campo.tamanho} chars</Badge>
              </div>
            </button>
            {expandedCampo === campo.campo && (
              <div className="border-t p-4 bg-muted/10 space-y-3">
                <div className="text-xs text-muted-foreground">{campo.descricao}</div>
                {campo.regra && (
                  <div className="text-xs bg-muted/30 p-3 rounded-lg border-l-2 border-primary">
                    <span className="font-semibold text-foreground">Regra: </span>
                    <span className="text-muted-foreground">{campo.regra}</span>
                  </div>
                )}
                {campo.valores && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {campo.valores.map((v: any) => (
                      <div key={v.codigo} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                        <span className="font-mono font-bold text-xs text-primary w-10">{v.codigo}</span>
                        <span className="text-xs text-muted-foreground">{v.descricao}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">Exemplos</h3>
        <div className="space-y-2">
          {regras.exemplos.map((ex: any, i: number) => (
            <div key={i} className="border rounded-lg p-4 bg-card flex items-start gap-3">
              <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-mono text-sm font-bold text-primary tracking-wider">{ex.codigo}</div>
                <div className="text-xs text-muted-foreground mt-1">{ex.explicacao}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Blocos Ativos ({blocosAtivos.length})
          </h3>
          <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 text-left sticky top-0">
                  <th className="px-3 py-2 font-medium text-muted-foreground">Codigo</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Bloco</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {blocosAtivos.map((b: any) => (
                  <tr key={b.codigoBloco} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-primary">{b.codigoBloco}</td>
                    <td className="px-3 py-2">{b.nomeBloco}</td>
                    <td className="px-3 py-2 text-muted-foreground">{b.tipoMacro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Grades Disponiveis ({gradesDisponiveis.length})
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 text-left">
                  <th className="px-3 py-2 font-medium text-muted-foreground">Codigo</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Nome</th>
                </tr>
              </thead>
              <tbody>
                {gradesDisponiveis.map((g: any) => (
                  <tr key={g.codigo} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-primary">{g.codigo}</td>
                    <td className="px-3 py-2">{g.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItensPendentesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["seguranca-itens-sem-codigo"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/seguranca/itens-sem-codigo`);
      if (!res.ok) throw new Error("Erro ao carregar itens pendentes");
      return res.json();
    },
  });

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;
  if (!data) return <div className="text-destructive py-8 text-center">Erro ao carregar itens pendentes</div>;

  const TIPO_LABELS: Record<string, string> = {
    EXAM: "Exame",
    INJE: "Injetavel",
    IMPL: "Implante",
    ENDO: "Endovenoso",
    FORM: "Formula",
    DOEN: "Doenca",
    DIET: "Dieta",
    SINT: "Sintoma",
    CIRU: "Cirurgia",
  };

  const grouped: Record<string, any[]> = {};
  (data.itens || []).forEach((item: any) => {
    const tipo = item.tipo || "OUTRO";
    if (!grouped[tipo]) grouped[tipo] = [];
    grouped[tipo].push(item);
  });

  if (data.total === 0) {
    return (
      <div className="border rounded-lg p-8 bg-card text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
        <div className="text-lg font-semibold text-foreground">Base 100% codificada</div>
        <div className="text-sm text-muted-foreground mt-1">Todos os itens possuem codigo semantico Dr. Manus</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-card flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div>
          <div className="font-semibold text-sm">{data.total} itens sem codigo semantico</div>
          <div className="text-xs text-muted-foreground">Estes itens precisam receber codigo Dr. Manus via seed ou cadastro manual</div>
        </div>
      </div>

      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([tipo, itens]) => (
        <div key={tipo} className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-primary">{tipo}</span>
              <span className="font-semibold text-sm">{TIPO_LABELS[tipo] || tipo}</span>
            </div>
            <Badge variant="outline" className="text-xs">{itens.length}</Badge>
          </div>
          <div className="divide-y">
            {itens.map((item: any) => (
              <div key={`${tipo}-${item.id}`} className="px-4 py-2 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono w-8">#{item.id}</span>
                  <span className="text-sm">{item.nome}</span>
                </div>
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">Pendente</Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SegurancaPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("base-dados");

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seguranca</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestao da base de dados, regras de nomenclatura e integridade semantica</p>
        </div>

        <div className="flex gap-1 border-b border-border">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "base-dados" && <BaseDadosTab />}
        {activeTab === "regras-nomenclatura" && <RegrasNomenclaturaTab />}
        {activeTab === "itens-pendentes" && <ItensPendentesTab />}
      </div>
    </Layout>
  );
}
