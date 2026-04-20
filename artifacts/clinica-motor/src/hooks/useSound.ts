import { useCallback, useEffect, useState } from "react";

const SOUND_KEY = "padcon_sound_enabled";

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    try { audioCtx = new Ctor(); } catch { return null; }
  }
  return audioCtx;
}

type Tone = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

function playTones(tones: Tone[], enabled: boolean) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  const now = ctx.currentTime;
  let offset = 0;
  for (const t of tones) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = t.type ?? "sine";
    osc.frequency.value = t.freq;
    const peak = t.gain ?? 0.06;
    g.gain.setValueAtTime(0, now + offset);
    g.gain.linearRampToValueAtTime(peak, now + offset + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + offset + t.duration / 1000);
    osc.connect(g).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + t.duration / 1000 + 0.02);
    offset += t.duration / 1000;
  }
}

/**
 * Som curatorial Apple-grade · 5 timbres sutis
 *  - tap     → toque leve em botão
 *  - select  → escolha confirmada (⌘K)
 *  - open    → abertura de painel/modal
 *  - success → ação concluída (provisionar, salvar)
 *  - error   → falha discreta
 */
export function useSound() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(SOUND_KEY);
    return v === null ? true : v === "1";
  });

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  }, [enabled]);

  const tap     = useCallback(() => playTones([{ freq: 880, duration: 22, type: "sine", gain: 0.04 }], enabled), [enabled]);
  const select  = useCallback(() => playTones([{ freq: 660, duration: 30 }, { freq: 880, duration: 50 }], enabled), [enabled]);
  const open    = useCallback(() => playTones([{ freq: 520, duration: 35, type: "sine", gain: 0.05 }], enabled), [enabled]);
  const success = useCallback(() => playTones([{ freq: 660, duration: 60 }, { freq: 880, duration: 70 }, { freq: 1100, duration: 90 }], enabled), [enabled]);
  const error   = useCallback(() => playTones([{ freq: 220, duration: 110, type: "triangle", gain: 0.07 }], enabled), [enabled]);
  const navigate = useCallback(() => playTones([{ freq: 540, duration: 28, type: "sine", gain: 0.04 }], enabled), [enabled]);

  return { enabled, setEnabled, toggle: () => setEnabled(v => !v), tap, select, open, success, error, navigate };
}
