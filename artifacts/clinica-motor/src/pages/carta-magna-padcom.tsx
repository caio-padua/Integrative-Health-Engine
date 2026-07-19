import { useState, useEffect } from "react";
import { apiFetch, ensureArray } from "@/lib/api-fetch";

const API = "/api/agentes-virtuais";

const COR_CARGO: Record<string, string> = {
  ADMINISTRATIVO: "#3B82F6",
  ENFERMAGEM: "#14B8A6",
  CONSULTOR: "#06B6D4",
  SUPERVISOR: "#F97316",
  FINANCEIRO: "#10B981",
  OUVIDORIA: "#EC4899",
  Administrativo: "#3B82F6",
  Enfermagem: "#14B8A6",
  Consultor: "#B8923A",
  Supervisor: "#1A3A4A",
  Financeiro: "#3F3F3F",
  Ouvidoria: "#5E6B7C",
};

const CARGO_ICON: Record<string, string> = {
  ADMINISTRATIVO: "🏥", Administrativo: "🗂️",
  ENFERMAGEM: "💉", Enfermagem: "💉",
  CONSULTOR: "🧬", Consultor: "🎓",
  SUPERVISOR: "📋", Supervisor: "🎖️",
  FINANCEIRO: "💰", Financeiro: "💼",
  OUVIDORIA: "🛡️", Ouvidoria: "🤝",
};

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

interface Stats {
  catalogoTotal: number;
  provisionadosTotal: number;
  ativosTotal: number;
  narrativasTotal: number;
  execucoesTotal: number;
}

