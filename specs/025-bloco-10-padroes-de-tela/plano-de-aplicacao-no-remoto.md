# Plano de aplicação no remoto — spec 025 (Bloco 10)

> ✅ **PORTÃO 9.4 AUTORIZADO E APLICADO** — *"Portão 9.4 AUTORIZADO: aplique 20261024063555_exclusao_permanente_dos_
> cadastros.sql no remoto com o rito completo"* (Bernardo Villas Boas, 24/10/2026, na conferência parcial do PR #90).
> **Aplicada no remoto em 24/10/2026**, logo depois do backup das 13:05 — o registro está no §7. Ela **altera o que existe**: troca a restrição
> `exclusoes_tabela_permitida` (de 3 para 8 tabelas) e **muda o resultado** de três funções que a tela já usa
> (`app.impedimentos_de_exclusao_do_instrutor`, `…_da_disciplina`, `…_da_unidade_ensino`). E passa a **apagar dado**
> quando chamada — a regra 4 ganha cinco tabelas na exceção.

## 1. A migration

`supabase/migrations/20261024063555_exclusao_permanente_dos_cadastros.sql` — uma só.

| Parte | O quê |
|---|---|
| A | o rastro `exclusoes_registradas` passa a aceitar `turmas`, `feriados`, `regimes_de_horario`, `avaliacoes_curriculo` e `config_listas` (só a sala) |
| B | `app.referencias_por_fk` — a **rede de segurança**: toda FK que aponte para o registro prende a exclusão, inclusive a que nascer depois (lida no catálogo) |
| C | **turma** — `app.registros_da_turma`, os impedimentos (um e em lote) e `app.excluir_turma` |
| D | **linha do calendário** — `app.registros_do_feriado` (semana do DSA **salva ou publicada**, ou lançamento salvo e vivo nela — aula, atividade, a 1ª aplicação, as sessões e a vista da prova —, de turma alcançada, D-11), impedimentos e `app.excluir_feriado` |
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

