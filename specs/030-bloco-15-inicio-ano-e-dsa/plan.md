# Plano — spec 030 (Bloco 15)

Ordem de dentro para fora (`CLAUDE.md`): `lib/dominio/` e `lib/formato/` (regra pura + teste visto reprovar) →
`lib/navegacao/` → `lib/acoes/` → leitura → telas → `components/` → ponta a ponta → documentos. **Nenhuma migration.** A
ponta a ponta inteira fica com o CI; localmente, só os arquivos tocados, com 1 processo.

## Contexto técnico e constituição

- Next.js 16 (App Router, Server Components por padrão), Supabase, Vitest, Playwright — **sem pacote novo**: a
  sobreposição da tela cheia é o `Dialog` do Radix que já está em `components/ui/dialog.tsx`; os ícones novos vêm do
  `lucide-react`, que já é dependência.
- **Constituição:** nenhuma regra do documento 04 muda (regra 1); nada se apaga — o *Remover EI* é a exclusão lógica do
  cartão, em lote (regra 4); `lib/dominio/` segue puro (regra 9); a regra de negócio mora no domínio e no servidor, não
  só na tela (o recorte da «Atrasada» em `quadrosDaSemana`, a remoção do EI por Server Action com Zod); estado na URL
  (`?versao=`, `?ano=`); folhas de cliente novas declaradas na guarda das fronteiras. **Portão:** nenhum — sem banco
  (regra 9.4 não se aplica).

## 1. Domínio puro e formato

| Módulo | O quê | Item |
|---|---|---|
| `lib/dominio/dsa/impressao.ts` | `diaImpresso` deixa de criar a **linha fixa** do EI (sai `linhaFixaDoEstudoIndividual`); o EI **lançado** continua indo para o pé do dia; nasce `ehLinhaFixaDoEstudoIndividual(linha)` (`chave` `ei-…`), para ler os retratos antigos | 4 |
| `app/print/dsa/retrato.ts` (`conteudoDaSemana`) | compara os campos de origem — `curso`, `semana`, `semanaDoCurso`, `primeiro`, `ultimo`, `alunos`, `assinaturas` e os `dias` **sem a linha fixa** —, e não mais `grade` e `legenda`, que derivam dos dias (a linha fixa acrescentava cartão, faixa e a sigla EI) | 4 (D-10) |
| `lib/dominio/dsa/planilha/preenchimento.ts` e `impressao.ts` | a conta do slot fixo (`slotDoEi`) deixa de gerar EI: a IMPRESSÃO da planilha só mostra o EI digitado, como o papel | 4 |
| `lib/dominio/dsa/limpar-semana.ts` | `estudosIndividuaisParaRemover(linhasDaGrade, idsDeEi)`: as exclusões do *Limpar* restritas aos EI da turma | 4 |
| `app/(app)/turmas/[turma]/dsa/consulta.ts` (`quadrosDaSemana`) | entrada obrigatória `periodoDaTurma`; a previsão de cada disciplina passa por `janelaDaCarga` antes de `quadroDaDisciplina` | 11 |
| `lib/formato/data.ts` | `intervaloDeDatas(de, ate)`: *"26/10 a 31/10/2026"*, inteiro quando muda o ano | 9, 2 |
| `lib/dominio/enquadramento-do-papel.ts` | `escalaDaTelaCheia(largura, altura)`: a maior escala que cabe, **sem teto** (D-2) | 1 |
| `lib/navegacao/contrato.ts` | `?versao=` na rota do DSA (texto, padrão vazio, empilha, avisa o servidor); `rotaComAnoDoCaminho(caminho)` — a rota do contrato que tem `ano`, pelo caminho da página, para o seletor do cabeçalho | 7, 3 |
| `lib/dominio/dsa/versao-escolhida.ts` (novo) | `versaoEscolhida(texto, publicadas)`: Minuta, a versão N, ou Minuta com aviso quando N não existe | 7 |

## 2. Servidor

