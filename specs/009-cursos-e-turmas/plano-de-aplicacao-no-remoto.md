# Plano de aplicação no remoto — PR 1 da spec 009

**Escrito em 22/09/2026. Nada aqui foi executado no remoto.** É o roteiro da T105 e da T106, e cada
passo que toca o remoto **exige a palavra de Bernardo, pedida na hora** (Restrição 5).

## 0. Pré-condição, medida hoje: o projeto está PAUSADO

`supabase projects list` devolve **`status: INACTIVE`** para `cqhpfuaweoyglhtrckcp` (22/09/2026), e
toda conexão esgota o tempo. **Enquanto estiver assim, nada deste plano roda**, e a Production da
Vercel, que aponta para este projeto (AMBIENTE-1), **não alcança o banco**. Reativar é pelo painel da
Supabase: é ação no remoto, e a decisão é de Bernardo.

## 0.1. Emenda de 23/09/2026 — o PR 2 traz UMA migration, e ela conserta um defeito que hoje está no remoto

*(medido na Fase 20 do PR 2; as 7 do PR 1 já foram aplicadas em 22/09/2026)*

| Arquivo | O que faz |
|---|---|
| `20260923231815_vigencias_do_curso_para_a_tela.sql` | **A.** `public.vigencias_do_curso(curso_id)` — o histórico de vigências com o primeiro lançamento que trava cada uma, para a tela saber onde oferecer *"Corrigir esta vigência"*. **B.** o `grant execute` que faltava em `app.recusar_se_ha_lancamento` |

⚠️ **A parte B não é acréscimo, é conserto — e o defeito está NO REMOTO desde 22/09/2026.**
`public.corrigir_vigencia_regime` é `SECURITY INVOKER` e chama `app.recusar_se_ha_lancamento`; a
migration `20260918025141` revogou essa auxiliar de `authenticated` e **nunca devolveu o
`execute`**. Medido pela tela em 23/09/2026: *"permission denied for function
recusar_se_ha_lancamento"*. **Hoje, no remoto, nenhum usuário autenticado consegue corrigir
vigência** — o único caminho do `FR-021.1` não existe na prática. As duas irmãs chamadas pela mesma
RPC (`app.lancamentos_que_travam_vigencia` e `app.travar_curso_para_correcao`) já tinham o grant: era
esquecimento, não decisão.

⚠️ **Por que nenhuma suíte pegou:** o pgTAP roda como **dono do schema**, que tem tudo; e um teste
negativo que aceite *"deu erro"* como prova de recusa **passa pelo motivo errado** — ali o erro era de
privilégio, não a recusa do `FR-021.2`. Só o caminho de tela, com sessão de verdade, encontrou.

⚠️ **Reversão:** `revoke execute ... from authenticated, service_role` e
`drop function public.vigencias_do_curso(uuid)`. Reverter B **fecha de novo** a correção de vigência.

**Esta migration precisa ser aplicada no remoto antes do merge do PR 2** — pelo mesmo motivo das 7
anteriores (AMBIENTE-1: o projeto serve Preview **e** Production).

## 0.2. ✅ APLICADA no remoto em 23/09/2026 — o que foi medido

*(autorização de Bernardo Villas Boas, depois do CI verde no commit `2e746f7`, run 35943892619)*

| # | Leitura | Resultado |
|---|---|---|
| 1 | `supabase migration list --linked`, **antes** | 36 dos dois lados, **1 só no local** — `20260923231815` |
| 2 | `supabase db push --linked --dry-run` | **exatamente** aquela migration; `seeds: []`, `roles: []` |
| 3 | `supabase db push --linked` | `Applying migration 20260923231815…`, saída **0** |
| 4 | `supabase migration list --linked`, **depois** | **37** dos dois lados, **nenhuma só de um lado** |
| 5 | catálogo: a função existe | `public.vigencias_do_curso` → **1**, `SECURITY DEFINER`, volatilidade **`s`** (stable: não escreve) |
| 6 | catálogo: os privilégios | `authenticated` **executa** `app.recusar_se_ha_lancamento` → **`true`** (era `false`); `vigencias_do_curso` → `authenticated` **`true`**, `anon` **`false`** |
| 7 | Production | `/` → **307** para `/login?destino=%2F`; `/login` → **200**; `/cursos` → **307** para o login; `/estilo` → **200**. O mesmo de antes |

