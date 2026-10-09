<#
.SYNOPSIS
  A planilha de contingência do DSA no Excel DE VERDADE — T051/T052 da spec 015 (R-12, DP-4).

.DESCRIPTION
  Abre, pela automação do Excel desta máquina (invisível, sem alertas, só leitura), o arquivo que
  `tests/invariantes/planilha-de-conferencia.test.ts` gerou em
  %TEMP%\ciaara-planilha-de-conferencia\, manda recalcular TUDO (`CalculateFull`) e confere:

    1. cada fórmula de cada aba contra o valor do gabarito — o que a árvore da planilha avaliou;
    2. que nenhuma célula de aba nenhuma ficou com valor de erro (#REF!, #N/A, #VALUE!…, FR-023);
    3. a IMPRESSÃO com o seletor posto em cada semana do gabarito (FR-022, I-P5);
    4. (PR 2) a CONTROLE com a data de referência numa data FIXA — o TODAY() que o Excel recalcula não
       pode decidir o resultado —, e um lançamento offline pela automação: dois TA da mesma disciplina,
       um antes e outro depois da referência, que têm de dar +1 na CH lançada, −1 na restante e +1 em
       cada semana da CRONOS — e o de depois da referência não pode contar na CONTROLE (D-5).

  ⚠️ O ARQUIVO É SINTÉTICO (dúvida 2 do analyze, opção c): nenhum dado real passa por aqui.
  ⚠️ NADA É GRAVADO: o arquivo abre só para leitura e fecha sem salvar.

.PARAMETER Pasta
  Onde estão planilha.xlsx e gabarito.json.

.PARAMETER ProgId
  O Excel por automação — "Excel.Application", o padrão da máquina.

.PARAMETER Executavel
  O EXCEL.EXE de uma versão específica (o do Office12, para o Excel 2007 da DP-2). ⚠️ Com o Microsoft
  365 instalado, "Excel.Application.12" é redirecionada para o Excel 16 — medido nesta máquina em
  09/10/2026 —, então a única forma de chegar ao 2007 é abrir o executável dele com o arquivo e se
  ligar à pasta aberta por ele.

.EXAMPLE
  powershell -NoProfile -File scripts\provas\planilha_no_excel.ps1
  powershell -NoProfile -File scripts\provas\planilha_no_excel.ps1 -Executavel "C:\Program Files (x86)\Microsoft Office\Office12\EXCEL.EXE"
#>
param(
  [string]$Pasta = (Join-Path $env:TEMP "ciaara-planilha-de-conferencia"),
  [string]$ProgId = "Excel.Application",
  [string]$Executavel = ""
)

$ErrorActionPreference = "Stop"
$arquivo = [string](Join-Path $Pasta "planilha.xlsx")
$gabarito = Get-Content -Raw -Encoding UTF8 (Join-Path $Pasta "gabarito.json") | ConvertFrom-Json

function Normal($v) {
  if ($null -eq $v) { return $null }
  if ($v -is [string] -and $v -eq "") { return $null }
  if ($v -is [double]) {
    if ([math]::Floor($v) -eq $v) { return [int64]$v }
    return [math]::Round($v, 9)
  }
  if ($v -is [int64] -or $v -is [int32] -or $v -is [decimal]) { return [int64]$v }
  return $v
}

function Igual($a, $b) {
  $x = Normal $a; $y = Normal $b
  if ($null -eq $x -and $null -eq $y) { return $true }
  if ($null -eq $x -or $null -eq $y) { return $false }
  return ("$x" -ceq "$y")
}

<#
  ⚠️ TUDO POR IDispatch (InvokeMember), NUNCA PELA INTERFACE TIPADA: com o Excel 2007 e o do
  Microsoft 365 instalados juntos, a biblioteca de tipos registrada não é a do Excel que sobe, e o
  acesso tipado falha com "Interface não registrada (0x80040155)" — medido nesta máquina em
  09/10/2026. O IDispatch não depende dela.
#>
$Ligar = [Reflection.BindingFlags]
<# ⚠️ O valor que sai de cmdlet vem embrulhado em PSObject, e o COM não o desembrulha: "método não encontrado". #>
function Cru([object[]]$valores) {
  $saida = New-Object 'object[]' $valores.Count
  for ($i = 0; $i -lt $valores.Count; $i++) {
    $v = $valores[$i]
    if ($v -is [System.Management.Automation.PSObject]) { $v = $v.psobject.BaseObject }
    $saida[$i] = $v
  }
  return , $saida
}
<# ⚠️ E a VÍRGULA no return: sem ela o PowerShell desenrola a coleção (Workbooks, Range, Value2) na saída. #>
function Ler($objeto, [string]$nome, [object[]]$argumentos = @()) {
  return , ([System.__ComObject].InvokeMember($nome, $Ligar::GetProperty, $null, $objeto, (Cru $argumentos)))
}
function Gravar($objeto, [string]$nome, $valor) {
  [void][System.__ComObject].InvokeMember($nome, $Ligar::SetProperty, $null, $objeto, (Cru @($valor)))
}
function Chamar($objeto, [string]$nome, [object[]]$argumentos = @()) {
  return , ([System.__ComObject].InvokeMember($nome, $Ligar::InvokeMethod, $null, $objeto, (Cru $argumentos)))
}

function LerAba($ws) {
  $usado = Ler $ws "UsedRange"
  return @{
    Linha0 = Ler $usado "Row"
    Coluna0 = Ler $usado "Column"
    Valores = Ler $usado "Value2"
  }
}

function ColunaDe([string]$letras) {
  $n = 0
  foreach ($c in $letras.ToCharArray()) { $n = $n * 26 + ([int][char]$c - 64) }
  return $n
}

function ValorEm($lida, [string]$ref) {
  $m = [regex]::Match($ref, "^([A-Z]+)(\d+)$")
  $col = ColunaDe $m.Groups[1].Value
  $lin = [int]$m.Groups[2].Value
  $i = $lin - $lida.Linha0 + 1
  $j = $col - $lida.Coluna0 + 1
  if ($i -lt 1 -or $j -lt 1 -or $i -gt $lida.Valores.GetLength(0) -or $j -gt $lida.Valores.GetLength(1)) { return $null }
  return $lida.Valores[$i, $j]
}

$falhas = New-Object System.Collections.Generic.List[string]
if ($Executavel -ne "") {
  $processo = Start-Process -FilePath $Executavel -ArgumentList @("/r", "`"$arquivo`"") -PassThru
  $nome = [System.IO.Path]::GetFileName($arquivo)
  $pastaDeTrabalho = $null
  for ($i = 0; $i -lt 90 -and $null -eq $pastaDeTrabalho; $i++) {
    Start-Sleep -Seconds 1
    $processo.Refresh()
    if ($processo.MainWindowTitle -like "*$([System.IO.Path]::GetFileNameWithoutExtension($nome))*") {
      $pastaDeTrabalho = [System.Runtime.InteropServices.Marshal]::BindToMoniker($arquivo)
    }
  }
  if ($null -eq $pastaDeTrabalho) { Write-Output "o Excel de $Executavel não abriu o arquivo em 90 s"; exit 2 }
  $excel = Ler $pastaDeTrabalho "Application"
} else {
  $excel = New-Object -ComObject $ProgId
}
try {
  Gravar $excel "DisplayAlerts" $false
  $versao = Ler $excel "Version"
  Write-Output "Excel $versao ($(if ($Executavel) { $Executavel } else { $ProgId })) · $arquivo"
  if ($Executavel -eq "") {
    Gravar $excel "Visible" $false
    $pastaDeTrabalho = Chamar (Ler $excel "Workbooks") "Open" @($arquivo, 0, $true)
  }
  [void](Chamar $excel "CalculateFull")
  $planilhas = Ler $pastaDeTrabalho "Worksheets"

  $conferidas = 0
  foreach ($aba in $gabarito.abas) {
    $ws = Ler $planilhas "Item" @($aba.nome)
    $lida = LerAba $ws
    foreach ($par in $aba.celulas) {
      $ref = $par[0]; $esperado = $par[1]
      $obtido = ValorEm $lida $ref
      if ($obtido -is [int32]) { $falhas.Add("$($aba.nome)!$ref : ERRO do Excel ($obtido)"); continue }
      if (-not (Igual $obtido $esperado)) { $falhas.Add("$($aba.nome)!$ref : Excel=[$obtido] gabarito=[$esperado]") }
      $conferidas++
    }
    $erros = 0
    foreach ($v in $lida.Valores) { if ($v -is [int32]) { $erros++ } }
    if ($erros -gt 0) { $falhas.Add("$($aba.nome): $erros célula(s) com valor de erro") }
    Write-Output ("  {0,-16} {1,6} fórmulas conferidas, {2} erro(s)" -f $aba.nome, $aba.celulas.Count, $erros)
  }

  $impressao = Ler $planilhas "Item" @("IMPRESSÃO")
  foreach ($semana in $gabarito.impressao) {
    Gravar (Ler $impressao "Range" @($gabarito.seletor)) "Value2" $semana.rotulo
    [void](Chamar $excel "Calculate")
    $lida = LerAba $impressao
    $diferentes = 0
    foreach ($par in $semana.celulas) {
      $obtido = ValorEm $lida $par[0]
      if ($obtido -is [int32] -or -not (Igual $obtido $par[1])) {
        $diferentes++
        if ($diferentes -le 5) { $falhas.Add("IMPRESSÃO [$($semana.rotulo)] $($par[0]) : Excel=[$obtido] gabarito=[$($par[1])]") }
      }
    }
    if ($diferentes -gt 5) { $falhas.Add("IMPRESSÃO [$($semana.rotulo)]: mais $($diferentes - 5) diferença(s)") }
    Write-Output ("  IMPRESSÃO {0}: {1} células, {2} diferença(s)" -f $semana.rotulo, $semana.celulas.Count, $diferentes)
  }
  if ($null -ne $gabarito.controle) {
    $controle = Ler $planilhas "Item" @("CONTROLE")
    $cronos = Ler $planilhas "Item" @("CRONOS")
    $entrada = Ler $planilhas "Item" @("PREENCHIMENTO")
    Gravar (Ler $controle "Range" @("B2")) "Value2" ([double]$gabarito.controle.referencia)
    [void](Chamar $excel "Calculate")
    $lida = LerAba $controle
    $diferentes = 0
    foreach ($par in $gabarito.controle.celulas) {
      $obtido = ValorEm $lida $par[0]
      if ($obtido -is [int32] -or -not (Igual $obtido $par[1])) {
        $diferentes++
        if ($diferentes -le 5) { $falhas.Add("CONTROLE $($par[0]) : Excel=[$obtido] gabarito=[$($par[1])]") }
      }
    }
    Write-Output ("  CONTROLE com a referência fixa: {0} células, {1} diferença(s)" -f $gabarito.controle.celulas.Count, $diferentes)

    $o = $gabarito.controle.offline
    Gravar (Ler $entrada "Range" @($o.antes)) "Value2" ([string]$o.cod)
    Gravar (Ler $entrada "Range" @($o.antesItem)) "Value2" ($(if ($o.item -is [string]) { [string]$o.item } else { [double]$o.item }))
    Gravar (Ler $entrada "Range" @($o.depois)) "Value2" ([string]$o.cod)
    Gravar (Ler $entrada "Range" @($o.depoisItem)) "Value2" ($(if ($o.item -is [string]) { [string]$o.item } else { [double]$o.item }))
    [void](Chamar $excel "Calculate")
    $verificacoes = @(
      @("CH lançada", $controle, $o.lancada, $o.com.lancada),
      @("CH restante", $controle, $o.restante, $o.com.restante),
      @("CRONOS, semana do TA antes da referência", $cronos, $o.semanaAntes, $o.com.semanaAntes),
      @("CRONOS, semana do TA depois da referência", $cronos, $o.semanaDepois, $o.com.semanaDepois)
    )
    foreach ($v in $verificacoes) {
      $obtido = Ler (Ler $v[1] "Range" @($v[2])) "Value2"
      if (-not (Igual $obtido $v[3])) { $falhas.Add("lançamento offline — $($v[0]) $($v[2]): Excel=[$obtido] esperado=[$($v[3])]") }
    }
    Write-Output ("  Lançamento offline: CH lançada {0} → {1}, restante {2} → {3}, CRONOS {4} → {5} e {6} → {7}" -f `
      $o.sem.lancada, (Ler (Ler $controle "Range" @($o.lancada)) "Value2"), `
      $o.sem.restante, (Ler (Ler $controle "Range" @($o.restante)) "Value2"), `
      $o.sem.semanaAntes, (Ler (Ler $cronos "Range" @($o.semanaAntes)) "Value2"), `
      $o.sem.semanaDepois, (Ler (Ler $cronos "Range" @($o.semanaDepois)) "Value2"))
  }
  [void](Chamar $pastaDeTrabalho "Close" @($false))
}
finally {
  [void](Chamar $excel "Quit")
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  [GC]::Collect()
}

Write-Output "Conferidas: $conferidas fórmulas"
if ($falhas.Count -gt 0) {
  Write-Output "REPROVADO — $($falhas.Count) falha(s):"
  $falhas | Select-Object -First 30 | ForEach-Object { Write-Output "  $_" }
  exit 1
}
Write-Output "APROVADO — o Excel $versao recalculou e deu o mesmo valor em toda fórmula, sem erro em aba nenhuma."
exit 0
