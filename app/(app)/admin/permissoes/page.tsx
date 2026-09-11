/**
 * Leitura da matriz de permissões (FR-024, FR-025.7).
 *
 * Responde à pergunta que ninguém consegue responder olhando a tela de outra pessoa: *"por que
 * este perfil não vê este botão?"* — sem abrir o banco.
 *
 * ⚠️ SÓ LEITURA NESTA FATIA (FR-024.1, decisão de 08/09/2026). Alterar uma linha continua sendo
 * operação no banco. A propriedade que importa — mudar a matriz muda o comportamento sem novo
 * *deploy* e sem migration — continua sendo requisito e continua provada por teste.
 *
 * ⚠️ QUANDO A TELA DE EDIÇÃO EXISTIR, ela terá de ancorar-se em `app.eh_admin()` e **não** na
 * própria matriz. A matriz não pode ser a autoridade sobre quem edita a matriz: quem escreve nela
 * pode autoconceder qualquer permissão (documento 22 §6.4). É a mesma razão pela qual
 * `perfil_permissao`, `usuarios` e `usuario_curso` são as três tabelas de fronteira do sistema.
 *
 * ⚠️ A LEITURA É ABERTA A QUALQUER SESSÃO AUTENTICADA, e isso é decisão, não descuido: a interface
 * precisa saber quais botões oferecer, e a matriz não contém dado sensível — contém a definição
 * pública das regras. Escondê-la seria segurança por obscuridade sem ganho, já que a RLS protege
 * o dado mesmo com a matriz à vista.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { criarClienteDeServidor } from "@/lib/supabase/server";

const ACOES = ["ler", "criar", "editar", "desativar"] as const;

export default async function Permissoes() {
  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("perfil_permissao")
    .select("perfil, recurso, acao, permitido")
    .order("recurso")
    .order("perfil");

  if (error || !data || data.length === 0) {
    // ⚠️ A distinção do FR-025: aqui o vazio só pode ser falta de sessão, porque a leitura desta
    // tabela é aberta a todo autenticado. Não existe "você não vê" para esta tela.
    return (
      <EstadoVazio
        motivo="sem-dado"
        detalhe="A matriz não pôde ser lida. Ela é semeada por migration — uma matriz vazia significa banco não migrado, não falta de permissão."
      />
    );
  }

  const recursos = [...new Set(data.map((l) => l.recurso))].sort();
  const perfis = [...new Set(data.map((l) => l.perfil))].sort();
  const concedido = new Set(
    data.filter((l) => l.permitido).map((l) => `${l.perfil}|${l.recurso}|${l.acao}`),
  );

  return (
    <section>
      <h1 className="text-lg font-semibold">Matriz de permissões</h1>
      <p className="mt-1 text-texto-suave text-sm">
        {data.length} concessões · {perfis.length} perfis · {recursos.length} recursos. A ausência
        de uma linha <strong>é</strong> a negação: a matriz guarda apenas o que é permitido.
      </p>
      <p className="mt-1 text-texto-suave text-sm">
        Esta tela é <strong>somente leitura</strong>. Alterar uma permissão é operação no banco, e
        passa a valer sem novo <i>deploy</i>.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                Recurso
              </th>
              {perfis.map((p) => (
                <th
                  key={p}
                  className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left"
                >
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recursos.map((recurso) => (
              <tr key={recurso}>
                <th className="border-borda text-texto border px-2 py-1 text-left font-normal">
                  {recurso}
                </th>
                {perfis.map((perfil) => {
                  const tem = ACOES.filter((a) => concedido.has(`${perfil}|${recurso}|${a}`));
                  return (
                    <td key={perfil} className="border-borda text-texto border px-2 py-1">
                      {tem.length > 0 ? tem.join(" · ") : <span aria-label="nenhuma">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
