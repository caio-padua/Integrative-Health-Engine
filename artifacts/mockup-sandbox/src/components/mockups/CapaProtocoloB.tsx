/**
 * CAP-02 · CAPA DE PROTOCOLO AUSTERO TIPOGRÁFICO
 * Estilo documento jurídico-clínico formal — tipografia pura, sem gráficos
 * Inspiração: documento de lei, cabeçalho de tribunal, código de ética médica
 */
export default function CapaProtocoloB() {
  const N = "#0F2940";
  const AU = "#C7A646";

  const cadernos = [
    { codigo: "RACL·HMED", nome: "Medicamentos em Uso", pag: "3" },
    { codigo: "RACL·FORM", nome: "Fórmulas Magistrais", pag: "5" },
    { codigo: "RACL·EXAM", nome: "Exames Solicitados", pag: "8" },
    { codigo: "RACL·EVOL", nome: "Evolução Clínica", pag: "11" },
    { codigo: "RACJ·TCLE", nome: "Termo de Consentimento Global", pag: "14" },
    { codigo: "RACJ·CFOR", nome: "Consentimento Fórmulas", pag: "16" },
    { codigo: "FINA·ORÇA", nome: "Orçamento do Protocolo", pag: "18" },
  ];

  return (
    <div style={{ background: "#e8e8e8", minHeight: "100vh", padding: 32, fontFamily: "'JetBrains Mono', 'Courier New', monospace", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>CAP-02 · Capa Austero Tipográfico — Documento Formal</div>
      </div>

      <div style={{ width: 595, minHeight: 842, background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.14)", position: "relative" }}>

        {/* FAIXA FINA TOPO */}
        <div style={{ background: N, height: 4 }} />
        <div style={{ background: AU, height: 2 }} />

        {/* CABEÇALHO AUSTERO */}
        <div style={{ padding: "36px 44px 28px", borderBottom: `3px double ${N}` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, letterSpacing: 6, color: "#888", textTransform: "uppercase", marginBottom: 10 }}>
              MEDICINA INTEGRATIVA E LONGEVIDADE
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: N, letterSpacing: 3, textTransform: "uppercase", lineHeight: 1.2 }}>
              INSTITUTO PÁDUA
            </div>
            <div style={{ fontSize: 9, color: "#666", marginTop: 6, letterSpacing: 1 }}>
              PADUCCIA CLÍNICA MÉDICA LTDA — EPP
            </div>
            <div style={{ fontSize: 8, color: "#999", marginTop: 4 }}>
              CNPJ 63.865.940/0001-63 · RUA GUAXUPÉ, 327 · VILA FORMOSA · SÃO PAULO — SP
            </div>

            <div style={{ margin: "24px auto 0", width: 60, height: 60, border: `2px solid ${N}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: AU, letterSpacing: 1 }}>IP</div>
                <div style={{ fontSize: 6, color: N, letterSpacing: 1 }}>PÁDUA</div>
              </div>
            </div>
          </div>
        </div>

        {/* TÍTULO DO DOCUMENTO */}
        <div style={{ padding: "28px 44px 20px", textAlign: "center", borderBottom: `1px solid #e0e0e0` }}>
          <div style={{ fontSize: 8, letterSpacing: 4, color: "#aaa", textTransform: "uppercase", marginBottom: 8 }}>DOCUMENTO CLÍNICO OFICIAL</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: N, letterSpacing: 2, textTransform: "uppercase" }}>
            PROTOCOLO TERAPÊUTICO
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 6, letterSpacing: 1 }}>
            REGISTRO DE ASSISTÊNCIA SISTÊMICO — RAS
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 40 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 7, color: "#aaa", letterSpacing: 2, textTransform: "uppercase" }}>Número</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: N, marginTop: 2 }}>RAS-2026-0047</div>
            </div>
            <div style={{ width: 1, background: "#e0e0e0" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 7, color: "#aaa", letterSpacing: 2, textTransform: "uppercase" }}>Emissão</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: N, marginTop: 2 }}>17/07/2026</div>
            </div>
            <div style={{ width: 1, background: "#e0e0e0" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 7, color: "#aaa", letterSpacing: 2, textTransform: "uppercase" }}>Validade</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: N, marginTop: 2 }}>90 DIAS</div>
            </div>
          </div>
        </div>

        {/* IDENTIFICAÇÃO */}
        <div style={{ padding: "20px 44px", borderBottom: `1px solid #e0e0e0` }}>
          <div style={{ display: "flex", gap: 32 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Identificação do Paciente</div>
              {[
                ["Nome", "MARIA APARECIDA SANTOS FERREIRA"],
                ["CPF", "234.567.890-12"],
                ["Data de Nascimento", "19/03/1978"],
                ["Endereço", "R. das Palmeiras, 1.247 — Vila Madalena — SP"],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", marginBottom: 6 }}>
                  <div style={{ width: 110, fontSize: 7.5, color: "#888", flexShrink: 0 }}>{l}</div>
                  <div style={{ fontSize: 7.5, fontWeight: 600, color: N }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ width: 1, background: "#e0e0e0" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Médico Responsável</div>
              {[
                ["Nome", "DR. CAIO H. F. PÁDUA"],
                ["CRM-SP", "123.456"],
                ["Especialidade", "ENDOCRINOLOGISTA"],
                ["RQE", "54.321"],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", marginBottom: 6 }}>
                  <div style={{ width: 90, fontSize: 7.5, color: "#888", flexShrink: 0 }}>{l}</div>
                  <div style={{ fontSize: 7.5, fontWeight: 600, color: N }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ÍNDICE DO DOCUMENTO */}
        <div style={{ padding: "20px 44px" }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
            Índice de Cadernos deste Protocolo
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${N}` }}>
                {["Cód.", "Caderno Clínico / Jurídico", "Pág."].map((h) => (
                  <th key={h} style={{ fontSize: 7, color: N, fontWeight: 700, letterSpacing: 1, textAlign: "left", padding: "4px 6px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cadernos.map((c, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "6px 6px", fontSize: 8, fontFamily: "monospace", color: AU, fontWeight: 700 }}>{c.codigo}</td>
                  <td style={{ padding: "6px 6px", fontSize: 8.5, color: N }}>{c.nome}</td>
                  <td style={{ padding: "6px 6px", fontSize: 8, color: "#888", textAlign: "right" }}>{c.pag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LINHA DE ASSINATURA FORMAL */}
        <div style={{ padding: "10px 44px 60px", textAlign: "center" }}>
          <div style={{ borderTop: `1px solid ${N}`, marginTop: 40, paddingTop: 8, display: "inline-block", width: 220 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: N }}>DR. CAIO H. F. PÁDUA</div>
            <div style={{ fontSize: 7.5, color: "#666", marginTop: 2 }}>CRM-SP 123.456 — ENDOCRINOLOGISTA</div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <div style={{ background: AU, height: 2 }} />
          <div style={{ background: N, padding: "7px 44px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#8BA3C7", fontSize: 7 }}>INSTITUTO PÁDUA · Medicina Integrativa · São Paulo — SP</div>
            <div style={{ color: AU, fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>PAWARDS® · PADCON®</div>
          </div>
        </div>
      </div>
    </div>
  );
}
