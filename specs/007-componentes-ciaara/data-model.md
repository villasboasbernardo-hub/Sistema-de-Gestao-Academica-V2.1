# Fase 1 — Modelo: Épico 4, fatia (b)

**10/09/2026** · entrada: [spec.md](./spec.md) e [research.md](./research.md)

## Esta fatia não introduz entidade de dado

Nenhuma tabela, nenhuma migration, nenhuma coluna. O que ela introduz é o **vocabulário de tipos**
que os componentes aceitam — e esses tipos são o contrato de verdade da fatia, porque é por eles que
o Épico 5 vai descobrir se os componentes nasceram genéricos ou moldados a uma tela.

⚠️ **Um princípio rege o modelo inteiro: o componente recebe o MÍNIMO, nunca a linha do banco.**
Isso não é elegância — é consequência direta do recorte de PII do Épico 3. A tabela `instrutores`
guarda CPF, RG, telefone e endereço, e três perfis os leem. Um `SeletorInstrutor` tipado sobre a
linha inteira **convidaria** cada tela a passar o objeto completo para dentro de um componente de
cliente, e o dado pessoal iria parar no pacote enviado ao navegador sem que policy nenhuma fosse
consultada. O tipo mínimo torna isso desconfortável de escrever, que é o melhor que um tipo faz.

---

## 1. Tom — o vocabulário de status

```ts
type Tom =
  | "planejado" | "executado" | "adiantado" | "atrasado" | "conflito"
  | "conformidade" | "nao-letivo" | "reserva" | "inativo";
```

**Origem**: `lib/design/vocabulario.ts`, que a fatia (a) deixou como ponto único e cujo teste de
paridade já exige que os nove existam nos dois temas.

**Regra**: `BadgeStatus` e `AlertaConformidade` aceitam `Tom`, nunca uma cor. ⚠️ **Todo `Tom` chega
acompanhado de rótulo textual** (`FR-025`) — quem não distingue as cores precisa continuar lendo o
sistema.

⚠️ **O tipo não é redeclarado nesta fatia.** Ele é derivado de `STATUS` com `typeof … [number]`, de
modo que acrescentar um status no ponto único **quebre a compilação** de quem não o tratou, em vez
de passar silenciosamente.

---

## 2. InstrutorParaExibir — o mínimo, e só ele

```ts
type InstrutorParaExibir = {
  readonly id: string;
  readonly pg: string;                  // posto/graduação, como vem de config_listas
  readonly especialidade: string | null;
  readonly nomeCompleto: string;
  readonly nomeDeGuerra: string | null;
};
```

**Cinco campos, e nenhum deles é dado pessoal civil.** Nem CPF, nem RG, nem telefone, nem endereço,
nem qualquer coluna que o recorte do Épico 3 protege.

| Campo | Quem usa | Por quê |
|---|---|---|
| `id` | `SeletorInstrutor` | valor da escolha. ⚠️ **Nunca exibido** — `FR-027.3` da spec 006 |
| `pg` | `NomeInstrutor`, `SeletorInstrutor` | abre o formato **e** é de onde sai o peso de antiguidade |
| `especialidade` | `NomeInstrutor` | segundo elemento do formato. Nulo degrada sem espaço duplo |
| `nomeCompleto` | `NomeInstrutor` | **o nome inteiro aparece** — `RF-INSTR-15`, achado P-1 do plano |
| `nomeDeGuerra` | `NomeInstrutor` | não substitui o nome completo: **marca palavras dentro dele** |

⚠️ **A escala de antiguidade NÃO é campo deste tipo.** Ela vem de `config_listas` e chega à função
pura como argumento separado (`RN-ANT-02`, Princípio VII). Um instrutor não carrega o próprio peso.

---

## 3. Coluna — o que a tabela densa aceita

```ts
type Coluna<T> = {
  readonly chave: string;
  readonly titulo: string;
  readonly alinhamento?: "inicio" | "fim" | "centro";
  readonly numerica?: boolean;          // liga o algarismo tabular do @theme
  readonly ordenavel?: boolean;
  readonly celula: (linha: T) => React.ReactNode;
};

type Densidade = "compacta" | "padrao" | "confortavel";   // documento 23 §5
```

**Regra**: a tabela é **genérica em `T`** e não conhece nenhum domínio. `celula` é função de
apresentação: ela formata, nunca calcula regra.

