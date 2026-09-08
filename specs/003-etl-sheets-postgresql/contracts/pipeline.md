# Contrato — o pipeline e seus artefatos

**Fase 1** · 2026-09-07 · fonte: documento 30 §1.1 e §4 · [research.md §R-7](../research.md)

## Por que seis etapas, e não três

A tentação é "lê, transforma, grava". Cada fronteira aqui produz um **artefato inspecionável**, que é
o que permite responder *"onde exatamente errou?"* sem reexecutar tudo.

| # | Etapa | Entrada | Artefato de saída | Reexecuta sozinha? |
| --- | --- | --- | --- | --- |
| 1 | **Extração v2.0** | `Banco de dados CIAARA-11 v2.0.xlsx` — **arquivo local** | `dados/bruto/v20/<aba>.csv` — cópia fiel, tudo texto | Sim, **offline** |
| **1-B** | **Extração v1.0** ⭐ | os 7 `.xlsx` locais | `dados/bruto/ue_v1/<curso>.csv` | Sim, offline |
| 2 | **Normalização** | `bruto/*.csv` | `dados/normalizado/<tabela>.csv` | Sim, offline |
| **2-B** | **Cruzamento da UE** ⭐ | normalizado de ambas | `dados/normalizado/ue_cruzamento.csv` | Sim, offline |
| 3 | **Carga em staging** | `normalizado/*.csv` | `staging.*`, tudo `text` | Sim (`truncate` + `COPY`) |
| 4 | **Resolução e promoção** | `staging.*` | `public.*` com FK resolvidas | Sim (idempotente por `codigo`) |
| 5 | **Reconciliação** | `public.*` × `staging.*` | `relatorio_divergencia.md` | Sim, é só leitura |

⭐ = **novo neste épico**, não previsto nos documentos 30 e 31.

## Invariantes

- **P-1**: **uma transação**, da etapa 3 à 4. Ou as 25 tabelas entram, ou nenhuma entra. Estado
  parcial é o pior estado numa migração: é o único em que ninguém sabe se o certo é continuar ou
  voltar.
- **P-2**: a etapa 3 **não é opcional**. Pôr o CSV bruto dentro do banco como texto, antes de
  qualquer conversão, é o que transforma a reconciliação em consulta SQL de duas tabelas no mesmo
  motor — em vez de comparar `dict` com `SELECT`, que é a comparação que passa quando não deveria.
- **P-3**: as etapas 1-B e 2-B **convergem na 3**. Não há enriquecimento pós-carga: a UE é `NOT NULL`
  e precisa estar resolvida antes do `INSERT` (research §R-1).
- **P-4**: a **ordem de carga** tem uma única definição no repositório (`ordem.py`). Nenhum módulo de
  tabela conhece a ordem. Reordenar ali é a forma suportada de reordenar.
- **P-5**: **o catálogo de listas é a tabela nº 1.** Quatro gatilhos validam valor contra ela;
  carregá-la depois faz os 1.566 registros de aula falharem com "valor fora do domínio" — e a
  mensagem **não diz** que o problema é a ordem.
- **P-6**: **`migracao_log` por último, e gravado em bloco.** Escrever durante a carga faz um
  `ROLLBACK` levar o log junto — correto, mas confuso de ler.
- **P-7**: o ponto de entrada é **único**. Não existe "rodar só uma tabela para corrigir uma
  coisinha": correção isolada é o que produz base meio migrada.
- **P-8**: nenhum artefato de `dados/` é versionado. Contêm dado real da MB, e o repositório é
  público.
