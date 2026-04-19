import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";

const PALETA = {
  petroleo: "#1F4E5F",
  offwhite: "#FAF7F2",
  dourado: "#B8924E",
  carvao: "#2A2A2A",
  borda: "#E5DFD5",
  agua: "#0E7C9B",
  agua2: "#5BC0DE",
  vermelho: "#A93226",
};

type Unidade = {
  id: number;
  nome: string;
  dono_nome: string | null;
  autoliberacao: boolean;
  pacientes: number;
  cadernos: number;
  racl: number;
  racj: number;
  exames: number;
};

type Status = {
  unidades: Unidade[];
  totals: {
    total_cadernos: number;
    gerados: number;
    pendentes: number;
    total_exames: number;
    anastomose_pronta: number;
    total_tratamentos: number;
    total_unidades: number;
  };
};

export default function Inundacao() {
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function carregar() {
    const r = await fetch("/api/inundacao/status");
    setData(await r.json());
  }

  useEffect(() => { carregar(); }, []);

  async function disparar() {
    if (!confirm("Abrir a barragem? Vai inundar TODAS as unidades.")) return;
    setLoading(true); setMsg("");
    try {
      const r = await fetch("/api/inundacao/disparar", { method: "POST" });
      const j = await r.json();
      setMsg(`✓ ${j.mensagem} — ${j.novosCadernos} cadernos novos · ${j.novosExames} exames novos`);
      await carregar();
    } catch (e: any) {
      setMsg("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div style={{ background: PALETA.offwhite, minHeight: "100vh", padding: "32px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ color: PALETA.petroleo, fontSize: 32, fontWeight: 700, margin: 0 }}>
              💧 Inundação Genesis — Rio Caudaloso
            </h1>
            <p style={{ color: PALETA.carvao, marginTop: 8, opacity: 0.75 }}>
              Cadernos RACL/RACJ + Exames com anastomose semântica · liberação automática sem gate de pagamento
            </p>
          </header>

          {data && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12, marginBottom: 24 }}>
              <Card label="Unidades" valor={data.totals.total_unidades} cor={PALETA.petroleo} />
              <Card label="Cadernos TOTAL" valor={data.totals.total_cadernos} cor={PALETA.dourado} />
              <Card label="Gerados" valor={data.totals.gerados} cor={PALETA.agua} />
              <Card label="Pendentes" valor={data.totals.pendentes} cor={data.totals.pendentes > 0 ? PALETA.vermelho : PALETA.agua2} />
              <Card label="Exames" valor={data.totals.total_exames} cor={PALETA.agua2} />
              <Card label="Anastomose Pronta" valor={data.totals.anastomose_pronta} cor={PALETA.dourado} />
              <Card label="Tratamentos" valor={data.totals.total_tratamentos} cor={PALETA.petroleo} />
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
            <button
              onClick={disparar}
              disabled={loading}
              data-testid="btn-disparar-inundacao"
              style={{
                background: PALETA.agua,
                color: "white",
                border: "none",
                padding: "14px 28px",
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 8,
                cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 12px rgba(14,124,155,0.3)",
              }}
            >
              {loading ? "Inundando..." : "💧 Abrir a Barragem (re-disparar)"}
            </button>
            <button onClick={carregar} style={{
              background: "transparent", color: PALETA.petroleo,
              border: `1px solid ${PALETA.borda}`, padding: "14px 20px",
              borderRadius: 8, cursor: "pointer", fontWeight: 600,
            }}>↻ Atualizar</button>
            {msg && <span style={{ color: PALETA.petroleo, fontWeight: 600 }}>{msg}</span>}
          </div>

          {data && (
            <div style={{ background: "white", border: `1px solid ${PALETA.borda}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: PALETA.petroleo, color: "white" }}>
                    <th style={th}>#</th>
                    <th style={th}>Unidade</th>
                    <th style={th}>Dono Fictício</th>
                    <th style={th}>Auto</th>
                    <th style={thNum}>Pacientes</th>
                    <th style={thNum}>RACL</th>
                    <th style={thNum}>RACJ</th>
                    <th style={thNum}>Cadernos</th>
                    <th style={thNum}>Exames</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unidades.map((u) => (
                    <tr key={u.id} style={{ borderTop: `1px solid ${PALETA.borda}` }} data-testid={`linha-unidade-${u.id}`}>
                      <td style={td}>{u.id}</td>
                      <td style={{ ...td, fontWeight: 600, color: PALETA.petroleo }}>{u.nome}</td>
                      <td style={{ ...td, color: u.dono_nome ? PALETA.carvao : PALETA.vermelho }}>
                        {u.dono_nome ?? "(sem dono)"}
                      </td>
                      <td style={td}>
                        <span style={{
                          background: u.autoliberacao ? PALETA.agua2 : PALETA.vermelho,
                          color: "white", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                        }}>{u.autoliberacao ? "ON" : "OFF"}</span>
                      </td>
                      <td style={tdNum}>{u.pacientes}</td>
                      <td style={tdNum}>{u.racl}</td>
                      <td style={tdNum}>{u.racj}</td>
                      <td style={{ ...tdNum, fontWeight: 700, color: PALETA.dourado }}>{u.cadernos}</td>
                      <td style={{ ...tdNum, fontWeight: 700, color: PALETA.agua }}>{u.exames}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Card({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div style={{ background: "white", borderLeft: `4px solid ${cor}`, padding: 14, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: cor, marginTop: 4 }}>{valor}</div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "12px 14px", textAlign: "left", fontSize: 13, fontWeight: 600 };
const thNum: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "10px 14px", fontSize: 13 };
const tdNum: React.CSSProperties = { ...td, textAlign: "right" };
