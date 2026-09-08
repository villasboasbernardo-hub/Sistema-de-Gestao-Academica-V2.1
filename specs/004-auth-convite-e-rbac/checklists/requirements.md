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

- [x] Nenhum marcador `[NEEDS CLARIFICATION]` remanescente — os 2 foram fechados em 08/09/2026
- [x] Requisitos testáveis e sem ambiguidade
- [x] Critérios de sucesso mensuráveis
- [x] Critérios de sucesso independentes de tecnologia
- [x] Todos os cenários de aceitação definidos
- [x] Casos de fronteira identificados
- [x] Escopo delimitado — inclui a seção *Fora de escopo* com o motivo de cada exclusão
- [x] Dependências e premissas identificadas

## Prontidão da feature

- [x] Todo requisito funcional tem critério de aceite claro
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

**Os dois `[NEEDS CLARIFICATION]` foram fechados em 08/09/2026:**

1. **Q1 — Dado pessoal de instrutor:** três perfis leem — `admin`,
   `encarregado_administracao_academica` e `ajudante_administracao_academica`. Os outros seis não.
   ⚠️ Registrado no FR-028.2 que **restringir coluna não é `ROW LEVEL SECURITY`**: RLS decide quais
   linhas a sessão enxerga e não sabe recortar coluna. O requisito exige que a decisão seja do
   banco; **qual** instrumento do banco é escolha do plano.
2. **Q2 — Telas:** entram nesta fatia, funcionais e sóbrias. A dívida de estilo ficou registrada na
   premissa 6 e no FR-025.5, para não ser descoberta no Épico 4.

**36 → 46 requisitos** depois das decisões: as quatro telas viraram requisito nomeado (FR-025.1 a
FR-025.6) e o recorte de PII ganhou os desdobramentos FR-028.1 e FR-028.2.

Checklist **completo**. A especificação está pronta para `/speckit-plan`.
