import { palette as p, pasteis, pulseCss, fontes, type FonteChave, type GrupoChave } from "./_design";
import { MioloAuditoriaExemplo } from "../MioloAuditoriaExemplo";

type Submenu = { label: string; ativo?: boolean; filhoAtivo?: string };
type Nivel = {
  chave: GrupoChave;
  titulo: string;
  icone: string;
  ativo?: boolean;
  submenus: Submenu[];
};

const ARVORE: Nivel[] = [
  {
    chave: "admin",
    titulo: "ADMINISTRAÇÃO",
    icone: "▢",
    ativo: true,
    submenus: [
      { label: "PLATAFORMA", ativo: true, filhoAtivo: "AUDITORIA" },
      { label: "RH & COLABORADORES" },
      { label: "CATÁLOGOS GERAIS" },
    ],
  },
  { chave: "clinica",    titulo: "CLÍNICA",     icone: "✚", submenus: [{ label: "PACIENTES" }, { label: "ANAMNESE" }, { label: "FÓRMULAS" }, { label: "AGENDA" }] },
  { chave: "financeiro", titulo: "FINANCEIRO",  icone: "$", submenus: [{ label: "RECEITAS" }, { label: "PAGAMENTOS" }, { label: "RELATÓRIOS" }] },
  { chave: "catalogos",  titulo: "CATÁLOGOS",   icone: "☰", submenus: [{ label: "INJETÁVEIS" }, { label: "FÓRMULAS MAGISTRAIS" }, { label: "PROTOCOLOS" }] },
  { chave: "sistema",    titulo: "SISTEMA",     icone: "⚙", submenus: [{ label: "UNIDADES" }, { label: "PERFIS & PERMISSÕES" }, { label: "MOTOR COMERCIAL" }] },
];

const TRILHA = [
  { label: "🏛 PAWARDS",      cor: p.gold },
  { label: "ADMINISTRAÇÃO",   cor: pasteis.admin.neon },
  { label: "PLATAFORMA",      cor: pasteis.admin.neon },
  { label: "AUDITORIA",       cor: p.gold, ativo: true },
];

/* Linha do tempo simplificada — só 2 itens (volta 3 kaizen):
   última ação realizada + próximo compromisso. */
const TIMELINE_CENTRO = [
  { hora: "09:14", verbo: "AGORA",    alvo: "AUDITORIA KILL-SWITCH",  ativo: true },
  { hora: "10:00", verbo: "PRÓXIMO",  alvo: "REUNIÃO · DR. MARCO",     proximo: true },
];

/* ──────────────────────────────────────────────────────────────────
   Helper — letter-spacing adaptativo: mono aguenta 2-3, sans só 0.5-1
   ──────────────────────────────────────────────────────────────── */
function trackMono(fonte: FonteChave, base: number): number {
  // Mono families
  if (fonte === "jetbrains" || fonte === "ibmplex") return base;
  // Sans / serif — reduz pra ~40% pra não esticar demais
  return Math.max(0.3, base * 0.4);
}

/* ──────────────────────────────────────────────────────────────────
   FAIXA-LABIRINTO (linha 1)
   ──────────────────────────────────────────────────────────────── */
