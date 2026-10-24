/**
 * Desativar e reativar sala — **folha de cliente** (`FR-029.4`, `FR-029.5`).
 *
 * ⚠️ **SÃO DUAS AÇÕES, E NÃO TRÊS: NÃO HÁ APAGAR** (regra 4 do `CLAUDE.md`). Nenhuma tabela tem
 * policy `FOR DELETE`, e a sala desativada continua nomeando as turmas que já a usam.
 *
 * ⚠️ **DESATIVAR SALA EM USO É PERMITIDO — O DIÁLOGO SÓ AVISA** (`RN-DEG-02`). Quem lista as turmas e
 * quem decide se confirma são `lib/dominio/salas.ts` e `lib/dominio/confirmacao-de-gravacao.ts`; esta
 * folha só mostra o que eles responderam.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { ExclusaoPermanente } from "@/components/ciaara/exclusao-permanente";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { desativarSala, editarNaturezaDaSala, excluirSala, reativarSala } from "@/lib/acoes/sala";
import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";
import type { EstadoDaExclusao } from "@/lib/dominio/exclusao-permanente";
import { ROTULO_DA_NATUREZA } from "@/lib/dominio/salas";

/*
 * ⚠️ RT-2 DO BLOCO 10 (spec 025, D-30 e D-31): a linha ganhou *Editar* — **só a natureza**, em diálogo: o nome é o texto
 *    gravado nas turmas (`FR-029` da spec 009), e renomear apagaria a ligação — e *Excluir*, só da sala que nenhuma
 *    turma usa, com o nome digitado. Quem decide é o banco.
 */

export function AcoesDeSala({
  id,
  valor,
  natureza,
  ativa,
  turmasQueUsam,
  podeEditar = true,
  exclusao,
}: {
  readonly id: string;
  readonly valor: string;
  /** `fisica` ou `virtual` — o que *Editar* muda. */
  readonly natureza: string;
  readonly ativa: boolean;
  /** As turmas que referenciam a sala — já resolvidas por `turmasQueUsam` no servidor. */
  readonly turmasQueUsam: readonly string[];
  /** `parametros.editar`: *Editar* e *Desativar/Reativar*. */
  readonly podeEditar?: boolean;
  /** `parametros.criar`: o estado do *Excluir*; ausente, o ícone não nasce. */
  readonly exclusao?: EstadoDaExclusao;
}) {
  const router = useRouter();
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function executar() {
    definirGravando(true);
    definirErro(null);
    const resultado = ativa ? await desativarSala({ valor }) : await reativarSala({ valor });
    definirGravando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  const confirmacao = confirmacaoDaGravacao(ativa ? "desativar_sala" : "reativar_sala", {
    sala: valor,
    turmasQueUsamASala: turmasQueUsam,
  });

  /* Spec 022 (FR-001): o verbo é o ícone, com o nome de antes na dica e no nome acessível. */
  const botao = (
    <BotaoDeIcone
      acao={ativa ? "desativar" : "reativar"}
      rotulo={ativa ? "Desativar" : "Reativar"}
      variante={ativa ? "destrutivo" : "contorno"}
      disabled={gravando}
      data-slot={ativa ? "desativar-sala" : "reativar-sala"}
      {...(confirmacao.confirma ? {} : { onClick: () => void executar() })}
    />
  );

  return (
    <span className="flex flex-wrap items-center gap-2">
      {podeEditar ? (
        <DialogoDeFormulario
          titulo={`Editar a sala ${valor}`}
          descricao="O nome não muda: ele é o que fica gravado em cada turma. Muda a natureza."
          slot="dialogo-da-sala"
          gatilho={
            <BotaoDeIcone acao="editar" rotulo={`Editar a sala ${valor}`} data-slot="editar-sala" />
          }
        >
          {(fechar) => (
            <NaturezaDaSala
              valor={valor}
              natureza={natureza}
              fechar={fechar}
              aoGravar={() => router.refresh()}
            />
          )}
        </DialogoDeFormulario>
      ) : null}
      {!podeEditar ? null : confirmacao.confirma ? (
        <DialogoConfirmacao
          titulo={confirmacao.titulo}
          consequencia={confirmacao.mensagens.join(" ")}
          rotuloConfirmar={confirmacao.rotuloConfirmar}
          aoConfirmar={() => void executar()}
        >
          {botao}
        </DialogoConfirmacao>
      ) : (
        botao
      )}
      {exclusao ? (
        <ExclusaoPermanente
          id={id}
          codigo={valor}
          nomeDoCodigo="o nome da sala"
          rotulo={`Excluir a sala ${valor}`}
          titulo={`Excluir a sala ${valor} permanentemente?`}
          consequencia="A sala sai da lista. Só é possível porque nenhuma turma a usa."
          estado={exclusao}
          excluir={excluirSala}
          aoRecusar={(e) => definirErro(e)}
          slot="excluir-sala"
        />
      ) : null}
      {erro ? (
        <span role="alert" className="text-atrasado-tinta text-xs" data-slot="erro-da-sala">
          {erro}
        </span>
      ) : null}
    </span>
  );
}

/** A natureza da sala, no diálogo de *Editar* (D-31): o único campo que muda. */
function NaturezaDaSala({
  valor,
  natureza,
  fechar,
  aoGravar,
}: {
  readonly valor: string;
  readonly natureza: string;
  readonly fechar: () => void;
  readonly aoGravar: () => void;
}) {
  const [escolhida, definirEscolhida] = React.useState(natureza);
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault();
    definirGravando(true);
    definirErro(null);
    const resultado = await editarNaturezaDaSala({ valor, natureza: escolhida });
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    fechar();
    aoGravar();
  }

  return (
    <form onSubmit={gravar} className="flex flex-col gap-3" data-slot="formulario-da-natureza">
      {erro ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="erro-da-sala">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor={`natureza-${valor}`} className="text-texto text-sm font-medium">
          Natureza
        </label>
        <select
          id={`natureza-${valor}`}
          name="natureza"
          value={escolhida}
          onChange={(e) => definirEscolhida(e.target.value)}
          className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
        >
          {Object.entries(ROTULO_DA_NATUREZA).map(([v, rotulo]) => (
            <option key={v} value={v}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-natureza">
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
