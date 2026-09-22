# Roteiro de conferência local — os dados reais, com os seus olhos

**Para quem:** Bernardo. **Quando:** depois da carga do PR 1, antes do fechamento.
**Quanto tempo:** uns 20 minutos. **Escrito em:** 18/09/2026.

> Os cinco números da §4 foram **conferidos na própria tela** em 18/09/2026, e não deduzidos do banco.

> ⚠️ **Correção de 22/09/2026 — a primeira versão deste roteiro não deixava entrar.** Ela mandava
> abrir o sistema com `pnpm dev`, e esse comando conversa com o **banco remoto**, não com o da sua
> máquina: a sua conta existia e a senha estava certa, mas a pergunta ia para outro lugar, e a tela
> respondia *"e-mail ou senha incorretos"*. **O erro foi de conferência, e foi meu**: eu tinha
> conferido os números por um caminho que já aponta para o banco local, e não pelo comando que
> mandei você usar. O passo 3 agora usa `pnpm dev:local`, e o login foi refeito em 22/09/2026 com o
> seu e-mail e a sua senha, num navegador de verdade, até a tela mostrar as 28 turmas.

## Registro da conferência — 22/09/2026

**Feita por Bernardo Villas Boas em 22/09/2026, e concluída.**

| O que se conferiu | Resultado |
|---|---|
| Os cinco números da §4, na tela | **[pendente — o resultado não veio na mensagem de 22/09/2026]** |
| As 9 turmas com a grafia da sala trocada (§5.1) | **[pendente — o resultado não veio na mensagem de 22/09/2026]** |

⚠️ **Dois defeitos de acesso apareceram no caminho, e os dois valem para quem repetir o roteiro:**

1. **`pnpm dev` abre o sistema contra o banco da NUVEM**, e a conta de conferência só existe no da
   máquina — o login responde *"e-mail ou senha incorretos"* com a senha certa. Corrigido no passo 3
   (`pnpm dev:local`). E um `pnpm dev` esquecido aberto **continua respondendo no lugar do novo**: foi
   o que manteve o erro na segunda tentativa.
2. **Abrir pelo endereço de rede da máquina, e não por `localhost`, também impede o login** — ver o
   aviso no passo 3.

---

Este roteiro é para você abrir o sistema na sua máquina e comparar o que aparece na tela com o
que você sabe que existe na planilha. Nada aqui apaga nada: o banco da sua máquina é uma cópia
descartável, e o sistema em produção continua sendo a v2.0, intocado.

---

## 1. Subir o ambiente — três comandos, nesta ordem

Abra o terminal na pasta do projeto e rode um de cada vez, esperando cada um terminar:

```
pnpm db:start
pnpm db:reset
python -m scripts.etl.executar --primeira-carga
```

- O primeiro liga o banco (precisa do Docker aberto).
- O segundo **zera** o banco e monta a estrutura do zero.
- O terceiro traz os dados da planilha da v2.0.

**O terceiro tem de terminar dizendo `VEREDITO: APROVADA`.** Se disser outra coisa, pare e me
chame — não adianta conferir tela com carga reprovada.

⚠️ **A ordem importa e não é preferência.** Rodar a carga sem o `db:reset` antes faz ela parar
com erro, porque a base fica com sobras da execução anterior.

## 2. Criar o seu acesso — uma vez só

A planilha da v2.0 nunca teve senha, então os cadastros chegam **sem** credencial. Este comando
cria a sua, **só nesta máquina**:

```
python -m scripts.manutencao.credencial_local villasboasbernardo@gmail.com
```

Ele responde com o endereço, o e-mail e a senha. Guarde a senha: `conferencia-local-12345`.

## 3. Abrir o sistema — atenção: é `dev:local`, não `dev`

**Primeiro, feche qualquer `pnpm dev` que esteja aberto.** Vá na janela do terminal onde ele está
rodando e aperte **Ctrl + C**. Se houver um de pé, o próximo comando se recusa a subir e avisa
*"Another next dev server is already running"*.

Depois:

```
pnpm dev:local
```

A primeira linha que ele imprime tem de dizer **`banco: http://127.0.0.1:54321`** — é a confirmação
de que está falando com o banco da sua máquina. Então abra no navegador:
**http://localhost:3000/login** e entre com o seu e-mail e a senha acima.

⚠️ **Abra por `localhost`, nunca pelo endereço "Network" que o comando também imprime** (algo como
`http://10.217.174.90:3000`). Por esse endereço o Next **bloqueia os arquivos de desenvolvimento** —
o terminal mostra *"Blocked cross-origin request to Next.js dev resource"* —, a tela aparece mas o
botão **Entrar não funciona**, e o login não acontece. Reproduzido em 22/09/2026: pelo `localhost`
entrou, pelo endereço de rede ficou parado em `/login`.

A primeira abertura de cada tela demora alguns segundos — é o programa se montando, não é
lentidão do sistema.

⚠️ **Por que não `pnpm dev`:** o arquivo de configuração do projeto aponta para o banco **remoto**,
e o `pnpm dev` obedece a ele. A sua conta de conferência só existe no banco **da sua máquina**, então
por `pnpm dev` a tela diz *"e-mail ou senha incorretos"* — com a senha certa. O `pnpm dev:local`
troca o endereço só enquanto está rodando, sem mexer no arquivo.

---

## 4. Os números que você deve ver

