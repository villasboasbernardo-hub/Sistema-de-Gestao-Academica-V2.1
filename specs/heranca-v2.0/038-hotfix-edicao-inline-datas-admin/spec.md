# Feature Specification: Hotfix — Remoção de Edição Inline, Auditoria de Persistência de Datas e Permissão de Admin para Prioridade

**Feature Branch**: `038-hotfix-edicao-inline-datas-admin`

**Created**: 2026-08-25

**Status**: Draft

**Input**: User description: "HOTFIX ESTRITO: Remoção de Edição Inline, Correção de Persistência de Datas e Permissão de Admin. Contexto Obrigatório: A tentativa anterior de correção falhou. O sistema ainda permite edição inline na tabela principal, as datas do modal não estão sendo salvas no backend e o Admin está bloqueado de editar a prioridade. Escopo: (1) remover completamente inputs/selects/contenteditable das colunas Carga Horária e Prioridade da tabela principal do Módulo de Disciplinas — edição só no Modal Editar; (2) corrigir a persistência de datas entre o modal e o backend, com logging para provar que não chegam vazias/nulas; (3) bypass de permissão para o Admin editar Prioridade, removendo bloqueio rígido no backend e qualquer `disabled` no frontend."

## Verificação de premissa (antes de qualquer requisito)

Confirmado por leitura direta de `app/(app)/disciplinas/page.tsx`, `lib/acoes/liq.ts`,
`lib/acoes/`lib/dominio/motor-preditivo.ts``, `lib/supabase/server.ts` e, para o item 2, leitura **do banco ao
vivo** via conector Composio (`turma_disciplina`, cabeçalho + linhas reais + checagem de intervalos
protegidos/validação de dados) — 2 dos 3 itens são reais, 1 não reproduz, e a moldura do pedido
("a tentativa anterior falhou") está incorreta para o item 1:

1. **Edição inline — real, mas não é "uma correção anterior que falhou".** Não existe nenhuma
   tentativa anterior de remover a edição inline nesta sessão — pelo contrário, a spec 030
   (`/speckit-clarify`, Opção A) **decidiu deliberadamente** manter os dois controles separados
   (edição inline de Carga Horária/Prioridade + botão "Editar" à parte para os demais campos), e
   toda spec seguinte (031, 032, 035, 036) preservou essa decisão sem questionar. O modal "Editar"
   já tem paridade completa desde a spec 036 (`camposDisciplinaHtml_`: Código/Nome/Carga Horária/
   Prioridade/Modo de Atribuição) — remover a cópia inline é seguro, não perde nenhuma capacidade,
   **exceto** num ponto que o pedido original não considerou: a visão de catálogo puro por Curso
   sem Turma (`linhaVisao1_`) **não tem nenhum botão "Editar"** — o modal só existe para linhas de
   `turma_disciplina` (`abrirEdicaoDisciplinaTurma_(idTurmaDisciplina)`). Remover a edição inline
   ali sem alternativa eliminaria por completo a capacidade de editar Carga Horária/Prioridade
   nessa visão — uma regressão real, não um hotfix.
2. **Persistência de datas — não reproduz por leitura de código nem de dado ao vivo.** O payload do
   modal já envia as chaves corretas (`Previsao_Inicio`/`Previsao_Termino`, exatamente os nomes de
   coluna reais) para `atualizarTurmaDisciplina` (`lib/acoes/liq.ts`) → `crudAtualizar` (`lib/acoes/crud.ts`), que já
   reconhece essas 2 colunas como data desde a correção da spec 035 (`ehColunaData_`, com teste de
   regressão). Leitura direta da banco de produção (`turma_disciplina`, conector Composio) confirmou
   que o cabeçalho bate exatamente com o que o código espera (`ID_turma_disciplina` é a coluna A;
   `Previsao_Inicio`/`Previsao_Termino` existem com esses nomes exatos) e que não há nenhum
   intervalo protegido nem regra de validação de dados na aba que pudesse rejeitar a escrita
   silenciosamente. Uma linha real mostra edição recente bem-sucedida (`Timestamp_Edicao` gravado).
   Sem conseguir reproduzir o clique real no navegador, a investigação estática+dado ao vivo chegou
   ao limite do que é verificável sem rodar o app. **Decisão**: em vez de `console.log`/`Logger.log`
   avulso (não corrige nada, não fica como diagnóstico útil depois), o hotfix adiciona uma
   **checagem de leitura pós-gravação** em `atualizarTurmaDisciplina` — relê a linha logo após
   `crudAtualizar` e lança erro real se `Previsao_Inicio`/`Previsao_Termino` não baterem com o que
   foi enviado, transformando uma falha hoje silenciosa (sem erro, dado revertido só percebido no
   F5) numa falha visível, mais um `Logger.log` permanente no ponto de gravação (payload recebido +
   resultado da releitura) — se o sintoma se repetir, o log de execução do Next.js mostra
   exatamente o que foi tentado e o que foi de fato gravado.
