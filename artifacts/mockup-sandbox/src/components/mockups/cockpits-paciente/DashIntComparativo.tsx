/**
 * COMPARATIVO · 5 VARIANTES DE INTENSIDADE LUMINOSA LADO A LADO
 *
 * Mostra A/B/C/D/E em miniaturas (scale 0.42) num grid 2x3 (5 + 1 vazio).
 * Cada miniatura é um <iframe> embutindo a variante real — assim o que
 * você vê AQUI é exatamente o que vê na URL grande, só menor.
 */

const VARIANTES: Array<{ slug: string; nome: string; descricao: string; recomendado?: string }> = [
  { slug: "DashIntA_Neon",      nome: "A · NEON TOTAL",     descricao: "Glow 100% · pulso 2.8s · referência atual" },
  { slug: "DashIntB_Brilho",    nome: "B · BRILHO MÉDIO",   descricao: "Glow 60% · pulso 2.8s · cores preservadas" },
  { slug: "DashIntC_Penumbra",  nome: "C · PENUMBRA",       descricao: "Glow 30% · pulso lento 4.5s · cockpit submarino", recomendado: "RECOMENDADO" },
  { slug: "DashIntD_Tinta",     nome: "D · TINTA SECA",     descricao: "Zero glow externo · pulso só no ATIVO · papel jurídico", recomendado: "RECOMENDADO" },
  { slug: "DashIntE_Carbono",   nome: "E · CARBONO",        descricao: "Monocromia funcional · zero pulso · terminal NASA" },
];

const PREVIEW_BASE = "/__mockup/preview/cockpits-paciente";

export function DashIntComparativo() {
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
        borderBottom: "1px solid #D4AF3744",
        paddingBottom: 12, marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 18, letterSpacing: "0.18em", fontWeight: 700, color: "#5FE6CC" }}>
            PAWARDS · COMPARATIVO 5 INTENSIDADES LUMINOSAS
          </div>
          <div style={{ fontSize: 11, color: "#9DA3AE", letterSpacing: "0.12em", marginTop: 4 }}>
            mesma estrutura · mesma identidade · mesmo alinhamento · só a luz muda
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#9DA3AE", letterSpacing: "0.14em" }}>
          clique no título de qualquer variante pra abrir em tela cheia
        </div>
      </div>

      {/* GRID 3x2 com 5 miniaturas (último slot vazio) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 18,
      }}>
        {VARIANTES.map(v => (
          <div key={v.slug} style={{
            background: "#0A0E16",
            border: v.recomendado ? "1.5px solid #5FE6CC" : "1px solid #2A2F3B",
            boxShadow: v.recomendado ? "0 0 12px #5FE6CC44" : "none",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* LABEL com link pra abrir tela cheia */}
            <a
              href={`${PREVIEW_BASE}/${v.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                background: "#0E1320",
                borderBottom: "1px solid #2A2F3B",
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.16em", fontWeight: 700, color: "#E6E9EE" }}>
                  {v.nome}
                </div>
                <div style={{ fontSize: 9, color: "#9DA3AE", letterSpacing: "0.10em", marginTop: 3 }}>
                  {v.descricao}
                </div>
              </div>
              {v.recomendado && (
                <span style={{
                  fontSize: 8, letterSpacing: "0.18em", fontWeight: 700,
                  color: "#5FE6CC",
                  border: "1px solid #5FE6CC",
                  padding: "2px 6px",
                }}>
                  {v.recomendado}
                </span>
              )}
            </a>

            {/* IFRAME EM ESCALA · 1500x900 reduzido pra caber na coluna */}
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
              {/* OVERLAY que captura clique pra abrir versão grande */}
              <a
                href={`${PREVIEW_BASE}/${v.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  position: "absolute", inset: 0,
                  cursor: "zoom-in",
                }}
                aria-label={`Abrir ${v.nome} em tela cheia`}
              />
            </div>
          </div>
        ))}

        {/* SLOT 6 · sumário/legenda */}
        <div style={{
          background: "#0A0E16",
          border: "1px dashed #D4AF3744",
          padding: 16,
          display: "flex", flexDirection: "column", justifyContent: "center",
          fontSize: 11, color: "#E6E9EE", lineHeight: 1.7, letterSpacing: "0.04em",
        }}>
          <div style={{ fontSize: 12, letterSpacing: "0.18em", fontWeight: 700, color: "#F5C97A", marginBottom: 10 }}>
            COMO ESCOLHER
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: "#5FE6CC" }}>C PENUMBRA</strong> · se você gosta da "respiração" dos elementos mas quer ritmo mais calmo
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: "#5FE6CC" }}>D TINTA SECA</strong> · se quer mais "documento jurídico" · pulso só no item ativo · UMA âncora visual
          </div>
          <div style={{ marginBottom: 8, color: "#9DA3AE" }}>
            <strong>A NEON</strong> · só pra demo curta · cansa em sessão {`>`} 2h
          </div>
          <div style={{ marginBottom: 8, color: "#9DA3AE" }}>
            <strong>B BRILHO</strong> · meio termo se C parecer apagada demais
          </div>
          <div style={{ color: "#9DA3AE" }}>
            <strong>E CARBONO</strong> · turno noturno extremo · perde identidade por cor
          </div>
          <div style={{ marginTop: 14, fontSize: 9, color: "#9DA3AE", letterSpacing: "0.10em", borderTop: "1px solid #2A2F3B", paddingTop: 10 }}>
            depois que você bater o martelo eu aplico no _dashShell e crio o skill PAWARDS-COCKPIT
          </div>
        </div>
      </div>
    </div>
  );
}
