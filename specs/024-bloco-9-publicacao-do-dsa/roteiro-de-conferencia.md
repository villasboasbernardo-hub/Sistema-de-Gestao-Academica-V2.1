# Roteiro de conferência — spec 024 (Bloco 9)

No preview, com uma conta que **lança o DSA** (Admin, Encarregado ou Operador). ⚠️ Os passos **[GRAVA]** escrevem no banco
remoto: use uma turma e uma semana **passadas e sem aula** (ex.: uma semana de fevereiro de 2026 de uma turma ativa
presencial), e descarte ou publique só o que for de teste.

## 1. Rascunho e Salvar

1. *Turmas* → uma turma ativa presencial → *Abrir DSA* → a semana escolhida. Esperado: o painel **Situação da semana:
   Em preenchimento**, acima da grade; o botão de impressão diz **Gerar prévia** e está desabilitado (*"salve a semana
   antes"*).
2. Lance uma aula num tempo livre. **[GRAVA]** Esperado: o cartão traz **«não salvo»**; o painel diz *"1 lançamento não
   salvo"*. Abra a ficha da turma em outra aba: a CH executada **não mudou** (o rascunho não conta).
3. Volte ao DSA → ícone **Salvar a semana**. **[GRAVA]** Esperado: *"Semana salva: 1 lançamento registrado."*, situação
   **Registrado**, o «não salvo» some; na ficha, a CH executada subiu.
4. Edite a aula (mude o tópico). **[GRAVA]** Esperado: o cartão volta a «não salvo»; na ficha, a CH continua a do último
   Salvar. Ícone **Descartar rascunho** → confirme. **[GRAVA]** Esperado: o tópico volta ao salvo.

## 2. Prévia, publicação e alteração

1. Com a semana **Registrada**: ícone **Gerar prévia**. Esperado: o papel com a marca **PRÉVIA** grande e o campo
   **Alteração: ALT —**. Volte.
2. Ícone **Publicar** → confirme. **[GRAVA]** Esperado: *"Semana publicada (original)."*, situação **Publicado — original**,
   o histórico com a linha **Original** (data, autor, *Reimprimir*); a grade não aceita lançamento; só aparece **Fazer
   alteração**. O botão de impressão vira **Imprimir** e sai sem PRÉVIA.
3. **Fazer alteração**. **[GRAVA]** Esperado: situação **Alteração em andamento**; lance ou mude uma aula (fica «não
   salvo»).
4. **Publicar alteração** → tente com *"curta"*: recusa pedindo a justificativa (10 caracteres). Escreva uma justificativa
   de verdade → publicar. **[GRAVA]** Esperado: *"Alteração publicada: ALT 1."*; o histórico com **ALT 1** e a
   justificativa; a semana travada de novo.
5. **Reimprimir** da linha *Original*: ALT em branco. **Reimprimir** da *ALT 1*: **ALT 1** no campo.

## 3. Alterado desde a publicação (RP-4)

1. Com a semana publicada, *Atividades* → aba **Calendário** → cadastre uma linha de dia inteiro numa data dessa semana.
   **[GRAVA]** Volte ao DSA. Esperado: o aviso *"Alterado desde a publicação…"*. Inative a linha no Calendário
   **[GRAVA]**: o aviso some.

## 4. EAD e semipresencial

1. Abra a ficha de uma turma **EAD** (ex.: `C-ApA-PCN-PR-EAD T2 2026`). Esperado: em *Andamento*, só o aviso *"Turma EAD:
   o andamento é controlado pela Divisão de Ensino a Distância…"*; nenhuma tarja *em atraso*. No **Início** e em
   **Turmas**, ela não aparece em atraso nem conta no número de atrasadas.
2. Abra a ficha de uma turma **semipresencial** (ex.: `C-ApA-AuxNav-PR-SP T2 2026`). Esperado: o aviso *"Marque as
   disciplinas presenciais do currículo para contar só a etapa presencial."* e os números de antes.
3. *Cursos* → o curso dela → *Editar curso* → *Currículo e suas partes* → *Disciplinas* → uma disciplina → marque
   **Presencial** → salvar **[GRAVA]** (curso com turma lançada pede justificativa). Volte à ficha: a CH prevista passa a
   ser a das marcadas e a executada, a lançada na etapa presencial; o aviso some.

## 5. O papel

- Antes da publicação, todo papel do DSA sai com **PRÉVIA**; depois, sai o **retrato** publicado, com o ALT da versão.
  O conteúdo da grade e do quadro de CH não muda de forma.
