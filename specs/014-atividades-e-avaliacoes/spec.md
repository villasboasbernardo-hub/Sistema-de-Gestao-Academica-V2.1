# Feature Specification: Atividades e avaliações — Épicos 9 e 8

**Feature Branch**: `docs/EPICO-8-9-estado-atual`. Este é o ramo do levantamento, rebaseado sobre a `main` em `adeb991` em 12/10/2026. Os PRs de implementação nascem em ramos próprios.

**Created**: 12/10/2026

**Status**: **Clarify encerrado em 13/10/2026.** As Q-1 a Q-17 foram respondidas por Bernardo em 12 e 13/10/2026 (*Clarifications*). A Q-1 foi **substituída** pela decisão D-CUR-1, e a Q-1b caiu junto. O lote banco × currículo (§11-A) foi **aprovado em bloco**, com o impacto mostrado caso a caso antes de cada aplicação; a lista planilha × currículo (§11-B) vai para os operadores. Seguem para aprovação de Bernardo, na implementação, o texto da emenda da `RN-AVAL-01` (§12) e as emendas de texto (§13). Os acréscimos de Bernardo (D-CUR-2 e os cards, §2.3) foram medidos (§15), e as duas perguntas que geraram (Q-16 e Q-17, §16) estão respondidas. A emenda E-7 da `RN-2027-03` está **aprovada** para a implementação. **Nenhuma trava restante para os Épicos 9 e 8.**

**Input**: pedido de Bernardo Villas Boas de 12/10/2026: *"Épicos 8 e 9 da v2.1 — Avaliações e Atividades."* Ele veio com **15 decisões já tomadas**, registradas na §2 como requisito e não reabertas como pergunta.

> **Leia antes desta página:**
> - `estado-atual.md`: o levantamento de 07/10/2026, **reconferido contra a `main` em 12/10/2026** (§6 dele);
> - `medicao-2026-10-12.md`: as medições M-1 a M-6, sobre as planilhas exportadas e a cópia datada do remoto.
>
> **Citações de requisito de outra spec levam o número da spec**, como em `FR-019 da spec 013`.

---

## 1. O problema, em uma frase

O DSA já lança avaliação, vista e atividade, mas há quatro lacunas:
- **ninguém vê o que esses lançamentos significam**: o teto de AEC, TAD e TR não aparece em tela nenhuma, e a situação das avaliações também não;
- **a situação da vista está errada no dado real**: 135 de 188 avaliações vivas têm vista registrada e aparecem "pendentes";
- **o currículo não diz quanto da disciplina é prova e quanto é vista**, embora as planilhas de controle orcem isso linha a linha;
- **o operador não tem como parar um dia** sem sair do DSA.

## 2. As 15 decisões de Bernardo (12/10/2026) — requisito, não pergunta

| # | Decisão | Onde vira requisito |
|---|---|---|
| D-AA-1 | Uma spec para os dois épicos, em **duas levas de PRs: Épico 9 primeiro, depois o 8** | §3 e §7 |
| D-AA-2 | Tetos AEC/TAD/TR sobre a **CH curricular por turma**, **apenas informativos**: percentual e alerta por turma, nunca bloqueio. **Emendar o Glossário** | FR-001 a FR-006, FR-060 |
| D-AA-3 | O tipo de atividade é classificado pela **categoria cadastrada em `config_listas`** | FR-010 a FR-012 |
| D-AA-4 | **Avaliação e vista são itens do currículo da disciplina**, com TA previsto próprio. O DSA oferece UEs + provas + vistas da disciplina. Lançar prova ou vista consome o previsto do item. O painel mostra previsto/cumprido de UEs, provas e vistas. A faixa de UEs coberta pela prova é informação opcional. A sincronização com as planilhas grava nesses itens | FR-030 a FR-039 |
| D-AA-5 | Vista em **várias sessões**; todas contam na CHD | FR-040 a FR-042 |
| D-AA-6 | **Três papéis** na avaliação: aplicador, fiscal e quem conduz a vista | FR-043 a FR-045 |
| D-AA-7 | Mais de um instrutor: **parar o descarte do 2º nome** (gravar e mostrar). A tabela de junção fica como **pendência nomeada** | FR-046, §8 |
| D-AA-8 | Evento de várias turmas: **escopo global quando vale para todas**, com a soma de CH corrigida | FR-013 a FR-015 |
| D-AA-9 | Responsável externo: texto livre **só para entidade ou palestrante**, sempre via lote de decisões. Listar os 43 textos atuais que são pessoa cadastrável | FR-016 e FR-017; `medicao` M-4 |
| D-AA-10 | Não há avaliação cancelada de verdade. As "canceladas" são as do ETL substituídas pela planilha. **Estado próprio "substituída pela planilha"**, fora de toda contagem. Listar a única cancelada sem marca, sem mexer | FR-047 a FR-049; `medicao` M-3 |
| D-AA-11 | Situação da avaliação **calculada na leitura** (data prevista × aplicação × vista registrada) | FR-050 a FR-054 |
| D-AA-12 | MONITORIA, PORTUGUÊS, BDA e BDF são **atividade de alunos específicos**, a 5ª categoria **Apoio Individualizado** (Q-3): fora da CH da turma, dos tetos e do EI, marcadas "alunos específicos" no DSA. **Emenda à RN-EVT-01.** Recepção aos alunos → TAD/Administração; Apoio à Instrução → AEC | FR-018 a FR-022; `medicao` M-5 |
| D-AA-13 | **Lançar dia parado no DSA**: parada de todas as turmas vai para o calendário global (com permissão), parada de uma turma vira TAD dela; o dia aparece bloqueado na grade e no papel, com o motivo. ⚠️ **Ajustada pela Q-14 (13/10/2026):** a parada **prevista** não é TAD; vai para a linha própria **"dias parados"** | FR-023 a FR-028.1 |
| D-AA-14 | Estudo Individual 20%/10% como **parâmetro, só informativo** | FR-007 |
| D-AA-15 | **Fora desta spec:** agendamento de avaliação × consumo de TA. O consumo acontece só ao registrar no DSA. Vai para o backlog | §8 |

**Telas que o pedido nomeia:** alerta de teto por turma e situação das avaliações (hoje invisíveis).

### 2.3 Acréscimos de 13/10/2026 — requisito, não pergunta

*(Decisões de Bernardo Villas Boas, na fase de clarify, antes do plan. Não se reabrem.)*

| # | Decisão | Onde vira requisito |
|---|---|---|
| **D-CUR-2** | **Previsto de avaliação com origem.** Toda disciplina mostra a CH do currículo dividida em **aula** e **avaliação** (provas, trabalhos e vistas): 120 = 116 aula + 4 avaliação. A CH oficial **nunca** muda; o tempo de avaliação sai de **dentro** dela. Cada previsto (**quantidade** e **tempo**) tem **origem**: **"currículo"**, quando o currículo informa (na UE, se ele diz a UE; senão na disciplina), ou **"arbitrado"**, quando o currículo é mudo, definido pelo Encarregado ou Admin por disciplina do curso, herdado pelas turmas e ajustável por turma, exibido com *"não consta do currículo — definido pela Divisão"*. Ponto de partida do arbitrado: os valores das planilhas, como *"arbitrado — sugestão da planilha, a confirmar"*, **só** onde o currículo é mudo. Sem previsto: *"tempo de avaliação não definido"*. Painel com **alerta de projeção**. Trabalho tem o mesmo tratamento que prova. **Substitui a resposta da Q-12 e complementa a Q-11** | FR-031.4, FR-031.6 a FR-031.11, FR-034 |
| **D-AV-1** | **Cards de avaliações:** na página da turma, *"Avaliações — N aplicadas de M previstas no currículo"*, com barra, levando à aba *Avaliações* da turma; na disciplina, *"X de Y avaliações aplicadas"* e a lista dos itens com a situação. **Prova e trabalho contam; vista não** (indicador próprio, *"vistas realizadas A de B"*). *Aplicada* = aplicação lançada no DSA | FR-055 a FR-057 |
| **D-AV-2** | **Aba *Avaliações* na página da turma**, como a do curso: por disciplina, os itens previstos com a origem, aplicados, vistas, situação, os três papéis e o alerta de projeção. Aba e filtros na URL | FR-058 |
| **D-TETO-1** | **Cards de AEC, TAD e TR na página da turma, com TRÊS valores:** **cumprido** (o lançado no DSA; Apoio Individualizado e dias parados fora), **previsto no PROENS** (por turma e ano, editável por Admin, Encarregado e Ajudante da Divisão, Operador não; quem e quando registrados; acima do máximo, aviso sem bloqueio) e **limite máximo** (do currículo e das regras da DEnsM, só informativo). Ex.: *"TAD — 5 cumpridos · 5 previstos (PROENS) · máximo 25"*. Alertas informativos: cumprido > previsto e cumprido > máximo. A linha "dias parados" ao lado | FR-004, FR-008 a FR-008.3 |
| **D-TETO-2** | **Página do curso:** os **limites máximos** de AEC, TAD e TR do currículo de cada curso, como referência, sem cumprido nem previsto | FR-009 |

### 2.1 Paridade ou novidade (Princípio X)

**É paridade, com quatro extensões autorizadas nominalmente.**
- **Paridade:** os Épicos 8 e 9 estão no documento 06. Os requisitos que eles cobrem são todos `[PRESERVADO]`: `RF-AVAL-01` a `06`, `RF-EXTRA-01` a `04`, `RF-CURSO-02` e `06`, `RF-INI-04`.
- **Extensões, cada uma autorizada pela decisão do mesmo número:**
  - D-AA-4 (prova e vista como itens do currículo);
  - D-AA-5 (N sessões de vista);
  - D-AA-12 (a 5ª categoria, **Apoio Individualizado**);
  - D-AA-13 (dia parado pelo DSA).
- **Contenção (Princípio IX):** sem nota, média nem aprovação (`RNF-NORM-06`). Sem cadastro de alunos: corpo discente é de outra divisão (regra 2).

### 2.2 Passo 4 do pedido: algum épico já previa lançar dia parado ou feriado?

**Nenhum prevê lançar pelo DSA.** A edição do calendário está prevista, mas em outro lugar e sem dono:

| Fonte | O que prevê |
|---|---|
| `RF-EVT-01` (`docs/fase-1/02`, L354) | O cadastro de datas com impacto. **Não está atribuído a épico nenhum** no documento 06 |
| `RF-DADOS-04` (02, L437) | A tela `/admin/calendario`. Atribuído só ao Épico 1, que é o épico do schema |
| spec 009, L2342 | Adiou a tela de calendário para o Épico 7 |
| `RN-EVT-04` (04, L368) | Manda *"ajuste o calendário"*, mas não cria o caminho |

**Hoje nenhuma rota grava em `feriados`.** Todo acesso em `app/` e `lib/` é `select`.

**Portanto o item 13 entra nesta spec.** `/admin/calendario` continua no Épico 7.

---

## Clarifications

### Session 2026-10-12

*(Respostas de Bernardo Villas Boas ao lote da §10. Registradas como decisões, não se reabrem.)*

- Q: De onde vem a carga horária de disciplina, UE e avaliação? → A: ~~Opção (a), "previsto planejado" da planilha ao lado da CH DEnsM~~ **(resposta de 12/10/2026, SUBSTITUÍDA em 13/10/2026 pela decisão abaixo; a Q-1b, que dela dependia, não se aplica mais).**
- Q: Os itens de prova substituem `avaliacoes_planejadas` e o casamento por nome? → A: **Opção (a).** A ligação entre a prova aplicada e o item de prova da disciplina é **explícita**, sempre que houver item. O casamento por nome fica **só para o histórico**. A emenda da regra que hoje proíbe vínculo rígido vai **proposta** com texto antes e depois (Q-2; a proposta está na §12).
- Q: Como se chama e como se guarda a classe de Monitoria, Português, BDA e BDF? → A: **5ª categoria do domínio normativo, fora da CHT, chamada "Apoio Individualizado"**, sem sigla nova. Ela abrange Monitoria, Português para Estrangeiros, BDA e BDF (Q-3).
- Q: Como fica a parada de todas as turmas em só parte do dia? → A: **Como recomendado:** vira **TAD global bloqueante** dos tempos indicados (Q-4). ⚠️ **Ajustada pela Q-14 de 13/10/2026:** o registro continua **um só, global e bloqueante**, mas, sendo parada prevista, conta na linha **"dias parados"** de cada turma, e **não** no TAD.

### Session 2026-10-13

*(Decisões de Bernardo Villas Boas. **Substituem** qualquer texto anterior desta spec sobre o mesmo assunto. Não se reabrem.)*

- Q: De onde vem a carga horária de disciplina, UE e avaliação? → A: **O CURRÍCULO DA DEnsM É A ÚNICA FONTE DA CARGA HORÁRIA** (decisão D-CUR-1, substitui a Q-1 de 12/10 e elimina a Q-1b):
  - A CH de cada disciplina e de cada UE no banco é **estritamente idêntica** à do currículo. A quantidade de disciplinas, UEs e avaliações também.
  - As planilhas de controle são adaptação dos operadores. **Onde divergem do currículo, a planilha está errada.** A sincronização **nunca** altera CH de disciplina, UE ou avaliação: a diferença vira item da **lista de erros de planilha**.
  - O tempo de prova e de vista está **DENTRO** da CH da disciplina; não soma por cima. Exemplo: 3 avaliações de 2 TA são 6 TA de avaliação dentro da CH. Quando o currículo discrimina a avaliação por UE, o sistema segue essa discriminação. **UEs (conteúdo) + provas + vistas = CH da disciplina do currículo, sempre.**
  - **Banco × currículo:** a divergência vira lote de correção **do banco**, por migration de dado com o rito, **depois da aprovação** de Bernardo. **Planilha × currículo:** vira lista para os operadores.
- Q: A carga converte para global, sozinha, o evento presente em todas as turmas? → A: **Não.** Só via lote de decisões (Q-5).
- Q: Como mostrar a referência de Estudo Individual sem saber se a turma tem Estudo Obrigatório? → A: **As duas referências, 20 % e 10 %, lado a lado, só informativo** (Q-6).
- Q: "Departamento de Alunos" fica em que categoria? → A: **Continua TAD** (Q-7).
- Q: Quem lança a parada? → A: Parada de **uma turma**: quem lança atividade, **Operador incluído**. Feriado ou parada **global** (todas as turmas, calendário): **só Encarregado e Admin** (Q-8).
- Q: As 188 substituídas mudam de estado como? → A: **Migration de dado que lê a marca existente** (Q-9).
- Q: O 2º instrutor das 16 aulas vai para onde? → A: **Migra de `observacoes` para o campo novo** (Q-10).
- Q: O que o operador pode lançar como dia parado? → A: **Feriado e também licença administrativa, e paradas do mesmo tipo, como licença de pagamento**, nas categorias que as planilhas já usam (FR, LA, LP…). Pode ser global (calendário) ou só da turma (TAD), conforme a Q-8.
  - Nesses dias e tempos **não há aula e não se contabiliza TA de aula**. O dia aparece bloqueado na grade e no papel, com o motivo.
  - **Licença NÃO prevista:** ao lançar, o operador pode marcar **"consome Tempo Reserva"**, e os tempos daquele dia e turma contam como **TR**, entrando no percentual informativo de TR. Licença ou feriado **previsto no calendário NÃO consome TR**.
  - **Desfazer** a parada devolve o dia e o TR consumido (decisão D-PAR-1).
