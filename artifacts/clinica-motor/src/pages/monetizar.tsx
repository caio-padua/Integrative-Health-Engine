import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Activity, DollarSign, Calendar, MessageSquare, Sparkles, Cloud, Mountain, Heart } from "lucide-react";

type Aba = "agenda" | "aplicacao" | "mensageria" | "provisionamento" | "live";

const ABAS: { id: Aba; nome: string; icon: any; cor: string }[] = [
  { id: "agenda", nome: "Monetizar Agenda", icon: Calendar, cor: "#1F4E5F" },
  { id: "aplicacao", nome: "Monetizar Aplicação", icon: Sparkles, cor: "#A78B5F" },
  { id: "mensageria", nome: "Monetizar Mensageria", icon: MessageSquare, cor: "#5C7C8A" },
  { id: "provisionamento", nome: "Monetizar Provisionamento", icon: Cloud, cor: "#7B6450" },
  { id: "live", nome: "Faturamento Live", icon: Activity, cor: "#B8941F" },
];

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MonetizarPage() {
  const [aba, setAba] = useState<Aba>("agenda");
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <Heart className="w-7 h-7 text-[#B8941F]" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">💰 Monetizar PADCON</h1>
          <p className="text-xs text-muted-foreground">Coração que bombeia: cada ação clínica = 1 evento gravado no ledger = 1 centavo cobrado</p>
        </div>
      </header>

      <div className="flex gap-1 border-b border-border overflow-x-auto" data-testid="tabs-monetizar">
        {ABAS.map((a) => {
          const Icon = a.icon;
          const ativo = aba === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              data-testid={`tab-${a.id}`}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                ativo
                  ? "border-[#B8941F] text-[#1F4E5F] bg-[#B8941F]/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: ativo ? a.cor : undefined }} />
              {a.nome}
            </button>
          );
        })}
      </div>

      {aba === "live" ? <FaturamentoLive /> : <MatrizModulosEventos grupo={aba} />}
    </div>
  );
}

