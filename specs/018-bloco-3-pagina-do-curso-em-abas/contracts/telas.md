# Contrato das telas — Bloco 3

## `/cursos/[curso]` — as seis abas

- `aba`: `sobre` (padrão) · `grade` · `disciplinas` · `avaliacoes` · `atividades` · `horarios`, nessa ordem
  (`data-aba`, `role="tab"`). Rótulos: *Sobre o Curso · Grade · Disciplinas · Avaliações · Atividades · Horários*; a
  aba *Atividades* tem o título *"Atividades extraclasse previstas no currículo"*, para não se confundir com o menu
  *Atividades* (as da turma).
- Parâmetros novos da aba Disciplinas (os mesmos nomes de `/disciplinas`): `situacao` (escolha, padrão `ativo`),
  `busca` (texto), `aberta` (texto, **visual** — `avisaServidor: false`).
- Cada aba lê o que precisa **só quando aberta** (o padrão de `aba === "avaliacoes"` hoje).
- Acima das abas continuam o quadro de avisos e *"Turmas com teto excedido"* (C-5); os **limites** saem dali para a
  aba Atividades.

### Aba Disciplinas (`data-slot="aba-disciplinas"`)

A grade de `GradeDeDisciplinas` sem a escolha de curso: filtros, os dois números, a pizza, a tabela com linha
expansível e o detalhe (Editar, Situação, Excluir, UEs, avaliações do currículo). **Nova disciplina**
(`data-slot="nova-disciplina"`) para `disciplinas.criar`, abrindo o formulário em modo de criação.

### Aba Avaliações (`data-slot="aba-avaliacoes-do-curriculo"`)

Por disciplina: CH, tempo de avaliação, tempo de aula, os itens do currículo (instrumento, número, UE, aplicação,
vista, origem) e os avisos do previsto. *Definir tempo* só com alcance do curso. Nenhum `data-slot` de turma.

### Aba Atividades (`data-slot="aba-atividades"`)

Os limites de AEC, TAD e TR (`data-limite`, com a origem), a referência do Estudo Individual (os dois percentuais,
informativos), *"o currículo não prevê"* para o Apoio Individualizado, e os tipos de atividade por categoria.

### Aba Horários (`data-slot="aba-horarios"`)

- **Regimes do curso** (`data-slot="regimes-do-curso"`, uma linha `data-slot="regime-do-curso"` por regime): nome,
  TA por dia, duração, início da manhã e da tarde, intervalos, relógio do catálogo, situação e quantas turmas o usam.
  *Novo regime* (`horarios.criar`), *Editar* (`horarios.editar`), *Inativar*/*Reativar* (`horarios.desativar`).
- **Vigências do regime do curso** (`data-slot="vigencias-do-curso"`): padrão e exceção, só leitura, com o link
  *Editar o regime do curso* para `/cursos/[curso]/editar` (quem tem `horarios.criar`).

## `/turmas/[turma]` — *Editar turma*

Campo **Regime de horário** (`#turma-regime`): *"Regime vigente do curso"* (vazio) e os regimes **ativos** do curso
(mais o atual, se inativo). Não aparece em turma EAD pura. Com lançamento, o campo fica travado com a frase do porquê.

## `/disciplinas` — só redireciona

`?curso=X[&situacao&busca&aberta]` → `/cursos/X?aba=disciplinas&…`; sem curso → `/cursos`; `?turma=T` → a seção de
disciplinas da ficha de T (como hoje).

## Menu

Sem *Disciplinas*: Início · Cursos · Turmas · Instrutores · Cronograma · Atividades · Administração. Registro datado
ao lado da `D-NAV-1` em `specs/008-shell-e-estado-na-url/contracts/casca.md`.
