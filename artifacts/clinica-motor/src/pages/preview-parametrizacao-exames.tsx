import { useState, useMemo } from "react";

const NAVY = "#0B1220";
const NAVY_2 = "#0F1830";
const NAVY_3 = "#162244";
const GOLD = "#D4AF37";
const CYAN = "#5EE6E6";
const TEXT = "#E6ECF5";
const MUTED = "#7C89A8";

const ZONA_CORES_NORMAL = {
  critInf: "#7A1F1F",
  tercoMin: "#2E8B57",
  tercoMed: "#D4AF37",
  tercoMax: "#E07A1F",
  critSup: "#7A1F1F",
};
const ZONA_CORES_INVERTIDA = {
  critInf: "#7A1F1F",
  tercoMin: "#E07A1F",
  tercoMed: "#D4AF37",
  tercoMax: "#2E8B57",
  critSup: "#7A1F1F",
};

const NOMES_PADRAO = {
  critInf: "FAIXA CRÍTICA INFERIOR",
  tercoMin: "TERÇO MÍNIMO INFERIOR",
  tercoMed: "TERÇO MÉDIO",
  tercoMax: "TERÇO MÁXIMO SUPERIOR",
  critSup: "FAIXA CRÍTICA SUPERIOR",
};

type Exame = {
  id: string;
  nome: string;
  unidade: string;
  valor: number;
  min: number;
  max: number;
  critInf: number;
  critSup: number;
  invertido: boolean;
  personalizado: boolean;
  nomes: typeof NOMES_PADRAO;
  cores: typeof ZONA_CORES_NORMAL;
};

const EXAMES_SEED: Exame[] = [
  { id: "glic", nome: "GLICOSE EM JEJUM", unidade: "mg/dL", valor: 100, min: 60, max: 99, critInf: 40, critSup: 180, invertido: false, personalizado: false, nomes: NOMES_PADRAO, cores: ZONA_CORES_NORMAL },
  { id: "ureia", nome: "UREIA", unidade: "mg/dL", valor: 40, min: 0, max: 50, critInf: -1, critSup: 80, invertido: true, personalizado: false, nomes: NOMES_PADRAO, cores: ZONA_CORES_INVERTIDA },
  { id: "creat", nome: "CREATININA", unidade: "mg/dL", valor: 1.1, min: 0.6, max: 1.2, critInf: 0.3, critSup: 2.0, invertido: false, personalizado: false, nomes: NOMES_PADRAO, cores: ZONA_CORES_NORMAL },
  { id: "ctot", nome: "COLESTEROL TOTAL", unidade: "mg/dL", valor: 195, min: 150, max: 190, critInf: 100, critSup: 240, invertido: false, personalizado: false, nomes: NOMES_PADRAO, cores: ZONA_CORES_NORMAL },
  { id: "hdl", nome: "HDL", unidade: "mg/dL", valor: 48, min: 40, max: 80, critInf: 25, critSup: 120, invertido: true, personalizado: false, nomes: NOMES_PADRAO, cores: ZONA_CORES_INVERTIDA },
  { id: "ldl", nome: "LDL", unidade: "mg/dL", valor: 140, min: 50, max: 130, critInf: 20, critSup: 190, invertido: false, personalizado: false, nomes: NOMES_PADRAO, cores: ZONA_CORES_NORMAL },
  { id: "tsh", nome: "TSH", unidade: "µUI/mL", valor: 2.8, min: 0.4, max: 4.0, critInf: 0.1, critSup: 10.0, invertido: false, personalizado: false, nomes: NOMES_PADRAO, cores: ZONA_CORES_NORMAL },
  { id: "vitd", nome: "VITAMINA D (25-OH)", unidade: "ng/mL", valor: 22, min: 30, max: 60, critInf: 10, critSup: 100, invertido: true, personalizado: false, nomes: NOMES_PADRAO, cores: ZONA_CORES_INVERTIDA },
  { id: "ferr", nome: "FERRITINA", unidade: "ng/mL", valor: 320, min: 30, max: 300, critInf: 10, critSup: 500, invertido: false, personalizado: true, nomes: NOMES_PADRAO, cores: ZONA_CORES_NORMAL },
  { id: "hb", nome: "HEMOGLOBINA", unidade: "g/dL", valor: 14.2, min: 13.0, max: 17.0, critInf: 8.0, critSup: 20.0, invertido: false, personalizado: false, nomes: NOMES_PADRAO, cores: ZONA_CORES_NORMAL },
];

