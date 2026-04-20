import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AtSign, Shield, AlertTriangle, CheckCircle2, Power, Sparkles, ListChecks, Eraser, Filter } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-slate-100 text-slate-700",
  selected: "bg-amber-100 text-amber-800",
  provisioning: "bg-blue-100 text-blue-800",
  provisioned: "bg-emerald-100 text-emerald-800",
  disabled: "bg-zinc-200 text-zinc-600",
  failed: "bg-red-100 text-red-800",
  archived: "bg-stone-200 text-stone-600",
};

export default function IdentidadeEmailsPage() {
  const qc = useQueryClient();
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem("padcon_admin_token") ?? "");
  const [unidadeId, setUnidadeId] = useState<number | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroCargo, setFiltroCargo] = useState<string>("");
  useEffect(() => { localStorage.setItem("padcon_admin_token", adminToken); }, [adminToken]);

  const { data: unidades } = useQuery<any[]>({
    queryKey: ["unidades-cadastradas"],
    queryFn: () => fetch("/api/unidades").then((r) => r.json()),
  });

  const { data: providerStatus } = useQuery<any>({
    queryKey: ["email-identity-provider-status"],
    queryFn: () => fetch("/api/email-identity/provider-status").then((r) => r.json()),
  });

  const { data: identidades } = useQuery<any>({
    queryKey: ["email-identity", unidadeId],
    queryFn: () => unidadeId ? fetch(`/api/email-identity/clinic/${unidadeId}`).then((r) => r.json()) : null,
    enabled: !!unidadeId,
  });

  const gerarCatalogo = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/email-identity/clinic/${unidadeId}/generate`, {
        method: "POST",
        headers: { "x-admin-token": adminToken },
      });
      if (!r.ok) throw new Error((await r.json()).error || "Erro");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-identity", unidadeId] }),
  });

  const toggleSelecao = useMutation({
    mutationFn: async ({ id, acao }: { id: number; acao: "selecionar" | "desselecionar" }) => {
      const r = await fetch(`/api/email-identity/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ acao }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Erro");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-identity", unidadeId] }),
  });

  const provisionar = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/email-identity/clinic/${unidadeId}/provision-selected`, {
        method: "POST",
        headers: { "x-admin-token": adminToken },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(data));
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-identity", unidadeId] }),
  });

  const desativar = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/email-identity/${id}/disable`, {
        method: "POST",
        headers: { "x-admin-token": adminToken },
      });
      if (!r.ok) throw new Error((await r.json()).error || "Erro");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-identity", unidadeId] }),
  });

  const stats = identidades?.stats;
  const listaCompleta: any[] = identidades?.identidades ?? [];
  const lista = listaCompleta.filter((it) =>
    (!filtroStatus || it.status === filtroStatus) &&
    (!filtroCargo || it.cargo === filtroCargo)
  );
  const grouped: Record<string, any[]> = {};
  for (const it of lista) {
    if (!grouped[it.cargo]) grouped[it.cargo] = [];
    grouped[it.cargo].push(it);
  }
  const cargosUnicos = Array.from(new Set(listaCompleta.map((it) => it.cargo))).sort();
  const statusUnicos = Array.from(new Set(listaCompleta.map((it) => it.status))).sort();

  const selecionarTodosVisiveis = useMutation({
    mutationFn: async () => {
      const alvos = lista.filter((it) => it.status === "available");
      await Promise.all(alvos.map((it) =>
        fetch(`/api/email-identity/${it.id}/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
          body: JSON.stringify({ acao: "selecionar" }),
        })
      ));
      return { count: alvos.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-identity", unidadeId] }),
  });

  const limparSelecao = useMutation({
    mutationFn: async () => {
      const alvos = lista.filter((it) => it.status === "selected");
      await Promise.all(alvos.map((it) =>
        fetch(`/api/email-identity/${it.id}/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
          body: JSON.stringify({ acao: "desselecionar" }),
        })
      ));
      return { count: alvos.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-identity", unidadeId] }),
  });

  return (
    <div className="p-6 space-y-6 bg-stone-50 min-h-screen">
      <div className="flex items-center gap-3">
        <AtSign className="w-7 h-7 text-[#1F4E5F]" />
        <div>
          <h1 className="text-2xl font-semibold text-[#1F4E5F]">Identidade de E-mails Operacionais</h1>
          <p className="text-sm text-stone-600">Catálogo `cargo.modo.hierarquia.clinica@padwards.com.br` — provisionamento sob demanda no Google Workspace.</p>
        </div>
      </div>

      <Card className="p-4 bg-white border-stone-200 rounded-none">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-stone-700">Admin Token</label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-none text-sm font-mono"
              placeholder="x-admin-token"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-700">Clínica</label>
            <select
              value={unidadeId ?? ""}
              onChange={(e) => setUnidadeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-stone-300 rounded-none text-sm bg-white"
            >
              <option value="">Selecione uma clínica…</option>
              {unidades?.filter((u: any) => !u.nome?.startsWith("(ARQUIVADA")).map((u: any) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {unidadeId && (
              <Button
                onClick={() => gerarCatalogo.mutate()}
                disabled={gerarCatalogo.isPending}
                className="bg-[#1F4E5F] hover:bg-[#163842] text-white rounded-none w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {gerarCatalogo.isPending ? "Gerando..." : "Gerar / Sincronizar Catálogo (32 slots)"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {providerStatus && (
        <Card className={`p-4 rounded-none border ${providerStatus.configured ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300"}`}>
          <div className="flex gap-3">
            {providerStatus.configured
              ? <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />}
            <div className="text-sm flex-1">
              <p className={`font-semibold ${providerStatus.configured ? "text-emerald-900" : "text-amber-900"}`}>
                Provider ativo: <span className="uppercase font-mono">{providerStatus.activeProvider}</span> — {providerStatus.configured ? "Configurado e pronto" : "Aguardando credenciais"}
              </p>
              <p className={`mt-1 ${providerStatus.configured ? "text-emerald-800" : "text-amber-800"}`}>
                Domínio: <strong>{providerStatus.domain}</strong>
              </p>
              {!providerStatus.configured && providerStatus.missingEnvVars?.length > 0 && (
                <div className="mt-2">
                  <p className="text-amber-800 font-semibold">Variáveis pendentes:</p>
                  <ul className="font-mono text-xs mt-1 text-amber-900">
                    {providerStatus.missingEnvVars.map((v: string) => <li key={v}>• {v}</li>)}
                  </ul>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-amber-900 font-semibold">Passos para ativar →</summary>
                    <ol className="mt-2 text-xs text-amber-900 list-decimal list-inside space-y-1">
                      {providerStatus.setupSteps?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ol>
                  </details>
                </div>
              )}
              {providerStatus.aliasLimitWarning && (
                <p className="mt-2 text-xs text-stone-700 italic border-t border-current/20 pt-2">
                  ⚠ {providerStatus.aliasLimitWarning}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { k: "total", l: "Total" },
            { k: "available", l: "Disponíveis" },
            { k: "selected", l: "Selecionados" },
            { k: "provisioned", l: "Provisionados" },
            { k: "failed", l: "Falharam" },
            { k: "disabled", l: "Desativados" },
          ].map((s) => (
            <Card key={s.k} className="p-3 bg-white border-stone-200 rounded-none">
              <p className="text-xs text-stone-600">{s.l}</p>
              <p className="text-2xl font-mono font-semibold text-[#1F4E5F]">{(stats as any)[s.k] ?? 0}</p>
            </Card>
          ))}
        </div>
      )}

      {stats && stats.selected > 0 && (
        <Card className="p-4 bg-[#1F4E5F] text-white rounded-none flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <div>
              <p className="font-semibold">{stats.selected} e-mail(s) selecionado(s) prontos para provisionar</p>
              <p className="text-xs opacity-80">Vai chamar o Google Admin SDK para criar os aliases reais.</p>
            </div>
          </div>
          <Button
            onClick={() => provisionar.mutate()}
            disabled={provisionar.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-[#1F4E5F] font-semibold rounded-none"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {provisionar.isPending ? "Provisionando…" : "Provisionar Selecionados"}
          </Button>
        </Card>
      )}

      {provisionar.data && (
        <Card className="p-4 bg-emerald-50 border-emerald-300 rounded-none">
          <p className="font-semibold text-emerald-900">
            Resultado: {provisionar.data.success} sucesso(s), {provisionar.data.failed} falha(s) de {provisionar.data.totalSelecionados} selecionado(s)
          </p>
          {provisionar.data.detalhes?.filter((d: any) => d.status === "failed").map((d: any, i: number) => (
            <p key={i} className="text-xs text-red-700 mt-1 font-mono">{d.email}: {d.erro}</p>
          ))}
        </Card>
      )}

      {provisionar.error && (
        <Card className="p-4 bg-red-50 border-red-300 rounded-none">
          <p className="font-semibold text-red-900">Erro:</p>
          <pre className="text-xs text-red-800 mt-1 whitespace-pre-wrap">{(provisionar.error as Error).message}</pre>
        </Card>
      )}

      {listaCompleta.length > 0 && (
        <Card className="p-3 bg-white border-stone-200 rounded-none flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Filter className="w-4 h-4 text-stone-500" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-2 py-1 border border-stone-300 rounded-none text-xs bg-white"
            >
              <option value="">Todos os status</option>
              {statusUnicos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filtroCargo}
              onChange={(e) => setFiltroCargo(e.target.value)}
              className="px-2 py-1 border border-stone-300 rounded-none text-xs bg-white"
            >
              <option value="">Todos os cargos</option>
              {cargosUnicos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-stone-500">
              {lista.length} de {listaCompleta.length} visíveis
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-none text-xs"
              onClick={() => selecionarTodosVisiveis.mutate()}
              disabled={selecionarTodosVisiveis.isPending || !lista.some((it) => it.status === "available")}>
              <ListChecks className="w-3 h-3 mr-1" />
              {selecionarTodosVisiveis.isPending ? "Selecionando..." : `Selecionar disponíveis (${lista.filter((it) => it.status === "available").length})`}
            </Button>
            <Button size="sm" variant="outline" className="rounded-none text-xs text-red-700 border-red-200"
              onClick={() => limparSelecao.mutate()}
              disabled={limparSelecao.isPending || !lista.some((it) => it.status === "selected")}>
              <Eraser className="w-3 h-3 mr-1" />
              {limparSelecao.isPending ? "Limpando..." : `Limpar selecionados (${lista.filter((it) => it.status === "selected").length})`}
            </Button>
          </div>
        </Card>
      )}

      {Object.keys(grouped).length > 0 && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cargo, items]) => (
            <Card key={cargo} className="bg-white border-stone-200 rounded-none">
              <div className="px-4 py-2 border-b border-stone-200 bg-stone-100">
                <h2 className="font-semibold text-[#1F4E5F] uppercase text-sm tracking-wide">{cargo}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr className="text-left text-xs text-stone-600">
                    <th className="px-4 py-2">E-mail</th>
                    <th className="px-4 py-2">Modo</th>
                    <th className="px-4 py-2">Hierarquia</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-4 py-2 font-mono text-xs text-stone-800">{it.email}</td>
                      <td className="px-4 py-2 text-xs">{it.modo}</td>
                      <td className="px-4 py-2 text-xs">{it.hierarquia}</td>
                      <td className="px-4 py-2">
                        <Badge className={`${STATUS_COLORS[it.status]} rounded-none border-0 text-xs`}>{it.status}</Badge>
                        {it.last_error && <p className="text-xs text-red-600 mt-1 font-mono">{it.last_error.substring(0, 60)}</p>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {it.status === "available" && (
                          <Button size="sm" variant="outline" className="rounded-none text-xs"
                            onClick={() => toggleSelecao.mutate({ id: it.id, acao: "selecionar" })}>
                            Selecionar
                          </Button>
                        )}
                        {it.status === "selected" && (
                          <Button size="sm" variant="outline" className="rounded-none text-xs"
                            onClick={() => toggleSelecao.mutate({ id: it.id, acao: "desselecionar" })}>
                            Desselecionar
                          </Button>
                        )}
                        {it.status === "provisioned" && (
                          <Button size="sm" variant="outline" className="rounded-none text-xs text-red-600"
                            onClick={() => desativar.mutate(it.id)}>
                            <Power className="w-3 h-3 mr-1" /> Desativar
                          </Button>
                        )}
                        {it.status === "failed" && (
                          <Button size="sm" variant="outline" className="rounded-none text-xs"
                            onClick={() => toggleSelecao.mutate({ id: it.id, acao: "selecionar" })}>
                            Re-tentar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}

      {!unidadeId && (
        <Card className="p-8 bg-white border-stone-200 rounded-none text-center text-stone-500">
          <AtSign className="w-12 h-12 mx-auto mb-3 text-stone-300" />
          <p>Selecione uma clínica acima para ver/gerar o catálogo de identidades.</p>
        </Card>
      )}
    </div>
  );
}
