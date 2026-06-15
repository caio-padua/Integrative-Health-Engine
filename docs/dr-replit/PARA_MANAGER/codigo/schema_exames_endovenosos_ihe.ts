// ============================================================================
// TRANSPLANTE IHE -> Manager — PACOTE EXAMES + ENDOVENOSOS (CARTA_04)
// Escrito pelo Dr. Replit Pawards / IHE em 15/06/2026.
// Destino no repl do Manager: lib/db/src/schema/catalogo-exames-ihe.ts
// Depois: adicionar  export * from "./catalogo-exames-ihe";  em lib/db/src/schema/index.ts
// Aplicar com:  pnpm --filter @workspace/db run push
//
// REGRA DE OURO: este arquivo SO ADICIONA tabelas novas (catalogo_*). Nao toca
// em nada que ja existe. Toda linha leva etiqueta "origem_transmutacao".
//
// DUAS SUBDIVISOES DE EXAME (pedido do CEO):
//   1) GRADE DE BLOCOS  -> bloco_oficial (1 por exame) + catalogo_exame_blocos
//      (ponte MUITOS-PARA-MUITOS: o mesmo exame aparece em varios blocos navegaveis)
//   2) AGRUPAMENTO CLINICO -> grupo_principal + subgrupo
//
// GANCHO FUTURO PRO MOTOR DE ANAMNESE LOCAL (pedido do CEO):
//   - colunas gatilho_por_sintoma / gatilho_por_doenca /
//     gatilho_por_historico_familiar / gatilho_por_check_up  (ja vem preenchidas)
//   - coluna gancho_anamnese_ref (NULL hoje) reservada pra ligar cada exame a uma
//     regra do motor de anamnese quando ele existir, SEM nova migration.
// ============================================================================
import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const ORIGEM = "IHE_TRANSMUTACAO_26.06.15";

