import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useObterAnamnese, getObterAnamneseQueryKey,
  useAtualizarAnamnese,
  useAtivarMotorClinico,
  useListarSugestoes, getListarSugestoesQueryKey,
  AnamneseStatus, AtualizarAnamneseBodyStatus
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Activity, PlayCircle, CheckCircle2, Clock, XCircle, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DoencaSelector, type DoencaSelecionada, doencasSelecionadasToLegacy, legacyToDoencasSelecionadas } from "@/components/DoencaSelector";

const SINTOMAS = [
  "FADIGA", "CONSTIPACAO", "INSONIA", "ANSIEDADE", "GANHO DE PESO",
  "QUEDA DE CABELO", "CANSACO", "IRRITABILIDADE", "DOR MUSCULAR",
  "BAIXA LIBIDO", "RETENCAO DE LIQUIDO", "SUDORESE NOTURNA",
  "FRIO NAS EXTREMIDADES", "DEPRESSAO", "DIFICULDADE DE CONCENTRACAO",
  "DORES DE CABECA", "DISTENSAO ABDOMINAL", "GASES", "REFLUXO",
];

const HISTORICO_FAMILIAR = [
  "DIABETES", "INFARTO", "AVC", "CANCER", "ALZHEIMER",
  "HIPOTIREOIDISMO", "DOENCA HEPATICA", "DOENCA RENAL",
];

