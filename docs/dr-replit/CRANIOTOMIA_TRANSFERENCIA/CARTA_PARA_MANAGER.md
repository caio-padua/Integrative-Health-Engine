# Carta ao Replit Manager — reprodução fiel da Craniotomia V4

## 1. Pedido e forma de trabalhar

Replit Manager, quero a Craniotomia V4 do IHE (Integrative Health Engine) dentro do nosso sistema, com o mesmo desenho e integrada aos dados reais do Manager.
Trabalhe em fila, uma etapa por vez, sem iniciar agentes paralelos ou tarefas adicionais por iniciativa propria.
Nao substitua esta tela por outro painel nem redesenhe sua composicao em relevo tridimensional.
Mantenha a navegacao externa do Manager e use "cliente" para a pessoa atendida.

## 2. Fontes exatas

Baixe o pacote completo:
https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/CRANIOTOMIA_MANAGER_COMPLETO.zip

Esse endereco depende de o ambiente de desenvolvimento do IHE estar ativo.
Se estiver indisponivel, solicite o ZIP ao Caio; nao invente o conteudo nem substitua por aproximacao.
Extraia em uma pasta de referencia, sem sobrescrever a aplicacao existente.
O diretorio interno e CRANIOTOMIA_V4_MANAGER.

Leia integralmente nesta ordem:
1. LEIA_PRIMEIRO.md.
2. MANUAL_REPRODUCAO.md.
3. CONTRATO_INTEGRACAO.md.
4. CHECKLIST_ACEITE.md.
5. A auditoria em auditoria/ e os fontes em originais/.
6. Compare com referencia/referencia-craniotomia-v4.jpg.
7. Confira MANIFESTO.json e DEPENDENCIAS.json.

O repositorio de origem e https://github.com/caio-padua/Integrative-Health-Engine.
A linha de trabalho de referencia e ver-l2-dr-claude.
Nao presuma que a linha padrao replit-agent possui o mesmo conteudo.
Em 23/11/2026, o guia de transferencia nao estava publicado nessa linha remota; o pacote e a fonte entregue para esta tarefa.

Referencia visual ao vivo:
https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/__mockup/preview/craniotomia/CraniotomiaV4

Editor operacional de origem, com aparencia diferente:
https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/craniotomia

## 3. Tela que deve ser reproduzida

Parta de originais/artifacts/mockup-sandbox/src/components/mockups/craniotomia/CraniotomiaV4.tsx.
Leia junto _group.css e _mockData.ts.
Os demais componentes dessa pasta sao variantes de referencia, nao substitutos da V4.

Preserve:
1. Tres seletores superiores: VISUALIZACAO, EDICAO e SIMULACAO.
2. Grafo superior com caixas de origem, curvas de ligacao e caixas de destino.
3. Matriz-espelho inferior sincronizada com a selecao do grafo.
4. Caixas de marcacao individuais e coletivas, separadas da selecao da linha.
5. Legenda esquerda recolhivel e inspetor direito recolhivel e redimensionavel.
6. Divisoria horizontal arrastavel entre grafo e matriz.
7. Pesquisa, filtros, foco de selecao, isolamento e detalhes da regra.
8. Cores, tipografia, bordas, hierarquia e estados conforme fonte e captura.

Geometria original:
- Divisao inicial 50%; limites de arraste 15% a 85%.
- Controles GRAFO, MATRIZ e RESET preservados.
- Legenda esquerda 64 pixels; recolhida 24 pixels.
- Inspetor direito inicial 320 pixels; minimo 220 e maximo 560; recolhido 24.
- Divisoria horizontal 6 pixels; alca lateral 4 pixels.
- Caixas de origem 220 pixels e de destino 240 pixels no original.
- Atalhos V, E e S fora dos campos de digitacao.
- Persistencia das preferencias visuais no navegador, sem confundir com persistencia das regras.

Leia no manual as formulas das curvas, espessuras, opacidades, agrupamentos e chaves de estado.
Corrija sobreposicao de caixas e contraste invalido sem alterar a anatomia aprovada.
Nao replique o historico ficticio, o percentual fixo ou identificadores demonstrativos como informacao real.

## 4. O que e demonstracao e o que funciona

A V4 e um prototipo visual, com dados demonstrativos.
Seu seletor SIMULACAO nao executa um simulador real.
Algumas acoes de editar, duplicar, excluir e pausar sao apenas apresentacao nessa versao.
O editor operacional possui consultas e gravacoes reais, mas outra aparencia.
Quero o visual da V4 ligado conscientemente ao motor do Manager, nao uma demonstracao disfarçada.

