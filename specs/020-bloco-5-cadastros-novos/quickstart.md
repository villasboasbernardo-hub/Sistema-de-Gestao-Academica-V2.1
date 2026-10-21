# Quickstart — validar o Bloco 5

1. `pnpm test:unidade` — capacitação (conversão e "tem capacitação"), moeda, acessos, contrato de `/cursos`, guardas.
2. `pnpm db:reset:limpo`; `pnpm test:invariantes` (pgTAP `143_bloco_5.sql`); `pnpm test:rls` (`bloco-5.test.ts`).
3. Porta 3100 livre (`PEND-019-2`), `.next` apagada, ponta a ponta: `bloco-5.spec.ts` e os arquivos tocados
   (`inicio`, `andamento-ate-hoje`, `ta-fora-do-dsa`, `dsa-ver`, `cursos-*`, `instrutores`, `admin-sobre-contas`).
4. Na cópia do remoto: a conversão (antes × depois dos 181) e o veredito do alerta, em `antes-depois.md`.
5. No preview: `roteiro-de-conferencia.md`.