function MultiCheckbox({ opcoes, selecionados, onChange }: {
  opcoes: string[];
  selecionados: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (item: string) => {
    if (selecionados.includes(item)) {
      onChange(selecionados.filter(s => s !== item));
    } else {
      onChange([...selecionados, item]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map(op => (
        <button
          key={op}
          type="button"
          onClick={() => toggle(op)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            selecionados.includes(op)
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted/40 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
          }`}
        >
          {op}
        </button>
      ))}
    </div>
  );
}

function SimNaoToggle({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold ${value === "NAO" ? "text-foreground" : "text-muted-foreground"}`}>NAO</span>
        <Switch
          checked={value === "SIM"}
          onCheckedChange={(v) => onChange(v ? "SIM" : "NAO")}
          className="data-[state=checked]:bg-primary"
        />
        <span className={`text-xs font-semibold ${value === "SIM" ? "text-primary" : "text-muted-foreground"}`}>SIM</span>
      </div>
    </div>
  );
}

const prioridadeClasses: Record<string, string> = {
  urgente: "bg-red-600 text-white",
  alta: "bg-orange-500 text-white",
  media: "bg-yellow-500 text-black",
  baixa: "bg-slate-500 text-white",
};

const statusClasses: Record<string, string> = {
  validado: "text-green-500",
  rejeitado: "text-red-500",
  pendente: "text-yellow-500",
  em_execucao: "text-blue-500",
  concluido: "text-slate-400",
};

const tipoLabel: Record<string, string> = {
  exame: "EXAME",
  formula: "FORMULA",
  injetavel_im: "INJETAVEL IM",
  injetavel_ev: "INJETAVEL EV",
  implante: "IMPLANTE",
  protocolo: "PROTOCOLO",
};

const tipoCores: Record<string, string> = {
  exame: "border-blue-500/30 text-blue-400",
  formula: "border-green-500/30 text-green-400",
  injetavel_im: "border-orange-500/30 text-orange-400",
  injetavel_ev: "border-red-500/30 text-red-400",
  implante: "border-violet-500/30 text-violet-400",
  protocolo: "border-cyan-500/30 text-cyan-400",
};

export default function AnamneseDetalhe() {
  const [, params] = useRoute("/anamnese/:id");
  const id = parseInt(params?.id || "0");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: anamnese, isLoading } = useObterAnamnese(id, {
    query: { enabled: !!id, queryKey: getObterAnamneseQueryKey(id) }
  });

  const { data: sugestoes, isLoading: loadingSugestoes } = useListarSugestoes(
    { pacienteId: anamnese?.pacienteId },
    { query: { enabled: !!anamnese?.pacienteId, queryKey: getListarSugestoesQueryKey({ pacienteId: anamnese?.pacienteId }) } }
  );

  const atualizarAnamnese = useAtualizarAnamnese();
  const ativarMotor = useAtivarMotorClinico();

  // ── Estado do formulário PADCOM ──────────────────────────────────────────
  const [Q010, setQ010] = useState("");
  const [Q011, setQ011] = useState("");
  const [Q012, setQ012] = useState<string[]>([]);
  const [Q013, setQ013] = useState<DoencaSelecionada[]>([]);
  const [Q014, setQ014] = useState<string[]>([]);
  const [Q015, setQ015] = useState("");
  const [Q016, setQ016] = useState("");
  const [Q017, setQ017] = useState("");
  const [Q030, setQ030] = useState("NAO");
  const [Q031, setQ031] = useState("SIM");
  const [Q032, setQ032] = useState("SIM");
  const [Q033, setQ033] = useState("NAO");
  const [Q040, setQ040] = useState("MENSAL");
  const [Q041, setQ041] = useState("INTERMEDIARIO");

  useEffect(() => {
    if (anamnese) {
      const clinico = (anamnese.respostasClincias as Record<string, unknown>) || {};
      const prefs = (anamnese.respostasPreferencias as Record<string, unknown>) || {};
      const fin = (anamnese.respostasFinanceiras as Record<string, unknown>) || {};
      setQ010(String(clinico.Q010 || ""));
      setQ011(String(clinico.Q011 || ""));
      setQ012((clinico.Q012 as string[]) || []);
      const rawQ013 = clinico.Q013;
      if (Array.isArray(rawQ013) && rawQ013.length > 0) {
        if (typeof rawQ013[0] === "string") {
          setQ013(legacyToDoencasSelecionadas(rawQ013 as string[]));
        } else {
          setQ013(rawQ013 as DoencaSelecionada[]);
        }
      } else {
        setQ013([]);
      }
      setQ014((clinico.Q014 as string[]) || []);
      setQ015(String(clinico.Q015 || ""));
      setQ016(String(clinico.Q016 || ""));
      setQ017(String(clinico.Q017 || ""));
      setQ030(String(prefs.Q030 || "NAO"));
      setQ031(String(prefs.Q031 || "SIM"));
      setQ032(String(prefs.Q032 || "SIM"));
      setQ033(String(prefs.Q033 || "NAO"));
      setQ040(String(fin.Q040 || "MENSAL"));
      setQ041(String(fin.Q041 || "INTERMEDIARIO"));
    }
  }, [anamnese]);

  const handleSalvar = () => {
    atualizarAnamnese.mutate({
      id,
      data: {
        respostasClincias: { Q010, Q011, Q012, Q013, Q013_legacy: doencasSelecionadasToLegacy(Q013), Q014, Q015, Q016, Q017 },
        respostasPreferencias: { Q030, Q031, Q032, Q033 },
        respostasFinanceiras: { Q040, Q041 },
        status: AtualizarAnamneseBodyStatus.concluida,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Anamnese salva com sucesso" });
        queryClient.invalidateQueries({ queryKey: getObterAnamneseQueryKey(id) });
      }
    });
  };

  const handleAtivarMotor = () => {
    ativarMotor.mutate({ data: { anamneseId: id } }, {
      onSuccess: (result: Record<string, unknown>) => {
        const total = result?.totalSugestoes || 0;
        const regras = result?.regrasAtivadas || 0;
        toast({ title: `Motor ativado — ${total} sugestoes geradas via ${regras} regras PADCOM` });
        queryClient.invalidateQueries({ queryKey: getObterAnamneseQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListarSugestoesQueryKey({ pacienteId: anamnese?.pacienteId }) });
      }
    });
  };

  const sugestoesAnamnese = sugestoes?.filter(s => s.anamneseId === id) || [];

  const statusBadgeClasses: Record<string, string> = {
    pendente: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    em_andamento: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    concluida: "bg-green-500/10 text-green-400 border-green-500/30",
    validada: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/anamnese">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Avaliacao: {isLoading ? "..." : anamnese?.pacienteNome}
                {anamnese?.status && (
                  <Badge variant="outline" className={`ml-1 uppercase text-xs ${statusBadgeClasses[anamnese.status] || ""}`}>
                    {anamnese.status.replace("_", " ")}
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground text-xs mt-0.5">Questionario PADCOM V9 — Q010 ate Q041</p>
            </div>

            {anamnese?.status === AnamneseStatus.concluida && !anamnese?.motorAtivadoEm && (
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 font-bold shadow-[0_0_20px_rgba(var(--primary),0.4)] animate-pulse"
                onClick={handleAtivarMotor}
                disabled={ativarMotor.isPending}
              >
                <Zap className="w-5 h-5 mr-2" />
                {ativarMotor.isPending ? "Processando..." : "Ativar Motor PADCOM"}
              </Button>
            )}
            {anamnese?.motorAtivadoEm && (
              <div className="text-right">
                <div className="text-xs text-green-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Motor Ativado
                </div>
                <div className="text-xs text-muted-foreground">{sugestoesAnamnese.length} sugestoes geradas</div>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulário */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Questionario PADCOM V9</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="clinico">
                    <TabsList className="mb-6 w-full grid grid-cols-3">
                      <TabsTrigger value="clinico">Clinico</TabsTrigger>
                      <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
                      <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                    </TabsList>

                    {/* ABA CLINICO */}
                    <TabsContent value="clinico" className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q010 — Queixa Principal <span className="text-red-400">*</span></Label>
                        <Textarea
                          placeholder="Descreva a principal queixa ou motivo da consulta..."
                          className="min-h-[80px] bg-muted/30"
                          value={Q010}
                          onChange={e => setQ010(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q011 — Duracao da Queixa <span className="text-red-400">*</span></Label>
                        <Input
                          placeholder="Ex: 6 meses, 2 anos..."
                          className="bg-muted/30"
                          value={Q011}
                          onChange={e => setQ011(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q012 — Sintomas Atuais <span className="text-red-400">*</span></Label>
                        <MultiCheckbox opcoes={SINTOMAS} selecionados={Q012} onChange={setQ012} />
                        {Q012.length > 0 && (
                          <p className="text-xs text-muted-foreground">{Q012.length} selecionados</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q013 — Patologias do Paciente</Label>
                        <p className="text-[11px] text-muted-foreground -mt-1">
                          Selecione as doencas por categoria. Use DIAX (diagnostico concluido) ou POTX (doenca potencial). O funil ao lado mostra o resumo filtrado.
                        </p>
                        <DoencaSelector selecionados={Q013} onChange={setQ013} />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q014 — Historico Familiar</Label>
                        <MultiCheckbox opcoes={HISTORICO_FAMILIAR} selecionados={Q014} onChange={setQ014} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q015 — Cirurgias Previas</Label>
                          <Textarea placeholder="Descreva se houver..." className="min-h-[60px] bg-muted/30 text-sm" value={Q015} onChange={e => setQ015(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q016 — Internacoes Previas</Label>
                          <Textarea placeholder="Descreva se houver..." className="min-h-[60px] bg-muted/30 text-sm" value={Q016} onChange={e => setQ016(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q017 — Alergias / Intolerancias</Label>
                          <Textarea placeholder="Ex: Lactose, Gluten..." className="min-h-[60px] bg-muted/30 text-sm" value={Q017} onChange={e => setQ017(e.target.value)} />
                        </div>
                      </div>

                      <Button onClick={handleSalvar} disabled={atualizarAnamnese.isPending} className="w-full">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {atualizarAnamnese.isPending ? "Salvando..." : "Salvar e Concluir Anamnese"}
                      </Button>
                    </TabsContent>

                    {/* ABA PREFERENCIAS */}
                    <TabsContent value="preferencias" className="space-y-4">
                      <div className="space-y-1 mb-4">
                        <p className="text-sm font-semibold">Perfil de Aceite Terapeutico (Q030-Q033)</p>
                        <p className="text-xs text-muted-foreground">Define quais segmentos o motor pode sugerir para este paciente.</p>
                      </div>
                      <SimNaoToggle label="Q030 — Deseja somente exames (sem prescricoes)?" value={Q030} onChange={setQ030} />
                      <SimNaoToggle label="Q031 — Aceita formulas manipuladas?" value={Q031} onChange={setQ031} />
                      <SimNaoToggle label="Q032 — Aceita protocolo injetavel (IM/EV)?" value={Q032} onChange={setQ032} />
                      <SimNaoToggle label="Q033 — Aceita implante subdermal?" value={Q033} onChange={setQ033} />
                      <Button onClick={handleSalvar} disabled={atualizarAnamnese.isPending} className="w-full mt-4">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {atualizarAnamnese.isPending ? "Salvando..." : "Salvar Preferencias"}
                      </Button>
                    </TabsContent>

                    {/* ABA FINANCEIRO */}
                    <TabsContent value="financeiro" className="space-y-4">
                      <div className="space-y-1 mb-4">
                        <p className="text-sm font-semibold">Perfil Financeiro (Q040-Q041)</p>
                        <p className="text-xs text-muted-foreground">Determina a complexidade do plano terapeutico oferecido.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q040 — Modelo de Investimento Preferido</Label>
                        <Select value={Q040} onValueChange={setQ040}>
                          <SelectTrigger className="bg-muted/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TOTAL">Total (a vista)</SelectItem>
                            <SelectItem value="PARCELADO">Parcelado</SelectItem>
                            <SelectItem value="MENSAL">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Q041 — Conforto Financeiro (Perfil)</Label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { val: "BASICO", desc: "Basico", sub: "Etapas essenciais" },
                            { val: "INTERMEDIARIO", desc: "Intermediario", sub: "Exames + formulas" },
                            { val: "PREMIUM", desc: "Premium", sub: "Protocolo completo" },
                          ].map(p => (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => setQ041(p.val)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                Q041 === p.val
                                  ? "border-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--primary),0.2)]"
                                  : "border-border bg-muted/20 hover:border-primary/40"
                              }`}
                            >
                              <p className={`text-sm font-bold ${Q041 === p.val ? "text-primary" : "text-foreground"}`}>{p.desc}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{p.sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button onClick={handleSalvar} disabled={atualizarAnamnese.isPending} className="w-full mt-4">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {atualizarAnamnese.isPending ? "Salvando..." : "Salvar Perfil Financeiro"}
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Sinais semanticos */}
              {anamnese?.sinaisSemanticos && anamnese.sinaisSemanticos.length > 0 && (
                <Card className="border-primary/20 bg-primary/3">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Sinais Semanticos Gerados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {anamnese.sinaisSemanticos.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Painel de Sugestoes */}
            <div className="space-y-4">
              <Card className="border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.08)]">
                <CardHeader className="bg-primary/5 border-b border-border pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-primary" />
                    Resultado do Motor PADCOM
                    {sugestoesAnamnese.length > 0 && (
                      <Badge className="ml-auto bg-primary/20 text-primary border-primary/30 text-xs">
                        {sugestoesAnamnese.length} sugestoes
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {!anamnese?.motorAtivadoEm ? (
                    <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-3">
                      <PlayCircle className="w-10 h-10 text-muted-foreground/25" />
                      <p className="text-sm">Motor nao ativado.</p>
                      <p className="text-xs">Preencha o questionario e ative o motor para gerar sugestoes com base nas regras PADCOM.</p>
                    </div>
                  ) : loadingSugestoes ? (
                    <div className="p-4 space-y-3">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : sugestoesAnamnese.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Nenhuma sugestao gerada para esta anamnese.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
                      {sugestoesAnamnese.map(s => (
                        <div key={s.id} className="p-3 hover:bg-muted/10 transition-colors">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="outline" className={`text-xs px-2 py-0 ${tipoCores[s.tipo] || "text-muted-foreground"}`}>
                              {tipoLabel[s.tipo] || s.tipo}
                            </Badge>
                            <Badge className={`text-xs px-2 py-0 ml-auto ${prioridadeClasses[s.prioridade] || ""}`}>
                              {s.prioridade.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="font-semibold text-xs mb-1 leading-tight">{s.itemNome}</p>
                          {s.justificativa && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5 leading-relaxed">{s.justificativa}</p>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Status:</span>
                            <span className={`text-xs font-bold ${statusClasses[s.status] || ""}`}>
                              {s.status === "validado" && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> VALIDADO</span>}
                              {s.status === "rejeitado" && <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> REJEITADO</span>}
                              {s.status === "pendente" && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> PENDENTE</span>}
                              {s.status === "em_execucao" && <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> EXECUCAO</span>}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Box */}
              {anamnese?.motorAtivadoEm && !anamnese?.motorAtivadoEm && (
                <Card className="border-yellow-500/20 bg-yellow-500/5">
                  <CardContent className="p-3 text-xs text-yellow-400">
                    Motor ativado em {new Date(anamnese.motorAtivadoEm).toLocaleString("pt-BR")}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
