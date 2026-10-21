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

## 6. O PR 2 — duas migrations: a M3 só acrescenta; a M4 altera (portão 9.4)

**M3 `20261021124836_curriculo_copia_trilha_arquivamento`** — só acrescenta (segue o rito sem parar):
- **O PDF por currículo (RC-11, D-29)** — `curriculos.pdf_caminho` (nulável), preenchido no currículo 1 que já tinha PDF
  (`<curso>/curriculo.pdf`); `grant update (pdf_caminho)` a `authenticated` (a policy `curriculos_editar` continua
  decidindo quem).
- **A trilha (RC-6)** — `public.correcoes_de_curriculo` (quem, quando, a tabela e o registro, a ação — alterar, incluir,
  inativar, reativar —, os campos, o valor anterior e o novo, a justificativa de 5 a 1.000 letras); só de acréscimo,
  `UPDATE`/`DELETE`/`TRUNCATE` recusados por gatilho **inclusive para a `service_role`**; RLS de leitura = ler o curso
  (`cursos.ler` + alcance); sem escrita para `authenticated` — quem escreve é o gatilho da M4.
- **A justificativa da requisição (D-26, revista)** — `app.justificativa_de_correcao()`: lê o cabeçalho
  `x-justificativa-de-correcao` de `request.headers` (base64 do UTF-8) e devolve o texto, ou nulo.
- **A cópia (RC-7, RC-2, D-27)** — `public.criar_curriculo(curso, vigente_de, descricao, hoje)`, `definer` com porteiro
  (`cursos.editar`, alcance, curso em oferta; `coalesce(…, false) is not true`, gotcha 15): currículo N+1 copiando do
  vigente o conteúdo da RC-1 (sem o PDF), as disciplinas, UEs, avaliações do currículo, limites, regras de avaliação e
  habilitações **ativas**, cada cópia com a linhagem da original. Recusa criar um segundo futuro
  (`ja_ha_curriculo_futuro`) e começar antes do mais novo (`curriculo_antes_do_mais_novo`); `hoje` vem de quem chama (D20).
- **O arquivamento (RC-10, D-28)** — `public.arquivar_curriculo(id, hoje)` e `public.desarquivar_curriculo(id)`, porteiro
  do recurso `arquivamento_de_curriculo` (que a M4 cria — sem ela, falham fechados): só o passado, com todas as turmas
  que o seguem arquivadas (`curriculo_nao_passado`, `curriculo_com_turma_nao_arquivada`).

**M4 `20261021124838_curriculo_em_uso_e_pdf_por_curriculo`** — **ALTERA** (regra 9.4: portão antes do remoto):
- **A matriz** — dois recursos: `correcao_de_curriculo`/`editar` e `arquivamento_de_curriculo`/`editar`, permitidos ao
  trio (Admin, Encarregado e Ajudante da Administração Acadêmica) e a mais ninguém.
- **A correção (RC-6, D-24)** — `app.guardar_curriculo_em_uso()`, `definer`, em `curriculos`, `disciplinas`,
  `unidades_ensino`, `avaliacoes_curriculo`, `limites_curriculo` e `avaliacoes_planejadas` (`BEFORE INSERT OR UPDATE`):
  com sessão, no currículo seguido por turma com lançamento (`app.curriculo_em_uso_com_lancamento`), **completar o
  vazio passa**; qualquer outra mudança exige o recurso (`42501`, `curriculo_em_uso`) **e** a justificativa (`23514`,
  `justificativa_obrigatoria`), e grava a trilha **antes**. Colunas de auditoria e de procedência não contam, nem a situação do próprio currículo (D-37). Sem sessão
  (ETL, script, migration) passa (D-5).
- **O balde** — a policy `curriculos_carregar_por_curriculo` (`INSERT`, `cursos.editar`, alcance, curso em oferta) para
  `<curso>/<currículo>/<instante>.pdf`. Sem `UPDATE` nem `DELETE`: cada envio é um arquivo novo (D-29).
- **O efeito em Production entre a aplicação e o merge**: o código da `main` não manda a justificativa — o trio que
  corrigir conteúdo de currículo em uso pela tela recebe a recusa (completar o vazio continua livre). Por isso a M4 espera
  a palavra de Bernardo, e o ideal é aplicá-la junto do merge.

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
