/**
 * Testes de aceite do motor do RAS FAP (carta tecnica do CEO 17/06/2026).
 *
 * RAS = Registro de Administracao de Substancias.
 * SEM = numero sequencial da ida do paciente a clinica (Opcao A).
 *
 * Cobre: Regra Ouro (confluencia por semana ISO), coluna SEM cruzando paginas
 * (Opcao A) e ausencia de perda de sessoes quando 2+ caem na mesma semana.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { montarGrade, planejarPaginasRasFap, type SubstanciaFap } from "./rasFap";

function sub(nome: string, sessoes: number, frequenciaDias: number, inicio: Date): SubstanciaFap {
  return { nome, sessoes, frequenciaDias, inicio };
}

describe("Regra Ouro — confluencia por semana ISO", () => {
  it("consolida varias substancias numa unica ida semanal (1a data da semana)", () => {
    const inicio = new Date(2026, 5, 17); // 17/06/2026 (quarta)
    const subs = [
      sub("COENZIMA Q10", 8, 7, inicio),
      sub("PQQ", 4, 15, inicio),
      sub("TESTOSTERONA BIO", 4, 15, inicio),
      sub("VITAMINA D", 4, 7, inicio),
    ];
    const grade = montarGrade(subs, 0);

    // 11 datas brutas confluem em 8 idas semanais.
    assert.equal(grade.length, 8);
    assert.deepEqual(
      grade.map((l) => l.numero),
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
    // 1a ida agrega as 4 substancias.
    assert.deepEqual(grade[0].contadores, ["1/8", "1/4", "1/4", "1/4"]);
    // 3a ida (semana de 01/07) agrega COENZIMA, PQQ, TESTOSTERONA e VITAMINA D.
    assert.deepEqual(grade[2].contadores, ["3/8", "2/4", "2/4", "3/4"]);
    // ultima ida so tem COENZIMA.
    assert.deepEqual(grade[7].contadores, ["8/8", null, null, null]);
  });
});

describe("Coluna SEM cruzando paginas (Opcao A da carta)", () => {
  it("a 2a pagina preserva o SEM global com lacunas (1, 3, 5, 7), nunca 1, 2, 3", () => {
    const inicio = new Date(2026, 5, 15); // 15/06/2026 (segunda)
    const subs = [
      sub("A", 8, 7, inicio),
      sub("B", 8, 7, inicio),
      sub("C", 8, 7, inicio),
      sub("D", 8, 7, inicio),
      sub("E", 8, 7, inicio),
      sub("TESTOSTERONA", 4, 15, inicio), // 6a substancia => vai pra pagina 2
    ];
    const paginas = planejarPaginasRasFap(subs);
    assert.equal(paginas.length, 2);

    const pag2 = paginas[1];
    assert.equal(pag2.grupo.length, 1);
    assert.equal(pag2.grupo[0].nome, "TESTOSTERONA");

    const semReais = pag2.linhas.filter((l) => l.numero > 0).map((l) => l.numero);
    assert.deepEqual(semReais, [1, 3, 5, 7]);
    assert.notDeepEqual(semReais, [1, 2, 3, 4]);

    // linhas de padding nao recebem numero (SEM em branco = numero 0).
    assert.equal(pag2.linhas.length, 20);
    assert.ok(pag2.linhas.slice(4).every((l) => l.numero === 0));
  });
});

describe("Sem perda de sessoes na mesma semana", () => {
  it("frequencia < 7 que cai 2+ vezes na semana lista todas (1\u00b72\u00b73/4)", () => {
    const inicio = new Date(2026, 5, 15); // segunda
    const grade = montarGrade([sub("X", 4, 3, inicio)], 0);
    // dias 0,3,6 (mesma semana) + dia 9 (semana seguinte).
    assert.equal(grade.length, 2);
    assert.equal(grade[0].contadores[0], "1\u00b72\u00b73/4");
    assert.equal(grade[1].contadores[0], "4/4");
  });
});
