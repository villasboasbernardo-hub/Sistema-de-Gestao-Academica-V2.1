# Estado atual: atividades não letivas e avaliações (Épicos 9 e 8)

> **O que é:** levantamento de **leitura** para dois épicos futuros. É insumo de `/speckit-specify`, não a spec.
> - **Épico 9:** AEC, TAD, TR, Estudo Individual e tetos de 10%, 5% e 10%.
> - **Épico 8:** avaliações.
>
> **Escrito em:** 07/10/2026, contra `main` em `92b33bc`.
>
> **O que não muda:** nenhum código, migration ou teste. Nenhum dado foi escrito em banco nenhum.
>
> **Nomes:** pessoas aparecem só por código. O único nome próprio é Bernardo Villas Boas, como decisor.
>
> **Medições:** toda "medição" cita o artefato contra o qual foi feita (regra 9.2). As do remoto foram feitas no projeto
> **`cqhpfuaweoyglhtrckcp` em 07/10/2026, entre 17:29 e 17:32 (horário local)**. O comando foi
> `supabase db query --linked --output-format json -f <arquivo>.sql`, com um `SELECT` por arquivo e os arquivos fora do
> repositório. A conexão é de dono, então a RLS não recorta: os números são do **banco inteiro**.

---

## 0. Os achados que mais pesam

1. **A base dos tetos não é a que o pedido supõe.**
   - `vw_conformidade_tetos` compara AEC, TAD e TR contra a **CHR curricular**, que é a soma de `disciplinas.carga_horaria_tempos` do curso.
   - Não compara contra a CHD executada.
   - As três chaves de parâmetro chamam-se `teto.*_percentual_chr`.
   - Os documentos divergem entre si sobre a base do teto de AEC (§1.6).
   - Com a base do banco, **6 das 10 turmas com lançamento excedem o teto de TAD**. Nenhuma excede o de AEC nem o de TR (§4.3).
2. **Nenhuma tela lê `vw_conformidade_tetos`.**
   - Medido por varredura de `app/`, `lib/` e `components/` (o único uso é o tipo gerado).
   - O alerta de teto que a `RF-EXTRA-04` exige **não existe para quem usa o sistema**.
3. **A situação da vista está quebrada no dado real.**
   - `app.fn_status_vista` só devolve `realizada` quando `status = 'concluida'`.
   - **Nenhum caminho de escrita grava `concluida`**: nem a carga das planilhas, nem o DSA.
   - Medido no remoto, as **188 avaliações vivas estão `pendente`**:
     - **134 têm vista registrada** e aparecem como vista "pendente";
     - **45 aparecem "atrasada"**.
   - As 188 linhas canceladas do ETL tinham **165 `concluida`** como status anterior. A substituição pela planilha **apagou a informação de execução**.
4. **A carga das planilhas classifica Monitoria e Português como TAD, e a regra diz Estudo Individual.**
   - A `RN-EVT-01` diz, com estas palavras: *"Inclui também Monitoria e Português para Estrangeiros"*, dentro de Estudo Individual. Fonte: `docs/fase-1/04…md:347`.
   - `resolver.py:63` manda `MONITORIA` para **TAD/Administração**.
   - O próprio `config_listas` diz `Monitoria=Estudo_Individual`.
   - Medido no remoto: **20 linhas ativas, 46 TA**, que hoje inflam o TAD (§3.9).
   - É uma divergência com o documento 04 (regra inviolável 1). **Está listada, não corrigida.**
5. **Atividade de escopo global não entra no total de turma nenhuma.**
   - `vw_carga_horaria_turma` filtra `n.turma_id is not null`.
   - Isso contradiz o critério 5 do Épico 9.
   - Hoje o efeito é zero: há **0** linhas `global` no remoto.
   - Mas a carga **nunca** usa `global`. Ela grava evento coletivo como **uma linha por turma**: **21 eventos em 46 linhas** (§3.5).
6. **"Agendar avaliação consome TA?"** Os documentos se contradizem (§1.6, item 1). O schema escolheu **não**: a aplicação fica com o TA vazio até o lançamento no DSA.

---

## 1. O que os documentos v2.1 definem

### 1.1 `docs/fase-1/02-Requisitos-Funcionais.md`

O documento não tem coluna "Destino na v2.1" em tabela. O destino é a marca no início de cada RF (legenda nas linhas 30 a 40). Todos os RF abaixo são **`[PRESERVADO]`**.

| RF | Linha | O que manda (curto, literal quando entre aspas) |
|---|---|---|
| RF-AVAL-01 | 204 | Agendar com "tipo, data, data da vista de prova e instrutor responsável pela aplicação". A habilitação vale para quem aplica, "deixa de ser exigida de quem realiza a fiscalização/vista" |
| RF-AVAL-02 | 206 | Painel planejadas × agendadas "apenas por situação de execução — Concluída, Em andamento, Pendente, Atrasada ou Sem correspondência", "sem modelar fórmula de média final" |
| RF-AVAL-03 | 208 | Vista "em até 7 dias corridos após a aplicação … sinalizar como atrasada"; prazo em `config_parametros` |
| RF-AVAL-04 | 210 | "Toda avaliação e vista de prova **agendada** deve consumir tempos de aula e refletir no DSA e no Cronograma" |
| RF-AVAL-05 | 212 | Agendamento e execução são "a mesma informação"; `arquivo_avaliacoes_v1` fica só de leitura |
| RF-AVAL-06 | 214 | Fiscal "deve poder ser **qualquer pessoa**, inclusive alguém que não conste do cadastro" |
| RF-EXTRA-01 | 222 | AEC (palestra, visita técnica, viagem, treinamento esportivo); TAD ("incluindo cerimônias e formaturas"); TR; "Estudo Individual (inclui monitoria e apoio de idiomas)". Subtipos em `config_listas` "com FK" |
| RF-EXTRA-02 | 224 | Escopo Global ou Turma; "Estudo Individual é sempre de escopo de Turma", que "vira `CHECK`" |
| RF-EXTRA-03 | 226 | O lançamento reflete no DSA, no Relatório e no Cronograma |
| RF-EXTRA-04 | 228 | "calcular e sinalizar, **por curso** … AEC ≤ 10% do somatório das CHD …; TAD ≤ 5% e TR ≤ 10% da CHR". Estudo Individual é acompanhado "informativamente" contra 20%/10% |
| RF-CURSO-02 | 140 | Avaliações e Relatório são alcançados pela **página do curso** (`app/(app)/cursos/[curso]/avaliacoes/`), sem entrada própria no menu |
| RF-DSA-01 | 154 | Cinco categorias. Avaliação/Vista "compõe a CHD, sem exigir instrutor habilitado"; AEC "não compõe CHD" |
| RF-CRONOS-04 | 254 | AEC, TAD, TR e Estudo Individual totalizados à parte; aula e avaliação "nunca entram neste agrupamento" |

