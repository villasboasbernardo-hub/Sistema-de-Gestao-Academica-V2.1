/**
 * Um campo de escolha com rótulo — genérico, para os domínios **administráveis** do lançamento:
 * unidade de ensino, disciplina, tipo de avaliação, categoria, subtipo e técnica de ensino.
 *
 * ⚠️ **ESTE ARQUIVO EXISTE POR CAUSA DE UMA GUARDA, E A GUARDA ESTÁ CERTA.** `seletor-unico.test.ts`
 * (`SC-002`) conta como *"construtor de seletor"* qualquer arquivo que tenha `<select` **e** cite
 * a pessoa que ministra — e a `RN-ANT-01` é de *Risco: Alto*, valendo por **ponto único**. O
 * formulário de lançamento precisava das duas coisas: campos de escolha comuns **e** o seletor
 * canônico daquela entidade. Com os dois no mesmo arquivo, a varredura reprovava — e reprovava
 * **com razão**, porque é exatamente assim que um segundo construtor nasce.
 *
 * ⚠️ **O REMÉDIO É O QUE O `CLAUDE.md` PRESCREVE, no gotcha 12:** *"quando a tela precisa de um
 * `<select>` que NÃO é daquela entidade nem de turma, ele vai para **arquivo próprio** que não a
 * menciona"*. Foi o que a escolha de curso já tinha feito antes desta fatia.
 *
 * ⚠️ **E ELE NÃO TEM REGRA NENHUMA DENTRO.** Recebe opções e devolve a escolhida; nenhuma ordenação,
 * nenhuma filtragem, nenhum `RN-`. Quem decide o que entra na lista é a página, que leu o banco.
 */
"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";

export type OpcaoDeEscolha = {
  readonly valor: string;
  readonly rotulo: string;
};

export type EscolhaSimplesProps = {
  readonly id: string;
  readonly rotulo: string;
  readonly opcoes: readonly OpcaoDeEscolha[];
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly obrigatorio?: boolean;
  /** O texto da opção vazia. Ausente, não há opção vazia — o campo nasce com a primeira. */
  readonly textoVazio?: string;
  readonly ajuda?: string;
};

export function EscolhaSimples({
  id,
  rotulo,
  opcoes,
  valor,
  aoMudar,
  obrigatorio,
  textoVazio,
  ajuda,
}: EscolhaSimplesProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {rotulo}
        {obrigatorio ? <span aria-hidden="true"> *</span> : null}
      </Label>
      <select
        id={id}
        required={obrigatorio === true}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        {...(ajuda ? { "aria-describedby": `${id}-ajuda` } : {})}
        className="rounded-ciaara border-borda-forte bg-superficie text-texto rounded border px-2 py-1 text-sm"
      >
        {textoVazio === undefined ? null : <option value="">{textoVazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {ajuda ? (
        <p id={`${id}-ajuda`} className="text-texto-suave text-xs">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}
