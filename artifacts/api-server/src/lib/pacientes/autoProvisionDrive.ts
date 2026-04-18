/**
 * Hook fire-and-forget para provisionar pasta Drive + planilha GPS+RAS
 * automaticamente apos cadastro de paciente.
 *
 * Onda 6.4 - Caio: "criar a pasta NOTAS FISCAIS e colocar como padrao
 * toda vez que o paciente for gerado".
 *
 * Chamado em background apos POST /pacientes - se Drive falhar, paciente
 * continua cadastrado e log de erro aparece nos logs do servidor (nao
 * bloqueia o fluxo de cadastro).
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getOrCreateClientFolder } from "../google-drive";
import { criarPlanilhaGPS_RAS } from "../sheets/planilhaPacienteGPS";

export function autoProvisionDriveAsync(paciente: { id: number; nome: string; cpf: string | null; googleDriveFolderId?: string | null }): void {
  // fire and forget
  void (async () => {
    try {
      if (paciente.googleDriveFolderId) return; // ja provisionado
      const folder = await getOrCreateClientFolder(paciente.nome, paciente.cpf || "SEM-CPF");
      await db.execute(sql`UPDATE pacientes SET google_drive_folder_id = ${folder.folderId} WHERE id = ${paciente.id}`);
      try {
        await criarPlanilhaGPS_RAS({ pacienteNome: paciente.nome, pacienteCpf: paciente.cpf || "SEM-CPF", clientFolderId: folder.folderId });
      } catch (e) {
        console.error(`[autoProvisionDrive] Falha ao criar planilha GPS para paciente ${paciente.id}:`, (e as Error).message);
      }
      console.log(`[autoProvisionDrive] Paciente ${paciente.id} provisionado: pasta + planilha GPS+RAS criadas`);
    } catch (e) {
      console.error(`[autoProvisionDrive] Falha provisionamento paciente ${paciente.id}:`, (e as Error).message);
    }
  })();
}
