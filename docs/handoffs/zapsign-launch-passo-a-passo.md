# Passo-a-passo — Disparar a primeira assinatura real ZapSign

> Doc gerado para o Caio executar manualmente o que **só ele** consegue
> fazer. Quando os 4 itens da Parte 1 e os 2 itens da Parte 2 estiverem
> prontos, me avisa e eu completo a parte de código (Parte 3).
>
> Tudo isso destrava a R$ 2.735.336,10 de comissão potencial parada
> esperando o motor de assinatura entrar no ar de verdade.

---

## Parte 1 — No painel do ZapSign (10 min, do computador)

1. **Criar conta sandbox**
   - Vai em https://app.zapsign.com.br/cadastro
   - Email: `ceo@pawards.com.br`
   - Marca o plano **Sandbox / Free** (sem cartão)
   - Confirma o email que chega na caixa do `ceo@pawards.com.br`

2. **Pegar o API token**
   - Painel → canto superior direito → **Conta** → aba **API**
   - Copia o token (string longa, começa geralmente com letras/números)
   - **NÃO cola em lugar nenhum público** — só vai me passar quando eu pedir
     pelo `requestSecret` (campo mascarado)

3. **Cadastrar o webhook**
   - Painel → **Configurações** → **Webhooks** → **Novo webhook**
   - Nome: `hook-padua-4000`
   - URL: `https://webhooks.pawards.com.br/api/webhooks/assinatura/zapsign`
   - Eventos a marcar: ✅ **doc_signed**, ✅ **doc_refused**, ✅ **doc_deleted**
   - Header customizado:
     - Nome: `x-pawards-secret`
     - Valor: (eu vou gerar e te mandar — esse é o `ZAPSIGN_WEBHOOK_SECRET`)
   - **NÃO salva ainda** — primeiro precisamos dos passos 5 e 6 abaixo
     pra URL responder. Salva só depois que o CNAME propagar.

4. **Anotar pra mim**
   - ✅ Conta criada (sim/não)
   - ✅ Token copiado (sim/não — não me mostra ainda)
   - ✅ Webhook esboçado (sim/não)

---

## Parte 2 — No DNS do `pawards.com.br` (5 min + propagação)

5. **Apontar o CNAME**
   - Acessa o painel do registrador do domínio `pawards.com.br`
     (Registro.br, Cloudflare, GoDaddy, etc — onde quer que tu tenha
     comprado)
   - Cria um registro **CNAME**:
     - Nome / Host: `webhooks`
     - Tipo: `CNAME`
     - Valor / Aponta para:
       `2ef80136-fd8b-403c-a5cc-938820e2c326-00-2woa55yolyb2j-oe3s2s4t.kirk.replit.dev`
     - TTL: padrão (300s ou Auto)
   - Salva

6. **Esperar propagação**
   - Geralmente 5-15 min. Pra testar, abre no celular:
     `https://webhooks.pawards.com.br/api/healthz`
   - Tem que retornar `{"ok":true}` ou similar (não erro de DNS)

> ⚠️ **Importante**: o domínio do Replit acima é o domínio de
> **desenvolvimento** atual deste workspace. Quando publicar pra produção
> definitiva (Deploy), o CNAME tem que ser **trocado** pra apontar pro
> domínio `*.replit.app` da deploy. Por enquanto sandbox usa o de dev.

---

## Parte 3 — Eu faço (depois que vc confirmar Parte 1+2)

Quando me avisar **"conta criada + CNAME no ar"**, eu:

1. Te peço o token via `requestSecret('ZAPSIGN_API_TOKEN')` (campo
   mascarado — não fica no histórico)
2. Gero um `ZAPSIGN_WEBHOOK_SECRET` aleatório forte e te mando pra
   colar no header do webhook (passo 3)
3. Salvo o webhook no painel ZapSign
4. Disparo a receita teste vinculada ao **paciente id=3104 (Caio,
   is_teste=true)** via `enviarOrcamentoFarmaceutico`
5. Te mando os 2 links no celular pra você assinar

---

## Parte 4 — Você assina pelo celular (2 min)

7. Recebe 2 SMS/email do ZapSign com os links de assinatura
8. Abre no celular, lê, assina
9. Webhook bate em `webhooks.pawards.com.br` → backend valida assinatura
   HMAC → grava 1 linha em `auditoria_assinaturas` com:
   - hash do PDF assinado
   - IP de quem assinou
   - geo (cidade/estado via IP)
   - método de auth (SMS/email/biometria)
   - PDF persistido no bucket `assinaturas-pawards`

---

## Parte 5 — Wrap-up F6

10. Eu confirmo no banco que `auditoria_assinaturas` tem a linha
11. Crio a tag `v031-zapsign-launch` (encerra Wave 10 F6)
12. Atualizo o briefing do Dr. Claude com "primeira assinatura real
    capturada"

---

## Resumo do que precisa de você AGORA

- [ ] Criar conta sandbox ZapSign com `ceo@pawards.com.br`
- [ ] Copiar o API token (não me manda ainda)
- [ ] Esboçar o webhook `hook-padua-4000` (não salvar ainda)
- [ ] Criar CNAME `webhooks.pawards.com.br` → domínio Replit dev
- [ ] Confirmar `https://webhooks.pawards.com.br/api/healthz` responde
- [ ] Me avisar "tá pronto" pra eu seguir a Parte 3
