# Como validar a fatia (c)

**Fase 1** · 11/09/2026 · complementa o [plano](./plan.md) e os [contratos](./contracts/)

## O que torna esta fatia diferente de validar

**Ela não toca banco** — nenhuma migration, nenhuma policy, nenhuma coluna. Mas, ao contrário da
fatia (b), **quase tudo aqui só se prova no navegador**: histórico, link direto, recarga e destino
após o login são comportamento de navegação, e não existem fora dele.

⚠️ **E há uma parte que se prova com o olho, e só com ele:** o menu ser o mesmo da v2.0. Nenhum teste
sabe qual era o rótulo antigo.

## Pré-requisitos

| Item | Como conferir |
|---|---|
| Ramo desta fatia | `git branch --show-current` → `feat/EPICO-4c-shell-e-estado-na-url` |
| Fatia (b) presente | `/estilo` abre com os dezesseis componentes |
| Stack local de pé | `pnpm db:start`, e o convite do Épico 3 continua passando |
| Duas contas com escopos diferentes | necessárias para o passo 4 |

## Passo 1 — A correção de segurança, antes de tudo

```
pnpm test:e2e tests/e2e/destino-do-login.spec.ts
```

⚠️ **Este passo vem primeiro porque é defeito em código já mesclado**, não funcionalidade nova
desta fatia ([research §R-5](./research.md)).

À mão, com o sistema no ar:

1. Sair da sessão.
2. Abrir `/login?destino=//example.com` e entrar.
3. **Esperado:** a pessoa termina na tela inicial do sistema, **e não em outro domínio**.
4. Repetir com a variante de contrabarra e com um endereço absoluto.

⚠️ **O que se observa é ONDE O NAVEGADOR PAROU**, não o que a função devolveu. Uma asserção sobre a
condição passaria com a guarda atual, que é justamente a que tem o defeito.

## Passo 2 — Os quatro comportamentos, com as mãos

Em `/inicio`, autenticado.

| Faça | Esperado |
|---|---|
| Aplicar um recorte de classificação | o parâmetro aparece na URL |
| Voltar o recorte ao valor padrão | **o parâmetro some da URL** |
| Aplicar classificação e modalidade, copiar a URL, abrir em aba nova | a mesma tela, no mesmo recorte, **sem passar por outra** |
| Trocar o recorte três vezes e usar voltar | desfaz **um passo por vez** |
| Recarregar | o recorte permanece |
| Digitar oito letras numa busca e usar voltar | **uma** entrada de histórico, não oito |

⚠️ **E o que mais se erra:** depois de trocar o filtro, **o número na tela mudou?** Se a URL muda e o
conteúdo não, o aviso ao servidor está desligado — URL certa, consulta velha
([contrato de parâmetros](./contracts/parametros.md)).

## Passo 3 — A URL como entrada hostil

Editar a barra de endereço à mão, em `/inicio`:

| URL | Esperado |
|---|---|
| `?classificacao=inexistente` | abre com o padrão, **e `modalidade` é preservada** |
| `?parametro_que_nao_existe=1` | ignorado, a tela abre |
| `?classificacao=<carga de marcação>` | nada é interpretado; a tela abre |
| tudo inválido de uma vez | a tela abre, **sem exceção não tratada** |

⚠️ **Nenhum destes recusa.** Link velho é acidente, e recusá-lo transformaria um favorito antigo numa
tela de erro. **O único que recusa é o destino de retorno**, e é o passo 1.

## Passo 4 — O link que não vaza

Com **duas contas de escopos diferentes**:

1. Na conta A, aplicar um recorte que só ela alcança, e copiar a URL.
2. Abrir a mesma URL na conta B.
3. **Esperado:** a tela abre e diz *"você não vê"* — **não** *"não há"*, e **não** o dado.

⚠️ **Quem nega é o banco**, não a tela (Princípio XI). Se a conta B vir o dado, o problema não é
desta fatia: é de RLS.

## Passo 5 — O menu, contra a v2.0

⚠️ **É o passo que só Bernardo faz**, e sem ele o `FR-017` não é verificável.

Abrir a v2.0 em produção ao lado do preview desta fatia e conferir, entrada por entrada:

- os **mesmos rótulos**, sem melhorias de redação;
- a **mesma ordem**;
- Avaliações e Relatório **ausentes** do menu, alcançados pela página do curso (`RF-CURSO-02`).

O rascunho a conferir está em [contracts/casca.md](./contracts/casca.md), com as três perguntas que
ele não tem como responder sozinho.

## Passo 6 — A tabela densa não quebrou

```
pnpm test:e2e tests/e2e/vitrine.spec.ts
pnpm test:unidade
```

⚠️ **A prova de não regressão é a suíte da fatia (b) passar SEM ALTERAÇÃO.** A vitrine monta a tabela
**sem** as propriedades novas. Se algum teste daquela fatia precisou mudar, a propriedade não era
opcional de verdade (`SC-010`).

## Passo 7 — O portão inteiro

```
pnpm verificar:tudo
```

Precisa sair **0**, e precisa dar o **mesmo veredito que o CI** sobre o mesmo commit (`SC-015`).

⚠️ **Verde aqui e vermelho no CI é defeito da verificação, não azar.** Aconteceu duas vezes na fatia
(b): uma suíte que falava com o banco no bloco sem banco, e seletores por papel que casavam com dois
elementos. Instabilidade conta como vermelho.

## O que NÃO se valida aqui

| Fora | Onde se valida |
|---|---|
| Os parâmetros das rotas dos Épicos 5 a 9 | com as telas deles — o contrato os declara desde já |
| As telas de domínio | Épicos 5 a 13 |
| Rotas de impressão | Épicos 10 e 11 |
| A carga das 572 Unidades de Ensino | herdada do Épico 2, continua pendente |

⚠️ **A validação que mais importa não acontece nesta fatia.** É o Épico 5 declarar os parâmetros da
tela de instrutores **seguindo o guia**, sem inventar nenhum fora do contrato. Enquanto isso não
acontecer, "contrato" é uma intenção verificada só por quem a escreveu — do mesmo jeito que
"genérico" era na fatia (b).
