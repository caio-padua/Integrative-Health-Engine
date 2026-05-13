# Trocar URL dos webhooks ZapSign pro domínio bonito

Runbook para a Task #129. Procedimento manual (painéis externos), feito
pelo Caio quando o deploy de produção estiver no ar.

## Por que existe

Os 3 webhooks no painel ZapSign foram criados apontando pra URL crua do
workspace Replit (ex.: `https://2ef80136-...-myiy6prh.kirk.replit.dev/...`).

Esse subdomínio MUDA toda vez que o workspace hiberna/recria. Já mudou:

- Quando a Task #129 foi escrita: `...-myiy6prh.kirk.replit.dev`
- Em 13/mai/2026 (mesmo dia): `...-wpyfj4uf.kirk.replit.dev`

Quando muda, os webhooks param de chegar **silenciosamente** e a tabela
`auditoria_assinaturas` para de receber linhas até alguém perceber.

A solução é apontar pro CNAME estável `webhooks.pawards.com.br`.

## Pré-requisito: deployment publicado + domínio vinculado

Estado atual (verificado em 13/mai/2026):

- DNS de `webhooks.pawards.com.br` JÁ propagou → resolve pra
  `34.117.33.233` (IP do Replit Deployments). ✅
- `https://webhooks.pawards.com.br/api/healthz` → falha de TLS
  (`unexpected eof while reading`). ❌

A falha de TLS é porque o domínio customizado ainda não foi vinculado ao
deployment publicado (cert TLS não foi provisionado pelo Replit).

### Passo 1 — Publicar/vincular no painel Replit Deployments

1. Painel Replit → workspace `integrative-health-engine` → aba
   **Deployments**.
2. Se não houver deployment ativo: **Deploy** (Reserved VM ou Autoscale,
   conforme a estratégia). Aguardar status `Live`.
3. Aba **Settings** do deployment → **Custom domains** → **Link a
   domain** → digitar `webhooks.pawards.com.br`.
4. Replit vai mostrar instruções de DNS. O CNAME já está apontado pro
   alvo certo (`integrative-health-engine.replit.app`), então só
   confirmar. Aguardar o status virar `Verified` + cert TLS provisionado
   (geralmente < 5 min).
5. Validar do shell:

   ```bash
   curl -i https://webhooks.pawards.com.br/api/healthz
   ```

   Esperado: `HTTP/2 200`.

### Passo 2 — Trocar as 3 URLs no painel ZapSign

1. Painel ZapSign → **Configurações** → **Integrações** → **Webhooks**.
2. Para cada um dos 3 webhooks (assinatura criada / assinatura assinada /
   assinatura recusada — confirmar nomes no painel), clicar **Editar** e
   trocar a URL:

   - **De:** `https://2ef80136-...-<hash>.kirk.replit.dev/api/webhooks/assinatura/zapsign`
   - **Para:** `https://webhooks.pawards.com.br/api/webhooks/assinatura/zapsign`

3. Salvar cada um.

### Passo 3 — Teste end-to-end

1. Disparar uma assinatura nova de teste pelo motor (qualquer fluxo RACJ
   que use ZapSign).
2. Assinar/recusar no app do ZapSign.
3. Verificar que entrou linha em `auditoria_assinaturas`:

   ```sql
   SELECT criado_em, evento, payload->>'token' AS token
     FROM auditoria_assinaturas
   ORDER BY criado_em DESC
   LIMIT 5;
   ```

4. Linhas chegando = OK. Vazio depois de 1 min = webhook não chegou,
   revisar URL no painel ZapSign + cert TLS no Replit.

### Passo 4 — Quando publicar em outro destino (`*.replit.app` mudar)

Se o app de produção for republicado em outro endereço `*.replit.app`,
atualizar o CNAME no Registro.br:

1. Registro.br → `pawards.com.br` → **DNS** → editar registro
   `webhooks` (tipo CNAME).
2. Trocar destino pra novo `<algo>.replit.app`.
3. Aguardar propagação (TTL atual no zone file).
4. Re-rodar `curl https://webhooks.pawards.com.br/api/healthz` pra
   confirmar.

## Checklist final (Done looks like da Task #129)

- [ ] `curl https://webhooks.pawards.com.br/api/healthz` retorna 200
- [ ] 3 webhooks no painel ZapSign apontam pro domínio bonito
- [ ] Assinatura nova chega → linha em `auditoria_assinaturas`
- [ ] CNAME no Registro.br documentado pra futuras republicações
