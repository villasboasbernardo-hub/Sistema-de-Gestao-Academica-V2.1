# Contrato — a rota de download da planilha de contingência

**Spec**: `spec.md` (`FR-001` a `FR-006`, `FR-028`, `SC-001`, `SC-008`, `SC-009`) · **Pesquisa**: R-10, R-2, R-3

## O endereço

```
GET /turmas/<código da turma>/dsa/planilha
```

- O segmento sai **sempre** de `enderecoDaPlanilhaDeContingencia(codigo)`, novo em
  `lib/navegacao/endereco-de-turma.ts` (gotcha 12: o código da turma tem espaço). Quem lê o segmento
  é `codigoDaTurmaNoSegmento`, que já existe.
- **Nenhum parâmetro de busca.** A planilha é sempre do ano inteiro (`FR-030`), e a semana que abre
  selecionada é decidida no servidor (`FR-022`).
- Arquivo: `app/(app)/turmas/[turma]/dsa/planilha/route.ts`, `export const runtime = "nodejs"`
  (o escritor usa `node:zlib`).

## Quem pode

| Condição | Resposta | Por quê |
|---|---|---|
| Sem sessão | o mesmo destino das telas protegidas — o `proxy.ts` cobre o endereço (`proxy.ts:27`) | é rota protegida como as outras |
| Perfil sem `registros_aula.criar` | **404** | o botão segue esta mesma permissão (`FR-001`) |
| Turma inexistente **ou** fora do alcance (a RLS não devolve a linha) | **404**, a mesma resposta do caso acima | a recusa não confirma que a turma existe (`FR-003`) |
| Turma **EAD puro** (`ehEadPuro`) | **303** para `enderecoDoDsa(codigo)`, onde o aviso de turma EAD já está | `FR-002` |
| Falha na geração (de leitura ou de montagem — volume não é falha: a leitura pagina até acabar, R-3) | **303** para `enderecoDoDsa(codigo)` com o parâmetro de aviso declarado em `lib/navegacao/contrato.ts`; a tela do DSA mostra a frase | `FR-006`: frase de erro, nunca arquivo pela metade |
| Sucesso | **200** com o arquivo inteiro | — |

⚠️ **Toda leitura usa o cliente da sessão** (`criarClienteDeServidor`), nunca o administrativo: a RLS
é a fronteira (Princípio XI), e a `service_role` não tem uso autorizado aqui (gotcha 2).

## A resposta de sucesso

| Cabeçalho | Valor |
|---|---|
| `Content-Type` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `Content-Disposition` | `attachment; filename="<nome ASCII>"; filename*=UTF-8''<nome codificado>` |
| `Cache-Control` | `no-store` — o arquivo é o retrato daquele instante (`FR-005`) |
| `X-Content-Type-Options` | `nosniff` |

**Nome do arquivo:** `DSA-contingencia-<código da turma>-<AAAA-MM-DD>.xlsx`, com a data da geração no
fuso da CIAARA-11; no nome ASCII, espaço vira hífen e o acento sai.

## O botão

- **Onde:** na tela do DSA (`app/(app)/turmas/[turma]/dsa/page.tsx`) e na ficha da turma, ao lado do
  botão do DSA (`app/(app)/turmas/[turma]/page.tsx:292`).
- **Quando:** só para quem tem `registros_aula.criar` e só em turma que não é EAD puro — a mesma
  condição da rota, numa função só, chamada pelos dois botões e pela rota.
- **Como:** link comum (`<a href>`), **sem** o atributo `download` (R-10). Rótulo: *Baixar planilha de
  contingência*.
- **Caminho clicável:** a guarda `tests/unidade/toda-tela-tem-caminho.test.ts` passa a ler também
  `route.ts` — hoje lê só `page.tsx` (`:67`) —, e este é o primeiro Route Handler do repositório.

## O que a rota NÃO faz

- Não escreve no banco (`FR-004`, `SC-009`) — nem rastro de download.
- Não envia o arquivo para lugar nenhum além do navegador de quem pediu (`FR-028`).
- Não aceita arquivo de volta (`FR-027`).

## Como se prova

| Prova | Onde |
|---|---|
| Clicar no botão baixa um `.xlsx` que o leitor de teste reabre | ponta a ponta, partindo do DSA **e** da ficha (o `goto` só até o ponto de partida) |
| Perfil sem `registros_aula.criar`: sem botão e **404** na rota | ponta a ponta, com sessão real |
| Operador fora do alcance: **404**, idêntico ao de turma inexistente | ponta a ponta, com sessão real — o caso negativo por perfil do DoD 4 |
| Turma EAD: sem botão, e a rota leva ao aviso | ponta a ponta |
| Contagem das tabelas igual antes e depois de baixar | invariante contra o banco local |
| Falha simulada na geração leva à frase, e nenhum arquivo é entregue | unidade, com o leitor substituído |
