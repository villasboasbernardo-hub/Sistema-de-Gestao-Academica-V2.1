# Checklist de qualidade dos requisitos: acessibilidade e entrega para as fatias (b) e (c)

**Propósito**: testar se os **requisitos estão bem escritos** para o que vem a seguir. Não testa a
fatia (a), que está implementada e verde.
**Criado**: 10/09/2026
**Feature**: [spec.md](../spec.md) · [documento 23 §8](../../../docs/fase-2/23-Design-System-Tailwind-shadcn.md) · [documento 03, `RNF-USA-01..06`](../../../docs/fase-1/03-Requisitos-Nao-Funcionais.md)
**Alcance**: spec 005 **e** os documentos normativos. É a escolha que fez a lista de segurança valer
a pena no Épico 3: os achados moravam no documento normativo, não na spec.
**Momento**: **portão de entrada das fatias (b) e (c)** — enquanto corrigir requisito ainda é barato.

> **Como ler.** Todos os itens são perguntas sobre **o que está escrito**. "Não" não significa que a
> fatia (a) esteja errada; significa que a fatia seguinte vai decidir sozinha, na pressa, algo que
> deveria estar decidido.

## Acessibilidade — completude

- [x] CHK001 O limite de contraste distingue **texto normal de texto grande**? [Gap, Doc 23 §8.1 · Spec §FR-011] ⚠️ O documento 23 escreve *"texto grande (≥ 24px, ou ≥ 18,7px em negrito) ≥ 3:1"*. O `FR-011` cobra **4,5:1 de todo texto**, sem exceção de tamanho. A auditoria é **mais rígida que a norma** nesse ponto, e os tokens `--text-2xl` e `--text-kpi` caem exatamente aí. ✅ **FECHADO em 10/09/2026.** O `FR-011` passa a ter os cinco casos, com o limite de texto grande.
- [x] CHK002 As **oito séries de gráfico** têm requisito de contraste? [Gap, Doc 23 §8.1] Ele exige 3:1 de **elemento gráfico**, e as séries são isso. Elas existem no ponto único, aparecem na vitrine e **não são auditadas por par nenhum**. ✅ **FECHADO em 10/09/2026.** As oito séries viraram os pares **D-1 a D-8**, medidas contra `--fundo`. Todas passam; a `serie-3` no claro mede **3,03**, por três centésimos.
- [ ] CHK003 Existe requisito para a **codificação não cromática** que o documento 23 nomeia — hachura de sentidos opostos para feriado e licença? [Gap, Doc 23 §8.1] O `FR-014` proíbe cor como única codificação, mas não define **qual** é a segunda codificação em célula de grade.
- [x] CHK004 Está escrito o que acontece quando um primitivo copiado traz o **próprio anel de foco**? [Gap, Doc 23 §8.2] O documento manda rejeitar `outline: none` sem substituto *"inclusive ao reescrever o anel de foco dos primitivos copiados"*. Quatro já foram copiados e trazem anel próprio; nenhum requisito diz qual prevalece. ✅ **FECHADO em 10/09/2026.** O documento 23 §8.2 passa a **aceitar o anel nativo** dos primitivos, sob duas condições: foco visível ao teclado e indicador a 3:1. Remover sem substituir continua rejeitado.
- [x] CHK005 Há requisito de **ponto de quebra responsivo**? [Gap, Doc 03 `RNF-USA-02`] Ele fala em uso típico em desktop para tabelas densas, sem número. A vitrine já usa um ponto de quebra escolhido sem requisito por trás. ✅ **FECHADO em 10/09/2026 pelo `FR-028` da spec 007**, que traz o número: **1024px**, com a tabela rolando dentro do próprio contêiner e a página **sem** rolagem horizontal. ⚠️ A primeira redação do `FR-028` reproduzia o defeito que dizia fechar — escrevia *“deve existir requisito de ponto de quebra”* —, e foi corrigida no mesmo dia. Medido por `tests/e2e/teclado.spec.ts`, a 800px e a 1440px.
- [x] CHK006 Os requisitos de **navegação por teclado** em tabela densa vivem em spec alguma? [Gap, Doc 23 §8.3] O documento 23 traz a tabela de teclas completa. Nenhuma spec a referencia, e o critério 6 do documento 06 foi adiado para a fatia (b) sem endereço. ✅ **FECHADO em 10/09/2026 pelo `FR-023` da spec 007** e pelo contrato `specs/007-componentes-ciaara/contracts/teclado.md`, que transcreve a tabela de teclas do documento 23 §8.3 e acrescenta os cinco casos de fronteira. A implementação é **uma só** — `components/ciaara/lista-navegavel.tsx` —, compartilhada pela tabela densa e pelo seletor de instrutor: duas navegações por teclado divergiriam, que é o mesmo defeito que a fatia veio fechar, só que em teclado em vez de cor. **16 casos de ponta a ponta com teclas de verdade**, mais 14 de unidade sobre a aritmética do movimento.

