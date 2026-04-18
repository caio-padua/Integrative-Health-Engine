/**
 * MOTOR DE REIFICACAO SISTEMICA MULTIPLANAR
 *
 * Anastomose Documental: encarna documentos dormentes em documentos_referencia
 * dentro de tabelas de destino, criando rastro auditavel em mapeamento_documental.
 *
 * Regra de Ouro: nada e criado do zero se a fonte ja existe no banco.
 */

import { db, documentosReferenciaTable, mapeamentoDocumentalTable, termosJuridicosTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = resolve(process.cwd(), "output", "reificacao");
mkdirSync(OUT_DIR, { recursive: true });

type ClassResult =
  | { tipo: "JURIDICO_TCLE"; subtipos: string[] }
  | { tipo: "RECEITA_TEMPLATE" }
  | { tipo: "RAS_TEMPLATE" }
  | { tipo: "ARQUITETURA" }
  | { tipo: "AGENTES" }
  | { tipo: "MANIFESTO" }
  | { tipo: "IMPEDIMENTOS" }
  | { tipo: "OUTROS" };

function classifyDoc(doc: { titulo: string; categoria: string; conteudoCompleto: string }): ClassResult {
  const txt = doc.conteudoCompleto.toUpperCase();
  const subtipos: string[] = [];
  if (txt.includes("TERMO DE CONSENTIMENTO INFORMADO") || txt.includes("TCLE")) subtipos.push("TCLE");
  if (txt.includes("LGPD") || txt.includes("13.709")) subtipos.push("LGPD");
  if (txt.includes("INJETAVE") || txt.includes("INTRAMUSCULAR") || txt.includes("ENDOVENO")) subtipos.push("INJETAVEIS");
  if (txt.includes("IMPLANTE")) subtipos.push("IMPLANTES");
  if (txt.includes("FORMULA") && txt.includes("MANIPULAD")) subtipos.push("FORMULAS");
  if (txt.includes("USO DE IMAGEM")) subtipos.push("IMAGEM");

  if (doc.categoria === "JURIDICO" || subtipos.length > 0) return { tipo: "JURIDICO_TCLE", subtipos };
  if (doc.categoria === "RECEITA_MODELO") return { tipo: "RECEITA_TEMPLATE" };
  if (doc.titulo.match(/RAS\s*DOCUMENTO\s*MODELO/i) || doc.categoria === "RAS_EVOLUCAO") return { tipo: "RAS_TEMPLATE" };
  if (doc.categoria === "ARQUITETURA") return { tipo: "ARQUITETURA" };
  if (doc.categoria === "AGENTES") return { tipo: "AGENTES" };
  if (doc.categoria === "MANIFESTO") return { tipo: "MANIFESTO" };
  if (doc.categoria === "IMPEDIMENTOS") return { tipo: "IMPEDIMENTOS" };
  return { tipo: "OUTROS" };
}

/**
 * Extrai blocos "TERMO DE CONSENTIMENTO INFORMADO ..." de um conteudo.
 * Retorna array { header, body }.
 */
function extractTermoBlocks(conteudo: string): Array<{ header: string; body: string }> {
  const blocks: Array<{ header: string; body: string }> = [];
  const lines = conteudo.split(/\r?\n/);
  let current: { header: string; body: string[] } | null = null;
  for (const line of lines) {
    const isHeader = /TERMO\s+DE\s+CONSENTIMENTO/i.test(line) || /TERMO\s+DE\s+CIENCIA/i.test(line) || /POLITICA\s+DE\s+PRIVACIDADE/i.test(line) || /AUTORIZACAO\s+DE\s+USO\s+DE\s+IMAGEM/i.test(line);
    if (isHeader) {
      if (current) blocks.push({ header: current.header, body: current.body.join("\n").trim() });
      current = { header: line.trim(), body: [] };
    } else if (current) {
      current.body.push(line);
      if (current.body.length > 250) {
        blocks.push({ header: current.header, body: current.body.join("\n").trim() });
        current = null;
      }
    }
  }
  if (current) blocks.push({ header: current.header, body: current.body.join("\n").trim() });
  return blocks;
}

/**
 * Texto rebuscado para os 13 termos juridicos, baseado em:
 *  - CFM Resolucao 1.931/2009 (Codigo de Etica Medica)
 *  - Lei 13.709/2018 (LGPD)
 *  - Lei 8.078/1990 (CDC)
 *  - Resolucoes ANVISA RDC 67/2007 (manipulacao), RDC 220/2004 (terapia anti-neoplasica)
 *  - Codigo Civil arts 186, 927 (responsabilidade)
 *  - Conteudo extraido do doc 63 (RAS V13) — anastomose direta
 */
const TERMOS_RIQUECIDOS: Record<string, { titulo: string; texto: string; riscos: any[] }> = {
  "Termo de Ciencia Financeira": {
    titulo: "Termo de Ciencia Financeira e Aceitacao Comercial — Protocolo Integrado de Medicina Integrativa",
    riscos: [],
    texto: `1. NATUREZA DA CONTRATACAO

O presente Termo de Ciencia Financeira regulamenta a contratacao do PROTOCOLO TERAPEUTICO INTEGRADO oferecido pelo Instituto Padua, doravante denominado "PRESTADOR", e o paciente identificado no cabecalho deste documento, doravante denominado "CONTRATANTE".

O CONTRATANTE reconhece e aceita expressamente que o protocolo NAO constitui compra avulsa de medicamentos, substancias ou procedimentos isolados, mas sim a contratacao de um PROGRAMA TERAPEUTICO COMPLETO, indivisivel, composto por avaliacao clinica, prescricao personalizada, administracao supervisionada, monitoramento de respostas e ajustes evolutivos pela equipe medica multidisciplinar.

2. ESTRUTURA DE VALORES

O valor total do protocolo, especificado no plano terapeutico anexo, abrange e remunera, de forma indivisivel: (a) honorarios medicos de consulta inicial, retornos clinicos e supervisoes; (b) avaliacao clinica e laboratorial personalizada; (c) prescricao e protocolo individualizado; (d) substancias e formulas manipuladas; (e) materiais consumiveis (seringas, equipos, soros, agulhas, gazes, antissepticos); (f) honorarios de equipe de enfermagem para administracao supervisionada; (g) reserva de agenda e infraestrutura para sessoes; (h) sistema de prontuario eletronico com PADCOM Motor Clinico; (i) suporte ininterrupto durante o periodo do tratamento.

3. CONDICOES DE PAGAMENTO

O CONTRATANTE compromete-se a quitar os valores conforme cronograma pactuado em instrumento financeiro complementar (boleto, cartao, PIX ou carta de credito). O atraso superior a 10 (dez) dias corridos enseja: (i) suspensao automatica de novas sessoes ate regularizacao; (ii) incidencia de multa moratoria de 2% sobre o valor em atraso; (iii) juros de mora de 1% ao mes pro rata die; (iv) atualizacao monetaria pelo IPCA acumulado.

4. POLITICA DE DESISTENCIA E REEMBOLSO

Em caso de desistencia unilateral pelo CONTRATANTE: (a) NAO ha direito a reembolso integral dos valores pagos; (b) o PRESTADOR retera valores proporcionais a custos efetivamente incorridos, nos termos do art. 49 do Codigo de Defesa do Consumidor combinado com art. 402 do Codigo Civil, abrangendo: insumos ja adquiridos e utilizados; honorarios medicos de etapas ja realizadas; custos operacionais e de equipe efetivamente mobilizados; reserva de agenda e slots de atendimento bloqueados; armazenamento e manipulacao de substancias customizadas; (d) o saldo apurado, se houver, sera devolvido em ate 30 (trinta) dias corridos, em parcelas equivalentes as do plano contratado, com comunicacao escrita detalhando a memoria de calculo da retencao.

5. INTERRUPCAO POR JUSTA CAUSA

Constituem hipoteses de rescisao por JUSTA CAUSA pelo PRESTADOR, sem direito a reembolso e ensejando perda integral dos valores pagos: (i) constatacao de fraude na anamnese ou ocultacao de informacao clinica relevante; (ii) descumprimento reiterado das orientacoes medicas; (iii) compartilhamento, transferencia ou cessao de substancias prescritas a terceiros; (iv) tentativa de retirada de substancias da clinica para uso domiciliar sem expressa autorizacao escrita; (v) violacao do dever de sigilo da metodologia clinica; (vi) ofensa a equipe profissional.

6. EMISSAO DE NOTAS FISCAIS E DEDUCAO

O PRESTADOR emitira nota fiscal de servico (NFS-e) na medida das competencias mensais. O CONTRATANTE declara ciencia de que o valor pago pode ser parcialmente dedutivel do Imposto de Renda Pessoa Fisica conforme art. 8 da Lei 9.250/1995, na linha de despesas medicas, mediante apresentacao das notas fiscais, vedada a duplicidade de lancamento ou inclusao de despesas de terceiros.

7. ACEITACAO

O CONTRATANTE declara ter lido integralmente este Termo, esclarecido eventuais duvidas com o PRESTADOR antes de sua assinatura, compreendido todas as clausulas em sua extensao juridica e financeira, e manifesta livre, esclarecida e expressa CONCORDANCIA com as condicoes ora estipuladas, vinculando-se de forma plena, perfeita e acabada.`,
  },

  "Politica de Privacidade e Sigilo Medico": {
    titulo: "Politica de Privacidade e Sigilo Medico Profissional — Conformidade CFM e LGPD",
    riscos: [],
    texto: `1. FUNDAMENTACAO LEGAL E ETICA

Esta Politica de Privacidade observa rigorosamente: (a) Lei 13.709/2018 (LGPD); (b) Resolucao CFM 1.931/2009 (Codigo de Etica Medica), em especial os artigos 73 a 79 que tratam do segredo profissional; (c) Resolucao CFM 1.821/2007 (prontuario eletronico); (d) Resolucao CFM 2.227/2018 (telemedicina); (e) Lei 8.080/1990 (LOS); (f) Constituicao Federal art. 5, X (inviolabilidade da intimidade).

2. DADOS COLETADOS E TRATADOS

O Instituto Padua coleta e trata os seguintes dados pessoais e dados pessoais sensiveis (categoria especial de saude, art. 5, II e art. 11 da LGPD): (i) dados cadastrais — nome, CPF, RG, data de nascimento, sexo, endereco, telefone, e-mail, plano de saude; (ii) dados clinicos — historia familiar, anamnese, queixas, sinais e sintomas, diagnosticos, hipoteses diagnosticas, prescricoes, evolucao terapeutica; (iii) dados laboratoriais e de imagem — resultados de exames, laudos, hemogramas, perfis bioquimicos, hormonais, imagens diagnosticas; (iv) dados biometricos quando aplicavel; (v) dados de pagamento e financeiros.

3. SIGILO MEDICO PROFISSIONAL

Toda equipe profissional do Instituto Padua — medicos, enfermeiros, tecnicos, auxiliares administrativos e estagiarios — esta vinculada por dever de SIGILO PROFISSIONAL ABSOLUTO previsto no art. 73 do CEM, sob pena de sancao administrativa, civil e criminal (art. 154 do Codigo Penal). O sigilo persiste mesmo apos o termino da relacao profissional ou o falecimento do paciente.

4. HIPOTESES DE QUEBRA LEGAL DE SIGILO

O sigilo somente sera quebrado nas hipoteses estritamente previstas em lei: (a) ordem judicial expressa e fundamentada; (b) requisicao do Ministerio Publico em casos legalmente previstos; (c) notificacao compulsoria de doencas e agravos de notificacao obrigatoria (Portaria GM/MS 1.061/2020); (d) declaracoes de obito; (e) dever legal de comunicar suspeita de violencia contra crianca, adolescente, mulher ou idoso (Lei 8.069/1990, Lei 11.340/2006, Lei 10.741/2003); (f) defesa propria do medico em demanda judicial, na medida estritamente necessaria.

5. ARMAZENAMENTO E SEGURANCA TECNICA

Os dados sao armazenados em servidores criptografados em transito (TLS 1.3) e em repouso (AES-256), com controle de acesso baseado em perfis (RBAC), trilhas de auditoria de cada acesso e operacao, copias de seguranca (backups) diarias com retencao minima de 30 dias e redundancia geografica. Implementa-se principio do MENOR PRIVILEGIO: cada profissional acessa apenas dados estritamente necessarios ao cumprimento de suas funcoes.

6. PRAZO DE GUARDA DO PRONTUARIO

Por forca do art. 7 da Resolucao CFM 1.821/2007 e da Lei 13.787/2018 (digitalizacao de prontuarios), o prontuario medico sera guardado pelo PRAZO MINIMO DE 20 (VINTE) ANOS contados do ultimo registro, podendo ser preservado indefinidamente para fins de pesquisa cientifica, ensino ou interesse historico, com pseudonimizacao.

7. COMPARTILHAMENTO

NAO HA compartilhamento de dados pessoais com terceiros para fins comerciais. O compartilhamento ocorre apenas: (a) com farmacias de manipulacao parceiras, limitado as informacoes estritamente necessarias para preparo de formula prescrita; (b) com laboratorios de analises clinicas para realizacao de exames pedidos; (c) com operadora de plano de saude do paciente, mediante autorizacao expressa para fins de reembolso ou cobertura; (d) com autoridades sanitarias quando legalmente exigido.

8. ACEITACAO E DECLARACAO

O paciente declara ter lido, compreendido e aceito integralmente esta Politica de Privacidade, autorizando o tratamento dos seus dados pessoais e dados pessoais sensiveis nos termos aqui descritos, com fundamento no art. 7, II (cumprimento de obrigacao legal) e art. 11, II, alinea "f" (tutela da saude) da Lei 13.709/2018.`,
  },

  "Termo de Nao-Garantia de Resultados": {
    titulo: "Termo de Ciencia sobre Nao-Garantia de Resultados Terapeuticos — Obrigacao de Meio versus Obrigacao de Resultado",
    riscos: [],
    texto: `1. NATUREZA DA OBRIGACAO MEDICA

O paciente declara ter sido devidamente esclarecido pelo medico responsavel acerca da natureza juridica da prestacao de servicos medicos, que constitui, regra geral, OBRIGACAO DE MEIO e nao OBRIGACAO DE RESULTADO, conforme entendimento consolidado da doutrina (Carlos Roberto Goncalves, Sergio Cavalieri Filho), da jurisprudencia do Superior Tribunal de Justica (REsp 992.821/SC, REsp 1.180.815/MG) e em consonancia com o art. 14, paragrafo 4 do Codigo de Defesa do Consumidor.

2. SIGNIFICADO PRATICO

Por OBRIGACAO DE MEIO entende-se o compromisso medico de empregar todos os recursos tecnicos e cientificos disponiveis, a luz do estado da arte da medicina, com diligencia, prudencia, pericia e respeito aos protocolos consagrados, SEM, contudo, garantir desfecho clinico especifico, percentual de melhora, cura definitiva ou reversao integral de quadro patologico.

3. VARIABILIDADE DA RESPOSTA INDIVIDUAL

O paciente reconhece que a resposta a qualquer intervencao terapeutica em medicina integrativa, funcional, biorreguladora, ortomolecular e longevidade depende de multiplos fatores nao integralmente controlaveis pelo medico, incluindo: (i) carga genetica e polimorfismos individuais; (ii) microbiota e enterotipo; (iii) historico inflamatorio cronico; (iv) carga toxica acumulada; (v) qualidade do sono e ritmo circadiano; (vi) padroes alimentares pregressos e atuais; (vii) nivel de estresse cronico e cortisol basal; (viii) aderencia rigorosa as orientacoes; (ix) consumo concomitante de substancias nao declaradas; (x) doencas intercorrentes durante o protocolo; (xi) variabilidade biologica intrinseca a especie humana.

4. NATUREZA EVOLUTIVA E NAO-LINEAR

O paciente entende que a melhora clinica em medicina integrativa frequentemente segue padrao NAO-LINEAR, podendo apresentar: oscilacoes de sintomas; periodos transitorios de aparente piora (reacao de Herxheimer, crises de detoxificacao); resposta tardia em meses ao inves de semanas; necessidade de ajustes evolutivos do protocolo conforme curvas REVO de monitoramento.

5. AUSENCIA DE GARANTIA DE PERCENTUAIS

O Instituto Padua e o medico responsavel NAO oferecem, em hipotese alguma, garantia de: (a) percentual especifico de reducao de sintomas; (b) reversao de marcadores laboratoriais a faixas-alvo; (c) suspensao de medicamentos pre-existentes; (d) aumento de longevidade em anos; (e) melhora estetica mensuravel; (f) ganho de massa muscular ou perda de gordura em quantidade especifica; (g) nivel de energia ou disposicao subjetiva.

6. RESPONSABILIDADE EM CASO DE INSUCESSO

Eventual insucesso terapeutico, ausencia de melhora ou resultado abaixo das expectativas do paciente NAO configura, por si so, falha de prestacao de servico nem enseja direito a reembolso integral, retorno gratuito ou indenizacao. A responsabilidade civil do medico, em casos comprovados de imperito, imprudencia ou negligencia, sera apurada nos termos do art. 951 do Codigo Civil combinado com art. 14, paragrafo 4 do CDC, mediante producao tecnica de prova pericial.

7. DECLARACAO

O paciente declara ter lido, compreendido e aceito o presente Termo, sem ressalvas, reconhecendo a natureza tecnico-cientifica da medicina e a impossibilidade etica e juridica de qualquer profissional honesto garantir resultados absolutos em saude humana.`,
  },

  "Consentimento LGPD — Lei Geral de Protecao de Dados": {
    titulo: "Consentimento Livre, Esclarecido e Informado para Tratamento de Dados Pessoais e Dados Pessoais Sensiveis (Lei 13.709/2018 - LGPD)",
    riscos: [],
    texto: `1. CONSENTIMENTO INFORMADO PARA TRATAMENTO DE DADOS

Pelo presente instrumento e em conformidade com a Lei 13.709 de 14 de agosto de 2018 (Lei Geral de Protecao de Dados Pessoais — LGPD), o paciente identificado no cabecalho, doravante denominado TITULAR DOS DADOS, autoriza expressa, livre, esclarecida, informada e inequivocamente o INSTITUTO PADUA, na qualidade de CONTROLADOR de dados, a realizar o tratamento dos seus dados pessoais e dados pessoais sensiveis, nos termos e finalidades a seguir descritos.

2. CATEGORIAS DE DADOS TRATADOS

2.1. DADOS PESSOAIS COMUNS (art. 5, I): nome civil e social, CPF, RG, passaporte, data de nascimento, sexo, estado civil, profissao, escolaridade, endereco residencial, telefone celular e fixo, e-mail, redes sociais quando informadas.
2.2. DADOS PESSOAIS SENSIVEIS DE SAUDE (art. 5, II combinado com art. 11): historia clinica completa, antecedentes pessoais e familiares, queixas e sintomas, exame fisico, hipoteses diagnosticas, diagnosticos firmados, prescricoes medicamentosas e de formulas, evolucao clinica, resultados de exames laboratoriais e de imagem, laudos, dados de monitoramento (sinais vitais, biomarcadores, curvas REVO), dados de adesao terapeutica, eventos adversos, intercorrencias.
2.3. DADOS BIOMETRICOS (quando aplicavel): impressao digital, reconhecimento facial, voz para identificacao em sistema PADCOM.
2.4. DADOS COMPORTAMENTAIS: padroes de uso do aplicativo, horarios de acesso, interacoes via WhatsApp.

3. BASES LEGAIS DO TRATAMENTO

3.1. Para dados pessoais comuns: consentimento (art. 7, I), execucao de contrato (art. 7, V), cumprimento de obrigacao legal (art. 7, II), exercicio regular de direitos (art. 7, VI).
3.2. Para dados pessoais sensiveis de saude: consentimento expresso e destacado (art. 11, I), tutela da saude em procedimento realizado por profissionais da area da saude (art. 11, II, alinea "f"), cumprimento de obrigacao legal por controlador (art. 11, II, "a"), exercicio regular de direitos em contrato (art. 11, II, "d").

4. FINALIDADES ESPECIFICAS DO TRATAMENTO

(a) Prestacao do servico medico contratado, incluindo elaboracao e execucao de plano terapeutico individualizado;
(b) Manutencao e atualizacao do prontuario eletronico em conformidade com a Resolucao CFM 1.821/2007;
(c) Comunicacao com o paciente para agendamento, reagendamento, lembretes de sessoes, orientacoes pos-procedimento;
(d) Emissao de documentos clinicos: receitas, atestados, laudos, RAS (Relatorio de Acompanhamento Sistemico);
(e) Solicitacao de exames laboratoriais e de imagem em laboratorios parceiros, mediante envio dos dados estritamente necessarios;
(f) Encaminhamento de prescricoes a farmacias de manipulacao credenciadas, limitado aos dados necessarios para preparo da formula;
(g) Faturamento, cobranca, emissao de notas fiscais e gestao financeira;
(h) Submissao a operadora de plano de saude para reembolso ou autorizacao previa, quando aplicavel e mediante autorizacao especifica;
(i) Cumprimento de obrigacoes legais junto a autoridades sanitarias e fiscais;
(j) Pesquisa cientifica de interesse publico, com prevalente pseudonimizacao ou anonimizacao, podendo o titular se opor a qualquer tempo.

5. COMPARTILHAMENTO COM OPERADORES E TERCEIROS

5.1. OPERADORES (que tratam dados em nome do controlador): provedor de hospedagem em nuvem com clausulas contratuais de protecao de dados; provedor do sistema de prontuario eletronico (PADCOM); servico de envio de mensagens (WhatsApp Business API).
5.2. TERCEIROS QUALIFICADOS: laboratorios de analises clinicas e diagnostico por imagem; farmacias de manipulacao; operadoras de planos de saude (mediante autorizacao especifica do titular).
5.3. AUTORIDADES PUBLICAS: Vigilancia Sanitaria, Ministerio da Saude, Receita Federal, Poder Judiciario, Ministerio Publico — apenas quando exigido por lei ou ordem judicial.

6. DIREITOS DO TITULAR (art. 18 da LGPD)

(I) Confirmacao da existencia de tratamento; (II) Acesso aos dados; (III) Correcao de dados incompletos, inexatos ou desatualizados; (IV) Anonimizacao, bloqueio ou eliminacao de dados desnecessarios, excessivos ou tratados em desconformidade com a LGPD; (V) Portabilidade a outro fornecedor; (VI) Eliminacao dos dados pessoais tratados com consentimento, ressalvadas hipoteses legais de guarda obrigatoria; (VII) Informacao sobre entidades publicas e privadas com as quais houve compartilhamento; (VIII) Informacao sobre a possibilidade de nao fornecer consentimento e suas consequencias; (IX) Revogacao do consentimento.

7. PRAZO DE RETENCAO

Os dados serao mantidos pelo PRAZO MINIMO DE 20 (VINTE) ANOS contados do ultimo registro no prontuario, conforme Resolucao CFM 1.821/2007 e Lei 13.787/2018. Apos esse prazo, podem ser anonimizados para uso em pesquisa cientifica, ensino e finalidades historicas, ou eliminados de forma segura mediante destruicao irreversivel.

8. SEGURANCA DA INFORMACAO

O Controlador adota medidas tecnicas e administrativas aptas a proteger os dados contra acessos nao autorizados e situacoes acidentais ou ilicitas de destruicao, perda, alteracao, comunicacao ou difusao indevida (art. 46 da LGPD): criptografia em transito (TLS 1.3) e em repouso (AES-256); controle de acesso baseado em perfis com principio do menor privilegio; trilhas de auditoria com registro de IP, usuario, data, hora e operacao; backups diarios com retencao de 30 dias; testes periodicos de seguranca; treinamento continuo de equipe; politica de senhas fortes e MFA.

9. INCIDENTES DE SEGURANCA

Em caso de incidente de seguranca que possa acarretar risco ou dano relevante aos titulares, o Controlador comunicara: (a) a Autoridade Nacional de Protecao de Dados (ANPD); (b) o titular afetado em prazo razoavel, conforme art. 48 da LGPD.

10. ENCARREGADO DE PROTECAO DE DADOS (DPO)

O Controlador disponibiliza canal de comunicacao com o Encarregado pelo Tratamento de Dados Pessoais (DPO): e-mail dpo@padua.med.br, para exercicio dos direitos previstos no art. 18 da LGPD e demais demandas relacionadas a protecao de dados.

11. REVOGACAO DO CONSENTIMENTO

O titular pode revogar o consentimento a qualquer momento, mediante manifestacao expressa por escrito, ressalvada a continuidade do tratamento amparado em outras bases legais (cumprimento de obrigacao legal, execucao de contrato, tutela da saude em procedimento por profissional da saude). A revogacao nao tera efeito retroativo sobre tratamentos ja realizados.

12. DECLARACAO FINAL

O titular declara ter lido integralmente este instrumento, compreendido todas as suas clausulas, esclarecido eventuais duvidas com o Controlador e/ou seu DPO antes da assinatura, e manifesta CONSENTIMENTO LIVRE, ESPECIFICO, INFORMADO, INEQUIVOCO E DESTACADO para o tratamento dos seus dados pessoais e dados pessoais sensiveis nos termos aqui especificados.`,
  },

  "Termo de Consentimento Livre e Esclarecido (TCLE Global)": {
    titulo: "Termo de Consentimento Livre e Esclarecido — TCLE Global do Protocolo Terapeutico Integrado",
    riscos: [],
    texto: `1. NATUREZA DO PROTOCOLO

O presente protocolo constitui CONTRATO DE SERVICO TERAPEUTICO INTEGRADO, nao caracterizando compra isolada de medicamentos, substancias ou procedimentos avulsos. O paciente contrata um PROGRAMA COMPLETO de otimizacao metabolica, funcional e regulatoria, fundamentado em: avaliacao clinica e laboratorial personalizada; prescricao individualizada de substancias terapeuticas; administracao supervisionada por equipe qualificada; monitoramento continuo de respostas clinicas e laboratoriais; ajustes evolutivos do protocolo conforme necessario; suporte medico e de enfermagem durante todo o periodo contratado.

2. SUBSTANCIAS E MODALIDADES TERAPEUTICAS

O protocolo pode incluir, conforme prescricao individualizada: (a) ENDOVENOSAS — Vitamina C, NAD+, Glutationa, Coqueteis vitaminicos, Aminoacidos, Polipeptideos; (b) INTRAMUSCULARES — Complexo B, Zinco-Selenio, Vitamina D, B12, Testosterona; (c) IMPLANTES SUBCUTANEOS — Testosterona Pellet, Gestrinona, outros pellets hormonais; (d) FORMULAS MANIPULADAS — capsulas, gotas, sublinguais, sache, prescritas em farmacia magistral credenciada; (e) DIETAS E NUTRACEUTICOS — protocolos alimentares personalizados e suplementacao oral; (f) PROCEDIMENTOS ESTETICOS INTEGRADOS — quando indicados pelo medico assistente.

Todas as substancias sao de USO EXCLUSIVO DENTRO DA CLINICA, sob supervisao direta de profissional qualificado, salvo formulas manipuladas de uso domiciliar expressamente autorizadas.

3. RISCOS, EFEITOS COLATERAIS E REACOES ADVERSAS

O paciente declara ter sido devidamente esclarecido sobre os riscos potenciais inerentes ao protocolo, classificados em:

3.1. COMUNS (LEVES — incidencia >1%): cefaleia transitoria; nausea leve; sensacao de calor; rubor facial; ardencia local de injecao; sabor metalico transitorio; sensacao de queimacao venosa; tontura postural breve.

3.2. POUCO FREQUENTES (MODERADOS — 0.1% a 1%): hipersensibilidade local; flebite quimica em via endovenosa; hipoglicemia transitoria; hipotensao breve; reacao vasovagal; equimose ou hematoma local.

3.3. RAROS (GRAVES — <0.1%): reacao anafilactoide; broncoespasmo; arritmia cardiaca transitoria; necessidade de hospitalizacao; complicacao infecciosa local; reacao alergica sistemica grave a componente nao previamente conhecido.

3.4. MUITO RAROS (POTENCIALMENTE FATAIS — <0.01%): choque anafilatico; embolia gasosa; oclusao venosa central; hemolise aguda em portador nao diagnosticado de deficiencia de G6PD apos altas doses de vitamina C endovenosa.

4. CONTRAINDICACOES E ALERTAS

O paciente declara ter informado integralmente seu historico clinico e medicacoes em uso, ciente de que SAO CONTRAINDICACOES ABSOLUTAS OU RELATIVAS, conforme o caso: gestacao e lactancia (salvo prescricao especifica); insuficiencia renal cronica avancada; insuficiencia cardiaca descompensada; cancer ativo em tratamento (avaliar caso a caso com oncologista); doenca hepatica avancada; coagulopatia grave; deficiencia comprovada de G6PD para uso de vitamina C em alta dose; alergia conhecida a qualquer componente das formulacoes; transtorno psiquiatrico descompensado; uso de anticoagulante sem manejo adequado.

5. ALTERNATIVAS TERAPEUTICAS

O paciente declara ter sido informado sobre alternativas terapeuticas disponiveis, incluindo: tratamento alopatico convencional via SUS ou rede privada; abordagens nao-farmacologicas (psicoterapia, atividade fisica supervisionada, terapia ocupacional, fisioterapia); outras escolas de medicina integrativa; nao-realizacao de tratamento. O paciente OPTA LIVREMENTE pelo presente protocolo apos ter avaliado as alternativas.

6. DIREITO DE REVOGACAO

O paciente pode revogar este consentimento a qualquer momento, sem necessidade de justificativa, mediante comunicacao escrita ao Instituto Padua, ressalvado: (a) procedimentos ja iniciados podem ser concluidos por seguranca clinica; (b) implantes ja aplicados nao podem ser removidos sem indicacao clinica especifica; (c) a revogacao nao desobriga o cumprimento das obrigacoes financeiras pactuadas pelos servicos ja prestados.

7. RESPONSABILIDADES DO PACIENTE

O paciente compromete-se a: (i) comparecer pontualmente as sessoes agendadas, com tolerancia maxima de 15 minutos; (ii) informar imediatamente qualquer efeito colateral, intercorrencia ou alteracao clinica via canal oficial; (iii) seguir rigorosamente as orientacoes medicas e nao modificar doses ou frequencias por conta propria; (iv) realizar os exames de monitoramento nas datas estipuladas; (v) manter aderencia as orientacoes alimentares e de estilo de vida; (vi) nao compartilhar, transferir ou ceder substancias prescritas a terceiros; (vii) comunicar previamente qualquer mudanca de medicacao, suplemento ou condicao clinica relevante.

8. CONFIDENCIALIDADE E SIGILO

Todas as informacoes clinicas, laboratoriais e pessoais do paciente serao mantidas em sigilo absoluto, nos termos do Codigo de Etica Medica (arts. 73 a 79 da Resolucao CFM 1.931/2009), da Lei Geral de Protecao de Dados (Lei 13.709/2018) e da Constituicao Federal (art. 5, X), conforme detalhado em instrumento especifico anexo (Politica de Privacidade e Sigilo Medico).

9. AUSENCIA DE GARANTIA DE RESULTADO

O paciente reconhece expressamente que a presente prestacao de servicos medicos constitui OBRIGACAO DE MEIO, nao de resultado, conforme detalhado em instrumento anexo especifico (Termo de Nao-Garantia de Resultados), nao havendo garantia de cura, melhora percentual especifica, reversao de quadros cronicos ou suspensao de medicamentos pre-existentes.

10. DECLARACAO FINAL E ASSINATURA

Eu, paciente identificado no cabecalho, declaro que: (a) li integralmente o presente Termo, sem pressa, em ambiente adequado; (b) compreendi todas as clausulas em sua extensao tecnica e juridica; (c) tive a oportunidade de fazer perguntas e esclarecer todas as duvidas com o medico responsavel antes desta assinatura; (d) recebi copia integral deste documento; (e) declaro CONSENTIMENTO LIVRE, ESCLARECIDO, INFORMADO E EXPRESSO para a realizacao do protocolo nos termos aqui descritos, ciente de que posso revogar este consentimento a qualquer momento conforme clausula 6.`,
  },

  "Consentimento Especifico — Injetaveis Intramusculares (CIMU)": {
    titulo: "Consentimento Especifico Informado — Aplicacao de Injetaveis por Via Intramuscular (CIMU)",
    riscos: [
      { categoria: "comum", descricao: "Dor leve e transitoria no local da aplicacao" },
      { categoria: "comum", descricao: "Equimose local autorresolutiva em 3-7 dias" },
      { categoria: "comum", descricao: "Sensacao de calor ou rubor passageiros" },
      { categoria: "moderado", descricao: "Hematoma local em pacientes com fragilidade vascular" },
      { categoria: "moderado", descricao: "Reacao inflamatoria local com nodulo persistente" },
      { categoria: "raro", descricao: "Lesao do nervo ciatico em aplicacao gluteal incorreta" },
      { categoria: "raro", descricao: "Abscesso esteril ou infeccioso" },
      { categoria: "muito_raro", descricao: "Reacao anafilatica grave" },
      { categoria: "muito_raro", descricao: "Embolia oleosa (substancias oleosas mal aplicadas)" },
    ],
    texto: `1. NATUREZA DO PROCEDIMENTO

Pelo presente Consentimento Especifico, complementar ao TCLE Global, o paciente autoriza o Instituto Padua a realizar APLICACAO DE INJETAVEIS POR VIA INTRAMUSCULAR (IM), procedimento minimamente invasivo consistente na introducao de substancia liquida ou suspensao no tecido muscular profundo, atraves de agulha hipodermica esteril, sob tecnica asseptica rigorosa.

2. SUBSTANCIAS USUAIS PARA VIA IM

Conforme prescricao medica individualizada, podem ser administrados por esta via, dentre outros: Complexo B (B1, B6, B12); Vitamina B12 isolada (cianocobalamina, hidroxicobalamina, metilcobalamina); Vitamina D3 (colecalciferol injetavel); Zinco e Selenio quelados; Magnesio sulfato; Testosterona (cipionato, undecanoato, propionato); Estradiol; Progesterona; Glutationa intramuscular; Polipeptideos timicos.

3. SITIOS DE APLICACAO

Os sitios habituais para aplicacao IM, escolhidos pela equipe de enfermagem qualificada, sao: musculo deltoide (terco superior do braco) — preferencial para volumes ate 2 mL; musculo vasto lateral da coxa — preferencial para volumes maiores; musculo ventroglutial (tecnica de von Hochstetter) — alternativa segura ao gluteo posterior, evitando trajeto do nervo ciatico; quadrante superior externo do gluteo medio — apenas quando necessario, com tecnica anatomica precisa.

4. PRE-REQUISITOS E CONTRAINDICACOES

Sao contraindicacoes para aplicacao IM: (a) infeccao ativa no sitio de injecao; (b) plaqueta abaixo de 50.000/mm3; (c) coagulopatia grave ou uso de anticoagulante sem manejo adequado; (d) lesao muscular ou vascular conhecida no sitio escolhido; (e) alergia comprovada a qualquer componente da formulacao; (f) reacao anafilatica previa a substancia identica.

5. RISCOS ESPECIFICOS DA VIA INTRAMUSCULAR

5.1. COMUNS (>1%): dor leve e transitoria; equimose autorresolutiva em 3-7 dias; sensacao de calor ou rubor passageiros; sabor metalico transitorio (Vitamina B); fotossensibilidade temporaria.
5.2. MODERADOS (0.1% a 1%): hematoma local mais extenso; nodulo inflamatorio persistente; reacao de hipersensibilidade local com prurido; flebite quimica.
5.3. RAROS (<0.1%): lesao do nervo ciatico em aplicacao gluteal incorreta com possivel parestesia ou paresia transitoria ou permanente; lesao de nervo radial em aplicacao deltoide incorreta; abscesso esteril ou infeccioso requerendo drenagem; necrose tecidual local em substancias irritantes mal aplicadas.
5.4. MUITO RAROS (<0.01%): reacao anafilatica grave requerendo atendimento de emergencia; embolia oleosa em substancias oleosas mal aplicadas com penetracao venosa inadvertida; sindrome de Nicolau (necrose isquemica por injecao intra-arterial inadvertida).

6. CUIDADOS POS-APLICACAO

O paciente compromete-se a: (a) manter o local de aplicacao limpo e seco por 4-6 horas; (b) NAO massagear excessivamente o sitio; (c) realizar movimentacao leve do membro para favorecer absorcao; (d) aplicar compressa fria local em caso de dor ou edema; (e) informar IMEDIATAMENTE a equipe em caso de: dor intensa progressiva; vermelhidao com calor; secrecao purulenta; febre; falta de ar; urticaria generalizada; dormencia ou fraqueza no membro.

7. MEDIDAS DE SEGURANCA INSTITUCIONAIS

A equipe profissional adota: protocolo de checklist pre-aplicacao (conferencia tripla de paciente, substancia, dose, via, sitio); tecnica asseptica com antissepsia da pele; agulhas e seringas esteris descartaveis de uso unico; aspiracao previa antes da injecao; local de aplicacao com kit de emergencia (adrenalina, anti-histaminico, corticoide, oxigenio); equipe treinada em SAVI e SBV; observacao supervisionada por minimo 15 minutos pos-aplicacao para deteccao de reacoes imediatas.

8. CONSENTIMENTO

Declaro ter lido este Consentimento Especifico para Via Intramuscular, compreendido todos os riscos e cuidados, esclarecido duvidas com a equipe, e CONSINTO LIVRE E EXPRESSAMENTE com a realizacao das aplicacoes intramusculares prescritas no meu protocolo, nos termos aqui descritos.`,
  },

  "Consentimento Especifico — Injetaveis Endovenosos (CEND)": {
    titulo: "Consentimento Especifico Informado — Aplicacao de Substancias por Via Endovenosa (CEND)",
    riscos: [
      { categoria: "comum", descricao: "Sensacao de calor durante a infusao" },
      { categoria: "comum", descricao: "Sabor metalico transitorio" },
      { categoria: "comum", descricao: "Pequeno desconforto no sitio de puncao" },
      { categoria: "moderado", descricao: "Flebite quimica" },
      { categoria: "moderado", descricao: "Hipoglicemia transitoria" },
      { categoria: "raro", descricao: "Hemolise aguda em portador de deficiencia de G6PD com Vitamina C alta dose" },
      { categoria: "raro", descricao: "Sobrecarga hidrica em cardiopata" },
      { categoria: "muito_raro", descricao: "Reacao anafilatica grave" },
      { categoria: "muito_raro", descricao: "Embolia gasosa" },
      { categoria: "muito_raro", descricao: "Trombose venosa profunda associada a cateter prolongado" },
    ],
    texto: `1. NATUREZA DO PROCEDIMENTO

Pelo presente Consentimento Especifico, complementar ao TCLE Global, o paciente autoriza o Instituto Padua a realizar INFUSAO ENDOVENOSA (EV) de substancias terapeuticas, procedimento minimamente invasivo de cateterizacao venosa periferica e administracao supervisionada de solucao prescrita, com tempo de infusao variavel de 20 minutos a 4 horas conforme protocolo.

2. SUBSTANCIAS USUAIS PARA VIA EV

Conforme prescricao individualizada, podem ser administradas por esta via, dentre outras: Vitamina C em alta dose (10g a 75g — sempre apos triagem para deficiencia de G6PD); NAD+ (Nicotinamida Adenina Dinucleotideo); Glutationa reduzida; Acido Alfa-Lipoico (ALA); Coquetel Myers modificado; Aminoacidos isolados ou em mistura (Taurina, Glicina, Arginina, Glutamina); Polipeptideos; Soro Fisiologico ou Ringer com Lactato; Quelantes (DMSA, EDTA — uso restrito a indicacao especifica de quelacao com avaliacao laboratorial previa).

3. PRE-REQUISITOS E TRIAGEM OBRIGATORIA

ANTES da primeira infusao endovenosa, em especial de Vitamina C em alta dose, sao OBRIGATORIOS: (a) hemograma completo recente (ate 90 dias); (b) funcao renal — ureia, creatinina, taxa de filtracao glomerular; (c) eletrolitos — sodio, potassio, calcio, magnesio, fosforo; (d) DOSAGEM DE GLICOSE-6-FOSFATO DESIDROGENASE (G6PD) — eletivamente para Vitamina C >25g (deficiencia desta enzima predispoe a hemolise aguda potencialmente fatal); (e) avaliacao cardiaca (ECG e/ou ecocardiograma se indicado por idade ou comorbidade); (f) avaliacao de acesso venoso disponivel; (g) glicemia previa em pacientes diabeticos.

4. CONTRAINDICACOES

Constituem contraindicacoes para infusao EV: (a) deficiencia confirmada de G6PD para Vitamina C alta dose; (b) insuficiencia renal cronica estagio 4 ou 5; (c) insuficiencia cardiaca descompensada; (d) sobrecarga hidrica iminente; (e) hipernatremia ou hipocalcemia grave nao corrigidas; (f) infeccao ativa no sitio de puncao; (g) coagulopatia grave; (h) gravidez nao planejada (avaliacao caso a caso); (i) historia previa de reacao anafilatica a componente identico.

5. RISCOS ESPECIFICOS DA VIA ENDOVENOSA

5.1. COMUNS (>1%): sensacao de calor durante a infusao; sabor metalico transitorio; pequeno desconforto local na puncao; ardencia venosa autorresolutiva.
5.2. MODERADOS (0.1% a 1%): flebite quimica com dor e endurecimento do trajeto venoso; hipoglicemia transitoria; hipotensao breve; tontura postural; nausea passageira; rubor facial intenso.
5.3. RAROS (<0.1%): hemolise aguda em portador nao diagnosticado de deficiencia de G6PD apos Vitamina C alta dose; sobrecarga hidrica em cardiopata; arritmia cardiaca transitoria; necessidade de interrupcao da infusao por intolerancia; infiltracao subcutanea com necrose tecidual em substancias irritantes; oligoanuria.
5.4. MUITO RAROS (<0.01%): reacao anafilatica grave requerendo atendimento de emergencia; embolia gasosa em manipulacao incorreta da via; trombose venosa profunda associada a cateter prolongado; oclusao venosa central; choque cardiogenico em portador de cardiopatia oculta.

6. CUIDADOS DURANTE E APOS A INFUSAO

Durante a infusao: monitoramento continuo por equipe de enfermagem; acesso a botao de chamada de emergencia; aferencia de pressao arterial, frequencia cardiaca e saturacao a intervalos regulares; observacao de sinais de reacao adversa; oferta de hidratacao oral. Apos a infusao: observacao supervisionada por minimo 30 minutos; orientacao sobre hidratacao oral abundante nas 24 horas seguintes; instrucao para nao realizar atividade fisica intensa nas primeiras 6 horas; comunicacao IMEDIATA em caso de mal-estar progressivo, dor toracica, falta de ar, urticaria generalizada, fraqueza intensa ou alteracao da coloracao urinaria (hemoglobinuria).

7. MEDIDAS DE SEGURANCA INSTITUCIONAIS

A equipe profissional adota: protocolo de checklist pre-infusao com conferencia tripla; antissepsia rigorosa do sitio; cateter venoso periferico curto, esteril, descartavel e calibre adequado; equipo de infusao com filtro quando indicado; bomba de infusao para velocidades criticas; kit de parada cardiaca acessivel (DEA, drogas de emergencia, oxigenio, ambu); equipe medica de retaguarda em todas as sessoes; protocolo escrito de manejo de reacao anafilatica; transporte rapido referenciado a hospital de retaguarda em caso de emergencia.

8. CONSENTIMENTO

Declaro ter lido integralmente este Consentimento Especifico para Via Endovenosa, compreendido todos os riscos, contraindicacoes e cuidados, recebido orientacoes claras sobre triagem laboratorial obrigatoria (em especial G6PD), esclarecido duvidas com a equipe medica, e CONSINTO LIVRE, ESCLARECIDA E EXPRESSAMENTE com a realizacao das infusoes endovenosas prescritas no meu protocolo, nos termos aqui descritos.`,
  },

  "Consentimento Especifico — Implantes (CIMP)": {
    titulo: "Consentimento Especifico Informado — Implantes Subcutaneos Hormonais e Pellets (CIMP)",
    riscos: [
      { categoria: "comum", descricao: "Desconforto ou dor leve no local do implante nos primeiros 3-5 dias" },
      { categoria: "comum", descricao: "Equimose local autorresolutiva" },
      { categoria: "comum", descricao: "Sensibilidade local a palpacao por 7-14 dias" },
      { categoria: "moderado", descricao: "Infeccao local da incisao" },
      { categoria: "moderado", descricao: "Extrusao parcial do pellet" },
      { categoria: "moderado", descricao: "Equimose extensa" },
      { categoria: "raro", descricao: "Rejeicao do implante" },
      { categoria: "raro", descricao: "Reacao alergica a componente do pellet" },
      { categoria: "raro", descricao: "Liberacao supraterapeutica com sintomas hormonais" },
      { categoria: "muito_raro", descricao: "Granuloma ou queloide na ferida operatoria" },
      { categoria: "muito_raro", descricao: "Migracao do pellet para tecidos profundos" },
    ],
    texto: `1. NATUREZA DO PROCEDIMENTO

Pelo presente Consentimento Especifico, complementar ao TCLE Global, o paciente autoriza o Instituto Padua a realizar IMPLANTE SUBCUTANEO de pellet hormonal — procedimento cirurgico minimamente invasivo, sob anestesia local, consistente em pequena incisao no tecido subcutaneo (geralmente regiao gluteal ou abdominal lateral) para insercao de pellet de liberacao prolongada, com posterior fechamento da ferida operatoria por adesivo, ponto absorvivel ou rafia simples.

2. SUBSTANCIAS USUAIS PARA IMPLANTE

Conforme prescricao individualizada, podem ser implantados, dentre outros: Testosterona (pellet ou bastao); Gestrinona; Estradiol; Progesterona; combinacoes estrogeno-progestagenio. Os pellets sao manipulados em farmacias de manipulacao credenciadas, com selo da ANVISA, dosagem prescrita pelo medico assistente, esterilidade garantida e rastreabilidade integral.

3. DURACAO DA LIBERACAO E REAPLICACAO

A duracao terapeutica esperada do implante hormonal varia entre 90 e 180 dias (em media 4 a 6 meses), dependendo de: dose individual; metabolismo do paciente; nivel de atividade fisica; massa muscular; idade; objetivo terapeutico. A reaplicacao deve ocorrer apenas apos avaliacao clinica e laboratorial de niveis hormonais, NAO sendo rotina automatica.

4. PRE-REQUISITOS E CONTRAINDICACOES

Sao OBRIGATORIOS antes do implante: (a) anamnese completa com historico oncologico pessoal e familiar (cancer de mama, prostata, endometrio); (b) exames laboratoriais — perfil hormonal completo, hemograma, perfil lipidico, glicemia, funcao hepatica e renal, PSA em homens; (c) avaliacao cardiologica se houver fator de risco; (d) mamografia recente em mulheres acima de 40 anos; (e) exame ginecologico recente em mulheres; (f) toque retal e PSA em homens acima de 45 anos; (g) ausencia de gravidez confirmada por beta-HCG em mulheres em idade reprodutiva.

Constituem CONTRAINDICACOES: cancer hormonio-dependente ativo ou em remissao recente (mama, prostata, endometrio); historia pessoal de tromboembolismo venoso ou arterial; doenca hepatica grave; coagulopatia nao controlada; gravidez ou suspeita de gravidez; lactancia (avaliacao caso a caso); hipertensao nao controlada; hipersensibilidade conhecida a hormonio identico.

5. RISCOS ESPECIFICOS DO IMPLANTE

5.1. COMUNS (>1%): desconforto ou dor leve no local nos primeiros 3-5 dias; equimose local autorresolutiva; sensibilidade local a palpacao por 7-14 dias; pequeno edema local.
5.2. MODERADOS (0.1% a 1%): infeccao local da incisao requerendo antibioticoterapia oral; extrusao parcial do pellet (saida espontanea pela ferida); equimose extensa; cicatriz hipertrofica em pessoas predispostas; sintomas de excesso hormonal nas primeiras 4 semanas (acne, oleosidade, irritabilidade) usualmente autorresolutivos.
5.3. RAROS (<0.1%): rejeicao do implante com expulsao completa; reacao alergica a componente do pellet; liberacao supraterapeutica com sintomas marcantes de excesso hormonal; necessidade de remocao cirurgica do pellet.
5.4. MUITO RAROS (<0.01%): granuloma ou queloide persistente na ferida; migracao do pellet para tecidos profundos exigindo localizacao por imagem; infeccao profunda necessitando intervencao cirurgica; eventos tromboembolicos em pacientes com predisposicao nao identificada na triagem.

6. CARATERISTICA NAO-REVERSIVEL

O paciente ESPECIALMENTE DECLARA ciencia de que: (a) o implante uma vez aplicado NAO PODE SER REMOVIDO IMEDIATAMENTE — apenas apos sua absorcao natural ou em caso de complicacao especifica que exija remocao cirurgica; (b) eventos adversos hormonais decorrentes do implante PERSISTEM ATE QUE A SUBSTANCIA SEJA INTEGRALMENTE LIBERADA E METABOLIZADA, podendo durar meses; (c) NAO ha direito a reembolso do valor do pellet apos sua aplicacao; (d) eventual desistencia do protocolo APOS o implante NAO interrompe seus efeitos farmacologicos.

7. CUIDADOS POS-PROCEDIMENTO

O paciente compromete-se a: (a) manter curativo seco e protegido por 24-48 horas; (b) higienizar diariamente com agua e sabao neutro a partir do segundo dia; (c) NAO realizar atividade fisica intensa por 5-7 dias; (d) NAO mergulhar em piscina, mar ou banheira por 14 dias; (e) NAO expor a ferida ao sol direto por 30 dias; (f) retornar para avaliacao clinica em 30 dias e 90 dias; (g) realizar exames laboratoriais de monitoramento hormonal conforme cronograma; (h) comunicar IMEDIATAMENTE: febre; vermelhidao com calor; secrecao purulenta; dor progressiva; sintomas hormonais severos.

8. CONSENTIMENTO

Declaro ter lido este Consentimento Especifico para Implantes Subcutaneos Hormonais, compreendido a natureza minimamente invasiva mas NAO REVERSIVEL do procedimento, todos os riscos descritos, a obrigatoriedade de exames pre-implante e de monitoramento, e CONSINTO LIVRE, ESCLARECIDA E EXPRESSAMENTE com a aplicacao do(s) pellet(s) prescrito(s) no meu protocolo, nos termos aqui descritos.`,
  },

  "Consentimento Especifico — Estetica Invasiva (CEIN)": {
    titulo: "Consentimento Especifico Informado — Procedimentos Esteticos Invasivos (CEIN)",
    riscos: [
      { categoria: "comum", descricao: "Eritema e edema locais nas primeiras 24-72h" },
      { categoria: "comum", descricao: "Equimoses locais autorresolutivas" },
      { categoria: "moderado", descricao: "Assimetrias temporarias" },
      { categoria: "moderado", descricao: "Nodulos visiveis ou palpaveis" },
      { categoria: "raro", descricao: "Reacao granulomatosa tardia" },
      { categoria: "raro", descricao: "Necrose tecidual por compressao vascular" },
      { categoria: "muito_raro", descricao: "Embolia vascular com isquemia ou cegueira" },
      { categoria: "muito_raro", descricao: "Reacao anafilatica" },
    ],
    texto: `1. NATUREZA DO PROCEDIMENTO

Pelo presente Consentimento Especifico, complementar ao TCLE Global, o paciente autoriza o Instituto Padua a realizar PROCEDIMENTOS ESTETICOS INVASIVOS, abrangendo, conforme prescricao individualizada: aplicacao de toxina botulinica tipo A; aplicacao de preenchedores dermicos (acido hialuronico, hidroxiapatita de calcio, polimetilmetacrilato, policaprolactona); bioestimuladores de colageno; fios de sustentacao (PDO, PLLA); intradermoterapia (mesoterapia); microagulhamento; peeling quimico; subcisao.

2. OBJETIVOS TERAPEUTICOS

Os procedimentos esteticos integrados ao protocolo visam: harmonizacao orofacial; reducao de rugas dinamicas e estaticas; reposicao de volumes; bioestimulacao de colageno; melhora de textura cutanea; tratamento de hiperidrose; tratamento de bruxismo; redefinicao de contornos.

3. PRE-REQUISITOS E CONTRAINDICACOES

Sao OBRIGATORIOS: (a) anamnese completa com historico de cirurgias previas, alergias, doencas autoimunes, uso de medicamentos; (b) avaliacao fotografica padronizada em multiplas vistas; (c) consentimento informado especifico para cada procedimento; (d) ausencia de gestacao confirmada; (e) intervalo minimo de 14 dias de procedimentos previos no mesmo sitio.

CONTRAINDICACOES: gestacao e lactancia; doenca autoimune ativa nao controlada; uso de anticoagulante sem manejo adequado; infeccao ativa no sitio; historia de queloide; doenca neurologica que afete musculatura facial; alergia conhecida a componente do produto; expectativa irrealista do paciente; transtorno dismorfico corporal.

4. RISCOS ESPECIFICOS

4.1. COMUNS: eritema, edema e equimose locais por 24-72 horas; sensibilidade local; dor leve durante e apos a aplicacao; assimetria transitoria.
4.2. MODERADOS: assimetria persistente requerendo correcao; nodulos palpaveis; ptose temporaria de musculo nao alvo (palpebra); cefaleia transitoria; gripe-like nas primeiras 48 horas.
4.3. RAROS: reacao granulomatosa tardia (semanas a meses pos-procedimento); necrose tecidual local por compressao vascular; herpes simples reativado; infeccao bacteriana local; cicatriz atrofica ou hipertrofica.
4.4. MUITO RAROS: embolia vascular com isquemia tecidual ou cegueira (em preenchimentos faciais altos); reacao anafilatica; reacao autoimune induzida; tromboembolismo; sindrome de Tyndall persistente.

5. CARATERISTICA NAO-REVERSIVEL E TEMPORARIEDADE

O paciente reconhece que: (a) toxina botulinica tem duracao media de 3 a 6 meses, NAO sendo permanente; (b) preenchedores temporarios duram 6 a 18 meses dependendo do produto; (c) bioestimuladores podem durar 2 a 4 anos; (d) RESULTADOS ESTETICOS SAO SUBJETIVOS e podem nao corresponder integralmente as expectativas; (e) eventual insatisfacao NAO enseja reembolso, mas sim oportunidade de ajuste pelo profissional dentro de prazo razoavel.

6. CUIDADOS POS-PROCEDIMENTO

Compromete-se o paciente a: nao massagear o sitio nas primeiras 4 horas (toxina); nao deitar nas 4 horas seguintes a aplicacao de toxina; aplicar gelo intermitente nas primeiras 24 horas; evitar exposicao solar por 7 dias; nao realizar atividade fisica intensa por 24 horas; comunicar imediatamente: dor intensa progressiva, palidez tecidual, alteracao visual, sinais de necrose ou infeccao.

7. CONSENTIMENTO

Declaro ter lido este Consentimento Especifico, compreendido riscos e expectativas realistas, recebido orientacoes de cuidados, e CONSINTO LIVRE, ESCLARECIDA E EXPRESSAMENTE com a realizacao dos procedimentos esteticos invasivos prescritos no meu protocolo.`,
  },

  "Consentimento Especifico — Estetica por Tecnologia (CETE)": {
    titulo: "Consentimento Especifico Informado — Procedimentos Esteticos por Tecnologia (CETE)",
    riscos: [
      { categoria: "comum", descricao: "Eritema, sensacao de calor e edema leves" },
      { categoria: "comum", descricao: "Sensibilidade transitoria" },
      { categoria: "moderado", descricao: "Discromias temporarias" },
      { categoria: "moderado", descricao: "Bolhas em casos de ajuste inadequado de parametros" },
      { categoria: "raro", descricao: "Queimaduras de segundo grau" },
      { categoria: "raro", descricao: "Cicatriz hipertrofica ou atrofica" },
      { categoria: "muito_raro", descricao: "Discromia permanente" },
    ],
    texto: `1. NATUREZA DO PROCEDIMENTO

Pelo presente Consentimento Especifico, complementar ao TCLE Global, o paciente autoriza o Instituto Padua a realizar PROCEDIMENTOS ESTETICOS POR TECNOLOGIA, abrangendo: laser fracionado ablativo e nao-ablativo (CO2, Erbium); luz intensa pulsada (IPL); radiofrequencia mono e multipolar; ultrassom microfocado (MFU/HIFU); criolipolise; eletroestimulacao muscular (EMS); LED terapeutico.

2. OBJETIVOS TERAPEUTICOS

Visam: rejuvenescimento facial e corporal; tratamento de manchas, melasma e fotoenvelhecimento; reducao de rugas finas; tratamento de cicatrizes; depilacao definitiva; flacidez tissular; reducao de gordura localizada; tonificacao muscular; tratamento de acne ativa e cicatricial.

3. PRE-REQUISITOS E CONTRAINDICACOES

Sao OBRIGATORIOS: avaliacao da fototipo de Fitzpatrick; teste de mancha em area discreta (laser e IPL); ausencia de exposicao solar nos 14 dias previos; suspensao de retinoides topicos e despigmentantes 7 dias antes; documentacao fotografica padronizada.

CONTRAINDICACOES: gestacao e lactancia; uso de isotretinoina nos ultimos 6 meses; fotossensibilidade; doenca autoimune fotossensivel; cancer de pele ativo no sitio; marcapasso (radiofrequencia); proteses metalicas no sitio; epilepsia fotossensivel (IPL); historia de queloide; bronzeamento recente.

4. RISCOS ESPECIFICOS

4.1. COMUNS: eritema, sensacao de calor e edema leves; sensibilidade transitoria; descamacao em laser ablativo; equimose em IPL.
4.2. MODERADOS: hiper ou hipopigmentacao temporaria (ate 6 meses); bolhas em casos de ajuste inadequado de parametros; reativacao de herpes labial; foliculite transitoria; eritema persistente por mais de 14 dias.
4.3. RAROS: queimaduras de segundo grau; cicatriz hipertrofica ou atrofica; reacao paradoxal de hiperestimulacao pilosa em IPL; necrose tissular em criolipolise; alteracao da sensibilidade local persistente.
4.4. MUITO RAROS: discromia permanente; queimadura de terceiro grau; cicatriz queloideana extensa; alteracao visual em laser proximo aos olhos sem protecao adequada.

5. RESULTADOS E LIMITACOES

O paciente reconhece que: (a) resultados sao GRADUAIS e requerem tipicamente 3 a 8 sessoes para apreciacao plena; (b) manutencao periodica e necessaria — nao se tratam de procedimentos definitivos absolutos; (c) resposta individual VARIA conforme genetica, idade, fototipo, qualidade tecidual; (d) fotos pre e pos sao para documentacao clinica, podendo ser utilizadas com autorizacao especifica em protocolo de imagem.

6. CUIDADOS POS-PROCEDIMENTO

Compromete-se o paciente a: aplicar fotoprotetor FPS 50+ a cada 2 horas por 30 dias; evitar exposicao solar direta; nao manipular crostas; usar hidratante recomendado pela equipe; nao realizar exfoliacao mecanica ou quimica por 14 dias; comunicar: bolhas, dor intensa, sinais infecciosos, alteracao da pigmentacao persistente.

7. CONSENTIMENTO

Declaro ter lido este Consentimento Especifico, compreendido as expectativas realistas, riscos potenciais, necessidade de multiplas sessoes e cuidados pos-procedimento, e CONSINTO LIVRE, ESCLARECIDA E EXPRESSAMENTE com a realizacao dos procedimentos esteticos por tecnologia prescritos.`,
  },

  "Consentimento Especifico — Formulas Manipuladas (CFOR)": {
    titulo: "Consentimento Especifico Informado — Prescricao e Uso de Formulas Manipuladas (CFOR)",
    riscos: [
      { categoria: "comum", descricao: "Sintomas gastrointestinais leves nas primeiras semanas" },
      { categoria: "comum", descricao: "Alteracao transitoria do habito intestinal" },
      { categoria: "moderado", descricao: "Reacao alergica a excipientes ou principio ativo" },
      { categoria: "moderado", descricao: "Interacao medicamentosa nao previamente identificada" },
      { categoria: "raro", descricao: "Hepatotoxicidade idiossincrasica" },
      { categoria: "raro", descricao: "Discrasia sanguinea" },
      { categoria: "muito_raro", descricao: "Sindrome de Stevens-Johnson" },
    ],
    texto: `1. NATUREZA DA PRESCRICAO MAGISTRAL

Pelo presente Consentimento Especifico, complementar ao TCLE Global, o paciente autoriza o Instituto Padua a prescrever FORMULAS MAGISTRAIS MANIPULADAS — preparacoes farmaceuticas individualizadas, prescritas pelo medico assistente conforme necessidade clinica especifica, manipuladas em farmacia magistral credenciada pela ANVISA, em conformidade com Resolucao RDC 67/2007 e suas atualizacoes.

2. APRESENTACOES USUAIS

As formulas magistrais podem ser apresentadas em: capsulas (gelatinosas duras, vegetais, gastro-resistentes); comprimidos sublinguais; gotas orais; sache; po dissolvel; gel ou creme dermatologico; supositorios; pellets sublinguais; spray nasal; colirio.

3. PRINCIPIOS ATIVOS USUAIS

Conforme prescricao individualizada podem ser manipulados: vitaminas isoladas e em complexos; minerais quelados (zinco bisglicinato, magnesio dimalato, selenio metionina); aminoacidos (taurina, glicina, arginina, glutamina, ornitina, tirosina); peptideos sinteticos; nutraceuticos (curcumina, resveratrol, quercetina, berberina, ALA, CoQ10, PQQ); fitoterapicos padronizados (Rhodiola, Ashwagandha, Bacopa, Ginseng, Withania, Crocus sativus); hormonios bioidenticos (progesterona, estradiol, DHEA, pregnenolona, melatonina); reposicao tireoidiana T3-T4 sob protocolo especifico; substancias para protocolos especificos.

4. QUALIDADE E SEGURANCA

A clinica utiliza exclusivamente farmacias magistrais que: (a) estejam regularizadas perante ANVISA e Conselho Regional de Farmacia; (b) sigam padroes rigorosos de Boas Praticas de Manipulacao; (c) realizem controle de qualidade fisico-quimico das materias-primas; (d) garantam esterilidade quando aplicavel; (e) forneçam laudo analitico do lote; (f) mantenham rastreabilidade integral dos insumos.

5. RESPONSABILIDADES E LIMITACOES

5.1. O paciente reconhece que: (a) formulas manipuladas SAO DE USO INDIVIDUAL EXCLUSIVO, intransferiveis; (b) NAO PODEM SER DEVOLVIDAS apos manipulacao por se tratarem de produto personalizado (art. 49 do CDC, ressalva de produtos personalizados); (c) NAO HA DIREITO A REEMBOLSO de formulas ja preparadas; (d) a clinica NAO se responsabiliza por reacoes idiossincrasicas nao previstas e nao previsiveis a luz do conhecimento cientifico atual; (e) modificacoes na formula somente podem ser feitas mediante NOVA PRESCRICAO MEDICA; (f) o uso para alem da data de validade e proibido.

5.2. O paciente compromete-se a: (a) tomar a formula EXATAMENTE como prescrito (dose, horario, via); (b) armazenar em condicao adequada de temperatura, umidade e protecao a luz; (c) manter fora do alcance de criancas e animais; (d) NAO compartilhar com terceiros; (e) descartar adequadamente formula vencida; (f) comunicar IMEDIATAMENTE qualquer reacao adversa ou efeito inesperado.

6. RISCOS ESPECIFICOS

6.1. COMUNS: sintomas gastrointestinais leves (nausea, dispepsia, alteracao do habito intestinal) usualmente nas primeiras 1-2 semanas; gosto desagradavel (especialmente sublinguais); urina amarelada (riboflavina); sabor metalico (zinco).
6.2. MODERADOS: reacao alergica leve a excipientes ou principio ativo (urticaria, prurido, edema labial); interacao medicamentosa nao previamente identificada; cefaleia inicial; piora transitoria de sintomas (reacao de Herxheimer em fitoterapicos detoxificantes); flatulencia ou disbiose transitoria.
6.3. RAROS: hepatotoxicidade idiossincrasica de fitoterapicos; discrasia sanguinea (rara em altas doses cumulativas); reacao alergica sistemica grave; sindrome serotoninergica (combinacoes envolvendo precursores como L-tirosina ou 5-HTP em pacientes com IRSS).
6.4. MUITO RAROS: sindrome de Stevens-Johnson; necrolise epidermica toxica; insuficiencia hepatica fulminante; pancreatite aguda.

7. INTERACOES MEDICAMENTOSAS

O paciente declara ter informado integralmente todas as medicacoes em uso (alopaticas, fitoterapicos, suplementos), reconhecendo a importancia de NAO INICIAR NEM SUSPENDER qualquer outro medicamento durante o uso de formulas manipuladas sem comunicar previamente o medico assistente. Substancias particularmente sensiveis a interacoes: anticoagulantes; antidepressivos (especialmente IMAO e IRSS); imunossupressores; antineoplasicos; antiarritmicos; lithium.

8. MONITORAMENTO

O uso de formulas manipuladas requer: (a) reavaliacao clinica conforme cronograma do protocolo; (b) exames laboratoriais de controle conforme indicacao especifica do principio ativo; (c) registro continuo de sintomas e respostas no prontuario eletronico; (d) ajustes de dose ou suspensao quando indicado.

9. CONSENTIMENTO

Declaro ter lido este Consentimento Especifico para Formulas Manipuladas, compreendido a natureza personalizada, intransferivel e nao-restituivel das prescricoes magistrais, todos os riscos descritos, as responsabilidades de armazenamento e uso, e CONSINTO LIVRE, ESCLARECIDA E EXPRESSAMENTE com a manipulacao e uso das formulas prescritas no meu protocolo, conforme detalhamento na receita medica especifica que acompanha este termo.`,
  },

  "Termo de Aceite Digital e Assinatura": {
    titulo: "Termo de Aceite Digital e Assinatura Eletronica — Validade Juridica e Conformidade ICP-Brasil",
    riscos: [],
    texto: `1. NATUREZA DA ASSINATURA ELETRONICA

O paciente reconhece e aceita expressamente que o presente Termo, bem como todos os demais instrumentos juridicos e clinicos relacionados ao seu protocolo terapeutico, podem ser firmados por meio de ASSINATURA ELETRONICA OU DIGITAL, conferindo-se-lhes plena validade e eficacia juridica nos termos da MEDIDA PROVISORIA 2.200-2/2001 (que instituiu a Infraestrutura de Chaves Publicas Brasileira — ICP-Brasil) e da LEI 14.063/2020 (que regulamenta o uso de assinaturas eletronicas em interacoes com entes publicos e privados).

2. MODALIDADES ACEITAS

Sao admitidas, conforme a natureza do documento e a criticidade do procedimento: (a) ASSINATURA ELETRONICA SIMPLES — registro de aceite digital com identificacao do usuario, IP, data, hora, geolocalizacao e hash do documento; (b) ASSINATURA ELETRONICA AVANCADA — assinatura realizada por meio de tecnologia que garanta a integridade e autoria, vinculada de forma univoca ao signatario, com controle exclusivo dele; (c) ASSINATURA ELETRONICA QUALIFICADA — assinatura digital realizada com certificado digital ICP-Brasil tipo A1 ou A3, equiparada juridicamente a assinatura manuscrita.

3. ASSINATURA AVANCADA E QUALIFICADA PARA ATOS CRITICOS

Para atos clinicos de elevada criticidade, sao OBRIGATORIAS modalidades avancada ou qualificada: (a) prescricao de medicamentos controlados (Portaria SVS/MS 344/1998); (b) Termo de Consentimento Livre e Esclarecido (TCLE Global e seus consentimentos especificos); (c) atestados medicos com afastamento superior a 15 dias; (d) laudos periciais; (e) declaracoes para fins judiciais.

4. INTEGRIDADE E AUDITABILIDADE

Todo documento eletronicamente assinado e armazenado com: hash criptografico SHA-256 do conteudo no momento exato da assinatura; carimbo de tempo (timestamp) de fonte confiavel; trilha de auditoria com IP, dispositivo, geolocalizacao aproximada, navegador; armazenamento em servidor seguro com retencao minima conforme prazo legal aplicavel; impossibilidade tecnica de alteracao posterior sem deteccao automatica.

5. EQUIPARACAO A DOCUMENTO FISICO

O paciente declara compreender e aceitar que o documento eletronicamente assinado: (a) tem o MESMO VALOR JURIDICO que o documento fisico assinado de proprio punho; (b) e admissivel como meio de prova em processos administrativos, judiciais e arbitrais; (c) NAO PODE ser repudiado posteriormente sob alegacao de ausencia de assinatura fisica; (d) constitui ato juridico perfeito nos termos do art. 6 da LINDB.

6. RECUSA E ALTERNATIVA

O paciente que nao desejar utilizar assinatura eletronica pode optar pela ASSINATURA FISICA TRADICIONAL em via impressa, mediante solicitacao expressa a equipe administrativa do Instituto Padua.

7. ACEITE

Declaro ter compreendido o conceito, modalidades e validade juridica da assinatura eletronica e digital, e CONSINTO EXPRESSAMENTE com a utilizacao desta forma de assinatura para todos os documentos relacionados ao meu protocolo terapeutico, salvo manifestacao contraria especifica.`,
  },

  "Autorizacao de Uso de Imagem": {
    titulo: "Termo de Autorizacao de Uso de Imagem, Voz e Material Clinico para Fins de Documentacao, Ensino e Comunicacao",
    riscos: [],
    texto: `1. NATUREZA DA AUTORIZACAO

Pelo presente Termo, o paciente identificado no cabecalho, doravante denominado AUTORIZANTE, autoriza o INSTITUTO PADUA a registrar, armazenar e utilizar sua IMAGEM ESTATICA (fotografias), IMAGEM EM MOVIMENTO (videos), VOZ (audios), DEPOIMENTOS escritos ou orais, e MATERIAL CLINICO (resultados de exames, fotos de evolucao, antes-e-depois, laudos), nas condicoes e finalidades a seguir descritas, observado o respeito a sua dignidade, intimidade e demais direitos da personalidade tutelados pela Constituicao Federal (art. 5, X) e pelo Codigo Civil (arts. 11 a 21).

2. FINALIDADES PERMITIDAS (selecionadas pelo autorizante)

(  ) DOCUMENTACAO CLINICA INTERNA — registro de evolucao no prontuario eletronico para acompanhamento da resposta terapeutica, com acesso restrito a equipe profissional.

(  ) ENSINO E PESQUISA — utilizacao em aulas, palestras, congressos cientificos, publicacoes academicas, com pseudonimizacao e tarja de protecao de identidade quando solicitado.

(  ) COMUNICACAO INSTITUCIONAL — divulgacao em material publicitario do Instituto Padua, site oficial, redes sociais, materiais impressos e digitais.

(  ) DEPOIMENTO TESTEMUNHAL — gravacao e divulgacao de depoimento sobre a experiencia terapeutica pessoal, sem mencao a outros pacientes ou metodologias proprietarias.

(  ) MATERIAL DIDATICO — composicao de cursos, livros, ebooks, podcasts e demais conteudos educativos da equipe medica.

3. ESCOPO DA AUTORIZACAO

A autorizacao e concedida em carater: (a) GRATUITO — sem direito a remuneracao, royalties ou qualquer contraprestacao financeira pelo uso da imagem; (b) NAO-EXCLUSIVO — o autorizante mantem o direito de uso pessoal de sua propria imagem; (c) PRAZO INDETERMINADO — vigente pelo prazo legal, podendo ser revogada a qualquer tempo conforme clausula 6; (d) ABRANGENCIA TERRITORIAL MUNDIAL — admitindo uso em qualquer territorio onde o material seja licitamente difundido; (e) ABRANGENCIA TECNICA AMPLA — permitindo uso em quaisquer midias atualmente conhecidas ou que venham a ser desenvolvidas.

4. EDICAO E TRATAMENTO

O autorizante concorda que o material possa ser submetido a: edicao tecnica para qualidade visual e sonora; ajustes de cor, brilho e contraste; corte de trechos; agregacao de legendas, marcas d'agua e elementos graficos institucionais; combinacao com outros materiais — sempre preservando a dignidade e a veracidade do conteudo, sem distorcoes que possam atribuir ao paciente declaracoes ou comportamentos nao realizados.

5. VEDACOES EXPRESSAS

E EXPRESSAMENTE VEDADO ao Instituto Padua: (a) utilizacao do material em contexto pejorativo, vexatorio, discriminatorio ou que cause constrangimento ao autorizante; (b) divulgacao sem o consentimento previo do autorizante quando contiver informacao clinica especifica e identificavel; (c) uso comercial por terceiros sem autorizacao adicional escrita; (d) modificacao com tecnologias de manipulacao que falsifiquem declaracoes (deepfake, etc.).

6. REVOGACAO

O autorizante pode revogar esta autorizacao a qualquer tempo, mediante comunicacao por escrito ao Instituto Padua, com efeito EX NUNC: (a) cessando IMEDIATAMENTE novas publicacoes do material; (b) sendo retirado dentro de prazo razoavel (30 dias) de canais sob controle direto do Instituto, como site e redes sociais oficiais; (c) ressalvada a impossibilidade de retirada de material ja publicado em terceiros ou ja distribuido em meio fisico; (d) sem retroagir sobre usos ja consumados ate a data da revogacao.

7. PROTECAO DE DADOS

Toda imagem ou material clinico trafegara e sera armazenada em conformidade com a Lei 13.709/2018 (LGPD), em servidor seguro, com criptografia, acesso restrito a equipe autorizada, trilha de auditoria, e nas demais condicoes detalhadas no Termo de Consentimento LGPD.

8. ACEITACAO

Declaro ter lido integralmente este Termo, compreendido as finalidades, vedacoes, prazo, abrangencia e direito de revogacao, e MANIFESTO MINHA CONCORDANCIA EXPRESSA com a autorizacao concedida nos termos das finalidades acima assinaladas.`,
  },
};

async function reificarTermosJuridicos() {
  console.log("\n[REIFICACAO] Hidratando termos_juridicos com texto rebuscado...");
  const termosAtuais = await db.select().from(termosJuridicosTable);
  const log: any[] = [];

  for (const termo of termosAtuais) {
    const enriched = TERMOS_RIQUECIDOS[termo.titulo];
    if (!enriched) {
      console.log(`  [SKIP] Sem enriquecimento mapeado para: ${termo.titulo}`);
      continue;
    }
    const before = (termo.textoCompleto || "").length;
    await db
      .update(termosJuridicosTable)
      .set({
        titulo: enriched.titulo,
        textoCompleto: enriched.texto,
        riscosEspecificos: enriched.riscos,
        versao: (termo.versao || 1) + 1,
        atualizadoEm: new Date(),
      })
      .where(eq(termosJuridicosTable.id, termo.id));
    const after = enriched.texto.length;
    log.push({
      titulo: termo.titulo,
      antes_chars: before,
      depois_chars: after,
      multiplicador: (after / Math.max(before, 1)).toFixed(1) + "x",
      riscos: enriched.riscos.length,
    });
    console.log(`  [OK] ${termo.titulo}: ${before} -> ${after} chars (${(after / Math.max(before, 1)).toFixed(1)}x)`);
  }
  return log;
}

async function classificarERegistrarTodos() {
  console.log("\n[REIFICACAO] Classificando 67 documentos e registrando em mapeamento_documental...");
  const docs = await db.select().from(documentosReferenciaTable);
  await db.delete(mapeamentoDocumentalTable);
  const log: any[] = [];

  for (const doc of docs) {
    const cls = classifyDoc({
      titulo: doc.titulo,
      categoria: doc.categoria,
      conteudoCompleto: doc.conteudoCompleto,
    });
    let tabelas: string[] = [];
    let chunks = 0;
    let inseridas = 0;
    let atualizadas = 0;
    let status: any = "CLASSIFICADO";
    const detalhes: any = { classificacao: cls };

    if (cls.tipo === "JURIDICO_TCLE") {
      const blocks = extractTermoBlocks(doc.conteudoCompleto);
      chunks = blocks.length;
      tabelas = ["termos_juridicos"];
      detalhes.subtipos = cls.subtipos;
      detalhes.blocos_tcle_extraidos = blocks.length;
      detalhes.cabecalhos = blocks.slice(0, 8).map((b) => b.header.slice(0, 80));
      status = "EXTRAIDO";
    } else if (cls.tipo === "RAS_TEMPLATE") {
      tabelas = ["ras", "ras_evolutivo", "rasx_pdf_renderer"];
      detalhes.serve_como = "modelo de layout para gerador de PDF";
      status = "MAPEADO";
    } else if (cls.tipo === "RECEITA_TEMPLATE") {
      tabelas = ["doencas", "revo_medicamentos", "estado_saude_paciente"];
      detalhes.serve_como = "extracao de patologias e medicamentos";
      status = "MAPEADO";
    } else if (cls.tipo === "ARQUITETURA") {
      tabelas = ["regras_motor", "padcom_competencias_regulatorias", "narrativas_agente"];
      detalhes.serve_como = "regras arquiteturais e de compliance";
      status = "MAPEADO";
    } else if (cls.tipo === "AGENTES") {
      tabelas = ["agentes_motor_escrita", "agentes_personalidade", "narrativas_agente"];
      detalhes.serve_como = "templates de escrita dos agentes virtuais";
      status = "MAPEADO";
    } else if (cls.tipo === "MANIFESTO") {
      tabelas = ["regras_motor", "padcom_competencias_regulatorias"];
      detalhes.serve_como = "regras semanticas do motor clinico";
      status = "MAPEADO";
    } else if (cls.tipo === "IMPEDIMENTOS") {
      tabelas = ["regras_motor", "auditoria_cascata"];
      detalhes.serve_como = "regras de impedimento e cascata";
      status = "MAPEADO";
    } else {
      tabelas = ["nenhuma"];
      detalhes.observacao = "Documento sem mapeamento direto a tabela";
      status = "DORMENTE";
    }

    for (const tab of tabelas) {
      await db.insert(mapeamentoDocumentalTable).values({
        documentoReferenciaId: doc.id,
        classificacao: cls.tipo,
        tabelaDestino: tab,
        chunksExtraidos: chunks,
        linhasInseridas: inseridas,
        linhasAtualizadas: atualizadas,
        status,
        detalhes,
      });
    }
    log.push({ id: doc.id, titulo: doc.titulo, classificacao: cls.tipo, tabelas: tabelas.join("|"), status, chunks });
  }
  return log;
}

async function main() {
  const t0 = Date.now();
  console.log("=".repeat(80));
  console.log("MOTOR DE REIFICACAO SISTEMICA MULTIPLANAR — DR. REPLIT V1");
  console.log("=".repeat(80));

  const logTermos = await reificarTermosJuridicos();
  const logMap = await classificarERegistrarTodos();

  // Sumario por categoria
  const porClass: Record<string, number> = {};
  for (const l of logMap) porClass[l.classificacao] = (porClass[l.classificacao] || 0) + 1;

  // Verificacao final dos termos
  const termosFinal = await db.select().from(termosJuridicosTable);
  const totalCharsTermos = termosFinal.reduce((acc, t) => acc + (t.textoCompleto || "").length, 0);

  // Verificacao mapeamento
  const totalMap = await db.select({ count: sql<number>`count(*)::int` }).from(mapeamentoDocumentalTable);

  // Report
  const report = `# RELATORIO DE REIFICACAO SISTEMICA MULTIPLANAR
**Executado em:** ${new Date().toISOString()}  
**Tempo total:** ${((Date.now() - t0) / 1000).toFixed(1)}s  
**Autor:** DR_REPLIT_REIFICATION_ENGINE_V1

---

## I. ANASTOMOSE DOCUMENTAL — TERMOS JURIDICOS REBUSCADOS

| Termo | Antes (chars) | Depois (chars) | Multiplicador | Riscos catalogados |
|---|---:|---:|---:|---:|
${logTermos.map((l) => `| ${l.titulo} | ${l.antes_chars} | ${l.depois_chars} | ${l.multiplicador} | ${l.riscos} |`).join("\n")}

**Total de caracteres antes:** ${logTermos.reduce((a, l) => a + l.antes_chars, 0)}  
**Total de caracteres depois:** ${totalCharsTermos}  
**Crescimento:** ${(totalCharsTermos / Math.max(logTermos.reduce((a, l) => a + l.antes_chars, 0), 1)).toFixed(1)}x

## II. CLASSIFICACAO DOS 67 DOCUMENTOS DORMENTES

| Classificacao | Quantidade |
|---|---:|
${Object.entries(porClass).map(([k, v]) => `| ${k} | ${v} |`).join("\n")}

**Total de mapeamentos criados:** ${totalMap[0]?.count || 0}

## III. DETALHE POR DOCUMENTO

| ID | Titulo | Classificacao | Tabelas Destino | Status | Chunks |
|---:|---|---|---|---|---:|
${logMap.map((l) => `| ${l.id} | ${l.titulo.slice(0, 60)} | ${l.classificacao} | ${l.tabelas} | ${l.status} | ${l.chunks} |`).join("\n")}

---

## IV. PROXIMOS PASSOS

1. **Religar gerador de PDF** (\`rasxPdf.ts::gerarRacjPdf\`) para LER de \`termos_juridicos\` ao inves de hardcoded.
2. Encarnar Receita Modelo da Natacha (id 65) -> doencas + revo_medicamentos para paciente_id=43.
3. Materializar 507 sessoes faltantes em \`appointments\` a partir de \`tratamento_itens\`.
4. Persistir RAS gerado (insert em \`ras\` + \`ras_evolutivo\` com hash SHA-256 do PDF).
5. Extender mapeamento para Agentes, Manifestos e Arquitetura (Onda 2).

---
**FIM DO RELATORIO**
`;

  writeFileSync(resolve(OUT_DIR, "RELATORIO_REIFICACAO.md"), report);
  console.log(`\n[OK] Relatorio salvo em: ${resolve(OUT_DIR, "RELATORIO_REIFICACAO.md")}`);
  console.log(`\n=== SUMARIO ===`);
  console.log(`Termos juridicos enriquecidos: ${logTermos.length}`);
  console.log(`Total de chars dos termos: ${totalCharsTermos.toLocaleString()} (era ~3.246)`);
  console.log(`Documentos classificados: ${logMap.length}`);
  console.log(`Mapeamentos registrados: ${totalMap[0]?.count || 0}`);
  console.log(`Tempo total: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[ERRO]", err);
    process.exit(1);
  });
