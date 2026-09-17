# Modelo de dados — Fase 1: Épico 5, fatia (a) — cursos e turmas

**Data**: 16/09/2026, revisado em 17/09/2026 com as respostas ao lote único · **Spec**: [spec.md](./spec.md) ·
**Pesquisa**: [research.md](./research.md) · **Plano**: [plan.md](./plan.md)

⚠️ **Uma tabela nova, e só ela: `curso_sigla_historico`** (B-21, decidida em 17/09/2026). O resto da fatia
muda colunas, restrições, gatilhos, funções e policies de tabelas que existem desde o Épico 1, e
**acrescenta linhas** em `config_listas`, `config_parametros` e `perfil_permissao`. Os marcadores **[B-n]**
apontam a decisão de Bernardo de **17/09/2026** registrada no [plano](./plan.md) e na spec. **Não há
pergunta aberta.**

Tudo o que é "hoje" foi medido no banco local povoado em 16/09 e 17/09/2026.

---

## 1. Entidades e o que muda em cada uma

### `cursos` — 24 linhas

| Coluna / objeto | Hoje | Depois | Origem |
|---|---|---|---|
| `modalidade` | `not null default 'presencial'` | `not null`, **sem** `default` | `FR-015`, `FR-015.1` |
| `duracao_dias` | anulável (0 nulos) | `not null` | `FR-015` |
| `limite_turmas_ano` | `not null default 1` | `not null`, **sem** `default`; gatilho `BEFORE INSERT` preenche pela classificação **só se vier nulo**; editável depois **[B-13]** | `FR-003.2` |
| `classificacao` | `CHECK <> 'geral'` (`cursos_classificacao_nao_geral`) | recusa também `ead_semipresencial`; mudar é edição comum, **sem** reaplicar limite **[B-14]** | `FR-003.1`, `FR-016.1` |
| `codigo` (sigla) | `unique not null` | **sem mudança de restrição** — digitada e editável **[B-12]**; a troca é gravada em `curso_sigla_historico` **[B-21]** e **não** reescreve código de turma; sigla que já foi de **outro** curso é **recusada**, e o curso pode voltar a uma sigla **sua** **[B-22]** | `FR-014.1`, `FR-014.2`, `FR-014.3` |
| `prioridade_alocacao` | `not null default 'carga_restante_por_dia_util'` | **sem mudança** — padrão justificado **[B-19]** | `FR-015.2` |
| gatilho `BEFORE UPDATE` | só auditoria | guarda da situação: desativar exige `cursos.desativar` e nenhuma turma `planejada`/`ativa`; curso inativo só aceita voltar a `ativo`, **por valor**, sem outra coluna mudada | `FR-017`, `FR-017.4`, `FR-017.7` |
| policy `cursos_criar` | `app.pode('cursos','criar')` | e `status = 'ativo'` — curso nasce ativo **pela sessão**; a carga do ETL, que não passa pela RLS, continua podendo trazer curso inativo da v2.0 | `FR-017.5` |
| gatilho **de restrição adiado** `AFTER INSERT` | — | ao fim da transação, o curso MUST ter vigência `padrao` **ativa** **[B-15, opção C]** | `FR-019.5` |

**Situação do curso** (`status_registro`): `ativo` ⇄ `inativo`.
- `ativo → inativo`: perfis com `cursos.desativar` (Admin, Encarregado e Ajudante da Divisão) **e**
  zero turmas `planejada`/`ativa`. Medido: **6 de 24** desativáveis hoje.
- `inativo → ativo`: os mesmos três, sem condição, **só a situação** muda. A comparação "nada mais
  mudou" é feita sobre a linha inteira **menos** `status`, as quatro colunas de auditoria e a coluna
  gerada `nome_normalizado` — que num gatilho `BEFORE` ainda não foi calculada.
- Enquanto `inativo`: **legível e alcançável** no escopo; **nenhuma** escrita no curso nem nas 16
  tabelas dependentes (§3).

