import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User,
  Building2, CheckCircle2, Circle, XCircle, AlertCircle,
  Syringe, MapPin, MoreVertical, Heart, FileDown,
  MessageSquare, CalendarSync, ClipboardCheck, KeyRound,
  Download, CheckCheck, X, Pencil
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { PW, MONO, inputStyle, labelStyle } from "../penumbra-claro";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; dim?: boolean }> = {
  agendada: { label: "Agendada", color: PW.azul, icon: Circle },
  confirmada: { label: "Confirmada", color: PW.ciano, icon: CheckCircle2 },
  em_andamento: { label: "Em Andamento", color: PW.gold, icon: AlertCircle },
  parcial: { label: "Parcial", color: PW.warn, icon: AlertCircle },
  concluida: { label: "Concluida", color: PW.verde, icon: CheckCircle2 },
  cancelada: { label: "Cancelada", color: PW.danger, icon: XCircle, dim: true },
  nao_compareceu: { label: "Falta", color: PW.danger, icon: XCircle, dim: true },
};

const PILL_STATUS: Record<string, { dot: string; ring: boolean; label: string }> = {
  aplicada: { dot: PW.azul, ring: true, label: "APLICADA" },
  nao_aplicada: { dot: PW.danger, ring: false, label: "N/A" },
  pendente_disp: { dot: PW.gold, ring: false, label: "DISP" },
  pendente_prox: { dot: PW.warn, ring: false, label: "PROX" },
};

function getWeekRange(date: Date): { from: string; to: string; days: Date[] } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd);
  }
  return { from: days[0].toISOString().split("T")[0], to: days[6].toISOString().split("T")[0], days };
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface AplicacaoSessao {
  aplicacao: {
    id: number; sessaoId: number; substanciaId: number;
    dose: string | null; status: string; disponibilidade: string;
    numeroSessao: number; totalSessoes: number;
    notas: string | null; aplicadoEm: string | null;
  };
  substanciaNome: string | null; substanciaCor: string | null;
  substanciaVia: string | null; substanciaDuracao: number | null;
}

interface SessaoAgenda {
  sessao: {
    id: number; pacienteId: number; unidadeId: number | null;
    profissionalId: number | null; dataAgendada: string;
    horaAgendada: string | null; horaFim: string | null;
    status: string; tipoServico: string;
    tipoProcedimento: string | null; duracaoTotalMin: number | null;
    notas: string | null; numeroSemana: number;
  };
  pacienteNome: string | null; pacienteCpf: string | null;
  unidadeNome: string | null; unidadeCor: string | null;
  unidadeEndereco: string | null; unidadeBairro: string | null;
  unidadeCidade: string | null; unidadeEstado: string | null;
  unidadeCep: string | null; profissionalNome: string | null;
  aplicacoes: AplicacaoSessao[];
  tipoProcedimentoCalc: string | null;
  duracaoTotalCalc: number | null; horaFimCalc: string | null;
}

interface AgendaResponse {
  dataFrom: string; dataTo: string;
  dias: Record<string, SessaoAgenda[]>;
}

