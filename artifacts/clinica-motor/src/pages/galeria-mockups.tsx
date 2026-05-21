import { useMemo, useState } from "react";

type Mockup = {
  slug: string;
  nome: string;
  grupo: string;
  altura: number;
};

const MOCKUPS: Mockup[] = [
  { slug: "GoogleCalendarDemo", nome: "Google Calendar · Demo", grupo: "INTEGRAÇÕES", altura: 900 },
  { slug: "PdfJustificativa", nome: "PDF · Justificativa (textos reais)", grupo: "PDFs", altura: 1100 },
  { slug: "PdfSolicitacao", nome: "PDF · Solicitação de Exames", grupo: "PDFs", altura: 1100 },
  { slug: "PdfVarianteA", nome: "PDF · Variante A", grupo: "PDFs", altura: 1000 },
  { slug: "PdfVarianteB", nome: "PDF · Variante B", grupo: "PDFs", altura: 1000 },
  { slug: "PdfVarianteC", nome: "PDF · Variante C", grupo: "PDFs", altura: 1000 },
  { slug: "PdfVarianteD", nome: "PDF · Variante D · sem Farmácia + HD/CID", grupo: "PDFs", altura: 1000 },
  { slug: "ReceitaVarianteA", nome: "Receita · Variante A", grupo: "RECEITAS", altura: 1100 },
  { slug: "ReceitaVarianteB", nome: "Receita · Variante B", grupo: "RECEITAS", altura: 1100 },
  { slug: "ReceitaVarianteC", nome: "Receita · Variante C", grupo: "RECEITAS", altura: 1100 },
  { slug: "ReceitaVarianteD", nome: "Receita · Variante D", grupo: "RECEITAS", altura: 1100 },
  { slug: "blueprint-emails/EmailCalendarBlueprint", nome: "Blueprint · Emails + Calendar", grupo: "BLUEPRINT", altura: 1200 },
  { slug: "consultorio/CockpitMedicoV1", nome: "Consultório · Cockpit Médico V1", grupo: "CONSULTÓRIO", altura: 1400 },
  { slug: "craniotomia/ArvoreDossier", nome: "Craniotomia · Árvore Dossiê", grupo: "CRANIOTOMIA", altura: 1400 },
  { slug: "craniotomia/CraniotomiaV4", nome: "Craniotomia V4 · Split View", grupo: "CRANIOTOMIA", altura: 2200 },
  { slug: "craniotomia/GrafoSinapses", nome: "Craniotomia · Grafo de Sinapses", grupo: "CRANIOTOMIA", altura: 1400 },
  { slug: "craniotomia/MatrizDensa", nome: "Craniotomia · Matriz Densa", grupo: "CRANIOTOMIA", altura: 1400 },
  { slug: "craniotomia/TercoTablePanel", nome: "Craniotomia · Tabela de Terços", grupo: "CRANIOTOMIA", altura: 1400 },
  { slug: "dashboard-padua/DashboardPadua", nome: "Dashboard Pádua · gauges + neon", grupo: "DASHBOARD PÁDUA", altura: 2400 },
  { slug: "dashboard-padua/FichaCockpitPadua", nome: "Dashboard Pádua · Ficha Cockpit", grupo: "DASHBOARD PÁDUA", altura: 2000 },
  { slug: "dashboard-padua/VariantA", nome: "Dashboard Variante A", grupo: "DASHBOARD PÁDUA", altura: 2200 },
  { slug: "dashboard-padua/VariantB", nome: "Dashboard Variante B · Concierge Dourado", grupo: "DASHBOARD PÁDUA", altura: 2200 },
  { slug: "dashboard-padua/VariantC", nome: "Dashboard Variante C · Med-Tech Radiante", grupo: "DASHBOARD PÁDUA", altura: 2200 },
  { slug: "dashboard-padua/VariantD", nome: "Dashboard Variante D", grupo: "DASHBOARD PÁDUA", altura: 2200 },
  { slug: "pacientes-padua/PacientesPadua", nome: "★ Pacientes Pádua · Motor Sináptico", grupo: "PACIENTES PÁDUA", altura: 1800 },
  { slug: "padua-atelier/PaduaAtelierPanel", nome: "Pádua Atelier · Painel", grupo: "PÁDUA ATELIER", altura: 1600 },
  { slug: "pawards-showcase/LogoOptions", nome: "Showcase · Opções de Logo", grupo: "SHOWCASE PAWARDS", altura: 1200 },
  { slug: "pawards-showcase/PdfHeaderFooter", nome: "Showcase · Cabeçalho/Rodapé PDF", grupo: "SHOWCASE PAWARDS", altura: 1200 },
  { slug: "pawards-showcase/RasHmed", nome: "Showcase · RAS H-MED", grupo: "SHOWCASE PAWARDS", altura: 1200 },
  { slug: "pawards-showcase/ReceitaLayout", nome: "Showcase · Layout de Receita", grupo: "SHOWCASE PAWARDS", altura: 1200 },
  { slug: "pawards-showcase/ShieldA", nome: "Showcase · Shield A", grupo: "SHOWCASE PAWARDS", altura: 900 },
  { slug: "pawards-showcase/ShieldB", nome: "Showcase · Shield B", grupo: "SHOWCASE PAWARDS", altura: 900 },
  { slug: "pawards-showcase/ShieldC", nome: "Showcase · Shield C", grupo: "SHOWCASE PAWARDS", altura: 900 },
  { slug: "pawards-showcase/ShieldD", nome: "Showcase · Shield D", grupo: "SHOWCASE PAWARDS", altura: 900 },
  { slug: "pawards-showcase/SistemaHeader", nome: "Showcase · Header do Sistema", grupo: "SHOWCASE PAWARDS", altura: 800 },
  { slug: "prescricao-rapida/CatalogoLateral", nome: "Prescrição Rápida · Catálogo Lateral", grupo: "PRESCRIÇÃO RÁPIDA", altura: 1400 },
  { slug: "prescricao-rapida/ComandoTeclado", nome: "Prescrição Rápida · Comando de Teclado", grupo: "PRESCRIÇÃO RÁPIDA", altura: 1200 },
  { slug: "prescricao-rapida/GpsPadua", nome: "Prescrição Rápida · GPS Pádua", grupo: "PRESCRIÇÃO RÁPIDA", altura: 1400 },
  { slug: "prescricao-rapida/MotorMensageriaPadua", nome: "Prescrição Rápida · Motor de Mensageria", grupo: "PRESCRIÇÃO RÁPIDA", altura: 1400 },
  { slug: "prescricao-rapida/PilhaPorVia", nome: "Prescrição Rápida · Pilha por Via", grupo: "PRESCRIÇÃO RÁPIDA", altura: 1400 },
  { slug: "prescricao-rapida/TeatroMensageriaPadua", nome: "Prescrição Rápida · Teatro de Mensageria", grupo: "PRESCRIÇÃO RÁPIDA", altura: 1400 },
  { slug: "prescricao-rapida/TimelineSessoes", nome: "Prescrição Rápida · Timeline de Sessões", grupo: "PRESCRIÇÃO RÁPIDA", altura: 1200 },
  { slug: "sahara-noir/SaharaNoirPanel", nome: "Sahara Noir · Painel", grupo: "SAHARA NOIR", altura: 1600 },
];

