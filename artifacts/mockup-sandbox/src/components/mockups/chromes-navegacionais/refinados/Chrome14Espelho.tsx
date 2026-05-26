import { palette as p, pulseCss, fontes } from "./_design";
import { FaixaLabirinto, FaixaOperador, Sidebar, HeaderPlaca, SeloFonte } from "./_pecas";
import { MioloAuditoriaExemplo } from "../MioloAuditoriaExemplo";

/**
 * CHROME 14 · ESPELHO
 * Sidebar à DIREITA. Trilha-labirinto invertida. Pra destros de mouse.
 */
export function Chrome14Espelho() {
  const fonte = "jetbrains" as const;
  const f = fontes[fonte];
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: f.familia, color: p.ink }}>
      <style>{pulseCss}</style>
      <FaixaLabirinto fonte={f.familia} fonteChave={fonte} invertida />
      <FaixaOperador  fonte={f.familia} fonteChave={fonte} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px" }}>
        <main style={{ background: p.navy }}>
          <HeaderPlaca fonte={f.familia} fonteChave={fonte} />
          <div style={{ fontFamily: f.familia }}>
            <MioloAuditoriaExemplo />
          </div>
        </main>
        <Sidebar fonte={f.familia} fonteChave={fonte} lado="direita" />
      </div>
      <SeloFonte fonte={fonte} />
    </div>
  );
}
