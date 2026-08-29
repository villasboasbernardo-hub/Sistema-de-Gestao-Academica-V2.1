# Research — Épico 0: Fundação

**Fase 0 do plano** · 2026-08-27 · [plan.md](./plan.md) · [spec.md](./spec.md)

Sete incógnitas saíram do *Technical Context*. Todas resolvidas — **cinco por verificação direta nesta
máquina**, duas por decisão registrada. Nenhum `NEEDS CLARIFICATION` sobrou.

---

## R-1 · Como replantar o repositório preservando os dois commits

**Decision:** `git subtree split --prefix=Versao_2.1_NextJS -b <branch>` no repositório `SIS11`,
depois `git init` na pasta de destino e `git pull` dessa branch — ou push direto da branch para o
remote novo.

**Rationale:** **verificado nesta máquina em 27/08/2026**, não deduzido. O comando rodou em teste seco
e produziu uma branch com exatamente os dois commits, já com a raiz na pasta certa:

```
a693373  docs(EPICO-0): especificar a fundacao e registrar o repo publico
27e977a  chore(UE-1): versionar a v2.1 com UE-1 decidida e specs renumeradas
```

A raiz da árvore gerada é `.claude/ .specify/ app/ docs/ specs/ CLAUDE.md …` — o conteúdo da v2.1 sem
o prefixo. A branch de teste foi **apagada** depois de conferida; o comando fica aqui para ser
reexecutado na tarefa real.

**Detalhe que muda a redação do FR-021.2:** os SHAs **mudam** (`d19ab10` → `27e977a`,
`d31bd56` → `a693373`), porque reescrever a raiz da árvore produz objetos de commit novos. Isso não
viola o Princípio IV: os commits originais **permanecem intactos** no `SIS11`, na branch
`chore/UE-1-versionar-v2.1`. O que o repositório novo recebe é o equivalente, com a mesma mensagem,
autor e data. A tarefa deve **registrar a correspondência de SHA** na mensagem do push ou no README,
para que a trilha continue legível.

**Alternatives considered:**
- `git filter-repo` — **indisponível** nesta máquina (`git: 'filter-repo' is not a git command`).
  Exigiria instalação; `subtree split` já resolve.
- `git init` numa pasta vazia + copiar arquivos + commit único — descartado: **apaga a trilha**. Os
  dois commits de 26/08 documentam a decisão UE-1 e a renumeração, e o Princípio IV existe para isso.
- Repositório aninhado dentro do `SIS11` — descartado na clarificação Q3 de 27/08.

---

## R-2 · Qual versão do Node fixar no CI

**Decision:** **Node 22 LTS** no CI; declarar `engines: { "node": ">=22" }` no `package.json`.

**Rationale:** verificado — `next@16.3.3` declara `engines: { node: ">=20.9.0" }`. O piso real é 20.9,
mas 22 é a linha LTS ativa e a que a Vercel usa por padrão; fixar 22 elimina a divergência entre CI e
implantação. A máquina de desenvolvimento roda **24.19**, acima do piso, o que é aceitável — o que não
pode é o CI rodar *abaixo* do que o desenvolvimento usa sem que alguém saiba.

**Achado:** o `package.json` atual **não declara `engines`**. Sem isso, nada impede alguém instalar com
Node 18 e descobrir o problema no `next build`. Vira tarefa.

