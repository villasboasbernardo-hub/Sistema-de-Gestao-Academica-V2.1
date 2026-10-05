# Estado atual — o que existe antes do Épico 6

> **Medido em 05/10/2026**, antes de escrever a spec. Cada número nomeia o artefato contra o qual foi
> medido (regra 9.2) e nenhuma afirmação de resultado foi escrita antes da medição (regra 9.3).
>
> ⚠️ **SÃO DOIS ARTEFATOS DIFERENTES, E CONFUNDI-LOS SERIA O ERRO MAIS CARO DESTA PÁGINA.** A
> **estrutura** (coluna, restrição, view, policy, matriz) foi medida no **banco LOCAL** —
> `docker exec supabase_db_ciaara-11-v2-1 psql`. O **dado de negócio** NÃO: o local tem **resto de
> suíte** (155 cursos de teste, 0 turmas, 8 disciplinas, 1 instrutor), e medir ali diria coisas
> falsas sobre a operação. O dado é medido no **remoto, só por leitura**
> (`supabase db query --linked`), que é a fonte da verdade dos cadastros desde 24/09/2026.

---

## 1. A conclusão em uma página

| Pergunta | Resposta medida |
|---|---|
| As três tabelas de lançamento existem? | **Sim** — `registros_aula`, `avaliacoes`, `atividades_nao_letivas`, com RLS e policies |
| A grade tem de onde ler? | **Sim** — `vw_ocupacao_ta` une as quatro origens (aula, avaliação, vista, atividade) |
| O relógio existe? | **Sim, em DOIS lugares** — e isso é um achado, não uma redundância útil (§4) |
| O pré-preenchimento de H2 tem lastro? | **A coluna sim; o DADO não inteiro** — `turma_disciplina_unidade` existe e tem **0 linhas** no remoto (§5) |
| A assinatura tem de onde sair? | **Sim** — `responsaveis_curso` com vigência, papel, modo fixo/dinâmico e `exibir_no_dsa` |
| Falta tela? | **Tudo** — não existe `/turmas/[turma]/dsa`, não existe `/print/*`, não existe `GradeAlocacao`, não existe `lib/dominio/dsa/` |
| Falta migration? | **Candidata, não certa** — seis lacunas medidas (§7), e três delas podem morrer na resposta de uma pergunta |

---

## 2. As três tabelas de lançamento — colunas medidas

Fonte: `pg_attribute` do banco local, schema `public`.

### 2.1 `registros_aula` — 23 colunas

`id` · `codigo` · `data` · `turma_id` · `unidade_ensino_id` · `curso_id` · `instrutor_id` ·
`categoria_normativa` · `tipo_atividade` · `metodologia` · `tempos_consumidos` · `ta_inicial` ·
**`ta_final` (GERADA)** · `conteudo_resumo` · `local` · `observacoes` · `status` ·
`origem_migracao_v1` · o quarteto de auditoria · `disciplina_codigo_legado_v1`

- `ta_final` é `GENERATED`: `CASE WHEN ta_inicial IS NOT NULL THEN ta_inicial + tempos_consumidos - 1 END`.
  **O fim do bloco não se escreve** — ele é propriedade da linha.
- `instrutor_id` é **nulável na coluna** e obrigatória **por CHECK** para categoria `aula`.
- `unidade_ensino_id` é **nulável na coluna** e obrigatória **por CHECK** em dado novo.
- `metodologia`, `tipo_atividade` e `local` são **`text` sem FK** — ver §7.2.

### 2.2 `avaliacoes` — 31 colunas, e ela já faz mais do que o briefing supõe

⚠️ **DUAS COISAS QUE O BRIEFING DÁ COMO FALTANDO JÁ EXISTEM:**

