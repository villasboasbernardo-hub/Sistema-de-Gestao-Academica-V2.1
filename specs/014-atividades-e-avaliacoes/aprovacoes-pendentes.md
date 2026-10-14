# Aprovações pendentes — spec 014 (implementação noturna de 14/10/2026)

> Tudo o que precisa da palavra de Bernardo antes da fase **publicar** (remoto e merges). Numerado
> por PR. Nada aqui foi aplicado no remoto. Cada antes/depois foi medido no banco **local**,
> recriado a partir de uma cópia nova do remoto (arquivo citado em cada item).

## Fase 0

- **A0.1 — Texto final das emendas §12 e E-1 a E-9.** O conteúdo foi aprovado em 14/10/2026; o
  texto final está na spec §12 e §13 e é aplicado nos `.md` dos documentos 02, 04, 07 e 42 nos PRs
  2, 2.1 e 5. Conferir no diff de cada PR. ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.**

## PR 1 — banco da leva 1

- **A1.1 — Antes/depois da migration D-1 (limites dos 24 currículos).** Relatório:
  `antes-depois/limites_dos_24_curriculos.md`, medido sobre a cópia `remoto-20261014-021627.sql`.
  **Antes:** 0 limites. **Depois:** 30 limites em 16 cursos, cada um com arquivo e página, e 1 evento
  em `migracao_log`. Os oito cursos sem quadro (os C-ApA, Metoc-SP, PROC-MF, NAVFLU e APOC) ficam
  sem linha e caem no percentual da norma.

  | Curso | AEC | TAD | TR | Página |
  |---|---|---|---|---|
  | CAHO | 166 | — | 166 | 8 |
  | C-Ap-FR | 110 | — | 126 | 7 |
  | C-Ap-HN | 65 | — | 78 | 7 |
  | C-Espc-FR | 80 | 62 | 57 | 5 |
  | C-Espc-HN | 80 | 62 | 112 | 5 |
  | C-Esp-ALH | 30 | — | 20 | 5 |
  | C-Esp-ME | 43 | — | 42 | 5 |
  | C-Esp-OpAP | 1 | — | 2 | 5 |
  | C-Exp-Ag-Mag | 10 | — | 10 | 5 |
  | C-Exp-BATI | 3 | — | 4 | 4 |
  | C-Exp-MetocOf | 6 | — | 15 | 4 |
  | C-Exp-Obs-ME | 5 | — | 20 | 4 |
  | EST-QF-APHID | — | — | 8 | 5 |
  | EST-QF-EM2040PHS | — | — | 4 | 5 |
  | EST-QF-MAREFLU | — | — | 4 | 4 |
  | EST-QF-PGRS100 | — | — | 5 | 4 |

  **Conferência no PDF:** a extração é automática do texto do PDF (`extrair_avaliacoes_curriculo.py`)
  e bate com a medição M-8 da spec nos 30 pares; a prova `provar_extracao_de_limites.py` saiu
  APROVADA. Bernardo confere três ou quatro linhas no PDF, pela página da tabela.
  **Aprovação:** ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.** Aplicada no remoto no mesmo dia (`plano-de-aplicacao-no-remoto.md`).

- **A1.2 — Antes/depois da migration D-2 (tipos de parada e reclassificação).** Relatório:
  `antes-depois/reclassificar_tipos_de_atividade.md`, mesma cópia.
  - Nasce a lista `tipos_parada`: FR, LA, LP, NT, RC e PF, com *pode ser global* e *consome Tempo
    Reserva* (FR e RC e PF não consomem; NT só de turma).
  - Tipos criados: Recepção aos alunos (TAD), Apoio à Instrução (AEC), Português para Estrangeiros,
    BDA e BDF (Apoio Individualizado).
  - Monitoria passa de Estudo Individual para Apoio Individualizado.
  - Aula, Avaliação, Vista de Prova, Aula Teórica e Aula Prática ficam marcados *uso = aula* e saem da
    oferta de atividade. Licença de Pagamento sai da lista de atividade (vira o LP da parada).
  - Parâmetro novo `avaliacao.vence_em_breve_dias = 2`.
  - **Totais por turma: AEC, TAD, TR, EI e Apoio IGUAIS antes e depois em todas as turmas ativas.**
    Nenhuma atividade ativa usa o subtipo Monitoria na cópia (0 antes, 0 depois); a mudança das
    monitorias gravadas como "Administração" pela sincronização é da rodada do PR 3.
  **Aprovação:** ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.** *"lista de paradas e tipos novos; reclassificação das linhas antigas
  só na rodada do PR 3"*. Aplicada no remoto no mesmo dia.

- **A1.3 — Exceção D-1 registrada no CLAUDE.md** (coluna gerada recriada). Texto em *Convenções de
  banco*. Conferir a redação. ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.**

- **A1.4 — Emenda do BRIEF §2.1** com as duas tabelas novas (`dias_parados`, `limites_curriculo`),
  só no `.md`. Conferir a redação. ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.**

