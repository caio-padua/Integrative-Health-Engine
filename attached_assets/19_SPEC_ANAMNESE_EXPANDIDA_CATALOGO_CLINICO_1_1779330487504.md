# 19 — SPEC: Anamnese Expandida + Catálogo Clínico Unificado

> **Autor:** Dr. Claude (arquiteto) · **Data:** 2026-05-21
> **Branch:** `feat/dominio-pawards`
> **Depende de:** doc 09 (Catálogo Estratificado) + planilhas Padcom V17/V22/V25
> **Complementa:** doc 18 (Dashboard Cliente) — esta spec alimenta a Aba 1 (Identidade & Quadro)
> **Status:** SPEC PARA IMPLEMENTAÇÃO

---

## 1. VISÃO GERAL

A anamnese do PAWARDS precisa capturar o quadro completo do paciente na
primeira consulta E servir como fonte de dados para o motor PADCOM
(sinapse doença→bloco→exame→fórmula). O paciente pode preencher parte
antes da consulta (link web) e o médico completa/valida no cockpit.

**Princípio fundamental:** a anamnese é SEMPRE a versão expandida.
Não existe "simples" vs "completa" — existe uma anamnese única com
seções colapsáveis. O paciente vê tudo, responde o que sabe, pula o
que não sabe. O médico revisa e completa. Nada fica sem perguntar.

---

## 2. CATÁLOGO UNIFICADO DE PATOLOGIAS (162 entidades)

Fontes consolidadas: planilha Padcom V22 (118 patologias em 10 grupos) +
CSV V4.0 Dr. Manus (49 doenças com blocos motor) + expansão oncológica +
doenças faltantes identificadas na prática integrativa.

### 2.1. CARDÍACAS E VASCULARES (18 entidades)

Ordenadas por prevalência na população brasileira:

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Hipertensão arterial sistêmica (HAS) | ★★★★★ | BLK013 / BLK021 |
| 2 | Dislipidemia | ★★★★ | BLK003 / BLK021 |
| 3 | Arritmia cardíaca | ★★★ | BLK013 |
| 4 | Insuficiência cardíaca | ★★★ | BLK013 |
| 5 | Doença arterial coronariana | ★★★ | BLK013 / BLK005 |
| 6 | Fibrilação atrial | ★★★ | BLK013 |
| 7 | Infarto agudo do miocárdio (histórico) | ★★ | BLK013 / BLK005 |
| 8 | AVC / acidente vascular | ★★ | BLK013 / BLK011 |
| 9 | Trombose venosa profunda | ★★ | BLK011 |
| 10 | Valvulopatia | ★★ | BLK013 |
| 11 | Hipertensão pulmonar | ★ | BLK013 |
| 12 | Angina pectoris | ★★ | BLK013 / BLK005 |
| 13 | Miocardiopatia | ★ | BLK013 |
| 14 | Aortopatia | ★ | BLK013 |
| 15 | Palpitação recorrente | ★★★ | BLK013 |
| 16 | Varizes / insuficiência venosa | ★★★★ | BLK011 |
| 17 | Edema de membros inferiores | ★★★ | BLK014 |
| 18 | Doença arterial periférica | ★★ | BLK013 / BLK005 |

