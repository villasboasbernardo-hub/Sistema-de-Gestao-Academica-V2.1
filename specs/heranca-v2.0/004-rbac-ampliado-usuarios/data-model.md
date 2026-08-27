# Data Model — Épico F: RBAC Ampliado e Gestão de Usuários

Nenhuma coluna ou aba nova (schema já entregue pelo Épico C). Este documento cobre (a) o domínio
de perfis e sua matriz de permissão, (b) o mapeamento de `Escopo_Curso` para campos físicos
(Clarifications 2026-08-14), (c) validações de aplicação sobre `usuarios`/`instrutores`/
`instrutor_disciplina`, (d) as entradas novas de `CRUD_CONFIG`.

## Domínio de perfis (`PERFIS`, `lib/supabase/server.ts` — research.md achado 0)

| Perfil (valor literal) | Leitura | Escrita própria (além do que Admin/Operador já cobrem) |
|---|---|---|
| `Admin` | Total | Tudo, incluindo gestão de usuários |
| `Chefe_Departamento_Ensino` | Total | Nenhuma |
| `Encarregado_Divisao_Administracao_Academica` | Total | Cursos, turmas, disciplinas, instrutores, vínculo de habilitação, regime/horário, planejamento anual |
| `Ajudante_Divisao_Administracao_Academica` | Total | Idêntica ao Encarregado da mesma divisão |
| `Encarregado_Divisao_Orientacao_Educacional_Pedagogica` | Total | Disciplinas, avaliações planejadas/agendadas |
| `Ajudante_Divisao_Orientacao_Educacional_Pedagogica` | Total | Idêntica ao Encarregado da mesma divisão |
| `Operador` | Restrita ao `Escopo_Curso`, quando ≠ `Geral` | Registro de aulas/atividades, avaliações, extraclasse/extracurriculares, cadastro/edição/desativação de instrutor, vínculo de habilitação, regime/horário |
| `Encarregado_Curso` | Restrita ao(s) curso(s) em `usuario_curso` | Nenhuma |
| `Visualizacao` | Total | Nenhuma |

Agrupamentos derivados (constantes em `lib/supabase/server.ts`, usados por `exigirFuncao`):

```text
PERFIS_TODOS = [os 9 valores acima]  // qualquer leitura de escopo total
PERFIS_DIVISAO_ADMIN_ACADEMICA = ['Encarregado_Divisao_Administracao_Academica', 'Ajudante_Divisao_Administracao_Academica']
PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA = ['Encarregado_Divisao_Orientacao_Educacional_Pedagogica', 'Ajudante_Divisao_Orientacao_Educacional_Pedagogica']
```

`CRUD_CONFIG['instrutores'].escrita` e `CRUD_CONFIG['instrutor_disciplina'].escrita` =
`['Admin', 'Operador'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA)`.

## Mapeamento de `Escopo_Curso` (Clarifications 2026-08-14)

| `Escopo_Curso` | Campo comparado | Valores que casam |
|---|---|---|
| `Geral` | — (sem restrição) | qualquer curso |
| `Regular` | `cursos.Classificacao` | `Regular` |
| `Expedito` | `cursos.Classificacao` | `Expedito` |
| `Estagio_Qualificacao` | `cursos.Classificacao` | `Estágio de Qualificação` |
| `EAD_Semipresencial` | `turmas.Modalidade` | `EAD` ou `Semipresencial` |

Cursos com `Classificacao = Especial` ou `Aperfeiçoamento Avançado` só ficam visíveis para
`Escopo_Curso = Geral` — nenhum valor de escopo dedicado a eles (edge case do spec).

Núcleo puro (`cursoDentroDoEscopoOperador_`, `lib/dominio/regras-normativas.ts`):

```text
cursoDentroDoEscopoOperador_(escopoCurso, curso, turma) → boolean
  - escopoCurso vazio ou 'Geral' → true
  - escopoCurso em ['Regular','Expedito','Estagio_Qualificacao'] → curso.Classificacao bate (tabela acima)
  - escopoCurso === 'EAD_Semipresencial' → turma.Modalidade em ['EAD','Semipresencial']
  - senão → false
```

## Validações de aplicação sobre entidades existentes

### `usuarios` (`cadastrarUsuario`, `atualizarUsuario`, `desativarUsuario` — NOVAS)

| Campo | Validação |
|---|---|
| `Email` | Obrigatório no cadastro; **único** — `cadastrarUsuario` rejeita se já existir uma linha com o mesmo e-mail (case-insensitive, mesmo padrão de `getUsuarioAtual`), edge case do spec. |
| `Perfil` | Obrigatório; DEVE ser um dos 9 valores de `PERFIS`. |
| `Escopo_Curso` | Opcional, só relevante quando `Perfil = Operador`; se ausente, tratado como `Geral`. |
| `Status` | `atualizarUsuario`/`desativarUsuario` nunca removem a linha — `desativarUsuario` grava `Status = 'Inativo'` (usa `crudExcluir`, mas sem forçar o valor `'Cancelada'` — ver contrato). |

### `instrutores` (`cadastrarInstrutor`, `atualizarInstrutor`, `desativarInstrutor` — NOVAS)

