import { useEffect } from "react";

const C = {
  petroleo: "#1F4E5F",
  petroleoDark: "#163742",
  offwhite: "#FAF7F2",
  papel: "#FDFBF6",
  dourado: "#B8924E",
  douradoLight: "#D9B871",
  salvia: "#7A8C7E",
  salviaLight: "#A8B8AB",
  carvao: "#2A2A2A",
  borda: "#E5DFD5",
  bordaForte: "#C9BFA8",
  vermelhoSuave: "#A04848",
};

const lbl: React.CSSProperties = { fontSize: 9, letterSpacing: 1.5, color: C.salvia };
const val: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: C.petroleoDark, marginTop: 2 };
const folhaWrap: React.CSSProperties = {
  background: C.papel,
  border: `1px solid ${C.bordaForte}`,
  borderRadius: 4,
  boxShadow: "0 2px 12px rgba(31,78,95,0.08)",
  overflow: "hidden",
  marginBottom: 36,
};
const thS: React.CSSProperties = { padding: "9px 14px", textAlign: "left", fontSize: 10, letterSpacing: 1.2, fontWeight: 600 };
const tdS: React.CSSProperties = { padding: "8px 14px", verticalAlign: "top" };

const cabecalhoFolha = (titulo: string, codigo: string, sub: string) => (
  <div style={{
    background: C.petroleo, color: C.offwhite, padding: "18px 32px",
    borderBottom: `3px solid ${C.dourado}`,
    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
  }}>
    <div>
      <div style={{ fontSize: 10, letterSpacing: 3, color: C.douradoLight }}>INSTITUTO PÁDUA · PADUCCIA</div>
      <div style={{ fontSize: 22, fontWeight: 400, fontFamily: "Georgia,serif", marginTop: 2 }}>{titulo}</div>
      <div style={{ fontSize: 11, color: "#cdd9dd", fontStyle: "italic", marginTop: 2 }}>{sub}</div>
    </div>
    <div style={{ textAlign: "right", fontFamily: "'Courier New',monospace", fontSize: 11, color: C.douradoLight }}>
      <div>{codigo}</div>
      <div style={{ color: "#cdd9dd" }}>Dr. Caio Henrique Fernandes Pádua · CRM-MG 92.143</div>
    </div>
  </div>
);

const dadosPaciente = (
  <div style={{
    padding: "14px 32px", background: "#F5EFE0",
    borderBottom: `1px solid ${C.bordaForte}`,
    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16,
    fontSize: 12, color: C.carvao,
  }}>
    <div><span style={lbl}>PACIENTE</span><div style={val}>NATACHA CALDEIRÃO GOMES</div></div>
    <div><span style={lbl}>IDADE</span><div style={val}>47 anos · F</div></div>
    <div><span style={lbl}>PRONTUÁRIO</span><div style={val}>NCG-2024-0381</div></div>
    <div><span style={lbl}>EMISSÃO</span><div style={val}>18 / abr / 2026</div></div>
  </div>
);

