import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Plus,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  X,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

interface PedidoExame {
  id: number;
  pacienteId: number;
  medicoId: number;
  unidadeId: number | null;
  status: string;
  exames: Array<{
    codigoExame: string;
    nomeExame: string;
    blocoOficial: string | null;
    grauDoBloco: string | null;
    corpoPedido: string;
    preparo: string | null;
    hd: string | null;
    cid: string | null;
  }>;
  hipoteseDiagnostica: string | null;
  cidPrincipal: string | null;
  incluirJustificativa: boolean;
  tipoJustificativa: string | null;
  observacaoMedica: string | null;
  criadoEm: string;
  validadoEm: string | null;
}

interface Paciente {
  id: number;
  nome: string;
  cpf: string;
}

interface ExameBase {
  codigoExame: string;
  nomeExame: string;
  blocoOficial: string | null;
  modalidade: string | null;
}

interface PreviaJustificativa {
  codigoExame: string;
  nomeExame: string;
  justificativas: {
    objetiva: string;
    narrativa: string;
    robusta: string;
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  RASCUNHO: { label: "Rascunho", color: "bg-zinc-100 text-zinc-700 border-zinc-300" },
  VALIDADO: { label: "Validado", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  CANCELADO: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-300" },
};

export default function PedidosExame() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoExame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovo, setShowNovo] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [validandoId, setValidandoId] = useState<number | null>(null);
  const [previas, setPrevias] = useState<PreviaJustificativa[]>([]);
  const [carregandoPrevias, setCarregandoPrevias] = useState(false);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [examesDisponiveis, setExamesDisponiveis] = useState<ExameBase[]>([]);
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [buscaExame, setBuscaExame] = useState("");
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [examesSelecionados, setExamesSelecionados] = useState<string[]>([]);
  const [hd, setHd] = useState("");
  const [cid, setCid] = useState("");
  const [obs, setObs] = useState("");

