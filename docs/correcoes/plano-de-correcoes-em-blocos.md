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

## Bloco 4 — Início (spec própria)

1. Dashboard das turmas do ano vigente.
2. Cartões das turmas com barra de progresso, em **carrossel automático e com setas**.
3. Carrossel com os **DSA da semana atual** das turmas que têm DSA, um por vez.
4. Submenu na lateral: **Cursos** → classificação → curso, e **Turmas** → curso → turma, abrindo a página já filtrada.

## Bloco 5 — Cadastros novos (spec própria)

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
- **PEND-014-7** — testes de ponta a ponta instáveis sob carga (`salas.spec.ts:126`, `dsa-tipo-e-global.spec.ts:160`, `avaliacoes-nas-telas.spec.ts:53`, `admin-sobre-contas`).
- **OneDrive** — a pasta do repositório deve ficar "Sempre manter neste dispositivo": arquivos sob demanda já quebraram o build (`.next`, `EPERM`) e o `git switch` (`specs`).

## Bloco 6 — Currículo versionado (épico próprio, por último)

Registrar um currículo novo (disciplinas, UEs, CH, avaliações, duração) **sem** alterar o vigente, e planejar as turmas do ano seguinte por ele, enquanto as turmas em andamento seguem o currículo em vigor. Mexe no vínculo turma → versão do currículo; não cabe em correção.

---

## Fora do plano

- **"Revisar o fluxo e tornar o sistema mais amigável"** e **"padronizar os botões"**: vago demais para virar requisito; entra item a item nos blocos (a barra de ações do 1.6 é o primeiro) e no Claude Design.
- **Impressão do DSA no modelo atual**: desconsiderado por Bernardo (16/10/2026).
- **"Cadastro histórico defasado"**: é a carga final (VIRADA-1).
