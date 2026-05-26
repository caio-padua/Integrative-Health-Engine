import { palette as p, pulseCss, fontes } from "./_design";
import { FaixaLabirinto, FaixaOperador, Sidebar, HeaderPlaca, SeloFonte } from "./_pecas";
import { MioloAuditoriaExemplo } from "../MioloAuditoriaExemplo";

/**
 * CHROME 13 · CARDÁRIO
 * Cada grupo top-level é um card alto com "últimos 2 acessos". Memória visual.
 */
export function Chrome13Cardario() {
  const fonte = "jetbrains" as const;
  const f = fontes[fonte];
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: f.familia, color: p.ink }}>
      <style>{pulseCss}</style>
      <FaixaLabirinto fonte={f.familia} fonteChave={fonte} />
      <FaixaOperador  fonte={f.familia} fonteChave={fonte} />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr" }}>
        <Sidebar fonte={f.familia} fonteChave={fonte} modo="cards" />
        <main style={{ background: p.navy }}>
          <HeaderPlaca fonte={f.familia} fonteChave={fonte} />
          <div style={{ fontFamily: f.familia }}>
            <MioloAuditoriaExemplo />
          </div>
        </main>
      </div>
      <SeloFonte fonte={fonte} />
    </div>
  );
}