## PR 1.1 — previsto do PROENS por turma

- **A1.1.1 — Antes/depois da migration D-3 (reservas do PROENS para as turmas).** Relatório:
  `antes-depois/reservas_do_proens_para_as_turmas.md`, sobre `remoto-20261014-021627.sql`.
  **Antes:** 12 reservas por curso em `reservas_proens` e nenhum previsto por turma. **Depois:** 10
  previstos, um por reserva com curso, cada um na **única** turma de 2026 do curso, com o mesmo valor;
  a reserva genérica vira dois parâmetros (`proens.reserva_generica_tad = 2`, `_tr = 0`, ano 2026).
  AEC não ganha previsto (o PROENS não deu valor). 1 evento em `migracao_log`.

  | Turma | TAD | TR |
  |---|---|---|
  | CAHO 2026 | 6 | 121 |
  | C-Ap-HN 2026 | 5 | 16 |
  | C-Ap-FR 2026 | 5 | 89 |
  | C-Espc-HN 2026 | 3 | 100 |
  | C-Espc-FR 2026 | 0 | 7 |

  **Aprovação:** ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.** Aplicada no remoto no mesmo dia.

- **A1.1.2 — Emenda do BRIEF §2.1** com `previstos_proens_turma` e `previstos_proens_alteracoes`, só
  no `.md`. Conferir a redação. ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.**

## PR 2 — cards de AEC, TAD e TR; limites no curso; `/inicio`; `/atividades`

- **A2.1 — Texto final das emendas E-4, E-5, E-7, E-9 e do Glossário.** Aplicadas só nos `.md` dos
  documentos 04 (`RN-EVT-01`, `RN-2027-03` e a tabela de artefatos), 02 (`RF-EXTRA-04`) e 07 (CHR, CHD,
  AEC, TAD, TR, Estudo Individual, LP e os verbetes novos Apoio Individualizado, Dia parado e LA), cada
  uma com o registro de que o `.docx` não a recebeu. Conferir no diff do PR. Onde o texto da §13 não
  casou com o documento: o negrito dos percentuais na `RF-EXTRA-04`, o exemplo abreviado da
  `RN-2027-03`, a contagem dentro do verbete Estudo Individual, o verbete LA (não existia; criado das
  decisões Q-8, Q-13 e Q-14) e o LP (frase acrescentada ao verbete). O parágrafo de implementação da
  `RN-EVT-01` ainda cita `lib/dominio/tetos-normativos.ts`; a §13 não o emenda, e a nota nova diz para
  onde o cálculo foi. **Aprovação:** ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.**
- **A2.2 — Capturas no banco local:** `C:/Users/VILLAS BOAS/AppData/Local/ciaara-11/capturas-014/pr2-*.png`.
  ✅ **RESOLVIDO — CONFERIDAS E APROVADAS por Bernardo Villas Boas em 14/10/2026.**

## PR 2.1 — DSA: parar dia, desfazer e avaliação viva (PARCIAL)

- **A2.1.1 — Texto final da emenda E-8 (`RN-EVT-04`).** Aplicada só no `.md` do documento 04, com o
  antes literal e o registro do `.docx`. ⚠️ A frase do **feriado** continua a de 07/10/2026 no código (as
  suítes a afirmam); a frase nova da E-8 vale para a **parada**: *"Dia bloqueado: <tipo> — <motivo>. Para
  lançar, desfaça a parada ou ajuste o calendário."* Para unificar as duas, é decisão sua. **Aprovação:**
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.** **Com a unificação:** *"Na E-8, UNIFIQUE a mensagem do feriado e da parada
  numa frase só: «Dia bloqueado: <motivo>. Para lançar, desfaça a parada ou ajuste o calendário.»
  (tempo parado: «Tempo bloqueado: <motivo>…»)."* Feito no PR 2.1: `mensagemDeDiaBloqueado` é a frase
  única, a parada de parte do dia diz *"Tempo bloqueado"*, e o motivo da parada é *"<tipo> —
  <motivo>"* (decisão D2.1.5, abaixo). O documento 04 foi emendado de novo e os testes que afirmavam a
  frase antiga (`dia-bloqueado.test.ts`, `dsa-grade.spec.ts`) foram ajustados.
- **A2.1.2 — Capturas no banco local:** `C:/Users/VILLAS BOAS/AppData/Local/ciaara-11/capturas-014/pr2.1-*.png`.
  ✅ **RESOLVIDO — CONFERIDAS E APROVADAS por Bernardo Villas Boas em 14/10/2026.**

## PR 3 — a sincronização da leva 1 (só no local)

