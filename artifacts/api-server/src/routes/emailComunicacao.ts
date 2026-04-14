import { Router, Request, Response } from "express";
import { ACOES_EMAIL, buildEmail, buildWhatsappFormal, type AcaoEmail, type EmailOpts } from "../lib/email-templates";
import { sendEmailWithPdf } from "../lib/google-gmail";
import { db, pacientesTable, unidadesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/email-comunicacao/acoes", (_req: Request, res: Response) => {
  const acoes = Object.entries(ACOES_EMAIL).map(([codigo, dados]) => ({
    codigo,
    ...dados,
  }));
  res.json(acoes);
});

router.post("/email-comunicacao/preview", (req: Request, res: Response) => {
  try {
    const opts = req.body as EmailOpts;
    if (!opts.nick || !opts.medicoNome || !opts.pacienteNome || !opts.acao) {
      res.status(400).json({ error: "Campos obrigatorios: nick, medicoNome, pacienteNome, acao, tipoDocumento" });
      return;
    }
    const email = buildEmail(opts);
    const whatsapp = buildWhatsappFormal(opts);
    res.json({ subject: email.subject, html: email.html, whatsapp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/email-comunicacao/enviar", async (req: Request, res: Response): Promise<void> => {
  try {
    const { toEmail, opts, pdfUrl } = req.body as {
      toEmail: string;
      opts: EmailOpts;
      pdfUrl?: string;
    };

    if (!toEmail || !opts?.nick || !opts?.medicoNome || !opts?.pacienteNome || !opts?.acao) {
      res.status(400).json({ error: "Campos obrigatorios: toEmail, opts (nick, medicoNome, pacienteNome, acao, tipoDocumento)" });
      return;
    }

    const email = buildEmail(opts);

    if (pdfUrl) {
      const pdfRes = await fetch(`http://localhost:${process.env.PORT || 8080}${pdfUrl}`);
      if (!pdfRes.ok) {
        res.status(400).json({ error: `PDF nao encontrado: ${pdfUrl}` });
        return;
      }
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      const filename = `${opts.nick.replace(/\s/g, '_')}_${opts.tipoDocumento.replace(/\s/g, '_')}_${opts.data || 'doc'}.pdf`;
      const result = await sendEmailWithPdf(toEmail, email.subject, email.html, pdfBuffer, filename);
      res.json({ ok: true, messageId: result.id, subject: email.subject });
    } else {
      const { getGmailClient } = await import("../lib/google-gmail");
      const gmail = await getGmailClient();
      const raw = Buffer.from(
        `From: PAWARDS - ${opts.nick} <clinica.padua.agenda@gmail.com>\r\n` +
        `To: ${toEmail}\r\n` +
        `Subject: =?UTF-8?B?${Buffer.from(email.subject).toString('base64')}?=\r\n` +
        'MIME-Version: 1.0\r\n' +
        'Content-Type: text/html; charset=UTF-8\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        Buffer.from(email.html).toString('base64')
      ).toString('base64url');

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
      res.json({ ok: true, messageId: result.data.id, subject: email.subject });
    }
  } catch (err: any) {
    console.error("Erro enviar email comunicacao:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/email-comunicacao/whatsapp-preview", (req: Request, res: Response) => {
  try {
    const opts = req.body as EmailOpts;
    if (!opts.nick || !opts.medicoNome || !opts.pacienteNome || !opts.acao) {
      res.status(400).json({ error: "Campos obrigatorios: nick, medicoNome, pacienteNome, acao" });
      return;
    }
    const mensagem = buildWhatsappFormal(opts);
    const telefone = (opts.whatsapp || "").replace(/\D/g, "");
    const telefoneInt = telefone.startsWith("55") ? telefone : `55${telefone}`;
    const waUrl = telefone ? `https://wa.me/${telefoneInt}?text=${encodeURIComponent(mensagem)}` : null;
    res.json({ mensagem, waUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
