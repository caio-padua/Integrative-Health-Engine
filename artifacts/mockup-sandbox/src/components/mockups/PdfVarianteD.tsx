export default function PdfVarianteD() {
  return (
    <div style={{
      width: "595px",
      minHeight: "842px",
      margin: "0 auto",
      padding: "0",
      fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
      background: "white",
      color: "#1a1a1a",
      fontSize: "11px",
      lineHeight: "1.5",
      boxShadow: "0 2px 20px rgba(0,0,0,0.08)",
      position: "relative",
    }}>
      <div style={{
        padding: "22px 28px 18px",
        display: "flex",
        alignItems: "center",
        borderBottom: "2px solid #222",
      }}>
        <div style={{
          width: "50px",
          height: "50px",
          background: "linear-gradient(135deg, #333 0%, #666 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginRight: "16px",
        }}>
          <div style={{ color: "white", fontSize: "16px", fontWeight: "bold", letterSpacing: "1px" }}>CP</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#111", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            CLINICA DE MEDICINA INTEGRATIVA PADUA
          </div>
          <div style={{ fontSize: "8px", color: "#666", marginTop: "5px", lineHeight: "1.7" }}>
            ENDERECO  RUA COELHO LISBOA, TATUAPE - 722, SAO PAULO, SP  CEP 03323-040<br />
            CNPJ  33.143.134/0001-10  |  TELEFONE  (11) 97715-4000
          </div>
        </div>
      </div>

      <div style={{ padding: "0 28px", marginTop: "14px" }}>
        <div style={{
          display: "flex",
          gap: "0",
        }}>
          <div style={{
            flex: 1,
            padding: "12px 14px",
            border: "1px solid #ccc",
            borderRight: "none",
          }}>
            <div style={{
              fontSize: "7px",
              fontWeight: "bold",
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "8px",
              borderBottom: "1px solid #e0e0e0",
              paddingBottom: "4px",
            }}>
              PACIENTE
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>
              DAYANA LUDMAN ALVES CALDAS DA SILVA
            </div>
            <div style={{ fontSize: "8px", color: "#444", marginTop: "6px", lineHeight: "1.9" }}>
              CPF  293.274.948-06<br />
              ENDERECO  RUA GUAXUPE, VILA FORMOSA - 327, SAO PAULO, SP<br />
              TELEFONE  (11) 94655-4000
            </div>
          </div>

          <div style={{
            flex: 1,
            padding: "12px 14px",
            border: "1px solid #ccc",
          }}>
            <div style={{
              fontSize: "7px",
              fontWeight: "bold",
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "8px",
              borderBottom: "1px solid #e0e0e0",
              paddingBottom: "4px",
            }}>
              PROFISSIONAL
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>
              DR CAIO HENRIQUE PADUA
            </div>
            <div style={{ fontSize: "8px", color: "#444", marginTop: "6px", lineHeight: "1.9" }}>
              MEDICINA INTERNA<br />
              CRM-SP 125475<br />
              CPF 293.274.948-06
            </div>
          </div>
        </div>
      </div>

      <div style={{
        margin: "16px 28px 0",
        border: "1px solid #999",
        padding: "8px 0",
        textAlign: "center",
        background: "linear-gradient(to bottom, #f8f8f8, #fff)",
      }}>
        <div style={{
          fontSize: "12px",
          fontWeight: "bold",
          color: "#111",
          letterSpacing: "4px",
          textTransform: "uppercase",
        }}>
          SOLICITACAO DE EXAMES
        </div>
      </div>

      <div style={{ padding: "10px 28px 0" }}>
        {[
          "HEMOGRAMA COMPLETO",
          "TSH",
          "T4 LIVRE",
          "T3 LIVRE",
          "ANTI-TPO",
          "VITAMINA D 25-OH",
          "VITAMINA B12",
          "HOMOCISTEINA",
          "PCR ULTRASSENSIVEL",
          "HEMOGLOBINA GLICADA",
          "INSULINA BASAL",
          "COLESTEROL TOTAL E FRACOES",
          "TRIGLICERIDES",
          "TGO",
          "TGP",
          "GGT",
          "FERRITINA",
          "FERRO SERICO",
        ].map((exame, i) => (
          <div key={i} style={{
            fontSize: "10px",
            padding: "3px 0",
            color: "#222",
            borderBottom: "1px dotted #ddd",
          }}>
            {exame}
          </div>
        ))}

        <div style={{
          marginTop: "16px",
          padding: "10px 14px",
          border: "1px solid #ccc",
          background: "#fafafa",
        }}>
          <div style={{ fontSize: "9px", lineHeight: "1.8" }}>
            <span style={{ fontWeight: "bold", color: "#111", letterSpacing: "1px" }}>HD</span>{"  "}INVESTIGACAO METABOLICA INTEGRATIVA
          </div>
          <div style={{ fontSize: "9px", lineHeight: "1.8" }}>
            <span style={{ fontWeight: "bold", color: "#111", letterSpacing: "1px" }}>CID</span>{"  "}Z00.0 + E55.9 + E61.1
          </div>
        </div>
      </div>

      <div style={{
        position: "absolute",
        bottom: "65px",
        left: "28px",
        right: "28px",
        textAlign: "center",
      }}>
        <div style={{ width: "180px", borderTop: "1px solid #222", margin: "0 auto 4px" }} />
        <div style={{ fontSize: "10px", fontWeight: "bold", color: "#111" }}>DR CAIO HENRIQUE PADUA</div>
        <div style={{ fontSize: "8px", color: "#666" }}>MEDICINA INTERNA</div>
        <div style={{ fontSize: "8px", color: "#666" }}>CRM-SP 125475</div>
        <div style={{ fontSize: "8px", color: "#666" }}>CNS 123456789012345</div>
      </div>

      <div style={{
        position: "absolute",
        bottom: "12px",
        left: "28px",
        right: "28px",
        borderTop: "1px solid #ccc",
        paddingTop: "6px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        <div style={{ flex: 1, fontSize: "6.5px", color: "#aaa", lineHeight: "1.5" }}>
          DOCUMENTO ASSINADO DIGITALMENTE - DR CAIO HENRIQUE PADUA - CRM-SP 125475<br />
          DATA DE EMISSAO  08 DE ABRIL DE 2026<br />
          A ASSINATURA DIGITAL DESTE DOCUMENTO PODERA SER VERIFICADA EM HTTPS://VALIDAR.ITI.GOV.BR<br />
          ACESSE O DOCUMENTO DIGITAL EM HTTPS://PRESCRICAO.SUPPORTCLINIC.COM.BR/CONSULTA-DOCUMENTO
        </div>
        <div style={{
          width: "40px",
          height: "40px",
          background: "#f0f0f0",
          border: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "5px",
          color: "#bbb",
          marginLeft: "8px",
          flexShrink: 0,
        }}>
          QR CODE
        </div>
      </div>
    </div>
  );
}
