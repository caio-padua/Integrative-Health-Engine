# IMPLEMENTAÇÃO: SISTEMA DE CHECK-IN E ACOMPANHAMENTO LONGITUDINAL
## PADCOM V22 - Integração com Replit

**Data:** 11 de Abril de 2026  
**Status:** Pronto para Implementação  
**Destinatário:** Replit Agent + Médico Caio Pádua

---

## SUMÁRIO EXECUTIVO

Você quer transformar o sistema de anamnese de um **formulário respondido do zero** para um **banco de dados clínico estruturado com check-in**. O paciente não responde perguntas abertas — ele marca o que tem (doenças, cirurgias, cânceres, etc.). O sistema gera **cards mensais de follow-up** para Admin, Enfermeira e Consultor, criando um **histórico longitudinal completo** que você (médico principal) e seus assistentes consultam para correlacionar com o paciente.

**Arquitetura:**
- **INPUT:** Check-in de patologias pré-estruturadas (Doenças, Cirurgias, Cânceres, Atividade Física, Psicologia, Nutrição)
- **ENGINE:** Motor de acompanhamento que gera cards mensais e rastreia mudanças
- **OUTPUT:** Dashboard com histórico, gráficos de evolução, timeline do paciente, cards de follow-up

---

## FASE 1: ESTRUTURA DE DADOS

### 1.1 Tabelas Novas Necessárias

#### Tabela: `patologias_master`
Banco de dados de todas as doenças possíveis com metadados.

```sql
CREATE TABLE patologias_master (
  id SERIAL PRIMARY KEY,
  codigo_padcom VARCHAR(20) UNIQUE NOT NULL, -- Ex: "CARD_HASA", "META_DIAB"
  nome VARCHAR(255) NOT NULL,
  grupo VARCHAR(50) NOT NULL, -- CARDIACAS, METABOLICAS, ENDOCRINAS, AUTOIMUNES, ONCOLOGICAS, ORTOPEDICAS
  descricao TEXT,
  medicacoes_sugeridas TEXT[], -- Array de medicações padrão
  exames_relacionados TEXT[], -- Array de códigos de exames
  intensidade_0_5 BOOLEAN DEFAULT true, -- Se permite escala 0-5
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);
```

**Dados iniciais (da V22 - PATOLOGIAS):**
- CARDIACAS: HAS, Arritmia, Angina, Infarto, AVC, Insuficiência Cardíaca, etc.
- METABOLICAS: Diabetes T1/T2, Pré-diabetes, Resistência Insulínica, Dislipidemia, Obesidade, Síndrome Metabólica
- ENDOCRINAS: Hipotireoidismo, Hipertireoidismo, Hashimoto, Síndrome de Cushing
- AUTOIMUNES: Lúpus, Artrite Reumatoide, Esclerose Múltipla, Tireoidite Autoimune
- ONCOLOGICAS: Câncer de Mama, Próstata, Pulmão, Colón, Pele, Ovário, etc.
- ORTOPEDICAS: Artrose, Osteoporose, Hérnia de Disco, Tendinite

#### Tabela: `cirurgias_master`
Banco de dados de cirurgias com categorias.

```sql
CREATE TABLE cirurgias_master (
  id SERIAL PRIMARY KEY,
  codigo_padcom VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(50) NOT NULL, -- ORTOPEDICA, GINECOLOGICA, ESTETICA, CARDIACA, DIGESTIVA, ONCOLOGICA, NEUROLOGIA
  descricao TEXT,
  data_cirurgia DATE,
  complicacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

**Categorias (da V22 - CIRURGIAS):**
- ORTOPÉDICAS: Artroscopia, Prótese de Joelho, Prótese de Quadril, Fusão Vertebral, Meniscectomia
- GINECOLÓGICAS: Histerectomia, Miomectomia, Laparoscopia, Cesariana, Ooforectomia
- ESTÉTICAS: Lipoaspiração, Abdominoplastia, Blefaroplastia, Lifting, Implante de Silicone
- CARDÍACAS: Bypass, Angioplastia, Transplante
- DIGESTIVAS: Gastrectomia, Colecistectomia, Apendicectomia, Hernioplastia
- ONCOLÓGICAS: Mastectomia, Prostatectomia, Colectomia, Tiroidectomia
- NEUROLÓGICAS: Craniotomia, Discectomia

#### Tabela: `canceres_master`
Banco de dados de cânceres com estágios.

```sql
CREATE TABLE canceres_master (
  id SERIAL PRIMARY KEY,
  codigo_padcom VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  localizacao VARCHAR(100) NOT NULL, -- Mama, Próstata, Pulmão, Colón, Pele, Ovário, etc.
  estagio VARCHAR(10), -- 0, I, II, III, IV
  ano_diagnostico YEAR,
  tratamento_realizado TEXT,
  remissao BOOLEAN,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);
