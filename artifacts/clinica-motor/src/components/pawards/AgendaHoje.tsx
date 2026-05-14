import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { PAWARDS } from "@/lib/pawards-tokens";
import { apiFetch } from "@/lib/api-fetch";

export interface AgendaItem {
  id: number | string;
  horario: string;
  procedimento?: string;
  status: string;
  paciente: string;
  paciente_id?: number | null;
  profissional: string;
  unidade?: string;
  unidade_id?: number | null;
}

interface Props {
  consultas: AgendaItem[];
  origem?: "real" | "sintetico";
  onStatusChange?: () => void;
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

// Espelha o mapa do backend (painelPawards.ts → TRANSICOES_VALIDAS).
// Estados terminais (concluido / cancelado) ficam sem opções.
const TRANSICOES_VALIDAS: Record<string, string[]> = {
  agendado: ["aguardando", "em_atendimento", "concluido", "cancelado"],
  aguardando: ["agendado", "em_atendimento", "concluido", "cancelado"],
  em_atendimento: ["aguardando", "concluido", "cancelado"],
  concluido: [],
  cancelado: [],
};

function fmtHorario(h: string) {
  if (!h) return "—";
  if (h.length >= 5) return h.slice(0, 5);
  return h;
}

export function AgendaHoje({ consultas, origem, onStatusChange }: Props) {
  const [, setLocation] = useLocation();
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erroStatus, setErroStatus] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fecha o menu ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!menuAbertoId) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbertoId(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuAbertoId(null);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuAbertoId]);

  async function alterarStatus(id: number | string, novoStatus: string) {
    setSalvandoId(String(id));
    setErroStatus(null);
    try {
      const res = await apiFetch(`/api/painel-pawards/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setMenuAbertoId(null);
      onStatusChange?.();
    } catch (e) {
      setErroStatus((e as Error).message);
    } finally {
      setSalvandoId(null);
    }
  }

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

      {erroStatus && (
        <div
          style={{
            fontSize: 11,
            color: PAWARDS.colors.status.critical,
            marginBottom: 8,
            padding: "6px 8px",
            background: "rgba(255,80,80,0.08)",
            borderRadius: 6,
          }}
        >
          Falha ao alterar status: {erroStatus}
        </div>
      )}

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
          const isSintetico = origem === "sintetico";
          const temPaciente = c.paciente_id != null;
          const temUnidade = c.unidade_id != null;
          const clicavel = (!isSintetico && temPaciente) || (isSintetico && temUnidade);
          const destino = !isSintetico && temPaciente
            ? `/pacientes/${c.paciente_id}`
            : isSintetico && temUnidade
              ? `/unidades?unidadeId=${c.unidade_id}`
              : null;
          const titulo = !isSintetico && temPaciente
            ? `Abrir ficha de ${c.paciente}`
            : isSintetico && temUnidade
              ? `Prévia sintética — abrir unidade ${c.unidade ?? ""}`
              : "Sem destino disponível";
          const handleClick = () => {
            if (destino) setLocation(destino);
          };

          // Status só é editável em linhas reais (não sintéticas) e quando o
          // estado atual permite alguma transição.
          const transicoes = TRANSICOES_VALIDAS[c.status] ?? [];
          const statusEditavel = !isSintetico && transicoes.length > 0;
          const idStr = String(c.id);
          const menuAberto = menuAbertoId === idStr;
          const salvando = salvandoId === idStr;

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
                opacity: clicavel ? 1 : 0.75,
                outline: "none",
                transition: "background 120ms ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (clicavel) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              }}
            >
              <div
                role={clicavel ? "button" : undefined}
                tabIndex={clicavel ? 0 : undefined}
                title={titulo}
                aria-label={titulo}
                aria-disabled={clicavel ? undefined : true}
                onClick={clicavel ? handleClick : undefined}
                onKeyDown={
                  clicavel
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleClick();
                        }
                      }
                    : undefined
                }
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  color: PAWARDS.colors.digital.amber,
                  letterSpacing: "0.04em",
                  cursor: clicavel ? "pointer" : "not-allowed",
                }}
              >
                {fmtHorario(c.horario)}
              </div>
              <div
                role={clicavel ? "button" : undefined}
                tabIndex={clicavel ? 0 : undefined}
                title={titulo}
                onClick={clicavel ? handleClick : undefined}
                onKeyDown={
                  clicavel
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleClick();
                        }
                      }
                    : undefined
                }
                style={{ minWidth: 0, cursor: clicavel ? "pointer" : "not-allowed" }}
              >
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
              <div style={{ position: "relative" }} ref={menuAberto ? menuRef : undefined}>
                <button
                  type="button"
                  disabled={!statusEditavel || salvando}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!statusEditavel) return;
                    setMenuAbertoId(menuAberto ? null : idStr);
                  }}
                  title={
                    isSintetico
                      ? "Linhas sintéticas não podem ser editadas"
                      : statusEditavel
                        ? "Mudar status da consulta"
                        : "Status final — não permite mais transições"
                  }
                  aria-haspopup={statusEditavel ? "menu" : undefined}
                  aria-expanded={menuAberto || undefined}
                  style={{
                    fontSize: 10,
                    color,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: "transparent",
                    border: statusEditavel
                      ? `1px dashed ${color}`
                      : "1px solid transparent",
                    padding: "3px 8px",
                    borderRadius: 6,
                    cursor: statusEditavel ? "pointer" : "default",
                    opacity: salvando ? 0.5 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  {salvando ? "…" : (STATUS_LABEL[c.status] ?? c.status)}
                  {statusEditavel && !salvando ? " ▾" : ""}
                </button>
                {menuAberto && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 4,
                      background: PAWARDS.colors.bg.panel,
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      minWidth: 160,
                      zIndex: 20,
                      padding: 4,
                    }}
                  >
                    {transicoes.map((s) => {
                      const cor = STATUS_COLOR[s] ?? PAWARDS.colors.text.tertiary;
                      return (
                        <button
                          key={s}
                          role="menuitem"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            alterarStatus(c.id, s);
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            background: "transparent",
                            border: "none",
                            padding: "8px 10px",
                            fontSize: 11,
                            color: PAWARDS.colors.text.primary,
                            cursor: "pointer",
                            borderLeft: `3px solid ${cor}`,
                            borderRadius: 4,
                            fontFamily: "inherit",
                            letterSpacing: "0.04em",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {STATUS_LABEL[s] ?? s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