3. **Permissão de Admin — real, confirmada, e cirúrgica.** `definirPrioridadeDisciplina`
   (`lib/dominio/motor-preditivo.ts`) usa `exigirFuncao(PERFIS_DIVISAO_ADMIN_ACADEMICA)` — essa constante é só os
   2 perfis da Divisão de Administração Acadêmica (`lib/supabase/server.ts`), **nunca incluiu `'Admin'`**. Todo
   outro ponto de escrita deste mesmo arquivo (`gerarPlanejamento`/`salvarPlanejamento`/
   `lancarEventoManualPlanejamento`) usa `['Admin'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA)` — esta
   função é a única exceção ao padrão já estabelecido no restante do próprio arquivo. No frontend,
   `podeEditarPrioridadeMotor()` **já inclui** `'Admin'` na lista de perfis autorizados a ver/usar o
   campo — só o backend ficou incoerente com o próprio frontend. O segundo ponto do pedido
   (`disabled` no campo do modal bloqueando o Admin) não reproduz: o `<input>` de Prioridade no
   modal (`camposDisciplinaHtml_`) nunca teve atributo `disabled`, para nenhum perfil.

## Clarifications

### Session 2026-08-25

- Q: A investigação estática + dado ao vivo não reproduziu o bug de persistência de datas relatado
  — payload, mapeamento de coluna e schema da banco de produção conferem. Sem conseguir reproduzir
  no navegador, como proceder? → A: Bernardo relatou o sintoma exato: sem erro na tela, mas ao dar
  F5 a data volta para o valor antigo — indicando que a gravação parece não acontecer ou é
  sobrescrita, silenciosamente. Decisão: em vez de depurar mais sem conseguir reproduzir, o hotfix
  adiciona uma checagem de leitura pós-gravação que transforma essa falha silenciosa em um erro
  visível na tela, mais um log permanente no ponto de gravação — ver Verificação de Premissa, item
  2.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tabela principal somente leitura para Carga Horária e Prioridade (Priority: P1)

Ao consultar a tabela principal do Módulo de Disciplinas (com uma Turma selecionada, ou no estado
inicial do ano vigente), o usuário vê a Carga Horária e a Prioridade como texto simples — nenhum
campo clicável, nenhum botão "Salvar" na linha. A única forma de alterar esses valores é abrir o
painel "Editar" (mesmo painel que já edita Código/Nome/Modo de Atribuição/Datas/Instrutores).

**Why this priority**: item obrigatório do pedido; elimina uma superfície de edição duplicada e
redundante, unifica o fluxo de edição num único lugar.

**Independent Test**: abrir a tabela com uma Turma selecionada e conferir que as colunas Carga
Horária e Prioridade mostram só texto, sem nenhum `<input>`/`<select>` nem botão "Salvar" na linha;
clicar em "Editar" e confirmar que os dois campos continuam editáveis e salváveis dali.

**Acceptance Scenarios**:

1. **Given** a tabela principal com uma Turma selecionada (ou o estado inicial do ano vigente),
   **When** a tabela é renderizada, **Then** as colunas Carga Horária e Prioridade mostram valor
   em texto simples, sem nenhum elemento interativo e sem botão "Salvar" na linha.
