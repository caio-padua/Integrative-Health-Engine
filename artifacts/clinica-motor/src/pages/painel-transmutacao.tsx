import { useEffect } from "react";

type Linha = { antes: string; depois: string; nome: string; leitura?: string };
type Bloco = { titulo: string; cor: string; total: number; regra: string; linhas: Linha[] };

const PALETA = {
  petroleo: "#1F4E5F",
  offwhite: "#FAF7F2",
  dourado: "#B8924E",
  salvia: "#7A8C7E",
  carvao: "#2A2A2A",
  borda: "#E5DFD5",
};

const BLOCOS: Bloco[] = [
  {
    titulo: "01 · IMPLANTES (Pellets) — SEQ codifica a dose",
    cor: PALETA.petroleo,
    total: 32,
    regra: "Antes seq=0001 fixo + dose em campo separado · Depois seq=dose real (mg)",
    linhas: [
      { antes: "IMPL HORM SUBC ANAS 0001 (5 mg)", depois: "IMPL HORM SUBC ANAS 0005", nome: "Anastrozol Pellet 5 mg" },
      { antes: "IMPL HORM SUBC ANAS 0001 (10 mg)", depois: "IMPL HORM SUBC ANAS 0010", nome: "Anastrozol Pellet 10 mg" },
      { antes: "IMPL HORM SUBC ESTR 0001 (12,5 mg)", depois: "IMPL HORM SUBC ESTR 0125", nome: "Estradiol Pellet 12,5 mg", leitura: "vírgula eliminada · 12,5 → 0125" },
      { antes: "IMPL HORM SUBC ESTR 0001 (25 mg)", depois: "IMPL HORM SUBC ESTR 0025", nome: "Estradiol Pellet 25 mg" },
      { antes: "IMPL HORM SUBC ESTR 0001 (75 mg)", depois: "IMPL HORM SUBC ESTR 0075", nome: "Estriol Pellet 75 mg" },
      { antes: "IMPL HORM SUBC TEST 0001 (75/150/200)", depois: "TEST 0075 / 0150 / 0200", nome: "Testosterona Pellet" },
      { antes: "IMPL HORM SUBC PROG 0001 (50/100/200)", depois: "PROG 0050 / 0100 / 0200", nome: "Progesterona Pellet" },
      { antes: "IMPL HORM SUBC HIDR 0001 (50/100/200)", depois: "HIDR 0050 / 0100 / 0200", nome: "Hidrocortisona Pellet" },
      { antes: "IMPL HORM SUBC TADA 0001 (25/50/200)", depois: "TADA 0025 / 0050 / 0200", nome: "Tadalafil Pellet" },
      { antes: "IMPL HORM SUBC GEST 0001 (25/35/50)", depois: "GEST 0025 / 0035 / 0050", nome: "Gestrinona Pellet" },
      { antes: "IMPL HORM SUBC HCGX 0001 (5000)", depois: "IMPL HORM SUBC HCGX 5000", nome: "HCG Pellet 5000 UI", leitura: "seq elástica · grandeza preservada" },
      { antes: "IMPL HORM SUBC HCGX 0001 (10000)", depois: "IMPL HORM SUBC HCGX 10000", nome: "HCG Pellet 10000 UI", leitura: "seq de 5 dígitos · regra elástica" },
      { antes: "IMPL HORM SUBC SITA 0001 (combo 150+50)", depois: "IMPL HORM SUBC SITA 0150", nome: "Metformina+Sitagliptina Pellet", leitura: "dose da substância principal · combo" },
      { antes: "IMPL HORM SUBC T3T4 0001 (VARIAVEL)", depois: "IMPL HORM SUBC T3T4 0000", nome: "T3+T4 Pellet (paciente-dependente)", leitura: "seq 0000 = marcador especial" },
      { antes: "IMPL HORM SUBC MET1 0001 (200)", depois: "IMPL HORM SUBC METF 0200", nome: "Metformina Pellet 200 mg", leitura: "MET1 → METF (alfa puro)" },
      { antes: "+ 17 outros pellets análogos", depois: "BUPR/DHEA/MELA/NADH/NALT/PREG → seq=dose", nome: "—" },
    ],
  },
  {
    titulo: "02 · DOENÇAS — dedup de duplicatas com mesmo código",
    cor: PALETA.salvia,
    total: 10,
    regra: "Mantém o nome canônico (mais completo) · 49 → 39 únicas",
    linhas: [
      { antes: "DOEN GINE MENO 001 0001 ×2", depois: "DOEN GINE MENO 001 0001", nome: "Menopausa / Climatério (canônico)" },
      { antes: "DOEN GINE SOPC 001 0001 ×2", depois: "DOEN GINE SOPC 001 0001", nome: "Síndrome do Ovário Policístico (canônico)" },
      { antes: "DOEN TIRE HASH 001 0001 ×2", depois: "DOEN TIRE HASH 001 0001", nome: "Tireoidite de Hashimoto (canônico)" },
      { antes: "DOEN TIRE HIPO/HYPE 001 0001 ×2", depois: "—", nome: "Hipotireoidismo + Hipertireoidismo (dedup)" },
      { antes: "DOEN PSIQ ANSI/DEPR 001 0001 ×2", depois: "—", nome: "Ansiedade + Depressão (dedup)" },
      { antes: "DOEN NEUR TDAH 001 0001 ×2", depois: "—", nome: "TDAH (dedup)" },
      { antes: "DOEN ANDR HIPO 001 0001 ×2", depois: "—", nome: "Hipogonadismo Masculino (dedup)" },
      { antes: "DOEN META DIAB 001 0001 ×2", depois: "—", nome: "Diabetes Tipo 2 (dedup)" },
    ],
  },
  {
    titulo: "03 · EXAMES IMAGEM — incorporação anatômica + lateralidade na SEQ",
    cor: PALETA.dourado,
    total: 27,
    regra: "B3=região / B4=subsítio / SEQ=lateralidade (1=dir, 2=esq, 3=bilateral)",
    linhas: [
      { antes: "EXAM RESS SGRD MAG1 0001", depois: "EXAM RESS ARTI ARTC 0001/0002", nome: "RM Articulações (dir/esq)", leitura: "RESS-ARTIcular-ARTiCulação" },
      { antes: "EXAM RESS SGRD MAG2 0001", depois: "EXAM RESS COLU CERV 0001", nome: "RM Coluna Cervical" },
      { antes: "EXAM RESS SGRD MAG3 0001", depois: "EXAM RESS COLU LOMB 0001", nome: "RM Coluna Lombar" },
      { antes: "EXAM RESS SGRD MAG4 0001", depois: "EXAM RESS COLU TORA 0001", nome: "RM Coluna Torácica" },
      { antes: "EXAM RESS SGRD MAG5 0001", depois: "EXAM RESS CRAN ENCE 0001", nome: "RM Crânio (encéfalo)" },
      { antes: "EXAM RESS SGRD MAG6 0001", depois: "EXAM RESS JOEL ARTC 0001/0002", nome: "RM Joelho (dir/esq)", leitura: "lateralidade na SEQ" },
      { antes: "EXAM RESS SGRD MAG7 0001", depois: "EXAM RESS MAMA BILA 0003", nome: "RM Mamas (bilateral)" },
      { antes: "EXAM RESS SGRD MAG8 0001", depois: "EXAM RESS OMBR ARTC 0001/0002", nome: "RM Ombro (dir/esq)" },
      { antes: "EXAM RESS SGRD MAG9 0001", depois: "EXAM RESS PELV ESTR 0001", nome: "RM Pelve" },
      { antes: "EXAM RESS SGRD MAG10 0001", depois: "EXAM RESS CRAN SELA 0001", nome: "RM Sela Turca" },
      { antes: "EXAM TOMO SGRD DEA1/2/3 0001", depois: "EXAM TOMO ABDO TOTL/ISOL/PELV", nome: "TC Abdome (3 variantes)" },
      { antes: "EXAM TOMO SGRD DEC1/2 0001", depois: "EXAM TOMO COLU LOMB/TORA", nome: "TC Coluna (lombar/torácica)" },
      { antes: "EXAM TOMO SGRD DEP1 0001", depois: "EXAM TOMO PESC TOTL 0001", nome: "TC Pescoço" },
      { antes: "EXAM ULTR SGRD DEA1 0001", depois: "EXAM ULTR ABDO TOTL 0001", nome: "USG Abdome Total" },
      { antes: "EXAM ULTR SGRD DET1 0001", depois: "EXAM ULTR TIRE DOPP 0001", nome: "USG Tireoide com Doppler" },
      { antes: "EXAM ULTR SGRD COM1 0001", depois: "EXAM ULTR OBST TRNU 0001", nome: "USG Translucência Nucal" },
      { antes: "EXAM RAIO SGRD RAI1/2/3", depois: "EXAM RAIO ARTI/COLU/TORA", nome: "Raio-X (artic/coluna/tórax)" },
      { antes: "EXAM CIMG SGRD ECO1 0001", depois: "EXAM CIMG CARD ECTT 0001", nome: "Eco TransTorácico" },
      { antes: "EXAM MAMO SGRD MAM1 0001", depois: "EXAM MAMO MAMA TOMO 0001", nome: "Mamografia c/ Tomossíntese" },
    ],
  },
  {
    titulo: "04 · EXAMES LABORATORIAIS — fonética alfa pura",
    cor: PALETA.petroleo,
    total: 30,
    regra: "B4 vira código alfa que evoca o nome científico (lê-se em voz alta)",
    linhas: [
      { antes: "EXAM ADRE GSOF 17OH 0001", depois: "EXAM ADRE GSOF OHPG 0001", nome: "17-OH Progesterona", leitura: "OH-ProGesterona" },
      { antes: "EXAM TIRE GBAS T3LV 0001", depois: "EXAM TIRE GBAS TRLV 0001", nome: "T3 Livre", leitura: "TRês LiVre" },
      { antes: "EXAM TIRE GINT T3RV 0001", depois: "EXAM TIRE GINT TRRV 0001", nome: "T3 Reverso" },
      { antes: "EXAM TIRE GBAS T4LV 0001", depois: "EXAM TIRE GBAS TQLV 0001", nome: "T4 Livre", leitura: "T-Quatro LiVre" },
      { antes: "EXAM BINT GBAS HBA1 0001", depois: "EXAM BINT GBAS HGLI 0001", nome: "Hemoglobina Glicada", leitura: "HemoGLIcada" },
      { antes: "EXAM BINT GBAS VB12 0001", depois: "EXAM BINT GBAS VBDZ 0001", nome: "Vitamina B12", leitura: "Vit-B-DoZe" },
      { antes: "EXAM AUTO GINT C3XX 0001", depois: "EXAM AUTO GINT COTR 0001", nome: "Complemento C3", leitura: "COmplemento TRês" },
      { antes: "EXAM AUTO GINT C4XX 0001", depois: "EXAM AUTO GINT COQU 0001", nome: "Complemento C4", leitura: "COmplemento QUatro" },
      { antes: "EXAM AUTO GSOF ANT1 0001", depois: "EXAM AUTO GSOF ARNP 0001", nome: "Anti RNP" },
      { antes: "EXAM AUTO GSOF ANT2 0001", depois: "EXAM AUTO GSOF ASCL 0001", nome: "Anti SCL-70" },
      { antes: "EXAM AUTO GSOF ANTI 0001", depois: "EXAM AUTO GSOF AJOX 0001", nome: "Anti JO-1" },
      { antes: "EXAM TROM GINT B2GG / B2GM", depois: "EXAM TROM GINT BGLI 0001/0002", nome: "Beta-2-Glicoproteína (IgG/IgM)", leitura: "SEQ codifica isotipo" },
      { antes: "EXAM TROM GAMP AT3X 0001", depois: "EXAM TROM GAMP ATTR 0001", nome: "Antitrombina III" },
      { antes: "EXAM TROM GAMP PRO1 0001", depois: "EXAM TROM GAMP PROS 0001", nome: "Proteína S Livre" },
      { antes: "EXAM ONCO GBAS C125 0001", depois: "EXAM ONCO GBAS CAXX 0125", nome: "CA 125", leitura: "SEQ = nº antígeno" },
      { antes: "EXAM ONCO GINT C153/C199/C724", depois: "EXAM ONCO GINT CAXX 0153/0199/0724", nome: "CA 15.3 / 19.9 / 72.4" },
      { antes: "EXAM ONCO GSOF HE4X 0001", depois: "EXAM ONCO GSOF CAXX 0004", nome: "HE4" },
      { antes: "EXAM HEPA GBAS FIB4 0001", depois: "EXAM HEPA GBAS FIBR 0004", nome: "FIB-4" },
      { antes: "EXAM HEPA GSOF CK18 0001", depois: "EXAM HEPA GSOF CITK 0018", nome: "CK 18 (Citoqueratina)" },
      { antes: "EXAM CARD GINT OMG3 0001", depois: "EXAM CARD GINT OMGT 0003", nome: "Índice Ômega-3" },
      { antes: "EXAM SALA GBAS COR1/2/3", depois: "EXAM SALA CORT TARD/MANH/MADR", nome: "Cortisol Salivar (turno)", leitura: "B4 = turno do dia" },
      { antes: "EXAM DSTX GBAS HIV1 0001", depois: "EXAM DSTX GBAS HIVX 0001", nome: "HIV 1 e 2" },
      { antes: "EXAM DSTX GINT HER1 0001", depois: "EXAM DSTX GINT HERP 0002", nome: "Herpes I/II IgM", leitura: "SEQ = isotipo" },
      { antes: "EXAM DSTX GINT FTA1 0001", depois: "EXAM DSTX GINT FTAB 0002", nome: "FTA-Abs IgM" },
    ],
  },
  {
    titulo: "05 · GENÉTICA FARMACOGENÔMICA — fonética CYP",
    cor: PALETA.dourado,
    total: 8,
    regra: "Padrão CY+letra+letra fonética da variante",
    linhas: [
      { antes: "EXAM FARM GBAS C2D6 0001", depois: "EXAM FARM GBAS CYDS 0001", nome: "CYP2D6", leitura: "CY-DoiS-seis" },
      { antes: "EXAM FARM GINT C3A4 0001", depois: "EXAM FARM GINT CYAQ 0001", nome: "CYP3A4", leitura: "CY-AQuatro" },
      { antes: "EXAM FARM GBAS C219 0001", depois: "EXAM FARM GBAS CYCD 0001", nome: "CYP2C19", leitura: "CY-C-Dezenove" },
      { antes: "EXAM FARM GBAS CYP2 0001", depois: "EXAM FARM GBAS CYCN 0001", nome: "CYP2C9", leitura: "CY-C-Nove" },
      { antes: "EXAM FARM GINT CYP3 0001", depois: "EXAM FARM GINT CYAC 0001", nome: "CYP3A5", leitura: "CY-A-Cinco" },
      { antes: "EXAM FARM GSOF OPR1 0001", depois: "EXAM FARM GSOF OPRM 0001", nome: "OPRM1 (receptor opioide μ)" },
      { antes: "EXAM FARM GSOF UGT1 0001", depois: "EXAM FARM GSOF UGTA 0001", nome: "UGT1A1" },
      { antes: "EXAM GENE GBAS MTH1 0001", depois: "EXAM GENE GBAS MTHF 0677", nome: "MTHFR C677T", leitura: "SEQ codifica variante alélica" },
    ],
  },
  {
    titulo: "06 · INJETÁVEIS (musculares + endovenosos) — limpeza alfa",
    cor: PALETA.salvia,
    total: 24,
    regra: "B2 já diferencia ENDO/MUSC · B4 unificado · SEQ continua codificando dose",
    linhas: [
      { antes: "INJE ENDO SUPR 5HTP 0020", depois: "INJE ENDO SUPR HTRP 0020", nome: "5-HTP (Hidroxitriptofano)", leitura: "Hidroxi-TRiPtofano" },
      { antes: "INJE ENDO SUPR ACI1 0010", depois: "INJE ENDO SUPR ACHA 0010", nome: "Ácido Hialurônico" },
      { antes: "INJE ENDO SUPR ADE1 1300", depois: "INJE ENDO SUPR ADEK 1300", nome: "Blend Vit A-D-E-K" },
      { antes: "INJE ENDO SUPR AZU1 0100", depois: "INJE ENDO SUPR AZUL 0100", nome: "Azul de Metileno (endo)" },
      { antes: "INJE MUSC SUPR AZU2 0040", depois: "INJE MUSC SUPR AZUL 0040", nome: "Azul de Metileno (musc)", leitura: "B2 já diferencia ENDO/MUSC" },
      { antes: "INJE ENDO SUPR BET1 0500", depois: "INJE ENDO SUPR BETA 0500", nome: "Beta-Alanina" },
      { antes: "INJE ENDO SUPR CIT1/CIT2", depois: "INJE * SUPR CITR", nome: "Citrus Red blend" },
      { antes: "INJE MUSC SUPR COQ0 0100", depois: "INJE MUSC SUPR COQT 0100", nome: "Coenzima Q10", leitura: "CO-Q-Ten" },
      { antes: "INJE ENDO SUPR EDT1/EDT2", depois: "INJE ENDO SUPR EDTA 1500/0750", nome: "EDTA (SEQ diferencia dose)" },
      { antes: "INJE ENDO SUPR FAT1/FAT2/FAT3", depois: "INJE ENDO SUPR FATA/FATB/FATC", nome: "Blends Fatores Crescimento" },
      { antes: "INJE ENDO SUPR POO1..POO9", depois: "POOL OSTE/MITO/VITC/MINE/CALM/DREN/PILL/DESI/BLEN", nome: "Pools renomeados por eixo clínico", leitura: "B4 = nome do eixo (osteo/mito/...)" },
    ],
  },
  {
    titulo: "07 · CAMADA JURÍDICA (RACJ) — extensão da gramática",
    cor: PALETA.petroleo,
    total: 0,
    regra: "Novos cadernos RACJ seguem padrão H+sigla (Histórico/Hub) detectado no V5",
    linhas: [
      { antes: "(novo)", depois: "RACJ HCAD", nome: "Cadastro do paciente" },
      { antes: "(novo)", depois: "RACJ HCON", nome: "Termo de Consentimento" },
      { antes: "(novo)", depois: "RACJ HLGP", nome: "Política LGPD" },
      { antes: "(novo)", depois: "RACJ HCNT", nome: "Contrato de Atendimento" },
      { antes: "(novo)", depois: "RACJ HFIN", nome: "Financeiro / Recibos" },
    ],
  },
];

