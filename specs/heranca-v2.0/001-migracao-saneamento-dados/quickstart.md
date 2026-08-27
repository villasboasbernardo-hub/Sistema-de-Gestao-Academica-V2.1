# Quickstart — Validar o Épico C (Migração e Saneamento da Base de Dados)

## Pré-requisitos

- Python 3.x com `openpyxl` instalado (já usado por `migracao/renomear_materia_para_disciplina.py`).
- Node.js com o runtime `node:test` nativo (sem `npm install` — não há `package.json`).
- O arquivo de trabalho `Versão 2.0/Fase 2 - Arquitetura/Banco de dados CIAARA-11 v2.0.xlsx` presente
  no repositório `SIS11` (fora de `CIAARA-11-v2/`, ver caminho relativo nos scripts).

## 1. Ver o estado atual (antes de qualquer correção)

```powershell
cd CIAARA-11-v2
pnpm vitest run tests/unidade/*.test.ts
```

Resultado esperado **antes** desta feature: `tests 58`, `pass 42`, `fail 3`, `todo 13`. As 3 falhas
são exatamente os achados 1–3 descritos em `research.md`.

## 2. Rodar as correções (uma de cada vez, cada uma seu próprio commit)

```powershell
cd CIAARA-11-v2\migracao
python corrigir_vinculo_orfao_instrutor_disciplina.py
python normalizar_posto_graduacao.py
python renumerar_ids_migracao_avaliacoes_eventos.py
```

Cada script:
- Faz backup do `.xlsx` como arquivo irmão antes de escrever (mesmo padrão de
  `renomear_materia_para_disciplina.py`).
- É idempotente — rodar de novo contra um arquivo já corrigido não faz nada (e não falha).
- Imprime no console o que encontrou e o que gravou em `migracao_log`.

## 3. Confirmar que a suíte fecha

```powershell
cd CIAARA-11-v2
pnpm vitest run tests/unidade/*.test.ts
```

Resultado esperado **depois**: `tests 58`, `pass 45`, `fail 0`, `todo 13`. As 13 `todo` continuam
`todo` de propósito — são comportamento de código de épicos futuros (D/F/G), não desta feature
(ver `docs/arquitetura/02-modularizacao.md`).

## 4. Verificar manualmente os pontos que não têm assert automatizado

- **`Instrutor_Disciplina!VIN-000419`**: confirmar que `ID_Grade` está vazio, `ID_Grade_Legado_v1`
  contém `"40 - C-Ap-FR - XVII"`, e `Status` continua `Inativo`.
- **`migracao_log`**: as ~81 linhas novas (ver `data-model.md`) aparecem no fim da aba, com
  `ID_Log` sequencial sem buraco em relação à última linha pré-existente — nenhuma linha antiga
  mudou de conteúdo.
- **`responsaveis_curso`**: se o dado nominal real do Encarregado da Divisão já estiver disponível,
  confirmar que `Nome_Guerra`/`Posto_Graduacao` não são mais `"[A PREENCHER]"`. Se ainda não
  estiver, isso é esperado — é pendência operacional, não falha desta feature (o teste correspondente
  usa `t.diagnostic`, não `assert`, exatamente por isso).

## 5. O que NÃO esperar desta feature

- Nenhuma mudança em backend/frontend — não existe código de aplicação v2.0 ainda.
- Nenhuma publicação do banco como banco Supabase em produção, nem deploy na Vercel — fora de
  escopo (ver `spec.md`, seção Assumptions).
- Os 13 testes `todo` continuam `todo` — não é regressão, é escopo de outro épico.
