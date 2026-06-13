import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  type ContextoTransmutacao,
  type TermoJuridico,
  CATEGORIAS_JURIDICAS,
  DISTRATO_ESQUELETO,
  aplicarPlaceholders,
  escolherVigente,
  filtrarTermos,
  formatarBRL,
  formatarTratamento,
  montarDocumento,
  montarMapaPlaceholders,
  somarSessoes,
} from "./juridico.ts";

const ctx: ContextoTransmutacao = {
  paciente: { nome: "Ana Beatriz Moraes", codigo: "PAD-0142" },
  tratamento: [
    {
      nome: "Glutationa",
      dose: "600 mg",
      via: "EV",
      sessoes: 10,
      frequencia: "a cada 7 dias",
      justificativa: "Suporte antioxidante.",
    },
    { nome: "Vitamina D", dose: "50000 UI", via: "IM", sessoes: 4, frequencia: "mensal" },
  ],
  financeiro: {
    totalItens: 6000,
    honorarios: 600,
    total: 6600,
    cenario: "6x sem juros",
    parcelas: "6x R$ 1.100,00",
  },
  dataEmissao: "13/06/2026",
  unidade: "Instituto Padua",
};

const termos: TermoJuridico[] = [
  { categoria: "lgpd", titulo: "LGPD", textoCompleto: "Tratamos os dados de {{paciente.nome}}.", versao: 1 },
  { categoria: "nao_garantia", titulo: "Nao Garantia", textoCompleto: "Sem garantia de resultado.", versao: 2 },
  {
    categoria: "ciencia_financeira",
    titulo: "Ciencia Financeira",
    textoCompleto: "Ciente do total {{financeiro.total}}.",
    versao: 1,
  },
  { categoria: "tcle_global", titulo: "TCLE", textoCompleto: "Consentimento livre.", versao: 1, ativo: false },
];

describe("formatarBRL", () => {
  test("formata em padrao brasileiro", () => {
    assert.equal(formatarBRL(6600), "R$ 6.600,00");
    assert.equal(formatarBRL(1342.5), "R$ 1.342,50");
    assert.equal(formatarBRL(0), "R$ 0,00");
  });
  test("entrada invalida vira zero", () => {
    assert.equal(formatarBRL("abc" as unknown as number), "R$ 0,00");
  });
  test("nao finito (Infinity) vira zero", () => {
    assert.equal(formatarBRL(Infinity), "R$ 0,00");
    assert.equal(formatarBRL(Number.NaN), "R$ 0,00");
  });
});

describe("escolherVigente", () => {
  test("pega a maior versao ativa", () => {
    const lista: TermoJuridico[] = [
      { categoria: "nao_garantia", titulo: "v1", textoCompleto: "texto v1", versao: 1 },
      { categoria: "nao_garantia", titulo: "v3", textoCompleto: "texto v3", versao: 3 },
      { categoria: "nao_garantia", titulo: "v9-inativa", textoCompleto: "texto v9", versao: 9, ativo: false },
    ];
    const t = escolherVigente(lista, "nao_garantia");
    assert.equal(t?.versao, 3);
    assert.equal(t?.titulo, "v3");
  });
  test("categoria ausente vira null", () => {
    assert.equal(escolherVigente([], "lgpd"), null);
  });
});

describe("somarSessoes", () => {
  test("soma defensiva", () => {
    assert.equal(somarSessoes(ctx.tratamento), 14);
    assert.equal(somarSessoes(null), 0);
  });
});

describe("formatarTratamento", () => {
  test("detalhado inclui justificativa e frequencia", () => {
    const txt = formatarTratamento(ctx.tratamento, true);
    assert.ok(txt.includes("JUSTIFICATIVA: Suporte antioxidante."));
    assert.ok(txt.includes("Frequencia: a cada 7 dias"));
  });
  test("condensado nao inclui justificativa", () => {
    const txt = formatarTratamento(ctx.tratamento, false);
    assert.ok(!txt.includes("JUSTIFICATIVA"));
    assert.ok(!txt.includes("Frequencia"));
  });
  test("lista vazia marca falta", () => {
    assert.equal(formatarTratamento([], true), "[FALTA: tratamento.itens]");
  });
});

