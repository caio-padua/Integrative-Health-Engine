export const tk = {
  bg: "#0B1220",
  bgAlt: "#111B2E",
  bgSoft: "#1A2741",
  bgHover: "#22335A",
  border: "#1F2D49",
  borderStrong: "#2A3A5C",
  ink: "#E8EEF7",
  inkMuted: "#9AA9C2",
  inkSubtle: "#6B7A95",
  accent: "#A8C7FA",
  accentDeep: "#5B8DEF",
  accentGlow: "rgba(168,199,250,0.45)",
  warn: "#F5C26B",
  danger: "#E07B7B",
  ok: "#7BC9A5",
  via: {
    EV:  { dot: "#7BC9A5", soft: "rgba(123,201,165,0.12)", line: "rgba(123,201,165,0.35)" },
    IM:  { dot: "#F5C26B", soft: "rgba(245,194,107,0.12)", line: "rgba(245,194,107,0.35)" },
    SC:  { dot: "#A8C7FA", soft: "rgba(168,199,250,0.12)", line: "rgba(168,199,250,0.35)" },
    VO:  { dot: "#C9A5F5", soft: "rgba(201,165,245,0.12)", line: "rgba(201,165,245,0.35)" },
    IMP: { dot: "#E8A5D8", soft: "rgba(232,165,216,0.12)", line: "rgba(232,165,216,0.35)" },
    PRC: { dot: "#B0BCD0", soft: "rgba(176,188,208,0.12)", line: "rgba(176,188,208,0.35)" },
  },
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
} as const;

export type Via = "EV" | "IM" | "SC" | "VO" | "IMP" | "PRC";

export const VIA_META: Record<Via, { titulo: string; sub: string }> = {
  EV:  { titulo: "ENDOVENOSO",      sub: "infusão · acesso periférico" },
  IM:  { titulo: "INTRAMUSCULAR",   sub: "glúteo · superior externo" },
  SC:  { titulo: "SUBCUTÂNEO",      sub: "abdominal · rotativo" },
  VO:  { titulo: "VIA ORAL",        sub: "magistral · uso contínuo" },
  IMP: { titulo: "IMPLANTES",       sub: "hormonal · longa duração" },
  PRC: { titulo: "PROCEDIMENTOS",   sub: "consulta · estética" },
};

// ── Categorias terapêuticas (2º nível do funil VIA → CATEGORIA → ATIVO) ──────
// Ordem canônica usada para ordenar os chips de categoria no painel + ADICIONAR.
export const CATEGORIAS = [
  "Bioenergético",
  "Antioxidante",
  "Imunológico",
  "Vitaminas & Minerais",
  "Aminoácidos & Peptídeos",
  "Hormonal",
  "Metabólico / GLP-1",
  "Longevidade",
  "Neuro / Cognitivo",
  "Calmante / Sono",
  "Estética",
  "Consulta & Exames",
] as const;
export type Categoria = typeof CATEGORIAS[number];

export const FREQUENCIAS = [
  "única", "diária", "2×/dia", "3×/dia",
  "1×/sem", "2×/sem", "3×/sem",
  "quinzenal", "mensal", "trimestral", "semestral",
] as const;

// Frequencia de aplicacao dos INJETAVEIS (EV/IM/SC) no formato "a cada N dias"
// que o Caio pediu — substitui o campo DURACAO nessas vias.
export const FREQUENCIAS_INJETAVEL = [
  "diário", "a cada 2 dias", "a cada 3 dias", "a cada 7 dias",
  "a cada 15 dias", "a cada 21 dias", "a cada 30 dias",
] as const;

export type Frequencia = typeof FREQUENCIAS[number] | typeof FREQUENCIAS_INJETAVEL[number];

// Duracao = extensao do tratamento (campo "duracao" da posologia campo-a-campo).
export const DURACOES = [
  "7 dias", "15 dias", "30 dias", "45 dias", "60 dias", "90 dias", "6 meses", "continuo",
] as const;
export type Duracao = typeof DURACOES[number];

