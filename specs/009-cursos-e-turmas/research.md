# Pesquisa — Fase 0: Épico 5, fatia (a) — cursos e turmas

**Data**: 16/09/2026, revisada em 17/09/2026 (R-13 a R-27) · **Spec**: [spec.md](./spec.md) ·
**Plano**: [plan.md](./plan.md)

Tudo abaixo foi **medido** no banco local povoado (stack do Épico 2, PostgreSQL 17.6) e no código da
`main` em `7b85f27`, não suposto. Cada item traz **Decisão**, **Motivo** e **Alternativas recusadas**.
Onde a decisão mudaria o SQL e depende de Bernardo, ela aponta para o **Lote B** do [plano](./plan.md);
onde não muda o SQL, para o **Lote A**.

> **Respostas de 17/09/2026.** O texto de cada R continua como foi escrito — é o registro de como a
> pergunta foi montada. **O que Bernardo decidiu prevalece sobre a "Decisão proposta"** de cada item:
>
> | Item | Pergunta | Resposta de 17/09/2026 |
> |---|---|---|
> | R-2 | B-3 | recomendação aceita (`FR-017.9`) |
> | R-5, R-16 | B-6 | **B** — PR próprio depois do PR de banco; pendência **T132** da spec 006 |
> | R-7 | B-4 | recomendação aceita (`FR-021.7`) |
> | R-8 | B-5 | ⚠️ **C, não A** — aceita com **aviso** que nomeia as vigências desprotegidas (`FR-021.8`); ver R-8 emendado |
> | R-10 | B-1 | recomendação aceita: sete migrations, em **dois PRs** (A-1, `FR-046.1`) |
> | R-11 | B-2 | A, **com condição**: a chave presente e booleana em toda sala; ausência recusada (`FR-029.7`) |
> | R-13 | B-8 | recomendação aceita (`FR-021.9`) |
> | R-14 | B-9 | A, **com condição** verificada em R-23 (`FR-019.3`, D-20) |
> | R-15 | B-10 | recomendação aceita (`FR-019.4`) |
> | R-17 | B-7 | recomendação aceita (`FR-024.1`) |
> | R-18 | B-19 | A, **com condição**: justificar — justificado no `FR-015.2` |
> | R-20 | B-20 | recomendação aceita (`FR-029.8`) |
> | — | B-15 | ⚠️ **C, não A** — o banco recusa curso sem regime (`FR-019.5`); ver R-24 |
> | — | B-12 | A, **com condições** — confirmação e auditoria; o mecanismo da auditoria abriu a **B-21** (R-22) |
> | — | B-16 | A — `FR-023` **adiado por dado ausente**; o dado medido está em R-25 |
> | R-22 | B-21 | **A** — tabela `curso_sigla_historico`, escrita só por gatilho, sem alteração nem exclusão (`FR-014.1`) |
> | — | sigla no código da turma | decisão sem pergunta: **trocar a sigla não reescreve código de turma**; confirmação diz isso com todas as letras (`FR-014.2`) |
> | R-25 | número do 9º TA | **2** dias por semana sem aviso; aviso a partir do terceiro; `config_parametros` (`FR-023`) — o aviso continua adiado pelo outro dado |
> | R-27 | condição da B-15 | verificação prévia de cursos sem regime na carga do ETL (`FR-019.6`) — **estendida na terceira rodada às dez conferências** |
> | R-26 | B-22 | **A, como recusa** — a mensagem nomeia o curso e até quando; o curso pode voltar a uma sigla sua (`FR-014.3`) |
> | R-22 | achado do `migracao_log` | **anotar a regra 5 do `CLAUDE.md`**, sem corrigir (D-21, `PEND-5a-3`) |
> | R-25 | três escolhas do registro | **confirmadas**: `operacional`, marca `excepcional`, aviso do 9º TA **não** construído aqui |

---

## R-1 · A varredura de consumidores de `app.cursos_do_usuario()`

**Origem**: `FR-017.1`, `FR-017.5`, `FR-017.6` (Q-11 e decisão antecipada, 16/09/2026).

**Medido.** A função é lida, direta ou indiretamente, por:

| Camada | Quantos | Quais |
|---|---|---|
| Funções SQL que a chamam | **3** | `app.alcanca_curso`, `app.alcanca_turma`, `app.alcanca_disciplina` — todas `SECURITY DEFINER` |
| Policies que usam alcance | **46** em **16** tabelas — **15** de leitura e **31** de escrita (`INSERT` e `UPDATE`) | `atividades_nao_letivas`, `avaliacoes`, `avaliacoes_planejadas`, `curso_regime_historico`, `cursos` (só `ler` e `editar` — `criar` não usa alcance), `disciplinas`, `instrutor_disciplina` (só escrita), `janelas_curso`, `planejamento_anual`, `registros_aula`, `reservas_proens`, `responsaveis_curso`, `turma_disciplina`, `turma_disciplina_instrutor`, `turmas`, `unidades_ensino` |
| Views `security_invoker` que leem `cursos` ou `turmas` | **8** | `vw_avaliacoes_situacao`, `vw_carga_horaria_turma`, `vw_cursos_regime_vigente`, `vw_disciplinas_execucao`, `vw_instrutor_carga_prevista`, `vw_instrutor_disciplina_rotulada`, `vw_instrutores`, `vw_turmas_rotulo` |
| Arquivos da aplicação | **5** | ver tabela abaixo |
| Função da fatia (c) chamada pela aplicação | **1** | `public.sincronizar_habilitacoes` (`SECURITY INVOKER` — herda a RLS) |
| Testes que citam a função ou o alcance | **0** | nenhum pgTAP nem teste de RLS nomeia `cursos_do_usuario` ou `alcanca_*` |

**Os 5 arquivos da aplicação e o que muda em cada um:**

| Arquivo | Lê | É lista de escolha? | O que muda |
|---|---|---|---|
| `app/(app)/inicio/page.tsx` | `cursos` (×2, uma é contagem) e `vw_carga_horaria_turma` | Não — é panorama operacional | **Filtra `cursos.status = 'ativo'` explicitamente** e só monta turmas desses cursos. A contagem que distingue "ainda não existe" continua sobre **todos** os cursos. E o link `?turma=` passa a usar a função única (`FR-031.2`) |
| `app/(app)/instrutores/page.tsx` | `cursos` (opções do filtro por curso), `vw_instrutores` (×2), `vw_instrutor_carga_anual` | **Filtro**, não atribuição | Depende da **pergunta A-2** — mostrar curso inativo no filtro (é consulta sobre histórico) ou não |
| `app/(app)/instrutores/novo/page.tsx` | `disciplinas` (já `status = 'ativo'`), `cursos` | **Sim** — painel de habilitação | **Filtra disciplina de curso inativo**: disciplina ativa de curso inativo não pode ser oferecida para habilitação nova |
| `app/(app)/instrutores/[codigo]/page.tsx` | `disciplinas`, `cursos`, `instrutor_disciplina`, `vw_instrutores`, cargas | **Sim**, no modo edição | Mesma regra da linha acima para as opções; as habilitações **já existentes** em curso inativo continuam **exibidas**, só leitura |
| `lib/acoes/instrutor.ts` | `vw_instrutores` (×2), `rpc sincronizar_habilitacoes` | — | Nada na ação; o ajuste é na função SQL — **R-2** |

⚠️ **Achado lateral, registrado e não corrigido:** o ramo do **Encarregado de Curso** em
`app.cursos_do_usuario()` **já não filtra** a situação do curso — lê só `usuario_curso.status`. Hoje,
e só para esse perfil, curso inativo já é alcançável. A mudança do `FR-017.1` **iguala** os demais
perfis a ele, em vez de criar comportamento novo.

**Decisão.** A função deixa de filtrar situação nos três ramos. Nenhuma das 8 views muda: elas
herdam a RLS, e o filtro de "só ativo" vai para **cada consumidor que precisa**, explicitamente, com
o teste de vazamento do `FR-017.6` cobrindo as listas de escolha. As 31 policies de escrita ganham a
condição de curso ativo (**R-3**).

**Motivo.** Um filtro de situação dentro do alcance mistura duas perguntas diferentes — *"pode ver?"*
e *"está em oferta?"* — e foi exatamente essa mistura que escondeu histórico. Separar as duas é o que
o `FR-017.1` pede.

**Alternativas recusadas.** (a) Criar `cursos_do_usuario_incluindo_inativos()` e trocar só as 15
policies de leitura — duplica a regra de escopo em duas funções que podem divergir. (b) Filtrar
"ativo" dentro das 8 views — esconde histórico de novo, pela porta das views.

---

