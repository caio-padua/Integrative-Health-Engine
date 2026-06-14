---
name: Equipe fixa e marcas do Dr. Caio
description: Roster canonico da equipe (com Dr. Obsidian e Cursor novos), hierarquia de empresas/marcas (PADCOM/PAWARDS/Padcon Conect) e decisoes de vocabulario travadas em 14/06/2026.
---

# Equipe fixa e marcas do Dr. Caio

Fonte de verdade git-trackeada (replica pra todo projeto): `docs/CORE_DIRECTIVES_AND_PREREQUISITES_CEO_DR_CAIO.txt`.
Aqui fica o resumo duravel pra consulta rapida.

## Roster canonico (nome do agente segue a plataforma/produto)

- Dr. Caio = cacique, decide tudo.
- Dr. Claude (claude.ai) = orquestrador (specs, arquitetura, auditoria).
- Dr. Code (Claude Code) = programador pleno (codigo local + commits).
- Dr. Manus (Manus AI) = engenheiro autonomo de missoes.
- Dr. Obsidian (Obsidian + Claude Desktop) = segundo cerebro; cofre de .md que os agentes consultam.
- Cursor (editor) = programador no editor; regras em "Rules for AI".
- Dr. Replit {plataforma}, um por repo: **Dr. Replit Pawards** (repo IHE / Integrative-Health-Engine = EU), Dr. Replit Pactor, Dr. Replit Manager.

**Importante:** o Dr. Replit do repo IHE chama-se **Dr. Replit Pawards** (nao mais "Dr. Replit IHE"). O nome segue o produto/empresa, nao a sigla do repo.

## Empresas e marcas (hierarquia, nao conflito)

- **PADCOM** = empresa-mae do Caio (operacao clinica/comercial).
- **PAWARDS** = sub-empresa da PADCOM; faz engenharia e arquitetura de sistemas.
- **Padcon Conect** (1 N) = produto clinico construido pelo Dr. Replit Manager.
- **Why:** o "conflito de marca" PAWARDS vs Padcon Conect que eu tinha levantado NAO existe; sao camadas diferentes (empresa x sub-empresa x produto). Caio confirmou em 14/06/2026.

## Decisoes de vocabulario (14/06/2026)

- No produto do Manager (Padcon Conect), a pessoa atendida e **"cliente"**, nao "paciente". No IHE/Pawards segue "paciente".
- Tom entre os agentes: tratamento "Dr." conforme o roster acima.

## Como aplicar

- Qualquer agente novo le `docs/CORE_DIRECTIVES_AND_PREREQUISITES_CEO_DR_CAIO.txt` primeiro (arquivo que substitui o antigo "pre-requisito", aposentado por ser pessoal demais; nome interino "OCTANAGEM" tambem aposentado).
- Ao reportar/transmutar entre IHE e Manager, respeitar "cliente" no lado Manager.