### 1.2 `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`

| Regra | Linha | Risco | Texto (curto) |
|---|---|---|---|
| **RN-EVT-01** | 341–351 | **Alto** | Cinco categorias.<br>AEC: "Não contam para a CHD… Teto normativo: 10% do somatório das CHD do curso".<br>TAD: "5% da CHR".<br>TR: "10% da CHR".<br>Estudo Individual: "fora da fórmula de CHT… Inclui também Monitoria e Português para Estrangeiros".<br>**CHT = CHD + AEC + TAD + TR**.<br>"Excedente de teto é alerta, não bloqueio" |
| **RN-EVT-03** | 353 | **Alto** | "Avaliações e vistas de prova consomem tempos de aula e contam para a carga horária da disciplina" |
| **RN-AVAL-02** | 357 | **Alto** | "um único fato… agendar uma avaliação já produz o consumo de tempos de aula correspondente"; uma linha só |
| RN-AVAL-01 | 333 | Médio | Casamento planejada × agendada por "nome normalizado… nunca por um identificador rígido 1:1". `Formula_MF`/`Carater` só informativos. Vista > 7 dias sem registro de realizada = Atrasada |
| RN-INST-01 | 187 | Alto | A habilitação "não se aplica ao papel de fiscal de avaliação" |
| RN-MAT-01 | 215 | Alto | Aula ou avaliação só para disciplina do curso da turma |
| RN-2027-03 | 281 | Alto | Reservas de TAD e TR do PROENS por curso (`reservas_proens`) |
| RN-2027-04 | 285 | Alto | Prova Mista = 3 TA contíguos; "Revisão obrigatória de 1 tempo de aula… em até 7 dias" |
| RN-EVT-02 | 361 | Médio | Só feriado "Dia Inteiro" desconta capacidade |
| **RN-DEG-02** | 375–377 | Médio | "alerta com exigência de registro de justificativa, nunca como bloqueio". "não se cria `CHECK` bloqueante…". O excedente de teto "sinaliza, não impede" |

### 1.3 `docs/fase-1/06-Backlog-de-Epicos-V2.1.md` §3

**Épico 8 — Avaliações simplificadas (linhas 490 a 527).**
- **Escopo:**
  - agendamento "sem consumir TA";
  - execução na mesma linha (`ta_inicial`/`tempos_consumidos`);
  - vista com colunas próprias, também na CHD;
  - cinco situações;
  - alerta aos 7 dias;
  - fiscal "qualquer pessoa";
  - `formula_mf`/`carater` "não lidos por regra alguma".
- **Fora do escopo:** nota, média, aprovação, documento escolar (RNF-NORM-06).
- **Critérios de aceite (516 a 521):**
  1. agendar não consome TA;
  2. 8º dia sem vista = Atrasada;
  3. fiscal externo aceito e aplicador sem habilitação recusado;
  4. `fiscal_id` + `nome_fiscal_externo` recusados juntos;
  5. aparece no DSA;
  6. não expõe nota.
- **Depende de:** Épicos 1, 2, 4, 5 e 6.

**Épico 9 — AEC/TAD/TR/Estudo Individual e tetos (linhas 531 a 568).**
- **Tetos (545):** "AEC ≤ 10% do somatório das **CH das disciplinas**; TAD ≤ 5% da CHR; TR ≤ 10% da CHR — lidos de `config_parametros`".
- **Critérios de aceite (556 a 562):**
  1. Estudo Individual nunca na CHT;
  2. tetos sem redeploy;
  3. estouro só alerta;
  4. **global aparece em todas as turmas ativas**;
  5. global com `turma_id` recusado;
  6. 664 = 531/62/60/11.
- **Risco (566):** "transformar teto em CHECK… Explicitamente proibido".
- **Ordem (832 e 833):** o Épico 9 vem **antes** do 8 e do 7.

### 1.4 `docs/vibe-coding/42-Prompts-por-Epico.md`

- **Épico 8 (739 a 795):**
  - armadilhas (782 a 788): campo de nota, chave rígida, habilitação do fiscal, segundo registro;
  - fronteira (775): "7 dias não é atrasado; 8 é";
  - ⚠️ o portão de saída (794 e 795) pede "avaliação **agendada** … **somando na CHD**", o que contradiz a linha 753 ("SEM consumir TA").
- **Épico 9 (799 a 856):**
  - subtipo "ADMINISTRÁVEL (config_listas, não ENUM)" (817);
  - a armadilha 850 atribui "turma_id nulo = escopo global" à `RN-EVT-02`, que é a regra de feriado: **referência errada**.

### 1.5 `docs/fase-2/21-Schema-Fisico-PostgreSQL.md` e `docs/fase-1/07-Glossario.md`

**Doc 21:**
- **`avaliacoes` (§4.13, linhas 491 a 521):**
  - "agendar não consome TA" (498);
  - aplicação e vista compõem a CHD (500 e 503);
  - `fiscal_id` com `restrict`, exclusivo com externo (507);
  - `status` com padrão `pendente` (509);
  - `Status_Vista` vira `app.fn_status_vista()` + `vw_avaliacoes_situacao` (515 a 518).
- **`atividades_nao_letivas` (§4.14, linhas 523 a 543):** `subtipo` "sem FK (lista sugerida)"; `compoe_cht` é coluna gerada.
- **Nota de equivalência (864 a 868):** "As três bases são, portanto, a CHR curricular".

**Glossário (doc 07):**
- CHR (56): "base de cálculo dos tetos de TAD e TR". **Não diz AEC.**
- AEC (60): teto de "10% do somatório das CHD".
- Vista de Prova (88): "integra a CHD … consome TA e deve constar do DSA".
- **Os verbetes "Avaliação" e "Fiscal" não existem.** O papel de fiscal está em `docs/fase-1/01-Stakeholders-e-Perfis-de-Usuario.md:64`.

**Contenção:** `RNF-NORM-06` (`docs/fase-1/03…:282`) proíbe "produzir, calcular ou armazenar notas, médias finais, situação de aprovação ou documentos escolares". Essas competências são da CIAARA-32 e da CIAARA-12.

