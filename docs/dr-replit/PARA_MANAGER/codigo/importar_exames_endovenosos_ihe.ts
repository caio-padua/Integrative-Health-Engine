// ============================================================================
// IMPORTADOR — PACOTE EXAMES + ENDOVENOSOS (CARTA_04)
// Escrito pelo Dr. Replit Pawards / IHE em 15/06/2026.
// Destino no repl do Manager: scripts/src/importar-exames-endovenosos-ihe.ts
// Registre em scripts/package.json:
//   "transmutar:exames": "tsx src/importar-exames-endovenosos-ihe.ts"
// Rode:
//   pnpm --filter @workspace/scripts run transmutar:exames
//
// PRE-REQUISITO: aplicar antes  schema_exames_endovenosos_ihe.ts  + db push.
// IDEMPOTENTE: tudo por upsert na chave id_ihe (rodar 2x nao duplica).
// SO ADICIONA. Nao apaga nem altera tabelas existentes.
// ============================================================================
import { db } from "@workspace/db";
import {
  catalogoEndovenososTable,
  catalogoExamesTable,
  catalogoAnalitosTable,
  catalogoExameBlocosTable,
  catalogoExameDirecaoTable,
} from "@workspace/db/schema";

const RAW =
  "https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER";

async function baixar(arquivo: string): Promise<any> {
  const url = `${RAW}/${arquivo}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${r.status}`);
  return r.json();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function importarEndovenosos() {
  const pacote = await baixar("endovenosos_export_26.06.15.json");
  const linhas: any[] = pacote.endovenosos ?? [];
  let n = 0;
  for (const e of linhas) {
    await db
      .insert(catalogoEndovenososTable)
      .values({
        idIhe: e.id,
        codigoPadcom: e.codigo_padcom,
        tipoLinha: e.tipo_linha,
        nomeSoro: e.nome_soro,
        nomeExibicao: e.nome_exibicao,
        ativo: e.ativo,
        dosagem: e.dosagem,
        volume: e.volume,
        via: e.via,
        valorUnidade: e.valor_unidade,
        origemValor: e.origem_valor,
        statusCadastro: e.status_cadastro,
        observacao: e.observacao,
        classificacao: e.classificacao,
        eixoIntegrativo: e.eixo_integrativo,
        palavraChaveMotor: e.palavra_chave_motor,
        frequenciaPadrao: e.frequencia_padrao,
        complementar: e.complementar,
        codigoSemantico: e.codigo_semantico,
        b1: e.b1, b2: e.b2, b3: e.b3, b4: e.b4, seq: e.seq,
      })
      .onConflictDoUpdate({
        target: catalogoEndovenososTable.idIhe,
        set: {
          codigoPadcom: e.codigo_padcom,
          tipoLinha: e.tipo_linha,
          nomeSoro: e.nome_soro,
          nomeExibicao: e.nome_exibicao,
          ativo: e.ativo,
          dosagem: e.dosagem,
          volume: e.volume,
          via: e.via,
          valorUnidade: e.valor_unidade,
          classificacao: e.classificacao,
        },
      });
    n++;
  }
  return n;
}

