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
  /**
   * External ID estavel pra reconciliacao webhook -> dominio. Se ausente,
   * gerado como `${templateCodigo}-${pacienteId}-${Date.now()}`.
   * Use-cases que precisam de chave deterministica (ex: F3.C orcamento por
   * receita) devem passar algo como `orc-${receitaId}-${ts}`.
   */
  externalId?: string;
  /**
   * Metadata extra mergeada no INSERT inicial da assinatura_solicitacoes.
   * Garante atomicidade pra dedupe/reconciliacao por chaves de dominio
   * (ex: { receitaId: 8725, familia: 3, wave: 10 }) — evita UPDATE separado
   * que cria janela de race entre INSERT e enriquecimento da metadata.
   */
  metadataExtra?: Record<string, unknown>;
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
    // Wave 10 Sujeira C fix (Caminho 1 Dr. Claude 11/mai/2026): gera PDF real
    // via pdfkit a partir do HTML hidratado. Adapters NAO devem mais receber
    // HTML cru — ZapSign trava o leitor de PDF tentando parsear <h1>...</h1>.
    const { htmlParaPdfBase64 } = await import("./htmlParaPdf");
    const pdfBase64Render = await htmlParaPdfBase64(conteudoHidratado);

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

    // External ID estavel — gerado ANTES do create pra ser propagado ao
    // provedor (ZapSign external_id) e persistido no mesmo registro do banco,
    // permitindo reconciliacao webhook -> dominio sem ambiguidade.
    // Use-cases podem passar externalId deterministico (ex: F3.C orcamento
    // usa `orc-${receitaId}-${ts}`) pra reconciliacao 1:1 com entidade dominio.
    const externalId = p.externalId || `${template.codigo}-${paciente.id}-${Date.now()}`;

    // Decisao de canais antecipada — alimenta enviarWhatsappAutomatico do
    // payload pro adapter respeitar o toggle (em vez de assumir true sempre).
    const canais = p.canais || (
      [toggles.enviar_por_email && "EMAIL", toggles.enviar_por_whatsapp && "WHATSAPP", toggles.arquivar_no_drive && "DRIVE"].filter(Boolean) as CanalDistribuicao[]
    );
    const enviarWhatsappAutomatico = canais.includes("WHATSAPP");

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
          templateCodigo: template.codigo,
          conteudoHtml: conteudoHidratado,
          pdfBase64: pdfBase64Render,
          hashOriginal,
          signatarios,
          externalId,
          enviarWhatsappAutomatico,
          metadata: { pacienteId: paciente.id, externalId },
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
    const parId = (template.exige_testemunhas && toggles.modo_testemunhas === "PAR_FIXO") ? toggles.par_fixo_id : null;
    const insRes = await db.execute(sql`
      INSERT INTO assinatura_solicitacoes
        (paciente_id, template_id, provedor_codigo, provedor_envelope_id, status,
         dados_hidratacao, hash_original, par_testemunhas_id, signatarios_snapshot,
         canais_distribuir, enviado_em, metadata, zapsign_external_id)
      VALUES
        (${paciente.id}, ${template.id}, ${provedorUsado}, ${envelopeId}, 'ENVIADO',
         ${JSON.stringify(dados)}::jsonb, ${hashOriginal}, ${parId}, ${JSON.stringify(signatarios)}::jsonb,
         ${sql.raw(`ARRAY[${canais.map((c) => `'${c}'`).join(",") || "''"}]::text[]`)}, now(),
         ${JSON.stringify({ failoverAcionado, linksAssinatura, ...(p.metadataExtra || {}) })}::jsonb,
         ${provedorUsado === "zapsign" ? externalId : null})
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

  /**
   * Envio bilateral ICP-Brasil (Wave 10 Familia 4 PARQ + futuros docs B2B).
   *
   * Usado pra envelopes que NAO tem paciente — apenas 2 entidades juridicas
   * assinando com e-CNPJ (clinica + farmacia). Reusa o ZapsignAdapter mas
   * pula o fluxo template-do-banco / hidratacao, recebendo o PDF ja renderizado.
   *
   * Diferencas pro enviar() padrao:
   *  - paciente_id = NULL na assinatura_solicitacoes
   *  - template_id pode ser placeholder (template institucional sintetico)
   *  - signatarios sao todos qualificada_ecnpj (ICP-Brasil)
   *  - signature_order_active = true (clinica primeiro, farmacia depois)
   *  - external_id estavel pra reconciliacao webhook
   */
  async enviarBilateralIcp(p: {
    /** Codigo logico do documento (ex: "parq_acordo"). */
    templateCodigo: string;
    /** ID estavel pra reconciliar webhook -> dominio (ex: "parq-1234"). */
    externalId: string;
    /** PDF ja renderizado em base64 (sem prefixo data:). */
    pdfBase64: string;
    /** Hash SHA-256 do PDF original (binario antes de assinar). */
    hashOriginal: string;
    /** Signatarios: tipicamente CLINICA_ECNPJ + FARMACIA_ECNPJ. */
    signatarios: Signatario[];
    /** Metadata livre persistida em assinatura_solicitacoes.metadata. */
    metadata?: Record<string, unknown>;
    /** Template_id existente no banco (opcional; usa fallback se ausente). */
    templateId?: number;
    /** ID do template institucional fallback (default: parq_v1). */
    templateCodigoFallback?: string;
  }): Promise<EnviarResultado> {
    // Resolve template_id (FK obrigatoria em assinatura_solicitacoes).
    let templateId = p.templateId;
    if (!templateId) {
      const fb = p.templateCodigoFallback || p.templateCodigo;
      const r = await db.execute(sql`SELECT id FROM assinatura_templates WHERE codigo = ${fb} LIMIT 1`);
      templateId = ((r as unknown as { rows?: Array<{ id: number }> }).rows || [])[0]?.id;
      if (!templateId) {
        throw new Error(`Template institucional ${fb} nao encontrado em assinatura_templates. Cadastre antes de chamar enviarBilateralIcp.`);
      }
    }

    const adapter = getAdapter("zapsign");
    const r = await adapter.createDocumentEnvelope({
      templateCodigo: p.templateCodigo,
      conteudoHtml: "",
      pdfBase64: p.pdfBase64,
      hashOriginal: p.hashOriginal,
      signatarios: p.signatarios,
      externalId: p.externalId,
      enviarWhatsappAutomatico: true,
      ordemAssinaturaAtiva: true,
      metadata: p.metadata || {},
    });
    await adapter.sendForSignature(r.envelopeId);

    const insRes = await db.execute(sql`
      INSERT INTO assinatura_solicitacoes
        (paciente_id, template_id, provedor_codigo, provedor_envelope_id, status,
         dados_hidratacao, hash_original, signatarios_snapshot,
         canais_distribuir, enviado_em, metadata, zapsign_external_id)
      VALUES
        (NULL, ${templateId}, 'zapsign', ${r.envelopeId}, 'ENVIADO',
         ${JSON.stringify({ bilateral_icp: true })}::jsonb, ${p.hashOriginal},
         ${JSON.stringify(p.signatarios)}::jsonb,
         ARRAY['EMAIL','WHATSAPP']::text[], now(),
         ${JSON.stringify({ ...(p.metadata || {}), linksAssinatura: r.linksAssinatura })}::jsonb,
         ${p.externalId})
      RETURNING id
    `);
    const solicitacaoId = ((insRes as unknown as { rows?: Array<{ id: number }> }).rows || [])[0]?.id;
    if (!solicitacaoId) throw new Error("Falha ao persistir solicitacao bilateral ICP");

    for (const s of p.signatarios) {
      const link = r.linksAssinatura.find((l) => l.email === s.email || l.email === s.nome)?.url || null;
      await db.execute(sql`
        INSERT INTO assinatura_signatarios
          (solicitacao_id, papel, nome, cpf, email, telefone, ordem, status, link_assinatura)
        VALUES
          (${solicitacaoId}, ${s.papel}, ${s.nome}, ${s.cpf || null}, ${s.email || null},
           ${s.telefone || null}, ${s.ordem}, 'ENVIADO', ${link})
      `);
    }

    return {
      solicitacaoId,
      envelopeId: r.envelopeId,
      provedorUsado: "zapsign",
      failoverAcionado: false,
      pdfNomePadrao: `[${new Date().toISOString().slice(0, 10)}][${p.templateCodigo.toUpperCase()}][${p.externalId}].pdf`,
      signatarios: p.signatarios.map((s) => ({
        papel: s.papel,
        nome: s.nome,
        link: r.linksAssinatura.find((l) => l.email === s.email || l.email === s.nome)?.url,
      })),
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

  async receberWebhook(provedor: ProvedorCodigo, rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<{ ok: boolean; eventoId: number; duplicado: boolean; transient?: boolean }> {
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
    let eventoId: number;
    if (rows.length === 0) {
      // Wave 10.5 task #34 — Reentrega ZapSign de evento ja conhecido.
      // Se a 1a tentativa marcou processado=true, eh duplicado real → ack 200.
      // Se ainda esta pendente (ex: upload pro bucket falhou na 1a vez), NAO eh
      // duplicado: continuamos o fluxo abaixo pra reprocessar com o mesmo eventoId.
      // Garante que upload + manifesto sao pre-condicao DURAVEL pra ack final
      // (CFM/LGPD retencao 20 anos), nao so na primeira chegada do evento.
      const exist = await db.execute(sql`SELECT id, processado FROM assinatura_webhook_eventos WHERE provedor_codigo = ${provedor} AND event_id = ${evento.eventId} LIMIT 1`);
      const exRow = ((exist as unknown as { rows?: Array<{ id: number; processado: boolean }> }).rows || [])[0];
      if (!exRow) return { ok: true, eventoId: 0, duplicado: true };
      if (exRow.processado) return { ok: true, eventoId: exRow.id, duplicado: true };
      eventoId = exRow.id;
      // Limpa o erro anterior antes de retentar — se falhar de novo, sera regravado.
      await db.execute(sql`UPDATE assinatura_webhook_eventos SET erro_processamento = NULL WHERE id = ${eventoId}`);
    } else {
      eventoId = rows[0]!.id;
    }

    if (!evento.signatureValid) {
      await db.execute(sql`UPDATE assinatura_webhook_eventos SET processado = true, processado_em = now(), erro_processamento = 'signature_invalid' WHERE id = ${eventoId}`);
      return { ok: false, eventoId, duplicado: false };
    }

    // Caminho A F4 (Dr. Claude 11/mai/2026): roteamento por tipo de evento.
    // ZapSign: doc_signed / doc_refused / doc_removed
    // Clicksign: auto_close / sign / finish
    const t = evento.eventType.toLowerCase();
    const isRecusado = /refus|reject|denied/.test(t);
    const isRemovido = /remov|delet|cancel|expir/.test(t);
    const isSucesso  = !isRecusado && !isRemovido && /sign|close|finish|complet/.test(t);

    if (evento.envelopeId && isRecusado) {
      const sol0 = await db.execute(sql`SELECT id FROM assinatura_solicitacoes WHERE provedor_envelope_id = ${evento.envelopeId} AND provedor_codigo = ${provedor} LIMIT 1`);
      const sr0 = ((sol0 as unknown as { rows?: Array<{ id: number }> }).rows || [])[0];
      if (sr0) {
        await db.execute(sql`UPDATE assinatura_solicitacoes SET status = 'REJEITADO', atualizado_em = now() WHERE id = ${sr0.id}`);
        await db.execute(sql`UPDATE assinatura_webhook_eventos SET solicitacao_id = ${sr0.id} WHERE id = ${eventoId}`);
        // Task #36 — avisar CEO em tempo real (e-mail/WhatsApp via worker existente)
        try { await this.notificarCEOEvento(sr0.id, "REJEITADO"); } catch (e) {
          console.error(`[assinatura.notificarCEOEvento] FALHA solicitacao=${sr0.id} tipo=REJEITADO`, e);
        }
      }
    } else if (evento.envelopeId && isRemovido) {
      const sol0 = await db.execute(sql`SELECT id FROM assinatura_solicitacoes WHERE provedor_envelope_id = ${evento.envelopeId} AND provedor_codigo = ${provedor} LIMIT 1`);
      const sr0 = ((sol0 as unknown as { rows?: Array<{ id: number }> }).rows || [])[0];
      if (sr0) {
        await db.execute(sql`UPDATE assinatura_solicitacoes SET status = 'EXPIRADO', atualizado_em = now() WHERE id = ${sr0.id}`);
        await db.execute(sql`UPDATE assinatura_webhook_eventos SET solicitacao_id = ${sr0.id} WHERE id = ${eventoId}`);
      }
    } else if (evento.envelopeId && isSucesso) {
      const sol = await db.execute(sql`SELECT id, paciente_id, zapsign_external_id FROM assinatura_solicitacoes WHERE provedor_envelope_id = ${evento.envelopeId} AND provedor_codigo = ${provedor} LIMIT 1`);
      const solRow = ((sol as unknown as { rows?: Array<{ id: number; paciente_id: number; zapsign_external_id: string | null }> }).rows || [])[0];
      if (solRow) {
        try {
          const pdf = await adapter.downloadSignedArtifact(evento.envelopeId);
          const hashAssinado = createHash("sha256").update(pdf).digest("hex");

          // Wave 10.5 task #34 — Armazenamento permanente do PDF assinado.
          // Upload eh OBRIGATORIO pra finalizacao do evento (defesa em profundidade
          // CFM/LGPD retencao 20 anos). Se falhar:
          //   - NAO marca CONCLUIDO (status fica como estava — sera re-tentado
          //     no proximo doc_signed, que ZapSign reentrega ate ack 200);
          //   - NAO grava manifesto na auditoria (impede pdf_storage_key fantasma);
          //   - NAO marca o evento como processado (worker externo / retry ZapSign
          //     reprocessa quando o storage voltar);
          //   - Lanca pra fora do try interno -> cai no catch que ja registra
          //     erro_processamento sem dar processado=true, devolvendo 200 false.
          //
          // Wave 10.5 task #39 — APENAS a chamada de upload eh tagueada com
          // prefixo `pdf_upload_falhou:` (transient real, worker `pdfRetryUpload`
          // sabe retentar). Falhas em download / DB / notificacao continuam com
          // erro cru pra nao serem confundidas com falha de storage.
          const { uploadPdfAssinado } = await import("./objectStorage");
          let up;
          try {
            up = await uploadPdfAssinado(
              solRow.zapsign_external_id || evento.envelopeId,
              pdf,
            );
          } catch (uploadErr) {
            await db.execute(sql`UPDATE assinatura_webhook_eventos SET erro_processamento = ${'pdf_upload_falhou: ' + (uploadErr as Error).message} WHERE id = ${eventoId}`);
            return { ok: false, eventoId, duplicado: false, transient: true };
          }
          const pdfStorageKey = up.storageKey;

          await db.execute(sql`UPDATE assinatura_solicitacoes SET status = 'CONCLUIDO', concluido_em = now(), hash_assinado = ${hashAssinado}, atualizado_em = now() WHERE id = ${solRow.id}`);
          await db.execute(sql`UPDATE assinatura_webhook_eventos SET solicitacao_id = ${solRow.id} WHERE id = ${eventoId}`);

          // Manifesto SHA-256 -> auditoria_assinaturas (LGPD art. 11 §4o, retencao 20 anos default).
          // Idempotente via ON CONFLICT (signature_id). pdf_storage_key SEMPRE aponta
          // pro objeto real no bucket — upload bem-sucedido eh pre-condicao deste passo.
          await this.registrarManifestoAuditoria({
            solicitacaoId: solRow.id,
            envelopeId: evento.envelopeId,
            externalId: solRow.zapsign_external_id,
            hashAssinado,
            payload: evento.payload,
            pdfStorageKey,
          });

          const tx = await db.execute(sql`SELECT corpo FROM assinatura_textos_institucionais WHERE codigo = 'WHATSAPP_POS_ASSINATURA'`);
          const txt = ((tx as unknown as { rows?: Array<{ corpo: string }> }).rows || [])[0];
          const pac = await db.execute(sql`SELECT nome, telefone, email FROM pacientes WHERE id = ${solRow.paciente_id}`);
          const pacRow = ((pac as unknown as { rows?: Array<{ nome: string; telefone: string; email: string | null }> }).rows || [])[0];
          if (txt && pacRow) {
            // Wave 10.5 task #34 — Idempotencia de notificacoes em reentrega.
            // Como o webhook agora pode reprocessar (event redelivery sem
            // processado=true), checamos se ja existem notificacoes POS_ASSINATURA
            // pra esta solicitacao antes de inserir. Senao paciente recebe duplicado.
            const exNotif = await db.execute(sql`SELECT 1 FROM assinatura_notificacoes WHERE solicitacao_id = ${solRow.id} AND momento = 'POS_ASSINATURA' LIMIT 1`);
            if (((exNotif as unknown as { rows?: unknown[] }).rows || []).length === 0) {
              const corpo = txt.corpo.replaceAll("{{NOME}}", pacRow.nome.split(" ")[0] || pacRow.nome);
              await db.execute(sql`INSERT INTO assinatura_notificacoes (solicitacao_id, canal, momento, destinatario, corpo, status) VALUES (${solRow.id}, 'WHATSAPP', 'POS_ASSINATURA', ${pacRow.telefone}, ${corpo}, 'PENDENTE')`);
              if (pacRow.email) await db.execute(sql`INSERT INTO assinatura_notificacoes (solicitacao_id, canal, momento, destinatario, assunto, corpo, status) VALUES (${solRow.id}, 'EMAIL', 'POS_ASSINATURA', ${pacRow.email}, 'INSTITUTO PADUA | DOCUMENTO ASSINADO', ${corpo}, 'PENDENTE')`);
              await db.execute(sql`INSERT INTO assinatura_notificacoes (solicitacao_id, canal, momento, destinatario, corpo, status) VALUES (${solRow.id}, 'DRIVE', 'POS_ASSINATURA', 'drive://paciente/' || ${solRow.paciente_id}, 'PDF assinado pronto para arquivamento', 'PENDENTE')`);
            }
          }
          // Task #36 — avisar CEO em tempo real quando contrato é assinado
          try { await this.notificarCEOEvento(solRow.id, "ASSINADO"); } catch (e) {
            console.error(`[assinatura.notificarCEOEvento] FALHA solicitacao=${solRow.id} tipo=ASSINADO`, e);
          }
        } catch (err) {
          // Wave 10.5 task #34 — falha (download/db/notificacao) NAO marca processado.
          // Mantemos o evento PENDENTE pra reentrega ZapSign automatica (ate
          // ack 200). Sem prefixo `pdf_upload_falhou:` aqui — esses erros NAO
          // sao retentaveis pelo worker `pdfRetryUpload` (que so sabe lidar
          // com upload de PDF). Devolvemos 5xx pro provedor reentregar.
          await db.execute(sql`UPDATE assinatura_webhook_eventos SET erro_processamento = ${(err as Error).message} WHERE id = ${eventoId}`);
          return { ok: false, eventoId, duplicado: false, transient: true };
        }
      }
    }
    await db.execute(sql`UPDATE assinatura_webhook_eventos SET processado = true, processado_em = now() WHERE id = ${eventoId}`);
    return { ok: true, eventoId, duplicado: false };
  }

  /**
   * Wave 10 F4 — Manifesto SHA-256 da assinatura (auditoria_assinaturas).
   * Defensibilidade juridica tripla: CFM 2.386/2024 + CC 593-609 + LGPD art. 11 §4o
   * + STJ REsp 2.159.442/PR. Retencao default 20 anos (default da coluna).
   * Idempotente via ON CONFLICT (signature_id) DO NOTHING.
   * Object Storage real (uploadFileToBucket assinaturas-pawards) deferido pra
   * Wave 10.5 — pdf_storage_key grava chave logica assinaturas/<external_id>.pdf.
   */
  private async registrarManifestoAuditoria(p: {
    solicitacaoId: number;
    envelopeId: string;
    externalId: string | null;
    hashAssinado: string;
    payload: Record<string, unknown>;
    /** Wave 10.5 task #34 — chave fisica no bucket; null se upload falhou (cai no logico). */
    pdfStorageKey?: string | null;
  }): Promise<void> {
    interface SignerLike {
      token?: string; cpf?: string; name?: string; email?: string;
      ip?: string; signed_at?: string; auth_mode?: string;
      geo_latitude?: number | string | null; geo_longitude?: number | string | null;
      icp_brasil?: { serial?: string; ac?: string } | null;
    }
    const ply = p.payload as { signer?: SignerLike; signers?: SignerLike[]; user_agent?: string };
    const signerEvento: SignerLike = ply.signer
      || (Array.isArray(ply.signers) ? (ply.signers.filter((s) => s.signed_at).slice(-1)[0] || ply.signers[0]) : undefined)
      || {};

    // Idempotencia (architect fix Wave 10 F4): signature_id determínistico.
    // Date.now() era um anti-padrão — cada retry de webhook geraria signature_id
    // diferente, bypassando ON CONFLICT (signature_id) e duplicando audit.
    // Fallback agora: token ZapSign > envelopeId+cpf > envelopeId+email > envelopeId+nosig.
    const signatureId = signerEvento.token
      || (signerEvento.cpf ? `${p.envelopeId}-${(signerEvento.cpf||"").replace(/\D/g,"")}` : null)
      || (signerEvento.email ? `${p.envelopeId}-${signerEvento.email.toLowerCase()}` : null)
      || `${p.envelopeId}-nosig`;
    const signerCpf = (signerEvento.cpf || "").replace(/\D/g, "") || "00000000000";
    const signerName = signerEvento.name || "unknown";
    const signerEmail = (signerEvento.email || "").toLowerCase();

    // Architect HIGH fix (Wave 10 F4): nao hardcoda PACIENTE — para fluxos B2B
    // (PARQ clinica+farmacia, TCLE paciente+medico) o papel correto vem do
    // cadastro original em assinatura_signatarios. Match por CPF (preciso) ou
    // email (fallback). Default PACIENTE so como ultima trava (audit nunca
    // viola NOT NULL).
    let signerPapel = "PACIENTE";
    try {
      const sg = await db.execute(sql`SELECT papel FROM assinatura_signatarios WHERE solicitacao_id = ${p.solicitacaoId} AND (
        (cpf IS NOT NULL AND ${signerCpf} <> '00000000000' AND regexp_replace(cpf, '\\D', '', 'g') = ${signerCpf})
        OR (email IS NOT NULL AND ${signerEmail} <> '' AND lower(email) = ${signerEmail})
      ) LIMIT 1`);
      const sgRow = ((sg as unknown as { rows?: Array<{ papel: string }> }).rows || [])[0];
      if (sgRow?.papel) signerPapel = sgRow.papel;
    } catch { /* defensivo: mantem default PACIENTE se lookup falhar */ }

    const signerIp = signerEvento.ip || "0.0.0.0";
    const userAgent = ply.user_agent || "unknown";
    const authMode = (signerEvento.auth_mode || "assinaturaTela") as string;
    const geoLat = signerEvento.geo_latitude;
    const geoLng = signerEvento.geo_longitude;
    const geoJson = (geoLat != null && geoLng != null) ? JSON.stringify({ lat: geoLat, lng: geoLng }) : null;
    const validationUrl = signerEvento.token
      ? `https://app.zapsign.com.br/verificar/${signerEvento.token}`
      : `https://app.zapsign.com.br/verificar/${p.envelopeId}`;
    // Wave 10.5 task #34 — prefere chave fisica do bucket quando upload OK.
    // Fallback logico `assinaturas/<id>.pdf` mantido pra retro-compat (rotas
    // legadas e manifestos historicos pre-Wave 10.5 ainda referenciam).
    const pdfStorageKey = p.pdfStorageKey || `assinaturas/${p.externalId || p.envelopeId}.pdf`;
    const icpSerial = signerEvento.icp_brasil?.serial || null;
    const icpAc = signerEvento.icp_brasil?.ac || null;
    const evidenceJson = JSON.stringify(signerEvento);
    const tsUtc = signerEvento.signed_at || new Date().toISOString();

    await db.execute(sql`
      INSERT INTO auditoria_assinaturas (
        signature_id, solicitacao_id, envelope_id, external_id,
        document_hash_sha256, document_hash_assinado,
        signer_cpf, signer_name, signer_papel, signer_ip,
        signer_geo, user_agent, auth_method, auth_evidence_json,
        timestamp_utc, icp_brasil_serial, icp_brasil_ac,
        validation_url, pdf_storage_key
      ) VALUES (
        ${signatureId}, ${p.solicitacaoId}, ${p.envelopeId}, ${p.externalId},
        ${p.hashAssinado}, ${p.hashAssinado},
        ${signerCpf}, ${signerName}, ${signerPapel}, ${signerIp}::inet,
        ${geoJson}::jsonb, ${userAgent}, ${authMode}::zapsign_auth_method,
        ${evidenceJson}::jsonb,
        ${tsUtc}::timestamptz, ${icpSerial}, ${icpAc},
        ${validationUrl}, ${pdfStorageKey}
      )
      ON CONFLICT (signature_id) DO NOTHING
    `);
  }

  /**
   * Task #36 — Avisar CEO em tempo real quando contrato é assinado ou recusado.
   *
   * Reusa a fila `assinatura_notificacoes` (worker `notifAssinatura.ts`) pra
   * disparar e-mail/WhatsApp pro perfil `validador_mestre`. Resolve destinatários
   * dinamicamente a partir da tabela `usuarios` (sem hardcode) — se o CEO
   * cadastrar telefone depois, WhatsApp passa a sair automaticamente.
   *
   * Defensivo: se nada está cadastrado (sem e-mail nem telefone), apenas loga
   * e não enfileira. Idempotência fraca por (solicitacao_id, canal, momento,
   * destinatario, "[CEO]") via NOT EXISTS pra não duplicar em retry de webhook.
   */
  private async notificarCEOEvento(
    solicitacaoId: number,
    tipo: "ASSINADO" | "REJEITADO",
  ): Promise<void> {
    // 1. Resolve metadados do contrato (template + paciente) pra mensagem.
    const meta = await db.execute(sql`
      SELECT s.id, t.nome_exibicao AS template_nome, t.codigo AS template_codigo,
             p.nome AS paciente_nome
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t ON t.id = s.template_id
      LEFT JOIN pacientes p ON p.id = s.paciente_id
      WHERE s.id = ${solicitacaoId}
      LIMIT 1
    `);
    const metaRow = ((meta as unknown as {
      rows?: Array<{ template_nome: string; template_codigo: string; paciente_nome: string | null }>;
    }).rows || [])[0];
    if (!metaRow) return;

    // 2. Resolve destinatários CEO (validador_mestre).
    const ceos = await db.execute(sql`
      SELECT email, telefone FROM usuarios
      WHERE perfil = 'validador_mestre' AND ativo = true
    `);
    const ceoRows = (ceos as unknown as { rows?: Array<{ email: string | null; telefone: string | null }> }).rows || [];
    if (ceoRows.length === 0) return;

    const verbo = tipo === "ASSINADO" ? "assinado" : "RECUSADO";
    const emoji = tipo === "ASSINADO" ? "✅" : "⛔";
    // URL absoluta pra canais externos (e-mail/WhatsApp): o link relativo
    // nao abre fora do contexto do app web. Resolve por env var, com
    // fallback pro primeiro REPLIT_DOMAINS (deploy Replit) ou localhost.
    const baseUrl = (
      process.env.PUBLIC_APP_URL ||
      (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}` : "") ||
      "http://localhost:80"
    ).replace(/\/+$/, "");
    const link = `${baseUrl}/assinaturas/${solicitacaoId}`;
    const paciente = metaRow.paciente_nome || "(sem paciente)";
    const template = metaRow.template_nome || metaRow.template_codigo;

    const assunto = `[CEO] PAWARDS · Contrato ${verbo} · ${template}`;
    const corpoBase =
      `${emoji} Contrato ${verbo} agora.\n\n` +
      `Template: ${template}\n` +
      `Paciente: ${paciente}\n` +
      `Solicitação: #${solicitacaoId}\n\n` +
      `Abrir detalhe: ${link}`;

    for (const ceo of ceoRows) {
      // E-mail. is_sistema_ceo=true sinaliza ao worker pra bypassar opt-out
      // (CEO nao eh paciente) e quiet hours (alerta operacional tempo real).
      const emailDest = (ceo.email || "").trim();
      if (emailDest && emailDest.includes("@")) {
        await db.execute(sql`
          INSERT INTO assinatura_notificacoes
            (solicitacao_id, canal, momento, destinatario, assunto, corpo, status, is_sistema_ceo)
          SELECT ${solicitacaoId}, 'EMAIL', 'POS_ASSINATURA', ${emailDest},
                 ${assunto}, ${corpoBase}, 'PENDENTE', true
          WHERE NOT EXISTS (
            SELECT 1 FROM assinatura_notificacoes
            WHERE solicitacao_id = ${solicitacaoId}
              AND canal = 'EMAIL'
              AND destinatario = ${emailDest}
              AND assunto = ${assunto}
              AND is_sistema_ceo = true
          )
        `);
      }
      // WhatsApp
      const telDest = (ceo.telefone || "").trim();
      if (telDest) {
        await db.execute(sql`
          INSERT INTO assinatura_notificacoes
            (solicitacao_id, canal, momento, destinatario, corpo, status, is_sistema_ceo)
          SELECT ${solicitacaoId}, 'WHATSAPP', 'POS_ASSINATURA', ${telDest},
                 ${corpoBase}, 'PENDENTE', true
          WHERE NOT EXISTS (
            SELECT 1 FROM assinatura_notificacoes
            WHERE solicitacao_id = ${solicitacaoId}
              AND canal = 'WHATSAPP'
              AND destinatario = ${telDest}
              AND corpo = ${corpoBase}
              AND is_sistema_ceo = true
          )
        `);
      }
    }

    // Tempo real: dispara o tick do worker imediatamente em background
    // (fire-and-forget). Sem await — o webhook ZapSign devolve 200 logo.
    // Race-safe: o worker tem mutex de re-entrancia em memoria + claim
    // atomico via UPDATE ... RETURNING (status='PROCESSANDO') com FOR
    // UPDATE SKIP LOCKED no SELECT interno, entao chamadas concorrentes
    // (timer + fire-and-forget) jamais reivindicam a mesma linha.
    // Importacao tardia pra quebrar ciclo service<->worker.
    void (async () => {
      try {
        const { tickNotifAssinatura } = await import("../recorrencia/notifAssinatura");
        await tickNotifAssinatura();
      } catch { /* defensivo: tick proximo pega se falhar */ }
    })();
  }
}

export const assinaturaService = new AssinaturaService();
