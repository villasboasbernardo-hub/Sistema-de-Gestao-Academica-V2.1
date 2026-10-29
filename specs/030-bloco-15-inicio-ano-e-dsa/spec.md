# Spec 030 — Bloco 15: Início (tela cheia, setas), ano no cabeçalho e ajustes do DSA

**Pedido:** Bernardo Villas Boas, 29/10/2026, pelo `/corrigir` — *"Bloco 15 — Início (tela cheia, setas), ano no
cabeçalho e ajustes do DSA. Rodar sozinho até o PR."* Onze itens, em três grupos (Início e cabeçalho; módulo DSA;
pendências). **Ramo:** `fix/BLOCO-15-inicio-ano-e-dsa`, a partir da `main` `df29101` (Bloco 14 mesclado). **Regras
emendadas:** **RT-1** e **RT-6** em [`docs/correcoes/padroes-de-tela.md`](../../docs/correcoes/padroes-de-tela.md); **RD-2**
e **RD-6** em [`docs/correcoes/regras-do-dsa-lancamento.md`](../../docs/correcoes/regras-do-dsa-lancamento.md). **Banco:**
nenhuma migration (§6). ⚠️ **O papel do DSA muda** para as semanas sem Estudo Individual lançado (item 4: a linha fixa de
EI sai): o merge espera a virada de semana.

## 1. O problema, em uma frase

O papel do DSA no Início não se amplia e as setas são botões de texto; cada módulo tem o próprio seletor de ano; o
Estudo Individual excluído "volta sozinho"; o cartão do lançamento tem botões escritos e separados; as versões
publicadas são uma lista; a marca PRÉVIA cobre o texto; o cabeçalho do DSA repete a semana três vezes; os controles do
DSA estão espalhados em três lugares; e a situação «Atrasada» do DSA usa uma previsão de outro ano.

## 2. Paridade ou novidade (regra 3)

- **Defeito** (itens 4, 9 e 11): o EI excluído reaparece (a linha fixa sintética do papel), a semana aparece três vezes
  no cabeçalho, e a «Atrasada» usa a previsão de um ano só (`PEND-029-1`).
- **Padrão de tela pedido nominalmente** (itens 2, 3, 6, 8 e 10): RT-1 (ícones com a dica só do verbo, numa barra só) e
  RT-6 (um ano para o sistema todo), aplicados onde ainda não estavam.
- **Novidade pedida nominalmente** (regra 3, autorização neste pedido): a tela cheia do papel (item 1) e as abas de versão
  (item 7).
- **Já estava feito** (item 5): editar, salvar e gerar prévia antes da 1ª publicação, sem ALT — provado por caso novo.
- **Contenção de escopo (regra 2):** tudo é da CIAARA-11 — Início, cabeçalho, DSA.
- **Documento 04:** nenhuma regra `RN-` muda.

## 3. A triagem — o pedido, item a item, medido na `main` `df29101`

Medido no código e **no remoto, só leitura** (`python -m scripts.provas.medir_no_remoto`, consultas em
`scratchpad/b15/triagem_ei.sql` e `triagem_atrasada.sql`, 29/10/2026).

