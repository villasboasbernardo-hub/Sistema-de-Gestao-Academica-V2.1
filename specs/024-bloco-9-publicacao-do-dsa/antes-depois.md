# Antes × depois — spec 024 (Bloco 9)

A prova do **portão** autorizado por Bernardo Villas Boas em 22/10/2026 (a M2 recria as views e funções que somam ou
cruzam lançamentos, RP-8). A pergunta é uma só: **o que existe hoje nasce SALVO, e nenhum número muda?** Toda medida aqui
foi tirada no banco **local** com a cópia do remoto restaurada — nunca no remoto (a única leitura do remoto é a impressão
digital do esquema, só de leitura).

## 1. O banco: o que soma, antes × depois × revertido

Cópia **`remoto-20261023-140753.sql`** (lida em 23/10/2026 14:07), restaurada sobre o esquema do ramo e revertida pela
`reversao.sql`. A base revertida foi conferida **igual ao remoto objeto a objeto** (`impressao_digital_do_esquema.sql`:
`e5b55421…`, 2.425 objetos, `diff` vazio contra `supabase db query --linked`). Sobre ela:

| Passo | Esquema | O que soma (`impressao_digital_do_que_soma.sql`, 12 leituras) |
|---|---|---|
| base (= remoto, a `main`) | `e5b55421…`, 2.425 objetos | referência |
| com a M1 e a M2 | `18e18fa7…`, 2.573 objetos | **idêntico nas 12** |
| revertida | `e5b55421…`, 2.425 objetos — **`diff` vazio contra o remoto** | idêntico |

As 12 leituras (linhas e resumo, iguais nos três passos): `vw_ocupacao_ta` 3.323 · `vw_carga_horaria_turma` 30 ·
`vw_disciplinas_execucao` 230 · `vw_chd_por_fato` 2.528 · `vw_unidades_ensino_execucao` 587 · `vw_instrutor_carga_anual`
181 · `vw_avaliacoes_situacao` 399 · `vw_conformidade_tetos` 90 · `chd_da_turma_ate('2026-10-23')` 10 ·
`ocupacao_para_conflitos` (as 53 semanas de 2026) 3.323 · `turma_tem_lancamento_no_dsa` 11 de 30 · `fn_status_vista` 399.

⚠️ **ACHADO DA PROVA, CONSERTADO ANTES DO REMOTO:** a primeira versão da M2 reaplicava `grant`/`revoke` nas sete views
recriadas, e com isso **tirava `insert`/`update` de `authenticated` em `vw_unidades_ensino_execucao`** — o resto inerte da
R-8 (a view agrega e não aceita escrita). A reversão voltava tudo **menos** esse privilégio, e só a comparação objeto a
objeto com o remoto mostrou. Como `create or replace view` **preserva** os privilégios, o laço saiu da M2 e da reversão:
mexer em permissão está fora do portão autorizado.

## 2. As telas e as páginas

| Instrumento | Antes (código da `main`) | Depois (código do ramo + M1/M2) | Resultado |
|---|---|---|---|
| `tests/invariantes/retrato-das-telas.test.ts` — andamento, saldo, DSA, papel, planilha | 30 turmas, 213 semanas | idem | **idêntico** |
| `tests/e2e/retrato-das-paginas.spec.ts` — 327 páginas | 327 | 327 | **313 idênticas; 14 diferentes, todas de turma EAD (item 2)** |

As 14 páginas diferentes: `/inicio`, `/turmas` e a ficha e a aba Avaliações das **6 turmas EAD**. Nenhuma diferença vem
do rascunho (RP-8). O que muda é o pedido do item 2:

- **Início:** as duas EAD ativas (`C-ApA-PCN-PR-EAD T2 2026`, `C-ApA-PrevMe-PR-EAD T2 2026`) deixam de sair **em atraso**;
  o cartão delas mostra o aviso da DEaD sem barra de progresso; o KPI **Progresso do recorte vai de 72 % para 79 %**,
  porque a CH prevista das EAD (328 + 368 TA, executado 0) sai da soma.
- **Turmas:** Progresso e Saldo das 6 EAD viram «—»; as duas ativas perdem «em atraso» (saldos −288 e −293).
- **Ficha da turma EAD:** a seção Andamento é só o aviso *"Turma EAD: o andamento é controlado pela Divisão de Ensino a
  Distância, em sistema próprio."*.

## 3. O item 2 — EAD e semipresencial (cópia `remoto-20261023-130122.sql`, hoje = 23/10/2026)

`scripts/provas/medir_bloco_9.sql` + `scripts/provas/medir_bloco_9/antes-depois.test.ts`.

| Turma | Modalidade | Situação | Prevista/executada | Saldo (TA) | Em atraso | Depois |
|---|---|---|---|---|---|---|
| C-ApA-PCN-PR-EAD T1 2026 | EAD | concluída | 328/0 → — | −328 → — | não → não | controle da DEaD |
| C-ApA-PCN-PR-EAD T2 2026 | EAD | ativa | 328/0 → — | −288 → — | **sim → não** | controle da DEaD |
| C-ApA-PrevMe-PR-EAD T1 2026 | EAD | concluída | 368/0 → — | −368 → — | não → não | controle da DEaD |
| C-ApA-PrevMe-PR-EAD T2 2026 | EAD | ativa | 368/0 → — | −293 → — | **sim → não** | controle da DEaD |
| EST-QF-NAVFLU-EAD 2026 | EAD | planejada | 36/0 → — | — → — | não → não | controle da DEaD |
| EST-QF-PROC-MF-EAD 2026 | EAD | concluída | 57/0 → — | −57 → — | não → não | controle da DEaD |
| C-ApA-AuxNav-PR-SP T1 2026 | semipresencial | concluída | 268/0 → 268/0 | −268 → −268 | não → não | aviso «sem marca» |
| C-ApA-AuxNav-PR-SP T2 2026 | semipresencial | ativa | 268/0 → 268/0 | −228 → −228 | sim → sim | aviso «sem marca» |
| C-ApA-OcOp-PR-SP T1 2026 | semipresencial | cancelada | 348/0 → 348/0 | −348 → −348 | não → não | aviso «sem marca» |
| C-ApA-OcOp-PR-SP T2 2026 | semipresencial | cancelada | 348/0 → 348/0 | −236 → −236 | não → não | aviso «sem marca» |
| C-Exp-Metoc-OF-SP 2026 | semipresencial | concluída | 152/0 → 152/0 | −152 → −152 | não → não | aviso «sem marca» |

⚠️ **As 5 semipresenciais não mudam de número**: nenhuma disciplina está marcada «presencial» ainda (a marca nasce
desmarcada), então todas contam tudo, como antes, e mostram o aviso. Os números mudam quando alguém marcar as disciplinas
presenciais do currículo — e só `C-ApA-AuxNav-PR-SP T2 2026` tem a etapa presencial cadastrada (26 a 30/10/2026); nas
demais, marcar sem etapa dá o aviso «sem etapa» e continua contando tudo.
