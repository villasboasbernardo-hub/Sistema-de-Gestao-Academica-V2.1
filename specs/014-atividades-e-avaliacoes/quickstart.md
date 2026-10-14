# Quickstart — como validar cada PR da spec 014, de ponta a ponta

> Guia de **validação**, não de implementação. Para cada PR: o que precisa estar de pé, o comando
> que prova e o resultado esperado. A suíte vive na porta **3100**; quem confere na tela fica na
> 3000. Se faltar memória, `--workers=2`. Toda conferência de Bernardo no preview chega **por
> clique**, a partir do menu; `page.goto` só para o ponto de partida.

## Pré-requisitos (uma vez)

```bash
pnpm db:reset:limpo            # o mesmo comando do CI; sem Admin extra (gotcha 8)
pnpm db:tipos && git add lib/tipos/database.ts   # depois de toda migration (verificar-tudo-com-migration-nova)
```

Para conferir com dado real no local: `python -m scripts.manutencao.dado_do_remoto` (recria o local
com a cópia datada do remoto). ⚠️ Com a cópia no local, a ponta a ponta precisa de base limpa
(`e2e-local-exige-base-limpa`): reset limpo → e2e → cópia de novo.

---

## PR 1 — banco da leva 1 (estrutura + D-1, D-2)

**De pé:** as migrations de estrutura (enum, `compoe_cht`, tipo FK, `dias_parados`,
`limites_curriculo`, listas, views) e as de dado (limites dos 24 currículos; reclassificação dos
tipos).

```bash
pnpm db:reset:limpo && pnpm test:invariantes    # pgTAP: 123_*.sql a 125_*.sql verdes
pnpm test:rls                                    # dias_parados: Operador cria de turma, 42501 em global
pnpm verificar
```

| Prova | Esperado |
|---|---|
| `compoe_cht` por categoria | AEC/TAD/TR `true`; EI e Apoio `false`; contagem de `true` igual antes e depois na base carregada |
| atividade nova sem tipo | recusada (`ativ_tipo_obrigatorio`); histórica do ETL sem tipo continua |
| tipo com categoria trocada em `config_listas` | próxima leitura de `vw_carga_horaria_turma` conta na nova (cenário 4 da US2) |
| global AEC de 2 TA em data com 2 turmas com DSA e 1 EAD | soma 2 nas duas, 0 na EAD |
| `dias_parados` global de dia inteiro | recusado (`dpa_global_so_parte_do_dia`) |
| `limites_curriculo` | 30 linhas, cada uma com arquivo e página; CAHO AEC 166 / TR 166 |
| **defeito deliberado**: `compoe_cht` com a expressão antiga | o pgTAP de categoria reprova nomeando Apoio_Individualizado |
| reversão numa base descartável | impressão digital volta à de antes (`scripts/provas/impressao_digital_do_esquema.sql`) |

## PR 1.1 — banco do previsto por turma (estrutura + D-3)

```bash
pnpm db:reset:limpo && pnpm test:invariantes    # pgTAP: 126_previsto_proens.sql
pnpm test:rls                                    # o caso que discrimina: Ajudante grava; Operador 42501
```

| Prova | Esperado |
|---|---|
| as 10 reservas com curso | 10 linhas em `previstos_proens_turma`, nas 5 turmas de 2026, mesmo valor; a genérica em `config_parametros` |
| `UPDATE` do previsto | linha nova em `previstos_proens_alteracoes` com antes/depois/autor; `UPDATE` na trilha recusado inclusive como `service_role` |
| `reservas_proens` | escrita recusada para `authenticated`; leitura intacta |
| `vw_conformidade_tetos` | só números crus: C-Ap-HN AEC `limite_declarado` 65, `ch_curricular` 1.257, `percentual_norma` 10; TAD sem declarado, percentual 5 (62,85 e a origem saem de `limiteMaximo()`) |
| **defeito deliberado**: a policy do previsto lendo `calendario.editar` | a RLS reprova no Ajudante |

## PR 2 — cards de AEC/TAD/TR, limites no curso, `/inicio`, `/atividades`

```bash
pnpm test:unidade -- tetos-da-turma limite-maximo
pnpm test:e2e -- tetos-da-turma.spec.ts previsto-proens.spec.ts limites-do-curso.spec.ts
```

