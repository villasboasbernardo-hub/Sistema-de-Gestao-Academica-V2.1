# Research — Painel de Atribuição de Disciplinas do Instrutor

## 1. Mecanismo de sincronização de vínculos (nunca apagar fisicamente)

**Decision**: `sincronizarDisciplinasInstrutor(idInstrutor, idsGrade)`, nova função em
`lib/acoes/instrutores.ts`, calcula o diff entre o conjunto atual de vínculos do instrutor (qualquer status)
e o conjunto `idsGrade` recebido, e resolve cada `ID_Grade` para uma de 4 ações, delegando cada uma
ao motor CRUD genérico já existente (nunca escrevendo direto no banco):

| Situação do par (Instrutor, Disciplina) | Ação |
|---|---|
| Não existe vínculo algum, `ID_Grade` está em `idsGrade` | `crudCriar('instrutor_disciplina', {...})` — vínculo novo, `Status: 'Ativo'` |
| Existe vínculo **inativo**, `ID_Grade` está em `idsGrade` | `crudAtualizar('instrutor_disciplina', idVinculo, {Status: 'Ativo'})` — reativa |
| Existe vínculo **ativo**, `ID_Grade` está em `idsGrade` | Nenhuma ação (já correto — FR-012) |
| Existe vínculo **ativo**, `ID_Grade` NÃO está em `idsGrade` | `crudExcluir('instrutor_disciplina', 'ID_Vinculo', idVinculo)` — desativa |
| Existe vínculo **inativo**, `ID_Grade` NÃO está em `idsGrade` | Nenhuma ação (já correto) |

**Rationale**: `crudCriar`/`crudAtualizar`/`crudExcluir` (`lib/acoes/crud.ts`) já são o único caminho de
escrita auditado de todo o projeto para esta aba — cada um já grava `Editado_Por`/
`Timestamp_Edicao` e nunca chama `deleteRow` (`crudExcluir` só seta `Status`). Reaproveitá-los
linha a linha, em vez de inventar uma rotina de escrita em massa nova, é a menor mudança possível
que satisfaz Princípio VI (Mudança Cirúrgica) e garante, por construção, que Princípio IV
(Integridade do Histórico) nunca é violado — não há como esta função apagar uma linha, porque ela
nunca chama nada além dessas 3 primitivas.

**Alternatives considered**:
- *Reimplementar a leitura/escrita direto no banco dentro da nova função* (loop manual sobre
  `getRange`/`setValue`) — rejeitado: duplicaria a lógica de `Editado_Por`/`Timestamp_Edicao`/lock
  já centralizada em `lib/acoes/crud.ts`, criando uma segunda fonte de verdade para "como uma linha de
  `instrutor_disciplina` é escrita".
- *Seguir a redação literal do pedido (apagar todas as linhas do instrutor e reinserir do zero)* —
  rejeitado: viola Princípio IV/C-05 (ver spec.md, Achados reais e FR-009). Também produziria
  `ID_Vinculo` novos a cada salvamento mesmo para disciplinas que não mudaram, quebrando qualquer
  rastreabilidade futura desse identificador.

## 2. Reativação em vez de duplicação

**Decision**: Antes de criar um vínculo novo para um par (Instrutor, Disciplina), a função verifica
se já existe uma linha para esse par em qualquer status. Só cria vínculo novo se realmente não
existir nenhuma linha prévia.

**Rationale**: Sem essa verificação, alternar uma disciplina marcada/desmarcada/remarcada ao longo
de várias edições acumularia um vínculo cancelado por ciclo — poluindo a aba com duplicatas
inertes. Reativar preserva um único `ID_Vinculo` por par ao longo de toda a vida do relacionamento,
mesmo espírito de C-05 (nunca dado órfão/duplicado desnecessário) e consistente com FR-011 da spec.

**Alternatives considered**: Sempre criar vínculo novo (mais simples de implementar) — rejeitado
por gerar acúmulo de lixo histórico sem necessidade, e por dificultar qualquer relatório futuro que
conte "quantos vínculos o instrutor já teve" de forma significativa.

## 3. Disciplina/`ID_Grade` inválido ou obsoleto vindo do cliente

**Decision**: A sincronização ignora silenciosamente qualquer `ID_Grade` em `idsGrade` que não
corresponda a nenhuma linha existente em `disciplinas` (ex.: dado obsoleto por o navegador ter
ficado com uma cópia velha de `disciplinasCarregadas_` numa aba mantida aberta por muito tempo).
Não lança exceção nem interrompe a sincronização dos demais itens válidos.

**Rationale**: Princípio V (Degradação Segura) — uma falha de dado pontual e recuperável (o usuário
só precisa recarregar a tela) não deve impedir a gravação de todas as outras disciplinas
corretamente marcadas, nem, pior, deixar o instrutor já salvo (passo anterior, FR-007/FR-008) sem
nenhum vínculo sincronizado por causa de um único item ruim.

## 4. "Sigla do curso" = `cursos.ID_Curso`

**Decision**: O rótulo do checkbox usa `disciplina.ID_Curso` diretamente como o texto entre
parênteses — não busca nenhuma coluna nova.

