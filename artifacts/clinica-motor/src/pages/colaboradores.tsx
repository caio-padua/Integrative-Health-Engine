import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useClinic } from "@/contexts/ClinicContext";
import {
  Users, Shield, TrendingUp, AlertTriangle, Building2, ChevronDown, ChevronRight,
  Mail, Phone, Clock, CheckCircle, XCircle, DollarSign, RefreshCw, Briefcase,
  Eye, Target, Scale, Zap, Bot
} from "lucide-react";

const API = "/api/colaboradores";

const C = {
  red: "#EF4444",
  redD: "#7F1D1D",
  yellow: "#F59E0B",
  yellowD: "#78350F",
  green: "#10B981",
  greenD: "#064E3B",
  blue: "#3B82F6",
  blueD: "#1E3A5F",
  purple: "#8B5CF6",
  purpleD: "#3B0764",
  orange: "#F97316",
  orangeD: "#7C2D12",
  teal: "#14B8A6",
  tealD: "#134E4A",
  pink: "#EC4899",
  pinkD: "#831843",
  gold: "#C8920A",
  goldHi: "#E8B020",
  cyan: "#06B6D4",
  gray: "#475569",
};

const CARGO_CORES: Record<string, string> = {
  MEDICO: C.purple,
  GERENTE: C.gold,
  SUPERVISOR: C.orange,
  ADMINISTRATIVO: C.blue,
  ENFERMAGEM: C.teal,
  CONSULTOR: C.cyan,
  FINANCEIRO: C.green,
  OUVIDORIA: C.pink,
};

const DISC_CORES: Record<string, string> = {
  ADVERTENCIA_VERBAL: C.yellow,
  ADVERTENCIA_ESCRITA: C.orange,
  PLANO_DE_CORRECAO: C.orange,
  SUSPENSAO: C.red,
  JUSTA_CAUSA: C.redD,
};

interface Member {
  id: number;
  nomeCompleto: string;
  cargo: string;
  indice: string;
  codigoCompleto: string;
  modalidade: string;
  unidadeId: number;
  unidadeNome: string;
  emailFuncional: string;
  telefone: string;
  dataAdmissao: string;
  statusAtivo: boolean;
  slaDefault: string;
  reportaA: string;
  quandoReporta: string;
  descricaoFuncao: string;
  objetivos: string;
  metasPrincipais: string[];
  direitos: string[];
  deveres: string[];
  advertenciaTriggers: string[];
  demissaoTriggers: string[];
  justaCausaTriggers: string[];
}

interface Commission {
  id: number;
  membroNome: string;
  cargo: string;
  codigoCompleto: string;
  categoria: string;
  valorBase: number;
  multiplicador: number;
  valorFinal: number;
  status: string;
  periodoReferencia: string;
  criadoEm: string;
}

interface CommissionResumo {
  membroId: number;
  membroNome: string;
  cargo: string;
  codigoCompleto: string;
  totalComissoes: number;
  valorTotal: string;
}

interface Disciplinary {
  id: number;
  membroNome: string;
  cargo: string;
  codigoCompleto: string;
  nivel: string;
  fundamentacaoClt: string;
  motivo: string;
  triggers: string[];
  validadeDias: number;
  dataExpiracao: string;
  status: string;
  criadoEm: string;
}

interface Position {
  id: number;
  cargo: string;
  indice: string;
  codigoCompleto: string;
  modalidade: string;
  slaDefault: string;
  reportaA: string;
  quandoReporta: string;
  descricaoFuncao: string;
  objetivos: string;
  metasPrincipais: string[];
  direitos: string[];
  deveres: string[];
  advertenciaTriggers: string[];
  demissaoTriggers: string[];
  justaCausaTriggers: string[];
  unidadeNome: string;
  podeSupervisionarOutros: boolean;
  podeAuditarCards: boolean;
  podeAprovarDespesas: boolean;
  podeEditarProtocolos: boolean;
  podeAcessarFinanceiro: boolean;
  podeVerOuvidoria: boolean;
}