- Q: O currículo dá o tempo da avaliação, mas não diz de qual UE ele sai. Como registrar? → A: **Avaliação no nível da disciplina**, dentro da CH dela, **com aviso no painel**, até Bernardo nomear a UE (Q-11).
- Q: O currículo não dá o TA da avaliação. Com quantos TA ela entra? → A: ~~Registrada sem tempo previsto. Não se inventa número; a planilha não é fonte (Q-12).~~ **SUBSTITUÍDA no mesmo dia pela D-CUR-2:** o tempo é **arbitrado** pela Divisão, com a origem à vista; a planilha entra só como **sugestão a confirmar**.
- Q: Licença NÃO prevista de todas as turmas, que consome TR, é gravada como? → A: **TR global bloqueante** dos tempos. Não vai para o calendário (Q-13).
- Q: Feriado e licença PREVISTOS contam no teto de TAD? → A: **NÃO** (Q-14, decisão de Bernardo, contra a recomendação). Feriado e licença **previstos** (FR, LA, LP, NT…) **não contam no teto de TAD**: nesses dias não há aula e não se conta tempo de aula. Ficam numa **linha própria "dias parados"**, por turma, **informativa**, separada de AEC, TAD e TR, como nas planilhas, que têm linhas próprias para FR, LA, LP e NT. **Só a licença NÃO prevista marcada "consome Tempo Reserva" entra no TR.**
- Q: Igualar a quantidade de disciplinas ao currículo obriga a desfazer os desdobramentos? → A: **Unificar** C-Ap-HN I + I-I e CAHO MAT + FIS em **uma disciplina cada**, conforme o currículo, **movendo os lançamentos por migration de dado**: nenhum lançamento perdido, CH conferida antes e depois. A **Ambientação** dos C-ApA fica **para depois** (sem turma carregada em 2026), como pendência nomeada `PEND-014-3` (Q-15).
- Q: O lote banco × currículo (§11-A) está aprovado? → A: **Aprovado em bloco pela regra D-CUR-1.** Na implementação, cada correção vira migration de dado com o rito do remoto, e **antes de aplicar** Bernardo vê o impacto **caso a caso**: lançamentos que mudam de disciplina e CH antes e depois. Inclui a reativação e a correção do código da disciplina III do C-Esp-ALH.
- Q: E a lista planilha × currículo (§11-B)? → A: **Vira a lista de erros de planilha para os operadores.** Nada a aplicar no banco.
- Q: (acréscimo de 13/10/2026) Como o sistema sabe quantos tempos uma avaliação dura quando o currículo não diz? → A: **D-CUR-2** (§2.3): previsto com **origem** "currículo" ou "arbitrado"; o arbitrado é definido pela Divisão, parte da sugestão da planilha só onde o currículo é mudo, e o painel projeta o estouro. **Substitui a resposta da Q-12** (que deixava a avaliação sem tempo) e complementa a Q-11.
- Q: (acréscimo de 13/10/2026) Que cards a turma e o curso ganham? → A: **D-AV-1, D-AV-2, D-TETO-1 e D-TETO-2** (§2.3).
- Q: O "limite máximo" do card é o número que o currículo declara ou o percentual da norma? → A: **O número do CURRÍCULO, quando ele declara; o percentual da norma DEnsM, quando não declara.** O card mostra a origem, *"currículo"* ou *"norma"*. É coerente com a D-CUR-1. A **emenda E-7** da `RN-2027-03` (previsto do PROENS por turma, AEC incluída) está **aprovada** para a implementação (Q-16).
- Q: A Observação de Desempenho (OD) conta no "N aplicadas de M"? → A: **Não.** Aparece na lista da disciplina como *"avaliação contínua (OD)"*, sem tempo próprio; o TA de comentários, quando o currículo o dá, conta em *"vistas realizadas"*. **Complemento:** o card de avaliações da turma mostra, logo abaixo do número principal, *"+ K avaliações contínuas (OD)"*; cada OD fica **"em andamento"** enquanto a disciplina corre e **"concluída"** quando a disciplina é concluída (Q-17).
- Q: O que fica fora da spec? → A: (1) A avaliação `DSAP-C-EXP-OBS-ME-2026-L206-V`, cancelada e relançada como `DSA-MUYK0RFD-V` **sem a vista**: correção de dado e possível **bug** "excluir e relançar a prova no DSA perde a vista". Vai para o **backlog do DSA** (`PEND-DSA-VISTA`), para o próximo lote de correções. (2) Das 11 divergências entre documentos da §9, **as que conflitam com decisões de Bernardo entram como emenda de texto nesta spec** (§13); as demais ficam listadas.

---

## 3. User Scenarios & Testing *(mandatory)*

As histórias seguem a ordem das levas (D-AA-1): **leva 1 = Épico 9** (US1 a US4) e **leva 2 = Épico 8** (US5 a US8).

### User Story 1 — Ver o teto de AEC, TAD e TR de cada turma (Priority: **P1**, leva 1)

O Encarregado abre a página da turma e vê um **card** para AEC (Atividades Extraclasse), TAD e TR, cada um com **três valores** (D-TETO-1):
- o **cumprido**: o lançado no DSA, sem Apoio Individualizado e sem dias parados;
- o **previsto no PROENS** para aquela turma e ano, que ele edita;
- o **limite máximo** do currículo e das regras da DEnsM;
- e os alertas, que nunca bloqueiam: cumprido acima do previsto, cumprido acima do máximo.

Na página do curso, ele vê os **limites máximos** de AEC, TAD e TR do currículo, como referência (D-TETO-2).

Ao lado, sem teto e sem alerta, a linha informativa **"dias parados"**, por tipo (FR, LA, LP, NT…), fora da CHT (Q-14).

O `/inicio` lista as turmas com teto excedido.

**Por que esta prioridade:** é o alerta que a `RF-EXTRA-04` exige e que não existe para quem usa o sistema. Medido na cópia de 09/10: **5 turmas** excedem o teto de TAD sem que ninguém veja.

**Teste independente:** abrir, por clique, a página de uma turma com TAD acima do máximo e ver o alerta. Lançar mais um TAD e ver que a gravação **não** foi impedida. Editar o previsto do PROENS como Ajudante e ver quem e quando; tentar como Operador e ser recusado.

**Acceptance Scenarios:**
1. **Dado** uma turma com CH curricular 545 e 29 TA de TAD, **quando** abro a ficha, **então** vejo *"TAD 29 de 27,25 (5,3 %) — acima do teto"* como alerta, sem bloqueio.
2. **Dado** o teto de TAD alterado em `config_parametros`, **quando** recarrego, **então** o alerta usa o novo valor sem redeploy.
2.1. **Dado** uma turma com TAD cumprido 5, previsto no PROENS 5 e máximo 25, **então** o card diz *"TAD — 5 cumpridos · 5 previstos (PROENS) · máximo 25"*, sem alerta. Com 6 cumpridos, alerta *"acima do previsto"*; com 26, também *"acima do máximo"*. Nenhum dos dois bloqueia.
2.2. **Dado** o Ajudante da Divisão, **quando** grava previsto de TR 130 numa turma cujo máximo é 126, **então** a gravação acontece, o aviso *"previsto acima do limite máximo"* aparece, e o card mostra quem alterou e quando. **Dado** um Operador, **então** a gravação é recusada pela Server Action e com `42501` do banco.
2.3. **Dado** uma turma sem previsto cadastrado, **então** o card mostra *"previsto não cadastrado"* (`RN-DEG-01`), e não zero.
2.4. **Dado** a página do curso, **então** ela mostra os limites máximos de AEC, TAD e TR do currículo do curso, com a origem, e nenhum cumprido nem previsto.
3. **Dado** um lançamento de TAD que leva a turma acima do teto, **quando** gravo no DSA, **então** a gravação acontece e o alerta aparece.
4. **Dado** uma turma EAD, **então** a ficha mostra a frase da spec 013 e **não** mostra tetos.

---

### User Story 2 — Classificar a atividade pelo tipo, e o Apoio Individualizado à parte (Priority: **P1**, leva 1)

O operador escolhe o **tipo** da atividade no DSA, e o sistema deriva a categoria da lista cadastrada. Monitoria, Português, BDA e BDF:
- caem na categoria **Apoio Individualizado** e aparecem na grade marcadas **"Apoio Individualizado — alunos específicos"**;
- não entram na CH da turma, nos tetos nem no EI.

**Por que esta prioridade:** sem isso o teto de TAD mede errado. Duas das cinco turmas que excedem deixam de exceder (`medicao` M-5).

**Teste independente:** lançar uma Monitoria e ver que o TAD da turma não muda e que a grade marca a linha.

**Acceptance Scenarios:**
1. **Dado** o tipo "Monitoria", **quando** lanço 2 TA, **então** a CHT, o TAD, o AEC, o TR e o EI da turma ficam iguais, e a grade e o papel mostram *"Apoio Individualizado — alunos específicos"*.
2. **Dado** o tipo "Recepção aos alunos", **então** a atividade conta como TAD.
3. **Dado** o tipo "Apoio à Instrução", **então** ela conta como AEC.
4. **Dado** que um Admin troca a categoria de um tipo na lista, **então** os lançamentos daquele tipo passam a contar na nova categoria na próxima leitura, e isso fica no rastro.

---

### User Story 3 — Lançar um evento de todas as turmas uma vez só (Priority: **P2**, leva 1)

Uma palestra para todas as turmas é lançada **uma vez**, com escopo global. Ela:
- aparece no DSA de cada turma ativa na data;
- soma na CH de cada uma.

**Teste independente:** lançar uma AEC global e ver o mesmo item no DSA e no AEC de duas turmas.

**Acceptance Scenarios:**
1. **Dado** uma AEC global de 2 TA em 15/10, **então** toda turma que tem DSA nesse dia a mostra, e o AEC de cada uma sobe 2.
2. **Dado** uma turma EAD, ou uma semipresencial fora da etapa presencial, **então** a global não aparece nela nem soma.
3. **Dado** um Estudo Individual, **então** o escopo global é recusado pelo banco (`RF-EXTRA-02`).

---

### User Story 4 — Parar um dia no DSA: feriado, licença e o Tempo Reserva (Priority: **P2**, leva 1)

O operador marca, no DSA, um dia ou um intervalo de tempos como **parado**. Ele escolhe:
- o **tipo**: Feriado (FR), Licença Administrativa (LA), Licença de Pagamento (LP) ou outro da mesma lista;
- o **motivo**;
- o **alcance**.

As paradas se registram assim:

| Alcance | Prevista no calendário? | Onde vai | Quem pode lançar |
|---|---|---|---|
| **Todas as turmas, dia inteiro** | sim | **calendário global** (impacto de dia inteiro) | Encarregado e Admin |
| **Todas as turmas, parte do dia** | sim | **dia parado global**, bloqueante, nos tempos (Q-4 ajustada pela Q-14); **fora do TAD** | Encarregado e Admin |
| **Todas as turmas, não prevista, consome TR** | não | **TR global**, bloqueante (Q-13); **não** vai para o calendário | Encarregado e Admin |
| **Só esta turma** | sim | **dia parado da turma**, bloqueante; **fora do TAD** (Q-14) | quem lança atividade, Operador incluído |
| **Só esta turma, não prevista, sem a marca** | não | **dia parado da turma**, bloqueante; fora do TAD | quem lança atividade, Operador incluído |
| **Só esta turma, não prevista, "consome TR"** | não | **TR da turma**, bloqueante | quem lança atividade, Operador incluído |

**Dia parado** (Q-14): não é AEC, TAD, TR, EI nem Apoio Individualizado. Fica **fora da CHT e dos tetos**, e aparece numa **linha própria "dias parados"** da turma, informativa, por tipo, como as linhas FR, LA, LP e NT das planilhas. O feriado de dia inteiro do calendário também entra nessa linha, em cada turma que teria DSA na data.

**Em qualquer caso:**
- não há aula, e não se contabiliza TA de aula;
- o dia ou os tempos aparecem **bloqueados** na grade e no papel, com o tipo e o motivo;
- lançar aula ali é recusado com a frase da `RN-EVT-04`;
- **desfazer** devolve o dia e, quando houver, o TR consumido.

**Por que esta prioridade:** hoje a parada só entra pela carga das planilhas. Na tela, só existe como TAD lançado à mão, que não bloqueia nada.

**Teste independente:** marcar uma Licença Administrativa não prevista de 4 tempos na turma, com "consome TR", ver o TR da turma subir 4, tentar lançar aula nesses tempos e ser recusado; depois desfazer e ver o TR voltar.

**Acceptance Scenarios:**
1. **Dado** um Feriado de todas as turmas e de dia inteiro, lançado pelo Encarregado, **então** ele vira linha do calendário com impacto de dia inteiro, e o DSA de toda turma com DSA na data mostra o dia bloqueado com o motivo.
2. **Dado** um Operador, **quando** tenta uma parada de **todas as turmas**, **então** a recusa nomeia a permissão que falta, pela Server Action e com `42501` vindo do banco. A parada **só da turma** continua disponível para ele.
3. **Dado** uma Licença Administrativa só da turma, **prevista**, nos tempos 1 a 4 de 20/10, **então** nasce um **dia parado** da turma, bloqueante, de 4 tempos; a linha "dias parados" mostra 4 tempos de LA e o **TAD não sobe**; lançar aula no tempo 2 recebe *"Dia bloqueado: <motivo>…"*, e nada é gravado.
4. **Dado** a mesma licença marcada **"não prevista — consome Tempo Reserva"**, **então** os 4 TA contam como **TR** da turma e entram no percentual de TR; o TAD e a linha "dias parados" **não** sobem.
5. **Dado** um Feriado **já no calendário**, **então** a opção "consome Tempo Reserva" não é oferecida: o previsto nunca consome TR.
6. **Dado** uma parada que consumiu 4 TA de TR, **quando** o operador a desfaz, **então** o dia volta a aceitar aula e o TR da turma desce 4. A linha fica inativa, e nada é apagado.
7. **Dado** uma aula crescendo em cascata (D-DSA-3) sobre um tempo parado, **então** a cascata **não** empurra a parada; ela recusa e nomeia o bloqueio.
8. **Dado** uma parada de todas as turmas nos tempos 5 a 8 de 22/10, **então** nasce **um** dia parado global bloqueante; a linha "dias parados" de cada turma com DSA na data mostra 4 tempos, o **TAD não muda**, e lançar aula no tempo 6 é recusado.
9. **Dado** o papel do DSA da semana, **então** o dia ou os tempos parados saem com o tipo e o motivo.
10. **Dado** uma licença administrativa **não prevista** de todas as turmas em 23/10, marcada "consome Tempo Reserva" pelo Encarregado, **então** nasce **uma** atividade **TR global** bloqueante nos tempos do dia, o TR de cada turma com DSA na data sobe, e **nenhuma** linha nasce no calendário (Q-13).

---

### User Story 5 — Situação das avaliações da turma e do curso (Priority: **P1**, leva 2)

O Encarregado abre a página do curso, aba *Avaliações* (`RF-CURSO-02`), e vê cada avaliação com a situação calculada:
- **Concluída**
- **Em andamento**
- **Pendente**
- **Atrasada**
- **Sem correspondência**

A ficha da turma e o `/inicio` mostram as vistas vencidas e as que vencem em breve (`RF-INI-04`, `RF-CURSO-06`).

**Por que esta prioridade:** é a tela que falta, e conserta um número que hoje mente. Das 188 vivas, 135 têm vista e aparecem "pendentes" (`medicao` M-6).

**Teste independente:** uma prova aplicada há 8 dias sem vista aparece Atrasada; com 7 dias, não.

**Acceptance Scenarios:**
1. **Dado** prova aplicada e vista registrada, **então** a situação é **Concluída**.
2. **Dado** prova aplicada há 7 dias sem vista, **então** a situação é **Em andamento**. **No 8º dia**, é **Atrasada**.
3. **Dado** prova de disciplina cujo currículo **não tem item de vista** (TFM, por exemplo), **então** ela é **Concluída** ao ser aplicada.
4. **Dado** uma avaliação do currículo sem lançamento, **então** ele aparece como **Pendente** enquanto o curso da turma não termina, e como **Sem correspondência** depois do término (Q-2).
5. **Dado** avaliações em estado "substituída pela planilha", **então** elas não aparecem em contagem nenhuma.

---

### User Story 6 — Prova e vista como itens do currículo da disciplina (Priority: **P1**, leva 2)

Na disciplina, o sistema passa a listar, **como o currículo da DEnsM diz**, as UEs e, dentro do tempo delas, as **provas** e as **vistas**, cada uma com o seu TA. Exemplo real: C-Ap-HN, HN-2101, **UE 7 Física, 21 TA** (currículo p. 9). O currículo diz *"1 (uma) PM referente à UE 7. Serão utilizados 2 (dois) TA para a aplicação e 1 (um) TA para a realização dos comentários e vista da prova, computados na UE 7"*. A UE 7 tem então **18 TA de conteúdo + PM 2 + vista 1 = 21**, e a CH da UE e da disciplina **não mudam**.
- No DSA, ao escolher a disciplina, o operador vê UEs, provas e vistas. Lançar a **PE1** consome o previsto da PE1.
- O painel da disciplina mostra previsto e cumprido por item.

**Teste independente:** no C-Ap-HN, UE 7 Física, lançar a PM de 2 TA e ver a UE com conteúdo 0 de 18, PM 2 de 2 e vista 0 de 1, e a UE com os mesmos 21 TA do currículo.

**Acceptance Scenarios:**
1. **Dado** a disciplina com UEs e com as avaliações do currículo, **quando** escolho a disciplina no DSA, **então** aparecem para escolha as UEs (conteúdo) e as avaliações (prova e vista), cada uma com a UE em que o currículo a computa.
2. **Dado** a PM da UE 7 com 2 TA, **quando** lanço 2 TA, **então** o painel mostra PM 2/2 dentro da UE 7, e a CHD da disciplina inclui os 2 (`RN-EVT-03`).
3. **Dado** uma prova lançada com a faixa *"U.E. 3 a 6"*, **então** a faixa aparece no papel e na lista e **não** consome TA de UE nenhuma.
4. **Dado** a sincronização de uma planilha cuja disciplina diverge do currículo (por exemplo, C-Ap-FR XIII com 117 × 160), **então** nenhuma CH do banco muda, e a divergência aparece na **lista de erros de planilha** da rodada.
5. **Dado** uma prova da planilha que não casa com avaliação do currículo (por exemplo, TFM do C-Ap-HN com prova 7 × 4 no currículo), **então** o lançamento entra como fato, sem item, e o caso vai para a lista de erros de planilha.

