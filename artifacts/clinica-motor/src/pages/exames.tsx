/**
 * 🧪 EXAMES — Tela mãe dos analitos: Blocos × Terços × Anastomose Semântica
 *
 * Três correntezas:
 *   1) BLOCOS / FASES — onde cada exame mora no calendário do paciente
 *   2) TERÇOS — SUPERIOR (verde), MEDIO (azul), INFERIOR (âmbar)
 *   3) ANASTOMOSE — clica num analito, vê todos os sintomas/blocos/perfis
 *                   de risco que ele dispara (matriz_rastreio)
 *
 * Irmãs: api-server/routes/exames.ts (CRUD + anastomose),
 * pacientes/[id].tsx (consome ficha do analito), pedidos-exame.tsx (operacional).
 * Cunhado por Dr. Caio · base PADCOM v15.x · 294 analitos populados.
 */
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Loader2, Search, X, FlaskConical, Activity, Network } from "lucide-react";

const API = (import.meta as any).env.VITE_API_URL || "/api";

type Faixa = { laboratorio: string; sexo: string; min: number; max: number; unidade: string; idadeMin?: number; idadeMax?: number };
type BlocoMap = { blocoId: string; nomeBloco: string; grau: string; ordem: number };
type Analito = {
  codigo: string;
  nome: string;
  grupo: string;
  unidade: string | null;
  terco_excelente: "SUPERIOR" | "MEDIO" | "INFERIOR";
  observacao_clinica: string | null;
  origem_referencia: string | null;
  ativo: boolean;
  direcao_favoravel: string | null;
  faixas: Faixa[] | null;
  blocos: BlocoMap[] | null;
};

type BlocoGrupo = { bloco_id: string; nome_bloco: string; grau: string; total_exames: number; exames: string[] };

const TERCO_COLOR: Record<string, { bg: string; border: string; text: string; label: string }> = {
  SUPERIOR: { bg: "bg-emerald-500/15", border: "border-emerald-400/40", text: "text-emerald-300", label: "Terço SUPERIOR ↑" },
  MEDIO:    { bg: "bg-sky-500/15",     border: "border-sky-400/40",     text: "text-sky-300",     label: "Terço MÉDIO ◆" },
  INFERIOR: { bg: "bg-amber-500/15",   border: "border-amber-400/40",   text: "text-amber-300",   label: "Terço INFERIOR ↓" },
};

