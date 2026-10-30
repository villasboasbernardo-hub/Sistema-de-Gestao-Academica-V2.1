/**
 * As notas da situação da semana, acima das abas de versão (spec 024, RP-3 e RP-4; Bloco 11, D-24; Bloco 15, D-16).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE**: é leitura. As ações estão na barra do cabeçalho (`BarraDoDsa`); aqui fica o que a
 *    situação diz — *alterado desde a publicação*, o lembrete da trava e do rascunho, a alteração salva e não publicada
 *    (RP-9, D-25 da spec 029; ela continua com rascunho novo).
 * ⚠️ **O HISTÓRICO SAIU DAQUI NO BLOCO 15** (spec 030, `FR-007`): a lista *Versões publicadas*, com o *Reimprimir* de cada
 *    uma, virou as **abas** *Original · ALT N* (`AbasDeVersao`), cada uma com o papel publicado (`PapelDaVersao`).
 */
import type { SituacaoDaSemana } from "@/lib/dominio/dsa/publicacao";

export function NotasDaPublicacao({ situacao }: { readonly situacao: SituacaoDaSemana }) {
  return (
    <>
      {situacao.alteradoDesdeAPublicacao ? (
        <p
          role="alert"
          className="text-atrasado-tinta text-sm font-medium"
          data-slot="alterado-desde-a-publicacao"
        >
          Alterado desde a publicação: o papel de hoje não é mais o publicado (calendário, parada ou
          sincronização). Faça uma alteração para republicar.
        </p>
      ) : null}
      {situacao.travada ? (
        <p className="text-texto-suave text-xs">
          Semana publicada: para lançar, editar ou excluir, use «Fazer alteração».
        </p>
      ) : situacao.rascunhos > 0 ? (
        /*
          ⚠️ RP-9, D-25 (spec 029): NA ALTERAÇÃO, o «Salvar alteração» leva à CH e ao andamento, NUNCA ao papel — o papel
             só muda em «Publicar alteração» (achado 14 da revisão do Bloco 14). Fora dela, o «Salvar minuta» leva aos três.
        */
        <p className="text-texto-suave text-xs" data-slot="nota-do-rascunho">
          {situacao.podeSalvarAlteracao
            ? "O que não foi salvo fica guardado, mas não conta na CH nem no andamento até «Salvar alteração»; o papel só muda com «Publicar alteração»."
            : "O que não foi salvo fica guardado, mas não conta em nada (CH, andamento, papel) até «Salvar minuta»."}
        </p>
      ) : null}
      {/*
        RP-9, D-25 (spec 029): a alteração SALVA já conta, e o papel oficial continua o publicado — o aviso da RP-4 só vale
        com a semana travada, então é esta linha que diz o descompasso entre a CH e o papel.
        ⚠️ Pelo `houveSalvoNestaAlteracao`, não pelo `alteracaoSalva` do selo: com rascunho novo o selo perde o «· salva»
           (D-8), mas o que foi salvo continua contando e fora do papel — a linha fica (achado 5 da revisão do Bloco 14).
      */}
      {situacao.houveSalvoNestaAlteracao ? (
        <p role="status" className="text-atrasado-tinta text-sm" data-slot="alteracao-salva">
          Alteração salva: já conta na CH e no andamento; o papel publicado continua valendo até
          «Publicar alteração».
        </p>
      ) : null}
    </>
  );
}
