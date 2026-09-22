# Contrato — rotas, parâmetros de URL e endereço de turma

**Fase 1** · 17/09/2026 · estende [`lib/navegacao/contrato.ts`](../../../lib/navegacao/contrato.ts) e
[`lib/navegacao/menu.ts`](../../../lib/navegacao/menu.ts) · guia obrigatório:
[`docs/guias/estado-na-url.md`](../../../docs/guias/estado-na-url.md)

> ⚠️ **Este contrato é EXIGÍVEL, não descritivo.** Parâmetro fora do `contrato.ts` **não compila** —
> provado por defeito deliberado no Épico 4 (c). Rota acrescentada aqui e esquecida lá faz a tela não
> compilar, que é o comportamento desejado.

Os marcadores **[A-n]** apontam a decisão de Bernardo de **17/09/2026** registrada no
[plano](../plan.md) e na spec — todas as deste contrato foram respondidas.

---

## 1. As rotas

| Rota | Origem | Tela | Parâmetros |
|---|---|---|---|
| `/cursos` | `RF-CURSOS-01`, `RF-CURSOS-02`, `FR-001` a `FR-005` | catálogo por classificação, indicadores e gráficos | §2 |
| `/cursos/novo` | `RF-CURSOS-01`, `FR-013`, `FR-019.1` | cadastro de curso com a vigência `padrao` **[A-3]** | nenhum |
| `/cursos/[curso]` | `RF-CURSO-01`, `RF-CURSO-04`, `FR-006` a `FR-011` | página do curso: cabeçalho, regime vigente, quadro de avisos, abas "Grade" e "Sobre o Curso" | §3 |
| `/cursos/[curso]/editar` | `FR-013.1`, `FR-016`, `FR-019.1`, `FR-021.1`, `FR-011` | edição do curso e do regime: histórico de vigências por tipo, **ativas e canceladas** **[A-5]**, "Registrar nova vigência", "Corrigir esta vigência" **[A-3]** | nenhum |
| `/cursos/[curso]/turmas/nova` | `FR-031`, `FR-031.6` | criação de turma, formulário no modo `novo` | nenhum |
| `/turmas/[turma]` | `FR-031`, `FR-031.5`, `FR-031.6`, `FR-021.8` | ficha da turma, quadro de avisos, e edição no modo `edicao` para quem pode editar — **sem** `/editar`; para quem edita, o carregamento lê também a proteção das vigências por atividade global | nenhum |
| `/admin/salas` | `FR-029.2` | lista de salas: acrescentar, desativar, reativar | nenhum |

**Ausências deliberadas** (`FR-031.7`): **nenhuma** listagem global de turmas; `/turmas/[turma]/dsa`
**reservada** ao Épico 6 e **não** construída; nenhuma entrada nova no menu (`FR-031`, MENU-1).

⚠️ **Por que o curso tem `/editar` e a turma não [A-3] — diferença deliberada, registrada no `FR-013.1`.** O `FR-031.6` copia o desenho do instrutor
para a **turma**: ficha e edição na mesma rota. O **curso** não tem ficha livre para receber o
formulário — a página dele tem **exatamente duas abas** (`FR-006.2`, *"MUST NOT: terceira aba"*) e a
"Sobre o Curso" é **só para consulta** (`FR-007`, *"nada nesta aba é editável"*). A edição precisa de
rota própria, e o `FR-019.1` põe o regime **no cadastro de curso** — por isso ele mora lá.

---

## 2. `/cursos` — parâmetros

| Nome | Tipo | Opções | Padrão | Histórico | Avisa servidor | Origem |
|---|---|---|---|---|---|---|
| `classificacao` | escolha | as **5** do Glossário, na ordem do `FR-003` | `""` | substitui | **sim** | `FR-003`, `FR-004` **[A-7]** |
| `modalidade` | escolha | `modalidade_ensino`, lida de `Constants` | `""` | substitui | **sim** | `FR-004` **[A-7]** |
| `situacao` | escolha | `status_registro`, lida de `Constants` | `ativo` | substitui | **sim** | `FR-017.2` — mesmo descritor de `/instrutores` |

