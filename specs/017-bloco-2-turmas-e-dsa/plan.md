# Implementation Plan: Bloco 2 — turmas e o DSA no papel

**Branch**: `feat/BLOCO-2-turmas-e-dsa-no-papel` | **Date**: 19/10/2026 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/017-bloco-2-turmas-e-dsa/spec.md`, com o clarify de 19/10/2026 (21 decisões adotadas por padrão,
seção *Clarifications*), e a triagem medida (`triagem.md`).

**Status**: plan de 19/10/2026, pelo fluxo `/corrigir` — as dúvidas do plan (§10) foram decididas pela recomendação
e vão no lote final para a conferência de Bernardo Villas Boas.

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
  semana em lote, anônima para o que não se alcança). **Acrescenta.**
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

⚠️ **Como M4 fica fora do primeiro `db push`:** ela tem o carimbo mais novo; no rito, o arquivo dela sai da pasta
`supabase/migrations/` **só na cópia de trabalho** durante o dry-run e o push (sem commit), e o dry-run tem de listar
**só** M1, M2 e M3. Depois da aprovação, ela vai sozinha, sem `--include-all`, porque é a mais nova.

## 2. Domínio primeiro

| Módulo | O que decide | Teste |
|---|---|---|
| `ta-fora-do-dsa.ts` | a execução separada (*"N · X no DSA · Y fora do DSA"*) e o que conta até hoje | `tests/unidade/ta-fora-do-dsa.test.ts` |
| `historico-da-turma.ts` | junta trocas de situação e arquivamentos, mais recente primeiro, com o rótulo de cada um | `historico-da-turma.test.ts` |
| `arquivamento-da-turma.ts` | o estado atual (último evento), se pode arquivar/desarquivar, o aviso de não concluída e a frase da turma arquivada | `arquivamento-da-turma.test.ts` |
| `painel-de-turmas.ts` | os cinco indicadores e os três avisos sobre as linhas do recorte | `painel-de-turmas.test.ts` |
| `nome-no-dsa.ts` | o nome do cartão (o cadastrado ou a abreviação automática) e o limite | `nome-no-dsa.test.ts`, contra o catálogo inteiro de `scripts/etl/dados/disciplinas-do-banco.txt` |
| `dsa/impressao.ts`, `dsa/planilha/catalogo.ts` | o quadro de CH pela ordem natural | `dsa/impressao.test.ts` (IV, V, IX, X) |

O conflito do painel **reusa** `detectarConflitos` (`lib/dominio/dsa/conflitos.ts`, `RN-CONF-01`): nenhuma segunda
implementação.

## 3. As migrations — resumo; o desenho inteiro está em `contracts/migrations.md`

| | Objetos | Regra 9.4 | Prova |
|---|---|---|---|
| **M1** | `ta_fora_do_dsa` (+ sequência `TFD-`, RLS, recurso `ta_fora_do_dsa` na matriz); `vw_chd_por_fato` (ramo `fora_do_dsa` + coluna `sem_posicao` no fim); `vw_carga_horaria_turma` e `vw_disciplinas_execucao` (o ramo + `ta_fora_do_dsa` no fim; a segunda, também `nome_no_dsa` no fim); `disciplinas.nome_no_dsa` | acrescenta | pgTAP 137; impressão digital das views antes × depois na cópia (SC-010) |
| **M2** | `turma_trocas_de_situacao` + gatilho em `turmas` que anota (sem recusa); `public.trocar_situacao_da_turma`; `turma_arquivamentos` + `vw_turmas_arquivadas` + `app.turma_arquivada` | acrescenta | pgTAP 138; RLS (Operador arquiva, não desarquiva) |
| **M3** | `config_parametros` `turmas.aviso_inicio_dias` = 30; `public.ocupacao_para_conflitos(p_de, p_ate)` | acrescenta | pgTAP 139; RLS (porteiro) |
| **M4** | gatilhos de recusa nas gravações da turma, guarda por valor em `turmas`, `nascer_disciplina_nas_turmas` sem a arquivada | **ALTERA → PORTÃO** | pgTAP 140 (enumeração no molde do 105) |

## 4. O fuso — "hoje" é São Paulo, nunca `current_date` (D20)

- O TA fora do DSA tem **data** (FR-001.1); quem decide se é futura é o Zod do servidor com `hojeNaCiaara()`. O banco
  não tem `CHECK` de data futura, porque isso exigiria o relógio do servidor (D20).
- `ocupacao_para_conflitos(p_de, p_ate)` recebe a semana; quem a calcula é `lib/dominio/` a partir de
  `hojeNaCiaara()`. Sem valor padrão.
- O painel recebe `hoje` por argumento; o parâmetro `turmas.aviso_inicio_dias` dá o N.
- O pgTAP de cada função nova lê o corpo **sem comentário** e conta zero `current_date`/`now()`/
  `current_timestamp`/`localtimestamp` (o `now()` do carimbo de auditoria é de **instante**, não de data de fato, e
  mora no gatilho de auditoria, que já existe).

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
| TA fora do DSA | separação, até hoje | 137: somas com fora, base = views, `sem_posicao`, recusas | trio grava; Operador e Encarregado de Curso `42501`; `anon` | `ta-fora-do-dsa.spec.ts`: registra → `/inicio`, `/turmas`, ficha, DSA; desfaz |
| `PEND-016-5` | — | 137: `sem_posicao` | — | `andamento-ate-hoje.spec.ts`: 8 % → **18 %** (o caso que discrimina) |
| Observação | histórico | 138: o gatilho anota toda troca; a trilha é imutável | quem lê a turma lê a trilha; ninguém escreve nela direto | `turmas-situacao.spec.ts`: troca com observação → histórico, recarregado e no banco |
| Arquivar | estado, aviso | 138: sequência de eventos, imutável | Operador arquiva e não desarquiva (`42501`); Admin desarquiva | `turmas-arquivar.spec.ts`: arquiva → some de 4 listas → filtro → ficha e DSA só leitura → servidor recusa → Admin desarquiva |
| Trava no banco (M4) | — | 140: enumeração das tabelas da turma | gravação em turma arquivada recusada com o código certo | (o e2e acima já prova a do servidor) |
| Painel | indicadores e avisos | 139: parâmetro e porteiro | ocupação alheia anônima | `turmas-painel.spec.ts`: 5 números, 3 avisos, filtro |
| Nome no DSA | abreviação contra o catálogo inteiro | 137: coluna e `CHECK` | — | `dsa-cartao-do-papel.spec.ts`: 1 TA com os nomes mais longos → instrutor dentro do cartão, 1 página; nome cadastrado nas três superfícies |
| Edição da disciplina | — | — | — | `disciplinas.spec.ts`: editar só o nome no DSA preserva técnica e local (no banco) |
| Ordem natural | IV, V, IX, X | — | — | (unidade e a invariante planilha × papel) |

⚠️ Antes de todo e2e: `pnpm db:reset:limpo` (o local está com a cópia do remoto).

## 7. O rito do remoto

`plano-de-aplicacao-no-remoto.md`: backup citado → impressão digital das views na cópia (antes) → dry-run listando
**só M1, M2 e M3** (M4 fora da pasta, sem commit) → `supabase db push --linked` (o pedido de permissão aparece para
Bernardo) → conferência só de leitura (migrations, impressão digital do esquema, `security_invoker`, zero policy de
`DELETE`, impressão digital das views **igual** à de antes, Production respondendo). M4 espera o desenho aprovado.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Recriar `vw_carga_horaria_turma` (com a dependente `vw_conformidade_tetos`) mudar coluna ou perder `security_invoker` | colunas antigas na mesma ordem, as novas no fim; `with (security_invoker = true)`; pgTAP 010 (I-13) e a impressão digital antes × depois |
| A guarda das três somas (pgTAP 135) reprovar com linha de fora do DSA | o ramo entra nas três; o 137 planta fora do DSA e confere a igualdade |
| A trilha nova reprovar a guarda de ausência do pgTAP 101 (gatilho de `turmas` com `status` **e** `raise`) | a função do gatilho não recusa nada e não tem a palavra no corpo |
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
  (`turma_disciplina_id`, FK `restrict`), e as views juntam a turma e a disciplina por ela. Alternativa: as duas
  colunas soltas, que deixariam gravar par sem linha.
- **P-2 · A trilha da troca vem do gatilho ou da função?** → **Do gatilho** (toda troca), com a observação vinda da
  função pela transação. Alternativa: só a função, perdendo a troca por outro caminho.
- **P-3 · O arquivamento mora em colunas de `turmas` ou em registro próprio?** → **Registro próprio** de eventos com a
  view do estado atual (C-5). Alternativa: colunas em `turmas`, que exigiriam mexer na permissão de editar turma para
  o "só o Admin desarquiva".
- **P-4 · A trava da arquivada no banco é gatilho ou policy?** → **Gatilho** que recusa com frase própria (*"turma
  arquivada"*) no molde do guarda por valor do curso inativo, em vez de mais uma condição nas policies (que recusaria
  com o `42501` genérico de alcance). As duas mexem no que existe: portão de qualquer jeito.
- **P-5 · O conflito em lote é uma função nova ou a de hoje chamada por turma?** → **Função nova**, uma chamada para a
  semana inteira, `SECURITY DEFINER` com porteiro e a ocupação alheia anônima; chamar `conflitos_da_semana` por turma
  seria uma ida ao banco por linha.
- **P-6 · O nome no DSA vem pela view ou por leitura à parte?** → **Pela view** `vw_disciplinas_execucao`, que já é a
  origem única do nome nas três superfícies e já é recriada na M1. Alternativa: ler `disciplinas` à parte.
- **P-7 · O limite do nome no cartão é um número só?** → **Um número só**, o do pior cartão (1 TA, compacto, seis
  dias), medido no papel (R-8). Alternativa: limite por tamanho de cartão, que faria a mesma disciplina mudar de nome
  de uma semana para a outra.
- **P-8 · O cartão de 1 TA da planilha?** → A planilha usa o **nome do DSA** e mantém a ordem do papel; o critério
  *"nenhum cartão corta o instrutor"* é medido no **papel e na tela** (FR-007.4). A célula de 34 pt da planilha não
  tem recorte por linha; ela fica registrada como limite conhecido.
