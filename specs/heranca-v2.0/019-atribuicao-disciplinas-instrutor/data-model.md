# Data Model — Painel de Atribuição de Disciplinas do Instrutor

Nenhuma coluna, aba ou tabela nova é criada por esta feature. As 3 entidades abaixo já existem no
schema V2.0 — este documento descreve apenas os campos relevantes para o painel e a sincronização,
e o estado derivado que o frontend monta a partir deles.

## Entidade: Disciplina (`disciplinas`)

| Campo usado | Papel nesta feature |
|---|---|
| `ID_Grade` | Chave usada como `value` do checkbox e como identificador enviado ao backend na sincronização. |
| `Nome_Disciplina` | Parte "Nome" do rótulo do checkbox. |
| `ID_Curso` | Parte "(Sigla)" do rótulo — já é o código curto do curso, não uma coluna nova (research.md §4). |
| `Status` | Só disciplinas com `Status === 'Ativo'` aparecem como opção no painel (FR-013). |
| `Modo_Atribuicao_Padrao` | Copiado para `Modo_Atribuicao` de todo vínculo **novo** criado pela sincronização (research.md §5). |

## Entidade: Curso (`cursos`, via `AppState.ctx.cursos`)

| Campo usado | Papel nesta feature |
|---|---|
| `idCurso` | Mesma chave que `disciplinas.ID_Curso` — usado apenas para confirmar/exibir, o rótulo já usa `ID_Curso` diretamente sem precisar de join com esta lista. |

## Entidade: Vínculo de Habilitação (`instrutor_disciplina`)

| Campo | Papel nesta feature |
|---|---|
| `ID_Vinculo` | PK própria da aba (prefixo `VIN`, gerada por `crudCriar`) — usada como `idColuna` em `crudAtualizar`/`crudExcluir` para reativar/desativar um vínculo específico. |
| `ID_Instrutor` | Filtro para "vínculos deste instrutor" ao calcular o diff na sincronização. |
| `ID_Grade` | Chave de correspondência contra o conjunto marcado no painel. |
| `Status` | `'Ativo'` = vínculo em vigor (aparece pré-marcado); qualquer outro valor (`crudExcluir` grava `'Cancelada'`, default do motor genérico para esta aba, que não define `statusInativo` em `CRUD_CONFIG`) = vínculo historicamente existente, mas não em vigor. |
| `Modo_Atribuicao` | Só escrito na criação de um vínculo novo (research.md §5); nunca alterado em uma reativação. |
| `Instrutor_Descricao`, `Disciplina`, `Curso` (campos denormalizados) | Não lidos nem escritos por esta feature — mesmo comportamento do fluxo de vínculo único já existente (`criarVinculoHabilitacao`), que também os deixa vazios. Nenhuma tela lê esses campos para exibição. |
| `Origem_Migracao_v1`, `ID_Grade_Legado_v1` | Não tocados — exclusivos de linhas herdadas da migração do Épico C. |

### Invariante

Para qualquer par (`ID_Instrutor`, `ID_Grade`), nunca deve existir mais de uma linha com
`Status === 'Ativo'` simultaneamente — garantido pela lógica de reativação (research.md §2), nunca
por uma constraint de planilha (PostgreSQL não tem constraints).

### Transições de estado de um vínculo

```text
(não existe) --[disciplina marcada, sem vínculo prévio]--> Ativo
     Ativo   --[disciplina desmarcada]--------------------> Cancelada
  Cancelada  --[disciplina marcada de novo]----------------> Ativo (mesma linha, mesmo ID_Vinculo)
     Ativo   --[disciplina continua marcada]---------------> Ativo (nenhuma escrita)
  Cancelada  --[disciplina continua desmarcada]-------------> Cancelada (nenhuma escrita)
```

Nenhuma transição remove a linha — `(não existe)` só é o estado inicial antes da primeira criação,
nunca um estado alcançável a partir de `Ativo`/`Cancelada` (Princípio IV).

## Estado derivado no frontend (não persistido)

- **Conjunto pré-marcado** (`idsAtivos`): `Set` dos `ID_Grade` com vínculo `Status === 'Ativo'` para
  o instrutor em edição, calculado a partir de `vinculosCarregados_` já em memória. Vazio em modo
  cadastro (`instrutor === null`).
- **Conjunto selecionado no momento do salvamento** (`idsGrade`): lido diretamente do DOM
  (`coletarDisciplinasSelecionadasInstrutor_()`), nunca guardado em variável de módulo — a fonte de
  verdade da seleção corrente é sempre o estado `checked` dos checkboxes na tela.