- **`nome_fiscal_externo text`** (coluna 19), com o CHECK `aval_fiscal_exclusivo`
  (`fiscal_id IS NULL OR nome_fiscal_externo IS NULL`). O `RF-AVAL-06` — *"o fiscal pode ser
  qualquer pessoa, inclusive fora do cadastro"* — **está atendido estruturalmente**, e a
  "advertência de migração" do próprio requisito (*"a tentação de tornar o fiscal uma FK
  obrigatória é forte"*) **não foi cometida**: `fiscal_id` é nulável.
- **A vista de prova tem posição própria**: `data_vista_prova`, `ta_inicial_vista`,
  `tempos_consumidos_vista`, `local_vista` e `ta_final_vista` (gerada). O `CHECK`
  `aval_vista_apos_aplicacao` exige `data_vista_prova >= data_avaliacao`.

Também existe `item_planejado_id` → **`avaliacoes_planejadas`** (tabela presente), que é o
planejado × real do **Épico 8** — fora deste épico, mas o elo já está no lugar.

### 2.3 `atividades_nao_letivas` — 21 colunas

`categoria_normativa` (ENUM) · `subtipo text` · `escopo` (ENUM) · `turma_id` (**nulável**) ·
`data` · `descricao` (NN) · `tempos_consumidos` · `ta_inicial` · `ta_final` (gerada) · `local` ·
**`compoe_cht` (GERADA: `categoria_normativa <> 'Estudo_Individual'`)** · `observacoes`

- ⚠️ **NÃO HÁ COLUNA DE RESPONSÁVEL, PALESTRANTE NEM INSTRUTOR.** O briefing acerta: é a `Q-8`.
- `compoe_cht` gerada é a `RN-EVT-01` virada propriedade da linha: Estudo Individual fora da
  fórmula `CHT = CHD + AEC + TAD + TR`, sem depender de ninguém lembrar.

### 2.4 As restrições, medidas uma a uma

| Tabela | Restrição | O que ela diz |
|---|---|---|
| `registros_aula` | `reg_aula_ue_so_nula_no_historico` | UE obrigatória **salvo** linha com procedência **e nunca editada** |
| `registros_aula` | `reg_aula_instrutor_obrigatorio` | instrutor obrigatório **quando categoria = `aula`**, com a mesma catraca |
| `registros_aula` | `reg_aula_tempos_so_nulo_no_historico` | `tempos_consumidos` obrigatório, com a mesma catraca |
| `registros_aula` | `reg_aula_ta_valido` | `ta_inicial` entre **1 e 12** |
| `registros_aula` | `reg_aula_ue_do_curso` (FK composta) | a UE **tem de ser do curso** da linha |
| `registros_aula` | `reg_aula_turma_do_curso` (FK composta) | a turma **tem de ser do curso** da linha |
| `avaliacoes` | `aval_fiscal_exclusivo` | fiscal cadastrado **ou** nome externo, nunca os dois |
| `avaliacoes` | `aval_ta_coerente` | `ta_inicial` e `tempos_consumidos` nulos **juntos**, com a catraca do histórico |
| `avaliacoes` | `aval_vista_apos_aplicacao` | a vista não antecede a aplicação |
| `atividades_nao_letivas` | `ativ_escopo_coerente` | `turma` ⇒ `turma_id` presente; `global` ⇒ `turma_id` **nulo** |

⚠️ **A CATRACA É TRÊS VEZES A MESMA FORMA** — `origem_migracao_v1 IS NOT NULL AND editado_em IS NULL`
— e ela é o que faz a `Q-1` e a `Q-12` serem perguntas de **produto**, não de banco: **editar ou
mover uma linha histórica carimba `editado_em`, e no mesmo comando a linha deixa de ser isenta**.
Mover um lançamento de 2026 sem UE exige, no mesmo `UPDATE`, dar-lhe uma UE — ou a gravação é
recusada pelo banco. **Não há meio-termo, e afrouxar a catraca está proibido pelo pedido.**

---

## 3. A matriz de permissão, medida em `perfil_permissao` (176 linhas)

| Recurso | Quem cria/edita | Quem só lê |
|---|---|---|
| `registros_aula` | `admin`, `encarregado_administracao_academica`, `ajudante_administracao_academica`, `operador` | `chefe_departamento_ensino`, as duas de orientação pedagógica, `encarregado_curso`, `visualizacao` |
| `avaliacoes` | os mesmos quatro | os mesmos cinco |
| `atividades_nao_letivas` | os mesmos quatro | os mesmos cinco |
| `atividades_globais` | `criar` para `admin`, `encarregado_administracao_academica`, `ajudante_administracao_academica` | — (o `operador` **não** cria atividade global) |
| `horarios` | `admin`, encarregado, ajudante (com `desativar`); `operador` sem `desativar` | os demais |
| `calendario` | **só** `admin` e `encarregado_administracao_academica` | ninguém mais |

⚠️ **NÃO EXISTE A AÇÃO `desativar` PARA AS TRÊS TABELAS DE LANÇAMENTO.** A exclusão lógica é um
`UPDATE` de `status`, e portanto ela **anda na permissão `editar`** — quem edita exclui. Isso não é
lacuna a consertar nesta spec; é fato a declarar, porque um portão separado para excluir **não
existe** e inventá-lo seria regra nova.

⚠️ **A MARCA «(a) aguarda confirmação» ESTÁ NO BANCO, NÃO NUM DOCUMENTO — e ela NÃO NEGA NADA.**
Medido: **12 linhas** a carregam, em `observacao`, para `encarregado_administracao_academica` e
`ajudante_administracao_academica` nas ações `criar` e `editar` dos três recursos; e em todas elas
`permitido = true`. Na matriz inteira, **40 linhas** têm `observacao` e **0 linhas** têm
`permitido = false`. **Hoje os dois perfis lançam no DSA**; a `Q-15` é sobre **manter ou revogar**,
não sobre liberar.

### 3.1 As policies, e a frase que elas repetem

As três tabelas têm a mesma forma de leitura:

```
app.pode('<recurso>','ler') AND app.alcanca_turma(turma_id)
```

e de escrita, com um porteiro a mais:

- `registros_aula_editar` e `avaliacoes_editar` exigem **`app.curso_em_oferta(curso_id)`**;
- `atividades_nao_letivas_editar` exige **`app.turma_em_oferta(turma_id)`** e, para atividade
  global, **`app.pode('atividades_globais','criar')`**.

⚠️ **CONSEQUÊNCIA MEDIDA PARA A H5 E PARA A IMPRESSÃO DE SEMANA ANTIGA:** editar ou mover
lançamento de **curso fora de oferta** é recusado pelo banco. **Ler e imprimir seguem valendo** — as
policies de `SELECT` não têm esse porteiro. O critério 3 do documento 06 (*"reimprimir hoje um DSA de
março"*) está do lado permitido; **reabrir março para mexer não está**, e a tela precisa dizer isso
em português em vez de deixar o `42501` chegar cru.

---

## 4. O relógio existe em DOIS lugares, e eles não concordam

### 4.1 `configuracoes_horario` + `horarios_tempos_aula` — o catálogo

- `configuracoes_horario`: `codigo`, `nome_config`, `status` (`ativo | substituido`),
  `substituida_por_id`. ⚠️ **A vigência dela NÃO é `vigente_de`/`vigente_ate`** — é
  substituição encadeada.
- `horarios_tempos_aula`: `configuracao_id`, `tempo_numero`, `periodo` (`manha | tarde`),
  `tipo_tempo` (**`normal | excepcional`**), **`hora_inicio` e `hora_fim` ARMAZENADAS**,
  `intervalo_apos_min`.

⚠️ **`hora_fim` É COLUNA, NÃO DERIVAÇÃO.** A restrição `R-2` do pedido diz *"a hora de término é
derivada"*; no catálogo ela é **dado**. As duas afirmações convivem se a derivação for do **bloco**
(fim do bloco = `hora_fim` do último TA dele), não do TA. A spec adota essa leitura e a declara,
porque derivar `hora_fim` do TA a partir da duração **reintroduziria o arredondamento de minuto que
a `R-2` proíbe** — a G45 tem intervalo de 5 min e a G50 tem 10 de manhã e 5 à tarde.

### 4.2 `vw_cursos_regime_vigente` — o regime do curso, já com relógio

A view entrega, por curso: `regime_padrao_tempos`, `ta_padrao_duracao_min`,
`intervalo_padrao_manha_min`, `intervalo_padrao_tarde_min`, **`hora_inicio_manha`**,
**`hora_inicio_tarde`**, `config_horario_padrao`, `limite_diario_ead_horas`, e o trio de exceção
(`regime_excecao_tempos`, `ta_excecao_duracao_min`, `config_horario_excecao`, `fundamento_excecao`).

⚠️ **ENTÃO HÁ DUAS FONTES PARA A MESMA PERGUNTA — «que horas começa o 3º TA desta turma nesta
semana?»** — e elas podem divergir: o regime do curso tem início e duração; o catálogo tem a tabela
de horários explícita. **Qual manda é decisão, não dedução**, e é a `Q-6` ampliada. A spec propõe:
**o catálogo manda quando `config_horario_padrao` aponta para uma configuração; o regime manda
quando não aponta** — com a razão escrita e um teste nos dois sentidos. Fora disso, dois relógios
sem regra de precedência é a lacuna de governança que o `CLAUDE.md` descreve para documentos.

### 4.3 A `RF-HOR-04` fecha com o relógio real, e isso é bom

A janela de almoço exigida é **12h00–13h00**, com a ressalva *"é aceitável que o último tempo da
manhã termine poucos minutos após as 12h00"*. Medido contra as grades reais da operação: a **G45**
encerra a manhã às **11:55** e retoma **13:05**; a **G50** encerra **12:00** e retoma **13:05**.
**As duas respeitam a regra.** A correção de dado da `Q-6` não precisa de emenda normativa nenhuma.

---

## 5. O pré-preenchimento da H2 — a coluna existe; o dado, nem sempre

⚠️ **ESTA SEÇÃO FOI REESCRITA DEPOIS DE MEDIR O REMOTO, e a primeira redação estava otimista.** Eu
havia escrito *"tem lastro inteiro"* olhando só a **estrutura**; medido o **dado**, duas das seis
fontes chegam vazias. É exatamente o modo de falha da regra 9.3 — a frase plausível escrita antes
da medição —, e fica registrado porque a diferença muda a `H2`: pré-preenchimento que cai em branco
na maioria das turmas não é pré-preenchimento, é um campo vazio com cara de preenchido.

| O que a H2 promete pré-preencher | Coluna (estrutura, banco local) | Dado (remoto, só leitura) |
|---|---|---|
| Instrutor **por UE** | `turma_disciplina_unidade.instrutor_id` (**NOT NULL**) — a tabela do rateio da spec 010 | ⚠️ **0 linhas.** A tabela existe e está **vazia** |
| Instrutor, sem UE própria | `turma_disciplina_instrutor.instrutor_id` (**NOT NULL**), com `papel` e `ch_prevista_tempos` | **99 linhas** — é esta que sustenta o pré-preenchimento hoje |
| Técnica de ensino | `unidades_ensino.tecnica_ensino_sugerida` (`text`, nulável) | **[não medido no remoto]** — ver o aviso ao fim de §9 |
| Conteúdo/tópico | `unidades_ensino.topico` (**NOT NULL**) | **587 UEs** carregadas em 26/09/2026 (registro do `CLAUDE.md`), logo há tópico em todas |
| Local | `turmas.sala_alocada` (`text`, nulável) | **[não medido no remoto]** |
| CH prevista da UE | `unidades_ensino.ch_prevista_tempos` (**NOT NULL**) | preenchida nas 587 |
| CH lançada e restante da UE | `vw_unidades_ensino_execucao`: `ta_executados`, `ta_saldo`, `lancamentos` | deriva dos lançamentos; hoje **0**, porque as 1.566 aulas têm `unidade_ensino_id` **nulo** (§9) |

⚠️ **A CASCATA DO INSTRUTOR TEM DE SER DECLARADA, PORQUE O PRIMEIRO DEGRAU ESTÁ VAZIO:** por UE
(`turma_disciplina_unidade`, hoje 0) → por disciplina da turma (`turma_disciplina_instrutor`, 99) →
**nenhum**, e aí o campo abre vazio e **obrigatório** (o `CHECK reg_aula_instrutor_obrigatorio`
recusa aula sem instrutor). A tela precisa dizer *"esta disciplina não tem instrutor atribuído nesta
turma"* e apontar onde se atribui — degradação segura (`RN-DEG-01`), não campo mudo.

⚠️ **O `D-4` DA PLANILHA MORRE DE GRAÇA, E VALE DIZER POR QUÊ.** Na planilha, instrutor, local e
técnica são atributo **do item do catálogo** — trocar o instrutor de uma UE reescreve todo DSA
passado. Aqui eles são **coluna da linha de lançamento** (`registros_aula.instrutor_id`,
`.local`, `.metodologia`), e o catálogo é só a **origem do valor inicial**. Nenhuma migration é
necessária para que o `SC-12` valha: ele já é propriedade do schema. O que falta é a **tela não
reescrever o catálogo ao gravar**, e isso é teste, não estrutura.

---

## 6. As cinco views, medidas — e o que `vw_ocupacao_ta` NÃO entrega

Todas as cinco existem em `public`, e as três do DSA são `security_invoker=true`.

### 6.1 `vw_ocupacao_ta` — a candidata natural a alimentar a grade

Colunas: `turma_id`, `data`, `ta_inicial`, `ta_final`, `tempos_consumidos`, `origem`, `fato_id`,
`disciplina_id`, `instrutor_id`. Quatro ramos em `UNION ALL`: `aula`, `avaliacao`, `vista_prova`,
`atividade_nao_letiva`.

⚠️ **CINCO LIMITES MEDIDOS NA DEFINIÇÃO, e cada um muda uma história desta spec:**

1. **O ramo de aula faz `JOIN unidades_ensino` — junção INTERNA.** Lançamento com
   `unidade_ensino_id` nulo **desaparece da view**. Se a `Q-1` for respondida por *"lançar por
   disciplina, sem UE"*, esses lançamentos ficam **invisíveis na grade** até a view mudar.
2. **Os quatro ramos filtram `ta_inicial IS NOT NULL`.** A faixa **"Sem posição"** da `H1`
   **não pode** ser alimentada por esta view — ela é, por construção, a view do que **tem**
   posição. A grade precisa de uma segunda leitura, ou a view precisa de um ramo novo.
3. **O ramo de atividade exige `turma_id IS NOT NULL`.** Atividade de escopo **global** não
   aparece no DSA de turma nenhuma — e a `RF-EXTRA-03` manda que *"todo lançamento AEC/TAD/TR/EI
   reflita automaticamente no DSA da(s) turma(s) afetada(s)"*. **Divergência medida**, listada em §8.
4. **Não há coluna `local`.** O conflito de **sala** da `RN-CONF-01` — alerta secundário —
   **não se calcula a partir desta view**.
5. **Não há `fiscal_id`.** O conflito do **fiscal**, que a `H6` pede, também não.

### 6.2 E o conflito entre turmas colide com a RLS — o achado mais sério desta medição

A `RN-CONF-01` **[REVISADA]** manda considerar **todas as turmas do sistema**, e o próprio texto da
regra já avisa o custo: *"Risco: Alto (sobe em relação à v1.0 porque a nova verificação cruza
turmas, **exigindo acesso a mais dados do que o cálculo original**)"*.

Medido: `vw_ocupacao_ta` é `security_invoker=true` e as policies das três tabelas filtram
`app.alcanca_turma(turma_id)`. **Logo, para um perfil de alcance estreito — o `operador` com
`escopo_curso` recortado — a view devolve só as turmas que ele alcança, e o conflito do instrutor
na turma de outro curso NÃO É VISTO.** Não dá erro, não dá aviso: a grade abre sem o conflito. É o
**gotcha 4** aplicado a um requisito de *Risco: Alto*.

⚠️ **E a saída fácil é a errada:** afrouxar a policy para que a grade veja todas as turmas entrega
o DSA alheio a quem tem alcance recortado. A spec propõe o caminho que o repositório já usa para
este formato de problema — **função `SECURITY DEFINER` com porteiro que devolve o FATO do conflito
(dia, TA, instrutor) e nada da outra turma** — e leva a decisão ao clarify, porque *quanto* do
conflito alheio se mostra é escolha de quem responde por segurança, não de quem escreve a consulta.

### 6.3 As outras quatro

- **`vw_unidades_ensino_execucao`** — `ch_prevista_tempos`, `lancamentos`, `ta_executados`,
  `ta_saldo`, `data_real_inicio/termino`, por UE **e por turma**. É exatamente a lista da `H2` e o
  "por UE: prevista, lançada, restante" da `H7`. **Nada a construir.**
- **`vw_disciplinas_execucao`** — `ta_aula_executados`, `ta_avaliacao_executados`, `ta_executados`,
  `ta_saldo`, `previsao_inicio_efetiva/termino_efetiva`, `origem_periodo`. É a base da situação por
  disciplina da `H7`.
- **`vw_carga_horaria_turma`** — `chr_curricular`, `ta_aula`, `ta_extraclasse`, `ta_avaliacao`,
  `ta_vista_prova`, `chd_executada`, `ta_aec`, `ta_tad`, `ta_tr`, `ta_estudo_individual`,
  `cht_executada`. A fórmula da `RN-EVT-01` **já está somada no banco**, com Estudo Individual em
  coluna separada.
- **`vw_cursos_regime_vigente`** — §4.2.

---

## 7. O que FALTA, separado em tela e banco (restrição `R-9`)

### 7.1 Só tela — nada no banco

| Ausente | Medido |
|---|---|
| `app/(app)/turmas/[turma]/dsa/` | **não existe.** A pasta da turma tem `page.tsx`, `consulta.ts`, `DisciplinasDaTurma.tsx`, `EdicaoDaTurma.tsx`, `SecaoDeAndamento.tsx`, `QuadroDeAvisosDaTurma.tsx`, `Rotulo.tsx`, `error.tsx`, `loading.tsx` |
| `app/print/` | **não existe nenhuma rota de impressão no repositório** |
| `components/ciaara/grade-alocacao.tsx` e `grade-dsa.tsx` | **não existem** — zero componente de grade |
| `lib/dominio/dsa/` | **não existe**; `lib/dominio/` tem **36 arquivos, todos planos** |
| `lib/validacao/dsa.ts` | **não existe** |
| `semana` e `ano` no contrato de parâmetros | **não existem** em `lib/navegacao/contrato.ts` |

⚠️ **`lib/dominio/dsa/` SERIA A PRIMEIRA SUBPASTA DE `lib/dominio/` — e eu conferi se as guardas a
enxergariam, porque este repositório já pagou por varredura cega** (a `I-4b` lia só
`components/ui/`). Medido: o ESLint da **FRONTEIRA 1** usa `files: ["lib/dominio/**/*.ts"]`
(`eslint.config.mjs:95`) — recursivo; e o caminhador das guardas de unidade desce em subpasta
(`readdirSync` + `statSync().isDirectory()` → recursão, `andamento-unico.test.ts:93-100`).
**A subpasta nasce coberta pelas duas.**

### 7.2 Candidatas a migration — seis lacunas medidas, e três podem morrer numa resposta

| # | Lacuna medida | O que a torna necessária, ou não |
|---|---|---|
| **L-1** | `vw_ocupacao_ta` sem `local` e sem `fiscal_id` | **necessária** se o conflito de sala (`RN-CONF-01`, alerta secundário) e o do fiscal (`H6`) saírem da view. Alternativa sem migration: a consulta da semana lê as três tabelas direto |
| **L-2** | `vw_ocupacao_ta` perde lançamento **sem UE** (junção interna) | depende da **`Q-1`**: se a resposta for *"nunca haverá aula sem UE"*, não há lacuna |
| **L-3** | `vw_ocupacao_ta` perde atividade de escopo **global** | **necessária** para a `RF-EXTRA-03` valer como escrita (§8) |
| **L-4** | função de conflito **entre turmas** sob RLS (§6.2) | **necessária** para o critério **5** do documento 06, salvo decisão de restringir o conflito ao alcance de quem olha |
| **L-5** | `atividades_nao_letivas` sem responsável/palestrante | depende da **`Q-8`** |
| **L-6** | `subtipo`, `metodologia`, `tipo_atividade` e `local` são `text` **sem FK** a `config_listas` | depende da **`Q-10`** e da `Q-11`. A `RF-EXTRA-01` declara o mecanismo como *"`config_listas` **com FK**"*, e **a FK não existe** (medido: as FKs de `atividades_nao_letivas` são **uma só**, `turma_id → turmas`) |

⚠️ **E uma lacuna que é de REGRA, não de tela:** a `RF-EXTRA-02` afirma que *"a restrição «Estudo
Individual é sempre de Turma» vira `CHECK` constraint"*. **Medido: esse CHECK NÃO EXISTE** — a busca
por restrição de `atividades_nao_letivas` que mencione `Estudo_Individual` **e** `escopo` devolve
**zero**. Os quatro CHECKs que existem são `ativ_escopo_coerente`, `ativ_ta_valido`,
`ativ_tempos_positivos` e `ativ_tempos_so_nulo_no_historico`. **O requisito está escrito e não está
implementado**; não conserto por conta própria (regra 1) — está em §8.

### 7.3 Pacote novo: medido antes de perguntar

`package.json` tem **13 dependências de produção**: `@supabase/ssr`, `@supabase/supabase-js`,
`class-variance-authority`, `cn`, `lucide-react`, `next`, `next-themes`, `nuqs`, `radix-ui`,
`react`, `react-dom`, `recharts`, `zod`.

⚠️ **ZERO biblioteca de arrastar-e-soltar, de PDF, de calendário ou de data.** A varredura por
`dnd|drag|sortable|pdf|print|calendar|date|fns|luxon|moment|dayjs|table|virtual` no conjunto de
dependências e devDependências devolve **nenhuma candidata**. Então, e isto é o que a `R-8` do
pedido exige medir antes:

- **impressão** é CSS `@media print` + rota `/print/*`, como a tabela de plataforma do `CLAUDE.md`
  já decide — **sem pacote**;
- **arrastar-e-soltar** é API nativa do navegador, e o `RF-DSA-07` exige **de qualquer forma** uma
  alternativa de teclado/menu — que é o caminho primário de acessibilidade e **não** precisa de
  biblioteca;
- **data** já é resolvida por `lib/formato/data.ts` e por `hojeNaCiaara()`, do Épico 5.5.

**Nenhum pacote novo é proposto por esta spec.**

---

## 8. Divergências encontradas — LISTADAS, não corrigidas (regra 1)

> O pedido manda listar ao final em vez de consertar. São oito, todas medidas, com o arquivo e a
> linha de cada lado.

| # | O que diverge | Lado A | Lado B |
|---|---|---|---|
| **V-1** | **Onde mora a regra de conflito** | `docs/fase-1/04`, linha 83: `lib/dominio/conflito-horario.ts`; `docs/fase-1/02`, linha 158 (`RF-DSA-04`): `lib/dominio/conflito.ts` | `docs/fase-2/24`, linha 262: **`lib/dominio/dsa/`** com `conflitos.ts · grade.ts · tetos.ts · sugestao.ts` |
| **V-2** | **Nome das views** | `docs/fase-1/04` cita `vw_ocupacao_dia`, `vw_regime_vigente`, `vw_execucao_turma`, `vw_instrutores_ordenados` | o banco tem `vw_ocupacao_ta`, `vw_cursos_regime_vigente`, `vw_disciplinas_execucao` + `vw_carga_horaria_turma`, `vw_instrutores` |
| **V-3** | **Onde moram os parâmetros da URL** | `docs/fase-2/25`, linha 137: `lib/estado/parametros-dsa.ts` | o repositório **não tem `lib/estado/`**; o contrato vive em `lib/navegacao/` (`contrato.ts`, `esquema.ts`, `usar-parametro.ts`) |
| **V-4** | **Formato do código de turma nos exemplos** | `docs/fase-2/24` linha 50 e `docs/fase-2/25` linha 79 escrevem `/turmas/TUR-000012/dsa` | `turmas.codigo` é `sigla [rótulo] ano` — `C-ApA-PCN-PR-EAD T2 2026` —, **com espaços**, e o endereço sai de `lib/navegacao/endereco-de-turma.ts`. É a mesma classe do `CUR-000001` vencido pela `D-6` da spec 009 |
| **V-5** | **O `CHECK` do Estudo Individual** | `RF-EXTRA-02` afirma que a restrição *"vira `CHECK` constraint"* | **não existe no banco** (§7.2) |
| **V-6** | **A FK dos tipos de atividade** | `RF-EXTRA-01` declara *"`config_listas` **com FK** — domínio operacional"* | `atividades_nao_letivas` tem **uma** FK, e é `turma_id`. `subtipo` é `text` solto |
| **V-7** | **Atividade global no DSA** | `RF-EXTRA-03`: *"todo lançamento AEC/TAD/TR/EI deve refletir automaticamente no DSA da(s) turma(s) afetada(s)"*, e `RF-EXTRA-02` define escopo **Global** como *"aplicada a todas as turmas ativas simultaneamente"* | `vw_ocupacao_ta` filtra `turma_id IS NOT NULL` no ramo de atividade — **a global não chega a nenhum DSA** |
| **V-8** | **Quem assina à esquerda** | `RF-DSA-06` e `RF-PDF-01` escrevem *"**Operador responsável pelo lançamento**"* | os PDFs assinados medidos trazem *"**Auxiliar** da Div. de Adm. Acadêmica"*, e o ENUM do banco chama o papel de **`elaborador`** |

⚠️ **E duas observações que não são divergência, mas seriam lidas como erro por quem chegar depois:**

- **`RN-CRONOS-02`** classifica lançamento sem disciplina em *"Licença de Pagamento, Administração,
  Tempo Reserva, ou Outras"* — quatro rótulos que **não são** o ENUM `categoria_normativa`
  (`AEC | TAD | TR | Estudo_Individual`). Não há conflito: a **`RN-EVT-01` [RESOLVIDA — v1.3]**
  adotou a taxonomia do Glossário DEnsM §2 e é a vigente; os quatro rótulos antigos viram
  **`subtipo`**. Está dito aqui porque a leitura fácil é *"falta categoria no ENUM"*.
- **`RN-EVT-01` põe «Português para Estrangeiros» e «Monitoria» dentro de Estudo Individual**; a
  planilha do CAHO lança *"PORTUGUÊS PARA ESTRANGEIROS"* como **AD** (administração, isto é, TAD).
  **A regra prevalece sobre a prática da planilha** (regra 1), e a tela terá de reclassificar —
  o que é mudança visível para quem opera, e por isso está escrito.

---

## 9. O que foi medido, e com qual comando

| Medição | Artefato / comando |
|---|---|
| Colunas, restrições, FKs, ENUMs, policies, definição de view, `reloptions` | `docker exec supabase_db_ciaara-11-v2-1 psql -U postgres -d postgres` sobre `pg_attribute`, `pg_constraint`, `pg_enum`, `pg_policy`, `pg_get_viewdef`, `pg_class.reloptions` |
| Matriz de permissão e a marca `(a)` | `select … from public.perfil_permissao` — **176** linhas, **40** com `observacao`, **0** com `permitido = false` |
| Dado de negócio **não** medido no local | `cursos` **155**, `turmas` **0**, `disciplinas` **8**, `instrutores` **1**, `usuarios` **8**, e as três tabelas de lançamento em **0** — é resto de suíte, não operação |
| Ausência de rota, componente e módulo | `ls` em `app/`, `app/(app)/turmas/[turma]/`, `components/ciaara/`, `lib/dominio/`, `lib/navegacao/` |
| Recursividade das guardas | `eslint.config.mjs:95` e `tests/unidade/andamento-unico.test.ts:93-100` |
| Ausência de pacote | `node -e` sobre `package.json`, varrendo `dependencies` + `devDependencies` |
| Texto literal dos requisitos e das regras | `docs/fase-1/02` linhas 154-166, 178-190, 210-214, 222-226, 346, 354-356, 414, 463; `docs/fase-1/04` linhas 63-103, 147-361; `docs/fase-1/06` linhas 390-425; `docs/fase-2/23` linhas 445-447 e 513; `docs/fase-2/24` linhas 50, 71, 103, 221, 237, 250, 262, 280, 319-320; `docs/fase-2/25` linhas 28, 79, 98, 129, 137 |

## 10. O dado de negócio, medido no REMOTO em 05/10/2026 (`supabase db query --linked`, só `select`)

| O quê | Medido |
|---|---|
| `registros_aula` | **1.566** · `ta_inicial` nulo em **1.566** · `local` nulo em **1.566** · `unidade_ensino_id` nulo em **1.566** · `instrutor_id` nulo em **173** · `metodologia` nula em **0** |
| `avaliacoes` | **188** · `ta_inicial` nulo em **0** · `data_vista_prova` preenchida em **102** · `ta_inicial_vista` preenchido em **0** · procedência de ETL em **188** · `editado_em` preenchido em **0** |
| `atividades_nao_letivas` | **664** · `ta_inicial` nulo em **664** · escopo `global` em **0** |
| `feriados` de 2026 | **26**, dos quais **24** de impacto `dia_inteiro` |
| `responsaveis_curso` | **2** linhas, as duas com `curso_id` **nulo** (GERAL) |
| `configuracoes_horario` / `horarios_tempos_aula` | **5** / **40** — CFG-A **7** TA, CFG-B **8**, CFG-C **8**, CFG-D **9**, CFG-E **8** |
| `turma_disciplina_instrutor` / `turma_disciplina_unidade` | **99** / **0** |
| Currículo por competências | **2** de **24** cursos: `C-Espc-FR` e `C-Espc-HN`. ⚠️ O rótulo do ENUM é **`unidades_de_ensino`** (com "de"), não `unidades_ensino` — escrever o nome errado numa consulta devolve **zero** sem erro |
| Disciplinas marcadas `sem_unidades_ensino` | **6** de **175** |

### 10.1 O `E-1` do briefing está certo para as aulas e ERRADO para as avaliações — e o erro é o caro

O briefing afirma que *"os 2.328 lançamentos, os 980 eventos e as 172 avaliações estão **TODOS** sem
`TA_Inicial`"*. Medido no v2.1: verdade para as **1.566** aulas e para as **664** atividades;
**falso para as 188 avaliações** — `ta_inicial` nulo em **zero** delas.

⚠️ **E A VERDADE É PIOR QUE A AFIRMAÇÃO DO BRIEFING, não melhor: as 188 têm `ta_inicial = 1`, TODAS
ELAS.** O `tempos_consumidos`, em contraste, **varia de 1 a 8** (80 com 1 TA, 54 com 2, 30 com 3, 14
com 4, e uma com `tempos_consumidos` **nulo**). Logo a **duração é dado real** e a **posição é
sentinela do ETL** — "começa no 1º tempo" escrito 188 vezes.

**Consequência direta na `H1`, e ela não é hipótese:** a faixa *"Sem posição"* **não** recolhe as
avaliações. Elas caem **empilhadas no 1º TA** do dia, com aparência de dado correto, e o operador
vai ler isso como defeito da grade. **Posição falsa é mais cara que posição ausente**, porque a
ausente tem onde ser mostrada e a falsa não se distingue da verdadeira. A `Q-12` passa a ter uma
segunda metade: *o que a tela faz com as 188 avaliações cuja posição é sentinela?*

⚠️ **E as 188 ainda estão sob a isenção da catraca** — `editado_em` nulo em **todas** —, então a
primeira edição de qualquer uma delas passa a exigir coerência. A linha com `tempos_consumidos`
**nulo** e `ta_inicial = 1` só sobrevive por isso: editá-la obriga a preencher os tempos no mesmo
`UPDATE`, senão `aval_ta_coerente` recusa.

### 10.2 A vista de prova tem data em 102 e posição em nenhuma

`data_vista_prova` preenchida em **102** de 188; `ta_inicial_vista` em **0**. A vista existe como
**fato datado sem posição** — ela é, hoje, a única habitante legítima da faixa "Sem posição" entre
as avaliações.

### 10.3 A assinatura está configurada para TODOS os cursos — e por isso o critério 3 não é
demonstrável hoje

As **2** linhas de `responsaveis_curso` são:

| Papel | Modo | Curso |
|---|---|---|
| `elaborador` | **`dinamico_usuario_logado`** | **GERAL** (`curso_id` nulo) |
| `encarregado_divisao` | **`fixo`** | **GERAL** (`curso_id` nulo) |

⚠️ **TRÊS LEITURAS, E A TERCEIRA É A QUE IMPORTA:**

1. O par de assinaturas do DSA **existe e cobre todos os cursos** — o critério **2** do documento 06
   (*"o rodapé sai com as assinaturas preenchidas"*) é alcançável sem cadastro novo.
2. O **elaborador** está em modo **dinâmico**: quem assina à esquerda é **quem imprime**. As
   planilhas usam um **Auxiliar fixo por curso**. **A configuração do banco já responde à `Q-14` —
   e responde o contrário da prática da planilha.** Trocar é `UPDATE`, não código.
3. ⚠️ **O critério 3 — *"reimprimir hoje um DSA de março traz quem assinava em março"* — NÃO É
   DEMONSTRÁVEL COM O DADO DE HOJE**, porque há **uma única vigência** por papel e nenhuma linha por
   curso: qualquer semana resolve para as mesmas duas pessoas. A fatia que fizer a impressão tem de
   **semear uma segunda vigência** para provar a resolução por data — e isso é **amostra de teste no
   local**, nunca escrita no remoto.

### 10.4 A técnica de ensino já veio, e veio por extenso — insumo da `Q-10`

`metodologia` está preenchida em **todas** as 1.566 aulas, com **dois** valores distintos:
**"Exposição Oral"** (1.564) e **"Avaliação"** (2). O `tipo_atividade` tem **"Aula Teórica"**
(1.552) e **"Aula Prática"** (14). Em `avaliacoes`, `tipo_avaliacao` tem **5** valores: *Prova
Escrita* (84), *Trabalho* (15), *Prova Prática* (11), *Prova Oral* (1) e **"Nao informado (execucao
orfa)"** (77) — estes 77 são as execuções órfãs da fusão da `RN-AVAL-02`.

