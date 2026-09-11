/**
 * As amostras interativas da vitrine (`FR-027`, `SC-001`).
 *
 * ⚠️ ELAS VIVEM AQUI, E NÃO EM `page.tsx`, POR CAUSA DA FRONTEIRA. Metade dos componentes desta
 * fatia tem estado — filtro escolhido, instrutor selecionado, posição do teclado — e mostrar isso
 * exige `"use client"`. Escrevê-lo em `page.tsx` contaminaria a página inteira, inclusive a leitura
 * do ponto único, que é feita no servidor. Marcador de cliente **só em folha**, e esta é a folha.
 *
 * ⚠️ A VITRINE NÃO É ENFEITE: ela é a única prova executável de que um componente existe. O teste
 * de `tests/e2e/vitrine.spec.ts` exige que TODO componente de `components/ciaara/` e
 * `components/graficos/` apareça aqui — componente sem amostra é componente que ninguém nota
 * quando quebra.
 */
"use client";

import * as React from "react";
import { useQueryState } from "nuqs";

import { AlertaConformidade } from "@/components/ciaara/alerta-conformidade";
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BadgeTeto, type Teto } from "@/components/ciaara/badge-teto";
import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";
import { CardKpi } from "@/components/ciaara/card-kpi";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { EsqueletoTabela } from "@/components/ciaara/esqueleto-tabela";
import {
  FiltroAvancado,
  type CampoDeFiltro,
  type EstadoDeFiltro,
} from "@/components/ciaara/filtro-avancado";
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { SeletorTurma } from "@/components/ciaara/seletor-turma";
import { TabelaDensa, type Coluna, type Densidade } from "@/components/ciaara/tabela-densa";
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import { GraficoLinha } from "@/components/graficos/grafico-linha";
import { GraficoPizza } from "@/components/graficos/grafico-pizza";
import type { Serie } from "@/components/graficos/tipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { STATUS } from "@/lib/design/vocabulario";

/**
 * ⚠️ OS CAMPOS DE EXEMPLO NÃO FALAM DE INSTRUTOR, e a escolha é deliberada: o `FiltroAvancado` é
 * genérico, e uma amostra que o exercitasse com vocabulário de instrutor esconderia justamente a
 * propriedade que o `FR-007` cobra. Aqui ele filtra fruta.
 */
const CAMPOS_DE_EXEMPLO: readonly CampoDeFiltro[] = [
  {
    chave: "categoria",
    rotulo: "Categoria",
    tipo: "escolha",
    opcoes: [
      { valor: "a", rotulo: "Categoria A", contagem: 12 },
      { valor: "b", rotulo: "Categoria B", contagem: 7 },
    ],
  },
  {
    chave: "etiquetas",
    rotulo: "Etiquetas",
    tipo: "escolha-multipla",
    opcoes: [
      { valor: "x", rotulo: "Etiqueta X", contagem: 4 },
      { valor: "y", rotulo: "Etiqueta Y", contagem: 9 },
      { valor: "z", rotulo: "Etiqueta Z", contagem: 0 },
    ],
  },
  { chave: "busca", rotulo: "Texto livre", tipo: "texto" },
  { chave: "periodo", rotulo: "Período", tipo: "intervalo" },
];

export function AmostraIndicadores() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CardKpi rotulo="Turmas ativas" valor={29} />
      <CardKpi rotulo="Carga horária total" valor="1.284" unidade="h" />
      <CardKpi
        rotulo="Aulas executadas"
        valor="87%"
        variacao={{ texto: "+4 p.p. no mês", favoravel: true }}
      />
      <CardKpi
        rotulo="Lançamentos atrasados"
        valor={13}
        variacao={{ texto: "+3 na semana", favoravel: false }}
      />
    </div>
  );
}

export function AmostraEmblemasDeStatus() {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS.map((s) => (
        <BadgeStatus key={s} tom={s} rotulo={s} />
      ))}
    </div>
  );
}

export function AmostraCampo() {
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CampoObrigatorio para="amostra-nome" rotulo="Nome do curso" obrigatorio />
        <Input {...propsDoControle("amostra-nome", true)} placeholder="C-Ap-HN" />
      </div>
      <div className="flex flex-col gap-1">
        <CampoObrigatorio para="amostra-obs" rotulo="Observação" />
        <Input {...propsDoControle("amostra-obs", false)} placeholder="opcional" />
      </div>
    </div>
  );
}

