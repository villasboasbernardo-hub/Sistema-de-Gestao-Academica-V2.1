# Contrato — Funções de servidor expostas ao frontend (Épico F)

Mesma convenção dos épicos anteriores: toda função chamada via Server Action (wrapper
a Server Action) é síncrona do ponto de vista do chamador, lança `Error` com mensagem amigável em validação
falha (RN-DEG-01), e recebe um único objeto de entrada quando há mais de um campo.

## `getContextoInicial()` — ALTERADA (contrato de saída muda)

**Arquivo**: `app/layout.tsx` + `lib/supabase/server.ts``

**Entrada**: nenhuma.

**Saída (acrescenta)**:
```text
{
  usuario: { ..., perfil: string },  // já existia
  cursos: [...],   // agora filtrado por escopo do usuário (Clarifications 2026-08-14)
  turmas: [...],   // idem
}
```

**Erros**: `exigirFuncao` passa a aceitar `PERFIS_TODOS` em vez de `['Admin','Operador']` — só
falha para e-mail não cadastrado/inativo (já tratado por `app/layout.tsx`, não chega aqui).

**RN/FR**: RF-AUTH-03, FR-001, FR-003.

---

## `getPainelavaliacoesCurso(idCurso)` / `getCronos(idTurma)` / `getDsaSemanal(idTurma, semana)` / `getRelatorio(idCurso)` — ALTERADAS

**Arquivos**: `lib/acoes/avaliacoes.ts`, `lib/acoes/cronograma.ts`, `lib/acoes/dsa.ts`, `lib/acoes/relatorio.ts`

**Mudança**: `exigirFuncao(['Admin', 'Operador'])` vira `exigirFuncao(PERFIS_TODOS)`, seguido de
`exigirEscopoCurso_(usuario, idCurso)` (ou `exigirEscopoTurma_(usuario, idTurma)` nas que recebem
turma) logo em seguida. Assinatura e formato de saída inalterados.

**Erros (novo)**: `"Você não tem acesso a este curso."` quando o curso/turma pedido está fora do
escopo do usuário autenticado (`Encarregado_Curso` sem vínculo, ou `Operador` com `Escopo_Curso`
que não bate — Clarifications 2026-08-14).

**RN/FR**: RN-RBAC-02, FR-003, FR-012.

---

## `listarusuarios()` / `cadastrarUsuario(obj)` / `atualizarUsuario(idUsuario, obj)` / `desativarUsuario(idUsuario)` — NOVAS

**Arquivo**: `lib/acoes/usuarios.ts` (wrappers sobre `crudListar`/`crudCriar`/`crudAtualizar`/
`crudExcluir` de `lib/acoes/crud.ts`)

**Entrada de `cadastrarUsuario`**:
```text
{ Email: string, Nome: string, Perfil: string, Escopo_Curso: string }  // Escopo_Curso só relevante se Perfil='Operador'
```

**Erros**: `"E-mail obrigatório."`, `"Perfil inválido."` (fora do domínio de 9), `"Este e-mail já
está cadastrado."` (edge case do spec — checagem case-insensitive antes de `crudCriar`).

**RN/FR**: RF-AUTH-05, FR-005.

---

## `vincularUsuarioACurso(idUsuario, idCurso)` / `desvincularUsuarioDeCurso(idVinculo)` — NOVAS

**Arquivo**: `lib/acoes/usuarios.ts` (usa `crudCriar`/`crudExcluir` sobre `usuario_curso`)

**Erros**: `"Usuário não encontrado."`, `"Vincular curso só se aplica ao perfil Encarregado de
Curso."` (se `usuarios[idUsuario].Perfil !== 'Encarregado_Curso'`), `"Curso não encontrado."`.

**RN/FR**: FR-003, FR-012 (parte da tela de gestão de usuários, data-model.md).

---

## `listarInstrutores()` / `cadastrarInstrutor(obj)` / `atualizarInstrutor(idInstrutor, obj)` / `desativarInstrutor(idInstrutor)` — NOVAS

**Arquivo**: `lib/acoes/instrutores.ts` (wrappers sobre `crudListar`/`crudCriar`/`crudAtualizar`/
`crudExcluir` de `lib/acoes/crud.ts` sobre `instrutores`)

**Erros**: os já validados pelo `CRUD_CONFIG['instrutores']` (perfil autorizado) + validações de
campo obrigatório já existentes na aba (sem mudança de regra, só de quem pode chamar).

**RN/FR**: RN-RBAC-02, FR-007.

---

## `criarVinculoHabilitacao(obj)` — NOVA

**Arquivo**: `lib/acoes/instrutores.ts`

**Entrada**:
```text
{ ID_Instrutor: string, ID_Grade: string, Modo_Atribuicao: string }  // Modo_Atribuicao opcional
```

**Erros**: `"Instrutor não encontrado ou inativo."`, `"Disciplina não encontrada."`.

**RN/FR**: RN-RBAC-02, RN-MAT-05, FR-008.

---

## `listarDisciplinas()` / `atualizarDisciplina(idGrade, obj)` — NOVAS

**Arquivo**: `lib/acoes/disciplinas.ts` (wrappers sobre `crudListar`/`crudAtualizar` de
`lib/acoes/crud.ts` sobre `disciplinas`) — research.md, achado 7 (fecha o achado C1 do
`/speckit-analyze`).

**Erros**: os já validados por `CRUD_CONFIG['disciplinas']` (perfil autorizado) + validações
de campo já existentes na aba, sem mudança de regra.

**RN/FR**: RN-RBAC-02, FR-009, FR-011.

---

## `listaravaliacoesPlanejadas(idCurso)` / `atualizarAvaliacaoPlanejada(idItem, obj)` — NOVAS

**Arquivo**: `lib/acoes/disciplinas.ts` (wrappers sobre `crudListar`/`crudAtualizar` sobre
`avaliacoes_planejadas`) — research.md, achado 7.

**Erros**: os já validados por `CRUD_CONFIG['avaliacoes_planejadas']` — só `Admin` e
`PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA` autorizados (não `Operador` nem
`PERFIS_DIVISAO_ADMIN_ACADEMICA`, diferente de `disciplinas`).

**RN/FR**: RN-RBAC-02, FR-009.

---

## `instrutorHabilitado_(idInstrutor, idGrade)` — ALTERADA (função interna, sem contrato de frontend)

**Arquivo**: `lib/dominio/regras-normativas.ts`

Passa a exigir `instrutores.Status = 'Ativo'` além de `instrutor_disciplina.Status = 'Ativo'`
(research.md, achado 5). Chamada por `registrarAvaliacao` (Épico I) — nenhuma mudança de
assinatura, só de comportamento.

**RN/FR**: RN-INST-01.
