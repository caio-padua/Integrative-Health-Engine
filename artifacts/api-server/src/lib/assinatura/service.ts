/**
 * AssinaturaService - orquestrador da osmose tecnica do modulo.
 * Le toggles, hidrata template, escolhe adapter (failover automatico),
 * persiste solicitacao + signatarios + webhook + notificacoes.
 *
 * Importante: textos institucionais, conteudo de templates e textos
 * juridicos NUNCA sao gerados aqui - sempre lidos do banco
 * (assinatura_textos_institucionais, assinatura_templates).
 */

import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getAdapter } from "./adapters";
import type {
  CanalDistribuicao,
  EventoWebhook,
  ProvedorCodigo,
  Signatario,
  SolicitacaoStatus,
} from "./types";

interface TogglesAdmin {
  provedor_principal_codigo: ProvedorCodigo;
  provedor_failover_codigo: ProvedorCodigo;
  failover_automatico: boolean;
  exigir_assinatura_medico: boolean;
  exigir_testemunhas: boolean;
  modo_testemunhas: "ALEATORIO" | "PAR_FIXO" | "MANUAL";
  par_fixo_id: number | null;
  enviar_por_email: boolean;
  enviar_por_whatsapp: boolean;
  arquivar_no_drive: boolean;
  drive_pasta_raiz_id: string;
  nomenclatura_pdf_padrao: string;
}

async function carregarToggles(): Promise<TogglesAdmin> {
  const r = await db.execute(sql`SELECT * FROM assinatura_toggles_admin WHERE id = 1 LIMIT 1`);
  const row = (r as unknown as { rows?: TogglesAdmin[] }).rows?.[0];
  if (!row) throw new Error("assinatura_toggles_admin singleton ausente. Rodar seed.");
  return row;
}

interface TemplateRow {
  id: number;
  codigo: string;
  nome_exibicao: string;
  tipo_documento: string;
  categoria: string;
  pasta_drive_destino: string;
  conteudo_html: string;
  placeholders: string[];
  exige_medico: boolean;
  exige_testemunhas: boolean;
  exige_clinica: boolean;
}
async function carregarTemplate(codigo: string): Promise<TemplateRow> {
  const r = await db.execute(sql`SELECT * FROM assinatura_templates WHERE codigo = ${codigo} AND ativo = true LIMIT 1`);
  const row = (r as unknown as { rows?: TemplateRow[] }).rows?.[0];
  if (!row) throw new Error(`Template ${codigo} nao encontrado ou inativo`);
  return row;
}

interface PacienteRow { id: number; nome: string; cpf: string | null; email: string | null; telefone: string; google_drive_folder_id: string | null; }
async function carregarPaciente(id: number): Promise<PacienteRow> {
  const r = await db.execute(sql`SELECT id, nome, cpf, email, telefone, google_drive_folder_id FROM pacientes WHERE id = ${id} LIMIT 1`);
  const row = (r as unknown as { rows?: PacienteRow[] }).rows?.[0];
  if (!row) throw new Error(`Paciente ${id} nao encontrado`);
  return row;
}

interface TestemunhaRow { id: number; nome_completo: string; cpf: string; email: string | null; telefone: string | null; ordem_assinatura: number; }
async function escolherTestemunhas(toggles: TogglesAdmin): Promise<TestemunhaRow[]> {
  if (toggles.modo_testemunhas === "PAR_FIXO" && toggles.par_fixo_id) {
    const r = await db.execute(sql`
      SELECT t.* FROM assinatura_testemunhas t
      JOIN assinatura_pares_testemunhas p
        ON t.id IN (p.testemunha_a_id, p.testemunha_b_id)
      WHERE p.id = ${toggles.par_fixo_id} AND t.ativa = true
      ORDER BY t.ordem_assinatura
    `);
    return ((r as unknown as { rows?: TestemunhaRow[] }).rows) || [];
  }
  if (toggles.modo_testemunhas === "ALEATORIO") {
    const r = await db.execute(sql`SELECT * FROM assinatura_testemunhas WHERE ativa = true ORDER BY random() LIMIT 2`);
    return ((r as unknown as { rows?: TestemunhaRow[] }).rows) || [];
  }
  return [];
}

