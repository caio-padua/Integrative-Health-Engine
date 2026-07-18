/**
 * ReceitaLuxoC — CHAMPAGNE
 * Creme champanhe + borda quadrangular dupla + espaço negativo generoso
 * Estilo Dior: forma antes de tudo, hierarquia por espaço, não por cor
 */
const C = {
  creme: "#F9F5EC",
  cremeEscuro: "#EDE7D8",
  cremeCard: "#F2EDE2",
  ouro: "#A8882A",
  ouroClaro: "#C9A84C",
  ouroDim: "#7A6420",
  preto: "#0A0908",
  cinzaQuente: "#5E5750",
  cinzaMedio: "#7A7368",
  cinzaSuave: "#A8A098",
  linha: "#D8D0BC",
};

const FONT = "'JetBrains Mono', 'Courier New', monospace";

function Separador({ tipo = "simples" }: { tipo?: "simples" | "duplo" | "triplo" }) {
  if (tipo === "duplo") return (
    <div style={{ margin: "20px 0" }}>
      <div style={{ height: "1px", background: C.ouro, opacity: 0.6 }} />
      <div style={{ height: "5px" }} />
      <div style={{ height: "0.5px", background: C.linha }} />
    </div>
  );
  if (tipo === "triplo") return (
    <div style={{ margin: "24px 0" }}>
      <div style={{ height: "0.5px", background: C.linha }} />
      <div style={{ height: "6px" }} />
      <div style={{ height: "1px", background: C.ouro, opacity: 0.8 }} />
      <div style={{ height: "6px" }} />
      <div style={{ height: "0.5px", background: C.linha }} />
    </div>
  );
  return <div style={{ height: "0.5px", background: C.linha, margin: "16px 0" }} />;
}

