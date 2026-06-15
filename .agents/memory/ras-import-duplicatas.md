---
name: Importação de planilhas clínicas — duplicatas e CPF compartilhado
description: Riscos ao fazer upsert de pacientes a partir de planilhas (RAS/Pádua) e como casar sem fundir pessoas distintas.
---

# Importar pacientes de planilha sem fundir pessoas

Regra: ao importar pacientes de planilha pro banco, **consolidar linhas da mesma
pessoa ANTES de gravar e UNIR os itens** (dedup por descrição), e **nunca casar
só por CPF**.

**Why (incidentes reais na planilha "RAS TRANSFERENCIA FINAL", 13/06/2026):**
1. Duplicatas na própria planilha — 14 nomes apareciam 2x/3x (uma "cauda" de
   recadastro no fim). Processar linha-a-linha com DELETE+reinsere fazia a última
   linha sobrescrever os itens da primeira (perda silenciosa).
2. CPF compartilhado mãe/filha — mãe cadastrou a filha menor de idade com o
   próprio CPF. Match cego por CPF fundiria duas pessoas distintas num só
   registro (mistura de dado clínico — gravíssimo).

**How to apply:**
- Chave de agrupamento que separa mãe/filha: `CPF + primeiro nome` quando há CPF;
  senão `nome + nascimento`; senão `nome`.
- Match contra o banco: só casa por CPF se o **primeiro nome também bate**; senão
  cai pra nome+nascimento; senão nome puro; senão é paciente novo.
- Para dado clínico, falso-positivo (fundir 2 pessoas) é muito pior que
  falso-negativo (criar duplicata). Na dúvida, NÃO funda.
- Marque os dados da importação com tag exclusiva nas observações
  (ex.: `[origem:RAS_TRANSFERENCIA]`) — permite limpar/reconstruir só a própria
  origem com idempotência, sem tocar dado pré-existente.
- Sempre confira a contagem REAL no banco vs o que o script reportou: a
  divergência denuncia colisões de match (linhas colapsando no mesmo registro).
- De-dup tem que comparar contra o BANCO **e** contra os registros já decididos
  no PRÓPRIO arquivo (índices vivos: origem vista, cpf+nome staged, cpf→nomes).
  Comparar só contra o snapshot inicial do banco deixa passar duplicata intra-arquivo
  no 1º run (dois registros do mesmo dump com mesmo CPF escapam da regra de revisão).

## CPF compartilhado: regra do CEO = deixar UM em branco

Quando 2+ pessoas distintas carregam o MESMO CPF na planilha, NUNCA gravar o
mesmo CPF nas duas. Mantém o CPF só no **titular** e deixa os demais em branco
(`cpf=null`). **Premissa:** titular = nascimento mais antigo (o adulto); a filha
menor fica sem CPF. O CEO confirmou explicitamente "deixar um em branco".

**How to apply:** rodar a desambiguação DEPOIS de consolidar, agrupando por CPF.
O `UPDATE` de cadastro usa `COALESCE`, então CPF real já existente no banco é
preservado — a regra do branco só afeta INSERTs novos. Atenção ao caso em que o
banco já tem 2 CPFs próprios e distintos: nada a apagar, pois a duplicação
existia só na planilha.
