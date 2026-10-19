# Progresso do implement — spec 017 (Bloco 2)

*Aberto em 19/10/2026. Todo número aqui nomeia o artefato contra o qual foi medido (regra 9.2); o que ainda não foi
medido fica `[pendente]` (regra 9.3).*

## T001 — linha de base do ramo

- `pnpm verificar` sobre `c1f8d65` + os commits de docs: `[pendente]` (contagem de unidade e arquivos).

## T002 — medições na cópia do remoto

**Artefato:** o banco **local** (`supabase_db_ciaara-11-v2-1`) restaurado de **`remoto-20261019-024230.sql`**
(19/10/2026, 02:42, o backup do rito do PR #69), com as M1–M3 desta spec aplicadas por cima. Medido em 19/10/2026 pela
sessão principal, só de leitura (`psql` no contêiner). O remoto **não** foi lido de novo.

| Medida | Valor | Consulta (resumo) |
|---|---|---|
| Disciplinas no total / ativas | **175** / **172** | `count(*)`, `count(*) filter (where status = 'ativo')` em `disciplinas` |
| Nomes ativos com mais de 30 / 40 / 50 / 60 caracteres | **61** / **31** / **20** / **9** | `length(nome_disciplina)` nas ativas |
| O maior nome ativo | **81** caracteres | `max(length(nome_disciplina))` nas ativas |
| Turmas por situação | planejada **4** · ativa **8** · concluída **12** · cancelada **5** (**29**) | `group by status` em `turmas` |
| Planejada ou ativa sem janela completa | **1** | `status in ('planejada','ativa') and (data_inicio is null or data_termino is null)` |
| Iniciando em [19/10, 18/11/2026], não cancelada | **0** | `status <> 'cancelada' and data_inicio between '2026-10-19' and '2026-11-18'` |
| Linhas de turma ativas sem instrutor ativo, em turma planejada ou ativa | **52** | `turma_disciplina` ativa sem `turma_disciplina_instrutor` ativo; a spec conta as **turmas** nessa condição: **10** |
| `PEND-016-5` — fato de CHD ativo sem posição que some TA | **0** (aulas, sessões e avaliações vivas); **102** vistas ativas sem `ta_inicial`, todas com 0 TA | medido no specify (spec, Edge Cases), no mesmo banco |

**A fixture do SC-008:** os **172** nomes das ativas, `select nome_disciplina from disciplinas where status =
'ativo' order by nome_disciplina`, guardados fora do git e versionados pela sessão principal como
`tests/unidade/dados/disciplinas-ativas-2026-10-19.txt` — o conjunto contra o qual a T046 prova o *172 de 172*.

⚠️ **Por que os números da `triagem.md` são outros** (*mais de 30: 60; mais de 40: 30; mais de 60: 10*): ela mediu
`scripts/etl/dados/disciplinas-do-banco.txt`, o retrato do remoto de **26/09/2026**, com **175** linhas e **sem filtro
de status** — outro artefato, outro conjunto. Os dois estão certos para o que mediram; o que vale para o SC-008 é o
de 19/10/2026, acima.

## T044/T045 — o cartão de 1 TA e o limite L

**Artefato:** `tests/e2e/dsa-cartao-do-papel.spec.ts`, banco local limpo, build de produção da suíte (porta 3100),
19/10/2026. A amostra é **a semana cheia de seis dias no maior regime real** — 9 tempos (`regime_tempos` na cópia
`remoto-20261019-024230.sql`: 7 em 16 vigências, 8 em 17, **9 em 7**, 0 em 4) —, **54 aulas de 1 TA**, os nomes mais
longos do catálogo com os códigos mais largos (XIII a XXXVIII), um *Nome no DSA* cadastrado e um legado de 60
caracteres, e um instrutor sem nome de guerra curto.

- **Com o CSS de `c1f8d65` (vista reprovar):** *"o DSA dos cartões de 1 TA passou de uma página"* — sem recorte, os
  cartões crescem com o nome e empurram a semana para a segunda folha.
- ⚠️ **E A PRIMEIRA CORREÇÃO TAMBÉM REPROVAVA, medida antes de ser dada por boa:** título numa linha e
  `overflow: hidden` no cartão, mas o pé na mesma linha dos dados. Com a semana cheia (medido em 10 tempos), **os 60
  cartões** saíram com o instrutor **fora da caixa**: cartão de 34,75 px, o instrutor começando 17 px abaixo do topo e
  ocupando 19,6 px — o recorte o escondia. A correção final separa a linha de dados (TA · local · T/E) do instrutor e
  fixa a ordem de quem cede: o tópico até zero, depois os dados, depois o título; o instrutor nunca.
- **Com a correção final:** os 54 cartões com o instrutor inteiro dentro da caixa, **uma página**, o título recortado
  em no máximo 1 px (arredondamento), e o nome inteiro no quadro de CH.
- **L = 22** (R-8): no título do cartão do código *XXXVIII* (29,9 px; Barlow 6,8 pt, 9,07 px; 117 px para o nome), o
  maior prefixo que cabe numa linha de cada um dos 172 nomes ativos que não cabem inteiros
  (`tests/unidade/dados/disciplinas-ativas-2026-10-19.txt`); L é o menor. A prova o refaz a cada execução e reprova se
  o domínio divergir. Com L = 22, **SC-008: 172 de 172**. Os marcadores da spec (FR-007.1), do `data-model.md`, do
  contrato e do checklist foram trocados.
- **Na tela, o defeito não se reproduz, e a prova o diz:** a grade é uma tabela com `min-w-36` e largura automática, e
  `truncate` (sem quebra) faz a coluna **alargar até caber** o nome — medido: o instrutor com 466 px de largura e
  `scrollWidth = clientWidth`, numa janela de 1.024 px. O `break-words` da correção deixa a coluna estreita, e o caso
  da tela fica como guarda (instrutor visível e não cortado em todo cartão), não como prova que discrimina.
- O caso de `dsa-grade.spec.ts` que esperava *"Disciplina do percurso do DSA"* (29 caracteres) no cartão passou a
  esperar a abreviação, *"Disciplina perc. DSA"* — o comportamento novo (FR-007.2), com o nome inteiro no rótulo.

## T038 — os leitores de lista de turma (C-24)

Enumeração por `grep` de `from("turmas")` e `from("vw_carga_horaria_turma")` em `app/` e `lib/` (19/10/2026), e a
decisão de cada leitor:

| Leitor | Decisão | Por quê |
|---|---|---|
| `app/(app)/turmas/page.tsx` | **some**, volta com *Mostrar arquivadas*, com o selo | D-COR-5 |
| `app/(app)/inicio/page.tsx` (panorama, tetos, vistas) | **some** | C-24; tetos e vistas seguem o panorama |
| `app/(app)/cursos/[curso]/page.tsx` (lista, seletor, pré-seleção, *teto excedido*) | **some**; o **limite** conta todas | C-24 e C-7 |
| `app/(app)/atividades/page.tsx` (filtro de turma) | **some** | C-24 |
| `app/(app)/disciplinas/consulta.ts` (cascata) | **some da cascata**; a turma pedida pelo código continua lida | a mesma função monta a ficha da turma |
| `app/(app)/admin/salas/page.tsx` | **fica** | histórico (C-24) |
| `app/(app)/cursos/[curso]/editar/page.tsx` | **fica** | limite e proteção de vigência contam a arquivada (C-7) |
| `app/(app)/cursos/[curso]/turmas/nova/page.tsx` | **fica** | o limite de turmas por ano conta a arquivada (C-7) |
| ficha, DSA, impressão, planilha, avaliações da turma, ações | **não é lista** | leitura de UMA turma; a arquivada abre só para ler |

## T063 — defeitos deliberados

- **M3, a agenda alheia inteira** (o corpo de antes do achado 53, aplicado por `psql` no banco local limpo, 19/10/2026):
  `tests/invariantes/rls/bloco-2.test.ts` reprovou **1 de 27** — exatamente *"a ocupação alheia que NÃO cruza a do
  operador não sai"* —, e voltou a **27 de 27** com o corpo da migration. Desfeito por `pnpm db:reset:limpo`.
- **`PEND-016-5`, o painel sem o sem posição** (o acumulado do DSA lendo `[]` no lugar de `dados.semPosicao`, 19/10/2026):
  `tests/invariantes/planilha-igual-ao-papel.test.ts` reprovou **2 de 7** — *"D95: painel 25 × base da CHD 40"*, a
  CONTROLE e a situação junto —, e voltou a **7 de 7** com a leitura.
- **O CSS antigo do cartão** (f): ver §T044/T045 — reprovou *"passou de uma página"*; e a primeira correção, sem a
  ordem de quem cede, reprovou com o instrutor fora da caixa nos 60 cartões de 10 tempos.
- **(a) o ramo fora do DSA tirado da `chd_executada` de `vw_carga_horaria_turma`** (`create or replace` no banco local
  limpo com a M4, a coluna `ta_fora_do_dsa` mantida; o plantio confere que casou, e recusa se não): o **137** reprovou
  os casos **4** (*"chd e cht somam os 5"*) e **6** (*"P-3 · sem corte, a base = vw_carga_horaria_turma em toda turma,
  com TA fora do DSA"*).
- **(b) a trilha só pela função** (o gatilho `trg_turmas_anotar_troca` retirado): o **138** reprovou os casos **2**
  (*"a troca por UPDATE DIRETO também fica na trilha"* — o caso que discrimina), **3** e **4**.
- **(c) desarquivar aberto a quem edita a turma** (`alter policy turma_arquivamentos_criar`): o RLS de
  `bloco-2.test.ts` reprovou os três casos que discriminam — **Operador, Encarregado e Ajudante passaram a
  desarquivar** (`expected undefined to be '42501'`) — e o controle positivo do Admin caiu em cascata (a turma já
  estava desarquivada).
- **(d) uma Server Action sem a trava** (`registrarTaForaDoDsa` sem `recusaSeTurmaArquivada`): a guarda
  `turma-arquivada-trava.test.ts` reprovou **1 de 22** — *"registrarTaForaDoDsa grava sem conferir a turma
  arquivada"* — e voltou a **22 de 22**.
- **(g) a M4 sem uma tabela** (`drop trigger trg_registros_aula_turma_arquivada`): o **140** reprovou os casos **1**
  (a enumeração, *"Results differ beginning at row 6"*), **8** (a aula na arquivada) e **11** (mover a aula para fora
  da arquivada); e o caso com sessão real da M4 em `bloco-2.test.ts` reprovou (*"expected undefined to be '23514'"*).

Todos desfeitos por `pnpm db:reset:limpo` (os de banco) ou pela cópia do arquivo (o de código), 19/10/2026.

## T021/T022 — o que a prova contra o banco mediu

- **A faixa *sem posição* das abas de semana da planilha NÃO soma** (19/10/2026, banco local limpo, semente do DSA
  mais 10 TA sem posição na W16 e 5 TA fora do DSA): com o sem posição da pasta deixado fora de `FORA_TEMPOS` — o
  desenho que o achado 3 do analyze propunha para não contar duas vezes —, a CONTROLE deu **30 × 40** do painel, a
  CRONOS **32 × 42** da base, e o rodapé da IMPRESSÃO ficou **10 abaixo do papel** em quatro semanas. O risco era o
  oposto do previsto: não dobrava, sumia. Todo fato sem posição foi para `FORA_TEMPOS`, e as três batem.

## T065 — `verificar:tudo` e a suíte rodada duas vezes

- Contagens: `[pendente]`.
- `pnpm test:rls` (a pasta `tests/invariantes` inteira), duas vezes seguidas sem reset, sobre o banco local limpo
  (`pnpm db:reset:limpo`, 19/10/2026, com M1–M3 corrigidas pelo analyze): **362 de 362 em 20 arquivos** na 1ª e
  **362 de 362** na 2ª. pgTAP no mesmo banco: **862 em 59 arquivos**, verde.
- **Com a M4** (banco local limpo, 19/10/2026): pgTAP **880 em 60 arquivos**, verde; `tests/invariantes` **372 em 20
  arquivos** (371 passados e 1 pulado, o de antes), com o caso da M4 verde depois de corrigido o rascunho
  (`turmaDe.get`). ⚠️ O 140 nasceu vermelho por dois defeitos do TESTE, não da M4: a comparação do nome do gatilho
  sem `collate` e a atribuição sem o `codigo` composto (`23502`, que a tabela não gera — `turma_disciplina_instrutor`
  não tem `DEFAULT` no código).
- Os e2e novos, duas vezes seguidas: `[pendente]`.

## T023, T031, T042, T051 e T057 — as provas de ponta a ponta das US1 a US4 e da edição da disciplina

**Artefato:** o banco local limpo (`pnpm db:reset:limpo`, 19/10/2026), o build de produção da suíte (porta 3100) e
`--workers=2`. Arquivos: `tests/e2e/ta-fora-do-dsa.spec.ts` (novo, 2 casos), `tests/e2e/turmas-arquivar.spec.ts`
(novo, 1), `tests/e2e/turmas-painel.spec.ts` (novo, 2), `tests/e2e/turmas-situacao.spec.ts` (+2 casos, 6 no arquivo) e
`tests/e2e/disciplinas.spec.ts` (+1, 14 no arquivo); a semente comum é `tests/e2e/bloco-2-de-teste.ts`.

| Rodada | Os cinco arquivos (25 casos) |
|---|---|
| 1ª, sobre a base recém-limpa | **24 de 25** — reprovou `turmas-painel.spec.ts:130`, defeito do TESTE: o aviso de conflito da T2 diz *"com T1"*, e filtrar por texto casava as duas linhas (violação de modo estrito). O filtro passou a ser pelo link da turma dona do aviso; o arquivo isolado deu **2 de 2** |
| 2ª, sem reset | **25 de 25** |
| 3ª, sem reset, logo em seguida | **25 de 25** — a idempotência da regra 9.1 |

**Sem objeto, medido no código em 19/10/2026 (e não inventado):**
- o *card de CHT* da T023 — a ficha não tem card de CHT; ele é a `PEND-014-9`;
- a *aba Avaliações +5* da T023 — a aba mostra avaliações do currículo, não a CH executada da disciplina;
- *"o campo ausente na criação"* da T051 — nenhuma tela monta `FormularioDeDisciplina` no modo de criação
  (`criarDisciplina` só é chamada por ele, e ele só é montado na edição, em `DetalheDaDisciplina`); a regra está no
  código (`editando ? … : null`).

**Onde ficou provado o *"8 TA fora do DSA no dia e o teto do dia continua aceito"* (FR-001.6):** no banco. O DSA tira
o teto e a cascata do dia de `vw_ocupacao_ta` (`lib/acoes/dsa.ts`, as três leituras), e o pgTAP 137 prova que o TA
fora do DSA não gera linha nela (*"FR-001.6 · o TA fora do DSA não ocupa TA na grade"*); a ponta a ponta confere que a
grade não ganha cartão.

**Defeitos de tela achados por estas provas:** nenhum. As cinco telas passaram como escritas; a única reprovação foi do
próprio teste (acima).
