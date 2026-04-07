import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useListarSugestoes, getListarSugestoesQueryKey,
  useValidarSugestao, ValidarSugestaoBodyAcao,
  ListarSugestoesStatus
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, BrainCircuit } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Validacao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: sugestoes, isLoading } = useListarSugestoes(
    { status: ListarSugestoesStatus.pendente },
    { query: { queryKey: getListarSugestoesQueryKey({ status: ListarSugestoesStatus.pendente }) } }
  );

  const validarSugestao = useValidarSugestao();
  const [obs, setObs] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleValidar = (id: number, acao: ValidarSugestaoBodyAcao, observacao?: string) => {
    if (!user) return;
    
    validarSugestao.mutate({
      id,
      data: {
        acao,
        validadoPorId: user.id,
        observacao
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarSugestoesQueryKey({ status: ListarSugestoesStatus.pendente }) });
        setObs("");
        setSelectedId(null);
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-primary" />
            Validação Médica
          </h1>
          <p className="text-muted-foreground mt-1">Aprove ou ajuste as sugestões do Motor Clínico.</p>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse h-32 bg-muted/50" />
            ))
          ) : sugestoes?.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mb-4 text-green-500/50" />
                <p className="text-lg">Fila de validação limpa.</p>
                <p className="text-sm">Nenhuma sugestão pendente de aprovação.</p>
              </CardContent>
            </Card>
          ) : (
            sugestoes?.map(sugestao => (
              <Card key={sugestao.id} className="border-l-4 border-l-primary overflow-hidden relative">
                {sugestao.prioridade === 'urgente' && (
                  <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
                    <div className="absolute top-0 left-0 bg-red-500 text-white font-bold text-xs py-1 px-10 transform translate-x-[20px] translate-y-[15px] rotate-45 shadow-sm">
                      URGENTE
                    </div>
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono bg-background">
                          {sugestao.pacienteNome}
                        </Badge>
                        <Badge className="capitalize bg-primary/20 text-primary hover:bg-primary/30">
                          {sugestao.tipo.replace('_', ' ')}
                        </Badge>
                        {sugestao.prioridade === 'alta' && (
                          <Badge className="bg-orange-500 text-white">ALTA</Badge>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-bold">{sugestao.itemNome}</h3>
                        {sugestao.justificativa && (
                          <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border text-sm">
                            <span className="font-semibold text-muted-foreground block mb-1">Raciocínio do Motor:</span>
                            {sugestao.justificativa}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Gerado em: {new Date(sugestao.criadoEm).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex md:flex-col gap-2 justify-center min-w-[200px]">
                      <Button 
                        size="lg" 
                        className="bg-green-600 hover:bg-green-700 text-white w-full"
                        onClick={() => handleValidar(sugestao.id, ValidarSugestaoBodyAcao.validar)}
                        disabled={validarSugestao.isPending}
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" /> Aprovar
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="lg" className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20">
                            <XCircle className="w-5 h-5 mr-2" /> Rejeitar / Ajustar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rejeitar Sugestão</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Motivo / Observação Médica (opcional)</label>
                              <Textarea 
                                placeholder="Por que esta sugestão não é adequada?" 
                                value={obs}
                                onChange={(e) => setObs(e.target.value)}
                              />
                            </div>
                            <Button 
                              variant="destructive" 
                              className="w-full"
                              onClick={() => handleValidar(sugestao.id, ValidarSugestaoBodyAcao.rejeitar, obs)}
                              disabled={validarSugestao.isPending}
                            >
                              Confirmar Rejeição
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}