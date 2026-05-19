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
    EV: { dot: "#7BC9A5", soft: "rgba(123,201,165,0.12)", line: "rgba(123,201,165,0.35)" },
    IM: { dot: "#F5C26B", soft: "rgba(245,194,107,0.12)", line: "rgba(245,194,107,0.35)" },
    VO: { dot: "#C9A5F5", soft: "rgba(201,165,245,0.12)", line: "rgba(201,165,245,0.35)" },
    SC: { dot: "#A8C7FA", soft: "rgba(168,199,250,0.12)", line: "rgba(168,199,250,0.35)" },
  },
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
} as const;

export type Via = "EV" | "IM" | "VO" | "SC";

export type Substancia = {
  id: string;
  nome: string;
  via: Via;
  dose: string;
  detalhe?: string;
  sessoes: number;
  frequencia: string;
  preco: number;
  periodos?: string[];
};

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
  { id: "nad-ev",    nome: "NAD+ Endovenoso",            via: "EV", dose: "500 mg",      detalhe: "Restaurador bioenergético",         sessoes: 6, frequencia: "1×/sem", preco: 450 },
  { id: "glut-ev",   nome: "Glutationa Reduzida",        via: "EV", dose: "1200 mg",     detalhe: "Antioxidante mestre",                sessoes: 6, frequencia: "1×/sem", preco: 320 },
  { id: "vitc-ev",   nome: "Vitamina C Alta Dose",       via: "EV", dose: "25 g",        detalhe: "Imunomodulador",                     sessoes: 6, frequencia: "1×/sem", preco: 280 },
  { id: "coq10-im",  nome: "CoQ10 Ubiquinol + PQQ",      via: "IM", dose: "100 + 20 mg", detalhe: "Mitocondrial",                       sessoes: 6, frequencia: "1×/sem", preco: 235 },
  { id: "b12-im",    nome: "B12 Metilcobalamina",        via: "IM", dose: "5000 mcg",    detalhe: "Neurotrófico",                       sessoes: 4, frequencia: "1×/sem", preco: 95  },
  { id: "vitd-im",   nome: "Vitamina D3 100k UI",        via: "IM", dose: "100.000 UI",  detalhe: "Pulso D · dose única",               sessoes: 1, frequencia: "única",   preco: 180 },
  { id: "resv-im",   nome: "Resveratrol Injetável",      via: "IM", dose: "250 mg",      detalhe: "Sirtuína / longevidade",             sessoes: 4, frequencia: "1×/sem", preco: 210 },
  { id: "blend-vo",  nome: "Fórmula Blend Menopausa",    via: "VO", dose: "1 cáps/dia",  detalhe: "Magistral · Galena",                 sessoes: 30, frequencia: "diária", preco: 380 },
  { id: "blend-en",  nome: "Fórmula Blend Energia AM",   via: "VO", dose: "1 cáps/dia",  detalhe: "Magistral · Galena",                 sessoes: 30, frequencia: "manhã",   preco: 290 },
  { id: "mag-vo",    nome: "Magnésio Dimalato",          via: "VO", dose: "300 mg",      detalhe: "Quelado · 2× ao dia",                sessoes: 30, frequencia: "2×/dia",  preco: 110 },
];

export const SELECIONADAS_INICIAIS: Substancia[] = [CATALOGO[0], CATALOGO[3], CATALOGO[7]];

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
