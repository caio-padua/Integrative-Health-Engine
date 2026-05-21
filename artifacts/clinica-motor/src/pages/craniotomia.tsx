// Craniotomia — visualização global do MOTOR CLÍNICO (grafo + matriz + terços).
// É base para todas as clínicas (escopo GLOBAL): mexer aqui afeta todos os
// locais que herdam do Genesis. Por enquanto a UI vive no mockup-sandbox e
// é renderizada aqui via iframe pro proxy (/__mockup/preview/...).
// Quando aprovada, migrar o componente pra dentro de clinica-motor.
import { useState } from "react";
import { Activity, ExternalLink, Maximize2 } from "lucide-react";
import { Layout } from "@/components/Layout";

const PAINEIS = [
  {
    slug: "CraniotomiaV4",
    nome: "Grafo + Matriz-Espelho",
    descricao: "Sinapses do motor (anamnese → ação terapêutica) com cross-highlight elétrico.",
  },
  {
    slug: "TercoTablePanel",
    nome: "Tabela de Terços",
    descricao: "Exames classificados pelas 5 zonas oficiais (ABAIXO_MIN / INFERIOR / MÉDIO / SUPERIOR / ACIMA_MAX).",
  },
] as const;

export default function CraniotomiaPage() {
  const [painelAtivo, setPainelAtivo] = useState<(typeof PAINEIS)[number]["slug"]>("CraniotomiaV4");
  const url = `/__mockup/preview/craniotomia/${painelAtivo}`;
  return (
    <Layout>
    <div className="h-full w-full flex flex-col bg-background" style={{ minHeight: "calc(100vh - 96px)" }}>
      {/* HEADER */}
      <div className="flex-none border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Activity className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold uppercase tracking-wider truncate">
              Craniotomia — Motor Clínico
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Escopo <strong className="text-primary">GLOBAL</strong> · base que serve todas as clínicas (herança Genesis)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {PAINEIS.map((p) => {
            const ativo = p.slug === painelAtivo;
            return (
              <button
                key={p.slug}
                onClick={() => setPainelAtivo(p.slug)}
                className="h-9 px-3 text-[10px] font-bold uppercase tracking-wider border transition-all"
                style={{
                  background: ativo ? "rgba(212,175,55,0.18)" : "transparent",
                  borderColor: ativo ? "#D4AF37" : "var(--border)",
                  color: ativo ? "#D4AF37" : "var(--muted-foreground)",
                  boxShadow: ativo ? "inset 0 0 0 1px rgba(212,175,55,0.4), 0 0 8px rgba(212,175,55,0.25)" : "none",
                }}
                title={p.descricao}
                data-testid={`btn-painel-${p.slug}`}
              >
                {p.nome}
              </button>
            );
          })}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="h-9 px-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground"
            title="Abrir em nova aba"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* IFRAME do painel ativo (vive no mockup-sandbox) */}
      <div className="flex-1 min-h-0 bg-background" style={{ height: "calc(100vh - 200px)" }}>
        <iframe
          key={painelAtivo}
          src={url}
          title={`Craniotomia · ${painelAtivo}`}
          className="w-full h-full border-0"
          style={{ display: "block" }}
          data-testid={`iframe-craniotomia-${painelAtivo}`}
        />
      </div>

      {/* FOOTER */}
      <div className="flex-none border-t border-border bg-card px-4 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
        <span>
          Alterações aqui propagam pra <strong className="text-primary">todas as unidades</strong> que herdam do Genesis (ID 14).
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <ExternalLink className="w-3 h-3" />
          {url}
        </a>
      </div>
    </div>
    </Layout>
  );
}
