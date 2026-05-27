/**
 * COMPARATIVO KAIZEN · 5 sugestões de melhoria contínua aplicadas sobre PENUMBRA
 *
 * Cada miniatura mostra UMA sugestão isolada pra você ver visualmente
 * antes de bater o martelo no skill.
 */

const VARIANTES: Array<{ slug: string; nome: string; descricao: string; categoria: "essencial" | "refino" }> = [
  { slug: "DashKai1_PulsoUnico",     nome: "K1 · PULSO ÚNICO",          descricao: "só item ativo do menu respira · UMA âncora viva",                   categoria: "essencial" },
  { slug: "DashKai2_NiveisAtencao",  nome: "K2 · 3 NÍVEIS DE ATENÇÃO",  descricao: "AGORA (borda 2px+pulso) · HOJE (sólido) · INFORMA (opacity 0.85)", categoria: "essencial" },
  { slug: "DashKai3_Freshness",      nome: "K3 · FRESHNESS",            descricao: "timestamp 'atualiz. HH:MM · há Xmin' em cada bloco",               categoria: "essencial" },
  { slug: "DashKai4_ProximaAcao",    nome: "K4 · PRÓXIMA AÇÃO",         descricao: "faixa IA no topo · sugere 1 ação prioritária + botões",            categoria: "refino" },
  { slug: "DashKai5_ModoFoco",       nome: "K5 · MODO FOCO",            descricao: "menu colapsado · só siglas · área central expandida",              categoria: "refino" },
];

const PREVIEW_BASE = "/__mockup/preview/cockpits-paciente";

export function DashKaiComparativo() {
  return (
    <div style={{
      width: "100vw", minHeight: "100vh",
      background: "#04060B",
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      color: "#E6E9EE",
      padding: 20,
      boxSizing: "border-box",
    }}>
      {/* CABEÇALHO */}
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        borderBottom: "1px solid #5FE6CC44",
        paddingBottom: 12, marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 18, letterSpacing: "0.18em", fontWeight: 700, color: "#5FE6CC" }}>
            PAWARDS · KAIZEN · 5 SUGESTÕES SOBRE PENUMBRA
          </div>
          <div style={{ fontSize: 11, color: "#BFC5CF", letterSpacing: "0.12em", marginTop: 4 }}>
            base: Penumbra (brightness 0.93 · contrast 1.08) · cada cartão isola uma melhoria · clique pra abrir tela cheia
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#BFC5CF", letterSpacing: "0.14em" }}>
          K1·K2·K3 = essenciais (mexem no DNA do skill) · K4·K5 = refino (pós-martelo)
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 18,
      }}>
        {VARIANTES.map(v => {
          const isEssencial = v.categoria === "essencial";
          const borderColor = isEssencial ? "#5FE6CC" : "#F5C97A";
          return (
            <div key={v.slug} style={{
              background: "#0A0E16",
              border: `1.5px solid ${borderColor}`,
              boxShadow: `0 0 10px ${borderColor}33`,
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              <a
                href={`${PREVIEW_BASE}/${v.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "#0E1320",
                  borderBottom: `1px solid ${borderColor}55`,
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, letterSpacing: "0.16em", fontWeight: 700, color: "#ECEFF4" }}>
                    {v.nome}
                  </div>
                  <div style={{ fontSize: 9, color: "#BFC5CF", letterSpacing: "0.10em", marginTop: 3 }}>
                    {v.descricao}
                  </div>
                </div>
                <span style={{
                  fontSize: 8, letterSpacing: "0.18em", fontWeight: 700,
                  color: borderColor,
                  border: `1px solid ${borderColor}`,
                  padding: "2px 6px",
                  whiteSpace: "nowrap",
                }}>
                  {isEssencial ? "ESSENCIAL" : "REFINO"}
                </span>
              </a>

              <div style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1500 / 900",
                overflow: "hidden",
                background: "#04060B",
              }}>
                <iframe
                  src={`${PREVIEW_BASE}/${v.slug}`}
                  title={v.nome}
                  style={{
                    position: "absolute",
                    top: 0, left: 0,
                    width: 1500, height: 900,
                    border: "none",
                    transform: "scale(0.33)",
                    transformOrigin: "top left",
                    pointerEvents: "none",
                  }}
                />
                <a
                  href={`${PREVIEW_BASE}/${v.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ position: "absolute", inset: 0, cursor: "zoom-in" }}
                  aria-label={`Abrir ${v.nome} em tela cheia`}
                />
              </div>
            </div>
          );
        })}

        {/* SLOT 6 · LEGENDA */}
        <div style={{
          background: "#0A0E16",
          border: "1px dashed #5FE6CC44",
          padding: 16,
          display: "flex", flexDirection: "column", justifyContent: "center",
          fontSize: 11, color: "#ECEFF4", lineHeight: 1.7, letterSpacing: "0.04em",
        }}>
          <div style={{ fontSize: 12, letterSpacing: "0.18em", fontWeight: 700, color: "#5FE6CC", marginBottom: 10 }}>
            COMO DECIDIR
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: "#5FE6CC" }}>ESSENCIAIS</strong> (K1·K2·K3) — entram no skill como regras inegociáveis. Toda próxima tela Pawards nasce com elas.
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: "#F5C97A" }}>REFINO</strong> (K4·K5) — viram backlog de melhoria contínua. Você decide ordem e momento.
          </div>
          <div style={{ marginBottom: 8, color: "#BFC5CF", borderTop: "1px solid #2A2F3B", paddingTop: 10 }}>
            Você pode:
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>A)</strong> Aprovar K1+K2+K3, bater martelo, criar skill
          </div>
          <div style={{ marginBottom: 4 }}>
            <strong>B)</strong> Aprovar só uma/duas das essenciais
          </div>
          <div>
            <strong>C)</strong> Rejeitar todas, ir com Penumbra pura
          </div>
        </div>
      </div>
    </div>
  );
}
