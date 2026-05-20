import { useRoute, Link } from "wouter";
import { useObterPaciente, getObterPacienteQueryKey } from "@workspace/api-client-react";
import { FichaCockpit, type PacienteCockpit } from "@/components/cockpit/FichaCockpit";

export default function PacienteCockpitPage() {
  const [, params] = useRoute("/pacientes/:id/cockpit");
  const id = parseInt(params?.id || "0");
  const { data: paciente, isLoading, error } = useObterPaciente(id, {
    query: { enabled: id > 0, queryKey: getObterPacienteQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1220", color: "#5EE6E6", fontFamily: "JetBrains Mono, monospace", padding: 40, fontSize: 12, letterSpacing: 1.5 }}>
        CARREGANDO PACIENTE #{id}...
      </div>
    );
  }

  if (error || !paciente) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1220", color: "#FF6B6B", fontFamily: "JetBrains Mono, monospace", padding: 40, fontSize: 12 }}>
        <div>ERRO AO CARREGAR PACIENTE #{id}</div>
        <Link href={`/pacientes/${id}`} style={{ color: "#5EE6E6", marginTop: 16, display: "inline-block" }}>
          ← VOLTAR PRO LAYOUT CLÁSSICO
        </Link>
      </div>
    );
  }

  const p = paciente as unknown as Record<string, unknown>;
  const pacienteCockpit: PacienteCockpit = {
    id: (p.id as number) ?? id,
    nome: (p.nome as string) ?? "Sem nome",
    cpf: (p.cpf as string) ?? null,
    telefone: (p.telefone as string) ?? null,
    email: (p.email as string) ?? null,
    dataNascimento: (p.dataNascimento as string) ?? null,
    planoAcompanhamento: (p.planoAcompanhamento as string) ?? null,
    revo: Boolean(p.revoAtivo ?? false),
    alergias: (p.alergias as string) ?? null,
    genero: (p.genero as string) ?? null,
    unidadeNome: (p.unidadeNome as string) ?? null,
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "fixed", top: 8, right: 8, zIndex: 100, display: "flex", gap: 6 }}>
        <Link href={`/pacientes/${id}`} style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
          padding: "6px 10px", color: "#94A3B8", background: "#0B1220", border: "1px solid #1E293B",
          textDecoration: "none",
        }}>
          ← LAYOUT CLÁSSICO
        </Link>
        <Link href="/pacientes" style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
          padding: "6px 10px", color: "#5EE6E6", background: "#0B1220", border: "1px solid #5EE6E6",
          textDecoration: "none",
        }}>
          ✕ FECHAR
        </Link>
      </div>
      <FichaCockpit paciente={pacienteCockpit} />
    </div>
  );
}
