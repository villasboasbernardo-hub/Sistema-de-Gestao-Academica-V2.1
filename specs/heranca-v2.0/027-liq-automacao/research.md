# Phase 0 Research: Épico LIQ

## 1. Aplicação da migração `turma_disciplina` à banco de produção

**Decisão**: Executar `migracao/criar_turma_disciplina.py` contra a banco de produção seguindo
exatamente o procedimento já usado no commit `0af2d44` (spec 022) e reafirmado em cada migração
desta sessão (`remover_instrutor_completo_adicionar_estado.py`, spec 025): backup prévio via
`fazer_backup()`, execução, gravação de entrada em `migracao_log` via `gravar_log()`, sem redecidir
a modelagem (já aprovada, achado 5 da spec).

**Rationale**: O script já foi validado em sandbox (210 linhas, 0 FK órfã, 0 duplicata, nenhuma
data perdida) — esta spec não escreve migração nova, só aplica a existente. Reexecutar o mesmo
protocolo mantém a Integridade do Histórico (Princípio IV) sem introduzir um caminho novo.

**Alternatives considered**: Reescrever a lógica de migração diretamente em Next.js (rejeitado —
duplicaria trabalho já validado e quebraria o padrão de migração-via-Python-offline-com-log usado
em toda a Fase 2).

## 2. `CRUD_CONFIG` para `turma_disciplina`

**Decisão**: Adicionar uma entrada em `CRUD_CONFIG` (`lib/acoes/crud.ts`) para a tabela `turma_disciplina`,
reaproveitando o CRUD genérico *header-driven* (`crudListar`/`crudAtualizar`) já usado por toda
aba cadastral do sistema — sem função de backend dedicada para o CRUD básico.