### 1.6 Contradições entre documentos que a spec terá de resolver

1. **Agendar consome TA?**
   - **Sim:** RF-AVAL-04 (02:210), RF-AVAL-05 (02:212) e RN-AVAL-02 (04:357).
   - **Não:** 06:500/516, 42:753, 05:285/292, 21:498 e o comentário da tabela (*"RN-AVAL-02 revisada, Épico I"*). **Mas não há texto "RN-AVAL-02 revisada" no documento 04.**
2. **Base do teto de AEC.**
   - "somatório das **CHD**": RF-EXTRA-04, RN-EVT-01, Glossário.
   - "somatório das **CH das disciplinas**": 06:545, 42:823, RNF-NORM-02, BRIEF:544.
   - **CHR curricular**: o banco, por equivalência declarada.
   - Some-se a isso: o teto vale "por curso" no RF, mas `vw_conformidade_tetos` calcula **por turma**. E a base é a CH **prevista** (currículo) contra AEC **executado**.
3. **AEC dentro da CHD?**
   - O ENUM `categoria_registro_aula` tem `atividade_extraclasse`, e `vw_carga_horaria_turma` soma `ta_extraclasse` na CHD.
   - RN-EVT-01 e o Glossário dizem que AEC **não** compõe CHD.
   - Medido no remoto: **0 linhas** de `registros_aula` com `atividade_extraclasse`. A contradição é inerte hoje.
4. **Situação da vista.**
   - RF-AVAL-01 manda informar a data da vista **no agendamento**, mas `fn_status_vista` trata `data_vista_prova` preenchida como "vista registrada". Uma vista agendada e não realizada nunca fica `atrasada`.
   - O prazo conta de `data_avaliacao`, que é prevista, enquanto o RF diz "após a aplicação".
5. **Vista × Revisão.** A "Revisão obrigatória de 1 TA em 7 dias" da RN-2027-04 é a vista de prova? Nenhum documento diz.
6. **Subtipo com FK ou sem FK.**
   - Com FK: RF-EXTRA-01 e 05:310.
   - Sem FK: 21:529 e o banco.
7. **Estudo Individual 20%/10%.** É referência informativa em três documentos, mas **não tem chave** em `config_parametros` e não tem view (Princípio VII).
8. **Contagens.** EI aparece como 512 (04:347) e como 531. TAD aparece como 59 e como 60. O total aparece como 663 e como 664. A diferença é Monitoria e Português contados em EI.

---

## 2. O que já existe no banco e no código

### 2.1 Tabelas

**`avaliacoes`**
- Origem: `supabase/migrations/20260829234045_fatos_grao_unidade_ensino.sql:278–415`.
- **Uma linha por prova, com a vista na mesma linha** (RN-AVAL-02):
  - aplicação: `data_avaliacao`, `ta_inicial`, `tempos_consumidos`, `ta_final` gerada, `local`;
  - vista, **uma sessão só**: `data_vista_prova`, `ta_inicial_vista`, `tempos_consumidos_vista`, `ta_final_vista`, `local_vista`;
  - pessoas: `instrutor_responsavel_id`, `fiscal_id` e `nome_fiscal_externo`;
  - `status status_avaliacao` (`pendente|em_andamento|concluida|atrasada|cancelada`, padrão `pendente`);
  - `item_planejado_id` → `avaliacoes_planejadas` (`set null`);
  - `tipo_avaliacao` e `metodologia`, conferidos contra `config_listas` por gatilho (`20260829235410…sql:552,556`);
  - rastro do ETL: `origem_execucao_v1` e `conciliacao_migracao`.
- **Não tem `unidade_ensino_id`**: a avaliação aponta **disciplina** (comentário na linha 286).
- **Não tem coluna para segundo aplicador nem para quem conduz a vista.**
- **CHECKs:**
  - `aval_ta_coerente`: TA e tempos juntos ou ausentes juntos. Recebeu duas isenções:
    - linha do ETL não editada (`20260908090000…:45`);
    - linha do ETL **cancelada** (`20261006225009…:29–37`, VIRADA-1).
  - os demais: `aval_vista_apos_aplicacao`, `aval_fiscal_exclusivo`, TA de 1 a 12, FKs compostas `aval_turma_do_curso` e `aval_disciplina_do_curso` (RN-MAT-01).
- `instrutor_responsavel_id` perdeu o `NOT NULL` em `20260908084000…:84`, porque o dado real o refutou.

**`atividades_nao_letivas`**
- Origem: `…234045…sql:437–518`.
- Colunas: `categoria_normativa` (ENUM fechado `AEC|TAD|TR|Estudo_Individual`, sem padrão), `subtipo` (texto livre), `tipo_legado_v1`, `escopo` (`global|turma`) com `ativ_escopo_coerente`, `tempos_consumidos`, `ta_inicial`, `ta_final` gerada, `local`.
- **`compoe_cht` é gerada** como `categoria <> 'Estudo_Individual'`: a fórmula com EI de fora está garantida pelo motor.
- Acréscimos de `20261005181116…sql`:
  - `ativ_estudo_individual_de_turma` (266): o CHECK que a RF-EXTRA-02 prometia e que não existia;
  - **`instrutor_id` + `responsavel_externo`**, mutuamente exclusivos (`ativ_responsavel_exclusivo`, 278–284; decisão Q-8 da spec 013).
- Catraca `ativ_tempos_so_nulo_no_historico`: `20260908084000…:150`, reescrita em `20261006184558…:118`, que dispensa a linha histórica inativa.

**Outras:**
- `avaliacoes_planejadas`: catálogo do "dever-ser" (**118** linhas no remoto).
- `arquivo_avaliacoes_v1`: as **186** execuções da v2.0, só de leitura.
- `reservas_proens`: **12** ativas.

### 2.2 Parâmetros e listas (lidos no remoto)

**`config_parametros`:**

| Chave | Valor |
|---|---|
| `teto.aec_percentual_chr` | 10 |
| `teto.tad_percentual_chr` | 5 |
| `teto.tr_percentual_chr` | 10 |
| `avaliacao.prazo_vista_dias` | 7 |
| `avaliacao.ta_padrao_bloco_prova` | 3 |

Os valores foram semeados em `20260829235410…sql:577–619`. **Não existe parâmetro para a referência de Estudo Individual (20%/10%).**