export function AmostraEsqueleto() {
  return <EsqueletoTabela linhas={4} colunas={5} />;
}

export function AmostraEstadoVazio() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <EstadoVazio motivo="sem-dado" />
      <EstadoVazio motivo="sem-permissao" acao={<Button size="sm">Solicitar acesso</Button>} />
    </div>
  );
}

export function AmostraDialogoConfirmacao() {
  const [feito, definirFeito] = React.useState(false);
  return (
    <div className="flex items-center gap-3">
      <DialogoConfirmacao
        titulo="Desativar este instrutor?"
        consequencia="Ele deixa de aparecer nas listagens e nas próximas LIQ. Nada é apagado: a desativação é reversível."
        rotuloConfirmar="Desativar"
        aoConfirmar={() => definirFeito(true)}
      >
        <Button variant="destructive" size="sm">
          Desativar
        </Button>
      </DialogoConfirmacao>
      <span className="text-texto-suave text-sm">
        {feito ? "Confirmado nesta amostra." : "Nada foi feito ainda."}
      </span>
    </div>
  );
}

export function AmostraFiltroAvancado() {
  const [estado, definirEstado] = React.useState<EstadoDeFiltro>({});
  return (
    <div className="flex flex-col gap-2">
      <FiltroAvancado campos={CAMPOS_DE_EXEMPLO} estado={estado} aoMudar={definirEstado} />
      <p className="text-texto-suave text-xs">
        Estado devolvido por propriedade: <code>{JSON.stringify(estado)}</code>. Levá-lo para a URL
        é da fatia (c) — o componente não sabe onde ele mora.
      </p>
    </div>
  );
}

/**
 * ⚠️ A ESCALA VEM DE `config_listas` NO SISTEMA DE VERDADE. Aqui ela é insumo da amostra, e está
 * escrita nesta folha de vitrine — não dentro do componente nem dentro do domínio, que é onde ela
 * violaria o Princípio VII. A vitrine faz o papel da Server Action que a carregaria.
 */
const ESCALA_DA_AMOSTRA: EscalaDeAntiguidade = {
  CMG: 1,
  CF: 2,
  CC: 3,
  CT: 4,
  "1°Ten": 5,
  SO: 7,
  "1°SG": 8,
  "3°SG": 10,
  MN: 12,
};

/**
 * ⚠️ ESTA LISTA ESTÁ DESORDENADA DE PROPÓSITO, e é a amostra mais importante da vitrine. O
 * `FR-011.1` manda o seletor **ignorar a ordem de chegada**: se o que aparecer na tela for esta
 * ordem, o requisito não foi cumprido — e ninguém precisa de teste para ver isso, basta olhar.
 *
 * ⚠️ O ÚLTIMO TEM UM P/G QUE A ESCALA NÃO CONHECE. Ele vai para o fim **com aviso**, e **não some**
 * (`RN-DEG-01`). Some da lista é o defeito que ninguém reporta, porque quem procura conclui que o
 * cadastro não existe.
 */
const INSTRUTORES_DESORDENADOS: readonly InstrutorParaExibir[] = [
  {
    id: "i-1",
    pg: "MN",
    especialidade: null,
    nomeCompleto: "Zeferino Alves da Costa",
    nomeDeGuerra: "Zeferino",
  },
  {
    id: "i-2",
    pg: "CT",
    especialidade: "EF",
    nomeCompleto: "João da Silva Pereira",
    nomeDeGuerra: "Silva",
  },
  {
    id: "i-3",
    pg: "CMG",
    especialidade: "AA",
    nomeCompleto: "Ana Beatriz de Almeida",
    nomeDeGuerra: "Almeida",
  },
  {
    id: "i-4",
    pg: "1°SG",
    especialidade: "MO",
    nomeCompleto: "Guilherme Pires Black Pereira",
    nomeDeGuerra: "Guilherme Black",
  },
  {
    id: "i-5",
    pg: "CT",
    especialidade: "EF",
    nomeCompleto: "Carlos Eduardo Barbosa",
    nomeDeGuerra: null,
  },
  {
    id: "i-6",
    pg: "Almirante",
    especialidade: null,
    nomeCompleto: "Posto Fora da Escala",
    nomeDeGuerra: null,
  },
];

