import { useState } from "react";
import {
  AlertTriangle,
  Activity,
  FileText,
  FlaskConical,
  Pill,
  Syringe,
  Salad,
  Send,
  ClipboardList,
  Stethoscope,
  CalendarDays,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Heart,
  Droplet,
  Brain,
  Scale,
  Ruler,
  Clock,
  Check,
  ChevronRight,
  Plus,
  Search,
  Bell,
  User,
  Printer,
  Save,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Building2,
  CircleDot,
  History,
  Lock,
  Eye,
  Microscope,
  Beaker,
  Leaf,
  X,
  Filter,
  BookMarked,
  Layers,
  Star,
  Building,
} from "lucide-react";

// ============================================================================
// PAWARDS Design Tokens (austero / legal-document / TDAH-friendly)
// ============================================================================
const tk = {
  bg: "#0B1220",              // deep navy
  bgAlt: "#111B2E",           // panel
  bgSoft: "#1A2741",          // hover / soft
  border: "#1F2D49",          // hairline
  borderStrong: "#2A3A5C",
  ink: "#E8EEF7",             // foreground
  inkMuted: "#9AA9C2",        // muted
  inkSubtle: "#6B7A95",       // subtle
  accent: "#A8C7FA",          // pastel azul PAWARDS
  accentDeep: "#5B8DEF",
  warn: "#F5C26B",
  danger: "#E07B7B",
  ok: "#7BC9A5",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
};

// ============================================================================
// MOCK DATA — Paciente fictícia realista (formato Doc Carlúcia)
// ============================================================================
const paciente = {
  id: "PAD-2026-3497",
  nome: "Carlúcia Mendes do Vale",
  apelido: "Carluca",
  idade: 58,
  sexo: "Feminino",
  nascimento: "14/03/1968",
  cpf: "324.880.117-09",
  telefone: "(22) 99814-6633",
  email: "carlucia.vale@email.com.br",
  endereco: "Rua das Laranjeiras, 412 — Centro, Cabo Frio/RJ",
  unidade: "Instituto Pádua",
  codigoSemantico: "PAD-FEM-58-METAB",
  convenio: "Particular",
  ultimaVisita: "19/05/2026 — 07:30",
  proximaVisita: "16/06/2026 — 08:00",
  responsavelClinico: "Dra. Renata C. Albuquerque",
  fotoIniciais: "CV",
};

const sinaisVitais = [
  { rotulo: "PA", valor: "138/86", unidade: "mmHg", status: "alerta", trend: "up" },
  { rotulo: "FC", valor: "78", unidade: "bpm", status: "ok", trend: "flat" },
  { rotulo: "Peso", valor: "74,2", unidade: "kg", status: "alerta", trend: "up" },
  { rotulo: "Altura", valor: "1,62", unidade: "m", status: "ok", trend: "flat" },
  { rotulo: "IMC", valor: "28,3", unidade: "kg/m²", status: "alerta", trend: "up" },
  { rotulo: "Glic. jejum", valor: "112", unidade: "mg/dL", status: "alerta", trend: "up" },
];

const alergias = [
  { sub: "Penicilina", grau: "GRAVE", reacao: "Anafilaxia documentada — 2014" },
  { sub: "Dipirona", grau: "MODERADA", reacao: "Urticária generalizada" },
  { sub: "Frutos do mar", grau: "LEVE", reacao: "Prurido oral" },
];

const restricoesPermanentes = [
  "Nunca prescrever anti-inflamatórios não-esteroidais sem avaliação renal prévia",
  "Hipertensão limítrofe — monitorar PA em toda consulta",
  "Histórico familiar de DM2 — pai e irmã",
];

const historico = [
  { data: "19/05/2026", tipo: "Anamnese + RAS", titulo: "Sessão 39 — RAS Completo (11 cadernos)", icone: ClipboardList, status: "concluido" },
  { data: "12/05/2026", tipo: "Exames", titulo: "Lab completo + Vitamina D + TSH", icone: Microscope, status: "concluido" },
  { data: "03/05/2026", tipo: "Prescrição", titulo: "Fórmula manipulada — Galena Manipulação", icone: Pill, status: "concluido" },
  { data: "28/04/2026", tipo: "Procedimento", titulo: "Soroterapia EV — Coquetel Detox", icone: Syringe, status: "concluido" },
  { data: "15/04/2026", tipo: "Consulta", titulo: "Retorno trimestral — Dra. Renata", icone: Stethoscope, status: "concluido" },
  { data: "02/04/2026", tipo: "Anamnese", titulo: "Atualização queixa principal", icone: ClipboardList, status: "concluido" },
];

const tabs = [
  { id: "anamnese", label: "Anamnese", icone: ClipboardList },
  { id: "ras", label: "RAS", icone: FileText },
  { id: "prescricao", label: "Prescrição", icone: Pill },
  { id: "pedidos", label: "Pedidos", icone: FlaskConical },
  { id: "dieta", label: "Dieta", icone: Salad },
  { id: "emitir", label: "Emitir", icone: Send },
] as const;

type TabId = (typeof tabs)[number]["id"];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function CockpitMedicoV1() {
  const [tab, setTab] = useState<TabId>("anamnese");

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: tk.bg,
        color: tk.ink,
        fontFamily: tk.sans,
        fontFeatureSettings: '"ss01","cv11"',
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />

      <TopBar />

      <div className="grid grid-cols-[420px_1fr] gap-0">
        <LeftColumn />
        <RightColumn tab={tab} setTab={setTab} />
      </div>

      <BottomStatus />
    </div>
  );
}

// ============================================================================
// TOP BAR
// ============================================================================
function TopBar() {
  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b"
      style={{ borderColor: tk.border, background: tk.bgAlt }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 grid place-items-center"
            style={{ background: tk.accent, color: tk.bg, fontFamily: tk.mono, fontWeight: 700 }}
          >
            P
          </div>
          <div className="flex flex-col leading-tight">
            <span style={{ fontFamily: tk.mono, fontSize: 13, fontWeight: 600 }}>PAWARDS</span>
            <span style={{ color: tk.inkSubtle, fontSize: 10, letterSpacing: 1.2 }}>
              COCKPIT MÉDICO · V1
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2" style={{ color: tk.inkMuted, fontSize: 12 }}>
          <Building2 size={13} />
          <span style={{ fontFamily: tk.mono }}>{paciente.unidade}</span>
          <ChevronRight size={12} style={{ color: tk.inkSubtle }} />
          <span>Consultório 2</span>
          <ChevronRight size={12} style={{ color: tk.inkSubtle }} />
          <span style={{ color: tk.ink }}>{paciente.nome}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SearchBar />
        <button
          className="px-3 py-2 flex items-center gap-2 border"
          style={{ borderColor: tk.border, color: tk.inkMuted, fontSize: 12 }}
        >
          <Bell size={14} />
          <span style={{ background: tk.danger, width: 6, height: 6, borderRadius: 9999 }} />
        </button>
        <button
          className="px-3 py-2 flex items-center gap-2 border"
          style={{ borderColor: tk.border, color: tk.ink, fontSize: 12 }}
        >
          <Save size={14} /> Salvar rascunho
        </button>
        <button
          className="px-4 py-2 flex items-center gap-2"
          style={{ background: tk.accent, color: tk.bg, fontSize: 12, fontWeight: 600 }}
        >
          <Check size={14} /> Validar sessão
        </button>
      </div>
    </header>
  );
}

function SearchBar() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border"
      style={{ borderColor: tk.border, color: tk.inkMuted, fontSize: 12, width: 280 }}
    >
      <Search size={13} />
      <span>Buscar paciente, prontuário, exame…</span>
      <span
        className="ml-auto px-1.5 py-0.5"
        style={{
          fontFamily: tk.mono,
          fontSize: 10,
          background: tk.bgSoft,
          color: tk.inkSubtle,
        }}
      >
        ⌘K
      </span>
    </div>
  );
}

