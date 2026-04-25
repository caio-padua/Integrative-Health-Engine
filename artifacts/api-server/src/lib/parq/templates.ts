// PAWARDS MEDCORE · Wave 9 PARQ · 9 templates de comunicação
// Aplicação: e-mail (HTML) + WhatsApp (texto puro com emoji opcional).
// Variáveis: {{farmacia}}, {{clinica}}, {{numero_serie}}, {{prazo}}, {{link}}, {{score}}, {{status_anterior}}, {{status_novo}}.
// Substituição via render(template, vars).

export type CanalComunicacao = "email" | "whatsapp" | "sms";

export interface TemplatePARQ {
  codigo: string;
  canal: CanalComunicacao;
  assunto: string | null; // só email
  corpo: string;
}

export const TEMPLATES_PARQ: Record<string, TemplatePARQ> = {
  // 1. Emissão de PARQ — para a farmácia (canal: email)
  emissao_parq_farmacia: {
    codigo: "emissao_parq_farmacia",
    canal: "email",
    assunto: "Termo de Parceria de Qualidade Técnica · {{numero_serie}}",
    corpo: `Prezada {{farmacia}},

A clínica {{clinica}} acaba de emitir o Termo PARQ nº {{numero_serie}} para formalizar nossa parceria técnica.

Acesse o termo para revisão e assinatura:
{{link}}

A parceria PARQ inclui:
• Visitas técnicas bimestrais (auditoria Kaizen)
• Plano de ação para qualquer não-conformidade
• Classificação Gold/Silver/Bronze por qualidade técnica

A contraprestação técnica está vinculada ao serviço de auditoria, conforme CC arts. 593-609. Não há acordo de comissão por indicação (CFM 2.386/2024).

Atenciosamente,
Equipe {{clinica}}`,
  },

  // 2. Assinatura pendente da clínica (lembrete interno)
  assinatura_clinica_pendente: {
    codigo: "assinatura_clinica_pendente",
    canal: "email",
    assunto: "Assinatura ICP-Brasil pendente · PARQ {{numero_serie}}",
    corpo: `O Termo PARQ nº {{numero_serie}} aguarda sua assinatura ICP-Brasil há mais de 48 horas.

Por favor, acesse {{link}} e conclua a assinatura digital para que a farmácia possa formalizar a contraparte.`,
  },

  // 3. Assinatura confirmada (notifica farmácia que clínica assinou)
  assinatura_clinica_confirmada: {
    codigo: "assinatura_clinica_confirmada",
    canal: "email",
    assunto: "✓ Clínica assinou · PARQ {{numero_serie}} pronto para sua assinatura",
    corpo: `A clínica {{clinica}} acaba de assinar o Termo PARQ nº {{numero_serie}} via certificado ICP-Brasil.

Sua assinatura é o último passo para vigência do acordo. Você pode usar:
• Aceite eletrônico simples (IP + geolocalização)
• Foto do RG digital
• Vídeo-selfie biométrico
• PIN enviado por SMS
• Certificado ICP-Brasil

Acesse: {{link}}`,
  },

  // 4. Visita Kaizen próxima (5 dias antes do prazo)
  visita_proxima: {
    codigo: "visita_proxima",
    canal: "email",
    assunto: "Visita Kaizen agendada · {{farmacia}} em {{prazo}}",
    corpo: `Prezada {{farmacia}},

Sua próxima visita técnica de auditoria Kaizen está agendada para {{prazo}}.

A visita verifica 5 categorias (insumos, processamento, atendimento, entrega, qualidade geral) totalizando 10 itens com nota 1-5 cada.

Confirmação: {{link}}`,
  },

  // 5. Visita Kaizen atrasada (alerta para a clínica)
  visita_atrasada: {
    codigo: "visita_atrasada",
    canal: "email",
    assunto: "⚠ Visita Kaizen atrasada · {{farmacia}}",
    corpo: `A farmácia parceira {{farmacia}} está com a visita Kaizen atrasada (último check-in há mais de 75 dias).

Status alterado automaticamente para "Em Correção". Restauração somente após nova visita.

Agendar visita: {{link}}`,
  },

  // 6. Plano Kaizen aberto (notifica farmácia)
  plano_kaizen_aberto: {
    codigo: "plano_kaizen_aberto",
    canal: "email",
    assunto: "Plano de ação Kaizen aberto · prazo {{prazo}}",
    corpo: `Após visita técnica recente, foi aberto um plano de ação Kaizen para sanear não-conformidade(s).

Prazo limite: {{prazo}}
Detalhes e upload de evidência: {{link}}

A não-apresentação de evidência até o prazo limite acarretará suspensão automática do PARQ.`,
  },

  // 7. Plano próximo do vencimento (3 dias antes)
  plano_proximo_vencimento: {
    codigo: "plano_proximo_vencimento",
    canal: "email",
    assunto: "⏰ Plano Kaizen vence em 3 dias · {{farmacia}}",
    corpo: `O plano de ação Kaizen aberto após sua última visita vence em 3 dias ({{prazo}}).

Por favor, anexe a evidência de saneamento o quanto antes para evitar suspensão automática do acordo PARQ.

Acessar: {{link}}`,
  },

  // 8. Suspensão automática
  suspensao_acordo: {
    codigo: "suspensao_acordo",
    canal: "email",
    assunto: "🛑 PARQ suspenso · {{farmacia}}",
    corpo: `O Termo PARQ {{numero_serie}} foi suspenso automaticamente.

Motivo: plano Kaizen vencido sem evidência de saneamento.

Para restauração, é necessário:
1. Apresentar evidência completa do plano vencido
2. Realizar nova visita Kaizen com média ≥ 3.5
3. Solicitar restauração via {{link}}

Contato: transparencia@pawards.com.br`,
  },

  // 9. Restauração de acordo (pós-saneamento)
  restauracao_acordo: {
    codigo: "restauracao_acordo",
    canal: "email",
    assunto: "✓ PARQ restaurado · {{farmacia}}",
    corpo: `Após validação técnica, o Termo PARQ {{numero_serie}} foi restaurado.

Status anterior: {{status_anterior}}
Novo status: {{status_novo}}
Score atual: {{score}}/5.0

Próxima visita Kaizen agendada conforme calendário bimestral.`,
  },
};

