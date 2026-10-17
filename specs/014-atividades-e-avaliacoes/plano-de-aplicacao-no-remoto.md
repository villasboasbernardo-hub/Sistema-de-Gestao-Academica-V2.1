# Plano de aplicação no remoto — spec 014

> Uma seção por migration, na ordem de aplicação, e uma por rodada da sincronização. Cada campo do
> rito R-15 fica em `[pendente]` até ser medido (regra 9.3). Na implementação noturna de 14/10/2026
> nada foi aplicado; **o PR 1 e o PR 1.1 foram aplicados na fase publicar, em 14/10/2026 de manhã**,
> com a autorização de Bernardo Villas Boas na mesma mensagem que aprovou os antes/depois.

## Rito (R-15), igual para toda migration

1. CI verde no commit que vai ao remoto.
2. Aprovação de Bernardo do antes/depois (só migration de dado) — `aprovacoes-pendentes.md`.
3. Backup: `python -m scripts.manutencao.dado_do_remoto --somente-copia`; o arquivo é citado aqui.
4. Comparar o backup com a cópia usada no antes/depois, nas tabelas que a migration toca. Se mudou,
   regerar o antes/depois e voltar ao passo 2.
5. `supabase db push --linked --dry-run` listando só as migrations desta seção.
6. `supabase db push --linked`.
7. Conferência só de leitura: `supabase migration list --linked`, impressão digital do esquema nos
   dois bancos (`scripts/provas/impressao_digital_do_esquema.sql`), as contagens do antes/depois.
8. Production respondendo (`/login` 200, as protegidas 307).

## PR 1 — E-1, E-2, D-1, D-2

