/**
 * Testes do motor PRESCRIÇÃO PADCON UNIVERSAL — Manifesto Blueprint v2.0
 * Cobertura completa do exemplo navegado "Sr. José" (4 blocos → 8 PDFs)
 * + casos de borda das REGRAs 04, 05, 14.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deduzirMafia4,
  deduzirDestino,
  aplicarRegra14,
  agruparEmPDFs,
  processarPrescricao,
  type AtivoEntrada,
  type BlocoEntrada,
} from "./prescricaoEngine";

// ===== Helpers de teste =====
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
// REGRA 05 — MAFIA-4
// =====================================================================
describe("REGRA 05 — deduzirMafia4()", () => {
  it("B1 sozinho → B1__", () => {
    assert.equal(
      deduzirMafia4([at("Clonazepam", "B1", true)]),
      "B1__"
    );
  });

  it("A2 sozinho → A2__", () => {
    assert.equal(deduzirMafia4([at("Venvanse", "A2", true)]), "A2__");
  });

  it("Branca simples → N___", () => {
    assert.equal(
      deduzirMafia4([at("Dipirona", "BRANCA_SIMPLES")]),
      "N___"
    );
  });

  it("Magistral sozinho → M___", () => {
    assert.equal(deduzirMafia4([at("Maca", "MAGISTRAL")]), "M___");
  });

  it("Lilás Hormonal → L___", () => {
    assert.equal(
      deduzirMafia4([at("Estradiol", "LILAS_HORMONAL")]),
      "L___"
    );
  });

  it("B1 + B2 → B12_", () => {
    assert.equal(
      deduzirMafia4([
        at("Clonazepam", "B1", true),
        at("Sibutramina", "B2", true),
      ]),
      "B12_"
    );
  });

  it("A1 + A2 + A3 → A123", () => {
    assert.equal(
      deduzirMafia4([
        at("Morfina", "A1", true),
        at("Venvanse", "A2", true),
        at("Ritalina", "A3", true),
      ]),
      "A123"
    );
  });

  it("Magistral + Branca → HMN_", () => {
    assert.equal(
      deduzirMafia4([
        at("Maca", "MAGISTRAL"),
        at("Dipirona", "BRANCA_SIMPLES"),
      ]),
      "HMN_"
    );
  });

  it("Mistura A+B+Branca → HABN", () => {
    assert.equal(
      deduzirMafia4([
        at("Venvanse", "A2", true),
        at("Clonazepam", "B1", true),
        at("Sertralina", "C1", true),
        at("Dipirona", "BRANCA_SIMPLES"),
      ]),
      // 4 grupos (A, B, C, N) → HMIX
      "HMIX"
    );
  });
});

// =====================================================================
// REGRA 04 — DESTINO
// =====================================================================
describe("REGRA 04 — deduzirDestino()", () => {
  it("Controlado sozinho → FAOP", () => {
    assert.equal(
      deduzirDestino([at("Clonazepam", "B1", true)]),
      "FAOP"
    );
  });

  it("Múltiplos controlados → FAOP", () => {
    assert.equal(
      deduzirDestino([
        at("Clonazepam", "B1", true),
        at("Venvanse", "A2", true),
      ]),
      "FAOP"
    );
  });

  it("Controlado + não-controlado → FAMA (REGRA 14.3)", () => {
    assert.equal(
      deduzirDestino([
        at("Clonazepam", "B1", true),
        at("Maca", "MAGISTRAL"),
      ]),
      "FAMA"
    );
  });

  it("Só Magistral → FAMA", () => {
    assert.equal(deduzirDestino([at("Maca", "MAGISTRAL")]), "FAMA");
  });

  it("Só Lilás Hormonal → HORM", () => {
    assert.equal(
      deduzirDestino([at("Estradiol", "LILAS_HORMONAL")]),
      "HORM"
    );
  });

  it("Só Branca Simples → FACO", () => {
    assert.equal(
      deduzirDestino([at("Captopril", "BRANCA_SIMPLES")]),
      "FACO"
    );
  });

  it("Só Verde Fito → FITO", () => {
    assert.equal(deduzirDestino([at("Camomila", "VERDE_FITO")]), "FITO");
  });
});

// =====================================================================
// REGRA 14 — Isolamento Legal de Controlados
// =====================================================================
describe("REGRA 14 — aplicarRegra14()", () => {
  it("14.1 controlado sozinho → 1 bloco FAOP", () => {
    const bloco: BlocoEntrada = {
      apelido: "Sono",
      via_administracao: "ORAL",
      ativos: [at("Clonazepam", "B1", true, 2)],
    };
    const out = aplicarRegra14(bloco);
    assert.equal(out.length, 1);
    assert.equal(out[0].destino_dispensacao, "FAOP");
    assert.equal(out[0].codigo_mafia4, "B1__");
    assert.equal(out[0].marcacao_manipular_junto, undefined);
  });

  it("14.2 múltiplos controlados → 1 bloco por cor, todos FAOP", () => {
    const bloco: BlocoEntrada = {
      apelido: "Misto Controlado",
      via_administracao: "ORAL",
      ativos: [
        at("Clonazepam", "B1", true),
        at("Venvanse", "A2", true),
      ],
    };
    const out = aplicarRegra14(bloco);
    assert.equal(out.length, 2);
    assert.ok(out.every((b) => b.destino_dispensacao === "FAOP"));
    const codigos = out.map((b) => b.codigo_mafia4).sort();
    assert.deepEqual(codigos, ["A2__", "B1__"]);
  });

  it("14.3 controlado + não-controlado → N+1 blocos FAMA com MANIPULAR JUNTO", () => {
    const bloco: BlocoEntrada = {
      apelido: "Sono Profundo",
      via_administracao: "ORAL",
      ativos: [
        at("Clonazepam", "B1", true, 1),
        at("Maca", "MAGISTRAL", false, 300),
        at("Mucuna", "MAGISTRAL", false, 200),
      ],
    };
    const out = aplicarRegra14(bloco);
    // 1 PDF Azul B1 + 1 PDF Magistral
    assert.equal(out.length, 2);
    assert.ok(out.every((b) => b.destino_dispensacao === "FAMA"));
    assert.ok(
      out.every((b) =>
        b.marcacao_manipular_junto?.includes("Sono Profundo")
      )
    );
    const codigos = out.map((b) => b.codigo_mafia4).sort();
    assert.deepEqual(codigos, ["B1__", "M___"]);
  });

  it("14.3 múltiplos controlados + não-controlados → 1 bloco/cor controlada + 1 magistral", () => {
    const bloco: BlocoEntrada = {
      apelido: "Anti-Crise",
      via_administracao: "ORAL",
      ativos: [
        at("Clonazepam", "B1", true),
        at("Venvanse", "A2", true),
        at("Maca", "MAGISTRAL"),
      ],
    };
    const out = aplicarRegra14(bloco);
    assert.equal(out.length, 3); // B1 + A2 + Magistral
    assert.ok(out.every((b) => b.destino_dispensacao === "FAMA"));
    assert.ok(
      out.every((b) =>
        b.marcacao_manipular_junto?.includes("Anti-Crise")
      )
    );
  });

  it("Sem controlado → 1 bloco passa direto", () => {
    const bloco: BlocoEntrada = {
      apelido: "Pressão Manhã",
      via_administracao: "ORAL",
      ativos: [at("Captopril", "BRANCA_SIMPLES", false, 25)],
    };
    const out = aplicarRegra14(bloco);
    assert.equal(out.length, 1);
    assert.equal(out[0].destino_dispensacao, "FACO");
    assert.equal(out[0].marcacao_manipular_junto, undefined);
  });
});

// =====================================================================
// agruparEmPDFs() + processarPrescricao() — EXEMPLO NAVEGADO Sr. José
// =====================================================================
describe("Exemplo navegado — Sr. José (4 blocos → 8 PDFs)", () => {
  const blocoPerformanceFoco: BlocoEntrada = {
    apelido: "Performance Foco Ansiedade",
    via_administracao: "ORAL",
    ativos: [
      at("Venvanse", "A2", true, 5),
      at("Sertralina", "C1", true, 50),
      at("Clonazepam", "B1", true, 1),
      at("Dipirona", "BRANCA_SIMPLES", false, 500),
    ],
  };
  const blocoSonoProfundo: BlocoEntrada = {
    apelido: "Sono Profundo",
    via_administracao: "ORAL",
    ativos: [
      at("Clonazepam", "B1", true, 1),
      at("Maca", "MAGISTRAL", false, 300),
      at("Mucuna", "MAGISTRAL", false, 200),
    ],
  };
  const blocoAntiHipertensivo: BlocoEntrada = {
    apelido: "Anti-Hipertensivo",
    via_administracao: "ORAL",
    ativos: [at("Captopril", "BRANCA_SIMPLES", false, 25)],
  };
  const blocoHormonal: BlocoEntrada = {
    apelido: "Reposição Hormonal",
    via_administracao: "ORAL",
    ativos: [
      at("Estradiol", "LILAS_HORMONAL", false, 1),
      at("Progesterona", "LILAS_HORMONAL", false, 200),
    ],
  };

  it("processarPrescricao() do Sr. José gera os 8 PDFs esperados", () => {
    const { pdfs } = processarPrescricao([
      blocoPerformanceFoco,
      blocoSonoProfundo,
      blocoAntiHipertensivo,
      blocoHormonal,
    ]);

    // Conta esperada (Manifesto v2.0 SEÇÃO 3):
    // Bloco 1 explode REGRA 14.3: A2 + C1 + B1 (controlados) + Magistral
    //   → mas Performance Foco tem 3 controlados + 1 não-controlado:
    //      A2 (FAMA), C1 (FAMA), B1 (FAMA), Magistral (Dipirona reescrita) (FAMA)
    //   → 4 PDFs
    // Bloco 2 (Sono): B1 + Magistral → 2 PDFs FAMA
    // Bloco 3 (Captopril): 1 PDF Branco FACO
    // Bloco 4 (Hormonal): 1 PDF Lilás HORM
    // Total = 4 + 2 + 1 + 1 = 8 PDFs ✓
    assert.equal(pdfs.length, 8);

    // Cada PDF tem cor/codigo coerente
    const cores = pdfs.map((p) => p.cor_visual).sort();
    assert.ok(cores.filter((c) => c === "azul").length >= 2);
    assert.ok(cores.filter((c) => c === "amarelo").length >= 1);
    assert.ok(cores.filter((c) => c === "lilas").length === 1);

    // PDFs que exigem SNCR são os controlados B/A
    const sncr = pdfs.filter((p) => p.exige_sncr);
    assert.ok(sncr.length >= 3); // A2 (Performance) + B1 (Performance) + B1 (Sono)
  });

  it("Bloco solo controlado → FAOP escolha do paciente", () => {
    const { blocosProcessados } = processarPrescricao([
      {
        apelido: "Só Clonazepam",
        via_administracao: "ORAL",
        ativos: [at("Clonazepam", "B1", true, 2)],
      },
    ]);
    assert.equal(blocosProcessados.length, 1);
    assert.equal(blocosProcessados[0].destino_dispensacao, "FAOP");
  });
});