⚠️ **ENTÃO A `Q-10` NÃO É SOBRE CRIAR UMA LISTA: É SOBRE RECONCILIAR DUAS.** O banco tem 2 valores
por extenso; as planilhas usam **10 siglas** (EO, AP, EI, TG, TI, PP, PM, PO, PE, OD) e ainda as
combinam (*"EO/AP"*, *"TG/TI"*). O documento impresso traz a **sigla** na coluna T/E e a **legenda**
no rodapé. Sem a sigla no cadastro, a coluna T/E do papel não tem de onde sair — e inventar a
abreviação em código seria exatamente o *"texto livre no lugar da lista"* que o pedido proíbe.
⚠️ **E não é preciso migration para guardá-la:** `config_listas` tem **`metadados jsonb`** e
`rotulo_exibicao` — medido —, onde a sigla cabe sem alterar schema.

### 10.5 O catálogo de horários divergente, com número

| O que o relógio real faz | O que o catálogo faz, medido |
|---|---|
| G45 começa **07:50**; G50 começa **08:10** | CFG-A e CFG-D começam **08:00** |
| G45 tem **5** TA de manhã | CFG-D tem **4** |
| G45 tem intervalo de **5 min** | CFG-D tem **10 min** (`intervalo_apos_min`) |
| G45 retoma **13:05**; G50 retoma **13:05** | CFG-A e CFG-D retomam **13:00** |
| C-Ap-HN tem **9** TA, o 9º sendo Estudo Individual **16:25-17:20** | CFG-D tem **9**, e o 9º é `tipo_tempo = **excepcional**`, **16:40-17:25** |

⚠️ **O `tipo_tempo = excepcional` JÁ EXISTE no catálogo** — é o "TA excepcional" que a `H6` manda
tratar como **alerta**, e ele não precisa nascer. ⚠️ **E a divergência é de DADO em quatro eixos**
(hora de início, contagem da manhã, intervalo, hora de retomada), o que torna a `Q-6` mais larga do
que "confirmar G45 e G50": é uma vigência nova por curso, com as quatro grandezas, antes de a
impressão poder ser conferida contra o PDF assinado.
