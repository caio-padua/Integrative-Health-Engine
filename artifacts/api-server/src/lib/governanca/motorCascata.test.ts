// ============================================================================
// Testes do NUCLEO PURO do motor da cascata (sem banco). A camada I/O e
// validada em ambiente com banco; aqui provamos a logica de decisao/ordem/selo.
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acaoDaEtapa,
  decidirValidacaoEtapa,
  etapasRequeridas,
  etapaLiberadaParaDecisao,
  calcularSelo,
  ORDEM_ETAPAS,
  type EtapaCascata,
  type StatusEtapa,
} from "./motorCascata";
import type { Perfil } from "./avaliarDelegacao";

const enfermeira: Perfil = { codigoPerfil: "enfermeira", podeValidar: true, podeAssinar: false, podeBypass: false, nuncaOpera: false };
const medicoSenior: Perfil = { codigoPerfil: "validador_mestre", podeValidar: true, podeAssinar: true, podeBypass: true, nuncaOpera: false };
const recepcao: Perfil = { codigoPerfil: "recepcao", podeValidar: false, podeAssinar: false, podeBypass: false, nuncaOpera: true };

test("C1 MEDICO_SENIOR exige ASSINAR; as demais etapas VALIDAM", () => {
  assert.equal(acaoDaEtapa("MEDICO_SENIOR"), "assinar");
  assert.equal(acaoDaEtapa("ENFERMEIRA03"), "validar");
  assert.equal(acaoDaEtapa("CONSULTOR03"), "validar");
  assert.equal(acaoDaEtapa("MEDICO03"), "validar");
});

test("C2 enfermeira valida ENFERMEIRA03 mas NAO assina MEDICO_SENIOR", () => {
  assert.equal(decidirValidacaoEtapa("ENFERMEIRA03", enfermeira).permitido, true);
  const r = decidirValidacaoEtapa("MEDICO_SENIOR", enfermeira);
  assert.equal(r.permitido, false);
  assert.match(r.motivo, /pode_assinar/);
});

test("C3 perfil com nunca_opera nao valida nenhuma etapa", () => {
  for (const etapa of ORDEM_ETAPAS) {
    const r = decidirValidacaoEtapa(etapa, recepcao);
    assert.equal(r.permitido, false);
    assert.match(r.motivo, /nunca_opera/);
  }
});

test("C4 medico senior pode validar e assinar todas as etapas", () => {
  for (const etapa of ORDEM_ETAPAS) {
    assert.equal(decidirValidacaoEtapa(etapa, medicoSenior).permitido, true);
  }
});

test("C5 etapasRequeridas respeita a config (liga/desliga niveis)", () => {
  const so2 = etapasRequeridas({ ativa: true, requerEnfermeira03: true, requerConsultor03: false, requerMedico03: false, requerMedicoSenior: true });
  assert.deepEqual(so2, ["ENFERMEIRA03", "MEDICO_SENIOR"]);
});

test("C6 ordem da cascata: nao libera etapa se a anterior nao foi aprovada", () => {
  const requeridas: EtapaCascata[] = ["ENFERMEIRA03", "MEDICO03", "MEDICO_SENIOR"];
  const status = new Map<EtapaCascata, StatusEtapa>([["ENFERMEIRA03", "PENDENTE"], ["MEDICO03", "PENDENTE"], ["MEDICO_SENIOR", "PENDENTE"]]);
  assert.equal(etapaLiberadaParaDecisao("ENFERMEIRA03", requeridas, status).liberada, true);
  assert.equal(etapaLiberadaParaDecisao("MEDICO03", requeridas, status).liberada, false);
  status.set("ENFERMEIRA03", "APROVADO");
  assert.equal(etapaLiberadaParaDecisao("MEDICO03", requeridas, status).liberada, true);
  assert.equal(etapaLiberadaParaDecisao("MEDICO_SENIOR", requeridas, status).liberada, false);
});

test("C7 selo: CINZA vazio, AMARELO em andamento, VERDE tudo aprovado, VERMELHO se rejeitado", () => {
  assert.equal(calcularSelo([]), "CINZA");
  assert.equal(calcularSelo([{ etapa: "ENFERMEIRA03", status: "PENDENTE" }]), "AMARELO");
  assert.equal(calcularSelo([{ etapa: "ENFERMEIRA03", status: "APROVADO" }, { etapa: "MEDICO03", status: "APROVADO" }]), "VERDE");
  assert.equal(calcularSelo([{ etapa: "ENFERMEIRA03", status: "APROVADO" }, { etapa: "MEDICO03", status: "REJEITADO" }]), "VERMELHO");
});

test("C8 etapa nao requerida nao e liberada", () => {
  const r = etapaLiberadaParaDecisao("CONSULTOR03", ["ENFERMEIRA03", "MEDICO_SENIOR"], new Map());
  assert.equal(r.liberada, false);
  assert.match(r.motivo, /nao e requerida/);
});
