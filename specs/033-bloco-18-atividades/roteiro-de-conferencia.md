# Roteiro de conferência — spec 033 (Bloco 18, o módulo de Atividades)

No preview do ramo `feat/BLOCO-18-atividades`, com a conta de Admin (e, onde indicado, uma de Operador). ⚠️ O preview e a
Production usam **o mesmo banco**: o que se grava aqui aparece lá. Os passos que **gravam** estão marcados com ✍️.

## 1. O catálogo de tipos (RA-1)

1. **Administração → Tipos de atividade.** *Esperado:* a lista dos tipos de atividade com a classificação padrão e
   quantos lançamentos cada um tem; **Desportiva** (AEC), **DeCAT** (TR), **Reforço** (TR) e **Outra** (AEC) estão lá; o
   tipo de valor «Atividade Extracurricular» aparece como **«Atividade Extraclasse»**; Monitoria, Português, BDA e BDF
   aparecem «só leitura» (Apoio Individualizado); o Excluir aparece desabilitado.
2. ✍️ **Novo tipo** (ícone) → um nome de teste, classificação TR → gravar. *Esperado:* a linha nova. Depois **Desativar**
   o tipo de teste (ele sai das escolhas do DSA).
3. **Editar** um tipo com lançamento e trocar a classificação, **sem gravar**. *Esperado:* o diálogo diz quantos lançamentos
   mudam de categoria. Cancele.

## 2. As AEC previstas do currículo (RA-2)

1. **Cursos → CAHO → aba Atividades.** *Esperado:* as **10** AEC previstas do currículo 1 (4 palestras e 6 visitas), com o
   TA (ou «não definido»), a disciplina, obrigatória e a página do PDF — só leitura.
2. **Editar curso → Currículo → Atividades e limites.** *Esperado:* a mesma lista, com *Nova AEC prevista*, *Editar*,
   *Desativar*; o Excluir desabilitado.
3. ✍️ *Nova AEC prevista* (uma de teste). *Esperado:* como o currículo está em uso, a tela **pede a justificativa** (RC-6);
   com ela, grava. Depois *Desativar* a de teste (também pede justificativa).

## 3. O lançamento de atividade no DSA (RA-4)

1. **Turmas → uma turma → DSA**, numa semana livre → clicar numa célula vazia → **AEC** → tipo **Palestra**. *Esperado:*
   o campo **Conta como** (padrão AEC; opções TA da disciplina, AEC, TAD, TR); **Cumpre (opcional)** com as AEC previstas
   do currículo da turma (as já cumpridas marcadas); **Responsável / Palestrante** — o instrutor do cadastro **ou** o nome
   de fora com a **OM**; **Local** — a sala da lista ou «Outro local».
2. ✍️ Lançar uma Palestra **contando como TAD**, com palestrante de fora e OM; e um **Reforço** (TR) contando como **TA da
   disciplina** (pede a disciplina). **Salvar a semana.** *Esperado:* o cartão mostra «Nome (OM)»; na ficha da turma, o
   TAD sobe e a CH da disciplina sobe pelo TA do Reforço (e o TR não).
3. Abas abaixo da grade → **Palestras** e **APOINST**. *Esperado:* o acompanhamento da turma, **sem ação** nenhuma.
4. ✍️ Desfaça os lançamentos de teste pelo cartão (Excluir) e salve a semana.

## 4. A turma — Atividades, Palestras e APOINST (RA-3, RA-5, RA-6)

1. **Ficha de uma turma de 2026** → abas *Ficha · Avaliações · Atividades · APOINST · Palestras*.
2. **Atividades.** *Esperado:* a lista da turma com Filtros e Estatísticas (ícones), e o uso do limite de AEC/TAD/TR do
   currículo no painel de Estatísticas.
3. **Palestras.** *Esperado:* as AEC previstas do currículo da turma, *a cumprir* ou *cumprida* (com data, palestrante e
   local quando vinculadas), e as palestras **avulsas** em bloco próprio. ✍️ *Registrar cumprimento* (ícone) numa delas,
   com justificativa → *Cumprida (à mão)* e o histórico na linha; depois *Desfazer*, com justificativa.
4. **APOINST.** *Esperado:* numa turma de **2026**, a frase de que a APOINST vale de **2027** em diante (o parâmetro).

## 5. O módulo Atividades (FR-006)

1. **Atividades** (menu). *Esperado:* abas **Atividades · Palestras · APOINST · Calendário**, do ano do cabeçalho.
2. **Aba Atividades → Filtros.** *Esperado:* turma, curso, classificação (inclui *TA da disciplina*), tipo (pelo rótulo),
   de/até, disciplina, vínculo (*do currículo* / *avulsa*), responsável. **Estatísticas.** *Esperado:* os cartões (total
   de atividades e TA, TA por classificação, palestras cumpridas N de M, APOINST por situação, visitas), a pizza por tipo
   (Visita, APOINST/Prática, Cerimônia agrupados), as barras por curso e por turma e o uso do limite; **clicar numa
   legenda oculta o grupo** (RT-5).
3. Numa linha: **Editar** abre o DSA da turma na semana do lançamento; **Desativar** pede a exclusão como rascunho da
   semana (conta ao *Salvar*); **Excluir** desabilitado.
4. **Aba Palestras** e **aba APOINST.** *Esperado:* todas as turmas do ano; na APOINST, *Nova APOINST* só para o trio e só
   para turma de 2027 em diante (em 2026, o ícone indisponível com o motivo).
5. Com a conta de **Operador**: *Nova APOINST*, *Registrar cumprimento* e o catálogo **não** aparecem.

## 6. Os avisos (RA-8)

1. **Sininho.** *Esperado:* um módulo **Atividades** quando houver AEC obrigatória não cumprida a 4 semanas do término de
   uma turma ativa, ou APOINST atrasada. O aviso de AEC/TAD/TR acima do limite continua no módulo Turmas, como antes.

## 7. As cargas (itens 6 e 7)

1. **Cursos → C-Espc-HN → aba Atividades.** *Esperado:* as **12** palestras do currículo 1.
2. **Cursos → CAHO → Sobre o Curso → Baixar PDF.** *Esperado:* abre o currículo do CAHO (repita em C-Espc-HN e EST-QF-APOC).
