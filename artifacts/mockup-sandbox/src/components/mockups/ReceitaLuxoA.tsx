/**
 * ReceitaLuxoA — MAISON BLANCHE
 * Estética Dior/Hermès: marfim profundo, ouro hairline, letterpress mono
 * Proporções A4 · Receituário Simples · PAWARDS / Padua
 */
const C = {
  marfim: "#FAF7F1",
  marfimEscuro: "#F0EBE0",
  ouro: "#B8982A",
  ouroPale: "#D4B96A",
  ouroBorda: "#C9A84C",
  preto: "#0C0C0A",
  cinzaQuente: "#6B6358",
  cinzaSuave: "#9A9189",
  linhaFina: "#D5CBB8",
  brancoPuro: "#FFFFFF",
};

const FONT = "'JetBrains Mono', 'Courier New', monospace";

function LinhaOuro({ marginY = 24, espessura = 0.5 }: { marginY?: number; espessura?: number }) {
  return (
    <div style={{
      width: "100%",
      height: `${espessura}px`,
      background: C.ouroBorda,
      margin: `${marginY}px 0`,
      opacity: 0.8,
    }} />
  );
}

function TriploFio({ my = 20 }: { my?: number }) {
  return (
    <div style={{ margin: `${my}px 0` }}>
      <div style={{ height: "0.5px", background: C.ouroBorda, opacity: 0.9 }} />
      <div style={{ height: "3px" }} />
      <div style={{ height: "0.5px", background: C.ouroBorda, opacity: 0.4 }} />
    </div>
  );
}