- **A3.1 — As chaves do lote de decisões que mandavam Apoio para AEC ou TAD (T108).** Apliquei a
  recomendação da spec (FR-021, D-AA-12) e registrei no próprio JSON (`decisao`):
  `c-espc-hn-2026.json` **BDF+1**: AEC *Atividade Extracurricular* → **Apoio Individualizado, BDF**;
  `c-exp-obs-me-2026.json` **30+1**: TAD *Administração* (responsável *MONITORIA / DOEP*) → **Apoio
  Individualizado, Monitoria** (a turma está fora da rodada do PR 3 e volta no PR 6). A varredura dos dez
  JSON não achou outra chave assim. Para mudar: voltar as duas entradas de `chaves`.
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.**
- **A3.2 — Os 43 textos de responsável que não casam com o cadastro (T117, FR-016).** São 312 TA. Inclui
  os 22 de pessoa cadastrável da M-4 e as entidades. Cada um precisa de uma das três saídas: casar com
  instrutor, aceitar como entidade ou palestrante externo, ou cadastrar a pessoa. A lista tem nomes e por
  isso está **fora do git**: `planilhas-de-origem/rodadas/2026-10-06T1541/pendencias-de-responsavel.md`.
  **Enquanto não forem decididos, a rodada no remoto PARA cada turma que os tem** (todas as nove).
  ✅ **RESOLVIDO — decisão de Bernardo Villas Boas, 14/10/2026:** *"pendência de responsável trava SÓ A
  LINHA, não a turma: linhas com responsável não resolvido ficam fora e listadas; o resto da turma entra.
  Para os 43 textos, proponha uma classificação (pessoa cadastrada provável / entidade / palestrante
  externo) na lista fora do git, para eu revisar depois; não aplique sem meu OK."* Feito: a pendência
  `responsavel_sem_decisao` deixou de bloquear e a linha fica fora **nos dois bancos** (o modo provisório
  também a deixa fora, para o ensaio do local ser o plano do remoto — isso substitui a D3.3). A lista com
  a coluna *"proposta"* sai de toda rodada em `pendencias-de-responsavel.md`, na pasta da rodada. A revisão
  dos textos é o portão **A3.6**, abaixo.
- **A3.3 — ⚠️ Lançamentos feitos NA TELA no remoto, em três turmas sincronizadas.** Medido na cópia
  `remoto-20261014-085612.sql`, pela conta `de_tela` da sincronização:
  - **CAHO 2026**: 6 linhas (5 atividades e 1 aula), de 13 a 16/10, criadas em 09/10;
  - **C-Ap-FR 2026**: 10 linhas (8 aulas e 2 avaliações), de 13 a 16/10, criadas em 09/10;
  - **C-Ap-HN 2026**: 10 linhas (8 aulas e 2 avaliações), de 13 a 16/10, criadas em 13/10.

  A VIRADA-1 diz que até a virada ninguém lança no sistema nas turmas sincronizadas, e a sincronização
  **para** a turma que tem lançamento da tela. Do jeito que está, a rodada do T121 pararia essas três.
  Opções:
  - **(a)** tirar as três da rodada do PR 3, como a C-Exp-Obs-ME (D-SYNC-1);
  - **(b)** inativar os lançamentos da tela e deixar a planilha cobrir a semana;
  - **(c)** declarar o sistema como fonte dessas turmas a partir de uma data, o que é a virada delas.

  **Recomendação: (a)** para o PR 3, e decidir (c) turma a turma. No local, medi com
  `--medir-com-lancamento-da-tela`: os lançamentos da tela ficam ao lado dos da planilha (D3.2).
  ✅ **RESOLVIDO — decisão de Bernardo Villas Boas, 14/10/2026 — VIRADA POR TURMA, opção (c):** *"CAHO 2026,
  C-Ap-FR 2026 e C-Ap-HN 2026 passam a ter o SISTEMA como fonte a partir de 13/10/2026. A sincronização dessas
  três cobre só datas até 12/10/2026; dali em diante não toca nada. As demais turmas seguem sincronizando pela
  planilha até a virada de cada uma."* Feito: `virada` por turma em `scripts/carga_dsa/fontes.json` e em
  `turmas-carregadas.md`; o plano perde o que é da virada para frente, e o SQL não inativa ETL nem linha da
  planilha daquela data em diante. A opção `--medir-com-lancamento-da-tela` saiu (D3.2 deixou de ter objeto).
- **A3.4 — Linhas da planilha EDITADAS na tela no remoto.** Com a exportação de 06/10, a rodada devolveria
  seis linhas `DSAP-` ao valor da planilha:
  - em **C-Ap-HN 2026**: uma aula com 4 → 5 tempos; um local *EAD* → *Sala 01*; três vistas de prova
    movidas ou acrescentadas na tela em 10, 13 e 16/10;
  - em **C-Ap-FR 2026**: um local *EAD* → *Sala 06*.

  Com **exportação nova** (como o T121 manda), a planilha pode já trazer essas mudanças. Se não trouxer, a
  rodada as desfaz, porque a planilha manda. Recomendação: conferir as seis na planilha antes da rodada no
  remoto.
  ✅ **RESOLVIDO — REGRA GERAL de Bernardo Villas Boas, 14/10/2026:** *"linha editada na tela (editado_em
  preenchido ou origem = tela) VENCE a planilha; a sincronização nunca a desfaz — vai para a lista de
  'planilha diverge do sistema' para os operadores."* Feito em `sincronizar.proteger`, com a ressalva da
  **D3.7** (o sinal da edição é `editado_por`, não `editado_em`). A lista sai em
  `planilha-diverge-do-sistema.md`, na pasta da rodada, fora do git.
