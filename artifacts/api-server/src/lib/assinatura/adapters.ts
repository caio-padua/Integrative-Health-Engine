/**
 * Adapters concretos: ClicksignAdapter + ZapsignAdapter.
 * Quando as credenciais nao estao configuradas, opera em MODO_MOCK
 * (gera envelope_id sintetico) preservando toda a osmose. Trocar por
 * fetch real e instantaneo: basta definir CLICKSIGN_TOKEN ou ZAPSIGN_TOKEN.
 */

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  EventoWebhook,
  PayloadEnvelope,
  ProvedorCodigo,
  ResultadoEnvio,
  SignatureProviderAdapter,
  StatusDocumento,
} from "./types";

const MOCK_PDF_PLACEHOLDER = Buffer.from(
  "%PDF-1.4\n% Mock signed artifact - replace with real provider download\n",
);

abstract class BaseMockableAdapter implements SignatureProviderAdapter {
  abstract readonly codigo: ProvedorCodigo;
  protected abstract get token(): string | undefined;
  protected abstract get webhookSecret(): string | undefined;

  isConfigured(): boolean {
    return Boolean(this.token);
  }

  async createDocumentEnvelope(payload: PayloadEnvelope): Promise<ResultadoEnvio> {
    if (!this.isConfigured()) {
      const envelopeId = `MOCK-${this.codigo.toUpperCase()}-${randomUUID()}`;
      return {
        envelopeId,
        linksAssinatura: payload.signatarios
          .filter((s) => s.email)
          .map((s) => ({ email: s.email!, url: `https://mock.${this.codigo}.local/sign/${envelopeId}` })),
        rawProvider: { mock: true, codigo: this.codigo, hash: payload.hashOriginal },
      };
    }
    return this.createReal(payload);
  }

  async sendForSignature(envelopeId: string): Promise<void> {
    if (!this.isConfigured()) return;
    await this.sendReal(envelopeId);
  }

  async getDocumentStatus(envelopeId: string): Promise<StatusDocumento> {
    if (!this.isConfigured()) {
      return { status: "ENVIADO", signatariosStatus: [], pdfAssinadoUrl: undefined };
    }
    return this.statusReal(envelopeId);
  }

  async handleWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<EventoWebhook> {
    const headerName = this.signatureHeaderName();
    const sig = headers[headerName] || headers[headerName.toLowerCase()];
    const sigStr = Array.isArray(sig) ? sig[0] : sig;
    let signatureValid = false;

    if (this.webhookSecret && sigStr) {
      const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
      try {
        const a = Buffer.from(expected, "hex");
        const b = Buffer.from(sigStr.replace(/^sha256=/, ""), "hex");
        signatureValid = a.length === b.length && timingSafeEqual(a, b);
      } catch {
        signatureValid = false;
      }
    } else if (!this.webhookSecret) {
      signatureValid = true; // Modo dev/mock: sem secret, aceita
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawBody.toString("utf-8")) as Record<string, unknown>;
    } catch {
      parsed = { raw: rawBody.toString("utf-8") };
    }

    return {
      eventId: this.extractEventId(parsed) || `noid-${createHash("sha256").update(rawBody).digest("hex").slice(0, 16)}`,
      eventType: this.extractEventType(parsed),
      envelopeId: this.extractEnvelopeId(parsed),
      signatureValid,
      payload: parsed,
    };
  }

  async downloadSignedArtifact(envelopeId: string): Promise<Buffer> {
    if (!this.isConfigured()) {
      return Buffer.concat([
        MOCK_PDF_PLACEHOLDER,
        Buffer.from(`% envelope=${envelopeId} provider=${this.codigo}\n`),
      ]);
    }
    return this.downloadReal(envelopeId);
  }

  // Hooks para implementacao real (override quando integrar HTTP de verdade)
  protected abstract createReal(payload: PayloadEnvelope): Promise<ResultadoEnvio>;
  protected abstract sendReal(envelopeId: string): Promise<void>;
  protected abstract statusReal(envelopeId: string): Promise<StatusDocumento>;
  protected abstract downloadReal(envelopeId: string): Promise<Buffer>;
  protected abstract signatureHeaderName(): string;
  protected abstract extractEventId(payload: Record<string, unknown>): string | undefined;
  protected abstract extractEventType(payload: Record<string, unknown>): string;
  protected abstract extractEnvelopeId(payload: Record<string, unknown>): string | undefined;
}

export class ClicksignAdapter extends BaseMockableAdapter {
  readonly codigo: ProvedorCodigo = "clicksign";
  protected get token() { return process.env["CLICKSIGN_TOKEN"]; }
  protected get webhookSecret() { return process.env["CLICKSIGN_WEBHOOK_SECRET"]; }
  private get baseUrl() { return process.env["CLICKSIGN_BASE_URL"] || "https://app.clicksign.com"; }