function IdentityCard({ member, expanded, onToggle }: { member: Member; expanded: boolean; onToggle: () => void }) {
  const cor = CARGO_CORES[member.cargo] || C.gray;
  const [subTab, setSubTab] = useState(0);
  const SUB_TABS = ["FUNCAO", "METAS", "DIREITOS", "DEVERES", "REGUA"];

  return (
    <div className="border overflow-hidden" style={{ borderColor: cor + "40", borderWidth: "1px" }}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
        style={{ background: cor + "08" }}
        onClick={onToggle}
      >
        <div className="w-10 h-10 flex items-center justify-center text-sm font-black flex-shrink-0" style={{ backgroundColor: cor, color: "#fff" }}>
          {member.indice}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-foreground truncate">{member.nomeCompleto}</span>
            <span className="text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider" style={{ backgroundColor: cor + "20", color: cor, border: `1px solid ${cor}33` }}>
              {member.codigoCompleto}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 font-bold tracking-wider" style={{ backgroundColor: member.modalidade === "presencial" ? C.blue + "15" : C.cyan + "15", color: member.modalidade === "presencial" ? C.blue : C.cyan }}>
              {member.modalidade?.toUpperCase()}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{member.cargo} — {member.unidadeNome || "Global"}</div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-shrink-0">
          {member.slaDefault && (
            <span className="flex items-center gap-1 font-bold" style={{ color: C.yellow }}>
              <Clock className="w-3 h-3" /> SLA {member.slaDefault}
            </span>
          )}
          {member.statusAtivo ? (
            <span className="px-1.5 py-0.5 text-[9px] font-black" style={{ backgroundColor: C.green + "20", color: C.green }}>ATIVO</span>
          ) : (
            <span className="px-1.5 py-0.5 text-[9px] font-black" style={{ backgroundColor: C.red + "20", color: C.red }}>INATIVO</span>
          )}
          <span className="text-[9px] text-muted-foreground">Reporta: <span className="font-bold" style={{ color: cor }}>{member.reportaA || "—"}</span></span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div>
          <div className="px-4 py-2 flex gap-3 flex-wrap text-[10px]" style={{ background: cor + "05", borderTop: `1px solid ${cor}15`, borderBottom: `1px solid ${cor}15` }}>
            <div>
              <span className="text-muted-foreground uppercase tracking-widest font-bold text-[9px]">QUANDO REPORTA</span>
              <div className="text-foreground font-medium mt-0.5">{member.quandoReporta || "—"}</div>
            </div>
            {member.emailFuncional && (
              <div>
                <span className="text-muted-foreground uppercase tracking-widest font-bold text-[9px]">EMAIL</span>
                <div className="text-foreground font-medium mt-0.5 flex items-center gap-1"><Mail className="w-3 h-3" style={{ color: C.blue }} /> {member.emailFuncional}</div>
              </div>
            )}
            {member.telefone && (
              <div>
                <span className="text-muted-foreground uppercase tracking-widest font-bold text-[9px]">TELEFONE</span>
                <div className="text-foreground font-medium mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" style={{ color: C.green }} /> {member.telefone}</div>
              </div>
            )}
          </div>

          <div className="flex border-b" style={{ borderColor: cor + "20" }}>
            {SUB_TABS.map((t, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setSubTab(i); }}
                className="px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  borderBottom: subTab === i ? `2px solid ${cor}` : "2px solid transparent",
                  color: subTab === i ? cor : C.gray,
                  background: "transparent",
                }}
              >{t}</button>
            ))}
          </div>

          <div className="px-4 py-3 min-h-[100px]">
            {subTab === 0 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest font-black" style={{ color: cor }}>FUNCAO EM 1 LINHA</div>
                <div className="text-sm text-foreground font-bold leading-relaxed" style={{ borderLeft: `3px solid ${cor}`, paddingLeft: "12px" }}>
                  {member.descricaoFuncao || "—"}
                </div>
                {member.objetivos && (
                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-1">OBJETIVOS</div>
                    <div className="text-xs text-foreground/80">{member.objetivos}</div>
                  </div>
                )}
              </div>
            )}

            {subTab === 1 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest font-black" style={{ color: cor }}>METAS PRINCIPAIS</div>
                {(member.metasPrincipais || []).map((meta, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ border: `2px solid ${cor}`, borderRadius: "3px" }}>
                      <div className="w-2 h-2" style={{ backgroundColor: cor, borderRadius: "1px" }} />
                    </div>
                    <span className="text-xs text-foreground leading-relaxed">{meta}</span>
                  </div>
                ))}
              </div>
            )}

            {subTab === 2 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest font-black" style={{ color: C.green }}>DIREITOS DO COLABORADOR</div>
                {(member.direitos || []).map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: C.green }} />
                    <span className="text-xs text-foreground leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>
            )}

            {subTab === 3 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest font-black" style={{ color: C.orange }}>DEVERES FORMAIS</div>
                {(member.deveres || []).map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs flex-shrink-0 mt-0.5 font-bold" style={{ color: C.orange }}>&#x203A;</span>
                    <span className="text-xs text-foreground leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>
            )}

            {subTab === 4 && (
              <div className="space-y-3">
                {(member.advertenciaTriggers || []).length > 0 && (
                  <div className="p-3" style={{ background: C.yellowD + "22", border: `1px solid ${C.yellow}33`, borderLeft: `3px solid ${C.yellow}` }}>
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: C.yellow }}>ADVERTENCIA (gera registro formal)</div>
                    {member.advertenciaTriggers.map((a, i) => (
                      <div key={i} className="text-xs text-foreground/90 mb-1 flex items-start gap-1.5">
                        <span style={{ color: C.yellow }}>&#x2022;</span> {a}
                      </div>
                    ))}
                  </div>
                )}
                {(member.demissaoTriggers || []).length > 0 && (
                  <div className="p-3" style={{ background: C.red + "08", border: `1px solid ${C.red}33`, borderLeft: `3px solid ${C.red}` }}>
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: C.red }}>DESLIGAMENTO SEM JUSTA CAUSA</div>
                    {member.demissaoTriggers.map((a, i) => (
                      <div key={i} className="text-xs text-foreground/90 mb-1 flex items-start gap-1.5">
                        <span style={{ color: C.red }}>&#x2022;</span> {a}
                      </div>
                    ))}
                  </div>
                )}
                {(member.justaCausaTriggers || []).length > 0 && (
                  <div className="p-3" style={{ background: C.redD + "33", border: `1px solid ${C.red}55`, borderLeft: `3px solid ${C.red}` }}>
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: C.red }}>JUSTA CAUSA (Art. 482 CLT)</div>
                    {member.justaCausaTriggers.map((a, i) => (
                      <div key={i} className="text-xs text-foreground/90 mb-1 flex items-start gap-1.5">
                        <span style={{ color: C.red }}>&#x2022;</span> {a}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrgNode({ member, allMembers, depth = 0 }: { member: Member; allMembers: Member[]; depth?: number }) {
  const cor = CARGO_CORES[member.cargo] || C.gray;
  const subordinados = allMembers.filter(m => m.reportaA === member.codigoCompleto);

  return (
    <div style={{ marginLeft: depth * 28 }}>
      <div className="flex items-center gap-2 py-2 px-3 transition-all border-l-[3px] my-0.5" style={{ borderLeftColor: cor, background: cor + "06" }}>
        <div className="w-7 h-7 flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{ backgroundColor: cor, color: "#fff" }}>
          {member.indice}
        </div>
        <span className="text-xs font-bold text-foreground">{member.nomeCompleto}</span>
        <span className="text-[9px] px-1.5 py-0.5 font-black" style={{ backgroundColor: cor + "15", color: cor, border: `1px solid ${cor}25` }}>{member.codigoCompleto}</span>
        <span className="text-[9px] font-medium" style={{ color: member.modalidade === "presencial" ? C.blue : C.cyan }}>{member.modalidade}</span>
        {member.slaDefault && <span className="text-[9px] font-bold ml-auto" style={{ color: C.yellow }}>SLA {member.slaDefault}</span>}
      </div>
      {subordinados.map(sub => (
        <OrgNode key={sub.id} member={sub} allMembers={allMembers} depth={depth + 1} />
      ))}
    </div>
  );
}

function ColorLegend() {
  const items = [
    { label: "VERMELHO", hex: C.red, meaning: "ACAO AGORA. SLA vencido. Justa causa.", never: "Usar para informacao neutra" },
    { label: "AMARELO", hex: C.yellow, meaning: "ATENCAO. SLA chegando. Advertencia.", never: "Usar para concluido" },
    { label: "VERDE", hex: C.green, meaning: "OK. Concluido. Validado. Saudavel.", never: "Usar para urgente" },
    { label: "AZUL", hex: C.blue, meaning: "ADMINISTRATIVO. Agenda. Informacao.", never: "Usar para clinico" },
    { label: "ROXO", hex: C.purple, meaning: "CLINICO / MEDICO. Homologacao.", never: "Usar para admin" },
    { label: "LARANJA", hex: C.orange, meaning: "SUPERVISAO / SLA. Cobranca.", never: "Usar para enfermagem" },
    { label: "TEAL", hex: C.teal, meaning: "ENFERMAGEM. Execucao clinica.", never: "Usar para financeiro" },
    { label: "PINK", hex: C.pink, meaning: "OUVIDORIA. Canal protegido.", never: "Usar para agenda" },
    { label: "OURO", hex: C.gold, meaning: "DIRETOR / TITULO. Oficial.", never: "Usar para operacional" },
    { label: "CINZA", hex: C.gray, meaning: "ARQUIVADO. Historico.", never: "Usar para urgente" },
  ];

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((c, i) => (
        <div key={i} className="flex items-start gap-2 p-2" style={{ background: c.hex + "08", borderLeft: `4px solid ${c.hex}` }}>
          <div className="w-5 h-5 flex-shrink-0" style={{ backgroundColor: c.hex }} />
          <div>
            <div className="text-[10px] font-black tracking-wider" style={{ color: c.hex }}>{c.label}</div>
            <div className="text-[10px] text-foreground/80">{c.meaning}</div>
            <div className="text-[9px]" style={{ color: C.red }}>NUNCA: {c.never}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ColaboradoresPage() {
  const { selectedUnidade } = useClinic();
  const [tab, setTab] = useState<"equipe" | "organograma" | "posicoes" | "comissoes" | "disciplinar" | "semantica">("equipe");
  const [members, setMembers] = useState<Member[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commResumo, setCommResumo] = useState<CommissionResumo[]>([]);
  const [disciplinary, setDisciplinary] = useState<Disciplinary[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [cargoFilter, setCargoFilter] = useState<string>("");

  const unidadeParam = selectedUnidade?.id ? `?unidadeId=${selectedUnidade.id}` : "";

  const fetchAll = useCallback(async () => {
    const [mRes, pRes, cRes, crRes, dRes] = await Promise.all([
      fetch(`${API}/members${unidadeParam}`),
      fetch(`${API}/positions${unidadeParam}`),
      fetch(`${API}/commissions${unidadeParam}`),
      fetch(`${API}/commissions/resumo${unidadeParam}`),
      fetch(`${API}/disciplinary${unidadeParam}`),
    ]);
    if (mRes.ok) setMembers(await mRes.json());
    if (pRes.ok) setPositions(await pRes.json());
    if (cRes.ok) setCommissions(await cRes.json());
    if (crRes.ok) setCommResumo(await crRes.json());
    if (dRes.ok) setDisciplinary(await dRes.json());
  }, [unidadeParam]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const seedData = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${API}/seed`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const json = await res.json();
      alert(json.mensagem || json.error);
      fetchAll();
    } catch { alert("Erro ao semear dados"); }
    setSeeding(false);
  };

  const cargosUnicos = [...new Set(members.map(m => m.cargo))].sort();
  const filteredMembers = cargoFilter ? members.filter(m => m.cargo === cargoFilter) : members;

  const TABS = [
    { key: "equipe" as const, label: "EQUIPE", icon: Users },
    { key: "organograma" as const, label: "ORGANOGRAMA", icon: Building2 },
    { key: "posicoes" as const, label: "POSICOES & FUNCOES", icon: Briefcase },
    { key: "comissoes" as const, label: "COMISSOES", icon: DollarSign },
    { key: "disciplinar" as const, label: "DISCIPLINAR", icon: AlertTriangle },
    { key: "semantica" as const, label: "SEMANTICA", icon: Eye },
  ];

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black flex items-center gap-2 tracking-wide">
              <Shield className="w-5 h-5" style={{ color: C.gold }} />
              <span style={{ color: C.goldHi }}>COLABORADORES & RH</span>
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider">
              MANIFESTO DR. CLAUDE — Identity Cards, Metas, Comissoes, Regua Disciplinar CLT
            </p>
          </div>
          <div className="flex items-center gap-2">
            {members.length === 0 && (
              <button onClick={seedData} disabled={seeding}
                className="flex items-center gap-1.5 text-[10px] font-black px-3 py-2 tracking-wider transition-all"
                style={{ backgroundColor: C.gold, color: "#fff" }}>
                <RefreshCw className={`w-3 h-3 ${seeding ? "animate-spin" : ""}`} />
                {seeding ? "SEMEANDO..." : "POPULAR DADOS"}
              </button>
            )}
            <button onClick={fetchAll} className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 border border-border/30 text-muted-foreground hover:text-foreground transition-all tracking-wider">
              <RefreshCw className="w-3 h-3" /> ATUALIZAR
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "TOTAL MEMBROS", value: members.length, cor: C.blue },
            { label: "POSICOES", value: positions.length, cor: C.purple },
            { label: "COMISSOES (MES)", value: `R$ ${commResumo.reduce((s, c) => s + Number(c.valorTotal || 0), 0).toFixed(0)}`, cor: C.green },
            { label: "COMISSOES PENDENTES", value: commissions.filter(c => c.status === "pendente").length, cor: C.yellow },
            { label: "OCORRENCIAS", value: disciplinary.length, cor: C.red },
          ].map((s, i) => (
            <div key={i} className="p-3" style={{ background: s.cor + "08", borderLeft: `3px solid ${s.cor}`, border: `1px solid ${s.cor}20` }}>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-black mt-1" style={{ color: s.cor }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-0.5" style={{ borderBottom: `2px solid ${C.gold}20` }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all"
              style={{
                borderBottom: tab === t.key ? `3px solid ${C.goldHi}` : "3px solid transparent",
                color: tab === t.key ? C.goldHi : C.gray,
              }}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "equipe" && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setCargoFilter("")}
                className="text-[10px] font-black px-3 py-1.5 tracking-wider transition-all"
                style={!cargoFilter ? { backgroundColor: C.gold, color: "#fff" } : { backgroundColor: C.gray + "15", color: C.gray }}>
                TODOS
              </button>
              {cargosUnicos.map(cargo => {
                const cor = CARGO_CORES[cargo] || C.gray;
                return (
                  <button key={cargo} onClick={() => setCargoFilter(cargo)}
                    className="text-[10px] font-black px-3 py-1.5 flex items-center gap-1.5 tracking-wider transition-all"
                    style={cargoFilter === cargo ? { backgroundColor: cor, color: "#fff" } : { backgroundColor: cor + "12", color: cor, border: `1px solid ${cor}25` }}
                  >
                    <div className="w-2 h-2" style={{ backgroundColor: cor }} />
                    {cargo} ({members.filter(m => m.cargo === cargo).length})
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5">
              {filteredMembers.map(m => (
                <IdentityCard key={m.id} member={m} expanded={expandedId === m.id} onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)} />
              ))}
              {filteredMembers.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-12">Nenhum colaborador encontrado</div>
              )}
            </div>
          </div>
        )}

        {tab === "organograma" && (
          <div className="space-y-4">
            <div className="text-[10px] text-muted-foreground tracking-wider font-bold">ARVORE HIERARQUICA — LINHA DE REPORTE POR UNIDADE</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(CARGO_CORES).map(([cargo, cor]) => (
                <div key={cargo} className="flex items-center gap-1.5 text-[9px] font-bold" style={{ color: cor }}>
                  <div className="w-3 h-3" style={{ backgroundColor: cor }} /> {cargo}
                </div>
              ))}
            </div>
            {members.length > 0 ? (
              <div className="p-4 space-y-0.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                {members.filter(m => m.reportaA === "—" || !m.reportaA).map(m => (
                  <OrgNode key={m.id} member={m} allMembers={members} />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-12">Sem dados para exibir</div>
            )}
          </div>
        )}

        {tab === "posicoes" && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground tracking-wider font-bold mb-2">TODAS AS POSICOES — CARGO, FUNCAO, SLA, METAS, PERMISSOES, DIREITOS, DEVERES, REGUA CLT</div>
            {positions.map(p => {
              const cor = CARGO_CORES[p.cargo] || C.gray;
              return (
                <div key={p.id} className="border overflow-hidden" style={{ borderColor: cor + "30" }}>
                  <div className="px-4 py-3" style={{ background: cor + "08", borderBottom: `1px solid ${cor}20` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center text-sm font-black" style={{ backgroundColor: cor, color: "#fff" }}>
                        {p.indice}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black" style={{ color: cor }}>{p.cargo}</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5" style={{ backgroundColor: cor + "15", color: cor, border: `1px solid ${cor}25` }}>{p.codigoCompleto}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5" style={{ color: p.modalidade === "presencial" ? C.blue : C.cyan, backgroundColor: p.modalidade === "presencial" ? C.blue + "12" : C.cyan + "12" }}>{p.modalidade}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {p.unidadeNome} — Reporta: <span className="font-bold" style={{ color: cor }}>{p.reportaA || "—"}</span> — SLA: <span className="font-bold" style={{ color: C.yellow }}>{p.slaDefault || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {p.descricaoFuncao && (
                      <div className="text-xs text-foreground/90 font-medium" style={{ borderLeft: `3px solid ${cor}`, paddingLeft: "10px" }}>{p.descricaoFuncao}</div>
                    )}
                    {p.metasPrincipais && p.metasPrincipais.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.metasPrincipais.map((meta: string, i: number) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 font-bold" style={{ backgroundColor: C.green + "10", color: C.green, border: `1px solid ${C.green}20` }}>{meta}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {p.podeSupervisionarOutros && <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: C.orange + "15", color: C.orange }}>Supervisionar</span>}
                      {p.podeAuditarCards && <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: C.orange + "15", color: C.orange }}>Auditar Cards</span>}
                      {p.podeAprovarDespesas && <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: C.gold + "15", color: C.gold }}>Aprovar Despesas</span>}
                      {p.podeEditarProtocolos && <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: C.purple + "15", color: C.purple }}>Editar Protocolos</span>}
                      {p.podeAcessarFinanceiro && <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: C.green + "15", color: C.green }}>Financeiro</span>}
                      {p.podeVerOuvidoria && <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: C.pink + "15", color: C.pink }}>Ouvidoria</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "comissoes" && (
          <div className="space-y-4">
            <div className="text-[10px] text-muted-foreground tracking-wider font-bold">
              COMISSAO CALCULADA SOBRE RESOLUCAO VALIDADA — NAO VOLUME. BLOQUEIOS POR ADVERTENCIA OU SLA VENCIDO.
            </div>

            <div className="text-xs font-black tracking-wider mb-2" style={{ color: C.green }}>RESUMO POR COLABORADOR</div>
            <div className="space-y-1">
              {commResumo.map((cr, i) => {
                const cor = CARGO_CORES[cr.cargo] || C.gray;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5" style={{ background: cor + "06", borderLeft: `3px solid ${cor}`, border: `1px solid ${cor}15` }}>
                    <div className="w-7 h-7 flex items-center justify-center text-[9px] font-black" style={{ backgroundColor: cor, color: "#fff" }}>{cr.codigoCompleto?.slice(-2)}</div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-foreground">{cr.membroNome}</div>
                      <div className="text-[10px] text-muted-foreground">{cr.cargo} — {cr.codigoCompleto}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black" style={{ color: C.green }}>R$ {Number(cr.valorTotal || 0).toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">{cr.totalComissoes} evento(s)</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs font-black tracking-wider mt-6 mb-2" style={{ color: C.cyan }}>DETALHAMENTO</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.gold}20` }} className="text-muted-foreground">
                    <th className="text-left py-2 px-3 font-black tracking-wider text-[10px]">COLABORADOR</th>
                    <th className="text-left py-2 px-3 font-black tracking-wider text-[10px]">CATEGORIA</th>
                    <th className="text-right py-2 px-3 font-black tracking-wider text-[10px]">BASE</th>
                    <th className="text-right py-2 px-3 font-black tracking-wider text-[10px]">MULT.</th>
                    <th className="text-right py-2 px-3 font-black tracking-wider text-[10px]">FINAL</th>
                    <th className="text-center py-2 px-3 font-black tracking-wider text-[10px]">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.slice(0, 50).map(c => {
                    const cor = CARGO_CORES[c.cargo] || C.gray;
                    return (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${cor}10` }} className="hover:bg-white/[0.02]">
                        <td className="py-2 px-3">
                          <div className="font-bold">{c.membroNome}</div>
                          <div className="text-muted-foreground text-[10px]">{c.codigoCompleto}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ backgroundColor: cor + "12", color: cor }}>{c.categoria?.replace(/_/g, " ")}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">R$ {c.valorBase?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: c.multiplicador > 1 ? C.gold : C.gray }}>{c.multiplicador?.toFixed(1)}x</td>
                        <td className="py-2 px-3 text-right font-bold" style={{ color: C.green }}>R$ {c.valorFinal?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[9px] px-1.5 py-0.5 font-black uppercase tracking-wider"
                            style={{
                              backgroundColor: c.status === "aprovada" ? C.green + "15" : c.status === "pendente" ? C.yellow + "15" : C.red + "15",
                              color: c.status === "aprovada" ? C.green : c.status === "pendente" ? C.yellow : C.red,
                            }}>{c.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "disciplinar" && (
          <div className="space-y-4">
            <div className="text-[10px] text-muted-foreground tracking-wider font-bold">
              REGISTRO FORMAL COM BASE CLT — ESCALA PROGRESSIVA OBRIGATORIA
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[
                { nivel: "ADVERTENCIA VERBAL", cor: C.yellow, clt: "—", validade: "90 dias", desc: "1a ocorrencia. Registro formal obrigatorio." },
                { nivel: "ADVERTENCIA ESCRITA", cor: C.orange, clt: "—", validade: "12 meses", desc: "2a ocorrencia ou gravidade media." },
                { nivel: "PLANO DE CORRECAO", cor: C.orange, clt: "—", validade: "30-90 dias", desc: "Metas especificas com prazo." },
                { nivel: "SUSPENSAO", cor: C.red, clt: "Art. 474 CLT", validade: "Permanente", desc: "Maximo 30 dias corridos." },
                { nivel: "JUSTA CAUSA", cor: C.redD, clt: "Art. 482 CLT", validade: "Permanente", desc: "Desligamento imediato." },
              ].map((d, i) => (
                <div key={i} className="p-3" style={{ background: d.cor + "08", borderLeft: `4px solid ${d.cor}`, border: `1px solid ${d.cor}20` }}>
                  <div className="text-[10px] font-black tracking-wider" style={{ color: d.cor }}>{d.nivel}</div>
                  <div className="text-[9px] text-muted-foreground mt-1 font-bold">{d.clt}</div>
                  <div className="text-[9px] text-muted-foreground">Validade: {d.validade}</div>
                  <div className="text-[9px] text-foreground/60 mt-1">{d.desc}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2 mt-4">
              {disciplinary.map(d => {
                const cor = DISC_CORES[d.nivel] || C.yellow;
                const cargoCor = CARGO_CORES[d.cargo] || C.gray;
                return (
                  <div key={d.id} className="p-4" style={{ background: cor + "06", borderLeft: `4px solid ${cor}`, border: `1px solid ${cor}20` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-wider" style={{ color: cor }}>{d.nivel?.replace(/_/g, " ")}</span>
                        <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: cargoCor + "15", color: cargoCor }}>{d.codigoCompleto}</span>
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 tracking-wider"
                        style={{ backgroundColor: d.status === "ativa" ? C.red + "15" : C.gray + "15", color: d.status === "ativa" ? C.red : C.gray }}>
                        {d.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground">{d.membroNome}</div>
                    <div className="text-xs text-foreground/70 mt-1" style={{ borderLeft: `2px solid ${cor}40`, paddingLeft: "8px" }}>{d.motivo}</div>
                    {d.fundamentacaoClt && <div className="text-[10px] text-muted-foreground mt-2 font-bold">CLT: {d.fundamentacaoClt}</div>}
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                      {d.validadeDias && <span>Validade: {d.validadeDias} dias</span>}
                      <span>Registrado: {new Date(d.criadoEm).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                );
              })}
              {disciplinary.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-12">Nenhuma ocorrencia disciplinar registrada</div>
              )}
            </div>
          </div>
        )}

        {tab === "semantica" && (
          <div className="space-y-4">
            <div className="p-4" style={{ background: C.gold + "08", border: `1px solid ${C.gold}30`, borderLeft: `4px solid ${C.gold}` }}>
              <div className="text-xs font-black tracking-wider" style={{ color: C.goldHi }}>SEMANTICA DE CORES — SISTEMA IMUTAVEL</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Cada cor tem <span className="font-bold text-foreground">UM unico significado</span> em TODO o sistema. Nunca reutilizar com outro sentido.
              </div>
            </div>
            <ColorLegend />

            <div className="p-4 mt-4" style={{ background: C.purple + "08", border: `1px solid ${C.purple}30`, borderLeft: `4px solid ${C.purple}` }}>
              <div className="text-xs font-black tracking-wider" style={{ color: C.purple }}>PRINCIPIOS TDAH + TOC — LEIS VISUAIS</div>
              <div className="text-[10px] text-muted-foreground mt-1">Cerebro TDAH: cor como sinal primario. Cerebro TOC: consistencia absoluta.</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { titulo: "1 CARD = 1 ACAO", desc: "Card com 2 tarefas = 2 cards. TDAH nao processa lista dentro de card.", cor: C.red },
                { titulo: "VERBO PRIMEIRO NO TITULO", desc: "LIGAR, CONFIRMAR, ESCALAR, REGISTRAR, GERAR. Nunca substantivo primeiro.", cor: C.orange },
                { titulo: "COVER DE COR = SEMAFORO", desc: "Vermelho solido = acao agora. Amarelo = atencao. Verde = feito.", cor: C.yellow },
                { titulo: "LISTA MAIS IMPORTANTE A ESQUERDA", desc: "Olho percorre da esquerda para direita. Urgente SEMPRE na posicao 1.", cor: C.blue },
                { titulo: "ORDEM DAS LISTAS E LEI", desc: "Urgente, Atencao, Fila do Dia, Aguardando, Escalado, Concluido. NUNCA mudar.", cor: C.purple },
                { titulo: "CHECKLISTS MAX 5 ITENS", desc: "Mais de 5 = dividir em cards menores. TDAH perde foco com lista longa.", cor: C.teal },
                { titulo: "DUE DATE SEMPRE VISIVEL", desc: "Todo card operacional com data de vencimento. Sem prazo = nao e card.", cor: C.green },
                { titulo: "LABELS PADRONIZADAS", desc: "Labels existentes: nunca criar nova sem aprovacao do gerente01.", cor: C.gold },
              ].map((p, i) => (
                <div key={i} className="p-3" style={{ background: p.cor + "06", borderLeft: `3px solid ${p.cor}`, border: `1px solid ${p.cor}15` }}>
                  <div className="text-[10px] font-black tracking-wider" style={{ color: p.cor }}>{p.titulo}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{p.desc}</div>
                </div>
              ))}
            </div>

            <div className="p-4 mt-4" style={{ background: C.cyan + "08", border: `1px solid ${C.cyan}30`, borderLeft: `4px solid ${C.cyan}` }}>
              <div className="text-xs font-black tracking-wider" style={{ color: C.cyan }}>BRACOS PARA IA — AGENT HOOKS</div>
              <div className="text-[10px] text-muted-foreground mt-1">Tabelas preparadas para automacoes futuras com Claude Managed Agents e subagentes.</div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { titulo: "agent_actions", desc: "Log de todas as acoes executadas por agentes IA. Tipo, target, input/output, tempo de execucao.", cor: C.cyan, icon: Bot },
                { titulo: "sla_monitoring", desc: "Monitoramento em tempo real de SLAs. Alertas amarelo/vermelho automaticos. Escalacao programatica.", cor: C.orange, icon: Zap },
                { titulo: "task_validations", desc: "Validacoes cruzadas por supervisor. Nota do paciente. Divergencia detectada.", cor: C.purple, icon: Scale },
              ].map((h, i) => (
                <div key={i} className="p-3" style={{ background: h.cor + "08", borderLeft: `3px solid ${h.cor}`, border: `1px solid ${h.cor}20` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <h.icon className="w-3.5 h-3.5" style={{ color: h.cor }} />
                    <span className="text-[10px] font-black tracking-wider font-mono" style={{ color: h.cor }}>{h.titulo}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-relaxed">{h.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