const TURMAS_DA_AMOSTRA = [
  { id: "TUR-000001", rotulo: "C-Ap-HN 2026/1" },
  { id: "TUR-000002", rotulo: "C-Ap-FR 2026/1" },
  { id: "TUR-000003", rotulo: "C-Esp-ALH 2026/2" },
];

export function AmostraNomeInstrutor() {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {INSTRUTORES_DESORDENADOS.map((i) => (
        <li key={i.id}>
          <NomeInstrutor instrutor={i} />
        </li>
      ))}
    </ul>
  );
}

export function AmostraSeletorInstrutor() {
  const [escolhido, definirEscolhido] = React.useState<string | undefined>(undefined);
  return (
    <div className="flex max-w-md flex-col gap-2">
      <SeletorInstrutor
        instrutores={INSTRUTORES_DESORDENADOS}
        escala={ESCALA_DA_AMOSTRA}
        {...(escolhido === undefined ? {} : { valor: escolhido })}
        aoMudar={definirEscolhido}
      />
      <p className="text-texto-suave text-xs">
        A lista entregue está <strong>desordenada</strong> e o último tem posto fora da escala. Ela
        aparece em antiguidade crescente, e o desconhecido vai para o fim — com aviso, sem sumir.
      </p>
    </div>
  );
}

export function AmostraSeletorTurma() {
  const [turma, definirTurma] = React.useState<string | undefined>(undefined);
  return (
    <div className="flex max-w-xs flex-col gap-2">
      <SeletorTurma
        turmas={TURMAS_DA_AMOSTRA}
        {...(turma === undefined ? {} : { valor: turma })}
        aoMudar={definirTurma}
      />
      <p className="text-texto-suave text-xs">
        29 turmas não pedem busca. E o identificador técnico nunca aparece: o que se lê é o rótulo.
      </p>
    </div>
  );
}

/**
 * ⚠️ 45 LINHAS DE PROPÓSITO: o salto de página é de 20 linhas, e com 10 linhas ele seria
 * indistinguível de `End`. Uma amostra que não permite exercitar o comportamento não prova nada —
 * é a mesma razão de a lista do seletor chegar desordenada.
 */
type LinhaDaAmostra = {
  readonly id: string;
  readonly rotulo: string;
  readonly sigla: string;
  readonly horas: number;
  readonly tom: (typeof STATUS)[number];
};

const LINHAS_DA_AMOSTRA: readonly LinhaDaAmostra[] = Array.from({ length: 45 }, (_, i) => ({
  id: `linha-${i + 1}`,
  rotulo: `Registro ${String(i + 1).padStart(3, "0")}`,
  sigla: ["C-Ap-HN", "C-Ap-FR", "C-Esp-ALH"][i % 3] as string,
  horas: (i * 7) % 120,
  tom: STATUS[i % STATUS.length] as (typeof STATUS)[number],
}));

const COLUNAS_DA_AMOSTRA: readonly Coluna<LinhaDaAmostra>[] = [
  {
    chave: "rotulo",
    titulo: "Registro",
    ordenavel: true,
    valor: (l) => l.rotulo,
    celula: (l) => l.rotulo,
  },
  {
    chave: "sigla",
    titulo: "Curso",
    ordenavel: true,
    valor: (l) => l.sigla,
    celula: (l) => l.sigla,
  },
  {
    chave: "horas",
    titulo: "CHT",
    numerica: true,
    ordenavel: true,
    valor: (l) => l.horas,
    celula: (l) => l.horas,
  },
  { chave: "tom", titulo: "Situação", celula: (l) => <BadgeStatus tom={l.tom} rotulo={l.tom} /> },
];

export function AmostraTabelaDensa() {
  const [densidade, definirDensidade] = React.useState<Densidade>("padrao");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["compacta", "padrao", "confortavel"] as const).map((d) => (
          <Button
            key={d}
            size="xs"
            variant={d === densidade ? "default" : "outline"}
            onClick={() => definirDensidade(d)}
          >
            {d}
          </Button>
        ))}
      </div>
      <TabelaDensa
        linhas={LINHAS_DA_AMOSTRA}
        colunas={COLUNAS_DA_AMOSTRA}
        chaveLinha={(l) => l.id}
        rotulo="Registros da amostra"
        densidade={densidade}
        comBusca
      />
      <p className="text-texto-suave text-xs">
        45 linhas, todas renderizadas. <kbd>Tab</kbd> entra e sai em um passo; as setas andam célula
        a célula; <kbd>PageDown</kbd> salta 20 linhas e para na última.
      </p>
    </div>
  );
}

