# Antes × depois — currículo versionado (spec 021, PR 1)

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
