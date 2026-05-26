import { palette as p } from "./_palette";
import { MioloAuditoriaExemplo } from "./MioloAuditoriaExemplo";

const PASTEIS = {
  admin: { pastel: "#6B5BD6", neon: "#A89DFF", glow: "rgba(168,157,255,0.45)" },
  clinica: { pastel: "#2FA38F", neon: "#5FE6CC", glow: "rgba(95,230,204,0.45)" },
  financeiro: { pastel: "#C89B3C", neon: "#FFD27A", glow: "rgba(255,210,122,0.45)" },
  catalogos: { pastel: "#B0688C", neon: "#FFA3C8", glow: "rgba(255,163,200,0.45)" },
  sistema: { pastel: "#5E7A99", neon: "#9CC2EA", glow: "rgba(156,194,234,0.45)" },
} as const;

type MenuKey = keyof typeof PASTEIS;

const ARVORE: Array<{
  chave: MenuKey;
  titulo: string;
  icone: string;
  ativo?: boolean;
  submenus: Array<{ label: string; ativo?: boolean; filhoAtivo?: string }>;
}> = [
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
  {
    chave: "clinica",
    titulo: "CLÍNICA",
    icone: "✚",
    submenus: [
      { label: "PACIENTES" },
      { label: "ANAMNESE" },
      { label: "FÓRMULAS" },
      { label: "AGENDA" },
    ],
  },
  {
    chave: "financeiro",
    titulo: "FINANCEIRO",
    icone: "$",
    submenus: [{ label: "RECEITAS" }, { label: "PAGAMENTOS" }, { label: "RELATÓRIOS" }],
  },
  {
    chave: "catalogos",
    titulo: "CATÁLOGOS",
    icone: "☰",
    submenus: [{ label: "INJETÁVEIS" }, { label: "FÓRMULAS MAGISTRAIS" }, { label: "PROTOCOLOS" }],
  },
  {
    chave: "sistema",
    titulo: "SISTEMA",
    icone: "⚙",
    submenus: [{ label: "UNIDADES" }, { label: "PERFIS & PERMISSÕES" }, { label: "MOTOR COMERCIAL" }],
  },
];

const CAMINHO_LABIRINTO = [
  { label: "🏛 PAWARDS", cor: p.gold },
  { label: "ADMINISTRAÇÃO", cor: PASTEIS.admin.neon },
  { label: "PLATAFORMA", cor: PASTEIS.admin.neon },
  { label: "AUDITORIA", cor: p.gold, ativo: true },
];

