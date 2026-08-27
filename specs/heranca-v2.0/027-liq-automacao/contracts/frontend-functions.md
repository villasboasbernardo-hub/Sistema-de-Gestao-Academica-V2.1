# Contrato — Funções de Frontend

## `app/(app)/cursos/[curso]/page.tsx` (User Story 1)

### `abrirPainelPeriodoTurma_(idTurma)`

Disparada pelo botão "Período das Disciplinas" no card de turma expandido (Página do Curso). Chama
`a Server Action (retorno tipado)(renderizarPainelPeriodoTurma_).crudListar('turma_disciplina')`
e filtra no cliente por `ID_Turma === idTurma`.

### `renderizarPainelPeriodoTurma_(linhas)`

Renderiza uma linha por disciplina da turma: nome da disciplina (lookup em `disciplinas` já
carregado pela view), 2 `<input type="date">` (`Previsao_Inicio`/`Previsao_Termino`), badge
indicando `Origem_Periodo` (`Herdado da grade` / `Não informado`) apenas como indicação visual, sem
bloquear edição.

### `salvarPeriodoTurmaClick_(idTurmaDisciplina)`

Lê os 2 campos de data da linha, chama `a Server Action (retorno tipado)(...).withFailureHandler
(...).crudAtualizar('turma_disciplina', idTurmaDisciplina, { Previsao_Inicio, Previsao_Termino })`.
Sucesso: atualiza o badge da linha para refletir o novo estado (deixa de ser "Não informado" assim
que ambas as datas estão preenchidas). Erro: `alert()` (mesmo padrão de tratamento de erro já
confirmado em `/speckit-clarify` da spec 025 para este tipo de ação pontual).

## `app/(app)/instrutores/page.tsx` (User Story 2)

### Botão "LIQ"

Novo botão na barra de ações de `painelPrincipalInstrutores`, ao lado de "Cadastrar Novo Instrutor"
e "Estatísticas" (achado 3 do pedido original).

### `alternarPainelLiq_()` / `renderizarPainelLiq_()`

**Correção de implementação**: nenhum Tailwind CSS `.modal` existe em nenhum arquivo do projeto —
todo painel deste projeto alterna via `style.display` (`alternarEstatisticasInstrutores`,
`painelFichaInstrutor`). O "modal" pedido na spec é implementado como painel colapsável com 2
campos: `Ano` (número, ano corrente como padrão) e `Trimestre` (`<select>` 1º a 4º), botão "Gerar",
seguindo a mesma convenção já estabelecida por `alternarEstatisticasInstrutores`.

### `gerarLiqClick_()`

Lê `ano`/`trimestre` do painel, desabilita o botão "Gerar" (evita duplo clique), chama
`gs('gerarLiq', ano, trimestre)` (chamada direta, tipada), reabilita o botão em `.finally()`.

### `liqGeradaComSucesso_({url})`

Mostra um alerta de sucesso dentro do painel e `window.open(url, '_blank')` (mesmo padrão de
abertura em nova aba já usado pela Ficha) — não fecha o painel.

### `liqFalhouGeracao_(erro)`

Exibe as mensagens de `erro.message` (uma por linha, já vêm formatadas por
`validarLiq_`/`gerarLiq`) como lista dentro do próprio painel (nunca `alert()` — o pedido original
é explícito: "o modal deve listar todos os problemas de uma vez"), sem fechar o painel, permitindo
ao operador ver o que falta corrigir e tentar novamente depois de ajustar os dados.