**`config_listas.tipos_avaliacao`:** Apresentação/Seminário · Nao informado (execucao orfa) · Prova Escrita · Prova Oral · Prova Prática · Recuperação · Trabalho.

**`config_listas.tipos_atividade` com `metadados.categoria`:**

| Categoria | Subtipos |
|---|---|
| TAD | Administração; Evento/Cerimônia |
| AEC | Atividade Extracurricular; Orientação de TFM; Palestra; Visita Técnica |
| Estudo_Individual | Estudo Individual; **Monitoria** |
| TR | Recuperação da Aprendizagem; Tempo Reserva |
| sem categoria | Aula, Aula Prática, Aula Teórica, Avaliação, Licença de Pagamento, Vista de Prova |

### 2.3 Views e funções

- **`vw_carga_horaria_turma`** (`…235731…sql:608–672`):
  - CHD = aula + extraclasse + aplicação + vista;
  - CHT = CHD + AEC + TAD + TR, com **EI de fora**;
  - avaliação conta se `status <> 'cancelada'`;
  - atividade conta se `status = 'ativo'` **e `turma_id is not null`**, então a global fica de fora;
  - `chr_curricular` = soma da CH das disciplinas ativas do **curso**.
  - Consumida por `/inicio` e pela ficha da turma.
- **`vw_conformidade_tetos`** (`…235731…sql:696–733`):
  - tetos lidos por `app.fn_parametro_numerico(…, ano_letivo)`, base `chr_curricular`;
  - booleanos `*_excedido`;
  - reserva do PROENS de TAD e TR ao lado;
  - **não tem consumidor** em `app/`, `lib/` nem `components/`.
- **`vw_avaliacoes_situacao` + `app.fn_status_vista`** (`…235731…sql:399–421`, `819–833`): `realizada` exige vista **e** `status = 'concluida'`. **Também não tem consumidor.**
- **`vw_instrutor_carga_anual`** (`…235731…sql:753–807`):
  - soma aplicação + vista ao **responsável**;
  - soma a aplicação, em coluna própria, ao **fiscal**;
  - a vista não é creditada a quem a conduz, porque essa pessoa não tem coluna.
- **`vw_ocupacao_ta`** (reescrita em `20261005181116…sql`): grade do DSA com aula, aplicação, vista e atividade, **inclusive global** (V-7).

### 2.4 RLS (matriz `perfil_permissao`, lida no remoto)

- **`avaliacoes` e `atividades_nao_letivas`:**
  - ler: os nove perfis;
  - criar e editar: `admin`, `encarregado_administracao_academica`, `ajudante_administracao_academica`, `operador`.
- **`atividades_globais.criar`:** os mesmos, **sem** o `operador`.
- Policies em `20260830000111…sql:787–835`, reescritas em `20260918041449…sql:223–296` com `curso_em_oferta`/`turma_em_oferta`.
- **Nenhuma policy de `DELETE`** (regra 4).

### 2.5 Código

- **`lib/acoes/dsa.ts`:**
  - `lancar` (278 a 413): insere avaliação (`-V`), **vista como `UPDATE` da mesma linha** (376 a 393) e atividade (`-N`, global se `turmaId` nulo).
  - `lancarEstudoIndividualDaSemana` (433 a 524): um EI por dia útil, no slot seguinte ao último TA, idempotente, local Biblioteca.
  - `mover`, `editar` e `excluir` (844 a 1059). **Excluir avaliação = `status = 'cancelada'`** (1052). Excluir vista = anular as quatro colunas. Excluir atividade = `inativo`.
  - A avaliação **não exige habilitação** (340 a 352, `RN-INST-01` delimitada).
- **`lib/dominio/dsa/tetos.ts`:** tetos **semanais** da `RN-DIST-03`. TFM é o único bloqueio; o resto é alerta. **Não trata AEC, TAD nem TR.**
- **Não existem:** `lib/dominio/tetos-normativos.ts` (que RN-EVT-01 nomeia) e `lib/dominio/casamento-avaliacoes.ts` (RN-AVAL-01).
- **Rotas:**
  - `/atividades` existe no menu como *"em breve"* (`lib/navegacao/menu.ts:167`).
  - **Não há** `app/(app)/cursos/[curso]/avaliacoes/`, embora a RF-CURSO-02 a nomeie.
  - **Nenhum código grava `status = 'concluida'`, `em_andamento` ou `atrasada` em avaliação.**

---

## 3. Convenções provisórias da carga das planilhas que viram regra

**Caminhos:**
- O caminho vivo é `scripts/carga_dsa/sincronizar.py` + `resolver.py`.
- O piloto (`executar.py` + `plano.py`) foi absorvido (`turmas-carregadas.md:8`), mas o código continua lá e **diverge** em dois pontos, anotados abaixo.

Cada item traz: o que a carga faz, o risco de virar regra sem decisão e a recomendação.

### 3.1 Vista de prova em várias sessões

- **O que faz:**
  - A vista vai nas colunas `*_vista` da própria avaliação (`resolver.py:405`, `527–530`; SQL em `sincronizar.py:233–243`).
  - Uma sessão é reconhecida como vista pelo padrão da UE: `VP[0-9]*` de fábrica (`resolver.py:164`), ou `V[PT][0-9]*` no CAHO.
  - O casamento com a prova segue esta ordem (`_casar_vistas`, `resolver.py:472–536`):
    1. decisão `vistas[]`, ou a aba DATAS AVALIACOES;
    2. o número (VP1 com AV1/PM1);
    3. senão, a última prova anterior sem vista.
  - **Uma segunda sessão** depende de `vista_extra_como_aec: true` (só em `decisoes/c-espc-hn-2026.json:86`). Com essa decisão, ela vira **AEC "Atividade Extracurricular"** com a descrição "VISTA DE PROVA (2ª sessão)…" (`resolver.py:510–521`). Sem ela, gera a pendência bloqueante `vista_em_mais_de_uma_sessao` (`522–526`).
  - Medido no remoto: **1** linha AEC desse tipo.
- **Risco:**
  - O TA de vista sai da **CHD** e entra no **AEC**, inflando o teto de AEC. Isso contraria a RN-EVT-03 ("vistas… contam para a carga horária da disciplina").
  - Não há ligação estruturada com a prova (só texto).
  - A conferência com o CONTROLE (`resolver.py:587`) não soma essa sessão.
