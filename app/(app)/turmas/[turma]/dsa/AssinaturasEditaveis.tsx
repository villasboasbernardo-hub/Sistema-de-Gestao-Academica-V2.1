/**
 * As assinaturas do DSA **editáveis na tela, antes de imprimir** — e o botão *Imprimir* que as leva
 * ao papel (item 4 da conferência do PR #40, decisão de Bernardo Villas Boas, 08/10/2026):
 *
 * > *"Os campos das duas assinaturas (nome, posto/graduação por extenso e função) vêm preenchidos
 * > com o resolvido hoje e podem ser EDITADOS antes de imprimir (alguém assina no lugar de outro, ou
 * > a pessoa não está cadastrada). O que foi editado vai para a IMPRESSÃO. NÃO grava no cadastro nem
 * > no banco («imprimiu, imprimiu»)."*
 *
 * ⚠️ **ESTADO EFÊMERO, NUNCA BANCO NEM `nuqs`.** A edição vale para **uma** impressão: ela vive no
 * estado deste componente e viaja para `/print/dsa` **só no endereço do botão** — montado por
 * `enderecoDaImpressaoDoDsa`, o dono único desse endereço. Não há Server Action aqui, e não pode
 * haver: gravar a edição seria alterar `responsaveis_curso` por uma tela de impressão.
 *
 * ⚠️ **O CONTEXTO EXISTE PORQUE O BOTÃO E OS CAMPOS ESTÃO LONGE UM DO OUTRO.** O *Imprimir* fica na
 * barra do alto e as assinaturas no rodapé; os dois leem a mesma edição. Um segundo botão de
 * imprimir ao lado dos campos deixaria o primeiro imprimindo **sem** a edição — dois botões com o
 * mesmo nome e papéis diferentes. Por isso a folha É a `<section>` da página, e o resto chega por
 * `children` — continua servidor.
 *
 * ⚠️ **QUEM ESCREVE A RUBRICA EM TEXTO É `rubricaResolvida`/`rubricaComEdicao`** (`lib/dominio`), as
 * mesmas funções que o papel chama: a prévia da tela e o papel não podem divergir.
 */
"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CAMPOS_DA_RUBRICA,
  LIMITE_DO_CAMPO,
  rubricaComEdicao,
  type CampoDaRubrica,
  type EdicaoDasAssinaturas,
  type LadoDaAssinatura,
  type RubricaDoDsa,
} from "@/lib/dominio/dsa/assinatura-editada";
import { enderecoDaImpressaoDoDsa } from "@/lib/navegacao/endereco-de-turma";

type Contexto = {
  readonly edicao: EdicaoDasAssinaturas;
  readonly definir: (lado: LadoDaAssinatura, campo: CampoDaRubrica, valor: string | null) => void;
  readonly desfazer: (lado: LadoDaAssinatura) => void;
};

const ContextoDaEdicao = React.createContext<Contexto | null>(null);

/**
 * Guarda a edição das duas assinaturas para a barra de impressão e o rodapé.
 *
 * ⚠️ **QUEM O USA PASSA `key` PELA SEMANA**: o Next reaproveita o componente ao trocar de semana, e
 * sem `key` a edição feita para a semana 41 iria junto para o papel da 42, com outro responsável.
 */
export function EdicaoDasAssinaturasNaTela({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  /** A seção da página é este componente — evita mais um nível de aninhamento no `page.tsx`. */
  readonly className?: string;
}) {
  const [edicao, definirEdicao] = React.useState<EdicaoDasAssinaturas>({});
  const contexto = React.useMemo<Contexto>(
    () => ({
      edicao,
      definir: (lado, campo, valor) =>
        definirEdicao((atual) => {
          const doLado = { ...atual[lado] };
          if (valor === null) delete doLado[campo];
          else doLado[campo] = valor;
          return { ...atual, [lado]: doLado };
        }),
      desfazer: (lado) => definirEdicao((atual) => ({ ...atual, [lado]: {} })),
    }),
    [edicao],
  );
  return (
    <ContextoDaEdicao.Provider value={contexto}>
      <section className={className}>{children}</section>
    </ContextoDaEdicao.Provider>
  );
}

const temEdicao = (doLado: EdicaoDasAssinaturas[LadoDaAssinatura]): boolean =>
  doLado !== undefined && CAMPOS_DA_RUBRICA.some((c) => doLado[c] !== undefined);

/**
 * O botão *Imprimir* — um link, e `window.print()` continua sendo de quem imprime.
 * ⚠️ Leva no endereço **só os campos editados**; sem edição, o endereço é o de sempre.
 */
