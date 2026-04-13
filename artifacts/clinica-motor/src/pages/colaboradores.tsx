import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useClinic } from "@/contexts/ClinicContext";
import {
  Users, Shield, TrendingUp, AlertTriangle, Building2, ChevronDown, ChevronRight,
  Mail, Phone, Clock, CheckCircle, XCircle, DollarSign, RefreshCw, Briefcase
} from "lucide-react";

const API = "/api/colaboradores";

const CARGO_CORES: Record<string, string> = {
  MEDICO: "#A78BFA",
  GERENTE: "#60A5FA",
  SUPERVISOR: "#F59E0B",
  ADMINISTRATIVO: "#3B82F6",
  ENFERMAGEM: "#2DD4BF",
  CONSULTOR: "#22D3EE",
  FINANCEIRO: "#4ADE80",
  OUVIDORIA: "#F472B6",
};

const DISC_CORES: Record<string, string> = {
  ADVERTENCIA_VERBAL: "#EAB308",
  ADVERTENCIA_ESCRITA: "#F59E0B",
  PLANO_DE_CORRECAO: "#F97316",
  SUSPENSAO: "#EF4444",
  JUSTA_CAUSA: "#7F1D1D",
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
  descricaoFuncao: string;
  objetivos: string;
  metasPrincipais: string[];
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
  descricaoFuncao: string;
  objetivos: string;
  metasPrincipais: string[];
  unidadeNome: string;
  podeSupervisionarOutros: boolean;
  podeAuditarCards: boolean;
  podeAprovarDespesas: boolean;
  podeEditarProtocolos: boolean;
  podeAcessarFinanceiro: boolean;
  podeVerOuvidoria: boolean;
}

