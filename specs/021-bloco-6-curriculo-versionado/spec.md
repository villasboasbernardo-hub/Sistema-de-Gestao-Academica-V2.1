# Feature Specification: Bloco 6 — currículo versionado

**Feature Branch**: `feat/BLOCO-6-curriculo-versionado`
**Created**: 2026-10-21
**Status**: Portão (regra 9.4) — desenho medido, **sem** aplicação no remoto
**Input**: Bloco 6 do plano de correções, pelo `/corrigir` de Bernardo Villas Boas de 20/10/2026 (pedido de 16/10/2026):
*"poder registrar um currículo NOVO de um curso — disciplinas, UEs, CH, avaliações do currículo, duração em semanas, tudo o
que for preciso — SEM alterar o currículo em vigor (…) e as turmas em andamento continuam regidas pelo currículo atual,
sem nenhum acompanhamento estragado."*

## 1. O problema, em uma frase

O currículo **é o curso** — mudar uma CH, uma UE ou uma avaliação do currículo muda o acompanhamento de toda turma do
curso, inclusive das que estão em andamento; não há como preparar o currículo do ano seguinte sem estragar o deste.

## 2. Paridade ou novidade (regra 3)

**Novidade**, autorizada nominalmente por Bernardo Villas Boas (resposta 7 da triagem de 16/10/2026, e o `/corrigir` de
20/10/2026). Épico próprio, por último no plano de correções.

## 3. O que é banco e o que é tela

- **Banco (PR 1, este portão):** a tabela das versões; o currículo de hoje vira a versão 1 de cada curso, com toda turma
  ligada a ela; tudo o que lia o currículo **pelo curso** passa a ler **pela versão da turma**; a troca de versão da
  turma e a trava da versão em uso. **Altera o que existe** — portão da regra 9.4.
- **Código e telas (PR 2):** a cópia da versão; os leitores do código pela versão da turma (DSA, planilha, abas do curso,
  ficha, sincronização); o seletor de versão e a criação da versão nova na tela.

## Clarifications

### Session 2026-10-21 *(todas adotadas por padrão — Bernardo confere no fim, no portão)*

- D-1 · Q: Como a versão guarda o currículo? → A: a versão é **dona** das disciplinas (e, por elas, das UEs e das
  avaliações do currículo) e dos limites: a versão nova é uma **cópia** das linhas, com a mesma **linhagem**. Alternativa:
  uma camada de "diferenças" sobre as disciplinas de hoje — rejeitada, porque cada leitor de CH teria de juntar as duas.
- D-2 · Q: Qual a vigência da versão 1? → A: **desde sempre** (01/01/2020, o primeiro ano que `turmas_ano_valido` aceita).
  A turma escolhe pela **data de início** (sem data, 1º de janeiro do ano letivo). Alternativa: vigência por ano letivo.
- D-3 · Q: A versão da turma pode ser "nula = a vigente", como o regime de horário? → A: **Não**: a versão é **fixa** na
  turma (`NOT NULL`). Nula, uma versão nova com vigência no passado trocaria em silêncio a versão de turma em andamento.
- D-4 · Q: O que a trava da versão em uso pega? → A: tudo o que **muda número**: incluir, inativar ou reativar disciplina,
  UE, avaliação do currículo ou limite; a CH, o código, o período (dele saem as semanas e a média semanal do instrutor) e o
  modo de atribuição da disciplina; a CH e o número da UE; instrumento, número, TA e UE da avaliação do currículo; os TA
  do limite. **Os textos ficam livres** (nome, nome no DSA, tópico, técnica, local, fundamento, ordem). ⚠️ **Consequência
  medida:** **10 dos 24 cursos** entram com a versão 1 travada, e corrigir um número errado na versão em uso deixa de ser
  possível pela tela. Alternativas: (b) o Admin corrige com justificativa registrada — exceção nominal, não desenhada;
  (c) travar também os textos.