⚠️ **As 5 classificações são lista própria, não a constante do Início (D-19).** `CLASSIFICACOES` em
`contrato.ts` é o tipo inteiro — **7** valores, com `geral` e `ead_semipresencial`, na ordem do tipo — e
o `FiltroDoPanorama` do Início a usa. Esta fatia acrescenta `CLASSIFICACOES_DE_CURSO`, derivada da
ordem do Glossário em `lib/dominio/`, com teste que confere que ela é **subconjunto** do tipo. O
Início **não muda**: é entrega do Épico 4 (c), e a D-19 fica registrada para decisão à parte.

---

## 3. `/cursos/[curso]` — parâmetros

| Nome | Tipo | Opções | Padrão | Histórico | Avisa servidor | Origem |
|---|---|---|---|---|---|---|
| `aba` | escolha | `grade`, `sobre` | `grade` | **empilha** | **sim** | `FR-006.2`, D-10 |
| `turma` | texto — o `codigo` da turma | o dado | `""` → pré-seleção no servidor | **empilha** | **sim** | `FR-006`, `FR-006.1`, `FR-036`, `FR-037` |

- **`turma` é texto** pelo mesmo motivo de `curso` em `/instrutores`: o domínio é o dado cadastrado.
  Uma lista fixa degradaria para "nenhuma" o link de uma turma criada depois.
- **`aba` empilha** como `turma`: trocar de aba é navegação, e o `SC-002` (b) pede que "voltar" desfaça
  um passo por vez. O `FR-036` só nomeia a turma; a mesma razão vale para a aba.
- **Valor ausente**: a pré-seleção do `FR-006.1` roda **no servidor**, sobre a janela, com a data de
  hoje passada como argumento à função pura — e **não** escreve na URL. Um `?turma=` explícito nunca é
  sobrescrito (`SC-003`).
- **Valor que não é turma deste curso** (link velho, digitado, turma de outro curso): degrada para
  a pré-seleção, com aviso — o padrão de degradação de link velho do Épico 4 (c).

---

## 4. O endereço de turma — uma função só

**Origem**: `FR-031.1` a `FR-031.3`, `FR-037`; Q-24.1.

Módulo **`lib/navegacao/endereco-de-turma.ts`** — TypeScript puro, sem `next` nem `react`, como o
resto de `lib/navegacao/` que não é gancho:

| Função | Devolve | Exemplo |
|---|---|---|
| `enderecoDaTurma(codigo)` | o caminho da ficha | `/turmas/C-ApA-PCN-PR-EAD%20T2%202026` |
| `enderecoDaTurmaNoCurso(sigla, codigo, aba?)` | a página do curso com a turma selecionada | `/cursos/C-ApA-PCN-PR-EAD?aba=grade&turma=C-ApA-PCN-PR-EAD%20T2%202026` |
| `enderecoDaNovaTurma(sigla)` | a criação | `/cursos/C-Ap-FR/turmas/nova` |
| `codigoDaTurmaNoSegmento(segmento)` | o código gravado, a partir do que a rota recebeu | `C-ApA-PCN-PR-EAD T2 2026` |

**Regras:**
1. **Nenhum** outro ponto do código monta endereço de turma. Uma varredura em teste de unidade lê o
   código **sem comentário** (achado 5 da fatia (b) do Épico 4) e reprova `/turmas/` ou `?turma=`
   montado fora deste módulo.
2. O **Início** passa a usar `enderecoDaTurmaNoCurso` — o defeito do `FR-031.2`, corrigido **nesta**
   fatia, com teste que prova o link codificado para um código com espaço.
3. **Ida e volta** (`FR-031.3`): o teste percorre os **28** códigos de turma e as **24** siglas da base
   — lidos de um retrato versionado da base de 16/09/2026, porque teste de unidade não abre banco —, e
   cada um volta **idêntico**.

⚠️ **Dois pontos que só a implementação mede, declarados para não virarem surpresa:**
- **Como o Next entrega `params.turma`** — já decodificado ou não. `codigoDaTurmaNoSegmento` decodifica
  **uma vez só**, e o teste de ponta a ponta abre a ficha de `C-ApA-PCN-PR-EAD T2 2026` pela URL
  codificada. Decodificar duas vezes quebraria só o código que contivesse `%` — nenhum hoje.