function SubstancePill({ ap, sessaoId, onConfirm }: {
  ap: AplicacaoSessao; sessaoId: number;
  onConfirm: (sessaoId: number, substanciaId: number, confirmado: boolean) => void;
}) {
  const status = ap.aplicacao.status;
  const disp = ap.aplicacao.disponibilidade;
  const pillKey = status === "aplicada" ? "aplicada"
    : status === "nao_aplicada" ? "nao_aplicada"
    : disp === "disp" ? "pendente_disp"
    : "pendente_prox";

  const cfg = PILL_STATUS[pillKey];
  const canConfirm = status === "pendente" && disp === "disp";

  return (
    <div className="ag-pill-wrap" style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 6px",
          fontSize: 10,
          fontFamily: MONO,
          background: PW.bg2,
          border: `1px solid ${PW.border}`,
          borderLeft: `3px solid ${ap.substanciaCor || PW.muted}`,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            flexShrink: 0,
            background: cfg.dot,
            boxShadow: cfg.ring ? `0 0 0 2px ${PW.cianoGlow}` : "none",
          }}
        />
        <span
          style={{
            fontWeight: 600,
            color: PW.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 80,
          }}
        >
          {ap.substanciaNome}
        </span>
        <span style={{ color: PW.muted, fontSize: 9 }}>
          {ap.aplicacao.numeroSessao}/{ap.aplicacao.totalSessoes}
        </span>
        {status === "aplicada" && <CheckCheck className="h-3 w-3" style={{ color: PW.azul }} />}
      </div>
      {canConfirm && (
        <div className="ag-pill-actions" style={{ display: "flex", gap: 2 }}>
          <button
            className="ag-pill-ok"
            style={{
              padding: 2,
              background: PW.bg3,
              border: `1px solid ${PW.border}`,
              color: PW.verde,
              cursor: "pointer",
              lineHeight: 0,
            }}
            onClick={(e) => { e.stopPropagation(); onConfirm(sessaoId, ap.aplicacao.substanciaId, true); }}
            title="Confirmar aplicacao"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="ag-pill-no"
            style={{
              padding: 2,
              background: PW.bg3,
              border: `1px solid ${PW.border}`,
              color: PW.danger,
              cursor: "pointer",
              lineHeight: 0,
            }}
            onClick={(e) => { e.stopPropagation(); onConfirm(sessaoId, ap.aplicacao.substanciaId, false); }}
            title="Nao aplicada"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function SessaoCard({ sessao, onConfirm, onEdit }: {
  sessao: SessaoAgenda;
  onConfirm: (sessaoId: number, substanciaId: number, confirmado: boolean) => void;
  onEdit: (s: SessaoAgenda) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const config = STATUS_CONFIG[sessao.sessao.status] || STATUS_CONFIG.agendada;
  const StatusIcon = config.icon;
  const { toast } = useToast();

  const tipoProcedimento = sessao.tipoProcedimentoCalc || sessao.sessao.tipoProcedimento || null;
  const duracaoMin = sessao.duracaoTotalCalc ?? sessao.sessao.duracaoTotalMin ?? null;
  const horaFim = sessao.horaFimCalc || sessao.sessao.horaFim || null;

  const today = new Date().toISOString().split("T")[0];
  const isToday = sessao.sessao.dataAgendada === today;

  const handleIcsDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/sessoes/${sessao.sessao.id}/ics`, "_blank");
  };

  const handleWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/sessoes/${sessao.sessao.id}/whatsapp-lembrete`);
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } catch { toast({ title: "Erro ao gerar link WhatsApp", variant: "destructive" }); }
  };

  const handleSyncCalendar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/google-calendar/sync-session/${sessao.sessao.id}`, { method: "POST" });
      toast({ title: "Sincronizado com Google Calendar" });
    } catch { toast({ title: "Erro ao sincronizar", variant: "destructive" }); }
  };

  const handlePreEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/google-gmail/pre-session/${sessao.sessao.id}`, { method: "POST" });
      toast({ title: "Email pre-sessao enviado" });
    } catch { toast({ title: "Erro ao enviar email", variant: "destructive" }); }
  };

  const handlePostEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/google-gmail/post-session/${sessao.sessao.id}`, { method: "POST" });
      toast({ title: "Email pos-sessao enviado" });
    } catch { toast({ title: "Erro ao enviar email", variant: "destructive" }); }
  };

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 10px",
    background: "none",
    border: "none",
    color: PW.text,
    fontFamily: MONO,
    fontSize: 12,
    textAlign: "left",
    cursor: "pointer",
  };

  return (
    <div
      className="ag-card"
      style={{
        position: "relative",
        background: PW.bg2,
        border: `1px solid ${PW.border}`,
        borderLeft: `3px solid ${config.color}`,
        padding: 10,
        cursor: "pointer",
        opacity: config.dim ? 0.55 : 1,
        boxShadow: isToday ? `0 0 0 1px ${PW.cianoGlow}` : "none",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {sessao.sessao.horaAgendada && (
              <span style={{ fontSize: 12, fontFamily: MONO, fontWeight: 700, color: PW.text }}>
                {sessao.sessao.horaAgendada.substring(0, 5)}
                {horaFim && <span style={{ color: PW.muted, fontWeight: 400 }}> - {horaFim}</span>}
              </span>
            )}
            {isToday && (
              <span
                style={{
                  fontSize: 8,
                  fontFamily: MONO,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: PW.ciano,
                  border: `1px solid ${PW.ciano}`,
                  padding: "0 3px",
                }}
              >
                HOJE
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, fontFamily: MONO, fontWeight: 600, color: PW.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
            {sessao.pacienteNome || "Cliente"}
          </div>
          {sessao.pacienteCpf && (
            <div style={{ fontSize: 10, color: PW.muted, fontFamily: MONO }}>{sessao.pacienteCpf}</div>
          )}

          {tipoProcedimento && (
            <div style={{ marginTop: 4, fontSize: 9, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.06em", color: PW.ciano, textTransform: "uppercase" }}>
              {tipoProcedimento}
              {duracaoMin ? <span style={{ color: PW.muted, fontWeight: 400, marginLeft: 4 }}>({duracaoMin}min)</span> : null}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10,
                fontFamily: MONO,
                color: config.color,
                border: `1px solid ${PW.border}`,
                padding: "0 5px",
              }}
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
            {sessao.sessao.tipoServico === "homecare" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 9,
                  fontFamily: MONO,
                  color: PW.ciano,
                  border: `1px solid ${PW.border}`,
                  padding: "0 4px",
                }}
              >
                <Heart className="h-2.5 w-2.5" />NURSE CARE
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, position: "relative" }}>
          {sessao.unidadeCor && (
            <div style={{ width: 12, height: 12, flexShrink: 0, backgroundColor: sessao.unidadeCor }} title={sessao.unidadeNome || ""} />
          )}
          <button
            className="ag-menu-trigger"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{
              height: 22,
              width: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              color: PW.muted,
              cursor: "pointer",
              lineHeight: 0,
            }}
            aria-label="Acoes"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>

          {menuOpen && (
            <>
              <div
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
              />
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 4,
                  width: 224,
                  background: PW.bg2,
                  border: `1px solid ${PW.border}`,
                  zIndex: 41,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <button className="ag-menu-item" style={menuItemStyle} onClick={(e) => { handleSyncCalendar(e); setMenuOpen(false); }}>
                  <CalendarSync className="h-4 w-4" />Sincronizar Google Agenda
                </button>
                <button className="ag-menu-item" style={menuItemStyle} onClick={(e) => { handleIcsDownload(e); setMenuOpen(false); }}>
                  <Download className="h-4 w-4" />Baixar ICS
                </button>
                <div style={{ borderTop: `1px solid ${PW.border}` }} />
                <button className="ag-menu-item" style={menuItemStyle} onClick={(e) => { handlePreEmail(e); setMenuOpen(false); }}>
                  <MessageSquare className="h-4 w-4" />Email Pre-Sessao
                </button>
                {sessao.sessao.status === "concluida" && (
                  <button className="ag-menu-item" style={menuItemStyle} onClick={(e) => { handlePostEmail(e); setMenuOpen(false); }}>
                    <FileDown className="h-4 w-4" />Email Pos-Sessao (RAS)
                  </button>
                )}
                <div style={{ borderTop: `1px solid ${PW.border}` }} />
                <button className="ag-menu-item" style={menuItemStyle} onClick={(e) => { handleWhatsApp(e); setMenuOpen(false); }}>
                  <MessageSquare className="h-4 w-4" />Lembrete WhatsApp
                </button>
                <div style={{ borderTop: `1px solid ${PW.border}` }} />
                <button className="ag-menu-item" style={menuItemStyle} onClick={(e) => { e.stopPropagation(); onEdit(sessao); setMenuOpen(false); }}>
                  <Pencil className="h-4 w-4" />Editar Sessao
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {sessao.aplicacoes && sessao.aplicacoes.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {sessao.aplicacoes.map((ap) => (
            <SubstancePill key={ap.aplicacao.id} ap={ap} sessaoId={sessao.sessao.id} onConfirm={onConfirm} />
          ))}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${PW.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10, fontFamily: MONO, color: PW.muted, flexWrap: "wrap" }}>
            {sessao.profissionalNome && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User className="h-3 w-3" />{sessao.profissionalNome}</span>
            )}
            {sessao.unidadeNome && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building2 className="h-3 w-3" />{sessao.unidadeNome}</span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock className="h-3 w-3" />Marcacao {sessao.sessao.numeroSemana}</span>
          </div>
          {sessao.unidadeEndereco && (
            <div style={{ fontSize: 10, fontFamily: MONO, color: PW.muted, display: "flex", alignItems: "flex-start", gap: 4 }}>
              <MapPin className="h-3 w-3" style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{sessao.unidadeEndereco}{sessao.unidadeBairro ? `, ${sessao.unidadeBairro}` : ""}{sessao.unidadeCep ? ` - ${sessao.unidadeCep}` : ""}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgendaSemanal() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const week = useMemo(() => getWeekRange(currentDate), [currentDate]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingSessao, setEditingSessao] = useState<SessaoAgenda | null>(null);
  const [editSessaoForm, setEditSessaoForm] = useState<any>({});
  const [editSessaoSaving, setEditSessaoSaving] = useState(false);

  const openEditSessao = (s: SessaoAgenda) => {
    setEditSessaoForm({
      status: s.sessao.status,
      dataAgendada: s.sessao.dataAgendada,
      horaAgendada: s.sessao.horaAgendada || "",
      notas: s.sessao.notas || "",
      tipoServico: s.sessao.tipoServico || "presencial",
    });
    setEditingSessao(s);
  };

  const saveEditSessao = async () => {
    if (!editingSessao) return;
    setEditSessaoSaving(true);
    try {
      const res = await apiFetch(`/api/sessoes/${editingSessao.sessao.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSessaoForm),
      });
      if (res.ok) {
        toast({ title: "Sessao atualizada" });
        queryClient.invalidateQueries({ queryKey: ["agenda-semanal"] });
        setEditingSessao(null);
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.error || "Erro ao salvar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setEditSessaoSaving(false);
  };

  const { data, isLoading } = useQuery<AgendaResponse>({
    queryKey: ["agenda-semanal", week.from, week.to],
    queryFn: async () => {
      const res = await apiFetch(`/api/agenda/semanal?dataFrom=${week.from}&dataTo=${week.to}`);
      if (!res.ok) throw new Error("Erro ao carregar agenda");
      return res.json();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ sessaoId, substanciaId, confirmado }: { sessaoId: number; substanciaId: number; confirmado: boolean }) => {
      const res = await apiFetch(`/api/sessoes/${sessaoId}/confirmar-substancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ substanciaId, confirmado }),
      });
      if (!res.ok) throw new Error("Erro ao confirmar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-semanal"] });
      toast({ title: "Substancia atualizada" });
    },
    onError: () => toast({ title: "Erro ao confirmar substancia", variant: "destructive" }),
  });

  const handleConfirm = (sessaoId: number, substanciaId: number, confirmado: boolean) => {
    confirmMutation.mutate({ sessaoId, substanciaId, confirmado });
  };

  const goWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const totalSessoes = data ? Object.values(data.dias).reduce((sum, arr) => sum + arr.length, 0) : 0;
  const today = new Date().toISOString().split("T")[0];

  const handleIcsSemana = () => {
    window.open(`/api/sessoes/ics-semana?dataFrom=${week.from}&dataTo=${week.to}`, "_blank");
  };

  const navBtnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: PW.bg2,
    border: `1px solid ${PW.border}`,
    color: PW.t2,
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    padding: "7px 10px",
    cursor: "pointer",
  };
  const navIconStyle: React.CSSProperties = {
    height: 32,
    width: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: PW.bg2,
    border: `1px solid ${PW.border}`,
    color: PW.t2,
    cursor: "pointer",
  };

  return (
    <Layout face="claro">
      <style>{`
        .ag-card { transition: border-color .15s ease, box-shadow .15s ease; }
        .ag-card:hover { border-color: ${PW.ciano}; box-shadow: 0 0 0 1px ${PW.cianoGlow}, 0 0 18px ${PW.cianoGlow}; }
        .ag-nav { transition: box-shadow .15s ease, border-color .15s ease; }
        .ag-nav:hover { border-color: ${PW.ciano}; box-shadow: 0 0 0 1px ${PW.cianoGlow}, 0 0 14px ${PW.cianoGlow}; }
        .ag-menu-item:hover { background: ${PW.bg3}; }
        .ag-pill-ok:hover { box-shadow: 0 0 10px ${PW.cianoGlow}; }
        .ag-pill-no:hover { border-color: ${PW.danger}; }
        .ag-save:hover { box-shadow: 0 0 0 1px ${PW.cianoGlow}, 0 0 18px ${PW.cianoGlow}; }
        .ag-cancel:hover { border-color: ${PW.ciano}; }
        .ag-x:hover { color: ${PW.text}; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: MONO,
                fontSize: 22,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: PW.text,
                fontWeight: 700,
              }}
            >
              <Calendar className="h-6 w-6" style={{ color: PW.ciano }} />
              Agenda Semanal
            </h1>
            <p style={{ fontFamily: MONO, fontSize: 12, color: PW.muted, marginTop: 4 }}>
              {week.from.split("-").reverse().join("/")} a {week.to.split("-").reverse().join("/")} — {totalSessoes} sessoes
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="ag-nav" style={navBtnStyle} onClick={handleIcsSemana}>
              <Download className="h-3.5 w-3.5" />ICS Semana
            </button>
            <button className="ag-nav" style={navIconStyle} onClick={() => goWeek(-1)} aria-label="Semana anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="ag-nav" style={navBtnStyle} onClick={goToday}>
              <Calendar className="h-3.5 w-3.5" />Hoje
            </button>
            <button className="ag-nav" style={navIconStyle} onClick={() => goWeek(1)} aria-label="Proxima semana">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ color: PW.muted, fontFamily: MONO, fontSize: 12, textAlign: "center", padding: "48px 0" }}>
            Carregando...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {week.days.map((day, idx) => {
              const dateStr = day.toISOString().split("T")[0];
              const sessoesDia = data?.dias[dateStr] || [];
              const isToday = dateStr === today;
              const isWeekend = idx >= 5;

              return (
                <div key={dateStr} style={{ minHeight: 180 }}>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "6px 0",
                      background: isToday ? PW.bg3 : isWeekend ? PW.bg3 : PW.bg2,
                      borderBottom: isToday ? `2px solid ${PW.ciano}` : `1px solid ${PW.border}`,
                      border: `1px solid ${PW.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: MONO,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: isToday ? PW.ciano : isWeekend ? PW.muted : PW.t2,
                      }}
                    >
                      {DIAS_SEMANA_CURTO[day.getDay()]}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontFamily: MONO,
                        fontWeight: 700,
                        color: isToday ? PW.ciano : PW.text,
                      }}
                    >
                      {formatDate(day)}
                    </div>
                    {sessoesDia.length > 0 && (
                      <div style={{ fontSize: 9, fontFamily: MONO, marginTop: 2, color: PW.muted }}>
                        {sessoesDia.length} sessao{sessoesDia.length > 1 ? "es" : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6 }}>
                    {sessoesDia.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px 0", color: PW.muted, fontFamily: MONO }}>
                        <Calendar className="h-5 w-5" style={{ margin: "0 auto 4px", display: "block", opacity: 0.5 }} />
                        <span style={{ fontSize: 9 }}>Sem sessoes</span>
                      </div>
                    ) : (
                      sessoesDia.map((s) => <SessaoCard key={s.sessao.id} sessao={s} onConfirm={handleConfirm} onEdit={openEditSessao} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 10,
            fontFamily: MONO,
            color: PW.muted,
            borderTop: `1px solid ${PW.border}`,
            paddingTop: 12,
          }}
        >
          <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4, color: PW.t2 }}>Status:</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <span key={key} style={{ display: "flex", alignItems: "center", gap: 3, color: cfg.color }}>
                <Icon className="h-3 w-3" />{cfg.label}
              </span>
            );
          })}
          <span style={{ marginLeft: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: PW.t2 }}>Pills:</span>
          {Object.entries(PILL_STATUS).map(([key, cfg]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 8, height: 8, background: cfg.dot }} />{cfg.label}
            </span>
          ))}
        </div>

        {editingSessao && (
          <div
            onClick={() => setEditingSessao(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,26,31,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 512,
                maxHeight: "90vh",
                overflowY: "auto",
                background: PW.bg2,
                border: `1px solid ${PW.border}`,
                borderLeft: `3px solid ${PW.ciano}`,
              }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderBottom: `1px solid ${PW.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: PW.text,
                    fontWeight: 700,
                  }}
                >
                  Editar Sessao
                </span>
                <button
                  className="ag-x"
                  onClick={() => setEditingSessao(null)}
                  style={{ background: "none", border: "none", color: PW.muted, cursor: "pointer", lineHeight: 0 }}
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontFamily: MONO, fontSize: 13, color: PW.t2 }}>
                  Paciente: <strong style={{ color: PW.text }}>{editingSessao.pacienteNome}</strong>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      value={editSessaoForm.status}
                      onChange={(e) => setEditSessaoForm({ ...editSessaoForm, status: e.target.value })}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Tipo Servico</label>
                    <select
                      value={editSessaoForm.tipoServico}
                      onChange={(e) => setEditSessaoForm({ ...editSessaoForm, tipoServico: e.target.value })}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="presencial">Presencial</option>
                      <option value="homecare">Homecare</option>
                      <option value="teleconsulta">Teleconsulta</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Data</label>
                    <input
                      type="date"
                      value={editSessaoForm.dataAgendada}
                      onChange={(e) => setEditSessaoForm({ ...editSessaoForm, dataAgendada: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Hora</label>
                    <input
                      type="time"
                      value={editSessaoForm.horaAgendada?.substring(0, 5) || ""}
                      onChange={(e) => setEditSessaoForm({ ...editSessaoForm, horaAgendada: e.target.value ? e.target.value + ":00" : null })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={labelStyle}>Notas</label>
                    <textarea
                      value={editSessaoForm.notas}
                      onChange={(e) => setEditSessaoForm({ ...editSessaoForm, notas: e.target.value })}
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${PW.border}` }}>
                  <button
                    className="ag-save"
                    onClick={saveEditSessao}
                    disabled={editSessaoSaving}
                    style={{
                      flex: 1,
                      background: PW.bg3,
                      border: `1px solid ${PW.ciano}`,
                      color: PW.ciano,
                      fontFamily: MONO,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "9px 12px",
                      cursor: editSessaoSaving ? "not-allowed" : "pointer",
                      opacity: editSessaoSaving ? 0.5 : 1,
                    }}
                  >
                    {editSessaoSaving ? "Salvando..." : "Salvar Alteracoes"}
                  </button>
                  <button
                    className="ag-cancel"
                    onClick={() => setEditingSessao(null)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${PW.border}`,
                      color: PW.t2,
                      fontFamily: MONO,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "9px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