- D-5 · Q: A trava vale sem sessão? → A: **Não**: migration, ETL e script de manutenção passam — são atos revistos
  (portão, rito do remoto), e o ETL corrige `modo_atribuicao_padrao` depois da carga. Alternativa: travar também sem
  sessão (o ETL abortaria).
- D-6 · Q: O tempo **arbitrado** da avaliação do currículo também trava? → A: **Sim** (é número do currículo); o **ajuste
  por turma** (`avaliacoes_curriculo_turma`) segue livre e é o instrumento das turmas em andamento. Alternativa: liberar o
  arbitrado que preenche um valor que o currículo não definia (nulo → valor).
  ⚠️ **Medido no CI do ramo (`antes-depois.md` §8): a trava estrita derruba TRÊS funções de hoje** — nomear a UE de um
  item, definir o tempo "não definido" e acrescentar/inativar avaliação do currículo — nos 10 cursos com turma em
  andamento. **Alternativa concreta para o portão:** **completar o indefinido fica livre** (TA nulo → valor, UE nula →
  UE: o passado mostrava *"não definido"*, e defini-lo não reinterpreta número que existia); **mudar o que já está
  definido** e **acrescentar ou inativar item** seguem travados. Com ela, os dois primeiros percursos voltam; o terceiro
  continua recusado na versão em uso (a amostra dele passaria a usar curso sem turma com lançamento).
- D-7 · Q: Trocar a versão de uma turma sem lançamento perde o planejamento? → A: **Não**: as linhas da versão velha ficam
  inativas e as da nova levam, **por linhagem**, o período da linha, as atribuições de instrutor, o rateio por UE e os
  ajustes de avaliação; o que não tem correspondência nasce como em turma nova. Alternativa: recusar a troca quando há
  planejamento.
- D-8 · Q: E a turma que muda de curso (`FR-026`, caminho 4)? → A: vai para a versão vigente do curso novo, e as linhas
  são trocadas como em D-7. Alternativa: recusar a mudança de curso.
