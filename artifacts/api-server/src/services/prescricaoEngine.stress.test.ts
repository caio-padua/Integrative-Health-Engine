/**
 * STRESS TEST do motor PRESCRICAO PADCON UNIVERSAL
 * Bateria adversarial: cenarios-limite, payloads patologicos, escala extrema.
 * Asserts alinhados ao COMPORTAMENTO REAL do motor (que ja foi validado nos
 * 23 testes do exemplo Sr. Jose). Aqui documentamos invariantes e edge cases.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  processarPrescricao,
  agruparEmPDFs,
  deduzirMafia4,
  type AtivoEntrada,
  type BlocoEntrada,
} from "./prescricaoEngine";

const at = (
  nome: string,
  codigo: AtivoEntrada["tipo_receita_anvisa_codigo"],
  controlado = false,
  dose = 1
): AtivoEntrada => ({
  nome,
  dose_valor: dose,
  dose_unidade: "mg",
  tipo_receita_anvisa_codigo: codigo,
  controlado,
});

// =====================================================================
// 1. ENTRADAS DEGENERADAS — nao crasham, devolvem vazio coerente
// =====================================================================
describe("STRESS — entradas degeneradas", () => {
  it("Lista de blocos vazia → retorna estrutura vazia, nao quebra", () => {
    const r = processarPrescricao([]);
    assert.equal(r.pdfs.length, 0);
    assert.equal(r.blocosProcessados.length, 0);
  });

  it("Bloco com array de ativos vazio → 0 PDFs sem throw", () => {
    const r = processarPrescricao([
      { apelido: "Vazio", via_administracao: "ORAL", ativos: [] },
    ]);
    assert.equal(r.pdfs.length, 0);
  });

  it("agruparEmPDFs([]) → array vazio", () => {
    assert.deepEqual(agruparEmPDFs([]), []);
  });

  it("deduzirMafia4([]) nao throw e devolve string", () => {
    const r = deduzirMafia4([]);
    assert.equal(typeof r, "string");
    assert.ok(r.length >= 1);
  });
});

// =====================================================================
// 2. APELIDOS DUPLICADOS — blocos com mesmo nome processados isoladamente
// =====================================================================
describe("STRESS — apelidos duplicados", () => {
  it("Dois blocos com mesmo apelido sao processados isoladamente", () => {
    const r = processarPrescricao([
      { apelido: "Sono", via_administracao: "ORAL",
        ativos: [at("Clonazepam", "B1", true, 2)] },
      { apelido: "Sono", via_administracao: "ORAL",
        ativos: [at("Melatonina", "MAGISTRAL", false, 5)] },
    ]);
    assert.equal(r.blocosProcessados.length, 2);
    assert.ok(r.pdfs.length >= 2);
  });
});

// =====================================================================
// 3. ESCALA EXTREMA — 50 ativos
// =====================================================================
describe("STRESS — escala (50 ativos em 1 bloco)", () => {
  it("Bloco com 50 magistrais nao-controlados → 1 PDF Magistral", () => {
    const ativos: AtivoEntrada[] = Array.from({ length: 50 }, (_, i) =>
      at(`Ativo${i}`, "MAGISTRAL", false, i + 1)
    );
    const r = processarPrescricao([
      { apelido: "Megablend", via_administracao: "ORAL", ativos },
    ]);
    assert.equal(r.pdfs.length, 1);
    assert.equal(r.pdfs[0].cor_visual, "magistral");
    const totalAtivos = r.pdfs[0].blocos.reduce((s, b) => s + b.ativos.length, 0);
    assert.equal(totalAtivos, 50);
  });
});

// =====================================================================
// 4. DOSES PATOLOGICAS — engine tolerante (nao valida medicamento)
// =====================================================================
describe("STRESS — doses patologicas", () => {
  it("Dose zero nao quebra processamento", () => {
    const r = processarPrescricao([
      { apelido: "Dose Zero", via_administracao: "ORAL",
        ativos: [at("Captopril", "BRANCA_SIMPLES", false, 0)] },
    ]);
    assert.equal(r.pdfs.length, 1);
  });

  it("Dose negativa nao quebra processamento", () => {
    const r = processarPrescricao([
      { apelido: "Dose Neg", via_administracao: "ORAL",
        ativos: [at("Captopril", "BRANCA_SIMPLES", false, -10)] },
    ]);
    assert.equal(r.pdfs.length, 1);
  });

  it("Dose NaN nao quebra processamento", () => {
    const r = processarPrescricao([
      { apelido: "NaN", via_administracao: "ORAL",
        ativos: [at("Captopril", "BRANCA_SIMPLES", false, NaN)] },
    ]);
    assert.equal(r.pdfs.length, 1);
  });
});

// =====================================================================
// 5. UNICODE NO NOME
// =====================================================================
describe("STRESS — unicode em nomes de ativos", () => {
  it("Nomes com emoji e acentos nao quebram a deducao", () => {
    const r = processarPrescricao([
      { apelido: "Unicode", via_administracao: "ORAL",
        ativos: [at("💊 Vitam̆ina-C ☀️", "MAGISTRAL", false, 1000)] },
    ]);
    assert.equal(r.pdfs.length, 1);
    const nomes = r.pdfs[0].blocos.flatMap((b) => b.ativos.map((a) => a.nome));
    assert.ok(nomes.some((n) => n.includes("💊")));
  });
});

// =====================================================================
// 6. MISTURA DE 4 CONTROLADOS DIFERENTES (REGRA 14.3)
// =====================================================================
describe("STRESS — REGRA 14.3 explosao FAMA multi-cor", () => {
  it("Bloco com B1+A2+C1+Magistral → 4 PDFs distintos por codigo", () => {
    const r = processarPrescricao([
      { apelido: "Tudo Junto", via_administracao: "ORAL",
        ativos: [
          at("Clonazepam", "B1", true, 2),
          at("Metilfenidato", "A2", true, 30),
          at("Codeina", "C1", true, 30),
          at("Dipirona", "MAGISTRAL", false, 500),
        ] },
    ]);
    // 3 controlados distintos + 1 magistral = 4 codigos = 4 PDFs separados
    assert.equal(r.pdfs.length, 4);
    const codigos = new Set(r.pdfs.map((p) => p.tipo_receita_anvisa_codigo));
    assert.ok(codigos.has("B1"));
    assert.ok(codigos.has("A2"));
    assert.ok(codigos.has("C1"));
    assert.ok(codigos.has("MAGISTRAL"));
    // Pelo menos os controlados B1/A2 exigem SNCR
    const sncr = r.pdfs.filter((p) => p.exige_sncr);
    assert.ok(sncr.length >= 2);
  });
});

// =====================================================================
// 7. CONTROLADOS B2 e A3
// =====================================================================
describe("STRESS — controlados B2 e A3", () => {
  it("B2 sozinho → 1 PDF azul, exige SNCR", () => {
    const r = processarPrescricao([
      { apelido: "B2", via_administracao: "ORAL",
        ativos: [at("Anfepramona", "B2", true, 50)] },
    ]);
    assert.equal(r.pdfs.length, 1);
    assert.equal(r.pdfs[0].cor_visual, "azul");
    assert.equal(r.pdfs[0].exige_sncr, true);
  });

  it("A3 sozinho → 1 PDF amarelo, exige SNCR", () => {
    const r = processarPrescricao([
      { apelido: "A3", via_administracao: "ORAL",
        ativos: [at("Modafinil", "A3", true, 200)] },
    ]);
    assert.equal(r.pdfs.length, 1);
    assert.equal(r.pdfs[0].cor_visual, "amarelo");
    assert.equal(r.pdfs[0].exige_sncr, true);
  });
});

// =====================================================================
// 8. MAGISTRAL SOLO
// =====================================================================
describe("STRESS — magistral solo", () => {
  it("Magistral nao-controlado solo → 1 PDF cor 'magistral', destino FAMA", () => {
    const r = processarPrescricao([
      { apelido: "Magistral", via_administracao: "ORAL",
        ativos: [at("BlendComposto", "MAGISTRAL", false, 1)] },
    ]);
    assert.equal(r.pdfs.length, 1);
    assert.equal(r.pdfs[0].cor_visual, "magistral");
    assert.equal(r.pdfs[0].destino_dispensacao, "FAMA");
    assert.equal(r.pdfs[0].exige_sncr, false);
  });
});

// =====================================================================
// 9. INDUSTRIALIZADO + MAGISTRAL — agrupamento por codigo gera 2 PDFs
// =====================================================================
describe("STRESS — industrializado + magistral coexistindo", () => {
  it("Captopril (BRANCA_SIMPLES) + Blend (MAGISTRAL) → 2 PDFs (1 por codigo)", () => {
    const r = processarPrescricao([
      { apelido: "Misto", via_administracao: "ORAL",
        ativos: [
          at("Captopril", "BRANCA_SIMPLES", false, 25),
          at("BlendX", "MAGISTRAL", false, 1),
        ] },
    ]);
    assert.equal(r.pdfs.length, 2);
    const codigos = new Set(r.pdfs.map((p) => p.tipo_receita_anvisa_codigo));
    assert.ok(codigos.has("BRANCA_SIMPLES"));
    assert.ok(codigos.has("MAGISTRAL"));
  });
});

// =====================================================================
// 10. IDEMPOTENCIA
// =====================================================================
describe("STRESS — idempotencia do motor", () => {
  it("Mesma entrada 2x produz mesma saida deterministica", () => {
    const blocos: BlocoEntrada[] = [
      { apelido: "Teste", via_administracao: "ORAL",
        ativos: [at("Clonazepam", "B1", true, 2), at("Magnesio", "MAGISTRAL", false, 300)] },
    ];
    const a = processarPrescricao(blocos);
    const b = processarPrescricao(blocos);
    assert.equal(a.pdfs.length, b.pdfs.length);
    assert.deepEqual(
      a.pdfs.map((p) => p.codigo_pdf).sort(),
      b.pdfs.map((p) => p.codigo_pdf).sort(),
    );
  });
});

// =====================================================================
// 11. LILAS HORMONAL e VERDE FITO — fluxos especiais
// =====================================================================
describe("STRESS — fluxos especiais Lilas e Verde", () => {
  it("LILAS_HORMONAL solo → cor lilas", () => {
    const r = processarPrescricao([
      { apelido: "Hormonio", via_administracao: "ORAL",
        ativos: [at("Estradiol", "LILAS_HORMONAL", false, 1)] },
    ]);
    assert.equal(r.pdfs.length, 1);
    assert.equal(r.pdfs[0].cor_visual, "lilas");
  });

  it("VERDE_FITO solo → cor verde", () => {
    const r = processarPrescricao([
      { apelido: "Fito", via_administracao: "ORAL",
        ativos: [at("PassifloraExt", "VERDE_FITO", false, 250)] },
    ]);
    assert.equal(r.pdfs.length, 1);
    assert.equal(r.pdfs[0].cor_visual, "verde");
  });
});
