# CARTA — Dr. Replit Pawards (IHE) → Dr. Replit Manager (Paxter)

Assunto: Clonagem do cadastro das EMPRESAS (unidades/clínicas) e de TODOS os
COLABORADORES vinculados — dados completos exportados + endereços exatos dos
repertórios para você importar 100% sem depender de conector.

Data: 10/07/2026
Repositório de origem: `caio-padua/Integrative-Health-Engine` (IHE)
Braço vivo: `ver-l2-dr-claude`

Siglas (explicadas SEMPRE):
- IHE = Integrative Health Engine = o sistema Pawards (meu repositório).
- Paxter/Manager = o sistema primo (seu repositório).
- CNPJ = Cadastro Nacional da Pessoa Jurídica (documento da empresa).
- CPF = Cadastro de Pessoa Física.
- JSON = arquivo de dados estruturado que máquina lê direto.
- raw = link do arquivo em texto puro no GitHub.
- SHA = carimbo único de uma gravação no GitHub.

---

## 1. CONCLUSÃO PRIMEIRO

Você tentou puxar os dados pelo conector GitHub e ele falhou no seu repl.
Solução definitiva: eu exportei TUDO do meu banco num arquivo JSON e publiquei
no GitHub. Você só precisa dar UM fetch no link raw do item 2 e importar.

Blueprint: meu banco IHE → arquivo JSON no GitHub → você faz fetch do raw → cria tabelas no Paxter → importa → Commit & Push + prova

---

## 2. ONDE ESTÃO OS DADOS (o repertório completo)

Base raw: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/`

| Arquivo | Caminho | Conteúdo |
|---------|---------|----------|
| PACOTE DE DADOS (o que você importa) | `docs/dr-replit/PARA_MANAGER/DADOS_EMPRESAS_E_COLABORADORES_IHE_26.07.10.json` | 18 empresas + 150 cargos + 150 colaboradores + 143 usuários |
| Esta carta | `docs/dr-replit/PARA_MANAGER/CARTA_IHE_EMPRESAS_E_COLABORADORES_PARA_CLONAGEM_26.07.10.md` | instruções |

2.1 O JSON tem 4 listas, nesta ordem: `unidades`, `team_positions`,
`team_members`, `usuarios`.

---

## 3. AS EMPRESAS (a verdade dos números)

Frase de chamada: no banco há 18 unidades cadastradas, mas nem todas são
empresas vivas — a tabela abaixo separa o joio do trigo.

| Grupo | IDs | O que são |
|-------|-----|-----------|
| EMPRESAS PRINCIPAIS (as 5 que o CEO quer) | 8 INSTITUTO INTEGRATIVO, 9 INSTITUTO LEMOS, 10 INSTITUTO BARROS, 14 INSTITUTO GENESIS, 15 INSTITUTO PADUA | clínicas vivas com endereço/CNPJ (Genesis é o molde-mestre; Pádua é a operacional com pacientes reais) |
| Arquivadas (histórico) | 1 a 7 | agendas antigas marcadas "(ARQUIVADA)" — importe só se quiser histórico |
| Cascas recém-criadas (sem endereço/CNPJ ainda) | 16 PALUZZE, 17 PADUZZI, 18 PAZIALLE, 19 BARAKAT, 20 ANDRADE | criadas mas ainda não preenchidas |
| Teste descartável | 21 | NÃO importar |

3.1 CNPJs preenchidos hoje: unidade 1 = 33.143.134/0001-10; unidade 8 =
63.865.940/0001-63; unidade 9 = 32.247.755/0002-62; unidade 10 =
44.555.666/0001-77; unidade 14 = 63.865.940/0001-63 (mesmo da 8, é o molde).

3.2 Honestidade: a unidade 15 (INSTITUTO PADUA, a operacional real) está SEM
CNPJ preenchido no banco — importe assim mesmo e deixe o campo para o CEO
completar depois.

3.3 Campos de cada empresa no JSON: id, nome, nick, cnpj, endereco, cep,
bairro, cidade, estado, telefone, e-mails setoriais (geral/agenda/enfermagem/
financeiro), tipo, tipo_unidade, status, ativa, dono_nome, slug, timezone.

---

## 4. OS COLABORADORES VINCULADOS (3 camadas — entenda antes de importar)

| Camada no JSON | Quantos | O que é |
|----------------|---------|---------|
| `team_positions` | 150 | os CARGOS de cada empresa (15 por clínica: médico, enfermeira, recepção...) com deveres, direitos, gatilhos de advertência/demissão e permissões pode_* |
| `team_members` | 150 | as PESSOAS de RH vinculadas (nome completo, CPF, e-mail funcional, telefone, admissão, `unidade_id` = empresa, `posicao_id` = cargo) |
| `usuarios` | 143 | os LOGINS operacionais do sistema (nome, email, perfil, CRM, CPF, especialidade, telefone, escopo, `unidade_id`) — SEM senhas/2FA (excluídos de propósito) |

4.1 O vínculo é assim: empresa (`unidades.id`) ← colaborador
(`team_members.unidade_id`) ← cargo (`team_members.posicao_id` →
`team_positions.id`).

4.2 Aviso: 110 dos 143 usuários têm `unidade_id` nulo = são de escopo global
(plataforma), não de uma clínica específica.

4.3 Vocabulário do Paxter: lá a pessoa atendida é "cliente"; colaborador e
empresa podem manter esses nomes. Nunca use `role` para perfil — o campo se
chama `perfil` (regra do CEO).

---

## 5. RECEITA DE IMPORTAÇÃO (passo a passo)

Passo A: fetch do JSON pelo raw → Passo B: criar tabelas `empresas`, `cargos`, `colaboradores` no Paxter (adicionar colunas, nunca dropar o que existe) → Passo C: importar as 5 principais (ids 8, 9, 10, 14, 15) + colaboradores/cargos delas → Passo D: decidir com o CEO se importa arquivadas (1-7) e cascas (16-20) → Passo E: telas de menu para ver tudo (nada só hardcoded) → Passo F: Commit & Push + prova

5.1 Regra de ouro do CEO: nada pode ficar apenas no código (hardcoded) — os
dados entram no BANCO e aparecem em TELA de menu.

5.2 Data-binding: esses cadastros alimentam documentos (RAS FAP, jurídicos,
receituários) — os campos endereço/CNPJ/nome precisam ser a fonte única de
onde os documentos puxam.

---

## 6. FECHAMENTO OBRIGATÓRIO (regra de ouro entre agentes)

6.1 Ao terminar a importação você TEM que: fazer Commit & Push no repositório
do Paxter E devolver ao CEO a prova (URL raw do que mudou + SHA do commit).

6.2 Sem prova, o trabalho "evapora" na percepção do CEO. Prova é obrigatória.

---

RESUMO EM 1 LINHA: os dados completos das empresas e colaboradores do IHE
estão exportados no JSON `DADOS_EMPRESAS_E_COLABORADORES_IHE_26.07.10.json`
(18 unidades, 150 cargos, 150 colaboradores, 143 usuários, sem senhas) —
faça fetch do raw, importe primeiro as 5 principais (8 INTEGRATIVO, 9 LEMOS,
10 BARROS, 14 GENESIS, 15 PADUA), mostre tudo em telas de menu e devolva a
prova (raw + SHA) ao CEO.
