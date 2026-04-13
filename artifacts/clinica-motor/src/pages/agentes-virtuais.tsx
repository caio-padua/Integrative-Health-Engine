import { useState, useEffect } from "react";
import { useClinic } from "@/contexts/ClinicContext";

const API = "/api/agentes-virtuais";

const COR_CARGO: Record<string, string> = {
  ADMINISTRATIVO: "#3B82F6",
  ENFERMAGEM: "#14B8A6",
  CONSULTOR: "#06B6D4",
  SUPERVISOR: "#F97316",
  FINANCEIRO: "#10B981",
  OUVIDORIA: "#EC4899",
};

const COR_ESTADO: Record<string, string> = {
  provisionado: "#64748B",
  configurado: "#F59E0B",
  pronto: "#3B82F6",
  ativo: "#10B981",
  pausado: "#EF4444",
  desabilitado: "#374151",
};

interface Agente {
  id: number;
  identificadorAgente: string;
  emailAgente: string;
  habilitado: boolean;
  estadoProntidao: string;
  tomDeVozCustomizado: string | null;
  naoFazCustomizado: string[] | null;
  nomeAgente: string;
  codigoAgente: string;
  cargo: string;
  indice: string;
  emoji: string;
  corSemantica: string;
  funcaoAgente: string;
  tomDeVoz: string;
  naoFaz: string[];
  slaDefaultHoras: number;
  modalidade: string;
}

interface CatalogoAgente {
  id: number;
  codigoAgente: string;
  nomeAgente: string;
  descricao: string;
  funcaoAgente: string;
  cargo: string;
  indice: string;
  emoji: string;
  corSemantica: string;
  tomDeVoz: string;
  naoFaz: string[];
  slaDefaultHoras: number;
  modalidade: string;
  regrasTdahToc: any;
  perfilMensagemPadrao: any;
  narrativas?: Narrativa[];
}

interface Narrativa {
  id: number;
  titulo: string;
  tag: string;
  corTag: string;
  ordem: number;
  mensagens: Array<{ lado: "paciente" | "agente"; texto: string }>;
}

interface Capacidades {
  podeEnviarWhatsapp: boolean;
  podeEnviarEmail: boolean;
  podeCriarTarefa: boolean;
  podeAtualizarTarefa: boolean;
  podeLerAgenda: boolean;
  podeLerAcompanhamento: boolean;
  podeEscalarSupervisor: boolean;
  requerValidacaoHumana: boolean;
  nuncaRespondeCasoVermelhoSemHumano: boolean;
  podeConsultarProntuario: boolean;
  podeCriarAgendamento: boolean;
  podeEnviarCodigoValidacao: boolean;
  podeRegistrarMemoria: boolean;
}

interface Stats {
  catalogoTotal: number;
  provisionadosTotal: number;
  ativosTotal: number;
  narrativasTotal: number;
  execucoesTotal: number;
}

const TABS = ["CATÁLOGO GLOBAL", "AGENTES DA CLÍNICA", "NARRATIVAS", "CAPACIDADES"];

