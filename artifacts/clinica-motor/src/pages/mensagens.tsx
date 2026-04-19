/**
 * 💧 MENSAGENS — Editor Neon das Mensagens da Beatriz Romanov
 *
 * Rio narrativo: aqui o Dr. Caio molda a voz da clínica. Cada período do dia,
 * cada dia da semana, cada semana do mês, cada fala do Dr. Caio e cada versículo
 * de sábado nasce, cresce e se renova nesta tela. O preview ao vivo mostra
 * exatamente como a mensagem chega no WhatsApp do paciente.
 *
 * Irmãs: api-server/routes/mensagens.ts (CRUD), pacientes (relatório embute),
 * alertas.ts (envio). Cunhado por Dr. Caio · base PDF Opus 4.7 · v3.
 */
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Loader2, Copy, CheckCircle2, Pencil, Save, X } from "lucide-react";

type Bloco = {
  id: number;
  categoria: string;
  chave: string;
  ordem: number;
  conteudo: any;
  ativo: boolean;
};

const API = (import.meta as any).env.VITE_API_URL || "/api";

const DEFAULT_BLOCO_PRESCRICAO = `*Período: Início da Manhã*
*Programado* para administrar:

*Fórmula 01 — Tireoide e Metabolismo*
❶ Panax Ginseng 10mg _[1º ativo]_
   Horário: 06h _[Café da Manhã]_
Tomar 1 dose via oral

*Fórmula 02 — Antioxidante*
❶ NAC N-Acetil-Cisteína 100mg _[1º ativo]_
   Horário: 08h
Tomar 1 dose via oral

*Período: Início da Tarde*
*NÃO TOMAR* as fórmulas abaixo:

*Fórmula 03 — Anabólico*
❶ Oximetolona 10mg _[1º ativo]_
   Horário: 14h`;