Leia estes fontes operacionais do pacote:
- originais/artifacts/clinica-motor/src/pages/craniotomia.tsx.
- originais/artifacts/clinica-motor/src/pages/craniotomia-loteamento.tsx.
- originais/artifacts/clinica-motor/src/pages/craniotomia-shared.ts.
- originais/artifacts/api-server/src/routes/, principalmente regras do motor e anamnese.
- Esquemas e contratos incluidos no pacote.

## 5. Integracao obrigatoria

Antes de editar, identifique no Manager o motor, as perguntas, as respostas, o catalogo, as regras, as sugestoes e as permissoes existentes.
Documente a correspondencia; nao crie tabelas ou motores duplicados sem necessidade.

Fluxo de configuracao:
Tela V4 -> adaptador -> servico de regras -> armazenamento real.

Fluxo clinico:
Anamnese salva -> avaliacao de regras ativas -> sugestoes pendentes -> validacao profissional -> ponte explicita para pedidos ou prescricoes.

As rotas abaixo pertencem ao IHE; confira equivalentes no Manager:
- GET /api/motor-clinico/regras.
- GET /api/motor-clinico/loteamento.
- POST /api/motor-clinico/regras.
- PATCH /api/motor-clinico/regras/:id.
- POST /api/anamnese/:id/ativar-motor.
- GET /api/motor-clinico/sugestoes.
- POST /api/motor-clinico/sugestoes/:id/validar.

API significa interface de programacao de aplicacoes.
Nao execute /api/motor-clinico/sync-catalogo para importar a tela: essa operacao reconstrói o catalogo.
Nao importe clientes, credenciais ou identificadores numericos do IHE.
Resolva cada destino pelo catalogo real do Manager.
Nao invente peso, governanca, historico, contagem de ativacoes ou ultima edicao quando o servidor nao fornecer esses dados.

## 6. Gatilhos e seguranca clinica

A auditoria da origem encontrou comparacao textual por substring, sem negacao ou sujeito confiaveis.
Nao copie esses defeitos.
Cada regra deve indicar pergunta, operador, resposta esperada, contexto, destino, estado e versao.
Mostre qual resposta ativou qual regra e qual sugestao, com motivo legivel.
Distinga doenca afirmada, doenca negada e historico familiar.
Respeite recusa de formulas, injetaveis ou implantes e restricoes clinicas aplicaveis.
Nao presuma que ausencia de restricao representa avaliacao de seguranca concluida.
Nao gere sugestoes duplicadas ao repetir uma operacao.
Valide acesso por unidade e permissao no servidor.
Validar sugestao nao significa automaticamente emitir prescricao.

SIMULACAO precisa usar avaliacao sem gravar sugestoes ou alterar prontuario.
Deve mostrar regras ativadas, descartadas e respectivos motivos.
Se nao houver capacidade real, mostre indisponibilidade explicita em vez de botao falsamente funcional.
Nao implemente exclusao definitiva sem politica de historico e referencias.

## 7. Execucao e provas

Execute sequencialmente:
1. Especificacao escrita e mapa do sistema existente.
2. Reproducao visual fiel.
3. Leitura de regras e catalogo reais.
4. Criacao, edicao e pausa com releitura apos recarregar.
5. Simulacao sem escrita.
6. Integracao clinica autorizada e testes isolados.
7. Conferencia final com captura visual e checklist.

Nao altere calculo de orcamento, autenticacao global ou cadastro de clientes por causa desta tela.
Nao importe automaticamente as 37 regras da auditoria como regras clinicas aprovadas.
Teste negacao, historico familiar, acentos, palavra parcial, recusas, repeticao, permissoes e isolamento entre unidades.
Para cada controle, prove comportamento real ou declare a pendencia.
Entregue o endereco exato da tela no Manager e um relatorio de arquivos alterados, verificacoes e limites.

Por fim, registre as alteracoes em commit e envie ao GitHub pelo fluxo autorizado do Manager.
Nao use envio forcado nem descarte conflitos ou trabalho alheio.
Devolva o endereco publico do documento, o endereco raw (conteudo direto) e o SHA (identificador criptografico) do commit como prova.
Se o envio estiver bloqueado, declare explicitamente "somente local" e o motivo.

RESUMO EM 1 LINHA: reproduzir fielmente a Craniotomia V4 e integra-la ao Manager em fila, com dados verdadeiros, gatilhos explicaveis e seguranca clinica verificada.
