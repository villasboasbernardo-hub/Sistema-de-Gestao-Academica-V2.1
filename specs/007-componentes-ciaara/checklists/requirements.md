# Checklist de qualidade da especificação: Épico 4, fatia (b) — Componentes CIAARA

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
- [x] Escopo delimitado — inclui *Fora de escopo* e *Quem espera esta fatia*
- [x] Dependências e premissas identificadas

## Prontidão da feature

- [x] Todo requisito funcional tem critério de aceite claro
- [x] Os cenários de usuário cobrem os percursos principais
- [x] A feature atende aos resultados mensuráveis dos Critérios de Sucesso
- [x] Nenhum detalhe de implementação vaza para a especificação

## Notas

- **As três decisões de 10/09/2026 encolheram a fatia e aumentaram o compromisso**, nessa ordem: as
  grades densas saíram para os Épicos 6 e 7; a documentação viva fica na vitrine, sem dependência
  nova; e **doze itens do checklist da fatia (a) foram nomeados** como fechados aqui.
- ⚠️ **Nomear os doze custou mais que o número sugere.** Cinco deles não tinham requisito nenhum
  nesta spec e viraram os `FR-028` a `FR-032` — ponto de quebra, movimento reduzido, leitor de tela,
  a proibição verificável de `--texto-tenue` carregar dado, e a pendência da borda de campo. Sem
  isso, "fecha doze" seria promessa, não compromisso.
- ⚠️ **O `CHK018` vence aqui, e vale saber por quê**: ele dizia *"resolve na fatia que construir o
  primeiro campo"*. Esta é.
- ⚠️ **Quatro itens do escopo pedido foram devolvidos porque já estão prontos e mesclados**: a
  paleta, a regra de cor, a auditoria de contraste e quatro primitivos. Reespecificá-los seria
  refazer trabalho que está na `main` desde o PR #7. Está registrado na tabela *O que NÃO entra*.
- ⚠️ **Estado na URL foi devolvido à fatia (c)**, de onde a decisão de 09/09/2026 o pôs. Trazê-lo
  para cá desfaria a subdivisão que destravou o Épico 5.
- **Três divergências do documento 23 foram listadas e não corrigidas**, conforme a regra 1 do
  `CLAUDE.md`. A mais consequente é o inventário do §3.1 misturar três destinos na mesma tabela:
  quem o ler como lista de trabalho desta fatia incluiria os componentes de impressão, que são dos
  Épicos 10 e 11.
