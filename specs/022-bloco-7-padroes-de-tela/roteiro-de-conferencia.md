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

---

# Itens 7 a 11 (conferência de 22/10/2026)

**Nenhum passo grava no banco**, exceto o ✍️ do item 9 (cancele ou desfaça a mudança).

## Item 7 — pizza com todas as fatias

28. *Cursos* → um curso com mais de 5 disciplinas → aba **Disciplinas**: a pizza de CH tem **uma fatia por
    disciplina**, sem "Outras"; cada fatia traz um **número**, e a legenda numerada (em duas colunas) diz nome, valor e
    percentual.
29. *Instrutores* → **Exibir estatísticas**: a **Escolaridade** agora é pizza (eram barras) — 3 gráficos de barras e
    6 de pizza.

## Item 8 — o nome da disciplina no gráfico

30. Na mesma pizza do passo 28: a legenda traz o **nome** da disciplina (não o código). Nome de até 19 caracteres sai
    inteiro; nome mais longo sai como o *Nome no DSA* cadastrado ou, sem ele, abreviado como no cartão do DSA.

## Item 9 — Editar curso em grupos

31. Um curso → **Editar curso**: três grupos, de cima para baixo — **Identidade do curso** (sigla, nome,
    classificação, modalidade), **Oferta e custo** (limite de turmas por ano, estrangeiros e observação, custo e
    composição), com um **Salvar** para os dois, e **Currículo e suas partes** (o seletor do currículo e as partes
    *Dados e PDF*, *Disciplinas e avaliações*, *Horários*, *Atividades e limites*).
32. Parte **Horários**: os regimes nomeados e, abaixo, a **vigência do regime de horário** do curso (*Registrar nova
    vigência*) — ela não fica mais solta entre o cadastro e o currículo. ✍️ Registrar grava; não é preciso.
33. O DSA de uma turma cujo curso não tem vigência na semana: o link *"Abra a edição do curso para registrar uma nova vigência"* leva direto a essa parte.

## Item 10 — estatísticas de Cursos

34. **Cursos**: o botão **Exibir estatísticas** (como em Instrutores). Aberto: os dois números (*Cursos regulares*,
    *Estágios de qualificação*), a pizza **Cursos por classificação** e as barras **Duração em semanas de cada curso
    e estágio**, uma por sigla, na ordem das classificações; quem não tem a duração em semanas aparece escrito
    embaixo. O gráfico de **duração média por classificação não existe mais**.

## Item 11 — aviso de carga só acima da faixa

35. **Sininho** → *Avisos* → *Instrutores*: os avisos de carga dizem **"acima da faixa do regime"**; nenhum diz
    "abaixo". Um instrutor que só tem carga abaixo da faixa não aparece com aviso de carga (pode ter outros, como o
    de NIP).