/**
 * Substitui {{var}} no corpo + assunto pelas chaves do `vars`.
 * Variáveis ausentes ficam como "—".
 */
export function renderTemplate(
  codigo: string,
  vars: Record<string, string | number | null | undefined>,
): { assunto: string | null; corpo: string } | null {
  const tpl = TEMPLATES_PARQ[codigo];
  if (!tpl) return null;
  const subst = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const v = vars[k];
      return v === undefined || v === null || v === "" ? "—" : String(v);
    });
  return {
    assunto: tpl.assunto ? subst(tpl.assunto) : null,
    corpo: subst(tpl.corpo),
  };
}

/**
 * Frase obrigatória de transparência para rodapé de PDF de receita médica.
 * Atende STJ REsp 2.159.442/PR (transparência ao paciente).
 */
export const FRASE_RODAPE_RECEITA =
  "Esta receita pode ser aviada em qualquer farmácia de manipulação de sua escolha. " +
  "A clínica mantém parcerias técnicas auditadas (PARQ — sem comissão). " +
  "Saiba mais: /sobre-parcerias-tecnicas";

/**
 * Mensagem WhatsApp para envio com prescrição (paciente recebe link da receita).
 */
export const WHATSAPP_TEMPLATE_RECEITA =
  "Olá {{paciente}}, sua receita já está disponível: {{link}}\n\n" +
  "Você pode aviar em qualquer farmácia de sua escolha. " +
  "Caso prefira, indicamos farmácias auditadas tecnicamente pela clínica. " +
  "Mais informações: /sobre-parcerias-tecnicas";