| Campo | Valor |
|---|---|
| Migrations | `20261014051835` (E-1) · `20261014051943` (E-2) · `20261014052333` (D-1) · `20261014052406` (D-2) |
| Antes/depois | `antes-depois/limites_dos_24_curriculos.md` e `antes-depois/reclassificar_tipos_de_atividade.md`, sobre `remoto-20261014-021627.sql` |
| CI verde | `7c86a05` (PR #46), três blocos |
| Aprovação de Bernardo | ✅ 14/10/2026 (A1.1 e A1.2) |
| Backup | `remoto-20261014-082019.sql` (3.667 KB) |
| Passo 4 — backup × cópia do antes/depois | `diff` com `remoto-20261014-021627.sql`: **só** a linha `
estrict` do `pg_dump` (chave aleatória da sessão); nenhuma linha de dado. O antes/depois aprovado vale |
| Dry-run | só as quatro, a partir do ramo `db/EPICO-9-banco-da-leva-1` (que não tem as do PR 1.1) |
| Push | `supabase db push --linked`, saída 0, as quatro na ordem |
| Migrations dos dois lados | 61 no remoto, as quatro novas com `remote` preenchido |
| Impressão digital | remoto **`58d13d0a5e300ccaedc8cec047f63c54`, 1.722 objetos** — a mesma medida no local no estado do PR 1 (a base da prova de `reversao-pr1-1.sql`) |
| Contagens | `limites_curriculo` 30 ativos em 16 cursos; `tipos_parada` 6; os sete tipos novos/mudados com a categoria do relatório; `vw_carga_horaria_turma` das 8 turmas ativas **idêntica** à tabela *Depois* do relatório (= *Antes*); 1.459 atividades, 0 dias parados, 28 turmas |
| Production | `/login` 200; `/inicio`, `/turmas`, `/atividades` 307 |
| Reversão | `reversao-pr1.sql`, provada em base descartável em 14/10/2026: `3650c6c2…`, 1.623 objetos, `diff` vazio |

### Defeitos deliberados do PR 1 (T025), medidos em 14/10/2026 no banco local

| Defeito plantado | Quem reprovou | Desfeito |
|---|---|---|
| (a) `compoe_cht` com a expressão antiga (`set expression`) | `123_apoio_individualizado.sql`, casos 4 e 18 | sim, 123 volta a passar |
| (b) policy `dias_parados_criar` global lendo `atividades_globais.criar` | `atividades-e-avaliacoes.test.ts`, só o caso do Ajudante | sim, 13 de 13 |
| (c) gatilho `trg_config_listas_recategorizar` desligado | `123_apoio_individualizado.sql`, caso 13 (cenário 4 da US2) | sim |

## PR 1.1 — E-3, D-3

| Campo | Valor |
|---|---|
| Migrations | `20261014060055` (E-3) · `20261014060056` (D-3) |
| Antes/depois | `antes-depois/reservas_do_proens_para_as_turmas.md`, sobre `remoto-20261014-021627.sql` |
| CI verde | `d41bc51` (PR #47), três blocos |
| Aprovação de Bernardo | ✅ 14/10/2026 (A1.1.1) |
| Backup | `remoto-20261014-082202.sql` (3.755 KB), tirado **depois** do PR 1 |
| Passo 4 | blocos de `reservas_proens` (13 linhas) e `turmas` (29) **idênticos** aos da cópia do antes/depois; `config_parametros` difere **só** pela linha `avaliacao.vence_em_breve_dias`, que o próprio PR 1 criou |
| Dry-run | só as duas, a partir do ramo `db/EPICO-9-previsto-proens-por-turma` |
| Push | saída 0, as duas na ordem |
| Migrations dos dois lados | **63 e 63**, nenhuma só de um lado |
| Impressão digital | **`9acfa39da335ac55479a1b3236117bf7`, 1.760 objetos, IGUAL no local e no remoto** |
| Contagens | 10 previstos ativos, os mesmos dez valores da tabela do A1.1.1; `proens.reserva_generica_tad = 2` e `_tr = 0`; `reservas_proens` intacta (12 linhas, só leitura) |
| Production | `/login` 200, `/inicio` 307 |
| Reversão | `reversao-pr1-1.sql`, provada em base descartável em 14/10/2026: volta a `58d13d0a…`, 1.722 objetos (a impressão do PR 1), `diff` vazio |

Defeito deliberado (T043), medido em 14/10/2026: a policy de criar o previsto lendo `calendario.editar`
→ `atividades-e-avaliacoes.test.ts` reprova no caso do Ajudante (e nos três seguintes, que dependem da
linha dele). Desfeito: 19 de 19.

## PR 2 — rodada da sincronização: não há (a sincronização no remoto é do PR 3)

## PR 3 — rodada da sincronização no remoto

✅ **APLICADA NO REMOTO em 14/10/2026**, com as decisões A3.1 a A3.5 de Bernardo Villas Boas e a exportação nova
`2026-10-14T1149`. Backup imediatamente antes: **`remoto-20261014-124318.sql`**. Plano do remoto = plano do local
nas nove turmas; 1ª rodada 127 mudanças, 2ª **0**; catálogo igual; dados das nove turmas **iguais** no local e no
remoto. Sem migration. Relatório: `antes-depois/rodada-do-pr3-no-remoto.md`. A medida anterior, só no local e com a
exportação de 06/10, fica em `antes-depois/rodada-do-pr3-no-local.md`.

Pré-requisitos, nesta ordem:

1. As decisões **A3.1 a A3.5** de `aprovacoes-pendentes.md`. Sem a A3.2 (os 43 textos de responsável), a
   rodada para **todas** as nove turmas. Sem a A3.3, para CAHO, C-Ap-FR e C-Ap-HN, que têm lançamento
   feito na tela.
2. O PR 3 com CI verde (o código da rodada é o do ramo, não o da `main`).
3. A exportação **nova** das planilhas de `fontes.json` para `planilhas-de-origem/rodadas/<carimbo>/`.
4. O ensaio no **local**, recriado por `dado_do_remoto`, com a exportação nova e `--turmas` nas nove
   (sem a C-Exp-Obs-ME, D-SYNC-1); depois, a impressão digital do plano.
5. O backup `--somente-copia`, citado aqui.
6. A rodada no remoto: plano idêntico ao do local, gravação, leitura de volta, segunda rodada com zero
   mudança, catálogo igual (o próprio script sai com 7 se mudar).
7. Registrar aqui e em `scripts/carga_dsa/turmas-carregadas.md` o TAD de cada turma antes → depois e a
   SC-001 remedida.

## Leva 2 — E-4, E-5, D-5, D-6, D-4, D-7 e a rodada do PR 6

### As seis migrations do PR 4 (#51)

✅ **APLICADAS NO REMOTO em 14/10/2026**, com as aprovações A4.1 a A4.6 de Bernardo Villas Boas
(14/10/2026), e **mescladas na `main` por squash em `4180de9`** logo depois da conferência (congelamento T161: nenhuma
rodada de sincronização entre o push e o merge).

| Passo | Medido |
|---|---|
| CI do ramo | verde nos três blocos sobre `24a7c69` (run `38605247216`) |
| `verificar:tudo` local | unidade **2.167** (151) · pgTAP **710** (50) · invariantes e RLS **305** (15) · ponta a ponta 454 casos: **445** passados, 6 pulados e 3 reprovados sob carga (`dsa-parar-dia`, `dsa-tipo-e-global`, `tema`) — os três **passam isolados**, o de tema em base limpa (6 de 6) |
| Prova cruzada SQL × TS (T139) | 10 casos, duas vezes seguidas; o defeito plantado (`>=` no prazo) reprova no 7º dia |
| Reversão (T154) | numa base descartável: `129d83d4…` (1.904) → `reversao-pr4.sql` → `9acfa39d…` (1.760), diff vazio contra a `main` |
| «Antes» | cópia `remoto-20261014-144518.sql`, restaurada no local pela `main`, medida por `medir_leva2.sql` |
| Ensaio | as seis, na ordem, sobre essa cópia: NOTICEs **D-5 10** (com a B-12) · **D-6 2** · **D-4 194** · **D-7 188 / 241 / 15 / 1 sem casamento**; as **28 turmas iguais** antes e depois; impressão digital `129d83d4…`, 1.904 objetos |
| Backup imediatamente antes | **`remoto-20261014-144657.sql`** |
| Dry-run | só as seis, na ordem E-4, E-5, D-5, D-6, D-4, D-7 |
| `db push --linked` | saída **0** |
| Migrations | **69 e 69**, nenhuma só de um lado |
| Impressão digital | **`129d83d4ea6ba0629d5345342a860a6a`, 1.904 objetos, igual no local e no remoto** |
| Dado depois (`remoto-20261014-144808.sql`) | **idêntico ao ensaio**, campo a campo do `medir_leva2`; as **28 turmas iguais ao antes**; 194 itens ativos; 241 sessões de vista; avaliações 192 pendentes · 188 `substituida_pela_planilha` · 4 canceladas; **0** policies de `DELETE` |
| Production | `/login` e `/estilo` 200, as protegidas 307, antes e depois do push |

⚠️ **O código da `main` antes do merge continuou compatível com o esquema novo**, medido antes de mesclar: ele lê
`avaliacoes.data_vista_prova`, que a leva 2 **mantém** (a vista passou às sessões, e a coluna fica).

### A migration do PR 5 (#52) — a trilha do arbitrado (condição da D5.3)

✅ **APLICADA NO REMOTO em 14/10/2026** e **mesclada em `cd27abd`**. `20261014223818_trilha_do_arbitrado` cria
`avaliacoes_curriculo_arbitragens` (antes, depois, quem e quando do arbitrado), só de acréscimo; não muda dado.

| Passo | Medido |
|---|---|
| CI do ramo | verde nos três blocos sobre `1fa3a6b` |
| Reversão | `reversao-pr5.sql` no local: `19d845f0…` (1.935) → `129d83d4…` (1.904), a impressão digital da `main` |
| Remoto antes | `129d83d4…`, 1.904 objetos, 69 migrations |
| Backup imediatamente antes | **`remoto-20261014-201119.sql`** |
| Dry-run | só `20261014223818_trilha_do_arbitrado.sql` |
| `db push --linked` | saída **0** |
| Migrations | **70 e 70** |
| Impressão digital | **`19d845f064aa78fab01e8f2e36e7a1cb`, 1.935 objetos, igual no local e no remoto** |
| Dado | a carga das 28 turmas com o **mesmo md5** antes e depois (`da925be4…`); 194 itens; 0 ajustes; a trilha vazia, com os dois gatilhos de imutabilidade; **0** policies de `DELETE` |
| Production | `/login` e `/estilo` 200, as protegidas 307 |

### A rodada do PR 6

✅ **APLICADA NO REMOTO em 14/10/2026**, com as aprovações **A6.1** e **A6.2** de Bernardo Villas Boas, depois dos
merges de #52, #53 e #54 e do deploy de cada um. Exportação nova `2026-10-14T1916`; backup imediatamente antes
**`remoto-20261014-205951.sql`**; a A6.1 (`pend-dsa-vista.sql`) primeiro, igual ao ensaio; plano do remoto = plano do
local nas **dez** turmas; 1ª rodada 318 mudanças, 2ª **0**; catálogo igual; dados das dez turmas **iguais** no local e
no remoto, e as 18 outras sem mudança; impressão digital `19d845f0…`, 1.935 objetos, igual nos dois. Relatório, com a
CHT por turma antes → depois, as 17 linhas que viram Apoio Individualizado e a lista de erros por turma:
`antes-depois/rodada-do-pr6-no-remoto.md`.

### As migrations da emenda de 15/10/2026 (#58) — E-6 e D-9

Desenho `desenho-emenda-15-10.md`, **opção A aprovada por Bernardo Villas Boas em 16/10/2026**, com a instrução de
publicar de ponta a ponta (*"Publique em sequência: #56 → #58 (CI verde, merge, deploy em Production), com a migration
pelo rito (backup, dry-run, db push, impressão digital local × remoto)"*). A D-9 é dado de **configuração** que ele
mesmo decidiu (a marca de vista em PE, PM e PO; a janela de 7 dias): o antes/depois dela é a própria decisão.
⚠️ **O código da `main` antes do merge continua compatível com o esquema novo**: ele não lê nenhuma coluna nova, e o
ramo `sessao_aplicacao` de `vw_ocupacao_ta` só tem linha depois da rodada, que vem depois do merge.

| Passo | Medido |
|---|---|
| CI do ramo | verde nos três blocos sobre `fe5cfcf` (runs `38889416595` e `38889421022`), o #58 rebaseado sobre a `main` do #56 (`9bf9c67`) com a árvore conferida **igual** à verificada |
| Reversão | `reversao-emenda-15-10.sql` no local (16/10/2026): depois das duas partes, **`19d845f0…`, 1.935 objetos** — a do remoto antes; só a parte 1 faz o pgTAP 132 reprovar 11 asserções |
| Remoto antes | `19d845f064aa78fab01e8f2e36e7a1cb`, 1.935 objetos; 70 migrations aplicadas e as duas novas pendentes |
| Backup imediatamente antes | **`remoto-20261016-080835.sql`**; comparado com a cópia do ensaio (`remoto-20261016-065949.sql`): só a chave aleatória `\restrict` do `pg_dump` difere — nenhuma linha de dado |
| Dry-run | só `20261016092307_sessoes_de_aplicacao_e_instrumento_da_prova.sql` e `20261016092315_vista_obrigatoria_e_janela_de_sessoes.sql` |
| `db push --linked` | saída **0**, as duas na ordem |
| Migrations | **72 e 72** |
| Impressão digital | **`7ed10b8c068852f8678a4a42a98603b1`, 1.994 objetos, igual no local e no remoto** |
| Dado | lançamentos (avaliações, aulas, vistas, atividades) e a carga por turma (`vw_carga_horaria_turma`) com o **mesmo md5** antes e depois do push; 390 avaliações; a D-9: `vista_obrigatoria` em **PE, PM e PO**, `false` nos outros **8**; `avaliacao.janela_sessoes_dias` = **7**; `avaliacoes_juntar_sessao.editar` para **2** perfis (Admin, Encarregado); **0** sessões; **0** policies de `DELETE` |
| Production | `/login` e `/estilo` 200, `/inicio` e `/turmas` 307 — antes e depois do push, e depois do deploy do merge `21bba71` (#58, deploy `success`) |
| Ensaio local da D-9 | ⚠️ `dado_do_remoto` restaura `config_listas`, `config_parametros` e `perfil_permissao` **com o conteúdo do remoto**: antes do push, a cópia no local perdia a marca, a janela e o recurso. No ensaio, as partes de dado das duas migrations foram reaplicadas no local (idempotentes) — o que o `db push` faz no remoto. Depois do push, a cópia já os traz |

### A rodada da emenda (16/10/2026)

✅ **APLICADA NO REMOTO em 16/10/2026**, depois do merge do #58 (`21bba71`) e do deploy dele. Backup imediatamente antes
**`remoto-20261016-084037.sql`**; ensaio na cópia (local) gravado e com a 2ª rodada **0**; plano do remoto = plano do
local nas **dez** turmas; 1ª rodada **128** mudanças, 2ª **0**; catálogo igual; dados das **28** turmas iguais no local e
no remoto (`scripts/provas/dados_das_turmas.sql`, total `cc69b52c`); esquema `7ed10b8c…`, 1.994 objetos, igual nos dois.
Relatório com o antes/depois: `antes-depois/rodada-da-emenda-no-remoto.md`.

### As migrations da segunda decisão de 16/10/2026 (#61) — E-7 e D-10

Segunda decisão de Bernardo Villas Boas de 16/10/2026 (`aprovacoes-pendentes.md`, seção «16/10/2026 (tarde)»): a A4.7
com a planilha preenchida e *"banco recusando 1ª aplicação depois das sessões"*, publicados de ponta a ponta pelo rito.
A D-10 é dado decidido por ele (os 87 itens); o antes/depois por disciplina é `antes-depois/a47-antes-depois.md`.
⚠️ **O código da `main` antes do merge (`6524c63`, #60) continua compatível**: a E-7 não muda coluna nem assinatura, e
a RPC da tela (`public.juntar_como_sessao`) segue igual por fora.

| Passo | Medido |
|---|---|
| CI do ramo | verde nos três blocos sobre `8dc60a7` (run `38934329964`): 2.314 · 768 · 326 · 471 + 6 pulados |
| Reversão | `reversao-e7-e-a47.sql` numa base limpa: `dcd9297b…` (2.000) → **`7ed10b8c…` (1.994)**, a do remoto antes |
| Ensaio na cópia | `remoto-20261016-131901.sql` com a D-10 aplicada à mão (87 inseridos): a rodada gravada, a 2ª **0**, a junção da CAHO IV e a 3ª **0** |
| Remoto antes | `7ed10b8c068852f8678a4a42a98603b1`, 1.994 objetos; 72 migrations aplicadas e as 2 novas pendentes |
| Backup imediatamente antes | **`remoto-20261016-135852.sql`** |
| Dry-run | só `20261016153228_aplicacao_antes_das_sessoes_e_nucleo_de_juntar.sql` e `20261016153232_avaliacoes_do_curriculo_a47.sql` |
| `db push --linked` | saída **0**, as duas na ordem |
| Migrations | **74 e 74** |
| Impressão digital | **`dcd9297b1986b9a3a0a9a795ab5e7b12`, 2.000 objetos, igual no local e no remoto** |
| Dado | `scripts/provas/dados_das_turmas.sql`: as **29** turmas iguais antes e depois do push (total `717614ac`) |
| D-10 | **281** itens ativos (194 + **87**); a PT com `vista_obrigatoria = false`; 1 evento `MLOG-014-A47-…` |
| E-7 | o gatilho `trg_avaliacoes_aplicacao_antes_das_sessoes` adiado; **0** policies de `DELETE` |
| Production | `/login` e `/estilo` 200, as protegidas 307 — antes e depois do push, e depois do deploy do merge `3165a59` (#61, deploy `success`) |

### A rodada da A4.7 e a junção da CAHO IV (16/10/2026, tarde)

✅ **APLICADA NO REMOTO em 16/10/2026**, depois do merge do #61 (`3165a59`) e do deploy dele. Backup imediatamente antes
**`remoto-20261016-141227.sql`**; ensaio na cópia gravado (36) e com a 2ª rodada **0**; plano do remoto = plano do local
nas **dez** turmas; 1ª rodada **36** mudanças (23 provas e 13 sugestões), 2ª **0**; a junção da PP de 19/08 da CAHO IV à
PP 1 (`scripts/manutencao/juntar_como_sessao.py`: sessão 15, 40 TA, `juntada_por` nulo); 3ª rodada **0**; catálogo igual
em cada execução; dados das **29** turmas iguais no local e no remoto (`scripts/provas/dados_das_turmas.sql`, total
`3dc367f9`). ⚠️ A 1ª execução no remoto **parou na CAHO** (saída 6, *«plano do local × remoto: não é o mesmo plano»*)
porque eu tinha adiantado a cópia local com a junção — nada foi gravado nela; ela foi gravada sozinha, com cópia nova
(`remoto-20261016-145034.sql`). Relatório com o antes/depois: `antes-depois/rodada-da-a47-no-remoto.md`.

### A migration de dado das correções da lista (#63) — D-11 (16/10/2026, noite)

`20261016225643_correcoes_da_lista_16_10.sql`, **de dado** (decisões de Bernardo Villas Boas de 16/10/2026, noite:
*"Migration de DADO para os itens 5 e 7 a 12: aprovada aqui"*): as sugestões da planilha sem valor saem por exclusão
lógica (PEND-014-11); D1 (`DSAP-C-AP-HN-2026-L1111-V` → PM 1, «U.E. 1 a 3», vista de 27/08); D2
(`DSAP-C-AP-HN-2026-L1249-V` → PP 3). Nenhuma tabela, coluna, policy ou função nova.

| Passo | Resultado |
|---|---|
| CI do ramo | verde nos três blocos sobre `be68413` (run `38980372715`): 2.314 · 770 · 326 · 471 + 1 instável + 6 pulados (o instável, `avaliacoes-nas-telas.spec.ts:53`, passou isolado: o arquivo inteiro, 7 de 7 casos, com o :53 uma vez — `lista-16-10/e2e-avaliacoes-nas-telas.log`) |
| Ensaio | numa transação desfeita sobre a cópia local igual ao remoto — `remoto-20261016-145034.sql` com a rodada da CAHO e a junção da tarde refeitas (dados `3dc367f9`, iguais aos do remoto): 13 sugestões, D1 com a vista como sessão 2, D2. ⚠️ *O cabeçalho da D-11 cita `remoto-20261016-141227.sql`: é o artefato errado (regra 9.2), e o arquivo, já aplicado, não é editado; o 13 foi remedido no próprio remoto pelo evento da D-11. E o «em 6 turmas» da
mesma frase também está errado: são **5** (C-Ap-FR 3, C-Ap-HN 3, C-Espc-FR 2, C-Espc-HN 3, CAHO 2), medido na cópia
local igual ao remoto antes da D-11; em `remoto-20261016-141227.sql` eram só 2.* |
| Reversão | `reversao-d11.sql`, provada na mesma cópia, numa transação desfeita: a impressão das linhas tocadas `6b972dce…` → `765e2b4c…` → **`6b972dce…`** |
| Backup imediatamente antes | **`remoto-20261016-203431.sql`** |
| Dry-run | só `20261016225643_correcoes_da_lista_16_10.sql` |
| `db push --linked` | saída **0** |
| Migrations | **75 e 75**, nenhuma divergente |
| Impressão digital | **`dcd9297b1986b9a3a0a9a795ab5e7b12`, 2.000 objetos, igual no local e no remoto** (as 2.001 linhas), a mesma de antes: migration de dado |
| Efeito | **13** sugestões inativadas (`MLOG-014-D11-SUG-…`, «13 ativas»), **0** ativas sem valor depois; D1: PM 1, «U.E. 1 a 3», a marca `[CORRIGIDO NO SISTEMA …]` e a vista `DSAP-C-AP-HN-2026-L1182-S` (27/08, 6º tempo, 1 TA, Sala 01, instrutor 39) como sessão 2, com a `VST-000160` intacta; D2: PP 3 e a marca, com a `VST-000028` intacta; três eventos `MLOG-014-D11-…` |
| Production | depois do deploy do merge `2bc77a9` (`success`): `/login` e `/estilo` 200, `/inicio` e `/turmas` 307 |

### A rodada das correções da lista (16/10/2026, noite)

✅ **APLICADA NO REMOTO em 16/10/2026**, depois do merge do #63 e do deploy dele. Backup imediatamente antes
**`remoto-20261016-203720.sql`** (o `dado_do_remoto` completo, que restaurou a cópia no local); ensaio na cópia **246**
mudanças e 2ª **0**; plano do remoto = plano do local nas **dez** turmas; 1ª rodada **246**, 2ª **0**; a junção da prova
de 27/07 da CAHO XVII à TI 1 (CAHO-06, `SAP-000002`) **primeiro no remoto, depois na cópia** (a memória do tropeço de
16/10 à tarde); 3ª rodada **0** nos dois; execução final no remoto **0**; dados das **29** turmas iguais
(`scripts/provas/dados_das_turmas.sql`, total `655b2fd1`); impressão digital `dcd9297b…` nos dois. Relatório com o
antes/depois: `antes-depois/rodada-da-lista-16-10-no-remoto.md`.

### A migration de dado das respostas às dúvidas (#65) — D-12 (16/10/2026, noite)

`20261017023430_respostas_das_duvidas_16_10.sql`, **de dado** (decisão de Bernardo Villas Boas, 16/10/2026: *"Corrija por
migration de dado (aprovada aqui)"*): a `DSAP-C-AP-HN-2026-L1550-V`, fantasma de uma versão antiga da planilha (XIII), passa
a ser a PM 2 da VII; as vistas `VST-000160` e `VST-000243` vão para as provas delas; a vista de 27/08 da PM 1 passa a sessão 1.

| Passo | Resultado |
|---|---|
| CI do ramo | verde nos três blocos (runs `38995740999` e `38995745987`): 2.314 · ponta a ponta 471 + 1 instável + 6 pulados |
| Ensaio e reversão | na cópia local igual ao remoto, numa transação desfeita: impressão das linhas tocadas `030f69…` → `55ca24…` → **`030f69…`** com `reversao-d12.sql` |
| Backup imediatamente antes | **`remoto-20261016-235306.sql`** |
| Dry-run | só `20261017023430_respostas_das_duvidas_16_10.sql` |
| `db push --linked` | saída **0** |
| Migrations | **76 e 76**, nenhuma divergente |
| Impressão digital | **`dcd9297b…`, 2.000 objetos**, a mesma de antes (migration de dado) |
| Efeito | `L1550-V`: VII, 09/10, TA 1×2, item PM 2 (`AVC-000086`), «U.E. 4 a 6», a marca; `VST-000160` na `L1550-V` (sessão 1); `VST-000243` na `DSA-MV723OPT-V` (sessão 1); `L1182-S` sessão 1 da `L1111-V`; evento `MLOG-014-D12-…` |

### A rodada da dúvida 6 — o texto digitado em atividade (17/10/2026)

✅ **APLICADA NO REMOTO**, só na CAHO e na C-Espc-FR, depois do merge do #65 (`8e20583`). Backup imediatamente antes
**`remoto-20261016-235430.sql`** (o `dado_do_remoto` completo, que restaurou a cópia no local); ensaio na cópia **2**
mudanças e 2ª **0**; plano do remoto = plano do local nas duas (`2f5a610d…`, `fbd7e72c…`); remoto grava **2**, lidas de
volta linha a linha; 2ª **0**; dados das 29 turmas iguais (`scripts/provas/dados_das_turmas.sql`, total `beb49b51`);
impressão digital `dcd9297b…`, 2.000 objetos, nos dois.
