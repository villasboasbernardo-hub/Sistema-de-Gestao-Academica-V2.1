# Fechamento da spec 014 — os critérios de sucesso medidos (T236)

> ⛔ **PREPARADO, NÃO EXECUTADO.** Roda depois de duas palavras de Bernardo Villas Boas: a conferência em Production
> (`roteiro-de-conferencia-producao.md`) e a decisão da A4.7 (`PEND-014-6`). Até lá, todo resultado está `[pendente]`
> (regra 9.3: nenhuma afirmação de resultado antes da medição).
>
> **Como rodar** (no dia, nesta ordem): (1) `python -m scripts.manutencao.dado_do_remoto` — o banco local vira a cópia
> do remoto, com o arquivo datado citado abaixo; (2) as consultas e as suítes da coluna *Instrumento*; (3) trocar cada
> `[pendente]` pelo número medido, com o artefato ao lado (regra 9.2). Suítes de ponta a ponta pedem
> `pnpm db:reset:limpo` antes e a cópia de volta depois (memória *e2e local exige base limpa*).
>
> Cópia do remoto usada: `[pendente]` · commit da `main`: `[pendente]` · data: `[pendente]`

| SC | O que o critério pede | Instrumento | Resultado |
|---|---|---|---|
| SC-001 | AEC, TAD e TR com os dois percentuais em toda turma com DSA; acima do teto de TAD, a lista medida | `vw_carga_horaria_turma` + `limites` na cópia; `tests/e2e/tetos-da-turma.spec.ts` | `[pendente]` |
| SC-002 | Mudar o teto em `config_parametros` muda o alerta sem redeploy (só origem *norma*) | `tests/unidade/tetos-da-turma.test.ts` + pgTAP da E-1/E-2 | `[pendente]` |
| SC-003 | Nenhum lançamento recusado por teto | e2e que lança acima do teto e lê a linha no banco | `[pendente]` |
| SC-004 | EI e Apoio Individualizado nunca na CHT | pgTAP da E-2 (`compoe_cht`) + Vitest | `[pendente]` |
| SC-005 | AEC global em todas as turmas com DSA na data, e só nelas | `tests/e2e/dsa-tipo-e-global.spec.ts` | `[pendente]` |
| SC-006 | Zero avaliação viva «pendente» com vista registrada; Atrasada no 8º dia | consulta na cópia (lista positiva de status × `vistas_de_avaliacao`) + `tests/unidade/avaliacoes/situacao.test.ts` | `[pendente]` |
| SC-007 | As substituídas fora de toda contagem; a cancelada sem marca continua cancelada | consulta na cópia + `contagem.test.ts` | `[pendente]` |
| SC-008 | C-Ap-HN: UE 7 = 18 + PM 2 + vista 1 = 21; HN-2101 fecha em 126; a rodada não muda CH do catálogo | painel do DSA (passo 3 do roteiro de Production) + impressão digital do catálogo antes/depois (`antes-depois/rodada-do-pr6-no-remoto.md`) | `[pendente]` |
| SC-008.1 | Banco × currículo: zero divergência de CH nos 24 cursos | `scripts/etl/conferir_unidades_ensino.py` / comparação da D-5 | `[pendente]` |
| SC-008.2 | A lista de erros traz, no mínimo, os casos do §11-B | `planilhas-de-origem/rodadas/<carimbo>/erros-de-planilha.md` | `[pendente]` |
| SC-008.3 | A unificação da Q-15 preserva contagens e CH por turma | asserção da D-6 (pgTAP) + relatório de T157 | `[pendente]` |
| SC-009 | Aula em tempo parado recusada (global e da turma), contagem intacta | `tests/e2e/dsa-parar-dia.spec.ts` | `[pendente]` |
| SC-010 | Toda tela nova alcançada por clique | `tests/unidade/toda-tela-tem-caminho.test.ts` + os e2e da spec | `[pendente]` |
| SC-011 | Zero `formula_mf`/`carater` e zero coluna de nota, sem comentário | varredura sem comentário (regra 9.1.1) | `[pendente]` |
| SC-012 | Parada «consome TR» de 4 TA sobe o TR em 4; desfeita, volta | `tests/e2e/dsa-parar-dia.spec.ts` | `[pendente]` |
| SC-013 | Feriado e licença previstos não mudam TAD nem CHT | `tests/unidade/tetos-da-turma.test.ts` + a cópia | `[pendente]` |
| SC-014 | Toda disciplina dos 24 cursos: aula + avaliação = CH, ou «não definido»; arbitrar não muda CH | `tests/invariantes/arbitrado-nao-muda-ch.test.ts` + consulta na cópia (depois da A4.7) | `[pendente]` |
| SC-015 | Todo previsto exibido traz a origem; arbitrado sempre com a marca | `tests/unidade/avaliacoes/previsto.test.ts` + `tests/e2e/avaliacoes-da-turma.spec.ts` | `[pendente]` |
| SC-016 | Estouro exatamente quando Z < 0 (Z = 0 e Z = −1) | `tests/unidade/avaliacoes/projecao.test.ts` + `avaliacoes-da-turma.spec.ts` (−2) | `[pendente]` |
| SC-017 | «N aplicadas de M» sem vista, substituída nem cancelada | `tests/unidade/avaliacoes/contagem.test.ts` + `avaliacoes-nas-telas.spec.ts` | `[pendente]` |
| SC-018 | Previsto do PROENS: Admin, Encarregado e Ajudante gravam; Operador `42501`; o caso do Ajudante | `tests/invariantes/rls/atividades-e-avaliacoes.test.ts` | `[pendente]` |
| SC-019 | As 10 linhas de `reservas_proens` por curso nas turmas; as 2 genéricas em `config_parametros` | consulta na cópia, antes/depois do PR 1.1 | `[pendente]` |

## O que não fechou, e por quê

`[pendente]` — preencher no dia. Já se sabe que entram aqui, **cancelados por decisão de Bernardo Villas Boas em 15/10/2026**: a T213
(situação na planilha), os três itens sem tela da T189 e a `PEND-014-6` (A4.7), se ainda aberta.
