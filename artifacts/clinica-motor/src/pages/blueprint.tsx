import { Layout } from "@/components/Layout";

const PALETA = {
  petroleo: "#1F4E5F",
  offwhite: "#FAF7F2",
  dourado: "#B8924E",
  carvao: "#2A2A2A",
  borda: "#E5DFD5",
  vermelho: "#B23A3A",
  azulClaro: "#5BA8C9",
  azulEscuro: "#1B3A5C",
  cinza: "#6B7280",
};

type ModoAgenda = "LOCAL" | "REMOTO" | "PESSOAL";

const MODO: Record<ModoAgenda, { label: string; cor: string; desc: string }> = {
  LOCAL:   { label: "LOCAL",   cor: PALETA.azulClaro,  desc: "presencial dentro da clínica" },
  REMOTO:  { label: "REMOTO",  cor: PALETA.azulEscuro, desc: "tudo fora da clínica: online, home office, visita domiciliar" },
  PESSOAL: { label: "PESSOAL", cor: PALETA.cinza,      desc: "compromissos do dono (não atende paciente)" },
};

type Agenda = { papel: string; pessoa: string; modo: ModoAgenda };

type Empresa = {
  // Principal
  fantasia: string;
  razaoSocial: string;
  cnpj: string;
  dono: string;
  // Secundário
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  certificadoDigital: string;
  certificadoSenha: string;
  // Meta
  fonteDados: "REAL" | "FICTÍCIO";
  novo?: boolean;
  agendas: Agenda[];
};

function moldePadrao(dono: string): Agenda[] {
  const u = dono.toUpperCase();
  return [
    { papel: `AGENDA MÉDICO — ${u}`,         pessoa: dono, modo: "LOCAL" },
    { papel: `AGENDA MÉDICO — ${u}`,         pessoa: dono, modo: "REMOTO" },
    { papel: `AGENDA PESSOAL — ${u}`,        pessoa: dono, modo: "PESSOAL" },
    { papel: "AGENDA MÉDICO — ASSISTENTE 01", pessoa: "(a definir)", modo: "LOCAL" },
    { papel: "AGENDA MÉDICO — ASSISTENTE 01", pessoa: "(a definir)", modo: "REMOTO" },
    { papel: "AGENDA ENFERMAGEM",             pessoa: "(a definir)", modo: "LOCAL" },
    { papel: "AGENDA ENFERMAGEM",             pessoa: "(a definir)", modo: "REMOTO" },
  ];
}

const CLINICAS: Empresa[] = [
  {
    fantasia: "INSTITUTO PADUA",
    razaoSocial: "PADUCCIA CLINICA MEDICA LTDA",
    cnpj: "63.865.940/0001-63",
    dono: "Caio Pádua",
    inscricaoEstadual: "(a confirmar)",
    inscricaoMunicipal: "156980767114",
    endereco: "Rua Guaxupé, 327",
    bairro: "Vila Formosa",
    cidade: "São Paulo",
    uf: "SP",
    cep: "(a confirmar)",
    certificadoDigital: "(arquivo .pfx a anexar)",
    certificadoSenha: "(a definir)",
    fonteDados: "REAL",
    agendas: moldePadrao("Caio Pádua"),
  },
  {
    fantasia: "INSTITUTO LEMOS",
    razaoSocial: "LEMOS CENTRO MEDICO INTEGRADO LTDA",
    cnpj: "32.247.755/0002-62",
    dono: "Kleber Clara Lemos",
    inscricaoEstadual: "Isento",
    inscricaoMunicipal: "6.136.257-2",
    endereco: "Rua João Augusto Morais, 112",
    bairro: "São Miguel",
    cidade: "São Paulo",
    uf: "SP",
    cep: "08010-150",
    certificadoDigital: "(arquivo .pfx a anexar)",
    certificadoSenha: "(a definir)",
    fonteDados: "REAL",
    agendas: moldePadrao("Kleber Clara Lemos"),
  },
  {
    fantasia: "INSTITUTO BARROS",
    razaoSocial: "BARROS CLINICA INTEGRATIVA LTDA",
    cnpj: "23.456.789/0001-01",
    dono: "Aline Barros",
    inscricaoEstadual: "(a confirmar)",
    inscricaoMunicipal: "(a confirmar)",
    endereco: "Rua das Acácias, 88",
    bairro: "Centro",
    cidade: "São Paulo",
    uf: "SP",
    cep: "(a confirmar)",
    certificadoDigital: "(arquivo .pfx a anexar)",
    certificadoSenha: "(a definir)",
    fonteDados: "FICTÍCIO",
    agendas: moldePadrao("Aline Barros"),
  },
  {
    fantasia: "INSTITUTO ANDRADE",
    razaoSocial: "ANDRADE CLINICA MEDICA LTDA",
    cnpj: "34.567.890/0001-12",
    dono: "Ademir Andrade",
    inscricaoEstadual: "(a confirmar)",
    inscricaoMunicipal: "(a confirmar)",
    endereco: "Rua Minas Gerais, 245",
    bairro: "Savassi",
    cidade: "Belo Horizonte",
    uf: "MG",
    cep: "(a confirmar)",
    certificadoDigital: "(arquivo .pfx a anexar)",
    certificadoSenha: "(a definir)",
    fonteDados: "FICTÍCIO",
    novo: true,
    agendas: moldePadrao("Ademir Andrade"),
  },
  {
    fantasia: "INSTITUTO BARAKAT",
    razaoSocial: "BARAKAT CLINICA MEDICA LTDA",
    cnpj: "45.678.901/0001-23",
    dono: "Mohamad Barakat",
    inscricaoEstadual: "(a confirmar)",
    inscricaoMunicipal: "(a confirmar)",
    endereco: "Rua Líbano, 1010",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    uf: "SP",
    cep: "(a confirmar)",
    certificadoDigital: "(arquivo .pfx a anexar)",
    certificadoSenha: "(a definir)",
    fonteDados: "FICTÍCIO",
    novo: true,
    agendas: moldePadrao("Mohamad Barakat"),
  },
  {
    fantasia: "INSTITUTO GENESIS",
    razaoSocial: "GENESIS CLINICA MEDICA LTDA",
    cnpj: "56.789.012/0001-34",
    dono: "Abraão Genesis (analogia) · Operador real: Caio Pádua",
    inscricaoEstadual: "(a confirmar)",
    inscricaoMunicipal: "(a confirmar)",
    endereco: "Rua da Origem, 1",
    bairro: "Genesis",
    cidade: "São Paulo",
    uf: "SP",
    cep: "(a confirmar)",
    certificadoDigital: "(arquivo .pfx a anexar)",
    certificadoSenha: "(a definir)",
    fonteDados: "FICTÍCIO",
    agendas: moldePadrao("Caio Pádua (Genesis)"),
  },
];