// ============================================================================
// LEFT COLUMN — Identidade clínica
// ============================================================================
function LeftColumn() {
  return (
    <aside
      className="border-r"
      style={{ borderColor: tk.border, background: tk.bgAlt, minHeight: "calc(100vh - 56px)" }}
    >
      <PatientHeader />
      <Section title="Sinais vitais" subtitle="Aferição: hoje 07:32">
        <VitalsGrid />
      </Section>

      <Section title="Alergias documentadas" subtitle="3 registros · LGPD" tone="danger">
        <div className="flex flex-col">
          {alergias.map((a) => (
            <AllergyRow key={a.sub} {...a} />
          ))}
        </div>
      </Section>

      <Section title="Restrições permanentes" subtitle="nunca_*  ·  imutáveis">
        <ul className="flex flex-col gap-2">
          {restricoesPermanentes.map((r) => (
            <li
              key={r}
              className="flex gap-2 items-start px-4 py-2"
              style={{ borderLeft: `2px solid ${tk.warn}`, background: tk.bg, fontSize: 12 }}
            >
              <Lock size={12} style={{ color: tk.warn, marginTop: 3, flexShrink: 0 }} />
              <span style={{ color: tk.ink, lineHeight: 1.5 }}>{r}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Histórico clínico" subtitle="6 eventos · últimos 60 dias">
        <Timeline />
      </Section>
    </aside>
  );
}

function PatientHeader() {
  return (
    <div className="px-6 py-5 border-b" style={{ borderColor: tk.border }}>
      <div className="flex items-start gap-4">
        <div
          className="w-16 h-16 grid place-items-center flex-shrink-0"
          style={{
            background: tk.bgSoft,
            color: tk.accent,
            fontFamily: tk.mono,
            fontWeight: 700,
            fontSize: 22,
            border: `1px solid ${tk.borderStrong}`,
          }}
        >
          {paciente.fotoIniciais}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 style={{ fontSize: 16, fontWeight: 600, color: tk.ink }}>{paciente.nome}</h1>
          </div>
          <div style={{ fontSize: 11, color: tk.inkSubtle, fontFamily: tk.mono }}>
            {paciente.codigoSemantico} · {paciente.id}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: 11, color: tk.inkMuted }}>
            <span>{paciente.idade} anos</span>
            <span style={{ color: tk.inkSubtle }}>·</span>
            <span>{paciente.sexo}</span>
            <span style={{ color: tk.inkSubtle }}>·</span>
            <span style={{ fontFamily: tk.mono }}>{paciente.nascimento}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-1.5" style={{ fontSize: 11, color: tk.inkMuted }}>
        <InfoLine icon={Phone} text={paciente.telefone} mono />
        <InfoLine icon={Mail} text={paciente.email} />
        <InfoLine icon={MapPin} text={paciente.endereco} />
        <InfoLine icon={ShieldCheck} text={`Convênio: ${paciente.convenio}`} />
        <InfoLine icon={Stethoscope} text={`Resp.: ${paciente.responsavelClinico}`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Última visita" value={paciente.ultimaVisita} icon={Clock} />
        <MiniStat label="Próximo retorno" value={paciente.proximaVisita} icon={CalendarDays} />
      </div>
    </div>
  );
}

function InfoLine({ icon: Icon, text, mono }: { icon: any; text: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={11} style={{ color: tk.inkSubtle, flexShrink: 0 }} />
      <span style={{ fontFamily: mono ? tk.mono : tk.sans }}>{text}</span>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="px-3 py-2" style={{ background: tk.bg, border: `1px solid ${tk.border}` }}>
      <div className="flex items-center gap-1.5" style={{ color: tk.inkSubtle, fontSize: 10, letterSpacing: 0.6 }}>
        <Icon size={10} />
        <span className="uppercase">{label}</span>
      </div>
      <div style={{ fontFamily: tk.mono, fontSize: 12, color: tk.ink, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  tone,
  children,
}: {
  title: string;
  subtitle?: string;
  tone?: "danger" | "warn";
  children: React.ReactNode;
}) {
  const accent = tone === "danger" ? tk.danger : tone === "warn" ? tk.warn : tk.accent;
  return (
    <section className="border-b" style={{ borderColor: tk.border }}>
      <div className="px-6 pt-4 pb-2 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span style={{ width: 6, height: 6, background: accent }} />
          <h3 style={{ fontSize: 11, letterSpacing: 1.2, color: tk.ink, fontWeight: 600 }} className="uppercase">
            {title}
          </h3>
        </div>
        {subtitle && (
          <span style={{ fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono }}>{subtitle}</span>
        )}
      </div>
      <div className="px-3 pb-3">{children}</div>
    </section>
  );
}

function VitalsGrid() {
  return (
    <div className="grid grid-cols-3 gap-1.5 px-3">
      {sinaisVitais.map((v) => {
        const cor = v.status === "alerta" ? tk.warn : tk.ok;
        const TrendIcon = v.trend === "up" ? TrendingUp : v.trend === "down" ? TrendingDown : ArrowUpRight;
        return (
          <div
            key={v.rotulo}
            className="px-3 py-2.5"
            style={{ background: tk.bg, border: `1px solid ${tk.border}`, borderTop: `2px solid ${cor}` }}
          >
            <div
              className="flex items-center justify-between"
              style={{ fontSize: 10, color: tk.inkSubtle, letterSpacing: 0.5 }}
            >
              <span className="uppercase">{v.rotulo}</span>
              {v.trend !== "flat" && <TrendIcon size={10} style={{ color: cor }} />}
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span style={{ fontFamily: tk.mono, fontSize: 16, fontWeight: 600, color: tk.ink }}>
                {v.valor}
              </span>
              <span style={{ fontSize: 9, color: tk.inkSubtle }}>{v.unidade}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AllergyRow({ sub, grau, reacao }: { sub: string; grau: string; reacao: string }) {
  const cor = grau === "GRAVE" ? tk.danger : grau === "MODERADA" ? tk.warn : tk.inkMuted;
  return (
    <div
      className="flex items-start gap-3 px-4 py-3"
      style={{ borderBottom: `1px solid ${tk.border}` }}
    >
      <AlertTriangle size={14} style={{ color: cor, marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13, fontWeight: 500, color: tk.ink }}>{sub}</span>
          <span
            style={{
              fontSize: 9,
              fontFamily: tk.mono,
              padding: "1px 6px",
              background: tk.bg,
              color: cor,
              border: `1px solid ${cor}`,
              letterSpacing: 0.5,
            }}
          >
            {grau}
          </span>
        </div>
        <div style={{ fontSize: 11, color: tk.inkMuted, marginTop: 2 }}>{reacao}</div>
      </div>
    </div>
  );
}

function Timeline() {
  return (
    <div className="px-3 flex flex-col">
      {historico.map((h, i) => {
        const Icon = h.icone;
        return (
          <div key={i} className="flex gap-3 px-3 py-2.5" style={{ borderBottom: `1px solid ${tk.border}` }}>
            <div className="flex flex-col items-center" style={{ width: 16 }}>
              <Icon size={14} style={{ color: tk.accent }} />
              {i < historico.length - 1 && (
                <div style={{ width: 1, flex: 1, background: tk.border, marginTop: 4 }} />
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12, color: tk.ink, fontWeight: 500 }}>{h.titulo}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5" style={{ fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono }}>
                <span>{h.data}</span>
                <span>·</span>
                <span>{h.tipo}</span>
              </div>
            </div>
          </div>
        );
      })}
      <button
        className="mt-2 mx-3 px-3 py-2 flex items-center justify-center gap-2 border"
        style={{ borderColor: tk.border, color: tk.inkMuted, fontSize: 11 }}
      >
        <History size={11} /> Ver prontuário completo (47 sessões)
      </button>
    </div>
  );
}

// ============================================================================
// RIGHT COLUMN — Tabs operacionais
// ============================================================================
function RightColumn({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  return (
    <main className="flex flex-col" style={{ minHeight: "calc(100vh - 56px)" }}>
      <TabBar tab={tab} setTab={setTab} />
      <div className="flex-1 overflow-auto">
        {tab === "anamnese" && <AnamneseTab />}
        {tab === "ras" && <RasTab />}
        {tab === "prescricao" && <PrescricaoTab />}
        {tab === "pedidos" && <PedidosTab />}
        {tab === "dieta" && <DietaTab />}
        {tab === "emitir" && <EmitirTab />}
      </div>
    </main>
  );
}

function TabBar({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  return (
    <div
      className="flex items-center justify-between border-b px-6"
      style={{ borderColor: tk.border, background: tk.bgAlt }}
    >
      <div className="flex">
        {tabs.map((t) => {
          const Icon = t.icone;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-3"
              style={{
                fontSize: 12,
                color: active ? tk.ink : tk.inkMuted,
                fontWeight: active ? 600 : 400,
                borderBottom: active ? `2px solid ${tk.accent}` : "2px solid transparent",
                background: active ? tk.bg : "transparent",
              }}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4" style={{ fontSize: 11, color: tk.inkSubtle, fontFamily: tk.mono }}>
        <span className="flex items-center gap-1.5">
          <CircleDot size={10} style={{ color: tk.ok }} />
          AUTO-SALVAMENTO ATIVO
        </span>
        <span>SESSÃO #3497 · MIGRATION 072</span>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: ANAMNESE
// ============================================================================
function AnamneseTab() {
  return (
    <div className="p-6 grid grid-cols-[1fr_360px] gap-6">
      <div className="space-y-5">
        <PageHeader
          eyebrow="Caderno 1 · QUEIXA PRINCIPAL"
          title="Anamnese estruturada — Sessão 39"
          meta="Iniciada hoje 07:32 · Última atualização: 6s atrás"
        />

        <FieldGroup label="Queixa principal" required>
          <textarea
            className="w-full px-3 py-3 outline-none"
            style={{
              background: tk.bg,
              color: tk.ink,
              border: `1px solid ${tk.border}`,
              fontSize: 13,
              lineHeight: 1.6,
              minHeight: 90,
              resize: "vertical",
              fontFamily: tk.sans,
            }}
            defaultValue="Paciente refere fadiga progressiva nos últimos 4 meses, com piora vespertina. Associa episódios de insônia de manutenção (acorda entre 3h e 4h, não retorna ao sono). Relata ganho ponderal de 4,8 kg no período, apesar de redução voluntária da ingesta calórica. Nega febre, dor torácica ou dispneia."
          />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Início dos sintomas">
            <SoftInput value="Janeiro / 2026" />
          </FieldGroup>
          <FieldGroup label="Intensidade (EVA)">
            <SoftInput value="6 / 10" mono />
          </FieldGroup>
        </div>

        <FieldGroup label="História da moléstia atual">
          <textarea
            className="w-full px-3 py-3 outline-none"
            style={{
              background: tk.bg,
              color: tk.ink,
              border: `1px solid ${tk.border}`,
              fontSize: 13,
              lineHeight: 1.6,
              minHeight: 110,
              resize: "vertical",
              fontFamily: tk.sans,
            }}
            defaultValue="Quadro iniciou-se de forma insidiosa após menopausa cirúrgica (histerectomia + ooforectomia bilateral, 2024). Tentativa prévia de reposição com estradiol transdérmico interrompida por enxaqueca refratária. Procurou clínica integrativa por orientação de colega que realizou tratamento similar com boa resposta."
          />
        </FieldGroup>

        <div className="grid grid-cols-3 gap-3">
          <ChipGroup label="Sistemas afetados" chips={["Endócrino", "Sono", "Cardiovascular", "Cognitivo"]} />
          <ChipGroup label="Hábitos de vida" chips={["Sedentária", "Sono fragmentado", "Estresse alto"]} />
          <ChipGroup label="Medicações em uso" chips={["Losartana 50mg", "Sinvastatina 20mg", "Vit. D 7000 UI"]} />
        </div>

        <CadernosNav />
      </div>

      <SugestoesMotor />
    </div>
  );
}

function PageHeader({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <div className="pb-4" style={{ borderBottom: `1px solid ${tk.border}` }}>
      <div style={{ fontSize: 10, letterSpacing: 1.5, color: tk.accent, fontFamily: tk.mono }}>
        {eyebrow}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: tk.ink, marginTop: 4, letterSpacing: -0.3 }}>
        {title}
      </h2>
      {meta && (
        <div style={{ fontSize: 11, color: tk.inkSubtle, marginTop: 4, fontFamily: tk.mono }}>{meta}</div>
      )}
    </div>
  );
}

function FieldGroup({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="flex items-center gap-2 mb-1.5"
        style={{ fontSize: 10, color: tk.inkMuted, letterSpacing: 1, fontWeight: 500 }}
      >
        <span className="uppercase">{label}</span>
        {required && <span style={{ color: tk.danger }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function SoftInput({ value, mono, className }: { value: string; mono?: boolean; className?: string }) {
  return (
    <input
      defaultValue={value}
      className={`w-full px-3 py-2 outline-none ${className ?? ""}`}
      style={{
        background: tk.bg,
        color: tk.ink,
        border: `1px solid ${tk.border}`,
        fontSize: 13,
        fontFamily: mono ? tk.mono : tk.sans,
      }}
    />
  );
}

function SelectInput({
  value,
  options,
  className,
}: {
  value: string;
  options: string[];
  className?: string;
}) {
  return (
    <select
      defaultValue={value}
      className={`w-full px-3 py-2 outline-none ${className ?? ""}`}
      style={{
        background: tk.bg,
        color: tk.ink,
        border: `1px solid ${tk.border}`,
        fontSize: 13,
        fontFamily: tk.sans,
        appearance: "none",
        backgroundImage: `linear-gradient(45deg, transparent 50%, ${tk.inkSubtle} 50%), linear-gradient(135deg, ${tk.inkSubtle} 50%, transparent 50%)`,
        backgroundPosition: "calc(100% - 14px) 50%, calc(100% - 9px) 50%",
        backgroundSize: "5px 5px, 5px 5px",
        backgroundRepeat: "no-repeat",
        paddingRight: 28,
      }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt} style={{ background: tk.bg, color: tk.ink }}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function ChipGroup({ label, chips }: { label: string; chips: string[] }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: tk.inkMuted, letterSpacing: 1, marginBottom: 6 }} className="uppercase">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c}
            className="px-2.5 py-1"
            style={{
              fontSize: 11,
              background: tk.bgAlt,
              color: tk.ink,
              border: `1px solid ${tk.border}`,
            }}
          >
            {c}
          </span>
        ))}
        <button
          className="px-2 py-1 flex items-center gap-1"
          style={{ fontSize: 11, color: tk.inkSubtle, border: `1px dashed ${tk.border}` }}
        >
          <Plus size={10} /> add
        </button>
      </div>
    </div>
  );
}

function CadernosNav() {
  const cadernos = [
    { n: 1, t: "Queixa principal", done: true },
    { n: 2, t: "HMA", done: true },
    { n: 3, t: "História pregressa", done: true },
    { n: 4, t: "Familiar", done: true },
    { n: 5, t: "Hábitos", done: true },
    { n: 6, t: "Revisão sistemas", done: true },
    { n: 7, t: "Exame físico", done: false, current: true },
    { n: 8, t: "Hipóteses", done: false },
    { n: 9, t: "Plano terapêutico", done: false },
    { n: 10, t: "Aconselhamento", done: false },
    { n: 11, t: "Encerramento", done: false },
  ];
  return (
    <div className="pt-4" style={{ borderTop: `1px solid ${tk.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 10, color: tk.inkMuted, letterSpacing: 1 }} className="uppercase">
          Cadernos RAS (11)
        </span>
        <span style={{ fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono }}>6 / 11 preenchidos</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cadernos.map((c) => {
          const bg = c.current ? tk.accent : c.done ? tk.bgSoft : tk.bg;
          const fg = c.current ? tk.bg : c.done ? tk.ink : tk.inkSubtle;
          return (
            <div
              key={c.n}
              className="flex items-center gap-2 px-2.5 py-1.5"
              style={{
                background: bg,
                color: fg,
                border: `1px solid ${c.current ? tk.accent : tk.border}`,
                fontSize: 11,
                fontFamily: tk.mono,
              }}
            >
              <span style={{ fontWeight: 600 }}>{String(c.n).padStart(2, "0")}</span>
              <span style={{ fontFamily: tk.sans }}>{c.t}</span>
              {c.done && <Check size={10} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SUGESTÕES DO MOTOR (sidebar direita dentro do tab Anamnese)
// ============================================================================
function SugestoesMotor() {
  return (
    <div
      className="p-4 self-start sticky top-0"
      style={{ background: tk.bgAlt, border: `1px solid ${tk.border}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} style={{ color: tk.accent }} />
        <span style={{ fontSize: 11, letterSpacing: 1.2, color: tk.ink, fontWeight: 600 }} className="uppercase">
          Motor PAWARDS
        </span>
        <span
          style={{
            fontSize: 9,
            padding: "1px 5px",
            background: tk.accent,
            color: tk.bg,
            fontFamily: tk.mono,
            marginLeft: "auto",
          }}
        >
          V4 · 12 sug
        </span>
      </div>

      <p style={{ fontSize: 11, color: tk.inkMuted, marginBottom: 12, lineHeight: 1.5 }}>
        Sugestões geradas a partir da análise semântica dos cadernos 1–6 já preenchidos. Toque
        para aprovar e enviar à fila de validação médica.
      </p>

      <SugBucket icon={Microscope} title="Exames sugeridos" count={5} items={[
        { t: "Cortisol salivar 4 amostras", just: "Padrão de fadiga + insônia 3h" },
        { t: "TSH + T4 livre + Anti-TPO", just: "Pós-menopausa cirúrgica" },
        { t: "Insulina jejum + HOMA-IR", just: "Ganho ponderal + glic 112" },
        { t: "PCR ultra-sensível", just: "Avaliar inflamação subclínica" },
        { t: "Painel hormonal feminino", just: "Reavaliação MTH" },
      ]} />

      <SugBucket icon={Pill} title="Fórmulas manipuladas" count={3} items={[
        { t: "Adapto-noturna + magnésio dimalato", just: "Sono de manutenção" },
        { t: "Berberina 500mg 2x/d", just: "Resistência insulínica" },
        { t: "DHEA 10mg sublingual", just: "Andropausa fem. cirúrgica" },
      ]} />

      <SugBucket icon={Syringe} title="Injetáveis / Soroterapia" count={2} items={[
        { t: "Coquetel B-detox EV mensal", just: "Continuidade — boa resposta" },
        { t: "Vit. C 5g + glutationa", just: "Estresse oxidativo" },
      ]} />

      <SugBucket icon={Leaf} title="Protocolo terapêutico" count={1} items={[
        { t: "Protocolo METAB-PÓS — 90 dias", just: "Match 87% perfil paciente" },
      ]} />

      <button
        className="w-full mt-3 px-3 py-2.5 flex items-center justify-center gap-2"
        style={{ background: tk.accent, color: tk.bg, fontSize: 12, fontWeight: 600 }}
      >
        <Check size={13} /> Aceitar selecionadas (8) → Validação
      </button>
    </div>
  );
}

function SugBucket({
  icon: Icon,
  title,
  count,
  items,
}: {
  icon: any;
  title: string;
  count: number;
  items: { t: string; just: string }[];
}) {
  return (
    <div className="mb-3">
      <div
        className="flex items-center justify-between px-2 py-1.5"
        style={{ background: tk.bg, borderBottom: `1px solid ${tk.border}` }}
      >
        <div className="flex items-center gap-2">
          <Icon size={12} style={{ color: tk.accentDeep }} />
          <span style={{ fontSize: 11, color: tk.ink, fontWeight: 500 }}>{title}</span>
        </div>
        <span style={{ fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono }}>{count}</span>
      </div>
      <div>
        {items.map((it, i) => (
          <label
            key={i}
            className="flex items-start gap-2 px-2 py-2 cursor-pointer"
            style={{ borderBottom: `1px solid ${tk.border}` }}
          >
            <input
              type="checkbox"
              defaultChecked={i < 2}
              style={{ marginTop: 3, accentColor: tk.accent }}
            />
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 12, color: tk.ink, lineHeight: 1.4 }}>{it.t}</div>
              <div style={{ fontSize: 10, color: tk.inkSubtle, marginTop: 2, fontStyle: "italic" }}>
                {it.just}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: RAS (resumo dos 11 cadernos + preview PDF)
// ============================================================================
function RasTab() {
  return (
    <div className="p-6 grid grid-cols-[1fr_500px] gap-6">
      <div>
        <PageHeader
          eyebrow="RAS · RELATÓRIO DE ATENDIMENTO SISTEMATIZADO"
          title="RAS V8 — Sessão 39"
          meta="11 cadernos · 26.353 bytes · gerado em 0,82s"
        />
        <div className="mt-5 space-y-2">
          {[
            { n: "01", t: "Identificação & Triagem", linhas: 18 },
            { n: "02", t: "Queixa Principal & HMA", linhas: 24 },
            { n: "03", t: "História Pregressa & Familiar", linhas: 31 },
            { n: "04", t: "Hábitos de Vida", linhas: 17 },
            { n: "05", t: "Revisão de Sistemas", linhas: 48 },
            { n: "06", t: "Exame Físico Sistematizado", linhas: 36 },
            { n: "07", t: "Hipóteses Diagnósticas", linhas: 14, hot: true },
            { n: "08", t: "Plano Terapêutico Integrativo", linhas: 41, hot: true },
            { n: "09", t: "Aconselhamento & Educação", linhas: 22 },
            { n: "10", t: "Riscos & Contraindicações", linhas: 19 },
            { n: "11", t: "Encerramento & Próximos Passos", linhas: 12 },
          ].map((c) => (
            <div
              key={c.n}
              className="flex items-center gap-4 px-4 py-3"
              style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, borderLeft: c.hot ? `2px solid ${tk.accent}` : `1px solid ${tk.border}` }}
            >
              <span style={{ fontFamily: tk.mono, fontSize: 11, color: tk.accent, width: 24 }}>{c.n}</span>
              <span style={{ fontSize: 13, color: tk.ink, flex: 1 }}>{c.t}</span>
              <span style={{ fontSize: 10, fontFamily: tk.mono, color: tk.inkSubtle }}>{c.linhas} linhas</span>
              <Eye size={13} style={{ color: tk.inkMuted }} />
            </div>
          ))}
        </div>
      </div>

      <PdfPreview />
    </div>
  );
}

function PdfPreview() {
  return (
    <div
      className="self-start"
      style={{ background: "#F4F1EA", color: "#1A1A1A", padding: 28, minHeight: 640, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
    >
      <div className="flex items-start justify-between" style={{ borderBottom: "1px solid #333", paddingBottom: 12 }}>
        <div>
          <div style={{ fontFamily: tk.mono, fontSize: 9, letterSpacing: 1.5 }}>PAWARDS · INSTITUTO PÁDUA</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>RELATÓRIO DE ATENDIMENTO SISTEMATIZADO</div>
          <div style={{ fontFamily: tk.mono, fontSize: 10, marginTop: 4, color: "#555" }}>
            RAS-V8 · PAD-2026-3497 · 19/MAI/2026
          </div>
        </div>
        <div style={{ width: 48, height: 48, background: "#1A1A1A", color: "#F4F1EA", display: "grid", placeItems: "center", fontFamily: tk.mono, fontWeight: 700 }}>
          P
        </div>
      </div>

      <div style={{ marginTop: 18, fontSize: 11, lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}>
          <strong>Paciente:</strong> Carlúcia Mendes do Vale, 58 anos, gênero feminino, registrada
          sob código semântico <span style={{ fontFamily: tk.mono }}>PAD-FEM-58-METAB</span>.
        </p>
        <p style={{ marginTop: 10 }}>
          <strong>Queixa principal:</strong> Fadiga progressiva com piora vespertina há
          aproximadamente 4 meses, associada a insônia de manutenção e ganho ponderal de 4,8 kg.
        </p>
        <p style={{ marginTop: 10 }}>
          <strong>Hipóteses diagnósticas:</strong>
        </p>
        <ol style={{ marginTop: 6, paddingLeft: 18 }}>
          <li>Síndrome metabólica pós-menopausa cirúrgica (CID E88.9)</li>
          <li>Insuficiência adrenal funcional / disritmia de cortisol</li>
          <li>Resistência insulínica subclínica</li>
        </ol>
        <p style={{ marginTop: 10 }}>
          <strong>Plano terapêutico:</strong> protocolo Pádua METAB-PÓS de 90 dias, com início de
          fórmula manipulada adapto-noturna + magnésio dimalato, berberina 500mg 2x/d, e
          continuidade da soroterapia mensal Coquetel B-detox.
        </p>
      </div>

      <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #333", display: "flex", justifyContent: "space-between", fontFamily: tk.mono, fontSize: 9, color: "#555" }}>
        <span>Pág. 1 de 7</span>
        <span>HASH SHA-256: a8c7…fa3e</span>
        <span>VALIDADO POR: Dra. Renata C. Albuquerque · CRM-RJ 84.221</span>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: PRESCRIÇÃO
// ============================================================================
function PrescricaoTab() {
  const [drawer, setDrawer] = useState<null | "catalogo" | "nova" | "protocolo">(null);
  return (
    <div className="p-6 space-y-5 relative">
      <PageHeader
        eyebrow="MANIFESTO BLUEPRINT V2 · DUAL-MODE"
        title="Prescrição — Sessão 39"
        meta="2 fórmulas manipuladas · 1 remédio industrializado · 1 injetável"
      />

      <PrescricaoToolbar onAction={setDrawer} />

      <div className="grid grid-cols-2 gap-4">
        <PrescCard
          tipo="FÓRMULA MANIPULADA"
          titulo="Adapto-noturna + Magnésio dimalato"
          composicao={[
            "Withania somnifera ext. seco 300mg",
            "Magnésio dimalato 200mg",
            "L-Teanina 200mg",
            "Glicina 500mg",
          ]}
          posologia="01 cápsula 60 minutos antes de dormir"
          duracao="90 dias"
          farmacia="Galena Manipulação (id=7)"
        />
        <PrescCard
          tipo="FÓRMULA MANIPULADA"
          titulo="Berberina HCl"
          composicao={["Berberina HCl 500mg"]}
          posologia="01 cápsula 2× ao dia, 20 min antes das refeições"
          duracao="90 dias"
          farmacia="Galena Manipulação (id=7)"
        />
        <PrescCard
          tipo="REMÉDIO INDUSTRIALIZADO"
          titulo="Vitamina D3 (colecalciferol) 7.000 UI"
          composicao={["Colecalciferol 7.000 UI"]}
          posologia="01 cápsula ao dia, com refeição gordurosa"
          duracao="Uso contínuo · reavaliar em 90 dias"
          farmacia="Drogaria de preferência"
        />
        <PrescCard
          tipo="INJETÁVEL EV"
          titulo="Coquetel B-detox"
          composicao={[
            "Complexo B 5mL",
            "Glutationa 600mg",
            "Vitamina C 5g",
            "SF 0,9% 250mL",
          ]}
          posologia="Aplicação mensal — gotejamento 45 min"
          duracao="3 sessões"
          farmacia="Aplicação intra-clínica"
        />
      </div>

      <CompatBanner />

      {drawer && <CatalogoDrawer modo={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}

function PrescricaoToolbar({ onAction }: { onAction: (m: "catalogo" | "nova" | "protocolo") => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${tk.accent}` }}
    >
      <div className="flex items-center gap-2 mr-2" style={{ color: tk.inkMuted, fontSize: 11 }}>
        <Plus size={13} style={{ color: tk.accent }} />
        <span style={{ fontFamily: tk.mono, letterSpacing: 0.8 }} className="uppercase">
          Adicionar item terapêutico
        </span>
      </div>

      <button
        onClick={() => onAction("catalogo")}
        className="px-3 py-2 flex items-center gap-2"
        style={{ background: tk.bg, border: `1px solid ${tk.border}`, color: tk.ink, fontSize: 12 }}
      >
        <BookMarked size={13} style={{ color: tk.accent }} />
        Buscar no Catálogo PARMAVAULT
        <span style={{ fontSize: 9, fontFamily: tk.mono, color: tk.inkSubtle, marginLeft: 4 }}>
          8.728 itens
        </span>
      </button>

      <button
        onClick={() => onAction("nova")}
        className="px-3 py-2 flex items-center gap-2"
        style={{ background: tk.bg, border: `1px solid ${tk.border}`, color: tk.ink, fontSize: 12 }}
      >
        <Beaker size={13} style={{ color: tk.accent }} />
        Criar nova fórmula manipulada
      </button>

      <button
        onClick={() => onAction("protocolo")}
        className="px-3 py-2 flex items-center gap-2"
        style={{ background: tk.bg, border: `1px solid ${tk.border}`, color: tk.ink, fontSize: 12 }}
      >
        <Layers size={13} style={{ color: tk.accent }} />
        Aplicar Protocolo Pádua
      </button>

      <div className="ml-auto flex items-center gap-3" style={{ fontSize: 11, color: tk.inkSubtle, fontFamily: tk.mono }}>
        <span>4 itens · ⌘P pra abrir busca rápida</span>
      </div>
    </div>
  );
}

function CatalogoDrawer({ modo, onClose }: { modo: "catalogo" | "nova" | "protocolo"; onClose: () => void }) {
  const titulos = {
    catalogo: "Catálogo PARMAVAULT · Itens Terapêuticos Unificados",
    nova: "Nova Fórmula Manipulada",
    protocolo: "Protocolos do Instituto Pádua",
  };
  const eyebrows = {
    catalogo: "BUSCA NO CATÁLOGO · 8.728 ITENS · COBERTURA SEMÂNTICA 100%",
    nova: "EDITOR MANIPULADO · MOTOR DE COMPATIBILIDADE",
    protocolo: "PROTOCOLOS PRÉ-MONTADOS · 47 DISPONÍVEIS",
  };
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(11, 18, 32, 0.78)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col"
        style={{
          width: 720,
          background: tk.bgAlt,
          borderLeft: `1px solid ${tk.borderStrong}`,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="px-6 py-4 flex items-start justify-between" style={{ borderBottom: `1px solid ${tk.border}` }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: tk.accent, fontFamily: tk.mono }}>
              {eyebrows[modo]}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: tk.ink, marginTop: 4 }}>{titulos[modo]}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5"
            style={{ color: tk.inkMuted, border: `1px solid ${tk.border}` }}
          >
            <X size={14} />
          </button>
        </div>

        {modo === "catalogo" && <CatalogoBusca />}
        {modo === "nova" && <FormulaEditor />}
        {modo === "protocolo" && <ProtocoloLista />}
      </aside>
    </div>
  );
}

function CatalogoBusca() {
  const [q, setQ] = useState("magnésio");
  const resultados = [
    {
      cod: "MAN-MG-DIM-200",
      nome: "Magnésio dimalato 200mg",
      tipo: "Substância · Manipulada",
      categoria: "Mineral / Cofator",
      farmacias: ["Galena", "Pharmavita", "Fórmula Certa"],
      preco: "≈ R$ 0,38/cápsula",
      compat: "ok",
      uso: 1247,
    },
    {
      cod: "MAN-MG-GLI-300",
      nome: "Magnésio glicinato 300mg",
      tipo: "Substância · Manipulada",
      categoria: "Mineral / Sono",
      farmacias: ["Galena", "Pharmavita"],
      preco: "≈ R$ 0,52/cápsula",
      compat: "ok",
      uso: 892,
    },
    {
      cod: "FOR-ADAPT-NOT-V3",
      nome: "Adapto-noturna + Magnésio dimalato",
      tipo: "Fórmula composta · Pré-validada",
      categoria: "Sono / Adaptógenos",
      farmacias: ["Galena"],
      preco: "≈ R$ 4,80/cápsula",
      compat: "ok",
      uso: 612,
      destaque: true,
    },
    {
      cod: "MAN-MG-TRE-2G",
      nome: "Magnésio treonato 2g",
      tipo: "Substância · Manipulada",
      categoria: "Mineral / Cognitivo",
      farmacias: ["Pharmavita", "Fórmula Certa"],
      preco: "≈ R$ 1,90/sachê",
      compat: "alerta",
      uso: 184,
    },
    {
      cod: "IND-MG-CIT-RXN",
      nome: "Citrato de Magnésio (industrializado)",
      tipo: "Remédio · Industrializado",
      categoria: "Mineral / OTC",
      farmacias: ["Qualquer drogaria"],
      preco: "R$ 28,90/cx 30 cp",
      compat: "ok",
      uso: 2104,
    },
  ];
  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-4 sticky top-0" style={{ background: tk.bgAlt, borderBottom: `1px solid ${tk.border}`, zIndex: 1 }}>
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ background: tk.bg, border: `1px solid ${tk.accent}` }}
        >
          <Search size={14} style={{ color: tk.accent }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 outline-none bg-transparent"
            style={{ color: tk.ink, fontSize: 13, fontFamily: tk.sans }}
            placeholder="Buscar por nome, substância, código semântico ou CAS…"
          />
          <span style={{ fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono }}>5 resultados · 0,12s</span>
        </div>

        <div className="flex items-center gap-2 mt-3" style={{ fontSize: 11 }}>
          <Filter size={11} style={{ color: tk.inkSubtle }} />
          {["Todos", "Manipuladas", "Industrializadas", "Injetáveis", "Fórmulas compostas", "Mais usadas"].map((f, i) => (
            <button
              key={f}
              className="px-2.5 py-1"
              style={{
                background: i === 0 ? tk.accent : tk.bg,
                color: i === 0 ? tk.bg : tk.inkMuted,
                border: `1px solid ${i === 0 ? tk.accent : tk.border}`,
                fontSize: 11,
                fontWeight: i === 0 ? 600 : 400,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        {resultados.map((r) => {
          const corCompat = r.compat === "ok" ? tk.ok : tk.warn;
          return (
            <div
              key={r.cod}
              className="px-6 py-4 flex gap-4 items-start"
              style={{
                borderBottom: `1px solid ${tk.border}`,
                background: r.destaque ? tk.bgSoft : "transparent",
              }}
            >
              <div className="flex flex-col items-center gap-1" style={{ width: 36 }}>
                <div
                  className="w-9 h-9 grid place-items-center"
                  style={{
                    background: tk.bg,
                    border: `1px solid ${tk.border}`,
                    color: tk.accent,
                  }}
                >
                  {r.tipo.includes("Industrializado") ? <Pill size={14} /> : r.tipo.includes("Fórmula composta") ? <Star size={14} /> : <Beaker size={14} />}
                </div>
                {r.destaque && (
                  <span style={{ fontSize: 8, color: tk.accent, fontFamily: tk.mono, letterSpacing: 0.5 }}>
                    SUG. MOTOR
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 13, fontWeight: 600, color: tk.ink }}>{r.nome}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontFamily: tk.mono,
                      padding: "1px 5px",
                      background: tk.bg,
                      color: corCompat,
                      border: `1px solid ${corCompat}`,
                    }}
                  >
                    {r.compat === "ok" ? "COMPATÍVEL" : "VER ALERTA"}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono, marginTop: 2 }}>
                  {r.cod} · {r.tipo}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2" style={{ fontSize: 11, color: tk.inkMuted }}>
                  <span className="flex items-center gap-1">
                    <Layers size={10} />
                    {r.categoria}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building size={10} />
                    {r.farmacias.join(", ")}
                  </span>
                  <span className="flex items-center gap-1" style={{ fontFamily: tk.mono }}>
                    {r.preco}
                  </span>
                  <span style={{ color: tk.inkSubtle }}>· usado {r.uso}×</span>
                </div>
              </div>
              <button
                className="px-3 py-2 flex items-center gap-1.5 flex-shrink-0"
                style={{ background: tk.accent, color: tk.bg, fontSize: 11, fontWeight: 600 }}
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FormulaEditor() {
  return (
    <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
      <FieldGroup label="Nome da fórmula" required>
        <SoftInput value="Nova fórmula — paciente PAD-2026-3497" />
      </FieldGroup>

      <div>
        <label
          className="flex items-center justify-between mb-2"
          style={{ fontSize: 10, color: tk.inkMuted, letterSpacing: 1, fontWeight: 500 }}
        >
          <span className="uppercase">Composição</span>
          <span style={{ fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono }}>
            0 substâncias · adicione abaixo
          </span>
        </label>
        <div
          className="px-3 py-8 grid place-items-center"
          style={{ background: tk.bg, border: `1px dashed ${tk.border}`, color: tk.inkSubtle, fontSize: 12 }}
        >
          <div className="text-center">
            <Beaker size={20} style={{ color: tk.inkSubtle, margin: "0 auto 8px" }} />
            <div>Clique para buscar substância no catálogo PARMAVAULT</div>
            <div style={{ fontSize: 10, marginTop: 4, fontFamily: tk.mono }}>
              + ADICIONAR SUBSTÂNCIA (Ctrl+S)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FieldGroup label="Via de administração" required>
          <SelectInput
            value="Oral"
            options={["Oral", "Sublingual", "Tópica", "Retal", "Vaginal", "Inalatória", "Subcutânea", "Intramuscular", "Endovenosa"]}
          />
        </FieldGroup>
        <FieldGroup label="Forma farmacêutica">
          <SelectInput
            value="Cápsula"
            options={["Cápsula", "Comprimido", "Sachê", "Solução oral", "Suspensão", "Gel", "Creme", "Pomada", "Supositório", "Óvulo", "Ampola"]}
          />
        </FieldGroup>
        <FieldGroup label="Dose por administração" required>
          <div className="flex gap-2">
            <SoftInput value="1" mono className="flex-1" />
            <SelectInput value="cápsula" options={["cápsula", "comprimido", "sachê", "mL", "gota", "puff"]} className="flex-1" />
          </div>
        </FieldGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Frequência" required>
          <SelectInput
            value="1x ao dia"
            options={[
              "1x ao dia",
              "2x ao dia",
              "3x ao dia",
              "4x ao dia",
              "De 8 em 8 horas",
              "De 12 em 12 horas",
              "Dias alternados",
              "Semanal",
              "Mensal",
              "Conforme orientação",
            ]}
          />
        </FieldGroup>
        <FieldGroup label="Duração do tratamento" required>
          <SoftInput value="90 dias" mono />
        </FieldGroup>
      </div>

      <div>
        <label
          className="block mb-2 uppercase"
          style={{ fontSize: 10, color: tk.inkMuted, letterSpacing: 1, fontWeight: 500 }}
        >
          Período do dia · 9 canônicos Pádua <span style={{ color: tk.warn, marginLeft: 4 }}>*</span>
          <span style={{ color: tk.inkMuted, marginLeft: 8, textTransform: "none", letterSpacing: 0, fontSize: 9 }}>
            (fonte: <code>periodos_dia</code> · migrations 075+077 · SIGLAS SEMPRE MAIÚSCULAS)
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { sigla: "JE", nome: "Jejum",           janela: "05:00–06:59", emoji: "🌑", cor: "#d4a574" },
            { sigla: "IM", nome: "Início Manhã",    janela: "07:00–08:59", emoji: "🌅", cor: "#f5b947" },
            { sigla: "MM", nome: "Meio Manhã",      janela: "09:00–10:59", emoji: "☀️", cor: "#f5d547" },
            { sigla: "AL", nome: "Almoço",          janela: "11:00–13:29", emoji: "🍽️", cor: "#f57a47" },
            { sigla: "IT", nome: "Início Tarde",    janela: "13:30–15:59", emoji: "🌤️", cor: "#e87a47" },
            { sigla: "MT", nome: "Meio Tarde",      janela: "16:00–17:59", emoji: "⛅", cor: "#d9663d" },
            { sigla: "NO", nome: "Noite",           janela: "18:00–19:59", emoji: "🌆", cor: "#7a6bd9" },
            { sigla: "FN", nome: "Final Noite",     janela: "20:00–22:29", emoji: "🌙", cor: "#6b5fb0" },
            { sigla: "CE", nome: "Ceia",            janela: "22:30–23:59", emoji: "🦉", cor: "#5b4e9b" },
          ].map((p) => {
            const ativo = p.sigla === "FN";
            return (
              <button
                key={p.sigla}
                title={`${p.sigla} · ${p.nome} · ${p.janela}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5"
                style={{
                  background: ativo ? p.cor : tk.bg,
                  color: ativo ? "#0a0e14" : tk.inkMuted,
                  border: `1px solid ${ativo ? p.cor : tk.border}`,
                  borderLeft: `3px solid ${p.cor}`,
                  fontSize: 11,
                  fontWeight: ativo ? 600 : 400,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                <span style={{ fontSize: 12 }}>{p.emoji}</span>
                <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>{p.sigla}</span>
                <span style={{ opacity: 0.85 }}>{p.nome}</span>
                <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>{p.janela}</span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 9, color: tk.inkMuted, marginTop: 6, fontStyle: "italic" }}>
          ⓘ Madrugada 00:00–04:59 deliberadamente vazia — paciente não recebe lembrete dormindo.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FieldGroup label="Horário sugerido (opcional)">
          <SoftInput value="22:00" mono />
        </FieldGroup>
        <FieldGroup label="Relação com alimentação">
          <SelectInput
            value="60 min antes"
            options={["Indiferente", "Em jejum", "Antes da refeição", "30 min antes", "60 min antes", "Durante a refeição", "Após a refeição", "60 min após"]}
          />
        </FieldGroup>
        <FieldGroup label="Quantidade total aviada">
          <SoftInput value="90 cápsulas" mono />
        </FieldGroup>
      </div>

      <FieldGroup label="Farmácia de aviamento" required>
        <SelectInput
          value="Galena Manipulação (id=7) — preferencial"
          options={[
            "Galena Manipulação (id=7) — preferencial",
            "Pharmavita Manipulação (id=12)",
            "Fórmula Certa (id=18)",
            "Outras (escolher na hora)",
          ]}
        />
      </FieldGroup>

      <FieldGroup label="Justificativa clínica">
        <textarea
          className="w-full px-3 py-3 outline-none"
          style={{
            background: tk.bg,
            color: tk.ink,
            border: `1px solid ${tk.border}`,
            fontSize: 13,
            lineHeight: 1.6,
            minHeight: 80,
            resize: "vertical",
            fontFamily: tk.sans,
          }}
          placeholder="Por que essa fórmula? Qual sintoma trata? Quais evidências sustentam?"
        />
      </FieldGroup>

      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ background: tk.bg, border: `1px solid ${tk.warn}`, borderLeft: `3px solid ${tk.warn}` }}
      >
        <ShieldAlert size={14} style={{ color: tk.warn }} />
        <span style={{ fontSize: 11, color: tk.ink }}>
          O motor validará compatibilidade com alergias e medicações em uso ao salvar.
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button className="px-4 py-2" style={{ background: tk.bg, color: tk.ink, border: `1px solid ${tk.border}`, fontSize: 12 }}>
          Salvar rascunho
        </button>
        <button className="px-4 py-2 flex items-center gap-2" style={{ background: tk.accent, color: tk.bg, fontSize: 12, fontWeight: 600 }}>
          <Check size={13} /> Adicionar à prescrição
        </button>
      </div>
    </div>
  );
}

function ProtocoloLista() {
  const protocolos = [
    { cod: "PAD-METAB-PÓS", nome: "Protocolo Pádua METAB-PÓS — Síndrome metabólica pós-menopausa", duracao: "90 dias", itens: 7, match: 87 },
    { cod: "PAD-DETOX-3M", nome: "Protocolo Pádua DETOX 3 Meses — Hepático + Intestinal", duracao: "90 dias", itens: 9, match: 64 },
    { cod: "PAD-SONO-RESTR", nome: "Protocolo Pádua SONO Restaurador — Cortisol + Melatonina", duracao: "60 dias", itens: 5, match: 78 },
    { cod: "PAD-IMUNO-INV", nome: "Protocolo Pádua IMUNO Inverno — Antiviral preventivo", duracao: "45 dias", itens: 6, match: 41 },
    { cod: "PAD-ANSI-LEVE", nome: "Protocolo Pádua ANSI Leve — Ansiedade situacional", duracao: "30 dias", itens: 4, match: 52 },
  ];
  return (
    <div className="flex-1 overflow-auto px-6 py-5">
      <p style={{ fontSize: 12, color: tk.inkMuted, marginBottom: 16, lineHeight: 1.5 }}>
        Protocolos pré-montados pela equipe médica do Instituto. O match é calculado pelo motor
        cruzando o perfil clínico da paciente com a indicação canônica de cada protocolo.
      </p>
      <div className="flex flex-col gap-2">
        {protocolos.map((p) => {
          const matchCor = p.match >= 70 ? tk.ok : p.match >= 50 ? tk.warn : tk.inkSubtle;
          return (
            <div
              key={p.cod}
              className="flex items-center gap-4 px-4 py-3"
              style={{ background: tk.bg, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${matchCor}` }}
            >
              <div className="flex-1">
                <div style={{ fontSize: 13, fontWeight: 600, color: tk.ink }}>{p.nome}</div>
                <div className="flex items-center gap-3 mt-1" style={{ fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono }}>
                  <span>{p.cod}</span>
                  <span>·</span>
                  <span>{p.duracao}</span>
                  <span>·</span>
                  <span>{p.itens} itens terapêuticos</span>
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: tk.mono, fontSize: 18, fontWeight: 700, color: matchCor }}>
                  {p.match}%
                </div>
                <div style={{ fontSize: 9, color: tk.inkSubtle, letterSpacing: 0.8 }} className="uppercase">
                  match
                </div>
              </div>
              <button
                className="px-3 py-2 flex items-center gap-1.5"
                style={{ background: tk.accent, color: tk.bg, fontSize: 11, fontWeight: 600 }}
              >
                <Plus size={12} /> Aplicar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrescCard({
  tipo,
  titulo,
  composicao,
  posologia,
  duracao,
  farmacia,
}: {
  tipo: string;
  titulo: string;
  composicao: string[];
  posologia: string;
  duracao: string;
  farmacia: string;
}) {
  return (
    <div style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 16 }}>
      <div style={{ fontSize: 9, letterSpacing: 1.4, color: tk.accent, fontFamily: tk.mono }}>{tipo}</div>
      <h4 style={{ fontSize: 15, fontWeight: 600, color: tk.ink, marginTop: 4 }}>{titulo}</h4>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, color: tk.inkMuted, letterSpacing: 0.8, marginBottom: 4 }} className="uppercase">
          Composição
        </div>
        <ul style={{ fontSize: 12, color: tk.ink, lineHeight: 1.7 }}>
          {composicao.map((c) => (
            <li key={c} className="flex gap-2">
              <span style={{ color: tk.inkSubtle }}>›</span>
              <span style={{ fontFamily: tk.mono }}>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-2 mt-3 pt-3" style={{ borderTop: `1px dashed ${tk.border}` }}>
        <KV k="Posologia" v={posologia} />
        <KV k="Duração" v={duracao} />
        <KV k="Aviamento" v={farmacia} />
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-3">
      <span style={{ fontSize: 10, color: tk.inkSubtle, letterSpacing: 0.6, width: 80, flexShrink: 0, paddingTop: 2 }} className="uppercase">
        {k}
      </span>
      <span style={{ fontSize: 12, color: tk.ink, lineHeight: 1.5 }}>{v}</span>
    </div>
  );
}

function CompatBanner() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ background: tk.bg, border: `1px solid ${tk.ok}`, borderLeft: `3px solid ${tk.ok}` }}
    >
      <ShieldCheck size={18} style={{ color: tk.ok }} />
      <div className="flex-1">
        <div style={{ fontSize: 12, color: tk.ink, fontWeight: 600 }}>
          Compatibilidade validada · 0 interações relevantes
        </div>
        <div style={{ fontSize: 11, color: tk.inkMuted, marginTop: 2 }}>
          Motor cruzou 7 itens prescritos × 3 medicações em uso × 3 alergias documentadas. Bloqueio
          ativo de AINEs e penicilinas mantido.
        </div>
      </div>
      <button style={{ fontSize: 11, color: tk.accent, fontFamily: tk.mono }}>VER LOG →</button>
    </div>
  );
}

// ============================================================================
// TAB: PEDIDOS (exames)
// ============================================================================
function PedidosTab() {
  const exames = [
    { sigla: "COR-4X", nome: "Cortisol salivar 4 amostras", urgencia: "Rotina", lab: "DASA" },
    { sigla: "TSH+T4L", nome: "TSH + T4 livre + Anti-TPO", urgencia: "Rotina", lab: "DASA" },
    { sigla: "HOMA-IR", nome: "Insulina jejum + Glicemia + HOMA-IR", urgencia: "Rotina", lab: "DASA" },
    { sigla: "PCR-US", nome: "Proteína C-Reativa ultra-sensível", urgencia: "Rotina", lab: "DASA" },
    { sigla: "HORM-F", nome: "Painel hormonal feminino completo", urgencia: "Rotina", lab: "Fleury" },
  ];
  return (
    <div className="p-6 space-y-5">
      <PageHeader
        eyebrow="PEDIDOS DE EXAMES"
        title="Solicitação de complementares"
        meta="5 exames · 2 laboratórios · jejum requerido"
      />

      <div style={{ background: tk.bgAlt, border: `1px solid ${tk.border}` }}>
        <div
          className="grid grid-cols-[80px_1fr_120px_140px_80px] gap-3 px-4 py-2.5"
          style={{ background: tk.bg, borderBottom: `1px solid ${tk.border}`, fontSize: 10, color: tk.inkSubtle, letterSpacing: 0.8 }}
        >
          <span className="uppercase">Sigla</span>
          <span className="uppercase">Exame</span>
          <span className="uppercase">Urgência</span>
          <span className="uppercase">Laboratório</span>
          <span className="uppercase text-right">Ações</span>
        </div>
        {exames.map((e) => (
          <div
            key={e.sigla}
            className="grid grid-cols-[80px_1fr_120px_140px_80px] gap-3 px-4 py-3 items-center"
            style={{ borderBottom: `1px solid ${tk.border}` }}
          >
            <span style={{ fontFamily: tk.mono, fontSize: 11, color: tk.accent }}>{e.sigla}</span>
            <span style={{ fontSize: 13, color: tk.ink }}>{e.nome}</span>
            <span
              style={{
                fontSize: 10,
                fontFamily: tk.mono,
                padding: "2px 8px",
                width: "fit-content",
                background: tk.bg,
                color: tk.ok,
                border: `1px solid ${tk.ok}`,
              }}
            >
              {e.urgencia.toUpperCase()}
            </span>
            <span style={{ fontSize: 12, color: tk.inkMuted }}>{e.lab}</span>
            <div className="flex justify-end gap-2">
              <button title="Editar" style={{ color: tk.inkMuted }}>
                <FileText size={14} />
              </button>
              <button title="Imprimir" style={{ color: tk.inkMuted }}>
                <Printer size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatBlock icon={Droplet} label="Jejum requerido" value="12 horas" />
        <StatBlock icon={Beaker} label="Volume de coleta" value="≈ 18 mL" />
        <StatBlock icon={CalendarDays} label="Validade do pedido" value="60 dias" />
      </div>
    </div>
  );
}

function StatBlock({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 16 }}>
      <div className="flex items-center gap-2" style={{ color: tk.inkMuted, fontSize: 10, letterSpacing: 0.8 }}>
        <Icon size={11} />
        <span className="uppercase">{label}</span>
      </div>
      <div style={{ fontFamily: tk.mono, fontSize: 18, color: tk.ink, fontWeight: 600, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: DIETA
// ============================================================================
function DietaTab() {
  const refeicoes = [
    { cod: "B1", titulo: "Café da manhã (07h00)", itens: ["2 ovos mexidos no azeite", "1 fatia de pão integral", "1 colher de pasta de amendoim", "Chá verde sem açúcar"] },
    { cod: "B2", titulo: "Lanche da manhã (10h30)", itens: ["1 maçã com casca", "10 castanhas-do-pará"] },
    { cod: "B3", titulo: "Almoço (13h00)", itens: ["Salada verde à vontade + azeite", "Filé de frango grelhado 120g", "½ xícara de arroz integral", "Brócolis no vapor"] },
    { cod: "B4", titulo: "Lanche da tarde (16h30)", itens: ["Iogurte natural integral 170g", "1 colher de chia + canela"] },
    { cod: "SEQ", titulo: "Jantar (19h30)", itens: ["Sopa de legumes com proteína (frango ou peixe)", "Salada de folhas + abacate", "Chá de camomila"] },
  ];
  return (
    <div className="p-6 space-y-5">
      <PageHeader
        eyebrow="PLANO ALIMENTAR · COBERTURA SEMÂNTICA 100%"
        title="Dieta personalizada — formato B1-B4 SEQ"
        meta="≈ 1.620 kcal · 95g proteína · low-carb moderado · sem glúten"
      />

      <div className="grid grid-cols-1 gap-3">
        {refeicoes.map((r) => (
          <div
            key={r.cod}
            className="grid grid-cols-[60px_1fr] gap-4 px-4 py-4"
            style={{ background: tk.bgAlt, border: `1px solid ${tk.border}` }}
          >
            <div
              className="grid place-items-center"
              style={{
                background: tk.bg,
                border: `1px solid ${tk.accent}`,
                color: tk.accent,
                fontFamily: tk.mono,
                fontWeight: 700,
                fontSize: 14,
                height: 48,
              }}
            >
              {r.cod}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: tk.ink }}>{r.titulo}</div>
              <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
                {r.itens.map((it) => (
                  <li key={it} className="flex items-center gap-2" style={{ fontSize: 12, color: tk.inkMuted }}>
                    <span style={{ color: tk.accent }}>•</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: EMITIR (RACJ + ZapSign + Galena + WhatsApp)
// ============================================================================
function EmitirTab() {
  const passos = [
    { n: 1, titulo: "Gerar RAS V8 (PDF oficial)", desc: "11 cadernos · hash SHA-256 · cabeçalho institucional", done: true },
    { n: 2, titulo: "Gerar Prescrição (Manifesto Blueprint v2.0)", desc: "Dual-mode · 4 itens · roteamento Galena Manipulação", done: true },
    { n: 3, titulo: "Gerar Pedidos de exames", desc: "5 exames · 2 laboratórios · validade 60 dias", done: true },
    { n: 4, titulo: "Consolidar RACJ presencial", desc: "9 termos jurídicos · LGPD + 6 consentimentos específicos", done: true },
    { n: 5, titulo: "Criar envelope ZapSign (ICP-Brasil)", desc: "Solicitação #258 · 4 documentos · validade 7 dias", done: false, current: true },
    { n: 6, titulo: "Enviar link de assinatura por WhatsApp", desc: "(22) 99814-6633 · Twilio + Gupshup", done: false },
    { n: 7, titulo: "Arquivar no Google Drive estruturado", desc: "/Pacientes/PAD-2026-3497/2026-05-19/", done: false },
  ];

  return (
    <div className="p-6 grid grid-cols-[1fr_440px] gap-6">
      <div>
        <PageHeader
          eyebrow="FLUXO DE EMISSÃO · RASX-MATRIZ V6"
          title="Emitir e assinar documentos"
          meta="7 passos · estimativa: 38 segundos"
        />

        <div className="mt-5 flex flex-col">
          {passos.map((p, i) => (
            <div
              key={p.n}
              className="flex gap-4 px-4 py-4"
              style={{
                background: p.current ? tk.bgSoft : tk.bgAlt,
                border: `1px solid ${p.current ? tk.accent : tk.border}`,
                borderTop: i === 0 ? `1px solid ${p.current ? tk.accent : tk.border}` : "none",
              }}
            >
              <div
                className="grid place-items-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  background: p.done ? tk.ok : p.current ? tk.accent : tk.bg,
                  color: p.done || p.current ? tk.bg : tk.inkSubtle,
                  border: p.done || p.current ? "none" : `1px solid ${tk.border}`,
                  fontFamily: tk.mono,
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {p.done ? <Check size={14} /> : p.n}
              </div>
              <div className="flex-1">
                <div style={{ fontSize: 13, fontWeight: 600, color: tk.ink }}>{p.titulo}</div>
                <div style={{ fontSize: 11, color: tk.inkMuted, marginTop: 3 }}>{p.desc}</div>
              </div>
              {p.current && (
                <button
                  className="px-4 py-2 self-center flex items-center gap-2"
                  style={{ background: tk.accent, color: tk.bg, fontSize: 12, fontWeight: 600 }}
                >
                  Executar agora <ChevronRight size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <ZapSignPanel />
    </div>
  );
}

function ZapSignPanel() {
  return (
    <div className="self-start" style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, padding: 18 }}>
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert size={14} style={{ color: tk.warn }} />
        <span style={{ fontSize: 10, letterSpacing: 1.5, color: tk.warn, fontFamily: tk.mono }} className="uppercase">
          AGUARDA AÇÃO MÉDICA
        </span>
      </div>
      <h4 style={{ fontSize: 16, fontWeight: 600, color: tk.ink, marginTop: 4 }}>
        Envelope ZapSign · Solicitação #258
      </h4>
      <div style={{ fontSize: 11, color: tk.inkSubtle, fontFamily: tk.mono, marginTop: 2 }}>
        ICP-BRASIL · A1 · validade 7 dias
      </div>

      <div className="mt-4 space-y-2">
        <DocCheck nome="RAS V8 — Sessão 39" size="67,5 KB" />
        <DocCheck nome="Prescrição Manipulada (Galena)" size="22,1 KB" />
        <DocCheck nome="Pedidos de Exames" size="14,8 KB" />
        <DocCheck nome="RACJ presencial consolidado" size="89,2 KB" />
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${tk.border}` }}>
        <div style={{ fontSize: 10, color: tk.inkMuted, letterSpacing: 0.8 }} className="uppercase">
          Destinatária
        </div>
        <div style={{ fontSize: 13, color: tk.ink, marginTop: 4 }}>Carlúcia Mendes do Vale</div>
        <div style={{ fontSize: 11, color: tk.inkMuted, fontFamily: tk.mono, marginTop: 2 }}>
          {paciente.telefone} · {paciente.email}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          className="px-3 py-2.5 flex items-center justify-center gap-2"
          style={{ background: tk.bg, color: tk.ink, border: `1px solid ${tk.border}`, fontSize: 12 }}
        >
          <Eye size={13} /> Pré-visualizar
        </button>
        <button
          className="px-3 py-2.5 flex items-center justify-center gap-2"
          style={{ background: tk.accent, color: tk.bg, fontSize: 12, fontWeight: 600 }}
        >
          <Send size={13} /> Enviar agora
        </button>
      </div>

      <p style={{ fontSize: 10, color: tk.inkSubtle, marginTop: 10, lineHeight: 1.5 }}>
        Cão-de-guarda webhook V256 ativo · worker 60min detecta queda silenciosa e alerta CEO via
        Telegram.
      </p>
    </div>
  );
}

function DocCheck({ nome, size }: { nome: string; size: string }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2"
      style={{ background: tk.bg, border: `1px solid ${tk.border}` }}
    >
      <FileText size={14} style={{ color: tk.accent }} />
      <span style={{ fontSize: 12, color: tk.ink, flex: 1 }}>{nome}</span>
      <span style={{ fontSize: 10, color: tk.inkSubtle, fontFamily: tk.mono }}>{size}</span>
      <Check size={13} style={{ color: tk.ok }} />
    </div>
  );
}

// ============================================================================
// BOTTOM STATUS BAR
// ============================================================================
function BottomStatus() {
  return (
    <footer
      className="px-6 py-2 flex items-center justify-between border-t"
      style={{ borderColor: tk.border, background: tk.bgAlt, fontFamily: tk.mono, fontSize: 10, color: tk.inkSubtle }}
    >
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <CircleDot size={9} style={{ color: tk.ok }} /> CONECTADO · POSTGRES OK
        </span>
        <span>Migration 072 · V13 → V4 ponte ativa</span>
        <span>Latência API: 38ms</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Logado: Dra. Renata C. Albuquerque (perfil: medico_tecnico)</span>
        <span>UTC-3 · 07:42:18</span>
      </div>
    </footer>
  );
}

export default CockpitMedicoV1;
