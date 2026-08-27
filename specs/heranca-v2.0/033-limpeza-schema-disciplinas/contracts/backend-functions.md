# Contrato — Funções de Backend (`lib/acoes/cronograma.ts`, único arquivo `.ts` tocado)

## `resolverPeriodoEfetivo_(linhaTurmaDisciplina, disciplinaGrade)` — NOVA, função pura

```js
function resolverPeriodoEfetivo_(linhaTurmaDisciplina, disciplinaGrade) {
  var temPeriodoTurma = linhaTurmaDisciplina && linhaTurmaDisciplina['Previsao_Inicio'] && linhaTurmaDisciplina['Previsao_Termino'];
  if (temPeriodoTurma) {
    return { inicio: linhaTurmaDisciplina['Previsao_Inicio'], termino: linhaTurmaDisciplina['Previsao_Termino'] };
  }
  return {
    inicio: disciplinaGrade ? (disciplinaGrade['Previsao_Inicio'] || null) : null,
    termino: disciplinaGrade ? (disciplinaGrade['Previsao_Termino'] || null) : null,
  };
}
```

## `getDisciplinasDaTurmaComRitmo(idTurma)` — ALTERADA (mesma assinatura/retorno)

```js
function getDisciplinasDaTurmaComRitmo(idTurma) {
  var usuario = exigirFuncao(PERFIS_TODOS);
  exigirEscopoTurma_(usuario, idTurma);
  var turma = lerAbaComoObjetos_('turmas').filter(function (t) { return t['ID_Turma'] === idTurma; })[0];
  if (!turma) return [];

  var disciplinas = lerAbaComoObjetos_('disciplinas').filter(function (d) {
    return d['ID_Curso'] === turma['ID_Curso'] && d['Status'] === 'Ativo';
  }).sort(function (a, b) { return (Number(a['Ordem_Sugerida']) || 999) - (Number(b['Ordem_Sugerida']) || 999); });

  // Spec 033 (FR-003): turma_disciplina desta turma, indexada por ID_Grade - fonte preferida de
  // periodo sobre a semente de disciplinas.
  var turmaDisciplinaPorGrade = {};
  lerAbaComoObjetos_('turma_disciplina').filter(function (td) {
    return td['ID_Turma'] === idTurma;
  }).forEach(function (td) { turmaDisciplinaPorGrade[td['ID_Grade']] = td; });

  var executadoPorGrade = {};
  lerAbaComoObjetos_('registros_aula').filter(function (r) {
    return r['ID_Turma'] === idTurma && r['Categoria_Normativa'] === 'Aula' && r['Status'] !== 'Cancelada';
  }).forEach(function (r) {
    executadoPorGrade[r['ID_Grade']] = (executadoPorGrade[r['ID_Grade']] || 0) + (Number(r['Tempos_Consumidos']) || 0);
  });

  var hoje = new Date();
  var RITMO_ROTULO = { abaixo: 'Atrasada', ideal: 'No Prazo', acima: 'Adiantada' };

  return disciplinas.map(function (d) {
    var chTotal = Number(d['Carga_Horaria_Tempos']) || 0;
    var chExecutada = executadoPorGrade[d['ID_Grade']] || 0;
    var statusConclusao = chExecutada <= 0 ? 'Não Iniciada' : (chExecutada >= chTotal && chTotal > 0 ? 'Concluída' : 'Em Andamento');
    var periodo = resolverPeriodoEfetivo_(turmaDisciplinaPorGrade[d['ID_Grade']], d);
    var ritmoBruto = calcularRitmoDisciplina_(chExecutada, chTotal, periodo.inicio, periodo.termino, hoje);
    return {
      idGrade: d['ID_Grade'], nome: d['Nome_Disciplina'],
      chExecutada: chExecutada, chTotal: chTotal,
      statusConclusao: statusConclusao,
      ritmo: ritmoBruto ? RITMO_ROTULO[ritmoBruto] : null,
    };
  });
}
```

## `getCronogramaGlobalDisciplina(idGrade, idTurma)` — ALTERADA (mesma assinatura/retorno)

```js
function getCronogramaGlobalDisciplina(idGrade, idTurma) {
  var usuario = exigirFuncao(PERFIS_TODOS);
  exigirEscopoTurma_(usuario, idTurma);
  var disciplina = lerAbaComoObjetos_('disciplinas').filter(function (d) { return d['ID_Grade'] === idGrade; })[0];
  if (!disciplina) throw new Error('Disciplina não encontrada: ' + idGrade);

  // Spec 033 (FR-004): mesma preferencia de resolverPeriodoEfetivo_.
  var linhaTurmaDisciplina = lerAbaComoObjetos_('turma_disciplina').filter(function (td) {
    return td['ID_Grade'] === idGrade && td['ID_Turma'] === idTurma;
  })[0];
  var periodo = resolverPeriodoEfetivo_(linhaTurmaDisciplina, disciplina);

  var datas = lerAbaComoObjetos_('registros_aula').filter(function (r) {
    return r['ID_Grade'] === idGrade && r['ID_Turma'] === idTurma && r['Categoria_Normativa'] === 'Aula' && r['Status'] !== 'Cancelada';
  }).map(function (r) { return r['Data']; }).filter(Boolean).sort();

  return {
    idGrade: idGrade, idTurma: idTurma,
    previsaoInicio: periodo.inicio,
    previsaoTermino: periodo.termino,
    dataRealInicio: datas.length ? datas[0] : null,
    dataRealTermino: datas.length ? datas[datas.length - 1] : null,
  };
}
```

**Compatibilidade**: nenhuma das 2 funções muda de assinatura ou de forma de retorno — só a origem
interna do dado de período muda, e só nos casos em que `turma_disciplina` tem um período diferente
da semente (constitution Princípio II).

**Nenhuma outra função de backend é criada ou alterada** — `lib/dominio/motor-preditivo.ts`, `lib/acoes/estatisticas.ts`,
`lib/dominio/sugestao-dsa.ts`, `atualizarTurmaDisciplina`, todo o resto de `lib/acoes/cronograma.ts`, permanecem intocados
(research.md §3).
