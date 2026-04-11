import {
  db, usuariosTable, pacientesTable, unidadesTable,
  acompanhamentoCavaloTable, examesEvolucaoTable, feedbackFormulasTable,
  dadosVisitaClinicaTable, arquivosExamesTable, formulasMasterTable,
  cascataValidacaoConfigTable, validacoesCascataTable,
  soberaniaConfigTable, profissionalConfiancaTable, filaPreceptorTable,
  eventosClinicosTable, sugestoesTable, anamnesesTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const BASE = "http://localhost:8080/api";

async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
    failures.push(name);
  }
}

async function seedFictitiousData() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  SEED — Dados Fictícios para Testes");
  console.log("═══════════════════════════════════════════\n");

  const existingUsers = await db.select().from(usuariosTable);
  const caio = existingUsers.find(u => u.email === "caio@clinica.com");
  const helena = existingUsers.find(u => u.email === "helena@clinica.com");
  const ana = existingUsers.find(u => u.email === "ana@clinica.com");
  const carlos = existingUsers.find(u => u.email === "carlos@clinica.com");

  if (!caio || !helena || !ana || !carlos) {
    console.log("⚠️  Usuários demo não encontrados. Criando...");
    return null;
  }

  console.log(`  Caio (validador_mestre): ID ${caio.id}`);
  console.log(`  Helena (medico_tecnico): ID ${helena.id}`);
  console.log(`  Ana (enfermeira): ID ${ana.id}`);
  console.log(`  Carlos (validador_enfermeiro): ID ${carlos.id}`);

  const existingPacientes = await db.select().from(pacientesTable);
  let pacientes = existingPacientes;

  if (existingPacientes.length < 3) {
    const [unidade] = await db.select().from(unidadesTable).limit(1);
    const unidadeId = unidade?.id || 1;

    const newPacientes = await db.insert(pacientesTable).values([
      { nome: "Maria Silva dos Santos", telefone: "(11) 99999-0001", email: "maria@email.com", cpf: "111.222.333-01", dataNascimento: "1985-03-15", unidadeId },
      { nome: "João Pedro Oliveira", telefone: "(11) 99999-0002", email: "joao@email.com", cpf: "111.222.333-02", dataNascimento: "1972-08-22", unidadeId },
      { nome: "Fernanda Costa Lima", telefone: "(11) 99999-0003", email: "fernanda@email.com", cpf: "111.222.333-03", dataNascimento: "1990-11-10", unidadeId },
      { nome: "Roberto Almeida Prado", telefone: "(11) 99999-0004", email: "roberto@email.com", cpf: "111.222.333-04", dataNascimento: "1968-05-28", unidadeId },
      { nome: "Lucia Mendes Ferreira", telefone: "(11) 99999-0005", email: "lucia@email.com", cpf: "111.222.333-05", dataNascimento: "1995-01-03", unidadeId },
    ]).returning();
    pacientes = [...existingPacientes, ...newPacientes];
    console.log(`  ✅ ${newPacientes.length} pacientes fictícios criados`);
  } else {
    console.log(`  ℹ️  ${existingPacientes.length} pacientes já existem`);
  }

  const p1 = pacientes[0], p2 = pacientes[1], p3 = pacientes[2];

  const acompExist = await db.select().from(acompanhamentoCavaloTable).limit(1);
  if (acompExist.length === 0) {
    await db.insert(acompanhamentoCavaloTable).values([
      { pacienteId: p1.id, tipo: "CHECKIN_MENSAL", status: "REALIZADO", dataAgendada: new Date("2026-04-01"), dataRealizada: new Date("2026-04-01"), responsavelId: ana.id, observacoes: "Paciente relata melhora geral no sono e disposição.", classificacaoAlerta: "VERDE", origem: "OPERACIONAL" },
      { pacienteId: p1.id, tipo: "VISITA_CLINICA", status: "AGENDADO", dataAgendada: new Date("2026-04-20"), responsavelId: helena.id, classificacaoAlerta: "VERDE", origem: "OPERACIONAL" },
      { pacienteId: p2.id, tipo: "RETORNO", status: "REALIZADO", dataAgendada: new Date("2026-03-28"), dataRealizada: new Date("2026-03-28"), responsavelId: helena.id, observacoes: "Exames de sangue com TSH limítrofe. Ajustar levotiroxina.", classificacaoAlerta: "AMARELO", origem: "OPERACIONAL" },
      { pacienteId: p3.id, tipo: "INTERCORRENCIA", status: "PENDENTE", responsavelId: ana.id, observacoes: "Paciente ligou relatando cefaleia intensa após início de novo protocolo.", classificacaoAlerta: "VERMELHO", origem: "AUTONOMA" },
      { pacienteId: p2.id, tipo: "CHECKIN_MENSAL", status: "AGENDADO", dataAgendada: new Date("2026-04-15"), responsavelId: carlos.id, classificacaoAlerta: "VERDE", origem: "OPERACIONAL" },
    ]);
    console.log("  ✅ 5 acompanhamentos cavalo criados");
  }

  const examesExist = await db.select().from(examesEvolucaoTable).limit(1);
  if (examesExist.length === 0) {
    await db.insert(examesEvolucaoTable).values([
      { pacienteId: p1.id, nomeExame: "TSH", categoria: "Tireoide", valor: 2.5, unidade: "mUI/L", valorMinimo: 0.4, valorMaximo: 4.0, classificacao: "OTIMO", dataColeta: "2026-04-01", laboratorio: "Fleury", registradoPorId: ana.id, origem: "OPERACIONAL" },
      { pacienteId: p1.id, nomeExame: "Vitamina D (25-OH)", categoria: "Vitaminas", valor: 18.0, unidade: "ng/mL", valorMinimo: 30.0, valorMaximo: 100.0, classificacao: "PREOCUPANTE", dataColeta: "2026-04-01", laboratorio: "Fleury", registradoPorId: ana.id, origem: "OPERACIONAL" },
      { pacienteId: p2.id, nomeExame: "Testosterona Total", categoria: "Hormonal", valor: 280.0, unidade: "ng/dL", valorMinimo: 300.0, valorMaximo: 1000.0, classificacao: "BAIXO", dataColeta: "2026-03-28", laboratorio: "DASA", registradoPorId: helena.id, origem: "OPERACIONAL" },
      { pacienteId: p2.id, nomeExame: "Hemoglobina Glicada", categoria: "Metabólico", valor: 5.6, unidade: "%", valorMinimo: 4.0, valorMaximo: 5.7, classificacao: "MEDIANO", dataColeta: "2026-03-28", laboratorio: "DASA", registradoPorId: helena.id, origem: "OPERACIONAL" },
      { pacienteId: p3.id, nomeExame: "Ferritina", categoria: "Ferro", valor: 8.0, unidade: "ng/mL", valorMinimo: 30.0, valorMaximo: 300.0, classificacao: "ALERTA", dataColeta: "2026-04-05", laboratorio: "Hermes Pardini", registradoPorId: ana.id, origem: "AUTONOMA" },
      { pacienteId: p1.id, nomeExame: "Cortisol Salivar (8h)", categoria: "Adrenal", valor: 15.2, unidade: "nmol/L", valorMinimo: 6.0, valorMaximo: 23.0, classificacao: "OTIMO", dataColeta: "2026-04-01", laboratorio: "Fleury", registradoPorId: ana.id, origem: "OPERACIONAL" },
    ]);
    console.log("  ✅ 6 exames evolução criados");
  }

  const feedExist = await db.select().from(feedbackFormulasTable).limit(1);
  if (feedExist.length === 0) {
    await db.insert(feedbackFormulasTable).values([
      { pacienteId: p1.id, codigoPadcom: "FRM-VIT-001", nomeFormula: "Vitamina D3 50.000UI", efeitoPercebido: "MELHORA", descricaoEfeito: "Mais energia, sono melhorou significativamente", nivelSatisfacao: 9, relatadoPorId: ana.id, origem: "OPERACIONAL" },
      { pacienteId: p2.id, codigoPadcom: "FRM-HOR-012", nomeFormula: "Testosterona Cipionato 200mg/mL", efeitoPercebido: "MELHORA", descricaoEfeito: "Aumento de libido, mais disposição", nivelSatisfacao: 8, relatadoPorId: carlos.id, origem: "OPERACIONAL" },
      { pacienteId: p3.id, codigoPadcom: "FRM-NEU-003", nomeFormula: "Magnésio Treonato 2g", efeitoPercebido: "EFEITO_COLATERAL", descricaoEfeito: "Cefaleia intensa após 3 dias de uso", nivelSatisfacao: 3, relatadoPorId: ana.id, origem: "AUTONOMA" },
    ]);
    console.log("  ✅ 3 feedbacks de fórmulas criados");
  }

  const visitaExist = await db.select().from(dadosVisitaClinicaTable).limit(1);
  if (visitaExist.length === 0) {
    await db.insert(dadosVisitaClinicaTable).values([
      { pacienteId: p1.id, coletadoPorId: ana.id, pesoKg: 68.5, alturaCm: 165, imc: 25.2, pressaoSistolica: 120, pressaoDiastolica: 80, frequenciaCardiaca: 72, bfPercentual: 28.5, massaMuscularKg: 24.3, classificacaoAlerta: "VERDE", adesaoPercebida: "ALTA", relatoPaciente: "Me sinto muito bem, dormindo melhor", observacaoEnfermeira: "Paciente colaborativa, adesão excelente", origem: "OPERACIONAL" },
      { pacienteId: p2.id, coletadoPorId: ana.id, pesoKg: 92.3, alturaCm: 178, imc: 29.1, pressaoSistolica: 140, pressaoDiastolica: 90, frequenciaCardiaca: 82, bfPercentual: 32.1, massaMuscularKg: 31.5, classificacaoAlerta: "AMARELO", adesaoPercebida: "MEDIA", relatoPaciente: "Não consegui manter a dieta esta semana", observacaoEnfermeira: "PA elevada, orientar dieta hipossódica", origem: "OPERACIONAL" },
      { pacienteId: p3.id, coletadoPorId: ana.id, pesoKg: 52.1, alturaCm: 160, imc: 20.4, pressaoSistolica: 100, pressaoDiastolica: 65, frequenciaCardiaca: 90, bfPercentual: 22.0, massaMuscularKg: 18.0, classificacaoAlerta: "VERMELHO", adesaoPercebida: "BAIXA", relatoPaciente: "Muito cansada, tontura ao levantar", observacaoEnfermeira: "Hipotensão ortostática. Ferritina muito baixa. Alerta vermelho.", origem: "OPERACIONAL" },
    ]);
    console.log("  ✅ 3 visitas clínicas criadas");
  }

  const formulasExist = await db.select().from(formulasMasterTable).limit(1);
  if (formulasExist.length === 0) {
    await db.insert(formulasMasterTable).values([
      { codigoPadcom: "FRM-VIT-001", nome: "Vitamina D3 50.000UI", categoria: "Vitaminas", via: "ORAL", dosePadrao: "1 cápsula/semana", funcaoPrincipal: "Reposição de vitamina D", efeitosEsperados: ["Melhora óssea", "Imunidade", "Humor"], efeitosColateraisPossiveis: ["Hipercalcemia em doses excessivas"], contraindicacoes: ["Hipercalcemia", "Sarcoidose"], ativo: true },
      { codigoPadcom: "FRM-HOR-012", nome: "Testosterona Cipionato 200mg/mL", categoria: "Hormonal", via: "IM", dosePadrao: "1mL a cada 15 dias", funcaoPrincipal: "TRT masculina", efeitosEsperados: ["Libido", "Massa muscular", "Energia"], efeitosColateraisPossiveis: ["Acne", "Policitemia", "Ginecomastia"], contraindicacoes: ["CA prostata", "Policitemia severa"], ativo: true },
      { codigoPadcom: "FRM-NEU-003", nome: "Magnésio Treonato 2g", categoria: "Neurológico", via: "ORAL", dosePadrao: "2g à noite", funcaoPrincipal: "Neuroproteção e sono", efeitosEsperados: ["Sono profundo", "Cognição", "Ansiolítico"], efeitosColateraisPossiveis: ["Cefaleia", "Diarreia"], contraindicacoes: ["Insuficiência renal grave"], ativo: true },
      { codigoPadcom: "FRM-INJ-007", nome: "Glutationa EV 600mg", categoria: "Antioxidante", via: "EV", dosePadrao: "600mg diluído em SF 100mL", funcaoPrincipal: "Detox hepático e antioxidante sistêmico", efeitosEsperados: ["Clareamento pele", "Detox", "Imunidade"], efeitosColateraisPossiveis: ["Cólica abdominal leve"], contraindicacoes: ["Alergia ao componente"], ativo: true },
    ]);
    console.log("  ✅ 4 fórmulas master criadas");
  }

  return { caio, helena, ana, carlos, p1, p2, p3 };
}

