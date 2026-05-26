import { palette as p, pulseCss, fontes } from "./_design";
import { FaixaLabirinto, FaixaOperador, Sidebar, SeloFonte } from "./_pecas";
import { MioloAuditoriaExemplo } from "../MioloAuditoriaExemplo";

/**
 * CHROME 15 · CATEDRAL
 * Faixa-labirinto vira monograma GIGANTE no topo. Header-placa some (dispensa redundância).
 * Mais clássico/minimalista — "menos é mais".
 */
export function Chrome15Catedral() {
  const fonte = "jetbrains" as const;
  const f = fontes[fonte];
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: f.familia, color: p.ink }}>
      <style>{pulseCss}</style>
      <FaixaLabirinto fonte={f.familia} fonteChave={fonte} modo="gigante" />
      <FaixaOperador  fonte={f.familia} fonteChave={fonte} />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
        <Sidebar fonte={f.familia} fonteChave={fonte} />
        <main style={{ background: p.navy }}>
          {/* Header placa OMITIDO — a faixa-labirinto gigante já diz onde você está */}
          <div style={{ fontFamily: f.familia }}>
            <MioloAuditoriaExemplo />
          </div>
        </main>
      </div>
      <SeloFonte fonte={fonte} />
    </div>
  );
}
