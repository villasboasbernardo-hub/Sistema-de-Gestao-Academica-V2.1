# Desenho do banco — currículo versionado (spec 021, PR 1)

Duas migrations: **M1** `20261021030049_curriculo_versionado_estrutura` (só acrescenta) e **M2**
`20261021030050_curriculo_versionado_ligacao` (**altera — o portão**). O SQL está nos dois arquivos; aqui, o que muda,
por que e quem lê.

## 1. A tabela nova — `public.curriculos` (M1)

| Coluna | O quê |
|---|---|
| `id`, `codigo` (`CRV-NNNNNN`, sequência) | identidade |
| `curso_id` | o curso (FK `restrict`) |
| `versao` | 1, 2, 3… — única no curso |
| `vigente_de` | a partir de quando rege as turmas **novas**; a versão 1 vale desde 01/01/2020 |
| `descricao` | o que muda nesta versão (opcional) |
| `duracao_semanas`, `duracao_dias` | a duração **da versão**; nula = a do curso (a versão 1 nasce nula — D-11) |
| `copiada_de` | a versão de que foi copiada (PR 2) |
| `status` + auditoria + `origem_migracao_v1` | as convenções |

- Índice único `(curso_id, vigente_de)` entre as ativas (D-14); `unique (id, curso_id)` para as FKs compostas.
- **RLS**: ler = `cursos.ler` com alcance; editar o cabeçalho = `disciplinas.editar` com alcance e curso em oferta.
  **Sem policy de INSERT nem de DELETE** — a versão nasce só pela cópia (PR 2, função `definer` com porteiro) e nunca sai.
- Funções novas: `app.curriculo_vigente(curso, data)` (a regra da vigência, **uma**), `public.curriculo_padrao_da_turma`
  (a tela pergunta antes de gravar), `app.curriculo_em_uso_com_lancamento(versão)` (a régua da trava, sobre a mesma
  `app.turma_tem_lancamento_no_dsa` do regime de horário).

## 2. O que muda em cada tabela existente

| Tabela | Muda | Por quê |
|---|---|---|
| `cursos` | gatilho novo: o curso nasce com a versão 1 | FR-001.4 |
| `disciplinas` | `curriculo_id` (NOT NULL, FK composta com o curso) e `linhagem_id`; o código passa a ser único **na versão** (`uq_disciplinas_curriculo_cod_ativo` no lugar de `uq_disciplinas_curso_cod_ativo`); gatilho de versão padrão (só se houver uma) e a trava | D-1, D-9, D-10, D-4 |
| `unidades_ensino` | `linhagem_id`; a trava. **Sem** `curriculo_id`: a versão é a da disciplina | D-1 |
| `avaliacoes_curriculo` | `linhagem_id`; a trava | D-1, D-6 |
| `limites_curriculo` | `curriculo_id` (NOT NULL, FK composta); único **na versão** (`limite_unico_na_versao` no lugar de `limite_unico`); versão padrão; a trava | D-1 |
| `turmas` | `curriculo_id` (NOT NULL, FK composta); a versão padrão ao nascer e ao mudar de curso; a troca só sem lançamento; a troca de linhas | D-2, D-3, D-7, D-8 |
| `turma_disciplina` | gatilho: a linha ativa é da versão da turma | D-10 |
| `registros_aula`, `avaliacoes`, `avaliacoes_curriculo_turma` | gatilho: disciplina, UE ou avaliação **da versão da turma** — só dentro do mesmo curso; entre cursos quem recusa continua sendo a FK composta (`RN-MAT-01`, provado pelo `055`) | D-10 |

⚠️ **O preenchimento da M2 não passa pelos gatilhos de negócio** (auditoria, trilha do arbitrado, turma arquivada): é
estrutural, não edição de ninguém. Medido: nenhum `editado_em` novo, nenhuma linha nova na trilha.

## 3. O que passa a ler pela versão (recriado na M2, com os atributos originais)

