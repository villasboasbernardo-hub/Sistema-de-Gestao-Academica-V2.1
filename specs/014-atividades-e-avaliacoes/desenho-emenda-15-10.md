# Desenho para aprovação — a parte de banco da emenda de 15/10/2026 (RN-AV-12, RN-AV-13, RN-AV-14)

> ✅ **APROVADO por Bernardo Villas Boas em 16/10/2026 — OPÇÃO A** (`aprovacoes-pendentes.md`, seção de
> 16/10/2026), com a janela de **7 dias**, a vista obrigatória para **PM, PO e PE** e a ação *"juntar como sessão da
> mesma prova"* (Encarregado/Admin, com trilha). Implementado nas migrations E-6 `20261016092307` e D-9
> `20261016092315` (`data-model.md` §3.5.1). O texto abaixo é o desenho como foi submetido.
>
> ⛔ *(Texto original, 15/10/2026:)* **PORTÃO DE BERNARDO (regra 9.4 do `CLAUDE.md`).** Nada deste arquivo foi aplicado — nem no local, nem no
> remoto. Ele existe porque a emenda pede, em três pontos, o que o esquema de hoje **não tem onde guardar**. O resto
> da emenda (RN-AV-10, RN-AV-11, a lista de erros da RN-AV-13 e da RN-AV-14, e a RN-RESP-1) foi feito **sem
> migration** neste ramo — ver `aprovacoes-pendentes.md`, seção de 15/10/2026.

## 1. Por que precisa de banco — o que foi medido

| Regra | O que pede | O que o esquema tem hoje (medido no banco local, cópia `remoto-20261015-150214.sql`) |
|---|---|---|
| **RN-AV-12** | *"…é UMA prova com N sessões de aplicação, não N provas. O card «N de M» conta 1."* | `avaliacoes` guarda **uma** aplicação por linha (`data_avaliacao` NOT NULL, `ta_inicial`, `tempos_consumidos`). Não há tabela de sessão de aplicação. A `RN-AVAL-02` do documento 04 (Risco **Alto**) diz *"um único fato vira uma única linha"* — N linhas para uma prova a contrariam. |
| **RN-AV-13** | *"vista é obrigatória só para PM e PO"* | A obrigação de vista é decidida pelo **tempo de vista do item** (`avaliacoes_curriculo.ta_vista > 0`) — em `app.fn_status_vista` (`20261014151554`), espelho de `situacaoDaAvaliacao` com prova cruzada (R-8). A **prova sem item** não guarda o instrumento: só `tipo_avaliacao`, que a sincronização preenche por técnica (PP → *Prova Prática*, TG/TI → *Trabalho*, o resto → *Prova Escrita*) e não separa PM de PE. |
| **RN-AV-14** | *"vira alerta informativo na aba Avaliações da turma («currículo prevê 1 PP; aplicadas 2»)"* | A prova **a mais** entra **sem item** (não há item 2 para ela), então a tela não sabe que ela é uma PP. Sem o instrumento na linha, a aba não consegue contar «aplicadas 2». |

Os grupos que a RN-AV-12 junta na rodada `2026-10-14T1916` (mesma disciplina, mesmo COD, mesma descrição):

| Turma | Disciplina | COD | Sessões | Intervalos (dias) |
|---|---|---|---:|---|
| CAHO 2026 | IV | PP | 15 | 1, 1, 1, 0, 1, 0, 3, 1, 1, 1, 4, 0, 1 — e **43** até a última |
| C-Espc-FR 2026 | TFMFR-004 | AV1 | 2 | 3 |
| C-Espc-HN 2026 | HN-1111-0508 | PP | 2 | 1 |
| CAHO 2026 | III | T | 2 | 0 (mesmo dia, blocos separados) |
| CAHO 2026 | XVII | T | 2 | **13** |
| CAHO 2026 | XI | PM2 | 2 | 4 |

*(A OD da CAHO V, 2 linhas a 10 dias, fica fora: é contínua, Q-17.)* Com a janela proposta de **7 dias** (pergunta P4),
o CAHO XVII T e a última sessão de CAHO IV PP ficam como provas separadas.

**As datas dos dois casos da P4** (uma linha por sessão em `antes-da-emenda-15-10/erros-de-planilha.md`, na pasta da
rodada, fora do git; conferidas em 15/10/2026): CAHO IV `PP` — 14 sessões de **22/06 a 07/07** e a última em **19/08**,
43 dias depois; CAHO XVII `T` — **14/07** e **27/07**, 13 dias. É esta tabela que a P4 de `aprovacoes-pendentes.md` e a
*Session 2026-10-15* da spec citam. *(Acrescentado em 15/10/2026: a P4 citava `erros-por-turma/01-CAHO-2026.md` da
rodada, que o reensaio regera.)*

