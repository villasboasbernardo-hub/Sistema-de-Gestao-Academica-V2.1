# Spec 033 — Bloco 18: o módulo de Atividades (catálogo, AEC previstas, palestras, APOINST, filtros e estatísticas)

**Pedido:** Bernardo Villas Boas, 03/11/2026, pelo `/corrigir` — *"Bloco de ATIVIDADES (próximo número livre) — módulo de
Atividades completo: catálogo de tipos, AEC previstas no currículo, palestras, APOINST, visitas, filtros e estatísticas.
Rodar sozinho até o PR, com UMA parada obrigatória no passo 0. Registrar as regras novas como RA-1 a RA-9 em
docs/correcoes/regras-de-atividades.md, apontadas no CLAUDE.md e no documento 04."*
**Passo 0** conferido por Bernardo em **03/11/2026** — *"RECOMENDAÇÕES, com estes detalhes"* (as sete decisões estão em
[`regras-de-atividades.md`](../../docs/correcoes/regras-de-atividades.md) §*As decisões da conferência do passo 0*); a
tabela medida está em [`passo-0-aec-dos-curriculos.md`](passo-0-aec-dos-curriculos.md).
**Ramo:** `feat/BLOCO-18-atividades`, a partir da `main` `d77f21d` (Bloco 17 encerrado). **Regras novas:** **RA-1 a RA-9**.
**Banco:** duas migrations (M1 só acrescenta; M2 recria com efeito zero medido, condição do item 1 do passo 0) e duas
cargas no remoto por script, com autorização nominal (itens 6 e 7). ⚠️ **O papel do DSA muda para dado NOVO** (o rótulo
do tipo e o «Conta como TA da disciplina»); nenhuma semana publicada muda (§6.4).

## 1. O problema, em uma frase

O módulo Atividades é só uma lista de leitura com um filtro; o currículo não diz quais palestras e visitas a turma tem de
cumprir; a APOINST não existe como planejamento; o lançamento de atividade não deixa o operador dizer *como* o tempo conta
nem quem é o palestrante de fora; e não há estatística nenhuma para a DEnsM ou para a auditoria interna.

## 2. Paridade ou novidade (regra 3)

- **Novidade pedida nominalmente** (o pedido inteiro): catálogo administrável, AEC previstas, APOINST planejada, marcação à
  mão, estatísticas e avisos. A autorização nominal é o próprio pedido e a conferência do passo 0.
- **Emenda nominal de regra registrada:** a classificação da atividade deixa de ser **só** do tipo (D-AA-3 da spec 014,
  `RF-EXTRA-01` do documento 02): o tipo dá a classificação **padrão**, e o operador pode trocá-la no lançamento (RA-1,
  decisão 1). O documento 04 **não muda regra**: os limites seguem alerta (`RN-DEG-02`), as seis categorias da `RN-EVT-01`
  ficam, e «Conta como TA da disciplina» é **CHD** (a `RN-EVT-01` diz que AEC não conta para a CHD de disciplina nenhuma).
- **Contenção de escopo (regra 2):** tudo é da CIAARA-11 — o DSA, o currículo da turma e os limites de AEC/TAD/TR.

## 3. A triagem — o pedido, item a item, medido na `main` `d77f21d` e na cópia `remoto-20261103-103124.sql`