**Rationale**: Achado real confirmado por leitura do header de `cursos` — não existe coluna
"Sigla"/"Abreviação" separada; o identificador do curso já é o código curto que o pedido descreve
(`CAHO`, `C-Ap-HN`). `AppState.ctx.cursos[].idCurso` (já carregado no boot da SPA) é a mesma fonte.

## 5. `Modo_Atribuicao` do vínculo novo

**Decision**: Ao criar um vínculo novo (não ao reativar um existente), `sincronizarDisciplinasInstrutor`
grava `Modo_Atribuicao` copiando `disciplinas.Modo_Atribuicao_Padrao` da disciplina
correspondente.

**Rationale**: Achado real — a RN sobre divisão de carga horária entre múltiplos instrutores da
mesma disciplina (já preservada, não nova) depende desse campo estar preenchido; deixá-lo vazio
seria pior que o comportamento já existente de `criarVinculoHabilitacao` (que também o deixa vazio
quando o formulário auxiliar de vínculo único não informa um valor) — como este painel cria
vínculos em lote sem UI para escolher o modo manualmente, herdar o padrão do catálogo é a única
opção que não deixa o campo sistematicamente vazio para todo vínculo criado por este caminho.

## 6. Exibição sem chamada de rede nova

**Decision**: O painel usa exclusivamente `disciplinasCarregadas_`, `vinculosCarregados_` e
`AppState.ctx.cursos` — os mesmos 3 conjuntos que `disciplinasHabilitadasHtmlInstrutor_` já usa
hoje, carregados uma única vez por `carregarInstrutores()`.

**Rationale**: Achado real — nenhum desses 3 conjuntos muda durante a sessão de edição de um único
instrutor; refazer a leitura só para abrir um painel de checkboxes seria uma chamada de rede
redundante, contrariando FR-014 e o próprio padrão já estabelecido nesta tela desde a spec 015
("177 instrutores cabem inteiros em memória").

## 7. Filtro de busca client-side

**Decision**: Cada item do painel recebe um atributo `data-busca-disciplina` com o texto do rótulo
em minúsculas pré-computado no render; o `input` de busca, a cada evento `input`, compara seu valor
(também em minúsculas) contra esse atributo via `String.includes`, alternando `style.display` entre
`''` e `'none'`.

**Rationale**: ~175 itens é uma escala trivial para busca síncrona no DOM a cada tecla — nenhuma
técnica de debounce, virtualização ou índice de busca é necessária (SC-001 exige apenas
"perceptualmente instantâneo"). Consistente com o requisito explícito do pedido original (busca
parcial, case-insensitive, por nome OU sigla).

## 8. Onde o painel entra no formulário existente

**Decision**: Nova função `painelAtribuicaoDisciplinasHtmlInstrutor_(instrutor)`, chamada dentro de
`renderizarPainelEdicaoInstrutor_` logo após `disciplinasHabilitadasHtmlInstrutor_(instrutor)` e
antes do botão "Salvar" — nos dois modos (`instrutor === null` para cadastro, com tudo desmarcado;
`instrutor` presente para edição, com vínculos ativos pré-marcados).

**Rationale**: `disciplinasHabilitadasHtmlInstrutor_` (texto calculado, read-only) continua
existindo sem alteração (FR-006 — a spec exige coexistência, não substituição); o painel novo é
puramente aditivo ao template já montado por `renderizarPainelEdicaoInstrutor_`.

## 9. Orquestração do salvamento

**Decision**: `salvarEdicaoInstrutor_(idInstrutor)` passa a coletar também
`coletarDisciplinasSelecionadasInstrutor_()` (lista de `ID_Grade` marcados) e encadeia, via Promise,
a chamada existente (`cadastrarInstrutor`/`atualizarInstrutor`) com uma chamada subsequente a
`gs('sincronizarDisciplinasInstrutor', idInstrutorResolvido, idsGrade)` — só disparada se a
primeira chamada resolver com sucesso. Em modo cadastro, `idInstrutorResolvido` vem do retorno de
`cadastrarInstrutor` (`{ok, id}`); em modo edição, é o `idInstrutor` já conhecido.

**Rationale**: Implementa FR-007 diretamente — a ordem "instrutor primeiro, vínculos depois" e a
regra "se o cadastro falhar, nenhum vínculo é criado" são uma consequência natural de encadear via
`.then()` em vez de disparar as duas chamadas em paralelo.

## 10. Cobertura de testes

**Decision**: Backend — `tests/unidade/regras_de_negocio_backend.test.ts` ganha um novo `describe` para
`sincronizarDisciplinasInstrutor`, carregando `lib/acoes/instrutores.ts` adicionalmente ao já feito por esse
arquivo, exercitando os 5 ramos da tabela de decisão do achado 1 (criar/reativar/no-op ativo/
desativar/no-op inativo) mais o achado 3 (ID_Grade inválido ignorado). Frontend —
`tests/unidade/ficha_formulario_instrutores.test.ts` ganha testes para o rótulo com sigla (FR-002), o
filtro de busca (FR-003) e a coleta dos `ID_Grade` marcados, usando o mesmo padrão de extração de
`<script>` já usado nesse arquivo para o resto de `app/(app)/instrutores/page.tsx`.

**Rationale**: Reaproveita os 2 harnesses de teste já estabelecidos nesta sessão (backend
`vm`+o cliente Supabase mockado; frontend extração de `<script>`+importação direta do módulo) — nenhum harness
novo é necessário.
