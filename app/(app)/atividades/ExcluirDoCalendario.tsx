/**
 * O *Excluir* da linha do calendário, com o alerta de impacto — folha de cliente (D-COR-7, spec 027, FR-001 a FR-004).
 *
 * > *"O Admin exclui qualquer lançamento (…), ativo ou inativo, depois de um ALERTA que mostra o impacto e pede
 * > confirmação."* — Bernardo Villas Boas, 26/10/2026
 *
 * ⚠️ **NUNCA DESABILITADO POR REGISTRO**: excluir não é bloqueado (a D-COR-6 deixou de valer para a linha do calendário).
 *    O ícone só aparece para o Admin (quem decide é a página e, de novo, o banco).
 * ⚠️ **O IMPACTO É CALCULADO AO ABRIR** (FR-002.1): o diálogo pede a leitura ao servidor e mostra *"Calculando o
 *    impacto…"*. Sem resposta, diz que não calculou e não oferece excluir às cegas (FR-002.3, `RN-DEG-01`).
 * ⚠️ **SEM CÓDIGO DIGITADO** (D-12): a exclusão é lógica e fica na auditoria; o alerta e o botão escrito bastam.
 * ⚠️ **AS AÇÕES CHEGAM POR PROPRIEDADE** (Princípio XI), e a resposta vai para cima da lista (`aoRecusar`,
 *    `aoConcluir`): a linha some com o ícone.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import type { ResumoDoImpacto } from "@/lib/dominio/exclusao-no-calendario";

type RespostaDoImpacto =
  | { readonly ok: true; readonly resumo: ResumoDoImpacto }
  | { readonly ok: false; readonly erro: string };
type RespostaDaExclusao =
  { readonly ok: true; readonly mensagem: string } | { readonly ok: false; readonly erro: string };

type Leitura =
  | { readonly estado: "lendo" }
  | { readonly estado: "pronto"; readonly resumo: ResumoDoImpacto }
  | { readonly estado: "falhou"; readonly erro: string };

export function ExcluirDoCalendario({
  id,
  rotulo,
  titulo,
  lerImpacto,
  excluir,
  aoRecusar,
  aoConcluir,
}: {
  readonly id: string;
  /** O nome acessível do ícone: *"Excluir Nossa Senhora Aparecida (12/11/2026)"*. */
  readonly rotulo: string;
  readonly titulo: string;
  readonly lerImpacto: (entrada: { id: string }) => Promise<RespostaDoImpacto>;
  readonly excluir: (entrada: { id: string }) => Promise<RespostaDaExclusao>;
  readonly aoRecusar: (erro: string) => void;
  readonly aoConcluir: (mensagem: string) => void;
}) {
  const router = useRouter();
  const [aberto, definirAberto] = React.useState(false);
  const [leitura, definirLeitura] = React.useState<Leitura>({ estado: "lendo" });
  const [enviando, iniciar] = React.useTransition();
  /* Em voo: o diálogo não fecha entre o pedido e a resposta (a lição do `ExclusaoPermanente`, revisão do PR #90). */
  const emVoo = React.useRef(false);
  /* A leitura que chega depois de fechar (ou de reabrir) não sobrescreve a atual. */
  const pedido = React.useRef(0);

  const abrir = () => {
    const este = ++pedido.current;
    definirLeitura({ estado: "lendo" });
    lerImpacto({ id })
      .then((r) => {
        if (pedido.current !== este) return;
        definirLeitura(
          r.ok ? { estado: "pronto", resumo: r.resumo } : { estado: "falhou", erro: r.erro },
        );
      })
      .catch(() => {
        if (pedido.current !== este) return;
        definirLeitura({
          estado: "falhou",
          erro: "Não foi possível calcular o impacto agora. Feche e tente de novo.",
        });
      });
  };

  const confirmar = () =>
    iniciar(async () => {
      emVoo.current = true;
      let resposta: RespostaDaExclusao;
      try {
        resposta = await excluir({ id });
      } finally {
        emVoo.current = false;
      }
      definirAberto(false);
      if (!resposta.ok) {
        aoRecusar(resposta.erro);
        return;
      }
      aoConcluir(resposta.mensagem);
      router.refresh();
    });

  const resumo = leitura.estado === "pronto" ? leitura.resumo : null;

  return (
    <AlertDialog
      open={aberto}
      onOpenChange={(quer) => {
        if (!quer && emVoo.current) return;
        definirAberto(quer);
        if (quer) abrir();
        else pedido.current++;
      }}
    >
      <AlertDialogTrigger asChild>
        <BotaoDeIcone
          acao="excluir"
          rotulo={rotulo}
          variante="fantasma"
          className="size-7"
          ocupado={enviando}
          rotuloOcupado="Excluindo…"
          data-slot="excluir-linha"
        />
      </AlertDialogTrigger>
      <AlertDialogContent data-slot="dialogo-de-exclusao" data-leitura={leitura.estado}>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>
            {resumo
              ? resumo.efeito
              : leitura.estado === "falhou"
                ? leitura.erro
                : "Calculando o impacto…"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {resumo ? (
          <div className="text-texto flex flex-col gap-2 text-sm" data-slot="impacto-da-exclusao">
            <p data-slot="impacto-data" data-passou={resumo.passou ? "sim" : "nao"}>
              {resumo.fraseDaData}
            </p>
            {resumo.turmasAtingidas.length > 0 ? (
              <p data-slot="impacto-turmas">
                <span className="font-medium">
                  Turmas atingidas ({resumo.turmasAtingidas.length}):
                </span>{" "}
                {resumo.turmasAtingidas.join(", ")}.
              </p>
            ) : null}
            {resumo.lancamentos.length > 0 || resumo.atividadesGlobais ? (
              <div data-slot="impacto-lancamentos">
                <p className="font-medium">Lançados neste dia:</p>
                <ul className="list-disc pl-5">
                  {resumo.lancamentos.map((l) => (
                    <li key={l.turma} data-turma={l.turma}>
                      {l.turma}: {l.texto}
                    </li>
                  ))}
                  {resumo.atividadesGlobais ? <li>{resumo.atividadesGlobais}</li> : null}
                </ul>
              </div>
            ) : null}
            {resumo.publicadas.length > 0 ? (
              <div data-slot="impacto-publicadas">
                <p className="font-medium">Semanas do DSA publicadas que contêm o dia:</p>
                <ul className="list-disc pl-5">
                  {resumo.publicadas.map((p) => (
                    <li key={p.turma} data-turma={p.turma}>
                      {p.turma} — {p.texto}
                    </li>
                  ))}
                </ul>
                {resumo.avisoDaPublicacao ? (
                  <p className="text-texto-suave">{resumo.avisoDaPublicacao}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          {resumo ? (
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={enviando}
              onClick={(e) => {
                e.preventDefault();
                confirmar();
              }}
              data-slot="confirmar-exclusao"
            >
              {resumo.rotuloConfirmar}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
