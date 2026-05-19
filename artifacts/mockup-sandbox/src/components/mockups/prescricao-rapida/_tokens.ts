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

export const FREQUENCIAS = [
  "única", "diária", "2×/dia", "3×/dia",
  "1×/sem", "2×/sem", "3×/sem",
  "quinzenal", "mensal", "trimestral", "semestral",
] as const;
export type Frequencia = typeof FREQUENCIAS[number];

export type Ancora =
  | "sem-ancora"
  | "primeira"
  | "S01" | "S02" | "S03" | "S04" | "S05" | "S06" | "S07" | "S08"
  | "penultima" | "ultima";

export type ComponenteBlend = {
  id: string;
  nome: string;
  dose: string;
};

export type Substancia = {
  id: string;
  nome: string;
  via: Via;
  dose: string;
  detalhe?: string;
  sessoes: number;
  frequencia: Frequencia;
  preco: number;
  ancora?: Ancora;
  periodos?: string[];
  componentes?: ComponenteBlend[];
  horarios?: string[];
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
  { id: "nad-ev",    nome: "NAD+ Endovenoso",            via: "EV",  dose: "500 mg",      detalhe: "Restaurador bioenergético",  sessoes: 6,  frequencia: "1×/sem",   preco: 450, ancora: "sem-ancora" },
  { id: "glut-ev",   nome: "Glutationa Reduzida",        via: "EV",  dose: "1200 mg",     detalhe: "Antioxidante mestre",        sessoes: 6,  frequencia: "1×/sem",   preco: 320, ancora: "sem-ancora" },
  { id: "vitc-ev",   nome: "Vitamina C Alta Dose",       via: "EV",  dose: "25 g",        detalhe: "Imunomodulador",             sessoes: 6,  frequencia: "1×/sem",   preco: 280, ancora: "sem-ancora" },
  { id: "coq10-im",  nome: "CoQ10 Ubiquinol + PQQ",      via: "IM",  dose: "100 + 20 mg", detalhe: "Mitocondrial",               sessoes: 6,  frequencia: "1×/sem",   preco: 235, ancora: "sem-ancora" },
  { id: "b12-im",    nome: "B12 Metilcobalamina",        via: "IM",  dose: "5000 mcg",    detalhe: "Neurotrófico",               sessoes: 4,  frequencia: "1×/sem",   preco: 95,  ancora: "sem-ancora" },
  { id: "vitd-im",   nome: "Vitamina D3 100k UI",        via: "IM",  dose: "100.000 UI",  detalhe: "Pulso D · dose única",       sessoes: 1,  frequencia: "única",    preco: 180, ancora: "primeira" },
  { id: "resv-im",   nome: "Resveratrol Injetável",      via: "IM",  dose: "250 mg",      detalhe: "Sirtuína / longevidade",     sessoes: 4,  frequencia: "1×/sem",   preco: 210, ancora: "sem-ancora" },
  { id: "sema-sc",   nome: "Semaglutida 0,5 mg",         via: "SC",  dose: "0,5 mg",      detalhe: "GLP-1 · controle apetite",   sessoes: 12, frequencia: "1×/sem",   preco: 380, ancora: "sem-ancora" },
  { id: "tirz-sc",   nome: "Tirzepatida 2,5 mg",         via: "SC",  dose: "2,5 mg",      detalhe: "GLP-1/GIP · titulação",      sessoes: 8,  frequencia: "1×/sem",   preco: 520, ancora: "sem-ancora" },
  { id: "blend-vo",  nome: "Fórmula Blend Menopausa",    via: "VO",  dose: "1 cáps/dia",  detalhe: "Magistral · Galena",         sessoes: 30, frequencia: "diária",   preco: 380, ancora: "primeira",
    horarios: ["08h", "20h"],
    componentes: [
      { id: "c1", nome: "DHEA Micronizado",        dose: "25 mg" },
      { id: "c2", nome: "Pregnenolona",            dose: "30 mg" },
      { id: "c3", nome: "Resveratrol Trans-puro",  dose: "150 mg" },
      { id: "c4", nome: "Vitex Agnus-Castus EP",   dose: "200 mg" },
      { id: "c5", nome: "Magnésio Bisglicinato",   dose: "100 mg" },
    ],
  },
  { id: "blend-en",  nome: "Fórmula Blend Energia AM",   via: "VO",  dose: "1 cáps/dia",  detalhe: "Magistral · Galena",         sessoes: 30, frequencia: "diária",   preco: 290, ancora: "primeira",
    horarios: ["07h"],
    componentes: [
      { id: "c1", nome: "Cafeína Anidra",          dose: "100 mg" },
      { id: "c2", nome: "L-Tirosina",              dose: "500 mg" },
      { id: "c3", nome: "Rhodiola Rosea EP 3%",    dose: "300 mg" },
      { id: "c4", nome: "Vitamina B6 P5P",         dose: "25 mg" },
    ],
  },
  { id: "mag-vo",    nome: "Magnésio Dimalato",          via: "VO",  dose: "300 mg",      detalhe: "Quelado · 2× ao dia",        sessoes: 30, frequencia: "2×/dia",   preco: 110, ancora: "primeira",
    horarios: ["12h", "22h"],
  },
  { id: "gest-imp",  nome: "Gestrinona-T 12 mg",         via: "IMP", dose: "12 mg",       detalhe: "Implante hormonal 4-6 meses", sessoes: 1,  frequencia: "semestral", preco: 1280, ancora: "primeira" },
  { id: "trem-imp",  nome: "Trembolona-T 50 mg",         via: "IMP", dose: "50 mg",       detalhe: "Implante 3-4 meses",          sessoes: 1,  frequencia: "trimestral", preco: 980,  ancora: "primeira" },
  { id: "consulta",  nome: "Consulta Dr. Caio Pádua",    via: "PRC", dose: "60 min",      detalhe: "Reavaliação clínica",         sessoes: 2,  frequencia: "mensal",    preco: 500,  ancora: "primeira" },
  { id: "exame-lab", nome: "Encaminhamento Laboratório", via: "PRC", dose: "—",           detalhe: "Painel hormonal completo",     sessoes: 1,  frequencia: "única",     preco: 0,    ancora: "penultima" },
  { id: "botox",     nome: "Botox Toxina Botulínica",    via: "PRC", dose: "50 U",        detalhe: "Estética facial · terço sup", sessoes: 1,  frequencia: "semestral", preco: 1500, ancora: "ultima" },
  { id: "preench",   nome: "Preenchimento Ác. Hialurônico", via: "PRC", dose: "1 ml",     detalhe: "Estética facial · sulcos",    sessoes: 1,  frequencia: "única",     preco: 1800, ancora: "ultima" },
];

export const SELECIONADAS_INICIAIS: Substancia[] = [
  CATALOGO[0], CATALOGO[3], CATALOGO[9], CATALOGO[14], CATALOGO[15],
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
