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
import { ArrowLeft, CheckSquare, Activity, AlertTriangle, PlayCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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

  const [respostas, setRespostas] = useState("");

  useEffect(() => {
    if (anamnese?.respostasClincias) {
      setRespostas(JSON.stringify(anamnese.respostasClincias, null, 2));
    }
  }, [anamnese]);

  const handleSalvar = () => {
    try {
      const parsed = JSON.parse(respostas || "{}");
      atualizarAnamnese.mutate({
        id,
        data: {
          respostasClincias: parsed,
          status: AtualizarAnamneseBodyStatus.concluida
        }
      }, {
        onSuccess: () => {
          toast({ title: "Anamnese salva com sucesso" });
          queryClient.invalidateQueries({ queryKey: getObterAnamneseQueryKey(id) });
        }
      });
    } catch(e) {
      toast({ title: "JSON inválido", variant: "destructive" });
    }
  };

  const handleAtivarMotor = () => {
    ativarMotor.mutate({ data: { anamneseId: id } }, {
      onSuccess: () => {
        toast({ title: "Motor Clínico ativado com sucesso!" });
        queryClient.invalidateQueries({ queryKey: getObterAnamneseQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListarSugestoesQueryKey({ pacienteId: anamnese?.pacienteId }) });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/anamnese">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Avaliação: {anamnese?.pacienteNome}
                {anamnese?.status && (
                  <Badge variant="outline" className="ml-2 uppercase">{anamnese.status.replace('_', ' ')}</Badge>
                )}
              </h1>
            </div>
            {anamnese?.status === AnamneseStatus.concluida && !anamnese?.motorAtivadoEm && (
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_20px_rgba(var(--primary),0.5)] border border-primary/50 animate-pulse" onClick={handleAtivarMotor} disabled={ativarMotor.isPending}>
                <Activity className="w-5 h-5 mr-2" />
                {ativarMotor.isPending ? "Processando..." : "Ativar Motor Clínico"}
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Coleta de Dados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="clinico">
                    <TabsList className="mb-4 w-full">
                      <TabsTrigger value="clinico" className="flex-1">Clínico</TabsTrigger>
                      <TabsTrigger value="financeiro" className="flex-1">Financeiro</TabsTrigger>
                      <TabsTrigger value="preferencias" className="flex-1">Preferências</TabsTrigger>
                    </TabsList>
                    <TabsContent value="clinico" className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-2">Estrutura JSON livre para dados clínicos (queixas, histórico, etc)</p>
                      <Textarea 
                        className="min-h-[300px] font-mono text-sm bg-muted/30"
                        value={respostas}
                        onChange={(e) => setRespostas(e.target.value)}
                        placeholder='{"queixaPrincipal": "Cansaço extremo", "historico": "..."}'
                      />
                      <Button onClick={handleSalvar} disabled={atualizarAnamnese.isPending}>
                        {atualizarAnamnese.isPending ? "Salvando..." : "Salvar e Concluir"}
                      </Button>
                    </TabsContent>
                    <TabsContent value="financeiro">
                      <div className="p-4 bg-muted/30 rounded border text-center text-muted-foreground">Em desenvolvimento</div>
                    </TabsContent>
                    <TabsContent value="preferencias">
                      <div className="p-4 bg-muted/30 rounded border text-center text-muted-foreground">Em desenvolvimento</div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                <CardHeader className="bg-primary/5 border-b border-border pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Resultado do Motor
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {!anamnese?.motorAtivadoEm ? (
                    <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-3">
                      <PlayCircle className="w-12 h-12 text-muted-foreground/30" />
                      <p>Motor não ativado para esta anamnese.</p>
                      <p className="text-xs">Preencha os dados clínicos e ative o motor para gerar sugestões.</p>
                    </div>
                  ) : loadingSugestoes ? (
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : sugestoes?.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Nenhuma sugestão gerada.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {sugestoes?.map(s => (
                        <div key={s.id} className="p-4 hover:bg-muted/10 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">{s.tipo.replace('_', ' ')}</Badge>
                            <Badge className={
                              s.prioridade === 'urgente' ? 'bg-red-500 text-white' : 
                              s.prioridade === 'alta' ? 'bg-orange-500 text-white' : 
                              s.prioridade === 'media' ? 'bg-yellow-500 text-black' : 'bg-gray-500 text-white'
                            }>{s.prioridade}</Badge>
                          </div>
                          <p className="font-semibold text-sm mb-1">{s.itemNome}</p>
                          {s.justificativa && (
                            <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{s.justificativa}</p>
                          )}
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Status:</span>
                            <span className={`font-medium ${s.status === 'validado' ? 'text-green-500' : s.status === 'rejeitado' ? 'text-red-500' : 'text-yellow-500'}`}>
                              {s.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}