function FaixaLabirinto({ fonte, fonteChave }: { fonte: string; fonteChave: FonteChave }) {
  const ls = trackMono(fonteChave, 2);
  return (
    <div
      style={{
        background: p.navyTopBar,
        borderBottom: `1px solid ${p.border}`,
        padding: "11px 28px",
        display: "flex",
        alignItems: "center",
        fontFamily: fonte,
      }}
    >
      <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls, marginRight: 18 }}>░ TRILHA</div>
      {TRILHA.map((no, i) => {
        const ultimo = i === TRILHA.length - 1;
        return (
          <div key={no.label} style={{ display: "flex", alignItems: "center" }}>
            <div
              className={no.ativo ? "pawards-piscar" : undefined}
              style={{
                width: 10, height: 10,
                background: no.cor,
                boxShadow: no.ativo ? `0 0 12px ${no.cor}` : "none",
              }}
            />
            <div
              style={{
                fontSize: 10, letterSpacing: ls,
                color: no.ativo ? no.cor : p.inkDim,
                fontWeight: no.ativo ? 700 : 500,
                marginLeft: 7, marginRight: ultimo ? 0 : 10,
                textTransform: "uppercase",
              }}
            >
              {no.label}
            </div>
            {!ultimo && (
              <div
                style={{
                  width: 44, height: 2,
                  background: `linear-gradient(90deg, ${no.cor}, ${TRILHA[i + 1].cor})`,
                  marginRight: 10, opacity: 0.7,
                }}
              />
            )}
          </div>
        );
      })}
      <div style={{ marginLeft: "auto", fontSize: 9, color: p.inkMute, letterSpacing: trackMono(fonteChave, 1.5) }}>
        ▸ CLIQUE QUALQUER NÓ PRA VOLTAR
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   FAIXA-OPERADOR (linha 2 — topo do "T")
   3 blocos com gap GENEROSO. Linha do tempo simplificada (2 itens).
   Bloco-dentro-de-bloco MAIS CONTRASTADO (kaizen volta 3).
   ──────────────────────────────────────────────────────────────── */
function FaixaOperador({ fonte, fonteChave }: { fonte: string; fonteChave: FonteChave }) {
  const lsForte = trackMono(fonteChave, 2);
  const lsSuave = trackMono(fonteChave, 1.2);
  return (
    <div
      style={{
        background: p.navyPanel,
        borderBottom: `2px solid ${p.gold}`,
        padding: "11px 28px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 36,
        alignItems: "center",
        fontFamily: fonte,
      }}
    >
      {/* ESQUERDA: bloco clínica neon + toggle Local/Global */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: p.navyDeep,
            border: `1px solid ${p.cyan}`,
            padding: "6px 14px",
            boxShadow: `inset 0 0 12px rgba(94,230,230,0.18)`,
          }}
        >
          <span style={{ width: 8, height: 8, background: p.cyan, boxShadow: `0 0 8px ${p.cyan}` }} />
          <span style={{ fontSize: 11, letterSpacing: lsForte, color: p.cyan, fontWeight: 700 }}>PÁDUA</span>
        </div>
        <div style={{ display: "flex", border: `1px solid ${p.border}`, fontSize: 10, letterSpacing: lsSuave }}>
          <span style={{ padding: "5px 12px", background: p.gold, color: p.navyDeep, fontWeight: 700 }}>LOCAL</span>
          <span style={{ padding: "5px 12px", color: p.inkMute }}>GLOBAL</span>
        </div>
      </div>

      {/* CENTRO: linha do tempo (apenas 2 itens — última + próximo) */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, justifyContent: "center", overflow: "hidden" }}>
        {TIMELINE_CENTRO.map((evt, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              whiteSpace: "nowrap",
              padding: "4px 12px",
              border: `1px solid ${evt.ativo ? p.gold : evt.proximo ? p.cyan : p.border}`,
              background: evt.ativo ? "rgba(200,155,60,0.08)" : evt.proximo ? "rgba(94,230,230,0.06)" : "transparent",
            }}
          >
            <span
              style={{
                width: 7, height: 7,
                background: evt.ativo ? p.gold : evt.proximo ? p.cyan : p.inkMute,
                boxShadow: evt.ativo ? `0 0 6px ${p.gold}` : evt.proximo ? `0 0 6px ${p.cyan}` : "none",
              }}
            />
            <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsSuave, fontVariantNumeric: "tabular-nums" }}>
              {evt.hora}
            </span>
            <span
              style={{
                fontSize: 9, letterSpacing: lsForte,
                color: evt.ativo ? p.gold : evt.proximo ? p.cyan : p.inkDim,
                fontWeight: 700,
              }}
            >
              {evt.verbo}
            </span>
            <span style={{ fontSize: 10, color: p.ink, letterSpacing: lsSuave }}>{evt.alvo}</span>
          </div>
        ))}
      </div>

      {/* DIREITA: bloco-dentro-de-bloco (estilo Paint do CEO) + config + logoff
          - Wrapper EXTERNO: label CEO·MÉDICO (cargo/função)
          - Interno: nome CAIO H. F. PADUA
          - Borda externa GROSSA dourada, interna fina cyan-clara */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex", alignItems: "center",
            border: `2px solid ${p.gold}`,
            background: "rgba(200,155,60,0.08)",
            padding: "4px",
            position: "relative",
          }}
        >
          {/* TAG da função no canto superior esquerdo do wrapper externo */}
          <div
            style={{
              position: "absolute",
              top: -8, left: 8,
              background: p.navyDeep,
              padding: "0 6px",
              fontSize: 8,
              letterSpacing: lsForte,
              color: p.gold,
              fontWeight: 700,
            }}
          >
            CEO · MÉDICO
          </div>
          <div
            style={{
              background: p.navyDeep,
              border: `1px solid ${p.goldSoft}`,
              padding: "6px 14px",
              fontSize: 11,
              letterSpacing: lsForte,
              color: p.goldSoft,
              fontWeight: 700,
            }}
          >
            CAIO H. F. PADUA
          </div>
        </div>
        <span title="Configurações" style={{ fontSize: 18, color: p.inkDim, cursor: "pointer", lineHeight: 1 }}>⚙</span>
        <span title="Sair" style={{ fontSize: 16, color: p.danger, cursor: "pointer", lineHeight: 1 }}>⏻</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   SIDEBAR — não vai ao teto (T). 3 camadas no submenu ativo.
   ──────────────────────────────────────────────────────────────── */