export default function MensagensPage() {
  const [data, setData] = useState<Record<string, Bloco[]> | null>(null);
  const [loading, setLoading] = useState(true);

  // estado do preview
  const [nomePaciente, setNomePaciente] = useState("Márcio");
  const [periodoChave, setPeriodoChave] = useState("inicioManha");
  const [diaChave, setDiaChave] = useState("segunda");
  const [semanaChave, setSemanaChave] = useState("1");
  const [statusChave, setStatusChave] = useState("op1");
  const [falaChave, setFalaChave] = useState("absorcao_idade");
  const [showBloco, setShowBloco] = useState(true);
  const [copied, setCopied] = useState(false);

  // edição
  const [editando, setEditando] = useState<{ id: number; campo: string } | null>(null);
  const [valorEdit, setValorEdit] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/mensagens-catalogo`);
      const j = await r.json();
      setData(j);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  const periodo = data?.PERIODO?.find(b => b.chave === periodoChave);
  const dia = data?.DIA_SEMANA?.find(b => b.chave === diaChave);
  const semana = data?.SEMANA_MES?.find(b => b.chave === semanaChave);
  const status = data?.DR_CAIO_STATUS?.find(b => b.chave === statusChave);
  const fala = data?.DR_CAIO_FALA?.find(b => b.chave === falaChave);
  const elogio = data?.ELOGIO_SEMANA?.find(b => b.chave === semanaChave);
  const versiculo = data?.VERSICULO_SABADO?.find(b => b.chave === semanaChave);
  const obs = data?.OBS_DOSE?.[0];
  const ass = data?.ASSINATURA?.[0];

  const cores = useMemo(() => ({
    primary: periodo?.conteudo?.cor_primary || "#f5b947",
    bg: periodo?.conteudo?.cor_bg || "#1f1a0a",
    accent: periodo?.conteudo?.cor_accent || "#ffd179",
  }), [periodo]);

  const isSabado = diaChave === "sabado";

  const mensagemFinal = useMemo(() => {
    if (!periodo || !dia || !semana) return "";
    const saudacao = periodo.conteudo.saudacao;
    const diaLabel = (dia.conteudo.label || "").toLowerCase();
    const semanaFrase = semana.conteudo.frase;

    let abertura = `${saudacao}!\n\nSr. ${nomePaciente}, tudo bem?\n\n`;
    if (status?.conteudo?.texto) abertura += `${status.conteudo.texto}\n\n`;

    if (isSabado && versiculo) {
      abertura += `*Feliz Sábado!* Hoje estamos na *${semanaFrase}*.\n\n`;
      abertura += `${versiculo.conteudo.texto}\n\n`;
      abertura += `${periodo.conteudo.abertura}\n\n${dia.conteudo.frase}\n\n${periodo.conteudo.desejo}`;
    } else {
      abertura += `Hoje é *${diaLabel}* — estamos na *${semanaFrase}*.\n\n`;
      abertura += `${periodo.conteudo.abertura}\n\n${dia.conteudo.frase}\n\n${periodo.conteudo.desejo}`;
    }

    const prescricao = showBloco ? DEFAULT_BLOCO_PRESCRICAO : "{BLOCO_PRESCRICAO}";
    const drCaio = fala?.conteudo?.texto || "";
    const elogioTxt = elogio ? `*${elogio.conteudo.texto}*\n\nParabéns, Sr. ${nomePaciente}. Continue firme.` : "";
    const obsTxt = obs?.conteudo?.texto || "";
    const assBlock = ass ? `${ass.conteudo.saudacao_fechamento}\n\n*${ass.conteudo.nome}*\n_${ass.conteudo.papel}_\n\n───────────\n${ass.conteudo.rodape_linha1}\n_${ass.conteudo.rodape_subtitulo1}_\n\n${ass.conteudo.rodape_linha2}\n_${ass.conteudo.rodape_subtitulo2}_\n───────────` : "";

    return [abertura, prescricao, drCaio, elogioTxt, obsTxt, assBlock]
      .filter(Boolean).join("\n\n");
  }, [periodo, dia, semana, status, isSabado, versiculo, nomePaciente, showBloco, fala, elogio, obs, ass]);

  async function salvarEdit() {
    if (!editando || !data) return;
    const cat = Object.keys(data).find(k =>
      data[k].some(b => b.id === editando.id)
    );
    if (!cat) return;
    const bloco = data[cat].find(b => b.id === editando.id)!;
    const novoConteudo = { ...bloco.conteudo, [editando.campo]: valorEdit };
    await fetch(`${API}/mensagens-catalogo/${editando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo: novoConteudo }),
    });
    setEditando(null);
    setValorEdit("");
    carregar();
  }

  function abrirEdit(b: Bloco, campo: string) {
    setEditando({ id: b.id, campo });
    setValorEdit(b.conteudo[campo] || "");
  }

  function copiar() {
    navigator.clipboard.writeText(mensagemFinal).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (loading || !data) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{
        background: "linear-gradient(135deg, #08091a 0%, #0f1020 100%)",
        minHeight: "100vh",
        marginLeft: "-2rem", marginRight: "-2rem", marginTop: "-2rem", marginBottom: "-2rem",
        padding: "0",
        fontFamily: "'Georgia', serif",
        color: "#e8e8e8",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(90deg, #0a0f20, #141830)",
          borderBottom: "1px solid #2a2d4a",
          padding: "22px 26px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, right: 0, width: "350px", height: "100%",
            background: `radial-gradient(circle at right, ${cores.primary}25, transparent 70%)`,
            transition: "all 0.5s",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: "10px", letterSpacing: "4px", color: cores.primary, textTransform: "uppercase" }}>
              PADCON Platform® · PAWARDS MedCore®
            </div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#fff", letterSpacing: "1px", marginTop: "4px" }}>
              Sistema de Lembrete Clínico por Período
            </div>
            <div style={{ fontSize: "11px", color: "#7a8aa0", marginTop: "6px", fontStyle: "italic" }}>
              v3 · Beatriz Romanov · Dr. Caio · {periodo?.conteudo.label} · {periodo?.conteudo.horario}
            </div>
          </div>
        </div>

        <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

          {/* COLUNA 1 — CONFIG + EDITOR */}
          <div>
            {/* PAINEL CONFIG */}
            <div style={{ background: "#0d1020", border: "1px solid #2a2d4a", borderRadius: "14px", padding: "18px", marginBottom: "14px" }}>
              <div style={{ fontSize: "10px", color: cores.primary, letterSpacing: "3px", marginBottom: "12px", textTransform: "uppercase" }}>
                Configuração
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
                <div style={{ flex: 1, minWidth: "160px" }}>
                  <label style={{ fontSize: "10px", color: "#7a8aa0", display: "block", marginBottom: "4px" }}>Nome do paciente</label>
                  <input value={nomePaciente} onChange={e => setNomePaciente(e.target.value)}
                    style={{ width: "100%", background: "#14172a", border: "1px solid #2a2d4a", borderRadius: "8px", padding: "9px 12px", color: "#fff", fontSize: "13px", boxSizing: "border-box", fontFamily: "Georgia, serif" }} />
                </div>
                <div style={{ flex: 2, minWidth: "240px" }}>
                  <label style={{ fontSize: "10px", color: "#7a8aa0", display: "block", marginBottom: "4px" }}>Frase do Dr. Caio (cabeçalho)</label>
                  <select value={statusChave} onChange={e => setStatusChave(e.target.value)}
                    style={{ width: "100%", background: "#14172a", border: "1px solid #2a2d4a", borderRadius: "8px", padding: "9px 12px", color: "#fff", fontSize: "12px", boxSizing: "border-box", fontFamily: "Georgia, serif" }}>
                    {data.DR_CAIO_STATUS.map(b => (
                      <option key={b.chave} value={b.chave}>
                        {b.conteudo.texto === "" ? "— Sem frase do Dr. Caio —" : b.conteudo.texto.substring(0, 70) + "..."}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PERÍODO */}
              <label style={{ fontSize: "10px", color: "#7a8aa0", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Período da medicação</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "6px", marginBottom: "14px" }}>
                {data.PERIODO.map(b => {
                  const sel = periodoChave === b.chave;
                  return (
                    <button key={b.chave} onClick={() => setPeriodoChave(b.chave)}
                      style={{ padding: "10px 8px", borderRadius: "7px",
                        border: sel ? `1.5px solid ${b.conteudo.cor_primary}` : "1px solid #2a2d4a",
                        background: sel ? b.conteudo.cor_bg : "#14172a",
                        color: sel ? b.conteudo.cor_primary : "#7a8aa0",
                        fontSize: "11px", cursor: "pointer", fontFamily: "Georgia, serif", textAlign: "left", transition: "all 0.2s" }}>
                      <div style={{ fontSize: "14px", marginBottom: "2px" }}>{b.conteudo.emoji}</div>
                      <div style={{ fontWeight: "bold", letterSpacing: "0.3px" }}>{b.conteudo.label}</div>
                      <div style={{ fontSize: "9px", opacity: 0.7, marginTop: "2px" }}>{b.conteudo.horario}</div>
                    </button>
                  );
                })}
              </div>

              {/* DIA SEMANA */}
              <label style={{ fontSize: "10px", color: "#7a8aa0", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Dia da semana</label>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "14px" }}>
                {data.DIA_SEMANA.map(b => {
                  const sel = diaChave === b.chave;
                  return (
                    <button key={b.chave} onClick={() => setDiaChave(b.chave)}
                      style={{ padding: "8px 12px", borderRadius: "6px",
                        border: sel ? `1px solid ${cores.primary}` : "1px solid #2a2d4a",
                        background: sel ? cores.bg : "#14172a",
                        color: sel ? cores.primary : "#7a8aa0",
                        fontSize: "11px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      {b.conteudo.label}
                    </button>
                  );
                })}
              </div>

              {/* SEMANA MES */}
              <label style={{ fontSize: "10px", color: "#7a8aa0", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Semana do mês</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                {data.SEMANA_MES.map(b => {
                  const sel = semanaChave === b.chave;
                  return (
                    <button key={b.chave} onClick={() => setSemanaChave(b.chave)}
                      style={{ flex: "1 1 auto", minWidth: "100px", padding: "9px 12px", borderRadius: "6px",
                        border: sel ? `1px solid ${cores.primary}` : "1px solid #2a2d4a",
                        background: sel ? cores.bg : "#14172a",
                        color: sel ? cores.primary : "#7a8aa0",
                        fontSize: "11px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      {b.chave}ª Semana
                    </button>
                  );
                })}
              </div>

              {/* FALA DR CAIO */}
              <label style={{ fontSize: "10px", color: "#7a8aa0", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Mensagem do Dr. Caio (abaixo da prescrição)</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {data.DR_CAIO_FALA.map(b => {
                  const sel = falaChave === b.chave;
                  return (
                    <button key={b.chave} onClick={() => setFalaChave(b.chave)}
                      style={{ padding: "8px 12px", borderRadius: "6px",
                        border: sel ? `1px solid ${cores.primary}` : "1px solid #2a2d4a",
                        background: sel ? cores.bg : "#14172a",
                        color: sel ? cores.primary : "#7a8aa0",
                        fontSize: "11px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      {b.conteudo.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EDITOR DE BLOCOS */}
            <div style={{ background: "#0d1020", border: "1px solid #2a2d4a", borderRadius: "14px", padding: "18px" }}>
              <div style={{ fontSize: "10px", color: cores.primary, letterSpacing: "3px", marginBottom: "12px", textTransform: "uppercase" }}>
                Editor — clique no lápis pra editar
              </div>

              <BlocoEdit titulo="Período · abertura" b={periodo} campo="abertura" cores={cores} editando={editando} valorEdit={valorEdit} setValorEdit={setValorEdit} abrirEdit={abrirEdit} salvar={salvarEdit} cancelar={() => setEditando(null)} />
              <BlocoEdit titulo="Período · desejo" b={periodo} campo="desejo" cores={cores} editando={editando} valorEdit={valorEdit} setValorEdit={setValorEdit} abrirEdit={abrirEdit} salvar={salvarEdit} cancelar={() => setEditando(null)} />
              <BlocoEdit titulo="Dia · frase" b={dia} campo="frase" cores={cores} editando={editando} valorEdit={valorEdit} setValorEdit={setValorEdit} abrirEdit={abrirEdit} salvar={salvarEdit} cancelar={() => setEditando(null)} />
              <BlocoEdit titulo="Semana do mês · frase" b={semana} campo="frase" cores={cores} editando={editando} valorEdit={valorEdit} setValorEdit={setValorEdit} abrirEdit={abrirEdit} salvar={salvarEdit} cancelar={() => setEditando(null)} />
              <BlocoEdit titulo="Elogio da semana" b={elogio} campo="texto" cores={cores} editando={editando} valorEdit={valorEdit} setValorEdit={setValorEdit} abrirEdit={abrirEdit} salvar={salvarEdit} cancelar={() => setEditando(null)} />
              <BlocoEdit titulo="Fala Dr. Caio" b={fala} campo="texto" cores={cores} editando={editando} valorEdit={valorEdit} setValorEdit={setValorEdit} abrirEdit={abrirEdit} salvar={salvarEdit} cancelar={() => setEditando(null)} />
              {isSabado && <BlocoEdit titulo="Versículo de sábado" b={versiculo} campo="texto" cores={cores} editando={editando} valorEdit={valorEdit} setValorEdit={setValorEdit} abrirEdit={abrirEdit} salvar={salvarEdit} cancelar={() => setEditando(null)} />}
              <BlocoEdit titulo="Observação de dose" b={obs} campo="texto" cores={cores} editando={editando} valorEdit={valorEdit} setValorEdit={setValorEdit} abrirEdit={abrirEdit} salvar={salvarEdit} cancelar={() => setEditando(null)} />
            </div>
          </div>

          {/* COLUNA 2 — PREVIEW WHATSAPP */}
          <div>
            <div style={{
              background: "#0a1a10",
              border: `1px solid ${cores.primary}33`,
              borderRadius: "18px", overflow: "hidden", marginBottom: "14px",
              boxShadow: `0 20px 60px ${cores.primary}15`,
              position: "sticky", top: "20px",
            }}>
              <div style={{ background: "linear-gradient(90deg, #143820, #1a3d24)", padding: "12px 18px", borderBottom: `1px solid ${cores.primary}22`, display: "flex", alignItems: "center", gap: "11px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: `linear-gradient(135deg, ${cores.primary}, ${cores.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", color: "#fff", fontFamily: "Georgia, serif" }}>β</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#fff" }}>Beatriz Romanov · PADCON</div>
                  <div style={{ fontSize: "10px", color: "#88bb99" }}>{periodo?.conteudo.emoji} {periodo?.conteudo.label} · {periodo?.conteudo.horario}</div>
                </div>
              </div>

              <div style={{ padding: "18px", background: "#0f1e13", maxHeight: "70vh", overflowY: "auto" }}>
                <div style={{
                  background: "#1a2e1e", borderRadius: "14px", padding: "16px 20px",
                  borderLeft: `3px solid ${cores.primary}`, fontSize: "12.5px",
                  lineHeight: "1.75", color: "#d4e8d4", whiteSpace: "pre-wrap",
                }}>
                  {mensagemFinal}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", padding: "14px", borderTop: `1px solid ${cores.primary}22` }}>
                <button onClick={() => setShowBloco(!showBloco)}
                  style={{ padding: "11px 18px", borderRadius: "8px", border: "1px solid #2a2d4a",
                    background: showBloco ? "#14172a" : "transparent",
                    color: showBloco ? cores.primary : "#667",
                    fontSize: "12px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  {showBloco ? "Ocultar exemplo" : "Mostrar exemplo"}
                </button>
                <button onClick={copiar}
                  style={{ flex: 1, padding: "13px 26px", borderRadius: "8px",
                    border: `1px solid ${copied ? "#4dc08a" : cores.primary}`,
                    background: copied ? "#1a3028" : `${cores.primary}22`,
                    color: copied ? "#4dc08a" : cores.primary,
                    fontSize: "13px", cursor: "pointer", fontWeight: "bold", letterSpacing: "1px",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    fontFamily: "Georgia, serif" }}>
                  {copied ? <><CheckCircle2 size={16} /> Copiada!</> : <><Copy size={16} /> Copiar mensagem</>}
                </button>
              </div>
            </div>

            <div style={{ background: "#2a1810", border: "1px solid #5a3a2a", borderRadius: "14px", padding: "16px" }}>
              <div style={{ fontSize: "10px", color: "#e89b4a", letterSpacing: "3px", marginBottom: "8px", textTransform: "uppercase" }}>
                Sobre pop-up no WhatsApp
              </div>
              <div style={{ fontSize: "12px", color: "#d8b89c", lineHeight: "1.7" }}>
                <strong style={{ color: "#e89b4a" }}>WhatsApp não suporta pop-ups.</strong> Só existe a mensagem de texto formatada com asteriscos *negrito*, _itálico_ e emojis. Esse preview já mostra exatamente como aparece no telefone do paciente.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ───────────────────── EDITOR INLINE DE BLOCO ─────────────────────
function BlocoEdit({ titulo, b, campo, cores, editando, valorEdit, setValorEdit, abrirEdit, salvar, cancelar }: any) {
  if (!b) return null;
  const ativo = editando?.id === b.id && editando?.campo === campo;
  return (
    <div style={{ marginBottom: "14px", borderBottom: "1px solid #1c1f3a", paddingBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "10px", color: cores.primary, letterSpacing: "2px", textTransform: "uppercase" }}>{titulo}</span>
        {!ativo && (
          <button onClick={() => abrirEdit(b, campo)}
            style={{ background: "transparent", border: `1px solid ${cores.primary}55`, color: cores.primary, borderRadius: "6px", padding: "3px 8px", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            <Pencil size={11} /> Editar
          </button>
        )}
      </div>
      {ativo ? (
        <div>
          <textarea value={valorEdit} onChange={e => setValorEdit(e.target.value)} rows={4}
            style={{ width: "100%", background: "#0a0d20", border: `1px solid ${cores.primary}66`, borderRadius: "6px", padding: "8px", color: "#e8e8e8", fontSize: "12px", fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
            <button onClick={salvar} style={{ background: cores.primary, color: "#0a0d20", border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontWeight: "bold" }}>
              <Save size={11} /> Salvar
            </button>
            <button onClick={cancelar} style={{ background: "transparent", color: "#7a8aa0", border: "1px solid #2a2d4a", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
              <X size={11} /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: "12px", color: "#a8b8c8", lineHeight: "1.5", whiteSpace: "pre-wrap", maxHeight: "60px", overflow: "hidden", textOverflow: "ellipsis" }}>
          {b.conteudo[campo] || <em style={{ color: "#556677" }}>(vazio)</em>}
        </div>
      )}
    </div>
  );
}
