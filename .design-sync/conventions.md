# CIAARA-11 — como construir com este design system

Sistema de gestão acadêmica da Marinha do Brasil (CIAARA). **Tudo em português do Brasil** — rótulos,
mensagens, dados de exemplo. Densidade antes de beleza: é sistema de gestão, com tabelas grandes.

## Montagem

- Os componentes vêm de `window.CIAARA` (ex.: `const { Button, Card, TabelaDensa } = window.CIAARA`).
- **Não há provider obrigatório**: as cores e a fonte vêm de `styles.css` (tokens em `:root`, fonte
  Rawline em `fonts/`). Tema claro por padrão; o **tema escuro** é a classe `dark` num ancestral
  (`<div className="dark">…</div>`). `ProvedorDeTema` só é preciso para alternar o tema em tempo real.
- `Tooltip` já embute o `TooltipProvider`; não é preciso envolvê-lo.

## Estilo: utilitários do Tailwind com os tokens do CIAARA

Use **só** estas famílias (outras cores da paleta padrão do Tailwind não pertencem ao sistema):

| Papel                           | Classes                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fundo e superfície              | `bg-fundo` (página) · `bg-superficie` (cartão, tabela) · `bg-superficie-2` (cabeçalho de tabela, régua)                                                                               |
| Marca                           | `bg-marca` · `text-marca` · `bg-marca-suave` (realce, item escolhido)                                                                                                                 |
| Texto                           | `text-texto` (valor) · `text-texto-suave` (dado secundário) · `text-texto-tenue` (rótulo, dica)                                                                                       |
| Borda e raio                    | `border-borda` · `border-borda-forte` (campo) · `rounded-ciaara` · `rounded-ciaara-sm` · `rounded-ciaara-lg` · `shadow-ciaara-1`                                                      |
| Status (trio fundo/tinta/borda) | `bg-<s>-fundo text-<s>-tinta border-<s>-borda`, com `<s>` = `planejado` · `executado` · `adiantado` · `atrasado` · `conflito` · `conformidade` · `nao-letivo` · `reserva` · `inativo` |
| Tipografia                      | `font-sans` (Rawline) · `text-2xs` (11px, o mínimo) · `text-xs` · `text-sm` (corpo de 14px) · `tabular-nums` para números                                                             |

Fora dessa lista, use a variável direto: `style={{ color: "var(--texto-suave)" }}` — `--fundo`,
`--superficie`, `--superficie-2`, `--marca`, `--marca-suave`, `--texto`, `--texto-suave`,
`--texto-tenue`, `--borda`, `--borda-forte`, `--foco`, e `--<s>-fundo/-tinta/-borda` dos status.

**Status nunca só pela cor**: use `BadgeStatus` (`tom` + `rotulo`) ou escreva a palavra junto.

## Onde está a verdade

- `styles.css` e o que ele importa (`_ds_bundle.css`, `fonts/fonts.css`): os tokens e os utilitários
  existentes. Classe que não está ali **não tem estilo**.
- `components/<grupo>/<Nome>/<Nome>.prompt.md` e `<Nome>.d.ts`: a API de cada componente. Os do
  grupo `ciaara` são os próprios do sistema (TabelaDensa, GradeDsa, CardKpi, BadgeStatus,
  BarraDeProgresso, EstadoVazio, SeletorTurma, SeletorInstrutor, FiltroAvancado, DialogoConfirmacao…);
  prefira-os aos genéricos — ex.: lista de dados é `TabelaDensa`, não `Table` montada à mão.

## Exemplo

```tsx
const { Card, CardHeader, CardTitle, CardContent, BadgeStatus, Button, TabelaDensa } =
  window.CIAARA;

<Card className="max-w-3xl">
  <CardHeader>
    <CardTitle>C-Ap-HN 2026</CardTitle>
  </CardHeader>
  <CardContent className="flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <BadgeStatus tom="atrasado" rotulo="Em atraso" />
      <span className="text-texto-suave text-xs tabular-nums">518 de 1.165 TA executados</span>
      <Button size="sm" variant="outline" className="ml-auto">
        Abrir o DSA
      </Button>
    </div>
    <TabelaDensa
      linhas={disciplinas}
      colunas={[
        { chave: "codigo", titulo: "Cód.", celula: (l) => l.codigo },
        { chave: "nome", titulo: "Disciplina", celula: (l) => l.nome },
        { chave: "ch", titulo: "CH prevista", numerica: true, celula: (l) => l.prevista },
      ]}
      chaveLinha={(l) => l.id}
      rotulo="Disciplinas da turma"
    />
  </CardContent>
</Card>;
```
