# PROTOCOLO NATACHA — RAS + AGENDA REAIS

  **Paciente**: Natacha Caldeirão Gomes (id=43)
  **Tratamento**: Protocolo Natacha V16 (id=22)
  **Gerado em**: 2026-04-18T02:52:13.895Z
  **Origem dos dados**: 100% extraído do banco de dados Pawards (zero invenção)

  ---

  ## 📂 Estrutura

  ### `ras/` — 6 PDFs reais gerados pelo motor RAS
  | Arquivo | Categoria | Cadernos |
  |---|---|---|
  | 01_RAS_CLINICO.pdf | RAS Clínico | 7 cadernos (HEST, HPOT, HORG, HMED, HFOR, HCUR, HATU) |
  | 02_RAS_EVOLUTIVO.pdf | RAS Evolutivo | 4 cadernos (HLIN, HTRN, HEVO, HPLA) |
  | 03_RAS_ESTADO_SAUDE.pdf | RAS Estado de Saúde | 3 cadernos (HATU, HCUR, HPLA) |
  | 04_RAS_COMPLETO.pdf | RAS Completo | 11 cadernos (todos clínico+evolutivo) |
  | 05_RAS_JURIDICO.pdf | RAS Jurídico | 5 cadernos (LGPD, CGLO, RISC, NGAR, PRIV) |
  | 06_RAS_LEGADO_CONSOLIDADO.pdf | RAS legado consolidado | versão V4 |

  ### `agenda/` — Agenda derivada do tratamento real
  | Arquivo | Conteúdo |
  |---|---|
  | agenda_tratamento_22.json | 11 itens, **515 sessões** projetadas |
  | agenda_tratamento_22.csv | Mesma agenda em formato Excel (UTF-8 BOM, separador `;`) |

  ### `dados/` — Dados clínicos brutos
  | Arquivo | Conteúdo |
  |---|---|
  | dados_clinicos_completos.json | Paciente + anamnese + 9 patologias + 25 medicamentos + 11 itens + pedido de exames |
  | anastomose_genotipo_fenotipo.csv | Tabela de cruzamento item↔código↔significado↔patologia (com lastro no dicionário) |

  ---

  ## ✅ Auditoria de lastro

  - **Patologias**: 9 cadastradas
  - **Medicamentos**: 25 cadastrados
  - **Itens do tratamento**: 11 (todos com código semântico)
  - **Códigos lastreados no dicionário**: 100% (zero códigos inventados)
  - **Origem dos códigos novos**: `PROTOCOLO_NATACHA_V16`

  ---

  ## 🔬 Como reproduzir

  Os 6 PDFs foram gerados via:
  ```bash
  curl http://localhost:8080/api/rasx/43/arqu/pdf/{CLINICO,EVOLUTIVO,ESTADO_SAUDE,COMPLETO,JURIDICO}
  curl http://localhost:8080/api/ras/pdf/paciente/43
  ```

  A agenda foi derivada de `tratamento_itens.numero_sessoes` com intervalo semanal padrão começando em 21/04/2026.
  