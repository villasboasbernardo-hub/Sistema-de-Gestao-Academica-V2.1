# Regras da publicação do DSA — decisões de Bernardo Villas Boas (21, 22 e 23/10/2026)

O DSA é por **turma e semana**. É impresso e distribuído a instrutores e alunos **fora do sistema** (nenhum envio — D-USR-1).

> **Emenda de 23/10/2026** *(Bernardo Villas Boas, no `/corrigir` do Bloco 9)*: entram o **rascunho** (RP-0) e o
> **filtro do que conta** (RP-8). O texto de RP-0 e RP-8 é a leitura proposta pelo Claude e **escolhida por Bernardo**
> em 23/10/2026 (*"Use a minha leitura"*), com a resposta *"editar depois de salvar volta a ser rascunho"*. As linhas
> *Em preenchimento* e *Lançamentos registrados* do ciclo e a RP-6 foram ajustadas a ela.

## O ciclo de uma semana

| Situação | O que acontece | Como sai no papel |
|---|---|---|
| **Em preenchimento** | O operador lança, edita e exclui aulas, avaliações e atividades no DSA; tudo o que ele faz fica **guardado como rascunho** (RP-0), marcado *«não salvo»* na tela, e **não conta em nada** até ele salvar. | — |
| **Lançamentos registrados** | O botão **Salvar** (ícone, no padrão do Bloco 7) torna o rascunho da semana **registrado** de uma vez — só então ele conta — e registra que o preenchimento foi concluído (quem, quando). Isso libera a prévia. **Descartar rascunho** desfaz o que não foi salvo. | — |
| **Prévia** | **Gerar prévia** imprime o DSA com a marca **PRÉVIA** bem visível. A prévia **não é versão**, não entra no histórico como publicação e pode ser gerada quantas vezes for preciso, **desde que a semana esteja salva**. Os instrutores analisam e mandam os óbices; o operador ajusta os lançamentos **normalmente, sem justificativa** (o ajuste é rascunho de novo e pede novo Salvar). | marca PRÉVIA, ALT em branco |
| **Publicado (original)** | **Publicar** registra a versão original: quem, quando e o **retrato** do documento, para reimprimir idêntico. Daqui em diante a semana fica **travada** para edição. | sem marca, ALT em branco |
| **Alteração N** | **Fazer alteração** destrava a semana. O operador muda o que precisar (como rascunho). **Publicar alteração** exige **justificativa obrigatória**, salva, registra e publica numa só ação: ALT 1, ALT 2, ALT 3…, cada uma com quem, quando, a justificativa e o retrato. A semana volta a ficar travada. | ALT N no campo ALT |

## Regras

- **RP-0. Rascunho.** No DSA, lançamento **novo, editado ou excluído** antes de salvar nasce **RASCUNHO**: fica guardado
  (sair da tela não o perde), aparece **só na tela do DSA da turma**, marcado *«não salvo»*, e **não conta em nada** —
  CH, andamento, saldo, situação por disciplina, papel, planilha, avisos, conflito com outras turmas. Editar um
  lançamento já salvo também é rascunho: **o que conta é sempre o último Salvar** (a versão salva continua valendo até
  o próximo Salvar). **Descartar rascunho** desfaz todos os rascunhos da semana (inativa, não apaga — regra 4);
  **Salvar** torna todos registrados de uma vez e marca a semana como salva.
- **RP-1.** Antes da primeira publicação, editar é livre; depois dela, toda mudança é uma alteração numerada, com justificativa.
- **RP-2.** Alteração registrada é alteração publicada: não existe "alteração salva e não publicada" fora do modo *Fazer alteração* em andamento.
- **RP-3.** Tela do DSA: mostra a situação da semana (em preenchimento, registrado, publicado, ALT N, ou *alteração em andamento*) e o **histórico**: original e alterações, com data, autor, justificativa e **Reimprimir** de cada uma.
- **RP-4.** Se algo de fora mudar uma semana publicada (feriado ou parada pelo Calendário, sincronização da planilha), o DSA avisa *"alterado desde a publicação"* e pede uma alteração para republicar. Nunca muda a versão publicada em silêncio.
- **RP-5.** Quem salva, gera prévia, publica e altera: quem lança o DSA da turma. Scripts sem sessão (migration, ETL, sincronização VIRADA-1) não são travados.
- **RP-6.** As semanas que já existem nascem *em preenchimento* (nada publicado), então nada do que já está lançado fica travado; e **tudo o que já está lançado nasce SALVO** (RP-8).
- **RP-7.** Tabelas novas só de acréscimo (regra 4); publicação e alteração nunca se apagam.
- **RP-8. O que conta é o salvo.** Toda view e função que **soma ou cruza** lançamentos lê **só o salvo**. Tudo o que
  existe hoje nasce salvo; scripts sem sessão gravam salvo; uma guarda reprova leitura nova sem o filtro.
