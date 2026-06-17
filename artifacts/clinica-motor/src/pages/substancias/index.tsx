import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";
import {
  Search, ChevronDown, ChevronRight, FlaskConical,
  Star, Clock, DollarSign, Syringe, Package, Activity,
  Brain, Heart, Zap, Moon, Flame, Shield, Sparkles, Pencil, X, Trash2,
  Plus, Gauge, AlertTriangle
} from "lucide-react";
import {
  NATUREZAS_ATIVO, NATUREZA_KEYS, corDaNatureza, labelDaNatureza,
  FUNCOES_OBJETIVO_SUGERIDAS, FINALIDADES_SUGERIDAS, ORIGEM_DADO_LABELS, UNIDADES_DOSE,
  type NaturezaAtivo,
} from "@/lib/naturezaAtivo";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia, na Governanca e no Catalogo). Nao inventar hex novo aqui.
import { PW, MONO, inputStyle, labelStyle } from "../craniotomia-shared";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface Substancia {
  id: number;
  nome: string;
  abreviacao: string | null;
  codigoSemantico: string | null;
  categoria: string;
  categoriaDetalhada: string | null;
  cor: string;
  dosePadrao: string | null;
  unidadeDose: string | null;
  via: string;
  duracaoMinutos: number;
  precoReferencia: number | null;
  maxSessoesPorSemana: number | null;
  intervaloDias: number | null;
  estoqueQuantidade: number;
  estoqueUnidade: string | null;
  descricao: string | null;
  funcaoPrincipal: string | null;
  efeitosPercebidos: string | null;
  tempoParaEfeito: string | null;
  classificacaoEstrelas: number;
  efeitosSistemasCorporais: Record<string, any> | null;
  beneficioLongevidade: string | null;
  impactoQualidadeVida: string | null;
  beneficioSono: string | null;
  beneficioEnergia: string | null;
  beneficioLibido: string | null;
  performanceFisica: string | null;
  forcaMuscular: string | null;
  clarezaMental: string | null;
  peleCabeloUnhas: string | null;
  suporteImunologico: string | null;
  contraindicacoes: string | null;
  evidenciaCientifica: string | null;
  notas: string | null;
  naturezaAtivo: string | null;
  funcoesObjetivo: string[] | null;
  finalidades: string[] | null;
  doseMinima: string | null;
  doseMedia: string | null;
  doseMaxima: string | null;
  potencia: number | null;
  origemDado: string;
}

function novaSubstanciaVazia(): Substancia {
  return {
    id: 0, nome: "", abreviacao: null, codigoSemantico: null, categoria: "geral",
    categoriaDetalhada: null, cor: "#3B82F6", dosePadrao: null, unidadeDose: null,
    via: "oral", duracaoMinutos: 30, precoReferencia: null, maxSessoesPorSemana: null,
    intervaloDias: null, estoqueQuantidade: 0, estoqueUnidade: null, descricao: null,
    funcaoPrincipal: null, efeitosPercebidos: null, tempoParaEfeito: null,
    classificacaoEstrelas: 3, efeitosSistemasCorporais: null, beneficioLongevidade: null,
    impactoQualidadeVida: null, beneficioSono: null, beneficioEnergia: null,
    beneficioLibido: null, performanceFisica: null, forcaMuscular: null, clarezaMental: null,
    peleCabeloUnhas: null, suporteImunologico: null, contraindicacoes: null,
    evidenciaCientifica: null, notas: null, naturezaAtivo: null, funcoesObjetivo: null,
    finalidades: null, doseMinima: null, doseMedia: null, doseMaxima: null, potencia: null,
    origemDado: "OPERADOR",
  };
}

const VIA_LABELS: Record<string, string> = {
  iv: "Endovenoso",
  im: "Intramuscular",
  implant: "Implante",
  oral: "Oral",
  topico: "Topico",
};

// Cores das vias na face escura (pasteis-neon da familia Penumbra, nao os
// claros bg-blue-100/bg-green-100). Reusam as cores de dominio da craniotomia.
const VIA_COR: Record<string, string> = {
  iv: PW.azul,        // azul
  im: PW.verde,       // verde
  implant: PW.lilas,  // lilas
  oral: PW.gold,      // dourado
  topico: PW.rosa,    // rosa
};

