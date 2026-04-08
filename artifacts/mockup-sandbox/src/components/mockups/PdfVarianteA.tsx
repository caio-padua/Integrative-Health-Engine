export default function PdfVarianteA() {
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
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1a2332 0%, #2c3e50 100%)",
        padding: "20px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        <div style={{ color: "white", flex: 1 }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px", textTransform: "uppercase" }}>
            CLINICA DE MEDICINA INTEGRATIVA PADUA
          </div>
          <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.7)", marginTop: "6px", lineHeight: "1.6" }}>
            ENDERECO  RUA COELHO LISBOA, TATUAPE - 722, SAO PAULO, SP<br />
            CEP  03323-040<br />
            CNPJ  33.143.134/0001-10<br />
            TELEFONE  (11) 97715-4000
          </div>
        </div>
        <div style={{
          width: "60px",
          height: "60px",
          background: "rgba(255,255,255,0.15)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(255,255,255,0.3)",
          flexShrink: 0,
          marginLeft: "20px",
        }}>
          <div style={{ color: "white", fontSize: "16px", fontWeight: "bold", letterSpacing: "2px" }}>
            CP
          </div>
        </div>
      </div>

      <div style={{
        background: "#c5a55a",
        padding: "10px 30px",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "13px",
          fontWeight: "bold",
          color: "white",
          letterSpacing: "3px",
          textTransform: "uppercase",
        }}>
          SOLICITACAO DE EXAMES
        </div>
      </div>

      <div style={{ padding: "0 30px" }}>
        <div style={{
          display: "flex",
          gap: "0",
          marginTop: "0",
        }}>
          <div style={{
            flex: 1,
            padding: "14px 16px",
            borderRight: "1px solid #e0e0e0",
            borderBottom: "1px solid #e0e0e0",
          }}>
            <div style={{ fontSize: "7px", color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
              PACIENTE
            </div>
            <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>
              DAYANA LUDMAN ALVES CALDAS DA SILVA
            </div>
            <div style={{ fontSize: "9px", color: "#555", marginTop: "4px", lineHeight: "1.8" }}>
              CPF  293.274.948-06<br />
              ENDERECO  RUA GUAXUPE, VILA FORMOSA - 327, SAO PAULO, SP<br />
              TELEFONE  (11) 94655-4000
            </div>
          </div>

          <div style={{
            flex: 1,
            padding: "14px 16px",
            borderBottom: "1px solid #e0e0e0",
          }}>
            <div style={{ fontSize: "7px", color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
              PROFISSIONAL
            </div>
            <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>
              DR CAIO HENRIQUE PADUA
            </div>
            <div style={{ fontSize: "9px", color: "#555", marginTop: "4px", lineHeight: "1.8" }}>
              MEDICINA INTERNA<br />
              CRM-SP 125475<br />
              CPF 293.274.948-06
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          <div style={{
            fontSize: "10px",
            fontWeight: "bold",
            color: "#1a2332",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "12px",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "6px",
          }}>
            EXAMES SOLICITADOS
          </div>

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
              borderBottom: i < 17 ? "1px dotted #f0f0f0" : "none",
            }}>
              {exame}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "20px", borderTop: "1px solid #e8e8e8", paddingTop: "10px" }}>
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
        bottom: "120px",
        left: "30px",
        right: "30px",
        textAlign: "center",
      }}>
        <div style={{ width: "200px", borderTop: "1px solid #333", margin: "0 auto 4px" }} />
        <div style={{ fontSize: "10px", fontWeight: "bold" }}>DR CAIO HENRIQUE PADUA</div>
        <div style={{ fontSize: "8px", color: "#666" }}>MEDICINA INTERNA</div>
        <div style={{ fontSize: "8px", color: "#666" }}>CRM-SP 125475</div>
        <div style={{ fontSize: "8px", color: "#666" }}>CNS 123456789012345</div>
      </div>

      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "30px",
        right: "30px",
        borderTop: "1px solid #e0e0e0",
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
          width: "50px",
          height: "50px",
          background: "#f0f0f0",
          border: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "6px",
          color: "#999",
          marginLeft: "10px",
          flexShrink: 0,
        }}>
          QR CODE
        </div>
      </div>
    </div>
  );
}