export default function PainelTransmutacao() {
  useEffect(() => { document.title = "PAWARDS · Painel de Transmutação Semântica"; }, []);
  const totalGeral = BLOCOS.reduce((s, b) => s + b.total, 0);

  return (
    <div style={{ background: PALETA.offwhite, minHeight: "100vh", color: PALETA.carvao, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <header style={{ background: PALETA.petroleo, color: PALETA.offwhite, padding: "32px 48px", borderBottom: `4px solid ${PALETA.dourado}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 13, letterSpacing: 4, color: PALETA.dourado, marginBottom: 6 }}>INSTITUTO PÁDUA · PAWARDS V16</div>
            <h1 style={{ fontSize: 36, margin: 0, fontWeight: 400 }}>Painel de Transmutação Semântica</h1>
            <div style={{ marginTop: 8, fontStyle: "italic", color: "#cdd9dd" }}>
              Reorganização da gramática do código semântico — 4 blocos alfa + 1 bloco numérico
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 64, fontWeight: 300, lineHeight: 1, color: PALETA.dourado }}>{totalGeral}</div>
            <div style={{ fontSize: 13, letterSpacing: 2, marginTop: 4 }}>TRANSMUTAÇÕES MAPEADAS</div>
          </div>
        </div>
      </header>

      <div style={{ padding: "24px 48px", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, background: "#fff", borderBottom: `1px solid ${PALETA.borda}` }}>
        {[
          { l: "Exames", v: 246 },
          { l: "Injetáveis", v: 305 },
          { l: "Endovenosos", v: 63 },
          { l: "Implantes", v: 32 },
          { l: "Fórmulas", v: 54 },
          { l: "Doenças", v: 49 },
        ].map((s) => (
          <div key={s.l} style={{ borderLeft: `3px solid ${PALETA.dourado}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: PALETA.salvia }}>{s.l.toUpperCase()}</div>
            <div style={{ fontSize: 28, color: PALETA.petroleo, fontWeight: 500 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "#999" }}>registros na base</div>
          </div>
        ))}
      </div>

      <main style={{ padding: "32px 48px", display: "flex", flexDirection: "column", gap: 28 }}>
        {BLOCOS.map((b, i) => (
          <section key={i} style={{ background: "#fff", border: `1px solid ${PALETA.borda}`, borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ background: b.cor, color: "#fff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, letterSpacing: 0.3 }}>{b.titulo}</h2>
              <div style={{ fontSize: 12, opacity: 0.85, background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 3 }}>{b.total} itens</div>
            </div>
            <div style={{ padding: "10px 20px", background: "#FBF6EE", fontSize: 12, color: PALETA.salvia, borderBottom: `1px solid ${PALETA.borda}`, fontStyle: "italic" }}>
              regra · {b.regra}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontFamily: "'Courier New', monospace" }}>
              <thead>
                <tr style={{ background: "#F5F0E5", color: PALETA.petroleo }}>
                  <th style={th}>ANTES</th>
                  <th style={th}>→</th>
                  <th style={th}>DEPOIS</th>
                  <th style={th}>NOME / LEITURA</th>
                </tr>
              </thead>
              <tbody>
                {b.linhas.map((l, j) => (
                  <tr key={j} style={{ borderTop: `1px solid ${PALETA.borda}` }}>
                    <td style={{ ...td, color: "#a04848" }}>{l.antes}</td>
                    <td style={{ ...td, color: PALETA.dourado, textAlign: "center", width: 24 }}>→</td>
                    <td style={{ ...td, color: PALETA.petroleo, fontWeight: 600 }}>{l.depois}</td>
                    <td style={{ ...td, fontFamily: "Georgia, serif" }}>
                      <div>{l.nome}</div>
                      {l.leitura && <div style={{ fontSize: 11, color: PALETA.salvia, fontStyle: "italic", marginTop: 2 }}>↳ {l.leitura}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <footer style={{ textAlign: "center", padding: 24, color: PALETA.salvia, fontSize: 11, letterSpacing: 2, borderTop: `1px solid ${PALETA.borda}`, marginTop: 16 }}>
          PAWARDS V16 · Pawards Tech · Dr. Caio Henrique Fernandes Pádua · Instituto Pádua / Paduccia
        </footer>
      </main>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", fontSize: 11, letterSpacing: 1.5, fontWeight: 600 };
const td: React.CSSProperties = { padding: "8px 14px", verticalAlign: "top" };
