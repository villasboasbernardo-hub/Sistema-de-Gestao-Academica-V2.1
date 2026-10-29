# Roteiro de conferência — spec 030 (Bloco 15)

No preview, com a sua conta de Admin. ⚠️ **Os passos marcados com ✍️ gravam no banco remoto**, que é a fonte da verdade
dos cadastros: use uma semana **futura** de uma turma em que você possa lançar e, ao fim, *Descartar rascunho* ou
excluir pela tela o que lançou. O que é **publicado** (item 5) fica na trilha imutável — use uma semana de teste sua.
Confira nas duas janelas que o pedido cita (1366×768 e 1920×1080) onde o passo fala do papel.

## 1. Tela cheia do papel no Início (FR-001)
1. *Início* → uma semana com DSA publicado (as setas da semana, no alto).
2. Clique no papel. **Esperado:** a janela inteira com o papel **ampliado ao máximo que cabe**, a legenda no alto e o
   ícone **«Sair da tela cheia»** no canto superior direito.
3. Com 2 DSA publicados ou mais: as **setas nas laterais** e as teclas `←`/`→` trocam de papel.
4. `Esc` fecha; o ícone também. Foque o papel com `Tab` e aperte `Enter`: abre de novo — e **um** `Esc` fecha.

## 2. Setas (FR-002)
1. *Início* → **Esperado:** a seta da semana anterior no **canto esquerdo**, a da seguinte no **canto direito**, e ao centro
   *"DSA publicados da semana"*, as datas (*26/10 a 31/10/2026*) e o calendário junto delas.
2. O carrossel dos DSA: **setas nas laterais do papel, no meio da altura**; *Pausar* e *N de M* embaixo.
3. Aponte cada seta: a dica é **«Voltar»** / **«Avançar»**. O papel cabe inteiro na janela, sem rolar.

## 3. Ano no cabeçalho (FR-003)
1. Em qualquer tela: o **Ano** está no cabeçalho, ao lado do sininho e do tema; nenhuma página tem seletor próprio
   (Início, Turmas, Instrutores, Cursos, Atividades/Calendário, ficha do instrutor, página do curso).
2. *Turmas* → troque o ano no cabeçalho. **Esperado:** a lista mostra o ano novo; *Início* e *Instrutores* abrem nele.
3. Volte ao ano de hoje: a escolha some (o endereço fica sem `?ano=`).

## 4. Excluir Estudo Individual (FR-004)
1. *Turmas* → uma turma → *Abrir o DSA* → uma semana futura **sem EI lançado**. **Esperado:** a grade **não** tem cartão de
   Estudo Individual (antes havia um em todo dia útil, «no papel, sem lançamento»).
2. ✍️ Ícone **«Lançar EI»** (livro com +, na barra) → os EI aparecem no último tempo de cada dia → *Salvar minuta*.
3. ✍️ Ícone **«Remover EI»** (livro com −) → confirme → os EI saem da grade → *Salvar minuta*. Recarregue a página:
   **eles não voltam**.
4. ✍️ *Lançar EI* de novo → clique no cartão de um EI → **Excluir** → *Salvar minuta*: só aquele dia fica sem EI.

## 5. Editar antes de publicar, sem ALT (FR-005 — já estava feito)
1. ✍️ Numa semana de teste: lance uma aula → *Salvar minuta* → *Gerar prévia* (volte) → edite a aula → *Salvar minuta* →
   *Gerar prévia* de novo. **Esperado:** nada pede justificativa nem *Fazer alteração*; a prévia diz *ALT —*.
2. ✍️ *Publicar*. **Esperado:** só a **Original** (nenhuma ALT).

## 6. Cartão do lançamento (FR-006)
1. Clique num lançamento da grade. **Esperado:** no rodapé, **três ícones juntos no canto inferior esquerdo** — *Salvar*,
   *Cancelar* e *Excluir* —, sem texto; a dica é só o verbo. O título mostra a disciplina **por extenso** e quem ministra.
2. *Excluir* ainda pede confirmação, com os botões escritos.

## 7. Abas de versão (FR-007)
1. Semana **nunca publicada**: só a aba **Minuta** (com o selo da situação).
2. Na semana publicada do passo 5: **Minuta · Original** (e *ALT 1*, *ALT 2*… se houver). Clique em *Original*: o papel
   publicado, só leitura, com a data, o autor e **Reimprimir**; o endereço ganha `?versao=0`. *Voltar* do navegador volta à
   Minuta.

## 8. Marca PRÉVIA (FR-008)
1. *Gerar prévia* numa semana salva. **Esperado:** a palavra **PRÉVIA**, grande e inclinada, **mais clara** e **atrás** dos
   cartões — o texto dos cartões fica legível por cima dela. Confira também imprimindo (ou *Salvar como PDF*).

## 9. Cabeçalho do DSA sem repetição (FR-009)
1. No DSA, sob o título, **uma linha**: *C-Ap-HN 2026* (o link da ficha) · *Semana 30 de 37* · *26/10 a 31/10/2026*.
   **Esperado:** sem *Voltar à turma*, sem o ano solto, sem o quadro *Semana do curso / Período / Alunos* e sem a linha
   repetida da navegação. O papel (impressão) continua com os alunos.
2. *Editar turma*: o código no título é o link da ficha (sai *"Voltar à ficha da turma"*).

## 10. Barra única do DSA (FR-010)
1. **Esperado:** no canto superior direito, três grupos separados por um traço — **navegação** (voltar · esta semana ·
   calendário · avançar) | **lançamento** (regime · sábado · parar dia · lançar EI · remover EI · limpar) |
   **publicação** (planilha · prévia · salvar · publicar · …). Só ícones; a dica é o verbo.
2. Navegue pela barra (semana anterior, seguinte, o dia pelo calendário, esta semana) e abra/feche o **sábado**.
3. ✍️ *Parar dia* pela barra; a parada aparece abaixo do cabeçalho, com o *Desfazer*.

## 11. «Atrasada» pela janela da carga (FR-011, `PEND-029-1`)
1. *Turmas* → **CAHO 2027** → *Abrir o DSA* → uma semana de 2026 (ou a de hoje).
2. **Esperado:** nenhuma disciplina **«Atrasada»** — sem lançamento, ela está **«Aguardando início»** (antes, as que
   herdavam a previsão de 2026 saíam atrasadas — 20 no remoto, medidas em 29/10/2026).