- **A3.5 — O antes/depois da rodada** (`antes-depois/rodada-do-pr3-no-local.md`). O TAD cai em todas as
  nove turmas: CAHO 40 → 11, C-Ap-HN 85 → 54, C-Ap-FR 89 → 65, C-Espc-HN 63 → 31, C-Espc-FR 51 → 15,
  C-Esp-ME 29 → 0, MetocOf 9 → 0, BATI 2 → 0 e Ag-Mag 1 → 0. Acima do máximo de TAD sobra **só
  C-Ap-FR 2026** (65 de 58,25). A lista de erros de planilha tem 198 linhas, fora do git. Antes do remoto,
  a medida se refaz com exportação nova.
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.**
- **A3.6 — A classificação proposta dos textos de responsável (A3.2).** A lista com a coluna *"proposta"*
  (pessoa cadastrada provável · entidade · palestrante externo) está em `pendencias-de-responsavel.md`, na
  pasta da rodada do remoto, fora do git. **Nada foi aplicado.** Para cada texto, a decisão vira entrada no
  lote (`instrutor_por_texto` ou `responsavel_externo_aceito`) e a linha entra na rodada seguinte.
  ✅ **RESOLVIDO EM PARTE — decisão de Bernardo Villas Boas, 14/10/2026:** *"aplique só os classificados como
  ENTIDADE ou PALESTRANTE EXTERNO; os 'pessoa cadastrada provável' esperam meu OK (fica a lista fora do git)"*.
  Feito no lote: as 10 entidades e os 7 palestrantes externos viram `responsavel_externo_aceito`. ⚠️ Os
  palestrantes são nome de pessoa, e o repositório é público: no lote eles entram como **resumo SHA-256 do
  texto normalizado** (`responsavel_externo_aceito_sha256`), e o texto fica só na lista fora do git (D4.6). Os
  demais (24 militares fora do cadastro, 1 pessoa cadastrada provável, 1 só traços) continuam esperando.

## PR 4 — banco da leva 2 (só no local; nada no remoto)

Medido sobre a cópia **`remoto-20261014-130529.sql`** (o remoto já sincronizado pelo PR 3), com as seis migrations
aplicadas na ordem do `db push`. **Nas 28 turmas, aulas, avaliações, atividades, CHD, aplicação, vista e CHT ficaram
iguais antes e depois.** Os quatro relatórios estão em `antes-depois/`.

- **A4.1 — Emenda do BRIEF §2.1: três tabelas novas** (`avaliacoes_curriculo`, `avaliacoes_curriculo_turma`,
  `vistas_de_avaliacao`). O texto PROPOSTO está no próprio BRIEF, marcado ⏳. A asserção FR-001 do pgTAP (010) já as
  espera.
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.**
- **A4.2 — D-5, as correções banco × currículo, CASO A CASO** (`antes-depois/correcoes_banco_x_curriculo.md`): B-1,
  B-2, B-3, B-5, B-6, B-7 e B-8 aplicadas; B-4 e B-12 FORA, esperando a conferência (T129).
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.** *"B-4 e B-12: faça você a conferência no PDF do currículo; se o PDF confirmar, inclua na D-5 e me mostre a
  página citada no relatório; se não confirmar, deixe fora e liste."* Feito: **B-12 confirmada e incluída** (o
  currículo do C-Exp-Metoc-OF-SP tem quatro disciplinas, e a IV é *Estágio Prático* — índice, p. 2; a
  disciplina *"Efeitos atmosféricos…"* é inativada, sem lançamento); **B-4 NÃO confirmada, fica fora**: o PDF dá
  79 à disciplina (p. 4 e p. 5), que é o que o banco tem; as UEs somam 80 (p. 5–6), com o TR de 1 h à parte (p. 4).
