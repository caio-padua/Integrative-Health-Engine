import { palette as p } from "./_palette";

type Linha = {
  quando: string;
  acao: string;
  acaoCor: string;
  clinica: string;
  executor: string;
  motivo: string;
};

const LINHAS: Linha[] = [
  { quando: "26/MAI 09:14", acao: "SUSPENDER",       acaoCor: p.danger, clinica: "PÁDUA",        executor: "Caio R. (CEO)",       motivo: "Suspeita de uso indevido — auditoria interna" },
  { quando: "26/MAI 08:42", acao: "REASSUMIR",       acaoCor: p.ok,     clinica: "GENESIS",      executor: "Dr. Marco Andrade",   motivo: "Liberação após validação 2FA" },
  { quando: "25/MAI 22:11", acao: "PROMOVER_ADMIN",  acaoCor: p.cyan,   clinica: "ATELIER NORTE",executor: "Caio R. (CEO)",       motivo: "Onboarding nova gerente — turno noturno" },
  { quando: "25/MAI 18:30", acao: "EXPORTAR_LGPD",   acaoCor: p.warn,   clinica: "PÁDUA",        executor: "Ana B. (Compliance)", motivo: "Pedido de portabilidade — paciente Luciano R." },
  { quando: "25/MAI 14:05", acao: "EXCLUIR_AGENDAR", acaoCor: p.warn,   clinica: "ATELIER SUL",  executor: "Caio R. (CEO)",       motivo: "Cancelamento de unidade — execução em 30 dias" },
  { quando: "24/MAI 11:48", acao: "FORCAR_LOGOUT",   acaoCor: p.danger, clinica: "GENESIS",      executor: "Sec. TI",             motivo: "Sessão suspeita em IP externo" },
];

const Kpi = ({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) => (
  <div
    style={{
      background: p.navyPanelAlt,
      border: `1px solid ${p.border}`,
      borderTop: `2px solid ${accent}`,
      padding: "12px 14px",
    }}
  >
    <div style={{ fontSize: 9, letterSpacing: 1.4, color: p.inkMute, textTransform: "uppercase" }}>
      {label}
    </div>
    <div style={{ fontSize: 24, color: p.ink, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: 10, color: accent, marginTop: 3 }}>{sub}</div>
  </div>
);

/**
 * Tela-exemplo compartilhada por TODOS os 5 chromes navegacionais.
 * Mesmo conteúdo dentro = comparação justa do CHROME que envolve.
 */
export function MioloAuditoriaExemplo() {
  return (
    <div style={{ padding: 20, fontFamily: p.mono, color: p.ink, background: p.navy }}>
      {/* Título da tela */}
      <div style={{ fontSize: 9, letterSpacing: 2, color: p.gold, marginBottom: 4 }}>
        ░ TELA · AUDITORIA KILL-SWITCH
      </div>
      <h1 style={{ fontSize: 18, margin: "0 0 14px 0", textTransform: "uppercase", letterSpacing: 1, color: p.ink }}>
        Timeline imutável — defesa jurídica LGPD/CFM
      </h1>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <Kpi label="EVENTOS (30D)" value="487" sub="+12 hoje" accent={p.cyan} />
        <Kpi label="SUSPENSÕES" value="14" sub="2 ainda ativas" accent={p.danger} />
        <Kpi label="REASSUMIDAS" value="11" sub="média 4h21" accent={p.ok} />
        <Kpi label="EXPORT LGPD" value="6" sub="todas <72h" accent={p.warn} />
      </div>

      {/* Filtros */}
      <div
        style={{
          background: p.navyPanelAlt,
          border: `1px solid ${p.border}`,
          padding: "10px 14px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: 1.5 }}>FILTROS ▸</span>
        {["AÇÃO ▾", "CLÍNICA ▾", "EXECUTOR ▾", "DE 01/MAI", "ATÉ 26/MAI"].map((f) => (
          <span
            key={f}
            style={{
              fontSize: 11,
              color: p.ink,
              border: `1px solid ${p.border}`,
              background: p.navyDeep,
              padding: "5px 12px",
              letterSpacing: 0.5,
            }}
          >
            {f}
          </span>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: p.gold,
            border: `1px solid ${p.gold}`,
            padding: "5px 12px",
            letterSpacing: 1.5,
          }}
        >
          ⬇ EXPORTAR CSV
        </span>
      </div>

      {/* Tabela */}
      <div style={{ background: p.navyPanelAlt, border: `1px solid ${p.border}` }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: p.mono,
            fontSize: 12,
            color: p.ink,
          }}
        >
          <thead>
            <tr style={{ background: p.navyDeep }}>
              {["QUANDO", "AÇÃO", "CLÍNICA", "EXECUTOR", "MOTIVO"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontSize: 9,
                    letterSpacing: 1.5,
                    color: p.inkMute,
                    borderBottom: `1px solid ${p.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l, i) => (
              <tr key={i}>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${p.borderSoft}`, fontSize: 11, color: p.inkDim, whiteSpace: "nowrap" }}>
                  {l.quando}
                </td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${p.borderSoft}` }}>
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: 1,
                      color: l.acaoCor,
                      border: `1px solid ${l.acaoCor}`,
                      padding: "3px 8px",
                    }}
                  >
                    {l.acao}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${p.borderSoft}`, color: p.ink }}>
                  <span style={{ color: p.cyan, marginRight: 6 }}>◆</span>
                  {l.clinica}
                </td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${p.borderSoft}`, color: p.ink }}>
                  {l.executor}
                </td>
                <td style={{ padding: "10px 12px", borderBottom: `1px solid ${p.borderSoft}`, color: p.inkDim, fontStyle: "italic" }}>
                  "{l.motivo}"
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
