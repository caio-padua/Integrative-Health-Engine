import { useState, useMemo } from "react";

const GROUPS = [
  {
    id: "cardio", icon: "🫀", name: "CARDÍACAS",
    items: [
      { name: "Hipertensão arterial (HAS)", prev: 5 },
      { name: "Arritmia cardíaca", prev: 3 },
      { name: "Insuficiência cardíaca", prev: 3 },
      { name: "Doença arterial coronariana", prev: 3 },
      { name: "Fibrilação atrial", prev: 3 },
      { name: "Infarto (histórico)", prev: 2 },
      { name: "AVC / acidente vascular", prev: 2 },
      { name: "Trombose venosa profunda", prev: 2 },
      { name: "Valvulopatia", prev: 2 },
      { name: "Angina pectoris", prev: 2 },
      { name: "Varizes / insuf. venosa", prev: 4 },
    ]
  },
  {
    id: "meta", icon: "🧪", name: "METABÓLICAS",
    items: [
      { name: "Obesidade", prev: 5 },
      { name: "Resistência insulínica", prev: 5 },
      { name: "Diabetes tipo 2", prev: 4 },
      { name: "Pré-diabetes", prev: 4 },
      { name: "Síndrome metabólica", prev: 4 },
      { name: "Hipotireoidismo", prev: 4 },
      { name: "Hashimoto", prev: 3 },
      { name: "Esteatose hepática", prev: 4 },
      { name: "Deficiência de Vit. D", prev: 5 },
      { name: "Deficiência de B12", prev: 4 },
      { name: "Deficiência de ferro", prev: 4 },
      { name: "Hiperuricemia / gota", prev: 3 },
    ]
  },
  {
    id: "neuro", icon: "🧠", name: "NEUROPSIQUIÁTRICAS",
    items: [
      { name: "Ansiedade (TAG)", prev: 5 },
      { name: "Depressão", prev: 4 },
      { name: "Insônia", prev: 4 },
      { name: "TDAH", prev: 3 },
      { name: "Enxaqueca crônica", prev: 4 },
      { name: "Síndrome do pânico", prev: 3 },
      { name: "TOC", prev: 2 },
      { name: "Burnout / esgotamento", prev: 4 },
      { name: "Bruxismo", prev: 3 },
    ]
  },
  {
    id: "gi", icon: "🫁", name: "GASTRO-INTESTINAIS",
    items: [
      { name: "Refluxo (DRGE)", prev: 5 },
      { name: "Gastrite", prev: 4 },
      { name: "Constipação crônica", prev: 4 },
      { name: "Distensão abdominal", prev: 4 },
      { name: "Síndrome do intestino irritável", prev: 4 },
      { name: "Disbiose intestinal", prev: 3 },
      { name: "Intolerância à lactose", prev: 4 },
    ]
  },
  {
    id: "onco", icon: "🎗️", name: "ONCOLÓGICAS",
    items: [
      { name: "Câncer de mama", prev: 4 },
      { name: "Câncer de próstata", prev: 4 },
      { name: "Câncer colorretal", prev: 3 },
      { name: "Câncer de pele", prev: 3 },
      { name: "Câncer de tireoide", prev: 3 },
      { name: "Câncer de pulmão", prev: 3 },
      { name: "Linfoma", prev: 2 },
      { name: "Leucemia", prev: 2 },
    ]
  },
  {
    id: "gine", icon: "♀️", name: "GINECO / ANDRO / SEXUAL",
    items: [
      { name: "SOP (ovário policístico)", prev: 4 },
      { name: "Endometriose", prev: 3 },
      { name: "Menopausa / climatério", prev: 4 },
      { name: "TPM importante", prev: 4 },
      { name: "Hipogonadismo masculino", prev: 3 },
      { name: "Disfunção erétil", prev: 3 },
      { name: "Baixa libido", prev: 4 },
    ]
  },
  {
    id: "msk", icon: "🦴", name: "MUSCULOESQUELÉTICAS",
    items: [
      { name: "Lombalgia crônica", prev: 5 },
      { name: "Osteoartrite / artrose", prev: 4 },
      { name: "Osteoporose", prev: 3 },
      { name: "Sarcopenia", prev: 3 },
      { name: "Hérnia de disco", prev: 3 },
      { name: "Fibromialgia", prev: 3 },
    ]
  },
];

