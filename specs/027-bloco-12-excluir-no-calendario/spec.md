# Spec 027 — Bloco 12: excluir no Calendário (exclusão lógica, com alerta de impacto)

**Pedido:** Bernardo Villas Boas, 27/10/2026, pelo `/corrigir` — *"Calendário (Atividades → Calendário): o Admin não
consegue excluir NENHUM lançamento."* **Decisão que o pedido traz** (Bernardo, 26/10/2026), registrada como **D-COR-7**:
no Calendário, excluir **não é bloqueado** (nem com DSA publicado, nem com aula no dia); o Admin exclui qualquer linha,
ativa ou inativa, depois de um **alerta com o impacto**; excluir é **lógico** (regra 4). Ela **substitui, para a linha do
calendário, a D-COR-6** (24/10/2026: *"Excluir feriado só habilitado sem semana salva/publicada ligada"*, permanente).
**Ramo:** `fix/BLOCO-12-excluir-no-calendario`, a partir da `main` `3a60386`. **O papel do DSA não muda**: o merge não
espera virada de semana. **Banco:** uma migration que **só acrescenta** — segue com o rito do remoto (regra 9.4, emenda de
19/10/2026).

## 1. O problema, em uma frase

O *Excluir* da aba Calendário fica desabilitado em todas as 32 linhas de 2026 com a dica *"tem registros: use
Desativar"*, porque a regra da D-COR-6 conta como "registro" **qualquer lançamento salvo de qualquer turma na semana
ISO da data** — e, para a linha de todas as turmas, toda semana do ano tem algum.

## 2. A causa, medida (só leitura, local recriado do remoto: `remoto-20261027-061453.sql`)

**O caminho do *Excluir* até o banco**

1. A página lê o estado do ícone numa ida só: `app/(app)/atividades/page.tsx:91-100` chama
   `rpc("impedimentos_de_exclusao_dos_feriados")` e monta o estado por `estadoDaExclusaoDoFeriado`.
2. O banco: `public.impedimentos_de_exclusao_dos_feriados` → `app.impedimentos_de_exclusao_dos_feriados`
   (`supabase/migrations/20261024063555_exclusao_permanente_dos_cadastros.sql:492-507`) → **`app.registros_do_feriado`**
   (`:392-462`).
3. Com qualquer chave devolvida, `estadoDaExclusao` (`lib/dominio/exclusao-permanente.ts:79-89`, a linha `:88`) dá `liberada: false`
   e a dica **`DICA_DO_FERIADO_COM_REGISTROS = "tem registros: use Desativar"`** (`lib/dominio/exclusao-de-feriado.ts:20`).
4. O ícone desenhado desabilitado com essa dica: `components/ciaara/exclusao-permanente.tsx:103-115`, chamado pelo painel
   em `app/(app)/atividades/PainelDoCalendario.tsx:265-279`. A Server Action `excluirLinhaDoCalendario`
   (`lib/acoes/calendario.ts:224-244`) chama `excluir_feriado` (`:512-571` da migration), que confere tudo de novo e
   recusa com `23503 feriado_com_historico`.

**O que a verificação conta** (`app.registros_do_feriado`, `:392-462`): na **semana ISO** da data, para as turmas que a
linha alcança (as escolhidas ativas; **sem nenhuma, TODAS** — `:417`), (a) evento `salvo`/`publicado`/`alteracao_publicada`
na trilha do DSA (`:421-427`), **ou** (b) **qualquer lançamento salvo e vivo** — aula, atividade (a global alcança
todas), prova, sessão, vista (`:428-456`) —, mais a rede de FKs (`:459`).