export default function ProtocoloNatacha() {
  useEffect(() => { document.title = "PAWARDS · Protocolo Natacha (motor em operação)"; }, []);

  return (
    <div style={{ background: C.offwhite, minHeight: "100vh", color: C.carvao, fontFamily: "Georgia,serif", padding: "32px 5%" }}>
      {/* Selo "MOTOR EM OPERAÇÃO" */}
      <div style={{ maxWidth: 1180, margin: "0 auto 24px", padding: "16px 24px",
        background: C.petroleo, color: C.offwhite, borderRadius: 4,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderLeft: `5px solid ${C.dourado}` }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: C.douradoLight }}>PAWARDS V16 · MOTOR CLÍNICO EM OPERAÇÃO</div>
          <div style={{ fontSize: 19, fontWeight: 400, marginTop: 4 }}>Protocolo Integrativo · Natacha Caldeirão Gomes</div>
          <div style={{ fontSize: 12, color: "#cdd9dd", fontStyle: "italic", marginTop: 2 }}>5 documentos gerados a partir da anamnese estruturada PADCOM V15 · 1 transação atômica</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, fontFamily: "'Courier New',monospace", color: C.douradoLight }}>
          <div>PADCOM-2026-04-18-NCG-001</div>
          <div style={{ color: "#cdd9dd" }}>RAS-EVOLUTIVO V16</div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        {/* ═══════════ FOLHA 1 · RECEITA MÉDICA ═══════════ */}
        <div style={folhaWrap}>
          {cabecalhoFolha("Receita Médica · Protocolo Integrativo", "RACL · HMED · 0381", "11 itens · 3 fórmulas manipuladas (blends) · 8 substâncias isoladas")}
          {dadosPaciente}

          <SecaoTitulo numero="01" texto="FÓRMULAS MANIPULADAS (BLENDS)" cor={C.dourado} />
          <BlendCard
            codigo="FORM SONO REPA REPA 0001"
            nome="BLEND SONO REPARADOR PROFUNDO"
            via="Cápsulas · 1 dose 30 min antes de dormir"
            duracao="60 dias"
            componentes={[
              { sub: "Magnésio Glicinato",   dose: "300 mg" },
              { sub: "L-Triptofano",         dose: "500 mg" },
              { sub: "Melatonina",           dose: "3 mg" },
              { sub: "Ashwagandha (KSM-66)", dose: "300 mg" },
              { sub: "GABA",                 dose: "200 mg" },
              { sub: "Vitamina B6 (P5P)",    dose: "25 mg" },
            ]}
          />
          <BlendCard
            codigo="FORM ARTI ANTI ANTI 0001"
            nome="BLEND ARTICULAR ANTI-INFLAMATÓRIO"
            via="Cápsulas · 1 dose após o almoço"
            duracao="90 dias"
            componentes={[
              { sub: "Curcumina (95% curcuminoides)", dose: "500 mg" },
              { sub: "Boswellia Serrata (65% AKBA)",  dose: "400 mg" },
              { sub: "Colágeno Tipo II UC-II",        dose: "40 mg" },
              { sub: "Ômega-3 EPA/DHA concentrado",   dose: "1000 mg" },
              { sub: "Vitamina D3",                   dose: "5000 UI" },
              { sub: "MSM",                           dose: "500 mg" },
            ]}
          />
          <BlendCard
            codigo="FORM META INSU INSU 0001"
            nome="BLEND METABÓLICO INSULÍNICO"
            via="Cápsulas · 1 dose antes do café · 1 dose antes do jantar"
            duracao="90 dias"
            componentes={[
              { sub: "Berberina HCl",        dose: "500 mg" },
              { sub: "Inositol (Myo+D-Chiro 40:1)", dose: "2000 mg" },
              { sub: "Ácido Alfa-Lipóico",   dose: "300 mg" },
              { sub: "Cromo Picolinato",     dose: "400 mcg" },
              { sub: "Canela em Extrato",    dose: "250 mg" },
            ]}
          />

          <SecaoTitulo numero="02" texto="SUBSTÂNCIAS ISOLADAS · INDUSTRIALIZADAS" cor={C.salvia} />
          <TabelaSimples colunas={["Código", "Substância", "Dose", "Frequência", "Duração"]} linhas={[
            ["MEDI HORM TIRE LEVO 0050", "Levotiroxina sódica", "50 mcg", "1× ao dia · jejum",          "Uso contínuo"],
            ["SUPL VITA ISOL VITD 5000", "Vitamina D3 (colecalciferol)", "5.000 UI", "1× ao dia · com almoço", "120 dias"],
            ["SUPL VITA ISOL B12X 1000", "Vitamina B12 (metilcobalamina)", "1.000 mcg", "1× ao dia · sublingual", "90 dias"],
            ["SUPL MINE ISOL MAGN 0400", "Magnésio Bisglicinato", "400 mg", "1× ao dia · à noite",   "Contínuo"],
            ["SUPL MINE ISOL ZINC 0030", "Zinco Quelato", "30 mg",  "1× ao dia · com almoço", "60 dias"],
          ]} />

          <SecaoTitulo numero="03" texto="IMPLANTES SUBCUTÂNEOS (PELLETS)" cor={C.petroleo} />
          <TabelaSimples colunas={["Código", "Pellet", "Quantidade", "Inserção", "Próxima dose prevista"]} linhas={[
            ["IMPL HORM SUBC ESTR 0125", "Estradiol Pellet 12,5 mg",   "2 pellets",  "20/abr/2026", "20/out/2026"],
            ["IMPL HORM SUBC PROG 0100", "Progesterona Pellet 100 mg", "1 pellet",   "20/abr/2026", "20/out/2026"],
            ["IMPL HORM SUBC TEST 0075", "Testosterona Pellet 75 mg",  "1 pellet",   "20/abr/2026", "20/out/2026"],
          ]} />

          <Rodape texto="Esta receita compõe o RAS Evolutivo · página HMED · vide código de rastreio acima." />
        </div>

        {/* ═══════════ FOLHA 2 · PEDIDO DE EXAMES ═══════════ */}
        <div style={folhaWrap}>
          {cabecalhoFolha("Pedido de Exames Laboratoriais e de Imagem", "RACL · HEXA · 0381", "Avaliação multissistêmica · gerado pelo motor a partir do quadro clínico inicial")}
          {dadosPaciente}

          <SecaoTitulo numero="EIXO 1" texto="TIREOIDE COMPLETA" cor={C.petroleo} />
          <TabelaSimples colunas={["Código", "Exame", "Justificativa clínica"]} linhas={[
            ["EXAM TIRE GBAS TSHX 0001", "TSH Ultrassensível",          "Monitorar reposição de Levotiroxina"],
            ["EXAM TIRE GBAS TQLV 0001", "T4 Livre",                    "Avaliar conversão periférica"],
            ["EXAM TIRE GBAS TRLV 0001", "T3 Livre",                    "Investigar hipotireoidismo subclínico"],
            ["EXAM TIRE GINT TRRV 0001", "T3 Reverso",                  "Avaliar bloqueio metabólico"],
            ["EXAM AUTO GSOF ATPO 0001", "Anti-TPO",                    "Investigar Tireoidite de Hashimoto"],
            ["EXAM AUTO GSOF ATGB 0001", "Anti-Tireoglobulina",         "Confirmar autoimunidade tireoidiana"],
            ["EXAM ULTR TIRE DOPP 0001", "USG Tireoide com Doppler",    "Mapear nódulos e vascularização"],
          ]} />

          <SecaoTitulo numero="EIXO 2" texto="METABÓLICO E INSULÍNICO" cor={C.salvia} />
          <TabelaSimples colunas={["Código", "Exame", "Justificativa clínica"]} linhas={[
            ["EXAM BINT GBAS GLIC 0001", "Glicemia de Jejum",           "Triagem metabólica basal"],
            ["EXAM BINT GBAS HGLI 0001", "Hemoglobina Glicada (A1c)",   "Média glicêmica 90 dias"],
            ["EXAM BINT GBAS INSU 0001", "Insulina de Jejum",           "Calcular HOMA-IR"],
            ["EXAM BINT GINT TGCO 0001", "Teste Tolerância à Glicose",  "Curva glico-insulínica"],
            ["EXAM HEPA GBAS HEPA 0001", "Painel Hepático completo",    "Avaliar esteatose / NAFLD"],
            ["EXAM CARD GINT LIPC 0001", "Perfil Lipídico Avançado",    "Risco cardiovascular"],
          ]} />

          <SecaoTitulo numero="EIXO 3" texto="HORMONAL E REPRODUTIVO" cor={C.dourado} />
          <TabelaSimples colunas={["Código", "Exame", "Justificativa clínica"]} linhas={[
            ["EXAM ADRE GBAS ESTR 0001", "Estradiol",         "Baseline pré-implante"],
            ["EXAM ADRE GBAS PROG 0001", "Progesterona",      "Baseline pré-implante"],
            ["EXAM ADRE GBAS TTOT 0001", "Testosterona Total","Baseline pré-implante"],
            ["EXAM ADRE GBAS TLIV 0001", "Testosterona Livre","Avaliar SHBG / disponibilidade"],
            ["EXAM GONA GBAS FSHX 0001", "FSH",               "Status menopausa"],
            ["EXAM GONA GBAS LHXX 0001", "LH",                "Status menopausa"],
            ["EXAM SALA CORT MANH 0001", "Cortisol Salivar manhã",  "Curva eixo HPA"],
            ["EXAM SALA CORT TARD 0001", "Cortisol Salivar tarde",  "Curva eixo HPA"],
            ["EXAM SALA CORT MADR 0001", "Cortisol Salivar madrugada","Curva eixo HPA"],
          ]} />

          <SecaoTitulo numero="EIXO 4" texto="NUTRACÊUTICO E INFLAMATÓRIO" cor={C.petroleo} />
          <TabelaSimples colunas={["Código", "Exame", "Justificativa clínica"]} linhas={[
            ["EXAM VITA GBAS VBDZ 0001", "Vitamina B12",       "Suporte energético/neural"],
            ["EXAM VITA GBAS VITD 0001", "Vitamina D 25-OH",   "Imunidade / osso"],
            ["EXAM MINE GBAS MAGN 0001", "Magnésio Eritrocitário", "Status real intracelular"],
            ["EXAM MINE GBAS FERR 0001", "Ferritina",          "Estoque de ferro"],
            ["EXAM CARD GINT PCRX 0001", "PCR ultrassensível", "Inflamação sistêmica"],
            ["EXAM CARD GINT OMGT 0003", "Índice Ômega-3",     "Razão ω-6/ω-3"],
          ]} />

          <Rodape texto="Total: 28 exames distribuídos em 4 eixos diagnósticos · Resultados ingressam no RAS Evolutivo na página HEVO" />
        </div>

        {/* ═══════════ FOLHA 3 · RAS CLÍNICO (SÍNTESE) ═══════════ */}
        <div style={folhaWrap}>
          {cabecalhoFolha("RAS Evolutivo · Síntese Clínica", "RACL · HEST + HATU · 0381", "Estado inicial e estado-alvo terapêutico")}
          {dadosPaciente}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <ColunaEstado titulo="HEST · Estado Inicial" cor={C.vermelhoSuave} itens={[
              { rotulo: "Sono",           valor: "Fragmentado · 4h efetivas · 3+ despertares" },
              { rotulo: "Articulações",   valor: "Artralgia difusa · joelhos e mãos · EVA 7/10" },
              { rotulo: "Energia",        valor: "Fadiga matinal · pico vespertino baixo" },
              { rotulo: "Tireoide",       valor: "Hipotireoidismo subclínico (TSH 6,8)" },
              { rotulo: "Metabolismo",    valor: "Resistência insulínica (HOMA 3,4)" },
              { rotulo: "Hormonal",       valor: "Pré-menopausa · sintomas vasomotores" },
              { rotulo: "Inflamação",     valor: "PCR 4,8 · perfil pró-inflamatório" },
              { rotulo: "Humor",          valor: "Ansiedade leve a moderada (GAD-7 = 11)" },
            ]} />
            <ColunaEstado titulo="HATU · Estado Atual / Alvo" cor={C.salvia} itens={[
              { rotulo: "Sono",           valor: "Reparador · 7h efetivas · 0-1 despertar" },
              { rotulo: "Articulações",   valor: "Mobilidade plena · EVA ≤ 2/10" },
              { rotulo: "Energia",        valor: "Curva estável · sem queda vespertina" },
              { rotulo: "Tireoide",       valor: "TSH 1,5–2,5 · T3L em alvo" },
              { rotulo: "Metabolismo",    valor: "HOMA < 2 · A1c < 5,4" },
              { rotulo: "Hormonal",       valor: "Reposição com pellets · sintomas zerados" },
              { rotulo: "Inflamação",     valor: "PCR < 1,0 · ω-3 índice > 8%" },
              { rotulo: "Humor",          valor: "GAD-7 ≤ 4 · sono protetor" },
            ]} />
          </div>

          <SecaoTitulo numero="HTRN" texto="TRANSIÇÃO TERAPÊUTICA · MATRIZ" cor={C.dourado} />
          <TabelaSimples colunas={["Eixo", "Saída (retira)", "Entrada (introduz)", "Janela"]} linhas={[
            ["Sono",         "Zolpidem 10 mg (uso crônico)", "BLEND SONO REPARADOR + Melatonina 3 mg", "Desmame em 21 dias"],
            ["Dor articular","Ibuprofeno 600 mg SOS",        "BLEND ARTICULAR ANTI-INFLAMATÓRIO",      "Substituição imediata"],
            ["Glicemia",     "Apenas dieta",                  "BLEND METABÓLICO INSULÍNICO",            "Início D+0"],
            ["Tireoide",     "—",                             "Manter Levotiroxina · ajuste por TSH",   "Reavaliar 60d"],
            ["Hormonal",     "—",                             "Pellets E2 + P4 + T (subcutâneos)",      "D+2 · próximo 6 meses"],
          ]} />

          <Rodape texto="Síntese gerada pelo motor RASX-MATRIZ V6 a partir da anamnese PADCOM V15 + 28 exames laboratoriais" />
        </div>

        {/* ═══════════ FOLHA 4 · RAS JURÍDICO ═══════════ */}
        <div style={folhaWrap}>
          {cabecalhoFolha("Termo de Consentimento Informado", "RACJ · HCON · 0381", "Documento jurídico vinculado ao protocolo · LGPD compliant")}
          {dadosPaciente}

          <div style={{ padding: "20px 32px", fontSize: 13, lineHeight: 1.65, color: C.carvao }}>
            <p style={{ marginTop: 0 }}>
              Eu, <b>Natacha Caldeirão Gomes</b>, portadora do CPF 285.xxx.xxx-91, declaro estar
              ciente e de pleno acordo com o protocolo terapêutico integrativo proposto pelo
              <b> Dr. Caio Henrique Fernandes Pádua (CRM-MG 92.143)</b>, que compreende:
            </p>
            <ol style={{ paddingLeft: 24 }}>
              <li>Implante subcutâneo de pellets hormonais bioidênticos (Estradiol, Progesterona e Testosterona);</li>
              <li>Uso de fórmulas manipuladas em farmácia de manipulação parceira (3 blends descritos no item 01 da Receita);</li>
              <li>Reposição de micronutrientes e suplementação isolada conforme indicado;</li>
              <li>Realização dos 28 exames laboratoriais e de imagem solicitados, para reavaliação em 60 dias.</li>
            </ol>
            <p>
              Fui informada dos benefícios esperados, dos eventos adversos possíveis (reação local
              ao pellet, alterações de humor transitórias, sintomas androgênicos leves) e das
              alternativas terapêuticas convencionais. Tive oportunidade de fazer perguntas e
              recebi respostas claras.
            </p>
            <p>
              Autorizo o tratamento dos meus dados de saúde estritamente para fins assistenciais,
              nos termos da <b>Lei nº 13.709/2018 (LGPD)</b>, conforme a Política de Privacidade
              do Instituto Pádua (RACJ · HLGP).
            </p>
            <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <Assinatura nome="Natacha Caldeirão Gomes" papel="Paciente" />
              <Assinatura nome="Dr. Caio Henrique Fernandes Pádua" papel="CRM-MG 92.143" />
            </div>
          </div>

          <Rodape texto="Hash de integridade · sha256:a4f9…cc81 · Vinculado ao protocolo PADCOM-2026-04-18-NCG-001" />
        </div>

        {/* ═══════════ FOLHA 5 · RASTREABILIDADE ═══════════ */}
        <div style={folhaWrap}>
          {cabecalhoFolha("Rastreabilidade · Códigos Semânticos do Protocolo", "RACL · HRAS · 0381", "Tudo que entrou no banco numa única transação atômica")}

          <div style={{ padding: "20px 32px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, fontSize: 12 }}>
            <Stat n={11} l="Itens prescritos" />
            <Stat n={3}  l="Blends manipulados" />
            <Stat n={28} l="Exames solicitados" />
            <Stat n={5}  l="Documentos emitidos" />
            <Stat n={47} l="Códigos semânticos gerados" />
            <Stat n={1}  l="Transação atômica" />
            <Stat n={2}  l="Assinaturas digitais" />
            <Stat n={1}  l="Hash de integridade" />
          </div>

          <Rodape texto="Todos os documentos compartilham o mesmo identificador de protocolo · arquivo pronto para Drive Jurídico (RACJ HCAD)" />
        </div>

        <div style={{ textAlign: "center", padding: "16px 0 32px", color: C.salvia, fontSize: 11, letterSpacing: 2 }}>
          PAWARDS V16 · MOTOR CLÍNICO EM OPERAÇÃO · INSTITUTO PÁDUA / PADUCCIA
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════ COMPONENTES ═════════════════════ */

function SecaoTitulo({ numero, texto, cor }: { numero: string; texto: string; cor: string }) {
  return (
    <div style={{
      padding: "12px 32px", background: "#fff",
      borderTop: `1px solid ${C.borda}`, borderBottom: `1px solid ${C.borda}`,
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        background: cor, color: "#fff", padding: "4px 10px", fontSize: 10,
        letterSpacing: 2, fontFamily: "'Courier New',monospace", borderRadius: 2,
      }}>{numero}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: cor, letterSpacing: 1 }}>{texto}</div>
    </div>
  );
}

