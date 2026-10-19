# Roteiro de conferência — Bloco 2 (spec 017)

*19/10/2026. Para Bernardo Villas Boas conferir no preview, por clique. Cada bloco diz o que fazer e o que deve
aparecer. ⚠️ **O preview fala com o banco remoto, que é a fonte da verdade dos cadastros**: os passos marcados
**GRAVA** escrevem dado real. Onde dá, o roteiro manda desfazer no fim.*

⚠️ **Antes de começar:** os passos 1, 2, 3 e 5 gravam em tabelas que a reversão das migrations exige **vazias**
(`reversao.sql`). Desfazer pela tela não esvazia — o registro desfeito fica, marcado (regra 4). Se a conferência
reprovar e for preciso reverter, a decisão sobre esses registros é sua.

---

## 1. TA fora do DSA (D-COR-3) — ⚠️ GRAVA

1. Menu **Turmas** → buscar **C-Ap-FR 2026** → abrir a ficha.
2. No **Andamento**, anote a *CH executada* (`[pendente]` TA hoje).
3. Em **Disciplinas**, clique na linha de uma disciplina → no detalhe, **TA fora do DSA** → **Registrar TA fora do
   DSA**.
4. A **data** já vem com hoje. Preencha **5** TA, escolha um instrutor (opcional) e escreva uma observação
   (*"Aula dada no auditório, sem DSA"*) → **Gravar**.
5. **Esperado:** no alto da ficha, *"TA fora do DSA registrado."*; no Andamento, *CH executada* +5 e, embaixo,
   *"N TA executados · N−5 no DSA · 5 fora do DSA"*; na linha da disciplina, *"· 5 fora do DSA"* sob os executados.
6. Menu **Início** e menu **Turmas**: o progresso e o saldo da turma contam os 5.
7. **Abrir o DSA** da semana de hoje: a *Situação por disciplina* conta os 5, e **não** aparece cartão novo na grade.
8. De volta à ficha, no mesmo detalhe: **Desfazer** no registro. **Esperado:** *"Registro de TA fora do DSA
   desfeito."*; as somas voltam; o registro continua na lista, riscado e marcado *desfeito*.
9. **Negativo:** entre como **Operador** — a lista aparece, o botão *Registrar* não.

## 2. Observação em toda troca de situação (D-COR-4) — ⚠️ GRAVA

1. Ficha de uma turma **planejada** (ou de teste) → **Trocar situação** → escolha outra → escreva uma observação →
   **Gravar situação**.
2. **Esperado:** *"Situação gravada: …"*; abra **Histórico da situação** (abaixo do Andamento): a linha
   *"Anterior → Nova"*, o seu nome, a data e hora, e a observação.
3. Troque de volta **sem** observação: a segunda linha aparece, sem observação.
4. Entre como **Operador** e abra a mesma ficha: o histórico aparece, e o autor sai como *"outra conta"* (C-22: quem
   não lê o cadastro de contas não vê o nome).

## 3. Arquivar a turma (D-COR-5) — ⚠️ GRAVA

⚠️ **Arquivar no preview é dado real, e entra na contagem que o desenho da M4 precisa** (passo 0 do plano da M4).
Use uma turma que possa ser arquivada de verdade, ou desarquive no fim (passo 7).

1. Ficha de uma turma **ativa** → **Arquivar turma**. **Esperado:** o diálogo avisa *"A turma não está concluída.
   Arquivada, ela sai das listas e ninguém grava nela até o Administrador desarquivar."* → observação → **Arquivar**.
2. **Esperado na ficha:** *"Turma arquivada."* e, no topo, *"Turma arquivada em DD/MM/AAAA por … — somente leitura.
   Só o Administrador desarquiva."*; a situação **não** mudou; sumiram *Trocar situação*, *Editar turma*, *Registrar
   TA fora do DSA*, a edição de período e de instrutores, e *juntar como sessão* na aba Avaliações.
3. Menu **Turmas**: a turma **sumiu**. **Filtros** → *Arquivadas* → **Mostrar arquivadas**: ela volta, com o selo
   **Arquivada** ao lado da situação.
4. Menu **Início**, a aba **Grade** do curso (e a turma que ela pré-seleciona), *"Turmas com teto excedido"*, o filtro
   de turma de **Atividades** e a cascata de **Disciplinas**: a turma **não** aparece. Na ficha de um instrutor dela e
   em **Administração → Salas**, continua (é histórico).
5. **Abrir o DSA** da arquivada: o aviso no topo, **nenhum** formulário de lançar, e **Imprimir** e **Baixar planilha
   de contingência** funcionando.
6. Como **Encarregado**: não há *Desarquivar*.
7. Como **Admin**: **Desarquivar** → confirmar. **Esperado:** *"Turma desarquivada."*; a turma volta às listas; o
   histórico mostra *Arquivada* e *Desarquivada*.

## 4. O painel de turmas

1. Menu **Turmas**. **Esperado no alto:** cinco números — *Total*, *Em andamento*, *Concluídas*, *Canceladas*,
   *Iniciando em até 30 dias* — e o quadro *"O que falta nas turmas"* com a contagem por tipo.
   Medido no remoto em `[pendente]`: `[pendente]`.
2. **Exibir avisos**: *Sem janela de datas*, *Disciplina sem instrutor* (*"N disciplinas"*) e *Conflito no DSA desta
   semana* (*"com <turma>"*, *"com outra turma"* ou *"dentro da própria turma"*). Clique numa turma do aviso → a ficha
   dela.
3. **Filtros** → curso: os cinco números e os avisos passam a ser só desse curso.

## 5. O nome da disciplina no cartão do DSA — ⚠️ GRAVA (passo 2)

1. **Abrir o DSA** de uma semana do **C-Ap-FR 2026** com aula de *Equipamentos e Sistemas Eletrônicos de Auxílios à
   Navegação* → **Imprimir**. **Esperado:** o nome do cartão numa linha (abreviado: *EQUI. SIST. ELET. …*), o
   tópico cede, e o **instrutor inteiro dentro do cartão**; o quadro de CH com o nome inteiro; uma página. A lista dos
   119 nomes que passam do limite, com a abreviação de cada um, está em `nomes-acima-do-limite.md` — os 38 com
   reticências são os candidatos a *Nome no DSA*.
2. Menu **Disciplinas** → curso **C-Ap-FR** → a disciplina → **Editar**: os campos *Técnica de ensino* e *Local
   padrão* já vêm **preenchidos** com o gravado (antes vinham vazios e a gravação os apagava). Preencha **Nome no
   DSA** (até **19** caracteres); a prévia *"No cartão: …"* acompanha → **Salvar**.
3. De volta ao DSA da semana: o cartão (tela e papel) com o nome do DSA; **Baixar planilha de contingência**: o
   cartão da planilha também; o quadro de CH com o nome inteiro.

## 6. A ordem do quadro de CH

1. **Imprimir** o DSA de uma semana com disciplinas IV, V e IX (ou outras de romano com valor fora da ordem
   alfabética). **Esperado:** IV, V, IX — pelo valor do romano —, no papel e no rodapé da planilha.

## 7. O que conferir no banco depois (só leitura, eu faço)

- `ta_fora_do_dsa`, `turma_trocas_de_situacao` e `turma_arquivamentos` com as linhas dos passos acima, com o autor.
- A contagem de turmas arquivadas no remoto, para o desenho da M4.
