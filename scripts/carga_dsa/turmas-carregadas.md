# Turmas carregadas da planilha de controle — registro para a VIRADA-1

> **A carga final da planilha da v2.0 (pendência VIRADA-1) MUST PULAR toda turma listada aqui.**
> Os lançamentos delas já estão no banco, vindos da **planilha de controle da turma**, e a base da
> v2.0 pode trazê-los de novo — duplicados e, no caso abaixo, com a disciplina errada.

Cada linha é uma **exceção nominal à VIRADA-1**, autorizada por Bernardo Villas Boas turma a turma.
O comando é `python -m scripts.carga_dsa.sincronizar` (o `executar` do piloto foi absorvido por ele); ele só
toca turma listada em `fontes.json`, e o remoto só recebe o plano que bateu, linha a linha, com o do local.

## Decisões nominais que a sincronização aplica sempre (regras por código, sem nome de pessoa)

| Decisão                                                                                                                                                                                                                                                                                                                                                                                             | Onde está no código                                                                                                                                           | Quem, quando                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| O texto de instrutor que casa com os códigos **55 e 58** é **sempre o 55**, em toda turma; o 58 não dá disciplina — não habilitar nem atribuir nada a ele                                                                                                                                                                                                                                           | `fontes.json` → `regras_globais.desempate_de_instrutor` (`"55\|58": "55"`), aplicado em `resolver.casar()`                                                    | Bernardo Villas Boas, 06/10/2026 (lote da onda 2, item 2)              |
| **Promoção**: o instrutor **144** passou de 1ºSG a **SO** (-MR) em **01/06/2026** — a data do primeiro DSA em que aparece como SO; o texto com o posto antigo é dele. O instrutor **173** foi promovido de GM a **2ºTen (RM2-T)**, OM HNMD; o texto «GM …» é dele. ⚠️ O cadastro **não guarda histórico de posto** nem tem campo de observação: a data está aqui e em `preparo/onda-2-cadastro.sql` | `fontes.json` → `regras_globais.postos_aceitos_por_codigo` (`144: [1SG]`, `173: [GM]`), aplicado em `plano.casar_instrutor`                                   | Bernardo Villas Boas, 06/10/2026 (respostas ao lote da onda 2, item 4) |
| **Assinatura**: o 1º responsável (elaborador) por curso, do cadastro do instrutor que a aba RESPONSÁVEIS (ou o rodapé da IMPRESSÃO) nomeia, desde o início da turma de 2026 — códigos 118 (7 cursos) e 103 (CAHO). C-Ap-HN, C-Espc-HN e C-Exp-BATI: o auxiliar não está no cadastro → `pendencias-cadastro.csv`, e vale a linha GERAL                                                               | `preparo/onda-2-cadastro.sql`                                                                                                                                 | idem, item 3                                                           |
| **Local do Estudo Individual = «Biblioteca»** em todos os cursos e turmas; o local da planilha no EI é ignorado. A sala «Biblioteca» entra no cadastro e todo EI ativo vai para ela                                                                                                                                                                                                                 | `fontes.json` → `regras_globais.local_do_estudo_individual`; `preparo/estudo-individual-na-biblioteca.sql`; no sistema, `LOCAL_DO_ESTUDO_INDIVIDUAL` (PR #34) | Bernardo Villas Boas, 07/10/2026 (conferência visual)                  |
| **Encarregado da Divisão de 05/01 a 01/08/2026**: vigência GERAL acrescentada antes da de 02/08 (data da migração), provada pelo rodapé dos DSA assinados; sem ela 143 semanas saíam sem a 2ª assinatura                                                                                                                                                                                            | `preparo/encarregado-antes-de-agosto.sql`                                                                                                                     | idem                                                                   |
| Texto que não é pessoa (`OFICIAIS-MONITORES`, `ORIENTADORES`) vira aula do titular da disciplina na turma, com a observação «… (conforme DSA)»; sem titular, o instrutor com mais TA na disciplina pela planilha, listado                                                                                                                                                                           | `decisoes/<turma>.json` → `instrutor_por_texto`                                                                                                               | 06/10/2026 (D3 da onda 1; item 3 da onda 2)                            |
| EI fora da tabela HORÁRIOS vive num catálogo de horário (CFG-F Ag-Mag, CFG-G C-Ap-HN, CFG-H CAHO), apontado pela vigência que o DSA usa                                                                                                                                                                                                                                                             | `decisoes/<turma>.json` → `relogio.catalogo`; `preparo/onda-*-decisoes.sql`                                                                                   | D1 (06/10/2026) e D2-1                                                 |

⚠️ **`python -m scripts.manutencao.dado_do_remoto` só funciona a partir de um ramo que tenha as migrations
`20261006184558`, `20261006210242` e `20261006225009`** — o remoto já carrega linhas que só passam pelas catracas
emendadas, e o `db reset` do ramo `main` as recusa na restauração (medido em 06/10/2026). Até o PR #33 ser mesclado,
rode-o do ramo do PR.

## Spec 014 — a rodada da leva 1 (PR 3): dia parado, Apoio Individualizado e responsável pelo lote

**No REMOTO em 14/10/2026** (T121), com a exportação `2026-10-14T1149`, backup `remoto-20261014-124318.sql`, plano
igual ao do local, segunda rodada com zero mudança e os dados das nove turmas iguais nos dois bancos
(`specs/014-atividades-e-avaliacoes/antes-depois/rodada-do-pr3-no-remoto.md`). TAD depois da rodada: CAHO 17,
C-Ap-HN 54, C-Ap-FR 65, C-Espc-HN 41, C-Espc-FR 28, C-Esp-ME 14, MetocOf 2, BATI 2, Ag-Mag 1; acima do máximo, só
C-Ap-FR 2026.

- **D-SYNC-1** _(Bernardo Villas Boas, 13/10/2026)_: a `C-Exp-Obs-ME 2026`, encerrada em 09/10/2026 e com os
  dados conferidos, fica **fora** da rodada do PR 3. A `DSA-MUYK0RFD-V`, relançada pela tela, faria
  `de_tela` diferente de zero e pararia a turma. A vista é recriada pela `PEND-DSA-VISTA`, com antes/depois
  para aprovação e fora da spec 014. A turma **volta** na rodada do PR 6. A exclusão é por `--turmas`,
  **sem** tirar a turma de `fontes.json`.
- **O que a rodada passa a fazer:**
  - o dia parado só da turma vai para `dias_parados` (`DSAP-…-L<linha>-P`, previsto, com o tipo de parada
    pela descrição), e a linha TAD antiga sai com a marca _"[RECLASSIFICADO PELA SPEC 014]"_;
  - Monitoria, Português, BDA e BDF são Apoio Individualizado;
  - Recepção e APOINST ganham os tipos _Recepção aos alunos_ e _Apoio à Instrução_;
  - o responsável que não casa vira pendência do lote;
  - a avaliação cancelada pela tela continua cancelada;
  - o código de feriado sai do `DEFAULT FER-`;
  - o catálogo é conferido antes e depois (saída 7 se mudar);
  - a lista `erros-de-planilha.md` é escrita na pasta da rodada.
- **Medido no local** (cópia `remoto-20261014-085612.sql`, rodada `2026-10-06T1541`, 9 turmas): a primeira
  rodada fez 95 mudanças, a segunda **0**; catálogo igual antes e depois. Antes/depois do TAD de cada turma
  em `specs/014-atividades-e-avaliacoes/antes-depois/rodada-do-pr3-no-local.md`.
- ~~⚠️ **Três das nove têm lançamento feito na tela no remoto** (CAHO, C-Ap-FR e C-Ap-HN, semana de 13/10) e
  **parariam** na rodada do remoto. É o portão A3.3.~~ Resolvido pela virada por turma, abaixo.

## Virada por turma — a data a partir da qual o SISTEMA é a fonte

_(decisão A3.3 de Bernardo Villas Boas, 14/10/2026)_ A sincronização de uma turma com virada cobre **só as
datas anteriores** a ela; da virada em diante **não toca nada** — nem insere, nem atualiza, nem inativa, nem
substitui ETL. A data mora em `fontes.json` (`virada`, por turma), que é o que a sincronização semanal lê.
As demais turmas seguem pela planilha até a virada de cada uma.

| Turma        | Virada (o sistema é a fonte a partir de) | A sincronização cobre | Decisão                                |
| ------------ | ---------------------------------------- | --------------------- | -------------------------------------- |
| CAHO 2026    | 13/10/2026                               | até 12/10/2026        | A3.3, Bernardo Villas Boas, 14/10/2026 |
| C-Ap-FR 2026 | 13/10/2026                               | até 12/10/2026        | A3.3, Bernardo Villas Boas, 14/10/2026 |
| C-Ap-HN 2026 | 13/10/2026                               | até 12/10/2026        | A3.3, Bernardo Villas Boas, 14/10/2026 |

**E, em TODA turma, o que a tela fez vence a planilha** _(A3.4, 14/10/2026)_: a linha da planilha editada na
tela (`editado_por` preenchido — D3.7), a avaliação cancelada na tela e o lançamento nascido na tela não são
desfeitos; o que a planilha tem de diferente vai para `planilha-diverge-do-sistema.md`, na pasta da rodada
(fora do git), para os operadores. **A pendência de responsável trava só a linha** _(A3.2)_: ela fica fora,
listada em `pendencias-de-responsavel.md` com a classificação proposta, e o resto da turma entra.

## Onda 1 — C-Esp-ME 2026 · C-Exp-MetocOf 2026 · C-Exp-Obs-ME 2026 · C-Exp-BATI T1 2026 · C-Exp-Ag-Mag 2026

**Carga no remoto: CONCLUÍDA em 06/10/2026**, rodada `2026-10-06T1541` (exportação do Drive às 15:41), decisões
de Bernardo Villas Boas em duas rodadas no mesmo dia (lote da onda 1 e D1–D5).

| O quê                      | Valor                                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrations aplicadas antes | `20261006184558` (linha histórica inativa dispensa catraca) e `20261006210242` (só lançamento ativo trava a vigência) — backup `remoto-20261006-183510.sql`, 54 e 54                                                                                                                            |
| Backup antes da carga      | `remoto-20261006-191504.sql`                                                                                                                                                                                                                                                                    |
| Preparo de cadastro        | `preparo/onda-1-habilitacoes.sql` (10 pares) e `preparo/onda-1-decisoes.sql` (CFG-F, V do MetocOf sem UE, sala H11, turma MetocOf); nomes de guerra de 9 instrutores e o cadastro de uma 1ºTen rodados à mão, fora do repositório                                                               |
| Relógio                    | 5 vigências canceladas e registradas de novo pela aba HORÁRIOS: C-Esp-ME e MetocOf 7×50 08:10 10/5 13:05; BATI 9×45 07:50 5/5 13:05; Ag-Mag 8×50 08:10 10/5 13:05 **com o catálogo CFG-F** (EI 16:50–17:30); OBS-ME já estava                                                                   |
| Calendário global          | inativados 30/01, 02/06, 10/06, 11/06, 29/06 e 03/08 (dias «por curso»); incluído 04/09                                                                                                                                                                                                         |
| O que entrou               | C-Esp-ME 198 aulas · 19 avaliações (19 vistas) · 95 atividades, ETL 172/25/77 substituído; MetocOf 59 · 3 · 4; BATI 12 · 2 · 2; Ag-Mag 35 · 2 · 12; OBS-ME 0 mudanças (igual ao piloto)                                                                                                         |
| Prova                      | plano do remoto = plano do local nas 5 (impressão digital); segunda rodada com 0 mudanças; impressão digital do conteúdo das três tabelas, das vigências, do calendário e das 23 turmas não tocadas **idêntica** nos dois bancos (13 de 13); lançado = CONTROLE nas 5 turmas, 0 TA de diferença |
| Fora                       | C-Exp-Obs-ME T1 (não há turma no banco)                                                                                                                                                                                                                                                         |

## C-Exp-Obs-ME 2026 — a "T2" da planilha de controle (14/09 a 09/10/2026) — o piloto

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

## Leva 2 no remoto — 14/10/2026

Rodada da sincronização do PR 6 (spec 014) nas **dez** turmas de `fontes.json` — a `C-Exp-Obs-ME 2026` volta, com a
`PEND-DSA-VISTA` corrigida antes (A6.1) —, exportação `2026-10-14T1916`, backup `remoto-20261014-205951.sql`. A prova
aponta a avaliação do currículo (75 de 187), a vista é sessão `…-S`, e 6 sugestões da planilha foram para o ajuste da
turma. Plano = local, 2ª rodada 0, dados iguais nos dois bancos. Relatório:
`specs/014-atividades-e-avaliacoes/antes-depois/rodada-do-pr6-no-remoto.md`.
