import { Layout } from "@/components/Layout";

const PALETA = {
  petroleo: "#1F4E5F",
  offwhite: "#FAF7F2",
  dourado: "#B8924E",
  carvao: "#2A2A2A",
  borda: "#E5DFD5",
  agua: "#0E7C9B",
  laranja: "#D87B3F",
  verde: "#2E8B57",
  vermelho: "#B23A3A",
};

type ModoAgenda = "LOCAL" | "REMOTO" | "PESSOAL";

const MODO: Record<ModoAgenda, { label: string; cor: string; desc: string }> = {
  LOCAL: { label: "LOCAL", cor: PALETA.verde, desc: "atendimento presencial dentro da clínica" },
  REMOTO: { label: "REMOTO", cor: PALETA.laranja, desc: "atendimento online (telemedicina / home)" },
  PESSOAL: { label: "PESSOAL", cor: PALETA.agua, desc: "compromissos pessoais do dono (não atende paciente)" },
};

type Agenda = { papel: string; pessoa: string; modo: ModoAgenda };

type Clinica = {
  nome: string;
  dono: string;
  novo?: boolean;
  agendas: Agenda[];
};

function moldePadrao(dono: string): Agenda[] {
  return [
    { papel: "MÉDICO DONO", pessoa: dono, modo: "LOCAL" },
    { papel: "MÉDICO DONO", pessoa: dono, modo: "REMOTO" },
    { papel: "AGENDA PESSOAL", pessoa: dono, modo: "PESSOAL" },
    { papel: "MÉDICO ASSISTENTE 01", pessoa: "(a definir)", modo: "LOCAL" },
    { papel: "MÉDICO ASSISTENTE 01", pessoa: "(a definir)", modo: "REMOTO" },
    { papel: "ENFERMAGEM", pessoa: "(a definir)", modo: "LOCAL" },
    { papel: "ENFERMAGEM", pessoa: "(a definir)", modo: "REMOTO" },
  ];
}

const CLINICAS: Clinica[] = [
  { nome: "Instituto Pádua", dono: "Caio Pádua", agendas: moldePadrao("Caio Pádua") },
  { nome: "Instituto Lemos", dono: "Kleber Lemos", agendas: moldePadrao("Kleber Lemos") },
  { nome: "Instituto Barros", dono: "Aline Barros", agendas: moldePadrao("Aline Barros") },
  { nome: "Instituto Andrade", dono: "Ademir Andrade", novo: true, agendas: moldePadrao("Ademir Andrade") },
  { nome: "Instituto Barakat", dono: "Mohamad Barakat", novo: true, agendas: moldePadrao("Mohamad Barakat") },
  { nome: "Instituto Genesis", dono: "Abraão Genesis", agendas: moldePadrao("Abraão Genesis") },
];

