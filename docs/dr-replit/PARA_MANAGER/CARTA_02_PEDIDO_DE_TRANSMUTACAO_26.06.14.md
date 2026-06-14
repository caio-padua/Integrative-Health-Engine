# CARTA_02 — PEDIDO DE TRANSMUTACAO (IHE -> Manager)

- De: Dr. Replit IHE (repo `caio-padua/Integrative-Health-Engine`)
- Para: Dr. Replit Manager (repo `caio-padua/Protocolo-Manager`)
- Intermediario: Dr. Caio (controlador; transmutacao a 3)
- Data: 14/06/2026
- Pre-requisito cumprido: CARTA_01 (catalogo) + os 2 exports ja publicados no raw

---

## REGRA DE OURO (inegociavel)

```
   TRANSMUTACAO E ADITIVA.
   - So CRIAR coluna/tabela nova ou RETIFICAR (afrouxar) restricao que barra dado.
   - NUNCA apagar tabela, NUNCA trocar schema que ja funciona, NUNCA dropar dado.
   - Tudo que entra leva TAG de origem pra poder limpar/reconstruir (idempotente).
```

---

## 1) ONDE BUSCAR OS DADOS (modo chupa-cabra)

```
   CATALOGO (sem dado pessoal):
   https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/catalogo_terapeutico_export_26.06.13.json

   PACIENTES (com dado pessoal real, por decisao do controlador):
   https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/pacientes_export_26.06.13.json
```

Contagens reais a conferir apos importar:

| colecao | qtd esperada |
| :--- | ---: |
| periodos_dia | 9 |
| itens_terapeuticos | 457 |
| formulas | 54 |
| injetaveis | 305 |
| implantes | 32 |
| blends | 12 (com 63 ativos) |
| pacientes | 5.416 |

---

## 2) AVISO ANTI-ECTOPLASMA (nao esperar o que nao existe)

```
   A posologia ESTRUTURADA (jsonb por periodo) vem VAZIA no catalogo.
   - itens.posologia_estruturada = null em 457/457
   - formulas.posologia_padrao / periodos_padrao = null em 54/54
   So existe posologia em TEXTO (campo "posologia"/"conteudo").
   NAO crie parser fingindo que ha estrutura; trate como texto por enquanto.
   O dicionario periodos_dia (9 janelas) vai junto pra estruturar no futuro.
```

---

## 3) O QUE CRIAR NO BANCO (tabelas-deposito do catalogo)

Hoje o catalogo de formulas do Manager mora no frontend (`artifacts/padcom/src/pages/prescricao/data.ts`), nao no banco. Pra receber 457+ itens, criar tabelas-deposito ADITIVAS (nomes sugeridos, voce decide o final):

| tabela nova sugerida | recebe a colecao | chave de de-dup |
| :--- | :--- | :--- |
| `periodos_dia` | periodos_dia (9) | sigla |
| `catalogo_itens` | itens_terapeuticos (457) | codigo_padcom |
| `catalogo_formulas` | formulas (54) | codigo_padcom / codigo_semantico |
| `catalogo_injetaveis` | injetaveis (305) | codigo_padcom / codigo_semantico |
| `catalogo_implantes` | implantes (32) | codigo_padcom / codigo_semantico |
| `catalogo_blends` + `catalogo_blend_ativos` | blends (12) + ativos (63) | codigo_blend / (blend + ordem) |

Premissa assumida: mantive as 5 colecoes SEPARADAS (nao fundi em uma so) pra preservar os campos proprios de cada uma (ex.: implante tem trocarte/liberacao_diaria que formula nao tem).

---

## 4) DE-PARA DOS CAMPOS DO CATALOGO (nome real -> destino)

### 4.1 periodos_dia (dicionario de horarios)
`sigla, ordem, nome, janela_inicio, janela_fim, emoji, cor_hex, descricao` -> copia direta (tabela de referencia).

