import { Fragment, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit3, ShieldCheck, History, AlertCircle } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

type Analito = {
  codigo: string; nome: string; grupo: string;
  unidade_padrao_integrativa: string;
  terco_excelente: "SUPERIOR" | "INFERIOR" | "MEDIO";
  observacao_clinica: string | null;
  origem_referencia: string | null;
  ativo: boolean;
};

const COR_TERCO: Record<string, string> = {
  SUPERIOR: "#16a34a",
  MEDIO:    "#facc15",
  INFERIOR: "#2563eb",
};

const ROTULO_TERCO: Record<string, string> = {
  SUPERIOR: "Terço SUPERIOR é excelente",
  MEDIO:    "Terço MÉDIO é excelente (janela estreita)",
  INFERIOR: "Terço INFERIOR é excelente (analito INVERTIDO)",
};

function badgeTerco(t: string) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: COR_TERCO[t] ?? "#6b7280" }}>
      {t}
    </span>
  );
}

export default function LaboratorioValidacao() {
  const [analitos, setAnalitos] = useState<Analito[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Analito | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Form fields
  const [tercoEx, setTercoEx] = useState<"SUPERIOR" | "INFERIOR" | "MEDIO">("SUPERIOR");
  const [obs, setObs] = useState("");
  const [origem, setOrigem] = useState("");
  const [validador, setValidador] = useState("");

  function carregar() {
    fetch(`${BASE_URL}api/laboratorio/analitos`)
      .then(r => r.json())
      .then(j => setAnalitos(j.analitos || []))
      .catch(e => setErro(String(e)));
  }
  useEffect(carregar, []);

  function abrirEdicao(a: Analito) {
    setEditando(a);
    setTercoEx(a.terco_excelente);
    setObs(a.observacao_clinica ?? "");
    setOrigem(a.origem_referencia ?? "");
    setValidador("");
    fetch(`${BASE_URL}api/laboratorio/analitos/${a.codigo}/historico-validacoes`)
      .then(r => r.json()).then(j => setHistorico(j.validacoes || []))
      .catch(() => setHistorico([]));
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    try {
      const resp = await fetch(`${BASE_URL}api/laboratorio/analitos/${editando.codigo}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terco_excelente: tercoEx,
          observacao_clinica: obs,
          origem_referencia: origem,
          validado_por: validador || "validador-anonimo",
        }),
      });
      const j = await resp.json();
      if (!resp.ok) { setErro(j.error || "falha ao salvar"); return; }
      setEditando(null);
      carregar();
    } finally { setSalvando(false); }
  }

  const filtrados = analitos.filter(a =>
    !busca ||
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    a.codigo.toLowerCase().includes(busca.toLowerCase()) ||
    a.grupo.toLowerCase().includes(busca.toLowerCase())
  );

  const grupos = Array.from(new Set(filtrados.map(a => a.grupo))).sort();

  return (
    <Layout>
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#1F4E5F" }}>
              Validação semântica de analitos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Para cada analito, defina qual <strong>terço da faixa de referência é o excelente</strong> na medicina integrativa.
              A maioria favorece o terço superior; alguns (SHBG, TSH, insulina, PCR, glicose, homocisteína) são <strong>invertidos</strong>; potássio e ferritina favorecem o terço médio.
            </p>
          </div>
          <ShieldCheck className="h-8 w-8" style={{ color: "#1F4E5F" }} />
        </div>

        {erro && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" />{erro}</div>}

        <Card>
          <CardHeader className="pb-3">
            <Input placeholder="Buscar por nome, código ou grupo..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-md" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Analito</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Terço excelente</TableHead>
                  <TableHead>Origem da regra</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grupos.map(g => (
                  <Fragment key={g}>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={6} className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-1">{g}</TableCell>
                    </TableRow>
                    {filtrados.filter(a => a.grupo === g).map(a => (
                      <TableRow key={a.codigo}>
                        <TableCell>
                          <div className="font-medium">{a.nome}</div>
                          <div className="text-xs text-muted-foreground font-mono">{a.codigo}</div>
                        </TableCell>
                        <TableCell className="text-sm">{a.grupo}</TableCell>
                        <TableCell className="text-sm">{a.unidade_padrao_integrativa}</TableCell>
                        <TableCell>
                          {badgeTerco(a.terco_excelente)}
                          <div className="text-xs text-muted-foreground mt-1">{ROTULO_TERCO[a.terco_excelente]}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.origem_referencia || <span className="text-muted-foreground italic">sem origem</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => abrirEdicao(a)}>
                            <Edit3 className="h-3 w-3 mr-1" /> Validar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground text-center pt-4 tracking-wider">
          Developed and Supervised by PADCON
        </div>
      </div>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: "#1F4E5F" }}>
              Validar regra integrativa: {editando?.nome}
            </DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Qual terço da faixa é o excelente?</label>
                <Select value={tercoEx} onValueChange={(v) => setTercoEx(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPERIOR">SUPERIOR — terço de cima (padrão para hormônios, vitaminas, minerais)</SelectItem>
                    <SelectItem value="INFERIOR">INFERIOR — terço de baixo (INVERTIDO: SHBG, TSH, insulina, PCR, glicose)</SelectItem>
                    <SelectItem value="MEDIO">MÉDIO — terço do meio (janela estreita: potássio, ferritina)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Observação clínica (aparece no gráfico do paciente)</label>
                <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                  placeholder="Ex: SHBG alto sequestra testosterona livre. Terço inferior = excelente." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Origem da regra</label>
                  <Input value={origem} onChange={e => setOrigem(e.target.value)} placeholder="ex: PERSSINOTTO, INSTITUTO_PADUA" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Quem está validando</label>
                  <Input value={validador} onChange={e => setValidador(e.target.value)} placeholder="ex: Dr. Caio" />
                </div>
              </div>

              {historico.length > 0 && (
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs font-bold flex items-center gap-1 mb-2"><History className="h-3 w-3" /> Validações anteriores</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {historico.map((h: any) => (
                      <div key={h.id} className="text-xs flex justify-between gap-2 border-b border-dashed pb-1">
                        <span><strong>{h.validado_por || "anon"}</strong> → {h.terco_excelente_novo || "(sem mudança)"}</span>
                        <span className="text-muted-foreground">{new Date(h.criado_em).toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
                <Button onClick={salvar} disabled={salvando} style={{ background: "#1F4E5F" }}>
                  {salvando ? "Salvando..." : "Salvar validação"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
