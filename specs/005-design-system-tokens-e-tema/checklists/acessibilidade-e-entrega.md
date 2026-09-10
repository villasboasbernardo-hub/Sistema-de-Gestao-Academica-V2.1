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
- [ ] CHK005 Há requisito de **ponto de quebra responsivo**? [Gap, Doc 03 `RNF-USA-02`] Ele fala em uso típico em desktop para tabelas densas, sem número. A vitrine já usa um ponto de quebra escolhido sem requisito por trás.
- [ ] CHK006 Os requisitos de **navegação por teclado** em tabela densa vivem em spec alguma? [Gap, Doc 23 §8.3] O documento 23 traz a tabela de teclas completa. Nenhuma spec a referencia, e o critério 6 do documento 06 foi adiado para a fatia (b) sem endereço.

## Acessibilidade — clareza e mensurabilidade

- [ ] CHK007 "Foco visível em **todos** os elementos interativos" é verificável? [Measurability, Doc 03 `RNF-USA-06`] A camada base aplica um anel global. Não há critério que diga como se prova que **nenhum** elemento o perdeu.
- [ ] CHK008 "Avisos **sempre visíveis**" tem definição operacional? [Ambiguity, Doc 03 `RNF-USA-04`] Sempre visível durante o quê: a sessão, a tela, a rolagem? A diferença muda o componente que a fatia (b) constrói.
- [ ] CHK009 O requisito de **movimento reduzido** está escrito em algum lugar além da folha de estilo? [Gap] A camada base o implementa. Nenhum `FR-` o exige, então uma reescrita futura pode removê-lo sem violar requisito nenhum.
- [ ] CHK010 Há requisito para **leitor de tela** — nome acessível, região, ordem de leitura? [Gap, Doc 03 `RNF-USA-06`] O requisito nomeia contraste, foco e teclado. Leitor de tela não aparece, e é a parte que mais custa se deixada para o fim.

## Acessibilidade — consistência

- [x] CHK011 A regra de contraste é a mesma na spec e no documento 23? [Conflict, Spec §FR-011 · Doc 23 §8.1] Além do texto grande do CHK001: a spec isenta borda **decorativa e estrutural** desde 09/09/2026, e o documento 23 ainda escreve *"limite de componente e elemento gráfico ≥ 3:1"* sem essa distinção. ✅ **FECHADO em 10/09/2026.** O §8.1 do documento 23 recebeu a isenção de borda decorativa e estrutural, e a categoria própria da `--borda-forte`.
- [x] CHK012 As **duas anotações falsas** do documento 23 foram corrigidas? [Conflict, Doc 23 §1.3] Ele anota 4,6:1 para `--texto-tenue`, que mede **4,49**, e 3,1:1 para `--borda-forte`, que mede **1,62**. Medido em 09/09/2026; o documento não foi emendado. ✅ **FECHADO em 10/09/2026 — e eram SEIS, não duas.** Medidas as sete anotações do §1.3: só a de `--texto-suave` conferia. Todas removidas, com a tabela do que cada uma errava. Nenhuma cor foi alterada.
- [ ] CHK013 `--texto-tenue` tem proibição **verificável** de carregar dado? [Measurability, Doc 23 §8.1] O documento diz *"nunca carrega dado"*, e isso é hoje uma frase. Nada distingue dica de dado no código.

## Entrega para a fatia (b) — componentes

- [ ] CHK014 Está escrito **quais** primitivos a fatia (b) precisa copiar? [Gap, Spec §Fatias seguintes] O documento 23 §3.1 nomeia dezoito; a fatia (a) copiou quatro. Nenhum requisito diz que os catorze restantes entram com a (b), nem em que ordem.
- [ ] CHK015 Existe requisito obrigando a **reconciliação a crescer** com cada primitivo novo? [Gap, Spec §FR-018] Hoje isso é garantido por teste, não por requisito. Teste sem requisito por trás é o que alguém desliga para destravar a entrega.
- [ ] CHK016 O `NomeInstrutor` tem requisito de **formato** nesta linhagem de specs? [Gap, Doc 23 §3.1] Ele cita `RF-DS-05` e `RF-INSTR-15`, e o formato `P/G Especialidade Nome de Guerra` é vocabulário intraduzível. Nenhuma spec do Épico 4 o repete.
- [ ] CHK017 Está definido o que um componente de `components/ciaara/` **não** faz? [Completeness, Doc 23 §3.2] A fronteira existe no documento 23 — não acessa banco, não implementa `RN-`, não define cor. Só a terceira virou regra de lint.

## Entrega — o que a fatia (a) deixa pendente

- [ ] CHK018 A pendência da `--borda-forte` tem **dono e gatilho** de reabertura? [Assumption, Contrato vocabulário] Ela está medida e nomeada, e o "resolve em" diz *"a fatia que construir o primeiro campo"*. Nenhuma tarefa de fatia alguma a reivindica.
- [ ] CHK019 Está escrito que o **alternador de tema provisório** deve ser substituído, e não apenas duplicado? [Clarity, Spec §FR-022] O requisito diz que ele é provisório. Não diz que o da vitrine **sai** quando o do cabeçalho entrar — dois alternadores é o resultado mais provável.
- [ ] CHK020 As **cinco telas do Épico 3** sem vocabulário têm requisito na fatia (c)? [Gap, Spec §SC-007] Elas estão registradas como dívida herdada. Nenhum `FR-` da (c) existe ainda para cobrá-las.
- [ ] CHK021 A rota `/estilo` continua **sem sessão** depois da fatia (c)? [Gap, Ambiguity] Ela foi liberada em 10/09/2026 porque não exibe dado. Quando houver navegação e cabeçalho, ninguém escreveu se ela entra no grupo autenticado ou permanece aberta.
- [ ] CHK022 O módulo `lib/design/` está previsto na estrutura do repositório? [Gap, Doc 24] Ele nasceu na fatia (a) para que a vitrine exibisse o mesmo número que a auditoria afere. O documento 24 não o menciona.

## Entrega para a fatia (c) — shell e estado

- [ ] CHK023 O `RF-NAV-01` tem requisito **realizável** em alguma spec? [Gap, Spec §Contexto] A spec 005 **declara** que o ponto de verdade passa a ser a URL, por exigência do documento 06, e diz que a realização é da fatia (c). A (c) ainda não existe, então a declaração está sem par.
- [ ] CHK024 Está definido o que é **estado efêmero de interface**, com exemplo e contraexemplo? [Clarity, Doc 06 riscos] O risco nomeado é o gerenciador de estado virar o `AppState` disfarçado. A fronteira precisa ser escrita **antes**, não descoberta na revisão.
- [ ] CHK025 A raiz autenticada tem requisito? [Gap] Medido em 09/09/2026: depois de entrar, a pessoa cai numa página **sem um único link**, cujo texto ainda afirma que nenhuma tabela de negócio existe. Nenhum requisito diz o que a raiz deve ser.
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