2. **Given** o usuário quer alterar a Carga Horária ou a Prioridade de uma disciplina numa turma,
   **When** ele abre o painel "Editar" dessa linha, **Then** os campos aparecem pré-preenchidos e
   editáveis, e salvam corretamente ao confirmar (comportamento já existente, preservado).
3. **Given** a visão de catálogo puro por Curso sem nenhuma Turma selecionada (sem botão "Editar"
   disponível nessa visão), **When** a tabela é renderizada, **Then** a edição inline de Carga
   Horária/Prioridade **permanece como está hoje** — removê-la sem um caminho alternativo eliminaria
   a única forma de editar esses valores nessa visão (Verificação de Premissa, item 1).

---

### User Story 2 - Falha ao salvar datas vira erro visível, nunca reversão silenciosa (Priority: P1)

Ao editar a Data de Início/Término de uma disciplina no painel "Editar" e salvar, o usuário tem a
garantia de que, se a gravação não aconteceu de verdade, um erro aparece na tela imediatamente — a
tela nunca mais mostra "sucesso" silencioso para depois reverter ao dar F5.

**Why this priority**: item obrigatório do pedido; item de maior risco relatado (perda de dado
percebida sem nenhum aviso).

**Independent Test**: editar as datas de uma disciplina, salvar, dar F5 e confirmar que a data
gravada é exatamente a editada; se possível, simular uma falha de gravação e confirmar que aparece
um alerta em vez de sucesso silencioso.

**Acceptance Scenarios**:

1. **Given** o usuário edita Início/Término no painel e clica Salvar, **When** a gravação
   realmente aconteceu no banco, **Then** um F5 subsequente mostra exatamente os valores editados,
   nunca os antigos.
2. **Given** o usuário edita Início/Término e clica Salvar, **When** a releitura pós-gravação
   mostra um valor diferente do que foi enviado (gravação não efetivada por qualquer motivo),
   **Then** um erro é exibido ao usuário imediatamente, o painel permanece aberto, e o log de
   execução do backend registra o payload recebido e o valor relido (para diagnóstico).

---

### User Story 3 - Administrador consegue editar a Prioridade (Priority: P1)

Um usuário com perfil `Admin` consegue abrir o painel "Editar" de uma disciplina, alterar o campo
Prioridade e salvar com sucesso — hoje o backend rejeita essa gravação especificamente para esse
perfil, mesmo o campo aparecendo habilitado na tela.

**Why this priority**: item obrigatório do pedido; bug confirmado e de baixo risco de corrigir
(1 lista de perfis).

**Independent Test**: logado como `Admin`, editar a Prioridade de uma disciplina no painel e
salvar; confirmar que não aparece "Acesso negado" e que o valor persiste após F5.

**Acceptance Scenarios**:

1. **Given** um usuário com perfil `Admin`, **When** ele salva um novo valor de Prioridade no
   painel "Editar", **Then** a gravação é aceita pelo backend (sem "Acesso negado") e o valor
   aparece corretamente após recarregar.
2. **Given** os perfis já autorizados hoje (Encarregado/Ajudante da Divisão de Administração
   Acadêmica), **When** esta correção é aplicada, **Then** o comportamento deles não muda em nada
   — a mudança só adiciona `Admin` à lista, nunca remove ninguém.

---

### Edge Cases

- Curso sem nenhuma Turma selecionada (visão de catálogo puro): edição inline de Carga Horária/
  Prioridade permanece disponível (Edge Case da US1, decisão documentada na Verificação de
  Premissa) — não é um "furo" da correção, é a ausência deliberada de alternativa nessa visão.
- Releitura pós-gravação (US2) precisa tolerar o mesmo formato de data que `lerAbaComoObjetos_` já
  devolve (`yyyy-MM-dd`, célula `Date` convertida) — a comparação é feita nesse formato, nunca
  contra o valor bruto do input do usuário (`dd/mm/aaaa`).