export default function AgentesVirtuaisPage() {
  const { unidadeSelecionada } = useClinic();
  const [tab, setTab] = useState(0);
  const [catalogo, setCatalogo] = useState<CatalogoAgente[]>([]);
  const [agentesClinica, setAgentesClinica] = useState<Agente[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedCatalogo, setSelectedCatalogo] = useState<CatalogoAgente | null>(null);
  const [selectedAgente, setSelectedAgente] = useState<Agente | null>(null);
  const [agenteDetalhe, setAgenteDetalhe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("TODOS");

  const clinicaId = unidadeSelecionada || 1;

  useEffect(() => {
    loadData();
  }, [clinicaId]);

  async function loadData() {
    setLoading(true);
    try {
      const [catRes, agRes, stRes] = await Promise.all([
        fetch(`${API}/catalogo`),
        fetch(`${API}/clinica/${clinicaId}`),
        fetch(`${API}/stats`),
      ]);
      setCatalogo(await catRes.json());
      setAgentesClinica(await agRes.json());
      setStats(await stRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function loadCatalogoDetalhe(id: number) {
    const res = await fetch(`${API}/catalogo/${id}`);
    const data = await res.json();
    setSelectedCatalogo(data);
  }

  async function loadAgenteDetalhe(agenteId: number) {
    const res = await fetch(`${API}/clinica/${clinicaId}/agente/${agenteId}`);
    const data = await res.json();
    setAgenteDetalhe(data);
  }

  const cargosUnicos = [...new Set(agentesClinica.map(a => a.cargo))];
  const agentesFiltrados = filtro === "TODOS" ? agentesClinica : agentesClinica.filter(a => a.cargo === filtro);

  if (loading) {
    return (
      <div style={{ padding: 40, color: "#64748B", textAlign: "center" }}>
        Carregando agentes virtuais...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#C8920A", letterSpacing: "0.06em", margin: 0 }}>
          AGENTES VIRTUAIS — CARTA MAGNA PADCOM
        </h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>
          Catálogo Global · Provisionamento por Clínica · Narrativas · Capacidades Editáveis
        </p>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "CATÁLOGO GLOBAL", value: stats.catalogoTotal, cor: "#C8920A" },
            { label: "PROVISIONADOS", value: stats.provisionadosTotal, cor: "#3B82F6" },
            { label: "ATIVOS", value: stats.ativosTotal, cor: "#10B981" },
            { label: "NARRATIVAS", value: stats.narrativasTotal, cor: "#8B5CF6" },
            { label: "EXECUÇÕES", value: stats.execucoesTotal, cor: "#F97316" },
          ].map((kpi, i) => (
            <div key={i} style={{
              background: "#0F1422",
              border: "1px solid #1A2540",
              borderLeft: `4px solid ${kpi.cor}`,
              borderRadius: 0,
              padding: "14px 16px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em" }}>{kpi.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: kpi.cor, marginTop: 4 }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        display: "flex", gap: 0, borderBottom: "1px solid #1A2540", marginBottom: 20,
      }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => { setTab(i); setSelectedCatalogo(null); setSelectedAgente(null); setAgenteDetalhe(null); }} style={{
            background: "none", border: "none",
            borderBottom: tab === i ? "3px solid #C8920A" : "3px solid transparent",
            color: tab === i ? "#C8920A" : "#64748B",
            padding: "10px 18px", cursor: "pointer",
            fontWeight: 800, fontSize: 12, letterSpacing: "0.04em",
          }}>{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <div>
          {selectedCatalogo ? (
            <CatalogoDetalheView
              agente={selectedCatalogo}
              onVoltar={() => setSelectedCatalogo(null)}
            />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {catalogo.map(ag => (
                <div key={ag.id} onClick={() => loadCatalogoDetalhe(ag.id)} style={{
                  background: "#0F1422",
                  border: `1px solid ${ag.corSemantica}33`,
                  borderLeft: `4px solid ${ag.corSemantica}`,
                  borderRadius: 0,
                  padding: "14px 18px",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14,
                  transition: "border-color 0.2s",
                }}>
                  <span style={{ fontSize: 24 }}>{ag.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 900, fontSize: 11, color: ag.corSemantica, letterSpacing: "0.08em" }}>
                        {ag.codigoAgente.toUpperCase().replace(/_/g, " ")}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#E2E8F0" }}>{ag.nomeAgente}</span>
                      <span style={{
                        background: ag.corSemantica + "22", color: ag.corSemantica,
                        fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
                      }}>{ag.modalidade.toUpperCase()}</span>
                      <span style={{
                        background: "#C8920A22", color: "#C8920A",
                        fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
                      }}>SLA {ag.slaDefaultHoras}h</span>
                    </div>
                    <div style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>{ag.funcaoAgente}</div>
                  </div>
                  <span style={{ color: "#64748B", fontSize: 14 }}>▶</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            <button onClick={() => setFiltro("TODOS")} style={{
              background: filtro === "TODOS" ? "#C8920A" : "#0F1422",
              color: filtro === "TODOS" ? "#000" : "#E2E8F0",
              border: "1px solid #1A2540", padding: "6px 14px",
              borderRadius: 0, cursor: "pointer", fontWeight: 800, fontSize: 11,
            }}>TODOS ({agentesClinica.length})</button>
            {cargosUnicos.map(c => {
              const cnt = agentesClinica.filter(a => a.cargo === c).length;
              const cor = COR_CARGO[c] || "#64748B";
              return (
                <button key={c} onClick={() => setFiltro(c)} style={{
                  background: filtro === c ? cor + "33" : "#0F1422",
                  color: filtro === c ? cor : "#E2E8F0",
                  border: `1px solid ${filtro === c ? cor : "#1A2540"}`,
                  padding: "6px 14px", borderRadius: 0, cursor: "pointer",
                  fontWeight: 800, fontSize: 11, display: "flex", gap: 6, alignItems: "center",
                }}>
                  <span style={{ width: 10, height: 10, background: cor, display: "inline-block" }}></span>
                  {c} ({cnt})
                </button>
              );
            })}
          </div>

          {agenteDetalhe ? (
            <AgenteClinicaDetalhe
              detalhe={agenteDetalhe}
              onVoltar={() => setAgenteDetalhe(null)}
              onReload={loadData}
              clinicaId={clinicaId}
            />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {agentesFiltrados.map(ag => (
                <div key={ag.id} onClick={() => loadAgenteDetalhe(ag.id)} style={{
                  background: "#0F1422",
                  border: `1px solid ${ag.corSemantica}33`,
                  borderLeft: `4px solid ${ag.corSemantica}`,
                  borderRadius: 0,
                  padding: "12px 16px",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 22 }}>{ag.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 900, fontSize: 12, color: "#E2E8F0" }}>{ag.identificadorAgente}</span>
                      <span style={{ fontSize: 10, color: "#64748B" }}>{ag.emailAgente}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{ag.funcaoAgente}</div>
                  </div>
                  <span style={{
                    background: COR_ESTADO[ag.estadoProntidao] + "22",
                    color: COR_ESTADO[ag.estadoProntidao],
                    fontSize: 9, fontWeight: 800, padding: "3px 10px", borderRadius: 4,
                    letterSpacing: "0.06em",
                  }}>{ag.estadoProntidao.toUpperCase()}</span>
                  <span style={{
                    background: ag.corSemantica + "22", color: ag.corSemantica,
                    fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 4,
                  }}>SLA {ag.slaDefaultHoras}h</span>
                  <span style={{ color: "#64748B" }}>▶</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 2 && <NarrativasTab catalogo={catalogo} />}
      {tab === 3 && <CapacidadesTab catalogo={catalogo} agentesClinica={agentesClinica} clinicaId={clinicaId} />}
    </div>
  );
}

function CatalogoDetalheView({ agente, onVoltar }: { agente: CatalogoAgente; onVoltar: () => void }) {
  const cor = agente.corSemantica;
  return (
    <div>
      <button onClick={onVoltar} style={{
        background: "none", border: "1px solid #1A2540", color: "#64748B",
        padding: "6px 14px", cursor: "pointer", marginBottom: 16, fontSize: 11, fontWeight: 700,
      }}>← VOLTAR AO CATÁLOGO</button>

      <div style={{
        background: "#0F1422", border: `1px solid ${cor}44`, borderLeft: `4px solid ${cor}`,
        borderRadius: 0, padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 32 }}>{agente.emoji}</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: cor, letterSpacing: "0.06em" }}>
              {agente.nomeAgente}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{agente.funcaoAgente}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#0A0D18", borderRadius: 0, padding: "12px 14px" }}>
            <div style={{ color: cor, fontSize: 10, fontWeight: 800, marginBottom: 6 }}>TOM DE VOZ</div>
            <div style={{ color: "#E2E8F0", fontSize: 12, lineHeight: 1.6 }}>{agente.tomDeVoz}</div>
          </div>
          <div style={{ background: "#0A0D18", borderRadius: 0, padding: "12px 14px" }}>
            <div style={{ color: "#EF4444", fontSize: 10, fontWeight: 800, marginBottom: 6 }}>NÃO FAZ</div>
            {agente.naoFaz?.map((n, i) => (
              <div key={i} style={{ color: "#64748B", fontSize: 11, padding: "2px 0" }}>✕ {n}</div>
            ))}
          </div>
        </div>

        {agente.regrasTdahToc && (
          <div style={{ background: "#0A0D18", borderRadius: 0, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ color: "#8B5CF6", fontSize: 10, fontWeight: 800, marginBottom: 8 }}>REGRAS TDAH+TOC</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { label: "Máx. frases/bloco", value: agente.regrasTdahToc.maxFrasesPorBloco },
                { label: "Obriga tópicos", value: agente.regrasTdahToc.obrigaTopicos ? "SIM" : "NÃO" },
                { label: "Linha branca entre seções", value: agente.regrasTdahToc.obrigaLinhaEmBrancoEntreSecoes ? "SIM" : "NÃO" },
                { label: "Emoji semântico", value: agente.regrasTdahToc.obrigaEmojiSemantico ? "SIM" : "NÃO" },
                { label: "Máx. caracteres", value: agente.regrasTdahToc.maxCaracteresPorMensagem },
                { label: "Estrutura", value: agente.regrasTdahToc.estruturaObrigatoria?.join(" → ") },
              ].map((r, i) => (
                <div key={i}>
                  <div style={{ fontSize: 9, color: "#64748B", fontWeight: 700 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 700 }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {agente.perfilMensagemPadrao && (
          <div style={{ background: "#0A0D18", borderRadius: 0, padding: "12px 14px" }}>
            <div style={{ color: "#C8920A", fontSize: 10, fontWeight: 800, marginBottom: 8 }}>PERFIL DE MENSAGEM</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Saudação", value: agente.perfilMensagemPadrao.saudacao },
                { label: "Despedida", value: agente.perfilMensagemPadrao.despedida },
                { label: "Assinatura", value: agente.perfilMensagemPadrao.assinatura },
                { label: "Emojis", value: agente.perfilMensagemPadrao.emojisPadrao?.join(" ") },
              ].map((p, i) => (
                <div key={i}>
                  <div style={{ fontSize: 9, color: "#64748B", fontWeight: 700 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "#E2E8F0" }}>{p.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, color: "#EF4444", fontWeight: 700 }}>Frase de escalada</div>
              <div style={{ fontSize: 11, color: "#E2E8F0", whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 4 }}>
                {agente.perfilMensagemPadrao.fraseEscalada}
              </div>
            </div>
          </div>
        )}
      </div>

      {agente.narrativas && agente.narrativas.length > 0 && (
        <NarrativasWhatsApp narrativas={agente.narrativas} cor={cor} emoji={agente.emoji} titulo={agente.nomeAgente} />
      )}
    </div>
  );
}

function NarrativasWhatsApp({ narrativas, cor, emoji, titulo }: {
  narrativas: Narrativa[]; cor: string; emoji: string; titulo: string;
}) {
  const [cenario, setCenario] = useState(0);
  const narr = narrativas[cenario];

  return (
    <div style={{
      background: "#0F1422", border: `1px solid ${cor}33`,
      borderRadius: 0, padding: 18,
    }}>
      <div style={{ color: "#C8920A", fontSize: 10, fontWeight: 800, marginBottom: 10 }}>NARRATIVAS DE EXEMPLO</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {narrativas.map((n, i) => (
          <button key={i} onClick={() => setCenario(i)} style={{
            background: cenario === i ? (n.corTag || cor) + "33" : "#0A0D18",
            border: `1px solid ${cenario === i ? (n.corTag || cor) : "#1A2540"}`,
            color: cenario === i ? (n.corTag || cor) : "#64748B",
            padding: "5px 12px", borderRadius: 0, cursor: "pointer",
            fontSize: 10, fontWeight: 700,
          }}>{n.tag}</button>
        ))}
      </div>

      <div style={{
        background: "#0B141A", borderRadius: 0, padding: 16,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px", background: "#1F2C34", borderRadius: 0, marginBottom: 14,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: cor + "33", border: `2px solid ${cor}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }}>{emoji}</div>
          <div>
            <div style={{ color: "#E9EDF0", fontSize: 12, fontWeight: 700 }}>Clínica Pádua — {titulo}</div>
            <div style={{ color: "#6BCB9C", fontSize: 10 }}>● online</div>
          </div>
          <span style={{
            marginLeft: "auto",
            background: (narr?.corTag || cor) + "22",
            color: narr?.corTag || cor,
            fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
          }}>{narr?.titulo}</span>
        </div>

        {narr?.mensagens.map((msg, i) => {
          const isPaciente = msg.lado === "paciente";
          return (
            <div key={i} style={{
              display: "flex",
              justifyContent: isPaciente ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}>
              <div style={{
                maxWidth: "80%",
                background: isPaciente ? "#005C4B" : "#1F2C34",
                borderRadius: isPaciente ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                padding: "10px 14px",
                border: isPaciente ? "none" : "1px solid #2A3F52",
              }}>
                <div style={{
                  color: isPaciente ? "#6BCB9C" : cor,
                  fontSize: 9, fontWeight: 700, marginBottom: 4, letterSpacing: "0.06em",
                }}>{isPaciente ? "PACIENTE" : "AGENTE"}</div>
                <div style={{
                  color: "#E9EDF0", fontSize: 12, lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>{msg.texto}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgenteClinicaDetalhe({ detalhe, onVoltar, onReload, clinicaId }: {
  detalhe: any; onVoltar: () => void; onReload: () => void; clinicaId: number;
}) {
  const cor = detalhe.catalogo?.corSemantica || "#64748B";
  const caps: Capacidades | null = detalhe.capacidades;

  return (
    <div>
      <button onClick={onVoltar} style={{
        background: "none", border: "1px solid #1A2540", color: "#64748B",
        padding: "6px 14px", cursor: "pointer", marginBottom: 16, fontSize: 11, fontWeight: 700,
      }}>← VOLTAR</button>

      <div style={{
        background: "#0F1422", border: `1px solid ${cor}44`, borderLeft: `4px solid ${cor}`,
        borderRadius: 0, padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 32 }}>{detalhe.catalogo?.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: cor }}>{detalhe.identificadorAgente}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{detalhe.emailAgente}</div>
            <div style={{ fontSize: 12, color: "#E2E8F0", marginTop: 4 }}>{detalhe.catalogo?.funcaoAgente}</div>
          </div>
          <span style={{
            background: COR_ESTADO[detalhe.estadoProntidao] + "22",
            color: COR_ESTADO[detalhe.estadoProntidao],
            fontSize: 12, fontWeight: 800, padding: "6px 16px", borderRadius: 4,
          }}>{detalhe.estadoProntidao?.toUpperCase()}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#0A0D18", padding: "12px 14px" }}>
            <div style={{ color: cor, fontSize: 10, fontWeight: 800, marginBottom: 6 }}>TOM DE VOZ</div>
            <div style={{ color: "#E2E8F0", fontSize: 12, lineHeight: 1.6 }}>
              {detalhe.tomDeVozCustomizado || detalhe.catalogo?.tomDeVoz}
            </div>
          </div>
          <div style={{ background: "#0A0D18", padding: "12px 14px" }}>
            <div style={{ color: "#EF4444", fontSize: 10, fontWeight: 800, marginBottom: 6 }}>NÃO FAZ</div>
            {(detalhe.naoFazCustomizado || detalhe.catalogo?.naoFaz)?.map((n: string, i: number) => (
              <div key={i} style={{ color: "#64748B", fontSize: 11, padding: "2px 0" }}>✕ {n}</div>
            ))}
          </div>
        </div>

        {caps && (
          <div style={{ background: "#0A0D18", padding: "12px 14px" }}>
            <div style={{ color: "#8B5CF6", fontSize: 10, fontWeight: 800, marginBottom: 10 }}>CAPACIDADES</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {Object.entries(caps).filter(([k]) => k.startsWith("pode") || k.startsWith("requer") || k.startsWith("nunca")).map(([key, val]) => (
                <div key={key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 2,
                    background: val ? "#10B981" : "#374151",
                    display: "inline-block",
                  }}></span>
                  <span style={{
                    fontSize: 10, color: val ? "#E2E8F0" : "#64748B",
                    fontWeight: val ? 700 : 400,
                  }}>{formatCapabilityName(key)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {detalhe.narrativas && detalhe.narrativas.length > 0 && (
        <NarrativasWhatsApp
          narrativas={detalhe.narrativas}
          cor={cor}
          emoji={detalhe.catalogo?.emoji || "🤖"}
          titulo={detalhe.catalogo?.nomeAgente || detalhe.identificadorAgente}
        />
      )}
    </div>
  );
}

function formatCapabilityName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^pode/, "Pode")
    .replace(/^requer/, "Requer")
    .replace(/^nunca/, "Nunca")
    .trim();
}

function NarrativasTab({ catalogo }: { catalogo: CatalogoAgente[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [narrativas, setNarrativas] = useState<Narrativa[]>([]);

  async function loadNarrativas(catalogoId: number) {
    setSelectedId(catalogoId);
    const res = await fetch(`${API}/narrativas/${catalogoId}`);
    setNarrativas(await res.json());
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {catalogo.map(ag => (
          <button key={ag.id} onClick={() => loadNarrativas(ag.id)} style={{
            background: selectedId === ag.id ? ag.corSemantica + "33" : "#0F1422",
            border: `1px solid ${selectedId === ag.id ? ag.corSemantica : "#1A2540"}`,
            color: selectedId === ag.id ? ag.corSemantica : "#64748B",
            padding: "6px 14px", borderRadius: 0, cursor: "pointer",
            fontSize: 10, fontWeight: 700, display: "flex", gap: 6, alignItems: "center",
          }}>
            <span>{ag.emoji}</span> {ag.cargo} {ag.indice}
          </button>
        ))}
      </div>

      {selectedId && narrativas.length > 0 && (() => {
        const ag = catalogo.find(a => a.id === selectedId)!;
        return (
          <NarrativasWhatsApp
            narrativas={narrativas}
            cor={ag.corSemantica}
            emoji={ag.emoji}
            titulo={ag.nomeAgente}
          />
        );
      })()}

      {selectedId && narrativas.length === 0 && (
        <div style={{ color: "#64748B", fontSize: 13, padding: 20, textAlign: "center" }}>
          Nenhuma narrativa cadastrada para este agente.
        </div>
      )}

      {!selectedId && (
        <div style={{ color: "#64748B", fontSize: 13, padding: 20, textAlign: "center" }}>
          Selecione um agente acima para ver suas narrativas de conversação.
        </div>
      )}
    </div>
  );
}

function CapacidadesTab({ catalogo, agentesClinica, clinicaId }: {
  catalogo: CatalogoAgente[]; agentesClinica: Agente[]; clinicaId: number;
}) {
  const capLabels: Record<string, string> = {
    podeEnviarWhatsapp: "Enviar WhatsApp",
    podeEnviarEmail: "Enviar Email",
    podeCriarTarefa: "Criar Tarefa",
    podeAtualizarTarefa: "Atualizar Tarefa",
    podeLerAgenda: "Ler Agenda",
    podeLerAcompanhamento: "Ler Acompanhamento",
    podeEscalarSupervisor: "Escalar Supervisor",
    requerValidacaoHumana: "Requer Validação Humana",
    nuncaRespondeCasoVermelhoSemHumano: "Nunca Responde Vermelho s/ Humano",
    podeConsultarProntuario: "Consultar Prontuário",
    podeCriarAgendamento: "Criar Agendamento",
    podeEnviarCodigoValidacao: "Enviar Código Validação",
    podeRegistrarMemoria: "Registrar Memória",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #1A2540", color: "#C8920A", fontWeight: 800, fontSize: 10 }}>
              AGENTE
            </th>
            {Object.values(capLabels).map((label, i) => (
              <th key={i} style={{
                textAlign: "center", padding: "8px 4px", borderBottom: "1px solid #1A2540",
                color: "#64748B", fontWeight: 700, fontSize: 9, maxWidth: 70,
                writingMode: "vertical-rl" as any, transform: "rotate(180deg)", height: 100,
              }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {catalogo.map(ag => {
            const agClinica = agentesClinica.find(a => a.codigoAgente === ag.codigoAgente);
            return (
              <tr key={ag.id} style={{ borderBottom: "1px solid #1A254033" }}>
                <td style={{ padding: "8px 10px", display: "flex", gap: 6, alignItems: "center" }}>
                  <span>{ag.emoji}</span>
                  <span style={{ color: ag.corSemantica, fontWeight: 700 }}>{ag.cargo} {ag.indice}</span>
                </td>
                {Object.keys(capLabels).map((key, i) => {
                  const val = (agClinica as any)?.[key];
                  return (
                    <td key={i} style={{ textAlign: "center", padding: "8px 4px" }}>
                      <span style={{
                        width: 12, height: 12, borderRadius: 2, display: "inline-block",
                        background: val ? "#10B981" : "#37415133",
                      }}></span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
