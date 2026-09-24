# Análise dos currículos × banco — insumo da fatia (b) do Épico 5

**Medido em 24/09/2026** *(regra 9.2 do `CLAUDE.md`: todo número nomeia o artefato)*. Esta análise
é **documento**, não código: nada aqui escreveu no banco local nem no remoto.

## 1. Artefatos e procedimento — para reconferir

| Artefato | O que é | Como foi obtido |
|---|---|---|
| **Currículos** | 24 PDFs em `C:\Users\VILLAS BOAS\OneDrive\Documentos\SIS11\Curriculos\` (fora do repositório) | listados com `ls` — os nomes estão na tabela §2 |
| **Extração** | `scripts/etl/extrair_unidades_ensino.py <dir_curriculos> <dir_saida>` — **o extrator existente, sem segunda implementação** | reexecutado hoje para `%TEMP%\ue-hoje\`; saída `unidades_ensino.{csv,json}` |
| **Catálogo versionado** | `scripts/etl/dados/unidades_ensino.csv` (extração de 28/08/2026) | comparado linha a linha com a extração de hoje: **0 linhas só num lado, 0 só no outro** — o conteúdo é idêntico; só a ordem/`md5` difere |
| **Banco local** | retrato do remoto, cópia `remoto-20260924-153818.sql` (`dado_do_remoto.py`, 24/09/2026) — `cursos=24 · disciplinas=175 · turmas=28 · registros_aula=1566` | `docker exec supabase_db_ciaara-11-v2-1 psql -U postgres -d postgres` |
| **Lista de disciplinas do banco** | `select c.codigo, d.cod_disciplina, d.nome_disciplina, d.carga_horaria_tempos, d.ordem_sugerida, d.status from disciplinas d join cursos c on c.id = d.curso_id` | 175 linhas |

**Pareamento.** Por **nome normalizado** (sem acento, maiúsculas, sem pontuação), depois por
**prefixo único**, depois por **código** (um caso: `PCN-PR-VII-EAD`). Onde a grafia difere só por
abreviação ou palavra perdida, a tabela §4.5 registra o par **e** a diferença — o pareamento **não
corrige** nome nenhum. **CH:** o currículo declara **horas**; o banco guarda **tempos** — e o
comentário da coluna `disciplinas.carga_horaria_tempos` fixa *"Unidade: TA (1 TA = 1 hora de carga)"*.
A comparação usa **igualdade numérica** sob essa convenção; se ela estiver errada, as 4 divergências
de CH de §4.1 mudam de natureza — está na pergunta **Q-12** da spec.

## 2. Currículo por currículo — o que o extrator leu

| Arquivo (`SIS11/Curriculos/`) | Sigla no currículo | Sigla no banco (`cursos.codigo`) | Disciplinas lidas | UEs |
|---|---|---|---|---|
| `2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf` | `CAHO` | `CAHO` | 21 | 132 |
| `4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf` | `C-Ap-FR` | `C-Ap-FR` | 13 (**1 sem lista de UE**) | 50 |
| `c-ap-hn.pdf` | `C-Ap-HN` | `C-Ap-HN` | 18 | 95 |
| `2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf` | `C-ApA-AuxNav-PR-SP` | igual | 7 | 17 |
| `of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf` | `C-ApA-OcOp-PR-SP` | igual | 10 | 26 |
| `2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf` | `C-ApA-PCN-PR-EAD` | igual | 7 | 18 |
| `of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf` | `C-ApA-PrevMe-PR-EAD` | igual | 7 | 25 |
| `c-esp-alh.pdf` | `C-Esp-ALH` | igual | 9 | 21 |
| `c-esp-me.pdf` | `C-Esp-ME` | igual | 12 | 62 |
| `c-esp-opap.pdf` | `C-Esp-OpAP` | igual | 4 | 9 |
| `c-exp-agmag.pdf` | `C-Exp-AgMag` | `C-Exp-Ag-Mag` | 2 | 6 |
| `c-exp-bati.pdf` | `C-Exp-BATI` | igual | 1 | 9 |
| `c-exp-metocof_0.pdf` | `C-EXP-METOC-OF` | `C-Exp-MetocOf` | 5 (**todas com ordinal `?`**) | 27 |
| `of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf` | `C-Exp-Metoc-OF-SP` | igual | 4 | 24 |
| `c-exp-obs-me_0_0.pdf` | `C-EXP-OBS-ME` | `C-Exp-Obs-ME` | 2 | 9 |
| `curriculo-ciaara-est-qf-aphid_presencial_mod2.pdf` | `EST - QF - APHID` | `EST-QF-APHID` | 5 | 15 |
| `curriculo-ciaara-est-qf-em2040phs.pdf` | `EST - QF -  EM2040PHS` | `EST-QF-EM2040PHS` | 3 | 6 |
| `est-qf-mareflu.pdf` | `EST-QF-MAREFLU` | igual | 1 | 4 |
| `est-qf-navflu-ead.pdf` | `EST - QF - NAVFLU - EAD` | `EST-QF-NAVFLU-EAD` | 1 | 7 |
| `est-qf-pgrs100.pdf` | `EST - QF - PGRS100` | `EST-QF-PGRS100` | 2 | 9 |
| `curriculo-ciaara-est-qf-proc-mf-ead_mod3.pdf` | `EST - QF – PROC – MF - EAD` | `EST-QF-PROC-MF-EAD` | 1 | 1 |
| `marinha_do_brasil_-_curriculo-do-est-qf-apoc.pdf` | *(nenhuma — o extrator não achou texto)* | `EST-QF-APOC` | 0 | 0 |
| `of10-82-2024-densm-ana-c-espc-fr.pdf` | `C-Espc-FR` | igual | 0 | 0 |
| `of10-82-2024-densm-anb-c-espc-hn.pdf` | `C-Espc-HN` | igual | 0 | 0 |

**Totais:** 24 currículos · **21** com UE · **135** registros de disciplina lidos, **134** com lista de
UE · **572** UEs · invariante *soma das UE = CH da disciplina* **fecha em 134 de 134, 0 divergem, 0 não
aferíveis** (saída do extrator, hoje). **8 siglas** de currículo não batem com `cursos.codigo` e foram
mapeadas à mão (coluna 3) — é o "terceiro espaço de nomes" que o `CLAUDE.md` já registrava no Épico 2.

**Norma de origem.** O nome do arquivo carrega o Ofício da DEnsM em **9** currículos (`of-10-6-2025`,
`of-10-26-2022`, `of-10-31-????`, `of-10-16-2023`, `of-10-16-2025`, `of-10-27-2022`, `of10-82-2024` ×2 e
o de CAHO). Nos **15** restantes o Ofício só pode vir **do corpo do PDF** — não foi lido nesta rodada,
e a spec proíbe inventá-lo (`FR-050`).

### 2.1 Os três currículos sem UE — confirmados, com a distinção que importa

| Curso | O que o extrator viu | O que isso significa |
|---|---|---|
| `EST-QF-APOC` | **PDF sem camada de texto** (digitalizado) — 0 caracteres extraíveis | ⚠️ **NÃO está estabelecido que não tem UE.** Está estabelecido que **não dá para ler por máquina**. Só OCR ou transcrição humana diz se há `LISTA DE UNIDADES DE ENSINO` |
| `C-Espc-FR` | texto legível, **modelo por competências** (`COMPETÊNCIA TÉCNICA` → `INDICADORES`), sem lista de UE | curso **sem UE por desenho do currículo** — trabalha inteiro sem UE (D-B3) |
| `C-Espc-HN` | idem | idem |

## 3. Curso a curso — currículo × banco

*(disc. curr. = registros com lista de UE; pareadas = disciplina do banco com par no currículo; CH
diverge = par cuja CH difere; UEs = quantas UEs do currículo aterrissam pelo pareamento)*

| Curso | Disc. curr. | Disc. banco | Pareadas | Curr. sem par | Banco sem par | CH diverge | UEs que aterrissam |
|---|---|---|---|---|---|---|---|
| `C-Ap-FR` | 12 (+1 sem UE) | 13 | 13 | 0 | 0 | 1 | 50 de 50 |
| `C-Ap-HN` | 18 | 19 | 17 | **1** | **2** | 0 | 88 de 95 |
| `C-ApA-AuxNav-PR-SP` | 7 | 8 | 7 | 0 | 1 | 0 | 17 de 17 |
| `C-ApA-OcOp-PR-SP` | 10 | 11 | 10 | 0 | 1 | 0 | 26 de 26 |
| `C-ApA-PCN-PR-EAD` | 7 | 8 | 7 | 0 | 1 | 0 | 18 de 18 |
| `C-ApA-PrevMe-PR-EAD` | 7 | 8 | 7 | 0 | 1 | 0 | 25 de 25 |
| `C-Esp-ALH` | 9 | 9 | 9 | 0 | 0 | 0 | 21 de 21 |
| `C-Esp-ME` | 12 | 12 | 12 | 0 | 0 | 0 | 62 de 62 |
| `C-Esp-OpAP` | 4 | 4 | 4 | 0 | 0 | 0 | 9 de 9 |
| `C-Espc-FR` | 0 | 17 | 0 | 0 | 17 | 0 | — |
| `C-Espc-HN` | 0 | 14 | 0 | 0 | 14 | 0 | — |
| `C-Exp-Ag-Mag` | 2 | 2 | 2 | 0 | 0 | 0 | 6 de 6 |
| `C-Exp-BATI` | 1 | 1 | 1 | 0 | 0 | 0 | 9 de 9 |
| `C-Exp-Metoc-OF-SP` | 4 | 6 | 4 | 0 | **2** | 0 | 24 de 24 |
| `C-Exp-MetocOf` | 5 | 5 | 5 | 0 | 0 | **2** | 27 de 27 |
| `C-Exp-Obs-ME` | 2 | 2 | 2 | 0 | 0 | 0 | 9 de 9 |
| `CAHO` | 21 | 22 | 21 | 0 | **1** | **1** | 132 de 132 |
| `EST-QF-APHID` | 5 | 5 | 5 | 0 | 0 | 0 | 15 de 15 |
| `EST-QF-APOC` | 0 | 1 | 0 | 0 | 1 | 0 | — |
| `EST-QF-EM2040PHS` | 3 | 3 | 3 | 0 | 0 | 0 | 6 de 6 |
| `EST-QF-MAREFLU` | 1 | 1 | 1 | 0 | 0 | 0 | 4 de 4 |
| `EST-QF-NAVFLU-EAD` | 1 | 1 | 1 | 0 | 0 | 0 | 7 de 7 |
| `EST-QF-PGRS100` | 2 | 2 | 2 | 0 | 0 | 0 | 9 de 9 |
| `EST-QF-PROC-MF-EAD` | 1 | 1 | 1 | 0 | 0 | 0 | 1 de 1 |
| **Total** | **134** (+1) | **175** | **134** | **1** | **41** | **4** | **565 de 572** |

**Leitura dos totais:** 565 UEs têm disciplina de destino **inequívoca** no banco; **7** (as do
`HN-2101-0621`) não têm — ver §4.2. Os **41** sem par no banco se explicam **inteiros** em §4.3 — não
há sobra sem explicação. (Pareadas: 133 com lista de UE + `VIII` TOPOGRAFIA de `C-Ap-FR`, que pareia com
a disciplina do currículo que não tem lista — §4.4.)

## 4. As diferenças, uma a uma

### 4.1 CH divergente entre par (4)

| Curso | Disciplina | Banco (tempos) | Currículo (h) | Natureza |
|---|---|---|---|---|
| `C-Ap-FR` | `III` EQUIPAMENTOS DE AUXÍLIOS À NAVEGAÇÃO | 76 | 75 | divergência real, de 1 |
| `C-Exp-MetocOf` | `I` METEOROLOGIA | 48 | 30 | divergência real |
| `C-Exp-MetocOf` | `V` ESTÁGIO PRÁTICO | 40 | 50 | divergência real |
| `CAHO` | `MAT` (nivelamento de matemática) | 28 | 56 | **não é divergência: é desdobramento** — o currículo tem `MATFIS` 56 h, e o banco tem `MAT` 28 + `FIS` 28 (ver §4.2) |

Nenhuma foi "corrigida" em lado nenhum. Qual lado vale, e como a CH da disciplina se concilia com a
soma das UEs dela (invariante 134/134), é **Q-06** e **Q-12** da spec.

### 4.2 Uma disciplina do currículo, duas no banco (2 casos, 7 + 3 UEs)

| Currículo | Banco | Soma confere? | UEs do currículo |
|---|---|---|---|
| `C-Ap-HN` · `HN-2101-0621` MATEMÁTICA E FÍSICA APLICADAS À HIDROGRAFIA · 126 h · **7 UEs** | `I` MATEMÁTICA APLICADA À HIDROGRAFIA 105 + `I-I` FÍSICA APLICADA À HIDROGRAFIA 21 | 105 + 21 = **126** ✓ | sem destino único — cada UE pertence a uma das duas metades, e **só o currículo diz qual** |
| `CAHO` · `MATFIS` 56 h · **3 UEs** | `MAT` 28 + `FIS` NIVELAMENTO DE FÍSICA 28 | 28 + 28 = **56** ✓ | idem (aqui `MAT` pareou com `MATFIS` pelo prefixo, e é por isso que aparece em §4.1) |

⚠️ A carga **não pode decidir isto por inferência** (D-B4). Ou o pareamento é feito **por UE**, lendo
o tópico contra o currículo, ou as duas linhas do banco voltam a ser uma — as duas saídas mudam o
banco e estão em **Q-05**.

### 4.3 Disciplina do banco sem par no currículo (41)

| Classe | Quantas | Quais | O que significa para a carga |
|---|---|---|---|
| Curso sem UE | **32** | as 17 de `C-Espc-FR`, as 14 de `C-Espc-HN`, a 1 de `EST-QF-APOC` | não recebem UE — D-B3; APOC fica pendente de leitura humana (§2.1) |
| `AMBIENTAÇÃO VIRTUAL` | **5** | `cod_disciplina = '-'`, 8 tempos, em `C-ApA-AuxNav-PR-SP`, `C-ApA-OcOp-PR-SP`, `C-ApA-PCN-PR-EAD`, `C-ApA-PrevMe-PR-EAD`, `C-Exp-Metoc-OF-SP` | disciplina **operacional da v2.0** que o currículo da DEnsM não declara. Fica **sem UE**, e a tela não pode cobrar UE dela (D-B3 vale por disciplina, não só por curso) |
| Metades de desdobramento | **3** | `C-Ap-HN` `I` e `I-I`; `CAHO` `FIS` | §4.2 |
| Disciplina "emprestada" de outro curso | **1** | `C-Exp-Metoc-OF-SP` `IV` *EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETROMAGNÉTICA / C-Exp-METOC-OF*, 18 tempos | o nome carrega a sigla do **outro** curso, cujo currículo tem a disciplina (`IV`, 18 h, 5 UEs). Replicar as 5 UEs no curso SP seria **inferir**; fica em **Q-05** |

**Conferência:** 32 + 5 + 3 + 1 = **41** ✓.

### 4.4 Disciplina do currículo sem lista de UE (1)

`C-Ap-FR` · `FR-2208-1010` TOPOGRAFIA · 100 h — o extrator achou a disciplina e **nenhuma**
`LISTA DE UNIDADES DE ENSINO` sob ela. Pareia com `VIII` TOPOGRAFIA 100 do banco. **Precisa de leitura
humana do PDF**: ou o currículo realmente não lista UE para ela, ou o extrator não a viu. Registrado,
não decidido (**Q-05**).

### 4.5 Nome diferente entre par (grafia — pareado, não corrigido)

| Banco | Currículo | Onde |
|---|---|---|
| `TFM.` | TREINAMENTO FÍSICO MILITAR | `C-Ap-FR` `X` · `C-Ap-HN` `XVII` · `CAHO` `XIX` |
| `… DE  DE CURSO.` (dois espaços — perdeu **FIM**) | … DE FIM DE CURSO | `C-Ap-FR` `XIII` · `C-Ap-HN` `XVIII` · `C-ApA-OcOp-PR-SP` `X` (currículo: DE **FINAL** DE CURSO) · `CAHO` `XVIII` · `C-ApA-PCN-PR-EAD` `PCN-PR-VII-EAD` *PROJETO DE  DE CURSO* × *TRABALHO DE FIM DE CURSO* (pareado **pelo código**) · `C-Espc-FR` `MBFCFR-017` (curso sem currículo com UE) |
| `OPERAÇÕES E ADM DE …` | OPERAÇÕES E ADMINISTRAÇÃO DE … | `C-Ap-FR` `V` |
| `INFO. APLICADA …` | INFORMÁTICA APLICADA … | `C-Ap-HN` `II` |
| `… FEITOS EM ALVENARIA` | … FEITOS DE ALVENARIA | `C-Ap-FR` `IX` |
| `… DE AUXÍLIOS À NAVEGAÇÃO` | … DE AUXÍLIO À NAVEGAÇÃO | `C-Ap-FR` `XII` |
| `DESENVOLVIMENTOS PARA O FUTURO` | DESENVOLVIMENTO PARA O FUTURO | `C-ApA-PCN-PR-EAD` `PCN-PR-VI-EAD` |
| `TÓPICOS ESPECIAIS DE MARÉ` | TÓPICOS ESPECIAIS EM MARÉS | `C-ApA-OcOp-PR-SP` `IV` |
| `RADAR BEACON E AIS AtoN` | RADAR BEACON (RACON) E AIS AtoN | `C-ApA-AuxNav-PR-SP` `IV` |
| `… BATIMETRIA MONOFEIXE E MULTIFEIXE` | … BATIMETRIA | `C-Esp-ALH` `ALH-VIII` |
| `… PARA A ANÁLISE DE LEVANTAMENTOS HIDROGRÁFICOS` | … PARA ANÁLISE DE LEVANTAMENTOS | `C-Esp-ALH` `ALH-IX` |
| `LEVANTAMENTO HIDROGRÁFICO DE  DE CURSO` | LEVANTAMENTO HIDROCEANOGRÁFICO DE FIM DE CURSO | `CAHO` `XVIII` |
| `METODOS DE COMP. AGU-MAG-1` / `-2` | MÉTODOS DE COMPENSAÇÃO DE AGULHA MAGNÉTICA / PRÁTICA DE COMPENSAÇÃO DE AGULHA MAGNÉTICA | `C-Exp-Ag-Mag` `I` / `II` |
| `PRÁTICA DE PROCESSAMENTO DE DADOS` | PRÁTICA DE PROCESSAMENTO **DE DE** DADOS | `EST-QF-APHID` `V` · `EST-QF-PROC-MF-EAD` `I` — o "DE DE" está **na extração**; se está no PDF, é achado do currículo |
| `EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETROMAGNÉTICA / C-Exp-METOC-OF` | EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETRO | `C-Exp-MetocOf` `IV` — o nome **saiu truncado da extração** (achado do extrator, §6) |

A spec manda que o nome da UE **siga a grafia do currículo** — mas **renomear disciplina do banco não
é desta carga**: é **Q-13**.

## 5. Banco — o que mais foi medido para esta fatia

| Medida | Valor | Consulta / artefato |
|---|---|---|
| `unidades_ensino` | **0** linhas | `select count(*) from unidades_ensino` |
| `registros_aula` | 1.566 · **0** com `unidade_ensino_id` · **1.566** com `disciplina_codigo_legado_v1`, e **1.566** casam com `disciplinas.codigo` (81 códigos distintos) | `select … from registros_aula r` |
| catraca | `reg_aula_ue_so_nula_no_historico`: UE nula só em linha migrada **e nunca editada** | `pg_constraint` |
| FKs para `disciplinas` / `unidades_ensino` | **todas `ON DELETE RESTRICT`**: `avaliacoes` (2), `instrutor_disciplina`, `planejamento_anual`, `registros_aula → unidades_ensino` (2, uma composta com `curso_id`), `turma_disciplina`, `unidades_ensino → disciplinas` (2) | `pg_constraint` |
| disciplinas **sem dependente nenhum** (sem `turma_disciplina`, vínculo, avaliação, planejamento) | **0 de 175** — toda disciplina real tem ao menos a linha de `turma_disciplina` | consulta com `not exists` ×4 |
| `avaliacoes` com `disciplina_id` | 188, em 62 disciplinas · `planejamento_anual`: 0 | idem |
| unicidade de código | índice **parcial** `uq_disciplinas_curso_cod_ativo (curso_id, cod_disciplina) where status = 'ativo'` **+** gatilho `trg_disciplinas_unicidade` (`validar_unicidade_disciplina`, só entre ativas, `errcode 23505`) | `pg_indexes`, `pg_proc.prosrc` sem comentário |
| duplicata de código | entre ativas **0**; contando inativas **1** — `C-Esp-ALH` `ALH-II`: `95 - C-Esp-ALH - ALH-II` (ativo, *SISTEMAS DE INFORMAÇÃO…*) e `96 - C-Esp-ALH - ALH-II` (**inativo**, *PUBLICAÇÕES E NORMAS*), cada uma com 1 linha de `turma_disciplina` | consulta por `(curso_id, cod_disciplina)` |
| `RN-MAT-02` (duplicatas em `C-Ap-FR`) | **0** | idem |
| `modo_atribuicao` (ENUM) | rótulos **`herdar`, `dividido`, `simultaneo`** — em `disciplinas.modo_atribuicao_padrao`; **não há** coluna de modo em `turma_disciplina` nem em `turma_disciplina_instrutor` | `pg_enum`, `information_schema.columns` |
| `modo_atribuicao_padrao = 'simultaneo'` | **0 de 175** | `select count(*)` |
| `disciplinas.instrutores_atribuidos` (`uuid[]`) | vazio nas 175; comentário: *"Atribuição de PLANEJAMENTO (RN-CRONOS-01) … PENDENTE DE DECISÃO: normalizar em tabela própria"* | `col_description` |
| `turma_disciplina` | 210 · `origem_periodo`: `herdado_grade` 89 · `nao_informado` 121 · `manual` 0 · `instrutor_id` preenchido em **79** · `ch_prevista_por_instrutor` preenchido em **0** | `select …` |
| `turma_disciplina_instrutor` | **96** linhas em **85** `turma_disciplina` · `ch_prevista_tempos` **NULL nas 96** · `papel` NULL nas 96 · `status` ativo | idem |
| coerência `instrutor_id` × junção | das 79 com `instrutor_id`, **79** também têm linha na junção e **0** têm `instrutor_id` fora dela; **6** `turma_disciplina` têm junção **sem** `instrutor_id` | consulta com `exists` |
| `instrutor_disciplina` (habilitação) | 798 (797 ativas) · **120** disciplinas com ao menos um habilitado · **55** sem nenhum | idem |
| cursos com 2+ turmas **no mesmo ano** | **4** — `C-ApA-AuxNav-PR-SP`, `C-ApA-OcOp-PR-SP`, `C-ApA-PCN-PR-EAD`, `C-ApA-PrevMe-PR-EAD`, todos `T1 2026` / `T2 2026` | `group by curso_id, ano_letivo` — é o dado real para o critério 4 |
| policies de `unidades_ensino` | `ler` / `criar` / `editar` sobre `app.pode('disciplinas', …)` + `alcanca_curso` + `curso_em_oferta`; **não existe** recurso `unidades_ensino` na matriz | `pg_policies`, `perfil_permissao` |
| `disciplinas.criar` | admin, encarregado_administracao_academica, ajudante_administracao_academica · **`editar`**: os três + **operador** · `ler`: os 9 perfis | `perfil_permissao` |
| `DELETE` | **0** privilégios para `authenticated` em `public`, **0** policies `FOR DELETE`; a exceção existente é RPC: `public.excluir_instrutor(uuid, text)` INVOKER → `app.excluir_instrutor` DEFINER, com `app.impedimentos_de_exclusao_do_instrutor`; a função **não grava rastro** — só confere permissão, código de confirmação e impedimentos, e apaga | `pg_proc`, `proacl`, `prosrc` |
| tabelas com cara de log | só `migracao_log` | `information_schema.tables` |
| `config_parametros` | 31 normativos · 2 operacionais · **nenhum** limiar de "início em ≤ N dias"; chaves seguem `area.nome` (`alocacao.limite_ta_dia_padrao`) | `select chave …` |
| `vw_disciplinas_execucao` | por (disciplina, turma): `previsao_*_efetiva`, `origem_periodo`, `data_real_inicio/termino`, `ta_executados`, `ta_saldo`; **lê aula via `unidades_ensino`** — com a tabela vazia, `ta_aula_executados` é 0 em toda linha | `pg_get_viewdef` |
| `vw_unidades_ensino_execucao` | existe, no grão de UE × turma | `information_schema.columns` |

## 6. Achados sobre o extrator — reportados, não corrigidos

1. **`c-exp-metocof_0.pdf` sai com ordinal `?` nas 5 disciplinas** (o layout não expõe o ordinal do jeito
   que o extrator procura). As 5 fecham a invariante e pareiam por nome; o efeito é só que **não se
   pareia por ordinal** neste currículo.
2. **Um nome saiu truncado**: *EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETRO* (mesmo arquivo). A carga
   que usar o nome do currículo para esta disciplina precisa do nome inteiro — **do PDF, não do CSV**.
3. **"DE DE DADOS"** em dois estágios (§4.5) — a duplicação está na extração; se estiver no PDF, o
   nome carregado repete o currículo e a spec anota a origem.
4. **TOPOGRAFIA de `C-Ap-FR` sem lista de UE** (§4.4).
5. **`EST-QF-APOC` não é "sem UE"; é "sem texto"** (§2.1).

Nenhum destes foi corrigido no extrator, no dado versionado ou no banco: o pedido desta rodada é
**documento**, e corrigir extrator é código.