## Acessibilidade — clareza e mensurabilidade

- [x] CHK007 "Foco visível em **todos** os elementos interativos" é verificável? [Measurability, Doc 03 `RNF-USA-06`] A camada base aplica um anel global. Não há critério que diga como se prova que **nenhum** elemento o perdeu. ✅ **FECHADO em 10/09/2026 pelo `FR-024` da spec 007**, e a prova é medição: `tests/e2e/teclado.spec.ts` lê `outlineWidth` e `outlineStyle` do elemento focado **depois de cada tecla pressionada** — quatro paradas, quatro medições. ⚠️ **Não se prova por asserção sobre atributo**: um `tabindex` correto com um tratador que não dispara passa na leitura de atributo e falha na mão de quem usa.
- [x] CHK008 "Avisos **sempre visíveis**" tem definição operacional? [Ambiguity, Doc 03 `RNF-USA-04`] Sempre visível durante o quê: a sessão, a tela, a rolagem? A diferença muda o componente que a fatia (b) constrói. ✅ **FECHADO em 10/09/2026 pelo `FR-008` da spec 007**, com a decisão em `research.md §R-5`: **durante toda a permanência na tela, no topo da região, sem depender de rolagem e sem poder ser dispensado**. As outras duas leituras foram nomeadas e recusadas — “durante a sessão” exigiria estado sobrevivendo à navegação, que é da fatia (c); “até rolar além” falharia a palavra *sempre*. ⚠️ **A escolhida é a mais barata das que satisfazem o requisito**: fixar posição é folha de estilo, e por isso o `AlertaConformidade` **não leva marcador de cliente**. Medido em `tests/e2e/alerta.spec.ts`, rolando a região e conferindo que a posição na janela não muda.
- [x] CHK009 O requisito de **movimento reduzido** está escrito em algum lugar além da folha de estilo? [Gap] A camada base o implementa. Nenhum `FR-` o exige, então uma reescrita futura pode removê-lo sem violar requisito nenhum. ✅ **FECHADO em 10/09/2026 pelo `FR-029` da spec 007.** E a fatia (b) mostrou que a camada base **não bastava**: ela reduz toda animação a 0,01ms, o que num esqueleto de carregamento deixa um retângulo piscando uma vez em vez de parar. `components/ui/skeleton.tsx` desliga a pulsação por `motion-reduce`, e os três gráficos nascem **sem animação de entrada** — conferido por `tests/e2e/graficos.spec.ts`, que procura elemento de animação e exige zero.
- [x] CHK010 Há requisito para **leitor de tela** — nome acessível, região, ordem de leitura? [Gap, Doc 03 `RNF-USA-06`] O requisito nomeia contraste, foco e teclado. Leitor de tela não aparece, e é a parte que mais custa se deixada para o fim. ✅ **FECHADO em 10/09/2026 pelo `FR-030` da spec 007**, com as **três verificadas uma a uma** em `tests/e2e/acessibilidade.spec.ts`: nome acessível em todo controle (e nenhum dependendo só de ícone), região anunciada sem roubar o foco, e ordem do documento acompanhando a ordem visual. ⚠️ A redação anterior dizia *“deve existir requisito de leitor de tela”* — promessa circular, corrigida no mesmo dia.

## Acessibilidade — consistência

