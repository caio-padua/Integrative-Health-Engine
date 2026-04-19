import { test } from "node:test";
import assert from "node:assert/strict";
import {
  templateLembretePrescricaoRevo,
  cumprimentoPorHora,
  tratamentoPorGenero,
  montarSaudacao,
  TEMPLATES_DISPONIVEIS,
} from "./whatsappTemplates.js";

test("cumprimentoPorHora cobre os tres periodos do dia", () => {
  assert.equal(cumprimentoPorHora(8), "Bom dia!");
  assert.equal(cumprimentoPorHora(14), "Boa tarde!");
  assert.equal(cumprimentoPorHora(22), "Boa noite!");
  assert.equal(cumprimentoPorHora(4), "Boa noite!");
});

test("tratamentoPorGenero usa Sr./Sra. e fallback sem prefixo", () => {
  assert.equal(tratamentoPorGenero("masculino", "Joao da Silva"), "Sr. Joao");
  assert.equal(tratamentoPorGenero("feminino", "Maria de Souza"), "Sra. Maria");
  assert.equal(tratamentoPorGenero("outro", "Alex Vieira"), "Alex");
  assert.equal(tratamentoPorGenero("nao_informado", "Sam Lima"), "Sam");
  assert.equal(tratamentoPorGenero(undefined, "Pat Campos"), "Pat");
});

test("montarSaudacao monta cumprimento + linha em branco + tratamento + ', tudo bem?'", () => {
  const manha = new Date(2026, 3, 19, 9, 0, 0);
  assert.equal(
    montarSaudacao("Maria Helena", "feminino", manha),
    "Bom dia!\n\nSra. Maria, tudo bem?",
  );
  const tarde = new Date(2026, 3, 19, 15, 0, 0);
  assert.equal(
    montarSaudacao("Caio Padua", "masculino", tarde),
    "Boa tarde!\n\nSr. Caio, tudo bem?",
  );
  const noite = new Date(2026, 3, 19, 21, 0, 0);
  assert.equal(
    montarSaudacao("Alex Vieira", "nao_informado", noite),
    "Boa noite!\n\nAlex, tudo bem?",
  );
});

test("LEMBRETE_PRESCRICAO_REVO esta registrado em TEMPLATES_DISPONIVEIS", () => {
  const t = TEMPLATES_DISPONIVEIS.find((x) => x.nome === "LEMBRETE_PRESCRICAO_REVO");
  assert.ok(t, "template deve estar listado");
  assert.equal(t!.descricao, "Lembrete de prescrição personalizada");
});

test("templateLembretePrescricaoRevo gera saida exata com Programado e NAO TOMAR", () => {
  const saida = templateLembretePrescricaoRevo({
    pacienteNome: "Maria Helena Oliveira",
    pacienteGenero: "feminino",
    agora: new Date(2026, 3, 19, 9, 0, 0),
    periodos: [
      {
        nome: "Início da Manhã",
        tipo: "tomar",
        formulas: [
          {
            nome: "Fórmula 01 - Tireoide Metabolismo",
            ativoPrincipal: "1º Ativo: T3 lenta liberação",
            dose: "12,5 mcg",
            horario: "07h00",
            observacaoRefeicao: "Em jejum, 30 min antes do café",
            posologia: "1 cápsula ao acordar",
          },
        ],
      },
      {
        nome: "Início da Tarde",
        tipo: "nao_tomar",
        formulas: [
          {
            nome: "Fórmula 02 - Energia Mitocondrial",
            ativoPrincipal: "2º Ativo: NAD+ precursor",
            dose: "250 mg",
            horario: "13h00",
            posologia: "1 cápsula apos o almoço",
          },
        ],
      },
    ],
  });

  const esperado = [
    "Bom dia!",
    "",
    "Sra. Maria, tudo bem?",
    "",
    "Segue o lembrete da sua prescricao personalizada:",
    "",
    "⬛ *Período:* _Início da Manhã_",
    "🟩 *Programado* para administrar:",
    "",
    "🟩 *Fórmula 01 - Tireoide Metabolismo*",
    "   1º Ativo: T3 lenta liberação — 12,5 mcg",
    "   Horário: 07h00",
    "   Em jejum, 30 min antes do café",
    "   Posologia: 1 cápsula ao acordar",
    "",
    "⬛ *Período:* _Início da Tarde_",
    "🟨 *NÃO TOMAR* as fórmulas abaixo:",
    "",
    "🟨 *Fórmula 02 - Energia Mitocondrial*",
    "   2º Ativo: NAD+ precursor — 250 mg",
    "   Horário: 13h00",
    "   Posologia: 1 cápsula apos o almoço",
    "",
    "PAWARDS - Instituto Padua",
    "",
    "_Developed by Pawards MedCore_",
  ].join("\n");

  assert.equal(saida, esperado);
});

test("usa caractere ordinal Unicode º (U+00BA), nao a letra o", () => {
  const saida = templateLembretePrescricaoRevo({
    pacienteNome: "Joao",
    pacienteGenero: "masculino",
    agora: new Date(2026, 3, 19, 9, 0, 0),
    periodos: [
      {
        nome: "Início da Manhã",
        tipo: "tomar",
        formulas: [
          {
            nome: "Fórmula 01 - Tireoide",
            ativoPrincipal: "1º Ativo: T3",
            dose: "12,5 mcg",
          },
        ],
      },
    ],
  });
  assert.ok(saida.includes("1\u00BA Ativo"), "deve usar º (U+00BA)");
  assert.ok(!/Tireiode/.test(saida), "nao pode ter a grafia errada Tireiode");
});

test("formatacao: somente palavras-chave em negrito; valor do periodo em italico; detalhes em texto normal", () => {
  const saida = templateLembretePrescricaoRevo({
    pacienteNome: "Maria",
    pacienteGenero: "feminino",
    agora: new Date(2026, 3, 19, 9, 0, 0),
    periodos: [
      {
        nome: "Início da Manhã",
        tipo: "tomar",
        formulas: [
          { nome: "Fórmula 01 - Tireoide", ativoPrincipal: "1º Ativo: T3", dose: "12,5 mcg", horario: "07h00" },
        ],
      },
    ],
  });

  assert.match(saida, /^⬛ \*Período:\* _Início da Manhã_$/m);
  assert.match(saida, /^🟩 \*Programado\* para administrar:$/m);
  assert.match(saida, /^🟩 \*Fórmula 01 - Tireoide\*$/m);
  // detalhes nao podem ter * nem _
  assert.match(saida, /^   1º Ativo: T3 — 12,5 mcg$/m);
  assert.match(saida, /^   Horário: 07h00$/m);
  // o valor "para administrar:" nao pode estar em italico
  assert.ok(!/_para administrar:_/.test(saida));
  // o valor "as fórmulas abaixo:" nao deve aparecer aqui
  assert.ok(!/NÃO TOMAR/.test(saida));
});
