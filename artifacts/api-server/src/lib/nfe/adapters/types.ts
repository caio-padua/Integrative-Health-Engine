export interface DadosEmissaoNFe {
  unidadeId: number;
  pacienteNome: string;
  pacienteCpf?: string | null;
  valor: number;
  descricao: string;
  serviceCode?: string;
  numeroExterno?: string;
  logotipoUrl?: string | null;
  cnpjEmissor?: string;
  inscricaoMunicipal?: string;
  ambiente: "homologacao" | "producao";
  apiKey: string;
  metadata?: Record<string, any>;
}

export interface ResultadoEmissaoNFe {
  sucesso: boolean;
  numeroNota?: string;
  protocolo?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  status: "PROCESSANDO" | "EMITIDA" | "ERRO";
  mensagem?: string;
  payloadProvedor?: any;
}

export interface DadosCancelamentoNFe {
  numeroExterno: string;
  motivo: string;
  apiKey: string;
  ambiente: "homologacao" | "producao";
}

export interface ResultadoCancelamento {
  sucesso: boolean;
  cancelamentoId?: string;
  mensagem?: string;
  payloadProvedor?: any;
}

export interface ProvedorNFeAdapter {
  codigo: string;
  emitir(dados: DadosEmissaoNFe): Promise<ResultadoEmissaoNFe>;
  cancelar(dados: DadosCancelamentoNFe): Promise<ResultadoCancelamento>;
  consultar(numeroExterno: string, apiKey: string, ambiente: "homologacao" | "producao"): Promise<ResultadoEmissaoNFe>;
}
