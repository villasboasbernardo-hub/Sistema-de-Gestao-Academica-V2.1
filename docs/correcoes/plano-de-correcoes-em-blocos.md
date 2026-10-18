# Plano de correções em blocos — CIAARA-11 v2.1

_Criado em 16/10/2026, a partir das anotações de testes de Bernardo Villas Boas e da medição do código na `main` `e968f22` (spec 014 encerrada)._
_É o documento que seguimos até o próximo épico. Cada bloco vira **uma spec** do Spec Kit (specify → clarify → plan → tasks → analyze → implement), num **ramo novo a partir da `main`**, e só começa depois do merge do bloco anterior._

---

## Como ler este plano

- **Bloco 1** é correção: tela e defeitos, sem tabela nova. É o que entra agora.
- **Blocos 2 a 5** trazem tabela ou coluna nova. Cada migration passa pelo rito do remoto: backup, dry-run só com ela, `db push`, conferência só de leitura.
- **Bloco 6** é um épico próprio e fica por último.
- Item marcado com 🐛 é defeito. Os demais são regra nova ou melhoria.
- **Decisão D-COR-n** é decisão de Bernardo, com data, e prevalece sobre texto anterior de spec.

| Bloco | Tema | Banco? | Spec prevista |
|---|---|---|---|
| **1** | Correções de tela e defeitos | não (exceto, se precisar, a view do saldo, pelo portão 9.4) | 016 |
| **2** | Turmas: andamento manual, status, arquivar, dashboard | sim | 017 |
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

## Bloco 1 — Correções de tela e defeitos (agora)

**Ramo:** `fix/BLOCO-1-correcoes-de-tela`, a partir da `main` atualizada. **Spec:** `specs/016-correcoes-bloco-1/`.
**Banco:** nenhuma tabela nova. A única exceção possível é a view do saldo (item 14), pelo portão da regra 9.4.

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

## Bloco 2 — Turmas (spec própria)

1. **TA fora do DSA, com observação** (D-COR-3), por disciplina da turma: quantidade, instrutor quando houver e observação; somam no executado e no saldo, mostrados separados. Serve também para o **histórico** de curso concluído sem lançar DSA antigo, e para **marcar a disciplina como concluída**. Sem ajuste negativo. Só Encarregado, ajudantes e Admin.
2. **Status editável com observação** (D-COR-4) em toda troca: cancelada, concluída e arquivada.
3. **Arquivar em qualquer estado** (D-COR-5), com aviso se não concluída.
4. **Dashboard de turmas**, no molde do de instrutores: total, canceladas, concluídas, em andamento, iniciando nos próximos 30 dias, e alertas do que falta (data, instrutor, conflito).
5. **Migrar para Turmas o que é da turma** e ainda está em Cursos (instrutor por disciplina da turma, datas, sala), se a medição mostrar que sobrou algo depois da spec 012.

## Bloco 3 — Página do curso em abas (spec própria)

1. Aba **Disciplinas**, com o cadastro e as UEs; a entrada *Disciplinas* sai do menu lateral.
2. Aba **Atividades extraclasse** (o previsto no currículo; o acompanhamento é da turma).
3. Aba **Horários**: regimes nomeados por curso (ex.: A com 8 TA, B com 9 TA, C com 8 TA e intervalos menores), escolhidos **por turma**; o DSA usa o regime da turma. Troca por semana fica para depois.
4. O curso **não** mostra acompanhamento de turma em aba nenhuma: só o previsto no currículo.

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

## Bloco 6 — Currículo versionado (épico próprio, por último)

Registrar um currículo novo (disciplinas, UEs, CH, avaliações, duração) **sem** alterar o vigente, e planejar as turmas do ano seguinte por ele, enquanto as turmas em andamento seguem o currículo em vigor. Mexe no vínculo turma → versão do currículo; não cabe em correção.

---

## Fora do plano

- **"Revisar o fluxo e tornar o sistema mais amigável"** e **"padronizar os botões"**: vago demais para virar requisito; entra item a item nos blocos (a barra de ações do 1.6 é o primeiro) e no Claude Design.
- **Impressão do DSA no modelo atual**: desconsiderado por Bernardo (16/10/2026).
- **"Cadastro histórico defasado"**: é a carga final (VIRADA-1).