---

### User Story 7 — Vista em mais de uma sessão, e as pessoas da avaliação (Priority: **P2**, leva 2)

- A vista da PE1 pode ter **duas ou mais sessões**, em dias diferentes, todas na CHD.
- A avaliação registra quem **aplica**, quem **fiscaliza** e quem **conduz a vista**.
- Quando a planilha traz dois nomes, o segundo **não se perde**.

**Acceptance Scenarios:**
1. **Dado** uma vista de 2 sessões (1 TA em 10/10 e 1 TA em 13/10), **então** a CHD conta 2 e o DSA mostra cada sessão no seu dia.
2. **Dado** um fiscal fora do cadastro, **então** ele é aceito. Um **aplicador** sem habilitação na disciplina é recusado (critério 4 do Épico 8).
3. **Dado** o texto *"CC A. / 1ºTen B."* no instrutor da prova, **então** o segundo nome fica gravado e aparece na tela e no papel.

---

### User Story 8 — Substituídas fora da conta (Priority: **P3**, leva 2)

As 188 avaliações do ETL que a planilha substituiu passam a ter o estado **"substituída pela planilha"**. Elas não são contadas como canceladas nem como vivas.

**Acceptance Scenarios:**
1. **Dado** uma avaliação substituída, **então** ela não entra em painel, alerta, CHD nem carga docente. Continua legível no histórico.
2. **Dado** a próxima rodada da sincronização, **então** a avaliação do ETL que ela substituir recebe esse estado, e não `cancelada`.

---

### User Story 9 — Tempo de avaliação com origem e alerta de projeção (Priority: **P1**, leva 2)

O Encarregado abre uma disciplina e vê a CH do currículo dividida em **aula** e **avaliação**, como *"120 = 116 aula + 4 avaliação"*. Cada avaliação prevista mostra a **quantidade** e o **tempo**, cada um com a sua **origem**: *currículo* ou *arbitrado*. O painel projeta quanto sobra para aula (D-CUR-2).

**Por que esta prioridade:** sem isso, quem vê "120 TA" planeja 120 de aula e descobre no fim que faltam 4 para prova e vista.

**Teste independente:** numa disciplina do C-Exp-Obs-ME (currículo mudo quanto ao tempo), confirmar o arbitrado sugerido pela planilha e ver a disciplina passar de *"tempo de avaliação não definido"* para *"aula + avaliação"*, com a marca *"não consta do currículo — definido pela Divisão"*.

**Acceptance Scenarios:**
1. **Dado** C-Ap-HN, UE 7 Física (currículo: PM 2 + vista 1, computados na UE 7), **então** a origem é *currículo*, o item fica na UE 7, e a UE mostra 18 aula + 3 avaliação = 21.
2. **Dado** C-Exp-MetocOf, disciplina com *"PM de 3 TA … e 1 TA para a vista"* sem UE, **então** a origem é *currículo*, os 4 TA ficam na disciplina, e o painel avisa *"o currículo não diz de qual UE sai"* (Q-11).
3. **Dado** C-Exp-Obs-ME, disciplina DHN-0225 (currículo: duas PE, sem tempo), **então** a **quantidade** 2 tem origem *currículo* e o **tempo** nasce *"arbitrado — sugestão da planilha, a confirmar"*. Confirmado pelo Encarregado, passa a *arbitrado*.
4. **Dado** uma disciplina sem previsto de tempo nenhum, **então** ela mostra *"tempo de avaliação não definido"*, e o total da turma **não** é escondido.
5. **Dado** uma disciplina de 120 TA com 116 de aula previstos, 100 cumpridos e 2 avaliações de 2 TA ainda por aplicar, **então** o painel diz *"restam 20 TA; faltam 2 avaliações (4 TA) → sobram 16 TA para aula"*. Com 118 cumpridos, *"restam 2 TA; faltam 2 avaliações (4 TA) → sobram −2 TA para aula"*, em alerta de estouro, sem bloquear.
6. **Dado** o arbitrado do curso, **quando** o Encarregado o ajusta só para uma turma, **então** as outras turmas continuam com o do curso, e a da turma mostra que foi ajustada.
7. **Dado** um Operador, **então** ele vê o arbitrado e não o edita.

---

### User Story 10 — Cards de avaliações e a aba *Avaliações* da turma (Priority: **P1**, leva 2)

Na página da turma, junto aos cards de CH e progresso, o card *"Avaliações — N aplicadas de M previstas no currículo"*, com barra. Clicar leva à aba **Avaliações** da turma, que mostra, por disciplina, os itens previstos com a origem, os aplicados, as vistas, a situação, o aplicador, o fiscal, quem conduz a vista e o alerta de projeção (D-AV-1, D-AV-2).

**Teste independente:** chegar à aba por clique no card e ver, numa disciplina, *"Prova 1 ✔ dd/mm · Trabalho 1 ✔ dd/mm · Prova 2 pendente"* e *"vistas realizadas 1 de 2"*.

**Acceptance Scenarios:**
1. **Dado** uma turma com 30 avaliações previstas (provas e trabalhos) e 12 aplicadas no DSA, **então** o card diz *"Avaliações — 12 aplicadas de 30 previstas no currículo"*, e a barra marca 40 %.
2. **Dado** uma vista aplicada, **então** ela **não** soma no "N de M"; soma em *"vistas realizadas A de B"*.
3. **Dado** uma disciplina cuja quantidade o currículo não dá e a Divisão arbitrou, **então** ela entra no M com a marca *arbitrado*. Sem nenhuma das duas, ela aparece *"não definido"* e o card diz quantas disciplinas estão assim.
4. **Dado** a aba *Avaliações* da turma filtrada por disciplina, **quando** copio o endereço e abro noutra janela, **então** a mesma aba e o mesmo filtro abrem (URL dona do estado).
5. **Dado** o painel do DSA, **ao** escolher a disciplina, **então** aparece *"X de Y avaliações aplicadas"* com a lista dos itens.

---

### Edge Cases

- **Turma sem lançamento:** os tetos aparecem com 0 % e sem alerta. Turma sem disciplina ativa: *"sem CH curricular — teto não calculável"* (`RN-DEG-01`), nunca divisão por zero.
- **Teto com parâmetro ausente no ano:** aviso *"parâmetro não cadastrado para 2027"*, sem número inventado.
- **Global num dia em que uma turma já tem lançamento nos mesmos tempos:** a regra de ocupação da spec 013 vale; a global aparece, e o conflito é sinalizado, não escondido.
- **Apoio Individualizado no mesmo tempo de uma aula da turma:** é legítimo, porque alunos diferentes estão em atividades diferentes. A grade mostra os dois, e o Apoio Individualizado **não** conta como conflito de ocupação. *[premissa A-6]*
- **Vista lançada antes da aplicação:** recusada, como já é hoje (`aval_vista_apos_aplicacao`), para **cada** sessão.
- **Prova lançada além do previsto do item:** alerta, como a CH da UE (`FR-025 da spec 013`), nunca bloqueio.
- **Currículo que dá o tempo da avaliação mas não diz de que UE ele sai** (C-Exp-MetocOf 2011, C-Esp-ALH, parte dos C-ApA): a avaliação fica **no nível da disciplina**, dentro da CH dela, e o painel avisa *"o currículo não diz de qual UE sai"*, até Bernardo nomear a UE (Q-11, FR-031.3).
- **Currículo que não dá o TA da avaliação** (C-Exp-Obs-ME, C-Esp-ALH quanto à vista, CAHO XX quanto à vista): o tempo é **arbitrado** pela Divisão, com a marca à vista; a planilha é só **sugestão a confirmar** (D-CUR-2, FR-031.4). Os EST-QF que aprovam por frequência não têm avaliação a prever.
- **Arbitrado acima do que cabe:** se a soma dos tempos arbitrados passa da CH da disciplina, o painel avisa e mostra quanto sobra para aula (negativo), sem bloquear e sem mudar a CH.
- **Previsto do PROENS acima do limite máximo:** grava, com aviso (D-TETO-1).
- **Turma sem previsto do PROENS:** *"previsto não cadastrado"*, nunca zero (`RN-DEG-01`).
- **Currículo por competências** (C-Espc-FR, C-Espc-HN, sem UE): a avaliação fica no nível da disciplina, com a "CH DA AVALIAÇÃO" que o currículo declara, dentro da CH da disciplina.
- **Parada sobre um dia que já tem aula gravada:** o que existe continua visível e contando (`RN-EVT-04`); a regra "não se contabiliza TA de aula" vale para o que se lança **depois** da parada. A tela avisa quantos lançamentos o dia tem antes de confirmar.
- **Desfazer uma parada:** a global inativa a linha do calendário, o dia parado global ou o TR global, e a da turma inativa o dia parado ou o TR. O dia volta a aceitar aula, e o TR consumido sai da conta. Nada é apagado (regra 4).
- **A única cancelada sem marca** (`DSAP-C-EXP-OBS-ME-2026-L206-V`): não é tocada por migration nem pela carga. Continua `cancelada` (D-AA-10).

---

## 4. Requirements *(mandatory)*

Cada requisito traz entre colchetes **[banco]**, **[tela]** ou **[carga]**: onde ele mora. Isso separa o que pede migration, com o rito do remoto, do que é só tela (restrição do pedido).

### 4.1 Leva 1, Épico 9: tetos, classificação, global, Apoio Individualizado e dia parado

**Tetos (D-AA-2, D-AA-14)**

- **FR-001** [banco + domínio] O teto de AEC, TAD e TR MUST ser calculado **por turma**, sobre a **CH curricular** (a soma da CH das disciplinas ativas do curso da turma). O percentual MUST vir de `config_parametros` para o ano letivo. A regra MUST morar numa função pura de `lib/dominio/` nomeada pela `RN-EVT-01`.
- **FR-001.1** [banco + domínio] O **limite máximo** de AEC, TAD e TR MUST ser o **número que o currículo do curso declara** no quadro final (*"ATIVIDADES EXTRACLASSE"*, *"TEMPO RESERVA"* e, nos C-Espc, *"TEMPO PARA ADMINISTRAÇÃO"*). Quando o currículo não declara, MUST ser o **percentual da norma** (FR-001) sobre a CH curricular. O resultado MUST trazer a **origem**, `currículo` ou `norma`, e a tela MUST mostrá-la (Q-16). Os números do quadro final dos 24 currículos MUST ser transcritos como **dado**, com arquivo e página, por migration com o rito (PR 1). Nos casos em que o currículo declara mais que o percentual (C-Ap-FR TR, C-Exp-Obs-ME TR, C-Espc-HN TAD e quatro EST-QF, M-8), vale o do currículo.
- **FR-002** [domínio] O retorno MUST separar `{ chd, aec, tad, tr, cht, estudoIndividual, apoioIndividualizado, diasParados }`, com a `cht` derivada **só** dos quatro primeiros. Somar EI, Apoio Individualizado ou dias parados à CHT MUST ser erro de tipo.
- **FR-003** Exceder um teto MUST ser **alerta**, nunca bloqueio nem `CHECK` (`RN-DEG-02`, regra 6).
- **FR-004** [tela] A página da turma MUST mostrar um **card** para AEC (com o nome por extenso do Glossário, *Atividades Extraclasse*), TAD e TR, cada um com **três valores** (D-TETO-1): **cumprido** (FR-002, sem Apoio Individualizado e sem dias parados), **previsto no PROENS** (FR-008) e **limite máximo** (FR-001, Q-16), com o percentual do cumprido sobre o máximo. Alertas **informativos**: cumprido > previsto; cumprido > máximo. Ao lado, a linha informativa **"dias parados"**, por tipo, sem teto e sem alerta (Q-14, FR-025.4).
- **FR-005** [tela] O `/inicio` MUST listar as turmas com teto excedido entre os alertas (`RF-INI-04`). A página do curso MUST sinalizar as turmas do curso que excedem (`RF-CURSO-06`).
- **FR-006** [tela] Turma EAD MUST NOT mostrar tetos (D-DSA da spec 013). Turma semipresencial conta só o que foi lançado.
- **FR-008** [banco] O **previsto no PROENS** de AEC, TAD e TR MUST ser guardado **por turma e ano**. Hoje `reservas_proens` guarda **por curso**, só TAD e TR (M-8). A migration MUST levar cada reserva atual à turma do mesmo curso e ano, preservando a origem, e deixar AEC **sem valor** onde o PROENS não o deu. A reserva genérica da `RN-2027-03` continua como **sugestão** para turma sem valor, nunca como previsto gravado. Emenda E-7 (§13).
- **FR-008.1** [banco] Editar o previsto MUST ser permitido a **Admin, Encarregado e Ajudante da Divisão de Administração Acadêmica**, e recusado ao **Operador** e aos demais, pelo banco (`42501`). Hoje a escrita em `reservas_proens` exige `calendario.criar`/`editar`; a permissão nova MUST ser recurso próprio, com o **caso que discrimina** (DoD 8): o Ajudante passa a poder.
- **FR-008.2** [banco] Toda alteração do previsto MUST registrar **quem e quando** (auditoria da linha), e a tela MUST mostrá-los.
- **FR-008.3** [ação] Previsto acima do limite máximo MUST gravar com **aviso**, nunca recusa (`RN-DEG-02`).
- **FR-009** [tela] A página do curso MUST mostrar os **limites máximos** de AEC, TAD e TR do currículo do curso, com a origem *"currículo"* ou *"norma"* (FR-001.1), sem cumprido e sem previsto (D-TETO-2).
- **FR-007** [banco + tela] A referência de Estudo Individual (20 % com Estudo Obrigatório, 10 % sem) MUST ser parâmetro em `config_parametros` e aparecer como **indicador informativo**, sem alerta de teto e sem cor de excesso. Mostra as **duas** referências, 20 % e 10 %, lado a lado (Q-6).

**Classificação pelo tipo (D-AA-3)**

- **FR-010** [banco] A categoria de cada atividade MUST vir do **tipo**, por `config_listas.tipos_atividade.metadados.categoria`. Tipo sem categoria MUST NOT ser oferecido para lançar atividade.
- **FR-011** [tela] O DSA MUST pedir o **tipo**, e não a categoria, e mostrar a categoria derivada antes de gravar.
- **FR-012** [banco] O subtipo gravado MUST existir na lista. Isso fecha a FK que a `RF-EXTRA-01` declara e que não existe (divergência V-6 da spec 013).

**Global (D-AA-8)**

- **FR-013** [banco] A atividade de escopo global MUST somar na CH de **cada turma que tem DSA na data**: ativa, não EAD e, se semipresencial, dentro da etapa presencial (D-DSA-2). Isso conserta `vw_carga_horaria_turma`, que hoje a ignora.
- **FR-014** [tela] O DSA MUST permitir lançar AEC, TAD ou TR como global, para quem tem `atividades_globais.criar`.
- **FR-015** [carga] A sincronização MUST NOT converter evento em global sozinha (Q-5). Grava como **uma linha global** só o evento que o **lote de decisões** mandar. O resto continua uma linha por turma.

**Responsável externo (D-AA-9)**

- **FR-016** [carga] Na carga, texto de responsável que não casa com o cadastro MUST virar **pendência do lote de decisões**, nunca gravação silenciosa. O lote decide uma de três saídas: casar com um instrutor, gravar como entidade/palestrante, ou cadastrar a pessoa.
- **FR-017** [tela] Na tela, o campo externo MUST se apresentar como *"Entidade ou palestrante externo"*. Os **22 textos de pessoa cadastrável** medidos (M-4) entram no lote de decisões da próxima rodada, e não são corrigidos por migration.

**Apoio Individualizado (D-AA-12, Q-3)**

- **FR-018** [banco] O domínio normativo de categorias MUST ganhar o **5º valor, "Apoio Individualizado"**, sem sigla nova, para Monitoria, Português para Estrangeiros, BDA e BDF. Ele fica fora da CHT, dos tetos e do Estudo Individual. A coluna gerada que diz se a atividade compõe a CHT MUST dar falso para ele, como dá para o EI, e somá-lo à CHT MUST ser impossível no banco e no tipo. É a migration revisada que a própria `RN-EVT-01` prevê para categoria nova (Q-3).
- **FR-019** [tela] A grade e o papel do DSA MUST marcar essas linhas com *"Apoio Individualizado — alunos específicos"*.
- **FR-020** [tela] A tela MUST permitir indicar **quais alunos** só se houver cadastro de alunos. **Não há** cadastro no sistema, e criar um é de outra divisão (regra 2). Logo, nesta spec, a indicação é no máximo a **quantidade**, opcional. *[premissa A-4]*
- **FR-021** [banco] Os tipos MUST ser reclassificados por dado em `config_listas`:
  - "Recepção aos alunos" → TAD;
  - "Apoio à Instrução" → AEC;
  - Monitoria, Português para Estrangeiros, BDA e BDF → Apoio Individualizado.