- **pgTAP `149`** (33 asserções): a turma **só com atribuição** não tem registro (é estrutura); com **um** evento `salvo`
  do DSA, tem; o feriado de **todas** as turmas, na semana salva de uma delas, tem registro; o mesmo evento **não** prende
  o feriado escolhido só para outra turma; a **aula salva sem evento** prende, e em **rascunho** não (a versão só com o
  evento reprova); e a **prova salva sem sessão nem vista** prende pela 1ª aplicação (a versão sem ela reprova — revisão do
  PR #90).
- **RLS `exclusao-de-cadastros.test.ts`** (sessão real): o **Operador** tem `turmas.criar` e é recusado pelo **alcance**
  (`42501`); o **Ajudante** exclui turma e é recusado no calendário e na sala; regime e item — o mesmo id inexistente dá
  `42501` a quem não pode e `P0002` a quem pode (o porteiro vem antes da leitura).
- **E2E `bloco-10.spec.ts`**: a turma com aula tem o ícone desabilitado com a dica; a limpa sai pela ficha e pela linha da
  aba Turmas, conferida no banco (`count` zero e uma linha no rastro); a linha do calendário sem semana salva sai.

## 4. Efeito medido na cópia do remoto

Cópia: **`remoto-20261024-061801.sql`** (24/10/2026) — restaurada no banco **local** por `python -m scripts.manutencao.dado_do_remoto`
(cursos 24, turmas 30, instrutores 181, disciplinas 175, salas 14, aulas 3.749); medição numa transação **desfeita**,
com as funções antigas recriadas em `pg_temp` para o antes × depois.

| Cadastro | Total | Excluíveis depois da migration |
|---|---|---|
| Turmas | 30 | **11** — `C-ApA-PCN-PR-EAD T2 2026`, `C-ApA-PrevMe-PR-EAD T2 2026`, `C-Esp-OpAP T1 2026`, `C-Exp-Metoc-OF-SP 2026`, `C-Exp-Obs-ME T1 2026`, `CAHO 2027`, `EST-QF-APHID 2026`, `EST-QF-MAREFLU 2026`, `EST-QF-NAVFLU-EAD 2026`, `EST-QF-PGRS100 2026`, `EST-QF-PROC-MF-EAD 2026` |
| Linhas do calendário | 32 (25 ativas) | **3** — `FER-000038` (02/11/2026), `FER-000023` (12/11/2026) e `FER-000026` (15/11/2026), em semanas sem nada salvo |
| Regimes de horário | 0 | 0 |
| Itens de avaliação do currículo | 281 | **51** |
| Salas | 14 | **6** — Biblioteca, H11, H36, H38, Sala 00, Sala 05 |

| Impedimento antigo | Total | Excluíveis antes | Excluíveis depois |
|---|---|---|---|
| Instrutor | 181 | 0 | 0 |
| Disciplina | 175 | 0 | 0 |
| Unidade de ensino | 587 | 206 | **176** — as 30 que saem estão ligadas a avaliação do currículo, a FK que a função antiga não conhecia (o `DELETE` esbarraria nela com a frase errada) |

⚠️ **O CRITÉRIO DO CALENDÁRIO MUDOU POR ESTA MEDIÇÃO** (D-11): só com o evento salvo/publicado da trilha do DSA,
**nenhuma** das 32 linhas ficaria protegida — o que existe de antes do Bloco 9 nasce salvo (RP-8) e não tem evento. A
função passou a contar também o **lançamento salvo e vivo** da semana; com isso, **29 de 32** ficam presas. O pgTAP `149`
prova a diferença (a versão só com o evento reprova o caso novo).

## 5. Reversão

`specs/025-bloco-10-padroes-de-tela/reversao.sql` — derruba as funções novas, devolve as três antigas com o **texto
exato** de `20260915140100` e `20260925135044`, e a restrição de 3 tabelas. ⚠️ **Só vale antes da primeira exclusão das
tabelas novas**: com rastro delas, a reversão recusa (o rastro é só de acréscimo) — e recusou de fato, na primeira
tentativa, sobre os 3 rastros que a suíte de ponta a ponta deixou no banco local.

**Prova (24/10/2026, refeita depois da correção da revisão do PR #90, banco local, numa transação desfeita, com os rastros retirados só dentro dela):** a impressão digital
do esquema vai de **2.637 objetos `5ab2b13b…`** (com a migration) a **2.573 objetos `80345112…`** — a mesma do remoto
depois do Bloco 9; o `rollback` devolveu o esquema e os 3 rastros.

## 6. O rito

1. `python -m scripts.manutencao.dado_do_remoto --somente-copia` — o arquivo datado vai citado aqui.
2. `supabase db push --linked --dry-run` — listando **só** `20261024063555`.
3. `supabase db push --linked` (o pedido de permissão aparece para você).
4. Conferência só de leitura: migrations iguais nos dois lados; impressão digital do esquema igual no local e no remoto;
   `security_invoker` nas views; **zero** policy de `DELETE`; Production respondendo.

## 7. A aplicação no remoto — 24/10/2026

Autorização: Bernardo Villas Boas, 24/10/2026, na conferência parcial do PR #90 (citada no topo). CI verde nos três
blocos sobre `dffb593`, o commit que traz a versão final da migration (com a 1ª aplicação da prova no feriado).

1. **Backup:** `python -m scripts.manutencao.dado_do_remoto --somente-copia` →
   **`remoto-20261024-130503.sql`** (4.360 KB, fora do git). O banco local não foi tocado.
2. **Dry-run:** `supabase db push --linked --dry-run` → *"Would push these migrations: •
   20261024063555_exclusao_permanente_dos_cadastros.sql"* — **só ela**.
3. **Aplicação:** `supabase db push --linked` → *"Applying migration 20261024063555_exclusao_permanente_dos_cadastros.sql…
   Finished supabase db push."*, saída 0.
4. **Conferência só de leitura** (`supabase db query --linked`, só `select`; e `supabase migration list --linked`):

| O quê | Medido |
|---|---|
| Migrations | **97 e 97**, nenhuma só de um lado |
| Impressão digital do esquema (`scripts/provas/impressao_digital_do_esquema.sql`) | **2.637 objetos `5ab2b13b…` nos dois** — igual à do banco local com a migration |
| Restrição do rastro | `exclusoes_tabela_permitida` com as **8** tabelas |
| As cinco exclusões | `app.excluir_*` **`SECURITY DEFINER`** e `public.excluir_*` **`INVOKER`** — turma, feriado, regime, item de avaliação do currículo e sala |
| `anon` executa alguma `public.excluir_*` | **0** |
| Views de `public` e `app` sem `security_invoker` | só `vw_instrutor_dados_pessoais`, a exceção nominal de PII |
| Policies de `DELETE` / `DELETE`·`TRUNCATE` para `authenticated` em `public` | **0** / **0** |
| Rastros das tabelas novas | **0** — nada foi excluído |
| Efeito no dado vivo | **3 de 32** linhas do calendário e **11 de 30** turmas livres — o mesmo da cópia medida no §4 |
| Cadastros | 30 turmas, 32 linhas do calendário, 181 instrutores, 7 contas |
| Production | `/login` **200**; `/turmas` **307** para o login |

Reversão: `reversao.sql` (§5), válida enquanto o rastro das tabelas novas estiver vazio — **0** no momento da aplicação.

## 8. A segunda migration — `20261024213231_ano_da_turma_na_carga_do_instrutor.sql`

**Autorização condicional** — *"Se precisar recriar view ou função de carga (ex.: vw_instrutor_carga_*): AUTORIZADO
seguir sozinho com o rito completo SE a medição na cópia do remoto mostrar como único efeito a saída de turmas de outro
ano; qualquer outra diferença, PARE e me mostre."* (Bernardo Villas Boas, 24/10/2026, segunda conferência do PR #90).

**O que muda** (mesmas colunas, mesma ordem, mesmos tipos; `security_invoker` redeclarado — gotcha 10):
`vw_instrutor_carga_prevista.ano` passa a ser o ano da TURMA (era o da janela); `vw_instrutor_carga_anual` soma a
ministrada e a fiscalizada pelo ano da turma do fato (era o da data). A janela continua a mesma — é o período, não o ano.

**Quem lê:** a ficha do instrutor (carga, atribuições, marca "só habilitado", alerta lilás), a coluna *CH do ano* de
Instrutores, o sininho (alerta de carga), a grade de Disciplinas (pela linha da turma, sem ano — não muda).

**Efeito medido** na cópia `remoto-20261024-183028.sql` restaurada no local, antes × depois das duas views, linha a
linha: na prevista, **uma** linha das 113 muda — a atribuição da `CAHO 2027` (instrutor de código 40) de `ano` 2026 para
2027; na anual, só o instrutor 40 — em 2026 a prevista cai de 1.002 para **763** TA (sai a turma de 2027, 239 TA), e
nasce a linha de 2027 com os **239**. A ministrada não muda em linha nenhuma. **É exatamente a saída da turma de outro
ano** (e a chegada dela ao ano dela, que o teste pedido exige: *"em 2027 só a da de 2027"*).

**O caso que discrimina** (pgTAP `150`, 8 asserções): a mesma disciplina numa turma de 2046 e numa de 2047, janela das
duas em 2046, e uma aula da turma de 2047 datada em 2046 — com as views antigas, **5** reprovam (2046 somava as duas
turmas e 2047 ficava vazio); com a migration, 8 de 8. O `094` foi atualizado à regra nova (2 asserções da T011 c).

**Reversão provada** (`reversao-ano-da-turma.sql`, gerado do texto das duas migrations anteriores): com a migration, a
impressão digital do esquema dá 2.637 objetos `7e7eb3d5…`; depois da reversão, **2.637 objetos `5ab2b13b…`** — a do
remoto antes desta migration.

