---
name: Agenda (appointments) vs Sessões (RAS) — duas camadas paralelas
description: Por que agendar pela agenda-motor NÃO gera automaticamente um RAS; o RAS depende de sessoes, não de appointments.
---

# Agenda nova (appointments) x Sessões (RAS) — sem ponte automática

No IHE/Pawards existem DUAS tabelas de "encontro" que não se conversam sozinhas:

- `appointments` — camada de AGENDAMENTO da agenda-motor. `POST /agenda-motor/book`
  insere SÓ aqui (slot → appointment). É o calendário/marcação.
- `sessoes` — camada de EXECUÇÃO clínica (sessão de aplicação/procedimento).
  `POST /sessoes` insere aqui. Campos NOT NULL mínimos: `pacienteId`,
  `dataAgendada`, `horaAgendada` (status/tipoServico/numeroSemana têm default).

**O RAS (`POST /ras`) exige `sessaoId` e lê APENAS de `sessoes`** (join paciente/
profissional/unidade + aplicações de substâncias por `sessaoId`). Ele NÃO conhece
`appointments`.

**Consequência (buraco real):** marcar um paciente pela agenda nova (agenda-motor)
NÃO cria uma `sessao`, então NÃO há como gerar RAS direto desse agendamento. Para
gerar RAS hoje é preciso existir uma `sessao` (criada por outro fluxo / POST /sessoes).

**Why:** confirmado operando ao vivo em 16/06/2026 — book grava só appointments;
RAS gerado a partir de uma `sessao` criada à mão funcionou (PDF de 8 páginas).
Contagens na época: sessoes=39, appointments=152, ras=11.

**How to apply:** se o CEO pedir "agendar → atender → gerar RAS" num fluxo único,
é preciso criar a ponte (book também cria/promove uma `sessao`, ou o RAS aceitar
`appointmentId`). Não assumir que agendar já habilita o RAS.
