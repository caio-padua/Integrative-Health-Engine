-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  MENSAGERIA · SEED OPUS · v1                                           ║
-- ║  Migração 1:1 do código React do Dr. Claude Opus pra banco editável   ║
-- ║  Tabela mensagens_catalogo: categoria + chave + jsonb conteúdo         ║
-- ╚════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS mensagens_catalogo (
  id            serial PRIMARY KEY,
  categoria     text NOT NULL,
  chave         text NOT NULL,
  ordem         integer NOT NULL DEFAULT 0,
  conteudo      jsonb NOT NULL,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categoria, chave)
);

CREATE INDEX IF NOT EXISTS idx_mensagens_categoria ON mensagens_catalogo(categoria) WHERE ativo;

-- Limpa pra reseed idempotente (preserva ID via ON CONFLICT seria melhor mas estamos populando do zero)
DELETE FROM mensagens_catalogo WHERE categoria IN
  ('PERIODO','DIA_SEMANA','SEMANA_MES','ELOGIO_SEMANA','VERSICULO_SABADO',
   'DR_CAIO_FALA','DR_CAIO_STATUS','DIA_FRASE','OBS_DOSE','ASSINATURA');

-- ════════════════════════════ PERÍODOS (9) ════════════════════════════
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo) VALUES
('PERIODO','jejum',1,'{"label":"Jejum","emoji":"🌅","horario":"04h – 05h","saudacao":"Bom dia","abertura":"Neste jejum matinal, seu organismo está no momento de maior biodisponibilidade — é quando cada ativo é absorvido com eficiência máxima.","desejo":"Quero lembrá-lo das fórmulas em *jejum* — o primeiro passo de um dia de alta performance clínica:","pronome":"manhã","cor_primary":"#d4a574","cor_bg":"#1f1810","cor_accent":"#f0c794"}'),
('PERIODO','inicioManha',2,'{"label":"Início da Manhã","emoji":"☀️","horario":"06h – 08h","saudacao":"Bom dia","abertura":"Neste despertar da manhã, seu café e as fórmulas certas vão em sintonia — o começo do dia define o ritmo dos próximos.","desejo":"Quero lembrá-lo das fórmulas do *início da manhã*, para que sua disposição e seu metabolismo comecem fortes:","pronome":"manhã","cor_primary":"#f5b947","cor_bg":"#1f1a0a","cor_accent":"#ffd179"}'),
('PERIODO','meioManha',3,'{"label":"Meio da Manhã","emoji":"🌞","horario":"09h – 11h","saudacao":"Bom dia","abertura":"Neste meio de manhã, quando o metabolismo já está ativo e o organismo pede suporte, é hora de entregar ao corpo os nutrientes certos.","desejo":"Quero lembrá-lo das fórmulas do *meio da manhã*, para manter foco, energia e estabilidade até o almoço:","pronome":"manhã","cor_primary":"#f5d547","cor_bg":"#1f1d0a","cor_accent":"#ffe879"}'),
('PERIODO','almoco',4,'{"label":"Almoço","emoji":"🍽️","horario":"12h – 13h","saudacao":"Boa tarde","abertura":"Neste momento do almoço, quando a refeição alimenta o corpo, as fórmulas somam — fecham a sinergia entre nutrição e protocolo.","desejo":"Quero lembrá-lo das fórmulas do *almoço*, para que absorção e digestão trabalhem juntas a seu favor:","pronome":"tarde","cor_primary":"#f57a47","cor_bg":"#1f1308","cor_accent":"#ff9a6b"}'),
('PERIODO','inicioTarde',5,'{"label":"Início da Tarde","emoji":"🌤️","horario":"14h – 15h","saudacao":"Boa tarde","abertura":"Neste início de tarde, quando a digestão avança e a energia precisa se manter estável, as fórmulas deste horário são suporte essencial.","desejo":"Quero lembrá-lo das fórmulas do *início da tarde*, para sustentar seu rendimento no segundo turno do dia:","pronome":"tarde","cor_primary":"#e87a47","cor_bg":"#1e130a","cor_accent":"#ff9a68"}'),
('PERIODO','meioTarde',6,'{"label":"Meio da Tarde","emoji":"⛅","horario":"15h – 16h","saudacao":"Boa tarde","abertura":"Neste meio de tarde, momento estratégico para manter clareza mental e estabilidade metabólica — o senhor sustenta o ritmo com as fórmulas certas.","desejo":"Quero lembrá-lo das fórmulas do *meio da tarde*, para que a energia vá firme até o final do expediente:","pronome":"tarde","cor_primary":"#d9663d","cor_bg":"#1d110a","cor_accent":"#f0855f"}'),
('PERIODO','inicioNoite',7,'{"label":"Início da Noite","emoji":"🌆","horario":"18h – 19h","saudacao":"Boa noite","abertura":"Neste início de noite, quando o corpo desacelera e começa a preparar o descanso, as fórmulas deste horário auxiliam na transição metabólica.","desejo":"Quero lembrá-lo das fórmulas do *início da noite*, para uma transição suave e reparadora para o repouso:","pronome":"noite","cor_primary":"#7a6bd9","cor_bg":"#14121e","cor_accent":"#9d8ff0"}'),
('PERIODO','finalNoite',8,'{"label":"Final da Noite","emoji":"🌙","horario":"21h – 22h","saudacao":"Boa noite","abertura":"Neste final de noite, momento precioso de preparação para o sono — quando o organismo entra em modo de reparação profunda.","desejo":"Quero lembrá-lo das fórmulas deste período, para uma noite de recuperação plena e sono restaurador:","pronome":"noite","cor_primary":"#6b5fb0","cor_bg":"#11101c","cor_accent":"#8d82d9"}'),
('PERIODO','ceia',9,'{"label":"Ceia","emoji":"🌜","horario":"22h – 23h","saudacao":"Boa noite","abertura":"Nesta ceia do seu dia, última refeição antes do descanso reparador — o corpo se prepara para horas de regeneração silenciosa.","desejo":"Quero lembrá-lo das fórmulas da *ceia*, para que o sono seja aliado da sua recuperação:","pronome":"ceia","cor_primary":"#5b4e9b","cor_bg":"#0f0e1a","cor_accent":"#7d70bd"}');