export default function ReceitaLuxoA() {
  const margem = 52;
  const larguraUtil = 595 - margem * 2;

  return (
    <div style={{
      width: "595px",
      minHeight: "842px",
      background: C.marfim,
      fontFamily: FONT,
      color: C.preto,
      position: "relative",
      boxShadow: "0 4px 40px rgba(0,0,0,0.14)",
    }}>

      {/* ── FAIXA TOPO OURO ── */}
      <div style={{
        width: "100%",
        height: "3px",
        background: `linear-gradient(90deg, ${C.ouro} 0%, ${C.ouroPale} 50%, ${C.ouro} 100%)`,
      }} />

      {/* ── HEADER CENTRADO ── */}
      <div style={{
        padding: `${margem}px ${margem}px 0`,
        textAlign: "center",
      }}>
        {/* Monograma */}
        <div style={{
          width: "48px",
          height: "48px",
          border: `0.5px solid ${C.ouroBorda}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 18px",
          background: C.marfimEscuro,
        }}>
          <span style={{
            fontFamily: FONT,
            fontSize: "14px",
            fontWeight: 700,
            color: C.ouro,
            letterSpacing: "0.08em",
          }}>P</span>
        </div>

        <div style={{
          fontSize: "9px",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: C.cinzaQuente,
          marginBottom: "4px",
        }}>Instituto Pádua · Medicina Integrativa</div>

        <div style={{
          fontSize: "15px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.preto,
          marginBottom: "4px",
        }}>Dr. Caio H. F. Pádua</div>

        <div style={{
          fontSize: "8px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: C.cinzaSuave,
        }}>CRM 123456 · Endocrinologista · CBO 2251-04</div>

        <TriploFio my={22} />

        {/* TÍTULO DO DOCUMENTO */}
        <div style={{
          fontSize: "7.5px",
          letterSpacing: "0.40em",
          textTransform: "uppercase",
          color: C.ouro,
          fontWeight: 700,
          marginBottom: "4px",
        }}>Receituário Médico</div>
        <div style={{
          fontSize: "7px",
          letterSpacing: "0.22em",
          color: C.cinzaSuave,
        }}>Receita Comum · Validade 30 dias</div>
      </div>

      {/* ── CORPO ── */}
      <div style={{ padding: `24px ${margem}px` }}>

        {/* Dados do paciente */}
        <div style={{
          background: C.marfimEscuro,
          border: `0.5px solid ${C.linhaFina}`,
          padding: "16px 20px",
          marginBottom: "6px",
        }}>
          <div style={{
            fontSize: "7px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: C.cinzaSuave,
            marginBottom: "10px",
          }}>Paciente</div>

          {[
            ["Nome", "Maria Francisca de Oliveira Borges"],
            ["Data de Nascimento", "14/03/1978 · 47 anos"],
            ["Endereço", "Rua das Acácias, 214 · São Paulo · SP"],
          ].map(([label, valor]) => (
            <div key={label} style={{
              display: "flex",
              borderBottom: `0.5px solid ${C.linhaFina}`,
              paddingBottom: "8px",
              marginBottom: "8px",
              alignItems: "baseline",
              gap: "16px",
            }}>
              <div style={{
                fontSize: "7px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: C.cinzaSuave,
                width: "100px",
                flexShrink: 0,
              }}>{label}</div>
              <div style={{
                fontSize: "10px",
                color: C.preto,
                letterSpacing: "0.04em",
                fontWeight: 600,
              }}>{valor}</div>
            </div>
          ))}
        </div>

        <LinhaOuro marginY={20} />

        {/* PRESCRIÇÃO */}
        <div style={{
          fontSize: "7px",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: C.ouro,
          fontWeight: 700,
          marginBottom: "18px",
        }}>Prescrição</div>

        {[
          {
            n: "I",
            nome: "Levotiroxina Sódica",
            dosagem: "75 mcg",
            posologia: "1 comprimido em jejum · 30 minutos antes do café da manhã",
            duracao: "90 dias · Uso contínuo",
            obs: "Evitar uso concomitante com cálcio e ferro.",
          },
          {
            n: "II",
            nome: "Vitamina D3 + K2",
            dosagem: "5.000 UI + 100 mcg",
            posologia: "1 cápsula com refeição · pela manhã",
            duracao: "90 dias",
            obs: null,
          },
          {
            n: "III",
            nome: "Magnésio Dimalato",
            dosagem: "400 mg",
            posologia: "2 cápsulas à noite · com copo d'água",
            duracao: "60 dias",
            obs: "Preferir ao magnésio convencional para melhor absorção.",
          },
        ].map((item) => (
          <div key={item.n} style={{
            marginBottom: "20px",
            paddingBottom: "20px",
            borderBottom: `0.5px solid ${C.linhaFina}`,
            display: "flex",
            gap: "20px",
          }}>
            {/* Numeral romano */}
            <div style={{
              fontSize: "9px",
              fontWeight: 700,
              color: C.ouroPale,
              letterSpacing: "0.10em",
              width: "20px",
              flexShrink: 0,
              paddingTop: "1px",
            }}>{item.n}.</div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "5px" }}>
                <div style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: C.preto,
                  letterSpacing: "0.06em",
                }}>{item.nome}</div>
                <div style={{
                  fontSize: "8px",
                  color: C.cinzaQuente,
                  letterSpacing: "0.12em",
                }}>{item.dosagem}</div>
              </div>
              <div style={{
                fontSize: "9px",
                color: C.cinzaQuente,
                letterSpacing: "0.04em",
                marginBottom: "3px",
                lineHeight: "1.6",
              }}>{item.posologia}</div>
              <div style={{
                fontSize: "8px",
                color: C.cinzaSuave,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
              }}>{item.duracao}</div>
              {item.obs && (
                <div style={{
                  marginTop: "6px",
                  borderLeft: `1.5px solid ${C.ouroPale}`,
                  paddingLeft: "8px",
                  fontSize: "8px",
                  color: C.cinzaSuave,
                  fontStyle: "italic",
                  lineHeight: "1.5",
                }}>{item.obs}</div>
              )}
            </div>
          </div>
        ))}

        <LinhaOuro marginY={16} />

        {/* RODAPÉ CLÍNICO */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: "8px",
        }}>
          <div>
            <div style={{
              fontSize: "7px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: C.cinzaSuave,
              marginBottom: "4px",
            }}>Data</div>
            <div style={{
              fontSize: "9px",
              color: C.cinzaQuente,
            }}>São Paulo, 18 de julho de 2026</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "160px",
              height: "0.5px",
              background: C.ouroBorda,
              marginBottom: "6px",
            }} />
            <div style={{
              fontSize: "8px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.cinzaQuente,
            }}>Assinatura do Médico</div>
            <div style={{
              fontSize: "7px",
              letterSpacing: "0.10em",
              color: C.cinzaSuave,
              marginTop: "2px",
            }}>CRM 123456 · SP</div>
          </div>
        </div>

        {/* Endereço */}
        <div style={{
          marginTop: "32px",
          paddingTop: "16px",
          borderTop: `0.5px solid ${C.linhaFina}`,
          textAlign: "center",
        }}>
          <div style={{
            fontSize: "7px",
            letterSpacing: "0.22em",
            color: C.cinzaSuave,
            textTransform: "uppercase",
            lineHeight: "1.8",
          }}>
            Av. Paulista, 1.000 · Conjunto 1205 · São Paulo · SP · 01310-100<br />
            (11) 3456-7890 · contato@institutopádua.med.br
          </div>
        </div>
      </div>

      {/* ── FAIXA BASE OURO ── */}
      <div style={{
        width: "100%",
        height: "2px",
        background: `linear-gradient(90deg, transparent 0%, ${C.ouroBorda} 30%, ${C.ouro} 50%, ${C.ouroBorda} 70%, transparent 100%)`,
        position: "absolute",
        bottom: 0,
        left: 0,
      }} />
    </div>
  );
}
