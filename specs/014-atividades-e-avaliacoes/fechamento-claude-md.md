# T237 — o texto pronto para o `CLAUDE.md` (aplicar só depois de T236)

> ⛔ **PREPARADO, NÃO APLICADO.** No dia do fechamento: medir T236, trocar os `[pendente]` abaixo pelos números de
> `fechamento.md`, aplicar no `CLAUDE.md`, abrir o PR de docs `docs/EPICO-8-9-fechamento` e mesclar.

## 1. A linha da spec 014 em *Estado atual* passa a começar por

> ✅ **SPEC 014 ENCERRADA em `[pendente: data]`. Conferida por Bernardo Villas Boas em Production
> (`roteiro-de-conferencia-producao.md`) e mesclada na `main`** — PRs #45 a #55 e o PR de fechamento `[pendente]`.
> Critérios medidos em `specs/014-atividades-e-avaliacoes/fechamento.md` (`[pendente: N de 22]`). Remoto:
> `[pendente: migrations]`, impressão digital `[pendente]`.

(o restante da linha atual fica como histórico, abaixo dessa frase)

## 2. Pendências nomeadas — acrescentar à tabela de decisões pendentes

| # | Texto |
|---|---|
| **PEND-014-1** | Tabela de junção instrutor × lançamento, com rateio de carga (D-AA-7). Hoje os demais instrutores são texto em `outros_instrutores` |
| **PEND-014-2** | Consumir TA ao **agendar** avaliação (D-AA-15), com a contradição `RF-AVAL-04`/`05` × documento 06 anotada |
| **PEND-014-3** | A Ambientação dos C-ApA (AuxNav, OcOp, PCN, PrevMe): o banco tem disciplina de 8 TA, o currículo trata como fase (B-11) |
| **PEND-014-8** *(se aceitas as propostas de 15/10/2026)* | Na aba Avaliações: botão de **arbitrar a quantidade** (a ação `arbitrarQuantidade` existe sem consumidor — ver `GUARDA-ACAO`), o **histórico da v2.0 «Sem correspondência»** (`historico.ts` sem consumidor) e o **filtro por disciplina** |

## 3. Ajustes de texto

- A `PEND-E8-1` já está fechada (14/10/2026, PR 5.1) — **nada a fazer**.
- A `PEND-DSA-VISTA` já está fechada (A6.1, 14/10/2026) — **nada a fazer**; o texto da T237 que a mandava "seguir no
  backlog do DSA" ficou vencido pela A6.1.
- **O gatilho de espelho da vista** (E-5, `20261014151554`) fica registrado como **resto inerte**: desde o PR 5.1 o DSA
  e desde o PR 6 a sincronização gravam só em `vistas_de_avaliacao`; retirar quando não houver escritor das colunas
  antigas (`[pendente: varredura sem comentário no dia]`).
- `PEND-014-6` (A4.7): marcar fechada se a migration da A4.7 tiver sido aplicada, com o backup citado.
- `PEND-014-7` continua aberta (confiabilidade da suíte).
