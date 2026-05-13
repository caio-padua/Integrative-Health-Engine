/**
 * Hook fire-and-forget para provisionar pasta Drive do paciente.
 *
 * Wave Cadastro Pádua — 13/mai/2026 (Caio madrugada autônoma)
 *
 * Mudanças vs Onda 6.4 anterior:
 *  - Hierarquia nova: PAWARDS > GESTAO CLINICA > EMPRESAS > [CLINICA] > CLIENTES [CLINICA] > [paciente]
 *  - Lazy create: SÓ cria a pasta-raiz do paciente. As 7 categorias macro
 *    + ~17 sub-subpastas são criadas on-demand quando o sistema vai gravar
 *    o 1º arquivo daquela categoria (ver lib/arquivos/drive.ts).
 *  - Pasta-raiz nomeada via código semântico: "PADU-VIEI-ACEL-FEMI-1945-8420 ACELI GOMES VIEIRA"
 *  - Planilha GPS+RAS é provisionada SOB DEMANDA (não no cadastro), pra
 *    importação dos 4.278 não estourar quota Drive.
 *
 * Se Drive falhar, paciente continua cadastrado (não bloqueia o fluxo).
 */

import { getOrCreatePacienteRootFolder } from "../arquivos/drive";

export interface AutoProvisionParams {
  id: number;
  nome: string;
  codigoSemantico: string;
  unidadeId: number;
  jaProvisionado?: boolean;
}

export function autoProvisionDriveAsync(p: AutoProvisionParams): void {
  if (p.jaProvisionado) return;
  void (async () => {
    try {
      const folderId = await getOrCreatePacienteRootFolder({
        id: p.id,
        nome: p.nome,
        codigoSemantico: p.codigoSemantico,
        unidadeId: p.unidadeId,
      });
      console.log(`[autoProvisionDrive] Paciente ${p.id} pasta-raiz OK: ${folderId}`);
    } catch (e) {
      console.error(`[autoProvisionDrive] Falha provisionamento paciente ${p.id}:`, (e as Error).message);
    }
  })();
}
