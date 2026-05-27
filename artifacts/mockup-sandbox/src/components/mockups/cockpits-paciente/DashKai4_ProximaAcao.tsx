import { DashModelo1_Sanfona } from "./DashModelo1_Sanfona";

/**
 * KAIZEN 4 · PRÓXIMA AÇÃO SUGERIDA · faixa IA no topo
 *
 * Sobre base PENUMBRA. Acima de tudo, uma faixa estreita ciano com:
 *  · Etiqueta "PRÓXIMA AÇÃO · MOTOR PAWARDS"
 *  · 1 frase com o item de maior prioridade calculado pelo motor
 *  · 2 botões: AGIR AGORA · VER OUTROS 4
 *
 * Hipótese: reduz paralisia de escolha (TDAH clássico) — não precisa
 * ler 5 cards pra decidir o que fazer primeiro.
 */
export function DashKai4_ProximaAcao() {
  return (
    <div className="tema-kai-4" style={{ filter: "brightness(0.93) saturate(0.92) contrast(1.08)" }}>
      <style>{`
        .tema-kai-4 *, .tema-kai-4 *::before, .tema-kai-4 *::after { animation: none !important; }
        .tema-kai-4 .pwd-menu-item-ativo {
          animation: pwd-breathe-cor 4.5s ease-in-out infinite !important;
          box-shadow: inset 0 0 6px rgba(255,255,255,0.02), 0 0 3px currentColor !important;
        }
        .tema-kai-4 .pwd-menu-item p.ink { opacity: 0.92 !important; }
        .tema-kai-4 [style*="color: rgb(157, 163, 174)"],
        .tema-kai-4 [style*="color: #9DA3AE"] { color: #BFC5CF !important; }
        .tema-kai-4 .pwd-crumb { color: #ECEFF4 !important; }
        .tema-kai-4 .pwd-menu-icone { text-shadow: none !important; }
      `}</style>

      {/* FAIXA PRÓXIMA AÇÃO · acima de tudo */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#04060B",
        borderBottom: "1.5px solid #5FE6CC",
        boxShadow: "0 0 8px rgba(95,230,204,0.25)",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        animation: "pwd-breathe-cor 4.5s ease-in-out infinite",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{
            fontSize: 9,
            letterSpacing: "0.20em",
            color: "#5FE6CC",
            border: "1px solid #5FE6CC",
            padding: "3px 7px",
            fontWeight: 700,
          }}>
            PRÓXIMA AÇÃO · MOTOR PAWARDS
          </span>
          <span style={{ fontSize: 12, color: "#ECEFF4", letterSpacing: "0.06em" }}>
            Revisar protocolo de <strong style={{ color: "#FF9A9A" }}>Graco Souza Pádua</strong> — interação NAD+ × atorvastatina em sessão 11:30 (16min)
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{
            background: "transparent",
            color: "#5FE6CC",
            border: "1px solid #5FE6CC",
            padding: "6px 14px",
            fontSize: 10,
            letterSpacing: "0.18em",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            borderRadius: 0,
          }}>AGIR AGORA</button>
          <button style={{
            background: "transparent",
            color: "#BFC5CF",
            border: "1px solid #2A2F3B",
            padding: "6px 14px",
            fontSize: 10,
            letterSpacing: "0.18em",
            cursor: "pointer",
            fontFamily: "inherit",
            borderRadius: 0,
          }}>VER OUTROS 4</button>
        </div>
      </div>

      <DashModelo1_Sanfona />
    </div>
  );
}
