import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useListarAnamneses, getListarAnamnesesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, ClipboardList, CheckCircle, Clock } from "lucide-react";
import type { CSSProperties } from "react";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia e na Governanca). Nao inventar hex novo aqui: tudo vem de PW / MONO.
import { PW, MONO } from "../craniotomia-shared";

const PENUMBRA_CSS = `
@keyframes anPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
.an-pulse { animation: anPulse 1.4s ease-in-out infinite; }
.an-painel { transition: border-color .25s, box-shadow .25s; }
.an-painel:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 32px -14px ${PW.cianoGlow}; }
.an-row { transition: background .15s; }
.an-row:hover { background: ${PW.bg3}; }
.an-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.an-btn:hover { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.an-link { transition: color .2s, text-shadow .2s; }
.an-link:hover { color: ${PW.ciano}; text-shadow: 0 0 12px ${PW.cianoGlow}; }
`;

const badgeBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 10px",
  borderRadius: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  fontFamily: MONO,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: PW.muted,
  borderBottom: `1px solid ${PW.border}`,
  fontFamily: MONO,
};

const tdStyle: CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  color: PW.text,
  borderBottom: `1px solid ${PW.border}`,
  fontFamily: MONO,
};

export default function Anamneses() {
  const { data: anamneses, isLoading } = useListarAnamneses({}, {
    query: { queryKey: getListarAnamnesesQueryKey({}) }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluida":
        return (
          <span style={{ ...badgeBase, background: PW.bg3, color: PW.ciano, border: `1px solid ${PW.borderNeon}` }}>
            Concluída
          </span>
        );
      case "validada":
        return (
          <span style={{ ...badgeBase, background: PW.bg3, color: PW.ok, border: `1px solid ${PW.ok}` }}>
            Validada
          </span>
        );
      case "em_andamento":
        return (
          <span style={{ ...badgeBase, background: PW.bg3, color: PW.warn, border: `1px solid ${PW.warn}` }}>
            Em Andamento
          </span>
        );
      default:
        return (
          <span style={{ ...badgeBase, background: PW.bg3, color: PW.muted, border: `1px solid ${PW.border}` }}>
            Pendente
          </span>
        );
    }
  };

  return (
    <Layout>
      <style>{PENUMBRA_CSS}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          fontFamily: MONO,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              borderLeft: `3px solid ${PW.gold}`,
              paddingLeft: 16,
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: PW.gold,
                marginBottom: 4,
              }}
            >
              PADCON · Capítulo II
            </div>
            <h1
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: PW.text,
                margin: 0,
              }}
            >
              <ClipboardList style={{ width: 24, height: 24, color: PW.ciano }} />
              Anamneses
            </h1>
            <p style={{ fontSize: 13, color: PW.t2, marginTop: 6, marginBottom: 0 }}>
              Avaliações clínicas integrativas — escuta longa, gatilhos, terreno biopsicossocial.
            </p>
          </div>

          <Link href="/anamnese/nova">
            <button
              className="an-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 16px",
                background: PW.bg2,
                border: `1px solid ${PW.border}`,
                borderLeft: `3px solid ${PW.ciano}`,
                borderRadius: 0,
                color: PW.t2,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: MONO,
              }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Nova Anamnese
            </button>
          </Link>
        </div>

        <section
          className="an-painel"
          style={{
            background: PW.bg2,
            border: `1px solid ${PW.border}`,
            borderLeft: `3px solid ${PW.ciano}`,
            borderRadius: 0,
          }}
        >
          {isLoading ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="an-pulse"
                  style={{ height: 56, background: PW.bg3, border: `1px solid ${PW.border}` }}
                />
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Paciente</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Motor Pawards</th>
                    <th style={thStyle}>Data</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {anamneses?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          ...tdStyle,
                          textAlign: "center",
                          height: 96,
                          color: PW.muted,
                        }}
                      >
                        Nenhuma anamnese encontrada.
                      </td>
                    </tr>
                  ) : (
                    anamneses?.map((anamnese) => (
                      <tr key={anamnese.id} className="an-row">
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{anamnese.pacienteNome}</td>
                        <td style={tdStyle}>{getStatusBadge(anamnese.status)}</td>
                        <td style={tdStyle}>
                          {anamnese.motorAtivadoEm ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: PW.ok }}>
                              <CheckCircle style={{ width: 16, height: 16 }} /> Ativado
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: PW.muted }}>
                              <Clock style={{ width: 16, height: 16 }} /> Não ativado
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, color: PW.muted }}>
                          {new Date(anamnese.criadoEm).toLocaleDateString()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <Link
                            href={`/anamnese/${anamnese.id}`}
                            className="an-link"
                            style={{
                              color: PW.t2,
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              textDecoration: "none",
                            }}
                          >
                            Ver Detalhes
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