| # | Item | Tipo | Medido |
|---|---|---|---|
| 1 | Catálogo de tipos (RA-1) | regra nova | A lista é `config_listas` `tipos_atividade`: **21** linhas, **15** com categoria; o gatilho `app.categoria_pelo_tipo` grava a categoria e o `subtipo` pelo **valor** do tipo. Não há tela que edite a lista (as salas, na mesma tabela, têm `/admin/salas`). «Atividade Extracurricular»: **10** lançamentos (8 ativos), AEC |
| 2 | AEC previstas no currículo (RA-2) | regra nova | Não existe tabela; a aba *Atividades* de *Editar curso → Currículo* tem só os limites (`LimitesDoCurriculo.tsx`). Os 24 currículos são o currículo 1, vigente desde 01/01/2026; **11** estão **em uso** (`app.curriculo_em_uso_com_lancamento`), entre eles os **8** que recebem AEC previstas na carga |
| 3 | A turma herda «a cumprir» (RA-3) | regra nova | — |
| 4 | Lançamento no DSA (RA-4) | regra nova | O formulário escolhe a **categoria** por botão e o tipo pela categoria; mostra *«Conta como: …»* só leitura; o responsável é instrutor **ou** nome livre num campo só; o local é texto livre com a sala da turma. Nenhuma das **1.594** linhas de `atividades_nao_letivas` (ativas, inativas e rascunhos) tem `disciplina_id` |
| 5 | Palestra cumprida (RA-5) | regra nova | — |
| 6 | APOINST planejada (RA-6) | regra nova | O tipo «Apoio à Instrução» (AEC) tem **14** lançamentos, todos de 2026 |
| 7 | Ano da turma (RA-7) | já é regra (RT-6) | `predicadoDoAno` (Bloco 10) já recorta a lista de Atividades pelo ano da turma |
| 8 | Avisos (RA-8) | regra nova | O aviso de **teto** (`turmas:teto_*`, `tetosDaTurma`) já existe |
| 9 | Estatísticas (RA-9) | regra nova | A lista de Atividades não tem estatística nem ação por linha |
| T1 | Módulo Atividades em abas, filtros, estatísticas | tela | Abas *Atividades · Calendário · Palestras* (esta «Em breve»); filtros turma, categoria, tipo (texto), de, até |
| T2 | Turma: Palestras e APOINST; Atividades com filtros | tela | As abas da turma são *Ficha · Avaliações · APOINST · Palestras* (as duas últimas «Em breve»); **não há aba Atividades** |
| T3 | DSA: abas Palestras e APOINST; campos da RA-4 | tela | As abas de acompanhamento do DSA têm *APOINST* e *Palestras* «Em breve» |
| T4 | Curso: AEC previstas em *Editar curso → Currículo → Atividades* | tela | — |

## 4. As regras (RA) e como cada uma se aplica

As nove regras, com o texto de Bernardo, estão em
[`docs/correcoes/regras-de-atividades.md`](../../docs/correcoes/regras-de-atividades.md), que esta spec preenche (coluna
*Como se aplica*). Requisitos:

### FR-001 — O catálogo (RA-1)

- **FR-001.1** O catálogo é a lista `tipos_atividade`. Entram **Desportiva** (AEC), **DeCAT** (TR), **Reforço** (TR) e
  **Outra** (AEC); **nenhum tipo existente é renomeado** (decisão 3), e só o **rótulo** de «Atividade Extracurricular» passa
  a «Atividade Extraclasse» (decisão 4) — o **valor** (a chave que o gatilho, a sincronização e o ETL casam) não muda.
- **FR-001.2** Toda tela mostra o tipo pelo **rótulo** (`rotulo_exibicao`, senão o valor): o formulário do DSA, a grade, o
  papel, a planilha, as listas e as estatísticas.
- **FR-001.3** O Admin edita o catálogo em **Administração → Tipos de atividade** (`/admin/tipos-de-atividade`): *Novo tipo*,
  *Editar* (rótulo e classificação padrão AEC/TAD/TR), *Desativar/Reativar*. A troca da classificação padrão de um tipo
  com lançamento recategoriza os lançamentos ativos **sem** escolha do operador (regra de hoje, D-AA-3, `app.recategorizar
  _pelo_tipo`), e o diálogo mostra **quantos** mudam antes de gravar. Os tipos de **Estudo Individual** e de **Apoio
  Individualizado** (Monitoria, Português, BDA, BDF) aparecem só para ler: a classificação deles não é AEC/TAD/TR (decisão 2).
- **FR-001.4** *Excluir* tipo: o ícone aparece **desabilitado** (regra 4 — não há exceção nominal para `tipos_atividade`;
  com lançamento, *«tem registros: use Desativar»*).
- **FR-001.5** Nas estatísticas, *Visita Técnica* agrupa como **Visita**, *Apoio à Instrução* como **APOINST/Prática** e
  *Evento/Cerimônia* como **Cerimônia**; os demais tipos pelo próprio rótulo (nunca «Outros»). Na tela, a aba e a sigla são
  **APOINST**; o tipo segue «Apoio à Instrução».

### FR-002 — As AEC previstas do currículo (RA-2, RA-3)

