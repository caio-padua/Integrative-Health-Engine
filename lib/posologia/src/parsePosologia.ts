import type {
  PosologiaEstruturada,
  ParseContexto,
  UnidadeForma,
  ViaAdministracao,
  MomentoIngestao,
  Frequencia,
} from "./types.js";

/* -------------------------------------------------------------------------- */
/* Normalização                                                               */
/* -------------------------------------------------------------------------- */

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Mapas de detecção                                                          */
/* -------------------------------------------------------------------------- */

const FORMA_REGEX: Array<[RegExp, UnidadeForma]> = [
  [/\b(caps?(?:ulas?)?|caps?)\b/, "capsula"],
  [/\b(comp(?:r(?:imidos?)?)?|cpr|cp)\b/, "comprimido"],
  [/\bpellets?\b/, "pellet"],
  [/\b(ml|mililitros?)\b/, "ml"],
  [/\bgotas?\b/, "gota"],
  [/\bampolas?\b/, "ampola"],
  [/\bsach[eê]s?\b/, "sache"],
  [/\bsprays?\b/, "spray"],
  [/\bpuffs?\b/, "puff"],
  [/\bdoses?\b/, "dose"],
  [/\bunid(?:ades?)?\b/, "unidade"],
];

const VIA_REGEX: Array<[RegExp, ViaAdministracao]> = [
  [/\b(vo|via oral|oral)\b/, "oral"],
  [/\b(sl|sublingual)\b/, "sublingual"],
  [/\b(im|intramuscular)\b/, "intramuscular"],
  [/\b(ev|iv|endovenos[ao]|intravenos[ao])\b/, "endovenosa"],
  [/\b(sc|subcutane[ao])\b/, "subcutanea"],
  [/\b(t[oó]pic[ao]|uso topico)\b/, "topica"],
  [/\bnasal\b/, "nasal"],
  [/\bretal\b/, "retal"],
  [/\bvaginal\b/, "vaginal"],
  [/\bocular\b/, "ocular"],
  [/\bimplante\b/, "implante"],
];

const MOMENTO_REGEX: Array<[RegExp, MomentoIngestao]> = [
  [/\bem\s+jejum\b|\bjejum\b/, "jejum"],
  [/\bantes\s+de\s+dormir\b|\bao\s+deitar\b/, "antes_dormir"],
  [/\bantes\s+(do\s+)?caf[eé]\b/, "antes_cafe"],
  [/\bantes\s+(do\s+)?almoc[oa]\b/, "antes_almoco"],
  [/\bantes\s+(do\s+)?jantar\b/, "antes_jantar"],
  [/\bcom\s+(as\s+)?refei[cç][oõ]es?\b|\bdurante\s+(as\s+)?refei[cç][oõ]es?\b/, "com_refeicao"],
  [/\bap[oó]s\s+(as\s+)?refei[cç][oõ]es?\b|\bdepois\s+(das\s+)?refei[cç][oõ]es?\b/, "apos_refeicao"],
  [/\bpela\s+manh[ãa]\b|\bde\s+manh[ãa]\b/, "manha"],
  [/\b[aà]\s+tarde\b|\bpela\s+tarde\b/, "tarde"],
  [/\b[aà]\s+noite\b|\bpela\s+noite\b/, "noite"],
];

/* -------------------------------------------------------------------------- */
/* Detectores específicos                                                     */
/* -------------------------------------------------------------------------- */

function detectarForma(t: string): UnidadeForma | undefined {
  for (const [re, forma] of FORMA_REGEX) if (re.test(t)) return forma;
  return undefined;
}

function detectarVia(t: string): ViaAdministracao | undefined {
  for (const [re, via] of VIA_REGEX) if (re.test(t)) return via;
  return undefined;
}

function detectarMomentos(t: string): MomentoIngestao[] {
  const out: MomentoIngestao[] = [];
  for (const [re, m] of MOMENTO_REGEX) if (re.test(t) && !out.includes(m)) out.push(m);
  return out;
}

function detectarDoseMg(t: string): number | undefined {
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*mg\b/);
  if (!m) return undefined;
  return Number(m[1].replace(",", "."));
}

function detectarVolumeMl(t: string): number | undefined {
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (!m) return undefined;
  return Number(m[1].replace(",", "."));
}

function detectarDuracaoDias(t: string): number | undefined {
  const m = t.match(/(?:por|durante)\s+(\d+)\s*(dias?|d)\b/);
  if (m) return Number(m[1]);
  const m2 = t.match(/(\d+)\s*dias\b/);
  if (m2) return Number(m2[1]);
  return undefined;
}

