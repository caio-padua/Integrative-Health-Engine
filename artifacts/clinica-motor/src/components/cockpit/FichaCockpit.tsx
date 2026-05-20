import { useState } from "react";
import { tk } from "./_tokens";
import { GpsPadua } from "./GpsPadua";

export type PacienteCockpit = {
  id: number | string;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  dataNascimento?: string | null;
  idade?: number;
  iniciais?: string;
  planoAcompanhamento?: string | null;
  sessaoAtual?: string;
  revo?: boolean;
  alergias?: string | null;
  genero?: string | null;
  unidadeNome?: string | null;
};

function calcIdade(dt?: string | null): number | undefined {
  if (!dt) return;
  const d = new Date(dt);
  if (isNaN(d.getTime())) return;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "??";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const GENEROS = ["Masculino", "Feminino", "Não-binário", "Prefere não informar"] as const;
const ESTADO_CIVIL = ["Solteiro", "Casado", "Divorciado", "Viúvo", "União estável"] as const;
const PROFISSAO = ["Médico", "Empresário", "Executivo", "Aposentado", "Autônomo", "Outro"] as const;
const TIPO_SANGUINEO = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Desconhecido"] as const;
const ALERGIA_COMUM = ["Penicilina", "Dipirona", "AAS", "Iodo", "Látex", "Frutos do mar", "Lactose", "Glúten", "Nenhuma conhecida"] as const;
const COMORBIDADE = ["Hipertensão", "Diabetes Tipo 2", "Dislipidemia", "Hipotireoidismo", "Ansiedade", "Insônia crônica", "Refluxo", "Apnéia do sono", "Nenhuma"] as const;
const VINCULO = ["Plano Família", "Indicação CEO", "Captação digital", "Padrinho médico", "Orgânico"] as const;
const ESTAGIO_FUNIL = ["Lead frio", "Lead morno", "Lead quente", "Em anamnese", "Ativo em protocolo", "Em follow-up", "Inativo 90d", "Recuperação"] as const;

type Aberto = "DADOS" | "ANAMNESE" | "RECEITAS" | "HISTORICO" | "FOLLOWUP" | "AGENDA" | "FINANCEIRO";
const SECOES: { id: Aberto; sigla: string; titulo: string; cor: string }[] = [
  { id: "DADOS",      sigla: "DOC", titulo: "Identidade & Vínculo",         cor: tk.via.SC.dot },
  { id: "ANAMNESE",   sigla: "ANM", titulo: "Anamnese & Sinais",            cor: tk.via.EV.dot },
  { id: "RECEITAS",   sigla: "RX",  titulo: "Prescrição & Protocolo",       cor: tk.via.IM.dot },
  { id: "HISTORICO",  sigla: "HX",  titulo: "Histórico Sessões",            cor: tk.via.VO.dot },
  { id: "FOLLOWUP",   sigla: "FUP", titulo: "Follow-up & Aderência",        cor: tk.via.IMP.dot },
  { id: "AGENDA",     sigla: "AG",  titulo: "Agenda & Próximas",            cor: tk.via.PRC.dot },
  { id: "FINANCEIRO", sigla: "FIN", titulo: "Financeiro & Assinaturas",     cor: tk.accent },
];

const sx = (...s: React.CSSProperties[]) => Object.assign({}, ...s);
const labelMono: React.CSSProperties = { fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5, display: "block", marginBottom: 3 };
const fieldBase: React.CSSProperties = { background: tk.bg, color: tk.ink, border: `1px solid ${tk.border}`, padding: "6px 8px", fontFamily: tk.mono, fontSize: 11, outline: "none", width: "100%", boxSizing: "border-box" };

function Sec({ id, children, defaultOpen = true }: { id: Aberto; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = SECOES.find(s => s.id === id)!;
  return (
    <section style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${meta.cor}` }}>
      <header
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: open ? `1px solid ${tk.border}` : "none", background: tk.bgSoft, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: tk.mono, fontSize: 10, fontWeight: 700, color: meta.cor, padding: "2px 6px", background: tk.bg, border: `1px solid ${meta.cor}`, letterSpacing: 1.5 }}>{meta.sigla}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: tk.ink }}>{meta.titulo}</span>
        </div>
        <span style={{ fontFamily: tk.mono, fontSize: 12, color: tk.inkMuted }}>{open ? "▾" : "▸"}</span>
      </header>
      {open && <div style={{ padding: 14 }}>{children}</div>}
    </section>
  );
}

function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <label style={{ gridColumn: `span ${span}` }}>
      <span style={labelMono}>{label}</span>
      {children}
    </label>
  );
}

function Pill({ children, cor = tk.accent }: { children: React.ReactNode; cor?: string }) {
  return (
    <span style={{ fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: cor, padding: "2px 6px", background: tk.bg, border: `1px solid ${cor}`, letterSpacing: 1 }}>
      {children}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────
// 1. HEADER PACIENTE EXPANDIDO
// ────────────────────────────────────────────────────────────────────

function HeaderPaciente({ p }: { p: PacienteCockpit }) {
  const idade = p.idade ?? calcIdade(p.dataNascimento);
  const iniciais = p.iniciais ?? iniciaisDe(p.nome);
  const plano = (p.planoAcompanhamento || "—").toUpperCase();
  return (
    <header style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, borderLeft: `3px solid ${tk.accent}`, padding: 14, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }}>
      {/* avatar + nome */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 56, height: 56, background: tk.bg, color: tk.accent, fontFamily: tk.mono, fontSize: 20, fontWeight: 700, display: "grid", placeItems: "center", border: `1px solid ${tk.accent}`, boxShadow: `0 0 12px ${tk.accentGlow}` }}>
          {iniciais}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: tk.ink }}>{p.nome}</div>
          <div style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted, marginTop: 2 }}>
            ID {p.id}{idade ? ` · ${idade}a` : ""}{p.cpf ? ` · CPF ${p.cpf}` : ""}{p.telefone ? ` · ${p.telefone}` : ""}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
            <Pill cor={tk.warn}>PLANO {plano}</Pill>
            {p.sessaoAtual && <Pill cor={tk.ok}>SESSÃO {p.sessaoAtual}</Pill>}
            <Pill cor={tk.accent}>ATIVO</Pill>
            <Pill cor={tk.via.VO.dot}>REVO {p.revo ? "ON" : "OFF"}</Pill>
            {p.alergias && <Pill cor={tk.danger}>ALERGIA: {p.alergias.toUpperCase().slice(0, 24)}</Pill>}
          </div>
        </div>
      </div>

      {/* navegador rápido entre seções (atalhos visíveis) */}
      <nav style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {SECOES.map(s => (
          <a key={s.id} href={`#sec-${s.id}`} style={{
            fontFamily: tk.mono, fontSize: 9, fontWeight: 700, color: s.cor, padding: "5px 9px",
            background: tk.bg, border: `1px solid ${s.cor}`, letterSpacing: 1.2, textDecoration: "none",
          }}>{s.sigla} {s.titulo.split(" ")[0].toUpperCase()}</a>
        ))}
      </nav>

      {/* KPIs cabeça */}
      <div style={{ display: "flex", gap: 10 }}>
        {[
          { lbl: "LTV",      val: "R$ 18.420", cor: tk.accent },
          { lbl: "ADERÊNCIA",val: "92%",       cor: tk.ok },
          { lbl: "NPS",      val: "9.4",       cor: tk.via.VO.dot },
          { lbl: "RISCO",    val: "BAIXO",     cor: tk.ok },
        ].map(k => (
          <div key={k.lbl} style={{ background: tk.bg, padding: "7px 10px", borderLeft: `3px solid ${k.cor}`, minWidth: 70 }}>
            <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>{k.lbl}</div>
            <div style={{ fontFamily: tk.mono, fontSize: 13, fontWeight: 700, color: k.cor, marginTop: 1 }}>{k.val}</div>
          </div>
        ))}
      </div>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────────
