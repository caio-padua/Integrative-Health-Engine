// PRESCRIÇÃO RÁPIDA — atalho sem anamnese.
// Caio (CEO) precisa emitir receita pra paciente real direto, sem
// passar pelo questionário de anamnese. Fluxo: busca paciente →
// escolhe farmácia destino → adiciona N ativos (autocomplete via
// catálogo substancias) → emite → abre PDFs + envia link wa.me
// pro WhatsApp da paciente (sem ZapSign, sem comissão por enquanto).
//
// API usada:
//   GET    /api/farmacias-disponiveis        → dropdown farmácia
//   GET    /api/substancias?search=          → autocomplete ativo
//   GET    /api/pacientes?busca=             → busca paciente
//   POST   /api/prescricoes                  → cria rascunho
//   POST   /api/prescricoes/:id/blocos       → adiciona bloco com ativos
//   POST   /api/prescricoes/:id/emitir       → gera PDFs agrupados
//   GET    /api/prescricoes/:id/pdfs         → lista PDFs emitidos
//   GET    /api/prescricoes/pdfs/:id/download (abrir via apiFetch)

import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { apiFetch, abrirPdfAutenticado, ensureArray } from "@/lib/api-fetch";
import { useToast } from "@/hooks/use-toast";

const tk = {
  bg: "#0B1220",
  bgAlt: "#111B2E",
  bgSoft: "#1A2741",
  border: "#1F2D49",
  borderStrong: "#2A3A5C",
  ink: "#E8EEF7",
  inkMuted: "#9AA9C2",
  inkSubtle: "#6B7A95",
  accent: "#A8C7FA",
  accentDeep: "#5B8DEF",
  warn: "#F5C26B",
  danger: "#E07B7B",
  ok: "#7BC9A5",
  whatsapp: "#25D366",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

type Paciente = {
  id: number;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  unidadeId?: number | null;
};

type Farmacia = { id: number; nome_fantasia: string; cnpj?: string | null };

type SubstanciaCatalogo = {
  id: number;
  nome: string;
  abreviacao?: string | null;
  categoria?: string | null;
  via?: string | null;
  controlado?: boolean | null;
  tipoReceitaAnvisaCodigo?: string | null;
};

type Ativo = {
  nome_ativo: string;
  substancia_id: number | null;
  dose_valor: number;
  dose_unidade: string;
  via: "ORAL" | "IM" | "EV" | "SC" | "TOPICA" | "SUBLINGUAL";
  tipo_receita_anvisa_codigo:
    | "BRANCA_SIMPLES"
    | "BRANCA_CONTROLE_ESPECIAL"
    | "AZUL_B1"
    | "AMARELA_A1"
    | "ANTIBIOTICO_RDC20";
  observacao: string;
  controlado: boolean;
};

type PdfEmitido = {
  id: number;
  ordem: number;
  cor: string;
  destino_dispensacao: string;
  titulo: string;
};

const TIPOS_RECEITA: { codigo: Ativo["tipo_receita_anvisa_codigo"]; label: string }[] = [
  { codigo: "BRANCA_SIMPLES", label: "BRANCA SIMPLES (industrial comum)" },
  { codigo: "BRANCA_CONTROLE_ESPECIAL", label: "BRANCA CONTROLE ESPECIAL (C1)" },
  { codigo: "AZUL_B1", label: "AZUL B1 (benzodiazepínico)" },
  { codigo: "AMARELA_A1", label: "AMARELA A1 (entorpecente)" },
  { codigo: "ANTIBIOTICO_RDC20", label: "ANTIBIÓTICO RDC20" },
];

const VIAS: Ativo["via"][] = ["ORAL", "IM", "EV", "SC", "TOPICA", "SUBLINGUAL"];

function ativoVazio(): Ativo {
  return {
    nome_ativo: "",
    substancia_id: null,
    dose_valor: 0,
    dose_unidade: "mg",
    via: "ORAL",
    tipo_receita_anvisa_codigo: "BRANCA_SIMPLES",
    observacao: "",
    controlado: false,
  };
}

// Converte via do catálogo (livre, ex "iv","oral","im") pra enum da prescrição
function viaCatalogoToEnum(v?: string | null): Ativo["via"] {
  const x = (v ?? "").toUpperCase();
  if (x === "IV" || x === "EV") return "EV";
  if (x === "IM") return "IM";
  if (x === "SC") return "SC";
  if (x === "TOPICA" || x === "TOPICO") return "TOPICA";
  if (x === "SL" || x === "SUBLINGUAL") return "SUBLINGUAL";
  return "ORAL";
}

function tipoReceitaValido(c?: string | null): Ativo["tipo_receita_anvisa_codigo"] {
  const list = TIPOS_RECEITA.map((t) => t.codigo);
  return (list.includes(c as any) ? c : "BRANCA_SIMPLES") as Ativo["tipo_receita_anvisa_codigo"];
}

// Normaliza telefone BR pra formato wa.me (só dígitos, com 55).
function telefoneParaWaMe(tel: string | null | undefined): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "");
  if (!d) return null;
  if (!d.startsWith("55")) d = "55" + d;
  return d;
}