### 2.2. METABÓLICAS E ENDÓCRINAS (22 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Obesidade | ★★★★★ | BLK003 / BLK005 / BLK021 |
| 2 | Resistência insulínica | ★★★★★ | BLK003 / BLK005 / BLK021 |
| 3 | Diabetes tipo 2 | ★★★★ | BLK003 / BLK005 / BLK021 |
| 4 | Pré-diabetes | ★★★★ | BLK003 / BLK005 / BLK021 |
| 5 | Síndrome metabólica | ★★★★ | BLK003 / BLK005 / BLK021 |
| 6 | Hipotireoidismo | ★★★★ | BLK002 |
| 7 | Tireoidite de Hashimoto | ★★★ | BLK002 |
| 8 | Hipertireoidismo | ★★ | BLK002 |
| 9 | Esteatose hepática (gordura no fígado) | ★★★★ | BLK004 |
| 10 | Hiperuricemia / gota | ★★★ | BLK014 |
| 11 | Deficiência de vitamina D | ★★★★★ | BLK017 / BLK021 |
| 12 | Deficiência de vitamina B12 | ★★★★ | BLK017 / BLK021 |
| 13 | Deficiência de ferro / ferritina baixa | ★★★★ | BLK017 / BLK021 |
| 14 | Diabetes tipo 1 | ★★ | BLK003 |
| 15 | Nódulo tireoideano | ★★★ | BLK002 |
| 16 | Insuficiência adrenal | ★ | BLK008 / BLK009 |
| 17 | Síndrome de Cushing | ★ | BLK008 |
| 18 | Hiperaldosteronismo | ★ | BLK008 |
| 19 | Hiperparatireoidismo | ★ | BLK002 |
| 20 | Deficiência de magnésio | ★★★★ | BLK017 / BLK021 |
| 21 | Deficiência de zinco | ★★★ | BLK017 / BLK021 |
| 22 | Deficiência de selênio | ★★ | BLK017 / BLK021 |

### 2.3. AUTOIMUNES E INFLAMATÓRIAS (16 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Tireoidite de Hashimoto | ★★★ | BLK002 / BLK017 |
| 2 | Artrite reumatoide | ★★★ | BLK014 / BLK017 |
| 3 | Lúpus eritematoso sistêmico | ★★ | BLK017 |
| 4 | Psoríase | ★★★ | BLK017 / BLK031 |
| 5 | Vitiligo | ★★ | BLK017 |
| 6 | Doença celíaca | ★★ | BLK010 / BLK017 |
| 7 | Doença de Crohn | ★★ | BLK011 / BLK017 |
| 8 | Retocolite ulcerativa | ★★ | BLK011 / BLK017 |
| 9 | Síndrome de Sjögren | ★ | BLK017 |
| 10 | Esclerose múltipla | ★ | BLK017 / BLK018 |
| 11 | Fibromialgia | ★★★ | BLK014 / BLK024 |
| 12 | Dor crônica | ★★★★ | BLK014 / BLK024 |
| 13 | Artralgia | ★★★ | BLK014 / BLK024 |
| 14 | Espondilite anquilosante | ★★ | BLK014 / BLK017 |
| 15 | Sarcoidose | ★ | BLK017 |
| 16 | Tireoidite pós-parto | ★★ | BLK002 / BLK017 |

### 2.4. ONCOLÓGICAS (20 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Câncer de mama | ★★★★ | BLK013 |
| 2 | Câncer de próstata | ★★★★ | BLK007 / BLK013 |
| 3 | Câncer colorretal | ★★★ | BLK011 / BLK013 |
| 4 | Câncer de pele (melanoma/não-melanoma) | ★★★ | BLK013 |
| 5 | Câncer de pulmão | ★★★ | BLK013 |
| 6 | Câncer de tireoide | ★★★ | BLK002 / BLK013 |
| 7 | Câncer de colo uterino | ★★★ | BLK013 / BLK016 |
| 8 | Câncer de estômago | ★★ | BLK011 / BLK013 |
| 9 | Câncer de fígado (hepatocarcinoma) | ★★ | BLK004 / BLK013 |
| 10 | Câncer de pâncreas | ★ | BLK013 |
| 11 | Câncer de rim | ★★ | BLK014 / BLK013 |
| 12 | Câncer de bexiga | ★★ | BLK014 / BLK013 |
| 13 | Linfoma | ★★ | BLK011 / BLK013 |
| 14 | Leucemia | ★★ | BLK011 / BLK013 |
| 15 | Mieloma múltiplo | ★ | BLK011 / BLK013 |
| 16 | Câncer de esôfago | ★ | BLK013 |
| 17 | Câncer de ovário | ★★ | BLK006 / BLK013 |
| 18 | Câncer de endométrio | ★★ | BLK006 / BLK013 |
| 19 | Câncer de testículo | ★ | BLK006 / BLK013 |
| 20 | Câncer de cabeça e pescoço | ★ | BLK013 |

