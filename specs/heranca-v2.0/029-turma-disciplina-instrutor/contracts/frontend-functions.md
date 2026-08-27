# Contrato — Funções de Frontend (`app/(app)/cursos/[curso]/page.tsx`, estendido)

Todas as funções abaixo já existem (spec 027) e são **estendidas**, não recriadas.

## `abrirPainelPeriodoTurma_(idCurso)` (sem mudança de assinatura)

Passa a também carregar `crudListar('instrutor_disciplina')` e `crudListar('instrutores')` (além
de `crudListar('turma_disciplina')`, já existente), para montar a lista de instrutores habilitados
por disciplina antes de renderizar.

## `renderizarPainelPeriodoTurma_(idCurso, idTurma, linhas, vinculos, instrutores)`

Ganha 2 parâmetros novos (`vinculos` = `instrutor_disciplina` filtrada por `Status='Ativo'`,
`instrutores` = `instrutores`). Para cada linha de disciplina, além dos 2 `<input type="date">`
já existentes, renderiza uma lista de checkboxes — 1 por instrutor habilitado para aquele
`ID_Grade` (`vinculos.filter(v => v.ID_Grade === linha.ID_Grade)`), rotulado com
`Posto_Graduacao + Nome_Completo` (sem `formatarNomeInstrutor_`, mesma restrição de backend não se
aplica aqui — mas por consistência com a LIQ/O.S. de Instrutoria, usa nome puro também aqui, não
reintroduz a função de negrito hierárquico nesta tela), pré-marcado se `instrutor.ID_Instrutor`
está presente no CSV `linha.ID_Instrutor`. Se a lista de habilitados para aquele `ID_Grade` estiver
vazia, mostra `"Nenhum instrutor habilitado para esta disciplina"` em vez da lista (FR-009).

## `salvarPeriodoTurmaClick_(idTurmaDisciplina)`

Passa a também ler os checkboxes marcados da linha e montar `ID_Instrutor` (CSV dos `ID_Instrutor`
marcados). Chama `gs('atualizarTurmaDisciplina', idTurmaDisciplina, { Previsao_Inicio,
Previsao_Termino, ID_Instrutor })` no lugar do `crudAtualizar` direto usado pela spec 027. Sucesso:
mesmo comportamento de badge já existente. Erro (`.catch`): `alert(erro.message)` — agora inclui o
caso de bloqueio por período fora da janela da turma (FR-005), com a mensagem já formatada pelo
backend citando os limites reais.
