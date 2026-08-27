# Research — Ficha de Cadastro de Instrutores e Formulário Avançado

Nenhum `NEEDS CLARIFICATION` restou em `plan.md` — as 2 ambiguidades reais desta spec (formato de
`ID_Instrutor`; aviso ao desativar pelo formulário) já foram resolvidas em `/speckit-clarify`. Este
documento registra as 10 decisões técnicas de implementação, 3 delas achados desta própria fase de
pesquisa/análise (não estavam nem no pedido nem na spec) — a 10ª (§10) veio do `/speckit-analyze`
(achado U1).

## 1. Geração de `ID_Instrutor` (FR-006, Clarifications)

**Decisão**: Nova função pura em `lib/supabase/server.ts`, ao lado de `gerarProximoId_`:
```js
/**
 * Proximo ID sequencial simples (sem prefixo/hifen/padding) - variante de gerarProximoId_ para
 * entidades com CRUD_CONFIG.prefixo = '' (hoje so instrutores). Ignora, ao calcular o maximo,
 * qualquer valor que nao seja um inteiro puro (defesa contra dado legado fora do padrao).
 */
function gerarProximoIdSequencial_(nomeAba, nomeColunaId) {
  var dados = lerAbaComoObjetos_(nomeAba);
  var max = 0;
  dados.forEach(function (d) {
    var id = String(d[nomeColunaId] || '');
    if (/^\d+$/.test(id)) max = Math.max(max, Number(id));
  });
  return String(max + 1);
}
```
`cadastrarInstrutor` (`lib/acoes/instrutores.ts`) passa a pré-calcular o ID antes de delegar a `crudCriar`:
```js
function cadastrarInstrutor(obj) {
  if (!obj['ID_Instrutor']) obj['ID_Instrutor'] = gerarProximoIdSequencial_('instrutores', 'ID_Instrutor');
  return crudCriar('instrutores', obj);
}
```

**Rationale**: `gerarProximoId_` (já existente) está hardcoded para o formato `PREFIXO-NNNNNN`
(`prefixo + '-' + template literal('%06d', max + 1)`, ``lib/supabase/server.ts`:135-145`) — incompatível com a
decisão de `/speckit-clarify` de manter o inteiro simples (`"178"`, não `"INS-000178"`). Como
`crudCriar`'s guard de auto-geração é `if (!obj[idCol] && cfg.prefixo)` e `CRUD_CONFIG['instrutores'].prefixo` é `''` (falsy), o caminho de auto-geração de `crudCriar` nunca dispara para esta
entidade de qualquer forma — pré-preencher `obj.ID_Instrutor` antes de chamar `crudCriar` (que grava o
valor já presente normalmente) é a forma mais direta de resolver isso sem tocar o motor genérico.

**Alternatives considered**:
- Alterar `crudCriar`/`CRUD_CONFIG` para reconhecer um segundo modo de geração (`prefixo: null` =
  "gerar sequencial sem prefixo" vs. `prefixo: ''` = "nunca gerar"): rejeitado — `disciplinas`
  também tem `prefixo: ''` hoje (`ID_Grade`, valor fixo desde a migração, C-04) e não deve ganhar
  auto-geração como efeito colateral de uma mudança pensada só para Instrutores; alterar o motor
  genérico para um caso que só uma entidade precisa é risco desnecessário (Princípio IX).
- Adotar o padrão `PREFIXO-NNNNNN` mesmo assim: rejeitado — decisão explícita de `/speckit-clarify`
  em sentido contrário.

## 2. `Editado_Por`/`Timestamp_Edicao` em `crudAtualizar` (FR-011 — achado desta fase, não do pedido)