### 2.5. RESPIRATÓRIAS (8 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Rinite alérgica/crônica | ★★★★★ | BLK001 |
| 2 | Asma | ★★★★ | BLK001 |
| 3 | Apneia obstrutiva do sono | ★★★★ | BLK001 |
| 4 | Sinusite crônica | ★★★ | BLK001 |
| 5 | DPOC | ★★★ | BLK001 |
| 6 | Bronquite crônica | ★★ | BLK001 |
| 7 | Asma alérgica | ★★★ | BLK001 / BLK017 |
| 8 | Pneumonia de repetição | ★★ | BLK001 / BLK016 |

### 2.6. NEUROPSIQUIÁTRICAS E SONO (14 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Ansiedade (TAG) | ★★★★★ | BLK009 / BLK010 |
| 2 | Depressão | ★★★★ | BLK009 / BLK010 |
| 3 | Insônia | ★★★★ | BLK009 |
| 4 | TDAH | ★★★ | BLK008 / BLK009 |
| 5 | Enxaqueca / cefaleia crônica | ★★★★ | BLK008 / BLK010 |
| 6 | Síndrome do pânico | ★★★ | BLK009 |
| 7 | TOC | ★★ | BLK009 |
| 8 | Burnout / esgotamento | ★★★★ | BLK008 / BLK009 |
| 9 | Neuropatia periférica | ★★★ | BLK008 / BLK010 |
| 10 | Alzheimer / demência | ★★ | BLK008 / BLK018 |
| 11 | Parkinson | ★ | BLK008 / BLK018 |
| 12 | Bruxismo | ★★★ | BLK009 |
| 13 | Síndrome das pernas inquietas | ★★ | BLK008 / BLK017 |
| 14 | Transtorno bipolar | ★★ | BLK009 |

### 2.7. GASTRO-HEPÁTICAS E INTESTINAIS (14 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Refluxo gastroesofágico (DRGE) | ★★★★★ | BLK011 |
| 2 | Gastrite | ★★★★ | BLK011 |
| 3 | Constipação crônica | ★★★★ | BLK011 / BLK012 |
| 4 | Distensão abdominal / gases | ★★★★ | BLK011 / BLK012 |
| 5 | Síndrome do intestino irritável | ★★★★ | BLK011 / BLK012 |
| 6 | Disbiose intestinal | ★★★ | BLK011 / BLK012 |
| 7 | Esteatose hepática | ★★★★ | BLK004 |
| 8 | Colelitíase (pedra na vesícula) | ★★★ | BLK004 |
| 9 | Hepatite B | ★★ | BLK004 / BLK016 |
| 10 | Hepatite C | ★★ | BLK004 / BLK016 |
| 11 | Pancreatite | ★★ | BLK004 |
| 12 | Cirrose | ★ | BLK004 |
| 13 | Intolerância à lactose | ★★★★ | BLK010 |
| 14 | Doença do glúten (não celíaca) | ★★★ | BLK010 |

### 2.8. RENAIS E UROLÓGICAS (8 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Litíase renal (pedra nos rins) | ★★★ | BLK014 |
| 2 | Insuficiência renal crônica | ★★ | BLK014 |
| 3 | HPB (hiperplasia prostática benigna) | ★★★ | BLK007 |
| 4 | Infecção urinária de repetição | ★★★ | BLK014 / BLK016 |
| 5 | Cistite intersticial | ★ | BLK014 |
| 6 | Incontinência urinária | ★★★ | BLK014 |
| 7 | Bexiga hiperativa | ★★ | BLK014 |
| 8 | Nefropatia diabética | ★★ | BLK003 / BLK014 |