export default function ReceitaLuxoC() {
  const margem = 50;

  return (
    <div style={{
      width: "595px",
      minHeight: "842px",
      background: C.creme,
      fontFamily: FONT,
      color: C.preto,
      position: "relative",
      boxShadow: "0 4px 40px rgba(0,0,0,0.12)",
    }}>

      {/* ── BORDA QUADRANGULAR DUPLA ── */}
      <div style={{
        position: "absolute",
        top: "12px",
        left: "12px",
        right: "12px",
        bottom: "12px",
        border: `0.5px solid ${C.ouro}`,
        opacity: 0.5,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        top: "16px",
        left: "16px",
        right: "16px",
        bottom: "16px",
        border: `0.5px solid ${C.linha}`,
        pointerEvents: "none",
      }} />

      <div style={{ padding: `${margem}px ${margem + 8}px` }}>

        {/* ── HEADER — centrado e solene ── */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>

          {/* Ornamento ouro */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "20px",
          }}>
            <div style={{ flex: 1, height: "0.5px", background: C.ouroClaro, opacity: 0.5 }} />
            <div style={{
              width: "6px",
              height: "6px",
              border: `1px solid ${C.ouroClaro}`,
              transform: "rotate(45deg)",
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, height: "0.5px", background: C.ouroClaro, opacity: 0.5 }} />
          </div>

          <div style={{
            fontSize: "7px",
            letterSpacing: "0.48em",
            textTransform: "uppercase",
            color: C.ouro,
            marginBottom: "14px",
          }}>Instituto Pádua</div>

          <div style={{
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.preto,
            marginBottom: "6px",
            lineHeight: "1.2",
          }}>Dr. Caio H. F. Pádua</div>

          <div style={{
            fontSize: "7.5px",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: C.cinzaMedio,
            marginBottom: "20px",
          }}>Endocrinologia · Medicina Integrativa</div>

          {/* Ornamento base */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}>
            <div style={{ flex: 1, height: "0.5px", background: C.linha }} />
            <div style={{
              width: "4px",
              height: "4px",
              background: C.ouroClaro,
              transform: "rotate(45deg)",
              flexShrink: 0,
              opacity: 0.7,
            }} />
            <div style={{ flex: 1, height: "0.5px", background: C.linha }} />
          </div>
        </div>

        {/* DOCUMENTO */}
        <div style={{
          textAlign: "center",
          padding: "18px 0 6px",
        }}>
          <div style={{
            display: "inline-block",
            border: `0.5px solid ${C.ouro}`,
            padding: "5px 20px",
          }}>
            <div style={{
              fontSize: "7px",
              letterSpacing: "0.40em",
              textTransform: "uppercase",
              color: C.ouro,
              fontWeight: 700,
            }}>Receituário · Receita Comum</div>
          </div>
        </div>

        <Separador tipo="duplo" />

        {/* PACIENTE */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{
            fontSize: "6.5px",
            letterSpacing: "0.36em",
            textTransform: "uppercase",
            color: C.cinzaSuave,
            marginBottom: "12px",
          }}>Dados do Paciente</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
            {[
              ["Nome Completo", "Maria Francisca de Oliveira Borges"],
              ["Data de Nascimento", "14/03/1978 · 47 anos"],
              ["Localidade", "Rua das Acácias, 214 · São Paulo · SP"],
              ["Data", "18 de julho de 2026"],
            ].map(([label, valor], i) => (
              <div key={label} style={{
                display: "flex",
                alignItems: "baseline",
                padding: "8px 0",
                borderBottom: `0.5px solid ${C.linha}`,
                gap: "0",
              }}>
                <div style={{
                  fontSize: "6.5px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: C.cinzaSuave,
                  width: "110px",
                  flexShrink: 0,
                }}>{label}</div>
                <div style={{
                  flex: 1,
                  height: "0.5px",
                  background: C.linha,
                  marginRight: "16px",
                  opacity: 0.4,
                }} />
                <div style={{
                  fontSize: "9.5px",
                  fontWeight: 600,
                  color: C.preto,
                  letterSpacing: "0.04em",
                }}>{valor}</div>
              </div>
            ))}
          </div>
        </div>

        <Separador tipo="triplo" />

        {/* PRESCRIÇÃO */}
        <div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}>
            <div style={{
              fontSize: "6.5px",
              letterSpacing: "0.40em",
              textTransform: "uppercase",
              color: C.preto,
              fontWeight: 700,
            }}>Prescrição Médica</div>
            <div style={{ flex: 1, height: "0.5px", background: C.linha }} />
            <div style={{
              fontSize: "6.5px",
              letterSpacing: "0.18em",
              color: C.cinzaSuave,
            }}>Validade: 30 dias</div>
          </div>

          {[
            {
              n: "I",
              nome: "Levotiroxina Sódica",
              dosagem: "75 mcg · Comprimido",
              posologia: "1 comprimido em jejum · 30 min antes do café da manhã",
              duracao: "90 dias · Uso contínuo",
              nota: "Intervalo mínimo de 4 h de cálcio ou ferro.",
            },
            {
              n: "II",
              nome: "Vitamina D3 + K2",
              dosagem: "5.000 UI + 100 mcg · Cápsula",
              posologia: "1 cápsula com refeição matinal",
              duracao: "90 dias",
              nota: null,
            },
            {
              n: "III",
              nome: "Magnésio Dimalato",
              dosagem: "400 mg · Cápsula",
              posologia: "2 cápsulas com água · noite",
              duracao: "60 dias",
              nota: "Preferível ao óxido de magnésio pela absorção superior.",
            },
          ].map((item, idx) => (
            <div key={item.n} style={{
              display: "flex",
              gap: "16px",
              paddingBottom: "18px",
              marginBottom: "18px",
              borderBottom: idx < 2 ? `0.5px solid ${C.linha}` : "none",
            }}>
              <div style={{
                width: "22px",
                flexShrink: 0,
                paddingTop: "1px",
              }}>
                <span style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  color: C.ouroClaro,
                  letterSpacing: "0.04em",
                }}>{item.n}.</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: C.preto,
                  letterSpacing: "0.04em",
                  marginBottom: "3px",
                }}>{item.nome}</div>
                <div style={{
                  fontSize: "7.5px",
                  color: C.cinzaMedio,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: "5px",
                }}>{item.dosagem}</div>
                <div style={{
                  fontSize: "9px",
                  color: C.cinzaQuente,
                  lineHeight: "1.6",
                  marginBottom: "4px",
                }}>{item.posologia}</div>
                <div style={{
                  fontSize: "7px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: C.cinzaSuave,
                }}>{item.duracao}</div>
                {item.nota && (
                  <div style={{
                    marginTop: "7px",
                    paddingLeft: "10px",
                    borderLeft: `0.5px solid ${C.ouroClaro}`,
                    fontSize: "8px",
                    color: C.cinzaSuave,
                    fontStyle: "italic",
                    lineHeight: "1.5",
                  }}>{item.nota}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separador tipo="simples" />

        {/* ASSINATURA */}
        <div style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}>
          <div style={{
            fontSize: "7px",
            letterSpacing: "0.18em",
            color: C.cinzaSuave,
            textTransform: "uppercase",
            lineHeight: "2",
          }}>
            CRM 123456 · SP<br />
            CBO 2251-04
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "170px",
              height: "0.5px",
              background: `linear-gradient(90deg, transparent, ${C.ouro}, transparent)`,
              marginBottom: "8px",
            }} />
            <div style={{
              fontSize: "7.5px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: C.cinzaQuente,
            }}>Assinatura e Carimbo</div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div style={{
          marginTop: "28px",
          textAlign: "center",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "10px",
          }}>
            <div style={{ flex: 1, height: "0.5px", background: C.linha, opacity: 0.5 }} />
            <div style={{
              width: "4px",
              height: "4px",
              border: `0.5px solid ${C.ouroClaro}`,
              transform: "rotate(45deg)",
              flexShrink: 0,
              opacity: 0.6,
            }} />
            <div style={{ flex: 1, height: "0.5px", background: C.linha, opacity: 0.5 }} />
          </div>
          <div style={{
            fontSize: "7px",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: C.cinzaSuave,
            lineHeight: "1.9",
          }}>
            Av. Paulista, 1.000 · Conj. 1205 · São Paulo · SP<br />
            (11) 3456-7890 · contato@institutopádua.med.br
          </div>
        </div>

      </div>
    </div>
  );
}
