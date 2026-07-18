/**
 * REC-06 · RECEITUÁRIO MAGISTRAL — FÓRMULA MANIPULADA + SEÇÃO FARMÁCIA
 * Magistral = fórmula de manipulação personalizada (não industrializada)
 * RDC 67 = Resolução da Diretoria Colegiada ANVISA para farmácias magistrais
 * ANVISA = Agência Nacional de Vigilância Sanitária
 * CRM = Conselho Regional de Medicina
 */
export default function ReceitaVarianteF() {
  const N = "#0F2940";
  const AU = "#C7A646";
  const VD = "#9DB8A5"; // verde salvia PENUMBRA

  const formulas = [
    {
      num: 1,
      nome: "FÓRMULA NEUROPROTETORA",
      cor: "Azul",
      ativos: [
        { a: "Fosfatidilserina", d: "200 mg" },
        { a: "Alpha-GPC (L-alfa glicerilfosforilcolina)", d: "300 mg" },
        { a: "Acetil-L-Carnitina", d: "500 mg" },
        { a: "Hericium erinaceus (extrato)", d: "300 mg" },
        { a: "Vitamina B12 (metilcobalamina)", d: "1.000 mcg" },
      ],
      pos: "Tomar 1 cápsula pela manhã, durante 60 dias.",
      qt: "60 cápsulas · Embalagem frasco âmbar",
      farm: "Farmácia Modelo — CNPJ 00.000.000/0001-00",
    },
    {
      num: 2,
      nome: "FÓRMULA METABÓLICA HORMONAL",
      cor: "Verde",
      ativos: [
        { a: "Berberina HCl", d: "500 mg" },
        { a: "Inositol (D-chiro)", d: "600 mg" },
        { a: "Ácido alfa-lipoico", d: "200 mg" },
      ],
      pos: "Tomar 1 cápsula com almoço e 1 cápsula com jantar, durante 90 dias.",
      qt: "180 cápsulas · Embalagem frasco âmbar",
      farm: "Farmácia Modelo — CNPJ 00.000.000/0001-00",
    },
  ];

  const corBadge: Record<string, string> = {
    Azul: "#2563EB", Verde: "#16A34A", Vermelho: "#DC2626",
    Amarelo: "#CA8A04", Roxo: "#7C3AED", Laranja: "#EA580C",
  };

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", padding: 32, fontFamily: "'JetBrains Mono', 'Courier New', monospace", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>REC-06 · Receituário Magistral · RDC 67 ANVISA</div>
        <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>Fórmulas Manipuladas Personalizadas · Cor interna = desmembramento de receita</div>
      </div>

      {/* FOLHA A4 */}
      <div style={{ width: 595, minHeight: 842, background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", position: "relative" }}>

        {/* FAIXA ANVISA MAGISTRAL */}
        <div style={{ background: VD, height: 8 }} />
        <div style={{ background: "#F2EEDF", borderBottom: "1px solid #D4C9A0", padding: "5px 24px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#7A6A30", letterSpacing: 2 }}>RECEITUÁRIO MAGISTRAL — RDC 67</div>
          <div style={{ fontSize: 8, color: "#888" }}>FARMÁCIA DE MANIPULAÇÃO</div>
        </div>

        {/* HEADER */}
        <div style={{ background: N, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "white", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>INSTITUTO PÁDUA</div>
            <div style={{ color: "#8BA3C7", fontSize: 7.5, marginTop: 4, lineHeight: 1.8 }}>
              PADUCCIA CLÍNICA MÉDICA LTDA — EPP<br />
              CNPJ 63.865.940/0001-63<br />
              RUA GUAXUPÉ, 327 — VILA FORMOSA — SÃO PAULO — SP
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: AU, fontSize: 18, fontWeight: 800, letterSpacing: 3, fontFamily: "serif" }}>PAWARDS</div>
            <div style={{ color: "#8BA3C7", fontSize: 7, marginTop: 2 }}>Sistema de Gestão em Saúde</div>
          </div>
        </div>

        {/* PACIENTE */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #e8e8e8", display: "flex", gap: 16 }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, marginBottom: 5, textTransform: "uppercase" }}>Paciente</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: N }}>MARIA APARECIDA SANTOS FERREIRA</div>
            <div style={{ fontSize: 8, color: "#555", marginTop: 4, lineHeight: 1.8 }}>
              CPF 234.567.890-12 · DATA DE NASC. 19/03/1978 · IDADE 48 ANOS<br />
              RUA DAS PALMEIRAS, 1.247 — VILA MADALENA, SÃO PAULO — SP
            </div>
          </div>
          <div style={{ flex: 1, borderLeft: "1px solid #e8e8e8", paddingLeft: 16 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, marginBottom: 5, textTransform: "uppercase" }}>Emissão</div>
            <div style={{ fontSize: 9, color: N, lineHeight: 1.9 }}>
              <span style={{ fontWeight: 700 }}>17/07/2026</span><br />
              VALIDADE 90 DIAS
            </div>
          </div>
        </div>

        {/* FÓRMULAS */}
        <div style={{ padding: "14px 24px" }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, borderBottom: "2px solid #e0e0e0", paddingBottom: 6, marginBottom: 14, textTransform: "uppercase" }}>
            PRESCRIÇÃO DE FÓRMULAS MAGISTRAIS
          </div>

          {formulas.map((f) => (
            <div key={f.num} style={{ marginBottom: 20, border: "1px solid #e8e8e8" }}>
              {/* Header da fórmula */}
              <div style={{ background: "#f5f7fa", padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #e8e8e8" }}>
                <div style={{ width: 22, height: 22, background: N, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>{f.num}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: N }}>{f.nome}</span>
                </div>
                <div style={{ background: corBadge[f.cor] + "22", border: `1px solid ${corBadge[f.cor]}66`, padding: "2px 8px" }}>
                  <span style={{ fontSize: 7, fontWeight: 700, color: corBadge[f.cor] }}>COR {f.cor.toUpperCase()}</span>
                </div>
              </div>

              {/* Ativos */}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Composição</div>
                {f.ativos.map((a, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ fontSize: 8.5, color: "#333" }}>{a.a}</span>
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: N, minWidth: 60, textAlign: "right" }}>{a.d}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 8, color: "#555" }}><b>Posologia:</b> {f.pos}</div>
                <div style={{ marginTop: 4, fontSize: 7.5, color: AU, fontStyle: "italic" }}>{f.qt}</div>
              </div>

              {/* Seção farmácia por fórmula */}
              <div style={{ background: "#f9f8f5", borderTop: "1px solid #e8e8e8", padding: "8px 12px" }}>
                <div style={{ fontSize: 7, color: "#aaa", fontWeight: 700, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>Farmácia de Destino</div>
                <div style={{ fontSize: 8, color: "#555" }}>{f.farm}</div>
              </div>
            </div>
          ))}

          {/* Observações boilerplate */}
          <div style={{ padding: "8px 12px", background: "#F2EEDF", borderLeft: "3px solid #C5A55A", marginTop: 4 }}>
            <div style={{ fontSize: 7.5, color: "#7A6A30", lineHeight: 1.7 }}>
              O paciente está ciente de que as formulações foram elaboradas exclusivamente para
              este tratamento com base em avaliação clínica e exames. Sua reprodução sem nova
              avaliação médica é vedada. (RDC ANVISA 67/2007)
            </div>
          </div>
        </div>

        {/* MÉDICO */}
        <div style={{ padding: "0 24px 16px", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 220, textAlign: "center" }}>
            <div style={{ borderTop: `2px solid ${N}`, paddingTop: 8, marginTop: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: N }}>DR. CAIO H. F. PÁDUA</div>
              <div style={{ fontSize: 8, color: "#666", marginTop: 2 }}>CRM-SP 123.456 · ENDOCRINOLOGISTA</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6 }}>
                <div style={{ background: `${AU}22`, border: `1px solid ${AU}`, padding: "2px 6px" }}>
                  <span style={{ fontSize: 7, color: AU, fontWeight: 700 }}>ICP-BRASIL ✓</span>
                </div>
              </div>
            </div>
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