const EXAMS = [
  { group: "GLICÊMICO", name: "Glicose Jejum", unit: "mg/dL", min: 70, max: 99, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 102 }, { d: "Out/25", v: 95 }, { d: "Mar/26", v: 88 }] },
  { group: "GLICÊMICO", name: "HbA1c", unit: "%", min: 4, max: 5.6, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 5.8 }, { d: "Out/25", v: 5.5 }, { d: "Mar/26", v: 5.3 }] },
  { group: "GLICÊMICO", name: "Insulina", unit: "µUI/mL", min: 2, max: 10, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 18 }, { d: "Out/25", v: 14 }, { d: "Mar/26", v: 11 }] },
  { group: "GLICÊMICO", name: "HOMA-IR", unit: "índice", min: 0.5, max: 2, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 4.2 }, { d: "Out/25", v: 3.2 }, { d: "Mar/26", v: 2.4 }] },
  { group: "LIPÍDICO", name: "Colesterol Total", unit: "mg/dL", min: 120, max: 190, tercoExcelente: "MEDIO", dates: [{ d: "Jul/25", v: 218 }, { d: "Out/25", v: 198 }, { d: "Mar/26", v: 174 }] },
  { group: "LIPÍDICO", name: "HDL", unit: "mg/dL", min: 45, max: 80, tercoExcelente: "SUPERIOR", dates: [{ d: "Jul/25", v: 42 }, { d: "Out/25", v: 48 }, { d: "Mar/26", v: 51 }] },
  { group: "LIPÍDICO", name: "LDL", unit: "mg/dL", min: 50, max: 100, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 142 }, { d: "Out/25", v: 125 }, { d: "Mar/26", v: 109 }] },
  { group: "TIREOIDE", name: "TSH", unit: "µUI/mL", min: 0.4, max: 4, tercoExcelente: "MEDIO", dates: [{ d: "Jul/25", v: 2.4 }, { d: "Out/25", v: 1.9 }, { d: "Mar/26", v: 1.68 }] },
  { group: "TIREOIDE", name: "T4 Livre", unit: "ng/dL", min: 0.8, max: 1.8, tercoExcelente: "MEDIO", dates: [{ d: "Jul/25", v: 1.05 }, { d: "Out/25", v: 1.22 }, { d: "Mar/26", v: 1.44 }] },
  { group: "HEPÁTICO", name: "AST (TGO)", unit: "U/L", min: 10, max: 35, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 30 }, { d: "Out/25", v: 34 }, { d: "Mar/26", v: 38 }] },
  { group: "HEPÁTICO", name: "ALT (TGP)", unit: "U/L", min: 10, max: 40, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 48 }, { d: "Out/25", v: 62 }, { d: "Mar/26", v: 85 }] },
  { group: "HEPÁTICO", name: "GGT", unit: "U/L", min: 10, max: 60, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 72 }, { d: "Out/25", v: 110 }, { d: "Mar/26", v: 170 }] },
  { group: "HORMÔNIOS", name: "Testosterona Total", unit: "ng/dL", min: 300, max: 850, tercoExcelente: "SUPERIOR", dates: [{ d: "Jul/25", v: 410 }, { d: "Out/25", v: 520 }, { d: "Mar/26", v: 475 }] },
  { group: "VITAMINAS", name: "Vitamina D", unit: "ng/mL", min: 40, max: 80, tercoExcelente: "SUPERIOR", dates: [{ d: "Jul/25", v: 22 }, { d: "Out/25", v: 34 }, { d: "Mar/26", v: 48 }] },
  { group: "VITAMINAS", name: "Vitamina B12", unit: "pg/mL", min: 400, max: 900, tercoExcelente: "SUPERIOR", dates: [{ d: "Jul/25", v: 320 }, { d: "Out/25", v: 640 }, { d: "Mar/26", v: 1075 }] },
  { group: "INFLAMATÓRIO", name: "PCR Ultra", unit: "mg/L", min: 0, max: 1, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 1.8 }, { d: "Out/25", v: 1.1 }, { d: "Mar/26", v: 0.8 }] },
  { group: "INFLAMATÓRIO", name: "Homocisteína", unit: "µmol/L", min: 5, max: 9, tercoExcelente: "INFERIOR", dates: [{ d: "Jul/25", v: 11.5 }, { d: "Out/25", v: 10.4 }, { d: "Mar/26", v: 13 }] },
];

