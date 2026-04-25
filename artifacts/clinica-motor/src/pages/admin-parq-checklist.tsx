// PAWARDS MEDCORE · Wave 9 PARQ · Checklist da visita Kaizen bimestral
// Rota /admin/parq/visita/:id (master-only)
// 5 categorias × N items (nota 1-5) → conclui visita ou abre planos Kaizen
import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import {
  ClipboardCheck,
  Save,
  XCircle,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const GREEN = "#16a34a";
const RED = "#dc2626";

type Categoria =
  | "insumos"
  | "processamento"
  | "atendimento"
  | "entrega"
  | "qualidade_geral";

type Item = {
  categoria: Categoria;
  item_codigo: string;
  item_descricao: string;
  nota: number;
  observacao: string;
};

const CATEGORIAS: Array<{ key: Categoria; label: string; cor: string }> = [
  { key: "insumos", label: "Insumos / Matéria-prima", cor: "#0EA5E9" },
  { key: "processamento", label: "Processamento", cor: "#8B5CF6" },
  { key: "atendimento", label: "Atendimento ao Paciente", cor: "#F59E0B" },
  { key: "entrega", label: "Entrega / Logística", cor: "#10B981" },
  { key: "qualidade_geral", label: "Qualidade Geral", cor: "#C89B3C" },
];

const ITEMS_DEFAULT: Item[] = [
  {
    categoria: "insumos",
    item_codigo: "INS-01",
    item_descricao: "Validade dos insumos (sem itens vencidos)",
    nota: 5,
    observacao: "",
  },
  {
    categoria: "insumos",
    item_codigo: "INS-02",
    item_descricao: "Procedência rastreável (lote/fornecedor)",
    nota: 5,
    observacao: "",
  },
  {
    categoria: "processamento",
    item_codigo: "PROC-01",
    item_descricao: "Boas práticas de manipulação (BPM-RDC 67)",
    nota: 5,
    observacao: "",
  },
  {
    categoria: "processamento",
    item_codigo: "PROC-02",
    item_descricao: "Equipamentos calibrados",
    nota: 5,
    observacao: "",
  },
  {
    categoria: "atendimento",
    item_codigo: "ATD-01",
    item_descricao: "Tempo médio de atendimento aceitável",
    nota: 5,
    observacao: "",
  },
  {
    categoria: "atendimento",
    item_codigo: "ATD-02",
    item_descricao: "Cordialidade e clareza com paciente",
    nota: 5,
    observacao: "",
  },
  {
    categoria: "entrega",
    item_codigo: "ENT-01",
    item_descricao: "Prazo de entrega cumprido (até 5 dias úteis)",
    nota: 5,
    observacao: "",
  },
  {
    categoria: "entrega",
    item_codigo: "ENT-02",
    item_descricao: "Embalagem íntegra e identificada",
    nota: 5,
    observacao: "",
  },
  {
    categoria: "qualidade_geral",
    item_codigo: "QUA-01",
    item_descricao: "Limpeza e organização das instalações",
    nota: 5,
    observacao: "",
  },
  {
    categoria: "qualidade_geral",
    item_codigo: "QUA-02",
    item_descricao: "EPIs e protocolos sanitários respeitados",
    nota: 5,
    observacao: "",
  },
];

function notaCor(n: number) {
  if (n >= 4.5) return "#16a34a";
  if (n >= 3.5) return "#65a30d";
  if (n >= 2.5) return "#d97706";
  return "#dc2626";
}

export default function AdminParqChecklist() {
  const params = useParams();
  const [, navigate] = useLocation();
  const visitaId = Number((params as any).id);

  const [items, setItems] = useState<Item[]>(ITEMS_DEFAULT);
  const [obsGeral, setObsGeral] = useState("");
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");

  const setNota = useCallback((codigo: string, nota: number) => {
    setItems((prev) =>
      prev.map((i) => (i.item_codigo === codigo ? { ...i, nota } : i)),
    );
  }, []);

  const setObs = useCallback((codigo: string, observacao: string) => {
    setItems((prev) =>
      prev.map((i) => (i.item_codigo === codigo ? { ...i, observacao } : i)),
    );
  }, []);

  const mediaCategoria = (cat: Categoria) => {
    const itens = items.filter((i) => i.categoria === cat);
    if (!itens.length) return 0;
    return itens.reduce((s, i) => s + i.nota, 0) / itens.length;
  };

  const mediaGeral =
    items.reduce((s, i) => s + i.nota, 0) / Math.max(items.length, 1);

  async function concluir() {
    if (!visitaId) {
      setMsg("Erro: id de visita inválido");
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const r = await fetch("/api/parq/visitas/concluir", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visita_id: visitaId,
          itens: items,
          observacao_geral: obsGeral,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "erro concluir");
      setMsg(
        `✓ Visita concluída · média ${j.media_qualidade?.toFixed(2) ?? mediaGeral.toFixed(2)}/5.0 · novo status: ${j.novo_status ?? "—"}`,
      );
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setWorking(false);
    }
  }

  async function reprovar() {
    if (!visitaId) return;
    if (!obsGeral) {
      setMsg("Reprovar requer motivo na observação geral.");
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const r = await fetch("/api/parq/visitas/reprovar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visita_id: visitaId, motivo: obsGeral }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "erro reprovar");
      setMsg("✓ Visita reprovada · acordo suspenso");
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto" data-testid="page-parq-checklist">
        <button
          onClick={() => navigate("/admin/parq")}
          className="flex items-center gap-2 text-sm text-gray-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Parcerias
        </button>

        <div className="flex items-center gap-3 mb-2">
          <ClipboardCheck className="w-8 h-8" style={{ color: GOLD }} />
          <h1
            className="text-3xl font-bold"
            style={{ color: NAVY, fontFamily: "Times New Roman, serif" }}
          >
            Checklist Kaizen · Visita #{visitaId || "—"}
          </h1>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          5 categorias · 10 itens · nota 1-5 cada · Notas &lt; 4.0 geram plano
          de ação Kaizen com prazo limite definido.
        </p>

        {msg && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{
              background: msg.startsWith("✓") ? "#F0FDF4" : "#FEF2F2",
              color: msg.startsWith("✓") ? GREEN : RED,
            }}
            data-testid="msg-checklist"
          >
            {msg}
          </div>
        )}

        {/* Resumo médias */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
          <div className="border rounded-lg p-3 bg-white col-span-1">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Média Geral
            </div>
            <div
              className="text-2xl font-bold"
              style={{ color: notaCor(mediaGeral) }}
              data-testid="media-geral"
            >
              {mediaGeral.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">/ 5.00</div>
          </div>
          {CATEGORIAS.map((c) => {
            const m = mediaCategoria(c.key);
            return (
              <div
                key={c.key}
                className="border rounded-lg p-3 bg-white"
                style={{ borderTop: `3px solid ${c.cor}` }}
              >
                <div className="text-xs text-gray-500">{c.label}</div>
                <div
                  className="text-xl font-bold"
                  style={{ color: notaCor(m) }}
                >
                  {m.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Items por categoria */}
        {CATEGORIAS.map((cat) => {
          const itens = items.filter((i) => i.categoria === cat.key);
          return (
            <div
              key={cat.key}
              className="border rounded-xl bg-white mb-4 overflow-hidden"
            >
              <div
                className="px-4 py-2 border-b font-bold text-white"
                style={{ background: cat.cor }}
              >
                {cat.label}
              </div>
              <div className="divide-y">
                {itens.map((i) => (
                  <div
                    key={i.item_codigo}
                    className="px-4 py-3 grid grid-cols-12 gap-2 items-center"
                    data-testid={`item-${i.item_codigo}`}
                  >
                    <div className="col-span-6 text-sm">
                      <span className="font-mono text-xs text-gray-400 mr-2">
                        {i.item_codigo}
                      </span>
                      {i.item_descricao}
                    </div>
                    <div className="col-span-2 flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setNota(i.item_codigo, n)}
                          className="w-7 h-7 rounded text-xs font-bold border"
                          style={{
                            background: i.nota === n ? notaCor(n) : "#fff",
                            color: i.nota === n ? "#fff" : "#374151",
                            borderColor:
                              i.nota === n ? notaCor(n) : "#e5e7eb",
                          }}
                          data-testid={`nota-${i.item_codigo}-${n}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={i.observacao}
                      onChange={(e) => setObs(i.item_codigo, e.target.value)}
                      placeholder="Observação (opcional)"
                      className="col-span-4 px-2 py-1 text-xs border rounded"
                      data-testid={`obs-${i.item_codigo}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Observação geral + ações */}
        <div className="border rounded-xl bg-white p-4 mt-4">
          <label className="block text-sm font-semibold mb-2" style={{ color: NAVY }}>
            Observação geral / motivo (obrigatório se reprovar)
          </label>
          <textarea
            value={obsGeral}
            onChange={(e) => setObsGeral(e.target.value)}
            rows={3}
            className="w-full p-3 border rounded-lg text-sm"
            placeholder="Comentários gerais sobre a visita..."
            data-testid="textarea-obs-geral"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              disabled={working}
              onClick={() => void reprovar()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border disabled:opacity-50"
              style={{ borderColor: RED, color: RED }}
              data-testid="btn-reprovar"
            >
              <XCircle className="w-4 h-4" /> Reprovar visita
            </button>
            <button
              disabled={working}
              onClick={() => void concluir()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: NAVY }}
              data-testid="btn-concluir"
            >
              <Save className="w-4 h-4" />
              {working ? "Salvando..." : "Concluir visita"}
            </button>
          </div>
        </div>

        <div
          className="mt-6 p-3 rounded text-xs flex items-start gap-2"
          style={{ background: "#FEF3C7", color: "#92400E" }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div>
            Itens com nota &lt; 4 geram automaticamente um plano de ação Kaizen.
            A média da visita determina o novo status da farmácia (Gold ≥ 4.5,
            Silver ≥ 3.5, Bronze ≥ 2.5, EmCorreção &lt; 2.5).
          </div>
        </div>
      </div>
    </Layout>
  );
}