| # | Item | Tipo | Medido |
|---|---|---|---|
| 1 | Tela cheia do papel no Início | novo | O papel é `DocumentoDoDsa` dentro de `EscalaDoPapel` (escala pela largura e pela altura da janela, piso 0,35) num `Carrossel`. Clicar nele não faz nada; não há modo ampliado. |
| 2 | Setas (RT-1) | padrão | A semana dos DSA publicados (`EscolhaDaSemana`) tem botões **escritos** *Semana anterior · Semana seguinte · Esta semana* e o ícone de calendário; o carrossel tem *Anterior · Próximo · Pausar* **escritos, abaixo** do papel. É um componente só (`components/ciaara/carrossel.tsx`) para os dois carrosséis do Início. |
| 3 | Ano no cabeçalho (RT-6) | padrão (emenda RT-6) | `SeletorDeAno` aparece em **7 páginas**: Início, Turmas, Instrutores, Cursos, Atividades (inclusive a aba Calendário), a ficha do instrutor e a página do curso. O cabeçalho (`cabecalho-do-app.tsx`) tem o sininho, o tema e o avatar. O layout já lê o ano guardado (cookie `ciaara-ano`) para o submenu. **8** arquivos de ponta a ponta usam o seletor. |
| 4 | Excluir Estudo Individual | 🐛 defeito | **Nada relança EI ao abrir a semana** — nenhum registro é gravado. O que "volta" é a **linha fixa sintética** (`ei-<data>`, `linhaFixaDoEstudoIndividual` em `lib/dominio/dsa/impressao.ts`) que o papel e a grade desenham em todo dia útil **sem** EI lançado, marcada *"no papel, sem lançamento"*; a planilha faz o mesmo por fórmula (`slotDoEi`). Clicar nela abre *Lançar*, não o cartão — não há o que excluir. Excluir o EI lançado faz a linha fixa reaparecer no mesmo lugar. No remoto: **558** EI ativos e **538** inativos; **5** semanas publicadas (original), **4** com a linha fixa no retrato; **2** ALT publicadas, **1** com a linha fixa. |
| 5 | Editar antes de publicar, sem ALT | ✅ já estava feito | `situacaoDaSemana` (`lib/dominio/dsa/publicacao.ts`): a semana só **trava** depois de um evento de publicação; antes dela `podeSalvar` e o lançamento ficam livres; `podeGerarPrevia` vale sempre que a semana está registrada e não publicada; a prévia **não grava evento**; o ALT só nasce de `alteracao_publicada`. Nenhum caso de ponta a ponta percorria *prévia → editar → salvar → prévia → publicar*. |
| 6 | Cartão do lançamento com ícones | padrão (emenda D-3 da spec 022) | O diálogo *Lançamento* (`AcoesDoBloco.tsx`, o "cartão único" do `RF-DSA-07`) tem rodapé com **«Gravar» e «Cancelar» à esquerda e «Excluir» à direita**, separados, em texto; depois de gravar com aviso, **«Entendi»**. O título mostra `código — tópico`, sem o nome por extenso nem quem ministra. |
| 7 | Abas de versão | novo | `VersoesPublicadas.tsx` lista as publicações (data, autor, justificativa) com *Reimprimir* (`/print/dsa?versao=N`). O retrato de cada versão já é lido pela página (`lerPublicacaoDaSemana`, `eventos[].dados`). |
| 8 | Marca PRÉVIA | padrão visual | `.dsa4-previa` (`app/print/dsa/documento.css`): `z-index: 5` (**sobre** o conteúdo), `opacity: 0.35`, 96 pt inclinada. |
| 9 | Cabeçalho do DSA sem repetição | 🐛 repetição | A semana aparece em **três** lugares: a linha sob o título (*"C-Ap-HN 2026 · semana de 26/10/2026 a 31/10/2026 · 2026 · Voltar à turma"*), a navegação (*"Semana 30 de 37 · 26/10/2026 a 31/10/2026"*) e o quadro `CabecalhoDaSemana` (*Semana do curso · Período · Alunos*), que é da **tela** — o papel tem o seu. As telas sem grade (EAD, fora da etapa) repetem *Voltar à turma*. Nas páginas da turma: *Editar turma* tem *"Voltar à ficha da turma"* ao lado do título; a ficha não repete nada. |
| 10 | Barra única do DSA (RT-1) | padrão (emenda RD-6) | A navegação (*Semana anterior · Esta semana · Próxima semana*, o campo *Ir para a semana do dia* e *Abrir o sábado*) é uma linha de botões **escritos** (`NavegacaoDaSemana.tsx`); *Parar dia* é um ícone **fora** da barra, acima da grade (`ControleDeParadas.tsx`); *Lançar o Estudo Individual da semana* é um botão escrito acima da grade (`PainelDeLancamento.tsx`). A barra (`BarraDoDsa.tsx`) tem só regime, limpar, planilha, prévia e publicação. |
| 11 | `PEND-029-1` — «Atrasada» pela janela da carga | 🐛 defeito | A situação vem de `estaAtrasada` (`lib/dominio/dsa/situacao.ts`) sobre `previsao_*_efetiva` de `vw_disciplinas_execucao` (linha → disciplina → turma). No remoto, **230** linhas de disciplina por turma, **25** com previsão fora do período da turma; pelo término, a «Atrasada» cai de **37** para **18** linhas com o recorte — as **19** que mudam são todas da **CAHO 2027** (previsão de 2026, turma de 2027). Com a regra inteira de `estaAtrasada` (início **e** término, medido de novo em 29/10/2026, `scratchpad/b15/medir_atrasada.sql`): **38 → 18**, **20** mudam, todas da CAHO 2027, e nenhuma passa a atrasar. A `janelaDaCarga` (ponto único do FR-004 da spec 029) já existe em `lib/dominio/carga-semanal.ts`: **sem banco**. |

