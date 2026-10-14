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

### A rodada do PR 6

[pendente]
