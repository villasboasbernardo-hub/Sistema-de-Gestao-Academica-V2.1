# Research: Expansão de CRUD (Cadastro/Edição Completa) e Ordenação Hierárquica de Instrutores

Nenhum `[NEEDS CLARIFICATION]` restou do `spec.md` (as 3 ambiguidades reais já foram resolvidas
antes/durante o `/speckit-clarify`). As decisões abaixo são de implementação.

## 1. Ordenação por precedência militar (FR-001/FR-002/FR-003)

**Decision**: Duplicar `ORDEM_ANTIGUIDADE_POSTO` (mapa) e o padrão de `ordenarInstrutoresPorAntiguidade_`
(``app/(app)/instrutores/page.tsx`:131-142`) em `app/(app)/disciplinas/page.tsx`, aplicados sobre o array `habilitados`
dentro de `abrirEdicaoDisciplinaTurma_`, antes de montar os checkboxes — nunca depois.

**Rationale**: A escala `ESCALA_ANTIGUIDADE_POSTO`/`ORDEM_ANTIGUIDADE_POSTO` já existe, já foi
auditada 3 vezes contra dado real nesta sessão (RN-ANT-02), e é exatamente a fonte de verdade que
o pedido original queria — só descrita incorretamente no texto (research.md do spec, achado 1).
Next.js não compartilha `.ts` entre arquivos `.html` (mesmo gotcha documentado no `CLAUDE.md`
raiz e já contornado pela duplicação de `OFICIAIS_POSTO_`/`PRACAS_POSTO_`/`CIRCULO_HIERARQUICO_POR_POSTO`
entre `components/ciaara/`/`app/(app)/instrutores/page.tsx`) — duplicar o pequeno mapa de 11 entradas em
`app/(app)/disciplinas/page.tsx` é o mesmo padrão já aceito, não uma nova exceção.

**Alternatives considered**:
- *Expor a escala via uma chamada a Server Action ao backend.* Rejeitado — a escala é uma constante estática
  de 11 valores, sem necessidade de round-trip de rede; o próprio `app/(app)/instrutores/page.tsx` já a
  duplica localmente pelo mesmo motivo.
- *Mover `ORDEM_ANTIGUIDADE_POSTO` para `components/ciaara/`, compartilhada por todas as views.* Rejeitado
  por ora — generalização especulativa além do necessário (Princípio IX); `components/ciaara/` já duplica
  parte da mesma informação (`OFICIAIS_POSTO_`/`PRACAS_POSTO_`) para um propósito distinto
  (formatação de nome, não ordenação), consolidar os dois exigiria uma decisão de arquitetura fora
  do escopo deste épico.

## 2. Edição completa — campos reais de `disciplinas` (FR-004/FR-005)

**Decision**: Expandir o HTML do painel de edição (`abrirEdicaoDisciplinaTurma_`) com mais um bloco
de campos no `.modal-body`, antes do bloco de Início/Término já existente: Código
(`Cod_Disciplina`), Nome (`Nome_Disciplina`), Carga Horária (`Carga_Horaria_Tempos`), Prioridade
(1-10, opcional) e Modo de Atribuição (`Modo_Atribuicao_Padrao`, dropdown `Dividido`/`Simultaneo`).
Cada campo pré-preenchido a partir de `disciplinaGrade` (já disponível em memória,
`disciplinasCarregadas`) exceto Prioridade, que vem do novo mapa `getPesosPrioridadeDisciplinas()`.

**Rationale**: Todos os campos já existem em `disciplinasCarregadas`/`disciplinaGrade` (a mesma
variável já usada por `linhaVisao2_` para o fallback de Código/Nome/CH) — nenhuma leitura nova além
da Prioridade. Reaproveitar a mesma estrutura de grid (`row g-2`) já usada para Início/Término
(spec 035) mantém o "mesmo layout e padrão" pedido sem importar o motor de renderização por
taxonomia de `app/(app)/instrutores/page.tsx` (`BLOCOS_EDICAO_INSTRUTOR`/`renderizarCampoEdicaoInstrutor_`),
desproporcional para 5 campos adicionais (esse motor existe para 30 campos em 3 abas).