-- ════════════════════════════ DIAS DA SEMANA (7) ════════════════════════════
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo) VALUES
('DIA_SEMANA','segunda',1,'{"label":"Segunda-feira","tom":"Abertura de semana · motivacional","frase":"Comece a semana com o pé direito — e com as fórmulas no horário certo."}'),
('DIA_SEMANA','terca',2,'{"label":"Terça-feira","tom":"Foco & produtividade","frase":"Que sua terça-feira seja de alta performance — seu protocolo está desenhado para isso."}'),
('DIA_SEMANA','quarta',3,'{"label":"Quarta-feira","tom":"Metade da semana · consistência","frase":"No meio da semana, consistência é o que faz a diferença."}'),
('DIA_SEMANA','quinta',4,'{"label":"Quinta-feira","tom":"Performance & rotina","frase":"Quinta-feira é dia de manter firme — falta pouco para fechar mais uma semana de conquistas."}'),
('DIA_SEMANA','sexta',5,'{"label":"Sexta-feira","tom":"Desaceleração inteligente","frase":"Encerre a semana bem — desacelerar também faz parte do cuidado."}'),
('DIA_SEMANA','sabado',6,'{"label":"Sábado","tom":"🌿 Adventista · descanso sagrado","frase":"Que este sábado santo traga descanso verdadeiro — corpo, mente e espírito em paz."}'),
('DIA_SEMANA','domingo',7,'{"label":"Domingo","tom":"Preparação para a semana","frase":"Um domingo bem cuidado é meia semana ganha."}');

-- ════════════════════════════ SEMANA DO MÊS (4) ════════════════════════════
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo) VALUES
('SEMANA_MES','1',1,'{"frase":"primeira semana do mês — o começo de um novo ciclo"}'),
('SEMANA_MES','2',2,'{"frase":"segunda semana do mês — o ritmo já está construído"}'),
('SEMANA_MES','3',3,'{"frase":"terceira semana — já na segunda metade do mês"}'),
('SEMANA_MES','4',4,'{"frase":"última semana do mês — reta final de mais um ciclo bem conduzido"}');

-- ════════════════════════════ ELOGIO POR SEMANA (4) ════════════════════════════
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo) VALUES
('ELOGIO_SEMANA','1',1,'{"texto":"Começar a semana com disciplina é o que diferencia quem evolui de quem só sobrevive."}'),
('ELOGIO_SEMANA','2',2,'{"texto":"Duas semanas de constância já mostram o caminho — o corpo sente, o espelho mostra."}'),
('ELOGIO_SEMANA','3',3,'{"texto":"Passar da metade do mês com adesão assim é feito para poucos."}'),
('ELOGIO_SEMANA','4',4,'{"texto":"Fechar o mês inteiro com disciplina é motivo de orgulho — e o Dr. Caio percebe."}');

-- ════════════════════════════ VERSÍCULOS DE SÁBADO (4) ════════════════════════════
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo) VALUES
('VERSICULO_SABADO','1',1,$$ {"texto":"_\"O Senhor te abençoará e te guardará; o Senhor fará resplandecer o Seu rosto sobre ti e te concederá graça.\"_\n_(Números 6:24-25)_"} $$::jsonb),
('VERSICULO_SABADO','2',2,$$ {"texto":"_\"Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.\"_\n_(Mateus 11:28)_"} $$::jsonb),
('VERSICULO_SABADO','3',3,$$ {"texto":"_\"Porque sou eu que conheço os planos que tenho para vocês — planos de fazê-los prosperar, de dar esperança e um futuro.\"_\n_(Jeremias 29:11)_"} $$::jsonb),
('VERSICULO_SABADO','4',4,$$ {"texto":"_\"Deleita-te no Senhor, e Ele atenderá aos desejos do teu coração.\"_\n_(Salmos 37:4)_"} $$::jsonb);