**Rationale**: O próprio pedido original já indica isso ("reaproveitando o CRUD genérico
(`crudAtualizar` já é *header-driven*)"). `turma_disciplina` é uma aba de junção simples
(`ID_Turma` + `ID_Grade` + período), sem regra de negócio especial na escrita — perfil de leitura/
escrita espelha o já usado por `disciplinas` (Divisão de Orientação Educacional e Pedagógica +
Admin).

**Alternatives considered**: Função de backend dedicada (`atualizarPeriodoTurmaDisciplina`) —
rejeitado por violar Princípio VI (mudança cirúrgica): não há regra de negócio que justifique
desviar do CRUD genérico já estabelecido.

## 3. Painel de período por turma (User Story 1)

**Decisão**: Novo painel em `app/(app)/cursos/[curso]/page.tsx`, aberto a partir do card de turma já expandido na
Página do Curso (Épico 009) — botão "Período das Disciplinas" que lista as linhas de
`turma_disciplina` daquela turma (via `crudListar('turma_disciplina')` filtrado por `ID_Turma` no
cliente), cada uma com 2 campos de data (`Previsao_Inicio`/`Previsao_Termino`) e um botão "Salvar"
que chama `crudAtualizar('turma_disciplina', ...)` por linha alterada.

**Rationale**: A Página do Curso já é dona do conceito curso→turma→disciplina (é onde o operador já
navega para ver a grade); colocar o preenchimento de período ali, ancorado na turma, é o local mais
direto — evita criar uma 4ª área de navegação só para isto. Reaproveita o padrão de painel-lateral
já usado em `app/(app)/instrutores/page.tsx` (`painelEdicaoInstrutor`/`painelFichaInstrutor`) em vez de modal.

**Alternatives considered**: Nova aba de topo dedicada a "Períodos" — rejeitado (Princípio IX,
Contenção de Escopo: criaria um ponto de navegação novo para uma tarefa de preenchimento pontual,
que se torna rara depois que os 121 períodos iniciais forem preenchidos); editar diretamente na
grade do curso (`disciplinas`) — rejeitado, pois já foi decidido (achado 5) que o período é
por-turma, não por-grade.

## 4. Aritmética de interseção de trimestre

**Decisão**: `trimestreParaIntervalo_(ano, trimestre)` (backend, `lib/acoes/liq.ts`) retorna `{inicio, fim}`
como objetos `Date` (1º trimestre: 01/01–31/03; 2º: 01/04–30/06; 3º: 01/07–30/09; 4º: 01/10–31/12).
`intervalosSeInterceptam_(inicioA, fimA, inicioB, fimB)` é a função pura de interseção
(`inicioA <= fimB && inicioB <= fimA`), reaproveitada tanto para `turmas.Data_Inicio/
Data_Termino` quanto para `turma_disciplina.Previsao_Inicio/Previsao_Termino`.

**Rationale**: O achado 3 confirma que os trimestres são os trimestres-calendário padrão (a
vigência de aceite, 01/07 a 30/09, é exatamente o 3º trimestre). Uma função pura de interseção de
intervalos é trivialmente testável (`tests/unidade/regras_de_negocio_backend.test.ts`) sem precisar de
o cliente Supabase mockado para a lógica de datas em si.

**Alternatives considered**: Comparar apenas o mês de início da turma/disciplina contra o
trimestre — rejeitado, pois uma turma pode começar num trimestre e terminar no seguinte (o próprio
achado 3 cita `C-Esp-ALH`, 07/09 a 04/12, que atravessa o 3º e o 4º trimestre de 2026).

## 5. Validação bloqueante (FR-004/FR-005)

**Decisão**: `validarLiq_(ano, trimestre)` (backend, `lib/acoes/liq.ts`) lê `turmas`, `turma_disciplina`, `instrutor_disciplina` e `disciplinas` uma única vez cada (evitando o padrão de
releitura já corrigido na spec 017), filtra turmas com `Status !== 'Cancelada'` cujo intervalo
intercepta o trimestre, e para cada uma:
- (FR-004) verifica se toda linha de `turma_disciplina` daquela turma tem `Previsao_Inicio` E
  `Previsao_Termino` preenchidos — cada lacuna vira uma mensagem nominal agrupada por curso/turma;
- (FR-005) para cada linha de `turma_disciplina` com período preenchido que intercepta o trimestre,
  verifica se existe ao menos 1 linha `instrutor_disciplina` com `Status === 'Ativo'` para aquele
  `ID_Grade` — cada lacuna vira uma mensagem nominal por disciplina.

Retorna `{podeGerar: boolean, problemas: string[]}`, com TODOS os problemas coletados antes de
retornar (nunca para no primeiro erro) — satisfaz o requisito do pedido original de listar "todos
os problemas de uma vez".

**Rationale**: Migrar o filtro para partir da turma (não da disciplina) é exatamente o que o achado
3 identificou como necessário — filtrar por disciplina faria disciplinas sem `turma_disciplina`
preenchida desaparecerem silenciosamente da verificação. `gerarLiq` chama `validarLiq_` primeiro e
lança `Error` com as mensagens concatenadas se `podeGerar === false`, ANTES de qualquer leitura/
escrita no Supabase Storage (FR-006).

**Alternatives considered**: Alerta ignorável seguindo RN-DEG-02 — rejeitado explicitamente por
FR-007 (exceção deliberada e documentada, ver Complexity Tracking em `plan.md`).

## 6. Geração do documento por clonagem de linha

**Decisão**: `gerarLiq(ano, trimestre)` (backend, `lib/acoes/liq.ts`):
1. Chama `validarLiq_`; lança erro se bloqueado.
2. Monta dados da Seção 1 via `montarDadosSecao1Liq_()`: instrutores com `Status === 'Ativo'` e
   ≥1 vínculo ativo em `instrutor_disciplina`, ordenados diretamente pela coluna já persistida
   `instrutores.Antiguidade_Declarada` (`.sort((a,b) => a.Antiguidade_Declarada -
   b.Antiguidade_Declarada)`) — ver correção abaixo. Carga horária via
   `listarInstrutoresComCargaHoraria()` (achado 2,
   já corrigido durante a verificação de premissa — a spec citava `getChMinistradaAnoInstrutores`,
   que não existe).
3. Monta dados da Seção 2 via `montarDadosSecao2Liq_()`: para cada turma elegível (mesmo filtro de
   `validarLiq_`), para cada linha de `turma_disciplina` cujo período intercepta o trimestre, resolve
   nome do curso + sufixo de turma (lido direto de `turmas.Turma`, achado (j) da spec —
   já contém `"T1"`/`"T2"` literal, sem necessidade de derivação), nome da disciplina, período
   formatado, instrutor(es) vinculados (nome + posto simples, sem a formatação hierárquica de
   círculos usada em telas — essa formatação é uma função de frontend, não replicável no backend) e
   a OM de cada instrutor para a coluna Observações.
4. Abre o Template (`ID_TEMPLATE_LIQ` de `config_parametros`) via `o Supabase Storage.getFileById(...).
   makeCopy(...)`, aplica `replaceText` no corpo para as tags de documento não-repetidas
   (`{{TRIMESTRE_EXTENSO}}`, `{{ANO}}`, `{{VIGENCIA_INICIO}}`, etc.).
5. Para cada uma das 2 tabelas (`body.getTables()[0]` = Seção 1, 8 colunas; `[1]` = Seção 2, 5
   colunas — identificadas por contagem de colunas da linha de cabeçalho, não por índice fixo, para
   não quebrar se o Template for reordenado): para cada registro, `tabela.appendTableRow(linhaModelo.
   copy())` seguido de `replaceText` escopado à linha recém-inserida; ao final, `tabela.removeRow(1)`
   remove a linha-modelo original.
6. Salva o documento na pasta dedicada (`pastaLiqInstrutores_()`) e retorna a URL.

**Rationale**: Este é o núcleo técnico do FR-011 (a técnica em si é requisito, não escolha — a
alternativa `replaceText` global não funciona para tabela de tamanho variável, achado 9). Separar
`montarDadosSecao1Liq_`/`montarDadosSecao2Liq_` de `gerarLiq` mantém cada função pequena e testável
isoladamente (dados vs. efeito colateral de escrita no Supabase Storage).

**Achado de planejamento (correção, revisada em `/speckit-analyze`)**: a spec (achado 1) sugeria
reaproveitar `ordenarInstrutoresPorAntiguidade_` para a ordenação da Seção 1, mas essa função vive
em `app/(app)/instrutores/page.tsx` (frontend) — inacessível a partir de um `.ts`. Uma primeira correção
apontou para `ordenarPorAntiguidadePosto_` (`lib/acoes/instrutores.ts`) como substituta de backend — mas essa
função tem assinatura incompatível: recebe/devolve pares agregados `{posto, quantidade}` (usados
para estatística por posto), não registros completos de instrutor. Chamada com uma lista de
instrutores (que têm `.Posto_Graduacao`, não `.posto`), todo `item.posto` resultaria `undefined`,
todo `_ordem` cairia no fallback 999, e o `.sort` viraria um no-op silencioso — a Seção 1 sairia sem
ordenação nenhuma, sem erro. A forma correta, verificada em `lib/acoes/instrutores.ts`: toda linha de `instrutores` já carrega a coluna `Antiguidade_Declarada`, gravada por `cadastrarInstrutor_`/
`atualizarInstrutor_` a partir de `Posto_Graduacao` (via `calcularAntiguidadeDeclarada_`) em toda
escrita. `montarDadosSecao1Liq_` deve ordenar diretamente por essa coluna já persistida —
`.sort((a,b) => a.Antiguidade_Declarada - b.Antiguidade_Declarada)` — sem chamar nenhuma das 3
funções de antiguidade existentes no projeto.

**Alternatives considered**: Gerar a LIQ inteiramente no cliente (JS) e fazer upload de um arquivo
pronto — rejeitado, pois a API de tabelas do a rota de impressão `/print/*` (`a rota de impressão `/print/*``) só existe no lado do Apps
Script server-side, mesma restrição de plataforma já respeitada pela Ficha (specs 022-024).

## 7. Pasta dedicada e `config_parametros`

**Decisão**: `pastaLiqInstrutores_()` (novo, `lib/acoes/liq.ts`) espelha exatamente `pastaFichasInstrutores_()`
(`lib/acoes/instrutores.ts`) — `o Supabase Storage.getFolderById/createFolder` idempotente para a pasta "Listas de
Instrutores Qualificados". `ID_TEMPLATE_LIQ` é lido via `lerConfigParametros_()['ID_TEMPLATE_LIQ']`,
nunca como constante literal (Princípio VII), mesmo padrão de `ID_TEMPLATE_FICHA_INSTRUTOR`.

**Rationale**: Precedente direto e já testado (spec 022) — reaproveitar em vez de reinventar.

**Alternatives considered**: Nenhuma — este é um caso de reaproveitamento direto de padrão
estabelecido, sem trade-off a avaliar.