**Alternatives considered**:
- *Importar `BLOCOS_EDICAO_INSTRUTOR`/`renderizarCampoEdicaoInstrutor_` como motor genérico
  também para Disciplinas.* Rejeitado — over-engineering para 8 campos totais (Princípio VI); o
  padrão visual (grid Tailwind CSS, labels pequenos, mesmo `.modal`) já é reaproveitado, que é o que
  "mesmo layout e padrão" pede — a *maquinaria* de renderização por taxonomia é um detalhe de
  implementação interno ao Módulo de Instrutores, não uma exigência do pedido.

## 3. Prioridade — leitura pública nova (achado real, FR-005)

**Decision**: `getPesosPrioridadeDisciplinas()` (nova, `lib/dominio/motor-preditivo.ts`, ao lado de
`lerPesosPrioridadeDisciplina_`) — wrapper público de 1 linha que devolve o mesmo mapa
`{idGrade: peso}` já calculado internamente pelo motor preditivo, com `exigirFuncao(PERFIS_TODOS)`
(leitura ampla, mesmo perfil de `listarDisciplinas`). Frontend busca esse mapa em paralelo
(`Promise.all`) junto com `listarDisciplinas`/`getDisciplinasAnoVigente`, mesmo padrão de todas as
cargas paralelas já existentes no módulo.

**Rationale**: `lerPesosPrioridadeDisciplina_` já faz exatamente a leitura necessária — só nunca
tinha sido exposta ao a Server Action. Zero duplicação de lógica de leitura de
`config_parametros`.

**Alternatives considered**:
- *Criar uma função dedicada `getPrioridadeDisciplina(idGrade)` (1 disciplina por vez).* Rejeitado
  — obrigaria 1 chamada de rede por disciplina visível na tabela/painel, reintroduzindo o mesmo
  anti-padrão de N chamadas já corrigido em specs anteriores (017, 035); o mapa completo já existe
  pronto em memória no backend a cada chamada do motor preditivo, expô-lo inteiro é O(1) de rede.

## 4. `ID_Grade`/`ID_Disciplina` — geração para disciplina nova (FR-011/FR-012)

**Decision**: `ID_Disciplina` via `gerarProximoIdSequencial_('disciplinas', 'ID_Disciplina')`
(já existe, criada na spec 016 para `instrutores` — mesmo formato "inteiro sequencial puro,
único em toda a aba", confirmado idêntico por leitura direta do dado real: 175 valores 1-175,
não reiniciando por curso). `ID_Grade` montado por concatenação direta:
`idDisciplina + ' - ' + idCurso + ' - ' + codDisciplina` (mesmo formato exato confirmado em toda
linha real de `disciplinas`).

**Rationale**: `gerarProximoIdSequencial_` já existe e já resolve exatamente o mesmo problema
("PK que não segue o padrão `PREFIXO-NNNNNN`") para outra tabela (`instrutores`) — reaproveitar
em vez de duplicar a lógica de "maior inteiro puro + 1".

**Alternatives considered**:
- *Adotar o padrão `PREFIXO-NNNNNN` para novas disciplinas, deixando as antigas no formato legado.*
  Rejeitado — quebraria a leitura humana do ID (`"{ID_Disciplina} - {ID_Curso} - {Cod_Disciplina}"`,
  usado em toda a base atual) só para as linhas novas, inconsistência sem benefício real; nenhum
  código do sistema espera ou valida o formato do `ID_Grade` além de tratá-lo como string opaca.

## 5. Bug de prefixo em `turma_disciplina` (FR-012)

**Decision**: `CRUD_CONFIG['turma_disciplina'].prefixo` de `''` para `'TDI'` (`lib/acoes/crud.ts`).

**Rationale**: Achado real confirmado por leitura direta do dado ao vivo — todas as 210+ linhas
existentes usam `TDI-NNNNNN`, mas `crudCriar` nunca tinha sido chamado para esta tabela (todas as
linhas vieram de script de migração Python, que gera seu próprio ID fora do backend). Esta spec é
o primeiro caminho de escrita real do motor genérico para `turma_disciplina` — sem a correção, a
linha nasceria com `ID_turma_disciplina` em branco. `gerarProximoId_` (já genérico, já usado por
toda outra tabela `PREFIXO-NNNNNN` do sistema) resolve sozinho depois da correção, sem função nova.

