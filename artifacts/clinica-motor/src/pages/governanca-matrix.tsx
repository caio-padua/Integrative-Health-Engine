import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Shield, Beaker, Syringe, FlaskConical, CircleDot, Microscope, Lock, Check } from "lucide-react";

type Linha = {
  unidade_id: number;
  unidade_nome: string;
  categoria: string;
  ativo: boolean;
  atualizado_em: string;
  atualizado_por: string | null;
};

const CATEGORIAS = [
  { key: "endovenosos", label: "Endovenosos", icon: Beaker, count: 63 },
  { key: "injetaveis_im", label: "Injetáveis IM", icon: Syringe, count: 305 },
  { key: "formulas", label: "Fórmulas", icon: FlaskConical, count: 54 },
  { key: "implantes", label: "Implantes", icon: CircleDot, count: 32 },
  { key: "exames", label: "Exames", icon: Microscope, count: 294 },
];

const DESTAQUE: Record<number, { borda: string; bg: string; tag: string; tagCor: string }> = {
  15: { borda: "border-[#FFD700]/70", bg: "bg-gradient-to-r from-[#1F4E5F]/30 to-transparent", tag: "PADUA ⭐ ATIVA", tagCor: "bg-[#FFD700]/20 text-[#FFD700]" },
  14: { borda: "border-purple-400/60", bg: "bg-gradient-to-r from-purple-950/30 to-transparent", tag: "GENESIS 🧬 COFRE-MAE", tagCor: "bg-purple-400/20 text-purple-200" },
  9:  { borda: "border-red-700/60", bg: "bg-red-950/20", tag: "PARCEIRO BLOQUEADO", tagCor: "bg-red-700/20 text-red-300" },
  19: { borda: "border-red-700/60", bg: "bg-red-950/20", tag: "PARCEIRO BLOQUEADO", tagCor: "bg-red-700/20 text-red-300" },
};

export default function GovernancaMatrix() {
  const [dados, setDados] = useState<Linha[]>([]);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = async () => {
    const r = await fetch("/api/matrix-governanca-categoria");
    setDados(await r.json());
  };

  useEffect(() => { carregar(); }, []);

  const toggle = async (unidadeId: number, categoria: string, atual: boolean) => {
    const key = `${unidadeId}-${categoria}`;
    setSalvando(key);
    await fetch(`/api/matrix-governanca-categoria/${unidadeId}/${categoria}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !atual, usuario: "caio" }),
    });
    await carregar();
    setSalvando(null);
  };

  const unidades = Array.from(new Set(dados.map(d => d.unidade_id))).sort((a, b) => a - b);
  const getAtivo = (uid: number, cat: string) => dados.find(d => d.unidade_id === uid && d.categoria === cat)?.ativo ?? false;
  const getNome = (uid: number) => dados.find(d => d.unidade_id === uid)?.unidade_nome ?? `#${uid}`;

  const totalAtivos = dados.filter(d => d.ativo).length;
  const totalCelulas = dados.length;

  return (
    <Layout>
      <div className="space-y-6 p-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#FFD700]" />
            MATRIX PADCON · Governança Fase 1
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Cofre central — liga/desliga categorias inteiras por clínica.
            <span className="text-[#FFD700] font-semibold ml-2">{totalAtivos}/{totalCelulas} células ativas</span>
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border/60 bg-muted/30">
                <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground font-bold">Clínica</th>
                {CATEGORIAS.map(c => (
                  <th key={c.key} className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <c.icon className="w-5 h-5 text-[#1F4E5F] dark:text-cyan-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">{c.label}</span>
                      <span className="text-[10px] text-muted-foreground">{c.count} itens</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unidades.map(uid => {
                const d = DESTAQUE[uid];
                return (
                  <tr key={uid} className={`border-b border-border/30 ${d?.bg ?? ""} ${d?.borda ? `border-l-4 ${d.borda}` : ""}`}>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-foreground text-sm">{getNome(uid)}</span>
                        <span className="text-[10px] text-muted-foreground">#{uid}</span>
                        {d && (
                          <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded inline-block w-fit mt-1 ${d.tagCor}`}>
                            {d.tag}
                          </span>
                        )}
                      </div>
                    </td>
                    {CATEGORIAS.map(c => {
                      const ativo = getAtivo(uid, c.key);
                      const key = `${uid}-${c.key}`;
                      const loading = salvando === key;
                      return (
                        <td key={c.key} className="p-4 text-center">
                          <button
                            onClick={() => toggle(uid, c.key, ativo)}
                            disabled={loading}
                            className={`relative w-14 h-7 rounded-full transition-all ${
                              ativo ? "bg-emerald-500" : "bg-red-900/60"
                            } ${loading ? "opacity-50" : "hover:scale-105"}`}
                          >
                            <span
                              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center transition-all ${
                                ativo ? "left-7" : "left-0.5"
                              }`}
                            >
                              {ativo ? <Check className="w-4 h-4 text-emerald-600" /> : <Lock className="w-3 h-3 text-red-700" />}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-700/40">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Check className="w-4 h-4" /> VERDE = LIBERADO
            </div>
            <p className="text-muted-foreground mt-1">A clínica enxerga e pode prescrever todos os itens dessa categoria.</p>
          </div>
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-700/40">
            <div className="flex items-center gap-2 font-bold text-red-400">
              <Lock className="w-4 h-4" /> VERMELHO = BLOQUEADO
            </div>
            <p className="text-muted-foreground mt-1">A clínica não vê a categoria — médicos nem podem selecionar esses itens.</p>
          </div>
          <div className="p-4 rounded-lg bg-[#1F4E5F]/30 border border-[#FFD700]/40">
            <div className="flex items-center gap-2 font-bold text-[#FFD700]">
              <Shield className="w-4 h-4" /> PRÓXIMAS FASES
            </div>
            <p className="text-muted-foreground mt-1">Fase 2 = subcategoria · Fase 3 = item-a-item · Fase 4 = profundidade.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
