# Research: Módulo de Disciplinas — Cascata Limpa, Nomenclatura de Turma e Tabela Expansível

## 1. Estatísticas reativas: client-side puro vs. endpoint parametrizado

**Decisão**: ``lib/acoes/estatisticas.ts`:getEstatisticasDisciplinas` ganha um parâmetro opcional
`filtros = { idCurso, idTurma }`, retrocompatível (chamada sem argumento continua devolvendo
exatamente o total global de hoje). O frontend chama `gs('getEstatisticasDisciplinas', filtros)`
a cada troca de Curso/Turma — 1 chamada de rede por seleção, igual a todo o resto da cascata
(`carregarDisciplinas`, `popularTurmasDisciplinas_` já fazem o mesmo hoje).

**Rationale**: O spec (Assumptions) já previu e autorizou essa revisão: "se o volume de dados
tornar esse caminho inviável, o plano técnico pode revisar para um endpoint parametrizado sem
reabrir esta spec". Investigação confirmou que o caminho 100% client-side (precedente da spec 015,
Instrutores) não se sustenta aqui: a spec 015 recalculava a partir de um array já carregado
inteiramente no cliente (poucas centenas de instrutores, 1 chamada). Aqui, a "CH Cumprida" por
curso (Visão 1, sem turma) exige somar `registros_aula` (1.753 linhas) por
`ID_Grade` das disciplinas do curso — dado que **não** é carregado no cliente em nenhum ponto do
fluxo atual (a Visão 2/turma já carrega o equivalente via `getDisciplinasDaTurmaComRitmo`, mas só
para 1 turma por vez). Baixar as 1.753 linhas a cada abertura da tela para permitir recálculo
puramente local seria mais caro em rede do que 1 chamada a Server Action filtrada por seleção. A meta real
de FR-010 ("reativo, sem ação manual") é satisfeita por qualquer chamada disparada automaticamente
pela troca de `<select>` — o precedente da spec 015 evitava chamada **por tecla digitada** num
campo de busca (alto volume de eventos); aqui são no máximo 2 eventos discretos (Curso, Turma).

**Alternatives considered**:
- Client-side puro com pré-carga de `registros_aula` inteira no boot — rejeitado
  (infla o payload de boot para todos os usuários, mesmo os que nunca abrem este módulo).
- Client-side puro sem CH Cumprida no card (só contagens estruturais) — rejeitado, quebraria a
  paridade com o card global hoje (que já inclui `atrasadas`/`concluídas`, derivados de CH
  Cumprida).

## 2. `semInstrutor` — qualificação vs. seleção (achado de correção, não regressão)

**Decisão**: Quando `filtros.idTurma` é informado, o KPI `semInstrutor` passa a considerar
`turma_disciplina.ID_Instrutor` (a seleção real por turma, spec 029) em vez de
`disciplinas.ID_Instrutor` (campo legado, nunca atualizado desde a spec 029). Quando só
`filtros.idCurso` é informado (ou nenhum filtro, comportamento global), a função **mantém** a
leitura de `disciplinas.ID_Instrutor` exatamente como hoje — sem mudança de comportamento no
caminho global (constitution Princípio II).

**Rationale**: `disciplinas.ID_Instrutor` é o campo "semente" de nível de grade, congelado na
migração da spec 029 — ele nunca reflete uma troca de instrutor feita depois, em nenhuma turma
específica (achado já registrado no spec 029: "nunca a fonte de verdade daqui para frente"). Usar
esse campo para o card "Sem instrutor" da Visão 2 (turma específica) produziria números
incorretos sempre que a seleção real (`turma_disciplina.ID_Instrutor`) divergisse da semente — o
mesmo tipo de inconsistência que a spec 029 já corrigiu na tabela, mas que `lib/acoes/estatisticas.ts` nunca
recebeu. Esta é uma correção pontual habilitada pela extensão do parâmetro, não uma mudança de
escopo desta spec 031 — só se manifesta quando `idTurma` é passado, caminho que não existe hoje.

