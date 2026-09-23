/**
 * Cadastrar curso (`FR-013`, `FR-013.1`, `FR-041`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só o formulário é folha.
 *
 * ⚠️ **SEM PERMISSÃO, A TELA DIZ ISSO — e não mostra um formulário que o banco vai recusar.**
 * Esconder o formulário é conforto de quem usa; a proteção continua sendo a policy `cursos_criar`.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";

import { FormularioDeCurso } from "../FormularioDeCurso";

export default async function NovoCurso() {
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  if (!pode(permissoes, "cursos", "criar")) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Novo curso</h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não cadastra curso"
          detalhe="Fale com o Admin se precisar deste acesso."
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-texto text-lg font-semibold">Novo curso</h1>
      <FormularioDeCurso modo="novo" />
    </section>
  );
}
