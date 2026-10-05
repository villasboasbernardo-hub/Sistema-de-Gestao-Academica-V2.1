/**
 * A grade de disciplinas (`RF-MATERIAS-01`, `FR-001` a `FR-006`, fatia (b) do Épico 5).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** A cascata, os filtros, a tabela e os painéis são folhas.
 *
 * ⚠️ **A CASCATA É `curso → turma`, e a TURMA RESOLVE O CURSO** (`FR-002`). Um endereço com turma de
 * outro curso é incoerente, e a saída não é abrir vazio: a turma manda, o curso do parâmetro é
 * **descartado com aviso**. Sem isso, um link compartilhado entre duas pessoas de cursos diferentes
 * abriria uma tela que não mostra nada e não diz por quê — o gotcha 4.
 *
 * ⚠️ **TRÊS CAMINHOS CLICÁVEIS CHEGAM AQUI** (*tela sem caminho clicável é tela não entregue*): a
 * entrada *Disciplinas* do menu, o botão da aba **Grade** de `/cursos/[curso]` e o botão da ficha de
 * `/turmas/[turma]` — os dois últimos já com o curso e a turma preenchidos.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { enderecoDaSecaoDeDisciplinas } from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { redirect } from "next/navigation";

import { lerGradeDeDisciplinas } from "./consulta";
import { GradeDeDisciplinas } from "./GradeDeDisciplinas";

export default async function Disciplinas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * ⚠️ A VALIDAÇÃO ACONTECE ANTES DE O VALOR ALCANÇAR A CONSULTA. Com o `RF-NAV-01`, a barra de
   * endereço é entrada de usuário; valor fora do domínio cai para o padrão e nunca vira predicado.
   */
  const { valores } = lerParametros("/disciplinas", await searchParams);

  /*
   * ⚠️ **O RECORTE POR TURMA SAIU DESTA TELA EM 04/10/2026** (`FR-018`, `FR-019` da spec 012): ele
   *    mora na ficha da turma, que é o lugar da turma. Este desvio existe para que **nenhum
   *    endereço antigo quebre** — link salvo, favorito, mensagem trocada em setembro.
   * ⚠️ **ELE VEM ANTES DE QUALQUER CONSULTA, e isso não é estilo:** buscar a grade para depois
   *    desviar custaria duas idas ao banco por link antigo clicado.
   * ⚠️ **E O DESTINO SAI DO MÓDULO ÚNICO DE ENDEREÇO.** Montá-lo aqui — `/turmas/${…}#disciplinas`
   *    — reprovaria a guarda da `T070`, e com razão: o código da turma contém espaços, e um
   *    caminho montado à mão falha **em silêncio** no primeiro que esquecer de codificar.
   */
  const turmaNoEndereco = String(valores.turma);
  if (turmaNoEndereco !== "") redirect(enderecoDaSecaoDeDisciplinas(turmaNoEndereco));

  const [usuario, grade] = await Promise.all([
    usuarioDaSessao(),
    // ⚠️ Daqui para baixo não há turma: o desvio acima garantiu isso.
    lerGradeDeDisciplinas({ cursoCodigo: String(valores.curso), turmaCodigo: "" }),
  ]);

  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-xl font-semibold">Disciplinas</h1>
        <p className="text-texto-suave text-sm">
          A grade de um curso. O período e os instrutores de cada turma ficam na ficha da turma.
        </p>
      </header>

      {grade.cursos.length === 0 ? (
        /* ⚠️ Distingue **não há** de **você não vê** (gotcha 4): sem curso no alcance, a frase é
           sobre alcance, não sobre cadastro. */
        <EstadoVazio
          motivo="sem-permissao"
          titulo="Nenhum curso ao seu alcance"
          detalhe="A grade de disciplinas mostra os cursos que o seu perfil enxerga. Fale com o Administrador se faltar algum."
        />
      ) : (
        <GradeDeDisciplinas
          grade={grade}
          parametros={{
            curso: String(valores.curso),
            situacao: String(valores.situacao),
            busca: String(valores.busca),
            aberta: String(valores.aberta),
          }}
          permissoes={{
            criar: pode(permissoes, "disciplinas", "criar"),
            editar: pode(permissoes, "disciplinas", "editar"),
            desativar: pode(permissoes, "disciplinas", "desativar"),
          }}
          /* ⚠️ Era `new Date().toISOString()` — UTC, que divergia das outras telas entre 21h e a
             meia-noite. Agora é a mesma função do resto do sistema. */
          hoje={hojeNaCiaara()}
        />
      )}
    </div>
  );
}
