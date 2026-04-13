import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClinicProvider } from "@/contexts/ClinicContext";
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
import GovernancaPage from "@/pages/governanca";
import MonitoramentoPacientePage from "@/pages/pacientes/monitoramento";
import SegurancaPage from "@/pages/seguranca";
import PainelComandoPage from "@/pages/painel-comando";
import DelegacaoPage from "@/pages/delegacao";
import ColaboradoresPage from "@/pages/colaboradores";
import AgentesVirtuaisPage from "@/pages/agentes-virtuais";
import AcompanhamentoPage from "@/pages/acompanhamento";
import ComissaoPage from "@/pages/comissao";
import ComercialPage from "@/pages/comercial";
import JustificativasPage from "@/pages/justificativas";
import MatrizAnaliticaPage from "@/pages/matriz-analitica";
import AgendaMotorPage from "@/pages/agenda-motor";
import DietasPage from "@/pages/dietas";
import PsicologiaPage from "@/pages/psicologia";
import QuestionarioMasterPage from "@/pages/questionario-master";
import ConsultoriasPage from "@/pages/consultorias";
import ContratosPage from "@/pages/contratos";

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
      <Route path="/pacientes/:id/monitoramento" component={MonitoramentoPacientePage} />
      <Route path="/portal" component={PortalClientePage} />
      <Route path="/governanca" component={GovernancaPage} />
      <Route path="/seguranca" component={SegurancaPage} />
      <Route path="/painel-comando" component={PainelComandoPage} />
      <Route path="/delegacao" component={DelegacaoPage} />
      <Route path="/colaboradores" component={ColaboradoresPage} />
      <Route path="/agentes-virtuais" component={AgentesVirtuaisPage} />
      <Route path="/acompanhamento" component={AcompanhamentoPage} />
      <Route path="/comissao" component={ComissaoPage} />
      <Route path="/comercial" component={ComercialPage} />
      <Route path="/justificativas" component={JustificativasPage} />
      <Route path="/matriz-analitica" component={MatrizAnaliticaPage} />
      <Route path="/agenda-motor" component={AgendaMotorPage} />
      <Route path="/dietas" component={DietasPage} />
      <Route path="/psicologia" component={PsicologiaPage} />
      <Route path="/questionario-master" component={QuestionarioMasterPage} />
      <Route path="/consultorias" component={ConsultoriasPage} />
      <Route path="/contratos" component={ContratosPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ClinicProvider>
            <Router />
            <Toaster />
          </ClinicProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
