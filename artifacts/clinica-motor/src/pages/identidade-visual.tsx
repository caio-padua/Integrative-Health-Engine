import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { LoaderPreview } from "@/components/LoaderPreview";

/**
 * /identidade-visual — Manual de Identidade Visual Pawards Medcore.
 *
 * Documento institucional fixo de marca. Mostra:
 * 1. Logo principal isolada (símbolo + palavra-marca)
 * 2. Variações permitidas (vertical, horizontal, monocromática)
 * 3. Área de respiro mínima (X = altura do "P")
 * 4. Paleta de cores oficial com hex copiável
 * 5. Tipografia (JetBrains Mono UPPERCASE)
 * 6. Regras de uso (✓ permitido / ✗ proibido)
 *
 * Tudo em deep navy + dourado, estética luxuosa Cartier/Patek.
 * Caio pediu pra fixar curvatura, espessura e padrão único.
 */

const NAVY_DEEP = "#0B1220";
const NAVY_PANEL = "#101A2A";
const GOLD = "#D4AF37";
const GOLD_BRIGHT = "#E5C160";
const CYAN = "#5EE6E6";
const INK = "#E5E7EB";
const INK_MUTED = "#94A3B8";

interface CorPaleta {
  nome: string;
  hex: string;
  uso: string;
  fundo: string;
  textoSobreFundo: string;
}

const PALETA: CorPaleta[] = [
  {
    nome: "Deep Navy",
    hex: "#0B1220",
    uso: "Fundo principal, sidebar, header global",
    fundo: "#0B1220",
    textoSobreFundo: "#E5E7EB",
  },
  {
    nome: "Navy Panel",
    hex: "#101A2A",
    uso: "Painéis internos, cards, modais",
    fundo: "#101A2A",
    textoSobreFundo: "#E5E7EB",
  },
  {
    nome: "Dourado Pawards",
    hex: "#D4AF37",
    uso: "Logo, bordas institucionais, marca",
    fundo: "#D4AF37",
    textoSobreFundo: "#0B1220",
  },
  {
    nome: "Dourado Claro",
    hex: "#E5C160",
    uso: "Hover dourado, highlights, gradientes",
    fundo: "#E5C160",
    textoSobreFundo: "#0B1220",
  },
  {
    nome: "Neon Ciano",
    hex: "#5EE6E6",
    uso: "Sotaque, ação primária, links, ativo",
    fundo: "#5EE6E6",
    textoSobreFundo: "#0B1220",
  },
  {
    nome: "Tinta Clara",
    hex: "#E5E7EB",
    uso: "Texto principal sobre fundo escuro",
    fundo: "#E5E7EB",
    textoSobreFundo: "#0B1220",
  },
  {
    nome: "Tinta Esfumada",
    hex: "#94A3B8",
    uso: "Texto secundário, legendas, placeholders",
    fundo: "#94A3B8",
    textoSobreFundo: "#0B1220",
  },
];

function Secao({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <section
      className="mb-12"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
      data-testid={`secao-${numero}`}
    >
      <header className="flex items-center gap-4 mb-6">
        <div
          className="flex items-center justify-center px-3 py-1 border-l-[3px] text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ borderLeftColor: GOLD, background: NAVY_PANEL, color: GOLD }}
        >
          {numero}
        </div>
        <h2
          className="text-sm font-bold uppercase tracking-[0.3em]"
          style={{ color: INK }}
        >
          {titulo}
        </h2>
        <div className="flex-1 h-px" style={{ background: `${GOLD}33` }} />
      </header>
      {children}
    </section>
  );
}

function ChipHex({ hex }: { hex: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(hex);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-white/5 transition-colors"
      style={{ background: NAVY_DEEP, color: GOLD_BRIGHT, fontFamily: "'JetBrains Mono', monospace" }}
      data-testid={`chip-hex-${hex.replace("#", "")}`}
    >
      {copiado ? <Check className="w-3 h-3" style={{ color: CYAN }} /> : <Copy className="w-3 h-3" />}
      {hex}
    </button>
  );
}

