/**
 * O seletor de currículo da página do curso — spec 021, Bloco 6, RC-8 e RC-10 — **folha de cliente**, ligada ao
 * `?curriculo=` e ao `?arquivados=`.
 *
 * > *"RC-8 · Página do curso. Tem um seletor de currículo (o vigente por padrão), que alterna entre vigente, futuro e
 * > passados. As abas (…) mostram só o conteúdo do currículo selecionado."*
 *
 * ⚠️ O VIGENTE É O PADRÃO VAZIO: escolhê-lo tira `?curriculo=` da URL — o link de quem abre o curso sem escolher e o
 *    de quem escolheu o vigente são o mesmo, e continuam o mesmo quando o vigente mudar de número.
 * ⚠️ AS OPÇÕES CHEGAM PRONTAS do servidor (`opcoesDoSeletor`, `lib/dominio/curriculos.ts`), com o rótulo e a
 *    situação: a folha só mostra e escreve na URL.
 */
"use client";

import { useParametro } from "@/lib/navegacao/usar-parametro";

export type OpcaoDoSeletorDeCurriculo = {
  readonly versao: number;
  readonly rotulo: string;
  readonly situacao: string;
};

export function SeletorDeCurriculo({
  opcoes,
  selecionado,
  vigente,
}: {
  readonly opcoes: readonly OpcaoDoSeletorDeCurriculo[];
  /** O número do currículo que as abas mostram. */
  readonly selecionado: number | null;
  /** O número do vigente hoje — o padrão vazio da URL. */
  readonly vigente: number | null;
}) {
  const [, definirCurriculo] = useParametro("/cursos/[curso]", "curriculo");
  const [arquivados, definirArquivados] = useParametro("/cursos/[curso]", "arquivados");

  return (
    <div className="flex flex-wrap items-center gap-3" data-slot="seletor-de-curriculo">
      <label className="text-texto flex items-center gap-2 text-sm">
        {/* veste: o rótulo do seletor */}
        <span className="text-texto-tenue">Currículo</span>
        <select
          value={selecionado === null ? "" : String(selecionado)}
          onChange={(e) => {
            const escolhido = Number(e.target.value);
            void definirCurriculo(escolhido === vigente ? null : String(escolhido));
          }}
          className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
          data-slot="escolha-do-curriculo"
          aria-label="Currículo"
        >
          {opcoes.map((o) => (
            <option key={o.versao} value={String(o.versao)}>
              {o.rotulo} — {o.situacao}
            </option>
          ))}
        </select>
      </label>
      <label
        htmlFor="mostrar-curriculos-arquivados"
        className="text-texto-suave flex items-center gap-1 text-xs"
      >
        <input
          id="mostrar-curriculos-arquivados"
          type="checkbox"
          checked={arquivados === "sim"}
          onChange={(e) => void definirArquivados(e.target.checked ? "sim" : null)}
          className="accent-marca size-4"
          data-slot="mostrar-curriculos-arquivados"
        />
        Mostrar currículos arquivados
      </label>
    </div>
  );
}