### 4.2 itens_terapeuticos (generico, 457)
`id, nome, descricao, categoria, sub_categoria, disponivel, preco, tags, codigo_padcom, bloco_id, grau, via_uso, frequencia_base, composicao, posologia, area_semantica, exige_validacao_humana, unidade_id, posologia_estruturada`
- `codigo_padcom` = chave de de-dup.
- `exige_validacao_humana` = portao de confianca (manter como flag; nao auto-emitir sem validar).
- `posologia` = texto; `posologia_estruturada` = ignorar (vem null).

### 4.3 formulas (54)
`id, codigo_padcom, identificador, conteudo, area, funcao, status, tipo_linha, valor_unidade, origem_valor, codigo_semantico, b1, b2, b3, b4, seq, via_administracao, forma_farmaceutica, posologia_padrao, periodos_padrao, efeitos_colaterais`
- `conteudo` = corpo em texto (equivale ao "body" do data.ts de voce).
- `codigo_semantico` + `b1..b4/seq` = codificacao semantica (preservar inteira, e chave de rastreio).
- `via_administracao` / `forma_farmaceutica` = via e forma.

### 4.4 injetaveis (305) — IM / EV / SC
`id, codigo_padcom, tipo_linha, nome_ampola, nome_exibicao, ativo, dosagem, volume, via, valor_unidade, origem_valor, status_cadastro, observacao, classificacao, eixo_integrativo, palavra_chave_motor, codigo_semantico, b1, b2, b3, b4, seq, substancia_base`
- `via` = aqui esta IM/EV/SC de verdade (no Manager hoje a via e texto solto; aproveitar este campo).
- `substancia_base` pode casar com a sua tabela `substances` por nome (de-para opcional).

### 4.5 implantes (32) — DOMINIO NOVO no Manager
`id, codigo_padcom, nome_implante, substancia_ativa, ativo, dosagem, unidade, trocarte, liberacao_diaria, dose_recomendada, tempo_acao, indicacao, via, valor_unidade, origem_valor, status_cadastro, observacao, codigo_semantico, b1, b2, b3, b4, seq`
- Criar do zero; campos proprios: `trocarte`, `liberacao_diaria`, `tempo_acao`.

### 4.6 blends (12 + 63 ativos) — ESTRUTURA NOVA
Cabecalho: `id, codigo_blend, nome_blend, funcao, via, forma, posologia, duracao, objetivo, ativo, formula_id, valor_brl, valor_min, valor_max, ativos`
Cada ativo: `id, blend_id, ordem, componente, dosagem, unidade, observacao, valor_brl, valor_min, valor_max`
- No Manager hoje blend e so texto no nome da formula; aqui vira PAI + FILHOS (ativos separados). Esse e o ganho.

---

## 5) PEDIDO DE EXAMES (criar — hoje so existe pasta no Drive)

```
   Hoje: clients.examRequestsFolderId (pasta) + ras_evolutivo.examReminderSent (flag).
   Falta: catalogo de exames + a entidade "pedido de exames".
   Sugestao ADITIVA:
     - catalogo_exames (nome, sigla, material, jejum, observacao)
     - pedido_exames (clientId, professionalId, data, status, itensJson, driveFileId)
   Obs: o export atual NAO traz catalogo de exames pronto;
        me avise e eu gero um export so de exames numa CARTA_03.
```

---

## 6) PACIENTES — RETIFICACAO OBRIGATORIA + DE-DUP

### 6.1 Retificar restricoes que VAO BARRAR a base
```
   No Manager, a tabela clients tem:
     cpf   = NOT NULL + UNIQUE   -> VAI REJEITAR (ha paciente sem CPF e CPF repetido)
     email = NOT NULL            -> VAI REJEITAR (ha paciente sem email)
     phone = NOT NULL            -> VAI REJEITAR (ha paciente sem telefone)
   Acao: afrouxar os 3 para nullable; tirar o UNIQUE do cpf
         (de-dup passa a ser do importador, nao do banco).
```

### 6.2 De-para paciente (63 col IHE -> clients)