- **FR-002.1** Cada currículo tem **AEC previstas**: nome, tipo (do catálogo), TA previstos (**pode ficar vazio**), disciplina
  (opcional, do mesmo currículo), obrigatória sim/não, e a fonte (arquivo e página do PDF), em `aec_previstas_curriculo`.
- **FR-002.2** Editadas em **Editar curso → Currículo → Atividades** (*Nova AEC prevista*, *Editar*, *Desativar/Reativar*,
  em diálogo). No currículo **em uso**, incluir, mudar ou desativar é **correção RC-6**: só o trio, com justificativa, e a
  trilha `correcoes_de_curriculo` (o mesmo gatilho `app.guardar_curriculo_em_uso`). *Novo currículo* copia as previstas (RC-7).
- **FR-002.3** A página do curso, aba *Atividades*, mostra as AEC previstas do currículo selecionado, só para ler.
- **FR-002.4** A turma **herda** as AEC previstas do currículo dela: cada uma aparece **a cumprir** até ser cumprida
  (FR-005). Nada é copiado para a turma.
- **FR-002.5** A palestra lançada **sem vínculo** (fora do currículo) aparece como **avulsa** e **conta** no limite de AEC do
  currículo — o limite é de tempo (já conta hoje: a view soma por categoria).

### FR-003 — O lançamento de atividade no DSA (RA-4)

- **FR-003.1 Tipo.** Os botões AEC/TAD/TR continuam escolhendo o grupo de tipos pela classificação **padrão**; os tipos
  aparecem pelo rótulo.
- **FR-003.2 Conta como.** Para os tipos de padrão AEC, TAD ou TR, o campo **Conta como** oferece *TA da disciplina*, *AEC*,
  *TAD* e *TR*, com o padrão do tipo escolhido. A escolha grava em `atividades_nao_letivas.conta_como` (nula = o padrão), e o
  banco respeita: AEC/TAD/TR viram a categoria da linha; **TA da disciplina** exige uma disciplina da turma, soma na **CHD**
  da turma e da disciplina e na **carga ministrada** do instrutor responsável (como aula), e **sai** da AEC/TAD/TR. EI e Apoio
  Individualizado não têm o campo.
- **FR-003.3 Vínculo.** **Cumpre (opcional):** uma AEC prevista do currículo da turma (marcada *«já cumprida»* quando for) ou
  uma APOINST planejada da turma. Um vínculo no máximo; nunca na atividade de *todas as turmas*.
- **FR-003.4 Responsável / Palestrante.** Instrutor do cadastro **ou** texto livre com **nome** e **OM** (a OM é coluna nova,
  `responsavel_externo_om`). Na grade e no papel, *«Nome (OM)»*.
- **FR-003.5 Local.** Uma **sala** da lista de salas **ou** texto livre; grava no mesmo `local` (texto), como hoje.
- **FR-003.6** Tudo nasce rascunho e só conta depois de *Salvar a semana* (RP-0); o vínculo só cumpre com o lançamento
  **salvo e ativo**.

### FR-004 — APOINST (RA-6)

- **FR-004.1** O trio planeja a APOINST **por turma**, no módulo Atividades, aba **APOINST**, por *Nova APOINST* (diálogo):
  turma, nome, disciplina da turma, instrutor responsável (**designado** na disciplina da turma), início e fim previstos, TA
  previstos. *Editar* e *Desativar/Reativar* na linha; *Excluir* desabilitado (regra 4).
- **FR-004.2** Só turmas cujo **ano** é o de `apoinst.ano_inicial` (**2027**, parâmetro) em diante; as de 2026 ficam como
  estão. O banco recusa; a tela diz por quê.
- **FR-004.3** A execução é o lançamento do DSA **vinculado** (o Operador lança). **Situação**, derivada (nunca gravada):
  **Concluída** (TA lançados ≥ previstos, ou marcada à mão) · **Atrasada** (passou o fim previsto sem concluir) · **Em
  andamento** (tem lançamento) · **Planejada**. A linha compara previsto × realizado: datas (início/fim previstos × primeiro e
  último lançamento) e TA.

### FR-005 — Cumprimento e marcação à mão (RA-5)

- **FR-005.1** A AEC prevista fica **cumprida** quando os lançamentos vinculados (salvos e ativos) somam os TA previstos; sem
  TA previsto, ao primeiro. Com parte dos TA, **em andamento**. Data, palestrante e local vêm dos lançamentos.
