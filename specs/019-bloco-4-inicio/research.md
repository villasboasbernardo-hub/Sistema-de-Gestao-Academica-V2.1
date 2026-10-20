# Research — Bloco 4

## R-1 · Carrossel sem pacote

- **Decision**: trilho horizontal com `scroll-snap`, um passo = um item; `setInterval` só quando passa sozinho; pausa por
  `pointerenter/leave`, `focusin/focusout` e botão; `matchMedia("(prefers-reduced-motion: reduce)")`; ← → no trilho.
- **Rationale**: CSS do navegador faz o encaixe e a responsividade (quantos cabem); o JavaScript só decide quando
  andar. Atende ao padrão de carrossel da WAI-ARIA (`aria-roledescription`, rótulo "N de M", `aria-live` desligado
  enquanto gira) e à WCAG 2.2.2 (pausa).
- **Alternatives**: biblioteca de carrossel (proibida: pacote novo); trocar o item por estado (perde o "quantos cabem").

## R-2 · Quem tem DSA na semana

- **Decision**: a regra de C-8, composta de `ehEadPuro` e `etapaDaSemana` (as mesmas do DSA), mais a janela da turma e a
  exclusão de arquivada e cancelada.
- **Rationale**: o carrossel não pode anunciar DSA que o DSA não mostra, nem esconder o que ele mostra.

## R-3 · O ativo na lateral com submenu

- **Decision**: a subentrada ativa recebe `aria-current="page"`; a entrada da lista continua como é hoje
  (`entradaAtiva` por prefixo), porque os percursos medem a entrada e a cor dela. Medido em `shell.spec.ts`: as
  asserções de "um ativo só" passam por páginas de **lista**, onde nenhuma subentrada é ativa.
- **Alternatives**: rebaixar a entrada para `aria-current="true"` quando há subentrada ativa (mais correto para leitor
  de tela, mas muda o contrato de seis percursos) — fica registrado como dúvida do lote.

## R-4 · A árvore do submenu no layout

- **Decision**: duas leituras a mais no layout, em paralelo com as de hoje: cursos ativos (`id, codigo, nome_curso,
  classificacao`) e turmas (`id, codigo, turma, ano_letivo, curso_id`) com as arquivadas (`vw_turmas_arquivadas`).
- **Rationale**: o layout é servidor e conhece a origem; a casca só desenha (Princípio XI; `fronteira-casca`).