| Objeto | Antes | Depois | Quem lê |
|---|---|---|---|
| `vw_carga_horaria_turma.chr_curricular` | disciplinas ativas **do curso** | disciplinas ativas **da versão da turma** | Início, `/turmas` (Progresso e Saldo), ficha da turma (andamento e tetos), `vw_conformidade_tetos` |
| `vw_disciplinas_execucao` | `turmas ⋈ disciplinas` pelo **curso** | pela **versão** | painel de situação do DSA, rodapé do papel, CONTROLE e CRONOS da planilha |
| `vw_conformidade_tetos.limite_declarado` | limite **do curso** | limite **da versão da turma** | aba Atividades, Início, ficha da turma, previsto do PROENS |
| `app.fazer_nascer_disciplinas_da_turma` | disciplinas do curso | disciplinas da versão | o nascimento da turma |
| `app.nascer_disciplina_nas_turmas` | turmas do curso | turmas que seguem a versão da disciplina | criar e reativar disciplina |
| `app.disciplina_e_da_turma` | mesmo curso | mesma versão (que implica o mesmo curso) | `CHECK` da AEC com disciplina |
| `app.validar_unicidade_disciplina` | no curso | na versão | toda escrita de disciplina |
| `app.criar_disciplina` | — | aceita `curriculo_id` no corpo | RPC da aba Disciplinas |

⚠️ **Atributos conferidos um a um** contra a última definição de cada função (`security invoker`/`definer`,
`search_path`, volatilidade): a primeira redação tinha passado `nascer_disciplina_nas_turmas` de **invoker** para
**definer** — criaria linha de turma por cima da RLS. Corrigido antes de qualquer medição final.

## 4. A trava da versão em uso (`RF-HOR-05`, D-4 a D-6)

`app.guardar_curriculo_em_uso`, `before insert or update` em `disciplinas`, `unidades_ensino`, `avaliacoes_curriculo` e
`limites_curriculo`: **com sessão**, se a versão é seguida por turma com lançamento e a escrita muda número, recusa com
`23514`/`curriculo_em_uso`. Sem sessão, passa. A versão seguida por turma não se inativa (`versao_em_uso`).

## 5. A troca de versão da turma (D-7, D-8)

`app.guardar_curriculo_da_turma` (antes): só sem lançamento (`curriculo_da_turma_travado`), só versão ativa do curso
(`versao_inativa`); a turma que muda de curso vai para a vigente do curso novo. `app.trocar_linhas_da_versao` (depois):
tira o **mapa** antes de mudar qualquer coisa (linha velha → disciplina da versão nova com a mesma linhagem), inativa o que
é da versão velha (ajustes, rateio, atribuições, linhas — nunca apaga) e faz nascer as linhas novas, levando período,
atribuições (código `<linha>#<instrutor>`), rateio por UE e ajustes onde há correspondência.

## 6. O que fica para o PR 2 (desenho, não código deste PR)

- `public.criar_versao_do_curriculo(curso, vigente_de, descricao, copiar_de)` — `definer` com porteiro
  (`disciplinas.criar`, alcance, curso em oferta): versão N+1 copiando disciplinas, UEs, avaliações do currículo, limites
  e habilitações **ativas**, cada cópia com a linhagem da original, ids gerados antes (gotcha 4.1). Rascunho pronto e
  testado na cópia do remoto (§7 de `antes-depois.md`).
- Os leitores do código pela versão (`codigo.md`).

## 7. Reversão

`specs/021-bloco-6-curriculo-versionado/reversao.sql`, montado com as definições **exatas** das migrations de origem.
Só sem versão além da 1 (com versão 2, reverter apagaria currículo cadastrado: decisão de Bernardo, regra 4). **Provada
com dado** na cópia do remoto: o esquema volta a **2.237 objetos, `1ba390aa…`** (o da `main` e do remoto), e a impressão
do currículo à do antes.

## 8. O ETL e a VIRADA-1

- A ETAPA 6b reaplica `20261014052333` (`on conflict (curso_id, categoria)`): o ETL recria o índice antigo **só durante a
  reaplicação** e o retira em seguida (`scripts/etl/executar.py`). Provado: carga APROVADA, 30 limites na versão 1.
- `app.curriculos_codigo_seq` entrou em `SEQUENCIAS_DE_CODIGO` (gotcha 9).
- A sincronização por turma segue funcionando com uma versão (nada no Python mudou); casar dentro da versão é do PR 2.
