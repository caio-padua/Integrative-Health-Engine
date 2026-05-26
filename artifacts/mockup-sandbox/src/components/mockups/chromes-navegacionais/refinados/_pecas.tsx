import { palette as p, pasteis, fontes, type FonteChave, type GrupoChave } from "./_design";

type Submenu = { label: string; ativo?: boolean; filhoAtivo?: string };
type Nivel = {
  chave: GrupoChave;
  titulo: string;
  sigla: string;
  icone: string;
  ativo?: boolean;
  submenus: Submenu[];
  ultimos?: string[];
};

export const ARVORE: Nivel[] = [
  {
    chave: "admin", titulo: "ADMINISTRAÇÃO", sigla: "ADM", icone: "▢", ativo: true,
    submenus: [
      { label: "PLATAFORMA", ativo: true, filhoAtivo: "AUDITORIA" },
      { label: "RH & COLABORADORES" },
      { label: "CATÁLOGOS GERAIS" },
    ],
    ultimos: ["AUDITORIA", "PERFIS"],
  },
  { chave: "clinica",    titulo: "CLÍNICA",     sigla: "CLN", icone: "✚", submenus: [{ label: "PACIENTES" }, { label: "ANAMNESE" }, { label: "FÓRMULAS" }, { label: "AGENDA" }], ultimos: ["PACIENTE LUCIANO", "ANAMNESE #4827"] },
  { chave: "financeiro", titulo: "FINANCEIRO",  sigla: "FIN", icone: "$", submenus: [{ label: "RECEITAS" }, { label: "PAGAMENTOS" }, { label: "RELATÓRIOS" }], ultimos: ["RECEITA #18", "FLUXO 26/MAI"] },
  { chave: "catalogos",  titulo: "CATÁLOGOS",   sigla: "CAT", icone: "☰", submenus: [{ label: "INJETÁVEIS" }, { label: "FÓRMULAS MAGISTRAIS" }, { label: "PROTOCOLOS" }], ultimos: ["NAD+", "PROT-OXI"] },
  { chave: "sistema",    titulo: "SISTEMA",     sigla: "SIS", icone: "⚙", submenus: [{ label: "UNIDADES" }, { label: "PERFIS & PERMISSÕES" }, { label: "MOTOR COMERCIAL" }], ultimos: ["UND PÁDUA", "PERFIL MÉDICO"] },
];

export const TRILHA = [
  { label: "🏛 PAWARDS",      cor: p.gold },
  { label: "ADMINISTRAÇÃO",   cor: pasteis.admin.neon },
  { label: "PLATAFORMA",      cor: pasteis.admin.neon },
  { label: "AUDITORIA",       cor: p.gold, ativo: true },
];

export const TIMELINE_CENTRO = [
  { hora: "09:14", verbo: "AGORA",    alvo: "AUDITORIA KILL-SWITCH",  ativo: true },
  { hora: "10:00", verbo: "PRÓXIMO",  alvo: "REUNIÃO · DR. MARCO",     proximo: true },
];

/** Letter-spacing adaptativo: mono aguenta 2-3, sans/serif só 40%. */
export function trackMono(fonte: FonteChave, base: number): number {
  if (fonte === "jetbrains" || fonte === "ibmplex") return base;
  return Math.max(0.3, base * 0.4);
}

/* ──────────────────────────────────────────────────────────────────
   FAIXA-LABIRINTO
   modo="padrao" → trilha compacta no topo
   modo="gigante" → trilha em formato monograma (Chrome 15 Catedral)
   invertida → ordem reversa (Chrome 14 Espelho)
   ──────────────────────────────────────────────────────────────── */
