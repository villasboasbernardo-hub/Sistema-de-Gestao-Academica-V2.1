/**
 * O destino de retorno após a autenticação — **permissão por origem, não negação por padrão**.
 *
 * `FR-042` · `SC-019` · contrato: `specs/008-shell-e-estado-na-url/contracts/seguranca-da-url.md`
 *
 * ⚠️ ELE CORRIGE UM DEFEITO QUE JÁ ESTAVA MESCLADO. A guarda anterior era `destino.startsWith("/")`,
 * e ela **não restringe o destino à aplicação**: um endereço começando com **duas** barras é
 * *relativo ao protocolo*, o navegador o resolve para outro host mantendo só o esquema, **e ele
 * começa com barra**. Passava.
 *
 * ⚠️ A DIFERENÇA ENTRE AS DUAS ABORDAGENS É A PERGUNTA QUE ELAS FAZEM. Procurar padrões proibidos
 * na cadeia — `//`, contrabarra, `http` — pergunta *"isto parece perigoso?"*, e erra pelo caso que
 * ninguém pensou. Resolver contra a origem pergunta *"isto é meu?"*, e só essa tem resposta certa
 * para o caso que ninguém previu.
 *
 * ⚠️ ESTE É O ÚNICO LUGAR DA FATIA QUE **RECUSA** EM VEZ DE DEGRADAR, e a distinção é deliberada.
 * Os cinco caminhos de degradação tratam **acidente**: link velho, parâmetro truncado, dado que
 * ainda não existe. Este trata **intenção** — quem escreveu o destino não é quem o abriu.
 */

/** O destino usado quando não há um aceitável. */
export const DESTINO_PADRAO = "/";

/**
 * O resultado, como união discriminada.
 *
 * ⚠️ ELE NÃO DEVOLVE UMA CADEIA COM VALOR DE RESERVA, de propósito: quem chama é **obrigado** a
 * tratar a recusa. Uma função que devolvesse o padrão em silêncio esconderia que alguém tentou.
 */
export type DestinoDeRetorno =
  | { readonly aceito: true; readonly caminho: string }
  | { readonly aceito: false; readonly motivo: "ausente" | "externo" | "malformado" };

/**
 * Confere um destino de retorno contra a origem da própria aplicação.
 *
 * `origem` é a origem conhecida — no navegador, a da janela; no servidor, a da aplicação. Ela chega
 * por argumento para que esta função seja pura e testável sem navegador.
 *
 * ⚠️ O QUE VOLTA É SEMPRE RELATIVO — caminho, consulta e fragmento —, mesmo quando a entrada era
 * absoluta e da própria origem. Navegar para uma cadeia absoluta quando a relativa basta é abrir
 * mão da navegação interna sem ganhar nada.
 */
export function conferirDestino(
  bruto: string | null | undefined,
  origem: string,
): DestinoDeRetorno {
  if (bruto === null || bruto === undefined || bruto.trim() === "") {
    return { aceito: false, motivo: "ausente" };
  }

  let resolvido: URL;
  try {
    resolvido = new URL(bruto, origem);
  } catch {
    // Entrada que nem chega a ser endereço. Não é ataque nem descuido de link: é lixo.
    return { aceito: false, motivo: "malformado" };
  }

  /*
   * ⚠️ A COMPARAÇÃO É DE ORIGEM, e ela cobre os três de uma vez: o relativo ao protocolo resolve
   * para outro host; o absoluto de outro domínio idem; e um esquema próprio — `javascript:`, por
   * exemplo — resolve para origem nula. Nenhum deles precisa ser previsto por nome.
   */
  if (resolvido.origin !== new URL(origem).origin) {
    return { aceito: false, motivo: "externo" };
  }

  return { aceito: true, caminho: `${resolvido.pathname}${resolvido.search}${resolvido.hash}` };
}

/**
 * O caminho para onde navegar: o destino conferido, ou o padrão.
 *
 * ⚠️ ELA EXISTE PARA QUE QUEM CHAMA NÃO PRECISE REESCREVER A ESCOLHA, e não para esconder a recusa
 * — `conferirDestino` continua disponível para quem precisa saber **por que** foi recusado.
 */
export function caminhoDeRetorno(bruto: string | null | undefined, origem: string): string {
  const resultado = conferirDestino(bruto, origem);
  return resultado.aceito ? resultado.caminho : DESTINO_PADRAO;
}
