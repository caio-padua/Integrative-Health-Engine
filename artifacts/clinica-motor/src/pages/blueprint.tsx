import { Layout } from "@/components/Layout";

const PALETA = {
  petroleo: "#1F4E5F",
  offwhite: "#FAF7F2",
  dourado: "#B8924E",
  carvao: "#2A2A2A",
  borda: "#E5DFD5",
  agua: "#0E7C9B",
  verde: "#2E8B57",
  azul: "#3B82C4",
  roxo: "#7B5EA7",
  amarelo: "#D4A017",
  laranja: "#D87B3F",
};

type ModoAtendimento = "LOCAL_PRESENCIAL" | "LOCAL_HOME" | "DOMICILIAR" | "REMOTO_INTERNACIONAL";
type TipoProfissional = "MEDICO" | "ENFERMEIRA";

type Agenda = {
  nome: string;
  tipo: TipoProfissional;
  modo: ModoAtendimento;
  obs?: string;
};

type Unidade = {
  id: number;
  nome: string;
  dono: string;
  agendas: Agenda[];
};

const MODO_INFO: Record<ModoAtendimento, { label: string; cor: string; icon: string; desc: string }> = {
  LOCAL_PRESENCIAL: { label: "LOCAL PRESENCIAL", cor: PALETA.verde, icon: "🟢", desc: "atende dentro da clínica" },
  LOCAL_HOME: { label: "HOME", cor: PALETA.amarelo, icon: "🟡", desc: "atende remoto a partir de casa (telemedicina)" },
  DOMICILIAR: { label: "DOMICILIAR", cor: PALETA.laranja, icon: "🟠", desc: "vai até a casa do paciente" },
  REMOTO_INTERNACIONAL: { label: "REMOTO ROMA", cor: PALETA.roxo, icon: "🟣", desc: "telemedicina internacional" },
};

const TIPO_INFO: Record<TipoProfissional, { label: string; icon: string; cor: string }> = {
  MEDICO: { label: "MÉDICO", icon: "👨‍⚕️", cor: PALETA.petroleo },
  ENFERMEIRA: { label: "ENFERMAGEM", icon: "👩‍⚕️", cor: PALETA.agua },
};

