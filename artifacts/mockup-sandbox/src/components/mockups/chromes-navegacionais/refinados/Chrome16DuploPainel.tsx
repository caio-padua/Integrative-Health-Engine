import { palette as p, pulseCss, fontes } from "./_design";
import { FaixaLabirinto, FaixaOperador, Sidebar, HeaderPlaca, PainelDetalhe, SeloFonte } from "./_pecas";
import { MioloAuditoriaExemplo } from "../MioloAuditoriaExemplo";

/**
 * CHROME 16 · DUPLO PAINEL
 * 3 colunas: sidebar + miolo + painel-de-detalhe (360px). Workflow real:
 * clica linha da auditoria → contexto aparece ao lado sem perder a tabela.
 */
export function Chrome16DuploPainel() {
  const fonte = "jetbrains" as const;
  const f = fontes[fonte];
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: f.familia, color: p.ink }}>
      <style>{pulseCss}</style>
      <FaixaLabirinto fonte={f.familia} fonteChave={fonte} />
      <FaixaOperador  fonte={f.familia} fonteChave={fonte} />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 360px" }}>
        <Sidebar fonte={f.familia} fonteChave={fonte} />
        <main style={{ background: p.navy }}>
          <HeaderPlaca fonte={f.familia} fonteChave={fonte} />
          <div style={{ fontFamily: f.familia }}>
            <MioloAuditoriaExemplo />
          </div>
        </main>
        <PainelDetalhe fonte={f.familia} fonteChave={fonte} />
      </div>
      <SeloFonte fonte={fonte} />
    </div>
  );
}
