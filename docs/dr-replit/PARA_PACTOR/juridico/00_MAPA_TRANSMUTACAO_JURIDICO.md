# Jurídico do Pactor — mapa de transmutação (entra na F6, depois do caixa)

1. PRINCÍPIO

1.1. Kaizen-first: transmutar o que já existe no PAWARDS, não recriar do zero.
1.2. Os textos jurídicos reais já estão na tabela `termos_juridicos` — puxar de lá, nunca inventar.
1.3. Esta é só a planta (mapa); a construção é na F6, depois do caixa rodar (F0 a F4).

2. FONTES VERIFICADAS NO IHE (conferidas em 13/06/2026)

2.1. Schema: `lib/db/src/schema/termosJuridicos.ts`.
2.2. Rotas: `artifacts/api-server/src/routes/termosJuridicos.ts`.
2.3. Geradores de PDF: `artifacts/api-server/src/pdf/gerarRAS.ts`, `gerarTermoPARQ.ts`, `rasxMotorPdf.ts`, `rasxPdf.ts`.

3. ESTRUTURA REAL DA TABELA (campos que importam)

3.1. `termos_juridicos`: bloco, subgrupo, consentimento, titulo, textoCompleto, versao, ativo, categoria, riscosEspecificos (JSONB), metadados (JSONB).
3.2. `termos_assinados`: pacienteId, termoId, versaoAssinada, tituloTermo, textoNoMomentoAssinatura, meioAssinatura, profissionalResponsavel, dataAssinatura.
3.3. O `meioAssinatura` já aceita: presencial, digital_doxite, digital_pawards, whatsapp.

4. AS 8 CATEGORIAS QUE JÁ EXISTEM

4.1. lgpd — proteção de dados.
4.2. privacidade — privacidade do paciente.
4.3. nao_garantia — isenção de garantia de resultado.
4.4. tcle_global — Termo de Consentimento Livre e Esclarecido.
4.5. consentimento_especifico — consentimento por procedimento.
4.6. imagem — uso de imagem.
4.7. aceite_digital — aceite eletrônico.
4.8. ciencia_financeira — ciência dos valores e pagamento.

5. O QUE TRANSMUTAR (planta, não construído ainda)

5.1. RAS PREMIUM e RAS SIMPLES: já existem no Code.gs do RAS v8 e em `gerarRAS.ts`; transmutar as duas versões para o Pactor.
5.2. RAS JURÍDICO: termo que importa TUDO do tratamento via placeholder — ativos, doses, sessões, frequência E financeiro (valores, parcelas, total).
5.2.1. Via técnica: usar o JSONB `metadados` do termo para guardar o pacote de dados do tratamento no momento da geração; `riscosEspecificos` para os riscos por item.
5.3. CONTRATO COMPLETO: montar o documento com os textos reais já presentes na tabela `termos_juridicos` (puxa, não inventa).

6. DISTRATO — CATEGORIA 9 NOVA

6.1. Criar categoria nova `distrato` (rescisão durante o tratamento) no enum de `categoria`.
6.2. Montar só a ESTRUTURA com placeholders: dados do tratamento + cláusula de rescisão.
6.3. ATENÇÃO: o texto legal final do distrato será revisado por advogado antes de uso real com paciente.
6.4. Premissa registrada: o agente monta o esqueleto; o cacique leva ao advogado; nenhuma cláusula legal definitiva é inventada.

7. PLACEHOLDERS — ESBOÇO (a fechar na F6)

7.1. Paciente: {{paciente.nome}}, {{paciente.codigo}}.
7.2. Tratamento: {{tratamento.itens}}, {{tratamento.doses}}, {{tratamento.sessoes}}, {{tratamento.frequencia}}.
7.3. Financeiro: {{financeiro.total}}, {{financeiro.parcelas}}, {{financeiro.cenario}}.
7.4. Esses placeholders são o mesmo "sangue" da F0 (Gerador de RAS + Orçamento); a F6 reaproveita.

8. ONDE ENTRA NA FILA

8.1. Caixa primeiro: RAS + Orçamento + Agenda (F0 a F4).
8.2. Jurídico (RAS jurídico + contrato + distrato) entra na F6.
8.3. Mapeado agora para não virar retrabalho.

RESUMO EM 1 LINHA: o arsenal jurídico existe mesmo no PAWARDS (8 categorias, JSONB de metadados e riscos, rotas e geradores de PDF), o distrato é a categoria 9 nova com revisão de advogado, e a F6 vai transmutar isso reaproveitando os placeholders da F0.