export function AmostraTabelaVazia() {
  return (
    <TabelaDensa
      linhas={[] as readonly LinhaDaAmostra[]}
      colunas={COLUNAS_DA_AMOSTRA}
      chaveLinha={(l) => l.id}
      rotulo="Tabela sem linhas"
      motivoDoVazio="sem-permissao"
    />
  );
}

/**
 * ⚠️ AS SÉRIES DA AMOSTRA TÊM FORMA E RÓTULO PORQUE O TIPO EXIGE — não porque alguém lembrou. É a
 * `FR-018` no tipo: uma série sem forma não compila, então não existe gráfico desta fatia que
 * dependa só de cor.
 */
const SERIES_DA_AMOSTRA: readonly Serie[] = [
  {
    chave: "habilitados",
    rotulo: "Habilitados",
    forma: "circulo",
    pontos: [
      { nome: "C-Ap-HN", valor: 42 },
      { nome: "C-Ap-FR", valor: 28 },
      { nome: "C-Esp-ALH", valor: 35 },
    ],
  },
  {
    chave: "selecionados",
    rotulo: "Selecionados",
    forma: "quadrado",
    pontos: [
      { nome: "C-Ap-HN", valor: 18 },
      { nome: "C-Ap-FR", valor: 24 },
      { nome: "C-Esp-ALH", valor: 12 },
    ],
  },
];

const SERIE_DE_PIZZA: Serie = {
  chave: "regime",
  rotulo: "Regime de trabalho",
  forma: "losango",
  pontos: [
    { nome: "20h", valor: 64 },
    { nome: "40h", valor: 88 },
    { nome: "Dedicação Exclusiva", valor: 25 },
  ],
};

const SERIES_TEMPORAIS: readonly Serie[] = [
  {
    chave: "previsto",
    rotulo: "Previsto",
    forma: "circulo",
    pontos: [
      { nome: "Sem 1", valor: 30 },
      { nome: "Sem 2", valor: 34 },
      { nome: "Sem 3", valor: 31 },
      { nome: "Sem 4", valor: 36 },
    ],
  },
  {
    chave: "executado",
    rotulo: "Executado",
    forma: "triangulo",
    pontos: [
      { nome: "Sem 1", valor: 28 },
      { nome: "Sem 2", valor: 35 },
      { nome: "Sem 3", valor: 29 },
      { nome: "Sem 4", valor: 33 },
    ],
  },
];

/** Sete séries — a amostra da RECUSA. Acima de seis o gráfico se recusa e aponta a tabela densa. */
const SERIES_DEMAIS: readonly Serie[] = Array.from({ length: 7 }, (_, i) => ({
  chave: `s${i}`,
  rotulo: `Série ${i + 1}`,
  forma: (["circulo", "quadrado", "losango", "triangulo", "cruz", "estrela"] as const)[i % 6]!,
  pontos: [{ nome: "a", valor: i + 1 }],
}));

export function AmostraGraficos() {
  return (
    <div className="flex flex-col gap-6">
      <GraficoBarras series={SERIES_DA_AMOSTRA} rotulo="Habilitados × selecionados, por curso" />
      <GraficoPizza serie={SERIE_DE_PIZZA} rotulo="Regime de trabalho" />
      <GraficoLinha series={SERIES_TEMPORAIS} rotulo="Carga horária por semana" />
      <GraficoBarras series={SERIES_DEMAIS} rotulo="Sete séries" />
      <GraficoBarras series={[]} rotulo="Gráfico sem dado" />
      <p className="text-texto-suave text-xs">
        Imprima esta página em preto e branco: cada série continua distinguível pelo marcador de
        forma e pelo rótulo. Se você precisar da cor para saber qual é qual, a FR-018 não foi
        cumprida.
      </p>
    </div>
  );
}

/**
 * ⚠️ OS NÚMEROS DE TETO DESTA AMOSTRA ESTÃO AQUI, NÃO NO COMPONENTE. No sistema de verdade eles
 * vêm de `config_parametros` (`RNF-NORM-08`); a vitrine faz o papel de quem os carregaria.
 */
