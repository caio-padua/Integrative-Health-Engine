import { Layout } from "@/components/Layout";
import { Stethoscope } from "lucide-react";

export default function SessoesPage() {
  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Stethoscope className="w-7 h-7 text-[#1F4E5F]" />
          <div>
            <h1 className="text-2xl font-semibold text-[#1F4E5F]">Sessões Clínicas</h1>
            <p className="text-sm text-stone-600">Histórico de atendimentos por paciente · em construção</p>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-none p-12 text-center text-stone-500">
          <Stethoscope className="w-16 h-16 mx-auto mb-4 text-stone-300" />
          <p className="text-lg font-medium text-stone-700">Módulo de Sessões em Construção</p>
          <p className="text-sm mt-2">A linha do tempo de atendimentos vai ser aqui — consulta, retorno, sessão de injetável, sessão endovenosa, sessão de implante.</p>
          <p className="text-xs mt-4 text-stone-400">Por ora use Pacientes → Detalhe → aba "Histórico" para ver atendimentos.</p>
        </div>
      </div>
    </Layout>
  );
}
