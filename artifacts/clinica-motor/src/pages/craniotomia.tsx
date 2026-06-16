// ══════════════════════════════════════════════════════════════════════
// CRANIOTOMIA — editor REAL do MOTOR CLINICO (grafo de sinapses).
//
// Cada linha = uma regra de `regras_motor` (tabela GLOBAL, base Genesis):
// uma sinapse "SE (pergunta + palavra-chave da anamnese) ENTAO (item
// terapeutico do segmento)". Ate 16/06/2026 esta tela era um iframe de
// mockup com dados estaticos; agora le e grava de verdade via API:
//   GET   /api/motor-clinico/regras
//   POST  /api/motor-clinico/regras
//   PATCH /api/motor-clinico/regras/:id
//
// Escopo GLOBAL: alterar aqui propaga a todas as unidades que herdam do
// Genesis (ID 14). Sem unidade_id porque o motor e a base comum.
// ══════════════════════════════════════════════════════════════════════
import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ensureArray } from "@/lib/api-fetch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Activity, Plus, Power, PowerOff, Pencil, Search, ArrowRight, AlertTriangle,
} from "lucide-react";

// ── Paleta PENUMBRA (face escura Navy Ciano) ─────────────────────────
const PW = {
  bg: "#0B1220",
  panel: "#111B2E",
  panelAlt: "#0E1726",
  border: "#1E2A3F",
  borderNeon: "rgba(56,189,248,0.35)",
  ciano: "#38BDF8",
  gold: "#D4AF37",
  text: "#E5EAF2",
  muted: "#8193AB",
  red: "#EF4444",
};

type Segmento = "exame" | "formula" | "injetavel" | "implante" | "protocolo";
type Prioridade = "baixa" | "media" | "alta" | "urgente";

interface Regra {
  id: number;
  regraId: string;
  perguntaId: string;
  palavraChave: string;
  segmento: Segmento;
  codigoReferencia: string | null;
  blocoReferencia: string | null;
  prioridade: Prioridade;
  observacao: string | null;
  ativo: string; // "SIM" | "NAO"
  criadoEm: string;
  itemNome: string | null;
  itemCategoria: string | null;
}

const SEGMENTO_LABEL: Record<Segmento, string> = {
  exame: "EXAME",
  formula: "FORMULA",
  injetavel: "INJETAVEL",
  implante: "IMPLANTE",
  protocolo: "PROTOCOLO",
};

const SEGMENTO_COR: Record<Segmento, string> = {
  exame: "#38BDF8",
  formula: "#34D399",
  injetavel: "#A78BFA",
  implante: "#F59E0B",
  protocolo: "#F472B6",
};

const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: "BAIXA",
  media: "MEDIA",
  alta: "ALTA",
  urgente: "URGENTE",
};

const PRIORIDADE_COR: Record<Prioridade, string> = {
  baixa: "#8193AB",
  media: "#38BDF8",
  alta: "#F59E0B",
  urgente: "#EF4444",
};

const SEGMENTOS: Segmento[] = ["exame", "formula", "injetavel", "implante", "protocolo"];
const PRIORIDADES: Prioridade[] = ["baixa", "media", "alta", "urgente"];

// ── Form de criar / editar sinapse ───────────────────────────────────
interface FormState {
  regraId: string;
  perguntaId: string;
  palavraChave: string;
  segmento: Segmento;
  codigoReferencia: string;
  blocoReferencia: string;
  prioridade: Prioridade;
  observacao: string;
  ativo: "SIM" | "NAO";
}

function formVazio(): FormState {
  return {
    regraId: "",
    perguntaId: "",
    palavraChave: "",
    segmento: "exame",
    codigoReferencia: "",
    blocoReferencia: "",
    prioridade: "media",
    observacao: "",
    ativo: "SIM",
  };
}