function Sidebar({ fonte, fonteChave }: { fonte: string; fonteChave: FonteChave }) {
  const lsForte = trackMono(fonteChave, 2);
  const lsSuave = trackMono(fonteChave, 1.5);
  return (
    <aside
      style={{
        background: p.navy,
        borderRight: `1px solid ${p.border}`,
        padding: "16px 12px",
        fontFamily: fonte,
        overflowY: "auto",
      }}
    >
      <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsSuave, marginBottom: 16 }}>
        ░ NAVEGAÇÃO
      </div>

      {ARVORE.map((nivel) => {
        const cor = pasteis[nivel.chave];
        const ativo = nivel.ativo;
        return (
          <div key={nivel.chave} style={{ marginBottom: 10 }}>
            {/* BOTÃO TOP-LEVEL: corpo inteiro pastel; ativo vira neon inteiro */}
            <div
              style={{
                background: ativo ? cor.neon : cor.pastel,
                color: ativo ? "#0A1428" : "#FFFFFF",
                padding: "10px 12px",
                fontSize: 11,
                letterSpacing: lsForte,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                boxShadow: ativo ? `0 0 18px ${cor.glow}, inset 0 0 0 1px ${cor.neon}` : "none",
                textTransform: "uppercase",
              }}
            >
              <span style={{ fontSize: 14 }}>{nivel.icone}</span>
              <span>{nivel.titulo}</span>
            </div>

            {/* CAIXA NEON SUAVE englobando todos os filhos (camada 2) */}
            {ativo && (
              <div
                style={{
                  marginTop: 6,
                  marginLeft: 14,
                  padding: "8px 8px 8px 14px",
                  background: cor.soft,
                  border: `1px solid ${cor.softBorder}`,
                  position: "relative",
                }}
              >
                {/* COLUNA DE PERTENCIMENTO (camada 1) */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: cor.neon,
                    boxShadow: `0 0 8px ${cor.glow}`,
                  }}
                />
                {nivel.submenus.map((sub) => (
                  <div key={sub.label}>
                    {sub.ativo ? (
                      <div
                        className="pawards-respira"
                        style={{
                          fontSize: 10,
                          letterSpacing: lsSuave,
                          color: "#0A1428",
                          padding: "7px 10px",
                          fontWeight: 700,
                          ["--respira-cor-forte" as never]: cor.neon,
                          ["--respira-cor-fraca" as never]: cor.glow,
                          ["--respira-fundo-min" as never]: cor.neon,
                          ["--respira-fundo-max" as never]: cor.neon,
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        ▸ {sub.label}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: lsSuave,
                          color: p.inkDim,
                          padding: "7px 10px",
                          cursor: "pointer",
                          marginBottom: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        ▸ {sub.label}
                      </div>
                    )}

                    {sub.filhoAtivo && (
                      <div style={{ position: "relative", marginLeft: 14, paddingLeft: 14, marginBottom: 4 }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: "50%", width: 2, background: p.gold, opacity: 0.7 }} />
                        <div style={{ position: "absolute", left: 0, top: "50%", width: 12, height: 2, background: p.gold, opacity: 0.7 }} />
                        <div
                          style={{
                            fontSize: 10,
                            letterSpacing: lsSuave,
                            color: "#0A1428",
                            background: p.gold,
                            padding: "6px 10px",
                            fontWeight: 700,
                            boxShadow: `0 0 14px rgba(200,155,60,0.5)`,
                            textTransform: "uppercase",
                          }}
                        >
                          ◆ {sub.filhoAtivo}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────────
   HEADER PLACA HOSPITAL
   ──────────────────────────────────────────────────────────────── */
function HeaderPlaca({ fonte, fonteChave }: { fonte: string; fonteChave: FonteChave }) {
  const lsForte = trackMono(fonteChave, 3);
  const lsSuave = trackMono(fonteChave, 1.5);
  return (
    <div
      style={{
        background: p.navyPanel,
        borderBottom: `3px solid ${p.gold}`,
        padding: "16px 28px 14px",
        fontFamily: fonte,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: lsForte,
          color: pasteis.admin.neon,
          textTransform: "uppercase",
          borderLeft: `3px solid ${pasteis.admin.neon}`,
          paddingLeft: 10,
          marginBottom: 8,
        }}
      >
        ◂ ADMINISTRAÇÃO · PLATAFORMA
      </div>
      <div
        style={{
          fontSize: 34,
          letterSpacing: trackMono(fonteChave, 4),
          color: p.gold,
          textTransform: "uppercase",
          fontWeight: 700,
          borderLeft: `3px solid ${p.gold}`,
          paddingLeft: 10,
          lineHeight: 1,
        }}
      >
        AUDITORIA
      </div>
      <div
        style={{
          fontSize: 10,
          color: p.inkMute,
          marginTop: 8,
          paddingLeft: 13,
          letterSpacing: lsSuave,
        }}
      >
        ░ SALA · KILL-SWITCH · IMUTÁVEL · LGPD/CFM
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   CHROME REFINADO BASE
   ──────────────────────────────────────────────────────────────── */
export function ChromeRefinadoBase({ fonte }: { fonte: FonteChave }) {
  const f = fontes[fonte];
  return (
    <div style={{ background: p.navyDeep, minHeight: "100vh", fontFamily: f.familia, color: p.ink }}>
      <style>{pulseCss}</style>

      {/* LINHA 1: faixa-labirinto (atravessa) */}
      <FaixaLabirinto fonte={f.familia} fonteChave={fonte} />

      {/* LINHA 2: faixa-operador = topo do T (atravessa) */}
      <FaixaOperador fonte={f.familia} fonteChave={fonte} />

      {/* LINHA 3: sidebar | coluna direita */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr" }}>
        <Sidebar fonte={f.familia} fonteChave={fonte} />
        <main style={{ background: p.navy }}>
          <HeaderPlaca fonte={f.familia} fonteChave={fonte} />
          <div style={{ fontFamily: f.familia }}>
            <MioloAuditoriaExemplo />
          </div>
        </main>
      </div>

      {/* SELO DA FONTE — canto inferior ESQUERDO (kaizen volta 3, não briga com config/logoff) */}
      <div
        style={{
          position: "fixed",
          bottom: 8,
          left: 12,
          background: p.navyDeep,
          border: `1px solid ${p.gold}`,
          padding: "6px 12px",
          fontFamily: f.familia,
          fontSize: 10,
          letterSpacing: trackMono(fonte, 2),
          color: p.gold,
          opacity: 0.92,
        }}
      >
        FONTE · <b>{f.rotulo}</b> — <span style={{ color: p.inkDim }}>{f.carater}</span>
      </div>
    </div>
  );
}
