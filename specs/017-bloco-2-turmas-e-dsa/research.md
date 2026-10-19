# Pesquisa — as decisões técnicas do Bloco 2

*19/10/2026. Cada decisão com o porquê e a alternativa recusada. Os fatos estão em `triagem.md` (arquivo e linha).*

## R-1 — O TA fora do DSA soma nas três somas da CHD

- **Decisão:** um ramo novo em `vw_chd_por_fato`, `vw_carga_horaria_turma` e `vw_disciplinas_execucao`.
- **Porquê:** o andamento usa a base da M1, mas o card de CHT da ficha lê `vw_carga_horaria_turma` e o DSA lê
  `vw_disciplinas_execucao`; somar só na base daria dois "executado" na mesma ficha, e a guarda do pgTAP 135 (as
  três batem) reprovaria assim que houvesse uma linha.
- **Alternativa recusada:** gravar o fora do DSA em `registros_aula` com `ta_inicial` nulo — entraria nas somas sem
  view nova, mas apareceria no DSA da semana como *sem posição*, exigiria instrutor (catraca de aula) e o Operador já
  tem `registros_aula.criar`.

## R-2 — `PEND-016-5`: o sem posição entra no acumulado do DSA pela base da M1

- **Decisão:** coluna `sem_posicao` no fim de `vw_chd_por_fato`; a leitura do DSA lê, na mesma rodada, os fatos
  `sem_posicao` da turma até o fim da semana e os junta à ocupação acumulada (sem marca de conflito). Na planilha, os
  mesmos fatos entram **uma vez só**: ⚠️ `dsa/planilha/leitura.ts` já repassa a ocupação acumulada da semana, então
  levá-los também para a lista de fora da entrada (`FORA_TEMPOS`) os contaria em dobro — a implementação escolhe **um**
  dos dois caminhos e a prova é o rodapé da IMPRESSÃO igual ao quadro do papel e à CONTROLE (achado 3). Se o caminho
  for `FORA_TEMPOS`, a *Distribuída* e o *Restante* da CRONOS (`cronos.ts`, `SUMIFS(FORA_TEMPOS, …)` sem corte)
  passam a contá-los também — e isso é **desejado** (C-26, coerente com o "executado"), com caso no teste da CRONOS.
- **Porquê:** a base é o lugar único da composição da CHD; a ocupação continua sendo a da grade (ela é lida também na
  gravação: tetos, cascata, dia parado — o fora do DSA não pode entrar ali; provado com 8 TA fora do DSA no dia e o
  teto inteiro do dia ainda aceito, sem conflito).
- **Alternativa recusada:** ler as tabelas de fato direto na leitura do DSA (uma quarta composição da CHD).

## R-3 — A trilha da troca é anotada por gatilho

- **Decisão:** `AFTER UPDATE OF status` em `turmas` anota toda troca; a observação chega pela transação, posta por
  `trocar_situacao_da_turma` (INVOKER: a RLS de `turmas_editar` decide). A Server Action passa a chamar a função.
- **Porquê:** FR-003.2 (toda troca, por qualquer caminho). O gatilho não recusa nada, e ⚠️ o corpo dele não contém
  `raise` **em lugar nenhum, nem em comentário**: o pgTAP 101 lê o `prosrc` **sem tirar comentário** e reprova gatilho
  de `turmas` com `status` e `raise` juntos — e este corpo tem `status` (`old.status`/`new.status`) (achado 70).
- **Alternativa recusada:** a função anota sozinha — a troca por `update` direto (permitida pela RLS, usada por testes
  e scripts) ficaria sem registro.

## R-4 — O arquivamento é registro próprio de eventos

- **Decisão:** `turma_arquivamentos` (arquivar/desarquivar), só de acréscimo, com a policy de criação dizendo quem faz
  cada ação; o estado atual pela view `vw_turmas_arquivadas` (com `arquivada_em`, `arquivada_por`, observação) e por
  `app.turma_arquivada`.
- **Porquê:** "só o Admin desarquiva" mora no banco **sem mexer** na permissão de editar turma; o histórico do
  arquivamento vem de graça; nada no enum.
- **Alternativa recusada:** colunas em `turmas` — o Operador, que tem `turmas.editar`, poderia limpá-las por `update`;
  impedir exigiria guarda nova em `turmas` (o que já é a M4).

## R-5 — A trava da arquivada: servidor agora, banco no portão

- **Decisão:** um auxiliar único do servidor (`lib/acoes/turma-arquivada.ts`, `recusaSeTurmaArquivada` e a variante
  pelo código) chamado por toda Server Action que grava dado da turma, com guarda de unidade que enumera essas ações;
  e a M4 no banco, parada antes do remoto. O auxiliar **recusa também quando não consegue ler** se a turma está
  arquivada (gravar numa turma que talvez esteja arquivada é o que a trava existe para impedir). Ele nasce **antes**
  das ações da US1 e da US2 que o chamam (achado 13).
- **Porquê:** a regra 9.4 (emenda de 19/10/2026) faz da trava no banco um portão (mexe no que existe); a do servidor
  entrega o comportamento na tela já no preview.
- **Molde da M4:** o guarda por valor do curso inativo e a enumeração do pgTAP 105; a turma da linha lida por
  `to_jsonb(new)`/`to_jsonb(old)` — nunca `new.campo` num `case` (achado 21) —, e no `UPDATE` pelas duas (achado 56).

## R-6 — O conflito do painel reusa `RN-CONF-01`