function regraParaForm(r: Regra): FormState {
  return {
    regraId: r.regraId,
    perguntaId: r.perguntaId,
    palavraChave: r.palavraChave,
    segmento: r.segmento,
    codigoReferencia: r.codigoReferencia ?? "",
    blocoReferencia: r.blocoReferencia ?? "",
    prioridade: r.prioridade,
    observacao: r.observacao ?? "",
    ativo: (r.ativo === "NAO" ? "NAO" : "SIM"),
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: PW.panelAlt,
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.text,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "'JetBrains Mono', monospace",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: PW.muted,
  marginBottom: 4,
  fontWeight: 700,
};

function RegraFormDialog({
  open,
  onOpenChange,
  regra,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  regra: Regra | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!regra;
  const [form, setForm] = useState<FormState>(regra ? regraParaForm(regra) : formVazio());

  // Re-sincroniza o form quando muda a regra alvo (abrir editar/criar).
  useMemo(() => {
    setForm(regra ? regraParaForm(regra) : formVazio());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regra, open]);

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        regraId: form.regraId.trim(),
        perguntaId: form.perguntaId.trim(),
        palavraChave: form.palavraChave.trim(),
        segmento: form.segmento,
        codigoReferencia: form.codigoReferencia.trim() || null,
        blocoReferencia: form.blocoReferencia.trim() || null,
        prioridade: form.prioridade,
        observacao: form.observacao.trim() || null,
        ativo: form.ativo,
      };
      const url = isEdit
        ? `/api/motor-clinico/regras/${regra!.id}`
        : "/api/motor-clinico/regras";
      const r = await apiFetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => null);
        throw new Error(e?.error || `Falha ao salvar (HTTP ${r.status})`);
      }
      return r.json();
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "Sinapse atualizada" : "Sinapse criada",
        description: "Regra gravada no motor clinico.",
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const podeSalvar =
    form.regraId.trim() && form.perguntaId.trim() && form.palavraChave.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          background: PW.panel,
          border: `1px solid ${PW.borderNeon}`,
          borderRadius: 0,
          color: PW.text,
          maxWidth: 640,
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: 15,
              color: PW.gold,
            }}
          >
            {isEdit ? `Editar sinapse · ${regra!.regraId}` : "Nova sinapse"}
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Codigo da regra</label>
            <input
              style={inputStyle}
              value={form.regraId}
              placeholder="R001"
              onChange={(e) => setForm({ ...form, regraId: e.target.value })}
              data-testid="input-regraId"
            />
          </div>
          <div>
            <label style={labelStyle}>Pergunta (anamnese)</label>
            <input
              style={inputStyle}
              value={form.perguntaId}
              placeholder="Q012"
              onChange={(e) => setForm({ ...form, perguntaId: e.target.value })}
              data-testid="input-perguntaId"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>SE — palavra-chave do paciente</label>
            <input
              style={inputStyle}
              value={form.palavraChave}
              placeholder="FADIGA"
              onChange={(e) => setForm({ ...form, palavraChave: e.target.value })}
              data-testid="input-palavraChave"
            />
          </div>
          <div>
            <label style={labelStyle}>ENTAO — segmento</label>
            <select
              style={inputStyle}
              value={form.segmento}
              onChange={(e) => setForm({ ...form, segmento: e.target.value as Segmento })}
              data-testid="select-segmento"
            >
              {SEGMENTOS.map((s) => (
                <option key={s} value={s} style={{ background: PW.panelAlt }}>
                  {SEGMENTO_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Codigo do item (PADCOM)</label>
            <input
              style={inputStyle}
              value={form.codigoReferencia}
              placeholder="opcional — liga ao item terapeutico"
              onChange={(e) => setForm({ ...form, codigoReferencia: e.target.value })}
              data-testid="input-codigoReferencia"
            />
          </div>
          <div>
            <label style={labelStyle}>Bloco de referencia</label>
            <input
              style={inputStyle}
              value={form.blocoReferencia}
              placeholder="opcional"
              onChange={(e) => setForm({ ...form, blocoReferencia: e.target.value })}
              data-testid="input-blocoReferencia"
            />
          </div>
          <div>
            <label style={labelStyle}>Prioridade</label>
            <select
              style={inputStyle}
              value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: e.target.value as Prioridade })}
              data-testid="select-prioridade"
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p} style={{ background: PW.panelAlt }}>
                  {PRIORIDADE_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Observacao</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              value={form.observacao}
              placeholder="opcional"
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              data-testid="input-observacao"
            />
          </div>
          <div>
            <label style={labelStyle}>Estado</label>
            <select
              style={inputStyle}
              value={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.value as "SIM" | "NAO" })}
              data-testid="select-ativo"
            >
              <option value="SIM" style={{ background: PW.panelAlt }}>ATIVA</option>
              <option value="NAO" style={{ background: PW.panelAlt }}>PAUSADA</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              height: 36, padding: "0 14px", border: `1px solid ${PW.border}`,
              background: "transparent", color: PW.muted, borderRadius: 0,
              fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
              fontWeight: 700, cursor: "pointer",
            }}
            data-testid="btn-cancelar"
          >
            Cancelar
          </button>
          <button
            disabled={!podeSalvar || salvar.isPending}
            onClick={() => salvar.mutate()}
            style={{
              height: 36, padding: "0 16px",
              border: `1px solid ${PW.ciano}`,
              background: podeSalvar ? "rgba(56,189,248,0.16)" : "transparent",
              color: podeSalvar ? PW.ciano : PW.muted,
              borderRadius: 0, fontSize: 11, textTransform: "uppercase",
              letterSpacing: "0.06em", fontWeight: 700,
              cursor: podeSalvar ? "pointer" : "not-allowed",
              opacity: salvar.isPending ? 0.6 : 1,
            }}
            data-testid="btn-salvar-regra"
          >
            {salvar.isPending ? "Gravando..." : isEdit ? "Salvar" : "Criar sinapse"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── KPI compacto ─────────────────────────────────────────────────────
function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: number | string; cor: string }) {
  return (
    <div
      style={{
        background: PW.panel,
        border: `1px solid ${PW.border}`,
        borderLeft: `3px solid ${cor}`,
        padding: "10px 14px",
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: PW.muted, fontWeight: 700 }}>
        {rotulo}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>
        {valor}
      </div>
    </div>
  );
}

