/**
 * A lista de salas (`FR-029`, `FR-029.2`, `FR-029.4`, `FR-029.5`).
 *
 * ⚠️ **A SALA DESATIVADA NÃO SOME DA LISTA** (regra 4). Ela sai da **escolha** das turmas novas, e é
 * outra coisa: some daqui seria exclusão com outro nome, e ninguém conseguiria reativá-la.
 *
 * ⚠️ **AS TURMAS QUE USAM CADA SALA SAEM DE UMA CONSULTA SÓ**, não de uma por sala (`FR-012`). Quem
 * cruza é `turmasQueUsam`, em `lib/dominio/salas.ts`.
 *
 * ⚠️ **A NATUREZA VEM DO METADADO, NUNCA DO NOME** (`SC-014.2`) — zero comparações com o texto
 * `'Moodle'` em regra.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O formulário e as ações é que são folhas.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import {
  naturezaDaSala,
  ROTULO_DA_NATUREZA,
  turmasQueUsam,
  type Sala,
  type TurmaComSala,
} from "@/lib/dominio/salas";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { AcoesDeSala } from "./AcoesDeSala";
import { FormularioDeSala } from "./FormularioDeSala";

export default async function Salas() {
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const [salasRes, turmasRes] = await Promise.all([
    supabase
      .from("config_listas")
      .select("valor, ativo, metadados, ordem")
      .eq("lista", "salas")
      .order("ordem"),
    supabase.from("turmas").select("codigo, sala_alocada"),
  ]);

  const salas: Sala[] = (salasRes.data ?? []).map((s) => ({
    valor: s.valor as string,
    ativo: s.ativo !== false,
    metadados: s.metadados,
  }));

  const turmas: TurmaComSala[] = (turmasRes.data ?? []).map((t) => ({
    codigo: t.codigo as string,
    sala: t.sala_alocada,
  }));

  const podeEditar = pode(permissoes, "parametros", "editar");

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-texto text-lg font-semibold">Salas</h1>
      <p className="text-texto-suave text-sm">
        {salas.length} salas. Sala errada se <strong>desativa</strong> — não se renomeia nem se
        apaga: o nome é o que fica gravado em cada turma.
      </p>

      <SePodeVer permissoes={permissoes} recurso="parametros" acao="criar">
        <FormularioDeSala />
      </SePodeVer>

      {salas.length === 0 ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Nenhuma sala cadastrada"
          detalhe="Acrescente a primeira para que as turmas possam alocá-la."
        />
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-sm" data-slot="tabela-de-salas">
            <thead>
              <tr>
                {/* veste: os títulos das colunas; o que está abaixo deles é dado */}
                <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                  Sala
                </th>
                <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                  Natureza
                </th>
                <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                  Situação
                </th>
                <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                  Turmas que a usam
                </th>
                {podeEditar ? (
                  <th className="border-borda bg-superficie-2 text-texto border px-2 py-1 text-left">
                    Ações
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {salas.map((sala) => {
                const usadaPor = turmasQueUsam(turmas, sala.valor);
                return (
                  <tr key={sala.valor} data-sala={sala.valor} data-ativa={sala.ativo}>
                    <td className="border-borda text-texto border px-2 py-1">{sala.valor}</td>
                    <td className="border-borda text-texto border px-2 py-1">
                      {ROTULO_DA_NATUREZA[naturezaDaSala(sala)]}
                    </td>
                    <td className="border-borda text-texto border px-2 py-1">
                      {sala.ativo ? "ativa" : "desativada"}
                    </td>
                    <td
                      className="border-borda text-texto border px-2 py-1"
                      data-slot="turmas-que-usam"
                      data-quantidade={usadaPor.length}
                    >
                      {usadaPor.length === 0 ? "—" : usadaPor.join(", ")}
                    </td>
                    {podeEditar ? (
                      <td className="border-borda text-texto border px-2 py-1">
                        <AcoesDeSala
                          valor={sala.valor}
                          ativa={sala.ativo}
                          turmasQueUsam={usadaPor}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
