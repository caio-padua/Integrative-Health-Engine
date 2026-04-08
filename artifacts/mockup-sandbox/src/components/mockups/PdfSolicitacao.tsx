export default function PdfSolicitacao() {
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
        fontSize: "15px",
        fontWeight: "bold",
        letterSpacing: "0.5px",
        color: "#1a1a1a",
        marginBottom: "16px",
      }}>
        RECEITUARIO ESPECIAL
      </div>

      <div style={{ fontSize: "11px", marginBottom: "4px" }}>
        <span>Paciente: </span>
        <span style={{ fontWeight: "bold" }}>Dayana Ludman Alves Caldas da Silva</span>
      </div>
      <div style={{ fontSize: "11px", marginBottom: "16px" }}>
        CPF: 293.274.948-06 &nbsp;&nbsp;&nbsp; Data de Nascimento: 15/03/1985
      </div>

      <div style={{
        borderTop: "1px solid #ccc",
        margin: "8px 0 12px",
      }} />

      <div style={{
        fontSize: "13px",
        fontWeight: "bold",
        marginBottom: "10px",
      }}>
        SOLICITACAO DE EXAMES:
      </div>

      {[
        { num: 1, nome: "HEMOGRAMA" },
        { num: 2, nome: "TSH" },
        { num: 3, nome: "VITAMINA D" },
        { num: 4, nome: "HEMOGLOBINA GLICADA" },
      ].map((exame) => (
        <div key={exame.num} style={{
          marginBottom: "6px",
          paddingLeft: "4px",
        }}>
          <div style={{ fontWeight: "bold", fontSize: "11px" }}>
            {exame.num}  {exame.nome}
          </div>
        </div>
      ))}

      <div style={{
        borderTop: "1px solid #ccc",
        margin: "16px 0 12px",
      }} />

      <div style={{ marginBottom: "4px" }}>
        <span style={{ fontWeight: "bold", fontSize: "11px" }}>HIPOTESE DIAGNOSTICA (HD):</span>
      </div>
      <div style={{ fontSize: "11px", marginBottom: "4px" }}>
        Investigacao metabolica integrativa
      </div>
      <div style={{ fontSize: "11px" }}>
        CID: Z00.0
      </div>

      <div style={{
        marginTop: "60px",
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