### ⚠️ Adendo de 18/09/2026 — a varredura refeita POR BUSCA, depois das 7 migrations

*(exigência de Bernardo Villas Boas, 18/09/2026: "o rastreio dos consumidores refeito por busca, não
por memória… e diga se algum outro número mudou". A medição original não é reescrita.)*

**Refeita contra dois artefatos, nomeados** (regra 9.2 do `CLAUDE.md`): o **banco local** com as 7
migrations aplicadas, por `pg_proc`/`pg_policy`/`pg_class`; e o **repositório**, por `grep` sobre
`app/`, `lib/`, `components/`, `tests/` e `supabase/tests/`.

| # | O que R-1 mediu | Remedido em 18/09 | Mudou? |
|---|---|---|---|
| 1 | **3** funções SQL, direta ou indiretamente | **3** — `alcanca_curso` chama direto; `alcanca_turma` e `alcanca_disciplina` chegam **através** dela | **não** |
| 2 | **46** policies de alcance em **16** tabelas — 15 de leitura, 31 de escrita | **46** em **16** — 15 e 31, idênticos | **não** |
| 3 | **8** views `security_invoker` | **8**, as mesmas oito | **não** |
| 4 | **5** arquivos da aplicação | **5**, os mesmos cinco | **não** |
| 5 | **1** função chamada pela aplicação | **1** — `sincronizar_habilitacoes` | **não** |
| 6 | **0** testes nomeando a função ou o alcance | **2** — `103_permissoes.sql` e `105_curso_inativo.sql` | **sim**, e os dois **nasceram nesta fatia** |

**Nenhum número de R-1 estava errado, e a lista NÃO cresceu.** A única mudança é a linha 6, e ela é
consequência do próprio trabalho: antes desta fatia nenhum teste nomeava o alcance, e agora dois
nomeiam — que era o buraco que o R-1 registrou ao medir zero.

⚠️ **E a varredura quase produziu um quarto consumidor que não existe.** A busca por `cursos_do_usuario`
em `pg_proc.prosrc` devolve **duas** funções além dela mesma: `app.alcanca_curso` e
`public.criar_curso_com_regime`. A segunda **não a chama** — ela só a **menciona num comentário**, o
que explica por que `INSERT … RETURNING` falhava ali. Removido o comentário antes de comparar
(`regexp_replace(prosrc, '--[^
]*', '', 'g')`), sobra **uma** chamada direta. **É a mesma armadilha do
achado 5 da fatia (b) do Épico 4** — varredura que lê a documentação como se fosse uso —, e desta vez
ela apareceu do lado do SQL. **Toda varredura de consumidor MUST tirar comentário antes de contar.**

**O que a §3 do `data-model.md` reusou errado, e está corrigido lá por adendo:** as **31** policies de
escrita com **alcance** (16 tabelas) não são as **30** que **ganham a condição de oferta** (15 tabelas).
A diferença é exatamente `cursos_editar`, que não a recebe de propósito.

---

## R-2 · `sincronizar_habilitacoes` quebraria no primeiro curso desativado

**Origem**: `FR-017.5`, `FR-017.6`; fatia (c), `FR-009` e `FR-013` da spec 006.

**Medido.** A função inativa toda habilitação **ativa**, de **disciplina ativa**, que não esteja
marcada. Desativar um curso **não** muda a situação das disciplinas dele. Se o painel deixar de
oferecer as disciplinas de curso inativo (**R-1**), elas chegam **desmarcadas**; a função tenta
inativá-las; o `FR-017.5` recusa a escrita em curso inativo; a função compara `row_count` com o
esperado e aborta com *"o seu perfil nao alcanca todos os vinculos desmarcados"*. **Resultado:
qualquer instrutor habilitado num curso desativado não consegue mais salvar as próprias
habilitações.** Hoje não acontece porque nenhum curso está inativo; acontece no primeiro dos 6 que
podem ser desativados.

**Decisão proposta — pergunta B-3**: a função passa a **ignorar disciplina de curso inativo** na
inativação — a habilitação histórica fica como está — e **recusa com mensagem** marcar disciplina de
curso inativo como habilitação nova.

**Alternativas recusadas.** (a) O painel reenviar marcadas as habilitações de curso inativo — a
correção fica na tela, e qualquer outro caminho que chame a função cai no mesmo defeito. (b) Isentar
`instrutor_disciplina` da recusa do `FR-017.5` — abriria habilitação nova em curso fora de oferta.

---

## R-3 · A recusa de escrita em curso inativo e a exceção cirúrgica

**Origem**: `FR-017.4`, `FR-017.5`, `FR-017.7`, `FR-017.8`; Q-11 e Q-11.1.

**Decisão.**

1. **Três funções auxiliares**, `SECURITY DEFINER`, `STABLE`, `search_path = pg_catalog, public`:
   `app.curso_em_oferta(curso_id)`, `app.turma_em_oferta(turma_id)` — **nulo devolve verdadeiro**,
   como `alcanca_turma`, porque atividade de escopo global não tem turma — e
   `app.disciplina_em_oferta(disciplina_id)`.
2. **As 31 policies de escrita** — o `WITH CHECK` do `INSERT` e o `USING` e o `WITH CHECK` do
   `UPDATE` — ganham `and app.<entidade>_em_oferta(...)`, **com uma exceção só**: `cursos_editar`.
3. **`cursos_editar` fica sem a condição**, porque a reativação precisa passar por ela. Quem guarda a
   linha de `cursos` é um **gatilho `BEFORE UPDATE` em `cursos`**, que decide por **valor alterado**,
   não por coluna enviada:
   - se `OLD.status = 'inativo'`: aceita **somente** `NEW.status = 'ativo'` com **todas** as demais
     colunas iguais às de `OLD` (exceto as de auditoria, que `app.set_auditoria()` reescreve) **e**
     `app.pode('cursos','desativar')`; qualquer outra diferença é recusada;
   - se `OLD.status = 'ativo'` e `NEW.status = 'inativo'`: exige `app.pode('cursos','desativar')` **e**
     nenhuma turma `planejada` ou `ativa` do curso (`FR-017.4`), com a mensagem nomeando as turmas;
   - curso **novo** nasce `ativo`: `INSERT` com `status = 'inativo'` é recusado.

   **Emenda de 17/09/2026:** a terceira regra sai do gatilho e vai para a policy `cursos_criar`
   (`with check … and status = 'ativo'`). `WITH CHECK` enxerga a linha nova — não precisa de gatilho —
   e a carga do ETL, que não passa pela RLS, continua podendo trazer da v2.0 um curso que lá esteja
   inativo. No gatilho, ela recusaria o retrato fiel da origem (R-20).

**Motivo.** Policy não enxerga `OLD` e `NEW` (gotcha nº 4), então a exceção "só a situação, só por
valor" **não cabe** numa policy. As 31 policies ficam declarativas e simples; a única regra que
depende do que mudou mora no único lugar que consegue vê-la.

**Alternativas recusadas.** (a) Gatilho de recusa nas 16 tabelas — 16 gatilhos fazendo o que uma
condição de policy faz, e cada um a mais é um que alguém esquece de repetir. (b) Pôr a condição em
`cursos_editar` também e tratar a reativação por função `SECURITY DEFINER` — tira a reativação da
RLS e cria um caminho de escrita que a matriz não enxerga.

**Custo medido.** 31 policies reescritas (`drop policy` + `create policy`, não tabela nem coluna),
3 funções, 1 gatilho. pgTAP: uma asserção negativa por tabela (16) e as do gatilho.

---

## R-4 · A validação de sala: parâmetro, não variante

**Origem**: `FR-029`, `FR-029.4`.

**Medido.** `app.validar_dominio_config_lista()` lê `TG_ARGV[0]` (coluna) e `TG_ARGV[1]` (lista),
aceita vazio e **exige `ativo`**. Está ligada hoje a `registros_aula.tipo_atividade` e,
por gatilhos de mesmo desenho, a `metodologia` e aos tipos de avaliação.

**Decisão.** Um **terceiro argumento opcional**, `TG_ARGV[2] = 'aceita_inativo'`. Sem ele, o
comportamento é o de hoje, byte a byte. O gatilho de `turmas.sala_alocada` passa os três.

**Motivo.** Uma função só, com o comportamento atual como padrão — os gatilhos existentes **não são
recriados** e não mudam. Uma variante copiaria a função inteira para trocar uma linha, e as duas
cópias divergiriam na próxima correção.

**Alternativa recusada.** Função-variante `validar_dominio_config_lista_aceitando_inativo()`.

**"O valor que impede distinguir escolheu de não informou"** — é o `DEFAULT 1` de
`cursos.limite_turmas_ano` e o `DEFAULT 'presencial'` de `cursos.modalidade`. Os dois **saem**
(`FR-003.2`, `FR-015`, `FR-015.1`). Com o `DEFAULT` fora, o gatilho `BEFORE INSERT` do limite recebe
**nulo** quando a pessoa não informou e preenche pela classificação; recebe o número quando ela
escolheu, e o respeita. O `NOT NULL` continua valendo, verificado depois dos gatilhos `BEFORE`.
**Medido**: 0 nulos em `duracao_dias` e em `turmas.modalidade`; 24 de 24 cursos já no limite da
regra.

---

## R-5 · O gerador do código `TDI-`: sequência, e só sequência

**Origem**: `FR-032.2`; instrução de 16/09/2026 — *"MUST usar sequência, nunca `MAX(...)+1`"*.

**Medido.** As 210 linhas usam `TDI-NNNNNN`, a maior é `TDI-000210`, e a coluna **não tem gerador**.

**Decisão.**
- `create sequence app.turma_disciplina_codigo_seq`, e **na migration**, **uma vez**,
  `setval` no maior número gravado.
- `app.proximo_codigo_turma_disciplina()` devolve `'TDI-' || lpad(nextval(...)::text, 6, '0')` —
  **nada mais**. Nenhuma leitura de `MAX` em tempo de execução.
- `default` da coluna `codigo` aponta para a função.

**Por que duas criações simultâneas não colidem.** `nextval` é atômica e **não transacional**: cada
chamada devolve um valor que nenhuma outra sessão recebe, mesmo que as duas transações estejam
abertas ao mesmo tempo e mesmo que uma delas faça `rollback`. Duas turmas criadas no mesmo instante,
cada uma fazendo nascer 22 linhas, recebem 44 códigos distintos. O custo aceito é **buraco** na
numeração quando uma transação é desfeita — o código identifica, não conta.

**O caso que a sequência sozinha não cobre, e onde ele é resolvido.** Carga do ETL **depois** das
migrations — é o que acontece a cada `pnpm db:reset` e é o que vai acontecer na carga de produção —
grava códigos explícitos e deixa a sequência para trás. Aí a colisão acontece, **alta e com erro**
(`23505` em `turma_disciplina_codigo_key`), nunca em silêncio. A correção mora **no ETL**: um passo
final que faz `setval` de cada sequência de código para o maior valor carregado. E um pgTAP garante
a invariante: *a sequência nunca está atrás do maior código gravado*.

⚠️ **Achado na fatia (c) — pergunta B-6.** `app.proximo_codigo_vinculo()` e
`app.proximo_codigo_instrutor()` fazem exatamente o `MAX+1` recusado aqui: `nextval`, depois
`max(...)`, e, se a sequência estiver atrás, **`v_maior + 1`**. Duas sessões simultâneas com a
sequência atrás leem o mesmo `max` e devolvem o **mesmo** código. É raro (só depois de carga) e
barulhento (a `unique` recusa), mas é o padrão que esta decisão proíbe, e os dois conviveriam.

**Alternativas recusadas.** (a) Copiar o padrão `VIN-` — é o `MAX+1`. (b) `lock table` para
serializar — trava a tabela inteira para gerar um número. (c) `uuid` como código — o formato
`TDI-NNNNNN` é o real da base.

---

## R-6 · O gatilho de `turma_disciplina` roda com os direitos do dono

**Origem**: `FR-032`, `FR-032.2`.

**Medido.** A policy `turma_disciplina_criar` exige `app.pode('disciplinas','editar')` e o alcance da
turma. Os quatro perfis que criam turma — Admin, Encarregado, Ajudante e Operador — têm
`disciplinas.editar` hoje, e é **só por isso** que criar turma funcionaria com o gatilho rodando com
os direitos de quem cria.

**Decisão: `SECURITY DEFINER`, com `search_path = pg_catalog, public` travado.** A função
`app.fazer_nascer_disciplinas_da_turma()` é gatilho `AFTER INSERT` em `turmas`; `revoke all` de
`public`, `anon` e `authenticated` — função de gatilho não é chamável fora do gatilho, e a revogação
deixa isso escrito.

**Motivo.** As linhas são **consequência estrutural** da turma, não escrita discricionária: a
autorização que importa já foi decidida quando a policy `turmas_criar` aceitou a turma — perfil,
alcance e curso em oferta. A função **não recebe parâmetro de ninguém**: lê só `NEW.id`, `NEW.curso_id`
e a janela de `NEW`, e as disciplinas ativas daquele curso. Com direitos do chamador, retirar
`disciplinas.editar` de um perfil — uma linha de `perfil_permissao`, decisão de negócio legítima —
**quebraria a criação de turma** sem que ninguém ligasse uma coisa à outra. A auditoria não perde o
autor: `app.set_auditoria()` lê o usuário da sessão pelo JWT, que continua o mesmo dentro da função.

**Alternativas recusadas.** (a) Direitos do chamador — o acoplamento medido. (b) Conceder
`disciplinas.editar` a quem cria turma por regra — amarra permissão de uma área a outra.

---

## R-7 · A corrida entre "Corrigir esta vigência" e um lançamento novo

**Origem**: `FR-021.3` (Q-06.1).

**Medido.** `registros_aula` e `avaliacoes` têm FK para `cursos(id)` **e** para `turmas`;
`atividades_nao_letivas` tem FK **só para `turmas`**; atividade de escopo global tem `turma_id` nulo
e **não referencia linha nenhuma**.

**Decisão.** A correção roda numa função (`public.corrigir_vigencia_regime`, `SECURITY INVOKER`)
que, **antes** de conferir se há lançamento, trava nesta ordem:

1. as **turmas do curso**, em ordem de `id`, `FOR UPDATE`;
2. a **linha do curso**, `FOR UPDATE`;
3. a trava de aconselhamento **compartilhada** `pg_advisory_xact_lock_shared(<chave da atividade global>)`;
4. a **linha da vigência**, `FOR UPDATE`.

A trava 1 e 2 é feita por uma auxiliar `SECURITY DEFINER` (`app.travar_curso_para_correcao`), para
travar **todas** as linhas do curso independentemente do que a RLS deixa a pessoa ver.

**Como isso fecha a corrida.** Inserir lançamento numa tabela com FK exige `FOR KEY SHARE` na linha
referenciada, e `FOR KEY SHARE` **conflita** com `FOR UPDATE`. Então: se a aula entrou antes, a
correção **espera** ela terminar e, na consulta seguinte — cada comando de função `VOLATILE` em
`READ COMMITTED` tira um retrato novo —, **enxerga** a aula e recusa. Se a correção entrou antes, a
aula **espera** a correção terminar e é gravada já sob a vigência corrigida. Para a atividade
**global**, que não tem FK para travar, um **gatilho novo em `atividades_nao_letivas`** pega a mesma
chave em modo **exclusivo** quando `turma_id` é nulo — duas correções não se bloqueiam entre si; uma
atividade global bloqueia e é bloqueada por qualquer correção — **pergunta B-4**, porque toca tabela
do Épico 9.

**Riscos que ficam, declarados.**
- **Impasse**: um lançamento pode travar a turma antes do curso, e a correção trava o curso depois
  da turma. O PostgreSQL detecta e aborta uma das duas (`40P01`); a Server Action traduz em
  *"outra gravação no mesmo curso aconteceu ao mesmo tempo; tente de novo"*. Com dezenas de usuários
  e correção rara, é o preço aceitável de não pôr gatilho em cada tabela de lançamento.
- **Mudança de data de um lançamento já existente**, sem mudar FK, não pega trava. O lançamento
  movido para dentro da vigência durante a correção fica sob a vigência **corrigida** — que é a que
  vale a partir dali; nada que já tinha sido emitido naquela data é reinterpretado.

**Alternativas recusadas.** (a) `SERIALIZABLE` — não se liga de dentro de uma função chamada pelo
PostgREST. (b) Gatilho com trava de aconselhamento nas três tabelas de lançamento — fecha também o
impasse, mas põe gatilho em tabelas dos Épicos 6, 8 e 9 para servir a uma ação desta fatia; fica
como evolução se o impasse aparecer medido.

**A mudança de data de início na correção.** A correção pode mudar qualquer parâmetro, inclusive
`vigente_de`. A conferência de lançamento usa a **menor** entre a data antiga e a nova, e a vigência
anterior tem o `vigente_ate` recalculado. Isso não abre regra nova: é o `FR-021.2` aplicado à janela
que a correção de fato mexe.

---

## R-8 · Editar a janela de uma turma depois de existir atividade global

**Origem**: `FR-021.5`; ponto registrado para o plano em 16/09/2026.

**Análise.** A atividade global só é **a** trava de uma vigência quando a turma alcançada **não tem
lançamento próprio** naquele período — se tivesse, a aula dela já travaria pelo `FR-021.2`, e a
janela não importaria. Nesse caso, encurtar a janela para excluir a data **declara** que a turma não
estava em curso nela; e o efeito da atividade global sobre a turma é **calculado pela mesma janela**.
Os dois somem juntos: não sobra nada da turma interpretado pelo regime daquela data para ser
reescrito.

**Decisão proposta — pergunta B-5: nenhum mecanismo de banco**, e um teste que prove que encurtar a
janela retira ao mesmo tempo o alcance da atividade e o efeito dela sobre a turma.

**Alternativa recusada.** Gatilho em `turmas` recusando encurtar janela com atividade global dentro —
bloqueia a correção de uma data errada por causa de uma atividade que, pela própria correção, não se
aplicava à turma.

**Emenda de 17/09/2026 — Bernardo escolheu a C, não a A.** *"Encurtar a janela não pode soltar a trava
em silêncio: seria recriar pela porta dos fundos a falsa garantia que a Q-06.3 mandou eliminar."* A
análise acima continua certa sobre **o que** acontece — alcance e efeito somem juntos —; o que ela não
pesava é que **quem edita a janela não vê isso acontecer**. O desenho passa a ser:
- a edição **grava**, nunca é recusada;
- no diálogo de salvar, o aviso **nomeia as vigências que deixam de ficar protegidas**, com a atividade
  e a data (`FR-021.8`);
- vale também para **mudar o curso** da turma — a turma deixa de alcançar as vigências do curso de
  origem pelo mesmo mecanismo;
- a leitura é uma RPC `SECURITY DEFINER` com porteiro, `protecao_das_vigencias_por_atividade_global`,
  que devolve o fato no carregamento da ficha; a função pura `lib/dominio/protecao-de-vigencia.ts`
  recalcula com a janela que a pessoa está digitando. Nada no gatilho muda: a trava continua sendo só do
  banco.

---

## R-9 · Turma por endereço direto: "não encontrada" e "sem permissão" juntos

**Origem**: `FR-031.4`, com a ponderação registrada em 16/09/2026.

**Decisão.**
- **Perfis de alcance total** (Admin, Chefe do Departamento, Encarregado e Ajudante das duas divisões,
  Visualização): **"Turma não encontrada"** — é certeza, como na ficha do instrutor, porque esse
  perfil veria a turma se ela existisse.
- **Perfis com recorte** (Operador fora de `geral`, Encarregado de Curso): **uma mensagem só**,
  *"Turma não encontrada ou fora do seu alcance"*. Nenhuma conferência de existência fora da RLS.
- **Listas**: os três estados continuam distintos — *não há*, *você não vê*, *ainda não existe*.

**Motivo.** Para quem tem recorte, distinguir **confirmaria a existência** de um registro a quem não
tem direito a ele — a ponderação do `FR-031.4`. Para quem tem alcance total, não há o que confirmar.
A diferença entre as duas mensagens depende **só do perfil**, nunca da turma — e por isso não revela
nada. **Não há SQL novo.**

**Alternativa recusada.** Função de existência `SECURITY DEFINER` — expõe exatamente o que a
ponderação manda não expor, e seria migration para servir a uma mensagem.

---

## R-10 · A migration continua única? Não: sete, em ordem

**Origem**: `FR-046`, `SC-011` (dizem **uma**); Princípio VI (*"uma fatia = uma migration coesa"*);
precedente da fatia (c), **9** migrations.

**Decisão proposta — pergunta B-1: sete migrations, nesta ordem.**

| # | Migration | Por que nesta posição |
|---|---|---|
| 1 | Salas: lista, reconciliação e validação | independe de tudo; é a única que **altera dado** de turma e **aborta** se achar sala sem correspondência — melhor abortar antes de qualquer outra mudança |
| 2 | Curso: obrigatórios, padrões, limite pela classificação, recusa de `ead_semipresencial` | independe; muda colunas de `cursos` e `turmas` antes que os gatilhos das próximas as leiam |
| 3 | Turma: código gerado e rótulo único com vazio igual | o gatilho do código precisa de `cursos.codigo`; o de `turma_disciplina` (4) depende de o `INSERT` em `turmas` já estar formado |
| 4 | `turma_disciplina` nasce com a turma, e a sequência `TDI-` | `AFTER INSERT` em `turmas`, depois do código |
| 5 | Permissões: `horarios`, `turmas.criar` do Operador, `desativar` em `cursos` | as policies da 6 e o gatilho da 7 consultam essas linhas |
| 6 | Vigência de regime: imutabilidade, sucessão, correção com trava, gerador `REG-`, unicidade por início só das ativas (R-13 a R-15) | usa `horarios` (5) |
| 7 | Curso inativo: alcance sem filtro, 31 policies de escrita, gatilho de `cursos`, ajuste de `sincronizar_habilitacoes` | **maior raio de efeito** — por último, com a varredura dos consumidores no mesmo PR |

**Motivo.** São **sete preocupações independentes**, e cada uma tem o **seu** plano de reversão: a 1
desfaz um `UPDATE` de dado; a 7 desfaz 31 policies; nenhuma das duas deveria depender de reverter a
outra. O `supabase db push` aplica cada arquivo na **sua** transação — com um arquivo só, uma falha
na parte de regime desfaz também a reconciliação de salas que tinha dado certo; com sete, a falha
para na migration que falhou, e as anteriores ficam válidas porque a ordem acima garante que cada
uma deixa o banco num estado coerente. O Princípio VI pede migration **coesa e revertível** — sete
coesas atendem melhor que uma que mistura sete assuntos. A fatia (c) já fez 9 pelo mesmo motivo.

⚠️ **Isto contraria a letra do `FR-046` e do `SC-011`** ("exatamente uma"), que são decisão de
Bernardo — por isso vai ao Lote B, e não é aplicado por conta própria.

**Alternativa recusada.** Uma migration só: um plano de reversão para sete assuntos, e uma falha em
qualquer um desfaz os outros seis.

---

## R-11 · A distinção entre sala física e ambiente virtual

**Origem**: `FR-029.1`, `FR-029.6`.

**Medido.** `config_listas` tem `lista`, `valor`, `rotulo_exibicao`, `ordem`, `ativo`, `observacao` —
nenhum campo de metadado.

**Decisão proposta — pergunta B-2:** coluna **`metadados jsonb not null default '{}'`** em
`config_listas`, com `CHECK` que, **só para `lista = 'salas'`**, exige a chave `ambiente_virtual` do
tipo booleano. As 8 salas entram com a chave preenchida — 7 `false`, Moodle `true`.

**Motivo.** O atributo fica **no próprio registro**, explícito em **toda** sala (`FR-029.6`), e o
banco recusa sala sem ele. O `default '{}'` só vale para as outras listas, onde a chave não existe e
não significa nada — para salas, o `CHECK` impede o padrão silencioso.

**Alternativas recusadas.** (a) Lista irmã só com os virtuais — sala física inferida pela ausência,
que o `FR-029.1` já recusa. (b) Duas listas, `salas_fisicas` e `ambientes_virtuais` — a validação da
turma teria de olhar duas listas, e renomear a natureza de uma sala viraria mover valor entre listas.
(c) Coluna `ambiente_virtual boolean` — atributo de sala numa tabela de todas as listas.

---

## R-12 · Estimativa de tamanho, medida contra a fatia (c)

**A régua.** `specs/006-cadastro-de-instrutores/tasks.md` e o PR #16 (`7b85f27`):

| Medida | Fatia (c) |
|---|---|
| Tarefas **planejadas** (fases 1 a 8 e 9) | **90** |
| Tarefas **surgidas** na verificação (fases 8.1 a 8.4) | **42** — **+47%** sobre o planejado |
| Tarefas totais | **132** |
| Migrations | **9** |
| Arquivos pgTAP / asserções | **5** / **59** (soma dos `plan()` de 094 a 098) |
| Arquivos de teste de unidade / ponta a ponta | **22** / **3** |
| Arquivos em `app/` / em `lib/dominio/` | **27** / **12** |
| Arquivos no PR | **103** (+13.620 linhas) |

**Esta fatia, planejada.** Contada por unidade de trabalho no [plano](./plan.md) §*Tamanho*:
**~135 tarefas planejadas**, **7 migrations**, **7 arquivos pgTAP novos** (~95 asserções — as 31
policies e as 16 tabelas pesam) **e 16 arquivos de teste existentes a ajustar** (R-21), **~10 módulos
de domínio**, **~32 arquivos em `app/`**, **~6 especificações ponta a ponta**, **2 passos novos no
ETL** (R-16, R-20), **~125 arquivos no PR**.

**Projeção com a razão medida da (c).** 135 × 1,47 ≈ **198 tarefas** ao final — **maior que a
(c)** por qualquer das medidas que importam, exceto o número de migrations.

**Linha de corte aplicada (`FR-009.1`).** Sai **só** o progresso por disciplina do `FR-009`:
**5 tarefas planejadas** (função pura e teste, consulta e componente da grade, asserção ponta a
ponta), **~7** na projeção. **Depois do corte: ~130 planejadas, ~191 projetadas — continua maior que
a (c).**

**Atualização de 17/09/2026:** esta seção dizia ~127 planejadas e ~187 projetadas. R-19 a R-21, medidos
depois, acrescentaram o ajuste dos testes existentes, os dois passos do ETL e a RPC de registro.

**Quinta atualização de 17/09/2026, pela decomposição do `tasks.md` (achado 3 do analyze):** **212** tarefas —
**110** no PR 1, **102** no PR 2 —, e **17** testes existentes a ajustar. As estimativas abaixo ficam como registro
do que o plano previa; a diferença está explicada no `tasks.md` §*Medida honesta*.

**Quarta atualização de 17/09/2026, com a terceira rodada:** **~149 planejadas**, **~144 depois do corte**;
**~219** e **~212** projetadas. Somou **+2**, no PR 1: a extensão da verificação prévia às dez conferências e a
prova de cada uma. A B-22 já estava contada pela recomendação, que foi a escolhida.

**Terceira atualização de 17/09/2026, com a segunda rodada:** **~147 planejadas**, **~142 depois do
corte**; **~216** e **~209** projetadas. Somaram, todas no PR 1: a verificação prévia e a prova dela
(`FR-019.6`, +2), o parâmetro do 9º TA (+1) e a sigla reservada (B-22 pela recomendação, +1). A auditoria
da sigla já estava contada.

**Segunda atualização de 17/09/2026, com as respostas ao lote:** **~143 planejadas**, **~138 depois do
corte**; **~210** e **~203** projetadas. Somaram: o aviso de vigências desprotegidas (B-5 na opção C, +4),
o curso sem regime recusado (B-15 na opção C, +2), a confirmação da sigla e a auditoria dela (B-12 e B-21
pela recomendação, +3); caiu uma, com a confirmação só no que é difícil de desfazer (A-9, −1). A divisão
nos **dois PRs** está no plano, §*Entrega em dois PRs*. Nada mais é cortado (`FR-009.1`: *"nada mais é cortado no lugar dele"*). A entrega em dois
PRs, sem cortar escopo, é a **pergunta A-1**.

---

## R-13 · A unicidade por data de início impede "Corrigir esta vigência"

**Origem**: `FR-021.1`.

**Medido.** Além da `EXCLUDE regime_sem_sobreposicao`, que **já** ignora as canceladas
(`WHERE status = 'ativo'`), `curso_regime_historico` tem `regime_unico_por_inicio UNIQUE (curso_id,
tipo_regime, vigente_de)` — **sem** filtro de situação. O caso mais comum da correção é mudar um
parâmetro **mantendo a data**: cancela a vigência e grava a sucessora com o **mesmo** `vigente_de`.
A cancelada continua na tabela (append-only), e a sucessora colide com ela: `23505`. **A ação do
`FR-021.1` falharia na primeira vez que alguém corrigisse um horário.**

**Decisão proposta — pergunta B-8:** trocar a restrição por **índice único parcial** `WHERE status =
'ativo'`, com o mesmo nome. A garantia para as ativas continua declarativa e visível no catálogo; as
canceladas ficam como histórico.

**Alternativas recusadas.** (a) Proibir a correção de manter a data — o formulário pré-preenchido do
`FR-021.1` deixaria de servir ao caso para que existe. (b) Retirar a restrição e confiar na `EXCLUDE`
— ela cobre o caso, mas duas garantias sobre a mesma coisa, uma declarativa e simples, valem o custo
de um índice numa tabela de 29 linhas.

---

## R-14 · O código da vigência não tem gerador, e o prefixo é o mesmo de outra tabela

**Origem**: `FR-019`, `FR-021.1`.

**Medido.** `curso_regime_historico.codigo` é `not null`, **sem `default`**, e as 29 linhas vão de
`REG-000001` a `REG-000029` (6 dígitos). `registros_aula.codigo` usa **o mesmo prefixo** com 4
dígitos, de `REG-0176` a `REG-1929`. Registrar ou corrigir vigência pela tela **exige** um gerador:
sem ele, a Server Action teria de inventar o código, que é exatamente o que as fatias anteriores
tiraram da aplicação.

**Decisão proposta — pergunta B-9:** sequência própria, no padrão do R-5 — `nextval` e nada mais —,
no **formato real da base** (`REG-` e 6 dígitos). A coincidência de prefixo fica **registrada, não
corrigida**: as `unique` são por tabela, então o banco não confunde; quem lê um código solto pode.

**Alternativa recusada.** Prefixo novo para as vigências que nascerem na v2.1 — a mesma tabela
passaria a ter dois formatos, e o `RN-CRUD-03` fala de **um** prefixo por entidade.

---

## R-15 · Vigência nova com data no passado reinterpretaria lançamento já gravado

**Origem**: `RN-2027-09` (*Risco: Alto*); `FR-019`, `FR-021.2`.

**Medido.** O texto da regra, conferido no documento 04 em 16/09/2026: *"a mudança **nunca altera a
interpretação de registros já lançados** sob a configuração anterior"*. A spec impõe isso à
**correção** (`FR-021.2`: pelo fato) e prova a vigência **futura** (`FR-019`, `SC-006`), mas **não
diz** o que acontece quando alguém registra uma vigência **nova** com `vigente_de` **anterior** a
lançamentos que já existem sob a vigência que ela sucede. Nada no banco impede hoje: a sucessora
entra, fecha a anterior antes daquelas aulas, e o DSA delas passa a ser recalculado com o regime
novo — **em silêncio**.

**Decisão proposta — pergunta B-10:** um gatilho `BEFORE INSERT` **recusa** a vigência nova quando
existir lançamento **do curso**, nas três tabelas do `FR-021.2`, com data **dentro do período dela** —
igual ou posterior ao `vigente_de` e, se houver `vigente_ate`, até ele —, o mesmo critério
de fato, a mesma função (`app.lancamentos_que_travam_vigencia`), a mesma mensagem do `FR-021.4`, e
**a mesma trava do R-7** antes de conferir — senão a corrida da Q-06.1 reabre por este caminho. O
caminho que a mensagem oferece: escolher a data **seguinte** ao último lançamento. Vigência com data
**futura**, o caso do `SC-006`, nunca encontra lançamento e passa sem custo além da trava.

⚠️ **Isto não é regra nova; é a `RN-2027-09` imposta onde a spec não chegou.** Mas a spec não a
escreve para este caminho, e só Bernardo decide se o banco passa a recusar — por isso é pergunta, e
não decisão do plano.

**Alternativas.** (b) Aceitar com **aviso** na confirmação — deixa a reinterpretação possível, com a
informação na tela. (c) Manter como hoje — nenhuma proteção.

---

## R-16 · A carga do ETL deixa as sequências de código para trás

**Origem**: `FR-032.2`; R-5.

**Medido.** `scripts/etl/` **não** tem `setval` nem `nextval` em nenhum arquivo. As duas sequências
da fatia (c) só funcionam depois de uma carga porque os geradores têm o recurso `MAX+1` (R-5). Com
as duas sequências novas desta fatia — `TDI-` e `REG-` —, que **não** têm esse recurso por decisão,
criar turma logo depois de `pnpm db:reset` e da carga devolveria `TDI-000001` e colidiria.

**Decisão:** o ETL ganha um **passo final** que avança cada sequência de código para o maior valor
carregado, e o pgTAP ganha a invariante *"nenhuma sequência de código atrás do maior código gravado"*,
que reprova com base povoada se o passo faltar. **Isto é necessário para esta fatia funcionar**, e
não depende do B-6: o passo cobre as quatro sequências, e o B-6 só decide se o recurso `MAX+1` da
fatia (c) sai.

---

## R-17 · A linha `horarios` do seed: o documento 01 ou só o que o `FR-024` usa

**Origem**: `FR-024`; D-1; documento 01 §2.5.

**Medido.** A matriz do documento 01 dá a `horarios`: `LCED` a Admin, Encarregado e Ajudante da
Divisão; `LCE` ao Operador; `L` aos outros cinco. O seed não tem o recurso. O `FR-024` pede *"as ações
que registrar e corrigir vigência exigem"* — `criar` e `editar` — e mantém a **leitura** de
`curso_regime_historico` em `cursos.ler`. Então `horarios.ler` e `horarios.desativar` **não são lidos
por policy nenhuma** desta fatia.

**Decisão proposta — pergunta B-7:** semear a **linha inteira** do documento 01 — 9 `ler`, 4 `criar` e
`editar`, 3 `desativar`. O documento 01 §2.5 diz que *"cada célula preenchida vira uma linha"*, e a
D-1 foi fechada com *"o seed se corrige"*. As linhas sem leitor ficam declaradas.

**Alternativa.** Só `criar` e `editar` para os quatro — o mínimo que a fatia usa, e o seed continua
divergindo do documento 01 em 12 células.

---

## R-18 · `cursos.prioridade_alocacao` tem valor-padrão

**Origem**: `FR-013`, `FR-015.1`.

**Medido.** `prioridade_alocacao` é `not null default 'carga_restante_por_dia_util'`. O `FR-015.1`
proíbe *"valor-padrão silencioso em campo que a pessoa deveria escolher"*. O `FR-013` lista os campos
do cadastro pelo `RF-CURSOS-01` — nome, classificação, limite, duração, modalidade, propósito — e
**não** inclui o critério de prioridade, que é do motor preditivo do Épico 7.

**Decisão proposta — pergunta B-19:** **manter** o padrão. Não é campo que a pessoa escolhe nesta
fatia; retirá-lo obrigaria o formulário a perguntar algo que o requisito não lista. Registrado para
que o Épico 7 decida quando a escolha existir.

---

## R-19 · A sucessão de vigência é explícita — um gatilho automático quebraria o Épico 1

**Origem**: `FR-019`, `FR-020`; `supabase/tests/040_vigencia.sql` (Épico 1, T038).

**Medido.** O `040_vigencia.sql` tem duas asserções que **provam** a `RN-2027-09` como ela foi
implantada: *"dois regimes do MESMO tipo com períodos sobrepostos são recusados"* e *"`vigente_ate`
NULO é infinito: data futura também conflita"* — as duas esperam `23P01` num `INSERT` de vigência
nova enquanto a anterior está aberta. O comentário do arquivo diz o porquê: na v2.0 *"nada impedia
cadastrar dois regimes vigentes ao mesmo tempo, e a função de resolução escolhia um dos dois EM
SILÊNCIO"*.

**O primeiro desenho desta pesquisa, descartado:** um gatilho `BEFORE INSERT` que
fechasse sozinho a vigência aberta. Ele faria as duas asserções **reprovarem** — o `INSERT` passaria
a ser aceito — e trocaria o silêncio antigo por outro: uma data digitada errado viraria **sucessão**,
encerrando o regime vigente sem ninguém ter pedido.

**Decisão.** Sucessão **explícita**:
- **`public.registrar_vigencia_regime(curso_id, vigencia)`**, `SECURITY INVOKER`: trava o curso (R-7),
  grava o `vigente_ate` da anterior e insere a nova, **numa transação**. É o caminho da tela.
- **`INSERT` solto** que se sobreponha continua **recusado** pela `EXCLUDE` — o `040` fica verde sem
  ser tocado.
- **"`vigente_ate` só quando a sucessora entra"** (`FR-020`) é imposto por **qualquer caminho** com um
  gatilho **de restrição adiado** (`CREATE CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED`): ao
  fim da transação, toda vigência ativa com `vigente_ate` precisa ter a sucessora ativa começando no
  dia seguinte. Fechar uma vigência sem sucessora é recusado **no `COMMIT`**; fechar e inserir na
  mesma transação passa.
- A **correção** (`corrigir_vigencia_regime`) usa a mesma peça: cancela, reajusta o `vigente_ate` da
  anterior se a data mudou, insere — e o gatilho adiado confere o encadeamento no fim.
- A **carga do ETL** insere as vigências da v2.0, com os `vigente_ate` que tiverem, numa transação só
  — e o gatilho adiado confere o encadeamento da base inteira no `COMMIT`. Hoje há **0**
  `vigente_ate` e **0** sucessões.

**Alternativa recusada.** O gatilho automático — pelos dois motivos acima.

---

## R-20 · A carga do ETL passa pelos gatilhos novos, e um deles a derruba

**Origem**: `FR-029.3`, `FR-025.1`, `FR-032.2`; `scripts/etl/ordem.py`, `scripts/etl/promover.py`.

**Medido.** A promoção do ETL faz `insert into public.<tabela>` comum — **todo gatilho dispara** —,
e `pnpm db:reset` aplica as migrations **antes** da carga. Com as migrations desta fatia:

| Gatilho novo | Efeito na carga, medido contra a ordem de carga e a base de 16/09/2026 |
|---|---|
| sala contra a lista | ❌ **aborta**: as 9 turmas chegam com `Laboratório de informática`, e a reconciliação da migration rodou sobre base **vazia** |
| código de turma | ✅ os 28 códigos seguem `sigla [rótulo] ano` (28 de 28) |
| `turma_disciplina` nasce com a turma | ✅ `turmas` é carregada **antes** de `disciplinas` — o gatilho não encontra disciplina e cria **zero** linhas; as 210 entram depois, sem colisão. ⚠️ Mudar a ordem de carga quebra isto, e o comentário da ordem precisa dizer |
| obrigatórios de `cursos` e `turmas` | ✅ 0 nulos |
| vigência (R-15, R-19) | ✅ vigências entram antes de qualquer lançamento; encadeamento conferido no `COMMIT` |
| curso nasce ativo | ✅ só se ficar na policy (emenda do R-3); no gatilho, abortaria curso inativo vindo da v2.0 |

**Decisão proposta — pergunta B-20:** o ETL aplica **a mesma lista de substituições** que a migration
registra, e grava o evento em `migracao_log` com a ação **`corrigido`**, que já existe no tipo e já
tem 99 linhas na base — nenhum valor novo de `acao_migracao`. A origem continua rastreável, e a base carregada fica
igual à que a migration produz sobre dado já presente. A invariante I-1 (*"nenhuma sala de turma fora
da lista"*) reprova, com base povoada, se as duas listas divergirem.

**Alternativas.** (b) Catraca no gatilho de sala — aceitar valor fora da lista em linha migrada
(`origem_migracao_v1` preenchida), como a das UEs do Épico 2 — deixa `Laboratório de informática`
gravado para sempre nas 9 turmas, contra a reconciliação que o `FR-029.3` manda fazer. (c) Não tratar —
a carga local e a de produção abortam.

⚠️ Bernardo ratificou em 08/09/2026 que *"o ETL deve ser o retrato fiel da origem, sem preenchimentos
inventados"*. A substituição **não inventa** valor — é a grafia da mesma sala, já decidida no
`FR-029.3` —, mas **é** transformação na carga, e por isso é pergunta.

---

## R-21 · Os testes que já existem e que as restrições novas derrubam

**Origem**: `FR-015`, `FR-025.1`, `FR-029`; Definition of Done.

**Medido no repositório em 17/09/2026:**

| Onde | Quantos | Por que quebram |
|---|---|---|
| `supabase/tests/*.sql` que inserem `cursos` ou `turmas` | **12** arquivos (8 inserem `turmas`) | `cursos` sem `modalidade` nem `duracao_dias`; `turmas` sem `modalidade`; códigos de amostra fora do formato — `'UNI-A 2026 T1'`, `'COND-A 2026'` com rótulo `T1` — que o gatilho **recusa** |
| `supabase/tests/040_vigencia.sql` | 1 | **não quebra** com o desenho do R-19; quebraria com o gatilho automático |
| `tests/invariantes/rls/rls.test.ts` e as amostras de ponta a ponta (`instrutores-de-teste.ts`, `panorama-de-teste.ts`, `convite.spec.ts`) | **4** arquivos | as mesmas amostras de `cursos` e `turmas` |

⚠️ **Um deles passaria a mentir, e sem reprovar.** O caso *"visualizacao não cria curso"* do
`rls.test.ts` insere `{ codigo, nome_curso, classificacao }` e só confere `error not null`. Depois da
migration 2, o erro passa a ser **`23502`** (falta `modalidade`) — **antes** da RLS ser consultada. O
teste continua verde com a RLS desligada. A correção é mandar a linha **completa** e exigir `42501`.
É a mesma classe do achado 4 da fatia (c) do Épico 4: um percurso que não prova nada.

**Adendo de 17/09/2026 (achado 3 do analyze):** são **17**, não 16 — `supabase/tests/010_estrutura.sql` afirma
27 tabelas e a `curso_sigla_historico` (B-21) faz 28; passa a comparar conjunto de nomes com o BRIEF (T029, T030).

**Custo, contado no tamanho (plano §Tamanho):** 16 arquivos de teste existentes a ajustar, **antes**
de qualquer asserção nova, na mesma migration que os quebra.

⚠️ **Correção de 17/09/2026:** o `040_vigencia.sql` **é** um dos 12 — ele insere
`cursos (id, codigo, nome_curso, classificacao)` sem modalidade nem duração, e a migration 2 o derruba.
O que **não** muda nele são as **asserções**: a amostra de curso ganha os dois campos, e as seis
verificações de vigência continuam idênticas (R-19). A frase anterior, *"não quebra"*, valia só para as
asserções.

---

## R-22 · A auditoria da troca de sigla não tem onde morar — pergunta B-21

**Origem**: `FR-014.1` (B-12, condição de 17/09/2026: *"MUST ficar registrada em auditoria"*).

**Medido em 17/09/2026.**
- As **27** tabelas do banco **não** incluem tabela de auditoria de alterações.
- A "auditoria" do projeto é o **quarteto** `criado_por`/`criado_em`/`editado_por`/`editado_em`, preenchido
  por `app.set_auditoria()` (`CLAUDE.md`, *Convenções de banco*). Ele diz **quem fez a última edição e
  quando** — e só isso: **não** guarda o valor anterior, **não** diz qual coluna mudou, e a edição
  seguinte **sobrescreve** o autor.
- O recurso `auditoria` da matriz existe (`ler` para Admin, Chefe do Departamento, Encarregado e
  Ajudante da Divisão) e guarda **só** `migracao_log` e `arquivo_avaliacoes_v1` — registro da **migração**,
  não de uso.

**Consequência.** Com o que existe, uma troca de `C-Ap-FR` para outra sigla fica registrada como *"o
curso foi editado por X em tal data"* até a próxima edição de qualquer campo, e depois some. A sigla
antiga não fica em lugar nenhum — **nem** nas turmas, que só a carregam dentro do código.

**Por que é pergunta, e não decisão do plano.** A forma que atende a condição inteira é uma **tabela nova**,
e o `FR-046` — decidido por Bernardo — diz *"nenhuma tabela nova"*. As opções e a recomendação estão no
plano, como **B-21**.

**Decidido em 17/09/2026: opção A** — tabela `curso_sigla_historico`, escrita só por gatilho, sem
alteração nem exclusão, legível com `auditoria.ler` (`FR-014.1`). Desenho em [data-model](./data-model.md).

⚠️ **Achado ao desenhar o "sem exclusão" — reportado, não corrigido.** A proteção natural a copiar era a de
`migracao_log`: o gatilho `trg_migracao_log_imutavel` com `app.bloquear_reescrita()`, que recusa inclusive a
`service_role`. **Medido em 17/09/2026:** esse gatilho é `BEFORE DELETE OR UPDATE … FOR EACH STATEMENT` —
**não** cobre `TRUNCATE` —, e a `service_role` **tem** o privilégio de `TRUNCATE` em `migracao_log` (o
`authenticated` não tem desde o Épico 1). Um `TRUNCATE` pela `service_role` apagaria o log inteiro **sem
passar pelo gatilho** — e a regra 5 do `CLAUDE.md` diz *"bloqueado por gatilho inclusive para
`service_role`"*. A tabela nova ganha **também** `BEFORE TRUNCATE`; o `migracao_log` fica como está, porque
corrigi-lo é mexer no Épico 1 — vai à lista de reporte do PR 1.

**Provado em 17/09/2026**, sem tocar no `migracao_log`: numa tabela descartável, criada e desfeita na mesma
transação, com o mesmo gatilho `BEFORE DELETE OR UPDATE … FOR EACH STATEMENT` e `app.bloquear_reescrita()` — o
`DELETE` foi **recusado** com a mensagem do gatilho, e o `TRUNCATE` **esvaziou** as três linhas. A tabela de
prova não existe mais.

**Decidido em 17/09/2026:** **não** corrigir nesta fatia; registrar como pendência **`PEND-5a-3`** e **anotar a
regra 5 do `CLAUDE.md`** com a lacuna, datada — *"documento que promete garantia inexistente é pior que a
lacuna, porque decisões são tomadas em cima dele"*. Feito. A constituição (Princípio IV) promete só que o gatilho
impede **`UPDATE`** inclusive para a `service_role`, o que é verdade, e não precisou de nota.

---

## R-23 · Os dois usos do prefixo `REG-` aparecem juntos em algum lugar?

**Origem**: B-9, condição de 17/09/2026.

**Procurado em 17/09/2026, em cinco lugares:**

| Onde | Resultado |
|---|---|
| views de `public` que leem `curso_regime_historico` **e** `registros_aula` | **nenhuma** |
| `app/`, `lib/`, `components/` — o texto `REG-` | **nenhuma** ocorrência |
| `migracao_log` — `origem_chave` ou `destino_chave` com `REG-` | só os de **4** dígitos: **186** eventos de `_Arquivo_Avaliacoes_v1`, de `REG-1498` a `REG-1931`; **nenhum** código de vigência |
| ETL — a procedência gravada | `procedencia("Registros_Aula", "REG-001234")` leva **o nome da aba** junto do código |
| documentos | citam os dois **separados**, por tabela: documento 21 (linhas 268 e 474), 31 (91 e 328), 32 (365 e 373) |

**Achado lateral:** o prefixo de 4 dígitos é usado por **duas** tabelas, não uma — `registros_aula` e
`arquivo_avaliacoes_v1` —, porque as avaliações da v1.0 foram arquivadas a partir de registros de aula e
guardaram o `ID_Registro` original. E a coincidência **é herdada da v2.0**: `ID_Regime` e `ID_Registro`
já usavam `REG-` nas abas de origem (documento 32).

**Conclusão: não aparecem juntos.** Pela condição de Bernardo, **a divergência anotada basta** (D-20). A
regra condicional fica escrita no `FR-019.3` para a tela futura que os juntar.

---

## R-24 · O que muda com a B-15 na opção C — curso sem regime recusado pelo banco

**Origem**: `FR-019.5`.

**Mecanismo.** Gatilho **de restrição adiado** — `AFTER INSERT` em `cursos` e `AFTER UPDATE OF status`
em `curso_regime_historico` — que, no fim da transação, exige vigência `padrao` **ativa** para o curso.
Adiado, porque criar o curso e a vigência **na mesma transação** tem de passar, e a vigência só pode ser
inserida **depois** do curso (chave estrangeira).

**Três consequências medidas, que não existiam na opção A:**
1. **pgTAP não vê gatilho adiado.** Os arquivos rodam em `begin … rollback`, e gatilho adiado só dispara
   no `COMMIT`. Os **12** arquivos que inserem curso **não quebram** por isso — e, pelo mesmo motivo, o
   teste **novo** passaria sem provar nada se não fizesse `set constraints … immediate` antes da escrita.
2. **A RLS e a ponta a ponta quebram por isso.** `rls.test.ts` e as amostras de ponta a ponta inserem
   `cursos` pela API — **uma transação por chamada** — e o curso sem vigência passa a ser recusado. As
   amostras passam a criar curso pela RPC `criar_curso_com_regime`. Custo: **+1** tarefa sobre o R-21.
3. **A carga do ETL passa pela garantia.** Hoje ela carrega os 24 cursos e as 29 vigências **na mesma
   transação**, e os 24 têm `padrao` — passa. Um curso sem regime na v2.0 **no dia do corte** faz a carga
   **abortar**, e a reconciliação MUST nomeá-lo. É exatamente o que Bernardo pediu — *"nenhum caminho
   futuro cria curso sem regime"* —, e fica registrado para ninguém estranhar no corte.

---

## R-25 · O dado que o alerta do 9º TA precisaria, medido

**Origem**: `FR-023` (B-16, adiado por dado ausente).

**Medido em 17/09/2026:**
- `registros_aula.ta_inicial` e `ta_final` estão **vazios nos 1.566** lançamentos migrados. **Não há como
  saber, no histórico, qual aula ocupou o 9º TA.** O Épico 6 é o primeiro a gravá-los.
- **Três** cursos têm, no currículo e na vigência `excecao`, o par de **9 TA de 45 min**: `CAHO`, `C-Ap-HN` e
  `C-Ap-FR`.
- **Indício, não prova** — soma de `tempos_consumidos` por turma e dia, que pode contar aulas paralelas:
  dias com **9 ou mais** tempos somam **30 de 76** em `C-Ap-HN 2026` (máximo **12**) e **7 de 130** em
  `CAHO 2026`; **0** em `C-Ap-FR 2026` e nas demais turmas com lançamento.

**O número que falta, em uma linha:** *quantos dias, numa mesma semana ISO, uma turma de curso com o par
de 9 TA pode usar o 9º TA sem aviso — um inteiro de 0 a 5; acima dele, a turma ganha aviso informativo,
nunca bloqueio, e o número entra como parâmetro normativo em `config_parametros`.*

**Respondido em 17/09/2026: 2.** Até dois dias por semana com uso do 9º tempo, nenhum aviso; a partir do
terceiro, avisa. Três ajustes ao registrar:
- **"Uso do 9º tempo" tem definição no dado, e não em número fixo.** `horarios_tempos_aula.tipo_tempo`
  marca `excepcional` — medido em 17/09/2026: o tempo **9** da configuração *"9 TA de 45 min - intervalo 10
  min"*, e só ele. O documento 31 anota *"`excepcional` = 9º TA"*. Ler a marca, e não o número 9, mantém a
  regra valendo para o *"equivalente em outro curso"* que o `RF-HOR-03.1` prevê.
- **Natureza `operacional`, não `normativo`** — corrige a linha acima e o que o plano disse ao perguntar. O
  número não está em norma nenhuma: é decisão da Divisão. A norma é o `RF-HOR-03.1`, que fica no
  `fundamento_normativo` — o `CHECK` da tabela exige fundamento só do normativo, e o operacional o leva
  mesmo assim, para rastreio.
- **O aviso continua adiado**, agora só pelo outro dado: qual TA cada aula ocupou, vazio nos 1.566
  lançamentos até o Épico 6 gravar.

**Por que semana ISO.** O DSA é **semanal** — é a unidade em que quem planeja olha o uso do tempo —, e a
fatia (c) já mede a carga do instrutor **por semana ISO** (`FR-016` da spec 006). Frequência por mês ou
por turma inteira esconderia uma semana anômala dentro de uma média normal.

---

## R-26 · A sigla deixada por um curso pode passar a outro? — pergunta B-22

**Origem**: `FR-014.2` (decisão de 17/09/2026: trocar a sigla não reescreve código de turma).

**O caso.** O curso A troca a sigla `X` por `Y`. As turmas de A continuam com `X` no código — `X 2026`,
`X T2 2026` —, por decisão. `cursos.codigo` é único só **entre os cursos de hoje**: a partir da troca, `X`
está livre, e um curso B pode ser criado, ou editado, com `X`.

**O que acontece, medido contra as restrições do desenho:**
1. **Documentos ambíguos.** DSAs já impressos de A dizem `X 2026`; os de B, `X 2027`. A mesma sigla passa a
   identificar **dois cursos**, e só a data separa um do outro.
2. **Colisão de código de turma.** Se B abrir turma no **mesmo ano e rótulo** de uma turma antiga de A, o
   código gerado é **idêntico** — `turmas.codigo` é único, e a criação é **recusada** com `23505` por um
   motivo que ninguém na tela de B enxerga: a turma que ocupa o código é de outro curso e de outra sigla
   vigente. A unicidade do `FR-026`, que dá a mensagem boa, é por **curso**, e não pega esse caso.
3. **Dentro do mesmo curso não há problema.** A voltar para `X` e abrir `X 2026` de novo colide com a
   própria turma antiga — e isso o `FR-026` **já** recusa, com mensagem, porque é o mesmo curso, ano e
   rótulo.

**Base de hoje:** nenhuma troca de sigla jamais registrada — a tabela nem existe. O caso é **futuro**.

**Proposta — B-22, opção A:** o banco **recusa**, ao criar ou editar curso, sigla que conste como
`sigla_anterior` de **outro** curso em `curso_sigla_historico`, com a mensagem nomeando o curso que a usou.
O próprio curso pode voltar a uma sigla sua. A tabela que a B-21 criou é exatamente o dado que essa
conferência precisa — sem ela, a regra seria impossível de impor.

**Decidido em 17/09/2026: opção A, como recusa** (`FR-014.3`) — com a exceção do próprio curso **escrita no
requisito**. Dois detalhes do desenho:
- **"Até quando"** é a data da linha de `curso_sigla_historico` em que o outro curso deixou a sigla; se ele a
  deixou mais de uma vez, a mais recente.
- **Duas trocas simultâneas** — A deixando `X` enquanto B adota `X` — poderiam passar as duas pela conferência
  antes de a linha de A existir. Os dois gatilhos, o que grava a troca e o que confere, pegam a **mesma trava de
  aconselhamento pela sigla** antes de ler ou gravar; o segundo espera o primeiro e enxerga a linha dele.

---

## R-27 · A verificação prévia de cursos sem regime, na carga do ETL

**Origem**: `FR-019.6` (condição de Bernardo, 17/09/2026).

**Medido no código em 17/09/2026.** O ETL **já** tem uma conferência que roda antes de qualquer `INSERT`:
`conferir_antes_de_escrever` (`scripts/etl/carregar.py`), cujo próprio comentário diz o motivo — falhar
*"no meio da transação — tarde, depois de dezesseis tabelas já promovidas"*. Ela confere o de-para contra o
banco e devolve uma lista de problemas; a carga não começa se a lista não vier vazia.

**Desenho.** A verificação nova entra **ali**, lendo o dado de origem já em `staging`: todo `ID_Curso` de
`Cad_Cursos` sem linha em `Cad_Cursos_Regime_Historico` com `Tipo_Regime = Padrao` e `Status = Ativo` vira
um problema, com o código e o nome do curso e o que falta. **Prova:** uma execução com o `staging` de um
curso sem a linha `Padrao` — a carga falha na conferência, a mensagem nomeia o curso, e **nenhuma** linha é
gravada. Com o dado de 16/09/2026, os **24** cursos têm `padrao`, e a verificação passa.

⚠️ **O mesmo raciocínio vale para as outras garantias novas que a carga atravessa** — sala fora da lista
depois da substituição, código de turma fora do formato, rótulo fora de `T<n>`. Hoje as três dão zero
(R-20). **Não foram acrescentadas**: a condição de Bernardo nomeou só o regime. Ficam registradas como
extensão natural, se ele quiser.

**Decidido em 17/09/2026: estender a todos os modos de aborto que a fatia cria** — *"retornar zero hoje é
justamente o argumento para incluí-las"*. A lista saiu de percorrer, uma a uma, as garantias novas do
[data-model](./data-model.md) que uma `INSERT` da carga atravessa:

| # | Conferência | Garantia que abortaria | Medido em 17/09/2026 |
|---|---|---|---|
| 1 | curso sem vigência `Padrao` ativa | gatilho adiado de curso com regime (`FR-019.5`) | **0** |
| 2 | classificação `geral` ou `ead_semipresencial` | `CHECK` de classificação (`FR-003.1`) | **0** |
| 3 | curso sem modalidade ou duração em dias | `NOT NULL` (`FR-015`) | **0** |
| 4 | turma sem modalidade | `NOT NULL` (`FR-027`) | **0** |
| 5 | sala sem par depois da substituição | gatilho de sala (`FR-029`) | **0** |
| 6 | rótulo fora de `T<n>` | `CHECK` de rótulo (`FR-025.2`) | **0** |
| 7 | código de turma ≠ `sigla [rótulo] ano` | gatilho do código (`FR-025.1`) | **0** |
| 8 | rótulo repetido, vazio incluído, no curso e ano | `UNIQUE NULLS NOT DISTINCT` (`FR-026`) | **0** |
| 9 | `vigente_ate` sem sucessora no dia seguinte | gatilho adiado de encadeamento (`FR-020`) | **0** |
| 10 | ordem de carga — cursos antes de vigências; turmas antes de disciplinas; vigências antes de aula, avaliação e atividade | nascimento de `turma_disciplina` colidindo com as 210 (`FR-032.2`); vigência recusada por reinterpretar lançamento (`FR-019.4`) | **em ordem** |

**Ficaram de fora, e por quê:** a recusa de sigla de outro curso (`FR-014.3`) e a unicidade parcial de início
(`FR-021.9`) — a primeira lê `curso_sigla_historico`, **vazia** durante a carga; a segunda é **menos**
restritiva que a de hoje. `curso nasce ativo` é policy, e a carga não passa pela RLS. Os números de 1 a 9 foram
medidos sobre a base carregada, que é o retrato do `staging`; a 10, sobre `scripts/etl/ordem.py`.
