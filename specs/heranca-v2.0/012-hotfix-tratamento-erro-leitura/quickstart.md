# Quickstart — Validação do Hotfix Tratamento de Erro em Leituras

## Pré-requisitos

- Implantação via `o fluxo Git → Vercel` já feita (`o histórico de deploys da Vercel`).
- Um usuário de teste com perfil `Encarregado_Curso` vinculado a **um único** curso, ou `Operador`
  com `Escopo_Curso` diferente de `Geral` — para o Passo 1 (research.md §3, forma mais realista de
  forçar um erro real de backend, via `exigirEscopoCurso_`/`exigirEscopoTurma_`).

## Passo 1 — Forçar uma falha real via escopo de RBAC (para os dois passos seguintes)

1. Logar como o usuário de escopo restrito.
2. Tentar interagir com um curso/turma **fora** do escopo desse usuário (ex.: trocar a URL/estado
   manualmente para um `idCurso` que não é o vinculado, se a interface não impedir a tentativa; ou
   usar o DevTools do navegador para chamar `gs('getPainelavaliacoesCurso', 'ID_FORA_DO_ESCOPO')`
   diretamente no console).
3. **Esperado**: o backend rejeita com um erro de escopo — é o gatilho real para os Passos 2/3.

## Passo 2 — As 10 chamadas de ação do usuário mostram `alert()` (US1, FR-001)

Repetir para pelo menos 3 das 10 funções (`data-model.md`), forçando a falha do Passo 1:

1. Clicar para expandir um cartão de curso (`renderizarDetalheCurso`) fora do escopo.
2. Trocar a turma selecionada num dropdown (`aoTrocarTurmaCurso`/`aoTrocarTurmaAvaliacao`) para uma
   fora do escopo.
3. **Esperado**: um `alert()` aparece com a mensagem de erro do backend — nunca mais uma tela que
   simplesmente não preenche nada sem explicação.

## Passo 3 — As 4 chamadas de boot mostram banner, nunca modal (US2, FR-002)

1. Recarregar a página logado como Admin (ou perfil relevante) — as 4 funções de boot disparam
   automaticamente (`data-model.md`).
2. Se possível, forçar uma delas a falhar (ex.: revogar temporariamente o `Status` do usuário de
   teste em `usuarios` durante o carregamento — cenário extremo, ou usar DevTools para simular).
3. **Esperado**: um banner amarelo dispensável (`mostrarAvisoNivel2`) aparece no container
   correspondente (`data-model.md`) — **nunca** uma janela `alert()`/`confirm()` interrompendo o
   carregamento da página (SC-002).

## Passo 4 — Nada muda no caminho de sucesso (SC-003)

1. Repetir o fluxo normal de uso de cada uma das 15 telas/ações, sem forçar nenhuma falha.
2. **Esperado**: comportamento idêntico ao de antes desta spec — mesmos dados exibidos, mesmo
   tempo de carregamento, nenhuma mudança visível quando tudo funciona.

## Fora do escopo desta validação

- Qualquer chamada de **escrita** (salvar/cadastrar/excluir) — já tinha `.catch`, não é tocada por
  este hotfix.
- Qualquer outra tela/função além das 15 listadas em `data-model.md`.