function MemberCard({ member, expanded, onToggle }: { member: Member; expanded: boolean; onToggle: () => void }) {
  const cor = CARGO_CORES[member.cargo] || "#64748B";

  return (
    <div className="border border-border/30 bg-card/50">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/10 transition-all"
        onClick={onToggle}
      >
        <div className="w-8 h-8 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: cor + "20", color: cor, border: `1px solid ${cor}40` }}>
          {member.indice}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground truncate">{member.nomeCompleto}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 uppercase" style={{ backgroundColor: cor + "20", color: cor }}>{member.codigoCompleto}</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-muted/30 text-muted-foreground">{member.modalidade}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{member.cargo} — {member.unidadeNome || "Global"}</div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {member.slaDefault && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> SLA {member.slaDefault}</span>
          )}
          {member.statusAtivo ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-red-400" />
          )}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/20 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Contato</div>
              {member.emailFuncional && (
                <div className="text-xs text-foreground flex items-center gap-1.5"><Mail className="w-3 h-3 text-blue-400" /> {member.emailFuncional}</div>
              )}
              {member.telefone && (
                <div className="text-xs text-foreground flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3 text-emerald-400" /> {member.telefone}</div>
              )}
              {member.dataAdmissao && (
                <div className="text-xs text-muted-foreground mt-1">Admissao: {member.dataAdmissao}</div>
              )}
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hierarquia</div>
              <div className="text-xs text-foreground">Reporta a: <span className="font-bold" style={{ color: cor }}>{member.reportaA || "—"}</span></div>
              <div className="text-xs text-muted-foreground mt-1">SLA padrao: {member.slaDefault || "N/A"}</div>
            </div>
          </div>

          {member.descricaoFuncao && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Funcao</div>
              <div className="text-xs text-foreground/80">{member.descricaoFuncao}</div>
            </div>
          )}

          {member.objetivos && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Objetivos</div>
              <div className="text-xs text-foreground/80">{member.objetivos}</div>
            </div>
          )}

          {member.metasPrincipais && member.metasPrincipais.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Metas Principais</div>
              <div className="space-y-1">
                {member.metasPrincipais.map((meta: string, i: number) => (
                  <div key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{meta}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrgNode({ member, allMembers, depth = 0 }: { member: Member; allMembers: Member[]; depth?: number }) {
  const cor = CARGO_CORES[member.cargo] || "#64748B";
  const subordinados = allMembers.filter(m => m.reportaA === member.codigoCompleto);

  return (
    <div style={{ marginLeft: depth * 24 }}>
      <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/10 transition-all border-l-2" style={{ borderLeftColor: cor }}>
        <div className="w-6 h-6 flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: cor + "20", color: cor }}>
          {member.indice}
        </div>
        <span className="text-xs font-bold text-foreground">{member.nomeCompleto}</span>
        <span className="text-[9px] px-1 py-0.5 font-bold" style={{ backgroundColor: cor + "15", color: cor }}>{member.codigoCompleto}</span>
        <span className="text-[9px] text-muted-foreground">{member.modalidade}</span>
      </div>
      {subordinados.map(sub => (
        <OrgNode key={sub.id} member={sub} allMembers={allMembers} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function ColaboradoresPage() {
  const { selectedUnidade } = useClinic();
  const [tab, setTab] = useState<"equipe" | "organograma" | "posicoes" | "comissoes" | "disciplinar">("equipe");
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

  const topMembers = allMembers => allMembers.filter(m => m.reportaA === "—" || !m.reportaA);

  const TABS = [
    { key: "equipe" as const, label: "Equipe", icon: Users },
    { key: "organograma" as const, label: "Organograma", icon: Building2 },
    { key: "posicoes" as const, label: "Posicoes & Funcoes", icon: Briefcase },
    { key: "comissoes" as const, label: "Comissoes", icon: DollarSign },
    { key: "disciplinar" as const, label: "Disciplinar", icon: AlertTriangle },
  ];

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Colaboradores & RH</h1>
            <p className="text-xs text-muted-foreground mt-1">Posicoes, funcoes, metas, comissoes e disciplinar — somente leitura para colaboradores</p>
          </div>
          <div className="flex items-center gap-2">
            {members.length === 0 && (
              <button onClick={seedData} disabled={seeding}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                <RefreshCw className={`w-3 h-3 ${seeding ? "animate-spin" : ""}`} />
                {seeding ? "Semeando..." : "Popular Dados Ficticios"}
              </button>
            )}
            <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs px-3 py-2 border border-border/30 text-muted-foreground hover:text-foreground transition-all">
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="border border-border/30 bg-card/50 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Membros</div>
            <div className="text-2xl font-bold text-foreground mt-1">{members.length}</div>
          </div>
          <div className="border border-border/30 bg-card/50 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Posicoes</div>
            <div className="text-2xl font-bold text-foreground mt-1">{positions.length}</div>
          </div>
          <div className="border border-border/30 bg-card/50 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Comissoes (Mes)</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">R$ {commResumo.reduce((s, c) => s + Number(c.valorTotal || 0), 0).toFixed(0)}</div>
          </div>
          <div className="border border-border/30 bg-card/50 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Comissoes Pendentes</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{commissions.filter(c => c.status === "pendente").length}</div>
          </div>
          <div className="border border-border/30 bg-card/50 p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ocorrencias</div>
            <div className="text-2xl font-bold text-red-400 mt-1">{disciplinary.length}</div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-border/30 pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "equipe" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setCargoFilter("")}
                className={`text-xs px-3 py-1.5 transition-all ${!cargoFilter ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground hover:text-foreground"}`}>
                Todos
              </button>
              {cargosUnicos.map(cargo => (
                <button key={cargo} onClick={() => setCargoFilter(cargo)}
                  className={`text-xs px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                    cargoFilter === cargo ? "text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={cargoFilter === cargo ? { backgroundColor: CARGO_CORES[cargo] || "#64748B" } : { backgroundColor: (CARGO_CORES[cargo] || "#64748B") + "15" }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CARGO_CORES[cargo] || "#64748B" }} />
                  {cargo} ({members.filter(m => m.cargo === cargo).length})
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {filteredMembers.map(m => (
                <MemberCard key={m.id} member={m} expanded={expandedId === m.id} onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)} />
              ))}
              {filteredMembers.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-12">Nenhum colaborador encontrado. Clique em "Popular Dados Ficticios" para semear.</div>
              )}
            </div>
          </div>
        )}

        {tab === "organograma" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground mb-2">Arvore hierarquica por unidade — linha de reporte</div>
            {members.length > 0 ? (
              <div className="border border-border/30 bg-card/50 p-4 space-y-1">
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
            <div className="text-xs text-muted-foreground mb-2">Todas as posicoes definidas no manifesto — cargo, funcao, SLA, metas e permissoes</div>
            {positions.map(p => {
              const cor = CARGO_CORES[p.cargo] || "#64748B";
              return (
                <div key={p.id} className="border border-border/30 bg-card/50 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 flex items-center justify-center text-sm font-bold" style={{ backgroundColor: cor + "20", color: cor, border: `1px solid ${cor}40` }}>
                      {p.indice}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: cor }}>{p.cargo}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-muted/30 text-muted-foreground">{p.codigoCompleto}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-muted/20 text-muted-foreground">{p.modalidade}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{p.unidadeNome} — Reporta a: {p.reportaA || "—"} — SLA: {p.slaDefault || "N/A"}</div>
                    </div>
                  </div>
                  {p.descricaoFuncao && <div className="text-xs text-foreground/80 mb-2">{p.descricaoFuncao}</div>}
                  {p.objetivos && <div className="text-xs text-muted-foreground mb-2"><span className="text-foreground font-bold">Objetivos:</span> {p.objetivos}</div>}
                  {p.metasPrincipais && p.metasPrincipais.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.metasPrincipais.map((meta: string, i: number) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{meta}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {p.podeSupervisionarOutros && <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400">Supervisionar</span>}
                    {p.podeAuditarCards && <span className="text-[9px] px-1.5 py-0.5 bg-orange-500/15 text-orange-400">Auditar Cards</span>}
                    {p.podeAprovarDespesas && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400">Aprovar Despesas</span>}
                    {p.podeEditarProtocolos && <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/15 text-cyan-400">Editar Protocolos</span>}
                    {p.podeAcessarFinanceiro && <span className="text-[9px] px-1.5 py-0.5 bg-green-500/15 text-green-400">Financeiro</span>}
                    {p.podeVerOuvidoria && <span className="text-[9px] px-1.5 py-0.5 bg-pink-500/15 text-pink-400">Ouvidoria</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "comissoes" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">Comissao calculada sobre resolucao VALIDADA — nao volume. Bloqueios por advertencia ou SLA vencido.</div>

            <div className="text-sm font-bold text-foreground mb-2">Resumo por Colaborador</div>
            <div className="space-y-1">
              {commResumo.map((cr, i) => {
                const cor = CARGO_CORES[cr.cargo] || "#64748B";
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border border-border/30 bg-card/50">
                    <div className="w-6 h-6 flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: cor + "20", color: cor }}>{cr.codigoCompleto?.slice(-2)}</div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-foreground">{cr.membroNome}</div>
                      <div className="text-[10px] text-muted-foreground">{cr.cargo} — {cr.codigoCompleto}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">R$ {Number(cr.valorTotal || 0).toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">{cr.totalComissoes} evento(s)</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-sm font-bold text-foreground mb-2 mt-6">Detalhamento</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left py-2 px-3">Colaborador</th>
                    <th className="text-left py-2 px-3">Categoria</th>
                    <th className="text-right py-2 px-3">Base</th>
                    <th className="text-right py-2 px-3">Mult.</th>
                    <th className="text-right py-2 px-3">Final</th>
                    <th className="text-center py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.slice(0, 50).map(c => (
                    <tr key={c.id} className="border-b border-border/10 hover:bg-muted/5">
                      <td className="py-2 px-3">
                        <div className="font-bold">{c.membroNome}</div>
                        <div className="text-muted-foreground text-[10px]">{c.codigoCompleto}</div>
                      </td>
                      <td className="py-2 px-3">{c.categoria?.replace(/_/g, " ")}</td>
                      <td className="py-2 px-3 text-right">R$ {c.valorBase?.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono">{c.multiplicador?.toFixed(1)}x</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400">R$ {c.valorFinal?.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${
                          c.status === "aprovada" ? "bg-emerald-500/15 text-emerald-400" :
                          c.status === "pendente" ? "bg-amber-500/15 text-amber-400" :
                          "bg-red-500/15 text-red-400"
                        }`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "disciplinar" && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Registro formal com base CLT. Advertencia verbal (90d) → Escrita (12m) → Plano de correcao (30-90d) → Suspensao (Art. 474 CLT) → Justa causa (Art. 482 CLT)
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { nivel: "ADVERTENCIA VERBAL", cor: "#EAB308", clt: "—", validade: "90 dias" },
                { nivel: "ADVERTENCIA ESCRITA", cor: "#F59E0B", clt: "—", validade: "12 meses" },
                { nivel: "PLANO DE CORRECAO", cor: "#F97316", clt: "—", validade: "30-90 dias" },
                { nivel: "SUSPENSAO", cor: "#EF4444", clt: "Art. 474 CLT", validade: "Permanente" },
                { nivel: "JUSTA CAUSA", cor: "#7F1D1D", clt: "Art. 482 CLT", validade: "Permanente" },
              ].map((d, i) => (
                <div key={i} className="border border-border/30 p-3" style={{ borderLeftColor: d.cor, borderLeftWidth: 3 }}>
                  <div className="text-[10px] font-bold" style={{ color: d.cor }}>{d.nivel}</div>
                  <div className="text-[9px] text-muted-foreground mt-1">{d.clt}</div>
                  <div className="text-[9px] text-muted-foreground">Validade: {d.validade}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {disciplinary.map(d => {
                const cor = DISC_CORES[d.nivel] || "#EAB308";
                return (
                  <div key={d.id} className="border border-border/30 bg-card/50 p-4" style={{ borderLeftColor: cor, borderLeftWidth: 3 }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: cor }}>{d.nivel?.replace(/_/g, " ")}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-muted/30 text-muted-foreground">{d.codigoCompleto}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 ${d.status === "ativa" ? "bg-red-500/15 text-red-400" : "bg-muted/20 text-muted-foreground"}`}>
                        {d.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground mt-1">{d.membroNome}</div>
                    <div className="text-xs text-foreground/70 mt-1">{d.motivo}</div>
                    {d.fundamentacaoClt && <div className="text-[10px] text-muted-foreground mt-1">CLT: {d.fundamentacaoClt}</div>}
                    {d.validadeDias && <div className="text-[10px] text-muted-foreground">Validade: {d.validadeDias} dias</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">Registrado em: {new Date(d.criadoEm).toLocaleDateString("pt-BR")}</div>
                  </div>
                );
              })}
              {disciplinary.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-12">Nenhuma ocorrencia disciplinar registrada</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