- **A4.3 — D-6, a unificação** (`antes-depois/unificar_hn2101_e_matfis.md`): HN-2101 (`I`, 126) e MATFIS (56); as
  duas listas de instrutores e a lista unida; nenhum lançamento perdido.
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.** A D4.1 (código `I`) foi aceita.
- **A4.4 — D-4, as avaliações dos 24 currículos** (`antes-depois/avaliacoes_dos_24_curriculos.md`): 194 itens entram;
  **90 ficam fora**, marcados `conferir` no CSV (instrumento PT fora da lista do data-model; "TI ou TG"; tempo do
  conjunto do TFM; vista da sinopse do C-Esp-ALH; quatro disciplinas do C-Espc-FR sem destino no banco porque o
  código do plano difere do sumário; o EST-QF-APOC digitalizado). Cada caso é decisão sua.
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.** para os 194 itens. Os 90 de fora: *"gere uma lista com UMA RECOMENDAÇÃO por item (destino provável, tipo,
  TA, página do PDF), para eu revisar em lote depois; enquanto isso, a disciplina mostra 'tempo de avaliação não
  definido'"*. A lista é `medicoes/d4-fora-recomendacoes.md` — portão **A4.7**, abaixo.
- **A4.5 — D-7, em três blocos** (`antes-depois/substituidas_e_vistas_para_sessoes.md`): D-7 (188 → substituídas,
  com o status anterior); D-7b (241 vistas → sessão 1; anda junto da E-5); D-8 (15 de 16 aulas com o 2º instrutor por
  código; 1 texto não casou e ficou em `observacoes`).
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026.** (os três blocos)
- **A4.6 — Achados do remoto que não são desta spec**, medidos na cópia: (a) `C-Exp-MetocOf V` está marcada
  `sem_unidades_ensino` e TEM 50 TA de UE — a marcação parece engano de tela (pgTAP 112, asserção D-B3, conta 7 e
  não 6); (b) `TDI-000042` (disciplina X) tem `instrutor_id` sem par ativo na junção (pgTAP 108, FR-032.1). Nenhum
  dos dois foi tocado.
  ✅ **RESOLVIDO — decisão de Bernardo Villas Boas, 14/10/2026:** *"NÃO mexer agora; registre como pendências
  nomeadas."* Registradas no `CLAUDE.md` como **PEND-014-4** (MetocOf V «sem UE» com 50 TA de UE) e **PEND-014-5**
  (`TDI-000042` sem par ativo na junção).
- **A4.7 — Os 90 itens da extração que ficaram FORA da D-4**, cada um com UMA recomendação (destino provável, tipo,
  TA e página do PDF): `medicoes/d4-fora-recomendacoes.md`. Enquanto não decididos, a disciplina mostra *"tempo de
  avaliação não definido"*. **Aprovação:** [pendente], em lote.

## Decisões tomadas sozinho durante a implementação

✅ **D1.1 a D2.1.4 ACEITAS por Bernardo Villas Boas em 14/10/2026** (*"Decisões que você tomou sozinho
(relatório §3): todas aceitas."*). ✅ **D2.1.5 a D2.1.9 e D3.1 a D3.6 ACEITAS por Bernardo Villas Boas em
14/10/2026**, na mesma conferência que decidiu A3.1 a A3.5 (a D3.2 e a D3.3 foram superadas pelas decisões
A3.3 e A3.2). ✅ **D3.7 a D3.10, D4.1 a D4.5 e D5.2 ACEITAS por Bernardo Villas Boas em 14/10/2026.** ❌ **A D5.1 foi
RECUSADA**: *"a turma tem de ter uma ABA «Avaliações» de verdade (barra de abas na página da turma, URL dona do
estado), como pedi; o card leva para essa aba"* — feito no PR 5. As de número maior nasceram depois e esperam a
palavra dele.

*(formato: decidi X porque Y; para mudar: Z)*

- **D1.1 (PR 1) — Condição de oferta nas duas tabelas novas.** Decidi pôr `turma_em_oferta` nas
  policies de escrita de `dias_parados` e `curso_em_oferta` nas de `limites_curriculo`, porque o
  `FR-017.5` da spec 009 recusa escrita acadêmica em curso fora de oferta e a guarda `105` cobra a
  lista inteira. Para mudar: tirar a condição das duas policies da E-2 e as duas linhas de `105`.
- **D1.2 (PR 1) — A chave da recusa vai no `hint`, a frase na mensagem.** Os gatilhos da E-1 levantam
  a frase em português na mensagem e a chave (`tipo_de_atividade_inexistente` etc.) no `hint`, porque
  é do `hint` que `traduzirRecusa` lê. Para mudar: nada a decidir, é o padrão da casa.
- **D1.3 (PR 1) — Amostras de teste ganharam subtipo.** As amostras que gravavam atividade sem
  subtipo passaram a mandar um subtipo da semente (Palestra, Administração, Tempo Reserva, Estudo
  Individual), porque o gatilho da E-1 roda ANTES da RLS: sem isso, seis negativos de `dsa.test.ts`
  passariam a recusar com `23514` em vez de `42501` — o modo de falha do `SC-004`. Para mudar: não há
  alternativa que mantenha os negativos honestos.
- **D1.4 (PR 1) — O ponta a ponta local não foi rodado antes do PR.** Rodei unidade, pgTAP (base limpa
  e base carregada) e invariantes; o ponta a ponta inteiro leva cerca de 70 minutos e fica com o CI do
  PR. Para mudar: rodar `pnpm verificar:tudo` antes da fase publicar.
