# Aprovações pendentes — spec 014 (implementação noturna de 14/10/2026)

> Tudo o que precisa da palavra de Bernardo antes da fase **publicar** (remoto e merges). Numerado
> por PR. Nada aqui foi aplicado no remoto. Cada antes/depois foi medido no banco **local**,
> recriado a partir de uma cópia nova do remoto (arquivo citado em cada item).

## Fase 0

- **A0.1 — Texto final das emendas §12 e E-1 a E-9.** O conteúdo foi aprovado em 14/10/2026; o
  texto final está na spec §12 e §13 e é aplicado nos `.md` dos documentos 02, 04, 07 e 42 nos PRs
  2, 2.1 e 5. Conferir no diff de cada PR.

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
  **Aprovação:** [pendente]

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
  **Aprovação:** [pendente]

- **A1.3 — Exceção D-1 registrada no CLAUDE.md** (coluna gerada recriada). Texto em *Convenções de
  banco*. Conferir a redação.

- **A1.4 — Emenda do BRIEF §2.1** com as duas tabelas novas (`dias_parados`, `limites_curriculo`),
  só no `.md`. Conferir a redação.

## Decisões tomadas sozinho durante a implementação

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

