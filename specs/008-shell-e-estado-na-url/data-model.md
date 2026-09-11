# Fase 1 — Modelo: Épico 4, fatia (c)

**11/09/2026** · entrada: [spec.md](./spec.md) e [research.md](./research.md)

## Esta fatia não introduz entidade de dado

Nenhuma tabela, nenhuma migration, nenhuma coluna. O que ela introduz é o **contrato de
parâmetros** — e ele é o modelo de verdade desta fatia, porque é por ele que toda tela futura vai
declarar o que aceita na URL.

⚠️ **Um princípio rege o modelo inteiro: o parâmetro fora do contrato não compila.** Isso não é
elegância. É a diferença entre uma tabela num documento, que hoje ninguém é obrigado a seguir, e uma
regra que o motor de build impõe. A tabela existe desde a Fase 2 e **nenhuma tela foi obrigada a
segui-la** — porque nenhum requisito a citava.

---

## 1. Parâmetro — a unidade do contrato

```ts
type Historico = "empilha" | "substitui";

type Parametro<T> = {
  readonly nome: string;              // snake_case curto, como aparece na URL
  readonly padrao: T;                 // no padrão, NÃO aparece na URL
  readonly historico: Historico;      // ver a política em contracts/parametros.md
  readonly avisaServidor: boolean;    // alimenta consulta? então sim
  readonly limiteDeFrequenciaMs?: number;  // só onde `historico` é "substitui" e há digitação
};
```

| Campo | Por que existe |
|---|---|
| `padrao` | o `FR-002` manda o valor padrão sumir da URL; sem o padrão declarado, não há como saber quando sumir |
| `historico` | é *"a única regra que se erra na prática"*, segundo o documento 25 §1.6 |
| `avisaServidor` | ⚠️ **é o campo cujo erro é silencioso**: desligado num filtro, a URL fica certa e a consulta fica velha |
| `limiteDeFrequenciaMs` | o número existia só num exemplo de código; o `FR-005` o traz para o contrato |

⚠️ **`historico` usa palavras do domínio, não o nome técnico da operação.** "Empilha" e "substitui"
dizem o que acontece com o botão voltar; o nome técnico diz o que acontece com a pilha do roteador,
que é a mesma coisa dita para outra pessoa.

---

## 2. Contrato de rota

```ts
type ContratoDeRota = {
  readonly rota: string;                                  // "/inicio"
  readonly parametros: Readonly<Record<string, Parametro<unknown>>>;
  readonly origem: string;                                // o RF- que justifica a rota existir
};
```

**Regra**: uma rota declara **todos** os parâmetros que aceita. O que não está declarado é ignorado
(`FR-007`), e o que está declarado com valor inválido degrada para o padrão (`FR-006`).

⚠️ **`origem` não é enfeite.** Ele é o Princípio VIII no tipo: um parâmetro que ninguém consegue
rastrear até um requisito é um parâmetro que alguém acrescentou sem decidir.

---

## 3. Valor de parâmetro — os quatro tipos, e só eles

```ts
type TipoDeParametro = "texto" | "inteiro" | "escolha" | "lista";
```

| Tipo | Degradação quando inválido | Exemplo |
|---|---|---|
| `texto` | usa o padrão | `busca` |
| `inteiro` | fora da faixa → padrão | `semana`, `ano` |
| `escolha` | fora do conjunto → padrão | `modalidade`, `aba` |
| `lista` | itens inválidos saem; a lista sobrevive | `secoes` |

⚠️ **`lista` degrada por item, não por lista.** Um valor podre no meio de cinco não pode apagar os
outros quatro — seria transformar um erro de digitação em perda de recorte inteiro.

⚠️ **Não há tipo "livre".** Todo parâmetro cai num dos quatro, e é isso que permite validar sem que
cada tela escolha a própria tolerância.

---

## 4. Entrada de menu

```ts
type EntradaDeMenu = {
  readonly rotulo: string;       // exatamente como na v2.0 — o RF-NAV-02 proíbe renomear
  readonly rota: string;
  readonly permissao?: string;   // quando ausente, a entrada é visível a todo autenticado
};
```

⚠️ **`rotulo` é dado, e é dado que NÃO se ajusta.** O `RF-NAV-02` é **[PRESERVADO]** e proíbe
renomear entradas. Um rótulo "melhorado" aqui é uma violação de paridade que ninguém percebe até
alguém procurar a entrada antiga e não achar.

⚠️ **`permissao` esconde, não protege.** Quem decide o que a pessoa alcança é a RLS (Princípio XI).
Esconder a entrada é cortesia de interface; o acesso é negado pelo banco, ainda que alguém digite a
URL.

---

## 5. Destino de retorno após autenticação

```ts
type DestinoDeRetorno =
  | { readonly aceito: true; readonly caminho: string }
  | { readonly aceito: false; readonly motivo: "externo" | "malformado" };
```

⚠️ **É o único lugar desta fatia que RECUSA em vez de degradar**, e a distinção é deliberada. Os
quatro caminhos de degradação tratam acidente: link velho, parâmetro truncado, dado que ainda não
existe. Este trata **intenção**: quem escreveu o destino não é quem o abriu.

⚠️ **O resultado é uma união discriminada, e não uma cadeia com valor de reserva**, para que quem
chama seja obrigado a tratar a recusa. Uma função que devolvesse `"/"` em silêncio esconderia que
alguém tentou.

⚠️ **A decisão é por ORIGEM, não por padrão de texto** ([research §R-5](./research.md)). A guarda que
existe hoje na `main` procura o formato da cadeia, e um endereço relativo ao protocolo passa por ela.

---

## 6. O que NENHUM tipo desta fatia contém

| Ausente | Por quê |
|---|---|
| Identificador técnico como valor de parâmetro | `FR-003`: a URL carrega a chave de negócio legível |
| Parâmetro de paginação | `FR-037.1`, recusa declarada de 11/09/2026 |
| Perfil, permissões ou escopo do usuário | é estado de servidor, lido por requisição — nunca da URL |
| Rascunho de formulário, seleção múltipla | é estado efêmero; não entra nesta fatia e não vai à URL |
| Contêiner de contexto como fonte de verdade | `FR-011.1` — é o `AppState` voltando sem instalar nada |
| Qualquer valor de cor | `FR-037`, e a regra de lint reprova |
