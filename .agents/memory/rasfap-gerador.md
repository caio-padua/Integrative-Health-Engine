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

**Regra de ferro da paginação:** o padding até 20 linhas é POR PÁGINA, nunca
global — senão a última página de um protocolo longo (>20 datas) sai incompleta.
Chame `montarGrade(g, 0)` (raw, sem padding) e complete cada chunk de 20.

**Premissas do XLSX:** é uma grade horizontal única (Excel rola), não replica o
corte "5 substâncias x 20 linhas por página" do PDF — decisão deliberada.

**Motor:** puppeteer NÃO funciona neste ambiente ("Could not find Chrome"); todo
PDF do sistema é pdfkit. Para conferir visual: `pdftoppm -png -r 110 x.pdf out`
e abrir o PNG com a ferramenta de leitura. Fonte do PDF = Helvetica (FAP é sans
proporcional; a regra JetBrains Mono é só para UI/telas, não para PDF oficial).
