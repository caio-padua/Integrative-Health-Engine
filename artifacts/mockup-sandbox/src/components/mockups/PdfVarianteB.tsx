export default function PdfVarianteB() {
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
        padding: "24px 30px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottom: "2px solid #1a2332",
      }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "bold", color: "#1a2332", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            CLINICA DE MEDICINA INTEGRATIVA PADUA
          </div>
          <div style={{ fontSize: "8px", color: "#777", marginTop: "6px", lineHeight: "1.7" }}>
            ENDERECO  RUA COELHO LISBOA, TATUAPE - 722, SAO PAULO, SP  CEP 03323-040<br />
            CNPJ  33.143.134/0001-10<br />
            TELEFONE  (11) 97715-4000
          </div>
        </div>
        <div style={{
          width: "56px",
          height: "56px",
          background: "#1a2332",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{
            color: "#c5a55a",
            fontSize: "18px",
            fontWeight: "bold",
            letterSpacing: "1px",
          }}>
            CP
          </div>
        </div>
      </div>

      <div style={{
        margin: "16px 30px",
        border: "2px solid #c5a55a",
        borderRadius: "4px",
        overflow: "hidden",
      }}>
        <div style={{
          background: "#c5a55a",
          padding: "8px 16px",
          textAlign: "center",
        }}>
          <div style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "white",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}>
            SOLICITACAO DE EXAMES
          </div>
        </div>

        <div style={{ display: "flex" }}>
          <div style={{
            flex: 1,
            padding: "12px 16px",
            borderRight: "1px solid #e8e8e8",
          }}>
            <div style={{
              fontSize: "7px",
              color: "#c5a55a",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              fontWeight: "bold",
              marginBottom: "6px",
              background: "#faf6ed",
              padding: "3px 6px",
              borderRadius: "2px",
              display: "inline-block",
            }}>
              PACIENTE
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", marginTop: "4px" }}>
              DAYANA LUDMAN ALVES CALDAS DA SILVA
            </div>
            <div style={{ fontSize: "8px", color: "#666", marginTop: "6px", lineHeight: "1.8" }}>
              CPF  293.274.948-06<br />
              ENDERECO  RUA GUAXUPE, VILA FORMOSA - 327<br />
              SAO PAULO, SP<br />
              TELEFONE  (11) 94655-4000
            </div>
          </div>

          <div style={{
            flex: 1,
            padding: "12px 16px",
          }}>
            <div style={{
              fontSize: "7px",
              color: "#c5a55a",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              fontWeight: "bold",
              marginBottom: "6px",
              background: "#faf6ed",
              padding: "3px 6px",
              borderRadius: "2px",
              display: "inline-block",
            }}>
              PROFISSIONAL
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", marginTop: "4px" }}>
              DR CAIO HENRIQUE PADUA
            </div>
            <div style={{ fontSize: "8px", color: "#666", marginTop: "6px", lineHeight: "1.8" }}>
              MEDICINA INTERNA<br />
              CRM-SP 125475<br />
              CPF 293.274.948-06
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 30px" }}>
        <div style={{ marginTop: "8px" }}>
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
              padding: "3px 0 3px 0",
              borderBottom: "1px dotted #eee",
              color: "#333",
            }}>
              {exame}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "16px", paddingTop: "8px", borderTop: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: "9px" }}>
            <span style={{ fontWeight: "bold", color: "#1a2332" }}>HD</span>  INVESTIGACAO METABOLICA INTEGRATIVA
          </div>
          <div style={{ fontSize: "9px", marginTop: "2px" }}>
            <span style={{ fontWeight: "bold", color: "#1a2332" }}>CID</span>  Z00.0
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
        <div style={{ width: "200px", borderTop: "1px solid #1a2332", margin: "0 auto 4px" }} />
        <div style={{ fontSize: "10px", fontWeight: "bold", color: "#1a2332" }}>DR CAIO HENRIQUE PADUA</div>
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
          background: "#f5f5f5",
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

      <div style={{
        position: "absolute",
        bottom: "80px",
        left: "30px",
        right: "30px",
        display: "flex",
        gap: "0",
        border: "1px solid #ddd",
        fontSize: "8px",
      }}>
        <div style={{ flex: 1, padding: "8px 10px", borderRight: "1px solid #ddd" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>IDENTIFICACAO DO COMPRADOR</div>
          <div style={{ color: "#999", lineHeight: "1.8" }}>
            NOME<br />
            RG<br />
            CPF<br />
            ENDERECO<br />
            TELEFONE
          </div>
        </div>
        <div style={{ flex: 1, padding: "8px 10px" }}>
          <div style={{ fontWeight: "bold", fontStyle: "italic", marginBottom: "4px" }}>IDENTIFICACAO DO FORNECEDOR</div>
          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <div style={{ borderTop: "1px solid #ccc", width: "80%", margin: "0 auto 2px" }} />
            <div style={{ fontSize: "7px", color: "#999" }}>ASSINATURA DO FARMACEUTICO</div>
            <div style={{ marginTop: "8px", borderTop: "1px solid #ccc", width: "50%", margin: "0 auto 2px" }} />
            <div style={{ fontSize: "7px", color: "#999" }}>DATA</div>
          </div>
        </div>
      </div>
    </div>
  );
}
