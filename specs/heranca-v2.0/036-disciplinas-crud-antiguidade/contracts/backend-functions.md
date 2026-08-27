# Contrato: Funções de Backend — Expansão de CRUD e Ordenação Hierárquica (Disciplinas)

## `CRUD_CONFIG['turma_disciplina'].prefixo` — CORRIGIDO (`lib/acoes/crud.ts`)

**Antes**: `{ prefixo: '', leitura: PERFIS_TODOS, escrita: [...] }`
**Depois**: `{ prefixo: 'TDI', leitura: PERFIS_TODOS, escrita: [...] }`

**Efeito**: `crudCriar('turma_disciplina', obj)` sem `ID_turma_disciplina` explícito passa a gerar
`TDI-NNNNNN` via `gerarProximoId_` (já genérico), lendo o maior `TDI-NNNNNN` já existente (as 210+
linhas reais seguem esse padrão). Nenhuma outra tabela é afetada.

**Casos de teste esperados**:
- `crudCriar('turma_disciplina', { ID_Turma: 'T-1', ID_Grade: 'G-1' })` grava um `ID_turma_disciplina`
  no formato `TDI-NNNNNN`, nunca vazio.
- O próximo ID gerado é `MAX(TDI-NNNNNN existente) + 1`, não reinicia em `TDI-000001` se já
  existirem linhas.

---

## `getPesosPrioridadeDisciplinas()` — NOVA (`lib/dominio/motor-preditivo.ts`)

**Perfil de leitura**: `PERFIS_TODOS`.

**Parâmetros**: nenhum.

**Retorno**: `{ [idGrade: string]: number }` — mesmo mapa devolvido por `lerPesosPrioridadeDisciplina_`
(interna, inalterada).

**Comportamento**: wrapper de 1 linha — `return lerPesosPrioridadeDisciplina_();` com o guard de
`exigirFuncao` na frente.

**Casos de teste esperados**:
- `config_parametros` sem nenhuma chave `PRIORIDADE_DISCIPLINA_*` → `{}`.
- 2 chaves `PRIORIDADE_DISCIPLINA_G-1`/`PRIORIDADE_DISCIPLINA_G-2` → mapa com as 2 entradas,
  valores numéricos (não string).

---

## `existeCodDisciplinaNoCurso_(disciplinas, idCurso, codDisciplina, idGradeExcluir)` — NOVA, função pura (`lib/acoes/disciplinas.ts`)

**Parâmetros**:
- `disciplinas`: array já lido de `disciplinas` (evita releitura — quem chama já tem o array
  em mãos).
- `idCurso`, `codDisciplina`: valores a checar.
- `idGradeExcluir`: `ID_Grade` a ignorar na comparação (a própria linha, ao editar sem mudar o
  Código) — `null`/`undefined` no cadastro (nenhuma linha própria ainda).

**Retorno**: `boolean` — `true` se já existe outra disciplina com o mesmo `ID_Curso`+`Cod_Disciplina`
(comparação normalizada, mesmo critério de `normalizarTexto_` — maiúsculas/sem acento).

**Casos de teste esperados**:
- Mesmo Curso + mesmo Código (linha diferente) → `true`.
- Mesmo Código, Curso diferente → `false` (unicidade é por curso, não global).
- Mesmo Curso + mesmo Código, mas é a própria linha (`idGradeExcluir` bate) → `false` (permite
  salvar sem mudar o Código).
- Comparação ignora diferença de maiúsculas/minúsculas e espaços nas pontas.

---

## `atualizarDisciplina(idGrade, obj)` — ESTENDIDA, mesma assinatura (`lib/acoes/disciplinas.ts`)

**Antes**: wrapper fino de `crudAtualizar('disciplinas', idGrade, obj)`.

**Depois**: antes de `crudAtualizar`, se `obj.Cod_Disciplina` estiver presente, valida unicidade
via `existeCodDisciplinaNoCurso_` (lança `Error` se duplicado, FR-006) — precisa ler a linha atual
para saber o `ID_Curso`. Depois de `crudAtualizar` ter sucesso, se `obj.Cod_Disciplina` ou
`obj.Nome_Disciplina` estiverem presentes, propaga para toda linha de `turma_disciplina` com o
mesmo `ID_Grade` (FR-006.1, research.md §7).

