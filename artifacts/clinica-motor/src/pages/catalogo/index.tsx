import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight, Syringe, Droplets, CircleDot, FlaskConical, Stethoscope, Brain, Microscope } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL || "/clinica-motor/";

type TabKey = "injetaveis" | "endovenosos" | "implantes" | "formulas" | "protocolos" | "exames" | "doencas";

const TABS: { key: TabKey; label: string; icon: typeof Syringe }[] = [
  { key: "injetaveis", label: "Injetaveis IM", icon: Syringe },
  { key: "endovenosos", label: "Endovenosos", icon: Droplets },
  { key: "implantes", label: "Implantes", icon: CircleDot },
  { key: "formulas", label: "Formulas", icon: FlaskConical },
  { key: "protocolos", label: "Protocolos", icon: Stethoscope },
  { key: "exames", label: "Exames", icon: Microscope },
  { key: "doencas", label: "Doencas", icon: Brain },
];

function InjetaveisTab() {
  const [search, setSearch] = useState("");
  const [expandedEixo, setExpandedEixo] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-injetaveis"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/injetaveis`);
      return res.json();
    },
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoPadcom?.toLowerCase().includes(search.toLowerCase()) ||
    i.nomeExibicao?.toLowerCase().includes(search.toLowerCase()) ||
    i.eixoIntegrativo?.toLowerCase().includes(search.toLowerCase()) ||
    i.palavraChaveMotor?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, any[]> = {};
  filtered.forEach((i: any) => {
    const eixo = i.eixoIntegrativo || "SEM EIXO";
    if (!grouped[eixo]) grouped[eixo] = [];
    grouped[eixo].push(i);
  });

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por codigo, nome, eixo ou palavra-chave..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{filtered.length} itens</Badge>
      </div>
      <div className="space-y-3">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([eixo, items]) => (
          <div key={eixo} className="border rounded-lg">
            <button
              onClick={() => setExpandedEixo(expandedEixo === eixo ? null : eixo)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedEixo === eixo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-semibold text-sm uppercase tracking-wider">{eixo}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
            </button>
            {expandedEixo === eixo && (
              <div className="border-t">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-left">
                      <th className="px-4 py-2 font-medium text-muted-foreground">Codigo PADCOM</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Nome</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Dosagem</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Via</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Valor</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Palavra-chave Motor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr key={item.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-primary font-medium">{item.codigoPadcom}</td>
                        <td className="px-4 py-2.5 font-medium">{item.nomeExibicao}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{item.dosagem} {item.volume ? `/ ${item.volume}` : ""}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{item.via}</Badge></td>
                        <td className="px-4 py-2.5 text-muted-foreground">{item.valorUnidade}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.palavraChaveMotor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EndovenososTab() {
  const [search, setSearch] = useState("");
  const [expandedSoro, setExpandedSoro] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-endovenosos"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/endovenosos`);
      return res.json();
    },
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoPadcom?.toLowerCase().includes(search.toLowerCase()) ||
    i.nomeSoro?.toLowerCase().includes(search.toLowerCase()) ||
    i.eixoIntegrativo?.toLowerCase().includes(search.toLowerCase())
  );

  const soros: Record<string, { principal: any; componentes: any[] }> = {};
  filtered.forEach((i: any) => {
    if (i.tipoLinha === "SORO") {
      if (!soros[i.codigoPadcom]) soros[i.codigoPadcom] = { principal: i, componentes: [] };
      else soros[i.codigoPadcom].principal = i;
    } else if (i.tipoLinha === "COMPONENTE") {
      if (!soros[i.codigoPadcom]) soros[i.codigoPadcom] = { principal: null, componentes: [] };
      soros[i.codigoPadcom].componentes.push(i);
    }
  });

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar soro por codigo, nome ou eixo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{Object.keys(soros).length} soros</Badge>
      </div>
      <div className="space-y-3">
        {Object.entries(soros).map(([codigo, { principal, componentes }]) => (
          <div key={codigo} className="border rounded-lg">
            <button
              onClick={() => setExpandedSoro(expandedSoro === codigo ? null : codigo)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  {expandedSoro === codigo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-mono text-xs text-primary font-medium">{codigo}</span>
                  <Badge variant="secondary" className="text-xs">{principal?.eixoIntegrativo}</Badge>
                </div>
                <div className="ml-7 font-semibold">{principal?.nomeSoro || componentes[0]?.nomeSoro}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{principal?.valorUnidade}</div>
                <div className="text-xs text-muted-foreground">{principal?.frequenciaPadrao}</div>
              </div>
            </button>
            {expandedSoro === codigo && componentes.length > 0 && (
              <div className="border-t bg-muted/10 px-4 py-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Composicao</div>
                <div className="space-y-1.5">
                  {componentes.map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm pl-4 border-l-2 border-primary/20">
                      <span>{c.nomeExibicao} — <span className="text-muted-foreground">{c.dosagem}</span></span>
                      <span className="text-muted-foreground">{c.valorUnidade}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ImplantesTab() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-implantes"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/implantes`);
      return res.json();
    },
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoPadcom?.toLowerCase().includes(search.toLowerCase()) ||
    i.nomeImplante?.toLowerCase().includes(search.toLowerCase()) ||
    i.substanciaAtiva?.toLowerCase().includes(search.toLowerCase()) ||
    i.indicacao?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar implante por codigo, nome, substancia ou indicacao..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{filtered.length} implantes</Badge>
      </div>
      <div className="space-y-2">
        {filtered.map((item: any) => (
          <div key={item.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-xs text-primary font-medium">{item.codigoPadcom}</span>
                  <Badge variant="secondary" className="text-xs">{item.via}</Badge>
                  <Badge variant="outline" className="text-xs">{item.trocarte}</Badge>
                </div>
                <div className="font-semibold">{item.nomeImplante}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">Substancia:</span> {item.substanciaAtiva} — {item.dosagem} {item.unidade}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Liberacao:</span> {item.liberacaoDiaria} | <span className="font-medium">Dose:</span> {item.doseRecomendada} pellets | <span className="font-medium">Duracao:</span> {item.tempoAcao}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">Indicacao:</span> {item.indicacao}
                </div>
                {item.observacao && <div className="text-xs text-muted-foreground/70 mt-1 italic">{item.observacao}</div>}
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="font-medium text-lg">{item.valorUnidade}</div>
                <div className="text-xs text-muted-foreground">{item.origemValor}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormulasTab() {
  const [search, setSearch] = useState("");
  const [expandedFormula, setExpandedFormula] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-formulas"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/formulas`);
      return res.json();
    },
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoPadcom?.toLowerCase().includes(search.toLowerCase()) ||
    i.conteudo?.toLowerCase().includes(search.toLowerCase()) ||
    i.area?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, { titulo: any; componentes: any[] }> = {};
  filtered.forEach((i: any) => {
    if (!grouped[i.codigoPadcom]) grouped[i.codigoPadcom] = { titulo: null, componentes: [] };
    if (i.tipoLinha === "FORMULA") {
      grouped[i.codigoPadcom].titulo = i;
    } else {
      grouped[i.codigoPadcom].componentes.push(i);
    }
  });

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar formula por codigo, nome ou area..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{Object.keys(grouped).length} formulas</Badge>
      </div>
      <div className="space-y-3">
        {Object.entries(grouped).map(([codigo, { titulo, componentes }]) => {
          const substancias = componentes.filter(c => c.identificador?.startsWith("SUBS"));
          const via = componentes.find(c => c.identificador === "VIA");
          const apre = componentes.find(c => c.identificador === "APRE");
          const poso = componentes.find(c => c.identificador?.startsWith("POSO"));
          const obs = componentes.find(c => c.identificador === "OBS");

          return (
            <div key={codigo} className="border rounded-lg">
              <button
                onClick={() => setExpandedFormula(expandedFormula === codigo ? null : codigo)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    {expandedFormula === codigo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-mono text-xs text-primary font-medium">{codigo}</span>
                    {titulo?.area && <Badge variant="secondary" className="text-xs uppercase">{titulo.area}</Badge>}
                    {titulo?.funcao && <Badge variant="outline" className="text-xs uppercase">{titulo.funcao}</Badge>}
                  </div>
                  <div className="ml-7 font-semibold">{titulo?.conteudo || codigo}</div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="font-medium">{titulo?.valorUnidade}</div>
                </div>
              </button>
              {expandedFormula === codigo && (
                <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
                  {substancias.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Composicao</div>
                      <div className="space-y-1">
                        {substancias.map((s: any, idx: number) => (
                          <div key={idx} className="text-sm pl-4 border-l-2 border-primary/20">{s.conteudo}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {via && <span><span className="font-medium text-muted-foreground">Via:</span> {via.conteudo}</span>}
                    {apre && <span><span className="font-medium text-muted-foreground">Apresentacao:</span> {apre.conteudo}</span>}
                    {poso && <span><span className="font-medium text-muted-foreground">Posologia:</span> {poso.conteudo}</span>}
                  </div>
                  {obs && <div className="text-xs text-muted-foreground/70 italic">{obs.conteudo}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProtocolosTab() {
  const [expandedProto, setExpandedProto] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-protocolos"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/protocolos-master`);
      return res.json();
    },
  });

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <Badge variant="outline" className="text-sm px-3 py-1.5 mb-6">{data.length} protocolos</Badge>
      <div className="space-y-3 mt-4">
        {data.map((p: any) => (
          <div key={p.id} className="border rounded-lg">
            <button
              onClick={() => setExpandedProto(expandedProto === p.codigoProtocolo ? null : p.codigoProtocolo)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  {expandedProto === p.codigoProtocolo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-mono text-xs text-primary font-medium">{p.codigoProtocolo}</span>
                  <Badge variant="secondary" className="text-xs uppercase">{p.area}</Badge>
                  <Badge variant="outline" className="text-xs">{p.modoOferta}</Badge>
                </div>
                <div className="ml-7 font-semibold">{p.nome}</div>
                <div className="ml-7 text-sm text-muted-foreground">{p.objetivo}</div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="font-medium text-lg">{p.valorTotal}</div>
                <div className="text-xs text-muted-foreground">total estimado</div>
              </div>
            </button>
            {expandedProto === p.codigoProtocolo && (
              <div className="border-t bg-muted/10 px-4 py-3 space-y-4">
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div className="border rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Exames</div>
                    <div className="font-medium">{p.valorExames}</div>
                  </div>
                  <div className="border rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Formulas</div>
                    <div className="font-medium">{p.valorFormulas}</div>
                  </div>
                  <div className="border rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Injetaveis</div>
                    <div className="font-medium">{p.valorInjetaveis}</div>
                  </div>
                  <div className="border rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Implantes</div>
                    <div className="font-medium">{p.valorImplantes}</div>
                  </div>
                </div>
                {p.fases?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Fases</div>
                    {p.fases.map((f: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm pl-4 border-l-2 border-primary/20 mb-1">
                        <Badge variant="outline" className="text-xs shrink-0">{f.fase}</Badge>
                        <span>Dia {f.diaInicio} a {f.diaFim}</span>
                        <span className="text-muted-foreground">— {f.marco}</span>
                        <span className="text-xs text-muted-foreground/70">{f.observacao}</span>
                      </div>
                    ))}
                  </div>
                )}
                {p.acoes?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Acoes</div>
                    {p.acoes.map((a: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm pl-4 border-l-2 border-blue-200 mb-1">
                        <Badge variant="secondary" className="text-xs shrink-0">{a.tipoAcao}</Badge>
                        <span className="font-mono text-xs">{a.codigoReferencia}</span>
                        <span className="text-xs text-muted-foreground">{a.observacao}</span>
                        {a.obrigatorio === "SIM" && <Badge variant="destructive" className="text-xs">Obrigatorio</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DoencasTab() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-doencas"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/doencas`);
      return res.json();
    },
  });

  const filtered = data.filter((i: any) =>
    !search || i.codigoDoenca?.toLowerCase().includes(search.toLowerCase()) ||
    i.nomeDoenca?.toLowerCase().includes(search.toLowerCase()) ||
    i.grupo?.toLowerCase().includes(search.toLowerCase()) ||
    i.eixo?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, any[]> = {};
  filtered.forEach((i: any) => {
    const g = i.grupo || "OUTROS";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(i);
  });

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar doenca por codigo, nome, grupo ou eixo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{filtered.length} doencas</Badge>
      </div>
      <div className="space-y-4">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([grupo, items]) => (
          <div key={grupo}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{grupo}</h3>
            <div className="border rounded-lg divide-y">
              {items.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-primary font-medium w-40">{d.codigoDoenca}</span>
                    <span className="font-medium text-sm">{d.nomeDoenca}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{d.eixo}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{d.blocoMotor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamesTab() {
  const [search, setSearch] = useState("");
  const [expandedGrupo, setExpandedGrupo] = useState<string | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["catalogo-exames-base"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/exames-base`);
      return res.json();
    },
  });

  const filtered = data.filter((e: any) =>
    !search || e.codigoExame?.toLowerCase().includes(search.toLowerCase()) ||
    e.nomeExame?.toLowerCase().includes(search.toLowerCase()) ||
    e.grupoPrincipal?.toLowerCase().includes(search.toLowerCase()) ||
    e.blocoOficial?.toLowerCase().includes(search.toLowerCase()) ||
    e.modalidade?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, any[]> = {};
  filtered.forEach((e: any) => {
    const g = e.grupoPrincipal || "OUTROS";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(e);
  });

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar exame por codigo, nome, grupo, bloco ou modalidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">{filtered.length} exames</Badge>
      </div>
      <div className="space-y-3">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([grupo, items]) => (
          <div key={grupo} className="border rounded-lg">
            <button
              onClick={() => setExpandedGrupo(expandedGrupo === grupo ? null : grupo)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedGrupo === grupo ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-semibold text-sm uppercase tracking-wider">{grupo}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
            </button>
            {expandedGrupo === grupo && (
              <div className="border-t">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-left">
                      <th className="px-4 py-2 font-medium text-muted-foreground">Codigo</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Nome</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Modalidade</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Bloco</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Grau</th>
                      <th className="px-4 py-2 font-medium text-muted-foreground">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((ex: any) => (
                      <tr key={ex.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-primary font-medium">{ex.codigoExame}</td>
                        <td className="px-4 py-2.5 font-medium">{ex.nomeExame}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{ex.modalidade}</Badge></td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{ex.blocoOficial}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{ex.grauDoBloco}</td>
                        <td className="px-4 py-2.5"><Badge variant={ex.prioridade === "ALTA" ? "destructive" : "secondary"} className="text-xs">{ex.prioridade}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("injetaveis");

  const { data: resumo } = useQuery({
    queryKey: ["catalogo-resumo"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/resumo`);
      return res.json();
    },
  });

  const { data: examesCount } = useQuery({
    queryKey: ["catalogo-exames-count"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/catalogo/exames-base`);
      const data = await res.json();
      return data.length;
    },
  });

  const tabCounts: Record<TabKey, number> = {
    injetaveis: resumo?.injetaveis ?? 0,
    endovenosos: resumo?.endovenosos ?? 0,
    implantes: resumo?.implantes ?? 0,
    formulas: resumo?.formulas ?? 0,
    protocolos: resumo?.protocolos ?? 0,
    exames: examesCount ?? 0,
    doencas: resumo?.doencas ?? 0,
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Catalogo PADCOM</h1>
        <p className="text-muted-foreground mt-1">Base completa de itens terapeuticos, protocolos e regras do motor clinico</p>
        {resumo?.total && (
          <div className="mt-2 text-sm text-muted-foreground">{resumo.total} registros no total</div>
        )}
      </div>

      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <Badge variant={activeTab === tab.key ? "default" : "secondary"} className="text-xs ml-1">{tabCounts[tab.key]}</Badge>
            </button>
          );
        })}
      </div>

      {activeTab === "injetaveis" && <InjetaveisTab />}
      {activeTab === "endovenosos" && <EndovenososTab />}
      {activeTab === "implantes" && <ImplantesTab />}
      {activeTab === "formulas" && <FormulasTab />}
      {activeTab === "protocolos" && <ProtocolosTab />}
      {activeTab === "exames" && <ExamesTab />}
      {activeTab === "doencas" && <DoencasTab />}
    </Layout>
  );
}