function hidratarTemplate(template: TemplateRow, dados: Record<string, string>): string {
  let out = template.conteudo_html;
  for (const ph of template.placeholders) {
    out = out.replaceAll(`{{${ph}}}`, dados[ph] ?? `[${ph}]`);
  }
  return out;
}

function nomearPdf(modelo: string, vars: { tipo_doc: string; nome_paciente: string; provedor: string; status: string }): string {
  const yyyymmdd = new Date().toISOString().slice(0, 10);
  return modelo
    .replace("[YYYY-MM-DD]", `[${yyyymmdd}]`)
    .replace("[TIPO_DOC]", `[${vars.tipo_doc}]`)
    .replace("[NOME_PACIENTE]", `[${vars.nome_paciente.toUpperCase()}]`)
    .replace("[PROVEDOR]", `[${vars.provedor.toUpperCase()}]`)
    .replace("[STATUS]", `[${vars.status}]`);
}

export interface EnviarParams {
  pacienteId: number;
  templateCodigo: string;
  procedimento?: string;
  valorOrcamento?: string;
  riscos?: string;
  signatariosExtras?: Signatario[];
  forcarProvedor?: ProvedorCodigo;
  canais?: CanalDistribuicao[];
}

export interface EnviarResultado {
  solicitacaoId: number;
  envelopeId: string;
  provedorUsado: ProvedorCodigo;
  failoverAcionado: boolean;
  signatarios: Array<{ papel: string; nome: string; link?: string }>;
  pdfNomePadrao: string;
}

