/**
 * Os filtros da lista de turmas — **folha de cliente** (`FR-013`, `FR-014` da spec 012).
 *
 * ⚠️ **TODOS OS QUATRO VÃO PARA A URL, por `useParametro`.** É o que dá deep-link de graça: colar o
 * endereço noutra aba reproduz a mesma lista. O contrato de `/turmas` declara os quatro, e parâmetro
 * fora do contrato **não compila**.
 *
 * ⚠️ **A ESCOLHA DE CURSO VAI PELO `FiltroAvancado`, E NÃO POR UM `<select>` PRÓPRIO.** Há guarda que
 * reprova qualquer arquivo que itere `turmas` para dentro de `<option>` ou `SelectItem` — ela existe
 * porque o seletor de turma é ponto único (`SC-004`). ⚠️ **Aqui nada itera turmas**: as opções são
 * **cursos**, **anos** e **situações**, e por isso a guarda não se aplica — medido, não suposto. Usar
 * o componente canônico é o que mantém assim.
 *
 * ⚠️ **O BOTÃO DE LIMPAR É O ÚNICO DO SISTEMA**, e a regra de quando ele aparece mora dentro dele: só
 * há botão quando há filtro fora do padrão. ⚠️ **E o padrão aqui é "tudo vazio"** (decisão **D4**,
 * 04/10/2026) — ao contrário de `/cursos` e `/instrutores`, que abrem em `ativo`. Comparar `situacao`
 * com `""` é portanto correto **nesta tela e só nela**: numa das outras, faria o botão nunca aparecer
 * para quem só trocou a situação, que é o defeito registrado em 23/09/2026.
 */
"use client";

import { BotaoLimparFiltros } from "@/components/ciaara/botao-limpar-filtros";
import {
  FiltroAvancado,
  type CampoDeFiltro,
  type EstadoDeFiltro,
} from "@/components/ciaara/filtro-avancado";
import { ROTULO_DO_STATUS_DE_TURMA } from "@/lib/dominio/seletor-de-turma";
import { SITUACOES_DE_TURMA } from "@/lib/navegacao/contrato";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import type { OpcaoDeCurso } from "./consulta";

const ROTA = "/turmas" as const;

export function FiltrosDeTurmas({
  cursos,
  anos,
}: {
  readonly cursos: readonly OpcaoDeCurso[];
  readonly anos: readonly number[];
}) {
  const [curso, definirCurso] = useParametro(ROTA, "curso");
  const [ano, definirAno] = useParametro(ROTA, "ano");
  const [situacao, definirSituacao] = useParametro(ROTA, "situacao");
  const [busca, definirBusca] = useParametro(ROTA, "busca");

  const campos: readonly CampoDeFiltro[] = [
    { chave: "busca", rotulo: "Buscar pelo código", tipo: "texto" },
    {
      chave: "curso",
      rotulo: "Curso",
      tipo: "escolha",
      opcoes: cursos.map((c) => ({ valor: c.codigo, rotulo: `${c.codigo} — ${c.nome}` })),
    },
    {
      chave: "ano",
      rotulo: "Ano letivo",
      tipo: "escolha",
      opcoes: anos.map((a) => ({ valor: String(a), rotulo: String(a) })),
    },
    {
      chave: "situacao",
      rotulo: "Situação",
      tipo: "escolha",
      opcoes: SITUACOES_DE_TURMA.map((s) => ({
        valor: s,
        rotulo: ROTULO_DO_STATUS_DE_TURMA[s] ?? s,
      })),
    },
  ];

  const estado: EstadoDeFiltro = {
    busca: busca === "" ? [] : [busca],
    curso: curso === "" ? [] : [curso],
    ano: ano === "" ? [] : [ano],
    situacao: situacao === "" ? [] : [situacao],
  };

  const aoMudar = (proximo: EstadoDeFiltro) => {
    const escolha = (chave: string) => proximo[chave]?.[0] ?? "";

    if (escolha("busca") !== busca) void definirBusca(escolha("busca"));
    if (escolha("curso") !== curso) void definirCurso(escolha("curso") || null);
    if (escolha("ano") !== ano) void definirAno(escolha("ano") || null);
    if (escolha("situacao") !== situacao) void definirSituacao(escolha("situacao") || null);
  };

  const algumAtivo = [busca, curso, ano, situacao].some((v) => v !== "");

  const limpar = () => {
    void definirBusca("");
    void definirCurso(null);
    void definirAno(null);
    void definirSituacao(null);
  };

  return (
    <div className="flex flex-col gap-2" data-slot="filtros-de-turmas">
      <FiltroAvancado campos={campos} estado={estado} aoMudar={aoMudar} />
      <BotaoLimparFiltros haFiltroAtivo={algumAtivo} aoLimpar={limpar} />
    </div>
  );
}
