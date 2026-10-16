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
  avaliação não definido"*. **Aprovação:** [pendente], em lote. ⏳ *Bernardo Villas Boas, 14/10/2026: "continua PENDENTE
  comigo; não bloqueia a publicação."* Registrada como pendência nomeada **PEND-014-6** no `CLAUDE.md`.

## Decisões tomadas sozinho durante a implementação

✅ **D1.1 a D2.1.4 ACEITAS por Bernardo Villas Boas em 14/10/2026** (*"Decisões que você tomou sozinho
(relatório §3): todas aceitas."*). ✅ **D2.1.5 a D2.1.9 e D3.1 a D3.6 ACEITAS por Bernardo Villas Boas em
14/10/2026**, na mesma conferência que decidiu A3.1 a A3.5 (a D3.2 e a D3.3 foram superadas pelas decisões
A3.3 e A3.2). ✅ **D3.7 a D3.10, D4.1 a D4.5 e D5.2 ACEITAS por Bernardo Villas Boas em 14/10/2026.** ❌ **A D5.1 foi
RECUSADA**: *"a turma tem de ter uma ABA «Avaliações» de verdade (barra de abas na página da turma, URL dona do
estado), como pedi; o card leva para essa aba"* — feito no PR 5. ✅ **D5.4 a D5.6 e D6.1 a D6.3 ACEITAS por Bernardo
Villas Boas em 14/10/2026** (segunda conferência do dia). ✅ **A D5.3 foi ACEITA COM CONDIÇÃO**: *"desde que a trilha de
auditoria registre quem arbitrou, quando e o valor anterior"* — medido antes: o arbitrado guardava quem e quando
(`editado_por`/`editado_em`), mas **não** o valor anterior; a condição foi cumprida no PR 5 pela trilha
`avaliacoes_curriculo_arbitragens` (migration `20261014223818`), detalhe na D5.3.

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
- **D5.1 (PR 5) — ❌ RECUSADA por Bernardo Villas Boas em 14/10/2026.** A primeira parte do PR 5 levava o card a uma
  seção da ficha; a decisão manda uma **aba "Avaliações" de verdade**, com a barra de abas na página da turma e a URL
  dona do estado (`?aba=avaliacoes`), e o card levando a ela. Feito na segunda parte do PR 5 (T175, T177).
- **D5.2 (PR 5) — A avaliação APLICADA sem item do currículo ligado consome um item pendente na projeção**, e a
  lista mostra as duas coisas: o item (pendente, até o vínculo existir) e a avaliação lançada. O vínculo explícito
  (FR-039) chega pelo DSA no PR 5.1 e pela carga no PR 6. Sem esse desconto, a disciplina com a prova feita acusaria
  estouro falso (medido na C-Ap-HN 2026, no TFM). ✅ Aceita em 14/10/2026.
- **D5.3 (PR 5) — Sem «desfazer» do arbitrado nesta entrega.** O T198 pede, no roteiro, *Definir tempo* → **desfazer**;
  nenhuma tarefa cria essa ação, e o arbitrado grava com quem e quando (a trilha é a auditoria do gatilho). Escolhi
  **não** inventar uma ação de remover ajuste agora: o roteiro manda conferir com **"só esta turma"**, numa turma fora
  de `fontes.json`, e o ajuste fica registrado. **Recomendação:** se quiser o desfazer, ele vira *Remover ajuste da
  turma* (status `inativo` em `avaliacoes_curriculo_turma`, regra 4), no PR 5.1.
  ✅ **ACEITA por Bernardo Villas Boas em 14/10/2026, COM CONDIÇÃO:** *"desde que a trilha de auditoria registre quem
  arbitrou, quando e o valor anterior"*. **Cumprida no PR 5**: a migration `20261014223818_trilha_do_arbitrado` cria
  `avaliacoes_curriculo_arbitragens`, só de acréscimo (UPDATE, DELETE e TRUNCATE recusados inclusive para a
  `service_role`), alimentada por gatilho no item do curso e no ajuste por turma: **antes** e **depois** (JSON dos
  campos do arbitrado), **autor** (`auth.uid()`; nulo = carga sem sessão) e **instante**. Provada por pgTAP (131, 14
  asserções), por RLS com sessão real (o Encarregado arbitra e a trilha tem a linha dele com o valor anterior; as
  tentativas recusadas do Operador e do Ajudante não deixam linha) e por reversão (1.935 → 1.904 objetos, `129d83d4…`).
- **D5.4 (PR 5) — A aba Avaliações do curso usa a turma da Grade** (`?turma=`, com a pré-seleção pela janela), em vez
  de um segundo seletor de turma na aba: um parâmetro só, e a mesma turma nas duas abas. Os filtros `disciplina` e
  `situacao` da T175 **não** entraram (o quadro é recolhível por disciplina e mostra a situação por item); ficam para
  quando o volume pedir.
- **D5.5 (PR 5) — Semente própria das avaliações** (`tests/e2e/avaliacoes-de-teste.ts`) em vez de estender
  `dsa-de-teste.ts` (T187): a do DSA serve a seis arquivos e passa de mil linhas. A **projeção** (100 e 118 cumpridos)
  fica provada na unidade (`projecao.test.ts`), não na ponta a ponta — por isso a T189 segue aberta.