- **Recomendação:** a vista em N sessões é **fato de CHD**. Ou a vista ganha tabela filha (`avaliacoes_vistas`, 1:N), ou a sessão extra vai como aula da disciplina. Decisão na **P-3**.

### 3.2 Avaliação × unidade de ensino (`PEND-E8-1`)

- **O que faz:**
  - Insere a avaliação **sem UE**, porque a coluna não existe (`sincronizar.py:237–240`).
  - Guarda a chave da planilha (`PM1`) só no plano.
  - Põe o tópico em `conteudo_resumo` (`resolver.py:404`).
  - Coleta a faixa "(U.E. …)" do tópico em `insumo_epico_8` (`resolver.py:408–410`, relatório em `sincronizar.py:509`).
  - A conferência por UE só cobre aulas (`resolver.py:603–610`). A conferência por disciplina soma aula + prova + vista (`583–600`).
  - Medido no remoto: **104 de 188** avaliações vivas têm "UE" no `conteudo_resumo`.
- **Risco:**
  - O catálogo da DEnsM embute o TA de prova na CH da UE (`turmas-carregadas.md:80–93`), e o painel por UE mostra "resta" em disciplina concluída.
  - Inferir a UE pelo texto seria a máquina inferindo (Q1.b: proibido).
- **Recomendação:** ver **P-4**.

### 3.3 Fiscal de prova

- **O que faz:**
  - A marca "(FISCAL)" no texto do instrutor (`resolver.py:372`) produz `instrutor_responsavel_id` nulo e `fiscal_id` com o casado (`396–400`).
  - Se a pessoa não casar com o cadastro, o texto vai para `nome_fiscal_externo` (`401`).
  - **O responsável passa a ser quem conduz a vista** (`531–536`).
  - O piloto fazia o contrário: removia "(FISCAL)" e tornava a pessoa responsável (`plano.py:99`).
  - Medido no remoto, sobre as 188 vivas:
    - **88** com fiscal do cadastro;
    - **6** com fiscal externo;
    - **14** sem responsável;
    - **2** sem responsável **nem** fiscal;
    - **48** com fiscal = responsável (o mesmo instrutor nos dois papéis).
- **Risco:**
  - "Quem conduz a vista" vira "responsável pela aplicação" sem decisão.
  - A carga anual do instrutor (`vw_instrutor_carga_anual`) credita aplicação + vista a essa pessoa, e o fiscal recebe crédito duplicado quando é a mesma.
- **Recomendação:** separar **aplicador**, **fiscal** e **condutor da vista** como três papéis. Decisão na **P-5**.

### 3.4 Dois instrutores na mesma aula ou avaliação

- **O que faz:**
  - **Aula:** fica o primeiro nome antes da "/". Os demais vão em `observacoes`, depois de `" Demais instrutores: "` (`resolver.py:68`, `262–274`, `461`). Medido: **16** aulas ativas.
  - **Avaliação:** `split("/")[0]` (`resolver.py:373`). **O segundo nome é descartado sem rastro.**
  - **Atividade:** `split("/")[0]`. Se não casar, o texto **inteiro** vai para `responsavel_externo` (`344–346`). Medido: **5** linhas com "/" em `responsavel_externo`.
- **Risco:** a carga docente do segundo instrutor some, e isso alimenta a LIQ e a Ficha de Docentes. Texto em `observacoes` não é dado.
- **Recomendação:** tabela de junção (`…_instrutor`, padrão `turma_disciplina_instrutor`) para aula, avaliação e atividade. Ou, no mínimo, a avaliação deixar de descartar. Decisão na **P-6**.

### 3.5 Atividades coletivas (palestra, TFM, evento de várias turmas)

- **O que faz:**
  - Sempre **uma linha por turma**, `escopo = 'turma'` fixo (`sincronizar.py:274`), código `DSAP-<turma>-L<linha>-N` (`resolver.py:168–171`).
  - Nenhuma ligação entre as cópias.
  - Classificação por descrição:
    - PALESTRA, COLÓQUIO, SEMINÁRIO, INSTRUÇÃO, DOEP, OFICINA → AEC/Palestra;
    - TFM → AEC/Orientação de TFM;
    - CERIMÔNIA, FORMATURA → TAD/Evento/Cerimônia.
    - Fonte: `resolver.py:51–66`.
  - Dia parado em todas as turmas vira calendário global (`sincronizar.py:328–357`). Dia parado em só algumas vira TAD "Administração" por turma (`resolver.py:539–557`).
  - Medido no remoto: **21** pares (data, descrição) presentes em mais de uma turma, somando **46** linhas. **0** linhas `global`.
- **Risco:** o desenho `global` do banco (e o critério 5 do Épico 9) nunca é exercitado. Corrigir um evento exige editar N linhas. E a forma "uma linha por turma" vira a regra de fato.
- **Recomendação:** ver **P-7**.

### 3.6 AEC, TAD, TR e Estudo Individual por turma

- **O que faz:** a categoria é decidida nesta ordem:
  1. decisão `chaves[…]` do JSON da turma;
  2. senão, pela **descrição** do catálogo da planilha, por palavras (`resolver.py:51–76`, "a sigla não decide nada; decide a DESCRIÇÃO");
  3. sem regra, pendência bloqueante `chave_sem_regra`.
- O subtipo tem de existir em `tipos_atividade` com a categoria certa (`banco.py:111–112`, `resolver.py:334–338`).
- EI: sem instrutor, local "Biblioteca" (`fontes.json:109–110`).
- **Risco:**
  - A tabela de palavras **é** uma regra de classificação normativa escrita num script de carga.
  - Ela já contradiz a RN-EVT-01 em Monitoria (§3.9).
  - "APOIO À INSTRUÇÃO → AEC" (11 linhas, 61 TA no remoto) também não tem fundamento no documento 04.
  - Há ainda "TR" com dois significados: sigla de UE de avaliação (`resolver.py:163`) e Tempo Reserva.
- **Recomendação:** a classificação vive em **`config_listas.tipos_atividade.metadados.categoria`**, que já existe. A tela do Épico 9 exige subtipo e deriva a categoria dele. A tabela de palavras fica só na carga, como **sugestão auditável** que passa pelo lote de decisões. Decisão na **P-2**.

### 3.7 Responsável externo

- **O que faz:**
  - **Atividade:** texto não casado vai para `responsavel_externo` **sem pendência** (`casar(…, obrigatorio=False)`, `resolver.py:344–346`). Medido: **43** textos distintos em linhas ativas.
  - **Aula:** gera pendência que bloqueia (`245–248`).
  - **Avaliação:** pendência não bloqueante. A prova entra sem responsável (`384–385`).