export default function IdentidadeVisual() {
  return (
    <div
      style={{
        background: NAVY_DEEP,
        color: INK,
        minHeight: "100vh",
        margin: "-1.5rem -1.5rem -2rem -1.5rem",
        padding: "2.5rem 1.5rem 3rem 1.5rem",
      }}
      data-testid="page-identidade-visual"
    >
      {/* CABEÇALHO INSTITUCIONAL */}
      <header className="max-w-5xl mx-auto mb-12 border-2 p-8 relative" style={{ borderColor: GOLD }}>
        {/* Cantos decorativos */}
        {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((pos) => {
          const [y, x] = pos.split("-");
          return (
            <div
              key={pos}
              className="absolute w-3 h-3"
              style={{
                [y === "top" ? "top" : "bottom"]: -6,
                [x === "left" ? "left" : "right"]: -6,
                background: GOLD,
              }}
            />
          );
        })}
        <div className="text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.5em] mb-3"
            style={{ color: CYAN, fontFamily: "'JetBrains Mono', monospace" }}
          >
            ● Documento Institucional ●
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold uppercase tracking-[0.2em] mb-2"
            style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Manual de Identidade Visual
          </h1>
          <p
            className="text-xs uppercase tracking-[0.3em]"
            style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Pawards Medcore Integrativa · Padrão único de marca
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto">
        {/* 01 LOGO PRINCIPAL */}
        <Secao numero="01" titulo="Logo Principal">
          <div
            className="p-12 flex items-center justify-center border"
            style={{ background: NAVY_PANEL, borderColor: `${GOLD}44` }}
          >
            <img
              src={`${import.meta.env.BASE_URL}logo-pawards-medcore.png`}
              alt="Logo Pawards Medcore"
              className="max-w-md w-full h-auto"
              style={{ filter: "drop-shadow(0 4px 12px rgba(212,175,55,0.3))" }}
              data-testid="manual-logo-principal"
            />
          </div>
          <p
            className="mt-4 text-[11px] uppercase tracking-[0.2em]"
            style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Versão oficial · símbolo "D" estilizado em dourado + palavra-marca "PAWARDS MEDCORE".
            <br />
            Esta é a única composição autorizada. Não recriar, não redesenhar, não modificar.
          </p>
        </Secao>

        {/* 02 ÁREA DE RESPIRO */}
        <Secao numero="02" titulo="Área de Respiro Mínima">
          <div
            className="p-12 border relative"
            style={{ background: NAVY_PANEL, borderColor: `${GOLD}44` }}
          >
            <div
              className="mx-auto p-12 border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: `${CYAN}55`, maxWidth: 400 }}
            >
              <img
                src={`${import.meta.env.BASE_URL}logo-pawards-medcore.png`}
                alt="Logo com área de respiro"
                className="w-full h-auto"
              />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <div
                  className="inline-block px-3 py-1 mb-2 border"
                  style={{ borderColor: GOLD, color: GOLD, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}
                >
                  X
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                  altura da letra "P"
                </p>
              </div>
              <div>
                <div
                  className="inline-block px-3 py-1 mb-2 border"
                  style={{ borderColor: GOLD, color: GOLD, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}
                >
                  1X
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                  margem mínima em todos os lados
                </p>
              </div>
              <div>
                <div
                  className="inline-block px-3 py-1 mb-2 border"
                  style={{ borderColor: CYAN, color: CYAN, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}
                >
                  ✓
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                  nada deve invadir esta zona
                </p>
              </div>
            </div>
          </div>
        </Secao>

        {/* 03 PALETA DE CORES */}
        <Secao numero="03" titulo="Paleta de Cores Oficial">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PALETA.map((cor) => (
              <div
                key={cor.hex}
                className="border flex items-stretch"
                style={{ borderColor: `${GOLD}44`, background: NAVY_PANEL }}
                data-testid={`cor-${cor.hex.replace("#", "")}`}
              >
                <div
                  className="w-24 flex items-center justify-center font-bold uppercase tracking-[0.15em]"
                  style={{
                    background: cor.fundo,
                    color: cor.textoSobreFundo,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                  }}
                >
                  AA
                </div>
                <div className="flex-1 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3
                      className="text-xs font-bold uppercase tracking-[0.2em]"
                      style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {cor.nome}
                    </h3>
                    <ChipHex hex={cor.hex} />
                  </div>
                  <p
                    className="text-[10px] uppercase tracking-[0.15em]"
                    style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {cor.uso}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Secao>

        {/* 04 TIPOGRAFIA */}
        <Secao numero="04" titulo="Tipografia">
          <div
            className="p-8 border"
            style={{ background: NAVY_PANEL, borderColor: `${GOLD}44` }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.2em] mb-2"
              style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}
            >
              Fonte oficial
            </p>
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}
            >
              JetBrains Mono
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="border-l-[3px] pl-3" style={{ borderColor: GOLD }}>
                <p className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                  TÍTULO
                </p>
                <p style={{ color: INK, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.25em" }}>
                  PAWARDS
                </p>
              </div>
              <div className="border-l-[3px] pl-3" style={{ borderColor: CYAN }}>
                <p className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                  LABEL
                </p>
                <p style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em" }}>
                  IDENTIFICAÇÃO
                </p>
              </div>
              <div className="border-l-[3px] pl-3" style={{ borderColor: GOLD }}>
                <p className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                  CORPO
                </p>
                <p style={{ color: INK, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  Texto neutro do sistema
                </p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: `${GOLD}33` }}>
              <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                Regra: títulos e labels SEMPRE em UPPERCASE com letter-spacing entre 0.2em e 0.3em.
                Corpo de texto em caixa normal. Nunca usar fonte serifada ou cursiva.
              </p>
            </div>
          </div>
        </Secao>

        {/* 05 REGRAS DE USO */}
        <Secao numero="05" titulo="Regras de Uso">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PERMITIDO */}
            <div className="border p-5" style={{ background: NAVY_PANEL, borderColor: `${CYAN}55` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: CYAN, fontFamily: "'JetBrains Mono', monospace" }}>
                ✓ Permitido
              </p>
              <ul className="space-y-2 text-[11px]" style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}>
                <li>• Usar logo dourada sobre fundo navy (#0B1220)</li>
                <li>• Manter a área de respiro de 1X</li>
                <li>• Aplicar em PDFs institucionais, e-mails, prontuários</li>
                <li>• Reduzir proporcionalmente mantendo proporção exata</li>
                <li>• Usar tipografia JetBrains Mono em todos os títulos</li>
              </ul>
            </div>
            {/* PROIBIDO */}
            <div className="border p-5" style={{ background: NAVY_PANEL, borderColor: "#7F1D1D" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: "#F87171", fontFamily: "'JetBrains Mono', monospace" }}>
                ✗ Proibido
              </p>
              <ul className="space-y-2 text-[11px]" style={{ color: INK, fontFamily: "'JetBrains Mono', monospace" }}>
                <li>• Redesenhar, recriar ou modificar o símbolo</li>
                <li>• Esticar, distorcer ou rotacionar</li>
                <li>• Trocar dourado por outra cor</li>
                <li>• Aplicar sobre fundo claro/branco sem inversão autorizada</li>
                <li>• Misturar com outras tipografias serifadas ou cursivas</li>
                <li>• Colocar elementos dentro da área de respiro</li>
              </ul>
            </div>
          </div>
        </Secao>

        {/* 07 INDICADORES DE CARREGAMENTO — preview com PLAY */}
        <Secao numero="07" titulo="Indicadores de Carregamento (Preview)">
          <p
            className="text-[11px] uppercase tracking-[0.2em] mb-4"
            style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Aperte ▶ em cada caixa pra ver a animação em câmera lenta.
            A · barra fina dourada do topo · B · círculo com % pra cargas longas ·
            C · spinner quando não há porcentagem.
          </p>
          <LoaderPreview />
        </Secao>

        {/* 06 ASSINATURA */}
        <Secao numero="06" titulo="Atalho Curado">
          <div className="border p-6 text-center" style={{ background: NAVY_PANEL, borderColor: `${GOLD}44` }}>
            <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
              Em caso de dúvida, regra de ouro:
            </p>
            <p className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: GOLD, fontFamily: "'JetBrains Mono', monospace" }}>
              "Quando em dúvida, não modifique."
            </p>
          </div>
        </Secao>

        {/* RODAPÉ INSTITUCIONAL */}
        <footer className="text-center mt-12 pt-6 border-t" style={{ borderColor: `${GOLD}33` }}>
          <p
            className="text-[9px] uppercase tracking-[0.4em]"
            style={{ color: INK_MUTED, fontFamily: "'JetBrains Mono', monospace" }}
          >
            PAWARDS MEDCORE INTEGRATIVA · Manual fixo · Não editar sem aprovação do CEO
          </p>
        </footer>
      </div>
    </div>
  );
}