**Por que recusa TODO lançamento:** 31 das 32 linhas de 2026 alcançam **todas** as turmas, e desde a RP-8 (Bloco 9)
**todo lançamento anterior nasceu salvo**; com 5 turmas lançando o ano inteiro, toda semana tem lançamento salvo. Medido:
**32 de 32** linhas presas; só **2** têm evento na semana (**1** com publicação) — **30** estão presas só pelo critério
(b). **O 12/11/2026** (`FER-000023`, *"Nossa Senhora Aparecida (feriado nacional)"*, da v2.0, **inativo desde
26/10/2026**): semana ISO 46 (09 a 15/11) **sem evento nenhum** — nada publicado —, e **14 aulas salvas** na semana
(C-Ap-FR 2026: 4 · C-Espc-FR 2026: 5 · CAHO 2026: 5), **2 no próprio dia** (`DSAP-C-ESPC-FR-2026-L2611-A` e
`DSAP-CAHO-2026-L2670-A`, da planilha). A regra não olha a situação da linha: a inativa é presa igual.

**O banco permite apagar?** `feriados` tem **zero** policy de `DELETE` (policies: `feriados_ler`, `feriados_criar`,
`feriados_editar`); a única FK que aponta para ela é `feriado_turma.feriado_id` (`on delete restrict`). A exclusão física
da D-COR-6 só existe dentro de `app.excluir_feriado` (`SECURITY DEFINER`).

**Regra de linha antiga (como a `resp_dinamico_tem_chave` da RSP-000001)?** **Não há.** As restrições de `feriados` são
`feriados_ano_bate_data`, `feriados_ano_valido`, a chave e a FK do tipo; `trg_feriados_tipo` só dispara em
`UPDATE OF tipo_parada_id`, e confere só o tipo informado. **26** das 32 linhas vêm da v2.0, **18** nunca editadas; o
12/11 já foi editado (desativado) sem recusa. Provado na cópia, com `rollback`: excluir o `FER-000023` e o `FER-000002`
(v2.0, ativo, nunca editado) passou.

**Feriado inativo já deixa de contar?** **Sim, em tudo.** Toda leitura que conta filtra `status = 'ativo'`:
`vw_dias_parados_turma` (`f.status = 'ativo'`), o saldo do Início (`app/(app)/inicio/page.tsx:190`), de `/turmas`
(`app/(app)/turmas/page.tsx:132`) e da ficha (`app/(app)/turmas/[turma]/page.tsx:180`), o DSA
(`app/(app)/turmas/[turma]/dsa/leitura.ts:551`), a recusa de lançar no dia e o EI automático (`lib/acoes/dsa.ts:396`,
`:1154`), os avisos (`app/(app)/avisos/leitura.ts:135`, `:210`). Só a **lista do Calendário** lê as inativas
(`app/(app)/atividades/calendario.ts:64-72`, D-10 da spec 023), para poder reativá-las.

### Os *Excluir* do módulo Atividades — quando cada um bloqueia (medido na `main`)

| Onde | Ação | Quem vê | Quando bloqueia |
|---|---|---|---|
| Calendário · linha (feriado, licença, recesso, ponto facultativo, dia inteiro parado) | **Excluir** (permanente, D-COR-6) | `calendario.criar`: Admin e Encarregado | Com qualquer chave de `registros_do_feriado`: evento do DSA **ou lançamento salvo de qualquer turma alcançada na semana ISO**. Na base: **32 de 32** presas |
| Calendário · linha | Desativar / Reativar | `calendario.editar`: Admin e Encarregado | Nunca por registro; só pela permissão (RLS `feriados_editar`) |
| Calendário · parada global de parte do dia | Desfazer (inativa) | `calendario.editar` | Nunca por registro; só pela permissão. Na base: **0** paradas globais |
| Aba Atividades (lista) | — | quem lê atividades | Não tem *Excluir*: é só leitura; a atividade se exclui no DSA da turma |

## 3. Paridade ou novidade (regra 3)

- **Defeito** 🐛: o Excluir que nunca libera (item 1). A regra da D-COR-6 tal como foi implementada não deixa sair
  **nenhuma** linha errada — o motivo que Bernardo dá para a D-COR-7.
- **Regra nova, decidida nominalmente** (D-COR-7, 26/10/2026): excluir lógico, sem bloqueio, com alerta de impacto, só
  o Admin. **Contenção de escopo (regra 2):** o calendário é da CIAARA-11.