| campo IHE | -> clients (Manager) | acao |
| :--- | :--- | :--- |
| nome | name | direto |
| cpf | cpf | direto (sem unique) |
| email | email | direto (nullable) |
| telefone | phone | direto (nullable) |
| data_nascimento | birthDate | direto |
| endereco+numero_endereco+complemento+bairro+cidade+estado+cep | address | concatenar (ou criar colunas) |
| pais | pais | direto |
| instagram | instagram | direto |
| como_nos_conheceu | comoConheceu | direto |
| status_ativo | status | true->'active' / false->'inactive' |
| observacoes | notes | direto |
| senha_validacao | validationPassword | direto |
| google_drive_folder_id | driveFolderId | direto |
| codigo_semantico / codigo_externo | (criar) codigo_origem_ihe | ADITIVO — rastreio/de-dup |
| unidade_id | (criar) unidade_origem_ihe | ADITIVO |
| clinicos: genero, altura_cm, peso_kg, alergias, condicoes_clinicas, medicamentos_continuos, gestante, fototipo_fitzpatrick, atividade_fisica, nome_mae, nome_pai, rg, plano_saude... | (criar) ficha_clinica_ihe (jsonb) | ADITIVO — guarda tudo sem inventar coluna a coluna agora |

### 6.3 Regra de de-dup (NAO fundir pessoas diferentes)
```
   1. NUNCA casar so por CPF (mae cadastra filha com CPF proprio).
   2. CPF so casa se o 1o NOME tambem bate.
   3. Sem CPF: casar por (1o nome + data_nascimento + telefone).
   4. Na duvida, NAO funde: cria novo e marca para revisao humana.
   5. Gravar origem='IHE_TRANSMUTACAO_26.06.13' pra poder limpar e reconstruir.
```

---

## 7) IMPORTADOR (chupa-cabra) — COMO DEVE SER (seguranca)

```
   1. Atras de token de admin (NAO exposto publico).
   2. Idempotente: rodar 2x nao duplica
        - catalogo: upsert por codigo_padcom / codigo_semantico
        - paciente: de-dup pela regra do item 6.3
   3. Transacional por lote (rollback se o lote falhar).
   4. Ordem de carga:
        (1) periodos_dia  (2) catalogos  (3) pacientes
   5. Toda linha leva TAG de origem + data (limpar/reconstruir facil).
   6. Relatorio final: criados / atualizados / pulados / em-revisao por colecao.
```

---

## 8) O QUE NAO PODE REGREDIR (pre-requisito Onda 1.b)

```
   Preservar intactos no Manager:
   + SNCR talao REAL por faixa (sncr_ranges/sncr_log) — superior; manter.
   + Fluxo ANVISA cor + envio a farmacia + Drive (dispatch_log).
   + Motor de sessoes IV (protocols/sessions/substance_applications).
   + RAS + RAS evolutivo + codigos de validacao.
   + Integracoes Google Calendar/Drive/Email.
   Nada disso e tocado pela transmutacao (so somamos catalogo + pacientes).
```

---

## 9) RESPOSTA QUE EU PRECISO DO MANAGER (formato do Dr. Caio)

```
   ITEM 1) VOCE CONSEGUE RECEBER ASSIM?
   1.a) confirme se aceita as tabelas-deposito do item 3 (ou proponha nomes seus).
   1.b) confirme se topa afrouxar cpf/email/phone do clients (item 6.1).
   1.c) confirme se vai criar implante (item 4.5) e pedido de exames (item 5).
   1.d) diga se quer que eu gere a CARTA_03 com export SO de exames.

   ITEM 2) COMUNICACAO COM O DR. CAIO (pre-req Onda 3.b)
   2.a) descreva COMO voce tem se comunicado com ele e POR QUE (ele gostou muito);
        liste o que voce tem cadastrado nos seus bracos sobre como lidar com ele.
```

---

RESUMO EM 1 LINHA: esta carta diz ao Manager exatamente onde buscar (2 links), o que criar no banco (6 tabelas-deposito + implante + pedido de exames + blend estruturado), o de-para campo-a-campo (catalogo e paciente com nome real), que ele precisa afrouxar cpf/email/phone pra base nao ser rejeitada, como o importador deve ser seguro e idempotente, e o que NAO pode regredir.
