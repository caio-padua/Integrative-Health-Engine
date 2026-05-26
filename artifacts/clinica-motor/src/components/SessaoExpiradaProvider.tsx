// Task #490: provider global que escuta o evento "pawards:sessao-expirada"
// disparado pelo interceptor 401 do apiFetch (lib/api-fetch.ts) e
// mostra um banner sticky no topo da tela: "Sua sessao expirou ·
// [Entrar de novo]". O botao redireciona pra "/" (tela de login).
//
// Nao fazemos auto-redirect agressivo: o paciente/medico pode estar
// no meio de uma anamnese ou prescricao e perderia o trabalho. A
// decisao de sair fica do lado do usuario.
//
// Rotas publicas (ex: "/", "/identidade-visual", "/preview-*",
// "/craniotomia", "/galeria-mockups", "/admin/login") nao mostram o
// banner — nelas o 401 e esperado / nao se aplica. Tambem nao mostra
// quando ja se passou pra rota de login depois de clicar no CTA.
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { EVENTO_SESSAO_EXPIRADA, clearPawardsToken, clearPawardsUser } from "@/lib/api-fetch";

const PREFIXOS_ROTAS_PUBLICAS = [
  "/identidade-visual",
  "/preview-",
  "/preview/",
  "/craniotomia",
  "/galeria-mockups",
  "/admin/login",
  "/portal",
  "/padcom",
  "/portal-paciente",
];

function ehRotaPublica(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return true;
  return PREFIXOS_ROTAS_PUBLICAS.some((p) => pathname.startsWith(p));
}

export function SessaoExpiradaProvider({ children }: { children: React.ReactNode }) {
  const [visivel, setVisivel] = useState(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    function aoExpirar() {
      // Em rotas publicas o 401 nao quer dizer "sessao expirou" pro
      // usuario (provavelmente nao tinha sessao mesmo). Ignora.
      if (typeof window !== "undefined" && ehRotaPublica(window.location.pathname)) return;
      setVisivel(true);
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  // Se o usuario navegou pra rota publica (provavelmente clicou em
  // "Entrar de novo"), esconde o banner.
  useEffect(() => {
    if (visivel && ehRotaPublica(location)) setVisivel(false);
  }, [location, visivel]);

  return (
    <>
      {visivel && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="banner-sessao-expirada"
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 bg-amber-600 text-white px-4 py-2.5 text-sm font-semibold shadow-md"
        >
          <span>Sua sessao expirou.</span>
          <button
            type="button"
            data-testid="banner-sessao-expirada-cta"
            onClick={() => {
              clearPawardsToken();
              clearPawardsUser();
              setVisivel(false);
              setLocation("/");
            }}
            className="px-3 py-1 bg-white text-amber-700 hover:bg-amber-50 font-bold uppercase tracking-wide text-xs transition-colors"
          >
            Entrar de novo
          </button>
          <button
            type="button"
            aria-label="Fechar aviso"
            data-testid="banner-sessao-expirada-fechar"
            onClick={() => setVisivel(false)}
            className="ml-2 text-white/80 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
      {children}
    </>
  );
}