async function importarExames() {
  const pacote = await baixar("exames_export_26.06.15.json");

  const exames: any[] = pacote.exames_base ?? [];
  let ne = 0;
  for (const x of exames) {
    await db
      .insert(catalogoExamesTable)
      .values({
        idIhe: x.id,
        codigoExame: x.codigo_exame,
        ativo: x.ativo,
        grupoPrincipal: x.grupo_principal,
        subgrupo: x.subgrupo,
        nomeExame: x.nome_exame,
        modalidade: x.modalidade,
        materialOuSetor: x.material_ou_setor,
        agrupamentoPdf: x.agrupamento_pdf,
        preparo: x.preparo,
        recomendacoes: x.recomendacoes,
        corpoPedido: x.corpo_pedido,
        hd1: x.hd_1, cid1: x.cid_1, hd2: x.hd_2, cid2: x.cid_2, hd3: x.hd_3, cid3: x.cid_3,
        justificativaObjetiva: x.justificativa_objetiva,
        justificativaNarrativa: x.justificativa_narrativa,
        justificativaRobusta: x.justificativa_robusta,
        sexoAplicavel: x.sexo_aplicavel,
        idadeInicialDiretriz: x.idade_inicial_diretriz,
        idadeInicialAltoRisco: x.idade_inicial_alto_risco,
        frequenciaDiretriz: x.frequencia_diretriz,
        frequenciaProtocoloPadua: x.frequencia_protocolo_padua,
        tipoIndicacao: x.tipo_indicacao,
        gatilhoPorSintoma: x.gatilho_por_sintoma,
        gatilhoPorDoenca: x.gatilho_por_doenca,
        gatilhoPorHistoricoFamiliar: x.gatilho_por_historico_familiar,
        gatilhoPorCheckUp: x.gatilho_por_check_up,
        exigeValidacaoHumana: x.exige_validacao_humana,
        prioridade: x.prioridade,
        exameDeRastreio: x.exame_de_rastreio,
        exameDeSeguimento: x.exame_de_seguimento,
        permiteRecorrenciaAutomatica: x.permite_recorrencia_automatica,
        intervaloRecorrenciaDias: num(x.intervalo_recorrencia_dias),
        perfilDeRisco: x.perfil_de_risco,
        fonteDaRegra: x.fonte_da_regra,
        fonteUrl: x.fonte_url,
        observacaoClinica: x.observacao_clinica,
        blocoOficial: x.bloco_oficial,
        grauDoBloco: x.grau_do_bloco,
        usaGrade: x.usa_grade,
        ordemNoBloco: num(x.ordem_no_bloco),
        finalidadePrincipal: x.finalidade_principal,
        finalidadeSecundaria: x.finalidade_secundaria,
        objetivoPratico: x.objetivo_pratico,
        objetivoTecnico: x.objetivo_tecnico,
        interpretacaoPratica: x.interpretacao_pratica,
        quandoPensarNesteExame: x.quando_pensar_neste_exame,
        limitacaoDoExame: x.limitacao_do_exame,
        correlacaoClinica: x.correlacao_clinica,
        legendaRapida: x.legenda_rapida,
        inflamacaoVisual: x.inflamacao_visual,
        oxidacaoVisual: x.oxidacao_visual,
        riscoCardiometabolicoVisual: x.risco_cardiometabolico_visual,
        valorClinicoVisual: x.valor_clinico_visual,
        complexidadeInterpretativaVisual: x.complexidade_interpretativa_visual,
        codigoSemantico: x.codigo_semantico,
        b1: x.b1, b2: x.b2, b3: x.b3, b4: x.b4, seq: x.seq,
        ganchoAnamneseRef: null, // reservado pro motor de anamnese local
        payloadIhe: x,
      })
      .onConflictDoUpdate({
        target: catalogoExamesTable.idIhe,
        set: {
          nomeExame: x.nome_exame,
          grupoPrincipal: x.grupo_principal,
          subgrupo: x.subgrupo,
          blocoOficial: x.bloco_oficial,
          ativo: x.ativo,
          payloadIhe: x,
        },
      });
    ne++;
  }

  const analitos: any[] = pacote.analitos_catalogo ?? [];
  let na = 0;
  for (const a of analitos) {
    await db
      .insert(catalogoAnalitosTable)
      .values({
        idIhe: a.id,
        codigo: a.codigo,
        nome: a.nome,
        sinonimos: a.sinonimos,
        grupo: a.grupo,
        unidadePadraoIntegrativa: a.unidade_padrao_integrativa,
        tercoExcelente: a.terco_excelente,
        observacaoClinica: a.observacao_clinica,
        origemReferencia: a.origem_referencia,
        ativo: a.ativo,
        codigoSemanticoV4: a.codigo_semantico_v4,
        nomeZonaExcelente: a.nome_zona_excelente,
        nomeZonaAceitavel: a.nome_zona_aceitavel,
        nomeZonaRuim: a.nome_zona_ruim,
        nomeZonaAlerta: a.nome_zona_alerta,
        nomeZonaAtencao: a.nome_zona_atencao,
        payloadIhe: a,
      })
      .onConflictDoUpdate({
        target: catalogoAnalitosTable.idIhe,
        set: { nome: a.nome, grupo: a.grupo, ativo: a.ativo, payloadIhe: a },
      });
    na++;
  }

  const mapa: any[] = pacote.mapa_bloco_exame ?? [];
  let nm = 0;
  for (const m of mapa) {
    await db
      .insert(catalogoExameBlocosTable)
      .values({
        idIhe: m.id,
        blocoId: m.bloco_id, // TEXT ("BLK001"), nao converter pra numero
        nomeBloco: m.nome_bloco,
        usaGrade: m.usa_grade,
        grau: m.grau,
        ordemNoBloco: num(m.ordem_no_bloco),
        nomeExame: m.nome_exame,
        codigoPadcom: m.codigo_padcom,
        codigoLegado: m.codigo_legado,
        ativo: m.ativo,
      })
      .onConflictDoUpdate({
        target: catalogoExameBlocosTable.idIhe,
        set: { nomeBloco: m.nome_bloco, ordemNoBloco: num(m.ordem_no_bloco), ativo: m.ativo },
      });
    nm++;
  }

  const direcao: any[] = pacote.direcao_favoravel_exame ?? [];
  let nd = 0;
  for (const d of direcao) {
    await db
      .insert(catalogoExameDirecaoTable)
      .values({
        idIhe: d.id,
        nomeExame: d.nome_exame,
        direcaoFavoravel: d.direcao_favoravel,
        grupoExame: d.grupo_exame,
        descricao: d.descricao,
      })
      .onConflictDoUpdate({
        target: catalogoExameDirecaoTable.idIhe,
        set: { direcaoFavoravel: d.direcao_favoravel, grupoExame: d.grupo_exame },
      });
    nd++;
  }

  return { exames: ne, analitos: na, mapa_blocos: nm, direcao: nd };
}

async function main() {
  console.log("== TRANSMUTACAO EXAMES + ENDOVENOSOS (IHE -> Manager) ==");
  const endo = await importarEndovenosos();
  console.log(`endovenosos: ${endo} (esperado 63)`);
  const ex = await importarExames();
  console.log(
    `exames: ${ex.exames} (esp 280) | analitos: ${ex.analitos} (esp 304) | ` +
      `mapa_blocos: ${ex.mapa_blocos} (esp 409) | direcao: ${ex.direcao} (esp 54)`,
  );
  console.log("== FIM ==");
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO na transmutacao de exames/endovenosos:", e);
  process.exit(1);
});
