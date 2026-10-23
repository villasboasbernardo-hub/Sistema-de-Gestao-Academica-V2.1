# Spec 023 — Bloco 8: o Calendário na tela de Atividades e desfazer feriado no DSA

**Pedido:** Bernardo Villas Boas, 22/10/2026, pelo `/corrigir` — *"Bloco 8 — Calendário na tela de Atividades + desfazer
feriado no DSA, num PR"*. **Ramo:** `fix/BLOCO-8-calendario`, a partir da `main` `9d4c3b9` (spec 022 encerrada).
**Banco:** duas migrations — a M1 só acrescenta (coluna `feriados.tipo_parada_id`, tabela `feriado_turma`); a M2 recria
`vw_dias_parados_turma` para respeitar a abrangência, **com resultado idêntico para todo o dado existente** (provado
sobre a cópia do remoto, §8). Ver o lote D-1 a D-18.

## 1. O problema, em uma frase

Parar o dia de **todas as turmas** pelo DSA grava um **feriado** no calendário, e **nada desfaz** esse feriado: a faixa
de paradas do DSA não o mostra, e o sistema não tem tela de calendário — o caso real foi **28/10/2026**, bloqueado em
todas as turmas.

## 2. Paridade ou novidade (regra 3)

- O item 1 é **defeito** 🐛: a ação existe desde a spec 014 (`desfazerParada` já sabe inativar `feriados`), mas não há
  caminho clicável até ela — *"tela sem caminho clicável é tela não entregue"*, aplicada a uma ação.
- O item 2 é **paridade com a v2.0**: o calendário anual (`Calendario_Feriados`/`Eventos_Globais`, `RF-DADOS-04`) era
  editado na planilha; na v2.1 ele virou tabela (`feriados`) e ficou sem tela. A abrangência por **turmas escolhidas**
  e a **coluna de tipo** são novidade, **pedidas nominalmente** por Bernardo neste pedido.
- **Contenção de escopo (regra 2):** o calendário de impacto letivo é insumo do DSA e do saldo da turma, ambos da
  CIAARA-11.