- [x] CHK011 A regra de contraste é a mesma na spec e no documento 23? [Conflict, Spec §FR-011 · Doc 23 §8.1] Além do texto grande do CHK001: a spec isenta borda **decorativa e estrutural** desde 09/09/2026, e o documento 23 ainda escreve *"limite de componente e elemento gráfico ≥ 3:1"* sem essa distinção. ✅ **FECHADO em 10/09/2026.** O §8.1 do documento 23 recebeu a isenção de borda decorativa e estrutural, e a categoria própria da `--borda-forte`.
- [x] CHK012 As **duas anotações falsas** do documento 23 foram corrigidas? [Conflict, Doc 23 §1.3] Ele anota 4,6:1 para `--texto-tenue`, que mede **4,49**, e 3,1:1 para `--borda-forte`, que mede **1,62**. Medido em 09/09/2026; o documento não foi emendado. ✅ **FECHADO em 10/09/2026 — e eram SEIS, não duas.** Medidas as sete anotações do §1.3: só a de `--texto-suave` conferia. Todas removidas, com a tabela do que cada uma errava. Nenhuma cor foi alterada.
- [x] CHK013 `--texto-tenue` tem proibição **verificável** de carregar dado? [Measurability, Doc 23 §8.1] O documento diz *"nunca carrega dado"*, e isso é hoje uma frase. Nada distingue dica de dado no código. ✅ **FECHADO em 10/09/2026 pelo `FR-031` da spec 007** e por `tests/unidade/texto-tenue.test.ts`. ⚠️ **A máquina não sabe distinguir dica de dado — ela sabe exigir que alguém tenha declarado qual é qual.** Todo uso do token traz, na linha acima, o que ele veste; uso sem declaração reprova. É o mesmo mecanismo das isenções de contraste, que exigem `motivo` obrigatório: **ele não valida a frase, impede a omissão**. Conferido por defeito deliberado, em 10/09/2026.

## Entrega para a fatia (b) — componentes

- [x] CHK014 Está escrito **quais** primitivos a fatia (b) precisa copiar? [Gap, Spec §Fatias seguintes] O documento 23 §3.1 nomeia dezoito; a fatia (a) copiou quatro. Nenhum requisito diz que os catorze restantes entram com a (b), nem em que ordem. ✅ **FECHADO em 10/09/2026 pelo `FR-001` da spec 007**, que os nomeia, e pelas tarefas T005 a T014, que os enumeram um por arquivo. **Entraram dez, não catorze**: o `research.md §R-1` mediu o pacote `radix-ui` já instalado e ele **já exportava sete** dos necessários; os três restantes — campo, aviso e silhueta — são folha de estilo pura, sem primitivo por baixo. **Nenhum pacote de componente novo entrou.**
- [x] CHK015 Existe requisito obrigando a **reconciliação a crescer** com cada primitivo novo? [Gap, Spec §FR-018] Hoje isso é garantido por teste, não por requisito. Teste sem requisito por trás é o que alguém desliga para destravar a entrega. ✅ **FECHADO em 10/09/2026 pelo `FR-002` da spec 007**, que agora é requisito e não só teste. ⚠️ **E a fatia mediu uma coisa que ninguém esperava: os dez primitivos novos trouxeram ZERO variável nova.** A reconciliação continua com 18 pares. O que cresceu foi a verificação — a invariante **I-4b** passou a valer na direção que pega defeito: toda variável de terceiro **usada** em `components/ui/` precisa ter par. Sem ela, um primitivo novo podia usar uma variável que ninguém declarou, e a cor sairia transparente sem erro nenhum.
- [x] CHK016 O `NomeInstrutor` tem requisito de **formato** nesta linhagem de specs? [Gap, Doc 23 §3.1] Ele cita `RF-DS-05` e `RF-INSTR-15`, e o formato é vocabulário intraduzível. Nenhuma spec do Épico 4 o repete. ⚠️ **CORRIGIDO EM 10/09/2026 — este item trazia o formato ERRADO.** Ele escrevia `P/G Especialidade Nome de Guerra`, compressão que **descarta o nome completo**. O `RF-INSTR-15`, que é **[PRESERVADO]**, manda `P/G Especialidade/Habilitação Nome Completo` **com as palavras do nome de guerra em negrito** — e a spec 006 já concordava com ele. O erro passou para o `FR-012` da spec 007, onde foi pego pela análise e corrigido no mesmo dia. **Nenhuma regra mudou; a transcrição é que estava errada.** ✅ **FECHADO em 10/09/2026 pelo `FR-012` da spec 007**, que traz o formato **correto** — `P/G Especialidade/Habilitação Nome Completo`, com as palavras do nome de guerra em negrito —, pela função pura `lib/dominio/nome-instrutor.ts`, com a citação literal do `RF-INSTR-15` no topo, e por `tests/unidade/nome-instrutor.test.ts`, com os quatro casos portados da spec 020 da v2.0 mais a armadilha da fronteira de palavra acentuada, que a v2.0 já havia pago.
- [x] CHK017 Está definido o que um componente de `components/ciaara/` **não** faz? [Completeness, Doc 23 §3.2] A fronteira existe no documento 23 — não acessa banco, não implementa `RN-`, não define cor. Só a terceira virou regra de lint. ✅ **FECHADO em 10/09/2026 pelos `FR-019` a `FR-022` da spec 007**, e as **quatro** passam a ter portão em `tests/unidade/fronteira-componentes.test.ts`: zero importação de banco, zero regra `RN-` escrita no corpo, zero cor fora do ponto único, e a quarta — **marcador de cliente por precaução** — contra a lista fechada do documento 23 §3.1. ⚠️ **A quarta é a que mais custava e não tinha portão nenhum**: o marcador contamina toda a subárvore de importação, e o erro **não aparece no `tsc`** — aparece no `next build`.