function classify(v, min, max) {
  if (v < min) return { zone: "P001", label: "PREOCUPANTE", color: "#7c3aed", bg: "#f3e8ff" };
  if (v > max) return { zone: "P005", label: "ALERTA", color: "#ef4444", bg: "#fef2f2" };
  const range = max - min;
  const third = range / 3;
  if (v <= min + third) return { zone: "P002", label: "INFERIOR", color: "#ca8a04", bg: "#fefce8" };
  if (v <= min + 2 * third) return { zone: "P003", label: "MÉDIO", color: "#16a34a", bg: "#f0fdf4" };
  return { zone: "P004", label: "SUPERIOR", color: "#2563eb", bg: "#eff6ff" };
}

function trend(curr, prev) {
  if (!prev) return "";
  const delta = ((curr - prev) / prev) * 100;
  if (Math.abs(delta) < 2) return "→";
  return delta > 0 ? (delta > 20 ? "↑↑" : "↑") : (delta < -20 ? "↓↓" : "↓");
}

export default function PawardsDashDemo() {
  const [tab, setTab] = useState("anamnese");
  const [groupIdx, setGroupIdx] = useState(0);
  const [selections, setSelections] = useState({});
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("all");

  const group = GROUPS[groupIdx];

  const filteredItems = useMemo(() => {
    if (!search) return group.items;
    const s = search.toLowerCase();
    const all = GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.name })));
    return all.filter(i => i.name.toLowerCase().includes(s));
  }, [search, group]);

  const totalSelected = Object.values(selections).filter(v => v !== "none").length;

  const toggleSelection = (name) => {
    setSelections(prev => {
      const curr = prev[name] || "none";
      const next = curr === "none" ? "diag" : curr === "diag" ? "possivel" : "none";
      return { ...prev, [name]: next };
    });
  };

  const progress = GROUPS.map(g => {
    const touched = g.items.some(i => (selections[i.name] || "none") !== "none");
    const skipped = g.items.every(i => (selections[i.name] || "none") === "none");
    return touched ? "done" : "pending";
  });
  const progressPct = Math.round((progress.filter(p => p === "done").length / GROUPS.length) * 100);

  const filteredExams = useMemo(() => {
    return EXAMS.filter(e => {
      if (examFilter === "all") return true;
      const last = e.dates[e.dates.length - 1];
      const c = classify(last.v, e.min, e.max);
      if (examFilter === "altered") return c.zone === "P005" || c.zone === "P001";
      if (examFilter === "attention") return c.zone === "P002" || c.zone === "P004";
      if (examFilter === "normal") return c.zone === "P003";
      return true;
    });
  }, [examFilter]);

  const examGroups = useMemo(() => {
    const g = {};
    filteredExams.forEach(e => { (g[e.group] = g[e.group] || []).push(e); });
    return Object.entries(g);
  }, [filteredExams]);

  const sectionStyle = {
    background: "#0B1220",
    color: "#e0e8f0",
    minHeight: "100vh",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    padding: 0,
  };

  return (
    <div style={sectionStyle}>
      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #0B1220 0%, #132240 100%)", padding: "20px 24px", borderBottom: "1px solid #1e3a5f" }}>
        <div style={{ fontSize: 11, color: "#5EE6E6", textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>PAWARDS MEDCORE</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 4 }}>DASHBOARD DO PACIENTE</div>
        <div style={{ fontSize: 12, color: "#6b8ab0", marginTop: 2 }}>LUCIANO PERSSINOTTO · 51A · M · PADC-2026-LUPE-001</div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e3a5f", background: "#0d1628" }}>
        {[
          { id: "anamnese", label: "ANAMNESE" },
          { id: "exames", label: "EXAMES 5 TERÇOS" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "14px 0", background: tab === t.id ? "#132240" : "transparent",
            color: tab === t.id ? "#5EE6E6" : "#4a6580", border: "none",
            borderBottom: tab === t.id ? "2px solid #5EE6E6" : "2px solid transparent",
            fontFamily: "inherit", fontSize: 12, fontWeight: 700, letterSpacing: 2,
            cursor: "pointer", textTransform: "uppercase", transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "anamnese" && (
        <div style={{ padding: "16px 20px" }}>
          {/* PROGRESS */}
          <div style={{ background: "#132240", borderRadius: 0, padding: "14px 16px", marginBottom: 16, border: "1px solid #1e3a5f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "#5EE6E6", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>PROGRESSO ANAMNESE</span>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 800 }}>{progressPct}%</span>
            </div>
            <div style={{ height: 6, background: "#1e3a5f", borderRadius: 0, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #5EE6E6, #3b82f6)", transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {GROUPS.map((g, i) => (
                <button key={g.id} onClick={() => { setGroupIdx(i); setSearch(""); }} style={{
                  padding: "4px 8px", fontSize: 10, fontWeight: 700, fontFamily: "inherit",
                  background: i === groupIdx ? "#5EE6E6" : progress[i] === "done" ? "#1e3a5f" : "#0B1220",
                  color: i === groupIdx ? "#0B1220" : progress[i] === "done" ? "#5EE6E6" : "#4a6580",
                  border: `1px solid ${i === groupIdx ? "#5EE6E6" : "#1e3a5f"}`,
                  cursor: "pointer", borderRadius: 0, letterSpacing: 1, textTransform: "uppercase",
                }}>
                  {progress[i] === "done" ? "✓ " : ""}{g.icon}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#6b8ab0", marginTop: 8 }}>
              {totalSelected} patologia{totalSelected !== 1 ? "s" : ""} selecionada{totalSelected !== 1 ? "s" : ""}
            </div>
          </div>

          {/* CATEGORY ROLLER */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setGroupIdx(Math.max(0, groupIdx - 1))} style={{
              width: 36, height: 36, background: "#132240", color: "#5EE6E6", border: "1px solid #1e3a5f",
              fontSize: 18, cursor: "pointer", fontFamily: "inherit", borderRadius: 0,
            }}>←</button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>{group.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#5EE6E6", letterSpacing: 2, textTransform: "uppercase" }}>{group.name}</div>
              <div style={{ fontSize: 10, color: "#4a6580" }}>{groupIdx + 1}/{GROUPS.length}</div>
            </div>
            <button onClick={() => setGroupIdx(Math.min(GROUPS.length - 1, groupIdx + 1))} style={{
              width: 36, height: 36, background: "#132240", color: "#5EE6E6", border: "1px solid #1e3a5f",
              fontSize: 18, cursor: "pointer", fontFamily: "inherit", borderRadius: 0,
            }}>→</button>
          </div>

          {/* SEARCH */}
          <input
            type="text" placeholder="BUSCAR PATOLOGIA... (EX: DIABETES, TIREOIDE, CANSAÇO)"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", background: "#132240", color: "#e0e8f0",
              border: "1px solid #1e3a5f", fontFamily: "inherit", fontSize: 11,
              outline: "none", marginBottom: 12, borderRadius: 0, letterSpacing: 1,
              boxSizing: "border-box",
            }}
          />

          {/* ITEMS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {(search ? filteredItems : group.items).map((item, i) => {
              const status = selections[item.name] || "none";
              const chipStyle = status === "diag"
                ? { background: "#1e40af", color: "#93c5fd", label: "DIAGNOSTICADA" }
                : status === "possivel"
                ? { background: "#854d0e", color: "#fde68a", label: "POSSÍVEL" }
                : { background: "#132240", color: "#4a6580", label: "" };

              return (
                <button key={item.name} onClick={() => toggleSelection(item.name)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: chipStyle.background,
                  border: `1px solid ${status !== "none" ? chipStyle.color + "44" : "#1e3a5f"}`,
                  cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: chipStyle.color,
                  borderRadius: 0, textAlign: "left", transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14 }}>
                      {status === "diag" ? "🔵" : status === "possivel" ? "🟡" : "☐"}
                    </span>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    {search && item.group && (
                      <span style={{ fontSize: 9, color: "#5EE6E6", opacity: 0.6 }}>{item.group}</span>
                    )}
                  </div>
                  {chipStyle.label && (
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
                      {chipStyle.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* SKIP GROUP */}
          <button onClick={() => setGroupIdx(Math.min(GROUPS.length - 1, groupIdx + 1))} style={{
            width: "100%", padding: "12px", marginTop: 12,
            background: "#0B1220", color: "#4a6580", border: "1px solid #1e3a5f",
            fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer",
            letterSpacing: 2, textTransform: "uppercase", borderRadius: 0,
          }}>
            NENHUMA DESTE GRUPO → PRÓXIMO
          </button>
        </div>
      )}

      {tab === "exames" && (
        <div style={{ padding: "16px 20px" }}>
          {/* FILTERS */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "TODOS", c: "#5EE6E6" },
              { id: "altered", label: "🔴 ALTERADOS", c: "#ef4444" },
              { id: "attention", label: "🟠 ATENÇÃO", c: "#f59e0b" },
              { id: "normal", label: "🟢 NORMAIS", c: "#22c55e" },
            ].map(f => (
              <button key={f.id} onClick={() => setExamFilter(f.id)} style={{
                padding: "8px 14px", fontSize: 10, fontWeight: 800, fontFamily: "inherit",
                background: examFilter === f.id ? f.c + "22" : "#0B1220",
                color: examFilter === f.id ? f.c : "#4a6580",
                border: `1px solid ${examFilter === f.id ? f.c : "#1e3a5f"}`,
                cursor: "pointer", borderRadius: 0, letterSpacing: 1, textTransform: "uppercase",
              }}>{f.label}</button>
            ))}
          </div>

          {/* LEGEND */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", fontSize: 10 }}>
            {[
              { color: "#7c3aed", label: "P001 PREOCUPANTE (<MIN)" },
              { color: "#ca8a04", label: "P002 INFERIOR (TERÇO 1)" },
              { color: "#16a34a", label: "P003 MÉDIO (TERÇO 2)" },
              { color: "#2563eb", label: "P004 SUPERIOR (TERÇO 3)" },
              { color: "#ef4444", label: "P005 ALERTA (>MAX)" },
            ].map(l => (
              <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, background: l.color }} />
                <span style={{ color: "#6b8ab0", letterSpacing: 1 }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* TABLE */}
          <div style={{ overflowX: "auto" }}>
            {examGroups.map(([groupName, exams]) => (
              <div key={groupName} style={{ marginBottom: 20 }}>
                <div style={{ background: "#1e3a5f", padding: "8px 14px", fontSize: 11, fontWeight: 800, color: "#5EE6E6", letterSpacing: 2, textTransform: "uppercase" }}>
                  {groupName}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#132240" }}>
                      <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, color: "#6b8ab0", fontWeight: 700, letterSpacing: 1 }}>EXAME</th>
                      {exams[0].dates.map(d => (
                        <th key={d.d} style={{ textAlign: "center", padding: "10px 8px", fontSize: 10, color: "#6b8ab0", fontWeight: 700, letterSpacing: 1 }}>{d.d.toUpperCase()}</th>
                      ))}
                      <th style={{ textAlign: "center", padding: "10px 8px", fontSize: 10, color: "#6b8ab0", fontWeight: 700, letterSpacing: 1 }}>REF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map(exam => {
                      const lastC = classify(exam.dates[exam.dates.length - 1].v, exam.min, exam.max);
                      const persistent = exam.dates.filter(d => {
                        const c = classify(d.v, exam.min, exam.max);
                        return c.zone === "P005" || c.zone === "P001";
                      }).length >= 2;

                      return (
                        <tr key={exam.name} style={{ borderBottom: "1px solid #1e3a5f22" }}>
                          <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#e0e8f0" }}>
                            {persistent ? "★ " : ""}{exam.name}
                          </td>
                          {exam.dates.map((d, i) => {
                            const c = classify(d.v, exam.min, exam.max);
                            const t = i > 0 ? trend(d.v, exam.dates[i - 1].v) : "";
                            return (
                              <td key={d.d} style={{ textAlign: "center", padding: "8px 4px" }}>
                                <span style={{
                                  display: "inline-block", padding: "4px 10px",
                                  background: c.color + "18", color: c.color,
                                  fontSize: 11, fontWeight: 800, fontFamily: "inherit",
                                  borderRadius: 0, border: `1px solid ${c.color}33`,
                                  letterSpacing: 0.5,
                                }}>
                                  {d.v} {t}
                                </span>
                              </td>
                            );
                          })}
                          <td style={{ textAlign: "center", padding: "8px", fontSize: 10, color: "#4a6580" }}>
                            {exam.min}–{exam.max}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