// 2. SEÇÃO DADOS — selects em tudo
// ────────────────────────────────────────────────────────────────────

function SecaoDados({ p }: { p: PacienteCockpit }) {
  const generoMap: Record<string, string> = { masculino: "Masculino", feminino: "Feminino", outro: "Não-binário", nao_informado: "Prefere não informar" };
  const generoUi = p.genero ? (generoMap[p.genero] ?? "Prefere não informar") : "Prefere não informar";
  const alergiasArr = (p.alergias || "").split(/[,;]/).map(a => a.trim()).filter(Boolean);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
      <Field label="NOME COMPLETO" span={3}>
        <input style={fieldBase} defaultValue={p.nome} />
      </Field>
      <Field label="DATA NASC.">
        <input type="date" style={fieldBase} defaultValue={p.dataNascimento?.slice(0, 10) ?? ""} />
      </Field>
      <Field label="GÊNERO">
        <select style={fieldBase} defaultValue={generoUi}>
          {GENEROS.map(g => <option key={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="ESTADO CIVIL">
        <select style={fieldBase} defaultValue="Solteiro">
          {ESTADO_CIVIL.map(g => <option key={g}>{g}</option>)}
        </select>
      </Field>

      <Field label="CPF">
        <input style={fieldBase} defaultValue={p.cpf ?? ""} />
      </Field>
      <Field label="TELEFONE">
        <input style={fieldBase} defaultValue={p.telefone ?? ""} />
      </Field>
      <Field label="EMAIL" span={2}>
        <input style={fieldBase} defaultValue={p.email ?? ""} />
      </Field>
      <Field label="PROFISSÃO">
        <select style={fieldBase} defaultValue="Outro">
          {PROFISSAO.map(g => <option key={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="TIPO SANGUÍNEO">
        <select style={fieldBase} defaultValue="Desconhecido">
          {TIPO_SANGUINEO.map(g => <option key={g}>{g}</option>)}
        </select>
      </Field>

      <Field label="VÍNCULO DE ENTRADA" span={2}>
        <select style={fieldBase} defaultValue="Orgânico">
          {VINCULO.map(g => <option key={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="ESTÁGIO FUNIL" span={2}>
        <select style={fieldBase} defaultValue="Ativo em protocolo">
          {ESTAGIO_FUNIL.map(g => <option key={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="UNIDADE PRINCIPAL" span={2}>
        <select style={fieldBase} defaultValue={p.unidadeNome ?? "Pádua Matriz"}>
          <option>{p.unidadeNome ?? "Pádua Matriz"}</option>
        </select>
      </Field>

      <Field label="ALERGIAS (multi)" span={3}>
        <select style={fieldBase} multiple defaultValue={alergiasArr.length ? alergiasArr : ["Nenhuma conhecida"]} size={3}>
          {Array.from(new Set([...ALERGIA_COMUM, ...alergiasArr])).map(g => <option key={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="COMORBIDADES (multi)" span={3}>
        <select style={fieldBase} multiple defaultValue={["Nenhuma"]} size={3}>
          {COMORBIDADE.map(g => <option key={g}>{g}</option>)}
        </select>
      </Field>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 3. SEÇÃO ANAMNESE — resumo + sinais
// ────────────────────────────────────────────────────────────────────

const ANAMNESE_BLOCOS = [
  { titulo: "Queixa principal", texto: "Cansaço crônico há 6 meses + libido reduzida + insônia de manutenção" },
  { titulo: "História atual",   texto: "Quadro insidioso, progressivo. Estresse laboral alto (CEO). Sono não-restaurador. Apetite preservado, peso estável." },
  { titulo: "Hábitos",          texto: "Atividade física 3×/sem (musculação). Álcool social. Não fuma. 6-7h sono/noite." },
  { titulo: "Exames recentes",  texto: "Vit D 18 ng (baixa) · B12 520 pg (ok) · Cortisol 8h 12 mcg (baixo) · Testosterona total 380 ng (limite inferior)" },
];

function SecaoAnamnese() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ANAMNESE_BLOCOS.map(b => (
          <div key={b.titulo} style={{ background: tk.bg, padding: "8px 12px", borderLeft: `2px solid ${tk.via.EV.dot}` }}>
            <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>{b.titulo.toUpperCase()}</div>
            <div style={{ fontSize: 12, color: tk.ink, marginTop: 3, lineHeight: 1.45 }}>{b.texto}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5 }}>SCORES SEMÂNTICOS</div>
        {[
          { lbl: "FADIGA",         val: 7, max: 10, cor: tk.warn },
          { lbl: "SONO",           val: 4, max: 10, cor: tk.danger },
          { lbl: "LIBIDO",         val: 3, max: 10, cor: tk.danger },
          { lbl: "HUMOR",          val: 6, max: 10, cor: tk.warn },
          { lbl: "DISPOSIÇÃO AM",  val: 5, max: 10, cor: tk.warn },
          { lbl: "FOCO COGNITIVO", val: 6, max: 10, cor: tk.warn },
        ].map(s => (
          <div key={s.lbl}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: tk.mono, fontSize: 9, color: tk.ink, letterSpacing: 1 }}>{s.lbl}</span>
              <span style={{ fontFamily: tk.mono, fontSize: 10, color: s.cor, fontWeight: 700 }}>{s.val}/{s.max}</span>
            </div>
            <div style={{ height: 6, background: tk.bgSoft, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, width: `${(s.val / s.max) * 100}%`, background: s.cor, boxShadow: `0 0 6px ${s.cor}` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 4. SEÇÃO HISTÓRICO — timeline sessões anteriores
// ────────────────────────────────────────────────────────────────────

const SESSOES_PASSADAS = [
  { n: "S01", data: "12/jan/2026", status: "ok",      itens: 4, valor: 1480, obs: "Sem intercorrências · acesso EV bom" },
  { n: "S02", data: "26/jan/2026", status: "ok",      itens: 4, valor: 1480, obs: "Paciente relatou melhora libido +2pt" },
  { n: "S03", data: "09/fev/2026", status: "atual",   itens: 5, valor: 1820, obs: "Hoje · adicionado CoQ10 IM (cansaço)" },
  { n: "S04", data: "23/fev/2026", status: "futura",  itens: 5, valor: 1820, obs: "Agendada · 14h30" },
  { n: "S05", data: "09/mar/2026", status: "futura",  itens: 5, valor: 1820, obs: "Sugerida · validar exames antes" },
];

function SecaoHistorico() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "grid", gridTemplateColumns: "60px 100px 60px 60px 100px 1fr", gap: 8, padding: "6px 10px", background: tk.bgSoft, fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>
        <span>SESSÃO</span><span>DATA</span><span>ITENS</span><span>STATUS</span><span style={{ textAlign: "right" }}>VALOR</span><span>OBSERVAÇÃO</span>
      </div>
      {SESSOES_PASSADAS.map(s => {
        const cor = s.status === "atual" ? tk.accent : s.status === "ok" ? tk.ok : tk.inkMuted;
        return (
          <div key={s.n} style={{ display: "grid", gridTemplateColumns: "60px 100px 60px 60px 100px 1fr", gap: 8, padding: "8px 10px", background: tk.bg, borderLeft: `3px solid ${cor}`, alignItems: "center" }}>
            <span style={{ fontFamily: tk.mono, fontSize: 12, fontWeight: 700, color: cor }}>{s.n}</span>
            <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.ink }}>{s.data}</span>
            <span style={{ fontFamily: tk.mono, fontSize: 11, color: tk.ink }}>{s.itens}</span>
            <Pill cor={cor}>{s.status === "atual" ? "ATIVA" : s.status === "ok" ? "✓ OK" : "AGEND"}</Pill>
            <span style={{ fontFamily: tk.mono, fontSize: 11, color: cor, fontWeight: 700, textAlign: "right" }}>R$ {s.valor.toLocaleString("pt-BR")}</span>
            <span style={{ fontSize: 11, color: tk.inkMuted }}>{s.obs}</span>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 5. SEÇÃO FOLLOW-UP
// ────────────────────────────────────────────────────────────────────

const FOLLOWUPS = [
  { quando: "+ 24h",   canal: "WhatsApp",  acao: "Confirmar reação ao NAD+ EV",       resp: "Beatriz" },
  { quando: "+ 7d",    canal: "WhatsApp",  acao: "Score libido/disposição (form A)",  resp: "Sistema" },
  { quando: "+ 14d",   canal: "Email",     acao: "Envio de relatório semanal RAS",    resp: "Sistema" },
  { quando: "+ 30d",   canal: "Telefone",  acao: "Reavaliação clínica (15min)",       resp: "Dr. Caio" },
];

function SecaoFollowup() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {FOLLOWUPS.map((f, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 100px 1fr 100px", gap: 10, padding: "8px 10px", background: tk.bg, borderLeft: `3px solid ${tk.via.IMP.dot}`, alignItems: "center" }}>
            <span style={{ fontFamily: tk.mono, fontSize: 11, color: tk.via.IMP.dot, fontWeight: 700 }}>{f.quando}</span>
            <select defaultValue={f.canal} style={sx(fieldBase, { padding: "3px 6px" })}>
              <option>WhatsApp</option><option>Email</option><option>Telefone</option><option>SMS</option>
            </select>
            <span style={{ fontSize: 11, color: tk.ink }}>{f.acao}</span>
            <select defaultValue={f.resp} style={sx(fieldBase, { padding: "3px 6px" })}>
              <option>Sistema</option><option>Beatriz</option><option>Dr. Caio</option><option>Recepção</option>
            </select>
          </div>
        ))}
      </div>

      <div style={{ background: tk.bg, padding: 12, borderLeft: `2px solid ${tk.via.IMP.dot}` }}>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle, letterSpacing: 1.5, marginBottom: 8 }}>RÉGUA ADERÊNCIA · ÚLT. 30d</div>
        <div style={{ display: "flex", gap: 2 }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const cor = i < 25 ? tk.ok : i < 28 ? tk.warn : tk.danger;
            return <span key={i} style={{ flex: 1, height: 24, background: cor, opacity: 0.85 }} />;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: tk.mono, fontSize: 9, color: tk.inkSubtle }}>
          <span>-30d</span><span style={{ color: tk.ok, fontWeight: 700 }}>92% · 28/30</span><span>hoje</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// 6. SEÇÃO AGENDA & FINANCEIRO (compactos lado a lado)
// ────────────────────────────────────────────────────────────────────

function SecaoAgenda() {
  const proximas = [
    { dt: "23/fev · 14h30", tipo: "Sessão S04", local: "Pádua Matriz · Sala 2", prof: "Beatriz" },
    { dt: "09/mar · 14h30", tipo: "Sessão S05", local: "Pádua Matriz · Sala 2", prof: "Beatriz" },
    { dt: "16/mar · 16h00", tipo: "Reavaliação", local: "Pádua Matriz · Sala Dr. Caio", prof: "Dr. Caio" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {proximas.map((p, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 100px 1fr 80px", gap: 10, padding: "8px 10px", background: tk.bg, borderLeft: `3px solid ${tk.via.PRC.dot}`, alignItems: "center" }}>
          <span style={{ fontFamily: tk.mono, fontSize: 11, color: tk.via.PRC.dot, fontWeight: 700 }}>{p.dt}</span>
          <Pill cor={tk.accent}>{p.tipo}</Pill>
          <span style={{ fontSize: 11, color: tk.ink }}>{p.local}</span>
          <span style={{ fontFamily: tk.mono, fontSize: 10, color: tk.inkMuted, textAlign: "right" }}>{p.prof}</span>
        </div>
      ))}
    </div>
  );
}

function SecaoFinanceiro() {
  const lin = [
    { lbl: "Protocolo S03 · NAD+ EV",  status: "PAGO",     cor: tk.ok,     v: 1820 },
    { lbl: "Mensalidade fev/2026",      status: "PAGO",     cor: tk.ok,     v: 480 },
    { lbl: "Implante GST-T (futuro)",   status: "ORÇADO",   cor: tk.warn,   v: 1280 },
    { lbl: "Botox · sessão final",      status: "PENDENTE", cor: tk.danger, v: 1500 },
  ];
  const total = lin.reduce((a, l) => a + l.v, 0);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {lin.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px", gap: 10, padding: "8px 10px", background: tk.bg, borderLeft: `3px solid ${l.cor}`, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: tk.ink }}>{l.lbl}</span>
            <Pill cor={l.cor}>{l.status}</Pill>
            <span style={{ fontFamily: tk.mono, fontSize: 11, fontWeight: 700, color: l.cor, textAlign: "right" }}>R$ {l.v.toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
      <div style={{ background: tk.bg, padding: 12, borderLeft: `2px solid ${tk.accent}` }}>
        <div style={{ fontFamily: tk.mono, fontSize: 8, color: tk.inkSubtle, letterSpacing: 1.5 }}>TOTAL CICLO</div>
        <div style={{ fontFamily: tk.mono, fontSize: 22, color: tk.accent, fontWeight: 700, marginTop: 4 }}>
          R$ {total.toLocaleString("pt-BR")}
        </div>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 4 }}>
          LTV acumulado · R$ 18.420
        </div>
        <div style={{ fontFamily: tk.mono, fontSize: 9, color: tk.inkMuted, marginTop: 2 }}>
          ticket médio · R$ 1.275 / sessão
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// PAGINA COMPLETA
// ────────────────────────────────────────────────────────────────────

export function FichaCockpit({ paciente }: { paciente: PacienteCockpit }) {
  return (
    <div style={{ minHeight: "100vh", background: tk.bg, color: tk.ink, fontFamily: tk.sans, padding: 14, display: "flex", flexDirection: "column", gap: 12, fontSize: 11 }}>
      <HeaderPaciente p={paciente} />

      <div id="sec-DADOS"><Sec id="DADOS"><SecaoDados p={paciente} /></Sec></div>
      <div id="sec-ANAMNESE"><Sec id="ANAMNESE"><SecaoAnamnese /></Sec></div>

      <div id="sec-RECEITAS">
        <Sec id="RECEITAS">
          <GpsPadua embutido />
        </Sec>
      </div>

      <div id="sec-HISTORICO"><Sec id="HISTORICO"><SecaoHistorico /></Sec></div>
      <div id="sec-FOLLOWUP"><Sec id="FOLLOWUP"><SecaoFollowup /></Sec></div>
      <div id="sec-AGENDA"><Sec id="AGENDA"><SecaoAgenda /></Sec></div>
      <div id="sec-FINANCEIRO"><Sec id="FINANCEIRO"><SecaoFinanceiro /></Sec></div>
    </div>
  );
}
