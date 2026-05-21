/**
 * pulsoDiarioService.ts — Wave Dashboard Local + Pulso Diário (21/mai/2026)
 *
 * Spec: docs/dr-claude/18_SPEC_DASHBOARD_CLIENTE_E_PULSO_DIARIO.md
 *
 * "Pulso Diário" é uma CAMADA DE APRESENTAÇÃO sobre 4 tabelas existentes
 * (decisão híbrida P001-C aprovada pelo Dr. Claude). Zero migração de
 * dados — só agrega leitura/escrita unificada das 4 fontes:
 *
 *   - tracking_sintomas              → sliders 0-10 (sono, energia, foco, ...)
 *   - monitoramento_sinais_vitais    → PA, FC, glicemia, peso, cintura
 *   - acompanhamento_formula         → aderência + bem-estar com fórmula
 *   - alerta_paciente                → alertas vermelhos do dia
 *
 * Token portal: nanoid via crypto.randomBytes (12 chars base62-like).
 * TTL default 30 dias (configurável por unidade no futuro — P010).
 */

import { randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// 22 chars base64url cortados pra 12 → ~71 bits entropia, suficiente
// pro caso de uso (URL temporária de paciente único). Caracteres
// inocentes pra URL (sem +, /, =).
function gerarTokenPortal(): string {
  return randomBytes(9)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 12);
}

export interface PulsoDiarioDTO {
  paciente_id: number;
  intervalo: { de: string; ate: string };
  sintomas: Array<{
    data_semana: string;
    sono: number | null;
    energia: number | null;
    disposicao: number | null;
    foco: number | null;
    libido: number | null;
    forca: number | null;
    emagrecimento: number | null;
    estresse: number | null;
    humor: number | null;
    origem: string | null;
  }>;
  sinais_vitais: Array<{
    data_registro: string;
    indicador: string;
    leituras: Array<{ horario: string | null; valor: number | null }>;
    origem: string | null;
  }>;
  formula: Array<{
    codigo_blend: string | null;
    nome_blend: string | null;
    data_inicio: string | null;
    aderencia: string | null;
    bem_estar: boolean | null;
    sente_resultado: string | null;
    efeito_colateral_1: string | null;
    efeito_colateral_2: string | null;
    observacao: string | null;
    origem: string | null;
  }>;
  alertas: Array<{
    id: number;
    tipo_alerta: string | null;
    descricao: string | null;
    gravidade: string | null;
    status: string | null;
    criado_em: string | null;
  }>;
}

export interface EntradaPulsoSintoma {
  tipo: "sintoma";
  data_semana?: string;
  sono?: number;
  energia?: number;
  disposicao?: number;
  foco?: number;
  libido?: number;
  forca?: number;
  emagrecimento?: number;
  estresse?: number;
  humor?: number;
}

export interface EntradaPulsoSinalVital {
  tipo: "sinal_vital";
  data_registro?: string;
  indicador: string; // 'PA_SIS' | 'PA_DIA' | 'FC' | 'GLICEMIA' | 'PESO' | 'CINTURA'
  leituras: Array<{ horario: string; valor: number }>;
}

export interface EntradaPulsoFormula {
  tipo: "formula";
  codigo_blend?: string;
  nome_blend?: string;
  data_inicio?: string;
  aderencia?: string;
  bem_estar?: boolean;
  sente_resultado?: string;
  efeito_colateral_1?: string;
  observacao?: string;
}

export type EntradaPulsoDiario =
  | EntradaPulsoSintoma
  | EntradaPulsoSinalVital
  | EntradaPulsoFormula;

const DEFAULT_TTL_DIAS = 30;

/**
 * Agrega leitura das 4 tabelas num DTO único.
 * Datas em ISO `YYYY-MM-DD`. Se `de`/`ate` omitidos → últimos 30 dias.
 */
