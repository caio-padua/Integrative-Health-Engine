// AnalitoEditorModal — edita um analito do catálogo (analitos_catalogo + faixa
// padrão integrativa). Campos: nome, grupo, unidade_padrao_integrativa,
// terco_excelente (SUPERIOR/MEDIO/INFERIOR), faixa de referência padrão
// (min/max), observação clínica.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

const API = (import.meta as any).env.VITE_API_URL || "/api";

export interface AnalitoEditavel {
  codigo: string;
  nome: string;
  grupo: string;
  unidade: string | null;
  terco_excelente: "SUPERIOR" | "MEDIO" | "INFERIOR";
  observacao_clinica: string | null;
  faixas?: Array<{ laboratorio: string; min: number; max: number; unidade: string }> | null;
}

interface Props {
  analito: AnalitoEditavel | null;
  aberto: boolean;
  onClose: () => void;
  onSalvo: () => void;
}

const TERCO_OPCOES: Array<{ v: "SUPERIOR" | "MEDIO" | "INFERIOR"; label: string; descricao: string; cor: string }> = [
  { v: "SUPERIOR", label: "Terço Superior ↑", descricao: "Quanto MAIOR, melhor (ex.: HDL, vitamina D)", cor: "#34C759" },
  { v: "MEDIO",    label: "Terço Médio ◆",    descricao: "Faixa central do range é o ideal",            cor: "#FF9F0A" },
  { v: "INFERIOR", label: "Terço Inferior ↓", descricao: "Quanto MENOR, melhor (ex.: LDL, glicemia)",  cor: "#0A84FF" },
];

export default function AnalitoEditorModal({ analito, aberto, onClose, onSalvo }: Props) {
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState("");
  const [unidade, setUnidade] = useState("");
  const [terco, setTerco] = useState<"SUPERIOR" | "MEDIO" | "INFERIOR">("MEDIO");
  const [min, setMin] = useState<string>("");
  const [max, setMax] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!analito) return;
    setNome(analito.nome || "");
    setGrupo(analito.grupo || "");
    setUnidade(analito.unidade || "");
    setTerco(analito.terco_excelente || "MEDIO");
    const padrao = analito.faixas?.find(f => f.laboratorio?.toUpperCase().includes("PADRAO")) || analito.faixas?.[0];
    setMin(padrao?.min != null ? String(padrao.min) : "");
    setMax(padrao?.max != null ? String(padrao.max) : "");
    setObservacao(analito.observacao_clinica || "");
    setErro(null);
  }, [analito]);

  if (!analito) return null;

  async function salvar() {
    if (!analito) return;
    setSalvando(true);
    setErro(null);
    try {
      const body: any = {
        nome: nome.trim() || undefined,
        grupo: grupo.trim() || undefined,
        unidade_padrao_integrativa: unidade.trim() || undefined,
        terco_excelente: terco,
        observacao_clinica: observacao.trim() || null,
      };
      const minN = min.trim() === "" ? null : Number(min);
      const maxN = max.trim() === "" ? null : Number(max);
      if (minN != null && Number.isFinite(minN) && maxN != null && Number.isFinite(maxN)) {
        body.faixa_padrao = { min: minN, max: maxN, unidade: unidade.trim() || null };
      }
      const r = await apiFetch(`${API}/exames/catalogo/${encodeURIComponent(analito.codigo)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.detalhe || j.erro || `HTTP ${r.status}`);
      }
      onSalvo();
      onClose();
    } catch (e: any) {
      setErro(String(e.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" style={{ background: "#0B1018", borderColor: "#A97822", borderRadius: 0 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-200">
            EDITAR ANALITO ·{" "}
            <span className="font-mono text-xs text-white/40" data-testid="text-codigo-analito">
              {analito.codigo}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="col-span-2">
            <Label className="text-[10px] uppercase tracking-wider text-amber-300/80">Nome do analito</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={{ background: "#020406", borderColor: "#A97822", borderRadius: 0 }}
              data-testid="input-nome-analito"
            />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-amber-300/80">Grupo / Categoria</Label>
            <Input
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              placeholder="Ex.: Hematologia, Hormônios, Lipidograma"
              style={{ background: "#020406", borderColor: "#A97822", borderRadius: 0 }}
              data-testid="input-grupo-analito"
            />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-amber-300/80">Unidade Padrão Integrativa</Label>
            <Input
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              placeholder="mg/dL, ng/mL, UI/L, %..."
              style={{ background: "#020406", borderColor: "#A97822", borderRadius: 0 }}
              data-testid="input-unidade-analito"
            />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-amber-300/80">Valor Mínimo (referência)</Label>
            <Input
              type="number"
              step="any"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="ex.: 40"
              style={{ background: "#020406", borderColor: "#A97822", borderRadius: 0 }}
              data-testid="input-min-analito"
            />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-amber-300/80">Valor Máximo (referência)</Label>
            <Input
              type="number"
              step="any"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="ex.: 100"
              style={{ background: "#020406", borderColor: "#A97822", borderRadius: 0 }}
              data-testid="input-max-analito"
            />
          </div>

          <div className="col-span-2">
            <Label className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2 block">
              Terço Excelente (onde o paciente fica melhor dentro do range)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {TERCO_OPCOES.map((opt) => {
                const ativo = terco === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setTerco(opt.v)}
                    className="text-left px-3 py-2 border transition-all"
                    style={{
                      background: ativo ? opt.cor + "22" : "#020406",
                      borderColor: ativo ? opt.cor : "#A9782233",
                      color: ativo ? opt.cor : "#AAB4C3",
                      borderRadius: 0,
                    }}
                    data-testid={`btn-terco-${opt.v}`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {opt.label}
                    </div>
                    <div className="text-[10px] mt-0.5 opacity-80">{opt.descricao}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-span-2">
            <Label className="text-[10px] uppercase tracking-wider text-amber-300/80">Observação Clínica (script)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Texto explicativo que aparece no card e no modal de foco..."
              style={{ background: "#020406", borderColor: "#A97822", borderRadius: 0 }}
              data-testid="input-observacao-analito"
            />
          </div>
        </div>

        {erro && (
          <div className="mt-3 px-3 py-2 text-xs border" style={{ borderColor: "#FF3B30", background: "#FF3B3022", color: "#FF6D57", borderRadius: 0 }}>
            Erro ao salvar: {erro}
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={salvando}
            style={{ borderRadius: 0 }}
            data-testid="btn-cancelar-edicao"
          >
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={salvando}
            style={{ background: "#C89B3C", color: "#020406", borderRadius: 0, fontFamily: "JetBrains Mono, monospace" }}
            data-testid="btn-salvar-edicao"
          >
            {salvando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            SALVAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
