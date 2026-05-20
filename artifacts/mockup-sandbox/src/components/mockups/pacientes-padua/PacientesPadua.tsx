const tk = {
  bg: "#0B1220",
  bgAlt: "#111B2E",
  bgRow: "#0E1726",
  bgRowAlt: "#0B1220",
  ink: "#E8EEF7",
  inkDim: "#9FB0C9",
  inkMute: "#6B7E9E",
  line: "#1E2A44",
  lineSoft: "#172238",
  accent: "#7AA2F7",
  accentDeep: "#3A5BB0",
  ok: "#7CC4A0",
  warn: "#E0B062",
  danger: "#D08A8A",
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: '"Inter", system-ui, -apple-system, sans-serif',
};

type Status = "ATIVO" | "INATIVO" | "EM_ATENDIMENTO" | "SEM_CONTATO";

type Paciente = {
  id: number;
  codigo: string;
  nome: string;
  cpf: string;
  telefone: string;
  nascimento: string;
  idade: number;
  ultimaSessao: string | null;
  proximaSessao: string | null;
  status: Status;
  sessoesAcum: number;
  receitasAcum: number;
};

const PACIENTES: Paciente[] = [
  { id: 3489, codigo: "PAD-2024-3489", nome: "Dayana Cristina Soares Pereira", cpf: "082.451.776-22", telefone: "(31) 99841-7720", nascimento: "1984-03-12", idade: 42, ultimaSessao: "2026-05-15", proximaSessao: "2026-05-22", status: "ATIVO", sessoesAcum: 14, receitasAcum: 9 },
  { id: 3490, codigo: "PAD-2024-3490", nome: "Dayane Aparecida Lopes Vieira", cpf: "112.998.034-19", telefone: "(31) 98226-4413", nascimento: "1991-08-04", idade: 34, ultimaSessao: "2026-04-30", proximaSessao: "2026-05-21", status: "EM_ATENDIMENTO", sessoesAcum: 6, receitasAcum: 3 },
  { id: 3491, codigo: "PAD-2024-3491", nome: "Dayanne Ribeiro de Castro", cpf: "045.221.118-04", telefone: "(31) 99115-8842", nascimento: "1978-11-29", idade: 47, ultimaSessao: "2026-05-18", proximaSessao: "2026-05-25", status: "ATIVO", sessoesAcum: 22, receitasAcum: 17 },
  { id: 3492, codigo: "PAD-2024-3492", nome: "Dayana Helena Fonseca Almeida", cpf: "318.774.205-66", telefone: "(31) 98774-2031", nascimento: "1995-02-17", idade: 31, ultimaSessao: "2026-03-04", proximaSessao: null, status: "SEM_CONTATO", sessoesAcum: 2, receitasAcum: 1 },
  { id: 3493, codigo: "PAD-2024-3493", nome: "Dayane Gomes Pádua", cpf: "229.115.778-91", telefone: "(31) 99002-3187", nascimento: "1989-06-21", idade: 36, ultimaSessao: "2026-05-19", proximaSessao: "2026-05-26", status: "EM_ATENDIMENTO", sessoesAcum: 11, receitasAcum: 8 },
  { id: 3494, codigo: "PAD-2024-3494", nome: "Dayana Mendes Tavares", cpf: "501.882.443-50", telefone: "(31) 98112-9943", nascimento: "1972-09-08", idade: 53, ultimaSessao: "2025-12-11", proximaSessao: null, status: "INATIVO", sessoesAcum: 38, receitasAcum: 31 },
  { id: 3497, codigo: "PAD-2024-3497", nome: "Graco Souza Pádua", cpf: "884.331.275-03", telefone: "(31) 99771-0204", nascimento: "1968-01-15", idade: 58, ultimaSessao: "2026-05-19", proximaSessao: "2026-05-26", status: "EM_ATENDIMENTO", sessoesAcum: 47, receitasAcum: 39 },
  { id: 3501, codigo: "PAD-2024-3501", nome: "Luciana Carvalho de Andrade", cpf: "667.220.998-12", telefone: "(31) 98844-1129", nascimento: "1981-07-03", idade: 44, ultimaSessao: "2026-05-12", proximaSessao: "2026-05-23", status: "ATIVO", sessoesAcum: 19, receitasAcum: 14 },
  { id: 3508, codigo: "PAD-2024-3508", nome: "Carlúcia Mendes Pereira", cpf: "773.110.554-87", telefone: "(31) 99441-2284", nascimento: "1962-04-22", idade: 64, ultimaSessao: "2026-05-18", proximaSessao: "2026-05-24", status: "ATIVO", sessoesAcum: 9, receitasAcum: 6 },
  { id: 3512, codigo: "PAD-2024-3512", nome: "Rodrigo Antunes Nogueira", cpf: "338.221.667-44", telefone: "(31) 98223-7710", nascimento: "1976-12-09", idade: 49, ultimaSessao: "2026-04-22", proximaSessao: null, status: "SEM_CONTATO", sessoesAcum: 4, receitasAcum: 2 },
  { id: 3519, codigo: "PAD-2024-3519", nome: "Mariana Oliveira Brandão", cpf: "112.554.998-33", telefone: "(31) 99887-4421", nascimento: "1993-10-30", idade: 32, ultimaSessao: "2026-05-17", proximaSessao: "2026-05-24", status: "ATIVO", sessoesAcum: 7, receitasAcum: 4 },
  { id: 3527, codigo: "PAD-2024-3527", nome: "Sebastião José da Silva Pádua", cpf: "884.110.227-65", telefone: "(31) 98115-3309", nascimento: "1955-05-14", idade: 70, ultimaSessao: "2026-05-16", proximaSessao: "2026-05-30", status: "ATIVO", sessoesAcum: 53, receitasAcum: 44 },
];

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  ATIVO: { label: "ATIVO", color: tk.ok, bg: "rgba(124,196,160,0.10)" },
  EM_ATENDIMENTO: { label: "EM ATENDIMENTO", color: tk.accent, bg: "rgba(122,162,247,0.12)" },
  INATIVO: { label: "INATIVO", color: tk.inkMute, bg: "rgba(107,126,158,0.10)" },
  SEM_CONTATO: { label: "SEM CONTATO", color: tk.warn, bg: "rgba(224,176,98,0.10)" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function KpiBlock({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div style={{
      flex: 1,
      background: tk.bgAlt,
      borderLeft: `3px solid ${accent ?? tk.accentDeep}`,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMute, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: tk.mono, fontSize: 26, color: tk.ink, fontWeight: 500, lineHeight: 1 }}>{value}</div>
      {hint && <div style={{ fontFamily: tk.sans, fontSize: 11, color: tk.inkDim }}>{hint}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      fontFamily: tk.mono,
      fontSize: 10,
      letterSpacing: 1.2,
      color: m.color,
      background: m.bg,
      border: `1px solid ${m.color}33`,
      padding: "3px 8px",
      display: "inline-block",
      whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

function FilterTab({ label, count, active }: { label: string; count: number; active?: boolean }) {
  return (
    <button style={{
      fontFamily: tk.mono,
      fontSize: 11,
      letterSpacing: 1.2,
      color: active ? tk.ink : tk.inkDim,
      background: active ? tk.bgAlt : "transparent",
      borderLeft: active ? `2px solid ${tk.accent}` : `2px solid transparent`,
      borderTop: "none",
      borderRight: "none",
      borderBottom: "none",
      padding: "8px 14px",
      cursor: "pointer",
      textTransform: "uppercase",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <span>{label}</span>
      <span style={{ color: tk.inkMute, fontSize: 10 }}>{count.toLocaleString("pt-BR")}</span>
    </button>
  );
}

export function PacientesPadua() {
  return (
    <div style={{
      minHeight: "100vh",
      background: tk.bg,
      color: tk.ink,
      fontFamily: tk.sans,
      padding: 0,
    }}>
      {/* HEADER */}
      <div style={{
        borderBottom: `1px solid ${tk.line}`,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            fontFamily: tk.mono,
            fontSize: 10,
            color: tk.accent,
            letterSpacing: 2,
            padding: "3px 8px",
            border: `1px solid ${tk.accent}55`,
          }}>PAWARDS · MOTOR</div>
          <div style={{ fontFamily: tk.mono, fontSize: 12, color: tk.inkDim, letterSpacing: 1 }}>
            UNIDADE 15 · PÁDUA INTEGRATIVA
          </div>
        </div>
        <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkMute, letterSpacing: 1 }}>
          CAIO · CEO · {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>

      {/* TITLE + ACTIONS */}
      <div style={{
        padding: "20px 24px 16px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        borderBottom: `1px solid ${tk.lineSoft}`,
      }}>
        <div>
          <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMute, letterSpacing: 2, marginBottom: 4 }}>
            CADASTRO · PACIENTES
          </div>
          <div style={{ fontFamily: tk.sans, fontSize: 24, fontWeight: 500, color: tk.ink, letterSpacing: -0.3 }}>
            Pacientes Pádua
          </div>
          <div style={{ fontFamily: tk.sans, fontSize: 12, color: tk.inkDim, marginTop: 4 }}>
            3.877 fichas migradas · auto-completar via PL/pgSQL (Migration 040/042)
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{
            fontFamily: tk.mono, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
            color: tk.inkDim, background: "transparent", border: `1px solid ${tk.line}`,
            padding: "8px 14px", cursor: "pointer",
          }}>Exportar CSV</button>
          <button style={{
            fontFamily: tk.mono, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
            color: tk.bg, background: tk.accent, border: `1px solid ${tk.accent}`,
            padding: "8px 14px", cursor: "pointer", fontWeight: 600,
          }}>+ Novo Paciente</button>
        </div>
      </div>

      {/* KPIS */}
      <div style={{ display: "flex", gap: 1, padding: "16px 24px 0", background: tk.bg }}>
        <KpiBlock label="TOTAL FICHAS" value="3.877" hint="unidade 15" accent={tk.accentDeep} />
        <KpiBlock label="ATIVOS" value="2.418" hint="62,4% da base" accent={tk.ok} />
        <KpiBlock label="EM ATENDIMENTO" value="184" hint="sessões abertas" accent={tk.accent} />
        <KpiBlock label="SEM CONTATO 90D+" value="612" hint="alvos faltou-engine" accent={tk.warn} />
        <KpiBlock label="POT. RECEITA" value="R$ 2,73M" hint="fichas históricas" accent={tk.accentDeep} />
      </div>

      {/* FILTROS + BUSCA */}
      <div style={{
        margin: "16px 24px 0",
        background: tk.bgAlt,
        border: `1px solid ${tk.line}`,
        display: "flex",
        alignItems: "stretch",
      }}>
        <div style={{ display: "flex", flex: 1 }}>
          <FilterTab label="Todos" count={3877} active />
          <FilterTab label="Ativos" count={2418} />
          <FilterTab label="Em Atend." count={184} />
          <FilterTab label="Sem Contato" count={612} />
          <FilterTab label="Inativos" count={663} />
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          borderLeft: `1px solid ${tk.line}`,
        }}>
          <span style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkMute }}>⌕</span>
          <input
            placeholder="buscar nome, CPF, telefone ou código..."
            style={{
              fontFamily: tk.mono, fontSize: 12, color: tk.ink,
              background: "transparent", border: "none", outline: "none",
              width: 340, padding: "10px 0",
            }}
          />
          <span style={{
            fontFamily: tk.mono, fontSize: 10, color: tk.inkMute,
            border: `1px solid ${tk.line}`, padding: "2px 6px",
          }}>⌘K</span>
        </div>
      </div>

      {/* TABELA */}
      <div style={{ margin: "12px 24px 0", border: `1px solid ${tk.line}`, background: tk.bgAlt }}>
        {/* head */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "150px 1fr 140px 140px 100px 110px 110px 130px 80px",
          gap: 0,
          padding: "10px 14px",
          borderBottom: `1px solid ${tk.line}`,
          fontFamily: tk.mono,
          fontSize: 10,
          color: tk.inkMute,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}>
          <div>CÓDIGO</div>
          <div>NOME</div>
          <div>CPF</div>
          <div>TELEFONE</div>
          <div style={{ textAlign: "center" }}>IDADE</div>
          <div>ÚLT. SESSÃO</div>
          <div>PRÓX. SESSÃO</div>
          <div>STATUS</div>
          <div style={{ textAlign: "right" }}>SES/REC</div>
        </div>

        {/* rows */}
        {PACIENTES.map((p, i) => (
          <div key={p.id} style={{
            display: "grid",
            gridTemplateColumns: "150px 1fr 140px 140px 100px 110px 110px 130px 80px",
            gap: 0,
            padding: "12px 14px",
            background: i % 2 === 0 ? tk.bgRow : tk.bgRowAlt,
            borderBottom: `1px solid ${tk.lineSoft}`,
            alignItems: "center",
          }}>
            <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.accent, letterSpacing: 0.5 }}>{p.codigo}</div>
            <div style={{ fontFamily: tk.sans, fontSize: 13, color: tk.ink }}>{p.nome}</div>
            <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkDim }}>{p.cpf}</div>
            <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkDim }}>{p.telefone}</div>
            <div style={{ fontFamily: tk.mono, fontSize: 12, color: tk.ink, textAlign: "center" }}>{p.idade}</div>
            <div style={{ fontFamily: tk.mono, fontSize: 11, color: p.ultimaSessao ? tk.inkDim : tk.inkMute }}>{fmtDate(p.ultimaSessao)}</div>
            <div style={{ fontFamily: tk.mono, fontSize: 11, color: p.proximaSessao ? tk.ok : tk.inkMute }}>{fmtDate(p.proximaSessao)}</div>
            <div><StatusPill status={p.status} /></div>
            <div style={{ fontFamily: tk.mono, fontSize: 11, color: tk.inkDim, textAlign: "right" }}>
              {p.sessoesAcum}<span style={{ color: tk.inkMute }}> / </span>{p.receitasAcum}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER PAGINAÇÃO */}
      <div style={{
        margin: "12px 24px 24px",
        padding: "12px 16px",
        background: tk.bgAlt,
        border: `1px solid ${tk.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: tk.mono,
        fontSize: 11,
        color: tk.inkDim,
        letterSpacing: 0.5,
      }}>
        <div>
          exibindo <span style={{ color: tk.ink }}>1–12</span> de <span style={{ color: tk.ink }}>3.877</span> · página 1 de 324
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["‹‹", "‹", "1", "2", "3", "…", "324", "›", "››"].map((t, i) => (
            <button key={i} style={{
              fontFamily: tk.mono, fontSize: 11, color: t === "1" ? tk.ink : tk.inkDim,
              background: t === "1" ? tk.accentDeep : "transparent",
              border: `1px solid ${t === "1" ? tk.accent : tk.line}`,
              padding: "4px 10px", cursor: "pointer", minWidth: 32,
            }}>{t}</button>
          ))}
        </div>
        <div>
          ordenado por <span style={{ color: tk.ink }}>código ↑</span> · 12 por página
        </div>
      </div>
    </div>
  );
}