| Percurso (por clique) | Esperado |
|---|---|
| menu *Turmas* → turma → cards | `TAD — n de n previstos (x %) · n de n máximos (y %)` com a origem do máximo, barra até o máximo com o marcador do previsto (D-TETO-3); sem previsto, *"previsto não definido"*; linha "Dias parados"; EI com 20 %/10 % |
| *Editar previsto* como Ajudante → 130 numa turma de máximo 126 | grava, aviso *acima do limite máximo*, "alterado por … em …" |
| o mesmo como Operador | botão ausente **e** Server Action recusada (`42501`) |
| menu *Cursos* → curso → bloco *Limites máximos* | três linhas com origem e página; sem cumprido |
| menu *Início* | turma com TAD acima do máximo listada, link leva à turma |
| menu *Atividades* | deixa de ser *"em breve"*; lista por turma, tipo e categoria, filtros na URL |
| somar EI/Apoio/dias parados à CHT no código | **erro de tipo** (`tsc`) |

## PR 2.1 — DSA: tipo → categoria, global pela tela, parar dia, papel

```bash
pnpm test:unidade -- dia-bloqueado categoria-pelo-tipo
pnpm test:e2e -- dsa-parar-dia.spec.ts dsa-global.spec.ts dsa-tipo.spec.ts dsa-imprimir.spec.ts
```

| Percurso | Esperado |
|---|---|
| DSA → lançar atividade → escolher **tipo** *Monitoria* | categoria *Apoio Individualizado* mostrada antes de gravar; grade marca *"alunos específicos"*; TAD da turma não muda |
| DSA → *Parar dia* → LA, turma, prevista, tempos 1–4 | linha "dias parados" + 4 LA; aula no tempo 2 recusada com a frase da `RN-EVT-04`; TAD intacto |
| a mesma com *"consome Tempo Reserva"* | TR + 4; "dias parados" intacta; aula recusada |
| *Parar dia* → todas as turmas, como Operador | recusa nomeando `calendario.criar`, `42501` do banco |
| como Encarregado, dia inteiro | linha em `feriados`; dia bloqueado no DSA de toda turma com DSA na data |
| *Desfazer* | dia aceita aula de novo; TR volta; linha `inativo` |
| cascata (D-DSA-3) sobre tempo parado | recusa nomeando o bloqueio; nada gravado |
| *Imprimir* | tipo e motivo no papel |

## PR 3 — carga da leva 1

```bash
python -m scripts.carga_dsa.provar_carga_dsa                 # recusas, em memória
python -m scripts.carga_dsa.provar_sincronizacao_no_banco     # no Docker local: duas rodadas = zero mudança; catálogo intacto
```

| Prova | Esperado |
|---|---|
| planilha com `LA` só da turma | `dias_parados`; a linha TAD antiga inativada com marca |
| MONITORIA | `Apoio_Individualizado` |
| evento em todas as turmas | uma linha por turma; global **nenhuma** |
| responsável que não casa | pendência no lote, nada gravado |
| CH do catálogo antes/depois | md5 **idêntico** |

## PR 4 — banco da leva 2 (estrutura + D-4 a D-8)

⚠️ **Ordem de aplicação: E-4 → E-5 → D-5 → D-6 → D-4 → D-7.** E o `db push` só depois de o PR 2.1 estar na `main` (lista positiva de status em Production); sem isso as 188 substituídas voltam ao DSA ao rodar a D-7.

```bash
pnpm db:reset:limpo && pnpm test:invariantes    # pgTAP: 127_* a 130_*
pnpm test:rls
python -m scripts.etl.conferir_avaliacoes_curriculo   # Σ TA de avaliação ≤ CH em toda disciplina; itens com página
```

| Prova | Esperado |
|---|---|
| D-4 | itens dos 24 cursos; C-Ap-HN HN-2101 UE 7: PM 2 + vista 1, UE 7 computada, p. 9 |
| D-5 | C-Ap-FR III = 75; MetocOf I = 30, V = 50; C-Espc-FR TFM = 48; NAV I/II = 108/120; ALH III ativa com o código do currículo; lançamentos que apontam para cada uma: contagem intacta |
| D-6 | C-Ap-HN: I-I `inativo`, HN-2101 = 126 com as UEs das duas; CAHO MATFIS = 56; por turma, aulas/avaliações/atividades e CH executada **iguais** antes e depois |
| D-7 | 188 `substituida_pela_planilha` com `status_anterior`; `L206-V` continua `cancelada`; vivas 188 |
| D-7b | nº de avaliações com `data_vista_prova` = nº de sessões 1 |
| D-8 | 16 aulas com `outros_instrutores` preenchido e `observacoes` sem o nome |
| `fn_status_vista` × `situacaoDaAvaliacao` | mesmo veredito nos dias 7 e 8 (pgTAP com os casos do Vitest) |
| **defeito deliberado**: sessão com data anterior à aplicação | gatilho recusa |