- **FR-005.2** O trio marca **à mão** — *Registrar cumprimento* ou *Desfazer* — com **justificativa obrigatória** (10 a 1000) e
  trilha só de acréscimo (`marcacoes_de_atividade`, como os ajustes de avaliação do Bloco 16): a marcação mais recente vale e
  as anteriores são o histórico na linha. Vale para a AEC prevista (*cumprida*) e para a APOINST (*concluída*). Não muda CH.

### FR-006 — O módulo Atividades (T1)

- **FR-006.1** Abas **Atividades · Palestras · APOINST · Calendário** (o Calendário segue para quem tem `calendario.*`).
  Todas as turmas do ano escolhido no cabeçalho (RA-7, RT-6), com a arquivada **contando** nas estatísticas (RT-8).
- **FR-006.2 Filtros** (ícone, RT-4): turma, curso, classificação (AEC/TAD/TR/TA da disciplina), tipo (do catálogo), período
  (de/até), disciplina, vínculo (*do currículo* / *avulsa*), responsável (texto). Na aba Palestras: situação
  (*cumprida/a cumprir*); na APOINST: situação (as quatro).
- **FR-006.3 Estatísticas** (ícone, RT-4/RT-5, todas interativas): cartões — total de atividades e de TA, TA por
  classificação, palestras do currículo **cumpridas N de M**, APOINST por situação, visitas —; pizza por **tipo** (agrupado,
  FR-001.5); barras por **curso** e por **turma**; barras do **uso do limite** AEC/TAD/TR por turma (usado × limite do
  currículo); pizza por **classificação**.
- **FR-006.4** A lista de atividades tem, por linha, **Editar** (abre o DSA da turma na semana do lançamento — a edição é do
  DSA, RP-0/RP-9), **Desativar** (pede a exclusão do lançamento **como rascunho** da semana, que conta ao *Salvar*) e
  **Excluir** desabilitado (*«lançamento é registro: use Desativar»*, regra 4, D-COR-6). Só para quem lança o DSA.
