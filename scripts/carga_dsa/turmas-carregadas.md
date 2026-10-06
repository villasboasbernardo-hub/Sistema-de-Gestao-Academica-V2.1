# Turmas carregadas da planilha de controle — registro para a VIRADA-1

> **A carga final da planilha da v2.0 (pendência VIRADA-1) MUST PULAR toda turma listada aqui.**
> Os lançamentos delas já estão no banco, vindos da **planilha de controle da turma**, e a base da
> v2.0 pode trazê-los de novo — duplicados e, no caso abaixo, com a disciplina errada.

Cada linha é uma **exceção nominal à VIRADA-1**, autorizada por Bernardo Villas Boas turma a turma.
O script (`python -m scripts.carga_dsa.executar`) só escreve no remoto se as decisões da turma
trouxerem `excecao_virada_1`.

## C-Exp-Obs-ME 2026 — a "T2" da planilha de controle (14/09 a 09/10/2026)

| O quê                    | Valor                                                                                                                                                                                                    | Medido contra                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Autorização              | Bernardo Villas Boas, 06/10/2026, restrita a esta turma                                                                                                                                                  | o pedido da carga                         |
| Origem                   | planilha Google "C-EXP-OBS-ME T2/2026", exportada em xlsx em 06/10/2026                                                                                                                                  | o Drive da divisão                        |
| Decisões                 | `scripts/carga_dsa/decisoes/c-exp-obs-me-2026.json`                                                                                                                                                      | este repositório                          |
| Preparo de cadastro      | `scripts/carga_dsa/preparo/c-exp-obs-me-2026.sql`                                                                                                                                                        | local e remoto, 06/10/2026                |
| Blocos lidos             | 64, em 154 TA preenchidos                                                                                                                                                                                | a aba PREENCHIMENTO                       |
| `registros_aula`         | 33 linhas, 100 TA                                                                                                                                                                                        | o banco **local**, 06/10/2026             |
| `avaliacoes`             | 4 linhas, 11 TA de aplicação + 3 vistas, 4 TA                                                                                                                                                            | o banco **local**, 06/10/2026             |
| `atividades_nao_letivas` | 22 linhas: 19 Estudo Individual, 1 visita (4 TA), 2 atividades de 1 TA                                                                                                                                   | o banco **local**, 06/10/2026             |
| Dias de calendário       | 28/09 e 02/10/2026 incluídos em `feriados` como dia inteiro; não viram lançamento                                                                                                                        | o banco **local**, 06/10/2026             |
| CH executada             | 115 TA (I = 50, II = 65)                                                                                                                                                                                 | `vw_carga_horaria_turma`, banco **local** |
| Código das linhas        | `DSAP-C-EXP-OBS-ME-2026-L<linha>-A/V/N` — derivado da linha da planilha                                                                                                                                  | o banco **local**                         |
| **Carga no remoto**      | **[pendente]** — relógio, turma e atribuição já aplicados em 06/10/2026; os lançamentos aguardam a habilitação do instrutor de código 47 em Observação Meteorológica I e a conferência contra o gabarito | —                                         |

⚠️ **Por que a carga final deve pulá-la** _(informado por Bernardo Villas Boas em 06/10/2026; não
medido por este script, que não lê a base da v2.0)_: o banco da v2.0 tem **30 aulas, 2 provas e 17
eventos** desta turma **com a disciplina errada — tudo em I**. Carregá-los por cima duplicaria os
lançamentos e traria a disciplina errada junto.

⚠️ **Estas linhas não têm `origem_migracao_v1`, de propósito**: têm posição real na grade, e a
procedência de ETL as faria «herdadas» (a avaliação herdada no 1º TA vai para a faixa «Sem
posição»). Quem as identifica é o **prefixo do código** e o texto de `observacoes`. A carga final
não pode usar `origem_migracao_v1 is null` como sinal de "nasceu na tela" para esta turma.
