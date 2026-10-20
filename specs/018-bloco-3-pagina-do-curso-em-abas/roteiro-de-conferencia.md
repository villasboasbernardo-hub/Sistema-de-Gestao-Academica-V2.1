# Roteiro de conferência — Bloco 3 (spec 018), no preview

Tudo por clique, a partir do menu. ✏️ marca o passo que **grava no banco**.

## 1. As seis abas

1. *Cursos* → um curso (ex.: `C-Ap-FR`).
2. **Esperado:** as abas *Sobre o Curso · Grade · Disciplinas · Avaliações · Atividades · Horários*, nessa ordem, com
   *Sobre o Curso* aberta. Acima delas, o quadro de avisos e — se houver — *Turmas com teto excedido*.

## 2. Disciplinas (saiu do menu)

1. **Esperado:** o menu lateral **não** tem mais *Disciplinas* (Início · Cursos · Turmas · Instrutores · Cronograma ·
   Atividades · Administração).
2. No curso, aba *Disciplinas*. **Esperado:** os filtros, os números, a pizza de CH e a tabela, sem escolha de curso.
3. Clique numa disciplina. **Esperado:** o detalhe com *Editar*, *Situação*, *Excluir*, as UEs em tabela e as
   avaliações do currículo — como era em `/disciplinas`.
4. ✏️ *Nova disciplina* → código, nome, CH → *Criar disciplina*. **Esperado:** a linha nova aparece na tabela.
5. Aba *Grade* → botão *Disciplinas* (sem turma escolhida). **Esperado:** volta à aba *Disciplinas* do curso.
6. Um link antigo `/disciplinas?curso=C-Ap-FR` (colado na barra). **Esperado:** abre a aba *Disciplinas* do curso.

## 3. Avaliações (só o previsto)

1. Aba *Avaliações* de um curso com turma em andamento. **Esperado:** por disciplina, a CH (aula + avaliação), os
   itens do currículo com o tempo e a UE, os avisos do previsto. **Nenhuma** turma, *"X de Y aplicadas"*, situação
   (*Pendente*, *Concluída*…) nem projeção. O cumprido continua na aba *Avaliações* da ficha da turma.

## 4. Atividades

1. Aba *Atividades*. **Esperado:** o título *"Atividades extraclasse previstas no currículo"*; os limites de AEC, TAD e
   TR com a origem (currículo, com a página, ou norma, com o percentual); a referência do Estudo Individual; *"o
   currículo não prevê"* do Apoio Individualizado; os tipos de atividade por categoria.

## 5. Horários — os regimes nomeados

1. Aba *Horários*. **Esperado:** *Regimes de horário do curso* (vazio: *"Toda turma usa o regime vigente do curso"*) e,
   abaixo, as vigências do regime do curso só para ler, com *Editar o regime do curso*.
2. ✏️ *Novo regime* → *Regime B*, 9 TA, 45 min, manhã 07:15 (intervalo 5), tarde 13:15 (intervalo 5) → *Cadastrar
   regime*. **Esperado:** *"Regime cadastrado."* e a linha *"Regime B — 9 TA de 45 min"*, *"nenhuma turma o usa"*.
3. ✏️ *Editar* → mude o nome → *Salvar regime*. **Esperado:** o nome novo. (TA por dia e duração aparecem só para ler.)
4. *Turmas* → uma turma **sem lançamento** desse curso → *Editar turma*. **Esperado:** o campo *Regime de horário* com
   *"Regime vigente do curso"* e o *Regime B*.
5. ✏️ Escolha o *Regime B* → *Salvar alterações*. Depois *Abrir o DSA*. **Esperado:** o relógio do Regime B (07:15) e,
   em *Imprimir*, nove tempos.
6. O DSA de **outra** turma do mesmo curso. **Esperado:** igual a antes (o regime do curso).
7. *Editar turma* numa turma **com** lançamento. **Esperado:** o campo travado, com a frase *"já tem lançamento no DSA"*.
8. ✏️ (opcional) *Inativar* o regime. **Esperado:** *"Regime inativado."*; a turma que o usa continua com ele.
