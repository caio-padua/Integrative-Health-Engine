---
name: Testes acoplados ao banco de dev compartilhado
description: Por que asserts de contagem absoluta (destinatarios wpp/email) quebram, e o conserto via seam de universo
---

# Testes que afirmam contagem absoluta vs. banco de dev compartilhado

Testes que rodam contra o banco de desenvolvimento REAL (singleton drizzle/pool)
e afirmam contagem ABSOLUTA de destinatarios (ex.: "exatamente 1 WhatsApp",
"fallback CEO_WHATSAPP dispara quando NINGUEM tem telefone") sao frageis: o
banco compartilhado tem owners reais (platform_owner / validador_mestre) que
podem ganhar telefone/email com o tempo (ex.: onda "WhatsApp do CEO" cadastrou
telefone E.164 de owners). Quando isso acontece, a contagem real diverge da
esperada e o teste fica vermelho sem nenhuma regressao de codigo.

**Conserto canonico (sem mutar dado real):** adicionar um *seam* de teste para o
UNIVERSO de entrada (no padrao dos seams ja existentes do modulo, ex.:
`_setGmailClientFactoryParaTestes`, `_setEnviarWhatsappParaTestes`). O seam
injeta uma lista deterministica so em teste; em producao o universo continua
vindo do banco. Extrair a normalizacao/dedupe/filtro para uma funcao pura
exportada deixa esse pedaco testavel sozinho.

**Why:** mutar telefone/email de owner real no `before`/`arrange` (ex.:
`UPDATE usuarios SET telefone = NULL`) e arriscado — se o teste crashar antes do
`finally`, o dado real fica corrompido no banco de dev. O seam evita tocar dado
real e ainda exercita normalizacao/dedupe/fallback de verdade.

**How to apply:** sempre que um teste afirmar contagem exata de destinatarios
resolvidos por query no banco compartilhado, prefira injetar o universo via seam
+ assert deterministico, em vez de assumir que so as linhas semeadas pelo teste
existem. Mantenha `beforeEach` setando um universo padrao e `after` resetando o
seam para nao vazar entre describes.
