"use client";

/**
 * O nome de exibição (`FR-020`). Folha — o `"use client"` para aqui.
 *
 * ⚠️ **NÃO HÁ CAMPO DE E-MAIL NEM DE PERFIL NESTE FORMULÁRIO**, e a ausência é o requisito
 * (`FR-021`, `FR-022`). Eles aparecem na página, somente para leitura, com a razão ao lado.
 */
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editarProprioCadastro } from "@/lib/acoes/perfil";

export function FormularioDoNome({ nomeExibicao }: { readonly nomeExibicao: string }) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  async function gravar(dados: FormData) {
    setGravando(true);
    setMensagem(null);
    setErro(null);
    const resultado = await editarProprioCadastro({
      nomeExibicao: String(dados.get("nomeExibicao") ?? ""),
    });
    if (resultado.ok) setMensagem("Nome atualizado.");
    else setErro(resultado.erro);
    setGravando(false);
  }

  return (
    <form action={gravar} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-60 flex-1 flex-col gap-1">
        <Label htmlFor="nomeExibicao">Como você quer ser chamado</Label>
        <Input
          id="nomeExibicao"
          name="nomeExibicao"
          defaultValue={nomeExibicao}
          required
          minLength={2}
          maxLength={120}
        />
      </div>

      <Button type="submit" disabled={gravando}>
        {gravando ? "Gravando…" : "Gravar nome"}
      </Button>

      {/* ⚠️ `role="status"` e não um parágrafo qualquer: quem usa leitor de tela precisa ouvir o
          resultado sem sair do campo. A recusa vai em `alert`, que interrompe. */}
      {mensagem ? (
        <p role="status" className="text-texto-suave w-full text-sm">
          {mensagem}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-erro w-full text-sm">
          {erro}
        </p>
      ) : null}
    </form>
  );
}
