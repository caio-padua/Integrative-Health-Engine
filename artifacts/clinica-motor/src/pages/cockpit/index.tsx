// Wave Cockpit Seletor — pagina dedicada /cockpit (sem :id).
// Caio (CEO): clicar em "COCKPIT PACIENTE" no menu lateral abria a lista
// genérica de pacientes (papagaiada). Esta página dá um seletor focado pro
// modo painel-tático, com busca destacada e cards minimalistas que abrem
// /pacientes/:id/cockpit direto.
//
// Padrão visual: deep navy #0B1220 + neon ciano #5EE6E6 + JetBrains Mono
// uppercase + border-left 3px neon + zero border-radius — espelha o resto
// da lib sináptica.

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, Stethoscope, ChevronRight, X } from "lucide-react";
import {
  useListarPacientes,
  getListarPacientesQueryKey,
} from "@workspace/api-client-react";
import { useClinic } from "@/contexts/ClinicContext";

// Nota: o ClinicContext expõe `unidadeSelecionada: number | null` (não
// `selectedClinic`). Quando null, busca cross-clínicas (CEO/master).

const tk = {
  bg: "#0B1220",
  bgSoft: "#101B2E",
  bgCard: "#142036",
  border: "#1F2D49",
  neon: "#5EE6E6",
  ink: "#E8EEF7",
  inkMuted: "#9AA9C2",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

interface PacienteRow {
  id: number;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  unidadeNome?: string | null;
  dataNascimento?: string | null;
}

export default function CockpitSeletorPage() {
  const [busca, setBusca] = useState("");
  const { unidadeSelecionada } = useClinic();

  // Query só dispara com >=2 caracteres ou clínica selecionada (evita listar
  // 8.728 pacientes na primeira pintura). Quando vazio, mostra hero limpo.
  const params = useMemo(
    () => ({
      busca: busca.trim(),
      ...(unidadeSelecionada ? { unidadeId: unidadeSelecionada } : {}),
    }),
    [busca, unidadeSelecionada],
  );
  const { data: pacientes, isLoading } = useListarPacientes(params, {
    query: {
      queryKey: getListarPacientesQueryKey(params),
      enabled: busca.trim().length >= 2,
    },
  });

  const lista: PacienteRow[] = ((pacientes as unknown as PacienteRow[]) ?? []).slice(0, 30);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: tk.bg,
        color: tk.ink,
        fontFamily: tk.mono,
        padding: "32px 24px 64px",
      }}
      data-testid="cockpit-seletor-page"
    >
      {/* HERO TÁTICO */}
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto 32px",
          background: tk.bgSoft,
          border: `1px solid ${tk.border}`,
          borderLeft: `3px solid ${tk.neon}`,
          padding: 32,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            color: tk.neon,
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Painel Tático · Cockpit Paciente
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
            color: tk.ink,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Escolha o paciente
        </h1>
        <p
          style={{
            fontSize: 12,
            color: tk.inkMuted,
            margin: "8px 0 24px",
            letterSpacing: 0.5,
            lineHeight: 1.5,
            maxWidth: 680,
          }}
        >
          Digite pelo menos 2 letras do nome ou CPF. O paciente escolhido abre direto no painel tático
          (RAS, exames, alergias, agenda, sinais vitais — visão de guerra), sem passar pela ficha clássica.
        </p>

        {/* BUSCA — input grande + ícone neon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: tk.bg,
            border: `1px solid ${tk.border}`,
            borderLeft: `3px solid ${tk.neon}`,
            padding: "0 16px",
          }}
        >
          <Search size={18} color={tk.neon} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="NOME OU CPF DO PACIENTE…"
            data-testid="input-busca-cockpit"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: tk.ink,
              fontFamily: tk.mono,
              fontSize: 14,
              padding: "16px 12px",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              data-testid="limpar-busca-cockpit"
              style={{
                background: "transparent",
                border: "none",
                color: tk.inkMuted,
                cursor: "pointer",
                padding: 4,
              }}
              title="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* RESULTADOS */}
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {busca.trim().length < 2 && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: tk.inkMuted,
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              border: `1px dashed ${tk.border}`,
            }}
          >
            Aguardando busca · Digite ≥ 2 caracteres
          </div>
        )}

        {busca.trim().length >= 2 && isLoading && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: tk.neon,
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
            data-testid="loading-cockpit"
          >
            Buscando pacientes…
          </div>
        )}

        {busca.trim().length >= 2 && !isLoading && lista.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "#E07B7B",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              border: `1px solid ${tk.border}`,
            }}
            data-testid="vazio-cockpit"
          >
            Nenhum paciente bate com "{busca}"
          </div>
        )}

        {lista.length > 0 && (
          <>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 2.5,
                color: tk.inkMuted,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              {lista.length} {lista.length === 1 ? "Resultado" : "Resultados"} · Clique pra abrir cockpit
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lista.map((p) => (
                <Link
                  key={p.id}
                  href={`/pacientes/${p.id}/cockpit`}
                  data-testid={`card-paciente-${p.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr auto auto",
                    gap: 16,
                    alignItems: "center",
                    background: tk.bgCard,
                    border: `1px solid ${tk.border}`,
                    borderLeft: `3px solid ${tk.neon}`,
                    padding: "14px 16px",
                    textDecoration: "none",
                    color: tk.ink,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1A2A47";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = tk.bgCard;
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      background: "rgba(94,230,230,0.12)",
                      color: tk.neon,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Stethoscope size={20} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        color: tk.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.nome}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: tk.inkMuted,
                        letterSpacing: 1,
                        marginTop: 2,
                      }}
                    >
                      #{p.id}
                      {p.cpf ? ` · CPF ${p.cpf}` : ""}
                      {p.telefone ? ` · ${p.telefone}` : ""}
                    </div>
                  </div>
                  {p.unidadeNome && (
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: tk.inkMuted,
                        textTransform: "uppercase",
                        border: `1px solid ${tk.border}`,
                        padding: "4px 8px",
                      }}
                    >
                      {p.unidadeNome}
                    </div>
                  )}
                  <ChevronRight size={18} color={tk.neon} />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
