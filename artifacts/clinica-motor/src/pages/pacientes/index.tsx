import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListarPacientes, getListarPacientesQueryKey, useCriarPaciente, CriarPacienteBody } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useCallback, useEffect, useMemo, Fragment } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search, UserPlus, User as UserIcon, Stethoscope, MapPin, Check,
  Users as UsersIcon, Activity, Sparkles, ChevronRight as ChevronRightIcon,
  Phone, AtSign, AlertTriangle,
} from "lucide-react";
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
// Task #216 — hook generico de "memoria de filtros por usuario com URL
// ganhando do storage". Antes a logica de hidratacao + persistencia vivia
// inline aqui (espelhada da timeline de assinaturas); agora vem da lib
// compartilhada `lib/useFiltroPersistido.ts`.
import { useFiltroPersistido } from "@/lib/useFiltroPersistido";
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

// Avatar visual: iniciais + cor deterministica por hash do nome.
// Cores escolhidas pra contrastar bem com fundo pergaminho e ainda
// alinhar com a paleta neon do resto do sistema (azul/verde/ambar/coral/violeta).
const PALETA_AVATAR = ["#5B8DEF", "#7BC79E", "#F5B946", "#E07A5F", "#A78BFA", "#22C7B8", "#F472B6", "#FB923C"];
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
function corDoNome(nome: string): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = ((h << 5) - h) + nome.charCodeAt(i);
  return PALETA_AVATAR[Math.abs(h) % PALETA_AVATAR.length];
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
// Task #216 — chave de storage migrou pro hook generico
// `useFiltroPersistido` (`pawards.pacientes.ordenar_por.<uid>` continua
// igual, pra preservar memoria ja gravada nas contas dos usuarios).

