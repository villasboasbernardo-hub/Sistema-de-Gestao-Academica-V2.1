# Roteiro de conferência — PR 1 da spec 016 (tela)

> Conferência por clique no **preview** do ramo `fix/BLOCO-1-correcoes-de-tela`.
> Preview: **[pendente — link do deploy do PR]** · commit servido: **[pendente]**
>
> ⚠️ O preview fala com o banco remoto, que é a fonte da verdade dos cadastros. **Os passos 6 e 7 gravam**
> (uma situação de turma e, se quiser, um campo de instrutor): escolha uma turma e um instrutor de teste, ou
> desfaça a troca no fim.
>
> Este PR **não tem migration**: nada muda no banco além do que você gravar pela tela.

## 1 · Faixa Beta (FR-001)

1. Abra a tela de entrada (sem login).
2. **Esperado:** uma faixa no topo, numa linha, com *"Sistema privado – Versão Beta – Esta é uma versão de
   testes do Sistema de Gestão Acadêmica · pré-visualização"*. Ela não tem botão de fechar.
3. Entre no sistema e role uma tela longa (*Turmas*, por exemplo).
4. **Esperado:** a faixa continua no topo, e a lateral do menu começa **abaixo** dela, sem ficar escondida.

## 2 · Item ativo do menu (FR-002)

1. Clique em *Turmas* no menu.
2. **Esperado:** o item *Turmas* aparece em **azul cheio, com texto branco**, e se distingue dos outros sem
   esforço.
3. Troque para o tema noturno (botão *Noturno*, no cabeçalho) e repita.
4. **Esperado:** o mesmo destaque, legível, no tema noturno.

## 3 · Ver a senha (FR-003)

1. Saia do sistema. Na tela de entrada, digite qualquer coisa na senha e clique no **olho**.
2. **Esperado:** a senha aparece; clicar de novo a esconde. Clicar no olho **não** tenta entrar.
3. Entre, abra o avatar → *Meu perfil* → *Trocar a minha senha*.
4. **Esperado:** os dois campos (senha e confirmação) têm o olho. *(No primeiro acesso de uma conta nova a
   tela é a mesma.)*

## 4 · Filtros recolhidos com o número (FR-004)

1. Menu *Instrutores*.
2. **Esperado:** o painel de filtros está **fechado**, e o botão diz só *"Filtros"*, sem número.
3. Abra-o, escolha uma OM e uma Categoria.
4. **Esperado:** o botão passa a mostrar **2**. *Limpar filtros* volta a tela ao padrão e o número some.
5. Repita em *Cursos*, *Turmas*, *Atividades* e *Disciplinas* (depois de escolher o curso).
6. **Esperado:** em todas, fechado ao abrir e **sem número com a tela limpa** — inclusive em *Cursos*, onde
   *"Em oferta"* é o padrão e não conta como filtro.

## 5 · Página do curso (FR-006)

1. Menu *Cursos* → clique num curso.
2. **Esperado:** abre na aba **Sobre o Curso**, a primeira; a ordem é *Sobre o Curso · Grade · Avaliações*.
3. **Esperado:** no topo, uma barra só com **Editar curso · Desativar curso · Nova turma**, os três do
   mesmo tamanho, e *Desativar* em vermelho (ação destrutiva).
4. Clique em *Nova turma*.
5. **Esperado:** o formulário de turma nova, com o campo *Situação*.
6. Menu *Início* → clique no cartão de uma turma.
7. **Esperado:** a página do curso abre na aba **Grade**, já com a turma selecionada.

## 6 · Disciplinas: unidades em tabela e pizza (FR-007, FR-010.3)

1. Menu *Disciplinas* → escolha um curso → clique numa disciplina que tenha unidades de ensino.
2. **Esperado:** as UEs aparecem numa **tabela** (UE, Tópico, Tempos, Situação), **sem nenhum campo
   aberto**; cada linha tem *Editar*. *Acrescentar unidade* é um botão.
3. Clique em *Editar* numa UE.
4. **Esperado:** só aquela linha abre os campos, com *Gravar* e *Cancelar*. *(Se gravar, a linha volta à
   leitura com o valor novo.)*
5. Na mesma disciplina, veja *Avaliações do currículo*.
6. **Esperado:** em leitura, com *Editar* por item e *Acrescentar avaliação* como botão.
7. No topo da tela, o gráfico da carga horária.
8. **Esperado:** um gráfico de **pizza** com o percentual escrito. Num curso com **seis ou mais**
   disciplinas, as 4 maiores e uma fatia **"Outras (N)"**, e abaixo a linha *"Em Outras:"* nomeando cada uma.

## 7 · Ficha do instrutor (FR-010.1, FR-010.2)

1. Menu *Instrutores* → clique num instrutor.
2. **Esperado:** a ficha abre **em leitura**, sem nenhum campo editável; no topo, a barra **Editar
   instrutor · Desativar instrutor · Excluir instrutor**.
3. Clique em *Editar instrutor*.
4. **Esperado:** o formulário abre no fim da ficha (a tela rola até ele), com *Gravar alterações* no rodapé —
   e **sem** Desativar nem Excluir ali.

## 8 · Trocar a situação da turma (FR-015)

1. Menu *Turmas* → clique numa turma de teste.
2. **Esperado:** ao lado do selo de *Situação*, no cabeçalho, o botão **Trocar situação**.
3. Clique nele, escolha outra situação e *Gravar situação*.
4. **Esperado:** a mensagem *"Situação gravada: …"* logo abaixo do cabeçalho, e o selo já com a nova.
5. Recarregue a página (F5).
6. **Esperado:** o selo continua com a nova situação.
7. Abra *Editar turma*.
8. **Esperado:** o formulário **não** tem mais o campo *Situação*. Grave qualquer alteração: a ficha volta
   com *"Alterações da turma gravadas."*
9. *(Desfaça a troca da situação, se a turma não for de teste.)*
