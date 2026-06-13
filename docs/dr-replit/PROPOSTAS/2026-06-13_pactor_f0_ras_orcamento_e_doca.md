# PACTOR — F0 (Gerador de RAS + Orçamento) e organização da doca

1. METADADOS

1.1. Data: 13/06/2026
1.2. Autor: Dr. Replit IHE
1.3. Origem: carta do cacique (Caio) ratificada pelo Dr. Claude
1.4. Tipo: decisão autônoma registrada (protocolo anti-ectoplasma)

2. CONFIRMAÇÃO DA CARTA

2.1. Confirmado OK, sem veto.
2.2. Aceita a mudança de prioridade: Caixa antes da Enfermagem.
2.3. Nova ordem de fases acordada:
2.3.1. F0 = tela do Gerador de RAS + Orçamento com dados de exemplo.
2.3.2. F1 = conexão real: lista de pacientes verdadeiros da unidade 15.
2.3.3. F2 = gera RAS (Premium e Simples) do paciente.
2.3.4. F3 = gera Orçamento (cenários + parcelas) do paciente.
2.3.5. F4 = Agenda: lança os agendamentos das sessões.
2.3.6. F5 = App de Enfermagem (PIN + rubrica), depois do caixa.
2.3.7. F6 = RAS Jurídico + Distrato (estrutura com placeholders; texto legal vai ao advogado).

3. O QUE FOI CONSTRUÍDO NA F0

3.1. Arquivo: `artifacts/mockup-sandbox/src/components/mockups/pactor-gerador-ras/RasOrcamento.tsx`.
3.2. Tela com 3 colunas: lista de pacientes, RAS no centro, Orçamento à direita.
3.3. Toggle RAS PREMIUM / RAS SIMPLES (Premium mostra dose, frequência e justificativa; Simples condensa).
3.4. Orçamento com 4 cenários: À vista (7% desconto), 3x sem juros, 6x sem juros (recomendado), 12x com juros.
3.5. Dados de exemplo: paciente Ana Beatriz Moraes (PAD-0142), itens R$ 6.000,00 + honorários R$ 600,00 = total R$ 6.600,00.
3.6. Design PENUMBRA: duas faces (Paper Ciano claro / Navy Ciano escuro), JetBrains Mono, cantos retos, zero emoji, faixa lilás no RAS, faixa menta no Orçamento, só o cenário recomendado pulsando (regra K1).
3.7. É mockup com dados de exemplo; ainda não lê dados reais (isso é a F1).

4. PREMISSA ASSUMIDA — ORGANIZAÇÃO DA DOCA

4.1. A carta deixou a critério qual local usar para a doca exclusiva do Pactor.
4.2. Decisão: a lógica pura em TypeScript permanece na lib `lib/pactor-transmutacao`.
4.3. Motivo: ali a lógica é rodável e testável (módulos `padronizacao`, `orcamento`, `varredura`, `ordenacao` com testes; a ONDA A já foi aprovada nesse lugar). Mover o `.ts` para `docs/` o tira dos globs do monorepo e quebra os testes aprovados.
4.4. A pasta `docs/dr-replit/PARA_PACTOR/` passa a ser a doca de ESPECIFICAÇÕES por módulo (legível via raw pelo Dr. Claude), com as 6 sub-pastas: padronizacao, protocolos, orcamento, agenda, enfermagem, juridico.
4.5. As telas em React o Dr. Replit Pactor monta no repositório dele, puxando lógica da lib e specs da doca.

5. ARQUITETURA v1 (decisão do cacique, registrada)

5.1. O Pactor LÊ do IHE via API (verdade única), usando os pacientes reais que já existem.
5.2. Isso torna o Pactor v1 um cockpit em cima do PAWARDS: código separado, dado compartilhado.
5.3. Independência total (banco próprio, vendável sozinho) fica como evolução futura, não agora.

6. PRÓXIMAS FASES E PENDÊNCIAS

6.1. F1 depende de duas rotas de leitura no IHE (listar pacientes da unidade 15; depois listar sessões).
6.2. F5 vai precisar de uma rota de escrita no IHE (registrar aplicação com PIN).
6.3. F6 (Jurídico/Distrato) só monta a estrutura; o texto legal final é revisado por advogado antes do uso com paciente.

RESUMO EM 1 LINHA: confirmei a carta, entreguei a tela F0 (Gerador de RAS + Orçamento) com dados de exemplo no PENUMBRA, e organizei a doca mantendo a lógica na lib testável e as specs em docs/PARA_PACTOR.