/**
 * Detecta escalonamento por semanas, ex.:
 *   "1 cap na 1ª semana, 2 caps na 2ª semana, 3 caps na 3ª semana"
 *   "1 capsula na primeira semana e 2 capsulas na segunda semana"
 */
function detectarFases(t: string): Array<{ semana: number; quantidade: number }> | undefined {
  const ordinais: Record<string, number> = {
    primeira: 1, segunda: 2, terceira: 3, quarta: 4, quinta: 5, sexta: 6,
    setima: 7, "sétima": 7, oitava: 8,
  };
  const out: Array<{ semana: number; quantidade: number }> = [];

  // Forma "N <forma> na Xª semana" / "na X semana" / "na <ordinal> semana"
  const re = /(\d+(?:[.,]\d+)?)\s*(?:[a-zçãéí-]+\s+)?(?:na|n[ao]s?)\s+(\d+)\s*[ªa°o]?\s*semana\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    out.push({ quantidade: Number(m[1].replace(",", ".")), semana: Number(m[2]) });
  }

  const reOrd = /(\d+(?:[.,]\d+)?)\s*(?:[a-zçãéí-]+\s+)?(?:na|n[ao]s?)\s+([a-zçãéí]+)\s+semana\b/g;
  while ((m = reOrd.exec(t)) !== null) {
    const sem = ordinais[m[2]];
    if (sem !== undefined) out.push({ quantidade: Number(m[1].replace(",", ".")), semana: sem });
  }

  if (out.length === 0) return undefined;
  // Dedup + ordena
  const map = new Map<number, number>();
  for (const f of out) if (!map.has(f.semana)) map.set(f.semana, f.quantidade);
  return Array.from(map.entries())
    .map(([semana, quantidade]) => ({ semana, quantidade }))
    .sort((a, b) => a.semana - b.semana);
}

/**
 * Detecta ciclos on/off, ex.: "21 dias on / 7 dias off",
 * "uso 21 dias e pausa 7 dias", "ciclo 21/7".
 */
function detectarCiclo(t: string): { diasOn: number; diasOff: number } | undefined {
  const m1 = t.match(/(\d+)\s*dias?\s*on\s*[\/,e]?\s*(\d+)\s*dias?\s*off\b/);
  if (m1) return { diasOn: Number(m1[1]), diasOff: Number(m1[2]) };
  const m2 = t.match(/(?:usar?|uso|tomar?)\s+(?:por\s+)?(\d+)\s*dias?\s+(?:e\s+)?(?:pausar?|pausa|descansar?|interromper?)\s+(?:por\s+)?(\d+)\s*dias?\b/);
  if (m2) return { diasOn: Number(m2[1]), diasOff: Number(m2[2]) };
  const m3 = t.match(/\bciclo\s+(?:de\s+)?(\d+)\s*\/\s*(\d+)\b/);
  if (m3) return { diasOn: Number(m3[1]), diasOff: Number(m3[2]) };
  return undefined;
}

/**
 * Detecta tomadas múltiplas em momentos distintos:
 *   "1 comp pela manhã + 2 comp à noite"
 *   "1 cap manhã e 2 cap noite"
 *   "2 gotas pela manhã, 3 gotas à tarde e 4 gotas à noite"
 */
function detectarTomadas(t: string): Array<{ quantidade: number; momento: MomentoIngestao }> | undefined {
  const segmentos = t.split(/\s*(?:\+|,|\se\s)\s*/);
  if (segmentos.length < 2) return undefined;
  const out: Array<{ quantidade: number; momento: MomentoIngestao }> = [];
  for (const seg of segmentos) {
    const mQty = seg.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s+/);
    if (!mQty) continue;
    const qty = Number(mQty[1].replace(",", "."));
    const momentos = detectarMomentos(seg);
    // Considera apenas momentos do dia (não jejum/refeição) pra evitar falsos positivos.
    let momentoDia = momentos.find((m) => m === "manha" || m === "tarde" || m === "noite" || m === "antes_dormir");
    // Fallback: aceita "manha"/"tarde"/"noite" bare quando estamos dentro de uma tomada.
    if (!momentoDia) {
      if (/\bmanh[ãa]\b/.test(seg)) momentoDia = "manha";
      else if (/\btarde\b/.test(seg)) momentoDia = "tarde";
      else if (/\bnoite\b/.test(seg)) momentoDia = "noite";
    }
    if (momentoDia) out.push({ quantidade: qty, momento: momentoDia });
  }
  if (out.length < 2) return undefined;
  // Garante momentos distintos
  const vistos = new Set<MomentoIngestao>();
  const filtrado = out.filter((x) => (vistos.has(x.momento) ? false : (vistos.add(x.momento), true)));
  return filtrado.length >= 2 ? filtrado : undefined;
}

