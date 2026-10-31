# Regras da publicação do DSA — decisões de Bernardo Villas Boas (21, 22, 23, 28 e 29/10/2026)

O DSA é por **turma e semana**. É impresso e distribuído a instrutores e alunos **fora do sistema** (nenhum envio — D-USR-1).

> **Emenda de 23/10/2026** *(Bernardo Villas Boas, no `/corrigir` do Bloco 9)*: entram o **rascunho** (RP-0) e o
> **filtro do que conta** (RP-8). O texto de RP-0 e RP-8 é a leitura proposta pelo Claude e **escolhida por Bernardo**
> em 23/10/2026 (*"Use a minha leitura"*), com a resposta *"editar depois de salvar volta a ser rascunho"*. As linhas
> *Em preenchimento* e *Lançamentos registrados* do ciclo e a RP-6 foram ajustadas a ela.

> **Emenda de 28/10/2026** *(pedido de Bernardo Villas Boas no `/corrigir` do Bloco 14, spec 029, `FR-003`)*: entra
> o **Salvar alteração** (RP-9). A linha *Alteração N* do ciclo foi ajustada a ela; RP-0 a RP-8 não mudam. Os detalhes
> que o pedido não fixou — o selo com rascunho novo (D-8), o botão sem rascunho (D-23), o evento da trilha (D-24), a
> linha de situação e a planilha (D-25) e o desfazer (D-29) — são decisões da spec 029 **adotadas por padrão** no
> `/corrigir` e conferidas por Bernardo no fim do bloco.

> **Emenda de 29/10/2026** *(pedido de Bernardo Villas Boas no `/corrigir` do Bloco 15, spec 030, `FR-007`)*: o
> histórico da RP-3 vira **abas** (*Minuta · Original · ALT N*), cada versão com o seu papel. RP-0 a RP-9 não mudam.

## O ciclo de uma semana

| Situação | O que acontece | Como sai no papel |
|---|---|---|
| **Em preenchimento** | O operador lança, edita e exclui aulas, avaliações e atividades no DSA; tudo o que ele faz fica **guardado como rascunho** (RP-0), marcado *«não salvo»* na tela, e **não conta em nada** até ele salvar. | — |
| **Lançamentos registrados** | O botão **Salvar** (ícone, no padrão do Bloco 7) torna o rascunho da semana **registrado** de uma vez — só então ele conta — e registra que o preenchimento foi concluído (quem, quando). Isso libera a prévia. **Descartar rascunho** desfaz o que não foi salvo. | — |
| **Prévia** | **Gerar prévia** imprime o DSA com a marca **PRÉVIA** bem visível. A prévia **não é versão**, não entra no histórico como publicação e pode ser gerada quantas vezes for preciso, **desde que a semana esteja salva**. Os instrutores analisam e mandam os óbices; o operador ajusta os lançamentos **normalmente, sem justificativa** (o ajuste é rascunho de novo e pede novo Salvar). | marca PRÉVIA, ALT em branco |
| **Publicado (original)** | **Publicar** registra a versão original: quem, quando e o **retrato** do documento, para reimprimir idêntico. Daqui em diante a semana fica **travada** para edição. | sem marca, ALT em branco |
| **Alteração N** | **Fazer alteração** destrava a semana. O operador muda o que precisar (como rascunho) e pode **Salvar alteração** quantas vezes precisar (RP-9): o salvo passa a contar, e o papel oficial continua o da última versão publicada. **Publicar alteração** exige **justificativa obrigatória**, salva o que ainda for rascunho, registra e publica: ALT 1, ALT 2, ALT 3…, cada uma com quem, quando, a justificativa e o retrato. A semana volta a ficar travada. ⚠️ *(Emenda de 28/10/2026, RP-9. Antes: "O operador muda o que precisar (como rascunho). **Publicar alteração** exige **justificativa obrigatória**, salva, registra e publica numa só ação". E a "só ação" nunca foi atômica — lido em `lib/acoes/publicacao-do-dsa.ts` em 28/10/2026: `publicarSemanaDoDsa` salva, monta o retrato e publica em **três** chamadas, sem transação, e uma falha depois do salvar já deixava a alteração **salva e não publicada**, mostrada só como *«Em alteração»*. A RP-9 torna esse estado intencional e visível.)* | ALT N no campo ALT; a alteração salva **não** chega ao papel antes de publicada |

## Regras

- **RP-0. Rascunho.** No DSA, lançamento **novo, editado ou excluído** antes de salvar nasce **RASCUNHO**: fica guardado
  (sair da tela não o perde), aparece **só na tela do DSA da turma**, marcado *«não salvo»*, e **não conta em nada** —
  CH, andamento, saldo, situação por disciplina, papel, planilha, avisos, conflito com outras turmas. Editar um
  lançamento já salvo também é rascunho: **o que conta é sempre o último Salvar** (a versão salva continua valendo até
  o próximo Salvar). **Descartar rascunho** desfaz todos os rascunhos da semana (inativa, não apaga — regra 4);
  **Salvar** torna todos registrados de uma vez e marca a semana como salva.