function BlendCard({ codigo, nome, via, duracao, componentes }: {
  codigo: string; nome: string; via: string; duracao: string;
  componentes: { sub: string; dose: string }[];
}) {
  return (
    <div style={{ margin: "16px 32px", border: `1px solid ${C.bordaForte}`, borderRadius: 4, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "10px 14px", background: "#FBF6EE", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.borda}` }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.petroleoDark }}>{nome}</div>
          <div style={{ fontFamily: "'Courier New',monospace", fontSize: 10.5, color: C.dourado, marginTop: 2 }}>{codigo}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: C.salvia }}>
          <div>{via}</div>
          <div style={{ fontStyle: "italic" }}>Duração: {duracao}</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#F5F0E5" }}>
            <th style={{ ...thS, width: "50%" }}>Substância</th>
            <th style={{ ...thS, width: "20%" }}>Dose por cápsula</th>
            <th style={{ ...thS, width: "30%" }}>Função no blend</th>
          </tr>
        </thead>
        <tbody>
          {componentes.map((c, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${C.borda}` }}>
              <td style={tdS}>{c.sub}</td>
              <td style={{ ...tdS, fontFamily: "'Courier New',monospace", color: C.petroleo }}>{c.dose}</td>
              <td style={{ ...tdS, color: C.salvia, fontStyle: "italic" }}>componente sinérgico</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaSimples({ colunas, linhas }: { colunas: string[]; linhas: (string | React.ReactNode)[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, margin: 0 }}>
      <thead>
        <tr style={{ background: "#F5F0E5", color: C.petroleo }}>
          {colunas.map((c, i) => <th key={i} style={thS}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha, i) => (
          <tr key={i} style={{ borderTop: `1px solid ${C.borda}` }}>
            {linha.map((cel, j) => (
              <td key={j} style={{
                ...tdS,
                fontFamily: j === 0 ? "'Courier New',monospace" : "Georgia,serif",
                color: j === 0 ? C.dourado : C.carvao,
                fontSize: j === 0 ? 11 : 12,
              }}>{cel}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ColunaEstado({ titulo, cor, itens }: { titulo: string; cor: string; itens: { rotulo: string; valor: string }[] }) {
  return (
    <div style={{ padding: "16px 24px", borderRight: `1px solid ${C.borda}` }}>
      <div style={{ color: cor, fontSize: 13, fontWeight: 600, letterSpacing: 1, marginBottom: 12, paddingBottom: 6, borderBottom: `2px solid ${cor}` }}>{titulo}</div>
      {itens.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 8, padding: "5px 0", fontSize: 12, borderBottom: `1px dashed ${C.borda}` }}>
          <div style={{ color: C.salvia, fontSize: 10.5, letterSpacing: 1 }}>{it.rotulo.toUpperCase()}</div>
          <div style={{ color: C.carvao }}>{it.valor}</div>
        </div>
      ))}
    </div>
  );
}

function Assinatura({ nome, papel }: { nome: string; papel: string }) {
  return (
    <div>
      <div style={{ borderBottom: `1px solid ${C.carvao}`, height: 36 }} />
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: C.petroleoDark }}>{nome}</div>
      <div style={{ fontSize: 11, color: C.salvia, fontStyle: "italic" }}>{papel}</div>
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div style={{ borderLeft: `3px solid ${C.dourado}`, paddingLeft: 12 }}>
      <div style={{ fontSize: 28, fontWeight: 500, color: C.petroleo, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 10, color: C.salvia, letterSpacing: 1.5, marginTop: 4 }}>{l.toUpperCase()}</div>
    </div>
  );
}

function Rodape({ texto }: { texto: string }) {
  return (
    <div style={{ padding: "12px 32px", background: C.petroleo, color: "#cdd9dd", fontSize: 10.5, fontStyle: "italic", letterSpacing: 0.4, borderTop: `2px solid ${C.dourado}` }}>
      {texto}
    </div>
  );
}

