# Estado atual — antes de especificar

> ⚠️ **RETRATO DATADO: 03/10/2026.** Tudo abaixo foi **medido no repositório nesta data**, não lido de
> memória nem copiado de documento. Cada afirmação nomeia o artefato contra o qual foi medida
> (regra 9.2 do `CLAUDE.md`). **Nada foi medido no banco remoto** — a restrição desta rodada é *não
> tocar o remoto*, e por isso a estrutura foi lida de `lib/tipos/database.ts`, que é gerado do schema
> e versionado, e não de uma consulta.

## 1. A navegação

| O quê | Medido | Onde |
|---|---|---|
| Entradas do menu | **7**, nesta ordem: Início · Cursos · Cronograma · Atividades · Instrutores · Disciplinas · Administração | `lib/navegacao/menu.ts` |
| "Turmas" no menu | **NÃO existe** | idem |
| `disponivel: false` | Cronograma (Épico 7) e Atividades (Épico 9) — as duas marcadas *"em breve"* | idem |
| A lateral | **Server Component**, largura fixa `lg:w-56`, `lg:border-r`; entradas são **rótulo de texto, sem ícone nenhum** | `components/casca/navegacao-lateral.tsx` |
| Recolher | Só em tela estreita, por `PainelRetratil` — **o único marcador de cliente da casca**, com `useState` efêmero e botão `lg:hidden` | `components/casca/painel-retratil.tsx` |
| Acima de `lg` | O botão **não existe** e o painel está **sempre aberto**: o estado não tem efeito | idem |
| Entrada ativa | Derivada do caminho por prefixo de segmento, no servidor; comunicada por `aria-current="page"`, traço à esquerda e peso da fonte | `menu.ts` + `navegacao-lateral.tsx` |

⚠️ **TRÊS CONSEQUÊNCIAS QUE A FATIA HERDA, e nenhuma é opinião:**

1. **Não há ícone para mostrar.** Uma lateral recolhida que mostre *"só ícones"* precisa de um ícone
   **por entrada**, e `EntradaDeMenu` tem `rotulo`, `rota`, `disponivel` e `entregaEm` — mais nada.
   O ícone é campo novo, e escolher oito ícones é decisão de desenho que não existia até aqui.
2. **A lateral vai deixar de ser inteiramente de servidor.** Passar o mouse, fixar e recolher são
   comportamento de navegador. ⚠️ **E o cabeçalho de `painel-retratil.tsx` explica o custo com
   precisão: um marcador de cliente na casca manda TODAS as telas para o pacote do navegador.** O
   desenho que preserva isso é o mesmo que já está no repositório — **folha de cliente pequena, com
   a lista descendo do servidor por propriedade**.
