# Quickstart — validar o Bloco 1

*17/10/2026. Como provar cada PR. As regras de cada tela estão em `contracts/telas.md`; o desenho do
banco em `contracts/migrations.md`.*

## Pré-requisitos
- Stack local de pé (`pnpm db:start`).
- **Suíte de ponta a ponta em base LIMPA:** `pnpm db:reset:limpo` antes (com a cópia do remoto no local,
  feriado real quebra a semente do DSA). É o que `pnpm verificar:tudo` já faz.
- **Conferência com dado real:** `python -m scripts.manutencao.dado_do_remoto` traz a cópia para o local;
  depois, `pnpm dev:local` e entrar com a conta local que o script imprime.

## Comandos
| Para quê | Comando | Promete |
|---|---|---|
| A cada commit | `pnpm verificar` | tipos, lint, formatação, unidade, build |
| Antes do PR | `pnpm verificar:tudo` | + pgTAP, RLS com sessão real, ponta a ponta — o mesmo veredito do CI |
| Depois de migration (PR 3) | `pnpm db:tipos` e `git add lib/tipos/database.ts` antes do `verificar:tudo` | o CI compara o tipo com o índice |

## PR 1 — o que se vê
1. `/login` mostra a faixa *"Sistema privado – Versão Beta – …"* com *"· ambiente local"*; o olho mostra e
   oculta a senha.
2. Entrar → o item do menu da página atual destaca-se em azul cheio, nos dois temas.
3. Menu *Instrutores*: os filtros abrem recolhidos e o botão diz *"Filtros"*; escolher OM e Categoria →
   *"Filtros 2"*; *Limpar filtros* → *"Filtros"*.
4. Menu *Cursos* → um curso: abre em *Sobre o Curso*, com Editar · Desativar · Nova turma numa barra só.
5. Menu *Disciplinas* → curso → expandir uma disciplina: UEs em tabela, sem campo aberto; *Editar* numa
   UE; o gráfico é de pizza, com *"Outras (N)"* quando há mais de 4.
6. Menu *Instrutores* → um instrutor: nenhum campo editável até *Editar*; Desativar e Excluir na barra do
   topo.
7. Menu *Turmas* → uma turma: *Trocar situação* ao lado do selo → escolher → confirmação na tela →
   recarregar → o selo continua com a nova situação. *Editar turma* não tem mais o campo *Situação*.

## PR 2 — o que se vê (com a cópia do remoto no local)
1. Menu *Turmas* → *C-Ap-FR 2026* → a ficha avisa *"a turma tem 37 semanas e o curso, 35"*.
2. *Abrir o DSA* → *Ir para a semana do dia* 12/10/2026 → **"Semana 28 de 37"** (hoje sai *"Nº 26"*); o
   papel (*Imprimir*) diz o mesmo e as datas dos dias têm ano.
3. O cartão de uma aula mostra o **nome** da disciplina antes do código, e a técnica numa linha própria.
4. *C-Exp-Obs-ME 2026*, semana de 05/10/2026: a segunda tem os 7 TA da aula (4 de manhã, 3 à tarde).
5. Clicar num tempo vazio de uma turma com instrutor atribuído na disciplina → o instrutor vem
   preenchido.
6. *Baixar planilha de contingência* → a entrada e a IMPRESSÃO usam "Semana N de T".

## PR 3 — o que se vê (com a cópia do remoto no local)
1. Menu *Início*: a **C-Ap-FR 2026 aparece em atraso** (saldo −16 TA); a C-Ap-HN 2026 mostra **958** TA
   executados, não 1.008.
2. Menu *Turmas*: colunas **Progresso** e **Saldo (TA)**.
3. *C-Ap-HN 2026* → ficha: a disciplina XIV mostra **33** TA executados, não 56; a aba *Avaliações* usa o
   mesmo número.
4. Menu *Instrutores* → instrutor de código **15**: CH prevista de 2026 **271** TA (hoje 114); as
   habilitações C-Ap-HN IV e C-Espc-HN `HN-1114-0730` marcadas *"só habilitado — não gera CH prevista"*.
5. O DSA da semana de 19/10/2026 da C-Ap-FR continua **contando** os lançamentos daquela semana na
   situação por disciplina (o "até hoje" não vale no DSA).
