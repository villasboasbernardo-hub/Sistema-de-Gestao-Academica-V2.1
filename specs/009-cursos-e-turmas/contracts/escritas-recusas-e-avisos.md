# Contrato — escritas, recusas do banco e avisos

**Fase 1** · 17/09/2026, revisado com as respostas ao lote único · molde:
[`lib/acoes/instrutor.ts`](../../../lib/acoes/instrutor.ts) (fatia c) · desenho do banco:
[data-model.md](../data-model.md)

> ⚠️ **Quem nega é o banco; este contrato diz como a negativa chega à pessoa.** A Server Action recusa
> cedo pelo Zod e **traduz** — nunca decide sozinha o que o banco decide (Princípio XI; `FR-042`,
> `FR-044`). **Nenhuma** usa `service_role`.

As decisões de Bernardo de 17/09/2026 estão aplicadas, inclusive as da segunda e da terceira rodadas. **Não
há pergunta aberta.**

---

## 1. As Server Actions

Todas: `safeParse` do Zod **na primeira linha**; resultado `{ ok: true, … } | { ok: false, mensagem }`
no padrão de `lib/acoes/instrutor.ts`; `revalidatePath` das rotas afetadas; **nenhum** `await` em laço.
Uma ação de **edição** nunca manda `status` junto com outros campos, e nunca manda `codigo` de turma.

| Arquivo · ação | Envia ao banco | Esquema Zod (`lib/validacao/`) | Sucesso | Origem |
|---|---|---|---|---|
| `curso.ts` · `criarCurso` | RPC `criar_curso_com_regime(curso, regime)` — **o único caminho**: o banco recusa curso sem vigência `padrao` no fim da transação | `curso.ts`: sigla, nome, classificação (as 5), modalidade **sem padrão**, duração em dias obrigatória; limite **opcional** — ausente vai **nulo** ao banco; semanas e propósito opcionais; **regime `padrao` obrigatório** | `router.push` para `/cursos/[sigla]` | `FR-013`, `FR-015`, `FR-019.5` |
| `curso.ts` · `editarCurso` | `update cursos` — **sem** `status` | o mesmo, sem regime | volta à página do curso — **pela sigla nova**, se ela mudou | `FR-016`, `FR-014.1`, `FR-016.1` |
| `curso.ts` · `desativarCurso` | `update cursos set status = 'inativo'` — **só** a situação | `{ sigla }` | a página mostra "inativo" | `FR-017`, `FR-017.4` |
| `curso.ts` · `reativarCurso` | `update cursos set status = 'ativo'` — **só** a situação | `{ sigla }` | idem | `FR-017.7` |
| `vigencia-regime.ts` · `registrarVigencia` | RPC `registrar_vigencia_regime(curso_id, vigencia)` — fecha a anterior e insere, numa transação (R-19) | `vigencia-regime.ts`: tipo, `vigente_de` obrigatório, parâmetros, fundamento, motivo | histórico de vigências atualizado | `FR-019`, `FR-019.4`, `FR-024` |
| `vigencia-regime.ts` · `corrigirVigencia` | RPC `corrigir_vigencia_regime(vigencia_id, sucessora)` | o mesmo esquema | a sucessora no lugar; a cancelada **marcada** no histórico | `FR-021.1`, `FR-021.3`, `FR-011` |
| `turma.ts` · `criarTurma` | `insert turmas` — **sem** `codigo`; o curso vem do caminho | `turma.ts`: ano, rótulo vazio ou `T<n>`, modalidade **sem padrão**, status obrigatório, janela, sala, efetivo | `router.push(enderecoDaTurma(codigo))` — a ficha, **nunca** a lista | `FR-025`, `FR-025.2`, `FR-031.6` |
| `turma.ts` · `editarTurma` | `update turmas` — **sem** `codigo` | o mesmo | a ficha | `FR-026`, `FR-028`, `FR-021.8` |
| `sala.ts` · `acrescentarSala` | `insert config_listas` com `lista = 'salas'` e `metadados.ambiente_virtual` | `sala.ts`: nome e **natureza obrigatória, sem padrão** | a lista | `FR-029.2`, `FR-029.6`, `FR-029.7` |
| `sala.ts` · `desativarSala` / `reativarSala` | `update config_listas set ativo = …` — **só** `ativo` | `{ valor }` | a lista | `FR-029.4`, `FR-029.5` |

