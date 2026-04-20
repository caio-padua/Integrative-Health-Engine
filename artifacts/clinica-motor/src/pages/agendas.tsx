import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { CalendarDays, MapPin, Wifi, User, Stethoscope, Heart, Coffee } from "lucide-react";

type Agenda = {
  id: number;
  unidade_id: number;
  unidade_nome: string;
  nome: string;
  profissional: string;
  modo: "LOCAL" | "REMOTO" | "PESSOAL";
  tipo: "MEDICO" | "ENFERMAGEM" | "PESSOAL";
  ordem: number;
  ativa: boolean;
};

type Resumo = {
  unidade_id: number;
  unidade_nome: string;
  total_agendas: number;
  total_pacientes: number;
};

const corModo = {
  LOCAL: "bg-emerald-100 text-emerald-800 border-emerald-300",
  REMOTO: "bg-sky-100 text-sky-800 border-sky-300",
  PESSOAL: "bg-amber-100 text-amber-800 border-amber-300",
};

const iconeModo = {
  LOCAL: MapPin,
  REMOTO: Wifi,
  PESSOAL: Coffee,
};

const iconeTipo = {
  MEDICO: Stethoscope,
  ENFERMAGEM: Heart,
  PESSOAL: User,
};

export default function AgendasPage() {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [resumo, setResumo] = useState<Resumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agendas-profissionais").then((r) => r.json()),
      fetch("/api/agendas-profissionais/resumo").then((r) => r.json()),
    ])
      .then(([ag, res]) => {
        setAgendas(ag);
        setResumo(res);
      })
      .finally(() => setLoading(false));
  }, []);

  const agendasPorUnidade = agendas.reduce<Record<number, Agenda[]>>((acc, a) => {
    (acc[a.unidade_id] ||= []).push(a);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 border-l-4 border-[var(--pw-dourado-vivo)] pl-5 py-1">
          <div className="text-[10px] tracking-[0.32em] text-[var(--pw-dourado)] uppercase mb-1">PADCON · Capítulo IV</div>
          <h1 className="text-2xl font-semibold text-[var(--pw-petroleo)] tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6" /> Agendas Profissionais
          </h1>
          <p className="text-sm text-[var(--pw-tinta)] mt-1">
            <strong className="text-[var(--pw-petroleo)]">{agendas.length}</strong> agendas em <strong className="text-[var(--pw-petroleo)]">{resumo.length}</strong> clínicas — Médico (LOCAL · REMOTO · PESSOAL) · Assistente (LOCAL · REMOTO) · Enfermagem (LOCAL · REMOTO).
          </p>
        </div>

        {loading && <div className="text-center py-12 text-muted-foreground">Carregando…</div>}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {resumo.map((r) => {
              const isPadua = r.unidade_nome === "INSTITUTO PADUA";
              const isGenesis = r.unidade_nome === "INSTITUTO GENESIS";
              return (
                <div
                  key={r.unidade_id}
                  className={`border-2 rounded-lg p-4 ${
                    isPadua
                      ? "border-amber-400 bg-amber-50"
                      : isGenesis
                      ? "border-purple-400 bg-purple-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-[#1F4E5F]">
                      {r.unidade_nome}
                      {isPadua && <span className="ml-2">⭐</span>}
                      {isGenesis && <span className="ml-2">🧬</span>}
                    </h3>
                    <span className="text-xs text-muted-foreground">#{r.unidade_id}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>📅 {r.total_agendas} agendas</span>
                    <span>👥 {r.total_pacientes} pacientes</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading &&
          resumo.map((r) => {
            const ags = agendasPorUnidade[r.unidade_id] || [];
            const isPadua = r.unidade_nome === "INSTITUTO PADUA";
            const isGenesis = r.unidade_nome === "INSTITUTO GENESIS";
            return (
              <div key={r.unidade_id} className="mb-6 border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div
                  className={`px-4 py-3 font-semibold text-white ${
                    isPadua ? "bg-amber-600" : isGenesis ? "bg-purple-600" : "bg-[#1F4E5F]"
                  }`}
                >
                  {r.unidade_nome} {isPadua && "⭐"} {isGenesis && "🧬"}
                  <span className="ml-2 text-xs opacity-80">
                    ({ags.length} agendas · {r.total_pacientes} pacientes)
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2 w-12">#</th>
                      <th className="text-left px-4 py-2">Nome da Agenda</th>
                      <th className="text-left px-4 py-2">Profissional</th>
                      <th className="text-left px-4 py-2 w-28">Tipo</th>
                      <th className="text-left px-4 py-2 w-28">Modo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ags.map((a) => {
                      const IconModo = iconeModo[a.modo];
                      const IconTipo = iconeTipo[a.tipo];
                      return (
                        <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-400">{a.ordem}</td>
                          <td className="px-4 py-2 font-medium text-[#1F4E5F]">{a.nome}</td>
                          <td className="px-4 py-2">{a.profissional}</td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-1 text-xs">
                              <IconTipo className="w-3.5 h-3.5" /> {a.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${corModo[a.modo]}`}>
                              <IconModo className="w-3.5 h-3.5" /> {a.modo}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
      </div>
    </Layout>
  );
}
