/**
 * CapaLuxoA — PROTOCOLO MAISON
 * Capa de protocolo estilo Dior/Hermès
 * Fundo preto · título centrado · ouro hairline · ornamentos geométricos
 */
const C = {
  preto: "#050403",
  charcoal: "#100E0C",
  ouro: "#B8982A",
  ouroMedio: "#C9A84C",
  ouroClaro: "#D4B96A",
  ouroDim: "#7A6420",
  marfim: "#F8F4EE",
  marfimDim: "#C8C2B8",
  cinzaNobre: "#8A8278",
};

const FONT = "'JetBrains Mono', 'Courier New', monospace";

function OrnamentoCentral() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0px",
      margin: "32px 0",
    }}>
      {/* Losango externo */}
      <div style={{ position: "relative", width: "60px", height: "60px" }}>
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(45deg)",
          width: "44px",
          height: "44px",
          border: `0.5px solid ${C.ouro}`,
          opacity: 0.6,
        }} />
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(45deg)",
          width: "28px",
          height: "28px",
          border: `1px solid ${C.ouro}`,
          opacity: 0.9,
        }} />
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "8px",
          height: "8px",
          background: C.ouro,
          borderRadius: "0",
          rotate: "45deg",
        }} />
      </div>
    </div>
  );
}

export default function CapaLuxoA() {
  return (
    <div style={{
      width: "595px",
      minHeight: "842px",
      background: C.preto,
      fontFamily: FONT,
      color: C.marfim,
      position: "relative",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 8px 60px rgba(0,0,0,0.5)",
    }}>

      {/* Faixa ouro topo */}
      <div style={{
        height: "1.5px",
        background: `linear-gradient(90deg, transparent 0%, ${C.ouro} 20%, ${C.ouroClaro} 50%, ${C.ouro} 80%, transparent 100%)`,
      }} />

      {/* Bordas internas */}
      <div style={{
        position: "absolute",
        top: "16px",
        left: "16px",
        right: "16px",
        bottom: "16px",
        border: `0.5px solid ${C.ouroDim}`,
        opacity: 0.4,
        pointerEvents: "none",
      }} />

      {/* ── SEÇÃO SUPERIOR ── */}
      <div style={{
        padding: "52px 56px 0",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "7px",
          letterSpacing: "0.48em",
          textTransform: "uppercase",
          color: C.ouro,
          marginBottom: "6px",
        }}>Instituto Pádua · Medicina Integrativa</div>

        <div style={{
          height: "0.5px",
          background: `linear-gradient(90deg, transparent, ${C.ouroDim}, transparent)`,
          margin: "14px 40px",
        }} />
      </div>

      {/* ── CENTRO ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 60px",
        textAlign: "center",
      }}>

        {/* Tipo do documento */}
        <div style={{
          fontSize: "7px",
          letterSpacing: "0.44em",
          textTransform: "uppercase",
          color: C.cinzaNobre,
          marginBottom: "6px",
        }}>Protocolo Terapêutico</div>

        {/* Fio */}
        <div style={{
          width: "48px",
          height: "0.5px",
          background: C.ouro,
          margin: "14px auto",
          opacity: 0.8,
        }} />

        {/* Título */}
        <div style={{
          fontSize: "24px",
          fontWeight: 700,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: C.marfim,
          lineHeight: "1.25",
          marginBottom: "8px",
        }}>Protocolo de<br />Longevidade</div>

        <div style={{
          fontSize: "9px",
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: C.ouroMedio,
          marginBottom: "4px",
        }}>Cuidado Integrativo Avançado</div>

        <OrnamentoCentral />

        {/* Dados principais */}
        <div style={{
          border: `0.5px solid ${C.ouroDim}`,
          padding: "20px 32px",
          width: "100%",
          maxWidth: "340px",
        }}>
          {[
            ["Paciente", "Maria Francisca de Oliveira Borges"],
            ["Nascimento", "14/03/1978 · 47 anos"],
            ["Código", "PROT-2026-001847"],
          ].map(([label, valor]) => (
            <div key={label} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "7px 0",
              borderBottom: `0.5px solid rgba(184,152,42,0.15)`,
            }}>
              <div style={{
                fontSize: "6.5px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: C.cinzaNobre,
              }}>{label}</div>
              <div style={{
                fontSize: "9px",
                fontWeight: 600,
                color: C.marfim,
                letterSpacing: "0.04em",
                textAlign: "right",
                maxWidth: "200px",
              }}>{valor}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RODAPÉ ── */}
      <div style={{
        padding: "0 56px 48px",
        textAlign: "center",
      }}>
        {/* Fio duplo */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ height: "0.5px", background: `linear-gradient(90deg, transparent, ${C.ouroDim}, transparent)`, opacity: 0.6 }} />
          <div style={{ height: "6px" }} />
          <div style={{ height: "0.5px", background: `linear-gradient(90deg, transparent, ${C.ouroDim}, transparent)`, opacity: 0.3 }} />
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}>
          {/* Médico */}
          <div style={{ textAlign: "left" }}>
            <div style={{
              fontSize: "9px",
              fontWeight: 700,
              color: C.marfim,
              letterSpacing: "0.08em",
              marginBottom: "3px",
            }}>Dr. Caio H. F. Pádua</div>
            <div style={{
              fontSize: "7px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.cinzaNobre,
              lineHeight: "1.8",
            }}>CRM 123456 · SP<br />Endocrinologista</div>
          </div>

          {/* Data e assinatura */}
          <div style={{ textAlign: "right" }}>
            <div style={{
              width: "140px",
              height: "0.5px",
              background: C.ouro,
              marginBottom: "7px",
              marginLeft: "auto",
              opacity: 0.7,
            }} />
            <div style={{
              fontSize: "7px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: C.cinzaNobre,
              marginBottom: "2px",
            }}>Assinatura</div>
            <div style={{
              fontSize: "8px",
              color: C.marfimDim,
            }}>São Paulo · 18/07/2026</div>
          </div>
        </div>

        {/* Linha base */}
        <div style={{
          marginTop: "20px",
          fontSize: "6.5px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: C.ouroDim,
          opacity: 0.7,
        }}>Av. Paulista, 1.000 · São Paulo · SP · (11) 3456-7890</div>
      </div>

      {/* Faixa ouro base */}
      <div style={{
        height: "1.5px",
        background: `linear-gradient(90deg, transparent 0%, ${C.ouro} 20%, ${C.ouroClaro} 50%, ${C.ouro} 80%, transparent 100%)`,
      }} />
    </div>
  );
}
