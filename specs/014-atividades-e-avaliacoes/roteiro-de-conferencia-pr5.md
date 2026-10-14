# Roteiro de conferência — PR 5 (as avaliações nas telas)

> PR 5 (#52), **sem migration**. Tudo o que a tela lê já está no remoto desde o PR 4. Os passos 5 e 6 **gravam** no
> remoto (é a conferência do arbitrado): use uma turma **fora** de `fontes.json` e o alcance **"só esta turma"**,
> para não mexer no currículo do curso.
> ⚠️ **Não há «desfazer» do arbitrado nesta entrega** — o que se grava fica, com quem e quando. Ver a D5.3 em
> `aprovacoes-pendentes.md`.

1. Menu **Turmas** → uma turma em andamento → a ordem da ficha: cabeçalho, avisos, **Andamento**, a faixa dos cards
   (AEC, TAD, TR e **Avaliações**) e, abaixo, a barra de abas **Ficha · Avaliações**.
2. Clicar no card **Avaliações** ("N aplicadas de M previstas no currículo") → a aba **Avaliações** abre, e o endereço
   ganha `?aba=avaliacoes`. **Voltar** do navegador devolve a aba **Ficha**.
3. Na aba, abrir uma disciplina → a projeção (*"restam X TA; faltam N avaliações (Y TA) → sobram Z"*) e, por item, o
   tempo com a origem (currículo, arbitrado ou *"tempo de avaliação não definido"*) e a situação.
4. Se houver vista atrasada ou que vence em 2 dias, o bloco **Vistas de prova** aparece acima do Andamento.
5. Como **Encarregado**, numa disciplina com *"tempo de avaliação não definido"* → **Definir tempo** → aplicação 2,
   vale para **só esta turma** → **Gravar** → o item passa a mostrar o tempo e a marca de arbitrado; a CH da
   disciplina **não muda**.
6. A mesma tela como **Operador** → o quadro aparece, **sem** os botões do arbitrado.
7. Menu **Cursos** → o curso da turma → aba **Avaliações** (a terceira) → o quadro da turma escolhida na Grade, e o
   link *"abrir na ficha da turma"*. Copiar o endereço e abrir numa aba nova → a mesma vista.
8. Menu **Início** → o bloco **Vistas de prova**, com uma linha por vista atrasada ou que vence em breve; clicar numa
   linha leva à aba Avaliações da turma.
9. Menu **Disciplinas** → **C-Ap-HN** → a disciplina **I** (a HN-2101) → seção **Avaliações do currículo**: os itens do currículo com os
   tempos; como Admin, os campos para editar e **Inativar** (só leitura nesta conferência).

⚠️ No preview não há **sugestão da planilha** antes da rodada do PR 6; a confirmação é provada na ponta a ponta, com
a semente (`avaliacoes-nas-telas.spec.ts`), e o roteiro do PR 6 a confere no Obs-ME.

## Conferência de Bernardo

[pendente]
