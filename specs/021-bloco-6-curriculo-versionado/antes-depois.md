# Antes × depois — currículo versionado (spec 021, PR 1)

## Rodada 7 — o rito do remoto da M4 e da M5, em 21/10/2026 (autorizado na conferência do PR #82)

O PR #82 com o CI verde nos três blocos sobre `c1cb088` (run `39690026463`: 1.022 pgTAP em 66 arquivos · 544 de ponta a
ponta, 2 instáveis que passaram na repetição, 7 pulados).

1. **Backup:** `remoto-20261021-195622.sql`.
2. **A remedição sobre ESSE backup** (restaurado com as 90 migrations do remoto e o código da `main`): a impressão do
   currículo **idêntica, 26 de 26**, antes e depois da M4 e da M5 (e igual à da cópia das 18:01); o retrato das telas das
   29 turmas **byte a byte idêntico**.
3. **Dry-run** listando só `20261021124838` e `20261021201915`; **`db push`** saída 0.
4. **Conferência só de leitura no remoto:** **92 e 92** migrations, nenhuma só de um lado; a impressão digital do esquema
   **igual nos dois bancos, linha a linha** (2.391 linhas, 0 diferenças; **`89a3f08e…`, 2.390 objetos**); **0** policies
   de `DELETE`; uma view só sem `security_invoker`, a exceção nominal `vw_instrutor_dados_pessoais` (PII-1); os **7**
   gatilhos da RC-6, os **2** da M5, a FK da turma para o regime do currículo e a policy do PDF por currículo; **6** linhas
   do trio na matriz; 24 cursos, 24 currículos, 29 turmas, **0** regimes nomeados (nenhum sem currículo) e a trilha vazia;
   Production respondendo (`/login` e `/estilo` 200, as protegidas 307).
5. ⚠️ **O instável novo do CI, isolado:** `disciplinas.spec.ts:163` (*"partindo do endereço com a linha aberta, fecha e
   REABRE"*) reprovou uma vez sob carga (a linha fechada depois do `goto`) e passou na repetição; **isolado aqui, 3 de 3**
   (`PEND-021-3`). A primeira tentativa de isolar reprovou no **login**, e a causa era a máquina: um pedaço de JavaScript
   da `.next` sumido e um arquivo apagado no commit (`SeletorDeCurriculo.tsx` na pasta antiga) reposto pelo OneDrive com a
   data de antes do `git mv` — removido, build refeito, e o caso passou.

## Rodada 6 — os ajustes da conferência do PR #82: a M4 e a M5, em 21/10/2026 (SC-006)

Base: **`remoto-20261021-180100.sql`** (cópia nova do remoto, 24 cursos, 29 turmas, 175 disciplinas, 3.736 aulas),
restaurada com as **90** migrations do remoto (as 89 da `main` mais a M3). Antes = o código da `main` (`ae4e595`, o que a
Production serve). Instrumentos: `scripts/provas/impressao_digital_do_curriculo.sql`, `retrato-das-telas.test.ts` e
`retrato-das-paginas.spec.ts`, cada build num passo separado e a navegação com `--workers=1`.

0. **Antes da M4, no remoto, só leitura:** **24 cursos → 24 currículos** (o 1 de cada, 0 além dele), **0 turmas em
   currículo de outro curso**, 0 sem currículo, 29 turmas, **0 regimes nomeados**, 0 turmas com regime, trilha vazia.
1. **O esquema de partida** igual ao do remoto: `df8716a9…`, 2.367 objetos.
2. **O código da `main` com a M4 e a M5 aplicadas** (o que a Production mostra entre o `db push` e o merge): a impressão
   do currículo **idêntica, 26 de 26**; o retrato das telas (planilha, `.xlsx`, extras e o DSA de cada semana das 29
   turmas) **byte a byte idêntico**; o retrato das páginas **idêntico nas 229**.
3. **O código do ramo com a M4 e a M5** (pelo `db reset` com as 92 migrations — o mesmo esquema da aplicação à mão,
   `89a3f08e…`, **2.390 objetos**): a impressão do currículo **idêntica**; as telas **byte a byte idênticas**; as páginas,
   229 de 229 mais **96 novas** (a aba *Currículo* e as três partes de *Editar curso* dos 24 cursos), e **nenhum número
   mudou** — toda diferença é estrutura:
   - saem da página do curso as ações: *Nova disciplina* (24), *Novo regime* (24) e os campos do arbitrado nas
     avaliações (10 cursos) — ajuste 1;
   - a lista de abas ganha *Currículo* — ajuste 2;
   - *Editar curso* troca propósito, duração e PDF do cadastro pela seção *Currículo* (seletor, *Novo currículo*, as
     quatro partes, o formulário do currículo com os mesmos campos e o envio do PDF) — ajuste 3;
   - o que já vinha do PR 2 (rodada 4): a coluna *Currículo* e as turmas arquivadas na *Grade*, *"Segue o Currículo 1
     (vigência …)"* nas 58 páginas de turma.
   - **As mesmas linhas com número em outro lugar:** de cada aba *Disciplinas* e *Avaliações*, **0** linhas com número
     faltam na consulta da aba *Currículo* e na parte *Disciplinas e avaliações* de *Editar curso*; de *Atividades*, 0
     na consulta; de *Horários*, faltam só as **29** linhas das vigências do regime padrão, que ficam do curso (D-39).
4. **A reversão (`reversao-pr2.sql`, M5 → M4 → M3), com dado:** volta a **2.331 objetos, `5d794f43…`** (o esquema do
   PR 1), com a impressão do currículo igual; reaplicadas as três, volta a `89a3f08e…`. ⚠️ A primeira execução **parou
   num erro de sintaxe**: o gerador cortara o comentário de `public.criar_curriculo` no primeiro `;` de dentro do texto.
   O erro desfez a transação inteira (esquema conferido igual depois dele); o comentário foi copiado inteiro da M3.

## Rodada 5 — o rito do remoto do PR 2: SÓ a M3, em 21/10/2026

O PR #82 com o CI verde nos três blocos sobre `99bde95` (run `39614223539`: 1.008 pgTAP · 438 invariantes e RLS · 544 de
ponta a ponta, 7 pulados, nenhum instável). **A M4 ficou de fora** (regra 9.4: ela altera — a matriz, o gatilho que recusa
escrita hoje aceita e a policy do balde): fora da pasta de migrations durante o rito, e de volta depois.