- **D1.1.1 (PR 1.1) — A trilha do previsto não tem FK para o previsto.** Decidi guardar `previsto_id`,
  `turma_id` e `categoria` sem FK, como `auditoria_de_conta.conta_alvo_id`, porque uma trilha imutável
  com FK impede que a linha descrita deixe de existir — e a suíte apaga a turma de amostra no fim, o que
  com FK ficaria impossível para sempre (a trilha recusa `DELETE` inclusive para a `service_role`).
  Para mudar: pôr a FK de volta e fazer a suíte deixar a turma de amostra para trás.
- **D1.1.2 (PR 1.1) — A nova `vw_conformidade_tetos` só concede `SELECT`.** A anterior tinha o
  `INSERT`/`UPDATE` inerte do Épico 1 (R-8); a nova nasce sem ele. Para mudar: nada a decidir.
- **D1.1.3 (PR 1.1) — Sem caso de RLS para o Admin.** O teste não cria conta `admin` (gotcha 8: um
  Admin a mais derruba `rls.test.ts`); o Admin grava pela mesma permissão do Encarregado, que está
  provado. Para mudar: criar a conta Admin num arquivo isolado.
- **D2.1 (PR 2) — Semente própria para o ponta a ponta dos tetos.** Decidi criar
  `tests/e2e/tetos-de-teste.ts` em vez de estender `panorama-de-teste.ts` e `cursos-de-teste.ts`, como a
  T065 dizia, porque turmas a mais naquelas sementes mudariam as contagens que as suítes delas afirmam.
  Para mudar: mover as três turmas para as sementes antigas e ajustar as contagens.
- **D2.2 (PR 2) — `/atividades` é só leitura, com 500 linhas por consulta.** O lançamento continua no
  DSA; a tela diz quando a lista bate no teto. Para mudar: paginação na tela.
- **D2.3 (PR 2) — Quem gravou o previsto sem sessão aparece como "outra conta".** É o caso da carga
  (D-3) e das sementes, que gravam com o cliente administrativo; quem grava pela tela aparece pelo
  nome. Para mudar: escrever "carga do sistema" quando o autor for nulo.
- **D2.4 (PR 2) — A suíte de tetos roda em série.** A sugestão da reserva genérica é parâmetro do
  sistema inteiro, e dois processos semeando-a colidem. Para mudar: nada a decidir.
- **D2.1.1 (PR 2.1) — As ações da parada moram em `lib/acoes/dia-parado.ts`**, e não em
  `lib/acoes/dsa.ts` como a T087 dizia, porque `dsa.ts` já tem mais de 1.300 linhas. A recusa de aula em
  tempo parado ficou em `dsa.ts` (`recusaDoCalendario`), onde já estava a do feriado. Para mudar: mover o
  arquivo.
- **D2.1.2 (PR 2.1) — TR de dia inteiro conta os tempos do regime do curso.** A licença não prevista de
  dia inteiro que consome TR grava `ta_inicial = 1` e os tempos do regime vigente (8 se não houver), porque
  o TR é contado em TA. Para mudar: pedir os tempos na tela.
- **D2.1.3 (PR 2.1) — A guarda de feriado inativo passou a olhar só leitura (`.select(`).** «Parar dia»
  grava em `feriados`, e um `insert` sem `select` não devolve feriado. Para mudar: voltar a guarda e
  gravar o feriado por RPC.
- **D2.1.4 (PR 2.1) — O PR 2.1 foi aberto PARCIAL.** O que ficou de fora está na lista do PR e em
  `progresso-implement.md`: a parede da cascata (T082), o rótulo do Apoio, do TR bloqueante e da parada
  no papel e nos conflitos (T083, T093), o tipo e a atividade global no formulário (T086, T089, T090 em
  parte, T091), a planilha de contingência (T094), as traduções (T095) e os casos de ponta a ponta de tipo,
  global e impressão (T096 a T098, T100). Para mudar: nada a decidir; é o ponto de retomada.

- **D2.1.5 (PR 2.1) — Na frase unificada da E-8, o `<motivo>` da parada é `<tipo> — <motivo>`**
  (*"Dia bloqueado: LA — Licença da turma. …"*), e o do feriado é a descrição dele, como antes. A sigla
  diz de onde a parada vem, que é o que se desfaz. Para mudar: tirar o tipo em `mensagemDeTempoParado`.
- **D2.1.6 (PR 2.1) — Os casos de ponta a ponta de tipo e global ficaram num arquivo só**
  (`tests/e2e/dsa-tipo-e-global.spec.ts`, T097 e T098), e o papel da parada entrou em
  `dsa-parar-dia.spec.ts` (T100), porque o caminho de clique é o mesmo da parada. A semente do DSA não
  precisou crescer (T096): os tipos novos nascem na migration D-2 também na base limpa. A recusa de aula
  em tempo parado (SC-009), a licença prevista sem TR (SC-013) e o EI automático fora dos tempos parados
  ficam provados em unidade (`dia-bloqueado.test.ts`, `empurrar.test.ts`) e pelos casos do PR 1 no banco.
  Para mudar: acrescentar os três cenários ao `dsa-parar-dia.spec.ts`.