export default function PrescricaoRapida() {
  const { user } = useAuth();
  const { unidadeSelecionada } = useClinic();
  const { toast } = useToast();

  // PACIENTE
  const [busca, setBusca] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [paciente, setPaciente] = useState<Paciente | null>(null);

  // FARMÁCIA
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [farmaciaId, setFarmaciaId] = useState<number | null>(null);

  // METADADOS PROTOCOLO
  const [tituloBloco, setTituloBloco] = useState("PROTOCOLO PERSONALIZADO");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [duracaoDias, setDuracaoDias] = useState(30);

  // ATIVOS
  const [ativos, setAtivos] = useState<Ativo[]>([ativoVazio()]);

  // EMISSÃO
  const [emitindo, setEmitindo] = useState(false);
  const [prescricaoId, setPrescricaoId] = useState<number | null>(null);
  const [pdfs, setPdfs] = useState<PdfEmitido[]>([]);

  const medicoId = (user as any)?.id ?? null;
  const unidadeId = unidadeSelecionada ?? (user as any)?.unidadeId ?? null;

  // Carrega farmácias 1x
  useEffect(() => {
    // Task #490: ensureArray blinda contra 401 / objeto de erro.
    apiFetch(`/api/farmacias-disponiveis`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setFarmacias(ensureArray<Farmacia>(rows)))
      .catch(() => setFarmacias([]));
  }, []);

  const podeEmitir = useMemo(
    () =>
      !!paciente &&
      !!medicoId &&
      ativos.length > 0 &&
      ativos.every((a) => a.nome_ativo.trim().length > 0 && a.dose_valor > 0),
    [paciente, medicoId, ativos],
  );

  async function buscarPacientes() {
    if (busca.trim().length < 2) return;
    setBuscando(true);
    try {
      const r = await apiFetch(`/api/pacientes?busca=${encodeURIComponent(busca.trim())}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as Paciente[];
      setPacientes(data.slice(0, 20));
    } catch (e) {
      toast({ title: "Erro buscando pacientes", description: String(e), variant: "destructive" });
    } finally {
      setBuscando(false);
    }
  }

  function addAtivo() { setAtivos((a) => [...a, ativoVazio()]); }
  function rmAtivo(i: number) { setAtivos((a) => a.filter((_, idx) => idx !== i)); }
  function setAtivo(i: number, patch: Partial<Ativo>) {
    setAtivos((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function aplicarSubstancia(i: number, s: SubstanciaCatalogo) {
    setAtivo(i, {
      nome_ativo: s.nome,
      substancia_id: s.id,
      via: viaCatalogoToEnum(s.via),
      tipo_receita_anvisa_codigo: tipoReceitaValido(s.tipoReceitaAnvisaCodigo),
      controlado: !!s.controlado,
    });
  }

  async function emitir() {
    if (!paciente || !medicoId) return;
    setEmitindo(true);
    setPdfs([]);
    setPrescricaoId(null);
    try {
      const rPresc = await apiFetch(`/api/prescricoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente_id: paciente.id,
          medico_id: medicoId,
          unidade_id: unidadeId,
          cids: [],
          observacoes_gerais: observacoesGerais || null,
          duracao_dias: duracaoDias,
        }),
      });
      if (!rPresc.ok) throw new Error(`Falha criando prescrição: ${await rPresc.text()}`);
      const presc = await rPresc.json();
      const idPresc: number = presc.id;
      setPrescricaoId(idPresc);

      const viaPrimeira = ativos[0]?.via ?? "ORAL";
      const farmaciaNome = farmacias.find((f) => f.id === farmaciaId)?.nome_fantasia ?? null;
      const rBloco = await apiFetch(`/api/prescricoes/${idPresc}/blocos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo_apelido: tituloBloco,
          titulo_categoria: "FÓRMULA",
          via_administracao: viaPrimeira,
          tipo_bloco: "MANIPULADO_FARMACIA",
          destino_dispensacao: "FAMA",
          observacoes: observacoesGerais || null,
          ativos: ativos.map((a) => ({
            nome_ativo: a.nome_ativo,
            dose_valor: a.dose_valor,
            dose_unidade: a.dose_unidade,
            observacao: a.observacao || null,
            tipo_receita_anvisa_codigo: a.tipo_receita_anvisa_codigo,
            controlado: a.controlado,
            farmacia_padrao: farmaciaNome,
          })),
        }),
      });
      if (!rBloco.ok) throw new Error(`Falha adicionando bloco: ${await rBloco.text()}`);

      const rEmit = await apiFetch(`/api/prescricoes/${idPresc}/emitir`, { method: "POST" });
      if (!rEmit.ok) throw new Error(`Falha emitindo: ${await rEmit.text()}`);

      const rPdfs = await apiFetch(`/api/prescricoes/${idPresc}/pdfs`);
      if (!rPdfs.ok) throw new Error(`Falha listando PDFs: ${await rPdfs.text()}`);
      const lista = (await rPdfs.json()) as PdfEmitido[];
      setPdfs(lista);
      toast({ title: `Prescrição #${idPresc} emitida`, description: `${lista.length} PDF(s) gerado(s).` });
    } catch (e: any) {
      toast({ title: "Erro emitindo", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setEmitindo(false);
    }
  }

  function enviarWhatsApp(pdf: PdfEmitido) {
    if (!paciente) return;
    const numero = telefoneParaWaMe(paciente.telefone);
    if (!numero) {
      toast({ title: "Paciente sem telefone", description: "Cadastre celular pra enviar via WhatsApp.", variant: "destructive" });
      return;
    }
    const primeiroNome = paciente.nome.split(" ")[0] ?? paciente.nome;
    const farmaciaNome = farmacias.find((f) => f.id === farmaciaId)?.nome_fantasia;
    const linhas = [
      `Olá ${primeiroNome}, sua prescrição #${prescricaoId} está pronta.`,
      ``,
      `Protocolo: ${tituloBloco}`,
      `PDF #${pdf.ordem} · ${pdf.cor?.toUpperCase() ?? ""} · destino ${pdf.destino_dispensacao}`,
      farmaciaNome ? `Farmácia: ${farmaciaNome}` : null,
      ``,
      `O PDF segue em anexo nesta conversa.`,
      ``,
      `— Instituto Pádua / PAWARDS`,
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(linhas)}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <Layout>
      <div style={{ background: tk.bg, color: tk.ink, minHeight: "100vh", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
        {/* HEADER */}
        <div style={{ borderLeft: `3px solid ${tk.accent}`, paddingLeft: 16, marginBottom: 24 }}>
          <div style={{ fontFamily: tk.mono, fontSize: 11, letterSpacing: 2, color: tk.accent }}>
            PADCON · ATALHO MÉDICO
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "4px 0 6px", color: tk.ink }}>
            Prescrição Rápida
          </h1>
          <div style={{ fontSize: 13, color: tk.inkMuted }}>
            Sem anamnese · catálogo + farmácia + envio WhatsApp.
            {medicoId ? (
              <span style={{ fontFamily: tk.mono, color: tk.inkSubtle, marginLeft: 12 }}>
                MEDICO_ID={medicoId} UNIDADE_ID={unidadeId ?? "—"}
              </span>
            ) : (
              <span style={{ color: tk.danger, marginLeft: 12 }}>⚠ usuário não autenticado</span>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* COLUNA ESQUERDA — paciente + farmácia + metadata */}
          <section style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${tk.accentDeep}`, padding: 20 }}>
            <div style={{ fontFamily: tk.mono, fontSize: 11, letterSpacing: 2, color: tk.accent, marginBottom: 12 }}>01 · PACIENTE</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarPacientes()}
                placeholder="Nome, CPF ou telefone..."
                style={{ flex: 1, background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "10px 12px", fontSize: 14, outline: "none" }}
              />
              <button
                onClick={buscarPacientes}
                disabled={buscando || busca.trim().length < 2}
                style={{ background: tk.accent, color: tk.bg, border: 0, padding: "10px 18px", fontWeight: 600, fontFamily: tk.mono, fontSize: 12, letterSpacing: 1, cursor: buscando ? "wait" : "pointer", opacity: busca.trim().length < 2 ? 0.4 : 1 }}
              >
                {buscando ? "..." : "BUSCAR"}
              </button>
            </div>

            {pacientes.length > 0 && !paciente && (
              <div style={{ maxHeight: 220, overflow: "auto", border: `1px solid ${tk.border}`, marginBottom: 12 }}>
                {pacientes.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => { setPaciente(p); setPacientes([]); }}
                    style={{ padding: "10px 12px", borderBottom: `1px solid ${tk.border}`, cursor: "pointer", fontSize: 13 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = tk.bgSoft)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ color: tk.ink, fontWeight: 500 }}>{p.nome}</div>
                    <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkSubtle, marginTop: 2 }}>
                      ID={p.id} {p.cpf ? `· CPF=${p.cpf}` : ""} {p.telefone ? `· ${p.telefone}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {paciente && (
              <div style={{ background: tk.bgSoft, borderLeft: `3px solid ${tk.ok}`, padding: 14, marginBottom: 12 }}>
                <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.ok, letterSpacing: 1.5 }}>SELECIONADO</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{paciente.nome}</div>
                <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkMuted, marginTop: 4 }}>
                  ID={paciente.id} {paciente.cpf ? `· ${paciente.cpf}` : ""}
                </div>
                <div style={{ fontFamily: tk.mono, fontSize: 11, color: paciente.telefone ? tk.whatsapp : tk.warn, marginTop: 4 }}>
                  WHATSAPP: {paciente.telefone || "⚠ sem telefone cadastrado"}
                </div>
                <button
                  onClick={() => setPaciente(null)}
                  style={{ marginTop: 10, background: "transparent", color: tk.inkMuted, border: `1px solid ${tk.border}`, padding: "4px 10px", fontFamily: tk.mono, fontSize: 11, cursor: "pointer" }}
                >
                  TROCAR
                </button>
              </div>
            )}

            {/* FARMÁCIA */}
            <div style={{ marginTop: 8 }}>
              <label style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted, letterSpacing: 1.5 }}>FARMÁCIA DESTINO</label>
              <select
                value={farmaciaId ?? ""}
                onChange={(e) => setFarmaciaId(e.target.value ? Number(e.target.value) : null)}
                style={{ width: "100%", background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 13, marginTop: 4, fontFamily: tk.mono }}
              >
                <option value="">— escolha farmácia ({farmacias.length} ativas) —</option>
                {farmacias.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_fantasia}{f.cnpj ? ` · ${f.cnpj}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* metadata bloco */}
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted, letterSpacing: 1.5 }}>TÍTULO DO PROTOCOLO</label>
                <input
                  value={tituloBloco}
                  onChange={(e) => setTituloBloco(e.target.value)}
                  style={{ width: "100%", background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 13, marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted, letterSpacing: 1.5 }}>DURAÇÃO (dias)</label>
                <input
                  type="number"
                  value={duracaoDias}
                  onChange={(e) => setDuracaoDias(Number(e.target.value) || 0)}
                  style={{ width: "100%", background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 13, marginTop: 4, fontFamily: tk.mono }}
                />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted, letterSpacing: 1.5 }}>OBSERVAÇÕES GERAIS</label>
              <textarea
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                rows={3}
                style={{ width: "100%", background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 13, marginTop: 4, resize: "vertical" }}
              />
            </div>
          </section>

          {/* COLUNA DIREITA — ativos */}
          <section style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${tk.warn}`, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: tk.mono, fontSize: 11, letterSpacing: 2, color: tk.warn }}>02 · ATIVOS</div>
              <button
                onClick={addAtivo}
                style={{ background: "transparent", color: tk.accent, border: `1px solid ${tk.accent}`, padding: "5px 12px", fontFamily: tk.mono, fontSize: 11, letterSpacing: 1, cursor: "pointer" }}
              >
                + ADICIONAR
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 520, overflow: "auto", paddingRight: 4 }}>
              {ativos.map((a, i) => (
                <AtivoCard
                  key={i}
                  ativo={a}
                  index={i}
                  total={ativos.length}
                  onChange={(patch) => setAtivo(i, patch)}
                  onPickSubstancia={(s) => aplicarSubstancia(i, s)}
                  onRemove={() => rmAtivo(i)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* AÇÃO EMITIR */}
        <div style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "center" }}>
          <button
            onClick={emitir}
            disabled={!podeEmitir || emitindo}
            style={{ background: podeEmitir ? tk.accent : tk.border, color: tk.bg, border: 0, padding: "16px 32px", fontWeight: 700, fontFamily: tk.mono, fontSize: 14, letterSpacing: 2, cursor: podeEmitir && !emitindo ? "pointer" : "not-allowed", opacity: emitindo ? 0.6 : 1 }}
          >
            {emitindo ? "EMITINDO..." : "▶ EMITIR PRESCRIÇÃO"}
          </button>
          {!paciente && <span style={{ color: tk.inkSubtle, fontSize: 12 }}>selecione um paciente</span>}
          {paciente && ativos.some((a) => !a.nome_ativo.trim() || a.dose_valor <= 0) && (
            <span style={{ color: tk.warn, fontSize: 12 }}>preencha nome e dose de todos os ativos</span>
          )}
        </div>

        {/* RESULTADO */}
        {prescricaoId && pdfs.length > 0 && (
          <section style={{ marginTop: 32, background: tk.bgAlt, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${tk.ok}`, padding: 20 }}>
            <div style={{ fontFamily: tk.mono, fontSize: 11, letterSpacing: 2, color: tk.ok, marginBottom: 12 }}>
              03 · PDFS EMITIDOS · PRESCRIÇÃO #{prescricaoId}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
              {pdfs.map((pdf) => (
                <div key={pdf.id} style={{ background: tk.bgSoft, border: `1px solid ${tk.border}`, padding: 14 }}>
                  <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 4 }}>
                    PDF #{pdf.ordem} · COR={pdf.cor?.toUpperCase()} · DEST={pdf.destino_dispensacao}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: tk.ink, marginBottom: 10 }}>
                    {pdf.titulo || "Receita"}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => abrirPdfAutenticado(`/api/prescricoes/pdfs/${pdf.id}/download`)}
                      style={{ flex: 1, background: tk.accent, color: tk.bg, border: 0, padding: "8px 12px", fontFamily: tk.mono, fontSize: 11, letterSpacing: 1, fontWeight: 600, cursor: "pointer" }}
                    >
                      ABRIR PDF
                    </button>
                    <button
                      onClick={() => enviarWhatsApp(pdf)}
                      disabled={!paciente?.telefone}
                      title={paciente?.telefone ? "Abre wa.me com mensagem pronta" : "Paciente sem telefone"}
                      style={{ flex: 1, background: paciente?.telefone ? tk.whatsapp : tk.border, color: "#fff", border: 0, padding: "8px 12px", fontFamily: tk.mono, fontSize: 11, letterSpacing: 1, fontWeight: 600, cursor: paciente?.telefone ? "pointer" : "not-allowed", opacity: paciente?.telefone ? 1 : 0.5 }}
                    >
                      WHATSAPP
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ gridColumn: "1/-1", fontSize: 11, color: tk.inkSubtle, fontFamily: tk.mono, marginTop: 8 }}>
                NOTA: WhatsApp abre wa.me com mensagem pré-pronta. O PDF você anexa manualmente após baixar (ZapSign desativado nesta tela).
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

// ─── AtivoCard com autocomplete substância ─────────────────────────
function AtivoCard({
  ativo, index, total, onChange, onPickSubstancia, onRemove,
}: {
  ativo: Ativo;
  index: number;
  total: number;
  onChange: (patch: Partial<Ativo>) => void;
  onPickSubstancia: (s: SubstanciaCatalogo) => void;
  onRemove: () => void;
}) {
  const [hits, setHits] = useState<SubstanciaCatalogo[]>([]);
  const [open, setOpen] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (ativo.substancia_id) return; // já selecionada
    const termo = ativo.nome_ativo.trim();
    if (termo.length < 2) { setHits([]); return; }
    const ctrl = new AbortController();
    setCarregando(true);
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch(`/api/substancias?search=${encodeURIComponent(termo)}`, { signal: ctrl.signal });
        if (!r.ok) return;
        const rows = (await r.json()) as SubstanciaCatalogo[];
        setHits(rows.slice(0, 8));
        setOpen(true);
      } catch { /* abort */ } finally { setCarregando(false); }
    }, 250);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [ativo.nome_ativo, ativo.substancia_id]);

  return (
    <div style={{ background: tk.bgSoft, border: `1px solid ${tk.border}`, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, letterSpacing: 1.5 }}>
          ATIVO #{index + 1}
          {ativo.substancia_id && (
            <span style={{ color: tk.ok, marginLeft: 8 }}>● DO CATÁLOGO (id={ativo.substancia_id})</span>
          )}
        </div>
        {total > 1 && (
          <button onClick={onRemove} style={{ background: "transparent", color: tk.danger, border: 0, cursor: "pointer", fontFamily: tk.mono, fontSize: 11 }}>
            REMOVER
          </button>
        )}
      </div>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <input
          value={ativo.nome_ativo}
          onChange={(e) => onChange({ nome_ativo: e.target.value, substancia_id: null })}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Digite pra buscar no catálogo... (ex: Testosterona)"
          style={{ width: "100%", background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 13 }}
        />
        {open && hits.length > 0 && !ativo.substancia_id && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: tk.bgAlt, border: `1px solid ${tk.borderStrong}`, zIndex: 10, maxHeight: 240, overflow: "auto" }}>
            {hits.map((s) => (
              <div
                key={s.id}
                onMouseDown={(e) => { e.preventDefault(); onPickSubstancia(s); setOpen(false); }}
                style={{ padding: "8px 10px", borderBottom: `1px solid ${tk.border}`, cursor: "pointer", fontSize: 13 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = tk.bgSoft)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ color: tk.ink, fontWeight: 500 }}>
                  {s.nome}
                  {s.abreviacao && <span style={{ fontFamily: tk.mono, color: tk.accent, marginLeft: 6 }}>· {s.abreviacao.toUpperCase()}</span>}
                </div>
                <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle, marginTop: 2 }}>
                  {s.categoria ?? "—"} · VIA={(s.via ?? "?").toUpperCase()}
                  {s.controlado ? " · CONTROLADO" : ""}
                  {s.tipoReceitaAnvisaCodigo ? ` · ${s.tipoReceitaAnvisaCodigo}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
        {carregando && <div style={{ position: "absolute", right: 8, top: 8, fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono }}>...</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <input
          type="number"
          value={ativo.dose_valor || ""}
          onChange={(e) => onChange({ dose_valor: Number(e.target.value) || 0 })}
          placeholder="Dose"
          style={{ background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 13, fontFamily: tk.mono }}
        />
        <select
          value={ativo.dose_unidade}
          onChange={(e) => onChange({ dose_unidade: e.target.value })}
          style={{ background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 13, fontFamily: tk.mono }}
        >
          {["mg", "mcg", "g", "ml", "UI", "gota(s)", "cp"].map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          value={ativo.via}
          onChange={(e) => onChange({ via: e.target.value as Ativo["via"] })}
          style={{ background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 13, fontFamily: tk.mono }}
        >
          {VIAS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <select
        value={ativo.tipo_receita_anvisa_codigo}
        onChange={(e) => onChange({
          tipo_receita_anvisa_codigo: e.target.value as Ativo["tipo_receita_anvisa_codigo"],
          controlado: e.target.value !== "BRANCA_SIMPLES" && e.target.value !== "ANTIBIOTICO_RDC20",
        })}
        style={{ width: "100%", background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 12, marginBottom: 8, fontFamily: tk.mono }}
      >
        {TIPOS_RECEITA.map((t) => <option key={t.codigo} value={t.codigo}>{t.label}</option>)}
      </select>
      <input
        value={ativo.observacao}
        onChange={(e) => onChange({ observacao: e.target.value })}
        placeholder="Posologia / observação (ex: 1× por semana, IM glúteo)"
        style={{ width: "100%", background: tk.bg, border: `1px solid ${tk.borderStrong}`, color: tk.ink, padding: "8px 10px", fontSize: 13 }}
      />
    </div>
  );
}
