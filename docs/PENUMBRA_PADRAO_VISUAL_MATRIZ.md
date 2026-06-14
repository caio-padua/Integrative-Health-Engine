# PENUMBRA — Padrao Visual Matriz (replicavel a todos os projetos)

> Atualizado em 14/06/2026.
> Este e o documento git-trackeado (vai pro GitHub) que serve de MATRIZ do
> padrao visual de TODOS os projetos do Dr. Caio. A skill viva completa fica em
> `.agents/skills/penumbra-design-system/` (local, nao vai pro GitHub), entao
> este arquivo e a ponte para outros repositorios e para o Dr. Claude lerem o
> padrao via raw do GitHub.

## 1. O QUE E PENUMBRA

1.1. PENUMBRA e a "moeda" (o layout/sistema), com estrutura sempre identica.
1.2. Tem duas faces (cara e coroa):
   1.2.1. PENUMBRA CLARO = face clara "Paper Ciano" (papel azulado, accent teal). Uso: consultorio, dia.
   1.2.2. PENUMBRA ESCURO = face escura "Navy Ciano" (navy profundo, ciano clinico). Uso: procedimento, noite.
1.3. As faces alternam por um toggle segmentado [CLARO][ESCURO] na Faixa 1.
1.4. Nunca criar um terceiro padrao de claro nem de escuro.

## 2. ANATOMIA "CARA/COROA" (perfil cockpit — telas operacionais densas)

Titulo auto explicativo: o esqueleto obrigatorio de toda tela operacional.

```
FAIXA 1 (40px) · [LOCAL][GLOBAL] · niveis [1][2][3] · [CLARO][ESCURO] ·
                 busca ENTIDADES + busca EVENTOS · ... · OPERADOR · CARGO | SOM CONFIG SAIR
FAIXA 2 (40px) · breadcrumb PAWARDS > UNIDADE > TELA · badge do bloco ativo
FAIXA 3 (40px) · ATIVO · contexto/paciente · abas espelhadas · sessao/relogio
[ MENU 18/66/172 ] [ CORPO · blocos minimizaveis ] [ CONTEXTO 200 ] [ PULSO 200 ]
```

2.1. As 3 faixas tem 40px, cor fixa do perfil (a chrome nao muda de cor).
2.2. Seletor LOCAL/GLOBAL e os "numerozinhos" 1·2·3 = niveis de densidade da visualizacao.
2.3. Menu lateral a esquerda com 3 niveis que minimiza/expande: 18px (tarja vertical) / 66px (siglas) / 172px (completo). Troca pelos atalhos 1/2/3.
2.4. Dois paineis a direita colapsaveis: CONTEXTO (accent dourado) e PULSO (accent ciano); cada um 200px aberto, viram tarja de 18px quando fechados.
2.5. Corpo central com blocos verticais minimizaveis individualmente.
2.6. Tudo alinhado na linha vertical LINHA_ESQ = 16px. Tudo sticky.

## 3. REGRAS DE FERRO (nucleo, vale pra TODA tela inclusive landing/form)

3.1. Quina 90 graus absoluta — border-radius 0 em tudo.
3.2. JetBrains Mono em 100% do texto; tabular-nums em todo numero.
3.3. Portugues BR em toda label; zero emoji renderizado.
3.4. Retangulo dentro de retangulo (hierarquia por bordas 1px aninhadas).
3.5. K1 Pulso Unico: apenas UM elemento vivo (animado/respirando) por tela.
3.6. Hover = "luz por tras" (brilho vem de tras via ::before, nunca pinta o miolo, nunca arredonda).
3.7. Densidade alta sem ruido (preferir 6 KPIs pequenos a 3 grandes).
3.8. Proposta .md antes do codigo (anti-ectoplasma).

## 4. CONVENCOES SOMADAS PELO DR. REPLIT MANAGER (transmutacao a 3)

Titulo auto explicativo: o que o padrao do Manager acrescenta ao nucleo PENUMBRA.

4.1. Estrelas com percentual evidente ao lado, ex.: "Energia ★★★★☆ (82%)" — nunca bolinhas.
4.2. MAIUSCULO em labels de KPI e em eventos/descricoes (escaneabilidade TDAH).
4.3. Caracteres ASCII seguros APENAS na exportacao de PDF final (evitar glifos que quebrem a fonte ou a assinatura digital); na UI os simbolos como estrelas e bullets podem aparecer normalmente.
4.4. Cores fortes e contrastantes (foco TDAH).

## 5. FONTES DE VERDADE NO CODIGO (Pawards / repo IHE)

5.1. Shell do layout: `artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_pawardsPenumbra.tsx`
5.2. Perfis pareados (faces): `.../cockpits-paciente/_perfisPenumbra.ts`
5.3. Face clara aprovada: `.../cockpits-paciente/PenumbraClara2_PaperCiano.tsx`
5.4. Face escura pareada: `.../cockpits-paciente/PenumbraEscura2_NavyCyan.tsx`
5.5. Galeria pra visualizar no app: rota `/galeria-mockups` em `artifacts/clinica-motor/src/pages/galeria-mockups.tsx`
5.6. Status honesto: e codigo VIVO de prototipo (renderiza no mockup-sandbox), ainda NAO e o shell de producao do clinica-motor.

## 6. RESUMO EM 1 LINHA

PENUMBRA e o padrao visual unico (moeda de duas faces, Paper Ciano clara e Navy
Ciano escura) com anatomia cara/coroa de 3 faixas + menu lateral expansivel +
2 paineis a direita + numerozinhos 1·2·3 de densidade; esta matriz replica o
padrao pra qualquer projeto e a implementacao real vive nos arquivos da secao 5.
