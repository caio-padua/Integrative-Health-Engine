// ════════════════════════════════════════════════════════════════════
// LGPD helper: nome → iniciais
// 'Caio Padua'        → 'C.P.'
// 'maria das gracas'  → 'M.D.G.'
// 'jose'              → 'J.'
// (fallback) ''       → '—'
// ════════════════════════════════════════════════════════════════════
export function iniciaisPaciente(nome: string | null | undefined): string {
  if (!nome) return "—";
  const partes = String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "—";
  return partes.map((p) => p[0]!.toUpperCase() + ".").join("");
}
