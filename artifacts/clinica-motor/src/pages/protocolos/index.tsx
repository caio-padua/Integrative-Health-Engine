import { LayoutPawards as Layout } from "@/components/LayoutPawards";
import { useListarProtocolos, getListarProtocolosQueryKey, useCriarProtocolo } from "@workspace/api-client-react";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, BookOpen, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
// PENUMBRA face ESCURA "Navy Ciano" — fonte unica dos tokens (mesma usada na
// Craniotomia / Governanca). Nao inventar hex novo aqui: tudo vem de PW / MONO.
import { PW, MONO, inputStyle, labelStyle } from "../craniotomia-shared";

const protocoloSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  ativo: z.boolean().default(true),
});

const PENUMBRA_CSS = `
.pr-painel { transition: border-color .25s, box-shadow .25s; }
.pr-painel:hover { border-color: ${PW.borderNeon}; box-shadow: 0 0 32px -14px ${PW.cianoGlow}; }
.pr-row { transition: background .15s; }
.pr-row:hover { background: ${PW.bg3}; }
.pr-btn { transition: border-color .2s, color .2s, box-shadow .2s; cursor: pointer; }
.pr-btn:hover:not(:disabled) { border-color: ${PW.ciano}; color: ${PW.ciano}; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
.pr-btn:disabled { opacity: .45; cursor: not-allowed; }
.pr-input:focus { border-color: ${PW.ciano} !important; box-shadow: 0 0 18px -8px ${PW.cianoGlow}; }
`;

const btnPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 16px",
  background: PW.bg2,
  border: `1px solid ${PW.ciano}`,
  borderRadius: 0,
  color: PW.ciano,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontFamily: MONO,
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: PW.muted,
  borderBottom: `1px solid ${PW.border}`,
  fontFamily: MONO,
};

const td: CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  color: PW.text,
  borderBottom: `1px solid ${PW.border}`,
};

function Painel({ children }: { children: ReactNode }) {
  return (
    <section
      className="pr-painel"
      style={{
        background: PW.bg2,
        border: `1px solid ${PW.border}`,
        borderLeft: `3px solid ${PW.ciano}`,
        borderRadius: 0,
      }}
    >
      {children}
    </section>
  );
}

export default function Protocolos() {
  const { user } = useAuth();
  const { data: protocolos, isLoading } = useListarProtocolos({}, {
    query: { queryKey: getListarProtocolosQueryKey({}) }
  });
  
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criarProtocolo = useCriarProtocolo();

  const form = useForm<z.infer<typeof protocoloSchema>>({
    resolver: zodResolver(protocoloSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      categoria: "",
      ativo: true,
    }
  });

  const onSubmit = (values: z.infer<typeof protocoloSchema>) => {
    if (!user) return;
    criarProtocolo.mutate({ data: { ...values, criadoPorId: user.id } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarProtocolosQueryKey({}) });
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Layout>
      <style>{PENUMBRA_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: MONO }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: PW.text,
                margin: 0,
              }}
            >
              <BookOpen style={{ width: 26, height: 26, color: PW.ciano }} />
              Protocolos Terapêuticos
            </h1>
            <p style={{ fontSize: 13, color: PW.t2, marginTop: 6 }}>
              Configure agrupamentos de itens para prescrição rápida.
            </p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="pr-btn" style={btnPrimary}>
                <Plus style={{ width: 16, height: 16 }} />
                Novo Protocolo
              </button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[425px]"
              style={{
                background: PW.bg2,
                border: `1px solid ${PW.border}`,
                borderRadius: 0,
                color: PW.text,
                fontFamily: MONO,
              }}
            >
              <DialogHeader>
                <DialogTitle
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: PW.t2,
                  }}
                >
                  Novo Protocolo
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={labelStyle}>Nome do Protocolo</FormLabel>
                        <FormControl>
                          <input className="pr-input" style={inputStyle} {...field} />
                        </FormControl>
                        <FormMessage style={{ color: PW.danger, fontSize: 11 }} />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={labelStyle}>Descrição</FormLabel>
                        <FormControl>
                          <input className="pr-input" style={inputStyle} {...field} />
                        </FormControl>
                        <FormMessage style={{ color: PW.danger, fontSize: 11 }} />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={labelStyle}>Categoria (opcional)</FormLabel>
                        <FormControl>
                          <input className="pr-input" style={inputStyle} {...field} />
                        </FormControl>
                        <FormMessage style={{ color: PW.danger, fontSize: 11 }} />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ativo"
                    render={({ field }) => (
                      <FormItem
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          border: `1px solid ${PW.border}`,
                          borderRadius: 0,
                          background: PW.bg3,
                          padding: 16,
                        }}
                      >
                        <div>
                          <FormLabel style={{ ...labelStyle, marginBottom: 0, fontSize: 12 }}>Ativo</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <button
                    type="submit"
                    className="pr-btn"
                    style={{ ...btnPrimary, width: "100%", justifyContent: "center" }}
                    disabled={criarProtocolo.isPending}
                  >
                    {criarProtocolo.isPending ? "Salvando..." : "Salvar Protocolo"}
                  </button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Painel>
          {isLoading ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Nome</th>
                  <th style={th}>Categoria</th>
                  <th style={th}>Itens</th>
                  <th style={{ ...th, textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {protocolos?.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...td, textAlign: "center", height: 96, color: PW.muted }}>
                      Nenhum protocolo cadastrado.
                    </td>
                  </tr>
                ) : (
                  protocolos?.map((protocolo) => (
                    <tr key={protocolo.id} className="pr-row">
                      <td style={{ ...td, fontWeight: 700 }}>
                        {protocolo.nome}
                        {protocolo.descricao && (
                          <div style={{ fontSize: 11, color: PW.muted, fontWeight: 400, marginTop: 2 }}>
                            {protocolo.descricao}
                          </div>
                        )}
                      </td>
                      <td style={td}>
                        {protocolo.categoria ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: PW.t2,
                              background: PW.bg3,
                              border: `1px solid ${PW.border}`,
                              fontFamily: MONO,
                            }}
                          >
                            {protocolo.categoria}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: PW.t2, fontSize: 13 }}>
                          <Layers style={{ width: 16, height: 16 }} />
                          {protocolo.itens?.length || 0} itens
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: protocolo.ativo ? PW.ok : PW.muted,
                            textShadow: protocolo.ativo ? `0 0 12px ${PW.cianoGlow}` : "none",
                          }}
                        >
                          {protocolo.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </Painel>
      </div>
    </Layout>
  );
}
