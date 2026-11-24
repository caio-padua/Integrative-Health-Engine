# Critérios de aceite para o Manager

## 1. Fidelidade visual

- [ ] Os três modos são VISUALIZAÇÃO, EDIÇÃO e SIMULAÇÃO, na região superior.
- [ ] Grafo superior e matriz inferior aparecem juntos.
- [ ] A legenda esquerda recolhe e expande.
- [ ] O inspetor direito recolhe, expande e permite ajuste de largura.
- [ ] O divisor central permite arrastar e oferece GRAFO, 50/50 e MATRIZ.
- [ ] As caixas de marcação são diferentes da seleção da linha.
- [ ] Clique em conexão e clique em linha selecionam a mesma regra.
- [ ] Busca e filtros afetam grafo e matriz de forma coerente.
- [ ] Isolar vizinhança e sair com Escape funcionam.
- [ ] Não há sobreposição ilegível de caixas com o conjunto completo.
- [ ] Capturas de computador e celular mostram acesso a todos os controles.
- [ ] As fontes, bordas retas, cores e densidade correspondem à referência.

## 2. Integração e persistência

- [ ] A versão operacional não importa `_mockData.ts`.
- [ ] Cada linha corresponde a uma regra real.
- [ ] Cada destino tem identificador e código resolvidos no catálogo.
- [ ] Dados ausentes não recebem peso, histórico ou contagem inventados.
- [ ] Criar regra, recarregar e reler confirma a persistência.
- [ ] Editar regra, recarregar e reler confirma os campos alterados.
- [ ] Pausar regra impede sua participação no motor.
- [ ] Erro de leitura não aparece como “zero regras”.
- [ ] Clique duplo, repetição de solicitação e duas abas não duplicam o mesmo vínculo.
- [ ] Falha de gravação não apresenta mensagem de sucesso.
- [ ] Botões sem capacidade implementada são desabilitados com explicação.
- [ ] SIMULAÇÃO não insere sugestões, não prescreve e não envia mensagens.

## 3. Segurança e comportamento clínico

- [ ] Não autenticado recebe bloqueio.
- [ ] Operador de unidade não altera regra global sem autorização.
- [ ] Um cliente de outra unidade não pode ser acessado por troca de identificador.
- [ ] Identidade do validador vem da sessão, não do corpo da solicitação.
- [ ] “Nega fadiga” não se comporta como afirmação de fadiga.
- [ ] História familiar não é confundida com diagnóstico do cliente.
- [ ] Acentos têm tratamento definido e testado.
- [ ] Fragmentos de palavras não ativam regras indevidamente.
- [ ] Recusa de fórmula, injetável ou implante é respeitada.
- [ ] Alergias e contraindicações têm política explícita, revisada por profissional.
- [ ] A via de administração corresponde ao item efetivamente sugerido.
- [ ] Reativar a mesma execução não duplica sugestões.
- [ ] Cada sugestão explica pergunta, resposta, regra e versão de origem.
- [ ] Falha parcial não deixa anamnese “concluída” com gravação incoerente.
- [ ] Validação não é confundida com prescrição ou pedido já emitido.

## 4. Prova de entrega

- [ ] Informar quais arquivos foram alterados no Manager.
- [ ] Informar qual parte continua demonstrativa ou indisponível.
- [ ] Apresentar capturas reais e resultados dos testes.
- [ ] Informar o endereço exato da tela no Manager.
- [ ] Salvar a documentação em `docs/craniotomia/`.
- [ ] Fazer Commit & Push, isto é, registrar e enviar as alterações ao GitHub autorizado.
- [ ] Devolver endereço do arquivo bruto e identificador criptográfico da revisão enviada.
- [ ] Se o envio estiver impedido, declarar “somente local”, sem inventar endereço ou comprovante.

**RESUMO EM 1 LINHA:** Só aceitar como operacional o que conservar o visual e comprovar leitura, gravação, autorização e comportamento clínico correto.
