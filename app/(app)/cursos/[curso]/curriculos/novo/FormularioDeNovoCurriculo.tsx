/**
 * *Novo currículo* — spec 021, Bloco 6, RC-7 — **folha de cliente**.
 *
 * > *"RC-7 · Novo currículo. "Novo currículo" nasce como cópia do vigente e é editado livremente enquanto nenhuma turma
 * > com lançamento o segue. É o caminho da mudança planejada."*
 *
 * ⚠️ A CÓPIA É DO BANCO (`public.criar_curriculo`): o formulário só diz a partir de quando o currículo vale e o que muda.
 *    A data tem de ser depois do início do mais novo (D-27) — quem recusa é o banco, com a frase traduzida.
 * ⚠️ DEPOIS DE CRIAR, A PÁGINA DO CURSO ABRE NO CURRÍCULO NOVO (`?curriculo=N`), que é onde ele se edita.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarCurriculo } from "@/lib/acoes/curriculo";
import { enderecoDoCursoNoCurriculo } from "@/lib/navegacao/endereco-de-turma";

export function FormularioDeNovoCurriculo({
  sigla,
  vigenteDeSugerido,
}: {
  readonly sigla: string;
  /** `AAAA-MM-DD` — a sugestão de início, que a pessoa troca. */
  readonly vigenteDeSugerido: string;
}) {
  const router = useRouter();
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
    router.push(enderecoDoCursoNoCurriculo(sigla, resultado.versao));
  }

  return (
    <form
      onSubmit={(e) => void criar(e)}
      className="flex max-w-xl flex-col gap-3"
      data-slot="formulario-de-novo-curriculo"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="curriculo-vigente-de">Vale a partir de</Label>
        <Input
          id="curriculo-vigente-de"
          type="date"
          required
          value={vigenteDe}
          onChange={(e) => definirVigenteDe(e.target.value)}
          className="w-44"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="curriculo-descricao">O que muda (opcional)</Label>
        <Input
          id="curriculo-descricao"
          maxLength={500}
          value={descricao}
          onChange={(e) => definirDescricao(e.target.value)}
        />
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="erro-do-curriculo">
          {erro}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={gravando} data-slot="criar-curriculo">
          {gravando ? "Criando…" : "Criar currículo"}
        </Button>
      </div>
    </form>
  );
}
