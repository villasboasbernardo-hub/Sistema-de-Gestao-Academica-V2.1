# Modelo de dados — Fase 1 · Épico 2

**2026-09-07** · [plan.md](./plan.md) · [research.md](./research.md)

Esta fatia **não cria tabela de negócio**. O schema é do Épico 1. O que ela acrescenta é: uma
migration aditiva, uma que afrouxa a obrigatoriedade da UE sob `CHECK`, e uma área de staging efêmera.

---

## 1. O que muda no schema de `public`

### 1.1 P-6 — `turma_disciplina` ganha duas colunas *(autorizado, R-4)*

| Coluna | Tipo | Nulo? | Por quê |
| --- | --- | --- | --- |
| `instrutor_id` | `uuid` → `instrutores(id)` `on delete restrict` | sim | O instrutor da disciplina **naquela turma**. Sem ela a LIQ do Épico 11 regride (achado LIQ-1) |
| `ch_prevista_por_instrutor` | numérico | sim | CH prevista atribuída àquele instrutor naquela turma |

Ambas anuláveis: a v2.0 não preenche as duas em todas as 210 linhas, e exigir valor faria a carga
falhar por dado que nunca existiu. `restrict` porque **nada é apagado neste sistema**.

### 1.2 R-1 — a UE torna-se anulável, **blindada por `CHECK`** *(autorizado 08/09/2026)*

Hoje: `registros_aula.unidade_ensino_id` é **`NOT NULL`** — medido, não suposto.

A decisão de 07/09 (UE nula nos 17 cursos sem fonte) **não cabia nesse schema**. Bernardo autorizou
em 08/09 a saída A na forma blindada — a coluna passa a aceitar nulo **com `CHECK` que o confina ao
histórico migrado**:

> `unidade_ensino_id` pode ser nulo **apenas** quando `origem_migracao_v1` estiver preenchido.

Assim o grão de UE continua **obrigatório para todo dado novo** — a decisão UE-1 sobrevive onde
importa — e o nulo fica onde é verdade: no que a v2.0 nunca registrou.

| Regra | Efeito |
| --- | --- |
| `unidade_ensino_id` deixa de ser `NOT NULL` | os 17 cursos sem fonte podem ser migrados |
| `CHECK (unidade_ensino_id is not null or origem_migracao_v1 is not null)` | **dado novo continua obrigado** a declarar a UE |

A decisão UE-1 sobrevive onde importa: no que o sistema escrever daqui em diante. O nulo fica onde é
verdade — no que a v2.0 nunca registrou. E a regra vira **explícita no banco**, não comentário.

---

## 2. A área de staging — efêmera, textual, e é ela que torna a reconciliação possível

**Tudo `text`.** Nenhuma conversão antes de o dado estar dentro do banco. É o que transforma a
reconciliação numa comparação entre **duas tabelas do mesmo motor**, em vez de uma comparação entre
estrutura em memória e resultado de consulta — que é justamente a que passa quando não deveria
(documento 30 §1.1).

| Grupo | Origem | Observação |
| --- | --- | --- |
| `staging.*` — 25 tabelas | as 23 abas da v2.0 | Espelho fiel, colunas com o nome do **destino**, sufixo `_codigo` onde guarda um `ID_*` a resolver |
| `staging.ue_v1_lancamentos` | aba `PREENCHIMENTO` dos 7 arquivos | `curso_sigla · data · ta_ordinal · cod · numero_ue · ta_quantidade · arquivo · aba · linha` |
| `staging.ue_v1_disciplinas` | aba `BD DISCIPLINAS` | `curso_sigla · cod · disciplina · numero_ue · nome_ue · ch · local · tecnica · instrutor · arquivo · aba · linha` |
| `staging.ue_cruzamento` | resultado da etapa 2-B | `registro_aula_codigo · unidade_ensino_id · veredito · fonte_arquivo · fonte_aba · fonte_linha` |

**As três colunas de proveniência — `arquivo`, `aba`, `linha` — não são luxo.** São o que cumpre o
FR-025.6 e o que permite responder "de onde veio esta UE?" sem reabrir a planilha.

**A staging é truncada no início da execução seguinte**, não descartada ao fim da atual — assim ela
sobrevive para o `--somente-reconciliar` (etapa 5, reexecutável sozinha) e cada carga ainda começa
limpa. Não é histórico; é andaime que só cai quando o próximo andaime sobe.
*(corrigido em 08/09/2026 — achado CHK012: "descartada ao fim" contradizia o contrato do pipeline,
que exige a etapa 5 reexecutável contra `public × staging`)*

---

## 3. As entidades do cruzamento

### 3.1 Lançamento da v1.0

Uma linha da aba `PREENCHIMENTO`: um **tempo de aula** de um dia. Grão **mais fino** que o registro
da v2.0.

Chave natural: `curso_sigla + data + cod`. O `cod` é o código da disciplina **dentro da planilha**,
que precisa ser reconciliado com o código da disciplina da v2.0 — não são o mesmo espaço de nomes, e
essa reconciliação é ela própria trabalho.

### 3.2 Registro de aula da v2.0

Uma sessão. Grão **mais grosso**. Traz `turma`, `data`, `disciplina` (como código legado, na staging)
e `tempos_consumidos`.

### 3.3 A relação — **muitos para um, e é aí que mora o risco**

7.421 lançamentos → 1.566 registros. Vários lançamentos casam com um registro.

| Situação | Veredito |
| --- | --- |
| Todos os lançamentos que casam apontam **a mesma** UE | `casado` — a UE é resolvida |
| Os lançamentos apontam **UEs diferentes** | `ambiguo` — **não casa**, UE fica nula, e o caso é **reportado nominalmente** |
| Nenhum lançamento casa | `sem_fonte` — UE nula, reportado |
| O curso não tem planilha (17 deles) | `fora_de_cobertura` — UE nula, **esperado**, não é divergência |

**Nunca** se escolhe "a UE mais frequente". Frequência não é evidência; é chute com aparência de
estatística.

---

## 4. `migracao_log` — o que esta fatia grava nele

Append-only por gatilho, **inclusive para a chave administrativa**. Continua a numeração da v2.0,
nunca reinicia.

Três famílias de evento:

1. **Por linha migrada** — a origem na planilha da v2.0.
2. **Por UE recuperada** — arquivo, aba e linha da v1.0 de onde veio (FR-025.6).
3. **Por registro não casado** — com o veredito (`ambiguo`, `sem_fonte`, `fora_de_cobertura`). **O
   que não casou fica gravado**, não só o que casou: é a ausência que alguém vai querer explicar
   depois.

Gravado **em bloco, no fim**, e nunca durante a carga: um `ROLLBACK` levaria o log junto, o que está
correto mas confunde na leitura (documento 30 §4).

---

## 5. O que esta fatia **não** modela

Nenhuma tabela de negócio nova · nenhum `ENUM` novo · nenhuma view · nenhuma policy. O schema é do
Épico 1, e esta fatia só o toca em dois pontos, ambos autorizados: P-6 e a anulabilidade da R-1.
