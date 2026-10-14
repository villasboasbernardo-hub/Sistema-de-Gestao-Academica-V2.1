/**
 * A aba **Avaliações** da página do curso (spec 014, FR-053, `RF-CURSO-02`, T181) — componente de servidor.
 *
 * ⚠️ **A Q-02 DA SPEC 009 («exatamente duas abas») E O `FR-006.2` CEDERAM AO `RF-CURSO-02`** (FR-053 da spec 014):
 *    a tela agora ENTREGA as avaliações, e a regra da Q-02 era *«a tela não anuncia o que não entrega»*. Relatório
 *    continua fora.
 * ⚠️ **A TURMA É A MESMA DA GRADE** (`?turma=`, com a pré-seleção pela janela): com ela, o cumprido, a projeção e a
 *    situação; sem ela, só o previsto do currículo. O quadro é o MESMO da ficha da turma (`AvaliacoesDaTurma`) — uma
 *    leitura, uma conta (`quadroDeAvaliacoesDaTurma`), nenhum segundo cálculo.
 * ⚠️ *Definir tempo* com alcance de curso só para quem tem `avaliacoes_curriculo_arbitrado.editar`; a página monta as
 *    ações, e o banco recusa de qualquer forma.
 */
import Link from "next/link";
import type * as React from "react";

import type { QuadroDeAvaliacoes } from "@/lib/dominio/avaliacoes/quadro-da-turma";
import { enderecoDasAvaliacoesDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { AvaliacoesDaTurma } from "../../turmas/[turma]/AvaliacoesDaTurma";

type Acoes = React.ComponentProps<typeof AvaliacoesDaTurma>["arbitrado"];

export function AbaAvaliacoes({
  quadro,
  aviso,
  turmaCodigo,
  turmaId,
  arbitrado,
}: {
  readonly quadro: QuadroDeAvaliacoes | null;
  readonly aviso: string | null;
  readonly turmaCodigo: string | null;
  readonly turmaId: string | null;
  readonly arbitrado?: Acoes;
}) {
  return (
    <div className="flex flex-col gap-3" data-slot="aba-avaliacoes">
      <p className="text-texto-suave text-sm" data-slot="avaliacoes-do-curso-turma">
        {turmaCodigo ? (
          <>
            Cumprido e situação da turma <strong className="text-texto">{turmaCodigo}</strong> (a
            mesma escolhida na Grade) ·{" "}
            <Link href={enderecoDasAvaliacoesDaTurma(turmaCodigo)} className="text-marca underline">
              abrir na ficha da turma
            </Link>
          </>
        ) : (
          "Sem turma escolhida: só o previsto do currículo. Escolha a turma na aba Grade."
        )}
      </p>
      <AvaliacoesDaTurma
        quadro={quadro}
        aviso={aviso}
        turmaId={turmaId ?? ""}
        {...(arbitrado ? { arbitrado } : {})}
      />
    </div>
  );
}
