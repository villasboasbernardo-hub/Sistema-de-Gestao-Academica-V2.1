# Contrato — a casca de navegação

**Fase 1** · 11/09/2026 · fonte: documento 23 §3.1 e §3.2 · documento 24 §1 · `RF-NAV-02`,
`RF-MOD-01`, `FR-015` a `FR-022`

## A regra que vale para os três, antes da tabela

O shell **enquadra**. Ele não busca dado de negócio, não decide regra e não escolhe cor.

⚠️ **E ele carrega a fronteira mais cara do sistema.** O marcador de cliente contamina toda a
subárvore de importação: um deles na casca manda **todas as telas** para o pacote do navegador. O
erro **não aparece na checagem de tipos** — aparece no build, que é por que o build faz parte da
verificação local.

⚠️ **Nenhum dos três estava no inventário do documento 23 §3.1** (`CHK015`, medido em 11/09/2026).
Eles entram agora, com arquivo, base e fronteira declarados — do mesmo jeito que os treze da fatia
(b) entraram, e foi por isso que aqueles nasceram com endereço.

⚠️ **E fica registrado o motivo provável da ausência** (achado P-4 do plano): o §3.1 descreve
**vocabulário de domínio**, e casca não é vocabulário. O inventário passa a descrever duas coisas.

---

## Os três

### `CascaDoApp` — `RF-MOD-01` · **sem** marcador de cliente

**Recebe** o usuário da sessão, as permissões do perfil, e o conteúdo da rota.
**Rende** a estrutura: cabeçalho, navegação e a região de conteúdo.
**Não faz** consulta de negócio, e não decide permissão — ela chega pronta.

⚠️ **Substitui o cabeçalho provisório de `app/(app)/layout.tsx`**, que hoje mostra nome do sistema,
nome do usuário e perfil, **e nenhum link** (`FR-018`). Ele é uma das cinco telas do Épico 3 sem
vocabulário visual, e sai daqui usando token.

### `CabecalhoDoApp` — `RF-NAV-02`, `RF-INI-05` · **sem** marcador de cliente

**Recebe** o brasão, o nome do usuário, e o caminho atual.
**Rende** a marca institucional, a identificação de quem está logado e o alternador de tema.
**Não faz** navegação própria — quem navega é o menu.

⚠️ **O brasão é o de tela, nunca o de impressão** (`FR-032.1`). Medido: 226 KB contra 6,3 MB, para um
desenho que aparece a quarenta pixels de altura.
⚠️ **O alternador de tema da vitrine SAI quando este entrar** (`FR-018`) — substituição, não
duplicação. Dois alternadores foi o resultado que o `CHK019` previu.

### `NavegacaoLateral` — `RF-NAV-02` · **com** marcador de cliente, e só no que abre e fecha

**Recebe** a lista de entradas e o caminho atual.
**Rende** as entradas, com a ativa marcada.
**Não faz** decisão de permissão — ela vem resolvida, e esconder entrada é cortesia, não proteção.

⚠️ **A marcação da entrada ativa é derivada do caminho, no servidor.** Ela muda por navegação, não
por interação — e isso é o ponto: **a entrada ativa é a URL**.
⚠️ **O marcador de cliente cobre apenas abrir e fechar em tela estreita.** É estado efêmero de
interface, e é o único do shell que o é.
⚠️ **Esconder entrada não protege nada** (Princípio XI). Quem nega acesso é o banco, ainda que
alguém digite a URL.

---

## O rascunho da lista de entradas

⚠️ **ISTO É RASCUNHO, E NÃO É A FONTE.** Ele foi derivado da árvore de rotas do documento 24 §1, que
é o **alvo da v2.1** — não o menu da v2.0, que é o que o `RF-NAV-02` manda preservar. **Bernardo
valida contra o sistema em produção antes de a fatia fechar** (`FR-017.1`).

| # | Rótulo proposto | Rota |
|---|---|---|
| 1 | Início | `/inicio` |
| 2 | Cursos | `/cursos` |
| 3 | Cronograma | `/cronograma` |
| 4 | Atividades | `/atividades` |
| 5 | Instrutores | `/instrutores` |
| 6 | Disciplinas | `/disciplinas` |
| 7 | Administração | `/admin/usuarios` |

⚠️ **Duas rotas existem e NÃO entram no menu**, por força do `RF-CURSO-02`, que é **[PRESERVADO]**:

| Rota | Alcançada por |
|---|---|
| `/avaliacoes` | a página do curso |
| `/relatorio` | a página do curso |

**Quem derivar a lista da árvore sem ler o `RF-CURSO-02` acrescenta duas entradas que a v2.0 nunca
teve** — e o `FR-017` proíbe exatamente isso.