⚠️ **A troca de sigla** grava a auditoria **no banco**, por gatilho, em `curso_sigla_historico`, e não pela
ação — nenhum caminho de edição a esquece (`FR-014.1`). E **não** toca código de turma: nem a ação, nem o
banco cascateiam a sigla nova (`FR-014.2`). Para montar o diálogo, a leitura da página conta as turmas do
curso — as que ficam com a sigla antiga.

⚠️ **Por que a reativação manda só a situação, se o banco aceita a linha inteira** (`FR-017.7`): o
gatilho decide **por valor**, e aceitaria o formulário inteiro reenviado; mandar só a coluna é o que
o requisito exige da **ação**, e é o que impede uma edição de viajar junto por engano.

⚠️ **Por que três RPCs de escrita, e não Server Action com várias escritas** (Princípio XI.5): chamadas
separadas a partir da aplicação **não são uma transação** (`FR-021.1`, *"a transação é do banco"*). Curso
e vigência `padrao` só existem **juntos** (`FR-019.5`); a anterior só se fecha **junto** com a sucessora
(`FR-020`); a cancelada só sai **junto** com a correção. Cada RPC é `SECURITY INVOKER`: a RLS e a matriz
continuam decidindo.

**Uma RPC de leitura**, `protecao_das_vigencias_por_atividade_global(curso_id)`, chamada pelo **Server
Component** da ficha da turma no carregamento — não por Server Action (Restrição 5). Ver §3.

⚠️ **Nota de 17/09/2026 — como a sala emite a chave, e por que não foi preciso emendar esta tabela
(achado E-8).** A linha `sala_fora_da_lista` prometia chave estável e `DETAIL` estruturado, e o gatilho
genérico de domínio não os emitia: ele usa o `HINT` para uma frase humana e não manda `DETAIL`. Emendar a
função para todo mundo mudaria o `HINT` dos **quatro** gatilhos que já a usam, contra o *byte a byte* do
R-4; envolvê-la num gatilho próprio de sala duplicaria a regra em duas implementações.
**Caminho seguido — o da exceção autorizada:** a própria **B-2/R-4** já tinha decidido parametrizar a
função, e o parâmetro foi **estendido**: `TG_ARGV[3]` opcional carrega a chave estável, e quando ela vem,
a recusa sai com `hint = <chave>` e `detail = {valor, lista}`. **Os quatro consumidores existentes passam
dois argumentos e não mudaram em nada** — o `099_salas.sql` prova as duas metades: a sala emite
`sala_fora_da_lista`, e o `tipo_atividade` inativo continua com o `HINT` de sempre e **sem** `DETAIL`.
*(decisão de Bernardo Villas Boas, 17/09/2026)*

---

## 2. As recusas e a tradução

O banco recusa com `SQLSTATE` e, nas regras desta fatia, com **`HINT` = chave estável** e **`DETAIL` =
JSON** com os dados que a mensagem nomeia. A Server Action lê **código, chave e dados** — **nunca**
mostra o `message` cru (`RN-DEG-01`, `FR-021.4`).

