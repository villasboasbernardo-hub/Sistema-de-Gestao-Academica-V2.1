# Checklist de qualidade da especificação: Épico 5, fatia (c) — Cadastro de instrutores

**Propósito**: validar a completude e a qualidade da especificação antes de planejar
**Criado**: 10/09/2026
**Feature**: [spec.md](../spec.md)

## Qualidade do conteúdo

- [x] Sem detalhe de implementação (linguagem, framework, biblioteca)
- [x] Focado em valor para o usuário e necessidade de negócio
- [x] Escrito para quem decide, não só para quem implementa
- [x] Todas as seções obrigatórias preenchidas

## Completude dos requisitos

- [x] **Nenhum marcador `[NEEDS CLARIFICATION]` remanescente** — as três foram fechadas por Bernardo em 10/09/2026
- [x] Requisitos testáveis e sem ambiguidade
- [x] Critérios de sucesso mensuráveis
- [x] Critérios de sucesso independentes de tecnologia
- [x] Todos os cenários de aceitação definidos
- [x] Casos de fronteira identificados
- [x] Escopo delimitado — inclui *Fora de escopo* e *Fatias seguintes*
- [x] Dependências e premissas identificadas

## Prontidão da feature

- [x] Todo requisito funcional tem critério de aceite claro
- [x] Os cenários de usuário cobrem os percursos principais
- [x] A feature atende aos resultados mensuráveis dos Critérios de Sucesso
- [x] Nenhum detalhe de implementação vaza para a especificação

## Notas

- ⚠️ **A spec está pronta e a FATIA ESTÁ BLOQUEADA — e as duas coisas são compatíveis.** A Q5c.a foi
  respondida em 10/09/2026 com *esperar o Épico 4*: os componentes densos, os gráficos e o estado na
  URL não existem, e a decisão foi não construí-los aqui. **A ordem passa a ser Épico 4 (b) →
  Épico 4 (c) → Épico 5 (c)**, e planejar esta fatia antes disso é planejar sobre o que não existe.
- As outras duas decisões **encolheram** o escopo: preferências por turma esperam a fatia (b), e do
  `RF-INSTR-10` fica só a ficha em tela.
- **Quatro divergências foram listadas e não corrigidas**, conforme a regra 1 do `CLAUDE.md`. Duas
  são reais e medidas: a escala de antiguidade do documento 04 não cobre civis, e o mesmo documento
  afirma que a coluna de antiguidade da v2.0 não foi migrada como campo funcional — e ela foi, como
  desempate. Ver a última seção da spec.
- ⚠️ **O maior risco desta fatia não é técnico: é PERDER UM REFINAMENTO.** São oito specs da v2.0
  condensadas, cada uma um pedido feito depois de usar. O `SC-007` existe só para isso, e ele exige
  percorrer a tabela §4 do documento 06 **item a item**, não por amostragem.
