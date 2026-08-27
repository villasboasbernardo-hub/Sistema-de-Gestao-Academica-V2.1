# Research — Hotfix: Polimento de UI/UX, Gráficos e Regra Global de Nomenclatura de Cursos

## 1. Correção do gráfico "Posto/Graduação" — remover a tradução para nome extenso

**Decision**: `ordenarPorAntiguidadePostoClient_` (``app/(app)/instrutores/page.tsx`:501-510`) deixa de mapear
`item.posto` para `NOMES_POSTO_POR_CODIGO[item.posto]` — passa a devolver `item.posto` (a sigla já
gravada em `instrutores.Posto_Graduacao`) sem tradução nenhuma, mantendo intacta a ordenação por
`ordemAntiguidadePosto_`.

**Rationale**: É a mesma função hoje reaproveitada por um único caminho (o gráfico) — não há
segundo consumidor a proteger dentro dela. `NOMES_POSTO_POR_CODIGO` continua existindo e sendo usado
por `valorExibicaoFichaInstrutor_` (Ficha, FR-003), um caminho de código totalmente separado que esta
mudança não toca.

**Alternatives considered**:
- *Adicionar um parâmetro booleano `usarSigla` a `ordenarPorAntiguidadePostoClient_`* — rejeitado:
  a função só tem hoje 1 chamador (o gráfico); um parâmetro para "desligar" um comportamento que
  nenhum chamador quer mais é complexidade não solicitada (Princípio VI/constitution).
- *Duplicar a função sem a tradução* — rejeitado: mesmo raciocínio, e criaria 2 fontes de verdade
  para "ordenar por antiguidade" no mesmo arquivo.

## 2. Novo gráfico de pizza binário de Capacitação Didática

**Decision**: `agregarEstatisticasInstrutores_` ganha `semCapacitacaoDidatica` no objeto `kpis`
(`= total - comCapacitacaoDidatica`, ambos já calculados na mesma função). `renderizarEstatisticasInstrutores_`
(``app/(app)/instrutores/page.tsx`:540-581`, onde os `renderizarGrafico_(...)` já são chamados linha 574-580)
ganha uma nova chamada `renderizarGrafico_('graficoInstrutoresCapacitacaoGeral', 'pie', ['Com
Capacitação Didática', 'Sem Capacitação Didática'], [r.kpis.comCapacitacaoDidatica,
r.kpis.semCapacitacaoDidatica])`, com o `<div id="graficoInstrutoresCapacitacaoGeral">` novo
adicionado ao HTML estático do painel (``app/(app)/instrutores/page.tsx`:563-571`), ao lado (não no lugar) do
`<div id="graficoInstrutoresCapacitacao">` existente.

**Rationale**: `renderizarGrafico_` (``components/ciaara/`:253-264`) já suporta `tipo === 'pie'` nativamente
(`ehFatia = tipo === 'donut' || tipo === 'pie'`) — nenhuma mudança no helper compartilhado é
necessária, só uma nova chamada com os dados certos. Reaproveitar `comCapacitacaoDidatica` (já
calculado) evita duplicar a regra de "capacitação vazia/em branco não conta" (`String(...).trim() !==
''`) em 2 lugares.

**Alternatives considered**:
- *Calcular `semCapacitacaoDidatica` dentro do template literal no momento de renderizar* (`r.kpis.total
  - r.kpis.comCapacitacaoDidatica` inline) — rejeitado por consistência: os demais valores dos 4 KPIs
  já são pré-calculados dentro de `agregarEstatisticasInstrutores_`, não no ponto de uso; manter o
  padrão facilita o teste unitário da função pura.

## 3. Botão "Reativar" condicional + função de backend

**Decision**: Em `renderizarListagemInstrutores_` (``app/(app)/instrutores/page.tsx`:381-400`), a expressão
`${i.Status !== 'Inativo' ? '<button ... Desativar</button>' : ''}` vira uma ramificação completa:
`Status === 'Inativo'` renderiza `<button class="btn btn-sm btn-outline-success"
onclick="reativarInstrutorClick('${i.ID_Instrutor}')">Reativar</button>`; caso contrário, mantém o
botão "Desativar" atual sem mudança. `reativarInstrutorClick` (nova, mesmo arquivo, espelhando
`desativarInstrutorClick` linha 404-408) chama `confirm('Reativar este instrutor? Ele voltará a
poder ser selecionado em novos lançamentos.')` (Clarifications 2026-08-18 — mesma confirmação de
"Desativar") antes de `gs('reativarInstrutor', idInstrutor).then(() =>
carregarInstrutores()).catch(...)`. No backend, `reativarInstrutor(idInstrutor)`
(`lib/acoes/instrutores.ts`, ao lado de `desativarInstrutor`) chama
`crudAtualizar('instrutores', idInstrutor, {Status: 'Ativo'})`.

**Rationale**: Espelha exatamente o par existente `desativarInstrutorClick`/`desativarInstrutor` —
mesmo estilo de confirmação, mesmo padrão de recarregar a listagem no `.then()`, mesmo tratamento de
erro no `.catch()`. `crudAtualizar` já grava só as chaves presentes no objeto (``lib/acoes/crud.ts`:85-88`,
`if (!obj.hasOwnProperty(h) ...) return`), então `{Status: 'Ativo'}` nunca sobrescreve nenhum outro
campo do instrutor (FR-009).

