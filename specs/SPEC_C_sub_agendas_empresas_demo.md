# SPEC C — Sub-agendas (Camada B) para empresas demo

**Data:** 16/07/2026
**Método:** Paxter Loop

## Objetivo
Criar registros `sub_agendas` para Instituto Integrativo (8), Lemos (9) e Barros (10), formalizando a Camada B operacional e tornando as empresas demo completamente funcionais no sistema de agendamento.

## Contexto técnico (auditado)
- Empresas 8, 9, 10 têm `availability_rules` + `agenda_slots` REAIS (21, 120, 120 slots respectivamente)
- `sub_agendas` tem 0 registros para essas empresas — Camada B existe operacionalmente mas sem vínculo formal
- Profissionais: Dr Caio Padua (ID 1) → Integrativo (8); Dr Kleber Clara Lemos (ID 6) → Lemos (9) e Barros (10)
- `sub_agendas.profissional_id` FK → `usuarios.id`

## Requisitos exatos
1. INSERT em `sub_agendas` para unidade 8 (Integrativo): 1 registro, profissional_id=1, nome="Agenda Médica Integrativo", tipo="MEDICO", modalidade="presencial", sala_ou_local="Consultório Principal", ativa=true
2. INSERT em `sub_agendas` para unidade 9 (Lemos): 1 registro, profissional_id=6, nome="Agenda Médica Lemos", tipo="MEDICO", modalidade="presencial", sala_ou_local="Consultório Dr. Kleber", ativa=true
3. INSERT em `sub_agendas` para unidade 10 (Barros): 1 registro, profissional_id=6, nome="Agenda Médica Barros", tipo="MEDICO", modalidade="presencial", sala_ou_local="Consultório Dr. Kleber", ativa=true
4. Criar tela `/admin/sub-agendas` que lista todas as sub_agendas por empresa com: nome, profissional, modalidade, sala, status (ativa/inativa), contagem de slots associados
5. Rota na App.tsx: `<Route path="/admin/sub-agendas" component={AdminSubAgendasPage} />`
6. Link no menu lateral: "Sub-agendas" no grupo "Admin"

## Casos extremos
- INSERT idempotente: verificar se já existe sub_agenda para a unidade antes de inserir (ON CONFLICT ou SELECT COUNT)
- profissional_id inexistente → não inserir (validar antes)

## Definição de PRONTO
- [ ] `SELECT COUNT(*) FROM sub_agendas WHERE unidade_id IN (8,9,10)` retorna 3
- [ ] Cada registro tem profissional_id correto e ativa=true
- [ ] Tela `/admin/sub-agendas` renderiza com os 3 novos registros visíveis
- [ ] Link "Sub-agendas" visível no menu lateral

## Linhas vermelhas
- NÃO alterar `availability_rules` nem `agenda_slots` existentes
- NÃO criar sub_agendas para unidades arquivadas (IDs 1–7)
