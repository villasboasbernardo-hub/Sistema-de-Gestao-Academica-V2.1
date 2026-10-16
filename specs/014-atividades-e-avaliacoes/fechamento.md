# Fechamento da spec 014 — os critérios de sucesso medidos (T236)

> **Medido em 16/10/2026 (tarde)**, depois do #60 (`6524c63`), do #61 (`3165a59`) e da rodada da A4.7 no remoto
> (`antes-depois/rodada-da-a47-no-remoto.md`). Cada número com o artefato ao lado (regra 9.2).
>
> - **Banco:** o **remoto**, só leitura, por `scripts/provas/fechamento_014.sql` e `emenda_16_10_medidas.sql` (rodados
>   por `scripts/provas/medir_no_remoto.py`), depois da rodada e da junção; a cópia local igual a ele é
>   `remoto-20261016-145034.sql` + a rodada da CAHO e a junção refeitas (as 29 turmas iguais, `3dc367f9`).
> - **Suítes:** o CI do #61 (run `38934329964`, sobre `8dc60a7`) — **2.314** de unidade (162 arquivos) · **768** pgTAP
>   (53) · **326** invariantes e RLS (17) · **471** de ponta a ponta + 6 pulados — e o `verificar:tudo` local do mesmo
>   ramo, com os mesmos 477 casos de ponta a ponta (468 + 3 instáveis sob carga que passam isolados, 24 de 24, + 6
>   pulados; PEND-014-7). O #60 acrescentou `cards-levam-a-aba.spec.ts`.
> - **A única pendência que fica é a reconferência do card por Bernardo** (`roteiro-de-conferencia-producao.md`, passo 0).

