import { db } from "@workspace/db";
import { eq, sql, and, like } from "drizzle-orm";
import {
  examesBaseTable,
  blocosTable,
  injetaveisTable,
  endovenososTable,
  implantesTable,
  formulasTable,
  doencasTable,
  dietasTable,
  sintomasTable,
  cirurgiasTable,
} from "@workspace/db";

export type TipoProcedimento =
  | "EXAM"
  | "INJE"
  | "IMPL"
  | "ENDO"
  | "FORM"
  | "DOEN"
  | "SINT"
  | "CIRU"
  | "DIET"
  | "BLCO";

export interface SemanticCodeParts {
  b1: string;
  b2: string;
  b3: string;
  b4: string;
  seq: string;
}

export const GRADE_CODES: Record<string, string> = {
  "GRADE BASICA": "GBAS",
  "GRADE INTERMEDIARIA": "GINT",
  "GRADE AMPLIADA": "GAMP",
  "GRADE SOFISTICADA": "GSOF",
  "SEM GRADE": "SGRD",
};

export const GRADE_NAMES: Record<string, string> = {
  GBAS: "GRADE BASICA",
  GINT: "GRADE INTERMEDIARIA",
  GAMP: "GRADE AMPLIADA",
  GSOF: "GRADE SOFISTICADA",
  SGRD: "SEM GRADE",
};

export function buildSemanticCode(parts: SemanticCodeParts): string {
  return `${parts.b1} ${parts.b2} ${parts.b3} ${parts.b4} ${parts.seq}`;
}

export function parseSemanticCode(code: string): SemanticCodeParts | null {
  const parts = code.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  return {
    b1: parts[0],
    b2: parts[1],
    b3: parts[2],
    b4: parts[3],
    seq: parts[4],
  };
}

export function generateAbreviacao(nome: string): string {
  const clean = nome
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .trim();
  const words = clean.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return "XXXX";

  if (words.length === 1) {
    return words[0].substring(0, 4).padEnd(4, "X");
  }

  let result = "";
  for (const word of words) {
    if (result.length >= 4) break;
    result += word[0];
  }

  if (result.length < 4) {
    result = (result + words[0].substring(1, 4)).substring(0, 4);
  }

  return result.padEnd(4, "X").substring(0, 4);
}

export async function getNextSequence(
  tipo: TipoProcedimento,
  b2: string,
  b3: string,
  b4: string,
): Promise<string> {
  let table: any;
  let codeCol: string;

  switch (tipo) {
    case "EXAM":
      table = examesBaseTable;
      codeCol = "codigo_semantico";
      break;
    case "INJE":
      table = injetaveisTable;
      codeCol = "codigo_semantico";
      break;
    case "IMPL":
      table = implantesTable;
      codeCol = "codigo_semantico";
      break;
    case "ENDO":
      table = endovenososTable;
      codeCol = "codigo_semantico";
      break;
    case "FORM":
      table = formulasTable;
      codeCol = "codigo_semantico";
      break;
    case "DOEN":
      table = doencasTable;
      codeCol = "codigo_semantico";
      break;
    case "SINT":
      table = sintomasTable;
      codeCol = "codigo_semantico";
      break;
    case "CIRU":
      table = cirurgiasTable;
      codeCol = "codigo_semantico";
      break;
    case "DIET":
      table = dietasTable;
      codeCol = "codigo_semantico";
      break;
    case "BLCO":
      table = blocosTable;
      codeCol = "codigo_semantico";
      break;
    default:
      return "0001";
  }

  const prefix = `${tipo} ${b2} ${b3} ${b4}`;
  const results = await db
    .select({ code: table.codigoSemantico })
    .from(table)
    .where(like(table.codigoSemantico, `${prefix}%`));

  if (results.length === 0) return "0001";

  let maxSeq = 0;
  for (const r of results) {
    if (!r.code) continue;
    const parts = parseSemanticCode(r.code);
    if (parts) {
      const num = parseInt(parts.seq, 10);
      if (num > maxSeq) maxSeq = num;
    }
  }

  return String(maxSeq + 1).padStart(4, "0");
}

export async function generateSemanticCode(
  tipo: TipoProcedimento,
  blocoAbrev: string,
  gradeNome: string,
  itemAbrev: string,
): Promise<{ code: string; parts: SemanticCodeParts }> {
  const b1 = tipo;
  const b2 = blocoAbrev.toUpperCase().substring(0, 4).padEnd(4, "X");
  const b3 = GRADE_CODES[gradeNome] || gradeNome.substring(0, 4).toUpperCase();
  const b4 = itemAbrev.toUpperCase().substring(0, 4).padEnd(4, "X");
  const seq = await getNextSequence(tipo, b2, b3, b4);

  const parts: SemanticCodeParts = { b1, b2, b3, b4, seq };
  return { code: buildSemanticCode(parts), parts };
}

export function getSemanticCodeRules(): object {
  return {
    formato: "B1 B2 B3 B4 SEQ",
    descricao: {
      B1: "Tipo do procedimento (4 chars): EXAM, INJE, IMPL, ENDO, FORM, DOEN, SINT, CIRU, DIET, BLCO",
      B2: "Abreviação do bloco (4 chars): BINT, TIRE, GLIC, HEPA, CARD, GONA, PROS, ADRE, etc.",
      B3: "Grade ou função (4 chars): GBAS (básica), GINT (intermediária), GAMP (ampliada), GSOF (sofisticada), SGRD (sem grade)",
      B4: "Abreviação do item (4 chars): mnemônico único do procedimento",
      SEQ: "Sequencial numérico (4 dígitos): 0001, 0002, etc.",
    },
    regras: [
      "1 exame pertence a exatamente 1 bloco e 1 grade",
      "Quando o motor sugere um exame, todos os exames da mesma grade no mesmo bloco são sugeridos",
      "O médico valida e pode incluir/excluir exames da sugestão",
      "Blocos de imagem (BLK024-BLK031) não usam grades (SGRD)",
      "A sequência é auto-incrementada dentro do grupo B1+B2+B3+B4",
    ],
    grades: GRADE_CODES,
    tipos: {
      EXAM: "Exame laboratorial ou de imagem",
      INJE: "Injetável (IM/EV/SC/ID)",
      IMPL: "Implante subcutâneo",
      ENDO: "Soro endovenoso",
      FORM: "Fórmula manipulada",
      DOEN: "Doença / Patologia",
      SINT: "Sintoma / Queixa",
      CIRU: "Cirurgia",
      DIET: "Dieta / Plano alimentar",
      BLCO: "Bloco semântico",
    },
  };
}
