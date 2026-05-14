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

interface ResumoConsulta {
  data: string;
  hora_inicio: string;
  tipo_procedimento?: string | null;
  status?: string | null;
  unidade?: string | null;
}

interface ResumoPaciente {
  paciente_id: number;
  paciente_nome: string;
  alergias: string | null;
  condicoes_clinicas: string | null;
  medicamentos_continuos: string | null;
  gestante: boolean | null;
  ultima_consulta: ResumoConsulta | null;
  proxima_consulta: ResumoConsulta | null;
  financeiro: {
    status: "em_dia" | "pendente" | "atrasado";
    pendentes: number;
    total_pendente: number;
  };
}

const API_BASE = import.meta.env.VITE_API_URL || "/api";

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

const FINANCEIRO_LABEL: Record<ResumoPaciente["financeiro"]["status"], string> = {
  em_dia: "Em dia",
  pendente: "Pendência",
  atrasado: "Em atraso",
};

const FINANCEIRO_COLOR: Record<ResumoPaciente["financeiro"]["status"], string> = {
  em_dia: PAWARDS.colors.status.excellent,
  pendente: PAWARDS.colors.status.warning,
  atrasado: PAWARDS.colors.status.critical,
};

function fmtHorario(h: string) {
  if (!h) return "—";
  if (h.length >= 5) return h.slice(0, 5);
  return h;
}

function fmtDataConsulta(c: ResumoConsulta | null): string {
  if (!c) return "—";
  const d = (c.data ?? "").slice(0, 10);
  let dataLabel = d;
  const partes = d.split("-");
  if (partes.length === 3) dataLabel = `${partes[2]}/${partes[1]}/${partes[0]}`;
  const hora = fmtHorario(c.hora_inicio ?? "");
  const sufixo = c.unidade ? ` · ${c.unidade}` : "";
  return `${dataLabel} ${hora}${sufixo}`;
}