3. **O estado "fixada" nasce no servidor ou pisca.** É a mesma forma do tema (`next-themes`, *"sem
   flash, medido antes da hidratação"*): um estado persistido que só o cliente conhece faz a tela
   abrir recolhida e **saltar** para expandida depois da hidratação.

## 2. As turmas, hoje

| O quê | Medido |
|---|---|
| `/turmas/[turma]` | **EXISTE** — é a ficha-formulário. `app/(app)/turmas/[turma]/` tem `page.tsx`, `consulta.ts`, `error.tsx`, `loading.tsx` e `QuadroDeAvisosDaTurma.tsx` |
| `/turmas` (lista) | **NÃO existe.** `app/(app)/turmas/` contém só `[turma]/` e `FormularioDeTurma.tsx` — confirmado pela varredura de `page.tsx` em `app/` |
| O segmento `[turma]` | É o **`codigo`**, percent-encoded, montado **sempre** por `enderecoDaTurma()` em `lib/navegacao/endereco-de-turma.ts` |
| Caminho de volta da ficha | **O curso** (`FR-031.6` da spec 009), escrito no cabeçalho de `page.tsx` |
| Onde a turma aparece hoje | Como **parâmetro**, em dois lugares: `/cursos/[curso]?aba=&turma=` e `/disciplinas?curso=&turma=` |
| No contrato de parâmetros | `/turmas/[turma]` está declarado **com `parametros: {}`**; `/turmas` **não está declarado** (`lib/navegacao/contrato.ts`) |

⚠️ **O CÓDIGO DA TURMA CONTÉM ESPAÇOS** (`C-ApA-AuxNav-PR-SP T1 2026`), e é por isso que o endereço
sai de um módulo só: *"um endereço montado à mão em cada tela funciona na primeira e falha na que
esquecer de codificar; e falha em silêncio"*. **O redirecionamento desta fatia é exatamente o caso
que esse módulo existe para proteger.**

## 3. O andamento — e o achado desta medição

| O quê | Medido | Onde |
|---|---|---|
| `vw_carga_horaria_turma` | Tem `chr_curricular`, `chd_executada`, `cht_executada`, `status_turma`, `ano_letivo` e a composição em 8 colunas `ta_*`. **Não tem `data_termino` nem `modalidade`** | `lib/tipos/database.ts` |
| A executada é de lançamento? | **SIM.** A view soma `registros_aula.tempos_consumidos` com `status = 'ativo'`, mais as avaliações — a `RN-CRONOS-01` já está honrada **pela view**, não por código de tela | `supabase/migrations/20260829235731…sql:608` |
| `vw_disciplinas_execucao` | Tem `carga_horaria_tempos`, `ta_executados`, `ta_saldo`, `data_real_*`, `previsao_*_efetiva` e `origem_periodo` — é a base da seção de disciplinas | `lib/tipos/database.ts` |
| `turmas` | `alunos`, `modalidade` (`presencial｜ead｜semipresencial`), `data_inicio`, `data_termino`, `status` (`planejada｜ativa｜concluida｜cancelada`), `ano_letivo`, `sala_alocada` | idem |
| `feriados.impacto` | `dia_inteiro｜parcial｜informativo` — o enum existe e a `RN-EVT-02` é verificável | idem |
| TA/dia | ✅ **EXISTE, por curso, no regime vigente** — `vw_cursos_regime_vigente` traz `regime_padrao_tempos` (tempos) e `limite_diario_ead_horas` (horas, `numeric(4,2)`); a view é `security_invoker` e resolve o regime de **hoje** por `app.fn_regime_vigente(curso, current_date, 'padrao')`. Regime EAD tem `regime_tempos = 0` **e** o limite em horas preenchido, por `CHECK` desde 08/09/2026. ⚠️ ***Registro anterior, vencido em 04/10/2026, e o erro foi MEU:*** *"Não existe por turma nem por modalidade; o que existe é `alocacao.limite_ta_dia_padrao = 8`"*. A varredura de 03/10 procurou em `config_parametros` e em `horarios_tempos_aula` e **não olhou o regime do curso** — foi Bernardo quem apontou a view. O parâmetro `8` continua sendo o que era: **teto de alerta** (`RNF-NORM-01`), não capacidade | `lib/tipos/database.ts`; `…235731…sql:450`; `20260908085000_regime_ead_sem_ta.sql` |
| A configuração de horário | Pendura em **`cursos.configuracao_horario_id`**, não em `turmas`; os tempos vivem em `horarios_tempos_aula`, com `tipo_tempo` e `periodo` | `…233423…sql:212,280` |
| `"gordura"` no repositório | **0 ocorrências** em `app/`, `lib/`, `components/`, `supabase/` e `tests/` | varredura desta data |

### ⚠️ O ACHADO: `/inicio` JÁ CALCULA "EM ATRASO", E CALCULA O CONTRÁRIO DO QUE O `RF-INI-01` DEFINE

`app/(app)/inicio/panorama.ts` é a implementação que existe hoje, e ela faz:

```ts
const restante = prevista - executada;
// ...
emAtraso: c.status_turma === "ativa" && restante < 0,
```

**`restante < 0` significa `executada > prevista`** — ou seja, a turma executou **MAIS** do que a
carga curricular. O indicador dispara no **excesso**, não no atraso.

⚠️ **E ele nunca dispara para quem está de fato atrasado:** uma turma com 100 TA restantes e três
dias úteis até o término tem `restante = 100 > 0`, e sai da tela como se estivesse em ordem.
**Não há capacidade no cálculo**: `data_termino`, `feriados` e TA/dia **não são lidos em lugar
nenhum** — o arquivo não os importa, e `vw_carga_horaria_turma` não os expõe.

⚠️ **O MODO DE FALHA EXPLICA POR QUE ISSO PASSOU POR REVISÃO:** o comentário ao lado do código diz a
coisa certa — *"TURMA CONCLUÍDA COM EXCESSO NÃO É ATRASO"* — e o código logo abaixo trata exatamente
o excesso como atraso para as turmas ativas. **Documentação correta ao lado de código invertido
lê-se como código conferido.** O `CLAUDE.md` registra que `/inicio` *"sinaliza saldo negativo"*, e a
palavra **saldo** é a do requisito; o que está implementado é `prevista − executada`, que o próprio
arquivo chama de `restante`.

**Consequência para esta fatia:** o módulo novo não nasce num vazio. Ou ele passa a ser **o único**
cálculo de *"em atraso"* do sistema — e `/inicio` deixa de contradizê-lo —, ou o épico entrega duas
telas que dão respostas opostas para a mesma palavra. É a **Q2** da lista de dúvidas.

## 4. As guardas que esta fatia vai encostar — e uma que ela NÃO encosta

| Guarda | Vale aqui? |
|---|---|
| `SC-004` · um só construtor de seletor de turma (`tests/unidade/seletor-turma-unico.test.ts`) | ⚠️ **NÃO reprova a lista nova, e isso foi MEDIDO, não suposto.** O padrão é `turmas.map(… <option｜SelectItem)` numa janela de 300 caracteres — ele exige **turmas virando opção**. Os filtros de `/turmas` são por **curso, ano e situação**, que mapeiam outras listas. ⚠️ **A primeira versão daquela varredura usava `/turma/i` e acusava o formulário de curso**; a janela estreita é o conserto, e é ela que impede esta fatia de herdar um falso positivo — a regra 9.1.1 na direção que **faz crescer lista de impacto sem motivo** |
| *Toda tela tem caminho clicável* (`tests/unidade/toda-tela-tem-caminho.test.ts`) | **SIM.** `/turmas` precisa de `href` em outro arquivo — e o menu é esse arquivo. ⚠️ A guarda já foi **cega** uma vez, por ler `contrato.ts` como se fosse lista de links |
| O menu e o `disponivel` | **SIM, nos dois sentidos**: entrada disponível não pode faltar **e** entrada anunciada *"em breve"* não pode já existir. Foi ela que reprovou no CI em 23/09/2026, quando `/cursos` nasceu e o menu não virou |
| Botão *Limpar filtros* | **SIM.** Toda página com filtro nasce com ele, por **um** componente (`components/ciaara/botao-limpar-filtros.tsx`) — segundo componente é rejeitado |
| Contrato de parâmetros | **SIM.** `/turmas` não está declarado, e **parâmetro fora do contrato não compila** |
| Regra de cor | **SIM.** `components/ciaara/` não define cor literal — só token do `@theme` |

## 5. O que já existe em `lib/dominio/` e serve

`seletor-de-turma.ts` (`rotuloDaTurma`, que **nunca sai vazio**), `pre-selecao-de-turma.ts`,
`avisos-da-turma.ts`, `carga-horaria.ts`, `limite-de-turmas.ts`, `sinalizacao-de-disciplina.ts`,
`rateio-de-carga.ts`, `soma-das-unidades.ts`, `indicadores-da-grade.ts`.

⚠️ **`panorama.ts` NÃO está em `lib/dominio/`, e o cabeçalho dele declara por quê:** *"aqui não há
regra de domínio, e sim a aritmética de apresentação do painel"*. **Essa justificativa cai** no
momento em que a mesma conta passa a valer em duas telas e a definir um indicador normativo
(`RF-INI-01`) — que é exatamente o que esta fatia faz.

## 6. Dependências novas — zero previstas, e medido antes de escrever

| Precisa | Já existe? |
|---|---|
| Ícones | ✅ **`lucide-react` 1.43.0** no `package.json`, já usado em `painel-retratil.tsx` |
| Dica ao apontar | ✅ **`components/ui/tooltip.tsx`** já versionado |
| Gaveta em tela estreita | 🟨 **Não há `sheet.tsx`**, mas há `dialog.tsx` sobre `radix-ui` 1.6.7 — e a gaveta de hoje é o `PainelRetratil`, que **já funciona**. Nenhum pacote novo é necessário |
| `sidebar` do shadcn | 🟨 **Não existe no repositório.** Ele não traz pacote novo, mas traz **centenas de linhas** com convenção própria de cookie, atalho de teclado e contexto. Ver a **Q3** da lista de dúvidas |