const CATEGORIA_FILTERS = ["Todos", "antioxidante", "vitamina", "lipolitico", "coenzima", "terapia", "mineral", "complexo"];

// ── CSS PENUMBRA: hover "luz por tras", foco neon, reveal de pincel ──────────
const SUB_CSS = `
.sub-card { transition: border-color .25s, box-shadow .25s; }
.sub-card:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 30px -12px ${PW.cianoGlow}; }
.sub-head { transition: background .15s; cursor: pointer; }
.sub-head:hover { background: ${PW.bg3}; }
.sub-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.sub-btn:hover:not(:disabled) { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.sub-btn:disabled { opacity: .45; cursor: not-allowed; }
.sub-icon-btn { transition: opacity .15s, border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.sub-icon-btn:hover { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 14px -6px ${PW.cianoGlow}; }
.sub-pencil { opacity: 0; }
.sub-rowgroup:hover .sub-pencil { opacity: 1; }
.sub-overlay { position: fixed; inset: 0; background: rgba(2,10,20,0.82); display: flex; align-items: flex-start; justify-content: center; padding: 48px 16px; z-index: 60; overflow: auto; }
.sub-tag-btn { transition: border-color .2s, color .2s; cursor: pointer; }
.sub-tag-btn:hover { border-color: ${PW.ciano}; color: ${PW.ciano}; }
`;

// ── Estilos compartilhados ──────────────────────────────────────────────────
const btnOutline: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "8px 14px",
  background: PW.bg2,
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.t2,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontFamily: MONO,
};
const btnPrimario: CSSProperties = {
  ...btnOutline,
  background: "rgba(95,230,204,0.12)",
  border: `1px solid ${PW.ciano}`,
  color: PW.ciano,
};
const btnDanger: CSSProperties = {
  ...btnOutline,
  background: "rgba(208,138,138,0.12)",
  border: `1px solid ${PW.danger}`,
  color: PW.danger,
};
const iconBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 5,
  background: "transparent",
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.muted,
};
const subHeadingStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: PW.muted,
  fontFamily: MONO,
  margin: 0,
};

