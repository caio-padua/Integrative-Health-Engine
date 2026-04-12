import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { consultoriasTable, consultorUnidadesTable, unidadesTable, usuariosTable, delegacoesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const CLINICAS_DEMO = [
  { nome: "Clinica Vitallis Centro", cor: "#3B82F6", endereco: "Rua Augusta 1200", cidade: "Sao Paulo", estado: "SP" },
  { nome: "Clinica Bem Estar Alphaville", cor: "#10B981", endereco: "Av Alphaville 500", cidade: "Barueri", estado: "SP" },
  { nome: "Clinica Saude Integral Campinas", cor: "#F59E0B", endereco: "Rua Barao de Jaguara 300", cidade: "Campinas", estado: "SP" },
];

router.post("/", async (_req: Request, res: Response) => {
  const existente = await db.select().from(consultoriasTable).limit(1);
  let consultoriaId: number;

  if (existente.length > 0) {
    consultoriaId = existente[0].id;
  } else {
    const [consultoria] = await db.insert(consultoriasTable).values({
      nome: "PADCOM Consultoria Medica",
      cnpj: "12.345.678/0001-90",
      responsavel: "Dr Caio Henrique Fernandes Padua",
      email: "caio@clinica.com",
      telefone: "(11) 99999-0001",
      plano: "enterprise",
      maxUnidades: "20",
    }).returning();
    consultoriaId = consultoria.id;
  }

  const unidadesExistentes = await db.select().from(unidadesTable);
  const unidadeIds: number[] = [];

  for (const clinica of CLINICAS_DEMO) {
    const existeUnidade = unidadesExistentes.find(u => u.nome === clinica.nome);
    if (existeUnidade) {
      await db.update(unidadesTable).set({ cor: clinica.cor, consultoriaId }).where(eq(unidadesTable.id, existeUnidade.id));
      unidadeIds.push(existeUnidade.id);
    } else {
      const [nova] = await db.insert(unidadesTable).values({
        nome: clinica.nome,
        cor: clinica.cor,
        endereco: clinica.endereco,
        cidade: clinica.cidade,
        estado: clinica.estado,
        consultoriaId,
      }).returning();
      unidadeIds.push(nova.id);
    }
  }

  await db.update(unidadesTable).set({ consultoriaId }).where(eq(unidadesTable.id, unidadesExistentes[0]?.id ?? 1));

  const [caio] = await db.select().from(usuariosTable).where(eq(usuariosTable.email, "caio@clinica.com"));
  if (caio) {
    await db.update(usuariosTable).set({ escopo: "consultoria_master", consultoriaId }).where(eq(usuariosTable.id, caio.id));
  }

  const mariaExistente = await db.select().from(usuariosTable).where(eq(usuariosTable.email, "maria.fisio@clinica.com"));
  let mariaId: number;
  if (mariaExistente.length > 0) {
    mariaId = mariaExistente[0].id;
    await db.update(usuariosTable).set({ escopo: "consultor_campo", consultoriaId }).where(eq(usuariosTable.id, mariaId));
  } else {
    const [maria] = await db.insert(usuariosTable).values({
      nome: "Maria Silva Fisioterapeuta",
      email: "maria.fisio@clinica.com",
      senha: "senha123",
      perfil: "enfermeira",
      escopo: "consultor_campo",
      consultoriaId,
      especialidade: "Fisioterapia",
      telefone: "(11) 98888-0001",
    }).returning();
    mariaId = maria.id;
  }

  const existentes = await db.select().from(consultorUnidadesTable).where(eq(consultorUnidadesTable.usuarioId, mariaId));
  const existenteUnidadeIds = existentes.map(e => e.unidadeId);

  for (const unidadeId of unidadeIds) {
    if (!existenteUnidadeIds.includes(unidadeId)) {
      await db.insert(consultorUnidadesTable).values({ usuarioId: mariaId, unidadeId });
    }
  }

  const delegacoesExistentes = await db.select().from(delegacoesTable).limit(1);
  if (delegacoesExistentes.length > 0) {
    const allDelegacoes = await db.select().from(delegacoesTable);
    for (let i = 0; i < allDelegacoes.length; i++) {
      const unidadeId = unidadeIds[i % unidadeIds.length];
      await db.update(delegacoesTable).set({ unidadeId }).where(eq(delegacoesTable.id, allDelegacoes[i].id));
    }
  }

  const DELEGACOES_MULTI = [
    { titulo: "Revisao prontuarios Vitallis", descricao: "Revisar pendencias dos prontuarios da unidade Centro", prioridade: "alta", categoria: "clinico", unidadeIdx: 0 },
    { titulo: "Treinamento equipe Alphaville", descricao: "Capacitar nova enfermeira no protocolo de acolhimento", prioridade: "media", categoria: "administrativo", unidadeIdx: 1 },
    { titulo: "Inventario estoque Campinas", descricao: "Conferir estoque de injetaveis e reportar necessidade de reposicao", prioridade: "urgente", categoria: "logistica", unidadeIdx: 2 },
    { titulo: "Follow-up pos implante Vitallis", descricao: "Ligar para 5 pacientes pos implante hormonal da semana passada", prioridade: "alta", categoria: "clinico", unidadeIdx: 0 },
    { titulo: "Organizar sala fisioterapia Alphaville", descricao: "Reorganizar equipamentos e preparar materiais para proxima semana", prioridade: "baixa", categoria: "logistica", unidadeIdx: 1 },
    { titulo: "Avaliar satisfacao Campinas", descricao: "Enviar formulario de satisfacao para pacientes atendidos este mes", prioridade: "media", categoria: "atendimento", unidadeIdx: 2 },
  ];

  const PRAZO_HORAS: Record<string, number> = { "24h": 24, "36h": 36, "48h": 48, "72h": 72, "1_semana": 168 };
  const prazos = ["24h", "48h", "72h", "36h", "1_semana", "48h"];

  const delegacoesExistentesMulti = await db.select().from(delegacoesTable).where(eq(delegacoesTable.responsavelId, mariaId));
  if (delegacoesExistentesMulti.length === 0) {
    for (let i = 0; i < DELEGACOES_MULTI.length; i++) {
      const d = DELEGACOES_MULTI[i];
      const prazo = prazos[i];
      const horas = PRAZO_HORAS[prazo];
      const dataLimite = new Date(Date.now() + horas * 60 * 60 * 1000);

      await db.insert(delegacoesTable).values({
        titulo: d.titulo,
        descricao: d.descricao,
        prioridade: d.prioridade as any,
        prazo: prazo as any,
        categoria: d.categoria as any,
        delegadoPorId: caio?.id ?? 1,
        responsavelId: mariaId,
        unidadeId: unidadeIds[d.unidadeIdx],
        dataLimite,
        status: i < 2 ? "pendente" : i < 4 ? "em_andamento" : "pendente",
      });
    }
  }

  res.json({
    consultoriaId,
    unidades: unidadeIds,
    consultora: { id: mariaId, nome: "Maria Silva Fisioterapeuta", unidades: unidadeIds },
    message: "Seed multi-clinica executado com sucesso",
  });
});

export default router;