export type Ancora =
  | "sem-ancora"
  | "primeira"
  | "segunda"
  | "S01" | "S02" | "S03" | "S04" | "S05" | "S06" | "S07" | "S08"
  | "antepenultima" | "penultima" | "ultima";

// Acao vinculada a uma ancora (marco da jornada). Ex: na 1a sessao "Mensagem ao
// paciente", na penultima "Exame / Encaminhamento". Selecionavel + nota livre.
export const ACOES_ANCORA = [
  "—",
  "Exame / Encaminhamento",
  "Mensagem ao paciente",
  "Procedimento",
  "Lembrete da fórmula",
  "Outro",
] as const;
export type AcaoAncora = typeof ACOES_ANCORA[number];

export type ComponenteBlend = {
  id: string;
  nome: string;
  dose: string;
};

export type Substancia = {
  id: string;
  nome: string;
  via: Via;
  categoria?: Categoria;
  dose: string;
  detalhe?: string;
  sessoes: number;
  frequencia: Frequencia;
  dosesDia?: number;
  preco: number;
  ancora?: Ancora;
  // ancoraAcao = acao vinculada ao marco da ancora (exame, mensagem, procedimento...)
  ancoraAcao?: AcaoAncora;
  // ancoraNota = frase livre da ancora, lembrete sobre o paciente ou a formula
  // (ex: "esposa gravida, parabenizar"; "solicitar TSH na proxima")
  ancoraNota?: string;
  // período cronobiológico explícito (sigla JE/IM/MM/AL/IT/MT/NO/FN/CE) ou undefined = AUTO pelos horários
  periodo?: string;
  periodos?: string[];
  componentes?: ComponenteBlend[];
  horarios?: string[];
  // ── Posologia campo-a-campo (ferramenta dia-a-dia · 30/05/2026 · aditivo) ──
  // quantidade = numero de doses por administracao (ex: "2 caps", "1 ampola")
  quantidade?: string;
  // duracao = extensao do tratamento em dias (ex: "30 dias", "60 dias", "continuo")
  // NOTA: campo "frequencia" acima permanece (back-compat) = ritmo (diaria, 1x/sem)
  duracao?: string;
  // mensagem = instrucao livre do medico (ex: "antes do cafe da tarde", "com suco de limao")
  mensagem?: string;
  // horario = horario exato dentro do periodo selecionado (HH:MM), muito importante
  horario?: string;
};

export const HORARIOS_PADRAO = ["06h", "07h", "08h", "09h", "12h", "15h", "18h", "20h", "22h"] as const;

export const PACIENTE = {
  nome: "Graco Souza Pádua",
  iniciais: "GS",
  idade: 43,
  cpf: "227.293.608-32",
  id: "1412212",
  fone: "(11) 97643-8584",
  plano: "OURO",
  sessao: "3/8",
  revo: true,
};