/**
 * Range de quantidade por tomada, ex.: "1-2 cps ao dia", "2 a 3 gotas".
 */
function detectarRange(t: string): { min: number; max: number } | undefined {
  const m = t.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:-|a)\s*(\d+(?:[.,]\d+)?)\s+(?=caps?|comp|cp|cpr|gotas?|ml|doses?|pellets?|ampolas?|sach|sprays?|puffs?|unid)/);
  if (!m) return undefined;
  const min = Number(m[1].replace(",", "."));
  const max = Number(m[2].replace(",", "."));
  if (max < min) return undefined;
  return { min, max };
}

function detectarFrequencia(t: string): Frequencia | undefined {
  // Nx/dia, Nx ao dia, N vezes ao dia
  const mDia = t.match(/(\d+)\s*x\s*(?:\/|ao|por|no)?\s*dia\b/) || t.match(/(\d+)\s*vezes?\s*(?:ao|por)\s*dia\b/);
  if (mDia) return { tipo: "diaria", vezes: Number(mDia[1]) };

  // Nx/semana
  const mSem = t.match(/(\d+)\s*x\s*(?:\/|ao|por)?\s*semana\b/) || t.match(/(\d+)\s*vezes?\s*(?:ao|por)\s*semana\b/);
  if (mSem) return { tipo: "semanal", vezes: Number(mSem[1]) };

  // Nx/mes
  const mMes = t.match(/(\d+)\s*x\s*(?:\/|ao|por)?\s*m[eê]s\b/) || t.match(/(\d+)\s*vezes?\s*(?:ao|por)\s*m[eê]s\b/);
  if (mMes) return { tipo: "mensal", vezes: Number(mMes[1]) };

  // de N em N horas (8/8h, 6 em 6 horas)
  const mInt = t.match(/(\d+)\s*\/\s*(\d+)\s*h\b/) || t.match(/de\s+(\d+)\s+em\s+(\d+)\s*h(?:oras?)?\b/);
  if (mInt && mInt[1] === mInt[2]) return { tipo: "horaria", intervaloHoras: Number(mInt[1]) };

  // 1x/dia implícito ("1 capsula ao dia", "uma vez ao dia")
  if (/\b(1|uma?)\s*vez\s*(ao|por|no)?\s*dia\b/.test(t)) return { tipo: "diaria", vezes: 1 };
  if (/\bao dia\b|\bpor dia\b|\bdiariamente\b|\bdiario\b/.test(t)) return { tipo: "diaria", vezes: 1 };
  if (/\bsemanal(mente)?\b/.test(t)) return { tipo: "semanal", vezes: 1 };
  if (/\bmensal(mente)?\b/.test(t)) return { tipo: "mensal", vezes: 1 };
  if (/\bdose\s+[uú]nica\b/.test(t)) return { tipo: "unica" };
  if (/\bcontinu[ao]\b|\buso continuo\b/.test(t)) return { tipo: "continua" };

  return undefined;
}

/**
 * Lê a quantidade no início do texto.
 * Aceita números (1, 2, 0.5) ou palavras (um, uma, dois, duas, três).
 */
