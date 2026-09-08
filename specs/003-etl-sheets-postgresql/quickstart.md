# Quickstart — como provar que o Épico 2 está pronto

**Fase 1** · 2026-09-08 · [plan.md](./plan.md) · [spec.md](./spec.md)

Roteiro de **validação**, não de implementação. Cada bloco corresponde a um critério de sucesso e é
executável por quem não escreveu o código.

## Pré-requisitos

| Item | Conferir com | Estado em 08/09/2026 |
| --- | --- | --- |
| Docker no ar | `docker info` | ✅ 29.7.2 |
| Banco local | `pnpm db:start` | ✅ 12 containers |
| Python | `python --version` | ✅ 3.14 |
| `openpyxl` | `python -c "import openpyxl"` | ✅ 3.1.5 |
| As 7 planilhas da v1.0 | `ls "Cursos Regulares"` | ✅ presentes, **ignoradas pelo git** |
| Credencial do Sheets | `.env.local` | ⬜ `ETL_CREDENCIAL_GOOGLE` |

⛔ **Antes de tudo:** a pendência **R-1** precisa estar decidida. `registros_aula.unidade_ensino_id` é
`NOT NULL`, e sem decisão a primeira carga falha nos 17 cursos sem fonte de UE.

---

## V-1 · O schema aceita a carga (P-6 e R-1)

```bash
pnpm db:reset
docker exec supabase_db_ciaara-11-v2-1 psql -U postgres -tAc \
  "select column_name from information_schema.columns
    where table_name='turma_disciplina' and column_name like 'instrutor%';"
```

**Esperado:** `instrutor_id` presente. Antes da migration desta fatia, **vazio** — foi assim que a
pendência P-6 se confirmou.

---

## V-2 · A carga é atômica (FR-005)

Rodar a carga com um defeito deliberado numa tabela do meio da ordem.

**Esperado:** **zero** linha gravada em qualquer tabela, e mensagem nomeando tabela e linha.
**Não esperado:** "carregou 18 de 25".

---

## V-3 · A reconciliação bloqueia (FR-009, FR-010)

```bash
python -m scripts.etl.executar --ambiente local --somente-reconciliar
```

**Esperado:** relatório com veredito explícito. Depois, a prova que importa — **mover um registro de
aula de turma, à mão, e reconciliar de novo**:

**Esperado: BLOQUEADO**, com a turma nomeada. Se passar, a R-02 não está provando nada — contagem
total não pega troca de FK.

---

## V-4 · O cruzamento da UE não inventa dado (FR-025.2, contrato X-1)

```bash
python -m scripts.etl.cruzar_ue --relatorio
```

**Esperado**, por veredito:

| Veredito | O que significa |
| --- | --- |
| `casado` | todos os lançamentos concordam na UE |
| `ambiguo` | **UE nula** + nome no relatório |
| `sem_fonte` | **UE nula** + nome no relatório |
| `fora_de_cobertura` | os 17 cursos sem planilha — **esperado, não bloqueia** |

**A prova que importa:** pegar um registro `casado` e conferir que `migracao_log` diz **de qual
arquivo, aba e linha** veio a UE. Sem isso, a UE é inventada com aparência de recuperada.

**Não esperado, em nenhuma hipótese:** UE preenchida por frequência, proximidade de data ou "a
primeira encontrada".

---

## V-5 · Idempotência (FR-006)

Rodar do zero duas vezes e comparar contagens e checksums por tabela.

**Esperado:** idênticos.

---

## V-6 · O histórico chega intacto (FR-004, SC-006)

**Esperado:** **717+** linhas de log históricas, nenhuma reescrita; a numeração continua, não
reinicia. E a tentativa de alterar uma delas é **recusada pelo banco**, inclusive com a chave
administrativa.

---

## V-7 · O ensaio não toca a origem (FR-021)

**Esperado:** nenhuma escrita na planilha da v2.0, em nenhuma etapa; tempo total conhecido; e uma
cópia **datada e imutável** da origem, para reproduzir a carga sem a planilha ao vivo.

---

## V-8 · Contenção de escopo (FR-024)

```bash
git status --short                       # esperado: nenhuma planilha .xlsx
git check-ignore "Cursos Regulares"      # esperado: ignorado
```

**Esperado:** zero tela nova, zero regra de negócio nova, e **nenhuma planilha da v1.0 versionada** —
o repositório é público e elas trazem nome de instrutor.

---

## Ordem recomendada

V-1 → V-2 → V-5 (tudo local, sem rede) → V-4 → V-3 → V-6 → V-7 → V-8.

**V-8 fecha, de propósito:** é o único que prova o que **não** foi feito.
