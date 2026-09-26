# Plano de aplicação no remoto — PR 2 da fatia (b): a carga das unidades de ensino

**Projeto**: `cqhpfuaweoyglhtrckcp` — o **mesmo** que serve Preview e Production até a virada
(exceção do `FR-016.1` da spec 001; decisão **AMBIENTE-1**, 21/09/2026). Aplicar migration aqui é
aplicá-la **também na Production**, que roda a `main`.

**Uma migration**, e ela é de **dado**:

| # | Arquivo | O que faz |
|---|---|---|
| M8 | `20260926024246_carga_unidades_ensino.sql` | insere **587** UEs em **138** disciplinas; marca **2** cursos por competências; marca **6** disciplinas sem UE; grava **22** eventos em `migracao_log` |

## ⚠️ O que torna esta aplicação diferente das anteriores

**Ela é a primeira migration desta fatia que ESCREVE dado de negócio no remoto.** As sete do PR 1
criaram estrutura e tocaram três linhas de `disciplinas` (a marcação `simultaneo`). Esta insere 587
linhas numa tabela que está **vazia nos dois bancos** — medido em 26/09/2026.

⚠️ **E é por isso que a conferência de depois mede DUAS coisas, não uma**: as UEs carregadas por
curso **e** que **nenhuma linha pré-existente foi alterada**. A migration não tem `update` sobre
cadastro além das duas marcas declaradas, e a conferência prova isso contando o que não mudou.

⚠️ **NO REMOTO ELA CARREGA DE VERDADE, e no `db reset` ela se abstém.** O porteiro distingue base
sem cadastro nenhum (legítimo: avisa e sai) de base com cadastros e faltando um destino declarado
(aborta nomeando qual). O remoto tem os 24 cursos e as 175 disciplinas, então lá ela é o caminho
real; no local, quem aplica é a **ETAPA 6** do ETL, com **o mesmo arquivo**.

## ⛔ Passo zero, obrigatório — o backup

```
python -m scripts.manutencao.dado_do_remoto --somente-copia
```

O arquivo datado que ele imprime **é citado aqui e no PR**. ⚠️ A cópia **não traz o schema `auth`**.

## 1. Antes de aplicar — tudo só de leitura

```
supabase migration list --linked                       # os dois lados, antes
supabase db push --linked --dry-run                    # SÓ a M8 deve aparecer
python -m scripts.etl.conferir_unidades_ensino --conexao <remoto>   # 0 UEs lá, antes
```

Se o `--dry-run` listar qualquer migration que não seja a M8, **parar**.

## 2. O que muda no remoto

| O quê | Antes | Depois |
|---|---|---|
| `unidades_ensino` | **0** | **587** |
| `cursos` com `curriculo_modelo = 'competencias'` | 0 | **2** |
| `disciplinas` com `sem_unidades_ensino` | 0 | **6** |
| `migracao_log` | o que houver | **+22** |
| `disciplinas` — CH, nome, código | **nada muda** (P-1, Q-13) | idem |
| qualquer outra tabela | **nada muda** | idem |

## 3. A aplicação

```
pnpm db:push
```

**Só depois do CI verde sobre o mesmo commit, e só com autorização nominal de Bernardo** — dada em
25/09/2026 para este PR, nas condições: CI verde, backup citado, dry-run só com o que é deste PR, e
conferência depois mostrando as UEs por curso e zero linhas pré-existentes alteradas.

## 4. Se falhar no meio

A migration roda em **transação própria**, e a asserção final está **dentro** dela: um número que
não fecha **desfaz a carga inteira**. O estado possível é "aplicada" ou "não aplicada", não "meia".

O plano de reversão está no cabeçalho do arquivo: `delete … where origem_migracao_v1 = '<arquivo>'`
mais as duas marcas de volta. ⚠️ Ele vale **enquanto nenhuma aula apontar** para a UE —
`registros_aula` tem FK `restrict`, então a partir do Épico 6 a reversão passa a ser exclusão
**lógica**. ⚠️ E o evento de `migracao_log` **não** é apagado (regra 5). **Executado numa base
descartável** antes deste PR (T022).

## 5. Conferência depois, só por leitura

```
supabase migration list --linked
python -m scripts.etl.conferir_unidades_ensino --conexao <remoto>
```

O que se confere:

- **a tabela por curso**: declaradas × carregadas, as 24 linhas em zero de diferença;
- **zero linhas pré-existentes alteradas**: contagem de `cursos`, `turmas`, `instrutores`,
  `disciplinas`, `turma_disciplina` e `turma_disciplina_instrutor` **idêntica** à de antes, e
  `disciplinas` com a **mesma soma de CH** — é o que prova que a carga não tocou cadastro;
- as **2** marcas de curso e as **6** de disciplina, e nada além;
- **fundamento normativo em toda linha**, e nenhuma fora das duas formas declaradas;
- a **Production respondendo** sem erro novo.

## O retrato do remoto ANTES, medido em 26/09/2026 (só leitura)

⚠️ **Ele é tirado ANTES de propósito**: "zero linhas pré-existentes alteradas" só se prova
comparando com um retrato de antes. Tirado depois, ele só confirma o que a carga deixou.

| O quê | Antes |
|---|---|
| cursos | **24** |
| turmas | **28** |
| instrutores | **177** |
| disciplinas | **175** |
| `turma_disciplina` | **210** |
| `turma_disciplina_instrutor` | **96** |
| soma da CH de **todas** as disciplinas | **9.963** |
| `unidades_ensino` | **0** |
| cursos por competências | **0** |
| disciplinas com `sem_unidades_ensino` | **0** |
| `migracao_log` | **957** |
| **impressão digital do conteúdo de `disciplinas`** (`codigo:CH:nome` de todas as 175) | **`f1df0fcf22fd7a932c0da3b4802f6546`** |

⚠️ **A impressão digital é a prova forte, e ela foi escolhida para NÃO incluir
`sem_unidades_ensino`**: as 6 marcas são mudança **declarada** e devem acontecer; CH, nome e
código são mudança **proibida** (P-1, Q-13) e o md5 muda se qualquer um deles for tocado.

## ✅ APLICADA no remoto em 26/09/2026 — o que foi medido

`[pendente — preenchido pela execução, nunca por antecipação (regra 9.3)]`