const TETOS_DA_AMOSTRA: readonly Teto[] = [
  {
    rotulo: "AEC",
    limite: 10,
    medido: 7.4,
    unidade: "%",
    explicacao:
      "Atividade Extra Classe: teto normativo sobre a CHT. Acima dele o lançamento continua possível — é alerta, nunca bloqueio.",
  },
  {
    rotulo: "TAD",
    limite: 5,
    medido: 6.1,
    unidade: "%",
    explicacao:
      "Trabalho Acadêmico Dirigido: teto normativo sobre a CHT. Este está acima, e o salvamento segue disponível.",
  },
  {
    rotulo: "TR",
    limite: 10,
    medido: 10,
    unidade: "%",
    explicacao: "Trabalho de Recuperação: teto normativo sobre a CHT. No limite, ainda dentro.",
  },
];

export function AmostraAlertaEteto() {
  const [salvou, definirSalvou] = React.useState(false);
  return (
    <div className="border-borda rounded-ciaara relative max-h-64 overflow-y-auto border">
      <AlertaConformidade
        tom="atrasado"
        titulo="Dois parâmetros normativos acima do teto"
        avisos={[
          "TAD em 6,1% da CHT — o teto vigente é 5%.",
          "Nono Tempo de Aula lançado na quarta-feira.",
        ]}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap gap-2">
          {TETOS_DA_AMOSTRA.map((t) => (
            <BadgeTeto key={t.rotulo} teto={t} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => definirSalvou(true)}>
            Salvar mesmo assim
          </Button>
          <span className="text-texto-suave text-sm">
            {salvou ? "Salvou — o alerta não impediu nada." : "O botão continua habilitado."}
          </span>
        </div>
        <p className="text-texto-suave text-xs">
          Role esta caixa: a faixa fica no topo da região, não sai da vista e não tem como ser
          dispensada. É a definição operacional de “sempre visível” (RNF-USA-04).
        </p>
        {Array.from({ length: 8 }, (_, i) => (
          <p key={i} className="text-texto-suave text-sm">
            Linha de conteúdo {i + 1}, só para haver o que rolar.
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * ⚠️ AMOSTRA DE FUMAÇA DA BIBLIOTECA DE ESTADO NA URL (`FR-001`, T003 da fatia (c)).
 *
 * Ela existe para **provar que a biblioteca funciona nesta versão do arcabouço**, antes de qualquer
 * coisa depender dela. Os pares declarados dizem `next >=14.2.0`, o que não exclui a 16 nem a
 * afirma — e a fatia (b) pagou o preço de uma dependência que entrou sem ninguém conferir, com a
 * tela ficando idêntica.
 *
 * ⚠️ ELA NÃO USA O CONTRATO, e não deve: o contrato nasce depois. É por isso que o parâmetro se
 * chama `demo` e não pertence a rota nenhuma — ele é a prova, não o produto.
 */
export function AmostraEstadoNaUrl() {
  /*
   * ⚠️ `history: "push"` É EXPLÍCITO, E DESCOBRIR ISSO CUSTOU UMA EXECUÇÃO. O padrão da biblioteca
   * é **substituir** a entrada de histórico, não empilhar — então um parâmetro que troca CONTEXTO e
   * esquece esta opção deixa o botão voltar sem nada para desfazer. **A URL fica certa e o
   * histórico some**, que é a mesma família de erro silencioso do aviso ao servidor.
   *
   * É por isso que `historico` é campo OBRIGATÓRIO do contrato, e não uma opção com padrão.
   */
  const [valor, definirValor] = useQueryState("demo", {
    defaultValue: "",
    history: "push",
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {["alfa", "bravo", "charlie"].map((opcao) => (
          <Button
            key={opcao}
            size="sm"
            variant={valor === opcao ? "default" : "outline"}
            onClick={() => void definirValor(valor === opcao ? null : opcao)}
          >
            {opcao}
          </Button>
        ))}
      </div>
      <p data-slot="amostra-estado-na-url" className="text-texto-suave text-xs">
        Escolhido: <strong data-valor={valor}>{valor || "nenhum"}</strong>. O valor vai para a barra
        de endereço, sobrevive ao recarregamento e some quando volta ao padrão.
      </p>
    </div>
  );
}
