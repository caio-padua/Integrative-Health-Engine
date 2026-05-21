import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

const NAVY_DEEP = "#0B1220";
const NAVY_PANEL = "#101A2A";
const GOLD = "#D4AF37";
const CYAN = "#5EE6E6";
const INK = "#E5E7EB";
const INK_MUTED = "#94A3B8";

/**
 * LoaderPreview — sandbox demonstrativo dos indicadores de carregamento.
 *
 * Caio (21/mai/2026): "quero dar tipo um play e o preview me mostrar
 * a apresentação ok". Resposta: 3 simuladores com botão PLAY:
 *
 * 1. TOP PROGRESS BAR — replica idêntica da barra real, em câmera
 *    lenta (2.5s) pra inspeção visual.
 * 2. CARGA LONGA com % — círculo de progresso centralizado +
 *    contador numérico (estilo upload de arquivo pesado).
 * 3. SPINNER INFINITO — quando não há % disponível.
 */

function PlayButton({ label, onClick, ativo }: { label: string; onClick: () => void; ativo: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ativo}
      className="inline-flex items-center gap-2 px-3 py-2 border-l-[3px] hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        borderLeftColor: ativo ? CYAN : GOLD,
        background: NAVY_DEEP,
        color: ativo ? CYAN : GOLD,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.25em",
      }}
      data-testid={`btn-play-${label.replace(/\s/g, "-").toLowerCase()}`}
    >
      {ativo ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
      {ativo ? "Rodando..." : label}
    </button>
  );
}

