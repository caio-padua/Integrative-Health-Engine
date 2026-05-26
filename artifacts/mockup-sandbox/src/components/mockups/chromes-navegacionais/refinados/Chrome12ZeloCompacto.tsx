import { palette as p, pulseCss, fontes } from "./_design";
import { FaixaLabirinto, FaixaOperador, Sidebar, HeaderPlaca, SeloFonte } from "./_pecas";
import { MioloAuditoriaExemplo } from "../MioloAuditoriaExemplo";

/**
 * CHROME 12 · ZELO COMPACTO
 * Sidebar estreita (94px): só ícone + sigla 3-letras. Mais miolo livre.
 */
export function Chrome12ZeloCompacto() {
  const fonte = "jetbrains" as const;
  const f = fontes[fonte];
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: f.familia, color: p.ink }}>
      <style>{pulseCss}</style>
      <FaixaLabirinto fonte={f.familia} fonteChave={fonte} />
      <FaixaOperador  fonte={f.familia} fonteChave={fonte} />
      <div style={{ display: "grid", gridTemplateColumns: "94px 1fr" }}>
        <Sidebar fonte={f.familia} fonteChave={fonte} modo="compacto" />
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