function MatrizModulosEventos({ grupo }: { grupo: Exclude<Aba, "live"> }) {
  const qc = useQueryClient();
  const { data: matriz = [], isLoading } = useQuery<any[]>({
    queryKey: ["modulos-padcon-matriz"],
    queryFn: () => fetch("/api/modulos-padcon/matriz").then((r) => r.json()),
  });
  const { data: eventos = [] } = useQuery<any[]>({
    queryKey: ["eventos-cobraveis"],
    queryFn: () => fetch("/api/eventos-cobraveis").then((r) => r.json()),
  });

  const mut = useMutation({
    mutationFn: ({ unidadeId, moduloId, ativo }: any) =>
      fetch(`/api/modulos-padcon/ativar/${unidadeId}/${moduloId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo, usuario: "caio" }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modulos-padcon-matriz"] }),
  });

  const dispMut = useMutation({
    mutationFn: ({ unidadeId, eventoCodigo }: any) =>
      fetch(`/api/eventos-cobraveis/disparar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidadeId, eventoCodigo, referenciaExterna: "teste-manual-painel" }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faturamento-live"] }),
  });

  const matrizFiltrada = useMemo(() => matriz.filter((m: any) => m.grupo === grupo), [matriz, grupo]);
  const eventosFiltrados = useMemo(() => eventos.filter((e: any) => e.grupo === grupo), [eventos, grupo]);

  const unidades = useMemo(() => {
    const seen = new Set();
    return matrizFiltrada
      .filter((m: any) => (seen.has(m.unidade_id) ? false : (seen.add(m.unidade_id), true)))
      .map((m: any) => ({ id: m.unidade_id, nome: m.unidade_nome, cor: m.unidade_cor }));
  }, [matrizFiltrada]);

  const modulos = useMemo(() => {
    const seen = new Set();
    return matrizFiltrada
      .filter((m: any) => (seen.has(m.modulo_id) ? false : (seen.add(m.modulo_id), true)))
      .map((m: any) => ({ id: m.modulo_id, codigo: m.modulo_codigo, nome: m.modulo_nome, preco: m.preco_mensal }));
  }, [matrizFiltrada]);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando matriz...</div>;

  return (
    <div className="space-y-6">
      {/* MÓDULOS — mensalidade */}
      <Card className="p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F4E5F] mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> MÓDULOS (mensalidade)
        </h2>
        {modulos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem módulos neste grupo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-2 font-semibold">Módulo</th>
                  <th className="text-right p-2 font-semibold">Preço/mês</th>
                  {unidades.map((u: any) => (
                    <th key={u.id} className="text-center p-2 font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.cor || "#999" }} />
                        <span className="text-[10px] uppercase">{u.nome.replace("INSTITUTO ", "")}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modulos.map((m: any) => (
                  <tr key={m.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="p-2 font-mono text-[11px]">
                      <span className="text-[#B8941F] font-bold">{m.codigo}</span> {m.nome}
                    </td>
                    <td className="p-2 text-right font-mono text-[11px] font-semibold text-[#1F4E5F]">{fmt(m.preco)}</td>
                    {unidades.map((u: any) => {
                      const cell = matrizFiltrada.find((x: any) => x.unidade_id === u.id && x.modulo_id === m.id);
                      const ativo = cell?.ativo ?? false;
                      return (
                        <td key={u.id} className="p-2 text-center">
                          <Switch
                            checked={ativo}
                            onCheckedChange={(v) => mut.mutate({ unidadeId: u.id, moduloId: m.id, ativo: v })}
                            data-testid={`switch-${m.codigo}-${u.id}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* EVENTOS — pay per use */}
      <Card className="p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F4E5F] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" /> EVENTOS COBRÁVEIS (pay-per-use)
        </h2>
        {eventosFiltrados.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem eventos neste grupo.</p>
        ) : (
          <div className="space-y-2">
            {eventosFiltrados.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded border border-border/40 bg-muted/20">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono">
                    <span className="text-[#B8941F] font-bold">{e.codigo}</span> · {e.nome}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Trigger: <code className="text-[#5C7C8A]">{e.trigger_origem ?? "—"}</code>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-sm font-mono font-bold text-[#1F4E5F]">{fmt(e.preco_unitario)}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">por {e.unidade_medida}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3 text-[10px] h-7"
                  onClick={() => {
                    const u = prompt("ID da unidade pra disparar teste? (ex: 15 = Pádua)");
                    if (u) dispMut.mutate({ unidadeId: parseInt(u, 10), eventoCodigo: e.codigo });
                  }}
                  data-testid={`btn-disparar-${e.codigo}`}
                >
                  Disparar
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function FaturamentoLive() {
  const competencia = new Date().toISOString().slice(0, 7);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["faturamento-live", competencia],
    queryFn: () => fetch(`/api/ledger/faturamento-live?competencia=${competencia}`).then((r) => r.json()),
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando faturamento...</div>;
  if (!data) return null;

  const totais = data.totaisPorUnidade ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-r from-[#1F4E5F]/5 to-[#B8941F]/5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F4E5F] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#B8941F]" /> Faturamento Live · Competência {competencia}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {totais.map((t: any) => {
            const total = Number(t.total_eventos ?? 0) + Number(t.total_modulos ?? 0);
            return (
              <div key={t.unidade_id} className="p-3 rounded border border-border bg-card" data-testid={`fatura-card-${t.unidade_id}`}>
                <div className="text-[11px] uppercase font-semibold text-muted-foreground">{t.unidade_nome}</div>
                <div className="text-2xl font-mono font-bold text-[#1F4E5F] mt-1">{fmt(total)}</div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
                  <span>Módulos: {fmt(t.total_modulos)}</span>
                  <span>Eventos: {fmt(t.total_eventos)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Detalhamento por evento</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-2">Unidade</th>
                <th className="text-left p-2">Grupo</th>
                <th className="text-left p-2">Evento</th>
                <th className="text-right p-2">Qtd</th>
                <th className="text-right p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.detalhe.filter((d: any) => d.evento_codigo).map((d: any, i: number) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="p-2">{d.unidade_nome}</td>
                  <td className="p-2 text-muted-foreground uppercase text-[10px]">{d.grupo}</td>
                  <td className="p-2 font-mono"><span className="text-[#B8941F]">{d.evento_codigo}</span> · {d.evento_nome}</td>
                  <td className="p-2 text-right font-mono">{d.qtd}</td>
                  <td className="p-2 text-right font-mono font-semibold text-[#1F4E5F]">{fmt(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
