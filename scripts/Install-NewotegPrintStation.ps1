[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$EpsonDriverInf,
  [string]$QzInstaller,
  [switch]$SilentQzInstall,
  [string]$QzServerHost,
  [switch]$AllowPrivateQzPort
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-QzRuntimeProcess {
  @(Get-CimInstance Win32_Process -Filter "Name = 'qz-tray.exe' OR Name = 'javaw.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -ieq 'qz-tray.exe' -or
    ($_.Name -ieq 'javaw.exe' -and ($_.ExecutablePath -match 'QZ Tray' -or $_.CommandLine -match 'QZ Tray|qz-tray'))
  })
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
    $quotedDriverPath = '"' + $driverPath + '"'
    $driverProcess = Start-Process -FilePath "$env:SystemRoot\System32\pnputil.exe" -ArgumentList @('/add-driver', $quotedDriverPath, '/install') -Wait -PassThru -WindowStyle Hidden
    if ($driverProcess.ExitCode -ne 0) {
      throw "L’installation du pilote Epson a échoué (code $($driverProcess.ExitCode))."
    }
  }
}

$qzCandidates = @(@(
  "$env:ProgramFiles\QZ Tray\qz-tray.exe",
  "${env:ProgramFiles(x86)}\QZ Tray\qz-tray.exe"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) })

if ($qzCandidates.Count -eq 0 -and $QzInstaller) {
  $installerPath = (Resolve-Path -LiteralPath $QzInstaller).Path
  if ($PSCmdlet.ShouldProcess($installerPath, 'Lancer l’installateur QZ Tray')) {
    $qzProcess = if ($SilentQzInstall) {
      Start-Process -FilePath $installerPath -ArgumentList @('/S') -Wait -PassThru
    } else {
      Start-Process -FilePath $installerPath -Wait -PassThru
    }
    if ($qzProcess.ExitCode -ne 0) {
      throw "L’installation de QZ Tray a échoué (code $($qzProcess.ExitCode))."
    }
  }
  $qzCandidates = @(@(
    "$env:ProgramFiles\QZ Tray\qz-tray.exe",
    "${env:ProgramFiles(x86)}\QZ Tray\qz-tray.exe"
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) })
}

if ($QzServerHost) {
  if ($QzServerHost -notmatch '^[A-Za-z0-9.-]+$') {
    throw 'QzServerHost doit contenir uniquement une adresse IP ou un nom DNS, sans protocole ni port.'
  }
  if ($qzCandidates.Count -eq 0) {
    throw 'Installez QZ Tray avant de générer son certificat pour le réseau local.'
  }

  $qzConsole = Join-Path (Split-Path -Parent $qzCandidates[0]) 'qz-tray-console.exe'
  if (-not (Test-Path -LiteralPath $qzConsole)) {
    throw 'qz-tray-console.exe est introuvable. QZ Tray 2.2 ou une version plus récente est requis.'
  }

  if ($PSCmdlet.ShouldProcess($QzServerHost, 'Régénérer le certificat QZ Tray pour le poste d’impression réseau')) {
    Get-QzRuntimeProcess | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    $certProcess = Start-Process -FilePath $qzConsole -ArgumentList @('certgen', '--host', $QzServerHost) -Wait -PassThru -WindowStyle Hidden
    if ($certProcess.ExitCode -ne 0) {
      throw "La génération du certificat QZ pour $QzServerHost a échoué (code $($certProcess.ExitCode))."
    }
  }
}

$spooler = Get-Service -Name Spooler
if ($spooler.Status -ne 'Running' -and $PSCmdlet.ShouldProcess('Spooler', 'Démarrer le service d’impression Windows')) {
  Start-Service -Name Spooler
}