export const CATALOGO: Substancia[] = [
  // ── EV · ENDOVENOSO ───────────────────────────────────────────────────────
  { id: "nad-ev",    nome: "NAD+ Endovenoso",            via: "EV", categoria: "Bioenergético",        dose: "500 mg",  detalhe: "Restaurador bioenergético",   sessoes: 6, frequencia: "1×/sem", preco: 450, ancora: "sem-ancora", quantidade: "1 frasco", duracao: "60 dias", horario: "07:00", periodo: "IM", mensagem: "infusão lenta · 40 min" },
  { id: "glut-ev",   nome: "Glutationa Reduzida",        via: "EV", categoria: "Antioxidante",          dose: "1200 mg", detalhe: "Antioxidante mestre",         sessoes: 6, frequencia: "1×/sem", preco: 320, ancora: "sem-ancora" },
  { id: "vitc-ev",   nome: "Vitamina C Alta Dose",       via: "EV", categoria: "Imunológico",           dose: "25 g",    detalhe: "Imunomodulador",              sessoes: 6, frequencia: "1×/sem", preco: 280, ancora: "sem-ancora" },
  { id: "alfa-ev",   nome: "Ácido Alfa-Lipóico EV",      via: "EV", categoria: "Antioxidante",          dose: "600 mg",  detalhe: "Antioxidante neuroprotetor",  sessoes: 6, frequencia: "1×/sem", preco: 240, ancora: "sem-ancora" },
  { id: "taur-ev",   nome: "Taurina Endovenosa",         via: "EV", categoria: "Aminoácidos & Peptídeos", dose: "2 g",   detalhe: "Cardio + energia",            sessoes: 6, frequencia: "1×/sem", preco: 190, ancora: "sem-ancora" },
  { id: "compb-ev",  nome: "Complexo B Endovenoso",      via: "EV", categoria: "Vitaminas & Minerais",  dose: "ampola",  detalhe: "Energia + neuro",             sessoes: 6, frequencia: "1×/sem", preco: 160, ancora: "sem-ancora" },
  { id: "mgsulf-ev", nome: "Sulfato de Magnésio EV",     via: "EV", categoria: "Vitaminas & Minerais",  dose: "2 g",     detalhe: "Relaxante neuromuscular",     sessoes: 4, frequencia: "1×/sem", preco: 150, ancora: "sem-ancora" },
  { id: "ozonio-ev", nome: "Ozonioterapia Sistêmica",    via: "EV", categoria: "Imunológico",           dose: "—",       detalhe: "Modulação imune + oxigenação", sessoes: 10, frequencia: "2×/sem", preco: 220, ancora: "sem-ancora" },
  { id: "edta-ev",   nome: "Quelação EDTA",              via: "EV", categoria: "Longevidade",           dose: "3 g",     detalhe: "Detox metais pesados",        sessoes: 10, frequencia: "1×/sem", preco: 360, ancora: "sem-ancora" },

  // ── IM · INTRAMUSCULAR ────────────────────────────────────────────────────
  { id: "coq10-im",  nome: "CoQ10 Ubiquinol + PQQ",      via: "IM", categoria: "Bioenergético",         dose: "100 + 20 mg", detalhe: "Mitocondrial",            sessoes: 6, frequencia: "1×/sem", preco: 235, ancora: "sem-ancora", quantidade: "1 ampola", duracao: "45 dias", horario: "08:00", periodo: "IM" },
  { id: "b12-im",    nome: "B12 Metilcobalamina",        via: "IM", categoria: "Neuro / Cognitivo",     dose: "5000 mcg", detalhe: "Neurotrófico",               sessoes: 4, frequencia: "1×/sem", preco: 95,  ancora: "sem-ancora" },
  { id: "vitd-im",   nome: "Vitamina D3 100k UI",        via: "IM", categoria: "Vitaminas & Minerais",  dose: "100.000 UI", detalhe: "Pulso D · dose única",     sessoes: 1, frequencia: "única",  preco: 180, ancora: "primeira" },
  { id: "resv-im",   nome: "Resveratrol Injetável",      via: "IM", categoria: "Longevidade",           dose: "250 mg",  detalhe: "Sirtuína / longevidade",      sessoes: 4, frequencia: "1×/sem", preco: 210, ancora: "sem-ancora" },
  { id: "testo-im",  nome: "Testosterona Cipionato",     via: "IM", categoria: "Hormonal",              dose: "200 mg",  detalhe: "Reposição hormonal",          sessoes: 8, frequencia: "quinzenal", preco: 160, ancora: "sem-ancora" },
  { id: "glut-im",   nome: "Glutationa Intramuscular",   via: "IM", categoria: "Antioxidante",          dose: "600 mg",  detalhe: "Antioxidante de bolso",       sessoes: 6, frequencia: "1×/sem", preco: 140, ancora: "sem-ancora" },
  { id: "carn-im",   nome: "L-Carnitina Injetável",      via: "IM", categoria: "Metabólico / GLP-1",    dose: "1 g",     detalhe: "Oxidação lipídica",           sessoes: 8, frequencia: "1×/sem", preco: 120, ancora: "sem-ancora" },
  { id: "compb-im",  nome: "Complexo B Intramuscular",   via: "IM", categoria: "Vitaminas & Minerais",  dose: "ampola",  detalhe: "Energia + neuro",             sessoes: 4, frequencia: "1×/sem", preco: 90,  ancora: "sem-ancora" },

  // ── SC · SUBCUTÂNEO ───────────────────────────────────────────────────────
  { id: "sema-sc",   nome: "Semaglutida 0,5 mg",         via: "SC", categoria: "Metabólico / GLP-1",    dose: "0,5 mg",  detalhe: "GLP-1 · controle apetite",    sessoes: 12, frequencia: "1×/sem", preco: 380, ancora: "sem-ancora", quantidade: "1 aplicação", duracao: "90 dias", horario: "20:00", periodo: "FN", mensagem: "rotacionar local da aplicação" },
  { id: "tirz-sc",   nome: "Tirzepatida 2,5 mg",         via: "SC", categoria: "Metabólico / GLP-1",    dose: "2,5 mg",  detalhe: "GLP-1/GIP · titulação",       sessoes: 8,  frequencia: "1×/sem", preco: 520, ancora: "sem-ancora" },
  { id: "lira-sc",   nome: "Liraglutida 1,2 mg",         via: "SC", categoria: "Metabólico / GLP-1",    dose: "1,2 mg",  detalhe: "GLP-1 · uso diário",          sessoes: 30, frequencia: "diária", preco: 290, ancora: "sem-ancora" },
  { id: "bpc-sc",    nome: "BPC-157 Peptídeo",           via: "SC", categoria: "Aminoácidos & Peptídeos", dose: "250 mcg", detalhe: "Reparo tecidual",           sessoes: 20, frequencia: "diária", preco: 240, ancora: "sem-ancora" },
  { id: "ghk-sc",    nome: "GHK-Cu Peptídeo",            via: "SC", categoria: "Estética",              dose: "2 mg",    detalhe: "Regeneração / pele",          sessoes: 15, frequencia: "3×/sem", preco: 260, ancora: "sem-ancora" },
  { id: "ipa-sc",    nome: "Ipamorelina + CJC",          via: "SC", categoria: "Hormonal",              dose: "200 mcg", detalhe: "Eixo GH · noturno",           sessoes: 20, frequencia: "diária", preco: 310, ancora: "sem-ancora" },

  // ── VO · VIA ORAL (magistral) ─────────────────────────────────────────────
  { id: "blend-vo",  nome: "Fórmula Blend Menopausa",    via: "VO", categoria: "Hormonal",              dose: "1 cáps/dia", detalhe: "Magistral · Galena",        sessoes: 30, frequencia: "diária", preco: 380, ancora: "primeira", quantidade: "1 cáps", duracao: "continuo", horario: "08:00", periodo: "IM", mensagem: "antes do café da manhã",
    horarios: ["08h", "20h"],
    componentes: [
      { id: "c1", nome: "DHEA Micronizado",        dose: "25 mg" },
      { id: "c2", nome: "Pregnenolona",            dose: "30 mg" },
      { id: "c3", nome: "Resveratrol Trans-puro",  dose: "150 mg" },
      { id: "c4", nome: "Vitex Agnus-Castus EP",   dose: "200 mg" },
      { id: "c5", nome: "Magnésio Bisglicinato",   dose: "100 mg" },
    ],
  },
  { id: "blend-en",  nome: "Fórmula Blend Energia AM",   via: "VO", categoria: "Bioenergético",         dose: "1 cáps/dia", detalhe: "Magistral · Galena",        sessoes: 30, frequencia: "diária", preco: 290, ancora: "primeira",
    horarios: ["07h"],
    componentes: [
      { id: "c1", nome: "Cafeína Anidra",          dose: "100 mg" },
      { id: "c2", nome: "L-Tirosina",              dose: "500 mg" },
      { id: "c3", nome: "Rhodiola Rosea EP 3%",    dose: "300 mg" },
      { id: "c4", nome: "Vitamina B6 P5P",         dose: "25 mg" },
    ],
  },
  { id: "blend-sono", nome: "Fórmula Blend Sono",        via: "VO", categoria: "Calmante / Sono",       dose: "1 cáps/noite", detalhe: "Magistral · Galena",      sessoes: 30, frequencia: "diária", preco: 220, ancora: "primeira",
    horarios: ["22h"],
    componentes: [
      { id: "c1", nome: "Melatonina",              dose: "3 mg" },
      { id: "c2", nome: "L-Triptofano",            dose: "300 mg" },
      { id: "c3", nome: "Magnésio Bisglicinato",   dose: "150 mg" },
      { id: "c4", nome: "Passiflora EP",           dose: "200 mg" },
    ],
  },
  { id: "blend-cog", nome: "Fórmula Blend Cognição",     via: "VO", categoria: "Neuro / Cognitivo",     dose: "2 cáps/dia", detalhe: "Magistral · Galena",        sessoes: 30, frequencia: "2×/dia", preco: 340, ancora: "primeira",
    horarios: ["08h", "14h"],
    componentes: [
      { id: "c1", nome: "Citicolina",              dose: "250 mg" },
      { id: "c2", nome: "Bacopa Monnieri EP",      dose: "300 mg" },
      { id: "c3", nome: "L-Teanina",               dose: "200 mg" },
      { id: "c4", nome: "Ácido Pantotênico",       dose: "100 mg" },
    ],
  },
  { id: "mag-vo",    nome: "Magnésio Dimalato",          via: "VO", categoria: "Vitaminas & Minerais",  dose: "300 mg",  detalhe: "Quelado · 2× ao dia",         sessoes: 30, frequencia: "2×/dia", preco: 110, ancora: "primeira",
    horarios: ["12h", "22h"],
  },
  { id: "mela-vo",   nome: "Melatonina 3 mg",            via: "VO", categoria: "Calmante / Sono",       dose: "3 mg",    detalhe: "Indução do sono",             sessoes: 30, frequencia: "diária", preco: 70,  ancora: "primeira", horarios: ["22h"] },
  { id: "omega-vo",  nome: "Ômega 3 TG Concentrado",     via: "VO", categoria: "Longevidade",           dose: "2 g",     detalhe: "EPA/DHA alta pureza",         sessoes: 30, frequencia: "diária", preco: 130, ancora: "primeira", horarios: ["12h"] },
  { id: "vitdk-vo",  nome: "Vitamina D3 + K2 VO",        via: "VO", categoria: "Vitaminas & Minerais",  dose: "10.000 UI", detalhe: "Manutenção diária",         sessoes: 30, frequencia: "diária", preco: 90,  ancora: "primeira", horarios: ["08h"] },
  { id: "creat-vo",  nome: "Creatina Monohidratada",     via: "VO", categoria: "Aminoácidos & Peptídeos", dose: "5 g",   detalhe: "Força + cognição",            sessoes: 30, frequencia: "diária", preco: 80,  ancora: "primeira", horarios: ["09h"] },
  { id: "prob-vo",   nome: "Probiótico 50 bi UFC",       via: "VO", categoria: "Imunológico",           dose: "1 cáps/dia", detalhe: "Eixo intestino-cérebro",    sessoes: 30, frequencia: "diária", preco: 150, ancora: "primeira", horarios: ["07h"] },

  // ── IMP · IMPLANTES ───────────────────────────────────────────────────────
  { id: "gest-imp",  nome: "Gestrinona-T 12 mg",         via: "IMP", categoria: "Hormonal",             dose: "12 mg",   detalhe: "Implante hormonal 4-6 meses", sessoes: 1, frequencia: "semestral", preco: 1280, ancora: "primeira" },
  { id: "trem-imp",  nome: "Trembolona-T 50 mg",         via: "IMP", categoria: "Hormonal",             dose: "50 mg",   detalhe: "Implante 3-4 meses",          sessoes: 1, frequencia: "trimestral", preco: 980, ancora: "primeira" },
  { id: "testo-imp", nome: "Implante Testosterona",      via: "IMP", categoria: "Hormonal",             dose: "100 mg",  detalhe: "Implante 5-6 meses",          sessoes: 1, frequencia: "semestral", preco: 1100, ancora: "primeira" },
  { id: "estr-imp",  nome: "Implante Estradiol",         via: "IMP", categoria: "Hormonal",             dose: "25 mg",   detalhe: "Implante 5-6 meses",          sessoes: 1, frequencia: "semestral", preco: 1050, ancora: "primeira" },

  // ── PRC · PROCEDIMENTOS / CONSULTA / EXAMES ───────────────────────────────
  { id: "consulta",  nome: "Consulta Clínica",           via: "PRC", categoria: "Consulta & Exames",    dose: "60 min",  detalhe: "Reavaliação clínica",         sessoes: 2, frequencia: "mensal",   preco: 500,  ancora: "primeira", quantidade: "1 sessão", duracao: "—", horario: "09:00", periodo: "MM", ancoraAcao: "Mensagem ao paciente", ancoraNota: "lembrar de perguntar do recém-nascido" },
  { id: "exame-lab", nome: "Encaminhamento Laboratório", via: "PRC", categoria: "Consulta & Exames",    dose: "—",       detalhe: "Painel hormonal completo",    sessoes: 1, frequencia: "única",    preco: 0,    ancora: "penultima" },
  { id: "bioimp",    nome: "Bioimpedância Segmentar",    via: "PRC", categoria: "Consulta & Exames",    dose: "—",       detalhe: "Composição corporal",         sessoes: 2, frequencia: "mensal",   preco: 120,  ancora: "primeira" },
  { id: "botox",     nome: "Botox Toxina Botulínica",    via: "PRC", categoria: "Estética",             dose: "50 U",    detalhe: "Estética facial · terço sup", sessoes: 1, frequencia: "semestral", preco: 1500, ancora: "ultima" },
  { id: "preench",   nome: "Preenchimento Ác. Hialurônico", via: "PRC", categoria: "Estética",          dose: "1 ml",    detalhe: "Estética facial · sulcos",    sessoes: 1, frequencia: "única",    preco: 1800, ancora: "ultima" },
  { id: "microag",   nome: "Microagulhamento",           via: "PRC", categoria: "Estética",             dose: "—",       detalhe: "Indução de colágeno",         sessoes: 4, frequencia: "mensal",   preco: 450,  ancora: "sem-ancora" },
];

function porId(id: string): Substancia {
  const s = CATALOGO.find(x => x.id === id);
  if (!s) throw new Error(`Substancia ${id} ausente no CATALOGO`);
  return s;
}

export const SELECIONADAS_INICIAIS: Substancia[] = [
  porId("nad-ev"),
  porId("coq10-im"),
  porId("sema-sc"),
  porId("blend-vo"),
  porId("consulta"),
];

export const PATOLOGIAS = [
  { nome: "Hipovitaminose D severa",   valor: "18 ng/mL",  status: "alerta" as const },
  { nome: "Def. B12 funcional",        valor: "520 pg/mL", status: "ok"     as const },
  { nome: "Disautonomia adrenal",      valor: "12 mcg/dL", status: "alerta" as const },
  { nome: "Estresse oxidativo",        valor: "GGT 38",    status: "ok"     as const },
];

export const VITAIS = [
  { label: "PA",     valor: "120/80",  status: "ok"     as const },
  { label: "FC",     valor: "72 bpm",  status: "ok"     as const },
  { label: "Vit D",  valor: "18 ng",   status: "alerta" as const },
  { label: "B12",    valor: "520 pg",  status: "ok"     as const },
];