- **FR-022** [carga] `resolver.py` MUST mandar Monitoria, Português, BDA e BDF para Apoio Individualizado, e não mais para TAD, TR ou AEC. As linhas já gravadas MUST ser reclassificadas pela própria sincronização, sem migration de dado, porque a planilha manda (VIRADA-1, princípio 1).

**Dia parado (D-AA-13, Q-4, Q-8 e a ampliação de 13/10/2026)**

- **FR-023** [tela] O DSA MUST oferecer *"Parar dia"*, para o dia inteiro ou para os tempos indicados, com:
  - **tipo** obrigatório, da lista de tipos de parada: Feriado (FR), Licença Administrativa (LA), Licença de Pagamento (LP) e os demais que as planilhas já usam, como **dado** em `config_listas`;
  - **motivo** obrigatório;
  - **alcance**: todas as turmas ou só esta turma;
  - a marca **"não prevista — consome Tempo Reserva"**.
- **FR-024** [banco] Parada de **todas as turmas**, de **dia inteiro**, **prevista** MUST gravar uma linha em `feriados` com impacto `dia_inteiro`, com o tipo e o motivo na descrição (é dado, não schema: Q-16 da spec 013). Só **Encarregado e Admin** (`calendario.criar`, que a matriz já dá só a esses dois) (Q-8).
- **FR-024.1** [banco] Parada de **todas as turmas** em **parte do dia**, **prevista**, MUST gravar **um** registro **global** de **dia parado**, bloqueante, nos tempos indicados (Q-4, ajustada pela Q-14). Ele aparece na linha "dias parados" de cada turma com DSA na data e **não** soma no TAD. **Só Encarregado e Admin** (Q-8). A permissão de atividade global, que hoje inclui o Ajudante, **não basta** para parada. O calendário não muda, e a `RN-EVT-02` também não.
- **FR-025** [banco] Parada **só da turma**, **prevista** ou **não prevista sem a marca "consome Tempo Reserva"**, MUST gravar um **dia parado** da turma, bloqueante, nos tempos indicados (no dia inteiro, todos os tempos do regime da turma naquele dia). Ele **não** soma no TAD (Q-14). Pode lançá-la **quem lança atividade na turma, Operador incluído** (Q-8).
- **FR-025.1** [banco] Parada **não prevista** marcada **"consome Tempo Reserva"** MUST gravar a atividade como **TR**, bloqueante, e não como TAD. Os tempos entram no percentual informativo de TR. A de **todas as turmas** MUST ser **uma** atividade **TR global** bloqueante, que soma no TR de cada turma com DSA na data e **não** grava linha no calendário (Q-13). Só Encarregado e Admin.
- **FR-025.2** Parada **prevista** (dia que já está no calendário) MUST NOT consumir TR. A tela MUST NOT oferecer a marca quando o dia já está bloqueado no calendário.
- **FR-025.3** [banco] O **dia parado** MUST ser uma classe própria, **fora da CHT, dos tetos, do Estudo Individual e do Apoio Individualizado** (Q-14). Somá-lo a AEC, TAD, TR ou CHT MUST ser impossível no banco e no tipo. A forma de guardar (valor novo do domínio de categorias ou registro próprio) é decisão do plano; o comportamento não.
- **FR-025.4** [domínio + tela] A turma MUST ter a linha informativa **"dias parados"**, por tipo (FR, LA, LP, NT…), em tempos e em dias, somando: o feriado de dia inteiro do calendário em dia em que a turma teria DSA, o dia parado global e o da turma. Sem teto e sem alerta.
- **FR-025.5** [carga] A sincronização MUST gravar as linhas de feriado e licença **previstos** das planilhas (FR, LA, LP, NT) como **dia parado**, e não mais como TAD "Administração" (`resolver.py:539–557`). As linhas já gravadas MUST ser reclassificadas pela própria sincronização, como na FR-022.
- **FR-026** [domínio + ação] Aula MUST ser recusada em dia ou tempo coberto por parada, global ou da turma, com o tipo, o motivo e a frase da `RN-EVT-04`, no lançar, no mover e na cascata (D-DSA-3). A recusa MUST vir da Server Action, e não só da tela. **Emenda à `RN-EVT-04`** (autorizada por D-AA-13): o bloqueio passa a valer também para a parada de tempos, da turma ou global, de qualquer tipo de parada. Nenhum TA de aula se contabiliza nesses tempos.
- **FR-027** [tela] A grade e o papel MUST mostrar o dia ou os tempos parados com o tipo e o motivo, nos dois alcances.
- **FR-028** A cascata MUST NOT mover uma parada, e a parada MUST NOT ser empurrada por outro lançamento.
- **FR-028.1** **Desfazer** uma parada MUST inativar a linha do calendário ou a atividade (regra 4). Isso devolve o dia para a aula e tira da linha "dias parados", ou do TR, o que a parada tinha somado. Quem desfaz precisa da mesma permissão de quem lança aquele alcance.

### 4.2 Leva 2, Épico 8: avaliações

**Prova e vista no currículo (D-AA-4)**

- **FR-030** [banco] A disciplina MUST ter as **avaliações do currículo**. Cada uma tem:
  - instrumento (PE, PM, PP, PO, TG, OD…), número e ordem;
  - **TA de aplicação** e **TA de vista**, cada um quando o currículo o informa;
  - a **UE em que o currículo computa o tempo**, quando ele diz;
  - as **UEs que a prova aborda**, informativo;
  - a **origem**: arquivo do currículo e página.
  A **quantidade** de avaliações é a do currículo.
- **FR-031** [banco] A CH de cada disciplina e de cada UE MUST ser **estritamente idêntica** à do currículo da DEnsM (D-CUR-1). A quantidade de disciplinas, UEs e avaliações também. O tempo de prova e de vista está **dentro** da CH:
  - quando o currículo computa a avaliação numa UE, o **conteúdo** daquela UE é a CH dela menos as avaliações computadas nela;
  - **UEs (conteúdo) + provas + vistas = CH da disciplina do currículo, sempre.**
  Exemplo real: UE 7 Física do C-Ap-HN, 21 = 18 + 2 + 1.
- **FR-031.1** [banco] As divergências **banco × currículo** (§11-A), **aprovadas em bloco em 13/10/2026**, MUST ser corrigidas **no banco**, por migration de dado com o rito do remoto. **Antes de aplicar cada uma**, o impacto MUST ser mostrado a Bernardo caso a caso: os lançamentos que mudam de disciplina e a CH antes e depois. Inclui a reativação e a correção do código da disciplina III do C-Esp-ALH (B-5).
- **FR-031.2** [domínio] A regra "conteúdo + avaliações = CH" MUST ser verificada por função pura e por asserção de banco **sobre o catálogo**, nunca sobre o lançamento. O lançamento acima do previsto continua alerta (`FR-025 da spec 013`).
- **FR-031.3** [banco + tela] Avaliação cujo tempo o currículo dá **sem dizer de qual UE sai** MUST ficar **no nível da disciplina**, dentro da CH dela. O conteúdo da disciplina é a soma das UEs menos essas avaliações, e o painel MUST avisar *"o currículo não diz de qual UE sai"*. Quando Bernardo nomear a UE, a avaliação desce para ela, com a origem *"decisão CIAARA-11, dd/mm/aaaa"* (Q-11).
- **FR-031.4** [banco + tela] Avaliação cuja **quantidade** ou **tempo** o currículo **não dá** MUST ter o valor **arbitrado** pela Divisão (D-CUR-2, que substitui a Q-12). Enquanto não houver, a disciplina mostra *"tempo de avaliação não definido"*. Os EST-QF que aprovam por frequência ficam sem avaliação a prever.
- **FR-031.6** [banco] Cada previsto de avaliação MUST guardar **quantidade** e **tempo** (aplicação e vista), **cada um com a sua origem**: `currículo` (com arquivo e página) ou `arbitrado` (com quem e quando). Um item pode ter quantidade do currículo e tempo arbitrado (C-Exp-Obs-ME).
- **FR-031.7** [banco] O arbitrado MUST ser definido **por disciplina do curso** e **herdado** pelas turmas, com ajuste **por turma** que não altera o do curso. Editam: **Encarregado e Admin**. A CH da disciplina e da UE **nunca** muda: o arbitrado sai de dentro dela.
- **FR-031.8** [banco + carga] O ponto de partida do arbitrado MUST ser a planilha, gravado como *"arbitrado — sugestão da planilha, a confirmar"*, **só** onde o currículo é mudo (M-7). Sugestão não confirmada aparece marcada e conta na projeção. A sincronização MUST NOT sobrescrever arbitrado confirmado.
- **FR-031.9** [tela] O arbitrado MUST aparecer **em destaque**, com *"não consta do currículo — definido pela Divisão"*.
- **FR-031.10** [domínio] A divisão **aula + avaliação = CH do currículo** MUST ser calculada por função pura: avaliação = soma dos tempos previstos (currículo + arbitrado); aula = CH − avaliação.
- **FR-031.11** [domínio] O **alerta de projeção** MUST ser *"restam X TA; faltam N avaliações (Y TA) → sobram Z TA para aula"*, com X = CH − cumprido, Y = tempo previsto das avaliações ainda não aplicadas e Z = X − Y. **Z negativo é alerta de estouro**, nunca bloqueio. Avaliação sem tempo definido entra em N e não em Y, e o texto diz quantas.
- **FR-031.12** **Trabalho** (TG, TI, estudo de caso, projeto, monografia) MUST ter o mesmo tratamento que prova: item, quantidade, tempo, origem, vista e situação.
- **FR-031.5** [banco] Os desdobramentos MUST ser **unificados** conforme o currículo (Q-15): C-Ap-HN I + I-I numa disciplina **HN-2101** de 126, e CAHO MAT + FIS numa disciplina **MATFIS** de 56. A disciplina extra é **inativada** (regra 4), as UEs passam à unificada e os lançamentos dela são **movidos** por migration de dado. **Nenhum lançamento perdido**: a contagem de aulas, avaliações e atividades e a CH executada por turma MUST ser iguais antes e depois, conferidas no relatório da aplicação. A Ambientação dos C-ApA fica fora (`PEND-014-3`, §8).
- **FR-032** [tela] No DSA, escolhida a disciplina, MUST aparecer a lista de UEs (conteúdo) e de avaliações do currículo (prova e vista). Lançar prova ou vista MUST apontar a avaliação e consumir o TA dela, dentro da UE em que o currículo a computa.
- **FR-033** [tela] A prova lançada MUST aceitar a faixa de UEs coberta (*"U.E. 3 a 6"*) como informação opcional, que **não** consome TA de UE.
- **FR-034** [tela] O painel da disciplina (aba do curso, aba *Avaliações* da turma e painel do DSA) MUST mostrar: **CH do currículo · previsto de aula · previsto de avaliação, por item e com a origem · cumprido de cada · alerta de projeção** (FR-031.11). Por UE, quando o currículo dá a UE: conteúdo, prova e vista.
- **FR-035** [banco] A CHD MUST continuar vindo de um caminho único que soma aula, aplicação e **todas** as sessões de vista (`RN-EVT-03`).
- **FR-036** [carga] A sincronização MUST ligar cada prova e vista da planilha à avaliação do currículo correspondente, casando por instrumento e número **dentro da disciplina**. Ela MUST NOT alterar CH de disciplina, UE ou avaliação (D-CUR-1).
- **FR-036.1** [carga] Toda diferença entre a planilha e o currículo MUST virar item da **lista de erros de planilha** da rodada, por turma, para os operadores. Entram na lista: CH de disciplina, CH de UE, prova ou vista a mais ou a menos, TA de prova diferente, e linha sem correspondente no currículo, como `XX RECON`. O **lançamento** entra mesmo assim, como fato, sem avaliação ligada quando não casa.
- **FR-037** [banco] O catálogo de avaliações MUST ser povoado **a partir do currículo da DEnsM**: os 24 PDFs, com a extração versionada em `scripts/etl/dados/`, como já foi feito com as UEs. **Nunca da planilha.** É migration de dado com o rito, para os 24 cursos, inclusive os sem planilha.
- **FR-038** [tela] O cadastro da disciplina (`/disciplinas`, painel *Unidades de ensino*) MUST permitir criar, editar e inativar as avaliações do currículo (prova e vista), para transcrever ou corrigir conforme o currículo, com as mesmas permissões das UEs, e a regra da FR-031 conferida na gravação como aviso.
- **FR-039** A avaliação aplicada MUST apontar **explicitamente** a **avaliação do currículo** que cumpre, sempre que a disciplina tiver avaliação transcrita, pelo DSA ou pela sincronização (Q-2). As avaliações do currículo **são** o catálogo planejado da v2.1 (D-CUR-1).
- **FR-039.1** O casamento por **nome normalizado** da `RN-AVAL-01` MUST continuar valendo **só para o histórico**: as avaliações sem avaliação do currículo ligada (as migradas da v2.0) contra `avaliacoes_planejadas`, que fica só de leitura.
- **FR-039.2** [docs] A `RN-AVAL-01` MUST ser emendada no documento 04 (`.md`) **só depois** de Bernardo aprovar o texto da §12. Até lá, a leva 2 não implementa o vínculo explícito.

**Vista, pessoas e instrutores (D-AA-5 a D-AA-7)**

- **FR-040** [banco] A vista MUST poder ter **N sessões**. Cada sessão tem data, TA inicial, tempos, local e quem conduz, e é posterior à aplicação.
- **FR-041** [banco] Toda sessão MUST compor a CHD. As colunas de vista única atuais MUST ser migradas para a primeira sessão e marcadas `-- [APOSENTADA — v2.1]`, sem `drop` (convenção de banco).
- **FR-042** [carga] A sessão extra que hoje vira AEC (`vista_extra_como_aec`, **1** linha medida) MUST virar sessão de vista na próxima rodada.
- **FR-043** [banco] A avaliação MUST registrar três papéis:
  - **aplicador**, que exige habilitação (`RN-INST-01`);
  - **fiscal**, qualquer pessoa, do cadastro ou de fora (`RF-AVAL-06`);
  - **quem conduz a vista**, por sessão, do cadastro ou de fora.
- **FR-044** [banco] `fiscal_id` e `nome_fiscal_externo` juntos continuam recusados pelo banco (critério 5 do Épico 8). O mesmo vale para o par equivalente de quem conduz a vista.
- **FR-045** [carga] A marca "(FISCAL)" da planilha MUST preencher **fiscal**. Ela não troca mais o aplicador por quem conduz a vista (`estado-atual.md` §3.3).
- **FR-046** [banco + carga] Quando a origem traz mais de um instrutor ("A / B"), os demais MUST ser **gravados em campo próprio e mostrados** na tela e no papel, em aula, avaliação e atividade. Nada vai para `observacoes`. A tabela de junção com rateio de carga fica como pendência `PEND-014-1` (§8).

**Substituída (D-AA-10)**

- **FR-047** [banco] A avaliação MUST ter o estado **"substituída pela planilha"**, distinto de "cancelada". As **188** atuais com a marca `[SUBSTITUIDO PELA PLANILHA DE CONTROLE]` MUST passar a ele por migration de dado, que lê a marca. O status anterior sai do parêntese e vai para coluna própria.
- **FR-048** Avaliação substituída MUST NOT entrar em contagem nenhuma: painel, alerta, CHD, carga docente e LIQ.
- **FR-049** A avaliação cancelada sem marca (`DSAP-C-EXP-OBS-ME-2026-L206-V`, M-3) MUST NOT ser tocada pela migration. Ela fica listada em §9.

**Situação (D-AA-11)**

- **FR-050** [domínio] A situação MUST ser **calculada na leitura** por função pura, a partir de data prevista, aplicação registrada, sessões de vista e prazo de vista (`config_parametros`, 7 dias). Nenhum caminho de escrita grava situação.
- **FR-051** As regras de situação:

| Situação | Quando |
|---|---|
| **Concluída** | aplicada, e com vista registrada ou sem item de vista no currículo |
| **Em andamento** | aplicada, sem vista, dentro do prazo |
| **Atrasada** | aplicada, sem vista, há **mais de** 7 dias corridos. O 8º dia é Atrasada; o 7º, não |
| **Pendente** | item do currículo ou avaliação agendada ainda não aplicada |
| **OD: em andamento / concluída** | a avaliação contínua (OD) **não** tem aplicação própria: fica **em andamento** enquanto a disciplina corre na turma e **concluída** quando a disciplina é concluída, pelo mesmo critério de conclusão do painel da disciplina. Antes do primeiro lançamento da disciplina, **pendente** (Q-17) |
| **Sem correspondência** | avaliação do currículo sem lançamento ligado depois do término do curso da turma; ou, no histórico, planejada da v2.0 sem avaliação que case por nome (`RN-AVAL-01`). Sempre visível, nunca descartado |

