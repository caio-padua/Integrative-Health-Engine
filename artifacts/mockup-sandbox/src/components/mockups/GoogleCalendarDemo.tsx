import { useState } from "react";

const GOOGLE_COLORS: Record<string, string> = {
  "5": "#F6BF26",
  "7": "#039BE5",
  "9": "#3F51B5",
  "11": "#D50000",
};

const COLOR_NAMES: Record<string, string> = {
  "5": "Banana (Amarelo)",
  "7": "Mirtilo (Azul)",
  "9": "Indigo (Roxo-Azulado)",
  "11": "Tomate (Vermelho)",
};

interface Substancia {
  nome: string;
  via: string;
  dose: string;
  status: string;
}

interface Scenario {
  num: number;
  title: string;
  summary: string;
  data: string;
  hora: string;
  colorId: string;
  substancias: Substancia[];
  tipoProcedimento: string;
  duracaoMin: number;
  pacienteNome: string;
  pacienteCpf: string;
  numeroMarcacao: number;
  unidadeNome: string;
  endereco?: {
    rua?: string;
    bairro?: string;
    cep?: string;
    cidade?: string;
    estado?: string;
  };
  explicacao: string;
  routing: string;
}

function statusDot(status: string): string {
  switch (status) {
    case "disp": return "🟢 DISP";
    case "aplicada": return "🔵 APLICADA";
    case "prox": return "🟤 PROX";
    case "nao_aplicada": return "⚫ N/A";
    default: return "⚪ " + status.toUpperCase();
  }
}

function determineSessionStatus(substancias: Substancia[]): { label: string; dot: string } {
  if (!substancias.length) return { label: "A REALIZAR", dot: "🟡" };
  const hasAplicada = substancias.some(s => s.status === "aplicada");
  const allDone = substancias.every(s => s.status === "aplicada" || s.status === "nao_aplicada");
  const hasNaoAplicada = substancias.some(s => s.status === "nao_aplicada");
  if (allDone && hasAplicada && !hasNaoAplicada) return { label: "REALIZADO", dot: "🔵" };
  if (allDone && hasNaoAplicada && !hasAplicada) return { label: "NAO REALIZADO", dot: "⚫" };
  if (allDone) return { label: "REALIZADO", dot: "🔵" };
  return { label: "A REALIZAR", dot: "🟡" };
}

