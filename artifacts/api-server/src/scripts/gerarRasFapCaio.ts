/**
 * Gera o RAS FAP do CEO (CAIO HENRIQUE FERNANDES PADUA) nos 3 formatos:
 *  - PDF PREMIUM (com cor/branding)
 *  - PDF SIMPLES (monocromatico, pronto pra impressao)
 *  - XLSX (planilha)
 *
 * Protocolo (CEO 17/06/2026):
 *  COENZIMA Q10        — 8 sessoes, freq 7 dias
 *  PQQ                 — 4 sessoes, freq 15 dias
 *  TESTOSTERONA BIO    — 4 sessoes, freq 15 dias, dose 200MG
 *  VITAMINA D          — 4 sessoes, freq 7 dias  (linha duplicada na fala, consolidada)
 *
 * Premissas assumidas (reversiveis): inicio de todas = 17/06/2026; CPF do
 * cadastro de teste; idade/celular em branco; valor R$ 0,00.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { gerarRasFapPdf, type DadosRasFap } from "../pdf/rasFap";
import { gerarRasFapExcel } from "../pdf/rasFapExcel";

async function main() {
  const inicio = new Date(2026, 5, 17); // 17/06/2026
  const dados: DadosRasFap = {
    nome: "CAIO HENRIQUE FERNANDES PADUA",
    cpf: "293.274.948-06",
    celular: "",
    idade: "",
    medicoResponsavel: "DR. CAIO PADUA",
    enfermeira: "EQUIPE DE ENFERMAGEM PADUA",
    unidade: "INSTITUTO PADUA",
    dataAtendimento: inicio,
    protocoloNumero: "",
    valorTratamento: 0,
    substancias: [
      { nome: "COENZIMA Q10", sessoes: 8, frequenciaDias: 7, inicio },
      { nome: "PQQ", sessoes: 4, frequenciaDias: 15, inicio },
      { nome: "TESTOSTERONA BIO", dose: "200MG", sessoes: 4, frequenciaDias: 15, inicio },
      { nome: "VITAMINA D", sessoes: 4, frequenciaDias: 7, inicio },
    ],
  };

  const outDir = `${process.cwd()}/../../.local/.audit_work`;
  mkdirSync(outDir, { recursive: true });

  const premium = await gerarRasFapPdf(dados, "PREMIUM");
  writeFileSync(`${outDir}/RAS_FAP_CAIO_PREMIUM_26.06.17.pdf`, premium);

  const simples = await gerarRasFapPdf(dados, "SIMPLES");
  writeFileSync(`${outDir}/RAS_FAP_CAIO_SIMPLES_26.06.17.pdf`, simples);

  const xlsx = await gerarRasFapExcel(dados);
  writeFileSync(`${outDir}/RAS_FAP_CAIO_26.06.17.xlsx`, xlsx);

  console.log("PREMIUM bytes=" + premium.length);
  console.log("SIMPLES bytes=" + simples.length);
  console.log("XLSX bytes=" + xlsx.length);
  console.log("OUT=" + outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
