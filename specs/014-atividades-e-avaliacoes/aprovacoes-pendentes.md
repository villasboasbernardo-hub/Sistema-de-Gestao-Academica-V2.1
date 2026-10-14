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

## Decisões tomadas sozinho durante a implementação

✅ **D1.1 a D2.1.4 ACEITAS por Bernardo Villas Boas em 14/10/2026** (*"Decisões que você tomou sozinho
(relatório §3): todas aceitas."*). As de número maior nasceram depois e esperam a palavra dele.

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
