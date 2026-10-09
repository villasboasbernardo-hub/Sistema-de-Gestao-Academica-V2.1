# Roteiro de conferência — PR 1 da planilha de contingência (spec 015)

**Quem confere:** Bernardo Villas Boas, no **preview** do PR, com uma **turma real** (`SC-002` emendado
em 09/10/2026: a suíte provou zero erro de fórmula nas turmas da semente sintética; as turmas reais são
desta conferência).
**O que já foi provado antes dela:** `medicoes.md` — a IMPRESSÃO igual ao papel do sistema em três
turmas semeadas (I-P5), o arquivo de 50 semanas recalculado sem diferença nos Excel 16 e 2007, e a
semântica das fórmulas no Google (27 de 27). O que **só a vista** confere está abaixo.

| # | Faça | Tem de acontecer |
|---|---|---|
| 1 | Entre no preview com um perfil que lança no DSA, abra **Turmas**, escolha uma turma presencial com lançamentos e clique em **Baixar planilha de contingência** na ficha da turma | O navegador baixa `DSA-contingencia-<turma>-<data de hoje>.xlsx`, e a página não muda |
| 2 | Abra a turma, clique em **Abrir o DSA** e use o mesmo botão na barra de impressão | O mesmo arquivo, com o mesmo nome |
| 3 | Abra o arquivo no **Excel**. Na aba PREENCHIMENTO, leia o topo | Título com a turma, *gerada em … por <você>*, o aviso de contingência, *"baixe de novo no início de cada semana"* e *Conferência: 0 linha(s)* |
| 4 | Ainda na PREENCHIMENTO, ache a semana corrente (a aba abre nela) e compare com o DSA do sistema da mesma semana | Cada lançamento do sistema está nos TA dele, com COD, ITEM, tópico, local, T/E, instrutor e o **código do lançamento** |
| 5 | Num TA vazio da semana, escolha **COD** e **ITEM** nas listas | Horário, tópico, local, T/E e instrutor aparecem sozinhos; a coluna Conferência fica vazia |
| 6 | Escreva por cima do **local** dessa linha; depois escolha um ITEM que não existe para outra linha | O local escrito fica; a outra linha diz *"chave não existe no catálogo"* e a Conferência do topo passa a 1 — nenhuma célula com `#REF!` ou `#N/A` |
| 7 | Vá à aba **IMPRESSÃO**. No seletor (ao lado de *Semana:*), escolha a semana corrente | A grade mostra a semana, com os horários, o almoço entre os TA dele e a aula que você lançou no passo 5 |
| 8 | Compare a IMPRESSÃO com o **Imprimir** do DSA do sistema na mesma semana | Mesmas aulas nos mesmos TA, mesmo nº do DSA, mesma CH cumprida no rodapé, mesmas técnicas na legenda, mesmas assinaturas — o bloco agrupado pela **cor**, sem célula mesclada |
| 9 | Mande imprimir a IMPRESSÃO (ou gere o PDF) | **Uma** página A4 paisagem; a letra é legível no papel |
| 10 | Escolha no seletor uma semana passada, já lançada no sistema | A grade troca inteira para aquela semana, e o rodapé mostra a CH acumulada até ela |
| 11 | Envie o mesmo arquivo para o **Google Drive** e abra como Planilhas Google; repita os passos 5, 7 e 9 | Mesmo comportamento; as listas de escolha aparecem; nenhuma célula de erro |
| 12 | Numa turma **EAD** e com um perfil que **só lê** o DSA, abra a ficha | Nenhum botão de planilha; o endereço da planilha leva ao aviso de turma EAD (EAD) ou dá *Não encontrado* (só leitura) |

⚠️ **Não se espera que a planilha volte ao sistema** (`FR-027`, *só de ida*): o que você lançar offline
nos passos 5 e 6 fica só no arquivo.

⚠️ **Os dois achados que esta conferência pode encontrar e a suíte não**: a legibilidade da letra no
papel (R-8) e o comportamento das listas de escolha no Google, que a sonda em CSV não mede.
