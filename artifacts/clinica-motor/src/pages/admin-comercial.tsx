import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Save, RefreshCw, Building2, Percent, Tag, ClipboardList, FileText, Package } from "lucide-react";

type AnyRow = Record<string, any> & { id: number };

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "textarea" | "enum";
  enum?: string[];
  width?: string;
  readonly?: boolean;
}

const TABS: Array<{
  id: string;
  label: string;
  icon: any;
  api: string;
  fields: FieldDef[];
  hint: string;
}> = [
  {
    id: "farmacias",
    label: "Farmácias",
    icon: Building2,
    api: "/api/farmacias-parceiras",
    hint: "5 farmácias parceiras (Giroto, Farmadoctor, GrandPharma, Bioathos, Prime). Edite contato e comissão direto.",
    fields: [
      { key: "nome", label: "Nome", type: "text", width: "180px" },
      { key: "cnpj", label: "CNPJ", type: "text", width: "150px" },
      { key: "responsavel", label: "Responsável", type: "text", width: "160px" },
      { key: "email", label: "E-mail", type: "text", width: "180px" },
      { key: "telefone", label: "Telefone", type: "text", width: "130px" },
      { key: "comissaoPercentual", label: "Comissão %", type: "number", width: "90px" },
      { key: "modeloIntegracao", label: "Modelo", type: "enum", enum: ["portal", "marketplace", "drive", "manual"], width: "120px" },
      { key: "ativa", label: "Ativa", type: "boolean", width: "60px" },
      { key: "observacoes", label: "Observações", type: "textarea", width: "260px" },
    ],
  },
  {
    id: "comissoes",
    label: "Comissões",
    icon: Percent,
    api: "/api/comissoes-config",
    hint: "15 regras editáveis. Procedimento, consulta, indicação, produto, venda externa.",
    fields: [
      { key: "chave", label: "Chave", type: "text", width: "180px", readonly: true },
      { key: "rotulo", label: "Rótulo", type: "text", width: "260px" },
      { key: "categoria", label: "Categoria", type: "enum", enum: ["procedimento", "indicacao", "consulta", "produto", "venda_externa"], width: "140px" },
      { key: "percentual", label: "%", type: "number", width: "70px" },
      { key: "ativa", label: "Ativa", type: "boolean", width: "60px" },
      { key: "observacoes", label: "Observações", type: "textarea", width: "320px" },
    ],
  },
  {
    id: "descontos",
    label: "Descontos",
    icon: Tag,
    api: "/api/descontos-config",
    hint: "15 regras editáveis pré-preenchidas por prática de mercado. Forma de pagamento, duração, indicação, campanha.",
    fields: [
      { key: "chave", label: "Chave", type: "text", width: "180px", readonly: true },
      { key: "rotulo", label: "Rótulo", type: "text", width: "260px" },
      { key: "tipo", label: "Tipo", type: "enum", enum: ["forma_pagamento", "duracao_tratamento", "indicacao", "campanha"], width: "150px" },
      { key: "percentual", label: "%", type: "number", width: "70px" },
      { key: "duracaoMeses", label: "Meses", type: "number", width: "70px" },
      { key: "ativa", label: "Ativa", type: "boolean", width: "60px" },
      { key: "observacoes", label: "Observações", type: "textarea", width: "320px" },
    ],
  },
  {
    id: "planos",
    label: "Planos Consulta",
    icon: Package,
    api: "/api/planos-consulta-config",
    hint: "4 planos: Premium R$15k → Basic R$1.5k. Edite preços, descrição e participação do Caio.",
    fields: [
      { key: "chave", label: "Chave", type: "text", width: "120px", readonly: true },
      { key: "nome", label: "Nome", type: "text", width: "260px" },
      { key: "precoPresencial", label: "Presencial R$", type: "number", width: "110px" },
      { key: "precoOnline", label: "Online R$", type: "number", width: "100px" },
      { key: "envolveCaioInicio", label: "Caio início", type: "boolean", width: "80px" },
      { key: "envolveCaioContinuidade", label: "Caio cont.", type: "boolean", width: "80px" },
      { key: "ativa", label: "Ativa", type: "boolean", width: "60px" },
      { key: "ordem", label: "Ordem", type: "number", width: "60px" },
      { key: "descricao", label: "Descrição", type: "textarea", width: "340px" },
    ],
  },
  {
    id: "anamnese",
    label: "Anamnese (6Q)",
    icon: ClipboardList,
    api: "/api/anamnese-validacao-template",
    hint: "6 perguntas de validação pós-triagem (10-15 min). Médico só confirma o que paciente já marcou.",
    fields: [
      { key: "ordem", label: "#", type: "number", width: "50px" },
      { key: "chave", label: "Chave", type: "text", width: "200px", readonly: true },
      { key: "pergunta", label: "Pergunta", type: "textarea", width: "380px" },
      { key: "tipoResposta", label: "Tipo", type: "enum", enum: ["confirmacao", "texto_curto", "escala_1_10", "multipla_escolha", "assinatura"], width: "130px" },
      { key: "obrigatoria", label: "Obrig.", type: "boolean", width: "60px" },
      { key: "ativa", label: "Ativa", type: "boolean", width: "60px" },
      { key: "ajuda", label: "Ajuda", type: "textarea", width: "300px" },
    ],
  },
  {
    id: "termos",
    label: "Termos jurídicos",
    icon: FileText,
    api: "/api/termos-consentimento",
    hint: "2 termos: consentimento de protocolo (verbal+escrito) e LGPD. Edite o texto a qualquer momento.",
    fields: [
      { key: "chave", label: "Chave", type: "text", width: "240px", readonly: true },
      { key: "versao", label: "Versão", type: "text", width: "80px" },
      { key: "titulo", label: "Título", type: "text", width: "320px" },
      { key: "exigeAssinaturaEscrita", label: "Escrito", type: "boolean", width: "70px" },
      { key: "exigeConfirmacaoVerbal", label: "Verbal", type: "boolean", width: "70px" },
      { key: "ativo", label: "Ativo", type: "boolean", width: "60px" },
      { key: "textoConsentimento", label: "Texto", type: "textarea", width: "520px" },
    ],
  },
];