- **D2.1.7 (PR 2.1) — A atividade global vai para uma semana que nenhuma outra suíte usa (16/11/2026).**
  Ela aparece na grade de TODA turma, inclusive das suítes que rodam em paralelo; numa semana comum
  mudaria a contagem delas. Para mudar: rodar o caso em série com o resto.
- **D2.1.8 (PR 2.1) — O formulário continua escolhendo a categoria primeiro, como filtro da lista de
  tipos**, e mostra *"Conta como: …"* com a categoria que o TIPO dá antes de gravar; a ação manda só o
  tipo, e a categoria gravada é a do banco (`app.categoria_pelo_tipo`). Foi o caminho que manteve as
  suítes do DSA (o botão por categoria é o percurso delas). Apoio Individualizado ganhou botão próprio.
  Para mudar: uma lista única de tipos, sem o botão por categoria.
- **D2.1.9 (PR 2.1) — O Apoio no mesmo tempo de uma aula sai da célula para a faixa do dia**, com o
  motivo *"no mesmo tempo de outro lançamento da turma (não é conflito)"*: a grade tem uma célula por
  tempo, e assim a tela mostra os dois (A-6). O Apoio também não empurra nem é empurrado na cascata.
  Para mudar: desenhar dois blocos lado a lado na célula.
- **D3.1 (PR 3) — A rodada do PR 3 foi medida no local com a MESMA exportação que o remoto recebeu em
  06/10/2026** (`2026-10-06T1541`), não com uma nova. Assim a diferença medida é só o efeito das regras da
  spec 014. A exportação nova é passo do T121, no remoto. Para mudar: exportar as planilhas de novo (pelo
  conector do Drive) e repetir a medição.
- **D3.2 (PR 3) — Nasceu `--medir-com-lancamento-da-tela`, que só existe contra o local.** Com ele, a turma
  com lançamento feito na tela não para, e esses lançamentos ficam como estão, ao lado da planilha. Sem ele,
  três das nove turmas não teriam medida (A3.3). Contra o remoto, a opção é recusada. Para mudar: remover a
  opção e medir só as seis.
- **D3.3 (PR 3) — Em modo provisório (só local), a atividade com responsável que não casa entra com o
  texto como externo**, e a pendência continua **bloqueando** o remoto (FR-016). Sem isso, a medição do TAD
  perderia 312 TA que voltam assim que o lote for decidido. Para mudar: deixar a linha de fora também no
  local.
- **D3.4 (PR 3) — A linha que muda de categoria na MESMA tabela (Monitoria TAD → Apoio, BDF AEC → Apoio)
  é atualizada no lugar**, com o tipo novo; o gatilho da E-1 recalcula a categoria. Só a linha que **muda
  de tabela** (TAD → `dias_parados`) é inativada com a marca *"[RECLASSIFICADO PELA SPEC 014]"*. Para
  mudar: inativar e regravar também as da mesma tabela, com código novo.
- **D3.5 (PR 3) — O dia parado de todas as turmas em PARTE do dia não é detectado como global.** O dia
  global continua sendo o que parou o expediente inteiro de todas as turmas (vai para `feriados`, como
  antes). A parada de parte do dia vira um dia parado em cada turma, uma linha por turma. É o mesmo
  princípio da FR-015: o que está em todas as turmas fica uma linha por turma. Para mudar: detectar a parada
  parcial comum a todas e gravar uma linha global.
- **D3.6 (PR 3) — Os erros antigos da carga, em texto livre, entram na tabela de `erros-de-planilha.md`**
  com o texto na coluna *"o que diverge"*. Os novos (CH de disciplina e de UE contra o currículo, aula em
  dia parado) vêm com as cinco colunas. A aula em dia parado é conferida **por dia**, porque uma célula da
  planilha tem uma chave só e aula e parada nunca dividem o mesmo tempo. Para mudar: estruturar os
  antigos também.
- **D3.7 (PR 3) — "Editada na tela" se lê em `editado_por`, não em `editado_em`.** A regra da A3.4 diz
  *"editado_em preenchido ou origem = tela"*, mas `editado_em` também é carimbado quando a **própria
  sincronização** atualiza a linha (o gatilho `app.set_auditoria` carimba toda edição), e toda linha que a
  rodada de 06/10 mudou passaria a "vencer a planilha" para sempre. `editado_por` só é preenchido com sessão
  — a tela —, e a carga roda sem sessão. "Origem = tela" é o lançamento sem `origem_migracao_v1` e sem o
  prefixo `DSAP-`. Para mudar: ler `editado_em`, aceitando que a linha atualizada pela carga também fique
  congelada.
