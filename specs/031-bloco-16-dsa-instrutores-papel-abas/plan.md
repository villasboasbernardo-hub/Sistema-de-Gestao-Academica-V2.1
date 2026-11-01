# Plano — spec 031 (Bloco 16)

**Ramo:** `fix/BLOCO-16-dsa-instrutores-papel-abas`, a partir da `main` `8504136`. **Um PR.** O papel do DSA muda
(itens 5, 6, 7 e 8): o merge espera a virada de semana.

## Contexto técnico

Next.js 16 (App Router), React 19, TypeScript `strict`, Supabase (PostgreSQL), Tailwind v4, shadcn/Radix. Nenhum pacote
novo. Regras do `CLAUDE.md`: `lib/dominio/` puro; Server Action com Zod na primeira linha; estado na URL; só tokens.

## Constituição (os 11 princípios) — conferência

- **Regra de negócio fora da UI:** a habilitação dos adicionais é conferida na Server Action (RD-1); o banco recusa
  inexistente, repetido e o titular (gatilho); as frases moram em `lib/dominio/dsa/instrutores-adicionais.ts`.
- **Nada é apagado:** nenhuma exclusão nova; a coluna nova nasce vazia.
- **Documento 04:** a `RN-INST-04` recebe nota datada por autorização nominal do pedido (*"Registrar as regras novas no
  documento 04"*); só o `.md`.
- **Degradação segura:** a aba *Avaliações* devolve o aviso da leitura e a tabela vazia, nunca exceção; semana sem data
  fica *—*.

## Desenho

| Item | Onde | Como |
|---|---|---|
| 1 | `FormularioDeLancamento.tsx`, `botao-de-icone.tsx` | `BotaoDeIcone` `lancar` (novo, `SquarePlus`) e `cancelar`/`fechar`, no grupo `acoes-do-formulario`, canto inferior esquerdo. |
| 2 | `FormularioDeLancamento.tsx`, `AcoesDoBloco.tsx` | Rótulo *Início*. |
| 3b | os dois formulários | Técnica só na aula; o lançamento da avaliação manda `tecnica: null`; a edição não a toca. |
| 3a | — | ⛔ Parado (spec §3): nada muda. |
| 4 | os dois formulários, `lib/acoes/dsa.ts`, `PainelDeLancamento.tsx`, `page.tsx` | Sem campo de responsável no EI; a ação grava nulo (lançar) e ignora (editar); o cartão sabe que é EI por `idsDeEstudoIndividual`. |
| 5 | `rotulos.ts`, `grade.ts`, `publicacao.ts` | `ROTULO_DO_APOIO = "Apoio Individualizado"`; `conteudoComparavel` lê o texto antigo como o novo (D-6). |
| 6 | migration `20261030224204`, `lib/validacao/dsa.ts`, `lib/acoes/dsa.ts`, `lib/dominio/dsa/instrutores-adicionais.ts`, `InstrutoresAdicionais.tsx`, `leitura.ts`, `consulta.ts`, `grade.ts` | Coluna `instrutores_adicionais uuid[]` + gatilho; `vw_instrutor_carga_anual` com o ramo dos adicionais; Zod; porteiro na ação (lançar e editar, par final); seletor canônico em lista; nomes no papel antes do texto livre antigo. |
| 7 | `publicacao.ts` (`rotuloDoAlt`), `DocumentoDoDsa.tsx` | `null` → *PRÉVIA*, `0` → *ORIGINAL*, `N` → *ALT N*; padrão do papel = a prévia. |
| 8 | `DocumentoDoDsa.tsx`, `documento.css`, `grade-dsa.tsx` | O pé do cartão = instrutor(es) · local; a linha de dados = TA · T/E. |
| 9 | `contrato.ts`, `AbasDeAcompanhamento.tsx`, `AcompanhamentoDeAvaliacoes.tsx`, `lib/dominio/dsa/acompanhamento-de-avaliacoes.ts`, `page.tsx` | `?acompanhamento=` (escolha, empilha, avisa o servidor); a de avaliações lê `lerAvaliacoesDaTurma` com a referência no fim da semana; APOINST e Palestras *Em breve*. |

## Banco

Uma migration que **só acrescenta** (regra 9.4, emenda de 19/10/2026), e a recriação de `vw_instrutor_carga_anual`
autorizada pelo pedido **com efeito zero medido** na cópia `remoto-20261030-194246.sql`: 182 linhas e o mesmo md5 antes
e depois. Reversão em `reversao.sql` (provada dentro de transação: o pgTAP 154 reprova sem ela). Rito do remoto: backup
`--somente-copia`, dry-run só com ela, `db push --linked`, conferência só de leitura.

## Testes

- Unidade: `instrutores-adicionais.test.ts`, `bloco-16-papel.test.ts`, `acompanhamento-de-avaliacoes.test.ts` (vistos
  reprovar antes).
- pgTAP: `154_instrutores_adicionais_da_aula.sql` (reprova sem a migration; o caso que discrimina é o adicional com 3 TA).
- Ponta a ponta: `bloco-16-dsa.spec.ts` (formulário, adicionais por clique e no banco, o pé do cartão, as abas), e os
  arquivos que leem o ALT, o Apoio e o *Entendi* ajustados.
