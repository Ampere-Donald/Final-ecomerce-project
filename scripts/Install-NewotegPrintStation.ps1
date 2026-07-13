[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$EpsonDriverInf,
  [string]$QzInstaller,
  [switch]$AllowPrivateQzPort
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  throw 'Relancez PowerShell en tant qu’administrateur pour préparer le poste d’impression.'
}

if ($EpsonDriverInf) {
  $driverPath = (Resolve-Path -LiteralPath $EpsonDriverInf).Path
  if ([IO.Path]::GetExtension($driverPath) -ne '.inf') {
    throw 'EpsonDriverInf doit désigner le fichier .inf du pilote Epson TM-T20II.'
  }
  if ($PSCmdlet.ShouldProcess($driverPath, 'Installer le pilote Epson avec pnputil')) {
    $driverProcess = Start-Process -FilePath "$env:SystemRoot\System32\pnputil.exe" -ArgumentList @('/add-driver', $driverPath, '/install') -Wait -PassThru
    if ($driverProcess.ExitCode -ne 0) {
      throw "L’installation du pilote Epson a échoué (code $($driverProcess.ExitCode))."
    }
  }
}

$qzCandidates = @(
  "$env:ProgramFiles\QZ Tray\qz-tray.exe",
  "${env:ProgramFiles(x86)}\QZ Tray\qz-tray.exe"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

if ($qzCandidates.Count -eq 0 -and $QzInstaller) {
  $installerPath = (Resolve-Path -LiteralPath $QzInstaller).Path
  if ($PSCmdlet.ShouldProcess($installerPath, 'Lancer l’installateur QZ Tray')) {
    $qzProcess = Start-Process -FilePath $installerPath -Wait -PassThru
    if ($qzProcess.ExitCode -ne 0) {
      throw "L’installation de QZ Tray a échoué (code $($qzProcess.ExitCode))."
    }
  }
  $qzCandidates = @(
    "$env:ProgramFiles\QZ Tray\qz-tray.exe",
    "${env:ProgramFiles(x86)}\QZ Tray\qz-tray.exe"
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
}

$spooler = Get-Service -Name Spooler
if ($spooler.Status -ne 'Running' -and $PSCmdlet.ShouldProcess('Spooler', 'Démarrer le service d’impression Windows')) {
  Start-Service -Name Spooler
}

if ($AllowPrivateQzPort) {
  $ruleName = 'Newoteg QZ Tray WSS 8181 (Private)'
  $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if (-not $existingRule -and $PSCmdlet.ShouldProcess($ruleName, 'Créer la règle pare-feu privée TCP 8181')) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8181 -Profile Private | Out-Null
  }
}

$epsonPrinters = @(Get-Printer -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -match 'EPSON|TM[- ]?T20' -or $_.DriverName -match 'EPSON|TM[- ]?T20'
})

Write-Host ''
Write-Host 'Diagnostic du poste Newoteg' -ForegroundColor Cyan
Write-Host "- Spooler Windows : $((Get-Service -Name Spooler).Status)"
Write-Host "- QZ Tray installé : $([bool]$qzCandidates.Count)"
if ($epsonPrinters.Count -eq 0) {
  Write-Warning 'Aucune Epson TM-T20II détectée. Branchez-la, vérifiez son alimentation et fournissez le pilote officiel .inf.'
} else {
  foreach ($printer in $epsonPrinters) {
    Write-Host "- Imprimante détectée : $($printer.Name) [$($printer.DriverName)]" -ForegroundColor Green
  }
}
Write-Host '- Étape suivante : Paramètres > Imprimante tickets > Détecter > Ticket de test.'
