export function EmailCalendarBlueprint() {
  const gold = "#D4A017";
  const darkBg = "#0F172A";
  const cardBg = "#1E293B";
  const sectionBg = "#334155";
  const greenAccent = "#22C55E";
  const blueAccent = "#3B82F6";
  const purpleAccent = "#A78BFA";
  const orangeAccent = "#F97316";
  const tealAccent = "#2DD4BF";
  const pinkAccent = "#EC4899";

  const s = {
    page: { background: darkBg, color: "#F1F5F9", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 40, minHeight: "100vh" } as React.CSSProperties,
    title: { fontSize: 28, fontWeight: 800, color: gold, textAlign: "center" as const, marginBottom: 8, letterSpacing: 1 },
    subtitle: { fontSize: 14, color: "#94A3B8", textAlign: "center" as const, marginBottom: 40 },
    section: { background: cardBg, borderRadius: 16, padding: 24, marginBottom: 24, border: `1px solid ${sectionBg}` } as React.CSSProperties,
    sectionTitle: { fontSize: 18, fontWeight: 700, color: gold, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
    row: { display: "flex", gap: 16, flexWrap: "wrap" as const, marginBottom: 12 },
    card: (accent: string) => ({ background: sectionBg, borderRadius: 12, padding: 16, flex: "1 1 280px", borderLeft: `4px solid ${accent}`, minWidth: 260 }) as React.CSSProperties,
    label: { fontSize: 11, color: "#64748B", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 },
    value: { fontSize: 14, fontWeight: 600, color: "#E2E8F0", marginBottom: 8 },
    email: (accent: string) => ({ fontSize: 13, color: accent, fontFamily: "monospace", background: "#0F172A", padding: "4px 8px", borderRadius: 6, display: "inline-block", marginBottom: 4 }),
    badge: (bg: string) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color: "#FFF", marginRight: 6 }),
    divider: { borderTop: `1px solid ${sectionBg}`, margin: "16px 0" },
    arrow: { textAlign: "center" as const, fontSize: 24, color: gold, margin: "8px 0" },
    note: { fontSize: 12, color: "#94A3B8", fontStyle: "italic" as const, marginTop: 8 },
    flowBox: (accent: string) => ({ background: sectionBg, borderRadius: 10, padding: 12, textAlign: "center" as const, border: `2px solid ${accent}`, flex: "1 1 200px" }) as React.CSSProperties,
    connector: { display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: gold, padding: "0 8px" },
  };

  return (
    <div style={s.page}>
      <div style={s.title}>BLUEPRINT — LOGISTICA DE EMAILS & CALENDARIOS</div>
      <div style={s.subtitle}>PAWARDS MedCore | Modelo Multi-Clinica sob Consultoria Dr. Caio</div>

      {/* SEÇÃO 1: MODELO DE POSSE */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={{ fontSize: 22 }}>1</span> MODELO DE POSSE DOS EMAILS
        </div>
        <div style={{ ...s.card(gold), marginBottom: 16 }}>
          <div style={s.label}>REGRA FUNDAMENTAL</div>
          <div style={{ ...s.value, fontSize: 16 }}>Dr. Caio CRIA todos os emails. Dr. Caio ATIVA 2FA com resgate exclusivo por ele.</div>
          <div style={s.divider} />
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={s.label}>POSSE ETERNA</div>
              <div style={{ fontSize: 13, color: greenAccent }}>Se a parceria acabar, o email fica com Dr. Caio</div>
            </div>
            <div>
              <div style={s.label}>DELEGACAO</div>
              <div style={{ fontSize: 13, color: blueAccent }}>Funcionarios USAM o email enquanto empregados</div>
            </div>
            <div>
              <div style={s.label}>VINCULO</div>
              <div style={{ fontSize: 13, color: purpleAccent }}>Cada email vinculado ao Trello para demandas</div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: EMAILS POR CLINICA */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={{ fontSize: 22 }}>2</span> CADASTRO DE CLINICA — ABA "EMAILS & INTEGRACOES"
        </div>
        <div style={s.note}>Toda nova clinica cadastrada tera uma sub-aba com estes campos obrigatorios:</div>

        <div style={{ ...s.row, marginTop: 16 }}>
          <div style={s.card(blueAccent)}>
            <div style={s.label}>CAMPO 1 — EMAIL PRINCIPAL</div>
            <div style={s.value}>Email para comunicacoes gerais da clinica</div>
            <div style={s.email(blueAccent)}>pawards.[clinica].geral@gmail.com</div>
            <div style={s.note}>Recebe notificacoes do sistema, alertas, relatorios</div>
          </div>
          <div style={s.card(greenAccent)}>
            <div style={s.label}>CAMPO 2 — GMAIL GOOGLE CALENDAR</div>
            <div style={s.value}>Email EXCLUSIVO para integracao com Google Calendar</div>
            <div style={s.email(greenAccent)}>pawards.[clinica].agenda@gmail.com</div>
            <div style={s.note}>Paciente recebe convite do Calendar. Complemento da agenda interna do PAWARDS</div>
          </div>
        </div>

        <div style={s.divider} />
        <div style={{ ...s.label, marginBottom: 8 }}>EXEMPLOS REAIS:</div>
        <div style={s.row}>
          <div style={s.flowBox(gold)}>
            <div style={{ fontSize: 12, fontWeight: 700, color: gold }}>INSTITUTO PADUA</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>CNPJ 63.865.940/0001-63</div>
            <div style={s.divider} />
            <div style={s.email(blueAccent)}>pawards.padua.geral@gmail.com</div>
            <div style={s.email(greenAccent)}>clinica.padua.agenda@gmail.com</div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>* Email atual ja em uso</div>
          </div>
          <div style={s.flowBox(tealAccent)}>
            <div style={{ fontSize: 12, fontWeight: 700, color: tealAccent }}>INSTITUTO LEMOS</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>CNPJ 32.247.755/0002-62</div>
            <div style={s.divider} />
            <div style={s.email(blueAccent)}>pawards.lemos.geral@gmail.com</div>
            <div style={s.email(greenAccent)}>pawards.lemos.agenda@gmail.com</div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>1a clinica sob consultoria</div>
          </div>
          <div style={s.flowBox("#6366F1")}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6366F1" }}>INSTITUTO BARROS</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>CNPJ 44.555.666/0001-77</div>
            <div style={s.divider} />
            <div style={s.email(blueAccent)}>pawards.barros.geral@gmail.com</div>
            <div style={s.email(greenAccent)}>pawards.barros.agenda@gmail.com</div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>2a clinica sob consultoria</div>
          </div>
          <div style={s.flowBox(purpleAccent)}>
            <div style={{ fontSize: 12, fontWeight: 700, color: purpleAccent }}>FUTURA CLINICA N...</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>CNPJ XX.XXX.XXX/0001-XX</div>
            <div style={s.divider} />
            <div style={s.email(blueAccent)}>pawards.[clinica].geral@gmail.com</div>
            <div style={s.email(greenAccent)}>pawards.[clinica].agenda@gmail.com</div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>Modelo escalavel infinito</div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: EMAILS DOS AGENTES/FUNCIONARIOS */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={{ fontSize: 22 }}>3</span> EMAILS DOS FUNCIONARIOS — CARGO = EMAIL = AGENTE VIRTUAL
        </div>
        <div style={s.note}>Cada cargo tem um email. Funcionario humano ADOTA o email do cargo. Cada email tem um agente virtual correspondente.</div>

        <div style={{ ...s.row, marginTop: 16 }}>
          {[
            { cargo: "ENFERMAGEM 01", humano: "Bianca", agente: "Bianca (IA)", email: "padua.enfermagem01@gmail.com", cor: tealAccent, emoji: "💉" },
            { cargo: "ENFERMAGEM 02", humano: "Mariana", agente: "Mariana (IA)", email: "padua.enfermagem02@gmail.com", cor: tealAccent, emoji: "🔍" },
            { cargo: "CONSULTOR 01", humano: "—", agente: "Dr. Lucas (IA)", email: "padua.consultor01@gmail.com", cor: purpleAccent, emoji: "🧬" },
            { cargo: "CONSULTOR 02", humano: "—", agente: "Dra. Camila (IA)", email: "padua.consultor02@gmail.com", cor: purpleAccent, emoji: "📊" },
            { cargo: "SUPERVISOR 01", humano: "Graco", agente: "Fernando (IA)", email: "padua.supervisor01@gmail.com", cor: orangeAccent, emoji: "📋" },
            { cargo: "SUPERVISOR 02", humano: "—", agente: "Gustavo (IA)", email: "padua.supervisor02@gmail.com", cor: orangeAccent, emoji: "🕵️" },
            { cargo: "FINANCEIRO 01", humano: "—", agente: "Patricia (IA)", email: "padua.financeiro01@gmail.com", cor: greenAccent, emoji: "💰" },
            { cargo: "OUVIDORIA 01", humano: "—", agente: "Helena (IA)", email: "padua.ouvidoria01@gmail.com", cor: pinkAccent, emoji: "🛡️" },
          ].map((ag, i) => (
            <div key={i} style={{ ...s.card(ag.cor), flex: "1 1 220px", minWidth: 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ ...s.label, marginBottom: 0 }}>{ag.cargo}</div>
                <span style={{ fontSize: 18 }}>{ag.emoji}</span>
              </div>
              <div style={s.divider} />
              <div style={{ fontSize: 11, color: "#64748B" }}>HUMANO:</div>
              <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600 }}>{ag.humano}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>AGENTE IA:</div>
              <div style={{ fontSize: 13, color: ag.cor, fontWeight: 600 }}>{ag.agente}</div>
              <div style={{ marginTop: 8 }}>
                <div style={s.email(ag.cor)}>{ag.email}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={s.divider} />
        <div style={s.note}>
          Para OUTRA clinica (ex: Lemos), a nomenclatura muda o prefixo: lemos.enfermagem01@gmail.com, lemos.consultor01@gmail.com, etc. Mesma logica, mesmo cargo, email diferente por empresa.
        </div>
      </div>

      {/* SEÇÃO 4: FLUXO GOOGLE CALENDAR */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={{ fontSize: 22 }}>4</span> FLUXO — AGENDA INTERNA PAWARDS + GOOGLE CALENDAR
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={s.flowBox(gold)}>
            <div style={{ fontSize: 13, fontWeight: 700, color: gold }}>PAWARDS</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>Agenda Interna</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Motor de slots, regras, profissionais</div>
          </div>
          <div style={s.connector}>→</div>
          <div style={s.flowBox(greenAccent)}>
            <div style={{ fontSize: 13, fontWeight: 700, color: greenAccent }}>SYNC</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>Sincronizacao automatica</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Ao criar sessao → cria evento</div>
          </div>
          <div style={s.connector}>→</div>
          <div style={s.flowBox(blueAccent)}>
            <div style={{ fontSize: 13, fontWeight: 700, color: blueAccent }}>GOOGLE CALENDAR</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>Complemento para o paciente</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Convite + visualizacao facil</div>
          </div>
          <div style={s.connector}>→</div>
          <div style={s.flowBox(purpleAccent)}>
            <div style={{ fontSize: 13, fontWeight: 700, color: purpleAccent }}>PACIENTE</div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>Recebe convite</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Ve no celular, compartilha</div>
          </div>
        </div>

        <div style={{ ...s.note, marginTop: 16 }}>
          O sistema PAWARDS e a agenda MASTER. O Google Calendar e um COMPLEMENTO — mais facil pro paciente visualizar no celular. Cada clinica (CNPJ) tem seu proprio Gmail de agenda isolado.
        </div>
      </div>

      {/* SEÇÃO 5: SUB-CALENDARIOS POR UNIDADE */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={{ fontSize: 22 }}>5</span> SUB-CALENDARIOS — CADA CLINICA CRIA OS SEUS
        </div>
        <div style={s.note}>Dr. Caio cria o Gmail da agenda. A clinica parceira cria as sub-agendas dentro daquele Calendar conforme sua equipe.</div>

        <div style={{ ...s.row, marginTop: 16 }}>
          <div style={{ ...s.card(gold), flex: "1 1 100%" }}>
            <div style={{ ...s.label, color: gold }}>INSTITUTO PADUA — clinica.padua.agenda@gmail.com</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {[
                "MEDICO - HIGIENOPOLIS",
                "MEDICO - TATUAPE",
                "MEDICO - ONLINE",
                "ENFERMAGEM - BIANCA",
                "ENFERMAGEM - DOMICILIAR",
                "ENFERMAGEM - GUAXUPE",
                "PESSOAL DR. CAIO",
                "VILA FORMOSA (pendente)"
              ].map((cal, i) => (
                <span key={i} style={s.badge(i < 7 ? greenAccent : orangeAccent)}>{cal}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={s.row}>
          <div style={{ ...s.card(tealAccent), flex: "1 1 45%" }}>
            <div style={{ ...s.label, color: tealAccent }}>INSTITUTO LEMOS — pawards.lemos.agenda@gmail.com (a criar)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {[
                "MEDICO - DR. KLEBER LEMOS",
                "ENFERMAGEM - SAO MIGUEL",
              ].map((cal, i) => (
                <span key={i} style={s.badge(blueAccent)}>{cal}</span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 8 }}>Dr. Kleber e equipe criam as sub-agendas que precisarem</div>
          </div>
          <div style={{ ...s.card("#6366F1"), flex: "1 1 45%" }}>
            <div style={{ ...s.label, color: "#6366F1" }}>INSTITUTO BARROS — pawards.barros.agenda@gmail.com (a criar)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {[
                "MEDICO - DR. LUIS BARROS",
                "ENFERMAGEM - CAMPINAS",
              ].map((cal, i) => (
                <span key={i} style={s.badge("#6366F1")}>{cal}</span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#64748B", marginTop: 8 }}>Dr. Luis Barros | CRM 222.222/SP | Rua das Palmeiras 320, Jd Europa, Campinas-SP 13070-100</div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 6: NOMENCLATURA PADRAO */}
      <div style={s.section}>
        <div style={s.sectionTitle}>
          <span style={{ fontSize: 22 }}>6</span> NOMENCLATURA PADRAO — RESUMO
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${gold}` }}>
                {["TIPO", "PADRAO", "INST. PADUA", "INST. LEMOS", "INST. BARROS"].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "8px 12px", color: gold, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Email Geral", "pawards.[clinica].geral@", "pawards.padua.geral@", "pawards.lemos.geral@", "pawards.barros.geral@"],
                ["Email Agenda", "pawards.[clinica].agenda@", "clinica.padua.agenda@ *", "pawards.lemos.agenda@", "pawards.barros.agenda@"],
                ["Enfermagem 01", "[clinica].enfermagem01@", "padua.enfermagem01@", "lemos.enfermagem01@", "barros.enfermagem01@"],
                ["Enfermagem 02", "[clinica].enfermagem02@", "padua.enfermagem02@", "lemos.enfermagem02@", "barros.enfermagem02@"],
                ["Consultor 01", "[clinica].consultor01@", "padua.consultor01@", "lemos.consultor01@", "barros.consultor01@"],
                ["Supervisor 01", "[clinica].supervisor01@", "padua.supervisor01@", "lemos.supervisor01@", "barros.supervisor01@"],
                ["Financeiro 01", "[clinica].financeiro01@", "padua.financeiro01@", "lemos.financeiro01@", "barros.financeiro01@"],
                ["Ouvidoria 01", "[clinica].ouvidoria01@", "padua.ouvidoria01@", "lemos.ouvidoria01@", "barros.ouvidoria01@"],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${sectionBg}` }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: "8px 12px", color: j === 0 ? "#E2E8F0" : "#94A3B8", fontFamily: j > 0 ? "monospace" : "inherit", fontSize: j > 0 ? 12 : 13 }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={s.note}>* clinica.padua.agenda@gmail.com ja esta em uso. Futuras clinicas seguem o padrao pawards.[nome].agenda@gmail.com</div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div style={{ textAlign: "center", marginTop: 32, paddingTop: 16, borderTop: `1px solid ${sectionBg}` }}>
        <div style={{ fontSize: 11, color: "#475569" }}>Developed by Pawards MedCore</div>
      </div>
    </div>
  );
}
