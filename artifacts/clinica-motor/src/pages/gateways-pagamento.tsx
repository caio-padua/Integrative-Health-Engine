import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Shield, KeyRound, CheckCircle2 } from "lucide-react";

export default function GatewaysPagamentoPage() {
  const qc = useQueryClient();
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem("padcon_admin_token") ?? "");
  const [form, setForm] = useState({
    unidadeId: "" as any,
    provedorCodigo: "mercadopago" as "asaas" | "stripe" | "mercadopago" | "infinitpay" | "vindi",
    ambiente: "sandbox" as "sandbox" | "producao",
    apiKey: "",
    webhookSecret: "",
  });

  const { data: provedores } = useQuery<any[]>({
    queryKey: ["provedores-pagamento"],
    queryFn: () => fetch("/api/provedores-pagamento").then((r) => r.json()),
  });

  const { data: cadastradas } = useQuery<any[]>({
    queryKey: ["credenciais-gateway"],
    queryFn: () => fetch("/api/credenciais/gateway").then((r) => r.json()),
  });

  const { data: unidades } = useQuery<any[]>({
    queryKey: ["unidades-cadastradas"],
    queryFn: () => fetch("/api/unidades").then((r) => r.json()),
  });

  const cadastrar = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/credenciais/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({
          unidadeId: parseInt(form.unidadeId, 10),
          provedorCodigo: form.provedorCodigo,
          ambiente: form.ambiente,
          apiKey: form.apiKey,
          webhookSecret: form.webhookSecret || undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credenciais-gateway"] });
      setForm((f) => ({ ...f, apiKey: "", webhookSecret: "" }));
    },
  });

  const desativar = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/credenciais/gateway/${id}`, { method: "DELETE", headers: { "x-admin-token": adminToken } });
      if (!r.ok) throw new Error("Falha");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credenciais-gateway"] }),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <CreditCard className="w-7 h-7 text-[#1F4E5F]" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">💳 Gateways de Pagamento</h1>
          <p className="text-xs text-muted-foreground">5 braços disponíveis. Cadastre as credenciais sandbox/produção por clínica.</p>
        </div>
      </header>

      {/* Master Token */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#B8941F]" />
          <div className="flex-1 text-sm">Código master pra cadastrar credenciais</div>
          <Input
            type="password"
            placeholder="Master token..."
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="max-w-xs"
            data-testid="input-admin-token"
          />
          <Button size="sm" className="bg-[#B8941F] hover:bg-[#9a7a18]"
            onClick={() => localStorage.setItem("padcon_admin_token", adminToken)}>Salvar</Button>
        </div>
      </Card>

      {/* Catálogo de provedores */}
      <div className="grid grid-cols-5 gap-3">
        {(provedores ?? []).map((p) => (
          <Card key={p.codigo} className="p-3 text-center border-l-4 border-l-[#1F4E5F]">
            <div className="font-bold text-[#1F4E5F] text-sm">{p.nome_exibicao}</div>
            <div className="text-[10px] text-muted-foreground mt-1 line-clamp-3">{p.funcao}</div>
            <div className="mt-2 flex flex-wrap gap-1 justify-center">
              {(p.metodos_suportados ?? []).slice(0, 3).map((m: string) => (
                <Badge key={m} variant="outline" className="text-[9px]">{m}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Cadastrar credencial */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <h3 className="font-bold text-[#1F4E5F] mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />Cadastrar / atualizar credencial
        </h3>
        <div className="grid grid-cols-5 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Unidade</label>
            <select
              className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
              value={form.unidadeId}
              onChange={(e) => setForm({ ...form, unidadeId: e.target.value })}
              data-testid="select-unidade"
            >
              <option value="">Selecione...</option>
              {(unidades ?? []).filter((u) => u.id > 7).map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Provedor</label>
            <select
              className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
              value={form.provedorCodigo}
              onChange={(e) => setForm({ ...form, provedorCodigo: e.target.value as any })}
              data-testid="select-provedor"
            >
              <option value="mercadopago">Mercado Pago</option>
              <option value="asaas">Asaas</option>
              <option value="stripe">Stripe</option>
              <option value="infinitpay">InfinitePay</option>
              <option value="vindi">Vindi</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ambiente</label>
            <select
              className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
              value={form.ambiente}
              onChange={(e) => setForm({ ...form, ambiente: e.target.value as any })}
              data-testid="select-ambiente"
            >
              <option value="sandbox">Sandbox</option>
              <option value="producao">Produção</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">API Key</label>
            <Input type="password" placeholder="API Key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} data-testid="input-api-key" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Webhook Secret (opc)</label>
            <Input type="password" placeholder="Webhook secret" value={form.webhookSecret} onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })} data-testid="input-webhook-secret" />
          </div>
        </div>
        <Button
          className="mt-3 bg-[#1F4E5F] hover:bg-[#163e4d]"
          disabled={!form.unidadeId || form.apiKey.length < 8 || cadastrar.isPending}
          onClick={() => cadastrar.mutate()}
          data-testid="btn-cadastrar"
        >
          <KeyRound className="w-4 h-4 mr-1" />{cadastrar.isPending ? "Salvando..." : "Salvar credencial"}
        </Button>
        {cadastrar.error && <div className="mt-2 text-xs text-rose-700">{(cadastrar.error as Error).message}</div>}
        {cadastrar.isSuccess && <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Credencial cadastrada/atualizada.</div>}
      </Card>

      {/* Credenciais cadastradas */}
      <Card className="overflow-hidden">
        <div className="px-4 py-2 bg-muted/50 text-xs uppercase tracking-widest font-bold text-muted-foreground">Credenciais cadastradas</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Unidade</th>
              <th className="px-3 py-2 text-left">Provedor</th>
              <th className="px-3 py-2 text-center">Ambiente</th>
              <th className="px-3 py-2 text-left">API Key</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(cadastradas ?? []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma credencial ainda.</td></tr>
            ) : (cadastradas ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border" data-testid={`cred-row-${c.id}`}>
                <td className="px-3 py-2">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: (c.unidade_cor ?? "#1F4E5F") + "22", color: c.unidade_cor ?? "#1F4E5F" }}>{c.unidade_nome}</span>
                </td>
                <td className="px-3 py-2">{c.provedor_nome}</td>
                <td className="px-3 py-2 text-center text-xs">{c.ambiente}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.apiKeyMasked}</td>
                <td className="px-3 py-2 text-center">
                  {c.ativo ? <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">Ativa</Badge> : <Badge variant="outline">Desativada</Badge>}
                </td>
                <td className="px-3 py-2 text-center">
                  {c.ativo && (
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => { if (confirm("Desativar credencial?")) desativar.mutate(c.id); }} data-testid={`btn-desativar-${c.id}`}>
                      Desativar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
