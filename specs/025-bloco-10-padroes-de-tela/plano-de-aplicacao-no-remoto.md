# Plano de aplicação no remoto — spec 025 (Bloco 10)

> ⚠️ **PORTÃO 9.4 — ESTA MIGRATION ESPERA A SUA PALAVRA.** Ela **altera o que existe**: troca a restrição
> `exclusoes_tabela_permitida` (de 3 para 8 tabelas) e **muda o resultado** de três funções que a tela já usa
> (`app.impedimentos_de_exclusao_do_instrutor`, `…_da_disciplina`, `…_da_unidade_ensino`). E passa a **apagar dado**
> quando chamada — a regra 4 ganha cinco tabelas na exceção. Nada foi aplicado no remoto.

## 1. A migration

`supabase/migrations/20261024063555_exclusao_permanente_dos_cadastros.sql` — uma só.

| Parte | O quê |
|---|---|
| A | o rastro `exclusoes_registradas` passa a aceitar `turmas`, `feriados`, `regimes_de_horario`, `avaliacoes_curriculo` e `config_listas` (só a sala) |
| B | `app.referencias_por_fk` — a **rede de segurança**: toda FK que aponte para o registro prende a exclusão, inclusive a que nascer depois (lida no catálogo) |
| C | **turma** — `app.registros_da_turma`, os impedimentos (um e em lote) e `app.excluir_turma` |
| D | **linha do calendário** — `app.registros_do_feriado` (semana do DSA **salva ou publicada** de turma alcançada, D-11), impedimentos e `app.excluir_feriado` |
| E, F, G | **regime de horário**, **item de avaliação do currículo** e **sala** — o mesmo trio (D-30) |
| H | os impedimentos **antigos** de instrutor, disciplina e UE **corrigidos** (D-32): passam a conhecer as FKs que faltavam e usam a rede |
| I | os espelhos `public.*` `SECURITY INVOKER`, `revoke`/`grant` |

**O molde é o da exclusão de disciplina e UE** (`20260925135044`): `app.*` `SECURITY DEFINER` com porteiro
`coalesce(app.pode(…), false)` (gotcha 15) e alcance do curso; **código digitado** conferido no banco (`22023`); `23503`
nomeando o que prende; **rastro gravado antes do `DELETE`**. **Continua sem policy e sem privilégio de `DELETE`** — a
asserção que conta `pg_policy.polcmd = 'd'` segue em zero.

**Quem pode** (D-9): turma — `turmas.criar` (Admin, Encarregado e Ajudante da Divisão, Operador no escopo dele);
calendário — `calendario.criar` (Admin e Encarregado); regime — `horarios.criar`; item — `disciplinas.criar`; sala —
`parametros.criar` (Admin e Encarregado).

**O que é registro** (prende) e **o que é estrutura** (sai junto), D-10: prende lançamento, semana do DSA, troca de
situação, arquivamento, previsto do PROENS, planejamento, avaliação da turma, a turma **escolhida** num feriado (apagá-la
alargaria o feriado para todas) e avaliação do arquivo da v2.0. Sai junto, e vai no retrato do rastro: as linhas da grade,
as atribuições de instrutor, o rateio e as ligações **inativas** de feriado.

## 2. Quem lê

- A ficha da turma, a lista `/turmas` e a aba *Turmas* do curso (o *Excluir* de cada turma);
- *Atividades* → *Calendário* (o *Excluir* de cada linha);
- *Editar curso* → *Horários* (regime) e a página da disciplina (disciplina, UEs e avaliações do currículo);
- *Administração* → *Salas*;
- a ficha do instrutor (o impedimento de sempre, agora com as FKs que faltavam).

## 3. Os casos que discriminam (DoD 8)

- **pgTAP `149`**: a turma **só com atribuição** não tem registro (é estrutura); com **um** evento `salvo` do DSA, tem; o
  feriado de **todas** as turmas, na semana salva de uma delas, tem registro; o mesmo evento **não** prende o feriado
  escolhido só para outra turma.
- **RLS `exclusao-de-cadastros.test.ts`** (sessão real): o **Operador** tem `turmas.criar` e é recusado pelo **alcance**
  (`42501`); o **Ajudante** exclui turma e é recusado no calendário e na sala; regime e item — o mesmo id inexistente dá
  `42501` a quem não pode e `P0002` a quem pode (o porteiro vem antes da leitura).
- **E2E `bloco-10.spec.ts`**: a turma com aula tem o ícone desabilitado com a dica; a limpa sai pela ficha e pela linha da
  aba Turmas, conferida no banco (`count` zero e uma linha no rastro); a linha do calendário sem semana salva sai.

## 4. Efeito medido na cópia do remoto

Cópia: `[pendente]` — restaurada no banco **local** por `python -m scripts.manutencao.dado_do_remoto`; medição numa
transação **desfeita**, com as funções antigas recriadas em `pg_temp` para o antes × depois.

| Cadastro | Total | Excluíveis depois da migration |
|---|---|---|
| Turmas | `[pendente]` | `[pendente]` |
| Linhas do calendário | `[pendente]` | `[pendente]` |
| Regimes de horário | `[pendente]` | `[pendente]` |
| Itens de avaliação do currículo | `[pendente]` | `[pendente]` |
| Salas | `[pendente]` | `[pendente]` |

| Impedimento antigo | Total | Excluíveis antes | Excluíveis depois |
|---|---|---|---|
| Instrutor | `[pendente]` | `[pendente]` | `[pendente]` |
| Disciplina | `[pendente]` | `[pendente]` | `[pendente]` |
| Unidade de ensino | `[pendente]` | `[pendente]` | `[pendente]` |

## 5. Reversão

`specs/025-bloco-10-padroes-de-tela/reversao.sql` — derruba as funções novas, devolve as três antigas com o **texto
exato** de `20260915140100` e `20260925135044`, e a restrição de 3 tabelas. ⚠️ **Só vale antes da primeira exclusão das
tabelas novas**: com rastro delas, a reversão recusa (o rastro é só de acréscimo) — e recusou de fato, na primeira
tentativa, sobre os 3 rastros que a suíte de ponta a ponta deixou no banco local.

**Prova (24/10/2026, banco local, numa transação desfeita, com os rastros retirados só dentro dela):** a impressão digital
do esquema vai de **2.637 objetos `5a362188…`** (com a migration) a **2.573 objetos `80345112…`** — a mesma do remoto
depois do Bloco 9; o `rollback` devolveu o esquema e os 3 rastros.

## 6. O rito, quando você autorizar

1. `python -m scripts.manutencao.dado_do_remoto --somente-copia` — o arquivo datado vai citado aqui.
2. `supabase db push --linked --dry-run` — listando **só** `20261024063555`.
3. `supabase db push --linked` (o pedido de permissão aparece para você).
4. Conferência só de leitura: migrations iguais nos dois lados; impressão digital do esquema igual no local e no remoto;
   `security_invoker` nas views; **zero** policy de `DELETE`; Production respondendo.
