export default function ReceitaVarianteA() {
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
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#111", letterSpacing: "0.5px" }}>
            CLINICA DE MEDICINA INTEGRATIVA PADUA
          </div>
          <div style={{ fontSize: "8px", color: "#666", marginTop: "5px", lineHeight: "1.7" }}>
            ENDERECO  RUA COELHO LISBOA, TATUAPE - 722, SAO PAULO, SP  CEP 03323-040<br />
            CNPJ  33.143.134/0001-10  |  TELEFONE  (11) 97715-4000
          </div>
        </div>
      </div>

      <div style={{ padding: "0 28px", marginTop: "14px" }}>
        <div style={{ display: "flex" }}>
          <div style={{
            flex: 1,
            padding: "12px 14px",
            border: "1px solid #ccc",
            borderRight: "none",
          }}>
            <div style={{ fontSize: "7px", fontWeight: "bold", color: "#555", letterSpacing: "2px", marginBottom: "8px", borderBottom: "1px solid #e0e0e0", paddingBottom: "4px" }}>
              PACIENTE
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold" }}>RICARDO CESAR</div>
            <div style={{ fontSize: "8px", color: "#444", marginTop: "6px", lineHeight: "1.9" }}>
              CPF  086.250.558-50<br />
              ENDERECO  RUA ANHUMAS, VILA SAO JOAO BATISTA - 489, GUARULHOS, SP<br />
              TELEFONE  (11) 96142-0654
            </div>
          </div>
          <div style={{
            flex: 1,
            padding: "12px 14px",
            border: "1px solid #ccc",
          }}>
            <div style={{ fontSize: "7px", fontWeight: "bold", color: "#555", letterSpacing: "2px", marginBottom: "8px", borderBottom: "1px solid #e0e0e0", paddingBottom: "4px" }}>
              PROFISSIONAL
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold" }}>DR CAIO HENRIQUE PADUA</div>
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
        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#111", letterSpacing: "4px" }}>
          RECEITUARIO DE CONTROLE ESPECIAL
        </div>
      </div>

      <div style={{
        margin: "10px 28px 0",
        padding: "10px 14px",
        border: "1px solid #ddd",
        background: "#fafafa",
        fontSize: "7px",
        color: "#444",
        lineHeight: "1.7",
      }}>
        - O PACIENTE ESTA CIENTE DE QUE DEVERA SER CONSULTADO AO TERMINO DAS FORMULACOES DESCRITAS, E AS MESMAS DEVERAO SER MANIPULADAS DE ACORDO COM A POSOLOGIA DE CADA PRESCRICAO E LIMITADA A DURACAO DO TRATAMENTO DESCRITO ABAIXO<br />
        - AS FORMULACOES DESCRITAS ABAIXO SAO PERSONALIZADAS E FORAM ELABORADAS EXCLUSIVAMENTE PARA O PRESENTE TRATAMENTO, COM BASE NA AVALIACAO CLINICA E EXAMES DO PACIENTE E DE ACORDO COM AS SUAS NECESSIDADES E OBJETIVOS<br />
        - SUA REPRODUCAO TOTAL OU PARCIAL, SEM NOVA AVALIACAO MEDICA E PRESCRICAO ATUALIZADA, NAO ESTA AUTORIZADA, NOS TERMOS DA RESOLUCAO CFM N 1.974/2011 E RDC N 67/2007 DA ANVISA<br />
        - O USO SEM ACOMPANHAMENTO DO MEDICO PRESCRITOR OU POR TERCEIROS NAO E RECOMENDADO, E EXIME ESTE PROFISSIONAL DE RESPONSABILIDADES
      </div>

      <div style={{ padding: "0 28px", marginTop: "8px" }}>
        <div style={{ display: "flex", gap: "20px", fontSize: "8px" }}>
          <div><span style={{ fontWeight: "bold" }}>DURACAO DO TRATAMENTO</span>  30 DIAS</div>
          <div><span style={{ fontWeight: "bold" }}>CID</span>  N484 + E291 + F90 + F41.2 + E14 + E66.0</div>
        </div>
      </div>

      <div style={{ padding: "8px 28px 0" }}>
        {[
          {
            formula: "ZINCO BISGLICINATO 30MG\nSELENIO BISGLICINATO 300MCG\nBORO BISGLICINATO 1,5MG\nTIROSINA 200MG",
            posologia: "1 DOSE VO - DURANTE O CAFE DA MANHA",
          },
          {
            formula: "BUPROPIONA 150MG\nCAPSULAS XR LIBERACAO ENTERICA + MATRIZ LIBERACAO LENTA (DRCAPS OU HPMC)\nUSAR EXCIPIENTES COMO HPMC, ETHOCEL E CELULOSE MICROCRISTALINA",
            posologia: "1 DOSE VO - 2H ANTES DO ALMOCO - SUGESTAO 10H\n1 DOSE VO - 2H ANTES DO JANTAR - SUGESTAO 18H",
          },
          {
            formula: "NALTREXONE 7MG\nBROMOPRIDA 1,5MG\nFAMOTIDINA 5MG\nCAPSULAS XR LIBERACAO ENTERICA + MATRIZ LIBERACAO LENTA (DRCAPS OU HPMC)",
            posologia: "1 DOSE VO - 2H ANTES DO ALMOCO - SUGESTAO 10H\n1 DOSE VO - 2H ANTES DO JANTAR - SUGESTAO 18H",
          },
        ].map((item, i) => (
          <div key={i} style={{
            padding: "8px 10px",
            border: "1px solid #ddd",
            borderTop: i === 0 ? "1px solid #ddd" : "none",
            fontSize: "8px",
            lineHeight: "1.6",
          }}>
            <div style={{ whiteSpace: "pre-line", fontWeight: "bold", color: "#222" }}>{item.formula}</div>
            <div style={{ whiteSpace: "pre-line", color: "#555", marginTop: "4px", fontStyle: "italic" }}>{item.posologia}</div>
          </div>
        ))}
      </div>

      <div style={{
        position: "absolute",
        bottom: "150px",
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
        bottom: "60px",
        left: "28px",
        right: "28px",
        display: "flex",
        border: "1px solid #bbb",
        fontSize: "8px",
      }}>
        <div style={{ flex: 1, padding: "8px 10px", borderRight: "1px solid #bbb" }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "7px", letterSpacing: "1px" }}>IDENTIFICACAO DO COMPRADOR</div>
          <div style={{ color: "#888", lineHeight: "1.8" }}>
            NOME<br />RG<br />CPF<br />ENDERECO<br />TELEFONE
          </div>
        </div>
        <div style={{ flex: 1, padding: "8px 10px" }}>
          <div style={{ fontWeight: "bold", fontStyle: "italic", marginBottom: "4px", fontSize: "7px", letterSpacing: "1px" }}>IDENTIFICACAO DO FORNECEDOR</div>
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <div style={{ borderTop: "1px solid #bbb", width: "80%", margin: "0 auto 2px" }} />
            <div style={{ fontSize: "7px", color: "#888" }}>ASSINATURA DO FARMACEUTICO</div>
            <div style={{ marginTop: "6px", borderTop: "1px solid #bbb", width: "50%", margin: "0 auto 2px" }} />
            <div style={{ fontSize: "7px", color: "#888" }}>DATA</div>
          </div>
        </div>
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
        <div style={{ flex: 1, fontSize: "6px", color: "#aaa", lineHeight: "1.5" }}>
          DOCUMENTO ASSINADO DIGITALMENTE - DR CAIO HENRIQUE PADUA - CRM-SP 125475<br />
          DATA DE EMISSAO  08 DE ABRIL DE 2026<br />
          A ASSINATURA DIGITAL DESTE DOCUMENTO PODERA SER VERIFICADA EM HTTPS://VALIDAR.ITI.GOV.BR
        </div>
        <div style={{
          width: "36px",
          height: "36px",
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
