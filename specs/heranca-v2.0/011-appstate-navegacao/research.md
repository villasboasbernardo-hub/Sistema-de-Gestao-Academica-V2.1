# Research — Arquitetura de Navegação com Estado Centralizado (AppState)

Nenhum `NEEDS CLARIFICATION` restou em `plan.md` — as 3 ambiguidades reais desta spec já foram
resolvidas em `/speckit.specify`/`/speckit-clarify`. Este documento registra as decisões técnicas de
implementação.

## 1. Forma de `AppState.cache`/`invalidar()`/`onChange()` (FR-001/002)

**Decisão**:

```js
cache: {},
invalidar(chaves) {
  const lista = chaves === '*' ? Object.keys(this.cache) : [].concat(chaves);
  lista.forEach(chave => {
    delete this.cache[chave];
    (this._listeners[chave] || []).forEach(cb => cb());
  });
},
onChange(chave, callback) {
  (this._listeners[chave] = this._listeners[chave] || []).push(callback);
},
_listeners: {},
```

`invalidar()` sempre remove a chave do `cache` (não só marca como "suja") — a próxima leitura
naturalmente vê `undefined` e busca de novo, sem precisar de um segundo estado "válido/inválido"
por chave. `[].concat(chaves)` normaliza string única ou array para a mesma forma, sem checagem de
tipo explícita.

**Rationale**: Objeto simples, sem `Proxy`/getters mágicos — mesma decisão de `04-appstate.md`
("um objeto `AppState`, não um framework de estado", constitution Princípio III). `delete` em vez
de marcar `null` evita um `if (cache[x] === null || cache[x] === undefined)` — `undefined` já é o
sinal natural de "precisa buscar" em JS.

**Alternatives considered**:
- `Map` em vez de objeto simples: rejeitado — todo o resto do `AppState`/`ctx` já usa objetos
  simples (`filtros`, `ctx.cursos` etc.), `Map` introduziria uma segunda convenção sem ganho real
  (nenhuma chave dinâmica hostil, tipo `"__proto__"`, é esperada aqui).
- `invalidar()` recalcular o dado imediatamente (em vez de só remover do cache): rejeitado — exigiria
  que `AppState` soubesse *como* buscar cada chave (uma função de fetch por chave), acoplando
  `components/ciaara/` a Server Action/nomes de função de cada view; manter `invalidar()` "burro"
  (só remove, quem lê decide buscar) preserva a separação view→dado que já existe.

**Achado (sem consumidor dentro do escopo desta spec)**: nenhuma das 3 views migradas precisa
efetivamente de `onChange()` — o padrão de uso real é "verificar cache antes de buscar, buscar de
novo se `undefined`" (leitura preguiçosa na próxima abertura do painel), não "reagir imediatamente
enquanto a tela já está visível" (as views são mutuamente exclusivas, `[data-view]{display:none}` —
nunca duas visíveis ao mesmo tempo na mesma sessão). `onChange()` é implementado e testado
(FR-002 exige a peça, `04-appstate.md` já a projetava como parte do contrato do objeto único) mas
fica sem nenhuma chamada real de `.onChange(...)` nesta spec — pronto para a primeira view futura
que precisar de atualização reativa em vez de preguiçosa, sem redesenho (mesmo raciocínio já usado
em `spec.md` FR-004 para o painel de Cursos, que também fica com o mecanismo pronto sem ponto de
chamada real ainda).

## 2. Nomes das chaves de cache (FR-003)

**Decisão**: `'estatisticasCursoTurma'` (painel combinado de `app/(app)/cursos/[curso]/page.tsx`),
`'estatisticasDisciplinas'` (`app/(app)/disciplinas/page.tsx`), `'estatisticasInstrutores'`
(`app/(app)/instrutores/page.tsx`) — nomes descritivos do painel, não da função de backend chamada (o painel
de Cursos chama duas funções, `getEstatisticasCursos`+`getEstatisticasTurmas`, mas é uma única
chave porque é uma única decisão de "já busquei ou não").

**Rationale**: Consistente com o exemplo já usado em `04-appstate.md`/`data-model.md`
(`"estatisticasCursos"` como ilustração) e com o nome das flags que estão sendo substituídas
(`estatisticasCursoCarregadas` → `estatisticasCursoTurma`, ajustado para refletir que a chave cobre
os dois painéis).

## 3. Onde armazenar o dado buscado — objeto único ou um por sub-painel? (FR-003)

**Decisão**: `AppState.cache['estatisticasCursoTurma']` guarda `{ cursos, turmas }` (o par que
`Promise.all([gs('getEstatisticasCursos'), gs('getEstatisticasTurmas')])` já produz hoje) — uma
única chave, um único valor composto, não duas chaves separadas.

**Rationale**: Reflete a mecânica real do painel (sempre buscados juntos, sempre renderizados
juntos, `carregarEstatisticasCursoTurma()` já faz isso hoje) — duas chaves separadas exigiriam
verificar as duas antes de decidir se busca de novo, sem nenhum benefício (nenhum consumidor lê só
metade do par).

## 4. Estratégia de invalidação: precisa ou conservadora? (FR-004)

**Decisão**: Conservadora — sempre que uma escrita em `registros_aula` acontece pela
grade do DSA (`excluirBlocoDsa`, exclusão de qualquer bloco que não seja `AVA-`/`EXT-`), invalida
`estatisticasDisciplinas`, mesmo que a linha excluída não seja necessariamente `Categoria_Normativa
= 'Aula'` (podia ser `Estudo_Individual` etc., que também vive nessa aba mas não entra no cálculo de
`chExecutada`). `salvarLancarAula` (sempre cria uma linha `Aula`) invalida sem ambiguidade nenhuma.
`aoDropBlocoDsa`/`moverLancamentoDsa` **não invalida** — só muda `Data_Aula`/`TA_Inicial`, nunca
`Tempos_Consumidos`/`Categoria_Normativa`, então não muda a soma usada pelo painel.

**Rationale**: Mesmo espírito de RN-DEG-01 (degradação seguindo o lado seguro) — invalidar uma
chave que na verdade não mudou custa, no pior caso, uma chamada de rede extra e desnecessária na
próxima abertura do painel (imperceptível ao usuário); **não** invalidar uma chave que devia ter
mudado reintroduz exatamente o bug que esta spec existe para corrigir. `excluirBlocoDsa` já
determina a `aba` só pelo prefixo do ID (`AVA-` vs. resto) — determinar a categoria exata exigiria
uma leitura adicional ao backend só para decidir se invalida, custo desproporcional ao ganho.

**Alternatives considered**:
- Buscar a categoria da linha antes de excluir, para invalidar só quando for `Aula`: rejeitado —
  uma chamada de rede extra só para decidir se faz outra chamada de rede depois é pior, em custo
  real, do que simplesmente invalidar sempre.

## 5. Remoção do roteador morto (FR-006)

**Decisão**: Remover `registrarRota`/`ROTAS`/o objeto `ROTAS[hash]` de `components/ciaara/` por completo.
`irPara(hash)` fica exatamente como está — nenhuma mudança de assinatura, nenhuma mudança de
comportamento.

**Rationale**: `grep -rn "registrarRota\|ROTAS\[" app/*.html` (rodado antes da spec, ver
`spec.md` §"Contexto e achados") só encontra a própria declaração — confirma código morto sem
nenhum risco de quebrar um consumidor real ao remover.