-- ════════════════════════════ FALAS DR. CAIO (4) ════════════════════════════
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo) VALUES
('DR_CAIO_FALA','absorcao_idade',1, jsonb_build_object(
  'label','Absorção & Idade',
  'texto', E'💬 *O Dr. Caio sempre reforça:* a gente não é o que come — a gente é o que *absorve*.\n\nCom o passar dos anos, o intestino perde eficiência, o estômago reduz a acidez e a absorção de nutrientes cai drasticamente. É por isso que a suplementação personalizada, nas doses certas e nos horários certos, é o que separa quem envelhece doente de quem envelhece bem.\n\nNa medicina convencional, só se trata o sintoma. Na medicina integrativa, a gente cuida da raiz — e o senhor já entendeu isso. Continue firme.'
)),
('DR_CAIO_FALA','equilibrio_cura',2, jsonb_build_object(
  'label','Equilíbrio & Cura',
  'texto', E'💬 *O Dr. Caio sempre diz:* o corpo não adoece porque quer — ele adoece quando falta equilíbrio. E cura quando o equilíbrio volta.\n\nA medicina convencional espera o sintoma aparecer para agir. A medicina integrativa age todo dia para o sintoma *não aparecer*. Essa é a diferença.\n\nOs suplementos do seu protocolo não são opção — são estrutura. Cada fórmula no horário certo é um tijolo na casa da sua saúde.'
)),
('DR_CAIO_FALA','constancia_protocolo',3, jsonb_build_object(
  'label','Constância & Protocolo',
  'texto', E'💬 *O Dr. Caio costuma dizer:* o melhor remédio da medicina integrativa é *constância + equilíbrio nutricional*.\n\nEnquanto a medicina convencional trata doença, a gente cultiva saúde. E saúde não se compra numa consulta — se constrói todo dia, dose por dose, horário por horário.\n\nO senhor vem cumprindo isso com disciplina. E disciplina, no nosso protocolo, é terapêutica.'
)),
('DR_CAIO_FALA','longevidade_prevencao',4, jsonb_build_object(
  'label','Longevidade & Prevenção',
  'texto', E'💬 *O Dr. Caio sempre reforça:* envelhecer bem não é sorte — é projeto.\n\nNa medicina convencional, o paciente espera a doença para ir ao médico. Na medicina integrativa, o paciente cuida do corpo para nunca precisar. O senhor faz parte do segundo grupo — e é por isso que sua evolução tem sido diferente.\n\nCada dose respeitada hoje é um ano a mais de qualidade lá na frente.'
));

-- ════════════════════════════ STATUS DR. CAIO (5) ════════════════════════════
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo) VALUES
('DR_CAIO_STATUS','op1',1,'{"texto":"O Dr. Caio está contente com sua evolução e acompanha cada passo do seu progresso."}'),
('DR_CAIO_STATUS','op2',2,'{"texto":"O Dr. Caio recebeu seus últimos relatórios com muita satisfação."}'),
('DR_CAIO_STATUS','op3',3,'{"texto":"O Dr. Caio valoriza muito a sua constância e acompanha seus resultados de perto."}'),
('DR_CAIO_STATUS','op4',4,'{"texto":"O Dr. Caio permanece muito satisfeito com a evolução do seu tratamento."}'),
('DR_CAIO_STATUS','op5',5,'{"texto":""}');

-- ════════════════════════════ OBSERVAÇÃO DE DOSE (1) ════════════════════════════
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo) VALUES
('OBS_DOSE','padrao',1, jsonb_build_object(
  'texto', E'⚠️ *Importante:* *dose* não é sempre igual a *1 cápsula*. Algumas fórmulas têm 2, 3 ou mais cápsulas por dose.\n\n🔎 *Confira sempre o rótulo* antes de tomar — ali está a quantidade certa.'
));

-- ════════════════════════════ ASSINATURA (1) ════════════════════════════
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo) VALUES
('ASSINATURA','beatriz',1, jsonb_build_object(
  'saudacao_fechamento','Com atenção clínica,',
  'nome','Beatriz Romanov',
  'papel','Assistente Farmacêutica',
  'rodape_linha1','PAWARDS MedCore®',
  'rodape_subtitulo1','Clinical Intelligence System',
  'rodape_linha2','PADCON Platform®',
  'rodape_subtitulo2','Advanced Systems Architecture'
));

-- ════════════════════════════ VERIFICAÇÃO ════════════════════════════
SELECT categoria, COUNT(*) FROM mensagens_catalogo GROUP BY categoria ORDER BY categoria;
