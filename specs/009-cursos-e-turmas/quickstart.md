# Quickstart — como se prova que a fatia (a) do Épico 5 está pronta

**Fase 1** · 17/09/2026 · roteiro de **validação**, não de implementação ·
desenho: [data-model.md](./data-model.md) · contratos: [contracts/](./contracts/)

> Cada passo cobra uma promessa da spec. Onde há número, ele é **exato** e vem da base de
> **16/09/2026** — "mais ou menos 18 vigências" reprova. Onde a resposta de uma pergunta do
> [plano](./plan.md) mudaria o resultado esperado, o passo diz qual.

---

## Passo 0 — O ponto de partida

```
git switch feat/EPICO-5a-cursos-e-turmas
pnpm install
pnpm db:start          # Docker de pé
pnpm db:reset          # schema do zero + as 7 migrations desta fatia, sobre base VAZIA
pnpm db:tipos          # OBRIGATÓRIO depois de toda migration
```

⚠️ **Duas bases, duas promessas.** O CI roda sobre a base **vazia** do `db:reset`: o pgTAP e a RLS
semeiam a própria amostra. Os **números exatos** da spec — 18 de 29, 6 de 24, 9 turmas de laboratório
— só existem na base **povoada** pela carga do Épico 2 (passo 1). Os dois caminhos precisam passar.

⚠️ **A ORDEM IMPORTA, E NÃO É PREFERÊNCIA — é `db:reset` → ETL → suítes.** *(medido em 17/09/2026)*

- **`pnpm test:rls` pressupõe base recém-resetada.** Sobre base **carregada**, ele reprova **12 casos**
  que não têm relação com o que se mexeu: o `rls.test.ts` do Épico 1 prova *"desativar o último Admin é
  recusado"* assumindo ser o único Admin, e a base real traz **`USR-01` e `USR-02`**, dois Admins
  ativos. A desativação passa, a conta Admin da suíte fica `inativo`, e o resto cai em `42501` **em
  cascata**. **Isso é a `PEND-5a-5`**, não defeito desta fatia — está registrada no `plan.md`, e **não é
  corrigida aqui**: o teste é do Épico 1.
- **E rodar o ETL DEPOIS da suíte faz a reconciliação divergir em 1.** `R-01` e `R-06` esperam **930**
  linhas em `migracao_log` e encontram **931**: a suíte de RLS grava `LOG-RLS-1` para provar que a
  tabela é *append-only* — e *append-only* é exatamente o que impede desfazer. Saída **1**, veredito
  reprovado, **sem nada errado no dado**. Resetar antes resolve; apagar a linha, não — é o que a regra 5
  do `CLAUDE.md` proíbe.

---

## Passo 1 — A carga do Épico 2 continua passando por cima das migrations novas

```
python -m scripts.etl.executar      # o código de saída É o veredito da reconciliação
```

**Esperado:** saída **0**, reconciliação **APROVADA** nas oito bloqueantes, como em 08/09/2026.

| Conferência | Esperado | Origem |
|---|---|---|
| turmas com `Laboratório de Informática` | **9**, e **0** com `Laboratório de informática` | `FR-029.3`, R-20 **[B-20]** |
| `migracao_log` com a substituição de sala | 9 eventos `corrigido` | R-20 **[B-20]** |
| `turma_disciplina` | **210**, nenhuma criada pelo gatilho durante a carga | `FR-032.2`, R-20 |
| sequências `TDI-` e `REG-` | `TDI-000211` e `REG-000030` como próximos | R-16 |
| curso sem vigência `padrao` | **0** — a carga passa pela garantia do `FR-019.5` no `COMMIT` | R-24 |
| verificação prévia — as **dez** conferências | **nove** dão zero contra o dado de origem; a **conferência 3** lista os **13 cursos sem modalidade**, que entram pela **catraca** e **não** abortam a carga (emenda de 17/09/2026 ao `FR-019.6`). Com um `staging` que faz **cada** conferência falhar, a carga **falha antes de escrever**, com **10 de 10** nomeando as linhas, e **nenhuma** linha é gravada | `FR-019.6`, `FR-015.1`, `SC-011.6`, R-27 |
| cursos com modalidade nula depois da carga | **13**, todos com `origem_migracao_v1` preenchido e `editado_em` nulo — a ausência é da origem e fica **visível**. Editar qualquer um deles passa a **exigir** a modalidade | `FR-015.1`, catraca de 17/09/2026 |

⚠️ **Se a carga abortar com "sala fora da lista"**, o de-para do ETL não tem a substituição da
migration 1 — é o defeito que o R-20 prevê, não dado ruim.

---

## Passo 2 — As invariantes do banco

```
pnpm test:invariantes
```

