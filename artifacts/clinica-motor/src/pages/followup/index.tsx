import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import type { CSSProperties } from "react";
import {
  useListarFollowups, getListarFollowupsQueryKey,
  useCriarFollowup,
  useConcluirFollowup,
  FollowupTipo,
  CriarFollowupBodyTipo,
  CriarFollowupBodyRecorrencia,
  useListarPacientes,
  getListarPacientesQueryKey
} from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarClock, CheckCircle, Clock, Pencil, X, Trash2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useClinic } from "@/contexts/ClinicContext";

import { apiFetch } from "@/lib/api-fetch";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia, Governanca e Laboratorio-Validacao). Nao inventar hex novo aqui.
import { PW, MONO, inputStyle, labelStyle } from "../craniotomia-shared";

const followupSchema = z.object({
  pacienteId: z.coerce.number().min(1, "Paciente é obrigatório"),
  tipo: z.nativeEnum(CriarFollowupBodyTipo),
  dataAgendada: z.string().min(1, "Data é obrigatória"),
  observacoes: z.string().optional(),
  recorrencia: z.nativeEnum(CriarFollowupBodyRecorrencia).default(CriarFollowupBodyRecorrencia.nenhuma),
  unidadeId: z.coerce.number().default(1),
});

// ── CSS PENUMBRA: hover "luz por tras", foco neon, linhas de tabela ──────────
const FU_CSS = `
.fu-painel { transition: border-color .25s, box-shadow .25s; }
.fu-painel:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 32px -14px ${PW.cianoGlow}; }
.fu-row { transition: background .15s; }
.fu-row:hover { background: ${PW.bg3}; }
.fu-row .fu-pencil { opacity: 0; transition: opacity .15s; }
.fu-row:hover .fu-pencil { opacity: 1; }
.fu-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.fu-btn:hover:not(:disabled) { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.fu-btn:disabled { opacity: .45; cursor: not-allowed; }
.fu-input:focus { border-color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; outline: none; }
.fu-overlay { position: fixed; inset: 0; background: rgba(2,10,20,0.82); display: flex; align-items: flex-start; justify-content: center; padding: 48px 16px; z-index: 60; overflow: auto; }
`;

const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: PW.muted,
  borderBottom: `1px solid ${PW.border}`,
};
const td: CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: PW.text,
  borderBottom: `1px solid ${PW.border}`,
  verticalAlign: "top",
};

const btnOutline: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "transparent",
  border: `1px solid ${PW.border}`,
  borderRadius: 0,
  color: PW.t2,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontFamily: MONO,
};
const btnPrimario: CSSProperties = {
  ...btnOutline,
  border: `1px solid ${PW.ciano}`,
  color: PW.ciano,
};
const btnDanger: CSSProperties = {
  ...btnOutline,
  border: `1px solid ${PW.danger}`,
  color: PW.danger,
};

// ── Status -> tokens da face escura (neon sobre fundo escuro) ────────────────
const STATUS_COR: Record<string, string> = {
  realizado: PW.ok,
  cancelado: PW.danger,
  atrasado: PW.danger,
  agendado: PW.warn,
};

function badgeStatus(status: string) {
  const c = STATUS_COR[status] ?? PW.muted;
  const solido = status === "atrasado";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 8px",
        border: `1px solid ${c}`,
        borderRadius: 0,
        color: solido ? PW.bg : c,
        background: solido ? c : "transparent",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: MONO,
      }}
    >
      {status}
    </span>
  );
}

function badgeTipo(tipo: string) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 8px",
        border: `1px solid ${PW.border}`,
        borderRadius: 0,
        color: PW.t2,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: MONO,
      }}
    >
      {tipo}
    </span>
  );
}

const erroStyle: CSSProperties = { fontSize: 10, color: PW.danger, marginTop: 4, letterSpacing: "0.04em" };

