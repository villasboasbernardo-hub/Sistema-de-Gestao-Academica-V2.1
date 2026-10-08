/**
 * A semana do DSA **pela data escolhida** (`lib/dominio/dsa/semana-pela-data.ts` — item 4 das
 * correções do DSA, decisão de Bernardo Villas Boas de 08/10/2026; `RF-DSA-02`, `RF-NAV-04`).
 *
 * ⚠️ **AS SEMANAS ESPERADAS NÃO SAÍRAM DO PRÓPRIO REPOSITÓRIO**: foram medidas em 08/10/2026 com
 * `datetime.date.isocalendar()` do Python 3 — uma implementação de ISO 8601 que não é a de
 * `lib/dominio/carga-semanal.ts`. Esperar o que o código devolve não provaria nada; esperar o que
 * outra implementação da mesma norma devolve prova que as duas concordam, inclusive na virada.
 *
 * ⚠️ **A FAIXA DE ANOS É A DO CONTRATO DA ROTA**, a mesma que a tela passa — testar com uma faixa
 * escrita aqui provaria a função com um número que a tela não usa.
 */
import { describe, expect, it } from "vitest";

import { datasDaSemanaIso, semanasDoAnoIso } from "@/lib/dominio/carga-semanal";
import { datasEscolhiveis, semanaDaDataEscolhida } from "@/lib/dominio/dsa/semana-pela-data";
import { CONTRATO } from "@/lib/navegacao/contrato";

const ANOS = CONTRATO["/turmas/[turma]/dsa"].parametros.ano;

const semana = (data: string) => semanaDaDataEscolhida(data, ANOS);

describe("a faixa que a tela passa é a do contrato", () => {
  it("`ano` vai de 2020 a 2099 — a mesma do `CHECK config_param_ano_valido`", () => {
    /* Sem este caso, as pontas medidas mais abaixo seriam de uma faixa que ninguém confere. */
    expect([ANOS.minimo, ANOS.maximo]).toEqual([2020, 2099]);
  });
});

describe("a semana que CONTÉM a data, de segunda a domingo (ISO 8601)", () => {
  it("uma quarta abre a semana dela, e não a que começa nela", () => {
    expect(semana("2026-04-08")).toEqual({ ano: 2026, numero: 15 });
  });

  it("segunda, sábado e domingo da mesma semana abrem a MESMA semana", () => {
    for (const dia of ["2026-04-06", "2026-04-11", "2026-04-12"]) {
      expect(semana(dia), dia).toEqual({ ano: 2026, numero: 15 });
    }
  });

  it("⚠️ o caso que discrimina: o domingo FECHA a semana; a seguinte começa na segunda", () => {
    /* Pela convenção americana, 12/04 (domingo) abriria a semana 16 — e 13/04 é a 16 de verdade. */
    expect(semana("2026-04-12")).toEqual({ ano: 2026, numero: 15 });
    expect(semana("2026-04-13")).toEqual({ ano: 2026, numero: 16 });
  });
});

describe("⚠️ a virada do ano: o ano da URL é o ISO, não o do calendário", () => {
  it("01/01/2027 é da semana 53 de 2026", () => {
    expect(semana("2027-01-01")).toEqual({ ano: 2026, numero: 53 });
  });

  it("31/12/2029 é da semana 1 de 2030", () => {
    expect(semana("2029-12-31")).toEqual({ ano: 2030, numero: 1 });
  });

  it("03/01/2021 (domingo) fecha a semana 53 de 2020; 04/01/2021 abre a 1 de 2021", () => {
    expect(semana("2021-01-03")).toEqual({ ano: 2020, numero: 53 });
    expect(semana("2021-01-04")).toEqual({ ano: 2021, numero: 1 });
  });

  it("30/12/2019 já é da semana 1 de 2020", () => {
    expect(semana("2019-12-30")).toEqual({ ano: 2020, numero: 1 });
  });
});

