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
> - ~~**A única pendência que fica é a reconferência do card por Bernardo**~~ — **feita em 16/10/2026** (o card abre a aba
>   à vista em Production).
>
> **Atualizado em 16/10/2026 (noite)**, depois do **#63** (`2bc77a9`) e da rodada das correções da lista no remoto
> (`antes-depois/rodada-da-lista-16-10-no-remoto.md`): a SC-003 ganhou o caso pela tela e a SC-011 fecha como emendada.
> Suítes: o CI do #63 (run `38980372715`, sobre `be68413`) — **2.314** de unidade (162) · **770** pgTAP (54) · **326**
> invariantes e RLS (17) · **471** de ponta a ponta + 1 instável + 6 pulados (o instável, `avaliacoes-nas-telas.spec.ts:53`,
> passou isolado: o arquivo inteiro, 7 de 7 casos, com o :53 uma vez — `lista-16-10/e2e-avaliacoes-nas-telas.log`); e
> na `main` o run `38982341072`, verde. As linhas da tabela marcadas *«noite»* foram **remedidas** no remoto depois da
> rodada, pelo mesmo `fechamento_014.sql` (`lista-16-10/fechamento-014-noite-remoto.txt`, na pasta da rodada). ⚠️ **O `verificar:tudo` local foi interrompido pelo
> sistema por falta de memória** no meio da ponta a ponta (unidade, pgTAP e RLS já tinham passado com os mesmos números);
> os arquivos que o #63 tocou passaram isolados (`tetos-da-turma.spec.ts`, 8 de 8).