**Decisão**: `crudAtualizar` (`lib/acoes/crud.ts`) passa a capturar o usuário atual (mesma chamada que
`crudExcluir` já faz) e, se as colunas existirem no cabeçalho da aba de destino, gravá-las — mesmo
padrão já implementado em `crudExcluir` desde a spec 003, nunca estendido a `crudAtualizar`:
```js
function crudAtualizar(nomeAba, id, obj) {
  var cfg = CRUD_CONFIG[nomeAba];
  if (!cfg) throw new Error('Aba não autorizada: ' + nomeAba);
  var usuario = exigirFuncao(cfg.escrita);
  // ...
  var editadoPorCol = cab.indexOf('Editado_Por');
  var timestampEdicaoCol = cab.indexOf('Timestamp_Edicao');
  for (var r = 1; r < valores.length; r++) {
    if (String(valores[r][0]) !== String(id)) continue;
    cab.forEach(function (h, c) { /* ... campos normais do obj, como hoje ... */ });
    if (editadoPorCol !== -1) aba`.select(` r + 1, editadoPorCol + 1).setValue(usuario.email);
    if (timestampEdicaoCol !== -1) aba`.select(` r + 1, timestampEdicaoCol + 1).setValue(new Date());
    return { ok: true, id: id };
  }
  // ...
}
```

**Rationale**: Achado real ao ler `lib/acoes/crud.ts` para esta spec (não estava previsto): `crudAtualizar`
nunca grava `Editado_Por`/`Timestamp_Edicao`, mesmo esses campos existindo em `instrutores` e sendo
parte de C-06 ("toda tabela de cadastro carrega ao menos `Editado_Por, Timestamp_Edicao`"). FR-011 desta
spec exige que esses campos reflitam a última gravação — sem essa correção, seriam permanentemente
`undefined`/vazios em qualquer edição, tornando FR-011 falso em produção. A correção no motor genérico
(não um hack isolado em `atualizarInstrutor`) é estritamente aditiva: só grava em abas cujo cabeçalho
já tem essas 2 colunas (nenhuma aba sem elas é afetada, `indexOf` devolve `-1` e o `if` pula), nunca
toca `COLUNAS_FORMULA` (nomes de coluna diferentes), e nenhum teste/entidade existente depende do
comportamento antigo (confirmado por grep em `tests/` antes desta decisão).

**Alternatives considered**:
- Wrapper isolado só em `atualizarInstrutor`: rejeitado — resolveria só Instrutores, deixando as
  outras 8 entidades que usam `crudAtualizar` continuando a violar C-06 sem necessidade (Complexity
  Tracking de `plan.md` detalha o raciocínio completo).

## 3. Antiguidade e Tempo no Setor calculados (FR-007/FR-008)

**Decisão**: `calcularAntiguidadeDeclarada_` existe nos 2 lados (backend `lib/acoes/instrutores.ts` e
duplicada em `app/(app)/instrutores/page.tsx`, mesmo padrão de duplicação já aceito no projeto) porque
`Antiguidade_Declarada` é persistida — o frontend só mostra uma prévia instantânea, quem grava de
fato é o backend, que **sempre recalcula a partir do `Posto_Graduacao` recebido, nunca confia no
valor de `Antiguidade_Declarada` que o cliente mandou** (`cadastrarInstrutor`/`atualizarInstrutor`
sobrescrevem `obj['Antiguidade_Declarada']` antes de delegar a `crudCriar`/`crudAtualizar` — mesmo
espírito de defesa em profundidade de RN-CRUD-02, sem reusar o mecanismo de `COLUNAS_FORMULA` porque
aqui o valor final ainda precisa ser gravado normalmente, só nunca o que veio do payload).
`calcularTempoSetorAnos_` existe **só no frontend** — nunca persistido (FR-008), não há razão para
uma cópia no backend:
```js
// `lib/acoes/instrutores.ts` E `app/(app)/instrutores/page.tsx` (duplicado)
var ESCALA_ANTIGUIDADE_POSTO = {
  AE: { ordem: 0, nome: 'Almirante de Esquadra' }, VA: { ordem: 0, nome: 'Vice-Almirante' },
  CA: { ordem: 0, nome: 'Contra-Almirante' },
  CMG: { ordem: 1, nome: 'Capitão de Mar e Guerra' }, /* ... 10 postos ja existentes, inalterados ... */
};
function calcularAntiguidadeDeclarada_(postoGraduacao) {
  var info = ESCALA_ANTIGUIDADE_POSTO[postoGraduacao];
  return info ? info.ordem : null;
}

// so `app/(app)/instrutores/page.tsx`
function calcularTempoSetorAnos_(dataAssuncaoSetor, hoje) {
  if (!dataAssuncaoSetor) return null;
  var d = dataAssuncaoSetor instanceof Date ? dataAssuncaoSetor : isoParaDate_(dataAssuncaoSetor);
  var anos = (hoje.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.floor(anos);
}
```

**Rationale**: `ESCALA_ANTIGUIDADE_POSTO` já existe em `lib/acoes/instrutores.ts` (spec 014) — só ganha as 3
entradas novas (`AE`/`VA`/`CA`, peso `0`, achado 11 de `spec.md`), sem mudar nenhum dos 11 pesos já
formalizados. `calcularTempoSetorAnos_` usa `Math.floor` (anos completos) — decisão simples, sem
precedente em contrário nos dados (achado 10: campo sempre vazio hoje). O cálculo do frontend
(`app/(app)/instrutores/page.tsx`) roda a cada mudança de `Posto_Graduacao`/carregamento da tela, igual ao
padrão de `ordenarInstrutoresPorAntiguidade_`/`CIRCULO_HIERARQUICO_POR_POSTO` já duplicados lá desde
a spec 015.

**Alternatives considered**:
- Calcular Tempo no Setor em anos fracionários (ex.: `4.7`): rejeitado — o pedido original e o rótulo
  "Tempo no Setor (anos)" já existente (spec 014) sugerem um inteiro simples, mais legível.

## 4. Catálogo de `Esp_Hab_Obs` e normalização de valor legado (FR-023/FR-024, achado 7)

**Decisão**: Mapa fechado das 60 siglas→nome completo (novo, só client-side — o backend nunca
precisa validar `Esp_Hab_Obs` contra o catálogo, `contracts/server-functions.md`) mais uma função
pura de normalização, aplicada só para EXIBIR
um valor legado de forma mais limpa quando ele contém os artefatos conhecidos (achado 7) — nunca para
decidir se um valor é válido ao salvar (isso é o próprio dropdown, que só oferece as 60 siglas):
```js
function normalizarEspHabObs_(valorLegado) {
  return String(valorLegado || '').replace(/^[-(]+|[-)]+$/g, '').trim();
}
```
Na tela de edição, se `normalizarEspHabObs_(instrutor.Esp_Hab_Obs)` corresponder a uma das 60 siglas,
o dropdown já nasce com essa opção selecionada; se não corresponder (achado 7: `"NS"`, `"MT"` dentro
de `"(RM1-MT)"`), o dropdown nasce sem seleção e um aviso mostra o valor legado bruto ao lado
(`FR-024`) — sem forçar escolha, sem apagar.

**Rationale**: `normalizarEspHabObs_` resolve os ~155 casos reais que são só artefato de formatação
(`"-HN"` → `HN`, `"(RM2-T)"` → `RM2-T`) sem inventar uma correspondência para os 7 casos genuinamente
sem sigla correspondente — mesmo espírito de degradação segura (Princípio V) já usado em toda a
sessão.

**Alternatives considered**:
- Tentar mapear `"NS"`/`"MT"` para alguma sigla aproximada automaticamente: rejeitado — não há base
  real para essa inferência (nenhuma das 60 siglas do catálogo é `"NS"` nem `"MT"` isolado), e uma
  correspondência forçada seria pior que deixar explícito que precisa de correção manual.

## 5. `Disciplinas Ministradas` + `Disciplinas Habilitadas` (FR-010, achados 3/6)

**Decisão**: O texto histórico de `Disciplinas_Ministradas` continua vindo direto do campo gravado,
sem nenhum cálculo. Ao lado, um novo campo client-side calculado (`Disciplinas Habilitadas`) usa os
mesmos dados já carregados no boot desta tela (`disciplinasCarregadas_`, `vinculosCarregados_` —
research.md §6) para listar `"${nomeCurso} — ${nomeDisciplina}"` de cada disciplina com vínculo ativo
daquele instrutor — mesmo formato da V1.0 (achado 3).

**Rationale**: Nenhum cálculo novo no backend é necessário — o cruzamento já é feito no cliente pela
spec 015 (`enriquecerInstrutoresParaFiltros_`, que já produz `_cursosVinculados`); esta spec só
precisa dos NOMES de disciplina (não só o `ID_Curso`), então retém o array bruto de disciplinas
carregado no boot como estado do módulo, em vez de descartá-lo depois do enriquecimento (research.md
§6).

**Alternatives considered**:
- Nova função de backend para montar "Disciplinas Habilitadas": rejeitado — os dados já estão
  carregados no cliente (specs 014/015), uma chamada nova seria rede desnecessária para um dado já
  disponível.

## 6. Dados retidos para a Ficha imprimível (FR-025, achado 3)

**Decisão**: `carregarInstrutores()` (`app/(app)/instrutores/page.tsx`, já reescrita pela spec 015) passa a
também guardar `disciplinasCarregadas_`/`vinculosCarregados_` como estado do módulo (hoje descartados
depois de `enriquecerInstrutoresParaFiltros_`), além do já existente `instrutoresCarregados`. A Ficha
é montada 100% a partir desses 3 arrays já em memória — nenhuma chamada de rede nova ao abrir o modal
de impressão.

**Rationale**: Consistente com o padrão já estabelecido pela spec 015 de carregar tudo uma vez no
boot; a Ficha é uma ação pontual do usuário (não um caminho quente como filtro), mas ainda assim não
há motivo para pagar uma chamada de rede quando o dado já está em memória.

**Alternatives considered**:
- Chamar o backend sob demanda ao abrir a Ficha: rejeitado — desnecessário, mesmo dado já carregado;
  adicionaria latência perceptível a uma ação que deveria ser instantânea (SC-003 implica abertura
  imediata).

## 7. Impressão em retrato sem quebrar o `@media print` landscape do DSA (FR-025, achado 4)

**Decisão**: `app/globals.css` ganha uma **página nomeada** (CSS Paged Media), aditiva à regra
`@media print` já existente:
```css
@media print {
  @page { size: landscape; }             /* DSA, inalterado */
  @page ficha-instrutor { size: portrait; }
  .area-impressao.ficha-instrutor { page: ficha-instrutor; }
  /* ... regras de visibilidade ja existentes, inalteradas ... */
}
```
O container da Ficha ganha as duas classes (`area-impressao ficha-instrutor`); nenhum outro elemento
`.area-impressao` existente (DSA) muda.

**Rationale**: `@page { size: }` sem nome se aplica ao documento inteiro por padrão — como o projeto
só tem 1 folha de estilos compartilhada e o DSA já depende do padrão paisagem, uma página CSS nomeada
(suportada pelos navegadores baseados em Chromium, o ambiente real de uso desta aplicação Next.js) permite as
duas orientações coexistindo sem duplicar a folha de estilos nem criar uma segunda classe `.area-
impressao-2`.

**Alternatives considered**:
- Deixar a Ficha também em paisagem (não criar página nomeada): rejeitado — uma ficha de dados
  pessoais (lista vertical de campos, como a própria V1.0 já fazia) fica com muito espaço em branco e
  pior legibilidade em paisagem; a Assumption de `spec.md` já documentava retrato como o resultado
  esperado.

## 8. Formulário único de cadastro/edição na "nova aba" já existente (FR-004/005, Assumptions)

**Decisão**: `app/layout.tsx` (layout raiz) (``app/layout.tsx` + `lib/supabase/server.ts``, já lê `e.parameter.editarInstrutor` desde a spec 014) ganha
um segundo parâmetro opcional, `e.parameter.novoInstrutor` (qualquer valor truthy, ex. `"1"`),
injetado no template como `DEEP_LINK_NOVO_INSTRUTOR` ao lado de `DEEP_LINK_EDITAR_INSTRUTOR`. O botão
"Cadastrar Novo Instrutor" (antes um formulário de 3 campos inline) passa a abrir
`${urlWebApp}?novoInstrutor=1` via `window.open()` — mesmo mecanismo de `abrirEdicaoInstrutor`. O
painel de edição (`renderizarPainelEdicaoInstrutor_`) ganha um "modo cadastro": quando não há
instrutor carregado (`ID_Instrutor` ainda não existe), os campos calculados/bloqueados que dependem
de um registro já existente (Antiguidade mostra o valor calculado ao vivo pela seleção atual de
Posto/Graduação, mas `ID_Instrutor`/CH Ministrada/Tempo no Setor ficam ocultos ou zerados, nunca
mostrando um `undefined`) e o botão salva via `cadastrarInstrutor` em vez de `atualizarInstrutor`.

**Rationale**: Reaproveita 100% do mecanismo já em produção (mesmo padrão de `research.md` da spec
014 para o deep-link de edição — evita depender de `window.location` dentro do página isolado do
a URL do projeto na Vercel); um único painel/função de renderização para os 2 modos evita duplicar todo o
layout de blocos entre uma "tela de cadastro" e uma "tela de edição" seguindo FR-005 explicitamente.

**Alternatives considered**:
- Modal para cadastro, mantendo só a edição em nova aba: rejeitado — reintroduziria o risco de mutar
  estado dentro do página isolado que a spec 014 já eliminou para a edição (Assumptions de `spec.md`
  desta spec); inconsistência de padrão entre as duas ações do mesmo formulário sem motivo técnico.

## 9. Remoção de `Ultima_Avaliacao_Desempenho` (FR-001)

**Decisão**: Novo script `migracao/remover_coluna_ultima_avaliacao_desempenho.py`, seguindo
exatamente o padrão de `migracao/_util_migracao.py` (`fazer_backup`, `gravar_log`, `salvar`) já usado
pelos 6 scripts de correção anteriores: `fazer_backup("pre-remover-ultima-avaliacao-desempenho")`,
`ws.delete_cols(indice_colunas(ws)["Ultima_Avaliacao_Desempenho"])`, 1 entrada em `migracao_log`
(`Acao = "Arquivado"`, `Chave_Origem`/`Chave_Destino = "instrutores"` — é uma mudança estrutural de
coluna, não de uma linha/registro específico, então não há uma chave de linha individual a citar).

**Rationale**: Mesmo mecanismo já validado 6 vezes nesta sessão; a coluna está 100% vazia (achado 2),
então o log documenta a remoção estrutural (para auditoria/histórico do schema), não uma perda de
dado real.

**Alternatives considered**: Nenhuma — é a aplicação direta do protocolo padrão do projeto
(constitution, Princípio IV), sem decisão técnica nova a fazer.

## 10. Montagem do payload de salvamento — proteção testável de `Disciplinas_Ministradas`/`Esp_Hab_Obs` (FR-010/024, achado U1 do `/speckit-analyze`)

**Decisão**: Nova função pura em `app/(app)/instrutores/page.tsx`, chamada pelos 2 caminhos de salvamento
(cadastro e edição, FR-005) antes de montar o `obj` enviado a `cadastrarInstrutor`/`atualizarInstrutor`:
```js
function montarPayloadEdicaoInstrutor_(valoresDoFormulario, instrutorOriginal) {
  var payload = Object.assign({}, valoresDoFormulario);
  // Disciplinas_Ministradas nunca e reenviado - o formulario so exibe, nunca edita (FR-010,
  // achado 6 de spec.md). Omitir a chave preserva o valor ja gravado (crudAtualizar so grava
  // campos presentes no payload); em cadastro (instrutorOriginal null) tambem nunca inclui.
  delete payload['Disciplinas_Ministradas'];
  // Esp_Hab_Obs: so inclui quando o valor corresponde a uma sigla real do catalogo - um valor
  // legado sem correspondencia (achado 7) nunca e sobrescrito por uma selecao vazia/arbitraria.
  if (!CATALOGO_ESP_HAB_OBS[payload['Esp_Hab_Obs']]) delete payload['Esp_Hab_Obs'];
  return payload;
}
```

**Rationale**: Achado do `/speckit-analyze` (U1): a garantia central desta spec (SC-004, "nenhum dos
147/162 registros reais... perde ou tem seu conteúdo apagado/substituído silenciosamente") dependia
inteiramente do frontend nunca incluir essas 2 chaves no payload — igual ao risco que
`Instrutor_Completo`/`Carga_Horaria_Ministrada_Ano` tinham antes de ganhar proteção em 2 camadas
(`COLUNAS_FORMULA` no backend + campo bloqueado na interface, spec 014, RN-CRUD-02). Diferente
daquele caso, `Disciplinas_Ministradas`/`Esp_Hab_Obs` continuam sendo colunas normais graváveis (não
fórmula nativa nem sempre-calculada — `Esp_Hab_Obs` é editável quando o valor é válido) — não fazem
sentido em `COLUNAS_FORMULA` (que bloqueia a coluna inteira, sempre). A proteção certa aqui é na
**montagem do payload**, extraída para uma função pura nomeada e testável (`tests/ficha_formulario_
instrutores.test.ts`) em vez de ficar implícita dentro do handler de salvamento — dá a SC-004 uma
garantia automatizada real, não só verificação manual (`quickstart.md`).

**Alternatives considered**:
- Confiar só na verificação manual (`quickstart.md` Passo 3): rejeitado — era a lacuna real
  identificada pelo `/speckit-analyze` (achado U1); o risco (perda silenciosa de dado histórico) é
  proteção de Princípio IV, não algo que deveria depender só de QA humano.
- Adicionar `Disciplinas_Ministradas`/`Esp_Hab_Obs` a `COLUNAS_FORMULA`: rejeitado — bloquearia
  **qualquer** gravação nessas colunas para sempre, mas `Esp_Hab_Obs` precisa continuar gravável
  quando o usuário escolhe uma sigla válida do catálogo (FR-023) — `COLUNAS_FORMULA` não tem esse
  meio-termo, é tudo ou nada.