describe("aplicarPlaceholders", () => {
  test("resolve chaves conhecidas", () => {
    const mapa = montarMapaPlaceholders(ctx, true);
    const r = aplicarPlaceholders("Paciente {{paciente.nome}} total {{financeiro.total}}", mapa);
    assert.equal(r.texto, "Paciente Ana Beatriz Moraes total R$ 6.600,00");
    assert.equal(r.naoResolvidos.length, 0);
  });
  test("fail-closed: chave ausente vira marcador visivel", () => {
    const r = aplicarPlaceholders("Valor {{nao.existe}}", {});
    assert.equal(r.texto, "Valor [FALTA: nao.existe]");
    assert.deepEqual(r.naoResolvidos, ["nao.existe"]);
  });
});

describe("filtrarTermos", () => {
  test("respeita ativo=false e ordem das categorias", () => {
    const out = filtrarTermos(termos, ["ciencia_financeira", "lgpd", "tcle_global"]);
    assert.deepEqual(
      out.map((t) => t.categoria),
      ["ciencia_financeira", "lgpd"],
    );
  });
});

describe("montarDocumento", () => {
  test("RAS_PREMIUM tem justificativa e resumo financeiro", () => {
    const doc = montarDocumento("RAS_PREMIUM", termos, ctx);
    assert.ok(doc.corpo.includes("JUSTIFICATIVA"));
    assert.ok(doc.corpo.includes("Total geral: R$ 6.600,00"));
    assert.equal(doc.requerRevisaoAdvogado, false);
    assert.equal(doc.placeholdersNaoResolvidos.length, 0);
  });

  test("RAS_SIMPLES condensa, sem justificativa nem financeiro", () => {
    const doc = montarDocumento("RAS_SIMPLES", termos, ctx);
    assert.ok(!doc.corpo.includes("JUSTIFICATIVA"));
    assert.ok(!doc.corpo.includes("Total geral"));
  });

  test("RAS_JURIDICO puxa textos reais e injeta tratamento/financeiro", () => {
    const doc = montarDocumento("RAS_JURIDICO", termos, ctx);
    assert.ok(doc.corpo.includes("Sem garantia de resultado."));
    assert.ok(doc.corpo.includes("Ciente do total R$ 6.600,00."));
    assert.ok(doc.corpo.includes("Glutationa"));
    assert.ok(doc.categoriasUsadas.includes("nao_garantia"));
    assert.ok(doc.categoriasUsadas.includes("ciencia_financeira"));
  });

  test("RAS_JURIDICO usa a versao vigente quando ha duplicatas", () => {
    const comDuas: TermoJuridico[] = [
      ...termos,
      { categoria: "nao_garantia", titulo: "Nao Garantia v5", textoCompleto: "Texto novo vigente.", versao: 5 },
    ];
    const doc = montarDocumento("RAS_JURIDICO", comDuas, ctx);
    assert.ok(doc.corpo.includes("Texto novo vigente."));
    assert.ok(!doc.corpo.includes("Sem garantia de resultado."));
  });

  test("CONTRATO_COMPLETO concatena categorias base e ignora distrato", () => {
    const doc = montarDocumento("CONTRATO_COMPLETO", termos, ctx);
    assert.ok(doc.categoriasUsadas.includes("lgpd"));
    assert.ok(!doc.categoriasUsadas.includes("distrato"));
    assert.equal(doc.requerRevisaoAdvogado, false);
  });

  test("DISTRATO sem termo usa esqueleto e exige advogado", () => {
    const doc = montarDocumento("DISTRATO", termos, ctx);
    assert.equal(doc.requerRevisaoAdvogado, true);
    assert.ok(doc.corpo.includes("[REVISAR COM ADVOGADO]"));
    assert.ok(doc.corpo.includes("Ana Beatriz Moraes"));
    assert.ok(doc.avisos.length > 0);
  });

  test("DISTRATO com termo cadastrado usa o texto real e ainda exige advogado", () => {
    const comDistrato: TermoJuridico[] = [
      ...termos,
      { categoria: "distrato", titulo: "Distrato Revisado", textoCompleto: "Rescisao de {{paciente.nome}}.", versao: 1 },
    ];
    const doc = montarDocumento("DISTRATO", comDistrato, ctx);
    assert.ok(doc.corpo.includes("Rescisao de Ana Beatriz Moraes."));
    assert.equal(doc.requerRevisaoAdvogado, true);
  });
});

describe("constantes", () => {
  test("distrato e a categoria 9", () => {
    assert.equal(CATEGORIAS_JURIDICAS.length, 9);
    assert.equal(CATEGORIAS_JURIDICAS[8], "distrato");
  });
  test("esqueleto traz marcador de revisao", () => {
    assert.ok(DISTRATO_ESQUELETO.includes("REVISADO POR ADVOGADO"));
  });
});
