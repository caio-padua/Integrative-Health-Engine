import { db, unidadesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const FALLBACK_NICK = "Instituto Padua";

export async function getNickUnidade(unidadeId?: number): Promise<string> {
  if (!unidadeId) {
    const [primeira] = await db.select({ nick: unidadesTable.nick }).from(unidadesTable).limit(1);
    return primeira?.nick || FALLBACK_NICK;
  }
  const [unidade] = await db.select({ nick: unidadesTable.nick }).from(unidadesTable).where(eq(unidadesTable.id, unidadeId));
  return unidade?.nick || FALLBACK_NICK;
}

export function brandHeader(nick: string): string {
  return `PAWARDS - ${nick}`;
}

export function brandFooter(): string {
  return "Developed by Pawards MedCore";
}

export function brandAgente(setor: string, nick: string): string {
  return `${setor} - ${nick}`;
}