export async function buscarPulsoDiario(
  pacienteId: number,
  de?: string,
  ate?: string,
): Promise<PulsoDiarioDTO> {
  const hoje = new Date();
  const ateData = ate ?? hoje.toISOString().slice(0, 10);
  const deData =
    de ??
    new Date(hoje.getTime() - 30 * 86400 * 1000).toISOString().slice(0, 10);

  const [sintomasRes, vitaisRes, formulaRes, alertasRes] = await Promise.all([
    db.execute(sql`
      SELECT data_semana, sono, energia, disposicao, foco, libido, forca,
             emagrecimento, estresse, humor, origem
      FROM tracking_sintomas
      WHERE paciente_id = ${pacienteId}
        AND data_semana >= ${deData}::date
        AND data_semana <= ${ateData}::date
      ORDER BY data_semana DESC
      LIMIT 200
    `),
    db.execute(sql`
      SELECT data_registro, indicador,
             hora1_horario, hora1_valor, hora2_horario, hora2_valor,
             hora3_horario, hora3_valor, hora4_horario, hora4_valor,
             hora5_horario, hora5_valor, hora6_horario, hora6_valor,
             origem
      FROM monitoramento_sinais_vitais
      WHERE paciente_id = ${pacienteId}
        AND data_registro >= ${deData}::date
        AND data_registro <= ${ateData}::date
      ORDER BY data_registro DESC, indicador ASC
      LIMIT 500
    `),
    db.execute(sql`
      SELECT codigo_blend, nome_blend, data_inicio::text AS data_inicio,
             aderencia, bem_estar, sente_resultado,
             efeito_colateral_1, efeito_colateral_2, observacao, origem
      FROM acompanhamento_formula
      WHERE paciente_id = ${pacienteId}
      ORDER BY COALESCE(data_inicio, criado_em::date) DESC
      LIMIT 50
    `),
    db.execute(sql`
      SELECT id, tipo_alerta, descricao, gravidade, status,
             criado_em::text AS criado_em
      FROM alerta_paciente
      WHERE paciente_id = ${pacienteId}
        AND criado_em >= ${deData}::date
      ORDER BY criado_em DESC
      LIMIT 100
    `),
  ]);

  const sinais_vitais = (vitaisRes.rows as Array<Record<string, unknown>>).map(
    (r) => ({
      data_registro: String(r["data_registro"]),
      indicador: String(r["indicador"]),
      origem: r["origem"] as string | null,
      leituras: [1, 2, 3, 4, 5, 6]
        .map((i) => ({
          horario: (r[`hora${i}_horario`] as string | null) ?? null,
          valor: (r[`hora${i}_valor`] as number | null) ?? null,
        }))
        .filter((l) => l.valor !== null),
    }),
  );

  return {
    paciente_id: pacienteId,
    intervalo: { de: deData, ate: ateData },
    sintomas: (sintomasRes.rows as Array<Record<string, unknown>>).map(
      (r) => ({
        data_semana: String(r["data_semana"]),
        sono: r["sono"] as number | null,
        energia: r["energia"] as number | null,
        disposicao: r["disposicao"] as number | null,
        foco: r["foco"] as number | null,
        libido: r["libido"] as number | null,
        forca: r["forca"] as number | null,
        emagrecimento: r["emagrecimento"] as number | null,
        estresse: r["estresse"] as number | null,
        humor: r["humor"] as number | null,
        origem: r["origem"] as string | null,
      }),
    ),
    sinais_vitais,
    formula: (formulaRes.rows as Array<Record<string, unknown>>).map((r) => ({
      codigo_blend: r["codigo_blend"] as string | null,
      nome_blend: r["nome_blend"] as string | null,
      data_inicio: r["data_inicio"] as string | null,
      aderencia: r["aderencia"] as string | null,
      bem_estar: r["bem_estar"] as boolean | null,
      sente_resultado: r["sente_resultado"] as string | null,
      efeito_colateral_1: r["efeito_colateral_1"] as string | null,
      efeito_colateral_2: r["efeito_colateral_2"] as string | null,
      observacao: r["observacao"] as string | null,
      origem: r["origem"] as string | null,
    })),
    alertas: (alertasRes.rows as Array<Record<string, unknown>>).map((r) => ({
      id: Number(r["id"]),
      tipo_alerta: r["tipo_alerta"] as string | null,
      descricao: r["descricao"] as string | null,
      gravidade: r["gravidade"] as string | null,
      status: r["status"] as string | null,
      criado_em: r["criado_em"] as string | null,
    })),
  };
}

/**
 * Registra entrada do Pulso Diário roteando para a tabela correta
 * conforme `tipo`. `origem` distingue PROFISSIONAL (médico/enfermeira
 * via dashboard) de PACIENTE (portal sem JWT) de IMPORT (planilha).
 */
