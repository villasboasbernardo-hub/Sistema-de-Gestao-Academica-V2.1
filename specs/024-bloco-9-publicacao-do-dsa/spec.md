# Spec 024 — Bloco 9: a publicação do DSA (com rascunho) e a contagem de EAD e semipresencial

**Pedido:** Bernardo Villas Boas, 23/10/2026, pelo `/corrigir` — *"Bloco 9 — Publicação do DSA (com rascunho) e
contagem EAD/semipresencial, num PR"*. **Ramo:** `feat/BLOCO-9-publicacao-do-dsa`, a partir da `main` `af3de4a`, na
pasta de trabalho nova `C:\sis11\CIAARA-11-v2.1`. **Regras:** `docs/correcoes/regras-da-publicacao-do-dsa.md` (RP-0 a
RP-8; RP-0 e RP-8 escritas em 23/10/2026 pela leitura que Bernardo escolheu — o arquivo em disco só tinha RP-1 a RP-7).
**Banco:** migrations pelo **portão autorizado** (RP-8 muda views e funções que somam ou cruzam lançamentos) — com a
prova de que, com tudo o que existe nascendo SALVO, nenhum número de tela muda (§6).
**Papel do DSA:** muda (marca PRÉVIA e campo ALT) — **merge só entre semanas**.

## 1. O problema

O DSA grava cada lançamento na hora e conta na hora: não há como preparar a semana sem que o rascunho já apareça no
andamento, no saldo, nos conflitos de outras turmas e no papel; não há registro de que a semana foi concluída, nem
versão publicada, nem alteração numerada com justificativa (o campo ALT do papel sai sempre *"ALT —"*). E a EAD ainda
tem saldo e veredito *em atraso* calculados, embora o controle dela seja da Divisão de Ensino a Distância; e a
semipresencial conta a carga do curso inteiro, inclusive a etapa a distância.

## 2. Paridade ou novidade (regra 3) e escopo (regra 2)

- **Novidade autorizada nominalmente** por Bernardo (21, 22 e 23/10/2026): o ciclo de publicação e o rascunho. O DSA é
  da CIAARA-11 (regra 2).
- **Item 2** corrige a contagem: EAD e etapa a distância são da Divisão de Ensino a Distância (`AVISO_DE_TURMA_EAD`,
  `D-DSA-2`).
- **Documento 04:** nenhuma regra muda. `RN-EVT-03` (CHD inclui avaliação e vista), `RN-MAT-04` (a modalidade é da
  turma) e `RN-2027-0x` continuam; o que muda é **o que entra na conta** (só o salvo; na semipresencial, só a etapa
  presencial; a EAD sai da conta).

## 3. Triagem (medida na `main` `af3de4a` e na cópia `remoto-20261023-130122.sql`)

| # | Pedido | Hoje (medido) | Tipo |
|---|---|---|---|
| 1a | **Rascunho** (RP-0): o que se faz no DSA fica guardado, *«não salvo»*, sem contar; *Descartar*; *Salvar* | Cada lançamento grava e conta na hora (`lib/acoes/dsa.ts`: `lancar`, `atualizar`, `mover`, `excluir`, `lancarEstudoIndividualDaSemana`). Nenhuma noção de salvo | regra nova |
| 1b | **Prévia** com marca PRÉVIA, só com a semana salva | O botão *Imprimir* imprime a qualquer momento, sem marca | regra nova |
| 1c | **Publicar** (original, retrato, semana travada); **Fazer alteração**; **Publicar alteração** com justificativa (ALT N) | Campo ALT fixo *"ALT —"* (`app/print/dsa/DocumentoDoDsa.tsx:128`, Q-3) | regra nova |
| 1d | **Histórico** com *Reimprimir* (RP-3) | — | regra nova |
| 1e | **RP-4**: *"alterado desde a publicação"* (Calendário do Bloco 8, sincronização) — fecha a `PEND-023-3` | — | regra nova |
| 1f | **RP-8**: toda soma e cruzamento lê só o salvo; guarda | 9 views/funções de soma, 2 de conflito, 2 de trava, e ~40 leituras em TS (inventário em `plan.md` §2) | portão autorizado |
| 2a | **EAD não conta TA** em lugar nenhum | O aviso da DEaD já está na ficha, na lista, no Início e no DSA (spec 013); mas `andamentoDaTurma` ainda calcula saldo e *em atraso* para EAD — a `C-ApA-PCN-PR-EAD T2 2026` sai **em atraso** (saldo −288) no contador do Início, nos avisos e no selo do cartão | 🐛 defeito |
| 2b | **Semipresencial conta só a etapa presencial**: marca *presencial* por disciplina no currículo; prevista = marcadas; executada = lançado na etapa; sem marca, aviso e conta tudo | Conta o curso inteiro; não há marca | regra nova |