### 2.9. GINECOLÓGICAS, ANDROLÓGICAS E SEXUAIS (14 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | SOP (síndrome do ovário policístico) | ★★★★ | BLK003 / BLK006 / BLK021 |
| 2 | Endometriose | ★★★ | BLK006 / BLK015 |
| 3 | Menopausa / climatério | ★★★★ | BLK006 / BLK007 |
| 4 | TPM importante | ★★★★ | BLK006 |
| 5 | Adenomiose | ★★ | BLK006 / BLK015 |
| 6 | Mioma uterino | ★★★ | BLK006 |
| 7 | Hipogonadismo masculino | ★★★ | BLK006 / BLK007 |
| 8 | Disfunção erétil | ★★★ | BLK007 |
| 9 | Ejaculação precoce | ★★★ | BLK007 |
| 10 | Baixa libido (ambos os sexos) | ★★★★ | BLK006 / BLK007 |
| 11 | Impotência sexual | ★★★ | BLK007 |
| 12 | Infertilidade | ★★★ | BLK006 / BLK007 |
| 13 | Mastalgia (dor nas mamas) | ★★★ | BLK006 |
| 14 | Tensão pré-menstrual severa | ★★★ | BLK006 |

### 2.10. MUSCULOESQUELÉTICAS (10 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Lombalgia crônica | ★★★★★ | BLK014 / BLK024 |
| 2 | Osteoartrite / artrose | ★★★★ | BLK014 |
| 3 | Osteoporose / osteopenia | ★★★ | BLK014 / BLK017 |
| 4 | Sarcopenia | ★★★ | BLK014 / BLK021 |
| 5 | Hérnia de disco | ★★★ | BLK014 |
| 6 | Tendinite / bursite | ★★★★ | BLK014 |
| 7 | Artrose de joelho | ★★★ | BLK014 |
| 8 | Artrose de quadril | ★★ | BLK014 |
| 9 | Cervicalgia crônica | ★★★ | BLK014 |
| 10 | Lesão de ligamento / menisco | ★★ | BLK014 |

### 2.11. DERMATOLÓGICAS E ESTÉTICAS (8 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Acne | ★★★★ | BLK031 |
| 2 | Alopecia (queda de cabelo) | ★★★★ | BLK025 / BLK031 |
| 3 | Melasma | ★★★ | BLK031 |
| 4 | Lipedema | ★★ | BLK024 / BLK031 |
| 5 | Dermatite atópica | ★★★ | BLK031 |
| 6 | Celulite (lipodistrofia) | ★★★★ | BLK031 |
| 7 | Rosácea | ★★ | BLK031 |
| 8 | Pele envelhecida / flacidez | ★★★ | BLK031 |

### 2.12. HÁBITOS E DEPENDÊNCIAS (6 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Tabagismo | ★★★★ | BLK001 / BLK020 |
| 2 | Etilismo / alcoolismo | ★★★ | BLK004 / BLK020 |
| 3 | Dependência de benzodiazepínicos | ★★★ | BLK009 |
| 4 | Uso crônico de opioides | ★★ | BLK009 |
| 5 | Sedentarismo | ★★★★★ | BLK021 |
| 6 | Compulsão alimentar | ★★★ | BLK003 / BLK009 |

### 2.13. NUTRICIONAIS E MITOCONDRIAIS (6 entidades)

| # | Patologia | Prevalência | Bloco Motor |
|--:|-----------|:-----------:|-------------|
| 1 | Fadiga crônica | ★★★★ | BLK016 / BLK021 |
| 2 | Baixa energia persistente | ★★★★ | BLK016 / BLK021 |
| 3 | Anemia ferropriva | ★★★ | BLK017 / BLK021 |
| 4 | Anemia megaloblástica | ★★ | BLK017 |
| 5 | Desnutrição proteico-calórica | ★ | BLK017 |
| 6 | Intoxicação por metais pesados | ★ | BLK020 |

**TOTAL: 162 patologias catalogadas em 13 grupos.**

---

## 3. CATÁLOGO UNIFICADO DE CIRURGIAS (72 entidades)

### Organizadas em 8 grupos:

**GINECOLÓGICAS (10):** Histerectomia total, Histerectomia parcial,
Miomectomia, Ooforectomia, Cesariana, Laqueadura, Curetagem,
Conização, Laparoscopia ginecológica, Outra livre.

