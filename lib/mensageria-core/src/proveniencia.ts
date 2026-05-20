// ═══════════════════════════════════════════════════════════════════════
// 🔬 PROVENIÊNCIA · mapa "fossa abissal" — cada placeholder do template
// → tabela.coluna + jornada do dado (cadastro Pádua, anamnese, agenda…).
// Usado pra auditoria visual de PROVENIENCE no Painel CEO e em LGPD.
// ═══════════════════════════════════════════════════════════════════════
import type { LinhaProveniencia, OrigemPlaceholder } from "./types.js";

export const ORIGEM_DB_PLACEHOLDER: Record<string, OrigemPlaceholder> = {
  "{NOME_PACIENTE}":          { tabela: "pacientes",                                coluna: "nome_completo",                  jornada: "Cadastro Pádua 13/mai → unidade_id=15 → SELECT WHERE id=$1" },
  "{PRONOME_TRATAMENTO}":     { tabela: "pacientes",                                coluna: "pronome_tratamento",             jornada: "Preenchido pela enfermeira na anamnese inicial" },
  "{SAUDACAO}":               { tabela: "periodos_dia",                             coluna: "saudacao",                       jornada: "now()::time → match (janela_inicio,fim) → busca saudacao" },
  "{NOME_PERIODO}":           { tabela: "periodos_dia",                             coluna: "nome",                           jornada: "periodos_dia.sigla → nome (ex: IM → Início da Manhã)" },
  "{EMOJI_PERIODO}":          { tabela: "periodos_dia",                             coluna: "emoji",                          jornada: "periodos_dia.emoji por sigla" },
  "{JANELA_PERIODO}":         { tabela: "periodos_dia",                             coluna: "janela_inicio + janela_fim",     jornada: "concat das 2 colunas (TIME → string)" },
  "{ABERTURA_PERIODO}":       { tabela: "mensagens_catalogo",                       coluna: "conteudo",                       jornada: "WHERE chave=concat('abertura.', sigla)" },
  "{DIA_SEMANA}":             { tabela: "(runtime)",                                coluna: "—",                              jornada: "Date.getDay() → DIAS_SEMANA[i].label · TZ America/Sao_Paulo" },
  "{SEMANA_DO_MES}":          { tabela: "(runtime)",                                coluna: "—",                              jornada: "Math.ceil(dia/7) → SEMANAS_MES[i].frase" },
  "{LISTA_FORMULAS}":         { tabela: "itens_terapeuticos ⋈ revo_medicamentos",   coluna: "(loop)",                         jornada: "WHERE prescricao_id=$1 AND periodo=$2 → render por fórmula" },
  "{POSOLOGIA}":              { tabela: "itens_terapeuticos",                       coluna: "posologia_estruturada",          jornada: "Backfill Task #40 100% (13/mai) · 259/259 interpretados" },
  "{VIA}":                    { tabela: "itens_terapeuticos",                       coluna: "via_administracao",              jornada: "VO/EV/IM/SC/IMP" },
  "{HORARIO_DOSE}":           { tabela: "itens_terapeuticos",                       coluna: "horarios[]",                     jornada: "array TIME[] por dose individual" },
  "{DATA_AGENDAMENTO}":       { tabela: "agendamentos",                             coluna: "data_inicio::date",              jornada: "Agenda Motor → slot reservado (sync Google Calendar)" },
  "{HORA_AGENDAMENTO}":       { tabela: "agendamentos",                             coluna: "data_inicio::time",              jornada: "Agenda Motor → slot reservado" },
  "{NOME_PROCEDIMENTO}":      { tabela: "catalogo_procedimentos",                   coluna: "nome",                           jornada: "JOIN agendamentos.procedimento_id" },
  "{SALA}":                   { tabela: "salas",                                    coluna: "nome",                           jornada: "agendamentos.sala_id → salas.nome" },
  "{ENFERMEIRA}":             { tabela: "usuarios (perfil='enfermeira')",           coluna: "nome",                           jornada: "agendamentos.executor_id → usuarios" },
  "{DATA_ULTIMA_APLICACAO}":  { tabela: "procedimentos_executados",                 coluna: "data_execucao",                  jornada: "MAX(data_execucao) do paciente p/ este procedimento" },
  "{DATA_VENCIMENTO}":        { tabela: "procedimentos_executados + catalogo_procedimentos", coluna: "data_execucao + duracao_meses", jornada: "(data + duracao_meses) − 30 dias = data alerta" },
  "{DIAS_RESTANTES}":         { tabela: "(calc runtime)",                           coluna: "—",                              jornada: "vencimento − now() em dias (cron diário)" },
  "{NOME_FECHADORA}":         { tabela: "usuarios (perfil='fechadora')",            coluna: "nome",                           jornada: "task_cards.responsavel_id → usuarios" },
  "{STATUS_DR_CAIO}":         { tabela: "usuarios_status",                          coluna: "frase_atual",                    jornada: "Dr. Caio edita ao vivo no painel CEO — TTL 24h" },
  "{FALA_DR_CAIO}":           { tabela: "mensagens_catalogo",                       coluna: "conteudo",                       jornada: "WHERE chave LIKE 'fala_caio.%' ORDER BY RANDOM() LIMIT 1" },
  "{OBS_DOSE}":               { tabela: "mensagens_catalogo",                       coluna: "conteudo",                       jornada: "WHERE chave='obs.dose'" },
  "{ASSINATURA_BEATRIZ}":     { tabela: "catalogo_agentes",                         coluna: "assinatura_jsonb",               jornada: "agente='Beatriz Romanov' → assinatura completa (5 linhas)" },
  "{CARTA_ENCANTAMENTO}":     { tabela: "cartas_encantamento + cartas_encantamento_matriz", coluna: "texto + matriz[periodo][cenario]", jornada: "Ativa SE now()::date ∈ (data_inicio, data_fim) E matriz[sigla][cenario]=true" },
  "{SLOT_TOPO}":              { tabela: "mensagens_addons",                         coluna: "conteudo (WHERE posicao='topo')",   jornada: "Agrega add-ons WHERE ativo=true AND posicao='topo' ORDER BY prioridade" },
  "{SLOT_MEIO}":              { tabela: "mensagens_addons",                         coluna: "conteudo (WHERE posicao='meio')",   jornada: "Agrega add-ons WHERE ativo=true AND posicao='meio' ORDER BY prioridade" },
  "{SLOT_RODAPE}":            { tabela: "mensagens_addons",                         coluna: "conteudo (WHERE posicao='rodape')", jornada: "Agrega add-ons WHERE ativo=true AND posicao='rodape' ORDER BY prioridade" },
};

export function tracarProveniencia(
  template: string,
  resolver: (chave: string) => string,
): LinhaProveniencia[] {
  const matches = Array.from(template.matchAll(/\{[A-Z_]+\}/g));
  const seen = new Set<string>();
  const rows: LinhaProveniencia[] = [];
  let ord = 0;
  for (const m of matches) {
    const chave = m[0];
    if (seen.has(chave)) continue;
    seen.add(chave);
    ord += 1;
    const origem = ORIGEM_DB_PLACEHOLDER[chave] ?? { tabela: "(desconhecida)", coluna: "—", jornada: "placeholder fora do mapa — adicione em ORIGEM_DB_PLACEHOLDER" };
    const resolvido = (resolver(chave) ?? "").trim();
    rows.push({
      ordem: ord,
      chave,
      resolvido,
      tabela: origem.tabela,
      coluna: origem.coluna,
      jornada: origem.jornada,
      vazio: resolvido.length === 0,
      fonte_tipo: chave.startsWith("{SLOT_") ? "slot" : "placeholder",
    });
  }
  return rows;
}