| Chave (`HINT`) | `SQLSTATE` | Quem recusa | Dados (`DETAIL`) | Mensagem de negócio | Origem |
|---|---|---|---|---|---|
| `curso_com_turma_pendente` | `23514` | gatilho de `cursos` | `curso`, `turmas: [{codigo, status}]` | *"Não é possível desativar: {n} turma(s) planejada(s) ou ativa(s) — {lista}. Conclua ou cancele cada uma primeiro."* | `FR-017.4` |
| `curso_inativo_so_reativa` | `23514` | gatilho de `cursos` | `curso`, `colunas: [...]` | *"O curso está inativo. Reative-o antes de editar."* | `FR-017.5`, `FR-017.7` |
| `situacao_sem_permissao` | `42501` | gatilho de `cursos` | `curso` | *"O seu perfil não desativa nem reativa curso."* | `FR-017` |
| `sigla_de_outro_curso` | `23505` | gatilho de `cursos` — **recusa, nunca aviso** | `sigla`, `curso_sigla_atual`, `curso_nome`, `deixada_em` | *"A sigla {sigla} identificou o curso {curso_sigla_atual} — {curso_nome} — até {deixada_em}, e continua nos códigos das turmas dele. Escolha outra sigla."* A sigla que foi do **próprio** curso **não** cai aqui | `FR-014.3` |
| (restrição `cursos_codigo_key`) | `23505` | `UNIQUE` | — | *"Já existe curso com a sigla {sigla}."* | `FR-014` |
| `curso_sem_regime` | `23514`, **no `COMMIT`** | gatilho adiado | `curso` | *"Todo curso tem regime de horário. Informe o regime padrão junto com o curso."* — e, no cancelamento: *"Esta é a única vigência padrão do curso; registre a que a substitui."* | `FR-019.5` |
| `codigo_de_turma_divergente` / `codigo_de_turma_imutavel` | `23514` | gatilho de `turmas` | `esperado` — e `recebido` só na divergente | *"O código da turma é gerado pelo sistema e não muda."* | `FR-025.1` |
| (restrição `turmas_unica_por_ano`) | `23505` | `UNIQUE NULLS NOT DISTINCT` | — | *"Já existe a turma {codigo} com {este rótulo \| sem rótulo} em {sigla} {ano}. Escolha outro rótulo."* — a ação **lê** a turma ocupante, que está no mesmo curso e portanto no alcance | `FR-026` |
| (restrição `turmas_rotulo_forma`) | `23514` | `CHECK` | — | *"O rótulo da turma é T seguido do número — T1, T2."* | `FR-025.2` |
| `sala_fora_da_lista` | `23514` | gatilho genérico, **pelo 4º argumento** ⚠️ | `valor`, `lista` | *"A sala {valor} não está na lista de salas. Salas novas são acrescentadas em Administração › Salas."* | `FR-029`, `FR-029.2` |
| (restrição `config_listas_sala_com_natureza`) | `23514` | `CHECK` | — | *"Informe se a sala é física ou ambiente virtual."* | `FR-029.6`, `FR-029.7` |
| (restrição `cursos_classificacao_nao_geral`) | `23514` | `CHECK` | — | *"Esta classificação não é aceita para curso."* | `FR-003.1` |
| (`NOT NULL`) | `23502` | coluna | coluna | *"{Campo} é obrigatório."* | `FR-015` |
| `vigencia_imutavel` ⚠️ | `23514` | gatilho de vigência | `vigencia`, `colunas` | *"Vigência registrada não muda. Para mudar o regime a partir de uma data, registre nova vigência."* | `FR-020` |
| `vigencia_cancelada_imutavel` ⚠️ | `23514` | gatilho de vigência — **três `raise`, uma chave** | `vigencia` | *"Esta vigência está cancelada e não recebe alteração nem volta a valer. Registre uma vigência nova a partir da data que passa a valer."* | `FR-020`, `FR-021.3` |
| `vigencia_sem_sucessora` | `23514`, **no `COMMIT`** | gatilho adiado | `vigencia`, `sem_regime_a_partir_de` | *"Uma vigência só é encerrada quando a seguinte é registrada."* | `FR-020` |
| `vigencia_com_lancamento` | `23514` | gatilho de vigência / RPC | `vigencia`, `tipo`, `data`, `turma`, `atividade`, `total`, `ponta_ausente` | *"Esta vigência já tem {total} lançamento(s) — o primeiro: {tipo} de {data} em {turma}. Para mudar o regime, registre nova vigência a partir de uma data."* Com atividade global: nomeia **a atividade e a turma**; com janela incompleta: diz **qual ponta falta** | `FR-021.2`, `FR-021.4` a `FR-021.6` |
| `vigencia_reinterpretaria_lancamento` | `23514` | gatilho de inserção de vigência | `vigente_de`, `tipo`, `ultimo_lancamento`, `turma`, `atividade`, `total`, `ponta_ausente` — **sem** `data` e **sem** `vigencia` | *"Uma vigência a partir de {data} mudaria o horário de {total} lançamento(s) já gravado(s) — o último em {data}. Escolha uma data posterior."* | `FR-019.4`, `RN-2027-09` |
| (impasse) | `40P01` | motor | — | *"Outra gravação no mesmo curso aconteceu ao mesmo tempo. Tente de novo."* | `FR-021.3`, R-7 |
| `habilitacao_em_curso_inativo` | `23514` | `sincronizar_habilitacoes` | `disciplinas` | *"{Disciplina} é de curso inativo e não recebe habilitação nova."* | `FR-017.9` |
| (RLS) | `42501` | policy | — | ver abaixo | `FR-044`, `FR-017.5` |

