import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { LayoutPawards } from "@/components/LayoutPawards";
import { apiFetch } from "@/lib/api-fetch";

const fmt = (v: any) =>
  v == null
    ? "—"
    : `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MODELO_BADGE: Record<string, { label: string; cor: string }> = {
  full:       { label: "FULL",       cor: "#5FE6CC" },
  pacote:     { label: "PACOTE",     cor: "#FFD27A" },
  por_demanda:{ label: "POR DEMANDA",cor: "#A89DFF" },
};

export default function AdminLicenciamentoPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<{
    modulos: any[];
    empresas: any[];
    ativacoes: any[];
  }>({
    queryKey: ["modulos-sistema-matriz"],
    queryFn: () =>
      apiFetch("/api/modulos-sistema/matriz", { credentials: "include" }).then((r) => r.json()),
  });

  const toggle = useMutation({
    mutationFn: ({ unidadeId, moduloId, ativo }: { unidadeId: number; moduloId: number; ativo: boolean }) =>
      apiFetch(`/api/modulos-sistema/${unidadeId}/${moduloId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo }),
      }).then((r) => {
        if (!r.ok) throw new Error("Falha ao salvar");
        return r.json();
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modulos-sistema-matriz"] }),
  });

  if (isLoading) return (
    <LayoutPawards>
      <div className="p-8 text-sm" style={{ color: "#88B8BE" }}>Carregando painel de licenciamento...</div>
    </LayoutPawards>
  );

  if (error || !data) return (
    <LayoutPawards>
      <div className="p-8 text-sm text-red-400">Erro ao carregar dados.</div>
    </LayoutPawards>
  );

  const { modulos, empresas, ativacoes } = data;

  function isAtivo(unidadeId: number, moduloId: number) {
    const row = ativacoes.find((a) => a.unidade_id === unidadeId && a.modulo_id === moduloId);
    return row?.ativo === true;
  }

  function totalAtivos(unidadeId: number) {
    return ativacoes.filter((a) => a.unidade_id === unidadeId && a.ativo === true).length;
  }

  function totalValor(unidadeId: number) {
    return ativacoes
      .filter((a) => a.unidade_id === unidadeId && a.ativo === true)
      .reduce((sum, a) => {
        const mod = modulos.find((m) => m.id === a.modulo_id);
        return sum + Number(mod?.preco_mensal ?? 0);
      }, 0);
  }

  return (
    <LayoutPawards>
      <div style={{ padding: "24px 28px", fontFamily: "'JetBrains Mono', monospace" }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: "#5FE6CC", textTransform: "uppercase", margin: 0 }}>
            LICENCIAMENTO DE MÓDULOS IHE
          </h1>
          <p style={{ fontSize: 11, color: "#88B8BE", margin: "4px 0 0" }}>
            Controle quais módulos cada empresa tem ativados. Ativação salva imediatamente no banco.
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#0A2030" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", color: "#88B8BE", borderBottom: "1px solid #1A3848", whiteSpace: "nowrap", minWidth: 240 }}>
                  MÓDULO
                </th>
                <th style={{ textAlign: "right", padding: "10px 12px", color: "#88B8BE", borderBottom: "1px solid #1A3848", whiteSpace: "nowrap" }}>
                  R$/MÊS
                </th>
                {empresas.map((emp) => {
                  const badge = emp.modelo_cobranca ? MODELO_BADGE[emp.modelo_cobranca] : null;
                  return (
                    <th key={emp.id} style={{ textAlign: "center", padding: "6px 8px", color: "#D8EEEE", borderBottom: "1px solid #1A3848", minWidth: 90 }}>
                      <div style={{ fontSize: 9, color: "#88B8BE", letterSpacing: 1, textTransform: "uppercase" }}>
                        {String(emp.nome ?? "").replace("INSTITUTO ", "")}
                      </div>
                      {badge && (
                        <div style={{ fontSize: 8, color: badge.cor, border: `1px solid ${badge.cor}55`, padding: "1px 4px", marginTop: 2, display: "inline-block" }}>
                          {badge.label}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {modulos.map((mod, idx) => (
                <tr key={mod.id} style={{ background: idx % 2 === 0 ? "#061824" : "#0A2030" }}>
                  <td style={{ padding: "9px 12px", borderBottom: "1px solid #1A3848", color: "#D8EEEE", whiteSpace: "nowrap" }}>
                    <span style={{ color: "#FFD27A", fontWeight: 700 }}>{mod.codigo}</span>
                    {" "}{mod.nome}
                    <div style={{ fontSize: 9, color: "#88B8BE", marginTop: 1 }}>{mod.categoria}</div>
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", borderBottom: "1px solid #1A3848", color: "#5FE6CC", fontWeight: 700 }}>
                    {fmt(mod.preco_mensal)}
                  </td>
                  {empresas.map((emp) => {
                    const ativo = isAtivo(emp.id, mod.id);
                    return (
                      <td key={emp.id} style={{ textAlign: "center", padding: "9px 8px", borderBottom: "1px solid #1A3848" }}>
                        <Switch
                          checked={ativo}
                          disabled={toggle.isPending}
                          onCheckedChange={(v) =>
                            toggle.mutate({ unidadeId: emp.id, moduloId: mod.id, ativo: v })
                          }
                          data-testid={`switch-${mod.codigo}-${emp.id}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#0E2838" }}>
                <td colSpan={2} style={{ padding: "10px 12px", color: "#88B8BE", fontSize: 10, fontWeight: 700, borderTop: "2px solid #1A3848", textTransform: "uppercase", letterSpacing: 1 }}>
                  TOTAL ATIVO
                </td>
                {empresas.map((emp) => (
                  <td key={emp.id} style={{ textAlign: "center", padding: "10px 8px", borderTop: "2px solid #1A3848", color: "#5FE6CC", fontWeight: 700 }}>
                    <div style={{ fontSize: 13 }}>{totalAtivos(emp.id)}</div>
                    <div style={{ fontSize: 9, color: "#88B8BE" }}>{fmt(totalValor(emp.id))}</div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ marginTop: 20, padding: "12px 16px", background: "#0A2030", border: "1px solid #1A3848", fontSize: 10, color: "#88B8BE" }}>
          {modulos.length} módulos · {empresas.length} empresas · {ativacoes.filter((a) => a.ativo).length} ativações ativas no total
        </div>
      </div>
    </LayoutPawards>
  );
}