**Contrato de não regressão**: assinatura e formato de retorno (`{ ok: true, id: idGrade }`)
idênticos — chamadores existentes (`salvarDisciplina`, `app/(app)/disciplinas/page.tsx`) continuam
funcionando sem mudança.

**Casos de teste esperados**:
- Editar só `Carga_Horaria_Tempos` (sem `Cod_Disciplina`) → nenhuma checagem de unicidade, nenhuma
  propagação (comportamento hoje, inalterado).
- Editar `Cod_Disciplina` para um valor já usado no mesmo curso → lança erro, `crudAtualizar` nunca
  é chamado (nenhuma gravação parcial).
- Editar `Cod_Disciplina` para o Código já usado, mas por 2 turmas vinculadas ao próprio `ID_Grade`
  sendo editado → as 2 linhas de `turma_disciplina` são atualizadas com o novo Código.
- Editar `Nome_Disciplina` sem mudar `Cod_Disciplina` → propaga só `Nome_Disciplina` para
  `turma_disciplina`, preserva o `Cod_Disciplina` de cada linha.

---

## `cadastrarDisciplina(dados)` — NOVA (`lib/acoes/disciplinas.ts`)

**Perfil de escrita**: mesmo de `CRUD_CONFIG['disciplinas'].escrita` (`Admin` + Divisão de
Administração Acadêmica + Divisão de Orientação Pedagógica).

**Parâmetros**: ver `data-model.md` (`idCurso`, `idTurma` obrigatórios — FR-010; `Cod_Disciplina`/
`Nome_Disciplina` obrigatórios; demais opcionais).

**Comportamento**:
1. Valida `idCurso`/`idTurma` presentes (FR-010) — lança erro antes de qualquer leitura/escrita se
   ausentes.
2. Valida que a turma informada pertence ao curso informado (checagem estrutural, mesmo espírito
   de `intervaloContidoEm_`/`exigirEscopoTurma_` já usados no projeto).
3. Lê `disciplinas`, valida unicidade de `Cod_Disciplina` dentro do `idCurso`
   (`existeCodDisciplinaNoCurso_`, FR-006) — lança erro antes de qualquer escrita se duplicado.
4. Gera `ID_Disciplina` (`gerarProximoIdSequencial_`) e monta `ID_Grade` (research.md §4).
5. `crudCriar('disciplinas', {...})` — cria a linha de catálogo, `Status: 'Ativo'`.
6. `crudCriar('turma_disciplina', {...})` — cria a linha de vínculo, `Origem_Periodo: 'Manual'`,
   `Status: 'Ativo'`. **Em caso de erro**: `crudExcluir('disciplinas', 'ID_Grade', idGrade)`
   (rollback, FR-013) e relança o erro original.
7. Retorna `{ idGrade, idTurmaDisciplina }`.

**Contrato de integridade (FR-013)**: nenhuma chamada bem-sucedida desta função pode deixar uma
linha `Ativa` em `disciplinas` sem uma linha `Ativa` correspondente em `turma_disciplina`.

**Casos de teste esperados**:
- Cadastro completo e válido → cria as 2 linhas, `ID_Grade`/`ID_turma_disciplina` corretos, retorno
  com os 2 IDs.
- `idTurma` ausente → lança erro, nenhuma escrita em nenhuma das 2 tabelas.
- Turma informada não pertence ao Curso informado → lança erro, nenhuma escrita.
- `Cod_Disciplina` já usado no mesmo curso → lança erro, nenhuma escrita.
- Falha simulada na criação de `turma_disciplina` (ex.: `ID_Turma` inválido) depois do catálogo já
  criado → `disciplinas` tem a linha marcada inativa/cancelada (não removida fisicamente),
  erro relançado ao chamador (prova do rollback, FR-013/SC-006).
- 2 chamadas sucessivas de cadastro (cursos diferentes) → `ID_Disciplina` sequencial correto nas 2
  (nunca reinicia por curso), `ID_Grade` de cada uma reflete o curso certo.