⚠️ **EMENDA DE 23/09/2026 — a tabela nomeava uma chave que o banco NÃO emite, e omitia uma que ele
emite** *(decisão de Bernardo Villas Boas)*. Achado ao escrever `lib/acoes/traducao-de-recusas.ts`
(T113), medindo `pg_proc.prosrc` **sem comentário** (regra 9.1.1 do `CLAUDE.md`) e `pg_constraint` no
banco local:

| A tabela dizia | O banco emite |
|---|---|
| `vigencia_parametro_imutavel` | **`vigencia_imutavel`** — `app.guardar_vigencia_de_regime()` |
| *(não listava)* | **`vigencia_cancelada_imutavel`** — a mesma função, em **três `raise`** |

⚠️ **A PRIMEIRA SERIA MUDA, e é por isso que ela importa mais que a segunda.** Uma tradução escrita
contra `vigencia_parametro_imutavel` **nunca dispararia**: o `HINT` não casaria, a recusa cairia na
frase genérica do `23514`, e a pessoa leria *"o banco recusou a gravação: um campo não atende à
regra"* em vez de *"vigência registrada não muda"*. Nada acusaria — nem teste, nem tipo, nem lint —,
porque uma chave que não casa não é erro, é só uma chave que não casa.

A `vigencia_cancelada_imutavel` sai de **três** recusas com a **mesma** chave e a **mesma** mensagem:
vigência cancelada não recebe data de término, não volta a `ativo`, e a única mudança de situação
aceita é o cancelamento. Uma chave por **consequência para quem está na tela**, não por `raise`.

⚠️ **E as colunas de `DETAIL` da tabela acima foram remedidas na mesma leitura**, porque o modo de
falha é o mesmo em menor grau: ler um campo que o `raise` não manda devolve `undefined`, a mensagem
degrada para a forma genérica, e ninguém percebe. As correções estão nas linhas: `curso` em três
recusas, `sigla` na de sigla, `sem_regime_a_partir_de`, `vigencia`, `recebido`, e a
`vigencia_reinterpretaria_lancamento`, que manda `vigente_de` e **não** manda `data` nem `vigencia`.

⚠️ **O `.md` é o que vale, e o `.docx` não recebeu esta emenda** (regra de precedência de 17/09/2026).

⚠️ **Recusa no `COMMIT` chega depois do último comando.** Os dois gatilhos adiados só falam quando a
RPC termina; a mensagem é a mesma, mas a tradução mora na leitura do **resultado da RPC**, não de um
comando intermediário.

⚠️ **`UPDATE` barrado pela RLS não dá erro nenhum.** Quando o `USING` da policy exclui a linha — curso
inativo, fora do escopo —, o motor atualiza **zero linhas** e responde sucesso; só o `WITH CHECK` gera
`42501`. Toda ação de edição pede a linha de volta (`.select()`) e trata **zero linhas como recusa** —
é o gotcha nº 4 do `CLAUDE.md` do lado da escrita, e o pgTAP de curso inativo tem um caso para cada
forma.