⚠️ **COMO SE VERIFICOU QUE UM AUTENTICADO AGORA CORRIGE VIGÊNCIA, SEM ESCREVER NADA NO REMOTO — em
uma linha:** conferindo no catálogo **a causa**, e não o efeito — `has_function_privilege('authenticated',
'app.recusar_se_ha_lancamento(uuid,date,text)', 'execute')` passou de **`false`** para **`true`**, e era
exatamente esse privilégio que faltava (a recusa era *"permission denied for function
recusar_se_ha_lancamento"*); **o efeito foi provado no LOCAL**, com sessão autenticada de verdade, em
`tests/e2e/vigencia.spec.ts`. Conferir o efeito no remoto exigiria **gravar uma vigência lá**, que é
escrita de dado de teste em produção.

⚠️ **E UM ACHADO QUE MUDA UM REGISTRO: o remoto NÃO está mais vazio de dado de negócio.** Medido na
mesma conferência: **24 cursos, 28 turmas, 29 vigências, 177 instrutores, 5 usuários, 8 salas**. O
`CLAUDE.md` e este plano diziam *"0 cursos, 0 turmas, 0 instrutores, 1 usuário"*, medição de
**22/09/2026** — **está vencida**. Nada disso veio desta aplicação: a migration só cria função e
concede `execute`, e o `db push` reportou `seeds: []`.

## 1. Antes de aplicar — tudo só de leitura

| # | Comando | O que tem de dar |
|---|---|---|
| 1 | `supabase migration list --linked` | **29** dos dois lados, até `20260915140100`, e **7** só no local |
| 2 | `supabase db push --linked --dry-run` | **exatamente** as 7 abaixo, nesta ordem, e nenhuma outra |
| 3 | contar no remoto `turmas`, `cursos` e `cursos` sem modalidade | a migration 1 **aborta** se houver sala fora do inventário, e a 2 depende da catraca. Em 15/09 o remoto tinha 0 instrutores e 1 usuário: **remedir**, não supor |

## 2. A ordem — a do carimbo do arquivo, que é a que a CLI usa

1. `20260917210558_salas_lista_e_validacao.sql`: salas na lista e validação da sala
2. `20260917224841_curso_e_turma_obrigatorios.sql`: obrigatórios, catraca da modalidade e auditoria da sigla
3. `20260918002208_turma_codigo_e_rotulo.sql`: código de turma gerado e imutável
4. `20260918013345_turma_disciplina_nasce.sql`: a grade nasce com a turma, e a sequência `TDI-`
5. `20260918022106_permissoes_horarios_turmas_cursos.sql`: as 24 linhas da matriz
6. `20260918025141_vigencia_de_regime.sql`: vigência append-only e as quatro RPCs
7. `20260918041449_curso_inativo.sql`: curso inativo alcançável e sem escrita nova

Aplicação: **`pnpm db:push`** (= `supabase db push --linked`). **Não** roda seed.

## 3. Se uma falhar no meio

**Cada arquivo é uma transação própria** (medido em 22/09/2026, §3.1). Se a migration *k* falhar:
**ela não deixa nada** (nem o que executou antes do erro), e as de **1 a *k*−1 ficam aplicadas e
registradas**. O banco fica num estado **coerente e conhecido**, "aplicado até *k*−1", e não num meio
de migration.

E, em qualquer caso:
- **Não reexecutar às cegas.** Ler o erro. As migrations 1 e 2 **abortam de propósito** diante de
  dado que não sabem reconciliar, e o erro nomeia a linha.
- **Nunca editar nem renomear** uma migration já aplicada (regra de data do `CLAUDE.md`): o nome é a
  chave do histórico do banco.
- **Dois caminhos, e a escolha é de Bernardo:** (a) **seguir em frente**, com migration **nova** que
  corrige; ou (b) **reverter**, rodando os planos de reversão escritos no cabeçalho de cada uma, **da
  última aplicada para a primeira**. Os sete foram **executados numa base descartável** durante a
  implementação.
- Os estados intermediários (1 a *k*) são estados que existiram: cada migration foi commitada com a
  suíte verde **sozinha**, na ordem.

### 3.1. A medição

No banco **local**, em 22/09/2026, com duas migrations temporárias de carimbo posterior a todas: a
**A**, boa; a **B**, que cria uma tabela e **depois** divide por zero. `supabase migration up --local`
aplicou a A e parou na B com `division by zero (SQLSTATE 22012)`. Depois disso: tabela da A
**existe**, A **registrada**; tabela da B **não existe**, B **não registrada**. Os dois arquivos
foram apagados na mesma execução, e a base voltou pelo `db:reset` seguinte.
⚠️ **Medido com `migration up --local`, e não com `db push --linked` contra o remoto.** Os dois são
da mesma CLI (2.116.0) e aplicam arquivo a arquivo, mas a medição contra o remoto **não** foi feita,
e não pode ser feita sem aplicar algo lá.

## 4. Como conferir que o remoto ficou idêntico ao local

1. `supabase migration list --linked`: **36** dos dois lados, sem divergência.
2. **Impressão digital do esquema**, o mesmo arquivo dos dois lados:
   - local: `docker exec -i supabase_db_ciaara-11-v2-1 psql -U postgres -d postgres -t -A < scripts/provas/impressao_digital_do_esquema.sql`
   - remoto: `supabase db query --linked -f scripts/provas/impressao_digital_do_esquema.sql --output-format json`

   A última linha, `~RESUMO|N objetos|md5`, **tem de ser igual**. Se não for, o diff linha a linha
   nomeia o objeto. Ela cobre colunas, restrições, índices, policies, RLS, funções, gatilhos, views e
   os privilégios de `anon`, `authenticated` e `service_role`. Deixa de fora os donos dos objetos, que
   diferem entre o Docker e a plataforma e virariam ruído.
3. A T106: `curso_sigla_historico` com os gatilhos, `authenticated` sem `DELETE`, as RPCs respondendo
   e a Production sem erro novo.

⚠️ **Acréscimo de 22/09/2026 — a impressão digital é 1.456 objetos, não 1.461.** O 1.461 saiu de uma
medição em **base suja**: uma tabela temporária de 5 objetos (1 coluna, 1 RLS e 3 privilégios), sobra da
própria prova de *"migration que falha no meio"*, que o `db:reset` seguinte limpou. Confirmado recriando
a tabela numa transação desfeita: com ela, 1.461; sem ela, 1.456. ⚠️ **A comparação local × remoto nunca
esteve errada** — ela compara os dois lados na mesma hora, e o que estava errado era o número absoluto
registrado. O valor errado ficou **só na mensagem do commit `a292b78`**, que já está publicado: **não se
reescreve ramo publicado por causa disso**. *(decisão de Bernardo Villas Boas, 22/09/2026)*

## 5. O que acontece com a Production entre a aplicação e o merge

Preview e Production usam **o mesmo projeto** (AMBIENTE-1). Aplicar é aplicar **na Production**, e
até o merge ela roda a **`main`** contra o banco novo. Medido pela varredura da T067 e pela leitura do
código da `main`:

| O que a `main` faz | Com o banco novo |
|---|---|
| Página de permissões | mostra as **24** linhas novas. Ela monta a lista a partir dos dados, e a contagem do topo vai de **152** para **176**. Não quebra |
| Início e telas de instrutor | passariam a mostrar curso **inativo** (a `main` não filtra). **Adormecido**: nenhum curso está inativo, e a `main` não tem como desativar um |
| `sincronizar_habilitacoes` | igual para curso ativo; em curso inativo recusa, e a `main` mostra a mensagem genérica. **Adormecido** pelo mesmo motivo |
| Criar curso, turma ou vigência | a `main` não tem tela para isso. As regras novas não são alcançadas |
| Link da turma no Início | aponta para `/cursos/…`, que **não existe nem na `main` nem no PR 1**. Link morto **já existente**, que o PR 2 resolve |

**Recomendação: aplicar e mesclar no mesmo dia, com a T106 no meio.** O risco da janela é baixo e está
todo adormecido, mas "adormecido" só vale enquanto ninguém desativa um curso pelo caminho da API.
