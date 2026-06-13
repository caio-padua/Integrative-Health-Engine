/**
 * varredura.ts — camada PURA de decisao da varredura de substancias.
 *
 * Transmutado de docs/dr-replit/ras-kaizen-v8/VarreduraSubstancias.gs, que no
 * Apps Script era GLUE (lia/escrevia Sheet). Aqui fica SO a parte pura e
 * testavel: dado catalogo + apelidos + ocorrencias ja lidas, decide o diff
 * BEFORE->AFTER e a lista de write-backs. A leitura/escrita real nas planilhas
 * (ou no banco do Pactor) e responsabilidade da camada de app (Instrucao 03).
 *
 * Reusa o motor puro da Onda A (padronizacao). Fail-closed: so gera write-back
 * pra status OK que de fato mudou; orfaos (REVISAR_DOSE/SEM_CORRESPONDENCIA)
 * ficam intactos.
 */

import {
  type Apelido,
  type ItemCatalogo,
  type ItemPlanoVarredura,
  montarNomeCanonico,
  planejarVarredura,
} from "../padronizacao/padronizacao.ts";

export interface OcorrenciaVarredura {
  aba: string;
  linha: number;
  texto: string;
  col?: number;
}

export type OrigemReplica = "CADASTRO" | "APELIDO";

export interface LinhaReplica {
  indice: number;
  nomeCanonico: string;
  nomeCadastro: string;
  dosagem: string;
  origem: OrigemReplica;
}

export type AplicadoStatus = "SIM" | "nao (sem mudanca)" | "PREVIEW";

export interface LinhaVarredura extends ItemPlanoVarredura {
  aplicado: AplicadoStatus;
}

export interface WriteBack {
  aba: string;
  linha: number;
  col: number | null;
  valor: string;
}

export interface ResultadoVarredura {
  linhas: LinhaVarredura[];
  writeBacks: WriteBack[];
  totalOcorrencias: number;
  aplicadas: number;
  orfaos: number;
}

export function colunaLetraParaIndice(letra: string): number {
  const s = String(letra || "").toUpperCase().replace(/[^A-Z]/g, "");
  let n = 0;
  for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return n;
}

export function montarReplicaSubstancias(
  catalogo: ItemCatalogo[] | null | undefined,
  apelidos: Apelido[] | null | undefined,
): LinhaReplica[] {
  const linhas: LinhaReplica[] = [];
  const cat = catalogo || [];
  for (let i = 0; i < cat.length; i++) {
    const c = cat[i];
    linhas.push({
      indice: i + 1,
      nomeCanonico: montarNomeCanonico(c.nome, c.dosagem),
      nomeCadastro: c.nome,
      dosagem: c.dosagem,
      origem: "CADASTRO",
    });
  }
  const aps = apelidos || [];
  for (let j = 0; j < aps.length; j++) {
    const a = aps[j];
    const st = String(a.status || "").trim().toUpperCase();
    linhas.push({
      indice: cat.length + j + 1,
      nomeCanonico: st === "ATIVO" ? a.para : `(${st || "SEM STATUS"})`,
      nomeCadastro: a.de,
      dosagem: "",
      origem: "APELIDO",
    });
  }
  return linhas;
}

export function montarVarreduraPreview(
  ocorrencias: OcorrenciaVarredura[] | null | undefined,
  catalogo: ItemCatalogo[] | null | undefined,
  apelidos?: Apelido[] | null,
  modoAplicar = false,
): ResultadoVarredura {
  const lista = ocorrencias || [];
  const plano = planejarVarredura(lista, catalogo, apelidos);
  const linhas: LinhaVarredura[] = [];
  const writeBacks: WriteBack[] = [];
  let aplicadas = 0;
  let orfaos = 0;

  for (let p = 0; p < plano.length; p++) {
    const it = plano[p];
    const aplicar = !!(modoAplicar && it.status === "OK" && it.mudou);
    if (it.status !== "OK") orfaos++;
    if (aplicar) {
      writeBacks.push({
        aba: it.aba,
        linha: it.linha,
        col: lista[p].col != null ? Number(lista[p].col) : null,
        valor: it.para,
      });
      aplicadas++;
    }
    linhas.push({
      ...it,
      aplicado: aplicar ? "SIM" : modoAplicar ? "nao (sem mudanca)" : "PREVIEW",
    });
  }

  return {
    linhas,
    writeBacks,
    totalOcorrencias: plano.length,
    aplicadas,
    orfaos,
  };
}
