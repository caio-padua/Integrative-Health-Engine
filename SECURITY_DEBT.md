# SECURITY_DEBT.md

## Status: DÍVIDA TÉCNICA CONTROLADA

### O que está provisório

Este sistema opera hoje com autenticação por **token administrativo
compartilhado** (`x-admin-token`) validado pelo middleware
`requireAdminToken`. É autenticação de perímetro, não de usuário.

Rotas sensíveis protegidas pelo token hoje:
- POST/PUT/DELETE/PATCH em `/api/*`
- CRUD de credenciais de gateway de pagamento
- CRUD de credenciais de NFe
- Emissão, cancelamento, edição e exclusão de NFe
- Disparo de eventos cobráveis
- Provisionamento de Drive

### Por que é aceitável agora

1. Acesso ao sistema é restrito ao Instituto Pádua (uma clínica)
2. Usuários são conhecidos e confiáveis
3. Não há clientes externos
4. As 4 integrações externas (gateways + NFe) estão congeladas
   aguardando ativação — nenhuma cobrança real está sendo disparada

### Por que é inaceitável depois

No minuto que um segundo tenant (cliente externo) receber acesso,
`x-admin-token` compartilhado vira vazamento estrutural:
- Token único compartilhado é replay-ável
- Não há rastro de quem fez cada ação
- Não há revogação por usuário
- Não há diferenciação de perfil (admin vs operador vs paciente)

### Compromisso formal

**JWT real é pré-requisito bloqueante para qualquer uma destas ações:**

- [ ] Abrir acesso do sistema a qualquer clínica além do Instituto Pádua
- [ ] Ativar keys de produção nos gateways de pagamento
- [ ] Ativar certificado A1 real pra emissão de NFe real
- [ ] Publicar URL do sistema fora de `*.replit.dev`
- [ ] Qualquer marketing externo mencionando "segurança enterprise"

### Quem revisa

- **Dr. Caio** (dono do sistema): revisa e assina liberação de produção
- **Dr. Replit** (cirurgião): implementa JWT e valida testes E2E
- **Dr. Claude** (orquestrador): valida que JWT está cravado antes de
  aprovar qualquer passo da fase de captação (marketplace, Fase B real,
  cliente externo)

### Deadline interno

JWT deve estar implementado e em produção **até o fim do Passo 3 do
roadmap PADCON 2.0** (~2 dias de trabalho a partir do início do sprint
pós-⌘K). Este documento é removido do repo quando JWT estiver
em produção.

### Assinaturas

_Caio_: _______________________________ Data: ___________
_Replit_: _____________________________ Data: ___________
_Claude_: _____________________________ Data: ___________