| SC | O que o critério pede | Instrumento | Resultado |
|---|---|---|---|
| SC-001 | AEC, TAD e TR com os dois percentuais em toda turma com DSA; acima do teto de TAD, a lista medida | `vw_conformidade_tetos` no remoto; `tests/e2e/tetos-da-turma.spec.ts` | ✅ Os cards com «do previsto» e «do máximo» (e2e verde). Acima do máximo de **TAD**: **só C-Ap-FR 2026 (65 de 58,20)**; de **AEC**, C-Espc-FR (108 de 80) e C-Espc-HN (83 de 80) — alerta, nunca bloqueio |
| SC-002 | Mudar o teto em `config_parametros` muda o alerta sem redeploy (só origem *norma*) | `tests/unidade/tetos-da-turma.test.ts` + pgTAP da E-1/E-2 | ✅ verdes (2.314 · 768) |
| SC-003 | Nenhum lançamento recusado por teto | o banco (regra 6: teto não é `CHECK`) e o dado real; `tetos-da-turma.spec.ts` | ✅ **pelo banco e pelo dado**: no remoto, 65 TA de TAD da C-Ap-FR gravados com máximo de 58,20; o e2e mostra o alerta sem recusa. ⚠️ **Lacuna de instrumento:** a semente do e2e insere os lançamentos acima do teto direto no banco — não há caso que **lance pela tela** acima do teto e leia a linha |
| SC-004 | EI e Apoio Individualizado nunca na CHT | pgTAP da E-2 (`compoe_cht`) + Vitest; `vw_carga_horaria_turma` no remoto | ✅ CHT = CHD + AEC + TAD + TR nas **29 de 29** turmas |
| SC-005 | AEC global em todas as turmas com DSA na data, e só nelas | `tests/e2e/dsa-tipo-e-global.spec.ts` | ✅ verde no CI; no local, instável sob carga e verde isolado (PEND-014-7) |
| SC-006 | Zero avaliação viva «pendente» com vista registrada; Atrasada no 8º dia | `fechamento_014.sql` no remoto + `tests/unidade/avaliacoes/situacao.test.ts` | ✅ **0** de 181 vivas; vistas atrasadas reais: **8** (eram 6 em 14/10; 8 desde a emenda de 15/10, com a PE) |
| SC-007 | As substituídas fora de toda contagem; a cancelada sem marca continua cancelada | `fechamento_014.sql` no remoto + `contagem.test.ts` | ✅ **188** substituídas, as 188 com a marca, fora da contagem. ⚠️ **A «cancelada sem marca» não existe mais**: era a `DSAP-C-EXP-OBS-ME-2026-L206-V`, **reativada** pela A6.1 (decisão de 14/10/2026); hoje as **23** canceladas têm marca |
| SC-008 | C-Ap-HN: UE 7 = 18 + PM 2 + vista 1 = 21; HN-2101 fecha em 126; a rodada não muda CH do catálogo | `fechamento_014.sql` (a HN-2101 é `23 - C-Ap-HN - I` no sistema) + o retrato do catálogo de cada rodada | ✅ UE 7: 21 previstos, 18 de conteúdo, PM 4 com 2 + vista 1; a disciplina com CH **126** = a soma das UEs; catálogo igual antes e depois de cada execução (`disciplinas c1c8e134…`, `unidades da918009…`) |
| SC-008.1 | Banco × currículo: zero divergência de CH nos 24 cursos | a D-5 (`antes-depois/correcoes_banco_x_curriculo.md`, A4.2, 14/10/2026) + o md5 do catálogo | ✅ medido na D-5; o catálogo de CH **não mudou desde então** (md5 de `disciplinas` `c1c8e134…` em todas as rodadas). ⚠️ `scripts/etl/conferir_avaliacoes_curriculo.py` (T128) **não foi escrito** — a conferência é a da D-5 |
| SC-008.2 | A lista de erros traz os casos do §11-B, sem prova a mais nem sessão 2..N como erro | `erros-de-planilha.md` e `erros-por-turma/` da rodada | ✅ a prova a mais e as sessões saem como **informação**. Dois casos do §11-B **foram resolvidos pela A4.7** e saíram da lista: a CAHO III `T` em 2 sessões ligou à **TG 1**; o TFM do C-Ap-HN XVII ligou à PP 1 e à PP 2 |
| SC-008.3 | A unificação da Q-15 preserva, por turma, contagens e CH executada | a asserção da D-6 no pgTAP + `antes-depois/unificar_hn2101_e_matfis.md` (14/10/2026) | ✅ a asserção verde (768); o relatório da D-6 com as contagens iguais antes e depois |
| SC-009 | Aula em tempo parado recusada (global e da turma), contagem intacta | `tests/e2e/dsa-parar-dia.spec.ts` | ✅ verde no CI; no local, um caso instável sob carga em 16/10, verde isolado |
| SC-010 | Toda tela nova alcançada por clique | `tests/unidade/toda-tela-tem-caminho.test.ts` + os e2e da spec | ✅ verdes; e o card → aba agora **à vista** (`cards-levam-a-aba.spec.ts`, #60) |
| SC-011 | Zero `formula_mf`/`carater` e zero coluna de nota, sem comentário | varredura sem comentário (regra 9.1.1), com controle positivo | ⚠️ **NÃO FECHA COMO ESCRITO**: zero coluna de nota e zero cálculo, **mas** `formula_mf` e `carater` são **lidos e exibidos como texto** na aba *Sobre o Curso* (`app/(app)/cursos/[curso]/page.tsx`, `AbaSobre.tsx`) desde o #18 — pela **FR-007.1 da spec 009**, decisão de Bernardo de 16/09/2026 (*"a proibição é de modelar, calcular e interpretar, não de exibir"*). A FR-062 da spec 014 diz *"nenhuma tela … MUST ler"*: os dois textos se contradizem (abaixo) |
| SC-012 | Parada «consome TR» de 4 TA sobe o TR em 4; desfeita, volta | `tests/e2e/dsa-parar-dia.spec.ts` | ✅ verde |
| SC-013 | Feriado e licença previstos não mudam TAD nem CHT | `tests/unidade/tetos-da-turma.test.ts` + `vw_carga_horaria_turma` | ✅ verdes; os dias parados à parte (`ta_dias_parados`), fora da CHT nas 29 |
| SC-014 | Toda disciplina dos 24 cursos: aula + avaliação = CH, ou «não definido»; arbitrar não muda CH | `fechamento_014.sql` no remoto + `tests/invariantes/arbitrado-nao-muda-ch.test.ts` | ✅ **172** disciplinas ativas: **137** com o tempo definido, **35** «não definido» ou sem item, **0** com avaliação acima da CH; o invariante verde |
| SC-015 | Todo previsto exibido traz a origem; arbitrado sempre com a marca | `fechamento_014.sql` + `previsto.test.ts` + `avaliacoes-da-turma.spec.ts` | ✅ **0** ajustes e **0** itens sem origem. ⚠️ As **13** sugestões vazias (abaixo) aparecem com a marca de sugestão sem valor a confirmar |
| SC-016 | Estouro exatamente quando Z < 0 (Z = 0 e Z = −1) | `tests/unidade/avaliacoes/projecao.test.ts` + `avaliacoes-da-turma.spec.ts` (−2) | ✅ verdes |
| SC-017 | «N aplicadas de M» sem vista, substituída nem cancelada; a prova em N sessões conta 1 | `contagem.test.ts` + `avaliacoes-nas-telas.spec.ts` + `avaliacoes-sessoes-e-a-mais.spec.ts`; a tela | ✅ verdes; na tela, a PP 1 da CAHO IV em **15 sessões** conta 1 (*"3 de 3"* na IV) |
| SC-018 | Previsto do PROENS: Admin, Encarregado e Ajudante gravam; Operador `42501`; o caso do Ajudante | `tests/invariantes/rls/atividades-e-avaliacoes.test.ts` | ✅ verde (326) |
| SC-019 | As 10 linhas de `reservas_proens` por curso nas turmas; as 2 genéricas em `config_parametros` | `fechamento_014.sql` no remoto | ✅ as **10** chegam à turma do curso e ano com o mesmo valor; `proens.reserva_generica_tad` = 2 e `_tr` = 0, ativos |

**De 22 critérios: 19 fecham como escritos**; a SC-007 fecha com a cláusula da «cancelada sem marca» superada pela A6.1;
a SC-003 fecha pelo banco, com a lacuna de instrumento declarada; e a **SC-011 não fecha como escrita**.

## O que não fechou, e por quê

- **SC-011 — a FR-062 desta spec contradiz a FR-007.1 da spec 009.** A tela mostra `formula_mf` e `carater` como texto
  desde 24/09/2026, por decisão sua de 16/09/2026; nenhum cálculo, nota, média ou aprovação. **Proposta:** emendar a
  FR-062 e a SC-011 para *"nenhum cálculo, filtro, ordenação ou alerta lê `formula_mf` ou `carater`; a exibição como
  texto da aba Sobre o Curso (FR-007.1 da spec 009) fica"* — decisão sua (`PEND-014-10`).
- **SC-003 — a prova é do banco, não da tela.** Falta um e2e que lance pela tela acima do teto e leia a linha.
- **Cancelados por decisão de Bernardo Villas Boas em 15/10/2026:** a T213 (a situação por avaliação na planilha de
  contingência) e os três itens sem tela da T189 (arbitrar a quantidade, o histórico «Sem correspondência», o filtro por
  disciplina).
- **Achado da rodada de 16/10/2026, não corrigido — a sugestão VAZIA** (`PEND-014-11`): **13** sugestões ativas da
  planilha com os dois tempos nulos (11 sobre itens da A4.7, 2 de 15/10), que a aba mostra como *«arbitrado — sugestão
  da planilha, a confirmar»*. Proposta: a sincronização não cria sugestão sem valor, e as vazias saem por exclusão lógica.
- **A `PEND-014-6` (A4.7) está FECHADA**: os 87 itens no remoto (D-10, backup `remoto-20261016-135852.sql`).
