# Implementation Plan: Bloco 2 — turmas e o DSA no papel

**Branch**: `feat/BLOCO-2-turmas-e-dsa-no-papel` | **Date**: 19/10/2026 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/017-bloco-2-turmas-e-dsa/spec.md`, com o clarify de 19/10/2026 (21 decisões adotadas por padrão,
seção *Clarifications*), e a triagem medida (`triagem.md`).

**Status**: plan de 19/10/2026, pelo fluxo `/corrigir` — as dúvidas do plan (§10) foram decididas pela recomendação
e vão no lote final para a conferência de Bernardo Villas Boas. Emendado pelo analyze de 19/10/2026 (os 70 achados;
as decisões novas são a C-22 a C-30 da spec).

> **Leia junto:** `contracts/migrations.md` (o SQL das quatro migrations e a classificação de cada uma pela regra
> 9.4), `contracts/telas.md`, `research.md` (R-1 a R-12), `data-model.md`, `quickstart.md` (o roteiro de
> conferência) e `plano-de-aplicacao-no-remoto.md`.

> **Onde foi medido** (regra 9.2): código no ramo `feat/BLOCO-2-turmas-e-dsa-no-papel` em `c1f8d65`; dado no banco
> local restaurado de **`remoto-20261019-024230.sql`**.

## Summary

Um PR (pedido de 19/10/2026), quatro migrations:

- **M1 — a execução**: a tabela `ta_fora_do_dsa`, o recurso dela na matriz, o ramo novo nas três somas da CHD, a
  coluna `sem_posicao` na base da M1 da spec 016 (a `PEND-016-5`) e a coluna `disciplinas.nome_no_dsa`. **Acrescenta**:
  com a tabela vazia, as views devolvem o mesmo de antes, provado por impressão digital (SC-010).
- **M2 — a história da turma**: a trilha `turma_trocas_de_situacao` (anotada por gatilho, que não recusa nada), a
  função `trocar_situacao_da_turma` (troca e anota de uma vez) e o registro `turma_arquivamentos`, com a view do estado
  atual. **Acrescenta.**
- **M3 — o painel**: o parâmetro `turmas.aviso_inicio_dias` e a função `ocupacao_para_conflitos` (a ocupação da
  semana em lote; do que não se alcança, só a linha que cruza, anônima). **Acrescenta.**
- **M4 — a trava da turma arquivada no banco**: guarda nas gravações da turma e no `turmas`. ⚠️ **ALTERA → PORTÃO**:
  escrita e provada no PR, **não vai ao remoto** antes de Bernardo ver o desenho (`contracts/migrations.md` §M4).

O resto é `lib/dominio/` (regra pura com teste), Server Actions com Zod e a trava do servidor, e as telas: a ficha
(TA fora do DSA, histórico, arquivar), `/turmas` (painel, filtro de arquivadas), as listas sem a arquivada, o
cadastro de disciplina (*Nome no DSA*, e o defeito da técnica e do local) e o cartão do DSA nas três superfícies.

## Technical Context

**Language/Version**: TypeScript 5 `strict` (`exactOptionalPropertyTypes`), Next.js 16.3.3, React 19.2.8; SQL
PostgreSQL 17 (Supabase); Python 3.14 só nos scripts de prova.
**Primary Dependencies**: `@supabase/ssr`, `@supabase/supabase-js`, `nuqs`, Zod, shadcn/Radix — **nenhum pacote
novo**.
**Storage**: Supabase PostgreSQL (`cqhpfuaweoyglhtrckcp`, que serve preview e Production — AMBIENTE-1).
**Testing**: Vitest (unidade e invariantes/RLS com sessão real), pgTAP (estrutura e regra de banco), Playwright
(e2e por clique, na porta 3100).
**Target Platform**: Vercel (preview por ramo), navegador de mesa; papel A4 paisagem do DSA.
**Project Type**: aplicação web (Server Components + Server Actions).
**Performance Goals**: `/turmas` com o painel numa rodada só de `Promise.all` (sem `await` em laço); o conflito em
lote numa chamada.
**Constraints**: "hoje" é São Paulo (`hojeNaCiaara()`), passado por quem chama; **nenhuma** função nova usa
`current_date`, `now()` para data de fato, `current_timestamp` ou `localtimestamp` (D20); `with (security_invoker =
true)` em toda view recriada (gotcha 10); revoke de `delete`/`truncate` em tabela e view novas; zero policy de
`DELETE`.
**Scale/Scope**: 29 turmas, 172 disciplinas ativas, 3.736 registros de aula (cópia de 19/10/2026).

## Constitution Check

*GATE antes da Fase 0; reavaliado na §9.*

| Princípio | Como o plan o cumpre | Veredito |
|---|---|---|
| **I. Fidelidade à Fase 1** | Cada item cita a origem: D-COR-3/4/5 do plano de correções, `RF-INI-01` (andamento), `RF-DSA-05`/`RN-CRONOS-03` (situação do DSA), `RNF-COMP-01` (o papel), `RN-CONF-01` (conflito), `PEND-5a-2` (indicadores de turma) | ✅ |
| **II. Regras de negócio** | Arquivamento, histórico, separação da execução, painel, abreviação e ordem natural em `lib/dominio/`, com teste. Nenhuma regra do documento 04 muda (`RN-CONF-01` é **reusada**, não reescrita; `RN-DEG-02`: tudo alerta, nada bloqueia além das recusas pedidas) | ✅ |
| **III. Plataforma** | Sem pacote novo, sem ORM; Server Components; `"use client"` só nas folhas novas, declaradas na lista fechada de `fronteira-das-telas.test.ts` | ✅ |
| **IV. Histórico** | Trilha e arquivamento **só de acréscimo**, imutáveis inclusive para a `service_role`; TA fora do DSA desfeito por exclusão lógica; nenhum `DELETE` | ✅ |
| **V. Degradação e alerta** | Painel sem permissão diz que não leu (não "nenhum aviso"); RPC que falha não cai em silêncio na soma antiga; tudo que é norma é alerta | ✅ |
| **VI. Cirúrgico, por invariante** | Impressão digital das views antes × depois (SC-010), a guarda das três somas (pgTAP 135) mantida, casos que discriminam em pgTAP, RLS e e2e, reversão provada. ⚠️ **Quatro migrations num PR** — exceção ao *"uma fatia = uma migration coesa"*, porque o pedido é *"tudo num PR só"* (Complexity Tracking) | ⚠️ justificado pelo pedido |
| **VII. Configuração sobre constante** | O "30 dias" do painel é parâmetro operacional novo; o limite de caracteres do cartão é medida de **layout**, não norma (R-8) | ✅ |
| **VIII. Rastreabilidade** | Commits `db(BLOCO-2)`/`feat(BLOCO-2)`/`fix(BLOCO-2)`/`test(BLOCO-2)` e os de origem (`RF-INI-01`, `RN-CONF-01`, `RF-DSA-05`) quando houver; pgTAP nomeados por item | ✅ |
| **IX. Escopo** | Só o Bloco 2; o resto da limpeza de Cursos é do Bloco 3 (FR-006) | ✅ |
| **X. Paridade** | Classificação na §2 da spec; as regras novas são as decisões nominais D-COR-3/4/5 | ✅ |
| **XI. O banco é a fronteira** | As recusas de permissão vêm do banco (`42501`); a trilha é anotada por gatilho, não pela tela; o "só o Admin desarquiva" mora na policy do registro novo; a trava da turma arquivada vem do servidor agora e do banco depois do portão (M4) | ✅ |

**Gate:** passa, com a exceção do Princípio VI pelo pedido de um PR só.

## Project Structure

### Documentation (this feature)

```text
specs/017-bloco-2-turmas-e-dsa/
├── spec.md · triagem.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/migrations.md · contracts/telas.md
├── plano-de-aplicacao-no-remoto.md
├── checklists/requirements.md
└── tasks.md                       # /speckit-tasks
```

### Source Code (repository root)

```text
supabase/migrations/   M1 a M4 (nomes da CLI, carimbo UTC)
supabase/tests/        137_ta_fora_do_dsa.sql · 138_historico_e_arquivamento.sql · 139_painel_de_turmas.sql ·
                       140_trava_da_turma_arquivada.sql (M4)