function Chip({ children, cor }: { children: ReactNode; cor?: string }) {
  const c = cor || PW.t2;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 8px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: c,
        border: `1px solid ${c}`,
        borderRadius: 0,
        fontFamily: MONO,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function ToggleBtn({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className="sub-btn"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        background: ativo ? "rgba(95,230,204,0.12)" : "transparent",
        border: `1px solid ${ativo ? PW.ciano : PW.border}`,
        borderRadius: 0,
        color: ativo ? PW.ciano : PW.t2,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontFamily: MONO,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function BeneficioItem({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: `1px solid ${PW.border}` }}>
      <Icon style={{ width: 14, height: 14, marginTop: 2, color: PW.muted, flexShrink: 0 }} />
      <div>
        <span style={{ fontSize: 10, fontWeight: 700, color: PW.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <p style={{ fontSize: 12, color: PW.text, margin: 0 }}>{value}</p>
      </div>
    </div>
  );
}

function SubstanciaCard({ sub, onEdit }: { sub: Substancia; onEdit: (s: Substancia) => void }) {
  const [expanded, setExpanded] = useState(false);
  const natCor = corDaNatureza(sub.naturezaAtivo, "escuro");

  return (
    <section className="sub-card sub-rowgroup" style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}>
      <div
        className="sub-head"
        style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}
        onClick={() => setExpanded(!expanded)}
      >
        <div
          style={{ width: 40, height: 40, borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: MONO, flexShrink: 0, backgroundColor: sub.cor }}
        >
          {sub.abreviacao || sub.nome.substring(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: PW.text, margin: 0, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.nome}</h3>
            <Chip cor={VIA_COR[sub.via] || PW.t2}>{VIA_LABELS[sub.via] || sub.via}</Chip>
            {sub.naturezaAtivo && (
              <span
                style={{ fontSize: 10, padding: "1px 8px", border: `1px solid ${natCor ?? PW.muted}`, color: natCor ?? PW.muted, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.06em", borderRadius: 0 }}
              >
                {labelDaNatureza(sub.naturezaAtivo)}
              </span>
            )}
            {sub.origemDado === "SEED_RASCUNHO" && (
              <span style={{ fontSize: 10, padding: "1px 8px", border: `1px solid ${PW.gold}`, color: PW.gold, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.06em", borderRadius: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle style={{ width: 11, height: 11 }} /> rascunho
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, fontSize: 11, color: PW.muted, flexWrap: "wrap" }}>
            {sub.codigoSemantico && (
              <span style={{ fontFamily: MONO, background: PW.bg3, padding: "1px 6px", color: PW.t2, border: `1px solid ${PW.border}` }}>{sub.codigoSemantico}</span>
            )}
            {sub.dosePadrao && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Syringe style={{ width: 12, height: 12 }} />
                {sub.dosePadrao}{sub.unidadeDose ? ` ${sub.unidadeDose}` : ""}
              </span>
            )}
            {(sub.doseMinima || sub.doseMaxima) && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO }}>
                faixa {sub.doseMinima || "?"}–{sub.doseMaxima || "?"}
              </span>
            )}
            {typeof sub.potencia === "number" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Gauge style={{ width: 12, height: 12 }} />
                pot {sub.potencia}/5
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Clock style={{ width: 12, height: 12 }} />
              {sub.duracaoMinutos}min
            </span>
            {sub.precoReferencia && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <DollarSign style={{ width: 12, height: 12 }} />
                R$ {sub.precoReferencia.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                style={{ width: 12, height: 12, color: i < sub.classificacaoEstrelas ? PW.gold : PW.border, fill: i < sub.classificacaoEstrelas ? PW.gold : "none" }}
              />
            ))}
          </div>
          <button onClick={e => { e.stopPropagation(); onEdit(sub); }} className="sub-icon-btn sub-pencil" style={iconBtnStyle}>
            <Pencil style={{ width: 13, height: 13 }} />
          </button>
          {expanded ? <ChevronDown style={{ width: 16, height: 16, color: PW.ciano }} /> : <ChevronRight style={{ width: 16, height: 16, color: PW.muted }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "16px", borderTop: `1px solid ${PW.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div>
              {sub.funcaoPrincipal && (
                <div style={{ marginBottom: 12 }}>
                  <h4 style={subHeadingStyle}>Funcao Principal</h4>
                  <p style={{ fontSize: 12, color: PW.text, margin: "4px 0 0" }}>{sub.funcaoPrincipal}</p>
                </div>
              )}
              {sub.descricao && (
                <div style={{ marginBottom: 12 }}>
                  <h4 style={subHeadingStyle}>Descricao</h4>
                  <p style={{ fontSize: 12, color: PW.text, margin: "4px 0 0" }}>{sub.descricao}</p>
                </div>
              )}
              {sub.efeitosPercebidos && (
                <div style={{ marginBottom: 12 }}>
                  <h4 style={subHeadingStyle}>Efeitos Percebidos</h4>
                  <p style={{ fontSize: 12, color: PW.text, margin: "4px 0 0" }}>{sub.efeitosPercebidos}</p>
                </div>
              )}
              {sub.contraindicacoes && (
                <div style={{ marginBottom: 12, padding: 10, background: "rgba(208,138,138,0.10)", border: `1px solid ${PW.danger}`, borderLeft: `3px solid ${PW.danger}` }}>
                  <h4 style={{ ...subHeadingStyle, color: PW.danger }}>Contraindicacoes</h4>
                  <p style={{ fontSize: 12, color: PW.danger, margin: "4px 0 0" }}>{sub.contraindicacoes}</p>
                </div>
              )}
            </div>

            <div>
              <h4 style={{ ...subHeadingStyle, marginBottom: 8 }}>Beneficios</h4>
              <BeneficioItem icon={Heart} label="Longevidade" value={sub.beneficioLongevidade} />
              <BeneficioItem icon={Activity} label="Qualidade de Vida" value={sub.impactoQualidadeVida} />
              <BeneficioItem icon={Moon} label="Sono" value={sub.beneficioSono} />
              <BeneficioItem icon={Zap} label="Energia" value={sub.beneficioEnergia} />
              <BeneficioItem icon={Flame} label="Libido" value={sub.beneficioLibido} />
              <BeneficioItem icon={Activity} label="Performance Fisica" value={sub.performanceFisica} />
              <BeneficioItem icon={Sparkles} label="Forca Muscular" value={sub.forcaMuscular} />
              <BeneficioItem icon={Brain} label="Clareza Mental" value={sub.clarezaMental} />
              <BeneficioItem icon={Sparkles} label="Pele/Cabelo/Unhas" value={sub.peleCabeloUnhas} />
              <BeneficioItem icon={Shield} label="Suporte Imunologico" value={sub.suporteImunologico} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${PW.border}`, fontSize: 11, color: PW.muted, flexWrap: "wrap" }}>
            {sub.tempoParaEfeito && <span>Efeito em: {sub.tempoParaEfeito}</span>}
            {sub.maxSessoesPorSemana && <span>Max {sub.maxSessoesPorSemana}x/semana</span>}
            {sub.intervaloDias && <span>Intervalo: {sub.intervaloDias} dias</span>}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Package style={{ width: 12, height: 12 }} />
              Estoque: {sub.estoqueQuantidade} {sub.estoqueUnidade || "un"}
            </span>
            {sub.evidenciaCientifica && <span>Evidencia: {sub.evidenciaCientifica}</span>}
          </div>
        </div>
      )}
    </section>
  );
}