## 4. Requisitos

### FR-001 — Tela cheia do papel no Início (item 1)

1. Clicar no papel de um DSA publicado no Início, ou focá-lo e apertar `Enter` (ou `Espaço`), abre uma **sobreposição na
   janela inteira** com esse papel **ampliado ao máximo que cabe** (a escala pode passar de 1), centrado, com a legenda
   (turma · versão · publicada em).
2. Um ícone **«Sair da tela cheia»** no canto superior direito e a tecla `Esc` fecham; ao fechar, o foco volta ao papel
   de onde saiu.
3. **As setas do carrossel funcionam dentro dela**: ícones nas laterais (e `←`/`→`) trocam para o DSA anterior/seguinte,
   e o carrossel, ao fechar, mostra o último papel visto.
4. Sem pacote novo; a sobreposição prende o foco e não passa sozinha. Com um papel só, abre sem setas (D-22).

*Aceite:* em 1366×768 e 1920×1080, o papel aparece inteiro na sobreposição, maior que no carrossel.

### FR-002 — Setas (item 2, RT-1)

1. A semana dos DSA publicados: **seta à esquerda** no canto esquerdo e **seta à direita** no canto direito, e entre elas,
   **centralizadas**, as datas de início e término da semana com o **calendário junto** delas (e *Ir para esta semana*
   quando a semana mostrada não é a de hoje). Ícones com a dica só do verbo; o nome acessível continua completo.
2. O carrossel: **setas nas laterais do papel, centralizadas na vertical**, como ícones com a dica só do verbo. *Pausar*
   vira ícone e fica com o *N de M*.
3. O papel continua **cabendo inteiro na janela** em 1366×768 e 1920×1080 (`FR-008.3` da spec 029).

### FR-003 — Um ano no cabeçalho (item 3, RT-6)

1. **Um seletor de ano só**, na barra superior, junto do sininho e do tema, em **toda tela autenticada**, valendo para o
   sistema todo — o mesmo cookie `ciaara-ano` e o mesmo `?ano=` da D-24 da spec 025 (o link vence o guardado; escolher o
   ano de hoje apaga a escolha; a escolha expira na virada).
2. **Saem** os seletores das páginas: Início, Turmas, Instrutores, Cursos, Atividades (com a aba Calendário), ficha do
   instrutor e página do curso. Cada página continua mostrando só o ano escolhido.
3. A RT-6 é emendada em `padroes-de-tela.md`.

*Aceite (ponta a ponta, por clique):* trocar o ano no cabeçalho e conferir **Início, Turmas e Instrutores** no ano novo.

### FR-004 — O Estudo Individual só existe lançado (item 4)

1. **A linha fixa do EI sai** da grade, da prévia, do papel e da planilha de contingência: dia sem EI lançado não mostra
   EI. *Nada relança EI ao abrir a semana* (medido: nunca relançou; o que voltava era a linha fixa).
2. O EI lançado se **exclui pelo cartão**, como qualquer lançamento (rascunho até *Salvar minuta*), e por um ícone na
   barra, **«Remover Estudo Individual da semana»**, que exclui de uma vez todos os EI da turma na semana, pela mesma
   exclusão do cartão, em lote, com confirmação (*Descartar rascunho* desfaz).
3. EI excluído **não volta sozinho**: só pelo botão **«Lançar o Estudo Individual da semana»**, que vira ícone na barra.
4. **O retrato já publicado não muda** (reimprimir sai idêntico), e a comparação do «alterado desde a publicação» (RP-4)
   desconsidera, no retrato antigo, a linha fixa — sem isso, as semanas publicadas com ela acusariam alteração sem
   mudança de dado. A nota do rodapé sobre o Estudo Individual continua no papel (D-24).

### FR-005 — Editar antes de publicar, sem ALT (item 5) — já estava feito