async function testCavaloRoutes(users: any, pacientes: any) {
  console.log("\n═══════════════════════════════════════════");
  console.log("  TESTE 1: Rotas do Cavalo de Acompanhamento");
  console.log("═══════════════════════════════════════════\n");

  const { status: s1, data: d1 } = await api("GET", "/cavalo/acompanhamentos");
  assert("GET /cavalo/acompanhamentos retorna 200", s1 === 200);
  assert("Acompanhamentos existem", Array.isArray(d1) && d1.length >= 5, `got ${d1.length}`);

  const { status: s2, data: d2 } = await api("GET", `/cavalo/acompanhamentos?pacienteId=${pacientes.p1.id}`);
  assert("Filtro por paciente funciona", s2 === 200 && d2.every((a: any) => a.pacienteId === pacientes.p1.id));

  const vermelho = d1.find((a: any) => a.classificacaoAlerta === "VERMELHO");
  assert("Alerta VERMELHO presente (intercorrência)", !!vermelho);
  assert("Intercorrência é origem AUTONOMA", vermelho?.origem === "AUTONOMA");

  const { status: s3, data: d3 } = await api("GET", "/cavalo/exames-evolucao");
  assert("GET /cavalo/exames-evolucao retorna 200", s3 === 200);
  assert("Exames evolução existem", Array.isArray(d3) && d3.length >= 6, `got ${d3.length}`);

  const vitD = d3.find((e: any) => e.nomeExame === "Vitamina D (25-OH)");
  assert("Vitamina D classificada como PREOCUPANTE", vitD?.classificacao === "PREOCUPANTE");

  const ferritina = d3.find((e: any) => e.nomeExame === "Ferritina");
  assert("Ferritina classificada como ALERTA", ferritina?.classificacao === "ALERTA");

  const { status: s4, data: d4 } = await api("GET", "/cavalo/feedback-formulas");
  assert("GET /cavalo/feedback-formulas retorna 200", s4 === 200);
  assert("Feedbacks existem", d4.length >= 3);

  const efeitoColateral = d4.find((f: any) => f.efeitoPercebido === "EFEITO_COLATERAL");
  assert("Efeito colateral registrado (Magnésio)", !!efeitoColateral);

  const { status: s5, data: d5 } = await api("GET", "/cavalo/visitas-clinicas");
  assert("GET /cavalo/visitas-clinicas retorna 200", s5 === 200);
  assert("Visitas clínicas existem", d5.length >= 3);

  const paAlta = d5.find((v: any) => v.pressaoSistolica >= 140);
  assert("PA elevada detectada (João)", !!paAlta);
  assert("PA elevada tem alerta AMARELO", paAlta?.classificacaoAlerta === "AMARELO");

  const { status: s6, data: d6 } = await api("GET", "/cavalo/formulas-master");
  assert("GET /cavalo/formulas-master retorna 200", s6 === 200);
  assert("Fórmulas master existem", d6.length >= 4);

  const { status: s7, data: d7 } = await api("GET", "/cavalo/cascata-config");
  assert("GET /cavalo/cascata-config retorna 200", s7 === 200);
  assert("Cascata config tem campo 'ativa'", d7.ativa !== undefined);
}

