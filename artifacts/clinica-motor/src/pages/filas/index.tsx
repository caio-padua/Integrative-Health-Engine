import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import {
  useObterFilasOperacionais, getObterFilasOperacionaisQueryKey,
  useMoverItemFila
} from "@workspace/api-client-react";
import { Activity, ClipboardList, CheckSquare, DollarSign, CalendarClock, ArrowRight, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useClinic } from "@/contexts/ClinicContext";
import { PW, MONO, inputStyle, labelStyle } from "../craniotomia-shared";

export default function Filas() {
  const { unidadeSelecionada } = useClinic();
  const queryParams = unidadeSelecionada ? { unidadeId: unidadeSelecionada } : {};
  const { data: filas, isLoading } = useObterFilasOperacionais(queryParams, {
    query: { queryKey: getObterFilasOperacionaisQueryKey(queryParams) }
  });

  const moverItemFila = useMoverItemFila();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [novoStatus, setNovoStatus] = useState("concluido");
  const [obs, setObs] = useState("");

  const fecharModal = () => {
    setSelectedItem(null);
    setNovoStatus("concluido");
    setObs("");
  };

  const handleMoverFila = () => {
    if (!selectedItem) return;

    moverItemFila.mutate({
      itemId: selectedItem.id,
      data: {
        novoStatus,
        observacao: obs
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getObterFilasOperacionaisQueryKey({}) });
        fecharModal();
        toast({ title: "Item movido com sucesso." });
      }
    });
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "urgente": return PW.danger;
      case "alta": return PW.warn;
      case "media": return PW.ciano;
      default: return PW.muted;
    }
  };

  const FilaColumn = ({ title, icon: Icon, items, cor }: any) => (
    <section
      className="fl-col"
      style={{
        background: PW.bg2,
        border: `1px solid ${PW.border}`,
        borderLeft: `3px solid ${cor}`,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          borderBottom: `1px solid ${PW.border}`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color: cor }} />
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
          {title}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 700,
            color: cor,
            background: PW.bg3,
            border: `1px solid ${PW.border}`,
            padding: "1px 8px",
          }}
        >
          {items?.length || 0}
        </span>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {isLoading ? (
          <div style={{ color: PW.muted, fontFamily: MONO, fontSize: 12, textAlign: "center", padding: "24px 0" }}>
            Carregando...
          </div>
        ) : !items || items.length === 0 ? (
          <div style={{ color: PW.muted, fontFamily: MONO, fontSize: 12, textAlign: "center", padding: "24px 0" }}>
            Fila vazia
          </div>
        ) : (
          items.map((item: any) => (
            <div
              key={item.id}
              className="fl-card"
              style={{
                position: "relative",
                background: PW.bg3,
                border: `1px solid ${PW.border}`,
                padding: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 13,
                    color: PW.text,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.pacienteNome}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: getPrioridadeColor(item.prioridade),
                    border: `1px solid ${getPrioridadeColor(item.prioridade)}`,
                    padding: "1px 6px",
                  }}
                >
                  {item.prioridade}
                </span>
              </div>

              {item.descricao && (
                <p
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: PW.t2,
                    marginBottom: 6,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.descricao}
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: MONO, fontSize: 10, color: PW.muted }}>
                <span style={{ textTransform: "capitalize" }}>{item.status}</span>
                <span>{new Date(item.criadoEm).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>

              <button
                className="fl-mover"
                onClick={() => setSelectedItem(item)}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "rgba(2,10,20,0.82)",
                  border: "none",
                  color: PW.ciano,
                  fontFamily: MONO,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  opacity: 0,
                }}
              >
                Mover <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );

  return (
    <Layout>
      <style>{`
        .fl-card .fl-mover { transition: opacity .15s ease; }
        .fl-card:hover .fl-mover { opacity: 1; }
        .fl-col { transition: border-color .15s ease; }
        .fl-confirm { transition: box-shadow .15s ease, border-color .15s ease; }
        .fl-confirm:hover { border-color: ${PW.ciano}; box-shadow: 0 0 0 1px ${PW.cianoGlow}, 0 0 18px ${PW.cianoGlow}; }
        .fl-x:hover { color: ${PW.text}; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 0, height: "100%" }}>
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
            <Activity className="h-6 w-6" style={{ color: PW.ciano }} />
            Central de Filas
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 12, color: PW.muted, marginTop: 4 }}>
            Visão operacional completa do fluxo da clínica.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            flex: 1,
            minHeight: 0,
          }}
        >
          <FilaColumn title="Anamnese" icon={ClipboardList} items={filas?.filaAnamnese} cor={PW.azul} />
          <FilaColumn title="Validação" icon={CheckSquare} items={filas?.filaValidacao} cor={PW.danger} />
          <FilaColumn title="Procedimento" icon={Activity} items={filas?.filaProcedimento} cor={PW.lilas} />
          <FilaColumn title="Follow-up" icon={CalendarClock} items={filas?.filaFollowup} cor={PW.gold} />
          <FilaColumn title="Pagamento" icon={DollarSign} items={filas?.filaPagamento} cor={PW.verde} />
        </div>
      </div>

      {selectedItem && (
        <div
          onClick={fecharModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,10,20,0.82)",
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
              maxWidth: 420,
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
                Atualizar Status na Fila
              </span>
              <button
                className="fl-x"
                onClick={fecharModal}
                style={{ background: "none", border: "none", color: PW.muted, cursor: "pointer", lineHeight: 0 }}
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <p style={{ fontFamily: MONO, fontSize: 13, color: PW.text, fontWeight: 600 }}>
                  Paciente: {selectedItem.pacienteNome}
                </p>
              </div>

              <div>
                <label style={labelStyle}>Novo Status</label>
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Observação (opcional)</label>
                <input
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Motivo da mudança..."
                  style={inputStyle}
                />
              </div>

              <button
                className="fl-confirm"
                onClick={handleMoverFila}
                disabled={moverItemFila.isPending}
                style={{
                  width: "100%",
                  background: PW.bg3,
                  border: `1px solid ${PW.border}`,
                  color: PW.ciano,
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "10px 12px",
                  cursor: moverItemFila.isPending ? "not-allowed" : "pointer",
                  opacity: moverItemFila.isPending ? 0.5 : 1,
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