lib/dominio/           ta-fora-do-dsa.ts · historico-da-turma.ts · arquivamento-da-turma.ts · painel-de-turmas.ts ·
                       nome-no-dsa.ts · (dsa/impressao.ts e dsa/planilha/catalogo.ts: ordem natural)
lib/validacao/         ta-fora-do-dsa.ts · turma.ts (observação, arquivar) · disciplina.ts (nome no DSA)
lib/acoes/             ta-fora-do-dsa.ts · turma.ts (troca por RPC, arquivar, desarquivar) · turma-arquivada.ts
                       (a trava do servidor) · e a chamada dela em dsa.ts, dia-parado.ts, atribuicao.ts,
                       disciplina.ts, avaliacoes-do-curriculo.ts, previsto-proens.ts, juntar-sessao.ts
app/(app)/turmas/      page.tsx · consulta.ts · PainelDeTurmas.tsx · FiltrosDeTurmas.tsx · TabelaDeTurmas.tsx
app/(app)/turmas/[turma]/  page.tsx · TrocarSituacao.tsx · ArquivarTurma.tsx · HistoricoDaTurma.tsx ·
                       TaForaDoDsa.tsx · DisciplinasDaTurma.tsx · SecaoDeAndamento
app/(app)/turmas/[turma]/dsa/  leitura.ts (o sem posição no acumulado) · página só de leitura na arquivada
app/print/dsa/         DocumentoDoDsa.tsx · documento.css (o cartão)
components/ciaara/     grade-dsa.tsx (o cartão da tela)
lib/dominio/dsa/planilha/  catalogo.ts · preenchimento.ts (o nome do cartão) · controle.ts
tests/unidade · tests/invariantes/rls · tests/e2e
```

**Structure Decision**: a estrutura do repositório (documento 24), sem pasta nova.

## 1. Um PR, quatro migrations, merge entre semanas

O pedido é *"tudo num PR só"*. A ordem de implementação é de dentro para fora; a de aplicação no remoto é **M1, M2,
M3** pelo rito (só acrescentam) e **M4 só depois** do *"aprovado"* de Bernardo ao desenho dela (regra 9.4, emenda de
19/10/2026). Como o PR muda o papel do DSA, o merge cai **entre semanas** (FR-009.1).

⚠️ **E o merge só depois de a M4 estar aplicada no remoto** pelo rito dela (C-30): se o desenho não for aprovado a
tempo, a M4 **sai deste PR** (vai a um PR próprio) antes do merge. Mesclar com a M4 não aplicada deixaria na `main`
uma migration mais nova que a última do remoto — e o próximo `supabase db push --linked` de **outro** ramo a levaria
junto, sem `--include-all` e **sem passar pelo portão** (achados 49 e 55). Por isso o rito de todo PR seguinte confere
no dry-run que a M4 não aparece, enquanto ela não estiver aplicada.

⚠️ **Como M4 fica fora do primeiro `db push`:** ela tem o carimbo mais novo; no rito, o arquivo dela sai da pasta
`supabase/migrations/` **só na cópia de trabalho** durante o dry-run e o push (sem commit), e o dry-run tem de listar
**só** M1, M2 e M3. Depois da aprovação, ela vai sozinha, sem `--include-all`, porque é a mais nova.

## 2. Domínio primeiro

| Módulo | O que decide | Teste |
|---|---|---|
| `ta-fora-do-dsa.ts` | a execução separada (*"N · X no DSA · Y fora do DSA"*) e o que conta até hoje | `tests/unidade/ta-fora-do-dsa.test.ts` |
| `historico-da-turma.ts` | junta trocas de situação e arquivamentos, mais recente primeiro, com o rótulo de cada um | `historico-da-turma.test.ts` |
| `arquivamento-da-turma.ts` | o estado atual (último evento), se pode arquivar/desarquivar, o aviso de não concluída e a frase da turma arquivada | `arquivamento-da-turma.test.ts` |
| `painel-de-turmas.ts` | os cinco indicadores e os três avisos sobre as linhas do recorte, e o *"não pude ler"* | `painel-de-turmas.test.ts` |
| `nome-no-dsa.ts` | o nome do cartão (o cadastrado ou a abreviação automática) e o limite | `nome-no-dsa.test.ts`, contra a fixture `tests/unidade/dados/disciplinas-ativas-2026-10-19.txt` (as 172 ativas da cópia de 19/10/2026 — o conjunto do SC-008) |
| `dsa/impressao.ts`, `dsa/planilha/catalogo.ts` | o quadro de CH pela ordem natural | `dsa/impressao.test.ts` (IV, V, IX, X) |

O conflito do painel **reusa** `detectarConflitos` (`lib/dominio/dsa/conflitos.ts`, `RN-CONF-01`): nenhuma segunda
implementação.

## 3. As migrations — resumo; o desenho inteiro está em `contracts/migrations.md`

| | Objetos | Regra 9.4 | Prova |
|---|---|---|---|
| **M1** | `ta_fora_do_dsa` (+ sequência `TFD-`, RLS com `turma_em_oferta` nas duas policies de escrita, recurso `ta_fora_do_dsa` na matriz); `vw_chd_por_fato` (ramo `fora_do_dsa` + coluna `sem_posicao` no fim); `vw_carga_horaria_turma` e `vw_disciplinas_execucao` (o ramo + `ta_fora_do_dsa` no fim; a segunda, também `nome_no_dsa` no fim); `disciplinas.nome_no_dsa` | acrescenta | pgTAP 137; o 010 (BRIEF §2.1) e o 105 (`_protegidas`, 44 policies em 22 tabelas) emendados; impressão digital das views antes × depois na cópia (SC-010) |
| **M2** | `turma_trocas_de_situacao` + gatilho em `turmas` que anota (sem recusa); `public.trocar_situacao_da_turma`; `turma_arquivamentos` + `vw_turmas_arquivadas` + `app.turma_arquivada` (`security definer`); os dois índices `(turma_id, ordem desc)` | acrescenta | pgTAP 138; o 010 emendado; RLS (Operador, Encarregado e Ajudante arquivam e não desarquivam) |
| **M3** | `config_parametros` `turmas.aviso_inicio_dias` = 30; `public.ocupacao_para_conflitos(p_de, p_ate)` (só a ocupação alheia que cruza, anônima) | acrescenta | pgTAP 139; RLS (porteiro; a linha alheia sem cruzamento não sai) |
| **M4** | gatilhos de recusa nas gravações da turma (turma por `to_jsonb`, OLD e NEW), guarda por valor em `turmas`, `nascer_disciplina_nas_turmas` sem a arquivada | **ALTERA → PORTÃO** | pgTAP 140 (enumeração no molde do 105, gravação comum passando nas 12); RLS com sessão real |

## 4. O fuso — "hoje" é São Paulo, nunca `current_date` (D20)

- O TA fora do DSA tem **data** (FR-001.1); quem decide se é futura é o Zod do servidor com `hojeNaCiaara()`. O banco
  não tem `CHECK` de data futura, porque isso exigiria o relógio do servidor (D20).
- `ocupacao_para_conflitos(p_de, p_ate)` recebe a semana; quem a calcula é `lib/dominio/` a partir de
  `hojeNaCiaara()`. Sem valor padrão.
- O painel recebe `hoje` por argumento; o parâmetro `turmas.aviso_inicio_dias` dá o N.
- Os pgTAP **137, 138 e 139** leem o corpo das funções novas da M1, da M2 e da M3 **sem comentário** (regra 9.1.1) e
  contam zero `current_date`/`now()`/`current_timestamp`/`localtimestamp`, com **uma isenção nominal e comentada**: o
  `now()` de `app.carimbar_arquivamento()`, que carimba o **instante** do arquivamento (não é data de fato; D20). O
  `now()` do carimbo de auditoria mora em `app.set_auditoria()`, que já existe, e no `default` das colunas `criado_em`,
  que não são corpo de função.

## 5. Telas — o caminho de clique (detalhe em `contracts/telas.md`)

- **Ficha da turma** (menu *Turmas* → linha): o aviso *"Turma arquivada"*; *Arquivar turma* / *Desarquivar*; o
  *Histórico da situação*; no andamento, a execução separada; em *Disciplinas*, o botão *TA fora do DSA* por linha e
  a lista dos registros.
- **`/turmas`** (menu *Turmas*): o painel no alto, o filtro *Mostrar arquivadas*, o selo *Arquivada* na linha.
- **Cadastro da disciplina** (menu *Disciplinas* → curso → disciplina → *Editar*): o campo *Nome no DSA*, com a
  prévia.
- **DSA** (ficha → *Abrir o DSA*): o cartão com o nome do DSA; a situação somando o sem posição e o fora do DSA;
  *Imprimir* → o papel.

## 6. Testes por item — chegando por clique

| Item | Unidade | pgTAP | RLS (sessão real) | E2E (por clique) |
|---|---|---|---|---|
| TA fora do DSA | separação, até hoje | 137: somas com fora, base = views, `sem_posicao`, recusas, `vw_ocupacao_ta` e `vw_instrutor_carga_anual` intactas, cópia de turma/disciplina igual à da linha, desfazer em curso inativo recusado | trio grava; **cada** perfil fora do trio `42501` ao gravar e **zero linhas** (status lido de volta) ao desfazer; leitura por `visualizacao`; Encarregado de Curso lê **zero** fora do alcance (com controle positivo); `anon` | `ta-fora-do-dsa.spec.ts`: registra → `/inicio`, `/turmas` (progresso e saldo), ficha (andamento, tabela, card de CHT, aba Avaliações), DSA; desfaz → continua listado como *desfeito* |
| `PEND-016-5` | — | 137: `sem_posicao` | — | `andamento-ate-hoje.spec.ts`: 8 % → **18 %** (o caso que discrimina); e o quadro de CH do papel, a CONTROLE e a CRONOS com os 15, a planilha contando **uma vez** |
| Observação | histórico, autor *"outra conta"* | 138: o gatilho anota toda troca; criar turma não anota; a trilha é imutável | quem lê a turma lê a trilha; ninguém escreve nela direto; `visualizacao` em `trocar_situacao_da_turma` → `42501` `turma_fora_do_alcance` | `turmas-situacao.spec.ts`: troca com observação → histórico, recarregado e no banco; como Operador, o autor *"outra conta"* |
| Arquivar | estado, aviso | 138: sequência de eventos, imutável; arquivar não muda a situação; a arquivada conta no limite e no veto | Operador, Encarregado e Ajudante arquivam e não desarquivam (`42501`); Admin desarquiva; arquivar fora do alcance `42501`; leitura zero fora do alcance | `turmas-arquivar.spec.ts`: arquiva → some das listas → filtro → ficha e DSA só leitura (imprimir e planilha seguem) → servidor recusa (inclusive ao Admin) → Admin desarquiva |
| Trava no banco (M4) | — | 140: enumeração das tabelas da turma, gravação comum passando nas 12, mover a linha recusado | gravação em turma arquivada recusada com `23514`/`turma_arquivada`; passa depois de desarquivar | (o e2e acima já prova a do servidor) |
| Painel | indicadores, avisos, *"não pude ler"* | 139: parâmetro, porteiro, janela nula recusada | só a ocupação alheia que cruza, anônima; a sem cruzamento **não** sai | `turmas-painel.spec.ts`: 5 números, 3 avisos (conflito com outra turma e dentro da própria), filtro, arquivada fora |
| Nome no DSA | abreviação contra as 172 ativas da fixture | 137: coluna nulável, `CHECK` de 1 a 60, `'   '` recusado | — | `dsa-cartao-do-papel.spec.ts`: 1 TA com os nomes mais longos → instrutor dentro do cartão, no papel e na tela (com e sem relógio), 1 página; nome cadastrado no papel com o quadro de CH inteiro |
| Edição da disciplina | Zod: L + 1 recusado com L na frase | — | — | `disciplinas.spec.ts`: editar só o nome no DSA preserva técnica e local (no banco); a prévia do cartão |
| Ordem natural | IV, V, IX, X | — | — | (unidade e a invariante planilha × papel) |

⚠️ Antes de todo e2e: `pnpm db:reset:limpo` (o local está com a cópia do remoto). ⚠️ E as amostras de RLS e de e2e
que arquivam são **idempotentes** (regra 9.1): o arquivamento é imutável, então cada execução usa turma de amostra
nova (rótulo gerado, nunca fixo) ou termina desarquivando pelo Admin antes da limpeza — provado rodando
`pnpm test:rls` e os e2e novos **duas vezes seguidas**, sem reset no meio (T065).

## 7. O rito do remoto

`plano-de-aplicacao-no-remoto.md`: backup citado → impressão digital das views na cópia (antes e depois, no local) →
dry-run listando **só M1, M2 e M3** (M4 fora da pasta, sem commit) → `supabase db push --linked` (o pedido de
permissão aparece para Bernardo) → conferência só de leitura (migrations, impressão digital do esquema,
`security_invoker`, os `grant`/`revoke` das funções, zero policy de `DELETE`, a comparação dos **dois retratos
datados** — gotcha 13 —, Production respondendo). M4 espera o desenho aprovado, e o merge espera a M4 (C-30).

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Recriar `vw_carga_horaria_turma` (com a dependente `vw_conformidade_tetos`) mudar coluna ou perder `security_invoker` | colunas antigas na mesma ordem, as novas no fim; `with (security_invoker = true)`; pgTAP 010 (I-13) e a impressão digital antes × depois |
| A guarda das três somas (pgTAP 135) reprovar com linha de fora do DSA | o ramo entra nas três; o 137 planta fora do DSA e confere a igualdade |
| O `set_eq` do pgTAP 010 reprovar com as três tabelas novas (*"tabela nova entra aqui DEPOIS de entrar lá"*) | emendar **antes** o `docs/BRIEF-v2.1.md` §2.1 (só o `.md`, registrando que o `.docx` não a recebeu) e **depois** o 010 (T010.1) |
| O pgTAP 105 reprovar com a `ta_fora_do_dsa` (toda tabela com `*_em_oferta` nas policies de escrita tem de estar em `_protegidas`, e com a condição em **todas** elas) | `turma_em_oferta` também na policy de desfazer (C-29) e a tabela em `_protegidas`, 42 → 44 policies em 22 tabelas (T010.1) |
| A trilha nova reprovar a guarda de ausência do pgTAP 101 (gatilho de `turmas` com `status` **e** `raise`) | o 101 lê o `prosrc` **com** comentário: o corpo de `anotar_troca_de_situacao` (que tem `status`) não contém `raise` em lugar nenhum, nem em comentário; e o guarda de `turmas` da M4 não contém `status` nem em comentário, mensagem ou *hint* |
| Uma Server Action de gravação esquecer a trava da arquivada | guarda de unidade que enumera as ações que gravam por turma e exige a chamada (com controle positivo); e a M4 no banco |
| Mudar o papel no meio da semana | merge entre semanas (FR-009.1) |
| O e2e de 1 TA passar sem o defeito (como o do quadro em duas colunas no Chromium) | medir antes, com o CSS de hoje, o cartão de 1 TA com o nome de 81 caracteres, e ver reprovar |

## 9. Constitution Check — reavaliação depois do desenho

Mantém o veredito: nenhuma violação nova; a única exceção é a do Princípio VI (quatro migrations num PR, pelo
pedido). A M4 respeita a regra 9.4: escrita, provada e parada antes do remoto.

### Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Quatro migrations num PR (Princípio VI) | O pedido de 19/10/2026 é *"tudo num PR só"*, e o fluxo `/corrigir` é um pedido = um PR | Um PR por migration contrariaria o pedido e quebraria a conferência única |
| Trilha da troca anotada por gatilho, com a observação passada pela transação | Só assim **toda** troca fica no histórico, inclusive a que não passa pela tela (FR-003.2) | Anotar só pela função deixaria a troca por `update` direto (ainda permitida pela RLS, e usada pelos testes e scripts) sem registro |

## 10. Dúvidas do plan — decididas pela recomendação (fluxo `/corrigir`), para a conferência no fim

- **P-1 · O TA fora do DSA guarda a linha da turma ou turma + disciplina?** → **A linha da turma**
  (`turma_disciplina_id`, FK `restrict`) **mais uma cópia** de `turma_id` e `disciplina_id` tirada dela — a cópia
  existe porque a RLS precisa de `turma_id`; o gatilho `guardar_ta_fora_do_dsa` a confere na criação e a torna
  imutável depois, e as views leem as duas colunas direto. ⚠️ É uma segunda fonte guardada só por gatilho, declarada
  aqui; o pgTAP 137 conta **zero** linhas cuja turma ou disciplina difira da linha. Alternativa: as duas colunas
  soltas, que deixariam gravar par sem linha; ou só a linha, com a RLS e as views fazendo a junção.
- **P-2 · A trilha da troca vem do gatilho ou da função?** → **Do gatilho** (toda troca), com a observação vinda da
  função pela transação. Alternativa: só a função, perdendo a troca por outro caminho.
- **P-3 · O arquivamento mora em colunas de `turmas` ou em registro próprio?** → **Registro próprio** de eventos com a
  view do estado atual (C-5). Alternativa: colunas em `turmas`, que exigiriam mexer na permissão de editar turma para
  o "só o Admin desarquiva".
- **P-4 · A trava da arquivada no banco é gatilho ou policy?** → **Gatilho** que recusa com frase própria (*"turma
  arquivada"*) no molde do guarda por valor do curso inativo, em vez de mais uma condição nas policies (que recusaria
  com o `42501` genérico de alcance). As duas mexem no que existe: portão de qualquer jeito.
- **P-5 · O conflito em lote é uma função nova ou a de hoje chamada por turma?** → **Função nova**, uma chamada para a
  semana inteira, `SECURITY DEFINER` com porteiro e, da ocupação alheia, **só a linha que cruza** uma alcançada,
  anônima (C-16 emendada); chamar `conflitos_da_semana` por turma seria uma ida ao banco por linha.
- **P-6 · O nome no DSA vem pela view ou por leitura à parte?** → **Pela view** `vw_disciplinas_execucao`, que já é a
  origem única do nome nas três superfícies e já é recriada na M1. Alternativa: ler `disciplinas` à parte.
- **P-7 · O limite do nome no cartão é um número só?** → **Um número só**, o do pior cartão (1 TA, compacto, seis
  dias), medido no papel (R-8). Alternativa: limite por tamanho de cartão, que faria a mesma disciplina mudar de nome
  de uma semana para a outra.
- **P-8 · O cartão de 1 TA da planilha?** → A planilha usa o **nome do DSA** e mantém a ordem do papel; o critério
  *"nenhum cartão corta o instrutor"* é medido no **papel e na tela** (FR-007.4). A célula de 34 pt da planilha não
  tem recorte por linha; ela fica registrada como limite conhecido.
