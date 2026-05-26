import { palette as p } from "./_palette";
import { MioloAuditoriaExemplo } from "./MioloAuditoriaExemplo";

type Node = { label: string; children?: Node[]; ativo?: boolean };

const ARVORE: Node[] = [
  {
    label: "PAWARDS",
    children: [
      {
        label: "ADMIN",
        children: [
          {
            label: "PLATAFORMA",
            children: [
              { label: "Auditoria", ativo: true },
              { label: "Kill-Switch" },
              { label: "Sessões Ativas" },
              { label: "Unidades" },
            ],
          },
          { label: "RH & Colaboradores" },
          { label: "Catálogos" },
        ],
      },
      {
        label: "CLÍNICA",
        children: [
          { label: "Pacientes" },
          { label: "Anamnese" },
          { label: "Fórmulas" },
          { label: "Agenda" },
        ],
      },
      { label: "FINANCEIRO" },
      { label: "SISTEMA" },
    ],
  },
];

function ArvoreItem({ node, depth }: { node: Node; depth: number }) {
  const cor = node.ativo ? p.gold : depth === 0 ? p.cyan : p.ink;
  const bg = node.ativo ? `${p.gold}18` : "transparent";
  return (
    <div>
      <div
        style={{
          padding: "5px 10px",
          paddingLeft: 10 + depth * 14,
          fontSize: 11,
          color: cor,
          background: bg,
          borderLeft: node.ativo ? `3px solid ${p.gold}` : "3px solid transparent",
          letterSpacing: depth === 0 ? 1.5 : 0.5,
          fontWeight: depth === 0 ? 700 : node.ativo ? 700 : 400,
          textTransform: depth <= 1 ? "uppercase" : "none",
          cursor: "pointer",
        }}
      >
        {depth > 0 && <span style={{ color: p.inkMute, marginRight: 6 }}>{node.children ? "▾" : "·"}</span>}
        {node.label}
      </div>
      {node.children?.map((c, i) => <ArvoreItem key={i} node={c} depth={depth + 1} />)}
    </div>
  );
}

export function Chrome1SidebarArvore() {
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: p.mono, color: p.ink, display: "grid", gridTemplateColumns: "280px 1fr" }}>
      {/* SIDEBAR ÁRVORE PERSISTENTE */}
      <aside style={{ background: p.navy, borderRight: `1px solid ${p.border}`, padding: "16px 0", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "0 14px 12px", borderBottom: `1px solid ${p.border}`, marginBottom: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: p.gold }}>PAWARDS MEDCORE</div>
          <div style={{ fontSize: 11, color: p.inkDim, marginTop: 4 }}>CAIO R. · CEO</div>
        </div>
        <div style={{ padding: "0 0 10px" }}>
          {ARVORE.map((n, i) => <ArvoreItem key={i} node={n} depth={0} />)}
        </div>
        <div style={{ borderTop: `1px solid ${p.border}`, padding: "10px 14px", fontSize: 9, color: p.inkMute, letterSpacing: 1.2 }}>
          ░ ÁRVORE PERSISTENTE · caminho atual em dourado
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main style={{ overflowY: "auto" }}>
        <MioloAuditoriaExemplo />
      </main>
    </div>
  );
}
