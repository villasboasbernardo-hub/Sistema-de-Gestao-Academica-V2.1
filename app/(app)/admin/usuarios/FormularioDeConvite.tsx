"use client";

/**
 * Formulário de convite. Folha — o `"use client"` para aqui.
 *
 * ⚠️ Os perfis e escopos vêm de `Constants`, gerado do banco. Uma lista escrita à mão neste
 * `<select>` seria a segunda fonte de verdade que o FR-021 proíbe: o dia em que um perfil for
 * acrescentado ao ENUM, este formulário deixaria de oferecê-lo sem ninguém notar.
 */
import { useState } from "react";

import { convidar } from "@/lib/acoes/usuarios";
import { Constants } from "@/lib/tipos/database";

export function FormularioDeConvite() {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(dados: FormData) {
    setEnviando(true);
    const resultado = await convidar({
      nome: String(dados.get("nome") ?? ""),
      email: String(dados.get("email") ?? ""),
      perfil: String(dados.get("perfil") ?? ""),
      escopoCurso: String(dados.get("escopo") ?? ""),
      cursos: [],
    });
    setMensagem(resultado.ok ? "Convite enviado." : resultado.erro);
    setEnviando(false);
  }

  return (
    <form
      action={enviar}
      className="border-borda bg-superficie rounded-ciaara mt-4 space-y-2 border p-4"
    >
      <h2 className="text-sm font-medium">Convidar</h2>

      <div className="flex flex-wrap gap-2">
        <input
          name="nome"
          placeholder="Nome completo"
          required
          className="border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
        <input
          name="email"
          type="email"
          placeholder="e-mail"
          required
          className="border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />

        <select
          name="perfil"
          required
          className="border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          {Constants.public.Enums.perfil_usuario.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          name="escopo"
          required
          className="border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          {Constants.public.Enums.escopo_curso.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={enviando}
          className="border-marca bg-marca text-marca-contraste rounded-ciaara focus-visible:ring-marca border px-3 py-1 text-sm font-medium disabled:opacity-60 focus-visible:ring-2 focus-visible:outline-none"
        >
          {enviando ? "Enviando…" : "Enviar convite"}
        </button>
      </div>

      {mensagem ? (
        <p role="status" className="text-sm">
          {mensagem}
        </p>
      ) : null}
    </form>
  );
}
