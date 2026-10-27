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

| Turma          | Virada (o sistema é a fonte a partir de) | A sincronização cobre | Decisão                                                                                                                                       |
| -------------- | ---------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| CAHO 2026      | 13/10/2026                               | até 12/10/2026        | A3.3, Bernardo Villas Boas, 14/10/2026                                                                                                        |
| C-Ap-FR 2026   | 13/10/2026                               | até 12/10/2026        | A3.3, Bernardo Villas Boas, 14/10/2026                                                                                                        |
| C-Ap-HN 2026   | 13/10/2026                               | até 12/10/2026        | A3.3, Bernardo Villas Boas, 14/10/2026                                                                                                        |
| C-Espc-HN 2026 | 19/10/2026                               | até 18/10/2026        | D2, Bernardo Villas Boas, 26/10/2026 (fica no sistema tudo o que já estava de 19/10 em diante, inclusive o que entrou pela planilha em 26/10) |

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

## Rodada de 26/10/2026 — exportação `2026-10-26T1157`, local e remoto

_Pedido de Bernardo Villas Boas, 26/10/2026: todas as turmas da pasta-fonte, decidindo pela recomendação._ Relatório completo
em `planilhas-de-origem/rodadas/2026-10-26T1157/relatorio-final.md` (fora do git).

- **Rito**: local recriado do remoto (cópia `remoto-20261026-120115.sql`) → ensaio → carga → 2ª rodada **0**; remoto: backup
  **`remoto-20261026-122421.sql`**, ensaio com o plano **igual ao do local nas 8 turmas**, gravação lida de volta, 2ª rodada **0**;
  catálogo igual antes e depois; dados das 30 turmas **iguais** local × remoto; **26 de 30** turmas com a impressão digital intacta.
- **100 mudanças**: CAHO 5 e C-Ap-FR 4 (só até 12/10, virada A3.3), C-Espc-HN 40 e C-Espc-FR 51 (com as semanas planejadas até
  06/11 e 16/11); C-Esp-ME, MetocOf, Ag-Mag e Obs-ME **0** (planilha sem mudança desde 14/10).
- **Decisão com precedente aplicada**: habilitação do instrutor **16** em **MBFCFR-017** (XI) da C-Espc-FR —
  `preparo/rodada-2026-10-26-habilitacoes.sql`, registrada em `decisoes/c-espc-fr-2026.json`.
- ⚠️ **A fonte da C-Ap-HN (`1BydKC…`) NÃO EXISTE MAIS no Drive** (26/10/2026). A turma não foi sincronizada — sem efeito, porque
  a virada dela é 13/10 e os dois candidatos da pasta («Cópia de Cópia de C-AP-HN 2026 - Sabado» e «C-AP-HN 2026 - Planejamento
  Final») são idênticos à exportação de 14/10 até 12/10. O manifesto desta rodada leva a exportação de 14/10 só para o calendário
  global. **A próxima rodada precisa de uma decisão de Bernardo sobre a nova fonte** (ou de tirar a turma de `fontes.json`).
- **C-Exp-BATI T1 2026 fora**: a turma foi arquivada em 20/10/2026 (somente leitura, D-COR-5) e a planilha não mudou.
- **C-Espc-HN 2026**: 12 lançamentos feitos na tela na semana de 19 a 23/10 (A3.4: ficam; 11 linhas da planilha ficaram fora);
  proposta registrada no relatório: virada em 19/10/2026.

### Decisões de Bernardo Villas Boas sobre o relatório da rodada (26/10/2026, à tarde)

- **D1 — fonte da C-Ap-HN**: a «Cópia de Cópia de C-AP-HN 2026 - Sabado» (`1Y4gdWPMu0lXOmyV_g4XF70Gy639woeSt8iOY_iLwD_E`), que
  descende da confirmada (apagada do Drive). «C-AP-HN 2026 - Planejamento Final» e «C-ESPC-HN 2026 PLANEJAMENTO FINAL» **não** são
  fonte. `fontes.json` atualizado.
- **D2 — virada da C-Espc-HN em 19/10/2026** (A3.3, como as três regulares). Tudo o que já estava no sistema de 19/10 em diante fica,
  inclusive o que entrou pela planilha nesta rodada (26/10 a 06/11); a sincronização passa a mexer só antes de 19/10.
