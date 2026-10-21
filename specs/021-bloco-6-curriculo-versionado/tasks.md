# Tasks: Bloco 6 — currículo versionado (spec 021), revisto pelas RC-1 a RC-12

## PR 1 — banco e os leitores da RC-1

- [X] T001 Triagem medida na `main` `fa372c2` e na cópia do remoto (`triagem.md`); mapa do código (`contracts/codigo.md`)
- [X] T002 Instrumentos: `scripts/provas/impressao_digital_do_curriculo.sql` e `tests/invariantes/retrato-das-telas.test.ts`
- [X] T003 M1 e T004 M2, primeira redação (portão de 21/10/2026, commits `3468d4c`, `810ee6a`, `ee10119`)
- [X] T005–T010 A primeira prova, a reversão, o pgTAP, as guardas e as suítes (registro em `antes-depois.md`, rodada 1)
- [X] T011 **PORTÃO** — Bernardo respondeu com as regras RC-1 a RC-12 (21/10/2026), que substituem a D-4/D-6
- [X] T030 As RC na spec (decisões nominais), o quadro RC × feito × muda e a RC-1 coluna a coluna (`spec.md` §3)
- [X] T031 M1 revista: o conteúdo da RC-1 no currículo, o arquivamento (coluna), `avaliacoes_planejadas.curriculo_id`, a
  policy de edição por `cursos.editar` com oferta, `revoke all` + `grant` por coluna
- [X] T032 M2 revista: o currículo 1 com os valores do curso e a vigência pelo dado (D-2), as regras de avaliação ligadas,
  `app.disciplina_sem_ue` pelo currículo, as colunas aposentadas, a recusa do currículo arquivado, mensagens sem
  "versão", **sem a trava**, e a conferência dentro da própria migration
- [X] T033 pgTAP `144` revisto (36); guardas `105`, `116` ajustadas; `107` e `127` de volta ao da `main` (a trava saiu)
- [X] T034 `lib/dominio/curriculos.ts` (RC-3, RC-12) + `tests/unidade/curriculos.test.ts`
- [X] T035 Os leitores e escritores das colunas aposentadas passam ao currículo (`contracts/codigo.md` §Revisão), a guarda
  `colunas-aposentadas-do-curso.test.ts` (vista reprovar com o defeito deliberado) e as traduções sem "versão"
- [X] T036 A permissão com sessão real: `tests/invariantes/rls/curriculos.test.ts` (o Operador como caso que discrimina,
  visto reprovar com a policy por `disciplinas.editar`); duas rodadas seguidas (regra 9.1)
- [X] T037 ETL: a ETAPA 6c (D-22); a sincronização e a conferência do ETL lendo o modelo do currículo
- [X] T038 A prova numa cópia NOVA do remoto: impressão digital, retrato das telas e retrato das páginas, antes (`main`) ×
  depois (ramo), e a reversão com dado (`antes-depois.md`, rodada 2)
- [X] T039 Suítes: pgTAP, unidade, invariantes e RLS na base limpa; o ETL refeito sobre as migrations
- [X] T040 PR 1 com o template; CI verde (#81, sobre `fd5359c`)
- [X] T041 Rito do remoto (`plan.md`), remedindo sobre o backup do dia; conferência só de leitura (`remoto-20261021-090802.sql`; `antes-depois.md`, rodada 3)
- [X] T042 Merge (autorizado) → CI na `main` → Production (`ae4e595`, #81; CI na `main` run `39602493101` verde nos três blocos; deploy de Production `success`)

## PR 2 — as telas e o resto das RC

- [X] T050 A cópia (`public.criar_curriculo`, RC-7, RC-2), com o porteiro provado com sessão real
- [X] T051 A correção pelo trio (RC-6): recurso na matriz, trilha `correcoes_de_curriculo`, a justificativa pelo
  cabeçalho (D-26, revista), o gatilho; e as telas de edição do conteúdo passando a justificativa quando o currículo está
  em uso
- [X] T052 O arquivamento (RC-10): as funções, a tela e "mostrar currículos arquivados"; e o descarte do currículo criado por engano (D-19, D-36)
- [X] T053 O seletor de currículo na página do curso (`?curriculo=`, RC-8) e *Novo currículo*; as abas pelo selecionado
- [X] T054 O currículo em *Nova turma* (RC-4); o rótulo nas turmas do curso (todas, inclusive arquivadas) e na ficha (RC-9)
- [X] T055 O PDF por currículo (RC-11): o caminho, as policies do balde, o envio e o download
- [X] T056 Os leitores por currículo (`contracts/codigo.md`): DSA, papel, planilha, abas, ficha, avaliações, habilitações;
  a sincronização (VIRADA-1) casando no currículo da turma
- [X] T057 O retrato das telas e das páginas antes × depois (telas idênticas; nas páginas, só o que o PR 2 acrescenta — `antes-depois.md`, rodada 4) e o SC-004/SC-005 por clique
- [X] T058 CI verde, preview, roteiro curto e lote de dúvidas — **PARAR** (a M3 no remoto; a M4 no portão 9.4)

## PR 2 — os ajustes da conferência do PR #82 (Bernardo Villas Boas, 21/10/2026), no mesmo PR

- [X] T060 Fechar a `PEND-020-3` (custo é controle da CIAARA-11) no plano de correções
- [X] T061 A M4 corrigida antes do remoto: o porteiro da RC-6 vê o currículo na inserção só com `curso_id` (D-46), com o
  caso de pgTAP que reprova sem a correção
- [X] T062 A M5 — os regimes nomeados do currículo (A-4): colunas, FK da turma, a troca de currículo levando o regime, a
  cópia, a RC-6 nos regimes (D-38); pgTAP `146`; tipos; reversão (`reversao-pr2.sql`, a M5 primeiro)
- [X] T063 A página do curso só leitura, no vigente (A-1): sem o seletor; nenhuma ação nas abas (Disciplinas, Avaliações,
  Horários); o botão *Editar curso* pela permissão de destino (D-40)
- [X] T064 A aba *Currículo* (A-2): a lista (todos, arquivados inclusive, D-45) e a consulta só leitura de disciplinas,
  avaliações, horários e atividades do currículo escolhido (`?curriculo=N`)
- [X] T065 *Editar curso* com a seção *Currículo* (A-3, D-41): seletor, *Novo currículo*, *Descartar*, *Arquivar*, e as
  partes — dados e PDF, disciplinas e avaliações (com o arbitrado, D-43), horários, atividades e limites (D-42); as rotas
  `/cursos/[curso]/curriculos/*` saem; o arquivado só se consulta (D-44)
- [X] T066 A turma escolhe regime só entre os do currículo dela (ficha); o link *"Segue o Currículo"* abre a aba *Currículo*
- [X] T067 Testes: unidade (contrato, guardas), invariantes (RC-6 nos regimes e nos limites, com defeito deliberado),
  ponta a ponta por clique (a página só leitura, a aba *Currículo*, *Editar curso* em todas as partes, SC-004/SC-005)
- [X] T068 A prova na cópia NOVA do remoto (SC-006, rodada 6 de `antes-depois.md`): antes da M4, 24 cursos → 24 currículos e 0 turmas em currículo de
  outro curso; DSA, papel, planilha e páginas das 29 turmas idênticos — com a M4 e a M5 sob o código da `main` e sob o
  código do ramo
- [ ] T069 CI verde → rito do remoto (M4 e M5: backup citado, dry-run só com as duas, `db push`, conferência só de
  leitura) → merge → CI na `main` → Production → PR de documentação do encerramento → roteiro de Production
