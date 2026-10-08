import { CardKpi } from "ciaara-11-ds";

/*
 * O indicador não calcula nem formata: o número chega pronto. A variação declara se é FAVORÁVEL
 * para este indicador — não o sinal do número —, e a seta e o texto repetem o que a cor diz.
 */
export function FaixaDeIndicadores() {
  return (
    <div className="grid max-w-2xl grid-cols-2 gap-3">
      <CardKpi rotulo="Turmas ativas" valor={21} />
      <CardKpi rotulo="Carga horária total" valor="1.284" unidade="h" />
      <CardKpi
        rotulo="Aulas executadas"
        valor="87%"
        variacao={{ texto: "+4 p.p. no mês", favoravel: true }}
      />
      <CardKpi
        rotulo="Lançamentos atrasados"
        valor={13}
        variacao={{ texto: "+3 na semana", favoravel: false }}
      />
    </div>
  );
}

/** A faixa da ficha da turma: a unidade vai dentro do valor, e o saldo traz a variação. */
export function AndamentoDaTurma() {
  return (
    <div className="grid max-w-2xl grid-cols-2 gap-3">
      <CardKpi rotulo="CH prevista" valor="1.165 TA" />
      <CardKpi rotulo="CH executada" valor="518 TA" />
      <CardKpi rotulo="Progresso" valor="44 %" />
      <CardKpi
        rotulo="Saldo de capacidade (TA)"
        valor="−247 TA"
        variacao={{ texto: "−31 dias de capacidade", favoravel: false }}
      />
    </div>
  );
}

/** Quando o número não existe, o cartão mostra traço e a razão curta — nunca zero. */
export function SemDado() {
  return (
    <div className="grid max-w-2xl grid-cols-2 gap-3">
      <CardKpi rotulo="Progresso" valor="—" unidade="sem CH prevista" />
      <CardKpi rotulo="Saldo de capacidade (TA)" valor="—" unidade="sem término" />
    </div>
  );
}

/** Variação favorável que é uma queda: carga ociosa que cai é boa notícia. */
export function QuedaFavoravel() {
  return (
    <div className="grid max-w-2xl grid-cols-2 gap-3">
      <CardKpi
        rotulo="Tempos de aula ociosos"
        valor={9}
        unidade="TA"
        variacao={{ texto: "−5 na semana", favoravel: true }}
      />
      <CardKpi
        rotulo="Instrutores habilitados"
        valor={142}
        variacao={{ texto: "−3 no mês", favoravel: false }}
      />
    </div>
  );
}