- `lib/acoes/dsa.ts`: `removerEstudoIndividualDaSemana` (Zod na 1ª linha; recusa a arquivada; lê a grade da tela e os EI
  da turma na semana na **mesma** rodada; exclui pela `camposDaExclusao`, em lote, por `gravarEmTransacao`; a semana
  publicada é recusada pelo banco, RP-5) — o *Limpar semana* restrito ao EI.
- Sem mudança em `lancarEstudoIndividualDaSemana`: ele já repõe o dia cujo EI foi excluído (a sombra de exclusão não
  conta como «já tem»).

## 3. Telas

- **Cabeçalho (item 3):** `app/(app)/layout.tsx` lê o ano escolhido (já lia) e passa `ano`, `vigente` e `origem` ao
  `CabecalhoDoApp`; o `SeletorDeAno` passa a morar lá, **antes do sininho**, e descobre sozinho a rota
  (`usePathname` → `rotaComAnoDoCaminho`) e o `?ano=` do link (`useSearchParams`, dentro de `Suspense`). Em página sem
  ano, escolher grava só o cookie e redesenha (D-7). Saem os sete seletores das páginas (Início, Turmas, Instrutores,
  Cursos, Atividades/Calendário, ficha do instrutor, página do curso); a vitrine `/estilo` mostra o do cabeçalho.
- **Início (itens 1 e 2):** `EscolhaDaSemana` numa linha — `BotaoDeIcone` *voltar* no canto esquerdo, ao centro o título,
  as datas curtas, o calendário e *Ir para esta semana*, *avançar* no canto direito. `Carrossel`: setas laterais
  centradas na vertical (os dois carrosséis, D-4), *Pausar* e *N de M* embaixo; e a **tela cheia** como propriedade do
  carrossel (`telaCheia`): o item vira ativável (clique, `Enter`, `Espaço`), o `Dialog` mostra o **mesmo elemento** do
  item (o RSC manda o papel uma vez só), com *Sair da tela cheia* no canto, setas laterais e `←`/`→`, compartilhando o
  índice. `EscalaDoPapel` lê um contexto de modo: no carrossel, como hoje; na tela cheia, mede a caixa da sobreposição
  e usa `escalaDaTelaCheia`.