⚠️ **Três perguntas que só quem vê a v2.0 responde**, e que o rascunho não tem como acertar sozinho:
a **ordem** das entradas; se "Disciplinas" aparece com esse rótulo (a decisão P-14 fixou o termo no
schema e no código, mas o menu da v2.0 pode trazer o antigo); e se Administração é entrada única ou
grupo.

---

## O que o shell precisa entregar de acessibilidade

| Exigência | Requisito |
|---|---|
| Marco de navegação anunciado | `FR-021` |
| Atalho para pular ao conteúdo | `FR-021` |
| Destino de foco declarado ao trocar de rota | `FR-021` |
| Entrada ativa comunicada além da cor | `FR-021`, e é o `FR-025` da fatia (b) aplicado ao menu |

⚠️ **A fatia (b) fechou acessibilidade para componentes; a navegação é a parte que ela não
alcançou.** Sem o atalho, quem usa teclado atravessa o menu inteiro a cada tela — que é o mesmo
problema dos 2.400 pressionamentos que a tabela densa resolveu, noutro lugar.

---

## Carregamento e erro por segmento

Cada segmento tem retorno visual e contenção de erro próprios (`FR-020`, `RF-MOD-01`, `RN-DEG-01`).

⚠️ **A falha de uma região não derruba a casca.** É o que separa uma tela com um painel quebrado de
uma sessão perdida — e é a razão de a contenção ser por segmento, e não uma só na raiz.

---

## Submissão a Bernardo — as três perguntas, com o que está implementado hoje

**Estado em 11/09/2026:** a casca está de pé e o menu abaixo é o que ela desenha. **Ele é rascunho
até esta seção ser respondida** (`FR-017.1`, `SC-012`), e a implementação foi escrita para que a
resposta custe uma edição em `lib/navegacao/menu.ts`, e nada mais.

| # | Rótulo | Rota | Estado da tela |
|---|---|---|---|
| 1 | Início | `/inicio` | **em breve** — História 4 desta fatia |
| 2 | Cursos | `/cursos` | em breve — Épico 7 |
| 3 | Cronograma | `/cronograma` | em breve — Épico 9 |
| 4 | Atividades | `/atividades` | em breve — Épico 8 |
| 5 | Instrutores | `/instrutores` | em breve — Épico 5 |
| 6 | Disciplinas | `/disciplinas` | em breve — Épico 6 |
| 7 | Administração | `/admin/usuarios` | **pronta** |

### Q1 — A ordem das entradas está certa?

A lista acima veio da **árvore de rotas do documento 24 §1**, que é o alvo da v2.1 — **não** o menu
que está em produção. O `RF-NAV-02` é **[PRESERVADO]** e diz que a troca de mecanismo de estado *"não
autoriza reorganizar o menu nem renomear entradas"*. Derivar da árvore-alvo **é** reorganizar sem
perceber, e só quem vê a v2.0 sabe se aconteceu.

### Q2 — "Disciplinas" é o rótulo que a v2.0 usa no menu?

A decisão **P-14** fixou o termo em schema, código e documentação. Ela não disse nada sobre o texto
do menu da v2.0, que pode trazer o antigo. **Se trouxer, o `RF-NAV-02` manda preservar o antigo na
tela** — e a divergência entre o rótulo e o schema passa a ser pretendida, não descuido.

### Q3 — Administração é entrada única ou grupo?

Hoje é **entrada única**, apontando para Usuários; Permissões é alcançada por uma aba dentro da
própria tela de administração. Foi resolvido assim de propósito, **sem mexer no menu**, porque é o
mesmo padrão que o `RF-CURSO-02` manda usar para Avaliações e Relatório: a função é alcançada pela
tela de que ela faz parte.

### Uma decisão de projeto que também precisa do seu aval

**As entradas sem tela aparecem no menu, marcadas "em breve".** A alternativa era mostrar só o que
existe — e aí o menu cresceria a cada épico, ensinando quem usa a reaprender a navegação sete vezes.
⚠️ **O risco da escolha atual é parecer quebrado**; o risco da outra é contrariar o `RF-NAV-02`, que
manda manter os mesmos pontos de entrada de hoje.

### Registro da validação

| Item | Resposta | Data |
|---|---|---|
| Q1 · ordem | *(pendente)* | — |
| Q2 · rótulo de Disciplinas | *(pendente)* | — |
| Q3 · Administração única ou grupo | *(pendente)* | — |
| Entradas futuras visíveis | *(pendente)* | — |

⚠️ **ENQUANTO ESTA TABELA TIVER "pendente", O `FR-017` NÃO É VERIFICÁVEL** — e é por isso que ela
existe em vez de a validação ser dada por feita.
