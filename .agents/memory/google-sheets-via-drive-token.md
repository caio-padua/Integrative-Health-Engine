---
name: Google Sheets via token do conector google-drive
description: Como ler e criar Google Sheets neste repl quando o conector Sheets está not_setup mas o google-drive está conectado.
---

# Ler/escrever Google Sheets sem o conector Sheets

Neste repl o conector `Google Sheets` aparece como `not_setup` (sem OAuth),
MAS o conector `google-drive` está `healthy` e seu access_token tem escopo
de LEITURA **e ESCRITA** no Drive.

**Regra:** para mexer em planilhas, use a Drive REST API com o token do
google-drive (via `listConnections('google-drive')[0].settings.access_token`),
não procure o conector Sheets.

**Como aplicar:**
- Ler uma Google Sheet (todas as abas): `GET /drive/v3/files/{id}/export?mimeType=...spreadsheetml.sheet` → baixa xlsx, parseia com openpyxl (python). `export` só funciona em arquivo nativo Google; arquivo já-xlsx usa `?alt=media`.
- Criar Google Sheet nativa populada: monte o xlsx local (openpyxl, com formatação + data validation dropdown), e faça upload multipart em `POST /upload/drive/v3/files?uploadType=multipart` com metadata `mimeType:'application/vnd.google-apps.spreadsheet'` + `parents:[folderId]`. A conversão xlsx→Sheet nativa preserva formatação básica.
- O que NÃO dá pelo Drive: editar células de uma Sheet existente / data validation pós-criação (isso exigiria a Sheets API = conector Sheets). Contorne recriando o arquivo.

**Why:** evita pedir reautorização/conector novo quando o google-drive já
cobre o caso; o item "Reautorizacao Google OAuth" do backlog não bloqueia
criar/ler planilhas — só email institucional.

**Atenção:** `/tmp` é limpo a cada restart do sandbox de code_execution;
grave artefatos de trabalho em `.local/.audit_work/` (persistente, gitignored).
Pasta Drive "PAWARDS REPLIT" = id `10XKUdVPM4H8sGcKzyS3fIoEgS8Ifdz_f`.
