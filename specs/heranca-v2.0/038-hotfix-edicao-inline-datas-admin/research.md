# Research — Hotfix: Edição Inline, Persistência de Datas, Permissão de Admin

Nenhum `NEEDS CLARIFICATION` restou no `plan.md` — a única ambiguidade real do pedido original
(como proceder com a persistência de datas sem conseguir reproduzir o bug) já foi resolvida em
conversa direta com Bernardo antes da spec (ver `spec.md`, seção Clarifications). Este documento
cobre as decisões técnicas de design tomadas durante o planejamento.

## 1. Onde remover a edição inline, e onde preservá-la

**Decisão**: Remove os `<input>` de Carga Horária/Prioridade e o botão "Salvar" só de
`linhaVisao2_` (`app/(app)/disciplinas/page.tsx`) — usada pelas 2 visões turma-aware (estado inicial do ano
vigente e Curso+Turma). `linhaVisao1_` (catálogo puro por Curso sem Turma) fica intocada.

**Rationale**: `linhaVisao2_` sempre renderiza o botão "Editar" (`abrirEdicaoDisciplinaTurma_`),
que desde a spec 036 já cobre 100% dos campos que a edição inline cobria (Carga Horária,
Prioridade) mais Código/Nome/Modo de Atribuição/Datas/Instrutores. `linhaVisao1_` nunca teve botão
"Editar" — o modal é construído em torno de uma linha de `turma_disciplina`
(`abrirEdicaoDisciplinaTurma_(idTurmaDisciplina)`), que só existe quando uma Turma está
selecionada. Remover a edição inline ali sem construir um caminho alternativo (fora do escopo
deste hotfix, spec.md Assumptions) eliminaria toda capacidade de editar Carga Horária/Prioridade
nessa visão.

**Achado incidental durante o planejamento**: o `<input>` de Prioridade em `linhaVisao2_` nunca
teve o atributo `value` — sempre renderizava em branco, mesmo com um peso já salvo
(`pesosPrioridadeCarregados[idGrade]` já estava disponível no escopo, só nunca foi lido para essa
célula). Ao converter a célula para texto simples, o valor exibido passa a ser o peso real salvo
(ou `—` quando não definido) — corrige esse gap como efeito colateral direto da conversão, não uma
tarefa negociada à parte.

**Alternativa considerada e descartada**: remover a edição inline das 2 funções (`linhaVisao1_` e
`linhaVisao2_`) igualmente, como o pedido original pedia literalmente. Descartada por eliminar
capacidade sem substituto na visão sem modal (Verificação de Premissa, `spec.md`).

## 2. Como tornar a falha de persistência de datas visível, sem ter localizado a causa raiz

**Decisão**: `atualizarTurmaDisciplina` (`lib/acoes/liq.ts`) relê a linha imediatamente após `crudAtualizar`
e compara `Previsao_Inicio`/`Previsao_Termino` contra o que foi enviado — lança `Error` real se
não baterem, com os dois valores (enviado vs. relido) na mensagem. `Logger.log` no início da
função registra o payload recebido; um segundo `Logger.log` registra o resultado da releitura.

**Rationale**: a investigação de premissa (leitura de código completa do caminho de escrita +
leitura de dado ao vivo via conector Composio — cabeçalho de `turma_disciplina`, amostra de
linhas, ausência de intervalos protegidos/regras de validação) não encontrou nenhuma causa
localizável estaticamente. Sem conseguir reproduzir o clique real no navegador, a opção
responsável não é adivinhar mais uma correção às cegas, nem deixar `console.log`/`Logger.log`
solto sem nenhum efeito funcional (não corrige nada, e via de regra não fica útil depois porque
ninguém sabe que está lá) — é instrumentar o ponto exato da gravação com uma verificação que (a)
nunca deixa a UI reportar sucesso quando o dado não persistiu de verdade e (b) deixa um rastro
permanente e específico (payload + resultado da releitura) para a próxima vez que o sintoma
aparecer, encurtando a próxima investigação de horas para minutos.

**Por que comparação de string, não de objeto Date**: `lerAbaComoObjetos_` (`lib/supabase/server.ts`) já converte
toda célula `Date` de volta para `'yyyy-MM-dd'` antes de devolver o objeto (linha 115,
``Intl.DateTimeFormat` (fuso `America/Sao_Paulo`)`) — a mesma representação que o frontend já envia (`dataBrParaIso_`). A
comparação é `String(relido) === String(enviado)`, nunca `instanceof Date`/`getTime()`.

**Escopo da checagem**: só roda quando `alteracoes` inclui `Previsao_Inicio` e/ou
`Previsao_Termino` (`alteracoes.hasOwnProperty(...)`) — `atualizarTurmaDisciplina` também é
chamada só para `ID_Instrutor`/`CH_Prevista_Por_Instrutor` (specs 029/032), onde essa checagem não
se aplica e não deve custar uma leitura extra.

**Alternativa considerada e descartada**: adicionar só `Logger.log`, sem a releitura de
verificação. Descartada porque não cumpriria SC-002 do `spec.md` ("erro visível ao usuário") — um
log que só aparece se alguém for procurar no console de execução do Next.js não é, por si só,
uma correção do sintoma relatado ("sem erro na tela").

**Limitação aceita (achado F1 do `/speckit-analyze`)**: a releitura de verificação roda depois de
`crudAtualizar` retornar — ou seja, fora do `a transação do PostgreSQL` que `crudAtualizar` já libera no próprio
`finally` antes de devolver o controle. Uma escrita concorrente genuinamente simultânea na mesma
linha, no intervalo entre a gravação e a releitura, poderia em teoria produzir um falso positivo
(erro relatado para uma gravação que na verdade teve sucesso). Aceita como limitação de baixo risco
dado o padrão real de concorrência desta aplicação (poucos usuários, colisão exigiria 2 pessoas
editando a mesma disciplina/turma em milissegundos) — documentada no código
(`atualizarTurmaDisciplina`), não corrigida com um lock mais amplo nesta spec.

## 3. Permissão de Admin para `definirPrioridadeDisciplina`

**Decisão**: `exigirFuncao(PERFIS_DIVISAO_ADMIN_ACADEMICA)` vira
`exigirFuncao(['Admin'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA))` — cópia exata do padrão já usado
por `gerarPlanejamento`/`salvarPlanejamento`/`lancarEventoManualPlanejamento`, as outras 3 funções
de escrita do mesmo arquivo (`lib/dominio/motor-preditivo.ts`).

**Rationale**: nenhuma lógica nova — é a correção de uma lista de perfis para bater com o padrão
já estabelecido no resto do próprio arquivo (e do projeto: toda entrada de `CRUD_CONFIG.escrita`
segue o mesmo `['Admin'].concat(...)`). O pedido original sugeria um bloco
`if (usuarioPerfil === 'Administrador' || usuarioPerfil === 'Admin') {...}` — descartado por (a)
introduzir um perfil inexistente (`'Administrador'`, o valor real é `'Admin'`, confirmado em
`PERFIS`/`usuarios`) e (b) contornar `exigirFuncao` com uma checagem manual paralela, divergindo
do mecanismo de autorização único já usado por toda função de escrita do sistema.

**Alternativa considerada e descartada**: bloco `if` manual como o pedido original sugeria.
Descartada pelos motivos acima — mesmo resultado funcional, mas introduzindo uma segunda forma de
checar permissão no mesmo arquivo, com um nome de perfil que não existe no sistema.
