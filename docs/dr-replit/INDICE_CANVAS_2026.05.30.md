# INDICE DO CANVAS — existe no codigo vs esta no board

1. Contexto
1.1 Data: 30/05/2026.
1.2 Objetivo: mapear o que EXISTE como componente no codigo (mockup-sandbox) versus o que esta DESENHADO no board do canvas.
1.3 Regra: este e um indice de leitura, nao reorganiza nada no board.

2. Estado do board (canvas) em 30/05/2026
2.1 O board esta VAZIO: 0 shapes retornados por getCanvasState.
2.2 Consequencia: nenhum mockup esta fixado no board no momento.
2.3 Todos os componentes abaixo sao acessiveis via servidor de preview (rota /__mockup/preview/<arquivo>), nao via shapes no board.

3. Componentes que EXISTEM no codigo (fonte: src/.generated/mockup-components.ts)
3.1 Total: 111 componentes registrados.

3.2 Raiz (mockups/)
3.2.1 GoogleCalendarDemo.
3.2.2 PdfJustificativa, PdfSolicitacao.
3.2.3 PdfVarianteA, PdfVarianteB, PdfVarianteC, PdfVarianteD.
3.2.4 ReceitaVarianteA, ReceitaVarianteB, ReceitaVarianteC, ReceitaVarianteD.

3.3 blueprint-emails
3.3.1 EmailCalendarBlueprint.

3.4 chromes-navegacionais
3.4.1 Chrome1SidebarArvore, Chrome2BreadcrumbTopo, Chrome3HeaderPlaca.
3.4.2 Chrome4RodapeStatus, Chrome5Hibrida3Sinais, Chrome6Premium.
3.4.3 MioloAuditoriaExemplo.
3.4.4 refinados: Chrome7JetBrains, Chrome8IbmPlex, Chrome9SpaceGrotesk, Chrome10Inter, Chrome11SourceSerif.
3.4.5 refinados: Chrome12ZeloCompacto, Chrome13Cardario, Chrome14Espelho, Chrome15Catedral, Chrome16DuploPainel.
3.4.6 refinados: ChromeRefinadoBase.

3.5 cockpits-paciente
3.5.1 Cockpit1Prontuario, Cockpit2EngineFlow, Cockpit3Radar360, Cockpit4Evidencia, Cockpit5Circadiano.
3.5.2 DashFinalPawards, DashboardPrincipal.
3.5.3 DashIntA_Neon, DashIntB_Brilho, DashIntC_Penumbra, DashIntD_Tinta, DashIntE_Carbono, DashIntComparativo.
3.5.4 DashKai1_PulsoUnico, DashKai2_NiveisAtencao, DashKai3_Freshness, DashKai4_ProximaAcao, DashKai5_ModoFoco, DashKaiComparativo.
3.5.5 DashModelo1_CardsAlerta, DashModelo1_Sanfona, DashModelo2_ColunasDensas, DashModelo3_StackChips, DashModelo4_MosaicoBolhas, DashModelo5_BriefingExecutivo.
3.5.6 PawardsClaude1_Relojoaria, PawardsClaude2_Aquario, PawardsClaude3_Pergaminho, PawardsClaude4_Terminal, PawardsClaude5_Vitral.
3.5.7 PenumbraClara1_PapelGold, PenumbraClara2_PaperCiano, PenumbraClara3_PaperLilas.
3.5.8 PenumbraEscura1_NavyGold, PenumbraEscura2_NavyCyan, PenumbraEscura3_NoirLilas.

3.6 consultorio
3.6.1 CockpitMedicoV1.

3.7 craniotomia
3.7.1 ArvoreDossier, CraniotomiaV4, GrafoSinapses, MatrizDensa, TercoTablePanel.

3.8 dashboard-padua
3.8.1 DashboardPadua, FichaCockpitPadua.
3.8.2 VariantA, VariantB, VariantC, VariantD.

3.9 layout-oficial
3.9.1 L2ComE4.

3.10 menu-variants
3.10.1 Accordion, Denso, DualPane, RailPopover.
3.10.2 SupportStyle, SupportStyleBase, SupportStyleE2, SupportStyleE3, SupportStyleE4, SupportStyleE4Scroll.

3.11 pacientes-padua
3.11.1 PacientesPadua.

3.12 padua-atelier
3.12.1 PaduaAtelierPanel.

3.13 pawards-dashboards
3.13.1 ConvencaoColuna, DashboardGlobal, DashboardLocal.

3.14 pawards-showcase
3.14.1 LogoOptions, PdfHeaderFooter, RasHmed, ReceitaLayout, SistemaHeader.
3.14.2 ShieldA, ShieldB, ShieldC, ShieldD.

3.15 prescricao-rapida (foco do pacote FUNIL CATEGORIA)
3.15.1 GpsPadua — o prescritor ativo (modos PILHA / TIMELINE / GPS), agora rotulado GPS CLINICO.
3.15.2 PilhaPorVia, TimelineSessoes — versoes consolidadas dentro do GpsPadua.
3.15.3 CatalogoLateral — variante de catalogo lateral (rejeitada, mantida em codigo).
3.15.4 ComandoTeclado — paleta de comando por teclado.
3.15.5 MotorMensageriaPadua, TeatroMensageriaPadua — mensageria cronobiologica.

3.16 sahara-noir
3.16.1 SaharaNoirPanel.

4. Leitura cruzada (codigo vs board)
4.1 Existe no codigo e NAO esta no board: todos os 111 componentes (board vazio).
4.2 Esta no board e NAO existe no codigo: nenhum.
4.3 Conclusao: o board precisa ser repovoado manualmente quando o Caio quiser revisar visualmente; nada foi perdido no codigo.

5. Como abrir um componente
5.1 Servidor de preview ativo: workflow "artifacts/mockup-sandbox: Component Preview Server".
5.2 Rota de preview isolada por componente: /__mockup/preview/<caminho-do-arquivo>.
5.3 Para fixar no board: criar shape iframe apontando pra rota de preview (nao feito aqui — fora do escopo deste indice).
