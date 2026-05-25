import { useRoute } from "wouter";

export default function MockupCanvasPage() {
  const [, params] = useRoute<{ slug: string }>("/mockup-canvas/:slug*");
  const slug = params?.slug ?? "";

  if (!slug) {
    return (
      <div
        style={{
          background: "#0B1220",
          color: "#E6EAF2",
          minHeight: "100vh",
          fontFamily: "'JetBrains Mono', monospace",
          padding: 32,
        }}
      >
        <div style={{ borderLeft: "3px solid #5EE6E6", paddingLeft: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#5EE6E6", textTransform: "uppercase" }}>
            MOCKUP CANVAS
          </div>
          <h1 style={{ fontSize: 24, margin: "8px 0" }}>Slug ausente</h1>
          <p style={{ fontSize: 12, color: "#94A3B8" }}>
            Use o formato <code>/mockup-canvas/grupo/Componente</code>
          </p>
        </div>
      </div>
    );
  }

  const url = `/__mockup/preview/${slug}`;

  return (
    <div
      style={{
        background: "#0B1220",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <iframe
        src={url}
        title={slug}
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          background: "#0B1220",
        }}
      />
    </div>
  );
}
