# Plano de implementação: Épico 4, fatia (c) — shell de navegação e estado na URL

**Branch**: `feat/EPICO-4c-shell-e-estado-na-url` | **Data**: 11/09/2026 | **Spec**: [spec.md](./spec.md)

**Entrada**: [spec.md](./spec.md) · 53 requisitos, 23 critérios, 12 esclarecimentos integrados ·
[checklist de entrada](../007-componentes-ciaara/checklists/navegacao-e-estado.md), 40 itens

## Summary

Entregar o **shell de navegação** e fazer a **URL virar o ponto de verdade** do estado de navegação:
contrato de parâmetros fechado, os quatro comportamentos do `RF-NAV-04`, a tela inicial como casca
navegável, e a tabela densa passando a aceitar ordenação e filtro por fora.

**Uma medição decide a forma do plano, e ela não é sobre navegação.** Ao ler o código do Épico 3
para entender o retorno após o login, apareceu um **redirecionamento aberto já mesclado na `main`**:
a guarda do destino é `startsWith("/")`, e um endereço relativo ao protocolo passa por ela. Isso
promove o `FR-042` de precaução a **correção com alvo**, e torna a seção de segurança a primeira
coisa a entrar, não a última.

Fora isso, o esforço está em **quatro lugares onde estado de navegação costuma nascer torto**:

1. **O contrato**, que hoje existe como tabela que ninguém é obrigado a seguir.
2. **A fronteira cliente/servidor do shell**, que é o lugar mais caro do sistema para errar.
3. **O aviso ao servidor**, cujo erro é silencioso: URL certa, número velho.
4. **A tabela densa**, que precisa aceitar estado por fora **sem quebrar quem já a usa**.

## Technical Context

**Linguagem/Versão**: TypeScript `strict` com `exactOptionalPropertyTypes` · React 19.2.8 ·
Next.js 16.3.3, App Router

**Dependências principais**: **`nuqs` 2.10.1** (a instalar — é a decidida no BRIEF; pares declarados
`next >=14.2.0` e `react >=18.2.0 || ^19.0.0-0`, medidos em 11/09/2026) · `zod` 4.5.4, **já
instalado**, para o esquema dos parâmetros · os treze componentes da fatia (b), já mesclados

⚠️ **Nenhum gerenciador de estado efêmero entra** (`FR-011`): não há consumidor legítimo medido antes
dos Épicos 5 e 6.

**Armazenamento**: nenhum novo. Esta fatia **não cria migration, policy nem coluna**. A tela inicial
lê o que o Épico 2 migrou.

**Testes**: Vitest para o esquema de parâmetros e para os portões · Playwright para os quatro
comportamentos, o teclado do shell, a carga hostil e o destino do login · ESLint para as fronteiras

**Plataforma alvo**: navegador moderno, dois temas, mais o papel branco da impressão futura

**Tipo de projeto**: aplicação web com renderização no servidor

**Metas de desempenho**: **retorno visual imediato a cada troca de recorte, sem alvo numérico**
(`FR-045`, decisão de 11/09/2026). A falha que se combate é a tela muda, não a latência.

**Restrições**: a URL é o ponto de verdade · `"use client"` só onde há interação · nenhuma cor fora
do ponto único · nenhum componente de shell implementa regra `RN-` · nenhum destino externo aceito
no retorno do login

**Escala/Escopo**: 1 contrato de parâmetros · 3 componentes de shell · 1 tela nova · 1 componente
refatorado · 2 arquivos de imagem versionados · 1 guia de uso · 12 itens de checklist a fechar

## Constitution Check

*PORTÃO: passa antes da Fase 0 e é reavaliado depois da Fase 1.*

