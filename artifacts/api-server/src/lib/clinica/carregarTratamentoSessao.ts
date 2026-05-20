/**
 * carregarTratamentoSessao — fetcher canonico do plano terapeutico de uma sessao.
 *
 * Reune (em uma unica chamada por sessaoId) tudo que o paciente esta consentindo
 * naquela data: formulas manipuladas ativas, aplicacoes injetaveis IM/EV agendadas,
 * resumo financeiro de referencia. Usado por geradores de PDF (RACJ, RAS, prescricao
 * agregada) pra evitar que o gerador faca SQL.
 *
 * Origem: Plano Dr. Claude 18/mai/2026 (upgrade RACJ Manifesto Blueprint v2.0).
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface PacienteResumo {
  id: number;
  nome: string;
  cpf: string | null;
  codigoSemantico: string | null;
  dataNascimento: string | null;
  genero: string | null;
  whatsapp: string | null;
  telefone: string | null;
}

export interface UnidadeResumo {
  id: number;
  nome: string;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
}

export interface ProfissionalResumo {
  id: number;
  nome: string;
  crm: string | null;
  perfil: string;
}

export interface SessaoResumo {
  id: number;
  pacienteId: number;
  unidadeId: number | null;
  dataAgendada: string | null;
  status: string;
}

export interface FormulaManipuladaItem {
  id: number;
  nome: string;
  dose: string | null;
  posologia: string | null;
  indicacaoClinica: string | null;
  duracaoDescricao: string | null;
  componentes: unknown;
}

export interface AplicacaoItem {
  id: number;
  substanciaNome: string;
  dose: string;
  via: string;
  categoria: string;
  numeroSessao: number;
  totalSessoes: number;
  precoReferencia: number | null;
}

export interface ResumoFinanceiro {
  itens: Array<{ descricao: string; precoReferencia: number | null }>;
  totalReferencia: number | null;
  observacao: string;
}

export interface TratamentoSessao {
  sessao: SessaoResumo;
  paciente: PacienteResumo;
  unidade: UnidadeResumo;
  profissional: ProfissionalResumo;
  formulas: FormulaManipuladaItem[];
  aplicacoesIm: AplicacaoItem[];
  aplicacoesEv: AplicacaoItem[];
  outrasAplicacoes: AplicacaoItem[];
  financeiro: ResumoFinanceiro;
}

interface SessaoRow { id: number; paciente_id: number; unidade_id: number | null; profissional_id: number | null; data_agendada: string | null; status: string }
interface PacRow { id: number; nome: string; cpf: string | null; codigo_semantico: string | null; data_nascimento: string | null; genero: string | null; whatsapp: string | null; telefone: string | null }
interface UniRow { id: number; nome: string; endereco: string | null; bairro: string | null; cep: string | null; cidade: string | null; estado: string | null }
interface UsuRow { id: number; nome: string; crm: string | null; perfil: string }
interface FormulaRow { id: number; nome: string; dose: string | null; posologia: string | null; indicacao_clinica: string | null; componentes_formula: unknown; data_inicio_uso: string | null }
interface AplRow { id: number; substancia_nome: string; dose: string; via: string; categoria: string; numero_sessao: number; total_sessoes: number; preco_referencia: number | null }

function rows<T>(r: unknown): T[] {
  return ((r as { rows?: T[] }).rows) || [];
}

function inferirDuracao(formula: FormulaRow): string | null {
  if (!formula.posologia) return null;
  const m = /por\s+(\d+)\s*(dia|dias|semana|semanas|mes|meses)/i.exec(formula.posologia);
  if (!m) return null;
  return `${m[1]} ${m[2]?.toLowerCase()}`;
}

export async function carregarTratamentoSessao(
  sessaoId: number,
  opts?: { profissionalId?: number },
): Promise<TratamentoSessao> {
  const sessao = rows<SessaoRow>(await db.execute(sql`
    SELECT id, paciente_id, unidade_id, profissional_id, data_agendada::text, status
    FROM sessoes WHERE id = ${sessaoId} LIMIT 1
  `))[0];
  if (!sessao) throw new Error(`Sessao ${sessaoId} nao encontrada`);

  const paciente = rows<PacRow>(await db.execute(sql`
    SELECT id, nome, cpf, codigo_semantico, data_nascimento::text, genero, whatsapp, telefone
    FROM pacientes WHERE id = ${sessao.paciente_id} LIMIT 1
  `))[0];
  if (!paciente) throw new Error(`Paciente ${sessao.paciente_id} nao encontrado`);

  const unidadeId = sessao.unidade_id ?? 15;
  const unidade = rows<UniRow>(await db.execute(sql`
    SELECT id, nome, endereco, bairro, cep, cidade, estado
    FROM unidades WHERE id = ${unidadeId} LIMIT 1
  `))[0] ?? { id: unidadeId, nome: "Instituto Padua", endereco: null, bairro: null, cep: null, cidade: null, estado: null };

  // Profissional canonico: override explicito > sessoes.profissional_id > erro.
  // Nao usamos fallback hardcoded de medico (risco juridico-documental).
  const profissionalId = opts?.profissionalId ?? sessao.profissional_id;
  if (!profissionalId) {
    throw new Error(`Sessao ${sessaoId} sem profissional_id e nenhum override fornecido. Defina sessoes.profissional_id ou passe opts.profissionalId explicitamente.`);
  }
  const profissional = rows<UsuRow>(await db.execute(sql`
    SELECT id, nome, crm, perfil
    FROM usuarios WHERE id = ${profissionalId} LIMIT 1
  `))[0];
  if (!profissional) {
    throw new Error(`Profissional ${profissionalId} nao encontrado em usuarios.`);
  }

  const formulasRaw = rows<FormulaRow>(await db.execute(sql`
    SELECT id, nome, dose, posologia, indicacao_clinica, componentes_formula, data_inicio_uso::text
    FROM revo_medicamentos
    WHERE paciente_id = ${paciente.id}
      AND tipo_med = 'formula'
      AND status_atual IN ('em_uso', 'iniciando')
    ORDER BY id DESC
  `));
  const formulas: FormulaManipuladaItem[] = formulasRaw.map(f => ({
    id: f.id,
    nome: f.nome,
    dose: f.dose,
    posologia: f.posologia,
    indicacaoClinica: f.indicacao_clinica,
    duracaoDescricao: inferirDuracao(f),
    componentes: f.componentes_formula,
  }));

  const aplicacoesRaw = rows<AplRow>(await db.execute(sql`
    SELECT a.id,
           s.nome AS substancia_nome,
           a.dose,
           s.via,
           s.categoria,
           a.numero_sessao,
           a.total_sessoes,
           s.preco_referencia
    FROM aplicacoes_substancias a
    JOIN substancias s ON s.id = a.substancia_id
    WHERE a.sessao_id = ${sessaoId}
    ORDER BY s.via, a.id
  `));
  const aplicacoesIm: AplicacaoItem[] = [];
  const aplicacoesEv: AplicacaoItem[] = [];
  const outras: AplicacaoItem[] = [];
  for (const a of aplicacoesRaw) {
    const item: AplicacaoItem = {
      id: a.id,
      substanciaNome: a.substancia_nome,
      dose: a.dose,
      via: a.via,
      categoria: a.categoria,
      numeroSessao: a.numero_sessao,
      totalSessoes: a.total_sessoes,
      precoReferencia: a.preco_referencia,
    };
    const via = a.via.toLowerCase();
    if (via === "im" || via.includes("intramuscular")) aplicacoesIm.push(item);
    else if (via === "ev" || via === "iv" || via.includes("endovenos")) aplicacoesEv.push(item);
    else outras.push(item);
  }

  // Financeiro: referencial (somatorio preco_referencia das substancias + nota
  // sobre formula manipulada nao precificada centralmente). Nao e cobranca.
  const itens: ResumoFinanceiro["itens"] = [
    ...formulas.map(f => ({ descricao: `Formula manipulada — ${f.nome}`, precoReferencia: null })),
    ...aplicacoesRaw.map(a => ({ descricao: `${a.substancia_nome} (${a.dose}, via ${a.via.toUpperCase()})`, precoReferencia: a.preco_referencia })),
  ];
  const somaSubs = aplicacoesRaw
    .map(a => a.preco_referencia ?? 0)
    .reduce((s, v) => s + v, 0);
  const totalReferencia = somaSubs > 0 ? somaSubs : null;
  const financeiro: ResumoFinanceiro = {
    itens,
    totalReferencia,
    observacao: "Valores de referencia. Cobranca efetiva conforme contrato comercial assinado em apartado.",
  };

  return {
    sessao: {
      id: sessao.id,
      pacienteId: sessao.paciente_id,
      unidadeId: sessao.unidade_id,
      dataAgendada: sessao.data_agendada,
      status: sessao.status,
    },
    paciente: {
      id: paciente.id,
      nome: paciente.nome,
      cpf: paciente.cpf,
      codigoSemantico: paciente.codigo_semantico,
      dataNascimento: paciente.data_nascimento,
      genero: paciente.genero,
      whatsapp: paciente.whatsapp,
      telefone: paciente.telefone,
    },
    unidade: {
      id: unidade.id,
      nome: unidade.nome,
      endereco: unidade.endereco,
      bairro: unidade.bairro,
      cep: unidade.cep,
      cidade: unidade.cidade,
      estado: unidade.estado,
    },
    profissional: {
      id: profissional.id,
      nome: profissional.nome,
      crm: profissional.crm,
      perfil: profissional.perfil,
    },
    formulas,
    aplicacoesIm,
    aplicacoesEv,
    outrasAplicacoes: outras,
    financeiro,
  };
}
