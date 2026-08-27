# Contrato — Tratamento de erro das 15 leituras (Hotfix)

Não há contrato de função de backend nesta spec — nenhum arquivo `.ts` é tocado, nenhuma
assinatura de função (front ou back) muda. O contrato real é o **padrão de tratamento de erro**
aplicado a cada uma das 15 chamadas já existentes.

## Padrão US1 (11 pontos) — sem mudança de assinatura

Antes:
```js
gs('algumaLeitura', args).then(resultado => { /* ... */ });
```

Depois:
```js
gs('algumaLeitura', args).then(resultado => { /* ... */ })
  .catch(e => alert(e && e.message ? e.message : e));
```

Para `aoTrocarTurmaAvaliacao` (único caso com `Promise.all`), o `.catch` vai no fim da cadeia do
`Promise.all(...).then(...)`, não em cada a Server Action individual — mesma mecânica de propagação de
rejeição que `Promise.all` já tem nativamente.

## Padrão US2 (4 pontos) — sem mudança de assinatura

Antes:
```js
gs('algumaLeituraDeBoot').then(resultado => { /* ... */ });
```

Depois:
```js
gs('algumaLeituraDeBoot').then(resultado => { /* ... */ })
  .catch(e => mostrarAvisoNivel2('<containerId da tabela em data-model.md>', e && e.message ? e.message : e));
```

`mostrarAvisoNivel2`/`limparAviso` (`components/ciaara/`) não mudam — reaproveitados como já existem, sem
nenhuma alteração de assinatura ou comportamento.

## Nenhuma outra função é criada, removida, ou tem comportamento de sucesso alterado.
