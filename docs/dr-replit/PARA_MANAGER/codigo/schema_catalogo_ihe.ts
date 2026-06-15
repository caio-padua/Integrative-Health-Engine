// ============================================================================
// TRANSPLANTE IHE -> Manager  (braco escrito pelo Dr. Replit Pawards / IHE)
// Destino no repl do Manager: lib/db/src/schema/catalogo-ihe.ts
// Depois: adicionar  export * from "./catalogo-ihe";  em lib/db/src/schema/index.ts
// Aplicar com:  pnpm --filter @workspace/db run push
//
// REGRA DE OURO: este arquivo SO ADICIONA tabelas novas. Nao toca em nada que
// ja existe. Tudo leva a etiqueta de origem em "origem_transmutacao".
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

const ORIGEM = "IHE_TRANSMUTACAO_26.06.13";

// --- dicionario de 9 janelas do dia (referencia para estruturar posologia) ---
export const periodosDiaTable = pgTable("periodos_dia", {
  id: serial("id").primaryKey(),
  sigla: text("sigla").notNull().unique(),
  ordem: integer("ordem"),
  nome: text("nome"),
  janelaInicio: text("janela_inicio"),
  janelaFim: text("janela_fim"),
  emoji: text("emoji"),
  corHex: text("cor_hex"),
  descricao: text("descricao"),
  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- catalogo generico de itens terapeuticos (457) ---
export const catalogoItensTable = pgTable("catalogo_itens", {
  id: serial("id").primaryKey(),
  idIhe: integer("id_ihe").notNull().unique(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria"),
  subCategoria: text("sub_categoria"),
  disponivel: boolean("disponivel"),
  preco: text("preco"),
  tags: jsonb("tags"),
  codigoPadcom: text("codigo_padcom").notNull().unique(),
  blocoId: integer("bloco_id"),
  grau: text("grau"),
  viaUso: text("via_uso"),
  frequenciaBase: text("frequencia_base"),
  composicao: text("composicao"),
  posologia: text("posologia"),
  areaSemantica: text("area_semantica"),
  exigeValidacaoHumana: boolean("exige_validacao_humana"),
  unidadeId: integer("unidade_id"),
  posologiaEstruturada: jsonb("posologia_estruturada"),
  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- formulas magistrais (54) ---
export const catalogoFormulasTable = pgTable("catalogo_formulas", {
  id: serial("id").primaryKey(),
  idIhe: integer("id_ihe").notNull().unique(),
  codigoPadcom: text("codigo_padcom"),
  identificador: text("identificador"),
  conteudo: text("conteudo"),
  area: text("area"),
  funcao: text("funcao"),
  status: text("status"),
  tipoLinha: text("tipo_linha"),
  valorUnidade: text("valor_unidade"),
  origemValor: text("origem_valor"),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  viaAdministracao: text("via_administracao"),
  formaFarmaceutica: text("forma_farmaceutica"),
  posologiaPadrao: jsonb("posologia_padrao"),
  periodosPadrao: jsonb("periodos_padrao"),
  efeitosColaterais: jsonb("efeitos_colaterais"),
  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- injetaveis IM / EV / SC (305) ---
export const catalogoInjetaveisTable = pgTable("catalogo_injetaveis", {
  id: serial("id").primaryKey(),
  idIhe: integer("id_ihe").notNull().unique(),
  codigoPadcom: text("codigo_padcom"),
  tipoLinha: text("tipo_linha"),
  nomeAmpola: text("nome_ampola"),
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
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  substanciaBase: text("substancia_base"),
  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- implantes (32) — DOMINIO NOVO no Manager ---
export const catalogoImplantesTable = pgTable("catalogo_implantes", {
  id: serial("id").primaryKey(),
  idIhe: integer("id_ihe").notNull().unique(),
  codigoPadcom: text("codigo_padcom"),
  nomeImplante: text("nome_implante"),
  substanciaAtiva: text("substancia_ativa"),
  ativo: boolean("ativo"),
  dosagem: text("dosagem"),
  unidade: text("unidade"),
  trocarte: text("trocarte"),
  liberacaoDiaria: text("liberacao_diaria"),
  doseRecomendada: text("dose_recomendada"),
  tempoAcao: text("tempo_acao"),
  indicacao: text("indicacao"),
  via: text("via"),
  valorUnidade: text("valor_unidade"),
  origemValor: text("origem_valor"),
  statusCadastro: text("status_cadastro"),
  observacao: text("observacao"),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- blends: cabecalho (12) ---
export const catalogoBlendsTable = pgTable("catalogo_blends", {
  id: serial("id").primaryKey(),
  idIhe: integer("id_ihe").notNull().unique(),
  codigoBlend: text("codigo_blend").notNull().unique(),
  nomeBlend: text("nome_blend"),
  funcao: text("funcao"),
  via: text("via"),
  forma: text("forma"),
  posologia: text("posologia"),
  duracao: text("duracao"),
  objetivo: text("objetivo"),
  ativo: boolean("ativo"),
  formulaId: integer("formula_id"),
  valorBrl: text("valor_brl"),
  valorMin: text("valor_min"),
  valorMax: text("valor_max"),
  origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- blends: ativos / componentes (63) — filhos do cabecalho via codigo_blend ---
export const catalogoBlendAtivosTable = pgTable(
  "catalogo_blend_ativos",
  {
    id: serial("id").primaryKey(),
    blendCodigo: text("blend_codigo").notNull(),
    ordem: integer("ordem").notNull(),
    componente: text("componente"),
    dosagem: text("dosagem"),
    unidade: text("unidade"),
    observacao: text("observacao"),
    valorBrl: text("valor_brl"),
    valorMin: text("valor_min"),
    valorMax: text("valor_max"),
    origemTransmutacao: text("origem_transmutacao").default(ORIGEM),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uqBlendOrdem: unique("uq_blend_ativo_codigo_ordem").on(t.blendCodigo, t.ordem),
  }),
);
