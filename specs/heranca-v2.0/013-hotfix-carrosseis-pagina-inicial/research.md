# Research — Hotfix Carrosséis Fixos da Página Inicial

Nenhum `NEEDS CLARIFICATION` restou em `plan.md` — a única ambiguidade real desta spec (ordem
dentro do carrossel) já foi resolvida em `/speckit-clarify`. Este documento registra as 4 decisões
técnicas de implementação, cada uma correspondente a um ou mais FRs de `spec.md`.

## 1. Não mexer no backend (FR-002)

**Decisão**: Nenhuma mudança em `getContextoInicial`/`resolverTurmaEmDestaque_`
(`app/layout.tsx` + `lib/supabase/server.ts``). Este hotfix adiciona só um teste de regressão (via a função pura de
front-end, ver decisão 2) que comprova que um curso sem turma em destaque resolvida ainda chega ao
front-end dentro de `AppState.ctx.cursos`.

**Rationale**: A leitura de código feita antes da spec ("Contexto e achados", achado 1) já confirmou
que `cursos` em `getContextoInicial` nunca filtrou por status de turma — o filtro sempre existiu só
no consumo (``app/(app)/inicio/page.tsx`:29`). Mudar o backend sem necessidade violaria Princípio VI (mudança
cirúrgica: tocar só o que precisa mudar) e criaria risco de regressão em `turmasEmDestaque`, usado
por outras partes do boot (ex.: cálculo de progresso).

**Alternatives considered**:
- Adicionar um parâmetro/flag em `getContextoInicial` para "incluir todos os cursos": rejeitado —
  não existe hoje nenhum filtro para desligar; a função já devolve todos os cursos do escopo do
  usuário. Adicionar uma flag sem efeito real seria complexidade sem propósito (Princípio IX).
- Mover a resolução "curso pertence a qual das 5 categorias" para o backend (computar já agrupado):
  rejeitado pela mesma razão da decisão equivalente do Hotfix 010 (item 2 abaixo) — os dados já
  chegam ao front-end na forma necessária (`cursos[].classificacao`), agrupar é decisão de
  apresentação de uma tela específica, não um dado que outras telas/consumidores do boot precisem.

## 2. Onde e como estruturar a lista fixa de 5 categorias (FR-001/003/004/006/008)

**Decisão**: Uma função pura nova, `montarCarrosseisPainelInicio_(cursos, turmasEmDestaque)`, local
ao `<script>` de `app/(app)/inicio/page.tsx`, substituindo o corpo de `renderizarPainelInicio()` que hoje faz
tudo junto (filtrar, agrupar, ordenar E gerar HTML). A função nova:

1. Agrupa `cursos` por `classificacao` em `{comDestaque: [...], semDestaque: [...]}` — mesma
   separação e mesmo critério de "ordem natural dentro do subgrupo" já usados por
   `agruparCursosParaPagina_` (`app/(app)/cursos/[curso]/page.tsx`, Hotfix 010), reimplementados localmente (ver
   decisão 4 sobre não compartilhar a função entre os dois arquivos).
2. Itera uma constante fixa `CATEGORIAS_PAINEL_INICIO` — 5 entradas `{classificacao, titulo}`, na
   ordem exata exigida por FR-003 — e monta, para cada uma, `{classificacao, titulo, comDestaque,
   semDestaque}`, usando `[]`/`[]` quando a classificação não tem nenhum curso.
3. Devolve sempre um array de exatamente 5 elementos, nesta ordem, independentemente do conteúdo de
   `cursos`.

`renderizarPainelInicio()` passa a só consumir esse array: para cada entrada, renderiza o título
(sempre), e ou a lista de cartões (`comDestaque` seguido de `semDestaque`, dentro do
`.carrossel-scroll-snap`) ou a mensagem de vazio (FR-004) quando `comDestaque.length +
semDestaque.length === 0`.

**Rationale**: Separar "decidir o que aparece, em que ordem, em quais das 5 seções" (função pura,
testável) de "gerar `innerHTML`" (DOM, não testável por `pnpm vitest run`) é o mesmo padrão já validado
pelo Hotfix 010 para `agruparCursosParaPagina_`. Aqui a função pura carrega uma responsabilidade a
mais que a versão de `app/(app)/cursos/[curso]/page.tsx` — garantir as 5 chaves fixas mesmo vazias — porque é
exatamente esse o requisito novo desta spec (FR-003), então faz sentido que a garantia viva dentro
da função testável, não apenas na função de renderização.

**Alternatives considered**:
- Manter `renderizarPainelInicio()` como uma função só (filtra + agrupa + gera HTML), só trocando a
  fonte de iteração de `Object.keys(porClassificacao)` para a lista fixa: rejeitado — o `if
  (!destaque) return` e a lógica de agrupamento ficariam de novo misturados com `innerHTML`,
  tornando o comportamento novo (5 seções sempre, mensagem de vazio) não testável por `pnpm vitest run`,
  repetindo o problema que o Hotfix 010 já resolveu para a tela irmã.
- Calcular os 5 grupos com `.reduce()` sobre `cursos` diretamente, sem separar comDestaque/
  semDestaque: rejeitado — perderia a ordenação exigida por FR-008 (Clarifications 2026-08-16), que
  depende exatamente dessa separação em dois subgrupos.

## 3. Cartão sem turma em destaque (FR-006, Edge Case)

**Decisão**: Quando um curso não tem entrada em `turmasEmDestaque`, o cartão renderiza só os campos
de nível de curso já disponíveis em `AppState.ctx.cursos` (nome, classificação, duração) — mesmo
template usado por `cartaoCurso` em `app/(app)/cursos/[curso]/page.tsx` (Hotfix 010) — sem o badge de status nem a
barra de progresso de turma que os cartões com destaque continuam mostrando.

**Rationale**: Reaproveita um template já existente e já validado, em vez de desenhar um terceiro
layout de cartão só para a Página Inicial — consistente com o próprio objetivo do hotfix de unificar
o comportamento das duas telas de carrossel (achado 4 de `spec.md`). Como o clique continua chamando
`aoClicarCardInicio(idCurso, idTurma)`, e um curso sem destaque não tem `idTurma` para passar, a
função de clique precisa aceitar `idTurma` ausente/`undefined` e navegar só com `AppState.setCurso`
(sem `AppState.setTurma`) nesse caso — comportamento novo, mas estritamente aditivo (não muda a
assinatura nem o efeito da chamada quando `idTurma` existe, preservando FR-007/SC-004).

**Alternatives considered**:
- Não tornar o cartão clicável quando não há turma em destaque: rejeitado — contradiz FR-006
  (explícito no pedido: cartão continua navegável) e criaria uma inconsistência de UX entre cartões
  da mesma tela sem necessidade.
- Exibir um badge "Sem turma em andamento" no lugar do badge de status: avaliado, mas não adotado
  como decisão desta fase — `spec.md` não pede um indicador textual extra, só a ausência do
  badge/progresso; manter o cartão mais simples (mesmo texto que `app/(app)/cursos/[curso]/page.tsx` já usa) evita
  introduzir uma string nova sem pedido explícito. Pode ser revisitado numa iteração futura se
  Bernardo pedir.

## 4. Não compartilhar `montarCarrosseisPainelInicio_` com `agruparCursosParaPagina_` (Princípio IX)

**Decisão**: As duas funções continuam vivendo cada uma em seu próprio arquivo de view
(`app/(app)/inicio/page.tsx`/`app/(app)/cursos/[curso]/page.tsx`), sem extração para `components/ciaara/`.

**Rationale**: Mesmo padrão de "constante de ordenação duplicada por view" que o projeto já usa
desde o Épico 009/Hotfix 010 (`CLASSIFICACOES_ORDEM` vs. `CLASSIFICACOES_ORDEM_CURSO`). As duas
funções resolvem o mesmo problema geral (agrupar cursos por classificação, com/sem destaque) mas com
uma diferença de comportamento que é exatamente o requisito central deste hotfix — `montarCarrosseis
PainelInicio_` sempre devolve as 5 chaves fixas, `agruparCursosParaPagina_` só devolve as chaves que
aparecem em `cursos`. Extrair um utilitário comum agora exigiria um parâmetro extra
("forçar 5 chaves fixas: sim/não") só para acomodar uma diferença que só existe porque duas specs
diferentes, em momentos diferentes, pediram coisas diferentes — acoplamento por coincidência, não
por necessidade (Princípio IX, mesmo raciocínio já registrado no `research.md` do Hotfix 010 para
não mover a ordenação para o backend).

**Alternatives considered**:
- Extrair um utilitário `agruparCursosPorClassificacao_(cursos, turmasEmDestaque, chavesFixas?)` em
  `components/ciaara/`: avaliado e rejeitado por ora — geraria a primeira função verdadeiramente
  compartilhada entre duas views neste projeto (hoje `components/ciaara/` só contém `AppState`/`irPara`/
  a Server Action/utilidades genéricas, nunca lógica de agrupamento específica de tela), um precedente maior
  do que o escopo deste hotfix justifica. Fica registrado aqui como candidato a uma futura
  refatoração, não como ação deste hotfix.
