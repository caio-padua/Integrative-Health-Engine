import { palette as p, pulseCss, type FonteChave, fontes } from "./_design";
import { FaixaLabirinto, FaixaOperador, Sidebar, HeaderPlaca, SeloFonte } from "./_pecas";
import { MioloAuditoriaExemplo } from "../MioloAuditoriaExemplo";

/**
 * CHROME REFINADO BASE (Chromes 7-11)
 * Layout em T: faixa-labirinto + faixa-operador atravessam, sidebar não chega ao teto.
 */
export function ChromeRefinadoBase({ fonte }: { fonte: FonteChave }) {
  const f = fontes[fonte];
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: f.familia, color: p.ink }}>
      <style>{pulseCss}</style>
      <FaixaLabirinto fonte={f.familia} fonteChave={fonte} />
      <FaixaOperador  fonte={f.familia} fonteChave={fonte} />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
        <Sidebar fonte={f.familia} fonteChave={fonte} />
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