- **Risco:** um **nome de pessoa** da planilha é gravado como texto livre sem passar pelo lote de decisões, contra o princípio (4) da VIRADA-1 ("cadastro só pelo lote de decisões aprovado"). Além disso, "DOEP" (entidade) e um palestrante convivem no mesmo campo.
- **Recomendação:** ver **P-8**.

### 3.8 Avaliação cancelada por substituição

- **O que faz** (`sincronizar.py:194–197`):
  - `status = 'cancelada'` com a marca `[SUBSTITUIDO PELA PLANILHA DE CONTROLE] (status anterior: X)` em `observacoes`;
  - a que sai da planilha recebe `[SAIU DA PLANILHA DE CONTROLE]` sem status anterior (`46`, `293–303`);
  - **reativar volta sempre a `pendente`** (`253`), ignorando o status anterior.
  - "Aguarda ratificação" está **só** no `CLAUDE.md` (VIRADA-1), não no código.
- **Medido no remoto:**
  - **188** canceladas com a marca de substituição, com status anterior **165 `concluida`**, **16 `em_andamento`** e **7 `pendente`**;
  - **0** com a marca "saiu";
  - **1** cancelada sem marca nenhuma (código `DSAP-`, turma `C-Exp-Obs-ME 2026`), com origem não identificada nesta leitura.
- **Risco:**
  - `cancelada` passa a significar três coisas: **cancelada de fato**, **excluída na tela** (`lib/acoes/dsa.ts:1052`) e **substituída pela carga**.
  - O motivo vive em texto livre, e o status anterior está num parêntese.
  - O painel do Épico 8 contaria as substituídas como "canceladas".
- **Recomendação:** ver **P-9**.

### 3.9 Outras convenções que tocam estes épicos

- **Status da avaliação nova:** o INSERT da carga não informa `status`, então vale `pendente` (`sincronizar.py:237–243`). Junto com `fn_status_vista`, isso produz o achado 3 da §0. O DSA da tela também não grava `concluida`.
- **Monitoria, Recepção, Departamento de Alunos e Administração → TAD** (`resolver.py:63`). Medido em linhas ativas:

| O que | Classificada como | Linhas | TA |
|---|---|---|---|
| MONITORIA | TAD/Administração | 14 | 40 |
| MONITORIA | TR | 1 | 1 |
| PORTUGUÊS | TAD/Administração | 6 | 6 |
| RECEPÇÃO | TAD | 2 | 3 |
| DEPARTAMENTO DE ALUNOS | TAD | 5 | 7 |

  As linhas do ETL que a carga substituiu classificavam Monitoria e Português como **Estudo_Individual**, que é o que a RN-EVT-01 manda. **É a divergência de maior peso deste levantamento**, porque altera o teto de TAD que §4.3 mede.
- **TFM:**
  - O teto semanal é alerta no `resolver` (`639–642`) e **recusa** no piloto (`plano.py:565–569`). `lib/dominio/dsa/tetos.ts` diz que TFM é o **único bloqueio**.
  - A atividade AEC "Orientação de TFM" **não** entra nesse teto (comentário em `tetos.ts`).
- **`origem_migracao_v1` nula nas linhas `DSAP-`, de propósito** (`plano.py:24–28`). Quem as identifica é o prefixo do código.

---

## 4. Números reais do remoto

*Medido no remoto `cqhpfuaweoyglhtrckcp` em 07/10/2026, 17:29–17:32. Turmas sem nenhum lançamento foram omitidas.*

### 4.1 Avaliações

**Por origem e situação** (`avaliacoes` junto com `vw_avaliacoes_situacao`):

| Prefixo do código | Status | `situacao_vista` | Linhas | Com vista |
|---|---|---|---|---|
| `AVA-` (ETL v2.0) | cancelada | pendente | 188 | 102 |
| `DSAP-` (planilha) | pendente | pendente | 142 | 134 |
| `DSAP-` (planilha) | pendente | **atrasada** | 45 | 0 |
| `DSAP-` (planilha) | cancelada | pendente | 1 | 1 |
| `DSA-` (tela) | pendente | pendente | 1 | 0 |

- Total: **377** linhas, sendo **188 vivas** (status diferente de `cancelada`: 187 `DSAP-` e 1 `DSA-` de tela) e **0** com status `concluida`.
- **Das vivas:** 134 com vista, 54 sem, 0 sem TA; 88 com fiscal do cadastro, 6 com fiscal externo, 14 sem responsável.

**Vivas por turma e tipo (TA de aplicação / TA de vista):**

| Turma | Prova Escrita | Prova Prática | Trabalho | Total vivas |
|---|---|---|---|---|
| C-Ap-FR 2026 | 10 (21/9) | 6 (22/2) | — | 16 |
| C-Ap-HN 2026 | 20 (52/18) | 3 (7/0) | 5 (11/3) | 28 |
| C-Esp-ME 2026 | 13 (26/13) | 6 (23/6) | — | 19 |
| C-Espc-FR 2026 | 16 (38/16) | 10 (35/5) | — | 26 |
| C-Espc-HN 2026 | 18 (46/15) | 10 (29/6) | 1 (1/1) | 29 |
| C-Exp-Ag-Mag 2026 | 2 (4/1) | — | — | 2 |
| C-Exp-BATI T1 2026 | 1 (3/1) | 1 (3/1) | — | 2 |
| C-Exp-MetocOf 2026 | 3 (8/3) | — | — | 3 |
| C-Exp-Obs-ME 2026 | 4 (11/3) | — | — | 4 |
| CAHO 2026 | 26 (63/21) | 18 (46/1) | 15 (34/13) | 59 |

### 4.2 Atividades não letivas

**Por origem:**

| Prefixo | Status | Categoria | Linhas | Com instrutor | Com responsável externo |
|---|---|---|---|---|---|
| `DSAP-` | ativo | AEC | 137 | 60 | 69 |
| `DSAP-` | ativo | TAD | 100 | 12 | 47 |
| `DSAP-` | ativo | TR | 48 | 25 | 11 |
| `DSAP-` | ativo | Estudo_Individual | 505 | 0 | 0 |
| `EXT-` (ETL) | inativo | AEC / TAD / TR / EI | 62 / 60 / 11 / 531 | 0 | 0 |

