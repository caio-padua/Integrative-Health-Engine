import { Layout } from "@/components/Layout";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Brain, Pill, AlertTriangle, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Phone, MessageSquare
} from "lucide-react";
import { useState, useEffect } from "react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const CORES_CLASSIFICACAO: Record<string, string> = {
  PREOCUPANTE: "bg-red-500/20 text-red-400 border-red-500/30",
  BAIXO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  MEDIANO: "bg-blue-400/20 text-blue-300 border-blue-400/30",
  OTIMO: "bg-green-500/20 text-green-400 border-green-500/30",
};

const CORES_GRAVIDADE: Record<string, string> = {
  LEVE: "bg-yellow-500/20 text-yellow-400",
  MODERADO: "bg-orange-500/20 text-orange-400",
  GRAVE: "bg-red-500/20 text-red-400",
};

const CORES_STATUS_ALERTA: Record<string, string> = {
  ABERTO: "bg-red-500/20 text-red-400",
  EM_ATENDIMENTO: "bg-yellow-500/20 text-yellow-400",
  RESPONDIDO: "bg-green-500/20 text-green-400",
  FECHADO: "bg-gray-500/20 text-gray-400",
};

const INDICADORES_LABELS: Record<string, string> = {
  sono: "Sono", energia: "Energia", disposicao: "Disposicao", atividadeFisica: "Ativ. Fisica",
  foco: "Foco", concentracao: "Concentracao", libido: "Libido", forca: "Forca",
  emagrecimento: "Emagrecimento", hipertrofia: "Hipertrofia", definicao: "Definicao",
  resistencia: "Resistencia", massaMagra: "Massa Magra", estresse: "Estresse", humor: "Humor",
};

const INDICADORES_SINAIS_LABELS: Record<string, string> = {
  PA_SISTOLICA: "PA Sist.", PA_DIASTOLICA: "PA Diast.", FREQUENCIA_CARDIACA: "FC",
  GLICEMIA_JEJUM: "Glic.", PESO: "Peso", CINTURA: "Cint.",
};

