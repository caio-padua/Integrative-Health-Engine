# Motor Clínico — Plataforma de Gestão para Clínica Médica Integrativa

## Visão Geral

Sistema SaaS de motor clínico para clínica médica integrativa multiunidades. A anamnese é a porta de entrada que aciona o motor clínico, gerando sugestões de exames, fórmulas, injetáveis (IM/EV), implantes e protocolos. Dashboard TDAH-friendly com filas operacionais, validação médica e módulos de follow-up e financeiro.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Package manager**: pnpm
- **TypeScript**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express 5
- **Banco de dados**: PostgreSQL + Drizzle ORM
- **Validação**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (OpenAPI-first)
- **Charts**: Recharts
- **Roteamento**: Wouter

## Perfis de Acesso

- **enfermeira**: anamnese, pacientes, filas, follow-up
- **validador_enfermeiro**: anamnese, validação, filas, follow-up
- **medico_tecnico**: validação, anamnese, itens terapêuticos, protocolos
- **validador_mestre**: acesso completo (dashboard, validação final, configurações)

## Módulos

1. **Dashboard** — KPIs visuais, filas resumidas, métricas do motor clínico (recharts), atividade recente
2. **Anamnese** — Formulário em etapas (clínico → financeiro → preferências), ativação do motor clínico
3. **Motor Clínico** — Gera sugestões automáticas baseadas em sinais semânticos das respostas
4. **Validação** — Fila médica para validar/rejeitar sugestões
5. **Filas Operacionais** — Anamnese, validação, procedimento, follow-up, pagamento
6. **Pacientes** — Cadastro e histórico
7. **Itens Terapêuticos** — Fórmulas, injetáveis IM/EV, implantes, exames, protocolos com toggles de disponibilidade
8. **Protocolos** — Criação e gestão de protocolos compostos
9. **Follow-up** — Agendamento com recorrência (diário, semanal, quinzenal, mensal, trimestral)
10. **Financeiro** — Pagamentos, confirmação, múltiplas formas de pagamento
11. **Unidades** — Gestão multiunidades
12. **Fluxos de Aprovacao** — Fluxos parametrizados por tipo de procedimento (Consulta/Infusao/Implante) com etapas, responsaveis, condicionais e bypass — dados reais PADCOM V15.2
13. **Permissoes** — Matriz de permissoes por perfil (10 perfis PADCOM V15.2) com flags: editar questionario, validar, bypass, emitir NF, ver outras unidades
14. **Catalogo PADCOM** — Base completa com 688 registros: 305 injetaveis IM, 63 endovenosos, 32 implantes, 54 formulas, 11 protocolos, 49 doencas. 6 abas com busca, agrupamento por eixo, composicao expandivel, codigos PADCOM visiveis. Dados importados automaticamente de Google Sheets V13
15. **Configuracoes** — Usuarios, permissoes

## Estrutura do Projeto

```
artifacts/
  api-server/          # Backend Express 5
    src/routes/        # Rotas: anamnese, motorClinico, filas, followup, financeiro, dashboard...
  clinica-motor/       # Frontend React + Vite
    src/pages/         # Todas as páginas da aplicação
    src/components/    # Componentes reutilizáveis
lib/
  api-spec/            # OpenAPI spec (openapi.yaml)
  api-client-react/    # Hooks React Query gerados
  api-zod/             # Schemas Zod gerados
  db/
    src/schema/        # Schemas Drizzle: unidades, usuarios, pacientes, anamneses, etc.
```

## Comandos Principais

- `pnpm run typecheck` — verificação de tipos completa
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks e schemas do OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar schema no banco
- `pnpm --filter @workspace/api-server run dev` — rodar API localmente
- `pnpm --filter @workspace/clinica-motor run dev` — rodar frontend localmente

## Preparado para Google Sheets

A base de dados está estruturada para receber dados consolidados das planilhas Google Sheets. A camada de API pode ser expandida com rotas de importação que normalizam os dados das sheets para as tabelas existentes.

## Usuários de Demo (Seed)

| Email | Senha | Perfil |
|-------|-------|--------|
| rafael@clinica.com | senha123 | Validador Mestre |
| ana@clinica.com | senha123 | Enfermeira |
| carlos@clinica.com | senha123 | Validador Enfermeiro |
| marina@clinica.com | senha123 | Médico Técnico |