export default function FollowupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { unidadeSelecionada } = useClinic();
  const queryClient = useQueryClient();

  const clinicFilter = unidadeSelecionada ? { unidadeId: unidadeSelecionada } : {};
  const { data: followups, isLoading } = useListarFollowups(clinicFilter, {
    query: { queryKey: getListarFollowupsQueryKey(clinicFilter) }
  });

  const { data: pacientes } = useListarPacientes(clinicFilter, {
    query: { queryKey: getListarPacientesQueryKey(clinicFilter) }
  });

  const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";
  const [open, setOpen] = useState(false);
  const [concluirId, setConcluirId] = useState<number | null>(null);
  const [obsConcluir, setObsConcluir] = useState("");
  const [editingFw, setEditingFw] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);

  const openEditFw = (fw: any) => {
    setEditForm({
      tipo: fw.tipo || "consulta",
      dataAgendada: fw.dataAgendada ? new Date(fw.dataAgendada).toISOString().split("T")[0] : "",
      observacoes: fw.observacoes || "",
      recorrencia: fw.recorrencia || "nenhuma",
      status: fw.status || "agendado",
    });
    setEditingFw(fw);
  };

  const saveEditFw = async () => {
    setEditSaving(true);
    try {
      const res = await apiFetch(`/api/followup/${editingFw.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast({ title: "Follow-up atualizado" });
        queryClient.invalidateQueries({ queryKey: getListarFollowupsQueryKey({}) });
        setEditingFw(null);
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: d.error || "Erro ao salvar", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
    setEditSaving(false);
  };

  const deleteEditFw = async () => {
    if (!confirm("Excluir este follow-up permanentemente?")) return;
    try {
      const res = await apiFetch(`/api/followup/${editingFw.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Follow-up removido" });
        queryClient.invalidateQueries({ queryKey: getListarFollowupsQueryKey({}) });
        setEditingFw(null);
      } else {
        toast({ title: "Erro ao excluir", variant: "destructive" });
      }
    } catch { toast({ title: "Erro de conexao", variant: "destructive" }); }
  };

  const criarFollowup = useCriarFollowup();
  const concluirFollowup = useConcluirFollowup();

  const form = useForm<z.infer<typeof followupSchema>>({
    resolver: zodResolver(followupSchema),
    defaultValues: {
      pacienteId: 0,
      tipo: CriarFollowupBodyTipo.consulta,
      dataAgendada: new Date().toISOString().split('T')[0],
      observacoes: "",
      recorrencia: CriarFollowupBodyRecorrencia.nenhuma,
      unidadeId: user?.unidadeId || 1,
    }
  });

  const onSubmit = (values: z.infer<typeof followupSchema>) => {
    criarFollowup.mutate({ data: { ...values, responsavelId: user?.id } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarFollowupsQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Follow-up agendado com sucesso." });
      }
    });
  };

  const handleConcluir = (id: number) => {
    if (!user) return;
    concluirFollowup.mutate({
      id,
      data: {
        responsavelId: user.id,
        observacoes: obsConcluir
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarFollowupsQueryKey({}) });
        setConcluirId(null);
        setObsConcluir("");
        toast({ title: "Follow-up concluído." });
      }
    });
  };

  const errors = form.formState.errors;
  const concluirFw = followups?.find((fw) => fw.id === concluirId) || null;

  return (
    <Layout>
      <style>{FU_CSS}</style>
      <div style={{ padding: 24, minHeight: "100%", background: PW.bg, color: PW.text, fontFamily: MONO }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Cabecalho */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderLeft: `3px solid ${PW.ciano}`, paddingLeft: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <CalendarClock style={{ width: 28, height: 28, color: PW.ciano, flexShrink: 0 }} />
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.04em", color: PW.text, margin: 0 }}>
                  FOLLOW-UP
                </h1>
                <p style={{ fontSize: 12, color: PW.t2, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
                  Acompanhamento continuo e agendamentos.
                </p>
              </div>
            </div>
            <button className="fu-btn" style={btnPrimario} onClick={() => setOpen(true)}>
              <Plus style={{ width: 14, height: 14 }} /> Agendar
            </button>
          </div>

          {/* Painel da tabela */}
          <section className="fu-painel" style={{ background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${PW.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CalendarClock style={{ width: 16, height: 16, color: PW.ciano }} />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PW.t2 }}>
                  Acompanhamentos agendados ({followups?.length ?? 0})
                </span>
              </div>
            </header>

            {isLoading ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: PW.muted, fontSize: 13 }}>Carregando...</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO }}>
                  <thead>
                    <tr>
                      <th style={th}>Paciente</th>
                      <th style={th}>Tipo / Data</th>
                      <th style={th}>Recorrencia</th>
                      <th style={th}>Status</th>
                      <th style={{ ...th, textAlign: "right" }}>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followups?.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ ...td, textAlign: "center", color: PW.muted, padding: "32px 0" }}>
                          Nenhum follow-up agendado.
                        </td>
                      </tr>
                    ) : (
                      followups?.map((fw) => (
                        <tr key={fw.id} className="fu-row">
                          <td style={td}>
                            <div style={{ fontWeight: 700, color: PW.text }}>{fw.pacienteNome}</div>
                            {fw.observacoes && <div style={{ fontSize: 10, color: PW.muted, marginTop: 2 }}>{fw.observacoes}</div>}
                          </td>
                          <td style={td}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {badgeTipo(fw.tipo)}
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: PW.t2 }}>
                                <Clock style={{ width: 12, height: 12 }} />
                                {new Date(fw.dataAgendada).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          </td>
                          <td style={{ ...td, color: PW.t2, textTransform: "capitalize" }}>{fw.recorrencia}</td>
                          <td style={td}>{badgeStatus(fw.status)}</td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                              {fw.status === 'agendado' || fw.status === 'atrasado' ? (
                                <button className="fu-btn" style={btnPrimario} onClick={() => setConcluirId(fw.id)}>
                                  <CheckCircle style={{ width: 12, height: 12 }} /> Concluir
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: PW.muted }}>-</span>
                              )}
                              <button className="fu-btn fu-pencil" style={{ ...btnOutline, padding: 6 }} onClick={() => openEditFw(fw)} aria-label="Editar">
                                <Pencil style={{ width: 13, height: 13 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div style={{ fontSize: 10, color: PW.muted, textAlign: "center", paddingTop: 8, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Developed and Supervised by PADCON
          </div>
        </div>
      </div>

      {/* Modal de novo follow-up (PENUMBRA proprio, substitui shadcn Dialog) */}
      {open && (
        <div className="fu-overlay" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}
          >
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${PW.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: PW.ciano }}>
                Novo follow-up
              </span>
              <button className="fu-btn" style={{ ...btnOutline, padding: 6 }} onClick={() => setOpen(false)} aria-label="Fechar">
                <X style={{ width: 14, height: 14 }} />
              </button>
            </header>

            <form onSubmit={form.handleSubmit(onSubmit)} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Paciente</label>
                <Controller
                  control={form.control}
                  name="pacienteId"
                  render={({ field }) => (
                    <select
                      className="fu-input"
                      value={field.value ? String(field.value) : ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      style={inputStyle}
                    >
                      <option value="">Selecione um paciente...</option>
                      {pacientes?.map(p => (
                        <option key={p.id} value={p.id} style={{ background: PW.bg2, color: PW.text }}>{p.nome}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.pacienteId && <div style={erroStyle}>{errors.pacienteId.message}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <Controller
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <select className="fu-input" value={field.value} onChange={(e) => field.onChange(e.target.value)} style={{ ...inputStyle, textTransform: "capitalize" }}>
                        {Object.values(CriarFollowupBodyTipo).map(t => (
                          <option key={t} value={t} style={{ background: PW.bg2, color: PW.text }}>{t}</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.tipo && <div style={erroStyle}>{errors.tipo.message}</div>}
                </div>
                <div>
                  <label style={labelStyle}>Recorrencia</label>
                  <Controller
                    control={form.control}
                    name="recorrencia"
                    render={({ field }) => (
                      <select className="fu-input" value={field.value} onChange={(e) => field.onChange(e.target.value)} style={{ ...inputStyle, textTransform: "capitalize" }}>
                        {Object.values(CriarFollowupBodyRecorrencia).map(r => (
                          <option key={r} value={r} style={{ background: PW.bg2, color: PW.text }}>{r}</option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.recorrencia && <div style={erroStyle}>{errors.recorrencia.message}</div>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Data agendada</label>
                <input type="date" className="fu-input" style={inputStyle} {...form.register("dataAgendada")} />
                {errors.dataAgendada && <div style={erroStyle}>{errors.dataAgendada.message}</div>}
              </div>

              <div>
                <label style={labelStyle}>Observacoes</label>
                <input className="fu-input" style={inputStyle} {...form.register("observacoes")} />
                {errors.observacoes && <div style={erroStyle}>{errors.observacoes.message}</div>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
                <button type="button" className="fu-btn" style={btnOutline} onClick={() => setOpen(false)}>Cancelar</button>
                <button type="submit" className="fu-btn" style={btnPrimario} disabled={criarFollowup.isPending}>
                  {criarFollowup.isPending ? "Agendando..." : "Agendar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de conclusao (PENUMBRA proprio, substitui shadcn Dialog) */}
      {concluirFw && (
        <div className="fu-overlay" onClick={() => setConcluirId(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}
          >
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${PW.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: PW.ciano }}>
                Concluir follow-up
              </span>
              <button className="fu-btn" style={{ ...btnOutline, padding: 6 }} onClick={() => setConcluirId(null)} aria-label="Fechar">
                <X style={{ width: 14, height: 14 }} />
              </button>
            </header>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Observacoes sobre a interacao (opcional)</label>
                <textarea
                  className="fu-input"
                  value={obsConcluir}
                  onChange={(e) => setObsConcluir(e.target.value)}
                  placeholder="Ex: Paciente relatou melhora nos sintomas..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="fu-btn" style={btnOutline} onClick={() => setConcluirId(null)}>Cancelar</button>
                <button
                  className="fu-btn"
                  style={btnPrimario}
                  onClick={() => handleConcluir(concluirFw.id)}
                  disabled={concluirFollowup.isPending}
                >
                  Confirmar conclusao
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edicao (PENUMBRA proprio) */}
      {editingFw && (
        <div className="fu-overlay" onClick={() => setEditingFw(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 560, background: PW.bg2, border: `1px solid ${PW.border}`, borderLeft: `3px solid ${PW.ciano}`, borderRadius: 0 }}
          >
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${PW.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: PW.ciano }}>
                Editar follow-up
              </span>
              <button className="fu-btn" style={{ ...btnOutline, padding: 6 }} onClick={() => setEditingFw(null)} aria-label="Fechar">
                <X style={{ width: 14, height: 14 }} />
              </button>
            </header>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 12, color: PW.t2 }}>Paciente: <strong style={{ color: PW.text }}>{editingFw.pacienteNome}</strong></div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select className="fu-input" value={editForm.tipo} onChange={e => setEditForm({ ...editForm, tipo: e.target.value })} style={{ ...inputStyle, textTransform: "capitalize" }}>
                    {Object.values(CriarFollowupBodyTipo).map(t => (
                      <option key={t} value={t} style={{ background: PW.bg2, color: PW.text }}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select className="fu-input" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={inputStyle}>
                    <option value="agendado" style={{ background: PW.bg2, color: PW.text }}>Agendado</option>
                    <option value="realizado" style={{ background: PW.bg2, color: PW.text }}>Realizado</option>
                    <option value="cancelado" style={{ background: PW.bg2, color: PW.text }}>Cancelado</option>
                    <option value="atrasado" style={{ background: PW.bg2, color: PW.text }}>Atrasado</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Data agendada</label>
                  <input type="date" className="fu-input" value={editForm.dataAgendada} onChange={e => setEditForm({ ...editForm, dataAgendada: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Recorrencia</label>
                  <select className="fu-input" value={editForm.recorrencia} onChange={e => setEditForm({ ...editForm, recorrencia: e.target.value })} style={{ ...inputStyle, textTransform: "capitalize" }}>
                    {Object.values(CriarFollowupBodyRecorrencia).map(r => (
                      <option key={r} value={r} style={{ background: PW.bg2, color: PW.text }}>{r}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Observacoes</label>
                  <textarea className="fu-input" value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${PW.border}` }}>
                <button className="fu-btn" style={{ ...btnPrimario, flex: 1, justifyContent: "center" }} onClick={saveEditFw} disabled={editSaving}>
                  {editSaving ? "Salvando..." : "Salvar alteracoes"}
                </button>
                <button className="fu-btn" style={btnOutline} onClick={() => setEditingFw(null)}>Cancelar</button>
                <button className="fu-btn" style={btnDanger} onClick={deleteEditFw}>
                  <Trash2 style={{ width: 13, height: 13 }} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
