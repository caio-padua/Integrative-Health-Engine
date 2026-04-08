export default function ReceitaVarianteC() {
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
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRight: "none",
          }}>
            <div style={{ fontSize: "7px", fontWeight: "bold", color: "#555", letterSpacing: "2px", marginBottom: "6px", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
              PACIENTE
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold" }}>RICARDO CESAR</div>
            <div style={{ fontSize: "7.5px", color: "#444", marginTop: "4px", lineHeight: "1.8" }}>
              CPF  086.250.558-50  |  TELEFONE  (11) 96142-0654<br />
              ENDERECO  RUA ANHUMAS, VILA SAO JOAO BATISTA - 489, GUARULHOS, SP
            </div>
          </div>
          <div style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid #ccc",
          }}>
            <div style={{ fontSize: "7px", fontWeight: "bold", color: "#555", letterSpacing: "2px", marginBottom: "6px", borderBottom: "1px solid #e0e0e0", paddingBottom: "3px" }}>
              PROFISSIONAL
            </div>
            <div style={{ fontSize: "10px", fontWeight: "bold" }}>DR CAIO HENRIQUE PADUA</div>
            <div style={{ fontSize: "7.5px", color: "#444", marginTop: "4px", lineHeight: "1.8" }}>
              MEDICINA INTERNA  |  CRM-SP 125475<br />
              CPF 293.274.948-06
            </div>
          </div>
        </div>
      </div>

      <div style={{
        margin: "12px 28px 0",
        border: "2px solid #333",
        padding: "6px 0",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#111", letterSpacing: "4px" }}>
          RECEITUARIO DE CONTROLE ESPECIAL
        </div>
      </div>

      <div style={{
        margin: "8px 28px 0",
        fontSize: "6.5px",
        color: "#666",
        lineHeight: "1.5",
        borderLeft: "3px solid #999",
        paddingLeft: "10px",
      }}>
        O PACIENTE ESTA CIENTE DE QUE DEVERA SER CONSULTADO AO TERMINO DAS FORMULACOES DESCRITAS. AS FORMULACOES SAO PERSONALIZADAS E ELABORADAS EXCLUSIVAMENTE PARA O PRESENTE TRATAMENTO. REPRODUCAO NAO AUTORIZADA - RESOLUCAO CFM 1.974/2011 E RDC 67/2007 ANVISA. USO SEM ACOMPANHAMENTO MEDICO NAO E RECOMENDADO.
      </div>

      <div style={{ padding: "6px 28px 0" }}>
        <div style={{ display: "flex", gap: "0", border: "1px solid #ccc" }}>
          <div style={{ padding: "5px 10px", borderRight: "1px solid #ccc", fontSize: "8px" }}>
            <span style={{ fontWeight: "bold", color: "#111" }}>DURACAO</span>
            <div style={{ color: "#444" }}>30 DIAS</div>
          </div>
          <div style={{ padding: "5px 10px", flex: 1, fontSize: "8px" }}>
            <span style={{ fontWeight: "bold", color: "#111" }}>CID</span>
            <div style={{ color: "#444" }}>N484 + E291 + F90 + F41.2 + E14 + E66.0</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "8px 28px 0" }}>
        {[
          {
            formula: "ZINCO BISGLICINATO 30MG | SELENIO BISGLICINATO 300MCG | BORO BISGLICINATO 1,5MG | TIROSINA 200MG",
            posologia: "1 DOSE VO - DURANTE O CAFE DA MANHA",
          },
          {
            formula: "BUPROPIONA 150MG | CAPSULAS XR LIBERACAO ENTERICA + MATRIZ LIBERACAO LENTA | EXCIPIENTES HPMC, ETHOCEL, CELULOSE MICROCRISTALINA",
            posologia: "1 DOSE VO - 2H ANTES DO ALMOCO (10H) | 1 DOSE VO - 2H ANTES DO JANTAR (18H)",
          },
          {
            formula: "NALTREXONE 7MG | BROMOPRIDA 1,5MG | FAMOTIDINA 5MG | CAPSULAS XR LIBERACAO ENTERICA",
            posologia: "1 DOSE VO - 2H ANTES DO ALMOCO (10H) | 1 DOSE VO - 2H ANTES DO JANTAR (18H)",
          },
          {
            formula: "L-THEANINA 50MG | PASSIFLORA 150MG | RHODIOLA 100MG | ESPINHEIRA-SANTA (MAYTENUS ILICIFOLIA) EXTRATO 100MG",
            posologia: "1 DOSE VO - 2H ANTES DO JANTAR (18H)",
          },
        ].map((item, i) => (
          <div key={i} style={{
            padding: "6px 0",
            borderBottom: "1px solid #eee",
            fontSize: "8px",
            lineHeight: "1.5",
          }}>
            <div style={{ color: "#222" }}>{item.formula}</div>
            <div style={{ color: "#777", marginTop: "2px", fontSize: "7px" }}>{item.posologia}</div>
          </div>
        ))}
      </div>

      <div style={{
        position: "absolute",
        bottom: "148px",
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
        bottom: "58px",
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