- **Decisão:** `ocupacao_para_conflitos(p_de, p_ate)` devolve a ocupação da semana numa chamada: a das turmas que a
  pessoa alcança, inteira; das que ela **não** alcança, **só a linha que cruza** uma alcançada (mesma data, TA
  sobreposto, a mesma pessoa como instrutor ou fiscal), anônima — o `join` de `conflitos_da_semana` (Q-17 da spec 013)
  generalizado (C-16 emendada, achado 53). `lib/dominio/painel-de-turmas.ts` roda `detectarConflitos` por turma
  visível contra as demais e contra ela mesma — o conflito **de pessoa**, inclusive dentro da própria turma; o alerta
  de sala fica fora do painel (C-23).
- **Porquê:** nenhuma segunda implementação da regra de Risco Alto; uma ida ao banco por tela; e o Encarregado de
  Curso não passa a ler a agenda semanal de todos os instrutores da CIAARA, que o desenho anterior (toda a ocupação
  alheia, anônima) entregaria.
- **Medido:** o "conflito de sala" por cadastro só acha pares de EAD (*Moodle*) ou de turmas concluídas na cópia de
  19/10/2026 — não é o conflito que importa.

## R-7 — O painel segue o recorte

- **Decisão:** indicadores e avisos sobre as linhas da tabela (o molde de instrutores); *em andamento* = situação
  ativa (o KPI do `/inicio`); *iniciando* = início em [hoje, hoje + N], não cancelada; N = `turmas.aviso_inicio_dias`.
- **Leituras extras:** `turma_disciplina` e `turma_disciplina_instrutor` das turmas do recorte (para *sem
  instrutor*), a ocupação da semana (conflito) e o parâmetro — na mesma rodada de `Promise.all`.

## R-8 — O limite do nome no cartão sai do papel

- **Decisão:** L = o maior número de caracteres do nome que cabe numa linha do título do cartão de **1 TA**, no modo
  mais apertado (seis dias e letra do compacto), medido por `scrollWidth`/`boundingBox` no `/print/dsa`, com o código
  mais largo (*"XIII "*) na frente. O valor e a medição entram em `nome-no-dsa.ts` (o Zod o aplica); o `CHECK` da coluna é só o teto de segurança de 60.
- **Porquê:** a medida é de layout (Princípio VII não se aplica: não é norma); um limite por tamanho de cartão faria
  a mesma disciplina mudar de nome de uma semana para outra.
- **A abreviação automática** (reproduzível): (1) **cabe → fica como está**, sem mexer em espaço nem ponto (C-25);
  só para quem **não** cabe: (2) espaços colapsados e ponto final tirado — cabe → fica; (3) tira o sufixo depois de
  `" / "`; (4) tira as palavras de ligação (de, da, do, das, dos, e, a, à, ao, aos, o, os, as, em, no, na, nos, nas,
  para, por, com, sobre), menos a primeira palavra; (5) abrevia, da última para a primeira, as palavras com mais de 4
  letras para as 4 primeiras + "."; (6) ainda não cabe → corta em L − 1 com "…".
- **Contra o quê se testa (regra 9.2):** a fixture `tests/unidade/dados/disciplinas-ativas-2026-10-19.txt` — os
  **172** nomes das disciplinas **ativas**, lidos em 19/10/2026 do banco local restaurado de
  `remoto-20261019-024230.sql` (o mesmo conjunto do SC-008); faixas medidas nele: mais de 30 caracteres **61**, mais de
  40 **31**, mais de 50 **20**, mais de 60 **9**, o maior **81** (`progresso-implement.md`). O retrato
  `scripts/etl/dados/disciplinas-do-banco.txt` (175 linhas de 26/09/2026, sem filtro de status) **não** é o mesmo
  conjunto e não serve de prova do SC-008.

## R-9 — O cartão nunca corta o instrutor

- **Decisão:** no papel, o cartão vira coluna com título de 1 linha (reticências), tópico que recorta (`overflow:
  hidden`) e pé `flex: none`; na tela, título com `line-clamp-1` e o instrutor fora do bloco que encolhe.
- **Prova:** `dsa-cartao-do-papel.spec.ts` imprime aulas de **1 TA** com os nomes mais longos do catálogo, mede a
  caixa do instrutor dentro da do cartão e conta 1 página — **visto reprovar antes**, com o CSS de hoje.

## R-10 — A edição da disciplina preserva o que não foi mexido

- **Decisão:** o formulário recebe técnica, local e nome no DSA gravados (`defaultValue`), e a consulta da tela os lê.
- **Prova:** e2e que edita só o nome no DSA e confere, **no banco**, que técnica e local ficaram (PEND-016-2: nada de
  conferir o valor que o próprio teste digitou).

## R-11 — A ordem natural nas três superfícies

- **Decisão:** `tabelaDeCh` e `disciplinasNaOrdemDoRodape` usam `emOrdemNaturalDoCodigo`; o comentário de
  `consulta.ts` que dizia o contrário é corrigido.

## R-12 — As obrigações de uma sequência nova

`TFD-` entra em `scripts/etl/carregar.py` (`SEQUENCIAS_DE_CODIGO`) e em `lib/acoes/traducao-de-recusas.ts`
(`NUMERACAO_INTERNA`); a `SAP-`, que faltava na segunda, entra junto. Os *hints* novos (`ta_fora_linha_divergente`,
`ta_fora_linha_inativa`, `ta_fora_so_desfaz`, `turma_fora_do_alcance`, `turma_inexistente` (`23503`),
`turma_ja_arquivada`, `turma_nao_arquivada`, `janela_de_uma_semana` e, com a M4, `turma_arquivada`) ganham frase em
português (guarda `recusas-cobrem-o-banco`).