function classificarZona(e: Exame): { key: keyof typeof NOMES_PADRAO; cor: string; nome: string } {
  const { valor, min, max, critInf, critSup, cores, nomes } = e;
  const terco = (max - min) / 3;
  if (valor < min) return { key: "critInf", cor: cores.critInf, nome: nomes.critInf };
  if (valor > max) return { key: "critSup", cor: cores.critSup, nome: nomes.critSup };
  if (valor < min + terco) return { key: "tercoMin", cor: cores.tercoMin, nome: nomes.tercoMin };
  if (valor < min + 2 * terco) return { key: "tercoMed", cor: cores.tercoMed, nome: nomes.tercoMed };
  return { key: "tercoMax", cor: cores.tercoMax, nome: nomes.tercoMax };
}

function Regua({ exame, altura = 32 }: { exame: Exame; altura?: number }) {
  const { min, max, critInf, critSup, valor, cores } = exame;
  const total = critSup - critInf;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - critInf) / total) * 100));
  const terco = (max - min) / 3;
  const stops = [
    { from: critInf, to: min, cor: cores.critInf },
    { from: min, to: min + terco, cor: cores.tercoMin },
    { from: min + terco, to: min + 2 * terco, cor: cores.tercoMed },
    { from: min + 2 * terco, to: max, cor: cores.tercoMax },
    { from: max, to: critSup, cor: cores.critSup },
  ];
  const valorPct = pct(valor);
  return (
    <div style={{ position: "relative", width: "100%", height: altura }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", border: `1px solid ${NAVY_3}` }}>
        {stops.map((s, i) => (
          <div key={i} style={{ flex: s.to - s.from, background: s.cor, opacity: 0.92 }} />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: `${valorPct}%`,
          top: -4,
          bottom: -4,
          width: 2,
          background: CYAN,
          boxShadow: `0 0 6px ${CYAN}, 0 0 12px ${CYAN}`,
          transform: "translateX(-1px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${valorPct}%`,
          top: -10,
          transform: "translateX(-50%)",
          width: 10,
          height: 10,
          background: CYAN,
          boxShadow: `0 0 8px ${CYAN}`,
        }}
      />
    </div>
  );
}

function ReguaTicks({ exame }: { exame: Exame }) {
  const { min, max, critInf, critSup } = exame;
  const total = critSup - critInf;
  const pct = (v: number) => ((v - critInf) / total) * 100;
  const terco = (max - min) / 3;
  const marks = [
    { v: critInf, label: critInf },
    { v: min, label: min },
    { v: +(min + terco).toFixed(2), label: +(min + terco).toFixed(2) },
    { v: +(min + 2 * terco).toFixed(2), label: +(min + 2 * terco).toFixed(2) },
    { v: max, label: max },
    { v: critSup, label: critSup },
  ];
  return (
    <div style={{ position: "relative", height: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: MUTED }}>
      {marks.map((m, i) => (
        <span key={i} style={{ position: "absolute", left: `${pct(m.v)}%`, transform: "translateX(-50%)" }}>
          {m.label}
        </span>
      ))}
    </div>
  );
}

function LinhaExame({
  exame,
  expandido,
  onToggleExpandir,
  onChange,
}: {
  exame: Exame;
  expandido: boolean;
  onToggleExpandir: () => void;
  onChange: (next: Exame) => void;
}) {
  const zona = useMemo(() => classificarZona(exame), [exame]);
  const status =
    zona.key === "critInf" || zona.key === "critSup"
      ? { label: "CRÍTICO", cor: "#FF4D4D" }
      : zona.key === "tercoMed"
      ? { label: "ÓTIMO", cor: CYAN }
      : { label: "ATENÇÃO", cor: GOLD };

  const setCampo = <K extends keyof Exame>(k: K, v: Exame[K]) => onChange({ ...exame, [k]: v });
  const setNome = (k: keyof typeof NOMES_PADRAO, v: string) =>
    onChange({ ...exame, nomes: { ...exame.nomes, [k]: v.toUpperCase() } });
  const setCor = (k: keyof typeof ZONA_CORES_NORMAL, v: string) =>
    onChange({ ...exame, cores: { ...exame.cores, [k]: v } });

  return (
    <div style={{ borderTop: `1px solid ${NAVY_3}` }}>
      {/* LINHA PRINCIPAL — alta densidade */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 220px 120px 1fr 110px 130px 130px 40px",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: TEXT,
          background: expandido ? NAVY_2 : "transparent",
        }}
      >
        <button
          onClick={onToggleExpandir}
          title="PARAMETRIZAR"
          style={{
            width: 28,
            height: 28,
            background: expandido ? GOLD : "transparent",
            color: expandido ? NAVY : GOLD,
            border: `1px solid ${GOLD}`,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ⚙
        </button>

        <div style={{ textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>{exame.nome}</div>

        <div>
          <span style={{ color: GOLD, fontSize: 16, fontWeight: 700 }}>{exame.valor}</span>{" "}
          <span style={{ color: MUTED }}>{exame.unidade}</span>
        </div>

        <div>
          <Regua exame={exame} />
          <ReguaTicks exame={exame} />
        </div>

        <div style={{ color: status.cor, fontWeight: 700, letterSpacing: 0.6 }}>● {status.label}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Toggle
            ativo={exame.personalizado}
            onClick={() => setCampo("personalizado", !exame.personalizado)}
            labelOff="PADRÃO"
            labelOn="PERSONAL."
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Toggle
            ativo={exame.invertido}
            onClick={() => {
              const novasCores = !exame.invertido ? ZONA_CORES_INVERTIDA : ZONA_CORES_NORMAL;
              onChange({ ...exame, invertido: !exame.invertido, cores: exame.personalizado ? exame.cores : novasCores });
            }}
            labelOff="NORMAL"
            labelOn="INVERT."
          />
        </div>

        <div style={{ textAlign: "right", color: MUTED, fontSize: 16 }}>{expandido ? "▾" : "▸"}</div>
      </div>

      {/* PAINEL EXPANDIDO INLINE */}
      {expandido && (
        <div
          style={{
            background: NAVY_2,
            borderTop: `1px solid ${NAVY_3}`,
            padding: "16px 16px 20px 60px",
            display: "grid",
            gridTemplateColumns: "280px 1fr 160px",
            gap: 20,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: TEXT,
          }}
        >
          {/* Coluna 1 — referências */}
          <div>
            <div style={{ color: GOLD, letterSpacing: 0.8, marginBottom: 10, fontSize: 10 }}>
              ▸ REFERÊNCIAS DE BIOMARCADOR
            </div>
            <CampoNumero label="MÍN. REFERÊNCIA" value={exame.min} onChange={(v) => setCampo("min", v)} />
            <CampoNumero label="MÁX. REFERÊNCIA" value={exame.max} onChange={(v) => setCampo("max", v)} />
            <CampoNumero label="LIMITE CRÍT. INF." value={exame.critInf} onChange={(v) => setCampo("critInf", v)} />
            <CampoNumero label="LIMITE CRÍT. SUP." value={exame.critSup} onChange={(v) => setCampo("critSup", v)} />
            <div style={{ marginTop: 10, color: MUTED, fontSize: 10 }}>
              UNIDADE:&nbsp;<span style={{ color: TEXT }}>{exame.unidade}</span>
            </div>
            <div style={{ marginTop: 6, color: MUTED, fontSize: 10 }}>
              ORIENTAÇÃO:&nbsp;
              <span style={{ color: CYAN }}>
                {exame.invertido ? "MENOR É MELHOR (INVERTIDA)" : "MAIOR/CENTRAL É MELHOR (NORMAL)"}
              </span>
            </div>
          </div>

          {/* Coluna 2 — nomenclatura + cores das 5 zonas */}
          <div>
            <div style={{ color: GOLD, letterSpacing: 0.8, marginBottom: 10, fontSize: 10 }}>
              ▸ NOMENCLATURA E CORES DAS 5 ZONAS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 140px", gap: 8, marginBottom: 4 }}>
              <span style={{ color: MUTED, fontSize: 9 }}>COR</span>
              <span style={{ color: MUTED, fontSize: 9 }}>NOMENCLATURA</span>
              <span style={{ color: MUTED, fontSize: 9 }}>FAIXA CALCULADA</span>
            </div>
            {(
              [
                { k: "critSup" as const, calc: `> ${exame.max}  (até ${exame.critSup})` },
                { k: "tercoMax" as const, calc: `${(exame.min + 2 * ((exame.max - exame.min) / 3)).toFixed(2)} — ${exame.max}` },
                { k: "tercoMed" as const, calc: `${(exame.min + (exame.max - exame.min) / 3).toFixed(2)} — ${(exame.min + 2 * ((exame.max - exame.min) / 3)).toFixed(2)}` },
                { k: "tercoMin" as const, calc: `${exame.min} — ${(exame.min + (exame.max - exame.min) / 3).toFixed(2)}` },
                { k: "critInf" as const, calc: `< ${exame.min}  (até ${exame.critInf})` },
              ]
            ).map((row) => (
              <div
                key={row.k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr 140px",
                  gap: 8,
                  alignItems: "center",
                  padding: "4px 0",
                }}
              >
                <input
                  type="color"
                  value={exame.cores[row.k]}
                  onChange={(e) => setCor(row.k, e.target.value)}
                  disabled={!exame.personalizado}
                  style={{
                    width: 28,
                    height: 22,
                    border: `1px solid ${NAVY_3}`,
                    background: NAVY,
                    cursor: exame.personalizado ? "pointer" : "not-allowed",
                    padding: 0,
                  }}
                />
                <input
                  type="text"
                  value={exame.nomes[row.k]}
                  onChange={(e) => setNome(row.k, e.target.value)}
                  disabled={!exame.personalizado}
                  style={{
                    background: NAVY,
                    color: TEXT,
                    border: `1px solid ${NAVY_3}`,
                    padding: "4px 8px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                />
                <span style={{ color: MUTED, fontSize: 10 }}>{row.calc} {exame.unidade}</span>
              </div>
            ))}
          </div>

          {/* Coluna 3 — ações */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: GOLD, letterSpacing: 0.8, marginBottom: 4, fontSize: 10 }}>▸ AÇÕES</div>
            <button
              style={{
                background: CYAN,
                color: NAVY,
                border: "none",
                padding: "10px 12px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.8,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              SALVAR PARÂMETROS
            </button>
            <button
              onClick={() => {
                onChange({
                  ...exame,
                  personalizado: false,
                  nomes: NOMES_PADRAO,
                  cores: exame.invertido ? ZONA_CORES_INVERTIDA : ZONA_CORES_NORMAL,
                });
              }}
              style={{
                background: "transparent",
                color: GOLD,
                border: `1px solid ${GOLD}`,
                padding: "10px 12px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.8,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              RESTAURAR PADRÃO
            </button>
            <div style={{ color: MUTED, fontSize: 9, lineHeight: 1.5, marginTop: 6 }}>
              ALTERAÇÕES FICAM AUDITADAS COM USUÁRIO + TIMESTAMP NA TABELA{" "}
              <span style={{ color: TEXT }}>parametrizacao_exames_individual</span>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ ativo, onClick, labelOff, labelOn }: { ativo: boolean; onClick: () => void; labelOff: string; labelOn: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        background: NAVY,
        border: `1px solid ${ativo ? CYAN : GOLD}`,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: 0.6,
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          padding: "5px 9px",
          background: !ativo ? GOLD : "transparent",
          color: !ativo ? NAVY : MUTED,
          fontWeight: 700,
        }}
      >
        {labelOff}
      </span>
      <span
        style={{
          padding: "5px 9px",
          background: ativo ? CYAN : "transparent",
          color: ativo ? NAVY : MUTED,
          fontWeight: 700,
        }}
      >
        {labelOn}
      </span>
    </button>
  );
}

function CampoNumero({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ color: MUTED, fontSize: 10 }}>{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          background: NAVY,
          color: GOLD,
          border: `1px solid ${NAVY_3}`,
          padding: "5px 8px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          fontWeight: 700,
          textAlign: "right",
        }}
      />
    </div>
  );
}

export default function PreviewParametrizacaoExames() {
  const [exames, setExames] = useState<Exame[]>(EXAMES_SEED);
  const [expandido, setExpandido] = useState<string | null>("glic");

  const stats = useMemo(() => {
    let critico = 0,
      atencao = 0,
      otimo = 0;
    exames.forEach((e) => {
      const z = classificarZona(e).key;
      if (z === "critInf" || z === "critSup") critico++;
      else if (z === "tercoMed") otimo++;
      else atencao++;
    });
    return { critico, atencao, otimo };
  }, [exames]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: NAVY,
        color: TEXT,
        fontFamily: "'JetBrains Mono', monospace",
        padding: "24px 28px 60px",
      }}
    >
      {/* FAIXA SUPERIOR INSTITUCIONAL */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "12px 18px",
          background: NAVY_2,
          border: `1px solid ${NAVY_3}`,
          borderLeft: `3px solid ${GOLD}`,
          marginBottom: 16,
        }}
      >
        <img
          src="/logo-pawards-medcore-transparent.png"
          alt="PAWARDS MEDCORE"
          style={{ height: 56, width: "auto", display: "block" }}
        />
        <div style={{ flex: 1, borderLeft: `1px solid ${NAVY_3}`, paddingLeft: 18 }}>
          <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.4, marginBottom: 2 }}>
            PAWARDS MEDCORE<span style={{ color: GOLD }}>®</span> · PADCON PLATFORM
            <span style={{ color: GOLD }}>®</span> · MOTOR CLÍNICO
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1.2, color: TEXT }}>
            EXAMES E BIOMARCADORES — PAINEL DE PARAMETRIZAÇÃO INDIVIDUAL
          </div>
          <div style={{ color: MUTED, fontSize: 10, marginTop: 3, letterSpacing: 0.6 }}>
            PACIENTE EXEMPLO ·{" "}
            <span style={{ color: GOLD }}>CYLLAS SALERNO ELIA JUNIOR</span> · 46 ANOS · ÚLTIMA COLETA 21/05/2026
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <KPI label="CRÍTICOS" valor={stats.critico} cor="#FF4D4D" />
          <KPI label="ATENÇÃO" valor={stats.atencao} cor={GOLD} />
          <KPI label="ÓTIMOS" valor={stats.otimo} cor={CYAN} />
          <KPI label="TOTAL" valor={exames.length} cor={TEXT} />
        </div>
      </div>

      {/* LEGENDA */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          padding: "10px 14px",
          background: NAVY_2,
          border: `1px solid ${NAVY_3}`,
          marginBottom: 14,
          fontSize: 10,
          letterSpacing: 0.6,
          color: MUTED,
        }}
      >
        <span style={{ color: GOLD, fontWeight: 700 }}>LEGENDA DAS ZONAS:</span>
        {[
          { c: ZONA_CORES_NORMAL.critInf, t: "FAIXA CRÍTICA INFERIOR" },
          { c: ZONA_CORES_NORMAL.tercoMin, t: "TERÇO MÍN. INF." },
          { c: ZONA_CORES_NORMAL.tercoMed, t: "TERÇO MÉDIO" },
          { c: ZONA_CORES_NORMAL.tercoMax, t: "TERÇO MÁX. SUP." },
          { c: ZONA_CORES_NORMAL.critSup, t: "FAIXA CRÍTICA SUPERIOR" },
        ].map((z, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 10, background: z.c, border: `1px solid ${NAVY_3}` }} />
            {z.t}
          </span>
        ))}
        <span style={{ marginLeft: "auto", color: CYAN, fontWeight: 700 }}>● VALOR ATUAL DO PACIENTE</span>
      </div>

      {/* CABEÇALHO DA "PLANILHA" */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 220px 120px 1fr 110px 130px 130px 40px",
          gap: 12,
          padding: "10px 16px",
          background: NAVY_3,
          color: GOLD,
          fontSize: 10,
          letterSpacing: 0.8,
          fontWeight: 700,
        }}
      >
        <span>CFG</span>
        <span>EXAME</span>
        <span>VALOR</span>
        <span>RÉGUA DE FAIXAS (CRÍT. INF · TERÇOS · CRÍT. SUP)</span>
        <span>STATUS</span>
        <span>MODELO</span>
        <span>ORIENTAÇÃO</span>
        <span></span>
      </div>

      {/* PLANILHA DE EXAMES */}
      <div style={{ background: NAVY_2, border: `1px solid ${NAVY_3}`, borderTop: "none" }}>
        {exames.map((e, idx) => (
          <LinhaExame
            key={e.id}
            exame={e}
            expandido={expandido === e.id}
            onToggleExpandir={() => setExpandido(expandido === e.id ? null : e.id)}
            onChange={(next) => {
              const novo = [...exames];
              novo[idx] = next;
              setExames(novo);
            }}
          />
        ))}
      </div>

      {/* RODAPÉ TÉCNICO */}
      <div
        style={{
          marginTop: 20,
          padding: "12px 16px",
          background: NAVY_2,
          border: `1px solid ${NAVY_3}`,
          fontSize: 10,
          letterSpacing: 0.4,
          color: MUTED,
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <span>
          <span style={{ color: GOLD }}>MODELO:</span> PADRÃO INSTITUCIONAL =&gt; herdado de{" "}
          <span style={{ color: TEXT }}>parametros_referencia</span> (ADMIN GLOBAL).
        </span>
        <span>
          <span style={{ color: GOLD }}>PERSONALIZADO:</span> sobrescreve nomenclatura, cores e limites APENAS deste paciente/unidade.
        </span>
        <span>
          <span style={{ color: GOLD }}>ORIENTAÇÃO INVERTIDA:</span> aplicado quando "menor é melhor" (ex.: UREIA, LDL) ou
          "maior é melhor" (ex.: HDL, VITAMINA D).
        </span>
      </div>
    </div>
  );
}

function KPI({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div
      style={{
        border: `1px solid ${NAVY_3}`,
        padding: "8px 14px",
        minWidth: 92,
        background: NAVY_2,
        textAlign: "center",
      }}
    >
      <div style={{ color: MUTED, fontSize: 9, letterSpacing: 0.8 }}>{label}</div>
      <div style={{ color: cor, fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{valor}</div>
    </div>
  );
}