| Princípio | Situação | Como esta fatia se comporta |
|---|---|---|
| **I · Fidelidade à Fase 1** | ✅ | Cada requisito aponta para `RF-NAV`, `RF-INI`, `RF-MOD` ou `RF-AUTH`. O `FR-001.1` **emenda** o documento 25 para alinhá-lo ao `RF-INI-02`, que é [PRESERVADO] — corrige a transcrição, não a regra |
| **II · Preservação de regras de negócio** | ✅ **não se aplica** | Nenhuma regra `RN-` é tocada. O shell exibe; quem decide continua sendo o domínio e o banco |
| **III · Restrição de plataforma** | ✅ | A biblioteca de estado na URL é a decidida no BRIEF. Ela **não** substitui os ganchos nativos: é construída sobre eles ([research §R-2](./research.md)) |
| **IV · Integridade do histórico** | ✅ **não se aplica** | Nada é apagado, nada é migrado |
| **V · Degradação segura** | ⚠️ **atenção, e é metade da fatia** | Cinco caminhos: parâmetro fora do domínio usa o padrão; parâmetro fora do contrato é ignorado; identificador fora de escopo distingue *"não há"* de *"você não vê"*; conteúdo de épico futuro diz **"ainda não existe"**; e destino hostil é **recusado**, que é o único dos cinco que não degrada — recusa |
| **VI · Mudança cirúrgica validada por invariante** | ✅ | Seis invariantes contáveis: zero parâmetro fora do contrato · zero destino externo aceito · zero contêiner de contexto como fonte de verdade · zero tela alcançável só por digitação · zero componente de shell fora do inventário · zero componente da fatia (b) quebrado |
| **VII · Configuração sobre constante** | ✅ | O contrato de parâmetros é **dado tipado**, não literal espalhado por tela. A lista de entradas do menu é dado, e é validada contra a v2.0 |
| **VIII · Rastreabilidade** | ✅ | Todo componente de shell entra no inventário do documento 23 §3.1 com arquivo, base e fronteira — o que os quatro não tinham |
| **IX · Contenção de escopo** | ✅ **e custou três recusas** | Breadcrumb **fora** (novidade sem `RF-`); paginação **fora** (sem problema medido); gerenciador de estado efêmero **fora** (sem consumidor). As três com motivo escrito |
| **X · Paridade antes de novidade** | ⚠️ **atenção** | O menu precisa ser o da v2.0, e **a lista não existe escrita**. O `FR-017.1` a produz como rascunho e a submete — sem ela, o `FR-017` passa por vacuidade |
| **XI · O banco é a fronteira** | ✅ **e é o que faz o link ser seguro** | O `RF-NAV-04` (c) promete que o link não vaza informação porque a RLS nega. A validação de parâmetro **reduz superfície; não substitui a fronteira** |

**Veredito: passa.** As duas atenções — os cinco caminhos de degradação e a lista do menu — estão
desenhadas na Fase 1, não deixadas para a implementação decidir.

⚠️ **E um achado de segurança entra no escopo por consequência, não por decisão:** o
redirecionamento aberto de [research §R-5](./research.md). Ele nasceu no Épico 3 e o `FR-042` já o
cobre; a fatia o corrige porque é ela que mexe no caminho.

## Project Structure

### Documentação (esta fatia)

```text
specs/008-shell-e-estado-na-url/
├── plan.md              # este arquivo
├── research.md          # Fase 0 — dez decisões, e um achado
├── data-model.md        # Fase 1 — os tipos do contrato (não há entidade de dado)
├── quickstart.md        # Fase 1 — como validar
├── contracts/
│   ├── parametros.md    # o contrato por rota: tipo, padrão, histórico, aviso ao servidor
│   ├── casca.md         # os três componentes + o rascunho da lista de entradas
│   └── seguranca-da-url.md  # o que se valida, onde, e a carga hostil do teste
├── checklists/
│   └── requirements.md  # 16/16, da fase de especificação
└── tasks.md             # Fase 2 — NÃO criado por /speckit-plan
```

### Código (raiz do repositório)