function TagMultiField({ label, values, suggestions, onChange }: {
  label: string; values: string[]; suggestions: string[]; onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t || values.includes(t)) { setInput(""); return; }
    onChange([...values, t]); setInput("");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "span 3" }}>
      <label style={labelStyle}>{label}</label>
      {values.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
          {values.map(v => (
            <span key={v} style={{ fontSize: 10, fontFamily: MONO, textTransform: "uppercase", padding: "1px 6px", border: `1px solid ${PW.border}`, background: PW.bg3, color: PW.t2, display: "inline-flex", alignItems: "center", gap: 4 }}>
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))} style={{ background: "transparent", border: "none", color: PW.muted, cursor: "pointer", padding: 0, display: "inline-flex" }}><X style={{ width: 11, height: 11 }} /></button>
            </span>
          ))}
        </div>
      )}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
        placeholder="Digite e tecle Enter para adicionar"
        style={inputStyle}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
        {suggestions.filter(s => !values.includes(s)).map(s => (
          <button key={s} type="button" onClick={() => add(s)} className="sub-tag-btn"
            style={{ fontSize: 10, fontFamily: MONO, padding: "1px 6px", border: `1px dashed ${PW.border}`, color: PW.muted, background: "transparent", borderRadius: 0 }}>
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function SubstanciaEditModal({ item, onClose, onSave, onDelete }: { item: Substancia; onClose: () => void; onSave: (data: any) => void; onDelete: () => void }) {
  const isCreate = item.id === 0;
  const [form, setForm] = useState<Record<string, any>>({
    nome: item.nome, abreviacao: item.abreviacao || "", codigoSemantico: item.codigoSemantico || "",
    categoria: item.categoria, categoriaDetalhada: item.categoriaDetalhada || "", cor: item.cor,
    dosePadrao: item.dosePadrao || "", unidadeDose: item.unidadeDose || "", via: item.via,
    duracaoMinutos: item.duracaoMinutos, precoReferencia: item.precoReferencia || "",
    maxSessoesPorSemana: item.maxSessoesPorSemana || "", intervaloDias: item.intervaloDias || "",
    estoqueQuantidade: item.estoqueQuantidade, estoqueUnidade: item.estoqueUnidade || "",
    descricao: item.descricao || "", funcaoPrincipal: item.funcaoPrincipal || "",
    efeitosPercebidos: item.efeitosPercebidos || "", tempoParaEfeito: item.tempoParaEfeito || "",
    classificacaoEstrelas: item.classificacaoEstrelas, contraindicacoes: item.contraindicacoes || "",
    evidenciaCientifica: item.evidenciaCientifica || "", notas: item.notas || "",
    beneficioLongevidade: item.beneficioLongevidade || "", impactoQualidadeVida: item.impactoQualidadeVida || "",
    beneficioSono: item.beneficioSono || "", beneficioEnergia: item.beneficioEnergia || "",
    beneficioLibido: item.beneficioLibido || "", performanceFisica: item.performanceFisica || "",
    forcaMuscular: item.forcaMuscular || "", clarezaMental: item.clarezaMental || "",
    peleCabeloUnhas: item.peleCabeloUnhas || "", suporteImunologico: item.suporteImunologico || "",
    naturezaAtivo: item.naturezaAtivo || "", funcoesObjetivo: item.funcoesObjetivo || [],
    finalidades: item.finalidades || [], doseMinima: item.doseMinima || "",
    doseMedia: item.doseMedia || "", doseMaxima: item.doseMaxima || "",
    potencia: item.potencia ?? "",
    origemDado: item.origemDado || "OPERADOR",
  });
  const [saving, setSaving] = useState(false);
  const escolherNatureza = (nat: string) => {
    const corAuto = nat ? NATUREZAS_ATIVO[nat as NaturezaAtivo]?.corClaro : null;
    setForm(f => ({ ...f, naturezaAtivo: nat, cor: corAuto ?? f.cor }));
  };
  const handleSave = async () => {
    setSaving(true);
    const numOuNull = (v: any) => (v === "" || v == null ? null : Number(v));
    const payload = {
      ...form,
      potencia: numOuNull(form.potencia),
      precoReferencia: numOuNull(form.precoReferencia),
      maxSessoesPorSemana: numOuNull(form.maxSessoesPorSemana),
      intervaloDias: numOuNull(form.intervaloDias),
      funcoesObjetivo: form.funcoesObjetivo?.length ? form.funcoesObjetivo : null,
      finalidades: form.finalidades?.length ? form.finalidades : null,
      doseMinima: form.doseMinima || null,
      doseMedia: form.doseMedia || null,
      doseMaxima: form.doseMaxima || null,
      unidadeDose: form.unidadeDose || null,
      naturezaAtivo: form.naturezaAtivo || null,
    };
    await onSave(payload);
    setSaving(false);
  };
  const fields = [
    { key: "nome", label: "Nome" }, { key: "abreviacao", label: "Abreviacao" },
    { key: "codigoSemantico", label: "Codigo Semantico" }, { key: "categoria", label: "Categoria" },
    { key: "categoriaDetalhada", label: "Categoria Detalhada" }, { key: "cor", label: "Cor" },
    { key: "dosePadrao", label: "Dose Padrao" },
    { key: "via", label: "Via", options: ["iv", "im", "implant", "oral", "topico"] },
    { key: "duracaoMinutos", label: "Duracao (min)", type: "number" },
    { key: "precoReferencia", label: "Preco Referencia", type: "number" },
    { key: "classificacaoEstrelas", label: "Estrelas (1-5)", type: "number" },
    { key: "maxSessoesPorSemana", label: "Max Sessoes/Semana", type: "number" },
    { key: "intervaloDias", label: "Intervalo Dias", type: "number" },
    { key: "estoqueQuantidade", label: "Estoque Qtd", type: "number" },
    { key: "estoqueUnidade", label: "Estoque Unidade" },
    { key: "tempoParaEfeito", label: "Tempo p/ Efeito" },
    { key: "evidenciaCientifica", label: "Evidencia Cientifica" },
    { key: "funcaoPrincipal", label: "Funcao Principal", type: "textarea" },
    { key: "descricao", label: "Descricao", type: "textarea" },
    { key: "efeitosPercebidos", label: "Efeitos Percebidos", type: "textarea" },
    { key: "contraindicacoes", label: "Contraindicacoes", type: "textarea" },
    { key: "notas", label: "Notas", type: "textarea" },
  ];
  const beneficioFields = [
    { key: "beneficioLongevidade", label: "Longevidade" }, { key: "impactoQualidadeVida", label: "Qualidade de Vida" },
    { key: "beneficioSono", label: "Sono" }, { key: "beneficioEnergia", label: "Energia" },
    { key: "beneficioLibido", label: "Libido" }, { key: "performanceFisica", label: "Performance Fisica" },
    { key: "forcaMuscular", label: "Forca Muscular" }, { key: "clarezaMental", label: "Clareza Mental" },
    { key: "peleCabeloUnhas", label: "Pele/Cabelo/Unhas" }, { key: "suporteImunologico", label: "Suporte Imunologico" },
  ];

  const subPanel: CSSProperties = { border: `1px solid ${PW.border}`, padding: 12, display: "flex", flexDirection: "column", gap: 12, background: PW.bg };

  return (
    <div className="sub-overlay" onClick={onClose}>
      <div
        style={{ width: "100%", maxWidth: 768, background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${PW.border}` }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: PW.ciano, margin: 0, fontFamily: MONO }}>{isCreate ? "Nova Substancia" : "Editar Substancia"}</h3>
          <button onClick={onClose} className="sub-icon-btn" style={iconBtnStyle} aria-label="Fechar"><X style={{ width: 14, height: 14 }} /></button>
        </header>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={subPanel}>
            <h4 style={subHeadingStyle}>Classificacao do Ativo</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Natureza (define a cor)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 28, height: 28, flexShrink: 0, border: `1px solid ${PW.border}`, background: form.cor || "transparent" }} />
                  <select
                    value={form.naturezaAtivo || ""}
                    onChange={e => escolherNatureza(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value="">— sem natureza —</option>
                    {NATUREZA_KEYS.map(k => <option key={k} value={k}>{NATUREZAS_ATIVO[k].label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Potencia (1-5)</label>
                <select
                  value={form.potencia ?? ""}
                  onChange={e => setForm({ ...form, potencia: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Procedencia do dado</label>
                <select
                  value={form.origemDado || "OPERADOR"}
                  onChange={e => setForm({ ...form, origemDado: e.target.value })}
                  style={inputStyle}
                >
                  {Object.entries(ORIGEM_DADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={labelStyle}>Eficacia (estrelas 1-5)</label>
                <select
                  value={form.classificacaoEstrelas ?? ""}
                  onChange={e => setForm({ ...form, classificacaoEstrelas: e.target.value === "" ? null : Number(e.target.value) })}
                  style={inputStyle}
                >
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <TagMultiField
                label="Funcoes Objetivo (multi)"
                values={form.funcoesObjetivo || []}
                suggestions={FUNCOES_OBJETIVO_SUGERIDAS}
                onChange={v => setForm({ ...form, funcoesObjetivo: v })}
              />
              <TagMultiField
                label="Finalidades (multi)"
                values={form.finalidades || []}
                suggestions={FINALIDADES_SUGERIDAS}
                onChange={v => setForm({ ...form, finalidades: v })}
              />
            </div>

            <div style={{ border: `1px solid ${PW.border}`, padding: 12, display: "flex", flexDirection: "column", gap: 8, background: PW.bg2 }}>
              <h4 style={subHeadingStyle}>Faixa de Dose</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={labelStyle}>Dose Minima</label>
                  <input value={form.doseMinima || ""} onChange={e => setForm({ ...form, doseMinima: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={labelStyle}>Dose Media</label>
                  <input value={form.doseMedia || ""} onChange={e => setForm({ ...form, doseMedia: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={labelStyle}>Dose Maxima</label>
                  <input value={form.doseMaxima || ""} onChange={e => setForm({ ...form, doseMaxima: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={labelStyle}>Unidade (min/media/max)</label>
                  <select
                    value={form.unidadeDose || ""}
                    onChange={e => setForm({ ...form, unidadeDose: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    {UNIDADES_DOSE.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {fields.map(f => (
              <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: f.type === "textarea" ? "span 3" : undefined }}>
                <label style={labelStyle}>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    rows={2} style={{ ...inputStyle, resize: "none" }} />
                ) : (f as any).options ? (
                  <select value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={inputStyle}>
                    {(f as any).options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type || "text"} value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                    style={inputStyle} />
                )}
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ ...subHeadingStyle, marginBottom: 8 }}>Beneficios</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {beneficioFields.map(f => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: `1px solid ${PW.border}` }}>
            <button className="sub-btn" style={{ ...btnPrimario, flex: 1 }} onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : isCreate ? "Cadastrar Substancia" : "Salvar Alteracoes"}</button>
            <button className="sub-btn" style={btnOutline} onClick={onClose}>Cancelar</button>
            {!isCreate && (
              <button className="sub-btn" style={btnDanger} onClick={onDelete}><Trash2 style={{ width: 13, height: 13 }} /> Excluir</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Substancias() {
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [viaFiltro, setViaFiltro] = useState("Todos");
  const [editing, setEditing] = useState<Substancia | null>(null);
  const qc = useQueryClient();

  // Deep-link: /substancias?novo=1 ja abre o modal de cadastro (atalho/share).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("novo") === "1") setEditing(novaSubstanciaVazia());
  }, []);

  const { data: substancias = [], isLoading } = useQuery<Substancia[]>({
    queryKey: ["substancias", search, categoriaFiltro, viaFiltro],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoriaFiltro !== "Todos") params.set("categoria", categoriaFiltro);
      if (viaFiltro !== "Todos") params.set("via", viaFiltro);
      const res = await apiFetch(`/api/substancias?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar substancias");
      return res.json();
    },
  });

  const viaCount = substancias.reduce((acc, s) => {
    acc[s.via] = (acc[s.via] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Layout>
      <style>{SUB_CSS}</style>
      <div style={{ padding: 24, minHeight: "100%", background: PW.bg, color: PW.text, fontFamily: MONO }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Cabecalho */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderLeft: `3px solid ${PW.ciano}`, paddingLeft: 14 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.04em", color: PW.text, margin: 0 }}>
                SUBSTANCIAS PAWARDS
              </h1>
              <p style={{ fontSize: 12, color: PW.t2, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
                Catalogo unificado de substancias para sessoes (IV, IM, Implantes)
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: PW.t2 }}>
                <FlaskConical style={{ width: 18, height: 18, color: PW.ciano }} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{substancias.length} substancias</span>
              </div>
              <button className="sub-btn" style={btnPrimario} onClick={() => setEditing(novaSubstanciaVazia())}>
                <Plus style={{ width: 14, height: 14 }} /> Nova Substancia
              </button>
            </div>
          </div>

          {/* Painel de filtros */}
          <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0, padding: 16 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: PW.muted }} />
                <input
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 34 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIA_FILTERS.map((cat) => (
                  <ToggleBtn key={cat} ativo={categoriaFiltro === cat} onClick={() => setCategoriaFiltro(cat)}>
                    {cat === "Todos" ? "Todos" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </ToggleBtn>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <ToggleBtn ativo={viaFiltro === "Todos"} onClick={() => setViaFiltro("Todos")}>Todas Vias</ToggleBtn>
              {Object.entries(VIA_LABELS).map(([key, label]) => (
                <ToggleBtn key={key} ativo={viaFiltro === key} onClick={() => setViaFiltro(key)}>
                  {label} {viaCount[key] ? `(${viaCount[key]})` : ""}
                </ToggleBtn>
              ))}
            </div>
          </section>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: PW.muted, fontSize: 13, fontFamily: MONO }}>Carregando...</div>
          ) : substancias.length === 0 ? (
            <section style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0, padding: "48px 24px", textAlign: "center" }}>
              <FlaskConical style={{ width: 48, height: 48, margin: "0 auto 16px", color: PW.muted }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: PW.text, margin: "0 0 4px" }}>Nenhuma substancia encontrada</h3>
              <p style={{ fontSize: 12, color: PW.muted, margin: 0 }}>Ajuste os filtros ou adicione novas substancias</p>
            </section>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {substancias.map((sub) => (
                <SubstanciaCard key={sub.id} sub={sub} onEdit={setEditing} />
              ))}
            </div>
          )}

          <div style={{ fontSize: 10, color: PW.muted, textAlign: "center", paddingTop: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Developed and Supervised by PADCON
          </div>
        </div>

        {editing && (
          <SubstanciaEditModal
            item={editing}
            onClose={() => setEditing(null)}
            onSave={async (data) => {
              const isCreate = editing.id === 0;
              try {
                const res = await apiFetch(
                  isCreate ? `/api/substancias` : `/api/substancias/${editing.id}`,
                  {
                    method: isCreate ? "POST" : "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  },
                );
                if (!res.ok) { alert(isCreate ? "Erro ao cadastrar substancia" : "Erro ao salvar substancia"); return; }
                setEditing(null);
                qc.invalidateQueries({ queryKey: ["substancias"] });
              } catch { alert("Erro de conexao"); }
            }}
            onDelete={async () => {
              if (!confirm("Excluir esta substancia permanentemente?")) return;
              try {
                const res = await apiFetch(`/api/substancias/${editing.id}`, { method: "DELETE" });
                if (!res.ok) { alert("Erro ao excluir"); return; }
                setEditing(null);
                qc.invalidateQueries({ queryKey: ["substancias"] });
              } catch { alert("Erro de conexao"); }
            }}
          />
        )}
      </div>
    </Layout>
  );
}