const PROPOSTA: Unidade[] = [
  {
    id: 9, nome: "Instituto Médico Lemos — São Miguel", dono: "Dr. Kleber Clara Lemos",
    agendas: [
      { nome: "Dr. Kleber Clara Lemos", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL", obs: "Dono fictício + atendimento" },
      { nome: "Médico 2 (a definir)", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL" },
      { nome: "Médico 3 (a definir)", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL" },
      { nome: "Médico 4 — Roma", tipo: "MEDICO", modo: "REMOTO_INTERNACIONAL", obs: "telemedicina internacional" },
      { nome: "Enfermeira 1 — Física", tipo: "ENFERMEIRA", modo: "LOCAL_PRESENCIAL", obs: "presencial na unidade" },
      { nome: "Enfermeira 2 — Home", tipo: "ENFERMEIRA", modo: "LOCAL_HOME", obs: "home office, atende remoto" },
      { nome: "Enfermeira 3 — Domiciliar", tipo: "ENFERMEIRA", modo: "DOMICILIAR", obs: "visita paciente em casa" },
    ],
  },
  {
    id: 10, nome: "Instituto Médico Barros", dono: "Dr. Sheila Barros",
    agendas: [
      { nome: "Dr. Sheila Barros", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL", obs: "Dona fictícia + atendimento" },
      { nome: "Médico 2 (a definir)", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL" },
      { nome: "Enfermeira Local", tipo: "ENFERMEIRA", modo: "LOCAL_PRESENCIAL" },
      { nome: "Enfermeira Domiciliar", tipo: "ENFERMEIRA", modo: "DOMICILIAR" },
    ],
  },
  {
    id: 8, nome: "Instituto Pádua — Vila Formosa", dono: "Caio Henrique Fernandes Pádua",
    agendas: [
      { nome: "Dr. Caio Pádua (Tatuapé)", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL", obs: "agenda atual id=2" },
      { nome: "Dr. Caio Souza (Higienópolis)", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL", obs: "agenda atual id=1" },
      { nome: "Dr. Caio Fernandes (Online)", tipo: "MEDICO", modo: "LOCAL_HOME", obs: "agenda atual id=6" },
      { nome: "Caio Pádua Pessoal", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL", obs: "agenda atual id=7" },
      { nome: "Enfermeira Bianca", tipo: "ENFERMEIRA", modo: "LOCAL_PRESENCIAL", obs: "agenda atual id=3" },
      { nome: "Enfermeira Domiciliar VF", tipo: "ENFERMEIRA", modo: "DOMICILIAR", obs: "agenda atual id=4" },
    ],
  },
  {
    id: 999, nome: "Instituto Pádua — Guaxupé (a criar)", dono: "Caio Henrique Fernandes Pádua",
    agendas: [
      { nome: "Médico Local Guaxupé", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL" },
      { nome: "Enfermeira Guaxupé", tipo: "ENFERMEIRA", modo: "LOCAL_PRESENCIAL", obs: "agenda atual id=5 migra pra cá" },
    ],
  },
  {
    id: 14, nome: "Instituto Genesis — Semente Perene", dono: "Caio Henrique Fernandes Pádua",
    agendas: [
      { nome: "Caio (Operador Master)", tipo: "MEDICO", modo: "LOCAL_PRESENCIAL", obs: "Genesis = base de replicação" },
    ],
  },
];

export default function Blueprint() {
  return (
    <Layout>
      <div style={{ background: PALETA.offwhite, minHeight: "100vh", padding: "32px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <header style={{ marginBottom: 32 }}>
            <h1 style={{ color: PALETA.petroleo, fontSize: 32, fontWeight: 700, margin: 0 }}>
              🏛️ Blueprint Conceitual — Unidade × Agenda × Profissional
            </h1>
            <p style={{ color: PALETA.carvao, marginTop: 8, opacity: 0.75, fontSize: 14 }}>
              Proposta de arquitetura. <strong>Não executei nada no DB ainda.</strong> Você corrige aqui antes.
            </p>
          </header>

          {/* Conceitos */}
          <section style={{ background: "white", border: `1px solid ${PALETA.borda}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h2 style={{ color: PALETA.petroleo, fontSize: 18, marginTop: 0 }}>📐 Conceitos</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 }}>
              <div style={{ borderLeft: `4px solid ${PALETA.petroleo}`, paddingLeft: 12 }}>
                <div style={{ fontWeight: 700, color: PALETA.petroleo, fontSize: 15 }}>🏥 UNIDADE</div>
                <div style={{ fontSize: 13, color: PALETA.carvao, marginTop: 4 }}>
                  Instituição física com CNPJ, endereço, dono fictício. <strong>4 hoje.</strong>
                </div>
              </div>

              <div style={{ borderLeft: `4px solid ${PALETA.dourado}`, paddingLeft: 12 }}>
                <div style={{ fontWeight: 700, color: PALETA.dourado, fontSize: 15 }}>🗓️ AGENDA</div>
                <div style={{ fontSize: 13, color: PALETA.carvao, marginTop: 4 }}>
                  Recurso de atendimento de <strong>UM profissional</strong>. Pertence a uma unidade. Tem um modo (local/home/domiciliar/roma).
                </div>
              </div>

              <div style={{ borderLeft: `4px solid ${PALETA.agua}`, paddingLeft: 12 }}>
                <div style={{ fontWeight: 700, color: PALETA.agua, fontSize: 15 }}>👤 PROFISSIONAL</div>
                <div style={{ fontSize: 13, color: PALETA.carvao, marginTop: 4 }}>
                  Pessoa (médico ou enfermeira). Pode ter agendas em mais de uma unidade.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: 14, background: PALETA.offwhite, borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Modos de atendimento (4 tipos):</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {Object.entries(MODO_INFO).map(([key, info]) => (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontWeight: 700, color: info.cor, fontSize: 12 }}>{info.icon} {info.label}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{info.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Árvore */}
          <h2 style={{ color: PALETA.petroleo, fontSize: 22, marginBottom: 16 }}>🌳 Hierarquia proposta</h2>

          {PROPOSTA.map((u) => (
            <UnidadeBlock key={u.id} unidade={u} />
          ))}

          {/* Mapeamento técnico */}
          <section style={{ background: "white", border: `1px solid ${PALETA.borda}`, borderRadius: 12, padding: 24, marginTop: 24 }}>
            <h2 style={{ color: PALETA.petroleo, fontSize: 18, marginTop: 0 }}>🔧 Mapeamento técnico (o que muda no DB)</h2>
            <ol style={{ color: PALETA.carvao, fontSize: 14, lineHeight: 1.8 }}>
              <li>Tabela <code style={code}>unidades</code> ganha <code style={code}>tipo='CLINICA'</code> nas 4 reais (8, 9, 10, 14) e ganha <strong>id=15 nova</strong> "Instituto Pádua Guaxupé"</li>
              <li>Nova tabela <code style={code}>agendas_profissionais</code> (FK pra <code style={code}>unidades.id</code> + FK pra <code style={code}>profissionais.id</code> + coluna <code style={code}>modo_atendimento</code>)</li>
              <li>Os 7 registros antigos de "agenda" em <code style={code}>unidades</code> (1,2,3,4,5,6,7) viram registros em <code style={code}>agendas_profissionais</code></li>
              <li>Mantém os 7 IDs antigos em <code style={code}>unidades</code> com <code style={code}>tipo='AGENDA_LEGADO'</code> pra não quebrar as 31 FKs apontando pra eles</li>
              <li>Painel <code style={code}>/inundacao</code> passa a mostrar só CLINICA (4 reais + Guaxupé = 5)</li>
              <li>Cria painel <code style={code}>/agendas</code> separado mostrando profissional + modo + unidade dona</li>
            </ol>
          </section>

          <section style={{ background: PALETA.petroleo, color: "white", borderRadius: 12, padding: 20, marginTop: 24 }}>
            <h3 style={{ marginTop: 0, fontSize: 16 }}>✅ Pra você cravar (corrija aqui antes de eu executar):</h3>
            <ul style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              <li>Os modos <strong>LOCAL · HOME · DOMICILIAR · REMOTO ROMA</strong> cobrem tudo? Falta algum?</li>
              <li>Lemos: confirma <strong>4 médicos + 3 enfermeiras</strong> (Kleber + 2 + Roma; Física + Home + Domiciliar)?</li>
              <li>Barros: confirma <strong>2 médicos + 2 enfermeiras</strong> (Sheila + 1; Local + Domiciliar)?</li>
              <li>Pádua VF: as 6 agendas atuais migram conforme o desenho acima?</li>
              <li>Guaxupé: <strong>vira unidade nova</strong> e a agenda enfermagem id=5 migra pra ela?</li>
              <li>Genesis: só você como operador master ou tem outras agendas?</li>
            </ul>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function UnidadeBlock({ unidade }: { unidade: Unidade }) {
  const medicos = unidade.agendas.filter((a) => a.tipo === "MEDICO");
  const enfermeiras = unidade.agendas.filter((a) => a.tipo === "ENFERMEIRA");

  return (
    <div style={{ background: "white", border: `2px solid ${PALETA.petroleo}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${PALETA.borda}` }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: PALETA.petroleo }}>🏥 {unidade.nome}</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
            <strong>Dono fictício:</strong> {unidade.dono} · <strong>id:</strong> {unidade.id === 999 ? "(a criar)" : unidade.id}
          </div>
        </div>
        <div style={{ background: PALETA.dourado, color: "white", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
          {unidade.agendas.length} AGENDAS
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: PALETA.petroleo, marginBottom: 8 }}>
            👨‍⚕️ MÉDICOS ({medicos.length})
          </div>
          {medicos.map((m, i) => <AgendaCard key={i} agenda={m} />)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: PALETA.agua, marginBottom: 8 }}>
            👩‍⚕️ ENFERMAGEM ({enfermeiras.length})
          </div>
          {enfermeiras.map((e, i) => <AgendaCard key={i} agenda={e} />)}
        </div>
      </div>
    </div>
  );
}

function AgendaCard({ agenda }: { agenda: Agenda }) {
  const m = MODO_INFO[agenda.modo];
  return (
    <div style={{
      background: PALETA.offwhite, borderLeft: `4px solid ${m.cor}`, padding: "10px 12px",
      marginBottom: 8, borderRadius: 6, display: "flex", flexDirection: "column", gap: 2,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, color: PALETA.carvao, fontSize: 14 }}>{agenda.nome}</div>
        <span style={{ background: m.cor, color: "white", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
          {m.icon} {m.label}
        </span>
      </div>
      {agenda.obs && <div style={{ fontSize: 11, color: "#888", fontStyle: "italic" }}>{agenda.obs}</div>}
    </div>
  );
}

const code: React.CSSProperties = {
  background: "#F3EFE7", padding: "1px 6px", borderRadius: 4, fontSize: 12, fontFamily: "monospace",
};