- **Como o `useParametro` serializa o espaço** quando o seletor troca a turma. Se sair `+` em vez de
  `%20`, os dois decodificam para o mesmo código, mas o `FR-031.1` pede **uma representação só**: o
  teste de ponta a ponta compara a URL depois da troca com a que `enderecoDaTurmaNoCurso` produz.

---

## 5. Turma por endereço direto — o que a ficha diz

**Origem**: `FR-031.4`, com a ponderação registrada; decisão em [R-9](../research.md).

| Perfil | Segmento que não dá turma visível | Motivo |
|---|---|---|
| `admin`, `chefe_departamento_ensino`, `encarregado_administracao_academica`, `ajudante_administracao_academica`, `encarregado_orientacao_pedagogica`, `ajudante_orientacao_pedagogica`, `visualizacao` | **"Turma não encontrada"** — é certeza: o perfil veria a turma se ela existisse | alcance total |
| `operador` com escopo preenchido e diferente de `geral`, `encarregado_curso` | **"Turma não encontrada ou fora do seu alcance"** — uma mensagem só | distinguir **confirmaria a existência** a quem não tem direito a ela |
| `operador` com escopo `geral` ou vazio | "Turma não encontrada" | `app.cursos_do_usuario()` lhe dá todos os cursos — conferido na função em 17/09/2026 |
| sem `turmas.ler` | `EstadoVazio` com `motivo="sem-permissao"` | a permissão, não a turma, decide |

- A diferença entre as mensagens depende **só do perfil e do escopo da sessão**, nunca da turma — por
  isso não revela nada. **Nenhuma** consulta de existência fora da RLS; **nenhum** SQL novo.
- O mesmo vale para `/cursos/[curso]` com sigla que não dá curso visível: "Curso não encontrado" ou
  "Curso não encontrado ou fora do seu alcance".
- **Nas listas**, os três estados do `FR-047` continuam distintos: *"não há"*, *"você não vê"*,
  *"ainda não existe no sistema"*.

---

## 6. Menu e navegação da administração

| Mudança | Origem |
|---|---|
| `entregaEm`: Cursos → `"Épico 5 (a)"`; Disciplinas → `"Épico 5 (b)"`; Cronograma → `"Épico 7"`; Atividades → `"Épico 9"`. Ordem e rótulos **não** mudam | `FR-038` |
| Cursos → `disponivel: true` **no mesmo commit** da tela `/cursos` | `FR-039` |
| Emenda datada da tabela da MENU-1 em `specs/008-shell-e-estado-na-url/contracts/casca.md` | `FR-040` |
| `app/(app)/admin/layout.tsx`: `ABAS` ganha `{ rotulo: "Salas", rota: "/admin/salas" }` | `FR-029.2` |
| `FORA_DO_MENU` (Avaliações e Relatório, `RF-CURSO-02`) **não muda** — e a página do curso **não** mostra link, botão nem *"em breve"* para elas nesta fatia | `FR-008` **[A-4]** |

⚠️ **Achado, registrado e não corrigido:** a entrada "Administração" aponta para `/admin/usuarios`, e a
entrada ativa é por **prefixo** dessa rota. Medido no código em 16/09/2026: em `/admin/permissoes` o
menu lateral **não** acende "Administração", e em `/admin/salas` também não acenderá. É comportamento
da `main` desde o Épico 4 (c); corrigir é mexer na regra de entrada ativa, fora desta fatia.

---

## 7. `/admin/salas` — quem vê o quê

| Perfil | Lê a lista | Acrescenta, desativa, reativa |
|---|---|---|
| `admin`, `encarregado_administracao_academica` | sim | **sim** — `parametros.criar`/`editar` |
| os outros 7, **inclusive o Ajudante da Divisão** | sim — `config_listas_ler` é `app.usuario_atual() is not null` | **não**: botões ocultos, e o banco recusa (`42501`) |

**Ações da tela: exatamente 4** — listar, acrescentar, desativar, reativar (`SC-014.3`). **Nenhum**
campo de nome editável depois de gravado (`FR-029.5`); **nenhum** caminho de apagar (regra 4).