- **FR-052** O prazo MUST contar da **aplicação registrada**, não da data prevista. Isso fecha a contradição 4 da §1.6 do `estado-atual.md`.
- **FR-053** [tela] A aba *Avaliações* da página do curso MUST existir (`RF-CURSO-02`), sem entrada própria no menu, com a lista por turma, disciplina e situação, e filtros na URL.
- **FR-054** [tela] A ficha da turma e o `/inicio` MUST mostrar as vistas atrasadas e as que vencem nos próximos 2 dias (`RF-INI-04`). *[premissa A-5]*

**Cards e aba da turma (D-AV-1, D-AV-2)**

- **FR-055** [tela] A página da turma MUST ter o card *"Avaliações — N aplicadas de M previstas no currículo"*, com barra, junto aos cards de CH e progresso. Clicar MUST levar à aba *Avaliações* da turma.
- **FR-056** [domínio] **N** = avaliações (prova e trabalho) com aplicação lançada no DSA. **M** = soma, por disciplina, da quantidade prevista: a do currículo; sem ela, a arbitrada; sem nenhuma, a disciplina fica *"não definido"* e o card diz quantas, **sem esconder o total**. **Vista não conta** em N nem em M: indicador separado *"vistas realizadas A de B"*. Substituída e cancelada ficam fora (FR-048). A **OD não entra** em N nem em M (Q-17): o card mostra, logo abaixo do número principal, *"+ K avaliações contínuas (OD)"*, com K = as OD previstas no currículo das disciplinas da turma. O TA de comentários da OD, quando o currículo o dá, entra em *"vistas realizadas"*.
- **FR-056.1** [tela] Na lista da disciplina, a OD MUST aparecer como *"avaliação contínua (OD)"*, sem tempo próprio, com a situação da FR-051.
- **FR-057** [tela] Na disciplina (aba *Avaliações* da turma e painel do DSA), MUST aparecer *"X de Y avaliações aplicadas"* e a lista dos itens com a situação calculada (FR-050): *"Prova 1 ✔ dd/mm · Trabalho 1 ✔ dd/mm · Prova 2 pendente"*.
- **FR-058** [tela] A página da turma MUST ganhar a aba **Avaliações**, como a do curso (FR-053): por disciplina, os itens previstos com a origem, aplicados, vistas, situação, aplicador, fiscal, quem conduz a vista e o alerta de projeção. Aba e filtros na URL (`searchParams`).

### 4.3 Transversais

- **FR-060** [docs] O Glossário (`docs/fase-1/07-Glossario.md`, só o `.md`) MUST ser emendado:
  - a CHR é a base dos três tetos, AEC inclusive;
  - o teto é por turma e informativo;
  - novo verbete **Apoio Individualizado** (5ª categoria, fora da CHT: Monitoria, Português para Estrangeiros, BDA e BDF);
  - o verbete **Estudo Individual** deixa de dizer que inclui Monitoria e Português;
  - o verbete **CHD** passa a dizer que a avaliação e a vista estão **dentro** da CH da disciplina e da UE em que o currículo as computa (D-CUR-1);
  - os verbetes **Licença Administrativa (LA)** e **Licença de Pagamento (LP)**, como tipos de parada, e o uso do **Tempo Reserva** para licença não prevista;
  - novo verbete **Dia parado**: feriado ou licença previstos, sem aula, fora da CHT e dos tetos, na linha "dias parados" da turma (Q-14).
  Cada emenda leva o registro de que o `.docx` não a recebeu.
- **FR-061** [docs] O documento 04 (`.md`) MUST receber, com a autorização nominal de 12/10/2026 citada:
  - a emenda da `RN-EVT-01` (D-AA-12 e Q-3): a 5ª categoria Apoio Individualizado, e a frase *"Inclui também Monitoria e Português para Estrangeiros"* sai do Estudo Individual; e o **dia parado** fora da CHT (Q-14);
  - a extensão da `RN-EVT-04` (D-AA-13 e Q-4);
  - a emenda da `RN-AVAL-01`, **só** com o texto aprovado da §12;
  - as emendas de texto da §13, que alinham os documentos às decisões de Bernardo.
  As demais regras do 04 MUST NOT mudar.
- **FR-062** Nenhuma tela, cálculo ou consulta MUST ler `formula_mf` ou `carater`, nem expor nota, média ou aprovação (critérios 1 e 7 do Épico 8, `RNF-NORM-06`).
- **FR-063** Toda tela nova MUST ter caminho clicável:
  - os cards de AEC, TAD e TR e o de avaliações pela página da turma;
  - a aba *Avaliações* da turma pelo card e pela barra de abas;
  - os limites máximos pela página do curso;
  - as avaliações pela página do curso;
  - a parada pelo DSA;
  - `/atividades` pelo menu, deixando de ser *"em breve"*.
  Toda tela nova MUST ter um percurso de ponta a ponta que chega **por clique**.
- **FR-064** As leituras MUST seguir a constituição: domínio em `lib/dominio/` (TS puro), leitura em Server Component, escrita em Server Action com Zod na primeira linha, e o estado de tela na URL.
- **FR-065** Toda recusa de permissão MUST ser provada com sessão real e o código `42501`, nos testes de RLS, nunca em pgTAP. Toda migration que mude qual condição uma regra lê MUST trazer o **caso que discrimina** (DoD 8).

### 4.4 Key Entities

- **Unidade de ensino.** Já existe. A CH é a do currículo e não muda. O **conteúdo** é derivado: a CH menos as avaliações computadas nela.
- **Avaliação do currículo.** Nova. Instrumento, número, TA de aplicação, TA de vista, a UE em que o tempo é computado (quando o currículo diz), as UEs abordadas e a origem (arquivo e página).
- **Erro de planilha.** Novo. Por rodada e turma: o que diverge do currículo, com os dois valores. Fica na saída da carga, não no cadastro.
- **Avaliação.** O fato único da `RN-AVAL-02`. Passa a apontar a **avaliação do currículo**, a faixa de UEs opcional, o aplicador, o fiscal, os demais instrutores e o estado de registro (ativa · cancelada · **substituída pela planilha**).
- **Sessão de vista.** Filha da avaliação (1:N). Atributos: vista do currículo que cumpre, data, TA, tempos, local e quem conduz.
- **Atividade não letiva.** Já existe. Passa a ter a classe derivada do tipo, incluindo **Apoio Individualizado**, os demais instrutores, a quantidade de alunos opcional, a marca de **parada** bloqueante e o tipo de parada.
- **Linha do calendário** (`feriados`). Já existe. Passa a ser gravável pelo DSA, com o motivo da parada.
- **Tipo de atividade** (`config_listas.tipos_atividade`). Já existe. A categoria em `metadados` passa a ser **obrigatória e a fonte única**, e ganha a marca de **parada bloqueante**.
- **Tipo de parada** (`config_listas`). Novo. FR, LA, LP, NT… Cada tipo diz se pode ser global e se aceita "consome Tempo Reserva" (só na não prevista).
- **Dia parado.** Novo. Classe própria, fora da CHT e dos tetos (Q-14): tipo, motivo, alcance (turma ou global), dia e tempos, prevista ou não. Alimenta a linha "dias parados" da turma. A não prevista com "consome Tempo Reserva" **não** é dia parado: é TR.
- **Parâmetro** (`config_parametros`). Os tetos já existem. Nasce a referência de EI.
- **Previsto de avaliação.** Por disciplina do curso, com ajuste por turma: instrumento, quantidade e tempos de aplicação e de vista, **cada um com origem** (`currículo` com página; `arbitrado` com quem e quando; *sugestão da planilha a confirmar*).
- **Previsto do PROENS.** Por **turma** e ano: AEC, TAD e TR, com quem e quando. Hoje `reservas_proens`, por curso, só TAD e TR.
- **Limite máximo.** Por curso: AEC, TAD e TR, o número do quadro final do currículo ou, sem ele, o percentual da norma, com a origem `currículo` ou `norma` (Q-16).

---

## 5. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** Todas as turmas com DSA mostram AEC, TAD e TR com percentual sobre a CH curricular, e a linha "dias parados" à parte. Na cópia de 09/10, só com a reclassificação de D-AA-12, as turmas acima do teto de TAD eram **C-Ap-FR, C-Ap-HN e C-Exp-MetocOf** (M-5). Com a saída do feriado e da licença previstos do TAD (Q-14), a lista é **[pendente]**: remedida no PR 1, sobre a mesma cópia.
- **SC-002** Alterar um teto em `config_parametros` muda o alerta na próxima leitura, sem redeploy (critério 3 do Épico 9).
- **SC-003** Nenhum lançamento é recusado por teto excedido. Prova: e2e que lança acima do teto e confere a linha no banco.
- **SC-004** O Estudo Individual e o Apoio Individualizado **nunca** entram na CHT (invariante pgTAP e Vitest).
- **SC-005** Uma AEC global aparece no DSA de **todas** as turmas com DSA na data e em nenhuma outra (critério 5 do Épico 9).
- **SC-006** Das 188 avaliações vivas da cópia, **zero** aparecem "pendente" tendo vista registrada (hoje são 135). A situação Atrasada vira exatamente no 8º dia.
- **SC-007** As 188 substituídas saem de toda contagem. As vivas continuam 188, e a única cancelada sem marca continua `cancelada`.
- **SC-008** No C-Ap-HN, a UE 7 Física mostra **18 + PM 2 + vista 1 = 21**, e a disciplina HN-2101 fecha em **126**. Uma rodada da sincronização **não altera** CH nenhuma do catálogo, provado pela impressão digital do catálogo antes e depois.
- **SC-008.1** Depois da migration aprovada do §11-A, a comparação banco × currículo dá **zero divergência** de CH nos 24 cursos, e a quantidade de disciplinas ativas do C-Ap-HN e do CAHO iguala a do currículo. A Ambientação dos C-ApA fica fora até a `PEND-014-3`.
- **SC-008.3** A unificação da Q-15 preserva, por turma, a contagem de aulas, avaliações e atividades e a CH executada, idênticas antes e depois.
- **SC-013** Um feriado ou licença previstos **não** mudam o TAD nem a CHT da turma; aparecem só na linha "dias parados".
- **SC-008.2** A lista de erros de planilha da rodada traz, no mínimo, os casos do §11-B que a medição de 13/10/2026 encontrou.
- **SC-012** Uma parada "consome Tempo Reserva" de 4 TA sobe o TR da turma em 4. Desfeita, o TR volta ao valor anterior.
- **SC-009** Lançar aula num tempo parado é recusado pela Server Action, tanto para parada global quanto para parada da turma, e a contagem no banco fica intacta.
- **SC-010** Os percursos de ponta a ponta chegam a cada tela nova por clique, a partir do menu.
- **SC-011** Busca no código sem comentário: zero leitura de `formula_mf` e `carater`, e zero coluna de nota.
- **SC-014** Toda disciplina dos 24 cursos mostra *aula + avaliação = CH do currículo* ou *"tempo de avaliação não definido"*; nenhuma CH muda ao definir ou alterar um arbitrado (impressão digital do catálogo antes e depois).
- **SC-015** Todo previsto de avaliação exibido traz a origem; nenhum arbitrado aparece sem a marca *"não consta do currículo"*.
- **SC-016** O alerta de projeção vira estouro exatamente quando Z < 0 (Vitest com os casos de fronteira Z = 0 e Z = −1).
- **SC-017** O card *"N aplicadas de M"* não conta vista, substituída nem cancelada (Vitest e e2e).
- **SC-018** O previsto do PROENS é gravável por Admin, Encarregado e Ajudante, e recusado com `42501` ao Operador, com o caso que discrimina do Ajudante.
- **SC-019** As 12 linhas atuais de `reservas_proens` (M-8) chegam às turmas do mesmo curso e ano com o mesmo valor, conferidas antes e depois.

---

## 6. Assumptions

- **A-1** O escopo "**todas as turmas**" da parada global e da atividade global é: todas as turmas **com DSA na data** (ativas, não EAD e, se semipresenciais, na etapa presencial).
- **A-2** ~~A parada prevista da turma é TAD, como manda a Q-16 da spec 013 para licença.~~ **Vencida pela Q-14 (13/10/2026):** feriado e licença previstos são **dia parado**, fora do TAD e da CHT. A não prevista com "consome TR" é TR. A Q-16 da spec 013 fica superada nesse ponto, e isso entra no §9.
- **A-3** O prazo de vista continua sendo `avaliacao.prazo_vista_dias = 7`.
- **A-4** **Não** se cria cadastro de alunos (regra 2). A indicação de alunos é só a quantidade, opcional, sem nome. Nome de aluno seria dado pessoal de corpo discente, que é de outra divisão.
- **A-5** "Vence em breve" = 2 dias, como parâmetro em `config_parametros`. O número é proposta, ajustável por dado.
- **A-6** Atividade de Apoio Individualizado pode coexistir com aula da turma no mesmo tempo sem conflito de ocupação.
- **A-7** "Departamento de Alunos" (Ap-FR 4 linhas/6 TA, Espc-FR 1/1) fica em TAD/Administração, porque não veio regra para ele. Ver a Q-7.
- **A-8** Parada da turma: a permissão é a de lançar atividade (`atividades_nao_letivas.criar`), Operador incluído. Parada global: `calendario.criar`, que é só de Encarregado e Admin (Q-8).
- **A-9** A migration das 188 substituídas e das colunas de vista roda no remoto pelo rito: backup `--somente-copia`, dry-run só com ela, conferência só de leitura e o arquivo datado citado.
- **A-10** *(acrescentada no plan, 13/10/2026)* O quadro final do currículo declara AEC, TR e TAD em **horas**; o sistema conta **TA**. Vale a equivalência já adotada para as UEs (1 h = 1 TA, decisão T011 da spec 006): o limite máximo de 65 horas é 65 TA.

## 7. Entrega em levas (D-AA-1) — banco separado de tela

| Leva | PR | Conteúdo | Banco? |
|---|---|---|---|
| **1 · Épico 9** | PR 1 | 5ª categoria Apoio Individualizado, tipos de parada e a marca bloqueante, a classe **dia parado** fora da CHT, TR por licença não prevista (da turma e global), categoria obrigatória e FK do tipo, marca de parada, global somando por turma com DSA, parâmetro de EI, reclassificação da lista | **Migration**, com o rito do remoto |
| | PR 1.1 | **Previsto do PROENS por turma** (AEC, TAD, TR), permissão nova com o Ajudante, migração das 12 reservas | **Migration**, com o rito do remoto |
| | PR 2 | Cards de AEC, TAD e TR com os três valores na página da turma; limites máximos na página do curso; tetos no `/inicio`; `/atividades`; tipo → categoria no DSA; global pela tela; dia parado no DSA e no papel | Só tela e ação |
| | PR 3 | Carga: Monitoria e afins, FR/LA/LP/NT previstos como dia parado, global, responsável externo como pendência | Só `scripts/carga_dsa` |
| **2 · Épico 8** | PR 4 | Avaliações do currículo (das 24 fontes), correção banco × currículo aprovada (§11-A, impacto caso a caso antes), unificação HN-2101 e MATFIS (Q-15), **previsto de avaliação com origem e o arbitrado herdado e por turma (D-CUR-2), com as sugestões das planilhas**, sessões de vista, três papéis, demais instrutores, estado "substituída" e migration das 188 | **Migration**, com o rito do remoto |
| | PR 5 | DSA oferecendo os itens, painel por item com aula + avaliação e alerta de projeção, card de avaliações e aba *Avaliações* da turma, aba *Avaliações* do curso, situação calculada, alertas de vista | Só tela e ação |
| | PR 6 | Carga: prova e vista ligadas às avaliações do currículo, lista de erros de planilha, N sessões, "(FISCAL)" no papel certo | Só `scripts/carga_dsa` |

## 8. O que NÃO entra nesta spec

- **D-AA-15:** consumir TA ao **agendar** avaliação. Consome só ao registrar no DSA. Vai para o backlog como **`PEND-014-2`**, com a contradição `RF-AVAL-04`/`05` × documento 06 anotada.
- **`PEND-014-1`:** tabela de junção instrutor × lançamento, com rateio de carga (D-AA-7).
- **`PEND-014-3`:** a **Ambientação** dos C-ApA (AuxNav, OcOp, PCN, PrevMe), que o banco tem como disciplina de 8 TA e o currículo trata como **fase** de 8 / 10 / 5 / 5 h (B-11). Fica para depois: não há turma desses cursos carregada em 2026 (decisão de 13/10/2026, Q-15).
- **Cadastro de alunos** e identificação nominal de aluno (regra 2).
- **`/admin/calendario`**, janelas de curso e reservas do PROENS: Épico 7 (`RF-DADOS-04`).
- Relatório do curso (Épico 10), Cronograma (Épico 7), LIQ e OS (Épico 11).
- Nota, média e aprovação (`RNF-NORM-06`).
- Policy de `DELETE` (regra 4).
- `PEND-DSA-SUGESTAO`: segue como o PR seguinte do Épico 6, independente desta spec.
- **`PEND-DSA-VISTA`** (backlog do DSA, decisão de 13/10/2026): a avaliação `DSAP-C-EXP-OBS-ME-2026-L206-V`, cancelada e relançada como `DSA-MUYK0RFD-V` **sem a vista**. Pede a correção de dado (recriar a vista) e a investigação do possível **bug** "excluir e relançar a prova no DSA perde a vista". Vai para o próximo lote de correções do DSA.

