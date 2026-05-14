/**
 * Task #272 — Heuristica pura de classificacao de anomalia diaria de
 * bloqueios 2FA expirados.
 *
 * Origem: extraida do endpoint
 *   GET /api/admin/seguranca/totp-bloqueios-expirados (Task #160)
 * pra ser reutilizada pelo worker `alertaAnomaliaTotp2faDiario` (Task #272)
 * sem duplicar a regra (assim qualquer ajuste futuro e refletido nos dois
 * lados de uma vez so).
 *
 * Regra (conservadora, evita falso-positivo em volume baixo):
 *   - hoje >= 10 E (zScore >= 3 OU razaoVsMedia >= 3) -> ANOMALIA
 *   - hoje >=  5 E (zScore >= 2 OU razaoVsMedia >= 2) -> ATENCAO
 *   - caso contrario                                  -> NORMAL
 *
 * Funcao pura: nao toca DB, nao loga. Testavel sem mocks.
 */

export interface LinhaSerieAnomalia {
  dia: string;
  totalRemovidas: number;
}

export interface AnomaliaTotpResultado {
  flag: "NORMAL" | "ATENCAO" | "ANOMALIA";
  hojeTotal: number;
  mediaHistorica: number;
  desvioPadrao: number;
  razaoVsMedia: number;
  zScoreHoje: number;
}

export function classificarAnomaliaTotp(
  hojeTotal: number,
  historico: LinhaSerieAnomalia[],
): AnomaliaTotpResultado {
  const media =
    historico.length > 0
      ? historico.reduce((acc, l) => acc + l.totalRemovidas, 0) /
        historico.length
      : 0;
  const variancia =
    historico.length > 0
      ? historico.reduce(
          (acc, l) => acc + (l.totalRemovidas - media) ** 2,
          0,
        ) / historico.length
      : 0;
  const desvio = Math.sqrt(variancia);

  const razaoVsMedia = media > 0 ? hojeTotal / media : 0;
  const zScoreHoje = desvio > 0 ? (hojeTotal - media) / desvio : 0;

  let flag: AnomaliaTotpResultado["flag"] = "NORMAL";
  if (hojeTotal >= 10 && (zScoreHoje >= 3 || razaoVsMedia >= 3)) {
    flag = "ANOMALIA";
  } else if (hojeTotal >= 5 && (zScoreHoje >= 2 || razaoVsMedia >= 2)) {
    flag = "ATENCAO";
  }

  return {
    flag,
    hojeTotal,
    mediaHistorica: Number(media.toFixed(2)),
    desvioPadrao: Number(desvio.toFixed(2)),
    razaoVsMedia: Number(razaoVsMedia.toFixed(2)),
    zScoreHoje: Number(zScoreHoje.toFixed(2)),
  };
}
