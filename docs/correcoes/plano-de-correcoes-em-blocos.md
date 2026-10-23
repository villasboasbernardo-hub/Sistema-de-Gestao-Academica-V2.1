# Plano de correções em blocos — CIAARA-11 v2.1

_Criado em 16/10/2026, a partir das anotações de testes de Bernardo Villas Boas e da medição do código na `main` `e968f22` (spec 014 encerrada)._
_É o documento que seguimos até o próximo épico. Cada bloco vira **uma spec** do Spec Kit (specify → clarify → plan → tasks → analyze → implement), num **ramo novo a partir da `main`**, e só começa depois do merge do bloco anterior._

---

## Fluxo de trabalho (desde 19/10/2026)

_Decisão de Bernardo Villas Boas, 19/10/2026._ Todo pedido de correção ou mudança entra por **`/corrigir <o pedido, em texto livre>`**. O passo a passo é [`.claude/commands/corrigir.md`](../../.claude/commands/corrigir.md), e ele prevalece sobre a frase do topo deste plano ("cada bloco vira uma spec…").

- **Um pedido = uma spec = um PR = uma conferência.** O Spec Kit roda do specify ao implement sem parar entre as etapas.
- **Dúvidas decididas pela recomendação** e conferidas por Bernardo **no fim**, num lote só.
- **Sem sub-blocos:** o pedido usa o bloco deste plano em que cabe, ou o próximo número livre.
- **Banco** (regra 9.4 do `CLAUDE.md`, emenda de 19/10/2026): migration que só **acrescenta** segue sozinha, com o rito completo do remoto; migration que **altera** o que existe para antes do remoto e mostra o desenho.
- **Merge** só com o "aprovado" de Bernardo.

---

## Como ler este plano

