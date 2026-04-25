// PAWARDS MEDCORE · Wave 9 PARQ · Página pública de transparência
// Rota /sobre-parcerias-tecnicas (sem auth — paciente acessa via link no rodapé da receita)
// Atende ao requisito (d) do STJ REsp 2.159.442/PR (transparência ao paciente).
import { useState } from "react";
import { ShieldCheck, Search, ExternalLink, BookOpen } from "lucide-react";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const GOLD_BG = "#FAF6EC";

export default function SobreParceriasTecnicas() {
  const [hash, setHash] = useState("");
  const [verifResult, setVerifResult] = useState<any>(null);
  const [verifLoading, setVerifLoading] = useState(false);

  async function verificar() {
    setVerifLoading(true);
    setVerifResult(null);
    try {
      const h = hash.trim().toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(h)) {
        setVerifResult({ ok: false, error: "Hash deve ter 64 caracteres hexadecimais." });
        return;
      }
      const r = await fetch(`/api/parq/verificar-hash/${h}`);
      const j = await r.json();
      setVerifResult(j);
    } catch (e) {
      setVerifResult({ ok: false, error: String(e) });
    } finally {
      setVerifLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "#FAFAFA", fontFamily: "system-ui, sans-serif" }}
      data-testid="page-sobre-parcerias"
    >
      {/* Header navy/gold */}
      <header style={{ background: NAVY }} className="py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <ShieldCheck
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: GOLD }}
          />
          <h1
            className="text-3xl md:text-4xl font-bold"
            style={{ color: "#fff", fontFamily: "Times New Roman, serif" }}
          >
            Transparência sobre Parcerias Técnicas
          </h1>
          <p className="text-sm mt-2" style={{ color: "#E8C268" }}>
            PAWARDS MEDCORE · Sua autonomia de paciente é prioridade
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Compromisso */}
        <section
          className="p-6 rounded-xl border-l-4"
          style={{ background: GOLD_BG, borderColor: GOLD }}
        >
          <h2
            className="text-lg font-bold mb-2"
            style={{ color: NAVY, fontFamily: "Times New Roman, serif" }}
          >
            Nosso compromisso com você
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#1f2937" }}>
            Esta clínica mantém parcerias técnicas com farmácias de manipulação
            para garantir a qualidade da medicação que você recebe. Estas
            parcerias <strong>não são acordos de comissão por indicação</strong>{" "}
            — pratica vedada pela Resolução CFM 2.386/2024, art. 27. São
            contratos de auditoria Kaizen bimestral, regulados pelo Código Civil
            (arts. 593-609), com entregáveis técnicos verificáveis.
          </p>
        </section>

        {/* O que é PARQ */}
        <section>
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: NAVY, fontFamily: "Times New Roman, serif" }}
          >
            O que é o Termo PARQ?
          </h2>
          <p className="text-sm leading-relaxed mb-3 text-gray-700">
            O PARQ (Parceria de Qualidade Técnica) é um instrumento contratual
            público entre a clínica e a farmácia de manipulação. Ele formaliza:
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span style={{ color: GOLD }}>•</span>
              <span>
                <strong>Visita presencial bimestral</strong> da clínica à
                farmácia, com checklist técnico de 5 categorias (insumos,
                processamento, atendimento, entrega, qualidade geral).
              </span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: GOLD }}>•</span>
              <span>
                <strong>Plano de ação Kaizen</strong> para qualquer
                não-conformidade encontrada, com prazo limite e evidência de
                saneamento.
              </span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: GOLD }}>•</span>
              <span>
                <strong>Classificação Gold / Silver / Bronze</strong> baseada
                exclusivamente nas notas técnicas das visitas.
              </span>
            </li>
            <li className="flex gap-2">
              <span style={{ color: GOLD }}>•</span>
              <span>
                <strong>Suspensão automática</strong> em caso de planos atrasados
                ou reincidência de não-conformidade crítica.
              </span>
            </li>
          </ul>
        </section>

        {/* Sua liberdade */}
        <section className="p-6 rounded-xl bg-white border">
          <h2 className="text-lg font-bold mb-2" style={{ color: NAVY }}>
            Você tem total liberdade
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">
            Mesmo existindo uma parceria técnica, você é{" "}
            <strong>livre para escolher qualquer outra farmácia</strong> de
            manipulação para aviar suas receitas. O médico não recebe nenhuma
            comissão pela escolha que você fizer. A indicação que aparece em sua
            receita é apenas uma sugestão de farmácia auditada por nós, mas{" "}
            <em>nunca uma obrigação</em>.
          </p>
        </section>

        {/* Verificação de hash */}
        <section className="p-6 rounded-xl border" style={{ borderColor: GOLD }}>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5" style={{ color: GOLD }} />
            <h2 className="text-lg font-bold" style={{ color: NAVY }}>
              Verificar autenticidade de um Termo PARQ
            </h2>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Cole o código SHA-256 (64 caracteres hexadecimais) que aparece no
            rodapé do Termo PARQ ou abaixo do QR Code:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="ex: a1b2c3d4..."
              className="flex-1 p-3 border rounded-lg text-xs font-mono"
              maxLength={64}
              data-testid="input-hash-verif"
            />
            <button
              disabled={verifLoading || hash.length !== 64}
              onClick={() => void verificar()}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: NAVY }}
              data-testid="btn-verificar-hash"
            >
              {verifLoading ? "..." : "Verificar"}
            </button>
          </div>

          {verifResult && (
            <div
              className="mt-4 p-3 rounded-lg text-sm"
              style={{
                background: verifResult.ok ? "#F0FDF4" : "#FEF2F2",
                color: verifResult.ok ? "#166534" : "#991B1B",
              }}
              data-testid="result-verif"
            >
              {verifResult.ok ? (
                <div>
                  <strong>✓ Termo válido e autêntico</strong>
                  <div className="text-xs mt-1">
                    Nº Série: {verifResult.numero_serie} · Status:{" "}
                    {verifResult.status} · Emitido em{" "}
                    {verifResult.emitido_em
                      ? new Date(verifResult.emitido_em).toLocaleDateString(
                          "pt-BR",
                        )
                      : "—"}
                  </div>
                </div>
              ) : (
                <div>
                  ✗ {verifResult.error || "Termo não encontrado ou inválido"}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Base legal */}
        <section className="p-6 rounded-xl bg-white border">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5" style={{ color: GOLD }} />
            <h2 className="text-lg font-bold" style={{ color: NAVY }}>
              Base legal consolidada
            </h2>
          </div>
          <ul className="space-y-1 text-xs text-gray-700">
            <li>
              <strong>Resolução CFM 2.386/2024</strong> · vedação de comissão
              por indicação (art. 27)
            </li>
            <li>
              <strong>Resolução CFM 2.217/2018</strong> · Código de Ética Médica
              (art. 20 — autonomia técnica)
            </li>
            <li>
              <strong>Código Civil arts. 593-609</strong> · contrato de
              prestação de serviço
            </li>
            <li>
              <strong>STJ REsp 2.159.442/PR</strong> · licitude de parcerias
              técnicas com entregáveis auditáveis
            </li>
            <li>
              <strong>Lei 14.063/2020 art. 5º I</strong> · assinatura
              eletrônica simples para atos de baixo impacto
            </li>
            <li>
              <strong>LGPD Lei 13.709/2018</strong> · arts. 7º V e 11 II.f
              (compartilhamento de dados de saúde)
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer
          className="text-center text-xs text-gray-500 pt-4 border-t"
          style={{ borderColor: "#e5e7eb" }}
        >
          Em caso de dúvidas ou denúncia, entre em contato pelo{" "}
          <a
            href="mailto:transparencia@pawards.com.br"
            style={{ color: NAVY }}
            className="underline inline-flex items-center gap-1"
          >
            transparencia@pawards.com.br
            <ExternalLink className="w-3 h-3" />
          </a>
        </footer>
      </main>
    </div>
  );
}
