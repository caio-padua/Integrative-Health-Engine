// Modal de aviso de sessão prestes a expirar. Reutilizável entre as telas
// administrativas que usam `useInactivityLogout` com `warningSeconds`.
// Mantém os data-testids originais (`modal-inactivity-warning`,
// `text-inactivity-countdown`, `button-stay-logged-in`) pra não quebrar testes.

import { PAWARDS } from "@/lib/pawards-tokens";

interface Props {
  // Segundos restantes até o logout. `null` esconde o modal.
  secondsLeft: number | null;
  // Callback chamada quando o usuário clica em "Continuar logado".
  onStay: () => void;
}

export function InactivityWarningModal({ secondsLeft, onStay }: Props) {
  if (secondsLeft === null) return null;

  return (
    <div
      data-testid="modal-inactivity-warning"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: PAWARDS.colors.bg.panel,
          border: `1px solid ${PAWARDS.colors.gold[700]}`,
          borderRadius: PAWARDS.radii.panel,
          boxShadow: PAWARDS.shadows.blackPiano,
          padding: 32,
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.20em",
            color: PAWARDS.colors.gold[500],
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Sessão prestes a expirar
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: PAWARDS.colors.text.primary,
            marginBottom: 18,
            lineHeight: 1.4,
          }}
        >
          Você será deslogado por inatividade
        </div>
        <div
          data-testid="text-inactivity-countdown"
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 56,
            fontWeight: 700,
            color: PAWARDS.colors.digital.amber,
            textShadow: `0 0 16px ${PAWARDS.colors.digital.amber}66`,
            letterSpacing: "0.06em",
            marginBottom: 18,
          }}
        >
          {secondsLeft}s
        </div>
        <div
          style={{
            fontSize: 12,
            color: PAWARDS.colors.text.tertiary,
            marginBottom: 22,
            lineHeight: 1.5,
          }}
        >
          Clique em <strong style={{ color: PAWARDS.colors.text.primary }}>Continuar logado</strong> para
          manter sua sessão ativa.
        </div>
        <button
          type="button"
          onClick={onStay}
          data-testid="button-stay-logged-in"
          style={{
            padding: "10px 22px",
            background: PAWARDS.colors.gold[500],
            color: "#000",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Continuar logado
        </button>
      </div>
    </div>
  );
}
