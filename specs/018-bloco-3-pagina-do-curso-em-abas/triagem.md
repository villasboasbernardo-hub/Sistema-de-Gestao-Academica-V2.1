# Triagem — Bloco 3 (a página do curso em abas)

*19/10/2026, pelo `/corrigir` de Bernardo Villas Boas. **Artefatos:** o código na `main` `33efec0` (lido por três
leitores independentes, só de leitura, com arquivo e linha) e a cópia **`remoto-20261019-165417.sql`** (19/10/2026,
16:54), lida por script fora do repositório — o remoto não foi lido de novo.*

## Os itens, reescritos

| # | O que está errado ou falta | Onde (medido) | O que deve acontecer | Natureza |
|---|---|---|---|---|
| 1 | O cadastro de disciplinas mora numa tela solta (`/disciplinas`), com entrada própria no menu, e a página do curso não o tem | `app/(app)/disciplinas/` (página, `GradeDeDisciplinas.tsx`, `paineis/`); menu em `lib/navegacao/menu.ts:154-160` | Uma aba **Disciplinas** no curso, com as mesmas funções; a entrada sai do menu; `/disciplinas` só redireciona | Reorganização (pedido nominal) |
| 1a | 🐛 **Nenhuma tela cria disciplina.** A ação `criarDisciplina` e a RPC existem, mas o formulário só abre em modo de edição | `paineis/FormularioDeDisciplina.tsx` (criar/editar), montado só em `DetalheDaDisciplina.tsx:85` | A aba ganha *Nova disciplina*, para quem cria (o pedido lista "criar" entre as funções) | Defeito (lacuna de caminho) |
| 2 | O que o currículo prevê de AEC, TAD e TR aparece **acima** das abas, misturado com as turmas que excederam | `app/(app)/cursos/[curso]/BlocoDeLimites.tsx:38-82`; `page.tsx:272-297` | Uma aba **Atividades extraclasse** com o previsto do currículo (os limites, a origem de cada um, a referência do Estudo Individual e o que conta em cada categoria) | Regra nova (pedido nominal) |
| 3 | O regime de horário é **um par por curso** (padrão e exceção) e vale igual para toda turma; não há nome nem escolha por turma | `curso_regime_historico` (EXCLUDE por curso e tipo); o DSA lê pelo `curso_id` (`dsa/leitura.ts:455-463`); nada em `turmas` aponta para regime | Uma aba **Horários** com regimes **nomeados** por curso; cada turma escolhe o seu (padrão: o do curso) e o DSA, os alertas e o saldo dela usam esse regime | Regra nova (decisão 6 da triagem de 16/10/2026) |
| 4 | 🐛 A aba **Avaliações** do curso mostra o **cumprido da turma** escolhida na Grade | `AbaAvaliacoes.tsx:38-56` reusa `AvaliacoesDaTurma`; `lerAvaliacoesDoCurso` (`turmas/[turma]/consulta-de-avaliacoes.ts:234-264`); medido no Bloco 2 | Só o **previsto do currículo**, sem turma | Defeito (divergência registrada no plano) |
| 5 | Ordem das abas | `AbasDoCurso.tsx:23-27` (sobre · grade · avaliações) | **Sobre o Curso · Grade · Disciplinas · Avaliações · Atividades · Horários** | Pedido nominal |

## Já feito, sem objeto ou fora

- **Os horários nomeados já existem, mas globais e sem tela:** `configuracoes_horario` (CFG-A a CFG-H, com nome como
  *"8 TA de 50 min - intervalo 10 min"*) e `horarios_tempos_aula` (68 linhas na cópia) dão o relógio explícito de
  cada configuração; a vigência do curso aponta para uma delas, ou para nenhuma. O Bloco 3 **usa** esse catálogo como
  relógio opcional do regime nomeado; editar o catálogo continua fora (é permissão `parametros`, sem tela).
- **Troca de regime por semana:** fora, por pedido ("fica para depois").
- **Turmas com teto excedido** (acima das abas): é alerta do curso pelo `RF-CURSO-06` **[PRESERVADO]**, não aba —
  fica onde está (decisão C-5).

## Medido no dado (cópia `remoto-20261019-165417.sql`)

- **29 vigências de regime ativas em 24 cursos**: todos têm o padrão; **5** têm também a exceção (CAHO, C-Ap-FR,
  C-Ap-HN, C-Espc-FR, C-Espc-HN); **4** são EAD (0 TA). 13 das 29 apontam para uma configuração do catálogo.
- **29 turmas**: 18 presenciais, 5 semipresenciais, 6 EAD. **Nenhuma** tem regime próprio (a coluna não existe).
- **8 configurações** no catálogo, todas `ativo`.
