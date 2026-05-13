/**
 * Formatadores canônicos — Wave Cadastro Pádua (13/mai/2026)
 *
 * Princípio: banco guarda SÓ DÍGITOS (canônico). UI/integrações formatam
 * na hora de exportar pra cada gateway.
 *
 * Cada API/ferramenta tem regra própria. Esse módulo é o ÚNICO lugar do
 * sistema que sabe traduzir entre canônico e formato-de-cada-destino.
 */

// ============================================================================
// CPF
// ============================================================================
export function cpfCanonico(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 11) return null;
  return digits;
}

export function cpfValidoComDigitoVerificador(cpf: string | null | undefined): boolean {
  const c = cpfCanonico(cpf);
  if (!c) return false;
  if (/^(\d)\1{10}$/.test(c)) return false; // 11111111111, etc
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(c[i]) * (10 - i);
  let dv1 = (soma * 10) % 11;
  if (dv1 === 10) dv1 = 0;
  if (dv1 !== parseInt(c[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(c[i]) * (11 - i);
  let dv2 = (soma * 10) % 11;
  if (dv2 === 10) dv2 = 0;
  return dv2 === parseInt(c[10]);
}

export function cpfFormatadoUI(cpfCanon: string | null): string | null {
  if (!cpfCanon || cpfCanon.length !== 11) return cpfCanon;
  return `${cpfCanon.slice(0, 3)}.${cpfCanon.slice(3, 6)}.${cpfCanon.slice(6, 9)}-${cpfCanon.slice(9)}`;
}

export function cpfParaAsaas(cpfCanon: string | null): string | null {
  // Asaas aceita os dois; mando puro pra simplicidade
  return cpfCanon;
}

export function cpfParaStripe(cpfCanon: string | null): string | null {
  // Stripe usa tax_id BR_CPF formatado
  return cpfFormatadoUI(cpfCanon);
}

// ============================================================================
// TELEFONE / WHATSAPP
// ============================================================================
/**
 * Canônico: só dígitos, com DDI 55 na frente, sem +.
 * Aceita entrada em qualquer formato e normaliza.
 *  - "11999998888" → "5511999998888" (assume Brasil)
 *  - "+55 11 99999-8888" → "5511999998888"
 *  - "5511999998888" → "5511999998888"
 *  - "1124323854" (fixo SP 8 dígitos) → "551124323854"
 */
export function telefoneCanonico(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/\D/g, "");
  if (d.length === 0) return null;
  // Se já vem com 55 na frente e tamanho coerente, aceita
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  // Se vem sem DDI e tamanho coerente (10 fixo, 11 móvel), prepende 55
  if (d.length === 10 || d.length === 11) return `55${d}`;
  // Outros formatos (DDI estrangeiro, número curto, etc.) — guarda como veio
  return d.length >= 8 ? d : null;
}

export function telefoneFormatadoUI(telCanon: string | null): string | null {
  if (!telCanon) return null;
  // Espera 5511999998888 (móvel) ou 551124323854 (fixo)
  if (telCanon.startsWith("55") && telCanon.length === 13) {
    const ddd = telCanon.slice(2, 4);
    const p1 = telCanon.slice(4, 9);
    const p2 = telCanon.slice(9);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }
  if (telCanon.startsWith("55") && telCanon.length === 12) {
    const ddd = telCanon.slice(2, 4);
    const p1 = telCanon.slice(4, 8);
    const p2 = telCanon.slice(8);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }
  return `+${telCanon}`;
}

export function telefoneParaWhatsapp(telCanon: string | null): string | null {
  // WhatsApp Business API e Gupshup: só dígitos, sem +
  return telCanon;
}

export function telefoneParaTwilio(telCanon: string | null): string | null {
  // Twilio: E.164 com +
  if (!telCanon) return null;
  return `+${telCanon}`;
}

export function telefoneParaStripe(telCanon: string | null): string | null {
  // Stripe phone: E.164 com +
  if (!telCanon) return null;
  return `+${telCanon}`;
}

export function telefoneParaAsaas(telCanon: string | null): string | null {
  // Asaas mobilePhone: aceita formatado "(11) 99999-8888" sem DDI
  if (!telCanon) return null;
  if (telCanon.startsWith("55") && telCanon.length === 13) {
    const ddd = telCanon.slice(2, 4);
    const p1 = telCanon.slice(4, 9);
    const p2 = telCanon.slice(9);
    return `(${ddd}) ${p1}-${p2}`;
  }
  if (telCanon.startsWith("55") && telCanon.length === 12) {
    const ddd = telCanon.slice(2, 4);
    const p1 = telCanon.slice(4, 8);
    const p2 = telCanon.slice(8);
    return `(${ddd}) ${p1}-${p2}`;
  }
  return telCanon;
}

// ============================================================================
// CEP
// ============================================================================
export function cepCanonico(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = input.replace(/\D/g, "");
  if (d.length !== 8) return null;
  return d;
}

export function cepFormatadoUI(cepCanon: string | null): string | null {
  if (!cepCanon || cepCanon.length !== 8) return cepCanon;
  return `${cepCanon.slice(0, 5)}-${cepCanon.slice(5)}`;
}

// ============================================================================
// EMAIL — normalização defensiva
// ============================================================================
export function emailCanonico(input: string | null | undefined): string | null {
  if (!input) return null;
  const t = input.trim().toLowerCase();
  // validação mínima — não usa regex complexo, só estrutura
  if (!t.includes("@") || !t.includes(".") || t.length < 5) return null;
  return t;
}

// ============================================================================
// VALOR MONETÁRIO
// ============================================================================
/**
 * Formato pra nomenclatura de arquivos no Drive: $1950.20
 * - sempre 2 casas decimais
 * - separador decimal: ponto
 * - sem separador de milhar
 * - sem espaço
 */
export function valorParaNomeArquivo(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "$0.00";
  const n = typeof valor === "number" ? valor : parseFloat(String(valor).replace(",", "."));
  if (isNaN(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export function valorBRL(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "R$ 0,00";
  const n = typeof valor === "number" ? valor : parseFloat(String(valor).replace(",", "."));
  if (isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
