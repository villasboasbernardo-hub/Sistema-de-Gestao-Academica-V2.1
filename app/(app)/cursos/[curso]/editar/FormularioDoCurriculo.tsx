/**
 * Os dados do currículo escolhido, em *Editar curso* — spec 021, Bloco 6, RC-5 e RC-6 (e o ajuste 3 da conferência do PR
 * #82) — **folha de cliente**.
 *
 * > *"RC-5 · Editar escolhendo o currículo. Cadastrar ou editar disciplinas, avaliações, duração, propósito e o restante
 * > do conteúdo é sempre feito num currículo escolhido."*
 *
 * ⚠️ NO CURRÍCULO EM USO A MUDANÇA É CORREÇÃO (RC-6): a gravação vai sem justificativa; se o banco a exigir, o diálogo
 *    a pergunta e grava de novo — completar o que estava vazio passa direto.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editarCurriculo } from "@/lib/acoes/curriculo";

export type CurriculoNoFormulario = {
  readonly vigenteDe: string;
  readonly descricao: string;
  readonly proposito: string;
  readonly duracaoDias: string;
  readonly duracaoSemanas: string;
};

export function FormularioDoCurriculo({
  sigla,
  versao,
  inicial,
}: {
  readonly sigla: string;
  readonly versao: number;
  readonly inicial: CurriculoNoFormulario;
}) {
  const router = useRouter();
  const [valores, definirValores] = React.useState(inicial);
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravado, definirGravado] = React.useState(false);
  const [gravando, definirGravando] = React.useState(false);
  const { executar, dialogo } = usePedidoDeJustificativa();

  const trocar = (campo: keyof CurriculoNoFormulario) => (e: React.ChangeEvent<HTMLInputElement>) =>
    definirValores((v) => ({ ...v, [campo]: e.target.value }));

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    definirGravando(true);
    definirErro(null);
    definirGravado(false);
    const resultado = await executar((justificativa) =>
      editarCurriculo({
        sigla,
        versao,
        vigenteDe: valores.vigenteDe,
        descricao: valores.descricao,
        proposito: valores.proposito,
        duracaoDias: valores.duracaoDias.trim() === "" ? undefined : Number(valores.duracaoDias),
        duracaoSemanas:
          valores.duracaoSemanas.trim() === "" ? null : Number(valores.duracaoSemanas),
        ...(justificativa ? { justificativa } : {}),
      }),
    );
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    definirGravado(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void gravar(e)}
      className="flex max-w-3xl flex-col gap-3"
      data-slot="formulario-do-curriculo"
    >
      {dialogo}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="curriculo-vigente-de">Vale a partir de</Label>
          <Input
            id="curriculo-vigente-de"
            type="date"
            required
            value={valores.vigenteDe}
            onChange={trocar("vigenteDe")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="curriculo-dias">Duração em dias</Label>
          <Input
            id="curriculo-dias"
            inputMode="numeric"
            required
            value={valores.duracaoDias}
            onChange={trocar("duracaoDias")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="curriculo-semanas">Duração em semanas</Label>
          <Input
            id="curriculo-semanas"
            inputMode="numeric"
            value={valores.duracaoSemanas}
            onChange={trocar("duracaoSemanas")}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-3">
          <Label htmlFor="curriculo-proposito">Propósito</Label>
          <Input
            id="curriculo-proposito"
            value={valores.proposito}
            onChange={trocar("proposito")}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-3">
          <Label htmlFor="curriculo-descricao">O que muda neste currículo</Label>
          <Input
            id="curriculo-descricao"
            maxLength={500}
            value={valores.descricao}
            onChange={trocar("descricao")}
          />
        </div>
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="erro-do-curriculo">
          {erro}
        </p>
      ) : null}
      {gravado ? (
        <p role="status" className="text-texto text-sm" data-slot="curriculo-gravado">
          Currículo gravado.
        </p>
      ) : null}
      <div>
        <BotaoDeIcone
          acao="salvar"
          rotulo="Salvar currículo"
          variante="padrao"
          type="submit"
          ocupado={gravando}
          rotuloOcupado="Salvando…"
          data-slot="salvar-curriculo"
        />
      </div>
    </form>
  );
}