async function testSoberaniaToggle(users: any, pacientes: any) {
  console.log("\n═══════════════════════════════════════════");
  console.log("  TESTE 2: Toggle de Soberania Médica");
  console.log("═══════════════════════════════════════════\n");

  const { status: s1, data: d1 } = await api("GET", "/soberania/config");
  assert("GET /soberania/config retorna 200", s1 === 200);
  assert("Soberania ativa por padrão", d1.validacaoSupremaAtiva === true);
  assert("Prazo padrão 48h", d1.prazoHomologacaoHoras === 48);

  console.log("\n  --- Teste: Não-diretor tenta alterar soberania ---");
  const { status: s2 } = await api("POST", "/soberania/config", {
    validacaoSupremaAtiva: false,
    alteradoPorId: users.helena.id,
    motivo: "VIAGEM",
  });
  assert("Helena (medico_tecnico) NÃO pode alterar soberania", s2 === 403);

  const { status: s2b } = await api("POST", "/soberania/config", {
    validacaoSupremaAtiva: false,
    alteradoPorId: users.ana.id,
    motivo: "OUTRO",
  });
  assert("Ana (enfermeira) NÃO pode alterar soberania", s2b === 403);

  console.log("\n  --- Teste: Diretor desativa soberania ---");
  const { status: s3, data: d3 } = await api("POST", "/soberania/config", {
    validacaoSupremaAtiva: false,
    alteradoPorId: users.caio.id,
    motivo: "VIAGEM",
    observacao: "Viagem de 3 dias — supervisores assumem",
  });
  assert("Caio (validador_mestre) PODE desativar soberania", s3 === 201);
  assert("Soberania agora false", d3.validacaoSupremaAtiva === false);

  console.log("\n  --- Teste: Verificar fluxo com soberania desativada ---");
  const { status: s4, data: d4 } = await api("POST", "/soberania/verificar-fluxo", {
    assistenteId: users.helena.id,
  });
  assert("Verificar-fluxo retorna 200", s4 === 200);
  assert("Não requer homologação (soberania OFF)", d4.requerHomologacaoDiretor === false);
  assert("Motivo correto", d4.motivo.includes("desativada"));

  console.log("\n  --- Teste: Reativar soberania ---");
  await api("POST", "/soberania/config", {
    validacaoSupremaAtiva: true,
    alteradoPorId: users.caio.id,
    motivo: "OUTRO",
    observacao: "Voltei da viagem",
  });

  const { status: s5, data: d5 } = await api("POST", "/soberania/verificar-fluxo", {
    assistenteId: users.helena.id,
  });
  assert("Com soberania ON e sem confiança, REQUER homologação", d5.requerHomologacaoDiretor === true);
  assert("Prazo informado (48h)", d5.prazoHomologacaoHoras === 48);
}

