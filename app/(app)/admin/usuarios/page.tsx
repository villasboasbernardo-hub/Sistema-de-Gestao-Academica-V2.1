/**
 * Gestão de usuários (FR-014, FR-025.4).
 *
 * ⚠️ OS QUATRO ESTADOS DE CONTA PRECISAM SER DISTINGUÍVEIS À VISTA, e três deles se parecem:
 *
 *   · convite recém-enviado    `auth_user_id` nulo, dentro da validade  → normal, aguardando
 *   · convite esquecido        `auth_user_id` nulo, fora da validade    → **exige ação**
 *   · ativo                    credencial + `status = 'ativo'`
 *   · inativo                  credencial + `status = 'inativo'`        → nunca some da lista
 *
 * Tratar os dois primeiros igual esconde o segundo, e o segundo é o que fica anos numa lista sem
 * ninguém perceber. A coluna "situação" os separa pela data.
 *
 * ⚠️ O INSTRUTOR VINCULADO APARECE COM A SITUAÇÃO DELE (`FR-010.1` da spec 006). Desativar o docente
 * **não** desativa a conta — são dois cadastros com ciclos de vida diferentes —, e é esta coluna que
 * deixa quem administra ver a diferença. Vem no mesmo `select` da lista, por junção: nenhuma consulta
 * por linha.
 *
 * ⚠️ A DESATIVAÇÃO NÃO APAGA (FR-015). A linha continua na lista, marcada. `criado_por` e
 * `editado_por` de milhares de lançamentos apontam para ela.
 */
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { AcoesDeUsuario } from "./AcoesDeUsuario";
import { FormularioDeConvite } from "./FormularioDeConvite";

/** A mesma validade que `scripts/manutencao/conferir_contas.py` usa. */
const VALIDADE_DO_CONVITE_HORAS = 24;

type Situacao = "convite-enviado" | "convite-esquecido" | "ativo" | "inativo";

function situacaoDa(linha: {
  auth_user_id: string | null;
  status: string | null;
  criado_em: string;
}): Situacao {
  if (linha.auth_user_id) return linha.status === "ativo" ? "ativo" : "inativo";
  const horas = (Date.now() - new Date(linha.criado_em).getTime()) / 3_600_000;
  return horas > VALIDADE_DO_CONVITE_HORAS ? "convite-esquecido" : "convite-enviado";
}

type InstrutorVinculado = {
  readonly id: string;
  readonly posto_graduacao: string;
  readonly esp_hab_obs: string | null;
  readonly nome_completo: string;
  readonly nome_guerra: string | null;
  readonly status: string;
};

/**
 * O instrutor da junção, como objeto ou nada.
 *
 * ⚠️ A INTERFACE DE DADOS DEVOLVE OBJETO para chave estrangeira de muitos-para-um, mas o tipo gerado
 * a declara como lista — o schema também relaciona `usuarios.instrutor_id` com três views, e a
 * inferência não decide. Normalizar aqui aceita as duas formas sem mentir para o compilador.
 */
function instrutorVinculadoDe(valor: unknown): InstrutorVinculado | null {
  const unico = Array.isArray(valor) ? valor[0] : valor;
  return unico && typeof unico === "object" ? (unico as InstrutorVinculado) : null;
}

const ROTULO: Record<Situacao, string> = {
  "convite-enviado": "convite enviado",
  "convite-esquecido": "convite não aceito — reenviar ou desativar",
  ativo: "ativo",
  inativo: "inativo",
};

export default async function Usuarios() {
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("usuarios")
    .select(
      "id, codigo, nome, email, perfil, escopo_curso, status, ultimo_acesso, auth_user_id, criado_em, instrutor:instrutores!usuarios_instrutor_id_fkey(id, posto_graduacao, esp_hab_obs, nome_completo, nome_guerra, status)",
    )
    .order("nome");

  if (error) {
    return <EstadoVazio motivo="sem-permissao" />;
  }

  // ⚠️ A DISTINÇÃO DO FR-025, e ela é real aqui: a RLS deixa quase todo perfil enxergar a PRÓPRIA
  // linha. Uma lista com uma linha só, para quem não administra usuários, não é "não há usuários"
  // — é "você só vê o seu". Dizer "nada cadastrado" seria mentira num sistema com nove contas.
  const podeAdministrar = permissoes.has("usuarios:editar");
  if (!podeAdministrar) {
    return (
      <EstadoVazio
        motivo="sem-permissao"
        detalhe="A gestão de usuários é do perfil Admin. Você enxerga apenas o próprio cadastro."
      />
    );
  }

  return (
    <section>
      <h1 className="text-lg font-semibold">Usuários</h1>
      <p className="mt-1 text-texto-suave text-sm">
        {data?.length ?? 0} cadastros. O acesso é <strong>somente por convite</strong>: não há
        autocadastro, e desativar nunca apaga.
      </p>

      <SePodeVer permissoes={permissoes} recurso="usuarios" acao="criar">
        <FormularioDeConvite />
      </SePodeVer>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                Nome
              </th>
              <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                E-mail
              </th>
              <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                Perfil
              </th>
              <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                Escopo
              </th>
              <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                Situação
              </th>
              <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                Instrutor vinculado
              </th>
              <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                Último acesso
              </th>
              <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((linha) => {
              const situacao = situacaoDa(linha);
              const vinculado = instrutorVinculadoDe(linha.instrutor);
              return (
                <tr key={linha.id}>
                  <td className="border-borda text-texto border px-2 py-1">{linha.nome}</td>
                  <td className="border-borda text-texto border px-2 py-1">{linha.email}</td>
                  <td className="border-borda text-texto border px-2 py-1">{linha.perfil}</td>
                  <td className="border-borda text-texto border px-2 py-1">
                    {linha.escopo_curso ?? "—"}
                  </td>
                  <td className="border-borda text-texto border px-2 py-1">{ROTULO[situacao]}</td>
                  <td
                    className="border-borda text-texto border px-2 py-1"
                    data-slot="instrutor-vinculado"
                  >
                    {vinculado ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <NomeInstrutor
                          instrutor={{
                            id: vinculado.id,
                            pg: vinculado.posto_graduacao,
                            especialidade: vinculado.esp_hab_obs,
                            nomeCompleto: vinculado.nome_completo,
                            nomeDeGuerra: vinculado.nome_guerra,
                          }}
                        />
                        <BadgeStatus
                          tom={vinculado.status === "ativo" ? "executado" : "inativo"}
                          rotulo={
                            vinculado.status === "ativo" ? "instrutor ativo" : "instrutor inativo"
                          }
                        />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border-borda text-texto border px-2 py-1">
                    {linha.ultimo_acesso
                      ? new Date(linha.ultimo_acesso).toLocaleDateString("pt-BR")
                      : "nunca"}
                  </td>
                  <td className="border-borda text-texto border px-2 py-1">
                    <AcoesDeUsuario
                      usuarioId={linha.id}
                      temCredencial={Boolean(linha.auth_user_id)}
                      ativo={linha.status === "ativo"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