1. **Backup:** `remoto-20261021-113521.sql`.
2. **A remedição sobre ESSE backup** (restaurado com as 89 migrations da `main`): a impressão do currículo **idêntica, 26
   de 26**, antes e depois da M3; o esquema **2.331 → 2.367 objetos** (`df8716a9…`); nenhum currículo com PDF a apontar
   (0 de 24).
3. **Dry-run** listando só `20261021124836`; **`db push`** saída 0.
4. **Conferência só de leitura no remoto:** **90 e 90** migrations (sem a M4, que segue só no ramo); a impressão digital
   do esquema **igual nos dois bancos, linha a linha** (2.368 linhas, 0 diferenças; `df8716a9…`, 2.367 objetos); a trilha
   `correcoes_de_curriculo` vazia, com RLS, 1 policy de leitura, os 2 gatilhos de imutabilidade e **sem** `INSERT` para
   `authenticated`; as 4 funções novas; **nada** da M4 (0 linhas na matriz, 0 gatilhos); `security_invoker` nas três views;
   **0** policies de `DELETE`; Production respondendo (`/login` e `/estilo` 200, as protegidas 307).

## Rodada 4 — o PR 2 sobre o mesmo backup, em 21/10/2026

Base: `remoto-20261021-090802.sql` restaurado com as 87 migrations da `main` de antes do PR 1; depois, as **quatro**
migrations do Bloco 6 (`supabase migration up --local`) e o código do ramo do PR 2. Antes = as medidas da rodada 3.

- **A impressão do currículo: idêntica, 26 de 26.**
- **O retrato das telas: byte a byte idêntico** — 29 turmas, 212 semanas: planilha, `.xlsx`, extras e o DSA de cada
  semana. O DSA, o papel e a planilha lendo o currículo DA TURMA não mudaram número nenhum.
- **O retrato das páginas: 229 de 229**, e **toda diferença é o que o PR 2 acrescenta** — nenhum número mudou:
  - as **144** abas dos 24 cursos ganham a barra do currículo (*"Currículo 1 (vigência 2026) — vigente"*, *Editar
    currículo*, *Novo currículo*, *Mostrar currículos arquivados*);
  - a aba *Grade* ganha a coluna **Currículo**, e as turmas **arquivadas** passam a aparecer, marcadas (RC-9) — por isso 5
    cursos que só têm turma arquivada deixam de dizer *"Este curso ainda não tem turma"*;
  - as **58** páginas de turma (ficha e avaliações) ganham *"Segue o Currículo 1 (vigência 2026)"*;
  - as **24** *Editar curso* perdem propósito, duração e o PDF e ganham o caminho *"Editar o Currículo 1 (vigência
    2026)"* (RC-5, D-32).
