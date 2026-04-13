import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessoesTable, aplicacoesSubstanciasTable,
  pacientesTable, substanciasTable, usuariosTable, unidadesTable,
  rasEvolutivoTable, tratamentosTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { gerarPdfRAS } from "../pdf/gerarRAS.js";
import { uploadToClientSubfolder } from "../lib/google-drive.js";
import { sendEmailWithPdf } from "../lib/google-gmail.js";
import { buildRasEmailHtml, buildRasWhatsappMessage } from "../lib/ras-email-template.js";

const router = Router();

function rasFileName(date: Date, pacienteNome: string, tipoRas: string, resumo?: string): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const nome = pacienteNome.toUpperCase().replace(/\s+/g, '_').substring(0, 40);
  const tipo = tipoRas.toUpperCase().replace(/[\s-]+/g, '_');
  const resumoClean = resumo
    ? resumo.toUpperCase().split(/\s+/).slice(0, 3).join('_')
    : '';
  if (resumoClean) {
    return `${yy}.${mm}.${dd} RAS ${tipo} ${nome} (${resumoClean}).pdf`;
  }
  return `${yy}.${mm}.${dd} RAS ${tipo} ${nome}.pdf`;
}

router.post("/ras/distribuir/:sessaoId", async (req, res) => {
  try {
    const sessaoId = Number(req.params.sessaoId);
    if (!Number.isFinite(sessaoId)) {
      res.status(400).json({ error: "sessaoId invalido" });
      return;
    }

    const {
      enviarEmail = true,
      enviarWhatsapp = false,
      salvarDrive = true,
      tipoRas = 'evolutivo',
      resumo,
      secoesAtivas,
    } = req.body as {
      enviarEmail?: boolean;
      enviarWhatsapp?: boolean;
      salvarDrive?: boolean;
      tipoRas?: 'evolutivo' | 'documental' | 'pos-procedimento';
      resumo?: string;
      secoesAtivas?: string[];
    };

    const [sessaoData] = await db
      .select({
        sessao: sessoesTable,
        pacienteNome: pacientesTable.nome,
        pacienteCpf: pacientesTable.cpf,
        pacienteEmail: pacientesTable.email,
        pacienteCelular: pacientesTable.celular,
        pacienteIdade: pacientesTable.idade,
        pacienteDriveFolderId: pacientesTable.googleDriveFolderId,
        profissionalNome: usuariosTable.nome,
        profissionalCrm: usuariosTable.crm,
        unidadeNome: unidadesTable.nome,
        unidadeEndereco: unidadesTable.endereco,
      })
      .from(sessoesTable)
      .leftJoin(pacientesTable, eq(sessoesTable.pacienteId, pacientesTable.id))
      .leftJoin(usuariosTable, eq(sessoesTable.profissionalId, usuariosTable.id))
      .leftJoin(unidadesTable, eq(sessoesTable.unidadeId, unidadesTable.id))
      .where(eq(sessoesTable.id, sessaoId));

    if (!sessaoData) {
      res.status(404).json({ error: "Sessao nao encontrada" });
      return;
    }

    const aplicacoes = await db
      .select({
        aplicacao: aplicacoesSubstanciasTable,
        substanciaNome: substanciasTable.nome,
        substanciaAbreviacao: substanciasTable.abreviacao,
        substanciaVia: substanciasTable.via,
        substanciaCor: substanciasTable.cor,
        substanciaDosePadrao: substanciasTable.dosePadrao,
        substanciaCategoria: substanciasTable.categoria,
        substanciaDescricao: substanciasTable.descricao,
        substanciaFuncaoPrincipal: substanciasTable.funcaoPrincipal,
        substanciaEfeitosPercebidos: substanciasTable.efeitosPercebidos,
        substanciaTempoParaEfeito: substanciasTable.tempoParaEfeito,
      })
      .from(aplicacoesSubstanciasTable)
      .leftJoin(substanciasTable, eq(aplicacoesSubstanciasTable.substanciaId, substanciasTable.id))
      .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));

    const substanciasAplicadas = aplicacoes.filter(a => a.aplicacao.status === 'aplicada').length;
    const substanciasTotal = aplicacoes.length;

    let sessaoAtual: number | undefined;
    let totalSessoes: number | undefined;
    let aderencia: number | undefined;
    let nomeProtocolo = sessaoData.sessao.tipoProcedimento || 'PROTOCOLO PERSONALIZADO';
    let proximaSessao: string | undefined;

    if (sessaoData.sessao.protocoloId) {
      const todasSessoes = await db
        .select()
        .from(sessoesTable)
        .where(eq(sessoesTable.protocoloId, sessaoData.sessao.protocoloId!))
        .orderBy(sessoesTable.dataAgendada);

      totalSessoes = todasSessoes.length;
      const idx = todasSessoes.findIndex(s => s.id === sessaoId);
      sessaoAtual = idx >= 0 ? idx + 1 : undefined;

      const concluidas = todasSessoes.filter(s => s.status === 'concluida').length;
      if (totalSessoes > 0) {
        aderencia = Math.round((concluidas / totalSessoes) * 100);
      }

      if (idx >= 0 && idx < todasSessoes.length - 1) {
        const prox = todasSessoes[idx + 1];
        if (prox.dataAgendada) {
          const [y, m, d] = prox.dataAgendada.split('-');
          proximaSessao = `${d}/${m}/${y}` + (prox.horaAgendada ? ` as ${prox.horaAgendada}` : '');
        }
      }

      const [tratamento] = await db
        .select()
        .from(tratamentosTable)
        .where(eq(tratamentosTable.protocoloId, sessaoData.sessao.protocoloId!))
        .limit(1);
      if (tratamento?.nome) {
        nomeProtocolo = tratamento.nome;
      }
    }

    const dataFormatada = (() => {
      const d = sessaoData.sessao.dataAgendada;
      if (!d) return new Date().toLocaleDateString('pt-BR');
      const [y, m, dd] = d.split('-');
      return `${dd}/${m}/${y}`;
    })();

    const medicoNome = sessaoData.profissionalNome
      ? (sessaoData.profissionalCrm
          ? `Dr(a). ${sessaoData.profissionalNome} — ${sessaoData.profissionalCrm}`
          : `Dr(a). ${sessaoData.profissionalNome}`)
      : 'Equipe Medica';

    const dadosRAS = {
      nomePaciente: sessaoData.pacienteNome || 'PACIENTE',
      cpfPaciente: sessaoData.pacienteCpf || '',
      celularPaciente: sessaoData.pacienteCelular || '',
      idadePaciente: sessaoData.pacienteIdade || null,
      medicoResponsavel: sessaoData.profissionalNome || 'EQUIPE MEDICA',
      crmMedico: sessaoData.profissionalCrm || '',
      enfermeira: 'N/A',
      agenda: sessaoData.unidadeNome || '',
      unidadeEndereco: sessaoData.unidadeEndereco || '',
      dataAtendimento: sessaoData.sessao.dataAgendada || new Date().toISOString().split('T')[0],
      nomeProtocolo,
      substancias: aplicacoes.map(a => ({
        nome: a.substanciaNome || '',
        abreviacao: a.substanciaAbreviacao || (a.substanciaNome || '').substring(0, 4).toUpperCase(),
        qtde: 1,
        frequenciaDias: 7,
        dataInicio: sessaoData.sessao.dataAgendada || '',
        via: a.substanciaVia || 'im',
        cor: a.substanciaCor || '#2196F3',
        dosePadrao: a.substanciaDosePadrao || a.aplicacao.dose || '',
        categoria: a.substanciaCategoria || '',
        descricao: a.substanciaDescricao || '',
        funcaoPrincipal: a.substanciaFuncaoPrincipal || '',
        efeitosPercebidos: a.substanciaEfeitosPercebidos || '',
        tempoParaEfeito: a.substanciaTempoParaEfeito || '',
        beneficioLongevidade: '',
        impactoQualidadeVida: '',
        beneficioSono: '',
        beneficioEnergia: '',
        beneficioLibido: '',
        performanceFisica: '',
        forcaMuscular: '',
        clarezaMental: '',
        peleCabeloUnhas: '',
        suporteImunologico: '',
        contraindicacoes: '',
        evidenciaCientifica: '',
        efeitosSistemasCorporais: {},
      })),
      marcacoes: [],
    };

    const pdfBuffer = await gerarPdfRAS(dadosRAS);

    const now = new Date();
    const filename = rasFileName(now, sessaoData.pacienteNome || 'PACIENTE', tipoRas, resumo);

    const results: {
      drive?: { fileId: string; fileUrl: string; subfolder: string; filename: string };
      email?: { messageId: string; sentTo: string };
      whatsapp?: { sent: boolean; message: string };
      pdf: { filename: string; sizeKb: number };
    } = {
      pdf: { filename, sizeKb: Math.round(pdfBuffer.length / 1024) },
    };

    if (salvarDrive && sessaoData.pacienteDriveFolderId) {
      try {
        const subfolder = 'PROTOCOLOS';
        const result = await uploadToClientSubfolder({
          clientFolderId: sessaoData.pacienteDriveFolderId,
          subfolder,
          fileName: filename,
          content: pdfBuffer,
          mimeType: 'application/pdf',
        });
        results.drive = {
          fileId: result.fileId,
          fileUrl: result.fileUrl || `https://drive.google.com/file/d/${result.fileId}/view`,
          subfolder,
          filename,
        };
      } catch (err: any) {
        console.error('[RAS Distribuir] Drive upload error:', err.message);
      }
    }

    if (enviarEmail && sessaoData.pacienteEmail) {
      try {
        const { subject, html } = buildRasEmailHtml({
          pacienteNome: sessaoData.pacienteNome || 'PACIENTE',
          protocolo: nomeProtocolo,
          sessaoAtual,
          totalSessoes,
          aderencia,
          substanciasAplicadas,
          substanciasTotal,
          proximaSessao,
          medicoNome,
          unidade: sessaoData.unidadeNome || '',
          data: dataFormatada,
          tipoRas,
        });

        const emailResult = await sendEmailWithPdf(
          sessaoData.pacienteEmail,
          subject,
          html,
          pdfBuffer,
          filename
        );

        results.email = {
          messageId: emailResult.id,
          sentTo: sessaoData.pacienteEmail,
        };
      } catch (err: any) {
        console.error('[RAS Distribuir] Email error:', err.message);
      }
    }

    if (enviarWhatsapp && sessaoData.pacienteCelular) {
      const mensagem = buildRasWhatsappMessage({
        pacienteNome: sessaoData.pacienteNome || 'PACIENTE',
        protocolo: nomeProtocolo,
        sessaoAtual,
        totalSessoes,
        aderencia,
        data: dataFormatada,
        medicoNome,
        tipoRas,
      });

      results.whatsapp = {
        sent: false,
        message: mensagem,
      };
    }

    res.json({
      success: true,
      sessaoId,
      tipoRas,
      toggles: { enviarEmail, enviarWhatsapp, salvarDrive },
      secoesAtivas: secoesAtivas || ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11'],
      ...results,
    });

  } catch (err: any) {
    console.error('[RAS Distribuir] Error:', err.message);
    res.status(500).json({ error: "Erro ao distribuir RAS", details: err.message });
  }
});

router.get("/ras/distribuir/preview-filename", (req, res) => {
  const { pacienteNome, tipoRas, resumo } = req.query;
  const filename = rasFileName(
    new Date(),
    String(pacienteNome || 'PACIENTE'),
    String(tipoRas || 'EVOLUTIVO'),
    resumo ? String(resumo) : undefined
  );
  res.json({ filename, convention: 'YY.MM.DD RAS TIPO PACIENTE (RESUMO).pdf' });
});

export default router;
