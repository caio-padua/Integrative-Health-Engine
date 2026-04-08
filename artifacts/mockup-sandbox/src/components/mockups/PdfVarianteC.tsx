export default function PdfVarianteC() {
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
      boxShadow: "0 2px 20px rgba(0,0,0,0.1)",
      position: "relative",
      borderTop: "4px solid #c5a55a",
    }}>
      <div style={{
        padding: "20px 30px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{
          width: "48px",
          height: "48px",
          background: "linear-gradient(135deg, #c5a55a, #e8d5a0)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(197,165,90,0.3)",
        }}>
          <div style={{ color: "#1a2332", fontSize: "15px", fontWeight: "bold" }}>CP</div>
        </div>

        <div style={{ flex: 1, marginLeft: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1a2332", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            CLINICA DE MEDICINA INTEGRATIVA PADUA
          </div>
          <div style={{ fontSize: "8px", color: "#888", marginTop: "4px" }}>
            RUA COELHO LISBOA, TATUAPE - 722, SAO PAULO, SP  CEP 03323-040  |  CNPJ 33.143.134/0001-10  |  (11) 97715-4000
          </div>
        </div>
      </div>

      <div style={{
        margin: "0 30px",
        height: "1px",
        background: "linear-gradient(to right, #c5a55a, transparent)",
      }} />

      <div style={{
        margin: "14px 30px",
        textAlign: "center",
        padding: "10px 0",
        position: "relative",
      }}>
        <div style={{
          position: "absolute",
          top: "0",
          left: "0",
          right: "0",
          height: "1px",
          background: "#c5a55a",
        }} />
        <div style={{
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          height: "1px",
          background: "#c5a55a",
        }} />
        <div style={{
          fontSize: "13px",
          fontWeight: "bold",
          color: "#1a2332",
          letterSpacing: "4px",
          textTransform: "uppercase",
        }}>
          SOLICITACAO DE EXAMES
        </div>
      </div>

      <div style={{ margin: "0 30px" }}>
        <div style={{
          display: "flex",
          gap: "0",
          border: "1px solid #e0e0e0",
          borderRadius: "3px",
          overflow: "hidden",
        }}>
          <div style={{
            flex: 1,
            padding: "12px 14px",
            borderRight: "1px solid #e0e0e0",
            background: "#fafafa",
          }}>
            <div style={{
              fontSize: "7px",
              fontWeight: "bold",
              color: "#c5a55a",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "8px",
            }}>
              PACIENTE
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>
              DAYANA LUDMAN ALVES CALDAS DA SILVA
            </div>
            <div style={{ fontSize: "8px", color: "#555", marginTop: "6px", lineHeight: "1.9" }}>
              CPF  293.274.948-06<br />
              ENDERECO  RUA GUAXUPE, VILA FORMOSA - 327, SAO PAULO, SP<br />
              TELEFONE  (11) 94655-4000
            </div>
          </div>

          <div style={{
            flex: 1,
            padding: "12px 14px",
            background: "#fafafa",
          }}>
            <div style={{
              fontSize: "7px",
              fontWeight: "bold",
              color: "#c5a55a",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "8px",
            }}>
              PROFISSIONAL
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>
              DR CAIO HENRIQUE PADUA
            </div>
            <div style={{ fontSize: "8px", color: "#555", marginTop: "6px", lineHeight: "1.9" }}>
              MEDICINA INTERNA<br />
              CRM-SP 125475<br />
              CPF 293.274.948-06
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 30px 0" }}>
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
            color: "#333",
            borderBottom: "1px dotted #f0f0f0",
          }}>
            {exame}
          </div>
        ))}

        <div style={{ marginTop: "14px", paddingTop: "8px", borderTop: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: "9px" }}>
            <span style={{ fontWeight: "bold" }}>HD</span>  INVESTIGACAO METABOLICA INTEGRATIVA
          </div>
          <div style={{ fontSize: "9px", marginTop: "2px" }}>
            <span style={{ fontWeight: "bold" }}>CID</span>  Z00.0
          </div>
        </div>
      </div>

      <div style={{
        position: "absolute",
        bottom: "115px",
        left: "30px",
        right: "30px",
        textAlign: "center",
      }}>
        <div style={{ width: "180px", borderTop: "1px solid #1a2332", margin: "0 auto 4px" }} />
        <div style={{ fontSize: "10px", fontWeight: "bold", color: "#1a2332" }}>DR CAIO HENRIQUE PADUA</div>
        <div style={{ fontSize: "8px", color: "#888" }}>MEDICINA INTERNA</div>
        <div style={{ fontSize: "8px", color: "#888" }}>CRM-SP 125475</div>
        <div style={{ fontSize: "8px", color: "#888" }}>CNS 123456789012345</div>
      </div>

      <div style={{
        position: "absolute",
        bottom: "15px",
        left: "30px",
        right: "30px",
        borderTop: "1px solid #c5a55a",
        paddingTop: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        <div style={{ flex: 1, fontSize: "7px", color: "#999", lineHeight: "1.5" }}>
          DOCUMENTO ASSINADO DIGITALMENTE - DR CAIO HENRIQUE PADUA - CRM-SP 125475<br />
          DATA DE EMISSAO  08 DE ABRIL DE 2026<br />
          A ASSINATURA DIGITAL DESTE DOCUMENTO PODERA SER VERIFICADA EM HTTPS://VALIDAR.ITI.GOV.BR<br />
          ACESSE O DOCUMENTO DIGITAL EM HTTPS://PRESCRICAO.SUPPORTCLINIC.COM.BR/CONSULTA-DOCUMENTO
        </div>
        <div style={{
          width: "48px",
          height: "48px",
          background: "#f8f8f8",
          border: "1px solid #e0e0e0",
          borderRadius: "3px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "6px",
          color: "#bbb",
          marginLeft: "10px",
          flexShrink: 0,
        }}>
          QR CODE
        </div>
      </div>
    </div>
  );
}
