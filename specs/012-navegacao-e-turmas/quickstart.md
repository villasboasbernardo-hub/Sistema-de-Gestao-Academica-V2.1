# Quickstart — como se prova que a spec 012 funciona

> Guia de validação, não de implementação. Os comandos são os do repositório; os cenários são os da
> spec, na ordem em que cada PR os entrega.

## 0. Pré-requisitos

- Docker de pé (`pnpm db:start`), stack local com as três chaves.
- A suíte de ponta a ponta vive na **porta 3100** (`PORTA_E2E`); quem confere na tela usa a 3000
  (`pnpm dev:local`). ⚠️ Gotcha 7: com o `dev` na 3100 a suíte roda contra o servidor errado.
- `pnpm verificar` a cada commit; `pnpm verificar:tudo` antes de abrir cada PR — e o CI MUST dar o
  mesmo veredito, contagem a contagem (`SC-011`).

## 1. PR 1 — a lateral

### Pela tela (`pnpm dev:local`, 1280px de largura)

1. Entrar. A lateral está **recolhida**: só ícones, o conteúdo ocupa a largura toda.
2. Passar o mouse: expande, mostra os rótulos; afastar: recolhe. **Sem clicar.**
3. Clicar no controle de fixar (último item da lateral): expande e fica. Ir para *Cursos*: continua
   expandida. `F5`: já abre expandida — **sem** abrir recolhida e saltar.
4. Clicar de novo: recolhe; a próxima tela abre recolhida.
5. `Tab` a partir do topo: a primeira parada é *"Pular para o conteúdo"*; seguindo, a lateral expande
   ao receber foco e cada entrada anuncia o nome; a entrada da tela atual é anunciada como atual.
6. Estreitar a janela abaixo de 1024px: aparece o botão *Menu*; a gaveta abre e fecha como antes;
   apontar não expande nada.
7. Ler o menu de cima a baixo: Início · Cursos · Disciplinas · Instrutores · Cronograma (em breve) ·
   Atividades (em breve) · Administração. *(Turmas entra no PR 2.)*

### Pela suíte

```
pnpm test:unidade -- fronteira-casca fronteira-componentes texto-tenue
pnpm test:e2e -- tests/e2e/lateral.spec.ts tests/e2e/shell.spec.ts tests/e2e/acessibilidade.spec.ts
```

Esperado: `lateral.spec.ts` com os seis casos de `contracts/lateral.md` §7 verdes; `shell.spec.ts`
e `acessibilidade.spec.ts` **sem alteração de asserção** (eles derivam de `MENU` e do nome do `nav`).
⚠️ O caso do flash usa `addInitScript` + `MutationObserver` e `waitUntil: "commit"` — se ele reprovar
dizendo que a primeira escrita de `data-fixada` foi `"false"` com cookie `fixada`, o estado não está
sendo lido no servidor.

## 2. PR 2 — Turmas

### Pela tela

1. Menu → **Turmas**: a lista, com rótulo legível (`código · Situação`), curso, ano, datas, situação,
   alunos. Contagem acima da tabela.
2. Filtrar por curso, ano e situação: a URL muda; colá-la noutra aba reproduz a lista. Aparece
   *Limpar filtros*; clicar devolve tudo.
3. Buscar por parte de um código.
4. Filtro que não casa com nada: *"Nenhuma turma neste recorte"* — não *"sem permissão"*.
5. Clicar numa linha: a ficha. O caminho de volta diz **Turmas**; o curso continua a um clique no
   cabeçalho.
6. Na ficha, a seção **Disciplinas**: as disciplinas da grade da turma, período e instrutores; abrir
   uma linha e **editar o período** — grava e a tela já mostra o valor novo.
7. Página do curso → aba Grade → *"Ver todas as turmas"*: a lista já filtrada por aquele curso.
8. Página do curso → aba Grade → botão *Disciplinas* (com turma): cai na **seção** da ficha.
9. Colar o endereço antigo `/disciplinas?curso=X&turma=Y`: chega à ficha, na seção. Colar
   `/cursos/X?turma=Y`: funciona como antes.
10. Menu → Disciplinas: o catálogo por curso, sem seletor de turma.

### Pela suíte

```
pnpm test:unidade -- contrato-de-parametros toda-tela-tem-caminho endereco-de-turma-unico seletor-turma-unico fronteira-das-telas
pnpm test:e2e -- tests/e2e/turmas-lista.spec.ts tests/e2e/turmas.spec.ts tests/e2e/disciplinas.spec.ts tests/e2e/curso-pagina.spec.ts tests/e2e/enderecos-antigos.spec.ts tests/e2e/shell.spec.ts
```

Esperado: o bloco `FR-031.7` **invertido** passa; `shell.spec.ts` conta **oito** entradas e confere
`/turmas` disponível; `enderecos-antigos.spec.ts` cobre a tabela de `contracts/turmas.md` §4.

## 3. PR 3 — andamento

### Pela tela

1. Abrir uma turma com lançamentos: a seção **Andamento** — prevista, executada, %, barra, *Saldo de
   capacidade (TA)* em TA e em dias, capacidade diária e dias úteis até o término.
2. Uma turma ativa com saldo negativo: a badge **em atraso**.
3. Uma turma concluída que executou mais que o previsto: **sem** badge.
4. Uma turma sem lançamento: *"Ainda sem lançamentos."* — não `0%`.
5. Uma turma sem data de término: sem saldo, com a frase que pede a data.
6. Início: as turmas sinalizadas são **as mesmas** que a ficha sinaliza.

### O caso calculado à mão (`SC-005`)

No banco **local** carregado pelo ETL (`python -m scripts.etl.executar`), escolher uma turma ativa
com `data_termino` futura e lançamentos, e anotar: `chr_curricular`, `chd_executada` (de
`vw_carga_horaria_turma`), `modalidade` e `data_termino` (de `turmas`), `regime_padrao_tempos` ou
`limite_diario_ead_horas` (de `vw_cursos_regime_vigente`) e as datas de `feriados` com
`impacto = 'dia_inteiro'` entre hoje e o término. Calcular à mão as nove grandezas da tabela de
`contracts/andamento.md` §1.1 e **só então** abrir a ficha e comparar número a número. A conta fica
escrita no roteiro de conferência (`roteiro-de-conferencia.md`), com a data em que foi feita — o
"hoje" muda o resultado. ⚠️ O remoto não é consultado para isto.

### Pela suíte

```
pnpm test:unidade -- andamento-da-turma andamento-unico vocabulario-proibido
pnpm test:e2e -- tests/e2e/inicio.spec.ts tests/e2e/andamento.spec.ts tests/e2e/cursos-de-teste tests/e2e/url-degradada.spec.ts
```

Esperado: os doze casos de unidade (`contracts/andamento.md` §1.2); em `inicio.spec.ts` os **dois
vereditos viram** (`turmaEmExcesso` sem badge, `turmaSemCapacidade` com badge). ⚠️ Antes de mudar
`panorama.ts`, rodar `inicio.spec.ts` com a semente nova e **ver o caso reprovar** — é a prova de que
ele discrimina (DoD 8). A semente é compartilhada por quatro arquivos; os quatro rodam.

## 4. Fechamento de cada PR

- `pnpm verificar:tudo` → 0, com as quatro contagens anotadas **depois** da medição (regra 9.3).
- CI verde nos três blocos sobre o **mesmo** commit, run anotado.
- Sem migration → sem backup, sem `db push`, sem conferência de impressão digital. Se algum PR
  descobrir que precisa de migration, isso **para** e segue o rito.
- Conferência de Bernardo no preview pelo roteiro do PR, antes do merge por squash.
