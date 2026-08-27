# Contrato — Funções de Frontend (`app/(app)/disciplinas/page.tsx`, estendido)

Nenhum contrato de backend novo — 100% reaproveitamento de `crudListar`/`atualizarTurmaDisciplina`
(specs 027/029, ver `data-model.md`). `aoTrocarCursoDisciplinas()` (já existente) ganha uma chamada
adicional no final do seu corpo, sem mudar sua assinatura nem seu comportamento atual (FR-002.1).

## `popularTurmasDisciplinas_(idCurso)`

Nova. Chamada a partir de `aoTrocarCursoDisciplinas()`. Filtra `AppState.ctx.turmas` por `idCurso`
(sem chamada a Server Action — dado já em memória), popula `#discTurmaSelecao`. Se vazio, mostra opção
única informativa ("Nenhuma turma neste curso"). Reseta a seção de turma (esconde tabela/painel).

## `aoTrocarTurmaDisciplinas_()`

Nova. Lê a turma selecionada; se vazia, esconde tabela e painel de edição. Senão, chama
`carregarDisciplinasDaTurma_(idTurma)`.

## `carregarDisciplinasDaTurma_(idTurma)`

Nova. `Promise.all([gs('crudListar','turma_disciplina'), gs('crudListar','instrutor_disciplina'),
gs('crudListar','instrutores')])`, filtra `turma_disciplina` por `ID_Turma`, filtra `instrutor_disciplina` por `Status='Ativo'`, renderiza a tabela (`renderizarTabelaDisciplinasTurma_`).

## `renderizarTabelaDisciplinasTurma_(linhas, vinculos, instrutores)`

Nova. Colunas: Nome da Disciplina, Início, Término, Instrutores Selecionados (via
`resumoInstrutoresCompacto_`), Ações (botão "Editar" → `abrirEdicaoDisciplinaTurma_`). Linha vazia
com mensagem informativa se `linhas.length === 0` (Edge Case de spec.md).

## `resumoInstrutoresCompacto_(idInstrutorCsv, instrutorPorId)`

Nova, função pura. Recebe o CSV de `turma_disciplina.ID_Instrutor` + um mapa `{ID_Instrutor:
registro}`; devolve string curta ("—" se vazio; "Fulano" se 1; "Fulano, Beltrano" se 2; "Fulano,
Beltrano +N" se mais de 2 — Edge Case de spec.md).

## `abrirEdicaoDisciplinaTurma_(idTurmaDisciplina)`

Nova. Painel `style.display` (nenhum Tailwind CSS `.modal` neste projeto, achado real reconfirmado)
com campos de Data de Início/Término pré-preenchidos e a lista de checkboxes com busca dos
instrutores habilitados para aquele `ID_Grade` (mesmo padrão de dado de `checkboxesInstrutor_`,
`app/(app)/cursos/[curso]/page.tsx`, spec 029 — reimplementado aqui com busca, research.md § 3), pré-marcados
conforme `ID_Instrutor` atual. Mensagem informativa se não houver nenhum habilitado (FR-009 de
spec 029, mesmo padrão).

## `filtrarInstrutoresEdicaoDisciplina_()`

Nova. `onkeyup` do campo de busca do painel — filtra a lista de checkboxes já renderizada por
nome/posto, sem chamada de rede (FR-005), mesmo padrão de UX de
`filtrarPainelDisciplinasInstrutor_` (spec 019).

## `intervaloContidoEmClient_(inicioA, fimA, inicioB, fimB)`

Nova, função pura. Cópia funcional exata de `intervaloContidoEm_` (`lib/acoes/liq.ts`, spec 029) —
contenção total, degrada para `true` quando qualquer intervalo está incompleto (RN-DEG-01,
research.md § 4).

## `salvarEdicaoDisciplinaTurma_(idTurmaDisciplina)`

Nova. Lê datas + checkboxes marcados do painel; monta `{ID_Instrutor}` (CSV); busca a janela da
turma selecionada em `AppState.ctx.turmas`; chama `intervaloContidoEmClient_` — se `false`,
`alert()` citando os limites reais da turma e **não** chama o backend (FR-006/SC-002). Se `true`,
chama `gs('atualizarTurmaDisciplina', idTurmaDisciplina, {Previsao_Inicio, Previsao_Termino,
ID_Instrutor})` — sucesso: atualiza a linha da tabela e fecha o painel; erro (ex. o servidor
bloqueia por outro motivo): `alert(erro.message)`, painel permanece aberto.