- **RP-1.** Antes da primeira publicação, editar é livre; depois dela, toda mudança é uma alteração numerada, com justificativa.
  ⚠️ **Emenda de 30/10/2026** *(pedido de Bernardo Villas Boas no `/corrigir` do Bloco 16, spec 031, `FR-007`)*: *"Campo ALT do papel: a primeira versão publicada mostra 'ORIGINAL'; depois 'ALT 1', 'ALT 2'… A prévia continua com 'PRÉVIA'. Vale no Reimprimir das versões antigas e no carrossel do Início."* O campo *Alteração* do papel diz **ORIGINAL** na versão 0, **ALT N** na alteração N e **PRÉVIA** na prévia (D-13 da spec 031) — por `rotuloDoAlt`, o ponto único da impressão, do *Reimprimir*, das abas de versão e do carrossel. O número não fica no retrato, então as versões antigas mudam o campo sem que o retrato mude. Até ali, *"ALT —"* na original e na prévia.
- **RP-2.** Alteração registrada é alteração publicada: não existe "alteração salva e não publicada" fora do modo *Fazer alteração* em andamento.
- **RP-3.** Tela do DSA: mostra a situação da semana (em preenchimento, registrado, publicado, ALT N, ou *alteração em andamento*) e o **histórico**: original e alterações, com data, autor, justificativa e **Reimprimir** de cada uma.
  ⚠️ **Emenda de 29/10/2026** *(pedido de Bernardo Villas Boas no `/corrigir` do Bloco 15, spec 030, `FR-007`)*: o
  histórico vira **abas** — **Minuta** (a de trabalho, editável, com o selo da situação) · **Original** · **ALT 1** ·
  **ALT 2**… —, e cada aba de versão mostra o **papel publicado** daquela versão (o retrato), só leitura, com a data, o
  autor, a justificativa (na ALT) e *Reimprimir*. Semana nunca publicada: só a aba Minuta. A aba fica na URL
  (`?versao=`), e a semana abre sempre na Minuta (D-23 da spec 030).
- **RP-4.** Se algo de fora mudar uma semana publicada (feriado ou parada pelo Calendário, sincronização da planilha), o DSA avisa *"alterado desde a publicação"* e pede uma alteração para republicar. Nunca muda a versão publicada em silêncio.
- **RP-5.** Quem salva, gera prévia, publica e altera: quem lança o DSA da turma. Scripts sem sessão (migration, ETL, sincronização VIRADA-1) não são travados.
- **RP-6.** As semanas que já existem nascem *em preenchimento* (nada publicado), então nada do que já está lançado fica travado; e **tudo o que já está lançado nasce SALVO** (RP-8).
- **RP-7.** Tabelas novas só de acréscimo (regra 4); publicação e alteração nunca se apagam.
- **RP-8. O que conta é o salvo.** Toda view e função que **soma ou cruza** lançamentos lê **só o salvo**. Tudo o que
  existe hoje nasce salvo; scripts sem sessão gravam salvo; uma guarda reprova leitura nova sem o filtro.
- **RP-9. Salvar alteração.** *(Pedido de Bernardo Villas Boas, 28/10/2026 — Bloco 14, spec 029.)* Na semana **em
  alteração** (depois de *Fazer alteração*), a barra mostra **Salvar alteração** logo **antes** de *Publicar
  alteração*. Ele registra os rascunhos **como o Salvar** (RP-0): o que foi salvo **passa a contar** — CH, andamento,
  saldo, situação por disciplina, avisos, conflito com outras turmas (RP-8) —, e a alteração pode ser retomada depois
  (sair da tela não a perde). O **papel oficial continua sendo a última versão publicada** até *Publicar alteração*:
  o carrossel do Início (RD-7), o *Imprimir*/*Reimprimir* e o histórico **não mudam**, porque leem só as publicações e
  o retrato delas. O selo é **«Em alteração · salva»** quando houve um salvar nesta alteração **e não há rascunho
  novo**; com rascunho novo, volta a *«Em alteração»*, com o contador *N não salvos* (D-8). **Descartar rascunho**
  volta ao **último salvo** — o da alteração, não o publicado. *Publicar alteração* continua exigindo a justificativa
  e publica o salvo mais os rascunhos, como ALT N. É o caso que a RP-2 já admite: alteração salva e não publicada
  **só dentro** do modo *Fazer alteração*. Os detalhes (decisões da spec 029):
  - o botão aparece **sempre** que a semana está em alteração, mesmo sem rascunho, como o *Salvar minuta* (D-23);
  - a trilha grava o evento `salvo`, o mesmo do *Salvar minuta* — a posição dele depois de `alteracao_iniciada` já
    distingue o caso, e nenhum leitor da trilha muda (D-24);
  - a tela diz, junto das versões publicadas: *"Alteração salva: já conta na CH e no andamento; o papel publicado
    continua valendo até «Publicar alteração»."* — o aviso da RP-4 vale só para a semana travada, e é esta linha que
    diz o descompasso entre a CH e o papel (D-25);
  - a **planilha de contingência lê o salvo**, não o retrato: ela é instrumento de trabalho, não o papel oficial, e
    por isso já traz a alteração salva e ainda não publicada (D-25);
  - **não há "cancelar alteração salva"**: *Descartar* volta ao último salvo, como pede a regra; para voltar ao
    conteúdo publicado, edita-se e salva-se de novo, ou publica-se a ALT. Um *Cancelar alteração* que restaurasse o
    publicado mexeria em salvos já aplicados (D-29).