**ABDOMINAIS (10):** Colecistectomia, Apendicectomia, Herniorrafia
(inguinal/umbilical), Gastroplastia (bariátrica), Colectomia,
Gastrectomia, Fundoplicatura (refluxo), Esplenectomia,
Laparoscopia diagnóstica, Outra livre.

**ENDÓCRINAS (6):** Tireoidectomia parcial, Tireoidectomia total,
Paratireoidectomia, Adrenalectomia, Pancreatectomia, Outra livre.

**CARDÍACAS (8):** Stent coronário, Revascularização do miocárdio,
Troca valvar, Implante de marcapasso, Ablação, Angioplastia,
Endarterectomia carotídea, Outra livre.

**ORTOPÉDICAS (10):** Fratura de fêmur (fixação), Fratura de bacia,
Fratura de membro superior, Cirurgia de coluna (artrodese/discectomia),
Artroplastia de joelho, Artroplastia de quadril, Artroscopia,
Reconstrução de ligamento, Correção de hérnia de disco, Outra livre.

**ESTÉTICAS (8):** Lipoaspiração, Abdominoplastia, Rinoplastia,
Mamoplastia (aumento/redução), Blefaroplastia, Ritidoplastia (face),
Otoplastia, Outra livre.

**UROLÓGICAS (8):** RTU de próstata, Nefrolitotripsia, Vasectomia,
Prostatectomia radical, Cistoscopia cirúrgica, Nefrectomia,
Circuncisão, Outra livre.

**OUTRAS (12):** Amigdalectomia, Catarata, Septoplastia,
Hemorroidectomia, Implante dentário, Cirurgia bariátrica revisional,
Transplante (especificar órgão), Biópsia cirúrgica, Drenagem de
abscesso, Traqueostomia, Implante coclear, Outra livre.

---

## 4. SEÇÕES DA ANAMNESE (ordem de apresentação)

A anamnese tem 8 seções, sempre nesta ordem. Cada seção é colapsável
— o paciente vê o título e a contagem de respostas. Ao abrir, vê as
opções organizadas por prevalência.

### Seção 1 — DADOS PESSOAIS E OBJETIVO
- Nome, data nascimento, sexo, CPF, telefone, email, cidade, UF
- Objetivo principal (texto livre + tags sugeridas: sono, energia,
  foco, emagrecimento, hipertrofia, performance, longevidade,
  fertilidade, menopausa, dor)
- Peso atual, altura, circunferência abdominal
- Profissão, nível de estresse (0-10)

### Seção 2 — PATOLOGIAS DIAGNOSTICADAS
- As 162 patologias dos 13 grupos
- Cada patologia tem 3 estados: NÃO TENHO (default), DIAGNOSTICADA, POSSÍVEL
- Para DIAGNOSTICADA: campos opcionais de data do diagnóstico e médico que diagnosticou
- Campo de busca autocomplete no topo (digita "tir" → filtra Tireoide, Tireoidite, etc.)
- Botão "+" ao lado de cada grupo para adicionar doença que não está na lista

### Seção 3 — CIRURGIAS REALIZADAS
- As 72 cirurgias dos 8 grupos
- Cada cirurgia: SIM/NÃO + data + hospital + houve complicação (S/N) + obs
- Mesmo padrão de busca autocomplete

### Seção 4 — HISTÓRICO ONCOLÓGICO (seção dedicada)
- "Você já teve ou tem algum tipo de câncer?" SIM/NÃO
- Se SIM: seleção das 20 neoplasias catalogadas + campos:
  - Tipo, data diagnóstico, estadiamento (I/II/III/IV ou desconhecido)
  - Tratamento realizado: cirurgia / quimioterapia / radioterapia / imunoterapia / hormonioterapia
  - Em remissão? SIM / NÃO / EM TRATAMENTO
  - Oncologista atual (nome + contato)
- "Histórico familiar de câncer?" → mesma lista, selecionar parentesco (pai/mãe/irmão/avô/avó/tio)