```text
lib/navegacao/                  # NOVO — o contrato, num lugar só
├── contrato.ts                 # parâmetros por rota: tipo, padrão, histórico, aviso
├── esquema.ts                  # validação por esquema, com degradação para o padrão
├── usar-parametro.ts           # leitura e escrita pelo contrato, com histórico e aviso
├── menu.ts                     # as entradas do menu como dado, validadas contra a v2.0
└── destino-seguro.ts           # o retorno do login: origem própria, ou o padrão

components/casca/               # NOVO — três componentes, todos no inventário §3.1
├── casca-do-app.tsx            # servidor: usuário, permissões, estrutura
├── navegacao-lateral.tsx       # cliente APENAS no abrir/fechar de tela estreita
└── cabecalho-do-app.tsx        # servidor: marca, entrada ativa, usuário, tema

app/(app)/
├── layout.tsx                  # passa a montar a casca; hoje traz o cabeçalho provisório
└── inicio/page.tsx             # NOVO — /inicio, casca navegável

components/ciaara/tabela-densa.tsx   # REFATORADO: ordenação e filtro por propriedade opcional

public/marca/                   # NOVO — brasão, sem acento e sem espaço
├── brasao-ciaara.png           # 794 × 1123 — tela
├── brasao-ciaara-impressao.png # 3250 × 4913 — Épicos 10 e 11
└── PROCEDENCIA.md              # origem e data, como a fatia (a) fez com a tipografia

docs/guias/estado-na-url.md     # NOVO — o guia que o Épico 5 segue (FR-044)
```

**Decisão de estrutura**: dois diretórios novos, e os dois têm motivo. `lib/navegacao/` existe para
que o contrato seja **um lugar**, e não uma convenção repetida por tela. `components/casca/` existe
porque o documento 24 já separa casca de vocabulário, e misturar as duas faria o inventário §3.1
deixar de descrever o que descreve.

⚠️ **O diretório chama-se `casca/`, e não `shell/`, por correção de 11/09/2026.** A primeira versão
misturava o estrangeirismo no nome do diretório com o português no nome dos arquivos —
`components/casca/casca-do-app.tsx`. **"Shell" continua valendo como palavra de prosa**, e é assim
que os documentos 06 e 24 a usam; o que não vale é meio nome em cada língua, num projeto cuja regra
é português em tudo, inclusive nome de arquivo.

⚠️ **`lib/navegacao/` NÃO é `lib/dominio/`.** Ele conhece o arcabouço; a regra de pureza não se
aplica a ele, e por isso ele não mora lá.

## O que a fatia constrói, e o que é difícil em cada parte

| Parte | Difícil nela |
|---|---|
| Contrato de parâmetros | fazer o parâmetro fora do contrato **não compilar**, sem obrigar cada tela a repetir a declaração |
| Validação | degradar para o padrão **sem** engolir o erro de quem opera |
| Destino do login | recusar por **origem**, não por padrão de texto — ver research §R-5 |
| Shell | a fronteira cliente/servidor: um marcador na casca manda todas as telas para o navegador |
| Aviso ao servidor | o erro é silencioso — URL certa, consulta velha |
| Tabela densa | aceitar estado por fora **sem quebrar** as montagens que já existem |
| Tela inicial | dizer *"ainda não existe"* sem parecer defeito |
| Lista do menu | ela não existe escrita, e sem ela o `FR-017` é vácuo |

## Ordem de implementação

De dentro para fora, como o documento 24 exige — com uma inversão deliberada no começo.

1. **`lib/navegacao/destino-seguro.ts` e a correção do login.** ⚠️ **Vem primeiro por ser
   segurança**, e porque é defeito em código já mesclado. Não depende de nada desta fatia.
2. **`lib/navegacao/contrato.ts` e `esquema.ts`** — o contrato e a validação, com teste de unidade.
   Sem navegador, e é o que todo o resto consome.
3. **A emenda ao documento 25 §1.3** — `modalidade` entra. Feita junto do contrato, para os dois
   não nascerem divergentes.
4. **A tabela densa** — propriedades opcionais, com a suíte da fatia (b) como prova de não
   regressão. Antes do shell, porque é independente dele e é a dívida mais antiga.
