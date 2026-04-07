import { db } from "@workspace/db";
import {
  unidadesTable, usuariosTable, pacientesTable,
  itensTerapeuticosTable, blocosTable, regrasMotorTable,
  protocolosTable, sugestoesTable, anamnesesTable, followupsTable, pagamentosTable, filasTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Iniciando seed PADCOM V9...");

  // Limpar dados existentes na ordem correta (respeitando FK)
  await db.execute(sql`TRUNCATE TABLE regras_motor RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE blocos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE sugestoes_clinicas RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE anamneses RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE followups RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE pagamentos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE filas_operacionais RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE itens_terapeuticos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE protocolos RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE pacientes RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE unidades RESTART IDENTITY CASCADE`);

  // =========================================================
  // 1. UNIDADES (EMPRESAS/UNIDADES tab)
  // =========================================================
  console.log("Inserindo unidades...");
  const [unidade1, unidade2] = await db.insert(unidadesTable).values([
    {
      nome: "Clinica Motor - Unidade Centro",
      endereco: "Av. Paulista, 1000",
      cidade: "Sao Paulo",
      estado: "SP",
      telefone: "(11) 91000-0001",
      ativa: true,
    },
    {
      nome: "Clinica Motor - Unidade Zona Sul",
      endereco: "Rua das Flores, 500",
      cidade: "Sao Paulo",
      estado: "SP",
      telefone: "(11) 91000-0002",
      ativa: true,
    },
  ]).returning();

  // =========================================================
  // 2. USUARIOS (PROFISSIONAIS tab)
  // =========================================================
  console.log("Inserindo usuarios...");
  const senhaHash = await bcrypt.hash("senha123", 10);

  const [uRafael, uAna, uCarlos, uMarina] = await db.insert(usuariosTable).values([
    {
      nome: "Rafael Souza",
      email: "rafael@clinica.com",
      senha: senhaHash,
      perfil: "validador_mestre",
      unidadeId: unidade1.id,
      ativo: true,
    },
    {
      nome: "Ana Lima",
      email: "ana@clinica.com",
      senha: senhaHash,
      perfil: "enfermeira",
      unidadeId: unidade1.id,
      ativo: true,
    },
    {
      nome: "Carlos Menezes",
      email: "carlos@clinica.com",
      senha: senhaHash,
      perfil: "validador_enfermeiro",
      unidadeId: unidade2.id,
      ativo: true,
    },
    {
      nome: "Marina Torres",
      email: "marina@clinica.com",
      senha: senhaHash,
      perfil: "medico_tecnico",
      unidadeId: unidade1.id,
      ativo: true,
    },
  ]).returning();

  // =========================================================
  // 3. PACIENTES (PACIENTES tab)
  // =========================================================
  console.log("Inserindo pacientes...");
  const [pac1, pac2, pac3] = await db.insert(pacientesTable).values([
    {
      nome: "Joao da Silva",
      cpf: "00000000001",
      dataNascimento: "1985-04-12",
      telefone: "(11) 99001-0001",
      email: "joao@email.com",
      unidadeId: unidade1.id,
      statusAtivo: true,
    },
    {
      nome: "Maria Oliveira",
      cpf: "00000000002",
      dataNascimento: "1990-08-25",
      telefone: "(11) 99001-0002",
      email: "maria@email.com",
      unidadeId: unidade1.id,
      statusAtivo: true,
    },
    {
      nome: "Pedro Costa",
      cpf: "00000000003",
      dataNascimento: "1978-01-30",
      telefone: "(11) 99001-0003",
      email: "pedro@email.com",
      unidadeId: unidade2.id,
      statusAtivo: true,
    },
  ]).returning();

  // =========================================================
  // 4. BLOCOS (MESTRA BLOCOS tab)
  // =========================================================
  console.log("Inserindo blocos PADCOM...");
  await db.insert(blocosTable).values([
    { codigoBloco: "BLK001", nomeBloco: "BLOCO BASE INTEGRATIVA", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "GERAL", totalItensMapeados: 44 },
    { codigoBloco: "BLK002", nomeBloco: "BLOCO TIREOIDE", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE AMPLIADA"], tipoMacro: "ENDOCRINO", totalItensMapeados: 21 },
    { codigoBloco: "BLK003", nomeBloco: "BLOCO GLICEMICO INSULINICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE AMPLIADA"], tipoMacro: "METABOLICO", totalItensMapeados: 11 },
    { codigoBloco: "BLK004", nomeBloco: "BLOCO HEPATICO ESPECIFICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "HEPATICO", totalItensMapeados: 8 },
    { codigoBloco: "BLK005", nomeBloco: "BLOCO LIPIDICO CARDIOMETABOLICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "CARDIOMETABOLICO", totalItensMapeados: 23 },
    { codigoBloco: "BLK006", nomeBloco: "BLOCO GONADAL", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "HORMONAL / UROGINECO", totalItensMapeados: 26 },
    { codigoBloco: "BLK007", nomeBloco: "BLOCO PROSTATA", usaGrade: true, grausDisponiveis: ["GRADE BASICA"], tipoMacro: "HORMONAL / UROGINECO", totalItensMapeados: 2 },
    { codigoBloco: "BLK008", nomeBloco: "BLOCO ADRENAL ESPECIFICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "ENDOCRINO", totalItensMapeados: 13 },
    { codigoBloco: "BLK009", nomeBloco: "BLOCO SALIVAR ADRENAL", usaGrade: true, grausDisponiveis: ["GRADE BASICA"], tipoMacro: "ENDOCRINO", totalItensMapeados: 4 },
    { codigoBloco: "BLK010", nomeBloco: "BLOCO DEFICIENCIA ABSORCAO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "NUTRICIONAL FUNCIONAL", totalItensMapeados: 9 },
    { codigoBloco: "BLK011", nomeBloco: "BLOCO TROMBOSE", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE AMPLIADA"], tipoMacro: "HEMATOLOGICO", totalItensMapeados: 17 },
    { codigoBloco: "BLK012", nomeBloco: "BLOCO COAGULOGRAMA", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA"], tipoMacro: "HEMATOLOGICO", totalItensMapeados: 5 },
    { codigoBloco: "BLK013", nomeBloco: "BLOCO MARCADORES CANCERIGENOS", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "ONCOLOGICO", totalItensMapeados: 20 },
    { codigoBloco: "BLK014", nomeBloco: "BLOCO RENAL ESPECIFICO", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "RENAL", totalItensMapeados: 9 },
    { codigoBloco: "BLK015", nomeBloco: "BLOCO GRAVIDEZ", usaGrade: true, grausDisponiveis: ["GRADE BASICA"], tipoMacro: "HORMONAL / UROGINECO", totalItensMapeados: 1 },
    { codigoBloco: "BLK016", nomeBloco: "BLOCO DST", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "INFECTOLOGICO", totalItensMapeados: 31 },
    { codigoBloco: "BLK017", nomeBloco: "BLOCO AUTOIMUNE", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "IMUNOLOGICO", totalItensMapeados: 23 },
    { codigoBloco: "BLK018", nomeBloco: "BLOCO GENETICA POLIMORFISMOS", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "GENETICA", totalItensMapeados: 17 },
    { codigoBloco: "BLK019", nomeBloco: "BLOCO FARMACOGENETICA", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "GENETICA", totalItensMapeados: 19 },
    { codigoBloco: "BLK020", nomeBloco: "BLOCO METAIS TOXICOS", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "TOXICOLOGICO", totalItensMapeados: 15 },
    { codigoBloco: "BLK021", nomeBloco: "BLOCO VITAMINAS", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "MICRONUTRIENTES", totalItensMapeados: 10 },
    { codigoBloco: "BLK022", nomeBloco: "BLOCO MINERAIS COFACTORES", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA", "GRADE SOFISTICADA"], tipoMacro: "MICRONUTRIENTES", totalItensMapeados: 12 },
    { codigoBloco: "BLK023", nomeBloco: "BLOCO SALIVAR HORMONAL", usaGrade: true, grausDisponiveis: ["GRADE BASICA"], tipoMacro: "GERAL", totalItensMapeados: 3 },
    { codigoBloco: "BLK024", nomeBloco: "BLOCO ULTRASSOM", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "IMAGEM", totalItensMapeados: 19 },
    { codigoBloco: "BLK025", nomeBloco: "BLOCO TOMOGRAFIA", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "IMAGEM", totalItensMapeados: 12 },
    { codigoBloco: "BLK026", nomeBloco: "BLOCO RESSONANCIA MAGNETICA", usaGrade: false, grausDisponiveis: ["SEM GRADE"], tipoMacro: "IMAGEM", totalItensMapeados: 12 },
    { codigoBloco: "BLK027", nomeBloco: "BLOCO CARDIOLOGIA", usaGrade: true, grausDisponiveis: ["GRADE BASICA", "GRADE INTERMEDIARIA"], tipoMacro: "CARDIOLOGICO", totalItensMapeados: 8 },
  ]);

  // =========================================================
  // 5. ITENS TERAPEUTICOS (FORMULAS MASTER + INJETAVEIS MASTER + BASE EXAMES)
  // =========================================================
  console.log("Inserindo itens terapeuticos PADCOM...");
  await db.insert(itensTerapeuticosTable).values([
    // --- FORMULAS MASTER ---
    {
      nome: "Formula Suporte Tireoide Modulacao Base",
      descricao: "Tirosina 500mg + Selenio 100mcg + Zinco 15mg + Magnesio 150mg. Via oral, capsula vegetal.",
      categoria: "formula",
      subCategoria: "Tireoide",
      codigoPadcom: "FORM TIRE MODU 001",
      areaSemantica: "TIRE",
      viaUso: "ORAL",
      frequenciaBase: "UMA DOSE AO DIA ANTES DO CAFE DA MANHA",
      composicao: "TIROSINA 500MG | SELENIO 100MCG | ZINCO 15MG | MAGNESIO 150MG",
      posologia: "1 capsula vegetal ao dia, antes do cafe da manha.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["tireoide", "hipotireoidismo", "modulacao", "hormonal", "metabolismo"],
    },
    {
      nome: "Formula Intestino Reparacao Fase 1",
      descricao: "Glutamina 5g + Zinco 30mg + Curcumina 500mg + Magnesio 150mg. Sache ou capsula.",
      categoria: "formula",
      subCategoria: "Intestino",
      codigoPadcom: "FORM INTE ATAQ 001",
      areaSemantica: "INTE",
      viaUso: "ORAL",
      frequenciaBase: "UMA DOSE ANTES DO CAFE DA MANHA E UMA ANTES DO JANTAR",
      composicao: "GLUTAMINA 5G | ZINCO 30MG | CURCUMINA 500MG | MAGNESIO 150MG",
      posologia: "1 dose antes do cafe da manha e 1 dose antes do jantar.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["intestino", "constipacao", "distensao", "reparacao", "digestao", "sii"],
    },
    {
      nome: "Formula Suporte Metabolico",
      descricao: "Carnitina 500mg + Cafeina 100mg + Cha Verde 300mg + Magnesio 150mg. Via oral, capsula.",
      categoria: "formula",
      subCategoria: "Metabolico",
      codigoPadcom: "FORM META SUPO 001",
      areaSemantica: "META",
      viaUso: "ORAL",
      frequenciaBase: "UMA DOSE PELA MANHA E UMA ANTES DO TREINO",
      composicao: "CARNITINA 500MG | CAFEINA 100MG | CHA VERDE 300MG | MAGNESIO 150MG",
      posologia: "1 capsula pela manha e 1 capsula antes do treino. Ajustar estimulantes conforme tolerancia.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["emagrecimento", "metabolismo", "energia", "ganho de peso", "obesidade", "queima de gordura"],
    },
    {
      nome: "Formula Reposicao Mineral Base",
      descricao: "Magnesio 200mg + Zinco 15mg + Selenio 100mcg + Cromo 200mcg. Via oral, capsula.",
      categoria: "formula",
      subCategoria: "Mineral",
      codigoPadcom: "FORM MINE REPO 001",
      areaSemantica: "MINE",
      viaUso: "ORAL",
      frequenciaBase: "UMA DOSE A NOITE",
      composicao: "MAGNESIO 200MG | ZINCO 15MG | SELENIO 100MCG | CROMO 200MCG",
      posologia: "1 capsula a noite, apos jantar.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["mineral", "deficiencia", "absorcao", "fadiga", "carencia"],
    },
    {
      nome: "Formula Suporte Energetico Mitocondrial",
      descricao: "Coenzima Q10 100mg + Ribose 1g + Acetil L-Carnitina 500mg + Vitamina B2 20mg.",
      categoria: "formula",
      subCategoria: "Energia",
      codigoPadcom: "FORM MITO SUPO 001",
      areaSemantica: "MITO",
      viaUso: "ORAL",
      frequenciaBase: "UMA DOSE PELA MANHA",
      composicao: "COENZIMA Q10 100MG | RIBOSE 1G | ACETIL L-CARNITINA 500MG | VITAMINA B2 20MG",
      posologia: "1 capsula pela manha, em jejum ou com cafe da manha leve.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["fadiga", "energia", "cansaco", "mitocondrial", "performance", "exaustao"],
    },
    {
      nome: "Formula Suporte Hormonal Feminino",
      descricao: "Vitex 250mg + Zinco 15mg + Vitamina B6 50mg + Magnesio 200mg.",
      categoria: "formula",
      subCategoria: "Hormonal",
      codigoPadcom: "FORM HORM FEMI 001",
      areaSemantica: "HORM",
      viaUso: "ORAL",
      frequenciaBase: "UMA DOSE AO DIA",
      composicao: "VITEX 250MG | ZINCO 15MG | VITAMINA B6 50MG | MAGNESIO 200MG",
      posologia: "1 capsula ao dia, preferencialmente pela manha.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["hormonal", "tpm", "ciclo menstrual", "sindrome do ovario policistico", "endometriose", "feminino"],
    },
    {
      nome: "Formula Suporte Adrenal Estresse",
      descricao: "Ashwagandha 300mg + Rhodiola 200mg + Vitamina C 500mg + Vitamina B5 100mg.",
      categoria: "formula",
      subCategoria: "Adrenal",
      codigoPadcom: "FORM ADRE ADAP 001",
      areaSemantica: "ADRE",
      viaUso: "ORAL",
      frequenciaBase: "UMA DOSE AO DIA",
      composicao: "ASHWAGANDHA 300MG | RHODIOLA 200MG | VITAMINA C 500MG | VITAMINA B5 100MG",
      posologia: "1 capsula ao dia. Para estresse cronico e fadiga adrenal.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["estresse", "cortisol", "adrenal", "ansiedade", "insonia", "burnout"],
    },

    // --- INJETAVEIS MASTER ---
    {
      nome: "B12 com Complexo B Injetavel",
      descricao: "Metilcobalamina + Complexo B. Via intramuscular. Indicado para energia e suporte metabolico.",
      categoria: "injetavel_im",
      subCategoria: "Vitaminas",
      codigoPadcom: "INJE META B12C 001",
      areaSemantica: "META",
      viaUso: "IM",
      frequenciaBase: "SEMANAL",
      composicao: "METILCOBALAMINA + COMPLEXO B",
      posologia: "1 aplicacao semanal via intramuscular. Ciclo de 4 a 8 semanas.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["fadiga", "energia", "b12", "metabolismo", "vitamina", "injetavel"],
    },
    {
      nome: "Vitamina C Injetavel IV",
      descricao: "Vitamina C em alta dose. Via intravenosa. Suporte imunologico e antioxidante.",
      categoria: "injetavel_ev",
      subCategoria: "Imunologia",
      codigoPadcom: "INJE IMUN VITC 001",
      areaSemantica: "IMUN",
      viaUso: "IV",
      frequenciaBase: "SEMANAL",
      composicao: "VITAMINA C",
      posologia: "1 aplicacao semanal via intravenosa. Dose conforme avaliacao clinica.",
      disponivel: true,
      exigeValidacaoHumana: true,
      tags: ["imunidade", "imunologico", "vitamina c", "antioxidante", "infeccao"],
    },
    {
      nome: "MIC Injetavel - Lipolise",
      descricao: "Metionina + Inositol + Colina. Via intramuscular. Lipolise e suporte hepatico.",
      categoria: "injetavel_im",
      subCategoria: "Metabolico",
      codigoPadcom: "INJE META MICR 001",
      areaSemantica: "META",
      viaUso: "IM",
      frequenciaBase: "SEMANAL",
      composicao: "METIONINA + INOSITOL + COLINA",
      posologia: "1 aplicacao semanal via intramuscular. Ciclo de 8 semanas.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["emagrecimento", "lipolise", "gordura", "hepatico", "metabolismo"],
    },
    {
      nome: "L-Carnitina Injetavel",
      descricao: "L-Carnitina. Via intramuscular. Suporte metabolico e queima de gordura.",
      categoria: "injetavel_im",
      subCategoria: "Metabolico",
      codigoPadcom: "INJE META LCAR 001",
      areaSemantica: "META",
      viaUso: "IM",
      frequenciaBase: "SEMANAL",
      composicao: "L-CARNITINA",
      posologia: "1 aplicacao semanal via intramuscular.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["energia", "emagrecimento", "performance", "metabolismo", "carnitina"],
    },
    {
      nome: "Reposicao Vitaminica Injetavel Base",
      descricao: "Complexo multivitaminico injetavel. Via intramuscular. Reposicao geral.",
      categoria: "injetavel_im",
      subCategoria: "Vitaminas",
      codigoPadcom: "INJE VITA REPO 001",
      areaSemantica: "VITA",
      viaUso: "IM",
      frequenciaBase: "SEMANAL",
      composicao: "COMPLEXO MULTIVITAMINICO",
      posologia: "1 aplicacao semanal via intramuscular.",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["vitamina", "reposicao", "deficiencia", "carencia", "nutricional"],
    },

    // --- IMPLANTES ---
    {
      nome: "Implante Hormonal Modulacao Base",
      descricao: "Implante subdermal para modulacao hormonal. Procedimento medico obrigatorio.",
      categoria: "implante",
      subCategoria: "Hormonal",
      codigoPadcom: "IMPL HORM MODU 001",
      areaSemantica: "HORM",
      viaUso: "SUBDERMAL",
      frequenciaBase: "A CADA 180 DIAS",
      composicao: "HORMONIO BIOIDENTICO CONFORME AVALIACAO",
      posologia: "Implante subdermal a cada 180 dias. Obrigatorio avaliacao medica previa.",
      disponivel: true,
      exigeValidacaoHumana: true,
      tags: ["hormonal", "implante", "menopausa", "andropausa", "modulacao", "testosterone", "estrogeno"],
    },
    {
      nome: "Implante Ginecologico Modulacao",
      descricao: "Implante hormonal ginecologico para modulacao. Indicado para endometriose.",
      categoria: "implante",
      subCategoria: "Ginecologico",
      codigoPadcom: "IMPL GINE MODU 001",
      areaSemantica: "GINE",
      viaUso: "SUBDERMAL",
      frequenciaBase: "A CADA 180 DIAS",
      composicao: "HORMONIO BIOIDENTICO GINECOLOGICO",
      posologia: "Implante a cada 180 dias. Obrigatorio avaliacao medica ginecologica.",
      disponivel: true,
      exigeValidacaoHumana: true,
      tags: ["ginecologico", "endometriose", "hormonal", "implante", "feminino"],
    },

    // --- EXAMES (BASE EXAMES MOTOR — amostra representativa) ---
    {
      nome: "Bloco Base Integrativa - Grade Basica",
      descricao: "Hemograma, Vitamina D, Vitamina B12, Ferritina, Ferro Serico, HbA1c, TGO, TGP, Gama GT, FA, Amilase, Bilirrubinas, Ureia, Creatinina.",
      categoria: "exame",
      subCategoria: "LABORATORIAL",
      codigoPadcom: "EXAM BASE BASI 001",
      blocoId: "BLK001",
      grau: "GRADE BASICA",
      areaSemantica: "BASE",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["check up", "avaliacao geral", "base", "laboratorial", "rastreio"],
    },
    {
      nome: "Bloco Base Integrativa - Grade Intermediaria",
      descricao: "Todos os itens da grade basica + Tipagem sanguinea ABO Rh, PCR us, Homocisteina, Acido Urico.",
      categoria: "exame",
      subCategoria: "LABORATORIAL",
      codigoPadcom: "EXAM BASE INTE 001",
      blocoId: "BLK001",
      grau: "GRADE INTERMEDIARIA",
      areaSemantica: "BASE",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["check up", "avaliacao geral", "intermediario", "laboratorial"],
    },
    {
      nome: "Bloco Tireoide - Grade Basica",
      descricao: "TSH, T4 Livre.",
      categoria: "exame",
      subCategoria: "ENDOCRINO",
      codigoPadcom: "EXAM TIRE BASI 001",
      blocoId: "BLK002",
      grau: "GRADE BASICA",
      areaSemantica: "TIRE",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["tireoide", "hipotireoidismo", "hipertireoidismo", "tsh", "t4"],
    },
    {
      nome: "Bloco Tireoide - Grade Intermediaria",
      descricao: "TSH, T4 Livre, T3 Livre, Anti-TPO, Anti-Tireoglobulina.",
      categoria: "exame",
      subCategoria: "ENDOCRINO",
      codigoPadcom: "EXAM TIRE INTE 001",
      blocoId: "BLK002",
      grau: "GRADE INTERMEDIARIA",
      areaSemantica: "TIRE",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["tireoide", "hipotireoidismo", "hashimoto", "autoimune", "tsh", "t3", "t4"],
    },
    {
      nome: "Bloco Tireoide - Grade Ampliada",
      descricao: "TSH, T4 Livre, T3 Livre, T3 Reverso, Anti-TPO, Anti-Tireoglobulina, Iodo Urinario.",
      categoria: "exame",
      subCategoria: "ENDOCRINO",
      codigoPadcom: "EXAM TIRE AMPL 001",
      blocoId: "BLK002",
      grau: "GRADE AMPLIADA",
      areaSemantica: "TIRE",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["tireoide", "hipotireoidismo", "hashimoto", "tsh", "t3", "t4", "iodo", "avancado"],
    },
    {
      nome: "Bloco Glicemico Insulinico - Grade Basica",
      descricao: "Glicemia de Jejum, Insulina de Jejum, Hemoglobina Glicada.",
      categoria: "exame",
      subCategoria: "METABOLICO",
      codigoPadcom: "EXAM GLIC BASI 001",
      blocoId: "BLK003",
      grau: "GRADE BASICA",
      areaSemantica: "GLIC",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["diabetes", "glicemia", "insulina", "resistencia insulinica", "metabolismo"],
    },
    {
      nome: "Bloco Lipidico Cardiometabolico - Grade Basica",
      descricao: "Colesterol Total, LDL, HDL, Triglicerideos, VLDL.",
      categoria: "exame",
      subCategoria: "CARDIOMETABOLICO",
      codigoPadcom: "EXAM LIPI BASI 001",
      blocoId: "BLK005",
      grau: "GRADE BASICA",
      areaSemantica: "LIPI",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["colesterol", "triglicerideos", "cardiovascular", "lipidico", "infarto"],
    },
    {
      nome: "Bloco Gonadal - Grade Basica",
      descricao: "FSH, LH, Estradiol, Progesterona, Testosterona Total.",
      categoria: "exame",
      subCategoria: "HORMONAL",
      codigoPadcom: "EXAM GONA BASI 001",
      blocoId: "BLK006",
      grau: "GRADE BASICA",
      areaSemantica: "GONA",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["hormonal", "menopausa", "andropausa", "libido", "testosterone", "estrogeno", "ciclo"],
    },
    {
      nome: "Bloco Adrenal Especifico - Grade Basica",
      descricao: "Cortisol Matinal, DHEA-S, Cortisol Noturno.",
      categoria: "exame",
      subCategoria: "ENDOCRINO",
      codigoPadcom: "EXAM ADRE BASI 001",
      blocoId: "BLK008",
      grau: "GRADE BASICA",
      areaSemantica: "ADRE",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["adrenal", "cortisol", "estresse", "fadiga adrenal", "burnout"],
    },
    {
      nome: "Bloco Vitaminas - Grade Basica",
      descricao: "Vitamina D, Vitamina B12, Folato, Vitamina B6.",
      categoria: "exame",
      subCategoria: "MICRONUTRIENTES",
      codigoPadcom: "EXAM VITA BASI 001",
      blocoId: "BLK021",
      grau: "GRADE BASICA",
      areaSemantica: "VITA",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["vitamina", "deficiencia", "b12", "vitamina d", "folato", "carencia"],
    },
    {
      nome: "Bloco Autoimune - Grade Basica",
      descricao: "FAN, Anti-DNA, FR, Anti-CCP.",
      categoria: "exame",
      subCategoria: "IMUNOLOGICO",
      codigoPadcom: "EXAM AUTO BASI 001",
      blocoId: "BLK017",
      grau: "GRADE BASICA",
      areaSemantica: "AUTO",
      disponivel: true,
      exigeValidacaoHumana: true,
      tags: ["autoimune", "lupus", "artrite", "hashimoto", "imunologico"],
    },

    // --- PROTOCOLOS ---
    {
      nome: "Protocolo Metabolico Base",
      descricao: "Protocolo para emagrecimento e energia. Inclui exames metabolicos, formula suporte e plano mensal.",
      categoria: "protocolo",
      subCategoria: "Metabolico",
      codigoPadcom: "PROC META BASE 001",
      areaSemantica: "META",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["emagrecimento", "energia", "metabolismo", "protocolo", "ganho de peso"],
    },
    {
      nome: "Protocolo Intestino Base",
      descricao: "Protocolo para reparacao intestinal faseada. Inclui formula intestinal e exames base.",
      categoria: "protocolo",
      subCategoria: "Intestino",
      codigoPadcom: "PROC INTE BASE 001",
      areaSemantica: "INTE",
      disponivel: true,
      exigeValidacaoHumana: false,
      tags: ["intestino", "constipacao", "sii", "reparacao", "protocolo"],
    },
    {
      nome: "Protocolo Hormonal Modulacao",
      descricao: "Protocolo completo de modulacao hormonal. Premium. Inclui exames hormonais, formula e opcao de implante.",
      categoria: "protocolo",
      subCategoria: "Hormonal",
      codigoPadcom: "PROC HORM MODU 001",
      areaSemantica: "HORM",
      disponivel: true,
      exigeValidacaoHumana: true,
      tags: ["hormonal", "menopausa", "andropausa", "implante", "modulacao", "protocolo premium"],
    },
  ]);

  // =========================================================
  // 6. REGRAS DO MOTOR (REGRAS DE EXAMES + FORMULAS + INJETAVEIS + IMPLANTES)
  // =========================================================
  console.log("Inserindo regras do motor PADCOM...");
  await db.insert(regrasMotorTable).values([
    // REGRAS DE EXAMES
    { regraId: "MRE001", perguntaId: "Q012", palavraChave: "FADIGA", segmento: "exame", codigoReferencia: "EXAM TIRE BASI 001", blocoReferencia: "BLK002", prioridade: "alta", observacao: "Sugerir bloco tireoide e eixo hormonal" },
    { regraId: "MRE002", perguntaId: "Q012", palavraChave: "CONSTIPACAO", segmento: "exame", codigoReferencia: "EXAM BASE BASI 001", blocoReferencia: "BLK001", prioridade: "media", observacao: "Sugerir exames digestivos e carencias" },
    { regraId: "MRE003", perguntaId: "Q013", palavraChave: "HIPOTIREOIDISMO", segmento: "exame", codigoReferencia: "EXAM TIRE INTE 001", blocoReferencia: "BLK002", prioridade: "alta", observacao: "Rever funcao tireoidiana com grade intermediaria" },
    { regraId: "MRE004", perguntaId: "Q014", palavraChave: "INFARTO", segmento: "exame", codigoReferencia: "EXAM LIPI BASI 001", blocoReferencia: "BLK005", prioridade: "alta", observacao: "Reforcar cardiometabolico" },
    { regraId: "MRE005", perguntaId: "Q012", palavraChave: "INSONIA", segmento: "exame", codigoReferencia: "EXAM ADRE BASI 001", blocoReferencia: "BLK008", prioridade: "media", observacao: "Avaliar eixo adrenal e cortisol" },
    { regraId: "MRE006", perguntaId: "Q012", palavraChave: "GANHO DE PESO", segmento: "exame", codigoReferencia: "EXAM GLIC BASI 001", blocoReferencia: "BLK003", prioridade: "alta", observacao: "Avaliar resistencia insulinica e metabolismo" },
    { regraId: "MRE007", perguntaId: "Q013", palavraChave: "DIABETES", segmento: "exame", codigoReferencia: "EXAM GLIC BASI 001", blocoReferencia: "BLK003", prioridade: "alta", observacao: "Monitorar glicemia e insulina" },
    { regraId: "MRE008", perguntaId: "Q013", palavraChave: "HASHIMOTO", segmento: "exame", codigoReferencia: "EXAM TIRE AMPL 001", blocoReferencia: "BLK002", prioridade: "alta", observacao: "Grade ampliada com anticorpos tireoidianos" },
    { regraId: "MRE009", perguntaId: "Q012", palavraChave: "CANSACO", segmento: "exame", codigoReferencia: "EXAM VITA BASI 001", blocoReferencia: "BLK021", prioridade: "media", observacao: "Avaliar deficiencias vitaminicas" },
    { regraId: "MRE010", perguntaId: "Q012", palavraChave: "QUEDA DE CABELO", segmento: "exame", codigoReferencia: "EXAM TIRE BASI 001", blocoReferencia: "BLK002", prioridade: "alta", observacao: "Avaliar tireoide e hormonios" },
    { regraId: "MRE011", perguntaId: "Q010", palavraChave: "EMAGRECIMENTO", segmento: "exame", codigoReferencia: "EXAM GLIC BASI 001", blocoReferencia: "BLK003", prioridade: "alta", observacao: "Base glicemica para programa metabolico" },
    { regraId: "MRE012", perguntaId: "Q013", palavraChave: "ENDOMETRIOSE", segmento: "exame", codigoReferencia: "EXAM GONA BASI 001", blocoReferencia: "BLK006", prioridade: "alta", observacao: "Avaliacao hormonal ginecologica" },
    { regraId: "MRE013", perguntaId: "Q012", palavraChave: "ANSIEDADE", segmento: "exame", codigoReferencia: "EXAM ADRE BASI 001", blocoReferencia: "BLK008", prioridade: "media", observacao: "Avaliar cortisol e eixo adrenal" },
    { regraId: "MRE014", perguntaId: "Q030", palavraChave: "NAO", segmento: "exame", codigoReferencia: "EXAM BASE BASI 001", blocoReferencia: "BLK001", prioridade: "baixa", observacao: "Preferencia por somente exames — bloco base" },

    // REGRAS DE FORMULAS
    { regraId: "MRF001", perguntaId: "Q012", palavraChave: "FADIGA", segmento: "formula", codigoReferencia: "FORM MITO SUPO 001", prioridade: "alta", observacao: "Suporte energetico mitocondrial inicial" },
    { regraId: "MRF002", perguntaId: "Q012", palavraChave: "CONSTIPACAO", segmento: "formula", codigoReferencia: "FORM INTE ATAQ 001", prioridade: "alta", observacao: "Reparacao intestinal fase 1" },
    { regraId: "MRF003", perguntaId: "Q013", palavraChave: "HIPOTIREOIDISMO", segmento: "formula", codigoReferencia: "FORM TIRE MODU 001", prioridade: "alta", observacao: "Suporte modular tireoide" },
    { regraId: "MRF004", perguntaId: "Q010", palavraChave: "GANHO DE PESO", segmento: "formula", codigoReferencia: "FORM META SUPO 001", prioridade: "media", observacao: "Suporte metabolico e emagrecimento" },
    { regraId: "MRF005", perguntaId: "Q012", palavraChave: "INSONIA", segmento: "formula", codigoReferencia: "FORM ADRE ADAP 001", prioridade: "media", observacao: "Adaptogenicos para estresse e insonia" },
    { regraId: "MRF006", perguntaId: "Q012", palavraChave: "ANSIEDADE", segmento: "formula", codigoReferencia: "FORM ADRE ADAP 001", prioridade: "alta", observacao: "Suporte adrenal e adaptogenicos" },
    { regraId: "MRF007", perguntaId: "Q012", palavraChave: "CANSACO", segmento: "formula", codigoReferencia: "FORM MINE REPO 001", prioridade: "media", observacao: "Reposicao mineral para cansaco" },
    { regraId: "MRF008", perguntaId: "Q013", palavraChave: "ENDOMETRIOSE", segmento: "formula", codigoReferencia: "FORM HORM FEMI 001", prioridade: "alta", observacao: "Suporte hormonal feminino" },
    { regraId: "MRF009", perguntaId: "Q013", palavraChave: "SINDROME DO OVARIO POLICISTICO", segmento: "formula", codigoReferencia: "FORM HORM FEMI 001", prioridade: "alta", observacao: "Regulacao hormonal feminina" },
    { regraId: "MRF010", perguntaId: "Q012", palavraChave: "QUEDA DE CABELO", segmento: "formula", codigoReferencia: "FORM MINE REPO 001", prioridade: "media", observacao: "Reposicao mineral para queda de cabelo" },

    // REGRAS DE INJETAVEIS
    { regraId: "MRI001", perguntaId: "Q031", palavraChave: "SIM", segmento: "injetavel", codigoReferencia: "INJE VITA REPO 001", prioridade: "media", observacao: "Aceita protocolo injetavel — reposicao vitaminica base" },
    { regraId: "MRI002", perguntaId: "Q012", palavraChave: "FADIGA", segmento: "injetavel", codigoReferencia: "INJE META B12C 001", prioridade: "media", observacao: "B12 injetavel para fadiga e energia" },
    { regraId: "MRI003", perguntaId: "Q010", palavraChave: "EMAGRECIMENTO", segmento: "injetavel", codigoReferencia: "INJE META MICR 001", prioridade: "media", observacao: "MIC para lipolise no emagrecimento" },
    { regraId: "MRI004", perguntaId: "Q012", palavraChave: "GANHO DE PESO", segmento: "injetavel", codigoReferencia: "INJE META LCAR 001", prioridade: "media", observacao: "L-Carnitina para metabolismo e queima de gordura" },

    // REGRAS DE IMPLANTES
    { regraId: "MRI_IMP001", perguntaId: "Q033", palavraChave: "SIM", segmento: "implante", codigoReferencia: "IMPL HORM MODU 001", prioridade: "media", observacao: "Implante somente se preferencia positiva" },
    { regraId: "MRI_IMP002", perguntaId: "Q013", palavraChave: "ENDOMETRIOSE", segmento: "implante", codigoReferencia: "IMPL GINE MODU 001", prioridade: "media", observacao: "Encaixe para endometriose se aceitar implante" },
  ]);

  // =========================================================
  // 7. PROTOCOLOS (PROTOCOLOS MASTER)
  // =========================================================
  console.log("Inserindo protocolos...");
  await db.insert(protocolosTable).values([
    {
      nome: "Protocolo Metabolico Base",
      descricao: "Emagrecimento e energia. Fase 1 (0-30d): Exames + Formula + Pagamento. Fase 2 (31-60d): Follow-up + Nova Liberacao.",
      categoria: "META",
      itens: {
        codigoPadcom: "PROC META BASE 001",
        fases: [
          { fase: "FASE 1", diaInicio: 0, diaFim: 30, marco: "INICIO", acoes: ["EXAMES METABOLICOS", "FORM META SUPO 001", "PAGAMENTO MENSAL"] },
          { fase: "FASE 2", diaInicio: 31, diaFim: 60, marco: "REAVALIACAO", acoes: ["FOLLOW UP", "NOVA LIBERACAO"] },
        ],
      },
      ativo: true,
    },
    {
      nome: "Protocolo Intestino Base",
      descricao: "Reparacao intestinal faseada. Fase 1 (0-21d): Formula + Exames. Fase 2 (22-60d): Ajuste e Follow-up.",
      categoria: "INTE",
      itens: {
        codigoPadcom: "PROC INTE BASE 001",
        fases: [
          { fase: "FASE 1", diaInicio: 0, diaFim: 21, marco: "ATAQUE", acoes: ["FORM INTE ATAQ 001", "EXAMES BASE"] },
          { fase: "FASE 2", diaInicio: 22, diaFim: 60, marco: "MANUTENCAO", acoes: ["AJUSTE", "FOLLOW UP"] },
        ],
      },
      ativo: true,
    },
    {
      nome: "Protocolo Hormonal Modulacao Premium",
      descricao: "Modulacao hormonal completa. Fase 1 (0-30d): Exames Hormonais e Decisao. Fase 2 (31-180d): Implante ou Prescricao + Follow-up.",
      categoria: "HORM",
      itens: {
        codigoPadcom: "PROC HORM MODU 001",
        fases: [
          { fase: "FASE 1", diaInicio: 0, diaFim: 30, marco: "AVALIACAO", acoes: ["EXAMES HORMONAIS", "DECISAO CLINICA"] },
          { fase: "FASE 2", diaInicio: 31, diaFim: 180, marco: "SEGUIMENTO", acoes: ["IMPLANTE OU PRESCRICAO", "FOLLOW UP"] },
        ],
      },
      ativo: true,
    },
  ]);

  // =========================================================
  // 8. ANAMNESES E SUGESTOES (exemplos reais para demo)
  // =========================================================
  console.log("Inserindo anamneses de demonstracao...");
  const [anam1] = await db.insert(anamnesesTable).values([
    {
      pacienteId: pac1.id,
      status: "concluida",
      respostasClincias: {
        Q010: "Fadiga cronica e ganho de peso",
        Q011: "6 meses",
        Q012: ["FADIGA", "GANHO DE PESO", "INSONIA"],
        Q013: ["HIPOTIREOIDISMO"],
        Q014: ["DIABETES"],
        Q015: "",
        Q016: "",
        Q017: "Lactose",
      },
      respostasPreferencias: {
        Q030: "NAO",
        Q031: "SIM",
        Q032: "SIM",
        Q033: "NAO",
      },
      respostasFinanceiras: {
        Q040: "MENSAL",
        Q041: "INTERMEDIARIO",
      },
      sinaisSemanticos: ["FADIGA", "GANHO DE PESO", "INSONIA", "HIPOTIREOIDISMO"],
      motorAtivadoEm: new Date(),
    },
  ]).returning();

  const [anam2] = await db.insert(anamnesesTable).values([
    {
      pacienteId: pac2.id,
      status: "validada",
      respostasClincias: {
        Q010: "Queda de cabelo e ansiedade",
        Q011: "3 meses",
        Q012: ["ANSIEDADE", "QUEDA DE CABELO", "FADIGA"],
        Q013: ["HASHIMOTO", "ENDOMETRIOSE"],
        Q014: [],
        Q015: "",
        Q016: "",
        Q017: "",
      },
      respostasPreferencias: {
        Q030: "NAO",
        Q031: "SIM",
        Q032: "NAO",
        Q033: "SIM",
      },
      respostasFinanceiras: {
        Q040: "PARCELADO",
        Q041: "PREMIUM",
      },
      sinaisSemanticos: ["ANSIEDADE", "QUEDA DE CABELO", "FADIGA", "HASHIMOTO", "ENDOMETRIOSE"],
      motorAtivadoEm: new Date(),
    },
  ]).returning();

  // Buscar itens para vincular sugestoes
  const itens = await db.select().from(itensTerapeuticosTable);
  const findItem = (cod: string) => itens.find(i => i.codigoPadcom === cod);

  await db.insert(sugestoesTable).values([
    // Sugestoes para Joao (fadiga + hipotireoidismo + ganho de peso)
    {
      anamneseId: anam1.id,
      pacienteId: pac1.id,
      tipo: "exame",
      itemTerapeuticoId: findItem("EXAM TIRE BASI 001")?.id,
      itemNome: "Bloco Tireoide - Grade Basica",
      itemDescricao: "TSH, T4 Livre - base para hipotireoidismo",
      justificativa: "Regra MRE001: Sintoma FADIGA -> Bloco Tireoide. Regra MRE003: Diagnostico HIPOTIREOIDISMO -> Avaliacao tireoidiana.",
      prioridade: "alta",
      status: "validado",
      validadoPorId: uRafael.id,
      validadoEm: new Date(),
      observacaoValidacao: "Confirmado para paciente com hipotireoidismo diagnosticado.",
    },
    {
      anamneseId: anam1.id,
      pacienteId: pac1.id,
      tipo: "exame",
      itemTerapeuticoId: findItem("EXAM GLIC BASI 001")?.id,
      itemNome: "Bloco Glicemico Insulinico - Grade Basica",
      itemDescricao: "Glicemia de Jejum, Insulina, HbA1c - metabolismo",
      justificativa: "Regra MRE006: Sintoma GANHO DE PESO -> Bloco Glicemico. Historico familiar: DIABETES.",
      prioridade: "alta",
      status: "pendente",
    },
    {
      anamneseId: anam1.id,
      pacienteId: pac1.id,
      tipo: "formula",
      itemTerapeuticoId: findItem("FORM TIRE MODU 001")?.id,
      itemNome: "Formula Suporte Tireoide Modulacao Base",
      itemDescricao: "Tirosina + Selenio + Zinco + Magnesio",
      justificativa: "Regra MRF003: Diagnostico HIPOTIREOIDISMO -> Formula Suporte Tireoide.",
      prioridade: "alta",
      status: "pendente",
    },
    {
      anamneseId: anam1.id,
      pacienteId: pac1.id,
      tipo: "formula",
      itemTerapeuticoId: findItem("FORM MITO SUPO 001")?.id,
      itemNome: "Formula Suporte Energetico Mitocondrial",
      itemDescricao: "CoQ10 + Ribose + Acetil L-Carnitina + B2",
      justificativa: "Regra MRF001: Sintoma FADIGA -> Suporte energetico mitocondrial.",
      prioridade: "alta",
      status: "pendente",
    },
    {
      anamneseId: anam1.id,
      pacienteId: pac1.id,
      tipo: "injetavel_im",
      itemTerapeuticoId: findItem("INJE META B12C 001")?.id,
      itemNome: "B12 com Complexo B Injetavel",
      itemDescricao: "Metilcobalamina + Complexo B via IM",
      justificativa: "Regra MRI002: Sintoma FADIGA + aceita injetavel -> B12 IM semanal.",
      prioridade: "media",
      status: "pendente",
    },

    // Sugestoes para Maria (ansiedade + hashimoto + endometriose)
    {
      anamneseId: anam2.id,
      pacienteId: pac2.id,
      tipo: "exame",
      itemTerapeuticoId: findItem("EXAM TIRE AMPL 001")?.id,
      itemNome: "Bloco Tireoide - Grade Ampliada",
      itemDescricao: "TSH, T4, T3, T3 Reverso, Anti-TPO, Anti-TG, Iodo",
      justificativa: "Regra MRE008: Diagnostico HASHIMOTO -> Grade Ampliada com anticorpos.",
      prioridade: "alta",
      status: "validado",
      validadoPorId: uRafael.id,
      validadoEm: new Date(),
    },
    {
      anamneseId: anam2.id,
      pacienteId: pac2.id,
      tipo: "exame",
      itemTerapeuticoId: findItem("EXAM GONA BASI 001")?.id,
      itemNome: "Bloco Gonadal - Grade Basica",
      itemDescricao: "FSH, LH, Estradiol, Progesterona, Testosterona",
      justificativa: "Regra MRE012: Diagnostico ENDOMETRIOSE -> Avaliacao hormonal ginecologica.",
      prioridade: "alta",
      status: "validado",
      validadoPorId: uRafael.id,
      validadoEm: new Date(),
    },
    {
      anamneseId: anam2.id,
      pacienteId: pac2.id,
      tipo: "formula",
      itemTerapeuticoId: findItem("FORM ADRE ADAP 001")?.id,
      itemNome: "Formula Suporte Adrenal Estresse",
      itemDescricao: "Ashwagandha + Rhodiola + Vitamina C + B5",
      justificativa: "Regra MRF006: Sintoma ANSIEDADE -> Adaptogenicos para estresse e ansiedade.",
      prioridade: "alta",
      status: "em_execucao",
    },
    {
      anamneseId: anam2.id,
      pacienteId: pac2.id,
      tipo: "formula",
      itemTerapeuticoId: findItem("FORM HORM FEMI 001")?.id,
      itemNome: "Formula Suporte Hormonal Feminino",
      itemDescricao: "Vitex + Zinco + Vitamina B6 + Magnesio",
      justificativa: "Regra MRF008: Diagnostico ENDOMETRIOSE -> Suporte hormonal feminino.",
      prioridade: "alta",
      status: "pendente",
    },
    {
      anamneseId: anam2.id,
      pacienteId: pac2.id,
      tipo: "implante",
      itemTerapeuticoId: findItem("IMPL GINE MODU 001")?.id,
      itemNome: "Implante Ginecologico Modulacao",
      itemDescricao: "Implante hormonal para endometriose",
      justificativa: "Regra MRI_IMP002: Diagnostico ENDOMETRIOSE + aceita implante (Q033=SIM).",
      prioridade: "media",
      status: "pendente",
    },
  ]);

  // =========================================================
  // 9. FILAS DE TRABALHO
  // =========================================================
  console.log("Inserindo filas...");
  await db.insert(filasTable).values([
    {
      tipo: "anamnese",
      pacienteId: pac1.id,
      unidadeId: unidade1.id,
      status: "aguardando",
      prioridade: "alta",
      descricao: "Joao da Silva — Anamnese concluida, aguardando triagem enfermeira",
      responsavelId: uAna.id,
    },
    {
      tipo: "validacao",
      pacienteId: pac1.id,
      unidadeId: unidade1.id,
      status: "aguardando",
      prioridade: "alta",
      descricao: "Joao da Silva — Sugestoes aguardando validacao medica",
      responsavelId: uCarlos.id,
    },
    {
      tipo: "procedimento",
      pacienteId: pac2.id,
      unidadeId: unidade1.id,
      status: "aguardando",
      prioridade: "media",
      descricao: "Maria Oliveira — Formula adrenal liberada, aguardando execucao",
      responsavelId: uMarina.id,
    },
    {
      tipo: "anamnese",
      pacienteId: pac3.id,
      unidadeId: unidade2.id,
      status: "aguardando",
      prioridade: "media",
      descricao: "Pedro Costa — Novo paciente, aguardando triagem",
    },
  ]);

  // =========================================================
  // 10. FOLLOW-UPS (FOLLOW UP MASTER)
  // =========================================================
  console.log("Inserindo follow-ups...");
  const now = new Date();
  await db.insert(followupsTable).values([
    {
      pacienteId: pac1.id,
      unidadeId: unidade1.id,
      tipo: "consulta",
      status: "agendado",
      dataAgendada: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      observacoes: "FOLL EXAM SEGU 001: Rever resultados apos 30 dias e necessidade de repeticao.",
      recorrencia: "mensal",
      responsavelId: uMarina.id,
    },
    {
      pacienteId: pac2.id,
      unidadeId: unidade1.id,
      tipo: "consulta",
      status: "agendado",
      dataAgendada: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      observacoes: "FOLL FORM SEGU 001: Confirmar aderencia e tolerancia da formula adrenal.",
      recorrencia: "quinzenal",
      responsavelId: uMarina.id,
    },
    {
      pacienteId: pac1.id,
      unidadeId: unidade1.id,
      tipo: "procedimento",
      status: "agendado",
      dataAgendada: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      observacoes: "FOLL INJE SEGU 001: Proxima aplicacao B12 IM - confirmar resposta.",
      recorrencia: "semanal",
      responsavelId: uAna.id,
    },
  ]);

  // =========================================================
  // 11. PAGAMENTOS
  // =========================================================
  console.log("Inserindo pagamentos...");
  await db.insert(pagamentosTable).values([
    {
      pacienteId: pac1.id,
      unidadeId: unidade1.id,
      valor: 450.00,
      status: "pago",
      formaPagamento: "pix",
      descricao: "PAGA META MENSAL 001 - Plano Metabolico Mensal",
      paguEm: new Date(),
    },
    {
      pacienteId: pac2.id,
      unidadeId: unidade1.id,
      valor: 1200.00,
      status: "pendente",
      formaPagamento: "cartao_credito",
      descricao: "PAGA HORM PREMIUM 001 - Plano Hormonal Premium (entrada)",
    },
    {
      pacienteId: pac3.id,
      unidadeId: unidade2.id,
      valor: 280.00,
      status: "pendente",
      formaPagamento: "pix",
      descricao: "PAGA INTE TOTAL 001 - Plano Intestino",
    },
  ]);

  console.log("Seed PADCOM V9 concluido com sucesso!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