| Onde | O que olhar | O número certo |
|---|---|---|
| **Início** (`/inicio`) | as turmas listadas no painel | **28** |
| **Início** | o aviso no topo | **"Nada exigindo atenção"** — nenhuma turma em atraso |
| **Instrutores** (`/instrutores`) | a contagem no topo da lista | **177 instrutor(es) ativo(s)** |
| **Instrutores** | o filtro "Curso" | **24** opções |
| Ficha de um instrutor | abra o código **54** | **20** disciplinas marcadas |

Outros números que estão no banco e valem como referência, ainda que não apareçam somados em
nenhuma tela: **175** disciplinas, **797** habilitações ativas (instrutor↔disciplina) e **1.566**
aulas lançadas.

**As 28 turmas, por situação:** 7 em andamento · 11 planejadas · 7 concluídas · 3 canceladas.

---

## 5. As quatro coisas com maior chance de estarem erradas

### 5.1. Nome de sala — 9 turmas tiveram a grafia trocada

A planilha escreve **"Laboratório de informática"**, com "i" minúsculo, e o sistema usa
**"Laboratório de Informática"**, com "I" maiúsculo. A carga trocou as **9** ocorrências, e
registrou cada troca.

**Onde olhar:** não há tela de turma ainda (ver §6), então confira **esta lista** contra a sua
planilha. São as 9 que tiveram a grafia trocada:

> C-ApA-AuxNav-PR-SP T1 2026 · C-ApA-OcOp-PR-SP T1 2026 · C-Esp-ALH 2026 · C-Esp-OpAP T1 2026 ·
> C-Exp-Metoc-OF-SP 2026 · C-Exp-MetocOf 2026 · EST-QF-APHID 2026 · EST-QF-APOC 2026 ·
> EST-QF-EM2040PHS 2026

O que importa é se alguma sala **ficou de fora** desta lista, ou se alguma foi trocada **errado** —
isto é, se alguma dessas 9 na verdade não era o laboratório.

⚠️ **Duas turmas estão sem sala nenhuma** — **EST-QF-MAREFLU 2026** e **EST-QF-PGRS100 2026** —, e
é o que a planilha traz. Não foi perda na carga. Se elas deveriam ter sala, é achado.

### 5.2. Treze cursos entraram **sem modalidade**

A planilha deixou a coluna Modalidade em branco em **13 dos 24 cursos**: CAHO, C-Ap-HN,
C-Espc-HN, C-Exp-Ag-Mag, C-Exp-BATI, C-Exp-Obs-ME, C-Esp-ALH, C-Esp-ME, EST-QF-APOC,
EST-QF-APHID, EST-QF-EM2040PHS, EST-QF-PGRS100 e EST-QF-MAREFLU.

Eles entraram **em branco de propósito**, em vez de receberem um "presencial" chutado — foi a sua
decisão de 17/09. Curso novo vai passar a ser obrigado a informar.

**Onde olhar:** confira na sua planilha se esses 13 estão mesmo em branco, ou se algum deles tem
a modalidade escrita em outro lugar que a carga não leu. **Se algum tiver, é achado real.**

### 5.3. Cento e setenta e três aulas sem instrutor

São aulas lançadas na planilha sem ninguém no campo do instrutor. A carga as trouxe assim, sem
inventar nome.

**Onde olhar:** na ficha de um instrutor, a **carga horária** que aparece vem só das aulas que
têm instrutor. Se você achar que a carga de alguém está **abaixo** do que deveria, muito
provavelmente é por causa dessas 173. Vale me dizer de quem, para eu conferir.

### 5.4. Quinze instrutores sem especialidade

**15 dos 177** estão sem o campo de especialidade preenchido. Isso já era conhecido desde a fatia
de instrutores e o campo ficou opcional por isso.

**Onde olhar:** `/instrutores`, e abra a ficha de qualquer um deles — a ficha tem de **abrir e
salvar** normalmente. Se alguma ficha se recusar a salvar, é achado.

---

## 6. O que **não** conferir agora — ainda não tem tela

Este PR entregou **o banco e a carga**, não as telas de curso e turma. Então:

- ❌ **Não existe `/cursos`** — a tela do catálogo de cursos é do próximo PR.
- ❌ **Não existe `/turmas`** — a ficha de turma também.
- ❌ **Não dá para cadastrar nem editar curso, turma, sala ou regime pela tela** — tudo isso é do
  próximo PR.
- ❌ **Não dá para desativar um curso pela tela**, embora a regra já esteja no banco.

O menu pode mostrar "Cursos" como entrada **"em breve"** — é o comportamento combinado, não um
defeito.

**O que já dá para conferir é o que está na §4 e na §5**: o painel do Início, a lista de
instrutores, a ficha de instrutor e as telas de administração.

---

## 7. Se algo não bater

**Se o login recusar**, confira nesta ordem: (1) o comando foi `pnpm dev:local`, e a primeira linha
dele disse `banco: http://127.0.0.1:54321`; (2) o passo 2 respondeu `[PRONTO]` ou `[NADA A FAZER]`;
(3) depois do passo 2 **não** rodou `pnpm db:reset` de novo — ele apaga a conta, e aí é repetir o
passo 1 inteiro e o 2.

Anote **o que você esperava, o que apareceu e onde**, e me mande. Três coisas ajudam muito:

1. O **código** do curso, da turma ou do instrutor.
2. O número que a sua planilha mostra.
3. O número que a tela mostrou.

⚠️ **Não corrija nada pela tela para "acertar" o dado.** Se a carga trouxe errado, o conserto é
na carga — corrigir na tela esconde o defeito e ele volta na próxima carga.

---

## 8. Para desfazer tudo

Nada do que você fizer aqui sai desta máquina. Para voltar ao ponto de partida:

```
pnpm db:reset
```