- As 664 linhas do ETL estão **inativas** (substituídas). As ativas são **790**, todas da planilha.
- **0** linhas `global`. **0** linhas ativas sem `ta_inicial`.

**TA ativo por turma e categoria** (de `vw_carga_horaria_turma`):

| Turma | AEC | TAD | TR | EI |
|---|---|---|---|---|
| C-Ap-FR 2026 | 15 | 89 | 0 | 103 |
| C-Ap-HN 2026 | 41 | 85 | 57 | 0 |
| C-Esp-ME 2026 | 17 | 29 | 0 | 96 |
| C-Espc-FR 2026 | 126 | 51 | 1 | 163 |
| C-Espc-HN 2026 | 86 | 63 | 27 | 9 |
| C-Exp-Ag-Mag 2026 | 1 | 1 | 0 | 11 |
| C-Exp-BATI T1 2026 | 1 | 2 | 0 | 0 |
| C-Exp-MetocOf 2026 | 5 | 9 | 0 | 0 |
| C-Exp-Obs-ME 2026 | 5 | 1 | 0 | 19 |
| CAHO 2026 | 57 | 40 | 30 | 128 |

⚠️ **EI quase nulo em C-Ap-HN (0) e C-Espc-HN (9)**, contra 22 e 135 linhas inativas do ETL nessas turmas. Pode ser como a planilha registra, ou falta de regra. **Não investigado; é pergunta para a conferência, não conclusão.**

**Instrutores:**
- Aulas ativas: **2.096**, todas com instrutor; **16** com "Demais instrutores" em `observacoes`.
- Avaliações vivas: **14** sem responsável, **2** sem responsável e sem fiscal.

### 4.3 Tetos, sobre as duas bases possíveis

- Os tetos e os booleanos `*_exc` saem de `vw_conformidade_tetos`, que usa a **CHR curricular**.
- As colunas "% CHD" usam a **CHD executada**, que é a base que o pedido deste levantamento supõe.
- A coluna "PROENS TAD/TR" é a reserva concedida, em TA.

| Turma | CHR | CHD exec. | AEC % CHR / % CHD | **TAD** (teto) % CHR / % CHD | TR % CHR / % CHD | PROENS TAD/TR |
|---|---|---|---|---|---|---|
| C-Ap-FR 2026 | 1165 | 796 | 1,3 / 1,9 | **89 (58,25) 7,6 / 11,2 ⚠️** | 0,0 / 0,0 | 5 / 89 |
| C-Ap-HN 2026 | 1257 | 924 | 3,3 / 4,4 | **85 (62,85) 6,8 / 9,2 ⚠️** | 4,5 / 6,2 | 5 / 16 |
| C-Esp-ME 2026 | 545 | 586 | 3,1 / 2,9 | **29 (27,25) 5,3 / 4,9 ⚠️** | 0,0 / 0,0 | — |
| C-Espc-FR 2026 | 1270 | 1048 | 9,9 / **12,0** | 51 (63,50) 4,0 / 4,9 | 0,1 / 0,1 | 0 / 7 |
| C-Espc-HN 2026 | 1216 | 1097 | 7,1 / 7,8 | **63 (60,80) 5,2 / 5,7 ⚠️** | 2,2 / 2,5 | 3 / 100 |
| C-Exp-Ag-Mag 2026 | 140 | 131 | 0,7 / 0,8 | 1 (7,00) 0,7 / 0,8 | 0 | — |
| C-Exp-BATI T1 2026 | 42 | 42 | 2,4 / 2,4 | 2 (2,10) 4,8 / 4,8 | 0 | — |
| C-Exp-MetocOf 2026 | 162 | 153 | 3,1 / 3,3 | **9 (8,10) 5,6 / 5,9 ⚠️** | 0 | — |
| C-Exp-Obs-ME 2026 | 115 | 113 | 4,3 / 4,4 | 1 (5,75) 0,9 / 0,9 | 0 | — |
| CAHO 2026 | 1668 | 1353 | 3,4 / 4,2 | 40 (83,40) 2,4 / 3,0 | 1,8 / 2,2 | 6 / 121 |

**Leitura:**
- Com a base do banco (CHR), excedem o teto de **TAD 6 turmas**, marcadas ⚠️. Nenhuma excede AEC ou TR.
- Com a base CHD executada, **C-Espc-FR passaria a exceder AEC** (12,0%), C-Esp-ME deixaria de exceder TAD (4,9%), e a lista de TAD mudaria.
- **A base muda o veredito.** Por isso a P-1 vem primeiro.
- Os 46 TA de Monitoria e Português (§3.9), se reclassificados para EI como manda a RN-EVT-01, saem do TAD. **Quanto disso cai em cada turma [pendente]**: não foi medido por turma neste levantamento, e só essa medição diz quais das 6 turmas deixam de exceder.
- **Nenhum desses alertas aparece hoje em tela** (achado 2).

---

## 5. Perguntas em lote para Bernardo Villas Boas

**P-1. Base e granularidade dos tetos.**
- Opções:
  - (a) CHR curricular do curso, por turma, como o banco faz hoje;
  - (b) AEC sobre a CHD **executada** e TAD/TR sobre a CHR;
  - (c) tudo sobre a CHD executada;
  - (d) por **curso** somando turmas, como diz a RF-EXTRA-04.
- **Recomendação: (a).**
  - A CHR é a única base estável durante o curso: a CHD executada cresce até o fim, e o percentual "melhora" sozinho no começo.
  - A equivalência "somatório das CHD = CHR" está escrita no doc 21 (864–868) e no comentário da view.
  - Por turma é o que o DSA e o `/inicio` mostram; por curso misturaria turmas de anos diferentes.
  - **Mas ratificar por escrito, e emendar o Glossário (CHR é a base "de TAD e TR" — falta AEC).**

**P-2. Onde mora a classificação AEC/TAD/TR/EI de cada subtipo.**
- Opções:
  - (a) `config_listas.tipos_atividade.metadados.categoria` como fonte única, com a tela derivando a categoria do subtipo;
  - (b) a categoria escolhida livremente na tela, com o subtipo só sugerido;
  - (c) a tabela de palavras do `resolver.py` promovida a regra.
- **Recomendação: (a).** Ela já existe e foi semeada pela spec 013 (H2). É dado administrável (regra 8). E a tabela de palavras da carga passa a ser só sugestão auditada pelo lote.

