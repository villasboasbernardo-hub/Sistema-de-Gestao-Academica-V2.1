# Phase 0 Research: Seleção de Instrutor por Turma e Validação de Janela

## 1. Nome e semântica da coluna nova

**Decisão**: `turma_disciplina.ID_Instrutor` — texto separado por vírgula, mesmo nome e mesma
convenção de `disciplinas.ID_Instrutor` (não um array/JSON literal, não um nome diferente tipo
`ID_Instrutor_Selecionado`).

**Rationale**: É semanticamente o mesmo tipo de dado (seleção efetiva, não qualificação), só
relocado do nível de grade para o nível de turma — reaproveitar o nome e o formato já estabelecido
é menos surpreendente (Princípio VI) do que inventar uma convenção nova para o mesmo conceito.

**Alternatives considered**: `Instrutores_Selecionados` (JSON array), como o pedido original
sugeria — rejeitado explicitamente pelo responsável (spec.md, achado real); array/JSON numa célula
de PostgreSQL também foge do padrão de todas as colunas multivaloradas já existentes no projeto
(`ID_Instrutor` de `disciplinas`, `Capacitacao_Didatica` de `instrutores` — ambas CSV).

## 2. Containment, não interseção

**Decisão**: `intervaloContidoEm_(inicioA, fimA, inicioB, fimB)` — função pura nova, verifica que
`[inicioA, fimA]` está **inteiramente contido** em `[inicioB, fimB]` (`inicioA >= inicioB && fimA
<= fimB`), diferente de `intervalosSeInterceptam_` (`lib/acoes/liq.ts`, spec 027), que verifica só
**sobreposição parcial**. Degrada para `true` (permite gravar) quando qualquer um dos 2 intervalos
está incompleto (`RN-DEG-01`) — nunca lança exceção por dado ausente.

**Rationale**: São checagens semanticamente diferentes — a LIQ precisa saber se um trimestre
*toca* o período de uma turma (sobreposição); esta spec precisa saber se o período de uma
disciplina está *inteiramente dentro* da janela da turma (contenção). Reaproveitar
`intervalosSeInterceptam_` para este caso seria tecnicamente errado (uma disciplina que começa
antes da turma mas termina dentro dela "intercepta", mas viola a regra de negócio pedida).

**Alternatives considered**: Reaproveitar `intervalosSeInterceptam_` diretamente — rejeitado por
ser semanticamente incorreto para "contenção total".

## 3. Localização das funções novas

**Decisão**: `intervaloContidoEm_` e `atualizarTurmaDisciplina(id, alteracoes)` em `lib/acoes/
`lib/acoes/liq.ts`` (arquivo já existente, dono de `turma_disciplina` desde a spec 027) — não um arquivo novo.

**Rationale**: Princípio VI — `turma_disciplina` já tem dono; fragmentar sua lógica entre `lib/acoes/liq.ts`
e um segundo arquivo novo, para uma extensão de 1 coluna + 1 validação, seria dispersão
desnecessária. `atualizarTurmaDisciplina` substitui, no painel de período (`app/(app)/cursos/[curso]/page.tsx`), a
chamada direta a `crudAtualizar('turma_disciplina', ...)` que a spec 027 introduziu — mesmo padrão
já usado por `cadastrarInstrutor`/`atualizarInstrutor` (wrappers de validação sobre o CRUD genérico,
`lib/acoes/instrutores.ts`).

**Alternatives considered**: Criar `lib/acoes/turma-disciplina.ts` dedicado — rejeitado, fragmentaria um
domínio pequeno demais para justificar um arquivo próprio (diferente de `lib/acoes/liq.ts`/`lib/acoes/os-instrutoria.ts`,
que têm lógica de agrupamento substancial o suficiente para um módulo isolado).

## 4. Formato da migração

**Decisão**: `migracao/adicionar_instrutor_turma_disciplina.py` — mesmo padrão de `remover_
instrutor_completo_adicionar_estado.py` (adicionar 1 coluna) combinado com o de `criar_turma_
disciplina.py` (iterar linhas de `turma_disciplina`, resolver `ID_Grade` → `disciplinas.
ID_Instrutor`, escrever valor por linha). Idempotente: no-op se a coluna `ID_Instrutor` já existir
em `turma_disciplina`.

**Rationale**: Reaproveita os 2 padrões já validados nesta sessão em vez de inventar um terceiro.

**Alternatives considered**: Deixar a coluna nascer vazia (sem semente) — rejeitado, spec.md FR-002
exige semear a partir da grade, mesmo raciocínio de "ponto de partida editável" já usado para as
datas em LIQ-1.
