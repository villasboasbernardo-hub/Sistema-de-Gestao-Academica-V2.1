import * as React from "react";
import {
  BotaoLimparFiltros,
  FiltroAvancado,
  Input,
  Label,
  type CampoDeFiltro,
  type EstadoDeFiltro,
} from "ciaara-11-ds";

/*
 * O botão não sabe onde o estado mora: recebe "há filtro?" e o manipulador por propriedade. Na tela
 * de verdade o estado vai para a URL; aqui ele fica em memória, que é escolha de quem chama.
 *
 * O prefixo separa as chaves de cada célula — o filtro monta `id="filtro-<chave>"`, e duas células
 * com as mesmas chaves repetiriam o identificador na mesma página.
 */
function camposDeTurmas(prefixo: string): readonly CampoDeFiltro[] {
  return [
    { chave: `${prefixo}-busca`, rotulo: "Buscar pelo código", tipo: "texto" },
    {
      chave: `${prefixo}-curso`,
      rotulo: "Curso",
      tipo: "escolha",
      opcoes: [
        { valor: "C-Ap-HN", rotulo: "C-Ap-HN — Aperfeiçoamento de Hidrografia e Navegação" },
        { valor: "C-Ap-FR", rotulo: "C-Ap-FR — Aperfeiçoamento de Faroleiro" },
        { valor: "C-Esp-ME", rotulo: "C-Esp-ME — Especial de Meteorologia" },
      ],
    },
    {
      chave: `${prefixo}-ano`,
      rotulo: "Ano letivo",
      tipo: "escolha",
      opcoes: [
        { valor: "2026", rotulo: "2026" },
        { valor: "2025", rotulo: "2025" },
      ],
    },
    {
      chave: `${prefixo}-situacao`,
      rotulo: "Situação",
      tipo: "escolha",
      opcoes: [
        { valor: "planejada", rotulo: "Planejada" },
        { valor: "ativa", rotulo: "Ativa" },
        { valor: "concluida", rotulo: "Concluída" },
        { valor: "cancelada", rotulo: "Cancelada" },
      ],
    },
  ];
}

function FiltrosDeTurmas({
  prefixo,
  inicial,
}: {
  readonly prefixo: string;
  readonly inicial: EstadoDeFiltro;
}) {
  const [estado, definirEstado] = React.useState<EstadoDeFiltro>(inicial);
  const haFiltroAtivo = Object.values(estado).some((v) => v.some((x) => x !== ""));
  return (
    <div className="flex max-w-3xl flex-col gap-2">
      <FiltroAvancado campos={camposDeTurmas(prefixo)} estado={estado} aoMudar={definirEstado} />
      <BotaoLimparFiltros haFiltroAtivo={haFiltroAtivo} aoLimpar={() => definirEstado({})} />
    </div>
  );
}

/** Com filtro fora do padrão, o botão aparece logo abaixo da barra. */
export function ComFiltroAplicado() {
  return (
    <FiltrosDeTurmas prefixo="com" inicial={{ "com-ano": ["2026"], "com-situacao": ["ativa"] }} />
  );
}

/** Sem filtro, o botão não existe — um botão que não faz nada ensina a ignorá-lo. */
export function SemFiltro() {
  return <FiltrosDeTurmas prefixo="sem" inicial={{}} />;
}

/** Ao lado de uma busca simples, como na lista de contas — com o campo e o rótulo do pacote. */
export function JuntoDaBusca() {
  const [busca, definirBusca] = React.useState("marinha.mil.br");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="previa-busca-de-contas">Buscar por nome ou e-mail</Label>
        <Input
          id="previa-busca-de-contas"
          type="search"
          value={busca}
          onChange={(evento) => definirBusca(evento.target.value)}
          placeholder="nome ou e-mail"
          className="w-64"
        />
      </div>
      <BotaoLimparFiltros haFiltroAtivo={busca !== ""} aoLimpar={() => definirBusca("")} />
    </div>
  );
}