Sem validação nova além da já existente na aba (campos obrigatórios do cadastro V1.0, preservados
sem alteração). `desativarInstrutor` usa `crudExcluir` genérico (Épico I) — `Status = 'Cancelada'`
não se aplica aqui (o domínio de `instrutores.Status` é `Ativo`/`Inativo`, não `Cancelada`) — ver
nota no contrato sobre o valor de "excluído" ser parametrizável por aba.

### `usuario_curso` (`vincularUsuarioACurso`, `desvincularUsuarioDeCurso` — NOVAS)

| Campo | Validação |
|---|---|
| `ID_Usuario` | Obrigatório; usuário DEVE existir e ter `Perfil = Encarregado_Curso` — vincular curso a qualquer outro perfil é rejeitado (o vínculo só tem efeito para esse perfil). |
| `ID_Curso` | Obrigatório; curso DEVE existir em `cursos`. |

### `instrutor_disciplina` (`criarVinculoHabilitacao` — NOVA)

| Campo | Validação |
|---|---|
| `ID_Instrutor` | Obrigatório; instrutor DEVE existir e estar `Ativo`. |
| `ID_Grade` | Obrigatório; disciplina DEVE existir em `disciplinas`. |
| `Modo_Atribuicao` | Opcional — herda `disciplinas.Modo_Atribuicao_Padrao` se ausente (RN-MAT-05, já resolvido pelo schema). |

### `disciplinas` (`atualizarDisciplina` — NOVA, research.md achado 7)

Sem validação de aplicação nova além da já existente na aba — só a permissão de escrita muda
(`Admin` + `PERFIS_DIVISAO_ADMIN_ACADEMICA` + `PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA`, FR-009 e
FR-011).

### `avaliacoes_planejadas` (`atualizarAvaliacaoPlanejada` — NOVA, research.md achado 7)

Sem validação de aplicação nova além da existente. Escrita restrita a `Admin` +
`PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA` — **não** inclui `PERFIS_DIVISAO_ADMIN_ACADEMICA` nem
`Operador` (FR-009).

### `instrutorHabilitado_` (`lib/dominio/regras-normativas.ts`, ALTERADA — research.md achado 5)

Passa a exigir **ambos**: `instrutor_disciplina.Status = 'Ativo'` **e**
`instrutores.Status = 'Ativo'` para o par `(idInstrutor, idGrade)`.

## Entradas novas em `CRUD_CONFIG`

```text
'usuarios':             { prefixo: 'USR', leitura: PERFIS_TODOS, escrita: ['Admin'], statusInativo: 'Inativo' },
'instrutores':        { prefixo: '',    leitura: PERFIS_TODOS, escrita: ['Admin','Operador'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA), statusInativo: 'Inativo' },
'instrutor_disciplina': { prefixo: 'VIN', leitura: PERFIS_TODOS, escrita: ['Admin','Operador'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA) },
'usuario_curso':        { prefixo: 'VIN', leitura: PERFIS_TODOS, escrita: ['Admin'] },
'disciplinas':      { prefixo: '',    leitura: PERFIS_TODOS, escrita: ['Admin'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA).concat(PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA) },
'avaliacoes_planejadas':{ prefixo: 'AVP', leitura: PERFIS_TODOS, escrita: ['Admin'].concat(PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA) },
```

As duas últimas fecham o achado C1 do `/speckit-analyze` (research.md, achado 7) — FR-009 não
tinha nenhuma cobertura na primeira versão deste documento.

`statusInativo` é um campo novo em `CRUD_CONFIG`, lido por `crudExcluir` (`cfg.statusInativo ||
'Cancelada'`) — `usuarios`/`instrutores` usam o domínio `Ativo`/`Inativo` já estabelecido pelo
Épico C, diferente do `Pendente/.../Cancelada` de `avaliacoes` (Épico I). Mantém `crudExcluir`
genérico sem regressão no comportamento já existente (abas sem `statusInativo` continuam gravando
`'Cancelada'`, o padrão atual).

`atividades_nao_letivas`/`avaliacoes` (já existentes) ganham só o campo `leitura: PERFIS_TODOS`
— `escrita` não muda (permanece `['Admin','Operador']`, RF operacional não se estende às Divisões).

## Entidades consumidas, inalteradas (referência)

- `usuario_curso`: `ID_Vinculo, ID_Usuario, ID_Curso, Status` — fonte do escopo de leitura de
  `Encarregado_Curso`. **Escrita nova, dentro do escopo de `app/(app)/admin/usuarios/page.tsx`** (User Story 2):
  sem uma forma de criar esse vínculo, o perfil `Encarregado_Curso` nunca teria uso prático — é
  parte de "editar perfil/escopo" (FR-005), no mesmo espírito de `Escopo_Curso` para `Operador`.
  Exposta via `vincularUsuarioACurso(idUsuario, idCurso)`/`desvincularUsuarioDeCurso(idVinculo)`
  em `lib/acoes/usuarios.ts`, visíveis na tela só quando `Perfil = Encarregado_Curso`.
- `cursos.Classificacao`, `turmas.Modalidade`: fonte do mapeamento de `Escopo_Curso`.
