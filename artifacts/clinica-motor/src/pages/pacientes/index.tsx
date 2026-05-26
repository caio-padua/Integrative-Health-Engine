import { LayoutPawards as Layout } from "@/components/LayoutPawards";
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
  Phone, AtSign, AlertTriangle, Camera, CreditCard, FileText, Crown, Cloud, Receipt,
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
import { Link, useSearch } from "wouter";
import { useClinic } from "@/contexts/ClinicContext";
import { useToast } from "@/hooks/use-toast";

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
  // Bug #2 (21/mai/2026): coluna `numero_endereco` (camelCase
  // `numeroEndereco`) JÁ EXISTIA no banco — só faltava plugar no schema
  // Drizzle + Zod + JSX. ViaCEP não devolve número → input manual,
  // opcional no schema porque alguns endereços (sítio, fazenda) não têm.
  numeroEndereco: z.string().optional(),
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
  // Etapa 4 — Mídia & Documentos. Campos JÁ existentes no schema do banco
  // (lib/db/src/schema/pacientes.ts): foto_rosto, foto_corpo, plano_acompanhamento,
  // google_drive_folder_id. Não precisa migration.
  fotoRosto: z.string().url("URL inválida").optional().or(z.literal("")),
  fotoCorpo: z.string().url("URL inválida").optional().or(z.literal("")),
  googleDriveFolderId: z.string().optional(),
  planoAcompanhamento: z.enum(["diamante", "ouro", "prata", "cobre"]).optional(),
  // Etapa 5 — Pagamento & NF. APENAS CADASTRAIS (sem integração de cobrança
  // por enquanto, decisão do Caio em 20/05). Persistência destes campos
  // depende de migration aditiva pacientes pagamento_* / nota_fiscal_*
  // (PRÓXIMO TURNO). Por ora ficam UI-only e são removidos do payload.
  pagamentoTitularNome: z.string().optional(),
  pagamentoCartaoUltimos4Digitos: z.string().regex(/^\d{0,4}$/, "Use só dígitos").optional().or(z.literal("")),
  pagamentoCartaoBandeira: z.enum(["visa", "mastercard", "elo", "amex", "hipercard", "outro"]).optional(),
  notaFiscalCnpj: z.string().optional(),
  notaFiscalRazaoSocial: z.string().optional(),
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
  const { unidadeSelecionada, unidadesDisponiveis } = useClinic();
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
  const { toast } = useToast();

  const form = useForm<z.infer<typeof pacienteSchema>>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      nome: "", cpf: "", telefone: "", email: "",
      cep: "", endereco: "", numeroEndereco: "", complemento: "", bairro: "", cidade: "", estado: "", pais: "Brasil",
      // Bug #4 (21/mai/2026): NÃO existe mais fallback `?? 1`. Antes,
      // quando o usuário estava em "Visão Global" (unidadeSelecionada=null)
      // o paciente nascia órfão na unidade 1 (que pode não ser nem clínica
      // ativa). Agora deixamos 0 e o Zod min(1) bloqueia avanço do step 1
      // até o usuário escolher uma unidade no SELECT que aparece quando
      // contexto é Global. Backend valida de novo (defesa em profundidade).
      unidadeId: unidadeSelecionada ?? 0,
      genero: "nao_informado",
      gestante: false,
    }
  });

  // 🪜 WIZARD — 3 etapas no modal Novo Paciente. Estado local ao componente.
  // Reset pra etapa 1 toda vez que o modal abre. Validação por etapa
  // (form.trigger nos campos da etapa) impede avançar com campo inválido.
  type StepN = 1 | 2 | 3 | 4 | 5;
  const TOTAL_STEPS = 5;
  // 🩺 MODO COCKPIT — detecta ?modo=cockpit na URL (vem do atalho destacado
  // do sidebar). Quando ativo, clicar numa linha da lista vai pra
  // /pacientes/:id/cockpit (painel tático) em vez de /pacientes/:id (ficha
  // clássica). useSearch do wouter devolve a query string sem o "?".
  const searchString = useSearch();
  const modoCockpit = new URLSearchParams(searchString).get("modo") === "cockpit";

  const [step, setStep] = useState<StepN>(1);
  useEffect(() => { if (open) setStep(1); }, [open]);
  const STEPS = [
    { n: 1 as StepN, label: "Identidade", icon: UserIcon, cor: "#5B8DEF" },
    { n: 2 as StepN, label: "Clínico", icon: Stethoscope, cor: "#7BC79E" },
    { n: 3 as StepN, label: "Endereço", icon: MapPin, cor: "#F5B946" },
    { n: 4 as StepN, label: "Mídia & Drive", icon: Camera, cor: "#A78BFA" },
    { n: 5 as StepN, label: "Plano & NF", icon: CreditCard, cor: "#22C7B8" },
  ];
  const camposPorStep: Record<StepN, (keyof z.infer<typeof pacienteSchema>)[]> = {
    1: ["nome", "telefone", "cpf", "email", "genero", "unidadeId"],
    2: ["alturaCm", "pesoKg", "fototipoFitzpatrick", "atividadeFisica", "gestante", "alergias", "condicoesClinicas", "medicamentosContinuos"],
    3: ["cep", "endereco", "numeroEndereco", "complemento", "bairro", "cidade", "estado", "pais"],
    4: ["fotoRosto", "fotoCorpo", "googleDriveFolderId", "planoAcompanhamento"],
    5: ["pagamentoTitularNome", "pagamentoCartaoUltimos4Digitos", "pagamentoCartaoBandeira", "notaFiscalCnpj", "notaFiscalRazaoSocial"],
  };
  const irProximoStep = async () => {
    const ok = await form.trigger(camposPorStep[step]);
    if (ok) setStep((s) => (s < TOTAL_STEPS ? ((s + 1) as StepN) : s));
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
    // Bug #5 (21/mai/2026 — descoberto via e2e): se o usuário apertar Enter
    // dentro de qualquer input do wizard estando em step < 5, o navegador
    // dispara o submit nativo do <form>, RHF roda handleSubmit, onSubmit
    // executa e o POST /pacientes cria o paciente antes da hora (chegou no
    // 201, depois modal fecha sozinho e o botão "Próximo →" some, dando
    // timeout no clique). Gate explícito: só efetiva o submit quando estiver
    // realmente no último step. Se não tiver, avança um step (UX coerente
    // com a intenção do Enter = "próximo").
    if (step < TOTAL_STEPS) {
      void irProximoStep();
      return;
    }
    const payload: any = { ...values };
    if (payload.alturaCm === undefined || payload.alturaCm === null || (payload.alturaCm as any) === "") delete payload.alturaCm;
    if (payload.pesoKg === undefined || payload.pesoKg === null || (payload.pesoKg as any) === "") delete payload.pesoKg;
    if (!payload.fototipoFitzpatrick) delete payload.fototipoFitzpatrick;
    if (!payload.atividadeFisica) delete payload.atividadeFisica;
    if (typeof payload.pesoKg === "number") payload.pesoKg = String(payload.pesoKg);
    // Mídia & Drive — limpa strings vazias pra não estourar validador URL no backend
    if (!payload.fotoRosto) delete payload.fotoRosto;
    if (!payload.fotoCorpo) delete payload.fotoCorpo;
    if (!payload.googleDriveFolderId) delete payload.googleDriveFolderId;
    if (!payload.planoAcompanhamento) delete payload.planoAcompanhamento;
    // Plano & NF — campos UI-only neste sprint, não vão pro backend até a
    // migration aditiva pacientes_pagamento_e_nf. Removo do payload pra não
    // quebrar o CriarPacienteBody do api-zod (que ainda não conhece esses campos).
    delete payload.pagamentoTitularNome;
    delete payload.pagamentoCartaoUltimos4Digitos;
    delete payload.pagamentoCartaoBandeira;
    delete payload.notaFiscalCnpj;
    delete payload.notaFiscalRazaoSocial;
    criarPaciente.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarPacientesQueryKey() });
        setOpen(false);
        form.reset();
        toast({ title: "Paciente cadastrado", description: `${values.nome} foi adicionado com sucesso.` });
      },
      // Bug #3 (21/mai/2026): antes do fix, falha no POST /pacientes (400/500)
      // ficava engolida pelo useMutation sem feedback visual — modal travava
      // mostrando "Salvando…" indefinidamente. Agora extraímos a mensagem
      // do backend (ex.: "Unidade ID 99 não existe…") e mostramos toast.
      onError: (err: unknown) => {
        const mensagem = (() => {
          const e = err as { response?: { data?: { error?: string } }; message?: string };
          return e?.response?.data?.error || e?.message || "Erro desconhecido ao cadastrar paciente.";
        })();
        toast({
          title: "Falha ao cadastrar paciente",
          description: mensagem,
          variant: "destructive",
        });
      },
    });
  };

  // Bug #4 hardening (code review architect 21/mai): quando o modal abre,
  // ressincroniza o unidadeId com o contexto atual do switcher. Sem isso,
  // se o usuário troca de unidade no switcher DEPOIS do mount mas ANTES
  // de abrir o modal, o defaultValue do form ficaria stale na unidade
  // antiga e o paciente poderia ir pro lugar errado.
  useEffect(() => {
    if (open) {
      form.setValue("unidadeId", unidadeSelecionada ?? 0);
    }
  }, [open, unidadeSelecionada, form]);

  // Bug #3 (21/mai/2026): handler explícito de validação inválida. Antes,
  // se o usuário avançava pra etapa 5 com algum campo de etapa anterior
  // inválido (ex.: e-mail mal formatado em step 1, URL de foto quebrada
  // em step 4), o click em "Cadastrar Paciente" disparava handleSubmit que
  // chamava só onValid — onSubmit nunca rodava e nada acontecia visualmente
  // ("modal trava"). Agora detectamos qual etapa tem o erro e voltamos
  // automaticamente pra lá + toast claro.
  const onSubmitInvalido = (errors: Record<string, unknown>) => {
    const camposComErro = Object.keys(errors);
    if (camposComErro.length === 0) return;
    const etapaComErro = ([1, 2, 3, 4, 5] as StepN[]).find((n) =>
      camposPorStep[n].some((c) => camposComErro.includes(c as string))
    );
    if (etapaComErro && etapaComErro !== step) {
      setStep(etapaComErro);
    }
    const labelEtapa = etapaComErro ? STEPS[etapaComErro - 1].label : "anterior";
    toast({
      title: `Corrija a etapa "${labelEtapa}"`,
      description: `Campos com problema: ${camposComErro.join(", ")}.`,
      variant: "destructive",
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
        {/* 🩺 Banner MODO COCKPIT — só aparece quando entrou pelo atalho
            destacado do sidebar. Indica que clicar numa linha abre o
            painel tático em vez da ficha clássica. */}
        {modoCockpit && (
          <div className="flex items-center gap-3 px-4 py-3 border-l-[3px] border-l-[#5EE6E6] bg-[#5EE6E6]/10" data-testid="banner-modo-cockpit">
            <Stethoscope className="w-5 h-5 text-[#5EE6E6] flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#5EE6E6]">Modo Cockpit Ativo</div>
              <div className="text-[12px] text-slate-200 mt-0.5">Clique num paciente abaixo pra abrir o <strong className="text-[#5EE6E6]">painel tático</strong> direto (RAS, exames, alergias, agenda — visão de guerra).</div>
            </div>
            <Link href="/pacientes" className="text-[10px] uppercase tracking-widest font-bold text-slate-400 hover:text-slate-200 px-2 py-1 border border-slate-700" data-testid="sair-modo-cockpit">
              Sair do modo
            </Link>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 pw-borda-sagrada py-1">
          <div className="flex items-start gap-4">
            <UserPlus className="w-7 h-7 text-[#5B8DEF] mt-1" />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="pw-titulo-manifesto text-2xl">Pacientes</h1>
                <span className="pw-selo-dourado px-2 py-1 text-[10px] tracking-[0.2em]">PADCON · CADASTRO CLÍNICO</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Pessoas sob cuidado integrativo — anamnese, alergias, comorbidades e protocolos.
              </p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#5B8DEF] hover:bg-[#4978d4] text-white rounded-none">
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[680px] max-h-[92vh] overflow-hidden p-0 gap-0 rounded-none border-l-[3px] border-l-[#5B8DEF]">
              {/* HEADER do wizard com STEPPER visual */}
              <DialogHeader className="px-6 pt-5 pb-4 bg-slate-900/60 border-b border-slate-800">
                <DialogTitle className="flex items-center gap-3 text-slate-100">
                  <UserPlus className="w-5 h-5 text-[#5B8DEF]" />
                  <span className="text-base font-bold tracking-tight">Novo Paciente</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-slate-500 ml-auto">
                    Etapa {String(step).padStart(2, "0")} / 05
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
                            <span className={`text-[12px] font-semibold leading-tight mt-0.5 ${ativo ? "text-slate-100" : completo ? "text-slate-400" : "text-[#aaa]"}`}>
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
                <form onSubmit={form.handleSubmit(onSubmit, onSubmitInvalido)} className="flex flex-col max-h-[calc(92vh-180px)]">
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                    {/* ━━━━━━━━ STEP 1: IDENTIDADE ━━━━━━━━ */}
                    {step === 1 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                          <UserIcon className="w-4 h-4 text-[#5B8DEF]" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Quem é a pessoa</span>
                        </div>

                        <FormField control={form.control} name="nome" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Nome Completo *</FormLabel>
                            <FormControl><Input {...field} placeholder="Ex.: Maria Aparecida da Silva" className="rounded-none border-slate-800 focus:border-[#5B8DEF] focus:ring-[#5B8DEF]/20 text-base" autoFocus /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="telefone" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Celular *</FormLabel>
                              <FormControl>
                                <Input value={field.value} onChange={(e) => field.onChange(formatCelular(e.target.value))} placeholder="(11) 99999-9999" className="rounded-none border-slate-800 focus:border-[#5B8DEF] focus:ring-[#5B8DEF]/20 font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="cpf" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">CPF</FormLabel>
                              <FormControl>
                                <Input value={field.value} onChange={(e) => field.onChange(formatCpf(e.target.value))} placeholder="000.000.000-00" className="rounded-none border-slate-800 focus:border-[#5B8DEF] focus:ring-[#5B8DEF]/20 font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1"><AtSign className="w-3 h-3" /> E-mail</FormLabel>
                            <FormControl><Input type="email" {...field} placeholder="paciente@exemplo.com" className="rounded-none border-slate-800 focus:border-[#5B8DEF] focus:ring-[#5B8DEF]/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Bug #4 (21/mai/2026): SELECT de Unidade aparece SEMPRE em
                            "Visão Global" pra forçar escolha explícita. Quando o
                            usuário já tem unidade selecionada no switcher do header,
                            usamos esse valor como default mas ainda mostramos como
                            chip "travado" pra ele saber onde vai cair o cadastro. */}
                        <FormField control={form.control} name="unidadeId" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                              🏥 Unidade Destino *
                              {unidadeSelecionada === null && (
                                <span className="ml-2 text-[10px] text-[#E07A5F] font-normal normal-case tracking-normal italic">
                                  Visão Global ativa — escolha manualmente
                                </span>
                              )}
                            </FormLabel>
                            <Select
                              value={field.value && field.value > 0 ? String(field.value) : ""}
                              onValueChange={(v) => field.onChange(Number(v))}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-none border-slate-800 focus:border-[#5B8DEF] focus:ring-[#5B8DEF]/20" data-testid="select-unidade-destino">
                                  <SelectValue placeholder="Selecione a unidade que vai receber este paciente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {unidadesDisponiveis.map((u) => (
                                  <SelectItem key={u.unidadeId} value={String(u.unidadeId)}>
                                    {u.unidadeNome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="genero" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Gênero</FormLabel>
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
                                  className={`flex flex-col items-center gap-0.5 py-2 px-2 border-l-[3px] transition-all ${field.value === g.v ? "bg-[#5B8DEF]/15 border-l-[#5B8DEF] text-slate-100 font-semibold" : "border-l-transparent border border-slate-800 text-slate-400 hover:bg-slate-900/60"}`}
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
                        <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                          <Stethoscope className="w-4 h-4 text-[#7BC79E]" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Perfil clínico</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="alturaCm" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Altura (cm)</FormLabel>
                              <FormControl><Input type="number" min={30} max={260} placeholder="170" {...field} value={field.value ?? ""} className="rounded-none border-slate-800 focus:border-[#7BC79E] focus:ring-[#7BC79E]/20 font-mono" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="pesoKg" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Peso (kg)</FormLabel>
                              <FormControl><Input type="number" step="0.1" min={0.5} max={500} placeholder="70.5" {...field} value={field.value ?? ""} className="rounded-none border-slate-800 focus:border-[#7BC79E] focus:ring-[#7BC79E]/20 font-mono" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="fototipoFitzpatrick" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Fototipo</FormLabel>
                              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                                <FormControl><SelectTrigger className="rounded-none border-slate-800"><SelectValue placeholder="—" /></SelectTrigger></FormControl>
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
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Atividade Física</FormLabel>
                              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                                <FormControl><SelectTrigger className="rounded-none border-slate-800"><SelectValue placeholder="—" /></SelectTrigger></FormControl>
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
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Gestante / Lactante</FormLabel>
                              <button
                                type="button"
                                onClick={() => field.onChange(!field.value)}
                                className={`w-full flex items-center gap-2 px-3 py-2 border-l-[3px] transition-all ${field.value ? "bg-[#F472B6]/15 border-l-[#F472B6] text-slate-100 font-semibold" : "border-l-transparent border border-slate-800 text-slate-400 hover:bg-slate-900/60"}`}
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
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Condições / Comorbidades</FormLabel>
                            <FormControl><Textarea {...field} rows={2} placeholder="Hipertensão, Diabetes tipo 2, Hipotireoidismo…" className="rounded-none border-slate-800 focus:border-[#7BC79E] focus:ring-[#7BC79E]/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="medicamentosContinuos" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Medicamentos Contínuos</FormLabel>
                            <FormControl><Textarea {...field} rows={2} placeholder="Losartana 50mg 1x/dia, Levotiroxina 50mcg em jejum…" className="rounded-none border-slate-800 focus:border-[#7BC79E] focus:ring-[#7BC79E]/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* ━━━━━━━━ STEP 3: ENDEREÇO ━━━━━━━━ */}
                    {step === 3 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                          <MapPin className="w-4 h-4 text-[#F5B946]" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Onde mora</span>
                          <span className="ml-auto text-[10px] text-slate-500 italic">CEP preenche sozinho ↓</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="cep" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">CEP</FormLabel>
                              <FormControl>
                                <Input value={field.value} onChange={(e) => { const f = formatCep(e.target.value); field.onChange(f); if (f.replace(/\D/g, "").length === 8) buscarCep(f); }} placeholder="00000-000" className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20 font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="col-span-2">
                            <FormField control={form.control} name="endereco" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Logradouro</FormLabel>
                                <FormControl><Input {...field} placeholder="Rua / Avenida / Travessa" className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>

                        {/* Bug #2 (21/mai/2026): NÚMERO em campo próprio. Antes,
                            ViaCEP só devolve logradouro e o número ia concatenado
                            na string da rua — impossível filtrar/imprimir separado. */}
                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="numeroEndereco" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Número</FormLabel>
                              <FormControl><Input {...field} placeholder="123 / S/N" className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20 font-mono" data-testid="input-numero-endereco" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="col-span-2">
                            <FormField control={form.control} name="complemento" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Complemento</FormLabel>
                              <FormControl><Input {...field} placeholder="Apto, Sala, Bloco…" className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          </div>
                        </div>

                        <FormField control={form.control} name="bairro" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Bairro</FormLabel>
                            <FormControl><Input {...field} className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <div className="grid grid-cols-3 gap-3">
                          <FormField control={form.control} name="cidade" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Cidade</FormLabel>
                              <FormControl><Input {...field} className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="estado" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">UF</FormLabel>
                              <FormControl><Input {...field} placeholder="SP" maxLength={2} className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20 font-mono uppercase" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="pais" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">País</FormLabel>
                              <FormControl><Input {...field} className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="mt-4 p-3 bg-[#F5B946]/10 border-l-[3px] border-l-[#F5B946]">
                          <p className="text-[11px] text-slate-100 leading-relaxed">
                            <ChevronRightIcon className="inline w-3.5 h-3.5 text-[#F5B946] mr-1" />
                            Endereço pronto. Próximo: <strong>Mídia & Drive</strong> (foto, pasta Drive, plano).
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ━━━━━━━━ STEP 4: MÍDIA & DOCUMENTOS ━━━━━━━━ */}
                    {step === 4 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                          <Camera className="w-4 h-4 text-[#A78BFA]" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Foto, Drive e plano de acompanhamento</span>
                        </div>

                        {/* Plano de acompanhamento — 4 cards visuais (Diamante/Ouro/Prata/Cobre) */}
                        <FormField control={form.control} name="planoAcompanhamento" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                              <Crown className="w-3 h-3" /> Plano de Acompanhamento
                            </FormLabel>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { v: "diamante", l: "Diamante", e: "💎", cor: "#22C7B8" },
                                { v: "ouro",     l: "Ouro",     e: "🥇", cor: "#F5B946" },
                                { v: "prata",    l: "Prata",    e: "🥈", cor: "#94A3B8" },
                                { v: "cobre",    l: "Cobre",    e: "🥉", cor: "#E07A5F" },
                              ].map((p) => {
                                const ativo = field.value === p.v;
                                return (
                                  <button
                                    key={p.v}
                                    type="button"
                                    onClick={() => field.onChange(p.v)}
                                    className={`flex flex-col items-center gap-1 py-3 px-2 border-l-[3px] transition-all ${ativo ? "text-slate-100 font-bold" : "border-l-transparent border border-slate-800 text-slate-400 hover:bg-slate-900/60"}`}
                                    style={ativo ? { borderLeftColor: p.cor, backgroundColor: `${p.cor}1F`, boxShadow: `inset 0 0 0 1px ${p.cor}55` } : undefined}
                                    data-testid={`plano-${p.v}`}
                                  >
                                    <span className="text-lg leading-none">{p.e}</span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold">{p.l}</span>
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Fotos rosto + corpo — URL por enquanto (upload direto requer endpoint
                            de storage que ainda não existe; CEO confirma ok cadastrar URL agora) */}
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="fotoRosto" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                                <Camera className="w-3 h-3" /> URL Foto do Rosto
                              </FormLabel>
                              <FormControl><Input type="url" {...field} placeholder="https://drive.google.com/…" className="rounded-none border-slate-800 focus:border-[#A78BFA] focus:ring-[#A78BFA]/20 font-mono text-[12px]" /></FormControl>
                              <FormMessage />
                              {field.value && (
                                <div className="mt-1.5 w-20 h-20 border border-slate-800 overflow-hidden bg-slate-900/50">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={field.value} alt="Prévia rosto" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                </div>
                              )}
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="fotoCorpo" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                                <Camera className="w-3 h-3" /> URL Foto Corpo Inteiro
                              </FormLabel>
                              <FormControl><Input type="url" {...field} placeholder="https://drive.google.com/…" className="rounded-none border-slate-800 focus:border-[#A78BFA] focus:ring-[#A78BFA]/20 font-mono text-[12px]" /></FormControl>
                              <FormMessage />
                              {field.value && (
                                <div className="mt-1.5 w-20 h-20 border border-slate-800 overflow-hidden bg-slate-900/50">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={field.value} alt="Prévia corpo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                </div>
                              )}
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="googleDriveFolderId" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                              <Cloud className="w-3 h-3" /> ID da Pasta Google Drive
                            </FormLabel>
                            <FormControl><Input {...field} placeholder="1a2B3c4D5e6F7g8H9i0J… (cole o ID da URL do Drive)" className="rounded-none border-slate-800 focus:border-[#A78BFA] focus:ring-[#A78BFA]/20 font-mono text-[12px]" /></FormControl>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Pasta onde ficam exames, notas fiscais, fotos extras. Cola só o ID (parte depois de <span className="font-mono text-[#A78BFA]">/folders/</span> na URL).
                            </p>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* ━━━━━━━━ STEP 5: PLANO & NF ━━━━━━━━ */}
                    {step === 5 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                          <CreditCard className="w-4 h-4 text-[#22C7B8]" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Dados de cobrança e nota fiscal</span>
                        </div>

                        {/* Aviso explícito: campos cadastrais, integração de cobrança no próximo sprint */}
                        <div className="p-2.5 bg-[#22C7B8]/10 border-l-[3px] border-l-[#22C7B8] flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#22C7B8] mt-0.5 flex-shrink-0" />
                          <p className="text-[10.5px] text-slate-300 leading-relaxed">
                            <strong className="text-slate-100">Só cadastro de dados</strong> neste sprint — sem cobrança automática ainda.
                            Integração com Asaas/MP/Stripe entra no próximo turno (campos serão persistidos quando a migration <span className="font-mono text-[#22C7B8]">078_pacientes_pagamento_e_nf</span> rodar).
                          </p>
                        </div>

                        {/* Pagamento — titular + bandeira + últimos 4 */}
                        <div className="space-y-3 p-3 border border-slate-800 bg-slate-900/40">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-[#22C7B8]" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#22C7B8]">Cartão de Cobrança Recorrente</span>
                          </div>

                          <FormField control={form.control} name="pagamentoTitularNome" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Nome do Titular (como no cartão)</FormLabel>
                              <FormControl><Input {...field} placeholder="MARIA A DA SILVA" className="rounded-none border-slate-800 focus:border-[#22C7B8] focus:ring-[#22C7B8]/20 font-mono uppercase" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <div className="grid grid-cols-2 gap-3">
                            <FormField control={form.control} name="pagamentoCartaoBandeira" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Bandeira</FormLabel>
                                <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                                  <FormControl><SelectTrigger className="rounded-none border-slate-800"><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="visa">Visa</SelectItem>
                                    <SelectItem value="mastercard">Mastercard</SelectItem>
                                    <SelectItem value="elo">Elo</SelectItem>
                                    <SelectItem value="amex">American Express</SelectItem>
                                    <SelectItem value="hipercard">Hipercard</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="pagamentoCartaoUltimos4Digitos" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Últimos 4 dígitos</FormLabel>
                                <FormControl><Input value={field.value} onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" maxLength={4} className="rounded-none border-slate-800 focus:border-[#22C7B8] focus:ring-[#22C7B8]/20 font-mono text-center text-lg tracking-[0.4em]" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        </div>

                        {/* Nota fiscal — opcional, só se o paciente quiser NF em outro CNPJ */}
                        <div className="space-y-3 p-3 border border-slate-800 bg-slate-900/40">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-3.5 h-3.5 text-[#F5B946]" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#F5B946]">Nota Fiscal (opcional)</span>
                            <span className="text-[10px] text-slate-500 italic ml-auto">só se NF em CNPJ diferente do CPF</span>
                          </div>

                          <FormField control={form.control} name="notaFiscalCnpj" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">CNPJ Emissão</FormLabel>
                              <FormControl><Input {...field} placeholder="00.000.000/0000-00" className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20 font-mono" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="notaFiscalRazaoSocial" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Razão Social</FormLabel>
                              <FormControl><Input {...field} placeholder="Empresa LTDA" className="rounded-none border-slate-800 focus:border-[#F5B946] focus:ring-[#F5B946]/20" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="mt-2 p-3 bg-[#7BC79E]/10 border-l-[3px] border-l-[#7BC79E]">
                          <p className="text-[11px] text-slate-100 leading-relaxed">
                            <Check className="inline w-3.5 h-3.5 text-[#7BC79E] mr-1" />
                            Tudo pronto. Confere e clica <strong>Cadastrar Paciente</strong>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FOOTER do wizard com navegação */}
                  <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/50">
                    <Button type="button" variant="ghost" onClick={() => setStep((s) => (s > 1 ? ((s - 1) as StepN) : s))} disabled={step === 1} className="rounded-none text-slate-400 disabled:opacity-30" data-testid="wizard-voltar">
                      ← Voltar
                    </Button>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className="w-2 h-2 rounded-full transition-colors" style={{ backgroundColor: step >= n ? STEPS[n - 1].cor : "#475569" }} />
                      ))}
                    </div>
                    {step < TOTAL_STEPS ? (
                      <Button type="button" onClick={irProximoStep} className="bg-[#5B8DEF] hover:bg-[#4978d4] text-white rounded-none" data-testid="wizard-proximo">
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
                className="bg-slate-900 border-l-[3px] px-4 py-3 flex items-center gap-3"
                style={{ borderLeftColor: c.cor, boxShadow: `inset 0 0 0 1px ${c.cor}22` }}
                data-testid={`stat-${c.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${c.cor}1A`, color: c.cor }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500 leading-none">{c.label}</span>
                  <span className="text-2xl font-bold font-mono text-slate-100 leading-tight mt-1 tabular-nums">{isLoading ? "—" : c.valor.toLocaleString("pt-BR")}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ━━ BUSCA + LISTA densa visual ━━ */}
        <div className="bg-slate-900 border-l-[3px] border-l-[#5B8DEF] text-slate-100">
          {/* Barra de busca grande e óbvia */}
          <div className="border-b border-slate-800 px-4 py-3 flex items-center gap-3 bg-slate-900/40">
            <Search className="h-4 w-4 text-[#5B8DEF] flex-shrink-0" />
            <Input
              placeholder="Buscar paciente por nome, CPF…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 max-w-md border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-slate-500"
              data-testid="input-busca-pacientes"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="text-[10px] uppercase tracking-widest font-bold text-slate-400 hover:text-[#5B8DEF]"
                data-testid="limpar-busca"
              >
                Limpar
              </button>
            )}
            <span className="ml-auto text-[10px] uppercase tracking-widest font-mono text-slate-500">
              {isLoading ? "carregando…" : `${stats.total} resultado${stats.total === 1 ? "" : "s"}`}
            </span>
          </div>

          {/* Header da grade (ordenação) */}
          <div className="hidden md:grid grid-cols-[1fr_140px_160px_100px_44px] gap-3 px-4 py-2 border-b border-slate-800 bg-slate-900/30 text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">
            <ColunaOrdenavel label="Paciente" ativaDesc={colunaAtivaDesc("NOME")} ativaAsc={colunaAtivaAsc("NOME")} posicao={posicaoOrd("NOME")} onClick={(shift) => onClickColuna("NOME", shift)} testId="ord-nome" />
            <ColunaOrdenavel label="CPF" ativaDesc={colunaAtivaDesc("CPF")} ativaAsc={colunaAtivaAsc("CPF")} posicao={posicaoOrd("CPF")} onClick={(shift) => onClickColuna("CPF", shift)} testId="ord-cpf" />
            <ColunaOrdenavel label="Celular" ativaDesc={colunaAtivaDesc("TELEFONE")} ativaAsc={colunaAtivaAsc("TELEFONE")} posicao={posicaoOrd("TELEFONE")} onClick={(shift) => onClickColuna("TELEFONE", shift)} testId="ord-telefone" />
            <ColunaOrdenavel label="Status" ativaDesc={colunaAtivaDesc("STATUS")} ativaAsc={colunaAtivaAsc("STATUS")} posicao={posicaoOrd("STATUS")} onClick={(shift) => onClickColuna("STATUS", shift)} testId="ord-status" />
            <span className="text-right">↳</span>
          </div>

          {/* Linhas dos pacientes */}
          {isLoading ? (
            <div className="divide-y divide-slate-800">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-800 animate-pulse w-1/3" />
                    <div className="h-2.5 bg-slate-800/70 animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : pacientes?.length === 0 ? (
            <div className="text-center py-16 px-4 text-slate-500">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{busca ? `Nenhum paciente bate com "${busca}"` : "Nenhum paciente cadastrado ainda."}</p>
              {!busca && (
                <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 border-l-[3px] border-l-[#5B8DEF] bg-[#5B8DEF]/10 text-[#5B8DEF] text-sm font-bold hover:bg-[#5B8DEF]/15">
                  <UserPlus className="w-4 h-4" /> Cadastrar o Primeiro
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {pacientes?.map((paciente) => {
                const cor = corDoNome(paciente.nome);
                const ini = iniciaisDoNome(paciente.nome);
                return (
                  <Link
                    key={paciente.id}
                    href={modoCockpit ? `/pacientes/${paciente.id}/cockpit` : `/pacientes/${paciente.id}`}
                    className="group grid grid-cols-[1fr_140px_160px_100px_44px] gap-3 items-center px-4 py-2.5 border-l-[3px] border-l-transparent hover:bg-slate-800/40 hover:border-l-[#5B8DEF] transition-all"
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
                        <span className="text-[13px] font-semibold text-slate-100 truncate group-hover:text-[#5B8DEF] transition-colors">
                          {paciente.nome}
                        </span>
                        {paciente.email && (
                          <span className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                            <AtSign className="w-2.5 h-2.5" /> {paciente.email}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Coluna 2: CPF */}
                    <span className="text-[12px] font-mono text-slate-400 tabular-nums truncate">
                      {paciente.cpf || <span className="text-slate-500">—</span>}
                    </span>
                    {/* Coluna 3: Celular com ícone */}
                    <span className="text-[12px] font-mono text-slate-400 tabular-nums truncate flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-[#7BC79E]" /> {paciente.telefone}
                    </span>
                    {/* Coluna 4: status badge */}
                    <span>
                      {paciente.statusAtivo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border-l-[3px] border-l-[#7BC79E] bg-[#7BC79E]/10 text-[#7BC79E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7BC79E] animate-pulse" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border-l-[3px] border-l-[#E07A5F] bg-[#E07A5F]/10 text-[#E07A5F]">
                          Inativo
                        </span>
                      )}
                    </span>
                    {/* Coluna 5: seta */}
                    <ChevronRightIcon className="w-4 h-4 text-slate-500 group-hover:text-[#5B8DEF] group-hover:translate-x-0.5 transition-all justify-self-end" />
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