1. Antes da 1ª publicação: editar, *Salvar minuta* e *Gerar prévia* quantas vezes quiser; nenhum ALT. O ALT só nasce de
   *Publicar alteração*. **Sem mudança de código**: um caso de ponta a ponta prova o percurso.

### FR-006 — O cartão do lançamento com ícones (item 6)

1. Os botões do cartão do lançamento viram **só ícones**, sem texto, **juntos no canto inferior esquerdo**: *Salvar*
   (grava a edição e o movimento), *Cancelar* e *Excluir* (que abre a confirmação, com botões escritos — RT-1). A dica é
   só o verbo; o nome acessível continua completo.
2. Depois de gravar com aviso, o *Cancelar* vira **«Fechar»** (o *Entendi* sai).
3. O título do cartão mostra a **disciplina por extenso** e **quem ministra**, quebrando a linha, sem cortar (a regra do
   nome longo do Bloco 2).

### FR-007 — Abas de versão (item 7)

1. A página do DSA tem abas **«Minuta»** (a de trabalho, editável, com o selo da situação) · **«Original»** · **«ALT 1»** ·
   **«ALT 2»**…; as de versão mostram o **papel publicado** daquela versão (o retrato), só leitura, com *Reimprimir*, a
   data, o autor e — na ALT — a justificativa.
2. Substituem a lista *Versões publicadas*. Semana nunca publicada: **só a aba Minuta**.
3. A aba escolhida fica na **URL** (`?versao=`); versão que não existe abre a Minuta com aviso (`RN-DEG-01`). A semana
   abre sempre na Minuta (D-23).

### FR-008 — A marca PRÉVIA atrás do conteúdo (item 8)

1. A marca fica **atrás** do conteúdo (camada de fundo), **mais transparente**, sem cobrir texto, legível como marca. Vale
   na tela de impressão e no papel impresso (no carrossel do Início não há prévia: ele só mostra publicado, RD-7).

### FR-009 — O cabeçalho do DSA numa linha só (item 9)

1. Sob o título, **uma linha**: o **código da turma** (link para a ficha) · **Semana N de T** · **26/10 a 31/10/2026**
   (sem a semana do curso conhecida, só código · datas — D-25).
2. **Saem**: *Voltar à turma*, o ano solto, o número de alunos, o quadro *Semana do curso / Período / Alunos* da tela e a
   linha repetida da navegação. O papel não muda.
3. O mesmo nas telas sem grade (turma EAD, semana fora da etapa presencial).
4. **Nas páginas da turma**: *Editar turma* — o código no título vira o link da ficha, e *"Voltar à ficha da turma"* sai.

### FR-010 — A barra única do DSA (item 10, RT-1, RD-6)

1. A barra de ícones do canto superior direito passa a ter, **agrupados e separados**: **navegação** (semana anterior ·
   esta semana · escolher a semana pelo calendário · semana seguinte) | **lançamento** (regime · sábado · parar dia ·
   lançar EI da semana · remover EI da semana · limpar) | **publicação** (planilha · prévia/imprimir · salvar minuta ·
   publicar · fazer alteração · salvar alteração · publicar alteração · descartar).
2. Só ícones, dica só do verbo, o destrutivo por último em cada grupo. A RD-6 é emendada.

### FR-011 — «Atrasada» pela janela da carga (item 11, `PEND-029-1`)

1. A situação «Atrasada» do DSA (tela, papel e planilha) compara a data com a **janela da carga** — a previsão recortada
   pelo período da turma, e o período inteiro quando ela não o toca (`janelaDaCarga`, D-9 da spec 029) —, e não com a
   previsão crua. A view não muda.

*Aceite:* a CAHO 2027 deixa de ter disciplina «Atrasada» em 2026.

## 5. Clarifications — adotadas por padrão, Bernardo confere no fim

### Session 2026-10-29

Cada decisão foi **adotada por padrão — Bernardo confere no fim** (fluxo `/corrigir`).

- D-1 · Q: Que número tem este bloco? → A: **Bloco 15, spec 030** (o próximo livre).
- D-2 · Q: «Tela cheia» é a do sistema operacional ou uma sobreposição? → A: **sobreposição na janela inteira** (sem a
  API de tela cheia do navegador), com o papel ampliado ao máximo que cabe, **sem teto de escala**. *Alternativa: a API
  de tela cheia, que também esconde as barras do navegador.*
