import { PAWARDS } from "@/lib/pawards-tokens";

export interface AgendaItem {
  id: number | string;
  horario: string;
  procedimento?: string;
  status: string;
  paciente: string;
  profissional: string;
  unidade?: string;
}

interface Props {
  consultas: AgendaItem[];
  origem?: "real" | "sintetico";
}

const STATUS_COLOR: Record<string, string> = {
  agendado: PAWARDS.colors.status.online,
  aguardando: PAWARDS.colors.status.warning,
  em_atendimento: PAWARDS.colors.status.excellent,
  concluido: PAWARDS.colors.text.tertiary,
  cancelado: PAWARDS.colors.status.critical,
};

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado",
  aguardando: "Aguardando",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function fmtHorario(h: string) {
  if (!h) return "—";
  if (h.length >= 5) return h.slice(0, 5);
  return h;
}

export function AgendaHoje({ consultas, origem }: Props) {
  return (
    <div
      style={{
        background: PAWARDS.colors.bg.panel,
        borderRadius: PAWARDS.radii.panel,
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: PAWARDS.shadows.panel,
        padding: 24,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            color: PAWARDS.colors.text.tertiary,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          Agenda de hoje
        </div>
        <div style={{ fontSize: 10, color: PAWARDS.colors.text.muted, letterSpacing: "0.06em" }}>
          {consultas.length} consultas{origem === "sintetico" ? " · prévia" : ""}
        </div>
      </div>

      {consultas.length === 0 && (
        <div style={{ color: PAWARDS.colors.text.muted, fontSize: 12 }}>
          Sem consultas para hoje.
        </div>
      )}

      <div
        style={{
          overflowY: "auto",
          maxHeight: 320,
          paddingRight: 4,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {consultas.map((c) => {
          const color = STATUS_COLOR[c.status] ?? PAWARDS.colors.text.tertiary;
          return (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                borderLeft: `3px solid ${color}`,
              }}
            >
              <div
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  color: PAWARDS.colors.digital.amber,
                  letterSpacing: "0.04em",
                }}
              >
                {fmtHorario(c.horario)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: PAWARDS.colors.text.primary,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.paciente}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: PAWARDS.colors.text.muted,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.profissional}
                  {c.unidade ? ` · ${c.unidade}` : ""}
                  {c.procedimento ? ` · ${c.procedimento}` : ""}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {STATUS_LABEL[c.status] ?? c.status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
