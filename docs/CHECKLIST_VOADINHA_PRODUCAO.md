# ✈️ Checklist Voadinha — Subir produção mínima

**Objetivo**: Caio emite receita + pede exame em produção. Nada mais.

**O que NÃO entra na voadinha**:
- ZapSign / assinatura digital (Wave 10 fica desligada)
- Domínio próprio `pawards.com.br` (usa URL `.replit.app`)
- Zoho Mail (continua só verificação TXT)
- Wave 13 RBAC + 2FA (Caio é único usuário admin)

---

## Passo 1 — Publish (5 min)

1. Abre o Replit (link direto: https://replit.com/@caioregister/Integrative-Health-Engine)
2. Clica em **Publish** (canto superior direito, ao lado de "Republish")
3. Escolhe **Autoscale Deployment** (já configurado em `.replit`)
4. Clica **Deploy**
5. Aguarda build (~3-5 min) — barra de progresso visível
6. Quando aparecer **"Live"** verde, copia a URL `.replit.app`

## Passo 2 — Smoke teste (10 min)

Acessa a URL `.replit.app` no celular e no notebook.

- [ ] Login funciona com `ceo@pawards.com.br` / senha do 1Password
- [ ] Painel CEO carrega sem erro 401
- [ ] Cadastra 1 paciente teste (pode ser você mesmo, marca `is_teste=true`)
- [ ] Cria 1 receita pra esse paciente (PARMAVAULT)
- [ ] Pede 1 exame pra esse paciente
- [ ] PDF da receita gera e baixa

## Passo 3 — Se algo quebrar

Volta no chat aqui e fala "deu erro X". Não tenta debugar sozinho.

---

## ⚠️ Importante (NÃO esquecer)

- Wave 10 ZapSign tá no código mas **NÃO disparar nada de assinatura digital ainda** — falta validar webhook em produção e desligar a flag `ZAPSIGN_WEBHOOK_DEV_BYPASS`
- Receitas reais valem juridicamente sem assinatura ICP-Brasil pelo modelo tradicional (carimbo CRM + assinatura manual escaneada se necessário) — Wave 10 só destrava o fluxo digital quando tudo estiver azeitado
- Não dar acesso a outras pessoas (médicos, secretárias) ainda — Wave 13 RBAC vem antes disso

---

## 🔜 Próximas voadinhas (NÃO agora)

| Quando você quiser | O que destrava |
|--------------------|----------------|
| Domínio `pawards.com.br` | Identidade visual + email institucional |
| Zoho aliases | Comunicação profissional |
| Wave 10 ZapSign produção | Conversão R$ 2.735.636,10 → caixa real |
| Wave 13 RBAC + 2FA | Abrir acesso ao time |

Cada uma é uma voadinha separada. Nada de altitude de cruzeiro.