### Seção 5 — MEDICAMENTOS ALOPÁTICOS EM USO
- Lista dinâmica: [Nome do medicamento] [Dosagem] [Posologia] [Há quanto tempo usa]
- Autocomplete com dicionário de medicamentos (seed: top 200 medicamentos prescritos no Brasil)
- Categorização automática: anti-hipertensivo / hipoglicemiante / hipolipemiante / ansiolítico / antidepressivo / hormônio / analgésico / outro
- Campo "Quer reduzir ou parar algum desses?" (SIM/NÃO por medicamento) → alimenta REVO

### Seção 6 — SINTOMAS ATUAIS (base do Pulso Diário)
- 10 indicadores com slider 0-10: sono, energia, disposição, foco,
  concentração, libido, força, humor, dor, ansiedade
- Atividade física: frequência semanal (0-7) + tipo (musculação / aeróbico / funcional / yoga / outro)
- Intestino: frequência diária + consistência (Bristol 1-7)
- Alimentação: qualidade percebida 0-10 + restrições (vegetariano / vegano / low carb / cetogênica / sem glúten / sem lactose)

### Seção 7 — HISTÓRICO FAMILIAR
- Para cada parente (pai, mãe, avô paterno, avó paterna, avô materno, avó matterna, irmãos):
  - Vivo? SIM/NÃO (se NÃO: causa e idade do óbito)
  - Doenças conhecidas: mesma lista de patologias, com seleção rápida
- Doenças frequentes na família (checkbox rápido): HAS, diabetes, câncer, AVC, infarto, Alzheimer, depressão, obesidade

### Seção 8 — ALERGIAS E INTOLERÂNCIAS
- Alergias medicamentosas: lista + gravidade (leve / moderada / grave / anafilaxia)
- Alergias alimentares: lista
- Alergias ambientais: poeira, ácaros, pólen, animais, etc.
- Intolerâncias: lactose, glúten, frutose, histamina

---

## 5. UX NEURODIVERGENT-FRIENDLY (TDAH + Asperger + TOC)

### 5.1. Princípios de design

**Para TDAH:** reduzir atrito, eliminar steps longos, gamificar progresso.
O paciente precisa ver que está avançando. Formulário infinito mata engajamento.

**Para Asperger grau 1:** clareza absoluta. Sem ambiguidade. Cada pergunta
com uma resposta esperada óbvia. Explicação breve do porquê está sendo
perguntada. Sem linguagem figurada.

**Para TOC:** previsibilidade, ordem visual, completude verificável.
Indicador de "está tudo preenchido" para cada seção.

### 5.2. Componentes de interação

**ROLLER DE CATEGORIAS (não dropdown tradicional):**

```
┌─────────────────────────────────────────────────┐
│ 🫀 CARDÍACAS ← swipe → METABÓLICAS 🧪         │
│                                                  │
│ ┌─────────────────────────┐                      │
│ │ ☐ Hipertensão arterial  │ ← mais comum no topo │
│ │ ☐ Arritmia cardíaca     │                      │
│ │ ☐ Insuf. cardíaca       │                      │
│ │ ☐ Doença coronariana    │                      │
│ │ ☐ Fibrilação atrial     │                      │
│ │    ...                  │                      │
│ │ [+ Buscar outra doença] │ ← autocomplete       │
│ └─────────────────────────┘                      │
│                                                  │
│  Selecionadas: 2 de 18  ✓✓                      │
└─────────────────────────────────────────────────┘
```

O paciente faz swipe horizontal entre categorias (como stories do Instagram).
Dentro de cada categoria, as doenças aparecem por ordem de prevalência.
Um tap marca DIAGNOSTICADA (chip azul), dois taps marca POSSÍVEL
(chip amarelo), três taps desmarca. Para quem prefere teclado: [D] diagnosticada, [P] possível, [N] não tenho.

**AUTOCOMPLETE INTELIGENTE:**

O campo de busca no topo da seção aceita:
- Nome da doença ("diabetes" → filtra 3 resultados)
- Nome popular ("açúcar no sangue" → mostra diabetes)
- Sintoma relacionado ("cansaço" → mostra fadiga crônica, hipotireoidismo, anemia)
- Sigla ("HAS" → hipertensão arterial sistêmica)

