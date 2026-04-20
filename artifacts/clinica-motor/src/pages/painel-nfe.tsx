import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Ban, Pencil, Trash2, Shield, Eye, RefreshCcw, AlertTriangle } from "lucide-react";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleString("pt-BR") : "—";

const STATUS_COR: Record<string, string> = {
  RASCUNHO: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  EMITIDA: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  CANCELADA: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  ERRO: "bg-red-500/15 text-red-700 border-red-500/30",
};

export default function PainelNfePage() {
  const qc = useQueryClient();
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem("padcon_admin_token") ?? "");
  const [tokenSalvo, setTokenSalvo] = useState(!!adminToken);
  const [nfSelecionada, setNfSelecionada] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState<string>("");

  const { data: dash, isLoading } = useQuery<any>({
    queryKey: ["painel-nfe", filtroUnidade],
    queryFn: () => fetch(`/api/painel-nfe/dashboard${filtroUnidade ? `?unidadeId=${filtroUnidade}` : ""}`).then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const { data: provedoresNfe } = useQuery<any[]>({
    queryKey: ["provedores-nfe"],
    queryFn: () => fetch("/api/provedores-nfe").then((r) => r.json()),
  });

  const { data: eventos } = useQuery<any[]>({
    queryKey: ["nf-eventos", nfSelecionada],
    queryFn: () => fetch(`/api/painel-nfe/${nfSelecionada}/eventos`).then((r) => r.json()),
    enabled: !!nfSelecionada,
  });

  const cancelar = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/painel-nfe/${id}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ motivo }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["painel-nfe"] }); setMotivo(""); setNfSelecionada(null); },
  });

  const apagar = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/painel-nfe/${id}`, { method: "DELETE", headers: { "x-admin-token": adminToken } });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["painel-nfe"] }),
  });

  const salvarToken = () => {
    localStorage.setItem("padcon_admin_token", adminToken);
    setTokenSalvo(true);
  };

  const stats = dash?.estatisticas ?? {};
  const recentes = dash?.recentes ?? [];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <FileText className="w-7 h-7 text-[#1F4E5F]" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">📑 DASH NFe</h1>
          <p className="text-xs text-muted-foreground">Painel interno: emitir, cancelar, editar e auditar notas — sem sair do PADCON</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {tokenSalvo ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
              <Shield className="w-3 h-3 mr-1" />Master conectado
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/30">Master desconectado</Badge>
          )}
        </div>
      </header>

      {/* Master Token */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#B8941F]" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#1F4E5F]">Código Master</div>
            <div className="text-xs text-muted-foreground">Necessário pra cancelar, editar e apagar. Fica salvo só no seu navegador.</div>
          </div>
          <Input
            type="password"
            placeholder="Cole seu código master..."
            value={adminToken}
            onChange={(e) => { setAdminToken(e.target.value); setTokenSalvo(false); }}
            className="max-w-xs"
            data-testid="input-admin-token"
          />
          <Button onClick={salvarToken} size="sm" className="bg-[#B8941F] hover:bg-[#9a7a18]" data-testid="btn-salvar-token">Salvar</Button>
        </div>
      </Card>

      {/* Provedores NFe disponíveis */}
      <div className="grid grid-cols-2 gap-3">
        {(provedoresNfe ?? []).map((p) => (
          <Card key={p.codigo} className="p-4 border-l-4 border-l-[#1F4E5F]">
            <div className="flex items-center justify-between mb-1">
              <div className="font-bold text-[#1F4E5F]">{p.nome_exibicao}</div>
              {p.recomendado && <Badge className="bg-[#B8941F]/15 text-[#B8941F] border border-[#B8941F]/30">Recomendado</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mb-2">{p.descricao}</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {(p.funcionalidades ?? []).slice(0, 6).map((f: string) => (
                <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">💸 {p.preco_aproximado_por_nota} • 🌎 {p.cobertura_municipios}</div>
          </Card>
        ))}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Rascunhos", val: stats.rascunho ?? 0, cor: "#A78B5F" },
          { label: "Emitidas", val: stats.emitida ?? 0, cor: "#1F4E5F" },
          { label: "Canceladas", val: stats.cancelada ?? 0, cor: "#B85C5C" },
          { label: "Erros", val: stats.erro ?? 0, cor: "#7B6450" },
          { label: "R$ Emitido", val: fmt(stats.valor_emitido), cor: "#B8941F" },
          { label: "R$ Cancelado", val: fmt(stats.valor_cancelado), cor: "#5C7C8A" },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="text-lg font-bold mt-1" style={{ color: s.cor }}>{s.val}</div>
          </Card>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Filtrar por unidade:</span>
        <Input
          type="number"
          placeholder="ID da unidade (vazio = todas)"
          value={filtroUnidade}
          onChange={(e) => setFiltroUnidade(e.target.value)}
          className="max-w-xs"
          data-testid="input-filtro-unidade"
        />
        <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ["painel-nfe"] })}>
          <RefreshCcw className="w-3 h-3 mr-1" />Atualizar
        </Button>
      </div>

      {/* Tabela de notas */}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Nº</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Paciente</th>
              <th className="px-3 py-2 text-left">Unidade</th>
              <th className="px-3 py-2 text-left">Provedor</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="text-center py-6 text-muted-foreground">Carregando...</td></tr>
            ) : recentes.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Nenhuma nota fiscal ainda.</td></tr>
            ) : recentes.map((nf: any) => (
              <tr key={nf.id} className="border-t border-border hover:bg-muted/30" data-testid={`nf-row-${nf.id}`}>
                <td className="px-3 py-2 font-mono text-xs">{nf.id}</td>
                <td className="px-3 py-2 font-mono text-xs">{nf.numero_externo ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{nf.data_emissao}</td>
                <td className="px-3 py-2">{nf.paciente_nome ?? "—"}</td>
                <td className="px-3 py-2">
                  {nf.unidade_nome ? (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: (nf.unidade_cor ?? "#1F4E5F") + "22", color: nf.unidade_cor ?? "#1F4E5F" }}>{nf.unidade_nome}</span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2 text-xs">{nf.provedor_codigo ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(nf.valor)}</td>
                <td className="px-3 py-2 text-center">
                  <Badge className={`text-[10px] border ${STATUS_COR[nf.status] ?? ""}`}>{nf.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 justify-center">
                    <Button size="icon" variant="ghost" title="Ver eventos" onClick={() => setNfSelecionada(nf.id)} data-testid={`btn-ver-${nf.id}`}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {nf.pdf_url && (
                      <a href={nf.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-[#1F4E5F] hover:underline">PDF</a>
                    )}
                    {nf.status === "EMITIDA" && (
                      <Button size="icon" variant="ghost" title="Cancelar" onClick={() => setNfSelecionada(nf.id)} disabled={!tokenSalvo} data-testid={`btn-cancelar-${nf.id}`}>
                        <Ban className="w-3.5 h-3.5 text-rose-600" />
                      </Button>
                    )}
                    {nf.status === "RASCUNHO" && (
                      <>
                        <Button size="icon" variant="ghost" title="Editar" disabled={!tokenSalvo}>
                          <Pencil className="w-3.5 h-3.5 text-amber-600" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Apagar"
                          onClick={() => { if (confirm("Apagar este rascunho?")) apagar.mutate(nf.id); }}
                          disabled={!tokenSalvo}
                          data-testid={`btn-apagar-${nf.id}`}>
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Drawer cancelar / eventos */}
      {nfSelecionada && (
        <Card className="p-4 border-l-4 border-l-[#B8941F]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#1F4E5F]">NF #{nfSelecionada} — Eventos & Cancelamento</h3>
            <Button size="sm" variant="ghost" onClick={() => setNfSelecionada(null)}>Fechar</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Cancelar (motivo obrigatório)</h4>
              <Textarea
                placeholder="Ex: Pagamento estornado pelo banco em 20/04/2026..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={4}
                data-testid="textarea-motivo"
              />
              <Button
                className="mt-2 w-full bg-rose-600 hover:bg-rose-700"
                disabled={motivo.length < 10 || !tokenSalvo || cancelar.isPending}
                onClick={() => cancelar.mutate(nfSelecionada)}
                data-testid="btn-confirmar-cancelar"
              >
                <Ban className="w-4 h-4 mr-1" />
                {cancelar.isPending ? "Cancelando..." : "Cancelar nota no provedor"}
              </Button>
              {cancelar.error && (
                <div className="mt-2 text-xs text-rose-700 bg-rose-50 p-2 rounded flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5" />{(cancelar.error as Error).message}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Timeline da nota</h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {(eventos ?? []).length === 0 ? (
                  <div className="text-xs text-muted-foreground">Sem eventos.</div>
                ) : (eventos ?? []).map((ev: any) => (
                  <div key={ev.id} className="text-xs border-l-2 border-[#1F4E5F]/30 pl-2 py-1">
                    <div className="font-semibold text-[#1F4E5F]">{ev.tipo_evento}</div>
                    <div className="text-muted-foreground">{ev.descricao}</div>
                    <div className="text-[10px] text-muted-foreground">{fmtDate(ev.ocorrido_em)} · {ev.responsavel}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
