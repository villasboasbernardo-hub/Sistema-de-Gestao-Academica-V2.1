# Contrato — Funções de Backend (únicos 2 pontos tocados)

## ``app/layout.tsx` + `lib/supabase/server.ts`` — `carregarContextoInicial` (ou função equivalente que monta `AppState.ctx.turmas`)

**Mudança**: aditiva. O objeto `turmas` mapeado a partir de `lerAbaComoObjetos_('turmas')` ganha
2 campos novos, sem remover nem renomear nenhum campo existente:

```js
{
  idTurma: t['ID_Turma'],
  idCurso: t['ID_Curso'],
  nome: t['Nome_Completo_Curso'] || '',
  status: t['Status'],
  dataInicio: t['Data_Inicio'] || '',
  dataTermino: t['Data_Termino'] || '',
  turma: t['Turma'] || '',           // NOVO — spec 031, FR-012
  anoLetivo: t['Ano_Letivo'] || '',  // NOVO — spec 031, FR-012
}
```

**Compatibilidade**: 100% aditiva — nenhum consumidor existente de `AppState.ctx.turmas` (Painel
Início, `app/(app)/cursos/[curso]/page.tsx`, `app/(app)/disciplinas/page.tsx` atual) lê `turma`/`anoLetivo`, então nada quebra.

## `lib/acoes/estatisticas.ts` — `getEstatisticasDisciplinas(filtros)`

**Assinatura atual**: `function getEstatisticasDisciplinas()` — sem parâmetro.

**Assinatura nova**: `function getEstatisticasDisciplinas(filtros)` — `filtros` opcional
(`undefined`/`null`/`{}` reproduzem exatamente o comportamento global de hoje).

```js
function getEstatisticasDisciplinas(filtros) {
  var usuario = exigirFuncao(PERFIS_TODOS);
  filtros = filtros || {};
  if (filtros.idTurma) exigirEscopoTurma_(usuario, filtros.idTurma);
  else if (filtros.idCurso) exigirEscopoCurso_(usuario, filtros.idCurso);

  var disciplinas = lerAbaComoObjetos_('disciplinas').filter(function (d) {
    return d['Status'] === 'Ativo' && (!filtros.idCurso || d['ID_Curso'] === filtros.idCurso);
  });

  var executadoPorGrade = {};
  lerAbaComoObjetos_('registros_aula').filter(function (r) {
    return r['Categoria_Normativa'] === 'Aula' && r['Status'] !== 'Cancelada'
      && (!filtros.idTurma || r['ID_Turma'] === filtros.idTurma);
  }).forEach(function (r) {
    executadoPorGrade[r['ID_Grade']] = (executadoPorGrade[r['ID_Grade']] || 0) + (Number(r['Tempos_Consumidos']) || 0);
  });

  // Selecao real por turma (spec 029) em vez do campo legado de disciplinas quando ha idTurma —
  // ver research.md Secao 2.
  var selecionadosPorGrade = null;
  if (filtros.idTurma) {
    selecionadosPorGrade = {};
    lerAbaComoObjetos_('turma_disciplina').filter(function (td) {
      return td['ID_Turma'] === filtros.idTurma;
    }).forEach(function (td) {
      selecionadosPorGrade[td['ID_Grade']] = td['ID_Instrutor'] || '';
    });
  }

  // ... resto identico ao hoje (concluida/atrasada/statusContagem), trocando so a origem de
  // "atribuidos" quando selecionadosPorGrade nao for null:
  //   var idInstrutorBruto = selecionadosPorGrade ? (selecionadosPorGrade[d['ID_Grade']] || '') : (d['ID_Instrutor'] || '');
}
```

**Compatibilidade**: chamada sem argumento (todo consumidor existente, se houver, além de
`app/(app)/disciplinas/page.tsx`) devolve exatamente o mesmo resultado global de hoje — coberto por teste de
regressão explícito (`filtros` ausente ⇒ mesmo resultado que a versão sem parâmetro).

**Guarda de escopo (RBAC)**: `exigirEscopoTurma_`/`exigirEscopoCurso_` já existem em ``lib/supabase/middleware.ts` + policies RLS`
(usadas por `lib/acoes/cronograma.ts`) — nenhuma função de guarda nova.

**Nenhuma outra função de backend é criada ou alterada** (`atualizarDisciplina`,
`definirPrioridadeDisciplina`, `atualizarTurmaDisciplina`, `getDisciplinasDaTurmaComRitmo`,
`crudListar` genérico — todas reaproveitadas sem mudança, FR-013).