## 2. As duas opções

### Opção A — RECOMENDADA: tabela de sessões de aplicação + o instrumento na avaliação

Espelha o que a spec já fez com a vista (FR-041, E-5): a avaliação continua sendo **o fato único** (`RN-AVAL-02`), e
as sessões ficam numa tabela filha. Quatro mudanças, uma migration:

**A1. `public.sessoes_de_aplicacao`** — a 2ª, 3ª… sessão de aplicação da mesma prova (a 1ª continua nas colunas de
`avaliacoes`, para não reescrever toda leitura de hoje):

```sql
create table public.sessoes_de_aplicacao (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique default app.proximo_codigo_sessao_de_aplicacao(),  -- SAP-NNNNNN
  avaliacao_id        uuid not null references public.avaliacoes(id) on delete restrict,
  numero              smallint not null check (numero >= 2),        -- a 1ª é a própria avaliação
  data                date not null,
  ta_inicial          smallint check (ta_inicial is null or ta_inicial between 1 and 12),
  tempos_consumidos   smallint check (tempos_consumidos > 0),
  ta_final            smallint generated always as (ta_inicial + tempos_consumidos - 1) stored,
  local               text,
  status              public.status_registro not null default 'ativo',
  origem_migracao_v1  text,
  criado_por uuid, criado_em timestamptz not null default now(), editado_por uuid, editado_em timestamptz
);
create unique index sap_numero_unico on public.sessoes_de_aplicacao (avaliacao_id, numero) where status = 'ativo';
create index sessoes_de_aplicacao_avaliacao_idx on public.sessoes_de_aplicacao (avaliacao_id);
create index sessoes_de_aplicacao_data_idx on public.sessoes_de_aplicacao (data);
-- gatilhos: app.set_auditoria(); sessão não antes da 1ª aplicação (o molde de app.vista_apos_aplicacao)
-- RLS: as três policies de vistas_de_avaliacao, pela avaliação-mãe; revoke delete, truncate (regra 4)
```

Quem aplica e quem fiscaliza continuam os da avaliação (a emenda não pede papel por sessão). O TA de cada sessão
**consome tempo no dia dela** — por isso entra nas leituras de ocupação e de CH (A3).

**A2. `avaliacoes.instrumento_id`** — o instrumento da prova, quando ela não está ligada a item (a «a mais», a da
disciplina sem currículo carregado, a lançada na tela sem item):

```sql
alter table public.avaliacoes add column instrumento_id uuid references public.config_listas(id) on delete restrict;
-- domínio de lista: só valores de `instrumentos_avaliacao` (o gatilho de domínio que já guarda tipo_avaliacao)
-- coerência: com item ligado, igual ao instrumento do item (gatilho — CHECK não enxerga outra tabela)
```

A sincronização preenche pelo COD (RN-AV-10); o DSA, pelo item escolhido ou por um campo novo quando não há item.
Com ele a aba conta «aplicadas por instrumento» (RN-AV-14) e a vista da prova sem item passa a seguir a RN-AV-13.

**A3. As leituras que somam a aplicação passam a somar as sessões** (recriadas na mesma migration, com
`security_invoker = true` declarado de novo — gotcha 10): `vw_ocupacao_ta` (um ramo novo, como o da vista),
`vw_carga_horaria_turma` (`ta_avaliacao`), `vw_disciplinas_execucao`, `vw_instrutor_carga_anual`,
`app.lancamentos_que_travam_vigencia` e `public.gravar_lancamentos_em_transacao` (aceitar a tabela nova).
`conflitos_da_semana` passa a cruzar o aplicador também nas sessões 2..N.

**A4. A obrigação de vista vira DADO no banco e `app.fn_status_vista` passa a lê-la** (RN-AV-13):

```sql
update public.config_listas set metadados = metadados || '{"vista_obrigatoria": true}'
 where lista = 'instrumentos_avaliacao' and valor in ('PM', 'PO');
-- fn_status_vista: tem_vista_obrigatoria = metadados.vista_obrigatoria do instrumento (do item, ou de
-- avaliacoes.instrumento_id); sem instrumento conhecido, como hoje (exige).
```

A tela passa a ler a mesma marca pela consulta (o instrumento já é lido com o item), e a sincronização pelo retrato do
banco — **o banco vira o ponto único**, e o arquivo `lib/dominio/avaliacoes/instrumentos.json` fica só com a tabela do
COD da planilha, que é assunto da sincronização. *(Até a aprovação, a marca vive no arquivo — ver §4.)*