export async function registrarPulsoDiario(
  pacienteId: number,
  entrada: EntradaPulsoDiario,
  origem: "PROFISSIONAL" | "PACIENTE" | "IMPORT" = "PROFISSIONAL",
): Promise<{ tabela: string; id: number }> {
  if (entrada.tipo === "sintoma") {
    const data = entrada.data_semana ?? new Date().toISOString().slice(0, 10);
    const r = await db.execute(sql`
      INSERT INTO tracking_sintomas (
        paciente_id, data_semana, sono, energia, disposicao,
        foco, libido, forca, emagrecimento, estresse, humor, origem
      ) VALUES (
        ${pacienteId}, ${data}::date,
        ${entrada.sono ?? null}, ${entrada.energia ?? null}, ${entrada.disposicao ?? null},
        ${entrada.foco ?? null}, ${entrada.libido ?? null}, ${entrada.forca ?? null},
        ${entrada.emagrecimento ?? null}, ${entrada.estresse ?? null}, ${entrada.humor ?? null},
        ${origem}
      ) RETURNING id
    `);
    return { tabela: "tracking_sintomas", id: Number((r.rows[0] as { id: number }).id) };
  }

  if (entrada.tipo === "sinal_vital") {
    const data = entrada.data_registro ?? new Date().toISOString().slice(0, 10);
    const l = entrada.leituras.slice(0, 6);
    const v = (i: number) => l[i]?.valor ?? null;
    const h = (i: number) => l[i]?.horario ?? null;
    const r = await db.execute(sql`
      INSERT INTO monitoramento_sinais_vitais (
        paciente_id, data_registro, indicador,
        hora1_valor, hora1_horario, hora2_valor, hora2_horario,
        hora3_valor, hora3_horario, hora4_valor, hora4_horario,
        hora5_valor, hora5_horario, hora6_valor, hora6_horario,
        origem
      ) VALUES (
        ${pacienteId}, ${data}::date, ${entrada.indicador},
        ${v(0)}, ${h(0)}, ${v(1)}, ${h(1)},
        ${v(2)}, ${h(2)}, ${v(3)}, ${h(3)},
        ${v(4)}, ${h(4)}, ${v(5)}, ${h(5)},
        ${origem}
      ) RETURNING id
    `);
    return {
      tabela: "monitoramento_sinais_vitais",
      id: Number((r.rows[0] as { id: number }).id),
    };
  }

  // formula
  const r = await db.execute(sql`
    INSERT INTO acompanhamento_formula (
      paciente_id, codigo_blend, nome_blend, data_inicio,
      aderencia, bem_estar, sente_resultado,
      efeito_colateral_1, observacao, origem
    ) VALUES (
      ${pacienteId}, ${entrada.codigo_blend ?? null}, ${entrada.nome_blend ?? null},
      ${entrada.data_inicio ?? null}::date,
      ${entrada.aderencia ?? null}, ${entrada.bem_estar ?? null}, ${entrada.sente_resultado ?? null},
      ${entrada.efeito_colateral_1 ?? null}, ${entrada.observacao ?? null},
      ${origem}
    ) RETURNING id
  `);
  return {
    tabela: "acompanhamento_formula",
    id: Number((r.rows[0] as { id: number }).id),
  };
}

/**
 * Gera token único + TTL e grava na tabela pacientes. Idempotente no
 * sentido de que sempre sobrescreve o anterior (cada chamada renova).
 */
export async function gerarTokenPortalPulso(
  pacienteId: number,
  ttlDias: number = DEFAULT_TTL_DIAS,
): Promise<{ token: string; expira_em: string }> {
  const token = gerarTokenPortal();
  const expira = new Date(Date.now() + ttlDias * 86400 * 1000);
  await db.execute(sql`
    UPDATE pacientes
       SET pulso_diario_token = ${token},
           pulso_diario_token_expira_em = ${expira.toISOString()}::timestamptz
     WHERE id = ${pacienteId}
  `);
  return { token, expira_em: expira.toISOString() };
}

/**
 * Resolve token → pacienteId. Retorna null se token inválido, não
 * encontrado, ou expirado. Esta é a única função que o portal público
 * usa antes de gravar — ela é o gate de segurança do canal sem JWT.
 */
export async function validarTokenPortalPulso(
  token: string,
): Promise<{ pacienteId: number; nome: string | null } | null> {
  if (!token || token.length < 8 || token.length > 32) return null;
  const r = await db.execute(sql`
    SELECT id, nome, pulso_diario_token_expira_em
      FROM pacientes
     WHERE pulso_diario_token = ${token}
     LIMIT 1
  `);
  const row = r.rows[0] as
    | { id: number; nome: string | null; pulso_diario_token_expira_em: string | null }
    | undefined;
  if (!row) return null;
  const expira = row.pulso_diario_token_expira_em
    ? new Date(row.pulso_diario_token_expira_em).getTime()
    : 0;
  if (!expira || expira < Date.now()) return null;
  return { pacienteId: Number(row.id), nome: row.nome };
}