export default function Pacientes() {
  const { unidadeSelecionada } = useClinic();
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  // Task #98 — estado de ordenacao multi-coluna.
  // Task #216 — agora via hook generico: hidrata de `?ordenar_por=` (URL
  // vence) ou de localStorage por-usuario. parseOrdenacoesFromString ja
  // aplica dedupe internamente; o setter externo aplica dedupe extra antes
  // de chamar o hook (defesa em profundidade pra clicks rapidos).
  const [ordenacoesPac, setOrdenacoesPacRaw] = useFiltroPersistido<OrdenacaoPaciente[]>({
    scope: "pacientes",
    nome: "ordenar_por",
    uid: user?.id,
    paramUrl: "ordenar_por",
    defaultValue: [],
    parse: (raw) =>
      parseOrdenacoesFromString<ChaveOrdenacaoPaciente>(raw, URL_TO_ORDENACAO_PAC, MAX_ORDENACOES_PAC),
    serialize: (lista) =>
      serializarOrdenacoes<ChaveOrdenacaoPaciente>(lista, ORDENACAO_URL_PAC),
  });
  const setOrdenacoesPac = useCallback((novas: OrdenacaoPaciente[]) => {
    setOrdenacoesPacRaw(dedupePorColuna<ChaveOrdenacaoPaciente>(novas, MAX_ORDENACOES_PAC));
  }, [setOrdenacoesPacRaw]);
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
      // Default usa unidade selecionada no switcher (TDAH: respeita contexto).
      // Cai pra 1 quando em "Visão Global" ou sem unidade — usuário deve
      // trocar manualmente se 1 não for o destino certo.
      unidadeId: unidadeSelecionada ?? 1,
      genero: "nao_informado",
      gestante: false,
    }
  });

  // 🪜 WIZARD — 3 etapas no modal Novo Paciente. Estado local ao componente.
  // Reset pra etapa 1 toda vez que o modal abre. Validação por etapa
  // (form.trigger nos campos da etapa) impede avançar com campo inválido.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  useEffect(() => { if (open) setStep(1); }, [open]);
  const STEPS = [
    { n: 1 as const, label: "Identidade", icon: UserIcon, cor: "#5B8DEF" },
    { n: 2 as const, label: "Dados Clínicos", icon: Stethoscope, cor: "#7BC79E" },
    { n: 3 as const, label: "Endereço", icon: MapPin, cor: "#F5B946" },
  ];
  const camposPorStep: Record<1 | 2 | 3, (keyof z.infer<typeof pacienteSchema>)[]> = {
    1: ["nome", "telefone", "cpf", "email", "genero", "unidadeId"],
    2: ["alturaCm", "pesoKg", "fototipoFitzpatrick", "atividadeFisica", "gestante", "alergias", "condicoesClinicas", "medicamentosContinuos"],
    3: ["cep", "endereco", "complemento", "bairro", "cidade", "estado", "pais"],
  };
  const irProximoStep = async () => {
    const ok = await form.trigger(camposPorStep[step]);
    if (ok) setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  };

  // Stats da listagem — calculados em cima dos pacientes retornados.
  const stats = useMemo(() => {
    const total = pacientes?.length ?? 0;
    const ativos = pacientes?.filter((p) => p.statusAtivo).length ?? 0;
    return { total, ativos, inativos: total - ativos };
  }, [pacientes]);

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
      <div className="p-6 space-y-6 bg-[var(--pw-pergaminho)] text-[var(--pw-grafite)] min-h-screen">
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
            <DialogContent className="sm:max-w-[680px] max-h-[92vh] overflow-hidden p-0 gap-0 rounded-none border-l-[3px] border-l-[var(--pw-petroleo)]">
              {/* HEADER do wizard com STEPPER visual */}
              <DialogHeader className="px-6 pt-5 pb-4 bg-[var(--pw-marfim)]/30 border-b border-[var(--pw-marfim)]">
                <DialogTitle className="flex items-center gap-3 text-[var(--pw-grafite)]">
                  <UserPlus className="w-5 h-5 text-[var(--pw-petroleo)]" />
                  <span className="text-base font-bold tracking-tight">Novo Paciente</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--pw-cinza-bruma)] ml-auto">
                    Etapa {String(step).padStart(2, "0")} / 03
                  </span>
                </DialogTitle>
                {/* Stepper neon */}
                <div className="flex items-center mt-3">
                  {STEPS.map((s, i) => {
                    const ativo = step === s.n;
                    const completo = step > s.n;
                    const SIcon = s.icon;
                    return (
                      <Fragment key={s.n}>
                        <button
                          type="button"
                          onClick={() => completo && setStep(s.n)}
                          disabled={!completo && !ativo}
                          className={`flex items-center gap-2.5 transition-all ${completo ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                          data-testid={`wizard-step-${s.n}`}
                        >
                          <div
                            className="w-9 h-9 flex items-center justify-center border-l-[3px] transition-all"
                            style={{
                              borderLeftColor: ativo || completo ? s.cor : "#d4d4d4",
                              backgroundColor: ativo ? `${s.cor}22` : completo ? `${s.cor}14` : "transparent",
                            }}
                          >
                            {completo ? <Check className="w-4 h-4" style={{ color: s.cor }} /> : <SIcon className="w-4 h-4" style={{ color: ativo ? s.cor : "#999" }} />}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-[9px] uppercase tracking-widest font-bold leading-none" style={{ color: ativo || completo ? s.cor : "#aaa" }}>
                              {String(s.n).padStart(2, "0")}
                            </span>
                            <span className={`text-[12px] font-semibold leading-tight mt-0.5 ${ativo ? "text-[var(--pw-grafite)]" : completo ? "text-[var(--pw-tinta)]" : "text-[#aaa]"}`}>
                              {s.label}
                            </span>
                          </div>
                        </button>
                        {i < STEPS.length - 1 && (
                          <div className="flex-1 h-px mx-3 transition-colors" style={{ backgroundColor: step > s.n ? s.cor : "#e4e4e4" }} />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[calc(92vh-180px)]">
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                    {/* ━━━━━━━━ STEP 1: IDENTIDADE ━━━━━━━━ */}
                    {step === 1 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="flex items-center gap-2 pb-1 border-b border-[var(--pw-marfim)]">
                          <UserIcon className="w-4 h-4 text-[#5B8DEF]" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--pw-tinta)]">Quem é a pessoa</span>
                        </div>

                        <FormField control={form.control} name="nome" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Nome Completo *</FormLabel>
                            <FormControl><Input {...field} placeholder="Ex.: Maria Aparecida da Silva" className="rounded-none border-[var(--pw-marfim)] focus:border-[#5B8DEF] focus:ring-[#5B8DEF]/20 text-base" autoFocus /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="telefone" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)] flex items-center gap-1"><Phone className="w-3 h-3" /> Celular *</FormLabel>
                              <FormControl>
                                <Input value={field.value} onChange={(e) => field.onChange(formatCelular(e.target.value))} placeholder="(11) 99999-9999" className="rounded-none border-[var(--pw-marfim)] focus:border-[#5B8DEF] focus:ring-[#5B8DEF]/20 font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="cpf" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">CPF</FormLabel>
                              <FormControl>
                                <Input value={field.value} onChange={(e) => field.onChange(formatCpf(e.target.value))} placeholder="000.000.000-00" className="rounded-none border-[var(--pw-marfim)] focus:border-[#5B8DEF] focus:ring-[#5B8DEF]/20 font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)] flex items-center gap-1"><AtSign className="w-3 h-3" /> E-mail</FormLabel>
                            <FormControl><Input type="email" {...field} placeholder="paciente@exemplo.com" className="rounded-none border-[var(--pw-marfim)] focus:border-[#5B8DEF] focus:ring-[#5B8DEF]/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="genero" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Gênero</FormLabel>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { v: "feminino", l: "Feminino", e: "♀" },
                                { v: "masculino", l: "Masculino", e: "♂" },
                                { v: "outro", l: "Outro", e: "⚧" },
                                { v: "nao_informado", l: "—", e: "?" },
                              ].map((g) => (
                                <button
                                  key={g.v}
                                  type="button"
                                  onClick={() => field.onChange(g.v)}
                                  className={`flex flex-col items-center gap-0.5 py-2 px-2 border-l-[3px] transition-all ${field.value === g.v ? "bg-[#5B8DEF]/15 border-l-[#5B8DEF] text-[var(--pw-grafite)] font-semibold" : "border-l-transparent border border-[var(--pw-marfim)] text-[var(--pw-tinta)] hover:bg-[var(--pw-marfim)]/30"}`}
                                  data-testid={`genero-${g.v}`}
                                >
                                  <span className="text-base leading-none">{g.e}</span>
                                  <span className="text-[10px] uppercase tracking-wider font-bold">{g.l}</span>
                                </button>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* ━━━━━━━━ STEP 2: CLÍNICO ━━━━━━━━ */}
                    {step === 2 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="flex items-center gap-2 pb-1 border-b border-[var(--pw-marfim)]">
                          <Stethoscope className="w-4 h-4 text-[#7BC79E]" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--pw-tinta)]">Perfil clínico</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="alturaCm" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Altura (cm)</FormLabel>
                              <FormControl><Input type="number" min={30} max={260} placeholder="170" {...field} value={field.value ?? ""} className="rounded-none border-[var(--pw-marfim)] focus:border-[#7BC79E] focus:ring-[#7BC79E]/20 font-mono" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="pesoKg" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Peso (kg)</FormLabel>
                              <FormControl><Input type="number" step="0.1" min={0.5} max={500} placeholder="70.5" {...field} value={field.value ?? ""} className="rounded-none border-[var(--pw-marfim)] focus:border-[#7BC79E] focus:ring-[#7BC79E]/20 font-mono" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="fototipoFitzpatrick" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Fototipo</FormLabel>
                              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                                <FormControl><SelectTrigger className="rounded-none border-[var(--pw-marfim)]"><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="I">I — Muito clara</SelectItem>
                                  <SelectItem value="II">II — Clara</SelectItem>
                                  <SelectItem value="III">III — Média</SelectItem>
                                  <SelectItem value="IV">IV — Morena clara</SelectItem>
                                  <SelectItem value="V">V — Morena</SelectItem>
                                  <SelectItem value="VI">VI — Negra</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="atividadeFisica" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Atividade Física</FormLabel>
                              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                                <FormControl><SelectTrigger className="rounded-none border-[var(--pw-marfim)]"><SelectValue placeholder="—" /></SelectTrigger></FormControl>
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
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Gestante / Lactante</FormLabel>
                              <button
                                type="button"
                                onClick={() => field.onChange(!field.value)}
                                className={`w-full flex items-center gap-2 px-3 py-2 border-l-[3px] transition-all ${field.value ? "bg-[#F472B6]/15 border-l-[#F472B6] text-[var(--pw-grafite)] font-semibold" : "border-l-transparent border border-[var(--pw-marfim)] text-[var(--pw-tinta)] hover:bg-[var(--pw-marfim)]/30"}`}
                                data-testid="toggle-gestante"
                              >
                                <Checkbox checked={field.value} className="pointer-events-none" />
                                <span className="text-[12px]">{field.value ? "Sim — gestante/lactante" : "Marcar se for"}</span>
                              </button>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="alergias" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[#E07A5F] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Alergias</FormLabel>
                            <FormControl><Textarea {...field} rows={2} placeholder="Dipirona, frutos do mar, látex…" className="rounded-none border-[#E07A5F]/40 focus:border-[#E07A5F] focus:ring-[#E07A5F]/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="condicoesClinicas" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Condições / Comorbidades</FormLabel>
                            <FormControl><Textarea {...field} rows={2} placeholder="Hipertensão, Diabetes tipo 2, Hipotireoidismo…" className="rounded-none border-[var(--pw-marfim)] focus:border-[#7BC79E] focus:ring-[#7BC79E]/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="medicamentosContinuos" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Medicamentos Contínuos</FormLabel>
                            <FormControl><Textarea {...field} rows={2} placeholder="Losartana 50mg 1x/dia, Levotiroxina 50mcg em jejum…" className="rounded-none border-[var(--pw-marfim)] focus:border-[#7BC79E] focus:ring-[#7BC79E]/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* ━━━━━━━━ STEP 3: ENDEREÇO ━━━━━━━━ */}
                    {step === 3 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="flex items-center gap-2 pb-1 border-b border-[var(--pw-marfim)]">
                          <MapPin className="w-4 h-4 text-[#F5B946]" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--pw-tinta)]">Onde mora</span>
                          <span className="ml-auto text-[10px] text-[var(--pw-cinza-bruma)] italic">CEP preenche sozinho ↓</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="cep" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">CEP</FormLabel>
                              <FormControl>
                                <Input value={field.value} onChange={(e) => { const f = formatCep(e.target.value); field.onChange(f); if (f.replace(/\D/g, "").length === 8) buscarCep(f); }} placeholder="00000-000" className="rounded-none border-[var(--pw-marfim)] focus:border-[#F5B946] focus:ring-[#F5B946]/20 font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="col-span-2">
                            <FormField control={form.control} name="endereco" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Endereço</FormLabel>
                                <FormControl><Input {...field} placeholder="Rua, número" className="rounded-none border-[var(--pw-marfim)] focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="complemento" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Complemento</FormLabel>
                              <FormControl><Input {...field} placeholder="Apto, Sala, Bloco…" className="rounded-none border-[var(--pw-marfim)] focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="bairro" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Bairro</FormLabel>
                              <FormControl><Input {...field} className="rounded-none border-[var(--pw-marfim)] focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="cidade" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">Cidade</FormLabel>
                              <FormControl><Input {...field} className="rounded-none border-[var(--pw-marfim)] focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="estado" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">UF</FormLabel>
                              <FormControl><Input {...field} placeholder="SP" maxLength={2} className="rounded-none border-[var(--pw-marfim)] focus:border-[#F5B946] focus:ring-[#F5B946]/20 font-mono uppercase" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="pais" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-[var(--pw-tinta)]">País</FormLabel>
                              <FormControl><Input {...field} className="rounded-none border-[var(--pw-marfim)] focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="mt-4 p-3 bg-[#7BC79E]/10 border-l-[3px] border-l-[#7BC79E]">
                          <p className="text-[11px] text-[var(--pw-grafite)] leading-relaxed">
                            <Check className="inline w-3.5 h-3.5 text-[#7BC79E] mr-1" />
                            Tudo pronto. Confere os dados e clica <strong>Cadastrar Paciente</strong>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FOOTER do wizard com navegação */}
                  <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--pw-marfim)] bg-[var(--pw-marfim)]/20">
                    <Button type="button" variant="ghost" onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))} disabled={step === 1} className="rounded-none text-[var(--pw-tinta)] disabled:opacity-30" data-testid="wizard-voltar">
                      ← Voltar
                    </Button>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3].map((n) => (
                        <span key={n} className="w-2 h-2 rounded-full transition-colors" style={{ backgroundColor: step >= n ? STEPS[n - 1].cor : "#d4d4d4" }} />
                      ))}
                    </div>
                    {step < 3 ? (
                      <Button type="button" onClick={irProximoStep} className="bg-[var(--pw-petroleo)] hover:bg-[var(--pw-petroleo-escuro)] text-white rounded-none" data-testid="wizard-proximo">
                        Próximo →
                      </Button>
                    ) : (
                      <Button type="submit" disabled={criarPaciente.isPending} className="bg-[#7BC79E] hover:bg-[#5fa37e] text-white rounded-none font-bold" data-testid="wizard-salvar">
                        {criarPaciente.isPending ? "Salvando…" : "✓ Cadastrar Paciente"}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ━━ STATS NEON: 3 cards de números grandes pra bater o olho ━━ */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total no Filtro", valor: stats.total, icon: UsersIcon, cor: "#5B8DEF" },
            { label: "Pacientes Ativos", valor: stats.ativos, icon: Activity, cor: "#7BC79E" },
            { label: "Inativos", valor: stats.inativos, icon: Sparkles, cor: "#E07A5F" },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className="bg-white border-l-[3px] px-4 py-3 flex items-center gap-3"
                style={{ borderLeftColor: c.cor, boxShadow: `inset 0 0 0 1px ${c.cor}22` }}
                data-testid={`stat-${c.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${c.cor}1A`, color: c.cor }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--pw-cinza-bruma)] leading-none">{c.label}</span>
                  <span className="text-2xl font-bold font-mono text-[var(--pw-grafite)] leading-tight mt-1 tabular-nums">{isLoading ? "—" : c.valor.toLocaleString("pt-BR")}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ━━ BUSCA + LISTA densa visual ━━ */}
        <div className="bg-white border-l-[3px] border-l-[var(--pw-petroleo)] text-[var(--pw-grafite)]">
          {/* Barra de busca grande e óbvia */}
          <div className="border-b border-[var(--pw-marfim)] px-4 py-3 flex items-center gap-3 bg-[var(--pw-marfim)]/15">
            <Search className="h-4 w-4 text-[var(--pw-petroleo)] flex-shrink-0" />
            <Input
              placeholder="Buscar paciente por nome, CPF…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 max-w-md border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-[var(--pw-cinza-bruma)]"
              data-testid="input-busca-pacientes"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="text-[10px] uppercase tracking-widest font-bold text-[var(--pw-tinta)] hover:text-[var(--pw-petroleo)]"
                data-testid="limpar-busca"
              >
                Limpar
              </button>
            )}
            <span className="ml-auto text-[10px] uppercase tracking-widest font-mono text-[var(--pw-cinza-bruma)]">
              {isLoading ? "carregando…" : `${stats.total} resultado${stats.total === 1 ? "" : "s"}`}
            </span>
          </div>

          {/* Header da grade (ordenação) */}
          <div className="hidden md:grid grid-cols-[1fr_140px_160px_100px_44px] gap-3 px-4 py-2 border-b border-[var(--pw-marfim)] bg-[var(--pw-marfim)]/8 text-[10px] uppercase tracking-[0.15em] font-bold text-[var(--pw-tinta)]">
            <ColunaOrdenavel label="Paciente" ativaDesc={colunaAtivaDesc("NOME")} ativaAsc={colunaAtivaAsc("NOME")} posicao={posicaoOrd("NOME")} onClick={(shift) => onClickColuna("NOME", shift)} testId="ord-nome" />
            <ColunaOrdenavel label="CPF" ativaDesc={colunaAtivaDesc("CPF")} ativaAsc={colunaAtivaAsc("CPF")} posicao={posicaoOrd("CPF")} onClick={(shift) => onClickColuna("CPF", shift)} testId="ord-cpf" />
            <ColunaOrdenavel label="Celular" ativaDesc={colunaAtivaDesc("TELEFONE")} ativaAsc={colunaAtivaAsc("TELEFONE")} posicao={posicaoOrd("TELEFONE")} onClick={(shift) => onClickColuna("TELEFONE", shift)} testId="ord-telefone" />
            <ColunaOrdenavel label="Status" ativaDesc={colunaAtivaDesc("STATUS")} ativaAsc={colunaAtivaAsc("STATUS")} posicao={posicaoOrd("STATUS")} onClick={(shift) => onClickColuna("STATUS", shift)} testId="ord-status" />
            <span className="text-right">↳</span>
          </div>

          {/* Linhas dos pacientes */}
          {isLoading ? (
            <div className="divide-y divide-[var(--pw-marfim)]">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--pw-marfim)] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-[var(--pw-marfim)] animate-pulse w-1/3" />
                    <div className="h-2.5 bg-[var(--pw-marfim)]/70 animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : pacientes?.length === 0 ? (
            <div className="text-center py-16 px-4 text-[var(--pw-cinza-bruma)]">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{busca ? `Nenhum paciente bate com "${busca}"` : "Nenhum paciente cadastrado ainda."}</p>
              {!busca && (
                <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 border-l-[3px] border-l-[var(--pw-petroleo)] bg-[var(--pw-petroleo)]/10 text-[var(--pw-petroleo)] text-sm font-bold hover:bg-[var(--pw-petroleo)]/15">
                  <UserPlus className="w-4 h-4" /> Cadastrar o Primeiro
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--pw-marfim)]">
              {pacientes?.map((paciente) => {
                const cor = corDoNome(paciente.nome);
                const ini = iniciaisDoNome(paciente.nome);
                return (
                  <Link
                    key={paciente.id}
                    href={`/pacientes/${paciente.id}`}
                    className="group grid grid-cols-[1fr_140px_160px_100px_44px] gap-3 items-center px-4 py-2.5 border-l-[3px] border-l-transparent hover:bg-[var(--pw-marfim)]/25 hover:border-l-[var(--pw-petroleo)] transition-all"
                    data-testid={`paciente-row-${paciente.id}`}
                  >
                    {/* Coluna 1: avatar + nome + email */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 flex items-center justify-center font-bold text-[13px] flex-shrink-0 text-white font-mono tracking-wider"
                        style={{ backgroundColor: cor }}
                        aria-hidden
                      >
                        {ini}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-semibold text-[var(--pw-grafite)] truncate group-hover:text-[var(--pw-petroleo)] transition-colors">
                          {paciente.nome}
                        </span>
                        {paciente.email && (
                          <span className="text-[10px] text-[var(--pw-cinza-bruma)] truncate flex items-center gap-1">
                            <AtSign className="w-2.5 h-2.5" /> {paciente.email}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Coluna 2: CPF */}
                    <span className="text-[12px] font-mono text-[var(--pw-tinta)] tabular-nums truncate">
                      {paciente.cpf || <span className="text-[var(--pw-cinza-bruma)]">—</span>}
                    </span>
                    {/* Coluna 3: Celular com ícone */}
                    <span className="text-[12px] font-mono text-[var(--pw-tinta)] tabular-nums truncate flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-[#7BC79E]" /> {paciente.telefone}
                    </span>
                    {/* Coluna 4: status badge */}
                    <span>
                      {paciente.statusAtivo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border-l-[3px] border-l-[var(--pw-saude)] bg-[var(--pw-saude)]/10 text-[var(--pw-saude)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--pw-saude)] animate-pulse" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border-l-[3px] border-l-[var(--pw-critico)] bg-[var(--pw-critico)]/10 text-[var(--pw-critico)]">
                          Inativo
                        </span>
                      )}
                    </span>
                    {/* Coluna 5: seta */}
                    <ChevronRightIcon className="w-4 h-4 text-[var(--pw-cinza-bruma)] group-hover:text-[var(--pw-petroleo)] group-hover:translate-x-0.5 transition-all justify-self-end" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