function detectarQuantidade(t: string): number | undefined {
  const palavras: Record<string, number> = {
    um: 1, uma: 1, dois: 2, duas: 2, tres: 3, "três": 3, quatro: 4, cinco: 5,
    seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, meia: 0.5, meio: 0.5,
  };
  const mNum = t.match(/^(\d+(?:[.,]\d+)?)\s+/);
  if (mNum) return Number(mNum[1].replace(",", "."));
  const mPal = t.match(/^([a-z]+)\s+/);
  if (mPal && palavras[mPal[1]] !== undefined) return palavras[mPal[1]];
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Parser principal                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Transforma um texto livre de posologia em estrutura normalizada.
 *
 * Sempre devolve `raw` igual ao texto original. Quando nenhuma heurística
 * casa, devolve `{ raw, interpretado: false }` para fallback no consumidor.
 *
 * Cobre os formatos catalogados em `itens_terapeuticos`,
 * `revo_medicamentos`, `injetaveis`, `endovenosos`, `implantes` e `formulas`.
 */
export function parsePosologia(
  texto: string | null | undefined,
  contexto?: ParseContexto,
): PosologiaEstruturada {
  const raw = (texto ?? "").trim();
  if (!raw) return { raw: "", interpretado: false };

  const t = normalizar(raw);

  // Caso especial: "100mg / 2mL" → dose+volume puro de injetável.
  const mDoseVol = t.match(/^\s*(\d+(?:[.,]\d+)?)\s*mg\s*\/\s*(\d+(?:[.,]\d+)?)\s*ml\s*$/);
  if (mDoseVol) {
    const result: PosologiaEstruturada = {
      raw,
      interpretado: true,
      doseMg: Number(mDoseVol[1].replace(",", ".")),
      volumeMl: Number(mDoseVol[2].replace(",", ".")),
    };
    if (contexto?.viaPadrao) result.via = contexto.viaPadrao;
    else if (contexto?.categoria === "injetavel_im") result.via = "intramuscular";
    else if (contexto?.categoria === "injetavel_ev") result.via = "endovenosa";
    return result;
  }

  // Caso especial: "50 mg — 4 pellets" → implante.
  const mImpl = t.match(/(\d+(?:[.,]\d+)?)\s*mg\s*-\s*(\d+)\s*pellets?\b/);
  if (mImpl) {
    return {
      raw,
      interpretado: true,
      doseMg: Number(mImpl[1].replace(",", ".")),
      quantidade: Number(mImpl[2]),
      unidadeForma: "pellet",
      via: "implante",
    };
  }

  const fases = detectarFases(t);
  const ciclo = detectarCiclo(t);
  const tomadas = detectarTomadas(t);
  const quantidadeRange = detectarRange(t);

  // Quando o texto é puramente um ciclo (ex.: "21 dias on / 7 dias off"),
  // os números do ciclo não são quantidade/duração da prescrição. Mascaramos
  // o trecho do ciclo antes de rodar os detectores de quantidade/duração
  // para evitar contaminação cruzada.
  const tParaQty = ciclo
    ? t
        .replace(/\d+\s*dias?\s*on\s*[\/,e]?\s*\d+\s*dias?\s*off\b/g, "")
        .replace(/(?:usar?|uso|tomar?)\s+(?:por\s+)?\d+\s*dias?\s+(?:e\s+)?(?:pausar?|pausa|descansar?|interromper?)\s+(?:por\s+)?\d+\s*dias?\b/g, "")
        .replace(/\bciclo\s+(?:de\s+)?\d+\s*\/\s*\d+\b/g, "")
        .trim()
    : t;

  const quantidade =
    quantidadeRange?.min ??
    (tomadas?.[0]?.quantidade) ??
    (fases?.[0]?.quantidade) ??
    detectarQuantidade(tParaQty);
  const unidadeForma = detectarForma(t);
  const via = detectarVia(t) ?? contexto?.viaPadrao;
  const doseMg = detectarDoseMg(t);
  const volumeMl = detectarVolumeMl(t);
  const momentoBase = detectarMomentos(t);
  const momento = tomadas
    ? tomadas.map((x) => x.momento)
    : momentoBase;
  let frequencia = detectarFrequencia(t);
  const duracaoDias = detectarDuracaoDias(tParaQty);

  if (!frequencia && tomadas && tomadas.length >= 2) {
    frequencia = { tipo: "diaria", vezes: tomadas.length };
  }
  if (!frequencia && fases && fases.length > 0) {
    frequencia = { tipo: "diaria", vezes: 1 };
  }

  // Heurística: "1 capsula 1 hora antes de dormir" → frequência diária 1x.
  if (!frequencia && momento.length > 0 && quantidade !== undefined) {
    frequencia = { tipo: "diaria", vezes: 1 };
  }

  const interpretado = Boolean(
    quantidade !== undefined ||
    unidadeForma ||
    via ||
    doseMg !== undefined ||
    volumeMl !== undefined ||
    frequencia ||
    momento.length > 0 ||
    duracaoDias !== undefined ||
    fases ||
    ciclo ||
    tomadas ||
    quantidadeRange,
  );

  const out: PosologiaEstruturada = { raw, interpretado };
  if (quantidade !== undefined) out.quantidade = quantidade;
  if (unidadeForma) out.unidadeForma = unidadeForma;
  if (via) out.via = via;
  if (doseMg !== undefined) out.doseMg = doseMg;
  if (volumeMl !== undefined) out.volumeMl = volumeMl;
  if (frequencia) out.frequencia = frequencia;
  if (momento.length > 0) out.momento = momento;
  if (duracaoDias !== undefined) out.duracaoDias = duracaoDias;
  if (fases) out.fases = fases;
  if (ciclo) out.ciclo = ciclo;
  if (tomadas) out.tomadas = tomadas;
  if (quantidadeRange) out.quantidadeRange = quantidadeRange;
  return out;
}

/* -------------------------------------------------------------------------- */
/* Renderização canônica                                                      */
/* -------------------------------------------------------------------------- */

const FORMA_LABEL: Record<UnidadeForma, [string, string]> = {
  capsula: ["cápsula", "cápsulas"],
  comprimido: ["comprimido", "comprimidos"],
  dose: ["dose", "doses"],
  pellet: ["pellet", "pellets"],
  ml: ["mL", "mL"],
  gota: ["gota", "gotas"],
  ampola: ["ampola", "ampolas"],
  sache: ["sachê", "sachês"],
  spray: ["spray", "sprays"],
  puff: ["puff", "puffs"],
  unidade: ["unidade", "unidades"],
};

const VIA_LABEL: Record<ViaAdministracao, string> = {
  oral: "via oral",
  sublingual: "via sublingual",
  intramuscular: "intramuscular",
  endovenosa: "endovenosa",
  subcutanea: "subcutânea",
  topica: "uso tópico",
  nasal: "via nasal",
  retal: "via retal",
  vaginal: "via vaginal",
  ocular: "uso ocular",
  implante: "implante",
};

const MOMENTO_LABEL: Record<MomentoIngestao, string> = {
  jejum: "em jejum",
  antes_dormir: "antes de dormir",
  antes_cafe: "antes do café",
  antes_almoco: "antes do almoço",
  antes_jantar: "antes do jantar",
  com_refeicao: "com as refeições",
  apos_refeicao: "após as refeições",
  manha: "pela manhã",
  tarde: "à tarde",
  noite: "à noite",
};

function fraseFrequencia(f: Frequencia): string {
  if (f.tipo === "horaria" && f.intervaloHoras) return `de ${f.intervaloHoras} em ${f.intervaloHoras} horas`;
  if (f.tipo === "unica") return "dose única";
  if (f.tipo === "continua") return "uso contínuo";
  const sufixo = f.tipo === "diaria" ? "ao dia" : f.tipo === "semanal" ? "por semana" : "por mês";
  const vezes = f.vezes ?? 1;
  return vezes === 1 ? `1x ${sufixo}` : `${vezes}x ${sufixo}`;
}

/**
 * Devolve uma frase canônica a partir da estrutura, ex.:
 * "1 cápsula, via oral, 1x ao dia, antes de dormir".
 * Retorna `raw` quando `interpretado=false`.
 */
export function formatarPosologiaEstruturada(p: PosologiaEstruturada): string {
  if (!p.interpretado) return p.raw;
  const partes: string[] = [];

  if (p.quantidade !== undefined && p.unidadeForma) {
    const [sing, plural] = FORMA_LABEL[p.unidadeForma];
    const label = p.quantidade === 1 ? sing : plural;
    partes.push(`${p.quantidade} ${label}`);
  } else if (p.unidadeForma) {
    partes.push(FORMA_LABEL[p.unidadeForma][0]);
  } else if (p.quantidade !== undefined) {
    partes.push(String(p.quantidade));
  }

  if (p.doseMg !== undefined && p.volumeMl !== undefined) {
    partes.push(`${p.doseMg} mg / ${p.volumeMl} mL`);
  } else if (p.doseMg !== undefined) {
    partes.push(`${p.doseMg} mg`);
  } else if (p.volumeMl !== undefined) {
    partes.push(`${p.volumeMl} mL`);
  }

  if (p.quantidadeRange) {
    partes.push(`${p.quantidadeRange.min}-${p.quantidadeRange.max} por tomada`);
  }
  if (p.via) partes.push(VIA_LABEL[p.via]);
  if (p.frequencia) partes.push(fraseFrequencia(p.frequencia));
  if (p.momento && p.momento.length > 0) {
    partes.push(p.momento.map((m) => MOMENTO_LABEL[m]).join(", "));
  }
  if (p.duracaoDias !== undefined) partes.push(`por ${p.duracaoDias} dias`);
  if (p.ciclo) partes.push(`ciclo ${p.ciclo.diasOn} dias on / ${p.ciclo.diasOff} dias off`);
  if (p.fases && p.fases.length > 0) {
    const detalhe = p.fases.map((f) => `${f.quantidade} na ${f.semana}ª semana`).join(", ");
    partes.push(`escalonamento: ${detalhe}`);
  }
  if (p.tomadas && p.tomadas.length > 0) {
    const detalhe = p.tomadas.map((tm) => `${tm.quantidade} ${MOMENTO_LABEL[tm.momento]}`).join(" + ");
    partes.push(`tomadas: ${detalhe}`);
  }

  return partes.length > 0 ? partes.join(", ") : p.raw;
}