export function FaixaLabirinto({
  fonte, fonteChave, modo = "padrao", invertida = false,
}: { fonte: string; fonteChave: FonteChave; modo?: "padrao" | "gigante"; invertida?: boolean }) {
  const ls = trackMono(fonteChave, 2);
  const trilha = invertida ? [...TRILHA].reverse() : TRILHA;

  if (modo === "gigante") {
    return (
      <div style={{ background: p.navyTopBar, borderBottom: `2px solid ${p.gold}`, padding: "20px 28px", fontFamily: fonte }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
          {trilha.map((no, i) => {
            const ultimo = i === trilha.length - 1;
            return (
              <div key={no.label} style={{ display: "flex", alignItems: "center" }}>
                <div
                  className={no.ativo ? "pawards-piscar" : undefined}
                  style={{
                    background: no.ativo ? "rgba(200,155,60,0.12)" : "transparent",
                    border: `2px solid ${no.cor}`,
                    padding: "8px 18px",
                    fontSize: no.ativo ? 22 : 13,
                    letterSpacing: trackMono(fonteChave, 3),
                    color: no.ativo ? no.cor : p.inkDim,
                    fontWeight: 700,
                    boxShadow: no.ativo ? `0 0 18px ${no.cor}` : "none",
                    textTransform: "uppercase",
                  }}
                >
                  {no.label}
                </div>
                {!ultimo && (
                  <div
                    style={{
                      width: 56, height: 3,
                      background: `linear-gradient(90deg, ${no.cor}, ${trilha[i + 1].cor})`,
                      margin: "0 6px", opacity: 0.8,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: p.navyTopBar, borderBottom: `1px solid ${p.border}`, padding: "11px 28px", display: "flex", alignItems: "center", fontFamily: fonte, flexDirection: invertida ? "row-reverse" : "row" }}>
      <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls, marginRight: invertida ? 0 : 18, marginLeft: invertida ? 18 : 0, whiteSpace: "nowrap" }}>░ TRILHA</div>
      {trilha.map((no, i) => {
        const ultimo = i === trilha.length - 1;
        return (
          <div key={no.label} style={{ display: "flex", alignItems: "center", flexDirection: invertida ? "row-reverse" : "row" }}>
            <div
              className={no.ativo ? "pawards-piscar" : undefined}
              style={{ width: 10, height: 10, background: no.cor, boxShadow: no.ativo ? `0 0 12px ${no.cor}` : "none" }}
            />
            <div style={{
              fontSize: 10, letterSpacing: ls,
              color: no.ativo ? no.cor : p.inkDim,
              fontWeight: no.ativo ? 700 : 500,
              marginLeft: invertida ? (ultimo ? 0 : 10) : 7,
              marginRight: invertida ? 7 : (ultimo ? 0 : 10),
              textTransform: "uppercase",
            }}>
              {no.label}
            </div>
            {!ultimo && (
              <div style={{ width: 44, height: 2, background: `linear-gradient(90deg, ${no.cor}, ${trilha[i + 1].cor})`, marginRight: invertida ? 0 : 10, marginLeft: invertida ? 10 : 0, opacity: 0.7 }} />
            )}
          </div>
        );
      })}
      <div style={{
        marginLeft: invertida ? "auto" : "auto",
        marginRight: invertida ? 0 : 0,
        fontSize: 9, color: p.inkMute, letterSpacing: trackMono(fonteChave, 1.5),
        whiteSpace: "nowrap",
      }}>
        {invertida ? "VOLTAR PRA ▸ CLIQUE QUALQUER NÓ" : "▸ CLIQUE QUALQUER NÓ PRA VOLTAR"}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   FAIXA-OPERADOR (topo do T)
   ──────────────────────────────────────────────────────────────── */
export function FaixaOperador({ fonte, fonteChave }: { fonte: string; fonteChave: FonteChave }) {
  const lsForte = trackMono(fonteChave, 2);
  const lsSuave = trackMono(fonteChave, 1.2);
  return (
    <div style={{ background: p.navyPanel, borderBottom: `2px solid ${p.gold}`, padding: "11px 28px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 36, alignItems: "center", fontFamily: fonte }}>
      {/* ESQUERDA */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: p.navyDeep, border: `1px solid ${p.cyan}`, padding: "6px 14px", boxShadow: `inset 0 0 12px rgba(94,230,230,0.18)` }}>
          <span style={{ width: 8, height: 8, background: p.cyan, boxShadow: `0 0 8px ${p.cyan}` }} />
          <span style={{ fontSize: 11, letterSpacing: lsForte, color: p.cyan, fontWeight: 700 }}>PÁDUA</span>
        </div>
        <div style={{ display: "flex", border: `1px solid ${p.border}`, fontSize: 10, letterSpacing: lsSuave }}>
          <span style={{ padding: "5px 12px", background: p.gold, color: p.navyDeep, fontWeight: 700 }}>LOCAL</span>
          <span style={{ padding: "5px 12px", color: p.inkMute }}>GLOBAL</span>
        </div>
      </div>

      {/* CENTRO: 2 itens só (TDAH) */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, justifyContent: "center", overflow: "hidden" }}>
        {TIMELINE_CENTRO.map((evt, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", padding: "4px 12px", border: `1px solid ${evt.ativo ? p.gold : evt.proximo ? p.cyan : p.border}`, background: evt.ativo ? "rgba(200,155,60,0.08)" : evt.proximo ? "rgba(94,230,230,0.06)" : "transparent" }}>
            <span style={{ width: 7, height: 7, background: evt.ativo ? p.gold : evt.proximo ? p.cyan : p.inkMute, boxShadow: evt.ativo ? `0 0 6px ${p.gold}` : evt.proximo ? `0 0 6px ${p.cyan}` : "none" }} />
            <span style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsSuave, fontVariantNumeric: "tabular-nums" }}>{evt.hora}</span>
            <span style={{ fontSize: 9, letterSpacing: lsForte, color: evt.ativo ? p.gold : evt.proximo ? p.cyan : p.inkDim, fontWeight: 700 }}>{evt.verbo}</span>
            <span style={{ fontSize: 10, color: p.ink, letterSpacing: lsSuave }}>{evt.alvo}</span>
          </div>
        ))}
      </div>

      {/* DIREITA: bloco-dentro-de-bloco do CEO */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", border: `2px solid ${p.gold}`, background: "rgba(200,155,60,0.08)", padding: "4px", position: "relative" }}>
          <div style={{ position: "absolute", top: -8, left: 8, background: p.navyDeep, padding: "0 6px", fontSize: 8, letterSpacing: lsForte, color: p.gold, fontWeight: 700 }}>
            CEO · MÉDICO
          </div>
          <div style={{ background: p.navyDeep, border: `1px solid ${p.goldSoft}`, padding: "6px 14px", fontSize: 11, letterSpacing: lsForte, color: p.goldSoft, fontWeight: 700 }}>
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
   SIDEBAR — 3 modos × 2 lados
   modo="padrao"   → botões fullwidth com submenus aninhados
   modo="compacto" → 180px, só ícone + sigla (Chrome 12 Zelo Compacto)
   modo="cards"    → 320px, cada grupo é card alto com "últimos" (Chrome 13 Cardário)
   ──────────────────────────────────────────────────────────────── */
export function Sidebar({
  fonte, fonteChave, modo = "padrao", lado = "esquerda",
}: { fonte: string; fonteChave: FonteChave; modo?: "padrao" | "compacto" | "cards"; lado?: "esquerda" | "direita" }) {
  const lsForte = trackMono(fonteChave, 2);
  const lsSuave = trackMono(fonteChave, 1.5);

  /* MODO COMPACTO */
  if (modo === "compacto") {
    return (
      <aside style={{ background: p.navy, [lado === "esquerda" ? "borderRight" : "borderLeft"]: `1px solid ${p.border}`, padding: "16px 8px", fontFamily: fonte, overflowY: "auto" }}>
        <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: lsSuave, marginBottom: 14, textAlign: "center" }}>░ NAV</div>
        {ARVORE.map((nivel) => {
          const cor = pasteis[nivel.chave];
          const ativo = nivel.ativo;
          return (
            <div key={nivel.chave} style={{ marginBottom: 10 }}>
              <div title={nivel.titulo} style={{
                background: ativo ? cor.neon : cor.pastel,
                color: ativo ? "#0A1428" : "#FFFFFF",
                padding: "12px 8px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                cursor: "pointer",
                boxShadow: ativo ? `0 0 14px ${cor.glow}` : "none",
              }}>
                <span style={{ fontSize: 18 }}>{nivel.icone}</span>
                <span style={{ fontSize: 9, letterSpacing: lsForte, fontWeight: 700 }}>{nivel.sigla}</span>
              </div>
              {ativo && nivel.submenus.find((s) => s.ativo)?.filhoAtivo && (
                <div className="pawards-respira" style={{
                  marginTop: 10, marginLeft: 6, marginRight: 6,
                  padding: "8px 4px", textAlign: "center", fontSize: 8, letterSpacing: lsForte, color: "#0A1428",
                  borderTop: `2px solid ${p.gold}`,
                  ["--respira-cor-forte" as never]: p.gold,
                  ["--respira-cor-fraca" as never]: "rgba(200,155,60,0.4)",
                  ["--respira-fundo-min" as never]: p.gold,
                  ["--respira-fundo-max" as never]: p.gold,
                  fontWeight: 700,
                }}>
                  ◆ {nivel.submenus.find((s) => s.ativo)?.filhoAtivo}
                </div>
              )}
            </div>
          );
        })}
      </aside>
    );
  }

  /* MODO CARDS */
  if (modo === "cards") {
    return (
      <aside style={{ background: p.navy, [lado === "esquerda" ? "borderRight" : "borderLeft"]: `1px solid ${p.border}`, padding: "14px 12px", fontFamily: fonte, overflowY: "auto" }}>
        <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsSuave, marginBottom: 12 }}>░ NAVEGAÇÃO</div>
        {ARVORE.map((nivel) => {
          const cor = pasteis[nivel.chave];
          const ativo = nivel.ativo;
          return (
            <div key={nivel.chave} style={{
              marginBottom: 10,
              background: ativo ? cor.neon : cor.pastel,
              color: ativo ? "#0A1428" : "#FFFFFF",
              padding: "10px 12px",
              boxShadow: ativo ? `0 0 16px ${cor.glow}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{nivel.icone}</span>
                <div>
                  <div style={{ fontSize: 12, letterSpacing: lsForte, fontWeight: 700, textTransform: "uppercase" }}>{nivel.titulo}</div>
                  <div style={{ fontSize: 8, opacity: 0.7, letterSpacing: lsSuave }}>{nivel.submenus.length} áreas</div>
                </div>
              </div>
              {(() => {
                const filhoAtivo = nivel.submenus.find((s) => s.ativo)?.filhoAtivo;
                const ultimosFiltrados = (nivel.ultimos ?? []).filter((u) => u !== filhoAtivo);
                if (ultimosFiltrados.length === 0) return null;
                return (
                  <div style={{ borderTop: `1px solid ${ativo ? "rgba(10,20,40,0.3)" : "rgba(255,255,255,0.18)"}`, paddingTop: 6, marginTop: 4 }}>
                    <div style={{ fontSize: 7, letterSpacing: lsForte, opacity: 0.7, marginBottom: 4 }}>ÚLTIMOS</div>
                    {ultimosFiltrados.map((u) => (
                      <div key={u} style={{ fontSize: 9, letterSpacing: lsSuave, padding: "2px 0", fontWeight: 500 }}>▸ {u}</div>
                    ))}
                  </div>
                );
              })()}
              {ativo && nivel.submenus.find((s) => s.ativo)?.filhoAtivo && (
                <div className="pawards-respira" style={{
                  marginTop: 8, padding: "5px 8px", fontSize: 9, letterSpacing: lsForte, color: "#0A1428",
                  ["--respira-cor-forte" as never]: p.gold,
                  ["--respira-cor-fraca" as never]: "rgba(200,155,60,0.4)",
                  ["--respira-fundo-min" as never]: p.gold,
                  ["--respira-fundo-max" as never]: p.gold,
                  fontWeight: 700,
                }}>
                  ◆ {nivel.submenus.find((s) => s.ativo)?.filhoAtivo}
                </div>
              )}
            </div>
          );
        })}
      </aside>
    );
  }

  /* MODO PADRAO */
  return (
    <aside style={{ background: p.navy, [lado === "esquerda" ? "borderRight" : "borderLeft"]: `1px solid ${p.border}`, padding: "16px 12px", fontFamily: fonte, overflowY: "auto" }}>
      <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsSuave, marginBottom: 16 }}>░ NAVEGAÇÃO</div>
      {ARVORE.map((nivel) => {
        const cor = pasteis[nivel.chave];
        const ativo = nivel.ativo;
        return (
          <div key={nivel.chave} style={{ marginBottom: 10 }}>
            <div style={{
              background: ativo ? cor.neon : cor.pastel,
              color: ativo ? "#0A1428" : "#FFFFFF",
              padding: "10px 12px",
              fontSize: 11, letterSpacing: lsForte, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              boxShadow: ativo ? `0 0 18px ${cor.glow}, inset 0 0 0 1px ${cor.neon}` : "none",
              textTransform: "uppercase",
            }}>
              <span style={{ fontSize: 14 }}>{nivel.icone}</span>
              <span>{nivel.titulo}</span>
            </div>

            {ativo && (
              <div style={{ marginTop: 6, marginLeft: 14, padding: "8px 8px 8px 14px", background: cor.soft, border: `1px solid ${cor.softBorder}`, position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: cor.neon, boxShadow: `0 0 8px ${cor.glow}` }} />
                {nivel.submenus.map((sub) => (
                  <div key={sub.label}>
                    {sub.ativo ? (
                      <div className="pawards-respira" style={{
                        fontSize: 10, letterSpacing: lsSuave, color: "#0A1428",
                        padding: "7px 10px", fontWeight: 700,
                        ["--respira-cor-forte" as never]: cor.neon,
                        ["--respira-cor-fraca" as never]: cor.glow,
                        ["--respira-fundo-min" as never]: cor.neon,
                        ["--respira-fundo-max" as never]: cor.neon,
                        textTransform: "uppercase", marginBottom: 4,
                      }}>
                        ▸ {sub.label}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, letterSpacing: lsSuave, color: p.inkDim, padding: "7px 10px", cursor: "pointer", marginBottom: 2, textTransform: "uppercase" }}>
                        ▸ {sub.label}
                      </div>
                    )}
                    {sub.filhoAtivo && (
                      <div style={{ position: "relative", marginLeft: 14, paddingLeft: 14, marginBottom: 4 }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: "50%", width: 2, background: p.gold, opacity: 0.7 }} />
                        <div style={{ position: "absolute", left: 0, top: "50%", width: 12, height: 2, background: p.gold, opacity: 0.7 }} />
                        <div style={{ fontSize: 10, letterSpacing: lsSuave, color: "#0A1428", background: p.gold, padding: "6px 10px", fontWeight: 700, boxShadow: `0 0 14px rgba(200,155,60,0.5)`, textTransform: "uppercase" }}>
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
export function HeaderPlaca({ fonte, fonteChave }: { fonte: string; fonteChave: FonteChave }) {
  const lsForte = trackMono(fonteChave, 3);
  const lsSuave = trackMono(fonteChave, 1.5);
  return (
    <div style={{ background: p.navyPanel, borderBottom: `3px solid ${p.gold}`, padding: "16px 28px 14px", fontFamily: fonte }}>
      <div style={{ fontSize: 11, letterSpacing: lsForte, color: pasteis.admin.neon, textTransform: "uppercase", borderLeft: `3px solid ${pasteis.admin.neon}`, paddingLeft: 10, marginBottom: 8 }}>
        ◂ ADMINISTRAÇÃO · PLATAFORMA
      </div>
      <div style={{ fontSize: 34, letterSpacing: trackMono(fonteChave, 4), color: p.gold, textTransform: "uppercase", fontWeight: 700, borderLeft: `3px solid ${p.gold}`, paddingLeft: 10, lineHeight: 1 }}>
        AUDITORIA
      </div>
      <div style={{ fontSize: 10, color: p.inkMute, marginTop: 8, paddingLeft: 13, letterSpacing: lsSuave }}>
        ░ SALA · KILL-SWITCH · IMUTÁVEL · LGPD/CFM
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   PAINEL DETALHE (Chrome 16 Duplo Painel)
   ──────────────────────────────────────────────────────────────── */
export function PainelDetalhe({ fonte, fonteChave }: { fonte: string; fonteChave: FonteChave }) {
  const lsForte = trackMono(fonteChave, 2);
  const lsSuave = trackMono(fonteChave, 1.2);
  return (
    <aside style={{ background: p.navyPanel, borderLeft: `1px solid ${p.border}`, padding: "16px", fontFamily: fonte, overflowY: "auto" }}>
      <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 10 }}>░ DETALHE DA LINHA</div>
      <div style={{ borderLeft: `3px solid ${p.danger}`, paddingLeft: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: lsForte, color: p.danger, fontWeight: 700, marginBottom: 4 }}>SUSPENDER · 26/MAI 09:14</div>
        <div style={{ fontSize: 14, color: p.ink, marginBottom: 6, letterSpacing: lsSuave }}>Clínica PÁDUA</div>
        <div style={{ fontSize: 11, color: p.inkDim, fontStyle: "italic", letterSpacing: lsSuave }}>"Suspeita de uso indevido — auditoria interna"</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 6 }}>EXECUTOR</div>
        <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: p.goldSoft, letterSpacing: lsSuave, fontWeight: 700 }}>CAIO R. (CEO)</div>
          <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsSuave, marginTop: 2 }}>caio@pawards.med · IP 187.45.x.x</div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 6 }}>EVIDÊNCIAS ANEXADAS</div>
        {["log_acesso.txt", "trilha_navegacao.json", "captura_tela.png"].map((f) => (
          <div key={f} style={{ fontSize: 10, color: p.ink, padding: "4px 0", letterSpacing: lsSuave, borderBottom: `1px solid ${p.borderSoft}` }}>
            ▸ {f}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: lsForte, marginBottom: 6 }}>CADEIA DE CUSTÓDIA</div>
        <div style={{ fontSize: 9, color: p.inkDim, letterSpacing: lsSuave, lineHeight: 1.6 }}>
          1. 26/MAI 09:14 · evento gravado<br />
          2. 26/MAI 09:15 · hash SHA-256 selado<br />
          3. 26/MAI 09:16 · backup S3 (3 regiões)<br />
          4. 26/MAI 09:17 · webhook ZapSign disparado
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 18 }}>
        <button style={{ flex: 1, background: "transparent", color: p.ok, border: `1px solid ${p.ok}`, padding: "10px", fontSize: 10, letterSpacing: lsForte, fontWeight: 700, fontFamily: fonte, cursor: "pointer" }}>REASSUMIR</button>
        <button style={{ flex: 1, background: "transparent", color: p.gold, border: `1px solid ${p.gold}`, padding: "10px", fontSize: 10, letterSpacing: lsForte, fontWeight: 700, fontFamily: fonte, cursor: "pointer" }}>EXPORTAR LGPD</button>
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────────
   SELO DA FONTE (rodapé inferior esquerdo)
   ──────────────────────────────────────────────────────────────── */
export function SeloFonte({ fonte }: { fonte: FonteChave }) {
  const f = fontes[fonte];
  return (
    <div style={{
      position: "fixed", bottom: 8, left: 12,
      background: p.navyDeep, border: `1px solid ${p.gold}`, padding: "6px 12px",
      fontFamily: f.familia, fontSize: 10, letterSpacing: trackMono(fonte, 2),
      color: p.gold, opacity: 0.92,
    }}>
      FONTE · <b>{f.rotulo}</b> — <span style={{ color: p.inkDim }}>{f.carater}</span>
    </div>
  );
}