describe("`RN-DEG-01` · o que não serve devolve `null`, e a tela não navega", () => {
  it("campo apagado, ou data incompleta — o navegador entrega texto vazio", () => {
    expect(semana("")).toBeNull();
    expect(semana("   ")).toBeNull();
  });

  it("⚠️ data que não existe no calendário não rola para o mês seguinte", () => {
    expect(semana("2026-02-30")).toBeNull();
    /* ⚠️ O caso que um intervalo `segunda ≤ data ≤ domingo` deixaria passar: 31/04 rola para 01/05. */
    expect(semana("2026-04-31")).toBeNull();
    expect(semana("2026-13-01")).toBeNull();
    expect(semana("2026-00-10")).toBeNull();
    expect(semana("2026-10-00")).toBeNull();
  });

  it("29/02 só existe em ano bissexto", () => {
    expect(semana("2024-02-29")).toEqual({ ano: 2024, numero: 9 });
    expect(semana("2026-02-29")).toBeNull();
  });

  it("o formato de EXIBIÇÃO não é valor do campo", () => {
    expect(semana("08/10/2026")).toBeNull();
  });

  it("⚠️ os anos parciais de uma digitação (0002, 0020, 0202) não navegam; 2026, sim", () => {
    for (const parcial of ["0002-10-08", "0020-10-08", "0202-10-08"]) {
      expect(semana(parcial), parcial).toBeNull();
    }
    /* Controle positivo: sem ele, uma função que recusasse tudo passaria no laço acima. */
    expect(semana("2026-10-08")).toEqual({ ano: 2026, numero: 41 });
  });

  it("ano ISO fora da faixa da URL não navega — nas duas pontas", () => {
    expect(semana("2019-12-29")).toBeNull(); // semana 52 de 2019
    expect(semana("2100-01-04")).toBeNull(); // semana 1 de 2100
  });
});

describe("o calendário oferece exatamente o que a navegação aceita", () => {
  it("as pontas são as do ANO ISO: 30/12/2019 e 03/01/2100", () => {
    expect(datasEscolhiveis(ANOS)).toEqual({ primeira: "2019-12-30", ultima: "2100-01-03" });
  });

  it("⚠️ a primeira e a última datas oferecidas navegam; o dia de fora de cada uma, não", () => {
    const { primeira, ultima } = datasEscolhiveis(ANOS);
    expect(semana(primeira)).toEqual({ ano: 2020, numero: 1 });
    expect(semana(ultima)).toEqual({ ano: 2099, numero: 53 });
    expect(semana("2019-12-29")).toBeNull();
    expect(semana("2100-01-04")).toBeNull();
  });
});

describe("a segunda-feira que o campo mostra abre a MESMA semana", () => {
  it("em toda semana de todo ano que a URL aceita (2020 a 2099)", () => {
    /*
     * ⚠️ É O QUE IMPEDE O CAMPO DE «ANDAR SOZINHO»: ele mostra `datasDaSemanaIso(ano, n)[0]`, e se
     * essa data caísse noutra semana, escolhê-la de novo levaria a pessoa a outro lugar. São as
     * 4.175 semanas do domínio inteiro, e não uma amostra — contadas em 08/10/2026 somando
     * `date(ano, 12, 28).isocalendar()[1]` do Python de 2020 a 2099.
     */
    const divergentes: string[] = [];
    let conferidas = 0;
    for (let ano = ANOS.minimo; ano <= ANOS.maximo; ano++) {
      for (let numero = 1; numero <= semanasDoAnoIso(ano); numero++) {
        const segunda = datasDaSemanaIso(ano, numero)[0] ?? "";
        const volta = semana(segunda);
        conferidas++;
        if (volta?.ano !== ano || volta.numero !== numero) divergentes.push(`${numero}/${ano}`);
      }
    }
    expect(divergentes).toEqual([]);
    expect(conferidas).toBe(4175);
  });
});
