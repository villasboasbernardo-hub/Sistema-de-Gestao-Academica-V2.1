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
import { estadoDaExclusaoDaSala } from "@/lib/dominio/exclusao-de-partes";
import {
  DICA_SEM_LEITURA,
  estadosPorRegistro,
  type ImpedimentosDoRegistro,
} from "@/lib/dominio/exclusao-permanente";
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
      .select("id, valor, ativo, metadados, ordem")
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
  /* RT-2 e D-30 (spec 025): o *Excluir* de cada sala — só para quem cria parâmetro, e pelo que o banco diz. */
  const podeExcluir = pode(permissoes, "parametros", "criar");
  const idsDasSalas = (salasRes.data ?? []).map((s) => s.id as string);
  const impedimentosRes =
    podeExcluir && idsDasSalas.length > 0
      ? await supabase.rpc("impedimentos_de_exclusao_das_salas", { p_salas: idsDasSalas })
      : null;
  const exclusao = estadosPorRegistro(
    impedimentosRes === null || impedimentosRes.error
      ? null
      : ((impedimentosRes.data ?? []) as ImpedimentosDoRegistro[]),
    estadoDaExclusaoDaSala,
  );
  const idDaSala = new Map((salasRes.data ?? []).map((s) => [s.valor as string, s.id as string]));

  return (
    <section className="flex flex-col gap-3">
      {/* Spec 022 (FR-001.2): a ação da página no topo, à direita. */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-texto text-lg font-semibold">Salas</h1>
          <p className="text-texto-suave text-sm">
            {salas.length} salas. Sala errada se <strong>desativa</strong> — ou se{" "}
            <strong>exclui</strong>, se nenhuma turma a usa. O nome não se renomeia: é o que fica
            gravado em cada turma.
          </p>
        </div>
        <SePodeVer permissoes={permissoes} recurso="parametros" acao="criar">
          <FormularioDeSala />
        </SePodeVer>
      </header>

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
                {podeEditar || podeExcluir ? (
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
                    {podeEditar || podeExcluir ? (
                      <td className="border-borda text-texto border px-2 py-1">
                        <AcoesDeSala
                          id={idDaSala.get(sala.valor) ?? ""}
                          valor={sala.valor}
                          natureza={naturezaDaSala(sala)}
                          ativa={sala.ativo}
                          turmasQueUsam={usadaPor}
                          podeEditar={podeEditar}
                          {...(podeExcluir
                            ? {
                                exclusao: exclusao[idDaSala.get(sala.valor) ?? ""] ?? {
                                  liberada: false,
                                  dica: DICA_SEM_LEITURA,
                                  detalhe: null,
                                },
                              }
                            : {})}
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
