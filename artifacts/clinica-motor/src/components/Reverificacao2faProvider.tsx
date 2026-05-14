// Task #217: provider que registra o handler global de re-verificacao
// 2FA em `apiFetch` e renderiza o <Modal2faReverificar/> quando o
// interceptor pede.
//
// Montado em App.tsx no topo da arvore. Quando qualquer chamada feita
// via `apiFetch` recebe 403 + `codigo: "2FA_EXPIRADO"`, o interceptor
// invoca o handler aqui, que abre o modal e devolve uma Promise que
// resolve quando o usuario:
//   - confirma codigo correto -> { success: true }  (interceptor refaz a request)
//   - cancela / fecha          -> { success: false } (interceptor devolve o 403 original)
import { useEffect, useRef, useState } from "react";
import { setReverificacao2faHandler } from "@/lib/api-fetch";
import { Modal2faReverificar } from "@/components/Modal2faReverificar";

type Pendente = { resolve: (r: { success: boolean }) => void };

export function Reverificacao2faProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendente, setPendente] = useState<Pendente | null>(null);
  // Guarda referencia pra evitar concorrencia: se 2 requests caem em
  // 403 ao mesmo tempo, ambas esperam o mesmo modal e recebem o
  // mesmo resultado — evita pedir o codigo 2x seguidas.
  const pendenteRef = useRef<Promise<{ success: boolean }> | null>(null);

  useEffect(() => {
    setReverificacao2faHandler(() => {
      if (pendenteRef.current) return pendenteRef.current;
      const p = new Promise<{ success: boolean }>((resolve) => {
        setPendente({
          resolve: (r) => {
            pendenteRef.current = null;
            resolve(r);
          },
        });
      });
      pendenteRef.current = p;
      return p;
    });
    return () => {
      setReverificacao2faHandler(null);
      pendenteRef.current = null;
    };
  }, []);

  return (
    <>
      {children}
      {pendente && (
        <Modal2faReverificar
          onClose={(success) => {
            pendente.resolve({ success });
            setPendente(null);
          }}
        />
      )}
    </>
  );
}