export default function MonitoramentoPacientePage() {
  const [, params] = useRoute("/pacientes/:id/monitoramento");
  const pacienteId = params?.id ? parseInt(params.id) : 0;

  const [sinais, setSinais] = useState<any[]>([]);
  const [sintomas, setSintomas] = useState<any>(null);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [expandSinais, setExpandSinais] = useState(true);
  const [expandSintomas, setExpandSintomas] = useState(true);
  const [expandFormulas, setExpandFormulas] = useState(false);
  const [expandAlertas, setExpandAlertas] = useState(true);

  useEffect(() => {
    if (!pacienteId) return;
    Promise.all([
      fetch(`${BASE_URL}api/pacientes/${pacienteId}/sinais-vitais`).then(r => r.json()),
      fetch(`${BASE_URL}api/pacientes/${pacienteId}/sintomas-grafico`).then(r => r.json()),
      fetch(`${BASE_URL}api/pacientes/${pacienteId}/acompanhamento-formulas`).then(r => r.json()),
      fetch(`${BASE_URL}api/pacientes/${pacienteId}/alertas`).then(r => r.json()),
    ]).then(([s, st, f, a]) => {
      setSinais(s);
      setSintomas(st);
      setFormulas(f);
      setAlertas(a);
    });
  }, [pacienteId]);

  const alertasAbertos = alertas.filter((a: any) => a.status === "ABERTO" || a.status === "EM_ATENDIMENTO");

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold uppercase tracking-tight">Monitoramento do Paciente</h1>
          <Badge variant="outline" className="text-xs">ID: {pacienteId}</Badge>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <KPICard icon={Activity} label="Sinais Vitais" value={sinais.length} sub="dias registrados" color="text-red-400" />
          <KPICard icon={Brain} label="Sintomas" value={sintomas?.series?.length || 0} sub="semanas rastreadas" color="text-blue-400" />
          <KPICard icon={Pill} label="Formulas" value={formulas.length} sub="feedbacks recebidos" color="text-green-400" />
          <KPICard icon={AlertTriangle} label="Alertas Abertos" value={alertasAbertos.length} sub="aguardando resposta" color={alertasAbertos.length > 0 ? "text-red-400" : "text-green-400"} />
        </div>

        <SectionCard
          title="Alertas do Paciente" icon={AlertTriangle} color="text-yellow-400"
          expanded={expandAlertas} onToggle={() => setExpandAlertas(!expandAlertas)}
          badge={alertasAbertos.length > 0 ? `${alertasAbertos.length} aberto(s)` : undefined}
          badgeColor="bg-red-500/20 text-red-400"
        >
          {alertas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum alerta registrado</p>
          ) : (
            <div className="space-y-2">
              {alertas.map((a: any) => (
                <div key={a.id} className="border border-border p-3 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[9px] ${CORES_GRAVIDADE[a.gravidade] || ""}`}>{a.gravidade}</Badge>
                      <Badge className={`text-[9px] ${CORES_STATUS_ALERTA[a.status] || ""}`}>{a.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(a.criadoEm).toLocaleDateString("pt-BR")} {new Date(a.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs font-medium">{a.tipoAlerta.replace(/_/g, " ")}</p>
                    {a.descricao && <p className="text-[10px] text-muted-foreground mt-1">{a.descricao}</p>}
                    {a.respostaAssistente && (
                      <div className="mt-2 bg-green-500/10 border border-green-500/20 p-2">
                        <p className="text-[10px] text-green-400 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />Resposta:
                        </p>
                        <p className="text-xs mt-1">{a.respostaAssistente}</p>
                        {a.contatoTelefone && (
                          <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Phone className="h-3 w-3" />Contato telefonico realizado
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {a.status === "ABERTO" && (
                    <Button size="sm" variant="outline" className="text-[10px]"
                      onClick={() => handleResponder(a.id)}>
                      Responder
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Mapa de Sinais Vitais" icon={Activity} color="text-red-400"
          expanded={expandSinais} onToggle={() => setExpandSinais(!expandSinais)}
        >
          {sinais.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro de sinais vitais</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2 text-[10px] text-muted-foreground">INDICADOR</th>
                    {sinais.map((dia: any) => (
                      <th key={dia.data} colSpan={4} className="text-center py-1 px-1 text-[10px] text-muted-foreground border-l border-border">
                        {new Date(dia.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(INDICADORES_SINAIS_LABELS).map(ind => (
                    <tr key={ind} className="border-b border-border/50">
                      <td className="py-1 px-2 text-[10px] font-medium whitespace-nowrap">{INDICADORES_SINAIS_LABELS[ind]}</td>
                      {sinais.map((dia: any) => {
                        const dados = dia.indicadores?.[ind];
                        if (!dados) return <td key={dia.data} colSpan={4} className="text-center text-[9px] text-muted-foreground/50 border-l border-border">-</td>;
                        return [1, 2, 3, 4].map(h => {
                          const val = dados[`hora${h}`]?.valor;
                          const hor = dados[`hora${h}`]?.horario;
                          return (
                            <td key={`${dia.data}-${h}`} className={`text-center py-1 px-1 text-[10px] ${h === 1 ? "border-l border-border" : ""}`}>
                              {val !== null && val !== undefined ? (
                                <div>
                                  <span className="font-mono">{val}</span>
                                  {hor && <span className="block text-[8px] text-muted-foreground">{hor}</span>}
                                </div>
                              ) : (
                                <span className="text-[8px] text-muted-foreground/40">N/V</span>
                              )}
                            </td>
                          );
                        });
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Tracking de Sintomas" icon={Brain} color="text-blue-400"
          expanded={expandSintomas} onToggle={() => setExpandSintomas(!expandSintomas)}
        >
          {!sintomas?.resumo || sintomas.resumo.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro de sintomas</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {sintomas.resumo.map((item: any) => (
                  <div key={item.indicador} className="border border-border p-2 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">{INDICADORES_LABELS[item.indicador] || item.indicador}</p>
                    <p className="text-lg font-bold font-mono">{item.atual ?? "-"}</p>
                    {item.classificacao && (
                      <Badge className={`text-[8px] mt-1 ${CORES_CLASSIFICACAO[item.classificacao] || ""}`}>
                        {item.classificacao}
                      </Badge>
                    )}
                    {item.invertido && <span className="text-[8px] text-muted-foreground block mt-0.5">(invertido)</span>}
                  </div>
                ))}
              </div>

              {sintomas.series && sintomas.series.length > 1 && (
                <div className="mt-4">
                  <p className="text-[10px] text-muted-foreground uppercase mb-2">Evolucao Semanal (ultimas semanas)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1 px-1 text-muted-foreground">Semana</th>
                          {Object.keys(INDICADORES_LABELS).slice(0, 8).map(k => (
                            <th key={k} className="text-center py-1 px-1 text-muted-foreground">{INDICADORES_LABELS[k]?.slice(0, 4)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sintomas.series.slice(-6).map((s: any) => (
                          <tr key={s.data} className="border-b border-border/30">
                            <td className="py-1 px-1 font-mono">
                              {new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                            </td>
                            {Object.keys(INDICADORES_LABELS).slice(0, 8).map(k => (
                              <td key={k} className="text-center py-1 px-1 font-mono">
                                {s[k] ?? "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Acompanhamento de Formulas" icon={Pill} color="text-green-400"
          expanded={expandFormulas} onToggle={() => setExpandFormulas(!expandFormulas)}
        >
          {formulas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum feedback de formula</p>
          ) : (
            <div className="space-y-2">
              {formulas.map((f: any) => (
                <div key={f.id} className="border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{f.nomeBlend}</span>
                    {f.aderencia && (
                      <Badge className={`text-[8px] ${f.aderencia === "ALTA" ? "bg-green-500/20 text-green-400" : f.aderencia === "MEDIA" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        Aderencia: {f.aderencia}
                      </Badge>
                    )}
                    {f.senteResultado && (
                      <Badge className={`text-[8px] ${f.senteResultado === "SIM" ? "bg-green-500/20 text-green-400" : f.senteResultado === "PARCIAL" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                        Resultado: {f.senteResultado}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    {f.efeitoColateral1 && f.efeitoColateral1 !== "NENHUM" && (
                      <p>Efeito 1: {f.efeitoColateral1}</p>
                    )}
                    {f.efeitoColateral2 && f.efeitoColateral2 !== "NENHUM" && (
                      <p>Efeito 2: {f.efeitoColateral2}</p>
                    )}
                    {f.observacao && <p>Obs: {f.observacao}</p>}
                    <p className="text-[9px]">
                      {f.origem === "PACIENTE" ? "Registrado pelo paciente" : "Registrado por profissional"} em {new Date(f.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </Layout>
  );

  async function handleResponder(alertaId: number) {
    const resposta = prompt("Digite a resposta para o paciente:");
    if (!resposta) return;
    const contatouTelefone = confirm("Realizou contato telefonico?");
    try {
      await fetch(`${BASE_URL}api/alerta-paciente/${alertaId}/responder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostaAssistente: resposta, contatoTelefone: contatouTelefone }),
      });
      const updatedAlertas = await fetch(`${BASE_URL}api/pacientes/${pacienteId}/alertas`).then(r => r.json());
      setAlertas(updatedAlertas);
    } catch {
      alert("Erro ao responder alerta");
    }
  }
}

function KPICard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: number; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
        <p className="text-xl font-bold font-mono">{value}</p>
        <p className="text-[10px] font-medium uppercase">{label}</p>
        <p className="text-[9px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, icon: Icon, color, expanded, onToggle, badge, badgeColor, children }: {
  title: string; icon: any; color: string; expanded: boolean; onToggle: () => void;
  badge?: string; badgeColor?: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={onToggle}>
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          {title}
          {badge && <Badge className={`text-[9px] ml-auto ${badgeColor || ""}`}>{badge}</Badge>}
          {expanded ? <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" /> : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      {expanded && <CardContent>{children}</CardContent>}
    </Card>
  );
}