- **Documento 04:** nenhuma regra muda. A regra 4 do `CLAUDE.md` **fica mais forte** para a linha do calendário: a exceção
  de exclusão permanente que a D-COR-6 abriu deixa de ser usada pela tela (a função continua no banco — `PEND-027-1`).

## 4. Requisitos

### FR-001 — Excluir é exclusão lógica
- **FR-001.1**: Excluir marca a linha **inativa** e **excluída** (quem e quando: `excluido_por`, `excluido_em`), e grava o
  rastro em `exclusoes_registradas` (tabela só de acréscimo, D-B1) com o retrato da linha, das turmas escolhidas e do
  impacto. **Nada é apagado** — sem `DELETE`, sem policy de `DELETE`.
- **FR-001.2**: A linha excluída **some da lista do Calendário**, que mostra as inativas (não há outro *"mostrar
  inativos"* na aba): a lista lê só `excluido_em is null`.
- **FR-001.3**: A linha excluída **deixa de contar em tudo** (dias úteis, saldo, capacidade, DSA, recusa de lançar,
  avisos): ela fica `inativo`, e toda leitura que conta já filtra `ativo` (§2).
- **FR-001.4**: A linha excluída **não se altera mais** com sessão (nem reativar): não há lixeira nem restaurar.
- **FR-001.5**: Excluir **não impede** cadastrar outra linha na mesma data (não há unicidade por data).
- **FR-001.6**: Excluir **nunca é bloqueado** por lançamento no dia nem por semana do DSA publicada, e vale para a linha
  ativa e para a inativa, inclusive a vinda da v2.0.

### FR-002 — O alerta de impacto
- **FR-002.1**: Clicar em *Excluir* abre um diálogo de alerta que **calcula na hora** (ao abrir) e lista: as **turmas
  atingidas**; as **aulas, atividades e avaliações** que contam naquele dia, por turma (e as atividades de todas as
  turmas); as **semanas do DSA publicadas** que contêm o dia, com a turma, a semana do curso (*"Semana N de T"*), as
  datas e a versão (original ou ALT N); e **se a data já passou**.
- **FR-002.2**: Botões **"Cancelar"** e **"Excluir mesmo assim"**. Sem vínculo (nenhuma turma atingida, nenhum
  lançamento no dia, nenhuma semana publicada), o alerta só pede a confirmação, e o botão é **"Excluir"**.
- **FR-002.3**: Sem o cálculo do impacto (falha de leitura), o alerta diz que não foi possível calculá-lo e **não**
  oferece a exclusão às cegas (`RN-DEG-01`).

### FR-003 — Semana publicada atingida (RP-4)
- **FR-003.1**: Excluir **não republica** e não toca a versão publicada (o retrato em `dsa_eventos_da_semana` fica
  igual). O DSA da semana passa a avisar *"alterado desde a publicação"* — o aviso que já compara o documento de hoje
  com o retrato (`lib/dominio/dsa/publicacao.ts:112`, `app/print/dsa/retrato.ts`).

### FR-004 — Só o Admin exclui
- **FR-004.1**: O *Excluir* aparece **só para o Admin**. O Encarregado (o outro perfil com `calendario.*`) continua com
  *Editar* e *Desativar/Reativar*, sem o *Excluir*; o Operador não vê a aba Calendário (já era assim).
- **FR-004.2**: A chamada direta é recusada **pelo banco**: a função de exclusão e a do impacto têm porteiro de Admin
  (`coalesce(app.eh_admin(), false) is not true` → `42501`), e um gatilho recusa marcar a exclusão por `UPDATE` direto
  de quem não é Admin. O banco não muda.

## 5. Clarifications — adotadas por padrão, Bernardo confere no fim

| # | Dúvida | Escolha (adotada por padrão) | Alternativa |
|---|---|---|---|
| D-1 | Como marcar a exclusão lógica | Colunas novas `excluido_em`/`excluido_por` + `status = 'inativo'` (deixa de contar sem mudar view nenhuma) | Um terceiro valor de status (mudaria enum e toda leitura) |
| D-2 | Onde fica a auditoria | Na própria linha (quem e quando, mais `editado_*`) **e** no rastro `exclusoes_registradas`, com `modo: 'logica'` e o impacto daquela hora | Só na linha |
| D-3 | A linha excluída pode voltar? | Não, com sessão: o gatilho recusa toda alteração dela (sem lixeira, sem restaurar). Script sem sessão não é travado (RP-5) | Deixar o Admin reativá-la |
| D-4 | Turmas atingidas | As alcançadas pela linha (escolhidas, ou todas) que estão **ativas ou planejadas**, não EAD, não arquivadas, com a data no período (na semipresencial, na etapa presencial cadastrada) — **mais** as que têm lançamento no dia ou semana publicada | Só as `ativa` (o critério de `vw_dias_parados_turma`), que deixaria de fora a planejada, cujo saldo também muda |
| D-5 | Que lançamentos contar | Os que **contam** (RP-8: salvos e vivos): aula, atividade, avaliação (1ª aplicação, sessões, vista); a atividade de todas as turmas à parte | Contar também o rascunho |
| D-6 | Como citar a semana publicada | *"Semana N de T (dd/mm a dd/mm/aaaa) — original"* ou *"— ALT N"*, a última versão publicada da semana ISO que contém o dia | Só o número ISO da semana |
| D-7 | "A data já passou" | Data **antes de hoje** em São Paulo (`hojeNaCiaara()`); hoje não passou | Contar hoje como passado |
| D-8 | Botão sem vínculo | Sem vínculo = nenhuma turma atingida, nenhum lançamento no dia (nem de todas as turmas), nenhuma semana publicada: *"Excluir"*; com vínculo, *"Excluir mesmo assim"* | *"Excluir mesmo assim"* sempre |
| D-9 | Linha inativa | O alerta diz que ela **já não conta** (excluir não muda dias úteis, saldo nem DSA) e ainda lista o que há no dia | Esconder o impacto da inativa |
| D-10 | Parada global de parte do dia | Continua com *Desfazer*, que já a tira da lista e de toda conta; não ganha *Excluir* | Excluir também nela (coluna nova em `dias_parados`) |
| D-11 | A exclusão física da D-COR-6 (`excluir_feriado`) | Fica no banco **sem consumidor** na tela; revogar o `execute` é mexer em permissão (portão 9.4) → `PEND-027-1` | Revogar já, parando no portão |
| D-12 | Digitar o código para confirmar | **Não** — o pedido é alerta + confirmação; a exclusão é lógica e fica na auditoria | Manter o código digitado da D-COR-6 |
| D-13 | Sem o cálculo do impacto | O alerta avisa e não oferece excluir (FR-002.3) | Deixar excluir sem o impacto |
| D-14 | A mensagem depois de excluir | *"Linha excluída do calendário. Ela fica na auditoria."*, acima da lista (FR-014 da spec 023) | — |
| D-15 | A faixa de paradas do DSA (*Desfazer* do feriado) | Fica como está (o pedido é só o Calendário) | — |
| D-16 | O registro da decisão | **D-COR-7** no plano de correções e em `docs/correcoes/padroes-de-tela.md`, ao lado da D-COR-6, que continua valendo para a turma | — |
| D-17 | Quem é "o Admin" na tela | O perfil `admin` da sessão (`usuarioDaSessao().perfil`); quem decide é o banco (`app.eh_admin()`) | Uma permissão nova na matriz (mudaria `perfil_permissao`: portão) |

## 6. Banco — uma migration que só acrescenta

`supabase/migrations/20261027123023_exclusao_logica_no_calendario.sql`:
1. `feriados.excluido_em timestamptz` e `feriados.excluido_por uuid`, **nuláveis**, com duas restrições **só sobre
   elas** (`feriados_exclusao_completa`: as duas juntas; `feriados_excluida_inativa`: excluída é inativa) — as 32 linhas
   têm as duas nulas e passam.
2. `trg_feriados_exclusao` (`app.guardar_exclusao_no_calendario`): com sessão, a linha não nasce excluída, só o Admin
   marca a exclusão, e a excluída não se altera mais. **Nenhuma escrita de hoje passa a ser recusada** — ela não toca as
   colunas novas, e não há linha excluída.
3. `app.impacto_da_exclusao_do_feriado(uuid)` e `app.excluir_linha_do_calendario(uuid)`, `SECURITY DEFINER`, porteiro de
   Admin, com os espelhos `public.*` `SECURITY INVOKER`.

**Nada existente muda**: nenhuma view, função, policy, privilégio ou dado. Rito do remoto em
`plano-de-aplicacao-no-remoto.md`; reversão em `reversao.sql`.

## 7. Os casos que discriminam (DoD 8)

- **Excluir libera o dia**: na cópia, `vw_dias_parados_turma` da CAHO 2026 conta **FR 19** dias e, com o `FER-000002`
  excluído, **18** (com `rollback`). No e2e, a ficha da turma mostra **um dia útil a mais** depois de excluir um feriado
  futuro dela, e o DSA perde a marca do feriado.
- **Só o Admin**: o mesmo `UPDATE` de `excluido_em` passa com a sessão do Admin e é recusado (`42501`) com a do
  Encarregado, que **continua** podendo desativar a mesma linha (controle positivo).
- **A linha da v2.0**: `origem_migracao_v1` preenchida e `editado_em` nulo — a forma que a `resp_dinamico_tem_chave`
  recusava na RSP-000001 — é excluída sem recusa (pgTAP 152).
- **Semana publicada**: antes de excluir, o DSA não acusa nada; depois, acusa *"alterado desde a publicação"*, com o
  retrato publicado igual byte a byte.

## 8. Fora de escopo / pendências

- **`PEND-027-1`** — *a exclusão física da D-COR-6 fica no banco sem consumidor*: `public.excluir_feriado` e
  `impedimentos_de_exclusao_dos_feriados` não são mais chamadas pela tela, e seguem alcançáveis por RPC direta com
  `calendario.criar` (Admin e Encarregado) — a física só passa em linha sem registro nenhum. Revogar o `execute` é
  migration que altera permissão (portão 9.4).
- Nada muda na exclusão de turma, curso, instrutor, usuário nem nas outras abas de Atividades (só medidas, §2).
- As três pendências registradas para o próximo bloco (`PEND-025-5`, `PEND-026-1`, `PEND-026-2`) **não cabem** neste:
  são da carga, do saldo pelo regime «desde» e do seletor de instrutor.

## 9. Verificação no local (27/10/2026)

Medida sobre o ramo, na base limpa do `pnpm db:reset:limpo` (o que o CI roda):

- **Unidade:** 213 arquivos, **2.842** casos (2.828 + os 14 de `exclusao-no-calendario.test.ts`, vistos reprovar antes —
  o módulo não existia). Três guardas reprovaram e foram atendidas sem excepcionar regra: a folha nova declarada em
  `fronteira-das-telas`, a página declarada em `perfil-em-portugues` (o `admin` é condição, não texto), e a recusa nova
  `linha_do_calendario_excluida` traduzida.
- **pgTAP:** 72 arquivos, **1.147** asserções (1.120 + as 27 do `152`). O `152` visto reprovar sem a migration (a
  reversão aplicada dentro de transação desfeita: as 6 de estrutura em `not ok`, e o resto abortado).
- **RLS e invariantes:** 31 arquivos, **486** passados (476 + 10) e 1 pulado.
- **Ponta a ponta tocados:** `excluir-no-calendario.spec.ts`, `calendario.spec.ts` e `bloco-10.spec.ts` — **19 de 19**,
  2 processos. A suíte inteira fica com o CI (regra do Bloco 11).
- **Defeitos deliberados**, cada um pego pelo caso que o prova e desfeito em seguida:
  (a) o gatilho sem o porteiro de Admin → só o caso *DISCRIMINA* da RLS reprovou (9 de 10 seguiram verdes);
  (b) a lista sem o filtro de `excluido_em` → o SC-001 reprovou em *"some da lista"* (`toHaveCount(0)`, recebeu 1);
  (c) o *Excluir* para quem tem `calendario.criar` → o SC-003 reprovou no Encarregado (`toHaveCount(0)`, recebeu 1).
- `db:tipos:conferir` sem diferença.