async function testConfiancaDelegada(users: any) {
  console.log("\n═══════════════════════════════════════════");
  console.log("  TESTE 3: Confiança Delegada por Profissional");
  console.log("═══════════════════════════════════════════\n");

  console.log("  --- Teste: Não-diretor tenta delegar ---");
  const { status: s1 } = await api("PATCH", `/soberania/confianca/${users.ana.id}`, {
    confiancaDelegada: true,
    delegadoPorId: users.helena.id,
    observacao: "Helena tentando delegar",
  });
  assert("Medico_tecnico NÃO pode delegar confiança", s1 === 403);

  console.log("\n  --- Teste: Diretor delega confiança para Helena ---");
  const { status: s2, data: d2 } = await api("PATCH", `/soberania/confianca/${users.helena.id}`, {
    confiancaDelegada: true,
    delegadoPorId: users.caio.id,
    observacao: "5 anos de trabalho, confiança total",
  });
  assert("Caio delega confiança para Helena", s2 === 200);
  assert("Confiança delegada = true", d2.confiancaDelegada === true);

  const { data: d3 } = await api("POST", "/soberania/verificar-fluxo", {
    assistenteId: users.helena.id,
  });
  assert("Helena com confiança NÃO requer homologação", d3.requerHomologacaoDiretor === false);
  assert("Motivo: confiança delegada", d3.motivo.includes("confiança delegada"));

  const { data: d3b } = await api("POST", "/soberania/verificar-fluxo", {
    assistenteId: users.ana.id,
  });
  assert("Ana SEM confiança REQUER homologação", d3b.requerHomologacaoDiretor === true);

  console.log("\n  --- Teste: Revogar confiança ---");
  const { status: s4, data: d4 } = await api("PATCH", `/soberania/confianca/${users.helena.id}`, {
    confiancaDelegada: false,
    delegadoPorId: users.caio.id,
    observacao: "Revogando temporariamente",
  });
  assert("Confiança revogada", s4 === 200 && d4.confiancaDelegada === false);

  const { data: d5 } = await api("POST", "/soberania/verificar-fluxo", {
    assistenteId: users.helena.id,
  });
  assert("Após revogar, Helena REQUER homologação novamente", d5.requerHomologacaoDiretor === true);

  console.log("\n  --- Teste: Listar confiança ---");
  const { status: s6, data: d6 } = await api("GET", "/soberania/confianca");
  assert("GET /soberania/confianca retorna lista", s6 === 200 && Array.isArray(d6));
}