const scenarios: Scenario[] = [
  {
    num: 1,
    title: "Consulta Medica Presencial",
    summary: "DAYANA LUDMAN - CONSULTA",
    data: "14/04/2026", hora: "09:00 - 10:00",
    colorId: "7",
    substancias: [],
    tipoProcedimento: "CONSULTA",
    duracaoMin: 60,
    pacienteNome: "DAYANA LUDMAN ALVES CALDAS DA SILVA",
    pacienteCpf: "123.456.789-01",
    numeroMarcacao: 1,
    unidadeNome: "AGENDA MEDICO - HIGIENOPOLIS - DR CAIO",
    endereco: { rua: "Av Angelica 1200", bairro: "Higienopolis", cep: "01228-200", cidade: "Sao Paulo", estado: "SP" },
    explicacao: "Consulta pura, sem substancias. Cor AZUL MIRTILO (colorId 7). Checkbox CONSULTA = ✅, demais = ❎. Status: A REALIZAR 🟡. Roteamento: MEDICO.",
    routing: "MEDICO",
  },
  {
    num: 2,
    title: "Aplicacao EV (Soro Detox) + Consulta",
    summary: "MARIA FERNANDA COSTA - CONSULTA + APLICACAO ENDOVENOSA",
    data: "14/04/2026", hora: "10:00 - 11:30",
    colorId: "9",
    substancias: [
      { nome: "Glutationa", via: "EV", dose: "1200mg", status: "disp" },
      { nome: "NAD+", via: "EV", dose: "500mg", status: "disp" },
      { nome: "Vitamina C", via: "EV", dose: "25g", status: "disp" },
    ],
    tipoProcedimento: "CONSULTA + APLICACAO ENDOVENOSA",
    duracaoMin: 90,
    pacienteNome: "MARIA FERNANDA COSTA",
    pacienteCpf: "301.100.316-43",
    numeroMarcacao: 3,
    unidadeNome: "AGENDA MEDICO - TATUAPE - DR CAIO",
    explicacao: "Consulta + Soro EV (3 substancias). Cor INDIGO (colorId 9). Checkboxes CONSULTA = ✅ e EV = ✅. Todas as substancias 🟢 DISP (disponiveis para aplicacao). Status: A REALIZAR 🟡.",
    routing: "MEDICO",
  },
  {
    num: 3,
    title: "Aplicacao IM Homecare (Enfermagem)",
    summary: "ROBERTO ALMEIDA - APLICACAO INTRAMUSCULAR",
    data: "15/04/2026", hora: "14:00 - 14:15",
    colorId: "5",
    substancias: [
      { nome: "Complexo B", via: "IM", dose: "1 AMP", status: "disp" },
      { nome: "Vitamina D3", via: "IM", dose: "2000UI", status: "disp" },
    ],
    tipoProcedimento: "APLICACAO INTRAMUSCULAR",
    duracaoMin: 15,
    pacienteNome: "ROBERTO ALMEIDA JUNIOR",
    pacienteCpf: "815.689.234-76",
    numeroMarcacao: 5,
    unidadeNome: "AGENDA ENFERMAGEM - DOMICILIAR",
    endereco: { rua: "Rua do Paciente 123", bairro: "Vila Mariana", cep: "04107-000", cidade: "Sao Paulo", estado: "SP" },
    explicacao: "Aplicacao IM domiciliar (Nurse Care). Cor BANANA/AMARELO (colorId 5). Apenas IM = ✅. Endereco e do PACIENTE (nao da clinica) + links Google Maps e Waze. Roteamento: ENFERMAGEM.",
    routing: "ENFERMAGEM",
  },
  {
    num: 4,
    title: "Sessao EV Parcialmente Realizada",
    summary: "ANA BEATRIZ SANTOS - APLICACAO ENDOVENOSA",
    data: "16/04/2026", hora: "09:00 - 09:30",
    colorId: "9",
    substancias: [
      { nome: "Glutationa", via: "EV", dose: "600mg", status: "aplicada" },
      { nome: "Vitamina C", via: "EV", dose: "10g", status: "aplicada" },
      { nome: "NAD+", via: "EV", dose: "250mg", status: "nao_aplicada" },
    ],
    tipoProcedimento: "APLICACAO ENDOVENOSA",
    duracaoMin: 30,
    pacienteNome: "ANA BEATRIZ SANTOS",
    pacienteCpf: "995.463.059-77",
    numeroMarcacao: 2,
    unidadeNome: "AGENDA MEDICO - HIGIENOPOLIS",
    explicacao: "Sessao EV parcial — 2 aplicadas (🔵 APLICADA), 1 nao aplicada (⚫ N/A). Como todas foram processadas, o motor marca status REALIZADO 🔵. O NAD+ nao foi usado (reacao adversa, falta de estoque, etc).",
    routing: "MEDICO",
  },
  {
    num: 5,
    title: "Implante Hormonal (Pellet)",
    summary: "CARLOS EDUARDO LIMA - IMPLANTE",
    data: "17/04/2026", hora: "10:00 - 11:00",
    colorId: "11",
    substancias: [
      { nome: "Testosterona Pellet", via: "IMPLANT", dose: "200mg", status: "disp" },
    ],
    tipoProcedimento: "IMPLANTE",
    duracaoMin: 60,
    pacienteNome: "CARLOS EDUARDO LIMA",
    pacienteCpf: "113.117.003-32",
    numeroMarcacao: 1,
    unidadeNome: "AGENDA MEDICO - HIGIENOPOLIS",
    explicacao: "Implante de pellet hormonal. Cor TOMATE/VERMELHO (colorId 11) — alerta visual de procedimento invasivo. Checkbox IMPLANTE = ✅. Roteamento: sempre MEDICO (implante requer medico).",
    routing: "MEDICO",
  },
  {
    num: 6,
    title: "Combo Completo: Consulta + EV + IM",
    summary: "DAYANA LUDMAN - CONSULTA + EV + IM",
    data: "18/04/2026", hora: "08:30 - 10:15",
    colorId: "9",
    substancias: [
      { nome: "Glutationa", via: "EV", dose: "1200mg", status: "disp" },
      { nome: "NAD+", via: "EV", dose: "500mg", status: "prox" },
      { nome: "Complexo B", via: "IM", dose: "1 AMP", status: "disp" },
      { nome: "Zinco+Selenio", via: "IM", dose: "1 AMP", status: "disp" },
    ],
    tipoProcedimento: "CONSULTA + APLICACAO ENDOVENOSA + INTRAMUSCULAR",
    duracaoMin: 105,
    pacienteNome: "DAYANA LUDMAN ALVES CALDAS DA SILVA",
    pacienteCpf: "123.456.789-01",
    numeroMarcacao: 4,
    unidadeNome: "AGENDA MEDICO - HIGIENOPOLIS",
    explicacao: "Combo triplo: CONSULTA + EV + IM, todos ✅. NAD+ marcado como 🟤 PROX (agendado para proxima sessao, nao aplica hoje). Duracao 105min (60+30+15). Cor dominante EV = INDIGO.",
    routing: "MEDICO",
  },
  {
    num: 7,
    title: "Sessao 100% Realizada (pos-atendimento)",
    summary: "MARIA FERNANDA COSTA - APLICACAO ENDOVENOSA",
    data: "13/04/2026", hora: "09:00 - 09:30",
    colorId: "9",
    substancias: [
      { nome: "Glutationa", via: "EV", dose: "600mg", status: "aplicada" },
      { nome: "Vitamina C", via: "EV", dose: "10g", status: "aplicada" },
      { nome: "Acido Alfa Lipoico", via: "EV", dose: "300mg", status: "aplicada" },
    ],
    tipoProcedimento: "APLICACAO ENDOVENOSA",
    duracaoMin: 30,
    pacienteNome: "MARIA FERNANDA COSTA",
    pacienteCpf: "301.100.316-43",
    numeroMarcacao: 2,
    unidadeNome: "AGENDA MEDICO - TATUAPE",
    explicacao: "Sessao 100% concluida. Todas 🔵 APLICADA. Status final: REALIZADO 🔵. O motor atualiza a descricao do evento automaticamente via PATCH quando a enfermeira registra as aplicacoes no sistema.",
    routing: "MEDICO",
  },
  {
    num: 8,
    title: "Sessao Nao Realizada (falta/cancelamento)",
    summary: "CARLOS EDUARDO LIMA - CONSULTA",
    data: "17/04/2026", hora: "16:00 - 17:00",
    colorId: "7",
    substancias: [
      { nome: "Avaliacao laboratorial", via: "CONSULTA", dose: "-", status: "nao_aplicada" },
    ],
    tipoProcedimento: "CONSULTA",
    duracaoMin: 60,
    pacienteNome: "CARLOS EDUARDO LIMA",
    pacienteCpf: "113.117.003-32",
    numeroMarcacao: 1,
    unidadeNome: "AGENDA MEDICO - ON LINE",
    explicacao: "Paciente nao compareceu. Todas marcadas ⚫ N/A. Status: NAO REALIZADO ⚫. O motor registra a falta e atualiza o Calendar automaticamente. Evento permanece no historico.",
    routing: "MEDICO",
  },
];

