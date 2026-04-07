import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useObterFilasOperacionais, getObterFilasOperacionaisQueryKey,
  useMoverItemFila
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Activity, ClipboardList, CheckSquare, AlertTriangle, DollarSign, CalendarClock, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function Filas() {
  const { data: filas, isLoading } = useObterFilasOperacionais({}, {
    query: { queryKey: getObterFilasOperacionaisQueryKey({}) }
  });
  
  const moverItemFila = useMoverItemFila();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [novoStatus, setNovoStatus] = useState("concluido");
  const [obs, setObs] = useState("");

  const handleMoverFila = () => {
    if (!selectedItem) return;
    
    moverItemFila.mutate({
      id: selectedItem.id,
      data: {
        novoStatus,
        observacao: obs
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getObterFilasOperacionaisQueryKey({}) });
        setSelectedItem(null);
        setNovoStatus("concluido");
        setObs("");
        toast({ title: "Item movido com sucesso." });
      }
    });
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "urgente": return "bg-red-500 text-white";
      case "alta": return "bg-orange-500 text-white";
      case "media": return "bg-yellow-500 text-black";
      default: return "bg-green-500 text-white";
    }
  };

  const FilaColumn = ({ title, icon: Icon, items, colorClass }: any) => (
    <Card className="bg-card flex flex-col h-full border-t-4 border-t-primary/50" style={{ borderTopColor: colorClass }}>
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color: colorClass }} />
          {title}
          <Badge variant="secondary" className="ml-auto">{items?.length || 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3 pt-0">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : items?.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">Fila vazia</div>
        ) : (
          items?.map((item: any) => (
            <div key={item.id} className="p-3 bg-muted/30 border border-border rounded-lg shadow-sm hover:bg-muted/50 transition-colors group relative">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm truncate pr-2">{item.pacienteNome}</span>
                <Badge className={`text-[10px] ${getPrioridadeColor(item.prioridade)}`}>
                  {item.prioridade}
                </Badge>
              </div>
              {item.descricao && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.descricao}</p>
              )}
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span className="capitalize">{item.status}</span>
                <span>{new Date(item.criadoEm).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                <Dialog open={selectedItem?.id === item.id} onOpenChange={(open) => !open && setSelectedItem(null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedItem(item)}>
                      Mover <ArrowRight className="ml-2 w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Atualizar Status na Fila</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Paciente: {item.pacienteNome}</p>
                        <p className="text-xs text-muted-foreground">Fila: {title}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Novo Status</label>
                        <Select value={novoStatus} onValueChange={setNovoStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Observação (opcional)</label>
                        <Input 
                          value={obs} 
                          onChange={(e) => setObs(e.target.value)} 
                          placeholder="Motivo da mudança..."
                        />
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={handleMoverFila}
                        disabled={moverItemFila.isPending}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Central de Filas
          </h1>
          <p className="text-muted-foreground mt-1">Visão operacional completa do fluxo da clínica.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-1 h-[calc(100vh-200px)]">
          <FilaColumn 
            title="Anamnese" 
            icon={ClipboardList} 
            items={filas?.filaAnamnese} 
            colorClass="var(--color-primary)" 
          />
          <FilaColumn 
            title="Validação" 
            icon={CheckSquare} 
            items={filas?.filaValidacao} 
            colorClass="#ef4444" // red
          />
          <FilaColumn 
            title="Procedimento" 
            icon={Activity} 
            items={filas?.filaProcedimento} 
            colorClass="#3b82f6" // blue
          />
          <FilaColumn 
            title="Follow-up" 
            icon={CalendarClock} 
            items={filas?.filaFollowup} 
            colorClass="#8b5cf6" // indigo
          />
          <FilaColumn 
            title="Pagamento" 
            icon={DollarSign} 
            items={filas?.filaPagamento} 
            colorClass="#10b981" // green
          />
        </div>
      </div>
    </Layout>
  );
}