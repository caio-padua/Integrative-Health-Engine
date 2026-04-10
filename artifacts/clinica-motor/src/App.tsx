import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Anamneses from "@/pages/anamnese";
import NovaAnamnese from "@/pages/anamnese/nova";
import AnamneseDetalhe from "@/pages/anamnese/[id]";
import Validacao from "@/pages/validacao";
import Filas from "@/pages/filas";
import Pacientes from "@/pages/pacientes";
import PacienteDetalhe from "@/pages/pacientes/[id]";
import ItensTerapeuticos from "@/pages/itens-terapeuticos";
import Protocolos from "@/pages/protocolos";
import Followup from "@/pages/followup";
import Financeiro from "@/pages/financeiro";
import Unidades from "@/pages/unidades";
import Configuracoes from "@/pages/configuracoes";
import Fluxos from "@/pages/fluxos";
import Permissoes from "@/pages/permissoes";
import Catalogo from "@/pages/catalogo";
import QuestionarioPaciente from "@/pages/pacientes/questionario";
import PedidosExame from "@/pages/pedidos-exame";
import Substancias from "@/pages/substancias";
import AgendaSemanal from "@/pages/agenda";
import CodigosSemanticos from "@/pages/codigos-semanticos";
import RasPage from "@/pages/ras";
import CodigosValidacaoPage from "@/pages/codigos-validacao";
import EstoquePage from "@/pages/estoque";
import TaskCardsPage from "@/pages/task-cards";
import AvaliacaoEnfermagemPage from "@/pages/avaliacao-enfermagem";
import RasEvolutivoPage from "@/pages/ras-evolutivo";
import PortalClientePage from "@/pages/portal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/anamnese" component={Anamneses} />
      <Route path="/anamnese/nova" component={NovaAnamnese} />
      <Route path="/anamnese/:id" component={AnamneseDetalhe} />
      <Route path="/validacao" component={Validacao} />
      <Route path="/filas" component={Filas} />
      <Route path="/pacientes" component={Pacientes} />
      <Route path="/pacientes/:id/questionario" component={QuestionarioPaciente} />
      <Route path="/pacientes/:id" component={PacienteDetalhe} />
      <Route path="/itens-terapeuticos" component={ItensTerapeuticos} />
      <Route path="/protocolos" component={Protocolos} />
      <Route path="/followup" component={Followup} />
      <Route path="/financeiro" component={Financeiro} />
      <Route path="/unidades" component={Unidades} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/fluxos" component={Fluxos} />
      <Route path="/permissoes" component={Permissoes} />
      <Route path="/pedidos-exame" component={PedidosExame} />
      <Route path="/catalogo" component={Catalogo} />
      <Route path="/substancias" component={Substancias} />
      <Route path="/agenda" component={AgendaSemanal} />
      <Route path="/codigos-semanticos" component={CodigosSemanticos} />
      <Route path="/ras" component={RasPage} />
      <Route path="/codigos-validacao" component={CodigosValidacaoPage} />
      <Route path="/estoque" component={EstoquePage} />
      <Route path="/task-cards" component={TaskCardsPage} />
      <Route path="/avaliacao-enfermagem" component={AvaliacaoEnfermagemPage} />
      <Route path="/ras-evolutivo" component={RasEvolutivoPage} />
      <Route path="/portal" component={PortalClientePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