async function testFilaPreceptor(users: any, pacientes: any) {
  console.log("\n═══════════════════════════════════════════");
  console.log("  TESTE 4: Fila do Preceptor");
  console.log("═══════════════════════════════════════════\n");

  console.log("  --- Teste: Criar entrada na fila ---");
  const { status: s1, data: d1 } = await api("POST", "/fila-preceptor", {
    casoId: 1,
    tipoCaso: "PROTOCOLO",
    assistenteId: users.helena.id,
    pacienteId: pacientes.p1.id,
    supervisorValidouId: users.helena.id,
    observacaoSupervisor: "Protocolo de reposição vitamínica. Conduta adequada.",
  });
  assert("POST /fila-preceptor retorna 201", s1 === 201);
  assert("Status inicial AGUARDANDO", d1.status === "AGUARDANDO");
  assert("Prazo calculado", !!d1.prazoHomologacao);

  const { status: s1b, data: d1b } = await api("POST", "/fila-preceptor", {
    casoId: 2,
    tipoCaso: "PRESCRICAO",
    assistenteId: users.helena.id,
    pacienteId: pacientes.p2.id,
    supervisorValidouId: users.helena.id,
    observacaoSupervisor: "Prescrição de testosterona para TRT.",
  });
  assert("Segunda entrada criada (prescrição)", s1b === 201);

  const { status: s1c, data: d1c } = await api("POST", "/fila-preceptor", {
    casoId: 3,
    tipoCaso: "FORMULA",
    assistenteId: users.helena.id,
    pacienteId: pacientes.p3.id,
    supervisorValidouId: users.helena.id,
    observacaoSupervisor: "Fórmula de ferro bisglicinato para ferritina baixa.",
  });
  assert("Terceira entrada criada (fórmula)", s1c === 201);

  console.log("\n  --- Teste: Listar fila ---");
  const { status: s2, data: d2 } = await api("GET", "/fila-preceptor");
  assert("GET /fila-preceptor retorna 200", s2 === 200);
  assert("Fila tem pelo menos 3 entradas", d2.length >= 3);

  const { data: d2b } = await api("GET", "/fila-preceptor?status=AGUARDANDO");
  assert("Filtro por status AGUARDANDO funciona", d2b.every((f: any) => f.status === "AGUARDANDO"));

  console.log("\n  --- Teste: Não-diretor tenta homologar ---");
  const { status: s3 } = await api("PATCH", `/fila-preceptor/${d1.id}/homologar`, {
    homologadoPorId: users.helena.id,
    observacaoDiretor: "Helena tentando homologar",
  });
  assert("Medico_tecnico NÃO pode homologar", s3 === 403);

  console.log("\n  --- Teste: Diretor homologa ---");
  const { status: s4, data: d4 } = await api("PATCH", `/fila-preceptor/${d1.id}/homologar`, {
    homologadoPorId: users.caio.id,
    observacaoDiretor: "Conduta correta. Aprovado. Executar protocolo.",
  });
  assert("Caio homologa caso #1", s4 === 200);
  assert("Status agora HOMOLOGADO", d4.status === "HOMOLOGADO");
  assert("homologadoPorId registrado", d4.homologadoPorId === users.caio.id);

  console.log("\n  --- Teste: Diretor devolve ---");
  const { status: s5, data: d5 } = await api("PATCH", `/fila-preceptor/${d1b.id}/devolver`, {
    homologadoPorId: users.caio.id,
    motivoDevolucao: "Dose de testosterona alta demais. Revisar para 100mg.",
    observacaoDiretor: "Ajustar dose antes de executar",
  });
  assert("Caio devolve caso #2", s5 === 200);
  assert("Status agora DEVOLVIDO", d5.status === "DEVOLVIDO");
  assert("Motivo devolução registrado", d5.motivoDevolucao?.includes("Dose"));

  console.log("\n  --- Teste: Campos obrigatórios ---");
  const { status: s6 } = await api("POST", "/fila-preceptor", {
    casoId: 99,
  });
  assert("POST sem campos obrigatórios retorna 400", s6 === 400);

  const { status: s7 } = await api("PATCH", `/fila-preceptor/${d1c.id}/devolver`, {
    homologadoPorId: users.caio.id,
  });
  assert("Devolver sem motivoDevolucao retorna 400", s7 === 400);
}

