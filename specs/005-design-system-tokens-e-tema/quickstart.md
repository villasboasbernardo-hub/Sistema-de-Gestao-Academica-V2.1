# Quickstart — como conferir que a fatia (a) funcionou

**Fase 1** · 09/09/2026 · [plan.md](./plan.md) · [spec.md](./spec.md)

Cinco conferências. As quatro primeiras são comando; a quinta é o olho, e é insubstituível.

## Pré-requisitos

O stack local não é necessário: **esta fatia não toca banco**. Basta o repositório instalado.

```
pnpm install
```

## 1 · O portão inteiro

```
pnpm verificar
```

Cobre tipos, lint, formatação, unidade e build. **É onde as três verificações novas reprovam**:
a regra de cor no lint, e o contraste e a paridade de tokens na unidade.

Espera-se: **saída 0**.

## 2 · A regra de cor pega o que tem de pegar

Prova por defeito deliberado, como o portão do Épico 0. Escreva uma cor à mão em qualquer
componente e rode o lint.

```
pnpm lint
```

Espera-se: **reprova**, nomeando o arquivo e a linha, e a mensagem diz **qual token usar** e o que
fazer se faltar um. Desfaça e confirme que volta a passar.

⚠️ Repita com um utilitário da paleta padrão, algo como `text-gray-500`. **Também tem de reprovar** —
é a decisão de 09/09/2026, e é a metade da regra que costuma escapar.

## 3 · O contraste falha nomeando o par

```
pnpm test:unidade
```

Espera-se: **50 asserções** — 25 pares nos dois temas. Para provar que a auditoria mede em vez de
carimbar, escureça um `-fundo` de status no ponto único e rode de novo: ela deve falhar dizendo
**qual par** e **qual razão observada**, não apenas "reprovou".

## 4 · O tema persiste e não pisca

```
pnpm test:e2e
```

Espera-se, no percurso de tema: escolha sobrevive ao recarregamento e a outra aba; sem escolha
manual, segue a preferência do sistema operacional; havendo escolha, ela prevalece; e **nenhum
quadro** exibe o tema não escolhido.

⚠️ **A asserção de flash mede antes da hidratação.** Se alguém a trocar por captura de tela, ela
passa a aprovar o defeito — ver [research.md §R-1](./research.md).

## 5 · A vitrine, com os olhos

```
pnpm dev
```

Abra a rota de vitrine e confira, nos **dois** temas:

- [ ] Todo token do [contrato de vocabulário](./contracts/vocabulario-de-tokens.md) aparece. Nenhum
      existe sem estar ali.
- [ ] Cada par mostra **a razão de contraste medida** ao lado da cor. O número na tela é o mesmo que
      o teste afere.
- [ ] No noturno, o fundo de status é **escuro e pouco saturado** e a tinta é clara. ⚠️ Se algum
      status parecer o pastel do tema claro, é o defeito da v1.0 voltando — e ele **passa** na
      aritmética de contraste enquanto fica ilegível na tela.
- [ ] Alternar o tema **não** produz transição arrastada pela página.
- [ ] Os quatro componentes copiados aparecem pintados pelos tokens CIAARA, não pelas cores próprias
      deles.

## O que esta fatia NÃO entrega, e não adianta procurar

Navegação, cabeçalho, marca institucional e a tela de início — tudo fatia (c). Componentes CIAARA e
gráficos — fatia (b). Rotas de impressão — épicos 10 e 11.

⚠️ **A vitrine é o único lugar onde esta fatia se vê.** Depois de entrar no sistema a pessoa
continua caindo numa página sem link nenhum, e isso é esperado até a fatia (c).
