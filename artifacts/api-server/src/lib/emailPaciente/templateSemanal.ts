/**
 * Template HTML do RELATORIO SEMANAL DO PACIENTE — padrao PAWARDS
 *
 * Regras de layout:
 *  - 1 pagina A4 fixa por relatorio (CSS @page + page-break-inside: avoid)
 *  - Sem topico orfao: se conteudo estoura, vira NOVA pagina com header proprio
 *  - Header sempre azul petroleo (#1F4E5F) com detalhe dourado (#C9A961)
 *  - Rodape: "Pagina X de N · Auditor: NOME · Pawards · DD.MM.YYYY"
 *  - Nomenclatura: TUDO MAIUSCULA, sem acento, sem hifen, sem underline
 */
export interface DadosRelatorioPaciente {
  paciente: { nome: string; primeiro_nome: string; email: string; cpf?: string; };
  unidade:  { nome: string; cidade?: string; };
  semana:   { codigo_iso: string; inicio: string; fim: string; numero: number; };
  resumo_5seg: string[];                       // ate 3 bullets
  o_que_aconteceu: string[];                   // 5-8 bullets
  o_que_pedimos: { texto: string; cta_url?: string; }[];  // 1-3 acoes
  indicadores: { rotulo: string; valor: string; comparativo?: string; }[];
  auditor: { nome: string; emoji: string; cor_hex: string; papel: string; };
  rodape: { paginacao: string; data: string; };
}

const DNA_PETROLEO = "#1F4E5F";
const DNA_DOURADO  = "#C9A961";
const DNA_OFFWHITE = "#F8F5EE";
const DNA_GRAFITE  = "#2A2A2A";

export function renderRelatorioSemanalPacienteHtml(d: DadosRelatorioPaciente): string {
  const cor = d.auditor.cor_hex || DNA_PETROLEO;
  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="utf-8" />
<title>Relatorio Semanal Pawards — ${d.paciente.primeiro_nome}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: ${DNA_GRAFITE}; background: ${DNA_OFFWHITE}; margin: 0; padding: 0; }
  .pagina { page-break-inside: avoid; page-break-after: always; padding: 18mm; max-width: 210mm; min-height: 277mm; background: white; }
  .pagina:last-child { page-break-after: auto; }
  .header { border-bottom: 4px solid ${DNA_DOURADO}; padding-bottom: 12px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; }
  .marca { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: ${DNA_PETROLEO}; letter-spacing: 1px; }
  .marca small { display: block; font-size: 10px; letter-spacing: 3px; color: ${DNA_DOURADO}; text-transform: uppercase; margin-top: 2px; }
  .auditor-badge { display: inline-flex; align-items: center; gap: 8px; background: ${cor}; color: white; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  h1.titulo { font-size: 26px; color: ${DNA_PETROLEO}; margin: 16px 0 4px 0; line-height: 1.15; }
  .sub { color: #6B7280; font-size: 13px; margin-bottom: 22px; }
  .bloco { background: ${DNA_OFFWHITE}; border-left: 4px solid ${DNA_DOURADO}; padding: 14px 18px; margin: 14px 0; border-radius: 6px; page-break-inside: avoid; }
  .bloco h2 { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: ${DNA_PETROLEO}; margin: 0 0 8px 0; }
  .bloco ul { margin: 0; padding-left: 18px; }
  .bloco li { margin: 4px 0; font-size: 14px; line-height: 1.55; }
  .acao { background: white; border: 1px solid #E5E1D6; border-radius: 8px; padding: 12px 16px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; gap: 12px; page-break-inside: avoid; }
  .acao-text { font-size: 14px; color: ${DNA_GRAFITE}; }
  .acao a.cta { background: ${DNA_PETROLEO}; color: white; padding: 8px 16px; border-radius: 999px; text-decoration: none; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 600; }
  table.kpi { width: 100%; border-collapse: collapse; margin: 6px 0; }
  table.kpi td { border-bottom: 1px dotted #DDD; padding: 6px 4px; font-size: 13px; }
  table.kpi td.r { color: ${DNA_PETROLEO}; font-weight: 700; text-align: right; }
  table.kpi td.c { text-align: right; color: #6B7280; font-size: 11px; }
  .rodape { position: relative; margin-top: 22px; padding-top: 10px; border-top: 1px solid #E5E1D6; font-size: 10px; color: #6B7280; text-align: center; letter-spacing: 0.6px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="pagina">
    <div class="header">
      <div class="marca">PAWARDS<small>GESTAO CLINICA</small></div>
      <div class="auditor-badge"><span>${escapeHtml(d.auditor.emoji)}</span><span>${escapeHtml(d.auditor.nome)}</span></div>
    </div>

    <h1 class="titulo">RELATORIO SEMANAL DE ${escapeHtml(d.paciente.primeiro_nome.toUpperCase())}</h1>
    <div class="sub">Semana ${d.semana.numero} · ${escapeHtml(d.semana.inicio)} a ${escapeHtml(d.semana.fim)} · ${escapeHtml(d.unidade.nome)}</div>

    <div class="bloco">
      <h2>RESUMO EM 5 SEGUNDOS</h2>
      <ul>${d.resumo_5seg.slice(0,3).map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
    </div>

    <div class="bloco">
      <h2>O QUE ACONTECEU NESTA SEMANA</h2>
      <ul>${d.o_que_aconteceu.slice(0,8).map(b => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
    </div>

    ${d.o_que_pedimos.length > 0 ? `<div class="bloco">
      <h2>O QUE PRECISAMOS DE VOCE</h2>
      ${d.o_que_pedimos.slice(0,3).map(a => `
        <div class="acao">
          <div class="acao-text">${escapeHtml(a.texto)}</div>
          ${a.cta_url ? `<a class="cta" href="${escapeAttr(a.cta_url)}">CONFIRMAR</a>` : ""}
        </div>
      `).join("")}
    </div>` : ""}

    ${d.indicadores.length > 0 ? `<div class="bloco">
      <h2>INDICADORES DA SUA JORNADA</h2>
      <table class="kpi">
        ${d.indicadores.slice(0,6).map(k => `<tr>
          <td>${escapeHtml(k.rotulo)}</td>
          <td class="r">${escapeHtml(k.valor)}</td>
          <td class="c">${escapeHtml(k.comparativo || "")}</td>
        </tr>`).join("")}
      </table>
    </div>` : ""}

    <div class="rodape">${escapeHtml(d.rodape.paginacao)} · Auditor: ${escapeHtml(d.auditor.nome)} · Pawards Gestao Clinica · ${escapeHtml(d.rodape.data)}</div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string | undefined): string {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  } as any)[c]);
}
function escapeAttr(s: string): string { return escapeHtml(s); }
