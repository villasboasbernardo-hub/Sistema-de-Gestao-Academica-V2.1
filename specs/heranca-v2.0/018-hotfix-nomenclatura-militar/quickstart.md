# Quickstart — Hotfix: Regras Estritas de Nomenclatura Militar e Formatação

Roteiro de validação manual no navegador, após ``git push` (a Vercel publica a preview da branch)`/`deploy` (nenhuma migração de schema
envolvida neste hotfix).

## Pré-requisitos

- Implantação via `o fluxo Git → Vercel` já feita (`o histórico de deploys da Vercel`).
- Logado na aplicação Next.js como Operador/Admin.
- Idealmente, 1 instrutor de teste em cada círculo (Oficial sem especialidade, Oficial com
  especialidade `CA`, Oficial com outra especialidade, Praça com especialidade `CA`, Civil) — ou
  usar os exemplos reais já existentes na base (nenhum tem `Esp_Hab_Obs="CA"` hoje, confirmado via
  `openpyxl`).

## Passo 1 — Regras de círculo na tela de Instrutores (US1)

1. Abrir a tela de Instrutores, expandir/editar um instrutor Oficial com especialidade preenchida.
2. Abrir a Ficha do Instrutor (botão "Imprimir Ficha") de um instrutor com `Nome_Guerra` preenchido.
3. **Esperado**: o nome completo aparece com o nome de guerra em **negrito** dentro dele; o
   Posto/Graduação continua aparecendo só na linha própria da Ficha, não duplicado no cabeçalho.

## Passo 2 — Exceção de `CA` para Oficiais (US1, critério de aceite central)

1. Editar um instrutor Oficial (ex.: posto `CT`/`CMG`) e definir `Esp_Hab_Obs` para a sigla `CA`.
2. Salvar e conferir onde esse instrutor aparece (grade do DSA, se tiver aula lançada).
3. **Esperado**: o texto mostra só `[Posto] [Nome]` — a sigla `(CA)` **não** aparece ao lado do
   posto.
4. Repetir com um instrutor Praça (ex.: posto `SO`) e `Esp_Hab_Obs="CA"`.
5. **Esperado**: o texto mostra `[Posto]-CA [Nome]` — a sigla `CA` **aparece** normalmente (a
   exceção do Oficial nunca se aplica a Praças).

## Passo 3 — Dropdowns de alocação sem tags HTML (US2)

1. No Detalhe Semanal de Aula, abrir o formulário de lançamento manual de Aula, selecionar uma
   disciplina com instrutor habilitado.
2. Inspecionar (F12 → Elements) o `<select>` de instrutor.
3. **Esperado**: nenhuma tag `<strong>` aparece dentro de nenhuma `<option>`, nem no texto visível
   nem no HTML gerado.
4. Repetir com o dropdown de instrutor ao criar um vínculo de qualificação na tela de Instrutores.
5. **Esperado**: mesma ausência de tags HTML, e o texto de cada opção agora inclui a especialidade
   do instrutor (quando aplicável), seguindo as mesmas regras de círculo do Passo 2.

## Passo 4 — Dropdown de Especialidade/Habilitação/Observação (US3)

1. Abrir o formulário de cadastro/edição de instrutor, abrir o dropdown de
   Especialidade/Habilitação/Observação.
2. **Esperado**: cada opção mostra "SIGLA - Nome da Especialidade" (ex.: "AM - Armamento").
3. Selecionar uma opção e salvar.
4. **Esperado**: o valor gravado em `Esp_Hab_Obs` é só a sigla (conferir no banco ou reabrindo o
   formulário — a opção correta continua pré-selecionada).

## Passo 5 — Suíte automatizada

```bash
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: `tests/unidade/design_system.test.ts` com os 9 casos de `formatarNomeInstrutor_` migrados
para a nova assinatura, mais os casos novos por regra de círculo — 0 falhas, 0 regressão em
nenhum outro teste já existente.
