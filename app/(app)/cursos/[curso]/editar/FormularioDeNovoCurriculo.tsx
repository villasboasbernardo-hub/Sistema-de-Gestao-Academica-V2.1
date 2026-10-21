/**
 * *Novo currículo*, dentro de *Editar curso* — spec 021, Bloco 6, RC-7 (e o ajuste 3 da conferência do PR #82) —
 * **folha de cliente**.
 *
 * > *"RC-7 · Novo currículo. "Novo currículo" nasce como cópia do vigente e é editado livremente enquanto nenhuma turma
 * > com lançamento o segue. É o caminho da mudança planejada."*
 *
 * ⚠️ A CÓPIA É DO BANCO (`public.criar_curriculo`): o formulário só diz a partir de quando o currículo vale e o que muda.
 *    Com um futuro já cadastrado, o banco recusa (D-27) — a frase traduzida aparece aqui.
 * ⚠️ DEPOIS DE CRIAR, A EDIÇÃO ABRE NO CURRÍCULO NOVO (`?curriculo=N`), que é onde ele se edita.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarCurriculo } from "@/lib/acoes/curriculo";
import { enderecoDaEdicaoDoCurso } from "@/lib/navegacao/endereco-de-turma";

export function FormularioDeNovoCurriculo({
  sigla,
  vigenteDeSugerido,
  copiaDe,
}: {
  readonly sigla: string;
  /** `AAAA-MM-DD` — a sugestão de início, que a pessoa troca. */
  readonly vigenteDeSugerido: string;
  /** "Currículo N (vigência AAAA)" — o vigente, que é copiado. */
  readonly copiaDe: string;
}) {
  const router = useRouter();
  const [aberto, definirAberto] = React.useState(false);
  const [vigenteDe, definirVigenteDe] = React.useState(vigenteDeSugerido);
  const [descricao, definirDescricao] = React.useState("");
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    definirGravando(true);
    definirErro(null);
    const resultado = await criarCurriculo({ sigla, vigenteDe, descricao });
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    definirAberto(false);
    router.push(enderecoDaEdicaoDoCurso(sigla, resultado.versao));
  }

  if (!aberto) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => definirAberto(true)}
        data-slot="novo-curriculo"
      >
        Novo currículo
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => void criar(e)}
      className="border-borda bg-superficie rounded-ciaara flex basis-full flex-col gap-3 border p-3"
      data-slot="formulario-de-novo-curriculo"
    >
      <p className="text-texto text-sm" data-slot="o-que-se-copia">
        O currículo novo nasce como <strong>cópia do {copiaDe}</strong>: disciplinas, unidades de
        ensino, avaliações do currículo, horários, limites de AEC, TAD e TR, regras de avaliação,
        habilitações de instrutor, propósito e duração. O PDF não é copiado. As turmas que já
        existem continuam no currículo delas.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="curriculo-novo-vigente-de">Vale a partir de</Label>
          <Input
            id="curriculo-novo-vigente-de"
            type="date"
            required
            value={vigenteDe}
            onChange={(e) => definirVigenteDe(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex min-w-72 flex-1 flex-col gap-1">
          <Label htmlFor="curriculo-novo-descricao">O que muda (opcional)</Label>
          <Input
            id="curriculo-novo-descricao"
            maxLength={500}
            value={descricao}
            onChange={(e) => definirDescricao(e.target.value)}
          />
        </div>
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="erro-do-novo-curriculo">
          {erro}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={gravando} data-slot="criar-curriculo">
          {gravando ? "Criando…" : "Criar currículo"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => definirAberto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