$repairScript = Join-Path $PSScriptRoot 'printer-setup\Repair-NewotegEpsonPrinter.ps1'
if ((Test-Path -LiteralPath $repairScript) -and $PSCmdlet.ShouldProcess('EPSON TM-T20II', 'Détecter et réparer la file Epson sur le port USB réel')) {
  $quotedRepairScript = '"' + $repairScript + '"'
  $repairProcess = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" `
    -ArgumentList @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $quotedRepairScript, '-NoElevation', '-Json') `
    -Wait -PassThru -WindowStyle Hidden
  if ($repairProcess.ExitCode -ne 0) {
    Write-Warning "La file Epson n’a pas encore pu être réparée (code $($repairProcess.ExitCode)). L’assistant officiel peut être nécessaire."
  }
}

$qzTrustReady = $false
$qzTrustScript = Join-Path $PSScriptRoot 'printer-setup\Configure-NewotegQzTrust.ps1'
$qzSigningCertificate = Join-Path (Split-Path -Parent $PSScriptRoot) 'Font-end-admin\NEWOTEG-ECOMMERCE-feature-new-dashboard\public\qz\digital-certificate.txt'
if ($qzCandidates.Count -gt 0 -and
    (Test-Path -LiteralPath $qzTrustScript) -and
    (Test-Path -LiteralPath $qzSigningCertificate) -and
    $PSCmdlet.ShouldProcess('QZ Tray', 'Approuver le certificat de signature Newoteg et supprimer les validations répétées')) {
  $quotedTrustScript = '"' + $qzTrustScript + '"'
  $quotedSigningCertificate = '"' + $qzSigningCertificate + '"'
  $trustProcess = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" `
    -ArgumentList @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $quotedTrustScript, '-CertificatePath', $quotedSigningCertificate, '-NoElevation', '-Json') `
    -Wait -PassThru -WindowStyle Hidden
  if ($trustProcess.ExitCode -ne 0) {
    throw "L’approbation automatique de Newoteg dans QZ Tray a échoué (code $($trustProcess.ExitCode))."
  }
  $qzTrustReady = $true
}

if ($AllowPrivateQzPort) {
  $ruleName = 'Newoteg QZ Tray WSS 8181 (Private)'
  $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if ($PSCmdlet.ShouldProcess($ruleName, 'Configurer la règle pare-feu privée TCP 8181 pour le sous-réseau local')) {
    if ($existingRule) {
      $existingRule | Set-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -Profile Private
      $existingRule | Get-NetFirewallPortFilter | Set-NetFirewallPortFilter -Protocol TCP -LocalPort 8181
      $existingRule | Get-NetFirewallAddressFilter | Set-NetFirewallAddressFilter -RemoteAddress LocalSubnet
    } else {
      New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8181 -Profile Private -RemoteAddress LocalSubnet | Out-Null
    }
  }
}

if ($qzCandidates.Count -gt 0 -and @(Get-QzRuntimeProcess).Count -eq 0) {
  if ($PSCmdlet.ShouldProcess($qzCandidates[0], 'Démarrer QZ Tray')) {
    Start-Process -FilePath $qzCandidates[0] -WindowStyle Hidden
  }
}

$epsonPrinters = @(Get-Printer -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -notmatch 'Coupon\s*Generator|CGenerator' -and
  $_.DriverName -match '^EPSON TM-T20II\s+Receipt\d*$' -and
  $_.PortName -match '^(ESDPRT|USB)\d+$'
})

Write-Host ''
Write-Host 'Diagnostic du poste Newoteg' -ForegroundColor Cyan
Write-Host "- Spooler Windows : $((Get-Service -Name Spooler).Status)"
Write-Host "- QZ Tray installé : $([bool]$qzCandidates.Count)"
Write-Host "- Newoteg approuvé dans QZ : $qzTrustReady"
if ($QzServerHost) {
  Write-Host "- Hôte du certificat QZ : $QzServerHost"
}
if ($AllowPrivateQzPort) {
  Write-Host '- Pare-feu : TCP 8181 autorisé uniquement sur le profil privé et le sous-réseau local.'
}
if ($epsonPrinters.Count -eq 0) {
  Write-Warning 'Aucune vraie file Epson TM-T20II reliée à un port USB n’est disponible. Une file Coupon Generator/nul: ne compte pas comme imprimante.'
} else {
  foreach ($printer in $epsonPrinters) {
    Write-Host "- Imprimante détectée : $($printer.Name) [$($printer.DriverName)]" -ForegroundColor Green
  }
}
Write-Host '- Étape suivante : Paramètres > Imprimante tickets > Détecter > Ticket de test.'
Write-Host '- Recette complète : .\scripts\Invoke-NewotegShopAcceptance.ps1 -RequireRemotePrint -QzServerHost <IP_FIXE>'