  protected async createReal(payload: PayloadEnvelope): Promise<ResultadoEnvio> {
    const r = await fetch(`${this.baseUrl}/api/v1/documents?access_token=${this.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        document: {
          path: `/${payload.templateCodigo}-${Date.now()}.html`,
          content_base64: Buffer.from(payload.conteudoHtml).toString("base64"),
          deadline_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
      }),
    });
    if (!r.ok) throw new Error(`Clicksign create failed ${r.status}: ${await r.text()}`);
    const data = (await r.json()) as { document?: { key?: string } };
    const envelopeId = data.document?.key;
    if (!envelopeId) throw new Error("Clicksign nao retornou document.key");
    return {
      envelopeId,
      linksAssinatura: payload.signatarios.filter((s) => s.email).map((s) => ({ email: s.email!, url: `${this.baseUrl}/sign/${envelopeId}` })),
      rawProvider: data,
    };
  }
  protected async sendReal(_envelopeId: string): Promise<void> { /* notify endpoints */ }
  protected async statusReal(envelopeId: string): Promise<StatusDocumento> {
    const r = await fetch(`${this.baseUrl}/api/v1/documents/${envelopeId}?access_token=${this.token}`);
    const data = (await r.json()) as { document?: { status?: string; downloads?: { signed_file_url?: string } } };
    const provStatus = data.document?.status || "running";
    const status = provStatus === "closed" ? "CONCLUIDO" : provStatus === "canceled" ? "REJEITADO" : "ENVIADO";
    return { status, signatariosStatus: [], pdfAssinadoUrl: data.document?.downloads?.signed_file_url };
  }
  protected async downloadReal(envelopeId: string): Promise<Buffer> {
    const r = await fetch(`${this.baseUrl}/api/v1/documents/${envelopeId}?access_token=${this.token}`);
    const data = (await r.json()) as { document?: { downloads?: { signed_file_url?: string } } };
    const url = data.document?.downloads?.signed_file_url;
    if (!url) throw new Error("Clicksign: PDF assinado indisponivel");
    const r2 = await fetch(url);
    return Buffer.from(await r2.arrayBuffer());
  }
  protected signatureHeaderName(): string { return "content-hmac"; }
  protected extractEventId(p: Record<string, unknown>): string | undefined {
    const ev = p["event"] as Record<string, unknown> | undefined;
    return (ev?.["id"] as string) || (p["id"] as string);
  }
  protected extractEventType(p: Record<string, unknown>): string {
    const ev = p["event"] as Record<string, unknown> | undefined;
    return (ev?.["name"] as string) || "unknown";
  }
  protected extractEnvelopeId(p: Record<string, unknown>): string | undefined {
    const doc = p["document"] as Record<string, unknown> | undefined;
    return doc?.["key"] as string | undefined;
  }
}

export class ZapsignAdapter extends BaseMockableAdapter {
  readonly codigo: ProvedorCodigo = "zapsign";
  protected get token() { return process.env["ZAPSIGN_TOKEN"]; }
  protected get webhookSecret() { return process.env["ZAPSIGN_WEBHOOK_SECRET"]; }
  private get baseUrl() { return process.env["ZAPSIGN_BASE_URL"] || "https://api.zapsign.com.br"; }

  protected async createReal(payload: PayloadEnvelope): Promise<ResultadoEnvio> {
    const r = await fetch(`${this.baseUrl}/api/v1/docs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({
        name: payload.templateCodigo,
        base64_pdf: Buffer.from(payload.conteudoHtml).toString("base64"),
        signers: payload.signatarios.map((s) => ({ name: s.nome, email: s.email, phone_country: "55", phone_number: s.telefone?.replace(/\D/g, "") })),
      }),
    });
    if (!r.ok) throw new Error(`ZapSign create failed ${r.status}: ${await r.text()}`);
    const data = (await r.json()) as { token?: string; signers?: Array<{ email: string; sign_url: string }> };
    if (!data.token) throw new Error("ZapSign nao retornou token");
    return {
      envelopeId: data.token,
      linksAssinatura: (data.signers || []).map((s) => ({ email: s.email, url: s.sign_url })),
      rawProvider: data,
    };
  }
  protected async sendReal(_envelopeId: string): Promise<void> { /* ZapSign envia automatico no create */ }
  protected async statusReal(envelopeId: string): Promise<StatusDocumento> {
    const r = await fetch(`${this.baseUrl}/api/v1/docs/${envelopeId}/`, { headers: { Authorization: `Bearer ${this.token}` } });
    const data = (await r.json()) as { status?: string; signed_file?: string };
    const status = data.status === "signed" ? "CONCLUIDO" : data.status === "refused" ? "REJEITADO" : "ENVIADO";
    return { status, signatariosStatus: [], pdfAssinadoUrl: data.signed_file };
  }
  protected async downloadReal(envelopeId: string): Promise<Buffer> {
    const r = await fetch(`${this.baseUrl}/api/v1/docs/${envelopeId}/`, { headers: { Authorization: `Bearer ${this.token}` } });
    const data = (await r.json()) as { signed_file?: string };
    if (!data.signed_file) throw new Error("ZapSign: PDF assinado indisponivel");
    const r2 = await fetch(data.signed_file);
    return Buffer.from(await r2.arrayBuffer());
  }
  protected signatureHeaderName(): string { return "x-hub-signature-256"; }
  protected extractEventId(p: Record<string, unknown>): string | undefined {
    return (p["event_id"] as string) || (p["webhook_id"] as string);
  }
  protected extractEventType(p: Record<string, unknown>): string { return (p["event_type"] as string) || "unknown"; }
  protected extractEnvelopeId(p: Record<string, unknown>): string | undefined {
    return (p["doc_token"] as string) || (p["token"] as string);
  }
}

const _instances = new Map<ProvedorCodigo, SignatureProviderAdapter>();
export function getAdapter(codigo: ProvedorCodigo): SignatureProviderAdapter {
  let a = _instances.get(codigo);
  if (!a) {
    if (codigo === "clicksign") a = new ClicksignAdapter();
    else if (codigo === "zapsign") a = new ZapsignAdapter();
    else throw new Error(`Adapter nao implementado para provedor ${codigo}. Manifesto define apenas clicksign e zapsign como oficiais.`);
    _instances.set(codigo, a);
  }
  return a;
}
