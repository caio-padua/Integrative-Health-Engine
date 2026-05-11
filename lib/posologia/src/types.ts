/**
 * Tipos da posologia estruturada Pawards.
 *
 * O parser (parsePosologia) recebe um texto livre como
 *   "1 CAPSULA 1 HORA ANTES DE DORMIR"
 *   "100mg / 2mL"
 *   "50 mg — 4 pellets"
 *   "2 caps 2x/dia com refeições"
 *   "1 dose VO - 2h antes do almoço"
 *   "1 comp em jejum 30min antes café"
 * e devolve uma estrutura normalizada. Quando nenhuma regra casa,
 * o resultado mantém `interpretado: false` e apenas `raw` preenchido,
 * de forma que o consumidor (PDF/UI/REVO) possa cair de volta no texto bruto.
 */

export type UnidadeForma =
  | "capsula"
  | "comprimido"
  | "dose"
  | "pellet"
  | "ml"
  | "gota"
  | "ampola"
  | "sache"
  | "spray"
  | "puff"
  | "unidade";

export type ViaAdministracao =
  | "oral"
  | "sublingual"
  | "intramuscular"
  | "endovenosa"
  | "subcutanea"
  | "topica"
  | "nasal"
  | "retal"
  | "vaginal"
  | "ocular"
  | "implante";

export type MomentoIngestao =
  | "jejum"
  | "antes_dormir"
  | "antes_cafe"
  | "antes_almoco"
  | "antes_jantar"
  | "com_refeicao"
  | "apos_refeicao"
  | "manha"
  | "tarde"
  | "noite";

export type FrequenciaTipo =
  | "diaria"
  | "semanal"
  | "mensal"
  | "horaria"
  | "unica"
  | "continua";

export interface Frequencia {
  tipo: FrequenciaTipo;
  /** Número de vezes por unidade (ex.: 2x ao dia → vezes=2, tipo="diaria"). */
  vezes?: number;
  /** Intervalo em horas entre doses (ex.: 8/8h → intervaloHoras=8). */
  intervaloHoras?: number;
}

export interface PosologiaEstruturada {
  /** Texto original — sempre preenchido. */
  raw: string;
  /** true quando ao menos uma heurística casou. false = fallback texto puro. */
  interpretado: boolean;
  /** Quantidade administrada por tomada (ex.: 1 cápsula → 1). */
  quantidade?: number;
  /** Unidade da forma farmacêutica (cápsula, comprimido, mL, pellet…). */
  unidadeForma?: UnidadeForma;
  /** Via de administração (oral, IM, EV, SC, sublingual…). */
  via?: ViaAdministracao;
  /** Dose ativa em mg, quando explicitada (ex.: "100mg" → 100). */
  doseMg?: number;
  /** Volume em mL, para injetáveis e soluções (ex.: "/ 2mL" → 2). */
  volumeMl?: number;
  /** Frequência normalizada. */
  frequencia?: Frequencia;
  /** Momentos relativos a refeição/sono detectados. */
  momento?: MomentoIngestao[];
  /** Duração explícita em dias (ex.: "por 7 dias" → 7). */
  duracaoDias?: number;
  /** Texto residual / observações livres não mapeáveis. */
  observacoes?: string;
}

export interface ParseContexto {
  /** Categoria do item (ajuda a desambiguar formatos). */
  categoria?:
    | "formula"
    | "injetavel_im"
    | "injetavel_ev"
    | "implante"
    | "exame"
    | "protocolo"
    | "revo_medicamento"
    | "revo_formula";
  /** Via padrão do catálogo, usada como fallback quando não detectada no texto. */
  viaPadrao?: ViaAdministracao;
}
