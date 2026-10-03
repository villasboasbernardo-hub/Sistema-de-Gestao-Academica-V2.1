/**
 * Cadastrar conta — **página própria** (`FR-040`).
 *
 * ⚠️ **ERA UM FORMULÁRIO DENTRO DA LISTA ATÉ 03/10/2026**, e Bernardo reprovou: *"O botão «Convidar»
 * vira «Cadastrar usuário» e abre uma PÁGINA nova."* O ganho não é estético — é endereço próprio,
 * botão de voltar que funciona e espaço para os campos que a lista não tinha.
 *
 * ⚠️ **NÃO HÁ E-MAIL EM NENHUM PASSO.** O servidor gera a senha, mostra uma vez, e quem cadastra a
 * repassa em mãos. Não há SMTP a configurar nem link a expirar.
 */
import Link from "next/link";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";

import { lerApoioDaConta } from "../dados-da-conta";
import { FormularioDeCadastro } from "./FormularioDeCadastro";

export default async function NovaConta() {
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  // ⚠️ A permissão do BOTÃO que leva aqui segue a desta página, e não uma regra própria — é a
  //    decisão de 24/09/2026. Quem chega pelo endereço encontra a mesma recusa.
  if (!permissoes.has("usuarios:criar")) {
    return <EstadoVazio motivo="sem-permissao" detalhe="Cadastrar conta é do perfil Admin." />;
  }

  const apoio = await lerApoioDaConta();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/usuarios"
          className="text-marca rounded-ciaara-sm focus-visible:ring-marca text-sm underline focus-visible:ring-2 focus-visible:outline-none"
        >
          ← Usuários
        </Link>
        <h1 className="text-texto mt-1 text-lg font-semibold">Cadastrar usuário</h1>
        {/* veste: explicação do regime de senha — texto de apoio, não valor */}
        <p className="text-texto-suave mt-1 text-sm">
          A senha é <strong>gerada pelo sistema</strong> e aparece <strong>uma vez</strong>, aqui
          nesta tela. Não há e-mail: você a repassa à pessoa, que terá de trocá-la no primeiro
          acesso.
        </p>
      </div>

      <FormularioDeCadastro cursos={apoio.cursos} />
    </section>
  );
}