### `curso_sigla_historico` — **tabela nova** (B-21, 17/09/2026)

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` | `default gen_random_uuid()` |
| `curso_id` | `uuid not null` | FK `cursos(id)`, `on delete restrict` |
| `sigla_anterior`, `sigla_nova` | `text not null` | `CHECK (sigla_anterior <> sigla_nova)` |
| `criado_por`, `criado_em` | quarteto de auditoria | **quem** trocou e **quando**, por `app.set_auditoria()` |
| `editado_por`, `editado_em` | quarteto de auditoria | sempre nulos — a linha não é editada |
| `origem_migracao_v1` | `text` | sempre nulo — a convenção manda toda tabela nova trazê-la |

- **Escrita só por gatilho**: `AFTER UPDATE OF codigo ON cursos`, `SECURITY DEFINER`, **quando o valor
  mudou** — grava sigla anterior e nova. **Nenhuma** policy de `INSERT`, `UPDATE` ou `DELETE`; `revoke` de
  `INSERT`, `UPDATE`, `DELETE` e `TRUNCATE` de `authenticated` e `anon`.
- **Sem alteração nem exclusão, por nenhum caminho**: `BEFORE UPDATE OR DELETE … FOR EACH STATEMENT` **e**
  `BEFORE TRUNCATE … FOR EACH STATEMENT`, os dois com `app.bloquear_reescrita()` — a mesma função de
  `migracao_log`, que recusa **inclusive** a `service_role`.
  ⚠️ **O gatilho de `TRUNCATE` é deliberado, e aponta um achado:** o de `migracao_log` é só
  `BEFORE DELETE OR UPDATE`, e a `service_role` **tem** o privilégio de `TRUNCATE` nela — medido em
  17/09/2026, e **provado** numa tabela descartável com o mesmo gatilho. Um `TRUNCATE` pela `service_role`
  apagaria o log sem passar pelo gatilho (R-22). **Não corrigido nesta fatia, por decisão**: a regra 5 do
  `CLAUDE.md` foi anotada com a lacuna e a pendência `PEND-5a-3` (D-21).
- **Leitura**: `app.pode('auditoria','ler')` — o recurso que já guarda `migracao_log`: Admin, Chefe do
  Departamento, Encarregado e Ajudante da Divisão (medido na matriz em 17/09/2026).
- RLS ligada, índice por `curso_id`. **Sem tela nesta fatia.**
- **Nunca** um campo de histórico dentro de `cursos` (`FR-014.1`).

### `turmas` — 28 linhas

| Coluna / objeto | Hoje | Depois | Origem |
|---|---|---|---|
| `modalidade` | anulável (0 nulos) | `not null`, sem `default`; **nunca** copiada do curso | `FR-015`, `FR-027` |
| `codigo` | `unique not null`, sem gerador | gatilho `BEFORE INSERT` gera `sigla [rótulo] ano` lendo a sigla **vigente** do curso; código **informado e divergente é recusado**; `BEFORE UPDATE` recusa mudar o código — **inclusive** quando a sigla do curso muda: nada cascateia | `FR-025.1`, `FR-014.2` |
| `turmas_unica_por_ano` | `UNIQUE (curso_id, ano_letivo, turma)` — `NULL ≠ NULL` | `UNIQUE NULLS NOT DISTINCT (curso_id, ano_letivo, turma)`, mesmo nome | `FR-026` (D-5) |
| `turma` (rótulo) | texto livre anulável | anulável; se preenchido, `CHECK (turma ~ '^T[1-9][0-9]*$')` **[B-11]** | `FR-025.2` |
| `sala_alocada` | texto livre | conferida contra a lista `salas`, **aceitando** vazio e sala desativada | `FR-029`, `FR-029.4` |
| `status` | `not null`, sem `default` | **sem mudança** — os 4 valores, qualquer transição | `FR-028` |
| `data_inicio`, `data_termino` | — | **sem sincronização** com `janelas_curso` **[B-18]** | `FR-025.3` |
| gatilho `AFTER INSERT` | — | faz nascer `turma_disciplina` | `FR-032` |

**Recusar ou sobrescrever o código divergente** — a spec deixa ao plano (`FR-025.1`). **Decisão:
recusar.** Sobrescrever grava algo diferente do que o chamador mandou sem avisá-lo; a recusa mostra
o erro a quem o cometeu, e a Server Action nunca manda código.

**Situação da turma** (`status_turma`): `planejada`, `ativa`, `concluida`, `cancelada` — qualquer para
qualquer, manual, sem automação (`FR-028`). Nenhum status trava nada nesta fatia (`FR-028.2`).
Contagem do limite: **só** `planejada`, `ativa`, `concluida`, por **enumeração positiva** (`FR-030`) —
regra de `lib/dominio/`, não do banco: o limite **avisa**, não recusa (`RN-DEG-02`).

### `turma_disciplina` — 210 linhas

| Coluna / objeto | Hoje | Depois | Origem |
|---|---|---|---|
| `codigo` | `TDI-NNNNNN` (maior `TDI-000210`), sem gerador | `default app.proximo_codigo_turma_disciplina()` sobre **sequência** | `FR-032.2`, R-5 |
| `uq_turma_disciplina_ativo` | `UNIQUE (turma_id, disciplina_id) WHERE status = 'ativo'` | **inalterada** — já atende | `FR-032.2` |
| linha da `ALH-II` inativa em `C-Esp-ALH 2026` | existe | **inalterada**; não replicada | `FR-032.3` |

**Nascimento com a turma** (`FR-032`, `FR-032.1`) — para cada disciplina **ativa** do curso:
- `herdado_grade` **se e só se** `disciplinas.previsao_inicio` existe **e** a turma tem as **duas**
  datas **e** `data_inicio ≤ previsao_inicio ≤ data_termino`; copia **as duas** datas da grade;
- `nao_informado` em todos os outros casos, com as duas datas nulas.

### `curso_regime_historico` — 29 linhas, 24 cursos, nenhuma sucessão

Medido: os **24** cursos têm vigência `padrao`; **5** têm também `excecao`; **0** linhas com
`vigente_ate`; **0** canceladas.

| Coluna / objeto | Hoje | Depois | Origem |
|---|---|---|---|
| parâmetros (`regime_tempos`, `ta_duracao_min`, `hora_inicio_manha`, `hora_inicio_tarde`, `intervalo_manha_min`, `intervalo_tarde_min`, `limite_diario_ead_horas`, `configuracao_horario_id`, `tipo_regime`, `curso_id`, `vigente_de`) | editáveis por quem tem `cursos.editar` | **imutáveis**: gatilho `BEFORE UPDATE` recusa | `FR-020` |
| `fundamento_curricular`, `motivo`, `codigo` | editáveis | **imutáveis** também — o `FR-020` aceita **apenas duas** escritas numa vigência existente | `FR-020` |
| `vigente_ate` | editável | muda **só** numa vigência `ativo` e **só** se, ao fim da transação, existir a sucessora ativa começando no dia seguinte — gatilho de restrição **adiado** | `FR-019`, `FR-020` |
| `status` (`ativo`/`cancelado`) | editável nos dois sentidos | `ativo → cancelado` **só** sem lançamento dependente; `cancelado → ativo` recusado; cancelar a **única** `padrao` sem sucessora na mesma transação é recusado no fim dela **[B-15]** | `FR-020`, `FR-021.1`, `FR-021.2`, `FR-019.5` |
| `regime_unico_por_inicio` | `UNIQUE (curso_id, tipo_regime, vigente_de)` — **conta as canceladas** | índice único **parcial** `WHERE status = 'ativo'`, mesmo nome **[B-8]** | `FR-021.9` |
| `regime_sem_sobreposicao` | `EXCLUDE … WHERE status = 'ativo'` | **inalterada** — continua recusando sobreposição **direta** com `23P01`, como o `040_vigencia.sql` do Épico 1 prova | `FR-019` |
| gatilho `BEFORE INSERT` | — | trava o curso (R-7) e recusa a vigência nova cujo período contenha lançamento já gravado do curso **[B-10]** | `FR-019.4`, `RN-2027-09` |
| `codigo` | `REG-NNNNNN`, sem gerador | `default app.proximo_codigo_vigencia_regime()` sobre sequência **[B-9]** | `FR-019.3` |
| policies de escrita | `cursos.editar` | `horarios.criar` (`INSERT`) e `horarios.editar` (`UPDATE`), com alcance e curso em oferta | `FR-024`, `FR-017.5` |
| policy de leitura | `cursos.ler` | **inalterada** | `FR-024` |

**A sucessão é explícita, não automática (R-19).** Registrar vigência é a RPC
`public.registrar_vigencia_regime`, que **na mesma transação** grava o `vigente_ate` da anterior e
insere a nova. Um `INSERT` solto que se sobreponha à vigência aberta continua **recusado** pela
`EXCLUDE` — um gatilho que fechasse a anterior sozinho transformaria toda data digitada errado numa
sucessão silenciosa, e derrubaria duas asserções do Épico 1.

**Semântica de fim, preservada:** `vigente_ate` é **inclusivo** (`daterange(vigente_de, vigente_ate + 1)`),
como o referência implementa e o `CLAUDE.md` registra. Fechar a anterior é
`vigente_ate = nova.vigente_de − 1`.

**O prefixo `REG-` (D-20, [B-9]).** `curso_regime_historico.codigo` usa 6 dígitos; `registros_aula` e
`arquivo_avaliacoes_v1` usam o mesmo prefixo com 4. **Verificado em 17/09/2026: os dois usos não
aparecem juntos** em view, tela, relatório nem em `migracao_log` — a divergência anotada basta. Tela
futura que os junte MUST desambiguar.

### `config_listas` — lista nova `salas`

| Coluna / objeto | Hoje | Depois | Origem |
|---|---|---|---|
| `metadados` | não existe | `jsonb not null default '{}'` | `FR-029.1` |
| `config_listas_sala_com_natureza` | — | `CHECK (lista <> 'salas' or (metadados ? 'ambiente_virtual' and jsonb_typeof(metadados -> 'ambiente_virtual') = 'boolean'))` **[B-2]** | `FR-029.7` |
| linhas `lista = 'salas'` | 0 | **8**: Sala CAHO, Sala 01, Sala 02, Sala 03, Sala 04, Sala 06, Laboratório de Informática (**físicas**, `false`), Moodle (**virtual**, `true`). **Sem Sala 05, por decisão** | `FR-029`, `FR-029.6` |
| escrita | `parametros.criar`/`editar` (Admin e Encarregado da Divisão) | **inalterada** — sem linha nova para o Ajudante | `FR-029.2` |

⚠️ **Por que a restrição tem as duas metades — a condição do B-2.** Escrita só como
`jsonb_typeof(metadados -> 'ambiente_virtual') = 'boolean'`, ela **aceitaria a sala sem a chave**: a chave
ausente dá nulo, a comparação dá nulo, e `CHECK` com resultado **nulo passa**. O operador `?` devolve
**falso**, nunca nulo, quando a chave falta — e é ele que faz a ausência ser recusada. `{"ambiente_virtual":
null}` também é recusado: o tipo JSON dele é `null`, não `boolean`. O pgTAP prova os **três** casos.

⚠️ **A reconciliação da migration não alcança a carga do ETL (R-20, [B-20]).** `pnpm db:reset` aplica a
migration sobre a base **vazia** e a carga vem **depois**. O ETL aplica **a mesma lista** de
substituições e registra cada troca em `migracao_log` como `corrigido`.

### `config_parametros` — uma linha nova (B-16, 17/09/2026)

| Coluna | Valor |
|---|---|
| `chave` | `regime.nono_ta_dias_por_semana_sem_aviso` — passa no `CHECK` de chave em minúsculas com ponto |
| `valor` / `tipo` / `unidade` | `2` / `inteiro` / `dias/semana` |
| `natureza` | **`operacional`** — o número é decisão da Divisão, não texto de norma |
| `fundamento_normativo` | `RF-HOR-03.1`; currículos de CAHO, C-Ap-HN e C-Ap-FR, item 2.1 (9º TA "opcional… para situações excepcionais"); valor decidido por Bernardo Villas Boas em 17/09/2026 |
| `descricao` | máximo de dias, numa semana ISO, com uso do 9º tempo por uma turma sem gerar aviso; a partir do seguinte, aviso informativo, nunca bloqueio |
| `editavel_por` | `encarregado_administracao_academica`, como as faixas de CH docente |

**Semeado na migration 6** — é assim que os parâmetros do Épico 1 entraram —, e **nenhuma** policy nem
função o lê nesta fatia: o aviso é do `FR-023`, adiado até o Épico 6 gravar qual TA cada aula ocupou. A
chave **não existe na v2.0**, então a carga do ETL não tem com o que compará-la.

### `perfil_permissao` — linhas novas **[B-7]**

| Recurso | Ação | Perfis | Origem |
|---|---|---|---|
| `horarios` | `ler` | os **9** — declarada sem leitor nesta fatia | `FR-024.1` |
| `horarios` | `criar`, `editar` | `admin`, `encarregado_administracao_academica`, `ajudante_administracao_academica`, `operador` | `FR-024` |
| `horarios` | `desativar` | `admin`, `encarregado_administracao_academica`, `ajudante_administracao_academica` — declarada sem leitor | `FR-024.1` |
| `turmas` | `criar` | `operador` | `FR-025`, `FR-028` |
| `cursos` | `desativar` | `admin`, `encarregado_administracao_academica`, `ajudante_administracao_academica` | `FR-017` |

**Sem** ação `reativar` (`FR-017`). **Sem** linha nova em `parametros` (`FR-029.2`).

### `atividades_nao_letivas` — gatilho novo **[B-4]**

`BEFORE INSERT OR UPDATE` que, **quando `turma_id` é nulo** (escopo global), pega
`pg_advisory_xact_lock` **exclusivo** na chave da atividade global — o par da trava compartilhada que
a correção de vigência pega (R-7). Não muda nenhum valor (`FR-021.7`).

### `public.sincronizar_habilitacoes` (fatia c) — ajuste **[B-3]**

Inativação passa a **ignorar disciplina de curso inativo**; marcar disciplina de curso inativo é
**recusado com mensagem** (`FR-017.9`). Motivo em R-2.

---

## 2. Funções e gatilhos

| Nome | Tipo | Direitos | Faz | Origem |
|---|---|---|---|---|
| `app.limite_de_turmas_pela_classificacao()` | gatilho `BEFORE INSERT` em `cursos` | invoker | só se nulo: `regular` → 1, demais → 2 | `FR-003.2` |
| `app.guardar_situacao_do_curso()` | gatilho `BEFORE UPDATE` em `cursos` | invoker | as duas regras da situação (§1); mensagem nomeia as turmas pendentes | `FR-017.4`, `FR-017.7` |
| `app.conferir_curso_com_regime()` | gatilho **de restrição**, `DEFERRABLE INITIALLY DEFERRED`: `AFTER INSERT` em `cursos` e `AFTER UPDATE OF status` em `curso_regime_historico` | `SECURITY DEFINER` | no fim da transação, o curso tem vigência `padrao` ativa — senão `23514`, chave `curso_sem_regime` **[B-15]** | `FR-019.5` |
| `app.registrar_troca_de_sigla()` | gatilho `AFTER UPDATE OF codigo` em `cursos` | `SECURITY DEFINER` | grava em `curso_sigla_historico` quando a sigla **mudou de valor**, depois de pegar a **trava de aconselhamento pela sigla deixada** — a mesma que a conferência abaixo pega pela sigla adotada, para duas trocas simultâneas não passarem juntas (R-26) | `FR-014.1` |
| `app.recusar_sigla_de_outro_curso()` | gatilho `BEFORE INSERT OR UPDATE OF codigo` em `cursos`, só quando a sigla **muda de valor** | `SECURITY DEFINER` | recusa sigla que conste como `sigla_anterior` de **outro** curso em `curso_sigla_historico` — `23505`, chave `sigla_de_outro_curso`, com a sigla atual e o nome desse curso e a data em que ele a deixou (a mais recente); **aceita** a sigla que foi do **próprio** curso | `FR-014.3` |
| `app.gerar_codigo_da_turma()` | gatilho `BEFORE INSERT OR UPDATE` em `turmas` | `SECURITY DEFINER` | lê a sigla por `NEW.curso_id` sem depender do `cursos.ler` de quem grava — a policy de `turmas` decide a autorização logo depois | `FR-025.1` |
| `app.validar_dominio_config_lista()` | **alterada**: `TG_ARGV[2] = 'aceita_inativo'` opcional | inalterado | sem o terceiro argumento, **byte a byte** o de hoje | `FR-029`, R-4 |
| gatilho de sala em `turmas` | `BEFORE INSERT OR UPDATE OF sala_alocada` | — | argumentos `('sala_alocada', 'salas', 'aceita_inativo')` | `FR-029.4` |
| `app.fazer_nascer_disciplinas_da_turma()` | gatilho `AFTER INSERT` em `turmas` | `SECURITY DEFINER`, `search_path = pg_catalog, public` | linhas de `turma_disciplina`; falha desfaz a turma | `FR-032`, R-6 |
| `app.proximo_codigo_turma_disciplina()` | `default` | `SECURITY DEFINER` | **só** `nextval` — nenhum `max()` | `FR-032.2`, R-5 |
| `app.proximo_codigo_vigencia_regime()` | `default` | `SECURITY DEFINER` | **só** `nextval` | `FR-019.3` |
| `app.conferir_vigencia_nova()` | gatilho `BEFORE INSERT` em `curso_regime_historico` | invoker | trava o curso; recusa período com lançamento já gravado | `FR-019.4` |
| `app.guardar_vigencia_de_regime()` | gatilho `BEFORE UPDATE` em `curso_regime_historico` | invoker | imutabilidade; `vigente_ate` só em vigência ativa; cancelamento só sem lançamento, com a trava | `FR-020`, `FR-021.1`, `FR-021.2` |
| `app.conferir_encadeamento_de_vigencias()` | gatilho **de restrição**, `AFTER INSERT OR UPDATE`, `DEFERRABLE INITIALLY DEFERRED` | invoker | ao fim da transação: toda vigência ativa com `vigente_ate` tem sucessora ativa em `vigente_ate + 1` | `FR-020` |
| `public.registrar_vigencia_regime(curso_id uuid, vigencia jsonb)` | RPC | **invoker** — a RLS de `horarios` vale | fecha a anterior e insere a nova **numa transação**; se houver ativa **posterior**, a nova termina na véspera dela | `FR-019`, `FR-024` |
| `app.lancamentos_que_travam_vigencia(vigencia_id, desde)` | função | `SECURITY DEFINER`, `STABLE` | primeiro lançamento encontrado (tipo, data, turma, atividade, ponta que falta) e a contagem, nas 3 tabelas e no alcance global | `FR-021.2`, `FR-021.4` a `FR-021.6` |
| `app.travar_curso_para_correcao(curso_id)` | função | `SECURITY DEFINER` | `FOR UPDATE` nas turmas (por `id`) e no curso, e trava compartilhada da atividade global | `FR-021.3`, R-7 |
| `public.corrigir_vigencia_regime(vigencia_id uuid, sucessora jsonb)` | RPC | **invoker** — a RLS de `horarios` vale | trava → confere → cancela → insere a sucessora, **numa transação**; devolve a sucessora ou a recusa estruturada | `FR-021.1`, `FR-021.3` |
| `public.criar_curso_com_regime(curso jsonb, regime jsonb)` | RPC | invoker | curso e vigência `padrao` **numa transação** — o único caminho da tela, e o que o gatilho adiado exige **[B-15]** | `FR-019.5` |
| `public.protecao_das_vigencias_por_atividade_global(curso_id uuid)` | RPC de **leitura** | `SECURITY DEFINER`, `STABLE`; porteiro `app.pode('turmas','editar')` e alcance do curso — senão, vazio | para cada vigência ativa do curso: se está travada por **lançamento próprio**, e cada atividade global que a trava, com data e **as turmas** pelas quais a alcança **[B-5, opção C]** | `FR-021.8` |
| `app.curso_em_oferta`, `app.turma_em_oferta`, `app.disciplina_em_oferta` | funções | `SECURITY DEFINER`, `STABLE` | usadas nas 31 policies de escrita; `turma_em_oferta(null)` é verdadeiro | `FR-017.5`, R-3 |
| `app.travar_atividade_global()` | gatilho em `atividades_nao_letivas` | invoker | trava exclusiva quando global | `FR-021.7` |
| `app.cursos_do_usuario()` | **alterada** | inalterado | sem filtro de situação nos três ramos | `FR-017.1` |
| `public.sincronizar_habilitacoes()` | **alterada** | inalterado | ignora curso inativo na inativação; recusa marcar | `FR-017.9` |

**Não alteradas nesta fatia:** `app.proximo_codigo_vinculo()` e `app.proximo_codigo_instrutor()` —
**[B-6]**: PR próprio depois do PR de banco, pendência **T132** da spec 006.

**Por que a proteção das vigências é leitura no banco e decisão em `lib/dominio/` [B-5].** O aviso
precisa responder *"o que deixa de estar protegido **se** a janela for esta?"* — e a janela nova só
existe no formulário. A RPC entrega, no carregamento da ficha, o **fato** que só o banco sabe inteiro —
inclusive atividade e turma que a RLS talvez não mostre a quem edita, sem expor mais que código, data e
nome —; a função pura `lib/dominio/protecao-de-vigencia.ts` recalcula a cada mudança de data ou de curso
(`FR-043`). A **trava** continua sendo só do banco (`app.lancamentos_que_travam_vigencia`); o aviso não a
substitui. O pgTAP e o Vitest usam **os mesmos casos semeados**, para as duas leituras não divergirem.

**Toda função nova ou alterada**: `revoke all … from public` **e** `from anon`, `grant execute` só a
quem chama — o que o `FR-046` pede e as migrations da fatia (c) fazem. As RPCs declaram no PR por que
não são Server Action (Princípio XI.5).

**Sequências novas**: `app.turma_disciplina_codigo_seq` e `app.curso_regime_historico_codigo_seq`.
O `setval` da migration usa `is_called = false` quando a tabela está vazia — `pnpm db:reset` aplica
as migrations **antes** de qualquer carga, e `setval(…, 0)` falharia. A carga do ETL deixa as duas
**atrás**; o passo novo do ETL (R-16) as avança.

**Gatilhos adiados e pgTAP.** Os arquivos pgTAP rodam dentro de `begin … rollback` — **gatilho adiado
nunca dispara neles**. Os testes existentes não quebram por causa dos dois gatilhos adiados, e os
testes **novos** deles MUST usar `set constraints … immediate` antes da escrita — senão passam **sem
provar nada**. Já a RLS e a ponta a ponta gravam pela API, uma transação por chamada: ali o curso
**sem** vigência é recusado, e as amostras passam a criar curso pela RPC (R-21).

---

## 3. As 31 policies de escrita que ganham "em oferta"

Condição acrescentada ao `WITH CHECK` do `INSERT` e ao `USING`/`WITH CHECK` do `UPDATE`:

| Tabela | Chave de oferta | Observação |
|---|---|---|
| `turmas`, `curso_regime_historico`, `responsaveis_curso`, `disciplinas`, `unidades_ensino`, `avaliacoes_planejadas`, `registros_aula`, `avaliacoes`, `janelas_curso`, `planejamento_anual`, `reservas_proens` | `curso_em_oferta(curso_id)` | linha com `curso_id` nulo (sentinela `GERAL`) continua aceita — não há curso a estar fora de oferta |
| `turma_disciplina`, `turma_disciplina_instrutor`, `atividades_nao_letivas` | `turma_em_oferta(turma_id)` | `turma_id` nulo (atividade global) devolve verdadeiro |
| `instrutor_disciplina` | `disciplina_em_oferta(disciplina_id)` | é com ela que o ajuste de `sincronizar_habilitacoes` convive |
| `cursos` | **nenhuma** | a exceção cirúrgica mora no gatilho (§2) |

A contagem — **31** policies em **16** tabelas — foi medida em R-1 e é conferida por pgTAP: uma
asserção negativa por tabela, com curso inativo, e o total de policies de escrita com a condição.

---

## 4. Invariantes — cada uma vira asserção pgTAP nomeada

| # | Invariante | Arquivo | Origem |
|---|---|---|---|
| I-1 | As 8 salas existem com `ambiente_virtual` explícito; sala **sem a chave**, com a chave **nula** e com valor **não booleano** recusada, **3 de 3**; nenhuma sala de turma fora da lista; 9 turmas com `Laboratório de Informática`; as 2 vazias continuam vazias | `099_salas.sql` | `FR-029` a `FR-029.7`, `SC-014.2`, `SC-014.4` |
| I-2 | Sala desativada continua aceita em `UPDATE` de turma; `tipo_atividade` inativo continua **recusado** | `099_salas.sql` | `FR-029.4`, R-4 |
| I-3 | Curso sem modalidade ou sem duração recusado; Regular sem limite → 1; Expedito sem limite → 2; Expedito com 1 explícito → 1; `ead_semipresencial` recusado; turma sem modalidade recusada | `100_curso_obrigatorios.sql` | `FR-003.1`, `FR-003.2`, `FR-015`, `SC-001.4` |
| I-3b | Troca de sigla grava **uma** linha com sigla anterior, nova, autor e momento; reenviar a mesma sigla não grava nada; `UPDATE`, `DELETE` e `TRUNCATE` na tabela recusados, **inclusive** como `service_role`; **zero** códigos de turma mudam; turma criada depois usa a sigla nova; sigla anterior de outro curso recusada, com curso e data na mensagem, **por criação e por edição**; volta do curso à própria sigla **aceita** | `100_curso_obrigatorios.sql` | `FR-014.1` a `FR-014.3`, `SC-001.6`, `SC-001.7` |
| I-4 | Código de turma gerado; divergente recusado; imutável; os **4** caminhos de colisão recusados quando colidem e aceitos quando não; rótulo fora de `T<n>` recusado | `101_turma_codigo_e_rotulo.sql` | `FR-025.1`, `FR-025.2`, `FR-026`, `SC-004.2`, `SC-004.4` |
| I-5 | `CAHO 2027` nasce com 22 linhas e `C-Esp-ALH 2027` com 8; herança só com janela completa; sem datas → 100% `nao_informado`; falha desfaz a turma; sequência `TDI-` nunca atrás do maior código | `102_turma_disciplina_nasce.sql` | `FR-032` a `FR-032.3`, `SC-004.3` |
| I-6 | Operador `expedito`: vigência, turma e status aceitos em `C-Exp-BATI`, recusados em `CAHO`; `desativar` só para os três; linha `horarios` inteira do documento 01 | `103_permissoes.sql` + RLS negativa | `FR-024`, `FR-024.1`, `FR-028`, `FR-017`, `SC-005.1` |
| I-7 | **`RN-2027-09`**: três vigências sucessivas pela RPC, um lançamento de cada período resolve para a certa; parâmetro alterado recusado; `vigente_ate` sem sucessora recusado no fim da transação; sobreposição direta **continua** `23P01`; vigência nova sobre lançamento já gravado recusada, **um caso por tabela** | `104_vigencia_regime.sql` | `FR-019`, `FR-019.4`, `FR-020`, `SC-006`, `SC-011.3` |
| I-8 | Correção: **18 de 29** corrigíveis; recusa nas 11, **um caso por tabela**; atividade global nos **4** resultados; mesma `vigente_de` aceita; `vigente_de` mudado confere a menor data | `104_vigencia_regime.sql` | `FR-021.1` a `FR-021.6`, `FR-021.9`, `SC-011.1`, `SC-011.2` |
| I-8b | Curso sem vigência `padrao` recusado **com `set constraints immediate`**, por inserção solta e por cancelamento da única; curso e vigência juntos pela RPC aceitos | `104_vigencia_regime.sql` | `FR-019.5`, `SC-011.4` |
| I-8c | A RPC de proteção devolve, para uma atividade global semeada, a vigência travada só por ela e as turmas que a alcançam; vigência com lançamento próprio vem marcada como tal; perfil sem `turmas.editar` recebe vazio | `104_vigencia_regime.sql` | `FR-021.8`, `SC-011.5` |
| I-9 | Curso inativo: legível no escopo; escrita recusada nas **16** tabelas; reativação aceita só pela situação e por valor; desativar com turma pendente recusado nomeando as turmas | `105_curso_inativo.sql` | `FR-017` a `FR-017.8`, `SC-001.3`, `SC-001.5` |
| I-10 | `app.cursos_do_usuario()` devolve curso inativo nos três ramos, e só no escopo; `sincronizar_habilitacoes` ignora curso inativo e recusa marcar | `105_curso_inativo.sql` | `FR-017.1`, `FR-017.9` |
| I-11 | O parâmetro do 9º TA existe, com valor 2, natureza `operacional` e fundamento preenchido | `104_vigencia_regime.sql` | `FR-023`, `SC-011.7` |

**Ponto de partida medido:** **167** asserções pgTAP na `main` hoje (soma dos `plan()` dos 18
arquivos); os 5 arquivos da fatia (c) somam **59**. Esta fatia acrescenta **~112**.

---

## 5. Plano de reversão, por migration

| # | Reverte com | O que fica |
|---|---|---|
| 1 | `drop trigger` da sala; volta `app.validar_dominio_config_lista()` sem o terceiro argumento; `drop constraint config_listas_sala_com_natureza`; `update config_listas set ativo = false` nas 8 salas; `UPDATE` de volta `Laboratório de Informática` → `Laboratório de informática` **nas 9 turmas listadas no comentário** | a coluna `metadados` — **nunca `drop column`** (`CLAUDE.md`): vira `-- [APOSENTADA — v2.1]` |
| 2 | recoloca os dois `default`; `drop not null` em `duracao_dias` e `turmas.modalidade`; restaura o `CHECK` de classificação; `drop` do `CHECK` de rótulo; `drop trigger` do limite, da troca de sigla e da sigla de outro curso | **a tabela `curso_sigla_historico` fica**, com o que registrou, e com os gatilhos que a protegem — nunca `drop table` com histórico; perde só o gatilho que a alimenta |
| 3 | `drop trigger` do código; restaura o `UNIQUE` sem `NULLS NOT DISTINCT` | turmas criadas continuam com o código gerado |
| 4 | `drop trigger` de nascimento; `alter column codigo drop default`; `drop sequence` | linhas já nascidas **ficam** (regra 4) |
| 5 | `update perfil_permissao set permitido = false` nas linhas novas; policies de regime de volta a `cursos.editar` | as linhas, com `permitido = false` |
| 6 | `drop` dos gatilhos (inclusive os dois adiados), das RPCs e das funções; restaura `regime_unico_por_inicio`; `drop default` do código; o parâmetro do 9º TA passa a `status = 'inativo'` | vigências registradas e canceladas **ficam** — são fato; o parâmetro fica, inativo. ⚠️ Restaurar a unicidade **falha** se existir cancelada com a mesma data de uma ativa; a reversão então para e é relatada |
| 7 | restaura `cursos_do_usuario()` com o filtro, as 31 policies e `cursos_criar`; `drop trigger` de `cursos`; restaura `sincronizar_habilitacoes` | nenhum dado; curso inativo volta a sumir **com** o histórico |

A reversão vai **da 7 para a 1**. Nenhuma migration posterior depende da lista de salas, então
reverter só a 1 também é seguro.