  const [incluirJustificativa, setIncluirJustificativa] = useState(false);
  const [tipoJustificativa, setTipoJustificativa] = useState<string>("objetiva");

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    setLoading(true);
    const res = await fetch(`/api/pedidos-exame`);
    if (res.ok) setPedidos(await res.json());
    setLoading(false);
  }

  async function carregarPacientes() {
    const res = await fetch(`/api/pacientes`);
    if (res.ok) setPacientes(await res.json());
  }

  async function carregarExames() {
    const res = await fetch(`/api/catalogo/exames-base`);
    if (res.ok) {
      const data = await res.json();
      setExamesDisponiveis(data);
    }
  }

  function abrirNovo() {
    setShowNovo(true);
    setPacienteSelecionado(null);
    setExamesSelecionados([]);
    setHd("");
    setCid("");
    setObs("");
    carregarPacientes();
    carregarExames();
  }

  async function criarPedido() {
    if (!pacienteSelecionado || examesSelecionados.length === 0) return;
    const res = await fetch(`/api/pedidos-exame`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pacienteId: pacienteSelecionado.id,
        medicoId: user?.id,
        examesCodigos: examesSelecionados,
        hipoteseDiagnostica: hd || null,
        cidPrincipal: cid || null,
        observacaoMedica: obs || null,
      }),
    });
    if (res.ok) {
      setShowNovo(false);
      carregarPedidos();
    }
  }

  async function carregarPreviasJustificativa(pedidoId: number) {
    setCarregandoPrevias(true);
    const res = await fetch(`/api/pedidos-exame/${pedidoId}/previa-justificativas`);
    if (res.ok) {
      const data = await res.json();
      setPrevias(data.exames);
    }
    setCarregandoPrevias(false);
  }

  async function validarPedido(pedidoId: number) {
    const res = await fetch(`/api/pedidos-exame/${pedidoId}/validar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        validadoPor: user?.id,
        incluirJustificativa,
        tipoJustificativa: incluirJustificativa ? tipoJustificativa : null,
        hipoteseDiagnostica: hd || null,
        cidPrincipal: cid || null,
      }),
    });
    if (res.ok) {
      setValidandoId(null);
      setIncluirJustificativa(false);
      setPrevias([]);
      carregarPedidos();
    }
  }

  function abrirValidacao(pedido: PedidoExame) {
    setValidandoId(pedido.id);
    setIncluirJustificativa(false);
    setTipoJustificativa("objetiva");
    setHd(pedido.hipoteseDiagnostica || "");
    setCid(pedido.cidPrincipal || "");
    carregarPreviasJustificativa(pedido.id);
  }

  function abrirPdf(pedidoId: number, tipo: "solicitacao" | "justificativa") {
    window.open(`/api/pedidos-exame/${pedidoId}/pdf/${tipo}`, "_blank");
  }

  const pacientesFiltrados = pacientes.filter(
    (p) =>
      p.nome.toLowerCase().includes(buscaPaciente.toLowerCase()) ||
      p.cpf?.includes(buscaPaciente)
  );

  const examesFiltrados = examesDisponiveis.filter(
    (e) =>
      e.nomeExame.toLowerCase().includes(buscaExame.toLowerCase()) ||
      e.codigoExame.toLowerCase().includes(buscaExame.toLowerCase())
  );

  const toggleExame = (codigo: string) => {
    setExamesSelecionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pedidos de Exame</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Solicitar exames, validar e gerar PDF com justificativa
            </p>
          </div>
          <Button onClick={abrirNovo} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Pedido
          </Button>
        </div>

        {showNovo && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Novo Pedido de Exame</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowNovo(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Paciente</Label>
                {pacienteSelecionado ? (
                  <div className="flex items-center gap-2 mt-1 p-2 bg-muted rounded">
                    <span className="font-medium">{pacienteSelecionado.nome}</span>
                    <span className="text-xs text-muted-foreground">CPF: {pacienteSelecionado.cpf}</span>
                    <Button variant="ghost" size="sm" className="ml-auto h-6" onClick={() => setPacienteSelecionado(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-1 space-y-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar paciente por nome ou CPF..."
                        value={buscaPaciente}
                        onChange={(e) => setBuscaPaciente(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    {buscaPaciente && (
                      <div className="border rounded max-h-40 overflow-y-auto">
                        {pacientesFiltrados.map((p) => (
                          <button
                            key={p.id}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0"
                            onClick={() => {
                              setPacienteSelecionado(p);
                              setBuscaPaciente("");
                            }}
                          >
                            <span className="font-medium">{p.nome}</span>
                            <span className="text-xs text-muted-foreground ml-2">CPF: {p.cpf}</span>
                          </button>
                        ))}
                        {pacientesFiltrados.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum paciente encontrado</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Exames ({examesSelecionados.length} selecionados)
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar exame por nome ou codigo..."
                    value={buscaExame}
                    onChange={(e) => setBuscaExame(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {examesSelecionados.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {examesSelecionados.map((cod) => {
                      const ex = examesDisponiveis.find((e) => e.codigoExame === cod);
                      return (
                        <Badge
                          key={cod}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/20"
                          onClick={() => toggleExame(cod)}
                        >
                          {ex?.nomeExame || cod}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <div className="border rounded mt-2 max-h-48 overflow-y-auto">
                  {examesFiltrados.slice(0, 50).map((e) => {
                    const selected = examesSelecionados.includes(e.codigoExame);
                    return (
                      <button
                        key={e.codigoExame}
                        className={`w-full text-left px-3 py-1.5 text-sm border-b last:border-0 flex items-center gap-2 ${
                          selected ? "bg-primary/10" : "hover:bg-muted"
                        }`}
                        onClick={() => toggleExame(e.codigoExame)}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                          {selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="font-mono text-xs text-muted-foreground w-28 shrink-0">{e.codigoExame}</span>
                        <span>{e.nomeExame}</span>
                        {e.modalidade && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-auto">{e.modalidade}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Hipotese Diagnostica (HD)</Label>
                  <Input value={hd} onChange={(e) => setHd(e.target.value)} placeholder="Ex: Investigacao metabolica" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">CID Principal</Label>
                  <Input value={cid} onChange={(e) => setCid(e.target.value)} placeholder="Ex: Z00.0" className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observacao Medica</Label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observacoes adicionais..." className="mt-1" rows={2} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowNovo(false)}>Cancelar</Button>
                <Button onClick={criarPedido} disabled={!pacienteSelecionado || examesSelecionados.length === 0}>
                  Criar Pedido ({examesSelecionados.length} exames)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando pedidos...</div>
        ) : pedidos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum pedido de exame ainda</p>
              <Button variant="outline" className="mt-4" onClick={abrirNovo}>
                Criar primeiro pedido
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pedidos.map((pedido) => {
              const isExpanded = expandedId === pedido.id;
              const isValidando = validandoId === pedido.id;
              const cfg = statusConfig[pedido.status] || statusConfig.RASCUNHO;
              const examesList = pedido.exames || [];

              return (
                <Card key={pedido.id} className={isExpanded ? "border-primary/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        className="shrink-0"
                        onClick={() => setExpandedId(isExpanded ? null : pedido.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">#{pedido.id}</span>
                          <Badge variant="outline" className={cfg.color}>
                            {cfg.label}
                          </Badge>
                          <span className="text-sm font-medium">
                            {examesList.length} exame{examesList.length !== 1 ? "s" : ""}
                          </span>
                          {pedido.incluirJustificativa && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">
                              Com Justificativa
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Paciente ID: {pedido.pacienteId} | Criado: {new Date(pedido.criadoEm).toLocaleDateString("pt-BR")}{" "}
                          {new Date(pedido.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {pedido.status === "RASCUNHO" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => abrirValidacao(pedido)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Validar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => abrirPdf(pedido.id, "solicitacao")}
                        >
                          <Eye className="h-3 w-3" />
                          PDF Solicitacao
                        </Button>
                        {pedido.incluirJustificativa && pedido.status === "VALIDADO" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => abrirPdf(pedido.id, "justificativa")}
                          >
                            <Download className="h-3 w-3" />
                            PDF Justificativa
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          Exames do Pedido
                        </div>
                        <div className="space-y-2">
                          {examesList.map((exame, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm bg-muted/50 rounded px-3 py-2">
                              <span className="font-mono text-xs text-muted-foreground w-6 pt-0.5">{i + 1}.</span>
                              <div className="flex-1">
                                <div className="font-medium">{exame.nomeExame}</div>
                                <div className="text-xs text-muted-foreground">{exame.corpoPedido}</div>
                                {exame.preparo && (
                                  <div className="text-xs text-amber-600 mt-0.5">Preparo: {exame.preparo}</div>
                                )}
                                {exame.blocoOficial && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1 inline-block">
                                    {exame.blocoOficial}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground">{exame.codigoExame}</span>
                            </div>
                          ))}
                        </div>

                        {pedido.hipoteseDiagnostica && (
                          <div className="text-sm">
                            <span className="font-medium">HD:</span> {pedido.hipoteseDiagnostica}
                          </div>
                        )}
                        {pedido.cidPrincipal && (
                          <div className="text-sm">
                            <span className="font-medium">CID:</span> {pedido.cidPrincipal}
                          </div>
                        )}
                        {pedido.observacaoMedica && (
                          <div className="text-sm">
                            <span className="font-medium">Obs:</span> {pedido.observacaoMedica}
                          </div>
                        )}
                      </div>
                    )}

                    {isValidando && (
                      <div className="mt-4 pt-4 border-t border-primary/20 space-y-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">Validar Pedido #{pedido.id}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Hipotese Diagnostica (HD)</Label>
                            <Input value={hd} onChange={(e) => setHd(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">CID</Label>
                            <Input value={cid} onChange={(e) => setCid(e.target.value)} className="mt-1" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Label className="text-xs font-medium">Paciente precisa de justificativa para laboratorio/convenio?</Label>
                            <div className="flex gap-2">
                              <Button
                                variant={incluirJustificativa ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIncluirJustificativa(true)}
                              >
                                Sim
                              </Button>
                              <Button
                                variant={!incluirJustificativa ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIncluirJustificativa(false)}
                              >
                                Nao
                              </Button>
                            </div>
                          </div>

                          {incluirJustificativa && (
                            <div className="space-y-3 p-3 bg-blue-50/50 rounded border border-blue-200/50">
                              <Label className="text-xs font-medium">Tipo de Justificativa:</Label>
                              <div className="flex gap-2">
                                {[
                                  { value: "objetiva", label: "Objetiva (curta)" },
                                  { value: "narrativa", label: "Narrativa (media)" },
                                  { value: "robusta", label: "Robusta (completa)" },
                                ].map((opt) => (
                                  <Button
                                    key={opt.value}
                                    variant={tipoJustificativa === opt.value ? "default" : "outline"}
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => setTipoJustificativa(opt.value)}
                                  >
                                    {opt.label}
                                  </Button>
                                ))}
                              </div>

                              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mt-3">
                                Previa das Justificativas
                              </div>
                              {carregandoPrevias ? (
                                <div className="text-xs text-muted-foreground">Carregando previas...</div>
                              ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {previas.map((p) => (
                                    <div key={p.codigoExame} className="bg-white rounded p-2 border text-sm">
                                      <div className="font-medium text-xs">{p.nomeExame}</div>
                                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        {tipoJustificativa === "objetiva" && p.justificativas.objetiva}
                                        {tipoJustificativa === "narrativa" && p.justificativas.narrativa}
                                        {tipoJustificativa === "robusta" && p.justificativas.robusta}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={() => { setValidandoId(null); setPrevias([]); }}>
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={() => validarPedido(pedido.id)} className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Confirmar Validacao
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