| SC | O que o critério pede | Instrumento | Resultado |
|---|---|---|---|
| SC-001 | AEC, TAD e TR com os dois percentuais em toda turma com DSA; acima do teto de TAD, a lista medida | `vw_conformidade_tetos` no remoto; `tests/e2e/tetos-da-turma.spec.ts` | ✅ Os cards com «do previsto» e «do máximo» (e2e verde). Acima do máximo de **TAD**: **só C-Ap-FR 2026 (65 de 58,20)**; de **AEC**, C-Espc-FR (**132** de 80 *noite*; 108 à tarde — os 24 TA da visita a Macaé, R4) e C-Espc-HN (83 de 80) — alerta, nunca bloqueio |
| SC-002 | Mudar o teto em `config_parametros` muda o alerta sem redeploy (só origem *norma*) | `tests/unidade/tetos-da-turma.test.ts` + pgTAP da E-1/E-2 | ✅ verdes (2.314 · 768) |
| SC-003 | Nenhum lançamento recusado por teto | o banco (regra 6: teto não é `CHECK`), o dado real e `tetos-da-turma.spec.ts` | ✅ **pelo banco, pelo dado e pela tela** *(fechado em 16/10/2026, noite)*: no remoto, 65 TA de TAD da C-Ap-FR gravados com máximo de 58,20; e o caso *«SC-003 · lançar PELA TELA acima do máximo»* lança pelo DSA mais 1 TA de TAD numa turma já acima do máximo, lê a linha no banco e confere a ficha só alertando (*«30 de 27,25 máximos»*). Verde no local (8 de 8) e no CI do #63 (run `38980372715`); com uma recusa plantada no banco, ele reprova. *(Era: lacuna de instrumento — a semente gravava direto no banco)* |
| SC-004 | EI e Apoio Individualizado nunca na CHT | pgTAP da E-2 (`compoe_cht`) + Vitest; `vw_carga_horaria_turma` no remoto | ✅ CHT = CHD + AEC + TAD + TR nas **29 de 29** turmas |
| SC-005 | AEC global em todas as turmas com DSA na data, e só nelas | `tests/e2e/dsa-tipo-e-global.spec.ts` | ✅ verde no CI; no local, instável sob carga e verde isolado (PEND-014-7) |
| SC-006 | Zero avaliação viva «pendente» com vista registrada; Atrasada no 8º dia | `fechamento_014.sql` no remoto + `tests/unidade/avaliacoes/situacao.test.ts` | ✅ **0** de **180** vivas *(noite; 181 à tarde — a prova de 27/07 da CAHO XVII virou sessão)*; vistas atrasadas reais: **5** *(noite, `depois-remoto.txt`; eram 8 à tarde, 6 em 14/10)* |
| SC-007 | As substituídas fora de toda contagem; a cancelada sem marca continua cancelada | `fechamento_014.sql` no remoto + `contagem.test.ts` | ✅ **188** substituídas, as 188 com a marca, fora da contagem. ⚠️ **A «cancelada sem marca» não existe mais**: era a `DSAP-C-EXP-OBS-ME-2026-L206-V`, **reativada** pela A6.1 (decisão de 14/10/2026); à tarde, as **23** canceladas tinham marca; *à noite*, **24** canceladas, das quais **2** juntadas como sessão (a CAHO IV de 19/08 e a CAHO XVII de 27/07) |
| SC-008 | C-Ap-HN: UE 7 = 18 + PM 2 + vista 1 = 21; HN-2101 fecha em 126; a rodada não muda CH do catálogo | `fechamento_014.sql` (a HN-2101 é `23 - C-Ap-HN - I` no sistema) + o retrato do catálogo de cada rodada | ✅ UE 7: 21 previstos, 18 de conteúdo, PM 4 com 2 + vista 1; a disciplina com CH **126** = a soma das UEs; catálogo igual antes e depois de cada execução (`disciplinas c1c8e134…`, `unidades da918009…`) |
| SC-008.1 | Banco × currículo: zero divergência de CH nos 24 cursos | a D-5 (`antes-depois/correcoes_banco_x_curriculo.md`, A4.2, 14/10/2026) + o md5 do catálogo | ✅ medido na D-5; o catálogo de CH **não mudou desde então** (md5 de `disciplinas` `c1c8e134…` em todas as rodadas). ⚠️ `scripts/etl/conferir_avaliacoes_curriculo.py` (T128) **não foi escrito** — a conferência é a da D-5 |
| SC-008.2 | A lista de erros traz os casos do §11-B, sem prova a mais nem sessão 2..N como erro | `erros-de-planilha.md` e `erros-por-turma/` da rodada | ✅ a prova a mais e as sessões saem como **informação**. Dois casos do §11-B **foram resolvidos pela A4.7** e saíram da lista: a CAHO III `T` em 2 sessões ligou à **TG 1**; o TFM do C-Ap-HN XVII ligou à PP 1 e à PP 2 |
| SC-008.3 | A unificação da Q-15 preserva, por turma, contagens e CH executada | a asserção da D-6 no pgTAP + `antes-depois/unificar_hn2101_e_matfis.md` (14/10/2026) | ✅ a asserção verde (768); o relatório da D-6 com as contagens iguais antes e depois |
| SC-009 | Aula em tempo parado recusada (global e da turma), contagem intacta | `tests/e2e/dsa-parar-dia.spec.ts` | ✅ verde no CI; no local, um caso instável sob carga em 16/10, verde isolado |
| SC-010 | Toda tela nova alcançada por clique | `tests/unidade/toda-tela-tem-caminho.test.ts` + os e2e da spec | ✅ verdes; e o card → aba agora **à vista** (`cards-levam-a-aba.spec.ts`, #60) |
| SC-011 | Só os leitores autorizados citam `formula_mf`/`carater`, nada os compara, filtra, ordena ou conta; zero coluna de nota *(emendada em 16/10/2026, PEND-014-10)* | `sobre-o-curso-so-consulta.test.ts` (varredura sem comentário, regra 9.1.1, com controle positivo) | ✅ **fecha como emendada**: a guarda já cobrava exatamente o texto novo — só a aba *Sobre o Curso* e a página que a alimenta citam os campos, e nenhuma linha que os cita interpreta; verde nos 2.314 de unidade do CI do #63. *(Era: não fecha — a FR-062 contradizia a FR-007.1 da spec 009)* |
| SC-012 | Parada «consome TR» de 4 TA sobe o TR em 4; desfeita, volta | `tests/e2e/dsa-parar-dia.spec.ts` | ✅ verde |
| SC-013 | Feriado e licença previstos não mudam TAD nem CHT | `tests/unidade/tetos-da-turma.test.ts` + `vw_carga_horaria_turma` | ✅ verdes; os dias parados à parte (`ta_dias_parados`), fora da CHT nas 29 |
| SC-014 | Toda disciplina dos 24 cursos: aula + avaliação = CH, ou «não definido»; arbitrar não muda CH | `fechamento_014.sql` no remoto + `tests/invariantes/arbitrado-nao-muda-ch.test.ts` | ✅ **172** disciplinas ativas: **137** com o tempo definido, **35** «não definido» ou sem item, **0** com avaliação acima da CH; o invariante verde |
| SC-015 | Todo previsto exibido traz a origem; arbitrado sempre com a marca | `fechamento_014.sql` + `previsto.test.ts` + `avaliacoes-da-turma.spec.ts` | ✅ **0** ajustes e **0** itens sem origem (*noite*: 6 ajustes ativos, 0 sem origem). As **13** sugestões vazias que a aba mostrava à tarde **saíram** pela D-11 (PEND-014-11): **0** ativas sem valor à noite (`depois-remoto.txt`) |
| SC-016 | Estouro exatamente quando Z < 0 (Z = 0 e Z = −1) | `tests/unidade/avaliacoes/projecao.test.ts` + `avaliacoes-da-turma.spec.ts` (−2) | ✅ verdes |
| SC-017 | «N aplicadas de M» sem vista, substituída nem cancelada; a prova em N sessões conta 1 | `contagem.test.ts` + `avaliacoes-nas-telas.spec.ts` + `avaliacoes-sessoes-e-a-mais.spec.ts`; a tela | ✅ verdes; na tela, a PP 1 da CAHO IV em **15 sessões** conta 1 (*"3 de 3"* na IV) |
| SC-018 | Previsto do PROENS: Admin, Encarregado e Ajudante gravam; Operador `42501`; o caso do Ajudante | `tests/invariantes/rls/atividades-e-avaliacoes.test.ts` | ✅ verde (326) |
| SC-019 | As 10 linhas de `reservas_proens` por curso nas turmas; as 2 genéricas em `config_parametros` | `fechamento_014.sql` no remoto | ✅ as **10** chegam à turma do curso e ano com o mesmo valor; `proens.reserva_generica_tad` = 2 e `_tr` = 0, ativos |

**De 22 critérios: 20 fecham como escritos** *(16/10/2026, noite: a SC-003 ganhou o caso pela tela)*; a **SC-011 fecha como
emendada** (PEND-014-10); e a SC-007 fecha com a cláusula da «cancelada sem marca» superada pela A6.1. *(Era, à tarde: 19
como escritos, a SC-003 pelo banco com lacuna de instrumento, e a SC-011 sem fechar.)*

## O que não fechou, e por quê

- ✅ **Fechados em 16/10/2026 (noite), por decisão de Bernardo Villas Boas:** a SC-011, com a FR-062 emendada
  (PEND-014-10); a SC-003, com o caso pela tela; e a PEND-014-11, pela sincronização e pela D-11 (`20261016225643`). O
  texto abaixo é o registro do que valia à tarde.
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