- **Documento 04:** nenhuma regra muda. `RN-EVT-02` (*"só desconta capacidade quando o impacto está marcado como Dia
  Inteiro"*) e `RN-EVT-04` (*"não se lança aula em dia de feriado de dia inteiro"*) continuam iguais; o que muda é a
  quem o feriado se aplica quando ele for de **turmas escolhidas** (dado novo; todo feriado existente vale para todas).

## 3. A triagem — o pedido, item a item, medido na `main` `9d4c3b9` e na cópia `remoto-20261022-215736.sql`

| # | O pedido | O que existe hoje (medido) | Tipo |
|---|---|---|---|
| **1** | DSA: o feriado da semana na faixa de paradas, com *"· todas as turmas"* e **Desfazer** (ícone) para quem tem permissão de calendário, com confirmação *"libera o dia em todas as turmas"*; sem permissão, sem o botão; desfazer **inativa** | `paradasDaSemana` (`app/(app)/turmas/[turma]/dsa/leitura.ts:1936`) lê só `dias_parados` e o TR bloqueante; o feriado aparece só como dia bloqueado na grade. `desfazerParada` (`lib/acoes/dia-parado.ts`) **já** aceita `destino: "feriado"` e faz `status = 'inativo'`. O botão *Desfazer* de toda parada aparece para quem lança, sem olhar a permissão | 🐛 defeito |
| **2** | Atividades ganha a seção **Calendário**, por ano, para quem tem permissão de calendário: lista (data, nome, tipo, abrangência, impacto, situação); cadastrar e editar em diálogo, com abrangência *todas* ou *turmas escolhidas*; ativar e inativar com confirmação; *Parar dia* daqui, pela ação existente; feriado e licença distinguíveis; avisos no sininho | `/atividades` é só a lista de atividades não letivas, só leitura. **Não há tela que leia ou escreva `feriados`** (lida por 7 leitores, nenhum de escrita fora de `pararDia`). `feriados` não tem tipo (só `descricao` livre e `impacto`) nem ligação com turma (`abrangencia` é texto livre, `Nacional/Institucional` em 31 das 33 linhas do remoto). O vocabulário de tipo **já existe**: `config_listas.tipos_parada` com FR, LA, LP, RC, PF (`pode_global`) e NT | regra nova / paridade |
| **3** | Mudar feriado muda capacidade e saldo (`RN-EVT-02`); mostrar o efeito medido na cópia do remoto ao inativar o 28/10 | Na cópia de 22/10/2026 o feriado de 28/10 é o **`FER-000024`** (*"Dia do Servidor Público federal (ponto facultativo)"*, do ETL) e ele **já está inativo**, desde **22/10/2026 12:30 UTC**, com `editado_por` **nulo** — inativado **sem sessão**, fora da tela. Já há lançamentos no dia (`DSA-MVJIU9IV-A`, `DSA-MVJI7JOB-V`). O efeito é medido comparando o feriado **ativo × inativo** (§8) | medição |
| **4** | e2e por clique: parar o dia de todas as turmas → bloqueado no DSA → desfazer pelo DSA → lançar aula no dia; ciclo pela seção Calendário (cadastrar, inativar, reativar); perfil sem permissão não vê os botões; o papel do DSA não muda | Não há caso que desfaça feriado; `dsa-parar-dia.spec.ts` cobre a parada da turma | teste |

**Já feito, não refazer:** a ação de desfazer feriado (`desfazerParada`, destino `feriado`), a permissão no banco
(`feriados_criar`/`feriados_editar` por `calendario.criar`/`editar`, Admin e Encarregado), o vocabulário de tipos
(`tipos_parada`), o seletor de ano (`AnoDoPainel`), o botão de ícone *Desfazer* e o diálogo de confirmação (Bloco 7).

## 4. Requisitos funcionais

### Item 1 — o feriado no DSA

- **FR-001** A faixa de paradas do DSA mostra, para cada dia da semana, todo **feriado ativo de dia inteiro** que
  **alcança a turma**, no mesmo formato das paradas: *"dd/mm/aaaa · <tipo>: <nome> (dia inteiro) · todas as turmas"* —
  ou *"· turmas escolhidas"* quando a abrangência for restrita.
- **FR-002** O ícone **Desfazer** do feriado aparece **só** para quem tem `calendario.editar`. Sem a permissão, o feriado
  aparece na faixa **sem** botão.
- **FR-003** Desfazer o feriado pede **confirmação** num diálogo: *"Desfazer o feriado de dd/mm/aaaa? Isso libera o dia
  em todas as turmas."* (ou *"…nas N turmas escolhidas."*). Confirmado, o feriado fica **inativo** — nunca apagado
  (regra 4) — e o dia volta a aceitar aula.
- **FR-004** A mesma regra de permissão vale para o *Desfazer* da **parada global de parte do dia** (`dias_parados` com
  turma nula), que o banco só deixa inativar com `calendario.editar`: o botão deixa de aparecer para quem a ação
  recusaria.

### Item 2 — a seção Calendário em Atividades

- **FR-005** `/atividades` ganha duas abas, **Atividades** (a lista de hoje, sem mudança) e **Calendário**, escolhidas
  por `?aba=` na URL. A aba **Calendário** só existe para quem tem `calendario.criar` ou `calendario.editar`; para os
  demais a página fica como hoje, sem abas.
- **FR-006** A aba Calendário mostra **um ano**, escolhido pela **caixa de ano** padrão (`AnoDoPainel`) no canto
  superior direito, por `?ano=` na URL; o padrão é o ano de hoje em São Paulo. Os anos oferecidos são os que têm linha
  no calendário, o ano de hoje e o seguinte (para cadastrar o calendário do próximo ano).
- **FR-007** A lista traz, em ordem de data, cada linha do calendário do ano — **ativas e inativas** —, com: **data**,
  **nome**, **tipo**, **abrangência** (*Todas as turmas* ou os códigos das turmas escolhidas), **impacto** (*Dia
  inteiro*, *Parcial*, *Informativo*) e **situação** (*Ativo*/*Inativo*). Inclui também as **paradas globais de parte
  do dia** ativas do ano, marcadas *"Parada de parte do dia (tempos a a b)"*, com *Desfazer*.
- **FR-008** **Feriado e licença são distinguíveis pelo tipo**, que vem da lista de tipos de parada com alcance global
  (FR — Feriado, LA — Licença Administrativa, LP — Licença de Pagamento, RC — Recesso, PF — Ponto facultativo). Linha
  antiga sem tipo mostra o tipo pela sigla no início do nome (*"<sigla> — …"*, a mesma leitura que o banco já faz), e
  sem sigla, *"não informado"*.
- **FR-009** **Cadastrar** (ícone no topo da aba, `calendario.criar`) abre um diálogo com: data, nome, tipo, impacto e
  abrangência (*todas as turmas* ou *turmas escolhidas*, com a escolha das turmas do ano por marcação). Gravado, a linha
  aparece na lista e passa a valer no DSA, na capacidade e no saldo das turmas que alcança.
- **FR-010** **Editar** (ícone na linha, `calendario.editar`) abre o mesmo diálogo com os valores gravados. Trocar a
  abrangência de *turmas escolhidas* para *todas* (ou tirar uma turma) **inativa** a ligação, não a apaga.
- **FR-011** **Inativar** e **Reativar** (ícones na linha, `calendario.editar`) pedem confirmação. A de reativar um
  feriado de dia inteiro conta os **lançamentos que já existem no dia** e os nomeia na confirmação (*"Há N lançamentos
  neste dia; eles ficam, e o dia passa a recusar aula nova."*). Nada é apagado.
- **FR-012** **Parar dia** (ícone no topo da aba, `calendario.criar`) abre o diálogo de parada **de todas as turmas**,
  **prevista no calendário**, e grava pela ação existente (`pararDia`): dia inteiro vira linha do calendário; parte do
  dia vira parada global. Com lançamento no dia, pede a mesma confirmação do DSA.
- **FR-013** Os avisos do calendário vão para o **sininho**: *"Feriado de dia inteiro com lançamento no dia"* — por data,
  com o número de lançamentos e o link para a aba Calendário daquele ano —, para quem tem `calendario.editar`. A aba não
  tem quadro de avisos próprio.
- **FR-014** A resposta de toda ação (gravado, inativado, recusado) aparece **acima da lista**, não dentro da linha (a
  lição do `AvisoDaLista`, spec 011).

### Abrangência — onde ela vale

- **FR-015** Feriado **sem turma escolhida ativa** vale para **todas as turmas** (o comportamento de hoje, e o de todo
  dado existente). Feriado **com** turmas escolhidas vale **só** para elas, em todos os lugares que hoje leem o
  calendário: a recusa de aula no DSA (`RN-EVT-04`), a grade e a faixa do DSA, o painel de paradas da turma, a
  capacidade e o saldo (`/inicio`, `/turmas`, a ficha, os avisos) e o papel e a planilha do DSA.
- **FR-016** O impacto continua mandando no cálculo: só *Dia inteiro* bloqueia aula e desconta capacidade
  (`RN-EVT-02`, sem mudança).

### Item 4 — o papel

- **FR-017** O papel do DSA **não muda de forma**: nenhum arquivo de `app/print/` nem de `lib/dominio/dsa/impressao*`
  muda de layout. O que muda é só **quais turmas** veem um feriado restrito.

## 5. Critérios de sucesso

- **SC-001** Um Encarregado para o dia de todas as turmas pelo DSA, vê o dia bloqueado, desfaz pelo DSA em **3 cliques**
  (ícone, confirmar) e lança aula no mesmo dia — provado por clique, com o feriado **inativo no banco** (não apagado).
- **SC-002** Pela aba Calendário, o ciclo cadastrar → inativar → reativar termina com **uma** linha no banco, com a
  situação de cada passo conferida no banco.
- **SC-003** Um perfil sem permissão de calendário (Operador) **não vê** a aba Calendário nem o *Desfazer* do feriado,
  e o banco recusa a escrita dele com `42501` (teste de RLS da tabela nova).
- **SC-004** Feriado de turmas escolhidas bloqueia aula **só** nessas turmas: o caso que discrimina é uma turma fora da
  escolha que lança aula no dia e uma de dentro que é recusada.
- **SC-005** Para todo dado existente, `vw_dias_parados_turma` devolve **as mesmas linhas** antes e depois da M2
  (impressão digital sobre a cópia do remoto), e a capacidade e o saldo das 29 turmas não mudam com o código novo.
- **SC-006** O papel do DSA de uma semana com feriado sai **idêntico** antes e depois (`git diff` vazio em `app/print/` e
  nos módulos de impressão).

## 6. Entidades

- **Linha do calendário** (`feriados`): data, nome (`descricao`), **tipo** (novo, da lista de tipos de parada),
  impacto, situação; a abrangência é derivada das ligações.
- **Turma escolhida** (`feriado_turma`, nova): a ligação de uma linha do calendário a uma turma, com situação própria
  (inativar a ligação é tirar a turma da abrangência).
- **Parada global de parte do dia** (`dias_parados` com turma nula): já existe; passa a ser listada no Calendário.

## 7. Fora do escopo

- Classificar o tipo das linhas antigas por migration de dado (é `UPDATE` em dado existente: portão 9.4) — D-2.
- Os defeitos de origem do `D21` (Nossa Senhora Aparecida em 12/11, já duplicada em 12/10): corrigíveis pela tela
  nova, por Bernardo — não por script.
- Janelas de curso e reservas do PROENS (`janelas_curso`, `reservas_proens`): outra parte do calendário, sem pedido.
- O *Desfazer* do **TR global** (`atividades_nao_letivas`): segue como está.
- A publicação do DSA (`docs/correcoes/regras-da-publicacao-do-dsa.md`, RP-4 *"alterado desde a publicação"*): é o
  próximo bloco, não este.

## 8. Medição do efeito (item 3)

Ver `antes-depois.md` — a capacidade e o saldo de cada turma afetada com o `FER-000024` **ativo** e **inativo**, medidos
na cópia `remoto-20261022-215736.sql` restaurada no banco local.

## Clarifications

### Session 2026-10-22 *(adotadas por padrão — Bernardo confere no fim)*

- D-1 · Q: Onde mora o tipo (feriado × licença)? → A: coluna nova **nulável** `feriados.tipo_parada_id`, FK para
  `config_listas` (lista `tipos_parada`) — o vocabulário que o *Parar dia* já usa, administrável e sem `ENUM`.
  *Alternativa: lista nova `tipos_calendario`.*
- D-2 · Q: E as 33 linhas que já existem? → A: **sem migration de dado**. A tela mostra o tipo pela sigla do nome
  (*"FR — …"*), senão *"não informado"*, e quem edita escolhe. *Alternativa: classificar as 33 pela descrição numa
  migration (portão 9.4).*
- D-3 · Q: Como guardar *turmas escolhidas*? → A: tabela nova **`feriado_turma`** (feriado × turma, com `status`);
  sem ligação ativa = todas as turmas. *Alternativa: gravar uma parada por turma em `dias_parados`, que não desconta
  capacidade e não apareceria como feriado.*
- D-4 · Q: A abrangência restrita vale onde? → A: **em todo leitor do calendário** (FR-015), inclusive
  `vw_dias_parados_turma`, recriada na M2 com o mesmo resultado para o dado existente. *Alternativa: só no bloqueio do
  DSA, deixando a capacidade contar para todas (incoerente).*
- D-5 · Q: Quem vê a aba e os botões? → A: a aba, quem tem `calendario.criar` **ou** `calendario.editar` (Admin e
  Encarregado); *Cadastrar* e *Parar dia* pedem `criar`; *Editar*, *Inativar*, *Reativar* e o *Desfazer* do DSA pedem
  `editar`. A leitura do calendário continua aberta a todos (a grade e o saldo dependem dela).
- D-6 · Q: Seção ou abas? → A: **abas** *Atividades* | *Calendário* por `?aba=`, para o calendário não ficar abaixo de
  até 500 atividades. *Alternativa: seção no topo da página.*
- D-7 · Q: Que anos o seletor oferece? → A: os que têm linha no calendário, o de hoje e o seguinte.
- D-8 · Q: O *Parar dia* do Calendário oferece *consome Tempo Reserva*? → A: **não**: é sempre *todas as turmas* e
  *prevista no calendário*; o TR é decisão do DSA da turma, para a parada **não** prevista.
- D-9 · Q: A lista mostra as paradas globais de parte do dia? → A: **sim, as ativas**, com *Desfazer*, porque o
  *Parar dia* daqui pode criá-las e não haveria outro lugar para desfazê-las sem abrir um DSA.
- D-10 · Q: Inativas aparecem? → A: **sim**, marcadas *Inativo* e com *Reativar* — é o único caminho para desfazer um
  desfazer.
- D-11 · Q: Reativar com lançamento no dia? → A: **permite**, com a contagem na confirmação (os lançamentos ficam, o
  dia passa a recusar aula nova — a mesma regra do *Parar dia*, `RN-EVT-04`/D-AA-13).
- D-12 · Q: Data repetida? → A: **permite**, com aviso no diálogo (*"já há N linha(s) ativa(s) nesta data"*): o remoto
  já tem duas em 12/10/2026, e um feriado nacional e um local na mesma data são legítimos.
- D-13 · Q: Que impactos o cadastro oferece? → A: os três do `ENUM` (*Dia inteiro*, *Parcial*, *Informativo*), com
  *Dia inteiro* por padrão; só ele bloqueia e desconta (`RN-EVT-02`).
- D-14 · Q: Que tipos o cadastro oferece? → A: os de `tipos_parada` **ativos e com alcance global** (FR, LA, LP, RC,
  PF); NT (só de turma) não entra.
- D-15 · Q: Que aviso vai para o sininho? → A: *feriado de dia inteiro ativo com lançamento no dia*, para quem tem
  `calendario.editar`. *Alternativa: também "ano seguinte sem calendário cadastrado".*
- D-16 · Q: O *Parar dia* passa a gravar o tipo? → A: **sim**: a parada global de dia inteiro grava `tipo_parada_id`
  junto com o nome *"<sigla> — <motivo>"* de hoje.
- D-17 · Q: Que turmas o diálogo oferece em *turmas escolhidas*? → A: as turmas **não arquivadas** cujo ano letivo é o
  ano da data (as que o calendário daquele ano pode alcançar), pelo código, na ordem única do sistema (spec 022).
- D-18 · Q: Editar a data ou o impacto de uma linha ativa que passa a cair sobre dia com lançamento? → A: grava, e a
  resposta acima da lista diz quantos lançamentos ficaram no dia — a mesma regra do reativar (D-11); não pede segunda
  confirmação. *Alternativa: pedir confirmação também na edição.*