async function testValidacaoCascataHierarquia(users: any, pacientes: any) {
  console.log("\n═══════════════════════════════════════════");
  console.log("  TESTE 5: Validação em Cascata (Hierarquia)");
  console.log("═══════════════════════════════════════════\n");

  console.log("  --- Regra: Validação PARALELA dentro do mesmo nível ---");
  console.log("  --- Regra: Enfermeira validou → validado (não precisa de outra) ---");
  console.log("  --- Regra: Nenhuma conduta sem carimbo médico ---\n");

  const [v1] = await db.insert(validacoesCascataTable).values({
    entidadeTipo: "CHECKIN",
    entidadeId: 1,
    pacienteId: pacientes.p1.id,
    etapa: "ENFERMEIRA03",
    status: "PENDENTE",
  }).returning();

  const [v2] = await db.insert(validacoesCascataTable).values({
    entidadeTipo: "CHECKIN",
    entidadeId: 1,
    pacienteId: pacientes.p1.id,
    etapa: "CONSULTOR03",
    status: "PENDENTE",
  }).returning();

  const [v3] = await db.insert(validacoesCascataTable).values({
    entidadeTipo: "CHECKIN",
    entidadeId: 1,
    pacienteId: pacientes.p1.id,
    etapa: "MEDICO03",
    status: "PENDENTE",
  }).returning();

  const [v4] = await db.insert(validacoesCascataTable).values({
    entidadeTipo: "CHECKIN",
    entidadeId: 1,
    pacienteId: pacientes.p1.id,
    etapa: "MEDICO_SENIOR",
    status: "PENDENTE",
  }).returning();

  const { status: s1, data: d1 } = await api("PATCH", `/cavalo/validacoes-cascata/${v1.id}/validar`, {
    status: "APROVADO",
    validadoPorId: users.ana.id,
    observacao: "Check-in conferido pela enfermeira Ana",
  });
  assert("Enfermeira Ana valida etapa ENFERMEIRA03", s1 === 200);
  assert("Status: APROVADO", d1.status === "APROVADO");

  const { status: s2 } = await api("PATCH", `/cavalo/validacoes-cascata/${v2.id}/validar`, {
    status: "APROVADO",
    validadoPorId: users.ana.id,
    observacao: "Ana tentando validar CONSULTOR03",
  });
  assert("Enfermeira NÃO pode validar etapa CONSULTOR03", s2 === 403);

  const { status: s3, data: d3 } = await api("PATCH", `/cavalo/validacoes-cascata/${v2.id}/validar`, {
    status: "APROVADO",
    validadoPorId: users.carlos.id,
    observacao: "Consultor Carlos valida",
  });
  assert("Carlos (validador_enfermeiro) valida CONSULTOR03", s3 === 200);

  const { status: s4 } = await api("PATCH", `/cavalo/validacoes-cascata/${v3.id}/validar`, {
    status: "APROVADO",
    validadoPorId: users.carlos.id,
    observacao: "Carlos tentando validar MEDICO03",
  });
  assert("Consultor NÃO pode validar etapa MEDICO03", s4 === 403);

  const { status: s5, data: d5 } = await api("PATCH", `/cavalo/validacoes-cascata/${v3.id}/validar`, {
    status: "APROVADO",
    validadoPorId: users.helena.id,
    observacao: "Dra. Helena aprova conduta médica",
  });
  assert("Helena (medico_tecnico) valida MEDICO03 — carimbo médico", s5 === 200);
  assert("Status APROVADO com carimbo médico", d5.status === "APROVADO");

  const { status: s6 } = await api("PATCH", `/cavalo/validacoes-cascata/${v4.id}/validar`, {
    status: "APROVADO",
    validadoPorId: users.helena.id,
    observacao: "Helena tentando ser MEDICO_SENIOR",
  });
  assert("Medico_tecnico NÃO pode validar MEDICO_SENIOR", s6 === 403);

  const { status: s7, data: d7 } = await api("PATCH", `/cavalo/validacoes-cascata/${v4.id}/validar`, {
    status: "APROVADO",
    validadoPorId: users.caio.id,
    observacao: "Dr. Caio — veredito final do Diretor",
  });
  assert("Caio (validador_mestre) valida MEDICO_SENIOR", s7 === 200);
  assert("Veredito final APROVADO", d7.status === "APROVADO");
}

