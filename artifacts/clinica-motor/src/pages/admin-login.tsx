// Login dedicado para o dashboard global PAWARDS MEDCORE.
// Rota: /admin/login. Salva JWT em "pawards.auth.token" e redireciona para
// /admin/dashboard-global. Apenas perfis MASTER tem acesso.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLoginUsuario, type LoginResponse } from "@workspace/api-client-react";
import { PAWARDS } from "@/lib/pawards-tokens";

const TOKEN_KEY = "pawards.auth.token";
const USER_KEY = "pawards.auth.user";
const MASTER_PERFIS = new Set(["validador_mestre", "consultoria_master", "master", "admin"]);

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const loginMutation = useLoginUsuario();

  useEffect(() => {
    const existing = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (existing) {
      setLocation("/admin/dashboard-global");
    }
  }, [setLocation]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    loginMutation.mutate(
      { data: { email: email.trim(), senha } },
      {
        onSuccess: (res: LoginResponse) => {
          const perfil = String(res.usuario?.perfil ?? "");
          if (!MASTER_PERFIS.has(perfil)) {
            setErro(`Perfil "${perfil}" sem acesso ao dashboard global.`);
            return;
          }
          if (res.token) {
            localStorage.setItem(TOKEN_KEY, res.token);
            try {
              const usr = res.usuario;
              localStorage.setItem(
                USER_KEY,
                JSON.stringify({
                  email: usr?.email ?? email.trim(),
                  nome: usr?.nome ?? null,
                  perfil,
                }),
              );
            } catch { /* ignore */ }
            setLocation("/admin/dashboard-global");
          } else {
            setErro("Resposta de login sem token.");
          }
        },
        onError: (err: Error) => {
          setErro(err.message || "Credenciais invalidas");
        },
      }
    );
  };

  const loading = loginMutation.isPending;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAWARDS.colors.bg[950],
        color: PAWARDS.colors.text.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: PAWARDS.colors.bg[900],
          border: `1px solid ${PAWARDS.colors.gold[600]}`,
          borderRadius: 12,
          padding: 32,
          maxWidth: 420,
          width: "100%",
          boxShadow: PAWARDS.shadows.blackPiano,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.20em",
            color: PAWARDS.colors.gold[500],
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          PAWARDS · MEDCORE
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
          Dashboard Global · CEO
        </h1>
        <p style={{ color: PAWARDS.colors.text.muted, fontSize: 13, marginBottom: 20 }}>
          Acesso restrito ao Dr. Caio e perfis master.
        </p>

        <label style={{ fontSize: 11, color: PAWARDS.colors.text.tertiary, letterSpacing: "0.1em" }}>
          E-MAIL
        </label>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            background: PAWARDS.colors.bg[950],
            color: "#fff",
            border: `1px solid ${PAWARDS.colors.bg[700] ?? "#1a2530"}`,
            fontSize: 13,
            margin: "6px 0 14px",
          }}
          data-testid="input-admin-email"
        />

        <label style={{ fontSize: 11, color: PAWARDS.colors.text.tertiary, letterSpacing: "0.1em" }}>
          SENHA
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            background: PAWARDS.colors.bg[950],
            color: "#fff",
            border: `1px solid ${PAWARDS.colors.bg[700] ?? "#1a2530"}`,
            fontSize: 13,
            margin: "6px 0 16px",
          }}
          data-testid="input-admin-senha"
        />

        {erro && (
          <div
            style={{
              color: "#ff7b7b",
              fontSize: 12,
              marginBottom: 12,
              padding: "8px 10px",
              background: "rgba(255,80,80,0.08)",
              border: "1px solid rgba(255,80,80,0.3)",
              borderRadius: 6,
            }}
            data-testid="admin-login-erro"
          >
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "11px 16px",
            borderRadius: 6,
            background: loading ? PAWARDS.colors.gold[600] : PAWARDS.colors.gold[500],
            color: PAWARDS.colors.bg[950],
            border: "none",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: 0.5,
          }}
          data-testid="button-admin-login"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
