# Roteiro de conferência — Bloco 6, PR 2 (spec 021)

No preview do PR, com a sua conta de Admin. ✍️ = o passo **grava no banco** (o remoto é o mesmo da Production).
⏸️ = depende da **M4**, que espera a sua palavra (regra 9.4) — sem ela, o passo mostra a recusa, e isso é o esperado.

## 1. O seletor de currículo (RC-8, RC-12)
1. *Cursos* → um curso qualquer (ex.: CAHO). **Acima das abas**: *Currículo* com **"Currículo 1 (vigência 2026) —
   vigente"**, a situação ao lado e os botões *Editar currículo* e *Novo currículo*.
2. Troque de aba: o seletor fica; a URL não ganha `?curriculo=` enquanto for o vigente.

## 2. Novo currículo (RC-7) ✍️
1. *Novo currículo* → a página diz **o que se copia** (do Currículo 1) e sugere **01/01/2027**. *Criar currículo*.
2. Volta ao curso com **"Currículo 2 (vigência 2027) — futuro"** escolhido (`?curriculo=2`). Aba *Disciplinas*: as
   mesmas disciplinas do 1. *Novo currículo* de novo → **"Já há um currículo futuro"**, com o link para editá-lo.

## 3. Editar o currículo escolhido (RC-5) ✍️
1. Com o Currículo 2 escolhido: *Editar currículo* → mude a duração em semanas → *Salvar currículo*. Sem pergunta
   nenhuma (nenhuma turma com lançamento o segue).
2. Aba *Disciplinas* → abra uma disciplina → *Editar* → mude a CH → grave. Volte ao Currículo 1 no seletor: **a CH de
   lá não mudou**.
3. *Editar curso*: **não** tem mais propósito, duração nem PDF — tem o link *"Editar o Currículo 1 (vigência 2026)"*.

## 4. Nova turma no currículo novo (RC-4, RC-9) ✍️
1. *Nova turma*: campo **Currículo** — "O vigente na data de início da turma" (padrão), o 1 e o 2. Escolha o 2 e grave
   (ano 2027).
2. A ficha diz **"Segue o Currículo 2 (vigência 2027)"**. A aba *Grade* do curso lista **todas** as turmas, inclusive
   as arquivadas (marcadas), com a coluna **Currículo**.
3. *Editar turma* de uma turma **com** lançamento: o campo Currículo está **travado**, com a razão.

## 5. A correção do currículo em uso (RC-6) ✍️ ⏸️
1. Currículo 1 de um curso com turma lançada → aba *Disciplinas* → mude a CH de uma disciplina → grave.
2. Abre **"Justifique a correção"**; *Corrigir* só habilita com 5 letras. Cancelar não grava; com a justificativa,
   grava. (Sem a M4: grava direto, sem pergunta.)
3. Preencher um campo que estava **vazio** (ex.: técnica sugerida) não pergunta nada.

## 6. Arquivar currículo (RC-10) ✍️ ⏸️
1. O botão *Arquivar currículo* só aparece no currículo **passado** com **todas** as turmas arquivadas. Arquivado, ele
   sai do seletor e volta com *"Mostrar currículos arquivados"*; *Desarquivar currículo* o devolve.
   (Hoje nenhum curso tem currículo passado — este passo se confere quando houver; o caso está provado por teste.)

## 7. O PDF por currículo (RC-11) ✍️ ⏸️
1. *Editar currículo* → *Carregar PDF* → um PDF → **"Currículo carregado."**; *Sobre o Curso* (com o mesmo currículo
   escolhido) baixa ele. *Substituir PDF* → baixa o novo; o anterior **fica guardado** (regra 4).
   (Sem a M4: o envio é recusado pelo armazenamento — a policy do caminho novo é dela.)

## 8. O que NÃO pode ter mudado
- O DSA, o papel e a planilha de contingência de qualquer turma de 2026: os mesmos números de antes.
- A ficha do instrutor: as disciplinas com "(CAHO)" como sempre — o currículo só aparece no rótulo quando o curso tem
  dois (então, depois do passo 2, as da CAHO dizem *"CAHO · Currículo 1 (vigência 2026)"* e *"… Currículo 2 …"*).
