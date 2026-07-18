/**
 * REC-05 · RECEITUÁRIO CONTROLADO — FAIXA AZUL ANVISA (B1 / B2)
 * B1 = psicotrópico (diazepam, clonazepam, etc.)
 * B2 = anorexígeno (femproporex, anfepramona, etc.)
 * ANVISA = Agência Nacional de Vigilância Sanitária
 * SNCR = Sistema Nacional de Controle de Receituário
 * CRM = Conselho Regional de Medicina
 * ICP-Brasil = Infraestrutura de Chaves Públicas Brasileira (assinatura digital legal)
 */
export default function ReceitaVarianteE() {
  const N = "#0F2940";   // navy profundo PENUMBRA
  const AU = "#C7A646";  // dourado PENUMBRA
  const AZ = "#2563EB";  // azul ANVISA B1/B2

  const meds = [
    { num: 1, nome: "Clonazepam 0,5 mg — Comprimido", pos: "Tomar 1 comprimido à noite, durante 30 dias.", qt: "Emb. c/ 30 comprimidos" },
    { num: 2, nome: "Alprazolam 0,25 mg — Comprimido", pos: "Tomar 1 comprimido pela manhã, conforme necessidade (máx. 15 dias).", qt: "Emb. c/ 15 comprimidos" },
  ];

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", padding: 32, fontFamily: "'JetBrains Mono', 'Courier New', monospace", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>REC-05 · Receituário Azul Controlado (B1 / B2)</div>
        <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>ANVISA — Controle Especial · 2 vias obrigatórias</div>
      </div>

      {/* FOLHA A4 */}
      <div style={{ width: 595, minHeight: 842, background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", position: "relative", overflow: "hidden" }}>

        {/* FAIXA ANVISA AZUL — OBRIGATÓRIA (topo) */}
        <div style={{ background: AZ, height: 8 }} />

        {/* RÓTULO TIPO RECEITA */}
        <div style={{ background: "#EBF2FF", borderBottom: `1px solid ${AZ}`, padding: "6px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: AZ, letterSpacing: 2, textTransform: "uppercase" }}>
            RECEITUÁRIO AZUL B1 — PSICOTRÓPICO
          </div>
          <div style={{ fontSize: 8, color: "#555" }}>2 VIAS — RETER 1ª VIA NA FARMÁCIA</div>
        </div>

        {/* HEADER CLÍNICA */}
        <div style={{ background: N, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "white", fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>INSTITUTO PÁDUA</div>
            <div style={{ color: "#8BA3C7", fontSize: 7.5, marginTop: 4, lineHeight: 1.8 }}>
              PADUCCIA CLÍNICA MÉDICA LTDA — EPP<br />
              CNPJ 63.865.940/0001-63<br />
              RUA GUAXUPÉ, 327 — VILA FORMOSA, SÃO PAULO — SP — CEP 03186-040<br />
              TELEFONE (11) 97715-4000
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: AU, fontSize: 18, fontWeight: 800, letterSpacing: 3, fontFamily: "serif" }}>PAWARDS</div>
            <div style={{ color: "#8BA3C7", fontSize: 7, marginTop: 2 }}>Sistema de Gestão em Saúde</div>
            <div style={{ marginTop: 8, background: `${AZ}33`, border: `1px solid ${AZ}77`, padding: "3px 8px" }}>
              <div style={{ color: AZ, fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>CONTROLE ESPECIAL</div>
            </div>
          </div>
        </div>

        {/* DADOS PACIENTE */}
        <div style={{ padding: "12px 24px 0", borderBottom: `1px solid #e0e0e0` }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 2, borderRight: "1px solid #e0e0e0", paddingRight: 12, paddingBottom: 12 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#888", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>PACIENTE</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: N }}>RICARDO CÉSAR DE OLIVEIRA</div>
              <div style={{ fontSize: 8, color: "#555", marginTop: 6, lineHeight: 1.9 }}>
                CPF 086.250.558-50<br />
                DATA DE NASC. 14/03/1982 · IDADE 44 ANOS<br />
                ENDEREÇO RUA ANHUMAS, 489 — GUARULHOS, SP<br />
                TELEFONE (11) 96142-0654
              </div>
            </div>
            <div style={{ flex: 1, paddingBottom: 12 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#888", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>EMISSÃO</div>
              <div style={{ fontSize: 9, color: N, lineHeight: 1.9 }}>
                <span style={{ fontWeight: 700 }}>17/07/2026</span><br />
                VALIDADE 30 DIAS<br />
                SNCR {" "}
                <span style={{ background: "#EBF2FF", color: AZ, padding: "1px 4px", fontWeight: 700, fontSize: 8 }}>
                  B1-2026-07-0047
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PRESCRIÇÃO */}
        <div style={{ padding: "16px 24px" }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: "#888", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase", borderBottom: `2px solid ${AZ}`, paddingBottom: 6 }}>
            PRESCRIÇÃO MÉDICA
          </div>

          {meds.map((m) => (
            <div key={m.num} style={{ display: "flex", marginBottom: 20, gap: 12 }}>
              <div style={{ width: 24, height: 24, background: AZ, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>{m.num}</span>
              </div>
              <div style={{ flex: 1, borderBottom: "1px solid #f0f0f0", paddingBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: N }}>{m.nome}</div>
                <div style={{ fontSize: 9, color: "#444", marginTop: 6, lineHeight: 1.7 }}>{m.pos}</div>
                <div style={{ fontSize: 8, color: AZ, marginTop: 4, fontStyle: "italic" }}>{m.qt}</div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8, padding: "10px 14px", background: "#EBF2FF", borderLeft: `3px solid ${AZ}` }}>
            <div style={{ fontSize: 8, color: AZ, fontWeight: 700, marginBottom: 4 }}>ORIENTAÇÃO ANVISA — RECEITUÁRIO B1</div>
            <div style={{ fontSize: 7.5, color: "#555", lineHeight: 1.7 }}>
              Esta receita tem validade de 30 dias a partir da emissão. A dispensação exige retenção
              da 1ª via pela farmácia. Receita não pode ser aviada em quantidade superior à prescrita.
              Proibida a venda fracionada de psicotrópicos (RDC 471/2021 — ANVISA).
            </div>
          </div>
        </div>

        {/* DADOS MÉDICO + ASSINATURA */}
        <div style={{ padding: "0 24px 16px", marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: 220, textAlign: "center" }}>
              <div style={{ borderTop: `2px solid ${N}`, paddingTop: 8, marginTop: 40 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: N }}>DR. CAIO H. F. PÁDUA</div>
                <div style={{ fontSize: 8, color: "#666", marginTop: 2 }}>CRM-SP 123.456 · ENDOCRINOLOGISTA</div>
                <div style={{ fontSize: 7, color: "#888", marginTop: 2 }}>RQE 54.321</div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "center", gap: 6 }}>
                  <div style={{ background: "#EBF2FF", border: `1px solid ${AZ}`, padding: "2px 6px" }}>
                    <span style={{ fontSize: 7, color: AZ, fontWeight: 700 }}>ICP-BRASIL</span>
                  </div>
                  <div style={{ background: `${AU}22`, border: `1px solid ${AU}`, padding: "2px 6px" }}>
                    <span style={{ fontSize: 7, color: AU, fontWeight: 700 }}>ASSINADO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO FARMÁCIA */}
        <div style={{ margin: "0 24px 16px", border: `1px solid #e0e0e0`, background: "#fafafa" }}>
          <div style={{ background: N, padding: "4px 10px" }}>
            <div style={{ color: "#8BA3C7", fontSize: 7, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>PARA PREENCHIMENTO DA FARMÁCIA — RETER ESTA VIA</div>
          </div>
          <div style={{ padding: "10px", display: "flex", gap: 20 }}>
            {["CARIMBO E ASSINATURA DO FARMACÊUTICO", "DATA DO AVIAMENTO", "Nº REGISTRO FARMÁCIA"].map((l) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontSize: 7, color: "#888", marginBottom: 4 }}>{l}</div>
                <div style={{ height: 28, borderBottom: "1px solid #ccc" }} />
              </div>
            ))}
          </div>
        </div>

        {/* RODAPÉ */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: N, padding: "6px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#8BA3C7", fontSize: 7 }}>INSTITUTO PÁDUA · Medicina Integrativa</div>
          <div style={{ color: AU, fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>PAWARDS® · PADCON®</div>
        </div>
      </div>
    </div>
  );
}