**Alternatives considered**:
- *Gerar o ID manualmente dentro de `cadastrarDisciplina`, sem tocar `CRUD_CONFIG`.* Rejeitado —
  deixaria o bug latente para a próxima função que precisar criar uma linha de `turma_disciplina`
  (ex.: um futuro "duplicar disciplina para outra turma"); corrigir na config central resolve para
  qualquer chamador futuro, mudança de 1 linha (Princípio VI).

## 6. Unicidade de Código dentro do Curso (FR-006, RF-DADOS-06)

**Decision**: Função pura nova `existeCodDisciplinaNoCurso_(disciplinas, idCurso, codDisciplina,
idGradeExcluir)` (`lib/acoes/disciplinas.ts`) — recebe o array já lido de `disciplinas`, filtra por
mesmo `ID_Curso` + mesmo `Cod_Disciplina` (case-insensitive, mesmo cuidado de normalização já usado
em `normalizarTexto_`) excluindo o próprio `ID_Grade` (para permitir salvar sem mudar o Código).
Chamada tanto por `atualizarDisciplina` (edição) quanto por `cadastrarDisciplina` (cadastro), antes
de qualquer `crudCriar`/`crudAtualizar`.

**Rationale**: Função pura, testável sem mock de planilha — reaproveitada nos 2 pontos de escrita
em vez de duplicar a checagem. `RF-DADOS-06` (documento de arquitetura) já definia a regra; esta é
a primeira implementação real.

**Alternatives considered**:
- *Confiar só na leitura do usuário (nenhuma validação automática).* Rejeitado — SC-004 do spec.md
  exige bloqueio, e a regra já está documentada como obrigatória desde a migração original.

## 7. Propagação de Código/Nome para `turma_disciplina` (FR-006.1)

**Decision**: Dentro de `atualizarDisciplina`, depois do `crudAtualizar` bem-sucedido em
`disciplinas`, se `obj.Cod_Disciplina` ou `obj.Nome_Disciplina` estiverem presentes: ler
`turma_disciplina` filtrada por `ID_Grade` igual ao editado, e para cada linha encontrada chamar
`crudAtualizar('turma_disciplina', linha.ID_turma_disciplina, { Cod_Disciplina, Nome_Disciplina })`
(só os 2 campos que realmente mudaram).

**Rationale**: Número de turmas vinculadas a uma disciplina é tipicamente pequeno (1-5, confirmado
pela ordem de grandeza real: ~210 vínculos para ~175 disciplinas) — um loop de `crudAtualizar` não
é o anti-padrão de N+1 já corrigido em specs anteriores (que envolvia N proporcional ao número de
turmas do *sistema*, não ao número de turmas de *uma* disciplina).

**Alternatives considered**:
- *Não propagar, `turma_disciplina` como cópia congelada no momento da criação.* Era a leitura
  inicial antes do `/speckit-clarify` — Bernardo escolheu propagar.
- *Escrita em lote (`setValues` numa única operação) em vez de N `crudAtualizar`.* Rejeitado por
  ora — otimização prematura para um número de linhas tipicamente pequeno; `crudAtualizar` já
  cuida de `Editado_Por`/`Timestamp_Edicao` automaticamente, replicar esse comportamento numa
  escrita em lote duplicaria lógica sem necessidade real comprovada.

## 8. Rollback do cadastro em falha parcial (FR-013)

**Decision**: `cadastrarDisciplina` envolve a criação da linha de `turma_disciplina` num
`try/catch`. Em caso de erro, chama `crudExcluir('disciplinas', 'ID_Grade', idGradeRecemCriado)`
(exclusão lógica já existente, grava `Status` inativo) antes de relançar o erro original ao
chamador.

**Rationale**: `crudExcluir` já implementa exatamente a exclusão lógica exigida por FR-013 (nunca
`deleteRow`, C-05) — reaproveitado como mecanismo de rollback, não uma função de compensação nova.

**Alternatives considered**:
- *Validar tudo exaustivamente antes de qualquer escrita, sem rollback.* Reduz a chance de falha
  parcial mas não a elimina (falha de rede/timeout entre as 2 escritas continua possível) — o
  rollback continua necessário como rede de segurança, `/speckit-clarify` confirmou a preferência
  por desfazer automaticamente em vez de deixar o estado parcial visível.
