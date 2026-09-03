# Checklist de Entrega: Épico 0 — fases 6 a 9 (replantio, CI, pré-visualização)

**Purpose**: Portão formal sobre a **qualidade dos requisitos** ainda não implementados do Épico 0 —
replantio do repositório (FR-021.x), CI e bloqueio de merge (FR-014.x, FR-015, FR-010, FR-002.x) e
pré-visualização (FR-016.x, FR-017, FR-018, FR-022.x). Percorrer **antes de autorizar o replantio**
(T034) e **antes do primeiro PR** (FR-014.1).

**Created**: 2026-09-03
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) · [tasks.md](../tasks.md)
**Público**: Bernardo, como quem decide — os itens perguntam pelo **texto do requisito**, não por código.
**Escopo**: fases 6 a 9 do `tasks.md` (T033–T072). As fases 1–5 já entregues não são reabertas aqui, e a
qualidade da spec como documento já foi validada em [requirements.md](./requirements.md), 16/16.

**Como ler**: cada item pergunta se o requisito está **escrito** de forma completa, clara, consistente e
mensurável. Um item marcado ⛔ é **bloqueante**: responder "não" significa que o requisito precisa de uma
decisão sua antes que a etapa correspondente comece. A lista de bloqueios consolidada está no fim.

---

## Fase 6 — Replantio do repositório: completude e clareza

- [ ] CHK001 ⛔ O verbo "preservado" do FR-021 está definido? `git subtree split` mantém mensagem, autor e data mas **gera SHA novo** — o requisito não diz se isso satisfaz "preservar" [Clareza, Spec §FR-021, plan.md §Reavaliação item 1]
- [ ] CHK002 ⛔ O FR-021 fala em "**o** commit de 26/08/2026", no singular; o FR-021.2 nomeia **dois** (`d19ab10`, `d31bd56`) e a pesquisa R-1 produziu **dois** commits replantados. Quantos o replantio precisa carregar? [Conflito, Spec §FR-021 × §FR-021.2 × research R-1]
- [ ] CHK003 A exigência de registrar a **correspondência de SHA** (antigo → novo) existe como tarefa (T037), mas não como requisito. É obrigação ou escolha do plano? [Rastreabilidade, Lacuna]
- [ ] CHK004 ⛔ "O caminho antigo não responde mais como projeto ativo" (FR-021.3) pode ser verificado objetivamente? O requisito não diz o que caracteriza "projeto ativo" [Mensurabilidade, Spec §FR-021.3]
- [ ] CHK005 ⛔ O FR-021.3 exige que o `git status` do `SIS11` não acuse a árvore da v2.1 como modificada, mas nenhum requisito diz o **destino da pasta `Versao_2.1_NextJS/` dentro do `SIS11`**: removida por commit, mantida, ou ignorada. As três satisfazem a letra e significam coisas diferentes [Lacuna, Spec §FR-021.3 × §FR-021.2]
- [ ] CHK006 O caminho de destino do FR-021.1 aparece como "**proposta**". Ele é normativo, ou o plano pode trocá-lo sem emendar o requisito? [Ambiguidade, Spec §FR-021.1]
- [ ] CHK007 ⛔ Nenhum requisito registra que a pasta de destino vive **dentro do OneDrive**, que sincroniza enquanto o `git init` e a movimentação acontecem. A interação sincronização × operação de git é omissa em toda a spec — o termo só aparece como caminho [Lacuna, Caso de borda, Spec §FR-021.1]
- [ ] CHK008 ⛔ Existe requisito de **recuperação** para o replantio? Se a raiz sair errada ou o push for recusado, nada está escrito sobre como voltar. O plano chama a etapa de "a única irreversível na prática" e ainda assim ela não tem caminho de volta [Lacuna, Fluxo de recuperação, plan.md §Summary]
- [ ] CHK009 ⛔ **Nenhum dos oito critérios de sucesso cobre o FR-021.x** — verificado. A única etapa irreversível da fatia não tem resultado mensurável declarado [Rastreabilidade, Lacuna, Spec §Success Criteria]
- [ ] CHK010 ⛔ O replantio empurra direto para `main` (FR-021, T036), enquanto o `CLAUDE.md` determina "**Nunca `git push` direto na `main`**". A exceção está autorizada por escrito? [Conflito, CLAUDE.md §Convenções de commit × Spec §FR-021]

## Fase 7 — O portão de CI: consistência entre requisito, critério e contrato

