export default function ReceitaVarianteD() {
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
        padding: "20px 28px 16px",
        display: "flex",
        alignItems: "center",
        borderBottom: "2px solid #222",
      }}>
        <div style={{
          width: "46px",
          height: "46px",
          background: "#333",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginRight: "14px",
        }}>
          <div style={{ color: "white", fontSize: "15px", fontWeight: "bold", letterSpacing: "1px" }}>CP</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#111", letterSpacing: "0.5px" }}>
            CLINICA DE MEDICINA INTEGRATIVA PADUA
          </div>
          <div style={{ fontSize: "7.5px", color: "#666", marginTop: "4px", lineHeight: "1.6" }}>
            RUA COELHO LISBOA, TATUAPE - 722, SAO PAULO, SP  CEP 03323-040  |  CNPJ 33.143.134/0001-10  |  (11) 97715-4000
          </div>
        </div>
      </div>

      <div style={{ padding: "0 28px", marginTop: "10px" }}>
        <div style={{ display: "flex" }}>
          <div style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRight: "none",
          }}>
            <div style={{ fontSize: "6.5px", fontWeight: "bold", color: "#555", letterSpacing: "2px", marginBottom: "5px" }}>
              PACIENTE
            </div>
            <div style={{ fontSize: "9.5px", fontWeight: "bold" }}>RICARDO CESAR</div>
            <div style={{ fontSize: "7px", color: "#444", marginTop: "4px", lineHeight: "1.7" }}>
              CPF  086.250.558-50  |  (11) 96142-0654<br />
              RUA ANHUMAS, VILA SAO JOAO BATISTA - 489, GUARULHOS, SP
            </div>
          </div>
          <div style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #ccc",
          }}>
            <div style={{ fontSize: "6.5px", fontWeight: "bold", color: "#555", letterSpacing: "2px", marginBottom: "5px" }}>
              PROFISSIONAL
            </div>
            <div style={{ fontSize: "9.5px", fontWeight: "bold" }}>DR CAIO HENRIQUE PADUA</div>
            <div style={{ fontSize: "7px", color: "#444", marginTop: "4px", lineHeight: "1.7" }}>
              MEDICINA INTERNA  |  CRM-SP 125475<br />
              CPF 293.274.948-06
            </div>
          </div>
        </div>
      </div>

      <div style={{
        margin: "10px 28px 0",
        border: "1px solid #999",
        padding: "6px 0",
        textAlign: "center",
        background: "linear-gradient(to bottom, #f8f8f8, #fff)",
      }}>
        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#111", letterSpacing: "3px" }}>
          RECEITUARIO DE CONTROLE ESPECIAL
        </div>
      </div>

      <div style={{
        margin: "6px 28px 0",
        padding: "6px 12px",
        border: "1px solid #ddd",
        background: "#fafafa",
        fontSize: "6px",
        color: "#555",
        lineHeight: "1.5",
      }}>
        O PACIENTE ESTA CIENTE DE QUE DEVERA SER CONSULTADO AO TERMINO DAS FORMULACOES. AS FORMULACOES SAO PERSONALIZADAS E EXCLUSIVAS PARA O PRESENTE TRATAMENTO, COM BASE NA AVALIACAO CLINICA. REPRODUCAO NAO AUTORIZADA - RES. CFM 1.974/2011 E RDC 67/2007 ANVISA. USO SEM ACOMPANHAMENTO MEDICO NAO E RECOMENDADO.
      </div>

      <div style={{ margin: "6px 28px 0", display: "flex", border: "1px solid #ccc" }}>
        <div style={{ padding: "4px 10px", borderRight: "1px solid #ccc", fontSize: "7.5px" }}>
          <span style={{ fontWeight: "bold" }}>DURACAO</span>  30 DIAS
        </div>
        <div style={{ padding: "4px 10px", flex: 1, fontSize: "7.5px" }}>
          <span style={{ fontWeight: "bold" }}>CID</span>  N484 + E291 + F90 + F41.2 + E14 + E66.0
        </div>
      </div>

      <div style={{ padding: "6px 28px 0" }}>
        {[
          {
            formula: "ZINCO BISGLICINATO 30MG\nSELENIO BISGLICINATO 300MCG\nBORO BISGLICINATO 1,5MG\nTIROSINA 200MG",
            posologia: "1 DOSE VO - DURANTE O CAFE DA MANHA",
          },
          {
            formula: "BUPROPIONA 150MG\nCAPSULAS XR LIBERACAO ENTERICA + MATRIZ LIBERACAO LENTA (DRCAPS OU HPMC)\nEXCIPIENTES HPMC, ETHOCEL E CELULOSE MICROCRISTALINA",
            posologia: "1 DOSE VO - 2H ANTES DO ALMOCO - SUGESTAO 10H\n1 DOSE VO - 2H ANTES DO JANTAR - SUGESTAO 18H",
          },
          {
            formula: "NALTREXONE 7MG\nBROMOPRIDA 1,5MG\nFAMOTIDINA 5MG\nCAPSULAS XR LIBERACAO ENTERICA + MATRIZ LIBERACAO LENTA",
            posologia: "1 DOSE VO - 2H ANTES DO ALMOCO - SUGESTAO 10H\n1 DOSE VO - 2H ANTES DO JANTAR - SUGESTAO 18H",
          },
          {
            formula: "L-THEANINA 50MG\nPASSIFLORA 150MG\nRHODIOLA 100MG\nESPINHEIRA-SANTA (MAYTENUS ILICIFOLIA) EXTRATO 100MG",
            posologia: "1 DOSE VO - 2H ANTES DO JANTAR - SUGESTAO 18H",
          },
          {
            formula: "PICOLINATO CROMO 500MCG\nPIMENTA CAIENA (CAPSAICINA) 5MG\nCASCARA SAGRADA 200MG",
            posologia: "1 DOSE VO - APOS O ALMOCO",
          },
        ].map((item, i) => (
          <div key={i} style={{
            padding: "5px 8px",
            border: "1px solid #e0e0e0",
            borderTop: i === 0 ? "1px solid #e0e0e0" : "none",
            fontSize: "7.5px",
            lineHeight: "1.5",
          }}>
            <div style={{ whiteSpace: "pre-line", color: "#222" }}>{item.formula}</div>
            <div style={{ whiteSpace: "pre-line", color: "#777", marginTop: "2px", fontSize: "7px", fontStyle: "italic" }}>{item.posologia}</div>
          </div>
        ))}
      </div>

      <div style={{
        position: "absolute",
        bottom: "142px",
        left: "28px",
        right: "28px",
        textAlign: "center",
      }}>
        <div style={{ width: "160px", borderTop: "1px solid #222", margin: "0 auto 3px" }} />
        <div style={{ fontSize: "9px", fontWeight: "bold", color: "#111" }}>DR CAIO HENRIQUE PADUA</div>
        <div style={{ fontSize: "7px", color: "#666" }}>MEDICINA INTERNA</div>
        <div style={{ fontSize: "7px", color: "#666" }}>CRM-SP 125475</div>
        <div style={{ fontSize: "7px", color: "#666" }}>CNS 123456789012345</div>
      </div>

      <div style={{
        position: "absolute",
        bottom: "55px",
        left: "28px",
        right: "28px",
        display: "flex",
        border: "1px solid #bbb",
        fontSize: "7.5px",
      }}>
        <div style={{ flex: 1, padding: "7px 9px", borderRight: "1px solid #bbb" }}>
          <div style={{ fontWeight: "bold", marginBottom: "3px", fontSize: "6.5px", letterSpacing: "1px" }}>IDENTIFICACAO DO COMPRADOR</div>
          <div style={{ color: "#888", lineHeight: "1.7" }}>
            NOME<br />RG<br />CPF<br />ENDERECO<br />TELEFONE
          </div>
        </div>
        <div style={{ flex: 1, padding: "7px 9px" }}>
          <div style={{ fontWeight: "bold", fontStyle: "italic", marginBottom: "3px", fontSize: "6.5px", letterSpacing: "1px" }}>IDENTIFICACAO DO FORNECEDOR</div>
          <div style={{ textAlign: "center", marginTop: "6px" }}>
            <div style={{ borderTop: "1px solid #bbb", width: "80%", margin: "0 auto 2px" }} />
            <div style={{ fontSize: "6.5px", color: "#888" }}>ASSINATURA DO FARMACEUTICO</div>
            <div style={{ marginTop: "5px", borderTop: "1px solid #bbb", width: "50%", margin: "0 auto 2px" }} />
            <div style={{ fontSize: "6.5px", color: "#888" }}>DATA</div>
          </div>
        </div>
      </div>

      <div style={{
        position: "absolute",
        bottom: "10px",
        left: "28px",
        right: "28px",
        borderTop: "1px solid #ccc",
        paddingTop: "4px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        <div style={{ flex: 1, fontSize: "5.5px", color: "#aaa", lineHeight: "1.4" }}>
          DOCUMENTO ASSINADO DIGITALMENTE - DR CAIO HENRIQUE PADUA - CRM-SP 125475<br />
          DATA DE EMISSAO  08 DE ABRIL DE 2026<br />
          VERIFICAR EM HTTPS://VALIDAR.ITI.GOV.BR | HTTPS://PRESCRICAO.SUPPORTCLINIC.COM.BR
        </div>
        <div style={{
          width: "32px",
          height: "32px",
          background: "#f0f0f0",
          border: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "4.5px",
          color: "#bbb",
          marginLeft: "6px",
          flexShrink: 0,
        }}>
          QR CODE
        </div>
      </div>
    </div>
  );
}