5. **O shell** — casca, cabeçalho e navegação, com a lista de entradas submetida a Bernardo.
6. **A tela inicial** — depois do shell, porque é ela que prova que a navegação leva a algum lugar.
7. **Os quatro comportamentos**, de ponta a ponta, sobre as rotas que já existem.
8. **O guia de uso** — por último, porque ele descreve o que ficou de pé, não o que se pretendia.

## Complexity Tracking

| Violação | Por que é necessária | Alternativa simples rejeitada porque |
|---|---|---|
| `lib/navegacao/`, um diretório que o documento 24 não prevê | O contrato precisa de **um** endereço; espalhá-lo por tela é a convenção que o `FR-001` existe para acabar | Pô-lo em `lib/` solto misturaria contrato de navegação com utilitário; pô-lo em `lib/dominio/` violaria a pureza, porque ele conhece o arcabouço |
| `components/casca/`, idem | O inventário §3.1 descreve **vocabulário de domínio**; a casca não é vocabulário. Misturar os dois faria o inventário deixar de descrever o que descreve | Pô-lo em `components/ciaara/` é o que o documento 23 implicitamente faria — e foi justamente a ausência dos quatro no inventário que o `CHK015` pegou |

## Reavaliação do portão, depois da Fase 1

O desenho não abriu violação nova, e fechou as duas atenções:

| Atenção de antes | Onde ficou resolvida |
|---|---|
| **V · os cinco caminhos de degradação** | [contracts/seguranca-da-url.md](./contracts/seguranca-da-url.md) separa os quatro que degradam do único que recusa, e diz por que o quinto é diferente |
| **X · a lista do menu** | [contracts/casca.md](./contracts/casca.md) traz o **rascunho**, derivado da árvore com a subtração do `RF-CURSO-02` aplicada, pronto para Bernardo conferir |

⚠️ **Duas violações novas apareceram e foram absorvidas**: os dois diretórios do *Complexity
Tracking*. As duas são sobre **endereço**, não sobre mecanismo, e as duas nascem do mesmo achado —
um componente sem endereço é um componente que cada tela reinventa.

## Achados do planejamento

**P-1 · ⚠️ Há um redirecionamento aberto na `main`.** A guarda do destino após o login é
`startsWith("/")`, e um endereço relativo ao protocolo passa por ela. **Medido lendo o código
mesclado em 11/09/2026.** Ele nasceu no Épico 3, o `FR-042` já o cobre, e a fatia o corrige porque é
ela que mexe nesse caminho. ⚠️ **E o teste precisa medir o comportamento, não a guarda**: uma
asserção sobre a condição passaria com o código atual.

**P-2 · A metade de ida do `FR-027` já existe, e está certa.** O proxy do Épico 3 guarda caminho
**e** query no destino. É a volta que perde. Isso reduz o `FR-027` a completar o que existe, em vez
de construir do zero — e é o tipo de coisa que só aparece lendo o código antes de planejar.

**P-3 · O documento 25 §1.3 e o `RF-INI-02` divergem, e a tabela é que está errada.** A tabela lista
só `classificacao`; o requisito [PRESERVADO] escreve os dois parâmetros na própria nota de
mecanismo. Vira emenda (`FR-001.1`), não decisão nova.

**P-4 · O inventário do documento 23 §3.1 não descreve casca.** Ele descreve vocabulário de domínio,
e os quatro componentes de shell nunca couberam nele. O `CHK015` leu isso como ausência; é mais
provável que seja **escopo do inventário**. A fatia os acrescenta assim mesmo — um componente sem
endereço é um componente que cada tela reinventa —, e fica registrado que o inventário passa a
descrever duas coisas.

**P-5 · CONTINUA ABERTO: não há requisito de observabilidade da navegação.** Parâmetro recusado,
destino hostil barrado e consulta degradada são eventos que ninguém vê. A terceira rodada de
esclarecimento classificou isso como baixo impacto para esta fatia, e não inventei requisito no
plano. Fica registrado.