Implementação: tabela `patologias_sinonimos` com aliases populares.

**BARRA DE PROGRESSO GAMIFICADA:**

```
┌────────────────────────────────────────────┐
│ Anamnese 67% completa                      │
│ ████████████████████░░░░░░░░░░  5/8 seções │
│                                            │
│ ✅ Dados pessoais    ✅ Patologias          │
│ ✅ Cirurgias         ✅ Oncológico          │
│ ✅ Medicamentos      ⬜ Sintomas            │
│ ⬜ Hist. familiar    ⬜ Alergias            │
└────────────────────────────────────────────┘
```

Cada seção completa muda o ícone para ✅ com animação sutil.
Mensagem no final: "Parabéns! Anamnese completa. Dr. Caio vai revisar
na consulta."

**CHIP DE STATUS POR PATOLOGIA:**

```
☐ Não tenho          → cinza, estado default
🔵 Diagnosticada     → azul, com data opcional
🟡 Possível/suspeita → amarelo
```

O médico no cockpit pode alterar de POSSÍVEL para DIAGNOSTICADA
após confirmar na consulta.

### 5.3. Atalhos de preenchimento rápido

- "Não tenho nenhuma doença neste grupo" → botão no rodapé de cada categoria
  que marca todo o grupo como NÃO e avança para o próximo
- "Copiar do prontuário anterior" → importa de anamnese prévia se existir
- "Preencher a partir do Support Clinic" → futuro, integração com o sistema atual

---

## 6. MEDICAMENTOS ALOPÁTICOS — SEED INICIAL (Top 50)

Seed para autocomplete, ordenado por frequência de prescrição no Brasil:

**Anti-hipertensivos:** Losartana, Enalapril, Anlodipino, Atenolol,
Hidroclorotiazida, Metoprolol, Valsartana, Propranolol, Captopril, Espironolactona.

**Hipoglicemiantes:** Metformina, Glibenclamida, Gliclazida, Dapagliflozina,
Empagliflozina, Sitagliptina, Insulina NPH, Insulina Glargina, Liraglutida,
Semaglutida, Tirzepatida.

**Hipolipemiantes:** Sinvastatina, Rosuvastatina, Atorvastatina, Ezetimiba.

**Tireoide:** Levotiroxina, Metimazol.

**Psiquiátricos:** Escitalopram, Sertralina, Fluoxetina, Venlafaxina,
Duloxetina, Bupropiona, Lisdexanfetamina, Metilfenidato, Clonazepam,
Diazepam, Alprazolam, Zolpidem, Quetiapina, Lítio.

**Analgésicos/anti-inflamatórios:** Dipirona, Paracetamol, Ibuprofeno,
Nimesulida, Pregabalina, Gabapentina.

**Outros:** Omeprazol, Pantoprazol, AAS, Clopidogrel, Varfarina,
Levonorgestrel, Desogestrel.

---

## 7. COMO ISSO ALIMENTA O SISTEMA

```
ANAMNESE PREENCHIDA
    │
    ├─→ Aba 1 "IDENTIDADE & QUADRO" do Dashboard (snapshot fixo)
    │
    ├─→ Motor PADCOM (sinapse doença→bloco→exame→fórmula)
    │   usa patologia.bloco_motor para sugerir pedidos de exame
    │
    ├─→ REVO (medicamentos alopáticos → início da trajetória integrativa)
    │   "quer reduzir?" = flag que ativa monitoramento de desmame
    │
    ├─→ Pulso Diário (sintomas da seção 6 viram baseline T0)
    │   primeira entrada do tracking com origem=ANAMNESE
    │
    └─→ Histórico familiar → score de risco oncológico/cardiovascular
        (futura Wave de risk scoring)
```

---

## ASSINATURA

Dr. Claude · 21/mai/2026
Spec pronta para implementação pelo Dr. Replit.
Catálogo de 162 patologias + 72 cirurgias + 50 medicamentos + UX
neurodivergent-friendly com roller de categorias, autocomplete
inteligente, e barra de progresso gamificada.