- D-3 · Q: O carrossel passa sozinho com a tela cheia aberta? → A: **não** — ela prende o foco, e o carrossel pausa como
  pausa com o foco dentro; ao fechar, ele está no último papel visto.
- D-4 · Q: As setas laterais valem para os dois carrosséis do Início? → A: **sim** — é um componente só; nos cartões das
  turmas as setas também vão às laterais. *Alternativa: só no carrossel do DSA.*
- D-5 · Q: Que dica levam as setas? → A: **«Voltar»** e **«Avançar»** (o verbo); o nome acessível é o completo
  (*"Semana anterior"*, *"DSA seguinte"*). *Esta semana* leva **«Ir para esta semana»**; o calendário, **«Escolher
  semana»** (o de hoje).
- D-6 · Q: Onde fica a semana do Início? → A: **numa linha só**: a seta esquerda no canto, ao centro o título e as datas
  em formato curto (*"26/10 a 31/10/2026"*) com o calendário, a seta direita no canto — sem linha nova acima do papel.
- D-7 · Q: Escolher o ano numa página que não tem ano (o DSA, a ficha da turma)? → A: **grava a escolha** (cookie) e
  redesenha, **sem** pôr `?ano=` na URL; nas páginas com ano, como hoje (URL + cookie). O seletor fica **antes do
  sininho**, com o rótulo *Ano*.
- D-8 · Q: A lateral passa a ler o `?ano=`? → A: **não** — a `PEND-025-2` continua como está.
- D-9 · Q: Como o EI excluído deixa de voltar? → A: **a linha fixa sai** (tela, prévia, papel e planilha): o EI só existe
  lançado. *Alternativa: manter a linha fixa e marcar «sem EI» por semana numa tabela nova (migration).*
- D-10 · Q: E as semanas já publicadas com a linha fixa? → A: **o retrato não muda** (reimprimir é idêntico); a
  comparação do RP-4 passa a olhar os **campos de origem** do papel — a turma, a semana, o período, os alunos, as
  assinaturas e os **dias sem a linha fixa** —, e não mais a grade e a legenda, que derivam dos dias (era por elas que a
  linha fixa acrescentava cartão, faixa e a sigla EI) — 4 originais e 1 ALT no remoto têm a linha fixa no retrato.
  *Alternativa: deixar o aviso acusar alteração nelas.*
- D-11 · Q: Como funciona o «Remover EI da semana»? → A: como o *Limpar semana*, só com os EI: a mesma exclusão do cartão,
  em lote, rascunho (sai no *Salvar minuta* ou no *Salvar alteração*), com confirmação; *Descartar rascunho* desfaz.
- D-12 · Q: O botão do EI da semana fica onde estava? → A: **vai para a barra**, como ícone (*Lançar EI*), ao lado do
  *Remover EI*, no grupo de lançamento.
- D-13 · Q: Que cartão é o do item 6? → A: o **diálogo do lançamento** (o "cartão único" do `RF-DSA-07`), cujo rodapé
  tinha *Gravar · Cancelar … Excluir* escritos. *Alternativa: ícones no próprio cartão da grade.*
- D-14 · Q: O formulário *Lançar* (tempo vazio) também vira ícones? → A: **não** — o pedido é do cartão do lançamento; o
  rodapé de formulário segue com texto (RT-1).
- D-15 · Q: Como a aba fica na URL? → A: **`?versao=`**: vazio é a Minuta, `0` a Original, `N` a ALT N; empilha no
  histórico, como as abas da turma. A barra fica no cabeçalho em **todas** as abas; o selo vai **na aba Minuta**.
- D-16 · Q: Os avisos da publicação (RP-4 e a linha da RP-9)? → A: **acima das abas**, como hoje acima da lista.
- D-17 · Q: Quão transparente fica a PRÉVIA? → A: **opacidade 0,18** (era 0,35), mesmo tamanho e inclinação, **atrás**
  do conteúdo. *(O clarify registrou 0,15; a implementação fixou 0,18, dentro do teto de 0,2 do SC-008 — o valor que
  vale é o do `documento.css`.)*
- D-18 · Q: O formato das datas da linha única? → A: **curto quando o ano é o mesmo** (*"26/10 a 31/10/2026"*), inteiro
  quando a semana atravessa o ano (*"29/12/2025 a 03/01/2026"*) — um formatador só, em `lib/formato/data.ts`.
