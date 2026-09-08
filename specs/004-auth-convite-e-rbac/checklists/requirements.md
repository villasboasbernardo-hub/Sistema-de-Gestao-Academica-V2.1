# Checklist de qualidade da especificação: Épico 3 — Auth por convite, usuários e RBAC

**Propósito**: validar a completude e a qualidade da especificação antes de planejar
**Criado**: 08/09/2026
**Feature**: [spec.md](../spec.md)

## Qualidade do conteúdo

- [x] Sem detalhe de implementação (linguagem, framework, biblioteca)
- [x] Focado em valor para o usuário e necessidade de negócio
- [x] Escrito para quem decide, não só para quem implementa
- [x] Todas as seções obrigatórias preenchidas

## Completude dos requisitos

- [ ] Nenhum marcador `[NEEDS CLARIFICATION]` remanescente — **2 em aberto**, ver Notas
- [x] Requisitos testáveis e sem ambiguidade
- [x] Critérios de sucesso mensuráveis
- [x] Critérios de sucesso independentes de tecnologia
- [x] Todos os cenários de aceitação definidos
- [x] Casos de fronteira identificados
- [x] Escopo delimitado — inclui a seção *Fora de escopo* com o motivo de cada exclusão
- [x] Dependências e premissas identificadas

## Prontidão da feature

- [ ] Todo requisito funcional tem critério de aceite claro — **FR-028/FR-029 dependem da Q1**
- [x] Os cenários de usuário cobrem os percursos principais
- [x] A feature atende aos resultados mensuráveis dos Critérios de Sucesso
- [x] Nenhum detalhe de implementação vaza para a especificação

## Verificações próprias deste épico

- [x] **Teste negativo é requisito, não sugestão** (FR-034): há exigência explícita de que teste só
      de caminho feliz não é aceito — uma policy `using (true)` passa nele
- [x] **A ocultação na interface não é tratada como proteção** (FR-020 + FR-022 separados)
- [x] **Nenhuma segunda declaração de permissões** fora da matriz (FR-021)
- [x] **A dívida registrada no Épico 2 é paga aqui**, e a especificação diz onde ela foi registrada
      (US5, cabeçalho da migration `20260908071000`)
- [x] **A exceção ao `RN-DEG-01` está declarada, não presumida** (FR-005.1): degradar para "vazio
      com aviso" numa fronteira de autenticação é degradar para "aberto"
- [x] **A armadilha A do documento 30 está endereçada** (FR-027.1): `app.set_auditoria()` descarta
      carimbo em silêncio sem sessão — correto no ETL, defeito grave numa tela
- [x] Os itens que **não se garantem por código** estão marcados como conferência, não como
      requisito de implementação (FR-003, auto-cadastro no painel)

## Notas

**Dois `[NEEDS CLARIFICATION]` em aberto**, ambos de escopo e ambos sem padrão razoável que possa
ser presumido:

1. **Q1 — Quais perfis podem ler o dado pessoal de instrutor?** Bloqueia FR-028 e FR-029. Não é
   escolha técnica: é decisão sobre quem, dentro da Divisão, tem necessidade de conhecer
   identificação civil e residência de 177 militares.
2. **Q2 — Telas agora ou depois do Épico 4?** Bloqueia o dimensionamento da fatia inteira. As duas
   leituras são defensáveis e levam a entregas materialmente diferentes.

Itens marcados como incompletos exigem atualização da especificação antes de `/speckit-plan`.