- **D3 — C-Exp-Obs-ME T1 2026** (planilha «C-Exp-OBS-ME-PR T01/26», `1NmX7JiIPLglZBbIjVdodJ60mLzKA6ptHQf-aiyqfH-k`, fora da pasta, 02/02 a
  27/02/2026): carregada com as mesmas regras e deixada concluída, sem arquivar. Curso casado pelo catálogo da BD DISCIPLINAS: as duas
  disciplinas (OBSERVAÇÃO METEOROLÓGICA I, 50 TA, UEs 1 a 5; II, 65 TA, UEs 1 a 4) têm os mesmos nomes de UE do currículo
  **CRV-000016** da **C-Exp-Obs-ME**, vigente desde 01/01/2026 — nenhum outro currículo casa. ⚠️ **A turma já existia**: foi criada
  pela tela em 22/10/2026 por `USR-ADMIN-001` (02/02 a 27/02, Sala 06, concluída, currículo CRV-000016, sem alunos e sem atribuição).
  Por isso o preparo (`preparo/c-exp-obs-me-t1-2026.sql`) **não cria** turma: confere o que a tela gravou e completa o resto —
  **alunos 19**; **atribuição** I = instrutor 47 e II = instrutor 15 (um por disciplina, os que a BD DISCIPLINAS nomeia); e o
  **relógio** da aba HORARIOS (9 × 45 min, 07:50, intervalos de 5, tarde 13:05 — o da BATI T1) como **regime da turma**
  (`regimes_de_horario`, o campo de _Editar turma_). ⚠️ **Não como vigência do curso**: a C-Exp-Obs-ME só tem vigência de 14/09 em
  diante, e uma de 02/02 a 13/09 é recusada por `app.conferir_vigencia_nova` — `app.lancamentos_que_travam_vigencia` conta os
  lançamentos de `vigente_de` em diante **sem olhar `vigente_ate`**, e a T2 tem 61 (medido no local, 26/10/2026); mudar a guarda
  seria migration. Decisões com precedente em `decisoes/c-exp-obs-me-t1-2026.json`: locais «EAD» e «CHM» (BATI, Ag-Mag), vistas
  pareadas por decisão explícita (T2: sem ela, as duas vistas de I iam para a AV2) e o de-para de UE pelo nome (R1: «I+5U» → UE 5,
  «II+4U» → UE 4).
- **Pendência de bloco da virada em diante não para a turma** (26/10/2026): a nova fonte da C-Ap-HN planeja aulas de XII de 26/10
  a 07/11 com o instrutor 55, que não é habilitado em XII; a turma **parava** (`sem_habilitacao`) por blocos que a rodada nem grava
  (A3.3). `Pendencia.data` guarda o dia do bloco, e `sincronizar.pendencias_que_bloqueiam` lista a de bloco da virada em diante
  como «depois da virada», sem parar a turma. Prova em `provar_carga_dsa.py` (com controle: sem virada, as duas param).
- **D4 — turma arquivada não para mais a sincronização**: é pulada, e sai no resumo da rodada com o motivo e a data do arquivamento
  (`banco.arquivadas`, pela mesma `app.turma_arquivada` que o gatilho consulta). Prova em `provar_sincronizacao_no_banco.py` (item 6).

### Fechamento da rodada (26/10/2026, à noite) — R1 a R4 de Bernardo Villas Boas

- **R1 — assinatura da C-Exp-Obs-ME T1: NÃO registrada.** A planilha não tem aba RESPONSÁVEIS. O rodapé da IMPRESSÃO traz o
  **mesmo par** nas quatro semanas da turma (02/02 a 27/02): na Aux. da Div. de Adm. Acadêmica, um 3º-Sargento (FR); na Enc. da
  Div. de Adm. Acadêmica, um Capitão-Tenente. **Nenhum dos dois está no cadastro de instrutores**, e o Capitão-Tenente também não
  está em linha nenhuma de `responsaveis_curso` (o 3º-Sargento só aparece como linha digitada, sem instrutor, no elaborador da
  BATI, `RSP-000012`). Pela R1, não registrado. Medido no banco pela mesma regra do DSA (linha do curso, senão a GERAL, vigente
  na data da semana): o DSA de fevereiro da T1 sai hoje com o **elaborador em branco**, porque não há elaborador vigente em
  fevereiro (o do curso, `RSP-000007`, começa em 14/09, e o GERAL dinâmico, `RSP-000001`, em 02/08). O Encarregado sai pelo
  GERAL de 05/01 a 01/08 (`RSP-000013`, um 1º-Tenente). O DSA da T2 continua com o elaborador `RSP-000007` (instrutor 118) e o
  Encarregado `RSP-000002`.
