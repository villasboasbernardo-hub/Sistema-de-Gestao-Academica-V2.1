# Specification Quality Checklist: Disciplinas e atribuição por turma — Épico 5, fatia (b)

**Purpose**: Validar a completude e a qualidade da especificação antes do planejamento
**Created**: 2026-09-24
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] Sem detalhe de implementação (linguagem, framework, API) — os nomes de tabela, coluna,
      componente e rota aparecem **como fatos medidos** (a seção *O que foi MEDIDO*) e como
      **restrição de continuidade** (a seção *Contexto de ramo*), não como desenho. O *como* fica
      para o `/speckit.plan`
- [X] Focado em valor de uso e necessidade de negócio — as cinco histórias são percursos de quem
      administra, e cada uma entrega sozinha
- [X] Escrito para quem decide, não para quem implementa — ⚠️ **com a ressalva de sempre neste
      projeto**: o leitor é o responsável pela CIAARA-11, que conhece o vocabulário do domínio
      (`turma_disciplina`, CH prevista, modo de atribuição). Traduzir esses termos empobreceria a
      spec em vez de esclarecê-la
- [X] Todas as seções obrigatórias preenchidas

## Requirement Completeness

- [ ] ⚠️ **Nenhuma pergunta em aberto — FALHA DE PROPÓSITO, e é instrução expressa.** Bernardo
      determinou em 24/09/2026: *"Pare ao fim do specify: liste as perguntas que o clarify vai
      precisar, mas não responda nenhuma e não rode o clarify."* São **8** perguntas, de `Q-01` a
      `Q-08`, na seção própria. **Nenhuma foi decidida por suposição** — que é o que este item
      existe para impedir. Ele fecha quando o `/speckit.clarify` rodar
- [X] Requisitos testáveis e sem ambiguidade — os **25** `FR-` são verificáveis; os que dependem de
      pergunta **apontam a pergunta** (`FR-017` → `Q-03`, `FR-016` → `Q-02`, `FR-008` → `Q-01`) em
      vez de fixar um valor
- [X] Critérios de sucesso mensuráveis — contagens exatas e percentuais fechados: 100% das recusas
      de código repetido, 0 linhas alteradas em outra turma, soma fechando para 2, 3 e 4
      instrutores, zero campos digitáveis
- [ ] ⚠️ **Critérios de sucesso independentes de tecnologia — UM NÃO É, e a exceção fica escrita.**
      Medido sobre os **12** `SC-`: **11** são agnósticos; o **`SC-012`** cita marcador de cliente,
      `await` em laço e cor fora do ponto único. Ele existe porque essas quatro varreduras **já são
      portão do repositório** desde o Épico 4, e omiti-lo faria a fatia parecer dispensada delas.
      Registrado em vez de marcado em silêncio
- [X] Todos os cenários de aceitação definidos — cada história traz de 3 a 4, no formato
      Given/When/Then
- [X] Casos de borda identificados — seis, todos ancorados em medição: a duplicata que já existe, as
      86 disciplinas sem previsão, turma sem janela, instrutor que perdeu habilitação, a linha com os
      dois sinais, e curso inativo
- [X] Escopo claramente delimitado — há seção *Fora de escopo* com seis itens, cada um com o destino
      (Épico 6, 7, 11, `LIQ-3`, fatia (a), Épico 2)
- [X] Dependências e premissas identificadas — cinco premissas, e a tabela do *Contexto de ramo* diz
      o que vem do PR 2 e que este ramo **será rebaseado** depois do merge dele

## Feature Readiness

- [X] Todo requisito funcional tem critério de aceite claro — cada `FR-` é coberto por um `SC-` ou
      por um cenário de aceitação nomeado
- [X] Os cenários de usuário cobrem os percursos principais — cascata, CRUD, período e instrutor por
      turma, rateio, e o quadro de filtros e indicadores
- [X] A fatia atende aos resultados mensuráveis dos critérios de sucesso
- [X] Nenhum detalhe de implementação vazou para dentro dos requisitos — os `FR-` dizem **o quê**;
      onde nomeiam um artefato, é para proibir a segunda cópia dele (`FR-001`, `FR-024`)

## Notas

⚠️ **Os dois itens abertos são deliberados, e nenhum deles se fecha escrevendo mais spec.** O
primeiro fecha no `/speckit.clarify`, quando Bernardo responder as oito perguntas. O segundo é uma
exceção medida e declarada, no mesmo formato adotado na spec 009.

⚠️ **E quatro achados foram medidos, não corrigidos** (`A-1` a `A-4` na spec): o modo `simultaneo`
zerado por causa do nome que perdeu "FIM" em 6 disciplinas; a unicidade `(curso_id, cod_disciplina)`
que **não existe** no schema com **1** duplicata viva; o contorno da `RN-MAT-02` que parece ter
deixado de ser necessário; e a CH rateada vazia em 210 de 210. **Nenhum foi consertado aqui** —
regra 1 do `CLAUDE.md`: listar, não corrigir.
