# Contrato — o que a verificação de cor proíbe, com precisão

**Fase 1** · 09/09/2026 · fonte: [research.md §R-2](../research.md) · `FR-001`, `FR-004`, `SC-002`
· documento 23 §9.3

Um contrato existe aqui porque *"nenhuma cor fora do ponto único"* é uma frase, e frase não reprova
build. O que reprova é uma lista fechada do que é proibido, do que é permitido e do que é exceção.

## Onde a regra vale

Arquivos de rota e de componente. **Não** vale no ponto único — é lá que as cores moram.

## Proibido — os dois grupos

| # | Grupo | Forma | Exemplo |
|---|---|---|---|
| **P-1** | Cor escrita à mão | hexadecimal, `rgb`, `rgba`, `hsl`, `hsla`, nome de cor CSS | `#003366`, `rgb(15 23 32 / .06)` |
| **P-2** | Utilitário da paleta padrão do motor de estilo | `<prefixo>-<cor>-<grau>` | `text-gray-500`, `bg-slate-100`, `border-red-400` |

⚠️ **O P-2 é o que costuma escapar, e foi decisão de 09/09/2026 incluí-lo.** `text-gray-500` é uma
cor que **não vem do ponto único**, e o `RF-DS-01` diz que todas as telas obtêm cores de um único
lugar. Permitir a paleta padrão mantém aberta exatamente a porta pela qual a divergência entra —
e ela entra sem ninguém decidir nada, só por conveniência de quem está com pressa.

## Permitido

- Utilitário ligado a **token CIAARA**: `bg-executado-fundo`, `text-conflito-tinta`, `border-borda`.
- Referência a variável de token em CSS: `var(--serie-1)`.
- Utilitário **sem cor**: forma, tamanho, espaçamento, tipografia. `rounded`, `px-2`, `text-sm`.
  ⚠️ É por isso que as cinco telas do Épico 3 **passam** hoje: elas usam só estes.
- `currentColor`, `transparent`, `inherit` — não são cor, são referência.

## Exceção autorizada — uma só

O CSS de impressão, e **apenas** para a normalização preto-no-branco, a configuração de página e a
quebra. Documento 23 §9.3.

⚠️ **Ela ainda não existe** — a rota de impressão é dos épicos 10 e 11. Fica prevista aqui para não
ser negociada às pressas no dia em que aparecer, que é como exceção vira regra.

## A mensagem de erro faz parte do contrato

Barrar sem ensinar produz contorno, não conformidade. A mensagem MUST dizer, nesta ordem:

1. **o que** foi barrado e por qual requisito;
2. **o caminho certo**, com exemplo de token real;
3. **o que fazer se faltar token** — acrescentá-lo no ponto único **nos dois temas** e registrar no
   documento 23 §1.

## Estado medido em 09/09/2026, antes de a regra existir

| Arquivo | Grupo | Ocorrências |
|---|---|---|
| `app/error.tsx` | P-1 | cor literal em atributo de estilo |
| `app/loading.tsx` | P-1 | cor literal em atributo de estilo |
| `app/not-found.tsx` | P-1 | cor literal em atributo de estilo |
| `components/faixa-de-ambiente.tsx` | P-1 | cor literal em atributo de estilo |
| `app/page.tsx` | **P-2** | **10** — não constava de lista nenhuma |
| As 5 telas do Épico 3 | — | **zero**. Não usam cor |

**Conclusão que autoriza a regra a nascer bloqueante**: pagos os cinco, o repositório fica em zero
violações. Não há necessidade de período de aviso, e aviso que nunca vira erro é documentação com
passos extras.