**Alternatives considered:** Node 24 no CI (alinha com a máquina local, mas fora da LTS e à frente do
runtime da Vercel — troca um descompasso por outro); não fixar (é a causa nº 1 de "funciona na minha
máquina").

---

## R-3 · Como o CI prova que `lib/tipos/database.ts` não está desatualizado

**Decision:** no bloco `banco`, regenerar contra o banco local e falhar se houver diferença:

```
supabase db reset
pnpm db:tipos
git diff --exit-code lib/tipos/database.ts
```

**Rationale:** é a única forma que **não depende de alguém lembrar** (risco R-04, `CLAUDE.md`). O
`--exit-code` faz o job falhar com diff visível no log, que já diz qual coluna divergiu. Nesta fatia o
schema é vazio, então o arquivo gerado é praticamente vazio — e **isso é o ponto**: o portão nasce
funcionando antes de existir o que ele protege, para que o Épico 1 não tenha de construí-lo junto com
a primeira migration.

**Alternatives considered:** conferir por hash (mesma coisa, com mensagem de erro pior); rodar
`db:tipos` no CI e commitar automaticamente (rejeitado — commit automático em CI esconde a divergência
em vez de expô-la, e contraria o Princípio VI).

---

## R-4 · Como provar que a regra de lint está ativa (FR-006)

**Decision:** fixture que **viola** cada fronteira + teste que executa o ESLint sobre ela e **espera
falha**. Um teste por fronteira:

1. `tests/unidade/lint/fixtures/dominio-importa-supabase.ts` — importa `@supabase/supabase-js` dentro
   de `lib/dominio/`. O teste roda o ESLint programaticamente e afirma que houve erro da regra
   `no-restricted-imports`.
2. Fronteira da `service_role`: a violação precisa **quebrar o build**, não o lint. Prova-se com um
   passo de build sobre um fixture descartável, ou afirmando que `lib/supabase/admin.ts` começa com
   `import "server-only"` **e** que a regra ESLint de import restrito cobre o caminho.

**Rationale:** *"Regra de lint que ninguém verificou é regra que alguém desligou"* (documento 10 §6.2).
O teste tem de falhar quando a regra sai da configuração — por isso ele afirma **a presença do erro**,
nunca a ausência.

**Ponto de atenção para o `tasks.md`:** os fixtures ficam sob `tests/`, **não** sob `lib/dominio/` —
senão o próprio `pnpm lint` do repositório passa a falhar de propósito, e o CI fica vermelho para
sempre. A regra ESLint precisa ignorar o diretório de fixtures, e essa exclusão é ela mesma um risco:
excluir demais desliga a regra sem ninguém notar.

**Alternatives considered:** confiar na revisão humana (é exatamente o que a DoD proíbe); rodar o lint
e conferir a saída textual (frágil a mudança de formato de mensagem).

---

## R-5 · O token do `gh` não tem escopo `workflow`

**Decision:** rodar `gh auth refresh -s workflow` **antes** da tarefa que cria `.github/workflows/ci.yml`.
É passo do Bernardo, interativo, e precisa estar no `tasks.md` como pré-requisito explícito.

**Rationale:** verificado em 27/08/2026 — `gh auth status` mostra escopos `'gist', 'read:org', 'repo'`.
Sem `workflow`, o push de um commit que cria ou altera arquivo em `.github/workflows/` é **recusado**.
É o tipo de bloqueio que aparece no pior momento: depois do replantio, com tudo pronto.

**Alternatives considered:** criar o workflow pela interface web do GitHub (funciona, mas tira o
arquivo do controle do repositório na primeira versão); usar um PAT com escopo maior (mais permissão
do que o necessário, sem ganho).

---

## R-6 · `tsc --noEmit` isolado falha antes do primeiro build

**Decision:** no script `verificar` e no bloco `qualidade` do CI, garantir que a geração de tipos de
rota aconteça antes da checagem de tipos — `next typegen` (ou um `next build` anterior) precede
`tsc --noEmit`.

**Rationale:** **armadilha já paga em 26/08/2026** e registrada no `CLAUDE.md`: veio Next **16**, não
15, e `tsc --noEmit` sozinho acusa `Cannot find name 'LayoutProps'` até que os tipos de rota existam.
**Não é erro de código** — é ordem de execução. Sem isso, o primeiro CI do projeto falha por um motivo
que não tem nada a ver com o código, e alguém perde meia hora.

**Alternatives considered:** afrouxar o `tsconfig` para não exigir os tipos de rota (esconde o
problema e enfraquece o `strict`); rodar só `next build` e dispensar o `tsc` (perde a checagem rápida
que o desenvolvimento usa).

---

## R-7 · Como a pré-visualização aponta para o Supabase de desenvolvimento

**Decision:** as variáveis do escopo **Preview** da Vercel apontam para `cqhpfuaweoyglhtrckcp`, com
`NEXT_PUBLIC_AMBIENTE="preview"`. O escopo **Production** da Vercel **fica sem variáveis de Supabase**,
porque não há ambiente de produção nesta fatia (FR-016.1).

**Rationale:** decisão de 27/08/2026 (Q1 e Q5 da clarificação). Enquanto o projeto de produção não
existir, o FR-022 é satisfeito **por construção**: não há produção a alcançar. A verificabilidade que
o FR-022 exige vira, na prática, uma conferência de `vercel env ls` — o que está declarado em cada
escopo.

**Achado que a tarefa precisa corrigir:** o `.env.local` local traz `NEXT_PUBLIC_AMBIENTE="local"`
apontando para `cqhpfu…`. Com a designação do FR-022.1 isso passa a estar **correto**, mas a
correspondência rótulo ↔ projeto tem de ser conferida, não presumida (FR-022.2).

**Alternatives considered:** criar já o projeto de produção (rejeitado em Q1 — decisões de região,
plano e retenção ficam mais bem informadas perto da carga real); preview sem banco (rejeitado — a
preview deixaria de provar a integração que o FR-007 resolve).

---

## Incógnitas que **não** foram resolvidas aqui, de propósito

| Item | Por quê |
|---|---|
| Conteúdo do `ci.yml` job a job | É desenho de tarefa, não pesquisa. Sai do documento 24 §6.4 no `/speckit-tasks` |
| Layout dos tokens do Tailwind | Épico 4 |
| Qual seed sintético popular a preview | Depende do schema — Épico 1 |
| Leitura integral do `BRIEF-v2.1.md` | Vira **tarefa** do `tasks.md`, não pesquisa: o BRIEF chegou depois da spec e é precedência 2 |
