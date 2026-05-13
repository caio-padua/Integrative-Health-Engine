/**
 * Catálogo central de tipos de documento + gerador de nomenclatura universal.
 *
 * Wave Cadastro Pádua — 13/mai/2026
 * Decisão Caio: TUDO MAIÚSCULO, sem acento, sem caractere especial.
 * Formato universal: YY.MM.DD TIPO [IDENT] CODIGO_SEMANTICO NOME-PACIENTE.ext
 *
 * Caio aprovou (13/mai/2026 madrugada): incluir nome do paciente mesmo
 * sendo redundante, "pra pecar pelo excesso e nao pela falta".
 *
 * Adicionar novo tipo de documento? Só adicionar em TIPOS_DOCUMENTO abaixo.
 */

import { removerAcentos, limparTexto, completarOuTruncar } from "./codigoSemantico";
import { valorParaNomeArquivo } from "../format/canonico";

// ============================================================================
// CATEGORIAS (7 macro-pastas) + SUBCATEGORIAS (TOC-friendly)
// ============================================================================
export const CATEGORIAS = {
  CADASTRO:    { ordem: 1, nome: "01 CADASTRO" },
  CLINICO:     { ordem: 2, nome: "02 CLINICO" },
  PRESCRICOES: { ordem: 3, nome: "03 PRESCRICOES" },
  FINANCEIRO:  { ordem: 4, nome: "04 FINANCEIRO" },
  JURIDICO:    { ordem: 5, nome: "05 JURIDICO" },
  IMAGENS:     { ordem: 6, nome: "06 IMAGENS" },
  PESQUISA:    { ordem: 7, nome: "07 PESQUISA" },
} as const;

export const SUBCATEGORIAS: Record<string, string[]> = {
  "01 CADASTRO":    ["DOCUMENTOS PESSOAIS", "CADASTROS ANTIGOS"],
  "02 CLINICO":     ["PATOLOGIAS", "ANAMNESES", "SEGUIMENTO", "EXAMES/LABORATORIAIS", "EXAMES/IMAGEM", "AVALIACOES", "RAS", "GPS"],
  "03 PRESCRICOES": ["RECEITAS", "PROTOCOLOS", "ATESTADOS", "LAUDOS"],
  "04 FINANCEIRO":  ["NOTAS FISCAIS", "COBRANCAS", "COMPROVANTES"],
  "05 JURIDICO":    ["CONTRATOS", "TERMOS", "ASSINATURAS ZAPSIGN", "PROCESSOS", "OUVIDORIA"],
  "06 IMAGENS":     ["FOTO PERFIL", "FOTOS CORPORAIS", "IMAGENS DIVERSAS"],
  "07 PESQUISA":    [],
};

/**
 * Lista PLANA das pastas (categoria + subcategoria) que serão criadas
 * lazy quando um arquivo daquela categoria for inserido pela primeira vez.
 *
 * Usada pelo refactor de google-drive.ts (lazy create).
 */
export function listarTodasSubpastas(): Array<{ categoria: string; subcategoria: string | null }> {
  const result: Array<{ categoria: string; subcategoria: string | null }> = [];
  for (const cat of Object.keys(SUBCATEGORIAS)) {
    result.push({ categoria: cat, subcategoria: null }); // a categoria-mãe
    for (const sub of SUBCATEGORIAS[cat]) {
      result.push({ categoria: cat, subcategoria: sub });
    }
  }
  return result;
}

// ============================================================================
// TIPOS DE DOCUMENTO — catálogo completo
// ============================================================================
export interface TipoDocumentoConfig {
  categoria: string;        // ex: "02 CLINICO"
  subcategoria: string;     // ex: "RAS" ou "EXAMES/LABORATORIAIS"
  label: string;            // texto que aparece no nome do arquivo (ex: "RAS")
  requerIdentificador?: boolean; // se true, gerarNomeArquivo exige `identificador`
  requerValor?: boolean;    // se true, gerarNomeArquivo exige `valor`
  extensaoPadrao: string;   // "pdf", "jpg", "sheet"
}