⚠️ **A recusa da RLS não diz o motivo, e a mesma negativa tem duas causas.** Uma escrita em curso
**inativo** e uma escrita **fora do escopo** chegam iguais. A ação distingue **antes** de traduzir,
lendo a situação do curso — que é legível no escopo (`FR-017.1`): curso inativo → *"O curso {sigla} está
inativo e não recebe {turma nova \| vigência nova \| …}."*; senão → *"O seu perfil não pode fazer esta
alteração neste curso."* Nenhuma das duas revela dado fora do alcance: se o curso não é legível, a
mensagem é a segunda. **Curso nasce ativo** é a policy `cursos_criar` — a ação nunca manda situação na
criação, e só outro caminho chega a essa recusa.

---

## 3. Os avisos — listas abertas, em `lib/dominio/`

Cada tipo é **função pura** com teste Vitest, com o identificador e a citação no topo (`FR-043`).
**Nenhum** bloqueia gravação (`RN-DEG-02`). Tipo com contagem zero não aparece; sem aviso nenhum, o
quadro diz isso (`FR-010`).

### Curso — `lib/dominio/avisos-do-curso.ts` (`FR-010`, `FR-010.1`)

| Tipo | Dispara quando | Base de 16/09/2026 |
|---|---|---|
| `sem_duracao_semanas` | `duracao_semanas` vazia | **12** |
| `sem_proposito` | `proposito` vazio ou só espaços | **10** |
| `acima_do_limite` | num ano letivo, contam mais turmas que o limite | **0** |

### Turma — `lib/dominio/avisos-da-turma.ts` (`FR-028.1`, `FR-028.4`)

| Tipo | Dispara quando | Base de 16/09/2026 |
|---|---|---|
| `ativa_com_termino_passado` | `ativa` e `data_termino` **estritamente anterior** a hoje | **1** |
| `planejada_com_inicio_passado` | `planejada` e `data_inicio` **estritamente anterior** a hoje | **10** |
| `sem_janela` | `data_inicio` ou `data_termino` vazia | **1** |
| `sem_sala` | `sala_alocada` vazia | **2** |
| `sem_efetivo_fora_de_planejada` | `alunos` vazio **e** status diferente de `planejada` | **0** |
| `sem_disciplina` | nenhuma linha ativa de `turma_disciplina` | **0** |

O quadro da turma mora na **ficha** `/turmas/[turma]`. Na lista de turmas da página do curso, cada
linha mostra **só a contagem** de avisos da turma, com link para a ficha.

### Limite de turmas — `lib/dominio/limite-de-turmas.ts` (`FR-030`, `FR-030.1`)

```text
STATUS_QUE_CONTAM = ['planejada', 'ativa', 'concluida']   // enumeração positiva — nunca "≠ cancelada"
```

- Mensagem, nos **dois** lugares: *"Este curso já tem {n} turma(s) em {ano}, e o limite é {limite};
  confirmar mesmo assim?"* (diálogo) e *"{ano}: {n} turmas, limite {limite}"* (quadro).
- Gravações que avisam: criar turma; mudar o ano; mudar o curso; mudar o status de `cancelada` para
  um dos três; **baixar o limite do curso** abaixo da contagem de algum ano — uma mensagem por ano.
- O teste prova a enumeração com um **status inventado**: a função recebe um quinto valor e **não** o
  conta.

**De onde vem a contagem.** Da **leitura da página**, no servidor — `turmas (curso_id, ano_letivo,
status)` no alcance, numa consulta —, e a folha de cliente do formulário recalcula com a função pura
a cada mudança de ano, curso ou status. **Nenhuma** Server Action de leitura (Restrição 5).

### Vigências que deixam de ficar protegidas — `lib/dominio/protecao-de-vigencia.ts` (`FR-021.8`)