function FieldEditor({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  const baseStyle = "w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none";
  if (field.readonly) {
    return <div className="px-2 py-1 text-slate-400 text-xs font-mono">{value ?? "—"}</div>;
  }
  if (field.type === "boolean") {
    return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-cyan-500" />;
  }
  if (field.type === "number") {
    return <input type="number" step="0.01" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className={baseStyle} />;
  }
  if (field.type === "enum") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={baseStyle}>
        {field.enum!.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.type === "textarea") {
    return <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={2} className={baseStyle + " font-sans"} />;
  }
  return <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={baseStyle} />;
}

export default function AdminComercialPage() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dirty, setDirty] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(activeTab.api);
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
      setDirty({});
    } catch (err: any) {
      setFeedback("Erro ao carregar: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const updateField = (id: number, key: string, val: any) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
    setDirty((d) => ({ ...d, [id]: true }));
  };

  const saveRow = async (row: AnyRow) => {
    setSaving((s) => ({ ...s, [row.id]: true }));
    try {
      const { id, criadoEm, atualizadoEm, ...payload } = row;
      const r = await fetch(`${activeTab.api}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      setDirty((d) => { const nd = { ...d }; delete nd[id]; return nd; });
      setFeedback(`✓ Salvo #${id}`);
      setTimeout(() => setFeedback(""), 2500);
    } catch (err: any) {
      setFeedback("Erro: " + err.message);
    } finally {
      setSaving((s) => { const ns = { ...s }; delete ns[row.id]; return ns; });
    }
  };

  return (
    <Layout>
      <div className="p-6 bg-slate-950 min-h-screen text-slate-100">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-300 mb-1">Admin Comercial</h1>
          <p className="text-slate-400 text-sm">Tudo editável. Toda mudança é salva linha a linha (botão Salvar aparece quando você altera).</p>
        </div>

        <div className="flex gap-2 border-b border-slate-800 mb-4 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.id === activeTab.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t)}
                className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap border-b-2 transition ${active ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200"}`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="text-slate-400 text-xs">{activeTab.hint}</div>
          <div className="flex items-center gap-3">
            {feedback && <span className="text-cyan-300 text-xs">{feedback}</span>}
            <button onClick={load} disabled={loading} className="flex items-center gap-1 text-xs text-slate-300 hover:text-cyan-300">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Recarregar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 text-slate-300 text-xs uppercase">
              <tr>
                {activeTab.fields.map((f) => (
                  <th key={f.key} className="px-2 py-2 text-left font-medium" style={{ width: f.width }}>{f.label}</th>
                ))}
                <th className="px-2 py-2 text-left font-medium w-24">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={activeTab.fields.length + 1} className="px-4 py-8 text-center text-slate-500">Nenhum registro.</td></tr>
              )}
              {rows.map((row) => {
                const isDirty = !!dirty[row.id];
                const isSaving = !!saving[row.id];
                return (
                  <tr key={row.id} className={`border-t border-slate-800 ${isDirty ? "bg-amber-950/30" : "hover:bg-slate-800/30"}`}>
                    {activeTab.fields.map((f) => (
                      <td key={f.key} className="px-2 py-2 align-top" style={{ width: f.width }}>
                        <FieldEditor field={f} value={row[f.key]} onChange={(v) => updateField(row.id, f.key, v)} />
                      </td>
                    ))}
                    <td className="px-2 py-2 align-top">
                      <button
                        onClick={() => saveRow(row)}
                        disabled={!isDirty || isSaving}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${isDirty ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}
                      >
                        <Save size={12} /> {isSaving ? "..." : "Salvar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          Endpoints: <code className="text-cyan-400">{activeTab.api}</code> · {rows.length} registro(s)
        </div>
      </div>
    </Layout>
  );
}
