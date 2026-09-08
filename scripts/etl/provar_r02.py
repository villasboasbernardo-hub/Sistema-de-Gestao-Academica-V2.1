"""V-3 / T052 — a R-02 pega o que a contagem total nao pega.

O gatilho de auditoria e desligado apenas durante o movimento: sem isso, `editado_em`
e preenchido, a catraca `reg_aula_ue_so_nula_no_historico` recusa a linha e o teste
mede a catraca em vez de medir a R-02. As duas coisas sao verdadeiras e separadas.
"""
import sys, psycopg
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from scripts.etl import reconciliar

C = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
con = psycopg.connect(C); con.autocommit = True
k = con.cursor()
k.execute("select count(*) from public.registros_aula"); antes = k.fetchone()[0]
k.execute("""select codigo, turma_id from public.registros_aula
             where tempos_consumidos > 0 order by codigo limit 1""")
codigo, turma_original = k.fetchone()

k.execute("set session_replication_role = replica")
k.execute("""update public.registros_aula set turma_id =
               (select id from public.turmas where id <> %s limit 1)
             where codigo = %s""", (turma_original, codigo))
k.execute("select count(*) from public.registros_aula"); depois = k.fetchone()[0]
print(f"movido: {codigo}   contagem total {antes} -> {depois}  "
      f"{'INALTERADA' if antes == depois else 'MUDOU'}")

v = reconciliar.reconciliar(C)
r02 = [d for d in v.bloqueantes if d.verificacao == "R-02"]
print(f"veredito: {'APROVADA' if v.aprovada else 'BLOQUEADA'}   divergencias R-02: {len(r02)}")
for d in r02[:4]:
    print("   ", d)

k.execute("update public.registros_aula set turma_id = %s where codigo = %s",
          (turma_original, codigo))
k.execute("set session_replication_role = origin")
v2 = reconciliar.reconciliar(C)
print(f"\nrestaurado: veredito {'APROVADA' if v2.aprovada else 'BLOQUEADA'}")
ok = bool(r02) and antes == depois and v2.aprovada
print("PROVA:", "R-02 ACUSOU com a contagem total intacta" if ok else "FALHOU")
sys.exit(0 if ok else 1)