- D-19 · Q: O que fica do *Parar dia* fora da barra? → A: as **paradas e feriados da semana** (com *Desfazer*) continuam
  abaixo do cabeçalho; só o ícone vai para a barra.
- D-20 · Q: Quem vê a navegação da barra? → A: **todo perfil que lê o DSA**; os grupos de lançamento e publicação seguem
  as permissões de hoje.
- D-21 · Q: Onde mora o recorte da «Atrasada»? → A: em `quadrosDaSemana`, o ponto único da situação para a tela, o papel
  e a planilha, com o período da turma como entrada obrigatória; a view não muda.

*Do `/speckit-clarify` (a varredura das lacunas que a especificação deixou):*

- D-22 · Q: E a tela cheia com um papel só? → A: abre igual, **sem setas** (como o carrossel de um item só, que não as
  desenha); sem DSA publicado não há papel a abrir.
- D-23 · Q: Em que aba abre uma semana publicada? → A: **na Minuta**, sempre (o endereço sem `?versao=`); as versões se
  escolhem pela aba. A barra e as paradas valem para a semana inteira e ficam acima das abas.
- D-24 · Q: A nota *"É facultado ao aluno permanecer a bordo para Estudo Individual"* sai do papel quando a semana não
  tem EI? → A: **não** — é texto verbatim do documento oficial (`NOTA_DO_ESTUDO_INDIVIDUAL`), e o papel não muda além
  da linha fixa.
- D-25 · Q: E a linha única do cabeçalho quando a semana do curso é desconhecida (turma sem período)? → A: sai **sem** o
  pedaço *Semana N de T* — código · datas —, em vez de um travessão solto.
- D-26 · Q: O submenu da lateral acompanha a troca de ano no cabeçalho? → A: **sim**, como hoje (a escolha redesenha a
  página e o layout); só o `?ano=` do link continua sem chegar à lateral (`PEND-025-2`).

## 6. Banco

**Nenhuma migration.** Todos os itens são de tela, de TypeScript ou de CSS. O item 11 usa a função pura que já existe; o
item 4 deixa de **desenhar** uma linha que nunca foi registro.

## 7. Os casos que discriminam (DoD 8)

- **Item 4:** dia útil sem EI lançado — antes: o papel e a grade têm a linha *ESTUDO INDIVIDUAL*; depois: não têm. E
  excluir o EI lançado e salvar — antes: a linha volta no mesmo lugar; depois: o dia fica sem EI.
- **Item 4 (D-10):** um retrato publicado com a linha fixa e o mesmo dado hoje — com a linha fixa fora do papel de hoje,
  a comparação sem a normalização acusaria «alterado»; com ela, não.
- **Item 11:** disciplina da CAHO 2027 com previsão de 2026 — antes: «Atrasada»; depois: «Aguardando início».
- **Item 3:** trocar o ano no cabeçalho numa página **sem** seletor próprio (Turmas) muda o que ela mostra.
- **Item 7:** `?versao=1` numa semana com ALT 1 abre o papel da ALT 1, e não a Minuta.

## 8. Critérios de sucesso

- **SC-001**: no Início, a tela cheia abre por clique e por `Enter`, fecha por `Esc` e pelo ícone, troca de papel pelas
  setas e por `←`/`→`, e mostra o papel inteiro, maior que no carrossel, em 1366×768 e 1920×1080.
- **SC-002**: em 1366×768 e 1920×1080, o papel do carrossel cabe inteiro na janela, com as setas nas laterais,
  centradas na vertical em relação ao papel.
- **SC-003**: toda tela autenticada tem **exatamente um** seletor de ano, no cabeçalho; trocar o ano nele muda Início,
  Turmas e Instrutores.
- **SC-004**: nenhum dia sem EI lançado mostra EI na tela, na prévia, no papel ou na planilha; o EI excluído e salvo não
  volta; o ícone da barra o relança; as semanas publicadas não passam a acusar «alterado».
- **SC-005**: antes da 1ª publicação, editar → salvar → prévia → editar → salvar → prévia → publicar dá a **Original**,
  sem nenhuma ALT.
