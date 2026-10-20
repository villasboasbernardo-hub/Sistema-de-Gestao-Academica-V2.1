# Research — Bloco 3

*19/10/2026. Cada decisão aponta o artefato que a sustenta (regra 9.2).*

## R-1 · Os regimes nomeados não cabem em `curso_regime_historico`

- **Decision**: registro próprio, `regimes_de_horario`, por curso.
- **Rationale**: `curso_regime_historico` tem `EXCLUDE (curso_id, tipo_regime, daterange)` e o gatilho de
  encadeamento por tipo (`20260829233423`, `20260918025141`): dois regimes nomeados do mesmo tipo no mesmo período
  violariam a restrição, e reescrevê-la é **alterar** o que existe (portão). E a vigência do curso continua sendo o
  padrão de toda turma — o pedido é *"padrão: o regime vigente do curso"*.
- **Alternatives considered**: um terceiro valor no enum `tipo_regime` e a restrição re-chaveada por nome (altera o
  que existe, e a resolução por data do DSA passaria a escolher entre vários); regime com vigência própria (a troca no
  tempo ficou para depois).

## R-2 · O passado não se reinterpreta sem vigência

- **Decision**: a quantidade de TA e a duração são **imutáveis** depois de criadas; os horários só mudam enquanto
  nenhuma turma que usa o regime tem lançamento; a escolha da turma trava no primeiro lançamento.
- **Rationale**: `RF-HOR-02` (quantidade e duração decorrem do currículo, imutáveis pelo usuário) e `RF-HOR-05`
  (*"nenhuma edição reinterpreta o passado"*). Sem vigência no regime nomeado, a trava por existência de lançamento é
  o que garante isso — o mesmo princípio da `app.conferir_vigencia_nova`, que recusa vigência nova sobre lançamento.
- **Alternatives considered**: deixar editar e reinterpretar (contra `RF-HOR-05`).

## R-3 · O que conta como lançamento para a trava

- **Decision**: aula ativa, avaliação viva (a lista positiva `pendente, em_andamento, concluida, atrasada`), sessão de
  aplicação e vista ativas, atividade não letiva ativa da turma, atividade **global** ativa dentro da janela da turma, e
  dia parado ativo da turma.
- **Rationale**: é a lista de `app.lancamentos_que_travam_vigencia` (`20261016092307:672-748`) restrita à turma, mais o
  dia parado (que consome os TA do dia pelo regime).

## R-4 · Onde o regime da turma entra no código

- **Decision**: no DSA, `vigente = regimeDaTurma ?? excecao ?? padrao` em `montarSemanaDoDsa`
  (`dsa/leitura.ts:932`), com a configuração do regime somada à leitura do catálogo; nos alertas e na cascata
  (`lib/acoes/dsa.ts:289-293, 542-548`) e no dia parado (`lib/acoes/dia-parado.ts:87-98`), por um auxiliar só; no
  saldo, `regimeEfetivo` nos três consumidores do andamento (ficha, `/turmas`, `/inicio`); e na view
  `vw_dias_parados_turma`.
- **Rationale**: são os únicos leitores do regime, medidos (o relatório da triagem). `regime_excecao_*` da view do
  curso não tem consumidor em TypeScript.

## R-5 · As permissões já existem

- **Decision**: o recurso `horarios` (`criar`, `editar`, `desativar`; `20260918022106:45-87`) para os regimes; a
  escolha da turma por `turmas.editar`.
- **Rationale**: é o recurso que já governa as vigências do curso; nenhuma linha nova na matriz.

## R-6 · A aba Disciplinas reaproveita a grade

- **Decision**: `GradeDeDisciplinas` passa a ler os parâmetros da página do curso e perde a cascata (o curso vem do
  endereço); a página `/disciplinas` só redireciona.
- **Rationale**: a pasta é importada pela ficha da turma (`turmas/[turma]/page.tsx:60`, `DisciplinasDaTurma.tsx:42`,
  `TaForaDoDsa.tsx:30`); mover arquivos não traz ganho.

## R-7 · A aba Avaliações sem turma

- **Decision**: leitura própria do previsto (disciplinas, UEs e itens do currículo do curso) e desenho próprio,
  reaproveitando `previstoDaDisciplina` do domínio; *Definir tempo* com alcance só do curso.
- **Rationale**: `AvaliacoesDaTurma` mostra *"0 de N aplicadas"* e *"Pendente"* mesmo sem turma (`AvaliacoesDaTurma.tsx:116-118, 179`); o previsto puro já existe no domínio (`lib/dominio/avaliacoes/previsto.ts:100-155`).