⚠️ **`ordenavel` ordena a apresentação, não a regra.** A ordenação por antiguidade **não** passa por
aqui — ela é da função pura, aplicada antes. Uma tabela que soubesse ordenar por antiguidade seria
um segundo lugar onde a `RN-ANT-01` vive, e a regra tem *Risco: Alto* justamente por ser fácil de
duplicar.

⚠️ **Sem campo de virtualização, e a ausência é a decisão.** `FR-006.1`, 10/09/2026.

---

## 4. Filtro — genérico, sem conhecer instrutor

```ts
type OpcaoDeFiltro = { readonly valor: string; readonly rotulo: string; readonly contagem?: number };

type CampoDeFiltro = {
  readonly chave: string;
  readonly rotulo: string;
  readonly tipo: "escolha" | "escolha-multipla" | "texto" | "intervalo";
  readonly opcoes?: readonly OpcaoDeFiltro[];
};

type EstadoDeFiltro = Readonly<Record<string, readonly string[]>>;
```

**Regra**: o componente **recebe e devolve** `EstadoDeFiltro` por propriedade, e **não sabe onde ele
mora** (premissa 3 da spec — a URL é da fatia (c)).

⚠️ **A filtragem cruzada é o `contagem`.** Cada filtro opera sobre o resultado do anterior, e é por
isso que a contagem de opções muda conforme a escolha. **Quem recalcula é quem chama**; o componente
exibe o número que recebeu. Se ele recalculasse, teria de conhecer o dado — e conheceria instrutor.

---

## 5. Série de gráfico — onde a forma entra

```ts
type PontoDeSerie = { readonly nome: string; readonly valor: number };

type Serie = {
  readonly chave: string;
  readonly rotulo: string;                 // sempre presente — vira o rótulo direto
  readonly forma: FormaDeMarcador;         // o que distingue quando a cor some
  readonly pontos: readonly PontoDeSerie[];
};

type FormaDeMarcador = "circulo" | "quadrado" | "losango" | "triangulo" | "cruz" | "estrela";
```

**Regra**: `rotulo` e `forma` são **obrigatórios**, não opcionais. É a `FR-018` expressa no tipo:
uma série sem forma não compila, então não existe gráfico que dependa só de cor.

⚠️ **Seis formas para oito séries, e isso é suficiente.** O documento 23 §7 limita o gráfico a
**seis séries** — *"acima disso vira tabela"*. A sétima e a oitava cor existem para categorias
dentro de **uma** série, onde o distintivo é o rótulo do eixo, não o marcador.

⚠️ **`valor` é número pronto.** Agregação é de quem chama (`FR-016`, documento 24). O componente que
soma é o componente que precisa saber o que está somando.

---

## 6. Teto normativo — o emblema que avisa e não impede

```ts
type Teto = {
  readonly rotulo: string;       // "AEC", "TAD", "TR" — vocabulário intraduzível
  readonly limite: number;       // vem de config_parametros, NUNCA de constante
  readonly medido: number;
  readonly explicacao: string;   // o texto que aparece ao apontar
};
```

⚠️ **`limite` é dado, nunca constante** (`RNF-NORM-08`, Princípio VII). Os tetos AEC 10%, TAD 5% e
TR 10% vivem em `config_parametros`, e um número escrito dentro do componente passaria em todo teste
desta fatia enquanto viola o princípio.

⚠️ **O componente compara e sinaliza; ele não decide se houve estouro.** Quem avalia o teto é função
pura de domínio (`RN-EVT-01`), e o resultado chega pronto. **E o emblema nunca bloqueia**
(`RN-DEG-02`, regra 6 do contrato do projeto).

---

## 7. O que NENHUM tipo desta fatia contém

| Ausente | Por quê |
|---|---|
| Cliente de banco, `Database`, linha de tabela | `FR-019`, e o `SC-007` conta zero |
| Qualquer campo de identificação civil ou residência | recorte de PII do Épico 3 — o componente não tem por que vê-los |
| Resultado de regra `RN-` calculado no componente | `FR-020`: o componente exibe, o domínio decide |
| Cor, em qualquer forma | `FR-022`, e a regra de lint reprova |
| Endereço de onde o estado mora | premissa 3 — é da fatia (c) |