- **D5.6 (PR 5) — O bloco «Vistas de prova» nasce recolhido, com a contagem à vista.** Medido em 14/10/2026 na
  cópia `remoto-20261014-155938.sql`: o `/inicio` listava **cerca de 50 vistas atrasadas** — quase todas provas lançadas
  **sem** item ligado (o histórico e a sincronização da leva 1), que por isso exigem vista, e muitas *Prova Prática*. O
  vínculo ao item, no PR 6, deve tirar da lista as provas cujo item não prevê vista. Usei o `AvisosRecolhiveis` dos
  quadros de avisos (`RNF-USA-04`). Captura: `pr5-06-inicio-vistas.png` (antes de recolher).
  ✅ **Aceita em 14/10/2026, com a separação pedida por Bernardo Villas Boas** (*"se (b) for a maioria, o alerta conta só
  (a) e (b) vai para a lista de erros de planilha"*). Medido no ensaio da rodada da leva 2 (cópia
  `remoto-20261014-191624.sql` + exportação `2026-10-14T1916`): das **44** vistas que o `/inicio` daria por atrasadas,
  **(a) 6** são de prova ligada a item com tempo de vista — atrasadas de verdade — e **(b) 38** de prova **sem** item.
  (b) é a maioria: **o alerta passou a contar só a prova ligada a item** (`alertasDeVista`, PR 5), e a sincronização
  lista as de (b) em `erros-de-planilha.md` como *"vista não lançada na planilha, e a prova não tem avaliação do
  currículo que diga se há vista"* (PR 6).

## PR 6 — a sincronização da leva 2

