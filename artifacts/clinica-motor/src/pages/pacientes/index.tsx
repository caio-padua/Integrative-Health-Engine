import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListarPacientes, getListarPacientesQueryKey, useCriarPaciente, CriarPacienteBody } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
// Task #98 — ordenacao multi-coluna estilo Excel (clique substitui, Shift+clique
// adiciona criterio secundario, badge numerada mostra prioridade). Lib extraida
// da timeline de assinaturas (Task #96) — backend revalida via whitelist em
// routes/pacientes.ts ORDENACOES_PACIENTES_FRAGMENT.
import {
  ColunaOrdenavel,
  type Ordenacao as OrdenacaoLib,
  dedupePorColuna,
  parseOrdenacoesFromString,
  serializarOrdenacoes,
  alternarOrdenacao,
} from "@/lib/ordenacao-multi";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { useClinic } from "@/contexts/ClinicContext";

import { apiFetch } from "@/lib/api-fetch";
const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}

function formatCelular(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0,5)}-${digits.slice(5)}`;
}

const pacienteSchema = z.object({
  nome: z.string().min(1, "Nome e obrigatorio"),
  cpf: z.string().optional(),
  telefone: z.string().min(1, "Celular e obrigatorio"),
  email: z.string().email("E-mail invalido").optional().or(z.literal("")),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  pais: z.string().optional(),
  unidadeId: z.coerce.number().min(1, "Unidade e obrigatoria"),
  genero: z.enum(["masculino", "feminino", "outro", "nao_informado"]).default("nao_informado"),
  alturaCm: z.coerce.number().int().min(30).max(260).optional().or(z.literal("").transform(() => undefined)),
  pesoKg: z.coerce.number().min(0.5).max(500).optional().or(z.literal("").transform(() => undefined)),
  alergias: z.string().optional(),
  condicoesClinicas: z.string().optional(),
  medicamentosContinuos: z.string().optional(),
  gestante: z.boolean().default(false),
  fototipoFitzpatrick: z.enum(["I","II","III","IV","V","VI"]).optional().or(z.literal("").transform(() => undefined)),
  atividadeFisica: z.enum(["sedentario","leve","moderado","intenso","atleta"]).optional().or(z.literal("").transform(() => undefined)),
});

// Task #98 — chaves de ordenacao da tabela de Pacientes. Espelha o whitelist
// server-side em routes/pacientes.ts (ORDENACOES_PACIENTES_FRAGMENT). Se
// uma chave for adicionada aqui, ADICIONAR tambem no fragment SQL — sem
// isso o backend silenciosamente ignora o token vindo da URL.
type ChaveOrdenacaoPaciente =
  | "NOME" | "CPF" | "TELEFONE" | "STATUS" | "CRIADO";
type OrdenacaoPaciente = OrdenacaoLib<ChaveOrdenacaoPaciente>;
const MAX_ORDENACOES_PAC = 4;
const ORDENACAO_URL_PAC: Record<OrdenacaoPaciente, string> = {
  NOME_DESC: "nome_desc",         NOME_ASC: "nome_asc",
  CPF_DESC: "cpf_desc",           CPF_ASC: "cpf_asc",
  TELEFONE_DESC: "telefone_desc", TELEFONE_ASC: "telefone_asc",
  STATUS_DESC: "status_desc",     STATUS_ASC: "status_asc",
  CRIADO_DESC: "criado_desc",     CRIADO_ASC: "criado_asc",
};
const URL_TO_ORDENACAO_PAC: Record<string, OrdenacaoPaciente> = (() => {
  const m: Record<string, OrdenacaoPaciente> = {};
  (Object.keys(ORDENACAO_URL_PAC) as OrdenacaoPaciente[]).forEach((k) => {
    m[ORDENACAO_URL_PAC[k]] = k;
  });
  return m;
})();
function chaveStoragePac(uid: number | string | undefined): string | null {
  if (uid === undefined || uid === null) return null;
  return `pawards.pacientes.ordenar_por.${uid}`;
}

export default function Pacientes() {
  const { unidadeSelecionada } = useClinic();
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  // Task #98 — estado de ordenacao multi-coluna. Hidratado de `?ordenar_por=`
  // (link compartilhavel tem prioridade) ou de localStorage por-usuario.
  const parseOrdPacFromUrl = (): OrdenacaoPaciente[] => {
    if (typeof window === "undefined") return [];
    const v = new URLSearchParams(window.location.search).get("ordenar_por") || "";
    return parseOrdenacoesFromString<ChaveOrdenacaoPaciente>(v, URL_TO_ORDENACAO_PAC, MAX_ORDENACOES_PAC);
  };
  const [ordenacoesPac, setOrdenacoesPacState] = useState<OrdenacaoPaciente[]>(parseOrdPacFromUrl);
  const setOrdenacoesPac = useCallback((novas: OrdenacaoPaciente[]) => {
    const dedupe = dedupePorColuna<ChaveOrdenacaoPaciente>(novas, MAX_ORDENACOES_PAC);
    setOrdenacoesPacState(dedupe);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const valor = serializarOrdenacoes<ChaveOrdenacaoPaciente>(dedupe, ORDENACAO_URL_PAC);
    if (valor) url.searchParams.set("ordenar_por", valor);
    else url.searchParams.delete("ordenar_por");
    window.history.replaceState({}, "", url.toString());
    const k = chaveStoragePac(user?.id);
    if (k) {
      try { window.localStorage.setItem(k, valor); } catch { /* ignore */ }
    }
  }, [user?.id]);
  // Hidrata salva quando user fica disponivel, SOMENTE se a URL nao traz
  // `?ordenar_por=` (link compartilhavel manda).
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const urlTem = new URLSearchParams(window.location.search).get("ordenar_por");
    if (urlTem) return;
    const k = chaveStoragePac(user.id);
    if (!k) return;
    try {
      const v = window.localStorage.getItem(k);
      if (v === null) return;
      const salvas = parseOrdenacoesFromString<ChaveOrdenacaoPaciente>(v, URL_TO_ORDENACAO_PAC, MAX_ORDENACOES_PAC);
      const atual = serializarOrdenacoes<ChaveOrdenacaoPaciente>(ordenacoesPac, ORDENACAO_URL_PAC);
      const proxima = serializarOrdenacoes<ChaveOrdenacaoPaciente>(salvas, ORDENACAO_URL_PAC);
      if (proxima !== atual) setOrdenacoesPac(salvas);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const ordenarPorString = serializarOrdenacoes<ChaveOrdenacaoPaciente>(ordenacoesPac, ORDENACAO_URL_PAC);
  const onClickColuna = useCallback((chave: ChaveOrdenacaoPaciente, shift: boolean) => {
    setOrdenacoesPac(alternarOrdenacao<ChaveOrdenacaoPaciente>(chave, shift, ordenacoesPac));
  }, [ordenacoesPac, setOrdenacoesPac]);
  const colunaAtivaDesc = (k: ChaveOrdenacaoPaciente) =>
    ordenacoesPac.includes(`${k}_DESC` as OrdenacaoPaciente);
  const colunaAtivaAsc = (k: ChaveOrdenacaoPaciente) =>
    ordenacoesPac.includes(`${k}_ASC` as OrdenacaoPaciente);
  const posicaoOrd = (k: ChaveOrdenacaoPaciente): number | undefined => {
    if (ordenacoesPac.length < 2) return undefined;
    const i = ordenacoesPac.findIndex((o) => o.startsWith(`${k}_`));
    return i === -1 ? undefined : i + 1;
  };

  const queryParams = {
    busca,
    ...(unidadeSelecionada ? { unidadeId: unidadeSelecionada } : {}),
    ...(ordenarPorString ? { ordenarPor: ordenarPorString } : {}),
  };
  const { data: pacientes, isLoading } = useListarPacientes(queryParams, {
    query: { queryKey: getListarPacientesQueryKey(queryParams) }
  });
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const criarPaciente = useCriarPaciente();

  const form = useForm<z.infer<typeof pacienteSchema>>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: "", cpf: "", telefone: "", email: "",
      cep: "", endereco: "", complemento: "", bairro: "", cidade: "", estado: "", pais: "Brasil",
      unidadeId: 1,
      genero: "nao_informado",
      gestante: false,
    }
  });

  const buscarCep = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    try {
      const resp = await apiFetch(`/api/cep/${digits}`);
      if (!resp.ok) return;
      const data = await resp.json();
      form.setValue("endereco", data.endereco || "");
      form.setValue("bairro", data.bairro || "");
      form.setValue("cidade", data.cidade || "");
      form.setValue("estado", data.estado || "");
      form.setValue("pais", data.pais || "Brasil");
    } catch {}
  }, [form]);

  const onSubmit = (values: z.infer<typeof pacienteSchema>) => {
    const payload: any = { ...values };
    if (payload.alturaCm === undefined || payload.alturaCm === null || (payload.alturaCm as any) === "") delete payload.alturaCm;
    if (payload.pesoKg === undefined || payload.pesoKg === null || (payload.pesoKg as any) === "") delete payload.pesoKg;
    if (!payload.fototipoFitzpatrick) delete payload.fototipoFitzpatrick;
    if (!payload.atividadeFisica) delete payload.atividadeFisica;
    if (typeof payload.pesoKg === "number") payload.pesoKg = String(payload.pesoKg);
    criarPaciente.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarPacientesQueryKey() });
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 bg-[var(--pw-pergaminho)] min-h-screen">
        <div className="flex items-start justify-between gap-4 pw-borda-sagrada py-1">
          <div className="flex items-start gap-4">
            <UserPlus className="w-7 h-7 text-[var(--pw-petroleo)] mt-1" />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="pw-titulo-manifesto text-2xl">Pacientes</h1>
                <span className="pw-selo-dourado px-2 py-1 text-[10px] tracking-[0.2em]">PADCON · CADASTRO CLÍNICO</span>
              </div>
              <p className="text-sm text-[var(--pw-tinta)] mt-1">
                Pessoas sob cuidado integrativo — anamnese, alergias, comorbidades e protocolos.
              </p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--pw-petroleo)] hover:bg-[var(--pw-petroleo-escuro)] text-white rounded-none">
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Paciente</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="nome" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="cpf" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input
                            value={field.value}
                            onChange={(e) => field.onChange(formatCpf(e.target.value))}
                            placeholder="000.000.000-00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="telefone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                          <Input
                            value={field.value}
                            onChange={(e) => field.onChange(formatCelular(e.target.value))}
                            placeholder="(11) 99999-9999"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="genero" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="nao_informado">Não informado</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Dados Clínicos</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="alturaCm" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altura (cm)</FormLabel>
                          <FormControl><Input type="number" min={30} max={260} placeholder="170" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="pesoKg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (kg)</FormLabel>
                          <FormControl><Input type="number" step="0.1" min={0.5} max={500} placeholder="70.5" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="fototipoFitzpatrick" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fototipo (Fitzpatrick)</FormLabel>
                          <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                            <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="I">I — Pele muito clara</SelectItem>
                              <SelectItem value="II">II — Pele clara</SelectItem>
                              <SelectItem value="III">III — Pele média</SelectItem>
                              <SelectItem value="IV">IV — Pele morena clara</SelectItem>
                              <SelectItem value="V">V — Pele morena</SelectItem>
                              <SelectItem value="VI">VI — Pele negra</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <FormField control={form.control} name="atividadeFisica" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Atividade Física</FormLabel>
                          <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                            <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="sedentario">Sedentário</SelectItem>
                              <SelectItem value="leve">Leve</SelectItem>
                              <SelectItem value="moderado">Moderado</SelectItem>
                              <SelectItem value="intenso">Intenso</SelectItem>
                              <SelectItem value="atleta">Atleta</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="gestante" render={({ field }) => (
                        <FormItem className="flex flex-col gap-2">
                          <FormLabel>Gestante</FormLabel>
                          <div className="flex items-center gap-2 h-10">
                            <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                            <span className="text-sm text-muted-foreground">Marcar se gestante / lactante</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="alergias" render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Alergias <span className="text-red-500">⚠</span></FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder="Ex.: Dipirona, frutos do mar, látex…" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="condicoesClinicas" render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Condições Clínicas / Comorbidades</FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder="Ex.: Hipertensão, Diabetes tipo 2, Hipotireoidismo…" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="medicamentosContinuos" render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Medicamentos de Uso Contínuo</FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder="Ex.: Losartana 50mg 1x/dia, Levotiroxina 50mcg em jejum…" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Endereco</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="cep" render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input
                              value={field.value}
                              onChange={(e) => {
                                const formatted = formatCep(e.target.value);
                                field.onChange(formatted);
                                if (formatted.replace(/\D/g, '').length === 8) buscarCep(formatted);
                              }}
                              placeholder="00000-000"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="col-span-2">
                        <FormField control={form.control} name="endereco" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereco</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <FormField control={form.control} name="complemento" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl><Input {...field} placeholder="Apto, Sala, Bloco..." /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="bairro" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <FormField control={form.control} name="cidade" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="estado" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl><Input {...field} placeholder="SP" maxLength={2} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="pais" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pais</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={criarPaciente.isPending}>
                    {criarPaciente.isPending ? "Salvando..." : "Salvar Paciente"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="pw-card rounded-none">
          <CardHeader className="pb-3 border-b border-[var(--pw-marfim)]">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[var(--pw-cinza-bruma)]" />
              <Input
                placeholder="Buscar pacientes por nome ou CPF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="max-w-sm border-[var(--pw-marfim)] rounded-none focus:border-[var(--pw-petroleo)]"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <ColunaOrdenavel
                          label="Nome"
                          ativaDesc={colunaAtivaDesc("NOME")}
                          ativaAsc={colunaAtivaAsc("NOME")}
                          posicao={posicaoOrd("NOME")}
                          onClick={(shift) => onClickColuna("NOME", shift)}
                          testId="ord-nome"
                        />
                      </TableHead>
                      <TableHead>
                        <ColunaOrdenavel
                          label="CPF"
                          ativaDesc={colunaAtivaDesc("CPF")}
                          ativaAsc={colunaAtivaAsc("CPF")}
                          posicao={posicaoOrd("CPF")}
                          onClick={(shift) => onClickColuna("CPF", shift)}
                          testId="ord-cpf"
                        />
                      </TableHead>
                      <TableHead>
                        <ColunaOrdenavel
                          label="Celular"
                          ativaDesc={colunaAtivaDesc("TELEFONE")}
                          ativaAsc={colunaAtivaAsc("TELEFONE")}
                          posicao={posicaoOrd("TELEFONE")}
                          onClick={(shift) => onClickColuna("TELEFONE", shift)}
                          testId="ord-telefone"
                        />
                      </TableHead>
                      <TableHead>
                        <ColunaOrdenavel
                          label="Status"
                          ativaDesc={colunaAtivaDesc("STATUS")}
                          ativaAsc={colunaAtivaAsc("STATUS")}
                          posicao={posicaoOrd("STATUS")}
                          onClick={(shift) => onClickColuna("STATUS", shift)}
                          testId="ord-status"
                        />
                      </TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pacientes?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                          Nenhum paciente encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pacientes?.map((paciente) => (
                        <TableRow key={paciente.id}>
                          <TableCell className="font-medium">{paciente.nome}</TableCell>
                          <TableCell>{paciente.cpf || "-"}</TableCell>
                          <TableCell>{paciente.telefone}</TableCell>
                          <TableCell>
                            {paciente.statusAtivo ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[var(--pw-saude)]/10 text-[var(--pw-saude)] border border-[var(--pw-saude)]/30">
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[var(--pw-critico)]/10 text-[var(--pw-critico)] border border-[var(--pw-critico)]/30">
                                Inativo
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/pacientes/${paciente.id}`} className="text-[var(--pw-petroleo)] hover:text-[var(--pw-dourado)] hover:underline text-sm font-medium transition-colors">
                              Ver Detalhes →
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