export default function Blueprint() {
  return (
    <Layout>
      <div style={{ background: PALETA.offwhite, minHeight: "100vh", padding: "32px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ color: PALETA.petroleo, fontSize: 30, fontWeight: 700, margin: 0 }}>
              🏛️ Blueprint Conceitual — Clínicas × Agendas
            </h1>
            <p style={{ color: PALETA.carvao, marginTop: 6, opacity: 0.75, fontSize: 14 }}>
              Proposta. <strong>Não toquei o DB.</strong> Você valida e eu executo de uma vez.
            </p>
          </header>

          {/* CONCEITO TRAVADO */}
          <section style={{
            background: "white", border: `2px solid ${PALETA.vermelho}`, borderRadius: 12,
            padding: 20, marginBottom: 24,
          }}>
            <div style={{ fontWeight: 800, color: PALETA.vermelho, fontSize: 14, letterSpacing: 0.5 }}>
              ⚠️ CONCEITO TRAVADO — NÃO ERRAR MAIS
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 14 }}>
              <div style={{ borderLeft: `5px solid ${PALETA.petroleo}`, paddingLeft: 14 }}>
                <div style={{ fontWeight: 800, color: PALETA.petroleo, fontSize: 16 }}>
                  🏥 CLÍNICA = UNIDADE = EMPRESA = CNPJ
                </div>
                <div style={{ fontSize: 13, color: PALETA.carvao, marginTop: 6, lineHeight: 1.5 }}>
                  É a <strong>instituição física com CNPJ próprio</strong>. Tem dono, endereço, razão social.
                  <br/>São <strong>6 no total</strong> (4 já existem + 2 novas: Andrade e Barakat).
                </div>
              </div>

              <div style={{ borderLeft: `5px solid ${PALETA.dourado}`, paddingLeft: 14 }}>
                <div style={{ fontWeight: 800, color: PALETA.dourado, fontSize: 16 }}>
                  🗓️ AGENDA = AGENDAMENTO
                </div>
                <div style={{ fontSize: 13, color: PALETA.carvao, marginTop: 6, lineHeight: 1.5 }}>
                  É um <strong>calendário de slots de horário</strong> (igual Google Calendar).
                  Pertence a <strong>um profissional + um modo</strong> (LOCAL ou REMOTO).
                  <br/><strong>NÃO é unidade. NÃO é clínica. NÃO é CNPJ.</strong>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 16, padding: 12, background: "#FFF6F0",
              borderRadius: 8, fontSize: 13, color: PALETA.carvao,
            }}>
              <strong>Molde de 7 agendas por clínica</strong> (igual ao print do Google Calendar):
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, fontSize: 12 }}>
                <div>1. MÉDICO DONO — LOCAL</div>
                <div>2. MÉDICO DONO — REMOTO</div>
                <div>3. AGENDA PESSOAL — DONO</div>
                <div>4. MÉDICO ASSISTENTE 01 — LOCAL</div>
                <div>5. MÉDICO ASSISTENTE 01 — REMOTO</div>
                <div>6. ENFERMAGEM — LOCAL</div>
                <div>7. ENFERMAGEM — REMOTO</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 14, fontSize: 12 }}>
              {Object.entries(MODO).map(([k, m]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: m.cor, color: "white", padding: "3px 10px", borderRadius: 10, fontWeight: 700 }}>
                    {m.label}
                  </span>
                  <span style={{ color: "#666" }}>{m.desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 6 CLÍNICAS */}
          <h2 style={{ color: PALETA.petroleo, fontSize: 22, marginBottom: 12 }}>
            🏥 6 Clínicas × 7 agendas cada = <strong>42 agendas totais</strong>
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {CLINICAS.map((c) => <ClinicaBlock key={c.nome} clinica={c} />)}
          </div>

          {/* Validação */}
          <section style={{ background: PALETA.petroleo, color: "white", borderRadius: 12, padding: 22, marginTop: 24 }}>
            <h3 style={{ marginTop: 0, fontSize: 17 }}>✅ Pra cravar (responde sim/não/muda):</h3>
            <ul style={{ fontSize: 14, lineHeight: 1.9, margin: 0 }}>
              <li><strong>6 clínicas</strong> com esses 6 donos confere?</li>
              <li>Molde de <strong>7 agendas idêntico</strong> em TODAS (até no Genesis)?</li>
              <li>Modos <strong>LOCAL + REMOTO + PESSOAL</strong> bastam ou falta DOMICILIAR como 4º modo?</li>
              <li>"REMOTO" cobre tanto teleatendimento quanto enfermagem em home, ou separa?</li>
              <li>O dono médico sempre tem 3 agendas (LOCAL+REMOTO+PESSOAL)? Assistente e enfermagem só 2?</li>
              <li>Posso já criar Andrade (Ademir) e Barakat (Mohamad) como clínicas novas no DB?</li>
            </ul>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function ClinicaBlock({ clinica }: { clinica: Clinica }) {
  return (
    <div style={{
      background: "white", border: `2px solid ${PALETA.petroleo}`, borderRadius: 12,
      padding: 16, position: "relative",
    }}>
      {clinica.novo && (
        <span style={{
          position: "absolute", top: -10, right: 12,
          background: PALETA.dourado, color: "white", padding: "3px 10px",
          borderRadius: 10, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
        }}>
          NOVA
        </span>
      )}
      <div style={{ borderBottom: `1px solid ${PALETA.borda}`, paddingBottom: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: PALETA.petroleo }}>
          🏥 {clinica.nome}
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
          <strong>Dono:</strong> {clinica.dono} · <strong>{clinica.agendas.length}</strong> agendas
        </div>
      </div>

      {clinica.agendas.map((a, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 8px", borderRadius: 6, marginBottom: 4,
          background: i % 2 === 0 ? PALETA.offwhite : "transparent",
        }}>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: "#888", fontWeight: 600 }}>{i + 1}.</span>{" "}
            <strong style={{ color: PALETA.carvao }}>{a.papel}</strong>
            <span style={{ color: "#666" }}> — {a.pessoa}</span>
          </div>
          <span style={{
            background: MODO[a.modo].cor, color: "white",
            padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700,
          }}>
            {MODO[a.modo].label}
          </span>
        </div>
      ))}
    </div>
  );
}