export class AssinaturaService {
  async enviar(p: EnviarParams): Promise<EnviarResultado> {
    const [toggles, template, paciente] = await Promise.all([
      carregarToggles(),
      carregarTemplate(p.templateCodigo),
      carregarPaciente(p.pacienteId),
    ]);

    const incluirTestemunhas = template.exige_testemunhas || toggles.exigir_testemunhas;
    const testemunhas = incluirTestemunhas ? await escolherTestemunhas(toggles) : [];

    // 1. Hidratar template
    const dados: Record<string, string> = {
      NOME_PACIENTE: paciente.nome,
      CPF_PACIENTE: paciente.cpf || "",
      NOME_MEDICO: process.env["MEDICO_PADRAO"] || "Dr. Caio Henrique Padua",
      NOME_CLINICA: process.env["CLINICA_PADRAO"] || "Instituto Padua",
      DATA_EXTENSO: new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
      PROCEDIMENTO: p.procedimento || "[A_DEFINIR]",
      VALOR_ORCAMENTO: p.valorOrcamento || "0,00",
      RISCOS: p.riscos || "[A_DEFINIR]",
      TESTEMUNHA_1_NOME: testemunhas[0]?.nome_completo || "",
      TESTEMUNHA_2_NOME: testemunhas[1]?.nome_completo || "",
    };
    const conteudoHidratado = hidratarTemplate(template, dados);
    const hashOriginal = createHash("sha256").update(conteudoHidratado).digest("hex");

    // 2. Montar signatarios
    const signatarios: Signatario[] = [];
    let ordem = 1;
    signatarios.push({ papel: "PACIENTE", nome: paciente.nome, cpf: paciente.cpf || undefined, email: paciente.email || undefined, telefone: paciente.telefone, ordem: ordem++ });
    if ((template.exige_medico || toggles.exigir_assinatura_medico) && process.env["MEDICO_EMAIL"]) {
      signatarios.push({ papel: "MEDICO", nome: dados["NOME_MEDICO"]!, email: process.env["MEDICO_EMAIL"], ordem: ordem++ });
    }
    if (template.exige_clinica && process.env["CLINICA_EMAIL"]) {
      signatarios.push({ papel: "CLINICA", nome: dados["NOME_CLINICA"]!, email: process.env["CLINICA_EMAIL"], ordem: ordem++ });
    }
    for (const t of testemunhas) {
      signatarios.push({ papel: "TESTEMUNHA", nome: t.nome_completo, cpf: t.cpf, email: t.email || undefined, telefone: t.telefone || undefined, ordem: ordem++ });
    }
    for (const s of (p.signatariosExtras || [])) signatarios.push({ ...s, ordem: ordem++ });

    // 3. Escolher provedor com failover automatico
    const ordemProvedores: ProvedorCodigo[] = p.forcarProvedor
      ? [p.forcarProvedor]
      : toggles.failover_automatico
        ? [toggles.provedor_principal_codigo, toggles.provedor_failover_codigo]
        : [toggles.provedor_principal_codigo];

    let envelopeId = "";
    let provedorUsado: ProvedorCodigo = ordemProvedores[0]!;
    let failoverAcionado = false;
    let linksAssinatura: Array<{ email: string; url: string }> = [];
    let ultimoErro: unknown;

    for (let i = 0; i < ordemProvedores.length; i++) {
      const cod = ordemProvedores[i]!;
      try {
        const adapter = getAdapter(cod);
        const r = await adapter.createDocumentEnvelope({
          templateCodigo: template.codigo, conteudoHtml: conteudoHidratado, hashOriginal, signatarios, metadata: { pacienteId: paciente.id },
        });
        await adapter.sendForSignature(r.envelopeId);
        envelopeId = r.envelopeId;
        provedorUsado = cod;
        failoverAcionado = i > 0;
        linksAssinatura = r.linksAssinatura;
        break;
      } catch (err) {
        ultimoErro = err;
      }
    }
    if (!envelopeId) throw new Error(`Todos provedores falharam. Ultimo: ${(ultimoErro as Error)?.message}`);

    // 4. Persistir solicitacao
    const canais = p.canais || (
      [toggles.enviar_por_email && "EMAIL", toggles.enviar_por_whatsapp && "WHATSAPP", toggles.arquivar_no_drive && "DRIVE"].filter(Boolean) as CanalDistribuicao[]
    );
    const parId = (template.exige_testemunhas && toggles.modo_testemunhas === "PAR_FIXO") ? toggles.par_fixo_id : null;

    const insRes = await db.execute(sql`
      INSERT INTO assinatura_solicitacoes
        (paciente_id, template_id, provedor_codigo, provedor_envelope_id, status,
         dados_hidratacao, hash_original, par_testemunhas_id, signatarios_snapshot,
         canais_distribuir, enviado_em, metadata)
      VALUES
        (${paciente.id}, ${template.id}, ${provedorUsado}, ${envelopeId}, 'ENVIADO',
         ${JSON.stringify(dados)}::jsonb, ${hashOriginal}, ${parId}, ${JSON.stringify(signatarios)}::jsonb,
         ${sql.raw(`ARRAY[${canais.map((c) => `'${c}'`).join(",") || "''"}]::text[]`)}, now(),
         ${JSON.stringify({ failoverAcionado, linksAssinatura })}::jsonb)
      RETURNING id
    `);
    const solicitacaoId = ((insRes as unknown as { rows?: Array<{ id: number }> }).rows || [])[0]?.id;
    if (!solicitacaoId) throw new Error("Falha ao persistir solicitacao");

    // 5. Persistir signatarios
    for (const s of signatarios) {
      const link = linksAssinatura.find((l) => l.email === s.email)?.url || null;
      await db.execute(sql`
        INSERT INTO assinatura_signatarios (solicitacao_id, papel, nome, cpf, email, telefone, ordem, status, link_assinatura)
        VALUES (${solicitacaoId}, ${s.papel}, ${s.nome}, ${s.cpf || null}, ${s.email || null}, ${s.telefone || null}, ${s.ordem}, 'ENVIADO', ${link})
      `);
    }

    // 6. Enfileirar notificacoes (status PENDENTE; worker externo faz o envio real)
    for (const canal of canais) {
      if (canal === "DRIVE") continue; // DRIVE eh feito no pos-assinatura
      const codTexto = canal === "EMAIL" ? "EMAIL_ENVIO_INICIAL" : "WHATSAPP_ENVIO_INICIAL";
      const tx = await db.execute(sql`SELECT assunto, corpo FROM assinatura_textos_institucionais WHERE codigo = ${codTexto}`);
      const txt = ((tx as unknown as { rows?: Array<{ assunto: string | null; corpo: string }> }).rows || [])[0];
      const destinatario = canal === "EMAIL" ? paciente.email : paciente.telefone;
      if (!destinatario || !txt) continue;
      const corpo = txt.corpo.replaceAll("{{NOME}}", paciente.nome.split(" ")[0] || paciente.nome);
      await db.execute(sql`
        INSERT INTO assinatura_notificacoes (solicitacao_id, canal, momento, destinatario, assunto, corpo, status)
        VALUES (${solicitacaoId}, ${canal}, 'ENVIO_INICIAL', ${destinatario}, ${txt.assunto}, ${corpo}, 'PENDENTE')
      `);
    }

    const pdfNomePadrao = nomearPdf(toggles.nomenclatura_pdf_padrao, {
      tipo_doc: template.tipo_documento, nome_paciente: paciente.nome, provedor: provedorUsado, status: "PENDENTE_ASSINATURA",
    });

    return {
      solicitacaoId, envelopeId, provedorUsado, failoverAcionado, pdfNomePadrao,
      signatarios: signatarios.map((s) => ({ papel: s.papel, nome: s.nome, link: linksAssinatura.find((l) => l.email === s.email)?.url })),
    };
  }