- D-9 · Q: Disciplina ou limite gravado sem versão num curso com duas versões ativas? → A: **recusado** (*"informe a
  versão"*): o banco não adivinha (Princípio I). Com uma versão só, vai para ela (ETL, migrations, amostras).
- D-10 · Q: O código da disciplina continua único no curso? → A: passa a ser único **na versão** — emenda ao `RF-DADOS-06`
  (documento 02); a `RN-MAT-02` (aposentada) não se toca; a `RN-MAT-01` fica **preservada** e ganha a versão (lançar só
  disciplina da versão da turma). Alternativa: único no curso — impediria a cópia.
- D-11 · Q: A duração é do curso ou da versão? → A: **da versão**, nulável: nula = a do curso. A versão 1 nasce nula, sem
  segunda fonte de verdade. Alternativa: só no curso — o exemplo do pedido (*"3 semanas a menos"*) não caberia.
- D-12 · Q: A cópia leva as habilitações de instrutor? → A: **Sim**: quem é habilitado na disciplina da versão copiada fica
  habilitado na cópia (novos vínculos `VIN-`). Alternativa: habilitar de novo na versão nova.
- D-13 · Q: Um PR ou dois? → A: **dois.** O **PR 1** é o banco (este portão): é o único que altera o que existe, precisa do
  remoto antes do merge, e nele nenhum número muda. O **PR 2** traz a cópia, os leitores do código pela versão e as
  telas. ⚠️ **A cópia fica no PR 2 de propósito**: antes de os leitores saberem distinguir duas versões, uma versão 2
  criada à mão misturaria as duas no DSA, na planilha e na aba Disciplinas.
- D-14 · Q: Duas versões podem começar no mesmo dia? → A: **Não** (índice único entre as ativas): a vigência tem de
  decidir uma só.
- D-15 · Q: Quem cria e quem edita a versão? → A: cria quem cria disciplina (`disciplinas.criar`, com alcance e curso em
  oferta), pela cópia; edita o cabeçalho (vigência, descrição, duração, situação) quem edita disciplina. Alternativa:
  `cursos.editar`.
- D-16 · Q: Onde fica na tela (PR 2)? → A: **Nova versão do currículo** na aba *Disciplinas* (copia a vigente, pede a
  vigência e a descrição); um **seletor de versão** no alto das abas *Grade, Disciplinas, Avaliações e Atividades*
  (padrão: a vigente hoje); na ficha da turma, *"Segue o currículo — versão N"* com **Trocar** enquanto não há
  lançamento. A turma nova oferece a versão padrão (a vigente na data de início) e deixa escolher outra.
- D-17 · Q: E a VIRADA-1? → A: a sincronização passa a casar disciplina e UE **dentro da versão da turma** (PR 2). Os
  preparos SQL antigos (`into strict` por curso e código) ficam como estão: são históricos, e com uma versão funcionam.
- D-18 · Q: A vigência de uma versão em uso pode mudar? → A: **Sim**: só afeta a escolha das turmas novas. Alternativa:
  travar.
- D-19 · Q: Uma versão pode ser inativada? → A: só se **nenhuma turma** a segue (nunca apagada — regra 4).

## 4. Requisitos

### FR-001 — Versões (PR 1)
- **FR-001.1**: Cada curso MUST ter uma ou mais versões de currículo, numeradas, com vigência (D-1, D-2).
- **FR-001.2**: O currículo de hoje MUST ser a versão 1 de cada curso, e toda disciplina, limite e turma existente MUST
  ficar ligada a ela.
- **FR-001.3**: Nenhum número de tela MUST mudar com a ligação (SC-001).
- **FR-001.4**: Curso novo MUST nascer com a versão 1.

### FR-002 — A turma e a versão (PR 1)
- **FR-002.1**: A turma MUST nascer na versão vigente na data de início (D-2), salvo escolha.
- **FR-002.2**: A versão da turma MUST mudar só sem lançamento (`RF-HOR-05`), levando o planejamento por linhagem (D-7).
- **FR-002.3**: Linha, lançamento e ajuste da turma MUST apontar só disciplina, UE ou avaliação da versão dela (D-10).

### FR-003 — A trava (PR 1)
- **FR-003.1**: Na versão seguida por turma com lançamento, a tela MUST NOT mudar número do currículo (D-4); MAY mudar texto.
- **FR-003.2**: Escrita sem sessão MUST passar (D-5).

### FR-004 — A cópia e as telas (PR 2)
- **FR-004.1**: A versão nova MUST nascer como cópia de uma existente (D-1, D-12), e a cópia MUST ser editável até uma
  turma com lançamento a seguir.
- **FR-004.2**: As abas Grade, Disciplinas, Avaliações e Atividades MUST mostrar a versão escolhida no seletor (D-16).
- **FR-004.3**: A ficha da turma MUST dizer que versão ela segue e permitir trocar enquanto não houver lançamento.
- **FR-004.4**: O DSA, o papel e a planilha MUST usar as disciplinas, UEs e a duração da versão da turma (D-11).
- **FR-004.5**: A sincronização (VIRADA-1) MUST casar dentro da versão da turma (D-17).

## 5. Critérios de sucesso

- **SC-001** (PR 1): Na cópia do remoto, antes × depois da migration: impressão digital do que o currículo alimenta
  **idêntica** e retrato das telas (planilha, `.xlsx` e DSA de toda semana com lançamento de toda turma) **idêntico**.
- **SC-002** (PR 1): Com duas versões do mesmo curso, cada turma lê a SUA — provado por pgTAP com o caso que discrimina.
- **SC-003** (PR 1): A reversão volta o esquema à impressão digital da `main`, com dado.
- **SC-004** (PR 2): Criar a versão 2 da CAHO com 3 semanas e uma CH a menos, planejar a `CAHO 2027` por ela, e a
  `CAHO 2026` continuar com os mesmos números em toda tela.
