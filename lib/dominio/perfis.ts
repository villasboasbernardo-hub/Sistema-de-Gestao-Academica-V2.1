/**
 * Os NOVE perfis em português, agrupados por divisão (`FR-005`, `FR-040.1`).
 *
 * ⚠️ **O sistema mostra `encarregado_administracao_academica` hoje**, no cabeçalho de toda tela
 * autenticada — o valor cru do enum, com sublinhado. É a primeira coisa que qualquer pessoa lê ao
 * entrar, e ninguém lê aquilo.
 *
 * ⚠️ **São NOVE, não três** *(decisão D-1 de Bernardo Villas Boas, 29/09/2026)*. O enunciado da
 * fatia falava em "Operador/Encarregado/Admin"; o enum do banco tem nove e a matriz
 * `perfil_permissao` semeia os nove, com permissões diferentes. Oferecer três deixaria **seis sem
 * caminho de atribuição pela tela** — e quatro deles já leem identificação civil de instrutor.
 *
 * ⚠️ **O agrupamento é por DIVISÃO, e não é enfeite**: nove opções numa lista plana não se escolhem.
 * A divisão é a que a pessoa conhece do organograma, não uma categoria inventada aqui.
 *
 * Módulo **puro**: nada de `supabase`, `next` nem `react`. O tipo vem do contrato gerado, então
 * perfil novo no banco **não compila** sem passar por aqui.
 */
import type { Database } from "@/lib/tipos/database";

export type Perfil = Database["public"]["Enums"]["perfil_usuario"];

/** As divisões, na ordem em que aparecem na tela. */
export const DIVISOES = [
  "CIAARA-10 · Departamento de Ensino",
  "CIAARA-11 · Administração Acadêmica",
  "CIAARA-12 · Orientação Pedagógica",
  "Operação",
  "Técnico",
] as const;

export type Divisao = (typeof DIVISOES)[number];

type Descricao = { readonly rotulo: string; readonly divisao: Divisao };

/**
 * ⚠️ **`Record<Perfil, …>` é a metade da guarda que o TypeScript dá de graça**: acrescentar um
 * perfil ao enum do banco e regenerar o contrato faz este objeto **parar de compilar** até alguém
 * escrever o rótulo. A outra metade — perfil que sai do enum e fica aqui — o compilador não pega, e
 * é por isso que existe o teste nos dois sentidos.
 */
const PERFIS: Readonly<Record<Perfil, Descricao>> = {
  chefe_departamento_ensino: {
    rotulo: "Chefe do Departamento de Ensino",
    divisao: "CIAARA-10 · Departamento de Ensino",
  },
  encarregado_administracao_academica: {
    rotulo: "Encarregado da Administração Acadêmica",
    divisao: "CIAARA-11 · Administração Acadêmica",
  },
  ajudante_administracao_academica: {
    rotulo: "Ajudante da Administração Acadêmica",
    divisao: "CIAARA-11 · Administração Acadêmica",
  },
  encarregado_orientacao_pedagogica: {
    rotulo: "Encarregado da Orientação Pedagógica",
    divisao: "CIAARA-12 · Orientação Pedagógica",
  },
  ajudante_orientacao_pedagogica: {
    rotulo: "Ajudante da Orientação Pedagógica",
    divisao: "CIAARA-12 · Orientação Pedagógica",
  },
  encarregado_curso: { rotulo: "Encarregado de Curso", divisao: "Operação" },
  operador: { rotulo: "Operador", divisao: "Operação" },
  visualizacao: { rotulo: "Visualização", divisao: "Operação" },
  // ⚠️ `admin` é papel TÉCNICO, sem correspondência regimental — o comentário do enum no banco diz
  //    isso, e agrupá-lo com os cargos da MB daria a ele uma hierarquia que ele não tem.
  admin: { rotulo: "Administrador do sistema", divisao: "Técnico" },
};

/** O rótulo em português. Valor desconhecido volta **como veio** (`RN-DEG-01`), nunca vazio. */
/**
 * O perfil que o formulário de cadastro oferece **já escolhido**.
 *
 * ⚠️ **ELE MORA AQUI, E NÃO NA TELA, POR CAUSA DA GUARDA DE `FR-005` — e a guarda está certa.** Um
 * `"operador"` literal numa folha de cliente é valor cru do enum fora do módulo de tradução, e foi
 * exatamente assim que `snake_case` apareceu no cabeçalho de toda tela até 29/09/2026. Aqui o literal
 * é legítimo: este é o módulo que conhece os valores.
 *
 * ⚠️ **A ESCOLHA É `operador` por ser o MENOS PRIVILEGIADO ÚTIL**, não por ordem alfabética: um
 * formulário que nascesse em `admin` transformaria um clique distraído em Administrador novo.
 * `visualizacao` seria mais restrito ainda, e criaria conta que não faz nada — o padrão seria quase
 * sempre trocado, e padrão que se troca sempre não é padrão.
 */
export const PERFIL_PADRAO_DE_CADASTRO: Perfil = "operador";

export function rotuloDoPerfil(perfil: string | null | undefined): string {
  if (!perfil) return "—";
  return PERFIS[perfil as Perfil]?.rotulo ?? perfil;
}

/** A divisão de um perfil, para agrupar a escolha. */
export function divisaoDoPerfil(perfil: Perfil): Divisao {
  return PERFIS[perfil].divisao;
}

/** Todos os perfis, **agrupados por divisão** e na ordem das divisões — é o que a tela oferece. */
export function perfisPorDivisao(): ReadonlyArray<{
  readonly divisao: Divisao;
  readonly perfis: ReadonlyArray<{ readonly valor: Perfil; readonly rotulo: string }>;
}> {
  return DIVISOES.map((divisao) => ({
    divisao,
    perfis: (Object.keys(PERFIS) as Perfil[])
      .filter((p) => PERFIS[p].divisao === divisao)
      .map((valor) => ({ valor, rotulo: PERFIS[valor].rotulo })),
  })).filter((grupo) => grupo.perfis.length > 0);
}

/** A lista crua dos perfis declarados aqui — existe para o teste comparar com o enum. */
export function perfisDeclarados(): ReadonlyArray<Perfil> {
  return Object.keys(PERFIS) as Perfil[];
}
