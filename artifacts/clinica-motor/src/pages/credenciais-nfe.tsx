import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Receipt, Shield, KeyRound, Image as ImageIcon, CheckCircle2 } from "lucide-react";

export default function CredenciaisNfePage() {
  const qc = useQueryClient();
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem("padcon_admin_token") ?? "");
  const [form, setForm] = useState({
    unidadeId: "" as any,
    provedorCodigo: "focus_nfe" as "focus_nfe" | "enotas",
    ambiente: "homologacao" as "homologacao" | "producao",
    apiKey: "",
    cnpjEmissor: "",
    inscricaoMunicipal: "",
    certificadoA1Url: "",
    certificadoSenha: "",
    metadataExtra: "",
  });
  const [logoForm, setLogoForm] = useState({ unidadeId: "" as any, logotipoUrl: "" });

  const { data: provedoresNfe } = useQuery<any[]>({
    queryKey: ["provedores-nfe"],
    queryFn: () => fetch("/api/provedores-nfe").then((r) => r.json()),
  });
  const { data: cadastradas } = useQuery<any[]>({
    queryKey: ["credenciais-nfe"],
    queryFn: () => fetch("/api/credenciais/nfe").then((r) => r.json()),
  });
  const { data: unidades } = useQuery<any[]>({
    queryKey: ["unidades-cadastradas"],
    queryFn: () => fetch("/api/unidades").then((r) => r.json()),
  });
  const { data: logos } = useQuery<any[]>({
    queryKey: ["logos-clinicas"],
    queryFn: () => fetch("/api/credenciais/logo").then((r) => r.json()),
  });

  const cadastrarNfe = useMutation({
    mutationFn: async () => {
      let metadata: any = undefined;
      if (form.metadataExtra.trim()) {
        try { metadata = JSON.parse(form.metadataExtra); } catch { throw new Error("Metadata extra precisa ser JSON válido"); }
      }
      const r = await fetch("/api/credenciais/nfe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({
          unidadeId: parseInt(form.unidadeId, 10),
          provedorCodigo: form.provedorCodigo,
          ambiente: form.ambiente,
          apiKey: form.apiKey,
          cnpjEmissor: form.cnpjEmissor || undefined,
          inscricaoMunicipal: form.inscricaoMunicipal || undefined,
          certificadoA1Url: form.certificadoA1Url || undefined,
          certificadoSenha: form.certificadoSenha || undefined,
          metadata,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credenciais-nfe"] });
      setForm((f) => ({ ...f, apiKey: "", certificadoSenha: "" }));
    },
  });

  const salvarLogo = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/credenciais/logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ unidadeId: parseInt(logoForm.unidadeId, 10), logotipoUrl: logoForm.logotipoUrl }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logos-clinicas"] });
      setLogoForm({ unidadeId: "", logotipoUrl: "" });
    },
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <Receipt className="w-7 h-7 text-[#1F4E5F]" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">📜 Credenciais NFe & Logos</h1>
          <p className="text-xs text-muted-foreground">Cadastre Focus NFe / eNotas e o logotipo de cada clínica (puxado pra notas, RAS e receitas)</p>
        </div>
      </header>

      {/* Master Token */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#B8941F]" />
          <div className="flex-1 text-sm">Código master pra cadastrar credenciais e logos</div>
          <Input type="password" placeholder="Master token..." value={adminToken} onChange={(e) => setAdminToken(e.target.value)} className="max-w-xs" data-testid="input-admin-token" />
          <Button size="sm" className="bg-[#B8941F] hover:bg-[#9a7a18]" onClick={() => localStorage.setItem("padcon_admin_token", adminToken)}>Salvar</Button>
        </div>
      </Card>

      {/* Catálogo */}
      <div className="grid grid-cols-2 gap-3">
        {(provedoresNfe ?? []).map((p) => (
          <Card key={p.codigo} className="p-4 border-l-4 border-l-[#1F4E5F]">
            <div className="flex items-center justify-between mb-1">
              <div className="font-bold text-[#1F4E5F]">{p.nome_exibicao}</div>
              {p.recomendado && <Badge className="bg-[#B8941F]/15 text-[#B8941F] border border-[#B8941F]/30">Recomendado</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mb-2">{p.descricao}</div>
            <div className="text-[10px] text-muted-foreground">💸 {p.preco_aproximado_por_nota} • 🌎 {p.cobertura_municipios}</div>
            <a href={p.url_documentacao} target="_blank" rel="noreferrer" className="text-[10px] text-[#1F4E5F] hover:underline">📖 Documentação →</a>
          </Card>
        ))}
      </div>

      {/* Cadastrar credencial NFe */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <h3 className="font-bold text-[#1F4E5F] mb-3 flex items-center gap-2"><KeyRound className="w-4 h-4" />Cadastrar credencial NFe</h3>
        <div className="grid grid-cols-3 gap-2">
          <select className="border border-border rounded px-2 py-1.5 text-sm bg-background" value={form.unidadeId} onChange={(e) => setForm({ ...form, unidadeId: e.target.value })} data-testid="select-unidade">
            <option value="">Unidade...</option>
            {(unidades ?? []).filter((u) => u.id > 7).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <select className="border border-border rounded px-2 py-1.5 text-sm bg-background" value={form.provedorCodigo} onChange={(e) => setForm({ ...form, provedorCodigo: e.target.value as any })} data-testid="select-provedor">
            <option value="focus_nfe">Focus NFe</option>
            <option value="enotas">eNotas</option>
          </select>
          <select className="border border-border rounded px-2 py-1.5 text-sm bg-background" value={form.ambiente} onChange={(e) => setForm({ ...form, ambiente: e.target.value as any })}>
            <option value="homologacao">Homologação</option>
            <option value="producao">Produção</option>
          </select>
          <Input type="password" placeholder="API Key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} data-testid="input-api-key" />
          <Input placeholder="CNPJ emissor" value={form.cnpjEmissor} onChange={(e) => setForm({ ...form, cnpjEmissor: e.target.value })} />
          <Input placeholder="Inscrição municipal" value={form.inscricaoMunicipal} onChange={(e) => setForm({ ...form, inscricaoMunicipal: e.target.value })} />
          <Input placeholder="URL do certificado A1 (opc)" value={form.certificadoA1Url} onChange={(e) => setForm({ ...form, certificadoA1Url: e.target.value })} />
          <Input type="password" placeholder="Senha do certificado (opc)" value={form.certificadoSenha} onChange={(e) => setForm({ ...form, certificadoSenha: e.target.value })} />
          <Input placeholder='Metadata extra JSON (ex: {"empresaId":"abc"})' value={form.metadataExtra} onChange={(e) => setForm({ ...form, metadataExtra: e.target.value })} />
        </div>
        <Button className="mt-3 bg-[#1F4E5F] hover:bg-[#163e4d]" disabled={!form.unidadeId || form.apiKey.length < 8 || cadastrarNfe.isPending} onClick={() => cadastrarNfe.mutate()} data-testid="btn-cadastrar-nfe">
          {cadastrarNfe.isPending ? "Salvando..." : "Salvar credencial NFe"}
        </Button>
        {cadastrarNfe.error && <div className="mt-2 text-xs text-rose-700">{(cadastrarNfe.error as Error).message}</div>}
        {cadastrarNfe.isSuccess && <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Credencial cadastrada.</div>}
      </Card>

      {/* Tabela credenciais NFe */}
      <Card className="overflow-hidden">
        <div className="px-4 py-2 bg-muted/50 text-xs uppercase tracking-widest font-bold text-muted-foreground">Credenciais NFe cadastradas</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Unidade</th>
              <th className="px-3 py-2 text-left">Provedor</th>
              <th className="px-3 py-2 text-center">Ambiente</th>
              <th className="px-3 py-2 text-left">CNPJ</th>
              <th className="px-3 py-2 text-left">API Key</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {(cadastradas ?? []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma credencial ainda.</td></tr>
            ) : (cadastradas ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border" data-testid={`cred-nfe-${c.id}`}>
                <td className="px-3 py-2">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: (c.unidade_cor ?? "#1F4E5F") + "22", color: c.unidade_cor ?? "#1F4E5F" }}>{c.unidade_nome}</span>
                </td>
                <td className="px-3 py-2">{c.provedor_nome}</td>
                <td className="px-3 py-2 text-center text-xs">{c.ambiente}</td>
                <td className="px-3 py-2 text-xs font-mono">{c.cnpj_emissor ?? "—"}</td>
                <td className="px-3 py-2 text-xs font-mono">{c.apiKeyMasked}</td>
                <td className="px-3 py-2 text-center">
                  {c.ativo ? <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">Ativa</Badge> : <Badge variant="outline">Desativada</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Logotipos */}
      <Card className="p-4 border-l-4 border-l-[#A78B5F]">
        <h3 className="font-bold text-[#1F4E5F] mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4" />Logotipo da clínica</h3>
        <p className="text-xs text-muted-foreground mb-3">O logo é puxado automaticamente pras receitas (RAS), notas fiscais e documentos. Cole a URL pública (Drive, S3, CDN).</p>
        <div className="grid grid-cols-3 gap-2">
          <select className="border border-border rounded px-2 py-1.5 text-sm bg-background" value={logoForm.unidadeId} onChange={(e) => setLogoForm({ ...logoForm, unidadeId: e.target.value })} data-testid="select-unidade-logo">
            <option value="">Unidade...</option>
            {(unidades ?? []).filter((u) => u.id > 7).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <Input className="col-span-2" placeholder="https://..." value={logoForm.logotipoUrl} onChange={(e) => setLogoForm({ ...logoForm, logotipoUrl: e.target.value })} data-testid="input-logo-url" />
        </div>
        <Button className="mt-3 bg-[#A78B5F] hover:bg-[#8a724b]" disabled={!logoForm.unidadeId || !logoForm.logotipoUrl || salvarLogo.isPending} onClick={() => salvarLogo.mutate()} data-testid="btn-salvar-logo">
          {salvarLogo.isPending ? "Salvando..." : "Salvar logotipo"}
        </Button>
        {salvarLogo.error && <div className="mt-2 text-xs text-rose-700">{(salvarLogo.error as Error).message}</div>}

        <div className="grid grid-cols-5 gap-3 mt-4">
          {(logos ?? []).map((u: any) => (
            <Card key={u.id} className="p-2 text-center">
              <div className="text-[10px] font-semibold text-[#1F4E5F] truncate">{u.nome}</div>
              {u.logotipo_url ? (
                <img src={u.logotipo_url} alt={u.nome} className="w-full h-16 object-contain mt-1 bg-white rounded border" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-16 mt-1 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">Sem logo</div>
              )}
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
