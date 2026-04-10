import { Router } from "express";
import { db } from "@workspace/db";
import { pacientesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const CATEGORIAS_UPLOAD: Record<string, string> = {
  "EXAME DE SANGUE": "EXAMES",
  "ULTRASSOM": "EXAMES",
  "COMPROVANTE DE PAGAMENTO": "FINANCEIRO",
  "FOTO / IMAGEM": "IMAGENS",
  "RECEITA": "RECEITAS",
  "LAUDO": "LAUDOS",
  "ATESTADO": "ATESTADOS",
  "CONTRATO": "CONTRATOS",
  "OUTRO": "CADASTRO",
};

router.get("/portal/categorias", async (_req, res) => {
  res.json(Object.keys(CATEGORIAS_UPLOAD));
});

router.post("/portal/identificar", async (req, res) => {
  const { cpf, dataNascimento } = req.body;
  if (!cpf || !dataNascimento) {
    res.status(400).json({ error: "CPF e data de nascimento obrigatorios" });
    return;
  }

  const cpfLimpo = cpf.replace(/\D/g, "");

  const pacientes = await db.select().from(pacientesTable);
  const paciente = pacientes.find(p => {
    const pCpfLimpo = (p.cpf || "").replace(/\D/g, "");
    return pCpfLimpo === cpfLimpo;
  });

  if (!paciente) {
    res.status(401).json({ error: "Dados nao conferem. Verifique CPF e data de nascimento." });
    return;
  }

  if (paciente.dataNascimento) {
    const dbDate = String(paciente.dataNascimento);
    const inputDate = String(dataNascimento);
    if (dbDate !== inputDate) {
      res.status(401).json({ error: "Dados nao conferem. Verifique CPF e data de nascimento." });
      return;
    }
  }

  res.json({
    id: paciente.id,
    nome: paciente.nome,
    categorias: Object.keys(CATEGORIAS_UPLOAD),
  });
});

router.post("/portal/upload/:pacienteId", async (req, res) => {
  const pacienteId = Number(req.params.pacienteId);
  const { categoria, arquivo, nomeArquivo, mimeType } = req.body;

  if (!categoria || !arquivo || !nomeArquivo) {
    res.status(400).json({ error: "Categoria, arquivo (base64) e nomeArquivo obrigatorios" });
    return;
  }

  const subfolder = CATEGORIAS_UPLOAD[categoria] || "CADASTRO";

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) { res.status(404).json({ error: "Cliente nao encontrado" }); return; }

  try {
    const driveBaseUrl = `/api/google-drive/upload/${pacienteId}/${subfolder}`;
    res.json({
      success: true,
      driveUploadUrl: driveBaseUrl,
      subfolder,
      pacienteId,
      nomeArquivo,
      mensagem: `Arquivo '${nomeArquivo}' preparado para upload na pasta ${subfolder}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao processar upload" });
  }
});

export default router;
