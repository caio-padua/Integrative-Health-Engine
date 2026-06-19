# 02 — PORTAL DE ENTRADA (LOGIN) + LOGOS — REFERENCIA PARA PAXTER

> De: **Dr. Replit Pawards**. Para: **Paxter**. A pedido de: **Caio (CEO)**.
> Data: **19/06/2026** (dd/mm/aaaa). Branch viva: `ver-l2-dr-claude`.
> URL raw base: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/`

Paxter, este documento te da TODAS as referencias do nosso portal de entrada (a
tela de login), dos botoezinhos de validacao (selos de seguranca), do logotipo
Pawards e da assinatura Padcon. Tudo ja esta no GitHub e foi conferido (todas as
URLs raw abaixo retornam codigo 200 = "arquivo encontrado").

LLM = Large Language Model = modelo de linguagem (e o que voce e).
Raw = arquivo cru, sem a interface do GitHub.

---

## 1. CONCLUSAO PRIMEIRO

Frase de chamada: copie o arquivo real `login.tsx` + os 3 logos PNG; nao recrie
de cabeca (anti-ectoplasma = nunca aproximar o que ja existe como codigo real).

| O que voce quer            | Onde esta (caminho real no repo)                              |
|----------------------------|--------------------------------------------------------------|
| Tela de login inteira      | `artifacts/clinica-motor/src/pages/login.tsx`                |
| Botoezinhos de validacao   | dentro do MESMO `login.tsx` (secao "REGUA DE SELOS")         |
| Logo Pawards (oficial)     | `artifacts/clinica-motor/public/logo-pawards-medcore-transparent.png` |
| Logo Pawards (fundo cheio) | `artifacts/clinica-motor/public/logo-pawards-medcore.png`    |
| Assinatura Padcon          | NAO e imagem — e texto "PADCON Platform®" no rodape do login |
| Logo institucional "DP"    | `artifacts/clinica-motor/public/logo-dp.png` (Dr. Padua)     |

---

## 2. ARQUIVO PRINCIPAL — A TELA DE LOGIN (clone este)

| Campo            | Valor                                                                   |
|------------------|-------------------------------------------------------------------------|
| Caminho          | `artifacts/clinica-motor/src/pages/login.tsx`                          |
| URL raw          | base + `artifacts/clinica-motor/src/pages/login.tsx`                    |
| Tamanho          | 529 linhas                                                              |
| Tecnologia       | React + react-hook-form + zod + lucide-react (icones) + wouter (rotas) |
| Estilo           | Inline (sem Tailwind nas cores) + 1 bloco `<style>` com keyframes      |

2.1 Estrutura visual (blueprint):

`fundo preto puro` -> `painel central 980px (2 colunas)` -> `[esquerda: LOGO Pawards] | [direita: FORMULARIO]` -> `rodape: citacao do fundador + assinaturas PAWARDS/PADCON` -> `regua full-width: 6 SELOS DE SEGURANCA`

2.2 Estados da tela (mesma pagina troca de conteudo):

| Estado            | Quando aparece                          | O que mostra                          |
|-------------------|-----------------------------------------|---------------------------------------|
| Login normal      | padrao                                  | campos Identificacao + Chave de Acesso |
| Verificacao 2FA   | senha certa + 2FA ligado                | campo de 6 digitos do app autenticador |
| Aviso recuperacao | login via codigo de recuperacao         | banner laranja "restam N codigos"      |
| Modo teste (DEV)  | so em desenvolvimento (`import.meta.env.DEV`) | botao ciano "Entrar em modo teste"  |

2FA = Two-Factor Authentication = autenticacao em duas etapas.
TOTP = Time-based One-Time Password = senha temporaria gerada por app (ex.: Google Authenticator).

---

## 3. PALETA INSTITUCIONAL (constantes no topo do login.tsx)

Frase de chamada: e a face "Navy/Preto + Dourado + Ciano neon" — luxo classico,
JetBrains Mono em maiusculas, canto reto (0px de arredondamento) em tudo.

| Constante   | Valor (hexadecimal) | Uso                                  |
|-------------|---------------------|--------------------------------------|
| NAVY        | `#000000`           | fundo do painel                      |
| NAVY_DEEP   | `#000000`           | fundo dos campos                     |
| GOLD        | `#D4AF37`           | dourado da marca (labels, botao)     |
| GOLD_BRIGHT | `#F0CE5A`           | dourado claro (borda do botao)       |
| CYAN        | `#5EE6E6`           | ciano neon (status, selos, pulso)    |
| INK         | `#E5E7EB`           | texto principal claro                |
| INK_MUTED   | `#9CA3AF`           | texto secundario apagado             |
| HAIRLINE    | `#1F2937`           | borda fina dos inputs                |

3.1 Hexadecimal = forma de escrever cor em base 16 (ex.: `#D4AF37` = dourado).

---

## 4. OS "BOTOEZINHOS DE VALIDACAO" (2 grupos)

Atencao (sinceridade total): hoje esses selos sao **visuais/informativos** — eles
COMUNICAM que o sistema usa cada protecao (com `title` que explica ao passar o
mouse), mas nao sao botoes clicaveis que rodam um teste ao vivo. A protecao real
existe no backend; o selo e o "selo de qualidade" na vitrine.

### 4.1 REGUA DE 6 SELOS DE SEGURANCA (rodape full-width)

Grade de 6 colunas; cada selo = caixa com icone ciano + borda dourada pulsando.