- **Entrada:** o que a RPC de leitura devolveu no carregamento da ficha — para cada vigência ativa do
  curso, se está travada por **lançamento próprio**, e cada atividade global que a trava, com data e as
  **turmas** pelas quais a alcança —; as janelas atuais das turmas do curso; e **a janela e o curso que a
  pessoa está digitando** para esta turma.
- **Saída:** as vigências que **perdem** a proteção — travadas **só** por atividade global que, com a
  mudança, **nenhuma** turma do curso alcança mais. Vigência com lançamento próprio, ou ainda alcançada por
  outra turma, **não** entra.
- **Mensagem, no diálogo de salvar:** *"Com esta janela, deixam de estar protegidas: vigência {tipo} de
  {vigente_de} ({codigo}) — travada pela atividade {atividade} de {data}. Elas poderão ser corrigidas.
  Salvar mesmo assim?"* Uma linha por vigência; **nenhuma** vigência afetada, **nenhum** aviso.
- **Mudar o curso** da turma avalia o curso **de origem** — é dele que a turma sai.
- Base de 16/09/2026: **zero** atividades globais — o teste semeia a própria, e os **mesmos casos**
  alimentam o pgTAP da RPC e o Vitest da função, para as duas leituras não divergirem.

### Segunda turma do ano — no formulário de criação (`FR-026.1`)

Quando o curso já tem turma **sem rótulo** no ano escolhido, o formulário **exige rótulo** e mostra, junto
do campo: *"A turma {codigo} está sem rótulo. Dê rótulo a esta (T2, por exemplo); a outra pode ser editada
para T1 — o código dela não muda."* É **nota no formulário**, não diálogo, e não confirma nada.

### Sala em uso — `lib/dominio/salas.ts` (`FR-029.4`)

Desativar sala **em uso** abre o diálogo listando as turmas que a referenciam, e **permite
prosseguir**. Base de 16/09/2026: `Sala 04` → **5**; `Moodle` → **6**; `Laboratório de Informática` →
**9**. A natureza física/virtual é lida de `metadados.ambiente_virtual`; **zero** comparações com o
texto `'Moodle'` em código de regra (`SC-014.2`).

---

## 4. Confirmação antes de salvar — só o que é difícil de desfazer

`DialogoConfirmacao` do Épico 4 (b) (`FR-018`, `FR-048`). Lista **fechada** pelo `FR-018.1` (A-9,
17/09/2026): *"confirmação em toda gravação treina a pessoa a clicar sem ler, e a confirmação falha
exatamente quando importa"*.

| Gravação | Confirma quando | O diálogo diz |
|---|---|---|
| desativar curso | **sempre** | que o curso sai de oferta e as turmas continuam consultáveis |
| reativar curso | **sempre** | que o curso volta a receber turma e lançamento |
| registrar vigência | **sempre** | a data a partir da qual vale, e que ela **não** poderá ser corrigida depois que houver lançamento |
| corrigir vigência | **sempre** | que a atual é cancelada e a nova a substitui |
| editar curso | **só** se muda a **sigla**, muda a **classificação** ou baixa o **limite** abaixo da contagem | sigla, **com todas as letras** (`FR-014.2`): *"Trocar a sigla de {antiga} para {nova}: os links antigos deste curso deixam de funcionar. As turmas já criadas ({n}) continuam com {antiga} no código — como em {exemplo} —, porque o código é carimbado na criação e sai impresso no DSA. As turmas criadas daqui em diante usam {nova}. A troca fica registrada na auditoria."*; classificação: que os Operadores do escopo antigo deixam de alcançar o curso e os do novo passam a alcançar; limite: a mensagem do `FR-030` por ano |
| criar ou editar turma | **só** se passa do limite ou deixa vigência sem proteção | a mensagem do limite (`FR-030`) e/ou a das vigências (`FR-021.8`), **num diálogo só** |
| desativar sala | **só** se estiver em uso | as turmas que a referenciam (`FR-029.4`) |
| **todas as outras** | **nunca** | — |

O teste do `SC-002.3` percorre cada gravação da fatia e confere os dois lados: o diálogo aparece nas da
lista e **não** aparece nas outras.