**Já feito:** o aviso da EAD nas quatro telas e a ausência de DSA para EAD (spec 013); a etapa presencial da turma
(`D-DSA-2`).

## 4. Requisitos funcionais

### Rascunho (RP-0, RP-8)

- **FR-001** Todo lançamento **novo** feito no DSA (aula, avaliação, sessão de aplicação, vista, atividade, Estudo
  Individual) é gravado como **rascunho**: guardado no banco, visível **só** na tela do DSA da turma, com a marca
  *«não salvo»* no cartão.
- **FR-002** **Editar ou mover** um lançamento salvo cria o rascunho dele; a versão salva **continua contando** até o
  próximo Salvar. Editar um rascunho altera o próprio rascunho.
- **FR-003** **Excluir** um lançamento salvo cria um rascunho de exclusão (o lançamento some da tela do DSA, e continua
  contando até salvar). Excluir um rascunho novo o descarta.
- **FR-004** O empurrão em cascata (`D-DSA-3`) que move lançamentos salvos cria os rascunhos deles.
- **FR-005** **Rascunho não conta em nada** (RP-8): CH, andamento, saldo, situação por disciplina, papel, planilha,
  avisos, conflito com outras turmas, trava de vigência e de regime, situação da avaliação.
- **FR-006** **Salvar** (ícone) aplica todos os rascunhos da semana de uma vez, numa transação: o novo passa a salvo; o
  rascunho de edição é aplicado sobre o salvo (mesmo registro, mesmo código); o de exclusão inativa o salvo. Registra
  quem e quando. Recusa nomeia o motivo (as conferências de sempre do banco correm na aplicação).
- **FR-007** **Descartar rascunho** (ícone, com confirmação) inativa todos os rascunhos da semana — nada é apagado.
- **FR-008** Tudo o que existe hoje nasce **salvo** (RP-6); scripts sem sessão gravam salvo (RP-5).

### Publicação (RP-1 a RP-7)

- **FR-009** **Situação da semana** na tela do DSA: *Em preenchimento* (com *«N lançamentos não salvos»* quando houver),
  *Registrado*, *Publicado (original)*, *Publicado — ALT N*, *Alteração em andamento*.
- **FR-010** **Gerar prévia** (ícone) só com a semana **registrada** (salva e sem rascunho) e ainda não publicada; o
  papel sai com a marca **PRÉVIA** bem visível e o ALT em branco. Não grava nada.
- **FR-011** **Publicar** (ícone, com confirmação) só com a semana registrada: grava a versão **original** com quem,
  quando e o **retrato** do documento; a semana fica **travada**.
- **FR-012** Semana travada **recusa** lançar, editar, mover, excluir e parar o dia da turma — no servidor, para quem
  tem sessão (RP-5).
- **FR-013** **Fazer alteração** (ícone) destrava a semana. **Publicar alteração** exige **justificativa** (mínimo de 10
  caracteres), salva os rascunhos e publica numa só ação: ALT 1, 2, 3… com quem, quando, justificativa e retrato; a
  semana volta a travar.
- **FR-014** **Histórico** na tela: original e alterações, cada uma com data, autor, justificativa e **Reimprimir**,
  que imprime o **retrato** daquela versão, idêntico, com o ALT dela.
