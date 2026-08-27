# Contrato — Funções de Backend (`lib/acoes/liq.ts`, único arquivo tocado)

## `validarLiq_(ano, trimestre)` — ALTERADA (mesma assinatura/retorno)

Trecho relevante (FR-004 permanece idêntico; só o bloco FR-005 legado muda):

```js
function validarLiq_(ano, trimestre) {
  var intervalo = trimestreParaIntervalo_(ano, trimestre);
  var turmas = lerAbaComoObjetos_('turmas');
  var turmaDisciplinas = lerAbaComoObjetos_('turma_disciplina');
  var cursos = lerAbaComoObjetos_('cursos');
  // Spec 034 (FR-001): instrutor_disciplina removida desta funcao - a checagem de "instrutor
  // atribuido" passa a usar turma_disciplina.ID_Instrutor (selecao real), nao mais qualificacao.

  var turmaPorId = {};
  turmas.forEach(function (t) { turmaPorId[t['ID_Turma']] = t; });
  var nomeCursoPorId = {};
  cursos.forEach(function (c) { nomeCursoPorId[c['ID_Curso']] = c['Nome_Curso']; });

  var problemas = [];

  // FR-004: identico a hoje.
  turmas
    .filter(function (t) { /* ... identico ... */ })
    .forEach(function (t) { /* ... identico ... */ });

  // FR-005 (spec 027) corrigido pela spec 034: presenca de turma_disciplina.ID_Instrutor, nao
  // mais vinculo ativo em instrutor_disciplina para o ID_Grade exato.
  turmaDisciplinas.forEach(function (td) {
    var turma = turmaPorId[td['ID_Turma']];
    if (!turma || turma['Status'] === 'Cancelada') return;
    if (!td['Previsao_Inicio'] || !td['Previsao_Termino']) return;
    if (!intervalosSeInterceptam_(td['Previsao_Inicio'], td['Previsao_Termino'], intervalo.inicio, intervalo.fim)) return;

    var temInstrutorSelecionado = String(td['ID_Instrutor'] || '').trim().length > 0;
    if (temInstrutorSelecionado) return;
    problemas.push(
      'Disciplina ' + (td['Nome_Disciplina'] || td['ID_Grade']) + ' (curso ' +
      rotuloCursoLiq_(nomeCursoPorId, td['ID_Curso'], turma) + ') prevista para o ' +
      rotuloTrimestre_(trimestre) + ' sem instrutor selecionado. Selecione um instrutor para ' +
      'poder gerar a LIQ.'
    );
  });

  return { podeGerar: problemas.length === 0, problemas: problemas };
}
```

## `montarDadosSecao2Liq_(ano, trimestre)` — ALTERADA (mesma assinatura/retorno)

```js
function montarDadosSecao2Liq_(ano, trimestre) {
  var intervalo = trimestreParaIntervalo_(ano, trimestre);
  var turmas = lerAbaComoObjetos_('turmas');
  var turmaDisciplinas = lerAbaComoObjetos_('turma_disciplina');
  var instrutores = lerAbaComoObjetos_('instrutores');
  var cursos = lerAbaComoObjetos_('cursos');
  // Spec 034 (FR-003): vinculosAtivos/vinculosPorGrade (instrutor_disciplina) removidos - a lista
  // de instrutores por disciplina passa a vir de turma_disciplina.ID_Instrutor.

  var nomeCursoPorId = {};
  cursos.forEach(function (c) { nomeCursoPorId[c['ID_Curso']] = c['Nome_Curso']; });
  var instrutorPorId = {};
  instrutores.forEach(function (i) { instrutorPorId[i['ID_Instrutor']] = i; });

  var linhas = [];
  turmas
    .filter(function (t) {
      return t['Status'] !== 'Cancelada' &&
        intervalosSeInterceptam_(t['Data_Inicio'], t['Data_Termino'], intervalo.inicio, intervalo.fim);
    })
    .forEach(function (t) {
      turmaDisciplinas
        .filter(function (td) {
          return td['ID_Turma'] === t['ID_Turma'] && td['Previsao_Inicio'] && td['Previsao_Termino'] &&
            intervalosSeInterceptam_(td['Previsao_Inicio'], td['Previsao_Termino'], intervalo.inicio, intervalo.fim);
        })
        .forEach(function (td) {
          var instrutoresNomes = [];
          var observacoes = [];
          // FR-003/FR-005: instrutores REALMENTE selecionados para esta turma+disciplina; ID
          // orfao (sem instrutores correspondente) e omitido silenciosamente (RN-DEG-01).
          var idsSelecionados = String(td['ID_Instrutor'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          idsSelecionados.forEach(function (idInstrutor) {
            var inst = instrutorPorId[idInstrutor];
            if (!inst) return;
            instrutoresNomes.push(((inst['Posto_Graduacao'] || '') + ' ' + (inst['Nome_Completo'] || '')).trim());
            observacoes.push(inst['OM'] || '');
          });
          linhas.push({
            curso: rotuloCursoLiq_(nomeCursoPorId, t['ID_Curso'], t),
            disciplina: td['Nome_Disciplina'] || td['ID_Grade'],
            periodo: formatarPeriodoLiq_(td['Previsao_Inicio'], td['Previsao_Termino']),
            instrutores: instrutoresNomes.join('; '),
            observacoes: observacoes.join('; '),
          });
        });
    });
  return linhas;
}
```

**Compatibilidade**: nenhuma das 2 funções muda de assinatura ou de forma de retorno — só a origem
interna do dado de instrutor muda (constitution Princípio II). `gerarLiq`, que chama as duas, não
precisa de nenhuma mudança.

**Nenhuma outra função de backend é criada ou alterada** — `montarDadosSecao1Liq_`, `trimestreParaIntervalo_`,
`intervalosSeInterceptam_`, `rotuloCursoLiq_`, `formatarPeriodoLiq_` permanecem intocadas
(research.md §3).