**A5. O parâmetro da janela** (RN-AV-12, «consecutivos ou próximos»), em `config_parametros`, natureza operacional:
`avaliacao.janela_sessoes_dias` = **[valor que Bernardo decidir — proposta 7]**.

**O que muda na tela, depois de aplicada:** o card «N de M» e o «X de Y» da aba contam a prova uma vez (a sessão não
é linha de `avaliacoes`); o DSA ganha *«Lançar sessão de aplicação»* na prova já aplicada (o molde da sessão de vista,
FR-042) e excluir uma sessão não cancela a prova; a aba mostra *«currículo prevê 1 PP; aplicadas 2»* (RN-AV-14).

**Os dados que já existem:** as linhas 2..N dos grupos da §1 são `DSAP-` (vieram da planilha) — quem as converte é a
**próxima rodada da sincronização** (a linha sai com a marca de saída, a sessão entra), não a migration. Lançamento
feito na tela não é agrupado sozinho.

**Reversão:** a migration cria uma tabela, uma coluna, uma marca em `metadados` e um parâmetro, e recria as views. O
plano de reversão recria as views na forma de `20261014151554`, devolve `fn_status_vista` ao corpo de hoje, tira a
marca e o parâmetro e **deixa a tabela e a coluna** como `-- [APOSENTADA]` se já tiverem dado (regra: nunca `drop`
com histórico). Provado numa base descartável comparando a impressão digital do esquema antes e depois (DoD 6).

**Provas:** pgTAP (estrutura, `numero >= 2`, sessão antes da aplicação recusada, a soma de TA por turma igual antes e
depois na base sem sessões, `security_invoker` nas views recriadas, zero policy de `DELETE`); RLS negativa por perfil
na tabela nova, com o `42501` e o controle positivo; a prova cruzada `situacao-sql-igual-ts` com casos de PP sem vista
e PM sem tempo de vista (o caso que discrimina); ponta a ponta da sessão no DSA e do card.

### Opção B — sem migration: N linhas ligadas ao mesmo item

As sessões 2..N continuam linhas de `avaliacoes`, todas com o mesmo `avaliacao_curriculo_id`, e o card passa a contar
**itens distintos** (como o «X de Y» do DSA já conta). **Não recomendada:**

- contraria a `RN-AVAL-02` (Risco Alto) — uma prova em N linhas;
- a prova **sem item** (o AV1 do TFM da C-Espc-FR) não tem chave para juntar, e continua contando N;
- cada linha tem a sua situação de vista: a sessão 2 da PM2 da CAHO XI ficaria «Atrasada» sem vista, porque a vista
  está na sessão 1 — alerta falso;
- excluir «a sessão de ontem» é excluir uma avaliação inteira;
- não resolve a RN-AV-14 nem a RN-AV-13 da prova sem item (o instrumento continua sem lugar).

## 3. O que Bernardo decide aqui

1. **Opção A ou B** (recomendação: **A**).
2. **A janela** de «próximos» (proposta: 7 dias corridos entre uma sessão e a seguinte; os casos de 13 e 43 dias estão na §1).
3. Se **A**: o rótulo do botão no DSA (*«Lançar sessão de aplicação»*) e se excluir a última sessão de uma prova de
   duas sessões a devolve a prova de uma sessão (proposta: sim).

## 4. O que vale ATÉ a aprovação (feito neste ramo, sem migration)

- A sincronização **identifica** as sessões (RN-AV-12): a 1ª liga ao item, as seguintes **ficam como linhas, como
  hoje**, sem item, **fora** da lista de erros e listadas como *informação*. Nada muda no banco por causa delas. A
  sessão seguinte sem nome de aplicador na linha herda o aplicador da 1ª (a que traz nome fora do cadastro fica sem), e
  a decisão explícita de vista que aponta a data de uma sessão seguinte vai para a 1ª sessão — a vista é da prova.
- A RN-AV-13 vale na **tela** para a prova ligada a item (o instrumento do item decide; dado em
  `lib/dominio/avaliacoes/instrumentos.json`) e na **lista de erros** da sincronização. **O espelho SQL
  `app.fn_status_vista` ainda decide pelo tempo de vista** — e nenhuma tela o lê (medido: só `supabase/tests/128_situacao.sql`
  e a prova cruzada). A divergência fica declarada aqui até A4.
- A prova a mais (RN-AV-14) **sai da lista de erros** e vira *informação* na lista; o alerta **na aba** espera A2.
  «A mais» é só a prova cujo instrumento **passou do previsto**: a que ficou sem item livre **sem** passar (o COD pede
  um número que o currículo não tem, ou repete um item já ligado — a CAHO XIX `PP2` com o currículo só com a PP 3)
  **não casa** e continua na lista de erros, com os itens lado a lado.