- **FR-015** Semana publicada: *Imprimir* imprime a versão vigente (o retrato da última publicação).
- **FR-016** **RP-4:** semana publicada cujo documento atual (o que o sistema montaria hoje) difere do retrato publicado
  mostra *"Alterado desde a publicação — faça uma alteração para republicar"*. Nunca muda a versão publicada.
- **FR-017** Publicação e alteração nunca se apagam (RP-7).

### EAD e semipresencial

- **FR-018** **EAD não conta TA**: `andamentoDaTurma` devolve, para turma EAD, prevista/executada/saldo/percentual
  **sem valor** e nunca *em atraso*; toda tela que mostra andamento, saldo ou progresso mostra no lugar o aviso da
  Divisão de Ensino a Distância. O contador *em atraso* do Início e os avisos não contam EAD.
- **FR-019** **Marca *presencial*** por disciplina do currículo, em *Editar curso → Currículo e suas partes →
  Disciplinas*.
- **FR-020** **Semipresencial com marca:** CH prevista = soma das disciplinas marcadas; CH executada = lançado **na etapa
  presencial** da turma; capacidade de **amanhã até o fim da etapa presencial**. **Sem marca** no currículo da turma (ou
  sem etapa cadastrada): conta tudo, como hoje, com o aviso *"Marque as disciplinas presenciais do currículo para contar
  só a etapa presencial."*

## 5. Critérios de sucesso

- **SC-001** Lançar no DSA não muda CH, andamento, saldo, situação, papel nem planilha até *Salvar*; depois de salvar,
  muda — provado por clique, com o banco conferido.
- **SC-002** Editar um lançamento salvo não muda nada até salvar; descartar o rascunho volta exatamente ao salvo.
- **SC-003** O ciclo salvar → prévia (PRÉVIA no papel) → publicar (travado) → fazer alteração → publicar alteração com
  justificativa (ALT 1 no papel) → reimprimir o original (ALT em branco) e a ALT 1, por clique.
- **SC-004** Sem justificativa, a alteração é recusada; semana travada recusa lançar.
- **SC-005** **Prova do portão:** na cópia do remoto, antes (código da `main`) × depois (ramo + migrations), o retrato
  das telas (29 turmas, todas as semanas) e o das páginas **byte a byte idênticos**; e a impressão digital de toda view
  e função que soma ou cruza, igual.
- **SC-006** A guarda reprova leitura nova de lançamento sem o filtro do salvo.
- **SC-007** As 6 EAD e as 5 semipresenciais: antes × depois medido (`antes-depois.md`); nenhuma EAD *em atraso*.

## 6. Fora do escopo

- Paradas do dia (`dias_parados`) e TA fora do DSA **não** são rascunho (gravam na hora, como hoje).
- A publicação não envia nada (D-USR-1).
- A planilha de contingência segue sem marca de prévia nem ALT (é contingência, não o documento oficial).

## Clarifications

### Session 2026-10-23

- Q: O arquivo de regras só tem RP-1 a RP-7; como seguir para RP-0 e RP-8? → A: **a leitura proposta pelo Claude**
  *(Bernardo Villas Boas, 23/10/2026)* — escrita no arquivo.
- Q: Depois de salvar, editar faz o quê? → A: **volta a ser rascunho**; o que conta é sempre o último Salvar *(Bernardo
  Villas Boas, 23/10/2026)*.

*(As decisões seguintes foram adotadas por padrão — Bernardo confere no fim.)*

- D-1 · O rascunho mora **nas próprias tabelas**, com a coluna `salvo` (padrão `true`) e o vínculo `rascunho_de`; a
  edição de um salvo é um rascunho-sombra aplicado sobre ele no Salvar. *Alternativa: tabela de operações pendentes
  reaplicadas no Salvar (exigiria simular a grade).*
- D-2 · **Paradas do dia** da turma e **TA fora do DSA** não são rascunho. *Alternativa: tudo do DSA em rascunho.*
- D-3 · A **semana** é a semana ISO do DSA (`ano`, `semana`), por turma.
- D-4 · A trava (FR-012) também vale para **parar o dia da turma**; a parada global (Calendário) não trava (é RP-4).
- D-5 · As conferências do banco (vista depois da aplicação, sessões) **não correm no rascunho**; correm no Salvar, sobre
  o registro salvo.