- **O esquema:** 2.331 → **2.375 objetos** (`e9cb3ebc…`).
- **A reversão (`reversao-pr2.sql`), com dado:** volta a **2.331 objetos, `5d794f43…`**, com **0** linhas de diferença
  contra o esquema do PR 1 (o do remoto), e a impressão do currículo igual à do antes; reaplicadas as duas migrations, o
  esquema volta a `e9cb3ebc…`.

## Rodada 3 — o rito do remoto do PR 1, em 21/10/2026

O PR #81, com o CI verde nos três blocos sobre `fd5359c` (runs `39593720034` e `39593772606`: 975 pgTAP · 425 invariantes
e RLS · 540 e 541 de ponta a ponta, com 7 pulados; os instáveis `avaliacoes-nas-telas.spec.ts:54`, da `PEND-014-7`, e
`andamento-ate-hoje.spec.ts:86` — tempo de navegação de 10 s numa rodada, verde de primeira na outra sobre o MESMO commit).

1. **Backup:** `remoto-20261021-090802.sql` (`--somente-copia`, 4.161 KB).
2. **A remedição sobre ESSE backup**, restaurado no local com as 87 migrations da `main` (uma cópia de trabalho da `main`
   e outra do `fd5359c`, as duas fora do OneDrive):
   - a impressão do currículo **idêntica, 26 de 26** (`curriculo-antes` × `curriculo-depois`);
   - o retrato das telas **byte a byte idêntico** (29 turmas, 212 semanas: planilha, `.xlsx`, extras e o DSA de cada
     semana);
   - o retrato das páginas **byte a byte idêntico** (229 páginas);
   - o esquema: **2.237 → 2.331 objetos**, `5d794f43…` — o mesmo da rodada 2;
   - a ligação: 24 currículos 1 (vigência 01/01/2026), a RC-1 igual em 24 de 24, 2 por competências, 0 com PDF; 175
     disciplinas, 30 limites, 118 regras e 29 turmas no currículo 1, nenhuma sem currículo; 10 currículos em uso;
     `security_invoker` nas três views; 0 policies de `DELETE`.
3. **Dry-run** listando só `20261021030049` e `20261021030050`; **`db push`** saída 0.
4. **Conferência só de leitura no remoto:** **89 e 89** migrations, nenhuma só de um lado; a impressão digital do esquema
   **igual nos dois bancos, linha a linha** (2.332 linhas, 0 diferenças; `5d794f43…`, 2.331 objetos); a ligação idêntica à
   do item 2 (24 · 24 · 2026-01-01 · 24 de 24 · 175 · 30 · 118 · 29 · 0 · 0); `security_invoker` nas três views; **0**
   policies de `DELETE`; Production respondendo (`/login` e `/estilo` 200, as protegidas 307).
