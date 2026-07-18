/**
 * CAP-01 · CAPA DE PROTOCOLO PREMIUM
 * Substâncias com gráfico de barras + seção farmácia + identidade PENUMBRA
 * RAS = Registro de Assistência Sistêmico
 * ICP-Brasil = Infraestrutura de Chaves Públicas Brasileira
 */
export default function CapaProtocoloA() {
  const N = "#0F2940";
  const NM = "#1F3A5F";
  const AU = "#C7A646";
  const PC = "#F4F7FB"; // pastel card

  const substancias = [
    { nome: "Fosfatidilserina",  cat: "Neuroproteção",  barra: 92 },
    { nome: "Alpha-GPC",         cat: "Cognição",       barra: 88 },
    { nome: "Berberina HCl",     cat: "Metabólico",     barra: 75 },
    { nome: "Semaglutida",       cat: "GLP-1",          barra: 68 },
    { nome: "Hericium erinaceus",cat: "Neuroproteção",  barra: 85 },
    { nome: "Vitamina D3",       cat: "Imuno/Hormonal", barra: 95 },
  ];

  const catCor: Record<string, string> = {
    "Neuroproteção": "#7C3AED",
    "Cognição":      "#2563EB",
    "Metabólico":    "#059669",
    "GLP-1":         "#EA580C",
    "Imuno/Hormonal": AU,
  };

  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh", padding: 32, fontFamily: "'JetBrains Mono', 'Courier New', monospace", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>CAP-01 · Capa Premium — Substâncias + Gráfico + Farmácia</div>
      </div>

      <div style={{ width: 595, minHeight: 842, background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.14)", position: "relative" }}>

        {/* FAIXA TOPO DOURADA */}
        <div style={{ background: AU, height: 5 }} />

        {/* HEADER CLÍNICA */}
        <div style={{ background: N, padding: "20px 28px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ color: "white", fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>INSTITUTO PÁDUA</div>
              <div style={{ color: "#8BA3C7", fontSize: 7.5, marginTop: 3 }}>PADUCCIA CLÍNICA MÉDICA LTDA — CNPJ 63.865.940/0001-63</div>
              <div style={{ color: "#8BA3C7", fontSize: 7.5 }}>RUA GUAXUPÉ, 327 — VILA FORMOSA — SÃO PAULO — SP</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: AU, fontSize: 20, fontWeight: 800, letterSpacing: 3, fontFamily: "serif" }}>PAWARDS</div>
              <div style={{ color: "#8BA3C7", fontSize: 7, marginTop: 2 }}>Sistema de Gestão em Saúde</div>
            </div>
          </div>

          {/* TÍTULO DO DOCUMENTO */}
          <div style={{ marginTop: 16, background: `${AU}22`, border: `1px solid ${AU}44`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: AU, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>PROTOCOLO TERAPÊUTICO INTEGRADO</div>
              <div style={{ color: "#8BA3C7", fontSize: 8, marginTop: 3 }}>RAS — Registro de Assistência Sistêmico · Documento Completo</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "white", fontSize: 10, fontWeight: 700 }}>Nº 2026-07-0047</div>
              <div style={{ color: "#8BA3C7", fontSize: 7.5, marginTop: 2 }}>17/07/2026</div>
            </div>
          </div>
        </div>

        {/* DADOS PACIENTE */}
        <div style={{ padding: "14px 28px", background: PC, borderBottom: "1px solid #dce4ef" }}>
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, marginBottom: 5, textTransform: "uppercase" }}>Paciente</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: N }}>MARIA APARECIDA SANTOS FERREIRA</div>
              <div style={{ fontSize: 8, color: "#555", marginTop: 4, lineHeight: 1.8 }}>
                CPF 234.567.890-12 · DATA NASC. 19/03/1978 · 48 ANOS<br />
                ENDEREÇO RUA DAS PALMEIRAS, 1.247 — VILA MADALENA — SP
              </div>
            </div>
            <div style={{ flex: 1, borderLeft: "1px solid #dce4ef", paddingLeft: 16 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, marginBottom: 5, textTransform: "uppercase" }}>Médico</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: N }}>DR. CAIO H. F. PÁDUA</div>
              <div style={{ fontSize: 7.5, color: "#666", marginTop: 3, lineHeight: 1.8 }}>
                CRM-SP 123.456<br />
                ENDOCRINOLOGISTA<br />
                RQE 54.321
              </div>
            </div>
          </div>
        </div>

        {/* GRÁFICO DE BARRAS — SUBSTÂNCIAS */}
        <div style={{ padding: "16px 28px" }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: "#aaa", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase", borderBottom: "1px solid #e8e8e8", paddingBottom: 6 }}>
            SUBSTÂNCIAS PRESCRITAS — PERFIL DE COBERTURA TERAPÊUTICA
          </div>

          {substancias.map((s, i) => {
            const cor = catCor[s.cat] ?? AU;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 10 }}>
                <div style={{ width: 130, fontSize: 8, color: N, fontWeight: 600, textAlign: "right", flexShrink: 0 }}>{s.nome}</div>
                <div style={{ flex: 1, background: "#f0f2f5", height: 16, position: "relative", overflow: "hidden" }}>
                  <div style={{ width: `${s.barra}%`, height: "100%", background: cor, display: "flex", alignItems: "center", paddingLeft: 6 }}>
                    <span style={{ fontSize: 7, color: "white", fontWeight: 700 }}>{s.barra}%</span>
                  </div>
                </div>
                <div style={{ width: 80, flexShrink: 0 }}>
                  <div style={{ background: cor + "22", border: `1px solid ${cor}55`, padding: "2px 6px", textAlign: "center" }}>
                    <span style={{ fontSize: 6.5, color: cor, fontWeight: 700 }}>{s.cat.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: 6, fontSize: 7, color: "#999", fontStyle: "italic" }}>
            * Percentual representa cobertura terapêutica estimada para os objetivos clínicos definidos.
          </div>
        </div>

        {/* RESUMO DO PROTOCOLO */}
        <div style={{ padding: "0 28px 14px" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "DURAÇÃO", valor: "90 DIAS" },
              { label: "FÓRMULAS", valor: "3" },
              { label: "RECEITAS", valor: "2" },
              { label: "RETORNO", valor: "90 DIAS" },
            ].map((c, i) => (
              <div key={i} style={{ flex: 1, background: PC, border: `1px solid #dce4ef`, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 7, color: "#aaa", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: N }}>{c.valor}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SEÇÃO FARMÁCIA */}
        <div style={{ margin: "0 28px 16px", border: "1px solid #dce4ef" }}>
          <div style={{ background: NM, padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#8BA3C7", fontSize: 7, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Farmácias de Dispensação</div>
            <div style={{ color: AU, fontSize: 7, fontWeight: 700 }}>VINCULADAS A ESTE PROTOCOLO</div>
          </div>
          <div style={{ padding: "10px 12px", background: "#fafbfd" }}>
            {[
              { nome: "FARMÁCIA MODELO — MANIPULAÇÃO", end: "Av. Paulista, 1.000 — Bela Vista, SP", tipo: "FÓRMULAS MAGISTRAIS" },
              { nome: "DROGARIA PARCEIRA", end: "Rua Augusta, 500 — Consolação, SP", tipo: "CONTROLADOS / INDUSTRIALIZADOS" },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i === 0 ? 8 : 0 }}>
                <div style={{ width: 6, height: 6, background: AU, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, color: N }}>{f.nome}</div>
                  <div style={{ fontSize: 7.5, color: "#666" }}>{f.end}</div>
                </div>
                <div style={{ background: `${AU}22`, border: `1px solid ${AU}55`, padding: "2px 6px" }}>
                  <span style={{ fontSize: 6.5, color: AU, fontWeight: 700 }}>{f.tipo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ASSINATURA + SELOS */}
        <div style={{ padding: "0 28px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 7.5, color: "#888", lineHeight: 1.8 }}>
            Protocolo gerado por PAWARDS® em 17/07/2026.<br />
            Documento com validade jurídica — ICP-Brasil.
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: `2px solid ${N}`, paddingTop: 6, width: 180 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: N }}>DR. CAIO H. F. PÁDUA</div>
              <div style={{ fontSize: 7.5, color: "#666" }}>CRM-SP 123.456</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 5 }}>
                <div style={{ background: `${AU}22`, border: `1px solid ${AU}`, padding: "2px 5px" }}>
                  <span style={{ fontSize: 6.5, color: AU, fontWeight: 700 }}>ICP-BRASIL</span>
                </div>
                <div style={{ background: "#e0efe8", border: "1px solid #9DB8A5", padding: "2px 5px" }}>
                  <span style={{ fontSize: 6.5, color: "#2D6A4F", fontWeight: 700 }}>ASSINADO</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: N, padding: "6px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#8BA3C7", fontSize: 7 }}>INSTITUTO PÁDUA · Medicina Integrativa e Longevidade</div>
          <div style={{ color: AU, fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>PAWARDS® · PADCON®</div>
        </div>
      </div>
    </div>
  );
}