- **A6.1 — A correção da `PEND-DSA-VISTA` (D-SYNC-2).** Reativar a `DSAP-C-EXP-OBS-ME-2026-L206-V` (a sessão de vista
  dela já existe) e cancelar a relançada `DSA-MUYK0RFD-V`. Ensaiada no local: CHD da turma 113 → **114**, vista 3 →
  **4**, uma avaliação viva no dia, e o `de_tela` da turma a zero. Relatório: `antes-depois/pend-dsa-vista.md`; SQL:
  `antes-depois/pend-dsa-vista.sql`. **Aguarda sua aprovação** para o remoto (é pré-requisito da T233).
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026** (*"A6.1 (PEND-DSA-VISTA, CHD Obs-ME 113 → 114):
  APROVADO"*).
- **A6.2 — Rodar a sincronização da leva 2 no REMOTO (T233)**, pelo rito da T121, nas **dez** turmas (a Obs-ME volta,
  D-SYNC-1), depois da A6.1 e do CI verde. Ensaio no local: `antes-depois/rodada-do-pr6-no-local.md`. A 6ª rodada dá
  zero mudança e o catálogo fica igual. **Aguarda sua autorização.**
  ✅ **RESOLVIDO — APROVADO por Bernardo Villas Boas em 14/10/2026**, *"com o rito completo e as condições"*: depois do
  merge e do deploy de #52, #53 e #54, cada um conferido em Production; backup, ensaio numa cópia nova, o antes/depois da
  CHT por turma (com a lista das 17 linhas que viram Apoio Individualizado) e da A6.1, a sincronização, a segunda rodada
  com zero mudança e a impressão digital local × remoto. **Se o remoto divergir do ensaio, PARAR.**
- **D6.1 (PR 6) — A prova liga ao item SEM inferência.** O instrumento e o número saem da DESCRIÇÃO da linha
  (*"PM4 – …"*, a forma que as planilhas usam) ou do nome do instrumento na descrição ou no tipo. Retirei um recurso que
  eu tinha escrito — *"a disciplina só tem um instrumento, então é ele"* — porque ligava Prova Prática e OD a itens PM
  (medido na 1ª rodada local). Resultado: **75 de 188** provas ligadas; **86** não casam e vão para a lista de erros de
  planilha. **Recomendação:** o operador corrige a descrição na planilha (*"PM1 – …"*), ou você decide um de-para por
  turma no lote de decisões (`"itens": {"<linha>": "PM 1"}`) — não implementado, para não inventar a regra.
- **D6.2 (PR 6) — A CHT cai em sete turmas por causa da A3.6, não da leva 2.** 17 Monitorias estavam no remoto como
  TAD/Administração (travadas pela pendência de responsável desde 06/10); com a A3.6, viram **Apoio Individualizado**
  (D-AA-12), fora da CHT. Ex.: C-Esp-ME 617 → 603. É o efeito das duas decisões aprovadas, dito para não ser lido como
  perda.
- **D6.3 (PR 6) — Quem conduz a vista vem da linha da vista na planilha**, e a vista conta para ele na carga do
  instrutor (`vw_instrutor_carga_anual`, E-5). Antes, a sessão ficava sem condutor, e a vista contava para o
  responsável da avaliação.

## Conferências de Bernardo — 14/10/2026 (segunda)

- **Roteiros de conferência** dos PRs 4, 5, 5.1 e 6: *"farei pelo preview, só leitura."*
- **Testes instáveis sob carga** (`tema`, `dsa-tipo-e-global` e outros): registrados como pendência nomeada
  **PEND-014-7** no `CLAUDE.md`.

## 15/10/2026 — registro de processo e o fechamento da spec (só no local)

**Registro de processo** *(Bernardo Villas Boas, 15/10/2026)*: *"tabela ou migration nova que não estava no plano
aprovado é PORTÃO meu, mesmo que cumpra uma condição minha; pare e me mostre o desenho antes do remoto."* A trilha
`avaliacoes_curriculo_arbitragens` (`20261014223818`, PR 5) entrou no remoto sem esse portão e fica **APROVADA a
posteriori**. Registrado também no `CLAUDE.md` (regra 9.4).

**O que esta rodada deixou para a palavra de Bernardo** (nada aplicado no remoto):

- **A4.7 (`PEND-014-6`)** — a planilha de decisão está em
  `planilhas-de-origem/rodadas/2026-10-14T1916/a47-decisao.xlsx` (fora do git): 90 linhas, a recomendação e a
  proposta já em colunas (87 propõem carregar, 3 não: a OPAP II, que repete a prova da OPAP I; o EST-QF-APOC, que
  aprova por frequência; e o PrevMe V, sem item legível), e as colunas **decisão** (aceito / recuso / corrijo) e
  **valor corrigido**. Preenchida, `python -X utf8 -m scripts.etl.decisao_a47 migration --planilha … --sql … --antes-depois …`
  gera a migration e o antes/depois — **sem aplicar**. Ensaiado numa cópia com 88 "aceito", 1 "recuso" (item 5,
  CAHO VII) e 1 "corrijo" (item 1, CAHO I): 86 itens, SQL válido numa transação desfeita no banco local. ⚠️ *Corrigido
  em 15/10/2026: a primeira redação dizia "aceito em tudo", e não era — ver a seção seguinte.*
- **Conferência em Production, só leitura** — `roteiro-de-conferencia-producao.md`, roteiro único que substitui,
  para o fechamento, os de T198, T221 e T235.
- **Propostas de cancelamento** (decisão sua):
  - **T189, três itens que a tela não tem**: *arbitrar a quantidade* (a ação `arbitrarQuantidade` existe e não tem
    botão — Server Action sem consumidor, a forma da `GUARDA-ACAO`), o *histórico da v2.0 «Sem correspondência»*
    (`lib/dominio/avaliacoes/historico.ts` não tem consumidor) e o *filtro por disciplina na URL*. Proposta:
    cancelar os três **nesta spec** e registrar como pendência — a quantidade vai entrar em lote pela A4.7, o
    histórico precisa de desenho de tela, e o filtro tem pouco valor numa aba de `<details>` por disciplina.
  - **T213, a situação da avaliação na planilha de contingência**: as N sessões de vista já saem na planilha
    (cada sessão é um fato). A situação por avaliação **não** — e proponho cancelar: como valor fixo, ela envelhece
    no dia seguinte à geração, justamente durante a contingência; como fórmula, seria um segundo cálculo de
    `situacaoDaAvaliacao` em linguagem de planilha, contra o ponto único (R-8).
- **Achado da T208, já consertado neste PR**: na atividade sem instrutor do cadastro, o 2º nome sumia da grade e do
  papel (ver `progresso-implement.md`).

## 15/10/2026 (noite) — decisões de Bernardo sobre o fechamento

*(Bernardo Villas Boas, 15/10/2026)*

- **Cancelamentos propostos: TODOS APROVADOS.** Saem da spec 014 os três itens sem tela da T189 (arbitrar a
  quantidade, o histórico «Sem correspondência», o filtro por disciplina) e a situação por avaliação da T213.
- **Backlog, pendências nomeadas novas** (entram no `CLAUDE.md` pela T237):
  - **PEND-014-8** — *"Encarregado ajusta quantidade de avaliações quando o currículo mudar"*: o botão que consome
    `arbitrarQuantidade`, hoje Server Action sem consumidor (a forma da `GUARDA-ACAO`).
  - **PEND-014-9** — **card de CHT na turma**: número único (`CHD + AEC + TAD + TR`), com o Apoio Individualizado à
    parte. Hoje a CHT não aparece como número em tela nenhuma; o roteiro de Production a soma à mão.
  - **PEND-014-7** passa a ter **PR dedicado** — proposta de causa e correção abaixo, **sem implementar**.
- **Agora:** o conserto dos "demais instrutores" sai do #56 num PR próprio (código + teste de unidade, sem migration),
  com merge depois do CI verde e o deploy de Production conferido; o resto do #56 fica em rascunho.
- **Aguardando Bernardo:** a conferência em Production e a `a47-decisao.xlsx` preenchida. Devolvida a planilha:
  gerar a migration e o antes/depois por disciplina, ensaiar no local e **PARAR** para aprovação antes do remoto.

### A4.7 — por que o ensaio deu 86 e a proposta é 87

**Não é erro do script nem da recomendação: é a descrição do ensaio que estava errada.** O ensaio de 15/10/2026
(`teste-preenchida.xlsx`, no rascunho da sessão) **não** tinha "aceito" em tudo: tinha **88 aceito, 1 recuso e 1
corrijo**. O recuso caiu no **item 5 (CAHO VII)**, que a proposta carrega — por isso 87 − 1 = **86**; o corrijo (item 1,
CAHO I, `instrumento=TI; vista=2`) mantém o item. **Medido de novo com "aceito" nas 90 linhas: entram 87** (`decisões:
aceito 90 · proposta que não carrega 3 → entram 87`), igual à proposta. Nenhuma linha do script ou da recomendação muda.

### PEND-014-7 — proposta de causa e correção (não implementada)

**O que se mede:** na suíte inteira (≈ 460 casos), 2 a 6 casos reprovam por **tempo** (`Test timeout of 30000ms`,
`toBeVisible` esgotado) e **passam isolados**; o servidor repete *"The destination stream closed early"*, que é o Next
abortando uma resposta em fluxo porque o navegador desistiu dela — **sintoma**, não causa. Os arquivos que reprovam
**migram** de uma rodada para outra.

**Causa provável — saturação da máquina, não defeito de produto:** `playwright.config.ts` não fixa `workers`, então
vale o padrão (metade dos núcleos lógicos: **4** nesta máquina, 4 núcleos físicos / 8 lógicos, 23,8 GB). Os 4
navegadores, **um** servidor Next de produção (um processo Node) e o stack do Supabase em Docker disputam a mesma CPU; o
Node atende as 4 abas em uma thread só, e as telas do DSA e de gestão fazem várias consultas por página. Com
`fullyParallel: true`, os arquivos pesados do DSA caem juntos com frequência — daí a migração do arquivo que reprova.

**Correção proposta, em ordem de custo:**

1. **`workers` explícito e menor no local** (`process.env.CI ? undefined : 2`, sobrescrevível por `PW_WORKERS`) —
   a medida mais barata; custa tempo de suíte (estimativa a medir, não chutar).
2. **Agrupar os arquivos pesados do DSA em série** (`test.describe.configure({ mode: "serial" })` por arquivo, ou um
   `project` próprio com `workers: 1` e `dependencies`) para não caírem juntos.
3. **`retries: 1` no local**, com o relatório separando "instável" de "reprovado", como o CI já faz — **só junto** com
   1 ou 2, para não virar tapete; e toda reprovação continua isolada antes de ser chamada de instável (a regra da
   PEND-014-7, que já pegou um defeito real de teste).
4. **Não** aumentar o limite de 30 s por caso: medido no Épico 4, aumentar prazo **subiu** a instabilidade (2 → 6), e o
   prazo maior esconde tela lenta de verdade.
5. **Reuso de servidor:** sem mudança — a porta 3100 já separa a suíte do `dev:local` (gotcha 7). Medir, no PR, se
   o servidor de produção da suíte satura (CPU do processo Node durante a rodada) antes de pensar em dois servidores.

**Critério de aceite do PR dedicado:** três rodadas seguidas da suíte inteira, no local, **sem nenhuma** reprovação, com
o tempo total de cada uma anotado ao lado (regra 9.2).

## 15/10/2026 — emenda RN-AV-10 a RN-AV-14 e RN-RESP-1

**A decisão** *(Bernardo Villas Boas, 15/10/2026, no texto dele; registrada na spec §2.4)*:

> *PROVAS E VISTAS*
> - *RN-AV-10: a prova da planilha casa com o item do currículo pela coluna COD (PM1/PM2/PP/TG/T/PO), normalizando "PM1" = "PM 1" = "PM-1". A descrição só desempata.*
> - *RN-AV-11: COD sem número ("PM") casa com o único item do instrumento; se houver vários, casa pela ordem cronológica de aplicação (1ª aplicada = nº 1).*
> - *RN-AV-12: prova prática (PP), trabalho (T/TG) e qualquer prova com a MESMA descrição em dias consecutivos ou próximos (mesma disciplina, mesmo COD) é UMA prova com N sessões de aplicação, não N provas. O card "N de M" conta 1.*
> - *RN-AV-13: vista é obrigatória só para PM e PO. PP, T e TG não geram alerta de vista; se a planilha trouxer vista, registra.*
> - *RN-AV-14: prova a mais que o currículo prevê NÃO é erro de planilha; vira alerta informativo na aba Avaliações da turma ("currículo prevê 1 PP; aplicadas 2").*
>
> *RESPONSÁVEL (lib/dominio, regra pura)*
> - *RN-RESP-1: aula de disciplina (técnica EO ou prática de disciplina) exige instrutor habilitado. Palestra, AEC, estudo individual, monitoria, orientação/Apoio Individualizado aceitam responsável de nome livre, sem cadastro e sem alerta. Aplicador de prova = instrutor habilitado; fiscal e quem conduz a vista = instrutor OU nome livre. O formulário do DSA e o lançamento em tela oferecem "outro responsável (nome livre)" nesses casos. A sincronização aplica a mesma regra: texto que não casa com o cadastro só vira pendência se a linha for aula de disciplina com EO.*
>
> *"FAÇA, só local, sem db push, sem merge. (…) PR em rascunho, relatório curto. Se precisar de migration, PARE e me mostre o desenho antes."*

### O que foi feito, só no local

- **Nada no remoto:** nenhum `db push`, nenhuma rodada no remoto, nenhum merge. PR em rascunho, empilhado sobre o #56.
- **Documentos** (T238): spec §2.4, *Session 2026-10-15* e as emendas inline; `contracts/sincronizacao.md` e
  `contracts/avaliacoes-do-curriculo.md`; `data-model.md` §3.5.1 e a nota da §3.7; `tasks.md` (T238 a T260).
- **Regras puras** em `lib/dominio/`: a vista obrigatória (RN-AV-13 — `vista-obrigatoria.ts` sobre o dado único
  `instrumentos.json`, T239 a T241) e o responsável (RN-RESP-1, T242 a T244) — `lib/dominio/responsavel.ts`, o formulário e o cartão do DSA com *"Outro responsável (nome livre)"*, o fiscal do cadastro no formulário e a regra conferida também no servidor.
- **Sincronização** (T245 a T247), implementada em `scripts/carga_dsa/` (`regras_de_prova.py`, `resolver.py`,
  `sincronizar.py`), lendo o dado único `lib/dominio/avaliacoes/instrumentos.json`. O que ela faz hoje, para o
  texto bater com o código:
  - **o casamento pelo COD** (RN-AV-10, RN-AV-11): o COD é a coluna U.E. (`PM1` = `PM 1` = `PM-1`); `PM2` → o item
    PM 2; `PM` → o único item, ou o menor número livre em ordem cronológica, **sem** contar o número escrito na
    descrição (ela só desempata o instrumento, P3); `T` e `AV` pelas leituras P1 e P2, abaixo;
  - **a prova sem item livre** (o instrumento casou, mas não sobrou item): se o instrumento **passou do previsto**,
    é **informação** da RN-AV-14 (*"currículo prevê 1 PP; aplicadas 2"*); se **não** passou — o COD pede um
    número que o currículo não tem, ou repete um item já ligado —, é **não casa**, na lista de erros e em
    `provas-sem-casar.md`, com os itens lado a lado. Caso real, achado na revisão de 15/10/2026: a CAHO XIX
    `PP2`, com o currículo só com a PP 3, **sumia de todas as listas** na primeira versão da regra de 15/10/2026,
    antes desta correção (com a regra de 14/10 ela saía como «prova a mais»,
    `antes-da-emenda-15-10/erros-de-planilha.md`);
  - **as sessões** (RN-AV-12): agrupadas por disciplina + COD + descrição, com a janela proposta de 7 dias (P4);
    a 1ª liga ao item; as seguintes ficam linhas sem item, fora da lista de erros, como informação. A sessão
    seguinte **sem** nome de aplicador na linha **herda** o aplicador da 1ª; a que traz um nome **fora** do
    cadastro fica **sem** aplicador (não herda). A decisão explícita de vista que aponta a data de uma sessão
    seguinte vai para a **1ª sessão** — a vista é da prova;
  - **a vista** (RN-AV-13): a vista que a planilha traz é registrada de qualquer instrumento; a prova sem item cujo
    COD só nomeia instrumentos sem vista (PP, T, TG, TI) **não** vai para «vista não lançada»; o `AV` continua;
  - **o responsável** (RN-RESP-1): toda **atividade** — inclusive TAD e TR (P8) — grava o texto fora do cadastro
    em `responsavel_externo`, sem pendência; a célula só de traços é **vazia**; a chave `responsavel_externo_aceito`
    do lote ficou **sem efeito** (o texto entra igual com ou sem ela); a **aula** fora do cadastro continua
    pendência **bloqueante**, e o **aplicador** fora do cadastro, pendência **não bloqueante** (aviso, P6);
  - **as listas da rodada** (fora do git): `erros-de-planilha.md` com as linhas de **informação**;
    `pendencias-de-responsavel.md` com as pendências que sobram (aula e aplicador) e a seção *"Responsável de
    nome livre gravado"*, com a coluna **«aula de disciplina com EO?»**; e `provas-sem-casar.md`, só com o que
    ficou no plano (sem o que a virada da turma tira);
  - **o gerador versionado** `scripts/carga_dsa/erros_por_turma.py` (colunas «Prioridade» e «Resposta do
    operador»; catálogo, sessão seguinte, prova a mais e A4.7 como **informação**; nada da data de virada em
    diante) e **a conta** `scripts/provas/conta_das_provas_da_rodada.py`, com as categorias novas: 5 sessão
    seguinte (RN-AV-12) · 6 prova a mais (RN-AV-14) · 7 não casa · 8 sem par.

  Provas: `python -X utf8 -m scripts.carga_dsa.provar_carga_dsa` sai **0** com os casos novos da emenda (medido em 15/10/2026, «TODAS AS PROVAS PASSARAM»).
- **Reensaio da rodada `2026-10-14T1916` no local** (T248), sobre a cópia do remoto `remoto-20261015-150214.sql`, com as opções da rodada de 14/10 (`--adiar` igual): **gravado**, o banco lido de volta igual ao plano nas **10** turmas, o catálogo intacto, e a **segunda rodada com zero mudança**. Medido por `python -X utf8 -m scripts.provas.medir_emenda_15_10` e `scripts.provas.conta_das_provas_da_rodada` (15/10/2026).

| Grandeza | Antes (regra de 14/10/2026) | Artefato do antes | Depois (regra de 15/10/2026) |
|---|---:|---|---:|
| Provas ligadas a item do currículo | **75** de 187 | `medicoes/conta-das-187.md` | **93** de 187 linhas — das 187, **17** são sessões seguintes de uma prova (RN-AV-12): **93 de 170 provas** |
| Vistas atrasadas reais | **6** (+1 vencendo) | `antes-depois/rodada-do-pr6-no-remoto.md`; reconferido em 15/10/2026 por `scripts/provas/emenda_15_10_ligadas_e_vistas.sql` na cópia `remoto-20261015-150214.sql` | **4** (+0 vencendo): duas PO/PM da C-Espc-HN e duas PM da CAHO recém-ligadas pelo COD (IX PM 1, VI PM 3). Pela regra de 14/10, sobre o mesmo banco, seriam **8** |
| Itens da lista de erros, soma das dez turmas | **326** | soma dos «itens a conferir» de `antes-da-emenda-15-10/erros-por-turma/*.md` (fora do git; conferida em 15/10/2026) | **91** a corrigir (+ **205** de informação), pelo gerador versionado |
| Pendências de responsável | **26** | os 26 textos de `antes-da-emenda-15-10/pendencias-de-responsavel.md` (fora do git; conferidos em 15/10/2026) | **0** — os textos viraram nome livre gravado (**42** textos na lista de conferência, os 26 entre eles; o «------» virou célula vazia) |
| Delas, com aula de disciplina com EO (só estas você decide cadastrar) | — | — | **0**: as 26 são atividades — 20 palestras (T/E EO no catálogo, sob chave que não é disciplina), 1 Orientação de TFM, o Apoio à Instrução de 35 TA, 1 Português para Estrangeiros, 1 Administração, 1 Tempo Reserva e a célula «------» |

*Os dois artefatos do antes estão na pasta **preservada** `planilhas-de-origem/rodadas/2026-10-14T1916/antes-da-emenda-15-10/`,
e não na raiz da rodada: o reensaio com a regra nova **regera** `erros-por-turma/` e `pendencias-de-responsavel.md` na
raiz. (Corrigido em 15/10/2026: a primeira redação citava os arquivos da raiz, que o depois sobrescreve.)*

⚠️ **326 e 336 são a mesma exportação contada em duas unidades.** A tabela de
`antes-depois/rodada-do-pr6-no-remoto.md` soma **336** linhas da `erros-de-planilha.md`; o **326** é a soma dos «itens
a conferir» dos dez arquivos de `antes-da-emenda-15-10/erros-por-turma/` (118 + 55 + 50 + 46 + 23 + 9 + 9 + 8 + 5 + 3,
somados em 15/10/2026). É a forma do 191 × 187 de `medicoes/conta-das-187.md`: o depois é medido nas duas unidades,
cada uma com o seu artefato.

- **`erros-por-turma.xlsx` regerado** (T249), com as colunas «Prioridade» e «Resposta do operador» e o catálogo como
  «informação»: na pasta da rodada, um `.md` por turma e uma aba por turma — a corrigir: CAHO 19, C-Ap-FR 20, C-Esp-ME
  20, C-Ap-HN 4, C-Espc-FR 17, C-Espc-HN 3, Ag-Mag 4, MetocOf 3, Obs-ME 0, BATI 1 (eram 118, 55, 50, 46, 23, 9, 9, 8,
  5 e 3).
- **Provas que continuam sem casar** (T250), com COD + descrição + itens do currículo lado a lado:
  `provas-sem-casar.md` da rodada (fora do git), **50** provas — **44** com COD que não nomeia instrumento (`AV`) e
  descrição que também não nomeia; **5** com instrumento que a disciplina não tem no currículo (2 PP, 2 TG/TI, 1 TI —
  entre elas a PP de 14 sessões da CAHO IV, cuja disciplina não tem PP); **1** com número que o currículo não tem (a
  CAHO XIX `PP2`, currículo só com PP 3). Das 44, **27** casariam se a coluna T/E da linha desempatasse (P10).
- **A conta das 187 em categorias exclusivas, depois** (`conta_das_provas_da_rodada`, 15/10/2026): 93 ligadas · 2 OD ·
  4 editadas na tela · 16 A4.7 · 17 sessões seguintes (RN-AV-12) · 3 a mais (RN-AV-14) · 49 não casam · 3 sem par =
  **187**. As 2 linhas posteriores à virada ficam fora (eram 4 na conta de 14/10: as 2 da CAHO — X e XVI, `PM2`
  de 30/10 e 15/10 — agora casam pelo COD e não geram linha na lista).

### ⛔ PORTÃO — o desenho da migration (regra 9.4)

Parte da emenda **não cabe no banco de hoje**. O desenho está em **`desenho-emenda-15-10.md`**, com duas opções. A
**Opção A** (recomendada), uma migration: **A1** a tabela `public.sessoes_de_aplicacao`, para a prova em N sessões
contar 1 (RN-AV-12); **A2** a coluna `avaliacoes.instrumento_id`, para a prova sem item ou a mais ter instrumento e a
RN-AV-13 e o alerta da RN-AV-14 valerem para ela; **A3** as leituras que somam a aplicação passando a somar as
sessões; **A4** a obrigação de vista como dado no banco, lida por `app.fn_status_vista` (o espelho SQL da RN-AV-13);
**A5** o parâmetro da janela de sessões em `config_parametros`. A **Opção B**, sem migration (N linhas ligadas ao
mesmo item), **não** é recomendada, pelos motivos do desenho. O que você decide está na §3 dele. **Nada foi escrito em `supabase/`.**
Até a sua palavra: as sessões 2..N seguem linhas de `avaliacoes` sem item; o card, a aba e o DSA **não** mudam para a
RN-AV-12 nem para o alerta da RN-AV-14; e o espelho SQL segue pelo tempo de vista do item. As tarefas que esperam
são T252 a T260.

**Aprovação:** ✅ **Opção A, aprovada por Bernardo Villas Boas em 16/10/2026** (seção de 16/10/2026, abaixo).

### Perguntas

Cada uma está implementada, **só no local**, com a leitura indicada, até a sua palavra.

- **P1 — O COD `T` (trabalho).** A RN-AV-10 lista `T` entre os CODs, mas o currículo não tem instrumento `T`: tem
  **TG** (trabalho em grupo) e **TI** (trabalho individual). **Leitura adotada:** os candidatos de `T` são TG e TI;
  quando a disciplina tem os dois, a descrição desempata; se não desempatar, a prova não casa e vai para a lista com
  COD + descrição + itens. **O número do `T` não é o número do item: é a ORDEM dos trabalhos da disciplina** —
  decidido o instrumento, cada `T` pega o menor número livre dele, em ordem cronológica de aplicação. Medido na CAHO
  VI da exportação `2026-10-14T1916` (currículo: PM 1, PM 2, PM 3, TI 1, TG 1, TG 2 —
  `antes-depois/avaliacoes_dos_24_curriculos.md`; a ligação registrada na nota de
  `lib/dominio/avaliacoes/instrumentos.json`): `T1` = **TI 1**, `T2` = **TG 1**, `T3` = **TG 2**. O número só vem
  da descrição quando ela nomeia o instrumento **com** número (*"TG2 – …"* → TG 2). **Proposta:** manter.
  **Aprovação:** ✅ **aceita por Bernardo Villas Boas em 16/10/2026** (*"T numera a ordem dos trabalhos: aceita"*) *(Reescrita em 15/10/2026, na revisão do texto contra o código: a primeira redação
  omitia a regra do número.)*
- **P2 — O COD `AV` (avaliação).** `AV1`, `AV2`… (por exemplo, no C-Esp-ME e no C-Ap-FR) não nomeiam instrumento.
  **Leitura adotada:** vale **só o instrumento que a DESCRIÇÃO nomeia** — pelo prefixo (*"PM4 – …"*) ou pelo nome do
  instrumento no texto (*"PROVA PRÁTICA"*) —, **nunca por eliminação**: *"a disciplina só tem PM, então é PM"* é o
  atalho que a **D6.1** (aprovada em 14/10/2026) retirou, por ligar Prova Prática a PM. A descrição que não nomeia
  instrumento deixa a prova **sem casar**, na lista com COD + descrição + itens. O número do `AV` é a ordem da
  avaliação na planilha, **não** o número do item; o número que **vale** é o que a descrição escreve junto do
  instrumento (*"PM4 – …"* → PM 4, D6.1), e, sem ele, o menor número livre do instrumento, em ordem cronológica.
  **Exemplo medido** (`provas-sem-casar.md` e `erros-de-planilha.md` da rodada `2026-10-14T1916`, fora do git, antes
  e depois da emenda): a **C-Ap-FR X (TFM)**, com `AV1`, `AV2` e `AV3` e o currículo só com a **PP 3** — antes, a
  `AV3` ligava à PP 3 pela coluna T/E da linha; agora as **três não casam**, porque nenhuma descrição nomeia a PP
  (*"AV1 – TFM – AVALIAÇÃO - CORRIDA"*, *"AV2 – TFM – AVALIAÇÃO - NATAÇÃO (50 METROS)"*, *"AV3 – AVALIAÇÃO -
  PERMANÊNCIA NA ÁGUA"*). Se a coluna T/E pode desempatar é a **P10**, abaixo. **Proposta:** manter; e, nas planilhas
  que ainda forem usadas, o operador escrever o COD do instrumento (`PM1`, `TG1`). **Aprovação:** [pendente]
  *(Reescrita em 15/10/2026, na revisão do texto contra o código: a primeira redação dizia "os candidatos são todos
  os itens da disciplina, a descrição desempata", o que admitiria a eliminação que o código recusa.)*
- **P3 — RN-AV-11 com provas numeradas e sem número misturadas.** Exemplo sintético: dois itens PM na disciplina; a
  planilha traz `PM` em 01/03 e `PM1` em 10/03. **Leitura adotada:** a `PM1` fica com o item 1, e a `PM` sem número
  pega o **menor número livre** — o 2 —, embora aplicada antes; entre as sem número, vale a ordem cronológica. **E o
  número escrito na descrição não conta no COD de instrumento sem número:** a descrição só desempata o
  **instrumento** (RN-AV-10), então `PM` com a descrição *"PM4 – …"* pega pela ordem cronológica, e não o item 4.
  Com `AV`, ao contrário, o número da descrição vale (D6.1, P2). **Alternativa:** a ordem cronológica para todas,
  renumerando a `PM1` — contra o número que o operador escreveu. **Proposta:** manter. **Aprovação:** [pendente]
- **P4 — "Dias consecutivos ou próximos" (RN-AV-12).** **Leitura adotada:** até **7 dias corridos** entre uma sessão e
  a seguinte. Nas datas dos planos da sincronização da rodada `2026-10-14T1916` (a tabela da §1 de
  `desenho-emenda-15-10.md`): as sessões de `PP` da CAHO IV, de 22/06 a 07/07, a 0, 1, 3 e 4 dias uma da outra,
  **juntam**; a última `PP` da CAHO IV, de 19/08, a **43 dias** da anterior (07/07), fica **separada** — é outra
  prova, e, se passar do currículo, informação pela RN-AV-14; e a CAHO XVII, `T` de 14/07 e de 27/07 (**13 dias**),
  fica em **duas** provas. **Proposta:** 7 dias, como o parâmetro A5 do desenho, ajustável por dado. **Pergunta:** os
  casos de 13 e de 43 dias são, para você, a mesma prova? **Aprovação:** ✅ **7 dias, aprovado em 16/10/2026**, e a ação *"juntar como sessão da mesma prova"* na aba, para o Encarregado e o Admin *(Corrigido em 15/10/2026:
  citava `erros-por-turma/01-CAHO-2026.md` da rodada, que o reensaio com a regra nova regera.)*
- **P5 — PE e os demais instrumentos sem vista (RN-AV-13 literal).** A regra nomeia PM e PO como obrigatórios e PP, T e
  TG como não; não fala de PE, PD, TI, EC, PJ e MN. **Leitura adotada:** literal — só PM e PO exigem vista.
  Consequência: o item **PE** (ou PD, TI…) a que o currículo dá **tempo de vista** deixa de gerar alerta; a vista
  lançada continua contando na CHD. O B de *«vistas realizadas A de B»* continua contando os itens com tempo de vista.
  **Alternativa:** exigir vista também do item a que o currículo dá tempo de vista. **Proposta:** manter o literal, que
  é o texto da regra; se a intenção era incluir a PE, basta acrescentar `PE` em `vistaObrigatoria` de
  `lib/dominio/avaliacoes/instrumentos.json` — na tela e na sincronização é dado, sem código (com a A4 do desenho, a
  marca passa a `config_listas.metadados.vista_obrigatoria`, também dado). **Pergunta:** o B passa a
  contar só PM e PO? **Aprovação:** ✅ **decidido em 16/10/2026: vista obrigatória para PM, PO e PE** (não o literal)
- **P6 — Aplicador: recusa ou aviso.** *"Aplicador de prova = instrutor habilitado."* **Leitura adotada:** o aplicador
  é **instrutor do cadastro**, e a falta de **habilitação** na disciplina continua **aviso**, sem recusa — como a D-AV-3
  (13/10/2026), a `RN-INST-01` do documento 04 e a regra 6 do `CLAUDE.md`. Na sincronização, o aplicador fora do
  cadastro continua pendência **não bloqueante**, como hoje (a frase *"só vira pendência se a linha for aula de
  disciplina com EO"*, lida junto com *"aplicador de prova = instrutor habilitado"*). **Proposta:** manter o aviso. Se
  quiser recusa, ela muda a D-AV-3, e a recusa vem da Server Action e do banco, não só da tela. **Aprovação:** ✅ **aviso, aprovado em 16/10/2026**
- **P7 — Aula de disciplina com técnica AP e responsável fora do cadastro.** **Leitura adotada:** **continua
  pendência**, como hoje: a RN-RESP-1 diz que a aula de disciplina, *"técnica EO ou prática de disciplina"*, exige
  instrutor habilitado; só a frase da sincronização nomeia apenas a EO. Impacto medido pela orquestração em 15/10/2026
  sobre a rodada `2026-10-14T1916`: **0** aulas. **Proposta:** manter. **Aprovação:** [pendente]
- **P8 — TAD e TR.** A RN-RESP-1 não as nomeia. **Leitura adotada:** nome livre também em TAD e TR — a frase da
  sincronização vale para toda linha que não é aula de disciplina, e a tela já oferecia nome livre nelas (o rótulo
  passa a *"Outro responsável (nome livre)"*). **Proposta:** manter. **Aprovação:** [pendente]
- **P9 — O catálogo inteiro como «informação».** **Leitura adotada:** a seção *Catálogo (aba BD DISCIPLINAS)* da lista
  por turma sai **inteira** com prioridade «informação». Além da diferença de CH da BD DISCIPLINAS × currículo — que a
  sincronização nunca leva ao banco (D-CUR-1) —, ela traz dois casos que são **erro real** da planilha: o **código que
  não existe na BD DISCIPLINAS**, que faz a IMPRESSÃO sair com erro de PROCV (por exemplo, `AD+30` na CAHO e `TR+7` no
  C-Ap-FR), e a **técnica (T/E) da avaliação** vazia ou EO no catálogo (por exemplo, `VI+AV1` no C-Esp-ME).
  **Proposta:** «informação» só para a diferença de CH; o PROCV e o T/E saem como erro. **Aprovação:** ✅ **decidido em 16/10/2026: PROCV e T/E da avaliação voltam a «corrigir», prioridade Média; o resto é informação**
- **P10 — A coluna T/E da linha como desempate quando o COD é `AV`.** Pela P2, o `AV` só casa pelo instrumento que a
  **descrição** nomeia; a coluna **T/E** (técnica de ensino) da linha da PREENCHIMENTO **não** entra. Antes da emenda,
  ela entrava: era por ela que a `AV3` da C-Ap-FR X (TFM) ligava à PP 3 (P2). **Medido em 15/10/2026 sobre os planos
  da gravação local da rodada `2026-10-14T1916`:** das **44** provas `AV` que não casam, **27** têm T/E que nomeia um
  instrumento da disciplina. **Pergunta:** aceitar a T/E como desempate quando o COD é `AV` (as 27 passariam a ter
  instrumento candidato; quantas ligariam a item **não** foi medido), ou manter só a descrição? **Proposta:** perguntar, **sem implementar** — a T/E é a técnica de ensino da
  linha, e a RN-AV-10 diz que *"a descrição só desempata"*. **Aprovação:** ✅ **aceita em 16/10/2026** — implementada no #58

## 16/10/2026 — decisões de Bernardo sobre a emenda de 15/10 (o desenho e as perguntas)

**A decisão** *(Bernardo Villas Boas, 16/10/2026, no texto dele — "todas APROVADAS por mim em 16/10/2026")*:

> - *Migration da emenda: opção A (desenho-emenda-15-10.md). Registre como emenda à exceção da constituição de 14/10
>   (Princípio VI).*
> - *T numera a ordem dos trabalhos: aceita. P10 (AV desempata pela coluna T/E): aceita.*
> - *Dias próximos = 7, e na aba Avaliações da turma a ação "juntar como sessão da mesma prova" (Encarregado/Admin,
>   com trilha).*
> - *Vista obrigatória para PM, PO e PE.*
> - *Aplicador sem habilitação: aviso. Nome livre recusado no endpoint para aula/avaliação: aceito.*
> - *Catálogo: código inexistente (PROCV) e T/E da avaliação voltam a "corrigir", prioridade Média; o resto é
>   informação.*
>
> *"EXECUTE DE PONTA A PONTA, SEM PARAR PARA ME PERGUNTAR (…) PARE E ME CHAME SÓ SE: o remoto divergir do ensaio; a 2ª
> rodada não der zero; um teste reprovar de forma reproduzível (…); ou surgir decisão de regra de negócio que não está
> acima."*

**O que cada uma fecha** (as perguntas da seção de 15/10/2026, acima):

| Item | Resposta de 16/10/2026 | Efeito |
|---|---|---|
| ⛔ Portão — o desenho | **Opção A** | T252 fechada; T253–T260 executadas neste ramo (#58) |
| D-CONST-VI (14/10/2026) | **Emendada**: o #58 traz **duas** migrations (uma de estrutura, uma de dado) | `plan.md` (*Complexity Tracking*) e a nota do Princípio VI nos dois endereços da constituição (CONST-1) |
| P1 — `T` | **Aceita**: o número do `T` é a ordem dos trabalhos | a leitura de 15/10 vira regra |
| P4 — "dias próximos" | **7 dias**, como dado (`avaliacao.janela_sessoes_dias`) | os casos de 13 e 43 dias ficam provas separadas; quem decide juntá-los é o Encarregado ou o Admin, na aba, pela ação nova |
| — | **Ação nova** na aba *Avaliações* da turma: *"juntar como sessão da mesma prova"*, só Encarregado e Admin, **com trilha** | a trilha mora na própria sessão (quem, quando, a avaliação juntada e o retrato dela antes), imutável por gatilho — sem tabela fora do desenho aprovado (regra 9.4) |
| P5 — PE | **PM, PO e PE** exigem vista (não mais o literal) | a marca `vista_obrigatoria` em `config_listas.metadados` dos três; o B de *«vistas realizadas A de B»* segue contando os itens com tempo de vista |
| P6 — aplicador | **Aviso** (sem recusa) | como estava |
| — | **Nome livre recusado no endpoint** para aula e avaliação: **aceito** | como estava (mudança de comportamento declarada no #58) |
| P9 — catálogo | **PROCV** (código inexistente na BD DISCIPLINAS) e **T/E da avaliação** voltam a **corrigir**, prioridade **Média**; o resto do catálogo é informação | `scripts/carga_dsa/erros_por_turma.py` |
| P10 — T/E | **Aceita**: com COD `AV` e a descrição sem instrumento, a coluna **T/E** da linha desempata | `regras_de_prova.ligar_ao_curriculo` |
| P2, P3, P7, P8 | não citadas em 16/10/2026 | continuam implementadas com a leitura de 15/10 e **[pendente — Bernardo]** |

**Aprovação:** ✅ **aprovado por Bernardo Villas Boas em 16/10/2026** (opção A, P1, P4, P5, P6, P9, P10 e a ação de
juntar). O que a implementação mediu e decidiu dentro dessas palavras está em *Session 2026-10-16* da spec.