- [ ] CHK011 ⛔ **Nenhum dos três contextos executa a suíte de ponta a ponta** — verificado em `ci-contextos.md`: `qualidade` roda `vitest run tests/unidade`, `banco` roda pgTAP e RLS, `build` roda `next build`. Ainda assim o SC-003 exige que um defeito **de ponta a ponta** bloqueie o merge. O contrato do CI e o critério de sucesso não podem estar os dois certos [Conflito, contracts/ci-contextos.md × Spec §SC-003]
- [ ] CHK012 ⛔ O FR-013 define `verificar:tudo` como "a sequência completa do CI, **incluindo o de ponta a ponta**" — e o `package.json` o implementa assim. Se o CI não roda ponta a ponta, o SC-005 (vereditos coincidem) é insatisfazível por construção nesse caso [Conflito, Spec §FR-013 × §SC-005]
- [ ] CHK013 ⛔ O comando de proteção declara `enforce_admins=false`. O FR-014 exige "**bloquear** o merge" e o SC-003 exige que "em nenhum dos quatro casos o merge fica disponível". Para o administrador — que é quem opera — o merge continua disponível. O requisito quer bloqueio para todos, ou portão que o responsável pode atravessar conscientemente? [Conflito, contracts/ci-contextos.md × Spec §FR-014, §SC-003]
- [ ] CHK014 ⛔ A proteção exige `required_approving_review_count=1` num projeto de **um único operador**, e a plataforma não permite aprovar o próprio PR. Nenhum requisito diz quem aprova, nem prevê revisor único [Lacuna, Spec §FR-014.1]
- [ ] CHK015 "Aviso de lint **novo**" reprova o bloco `qualidade`, mas nenhum requisito declara a linha de base do que é "novo", nem se o lint roda com tolerância zero a avisos [Mensurabilidade, contracts/ci-contextos.md, CLAUDE.md §DoD]
- [ ] CHK016 O FR-015 exige provar o bloqueio "quebrando o CI de propósito **uma vez**"; o SC-003 exige as **quatro** formas de defeito, e T048 executa quatro. Uma prova ou quatro? [Conflito, Spec §FR-015 × §SC-003]
- [ ] CHK017 O FR-010 exige reprovar contrato de dados divergente, mas nenhum requisito exige que `lib/tipos/database.ts` esteja **rastreado pelo git** — sem isso o portão passa por vacuidade. Já registrado como T064; falta o requisito correspondente [Lacuna, Spec §FR-010]
- [ ] CHK018 O bloco `banco` precisa de credenciais que o contrato marca "CI (**se necessário**)". Quais o CI exige de fato, e quem as cadastra? [Ambiguidade, contracts/variaveis-ambiente.md]
- [ ] CHK019 O FR-014 exige CI "em todo push e todo PR", sem dizer o que vale quando os dois disparam sobre o mesmo commit [Clareza, Spec §FR-014]
- [ ] CHK020 O invariante CI-1 exige que renomear um contexto atualize a proteção "no mesmo commit"; nenhum FR carrega essa obrigação, e o modo de falha é **silencioso** — o portão para de exigir o bloco sem avisar ninguém [Lacuna, contracts/ci-contextos.md CI-1]

## Segredos e repositório público

- [ ] CHK021 ⛔ O FR-002.1 exige que um push com "**chave reconhecida**" seja recusado, sem dizer quais tipos precisam ser reconhecidos. A `service_role` é um JWT; o requisito não afirma que ela está entre os padrões cobertos — e sem isso a exigência não é verificável [Mensurabilidade, Spec §FR-002.1]
- [ ] CHK022 O FR-002.2 manda o procedimento estar "onde quem opera vá encontrá-lo", sem nomear o documento [Clareza, Spec §FR-002.2]
- [ ] CHK023 O **conteúdo** do procedimento de rotação não é especificado: quais chaves, em quais lugares (Supabase, Vercel, CI, `.env.local`) e em que ordem. O requisito exige o procedimento escrito sem dizer o que ele contém [Completude, Spec §FR-002.2]
- [ ] CHK024 Não há requisito para o **falso positivo**: a proteção de push recusando um placeholder legítimo do `.env.local.example` [Lacuna, Caso de borda]

## Fase 8 — Pré-visualização, rótulo de ambiente e isolamento

