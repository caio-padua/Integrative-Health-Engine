import { Printer } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Botão universal pra gerar PDF de telas analíticas.
 *
 * Filosofia TDAH/TOC friendly (Onda PARMASUPRA · Dr. Caio):
 *  - usa window.print() do navegador (zero dependências, qualidade vetorial nativa)
 *  - estilos @media print em `print-relatorio.css` cuidam do layout:
 *       cabeçalho fixo (logo PAWARDS + título + período + data)
 *       cores semânticas preservadas (-webkit-print-color-adjust)
 *       page-break inteligente entre seções (avoid quebra de gráfico no meio)
 *       legenda de cores explicada no rodapé
 *  - usuário escolhe "Salvar como PDF" no diálogo nativo do navegador
 *
 * Cada tela passa `tituloRelatorio` e `subtituloRelatorio` que aparecem no
 * cabeçalho impresso (escondidos na tela via classe `apenas-impressao`).
 */
export function BotaoImprimirRelatorio({
  tituloRelatorio,
  subtituloRelatorio,
  className = "",
  flutuante = false,
}: {
  tituloRelatorio: string;
  subtituloRelatorio?: string;
  className?: string;
  /** Se true, posiciona fixed no canto superior direito da tela (não interfere em layouts existentes). */
  flutuante?: boolean;
}) {
  function imprimir() {
    // injeta meta-info no DOM antes de imprimir (lida pelo CSS print).
    // IMPORTANTE: setAttribute precisa ser no <body> porque os pseudo-elementos
    // ::before/::after estao em body/main/#root e attr() resolve no proprio
    // elemento que possui o pseudo. Setar no <html> deixava o cabecalho vazio.
    const html = document.documentElement;
    const body = document.body;
    const subt = subtituloRelatorio ??
      new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
    html.setAttribute("data-pdf-titulo", tituloRelatorio);
    html.setAttribute("data-pdf-subtitulo", subt);
    body.setAttribute("data-pdf-titulo", tituloRelatorio);
    body.setAttribute("data-pdf-subtitulo", subt);
    body.classList.add("modo-impressao-pawards");
    // dispara após o próximo paint pra garantir CSS aplicado
    setTimeout(() => {
      window.print();
      document.body.classList.remove("modo-impressao-pawards");
    }, 80);
  }

  const base =
    "px-3 py-2 bg-amber-600/90 hover:bg-amber-500 text-zinc-900 font-semibold rounded text-sm flex items-center gap-2 nao-imprimir transition shadow-lg";
  const pos = flutuante
    ? "fixed top-4 right-4 z-50 "
    : "";
  return (
    <button
      onClick={imprimir}
      className={pos + base + " " + className}
      title="Gera PDF do relatório (TDAH/TOC friendly: cabeçalho fixo, cores preservadas, legendas explicadas)"
    >
      <Printer size={16} /> Gerar PDF
    </button>
  );
}

/**
 * Componente one-liner pra plugar o botão "Gerar PDF" em qualquer tela.
 * Renderiza via Portal direto no body (não interfere em nenhum layout existente).
 *
 * Uso típico:
 *   return (
 *     <Layout>
 *       <BotaoImprimirFlutuante titulo="Dashboard Local · Instituto Genesis" />
 *       ...conteúdo...
 *     </Layout>
 *   );
 */
export function BotaoImprimirFlutuante({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute("data-pdf-titulo");
      document.documentElement.removeAttribute("data-pdf-subtitulo");
      document.body.removeAttribute("data-pdf-titulo");
      document.body.removeAttribute("data-pdf-subtitulo");
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <BotaoImprimirRelatorio flutuante tituloRelatorio={titulo} subtituloRelatorio={subtitulo} />,
    document.body
  );
}
