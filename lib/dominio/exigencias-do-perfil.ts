/**
 * `FR-040.1` · o que cada perfil **exige** além do nome e do e-mail, para a conta nascer funcionando.
 *
 * ⚠️ **ESTA REGRA FOI MEDIDA EM `app.cursos_do_usuario()`, NÃO SUPOSTA** (banco local, 03/10/2026).
 * É aquela função que decide o alcance de cada perfil, e ela trata os nove em **três** grupos:
 *
 * | Grupo | Perfis | De onde vem o alcance |
 * |---|---|---|
 * | Todos os cursos | `admin`, `chefe_departamento_ensino`, `visualizacao`, os dois de administração acadêmica e os dois de orientação pedagógica | nada a informar |
 * | Por **vínculo** | `encarregado_curso` | `usuario_curso`, as linhas ativas |
 * | Por **escopo** | `operador` | `usuarios.escopo_curso` comparado com `cursos.classificacao` |
 *
 * ⚠️ **O `encarregado_curso` SEM VÍNCULO ABRE A APLICAÇÃO VAZIA, SEM ERRO NENHUM** — é o gotcha 4 na
 * forma mais cara, porque a pessoa conclui *"não tem curso cadastrado"* e quem cadastrou conclui que
 * o sistema está quebrado. Por isso o vínculo é **exigido na criação**, e não lembrado depois.
 *
 * ⚠️ **O `operador` SEM ESCOPO NÃO FICA VAZIO: ELE FICA COM TUDO.** `geral` (e nulo) devolve todos os
 * cursos. Isso torna o escopo uma escolha **de restrição**, nunca de habilitação — e é por isso que
 * ele não é "exigido": deixá-lo em `geral` é uma decisão válida, não um esquecimento. A tela diz isso.
 *
 * ⚠️ **O VÍNCULO DE INSTRUTOR NÃO É EXIGIDO POR PERFIL NENHUM, e isto também foi medido:** nenhuma
 * policy e nenhuma função de autorização lê `usuarios.instrutor_id` — a única que o nomeia é
 * `app.impedimentos_de_exclusao_do_instrutor`, e para o efeito inverso (uma conta ligada **impede**
 * apagar o instrutor). Ele é associação opcional para os nove, e a tela o oferece sempre sem nunca
 * cobrá-lo. Dizer que um perfil "exige instrutor" seria inventar regra.
 */
import type { Perfil } from "./perfis";

/** O perfil cujo alcance vem de `usuario_curso` — medido, e é exatamente um. */
export const PERFIL_QUE_EXIGE_VINCULO_DE_CURSO: Perfil = "encarregado_curso";

/** O perfil para quem `escopo_curso` restringe de fato — medido, e é exatamente um. */
export const PERFIL_COM_ESCOPO_EFETIVO: Perfil = "operador";

export type Exigencia =
  { readonly atendida: true } | { readonly atendida: false; readonly motivo: string };

const ATENDIDA: Exigencia = { atendida: true };

/** O escopo restringe o alcance **deste** perfil? Para os outros oito, ele é inerte. */
export function escopoRestringe(perfil: Perfil): boolean {
  return perfil === PERFIL_COM_ESCOPO_EFETIVO;
}

/** O perfil precisa de ao menos um curso vinculado para ver qualquer coisa? */
export function exigeVinculoDeCurso(perfil: Perfil): boolean {
  return perfil === PERFIL_QUE_EXIGE_VINCULO_DE_CURSO;
}

/**
 * A conta nasce (ou é editada) funcionando com estes dados?
 *
 * ⚠️ **ELA RECEBE A QUANTIDADE DE VÍNCULOS, NÃO OS IDS**, porque a regra não tem nada a dizer sobre
 * *quais* cursos — só sobre haver algum. Receber a lista convidaria a pôr aqui uma validação de
 * existência, que é do banco (regra 9: `lib/dominio/` não conhece banco).
 */
export function conferirExigenciasDoPerfil(
  perfil: Perfil,
  quantidadeDeVinculos: number,
): Exigencia {
  if (exigeVinculoDeCurso(perfil) && quantidadeDeVinculos < 1) {
    return {
      atendida: false,
      motivo:
        "Encarregado de Curso precisa de pelo menos um curso vinculado: o alcance deste perfil " +
        "vem dos vínculos, e sem nenhum a pessoa entra e não vê curso algum — sem mensagem de " +
        "erro, o que se lê como sistema vazio.",
    };
  }
  return ATENDIDA;
}

/**
 * A frase que a tela mostra **ao lado do campo**, antes de alguém errar.
 *
 * ⚠️ **TRÊS FRASES, UMA POR GRUPO — e a do meio é a que evita a conta inútil.** Deixar o campo sem
 * explicação faria quem cadastra escolher `encarregado_curso` e não entender por que a lista de
 * cursos apareceu.
 */
export function dicaDoPerfil(perfil: Perfil): string {
  if (exigeVinculoDeCurso(perfil)) {
    return "Este perfil vê apenas os cursos vinculados abaixo — escolha ao menos um.";
  }
  if (escopoRestringe(perfil)) {
    return "O escopo restringe este perfil a uma classificação de curso. «Geral» dá acesso a todos.";
  }
  return "Este perfil alcança todos os cursos; escopo e vínculo não mudam o que ele vê.";
}
