# Plano — spec 032 (Bloco 17)

## Contexto técnico

Next.js 16 / React 19 / Supabase, como sempre. **Sem banco**: nenhuma migration, nenhuma view, nenhum tipo gerado muda —
os três números novos já eram calculados e os dias bloqueados se leem de duas tabelas que já existem
(`dias_parados`, `atividades_nao_letivas`), com as policies de leitura de sempre.

## Constituição

- **Regra 1 (documento 04):** a `RN-SALDO-01` entra com **autorização nominal** no pedido; só no `.md`.
- **Regra 6 / `RN-DEG-02`:** a situação é alerta, nunca bloqueio.
- **Regra 8:** o fator *× 5* é a definição de «uma semana de aula» dada pela regra (dias úteis de segunda a sexta), não um
  parâmetro normativo; o TA/dia continua vindo do regime (dado).
- **Regra 9:** a decisão mora em `lib/dominio/andamento-da-turma.ts`, TS puro; as telas repassam (`SC-006` da spec 012).

## Desenho

1. `lib/dominio/andamento-da-turma.ts`: `SituacaoDoSaldo`, `situacaoDoSaldo`, `ROTULO_…`, `TOM_…`, `FRASE_…`,
   `DiaBloqueado`, `datasBloqueadasDaTurma`; `Andamento` ganha `semanaDeAula` e `situacaoDoSaldo`.
2. `app/(app)/turmas/dias-bloqueados.ts`: `lerDiasBloqueadosAFrente` (duas consultas, uma para todas as turmas).
3. Ficha, `/turmas` (`comAndamento`), Início e Avisos (`montarPanorama`) somam as datas bloqueadas às do calendário.
4. `CardKpi` ganha `compacto` e `tom` (as classes do tom vêm do mapa único de `BadgeStatus`).
5. `IndicadoresDaTurma`: cartão da situação, os três novos, o saldo tingido; a situação do saldo em `/turmas` e no Início.
6. Abas: `AbasDaTurma` (+APOINST, +Palestras), `AbasDeAtividades` (+Palestras, `comCalendario`), `EmBreve` único; o
   contrato de parâmetros com as opções novas.
7. Atividades: `.neq("categoria_normativa", "Estudo_Individual")` na lista e no universo;
   `CATEGORIAS_DA_LISTA_DE_ATIVIDADES` no filtro e no contrato.

## Verificação

Vitest (domínio e guardas), tipos, lint, build, pgTAP e RLS locais; ponta a ponta dos arquivos afetados com 1 processo
(`andamento`, `andamento-ate-hoje`, `inicio`, `atividades-filtro-de-data`, `turmas-lista`); a suíte inteira no CI.