export default function ExamesPage() {
  const [aba, setAba] = useState<"catalogo" | "blocos" | "anastomose">("catalogo");
  const [analitos, setAnalitos] = useState<Analito[]>([]);
  const [blocos, setBlocos] = useState<BlocoGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroQ, setFiltroQ] = useState("");
  const [filtroTerco, setFiltroTerco] = useState<string>("");
  const [filtroGrupo, setFiltroGrupo] = useState<string>("");
  const [selecionado, setSelecionado] = useState<Analito | null>(null);
  const [anastomose, setAnastomose] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/exames/catalogo`).then((r) => r.json()),
      fetch(`${API}/exames/blocos`).then((r) => r.json()),
    ])
      .then(([cat, blk]) => {
        setAnalitos(cat.analitos || []);
        setBlocos(blk.blocos || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const grupos = useMemo(
    () => Array.from(new Set(analitos.map((a) => a.grupo))).sort(),
    [analitos]
  );

  const filtrados = useMemo(() => {
    return analitos.filter((a) => {
      if (filtroTerco && a.terco_excelente !== filtroTerco) return false;
      if (filtroGrupo && a.grupo !== filtroGrupo) return false;
      if (filtroQ && !a.nome.toLowerCase().includes(filtroQ.toLowerCase()) && !a.codigo.toLowerCase().includes(filtroQ.toLowerCase())) return false;
      return true;
    });
  }, [analitos, filtroQ, filtroTerco, filtroGrupo]);

  function abrirAnastomose(a: Analito) {
    setSelecionado(a);
    setAnastomose(null);
    setAba("anastomose");
    fetch(`${API}/exames/anastomose/${a.codigo}`)
      .then((r) => r.json())
      .then(setAnastomose);
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-[#0c1f29] via-[#11353f] to-[#1F4E5F] p-6 text-white">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 flex items-center gap-4">
            <FlaskConical className="w-10 h-10 text-amber-300" />
            <div>
              <h1 className="text-3xl font-serif text-amber-100">Exames · Catálogo Vivo</h1>
              <p className="text-sm text-emerald-200/80">
                {analitos.length} analitos · {blocos.length} agrupamentos bloco/grau · anastomose semântica via matriz de rastreio
              </p>
            </div>
          </header>

          <div className="flex gap-2 mb-5 border-b border-white/10">
            {[
              { k: "catalogo", l: "Analitos / Terços", icon: Activity },
              { k: "blocos", l: "Blocos / Fases", icon: FlaskConical },
              { k: "anastomose", l: selecionado ? `🔗 ${selecionado.nome}` : "Anastomose", icon: Network },
            ].map((t: any) => (
              <button
                key={t.k}
                onClick={() => setAba(t.k)}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition border-b-2 ${
                  aba === t.k
                    ? "border-amber-300 text-amber-200"
                    : "border-transparent text-white/60 hover:text-white"
                }`}
                data-testid={`tab-${t.k}`}
              >
                <t.icon className="w-4 h-4" /> {t.l}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-amber-200">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> carregando rio dos analitos...
            </div>
          ) : aba === "catalogo" ? (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="buscar analito ou código..."
                    value={filtroQ}
                    onChange={(e) => setFiltroQ(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm focus:border-amber-300/60 focus:outline-none"
                    data-testid="input-busca-analito"
                  />
                </div>
                <select
                  value={filtroTerco}
                  onChange={(e) => setFiltroTerco(e.target.value)}
                  className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm"
                  data-testid="select-terco"
                >
                  <option value="">Terço (todos)</option>
                  <option value="SUPERIOR">Superior ↑</option>
                  <option value="MEDIO">Médio ◆</option>
                  <option value="INFERIOR">Inferior ↓</option>
                </select>
                <select
                  value={filtroGrupo}
                  onChange={(e) => setFiltroGrupo(e.target.value)}
                  className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm"
                  data-testid="select-grupo"
                >
                  <option value="">Grupo (todos)</option>
                  {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <div className="px-3 py-2 text-xs text-white/50">{filtrados.length} de {analitos.length}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtrados.map((a) => {
                  const c = TERCO_COLOR[a.terco_excelente] || TERCO_COLOR.SUPERIOR;
                  return (
                    <button
                      key={a.codigo}
                      onClick={() => abrirAnastomose(a)}
                      className={`text-left rounded-lg border ${c.border} ${c.bg} p-4 hover:scale-[1.02] transition`}
                      data-testid={`card-analito-${a.codigo}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-white">{a.nome}</div>
                          <div className="text-[10px] text-white/40 font-mono mt-0.5">{a.codigo}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.border} ${c.text}`}>{a.grupo}</span>
                      </div>
                      <div className={`text-xs mt-2 ${c.text}`}>{c.label}</div>
                      {a.faixas && a.faixas.length > 0 && (
                        <div className="text-[11px] text-white/60 mt-2">
                          Ref: {a.faixas[0].min} – {a.faixas[0].max} {a.faixas[0].unidade}
                        </div>
                      )}
                      {a.blocos && a.blocos.length > 0 && (
                        <div className="text-[11px] text-amber-200/70 mt-1">
                          {a.blocos.length} bloco{a.blocos.length > 1 ? "s" : ""}: {a.blocos.slice(0, 2).map((b) => b.nomeBloco).join(", ")}
                          {a.blocos.length > 2 ? "…" : ""}
                        </div>
                      )}
                      {a.observacao_clinica && (
                        <div className="text-[11px] text-white/50 mt-2 italic line-clamp-2">{a.observacao_clinica}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : aba === "blocos" ? (
            <div className="space-y-3">
              {blocos.map((b) => (
                <details key={`${b.bloco_id}-${b.grau}`} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <summary className="cursor-pointer flex items-center gap-3">
                    <span className="font-mono text-xs text-amber-300 px-2 py-0.5 bg-amber-500/10 rounded">{b.bloco_id}</span>
                    <span className="font-semibold">{b.nome_bloco}</span>
                    <span className="text-xs text-white/50">{b.grau}</span>
                    <span className="ml-auto text-xs text-emerald-300">{b.total_exames} exames</span>
                  </summary>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 text-xs text-white/70">
                    {b.exames.map((e) => <div key={e} className="truncate">• {e}</div>)}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <AnastomoseView selecionado={selecionado} dados={anastomose} onClose={() => { setSelecionado(null); setAba("catalogo"); }} />
          )}
        </div>
      </div>
    </Layout>
  );
}

function AnastomoseView({ selecionado, dados, onClose }: { selecionado: Analito | null; dados: any; onClose: () => void }) {
  if (!selecionado) {
    return (
      <div className="text-center py-16 text-white/50">
        <Network className="w-12 h-12 mx-auto mb-3 text-amber-300/40" />
        Clique em qualquer analito do catálogo para ver sua anastomose semântica
        <br/>(blocos · sintomas gatilho · perfil de risco · CIDs).
      </div>
    );
  }
  if (!dados) {
    return <div className="flex items-center justify-center py-16 text-amber-200"><Loader2 className="w-6 h-6 animate-spin mr-2" /> tecendo a anastomose...</div>;
  }
  const c = TERCO_COLOR[selecionado.terco_excelente] || TERCO_COLOR.SUPERIOR;
  const matriz = dados.matrizRastreio || [];
  const base = dados.exameBase;

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border ${c.border} ${c.bg} p-5`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-serif text-2xl text-white">{selecionado.nome}</div>
            <div className="text-xs font-mono text-white/40 mt-1">{selecionado.codigo} · {selecionado.grupo}</div>
            <div className={`text-sm mt-2 ${c.text}`}>{c.label}</div>
            {selecionado.observacao_clinica && (
              <p className="text-sm text-white/70 mt-3 max-w-3xl italic">{selecionado.observacao_clinica}</p>
            )}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white" data-testid="button-fechar-anastomose"><X /></button>
        </div>
      </div>

      {base && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-amber-300 text-sm font-semibold mb-3">Justificativa Clínica</div>
          {base.justificativa_objetiva && <p className="text-sm text-white/80 mb-2"><strong>Objetiva:</strong> {base.justificativa_objetiva}</p>}
          {base.justificativa_narrativa && <p className="text-sm text-white/70 italic">{base.justificativa_narrativa}</p>}
          <div className="grid grid-cols-3 gap-3 mt-3">
            {base.hd_1 && <div className="text-xs"><span className="text-white/40">HD1:</span> {base.hd_1} <span className="text-amber-300">{base.cid_1}</span></div>}
            {base.hd_2 && <div className="text-xs"><span className="text-white/40">HD2:</span> {base.hd_2} <span className="text-amber-300">{base.cid_2}</span></div>}
            {base.hd_3 && <div className="text-xs"><span className="text-white/40">HD3:</span> {base.hd_3} <span className="text-amber-300">{base.cid_3}</span></div>}
          </div>
        </div>
      )}

      {selecionado.blocos && selecionado.blocos.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-amber-300 text-sm font-semibold mb-3">Mora em {selecionado.blocos.length} bloco{selecionado.blocos.length > 1 ? "s" : ""} / fase{selecionado.blocos.length > 1 ? "s" : ""}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selecionado.blocos.map((b, i) => (
              <div key={i} className="text-sm bg-emerald-500/10 border border-emerald-400/20 rounded p-2">
                <div className="font-semibold text-emerald-200">{b.nomeBloco}</div>
                <div className="text-xs text-white/50">{b.blocoId} · {b.grau} · ordem {b.ordem}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {matriz.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-amber-300 text-sm font-semibold mb-3">Anastomose · Matriz de Rastreio ({matriz.length})</div>
          <div className="space-y-2">
            {matriz.map((m: any, i: number) => (
              <div key={i} className="text-sm border-l-2 border-amber-400/40 pl-3 py-1">
                <div><span className="text-white/40 text-xs">Bloco:</span> {m.bloco_oficial} <span className="text-white/40">·</span> <span className="text-emerald-300">{m.grau_do_bloco}</span></div>
                {m.gatilho_por_sintoma === "SIM" && <div className="text-xs text-amber-200">⚠ Gatilho por sintoma · prioridade {m.prioridade}</div>}
                {m.tipo_indicacao && <div className="text-xs text-white/60">{m.tipo_indicacao}</div>}
                {m.frequencia_protocolo_padua && <div className="text-xs text-sky-300">Frequência Pádua: {m.frequencia_protocolo_padua}</div>}
                {m.perfil_de_risco && <div className="text-xs text-rose-300">Perfil de risco: {m.perfil_de_risco}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {selecionado.faixas && selecionado.faixas.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-amber-300 text-sm font-semibold mb-3">Faixas de Referência por Laboratório</div>
          <table className="w-full text-sm">
            <thead className="text-white/40 text-xs">
              <tr><th className="text-left py-1">Lab</th><th>Sexo</th><th>Min</th><th>Max</th><th>Un.</th></tr>
            </thead>
            <tbody>
              {selecionado.faixas.map((f, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="py-1">{f.laboratorio}</td>
                  <td className="text-center">{f.sexo}</td>
                  <td className="text-center text-amber-200">{f.min}</td>
                  <td className="text-center text-emerald-300">{f.max}</td>
                  <td className="text-center text-white/60">{f.unidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