export function Chrome6Premium() {
  return (
    <div
      style={{
        background: p.navyDeep,
        minHeight: "100vh",
        fontFamily: p.mono,
        color: p.ink,
        display: "grid",
        gridTemplateColumns: "260px 1fr",
      }}
    >
      {/* ============ SIDEBAR PASTEL + NEON ============ */}
      <aside
        style={{
          background: p.navy,
          borderRight: `1px solid ${p.border}`,
          padding: "16px 12px",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: p.gold,
            fontSize: 11,
            letterSpacing: 3,
            fontWeight: 700,
            paddingBottom: 6,
            borderBottom: `1px solid ${p.border}`,
            marginBottom: 14,
          }}
        >
          ◆ PAWARDS MEDCORE
        </div>
        <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: 1.5, marginBottom: 16 }}>
          CAIO R. · PERFIL <span style={{ color: p.gold }}>CEO</span>
        </div>

        {ARVORE.map((nivel) => {
          const cor = PASTEIS[nivel.chave];
          const ativo = nivel.ativo;
          return (
            <div key={nivel.chave} style={{ marginBottom: 10 }}>
              {/* BOTÃO TOP-LEVEL — corpo todo pastel; quando ativo vira NEON inteiro */}
              <div
                style={{
                  background: ativo ? cor.neon : cor.pastel,
                  color: ativo ? "#0A1428" : "#FFFFFF",
                  padding: "10px 12px",
                  fontSize: 11,
                  letterSpacing: 2,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  boxShadow: ativo ? `0 0 18px ${cor.glow}, inset 0 0 0 1px ${cor.neon}` : "none",
                  transition: "all 120ms",
                }}
              >
                <span style={{ fontSize: 14 }}>{nivel.icone}</span>
                <span>{nivel.titulo}</span>
              </div>

              {/* SUBMENUS — linha vertical de pertencimento na cor do pai */}
              {ativo && (
                <div
                  style={{
                    position: "relative",
                    paddingLeft: 18,
                    marginTop: 4,
                    marginLeft: 16,
                  }}
                >
                  {/* LINHA VERTICAL DE PERTENCIMENTO */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 4,
                      bottom: 4,
                      width: 2,
                      background: cor.neon,
                      opacity: 0.55,
                      boxShadow: `0 0 6px ${cor.glow}`,
                    }}
                  />
                  {nivel.submenus.map((sub) => (
                    <div key={sub.label}>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: 1.5,
                          color: sub.ativo ? cor.neon : p.inkDim,
                          fontWeight: sub.ativo ? 700 : 400,
                          padding: "6px 8px",
                          background: sub.ativo ? `${cor.neon}1F` : "transparent",
                          borderLeft: sub.ativo
                            ? `2px solid ${cor.neon}`
                            : "2px solid transparent",
                          marginLeft: -2,
                          cursor: "pointer",
                        }}
                      >
                        ▸ {sub.label}
                      </div>
                      {/* NETO ATIVO (último nível, cor dourada universal de "você está aqui") */}
                      {sub.filhoAtivo && (
                        <div
                          style={{
                            position: "relative",
                            marginLeft: 12,
                            paddingLeft: 14,
                            marginTop: 2,
                            marginBottom: 2,
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: "50%",
                              width: 2,
                              background: p.gold,
                              opacity: 0.6,
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: "50%",
                              width: 12,
                              height: 2,
                              background: p.gold,
                              opacity: 0.6,
                            }}
                          />
                          <div
                            style={{
                              fontSize: 10,
                              letterSpacing: 1.5,
                              color: "#0A1428",
                              background: p.gold,
                              padding: "6px 10px",
                              fontWeight: 700,
                              boxShadow: `0 0 14px rgba(200,155,60,0.5)`,
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

      {/* ============ COLUNA PRINCIPAL ============ */}
      <main>
        {/* HEADER PLACA HOSPITAL */}
        <div
          style={{
            background: p.navy,
            borderBottom: `3px solid ${p.gold}`,
            padding: "18px 32px 14px",
            position: "sticky",
            top: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                color: PASTEIS.admin.neon,
                textTransform: "uppercase",
                borderLeft: `3px solid ${PASTEIS.admin.neon}`,
                paddingLeft: 10,
                marginBottom: 8,
              }}
            >
              ◂ ADMINISTRAÇÃO · PLATAFORMA
            </div>
            <div
              style={{
                fontSize: 34,
                letterSpacing: 4,
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
                letterSpacing: 1.5,
              }}
            >
              ░ SALA · KILL-SWITCH · IMUTÁVEL · LGPD/CFM
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: p.gold }}>26/MAI/2026 · 09:14</div>
            <div style={{ fontSize: 10, color: p.inkDim, marginTop: 4 }}>
              UNIDADE <b style={{ color: p.cyan }}>PÁDUA</b>
            </div>
          </div>
        </div>

        {/* ============ FAIXA-LABIRINTO ============ */}
        {/* Linha conectada: cada nó é um "andar" e a linha entre eles é a trilha de retorno */}
        <div
          style={{
            background: "#0E1B30",
            borderBottom: `1px solid ${p.border}`,
            padding: "12px 32px",
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: 2, marginRight: 16 }}>
            ░ TRILHA
          </div>
          {CAMINHO_LABIRINTO.map((no, i) => {
            const ultimo = i === CAMINHO_LABIRINTO.length - 1;
            return (
              <div key={no.label} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: no.cor,
                    borderRadius: 0,
                    boxShadow: no.ativo ? `0 0 12px ${no.cor}` : "none",
                  }}
                />
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: no.ativo ? no.cor : p.inkDim,
                    fontWeight: no.ativo ? 700 : 400,
                    marginLeft: 6,
                    marginRight: ultimo ? 0 : 8,
                  }}
                >
                  {no.label}
                </div>
                {!ultimo && (
                  <div
                    style={{
                      width: 42,
                      height: 2,
                      background: `linear-gradient(90deg, ${no.cor}, ${CAMINHO_LABIRINTO[i + 1].cor})`,
                      marginRight: 8,
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>
            );
          })}
          <div
            style={{
              marginLeft: "auto",
              fontSize: 9,
              color: p.inkMute,
              letterSpacing: 1.5,
            }}
          >
            ▸ CLIQUE QUALQUER NÓ PRA VOLTAR
          </div>
        </div>

        <MioloAuditoriaExemplo />
      </main>
    </div>
  );
}