- Usuário `Admin` sem nenhuma Turma selecionada tentando editar Prioridade pela tabela (US1, visão
  de catálogo puro): continua funcionando como hoje, sem relação com a correção de permissão do
  backend (que vale para qualquer caminho que chame `definirPrioridadeDisciplina`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tabela principal do Módulo de Disciplinas, quando exibindo dado por Turma (estado
  inicial do ano vigente, ou Curso+Turma selecionados), DEVE renderizar Carga Horária e Prioridade
  como texto simples, sem nenhum `<input>`/`<select>`/atributo editável e sem botão "Salvar" na
  linha.
- **FR-002**: A visão de catálogo puro por Curso sem Turma selecionada DEVE manter a edição inline
  de Carga Horária/Prioridade como está hoje — não tem painel "Editar" alternativo disponível
  (exceção documentada, Verificação de Premissa item 1).
- **FR-003**: O painel "Editar" DEVE continuar sendo a única forma de alterar Carga Horária e
  Prioridade nas visões cobertas por FR-001, sem nenhuma mudança de comportamento além da remoção
  da cópia inline.
- **FR-004**: Ao salvar Início/Término de disciplina pelo painel "Editar", o sistema DEVE reler a
  linha logo após a gravação e comparar com o valor enviado — se não baterem, DEVE lançar um erro
  visível ao usuário (nunca reportar sucesso silencioso) e manter o painel aberto.
- **FR-005**: O ponto de gravação de Início/Término DEVE registrar em log (visível no histórico de
  execução do Next.js) o payload recebido e o resultado da releitura de verificação — auditoria
  permanente, não uma instrumentação temporária a ser removida depois.
- **FR-006**: A função de backend responsável por gravar a Prioridade da disciplina DEVE aceitar o
  perfil `Admin`, além dos perfis já autorizados hoje (Encarregado/Ajudante da Divisão de
  Administração Acadêmica) — sem remover nenhum dos perfis já autorizados.
- **FR-007**: O campo de Prioridade no painel "Editar" NÃO DEVE ter nenhum atributo que bloqueie a
  edição para nenhum perfil autorizado a ver o painel (confirmado já ser o caso hoje — este
  requisito é uma garantia de não regressão, não uma mudança de comportamento).

### Key Entities

- **Linha de Carga Horária/Prioridade na tabela principal**: passa de campo editável para texto
  simples nas 2 visões turma-aware; permanece editável na visão de catálogo puro (sem entidade de
  dado nova).
- **Verificação de gravação de datas**: leitura de confirmação pós-`crudAtualizar`, comparando
  `Previsao_Inicio`/`Previsao_Termino` gravados contra os enviados — não persiste nada novo, é uma
  checagem em memória durante a própria chamada de gravação.
- **Lista de perfis autorizados a definir Prioridade**: ganha `Admin`, mesma forma
  (array de strings) já usada por toda função de escrita do sistema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nenhuma coluna de Carga Horária/Prioridade da tabela principal (visões turma-aware)
  aceita clique para edição — só o painel "Editar" abre um campo editável para esses 2 valores.
- **SC-002**: Uma tentativa de salvar Início/Término que não se efetiva no banco sempre produz um
  erro visível ao usuário, nunca uma reversão silenciosa perceptível só após recarregar a página.
- **SC-003**: Um usuário `Admin` consegue salvar uma alteração de Prioridade com sucesso, 100% das
  vezes, sem "Acesso negado".
- **SC-004**: Nenhum perfil hoje autorizado a editar Prioridade perde acesso como efeito colateral
  desta correção.

## Assumptions

- A visão de catálogo puro por Curso sem Turma mantém a edição inline (Verificação de Premissa,
  item 1) — construir um painel "Editar" alternativo para essa visão está fora do escopo deste
  hotfix (mudança maior, não pedida).
- A causa raiz exata do sintoma relatado de persistência de datas não foi identificada por leitura
  de código nem de dado ao vivo — a correção entregue (checagem pós-gravação + log permanente)
  transforma a falha de silenciosa em visível/diagnosticável, mas não garante eliminar uma causa
  ainda não localizada; se o erro passar a aparecer, o próximo passo é investigar a partir do log.
- Nenhuma migração de schema, nenhuma coluna nova — os 3 itens são comportamento de UI/validação/
  permissão sobre dado já existente.