**Esperado:** os 18 arquivos de hoje **e** os 7 novos (`099` a `105`) verdes, **nas duas bases**. O
`010_estrutura.sql` passa a comparar o **conjunto de nomes** de tabela com o declarado no BRIEF §2.1 — 28,
com a `curso_sigla_historico` —, e a mensagem de falha nomeia o que falta e o que sobra (T029, T030).

| Arquivo | O que prova | Origem |
|---|---|---|
| `099_salas.sql` | 8 salas, `ambiente_virtual` explícito; sala **sem a chave**, com a chave **nula** e com valor **não booleano** recusada, **3 de 3**; sala desativada aceita em turma; `tipo_atividade` inativo **continua recusado** | `FR-029` a `FR-029.7`, `SC-014.4` |
| `100_curso_obrigatorios.sql` | Regular sem limite → **1**; Expedito sem limite → **2**; Expedito com **1** explícito → **1**; `ead_semipresencial` recusado; sem modalidade recusado; troca de sigla registrada com anterior, nova, autor e momento; `UPDATE`, `DELETE` e `TRUNCATE` na auditoria recusados **como `service_role`**; **zero** códigos de turma mudam na troca; turma nova usa a sigla nova; sigla que já foi de outro curso **recusada**, com o curso e a data na mensagem; o curso **voltando** à própria sigla, aceito | `SC-001.2`, `SC-001.4`, `SC-001.6`, `SC-001.7`, `FR-014.1` a `FR-014.3` |
| `101_turma_codigo_e_rotulo.sql` | código gerado e imutável; **4 de 4** colisões recusadas e **4 de 4** aceitas sem colisão; `t1`, `T1 `, `Turma 1` e `T0` recusados | `SC-004.1`, `SC-004.2`, `SC-004.4` |
| `102_turma_disciplina_nasce.sql` | amostra de 22 disciplinas ativas → **22** linhas; com uma inativa → não replicada; sem janela → **100%** `nao_informado`; falha desfaz a turma | `SC-004.3` |
| `103_permissoes.sql` | `horarios` e `turmas.criar` do Operador; `cursos.desativar` só para os três | `FR-024`, `FR-017` |
| `104_vigencia_regime.sql` | **`RN-2027-09`** nomeada: 3 vigências, 3 de 3 resolvem certo; parâmetro alterado recusado; sobreposição direta **ainda** `23P01`; correção com mesma data aceita; vigência nova sobre lançamento já gravado recusada, **um caso por tabela**; os **4** resultados da atividade global; curso sem vigência `padrao` recusado **com `set constraints … immediate`**; a RPC de proteção devolve a vigência travada só pela atividade global semeada | `SC-006`, `SC-011` a `SC-011.5` |
| `105_curso_inativo.sql` | escrita recusada nas **16** tabelas; reativação aceita só por valor; desativar com turma pendente recusado nomeando as turmas; `sincronizar_habilitacoes` ignora curso inativo e recusa marcar | `SC-001.3`, `SC-001.5`, `FR-017.9` |

⚠️ **As asserções do `040_vigencia.sql` do Épico 1 continuam idênticas.** A amostra de curso dele ganha
modalidade e duração, como a dos outros 11 arquivos (R-21); as seis verificações de vigência não mudam
uma linha. Se uma delas reprovar, alguém trocou a sucessão explícita por gatilho automático (R-19).

⚠️ **Teste de gatilho adiado que não faz `set constraints … immediate` passa sem provar nada** — o
arquivo termina em `rollback`, e o gatilho só falaria no `COMMIT` (R-24). **Defeito deliberado
obrigatório:** com o gatilho de curso sem regime removido, o `104` **tem de** reprovar.

**Com a base povoada**, conferir à mão:

```sql
select count(*) from curso_regime_historico r
 where r.status = 'ativo'
   and app.lancamentos_que_travam_vigencia(r.id, r.vigente_de) is null;   -- esperado: 18
```

---

## Passo 3 — A negativa vem do banco, por perfil

```
pnpm test:rls
```

| # | Caso | Esperado | Origem |
|---|---|---|---|
| N-1 | Operador `expedito` registra vigência, cria turma e muda status em `C-Exp-BATI` | **3 de 3** aceitos | `SC-005.1` |
| N-2 | o mesmo Operador, as mesmas três em `CAHO` | **3 de 3** recusados pelo banco | `SC-005.1` |
| N-3 | Operador edita curso, dentro e fora do escopo | recusado nos dois | `FR-044` |
| N-4 | Ajudante da Divisão acrescenta sala | **recusado** (`42501`) | `FR-029.2`, `SC-014.3` |
| N-5 | Admin e Encarregado da Divisão acrescentam sala | aceito | `FR-029.2` |
| N-6 | com `C-Exp-BATI` inativo: reativar pelos 3 perfis | **3 de 3** aceitos; os outros **6** recusados | `SC-001.5` |
| N-7 | `visualizacao` cria curso **com a linha completa** | recusado com **`42501`** — não basta "deu erro" | R-21 |
| N-8 | criar curso **pela API sem vigência**, como Admin | recusado no fim da transação — `curso_sem_regime`; pela RPC com a vigência, aceito | `FR-019.5`, `SC-011.4` |
| N-9 | ler a auditoria da sigla como `operador` e como `admin`; gravar nela direto, como `admin` | leitura recusada para o Operador e aceita para quem tem `auditoria.ler`; gravação direta recusada para **todos** | `FR-014.1` |

