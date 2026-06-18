---
name: PENUMBRA face temática (claro/escuro) no clinica-motor
description: Como uma tela do clinica-motor troca entre PENUMBRA Navy Ciano (escuro) e Paper Ciano (claro) sem reescrever conteúdo.
---

# PENUMBRA face temática (claro vs escuro)

A casca `LayoutPawards.tsx` é temática: prop `face?: "escuro" | "claro"` (default
`escuro`). Por dentro usa um FaceContext/useFace + CSS vars inline por face;
o caminho ESCURO default é byte-idêntico ao anterior (`PW_ESCURO = PW`), então
trocar uma tela para clara NÃO regride quem não passa `face`.

Tokens de cada face vivem em módulos com as MESMAS chaves:
- escuro: `pages/craniotomia-shared.ts` (Navy Ciano)
- claro: `pages/penumbra-claro.ts` (Paper Ciano — bg #EEF2F4 / bg2 #F8FBFC /
  bg3 #E2E8EC, border #B8C4CA, ciano #1E7A6E, text #0F1A1F)

**Regra de conversão de uma tela (claro):**
1. trocar o import dos tokens de `craniotomia-shared` → `penumbra-claro`
   (mesma assinatura: `PW, MONO, inputStyle, labelStyle`);
2. passar `face="claro"` no `<Layout>`;
3. suavizar scrims escuros herdados: overlay de modal `rgba(2,10,20,.82)` →
   `rgba(15,26,31,0.45)`; overlay claro de card → `rgba(238,242,244,0.90)`.

**Por quê:** o CEO aprovou Paper Ciano como o ÚNICO padrão claro (Opção A,
18/06/2026). Cores de domínio (PLANO_CORES diamante/ouro, unidadeCor,
STATUS_CONFIG) PERMANECEM como hex próprios — são acento/neon do item, não
violam o token system; não tokenizar.

**Como aplicar:** ao virar mais telas ao claro, usar este mesmo padrão (swap de
import + face). Gabaritos prontos no estilo alvo: `pages/filas/index.tsx`,
`pages/validacao/index.tsx`, `pages/dashboard.tsx`, `pages/agenda/index.tsx`.
Validar por arquivo com `getLatestLspDiagnostics` (nunca tsc inteiro) +
screenshot autenticado via login DEV.
