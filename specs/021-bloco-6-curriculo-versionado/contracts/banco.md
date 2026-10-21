# Desenho do banco — currículo versionado (spec 021), revisto pelas RC-1 a RC-12 (21/10/2026)

**PR 1** — duas migrations: **M1** `20261021030049_curriculo_versionado_estrutura` (só acrescenta) e **M2**
`20261021030050_curriculo_versionado_ligacao` (altera — autorizada por Bernardo Villas Boas em 21/10/2026, condicionada à
prova). **PR 2** — as migrations que trazem a cópia, a correção pelo trio e o arquivamento (§6). Na tela é sempre
**"Currículo N"**; "versão" (`versao`) é a palavra do código (RC-12).

## 1. A tabela nova — `public.curriculos` (M1)

| Coluna | O quê |
|---|---|
| `id`, `codigo` (`CRV-NNNNNN`, sequência) | identidade |
| `curso_id` | o curso (FK `restrict`) |
| `versao` | o N do "Currículo N" — único no curso |
| `vigente_de` | a partir de quando rege as turmas **novas** (RC-3); o currículo 1 começa no ano em que o sistema conhece o curso (D-2) |
| `descricao` | o que muda neste currículo (opcional) |
| `proposito`, `duracao_semanas`, `duracao_dias`, `curriculo_modelo` | **RC-1**: eram do curso; o currículo 1 recebe os valores |
| `pdf_carregado_em` | **RC-11**: era `cursos.curriculo_pdf_em` |
| `copiada_de` | de qual currículo foi copiado (RC-7, PR 2) |
| `arquivado_em`, `arquivado_por` | **RC-10**: a ÚNICA situação guardada; vigente/futuro/passado é derivado (RC-3) |
| `status` + auditoria + `origem_migracao_v1` | as convenções (inativar = exclusão lógica do criado por engano, D-19) |

- Índice único `(curso_id, vigente_de)` entre os ativos (D-14); `unique (id, curso_id)` para as FKs compostas; as mesmas
  restrições das colunas do curso (`curriculos_duracao_*_positiva`, `curriculos_curriculo_modelo_valido`).
- **RLS**: ler = `cursos.ler` com alcance; editar = **`cursos.editar`** com alcance e curso em oferta — a cópia de
  `cursos_editar` + a condição de oferta de toda tabela que depende do curso (FR-017.5 da spec 009). **Mudar as colunas de
  tabela não muda quem as edita** (D-15): o Operador, que tem `disciplinas.editar` e não `cursos.editar`, não edita — o
  caso que discrimina em `tests/invariantes/rls/curriculos.test.ts`.
- **Privilégio**: `revoke all` de `authenticated` e `grant select, update (vigente_de, descricao, proposito,
  duracao_semanas, duracao_dias, curriculo_modelo, pdf_carregado_em, status)`. **Sem INSERT, DELETE nem o arquivamento**:
  o currículo nasce com o curso ou pela cópia (função) e nunca sai; arquivar é função (PR 2).
- Funções: `app.curriculo_vigente(curso, data)` — **a** regra da vigência (ativos e não arquivados), a mesma de
  `lib/dominio/curriculos.ts`; `public.curriculo_padrao_da_turma`; `app.curriculo_em_uso_com_lancamento` (a régua da RC-6).

## 2. O que muda em cada tabela existente (M1 acrescenta a coluna; M2 preenche e amarra)

| Tabela | Muda | Por quê |
|---|---|---|
| `cursos` | o curso novo nasce com o currículo 1, levando propósito, duração, modelo e PDF; **cinco colunas `[APOSENTADA — v2.1]`** (`proposito`, `duracao_semanas`, `duracao_dias`, `curriculo_modelo`, `curriculo_pdf_em`), nunca apagadas | RC-1, RC-11, FR-001.5 |
| `disciplinas` | `curriculo_id` (NOT NULL, FK composta com o curso) e `linhagem_id`; código único **no currículo**; currículo padrão (só se houver um) | D-1, D-9, D-10 |
| `unidades_ensino` | `linhagem_id`. **Sem** `curriculo_id`: o currículo é o da disciplina | D-1 |
| `avaliacoes_curriculo` | `linhagem_id` | D-1 |
| `limites_curriculo` | `curriculo_id` (NOT NULL, FK composta); único **no currículo**; currículo padrão | D-1 |
| `avaliacoes_planejadas` | `curriculo_id` (NOT NULL, FK composta); currículo padrão — as **regras de avaliação** (fórmula da MF, caráter) | RC-1 |
| `turmas` | `curriculo_id` (NOT NULL, FK composta); o padrão ao nascer e ao mudar de curso; troca só sem lançamento; recusa currículo arquivado; troca de linhas | RC-4, D-3, D-7, D-8, D-23 |
| `turma_disciplina`, `registros_aula`, `avaliacoes`, `avaliacoes_curriculo_turma` | gatilho: disciplina, UE ou avaliação **do currículo da turma** (dentro do mesmo curso; entre cursos, a FK composta) | D-10 |

⚠️ **O preenchimento da M2 não passa pelos gatilhos de negócio**: é estrutural. ⚠️ **E a M2 se confere**: no fim, um
bloco recusa a migration inteira se algum curso não tiver exatamente um currículo, se o currículo 1 diferir do curso na
RC-1, se alguma turma estiver em currículo de outro curso ou se alguma linha ativa de turma estiver fora do currículo dela.

## 3. O que passa a ler pelo currículo (recriado na M2, com os atributos originais)

