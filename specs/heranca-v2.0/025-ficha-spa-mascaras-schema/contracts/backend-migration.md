# Contrato — Migração de schema e backend (instrutores)

## `lib/acoes/crud.ts`

### `COLUNAS_FORMULA['instrutores']` (existente — lista reduzida)

- **Mudança**: `['Instrutor_Completo', 'Carga_Horaria_Ministrada_Ano']` vira só
  `['Carga_Horaria_Ministrada_Ano']` — `Instrutor_Completo` não existe mais no banco, então não
  há mais nada para proteger contra sobrescrita nessa coluna.
- **Regras**: FR-005; research.md §4.

## `migracao/remover_instrutor_completo_adicionar_estado.py` (NOVO)

- **Comportamento**: mesmo protocolo de `migracao/remover_coluna_ultima_avaliacao_desempenho.py`
  (spec 016) — backup do `.xlsx` de trabalho antes de qualquer mudança; remove a coluna
  `Instrutor_Completo` do cabeçalho de `instrutores`; adiciona a coluna `Endereco_Estado` (texto
  livre) ao final do cabeçalho de `instrutores`; acrescenta 2 linhas novas a `migracao_log`
  (`Acao='Remocao_Coluna'`/`'Adicao_Coluna'`, `Aba_Origem='instrutores'`), nunca reescrevendo
  linha existente.
- **Alcance**: só a cópia local de trabalho — aplicação contra a banco de produção é pendência real
  explícita, mesmo padrão de toda migração anterior desta sessão (só aplicada com autorização
  explícita de Bernardo, fora do `/speckit-implement`).
- **Regras**: FR-005, FR-006; data-model.md; research.md §4.

Nenhuma mudança em `lib/acoes/instrutores.ts`/`MAPA_TAGS_FICHA_PDF`/`gerarFichaPDF` — a remoção/adição de
coluna não afeta a geração do PDF (nenhuma das 2 colunas é uma tag do Template).
