/**
 * admin-cadastro-unidades.tsx
 *
 * Tela robusta de preenchimento/edição do cadastro completo de unidades.
 * - Lista todas as unidades ativas com indicador de completude
 * - Formulário inline por unidade com todos os campos de cadastro
 * - Busca de CEP automática via ViaCEP (API pública, sem autenticação)
 * - Salva via PUT /api/unidades/:id (rota já existente no backend)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutPawards } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Unidade {
  id: number;
  nome: string;
  nick: string | null;
  cnpj: string | null;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  emailGeral: string | null;
  tipoUnidade: string | null;
  ativa: boolean;
  status: string;
}

interface FormData {
  nome: string;
  nick: string;
  cnpj: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  emailGeral: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcCompletude(u: Unidade): number {
  const campos = [u.nick, u.cnpj, u.cep, u.endereco, u.bairro, u.cidade, u.estado, u.telefone, u.emailGeral];
  const preenchidos = campos.filter((v) => v && v.trim() !== "").length;
  return Math.round((preenchidos / campos.length) * 100);
}

function corCompletude(pct: number): string {
  if (pct >= 80) return "#7cc4a0";
  if (pct >= 40) return "#FFD27A";
  return "#d08a8a";
}

function mascaraCNPJ(v: string): string {
  const n = v.replace(/\D/g, "").slice(0, 14);
  if (n.length <= 2) return n;
  if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
  if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
  if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

function mascaraCEP(v: string): string {
  const n = v.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 5) return n;
  return `${n.slice(0, 5)}-${n.slice(5)}`;
}

function mascaraTelefone(v: string): string {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return `(${n}`;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

const TIPO_UNIDADE_OPCOES = [
  { value: "CLINICA_PARCEIRA",   label: "Clínica Parceira" },
  { value: "CLINICA_OPERACIONAL",label: "Clínica Operacional" },
  { value: "LABORATORIO_MESTRE", label: "Laboratório Mestre" },
  { value: "CONSULTORIA",        label: "Consultoria" },
];

// ── Componente de formulário por unidade ──────────────────────────────────────
function FormUnidade({ unidade, onClose }: { unidade: Unidade; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormData>({
    nome:       unidade.nome ?? "",
    nick:       unidade.nick ?? "",
    cnpj:       unidade.cnpj ?? "",
    cep:        unidade.cep ?? "",
    endereco:   unidade.endereco ?? "",
    bairro:     unidade.bairro ?? "",
    cidade:     unidade.cidade ?? "",
    estado:     unidade.estado ?? "",
    telefone:   unidade.telefone ?? "",
    emailGeral: unidade.emailGeral ?? "",
  });
  const [buscandoCEP, setBuscandoCEP] = useState(false);
  const [erroCEP, setErroCEP] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  function set(campo: keyof FormData, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function buscarCEP(cepRaw: string) {
    const cepNum = cepRaw.replace(/\D/g, "");
    if (cepNum.length !== 8) return;
    setBuscandoCEP(true);
    setErroCEP(null);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cepNum}/json/`);
      const data = await r.json();
      if (data.erro) {
        setErroCEP("CEP não encontrado.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        endereco: data.logradouro ?? prev.endereco,
        bairro:   data.bairro ?? prev.bairro,
        cidade:   data.localidade ?? prev.cidade,
        estado:   data.uf ?? prev.estado,
      }));
    } catch {
      setErroCEP("Erro ao consultar ViaCEP.");
    } finally {
      setBuscandoCEP(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    setErroSalvar(null);
    setSucesso(false);
    try {
      const resp = await apiFetch(`/api/unidades/${unidade.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome:       form.nome.trim() || undefined,
          nick:       form.nick.trim() || undefined,
          cnpj:       form.cnpj.replace(/\D/g, "") ? form.cnpj.trim() : undefined,
          cep:        form.cep.replace(/\D/g, "") ? form.cep.trim() : undefined,
          endereco:   form.endereco.trim() || undefined,
          bairro:     form.bairro.trim() || undefined,
          cidade:     form.cidade.trim() || undefined,
          estado:     form.estado.trim() || undefined,
          telefone:   form.telefone.trim() || undefined,
          emailGeral: form.emailGeral.trim() || undefined,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setErroSalvar((err as any).error ?? `Erro ${resp.status}`);
        return;
      }
      setSucesso(true);
      qc.invalidateQueries({ queryKey: ["admin-unidades"] });
      setTimeout(() => { setSucesso(false); onClose(); }, 1200);
    } catch (e: any) {
      setErroSalvar(e.message ?? "Falha de rede");
    } finally {
      setSalvando(false);
    }
  }

  const inp: React.CSSProperties = {
    background: "#061824",
    border: "1px solid #1A3848",
    color: "#D8EEEE",
    padding: "6px 10px",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const lbl: React.CSSProperties = {
    fontSize: 9,
    color: "#88B8BE",
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    display: "block",
    marginBottom: 3,
  };

  return (
    <div style={{
      background: "#0A2030",
      border: "1px solid #1A3848",
      borderLeft: "3px solid #5FE6CC",
      padding: "20px 24px",
      marginTop: 4,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#5FE6CC", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>
        Editando: {unidade.nome}
        <span style={{ fontSize: 9, color: "#88B8BE", marginLeft: 12, fontWeight: 400 }}>ID {unidade.id}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 16px" }}>

        {/* Nome */}
        <div style={{ gridColumn: "1 / 3" }}>
          <label style={lbl}>Nome completo</label>
          <input style={inp} value={form.nome} onChange={(e) => set("nome", e.target.value)} />
        </div>

        {/* Nick */}
        <div>
          <label style={lbl}>Nick (apelido operacional)</label>
          <input style={inp} value={form.nick} onChange={(e) => set("nick", e.target.value)} placeholder="Ex: PADUA" />
        </div>

        {/* CNPJ */}
        <div>
          <label style={lbl}>CNPJ</label>
          <input
            style={inp}
            value={form.cnpj}
            onChange={(e) => set("cnpj", mascaraCNPJ(e.target.value))}
            placeholder="00.000.000/0001-00"
          />
        </div>

        {/* Telefone */}
        <div>
          <label style={lbl}>Telefone</label>
          <input
            style={inp}
            value={form.telefone}
            onChange={(e) => set("telefone", mascaraTelefone(e.target.value))}
            placeholder="(11) 99999-9999"
          />
        </div>

        {/* E-mail */}
        <div>
          <label style={lbl}>E-mail geral</label>
          <input style={inp} type="email" value={form.emailGeral} onChange={(e) => set("emailGeral", e.target.value)} placeholder="clinica@email.com.br" />
        </div>

        {/* CEP — dispara ViaCEP */}
        <div>
          <label style={lbl}>CEP {buscandoCEP && <span style={{ color: "#FFD27A" }}>buscando...</span>}</label>
          <input
            style={{ ...inp, borderColor: erroCEP ? "#d08a8a" : "#1A3848" }}
            value={form.cep}
            onChange={(e) => {
              const v = mascaraCEP(e.target.value);
              set("cep", v);
              if (v.replace(/\D/g, "").length === 8) buscarCEP(v);
            }}
            placeholder="00000-000"
          />
          {erroCEP && <div style={{ fontSize: 9, color: "#d08a8a", marginTop: 2 }}>{erroCEP}</div>}
        </div>

        {/* Logradouro */}
        <div style={{ gridColumn: "1 / 3" }}>
          <label style={lbl}>Logradouro (preenchido pelo CEP)</label>
          <input style={inp} value={form.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, Avenida, Travessa..." />
        </div>

        {/* Bairro */}
        <div>
          <label style={lbl}>Bairro</label>
          <input style={inp} value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
        </div>

        {/* Cidade */}
        <div>
          <label style={lbl}>Cidade</label>
          <input style={inp} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
        </div>

        {/* Estado */}
        <div>
          <label style={lbl}>Estado (UF)</label>
          <input style={inp} value={form.estado} onChange={(e) => set("estado", e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
        </div>

      </div>

      {/* Botões */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
        <button
          onClick={salvar}
          disabled={salvando}
          style={{
            background: salvando ? "#0A2030" : "#5FE6CC",
            color: salvando ? "#88B8BE" : "#020A14",
            border: "none",
            padding: "8px 20px",
            fontSize: 11,
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: 1.5,
            cursor: salvando ? "not-allowed" : "pointer",
            textTransform: "uppercase" as const,
          }}
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>

        <button
          onClick={onClose}
          style={{
            background: "transparent",
            color: "#88B8BE",
            border: "1px solid #1A3848",
            padding: "8px 16px",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>

        {sucesso && (
          <span style={{ color: "#7cc4a0", fontSize: 11, letterSpacing: 1 }}>Salvo com sucesso.</span>
        )}
        {erroSalvar && (
          <span style={{ color: "#d08a8a", fontSize: 11 }}>Erro: {erroSalvar}</span>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AdminCadastroUnidadesPage() {
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "incompleto">("todos");

  const { data: unidades = [], isLoading } = useQuery<Unidade[]>({
    queryKey: ["admin-unidades"],
    queryFn: () =>
      apiFetch("/api/unidades", { credentials: "include" })
        .then((r) => r.json())
        .then((rows: any[]) =>
          rows.map((u) => ({
            id: u.id,
            nome: u.nome,
            nick: u.nick,
            cnpj: u.cnpj,
            cep: u.cep,
            endereco: u.endereco,
            bairro: u.bairro,
            cidade: u.cidade,
            estado: u.estado,
            telefone: u.telefone,
            emailGeral: u.emailGeral ?? u.email_geral,
            tipoUnidade: u.tipoUnidade ?? u.tipo_unidade,
            ativa: u.ativa,
            status: u.status,
          }))
        ),
  });

  const ativas = unidades.filter((u) => u.id > 7 && u.id !== 14);
  const exibidas = filtro === "incompleto"
    ? ativas.filter((u) => calcCompletude(u) < 100)
    : ativas;

  const totalFantasma = ativas.filter((u) => calcCompletude(u) === 0).length;
  const totalIncompleto = ativas.filter((u) => calcCompletude(u) > 0 && calcCompletude(u) < 80).length;
  const totalCompleto = ativas.filter((u) => calcCompletude(u) >= 80).length;

  return (
    <LayoutPawards>
      <div style={{ padding: "24px 28px", fontFamily: "'JetBrains Mono', monospace", maxWidth: 1200 }}>

        {/* Cabeçalho */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: "#5FE6CC", textTransform: "uppercase", margin: 0 }}>
            CADASTRO DE UNIDADES / EMPRESAS
          </h1>
          <p style={{ fontSize: 11, color: "#88B8BE", margin: "4px 0 0" }}>
            Preencha os dados cadastrais de cada empresa.
            CEP preenche endereço, bairro, cidade e estado automaticamente via ViaCEP (API pública dos Correios).
          </p>
        </div>

        {/* KPI cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Cadastro OK (≥80%)", valor: totalCompleto,   cor: "#7cc4a0" },
            { label: "Parcial (1–79%)",    valor: totalIncompleto, cor: "#FFD27A" },
            { label: "Vazio (0%)",         valor: totalFantasma,   cor: "#d08a8a" },
          ].map((c) => (
            <div key={c.label} style={{ background: "#0A2030", border: `1px solid ${c.cor}40`, padding: "12px 20px", minWidth: 160 }}>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: c.cor, textTransform: "uppercase" }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: c.cor, marginTop: 2 }}>{c.valor}</div>
            </div>
          ))}
          <div style={{ background: "#0A2030", border: "1px solid #1A3848", padding: "12px 20px", minWidth: 160 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#88B8BE", textTransform: "uppercase" }}>Total empresas</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#D8EEEE", marginTop: 2 }}>{ativas.length}</div>
          </div>
        </div>

        {/* Filtro */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { key: "todos",      label: "Todas" },
            { key: "incompleto", label: "Apenas incompletas" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key as any)}
              style={{
                background: filtro === f.key ? "#5FE6CC" : "transparent",
                color: filtro === f.key ? "#020A14" : "#88B8BE",
                border: `1px solid ${filtro === f.key ? "#5FE6CC" : "#1A3848"}`,
                padding: "5px 14px",
                fontSize: 10,
                fontFamily: "inherit",
                cursor: "pointer",
                fontWeight: filtro === f.key ? 800 : 400,
                textTransform: "uppercase" as const,
                letterSpacing: 1,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div style={{ color: "#88B8BE", fontSize: 12, padding: 24 }}>Carregando empresas...</div>
        ) : (
          <div>
            {exibidas.map((u) => {
              const pct = calcCompletude(u);
              const cor = corCompletude(pct);
              const aberto = editandoId === u.id;
              const ehFantasma = pct === 0;

              return (
                <div key={u.id}>
                  {/* Linha da empresa */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 140px 180px 160px 120px 80px",
                      gap: 8,
                      alignItems: "center",
                      padding: "10px 14px",
                      background: aberto ? "#0E2838" : ehFantasma ? "#0A1820" : "#061824",
                      borderBottom: "1px solid #1A3848",
                      borderLeft: `3px solid ${aberto ? "#5FE6CC" : cor}`,
                      cursor: "pointer",
                    }}
                    onClick={() => setEditandoId(aberto ? null : u.id)}
                  >
                    {/* ID */}
                    <div style={{ fontSize: 10, color: "#557A82", fontWeight: 700 }}>#{u.id}</div>

                    {/* Nome + tipo */}
                    <div>
                      <div style={{ fontSize: 12, color: "#D8EEEE", fontWeight: 700 }}>{u.nome}</div>
                      {u.nick && <div style={{ fontSize: 9, color: "#88B8BE", marginTop: 1 }}>{u.nick}</div>}
                    </div>

                    {/* CNPJ */}
                    <div style={{ fontSize: 10, color: u.cnpj ? "#88B8BE" : "#d08a8a" }}>
                      {u.cnpj ?? <span style={{ opacity: 0.5 }}>sem CNPJ</span>}
                    </div>

                    {/* Endereço resumido */}
                    <div style={{ fontSize: 10, color: u.cidade ? "#88B8BE" : "#d08a8a" }}>
                      {u.cidade && u.estado ? `${u.cidade} — ${u.estado}` : <span style={{ opacity: 0.5 }}>sem endereço</span>}
                    </div>

                    {/* Telefone */}
                    <div style={{ fontSize: 10, color: u.telefone ? "#88B8BE" : "#d08a8a" }}>
                      {u.telefone ?? <span style={{ opacity: 0.5 }}>sem telefone</span>}
                    </div>

                    {/* Completude */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: cor }}>{pct}%</div>
                      <div style={{ width: 60, height: 4, background: "#1A3848" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: cor }} />
                      </div>
                    </div>

                    {/* Botão */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditandoId(aberto ? null : u.id); }}
                      style={{
                        background: aberto ? "#1A3848" : "#5FE6CC22",
                        color: aberto ? "#88B8BE" : "#5FE6CC",
                        border: `1px solid ${aberto ? "#1A3848" : "#5FE6CC44"}`,
                        padding: "5px 12px",
                        fontSize: 9,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        textTransform: "uppercase" as const,
                        letterSpacing: 1,
                        fontWeight: 700,
                      }}
                    >
                      {aberto ? "Fechar" : "Editar"}
                    </button>
                  </div>

                  {/* Formulário inline */}
                  {aberto && (
                    <FormUnidade
                      unidade={u}
                      onClose={() => setEditandoId(null)}
                    />
                  )}
                </div>
              );
            })}

            {exibidas.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#88B8BE", fontSize: 12 }}>
                Nenhuma empresa neste filtro.
              </div>
            )}
          </div>
        )}

        {/* Legenda */}
        <div style={{ marginTop: 20, padding: "12px 16px", background: "#0A2030", border: "1px solid #1A3848", fontSize: 10, color: "#557A82" }}>
          Fluxo: clique em uma empresa → formulário abre inline → preencha os campos →
          CEP preenchido dispara busca automática nos Correios (ViaCEP) →
          cidade/estado/logradouro/bairro preenchidos →
          clique Salvar → banco atualizado imediatamente.
        </div>
      </div>
    </LayoutPawards>
  );
}