export default function Blueprint() {
  return (
    <Layout>
      <div style={{ background: PALETA.offwhite, minHeight: "100vh", padding: "32px 40px" }}>
        <div style={{ maxWidth: 1500, margin: "0 auto" }}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ color: PALETA.petroleo, fontSize: 30, fontWeight: 700, margin: 0 }}>
              🏛️ Blueprint Conceitual — Ficha Cadastral × Agendas
            </h1>
            <p style={{ color: PALETA.carvao, marginTop: 6, opacity: 0.75, fontSize: 14 }}>
              Proposta. <strong>Não toquei o DB.</strong> Pádua + Lemos = dados reais. Outras 4 = fictícias plausíveis.
            </p>
          </header>

          {/* CONCEITO TRAVADO */}
          <section style={{ background: "white", border: `2px solid ${PALETA.vermelho}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontWeight: 800, color: PALETA.vermelho, fontSize: 14, letterSpacing: 0.5 }}>
              ⚠️ CONCEITO TRAVADO — NÃO ERRAR MAIS
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 14 }}>
              <div style={{ borderLeft: `5px solid ${PALETA.petroleo}`, paddingLeft: 14 }}>
                <div style={{ fontWeight: 800, color: PALETA.petroleo, fontSize: 16 }}>
                  🏥 CLÍNICA = UNIDADE = EMPRESA = CNPJ
                </div>
                <div style={{ fontSize: 13, color: PALETA.carvao, marginTop: 6, lineHeight: 1.5 }}>
                  Pessoa jurídica com <strong>razão social, CNPJ, inscrições, endereço, certificado digital, dono</strong>.
                  <br/><strong>6 no total</strong> (4 já existem + 2 novas: Andrade e Barakat).
                </div>
              </div>

              <div style={{ borderLeft: `5px solid ${PALETA.dourado}`, paddingLeft: 14 }}>
                <div style={{ fontWeight: 800, color: PALETA.dourado, fontSize: 16 }}>
                  🗓️ AGENDA = AGENDAMENTO
                </div>
                <div style={{ fontSize: 13, color: PALETA.carvao, marginTop: 6, lineHeight: 1.5 }}>
                  Calendário de slots de horário. Pertence a <strong>um profissional + um modo</strong>.
                  <br/><strong>NÃO é unidade. NÃO é clínica. NÃO é CNPJ.</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
              {Object.entries(MODO).map(([k, m]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: m.cor, color: "white", padding: "3px 10px", borderRadius: 10, fontWeight: 700 }}>{m.label}</span>
                  <span style={{ color: "#666" }}>{m.desc}</span>
                </div>
              ))}
            </div>
          </section>

          <h2 style={{ color: PALETA.petroleo, fontSize: 22, marginBottom: 12 }}>
            🏥 6 Clínicas × 7 agendas cada = <strong>42 agendas totais</strong>
          </h2>

          {CLINICAS.map((c) => <EmpresaBlock key={c.cnpj} empresa={c} />)}

          <section style={{ background: PALETA.petroleo, color: "white", borderRadius: 12, padding: 22, marginTop: 24 }}>
            <h3 style={{ marginTop: 0, fontSize: 17 }}>✅ Estrutura cadastral consolidada:</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: PALETA.dourado, fontSize: 13, marginBottom: 8 }}>📌 PRINCIPAL</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                  <li>Nome Fantasia</li>
                  <li>Razão Social</li>
                  <li>CNPJ</li>
                  <li>Dono / Sócio-Administrador</li>
                </ul>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: PALETA.dourado, fontSize: 13, marginBottom: 8 }}>📎 SECUNDÁRIO</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                  <li>Inscrição Estadual</li>
                  <li>Inscrição Municipal</li>
                  <li>Endereço · Bairro · Cidade/UF · CEP</li>
                  <li>Certificado Digital (arquivo .pfx)</li>
                  <li>Senha do Certificado Digital</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function EmpresaBlock({ empresa }: { empresa: Empresa }) {
  return (
    <div style={{ background: "white", border: `2px solid ${PALETA.petroleo}`, borderRadius: 12, padding: 20, marginBottom: 16, position: "relative" }}>
      {empresa.novo && (
        <span style={{ position: "absolute", top: -10, right: 16, background: PALETA.dourado, color: "white", padding: "3px 12px", borderRadius: 10, fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
          NOVA CLÍNICA
        </span>
      )}

      <div style={{ borderBottom: `1px solid ${PALETA.borda}`, paddingBottom: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: PALETA.petroleo }}>
            🏥 {empresa.fantasia}
          </div>
          <span style={{
            background: empresa.fonteDados === "REAL" ? PALETA.azulEscuro : "#999",
            color: "white", padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
          }}>
            {empresa.fonteDados === "REAL" ? "📋 DADOS REAIS" : "📝 DADOS FICTÍCIOS"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 18 }}>

        {/* PRINCIPAL */}
        <div>
          <SecaoTitulo cor={PALETA.petroleo} icon="📌" label="PRINCIPAL" />
          <Linha label="Nome Fantasia" valor={empresa.fantasia} />
          <Linha label="Razão Social" valor={empresa.razaoSocial} />
          <Linha label="CNPJ" valor={empresa.cnpj} mono />
          <Linha label="Dono / Sócio" valor={empresa.dono} destaque />
        </div>

        {/* SECUNDÁRIO */}
        <div>
          <SecaoTitulo cor={PALETA.dourado} icon="📎" label="SECUNDÁRIO" />
          <Linha label="Insc. Estadual" valor={empresa.inscricaoEstadual} mono />
          <Linha label="Insc. Municipal" valor={empresa.inscricaoMunicipal} mono />
          <Linha label="Endereço" valor={empresa.endereco} />
          <Linha label="Bairro" valor={empresa.bairro} />
          <Linha label="Cidade / UF" valor={`${empresa.cidade} / ${empresa.uf}`} />
          <Linha label="CEP" valor={empresa.cep} mono />
          <Linha label="Certif. Digital" valor={empresa.certificadoDigital} pequeno />
          <Linha label="Senha Cert." valor={empresa.certificadoSenha} mono pequeno />
        </div>

        {/* AGENDAS */}
        <div>
          <SecaoTitulo cor={PALETA.azulEscuro} icon="🗓️" label="7 AGENDAS" />
          {empresa.agendas.map((a, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "5px 8px", borderRadius: 6, marginBottom: 3,
              background: i % 2 === 0 ? PALETA.offwhite : "transparent",
            }}>
              <div style={{ fontSize: 11, lineHeight: 1.3 }}>
                <span style={{ color: "#888", fontWeight: 600 }}>{i + 1}.</span>{" "}
                <strong style={{ color: PALETA.carvao }}>{a.papel}</strong>
              </div>
              <span style={{ background: MODO[a.modo].cor, color: "white", padding: "2px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700, marginLeft: 6 }}>
                {MODO[a.modo].label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecaoTitulo({ cor, icon, label }: { cor: string; icon: string; label: string }) {
  return (
    <div style={{ fontWeight: 700, color: cor, fontSize: 12, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.6, borderBottom: `2px solid ${cor}`, paddingBottom: 4 }}>
      {icon} {label}
    </div>
  );
}

function Linha({ label, valor, mono, destaque, pequeno }: { label: string; valor: string; mono?: boolean; destaque?: boolean; pequeno?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 6, padding: "4px 0", borderBottom: "1px dotted #EEE" }}>
      <div style={{ fontSize: 10.5, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
        {label}
      </div>
      <div style={{
        fontSize: pequeno ? 11 : 12.5,
        color: destaque ? PALETA.petroleo : PALETA.carvao,
        fontWeight: destaque ? 700 : 500,
        fontFamily: mono ? "monospace" : "inherit",
        wordBreak: "break-word",
      }}>
        {valor}
      </div>
    </div>
  );
}
