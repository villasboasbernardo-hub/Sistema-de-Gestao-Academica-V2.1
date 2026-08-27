# Contrato — Funções de Backend (`lib/acoes/liq.ts`, único arquivo tocado)

## `calcularChPrevistaPorInstrutor_(idsInstrutorSelecionados, chTotalDisciplina, dividirCargaHoraria)` — NOVA, função pura

```js
function calcularChPrevistaPorInstrutor_(idsInstrutorSelecionados, chTotalDisciplina, dividirCargaHoraria) {
  var chTotal = Number(chTotalDisciplina) || 0;
  var ids = (idsInstrutorSelecionados || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
  if (!ids.length) return '';
  if (ids.length === 1 || !dividirCargaHoraria) {
    return ids.map(function (id) { return id + ':' + chTotal; }).join(', ');
  }
  var base = Math.floor(chTotal / ids.length);
  var resto = chTotal - (base * ids.length);
  return ids.map(function (id, i) {
    var valor = base + (i === ids.length - 1 ? resto : 0);
    return id + ':' + valor;
  }).join(', ');
}
```

Contrato de comportamento (data-model.md): 0 ids → `''`; 1 id → CH integral; N ids sem dividir → CH
integral cada; N ids dividindo → divisão inteira, resto no último da lista.

## `atualizarTurmaDisciplina(idTurmaDisciplina, alteracoes, dividirCargaHoraria)` — ALTERADA

**Assinatura atual** (spec 029): `function atualizarTurmaDisciplina(idTurmaDisciplina, alteracoes)`.

**Assinatura nova**: 3º parâmetro `dividirCargaHoraria` opcional (boolean, default falsy —
retrocompatível com as 2 chamadas existentes de `app/(app)/cursos/[curso]/page.tsx`/`app/(app)/disciplinas/page.tsx` até serem
atualizadas nesta mesma spec).

```js
function atualizarTurmaDisciplina(idTurmaDisciplina, alteracoes, dividirCargaHoraria) {
  exigirFuncao(CRUD_CONFIG['turma_disciplina'].escrita);

  var linhaAtual = lerAbaComoObjetos_('turma_disciplina').filter(function (l) {
    return String(l['ID_turma_disciplina']) === String(idTurmaDisciplina);
  })[0];
  if (!linhaAtual) throw new Error('Linha de turma_disciplina não encontrada: ' + idTurmaDisciplina);

  var turma = lerAbaComoObjetos_('turmas').filter(function (t) {
    return String(t['ID_Turma']) === String(linhaAtual['ID_Turma']);
  })[0];

  var efetivoInicio = alteracoes['Previsao_Inicio'] !== undefined ? alteracoes['Previsao_Inicio'] : linhaAtual['Previsao_Inicio'];
  var efetivoTermino = alteracoes['Previsao_Termino'] !== undefined ? alteracoes['Previsao_Termino'] : linhaAtual['Previsao_Termino'];

  var janelaTurmaInicio = turma ? turma['Data_Inicio'] : null;
  var janelaTurmaFim = turma ? turma['Data_Termino'] : null;

  if (!intervaloContidoEm_(efetivoInicio, efetivoTermino, janelaTurmaInicio, janelaTurmaFim)) {
    throw new Error(
      'O período da disciplina (' + efetivoInicio + ' a ' + efetivoTermino + ') precisa estar ' +
      'dentro do período da turma (' + janelaTurmaInicio + ' a ' + janelaTurmaFim + ').'
    );
  }

  // Spec 032 (FR-007/FR-008): recalcula CH_Prevista_Por_Instrutor sempre que ID_Instrutor for
  // parte da alteracao - nunca toca registros_aula/Carga_Horaria_Ministrada_Ano (FR-011).
  if (alteracoes['ID_Instrutor'] !== undefined) {
    var idsInstrutor = String(alteracoes['ID_Instrutor'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var disciplina = lerAbaComoObjetos_('disciplinas').filter(function (d) {
      return String(d['ID_Grade']) === String(linhaAtual['ID_Grade']);
    })[0];
    var chTotalDisciplina = disciplina ? disciplina['Carga_Horaria_Tempos'] : 0;
    alteracoes['CH_Prevista_Por_Instrutor'] = calcularChPrevistaPorInstrutor_(idsInstrutor, chTotalDisciplina, !!dividirCargaHoraria);
  }

  return crudAtualizar('turma_disciplina', idTurmaDisciplina, alteracoes);
}
```

**Compatibilidade**: a validação de janela de período (`intervaloContidoEm_`) é **idêntica** à de
hoje — nenhuma mudança de comportamento nesse trecho (constitution Princípio II). Chamadas
existentes sem o 3º argumento continuam funcionando (`dividirCargaHoraria` vira `undefined` →
`!!undefined === false` → CH integral por instrutor, nunca erro).

**Nenhuma outra função de backend é criada ou alterada** — `crudAtualizar`, `intervaloContidoEm_`,
`getDisciplinasDaTurmaComRitmo`, `getEstatisticasDisciplinas` permanecem intocadas (FR-011).
