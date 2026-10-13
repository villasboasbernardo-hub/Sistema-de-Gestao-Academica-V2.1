# Contrato — cards de AEC, TAD e TR, previsto do PROENS e limites (US1, FR-001 a FR-009)

## A função pura `tetosDaTurma` (`lib/dominio/tetos-da-turma.ts`, cabeçalho `RN-EVT-01`)

```ts
tetosDaTurma({
  chCurricular: number | null,                            // Σ CH das disciplinas ativas do curso
  cumprido: { aec, tad, tr, estudoIndividual, apoioIndividualizado, diasParados },   // da view
  previstoProens: { aec?: number, tad?: number, tr?: number },                       // por turma
  limitesDoCurriculo: { aec?: number, tad?: number, tr?: number },                   // limites_curriculo
  percentuais: { aec: number, tad: number, tr: number },                             // config_parametros
  referenciaEi: { comEstudoObrigatorio: number, semEstudoObrigatorio: number },
  ead: boolean,
}) → {
  ead: true } | {
  ead: false,
  cht: number,                                            // = chd + aec + tad + tr — nunca soma EI, Apoio, dias parados (tipo impede)
  cards: { aec: Card, tad: Card, tr: Card },
  estudoIndividual: { cumprido, referencias: [20 %, 10 %] },
  apoioIndividualizado: number,
  diasParados: { total: number, porTipo: Record<string, number> },
}
type Card = {
  cumprido: number,
  previsto: number | "nao_definido",                 // "previsto não definido" (D-TETO-3)
  maximo: { valor: number, origem: "currículo" | "norma" } | "sem_ch_curricular",
  percentualDoPrevisto: number | null,               // cumprido ÷ previsto; null = previsto não definido  (1º, D-TETO-3)
  percentualDoMaximo: number | null,                 // cumprido ÷ máximo; null sem CH curricular        (2º)
  barra: { maximo: number, marcadorDoPrevisto: number | null } | null,   // de 0 ao máximo, com o marcador do previsto
  alertas: Array<"acima_do_previsto" | "acima_do_maximo">,          // informativos
}
```

`limiteMaximo({ declarado, chCurricular, percentual })` é função própria, testada à parte
(FR-001.1): com `declarado` → `{ valor: declarado, origem: "currículo" }`; sem → `{ valor:
chCurricular × percentual / 100, origem: "norma" }`; sem CH → `"sem_ch_curricular"`.

## Texto do card (D-TETO-1)

`TAD — 5 de 5 previstos (100 %) · 5 de 25 máximos (20 %)` — **os dois percentuais, nesta ordem**, e a
origem do máximo (*currículo* ou *norma*) ao lado; **nunca** percentual sobre a CH (D-TETO-3, 13/10/2026) ·
barra de 0 ao máximo com o marcador do previsto, com o número no atributo e nunca só na cor · alertas em
`role="status"`, nunca bloqueio · *"previsto não definido"* no lugar do primeiro percentual quando não há linha
(`RN-DEG-01`) · *"sem CH curricular — máximo não calculável"* quando a turma não tem disciplina
ativa · turma EAD: a frase da spec 013, sem cards.

Ao lado dos três: **"Dias parados"** por tipo (`LA 4 · FR 8 · LP 8`), sem teto; **"Estudo
Individual"** com as duas referências; **"Apoio Individualizado"** só a contagem.

## Editar o previsto (`gravarPrevistoProens`, Server Action)

```ts
{ turmaId, categoria: "AEC" | "TAD" | "TR", tempos: number >= 0, origemProens?: string }
→ { ok: true, aviso?: "acima_do_limite_maximo", alteradoPor, alteradoEm } | { ok: false, erro }
```

- Permissão: `app.pode('previsto_proens','editar')` — Admin, Encarregado e **Ajudante** sim;
  Operador **não** (`42501`). O botão *Editar previsto* segue a permissão da ação.
- Acima do máximo: **grava e avisa** (FR-008.3).
- O card mostra *"alterado por <nome> em dd/mm/aaaa hh:mm"* (FR-008.2), lido da auditoria da linha; a
  trilha completa fica em `previsto_proens_alteracoes`.
- Turma sem previsto: o formulário abre com a **sugestão** da reserva genérica
  (`config_parametros`), marcada como sugestão, e só grava se a pessoa gravar.

## Página do curso (FR-009, D-TETO-2)

Bloco *"Limites máximos de AEC, TAD e TR"* com três linhas: `AEC — 65 TA (currículo, p. 7)` ou `TAD
— 62,85 TA (norma: 5 % de 1.257)`. Sem cumprido, sem previsto. Abaixo, a lista das turmas do curso
com teto excedido (FR-005, `RF-CURSO-06`).

## `/inicio` (FR-005)

Entre os alertas: *"<turma>: TAD acima do máximo (29 de 27,25)"* e *"acima do previsto"*, um por
card excedido, com link para a página da turma.