**Alternatives considered**: Deixar `semInstrutor` sempre olhando `disciplinas.ID_Instrutor`
mesmo com `idTurma` — rejeitado, produziria um card visivelmente errado ao lado de uma tabela
(Visão 2) que já mostra a seleção correta via `turma_disciplina.ID_Instrutor` logo abaixo.

## 3. Nomenclatura de turma — origem do dado e degradação

**Decisão**: ``app/layout.tsx` + `lib/supabase/server.ts`` passa a expor `turma: t['Turma']` e `anoLetivo: t['Ano_Letivo']` em
`AppState.ctx.turmas` (campos crus de `turmas`, confirmados no baseline
`baseline/v1-snapshot/turmas.json`). O frontend agrupa as turmas carregadas por
`idCurso+anoLetivo`; se o grupo tiver 1 turma, label = `"Turma " + anoLetivo`; se tiver mais de
uma, label = `"Turma " + NN + "/" + anoLetivo`, onde `NN` vem de extrair os dígitos de `turma`
(`"T1"`→`"01"`) com `padStart(2, '0')`. Se `anoLetivo` estiver vazio, degrada para o `nome`
(`Nome_Completo_Curso`) já usado hoje — nunca quebra o seletor (RN-DEG-01, constitution Princípio
V).

**Rationale**: Dado já existe, não precisa de migração nem de novo cálculo no backend — só passar
os 2 campos adiante. A extração de dígitos de `Turma` é suficiente para os 2 valores observados na
base (`T1`, `T2`); um valor fora desse padrão (`/^T?(\d+)$/` sem match) degrada para exibir o valor
cru de `Turma` sem tentar normalizar (evita mascarar dado inesperado).

## 4. `CH Cumprida` na Visão 2 — reaproveitamento direto

**Decisão**: A tabela unificada, ao carregar a Visão 2, chama também
`gs('getDisciplinasDaTurmaComRitmo', idTurma)` (função já existente, Épico 009 FR-008) em paralelo
com as 3 chamadas já usadas pela spec 030 (`crudListar('turma_disciplina'/'instrutor_disciplina'/
'instrutores')`), e casa o resultado por `idGrade` para preencher a coluna "CH Cumprida"
(`chExecutada` do retorno).

**Rationale**: Função já filtra exatamente pelo que é preciso (`ID_Turma` + `Categoria_Normativa
==='Aula'` + não cancelada) — reaproveitamento direto, zero função nova, coerente com FR-013.

## 5. Guarda de escopo (RBAC) na extensão de `getEstatisticasDisciplinas`

**Decisão**: Quando `filtros.idTurma` é informado, a função chama `exigirEscopoTurma_(usuario,
filtros.idTurma)` (já existente, ``lib/supabase/middleware.ts` + policies RLS`) antes de agregar — mesma guarda já usada por
`getDisciplinasDaTurmaComRitmo`/`getCronogramaGlobalDisciplina`. Quando só `filtros.idCurso` é
informado, chama `exigirEscopoCurso_(usuario, filtros.idCurso)`. Sem nenhum filtro (chamada global,
comportamento atual), nenhuma guarda de escopo nova é adicionada — preserva 100% o comportamento
hoje.

**Rationale**: Todo outro ponto de leitura turma/curso-scoped no projeto (`lib/acoes/cronograma.ts`) já usa
essa dupla de guardas — deixar `getEstatisticasDisciplinas` de fora ao ganhar um parâmetro de
turma seria uma inconsistência de segurança nova, não presente antes (antes a função nunca aceitava
escopo nenhum).

## 6. Layout dos 2 controles de "Ações" (Visão 2)

**Decisão**: Confirmada em `/speckit-clarify` (Opção A) — inputs inline de CH/Prioridade + botão
"Salvar" (como hoje) e um botão "Editar" separado que abre o painel de período/instrutor já
existente (spec 030), sem nenhum campo novo nesse painel.

**Rationale**: Já documentado em `spec.md` §Clarifications — reaproveita 100% o painel de edição já
em produção, menor risco de regressão no fluxo que já funciona (spec 030, deployment `@52`).
