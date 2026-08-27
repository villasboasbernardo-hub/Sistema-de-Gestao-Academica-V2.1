# Data Model — Hotfix: Edição Inline, Persistência de Datas, Permissão de Admin

Nenhuma coluna, aba ou entidade persistida nova. Este documento descreve as 2 formas de dado que
mudam de comportamento (não de forma).

## 1. Célula de Carga Horária/Prioridade na tabela principal (`linhaVisao2_`)

```text
Antes: <input type="number" value="${chTempos}" id="cht_${idGrade}"> (sempre editável)
       <input type="number" placeholder="—" id="prio_${idGrade}"> (sempre em branco, mesmo com peso salvo)

Depois: ${chTempos} — texto simples
        ${pesosPrioridadeCarregados[idGrade] != null ? pesosPrioridadeCarregados[idGrade] : '—'} — texto simples
```

`linhaVisao1_` (catálogo puro por Curso sem Turma) permanece exatamente como está — sem mudança de
forma nem de comportamento.

## 2. Verificação de gravação de `turma_disciplina.Previsao_Inicio`/`Previsao_Termino`

Produzida dentro de `atualizarTurmaDisciplina` (`lib/acoes/liq.ts`), nunca persistida — comparação em
memória durante a própria chamada:

```text
VerificacaoGravacaoData = {
  enviado: { Previsao_Inicio?: string, Previsao_Termino?: string },  // de `alteracoes`, só as chaves presentes
  relido: { Previsao_Inicio: string, Previsao_Termino: string },     // nova leitura de turma_disciplina pós-crudAtualizar,
                                                                       // já convertida para 'yyyy-MM-dd' por lerAbaComoObjetos_
  ok: boolean,  // true se toda chave presente em `enviado` bate com o valor correspondente em `relido`
}
```

Quando `ok === false`: `atualizarTurmaDisciplina` lança `Error` com os 2 conjuntos de valores na
mensagem, antes de retornar — o chamador (`salvarEdicaoDisciplinaTurma_`, `app/(app)/disciplinas/page.tsx`)
já tem `.catch(e => alert(...))` no fim da cadeia (spec 035/036), sem nenhuma mudança de contrato
necessária no frontend.

## 3. Lista de perfis autorizados a gravar Prioridade (`definirPrioridadeDisciplina`)

```text
Antes: PERFIS_DIVISAO_ADMIN_ACADEMICA
       // ['Encarregado_Divisao_Administracao_Academica', 'Ajudante_Divisao_Administracao_Academica']

Depois: ['Admin'].concat(PERFIS_DIVISAO_ADMIN_ACADEMICA)
        // ['Admin', 'Encarregado_Divisao_Administracao_Academica', 'Ajudante_Divisao_Administracao_Academica']
```

Mesma forma (array de strings) já usada por `CRUD_CONFIG[...].escrita` e pelas 3 funções irmãs de
`lib/dominio/motor-preditivo.ts` — nenhuma estrutura nova.
