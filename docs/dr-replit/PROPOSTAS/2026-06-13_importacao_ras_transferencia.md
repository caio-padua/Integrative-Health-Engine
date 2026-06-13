# PROPOSTA — Importacao dos pacientes reais da planilha RAS TRANSFERENCIA FINAL

- Data: 13/06/2026
- Autor: Dr. Replit IHE
- Status: AGUARDANDO MARTELO DO CEO (dry-run pronto, gravacao nao executada)
- Fonte: Google Sheets "RAS TRANSFERENCIA FINAL"
  (ID 1SoCXulI-Ohb71JdW1Pcsro09-Wam8BCKOJQw9QUlrgs), aba "TABELA GERAL"
- Destino: banco IHE (PostgreSQL), unidade 15 (Instituto Padua)

## 1. Foto do dry-run (simulacao a seco, nada gravado)

- Total de pacientes na planilha (linhas com nome): 216
  - com email: 183
  - com data de nascimento (dia+mes+ano): 203
  - com CPF real (11 digitos, != placeholder 123.456.789-00): 200
  - com celular: 160
  - com protocolo nomeado: 14
- Total de itens clinicos marcados SIM: 368
- Cruzamento por NOME normalizado com o banco:
  - ja existem na unidade 15: 193
  - existem em outra unidade: 0
  - totalmente novos (nome inedito): 23

Conclusao: a operacao e majoritariamente ATUALIZACAO (193) + criacao (23),
NAO criacao em massa.

## 2. Estrutura real da aba TABELA GERAL

- 3 linhas de cabecalho (L0 = nome do bloco, L1 = subcampo, L2+ = dados).
- Colunas fixas:
  - [0] numero sequencial
  - [1] NOME DO PACIENTE
  - [2] CPF
  - [3] CELULAR
  - [4] EMAIL
  - [5][6][7] DATA NASCIMENTO = DIA / MES / ANO
  - [8] NOME DO PROTOCOLO
  - [9] VALOR TRATAMENTO
  - [10] VALOR PAGO
  - [11] VALOR PENDENTE
  - [12] OBS
  - [13] AGENDAR ?
- A partir de [14]: 28 blocos de 6 colunas cada
  (SIM/NAO, SESS, FREQ, DIA, MES, ANO).
- 28 blocos: CONSULTA MEDICA, RETORNO MEDICO, e 25 substancias/itens
  (COENZIMA Q10, PQQ, RESVERATROL, EXYNUTRIMENT, VIT D3/B12/ADEK,
  TRIO METILADOR, TIRZEPATIDA 2,5/5/10, RETATRUTIDE, HCG 500/5000,
  TESAMORELIN, PROGESTERONA, TESTOSTERONA BIO 25/200/1000, ET-7 ENANTATO,
  CT-15 CIPIONATO, DA-7 DURATESTON, MT-7 METENOLONA, BD-7 BOLDENONA,
  DN-7 DROSTANOLONA), + 1 bloco de controle "AGENDA HASH".

Leitura de cada bloco: SIM = paciente faz o item; SESS = numero de sessoes;
FREQ = intervalo de repeticao em dias; DIA/MES/ANO = data da 1a sessao
(ANO com 2 digitos, ex.: "26" => 2026).

## 3. Mapeamento coluna -> campo

### 3.1 pacientes (cadastro)

| Planilha            | Coluna pacientes      | Observacao                                  |
|---------------------|-----------------------|---------------------------------------------|
| NOME DO PACIENTE    | nome                  |                                             |
| CPF                 | cpf                   | so se for CPF real (descarta placeholder)   |
| CELULAR             | telefone / whatsapp   | telefone NOT NULL => "" quando vazio        |
| EMAIL               | email                 |                                             |
| DIA/MES/ANO nasc.   | data_nascimento       | monta date; ano 2 dig nasc => 19xx          |
| (origem)            | origem_cadastro       | "RAS_TRANSFERENCIA"                          |
| numero sequencial   | codigo_externo        | "RAS-<numero>" (rastreio da origem)         |

Regra de nao-destruicao: em UPDATE so PREENCHE campo vazio no banco; nunca
sobrescreve dado ja existente (email/cpf/nascimento ja gravados ficam).

### 3.2 tratamentos (1 por paciente, quando ha protocolo ou itens)

| Planilha          | Coluna tratamentos | Observacao                          |
|-------------------|--------------------|-------------------------------------|
| NOME DO PROTOCOLO | nome               | default "RAS TRANSFERENCIA" se vazio|
| VALOR TRATAMENTO  | valor_bruto        | parse R$ -> numero                  |
| VALOR PAGO        | valor_pago         |                                     |
| VALOR PENDENTE    | saldo_devedor      |                                     |
| OBS               | observacoes        |                                     |

### 3.3 tratamento_itens (1 por bloco marcado SIM)

| Planilha           | Coluna tratamento_itens | Observacao                         |
|--------------------|-------------------------|------------------------------------|
| nome do bloco (L0) | descricao               | sempre preserva o texto da planilha|
| (classificacao)    | tipo                    | CONSULTA / RETORNO / SUBSTANCIA    |
| SESS               | numero_sessoes          |                                    |
| (catalogo)         | substancia_id           | casa por nome; NULL se nao achar   |
| FREQ + DIA/MES/ANO | observacoes             | "freq Nd, 1a sessao dd/mm/aaaa"    |

## 4. Chave de idempotencia (Premissa assumida)

- Match em cascata: (1) CPF real igual; senao (2) nome normalizado +
  data de nascimento iguais na unidade 15.
- Match => UPDATE (preenche lacunas). Sem match => INSERT novo.
- Reexecucao nao duplica (idempotente).

## 5. Plano de fases

- Fase 1 — Cadastro: upsert dos 216 em pacientes (atualiza 193, cria 23).
- Fase 2 — Clinico + financeiro: tratamentos + tratamento_itens
  (368 itens), casando substancias com o catalogo.
- Cada fase: dry-run -> martelo do CEO -> execucao -> contagem real no banco.

## 6. Premissas assumidas (reversiveis, decididas por mim)

- Destino = unidade 15 (unica clinica real; 193 ja la, 0 em outra unidade).
- Bloco "AGENDA HASH" ignorado (controle, nao e item clinico).
- Substancia nao encontrada no catalogo => tratamento_itens com
  substancia_id NULL e descricao preservada (nao perde dado).

## 7. Riscos

- Match por nome+nascimento pode falhar em homonimos sem CPF (poucos);
  mitigado por CPF quando existe (200 de 216).
- Datas com ano de 2 digitos exigem normalizacao (clinicas => 20xx).