## 9. Divergências encontradas — listadas, não corrigidas

1. **`RF-AVAL-04`/`05` e `RN-AVAL-02` dizem que agendar consome TA. O documento 06, o 21 e o schema dizem que não.** Conflita com a D-AA-15. **Emenda de texto em §13 (E-1 a E-3).**
2. **Base do teto de AEC:** "CHD" (`RF-EXTRA-04`, `RN-EVT-01`, Glossário) × "CH das disciplinas" (06, `RNF-NORM-02`) × "CHR" (banco). A D-AA-2 decide **CH curricular**. Conflita com a decisão: **emenda de texto em §13 (E-4 e E-5)**, além do Glossário (FR-060).
3. **`RF-EXTRA-04` diz "por curso"; a D-AA-2 diz "por turma".** **Emenda de texto em §13 (E-5).**
4. **"Atividade Extracurricular" é termo DESCONTINUADO no Glossário (L84)**, e o pedido usa *"atividade extracurricular de alunos específicos"*. Além disso, `config_listas` tem um subtipo AEC chamado "Atividade Extracurricular". **Resolvida pela Q-3:** a classe se chama **Apoio Individualizado**, e o termo descontinuado não volta.
5. **`RN-CRONOS-02` nomeia quatro categorias** (Licença de Pagamento, Administração, Tempo Reserva, Outras) que não são o domínio `categoria_normativa` (já listada na spec 013, §11).
6. **O catálogo DEnsM embute prova e vista nas UEs** (M-2). **Resolvida pela D-CUR-1:** é o modelo certo. O tempo de avaliação está **dentro** da UE em que o currículo o computa.
7. **CH da disciplina × total da planilha diverge** em várias disciplinas (M-1). **Resolvida pela D-CUR-1:** a planilha está errada onde diverge do currículo, e a lista para os operadores está no §11-B.
8. **A cancelada sem marca** (vai para `PEND-DSA-VISTA`, §8): `DSAP-C-EXP-OBS-ME-2026-L206-V`, turma `C-Exp-Obs-ME 2026`, avaliação de 07/10/2026. Foi carregada da planilha em 06/10 e cancelada pela tela em 07/10 20:13. A recriada `DSA-MUYK0RFD-V` **não tem a vista** que ela tinha. Não mexida.
9. **`estado-atual.md` §0 e §4.3 diziam "6 turmas" acima do teto de TAD; a tabela dele marca 5.** Corrigido no próprio arquivo em 12/10/2026, com o registro do texto vencido.
10. **`docs/vibe-coding/42` L850** atribui "turma_id nulo = global" à `RN-EVT-02`, que é a regra de feriado. É referência errada.
11. **O portão de saída do Épico 8 no documento 42 (L794–795)** pede avaliação "agendada… somando na CHD", contra a L753 do mesmo documento. Conflita com a D-AA-15: **emenda de texto em §13 (E-6).**

---

## 10. As perguntas do primeiro lote — ✅ AS 10 RESPONDIDAS (12 e 13/10/2026)

As opções ficam registradas como foram consideradas. As respostas estão em *Clarifications* e já foram aplicadas aos requisitos. A Q-1 foi substituída pela D-CUR-1 em 13/10/2026, e a Q-1b caiu com ela.

### Q-1 — De onde vem o previsto das UEs, se prova e vista ganham item próprio? *(FR-031 · levantada pela medição M-2)* · ⚠️ **SUBSTITUÍDA em 13/10/2026 pela decisão D-CUR-1** (o currículo da DEnsM é a única fonte; ver *Clarifications*). As opções abaixo ficam só como registro.

O catálogo DEnsM no banco **já embute** prova e vista nas UEs: em 72 de 73 disciplinas, a soma das UEs dá a CH. Somar os itens de prova e vista por cima faria **72 disciplinas passarem da CH**.

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** O previsto **operacional** de cada UE passa a vir do `BD DISCIPLINAS` da planilha (via lote de decisões). A CH da DEnsM fica guardada na UE como **CH do currículo**, só leitura | UEs + provas + vistas = CH, como na planilha. Nada do catálogo é apagado | Duas colunas de CH por UE. As 31 disciplinas sem UE e os cursos sem planilha ficam com o previsto da DEnsM até alguém editar |
| (b) Manter o previsto da DEnsM nas UEs. Prova e vista têm previsto próprio, mas o painel **desconta** dele o tempo da UE | Não toca o catálogo | Qual UE perde o tempo é palpite: a DEnsM não diz (Q1.b proíbe a máquina inferir) |
| (c) Manter a DEnsM; prova e vista só como itens **informativos**, sem fechar a soma | Simples | Quebra o "soma a CH da disciplina" da D-AA-4 |

**Recomendação: (a).** É o que a planilha já faz, a origem tem nome (Q1.b) e o documento normativo não é reescrito.

### Q-2 — Os itens de prova substituem `avaliacoes_planejadas` e o casamento por nome? *(FR-039)* · ✅ **RESPONDIDA: opção (a); emenda proposta na §12**

A `RN-AVAL-01` manda casar planejada × real por **nome normalizado, nunca por identificador rígido 1:1**. A D-AA-4 liga o lançamento ao item **por escolha explícita** no DSA, o que é um vínculo rígido. Há 118 linhas em `avaliacoes_planejadas` (o "dever-ser" da v2.0).

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** Os itens de prova **são** o catálogo planejado da v2.1. O vínculo é explícito quando o DSA ou a carga apontam o item; o casamento por nome normalizado fica para lançamento **sem** item (histórico do ETL). `avaliacoes_planejadas` fica só de leitura | "Sem correspondência" continua existindo para o que não casa | **Exige emenda nominal à `RN-AVAL-01`** (regra 1) |
| (b) Manter os dois: itens para CH, `avaliacoes_planejadas` + casamento por nome para situação | Não emenda a regra | Dois catálogos de "prova planejada" que podem divergir |
| (c) Itens só para CH. A situação ignora o currículo e olha só as avaliações lançadas | Simples | Some o "Sem correspondência" para prova nunca lançada |

**Recomendação: (a), com a emenda escrita por você.** A regra proibia a FK porque o catálogo "é escrito por outra mão". Com a D-AA-4, quem escreve o catálogo é a própria CIAARA-11.

### Q-3 — Como se chama e como se guarda a classe de Monitoria, Português, BDA e BDF? *(FR-018 · D-AA-12)* · ✅ **RESPONDIDA: 5ª categoria, "Apoio Individualizado"**

"Atividade Extracurricular" é termo **descontinuado** no Glossário (L84), e `config_listas` tem um tipo AEC com esse nome. O domínio `categoria_normativa` é fechado (`AEC|TAD|TR|Estudo_Individual`).

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** Quinto valor do domínio: **"Atividade de Apoio a Alunos Específicos"**, com `compoe_cht` falso, como o EI | Fica estrutural: somar por engano é erro de tipo e de banco | Migration de ENUM, que a `RN-EVT-01` admite ("acrescentar categoria exige migration revisada"). Emenda da `RN-EVT-01` e do Glossário |
| (b) Marca "alunos específicos" na **lista de tipos**, mantendo a categoria normativa do tipo (EI, por exemplo) | Sem mudar o domínio | Toda soma tem de lembrar de excluir a marca: é o modo de falha do achado A-5 |
| (c) Reaproveitar o nome "Atividade Extracurricular" | Usa a palavra do pedido | Colide com o termo descontinuado e com o tipo AEC de mesmo nome |

**Recomendação: (a)**, e você escolhe o nome. O que vai acima é proposta.

### Q-4 — Parada de **todas** as turmas em **parte** do dia · ✅ **RESPONDIDA: opção (a)**

`feriados` não tem tempos: só `dia_inteiro`, `parcial` e `informativo`, e `parcial` não bloqueia (`RN-EVT-02`).

- **(a)** Parte do dia de todas as turmas = **TAD global** nos tempos indicados, bloqueante.
- (b) Novo impacto no calendário, com faixa de tempos.

**Recomendação: (a).** Não muda o calendário nem a `RN-EVT-02`, e a FR-013 já faz a global aparecer em todas.

### Q-5 — A carga converte para global o evento presente em todas as turmas? · ✅ **RESPONDIDA: (b), só via lote**

- **(a)** Sim, quando aparece com a mesma data, tempos e descrição em **todas** as turmas com DSA naquela data.
- (b) Só quando o lote de decisões mandar, turma a turma.

**Recomendação: (b).** "Todas" muda com cada turma nova sincronizada, e uma conversão automática que depende disso não é reexecutável com o mesmo resultado (VIRADA-1, princípio 3). Medido em 07/10/2026 no remoto (`estado-atual.md` §3.5): 21 eventos repetidos em 46 linhas, cerca de 2 turmas por evento, contra 10 turmas sincronizadas.

### Q-6 — Como se sabe se a turma tem regime de Estudo Obrigatório? *(FR-007)* · ✅ **RESPONDIDA: (c), as duas referências**

- **(a)** Parâmetro por curso.
- (b) Coluna no regime do curso (`curso_regime_historico`).
- (c) Mostrar as duas referências (20 % e 10 %) lado a lado, sem escolher.

**Recomendação: (c)** nesta spec, por ser informativo. (a) ou (b) quando você nomear quais cursos têm o regime.

### Q-7 — "Departamento de Alunos" (TAD hoje, 5 linhas, 7 TA) · ✅ **RESPONDIDA: (a), continua TAD**

- **(a)** Continua TAD/Administração.
- (b) Alunos específicos.
- (c) AEC.

**Recomendação: (a)**, por ser ato administrativo.

### Q-8 — Quem pode lançar a parada **só da turma** · ✅ **RESPONDIDA: (a), e a global só por Encarregado e Admin**

- **(a)** Quem lança atividade na turma, inclusive o Operador.
- (b) Só quem tem `calendario.criar`.

**Recomendação: (a).** É lançamento da turma, como uma licença.

### Q-9 — As 188 substituídas: migration de dado ou só a próxima rodada da sincronização? · ✅ **RESPONDIDA: (a)**

- **(a)** Migration de dado que lê a marca `[SUBSTITUIDO…]` e passa ao estado novo, idêntica no local e no remoto.
- (b) Só a próxima rodada da carga.

**Recomendação: (a).** A carga não roda contra todas as turmas a cada vez, e a marca é um fato que já está no banco.

### Q-10 — Os demais instrutores de uma **aula** (16 linhas hoje em `observacoes`) · ✅ **RESPONDIDA: (a)**

- **(a)** Migram para o campo novo, lendo a marca `" Demais instrutores: "`.
- (b) Só a próxima rodada.

**Recomendação: (a)**, pelo mesmo motivo da Q-9.

---

## 11. Currículo × banco × planilha — medição de 13/10/2026 (D-CUR-1)

