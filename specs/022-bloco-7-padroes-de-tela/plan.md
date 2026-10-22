# Plan — Spec 022, Bloco 7: padrões de tela

**Sem banco.** Nenhuma migration, nenhum tipo regenerado, nenhum privilégio. Tudo é código de tela, um componente novo
de cliente por padrão, uma rota de página e uma rota de dados (só leitura, com a sessão — a RLS recorta).

## Constituição
- **Domínio puro:** a ordem (FR-003) e o agrupamento/“não visto” dos avisos (FR-004) em `lib/dominio/`, sem I/O.
- **Nenhuma regra de negócio só na UI:** os avisos são os mesmos predicados de hoje (`avisosDoCurso`,
  `avisosDaTurma`, `painelDeTurmas`, `tetosExcedidos`, `montarPanorama`/`emAtraso`, `alertasDeVista`,
  `avisosDoCadastro`, `alertaForaDaFaixa`, `alertaSemCapacitacao`) — muda **onde** aparecem.
- **URL dona do estado:** a parte de *Editar curso* e a aba do curso seguem no contrato; *visto* é preferência do
  navegador (`localStorage`), como a lateral fixada (D-NAV-2 da spec 012) — exceção declarada.
- **Só tokens existentes:** `planejado`, `executado`, `atrasado`, `conformidade` (D-13). Nenhum token novo.

## 1. Botão de ícone (FR-001)
- `components/ciaara/botao-de-icone.tsx` (folha de cliente): `BotaoDeIcone({ acao, rotulo, href?, variante?,
  ocupado?, ...props do botão })` → `Tooltip` + `TooltipTrigger asChild` + `Button size="icon-sm"` (o `h-8` do `sm`,
  para as barras medirem a mesma altura) com `aria-label={rotulo}`; com `href`, o `Button asChild` + `Link`.
  **Repassa `ref` e as props** ao botão: é o que deixa ele servir de gatilho de `DialogoConfirmacao` e de `Dialog`
  (`asChild`). `ocupado` troca o ícone pelo indicador e o nome por *"Gravando…"*.
- `components/ciaara/acoes-de-icone.ts`: o vocabulário fechado `AcaoDeIcone → ícone do lucide` (editar, excluir,
  desativar, reativar, imprimir, salvar, novo, cadastrar, arquivar, desarquivar, descartar, baixar, redefinir-senha,
  trocar-situacao, registrar, acrescentar, retirar, desfazer, parar-dia, limpar-filtros, carregar, enviar-foto,
  remover-foto, abrir-dsa, tema-claro, tema-escuro, tema-sistema, avisos).
- `BarraDeAcoes` alinha à **direita** (`justify-end`); as páginas põem a barra **na linha do título** (título à
  esquerda, ações à direita) e as tabelas **acima** delas.
- Guarda `tests/unidade/botoes-de-icone.test.ts`: lê cada `.tsx` de `app/` e `components/` com o **compilador do
  TypeScript** (o JSX de verdade, sem comentário — regra 9.1.1), acha `<Button>`, `<button>` e `<Link>`/`<a>` com cara
  de botão cujo **texto** começa por um verbo padrão (D-4), e reprova fora de `DialogFooter`, `AlertDialogFooter`,
  `AlertDialogAction` e `AlertDialogCancel`. **Controle positivo**: um caso sintético com `<Button>Editar</Button>`
  tem de ser achado.
- Tema: `SeletorDeTema` vira três `BotaoDeIcone` (sol, lua, monitor), com `aria-pressed` e os mesmos `data-testid`.

## 2. Formulários (FR-002)
- `components/ciaara/dialogo-de-formulario.tsx` (folha de cliente): `DialogoDeFormulario({ gatilho, titulo,
  descricao?, children: (fechar) => ReactNode, aberto?/aoMudar? })` — o `Dialog` do Radix, `max-h-[90vh]` com rolagem,
  o foco devolvido ao gatilho. O formulário de dentro chama `fechar()` quando grava.
- Viram diálogo (gatilho = `BotaoDeIcone`): UE (editar, acrescentar), avaliação do currículo (editar, acrescentar),
  arbitrado (definir tempo; nomear a UE), regime (novo, editar), limite (declarar/editar), novo currículo, previsto do
  PROENS, período da disciplina na turma, instrutores da disciplina na turma, TA fora do DSA, juntar como sessão,
  parar dia, assinaturas da impressão, sala nova, nome do perfil.
- **Disciplina em página própria** (D-2): `app/(app)/cursos/[curso]/editar/disciplinas/[disciplina]/page.tsx` (o
  formulário da disciplina, a situação e a exclusão no topo à direita, a tabela das UEs e as avaliações do currículo
  com diálogos) e `…/disciplinas/nova/page.tsx` (o cadastro, no currículo de `?curriculo=`). Contrato: as duas rotas,
  `nova` com `curriculo`. A linha da grade de *Editar curso* ganha o ícone *Editar* (`editar-disciplina`) e o topo
  da grade, *Nova disciplina*; o detalhe expandido fica **só leitura** nos dois lugares.
- Ficam: a ficha do instrutor e a da turma (o modelo, D-1), *Editar curso* (cadastro, dados do currículo, vigência),
  a conta em `/admin/usuarios/[id]`, o lançamento do DSA (já é diálogo).