// --- ENDOVENOSOS / SOROS IV (63: 11 SORO + 52 COMPONENTE) -------------------
// PAI+FILHOS pelo mesmo codigo_padcom: tipo_linha=SORO e a linha principal,
// tipo_linha=COMPONENTE sao os ativos daquele soro.
export const catalogoEndovenososTable = pgTable("catalogo_endovenosos", {
  id: serial("id").primaryKey(),
  idIhe: integer("id_ihe").notNull().unique(),
  codigoPadcom: text("codigo_padcom"),
  tipoLinha: text("tipo_linha"), // SORO | COMPONENTE
  nomeSoro: text("nome_soro"),
  nomeExibicao: text("nome_exibicao"),
  ativo: boolean("ativo"),
  dosagem: text("dosagem"),
  volume: text("volume"),
  via: text("via"),
  valorUnidade: text("valor_unidade"),
  origemValor: text("origem_valor"),
  statusCadastro: text("status_cadastro"),
  observacao: text("observacao"),
  classificacao: text("classificacao"),
  eixoIntegrativo: text("eixo_integrativo"),
  palavraChaveMotor: text("palavra_chave_motor"),
  frequenciaPadrao: text("frequencia_padrao"),
  complementar: text("complementar"),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- EXAMES (mestre, 280) ---------------------------------------------------
export const catalogoExamesTable = pgTable("catalogo_exames", {
  id: serial("id").primaryKey(),
  idIhe: integer("id_ihe").notNull().unique(),
  codigoExame: text("codigo_exame"),
  ativo: boolean("ativo"),

  // SUBDIVISAO 2: agrupamento clinico
  grupoPrincipal: text("grupo_principal"),
  subgrupo: text("subgrupo"),

  nomeExame: text("nome_exame"),
  modalidade: text("modalidade"),
  materialOuSetor: text("material_ou_setor"),
  agrupamentoPdf: text("agrupamento_pdf"),
  preparo: text("preparo"),
  recomendacoes: text("recomendacoes"),
  corpoPedido: text("corpo_pedido"),

  // hipoteses diagnosticas + CID (uteis pro motor de anamnese)
  hd1: text("hd_1"),
  cid1: text("cid_1"),
  hd2: text("hd_2"),
  cid2: text("cid_2"),
  hd3: text("hd_3"),
  cid3: text("cid_3"),

  justificativaObjetiva: text("justificativa_objetiva"),
  justificativaNarrativa: text("justificativa_narrativa"),
  justificativaRobusta: text("justificativa_robusta"),

  sexoAplicavel: text("sexo_aplicavel"),
  idadeInicialDiretriz: text("idade_inicial_diretriz"),
  idadeInicialAltoRisco: text("idade_inicial_alto_risco"),
  frequenciaDiretriz: text("frequencia_diretriz"),
  frequenciaProtocoloPadua: text("frequencia_protocolo_padua"),
  tipoIndicacao: text("tipo_indicacao"),

  // GANCHOS DO MOTOR DE ANAMNESE (ja preenchidos)
  gatilhoPorSintoma: text("gatilho_por_sintoma"),
  gatilhoPorDoenca: text("gatilho_por_doenca"),
  gatilhoPorHistoricoFamiliar: text("gatilho_por_historico_familiar"),
  gatilhoPorCheckUp: text("gatilho_por_check_up"),

  exigeValidacaoHumana: boolean("exige_validacao_humana"),
  prioridade: text("prioridade"),
  exameDeRastreio: boolean("exame_de_rastreio"),
  exameDeSeguimento: boolean("exame_de_seguimento"),
  permiteRecorrenciaAutomatica: boolean("permite_recorrencia_automatica"),
  intervaloRecorrenciaDias: integer("intervalo_recorrencia_dias"),
  perfilDeRisco: text("perfil_de_risco"),
  fonteDaRegra: text("fonte_da_regra"),
  fonteUrl: text("fonte_url"),
  observacaoClinica: text("observacao_clinica"),

  // SUBDIVISAO 1: grade de blocos (bloco oficial 1:1; ponte M:N noutra tabela)
  blocoOficial: text("bloco_oficial"),
  grauDoBloco: text("grau_do_bloco"),
  usaGrade: boolean("usa_grade"),
  ordemNoBloco: integer("ordem_no_bloco"),

  finalidadePrincipal: text("finalidade_principal"),
  finalidadeSecundaria: text("finalidade_secundaria"),
  objetivoPratico: text("objetivo_pratico"),
  objetivoTecnico: text("objetivo_tecnico"),
  interpretacaoPratica: text("interpretacao_pratica"),
  quandoPensarNesteExame: text("quando_pensar_neste_exame"),
  limitacaoDoExame: text("limitacao_do_exame"),
  correlacaoClinica: text("correlacao_clinica"),
  legendaRapida: text("legenda_rapida"),

  // sinais visuais (para o cockpit do cliente, se quiser usar depois)
  inflamacaoVisual: text("inflamacao_visual"),
  oxidacaoVisual: text("oxidacao_visual"),
  riscoCardiometabolicoVisual: text("risco_cardiometabolico_visual"),
  valorClinicoVisual: text("valor_clinico_visual"),
  complexidadeInterpretativaVisual: text("complexidade_interpretativa_visual"),

  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),

  // GANCHO FUTURO: NULL hoje; vira o elo com o motor de anamnese local depois.
  ganchoAnamneseRef: text("gancho_anamnese_ref"),

  // rede de seguranca: a linha IHE original inteira, pra nada se perder.
  payloadIhe: jsonb("payload_ihe"),

  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- ANALITOS (304) — o que e medido dentro dos exames, com zonas ----------
export const catalogoAnalitosTable = pgTable("catalogo_analitos", {
  id: serial("id").primaryKey(),
  idIhe: integer("id_ihe").notNull().unique(),
  codigo: text("codigo"),
  nome: text("nome"),
  sinonimos: jsonb("sinonimos"),
  grupo: text("grupo"),
  unidadePadraoIntegrativa: text("unidade_padrao_integrativa"),
  tercoExcelente: text("terco_excelente"),
  observacaoClinica: text("observacao_clinica"),
  origemReferencia: text("origem_referencia"),
  ativo: boolean("ativo"),
  codigoSemanticoV4: text("codigo_semantico_v4"),
  nomeZonaExcelente: text("nome_zona_excelente"),
  nomeZonaAceitavel: text("nome_zona_aceitavel"),
  nomeZonaRuim: text("nome_zona_ruim"),
  nomeZonaAlerta: text("nome_zona_alerta"),
  nomeZonaAtencao: text("nome_zona_atencao"),
  payloadIhe: jsonb("payload_ihe"),
  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- PONTE EXAME <-> BLOCO (409) — MUITOS-PARA-MUITOS -----------------------
// O mesmo exame aparece em varios blocos navegaveis. Esta tabela e a grade
// que o medico folheia ("BLOCO TIREOIDE", "BLOCO BASE INTEGRATIVA"...).
export const catalogoExameBlocosTable = pgTable(
  "catalogo_exame_blocos",
  {
    id: serial("id").primaryKey(),
    idIhe: integer("id_ihe").notNull().unique(),
    blocoId: text("bloco_id"), // codigo semantico do bloco, ex "BLK001" (NAO e inteiro)
    nomeBloco: text("nome_bloco"),
    usaGrade: boolean("usa_grade"),
    grau: text("grau"),
    ordemNoBloco: integer("ordem_no_bloco"),
    nomeExame: text("nome_exame"),
    codigoPadcom: text("codigo_padcom"), // hoje vem NULL do IHE; reservado p/ ligar ao exame depois
    codigoLegado: text("codigo_legado"),
    ativo: boolean("ativo"),
    origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // chave natural real do dataset: um exame nao se repete dentro do mesmo bloco.
  // (codigo_padcom esta NULL em 100% das linhas, entao NAO serve de chave.)
  (t) => ({
    uqBlocoExame: unique("uq_exame_bloco_id_nome").on(t.blocoId, t.nomeExame),
  }),
);

// --- DIRECAO FAVORAVEL (54) — alto e bom? baixo e bom? ----------------------
export const catalogoExameDirecaoTable = pgTable("catalogo_exame_direcao", {
  id: serial("id").primaryKey(),
  idIhe: integer("id_ihe").notNull().unique(),
  nomeExame: text("nome_exame"),
  direcaoFavoravel: text("direcao_favoravel"),
  grupoExame: text("grupo_exame"),
  descricao: text("descricao"),
  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
