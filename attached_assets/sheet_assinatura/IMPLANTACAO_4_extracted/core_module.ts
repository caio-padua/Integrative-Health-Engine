
export function buildInvoiceDescription(patient) {
  return `
HONORÁRIOS MÉDICOS

Paciente: ${patient.name}
CPF: ${patient.cpf}

Referente à condução do acompanhamento clínico individualizado

Atendimento e monitoramento evolutivo conforme avaliação médica

Aplicação de condutas terapêuticas personalizadas

Valores previamente acordados
`
}

export function whatsappMessage(patient){
  return `Olá, ${patient.name}. Estamos organizando uma etapa importante do seu acompanhamento.`
}