**Artefatos (regra 9.2):**
- **Currículo:** os **24 PDFs** em `…\Documentos\SIS11\Curriculos\` (fora do git), lidos com PyMuPDF. A extração versionada está em `scripts/etl/dados/unidades_ensino.csv` (582 UEs) e `pareamento_ue.csv` (as 5 UEs do APOC transcritas de imagem e o destino de cada UE).
- **Banco:** a cópia `remoto-20261009-085410.sql`.
- **Planilhas:** `planilhas-de-origem/rodadas/2026-10-06T1541/`, as 10 de `fontes.json`.

**Rastreio de exemplo, a UE 7 Física do C-Ap-HN:**
- PDF `c-ap-hn.pdf`, p. 9: `7 - FÍSICA…… 21 HORAS`;
- `unidades_ensino.csv`, linha 235;
- `pareamento_ue.csv`, linha 235: destino `C-Ap-HN - I-I`, desdobramento N-3;
- migration `20260926024246…`, linha 474;
- banco: `UE-000234`, 21 TA.

A avaliação está na mesma página do PDF: PM de 2 TA e vista de 1 TA, *"computados na UE 7"*. A planilha traz UE 7 = 18 + PM4 2 + VP4 1 = 21, fechando com o currículo.

### 11.0 O que o currículo diz sobre avaliação

O currículo informa a avaliação na seção *"AVALIAÇÃO DA APRENDIZAGEM"* de cada disciplina. Na maioria dos casos o tempo vem **"computado na UE N"**.

| Como o currículo informa | Cursos |
|---|---|
| **Discrimina por UE**, com TA de prova e de vista | CAHO (19 de 21 disciplinas), C-Ap-FR (12 de 13), C-Ap-HN (17 de 18), C-Esp-ME (12 de 12), C-Exp-Ag-Mag, C-Exp-BATI, C-Esp-OpAP (2 de 4), EST-QF-NAVFLU-EAD |
| **Parcial:** duração, às vezes "computada na UE N"; vista quase nunca | C-ApA-AuxNav (3 de 7), C-ApA-OcOp (6 de 10), C-ApA-PCN (5 de 7), C-ApA-PrevMe (4 de 7), C-Exp-Metoc-OF-SP (3 de 4) |
| **Dá o TA, mas não diz de qual UE sai** | C-Exp-MetocOf (currículo de 2011): *"Prova Mista (PM) com duração de três (03) TA, abordando todas as UE; e … um (01) TA para a vista de provas"*. C-Esp-ALH: *"2 TA cada"*, sem dizer onde computa e sem vista |
| **Não dá o TA** | C-Exp-Obs-ME: *"uma Prova Escrita Objetiva (PE) sobre as UE 1 a 4; e … (PE) sobre a UE 5"*. EST-QF MAREFLU, PGRS100, PROC-MF-EAD, APHID e EM2040PHS: avaliação por frequência, relatório ou conceito |
| **Por competência**, com "CH DA AVALIAÇÃO" por disciplina e sem UE | C-Espc-FR e C-Espc-HN. Exemplo, MATEMÁTICA do C-Espc-HN: *"4 (quatro) TA para a aplicação e 1 (um) TA para … vista de prova. CH DA AVALIAÇÃO 5"* (30 + 11 + 5 = 46) |
| **[pendente]** | EST-QF-APOC: o PDF é digitalizado e a seção não foi lida |

- **No banco, a avaliação não tem TA nem UE.** `avaliacoes_planejadas` tem 118 linhas só de texto, com granularidade que varia de 1 linha por disciplina a 1 linha por curso.
- **A contagem de avaliações currículo × banco fica [pendente]**: exige contar instrumento a instrumento, e o leitor das seções de avaliação ainda é heurístico. O PR 4 o fecha.

### 11-A. Banco × currículo — lote de correção DO BANCO (migration de dado, após aprovação de Bernardo)

**No nível de UE: zero divergência.** As 587 UEs ativas batem 1:1 com o currículo, em UE e em CH. As divergências estão todas no nível da **disciplina**.

| # | Curso · disciplina | Banco | Currículo | O que mostra | Recomendação |
|---|---|---|---|---|---|
| B-1 | C-Ap-FR · III | CH 76 | **75** (Σ UE = 75) | Já registrado em 25/09 | Corrigir a CH para **75** |
| B-2 | C-Exp-MetocOf · I | CH 48 | **30** (Σ UE = 30) | Já registrado | Corrigir para **30** |
| B-3 | C-Exp-MetocOf · V | CH 40 | **50** (Σ UE = 50) | Já registrado | Corrigir para **50** |
| B-4 | EST-QF-APOC · I | 79 = 79 | o PDF soma **80** nas UEs (1 h de TR "embutida") | PDF digitalizado | **Conferir no PDF** antes; sem correção às cegas |
| B-5 | **C-Esp-ALH · III, PUBLICAÇÕES E NORMAS (32 h, 3 UEs)** | está como `ALH-II`, **inativa**, com o código repetindo o de Sistemas de Informação | disciplina ativa | Achado novo: 8 ativas × 9 no currículo; Σ ativa 438 × 470; 3 UEs penduradas em disciplina inativa | **Reativar** com o código certo (`ALH-III`?), conferido no currículo |
| B-6 | C-Espc-FR · XVI (TFM) | CH 47 | **48** | Σ do curso 1270 × 1271 | Corrigir para **48** |
| B-7 | C-Espc-FR · VII e outra | códigos e nomes do HN (`HN-1104-0506` "Física aplicada à Hidrografia"; `SN-1103-0506`) | `FAANFR-005` (física aplicada aos aux. à navegação), `PSFFR-014` (primeiros socorros em faróis) | CH igual (30 e 40) | Corrigir **código e nome** |
| B-8 | C-Espc-HN · NAV I e NAV II | 100 e 128 | **108 e 120** | Σ igual (1216); a planilha segue o currículo | Corrigir as duas |
| B-9 | C-Ap-HN · HN-2101 | **duas** disciplinas: I (105) + I-I (21) | **uma**, 126 | Desdobramento N-3 da carga de UEs | **Unificar** (Q-15) |
| B-10 | CAHO · MATFIS | **duas**: MAT (28) + FIS (28) | **uma**, 56 | Desdobramento | **Unificar** (Q-15) |
| B-11 | C-ApA-AuxNav / OcOp / PCN / PrevMe | AMBIENTAÇÃO como **disciplina** (8 TA cada) | **fase**, de 8 / 10 / 5 / 5 h | +1 disciplina em cada; nas três últimas a CH também diverge | **Depois**: `PEND-014-3` (Q-15) |
| B-12 | C-Exp-Metoc-OF-SP | Ambientação (8 = 8) e a IV "EFEITOS ATMOSFÉRICOS…" (18 TA) | a IV **não existe** no currículo do SP | 6 × 4 disciplinas | **Conferir**: a IV parece trazida do MetocOf. Se confirmado, **inativar** (regra 4) |

**Conformes:** C-Esp-ME, C-Esp-OpAP, Ag-Mag, BATI, Obs-ME e os EST-QF APHID, EM2040PHS, MAREFLU, NAVFLU-EAD, PGRS100 e PROC-MF-EAD.

✅ **APROVADAS EM BLOCO por Bernardo em 13/10/2026, pela regra D-CUR-1** (B-11 adiada para a `PEND-014-3`). Na implementação, cada correção é uma migration de dado com backup, dry-run, conferência só de leitura e plano de reversão, e **antes de aplicar** Bernardo vê o impacto **caso a caso**: lançamentos que mudam de disciplina e CH antes e depois (FR-031.1). Os casos marcados "conferir" (B-4, B-5 no código, B-12) são conferidos no PDF nesse mesmo momento, e o resultado vai junto do impacto.

### 11-B. Planilha × currículo — lista para os operadores (a planilha está errada onde diverge)

| Turma | Total por disciplina = currículo | Divergências de total | Prova e vista × currículo |
|---|---|---|---|
| CAHO 2026 | 21 de 21 | — | III (Estatística): prova 3 × 2. Redistribuição por UE em III, V, VI e VII |
| C-Ap-HN 2026 | 18 de 18 (a I = 126) | — | XVII (TFM): prova 7 × 4. IV: visita `VT` de 4 TA tirada da UE 2. UE 8 da XVIII: 9 × 10. Diferenças por UE em XVI |
| C-Ap-FR 2026 | 10 de 13 | III 76 × 75; **IV 99 × 104**; **XIII 117 × 160** (faltam as UEs 1–5 do currículo) | III vista 1 × 2; X prova 6 × 4; XIII vista 8 × 1. Linhas `XX RECON` sem correspondente no currículo: I 3, II 2, IV 10, V 25 TA |
| C-Esp-ME 2026 | 9 de 12 | IV 27 × 22; VIII 56 × 48; **XI 88 × 72** | VI prova 4 × 6. UEs redistribuídas em I, II, III e VI |
| C-Espc-FR 2026 | 15 de 17 | V 88 × 80 (8 TA de visita APOINST); XI (BALTO) sem CH × 113 | CH da avaliação: III 17 × 18; XIII 11 × 15; XVI (TFM) 7 × 6; XI 0 × 8 |
| C-Espc-HN 2026 | 14 de 14 | — | I 3 × 5; IV (TFM) 5 × 6; IX 13 × 19 |
| C-Exp-MetocOf 2026 | 3 de 5 | I 48 × 30 (12 UEs × 7); V 49 × 50 | Prova e vista iguais. UE 2 da II: 11 × 15; UE 11 da III: 2 × 5 |
| C-Exp-Obs-ME 2026 | 2 de 2 | — | O currículo não dá TA. A planilha separa prova 5 e vista 2 (I), 6 e 2 (II), tiradas das UEs 3–5 e 3–4. No catálogo, sem tempo previsto (Q-12) |
| C-Exp-Ag-Mag 2026 | 2 de 2 | — | II: o currículo pede TG de 2 TA + 1 de comentários, e a planilha não tem linha de avaliação. I: UE 5 só na planilha (1 TA) |
| C-Exp-BATI T1 2026 | 1 de 1 | — | Igual |

**Ressalva da medição:**
- As divergências de **total** e de **prova/vista** foram conferidas no texto do PDF.
- As divergências **por UE** são indício. Usam a conta "UE da planilha = UE do currículo − avaliação computada nela" com um leitor heurístico.
- A lista oficial é a que a sincronização emitir (FR-036.1).

✅ **Decisão de 13/10/2026:** esta tabela **é a lista de erros de planilha para os operadores**. Nada a aplicar no banco.

---

## 12. Proposta de emenda da `RN-AVAL-01` (Q-2) — para aprovação de Bernardo

**Regra 1 do `CLAUDE.md`:** o documento 04 só muda com autorização nominal. Esta é a **proposta**. Nada foi escrito no documento 04, e o `.docx` não será emendado.

### Texto ANTES (`docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`, L336, literal)

> **RN-AVAL-01. [REVISADA]** O catálogo de avaliações planejadas é estático e correspondido às avaliações realmente agendadas por casamento de **nome normalizado** (maiúsculas, sem acento, tolerante a abreviação em qualquer direção) — nunca por um identificador rígido 1:1. Uma matéria planejada sem correspondência encontrada é reportada como "Sem correspondência", nunca escondida ou descartada. Nesta revisão, o sistema deixa de interpretar funcionalmente `Formula_MF` e `Carater` (fórmula de média final e caráter eliminatório) — esses campos tornam-se informativos apenas, se mantidos no schema (documento 05, achado k). A avaliação passa a ser acompanhada somente por situação de execução: Concluída, Em andamento, Pendente, Atrasada ou Sem correspondência; uma vista de prova que ultrapasse 7 dias corridos após a aplicação sem ter sido registrada como realizada é marcada Atrasada. **Risco: Médio.** *Origem: documento 08, Tema F; decisão D5.*

E da implementação (L338), o trecho que a emenda toca:

> **A regra proíbe explicitamente identificador rígido 1:1, e essa proibição é preservada apesar da tentação óbvia** de, tendo um banco relacional, transformar o casamento em FK — o casamento é heurístico por natureza, porque o catálogo planejado é estático e escrito por outra mão. A FK, portanto, **não é criada**; o resultado do casamento é derivado em leitura.

### Texto DEPOIS (proposto)

> **RN-AVAL-01. [REVISADA — v2.1, 13/10/2026]** O catálogo de avaliações planejadas da v2.1 são as **avaliações previstas no currículo da DEnsM de cada disciplina**, transcritas no sistema com o instrumento, os tempos de aplicação e de vista e a unidade de ensino em que o currículo os computa. Toda avaliação lançada no Detalhe Semanal de Aula, ou trazida pela sincronização das planilhas de controle, **aponta explicitamente a avaliação do currículo que cumpre**, quando a disciplina tiver avaliação transcrita. O **histórico** — as avaliações migradas da v2.0, que não apontam item, e o catálogo planejado da v2.0, que fica só de leitura — continua correspondido por casamento de **nome normalizado** (maiúsculas, sem acento, tolerante a abreviação em qualquer direção), nunca por identificador rígido 1:1. Uma avaliação do currículo sem lançamento ligado depois do término do curso da turma, ou uma planejada histórica sem correspondência encontrada, é reportado como "Sem correspondência", nunca escondido ou descartado. *(O resto do texto, de "Nesta revisão, o sistema deixa de interpretar…" até "…é marcada Atrasada", fica igual.)* **Risco: Médio.** *Origem: documento 08, Tema F; decisão D5; emenda de Bernardo Villas Boas, 12/10/2026, spec 014 (Q-2).*

E na implementação:

> **A proibição de identificador rígido 1:1 vale para o casamento que a máquina teria de adivinhar**: o planejado da v2.0, texto livre de outra mão. Por isso o casamento do histórico continua heurístico e derivado em leitura. **O catálogo da v2.1 é a transcrição do currículo da DEnsM** (spec 014, D-CUR-1), com origem por página, e a avaliação nova aponta a avaliação do currículo **por escolha explícita de quem lança**. Aqui o vínculo é um fato registrado, não um palpite. A FK **existe para a avaliação do currículo** e **não existe** para o planejado da v2.0.

**Por que a emenda não trai a regra:** a regra proibia a FK porque a máquina teria de **adivinhar** a correspondência com um catálogo escrito por outra mão. Com a D-AA-4 e a D-CUR-1, quem escolhe a avaliação é **a pessoa que lança**, e o catálogo é o próprio currículo, transcrito com origem. A proibição de inferir continua inteira para o que é inferência.

**O que esta emenda NÃO muda:** as cinco situações; o prazo de 7 dias contado da aplicação; `Formula_MF` e `Carater` só informativos; e "Sem correspondência" sempre visível.

---

## 13. Emendas de texto — documentos que conflitam com decisões de Bernardo

Pela decisão de 13/10/2026, as divergências da §9 que **conflitam com decisão de Bernardo** entram aqui como **emenda de texto**. Elas são aplicadas na implementação (FR-061), **só no `.md`**, com o registro de que o `.docx` não as recebeu. As demais divergências da §9 (itens 5, 8, 9 e 10) ficam **só listadas**.

| # | Documento · item | Texto ANTES (literal) | Texto DEPOIS | Decisão que autoriza |
|---|---|---|---|---|
| **E-1** | 04 · `RN-AVAL-02` (L360) | *"…agendar uma avaliação já produz o consumo de tempos de aula correspondente (`RN-EVT-03`), e atualizar seu status de execução não exige um segundo lançamento independente."* | *"…o registro da avaliação no Detalhe Semanal de Aula produz o consumo de tempos de aula correspondente (`RN-EVT-03`) na mesma linha, sem segundo cadastro. **Agendar, sem lançar no DSA, não consome TA** (decisão de 12/10/2026, spec 014, D-AA-15).* E atualizar seu status de execução não exige um segundo lançamento independente." | D-AA-15 |
| **E-2** | 02 · `RF-AVAL-04` (L210) | *"Toda avaliação e vista de prova agendada deve consumir tempos de aula e refletir no Detalhe Semanal de Aula e no Cronograma…"* | *"Toda avaliação e vista de prova **registrada no Detalhe Semanal de Aula** deve consumir tempos de aula e refletir no Detalhe Semanal de Aula e no Cronograma…"*. O resto fica igual | D-AA-15 |
| **E-3** | 02 · `RF-AVAL-05` (L212) | *"…agendar uma avaliação deve produzir o correspondente consumo de tempos de aula, sem exigir um segundo lançamento manual."* | *"…**registrar a avaliação no Detalhe Semanal de Aula** produz o correspondente consumo de tempos de aula na mesma linha, sem exigir um segundo lançamento manual. Agendar sem registrar não consome TA (D-AA-15)."* | D-AA-15 |
| **E-4** | 04 · `RN-EVT-01`, AEC (L347) | *"Teto normativo: 10% do somatório das CHD do curso."* | *"Teto: **o número declarado no currículo do curso**; quando o currículo não declara, 10% da **CH curricular** (somatório das cargas horárias das disciplinas do currículo). **Calculado por turma e apenas informativo**."* E, no mesmo item, TAD e TR passam a dizer o mesmo, com 5% e 10% | D-AA-2, Q-16 |
| **E-5** | 02 · `RF-EXTRA-04` (L228) | *"…calcular e sinalizar, por curso, o cumprimento dos tetos normativos: AEC ≤ 10% do somatório das CHD das disciplinas do curso; TAD ≤ 5% e TR ≤ 10% da Carga Horária Real (CHR) do curso."* | *"…calcular e sinalizar, **por turma**, o cumprimento dos tetos: **o número que o currículo do curso declara**, ou, quando não declara, o percentual **sobre a CH curricular**: AEC ≤ 10%, TAD ≤ 5% e TR ≤ 10%. **A sinalização é informativa e nunca bloqueia**; a página do curso agrega as turmas."* | D-AA-2 |
| **E-6** | 42 · portão de saída do Épico 8 (L794–795) | *"avaliação agendada aparecendo no DSA e somando na CHD."* | *"avaliação **registrada no DSA** aparecendo no DSA e somando na CHD; agendada sem registro não soma."* | D-AA-15 |

| **E-7** | 04 · `RN-2027-03` (L284) | *"As reservas de Administração e Tempo Reserva por curso são valores fixos por curso, extraídos diretamente do PROENS do ano corrente (…); cursos sem essas reservas detalhadas no PROENS usam um valor de reserva genérico."* | *"As reservas de **Atividades Extraclasse, Administração e Tempo Reserva** são valores **por turma e por ano**, extraídos do PROENS e **editáveis** por Admin, Encarregado e Ajudante da Divisão, com registro de quem e quando; turmas sem essas reservas no PROENS usam o valor genérico **como sugestão**."* O resto (posição dos blocos no motor preditivo) fica igual. ✅ **Aprovada** por Bernardo em 13/10/2026 | D-TETO-1, Q-16 |

**Também emendados, pelas decisões desta spec:**
- `RN-EVT-01` e Glossário: Apoio Individualizado (Q-3);
- `RN-EVT-04`: parada (D-AA-13);
- `RN-EVT-01`: dia parado fora da CHT (Q-14);
- `RN-AVAL-01`: §12;
- Glossário: FR-060.

---

## 14. Perguntas restantes — lote de 13/10/2026 — ✅ AS 5 RESPONDIDAS (13/10/2026)

*As respostas estão em* Clarifications *e aplicadas no corpo. As opções ficam como registro.*

### Q-11 — O currículo dá o tempo da avaliação, mas não diz de qual UE ele sai. Como o sistema registra? · ✅ **RESPONDIDA: (a), com aviso no painel (FR-031.3)**

**Exemplos reais:**
- **C-Exp-MetocOf 2011:** *"Prova Mista (PM) com duração de três (03) TA, abordando todas as UE; e … um (01) TA para a vista"*. Os 4 TA estão dentro da CH da disciplina, mas o currículo não diz de qual UE saem.
- **C-Esp-ALH:** *"2 TA cada"*, sem dizer onde computa e sem vista.
- **C-ApA:** algumas avaliações com duração e sem UE.

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** A avaliação fica no **nível da disciplina**, dentro da CH dela. O conteúdo da disciplina passa a ser a soma das UEs menos as avaliações sem UE, e o painel mostra *"o currículo não diz de qual UE sai"* | Não inventa UE, e a CH da disciplina fecha | O painel por UE não desconta essa avaliação de UE nenhuma |
| (b) Você nomeia a UE caso a caso, num lote, com a origem *"decisão CIAARA-11, dd/mm"* | O painel por UE fica completo | É escolha humana sobre o que o currículo não diz, e precisa de registro |
| (c) A última UE abordada pela prova perde o tempo | Automático | **A máquina inferindo** (Q1.b proíbe) |

**Recomendação: (a)**, com (b) disponível a qualquer tempo: se você nomear a UE de uma delas, ela desce para a UE.

### Q-12 — O currículo não dá o TA da avaliação. Ela entra no catálogo com quantos TA? · ✅ **RESPONDIDA: (a), sem tempo previsto (FR-031.4)**

**Exemplos reais:**
- **C-Exp-Obs-ME:** *"uma Prova Escrita Objetiva (PE) sobre as UE 1 a 4; e … (PE) sobre a UE 5"*, sem TA e sem vista. A planilha usa 5 + 2 e 6 + 2.
- **EST-QF:** MAREFLU, PGRS100, PROC-MF-EAD, APHID e EM2040PHS avaliam por frequência, relatório ou conceito.

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** A avaliação entra no catálogo **com o instrumento e as UEs abordadas, e TA "não informado pelo currículo"**. O lançamento no DSA consome o tempo das UEs abordadas, como conteúdo | Fiel ao currículo: o tempo já está nas UEs. Nada é inventado | O painel não mostra "prova x/y" nessas disciplinas |
| (b) Você fixa o TA caso a caso, com origem *"decisão CIAARA-11"* | O painel completo | Número que o currículo não deu, mesmo com registro |
| (c) Usar o TA da planilha | Fecha com a prática | **Contraria a D-CUR-1** (a planilha não é fonte) |

**Recomendação: (a).** Os EST-QF que avaliam por frequência ou conceito ficam **sem** avaliação de TA no catálogo, porque não há prova com tempo.

### Q-13 — Uma licença NÃO prevista de TODAS as turmas, que "consome Tempo Reserva", é gravada como? · ✅ **RESPONDIDA: (a), TR global bloqueante (FR-025.1)**

O calendário (`feriados`) não tem categoria nem tempos. Hoje ele só diz "dia inteiro / parcial / informativo", e o que entra nele **não** consome TR (decisão de 13/10).

**Exemplo:** o Comando concede uma licença administrativa não prevista a todo o Centro na sexta 23/10, e o operador marca "consome TR".

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** **Uma atividade TR global, bloqueante**, nos tempos do dia. **Não** vai para o calendário | O TR de cada turma com DSA na data sobe, e a grade bloqueia. É o mesmo mecanismo da Q-4 | O dia não desconta capacidade como feriado (`RN-EVT-02`); quem o "desconta" é o TR consumido |
| (b) Linha no calendário **e** uma TR por turma | O dia aparece no calendário | Dois registros do mesmo fato, que podem divergir |
| (c) Licença global nunca consome TR; só a da turma | Simples | Contraria o caso de uso descrito |

**Recomendação: (a).**

### Q-14 — A parada PREVISTA de uma turma (licença administrativa, licença de pagamento) conta no teto de TAD? · ✅ **RESPONDIDA: NÃO.** Decisão de Bernardo, **contra a recomendação (a)**: feriado e licença previstos ficam na linha própria "dias parados", fora do TAD e da CHT (FR-025.3 a FR-025.5)

**Exemplo real:**
- No C-Ap-FR 2026 o TAD é **89 TA** contra um teto de 58,25 (M-5). Uma LA de um dia inteiro, com 8 TA de regime, soma mais 8 TA de TAD.
- A carga das planilhas **já** grava dia parado de algumas turmas como TAD "Administração" (`resolver.py:539–557`), então isso já conta hoje.

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** Conta como **TAD**, com o tipo da parada em subtipo próprio, totalizado à parte (como a `RN-CRONOS-02` faz com "Licença de Pagamento") | Coerente com a Q-16 da spec 013 e com o dado de hoje | O teto de TAD reflete licenças; o percentual sobe |
| (b) **Não conta** em teto nenhum: só bloqueia o dia, como o feriado global | O TAD mede só administração "de verdade" | Licença da turma vira algo que não é AEC, TAD, TR nem EI, e sai da CHT: é uma 6ª classe sem decisão |

**Recomendação: (a).** O teto é informativo, e o subtipo separado deixa ver quanto do TAD é licença.

### Q-15 — "Quantidade de disciplinas idêntica ao currículo" obriga a desfazer os desdobramentos que o banco tem? · ✅ **RESPONDIDA: (c)**: unificar HN-2101 e MATFIS por migration (FR-031.5); Ambientação para depois (`PEND-014-3`)

São **três** casos medidos (§11-A):
- **B-9 · C-Ap-HN HN-2101:** no banco, I (105) + I-I (21); no currículo, **uma** disciplina de 126. É o desdobramento N-3, que a carga de UEs fez para a Física.
- **B-10 · CAHO MATFIS:** no banco, MAT (28) + FIS (28); no currículo, **uma** de 56.
- **B-11 · Ambientação dos C-ApA:** no banco é **disciplina** (8 TA); no currículo é **fase**, de 8 / 10 / 5 / 5 h.

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** **Unificar** como o currículo: uma disciplina só, com as UEs de ambas. A extra é **inativada** (regra 4) e os lançamentos dela são movidos para a unificada por migration de dado; a Ambientação sai de disciplina | Banco idêntico ao currículo em quantidade, como a D-CUR-1 manda | Toca lançamentos reais (aulas da I-I, de FIS). Migration com o rito e prova de contagem antes e depois |
| (b) Manter o desdobramento como **visão** da disciplina do currículo (sub-disciplinas que somam a uma) | Não mexe em lançamento | A quantidade continua diferente do currículo, contra a letra da D-CUR-1 |
| (c) Unificar HN-2101 e MATFIS, e decidir a Ambientação à parte | Separa o que é desdobramento do que é fase | Dois movimentos |

**Recomendação: (c).** Os dois desdobramentos são exatamente o que a D-CUR-1 proíbe, e a unificação tem regra clara. A Ambientação é outra coisa: o currículo a trata como **fase do curso, com horas**. Ela pede a sua palavra sobre onde essas horas ficam: TAD, AEC ou uma disciplina que o currículo não chama assim.

---

## 15. Medições de 13/10/2026 para os acréscimos (D-CUR-2 e D-TETO-1)

**Artefatos (regra 9.2):**
- os **24 PDFs** dos currículos (`…\Documentos\SIS11\Curriculos\`, fora do git), seção *"AVALIAÇÃO DA APRENDIZAGEM"* de cada disciplina e quadro final de carga horária;
- a cópia `remoto-20261009-085410.sql` (tabelas `reservas_proens` e `config_parametros`);
- as planilhas de `planilhas-de-origem/rodadas/2026-10-06T1541/`, aba **CRONOS**.

### M-7. Avaliações previstas no currículo, por curso e por caso

⚠️ **As contagens são de um leitor heurístico** do texto das seções de avaliação, com as correções feitas à mão onde o texto foi relido (ALH, MetocOf, Obs-ME, as OD). Os números marcados **≈** podem variar de uma ou duas unidades. **A contagem oficial é a da transcrição do PR 4** (FR-037), que traz a página de cada item.

| Curso | Como o currículo informa | Avaliações (prova + trabalho) | Tempo de aplicação | Vistas | Tempo de vista | O que fica para arbitrar |
|---|---|---|---|---|---|---|
| CAHO | por UE em 16 de 21; o resto só por disciplina | ≈ 48 | ≈ 152 TA | ≈ 44 | ≈ 44 TA | a vista dos 2 trabalhos da XX (*"será alocado tempo"*, sem número). A XVIII (LHFC) é OD, sem tempo (Q-17) |
| C-Ap-FR | por UE em 12 de 13 | ≈ 25 | ≈ 71 TA | ≈ 24 | ≈ 24 TA | nada; a XIII é OD + 1 TA de comentários (Q-17) |
| C-Ap-HN | por UE em 17 de 18 | ≈ 38 | ≈ 110 TA | ≈ 37 | ≈ 37 TA | nada; a XVIII é OD + 1 TA de comentários (Q-17) |
| C-Esp-ME | por UE em 12 de 12 | ≈ 19 | ≈ 51 TA | ≈ 19 | ≈ 19 TA | nada |
| C-Esp-OpAP | por UE em 3 de 4; a IV só por disciplina | 5 | 8 TA | 4 | 4 TA | nada |
| C-Exp-Ag-Mag | por UE | 3 | 6 TA | 3 | 3 TA | nada |
| C-Exp-BATI | por UE | 2 | 6 TA | 2 | 2 TA | nada |
| C-Espc-FR | por competência: "CH da avaliação" por disciplina | 15 disciplinas avaliadas | 91 TA | — | 25 TA | as 2 disciplinas sem CH de avaliação (`PREVACFR-008`, `MFMFR-003`) |
| C-Espc-HN | idem | 14 disciplinas avaliadas | 86 TA | — | 26 TA | `HN-1104-0730` (quantidade sem tempo) |
| C-Exp-MetocOf | só por disciplina (currículo de 2011) | 4 PM | 10 TA | 4 | 4 TA | nada; a V é OD em apresentação (Q-17) |
| C-Exp-Metoc-OF-SP | por UE em 3 de 4 | 3 | 7 TA | 0 | — | as vistas; a IV é OD (Q-17) |
| C-Esp-ALH | só por disciplina | **12** (II tem 3; VIII tem 2; IX tem PE + estudo de caso) | **26 TA** em 11; o estudo de caso sem tempo | **0** | — | **todas as vistas** e o tempo do estudo de caso |
| C-Exp-Obs-ME | **quantidade sem tempo** | **4 PE** (2 por disciplina) | **mudo** | **mudo** | **mudo** | **tudo**. Sugestão da planilha: DHN-0225 prova 5 + vista 2; DHN-0513 prova 6 + vista 2 (TA por disciplina) |
| C-ApA-AuxNav, OcOp, PCN, PrevMe | parcial; as disciplinas finais são entrega de trabalho no AVA | ≈ 8, 13, 6, 7 | ≈ 8, 28, 12, 14 TA | ≈ 3, 4, 0, 0 | — | sem turma em 2026 e EAD sem DSA; fica para quando houver |
| EST-QF APHID, EM2040PHS, MAREFLU, PGRS100, PROC-MF-EAD | aprovação por **frequência** | 0 | — | 0 | — | nada a prever |
| EST-QF-NAVFLU-EAD | por UE | 1 | 2 TA | 0 | — | EAD, sem DSA |
| EST-QF-APOC | PDF digitalizado | **[pendente]** | | | | |

**Sugestão da planilha para o grupo a arbitrar:** só o **C-Exp-Obs-ME** tem turma com planilha em 2026. Os outros mudos (ALH, CAHO XX quanto à vista, C-Espc quanto aos sem CH) **não têm sugestão** e começam *"não definido"*.

### M-8. Onde está hoje o previsto do PROENS, e os limites máximos

**O previsto do PROENS, hoje:**
- **Banco:** `reservas_proens`, **por curso e ano**, só **TAD** ("Administração") e **TR**; o tipo `tipo_reserva` aceita só esses dois. São **12 linhas**, todas de 2026, origem `RESERVAS_PROENS (Versao 1.0/Codigo.gs)`: CAHO 6/121, C-Ap-HN 5/16, C-Ap-FR 5/89, C-Espc-HN 3/100, C-Espc-FR 0/7, e a **genérica** (sem curso) 2/0, que a `RN-2027-03` manda usar para curso sem reserva própria. **Não há AEC.** A escrita exige `calendario.criar`/`editar`.
- **Planilhas:** a aba **CRONOS** de cada turma traz uma coluna *"carga horária prevista"* por bloco, mas **com rótulos diferentes por planilha** ("TOTAL RESERVA", "TEMPO RESERVA", "ADMINISTRAÇÃO", "TOTAL EXTRA-CLASSE", "NONO TEMPO"). Exemplos: CAHO, reserva 166 e extraclasse 149; C-Ap-HN, reserva 78 e extraclasse 65; C-Esp-ME, reserva 63 e extraclasse 22.
- ⚠️ **As planilhas não contam feriado e licença do mesmo jeito:**
  - no C-Esp-ME, feriado e licença de pagamento estão **dentro** da reserva (63 = 35 + 28);
  - no C-Ap-HN, estão num bloco "nono tempo", **fora** dos 1.400.

  A Q-14 já decidiu como o sistema conta. A diferença vai para a lista dos operadores (§11-B).
- **Documento PROENS:** não está no repositório.

**Os limites máximos: o currículo declara um número, e ele nem sempre é o percentual.** O quadro final de cada currículo diz *"CARGA HORÁRIA REAL · ATIVIDADES EXTRACLASSE · TEMPO RESERVA · CARGA HORÁRIA TOTAL"*. Os C-Espc dizem também o TAD. A CH real é a soma das disciplinas, e o total fecha: no CAHO, 1.668 + 166 + 166 = 2.000. O percentual normativo vem de `config_parametros`: `teto.aec_percentual_chr` 10, `teto.tad_percentual_chr` 5 e `teto.tr_percentual_chr` 10.

| Curso | CH real | AEC no currículo (10 %) | TR no currículo (10 %) | TAD no currículo (5 %) |
|---|---|---|---|---|
| CAHO | 1.668 | 166 (166,8) | 166 (166,8) | — (83,4) |
| C-Ap-FR | 1.164 | 110 (116,4) | **126 (116,4) ↑** | — (58,2) |
| C-Ap-HN | 1.257 | 65 (125,7) | 78 (125,7) | — (62,85) |
| C-Esp-ME | 545 | 43 (54,5) | 42 (54,5) | — (27,25) |
| C-Esp-ALH | 470 | 30 (47) | 20 (47) | — (23,5) |
| C-Esp-OpAP | 77 | 1 (7,7) | 2 (7,7) | — (3,85) |
| C-Exp-Ag-Mag | 140 | 10 (14) | 10 (14) | — (7) |
| C-Exp-BATI | 42 | 3 (4,2) | 4 (4,2) | — (2,1) |
| C-Exp-MetocOf | 154 | 6 (15,4) | 15 (15,4) | — (7,7) |
| C-Exp-Obs-ME | 115 | 5 (11,5) | **20 (11,5) ↑** | — (5,75) |
| C-Espc-FR | 1.271 | 80 (127,1) | 57 (127,1) | 62 (63,55) |
| C-Espc-HN | 1.216 | 80 (121,6) | 112 (121,6) | **62 (60,8) ↑** |
| EST-QF APHID / EM2040PHS / MAREFLU / PGRS100 | 72 / 20 / 60 / 30 | — | **8 ↑ / 4 ↑** / 4 / **5 ↑** (7,2 / 2 / 6 / 3) | — |
| C-ApA, C-Exp-Metoc-OF-SP, EST-QF EAD | — | não declaram; o quadro traz só ambientação e fases | | |

↑ = o currículo declara **mais** que o percentual. Em todos os outros casos declara **menos**, às vezes bem menos: a AEC do C-Ap-HN é 65 contra 125,7. **É a Q-16.**

---

## 16. Perguntas de modelagem dos acréscimos — lote de 13/10/2026 — ✅ AS 2 RESPONDIDAS (13/10/2026)

### Q-16 — O "limite máximo" do card é o número que o currículo declara ou o percentual da norma? · ✅ **RESPONDIDA: (a)**, com a origem *"currículo"* ou *"norma"* no card (FR-001.1); E-7 aprovada

**Por que importa:** os dois divergem em todos os cursos medidos (M-8), e o card mostra um número só.
- **C-Ap-HN, AEC:** o currículo declara 65, e 10 % da CH real dá 125,7.
- **C-Ap-FR, TR:** o currículo declara 126, e o percentual dá 116,4.
- **C-Espc-HN, TAD:** o currículo declara 62, e o percentual dá 60,8.

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** O **número do currículo**, quando ele declara. O **percentual**, quando não declara: TAD fora dos C-Espc, e cursos sem quadro. A origem aparece no card | Coerente com a D-CUR-1, porque o currículo é a fonte | Em 3 casos o máximo fica **acima** do percentual da `RN-EVT-01`. A norma vira só o padrão |
| (b) **Sempre o percentual**, com o número do currículo ao lado, como referência | A `RN-EVT-01` fica intacta como teto | Mostra um "máximo" que o próprio currículo contradiz, e a AEC do C-Ap-HN aparece com 125,7 de folga quando o currículo dá 65 |
| (c) **O menor dos dois** | Nunca permite mais que nenhuma das duas fontes | Mistura origens, e o operador não sabe de onde veio o número sem ler a origem |

**Recomendação: (a).** Exige transcrever o quadro final dos 24 currículos (dado, migration do PR 1) e ajustar o texto da E-4.

### Q-17 — Observação de desempenho (OD) conta como avaliação no "N aplicadas de M"? · ✅ **RESPONDIDA: (a)**, com o complemento *"+ K avaliações contínuas (OD)"* e a situação em andamento / concluída (FR-051, FR-056, FR-056.1)

**Por que importa:** o card conta prova e trabalho (D-AV-1). A OD não é nenhum dos dois, e em algumas disciplinas ela é a **única** avaliação.

**Exemplos reais:**
- **CAHO XVIII:** LHFC, 200 TA, *"1 (uma) OD durante a realização das tarefas"*.
- **C-Ap-FR XIII e C-Ap-HN XVIII:** práticas de fim de curso, só OD, com *"1 TA para os comentários"*.
- **C-Exp-MetocOf V e C-Exp-Metoc-OF-SP IV:** OD nas apresentações.
- **CAHO V e VI:** a OD entra na média, junto com as provas.

| Opção | O que significa | Implicação |
|---|---|---|
| **(a)** A OD **não** entra no "N de M". Aparece na lista da disciplina como *"avaliação contínua (OD)"*, sem tempo próprio, porque o currículo diz que ocorre **durante** as tarefas. Os comentários da OD, quando o currículo dá tempo (1 TA), contam em *"vistas realizadas"* | Literal com a D-AV-1. Não inventa tempo nem lançamento | Disciplinas só com OD mostram *"0 de 0 provas e trabalhos · avaliação contínua (OD)"* |
| (b) A OD **entra** no "N de M", com tempo 0, e é "aplicada" quando o operador a marca no DSA | Toda disciplina avaliada aparece no card | Pede um lançamento novo sem tempo, que o DSA hoje não tem |
| (c) A OD entra, com tempo **arbitrado** | Card completo | Arbitra tempo para algo que o currículo diz acontecer dentro da aula |

**Recomendação: (a).** O **estudo de caso** do C-Esp-ALH IX é tratado como **trabalho** (FR-031.12), não como OD.