- **D3.8 (PR 3) — O lançamento nascido na tela antes da virada não para mais a turma.** Ele fica como está,
  e a linha da planilha que cai no **mesmo tempo** sai do plano e vai para a lista de divergências; a
  avaliação cancelada na tela também vai para a lista. A prova que começa antes da virada e tem a vista
  depois dela fica com o sistema se já existe; se é nova, entra sem a vista. Para mudar: voltar a parar a
  turma quando houver lançamento da tela antes da virada.
- **D3.9 (PR 3) — A rodada do remoto usa a MESMA lista `--adiar` da carga de 06/10/2026, mais um tipo.** A
  exportação nova (`2026-10-14T1149`) traz, nas cinco turmas regulares, as mesmas pendências que a carga da
  onda 2 deixou de fora por decisão (C10-018 da conferência de 07/10/2026: *"ficam FORA até a resposta e não
  travam a carga"*): `aula_sem_instrutor`, `chave_sem_catalogo`, `chave_sem_regra`, `contagem_diverge`,
  `controle_diverge`, `instrutor_nao_casado`, `local_sem_traducao`, `ue_inexistente`,
  `vista_em_mais_de_uma_sessao` e `vista_sem_prova`. **Acrescentei `tecnica_desconhecida`** (1 bloco de 3 TA no
  C-Ap-FR, uma sigla de T/E que não está no banco), que é da mesma natureza: a linha fica fora e é listada, e o
  resto da turma entra — o mesmo princípio da A3.2. Sem isso, a C-Ap-FR pararia inteira por 3 TA. Para mudar:
  tirar o tipo da lista e decidir a sigla no lote (`metodologias`).
- **D3.10 (PR 3) — "Fica fora" (A3.2) é NÃO TOCAR, e não inativar.** A linha com responsável sem decisão que
  **já está no banco** (veio da carga de 06/10, gravada com o texto como externo) fica como está até a
  decisão — nem atualizada nem inativada. Sem isso, medido no local em 14/10/2026 sobre
  `remoto-20261014-115453.sql`, a rodada inativava essas linhas como se tivessem saído da planilha, e o TAD
  da C-Ap-FR caía de 89 para **5** (e não por reclassificação: por apagamento lógico de TAD legítimo).
  A linha nova com a pendência não entra. Para mudar: inativar a linha pendente que já existe.
- **D4.1 (PR 4) — Na unificação da C-Ap-HN, `cod_disciplina` fica `I`**, e não `HN-2101-0621`: é a chave da
  planilha de controle e de toda a grade da turma, e mudá-la obrigaria a mexer no lote de decisões e no DSA sem
  ganho. O nome e a CH passam aos do currículo. A do CAHO vira `MATFIS`, como a T152 já previa. Para mudar: trocar o
  código na D-6 e a chave no lote.
- **D4.2 (PR 4) — A D-4 só carrega o item SEM `conferir`.** O que a extração não leu com segurança fica fora, contado
  no cabeçalho da migration, e vai a Bernardo (A4.4); a máquina não decide instrumento nem tempo. O casamento item ×
  disciplina do banco ficou numa coluna do CSV (`destino_disciplina_codigo`), preenchida por regras escritas em
  `parear_avaliacoes_curriculo.py`. Para mudar: decidir os casos e regerar.
- **D4.3 (PR 4) — A D-8 casa o 2º instrutor pelo nome de guerra no cadastro, em tempo de execução**, para não pôr
  nome de pessoa na migration (repositório público). O que não casa com UM instrutor fica em `observacoes`.
  Para mudar: decidir o texto que sobrou (1) e reaplicar.
- **D4.4 (PR 4) — A D-6 tira e repõe, na mesma transação, as duas FKs compostas de `turma_disciplina_unidade`**, que
  impediam mover a UE e a linha da turma no mesmo passo; ao voltar, elas validam a tabela inteira. E desliga os
  gatilhos de auditoria só ali dentro, para as linhas históricas reapontadas preservarem `editado_em` nulo (D-UNIF-1).
  Para mudar: tornar as FKs adiáveis numa migration de estrutura.
- **D4.5 (PR 4) — A sincronização passa a gravar a substituída do ETL como `substituida_pela_planilha`** (com
  `status_anterior`), e a ler avaliação viva pela lista positiva; o 2º instrutor da aula sai em `outros_instrutores`
  pelo código (T151). ⚠️ Esse código só pode rodar no remoto DEPOIS das migrations do PR 4 lá (congelamento da T161).
- **D4.6 (PR 4) — O palestrante externo aceito entra no lote como resumo SHA-256 do texto normalizado**, e não como
  texto, porque o texto é nome de pessoa e o repositório é público. O resolver aceita o texto se ele OU o resumo
  dele estiver no lote. Para mudar: guardar o lote de palestrantes fora do git.