⚠️ **O N-7 precisa de defeito deliberado.** Com a policy `cursos_criar` trocada por `true`, ele tem de
**reprovar**. Antes desta fatia o caso mandava só três colunas e conferia só `error not null`: depois
da migration 2 ele passaria por causa do `23502`, **com a RLS desligada** (R-21).

---

## Passo 4 — As regras puras e as varreduras

```
pnpm test:unidade
```

| O que | Esperado | Origem |
|---|---|---|
| ida e volta dos códigos | **28 de 28** turmas e **24 de 24** siglas voltam idênticas | `FR-031.3`, `SC-002.1` |
| varredura de endereço de turma | **zero** montagens fora de `lib/navegacao/endereco-de-turma.ts`, lendo código **sem comentário** | `FR-031.2` |
| construtor de seletor de turma | **um** | `FR-033`, `SC-004` |
| limite de turmas | um status **inventado** não conta — prova da enumeração positiva | `FR-030`, `SC-014.1` |
| pré-seleção | nos 4 cursos com seletor: **3** na `T2` em curso, `C-ApA-OcOp-PR-SP` **sem** seleção | `SC-003.1` |
| avisos, com o retrato da base | curso: **12** sem semanas, **10** sem propósito, **0** acima do limite; turma: **11** incoerências (1 + 10), **1** sem janela, **2** sem sala, **0** sem efetivo fora de `planejada` | `SC-013`, `SC-014` |
| vazamento de curso inativo | nenhuma lista de escolha oferece curso, turma ou disciplina de curso inativo; o filtro por curso dos instrutores **mostra** o inativo, marcado | `FR-017.6`, `FR-017.10` |
| vigências desprotegidas | com os casos semeados do `104`: encurtar a janela lista **exatamente** as vigências travadas só pela atividade que sai do alcance; lançamento próprio ou outra turma as mantêm fora | `FR-021.8`, `SC-011.5` |
| incoerência no dia de hoje | `ativa` terminando hoje e `planejada` começando hoje **não** disparam aviso | `FR-028.1` |
| menu | os 4 `entregaEm` do documento 06 §3; "Cursos" disponível | `SC-008` |

---

## Passo 5 — O percurso na tela

```
pnpm test:e2e
```

1. **Catálogo** — `/cursos` mostra **5** grupos, na ordem Regular · Expedito · Especial ·
   Aperfeiçoamento Avançado · Estágio de Qualificação, com **5, 5, 3, 4 e 7** cartões (`SC-001`).
   `?situacao=inativo` sem curso inativo mostra o vazio *"não há"*.
2. **Página do curso por URL colada** — abrir numa aba nova
   `/cursos/C-ApA-PCN-PR-EAD?aba=grade&turma=C-ApA-PCN-PR-EAD%20T2%202026`: a **mesma** aba, a
   **mesma** turma, **2** abas, o quadro de avisos **acima** delas (`SC-002.2`). Trocar a turma pelo
   seletor e conferir que a URL é **exatamente** a que `enderecoDaTurmaNoCurso` produz — `%20`, não `+`.
3. **Início** — o link de uma turma com espaço sai **codificado** e abre a página certa (`FR-031.2`).
4. **Nova turma no limite** — em `C-Ap-FR`, abrir mais uma turma de 2026: o diálogo diz *"… 1 turma(s)
   em 2026, e o limite é 1 …"*, confirmar grava, e a tela vai para a **ficha** da turma criada
   (`SC-014.1`, `FR-031.6`). Em `C-ApA-OcOp-PR-SP`, **nenhum** aviso.
5. **Turma por endereço direto** — `/turmas/NAO-EXISTE%202099` como Admin: *"Turma não encontrada"*;
   como Operador `expedito` num código de `CAHO`: *"Turma não encontrada ou fora do seu alcance"*
   (`FR-031.4`, R-9).
6. **Corrigir esta vigência** — numa das 18 corrigíveis: o formulário abre **pré-preenchido**, salvar
   deixa a anterior **cancelada** e a sucessora **ativa**. Numa das 11: a recusa nomeia **tipo, data,
   turma e total**, e **nenhum** erro cru aparece (`SC-011.1`).
