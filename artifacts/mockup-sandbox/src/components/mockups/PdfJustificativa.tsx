export default function PdfJustificativa() {
  return (
    <div style={{
      width: "595px",
      minHeight: "842px",
      margin: "0 auto",
      padding: "40px 50px",
      fontFamily: "Helvetica, Arial, sans-serif",
      background: "white",
      color: "#000",
      fontSize: "12px",
      lineHeight: "1.5",
      boxShadow: "0 2px 20px rgba(0,0,0,0.1)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold" }}>CLINICA INTEGRATIVA PADUA</div>
        <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>
          Rua dos Tratamentos, 123 - Sao Paulo / SP
        </div>
        <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>
          Dr. Caio Padua - CRM: CRM-SP 000000
        </div>
      </div>

      <div style={{
        borderTop: "1.5px solid #333",
        margin: "12px 0",
      }} />

      <div style={{
        textAlign: "center",
        fontSize: "14px",
        fontWeight: "bold",
        letterSpacing: "0.5px",
        color: "#1a1a1a",
        marginBottom: "16px",
      }}>
        JUSTIFICATIVA PARA SOLICITACAO DE EXAMES
      </div>

      <div style={{ fontSize: "11px", marginBottom: "4px" }}>
        <span>Paciente: </span>
        <span style={{ fontWeight: "bold" }}>Dayana Ludman Alves Caldas da Silva</span>
      </div>
      <div style={{ fontSize: "11px", marginBottom: "4px" }}>
        CPF: 293.274.948-06
      </div>
      <div style={{ fontSize: "9px", color: "#666", marginBottom: "16px" }}>
        Tipo: Justificativa Clinica Narrativa
      </div>

      <div style={{
        borderTop: "1px solid #ccc",
        margin: "8px 0 16px",
      }} />

      {[
        {
          num: 1,
          nome: "HEMOGRAMA",
          justificativa: "Exame posicionado dentro do bloco oficial para compor o raciocinio clinico, a triagem e a validacao humana do caso."
        },
        {
          num: 2,
          nome: "TSH",
          justificativa: "Exame posicionado dentro do bloco oficial para compor o raciocinio clinico, a triagem e a validacao humana do caso."
        },
        {
          num: 3,
          nome: "VITAMINA D",
          justificativa: "Exame posicionado dentro do bloco oficial para compor o raciocinio clinico, a triagem e a validacao humana do caso."
        },
        {
          num: 4,
          nome: "HEMOGLOBINA GLICADA",
          justificativa: "Exame posicionado dentro do bloco oficial para compor o raciocinio clinico, a triagem e a validacao humana do caso."
        },
      ].map((exame) => (
        <div key={exame.num} style={{
          marginBottom: "16px",
        }}>
          <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}>
            {exame.num}. {exame.nome}
          </div>
          <div style={{
            fontSize: "11px",
            color: "#333",
            textAlign: "justify",
            lineHeight: "1.6",
            paddingLeft: "16px",
          }}>
            {exame.justificativa}
          </div>
        </div>
      ))}

      <div style={{
        borderTop: "1px solid #ccc",
        margin: "24px 0",
      }} />

      <div style={{
        marginTop: "40px",
        textAlign: "center",
      }}>
        <div style={{
          width: "200px",
          borderTop: "1px solid #333",
          margin: "0 auto 6px",
        }} />
        <div style={{ fontWeight: "bold", fontSize: "12px" }}>Dr. Caio Padua</div>
        <div style={{ fontSize: "10px", color: "#666" }}>CRM: CRM-SP 000000</div>
        <div style={{ fontSize: "10px", color: "#666", marginTop: "8px" }}>Data: 08/04/2026</div>
        <div style={{ fontSize: "8px", color: "#999", marginTop: "6px", fontStyle: "italic" }}>
          Documento assinado digitalmente conforme MP 2.200-2/2001
        </div>
      </div>
    </div>
  );
}
