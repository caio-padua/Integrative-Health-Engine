/**
 * ReceitaLuxoB — NOIR EXCELLENCE
 * Header monolítico preto/charcoal · corpo marfim · ouro hairline
 * Estética Hermès: austero, assimétrico, autoridade absoluta
 */
const C = {
  marfim: "#F8F4EE",
  preto: "#080808",
  charcoal: "#1A1714",
  ouro: "#B8982A",
  ouroPale: "#C9A84C",
  ouroDim: "#8C7220",
  cinzaQuente: "#6B6358",
  cinzaSuave: "#9A9189",
  linhaFina: "#D8D0C0",
  linhaOuro: "#C9A84C",
};

const FONT = "'JetBrains Mono', 'Courier New', monospace";

export default function ReceitaLuxoB() {
  const margem = 48;

  return (
    <div style={{
      width: "595px",
      minHeight: "842px",
      background: C.marfim,
      fontFamily: FONT,
      color: C.preto,
      position: "relative",
      boxShadow: "0 4px 40px rgba(0,0,0,0.18)",
    }}>

      {/* ══ HEADER PRETO — bloco monolítico ══ */}
      <div style={{
        background: C.preto,
        padding: `${margem}px ${margem}px 36px`,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Linha ouro diagonal decorativa */}
        <div style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "3px",
          height: "100%",
          background: `linear-gradient(180deg, ${C.ouro} 0%, ${C.ouroDim} 100%)`,
        }} />

        {/* Alinhamento esquerdo — assinatura da maison */}
        <div style={{
          fontSize: "7px",
          letterSpacing: "0.40em",
          textTransform: "uppercase",
          color: C.ouroPale,
          marginBottom: "20px",
        }}>Instituto Pádua · Est. 2018</div>

        <div style={{
          fontSize: "22px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "#FFFFFF",
          textTransform: "uppercase",
          lineHeight: "1.1",
          marginBottom: "8px",
        }}>Dr. Caio H. F.<br />Pádua</div>

        {/* Fio ouro separador */}
        <div style={{
          width: "40px",
          height: "1px",
          background: C.ouro,
          margin: "16px 0",
        }} />

        <div style={{
          fontSize: "8px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: C.cinzaSuave,
          lineHeight: "1.9",
        }}>
          Endocrinologia &amp; Medicina Integrativa<br />
          CRM 123456 · SP · CBO 2251-04
        </div>
      </div>

      {/* Faixa ouro separador */}
      <div style={{
        height: "1px",
        background: `linear-gradient(90deg, ${C.ouro} 0%, ${C.ouroPale} 60%, transparent 100%)`,
      }} />

      {/* ══ CORPO ══ */}
      <div style={{ padding: `32px ${margem}px 40px` }}>

        {/* TIPO DE DOCUMENTO */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}>
          <div>
            <div style={{
              fontSize: "7px",
              letterSpacing: "0.40em",
              textTransform: "uppercase",
              color: C.ouro,
              fontWeight: 700,
              marginBottom: "3px",
            }}>Receituário Médico</div>
            <div style={{
              fontSize: "8px",
              letterSpacing: "0.14em",
              color: C.cinzaSuave,
            }}>Receita Comum · Validade 30 dias</div>
          </div>
          <div style={{
            textAlign: "right",
            fontSize: "8px",
            color: C.cinzaSuave,
            letterSpacing: "0.10em",
          }}>
            <div style={{ fontWeight: 700, color: C.cinzaQuente }}>18/07/2026</div>
            <div style={{ marginTop: "2px" }}>São Paulo · SP</div>
          </div>
        </div>

        {/* PACIENTE */}
        <div style={{
          borderLeft: `2px solid ${C.ouro}`,
          paddingLeft: "16px",
          marginBottom: "28px",
        }}>
          <div style={{
            fontSize: "7px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: C.ouro,
            marginBottom: "10px",
          }}>Paciente</div>

          <div style={{
            fontSize: "13px",
            fontWeight: 700,
            color: C.preto,
            letterSpacing: "0.06em",
            marginBottom: "4px",
          }}>Maria Francisca de Oliveira Borges</div>

          <div style={{
            fontSize: "8px",
            color: C.cinzaQuente,
            letterSpacing: "0.10em",
            lineHeight: "1.8",
          }}>
            14/03/1978 · 47 anos<br />
            Rua das Acácias, 214 · São Paulo · SP
          </div>
        </div>

        {/* LINHA DUPLA */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ height: "0.5px", background: C.linhaOuro, opacity: 0.7 }} />
          <div style={{ height: "4px" }} />
          <div style={{ height: "0.5px", background: C.linhaFina }} />
        </div>

        {/* PRESCRIÇÃO */}
        <div style={{
          fontSize: "7px",
          letterSpacing: "0.36em",
          textTransform: "uppercase",
          color: C.charcoal,
          fontWeight: 700,
          marginBottom: "20px",
        }}>Prescrição</div>

        {[
          {
            seq: "01",
            nome: "Levotiroxina Sódica",
            dosagem: "75 mcg",
            forma: "Comprimido",
            posologia: "1 comprimido · jejum · 30 min antes do café",
            duracao: "90 dias · Uso contínuo",
            obs: "Evitar cálcio e ferro em horário próximo.",
          },
          {
            seq: "02",
            nome: "Vitamina D3 + K2",
            dosagem: "5.000 UI + 100 mcg",
            forma: "Cápsula",
            posologia: "1 cápsula · com refeição matinal",
            duracao: "90 dias",
            obs: null,
          },
          {
            seq: "03",
            nome: "Magnésio Dimalato",
            dosagem: "400 mg",
            forma: "Cápsula",
            posologia: "2 cápsulas · noite · com água",
            duracao: "60 dias",
            obs: "Superior ao magnésio convencional em absorção.",
          },
        ].map((item, i) => (
          <div key={item.seq} style={{
            display: "flex",
            gap: "20px",
            paddingBottom: "20px",
            marginBottom: "20px",
            borderBottom: i < 2 ? `0.5px solid ${C.linhaFina}` : "none",
          }}>
            {/* Sequencial */}
            <div style={{
              fontSize: "8px",
              fontWeight: 700,
              color: C.ouroPale,
              letterSpacing: "0.06em",
              width: "22px",
              flexShrink: 0,
              paddingTop: "2px",
              opacity: 0.7,
            }}>{item.seq}</div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <div style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: C.preto,
                }}>{item.nome}</div>
                <div style={{
                  fontSize: "8px",
                  color: C.cinzaQuente,
                  letterSpacing: "0.12em",
                  paddingTop: "2px",
                }}>{item.dosagem} · {item.forma}</div>
              </div>

              <div style={{
                fontSize: "9px",
                color: C.cinzaQuente,
                letterSpacing: "0.04em",
                lineHeight: "1.5",
                marginBottom: "2px",
              }}>{item.posologia}</div>

              <div style={{
                fontSize: "7.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: C.cinzaSuave,
              }}>{item.duracao}</div>

              {item.obs && (
                <div style={{
                  marginTop: "7px",
                  fontSize: "8px",
                  color: C.cinzaSuave,
                  borderTop: `0.5px solid ${C.linhaFina}`,
                  paddingTop: "6px",
                  lineHeight: "1.5",
                  fontStyle: "italic",
                }}>{item.obs}</div>
              )}
            </div>
          </div>
        ))}

        {/* ASSINATURA */}
        <div style={{
          marginTop: "32px",
          display: "flex",
          justifyContent: "flex-end",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "180px",
              height: "0.5px",
              background: C.linhaOuro,
              marginBottom: "8px",
            }} />
            <div style={{
              fontSize: "7.5px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: C.cinzaQuente,
              marginBottom: "2px",
            }}>Dr. Caio H. F. Pádua</div>
            <div style={{
              fontSize: "7px",
              letterSpacing: "0.14em",
              color: C.cinzaSuave,
            }}>CRM 123456 · SP</div>
          </div>
        </div>

        {/* ENDEREÇO */}
        <div style={{
          marginTop: "28px",
          paddingTop: "16px",
          borderTop: `0.5px solid ${C.linhaFina}`,
          textAlign: "center",
        }}>
          <div style={{
            fontSize: "7px",
            letterSpacing: "0.20em",
            color: C.cinzaSuave,
            textTransform: "uppercase",
            lineHeight: "1.9",
          }}>
            Av. Paulista, 1.000 · Cj. 1205 · São Paulo · SP · 01310-100<br />
            (11) 3456-7890 · contato@institutopádua.med.br
          </div>
        </div>
      </div>

      {/* Fio ouro base */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "1px",
        background: C.ouro,
      }} />
    </div>
  );
}
