---
name: Gerador RAS FAP (PDF premium/simples + Excel)
description: Onde mora o gerador fiel ao modelo FAP do CEO e por que ele existe ao lado do gerador RAS antigo.
---

# Gerador RAS FAP

RAS = Registro de Administracao de Substancias. FAP = padrao de ficha do CEO.

Existe um gerador NOVO, fiel ao modelo premium/simples que o CEO aprovou
(anexos 13/06/2026), vivendo em `artifacts/api-server/src/pdf/rasFap.ts`
(motor de grade + PDF pdfkit, modos PREMIUM/SIMPLES, landscape A4) e
`rasFapExcel.ts` (mesma matriz em .xlsx via exceljs). Script de exemplo:
`src/scripts/gerarRasFapCaio.ts`.

**Por que NAO usar o gerador antigo `gerarRAS.ts`:** ele força `addPage` por
seção, produzindo paginas com uma palavra solta ("N/A", "RENAL") — bug de
paginação real, não dado faltando. O CEO pediu explicitamente o nível dos FAP.

**Motor da grade (montarGrade):** modelo de UNIÃO de datas — uma linha por data
de visita distinta entre todas as substâncias; cada célula = "N/total" se a
substância se aplica naquela data. Mix de frequências (ex.: 7 e 15 dias) não tem
cadência comum, por isso união e não cadência fixa.

**Confluência semanal (Regra Ouro):** `montarGrade` agrupa as datas por semana
ISO (segunda-domingo), elege a 1ª data prevista da semana e consolida ali os
contadores de todas as substâncias daquela semana. SEM = número da IDA do
paciente à clínica, não da dose. Se 2+ doses da MESMA substância caem na mesma
semana (frequência < 7 dias), a célula lista TODAS com `·` (ex.: `1·2·3/4`) —
nunca usar `Math.min` (perde dose silenciosamente).

**Paginação Opção A (SEM cruza páginas):** use `planejarPaginasRasFap(subs)`,
que monta UMA agenda global (`montarGrade(subs, 0)` de TODAS as substâncias) e,
por grupo de até 5 substâncias (colunas), PROJETA as colunas sobre essa agenda
preservando o `numero` (SEM) global e descartando idas vazias do grupo (página 2
sai com lacunas: SEM 1, 3, 5...). NUNCA chamar `montarGrade` por grupo (reinicia
o SEM por página = bug antigo). Padding até 20 linhas por página com `numero: 0`
= SEM em branco (linha de escrita, não é ida real); `desenharGrade` rende vazio
quando `numero <= 0`. Testes de aceite em `rasFap.test.ts` (node:test, 3 casos).

**Premissas do XLSX:** é uma grade horizontal única (Excel rola), não replica o
corte "5 substâncias x 20 linhas por página" do PDF — decisão deliberada.

**Motor:** puppeteer NÃO funciona neste ambiente ("Could not find Chrome"); todo
PDF do sistema é pdfkit. Para conferir visual: `pdftoppm -png -r 110 x.pdf out`
e abrir o PNG com a ferramenta de leitura. Fonte do PDF = Helvetica (FAP é sans
proporcional; a regra JetBrains Mono é só para UI/telas, não para PDF oficial).