7. **Desativar e reativar** — `C-Exp-BATI` desativa; `CAHO` recusa nomeando as turmas pendentes;
   reativar volta **só** a situação (`SC-001.3`, `SC-001.5`).
8. **Salas** — o passo 6 abaixo, pela tela.
9. **Sigla** — editar a sigla de um curso de teste com uma turma: o diálogo diz, com todas as letras, que
   os links antigos deixam de funcionar, que **a turma já criada continua com a sigla antiga no código** e
   por quê, e que as novas usam a sigla nova; confirmar leva à página **pela sigla nova**; a sigla antiga
   passa a *"Curso não encontrado"*; a ficha da turma antiga **continua abrindo** pelo mesmo endereço; e a
   próxima turma criada nasce com a sigla nova (`FR-014.1`, `FR-014.2`, `SC-001.6`).
10. **Confirmação só onde é difícil desfazer** — editar o propósito de um curso e o efetivo de uma turma
    grava **sem** diálogo; desativar curso e registrar vigência **com** diálogo (`FR-018.1`, `SC-002.3`).
11. **Nada anunciado que não existe** — a página do curso **não** tem link, botão nem *"em breve"* para
    Avaliações ou Relatório (`FR-008`).

---

## Passo 6 — Onde e por quem se acrescenta uma sala

> **Este passo é o que o `FR-029.2` exige do quickstart: que acrescentar sala não vire pedido de
> desenvolvimento.**

**Onde:** menu lateral **Administração** › aba **Salas** — endereço `/admin/salas`.

**Quem acrescenta, desativa e reativa:** **Admin** e **Encarregado da Divisão de Administração
Acadêmica** — os perfis com `parametros.criar` e `parametros.editar` na matriz. **O Ajudante da
Divisão fica de fora de propósito** (decisão de 16/09/2026); acrescentá-lo é uma linha de seed, por
decisão própria. Os outros perfis **veem** a lista, sem os botões — e o banco os recusa se tentarem.

**Como:**
1. **Acrescentar sala** → nome → escolher **Sala física** ou **Ambiente virtual**. Não há opção
   marcada de início: sem escolher, não salva (`FR-029.6`).
2. Confirmar. A sala aparece no seletor de sala das turmas **na hora** — sem deploy, sem migration.

**O que a tela não faz, e o caminho em cada caso:**

| Quero | Caminho |
|---|---|
| tirar uma sala de uso | **Desativar**. Se houver turma usando, a tela lista as turmas e deixa prosseguir; as turmas continuam editáveis (`FR-029.4`) |
| trazer de volta | **Reativar** |
| corrigir o nome | **não é pela tela**: migration registrada, que atualiza junto as turmas que usam o nome (`FR-029.5`) |
| apagar | **não existe** — nada é apagado (regra 4) |

**Conferir:** desativar `Sala 04` lista **5** turmas e prossegue; editar qualquer uma delas continua
aceito; `Sala 04` some do seletor de turma nova (`SC-014.3`).

---

## Passo 7 — O que não é teste, e ainda assim é entrega

| Item | Esperado | Origem |
|---|---|---|
| documento 01 §2.2 e §2.5 | emenda **datada e com autoria**: Operador abre e edita turma do escopo; `turmas` em `OPE` passa a `LCE` | `FR-028.3` |
| `specs/008-shell-e-estado-na-url/contracts/casca.md` | emenda datada da tabela da MENU-1 com os 4 rótulos | `FR-040` |
| regra de cor | **zero** violações no repositório | `FR-045`, `SC-010` |

---

## Passo 8 — O portão, e o remoto antes do merge

```
pnpm verificar:tudo    # verde aqui e vermelho no CI é defeito da verificação (SC-009)
```

**São dois PRs** (`FR-046.1`), e **cada um** passa por este passo inteiro — suíte completa verde, CI com o
mesmo veredito, sistema utilizável sem nada meio construído. As 7 migrations estão **todas no PR 1**, e
vão ao **Supabase remoto antes do merge dele** (`FR-046`): Preview e Production usam o mesmo projeto, e
mesclar sem aplicar deixa Production sem a garantia. O PR 2 não tem migration — se precisar de uma
corretiva, ela segue a mesma regra. **Só com autorização explícita de Bernardo**, como na fatia (c):

```
supabase db push --linked
supabase db query --linked "select count(*) from supabase_migrations.schema_migrations"   # conferência só de leitura
```

**Esperado:** as migrations dos dois lados iguais; a **28ª tabela**, `curso_sigla_historico`, existe no remoto
com RLS ligada e os três gatilhos de proteção; `authenticated` continua **sem** `DELETE`; a
Production segue respondendo. ⚠️ **O remoto está vazio de dado** (Assumption 5): lá a reconciliação de
salas não tem o que reconciliar, e isso é o resultado certo.
