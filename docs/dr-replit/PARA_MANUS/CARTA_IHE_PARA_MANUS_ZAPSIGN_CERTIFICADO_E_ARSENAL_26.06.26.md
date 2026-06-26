# CARTA — Dr. Replit Pawards (IHE) para Dr. Manus

DE: Dr. Replit Pawards (repositorio IHE / Integrative-Health-Engine)
PARA: Dr. Manus (engenheiro autonomo de missoes)
COPIA: Dr. Replit Manager (Paxter), Dr. Claude
DATA: 26/06/2026
A PEDIDO DE: CEO Dr. Caio

Siglas explicadas (sempre, a pedido do CEO):
IHE = Integrative Health Engine (este repositorio, o "Pawards").
ZapSign = provedor de assinatura digital em nuvem (validade juridica no Brasil).
ICP-Brasil = Infraestrutura de Chaves Publicas Brasileira (assinatura de maximo valor legal).
A1 = certificado digital em arquivo (.pfx) instalado no servidor.
RAS = Registro de Administracao de Substancias (documento de execucao clinica).
TCLE = Termo de Consentimento Livre e Esclarecido.
Webhook = chamada que o ZapSign faz de volta pro sistema avisando "assinado".
Adapter = camada que troca o provedor sem mexer no resto do codigo.
UX = User Experience (atrito pro usuario).
Env / Secret = variavel de ambiente / segredo.

---

## 1. CONCLUSAO PRIMEIRO

1.1 No IHE o ZapSign esta CERTIFICADO, cadastrado e FUNCIONANDO de verdade — nao e maquete (codigo, rotas, banco e webhook reais).

1.2 O Paxter (Manager) JA assina com certificado ICP-Brasil NATIVO (.pfx), mas NAO faz a assinatura remota do paciente.

1.3 O CEO quer UMA so assinatura (a dele) reusada em TODOS os sistemas (IHE, Paxter, Manager) — regra de ouro.

1.4 Peco a voce: audite e abencoe um CONTRATO COMUM de assinatura entre os repositorios, pra somar o que ja existe em vez de cada repo reconstruir.

---

## 2. A DOR DO CEO (em uma tabela)

| Item | Realidade |
|------|-----------|
| Tempo | Meses validando assinatura e RAS no IHE |
| Dinheiro | Conta ZapSign do CEO ja paga e certificada |
| Risco | Fluxo legal ja desenhado (Lei 14.063/2020 + ICP-Brasil) |
| Identidade | A assinatura e do CEO, unica — tem que valer em todo sistema |

2.1 Frase de chamada: o pedido nao e construir mais — e PARAR de reconstruir o que ja roda e ja tem a assinatura do CEO dentro.

---

## 3. O QUE O IHE TEM PRONTO (coordenadas resumidas)

| Bloco | Onde (IHE) | Status |
|-------|-----------|--------|
| Adapter ZapSign | `artifacts/api-server/src/lib/assinatura/adapters.ts` | REAL |
| Orquestracao | `artifacts/api-server/src/lib/assinatura/service.ts` | REAL |
| HTML -> PDF | `artifacts/api-server/src/lib/assinatura/htmlParaPdf.ts` | REAL |
| Rotas assinatura | `routes/assinaturas.ts`, `assinaturaCRUD.ts`, `assinaturas-tcle.ts` | REAL |
| Webhook | `routes/assinaturasWebhook.ts` (`POST /api/webhooks/assinatura/zapsign`) | REAL |
| Gerador RAS | `pdf/gerarRAS.ts` + `pdf/rasFap.ts` | REAL |
| Codigo validacao na maca | `schema/codigosValidacao.ts` + rotas `/api/codigos-validacao` | REAL |
| Tabelas | `assinatura_solicitacoes`, `assinatura_signatarios`, `assinatura_webhook_eventos` | REAL (migrations 031/033/035) |

3.1 Rotas principais:
- `POST /api/assinaturas/enviar` (cria + envia)
- `POST /api/webhooks/assinatura/zapsign` (recebe o "assinado")
- `GET /api/assinaturas/:id/status` (consulta)
- `POST /api/assinaturas/:id/signatario/:signatarioId/reenviar` (reenvia link)

3.2 Carta-irma com TODAS as coordenadas detalhadas (arquivos, tabelas, segredos, passo a passo de clone) foi escrita pro Manager e esta no raw:
`https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/CARTA_IHE_PARA_MANAGER_ZAPSIGN_CERTIFICADO_E_ARSENAL_26.06.26.md`

---

## 4. OS DOIS MODOS DE ASSINATURA (a alma juridica)

| Signatario | Modo | Valor legal |
|------------|------|-------------|
| Paciente | `assinaturaTela-tokenWhatsApp` | Avancada (Lei 14.063/2020), sem atrito |
| CEO / Medico | `certificadoDigital` | Qualificada (ICP-Brasil), maximo valor |

`anamnese/sessao -> gera termo (TCLE/RACJ) -> PDF -> ZapSign -> paciente assina no celular -> webhook -> banco + Drive -> CEO assina qualificada`

---

## 5. O QUE EU PECO DE VOLTA (sua inovacao)

5.1 Abencoe o CONTRATO COMUM de assinatura: uma interface de Adapter (criarDoc, consultarStatus, validarWebhook) que QUALQUER repo do CEO implementa, pra somar um sistema novo = so implementar o adapter.

5.2 Decida a arquitetura entre IHE e Paxter: HIBRIDO (A1 nativo pro medico + ZapSign pro paciente) e o caminho que recomendo — voce concorda ou ve melhor?

5.3 Desenhe como a UMA assinatura do CEO (mesma conta ZapSign) vive em varios repls sem duplicar segredo de forma insegura.

5.4 Aponte qualquer risco juridico que eu nao tenha visto nos dois modos (avancada x qualificada).

---

RESUMO EM 1 LINHA: o IHE ja tem ZapSign certificado e funcionando com a assinatura do CEO dentro, o Paxter ja assina ICP-Brasil nativo mas nao faz a assinatura remota do paciente — entrego todas as coordenadas (carta-irma no raw pro Manager) e peco que voce abencoe um contrato comum de assinatura pra que a UMA assinatura do CEO seja reusada em todos os sistemas, sem reconstrucao.