## Entrega — o que a fatia (a) deixa pendente

- [x] CHK018 A pendência da `--borda-forte` tem **dono e gatilho** de reabertura? [Assumption, Contrato vocabulário] Ela está medida e nomeada, e o "resolve em" diz *"a fatia que construir o primeiro campo"*. Nenhuma tarefa de fatia alguma a reivindica. ✅ **FECHADO em 10/09/2026: o gatilho disparou, e a resposta não foi a esperada.** A fatia (b) construiu o campo, e o `FR-032` decidiu sobre medição — **nenhum** dos catorze tokens de borda alcança 3:1, o melhor mede 2,23. O traço que identifica o campo passou a ser **`--texto-tenue`**, que mede 4,49 no claro e 4,85 no noturno, auditado como par **C-2** (`FR-032.1`). **Nenhuma cor foi alterada e nenhum token nasceu.** ⚠️ **O que fica aberto mudou de pergunta**, e está registrado em `PENDENTES` de `lib/design/vocabulario.ts`: `--borda-forte` não é mais o traço de campo, e classificá-la como isenta é decisão de Bernardo — foi decisão dele que criou a categoria.
- [X] CHK019 Está escrito que o **alternador de tema provisório** deve ser substituído, e não apenas duplicado? [Clarity, Spec §FR-022] O requisito diz que ele é provisório. Não diz que o da vitrine **sai** quando o do cabeçalho entrar — dois alternadores é o resultado mais provável.
  - ✅ **Fechado por** `FR-018` da spec `008` — o alternador da vitrine **saiu**, mudou de pasta para `components/casca/`, e há percurso que confere os dois lados.
- [X] CHK020 As **cinco telas do Épico 3** sem vocabulário têm requisito na fatia (c)? [Gap, Spec §SC-007] Elas estão registradas como dívida herdada. Nenhum `FR-` da (c) existe ainda para cobrá-las.
  - ✅ **Fechado por** `FR-022` da spec `008` — nove arquivos das cinco telas ganharam token de papel, borda e raio; zero cor literal.
- [X] CHK021 A rota `/estilo` continua **sem sessão** depois da fatia (c)? [Gap, Ambiguity] Ela foi liberada em 10/09/2026 porque não exibe dado. Quando houver navegação e cabeçalho, ninguém escreveu se ela entra no grupo autenticado ou permanece aberta.
  - ✅ **Fechado por** `FR-038` da spec `008` — `/estilo` permanece **sem sessão**, fora do grupo autenticado e sem a casca, com percurso próprio.