function fmtBRL(v: number): string {
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${v.toFixed(2)}`;
  }
}

const cacheResumo = new Map<number, ResumoPaciente>();
const inFlight = new Map<number, Promise<ResumoPaciente | null>>();

async function carregarResumo(pacienteId: number): Promise<ResumoPaciente | null> {
  if (cacheResumo.has(pacienteId)) return cacheResumo.get(pacienteId)!;
  const existente = inFlight.get(pacienteId);
  if (existente) return existente;
  const promessa = (async () => {
    try {
      const r = await apiFetch(`${API_BASE}/painel-pawards/agenda-hoje/paciente-resumo/${pacienteId}`);
      if (!r.ok) return null;
      const data = (await r.json()) as ResumoPaciente;
      cacheResumo.set(pacienteId, data);
      return data;
    } catch {
      return null;
    } finally {
      inFlight.delete(pacienteId);
    }
  })();
  inFlight.set(pacienteId, promessa);
  return promessa;
}

interface PopoverProps {
  pacienteId: number;
  paciente: string;
  origem: "real" | "sintetico";
}

function ResumoPopover({ pacienteId, paciente, origem }: PopoverProps) {
  const [resumo, setResumo] = useState<ResumoPaciente | null>(
    cacheResumo.get(pacienteId) ?? null,
  );
  const [carregando, setCarregando] = useState(!cacheResumo.has(pacienteId));
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    if (cacheResumo.has(pacienteId)) {
      setResumo(cacheResumo.get(pacienteId)!);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    carregarResumo(pacienteId).then((r) => {
      if (cancelado) return;
      if (!r) setErro("Sem dados");
      else setResumo(r);
      setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [pacienteId]);

  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 6,
        zIndex: 50,
        background: PAWARDS.colors.bg.panel,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: PAWARDS.shadows.panel,
        borderRadius: 8,
        padding: 12,
        width: 320,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: PAWARDS.colors.text.tertiary,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        Resumo do paciente
        {origem === "sintetico" ? " · prévia" : ""}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: PAWARDS.colors.text.primary,
          marginBottom: 8,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {resumo?.paciente_nome ?? paciente}
      </div>

      {carregando && (
        <div style={{ fontSize: 11, color: PAWARDS.colors.text.muted }}>
          Carregando…
        </div>
      )}

      {!carregando && erro && (
        <div style={{ fontSize: 11, color: PAWARDS.colors.text.muted }}>
          {erro}
        </div>
      )}

      {!carregando && resumo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ResumoLinha
            rotulo="Alergias"
            valor={resumo.alergias?.trim() || "Não informado"}
            destacar={!!resumo.alergias?.trim()}
          />
          <ResumoLinha
            rotulo="Condições clínicas"
            valor={resumo.condicoes_clinicas?.trim() || "Não informado"}
          />
          {resumo.gestante && (
            <ResumoLinha rotulo="Gestante" valor="Sim" destacar />
          )}
          <ResumoLinha
            rotulo="Última consulta"
            valor={fmtDataConsulta(resumo.ultima_consulta)}
          />
          <ResumoLinha
            rotulo="Próxima consulta"
            valor={fmtDataConsulta(resumo.proxima_consulta)}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              paddingTop: 6,
              borderTop: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                color: PAWARDS.colors.text.muted,
                textTransform: "uppercase",
              }}
            >
              Financeiro
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: FINANCEIRO_COLOR[resumo.financeiro.status],
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {FINANCEIRO_LABEL[resumo.financeiro.status]}
              </div>
              {resumo.financeiro.pendentes > 0 && (
                <div style={{ fontSize: 10, color: PAWARDS.colors.text.muted, marginTop: 2 }}>
                  {resumo.financeiro.pendentes} em aberto · {fmtBRL(resumo.financeiro.total_pendente)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumoLinha({
  rotulo,
  valor,
  destacar = false,
}: {
  rotulo: string;
  valor: string;
  destacar?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.08em",
          color: PAWARDS.colors.text.muted,
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        {rotulo}
      </div>
      <div
        style={{
          fontSize: 12,
          color: destacar ? PAWARDS.colors.status.warning : PAWARDS.colors.text.primary,
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {valor}
      </div>
    </div>
  );
}

export function AgendaHoje({ consultas, origem, onStatusChange }: Props) {
  const [, setLocation] = useLocation();
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erroStatus, setErroStatus] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [hoverId, setHoverId] = useState<number | string | null>(null);
  const [pressId, setPressId] = useState<number | string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextClickRef = useRef(false);

  // Fecha o menu de status ao clicar fora ou apertar Esc
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

  // Fecha o popover de resumo ao tocar/clicar fora de uma linha de agenda
  useEffect(() => {
    if (pressId == null) return;
    function dismiss(e: MouseEvent | TouchEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && alvo.closest("[data-agenda-row='1']")) return;
      setPressId(null);
    }
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("touchstart", dismiss);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("touchstart", dismiss);
    };
  }, [pressId]);

  function iniciarLongPress(id: number | string, pacienteId: number | null | undefined) {
    if (pacienteId == null) return;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      suppressNextClickRef.current = true;
      setPressId(id);
    }, 450);
  }
  function cancelarLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

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
            if (suppressNextClickRef.current) {
              suppressNextClickRef.current = false;
              return;
            }
            if (destino) setLocation(destino);
          };

          // Status só é editável em linhas reais (não sintéticas) e quando o
          // estado atual permite alguma transição.
          const transicoes = TRANSICOES_VALIDAS[c.status] ?? [];
          const statusEditavel = !isSintetico && transicoes.length > 0;
          const idStr = String(c.id);
          const menuAberto = menuAbertoId === idStr;
          const salvando = salvandoId === idStr;
          const mostrarPopover =
            temPaciente && (hoverId === c.id || pressId === c.id);

          return (
            <div
              key={c.id}
              data-agenda-row="1"
              onMouseEnter={() => {
                if (temPaciente && c.paciente_id != null) {
                  setHoverId(c.id);
                  void carregarResumo(c.paciente_id);
                }
              }}
              onMouseLeave={() => {
                setHoverId((atual) => (atual === c.id ? null : atual));
              }}
              onTouchStart={() => {
                iniciarLongPress(c.id, c.paciente_id ?? null);
                if (temPaciente && c.paciente_id != null) {
                  void carregarResumo(c.paciente_id);
                }
              }}
              onTouchEnd={() => {
                cancelarLongPress();
              }}
              onTouchCancel={() => {
                cancelarLongPress();
                setPressId((atual) => (atual === c.id ? null : atual));
              }}
              onTouchMove={() => {
                cancelarLongPress();
              }}
              style={{
                position: "relative",
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
                onFocus={() => {
                  if (temPaciente && c.paciente_id != null) {
                    setHoverId(c.id);
                    void carregarResumo(c.paciente_id);
                  }
                }}
                onBlur={() => {
                  setHoverId((atual) => (atual === c.id ? null : atual));
                }}
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
                onFocus={() => {
                  if (temPaciente && c.paciente_id != null) {
                    setHoverId(c.id);
                    void carregarResumo(c.paciente_id);
                  }
                }}
                onBlur={() => {
                  setHoverId((atual) => (atual === c.id ? null : atual));
                }}
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
              {mostrarPopover && c.paciente_id != null && (
                <ResumoPopover
                  pacienteId={c.paciente_id}
                  paciente={c.paciente}
                  origem={origem ?? "real"}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