5. **Merge** por squash: `ae4e595` (#81). O ramo do PR 1 foi apagado, local e remoto.

## Rodada 2 — o PR 1 revisto pelas RC-1 a RC-12, medido em 21/10/2026

**Base:** uma cópia **nova** do remoto, `remoto-20261021-074644.sql` (modo completo do `dado_do_remoto`, só leitura no
remoto), restaurada no local com as **87** migrations da `main`.
**Antes:** o código da `main` `fa372c2` (uma cópia de trabalho separada, fora do OneDrive).
**Depois:** as duas migrations revistas (`supabase migration up --local`) e o código do ramo.
**Hoje fixo** em 20/10/2026 nas funções "até uma data" e no retrato das telas; as páginas, no relógio do dia (as duas
rodadas no mesmo dia).

### 1. A impressão digital do que o currículo alimenta — IDÊNTICA (26 de 26)

Instrumento: `scripts/provas/impressao_digital_do_curriculo.sql`, agora com dois objetos a mais: as cinco colunas da
RC-1 em `cursos` e as regras de avaliação (`avaliacoes_planejadas`, 118 linhas). `diff` vazio, e de novo vazio depois de
reverter e reaplicar as migrations.

### 2. O retrato das telas — IDÊNTICO

`tests/invariantes/retrato-das-telas.test.ts`: para **cada uma das 29 turmas**, o insumo da planilha, o `.xlsx` inteiro, os
extras da impressão e o DSA de **cada uma das 212 semanas** com lançamento. Antes (código da `main`) × depois (código do
ramo): **0 diferenças**.

### 3. O retrato das páginas — IDÊNTICO (novo nesta rodada)

`tests/e2e/retrato-das-paginas.spec.ts` (Playwright, servidor de produção, sessão de Admin): **229 páginas** — o Início, o
catálogo, a lista de turmas, as **seis abas** de cada um dos 24 cursos (Sobre o Curso, Grade, Disciplinas, Avaliações,
Atividades, Horários), a **edição** de cada curso (com o valor de cada campo) e a ficha e as avaliações de cada uma das 29
turmas. Antes × depois: **0 diferenças**.
⚠️ **O instrumento enxergava o que mudou de lugar**: o rótulo "Propósito" está nas 24 abas Sobre; as 24 telas de edição
trazem 72 campos de propósito e duração (50 preenchidos) — e todos saíram iguais.

### 4. A ligação

- **24 currículos 1**, um por curso, todos com vigência **01/01/2026** (D-2: o ano mais antigo que o sistema conhece de cada
  curso — todas as turmas começam em 2026 e todo curso foi cadastrado em 2026).
- O conteúdo da RC-1 igual ao do curso em **24 de 24** (e a M2 se desfaz se não for); **2** currículos por competências;
  **0** com PDF (nenhum foi carregado no remoto).
- **175** disciplinas, **30** limites, **118** regras de avaliação e **29** turmas no currículo 1.
- **10** currículos seguidos por turma com lançamento (os da RC-6, no PR 2).
- Ninguém carimbado como editor: **0** `editado_em` novos nas seis tabelas, **0** linhas novas na trilha do arbitrado.
- `security_invoker` nas três views; **0** policies de `DELETE`.
- Esquema: **2.237 → 2.331 objetos** (`1ba390aa…` → `5d794f43…`).

### 5. A reversão — PROVADA COM DADO

`reversao.sql` aplicado na cópia com os 24 currículos ligados: o esquema volta a **2.237 objetos, `1ba390aa…`** (o da `main`
e do remoto), a impressão do currículo à do antes, e os comentários das colunas do curso aos originais.
⚠️ **A primeira execução reprovou, e o roteiro foi corrigido**: faltava `drop function app.versao_ativa_do_curso` (sobrava
um objeto). Corrigido no gerador, as migrations reaplicadas e o roteiro rodado de novo, inteiro.
E o passo que devolve ao curso o que foi editado no currículo 1: com o propósito e a duração da CAHO mudados no currículo
depois da M2, a reversão os pôs de volta em `cursos` (o lugar que a aplicação antiga lê).

### 6. O caso que discrimina

- **pgTAP `144`** (36): com dois currículos, cada turma lê o seu (CH 100 × 90, execução, limite 10 × 7); o modelo por
  competências do currículo 2 isenta a UE só nas disciplinas dele, com o curso dizendo "unidades"; o currículo arquivado
  não recebe turma nem é o padrão; o PR 1 não trava nada.
- **Permissão com sessão real** (`tests/invariantes/rls/curriculos.test.ts`, 8): o **Operador**, que edita disciplina e não
  edita curso, **não** edita o currículo; o Ajudante edita; curso inativo não recebe escrita; sem INSERT, DELETE nem
  arquivamento por coluna. **Defeito deliberado**: com a policy por `disciplinas.editar` (o desenho de antes das RC), o caso
  do Operador reprovou. Duas rodadas seguidas verdes (regra 9.1).
- **A guarda das colunas aposentadas** (`tests/unidade/colunas-aposentadas-do-curso.test.ts`): com `proposito` de volta na
  lista do catálogo, ela reprovou nomeando o arquivo.
- **ETL**: a ETAPA 6c ressincronizou **2** currículos 1 (os por competências, que a carga das UEs marca no curso) — sem
  ela, os dois divergiriam do curso.

### 7. As suítes, na base limpa

pgTAP **975** em 64 arquivos · unidade **2.625** em 191 · invariantes e RLS **425** em 24 (+ o retrato, pulado). O ETL
refeito sobre as migrations: **APROVADO**, 24 currículos, 0 diferenças na RC-1, 118 regras e 30 limites no currículo 1.
Sobre a base do ETL reprovam `112` (3), `115` (3) e `129` (10) — **e reprovam igual na `main`** (medido nesta rodada, com a
mesma planilha, na cópia de trabalho da `main`): é anterior ao Bloco 6 (`PEND-021-1`).

---

## Rodada 1 — o desenho do portão, medido em 21/10/2026 (antes das RC)

Base: `remoto-20261020-235051.sql`. A impressão digital (24 objetos) e o retrato das telas (212 semanas das 29 turmas)
idênticos; a reversão provada; o caso que discrimina (10 casos) e a cópia da CAHO (21 disciplinas, 1.668 TA, 132 UEs, 54
avaliações do currículo, 2 limites, 59 habilitações) na cópia `remoto-20261021-010344.sql`. O CI do ramo (run
`39542414518`, sobre `810ee6a`) deu 539 passados e **3 reprovados pela trava estrita** — nomear a UE de um item, definir
o tempo "não definido" e acrescentar/inativar avaliação do currículo —, que é o que levou à RC-6 e tirou a trava do PR 1.