## 3. Ordem (FR-003)
- `lib/dominio/ordem-de-cursos.ts`: `ORDEM_DAS_CLASSIFICACOES`, `compararCursos({classificacao, codigo})`,
  `compararTurmas({cursoClassificacao, cursoCodigo, ano, codigo})`, `emOrdemDeCurso`, `emOrdemDeTurma`. A sigla e o
  código pelo `compararCodigoDeTurma` (sem os hífens, D-6); ano decrescente.
- `CLASSIFICACOES_DE_CURSO` passa a Regular · Expedito · Especial · **Estágio de Qualificação** · **Aperfeiçoamento
  Avançado** (A-4) — os grupos do catálogo, dos filtros e do submenu seguem.
- Consumidores: catálogo (`CatalogoDeCursos`), `/turmas` (a ordem inicial da tabela; a leitura traz a classificação do
  curso), Início (cartões e manchetes), submenu (cursos e turmas), aba *Turmas*, listas de curso dos filtros de
  `/turmas`, `/atividades`, `/instrutores` (inativos no fim) e da conta.

## 4. Sininho e Avisos (FR-004)
- `lib/dominio/avisos/central.ts` (puro): `Aviso = { chave, modulo, titulo, detalhe?, destino }`, `MODULOS` (Cursos,
  Turmas, Avaliações, Instrutores) e a ordem, `agruparPorModulo`, `naoVistos(chaves, vistas)`, `resumoDosAvisos`.
- `app/(app)/avisos/leitura.ts` (servidor): `lerAvisos(supabase, hoje)` — as mesmas leituras dos quadros de hoje, sem
  o recorte da tela (D-8), em **uma rodada** de `Promise.all`; cada módulo que falhar vira *"não pude ler"* (`RN-DEG-01`).
  Converte cada predicado em `Aviso` com a chave estável (`modulo:tipo:sujeito`) e o destino montado por
  `lib/navegacao/endereco-de-turma.ts`.
- `app/(app)/avisos/page.tsx` (servidor) + `MarcarComoVistos.tsx` (folha): a lista por módulo; ao abrir, grava as
  chaves como vistas. Rota no contrato (sem parâmetro) e entrada no menu? **Não** — o caminho é o sininho (a guarda
  `toda-tela-tem-caminho` aceita o `href` do sininho).
- `app/(app)/avisos/resumo/route.ts` (GET): `{ total, chaves }` para o sininho.
- `components/casca/sininho-de-avisos.tsx` (folha de cliente, na lista fechada da casca): pede o resumo ao montar e
  a cada troca de rota, no máximo a cada 2 min (`sessionStorage`); mostra o número; `animate-pulse` em tons de
  `atrasado` com `motion-reduce:animate-none` quando há chave não vista; `Link` para `/avisos`.
- Saem os oito quadros (spec §6) e as leituras que só eles usavam: Início (atraso, vistas, tetos), curso (avisos,
  teto excedido), `/turmas` (a lista de avisos do painel; os números ficam), ficha da turma (avisos de cadastro,
  vistas), `/instrutores` (quadro), ficha do instrutor (alertas). O link do DSA sem vigência vai a *Editar curso* →
  *Horários*.

## 5. Abas do curso (FR-005)
- Contrato: `aba` = sobre · **turmas** · disciplinas · avaliacoes · atividades · horarios · curriculo; a página
  redireciona `?aba=grade`.
- `AbaGrade` → `AbaTurmas` (o mesmo conteúdo, sem o botão *Disciplinas*); `AbaSobre` sem a grade curricular e sem as
  avaliações previstas; `AbaAvaliacoes` ganha as avaliações previstas no topo; `AbaHorarios` sem as vigências, com o
  ícone *Editar* para *Editar curso* → *Horários* (quem pode editar).

## 6. Cores do DSA (FR-006)
- `components/ciaara/grade-alocacao.tsx` (usado só pelo DSA e pela vitrine): `ocupada` e `nao_letivo` → `planejado`;
  `avaliacao` → `executado`; `conflito` → `atrasado`; `bloqueada` → `conformidade`; os selos de conflito e de sala →
  `atrasado`; o motivo do dia bloqueado → `conformidade`. `data-tom` e `NOME_DO_TOM` não mudam; o papel não muda.

## Testes
- Unidade: ordem (casos com as cinco classificações, a sigla sem hífen, o ano), avisos (chave, agrupamento, não
  vistos), a guarda dos botões (com controle positivo), a guarda de formulário aberto em página de leitura (`<input`
  fora de diálogo nos arquivos das páginas de leitura), contrato e fronteiras.
- E2E por clique: sininho (número, pulso, para ao abrir, volta com aviso novo, *reduzir movimento*), Avisos por
  módulo com o link, cada diálogo novo, a página da disciplina, a ordem do catálogo/turmas/submenu, as abas do curso,
  as cores (`data-tom` e a classe). Os casos dos quadros que saem migram para a página Avisos.
- **Prova de não-regressão (SC-005):** o retrato das telas do DSA (Bloco 6) idêntico antes e depois.

## Reversão
Reverter o PR. Nada no banco; *visto* fica no `localStorage` de quem usou, sem efeito.