- D-6 · Antes da publicação, o botão de impressão vira **Gerar prévia**; depois, **Imprimir** (a versão vigente).
- D-7 · Justificativa com **mínimo de 10 caracteres**.
- D-8 · *"Alterado desde a publicação"* compara o **conteúdo da semana** do documento montado hoje (só o salvo, com o
  mesmo "hoje" do retrato) com o do retrato: cabeçalho, alunos, dias, grade, legenda e assinaturas — **sem o quadro de
  CH acumulada** (que muda com toda semana anterior) nem a data de geração.
- D-9 · Semipresencial: a **capacidade** também passa a contar só até o fim da etapa presencial.
- D-10 · Sem marca *presencial* em nenhuma disciplina do currículo, a semipresencial conta tudo (com aviso); com
  marca e **sem etapa cadastrada**, também conta tudo (com o aviso da etapa).
- D-11 · Quem salva, publica e altera: quem lança aula (`registros_aula.criar`) e alcança a turma — a mesma régua do DSA.
- D-12 · **A guarda é do banco**: com sessão, todo lançamento novo nasce rascunho e o salvo só muda pelo Salvar (gatilho
  `app.guardar_rascunho_do_dsa`). Sem ela, uma escrita direta pela interface de dados pularia o rascunho e a trava.
  *Alternativa: só a Server Action garantir (regra de negócio só na aplicação — proibido).*
- D-13 · O papel de semana **não publicada** sai com **PRÉVIA** mesmo pela rota direta de impressão; o botão *Gerar
  prévia* da tela só se habilita com a semana salva (*"exige semana salva"*).
- D-14 · A **atividade de todas as turmas** (sem turma) grava na hora, como a parada do dia: o rascunho é por turma, e uma
  atividade global em rascunho apareceria em toda turma sem ninguém que a salvasse.
- D-15 · **«Juntar como sessão»** (aba Avaliações) e a **recategorização pelo tipo** de atividade escrevem fora do DSA
  e valem na hora, como antes — a guarda as deixa passar por uma marca de transação que a interface de dados não
  alcança. *Alternativa: passá-las pelo rascunho (mudaria o comportamento de telas fora do DSA).*
- D-16 · **EAD não conta TA em lugar nenhum** (item 2): o andamento da turma EAD sai como *controle da DEaD* — sem
  progresso, saldo, capacidade nem «em atraso» —, e as somas do Início e de Turmas deixam a EAD de fora. A `RN-MAT-04`
  (decidir pela modalidade **da turma**) não muda; o que muda é a consequência da modalidade EAD, por pedido nominal de
  Bernardo (23/10/2026). Emenda o `D8` da spec 012 (*capacidade da EAD pelo limite diário em horas*), que deixa de valer.
- D-17 · A M2 **não mexe em privilégio**: `create or replace view` preserva os da view (achado da prova da reversão,
  `antes-depois.md` §1).
- D-18 · A semana está **Registrada** quando **não tem rascunho** — não quando tem o evento «salvo». O que existe nasce
  salvo (RP-8): uma semana com dado de antes do Bloco 9, ou vazia, já está registrada e pode gerar a prévia e ser
  publicada; *Em preenchimento* é ter rascunho por salvar. O banco publica pela mesma regra. *Alternativa: exigir um
  «Salvar» em toda semana antiga antes da primeira prévia (achado dos e2e: 27 reprovações da impressão vinham disso).*
- D-19 · Na **tela do DSA**, a lista de provas para vista e para sessão de aplicação oferece a prova **salva e a nova em
  rascunho**, e numera as sessões contando as salvas e as novas (nunca a sombra de uma edição): lançar a prova e a vista
  na mesma semana, antes do Salvar, é o uso normal. A **contagem** da situação por UE soma só o salvo (RP-8). *Achado
  dos e2e: a contagem somava a vista e a sessão em rascunho; consertado.*