- **R2 — BATI T1 e Ag-Mag T1, só leitura: nada a registrar**, porque as duas têm responsável no período. O rodapé diverge do
  sistema:
  - **BATI** — a semana real (09 a 13/03) é a 1ª folha da IMPRESSÃO. Ela traz, na Aux., um 2º-Sargento (HN), que é o instrutor
    **103**, e, na Enc., um Capitão-Tenente fora do cadastro. O sistema tem como elaborador o `RSP-000012` (o 3º-Sargento FR,
    digitado, desde 09/03) e, como Encarregado, o GERAL `RSP-000013`. As folhas 2 a 5 são semanas-modelo depois do fim do curso,
    com outro par.
  - **Ag-Mag** — 16/03 a 10/04, quatro folhas iguais. Na Aux., o 2º-Sargento (FR) instrutor **118**, que é o `RSP-000008` e
    bate. Na Enc., o mesmo Capitão-Tenente fora do cadastro, contra o GERAL `RSP-000013`.
  - O posto do Encarregado de 02/08 em diante também diverge: o rodapé da T2 (14/09 a 09/10) escreve «Capitão-Tenente», e o
    `RSP-000002` tem 1º-Tenente.
- **R3 — habilitação** do instrutor 55 em XII da C-Ap-HN, no mesmo arquivo da `VIN-000865`
  (`preparo/rodada-2026-10-26-habilitacoes.sql`), registrada em `decisoes/c-ap-hn-2026.json`.
- **R4 — `PEND-VIGENCIA-ATE`** registrada no plano de correções (`docs/correcoes/plano-de-correcoes-em-blocos.md`), sem mexer na
  guarda.

### Assinaturas do DSA (26/10/2026, à noite) — respostas de Bernardo Villas Boas ao fechamento

Respostas: o Encarregado da Divisão é **1º-Tenente** — as linhas `RSP-000013` e `RSP-000002` estão certas, e o
«Capitão-Tenente» dos rodapés das planilhas não vale; e **nenhum DSA sai com assinatura em branco**. O preparo é
`preparo/rodada-2026-10-26-assinaturas.sql` (um bloco, idempotente, sem nome de pessoa: copia a linha digitada que já existe
ou o cadastro do instrutor, pelo código).

- **C-Exp-Obs-ME T1 2026** (02/02 a 27/02): o rodapé da IMPRESSÃO traz o mesmo Aux. em todas as folhas, o 3º-Sargento FR, e
  ele é a **mesma pessoa** da `RSP-000012` (nome completo igual). Entra o elaborador do curso **digitado** (`fixo`, sem
  instrutor), com o texto da `RSP-000012`, vigente **só** de 02/02 a 27/02/2026. Nenhum instrutor é cadastrado.
- **C-Exp-BATI T1 2026** (09/03 a 13/03): a semana real é assinada pelo instrutor **103**. A troca vale só para o período da
  turma: a `RSP-000012` **não é apagada nem inativada** — a vigência dela passa a começar em **14/03** (fora do período da T1
  nada muda) — e entra o elaborador do curso ligado ao instrutor 103, de 09/03 a 13/03/2026.
- **Encarregado**: nenhuma linha nova e nenhuma troca. Pela varredura, nenhuma semana de DSA de turma de 2026 sai sem
  Encarregado: de 05/01 a 01/08 assina a `RSP-000013`, e de 02/08 em diante a `RSP-000002`.
- **Varredura, só de leitura** (toda semana do período de cada turma de 2026 que tem DSA, pela regra do DSA: a linha do curso,
  senão a GERAL, vigente na segunda-feira da semana). Com o preparo aplicado, **sobram 20 semanas com o elaborador em branco, em
  5 turmas sem planilha de controle na pasta-fonte** — o rodapé não pôde ser lido, então nada foi registrado:
  `C-ApA-AuxNav-PR-SP T1 2026` (14 semanas, 16/03 a 15/06), `C-Esp-OpAP T1 2026` (16/03 e 23/03),
  `C-Exp-Metoc-OF-SP 2026` (06/04), `EST-QF-MAREFLU 2026` (20/07 e 27/07) e `EST-QF-PGRS100 2026` (20/07). Antes de 02/08, o
  elaborador GERAL (dinâmico, `RSP-000001`) ainda não vale, e esses cursos não têm linha própria.
- Aplicado no **local** em 26/10/2026, duas vezes (a segunda não inseriu nada): `RSP-000014` (T1) e `RSP-000015` (BATI). O
  remoto recebe o mesmo arquivo depois do merge.
