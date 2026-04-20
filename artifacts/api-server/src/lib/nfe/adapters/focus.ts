import type {
  ProvedorNFeAdapter,
  DadosEmissaoNFe,
  DadosCancelamentoNFe,
  ResultadoEmissaoNFe,
  ResultadoCancelamento,
} from "./types";

const BASE = (amb: "homologacao" | "producao") =>
  amb === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";

function authHeader(apiKey: string): string {
  return "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
}

export const focusAdapter: ProvedorNFeAdapter = {
  codigo: "focus_nfe",

  async emitir(d: DadosEmissaoNFe): Promise<ResultadoEmissaoNFe> {
    if (!d.apiKey) return { sucesso: false, status: "ERRO", mensagem: "Credencial Focus NFe nao cadastrada para esta unidade" };
    if (!d.cnpjEmissor) return { sucesso: false, status: "ERRO", mensagem: "CNPJ emissor obrigatorio" };

    const ref = d.numeroExterno ?? `PAW-${Date.now()}-${d.unidadeId}`;
    const body = {
      cnpj_prestador: d.cnpjEmissor.replace(/\D/g, ""),
      data_emissao: new Date().toISOString().slice(0, 10),
      valor_servicos: d.valor,
      discriminacao: d.descricao,
      tomador: { razao_social: d.pacienteNome, cpf: d.pacienteCpf?.replace(/\D/g, "") ?? "" },
      ...(d.metadata ?? {}),
    };

    try {
      const r = await fetch(`${BASE(d.ambiente)}/v2/nfse?ref=${encodeURIComponent(ref)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader(d.apiKey) },
        body: JSON.stringify(body),
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, status: "ERRO", mensagem: json?.mensagem ?? `HTTP ${r.status}`, payloadProvedor: json };
      return {
        sucesso: true,
        status: json.status === "autorizado" ? "EMITIDA" : "PROCESSANDO",
        numeroNota: json.numero ?? ref,
        protocolo: json.codigo_verificacao ?? json.protocolo,
        pdfUrl: json.url ?? json.caminho_xml_nota_fiscal,
        xmlUrl: json.caminho_xml_nota_fiscal,
        payloadProvedor: json,
      };
    } catch (e: any) {
      return { sucesso: false, status: "ERRO", mensagem: e.message };
    }
  },

  async cancelar(d: DadosCancelamentoNFe): Promise<ResultadoCancelamento> {
    if (!d.apiKey) return { sucesso: false, mensagem: "Credencial Focus NFe nao cadastrada" };
    try {
      const r = await fetch(`${BASE(d.ambiente)}/v2/nfse/${encodeURIComponent(d.numeroExterno)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: authHeader(d.apiKey) },
        body: JSON.stringify({ justificativa: d.motivo }),
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, mensagem: json?.mensagem ?? `HTTP ${r.status}`, payloadProvedor: json };
      return { sucesso: true, cancelamentoId: json.codigo_cancelamento ?? json.numero_protocolo, payloadProvedor: json };
    } catch (e: any) {
      return { sucesso: false, mensagem: e.message };
    }
  },

  async consultar(ref, apiKey, ambiente): Promise<ResultadoEmissaoNFe> {
    try {
      const r = await fetch(`${BASE(ambiente)}/v2/nfse/${encodeURIComponent(ref)}`, {
        headers: { Authorization: authHeader(apiKey) },
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, status: "ERRO", mensagem: json?.mensagem };
      return {
        sucesso: true,
        status: json.status === "autorizado" ? "EMITIDA" : json.status === "cancelado" ? "ERRO" : "PROCESSANDO",
        numeroNota: json.numero,
        pdfUrl: json.url,
        payloadProvedor: json,
      };
    } catch (e: any) {
      return { sucesso: false, status: "ERRO", mensagem: e.message };
    }
  },
};
