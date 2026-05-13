/**
 * Gerador de código semântico interno do paciente.
 *
 * Wave Cadastro Pádua — 13/mai/2026
 * Decisão Caio: código curto, único, humano-legível, NÃO é divulgado externamente.
 *
 * Formato: SLUGCLINICA-SOBR-NOME-SEXO-AAAA-DDDD
 *
 * Exemplo: PADU-VIEI-ACEL-FEMI-1945-8420
 *
 * Regras:
 *  - 4 letras iniciais do nome principal da clínica (slug em unidades.slug_codigo_semantico)
 *  - 4 primeiras letras do ÚLTIMO sobrenome (pula partículas DA/DE/DO/DAS/DOS/E/DI/DU/DELLA/VAN/VON)
 *  - 4 primeiras letras do PRIMEIRO nome
 *  - Sexo: MASC / FEMI / OUTR / NINF
 *  - Ano nascimento (4 dígitos) ou XXXX
 *  - 4 ÚLTIMOS dígitos do CPF ou XXXX
 *  - Tudo MAIÚSCULO, sem acento, sem caractere especial
 *  - Nomes/sobrenomes < 4 letras: completar com X (Caio aprovou 13/mai/2026)
 */

const PARTICULAS = new Set([
  "DA", "DE", "DO", "DAS", "DOS", "E",
  "DI", "DU", "DELLA", "DEL", "DELLE", "DELLI",
  "VAN", "VON", "LA", "LE", "DA-",
]);

export function removerAcentos(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacríticos
    .replace(/[ÇçÐð]/g, (ch) => (ch.toLowerCase() === "ç" ? "c" : "d"));
}

export function limparTexto(s: string): string {
  return removerAcentos(s)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ") // só letras, dígitos, espaço
    .replace(/\s+/g, " ")
    .trim();
}

export function completarOuTruncar(s: string, n: number, fill = "X"): string {
  if (s.length >= n) return s.slice(0, n);
  return s + fill.repeat(n - s.length);
}

/**
 * Quebra nome completo em [primeiroNome, ultimoSobrenomeReal].
 * - Pula partículas (DA, DE, DO, DAS, DOS, E)
 * - Se nome tem só 1 palavra: usa ela em ambos
 * - Se nome tem 2+: primeira é nome, última (não-partícula) é sobrenome
 */
export function dividirNome(nomeCompleto: string): { primeiro: string; ultimo: string } {
  const limpo = limparTexto(nomeCompleto);
  const palavras = limpo.split(" ").filter((p) => p.length > 0);
  if (palavras.length === 0) return { primeiro: "XXXX", ultimo: "XXXX" };
  if (palavras.length === 1) return { primeiro: palavras[0], ultimo: palavras[0] };

  const primeiro = palavras[0];

  // procura último sobrenome NÃO-partícula
  let ultimo = "";
  for (let i = palavras.length - 1; i >= 1; i--) {
    if (!PARTICULAS.has(palavras[i])) {
      ultimo = palavras[i];
      break;
    }
  }
  if (!ultimo) ultimo = palavras[palavras.length - 1]; // fallback: pega último mesmo se for partícula

  return { primeiro, ultimo };
}

export function mapearSexo(sexo: string | null | undefined): "MASC" | "FEMI" | "OUTR" | "NINF" {
  if (!sexo) return "NINF";
  const s = removerAcentos(sexo).toUpperCase().trim();
  if (s.startsWith("M")) return "MASC";
  if (s.startsWith("F")) return "FEMI";
  if (s === "OUTRO" || s === "OUTR" || s === "O") return "OUTR";
  return "NINF";
}

export function extrairAnoNascimento(input: string | Date | null | undefined): string {
  if (!input) return "XXXX";
  if (input instanceof Date) {
    const y = input.getFullYear();
    return y >= 1900 && y <= 2100 ? String(y) : "XXXX";
  }
  const s = String(input).trim();
  // formatos aceitos: dd/mm/aaaa, aaaa-mm-dd, dd-mm-aaaa, aaaa/mm/dd
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); // dd/mm/aaaa
  if (m1) return m1[3];
  const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/); // aaaa-mm-dd
  if (m2) return m2[1];
  // tenta Date.parse como fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    if (y >= 1900 && y <= 2100) return String(y);
  }
  return "XXXX";
}

export function extrair4UltimosDigitosCPF(cpf: string | null | undefined): string {
  if (!cpf) return "XXXX";
  const d = cpf.replace(/\D/g, "");
  if (d.length < 4) return "XXXX";
  return d.slice(-4);
}

export interface GerarCodigoParams {
  slugClinica: string; // ex: "PADU" (vem de unidades.slug_codigo_semantico)
  nomeCompleto: string;
  sexo?: string | null;
  dataNascimento?: string | Date | null;
  cpf?: string | null;
}

export function gerarCodigoSemantico(p: GerarCodigoParams): string {
  const slug = completarOuTruncar(limparTexto(p.slugClinica).replace(/\s+/g, ""), 4);
  const { primeiro, ultimo } = dividirNome(p.nomeCompleto);
  const sobr = completarOuTruncar(ultimo, 4);
  const nome = completarOuTruncar(primeiro, 4);
  const sexo = mapearSexo(p.sexo);
  const ano = extrairAnoNascimento(p.dataNascimento ?? null);
  const cpf4 = extrair4UltimosDigitosCPF(p.cpf ?? null);

  // Separador = espaço (Caio 13/mai/2026 madrugada: medo de hífen/underline em filenames)
  return `${slug} ${sobr} ${nome} ${sexo} ${ano} ${cpf4}`;
}