**P-3. Vista de prova em mais de uma sessão.**
- Opções:
  - (a) tabela filha `avaliacoes_vistas` (1:N), com cada sessão compondo a CHD;
  - (b) a segunda sessão como aula da disciplina;
  - (c) manter como AEC (convenção atual do `C-Espc-HN`).
- **Recomendação: (a).** A RN-EVT-03 põe a vista na CHD; (c) a move para AEC e infla o teto errado. (a) preserva o "fato único" da RN-AVAL-02: a prova continua sendo uma linha, e a vista passa a ter N sessões ligadas a ela. Hoje a medida é de **1** caso, então dá para decidir sem pressa.

**P-4. Avaliação × UE (`PEND-E8-1`).**
- Opções:
  - (a) `avaliacoes.unidade_ensino_id` **anulável**, preenchida só quando a planilha ou a pessoa nomear a UE, e o previsto da UE contando prova + vista;
  - (b) descontar o tempo de prova do previsto de cada UE;
  - (c) manter a avaliação só na disciplina e o painel por UE avisando "inclui tempo de prova".
- **Recomendação: (a).** É o grão da UE-1. Respeita a Q1.b: corrige quem nomeia a origem, e nunca por inferência do texto. Não reescreve o catálogo da DEnsM, que (b) faria.

**P-5. Papéis de pessoa na avaliação.**
- Opções:
  - (a) três papéis: aplicador (exige habilitação), fiscal (qualquer pessoa) e condutor da vista (coluna nova, qualquer pessoa);
  - (b) manter dois papéis, com "quem conduz a vista vira responsável" (carga atual);
  - (c) manter dois papéis, com o aplicador sempre o responsável e a vista sem dono.
- **Recomendação: (a).**
  - A RF-AVAL-01 já separa "aplicação" de "fiscalização/vista".
  - A convenção (b) troca o aplicador sem decisão e distorce `vw_instrutor_carga_anual`, que alimenta a LIQ.
  - E é preciso decidir se TA de vista credita a carga docente do condutor.

**P-6. Mais de um instrutor por lançamento.**
- Opções:
  - (a) tabela de junção para aula, avaliação e atividade, com rateio de TA declarado;
  - (b) junção só para crédito, sem rateio;
  - (c) manter o "primeiro nome + observações" e corrigir apenas o descarte silencioso na avaliação.
- **Recomendação: (c) agora e (a) como pendência nomeada.**
  - (c) fecha a perda de dado (o segundo nome da avaliação some) sem migration.
  - (a) é novidade em relação à v2.0, que também guardava um só (regra 3, paridade antes de novidade).

**P-7. Evento de várias turmas.**
- Opções:
  - (a) escopo `global` para evento de **todas** as turmas ativas e linha por turma para o resto, como hoje;
  - (b) um "evento" pai com N linhas filhas por turma;
  - (c) linha por turma sempre.
- **Recomendação: (a)**, e consertar `vw_carga_horaria_turma` para somar a global às turmas ativas na data. É o critério 5 do Épico 9 e o desenho que o banco já tem. (b) é novidade.

**P-8. Responsável externo e nome de pessoa.**
- Opções:
  - (a) texto livre só para **entidade** (DOEP, CIAARA-30) e para palestrante, com todo texto novo passando pelo lote de decisões, e a carga transformando a omissão atual em pendência;
  - (b) como hoje;
  - (c) cadastro próprio de colaborador externo.
- **Recomendação: (a).** Fecha o caminho por onde nome de pessoa entra sem decisão. O desenho de coluna (Q-8 da spec 013) já existe. (c) é novidade.

**P-9. Como registrar avaliação substituída, excluída e cancelada.**
- Opções:
  - (a) ratificar `cancelada` + marca em `observacoes` (forma atual);
  - (b) uma coluna `motivo_cancelamento` (`config_listas`: cancelada, excluída na tela, substituída pela carga, saiu da planilha) e o status anterior em coluna, não em texto;
  - (c) `status_registro ativo|inativo` separado do status de execução.
- **Recomendação: (b).** Hoje `cancelada` significa três coisas. O painel do Épico 8 precisa distingui-las. E reativar deveria devolver o status anterior, não `pendente` (`sincronizar.py:253`).

**P-10. Quem e o que marca a avaliação `concluida`.**
- Opções:
  - (a) situação **derivada na leitura**: aplicada se tem TA, vista realizada se tem TA de vista, sem gravar `status`;
  - (b) a carga e o DSA gravarem `concluida` quando há aplicação e vista;
  - (c) botão manual.
- **Recomendação: (a).** É o padrão do projeto ("situação que depende de hoje é calculada", `fn_status_vista`). Elimina o estado impossível medido: 134 vistas feitas aparecendo "pendente" e 45 "atrasadas". Exige separar **data prevista da vista** de **vista registrada**, o que fecha também a contradição 4 da §1.6.

**P-11. Agendar consome TA?**
- Opções:
  - (a) **não**: consome ao lançar no DSA (schema, doc 06 e doc 21);
  - (b) sim (RF-AVAL-04/05, RN-AVAL-02 literal).
- **Recomendação: (a)**, mas **com emenda nominal no documento 04**. Hoje o banco segue um "RN-AVAL-02 revisada" que **não existe** no documento 04, e a regra 1 diz que o documento 04 só muda com a sua autorização.

**P-12. Monitoria, Português, Recepção e Apoio à Instrução.**
- Opções:
  - (a) seguir a RN-EVT-01: Monitoria e Português → Estudo Individual, e corrigir `resolver.py:63` antes da próxima rodada;
  - (b) emendar a RN-EVT-01 para TAD.
- **Recomendação: (a).** É o que o documento 04 e o próprio `config_listas` dizem. A carga atual altera um teto normativo sem decisão.
- Recepção, Departamento de Alunos e Apoio à Instrução não estão no documento 04: **precisam da sua classificação nominal**.

**P-13. Estudo Individual 20%/10%.**
- Opções:
  - (a) parâmetro `teto.ei_referencia_*` em `config_parametros` mais indicador informativo;
  - (b) fora do Épico 9.
- **Recomendação: (a)**, como **informativo** e nunca alerta de teto: a regra o descreve como acompanhamento, e todo parâmetro normativo é dado (regra 8).

**P-14. Ordem dos épicos.**
- Opções:
  - (a) Épico 9 antes do 8 (doc 06:832);
  - (b) Épico 8 antes.
- **Recomendação: (a)**, com a P-10 resolvida antes. Ela é pequena e conserta um indicador que o DSA já publica errado.