export const TIPOS_DOCUMENTO: Record<string, TipoDocumentoConfig> = {
  // CLINICO
  RAS:                  { categoria: "02 CLINICO",     subcategoria: "RAS",                  label: "RAS",                                     extensaoPadrao: "pdf" },
  ANAMNESE:             { categoria: "02 CLINICO",     subcategoria: "ANAMNESES",            label: "ANAMNESE",                                extensaoPadrao: "pdf" },
  EXAME_LAB:            { categoria: "02 CLINICO",     subcategoria: "EXAMES/LABORATORIAIS", label: "EXAME LAB",        requerIdentificador: true, extensaoPadrao: "pdf" },
  EXAME_IMG:            { categoria: "02 CLINICO",     subcategoria: "EXAMES/IMAGEM",        label: "EXAME IMG",        requerIdentificador: true, extensaoPadrao: "pdf" },
  AVALIACAO:            { categoria: "02 CLINICO",     subcategoria: "AVALIACOES",           label: "AVALIACAO",        requerIdentificador: true, extensaoPadrao: "pdf" },
  GPS_PLANILHA:         { categoria: "02 CLINICO",     subcategoria: "GPS",                  label: "GPS LINHA VIDA",                          extensaoPadrao: "sheet" },
  PATOLOGIA:            { categoria: "02 CLINICO",     subcategoria: "PATOLOGIAS",           label: "PATOLOGIA",        requerIdentificador: true, extensaoPadrao: "pdf" },
  SEGUIMENTO:           { categoria: "02 CLINICO",     subcategoria: "SEGUIMENTO",           label: "SEGUIMENTO",                              extensaoPadrao: "pdf" },

  // PRESCRICOES
  RECEITA_SIMPLES:      { categoria: "03 PRESCRICOES", subcategoria: "RECEITAS",             label: "RECEITA SIMPLES",                         extensaoPadrao: "pdf" },
  RECEITA_CONTROLADA:   { categoria: "03 PRESCRICOES", subcategoria: "RECEITAS",             label: "RECEITA CONTROLADA",                      extensaoPadrao: "pdf" },
  RECEITA_MANIPULADA:   { categoria: "03 PRESCRICOES", subcategoria: "RECEITAS",             label: "RECEITA MANIPULADA",                      extensaoPadrao: "pdf" },
  PROTOCOLO:            { categoria: "03 PRESCRICOES", subcategoria: "PROTOCOLOS",           label: "PROTOCOLO",        requerIdentificador: true, extensaoPadrao: "pdf" },
  ATESTADO:             { categoria: "03 PRESCRICOES", subcategoria: "ATESTADOS",            label: "ATESTADO",         requerIdentificador: true, extensaoPadrao: "pdf" },
  LAUDO:                { categoria: "03 PRESCRICOES", subcategoria: "LAUDOS",               label: "LAUDO",            requerIdentificador: true, extensaoPadrao: "pdf" },

  // FINANCEIRO
  NF:                   { categoria: "04 FINANCEIRO",  subcategoria: "NOTAS FISCAIS",        label: "NF",               requerValor: true,         extensaoPadrao: "pdf" },
  COBRANCA:             { categoria: "04 FINANCEIRO",  subcategoria: "COBRANCAS",            label: "COBRANCA",         requerValor: true, requerIdentificador: true, extensaoPadrao: "pdf" },
  COMPROVANTE:          { categoria: "04 FINANCEIRO",  subcategoria: "COMPROVANTES",         label: "COMPROVANTE",      requerValor: true, requerIdentificador: true, extensaoPadrao: "pdf" },
  RECIBO:               { categoria: "04 FINANCEIRO",  subcategoria: "COMPROVANTES",         label: "RECIBO",           requerValor: true,         extensaoPadrao: "pdf" },

  // JURIDICO
  PARQ_ASSINADO:        { categoria: "05 JURIDICO",    subcategoria: "CONTRATOS",            label: "PARQ ASSINADO",                           extensaoPadrao: "pdf" },
  CONTRATO_TERAPEUTICO: { categoria: "05 JURIDICO",    subcategoria: "CONTRATOS",            label: "CONTRATO",         requerValor: true,         extensaoPadrao: "pdf" },
  ORCAMENTO_FARMA:      { categoria: "05 JURIDICO",    subcategoria: "CONTRATOS",            label: "ORCAMENTO",        requerValor: true,         extensaoPadrao: "pdf" },
  TCLE:                 { categoria: "05 JURIDICO",    subcategoria: "TERMOS",               label: "TCLE",             requerIdentificador: true, extensaoPadrao: "pdf" },
  LGPD:                 { categoria: "05 JURIDICO",    subcategoria: "TERMOS",               label: "LGPD CONSENTIMENTO",                       extensaoPadrao: "pdf" },
  ENVELOPE_ZAPSIGN:     { categoria: "05 JURIDICO",    subcategoria: "ASSINATURAS ZAPSIGN",  label: "ENVELOPE",         requerIdentificador: true, extensaoPadrao: "pdf" },

  // IMAGENS
  FOTO_PERFIL:          { categoria: "06 IMAGENS",     subcategoria: "FOTO PERFIL",          label: "FOTO PERFIL",                             extensaoPadrao: "jpg" },
  FOTO_CORPORAL:        { categoria: "06 IMAGENS",     subcategoria: "FOTOS CORPORAIS",      label: "FOTO CORPORAL",    requerIdentificador: true, extensaoPadrao: "jpg" },

  // CADASTRO (documentos pessoais)
  RG:                   { categoria: "01 CADASTRO",    subcategoria: "DOCUMENTOS PESSOAIS",  label: "RG",                                      extensaoPadrao: "jpg" },
  CPF_DOC:              { categoria: "01 CADASTRO",    subcategoria: "DOCUMENTOS PESSOAIS",  label: "CPF",                                     extensaoPadrao: "jpg" },
  COMPROVANTE_ENDERECO: { categoria: "01 CADASTRO",    subcategoria: "DOCUMENTOS PESSOAIS",  label: "COMP ENDERECO",                           extensaoPadrao: "jpg" },
} as const;