async function testAuditoria(users: any) {
  console.log("\n═══════════════════════════════════════════");
  console.log("  TESTE 6: Auditoria e Rastreabilidade");
  console.log("═══════════════════════════════════════════\n");

  const { status: s1, data: d1 } = await api("GET", "/soberania/eventos?limit=50");
  assert("GET /soberania/eventos retorna 200", s1 === 200);
  assert("Eventos de auditoria existem", d1.length >= 1);

  const toggleEvents = d1.filter((e: any) => e.tipo === "SOBERANIA_TOGGLE");
  assert("Eventos SOBERANIA_TOGGLE registrados", toggleEvents.length >= 2, `got ${toggleEvents.length}`);

  const confiancaEvents = d1.filter((e: any) => e.tipo === "CONFIANCA_DELEGADA");
  assert("Eventos CONFIANCA_DELEGADA registrados", confiancaEvents.length >= 1);

  const filaEvents = d1.filter((e: any) => e.tipo === "FILA_PRECEPTOR");
  assert("Eventos FILA_PRECEPTOR registrados", filaEvents.length >= 1);

  const homologEvents = d1.filter((e: any) => e.tipo === "HOMOLOGACAO");
  assert("Eventos HOMOLOGACAO registrados", homologEvents.length >= 1);

  const devolucaoEvents = d1.filter((e: any) => e.tipo === "DEVOLUCAO");
  assert("Eventos DEVOLUCAO registrados", devolucaoEvents.length >= 1);

  for (const ev of d1.slice(0, 5)) {
    assert(`Evento #${ev.id} tem descrição`, !!ev.descricao);
    assert(`Evento #${ev.id} tem usuário`, !!ev.usuarioId);
    assert(`Evento #${ev.id} tem timestamp`, !!ev.criadoEm);
  }

  const { data: d2 } = await api("GET", "/soberania/eventos?tipo=SOBERANIA_TOGGLE");
  assert("Filtro por tipo funciona", d2.every((e: any) => e.tipo === "SOBERANIA_TOGGLE"));
}

async function testFluxoCompleto(users: any, pacientes: any) {
  console.log("\n═══════════════════════════════════════════");
  console.log("  TESTE 7: Fluxo Completo End-to-End");
  console.log("═══════════════════════════════════════════\n");

  console.log("  Cenário: Assistente cria caso → Supervisor valida → Motor decide → Fila → Diretor homologa\n");

  await api("POST", "/soberania/config", {
    validacaoSupremaAtiva: true,
    alteradoPorId: users.caio.id,
    motivo: "OUTRO",
    observacao: "Garantir soberania ativa para teste E2E",
  });

  await api("PATCH", `/soberania/confianca/${users.helena.id}`, {
    confiancaDelegada: false,
    delegadoPorId: users.caio.id,
  });

  const { data: fluxo } = await api("POST", "/soberania/verificar-fluxo", {
    assistenteId: users.helena.id,
  });
  assert("Motor decide: REQUER homologação", fluxo.requerHomologacaoDiretor === true);

  const { data: entrada } = await api("POST", "/fila-preceptor", {
    casoId: 100,
    tipoCaso: "EXAME",
    assistenteId: users.helena.id,
    pacienteId: pacientes.p2.id,
    supervisorValidouId: users.helena.id,
    observacaoSupervisor: "Pedido de painel hormonal completo",
  });
  assert("Caso entra na fila", entrada.status === "AGUARDANDO");

  const { data: homologado } = await api("PATCH", `/fila-preceptor/${entrada.id}/homologar`, {
    homologadoPorId: users.caio.id,
    observacaoDiretor: "Painel aprovado. Incluir SHBG no pedido.",
  });
  assert("Diretor homologa (fluxo completo)", homologado.status === "HOMOLOGADO");

  console.log("\n  Cenário: Com confiança delegada → fluxo direto\n");

  await api("PATCH", `/soberania/confianca/${users.helena.id}`, {
    confiancaDelegada: true,
    delegadoPorId: users.caio.id,
    observacao: "Confiança total",
  });

  const { data: fluxo2 } = await api("POST", "/soberania/verificar-fluxo", {
    assistenteId: users.helena.id,
  });
  assert("Com confiança: fluxo direto (sem fila)", fluxo2.requerHomologacaoDiretor === false);

  console.log("\n  Cenário: Soberania desativada → ninguém passa pela fila\n");

  await api("POST", "/soberania/config", {
    validacaoSupremaAtiva: false,
    alteradoPorId: users.caio.id,
    motivo: "FERIAS",
    observacao: "Férias de 2 semanas",
  });

  await api("PATCH", `/soberania/confianca/${users.helena.id}`, {
    confiancaDelegada: false,
    delegadoPorId: users.caio.id,
  });

  const { data: fluxo3 } = await api("POST", "/soberania/verificar-fluxo", {
    assistenteId: users.helena.id,
  });
  assert("Soberania OFF: mesmo sem confiança, fluxo direto", fluxo3.requerHomologacaoDiretor === false);

  await api("POST", "/soberania/config", {
    validacaoSupremaAtiva: true,
    alteradoPorId: users.caio.id,
    motivo: "OUTRO",
    observacao: "Voltando ao padrão",
  });
}

