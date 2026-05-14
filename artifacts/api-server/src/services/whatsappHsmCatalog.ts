/**
 * Catálogo de templates HSM (High Structured Message) aprovados pelo Meta
 * que o motor PAWARDS sabe disparar via Twilio Content SID ou Gupshup
 * Template ID.
 *
 * Cada entrada define:
 *  - `nome`  : chave usada em `whatsapp_config.metadados.hsmTemplates[<nome>]`
 *  - `descricao` : pra explicar pro time operacional o que esse HSM é
 *  - `variaveis` : ordem natural + exemplos pra preencher no "Testar envio"
 *
 * A ordem `ordemVariaveis` salva pelo usuário sobrescreve a ordem natural;
 * quando o usuário não definir nada, usamos `variaveis[].chave` como
 * fallback. Ver `docs/operacoes/whatsapp-hsm-clinica-suspensao.md`.
 */
export interface HsmTemplateVariavel {
  chave: string;
  descricao: string;
  exemplo: string;
}

export interface HsmTemplateDefinicao {
  nome: string;
  descricao: string;
  variaveis: HsmTemplateVariavel[];
}

export const HSM_TEMPLATES_CATALOGO: HsmTemplateDefinicao[] = [
  {
    nome: "CLINICA_SUSPENSA",
    descricao:
      "Aviso aos responsáveis (CEO, validador mestre, tenant_admin) quando uma clínica é suspensa fora do horário comercial.",
    variaveis: [
      { chave: "unidadeNome", descricao: "Nome da unidade suspensa", exemplo: "Instituto Pádua" },
      { chave: "suspensoEm", descricao: "Data/hora da suspensão (DD/MM/AAAA HH:MM)", exemplo: "13/05/2026 14:32" },
      { chave: "motivo", descricao: "Motivo da suspensão", exemplo: "Inadimplência > 30 dias" },
      { chave: "contatoRecurso", descricao: "Contato para recurso", exemplo: "Dr. Caio (11) 99999-9999" },
    ],
  },
  {
    nome: "CLINICA_REATIVADA",
    descricao:
      "Aviso aos responsáveis quando uma clínica volta ao ar após suspensão.",
    variaveis: [
      { chave: "unidadeNome", descricao: "Nome da unidade reativada", exemplo: "Instituto Pádua" },
      { chave: "reativadoEm", descricao: "Data/hora da reativação", exemplo: "15/05/2026 09:10" },
      { chave: "motivo", descricao: "Motivo da reativação", exemplo: "Pagamento confirmado" },
    ],
  },
  {
    nome: "CLINICA_SUSPENSA_PACIENTE",
    descricao:
      "Aviso ao paciente quando a consulta dele é cancelada por suspensão da clínica.",
    variaveis: [
      { chave: "pacienteNome", descricao: "Primeiro nome do paciente", exemplo: "Maria" },
      { chave: "unidadeNome", descricao: "Nome da unidade", exemplo: "Instituto Pádua" },
      { chave: "consultaQuando", descricao: "Quando seria a consulta afetada", exemplo: "20/05/2026 14:00" },
      { chave: "contatoRecurso", descricao: "Contato para reagendar", exemplo: "Dr. Caio (11) 99999-9999" },
    ],
  },
];

export function obterHsmTemplateDefinicao(nome: string): HsmTemplateDefinicao | undefined {
  return HSM_TEMPLATES_CATALOGO.find((t) => t.nome === nome);
}