export type TipoDocumento = keyof typeof TIPOS_DOCUMENTO;

// ============================================================================
// TIPOS GENÉRICOS DE EXAME LAB (Caio pediu 13/mai)
// ============================================================================
export const TIPOS_EXAME_LAB = [
  "BIOQUIMICA",
  "HEMOGRAMA",
  "HORMONAL",
  "COAGULOGRAMA",
  "URINA",
  "FEZES",
  "MICROBIOLOGIA",
  "IMUNOLOGIA",
  "GENETICA",
  "VITAMINAS",
  "MINERAIS",
  "MARCADORES_TUMORAIS",
  "OUTROS",
] as const;

// ============================================================================
// GERADOR DE NOMENCLATURA UNIVERSAL
// ============================================================================
export interface GerarNomeParams {
  tipo: TipoDocumento;
  data?: Date;                  // default = agora
  identificador?: string;       // ex: "BIOQUIMICA", "RHODIOLA", "3 DIAS"
  valor?: number | string;      // R$ — vira "$1950.20"
  codigoSemantico: string;      // ex: "PADU-VIEI-ACEL-FEMI-1945-8420"
  nomePaciente: string;         // ex: "ACELI GOMES VIEIRA" — Caio pediu 13/mai
  extensaoOverride?: string;    // se quer outra extensão (ex: "png" em vez de "jpg")
}

function dataYYMMDD(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

function nomePacienteParaArquivo(nome: string): string {
  // limpa acento, cap, sem caractere especial. Mantém espaços entre palavras.
  return removerAcentos(nome)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function identificadorParaArquivo(s: string): string {
  return removerAcentos(s)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function gerarNomeArquivo(p: GerarNomeParams): string {
  const cfg = TIPOS_DOCUMENTO[p.tipo];
  if (!cfg) throw new Error(`[catalogo] Tipo de documento desconhecido: ${p.tipo}`);

  if (cfg.requerIdentificador && !p.identificador) {
    throw new Error(`[catalogo] Tipo ${p.tipo} exige identificador (ex: BIOQUIMICA, RHODIOLA, etc.)`);
  }
  if (cfg.requerValor && (p.valor === undefined || p.valor === null)) {
    throw new Error(`[catalogo] Tipo ${p.tipo} exige valor (R$)`);
  }

  const data = dataYYMMDD(p.data ?? new Date());
  const tokens: string[] = [data, cfg.label];

  if (p.identificador) tokens.push(identificadorParaArquivo(p.identificador));
  if (p.valor !== undefined && p.valor !== null) tokens.push(valorParaNomeArquivo(p.valor));

  tokens.push(p.codigoSemantico.toUpperCase());
  tokens.push(nomePacienteParaArquivo(p.nomePaciente));

  const ext = p.extensaoOverride ?? cfg.extensaoPadrao;
  return `${tokens.join(" ")}.${ext}`;
}

/**
 * Versão sem extensão (útil pra Google Sheets, que não usa extensão no nome).
 */
export function gerarNomeSemExtensao(p: Omit<GerarNomeParams, "extensaoOverride">): string {
  const nome = gerarNomeArquivo(p);
  return nome.replace(/\.[^.]+$/, "");
}

/**
 * Helper que devolve a config + nome em uma só chamada (uso preguiçoso).
 */
export function preparar(p: GerarNomeParams): {
  nome: string;
  categoria: string;
  subcategoria: string;
  tipoLabel: string;
} {
  const cfg = TIPOS_DOCUMENTO[p.tipo];
  return {
    nome: gerarNomeArquivo(p),
    categoria: cfg.categoria,
    subcategoria: cfg.subcategoria,
    tipoLabel: cfg.label,
  };
}
