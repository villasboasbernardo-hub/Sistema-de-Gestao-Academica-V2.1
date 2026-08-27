# Contrato — Funções de servidor (Painel de Atribuição de Disciplinas do Instrutor)

Expostas via Server Action (chamada direta, tipada).

## `lib/acoes/instrutores.ts`

### `sincronizarDisciplinasInstrutor(idInstrutor, idsGrade)` (nova, exposta)

- **Entrada**: `idInstrutor` (string, `ID_Instrutor` já existente — sempre chamada depois que o
  instrutor já foi cadastrado/atualizado com sucesso, nunca antes); `idsGrade` (array de string,
  os `ID_Grade` marcados no painel no momento do salvamento; pode ser vazio).
- **Saída**: `{ ok: true, criados: [ID_Grade...], reativados: [ID_Grade...], desativados: [ID_Grade...] }`
  — listas úteis para eventual mensagem de confirmação no frontend, não obrigatórias de exibir.
- **Comportamento**:
  1. Lê todos os vínculos existentes de `instrutor_disciplina` para este `idInstrutor` (qualquer
     `Status`).
  2. Lê `disciplinas` para validar cada `ID_Grade` de `idsGrade` contra o catálogo real e obter
     `Modo_Atribuicao_Padrao`; qualquer `ID_Grade` sem correspondência em `disciplinas` é
     ignorado silenciosamente (research.md §3, Princípio V).
  3. Para cada `ID_Grade` válido em `idsGrade` sem vínculo prévio: `crudCriar('instrutor_disciplina',
     {ID_Instrutor, ID_Grade, Status: 'Ativo', Modo_Atribuicao: <Modo_Atribuicao_Padrao da disciplina>})`.
  4. Para cada `ID_Grade` válido em `idsGrade` com vínculo prévio **inativo**:
     `crudAtualizar('instrutor_disciplina', idVinculo, {Status: 'Ativo'})` — reativa a mesma linha,
     nunca cria uma segunda.
  5. Para cada vínculo **ativo** existente cujo `ID_Grade` NÃO está em `idsGrade`:
     `crudExcluir('instrutor_disciplina', 'ID_Vinculo', idVinculo)` — desativa (`Status: 'Cancelada'`,
     nunca `deleteRow`).
  6. Qualquer combinação já correta (ativo-e-marcado, inativo-e-desmarcado) não sofre nenhuma
     escrita (FR-012).
  7. **Nunca** apaga fisicamente uma linha — toda mudança de estado passa pelas 3 primitivas do
     motor CRUD genérico já existentes (`lib/acoes/crud.ts`), nenhuma chamada direta a `deleteRow`.
- **Regras**: FR-007 a FR-012 de `spec.md`; research.md §1, §2, §3, §5.
- **Permissão**: nenhuma checagem própria — herdada de cada chamada individual a `crudCriar`/
  `crudAtualizar`/`crudExcluir`, que já validam `exigirFuncao(CRUD_CONFIG['instrutor_disciplina'].escrita)`
  (`['Admin', 'Operador'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA)`, inalterado) a cada chamada.

## `app/(app)/instrutores/page.tsx` (frontend, não exposto ao backend — documentado aqui por ser a contraparte direta da função acima)

### `painelAtribuicaoDisciplinasHtmlInstrutor_(instrutor)` (nova)

- **Entrada**: `instrutor` (objeto carregado ou `null` em modo cadastro).
- **Saída**: HTML do painel — campo de busca + lista rolável de checkboxes, um por disciplina
  `Status === 'Ativo'` de `disciplinasCarregadas_`, rótulo `"${Nome_Disciplina} (${ID_Curso})"`,
  pré-marcado (`checked`) quando existe vínculo `Status === 'Ativo'` do instrutor para aquele
  `ID_Grade` em `vinculosCarregados_`. Nenhuma chamada de rede.
- **Regras**: FR-001 a FR-005, FR-013, FR-014; research.md §4, §6, §8.

### `filtrarPainelDisciplinasInstrutor_()` (nova, listener do campo de busca)

- **Comportamento**: a cada evento `input`, compara o valor do campo de busca (minúsculo) contra o
  atributo `data-busca-disciplina` (já em minúsculo) de cada item da lista, alternando
  `style.display` entre `''` e `'none'`.
- **Regras**: FR-003; research.md §7.

### `coletarDisciplinasSelecionadasInstrutor_()` (nova)

- **Saída**: array dos `value` (cada um um `ID_Grade`) de todo checkbox `.chk-disciplina-instrutor`
  atualmente marcado no DOM.
- **Regras**: FR-008; research.md §9.

### `renderizarPainelEdicaoInstrutor_(instrutor)` (existente — comportamento estendido)

- **Mudança**: passa a incluir `painelAtribuicaoDisciplinasHtmlInstrutor_(instrutor)` no HTML
  montado (logo após o bloco já existente `disciplinasHabilitadasHtmlInstrutor_(instrutor)`,
  inalterado) e a registrar o listener de `filtrarPainelDisciplinasInstrutor_` no campo de busca
  recém-renderizado.
- **Regras**: FR-001, FR-006; research.md §8.

### `salvarEdicaoInstrutor_(idInstrutor)` (existente — comportamento estendido)

- **Mudança**: depois de coletar `payload` (inalterado, via `montarPayloadEdicaoInstrutor_`),
  também coleta `idsGrade = coletarDisciplinasSelecionadasInstrutor_()`. A chamada de
  `cadastrarInstrutor`/`atualizarInstrutor` (inalterada) é encadeada via `.then()` com uma nova
  chamada a `gs('sincronizarDisciplinasInstrutor', idInstrutorResolvido, idsGrade)` — em modo
  cadastro, `idInstrutorResolvido` vem do `id` retornado por `cadastrarInstrutor`; em modo edição, é
  o `idInstrutor` já conhecido. A sincronização só é chamada se a primeira chamada resolver com
  sucesso (FR-007).
- **Regras**: FR-007, FR-008; research.md §9.