export function BotaoImprimir({
  codigo,
  semana,
  ano,
  sabado,
}: {
  readonly codigo: string;
  readonly semana: number;
  readonly ano: number;
  readonly sabado: boolean;
}) {
  const edicao = React.useContext(ContextoDaEdicao)?.edicao ?? {};
  const editado = temEdicao(edicao.esquerda) || temEdicao(edicao.direita);
  return (
    <Link
      href={enderecoDaImpressaoDoDsa(codigo, {
        semana,
        ano,
        ...(sabado ? { sabado: true } : {}),
        ...(editado ? { assinaturas: edicao } : {}),
      })}
      className="rounded-ciaara border-borda-forte bg-superficie-2 text-texto hover:bg-marca-suave border px-3 py-1.5 text-sm font-medium"
      data-slot="imprimir-dsa"
      data-assinatura-editada={editado ? "sim" : "nao"}
    >
      Imprimir
    </Link>
  );
}

const ROTULO_DO_CAMPO: Readonly<Record<CampoDaRubrica, string>> = {
  nome: "Nome",
  posto: "Posto/graduação, por extenso",
  funcao: "Função",
};

/**
 * Uma rubrica do rodapé da tela: a prévia de como sai no papel e, sob *Editar*, os três campos.
 *
 * ⚠️ **CAMPO IGUAL AO RESOLVIDO NÃO É EDIÇÃO**: voltar o texto ao que era tira o campo do endereço,
 * e o papel volta a resolver pela vigência.
 */
export function RubricaEditavel({
  lado,
  titulo,
  resolvida,
}: {
  readonly lado: LadoDaAssinatura;
  /** Quem assina deste lado — o rótulo dos campos, para quem lê só o formulário. */
  readonly titulo: string;
  readonly resolvida: RubricaDoDsa | null;
}) {
  const contexto = React.useContext(ContextoDaEdicao);
  const [aberta, definirAberta] = React.useState(false);
  const doLado = contexto?.edicao[lado];
  const editada = temEdicao(doLado);
  const final = rubricaComEdicao(resolvida, doLado);
  const idBase = `dsa-assinatura-${lado}`;

  return (
    <div
      className="flex flex-col gap-1 border-t border-borda pt-1 text-sm"
      data-slot={`tela-assinatura-${lado}`}
      data-editada={editada ? "sim" : "nao"}
    >
      {final === null ? (
        <p className="text-sm text-atrasado-tinta">
          Sem responsável vigente nesta data — a linha sai em branco no papel.
        </p>
      ) : (
        <>
          <span className="font-semibold text-texto" data-slot="tela-assinatura-nome">
            {[final.posto, final.nome].filter(Boolean).join(" ")}
          </span>
          <span className="text-xs text-texto-suave">{final.funcao}</span>
        </>
      )}
      {editada ? (
        <p className="text-xs text-atrasado-tinta" data-slot="tela-assinatura-aviso">
          Editada só para esta impressão — o cadastro de responsáveis não muda.
        </p>
      ) : null}

      {contexto === null ? null : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-expanded={aberta}
            aria-controls={`${idBase}-campos`}
            onClick={() => definirAberta((v) => !v)}
            data-acao={`editar-assinatura-${lado}`}
          >
            {aberta ? "Fechar edição" : "Editar para esta impressão"}
          </Button>
          {editada ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => contexto.desfazer(lado)}
              data-acao={`desfazer-assinatura-${lado}`}
            >
              Voltar ao cadastrado
            </Button>
          ) : null}
        </div>
      )}

      {contexto !== null && aberta ? (
        <fieldset id={`${idBase}-campos`} className="flex flex-col gap-2 pt-1">
          <legend className="sr-only">{titulo}</legend>
          {CAMPOS_DA_RUBRICA.map((campo) => {
            const original = resolvida?.[campo] ?? "";
            const id = `${idBase}-${campo}`;
            return (
              <div key={campo} className="flex flex-col gap-1">
                <Label htmlFor={id}>
                  {ROTULO_DO_CAMPO[campo]} — {titulo}
                </Label>
                <Input
                  id={id}
                  type="text"
                  maxLength={LIMITE_DO_CAMPO}
                  value={doLado?.[campo] ?? original}
                  onChange={(e) => {
                    const valor = e.target.value;
                    contexto.definir(lado, campo, valor === original ? null : valor);
                  }}
                />
              </div>
            );
          })}
        </fieldset>
      ) : null}
    </div>
  );
}