function urlMockup(slug: string): string {
  return `/__mockup/preview/${slug}`;
}

export default function GaleriaMockupsPage() {
  const grupos = useMemo(() => {
    const acc = new Map<string, Mockup[]>();
    for (const m of MOCKUPS) {
      const arr = acc.get(m.grupo) ?? [];
      arr.push(m);
      acc.set(m.grupo, arr);
    }
    return Array.from(acc.entries());
  }, []);

  const [grupoAtivo, setGrupoAtivo] = useState<string>("TODOS");
  const grupoFiltrado = grupoAtivo === "TODOS"
    ? grupos
    : grupos.filter(([g]) => g === grupoAtivo);

  return (
    <div style={{ background: "#0B1220", color: "#E6EAF2", minHeight: "100vh", fontFamily: "'JetBrains Mono', monospace", padding: 32 }}>
      <header style={{ borderLeft: "3px solid #5EE6E6", paddingLeft: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#5EE6E6", textTransform: "uppercase" }}>
          PAWARDS · MOTOR · GALERIA DE MOCKUPS
        </div>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
          Galeria de Mockups · {MOCKUPS.length} sistemas
        </h1>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>
          Renderização direta dos componentes do mockup-sandbox · sem depender do canvas
        </div>
      </header>

      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
        {["TODOS", ...grupos.map(([g]) => g)].map((g) => (
          <button
            key={g}
            onClick={() => setGrupoAtivo(g)}
            style={{
              background: grupoAtivo === g ? "#5EE6E6" : "transparent",
              color: grupoAtivo === g ? "#0B1220" : "#E6EAF2",
              border: "1px solid #1F2937",
              padding: "8px 14px",
              fontFamily: "inherit",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            {g}
          </button>
        ))}
      </nav>

      {grupoFiltrado.map(([grupo, items]) => (
        <section key={grupo} style={{ marginBottom: 48 }}>
          <h2 style={{
            fontSize: 14,
            letterSpacing: 2,
            color: "#D4AF37",
            textTransform: "uppercase",
            borderBottom: "1px solid #1F2937",
            paddingBottom: 8,
            marginBottom: 20,
          }}>
            {grupo} · {items.length} {items.length === 1 ? "mockup" : "mockups"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
            {items.map((m) => (
              <article key={m.slug} style={{ border: "1px solid #1F2937", background: "#0F172A" }}>
                <header style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid #1F2937",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#0B1220",
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#E6EAF2", textTransform: "uppercase", letterSpacing: 1 }}>
                      {m.nome}
                    </div>
                    <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
                      {m.slug}
                    </div>
                  </div>
                  <a
                    href={urlMockup(m.slug)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 10,
                      color: "#5EE6E6",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      textDecoration: "none",
                      border: "1px solid #5EE6E6",
                      padding: "4px 10px",
                    }}
                  >
                    ABRIR ↗
                  </a>
                </header>
                <iframe
                  src={urlMockup(m.slug)}
                  title={m.nome}
                  style={{
                    width: "100%",
                    height: m.altura,
                    border: "none",
                    display: "block",
                    background: "#0B1220",
                  }}
                  loading="lazy"
                />
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