/* ----------------- 1. TOP PROGRESS BAR (câmera lenta) ----------------- */
function PreviewTopBar() {
  const [progresso, setProgresso] = useState(0);
  const [rodando, setRodando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRodando(true);
    setProgresso(0);
    requestAnimationFrame(() => {
      setProgresso(30);
      timerRef.current = setTimeout(() => {
        setProgresso(90);
        timerRef.current = setTimeout(() => {
          setProgresso(100);
          timerRef.current = setTimeout(() => {
            setProgresso(0);
            setRodando(false);
          }, 600);
        }, 1400);
      }, 400);
    });
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="border p-5" style={{ background: NAVY_PANEL, borderColor: `${GOLD}44` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1" style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}>
            A · Top Progress Bar
          </p>
          <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
            Aparece automaticamente em toda troca de tela · 2px
          </p>
        </div>
        <PlayButton label="▶ Simular" onClick={play} ativo={rodando} />
      </div>

      {/* Frame que imita a janela do app */}
      <div className="relative border" style={{ borderColor: `${INK_MUTED}33`, background: "#000", aspectRatio: "16/3" }}>
        {/* Barra real no topo da janela */}
        <div className="absolute top-0 left-0 right-0" style={{ height: 2 }}>
          <div
            style={{
              width: `${progresso}%`,
              height: "100%",
              background: "linear-gradient(90deg, #D4AF37 0%, #E5C160 50%, #5EE6E6 100%)",
              boxShadow: progresso > 0 ? "0 0 8px rgba(212,175,55,0.6), 0 0 4px rgba(94,230,230,0.4)" : "none",
              transition:
                progresso === 0 ? "none" :
                progresso === 30 ? "width 350ms ease-out" :
                progresso === 90 ? "width 1400ms cubic-bezier(0.4, 0, 0.2, 1)" :
                "width 400ms ease-out",
              opacity: rodando ? 1 : 0,
            }}
          />
        </div>
        <div className="flex items-center justify-center h-full">
          <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
            ← janela do app
          </span>
        </div>
        <div
          className="absolute bottom-1 right-2 text-[9px] uppercase tracking-[0.2em]"
          style={{ color: rodando ? CYAN : INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
        >
          {progresso}%
        </div>
      </div>
    </div>
  );
}

/* ----------------- 2. CARGA LONGA com % (círculo) ----------------- */
function PreviewCargaLonga() {
  const [progresso, setProgresso] = useState(0);
  const [rodando, setRodando] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const play = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRodando(true);
    setProgresso(0);
    intervalRef.current = setInterval(() => {
      setProgresso((p) => {
        if (p >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => setRodando(false), 800);
          return 100;
        }
        // Aceleração não-linear: rápido no começo, lento no fim (curva ~realista)
        const incremento = p < 60 ? 2.5 : p < 85 ? 1.2 : 0.4;
        return Math.min(100, p + incremento);
      });
    }, 50);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Círculo SVG — circunferência = 2πr
  const RAIO = 42;
  const CIRC = 2 * Math.PI * RAIO;
  const offset = CIRC - (progresso / 100) * CIRC;

  return (
    <div className="border p-5" style={{ background: NAVY_PANEL, borderColor: `${GOLD}44` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1" style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}>
            B · Carga Longa com %
          </p>
          <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
            Upload de PDF, geração de RAS, importação massiva
          </p>
        </div>
        <PlayButton label="▶ Simular 5s" onClick={play} ativo={rodando} />
      </div>

      <div className="relative border flex items-center justify-center" style={{ borderColor: `${INK_MUTED}33`, background: "#000", aspectRatio: "16/9" }}>
        <div className="flex flex-col items-center gap-3">
          {/* Círculo de progresso */}
          <div className="relative" style={{ width: 100, height: 100 }}>
            <svg width={100} height={100} viewBox="0 0 100 100">
              {/* Trilha de fundo */}
              <circle cx="50" cy="50" r={RAIO} fill="none" stroke={`${GOLD}22`} strokeWidth="4" />
              {/* Progresso */}
              <circle
                cx="50"
                cy="50"
                r={RAIO}
                fill="none"
                stroke="url(#gradGold)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                transform="rotate(-90 50 50)"
                style={{
                  transition: "stroke-dashoffset 200ms ease-out",
                  filter: progresso > 0 ? "drop-shadow(0 0 4px rgba(212,175,55,0.5))" : "none",
                }}
              />
              <defs>
                <linearGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={GOLD} />
                  <stop offset="100%" stopColor={CYAN} />
                </linearGradient>
              </defs>
            </svg>
            {/* Texto do % no centro */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-lg font-bold tracking-tight"
                style={{ color: progresso === 100 ? CYAN : GOLD, fontFamily: "'JetBrains Mono', monospace" }}
                data-testid="loader-percentual"
              >
                {Math.round(progresso)}%
              </span>
            </div>
          </div>
          {/* Rótulo */}
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
            {progresso === 0 ? "Aguardando..." : progresso === 100 ? "✓ Concluído" : "Processando..."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----------------- 3. SPINNER INFINITO ----------------- */
function PreviewSpinner() {
  const [rodando, setRodando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRodando(true);
    timerRef.current = setTimeout(() => setRodando(false), 4000);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="border p-5" style={{ background: NAVY_PANEL, borderColor: `${GOLD}44` }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1" style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}>
            C · Spinner Infinito
          </p>
          <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
            Quando não há porcentagem (ex: aguardando resposta da API)
          </p>
        </div>
        <PlayButton label="▶ Simular 4s" onClick={play} ativo={rodando} />
      </div>

      <div className="relative border flex items-center justify-center" style={{ borderColor: `${INK_MUTED}33`, background: "#000", aspectRatio: "16/9" }}>
        {rodando ? (
          <div className="flex flex-col items-center gap-3">
            <svg width="60" height="60" viewBox="0 0 60 60" className="animate-spin" style={{ animationDuration: "1.2s" }}>
              <circle cx="30" cy="30" r="24" fill="none" stroke={`${GOLD}22`} strokeWidth="3" />
              <path
                d="M 30 6 A 24 24 0 0 1 54 30"
                fill="none"
                stroke={GOLD}
                strokeWidth="3"
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 3px rgba(212,175,55,0.6))" }}
              />
            </svg>
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: CYAN, fontFamily: "'JetBrains Mono', monospace" }}>
              Carregando...
            </p>
          </div>
        ) : (
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
            Aperte ▶ pra ver
          </p>
        )}
      </div>
    </div>
  );
}

export function LoaderPreview() {
  return (
    <div className="space-y-4" data-testid="loader-preview">
      <PreviewTopBar />
      <PreviewCargaLonga />
      <PreviewSpinner />
      <div className="border-l-[3px] pl-4 py-2" style={{ borderColor: CYAN, background: `${CYAN}0A` }}>
        <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}>
          Regra de uso · <span style={{ color: GOLD }}>A</span> aparece sempre, automático.
          <span style={{ color: GOLD }}> B</span> é pra ação que demora &gt; 2s e tem porcentagem real.
          <span style={{ color: GOLD }}> C</span> é fallback quando não dá pra medir progresso.
        </p>
      </div>
    </div>
  );
}