| Objeto | Antes | Depois | Quem lê |
|---|---|---|---|
| `vw_carga_horaria_turma.chr_curricular` | disciplinas ativas **do curso** | **do currículo da turma** | Início, `/turmas`, ficha, `vw_conformidade_tetos` |
| `vw_disciplinas_execucao` | `turmas ⋈ disciplinas` pelo **curso** | pelo **currículo** | situação do DSA, rodapé do papel, CONTROLE e CRONOS |
| `vw_conformidade_tetos.limite_declarado` | limite **do curso** | **do currículo da turma** | aba Atividades, Início, ficha, PROENS |
| `app.disciplina_sem_ue` | `cursos.curriculo_modelo` | **o modelo do currículo da disciplina** | as catracas da UE nula (DSA) |
| `app.fazer_nascer_disciplinas_da_turma` | disciplinas do curso | do currículo | o nascimento da turma |
| `app.nascer_disciplina_nas_turmas` | turmas do curso | que seguem o currículo da disciplina | criar e reativar disciplina |
| `app.disciplina_e_da_turma` | mesmo curso | mesmo currículo | `CHECK` da AEC com disciplina |
| `app.validar_unicidade_disciplina` | no curso | no currículo | toda escrita de disciplina |
| `app.criar_disciplina` | — | aceita `curriculo_id` no corpo | RPC da aba Disciplinas |

⚠️ **Atributos conferidos um a um** contra a última definição (`security invoker`/`definer`, `search_path`, volatilidade).

## 4. O que SAIU do PR 1 nesta revisão: a trava estrita (D-4/D-6)

A M2 de 21/10/2026 trazia `app.guardar_curriculo_em_uso`, que recusava pela tela toda mudança de número no currículo
seguido por turma com lançamento. O CI do ramo mediu três funções de hoje derrubadas por ela (`antes-depois.md`, §8 da
rodada anterior), e a **RC-6** a substituiu: a correção é do trio, com justificativa e trilha, e completar o vazio é livre.
Como a RC-6 precisa da tela da justificativa, ela vai **inteira** no PR 2 (§6). Até lá, com **um** currículo por curso,
editar o currículo segue exatamente como hoje — nenhuma função muda.

## 5. A troca de currículo da turma (D-7, D-8, D-23)

`app.guardar_curriculo_da_turma` (antes): só sem lançamento (`curriculo_da_turma_travado`), só currículo ativo **e não
arquivado** do curso (`versao_inativa`); a turma que muda de curso vai para o vigente do curso novo.
`app.trocar_linhas_da_versao` (depois): tira o **mapa** antes de mudar qualquer coisa, inativa o do currículo velho (nunca
apaga) e faz nascer as linhas novas, levando período, atribuições, rateio por UE e ajustes onde há correspondência.

## 6. O PR 2 (desenho; migrations que acrescentam, e a RC-6, que altera — autorizada pelas RC)

- **A cópia (RC-7)** — `public.criar_curriculo(curso, vigente_de, descricao, hoje)`, `definer` com porteiro
  (`cursos.editar`, alcance, curso em oferta; `coalesce(…, false) is not true`, gotcha 15): currículo N+1 copiando do
  vigente o conteúdo da RC-1, as disciplinas, UEs, avaliações do currículo, limites, regras de avaliação e habilitações
  **ativas**, cada cópia com a linhagem da original, ids gerados antes (gotcha 4.1). Recusa começar antes do mais novo e
  criar um segundo futuro (RC-2, D-27); `hoje` vem de quem chama (D20).
- **A correção (RC-6)** — recurso próprio na matriz (`correcao_de_curriculo`/`editar`: Admin, Encarregado e Ajudante da
  Administração Acadêmica); a trilha `correcoes_de_curriculo` (só de acréscimo, imutável inclusive para a `service_role`:
  quem, quando, tabela, registro, o quê, valor anterior, valor novo, justificativa); `public.corrigir_curriculo(
  justificativa, alvo, id, campos)` marca a transação com a justificativa e faz a mudança; o gatilho
  `app.guardar_curriculo_em_uso`, com sessão, no currículo seguido por turma com lançamento: completar o vazio passa
  (D-24); qualquer outra mudança exige o recurso **e** a justificativa, e grava a trilha **antes**; sem sessão passa (D-5).
- **O arquivamento (RC-10)** — `public.arquivar_curriculo(id, hoje)` / `desarquivar_curriculo(id)`, porteiro do trio:
  só o passado (nem vigente nem futuro em `hoje`) com todas as turmas arquivadas.
- **O PDF por currículo (RC-11, D-29)** — as policies do balde passam a aceitar `<curso>/curriculo-<N>.pdf` do currículo N
  do curso; o do 1 continua em `<curso>/curriculo.pdf`.

## 7. Reversão (PR 1)

`specs/021-bloco-6-curriculo-versionado/reversao.sql`, montado com as definições **exatas** das migrations de origem. Só
sem currículo além do 1 (com o 2, reverter apagaria currículo cadastrado: decisão de Bernardo, regra 4). Antes de tirar a
estrutura, **devolve ao curso** o que tiver sido editado no currículo 1 (propósito, duração, modelo, PDF), para a
aplicação antiga ler o valor certo, e restaura os comentários das colunas do curso. Provada com dado — `antes-depois.md`.

## 8. O ETL e a VIRADA-1

- A ETAPA 6b reaplica `20261014052333` (`on conflict (curso_id, categoria)`) com o índice antigo provisório.
- **A ETAPA 6c** (nova) ressincroniza o currículo 1 com o curso depois da carga das UEs, que marca o modelo **no curso**
  (migration aplicada no remoto, intocável) — D-22.
- `app.curriculos_codigo_seq` em `SEQUENCIAS_DE_CODIGO` (gotcha 9).
- A sincronização por turma lê o modelo do **currículo da turma** (PR 1); casar disciplina e UE dentro do currículo da
  turma é do PR 2.