- **FR-006.5 Aba Palestras:** as palestras do ano, **previstas** (do currículo de cada turma) e **avulsas**, com situação,
  data, palestrante, local, turma e vínculo; *Registrar cumprimento*/*Desfazer* do trio.
- **FR-006.6 Aba APOINST:** as planejadas do ano, com *Nova APOINST*, a situação e previsto × realizado.

### FR-007 — A turma (T2)

- **FR-007.1** As abas da turma passam a **Ficha · Avaliações · Atividades · APOINST · Palestras**. *Atividades* tem os
  mesmos filtros e estatísticas do módulo, recortados pela turma, **mais o uso do limite** de AEC/TAD/TR do currículo.
- **FR-007.2** *Palestras* e *APOINST* saem do «Em breve» com o acompanhamento da turma (FR-004, FR-005), com as ações do
  trio.

### FR-008 — O DSA (T3)

- **FR-008.1** As abas de acompanhamento *Palestras* e *APOINST* mostram o acompanhamento da turma, **só leitura**.
- **FR-008.2** O lançamento ganha os campos da FR-003.

### FR-009 — Avisos (RA-8)

- **FR-009.1** No sininho, módulo **Atividades**: (a) **AEC obrigatória não cumprida** a `atividades.aviso_aec_semanas`
  (**4**, parâmetro) semanas do fim da turma ativa; (b) **APOINST atrasada**. Sem turma arquivada nem EAD pura.
- **FR-009.2** (c) **AEC/TAD/TR acima do limite** do currículo **já é aviso** (`turmas:teto_*`, por `tetosDaTurma`) e fica
  como está — duplicar daria dois avisos do mesmo fato.

### FR-010 — Estatísticas para a DEnsM (RA-9)

As contas moram em `lib/dominio/atividades/` (TypeScript puro), reaproveitáveis pelo Épico 10: por turma, TA de AEC/TAD/TR
usados × limite do currículo (por `tetosDaTurma`, o decisor único do teto, SC-003 da spec 014); palestras previstas
cumpridas N de M, com data, palestrante e local; visitas com local; APOINST por situação.

## 5. Decisões adotadas por padrão — Bernardo confere no fim

| # | Dúvida | Escolha | Alternativa |
|---|---|---|---|
| D-1 | Como gravar o «Conta como» | `conta_como text` (`CHD`/`AEC`/`TAD`/`TR`), nula = padrão do tipo; AEC/TAD/TR viram a categoria da linha; `CHD` mantém a categoria do tipo e as views a movem para a CHD | um valor novo no enum `categoria_normativa` (mexeria nos limites e no PROENS, que usam o mesmo enum) |
| D-2 | «TA da disciplina» exige instrutor habilitado? | **não** — é atividade, não aula (a RD-1 é da aula); a carga vai ao instrutor do cadastro, se houver | exigir habilitado, como a aula |
| D-3 | Vínculo | duas colunas na atividade (`atividade_prevista_id`, `apoinst_id`), no máximo uma | tabela de vínculos (só faria sentido com mais de um vínculo por lançamento) |
| D-4 | Sala × texto livre | o mesmo `local` (texto); a sala é escolha da lista | coluna `sala_id` (a lista de salas é texto em `config_listas`) |
| D-5 | Quem planeja APOINST e marca à mão | recurso **novo** `planejamento_de_atividades`/`editar`, só o trio — tabela nova com recurso novo só acrescenta (precedente `ta_fora_do_dsa`, Bloco 2) | reusar um recurso do trio que já existe |
| D-6 | «Admin edita» o catálogo | a tela fica em **Administração**; no banco vale a policy de hoje de `config_listas` (`parametros.*`, Admin e Encarregado), a mesma das salas | policy só do Admin para `tipos_atividade` (altera policy: portão 9.4) |
| D-7 | Cumprida com TA previsto | quando os vinculados somam os TA previstos; parte → *em andamento*; sem TA, ao primeiro | ao primeiro lançamento vinculado, sempre |
| D-8 | Itens da carga (item 5) | palestras dos anexos + visitas nomeadas, inclusive facultativas e de cômputo não informado; **fora** também a corrida de balizamento (CAHO) e o embarque de Oceanografia (C-Espc-HN): não são palestra nem visita | levar as duas como AEC prevista |
| D-9 | A turma tem aba *Atividades*? | não tinha: **nasce** (Ficha · Avaliações · Atividades · APOINST · Palestras) | as estatísticas da turma só no módulo, filtrado |
| D-10 | Editar/Desativar na lista do módulo | *Editar* abre o DSA da semana; *Desativar* pede a exclusão como rascunho da semana; *Excluir* desabilitado | gravar direto fora do DSA (furaria a RP-0/RP-9 e a guarda D-12) |
| D-11 | Trava da turma arquivada nas tabelas novas | no servidor e por `turma_em_oferta` na policy, como os ajustes de avaliação (pôr a trava de banco muda `app.turma_da_linha`) | a trava de banco nas três |
| D-12 | O aviso de limite (RA-8 c) | fica o aviso de teto que já existe | um aviso novo no módulo Atividades |
| D-13 | Trilha da carga das AEC previstas (item 6) | o script roda com a **sessão do Admin** (`USR-ADMIN-001`) e a justificativa autorizada, e o próprio gatilho grava a trilha — `autor_id` da trilha é obrigatório; o relatório diz que quem gravou foi o script | trilha sem autor (o banco não aceita) |
| D-14 | Ordem das abas do módulo | Atividades · Palestras · APOINST · Calendário (a do pedido) | — |

## 6. Banco

### 6.1 M1 — só acrescenta (regra 9.4, emenda de 19/10/2026)

1. **Catálogo:** os quatro tipos (`on conflict do nothing`) e o **rótulo** de «Atividade Extracurricular» (autorização 4).
2. **Parâmetros** (regra 8): `apoinst.ano_inicial` = 2027 e `atividades.aviso_aec_semanas` = 4, operacionais.
3. **Matriz:** `planejamento_de_atividades`/`editar`, `true` só para o trio, com linha nos nove perfis (D-5).
4. **`aec_previstas_curriculo`** (sequência `AEP-`): no molde de `limites_curriculo` — FK composta com o currículo, RLS
   `cursos.ler`/`cursos.editar` + alcance + oferta, os gatilhos de versão e da RC-6, a disciplina do mesmo currículo.
5. **`apoinst_planejadas`** (sequência `APO-`): por turma; a disciplina da turma (`app.disciplina_e_da_turma`), o instrutor
   designado nela, o período e os TA; o ano da turma ≥ o parâmetro. RLS: lê quem lê atividades; grava o trio.
6. **`marcacoes_de_atividade`** (sequência `MAT-`): só de acréscimo, um alvo (AEC prevista da turma **ou** APOINST), a
   situação (`cumprida`/`a_cumprir`), a justificativa (10 a 1000) e o autor carimbado pelo banco.
7. **`atividades_nao_letivas`:** `conta_como`, `atividade_prevista_id`, `apoinst_id`, `responsavel_externo_om` (nulas) e os
   `CHECK` delas, com o porteiro do vínculo.

### 6.2 M2 — recria com efeito ZERO (condição do item 1)

`app.categoria_pelo_tipo` (respeita `conta_como` quando preenchida), `app.recategorizar_pelo_tipo` (pula a linha com
escolha), o `CHECK` `ativ_disciplina_so_aec_da_turma` (aceita a disciplina também no `CHD`), o `CHECK` de tabelas da trilha
`correcoes_de_curriculo` (aceita `aec_previstas_curriculo`), `public.criar_curriculo` (copia as previstas, RC-7) e as views
que somam a CHD e a carga — `vw_chd_por_fato`, `vw_carga_horaria_turma`, `vw_disciplinas_execucao`,
`vw_instrutor_carga_anual`, `vw_ocupacao_ta`, `vw_ocupacao_do_dsa` —, todas com `security_invoker` repetido (gotcha 10). O
predicado é `conta_como = 'CHD'` (inclusão) e `conta_como is distinct from 'CHD'` (exclusão), e **nenhuma** linha tem
`conta_como` hoje. **A prova** (§6.4): md5 das linhas ordenadas de cada view antes e depois, na cópia do remoto; **se mudar,
PARAR**.

### 6.3 As cargas no remoto (itens 6 e 7, autorização nominal)

- **AEC previstas:** as **48** da tabela do passo 0 pela decisão 5 e a D-8 (CAHO 10, C-Ap-FR 4, C-Ap-HN 5, C-Espc-FR 11,
  C-Espc-HN 12, C-Exp-MetocOf 3, C-Exp-Obs-ME 2, C-Exp-Ag-Mag 1), nos currículos 1, com a justificativa autorizada e a
  trilha (D-13). Backup antes, conferência só de leitura depois, a lista no relatório.
- **PDFs:** os **24** PDFs de `SIS11/Curriculos`, cada um no currículo 1 do seu curso, em `<curso>/<currículo>/<instante>.pdf`,
  gravando `pdf_caminho` e `pdf_carregado_em` só onde estão vazios; o par arquivo → curso é o revisado na carga das UEs
  (`curso_por_arquivo`, 24 de 24).

### 6.4 Medições

[pendente — §6.4 é preenchida depois da medição na cópia do remoto]

## 7. Fora do escopo (e por quê)

- Exceção da regra 4 para tipos, AEC previstas e APOINST: o *Excluir* fica desabilitado.
- A grafia dos currículos de **2027**: os PDFs não estão no sistema (passo 0, §4).
- O cadastro do **TR de 1 h do EST-QF-APOC**: pendência de cadastro de Bernardo (`PEND-033-1`).

## 8. Critérios de sucesso

- **SC-001** Com `conta_como` nulo, todo número de tela é igual ao de antes (md5 das seis views igual na cópia).
- **SC-002** Uma Palestra que *conta como TAD* sai de `ta_aec` e entra em `ta_tad`; uma que conta como *TA da disciplina*
  entra na CHD da turma e da disciplina e na carga do instrutor, e sai da AEC (o caso que discrimina, pgTAP).
- **SC-003** O Operador não planeja APOINST nem marca à mão (42501); o trio, sim (RLS com sessão real).
- **SC-004** Incluir AEC prevista em currículo em uso sem justificativa é recusado; com ela, grava a trilha.
- **SC-005** Uma AEC prevista vinculada a um lançamento salvo aparece *cumprida* na turma, no DSA e no módulo.
- **SC-006** As cargas: 48 AEC previstas e 24 PDFs no remoto, conferidos só por leitura; o *Baixar PDF* de 3 cursos abre o
  arquivo certo (md5 igual ao local).