- [ ] CHK025 ⛔ O FR-016 exige pré-visualização para "**todo** push em branch" e o FR-016.1 proíbe produção. O que a branch `main` publica **não está escrito** — e o comportamento padrão da plataforma é publicar `main` em produção [Conflito, Spec §FR-016 × §FR-016.1]
- [ ] CHK026 ⛔ O repositório é **público** e nenhum requisito trata do **controle de acesso à URL de pré-visualização**. O FR-022 restringe o *dado*; o acesso à tela não é mencionado — nem exigido, nem dispensado por escrito [Lacuna, Spec §FR-022]
- [ ] CHK027 ⛔ "Dado sintético" (FR-022) só é definido nas *Assumptions* — "seed versionado; até lá, schema vazio". Um limite institucional depende de definição que vive fora da seção normativa [Clareza, Spec §FR-022 × §Assumptions]
- [ ] CHK028 ⛔ O FR-022.1 designa `cqhpfuaweoyglhtrckcp` como desenvolvimento/preview; o plano diz que o banco **local** é Docker; o achado de 26/08 registra `.env.local` apontando para `cqhpfu…`. O requisito não resolve se `local` é o Docker ou o projeto remoto — e disso depende se a máquina de trabalho e a pré-visualização compartilham banco [Ambiguidade, Spec §FR-022.1, §FR-022.2, research R-7]
- [ ] CHK029 O FR-022 exige separação "**verificável**". A verificação disponível é a ausência de variáveis no escopo Production. O requisito não diz se ausência de configuração conta como prova de inalcançabilidade [Mensurabilidade, Spec §FR-022, invariante A-3]
- [ ] CHK030 O FR-022.2 exige que toda variável "declare a que ambiente pertence", sem dizer **onde** essa declaração vive [Clareza, Spec §FR-022.2]
- [ ] CHK031 O FR-017 exige faixa "**visível**" sem critério objetivo: posição, contraste, em quais rotas, e se sobrevive à impressão [Mensurabilidade, Spec §FR-017]
- [ ] CHK032 O FR-017 exige que o rótulo `producao` "permaneça previsto e **não utilizado**" — sem critério de como se verifica um valor que não é usado [Mensurabilidade, Spec §FR-017]
- [ ] CHK033 ⛔ O FR-018 exige que a falha de deploy mantenha "o ambiente **anterior** no ar". Numa branch nova não há ambiente anterior; o requisito não define o esperado nesse caso [Caso de borda, Spec §FR-018]
- [ ] CHK034 O SC-006 exige que Bernardo abra a URL, mas nenhum requisito diz **como a conferência fica registrada** — sem registro, o critério não é auditável depois [Lacuna, Spec §SC-006]

## Dependências, premissas e atos humanos

- [ ] CHK035 Os pré-requisitos que só Bernardo pode cumprir — `gh auth refresh -s workflow`, `supabase login`, aprovar o PR, abrir a pré-visualização — vivem em contratos, pesquisa e tarefas; **nenhum é requisito**, e não há lista única do que trava por falta de ato humano [Rastreabilidade, Lacuna, research R-5, quickstart §Pré-requisitos]
- [ ] CHK036 A premissa de que `cqhpfuaweoyglhtrckcp` é o **único** projeto da conta continua não confirmada (a CLI não estava autenticada). O FR-022.1 atribui papéis sobre premissa não validada [Premissa, Spec §Assumptions]
- [ ] CHK037 A ordem obrigatória — CI antes da proteção, proteção antes do primeiro PR — está nas *Assumptions* e no plano, **não nos requisitos**. Invertida, deixa o portão desligado exatamente quando ele deveria valer [Rastreabilidade, Spec §FR-014.1 × §Assumptions]

---

## Portão — o que precisa de decisão sua, e quando

**Antes de T034 (o replantio):** CHK001, CHK002, CHK004, CHK005, CHK007, CHK008, CHK009, CHK010.
São oito, e sete são de redação — o único que pode custar trabalho é o CHK007 (OneDrive).

**Antes do primeiro PR (FR-014.1):** CHK011, CHK012, CHK013, CHK014, CHK021.
O CHK011 e o CHK012 são o mesmo defeito visto de dois ângulos: a suíte de ponta a ponta está no
`verificar:tudo` e **não está em nenhum contexto do CI**. Ou entra num quarto bloco, ou o SC-003 e o
SC-005 mudam de texto. O CHK013 com o CHK014 formam o outro: a proteção, como o contrato a escreve,
exige um aprovador que não existe e isenta o administrador que é quem opera.

**Antes do primeiro push na Vercel:** CHK025, CHK026, CHK027, CHK028, CHK033.

## Notas

- **Este checklist não testa implementação.** Ele pergunta se o requisito está escrito de modo que duas
  pessoas cheguem à mesma conclusão. Nenhum item pede para rodar comando — os comandos estão no
  [quickstart.md](../quickstart.md), que é o roteiro de validação e continua valendo como está.
- **Três achados foram conferidos no arquivo antes de virar item**, para que o portão não carregue
  afirmação falsa: a ausência de ponta a ponta nos três contextos do CI (CHK011), a ausência de qualquer
  critério de sucesso cobrindo o replantio (CHK009) e a ausência de qualquer menção a sincronização de
  nuvem (CHK007).
- **Sobreposição com os achados de convergência (T063–T072):** apenas o CHK017 toca um item já
  registrado (T064). Os outros 36 são novos — o `/speckit-analyze` de 27/08 conferiu consistência entre
  artefatos, não completude dos requisitos das fases ainda por implementar.
- **O que este checklist deliberadamente não cobre:** as fases 1–5, já entregues e verdes; a qualidade da
  spec como documento, validada em [requirements.md](./requirements.md); e as pendências documentais
  D-1 a D-10, que têm tarefas próprias (T059–T061) e não bloqueiam o replantio.
