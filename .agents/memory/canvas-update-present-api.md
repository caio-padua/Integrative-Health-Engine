---
name: Canvas applyCanvasActions update + presentArtifact — assinaturas que pegam
description: Forma correta de atualizar shapes e apresentar no canvas via code_execution (3 erros comuns).
---

# Canvas: update de shape e presentArtifact (gotchas)

Custou 3 tentativas falhas descobrir as assinaturas exatas ao mexer no canvas
pelo `code_execution`. Registro pra não repetir.

**Update de shape (ex.: virar iframe placeholder em `live`):**
- A ação `update` NÃO usa a chave `shape` (essa é do `create`).
- Usa `updates: { ... }` E o `updates` PRECISA conter `shapeType` (ex.:
  `"iframe"`) senão o serializador rejeita.
- Exemplo: `{ type:"update", shapeId, updates:{ shapeType:"iframe", state:"live", url } }`.

**presentArtifact:**
- Exige `artifactId` além de `shapeIds`.
- `artifactId` é o id do ARTIFACT do canvas (o de kind/title "Canvas"), NÃO o id
  de um shape. Passar shapeId como artifactId dá "Artifact not found".
- Pegue o id real via a lista de artifacts registrados (o do título "Canvas").

**Why:** a mensagem de erro só revela um requisito por vez (shape→updates→
shapeType→artifactId), então é fácil queimar várias rodadas. Saber os 4 de uma vez resolve em 1 chamada.
