# Roteiro de conferência — Bloco 7 (spec 022), PR #84

Entrar no **preview do ramo** `feat/BLOCO-7-padroes-de-tela` com a conta de Admin. **Nenhum passo deste roteiro grava
no banco**, exceto os marcados com ✍️ — e todos os ✍️ podem ser cancelados na janela antes de salvar.

## Item 1 — botões de ícone

1. Abrir **Cursos**: no alto, à direita, o ícone **+** (*Novo curso*). Passar o mouse: a dica diz *Novo curso*.
   Esperado: nenhum botão de ação escrito no alto das páginas; todos os ícones à direita.
2. Abrir um curso: os ícones do alto (*Editar curso*, *Desativar curso*…) com dica. Clicar em *Desativar curso*: na
   janela de confirmação, os botões **continuam escritos** (*Cancelar* e o da ação). **Cancelar.**
3. No alto da tela, o tema: três ícones (sol, lua, tela). Clicar em cada um: a aparência muda e o ícone fica marcado.
4. **Administração → Usuários**: cada linha com quatro ícones (*Editar*, *Redefinir senha*, *Desativar*, *Excluir*).

## Item 2 — formulários em janela ou página própria

5. **Editar curso** → **Disciplinas e avaliações** → abrir uma linha: o detalhe **sem campo nenhum**, com o lápis
   *Editar disciplina*. Clicar: abre a **página da disciplina**.
6. Na página da disciplina, o lápis de uma **UE**: abre uma **janela** com os três campos. **Cancelar.** ✍️ (salvar
   grava a UE)
7. Na mesma página, o ícone *Acrescentar avaliação* das avaliações do currículo: abre uma janela. **Cancelar.**
8. Voltar a *Editar curso* → *Disciplinas e avaliações* → ícone **+** (*Nova disciplina*): abre a **página do
   cadastro**. Voltar sem salvar.
9. Ficha de uma turma → seção **Disciplinas** → lápis do **período** ou dos **instrutores**: abre janela. **Cancelar.**
10. O DSA de uma turma → *Parar dia*: abre janela. **Cancelar.**
11. **Meu perfil** → lápis do nome: janela com *Gravar nome*. **Cancelar.**
    Esperado em todas: **nenhuma página de leitura com campo aberto**.

## Item 3 — ordem por classificação

12. **Cursos**: Regulares → Expeditos → Especiais → Estágios de Qualificação → Aperfeiçoamento Avançado → as demais;
    dentro de cada grupo, pela sigla (*CAHO* antes de *C-Ap-FR*).
13. **Turmas**: a mesma ordem dos cursos; dentro do curso, o ano mais recente primeiro.
14. **Início** (os cartões) e o **submenu** da lateral (*Cursos* e *Turmas*): a mesma ordem.

## Item 4 — sininho de avisos

15. No alto da tela, o **sininho** com o número de avisos, **pulsando** de leve.
16. Clicar: abre **Avisos**, agrupado em *Cursos*, *Turmas*, *Avaliações* e *Instrutores*. Clicar no link de um aviso:
    leva a onde se resolve (*Editar curso*, a ficha da turma, a aba *Avaliações*, o DSA, a ficha do instrutor).
17. Voltar a qualquer página: o sininho **parou de pulsar** (o número continua).
18. Conferir que os quadros saíram: a página do curso, o Início, `/turmas`, a ficha da turma, `/instrutores` e a ficha
    do instrutor **sem quadro de avisos**. A tabela da §6 da spec diz onde cada aviso foi parar.
19. (Opcional) No Windows, ligar *Efeitos de animação: desativado*: o sininho não pulsa.

## Item 5 — a página do curso

20. Abrir um curso: abas **Sobre o Curso · Turmas · Disciplinas · Avaliações · Atividades · Horários · Currículo**.
21. *Sobre o Curso*: só informações gerais (sem a grade e sem as avaliações).
22. *Turmas*: as turmas do curso, com *Nova turma*.
23. *Avaliações*: no topo, as regras (caráter e fórmula da MF) que saíram de *Sobre*.
24. *Horários*: os regimes, **sem vigências**, e o lápis que leva a *Editar curso* → *Horários*.
25. Um endereço antigo com `?aba=grade` abre a aba *Turmas*.

## Item 6 — cores do DSA

26. O DSA de uma turma com lançamentos: aula, atividade e Estudo Individual em **azul claro**; avaliação em **verde**;
    conflito em **amarelo**; feriado e dia parado em **lilás**. O texto de cada cartão continua.
27. **Imprimir**: o papel sai **igual** ao de antes (sem cor nova).