- [X] CHK022 O módulo `lib/design/` está previsto na estrutura do repositório? [Gap, Doc 24] Ele nasceu na fatia (a) para que a vitrine exibisse o mesmo número que a auditoria afere. O documento 24 não o menciona.
  - ✅ **Fechado por** `FR-039` da spec `008` — `lib/design/`, `lib/navegacao/` e `components/casca/` entraram na árvore do documento 24 §1, com emenda datada.

## Entrega para a fatia (c) — shell e estado

- [X] CHK023 O `RF-NAV-01` tem requisito **realizável** em alguma spec? [Gap, Spec §Contexto] A spec 005 **declara** que o ponto de verdade passa a ser a URL, por exigência do documento 06, e diz que a realização é da fatia (c). A (c) ainda não existe, então a declaração está sem par.
  - ✅ **Fechado por** `FR-001` a `FR-007` da spec `008` — o `RF-NAV-01` passou a ter contrato tipado, esquema de leitura e gancho, todos exercitados.
- [X] CHK024 Está definido o que é **estado efêmero de interface**, com exemplo e contraexemplo? [Clarity, Doc 06 riscos] O risco nomeado é o gerenciador de estado virar o `AppState` disfarçado. A fronteira precisa ser escrita **antes**, não descoberta na revisão.
  - ✅ **Fechado por** `FR-010` da spec `008` — definido pela pergunta *"isto faz sentido num link que eu mando para outra pessoa?"*, com exemplo e contraexemplo, em `docs/guias/estado-na-url.md`.
- [X] CHK025 A raiz autenticada tem requisito? [Gap] Medido em 09/09/2026: depois de entrar, a pessoa cai numa página **sem um único link**, cujo texto ainda afirma que nenhuma tabela de negócio existe. Nenhum requisito diz o que a raiz deve ser.
  - ✅ **Fechado por** `FR-016` e `FR-030` da spec `008` — a casca dá para onde ir, e a raiz leva à tela Início em vez de ser um beco.
- [ ] CHK026 Existe requisito de **paridade visual por tela** para os épicos 5 a 13? [Measurability, Doc 06 critério 8] Ele exige que nenhuma tela da v2.0 perca informação, cor semântica ou estado visual. É vacuamente verdadeiro hoje e não diz **como** se mede quando cada tela for reconstruída.

## Notas

- Marque com `[x]` conforme fechar, e escreva o achado na própria linha.
- **Um item que reprova não é defeito da fatia (a).** É requisito que a fatia seguinte vai ter de
  inventar sozinha, na pressa, e que ninguém vai conferir depois.
- Os **CHK001, CHK002, CHK011 e CHK012** já foram observados durante a redação, com medição:
  são divergências reais entre a spec 005 e o documento 23, hoje. Ficam como itens porque emendar
  documento normativo é decisão do Bernardo.
- ⚠️ O **CHK002** é o de maior alcance imediato: as oito séries de gráfico entram em uso na fatia
  (b), e hoje **não há um único par auditado** que as cubra.


---

## Fechamento de 11/09/2026 — o que a fatia (c) resolveu

`CHK019` a `CHK025`, **os sete**, cada um apontando pelo número o requisito que o fecha (`SC-016`).

⚠️ **SEIS DELES ERAM LACUNAS DE REQUISITO, E NÃO DE CÓDIGO** — a fatia (a) os registrou justamente
por isso, e eles atravessaram a fatia (b) intactos porque ela entregou vocabulário e não tela. O que
os fechou foi a fatia que tinha de escrever a navegação.

⚠️ **E UM DELES FOI PEGO POR UM PORTÃO, NÃO POR REVISÃO.** O `CHK019` mandava o alternador da vitrine
sair; ao tirá-lo, a invariante que exige amostra na vitrine para todo componente de
`components/ciaara/` reprovou. A solução não foi isentar: foi **mover o arquivo** para
`components/casca/`, porque ele é cromo da aplicação e não vocabulário de domínio.