function CalendarEventCard({ scenario, isExpanded, onToggle }: { scenario: Scenario; isExpanded: boolean; onToggle: () => void }) {
  const color = GOOGLE_COLORS[scenario.colorId] || "#039BE5";
  const colorName = COLOR_NAMES[scenario.colorId] || "";
  const sessionStatus = determineSessionStatus(scenario.substancias);

  const vias = new Set(scenario.substancias.map(s => s.via.toLowerCase()));
  const temIM = vias.has("im");
  const temEV = vias.has("ev") || vias.has("iv");
  const temImplante = vias.has("implant");
  const temConsulta = scenario.tipoProcedimento.includes("CONSULTA");

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
        cursor: "pointer",
      }} onClick={onToggle}>
        <div style={{
          background: "hsl(215 28% 14%)", border: "1px solid hsl(215 20% 25%)",
          borderRadius: 0, padding: "4px 12px", fontSize: 13, color: "#C8920A", fontWeight: 700,
          minWidth: 32, textAlign: "center",
        }}>
          #{scenario.num}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>
          {scenario.title}
        </div>
        <div style={{
          marginLeft: "auto", fontSize: 11, color: "#94a3b8",
          background: scenario.routing === "ENFERMAGEM" ? "hsl(174 40% 18%)" : "hsl(210 45% 18%)",
          border: `1px solid ${scenario.routing === "ENFERMAGEM" ? "hsl(174 40% 30%)" : "hsl(210 45% 30%)"}`,
          padding: "2px 10px", borderRadius: 0, fontWeight: 600,
          letterSpacing: 1,
        }}>
          {scenario.routing}
        </div>
        <div style={{ color: "#64748b", fontSize: 18 }}>
          {isExpanded ? "▲" : "▼"}
        </div>
      </div>

      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap",
        transition: "all 0.2s",
      }}>
        <div style={{
          flex: "1 1 340px",
          background: "#fff",
          borderLeft: `5px solid ${color}`,
          borderRadius: 0,
          padding: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
          maxWidth: 420,
        }}>
          <div style={{
            background: color, color: "#fff", padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>
                {scenario.summary}
              </div>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                {scenario.data} | {scenario.hora}
              </div>
            </div>
          </div>

          <div style={{
            padding: "12px 16px", fontSize: 12, lineHeight: 1.7,
            color: "#1a1a1a", whiteSpace: "pre-wrap", fontFamily: "monospace",
          }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 6 }}>
              PADCOM - PROTOCOLOS INJETAVEIS
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
              {scenario.pacienteNome}
            </div>
            <div style={{ color: "#666", fontSize: 11 }}>
              CPF {scenario.pacienteCpf}
            </div>
            <div style={{ color: "#666", fontSize: 11 }}>
              Marcacao {scenario.numeroMarcacao}
            </div>
            <div style={{ color: "#666", fontSize: 11, marginBottom: 10 }}>
              Unidade {scenario.unidadeNome}
            </div>

            <div style={{ fontWeight: 700, fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 4 }}>
              PROCEDIMENTO:
            </div>
            <div>CONSULTA - 60 MIN {temConsulta ? "✅" : "❎"}</div>
            <div>ENDOVENOSA - 30 MIN {temEV ? "✅" : "❎"}</div>
            <div>INTRAMUSCULAR - 15 MIN {temIM ? "✅" : "❎"}</div>
            <div style={{ marginBottom: 6 }}>IMPLANTE - 60 MIN {temImplante ? "✅" : "❎"}</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              DURACAO TOTAL: {scenario.duracaoMin} MINUTOS
            </div>

            <div style={{
              fontWeight: 700, marginBottom: 8,
              padding: "4px 8px", display: "inline-block",
              background: sessionStatus.dot === "🟡" ? "#FEF3C7"
                : sessionStatus.dot === "🔵" ? "#DBEAFE"
                : sessionStatus.dot === "⚫" ? "#F3F4F6" : "#F3F4F6",
            }}>
              STATUS: {sessionStatus.label} {sessionStatus.dot}
            </div>

            {scenario.substancias.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 11, color: "#555", letterSpacing: 1, marginTop: 6, marginBottom: 4 }}>
                  SUBSTANCIAS DO PROTOCOLO:
                </div>
                {scenario.substancias.map((s, i) => (
                  <div key={i} style={{
                    padding: "2px 0",
                    color: s.status === "aplicada" ? "#1D4ED8"
                      : s.status === "nao_aplicada" ? "#6B7280"
                      : s.status === "prox" ? "#92400E" : "#15803D",
                  }}>
                    {statusDot(s.status)} {s.nome.toUpperCase()} ({s.via}) - {s.dose}
                  </div>
                ))}
              </div>
            )}

            {scenario.endereco && (
              <div style={{ marginTop: 10, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>━━━ ENDERECO ━━━</div>
                <div>📍 {scenario.endereco.rua?.toUpperCase()}</div>
                <div style={{ paddingLeft: 20 }}>{scenario.endereco.bairro?.toUpperCase()}</div>
                <div style={{ paddingLeft: 20 }}>CEP {scenario.endereco.cep}</div>
                <div style={{ paddingLeft: 20 }}>{scenario.endereco.cidade?.toUpperCase()} - {scenario.endereco.estado?.toUpperCase()}</div>
                <div style={{ marginTop: 6, fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>━━━ NAVEGACAO ━━━</div>
                <div>🗺️ <span style={{ color: "#1D4ED8", textDecoration: "underline" }}>GOOGLE MAPS</span></div>
                <div>🧭 <span style={{ color: "#1D4ED8", textDecoration: "underline" }}>WAZE</span></div>
              </div>
            )}
          </div>
        </div>

        {isExpanded && (
          <div style={{
            flex: "1 1 300px", maxWidth: 500,
            background: "hsl(215 28% 12%)", border: "1px solid hsl(215 20% 22%)",
            borderRadius: 0, padding: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#C8920A", letterSpacing: 1, marginBottom: 8 }}>
              ANALISE DO MOTOR
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>
              {scenario.explicacao}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{
                padding: "4px 12px", fontSize: 11, fontWeight: 600,
                background: color, color: "#fff", borderRadius: 0,
              }}>
                COR: {colorName}
              </div>
              <div style={{
                padding: "4px 12px", fontSize: 11, fontWeight: 600,
                background: "hsl(215 28% 18%)", color: "#94a3b8",
                border: "1px solid hsl(215 20% 28%)", borderRadius: 0,
              }}>
                colorId: {scenario.colorId}
              </div>
              <div style={{
                padding: "4px 12px", fontSize: 11, fontWeight: 600,
                background: "hsl(215 28% 18%)", color: "#94a3b8",
                border: "1px solid hsl(215 20% 28%)", borderRadius: 0,
              }}>
                {scenario.duracaoMin} min
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>LEGENDA DE STATUS:</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.8 }}>
                🟢 DISP — Disponivel para aplicacao hoje<br />
                🔵 APLICADA — Substancia ja aplicada<br />
                🟤 PROX — Proxima sessao<br />
                ⚫ N/A — Nao aplicavel
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>MAPA DE CORES GOOGLE:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(GOOGLE_COLORS).map(([id, c]) => (
                  <div key={id} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 10, color: "#94a3b8",
                  }}>
                    <div style={{ width: 12, height: 12, background: c, borderRadius: 0 }} />
                    {COLOR_NAMES[id]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCalendarDemo() {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set([1]));

  const toggle = (num: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  const expandAll = () => setExpandedCards(new Set(scenarios.map(s => s.num)));
  const collapseAll = () => setExpandedCards(new Set());

  return (
    <div style={{
      minHeight: "100vh",
      background: "hsl(215 28% 9%)",
      color: "#e2e8f0",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "32px 24px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#C8920A", fontWeight: 700, marginBottom: 4 }}>
            PADCOM V15.2 — MOTOR CLINICO
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
            Google Calendar — 8 Cenarios Reais
          </h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6, lineHeight: 1.6 }}>
            Demonstracao de como cada tipo de agendamento aparece no Google Calendar quando o motor sincroniza.
            Cada card abaixo e o evento EXATO que a API <code style={{ background: "hsl(215 28% 14%)", padding: "1px 6px", fontSize: 11, color: "#cbd5e1" }}>POST /api/google-calendar/sync-session/:id</code> gera.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={expandAll} style={{
            background: "hsl(215 28% 14%)", border: "1px solid hsl(215 20% 25%)",
            color: "#94a3b8", padding: "6px 16px", fontSize: 12, cursor: "pointer",
            borderRadius: 0, fontWeight: 600,
          }}>
            Expandir Todos
          </button>
          <button onClick={collapseAll} style={{
            background: "hsl(215 28% 14%)", border: "1px solid hsl(215 20% 25%)",
            color: "#94a3b8", padding: "6px 16px", fontSize: 12, cursor: "pointer",
            borderRadius: 0, fontWeight: 600,
          }}>
            Recolher Todos
          </button>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
          marginBottom: 24, padding: 16,
          background: "hsl(215 28% 12%)", border: "1px solid hsl(215 20% 22%)",
        }}>
          {Object.entries(GOOGLE_COLORS).map(([id, c]) => (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 20, height: 20, background: c, borderRadius: 0, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{COLOR_NAMES[id]}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>
                  {id === "7" ? "CONSULTA" : id === "9" ? "ENDOVENOSA" : id === "5" ? "INTRAMUSCULAR" : "IMPLANTE"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {scenarios.map(s => (
          <CalendarEventCard
            key={s.num}
            scenario={s}
            isExpanded={expandedCards.has(s.num)}
            onToggle={() => toggle(s.num)}
          />
        ))}

        <div style={{
          marginTop: 32, padding: 20,
          background: "hsl(215 28% 12%)", border: "1px solid hsl(215 20% 22%)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#C8920A", letterSpacing: 1, marginBottom: 12 }}>
            RESUMO TECNICO — CAPACIDADES ATUAIS DO MOTOR
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 2 }}>
            ✅ Cria evento no Google Calendar com titulo PACIENTE + TIPO<br />
            ✅ Cor automatica por tipo de procedimento (4 cores)<br />
            ✅ Descricao rica com paciente, CPF, unidade, marcacao<br />
            ✅ Checklist de procedimentos (CONSULTA/EV/IM/IMPLANTE)<br />
            ✅ Status de cada substancia com emoji semantico<br />
            ✅ Status geral da sessao (A REALIZAR / REALIZADO / NAO REALIZADO)<br />
            ✅ Calculo automatico de duracao total<br />
            ✅ Endereco da clinica ou do paciente (homecare)<br />
            ✅ Links de navegacao Google Maps + Waze<br />
            ✅ Roteamento automatico MEDICO vs ENFERMAGEM<br />
            ✅ Atualizacao do evento apos aplicacao (PATCH)<br />
            ✅ Delecao do evento antigo ao re-sincronizar<br />
            ⏳ Sincronizacao bidirecional (Calendar → Motor) — futuro<br />
            ⏳ Notificacao push para equipe — futuro
          </div>
        </div>
      </div>
    </div>
  );
}
