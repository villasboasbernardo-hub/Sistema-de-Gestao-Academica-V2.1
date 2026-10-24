# Plano — spec 024 (Bloco 9): a publicação do DSA (com rascunho) e a contagem de EAD e semipresencial

**Ramo:** `feat/BLOCO-9-publicacao-do-dsa`, na pasta nova `C:\sis11\CIAARA-11-v2.1`. **Um PR** (merge só entre semanas: o
papel muda). **Banco:** M1 `20261023161631` (acrescenta) e M2 `20261023161634` (o portão autorizado).

## Constituição

| Regra | Como |
|---|---|
| 1 (documento 04) | nenhuma `RN-` muda; a `RN-MAT-04` (decidir pela modalidade da turma) continua — é por ela que a EAD sai da conta |
| 3 (paridade) | novidade autorizada nominalmente (RP-0 a RP-8; item 2) |
| 4 (nada apagado) | descartar, excluir no rascunho e a sombra aplicada inativam; a trilha é só de acréscimo |
| 9 (domínio puro) | `lib/dominio/dsa/publicacao.ts`, `contagemDaTurma` em `andamento-da-turma.ts` |
| 9.4 (portão) | M2 autorizada por Bernardo (22/10/2026); prova de identidade na cópia (§4) |
| Gotcha 10 | `security_invoker` redeclarado em toda view recriada |
| Gotcha 15 | porteiros com `coalesce(app.pode(...), false)` |
| Regra de negócio fora da UI | a trava e o rascunho são do BANCO (função de escrita, gatilho de guarda, funções de salvar/publicar) |

## Desenho

1. **O rascunho mora nas próprias tabelas** (D-1): `salvo` (padrão `true`), `rascunho_de` (a sombra de um salvo) e
   `rascunho_exclui` (a sombra pede exclusão). Tudo o que existe nasce salvo.
2. **Um ponto de escrita**: `public.gravar_rascunho_do_dsa(jsonb)` (a forma de `gravar_lancamentos_em_transacao`) — toda
   escrita do DSA (`lib/acoes/dsa.ts`: lançar, atualizar/mover/editar, excluir, Estudo Individual) passa por ele.
3. **Uma guarda**: o gatilho `app.guardar_rascunho_do_dsa` — com sessão, inserção nasce rascunho e o salvo só muda pelo
   Salvar (`app.dsa_salvando`). Fora: script sem sessão, a parada do dia e a atividade de todas as turmas (D-2, D-14).
4. **A grade da tela** lê `vw_ocupacao_do_dsa` (o salvo com o rascunho por cima); **tudo o mais** lê `vw_ocupacao_ta` e as
   somas, filtradas por `salvo` na M2. A leitura do DSA ganha `comRascunho` (só a tela liga).
5. **A trilha** `dsa_eventos_da_semana` (salvo, descartado, publicado, alteração iniciada, alteração publicada); a
   situação é derivada (`situacaoDaSemana`). A trava é do banco (`app.semana_do_dsa_travada`, `recusar_se_semana_travada`).
6. **O retrato** é o documento SALVO (`app/print/dsa/retrato.ts`), com o `hoje` com que foi montado; a impressão de semana
   publicada imprime o retrato (o vigente ou o de `?versao=N`); a não publicada imprime com PRÉVIA.
7. **RP-4**: o documento de hoje (mesmo `hoje`) × o retrato, pelo conteúdo da semana (sem o quadro acumulado, D-8).
8. **Item 2**: `andamentoDaTurma` devolve `controle_da_dead` para EAD; `contagemDaTurma` troca prevista, executada e
   janela da semipresencial marcada; `lerContagemPresencial` alimenta os quatro leitores; a marca em *Editar disciplina*.

## Leitores do RP-8 (inventário de 23/10/2026)

- **Banco** (M2): `vw_ocupacao_ta`, `vw_carga_horaria_turma`, `vw_disciplinas_execucao`, `vw_chd_por_fato` (e
  `chd_da_turma_ate`, `execucao_por_disciplina_ate`), `vw_unidades_ensino_execucao`, `vw_instrutor_carga_anual`,
  `vw_avaliacoes_situacao`, `app.lancamentos_que_travam_vigencia`, `app.turma_tem_lancamento_no_dsa`, `app.fn_status_vista`
  e as três conferências de data das sessões. Guarda: pgTAP `148` (lista nominal com motivo).
- **TypeScript**: DSA (leitura da tela, impressão, planilha), aba Avaliações, avisos, lista de atividades. Guarda:
  `tests/unidade/rascunho-so-o-salvo-conta.test.ts`.

## Validação

`roteiro-de-conferencia.md`; e2e `tests/e2e/publicacao-do-dsa.spec.ts`; pgTAP `148`; RLS
`tests/invariantes/rls/publicacao-do-dsa.test.ts`; a prova do portão em `antes-depois.md`.
