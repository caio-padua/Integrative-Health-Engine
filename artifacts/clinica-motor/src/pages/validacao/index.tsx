import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import {
  useListarSugestoes, getListarSugestoesQueryKey,
  useValidarSugestao, ValidarSugestaoBodyAcao,
  ListarSugestoesStatus
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, BrainCircuit, X } from "lucide-react";
import { useState } from "react";
import { PW, MONO, inputStyle, labelStyle } from "../craniotomia-shared";

export default function Validacao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sugestoes, isLoading } = useListarSugestoes(
    { status: ListarSugestoesStatus.pendente },
    { query: { queryKey: getListarSugestoesQueryKey({ status: ListarSugestoesStatus.pendente }) } }
  );

  const validarSugestao = useValidarSugestao();
  const [obs, setObs] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleValidar = (id: number, acao: ValidarSugestaoBodyAcao, observacao?: string) => {
    if (!user) return;

    validarSugestao.mutate({
      id,
      data: {
        acao,
        validadoPorId: user.id,
        observacao
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarSugestoesQueryKey({ status: ListarSugestoesStatus.pendente }) });
        setObs("");
        setSelectedId(null);
      }
    });
  };

  return (
    <Layout>
      <style>{`
        .vl-btn { transition: box-shadow .15s ease, border-color .15s ease; }
        .vl-aprovar:hover { box-shadow: 0 0 0 1px ${PW.cianoGlow}, 0 0 18px ${PW.cianoGlow}; }
        .vl-rejeitar:hover { border-color: ${PW.danger}; box-shadow: 0 0 14px rgba(208,138,138,0.35); }
        .vl-x:hover { color: ${PW.text}; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
            <BrainCircuit className="h-6 w-6" style={{ color: PW.ciano }} />
            Validação Médica
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 12, color: PW.muted, marginTop: 4 }}>
            Aprove ou ajuste as sugestões do Motor Pawards.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isLoading ? (
            <div style={{ color: PW.muted, fontFamily: MONO, fontSize: 12, padding: "24px 0" }}>
              Carregando...
            </div>
          ) : !sugestoes || sugestoes.length === 0 ? (
            <section
              style={{
                background: PW.bg2,
                border: `1px dashed ${PW.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 48,
                gap: 6,
              }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: PW.ciano, marginBottom: 6 }} />
              <p style={{ fontFamily: MONO, fontSize: 15, color: PW.text }}>Fila de validação limpa.</p>
              <p style={{ fontFamily: MONO, fontSize: 12, color: PW.muted }}>Nenhuma sugestão pendente de aprovação.</p>
            </section>
          ) : (
            sugestoes.map(sugestao => {
              const corBorda = sugestao.prioridade === "urgente" ? PW.danger : PW.ciano;
              return (
                <section
                  key={sugestao.id}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    background: PW.bg2,
                    border: `1px solid ${PW.border}`,
                    borderLeft: `3px solid ${corBorda}`,
                  }}
                >
                  {sugestao.prioridade === "urgente" && (
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 12,
                        fontFamily: MONO,
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: PW.danger,
                        border: `1px solid ${PW.danger}`,
                        padding: "1px 8px",
                        fontWeight: 700,
                      }}
                    >
                      Urgente
                    </span>
                  )}

                  <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                      <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontFamily: MONO,
                              fontSize: 11,
                              color: PW.t2,
                              background: PW.bg3,
                              border: `1px solid ${PW.border}`,
                              padding: "1px 8px",
                            }}
                          >
                            {sugestao.pacienteNome}
                          </span>
                          <span
                            style={{
                              fontFamily: MONO,
                              fontSize: 11,
                              textTransform: "capitalize",
                              color: PW.ciano,
                              border: `1px solid ${PW.border}`,
                              padding: "1px 8px",
                            }}
                          >
                            {sugestao.tipo.replace("_", " ")}
                          </span>
                          {sugestao.prioridade === "alta" && (
                            <span
                              style={{
                                fontFamily: MONO,
                                fontSize: 9,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: PW.warn,
                                border: `1px solid ${PW.warn}`,
                                padding: "1px 8px",
                                fontWeight: 700,
                              }}
                            >
                              Alta
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 style={{ fontFamily: MONO, fontSize: 17, color: PW.text, fontWeight: 700 }}>
                            {sugestao.itemNome}
                          </h3>
                          {sugestao.justificativa && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: 12,
                                background: PW.bg3,
                                border: `1px solid ${PW.border}`,
                                fontFamily: MONO,
                                fontSize: 12,
                                color: PW.text,
                              }}
                            >
                              <span style={{ display: "block", marginBottom: 4, color: PW.muted, fontWeight: 700, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>
                                Raciocínio do Motor:
                              </span>
                              {sugestao.justificativa}
                            </div>
                          )}
                        </div>

                        <div style={{ fontFamily: MONO, fontSize: 10, color: PW.muted }}>
                          Gerado em: {new Date(sugestao.criadoEm).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center", minWidth: 200 }}>
                        <button
                          className="vl-btn vl-aprovar"
                          onClick={() => handleValidar(sugestao.id, ValidarSugestaoBodyAcao.validar)}
                          disabled={validarSugestao.isPending}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            width: "100%",
                            background: PW.bg3,
                            border: `1px solid ${PW.ciano}`,
                            color: PW.ciano,
                            fontFamily: MONO,
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            padding: "12px 14px",
                            cursor: validarSugestao.isPending ? "not-allowed" : "pointer",
                            opacity: validarSugestao.isPending ? 0.5 : 1,
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Aprovar
                        </button>

                        <button
                          className="vl-btn vl-rejeitar"
                          onClick={() => setSelectedId(sugestao.id)}
                          disabled={validarSugestao.isPending}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            width: "100%",
                            background: "transparent",
                            border: `1px solid ${PW.border}`,
                            color: PW.danger,
                            fontFamily: MONO,
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            padding: "12px 14px",
                            cursor: validarSugestao.isPending ? "not-allowed" : "pointer",
                            opacity: validarSugestao.isPending ? 0.5 : 1,
                          }}
                        >
                          <XCircle className="w-4 h-4" /> Rejeitar / Ajustar
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>

      {selectedId !== null && (
        <div
          onClick={() => { setSelectedId(null); setObs(""); }}
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
              maxWidth: 460,
              background: PW.bg2,
              border: `1px solid ${PW.border}`,
              borderLeft: `3px solid ${PW.danger}`,
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
                Rejeitar Sugestão
              </span>
              <button
                className="vl-x"
                onClick={() => { setSelectedId(null); setObs(""); }}
                style={{ background: "none", border: "none", color: PW.muted, cursor: "pointer", lineHeight: 0 }}
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Motivo / Observação Médica (opcional)</label>
                <textarea
                  placeholder="Por que esta sugestão não é adequada?"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <button
                className="vl-btn vl-rejeitar"
                onClick={() => handleValidar(selectedId, ValidarSugestaoBodyAcao.rejeitar, obs)}
                disabled={validarSugestao.isPending}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: `1px solid ${PW.danger}`,
                  color: PW.danger,
                  fontFamily: MONO,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "10px 12px",
                  cursor: validarSugestao.isPending ? "not-allowed" : "pointer",
                  opacity: validarSugestao.isPending ? 0.5 : 1,
                }}
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
