import { useState, ReactNode } from "react";
import { ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface BlocoExpansivelProps {
  titulo: string;
  subtitulo?: string;
  icone?: ReactNode;
  cor?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  conteudoExpandido?: ReactNode;
}

export function BlocoExpansivel({
  titulo,
  subtitulo,
  icone,
  cor = "#5EE6E6",
  badge,
  defaultOpen = true,
  children,
  conteudoExpandido,
}: BlocoExpansivelProps) {
  const [aberto, setAberto] = useState(defaultOpen);
  const [maximizado, setMaximizado] = useState(false);

  const card = (
    <Card
      className="overflow-hidden transition-all"
      style={{
        borderLeft: `3px solid ${cor}`,
        boxShadow: aberto ? `inset 0 0 0 1px ${cor}22` : "none",
      }}
      data-testid={`bloco-${titulo.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        {icone && (
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{ backgroundColor: `${cor}18`, color: cor }}
          >
            {icone}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="text-xs uppercase tracking-[0.16em] font-mono font-bold truncate"
              style={{ color: cor }}
            >
              {titulo}
            </h3>
            {badge && (
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.5"
                style={{ backgroundColor: `${cor}22`, color: cor }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitulo && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitulo}</p>
          )}
        </div>
        {conteudoExpandido && aberto && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMaximizado(true);
            }}
            className="p-1 hover:bg-white/10 transition-colors"
            title="Maximizar com matriz profunda"
            data-testid={`btn-maximizar-${titulo.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Maximize2 className="w-3.5 h-3.5" style={{ color: cor }} />
          </button>
        )}
        <ChevronDown
          className="w-4 h-4 text-muted-foreground transition-transform"
          style={{ transform: aberto ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      {aberto && (
        <div className="px-3 pb-3 pt-1 border-t border-white/[0.04]">{children}</div>
      )}
    </Card>
  );

  if (!maximizado) return card;

  return (
    <>
      {card}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={() => setMaximizado(false)}
      >
        <div
          className="bg-[#0B1220] border w-full max-w-5xl max-h-[90vh] overflow-auto"
          style={{ borderColor: cor, boxShadow: `0 0 40px ${cor}44` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between p-4 border-b sticky top-0 bg-[#0B1220] z-10"
            style={{ borderColor: `${cor}33` }}
          >
            <div className="flex items-center gap-3">
              {icone && (
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{ backgroundColor: `${cor}22`, color: cor }}
                >
                  {icone}
                </div>
              )}
              <div>
                <h2 className="text-sm uppercase tracking-[0.2em] font-mono font-bold" style={{ color: cor }}>
                  {titulo} — Matriz Profunda
                </h2>
                {subtitulo && <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>}
              </div>
            </div>
            <button
              onClick={() => setMaximizado(false)}
              className="p-2 hover:bg-white/10"
              data-testid="btn-minimizar"
            >
              <Minimize2 className="w-4 h-4" style={{ color: cor }} />
            </button>
          </div>
          <div className="p-6">{conteudoExpandido}</div>
        </div>
      </div>
    </>
  );
}