| Selo   | Icone (lucide-react) | Significado da sigla / titulo (tooltip)                          |
|--------|----------------------|------------------------------------------------------------------|
| LGPD   | Scale                | Lei Geral de Protecao de Dados — auditoria + retencao 12 meses   |
| ICP-BR | FileSignature        | ICP-Brasil = Infraestrutura de Chaves Publicas Brasileira (assinatura digital via ZapSign) |
| 2FA    | Fingerprint          | Two-Factor Authentication = autenticacao em duas etapas (TOTP)   |
| JWT    | KeySquare            | JSON Web Token = cracha de sessao assinado + refresh seguro      |
| AUDIT  | Lock                 | Auditoria cascata em todas as operacoes sensiveis                |
| mTLS   | Network              | Mutual TLS = TLS mutuo (os 2 lados se autenticam) no perimetro   |

### 4.2 DOIS INDICADORES "ATIVO" (canto inferior direito)

Bolinhas ciano que pulsam devagar (2,4s) — resumo executivo de "esta tudo ligado".

| Indicador        | Aparencia                          |
|------------------|------------------------------------|
| Acesso Restrito  | label dourada + bolinha ciano pulsa |
| Entrada Segura   | label dourada + bolinha ciano pulsa |

### 4.3 Animacoes (bloco `<style>` dentro do login.tsx)

| Keyframe (animacao) | Onde se aplica          | Efeito                                  |
|---------------------|-------------------------|-----------------------------------------|
| `pulseStatus` (2,4s)| bolinhas "ATIVO"        | brilho ciano que aparece e some devagar |
| `pulseSeal` (3,2s)  | caixas dos 6 selos      | borda dourada que respira + glow ciano  |

---

## 5. OS LOGOS (imagens binarias — baixe pela URL raw)

A URL raw funciona para imagem tambem (repo publico). Baixe e coloque na sua
pasta `public/`.

| Arquivo                                  | URL raw (base +)                                           | Uso recomendado                  |
|------------------------------------------|-----------------------------------------------------------|----------------------------------|
| `logo-pawards-medcore-transparent.png`   | `artifacts/clinica-motor/public/logo-pawards-medcore-transparent.png` | OFICIAL — fundo transparente, usado na tela de login |
| `logo-pawards-medcore.png`               | `artifacts/clinica-motor/public/logo-pawards-medcore.png` | versao com fundo cheio           |
| `logo-dp.png`                            | `artifacts/clinica-motor/public/logo-dp.png`              | simbolo "DP" (Dr. Padua) institucional |
| `favicon.svg`                            | `artifacts/clinica-motor/public/favicon.svg`             | icone da aba do navegador        |

5.1 Como o login usa o logo (codigo real):

```tsx
<img
  src={`${import.meta.env.BASE_URL}logo-pawards-medcore-transparent.png`}
  alt="PAWARDS MedCore"
  className="h-full w-auto object-contain object-left"
  style={{ filter: "drop-shadow(0 0 32px rgba(212,175,55,0.4)) drop-shadow(0 0 12px rgba(212,175,55,0.22))" }}
/>
```

5.2 `import.meta.env.BASE_URL` = o prefixo de caminho do app (cada artefato tem o
seu). Use o equivalente do seu projeto; nao use caminho que comece em `/` cru.

---

## 6. A ASSINATURA PADCON — IMPORTANTE (sinceridade total)

Frase de chamada: "Padcon" hoje NAO tem arquivo de logo — e um wordmark (marca
escrita) em texto, no rodape do login.

| Item                  | Verdade verificada no codigo                                 |
|-----------------------|--------------------------------------------------------------|
| Forma                 | Texto: `PADCON Platform®` em dourado, JetBrains Mono         |
| Subtitulo             | `Advanced Systems Architecture` (italico, apagado)           |
| Marca irma no mesmo bloco | `PAWARDS MedCore®` + `Clinical Intelligence System`      |
| Existe PNG do Padcon? | NAO — se voce quiser um logo de imagem, precisa ser criado   |
| PADCOM x PADCON       | sao nomes diferentes; a relacao oficial esta no dicionario `docs/CONCEITOS_E_NOMENCLATURAS_PADCOM/` (a validar). NAO trate como sinonimos sem checar. |

6.1 Se o CEO quiser um logo PNG do Padcon, peca a ele — e decisao de marca
(irreversivel/identidade), nao deve ser inventada por agente.

---

## 7. O QUE VOCE (PAXTER) DEVE FAZER

| Passo |
|-------|
| 1. Baixe `login.tsx` pela URL raw (codigo real, nao recrie) |
| 2. Baixe os 3 PNG de logo pela URL raw e coloque no seu `public/` |
| 3. Reaproveite a paleta da secao 3 e os selos da secao 4 |
| 4. Para a marca Padcon: use o wordmark de texto (secao 6) ou peca um PNG ao CEO |
| 5. Ao terminar: Commit & Push no SEU repo + devolva prova (URL raw + SHA + branch) |

---

## RESUMO EM 1 LINHA

Clone o arquivo real `login.tsx` (portal + 6 selos de seguranca + 2 indicadores),
baixe os 3 logos PNG pelas URLs raw (o Pawards transparente e o oficial da tela),
e saiba que "Padcon" hoje e so wordmark de texto — sem PNG — entao ou usa o texto
ou pede um logo ao CEO; ao terminar, Commit & Push com prova.