  async consultarStatus(solicitacaoId: number): Promise<{ status: SolicitacaoStatus; provedor: ProvedorCodigo; envelopeId: string; pdfAssinadoUrl?: string }> {
    const r = await db.execute(sql`SELECT provedor_codigo, provedor_envelope_id, status, pdf_assinado_url FROM assinatura_solicitacoes WHERE id = ${solicitacaoId}`);
    const row = ((r as unknown as { rows?: Array<{ provedor_codigo: ProvedorCodigo; provedor_envelope_id: string; status: SolicitacaoStatus; pdf_assinado_url: string | null }> }).rows || [])[0];
    if (!row) throw new Error("Solicitacao nao encontrada");
    if (row.status === "CONCLUIDO" || row.status === "REJEITADO") {
      return { status: row.status, provedor: row.provedor_codigo, envelopeId: row.provedor_envelope_id, pdfAssinadoUrl: row.pdf_assinado_url || undefined };
    }
    const adapter = getAdapter(row.provedor_codigo);
    const live = await adapter.getDocumentStatus(row.provedor_envelope_id);
    if (live.status !== row.status || live.pdfAssinadoUrl) {
      await db.execute(sql`UPDATE assinatura_solicitacoes SET status = ${live.status}, pdf_assinado_url = COALESCE(${live.pdfAssinadoUrl ?? null}, pdf_assinado_url), atualizado_em = now() WHERE id = ${solicitacaoId}`);
    }
    return { status: live.status, provedor: row.provedor_codigo, envelopeId: row.provedor_envelope_id, pdfAssinadoUrl: live.pdfAssinadoUrl };
  }