- **Bloco 1** é correção: tela e defeitos, sem tabela nova. ✅ **Concluído em 19/10/2026** (spec 016, PRs #67, #68 e #69).
- **Blocos 2 a 5** trazem tabela ou coluna nova. Cada migration passa pelo rito do remoto: backup, dry-run só com ela, `db push`, conferência só de leitura.
- **Bloco 6** é um épico próprio e fica por último.
- Item marcado com 🐛 é defeito. Os demais são regra nova ou melhoria.
- **Decisão D-COR-n** é decisão de Bernardo, com data, e prevalece sobre texto anterior de spec.

| Bloco | Tema | Banco? | Spec prevista |
|---|---|---|---|
| **1** | Correções de tela e defeitos — ✅ **concluído em 19/10/2026** | duas migrations, pelo portão 9.4 (M1 e M2, sem tabela nova) | 016 |
| **2** | Turmas: andamento manual, status, arquivar, dashboard; e o DSA no papel (os dois itens do antigo Bloco 1B) — ✅ **concluído em 19/10/2026** | cinco migrations (três só acrescentam; a M4 e a M5 pelo portão 9.4, aprovadas por Bernardo) | 017 |
| **3** | Página do curso em abas: Disciplinas, Atividades, Horários | sim (regimes por turma) | 018 |
| **4** | Início: dashboard, carrosséis, submenu | não | 019 |
| **5** | Cadastros novos: estrangeiros, custo, currículo em PDF, capacitação, acessos | sim | 020 |
| **6** | Currículo versionado | sim | épico próprio |
| **7** | Rodada 2 — padrões de tela: botões de ícone, formulários em diálogo ou página própria, ordem por classificação, sininho de avisos, abas do curso, cores do DSA — ✅ **concluído em 22/10/2026** | não | 022 |
| **8** | Calendário na tela de Atividades e desfazer feriado no DSA — ✅ **concluído em 23/10/2026** | duas migrations (a M1 só acrescenta; a M2 recria `vw_dias_parados_turma` com o mesmo resultado para o dado existente) | 023 |

---

## Decisões de Bernardo Villas Boas (16/10/2026)

| # | Decisão |
|---|---|
| **D-COR-1** | **A semana do DSA é a semana do CURSO, corrida.** A semana 1 é a semana (seg–sex) que contém o início da turma; dali em diante conta toda semana, **com ou sem aula** (feriadão, semana de outras atividades). A tela **e o papel** mostram **"Semana N de T"**, onde T é a duração do curso em semanas (`cursos.duracao_semanas`; sem ela, as semanas entre o início e o término da turma). Ex.: curso de 35 semanas → "Semana 1 de 35", "Semana 2 de 35"… **Substitui a convenção CRONOS** de `lib/dominio/dsa/numero-do-dsa.ts` (semana sem aula não consumia número), que fazia alguns cursos saírem com a numeração errada. |
| **D-COR-2** | **O saldo de capacidade conta só até hoje.** Executada = CHD lançada com data ≤ hoje; dias úteis restantes de **amanhã** até o término; o lançado no futuro não entra em lado nenhum. Se for preciso mudar a view, a migration está **autorizada em princípio**, com o desenho mostrado a Bernardo antes do remoto (regra 9.4). |
| **D-COR-3** | **TA fora do DSA, com observação.** A turma pode registrar tempos de aula que **não** estão em DSA (atividade fora dos tempos convencionais, aula que virou EAD, histórico de curso antigo), com quantidade, disciplina, instrutor quando houver e **observação obrigatória**. Esses TA **somam** na CH executada e no saldo, e a tela mostra os dois separados: *"45 TA executados · 40 no DSA · 5 fora do DSA"*. Só o Encarregado da Divisão, os ajudantes e o Admin registram. → Bloco 2. |
| **D-COR-4** | **O status da turma é editável** pelo Admin e por quem pode editar turma (planejada, ativa, concluída, cancelada), e **toda troca de status aceita uma observação** (por que foi cancelada, como foi concluída, por que foi arquivada), que fica visível na ficha. Hoje Bernardo relata que **não consegue** trocar o status: medir no Bloco 1 e corrigir no Bloco 2. |
| **D-COR-5** | **Arquivar turma em QUALQUER estado**, com aviso quando a turma não estiver concluída. Arquivar **não é um quinto status**: são colunas próprias (`arquivada_em`, `arquivada_por`, observação), o status fica como está. A turma arquivada some das listas (filtro "mostrar arquivadas"), trava DSA, instrutor e edição; o Admin pode desarquivar. **Reabre nominalmente a TURMA-1** (28/08/2026), que dizia "Arquivada é VIEW, não valor novo" — continua não sendo valor novo de status. |

### As 16 respostas da triagem (16/10/2026)

1. Faixa Beta em toda tela, todos os ambientes, não fechável. · 2. Saldo: hoje conta como executado; dias úteis de amanhã (ver D-COR-2). · 3. Semanas pelo curso (refinado na D-COR-1). · 4. Edição manual do andamento por disciplina, só Encarregado/ajudantes/Admin, sem ajuste negativo. · 5. Arquivar em qualquer estado, com aviso (D-COR-5). · 6. Regimes nomeados por curso, escolhidos **por turma**; troca por semana fica para depois. · 7. Currículo versionado é épico próprio (Bloco 6). · 8. Estrangeiros = sim/não + observação; custo total único, com texto opcional de composição. · 9. "Cadastro histórico defasado" = carga final (VIRADA-1), pode esperar. · 10. Impressão do DSA: **desconsiderado**. · 11. Acessos: último acesso já existe; contagem de acessos fica no Bloco 5. · 12. Capacitação didática = lista fechada (C-Esp-DID, C-Exp-TE, Licenciatura), múltipla escolha. · 13. Observação ao cancelar/concluir: opcional. · 14. Submenu em Cursos **e** Turmas. · 15. Carrosséis passam sozinhos **e** têm setas. · 16. Ordem: Bloco 1 agora, os demais em sequência.

---

## Já está feito — não refazer

Medido na `main` `e968f22`:

- Excluir, editar, redefinir senha, sair, foto e ícone de usuário (spec 011).
- Lateral recolhível com hover e fixar (spec 012).
- Datas DD/MM/AAAA nas telas de turma, com formatador único em `lib/formato/data.ts` (spec 012).
- Clicar na turma da grade leva à ficha da turma (spec 012).
- Nomenclatura "Em oferta / Fora de oferta" (`app/(app)/cursos/FiltrosDoCatalogo.tsx:60`).
- Aba **Avaliações** do curso, só com o previsto no currículo (spec 014).
- Último acesso na lista de usuários (`app/(app)/admin/usuarios/page.tsx:233`).
- DSA: ordem tipo → disciplina → UE → tempo → quantos; editar TA no dia; situação abaixo da grade com cascata por UE; escolher semana por calendário; EAD sem DSA; semipresencial só na etapa presencial; posto por extenso (correções de 08/10, PR #40).
- Planilha de contingência do DSA (spec 015).

---

## Bloco 1 — Correções de tela e defeitos — ✅ CONCLUÍDO em 19/10/2026

**Ramo:** `fix/BLOCO-1-correcoes-de-tela`, a partir da `main` atualizada. **Spec:** `specs/016-correcoes-bloco-1/`.
**Banco:** nenhuma tabela nova. A única exceção possível é a view do saldo (item 14), pelo portão da regra 9.4.
_(As duas linhas acima são a previsão de 16/10/2026. Como saiu: **três ramos** — `fix/BLOCO-1-correcoes-de-tela` (#67), `fix/BLOCO-1-dsa` (#68) e `db/BLOCO-1-execucao-e-ch-prevista` (#69) — e **duas migrations**, as duas pelo portão 9.4: a M1, do item 1.14, e a M2, do item 1.13 (`vw_instrutor_carga_prevista`), a segunda exceção de banco, autorizada por Bernardo Villas Boas em 17/10/2026, Q-7 da spec 016.)_

> ✅ **Concluído em 19/10/2026** — spec `016-correcoes-bloco-1`, aprovada por Bernardo Villas Boas nas conferências de 17, 18 e 19/10/2026, em três PRs mesclados por squash na `main`:
> - **#67** (`a64791d`, 18/10/2026) — tela: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.10 e 1.15 (*Trocar situação* num botão próprio, com confirmação; a observação na troca continua no Bloco 2).
> - **#68** (`5e55f97`, 19/10/2026) — DSA, papel e planilha: 1.5, 1.8, 1.9, 1.12 e o caso de regressão do 1.11, que ficou **sem objeto** (não se reproduziu).
> - **#69** (`c7313c3`, 19/10/2026) — banco, pelo portão 9.4: 1.14 (M1, a CH executada até hoje fora do DSA e da planilha) e 1.13 (M2, a CH prevista pela janela efetiva, e a marca *"só habilitado — não gera CH prevista"*). As duas no remoto antes do merge, com o backup `remoto-20261019-024230.sql`.
>
> O que ficou de fora virou pendência nomeada: `PEND-016-1`, `PEND-016-2` e `PEND-016-4` (na lista de pequenos ajustes, abaixo) e `PEND-016-5` (no Bloco 2, item 1). Os dois defeitos do DSA no papel achados na conferência do #68 (o nome longo no cartão e a ordem do quadro de CH) passaram para o **Bloco 2** (itens 6 e 7), o próximo a entrar — o Bloco 1B deixou de existir em 19/10/2026.

| # | Item | Onde (medido) | O que muda |
|---|---|---|---|
| 1.1 | **Faixa Beta** | `components/faixa-de-ambiente.tsx` (some em Production) | Faixa fina e fixa no topo de **todas** as telas, inclusive login, em **todos** os ambientes, não fechável: *"Sistema privado – Versão Beta – Esta é uma versão de testes do Sistema de Gestão Acadêmica"*. A rota de impressão a esconde. |
| 1.2 | **Contraste do item ativo** no modo claro | `components/casca/navegacao-lateral.tsx:112` | O item da página atual tem de se destacar, com tokens existentes, nos dois temas. |
| 1.3 | **Ver senha** | `app/(auth)/login/FormularioDeLogin.tsx:86`, `app/(app)/perfil/senha/FormularioDeSenhaNova.tsx` | Botão de olho que mostra e oculta a senha, no login e na troca do primeiro acesso. |
| 1.4 | **Filtros recolhidos** | `components/ciaara/filtro-avancado.tsx` e as telas com filtro | Começam fechados; o botão mostra quantos filtros estão ativos. |
| 1.5 | **DD/MM/AAAA em todo o sistema** | `lib/formato/data.ts` é o ponto único | Varrer a exibição restante (tela, cartão, impressão). O valor de `<input type="date">` continua ISO. |
| 1.6 | **Página do curso** | `CabecalhoDoCurso.tsx`, `AcoesDeSituacao.tsx`, `AbasDoCurso.tsx:38` | Editar, Desativar e Nova turma numa barra só, mesmo tamanho; o curso abre na aba **Sobre o Curso**. |
| 1.7 | **Disciplinas** | `app/(app)/disciplinas/paineis/PainelDeUnidades.tsx`, `components/graficos/grafico-pizza.tsx` | UEs em cascata como linhas de tabela, só leitura, com Editar por linha; gráfico de **pizza** da CH por disciplina no lugar das barras. |
| 1.8 | **Cartão do DSA** | `components/ciaara/grade-dsa.tsx` (`CorpoDoCartao`, `CorpoDoBloco`) | **Nome** da disciplina em destaque, código depois, técnica discreta numa linha abaixo. |
| 1.9 | **Semana do curso** (D-COR-1) | `NavegacaoDaSemana.tsx:154` ("semana 41 de 2026"), `lib/dominio/dsa/numero-do-dsa.ts` | "Semana N de T" corrida, na tela **e** no papel. |
| 1.10 | **Ficha do instrutor: ver primeiro, editar ao clicar** | `app/(app)/instrutores/[codigo]/page.tsx:289` (formulário sempre aberto) | Abre em leitura; botão Editar revela o formulário, como já é na ficha da turma. Conferir curso e disciplina. |
| 1.11 | 🐛 **DSA: 7 TA aparecem como 6** | C-Exp-Obs-ME 2026, segunda 05/10/2026 | O preenchimento mostra 6 e o 7º tempo vazio; a impressão sai certa. Reproduzir com cópia do remoto e corrigir na origem. |
| 1.12 | 🐛 **Sugestão de instrutor e técnica no DSA** (PEND-DSA-SUGESTAO) | `app/(app)/turmas/[turma]/dsa/leitura.ts:493` filtra por `turma_id`, coluna que não existe; `preencherLancamento` sem uso na tela | Consertar a consulta, usar a cascata UE → disciplina → vazio no formulário e dar ordem estável a dois lançamentos no mesmo TA. |
| 1.13 | 🐛 **Instrutor sem CH prevista** (instrutor de código 15, SO) | `vw_instrutor_carga_prevista` conta **atribuição na turma** | Medir antes: se ele só está **habilitado** na disciplina, não é defeito — a ficha passa a dizer que habilitação não gera CH prevista e onde se atribui. Se estiver atribuído e não contar, corrigir. |
| 1.14 | **Saldo só até hoje** (D-COR-2) | `lib/dominio/andamento-da-turma.ts`; a executada vem de `vw_carga_horaria_turma`, que soma inclusive o futuro | Executada até hoje, dias úteis de amanhã. Vale em `/inicio`, na ficha e na lista. |
| 1.15 | 🐛 **Não consigo trocar o status da turma** (D-COR-4) | O formulário tem o campo *Situação* (`FormularioDeTurma.tsx:217`) | Reproduzir como Admin e como Encarregado: gatilho que recusa, permissão, ou campo escondido atrás de "Editar turma". Se o conserto não exigir banco, corrigir aqui; se exigir, vai para o Bloco 2. |

## Bloco 2 — Turmas (spec própria) — ✅ CONCLUÍDO em 19/10/2026

> ✅ **Concluído em 19/10/2026** — spec `017-bloco-2-turmas-e-dsa`, pelo fluxo `/corrigir`, num PR só: **#73**, mesclado
> por squash na `main` em **`07861dc`**, depois da conferência de Bernardo Villas Boas (*"testes SATISFATÓRIOS"*), dos
> quatro ajustes que ela pediu e das cinco migrations no remoto pelo rito (backups `remoto-20261019-123242.sql` e
> `remoto-20261019-163024.sql`).
> - **1** TA fora do DSA, com observação, somando na CH executada e no saldo e mostrado separado (D-COR-3) · **PEND-016-5**
>   fechada (a situação do DSA soma o lançamento sem `ta_inicial` e o fora do DSA) · **2** observação em toda troca de
>   situação, com o histórico na ficha (D-COR-4) · **3** arquivar em qualquer situação, por eventos próprios, sumindo
>   das listas e travando tela, servidor e **banco** (D-COR-5; a M4); **arquivam e desarquivam o Admin, o Encarregado e
>   o Ajudante da Administração Acadêmica — e só eles** (decisão de 19/10/2026, a M5), também pela linha de `/turmas` ·
>   **4** painel de turmas com seis números (com *Planejadas*) e três avisos, de **um ano letivo só**, o vigente por
>   padrão · **5** sem objeto · **6** *Nome no DSA* no cartão, com abreviação automática de reserva e o limite medido no
>   papel (**19** caracteres; o instrutor sempre inteiro na última linha) · **7** o quadro de CH na ordem natural.
> - Pendências novas, na lista de pequenos ajustes: `PEND-017-1` a `PEND-017-4`.


1. **TA fora do DSA, com observação** (D-COR-3), por disciplina da turma: quantidade, instrutor quando houver e observação; somam no executado e no saldo, mostrados separados. Serve também para o **histórico** de curso concluído sem lançar DSA antigo, e para **marcar a disciplina como concluída**. Sem ajuste negativo. Só Encarregado, ajudantes e Admin.
   - **Dependência deixada pelo Bloco 1** _(plan da spec 016, 17/10/2026)_: os TA fora do DSA **somam na base da M1** (`vw_chd_por_fato`), para entrarem na CH executada e no saldo como os lançamentos do DSA.
   - **`PEND-016-5` — a situação do DSA não soma lançamento histórico sem `ta_inicial`** _(registrada por decisão de Bernardo Villas Boas, 19/10/2026, na conferência do PR #69)_. O acumulado do painel *Situação por disciplina* lê `vw_ocupacao_ta`, que filtra `ta_inicial is not null` (é a grade de ocupação), enquanto a CH executada do `/inicio`, da ficha e de `/turmas` soma o lançamento inteiro. Medido na semente do e2e do PR #69 (`tests/e2e/panorama-de-teste.ts`): na semana do lançamento futuro (8 TA, com `ta_inicial`), a situação mostrou **8 %** e não **18 %** de 100 — os **10** TA do histórico, sem `ta_inicial`, ficaram de fora, e são os mesmos 10 que o `/inicio` conta. Já era assim antes do Bloco 1. Decidir, junto com o histórico sem DSA, como o lançamento sem horário entra no acumulado do DSA. Volume no dado real: não medido.
2. **Status editável com observação** (D-COR-4) em toda troca: cancelada, concluída e arquivada.
3. **Arquivar em qualquer estado** (D-COR-5), com aviso se não concluída.
4. **Dashboard de turmas**, no molde do de instrutores: total, canceladas, concluídas, em andamento, iniciando nos próximos 30 dias, e alertas do que falta (data, instrutor, conflito).
5. **Migrar para Turmas o que é da turma** e ainda está em Cursos (instrutor por disciplina da turma, datas, sala), se a medição mostrar que sobrou algo depois da spec 012.

**DSA no papel — os dois itens do antigo Bloco 1B** _(registrados em 18/10/2026, na conferência do PR 2 do Bloco 1, #68; o Bloco 1B deixou de existir em 19/10/2026, decisão de Bernardo Villas Boas, e eles entram aqui)_:

6. 🐛 **Nome longo de disciplina estoura o cartão do DSA.** Ex.: terça 13/10/2026, C-Ap-FR 2026, avaliação de 2 TA de *Equipamentos e Sistemas Eletrônicos de Auxílios à Navegação*: o nome ocupa quase todo o cartão, o tópico sai cortado (*"Equi.exist eletrônico de aus. a nave…"*) e o instrutor some. Com 1 TA só (ex.: *Operação e Administração de Auxílios à Navegação*), o nome sozinho pode passar do cartão. **Só no DSA** (tela, papel e planilha); o resto do sistema mantém o nome inteiro.
   - **Decisão a tomar no specify:** (a) abreviação automática por regra (ex.: acima de N caracteres ou 4 palavras, abreviar palavras longas e tirar preposições), sempre reproduzível; ou (b) campo **"nome abreviado no DSA"** no cadastro da disciplina (migration), com a regra automática como reserva quando o campo estiver vazio. **Recomendação: (b) com (a) de reserva** — a abreviação oficial é de quem conhece o curso, e a máquina só cobre a falta.
   - O nome inteiro continua no quadro de CH do rodapé do papel, então a abreviação no cartão não perde informação.
   - Critério: nenhum cartão do papel corta o instrutor; prova com o cartão de 1 TA e o de nome mais longo do catálogo real.
7. 🐛 **Quadro de CH do papel ordena códigos como texto (IV, IX, V); pela regra de 08/10 o romano ordena pelo valor. Existe na main desde 07/10.** _(Achado na conferência do PR #68, 18/10/2026: `tabelaDeCh`, em `lib/dominio/dsa/impressao.ts`, ordena por `localeCompare`, e não por `emOrdemNaturalDoCodigo`.)_

## Bloco 3 — Página do curso em abas (spec própria) — ✅ CONCLUÍDO em 20/10/2026

> ✅ **Concluído em 20/10/2026** — spec `018-bloco-3-pagina-do-curso-em-abas`, pelo fluxo `/corrigir`, num PR só: **#75**,
> mesclado por squash na `main` em **`34de1ae`**, depois da conferência de Bernardo Villas Boas (*"APROVADO"*, com as
> decisões C-1 a C-19 e I-1 a I-6 como ficaram) e da migration no remoto pelo rito (backup
> `remoto-20261020-015448.sql`; 84 e 84; impressão digital `39af6fd9…`, 2.201 objetos, igual nos dois bancos).
> CI verde na `main` sobre `34de1ae` (os três blocos; 526 de ponta a ponta sem instável) e Production servindo o merge
> (deploy de `34de1ae` em `success`); o ramo foi apagado, local e remoto.
> - **1** a aba *Disciplinas* no curso, com *Nova disciplina*; *Disciplinas* saiu do menu e `/disciplinas` só
>   redireciona · **2** a aba *Atividades* com os limites, o Estudo Individual e os tipos · **3** a aba *Horários* com os
>   regimes nomeados (novo, editar, inativar) e as vigências do curso para ler; a turma escolhe o regime em *Editar
>   turma*, e o DSA, o alerta do excepcional, a cascata, o dia parado e o saldo usam o dela · **4** a aba *Avaliações*
>   só com o previsto · **5** a ordem pedida.
> - Pendências novas, na lista de pequenos ajustes: `PEND-018-1` e `PEND-018-2`; a `PEND-018-3` (o guia de testes) foi
>   fechada no próprio PR.

1. Aba **Disciplinas**, com o cadastro e as UEs; a entrada *Disciplinas* sai do menu lateral.
2. Aba **Atividades extraclasse** (o previsto no currículo; o acompanhamento é da turma).
3. Aba **Horários**: regimes nomeados por curso (ex.: A com 8 TA, B com 9 TA, C com 8 TA e intervalos menores), escolhidos **por turma**; o DSA usa o regime da turma. Troca por semana fica para depois.
4. O curso **não** mostra acompanhamento de turma em aba nenhuma: só o previsto no currículo.
   - ⚠️ **Divergência medida no Bloco 2** _(spec 017, §10, item 3; 19/10/2026)_: este item diz que a aba *Avaliações* do curso tem *"só o previsto no currículo"*, e o código **mostra o cumprido** da turma escolhida (a mesma leitura da ficha, `lerAvaliacoesDoCurso`). Não foi corrigido no Bloco 2 — é deste item.

## Bloco 4 — Início (spec própria) — ✅ CONCLUÍDO em 20/10/2026

> ✅ **Concluído em 20/10/2026** — spec `019-bloco-4-inicio`, pelo fluxo `/corrigir`, num PR só: **#77**, mesclado por
> squash na `main` em **`f15cb0d`**, depois da conferência de Bernardo Villas Boas (*"aprovado, com 5 AJUSTES neste
> mesmo PR"*, decisões C-1 a C-17 como ficaram, menos a C-7, a C-14 e o destino do cartão). **Sem migration.**
> CI verde na `main` sobre `f15cb0d` (run `39482845494`: 2.554 de unidade · 909 pgTAP · 399 invariantes e RLS · 537 de
> ponta a ponta + 1 instável, o `avaliacoes-nas-telas.spec.ts:54` da `PEND-014-7`, + 6 pulados) e Production servindo o
> merge (deploy de `f15cb0d` em `success`; `/estilo` com a seção do carrossel); o ramo foi apagado, local e remoto.
> - **1** o Início do ano, com o ano numa **caixa de seleção no canto superior direito**, a mesma de Turmas, sem *"ano
>   letivo"*, padrão pelo relógio de São Paulo (A-1) · **2** cartões **maiores**, só das turmas **ativas** do ano, com
>   barra de progresso, título só com o nome da turma e o clique para a **ficha** (A-2 a A-4, autorização nominal diante
>   do `RF-INI-03`), em carrossel que passa sozinho, pausa e anda por teclado · **3** as manchetes dos DSA da semana,
>   uma por vez · **4** a lateral com *Cursos* → classificação → curso e *Turmas* → as turmas do ano (A-5) · **5** a EAD
>   fora do carrossel de DSA.

1. Dashboard das turmas do ano vigente.
2. Cartões das turmas com barra de progresso, em **carrossel automático e com setas**.
3. Carrossel com os **DSA da semana atual** das turmas que têm DSA, um por vez.
4. Submenu na lateral: **Cursos** → classificação → curso, e **Turmas** → curso → turma, abrindo a página já filtrada.

## Bloco 5 — Cadastros novos (spec própria) — ✅ CONCLUÍDO em 20/10/2026

> ✅ **Concluído em 20/10/2026** — spec `020-bloco-5-cadastros-novos`, pelo fluxo `/corrigir`, num PR só: **#79**,
> **APROVADO** por Bernardo Villas Boas (decisões C-1 a C-16 e as da implementação como ficaram) e mesclado por squash
> na `main` em **`f1a7089`**. Três migrations que só acrescentam (`20261020213440` estrangeiros, custo e o balde
> `curriculos`; `20261020213441` a capacitação em lista, com a conversão autorizada; `20261020213443` a tabela de
> acessos), aplicadas no remoto **antes** do merge — backup `remoto-20261020-204113.sql`, **87 e 87** migrations,
> impressão digital idêntica nos dois bancos (**2.237 objetos, `1ba390aa…`**). Na conversão, **31 de 31** textos
> casaram, **0** a corrigir (`specs/020-…/antes-depois.md`). CI verde na `main` sobre `f1a7089` (run `39529307549`:
> 2.614 de unidade · 939 pgTAP · 417 invariantes e RLS · 542 de ponta a ponta + 6 pulados, sem instável) e Production
> servindo o merge (deploy de `f1a7089` em `success`); o ramo foi apagado, local e remoto. Fechou também a
> **`PEND-019-3`**. ⚠️ **Custo de curso fica como campo informativo; a confirmação de escopo (regra 2) segue pendente
> com Bernardo** — `PEND-020-3`, sem bloquear. ✅ **Respondida em 21/10/2026: é controle da CIAARA-11** (`PEND-020-3`
> fechada).

⚠️ São **novidade**, não paridade com a v2.0 (regra 3 do CLAUDE.md): o specify registra a autorização nominal de Bernardo. **Custo de curso**: confirmar que é processo da CIAARA-11 (regra 2, contenção de escopo).

1. Curso ofertável a **estrangeiros**: sim/não + observação.
2. **Custo total** do curso: valor único, com texto opcional de composição.
3. **Currículo em PDF**: carregar e baixar (Supabase Storage).
4. **Capacitação didática** do instrutor em múltipla escolha, lista fechada (C-Esp-DID, C-Exp-TE, Licenciatura).
5. **Contagem de acessos** por usuário (o último acesso já existe).

## Lista de pequenos ajustes (backlog)

Itens soltos, sem bloco próprio, encaixados no bloco que tocar o mesmo arquivo:

- **PEND-016-1** — unificar a composição da CHD: `vw_carga_horaria_turma` e `vw_disciplinas_execucao` lendo de `vw_chd_por_fato` (hoje são três somas, e o pgTAP 135 prova que batem).
- **PEND-016-2** — varrer testes que conferem o valor que eles mesmos digitaram, em vez de conferir o banco.
- **PEND-016-4** — as prévias do `.design-sync` ficam fora do `tsc`.
- **PEND-017-1** — **três critérios de "disciplina concluída"** _(spec 017, §10, item 2; 19/10/2026)_: a situação do DSA, a tabela da ficha da turma e a aba *Avaliações* dão resultados diferentes quando a CH prevista da disciplina é **0**. Unificar num módulo de `lib/dominio/` e fazer as três lerem dele.
- **PEND-017-2** — **comentário vencido sobre o código da turma** _(spec 017, §10, item 4)_: `lib/acoes/turma.ts` e `lib/navegacao/contrato.ts` dizem que mudar o ano ou o rótulo **regera** o código; o gatilho `app.gerar_codigo_da_turma()` **recusa** e não regera. Corrigir o texto.
- **PEND-017-3** — **a célula de 1 TA da planilha de contingência** _(spec 017, P-8)_: a linha tem 34 pt, e o nome do cartão já vem curto (`DISC_NOME_DSA`), mas a garantia *"o instrutor nunca some"* (FR-007.4) foi provada só na tela e no papel. Medir no Excel 2007 e no Google com o nome de 81 caracteres e decidir se a linha cresce.
- **PEND-017-4** — **38 disciplinas com a abreviação automática terminando em reticências** _(spec 017, FR-007.2; 19/10/2026)_: com o limite do cartão medido no papel (**19** caracteres, o menor de duas medidas: 22 no Chromium do Windows, 19 no do Linux), **119 das 172** disciplinas ativas passam dele, e em **38** a abreviação não cabe inteira. É dado, não código: preencher *Nome no DSA* no cadastro (Disciplinas → a disciplina → Editar). A lista, com a abreviação de cada uma: `specs/017-bloco-2-turmas-e-dsa/nomes-acima-do-limite.md`.
- **PEND-018-1** — **troca de regime por semana** _(pedido de Bernardo Villas Boas, 19/10/2026: *"fica para depois"*)_: no Bloco 3 a turma escolhe UM regime nomeado, que trava no primeiro lançamento (`RF-HOR-05`). Trocar no meio do curso exige vigência por turma (de que semana em diante), como `curso_regime_historico` tem para o curso.
- **PEND-018-2** — **o catálogo de horários não tem tela** _(spec 018, 20/10/2026)_: o regime nomeado pode apontar para um relógio de `configuracoes_horario`/`horarios_tempos_aula` (os 8 de hoje, CFG-A a CFG-H), mas criar ou mudar um relógio do catálogo continua sendo só por migration.
- ~~**PEND-018-3**~~ — ✅ **fechada no PR #75, antes do merge** _(pedido de Bernardo Villas Boas na conferência de 20/10/2026)_: `docs/testes/guia-de-testes.md` passou a dizer *Cursos* → o curso → aba *Disciplinas* (passos 19 do Administrador e 10 do Operador), o menu com **sete** itens e as seis abas do curso; o `.docx` foi regerado por `scripts/manutencao/md_para_docx.py` e confere com o `.md` palavra a palavra (3.579 e 3.579).
- **PEND-019-1** — **o submenu da lateral só se atualiza com as ações da própria pessoa** _(spec 019, C-16; 20/10/2026)_:
  criar curso, desativar/reativar, criar turma e arquivar/desarquivar revalidam o layout; um curso ou turma criado **por
  outra pessoa** aparece na lateral ao recarregar a página (o layout não é redesenhado na navegação por clique).
- **PEND-019-2** — **servidor órfão na porta da ponta a ponta** _(spec 019, 20/10/2026)_: uma rodada interrompida por
  memória deixou um `next start` vivo na porta 3100, e a rodada seguinte o **reaproveitou** (`reuseExistingServer`)
  servindo uma `.next` já apagada — 7 de 7 reprovaram no login, sem erro do servidor no log. Encerrar o processo
  resolveu. Proposta: o `verificar:tudo` recusar porta 3100 ocupada antes de começar (gotcha 7 por outro caminho).
- ~~**PEND-019-3**~~ — ✅ **fechada no PR #79 (Bloco 5, spec 020, C-16)**: `panorama-de-teste.ts` (`inicio` e
  `andamento-ate-hoje`) e `ta-fora-do-dsa.spec.ts` semeiam no ano de hoje, com as aulas na semana anterior; o `dsa-ver`
  escolhe na caixa do Início o ano da semente do DSA; e uma guarda (`ano-sem-numero-fixo.test.ts`) reprova ano escrito
  à mão nas quatro sementes — vista reprovar na versão antiga. _(O registro original segue.)_
- **PEND-019-3 (registro original)** — **as sementes de ponta a ponta fixam 2026, e o Início abre no ano de hoje** _(spec 019, 20/10/2026;
  **prazo: antes de 01/01/2027**)_: `inicio.spec.ts`, `dsa-ver.spec.ts` (o caso Q-13), `andamento-ate-hoje.spec.ts` e
  `ta-fora-do-dsa.spec.ts` semeiam turmas com `ano_letivo: 2026` (e códigos `… 2026`) e as procuram nos cartões do
  Início — que desde o Bloco 4 abre no ano de hoje. Em 01/01/2027 os quatro reprovam **sem defeito no produto**. O
  conserto é a amostra semear no ano de hoje (`hojeNaCiaara`), como `inicio-bloco-4.spec.ts` e `avaliacoes-de-teste.ts`
  já fazem.
- **PEND-020-1** — **o pgTAP reprova em cinco arquivos sobre a cópia do remoto** _(medido em 20/10/2026, spec 020, sobre
  `remoto-20261020-195426.sql`)_: `090` (R-05/R-07 — os lançamentos da sincronização não têm procedência de ETL), `099` (o
  remoto tem 14 salas; o inventário declara 8), `108` (`PEND-014-5`), `112` (`PEND-014-4`) e `115` (a cópia tem mais de
  um Admin, e o arquivo pressupõe um só — a classe da `PEND-5a-5`). Nenhum é defeito do produto: são asserções escritas
  para a base do ETL. Decidir, arquivo a arquivo, entre ler o dado de onde ele vem hoje e declarar a asserção só da base
  limpa.
- **PEND-020-2** — **o currículo em PDF não tem «remover» nem versões** _(spec 020, C-7; 20/10/2026)_: substituir
  sobrescreve o mesmo arquivo (`<curso>/curriculo.pdf`) e o balde não tem policy de `DELETE` (regra 4, `STORAGE-1`) —
  então não há como tirar o currículo de um curso pela tela, e a versão anterior não fica guardada. O currículo
  versionado é o Bloco 6; tirar o PDF é a mesma decisão da `STORAGE-1`, agora para dois baldes.
- ~~**PEND-020-3**~~ ✅ **FECHADA em 21/10/2026** _(Bernardo Villas Boas, na conferência do PR #82: *"Custo do curso: É
  controle da CIAARA-11 (regra 2) — feche a pendência."*)_: as duas colunas ficam em uso, como estão. *(Registro
  anterior:)* **custo de curso é processo da CIAARA-11? (regra 2, contenção de escopo)** _(decisão de Bernardo Villas
  Boas na aprovação do PR #79, 20/10/2026: *"fica como campo informativo — a confirmação de escopo segue pendente
  comigo"*)_: `cursos.custo_total` e `cursos.custo_composicao` estão no ar, editados em *Editar curso* e mostrados em
  *Sobre o Curso*, e **nada calcula a partir deles**. Se a resposta for *não*, as duas colunas ficam sem uso (nunca
  `drop column`: viram `-- [APOSENTADA — v2.1]`) e a tela deixa de mostrá-las. **Não bloqueia nada.**
- **PEND-021-1** — **o pgTAP reprova em três arquivos sobre a base do ETL, também na `main`** _(medido em 21/10/2026, spec
  021)_: com o ETL refeito sobre as migrations (planilha da v2.0), `112` (3 asserções), `115` (3) e `129` (10) reprovam —
  e reprovam **igual** numa cópia de trabalho da `main` `fa372c2` com a mesma planilha. As asserções medem os efeitos das
  migrations de dado D-5 e D-6 da spec 014, que a ETAPA 6b do ETL **não** reaplica (a lista declarada tem D-1, D-2 e D-3),
  e a contagem de Admins (a base do ETL tem mais de um). Na base limpa, que é a do CI, as três passam. Não é do Bloco 6.
- **PEND-021-2** — **amostras de ponta a ponta "em uso" por causa de OUTRA amostra** _(spec 021, 21/10/2026)_: a RC-6
  conta como lançamento a atividade **global** na janela da turma (I-1 do Bloco 3), e `cursos-de-teste` cria uma em
  **10/05/2026**, dentro da janela da amostra da grade (02/03 a 30/06/2026). O currículo da amostra fica em uso ou não
  conforme a ordem dos arquivos — o CI de `fcbc48b` reprovou *Nova disciplina* porque o pedido de justificativa **não**
  veio. Contornado com `justificarSePedir` nos passos que mudam o conteúdo; a raiz é tirar a global das janelas das
  outras amostras sem quebrar `turmas.spec.ts` e a vigência, que dependem de 10/05/2026.
- **PEND-021-3** — **`disciplinas.spec.ts:163` instável sob carga no CI** _(21/10/2026)_: depois do `goto` com
  `?aberta=` a linha ficou fechada uma vez e passou na repetição; isolado, 3 de 3. Proposta: esperar o `aberta` na URL
  antes do `goto` (a atualização da URL é assíncrona). Classe da `PEND-014-7`.
- **PEND-014-7** — testes de ponta a ponta instáveis sob carga (`salas.spec.ts:126`, `dsa-tipo-e-global.spec.ts:160`, `avaliacoes-nas-telas.spec.ts:53`, `admin-sobre-contas`).
- **OneDrive** — a pasta do repositório deve ficar "Sempre manter neste dispositivo": arquivos sob demanda já quebraram o build (`.next`, `EPERM`) e o `git switch` (`specs`). Em 21/10/2026 ele **repôs um arquivo apagado no commit** (com a data antiga) e um pedaço da `.next` sumiu com o servidor de pé — o login deixou de hidratar, sem mensagem.

## Bloco 6 — Currículo versionado (épico próprio, por último) — ✅ CONCLUÍDO em 21/10/2026

> ✅ **SPEC 021 ENCERRADA em 21/10/2026.** Os dois PRs na `main` por squash: o **PR 1** (#81, `ae4e595`) e o **PR 2** (#82, `07c3bc7`), este com os **quatro ajustes da conferência de Bernardo Villas Boas** no mesmo PR — a página do curso **só leitura** no currículo vigente, a aba **Currículo** (lista e consulta só leitura), **Novo currículo** e a edição de **todo** o currículo dentro de **Editar curso** (dados e PDF, disciplinas e avaliações, horários, atividades e limites) e os **horários do currículo** (emenda à RC-1). **Cinco migrations no remoto antes do merge**, pelo rito: M1 e M2 (PR 1, backup `remoto-20261021-090802.sql`), M3 (`remoto-20261021-113521.sql`) e, autorizadas na conferência, **M4 e M5** (`remoto-20261021-195622.sql`, remedição sobre ele idêntica, dry-run só com as duas, `db push` 0): **92 e 92** migrations e o esquema **`89a3f08e…`, 2.390 objetos, igual nos dois bancos**. A prova (`specs/021-…/antes-depois.md`, rodada 6, sobre `remoto-20261021-180100.sql`): antes da M4, 24 cursos com 24 currículos e 0 turmas em currículo de outro curso; com a M4 e a M5 sob o código da `main`, a impressão do currículo, as telas das 29 turmas e as **229 páginas idênticas**; sob o código do ramo, nenhum número mudou. Reversão provada com dado (volta a `5d794f43…`). **CI verde na `main` sobre `07c3bc7`** (run `39703612539`: 1.022 pgTAP em 66 arquivos · 545 de ponta a ponta + 1 instável da `PEND-014-7` + 7 pulados) e **Production servindo o merge** (deploy de `07c3bc7` em `success`); os ramos foram apagados, local e remoto. A `PEND-020-3` foi fechada (custo **é** controle da CIAARA-11). Pendências novas: `PEND-021-2` e `PEND-021-3`.


> 🟨 **Portão respondido em 21/10/2026**: Bernardo Villas Boas definiu as **regras de negócio do currículo, RC-1 a RC-12**
> (`docs/correcoes/regras-do-curriculo-bloco-6.md`), que substituem a trava estrita (D-4/D-6) pela correção do trio com
> justificativa (RC-6) e mandam para o currículo o propósito, a duração, o modelo e o PDF (RC-1, RC-11). Spec
> `021-bloco-6-curriculo-versionado`, ramo `feat/BLOCO-6-curriculo-versionado`. Dois PRs: o **PR 1** (banco e os leitores
> da RC-1; **nada muda em tela**, merge autorizado se a prova passar) e o **PR 2** (as telas: cópia, seletor, currículo em
> *Nova turma*, correção pelo trio, arquivamento, PDF por currículo, leitores por currículo). Desenho:
> `specs/021-…/contracts/banco.md`; medição: `antes-depois.md`; o quadro das RC e o lote: `spec.md`.
>
> ✅ **PR 1 na `main` em 21/10/2026** — `ae4e595` (#81), com o rito do remoto (backup `remoto-20261021-090802.sql`, a
> remedição sobre ele idêntica nas três medidas, **89 e 89** migrations, esquema `5d794f43…` igual nos dois bancos), CI
> verde na `main` e Production servindo o merge. 🟨 **PR 2** (#82, ramo `feat/BLOCO-6-curriculo-telas`) em conferência:
> CI verde; a **M3** (só acrescenta) no remoto pelo rito (backup `remoto-20261021-113521.sql`, 90 e 90); a **M4** (altera:
> a correção com justificativa, os recursos do trio e a policy do PDF) **no portão 9.4**, para entrar junto do merge.
>
> 🟨 **Conferência do PR #82 (21/10/2026): quatro ajustes ANTES do merge, no mesmo PR** — a página do curso **só leitura**
> no currículo vigente (sem seletor); a aba **Currículo** (lista e consulta só leitura); **Novo currículo** e a edição de
> **todo** o currículo dentro de **Editar curso**; e os **horários do currículo** (emenda à RC-1: os regimes nomeados vão
> para o currículo 1 de cada curso — **M5**, que altera, autorizada com a prova na cópia do remoto). A M4 e a M5 entram no
> remoto pelo rito e o merge vem **logo em seguida**. A `PEND-020-3` foi respondida: custo **é** controle da CIAARA-11.


Registrar um currículo novo (disciplinas, UEs, CH, avaliações, duração) **sem** alterar o vigente, e planejar as turmas do ano seguinte por ele, enquanto as turmas em andamento seguem o currículo em vigor. Mexe no vínculo turma → versão do currículo; não cabe em correção.

---

## Rodada 2 — padrões de tela *(pedido de Bernardo Villas Boas, 22/10/2026)*

## Bloco 7 — Padrões de tela (spec própria, sem banco) — ✅ CONCLUÍDO em 22/10/2026

> ✅ **Concluído em 22/10/2026** — spec `022-bloco-7-padroes-de-tela`, pelo fluxo `/corrigir`, num PR só: **#84**,
> **APROVADO** por Bernardo Villas Boas (itens 1–6; itens 7–11 acrescentados na conferência, no mesmo PR; D-1 a D-30 e
> A-1 a A-6 como ficaram) e mesclado por squash na `main` em **`bceea83`**. **Sem migration** (nada em `supabase/` nem em
> `lib/tipos/`). CI verde na `main` (run `39873438898`: 2.682 de unidade em 197 arquivos · 1.022 pgTAP em 66 · 443 invariantes e RLS em 27 · 552 de ponta a ponta + 7 pulados, sem instável) e Production servindo o merge; o ramo foi apagado,
> local e remoto.

1. **Botões padrão como ícone** com dica e nome acessível, no topo e à direita; componente único `BotaoDeIcone`, com o
   vocabulário fechado de ícones, e a guarda `tests/unidade/botoes-de-icone.test.ts`. O texto continua nos diálogos de
   confirmação destrutiva e no rodapé dos diálogos de formulário. O tema virou três ícones.
2. **Edição e cadastro em diálogo ou página própria**: a disciplina ganhou página própria em *Editar curso*
   (`/cursos/[curso]/editar/disciplinas/[disciplina]` e `/nova`); UE, avaliação do currículo, arbitrado, regime,
   limite, novo currículo, previsto, período, instrutores da turma, TA fora do DSA, juntar, parar dia, assinaturas,
   sala e nome do perfil abrem em diálogo. A guarda `tests/e2e/sem-campo-aberto.spec.ts` (SC-001).
3. **Ordem por classificação** (Regular → Expedito → Especial → Estágio de Qualificação → Aperfeiçoamento Avançado →
   as demais; dentro, pela sigla; turmas pelo curso e depois o ano), por `lib/dominio/ordem-de-cursos.ts`, em todas as
   listas, cartões, filtros e no submenu.
4. **Sininho de avisos** no cabeçalho e a página **Avisos** (`/avisos`), agrupada por módulo, com link para onde se
   resolve; o "visto" no navegador. **Os oito quadros de aviso das páginas saíram**, e o quadro da §6 da spec diz onde
   cada aviso passa a aparecer.
5. **Curso**: a aba *Grade* virou *Turmas* (`?aba=grade` redireciona); *Sobre o Curso* só com informações gerais (as
   regras de avaliação foram para a aba *Avaliações*); *Horários* sem as vigências, com o ícone que leva à edição dos
   regimes.
6. **Cores dos cartões do DSA** no preenchimento: aula, atividade e EI em azul claro (`planejado`), avaliação em verde
   (`executado`), conflito em amarelo (`atrasado`), feriado e dia parado em lilás (`conformidade`). **O papel não
   mudou**: `app/print/` e `lib/dominio/dsa/` sem diferença contra a `main` de partida.

**Conferência de 22/10/2026** *(Bernardo Villas Boas)*: itens 1–6 **aprovados**, decisões como ficaram, e cinco itens
acrescentados **no mesmo PR, antes do merge**:

7. **Pizza com todas as fatias**, sem "Outras" — desfaz o teto de 5 do componente e a Q-11 da spec 016 (emendas no
   documento 23 §7 e no `FR-007.2` da spec 016). Acima de 5, cada fatia leva o número e a legenda numerada diz o resto.
   A escolaridade dos instrutores, que ficava em barras só pelo teto, passou a pizza (`FR-026.2`).
8. **Gráficos de disciplinas pelo nome**, não pelo código; nome longo usa o *Nome no DSA* ou a abreviação do Bloco 2
   (`nomeNoGrafico`).
9. **Editar curso em três grupos** — *Identidade do curso*, *Oferta e custo*, *Currículo e suas partes* —, com a
   vigência do regime de horário dentro da parte *Horários*.
10. **Estatísticas de Cursos** no painel recolhível de Instrutores (agora em `components/ciaara/`): os dois números, a
    pizza de cursos por classificação e a duração em semanas de cada curso; a duração média por classificação saiu.
11. **Aviso de carga só ACIMA da faixa** — mudança de regra autorizada nominalmente (emenda ao `FR-016` da spec 006 e à
    T011 d; a faixa do `RN-2027-06` não muda), com o caso que discrimina (40h com 4 h por semana não avisa, nem no
    sininho; 20h com 14 h avisa).

**Pendências novas, achadas e não corrigidas:**

- **`PEND-022-1`** — *`inicio.spec.ts` (`FR-017.6`) conta um recorte que outras amostras também povoam.* O caso lê o
  número *Turmas no recorte* de `?classificacao=expedito&modalidade=ead` antes e depois de desativar um curso, e
  `semearCursos` (usada por 12 arquivos de `tests/e2e`, medido em 22/10/2026) cria turmas expeditas EAD no ano corrente, num processo novo a cada
  repetição: qualquer semente concorrente entre as duas leituras muda a conta. Medido no CI do PR #84, em que a guarda
  nova também a usava (consertado ali com amostra própria). Proposta: contar só as turmas da própria amostra. Classe
  da `PEND-014-7`.
- **`PEND-022-2`** — *o tempo da página Avisos com o dado real não foi medido.* Ela faz 17 leituras em paralelo
  (`app/(app)/avisos/leitura.ts`), sobre todas as turmas, instrutores e avaliações que a pessoa alcança, e o sininho
  pede o resumo no máximo uma vez a cada 2 minutos. Proposta: medir sobre a cópia do remoto antes de otimizar.

## Bloco 8 — Calendário em Atividades e desfazer feriado no DSA (spec própria) — ✅ CONCLUÍDO em 23/10/2026

> ✅ **Concluído em 23/10/2026** — spec `023-bloco-8-calendario`, pelo fluxo `/corrigir`, num PR só: **#86**, **APROVADO** por
> Bernardo Villas Boas (D-1 a D-18 como ficaram; a M2 sem portão confirmada, pelo resultado idêntico) e mesclado por squash
> na `main` em **`977b71a`**. As duas migrations no remoto antes do merge (backup `remoto-20261022-232457.sql`; 94 e 94;
> esquema `e5b55421…`, 2.425 objetos, igual nos dois bancos). CI verde na `main` (run `39895925086`: 2.697 de unidade ·
> 1.035 pgTAP · 450 invariantes e RLS · 554 de ponta a ponta + 1 instável da `PEND-014-7` + 7 pulados) e Production servindo
> o merge; o ramo foi apagado, local e remoto.

_Pedido de Bernardo Villas Boas, 22/10/2026, pelo `/corrigir`._ Spec `023-bloco-8-calendario`, ramo
`fix/BLOCO-8-calendario`, um PR.

1. 🐛 **DSA**: parar o dia de todas as turmas grava um feriado no calendário, e nada o desfazia — a faixa de paradas não
   o lia. Agora o feriado aparece na faixa (*"· todas as turmas"* ou *"· turmas escolhidas"*) com o ícone **Desfazer**
   para quem tem `calendario.editar`, com confirmação; desfazer **inativa**.
2. **Atividades → aba Calendário** (Admin e Encarregado): o ano escolhido, com as linhas ativas e inativas; cadastrar e
   editar em diálogo, com **tipo** (FR, LA, LP, RC, PF — a lista do *Parar dia*) e **abrangência** (todas as turmas ou
   turmas escolhidas); inativar e reativar com confirmação; *Parar dia* de todas as turmas; o aviso *"dia bloqueado com
   lançamento"* no sininho.
3. **Efeito medido** na cópia do remoto (`specs/023-…/antes-depois.md`): o 28/10/2026 (`FER-000024`) **já estava
   inativo** desde 22/10/2026 12:30 UTC, inativado sem sessão; inativá-lo devolve 1 dia útil e 5 a 8 TA de saldo a 8
   turmas, sem mudar veredito.
4. e2e por clique: `tests/e2e/calendario.spec.ts`.

**Pendências novas, achadas e não corrigidas:**

- **`PEND-023-1`** — *as 33 linhas antigas do calendário não têm tipo* (D-2): a tela lê a sigla do nome (`FR — …`) e,
  sem sigla, mostra *"não informado"*. Classificar as antigas é `UPDATE` em dado existente (portão 9.4), ou edição linha
  a linha pela tela nova.
- **`PEND-023-2`** — *o `D21` continua no dado*: *Nossa Senhora Aparecida* segue também em **12/11/2026**
  (`FER-000023`, ativo, além das duas linhas de 12/10). Corrigível agora pela aba Calendário, por Bernardo.
- **`PEND-023-3`** — *a alteração em semana de DSA já publicada*: mudar o calendário muda a semana sem aviso de *"alterado
  desde a publicação"*, porque a publicação ainda não existe. ✅ **Fechada pelo Bloco 9** (spec 024: o aviso do RP-4 compara
  o conteúdo da semana publicada, e o calendário entra nele). Era: ✅ **Coberta pelo Bloco 9** (a publicação do DSA, regra
  **RP-4**: *"se algo de fora mudar uma semana publicada (feriado ou parada pelo Calendário…), o DSA avisa e pede uma
  alteração"*) — decisão de Bernardo Villas Boas, 23/10/2026.

## Bloco 9 — Publicação do DSA (com rascunho) e contagem EAD/semipresencial (spec própria) — 🟨 PR aberto, sem merge

_Pedido de Bernardo Villas Boas, 23/10/2026, pelo `/corrigir`._ Spec `024-bloco-9-publicacao-do-dsa`, ramo
`feat/BLOCO-9-publicacao-do-dsa`, um PR. ⚠️ **O papel do DSA muda (PRÉVIA/ALT): merge só entre semanas.**

1. **Publicação do DSA** (`docs/correcoes/regras-da-publicacao-do-dsa.md`, RP-0 a RP-8): lançar é **rascunho** (guardado,
   «não salvo», não conta em nada; *Descartar rascunho*) → **Salvar** (só então registra e conta) → **Gerar prévia** (PRÉVIA,
   exige semana salva) → **Publicar** (original, retrato, semana travada) → **Fazer alteração** → **Publicar alteração**
   com justificativa obrigatória (ALT N no papel). Histórico com *Reimprimir*. O aviso *"alterado desde a publicação"*
   inclui o Calendário (fecha a `PEND-023-3`). **Portão autorizado** (22/10/2026): a M2 filtra `salvo` em tudo o que soma
   ou cruza lançamentos — provado na cópia do remoto: as 12 leituras do banco, as telas das 30 turmas e as 327 páginas
   idênticas, fora as 14 da EAD (item 2) (`specs/024-…/antes-depois.md`).
2. **EAD não conta TA** em lugar nenhum (andamento, saldo, Início, Turmas): o aviso da Divisão de Ensino a Distância no
   lugar. **Semipresencial** conta só a etapa presencial pela marca **presencial** da disciplina (*Editar curso →
   Currículo → Disciplinas*); sem marca, aviso e conta tudo. Medido nas 6 EAD e 5 semipresenciais da cópia.

**Pendências novas, achadas e não corrigidas:**

- **`PEND-024-1`** — *nenhuma disciplina está marcada presencial*: as 5 semipresenciais seguem contando tudo, com o
  aviso, até alguém marcar as disciplinas presenciais do currículo (pela tela, Bernardo ou o Encarregado).
- **`PEND-024-2`** — *só 1 das 5 semipresenciais tem a etapa presencial cadastrada* (`C-ApA-AuxNav-PR-SP T2 2026`,
  26 a 30/10/2026); nas demais, marcar disciplinas dá o aviso «sem etapa» e continua contando tudo.
- **`PEND-024-3`** — *o aviso do RP-4 não olha o quadro de CH acumulada* (D-8): uma correção numa semana **anterior**
  muda o acumulado impresso nas seguintes já publicadas sem aviso. Proposta: decidir se o quadro entra na comparação.

---

## Fora do plano

- **"Revisar o fluxo e tornar o sistema mais amigável"** e **"padronizar os botões"**: vago demais para virar requisito; entra item a item nos blocos (a barra de ações do 1.6 é o primeiro) e no Claude Design.
- **Impressão do DSA no modelo atual**: desconsiderado por Bernardo (16/10/2026).
- **"Cadastro histórico defasado"**: é a carga final (VIRADA-1).