interface Personalidade {
  formalidade: number;
  empatia: number;
  autoridade: number;
  objetividade: number;
  calorHumano: number;
  proatividade: number;
  paciencia: number;
  nivelHumanizacao: number;
  tomGeral: string | null;
  personalidadeResumo: string | null;
  generoVoz: string;
  estiloConversacao: string;
  exemploFraseTipica: string | null;
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

const PERSONALIDADE_SEED: Record<string, Personalidade> = {
  agente_administrativo_01: { formalidade: 10, empatia: 6, autoridade: 3, objetividade: 8, calorHumano: 7, proatividade: 8, paciencia: 7, nivelHumanizacao: 7, tomGeral: "Acolhedor, organizado, preciso", personalidadeResumo: "Como uma recepcionista de clínica premium — simpática, profissional, nunca íntima.", generoVoz: "feminino", estiloConversacao: "profissional", exemploFraseTipica: "Será um prazer organizar o seu atendimento." },
  agente_administrativo_02: { formalidade: 7, empatia: 5, autoridade: 3, objetividade: 9, calorHumano: 5, proatividade: 7, paciencia: 6, nivelHumanizacao: 5, tomGeral: "Gentil, direto, funcional", personalidadeResumo: "Assistente administrativo treinado. Não é robótico, não é coloquial.", generoVoz: "neutro", estiloConversacao: "objetivo", exemploFraseTipica: "Estou entrando em contato para confirmar seu atendimento." },
  agente_enfermagem_01: { formalidade: 5, empatia: 9, autoridade: 4, objetividade: 7, calorHumano: 9, proatividade: 7, paciencia: 9, nivelHumanizacao: 9, tomGeral: "Técnico mas acolhedor, maternal", personalidadeResumo: "Como uma enfermeira treinada que explica com calma. Sabe muito, explica simples.", generoVoz: "feminino", estiloConversacao: "acolhedor", exemploFraseTipica: "Estou te enviando as orientações do seu procedimento." },
  agente_enfermagem_02: { formalidade: 5, empatia: 8, autoridade: 3, objetividade: 8, calorHumano: 7, proatividade: 6, paciencia: 8, nivelHumanizacao: 7, tomGeral: "Cuidadoso, detalhado, investigativo", personalidadeResumo: "Parece um follow-up de cuidado, mas é auditoria real. O paciente não sabe.", generoVoz: "feminino", estiloConversacao: "investigativo", exemploFraseTipica: "Gostaria de entender melhor como o(a) senhor(a) se sentiu." },
  agente_consultor_01: { formalidade: 7, empatia: 6, autoridade: 7, objetividade: 9, calorHumano: 5, proatividade: 6, paciencia: 7, nivelHumanizacao: 5, tomGeral: "Científico mas acessível", personalidadeResumo: "Como um biomédico ou farmacêutico treinado. Explica com segurança, nunca assusta.", generoVoz: "neutro", estiloConversacao: "tecnico", exemploFraseTipica: "Boa pergunta! Vou te explicar com clareza." },
  agente_consultor_02: { formalidade: 5, empatia: 8, autoridade: 4, objetividade: 6, calorHumano: 8, proatividade: 9, paciencia: 8, nivelHumanizacao: 8, tomGeral: "Próximo, interessado, motivador", personalidadeResumo: "Como um consultor de saúde que acompanha de verdade. Celebra conquistas, incentiva.", generoVoz: "neutro", estiloConversacao: "motivacional", exemploFraseTipica: "Estou fazendo o acompanhamento da sua evolução." },
  agente_supervisor_01: { formalidade: 9, empatia: 2, autoridade: 9, objetividade: 10, calorHumano: 1, proatividade: 9, paciencia: 3, nivelHumanizacao: 1, tomGeral: "Direto, sem rodeios, factual", personalidadeResumo: "Fala PARA a equipe, não para o paciente. Senso de urgência. Sempre factual.", generoVoz: "masculino", estiloConversacao: "imperativo", exemploFraseTipica: "ALERTA DE SLA — AÇÃO NECESSÁRIA." },
  agente_supervisor_02: { formalidade: 4, empatia: 7, autoridade: 3, objetividade: 7, calorHumano: 6, proatividade: 5, paciencia: 8, nivelHumanizacao: 6, tomGeral: "Natural, curioso, casual", personalidadeResumo: "O paciente não sabe que está sendo parte de uma auditoria. Parece ligação de qualidade.", generoVoz: "neutro", estiloConversacao: "casual", exemploFraseTipica: "Sou da equipe de qualidade da clínica." },
  agente_financeiro_01: { formalidade: 8, empatia: 5, autoridade: 6, objetividade: 10, calorHumano: 4, proatividade: 7, paciencia: 6, nivelHumanizacao: 4, tomGeral: "Cordial mas firme, factual", personalidadeResumo: "Assistente financeiro treinado. Não agressivo, não permissivo. Oferece soluções.", generoVoz: "neutro", estiloConversacao: "profissional", exemploFraseTipica: "Sou do setor financeiro da clínica." },
  agente_ouvidoria_01: { formalidade: 7, empatia: 10, autoridade: 2, objetividade: 7, calorHumano: 9, proatividade: 5, paciencia: 10, nivelHumanizacao: 9, tomGeral: "Sereno, acolhedor, neutro", personalidadeResumo: "Nunca defensivo. Nunca minimiza. Recebe, organiza, encaminha. Protege o paciente.", generoVoz: "neutro", estiloConversacao: "acolhedor", exemploFraseTipica: "Obrigado por trazer isso para nós." },
};

const CAPS_SEED: Record<string, Partial<Capacidades>> = {
  agente_administrativo_01: { podeEnviarWhatsapp: true, podeEnviarEmail: true, podeCriarTarefa: true, podeLerAgenda: true, podeCriarAgendamento: true, requerValidacaoHumana: false },
  agente_administrativo_02: { podeEnviarWhatsapp: true, podeEnviarEmail: true, podeLerAgenda: true, podeAtualizarTarefa: true, requerValidacaoHumana: false },
  agente_enfermagem_01: { podeEnviarWhatsapp: true, podeCriarTarefa: true, podeEnviarCodigoValidacao: true, podeLerAcompanhamento: true, requerValidacaoHumana: true },
  agente_enfermagem_02: { podeEnviarWhatsapp: true, podeLerAcompanhamento: true, podeAtualizarTarefa: true, requerValidacaoHumana: true },
  agente_consultor_01: { podeEnviarWhatsapp: true, podeLerAcompanhamento: true, podeConsultarProntuario: true, requerValidacaoHumana: true },
  agente_consultor_02: { podeEnviarWhatsapp: true, podeLerAcompanhamento: true, podeCriarTarefa: true, requerValidacaoHumana: false },
  agente_supervisor_01: { podeEnviarWhatsapp: true, podeEnviarEmail: true, podeCriarTarefa: true, podeAtualizarTarefa: true, podeLerAgenda: true, podeLerAcompanhamento: true, requerValidacaoHumana: false, nuncaRespondeCasoVermelhoSemHumano: false },
  agente_supervisor_02: { podeEnviarWhatsapp: true, podeLerAcompanhamento: true, requerValidacaoHumana: true },
  agente_financeiro_01: { podeEnviarWhatsapp: true, podeEnviarEmail: true, podeCriarTarefa: true, requerValidacaoHumana: true },
  agente_ouvidoria_01: { podeEnviarWhatsapp: true, podeEnviarEmail: true, podeCriarTarefa: true, requerValidacaoHumana: true },
};

const TABS = ["CONSTITUIÇÃO", "NARRATIVAS", "CAPACIDADES", "PERSONALIDADE", "FLUXO OPERACIONAL"];

const NAV_DARK = "#0A0D18";
const CARD_DARK = "#0F1422";
const BORDER_DARK = "#1A2540";
const TEXT_MUTED = "#64748B";

function BarraPersonalidade({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: 9, fontWeight: 900, color: cor }}>{valor}/10</span>
      </div>
      <div style={{ height: 4, background: "#1E2740", position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: 4,
          width: `${valor * 10}%`,
          background: cor,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

function BolhaConversa({ lado, texto }: { lado: "paciente" | "agente"; texto: string }) {
  const isPaciente = lado === "paciente";
  return (
    <div style={{
      display: "flex",
      justifyContent: isPaciente ? "flex-end" : "flex-start",
      marginBottom: 8,
    }}>
      {!isPaciente && (
        <div style={{
          width: 28, height: 28, background: "#1A2540", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, marginRight: 8, alignSelf: "flex-end",
        }}>🤖</div>
      )}
      <div style={{
        maxWidth: "72%",
        background: isPaciente ? "#1A3A2A" : "#1A2540",
        border: `1px solid ${isPaciente ? "#10B98133" : "#3B82F633"}`,
        borderRadius: 0,
        padding: "8px 12px",
        fontSize: 11,
        color: "#E2E8F0",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
      }}>
        {texto}
      </div>
      {isPaciente && (
        <div style={{
          width: 28, height: 28, background: "#1A3A2A", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, marginLeft: 8, alignSelf: "flex-end",
        }}>👤</div>
      )}
    </div>
  );
}

function TagCapacidade({ ativa, label }: { ativa: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-block",
      background: ativa ? "#10B98122" : "#1A2540",
      border: `1px solid ${ativa ? "#10B98155" : BORDER_DARK}`,
      color: ativa ? "#10B981" : TEXT_MUTED,
      fontSize: 9, fontWeight: 800,
      padding: "3px 7px",
      letterSpacing: "0.04em",
      marginRight: 4, marginBottom: 4,
    }}>
      {ativa ? "✅" : "✕"} {label}
    </span>
  );
}

export default function CartaMagnaPadcomPage() {
  const [tab, setTab] = useState(0);
  const [catalogo, setCatalogo] = useState<CatalogoAgente[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [narr, setNarr] = useState<Record<number, Narrativa[]>>({});
  const [loadingNarr, setLoadingNarr] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API}/catalogo`).then(r => r.json()),
      apiFetch(`${API}/stats`).then(r => r.json()),
    ]).then(([cat, st]) => {
      setCatalogo(ensureArray(cat));
      setStats(st);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function carregarNarrativas(catalogoId: number) {
    if (narr[catalogoId]) return;
    setLoadingNarr(catalogoId);
    try {
      const res = await apiFetch(`${API}/narrativas/${catalogoId}`);
      const data = ensureArray(await res.json());
      setNarr(prev => ({ ...prev, [catalogoId]: data }));
    } catch { /* silencioso */ }
    setLoadingNarr(null);
  }

  const cargosUnicos = [...new Set(catalogo.map(a => a.cargo))];

  if (loading) {
    return (
      <div style={{ padding: 40, color: TEXT_MUTED, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>
        Carregando Carta Magna PADCOM...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px", fontFamily: "'JetBrains Mono', monospace" }}>

      {/* HEADER */}
      <div style={{ marginBottom: 20, borderLeft: "4px solid #C8920A", paddingLeft: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: TEXT_MUTED, letterSpacing: "0.1em", marginBottom: 4 }}>
          SISTEMA PAWARDS — CARTA MAGNA PADCOM
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#C8920A", letterSpacing: "0.06em", margin: 0 }}>
          AGENTES VIRTUAIS — CONSTITUIÇÃO OPERACIONAL
        </h1>
        <p style={{ fontSize: 11, color: TEXT_MUTED, margin: "6px 0 0" }}>
          20 agentes · 100 instâncias · 22 narrativas · Motor de escrita · Carta fundadora do sistema de inteligência PADCOM
        </p>
      </div>

      {/* KPIs */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "CATÁLOGO GLOBAL", value: stats.catalogoTotal, cor: "#C8920A", sub: "agentes canônicos" },
            { label: "PROVISIONADOS", value: stats.provisionadosTotal, cor: "#3B82F6", sub: "20 × 5 clínicas" },
            { label: "ATIVOS", value: stats.ativosTotal, cor: "#10B981", sub: "em operação" },
            { label: "NARRATIVAS", value: stats.narrativasTotal, cor: "#8B5CF6", sub: "roteiros de conversa" },
            { label: "EXECUÇÕES", value: stats.execucoesTotal, cor: "#F97316", sub: "disparos realizados" },
          ].map((kpi, i) => (
            <div key={i} style={{
              background: CARD_DARK,
              border: `1px solid ${BORDER_DARK}`,
              borderLeft: `4px solid ${kpi.cor}`,
              padding: "14px 16px",
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: TEXT_MUTED, letterSpacing: "0.1em" }}>{kpi.label}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: kpi.cor, marginTop: 4, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: 9, color: TEXT_MUTED, marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* TABS */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER_DARK}`, marginBottom: 24 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: "none", border: "none",
            borderBottom: tab === i ? "3px solid #C8920A" : "3px solid transparent",
            color: tab === i ? "#C8920A" : TEXT_MUTED,
            padding: "10px 18px", cursor: "pointer",
            fontWeight: 800, fontSize: 11, letterSpacing: "0.05em",
            fontFamily: "'JetBrains Mono', monospace",
          }}>{t}</button>
        ))}
      </div>

      {/* ─── TAB 0: CONSTITUIÇÃO ─── */}
      {tab === 0 && (
        <div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 16, letterSpacing: "0.06em" }}>
            ORGANIZADO POR CARGO — clique em um agente para expandir identidade completa
          </div>
          {cargosUnicos.map(cargo => {
            const agentesDoCargo = catalogo.filter(a => a.cargo === cargo);
            const cor = COR_CARGO[cargo] || "#64748B";
            const icon = CARGO_ICON[cargo] || "🤖";
            return (
              <div key={cargo} style={{ marginBottom: 28 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  borderLeft: `4px solid ${cor}`, paddingLeft: 12,
                  marginBottom: 12,
                }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 13, color: cor, letterSpacing: "0.08em" }}>{cargo.toUpperCase()}</div>
                    <div style={{ fontSize: 9, color: TEXT_MUTED }}>{agentesDoCargo.length} agente{agentesDoCargo.length > 1 ? "s" : ""} neste cargo</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 12 }}>
                  {agentesDoCargo.map(ag => {
                    const isOpen = expandido === ag.id;
                    const pers = PERSONALIDADE_SEED[ag.codigoAgente];
                    const caps = CAPS_SEED[ag.codigoAgente] || {};
                    return (
                      <div key={ag.id} style={{
                        background: CARD_DARK,
                        border: `1px solid ${cor}33`,
                        borderLeft: `4px solid ${cor}`,
                      }}>
                        {/* CARD HEADER */}
                        <div
                          onClick={() => setExpandido(isOpen ? null : ag.id)}
                          style={{
                            padding: "14px 16px",
                            cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 12,
                          }}
                        >
                          <span style={{ fontSize: 26 }}>{ag.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 900, fontSize: 13, color: "#E2E8F0" }}>{ag.nomeAgente}</span>
                              <span style={{
                                background: ag.corSemantica + "22", color: ag.corSemantica,
                                fontSize: 8, fontWeight: 800, padding: "2px 7px",
                              }}>{ag.modalidade.toUpperCase()}</span>
                              <span style={{
                                background: "#C8920A22", color: "#C8920A",
                                fontSize: 8, fontWeight: 800, padding: "2px 7px",
                              }}>SLA {ag.slaDefaultHoras}h</span>
                            </div>
                            <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 3 }}>{ag.funcaoAgente}</div>
                          </div>
                          <span style={{ color: TEXT_MUTED, fontSize: 12, transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "" }}>▶</span>
                        </div>

                        {/* CARD EXPANDIDO */}
                        {isOpen && (
                          <div style={{ borderTop: `1px solid ${BORDER_DARK}`, padding: "16px 16px 20px" }}>
                            {/* TOM DE VOZ */}
                            <div style={{ background: NAV_DARK, padding: "10px 12px", marginBottom: 10 }}>
                              <div style={{ fontSize: 9, fontWeight: 800, color: cor, letterSpacing: "0.08em", marginBottom: 5 }}>TOM DE VOZ</div>
                              <div style={{ fontSize: 11, color: "#CBD5E1", lineHeight: 1.6 }}>{ag.tomDeVoz}</div>
                            </div>

                            {/* PERSONALIDADE */}
                            {pers && (
                              <div style={{ background: NAV_DARK, padding: "10px 12px", marginBottom: 10 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: "#8B5CF6", letterSpacing: "0.08em", marginBottom: 8 }}>PERSONALIDADE — ESCALAS 0-10</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                                  <BarraPersonalidade label="FORMALIDADE" valor={pers.formalidade} cor={cor} />
                                  <BarraPersonalidade label="EMPATIA" valor={pers.empatia} cor={cor} />
                                  <BarraPersonalidade label="AUTORIDADE" valor={pers.autoridade} cor={cor} />
                                  <BarraPersonalidade label="OBJETIVIDADE" valor={pers.objetividade} cor={cor} />
                                  <BarraPersonalidade label="CALOR HUMANO" valor={pers.calorHumano} cor={cor} />
                                  <BarraPersonalidade label="HUMANIZAÇÃO" valor={pers.nivelHumanizacao} cor={cor} />
                                </div>
                                <div style={{ marginTop: 8, fontSize: 10, color: "#E2E8F0", fontStyle: "italic" }}>
                                  "{pers.exemploFraseTipica}"
                                </div>
                              </div>
                            )}

                            {/* CAPACIDADES */}
                            <div style={{ background: NAV_DARK, padding: "10px 12px", marginBottom: 10 }}>
                              <div style={{ fontSize: 9, fontWeight: 800, color: "#F59E0B", letterSpacing: "0.08em", marginBottom: 8 }}>CAPACIDADES</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                                <TagCapacidade ativa={caps.podeEnviarWhatsapp ?? false} label="WhatsApp" />
                                <TagCapacidade ativa={caps.podeEnviarEmail ?? false} label="Email" />
                                <TagCapacidade ativa={caps.podeCriarTarefa ?? false} label="Criar Tarefa" />
                                <TagCapacidade ativa={caps.podeAtualizarTarefa ?? false} label="Atualizar Tarefa" />
                                <TagCapacidade ativa={caps.podeLerAgenda ?? false} label="Ler Agenda" />
                                <TagCapacidade ativa={caps.podeLerAcompanhamento ?? false} label="Acompanhamento" />
                                <TagCapacidade ativa={caps.podeConsultarProntuario ?? false} label="Prontuário" />
                                <TagCapacidade ativa={caps.podeCriarAgendamento ?? false} label="Agendar" />
                                <TagCapacidade ativa={caps.podeEnviarCodigoValidacao ?? false} label="Cód. Validação" />
                                <TagCapacidade ativa={caps.requerValidacaoHumana ?? true} label="Requer Humano" />
                              </div>
                            </div>

                            {/* NÃO FAZ */}
                            {ag.naoFaz && ag.naoFaz.length > 0 && (
                              <div style={{ background: "#1A0A0A", border: `1px solid #EF444422`, padding: "10px 12px" }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: "#EF4444", letterSpacing: "0.08em", marginBottom: 6 }}>NÃO FAZ — LIMITES ABSOLUTOS</div>
                                {ag.naoFaz.map((n, i) => (
                                  <div key={i} style={{ fontSize: 10, color: "#94A3B8", padding: "2px 0" }}>
                                    <span style={{ color: "#EF4444", marginRight: 6 }}>✕</span>{n}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB 1: NARRATIVAS ─── */}
      {tab === 1 && (
        <div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 20, letterSpacing: "0.06em" }}>
            22 ROTEIROS DE CONVERSA — SIMULAÇÃO WHATSAPP — clique em um agente para carregar narrativas
          </div>
          {catalogo.filter(ag => ag.codigoAgente.startsWith("agente_")).map(ag => {
            const cor = ag.corSemantica;
            const narrativasDoAgente = narr[ag.id] || [];
            const isOpen = expandido === ag.id + 1000;

            return (
              <div key={ag.id} style={{
                marginBottom: 16,
                border: `1px solid ${cor}33`,
                borderLeft: `4px solid ${cor}`,
                background: CARD_DARK,
              }}>
                <div
                  onClick={async () => {
                    if (!isOpen) {
                      setExpandido(ag.id + 1000);
                      await carregarNarrativas(ag.id);
                    } else {
                      setExpandido(null);
                    }
                  }}
                  style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                >
                  <span style={{ fontSize: 20 }}>{ag.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 900, fontSize: 12, color: "#E2E8F0" }}>{ag.nomeAgente}</span>
                    <span style={{ fontSize: 9, color: TEXT_MUTED, marginLeft: 10 }}>
                      {narrativasDoAgente.length > 0 ? `${narrativasDoAgente.length} narrativas` : "clique para carregar"}
                    </span>
                  </div>
                  {loadingNarr === ag.id ? (
                    <span style={{ fontSize: 9, color: TEXT_MUTED }}>carregando...</span>
                  ) : (
                    <span style={{ color: TEXT_MUTED, fontSize: 12, transform: isOpen ? "rotate(90deg)" : "" }}>▶</span>
                  )}
                </div>

                {isOpen && narrativasDoAgente.length > 0 && (
                  <div style={{ borderTop: `1px solid ${BORDER_DARK}` }}>
                    {narrativasDoAgente.map((narrativa, ni) => (
                      <div key={narrativa.id} style={{
                        padding: "16px 20px",
                        borderBottom: ni < narrativasDoAgente.length - 1 ? `1px solid ${BORDER_DARK}` : "none",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: TEXT_MUTED }}>NARRATIVA {narrativa.ordem}</span>
                          <span style={{
                            background: narrativa.corTag + "22", color: narrativa.corTag,
                            border: `1px solid ${narrativa.corTag}44`,
                            fontSize: 8, fontWeight: 800, padding: "2px 8px",
                          }}>{narrativa.tag}</span>
                          <span style={{ fontSize: 10, color: "#E2E8F0", fontWeight: 700 }}>{narrativa.titulo}</span>
                        </div>
                        <div style={{ padding: "0 8px" }}>
                          {narrativa.mensagens.map((msg, mi) => (
                            <BolhaConversa key={mi} lado={msg.lado} texto={msg.texto} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB 2: CAPACIDADES ─── */}
      {tab === 2 && (
        <div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 16, letterSpacing: "0.06em" }}>
            MATRIZ DE CAPACIDADES — 10 AGENTES PAWARDS × 13 PERMISSÕES BOOLEANAS
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
              <thead>
                <tr>
                  <th style={{ background: NAV_DARK, padding: "8px 12px", textAlign: "left", fontWeight: 800, color: TEXT_MUTED, letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER_DARK}`, minWidth: 180 }}>
                    AGENTE
                  </th>
                  {[
                    "WhatsApp", "Email", "Criar Tarefa", "Atualiz. Tarefa", "Ler Agenda",
                    "Acompanhamento", "Prontuário", "Agendar", "Cód. Validação",
                    "Requer Humano", "Nunca Vermelho", "Escalar", "Memória"
                  ].map(h => (
                    <th key={h} style={{
                      background: NAV_DARK, padding: "8px 6px", textAlign: "center",
                      fontWeight: 800, color: TEXT_MUTED, letterSpacing: "0.04em",
                      borderBottom: `1px solid ${BORDER_DARK}`, whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalogo.filter(ag => ag.codigoAgente.startsWith("agente_")).map((ag, idx) => {
                  const caps = CAPS_SEED[ag.codigoAgente] || {};
                  const cor = ag.corSemantica;
                  const isEven = idx % 2 === 0;
                  const vals = [
                    caps.podeEnviarWhatsapp ?? false,
                    caps.podeEnviarEmail ?? false,
                    caps.podeCriarTarefa ?? false,
                    caps.podeAtualizarTarefa ?? false,
                    caps.podeLerAgenda ?? false,
                    caps.podeLerAcompanhamento ?? false,
                    caps.podeConsultarProntuario ?? false,
                    caps.podeCriarAgendamento ?? false,
                    caps.podeEnviarCodigoValidacao ?? false,
                    caps.requerValidacaoHumana ?? true,
                    caps.nuncaRespondeCasoVermelhoSemHumano ?? true,
                    caps.podeEscalarSupervisor ?? true,
                    caps.podeRegistrarMemoria ?? true,
                  ];
                  return (
                    <tr key={ag.id} style={{ background: isEven ? CARD_DARK : NAV_DARK }}>
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${BORDER_DARK}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{ag.emoji}</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 10, color: "#E2E8F0" }}>{ag.nomeAgente}</div>
                            <div style={{ fontWeight: 700, fontSize: 8, color: cor }}>{ag.cargo.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      {vals.map((v, i) => (
                        <td key={i} style={{
                          padding: "8px 6px", textAlign: "center",
                          borderBottom: `1px solid ${BORDER_DARK}`,
                        }}>
                          <span style={{
                            fontSize: 12,
                            color: v ? "#10B981" : "#374151",
                          }}>
                            {v ? "✅" : "✕"}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 24, fontSize: 9, color: TEXT_MUTED, letterSpacing: "0.04em", lineHeight: 1.8 }}>
            ✅ = capacidade ativa · ✕ = sem esta capacidade · "Requer Humano" = exige validação humana antes de disparar · "Nunca Vermelho" = nunca responde caso crítico sem humano
          </div>
        </div>
      )}

      {/* ─── TAB 3: PERSONALIDADE ─── */}
      {tab === 3 && (
        <div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 20, letterSpacing: "0.06em" }}>
            DIMENSÕES DE PERSONALIDADE — ESCALAS 0-10 — GRUPO PAWARDS (10 AGENTES)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
            {catalogo.filter(ag => ag.codigoAgente.startsWith("agente_")).map(ag => {
              const pers = PERSONALIDADE_SEED[ag.codigoAgente];
              if (!pers) return null;
              const cor = ag.corSemantica;
              return (
                <div key={ag.id} style={{
                  background: CARD_DARK,
                  border: `1px solid ${cor}33`,
                  borderLeft: `4px solid ${cor}`,
                  padding: "16px 18px",
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 22 }}>{ag.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 12, color: "#E2E8F0" }}>{ag.nomeAgente}</div>
                      <div style={{ fontSize: 9, color: cor, fontWeight: 700 }}>
                        {pers.generoVoz.toUpperCase()} · {pers.estiloConversacao.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <BarraPersonalidade label="FORMALIDADE" valor={pers.formalidade} cor={cor} />
                    <BarraPersonalidade label="EMPATIA" valor={pers.empatia} cor={cor} />
                    <BarraPersonalidade label="AUTORIDADE" valor={pers.autoridade} cor={cor} />
                    <BarraPersonalidade label="OBJETIVIDADE" valor={pers.objetividade} cor={cor} />
                    <BarraPersonalidade label="CALOR HUMANO" valor={pers.calorHumano} cor={cor} />
                    <BarraPersonalidade label="PROATIVIDADE" valor={pers.proatividade} cor={cor} />
                    <BarraPersonalidade label="PACIÊNCIA" valor={pers.paciencia} cor={cor} />
                    <BarraPersonalidade label="HUMANIZAÇÃO" valor={pers.nivelHumanizacao} cor={cor} />
                  </div>

                  <div style={{ background: NAV_DARK, padding: "8px 10px", marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: TEXT_MUTED, marginBottom: 4 }}>TOM GERAL</div>
                    <div style={{ fontSize: 10, color: cor, fontStyle: "italic" }}>{pers.tomGeral}</div>
                  </div>

                  <div style={{ background: NAV_DARK, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: TEXT_MUTED, marginBottom: 4 }}>RESUMO</div>
                    <div style={{ fontSize: 10, color: "#CBD5E1", lineHeight: 1.6 }}>{pers.personalidadeResumo}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 4: FLUXO OPERACIONAL ─── */}
      {tab === 4 && (
        <div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 24, letterSpacing: "0.06em" }}>
            FLUXO OPERACIONAL ALVO — DO GATILHO ATÉ O LOG
          </div>

          {/* FLUXO EM SETAS */}
          <div style={{ background: CARD_DARK, border: `1px solid ${BORDER_DARK}`, padding: "24px 28px", marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#C8920A", letterSpacing: "0.08em", marginBottom: 20 }}>
              ARQUITETURA DE DISPARO — PASSO A PASSO
            </div>
            {[
              { step: "01", label: "GATILHO", desc: "Consulta confirmada / Sessão realizada / SLA vencido / Auditoria programada", cor: "#3B82F6" },
              { step: "02", label: "MOTOR DE EVENTOS", desc: "Avalia qual agente deve atuar com base no tipo de evento e cargo responsável", cor: "#8B5CF6" },
              { step: "03", label: "CONTEXTO", desc: "Agente busca: dados do paciente + sessão + histórico de conversas + memórias contextuais", cor: "#06B6D4" },
              { step: "04", label: "MOTOR DE ESCRITA", desc: "Template de abertura → contexto → informação → orientação → ação + regras TDAH/TOC (máx. 2 frases/bloco, emojis semânticos, quebra de linha obrigatória)", cor: "#14B8A6" },
              { step: "05", label: "VALIDAÇÃO HUMANA", desc: "Se requerValidacaoHumana=true → fila de aprovação → aprovador humano libera → disparo", cor: "#F59E0B", opcional: true },
              { step: "06", label: "DISPATCHER", desc: "WhatsApp via Twilio/Gupshup · Email via Gmail API · SLA startado", cor: "#10B981" },
              { step: "07", label: "RESPOSTA DO PACIENTE", desc: "Motor analisa resposta → redireciona para narrativa correta → ou escalada para supervisor", cor: "#F97316" },
              { step: "08", label: "LOG E MEMÓRIA", desc: "Grava em execucoes_agente + memorias_contextuais_agente + atualiza estado de prontidão", cor: "#EC4899" },
            ].map((s, i, arr) => (
              <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 16, flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36,
                    background: s.cor + "22",
                    border: `2px solid ${s.cor}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 900, color: s.cor,
                  }}>{s.step}</div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, height: 28, background: BORDER_DARK, margin: "3px 0" }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 8 : 0, paddingTop: 6, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 900, fontSize: 11, color: s.cor, letterSpacing: "0.06em" }}>{s.label}</span>
                    {s.opcional && (
                      <span style={{
                        background: "#F59E0B22", color: "#F59E0B",
                        fontSize: 8, fontWeight: 800, padding: "1px 6px",
                      }}>CONDICIONAL</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* GAPS */}
          <div style={{ background: CARD_DARK, border: `1px solid ${BORDER_DARK}`, borderLeft: "4px solid #EF4444", padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#EF4444", letterSpacing: "0.08em", marginBottom: 16 }}>
              GAPS — O QUE AINDA NÃO EXISTE
            </div>
            {[
              { gap: "Motor de disparo", desc: "Nenhum agente dispara WhatsApp real — o campo podeEnviarWhatsapp=true existe mas não tem executor", prioridade: "CRÍTICA" },
              { gap: "Worker de execução", desc: "Tabela execucoes_agente existe mas o consumer (listener de eventos) não foi construído", prioridade: "CRÍTICA" },
              { gap: "Fila de validação humana", desc: "validacoes_humanas_agente existe sem interface de aprovação no frontend", prioridade: "ALTA" },
              { gap: "Motor de memórias", desc: "memorias_contextuais_agente existe sem lógica de gravação e recuperação por paciente", prioridade: "ALTA" },
              { gap: "Consumer de eventos", desc: "eventos_saida_operacionais existe sem consumer que processa os eventos disparados", prioridade: "MÉDIA" },
            ].map((g, i) => (
              <div key={i} style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                padding: "10px 0",
                borderBottom: i < 4 ? `1px solid ${BORDER_DARK}` : "none",
              }}>
                <span style={{
                  background: g.prioridade === "CRÍTICA" ? "#EF444422" : g.prioridade === "ALTA" ? "#F97316" + "22" : "#F59E0B22",
                  color: g.prioridade === "CRÍTICA" ? "#EF4444" : g.prioridade === "ALTA" ? "#F97316" : "#F59E0B",
                  fontSize: 8, fontWeight: 800, padding: "3px 8px", flexShrink: 0,
                }}>{g.prioridade}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 11, color: "#E2E8F0", marginBottom: 3 }}>{g.gap}</div>
                  <div style={{ fontSize: 10, color: TEXT_MUTED, lineHeight: 1.5 }}>{g.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* TABELAS DO SISTEMA */}
          <div style={{ background: CARD_DARK, border: `1px solid ${BORDER_DARK}`, padding: "20px 24px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: TEXT_MUTED, letterSpacing: "0.08em", marginBottom: 16 }}>
              TABELAS DO BANCO — 15 TABELAS NO SISTEMA
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { tabela: "catalogo_agentes", funcao: "Catálogo global — modelo canônico de cada agente" },
                { tabela: "agentes_clinica", funcao: "Instâncias provisionadas por clínica (20 × 5 = 100)" },
                { tabela: "capacidades_agente_clinica", funcao: "13 permissões booleanas por instância" },
                { tabela: "narrativas_agente", funcao: "Roteiros de conversa vinculados ao catálogo" },
                { tabela: "agentes_personalidade", funcao: "14 dimensões de personalidade em escala 0-10" },
                { tabela: "agentes_motor_escrita", funcao: "6 templates + regras de formatação TDAH/TOC" },
                { tabela: "agentes_frases", funcao: "Frases-base editáveis (320 frases)" },
                { tabela: "agentes_regras", funcao: "Regras de operação — SLA, escalonamento" },
                { tabela: "agentes_identidade", funcao: "Identidade visual — nome, email, cor, emoji" },
                { tabela: "execucoes_agente", funcao: "Log de cada execução disparada" },
                { tabela: "acoes_agente", funcao: "Ações individuais dentro de execuções" },
                { tabela: "memorias_contextuais_agente", funcao: "Memórias persistentes por paciente" },
                { tabela: "validacoes_humanas_agente", funcao: "Fila de aprovação humana antes do disparo" },
                { tabela: "eventos_saida_operacionais", funcao: "Eventos disparados pelo motor de eventos" },
                { tabela: "agentes_versionamento", funcao: "Histórico de versões de configurações" },
              ].map((t, i) => (
                <div key={i} style={{
                  background: NAV_DARK, padding: "8px 12px",
                  borderLeft: `2px solid #1E293B`,
                }}>
                  <div style={{ fontWeight: 800, fontSize: 9, color: "#06B6D4", letterSpacing: "0.04em" }}>`{t.tabela}`</div>
                  <div style={{ fontSize: 9, color: TEXT_MUTED, marginTop: 2, lineHeight: 1.4 }}>{t.funcao}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