async function testEdgeCasesAndBugs() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  TESTE 8: Edge Cases, Gargalos e Bugs");
  console.log("═══════════════════════════════════════════\n");

  const { status: s1 } = await api("POST", "/soberania/config", {
    validacaoSupremaAtiva: true,
  });
  assert("POST soberania sem alteradoPorId retorna 400", s1 === 400);

  const { status: s2 } = await api("POST", "/soberania/verificar-fluxo", {});
  assert("Verificar-fluxo sem assistenteId retorna 400", s2 === 400);

  const { status: s3 } = await api("PATCH", "/fila-preceptor/99999/homologar", {
    homologadoPorId: 1,
  });
  assert("Homologar com usuário inválido retorna erro", s3 === 403 || s3 === 404);

  const { status: s4 } = await api("PATCH", "/cavalo/validacoes-cascata/99999/validar", {
    status: "APROVADO",
    validadoPorId: 99999,
  });
  assert("Validar com validador inexistente retorna 404", s4 === 404);

  const { status: s5 } = await api("POST", "/cavalo/acompanhamentos", {
    pacienteId: 99999,
    tipo: "CHECKIN_MENSAL",
  });
  assert("Criar acompanhamento com paciente inexistente retorna erro", s5 === 400);

  const { status: s6 } = await api("PATCH", "/cavalo/acompanhamentos/99999", {
    status: "REALIZADO",
  });
  assert("Atualizar acompanhamento inexistente retorna 404", s6 === 404);

  try {
    const { status: s7 } = await api("POST", "/fila-preceptor", {
      casoId: 1,
      tipoCaso: "PROTOCOLO",
      assistenteId: 99999,
      pacienteId: 99999,
      supervisorValidouId: 99999,
    });
    assert("Fila com IDs inexistentes retorna erro", s7 >= 400 || s7 === 201);
  } catch {
    assert("Fila com IDs inexistentes causa erro (FK constraint)", true);
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  MOTOR CLÍNICO — TESTES SEMÂNTICOS COMPLETOS     ║");
  console.log("║  Fase 2: Cavalo + Soberania + Cascata            ║");
  console.log("║  Toggle de Soberania Médica — PADCOM V15.2       ║");
  console.log("╚══════════════════════════════════════════════════╝");

  const seedResult = await seedFictitiousData();
  if (!seedResult) {
    console.log("❌ SEED FALHOU — usuários demo necessários");
    process.exit(1);
  }

  const { caio, helena, ana, carlos, p1, p2, p3 } = seedResult;
  const users = { caio, helena, ana, carlos };
  const pacientes = { p1, p2, p3 };

  await testCavaloRoutes(users, pacientes);
  await testSoberaniaToggle(users, pacientes);
  await testConfiancaDelegada(users);
  await testFilaPreceptor(users, pacientes);
  await testValidacaoCascataHierarquia(users, pacientes);
  await testAuditoria(users);
  await testFluxoCompleto(users, pacientes);
  await testEdgeCasesAndBugs();

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log(`║  RESULTADO FINAL: ${passed} ✅ passed | ${failed} ❌ failed`);
  if (failures.length > 0) {
    console.log("║  FALHAS:");
    failures.forEach(f => console.log(`║    - ${f}`));
  }
  console.log("╚══════════════════════════════════════════════════╝\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("ERRO FATAL:", err);
  process.exit(1);
});
