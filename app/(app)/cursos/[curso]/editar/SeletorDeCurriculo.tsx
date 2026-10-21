/**
 * O seletor do currículo em *Editar curso* — spec 021, Bloco 6 (ajuste 3 da conferência do PR #82, 21/10/2026) —
 * **folha de cliente**, ligada ao `?curriculo=` da edição.
 *
 * > *"Escolher o currículo (ou criar o novo, cópia do vigente) e editar ali TODAS as informações dele."*
 *
 * ⚠️ O VIGENTE É O PADRÃO VAZIO: escolhê-lo tira `?curriculo=` da URL — a edição abre nele.
 * ⚠️ TODOS OS CURRÍCULOS ENTRAM, os arquivados também (marcados): é aqui que o arquivado se desarquiva. As opções chegam
 *    prontas do servidor (`opcoesDoSeletor`), com o rótulo e a situação.
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
  /** O número do currículo em edição. */
  readonly selecionado: number | null;
  /** O número do vigente hoje — o padrão vazio da URL. */
  readonly vigente: number | null;
}) {
  const [, definirCurriculo] = useParametro("/cursos/[curso]/editar", "curriculo");

  return (
    <label className="text-texto flex items-center gap-2 text-sm" data-slot="seletor-de-curriculo">
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
  );
}