export default function CraniotomiaPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroSegmento, setFiltroSegmento] = useState<"" | Segmento>("");
  const [filtroAtivo, setFiltroAtivo] = useState<"" | "SIM" | "NAO">("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [regraEditando, setRegraEditando] = useState<Regra | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["motor-regras"],
    queryFn: async () => {
      const r = await apiFetch("/api/motor-clinico/regras");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return ensureArray<Regra>(await r.json());
    },
  });

  const regras = useMemo(() => data ?? [], [data]);

  const toggle = useMutation({
    mutationFn: async (regra: Regra) => {
      const novoAtivo = regra.ativo === "SIM" ? "NAO" : "SIM";
      const r = await apiFetch(`/api/motor-clinico/regras/${regra.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: novoAtivo }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => null);
        throw new Error(e?.error || `Falha (HTTP ${r.status})`);
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motor-regras"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "Erro ao alternar estado",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return regras.filter((r) => {
      if (filtroSegmento && r.segmento !== filtroSegmento) return false;
      if (filtroAtivo && r.ativo !== filtroAtivo) return false;
      if (!termo) return true;
      return (
        r.regraId.toLowerCase().includes(termo) ||
        r.perguntaId.toLowerCase().includes(termo) ||
        r.palavraChave.toLowerCase().includes(termo) ||
        (r.itemNome ?? "").toLowerCase().includes(termo) ||
        (r.codigoReferencia ?? "").toLowerCase().includes(termo)
      );
    });
  }, [regras, busca, filtroSegmento, filtroAtivo]);

  const resumo = useMemo(() => {
    const ativas = regras.filter((r) => r.ativo === "SIM").length;
    const porSegmento: Record<string, number> = {};
    regras.forEach((r) => {
      porSegmento[r.segmento] = (porSegmento[r.segmento] ?? 0) + 1;
    });
    return { total: regras.length, ativas, pausadas: regras.length - ativas, porSegmento };
  }, [regras]);

  const abrirNova = () => {
    setRegraEditando(null);
    setDialogAberto(true);
  };
  const abrirEditar = (r: Regra) => {
    setRegraEditando(r);
    setDialogAberto(true);
  };

  const btnFiltro = (ativo: boolean): React.CSSProperties => ({
    height: 34, padding: "0 12px", borderRadius: 0,
    border: `1px solid ${ativo ? PW.ciano : PW.border}`,
    background: ativo ? "rgba(56,189,248,0.16)" : "transparent",
    color: ativo ? PW.ciano : PW.muted,
    fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em",
    fontWeight: 700, cursor: "pointer",
  });

  return (
    <Layout>
      <div
        style={{
          minHeight: "calc(100vh - 96px)",
          background: PW.bg,
          color: PW.text,
          fontFamily: "'JetBrains Mono', monospace",
          padding: 16,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16, borderBottom: `1px solid ${PW.border}`, paddingBottom: 12, marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Activity style={{ width: 22, height: 22, color: PW.ciano }} />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                Craniotomia — Motor Clinico
              </h1>
              <p style={{ fontSize: 11, color: PW.muted, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                Escopo <strong style={{ color: PW.gold }}>GLOBAL</strong> · base que serve todas as clinicas (heranca Genesis ID 14)
              </p>
            </div>
          </div>
          <button
            onClick={abrirNova}
            style={{
              height: 38, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6,
              border: `1px solid ${PW.gold}`, background: "rgba(212,175,55,0.14)", color: PW.gold,
              borderRadius: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
              fontWeight: 700, cursor: "pointer",
            }}
            data-testid="btn-nova-sinapse"
          >
            <Plus style={{ width: 15, height: 15 }} />
            Nova sinapse
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <Kpi rotulo="Total sinapses" valor={resumo.total} cor={PW.ciano} />
          <Kpi rotulo="Ativas" valor={resumo.ativas} cor="#34D399" />
          <Kpi rotulo="Pausadas" valor={resumo.pausadas} cor={PW.muted} />
          {SEGMENTOS.map((s) => (
            <Kpi key={s} rotulo={SEGMENTO_LABEL[s]} valor={resumo.porSegmento[s] ?? 0} cor={SEGMENTO_COR[s]} />
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <Search style={{ width: 14, height: 14, color: PW.muted, position: "absolute", left: 10, top: 10 }} />
            <input
              style={{ ...inputStyle, paddingLeft: 30, height: 34 }}
              placeholder="Buscar por regra, pergunta, palavra-chave ou item..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              data-testid="input-busca"
            />
          </div>
          <button style={btnFiltro(filtroSegmento === "")} onClick={() => setFiltroSegmento("")} data-testid="filtro-seg-todos">
            Todos segmentos
          </button>
          {SEGMENTOS.map((s) => (
            <button
              key={s}
              style={btnFiltro(filtroSegmento === s)}
              onClick={() => setFiltroSegmento(filtroSegmento === s ? "" : s)}
              data-testid={`filtro-seg-${s}`}
            >
              {SEGMENTO_LABEL[s]}
            </button>
          ))}
          <button style={btnFiltro(filtroAtivo === "SIM")} onClick={() => setFiltroAtivo(filtroAtivo === "SIM" ? "" : "SIM")} data-testid="filtro-ativas">
            So ativas
          </button>
          <button style={btnFiltro(filtroAtivo === "NAO")} onClick={() => setFiltroAtivo(filtroAtivo === "NAO" ? "" : "NAO")} data-testid="filtro-pausadas">
            So pausadas
          </button>
        </div>

        {/* CORPO */}
        {isLoading && (
          <div style={{ padding: 40, textAlign: "center", color: PW.muted, fontSize: 13 }}>
            Carregando grafo do motor...
          </div>
        )}

        {isError && (
          <div style={{ padding: 24, border: `1px solid ${PW.red}`, color: PW.red, display: "flex", gap: 10, alignItems: "center" }}>
            <AlertTriangle style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 13 }}>
              Falha ao ler as regras do motor.
            </span>
            <button onClick={() => refetch()} style={{ ...btnFiltro(false), height: 30 }}>Tentar de novo</button>
          </div>
        )}

        {!isLoading && !isError && filtradas.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: PW.muted, border: `1px dashed ${PW.border}` }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              {regras.length === 0
                ? "Nenhuma regra cadastrada no motor ainda."
                : "Nenhuma sinapse bate com os filtros."}
            </div>
            {regras.length === 0 && (
              <button onClick={abrirNova} style={{ ...btnFiltro(true), height: 34, marginTop: 8 }}>
                Criar a primeira sinapse
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && filtradas.length > 0 && (
          <div style={{ border: `1px solid ${PW.border}`, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: PW.panelAlt }}>
                  {["Regra", "SE (anamnese)", "", "ENTAO (acao terapeutica)", "Prioridade", "Estado", "Acoes"].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: i === 2 ? "center" : "left",
                        padding: "8px 10px", color: PW.muted, fontSize: 10,
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        borderBottom: `1px solid ${PW.border}`, fontWeight: 700, whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((r) => {
                  const ativa = r.ativo === "SIM";
                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: `1px solid ${PW.border}`, opacity: ativa ? 1 : 0.55 }}
                      data-testid={`linha-regra-${r.id}`}
                    >
                      <td style={{ padding: "8px 10px", color: PW.gold, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {r.regraId}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ color: PW.text, fontWeight: 700 }}>{r.palavraChave}</div>
                        <div style={{ color: PW.muted, fontSize: 10 }}>
                          pergunta {r.perguntaId}{r.blocoReferencia ? ` · bloco ${r.blocoReferencia}` : ""}
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <ArrowRight style={{ width: 16, height: 16, color: PW.ciano }} />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span
                          style={{
                            display: "inline-block", padding: "1px 6px", fontSize: 9, fontWeight: 800,
                            border: `1px solid ${SEGMENTO_COR[r.segmento]}`, color: SEGMENTO_COR[r.segmento],
                            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3,
                          }}
                        >
                          {SEGMENTO_LABEL[r.segmento]}
                        </span>
                        <div style={{ color: PW.text }}>
                          {r.itemNome || (
                            <span style={{ color: PW.muted, fontStyle: "italic" }}>
                              {r.codigoReferencia ? `cod. ${r.codigoReferencia} (sem item vinculado)` : "sem item vinculado"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                        <span style={{ color: PRIORIDADE_COR[r.prioridade], fontWeight: 700 }}>
                          {PRIORIDADE_LABEL[r.prioridade]}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                        <span style={{ color: ativa ? "#34D399" : PW.muted, fontWeight: 700 }}>
                          {ativa ? "ATIVA" : "PAUSADA"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => toggle.mutate(r)}
                            disabled={toggle.isPending}
                            title={ativa ? "Pausar sinapse" : "Ativar sinapse"}
                            style={{
                              width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center",
                              border: `1px solid ${ativa ? PW.border : "#34D399"}`, borderRadius: 0,
                              background: "transparent", color: ativa ? PW.muted : "#34D399", cursor: "pointer",
                            }}
                            data-testid={`btn-toggle-${r.id}`}
                          >
                            {ativa ? <PowerOff style={{ width: 14, height: 14 }} /> : <Power style={{ width: 14, height: 14 }} />}
                          </button>
                          <button
                            onClick={() => abrirEditar(r)}
                            title="Editar sinapse"
                            style={{
                              width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center",
                              border: `1px solid ${PW.border}`, borderRadius: 0,
                              background: "transparent", color: PW.ciano, cursor: "pointer",
                            }}
                            data-testid={`btn-editar-${r.id}`}
                          >
                            <Pencil style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* RODAPE */}
        <div style={{ marginTop: 12, fontSize: 10, color: PW.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Mostrando {filtradas.length} de {resumo.total} sinapses · alteracoes propagam a todas as unidades que herdam do Genesis (ID 14).
        </div>
      </div>

      <RegraFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        regra={regraEditando}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["motor-regras"] })}
      />
    </Layout>
  );
}