## PR 5 — abas *Avaliações*, cards, painel com projeção

```bash
pnpm test:unidade -- previsto projecao situacao contagem
pnpm test:e2e -- avaliacoes-da-turma.spec.ts avaliacoes-do-curso.spec.ts card-de-avaliacoes.spec.ts
```

| Percurso | Esperado |
|---|---|
| turma → card *Avaliações* | *"12 aplicadas de 30"*, barra, *"+ 3 OD"*, *"vistas 9 de 27"*; clique abre `?aba=avaliacoes` |
| aba → disciplina de 120 com 100 cumpridos e 2 provas de 2 TA por aplicar | *"restam 20 TA; faltam 2 avaliações (4 TA) → sobram 16"*; com 118, **estouro** sem bloqueio |
| disciplina da semente com `sugestao_planilha` (como Obs-ME, DHN-0225) | *"arbitrado — sugestão da planilha, a confirmar"*; Encarregado confirma → *"definido pela Divisão"*; Operador não vê o botão e a ação recusa |
| MetocOf | 4 TA na disciplina, aviso *"o currículo não diz de qual UE sai"* |
| prova aplicada há 8 dias sem vista | *Atrasada*; há 7, *Em andamento* |
| OD do LHFC antes do 1º lançamento · correndo · concluída | pendente · em andamento · concluída |
| curso → aba *Avaliações* | lista por turma com filtros na URL; copiar a URL reabre igual |
| `/inicio` | vistas atrasadas e as que vencem em 2 dias |
| busca sem comentário | zero `formula_mf`, `carater`, nota (SC-011) |

## PR 5.1 — DSA oferecendo os itens, N sessões, papéis

```bash
pnpm test:e2e -- dsa-avaliacao-item.spec.ts dsa-vista-sessoes.spec.ts dsa-papeis.spec.ts
```

| Percurso | Esperado |
|---|---|
| DSA → disciplina HN-2101 → lançar *PM 1 (UE 7)* 2 TA | painel: PM 2/2 na UE 7; CHD + 2; item marcado aplicado na lista |
| lançar vista da PM 1, sessão 1; depois sessão 2 | duas sessões, as duas na CHD; situação *Concluída* após a 1ª |
| fiscal externo + aplicador sem habilitação | fiscal aceito; aplicador **aceito com aviso**, gravado (D-AV-3, 13/10/2026; a `RN-INST-01` não muda) |
| `fiscal_id` + `nome_fiscal_externo` | recusado pelo banco |
| faixa *"U.E. 3 a 6"* | no papel e na lista; nenhuma UE consome |

## PR 6 — carga da leva 2

```bash
python -m scripts.carga_dsa.provar_carga_dsa
python -m scripts.carga_dsa.provar_sincronizacao_no_banco
```

| Prova | Esperado |
|---|---|
| prova da planilha com item casável | `avaliacao_curriculo_id` preenchido |
| TFM do C-Ap-HN, prova 7 × 4 | casa por instrumento e número: entra **com** item, e `erros-de-planilha.md` traz "TA de prova diferente"; a linha `XX RECON` entra **sem** item e também na lista |
| 2ª vista | sessão 2, nenhuma AEC `vista_extra_como_aec` |
| `(FISCAL)` | `fiscal_id`, aplicador intacto |
| Obs-ME | `avaliacoes_curriculo_turma` com `sugestao_planilha`; rodar de novo: zero mudança; confirmada não é tocada |
| catálogo antes/depois | md5 idêntico |

## Antes de cada PR

```bash
pnpm verificar            # a cada commit
pnpm verificar:tudo       # antes de abrir o PR — mesma contagem que o CI (SC-005)
```

E, em todo PR com migration: o rito do remoto (research R-15) **depois** do CI verde e **com a
autorização de Bernardo**, migration de dado só depois de ele ver o antes/depois.