**Alternatives considered**:
- *Reaproveitar `crudExcluir` com um "modo reverso"* — rejeitado: `crudExcluir` (``lib/acoes/crud.ts`:141+`) é
  semanticamente "excluir logicamente", hardcoded para gravar `Inativo`; forçá-lo a também gravar
  `Ativo` misturaria 2 operações opostas na mesma função, contrariando Princípio VI.
- *Um único botão "Alternar Status" sem rótulo fixo* — rejeitado: o pedido pede explicitamente 2
  rótulos/cores distintos ("Desativar" vermelho, "Reativar" verde), não um toggle genérico.

## 4. Regra global de siglas de curso — pontos de exibição

**Decision**: Nos 4 dropdowns mapeados (``app/(app)/cronograma/page.tsx`:77`, ``app/(app)/disciplinas/page.tsx`:66`,
``app/(app)/admin/usuarios/page.tsx`:105`, ``app/(app)/instrutores/page.tsx`:315`), o padrão hoje repetido
`<option value="${c.idCurso}">${c.nome || c.idCurso}</option>` vira
`<option value="${c.idCurso}">${c.idCurso}</option>` — `value` inalterado (continua sendo o `ID_Curso`
já usado por toda lógica de filtro/gravação a jusante), só o texto visível muda. Em
``app/(app)/admin/usuarios/page.tsx`:164-165`, `curso ? curso.nome : v.ID_Curso` vira `curso ? curso.idCurso :
v.ID_Curso` (na prática os 2 lados da ternária colapsam para o mesmo valor, já que `curso.idCurso ===
v.ID_Curso` sempre que `curso` é encontrado — simplificação natural, não obrigatória para o
comportamento). Em ``app/(app)/instrutores/page.tsx`:314`, a ordenação do array antes de montar as opções muda de
`.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))` para
`.sort((a, b) => (a.idCurso || '').localeCompare(b.idCurso || ''))`.

**Rationale**: `c.idCurso` já é a sigla (`cursos.ID_Curso`, achado real do spec.md) — não requer
nenhuma nova leitura, cálculo ou coluna. Manter o `value` do `<option>` como `ID_Curso` (já era antes)
preserva 100% da lógica de filtro/submissão existente; só o rótulo visível é afetado, minimizando a
superfície de risco da mudança.

**Alternatives considered**:
- *Manter `.sort()` por `nome` e só trocar o texto exibido* — rejeitado: ordenar por um campo que
  não é mais visível ao usuário (nome completo) produziria uma ordem alfabética aparentemente
  arbitrária do ponto de vista de quem só vê siglas; ordenar pelo próprio campo exibido é mais
  previsível.

## 5. Texto de disciplinas habilitadas do instrutor — formato "Disciplina (Sigla)"

**Decision**: `disciplinasHabilitadasDoInstrutor_` (``app/(app)/instrutores/page.tsx`:678-694`) muda a linha
`resultado.push(nomeCurso + ' — ' + (d.Nome_Disciplina || d.ID_Grade))` para
`resultado.push((d.Nome_Disciplina || d.ID_Grade) + ' (' + d.ID_Curso + ')')`, e o parâmetro
`cursosPorId` (agora sem uso — a sigla vem direto de `d.ID_Curso`, sem lookup) é removido da
assinatura da função e das 2 chamadas (``app/(app)/instrutores/page.tsx`:952`/`1193`), junto com a construção de
`nomeCursoPorId` que só existia para alimentá-lo.

**Rationale**: Reproduz exatamente o padrão já em produção em
`painelAtribuicaoDisciplinasHtmlInstrutor_` (``app/(app)/instrutores/page.tsx`:980`,
`` `${d.Nome_Disciplina || d.ID_Grade} (${d.ID_Curso})` ``) — mesma spec 019, mesmo arquivo — em vez
de inventar um segundo formato para o mesmo conceito. Remover o parâmetro/lookup agora inútil evita
deixar código morto (`nomeCursoPorId` construído e nunca lido) para trás.

**Alternatives considered**:
- *Manter `cursosPorId` como parâmetro não utilizado, por estabilidade de assinatura* — rejeitado:
  os 2 únicos chamadores estão no mesmo arquivo e são atualizados na mesma mudança; não há consumidor
  externo cuja assinatura precise ser preservada (diferente do caso de uma função de contrato público
  entre módulos).

## 6. Escopo explicitamente fora: nome de Turma

**Decision**: Nenhuma mudança em `turma.nome` (`turmas.Nome_Completo_Curso`) nos 3 arquivos
que o exibem (``app/(app)/turmas/[turma]/dsa/page.tsx`:94/392`, ``app/(app)/cursos/[curso]/page.tsx`:172`, `app/(app)/cronograma/page.tsx`).

**Rationale**: Já registrado no spec.md (Achados reais / FR-014) — é uma `FORMULA` de schema, fora do
alcance de uma mudança só de frontend, e tocá-la violaria a restrição "ZERO alterações estruturais no
schema" do próprio pedido. Documentado aqui de novo para que `/speckit-tasks` não gere uma tarefa
para esses arquivos por engano ao varrer "todo lugar que mostra curso".
