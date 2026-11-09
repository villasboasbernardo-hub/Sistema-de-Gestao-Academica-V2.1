/**
 * As ações da linha do catálogo de tipos de atividade — **folha de cliente** (Bloco 18, spec 033, RA-1, FR-001.3 e
 * FR-001.4): *Editar* · *Desativar* ou *Reativar* · *Excluir* (indisponível).
 *
 * ⚠️ **EDITAR DIZ QUANTOS MUDAM ANTES DE GRAVAR** (FR-001.3): trocar a classificação padrão de um tipo com lançamento
 *    recategoriza os ativos que seguem o tipo — é o gatilho de sempre (`app.recategorizar_pelo_tipo`). O número sai de
 *    `fraseDoEfeito`, sobre a contagem que o servidor leu; esta folha não conta nada. Os de turma arquivada ficam como
 *    estão (RT-8), e o diálogo os diz à parte.
 * ⚠️ **E DIZ O QUE IMPEDE A TROCA, ANTES DE GRAVAR** (`impedimentoDaTroca`, achados da revisão do Bloco 18): AEC prevista
 *    ativa de currículo com o tipo, e lançamento que segue o tipo com disciplina. O aviso é do número lido pela página;
 *    quem recusa é a ação, que confere de novo ao gravar.
 * ⚠️ **EXCLUIR FICA INDISPONÍVEL, COM O MOTIVO** (regra 4; nenhuma exceção nominal cobre o catálogo): o ícone é focável e
 *    a dica diz *"tem registros: use Desativar"* ou *"sem exceção à regra 4: use Desativar"*.
 * ⚠️ **DESATIVAR CONFIRMA; REATIVAR, NÃO**: desativar tira o tipo da escolha do lançamento; reativar não alcança o passado
 *    de ninguém (o mesmo critério das salas, `FR-018.1`).
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { desativarTipo, editarTipo, reativarTipo } from "@/lib/acoes/tipos-de-atividade";
import {
  CLASSIFICACOES_DO_CATALOGO,
  dicaDoExcluirDoTipo,
  ehClassificacaoDoCatalogo,
  fraseDoEfeito,
  impedimentoDaTroca,
  type ClassificacaoDoCatalogo,
  type ContagemDoTipo,
} from "@/lib/dominio/atividades/catalogo-de-tipos";
import { TAMANHO_MAXIMO_DO_NOME_DO_TIPO } from "@/lib/validacao/tipo-de-atividade";

export function AcoesDoTipoDeAtividade({
  id,
  valor,
  rotulo,
  classificacao,
  ativo,
  contagem,
  previstasAtivas,
}: {
  readonly id: string;
  /** A chave gravada — fica, e o diálogo a mostra. */
  readonly valor: string;
  readonly rotulo: string;
  readonly classificacao: ClassificacaoDoCatalogo;
  readonly ativo: boolean;
  /** Os lançamentos ativos e salvos do tipo; `null` quando a contagem não pôde ser lida. */
  readonly contagem: ContagemDoTipo | null;
  /** As AEC previstas ativas de currículo com o tipo; `null` quando não puderam ser lidas. */
  readonly previstasAtivas: number | null;
}) {
  const router = useRouter();
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function mudarSituacao() {
    definirGravando(true);
    definirErro(null);
    const resultado = ativo ? await desativarTipo({ id }) : await reativarTipo({ id });
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  const total = contagem?.total ?? null;
  const situacao = (
    <BotaoDeIcone
      acao={ativo ? "desativar" : "reativar"}
      rotulo={ativo ? `Desativar o tipo ${rotulo}` : `Reativar o tipo ${rotulo}`}
      variante={ativo ? "destrutivo" : "contorno"}
      ocupado={gravando}
      data-slot={ativo ? "desativar-tipo-de-atividade" : "reativar-tipo-de-atividade"}
      {...(ativo ? {} : { onClick: () => void mudarSituacao() })}
    />
  );

  return (
    <span className="flex flex-wrap items-center gap-2">
      <DialogoDeFormulario
        titulo={`Editar o tipo ${rotulo}`}
        descricao={`O rótulo e a classificação padrão mudam; a chave gravada («${valor}») fica.`}
        slot="dialogo-do-tipo-de-atividade"
        gatilho={
          <BotaoDeIcone
            acao="editar"
            rotulo={`Editar o tipo ${rotulo}`}
            data-slot="editar-tipo-de-atividade"
          />
        }
      >
        {(fechar) => (
          <EdicaoDoTipo
            id={id}
            rotulo={rotulo}
            classificacao={classificacao}
            contagem={contagem}
            previstasAtivas={previstasAtivas}
            fechar={fechar}
            aoGravar={() => router.refresh()}
          />
        )}
      </DialogoDeFormulario>

      {ativo ? (
        <DialogoConfirmacao
          titulo={`Desativar o tipo ${rotulo}?`}
          consequencia={
            `O tipo sai da escolha no lançamento do DSA. ` +
            (total === null
              ? "Os lançamentos que já o usam continuam com ele."
              : total === 0
                ? "Nenhum lançamento ativo o usa."
                : `${total} ${total === 1 ? "lançamento ativo continua" : "lançamentos ativos continuam"} com ele.`) +
            " Ele pode ser reativado depois."
          }
          rotuloConfirmar="Desativar"
          aoConfirmar={() => void mudarSituacao()}
        >
          {situacao}
        </DialogoConfirmacao>
      ) : (
        situacao
      )}

      <BotaoDeIcone
        acao="excluir"
        rotulo={`Excluir o tipo ${rotulo}`}
        variante="destrutivo"
        indisponivel={dicaDoExcluirDoTipo(total)}
        data-slot="excluir-tipo-de-atividade"
      />

      {erro ? (
        <span
          role="alert"
          className="text-atrasado-tinta text-xs"
          data-slot="erro-do-tipo-de-atividade"
        >
          {erro}
        </span>
      ) : null}
    </span>
  );
}

/** O formulário de *Editar*: o rótulo e a classificação, com o efeito da troca dito antes de gravar. */
function EdicaoDoTipo({
  id,
  rotulo,
  classificacao,
  contagem,
  previstasAtivas,
  fechar,
  aoGravar,
}: {
  readonly id: string;
  readonly rotulo: string;
  readonly classificacao: ClassificacaoDoCatalogo;
  readonly contagem: ContagemDoTipo | null;
  readonly previstasAtivas: number | null;
  readonly fechar: () => void;
  readonly aoGravar: () => void;
}) {
  const [nome, definirNome] = React.useState(rotulo);
  const [escolhida, definirEscolhida] = React.useState<ClassificacaoDoCatalogo>(classificacao);
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);
  const campoNome = `tipo-${id}-rotulo`;
  const campoClassificacao = `tipo-${id}-classificacao`;
  /* O aviso só sai com os DOIS números lidos: sem um deles, a ação é que confere (e diz) ao gravar. */
  const impedimento =
    contagem === null || previstasAtivas === null
      ? null
      : impedimentoDaTroca(classificacao, escolhida, {
          previstasAtivas,
          comDisciplina: contagem.comDisciplina,
        });

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault();
    definirGravando(true);
    definirErro(null);
    const resultado = await editarTipo({ id, rotulo: nome, classificacao: escolhida });
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    fechar();
    aoGravar();
  }

  return (
    <form
      onSubmit={gravar}
      className="flex flex-col gap-3"
      data-slot="formulario-da-edicao-do-tipo"
    >
      {erro ? (
        <p
          role="alert"
          className="text-atrasado-tinta text-sm"
          data-slot="erro-do-tipo-de-atividade"
        >
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <CampoObrigatorio para={campoNome} rotulo="Rótulo" obrigatorio />
        <Input
          {...propsDoControle(campoNome, true)}
          name="rotulo"
          value={nome}
          maxLength={TAMANHO_MAXIMO_DO_NOME_DO_TIPO}
          onChange={(e) => definirNome(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <CampoObrigatorio para={campoClassificacao} rotulo="Classificação padrão" obrigatorio />
        <select
          {...propsDoControle(campoClassificacao, true)}
          name="classificacao"
          value={escolhida}
          onChange={(e) => {
            if (ehClassificacaoDoCatalogo(e.target.value)) definirEscolhida(e.target.value);
          }}
          className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
        >
          {CLASSIFICACOES_DO_CATALOGO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p
          className={
            escolhida === classificacao ? "text-texto-suave text-xs" : "text-atrasado-tinta text-xs"
          }
          data-slot="efeito-da-classificacao"
          aria-live="polite"
        >
          {fraseDoEfeito(classificacao, escolhida, contagem)}
        </p>
        {impedimento ? (
          <p
            role="alert"
            className="text-conflito-tinta text-xs"
            data-slot="impedimento-da-troca"
          >
            A troca será recusada ao gravar. {impedimento}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-tipo-de-atividade">
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
