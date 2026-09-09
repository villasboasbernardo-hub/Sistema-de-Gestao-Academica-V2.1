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

**36 → 46 → 51 requisitos.** As telas viraram requisito nomeado (FR-025.1 a FR-025.7), o recorte de
PII ganhou FR-028.1 e FR-028.2, e a sessão de clarificação de 08/09 acrescentou FR-005.2, FR-024.1,
FR-031.1, FR-032.1 e dois critérios de sucesso.

## Sessão de clarificação — 08/09/2026

Três perguntas, todas de impacto material. Duas ambiguidades candidatas foram **descartadas por
medição** antes de virarem pergunta:

- *`usuario_curso` chega vazia — os Encarregados de Curso migrados ficam sem alcance?* **Não há
  Encarregado de Curso migrado.** Os três usuários da v2.0 são dois `admin` e um `visualizacao`,
  todos de escopo `Geral`. Registrado no FR-032.1.
- *Qual o comportamento quando `instrutor_id` aponta para instrutor inativo?* Não há segunda leitura
  defensável: nada é apagado e a tela mostra a situação. Resolvido por premissa, não por pergunta.

**O achado da sessão**: o documento 22 tem modelo de ameaças de A-1 a A-7 e **nenhuma delas é
tentativa repetida de senha**. A defesa de A-7 protege a senha escolhida, não o endereço de login.
O FR-005.2 trata a lacuna nesta fatia e prevê **propor uma ameaça A-8** ao documento 22.

Checklist **completo**. A especificação está pronta para `/speckit-plan`.
