// ============================================================================
// Teste cego da funcao juiza (8 casos). Reproduzido dentro do nosso repo.
// PERFIS-exemplo inline (codigos REAIS; valores ilustrativos — em producao
// vem do banco via carregarPerfilGovernanca).
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { avaliarDelegacao, type Perfil } from "./avaliarDelegacao";

const PERFIS: Record<string, Perfil> = {
  medico:               { codigoPerfil: "medico",               podeValidar: true,  podeAssinar: true,  podeBypass: false, nuncaOpera: false },
  validador_mestre:     { codigoPerfil: "validador_mestre",     podeValidar: true,  podeAssinar: true,  podeBypass: true,  nuncaOpera: false },
  enfermeira:           { codigoPerfil: "enfermeira",           podeValidar: true,  podeAssinar: false, podeBypass: false, nuncaOpera: false },
  validador_enfermeiro: { codigoPerfil: "validador_enfermeiro", podeValidar: true,  podeAssinar: false, podeBypass: false, nuncaOpera: false },
  medico_tecnico:       { codigoPerfil: "medico_tecnico",       podeValidar: false, podeAssinar: false, podeBypass: false, nuncaOpera: false },
  recepcao:             { codigoPerfil: "recepcao",             podeValidar: false, podeAssinar: false, podeBypass: false, nuncaOpera: true  },
};

test("G1 enfermeira NAO pode assinar, mesmo delegada pelo medico", () => {
  const r = avaliarDelegacao({ origem: PERFIS.medico, destino: PERFIS.enfermeira, acao: "assinar", modo: "delegado_humano" });
  assert.equal(r.permitido, false); assert.match(r.motivo, /pode_assinar/); assert.equal(r.exigeAuditoria, true);
});
test("G2 validador_mestre PODE validar no modo medico no comando", () => {
  const r = avaliarDelegacao({ origem: PERFIS.validador_mestre, destino: PERFIS.validador_mestre, acao: "validar", modo: "medico_no_comando" });
  assert.equal(r.permitido, true);
});
test("G3 perfil com nunca_opera NUNCA recebe operacao (trava permanente)", () => {
  const r = avaliarDelegacao({ origem: PERFIS.medico, destino: PERFIS.recepcao, acao: "validar", modo: "delegado_humano" });
  assert.equal(r.permitido, false); assert.match(r.motivo, /nunca_opera/);
});
test("G4 modo automatico exige pode_bypass na origem", () => {
  const semBypass = avaliarDelegacao({ origem: PERFIS.enfermeira, destino: PERFIS.enfermeira, acao: "validar", modo: "modo_automatico" });
  assert.equal(semBypass.permitido, false); assert.match(semBypass.motivo, /bypass/);
  const comBypass = avaliarDelegacao({ origem: PERFIS.validador_mestre, destino: PERFIS.validador_mestre, acao: "validar", modo: "modo_automatico" });
  assert.equal(comBypass.permitido, true);
});
test("G5 medico no comando com as flags pode assinar", () => {
  const r = avaliarDelegacao({ origem: PERFIS.medico, destino: PERFIS.medico, acao: "assinar", modo: "medico_no_comando" });
  assert.equal(r.permitido, true);
});
test("G6 delegar validacao a quem nao pode validar e negado com motivo claro", () => {
  const r = avaliarDelegacao({ origem: PERFIS.medico, destino: PERFIS.medico_tecnico, acao: "validar", modo: "delegado_humano" });
  assert.equal(r.permitido, false); assert.match(r.motivo, /medico_tecnico/); assert.match(r.motivo, /pode_validar/);
});
test("G7 toda decisao exige auditoria (permitida ou negada)", () => {
  const ok = avaliarDelegacao({ origem: PERFIS.medico, destino: PERFIS.medico, acao: "validar", modo: "medico_no_comando" });
  const nao = avaliarDelegacao({ origem: PERFIS.medico, destino: PERFIS.recepcao, acao: "validar", modo: "medico_no_comando" });
  assert.equal(ok.exigeAuditoria, true); assert.equal(nao.exigeAuditoria, true);
});
test("G8 idempotencia: mesma decisao repetida da o mesmo resultado", () => {
  const pedido = { origem: PERFIS.medico, destino: PERFIS.enfermeira, acao: "assinar" as const, modo: "delegado_humano" as const };
  assert.deepEqual(avaliarDelegacao(pedido), avaliarDelegacao(pedido));
});
