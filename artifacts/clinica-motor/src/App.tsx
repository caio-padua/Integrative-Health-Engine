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
      <Route path="/pacientes/:id" component={PacienteDetalhe} />
      <Route path="/itens-terapeuticos" component={ItensTerapeuticos} />
      <Route path="/protocolos" component={Protocolos} />
      <Route path="/followup" component={Followup} />
      <Route path="/financeiro" component={Financeiro} />
      <Route path="/unidades" component={Unidades} />
      <Route path="/configuracoes" component={Configuracoes} />
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
