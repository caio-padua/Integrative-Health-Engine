import { CockpitShell, HeaderPaciente, BlocoCockpit, ChipStatus, corBloco, p, pasteis, ls, fonte } from "./_pecasCockpit";

/**
 * COCKPIT 4 · EVIDÊNCIA EMPILHADA
 * Cada bloco é uma "prova" selada. Linguagem visual blockchain:
 * hash SHA-256 + carimbo dourado + selada/pendente. Auditoria forense visualizada.
 */
export function Cockpit4Evidencia() {
  const blocos = [
    {
      sigla: "BL-001", titulo: "CONSENTIMENTO INFORMADO LGPD",
      cor: "#5FE6CC", status: "SELADO · ZAPSIGN ICP-BR",
      hashAtual:    "a7f3·c41b·19fe·d92e·8a14·3c20·b1d4·77ee",
      hashAnterior: "0000·0000·0000·0000·0000·0000·0000·0001",
      timestamp: "26/MAI/2026 09:14:22 BRT",
      origem: "PACIENTE · GRACO SOUZA PÁDUA",
      arquivo: "termo_consentimento_v4.pdf",
      tamanho: "412 KB",
    },
    {
      sigla: "BL-002", titulo: "FICHA DE ANAMNESE QUANTIFICADA",
      cor: "#FF9A9A", status: "SELADO · DR. MARCO ANDRADE",
      hashAtual:    "8c12·b67a·de34·4b1a·9f88·22c0·56dd·a019",
      hashAnterior: "a7f3·c41b·19fe·d92e·8a14·3c20·b1d4·77ee",
      timestamp: "26/MAI/2026 09:42:11 BRT",
      origem: "MÉDICO · CRM-SP 142308",
      arquivo: "anamnese_quantificada.json",
      tamanho: "88 KB",
    },
    {
      sigla: "BL-003", titulo: "MOTOR CLÍNICO · 42 REGRAS APLICADAS",
      cor: "#FFA3C8", status: "SELADO · MOTOR V4 AUTÔNOMO",
      hashAtual:    "f491·9d2e·a008·22ec·b145·3aa7·6c11·0f9d",
      hashAnterior: "8c12·b67a·de34·4b1a·9f88·22c0·56dd·a019",
      timestamp: "26/MAI/2026 09:42:13 BRT",
      origem: "SISTEMA · MOTOR-V4-PROD",
      arquivo: "motor_inferencias_trace.json",
      tamanho: "1.2 MB",
    },
    {
      sigla: "BL-004", titulo: "PRESCRIÇÃO MÉDICA · 6 ITENS",
      cor: pasteis.admin.neon, status: "SELADO · DR. MARCO ANDRADE",
      hashAtual:    "1d3a·45f1·9c20·87cc·5e8b·2c3a·77df·91fa",
      hashAnterior: "f491·9d2e·a008·22ec·b145·3aa7·6c11·0f9d",
      timestamp: "26/MAI/2026 10:08:54 BRT",
      origem: "MÉDICO · CRM-SP 142308",
      arquivo: "prescricao_ciclo_3.pdf",
      tamanho: "286 KB",
    },
    {
      sigla: "BL-005", titulo: "ASSINATURA DIGITAL ICP-BRASIL",
      cor: p.gold, status: "SELADO · CADEIA COMPLETA",
      hashAtual:    "9b22·6e8d·b145·3aa7·4f01·c8e3·b2a9·1f4c",
      hashAnterior: "1d3a·45f1·9c20·87cc·5e8b·2c3a·77df·91fa",
      timestamp: "26/MAI/2026 10:09:02 BRT",
      origem: "ZAPSIGN · ICP-BRASIL · A3",
      arquivo: "assinatura_icp.p7s",
      tamanho: "14 KB",
    },
    {
      sigla: "BL-006", titulo: "ENTREGA AO PACIENTE",
      cor: p.cyan, status: "PENDENTE · AGUARDANDO LEITURA", statusCor: "#F5C97A",
      hashAtual:    "—  AGUARDANDO ABERTURA DO PORTAL  —",
      hashAnterior: "9b22·6e8d·b145·3aa7·4f01·c8e3·b2a9·1f4c",
      timestamp: "—",
      origem: "—",
      arquivo: "—",
      tamanho: "—",
    },
  ];

  return (
    <CockpitShell>
      <HeaderPaciente />

      {/* SUMÁRIO CADEIA */}
      <div style={{ padding: "12px 16px", background: p.navyPanel, borderBottom: `1px solid ${p.gold}`, display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 2 }}>CADEIA DE EVIDÊNCIA · CICLO #3</div>
          <div style={{ fontSize: 14, color: p.gold, letterSpacing: ls.forte, fontWeight: 700 }}>6 BLOCOS · 5 SELADOS · 1 PENDENTE</div>
        </div>
        <ChipStatus texto="INTEGRIDADE 100%" cor="#5FE6CC" />
        <ChipStatus texto="LGPD ART.20 ✓"    cor="#5FE6CC" />
        <ChipStatus texto="CFM 2.314/22 ✓"   cor="#5FE6CC" />
        <ChipStatus texto="BACKUP S3 · 3 REGIÕES" cor={p.cyan} />
      </div>

      {blocos.map((b, i) => (
        <BlocoCockpit key={b.sigla} sigla={b.sigla} titulo={b.titulo} cor={b.cor}
          status={b.status} statusCor={b.statusCor ?? "#5FE6CC"}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
            <div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>HASH SHA-256 DESTE BLOCO</div>
                <div style={{ background: p.navyDeep, border: `1px solid ${b.cor}55`, padding: "10px 12px", fontFamily: fonte.familia, fontSize: 11, color: b.cor, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums", wordBreak: "break-all" }}>
                  {b.hashAtual}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>HASH BLOCO ANTERIOR (LINK)</div>
                <div style={{ background: p.navyDeep, border: `1px solid ${p.border}`, padding: "10px 12px", fontFamily: fonte.familia, fontSize: 10, color: p.inkDim, letterSpacing: ls.forte, fontVariantNumeric: "tabular-nums", wordBreak: "break-all" }}>
                  ↑ {b.hashAnterior}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                <Meta label="TIMESTAMP UTC-3" valor={b.timestamp} />
                <Meta label="ORIGEM"          valor={b.origem} />
                <Meta label="ARQUIVO"         valor={`${b.arquivo} · ${b.tamanho}`} />
              </div>
            </div>

            {/* Carimbo dourado lateral */}
            <div style={{ background: p.navyDeep, border: `2px solid ${b.cor}`, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ fontSize: 9, color: p.inkMute, letterSpacing: ls.forte }}>CARIMBO #{i + 1}/6</div>
              <div style={{ fontSize: 32, color: b.cor, fontWeight: 700, letterSpacing: ls.forte, filter: `drop-shadow(0 0 12px ${b.cor})` }}>
                {b.status.startsWith("PENDENTE") ? "◌" : "✓"}
              </div>
              <div style={{ fontSize: 10, color: b.cor, letterSpacing: ls.forte, fontWeight: 700, textAlign: "center" }}>
                {b.status.startsWith("PENDENTE") ? "AGUARDA" : "SELADO"}
              </div>
              <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.suave, textAlign: "center", marginTop: 4 }}>
                PROTOCOLO<br/>
                <span style={{ color: p.inkDim, fontFamily: fonte.familia, letterSpacing: ls.forte }}>
                  PWD-2026-{String(i + 1).padStart(6, "0")}
                </span>
              </div>
            </div>
          </div>
        </BlocoCockpit>
      ))}
    </CockpitShell>
  );
}

function Meta({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: p.inkMute, letterSpacing: ls.forte, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 10, color: p.ink, padding: "8px 10px", background: p.navyDeep, border: `1px solid ${p.border}`, letterSpacing: ls.suave }}>{valor}</div>
    </div>
  );
}