- **DSA (itens 4, 6, 7, 9, 10):**
  - `page.tsx`: a linha única (código-link · semana · datas) no lugar da linha antiga, de `NavegacaoDaSemana` e de
    `CabecalhoDaSemana`; o mesmo em `CabecalhoDoDsa` (EAD e fora da etapa) — sai *Voltar à turma*. Lê `?versao=`; as
    abas (`AbasDeVersao`, folha de cliente) recebem a Minuta (o conteúdo de trabalho de hoje) **ou** o papel da versão
    escolhida (`DocumentoDoDsa` do retrato, só leitura, em `EscalaDoPapel`, com *Reimprimir*, data, autor e
    justificativa) — o servidor desenha **só** a aba aberta. O selo vai na aba Minuta.
  - `BarraDoDsa`: três grupos separados — navegação (`voltar` · `esta-semana` · `escolher-semana` com o campo de data ·
    `avancar`), lançamento (`regime` · `abrir-sabado`/`fechar-sabado` · `parar-dia` · `lancar-ei` · `remover-ei` ·
    `limpar`), publicação (como hoje). A navegação e o campo de data saem de `NavegacaoDaSemana` (que vira as peças da
    barra, com as mesmas `anterior`/`proxima` e o mesmo `ir()`); o *Parar dia* vira só o gatilho do diálogo
    (`ControleDeParadas` em duas peças: o botão com o diálogo, na barra; as paradas e feriados da semana, abaixo); o
    EI da semana sai do `PainelDeLancamento`.
  - `VersoesPublicadas` dá lugar às abas; a linha da RP-9 e o aviso da RP-4 ficam acima das abas.
  - `AcoesDoBloco`: o rodapé com três `BotaoDeIcone` juntos à esquerda (*salvar*, *cancelar*/*fechar*, *excluir* com a
    confirmação escrita); o título com o código, o nome por extenso e quem ministra, quebrando a linha.
  - `components/ciaara/grade-dsa.tsx`: sai o texto *"no papel, sem lançamento"* e o caminho da linha fixa (o cartão de
    EI sem lançamento não existe mais).
- **Papel (item 8):** `app/print/dsa/documento.css` — a folha com `isolation: isolate` e `.dsa4-previa` com `z-index: -1`
  (pinta sobre o branco da folha e sob todo o resto), `opacity: 0.18`; só na prévia as colunas ficam translúcidas.
- **Editar turma (item 9):** o código no título vira o link da ficha; sai *Voltar à ficha da turma*.
- **Vocabulário dos ícones** (`components/ciaara/botao-de-icone.tsx`): `voltar`, `avancar`, `esta-semana`,
  `abrir-sabado`, `fechar-sabado`, `lancar-ei`, `remover-ei`, `cancelar`, `fechar`, `sair-da-tela-cheia`, `pausar`,
  `continuar` — dica só do verbo.

## 4. Testes (cada um visto reprovar antes da mudança)

| Item | Unidade | Ponta a ponta |
|---|---|---|
| 1 | `enquadramento-do-papel` (`escalaDaTelaCheia`) | `bloco-15.spec.ts`: clique e `Enter` abrem, `Esc` e o ícone fecham, as setas e `←`/`→` trocam; o papel inteiro e maior, em 1366×768 e 1920×1080 |
| 2 | — | `bloco-15.spec.ts`: setas nos cantos e datas ao centro; setas laterais centradas; o papel inteiro em 1366×768 e 1920×1080 (os casos do Bloco 14 continuam) |
| 3 | `rotaComAnoDoCaminho`; a guarda de que nenhuma página desenha seletor próprio | `bloco-15.spec.ts`: trocar o ano no cabeçalho em Turmas e conferir Início, Turmas e Instrutores; os casos de ano existentes passam a usar o cabeçalho |
| 4 | `impressao` (dia sem EI → sem linha), `conteudoDaSemana` (retrato com a linha fixa × hoje sem ela → iguais), `planilha-*` e o comparador, `limpar-semana` (só EI) | `bloco-15.spec.ts`: o EI lançado se exclui pelo cartão e pela barra, salva, não volta; o ícone o relança |
| 5 | — | `bloco-15.spec.ts`: lançar → salvar → prévia → editar → salvar → prévia → publicar = Original, sem ALT |
| 6 | — | `bloco-15.spec.ts`: o rodapé sem texto, os três ícones juntos à esquerda; `dsa-cartao-unico.spec.ts` segue pelos mesmos `data-slot` |
| 7 | `versao-escolhida` | `bloco-15.spec.ts` e `publicacao-do-dsa.spec.ts`: 1 aba sem publicação; Original e ALT 1 depois; `?versao=` |
| 8 | — | `bloco-15.spec.ts`: a marca atrás do conteúdo (`z-index` e opacidade calculados) |
| 9 | `intervaloDeDatas` | `bloco-15.spec.ts`: a semana uma vez, sem *Voltar à turma* nem *Alunos* |
| 10 | a guarda dos ícones (vocabulário) | `bloco-15.spec.ts`: os três grupos; navegar pela barra; os casos de navegação de `dsa-ver.spec.ts` pelas mesmas `data-acao` |
| 11 | `painel-de-situacao`/`quadrosDaSemana`: a CAHO 2027 com previsão de 2026 → *aguardando início* | — (medição no remoto antes e depois, só leitura) |

## 5. Documentos

`padroes-de-tela.md` (RT-1: as setas e os grupos; RT-6: o seletor no cabeçalho); `regras-do-dsa-lancamento.md` (RD-2,
RD-4, RD-6, RD-7); `regras-da-publicacao-do-dsa.md` (RP-3: o histórico em abas); `CLAUDE.md` (a frase da RT-6 no
resumo dos padrões); `plano-de-correcoes-em-blocos.md` (o Bloco 15 e a `PEND-029-1` fechada); `roteiro-de-conferencia.md`.
