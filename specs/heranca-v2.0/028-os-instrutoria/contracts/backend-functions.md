# Contrato — Funções de Backend (`lib/acoes/os-instrutoria.ts`, novo)

## `semestreParaIntervalo_(ano, semestre)`

Pura. `semestre` ∈ {1,2}.

**Retorno**: `{ inicio: Date-string 'YYYY-MM-DD', fim: 'YYYY-MM-DD' }` — 1º semestre `AAAA-01-01` a
`AAAA-06-30`, 2º `AAAA-07-01` a `AAAA-12-31`.

## `calcularOsInstrutoria(filtros)`

Função pública exposta via Server Action. `filtros`: ver `data-model.md` § Entrada.

1. Lê `registros_aula`, `instrutores`, `disciplinas`, `turmas` uma única
   vez cada (`lerAbaComoObjetos_`).
2. Filtra registros: `Categoria_Normativa === 'Aula'` E turma associada (`ID_Turma`) não `Cancelada`.
3. Se `filtros.modalidade === 'Curso'`: mantém só registros cuja disciplina (`ID_Grade` →
   `disciplinas.ID_Curso`) é igual a `filtros.idCurso`.
4. Se `filtros.modalidade === 'Periodo'`: calcula o intervalo via `trimestreParaIntervalo_`
   (`lib/acoes/liq.ts`, spec 027) ou `semestreParaIntervalo_` conforme `filtros.tipoRecorte`, e mantém só
   registros cuja própria `Data` cai dentro do intervalo (research.md § 2 — correção de
   planejamento, não filtro por interseção de período de turma).
5. Agrupa os registros filtrados por `ID_Instrutor`, e dentro de cada instrutor por `ID_Grade`,
   calculando `inicio`/`termino` como mín/máx de `Data` por par (instrutor, disciplina).
6. Monta os nós de instrutor (ver `data-model.md` § Saída) via `montarNoInstrutorOs_`, descartando
   qualquer `ID_Instrutor` sem correspondência em `instrutores` (RN-DEG-01, nunca lança exceção).
7. Ordena o array de instrutor por `Antiguidade_Declarada` ascendente (RN-ANT-01, research.md § 5).
8. Retorna o array (pode ser vazio — nunca lança exceção para "nenhum resultado").

## `montarNoInstrutorOs_(instrutor, disciplinasAgrupadas)`

Função pura auxiliar. Recebe a linha de `instrutores` e o mapa já agrupado de disciplinas
(`{idGrade: {inicio, termino}}`) para aquele instrutor; monta 1 nó de saída (`data-model.md` §
Saída), incluindo a conversão `Capacitacao_Didatica` → `'SIM'`/`'NÃO'` (`trim()` não-vazio → SIM).