```

#### Tabela: `paciente_patologias_checkin`
Check-in do paciente com patologias (muitos-para-muitos com histórico).

```sql
CREATE TABLE paciente_patologias_checkin (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
  patologia_id INTEGER NOT NULL REFERENCES patologias_master(id),
  intensidade_0_5 INTEGER CHECK (intensidade_0_5 BETWEEN 0 AND 5),
  data_diagnostico DATE,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(paciente_id, patologia_id)
);
```

#### Tabela: `paciente_cirurgias_checkin`
Check-in do paciente com cirurgias.

```sql
CREATE TABLE paciente_cirurgias_checkin (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
  cirurgia_id INTEGER NOT NULL REFERENCES cirurgias_master(id),
  data_cirurgia DATE,
  complicacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(paciente_id, cirurgia_id)
);
```

#### Tabela: `paciente_canceres_checkin`
Check-in do paciente com histórico de cânceres.

```sql
CREATE TABLE paciente_canceres_checkin (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
  cancer_id INTEGER NOT NULL REFERENCES canceres_master(id),
  estagio_diagnostico VARCHAR(10),
  ano_diagnostico YEAR,
  tratamento_realizado TEXT,
  em_remissao BOOLEAN,
  criado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(paciente_id, cancer_id)
);
```

#### Tabela: `acompanhamento_cards_mensais`
Cards de follow-up gerados mensalmente.

```sql
CREATE TABLE acompanhamento_cards_mensais (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
  mes_ano DATE NOT NULL, -- Primeiro dia do mês
  tipo_card VARCHAR(50) NOT NULL, -- ADMIN, ENFERMEIRA, CONSULTOR
  responsavel_id INTEGER REFERENCES usuarios(id),
  perguntas_sugeridas JSONB, -- Array de perguntas baseadas no histórico
  respostas_recebidas JSONB,
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, respondido, validado
  respondido_em TIMESTAMP,
  respondido_por_id INTEGER REFERENCES usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(paciente_id, mes_ano, tipo_card)
);
```

#### Tabela: `historico_mudancas_patologias`
Rastreia mudanças no histórico do paciente.

```sql
CREATE TABLE historico_mudancas_patologias (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
  patologia_id INTEGER NOT NULL REFERENCES patologias_master(id),
  tipo_mudanca VARCHAR(50) NOT NULL, -- ADICIONADA, REMOVIDA, INTENSIDADE_MUDOU, REMISSAO
  valor_anterior VARCHAR(255),
  valor_novo VARCHAR(255),
  data_mudanca TIMESTAMP DEFAULT NOW(),
  criado_por_id INTEGER REFERENCES usuarios(id)
);
```

---

## FASE 2: FLUXO DE CHECK-IN

### 2.1 Rota: POST `/anamnese/checkin/patologias`

**Objetivo:** Paciente marca as doenças que tem (com intensidade 0-5 se aplicável).

```typescript
router.post("/anamnese/checkin/patologias", async (req, res): Promise<void> => {
  const parsed = CheckinPatologiasBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { pacienteId, patologias } = parsed.data;
  // patologias = [
  //   { patologiaId: 1, intensidade: 3, observacoes: "..." },
  //   { patologiaId: 5, intensidade: 2, observacoes: "..." }
  // ]

  try {
    const resultado = await db.transaction(async (tx) => {
      // 1. Limpar check-ins anteriores (ou apenas marcar como inativos)
      await tx
        .update(pacientePatologiasCheckinTable)
        .set({ ativo: false })
        .where(eq(pacientePatologiasCheckinTable.pacienteId, pacienteId));

      // 2. Inserir novos check-ins
      const novoCheckin = await tx
        .insert(pacientePatologiasCheckinTable)
        .values(
          patologias.map(p => ({
            pacienteId,
            patologiaId: p.patologiaId,
            intensidade0_5: p.intensidade,
            observacoes: p.observacoes,
            ativo: true,
            criadoEm: new Date(),
            atualizadoEm: new Date()
          }))
        )
        .returning();

      // 3. Rastrear mudanças
      for (const p of patologias) {
        await tx.insert(historico_mudancas_patologiasTable).values({
          pacienteId,
          patologiaId: p.patologiaId,
          tipoMudanca: "CHECKIN_ATUALIZADO",
          valorNovo: `Intensidade: ${p.intensidade}`,
          dataMudanca: new Date()
        });
      }

      return novoCheckin;
    });

    res.json({
      sucesso: true,
      mensagem: `${resultado.length} patologias registradas`,
      dados: resultado
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar check-in" });
  }
});
```

### 2.2 Rota: POST `/anamnese/checkin/cirurgias`

```typescript
router.post("/anamnese/checkin/cirurgias", async (req, res): Promise<void> => {
  const parsed = CheckinCirugiasBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { pacienteId, cirurgias } = parsed.data;
  // cirurgias = [
  //   { cirurgiaId: 1, dataCirurgia: "2020-05-15", complicacoes: "..." },
  //   { cirurgiaId: 3, dataCirurgia: "2018-10-22", complicacoes: null }
  // ]

  const novoCheckin = await db
    .insert(pacienteCirugiasCheckinTable)
    .values(
      cirurgias.map(c => ({
        pacienteId,
        cirurgiaId: c.cirurgiaId,
        dataCirurgia: c.dataCirurgia,
        complicacoes: c.complicacoes,
        criadoEm: new Date()
      }))
    )
    .returning();

  res.json({
    sucesso: true,
    mensagem: `${novoCheckin.length} cirurgias registradas`,
    dados: novoCheckin
  });
});
```

### 2.3 Rota: POST `/anamnese/checkin/canceres`

```typescript
router.post("/anamnese/checkin/canceres", async (req, res): Promise<void> => {
  const parsed = CheckinCanceresBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { pacienteId, canceres } = parsed.data;
  // canceres = [
  //   { cancerId: 1, estagioDiagnostico: "II", anoDiagnostico: 2015, emRemissao: true },
  //   { cancerId: 5, estagioDiagnostico: "I", anoDiagnostico: 2018, emRemissao: true }
  // ]

  const novoCheckin = await db
    .insert(pacienteCanceresCheckinTable)
    .values(
      canceres.map(c => ({
        pacienteId,
        cancerId: c.cancerId,
        estagioDiagnostico: c.estagioDiagnostico,
        anoDiagnostico: c.anoDiagnostico,
        emRemissao: c.emRemissao,
        criadoEm: new Date()
      }))
    )
    .returning();

  res.json({
    sucesso: true,
    mensagem: `${novoCheckin.length} cânceres registrados`,
    dados: novoCheckin
  });
});
```

---

## FASE 3: GERAÇÃO DE CARDS MENSAIS

### 3.1 Job: Gerar Cards Mensais (Executar 1º dia de cada mês)

```typescript
async function gerarCardsDoMes(pacienteId: number, mesAno: Date) {
  const admin = await db.query.usuariosTable.findFirst({
    where: (u) => eq(u.role, "ADMIN")
  });
  const enfermeira = await db.query.usuariosTable.findFirst({
    where: (u) => eq(u.role, "ENFERMEIRA")
  });
  const consultor = await db.query.usuariosTable.findFirst({
    where: (u) => eq(u.role, "CONSULTOR")
  });

  // 1. Buscar histórico do paciente
  const patologias = await db
    .select()
    .from(pacientePatologiasCheckinTable)
    .where(
      and(
        eq(pacientePatologiasCheckinTable.pacienteId, pacienteId),
        eq(pacientePatologiasCheckinTable.ativo, true)
      )
    );

  const cirurgias = await db
    .select()
    .from(pacienteCirugiasCheckinTable)
    .where(eq(pacienteCirugiasCheckinTable.pacienteId, pacienteId));

  // 2. Gerar perguntas de follow-up baseadas no histórico
  const perguntasAdmin = gerarPerguntasAdmin(patologias, cirurgias);
  const perguntasEnfermeira = gerarPerguntasEnfermeira(patologias);
  const perguntasConsultor = gerarPerguntasConsultor(patologias);

  // 3. Criar cards
  await db.insert(acompanhamentoCardsMensaisTable).values([
    {
      pacienteId,
      mesAno,
      tipoCard: "ADMIN",
      responsavelId: admin?.id,
      perguntasSugeridas: perguntasAdmin,
      status: "pendente",
      criadoEm: new Date()
    },
    {
      pacienteId,
      mesAno,
      tipoCard: "ENFERMEIRA",
      responsavelId: enfermeira?.id,
      perguntasSugeridas: perguntasEnfermeira,
      status: "pendente",
      criadoEm: new Date()
    },
    {
      pacienteId,
      mesAno,
      tipoCard: "CONSULTOR",
      responsavelId: consultor?.id,
      perguntasSugeridas: perguntasConsultor,
      status: "pendente",
      criadoEm: new Date()
    }
  ]);
}

function gerarPerguntasAdmin(patologias: any[], cirurgias: any[]): any[] {
  return [
    {
      id: "Q_ADMIN_001",
      pergunta: "Como está sua pressão arterial?",
      tipo: "numero",
      condicao: patologias.some(p => p.patologiaId === 1) // Se tem HAS
    },
    {
      id: "Q_ADMIN_002",
      pergunta: "Qual seu peso atual (kg)?",
      tipo: "numero"
    },
    {
      id: "Q_ADMIN_003",
      pergunta: "Está tomando as medicações prescritas?",
      tipo: "sim_nao"
    },
    {
      id: "Q_ADMIN_004",
      pergunta: "Teve alguma internação ou emergência?",
      tipo: "sim_nao"
    }
  ];
}

function gerarPerguntasEnfermeira(patologias: any[]): any[] {
  return [
    {
      id: "Q_ENF_001",
      pergunta: "Como está sua energia/fadiga? (0-5)",
      tipo: "escala_0_5"
    },
    {
      id: "Q_ENF_002",
      pergunta: "Como está seu sono? (0-5)",
      tipo: "escala_0_5"
    },
    {
      id: "Q_ENF_003",
      pergunta: "Teve algum sintoma novo?",
      tipo: "texto_longo"
    },
    {
      id: "Q_ENF_004",
      pergunta: "Está fazendo atividade física? Qual?",
      tipo: "texto_curto"
    }
  ];
}

function gerarPerguntasConsultor(patologias: any[]): any[] {
  return [
    {
      id: "Q_CONS_001",
      pergunta: "Como está sua motivação com o tratamento? (0-5)",
      tipo: "escala_0_5"
    },
    {
      id: "Q_CONS_002",
      pergunta: "Tem alguma dúvida sobre as orientações?",
      tipo: "sim_nao"
    },
    {
      id: "Q_CONS_003",
      pergunta: "Qual sua maior dificuldade no tratamento?",
      tipo: "texto_longo"
    }
  ];
}
```

### 3.2 Rota: GET `/acompanhamento/cards/:pacienteId`

**Objetivo:** Você (médico) vê todos os cards do paciente para correlacionar.

```typescript
router.get("/acompanhamento/cards/:pacienteId", async (req, res): Promise<void> => {
  const pacienteId = parseInt(req.params.pacienteId, 10);

  const cards = await db
    .select()
    .from(acompanhamentoCardsMensaisTable)
    .where(eq(acompanhamentoCardsMensaisTable.pacienteId, pacienteId))
    .orderBy(desc(acompanhamentoCardsMensaisTable.mesAno));

  res.json({
    pacienteId,
    totalCards: cards.length,
    cards: cards.map(card => ({
      id: card.id,
      mesAno: card.mesAno,
      tipoCard: card.tipoCard,
      responsavel: card.responsavelId, // Nome do responsável
      perguntasSugeridas: card.perguntasSugeridas,
      respostasRecebidas: card.respostasRecebidas,
      status: card.status,
      respondidoEm: card.respondidoEm
    }))
  });
});
```

---

## FASE 4: HISTÓRICO E TIMELINE

### 4.1 Rota: GET `/acompanhamento/timeline/:pacienteId`

**Objetivo:** Você vê a timeline completa do paciente com todas as mudanças.

```typescript
router.get("/acompanhamento/timeline/:pacienteId", async (req, res): Promise<void> => {
  const pacienteId = parseInt(req.params.pacienteId, 10);

  const mudancas = await db
    .select()
    .from(historico_mudancas_patologiasTable)
    .where(eq(historico_mudancas_patologiasTable.pacienteId, pacienteId))
    .orderBy(desc(historico_mudancas_patologiasTable.dataMudanca));

  const timeline = mudancas.map(m => ({
    data: m.dataMudanca,
    tipo: m.tipoMudanca,
    patologia: m.patologiaId, // Nome da patologia
    valorAnterior: m.valorAnterior,
    valorNovo: m.valorNovo,
    criadoPor: m.criadoPorId
  }));

  res.json({
    pacienteId,
    totalMudancas: timeline.length,
    timeline
  });
});
```

### 4.2 Rota: GET `/acompanhamento/evolucao-exames/:pacienteId`

**Objetivo:** Gráficos de evolução de exames ao longo do tempo.

```typescript
router.get("/acompanhamento/evolucao-exames/:pacienteId", async (req, res): Promise<void> => {
  const pacienteId = parseInt(req.params.pacienteId, 10);

  // Buscar todos os exames do paciente ordenados por data
  const exames = await db
    .select()
    .from(examesBaseTable)
    .where(eq(examesBaseTable.pacienteId, pacienteId))
    .orderBy(asc(examesBaseTable.dataExame));

  // Agrupar por tipo de exame
  const evolucao = exames.reduce((acc: any, exame: any) => {
    const tipo = exame.tipo;
    if (!acc[tipo]) {
      acc[tipo] = [];
    }
    acc[tipo].push({
      data: exame.dataExame,
      valor: exame.valor,
      referencia: exame.referencia,
      status: exame.status
    });
    return acc;
  }, {});

  res.json({
    pacienteId,
    evolucao
  });
});
```

---

## FASE 5: FRONTEND - COMPONENTES

### 5.1 Componente: `CheckinPatologias.tsx`

```typescript
export function CheckinPatologias({ pacienteId }: { pacienteId: number }) {
  const [patologias, setPatologias] = useState<any[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Buscar lista de patologias
    fetch("/api/patologias-master")
      .then(r => r.json())
      .then(data => setPatologias(data));
  }, []);

  const handleToggle = (patologiaId: number) => {
    const nova = new Set(selecionadas);
    if (nova.has(patologiaId)) {
      nova.delete(patologiaId);
    } else {
      nova.add(patologiaId);
    }
    setSelecionadas(nova);
  };

  const handleSalvar = async () => {
    const checkin = Array.from(selecionadas).map(id => ({
      patologiaId: id,
      intensidade: 3, // Padrão, pode ser editado
      observacoes: ""
    }));

    await fetch("/api/anamnese/checkin/patologias", {
      method: "POST",
      body: JSON.stringify({ pacienteId, patologias: checkin })
    });

    toast({ title: "Patologias salvas com sucesso" });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Selecione suas Patologias</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {patologias.map(p => (
          <div key={p.id} className="flex items-center gap-2 p-3 border rounded">
            <input
              type="checkbox"
              checked={selecionadas.has(p.id)}
              onChange={() => handleToggle(p.id)}
            />
            <label className="flex-1 cursor-pointer">
              <div className="font-semibold">{p.nome}</div>
              <div className="text-sm text-gray-600">{p.grupo}</div>
            </label>
          </div>
        ))}
      </div>
      <Button onClick={handleSalvar}>Salvar Check-in</Button>
    </div>
  );
}
```

### 5.2 Componente: `CardsMensais.tsx`

```typescript
export function CardsMensais({ pacienteId }: { pacienteId: number }) {
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/acompanhamento/cards/${pacienteId}`)
      .then(r => r.json())
      .then(data => setCards(data.cards));
  }, [pacienteId]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Cards de Acompanhamento</h2>
      {cards.map(card => (
        <Card key={card.id}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{card.tipoCard}</CardTitle>
                <p className="text-sm text-gray-600">
                  {new Date(card.mesAno).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>
              <Badge
                variant={card.status === "respondido" ? "default" : "outline"}
              >
                {card.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {card.perguntasSugeridas?.map((p: any) => (
              <div key={p.id}>
                <p className="font-semibold">{p.pergunta}</p>
                {card.respostasRecebidas?.[p.id] && (
                  <p className="text-sm text-gray-700 mt-1">
                    Resposta: {card.respostasRecebidas[p.id]}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 5.3 Componente: `TimelineAcompanhamento.tsx`

```typescript
export function TimelineAcompanhamento({ pacienteId }: { pacienteId: number }) {
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/acompanhamento/timeline/${pacienteId}`)
      .then(r => r.json())
      .then(data => setTimeline(data.timeline));
  }, [pacienteId]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Timeline do Paciente</h2>
      <div className="relative">
        {timeline.map((item, idx) => (
          <div key={idx} className="flex gap-4 pb-6">
            <div className="w-4 h-4 bg-blue-500 rounded-full mt-1" />
            <div className="flex-1">
              <p className="font-semibold">{item.tipo}</p>
              <p className="text-sm text-gray-600">{item.patologia}</p>
              <p className="text-xs text-gray-400">
                {new Date(item.data).toLocaleDateString("pt-BR")}
              </p>
              {item.valorAnterior && (
                <p className="text-sm mt-1">
                  {item.valorAnterior} → {item.valorNovo}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## FASE 6: INTEGRAÇÃO COM MOTOR CLÍNICO

### 6.1 Atualizar Rota: POST `/motor-clinico/ativar`

Quando o paciente faz check-in, o motor clínico processa automaticamente:

```typescript
router.post("/motor-clinico/ativar", async (req, res): Promise<void> => {
  const { pacienteId, anamneseId } = req.body;

  // 1. Buscar patologias do check-in
  const patologias = await db
    .select()
    .from(pacientePatologiasCheckinTable)
    .where(
      and(
        eq(pacientePatologiasCheckinTable.pacienteId, pacienteId),
        eq(pacientePatologiasCheckinTable.ativo, true)
      )
    );

  // 2. Para cada patologia, gerar sugestões
  const sugestoes: any[] = [];
  for (const pat of patologias) {
    const regra = await db.query.regrasMotorTable.findFirst({
      where: (r) => eq(r.patologiaId, pat.patologiaId)
    });

    if (regra) {
      // Gerar sugestões baseadas na regra
      if (regra.aciona_exames) {
        const exames = await db.query.examesBaseTable.findMany({
          where: (e) => eq(e.patologiaRelacionada, pat.patologiaId)
        });
        sugestoes.push(...exames.map(e => ({
          tipo: "EXAME",
          itemNome: e.nome,
          justificativa: `Exame relacionado a ${pat.nome}`,
          prioridade: "ALTA"
        })));
      }

      if (regra.aciona_formulas) {
        const formulas = await db.query.formulasTable.findMany({
          where: (f) => eq(f.patologiaRelacionada, pat.patologiaId)
        });
        sugestoes.push(...formulas.map(f => ({
          tipo: "FORMULA",
          itemNome: f.nome,
          justificativa: `Fórmula sugerida para ${pat.nome}`,
          prioridade: regra.prioridade
        })));
      }
    }
  }

  // 3. Salvar sugestões
  const resultado = await db
    .insert(sugestoesTable)
    .values(
      sugestoes.map(s => ({
        anamneseId,
        pacienteId,
        tipo: s.tipo,
        itemNome: s.itemNome,
        justificativa: s.justificativa,
        prioridade: s.prioridade,
        status: "pendente"
      }))
    )
    .returning();

  res.json({
    sucesso: true,
    totalSugestoes: resultado.length,
    sugestoes: resultado
  });
});
```

---

## FASE 7: DADOS INICIAIS (SEED)

### 7.1 Script: `seed-patologias.ts`

```typescript
import { db, patologiasMasterTable } from "@workspace/db";

const patologias = [
  // CARDIACAS
  { codigo: "CARD_HASA", nome: "Hipertensão Arterial", grupo: "CARDIACAS" },
  { codigo: "CARD_ARRITMIA", nome: "Arritmia Cardíaca", grupo: "CARDIACAS" },
  { codigo: "CARD_ANGINA", nome: "Angina", grupo: "CARDIACAS" },
  { codigo: "CARD_INFARTO", nome: "Infarto Agudo do Miocárdio", grupo: "CARDIACAS" },
  { codigo: "CARD_AVC", nome: "AVC - Acidente Vascular Cerebral", grupo: "CARDIACAS" },
  
  // METABOLICAS
  { codigo: "META_DIAB1", nome: "Diabetes Tipo 1", grupo: "METABOLICAS" },
  { codigo: "META_DIAB2", nome: "Diabetes Tipo 2", grupo: "METABOLICAS" },
  { codigo: "META_PREDIAB", nome: "Pré-Diabetes", grupo: "METABOLICAS" },
  { codigo: "META_RESIS", nome: "Resistência Insulínica", grupo: "METABOLICAS" },
  { codigo: "META_DISLIP", nome: "Dislipidemia", grupo: "METABOLICAS" },
  { codigo: "META_OBESI", nome: "Obesidade", grupo: "METABOLICAS" },
  
  // ENDOCRINAS
  { codigo: "ENDO_HIPO", nome: "Hipotireoidismo", grupo: "ENDOCRINAS" },
  { codigo: "ENDO_HIPER", nome: "Hipertireoidismo", grupo: "ENDOCRINAS" },
  { codigo: "ENDO_HASH", nome: "Tireoidite de Hashimoto", grupo: "ENDOCRINAS" },
  
  // AUTOIMUNES
  { codigo: "AUTO_LUPUS", nome: "Lúpus Eritematoso Sistêmico", grupo: "AUTOIMUNES" },
  { codigo: "AUTO_ARTRITE", nome: "Artrite Reumatoide", grupo: "AUTOIMUNES" },
  { codigo: "AUTO_EM", nome: "Esclerose Múltipla", grupo: "AUTOIMUNES" },
  
  // ONCOLOGICAS
  { codigo: "ONCO_MAMA", nome: "Câncer de Mama", grupo: "ONCOLOGICAS" },
  { codigo: "ONCO_PROSTA", nome: "Câncer de Próstata", grupo: "ONCOLOGICAS" },
  { codigo: "ONCO_PULMAO", nome: "Câncer de Pulmão", grupo: "ONCOLOGICAS" },
  { codigo: "ONCO_COLON", nome: "Câncer de Cólon", grupo: "ONCOLOGICAS" },
  
  // ORTOPEDICAS
  { codigo: "ORTO_ARTROSE", nome: "Artrose", grupo: "ORTOPEDICAS" },
  { codigo: "ORTO_OSTEO", nome: "Osteoporose", grupo: "ORTOPEDICAS" },
  { codigo: "ORTO_HERNIA", nome: "Hérnia de Disco", grupo: "ORTOPEDICAS" }
];

export async function seedPatologias() {
  await db.insert(patologiasMasterTable).values(
    patologias.map(p => ({
      codigoPadcom: p.codigo,
      nome: p.nome,
      grupo: p.grupo,
      ativo: true,
      criadoEm: new Date()
    }))
  );
  console.log(`✓ ${patologias.length} patologias inseridas`);
}
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar tabelas no banco de dados
- [ ] Inserir dados iniciais (seed de patologias, cirurgias, cânceres)
- [ ] Implementar rotas de check-in (POST `/anamnese/checkin/*`)
- [ ] Implementar rota de geração de cards mensais (Job)
- [ ] Implementar rota de timeline (GET `/acompanhamento/timeline`)
- [ ] Implementar rota de evolução de exames (GET `/acompanhamento/evolucao-exames`)
- [ ] Criar componentes React (CheckinPatologias, CardsMensais, TimelineAcompanhamento)
- [ ] Atualizar motor clínico para processar check-ins
- [ ] Testar fluxo completo (check-in → motor → cards → timeline)
- [ ] Integrar com dashboard médico
- [ ] Documentar para usuários finais

---

## PRÓXIMOS PASSOS

1. **Replit Agent:** Execute o script de seed para popular as patologias
2. **Replit Agent:** Implemente as rotas de check-in
3. **Replit Agent:** Configure o job de geração de cards (1º dia de cada mês)
4. **Você:** Teste o fluxo completo com um paciente piloto
5. **Você:** Ajuste as perguntas dos cards conforme feedback

---

**FIM DO DOCUMENTO**