- **SC-006**: o rodapé do cartão do lançamento não tem botão com texto; os três ícones ficam juntos à esquerda.
- **SC-007**: semana não publicada tem 1 aba; com original e ALT 1, 3 abas; `?versao=` abre a aba certa.
- **SC-008**: a marca PRÉVIA fica atrás do conteúdo, com opacidade ≤ 0,2.
- **SC-009**: o cabeçalho do DSA tem a semana **uma** vez; não há *Voltar à turma* nem o quadro *Alunos* na tela.
- **SC-010**: a barra do DSA tem navegação, sábado, parar dia e os dois do EI, em três grupos, todos ícones com a dica só
  do verbo.
- **SC-011**: no remoto, nenhuma disciplina da CAHO 2027 fica «Atrasada» em 2026.

## 9. Fora de escopo / pendências

- A lateral continua lendo só o ano guardado (`PEND-025-2`, D-8).
- O formulário *Lançar* continua com botões escritos (D-14).

## 10. Verificação

`pnpm verificar` e, sem a ponta a ponta inteira (regra de 26/10/2026), pgTAP e RLS; localmente, a ponta a ponta dos
arquivos afetados com 1 processo; a suíte inteira no CI. Roteiro de conferência em `roteiro-de-conferencia.md`.

## 11. O que a verificação achou (29/10/2026)

- **A-1 · O `Suspense` do seletor de ano punha DOIS seletores no DOM** (`SC-003`). Medido por uma sonda temporária
  (descartada) contra o build local: no `load` de `/turmas`, `/instrutores?ano=2027` e `/inicio`, dois `<select>` — a
  reserva do `Suspense`, com o ano guardado, e o conteúdo, com o do `?ano=`, em pedaços de streaming separados, ocultos
  até a troca; 1,5 s depois, um. Em `/instrutores?ano=2027` a cópia da casca dizia 2026. Quem pegou foi o modo estrito do
  `bloco-10` (o caso do link com `?ano=`), no local e no CI. **Conserto:** o seletor sai do `Suspense` — toda página com
  o cabeçalho é dinâmica (o layout lê cookies), e `useSearchParams` não suspende; medido de novo, um `<select>` no
  `load` das quatro páginas. **Guarda:** contagem imediata no caso do item 3; com o `Suspense` de volta, ela reprovou com
  *"/instrutores?ano=2027: mais de um seletor de ano no carregamento — esperado 1, recebido 2"*.
- **A-2 · Aberta pelo teclado, a tela cheia pedia DOIS `Esc`.** O Radix punha o foco no ícone *Sair da tela cheia*;
  depois de uma tecla, o foco é visível e abre a dica do ícone, que é uma camada própria — o primeiro `Esc` fechava só a
  dica. Achado pelo caso da vitrine que abre o que só existe aberto (o diálogo seguia aberto depois do `Esc`).
  **Conserto:** ao abrir, o foco vai para a própria sobreposição, que também ouve `←`/`→`. **Guarda:** no caso dos
  itens 1 e 2, `Enter` no papel e um `Esc` fecham; com o foco padrão de volta, ele reprovou com *"um Esc não fechou a
  tela cheia aberta pelo teclado — esperado 0, recebido 1"*, e o da vitrine, com o diálogo cobrindo o item seguinte.
- **A-3 · A tela cheia tem dois títulos** — o do diálogo e o do papel do DSA dentro dele; o caso mira o do diálogo por
  `data-slot="titulo-da-tela-cheia"`.
- **A-4 · Escolhido o dia pelo calendário da barra, a semana nova fecha o calendário**: a seção da semana é remontada
  pela `key` de semana (a que zera a edição das assinaturas). É o que se espera de um seletor de data; o caso de
  `dsa-ver` reabre o ícone antes de cada escolha.
- **A-5 · Sem a linha fixa, a semana sem EI e sem técnica não tem legenda** no papel (`dsa-imprimir`): o «EI —» vinha da
  linha fixa.
- **A-6 · A vitrine precisa da tela cheia** (invariante I-5, `vitrine.spec.ts`): os marcadores novos do carrossel só
  existem com ela. A amostra passou a tê-la, e os que só existem com ela aberta estão em `SO_QUANDO_ABERTO`, abertos
  pelo próprio caso. Pego pelo CI do PR (run `40950731785`), não pela rodada local — o arquivo não estava na lista dos
  afetados.
