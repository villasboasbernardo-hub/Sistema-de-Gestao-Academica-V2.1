# Implementation Plan: Bloco 5 — cadastros novos

**Branch**: `feat/BLOCO-5-cadastros-novos` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

## Summary

Três migrations que **só acrescentam** (M1 cursos e balde, M2 capacitação, M3 acessos), a conversão autorizada da
capacitação dentro da M2, as telas (*Editar curso*, *Sobre o Curso*, catálogo, ficha e formulário do instrutor, lista
de usuários) e as quatro sementes de ponta a ponta da `PEND-019-3`. Um PR só.

## Technical Context

Next.js 16 (App Router), React 19, Supabase (PostgreSQL + Storage + Auth), Vitest, Playwright, pgTAP. **Sem pacote novo.**
Leitura em Server Component; escrita em Server Action com Zod na 1ª linha; URL dona do filtro (`/cursos?estrangeiros=`).

## Constitution Check

| Princípio / regra | Como o plano cumpre |
|---|---|
| Regra 3 (paridade antes de novidade) | autorização nominal registrada na spec §2 |
| Regra 2 (escopo) | custo de curso fica para Bernardo confirmar (spec §2) |
| Regra 4 (nada é apagado) | balde sem policy de `DELETE`; acessos só de acréscimo e imutáveis; texto antigo da capacitação intocado |
| Regra 8 (parâmetro é dado) | o limite de 20 MB mora no balde (`file_size_limit`), lido pelo motor; a tela repete o mesmo número de um módulo só |
| Regra 9 (`lib/dominio/` puro) | conversão da capacitação, "tem capacitação", custo e acessos em módulos puros com teste |
| Regra 9.4 (portão) | as três migrations só acrescentam; a conversão de dado é **autorizada** no pedido, com o rito e o antes × depois |
| Gotcha 10 | `vw_instrutores` recriada **com** `security_invoker = true`; `vw_acessos_por_conta` nasce com ele |
| Gotcha 14 | o PDF não passa por Server Action (teto de 4,5 MB da Vercel); limite no balde e na tela, transporte do Storage mais folgado |
| Gotcha 15 | porteiro de `registrar_acesso` com `auth.uid() is null` → recusa, sem `if not` sobre função que pode dar nulo |
| D-USR-3 | `acessos_de_conta` sem `criado_por`/`editado_por`: não vira dependente em `excluir_conta` |
| DoD 4 | permissões provadas com sessão real em `tests/invariantes/rls/`, conferindo `42501` / `403` / `413` / `415` |

## Decisões de desenho (P-*)

- **P-1** Três migrations, uma por assunto, cada uma com a reversão no cabeçalho.
- **P-2** O envio do PDF é do navegador ao Storage com a sessão de quem envia (`lib/supabase/client.ts`, o cliente que o
  login já usa); a Server Action `registrarCurriculo` só confere que o objeto existe e carimba `cursos.curriculo_pdf_em`.
- **P-3** O download é um Route Handler (`/cursos/[curso]/curriculo`) que gera o link assinado de 60 s e redireciona.
- **P-4** A conversão é uma função do banco (`app.converter_capacitacoes_didaticas()`), chamada pela M2 e idempotente —
  a mesma regra espelhada em `lib/dominio/capacitacao-didatica.ts` para teste.
- **P-5** O acesso é gravado por `public.registrar_acesso()` (`SECURITY DEFINER`, sem parâmetro), chamada de dentro de
  `registrarAcesso` em `lib/acoes/sessao.ts`, depois do carimbo do *último acesso*.

## Project Structure

```
supabase/migrations/2026102…_cursos_estrangeiros_custo_e_curriculo.sql   (M1)
supabase/migrations/2026102…_capacitacao_didatica_em_lista.sql           (M2)
supabase/migrations/2026102…_acessos_de_conta.sql                        (M3)
supabase/tests/143_bloco_5.sql
tests/invariantes/rls/bloco-5.test.ts
lib/dominio/capacitacao-didatica.ts · lib/dominio/acessos-de-conta.ts · lib/formato/moeda.ts · lib/dominio/curriculo-em-pdf.ts
lib/validacao/curso.ts · lib/validacao/instrutor.ts · lib/acoes/curso.ts · lib/acoes/sessao.ts · lib/acoes/instrutor.ts
app/(app)/cursos/[curso]/AbaSobre.tsx · editar/page.tsx · editar/EnvioDoCurriculo.tsx · curriculo/route.ts
app/(app)/cursos/FormularioDeCurso.tsx · FiltrosDoCatalogo.tsx · consulta.ts · lib/navegacao/contrato.ts
app/(app)/instrutores/FormularioDeInstrutor.tsx · [codigo]/FichaEmLeitura.tsx · consulta.ts · opcoes.ts …
app/(app)/admin/usuarios/page.tsx · QuadroDeAcessos.tsx
tests/e2e/bloco-5.spec.ts · panorama-de-teste.ts · ta-fora-do-dsa.spec.ts · dsa-ver.spec.ts
```

## Riscos

| Risco | Mitigação |
|---|---|
| A conversão esbarrar em restrição de `instrutores` | medido: só checagens de campo preenchido, que as linhas cumprem; ensaio na cópia do remoto antes do push |
| O alerta de capacitação mudar de veredito | antes × depois dos 181 na cópia do remoto (SC-003) |
| `excluir_conta` contar acesso como dependente | tabela sem `criado_por`; pgTAP prova que `dependentes_da_conta` não a lê |
| Recriar `vw_instrutores` perder a opção | `with (security_invoker = true)` no comando; a asserção de `010_estrutura.sql` guarda |
| A ponta a ponta inteira não fecha nesta máquina | os arquivos tocados rodam juntos aqui; a suíte inteira, no CI |
