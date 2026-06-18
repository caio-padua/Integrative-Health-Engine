/**
 * inicio.tsx — TELA INICIAL "MODO CLÍNICO" (Instituto Pádua)
 *
 * Por que existe: ao logar, o usuário caía no painel tático denso e na
 * "Visão Global", sem saber onde estava nem o que fazer. Esta tela é a
 * porta de entrada simples: diz CLARAMENTE em que unidade ele está e
 * oferece poucos botões grandes, em português, para as tarefas do dia a
 * dia. O sistema completo continua intacto atrás do "painel completo".
 *
 * Face PENUMBRA CLARA "Paper Ciano" (hex aprovados por Caio — não inventar).
 * Regras inegociáveis: border-radius 0, JetBrains Mono, PT-BR, zero emoji,
 * retângulo-dentro-retângulo, cor de domínio só no item ativo/hover.
 */
import { Link } from "wouter";
import { useClinic } from "@/contexts/ClinicContext";
import { LayoutPawards } from "@/components/LayoutPawards";
import {
  Stethoscope,
  CalendarClock,
  Users,
  ListChecks,
  ShieldCheck,
  Pill,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

// PENUMBRA face CLARA "Paper Ciano" — mesmos valores do perfil aprovado.
const C = {
  pagina: "#EEF2F4",
  painel: "#F8FBFC",
  painel2: "#E2E8EC",
  border: "#B8C4CA",
  texto: "#0F1A1F",
  textoMute: "#3F5258",
  textoDim: "#6E8088",
  ciano: "#1E7A6E",
  ouro: "#9C6E16",
  roxo: "#5A4A82",
  verde: "#3F6E3F",
  vermelho: "#8A2A2A",
  mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
} as const;

type Acao = {
  titulo: string;
  descricao: string;
  href: string;
  cor: string;
  Icon: typeof Stethoscope;
};

const ACOES: Acao[] = [
  {
    titulo: "Atender um paciente",
    descricao: "Abrir a ficha de um paciente e começar o atendimento.",
    href: "/cockpit",
    cor: C.ciano,
    Icon: Stethoscope,
  },
  {
    titulo: "Agenda de hoje",
    descricao: "Ver os horários do dia e marcar consultas.",
    href: "/agenda",
    cor: C.roxo,
    Icon: CalendarClock,
  },
  {
    titulo: "Pacientes",
    descricao: "Lista dos pacientes cadastrados nesta unidade.",
    href: "/pacientes",
    cor: C.ouro,
    Icon: Users,
  },
  {
    titulo: "Pendências do dia",
    descricao: "O que está esperando uma ação sua agora.",
    href: "/filas",
    cor: C.vermelho,
    Icon: ListChecks,
  },
  {
    titulo: "Validar prescrições",
    descricao: "Aprovar receitas e procedimentos pendentes.",
    href: "/validacao",
    cor: C.verde,
    Icon: ShieldCheck,
  },
  {
    titulo: "Prescrição rápida",
    descricao: "Emitir uma receita agora mesmo.",
    href: "/prescricao-rapida",
    cor: C.ciano,
    Icon: Pill,
  },
];

const CSS = `
  .inicio-card {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-decoration: none;
    background: ${C.painel};
    border: 1px solid ${C.border};
    border-left: 3px solid ${C.border};
    padding: 22px 22px 20px;
    transition: border-color .15s ease, transform .12s ease;
  }
  .inicio-card::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0;
    transition: opacity .18s ease;
    box-shadow:
      0 0 0 1px var(--cor) inset,
      0 8px 24px color-mix(in srgb, var(--cor) 22%, transparent);
  }
  .inicio-card:hover {
    border-left-color: var(--cor);
    transform: translateY(-2px);
  }
  .inicio-card:hover::before { opacity: 1; }
  .inicio-card:hover .inicio-seta { color: var(--cor); transform: translateX(4px); }
  .inicio-card:hover .inicio-card-titulo { color: var(--cor); }
  .inicio-avancado {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: ${C.textoMute};
    border: 1px solid ${C.border};
    background: ${C.painel};
    padding: 10px 16px;
    font-family: ${C.mono};
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    transition: border-color .15s ease, color .15s ease;
  }
  .inicio-avancado:hover { color: ${C.ciano}; border-color: ${C.ciano}; }
`;

export default function InicioClinico() {
  const { nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas } = useClinic();
  const corUnidade = corUnidadeSelecionada || C.ciano;

  return (
    <LayoutPawards face="claro">
      <style>{CSS}</style>
      <div
        style={{
          minHeight: "100%",
          background: C.pagina,
          padding: "28px 28px 48px",
          fontFamily: C.mono,
          color: C.texto,
        }}
        data-testid="inicio-clinico"
      >
        {/* Cabeçalho: ONDE você está */}
        <section
          style={{
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${corUnidade}`,
            background: C.painel,
            padding: "20px 24px",
            marginBottom: 26,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: C.textoDim,
              marginBottom: 6,
            }}
          >
            Você está em
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 0.5,
              color: corUnidade,
            }}
            data-testid="inicio-unidade"
          >
            {nomeUnidadeSelecionada}
          </div>
          <div style={{ fontSize: 12, color: C.textoMute, marginTop: 8, lineHeight: 1.6 }}>
            {isTodasClinicas
              ? "Você está vendo TODAS as clínicas. Para focar numa unidade, use o seletor de unidade no topo."
              : "Esta é a sua tela inicial. Escolha abaixo o que deseja fazer agora."}
          </div>
        </section>

        {/* O QUE fazer agora */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: C.textoDim,
            marginBottom: 14,
          }}
        >
          O que você quer fazer agora?
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 34,
          }}
        >
          {ACOES.map((acao) => {
            const Icon = acao.Icon;
            return (
              <Link
                key={acao.href}
                href={acao.href}
                className="inicio-card"
                style={{ ["--cor" as any]: acao.cor } as React.CSSProperties}
                data-testid={`inicio-acao-${acao.href.replace(/\//g, "-")}`}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 38,
                      height: 38,
                      border: `1px solid ${acao.cor}`,
                      color: acao.cor,
                    }}
                  >
                    <Icon size={20} />
                  </span>
                  <ArrowRight className="inicio-seta" size={18} style={{ color: C.textoDim, transition: "transform .15s ease, color .15s ease" }} />
                </div>
                <div
                  className="inicio-card-titulo"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    color: C.texto,
                    transition: "color .15s ease",
                  }}
                >
                  {acao.titulo}
                </div>
                <div style={{ fontSize: 12, color: C.textoMute, lineHeight: 1.6 }}>
                  {acao.descricao}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Acesso ao sistema completo (modo avançado) */}
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            paddingTop: 20,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 12, color: C.textoMute, lineHeight: 1.6 }}>
            Precisa de relatórios, configurações ou de todos os módulos?
          </div>
          <Link href="/dashboard" className="inicio-avancado" data-testid="inicio-modo-avancado">
            <LayoutDashboard size={14} />
            Abrir painel completo
          </Link>
        </div>
      </div>
    </LayoutPawards>
  );
}
