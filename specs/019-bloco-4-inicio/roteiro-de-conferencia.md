# Roteiro de conferência — Bloco 4 (spec 019), no preview

Entre com a sua conta de Admin. **Nenhum passo grava no banco**, exceto o 4.5 (arquivar e desarquivar uma turma), que é
opcional e se desfaz no mesmo passo.

## 1. O Início do ano vigente (FR-001)

1. Clique em **Início** no menu. Esperado: o título *"Turmas de 2026"*, o seletor de ano com **2026** marcado e os quatro
   números (turmas, em andamento, carga executada, progresso) **só das turmas de 2026**.
2. No seletor, clique em **2027**. Esperado: o endereço ganha `?ano=2027`; aparece só a turma planejada de 2027 (no
   remoto, uma); os números mudam junto.
3. Clique em **2026**. Esperado: o `?ano=` sai do endereço e as turmas de 2026 voltam.
4. Com 2026, troque a classificação no filtro do panorama. Esperado: o ano e o recorte se combinam; *Limpar filtros* volta
   ao padrão.

## 2. Os cartões em carrossel (FR-002, FR-004)

1. Não mexa no mouse por 6 s. Esperado: o trilho anda **um cartão**; no fim, volta ao começo.
2. Passe o mouse sobre os cartões. Esperado: **para**; tire o mouse e ele volta a andar.
3. Clique em **Pausar**. Esperado: o botão vira **Continuar** e o carrossel fica parado mesmo com o mouse fora.
4. Com `Tab`, entre no carrossel (os cartões são links) e use **← e →**. Esperado: passa de cartão em cartão.
5. Cada cartão: sigla · turma, nome do curso e ano, a situação, **a barra de progresso**, `executada/prevista TA · %` e,
   abaixo, *DSA da semana →* — ou, na turma EAD, *"Turma EAD: o andamento é controlado pela Divisão de Ensino a
   Distância, em sistema próprio."*
6. Clique num cartão. Esperado: abre a página do curso, na aba **Grade**, com a turma escolhida.
7. (Opcional) No Windows, *Configurações → Acessibilidade → Efeitos visuais → Efeitos de animação* **desligado** e
   recarregue o Início. Esperado: os carrosséis **não passam sozinhos**; as setas funcionam.

## 3. Os DSA da semana (FR-003)

1. Role até **"DSA da semana — dd/mm/aaaa a dd/mm/aaaa"** (segunda a sábado desta semana). Esperado: uma manchete por
   vez, de cada turma com DSA nesta semana — no remoto, medido em 20/10/2026, **6** (as presenciais e a semipresencial em
   andamento); **nenhuma EAD pura**, nenhuma cancelada, nenhuma arquivada.
2. Cada manchete: *"Semana do curso: N de T"* (o mesmo do cabeçalho do DSA), a turma e o curso, e o resumo — por
   exemplo *"15 TA lançados em 4 dias · 2 disciplinas · 1 avaliação"*, ou *"Nada lançado nesta semana ainda"*.
3. Confira uma: clique em **Abrir o DSA →**. Esperado: o DSA da turma na semana atual, com o mesmo número de semana e os
   TA que o resumo contou.
4. Troque o ano do Início para 2027. Esperado: **as manchetes não mudam** (é a semana de hoje).

## 4. O submenu da lateral (FR-005)

1. Com a lateral **recolhida** (só ícones), clique em **Turmas**. Esperado: abre a lista, como antes; nenhuma sublista
   aparece.
2. Fixe a lateral (o botão do topo, *Fixar menu expandido*). Ao lado de **Cursos** e **Turmas** aparece uma seta. Clique na de **Turmas** →
   escolha um curso → clique numa turma (ex.: *T1 2026*). Esperado: abre a **ficha da turma**, e o item fica marcado
   (traço à esquerda e negrito).
3. Abra o **DSA** dessa turma. Esperado: o item da turma continua marcado.
4. Clique na seta de **Cursos** → uma classificação → um curso. Esperado: abre a **página do curso**, com o curso
   marcado.
5. (Opcional, **grava no banco**) Na lista de turmas, **arquive** uma turma. Esperado: ela **some do submenu** sem
   recarregar a página. **Desarquive** em seguida (*Mostrar arquivadas* → *Desarquivar*) e ela volta.
6. Recarregue numa ficha de turma. Esperado: o ramo dela já abre sozinho na lateral fixada.
