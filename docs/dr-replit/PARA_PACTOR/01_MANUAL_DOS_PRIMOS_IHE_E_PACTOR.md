# 01 - Manual dos Primos (Dr. Replit IHE + Dr. Replit Pactor)

> Terceiro documento de cabeceira, ao lado do Perfil do CEO e da Doutrina.
> ASCII puro, sem acento, enumerado. Data: 13/06/2026.
> Cabeceira completa antes de codar:
> (1) docs/PRE_REQUISITO_PARA_TRABALHAR_COM_DR_CAIO.md (perfil do CEO)
> (2) docs/DOUTRINA_DO_PROJETO_PADUA_SISTEMAS.md (regras de ferro R1..R7)
> (3) este manual (traducao das regras no dia a dia dos primos)

```
MANUAL DOS PRIMOS - DR. REPLIT IHE + DR. REPLIT PACTOR
Vocabulario operacional comum. Data: 13/06/2026.

0. COMO USAR
0.1 Este e o 3o documento de cabeceira, depois do Perfil do CEO e da Doutrina.
0.2 Ele NAO substitui as Regras de Ferro R1..R7 - ele as traduz na pratica.
0.3 Em conflito, vale a Doutrina; este manual so detalha o dia a dia.

1. EMPURRA
1.1 Empurra = dar push pro GitHub.
1.2 Token vem da integracao (listConnections github) - NUNCA imprimir o token.
1.3 Sempre devolver o SHA do commit empurrado pro CEO conferir.
1.4 Nunca commit manual: a plataforma/CEO controla o commit; empurra so envia o que ja existe.

2. TSUNAMI
2.1 Tsunami = a varredura de follow-ups numerados que vem DEPOIS de uma onda grande.
2.2 Onda nao fecha so com o caminho feliz; o tsunami caca as pontas soltas ate zerar.
2.3 Cada follow-up tem numero e some so quando resolvido com prova.

3. ANTI-ECTOPLASMA
3.1 Ectoplasma = codigo ou decisao que existe SEM um .md por tras (proibido - R1).
3.2 Decisao vira .md ANTES do codigo, em docs/dr-replit/PROPOSTAS/<data>_<tema>.md.
3.3 Spec do orquestrador em docs/dr-claude/ numerada.
3.4 Sem .md = nao pode codar.

4. WALKING DEAD (zumbi)
4.1 Walking dead = feature que PARECE viva mas e oca.
4.2 Exemplos: schema sem dado, tela sem backend, dois sistemas fazendo a mesma coisa.
4.3 Regra: ou completa (vira real) ou mata; nunca deixar zumbi andando.
4.4 Por isso primo nao duplica o que o outro ja tem (vira concorrencia zumbi).

5. CODIGOS SEMANTICOS
5.1 Nomes completos e semanticos, NUNCA abreviar (auditoria_cascata, nao aud_cascata).
5.2 Campo de perfil de usuario = perfil; NUNCA role (confunde com rota do backend).
5.3 Prefixos: pode_ (permissao booleana), nunca_ (restricao permanente), requer_ (condicao obrigatoria).
5.4 Codigos do dominio sao semanticos: CPRE/CONL/CAVL/SESS/INFU/PROC/EXAM; dieta B1 B2 B3 B4 SEQ.
5.5 Renomeou tabela/campo? Deixar o nome antigo em comentario e manter as rotas funcionando.
5.6 Nunca dropar tabela com dado; mudanca e ADITIVA (so adicionar coluna), nunca substitutiva.

6. SELECT / UPSERT / SQL CONTRA O CODIGO
6.1 R2: DDL e esqueleto, UPSERT e sangue. So e real quando os dois rodaram e CONTAM no banco vivo.
6.2 Sempre dar um SELECT pra ver o NUMERO REAL antes de afirmar que algo existe.
6.3 Jogar o SQL contra o codigo: o schema do banco tem que BATER com o que o codigo espera.
6.4 Estatistica de catalogo (pg_stat) mente sem ANALYZE - rodar ANALYZE antes de confiar.
6.5 Preferir UPSERT idempotente; sync de catalogo as vezes e REBUILD, nao UPSERT - saber a diferenca.
6.6 Schema dessincronizado do banco real = db push e PERIGOSO ate sincronizar.

7. DOCA (PARA_PACTOR)
7.1 docs/dr-replit/PARA_PACTOR/ e caixa de saida de DOCUMENTOS, nao codigo ligado ao IHE.
7.2 Nao toca o sistema vivo; o IHE continua intacto.
7.3 Depois que o Pactor absorve, a doca vira FOTO CONGELADA (referencia versionada).

8. BARQUINHO -> LANCHA
8.1 Migrar do Apps Script pro TypeScript preservando 100% da FEATURE.
8.2 O encanamento muda: planilha -> banco; CalendarApp -> Google API+token; HTML -> React;
    gatilho de tempo -> worker; MailApp -> Gmail API.
8.3 Nao copiar funcao por funcao: reproduzir o que ela ENTREGA (cola de planilha morre).

9. PRIMOS (fronteira)
9.1 IHE = producao SaaS multiclinica. Pactor = laboratorio + produto de 1 clinica.
9.2 Sao SEPARADOS; o CEO nunca roda os dois juntos; cada um autossuficiente.
9.3 IHE nao toca o repo do Pactor; Pactor nao toca o IHE vivo.

10. FECHAMENTO DE ONDA (ritual)
10.1 Hash no GitHub + caso real testado (R3, anti-fantasia).
10.2 Commit + teste passando + numero do commit entregue ao CEO.
10.3 Dr. Claude audita por raw URL; CEO bate o martelo (R4).

11. FALAR COM O CEO (TDAH/TOC/Asperger)
11.1 Topicos numerados, 1 frase por linha, conclusao primeiro, RESUMO em 1 linha no fim.
11.2 Decisao sempre como tabela: numero | decisao | opcoes A/B/C | default. Max 6 martelos.
11.3 Zero emoji em texto tecnico; datas dd/mm/aaaa; decimal com virgula; tudo por extenso.
11.4 Sinceridade total, zelo acima de velocidade, verificar antes de afirmar.
```