  async receberWebhook(provedor: ProvedorCodigo, rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<{ ok: boolean; eventoId: number; duplicado: boolean }> {
    const adapter = getAdapter(provedor);
    const evento: EventoWebhook = await adapter.handleWebhook(rawBody, headers);

    const ins = await db.execute(sql`
      INSERT INTO assinatura_webhook_eventos (provedor_codigo, event_id, event_type, envelope_id, payload_bruto, signature_header, signature_valida, processado)
      VALUES (${provedor}, ${evento.eventId}, ${evento.eventType}, ${evento.envelopeId ?? null}, ${JSON.stringify(evento.payload)}::jsonb,
              ${(headers[adapter["signatureHeaderName"]?.() as string] as string) || null}, ${evento.signatureValid}, false)
      ON CONFLICT (provedor_codigo, event_id) DO NOTHING
      RETURNING id
    `);
    const rows = (ins as unknown as { rows?: Array<{ id: number }> }).rows || [];
    if (rows.length === 0) return { ok: true, eventoId: 0, duplicado: true };
    const eventoId = rows[0]!.id;

    if (!evento.signatureValid) {
      await db.execute(sql`UPDATE assinatura_webhook_eventos SET processado = true, processado_em = now(), erro_processamento = 'signature_invalid' WHERE id = ${eventoId}`);
      return { ok: false, eventoId, duplicado: false };
    }

    // Eventos de conclusao: ZapSign envia "signed"; Clicksign envia "auto_close" / "sign" / "finish".
    if (evento.envelopeId && /sign|close|finish|complet/i.test(evento.eventType)) {
      const sol = await db.execute(sql`SELECT id, paciente_id FROM assinatura_solicitacoes WHERE provedor_envelope_id = ${evento.envelopeId} AND provedor_codigo = ${provedor} LIMIT 1`);
      const solRow = ((sol as unknown as { rows?: Array<{ id: number; paciente_id: number }> }).rows || [])[0];
      if (solRow) {
        try {
          const pdf = await adapter.downloadSignedArtifact(evento.envelopeId);
          const hashAssinado = createHash("sha256").update(pdf).digest("hex");
          await db.execute(sql`UPDATE assinatura_solicitacoes SET status = 'CONCLUIDO', concluido_em = now(), hash_assinado = ${hashAssinado}, atualizado_em = now() WHERE id = ${solRow.id}`);
          await db.execute(sql`UPDATE assinatura_webhook_eventos SET solicitacao_id = ${solRow.id} WHERE id = ${eventoId}`);

          const tx = await db.execute(sql`SELECT corpo FROM assinatura_textos_institucionais WHERE codigo = 'WHATSAPP_POS_ASSINATURA'`);
          const txt = ((tx as unknown as { rows?: Array<{ corpo: string }> }).rows || [])[0];
          const pac = await db.execute(sql`SELECT nome, telefone, email FROM pacientes WHERE id = ${solRow.paciente_id}`);
          const pacRow = ((pac as unknown as { rows?: Array<{ nome: string; telefone: string; email: string | null }> }).rows || [])[0];
          if (txt && pacRow) {
            const corpo = txt.corpo.replaceAll("{{NOME}}", pacRow.nome.split(" ")[0] || pacRow.nome);
            await db.execute(sql`INSERT INTO assinatura_notificacoes (solicitacao_id, canal, momento, destinatario, corpo, status) VALUES (${solRow.id}, 'WHATSAPP', 'POS_ASSINATURA', ${pacRow.telefone}, ${corpo}, 'PENDENTE')`);
            if (pacRow.email) await db.execute(sql`INSERT INTO assinatura_notificacoes (solicitacao_id, canal, momento, destinatario, assunto, corpo, status) VALUES (${solRow.id}, 'EMAIL', 'POS_ASSINATURA', ${pacRow.email}, 'INSTITUTO PADUA | DOCUMENTO ASSINADO', ${corpo}, 'PENDENTE')`);
            await db.execute(sql`INSERT INTO assinatura_notificacoes (solicitacao_id, canal, momento, destinatario, corpo, status) VALUES (${solRow.id}, 'DRIVE', 'POS_ASSINATURA', 'drive://paciente/' || ${solRow.paciente_id}, 'PDF assinado pronto para arquivamento', 'PENDENTE')`);
          }
        } catch (err) {
          await db.execute(sql`UPDATE assinatura_webhook_eventos SET erro_processamento = ${(err as Error).message} WHERE id = ${eventoId}`);
        }
      }
    }
    await db.execute(sql`UPDATE assinatura_webhook_eventos SET processado = true, processado_em = now() WHERE id = ${eventoId}`);
    return { ok: true, eventoId, duplicado: false };
  }
}

export const assinaturaService = new AssinaturaService();
