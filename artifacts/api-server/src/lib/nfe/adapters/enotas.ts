import type {
  ProvedorNFeAdapter,
  DadosEmissaoNFe,
  DadosCancelamentoNFe,
  ResultadoEmissaoNFe,
  ResultadoCancelamento,
} from "./types";

const BASE = "https://api.enotasgw.com.br/v2";

export const enotasAdapter: ProvedorNFeAdapter = {
  codigo: "enotas",

  async emitir(d: DadosEmissaoNFe): Promise<ResultadoEmissaoNFe> {
    if (!d.apiKey) return { sucesso: false, status: "ERRO", mensagem: "Credencial eNotas nao cadastrada para esta unidade" };
    const empresaId = d.metadata?.["empresaId"];
    if (!empresaId) return { sucesso: false, status: "ERRO", mensagem: "metadata.empresaId obrigatorio (cadastro eNotas)" };

    const ref = d.numeroExterno ?? `PAW-${Date.now()}-${d.unidadeId}`;
    const body = {
      tipo: "NFS-e",
      idExterno: ref,
      ambienteEmissao: d.ambiente === "producao" ? "Producao" : "Homologacao",
      cliente: {
        nome: d.pacienteNome,
        cpfCnpj: d.pacienteCpf?.replace(/\D/g, "") ?? "",
        tipoPessoa: "F",
      },
      servico: {
        descricao: d.descricao,
        valorTotal: d.valor,
        codigoServicoMunicipio: d.serviceCode ?? "",
      },
    };

    try {
      const r = await fetch(`${BASE}/empresas/${empresaId}/nfes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${d.apiKey}` },
        body: JSON.stringify(body),
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, status: "ERRO", mensagem: json?.mensagem ?? `HTTP ${r.status}`, payloadProvedor: json };
      return {
        sucesso: true,
        status: "PROCESSANDO",
        numeroNota: ref,
        protocolo: json.id,
        payloadProvedor: json,
      };
    } catch (e: any) {
      return { sucesso: false, status: "ERRO", mensagem: e.message };
    }
  },

  async cancelar(d: DadosCancelamentoNFe): Promise<ResultadoCancelamento> {
    if (!d.apiKey) return { sucesso: false, mensagem: "Credencial eNotas nao cadastrada" };
    try {
      const r = await fetch(`${BASE}/nfes/${encodeURIComponent(d.numeroExterno)}/cancelamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${d.apiKey}` },
        body: JSON.stringify({ motivo: d.motivo }),
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, mensagem: json?.mensagem ?? `HTTP ${r.status}`, payloadProvedor: json };
      return { sucesso: true, cancelamentoId: json.id, payloadProvedor: json };
    } catch (e: any) {
      return { sucesso: false, mensagem: e.message };
    }
  },

  async consultar(ref, apiKey, _amb): Promise<ResultadoEmissaoNFe> {
    try {
      const r = await fetch(`${BASE}/nfes/porIdExterno/${encodeURIComponent(ref)}`, {
        headers: { Authorization: `Basic ${apiKey}` },
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, status: "ERRO", mensagem: json?.mensagem };
      return {
        sucesso: true,
        status: json.status === "Autorizada" ? "EMITIDA" : json.status === "Cancelada" ? "ERRO" : "PROCESSANDO",
        numeroNota: json.numero,
        pdfUrl: json.linkDownloadPDF,
        xmlUrl: json.linkDownloadXML,
        payloadProvedor: json,
      };
    } catch (e: any) {
      return { sucesso: false, status: "ERRO", mensagem: e.message };
    }
  },
};

export function getAdapterByCodigo(codigo: string): ProvedorNFeAdapter | null {
  if (codigo === "focus_nfe") return require("./focus").focusAdapter;
  if (codigo === "enotas") return enotasAdapter;
  return null;
}
