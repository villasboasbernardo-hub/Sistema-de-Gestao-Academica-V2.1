# Turmas carregadas da planilha de controle — registro para a VIRADA-1

> **A carga final da planilha da v2.0 (pendência VIRADA-1) MUST PULAR toda turma listada aqui.**
> Os lançamentos delas já estão no banco, vindos da **planilha de controle da turma**, e a base da
> v2.0 pode trazê-los de novo — duplicados e, no caso abaixo, com a disciplina errada.

Cada linha é uma **exceção nominal à VIRADA-1**, autorizada por Bernardo Villas Boas turma a turma.
O script (`python -m scripts.carga_dsa.executar`) só escreve no remoto se as decisões da turma
trouxerem `excecao_virada_1`.

## C-Exp-Obs-ME 2026 — a "T2" da planilha de controle (14/09 a 09/10/2026)

**Carga no remoto: CONCLUÍDA em 06/10/2026.**

| O quê                    | Valor                                                                                                                   | Medido contra                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Autorização              | Bernardo Villas Boas, 06/10/2026, restrita a esta turma                                                                 | o pedido da carga                                                                            |
| Origem                   | planilha Google "C-EXP-OBS-ME T2/2026", exportada em xlsx em 06/10/2026                                                 | o Drive da divisão                                                                           |
| Decisões                 | `scripts/carga_dsa/decisoes/c-exp-obs-me-2026.json`                                                                     | este repositório                                                                             |
| Preparo de cadastro      | `scripts/carga_dsa/preparo/c-exp-obs-me-2026.sql`                                                                       | local e remoto, 06/10/2026                                                                   |
| Backup antes da carga    | `remoto-20261006-131935.sql`                                                                                            | a pasta de cópias do remoto, fora do git                                                     |
| Blocos lidos             | 64, em 154 TA preenchidos                                                                                               | a aba PREENCHIMENTO                                                                          |
| Gabarito                 | **dispensado para esta turma** por Bernardo Villas Boas (o CSV não estava disponível); valeram as conferências internas | UE × CH do catálogo da planilha, disciplina × aba CONTROLE, plano do remoto × plano do local |
| Plano                    | impressão digital `a43b8a237c93249e`, igual nos dois bancos                                                             | local e remoto, 06/10/2026                                                                   |
| `registros_aula`         | 33 linhas, 100 TA                                                                                                       | o banco **remoto**, lido de volta após a gravação                                            |
| `avaliacoes`             | 4 linhas, 11 TA de aplicação + 3 vistas, 4 TA; `conteudo_resumo` com o título da planilha                               | o banco **remoto**                                                                           |
| `atividades_nao_letivas` | 22 linhas: 19 Estudo Individual, 2 AEC (visita de 4 TA e palestra de 1 TA), 1 TAD de 1 TA                               | o banco **remoto**                                                                           |
| Dias de calendário       | 28/09 (`FER-000027`) e 02/10/2026 (`FER-000028`) incluídos em `feriados` como dia inteiro; não viram lançamento         | o banco **remoto**                                                                           |
| CH executada             | CHD 115 TA (I = 50, II = 65); CHT 121 TA                                                                                | `vw_carga_horaria_turma`, banco **remoto**                                                   |
| Autoria                  | `criado_por` = a conta `USR-ADMIN-001` nas 59 linhas; nenhuma com `origem_migracao_v1`                                  | o banco **remoto**                                                                           |
| Código das linhas        | `DSAP-C-EXP-OBS-ME-2026-L<linha>-A/V/N` — derivado da linha da planilha                                                 | o banco **remoto**                                                                           |

⚠️ **Por que a carga final deve pulá-la** _(informado por Bernardo Villas Boas em 06/10/2026; não
medido por este script, que não lê a base da v2.0)_: o banco da v2.0 tem **30 aulas, 2 provas e 17
eventos** desta turma **com a disciplina errada — tudo em I**. Carregá-los por cima duplicaria os
lançamentos e traria a disciplina errada junto.

⚠️ **Estas linhas não têm `origem_migracao_v1`, de propósito**: têm posição real na grade, e a
procedência de ETL as faria «herdadas» (a avaliação herdada no 1º TA vai para a faixa «Sem
posição»). Quem as identifica é o **prefixo do código** e o texto de `observacoes`. A carga final
não pode usar `origem_migracao_v1 is null` como sinal de "nasceu na tela" para esta turma.

⚠️ **O Estudo Individual de 02/10 existe, num dia que o calendário marca como dia inteiro**
(licença de pagamento): é o que a planilha registra, e foi mantido por decisão de Bernardo Villas
Boas em 06/10/2026.

### Pendência registrada para o Épico 8 — `PEND-E8-1`, não corrigida aqui

O painel por unidade de ensino mostra **"resta"** em disciplina **concluída**: nas UEs **I-3, I-4,
I-5, II-3 e II-4** sobram 3, 1, 3, 4 e 4 TA, com as duas disciplinas em 100 %. São duas causas
juntas, medidas em 06/10/2026 contra a planilha e o catálogo do banco:

1. **o catálogo da DEnsM embute o tempo de prova na CH da UE** — I-3 tem 10 no banco e 7 na
   planilha, I-4 tem 5 e 4, I-5 tem 14 e 11, II-3 tem 45 e 41, II-4 tem 8 e 4 —, e a planilha
   separa esses tempos em linhas próprias de prova e de vista;
2. **a avaliação não aponta unidade de ensino** (`avaliacoes` não tem `unidade_ensino_id`), então
   os 15 TA de prova e vista entram na CH da disciplina e em nenhuma UE.

A CH **da disciplina** fecha (50 e 65); o que não fecha é a soma por UE. Decidir entre ligar a
avaliação à UE ou descontar o tempo de prova do previsto da UE é do Épico 8.
