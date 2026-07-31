[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$ExpectedPrinterName,
  [string]$QzServerHost,
  [switch]$RequireRemotePrint,
  [switch]$RunWindowsTestPage,
  [switch]$NonInteractive,
  [string]$ReportDirectory = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Newoteg-Recette'),
  [switch]$NoFailExit
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:Checks = [System.Collections.Generic.List[object]]::new()

function Get-QzRuntimeProcess {
  @(Get-CimInstance Win32_Process -Filter "Name = 'qz-tray.exe' OR Name = 'javaw.exe'" -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -ieq 'qz-tray.exe' -or
    ($_.Name -ieq 'javaw.exe' -and ($_.ExecutablePath -match 'QZ Tray' -or $_.CommandLine -match 'QZ Tray|qz-tray'))
  })
}

function Add-Check {
  param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][ValidateSet('PASS', 'FAIL', 'WARN', 'NOT_RUN', 'NA')][string]$Status,
    [Parameter(Mandatory = $true)][string]$Evidence,
    [ValidateSet('AUTO', 'MANUAL')][string]$Source = 'AUTO'
  )

  $script:Checks.Add([pscustomobject]@{
    id = $Id
    label = $Label
    status = $Status
    source = $Source
    evidence = $Evidence
  })
}

function Read-CheckConfirmation {
  param([Parameter(Mandatory = $true)][string]$Prompt)

  if ($NonInteractive) {
    return 'NOT_RUN'
  }

  while ($true) {
    $answer = (Read-Host "$Prompt [O/N]").Trim()
    if ($answer -match '(?i)^(o|oui|y|yes)$') { return 'PASS' }
    if ($answer -match '(?i)^(n|non|no)$') { return 'FAIL' }
    Write-Host 'Répondez O pour oui ou N pour non.' -ForegroundColor Yellow
  }
}

function Add-ManualCheck {
  param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$Prompt
  )

  $status = Read-CheckConfirmation -Prompt $Prompt
  $evidence = switch ($status) {
    'PASS' { "Confirmé par $env:USERNAME sur $env:COMPUTERNAME le $((Get-Date).ToString('s'))." }
    'FAIL' { "Échec confirmé par $env:USERNAME sur $env:COMPUTERNAME." }
    default { 'Contrôle non exécuté : confirmation physique obligatoire en boutique.' }
  }
  Add-Check -Id $Id -Label $Label -Status $status -Evidence $evidence -Source 'MANUAL'
}

function Add-DurationCheck {
  if ($NonInteractive) {
    Add-Check -Id 'express-sale-duration' -Label 'Vente standard en 20 secondes maximum' -Status 'NOT_RUN' `
      -Evidence 'Mesure chronométrée non exécutée en boutique.' -Source 'MANUAL'
    return
  }

  while ($true) {
    $raw = (Read-Host 'Durée chronométrée en secondes d’une vente standard après entraînement').Trim()
    $seconds = 0.0
    if ([double]::TryParse($raw, [ref]$seconds) -and $seconds -gt 0) {
      Add-Check -Id 'express-sale-duration' -Label 'Vente standard en 20 secondes maximum' `
        -Status $(if ($seconds -le 20) { 'PASS' } else { 'FAIL' }) `
        -Evidence "Durée mesurée : $seconds seconde(s), opérateur $env:USERNAME." -Source 'MANUAL'
      return
    }
    Write-Host 'Saisissez un nombre positif de secondes.' -ForegroundColor Yellow
  }
}

function Escape-MarkdownCell {
  param([AllowEmptyString()][string]$Value)
  return ($Value -replace '\|', '\|' -replace "`r?`n", ' ')
}

if ($env:OS -ne 'Windows_NT') {
  throw 'Cette recette doit être exécutée sur le poste Windows relié à l’Epson TM-T20II.'
}

$startedAt = Get-Date
$printer = $null

try {
  $spooler = Get-Service -Name Spooler
  Add-Check -Id 'windows-spooler' -Label 'Spooler Windows' `
    -Status $(if ($spooler.Status -eq 'Running') { 'PASS' } else { 'FAIL' }) `
    -Evidence "État : $($spooler.Status)."
} catch {
  Add-Check -Id 'windows-spooler' -Label 'Spooler Windows' -Status 'FAIL' -Evidence $_.Exception.Message
}

try {
  $allPrinters = @(Get-Printer -Full -ErrorAction Stop)
  $discardQueues = @($allPrinters | Where-Object {
    $_.PortName -ieq 'nul:' -and (
      $_.Name -match '^EPSON\s+Coupon\s+Generator\(TM-T20II\)$' -or
      $_.DriverName -match '^EPSON\s+CGenerator\(TM-T20\s+Series\)$'
    )
  })
  Add-Check -Id 'epson-discard-queue' -Label 'Aucune fausse file Epson nul:' `
    -Status $(if ($discardQueues.Count -eq 0) { 'PASS' } else { 'FAIL' }) `
    -Evidence $(if ($discardQueues.Count -eq 0) { 'Aucune file Coupon Generator/CGenerator reliée à nul:.' } else { "Files dangereuses : $($discardQueues.Name -join ', ')." })

  $matches = @(if ($ExpectedPrinterName) {
    $allPrinters | Where-Object {
      $_.Name -eq $ExpectedPrinterName -and
      $_.Name -notmatch 'Coupon\s*Generator|CGenerator' -and
      $_.DriverName -match '^EPSON TM-T20II\s+Receipt\d*$' -and
      $_.PortName -match '^(ESDPRT|USB)\d+$'
    }
  } else {
    $allPrinters | Where-Object {
      $_.Name -notmatch 'Coupon\s*Generator|CGenerator' -and
      $_.DriverName -match '^EPSON TM-T20II\s+Receipt\d*$' -and
      $_.PortName -match '^(ESDPRT|USB)\d+$'
    }
  })

  if ($matches.Count -eq 0) {
    $expectation = if ($ExpectedPrinterName) { "nom exact « $ExpectedPrinterName »" } else { 'EPSON/TM-T20II' }
    Add-Check -Id 'epson-detected' -Label 'Epson TM-T20II détectée' -Status 'FAIL' `
      -Evidence "Aucune file correspondant à $expectation. Files présentes : $($allPrinters.Name -join ', ')."
  } else {
    $printer = $matches[0]
    Add-Check -Id 'epson-detected' -Label 'Epson TM-T20II détectée' -Status 'PASS' `
      -Evidence "Nom : $($printer.Name) ; pilote : $($printer.DriverName) ; port : $($printer.PortName)."

    $defaultPrinter = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | Where-Object Default | Select-Object -First 1
    Add-Check -Id 'epson-default' -Label 'Epson USB définie par défaut' `
      -Status $(if ($defaultPrinter -and $defaultPrinter.Name -eq $printer.Name) { 'PASS' } else { 'FAIL' }) `
      -Evidence $(if ($defaultPrinter) { "Imprimante par défaut : $($defaultPrinter.Name)." } else { 'Aucune imprimante Windows par défaut détectée.' })

    $driverLooksCorrect = $printer.DriverName -match '^EPSON TM-T20II\s+Receipt\d*$' -and $printer.PortName -match '^(ESDPRT|USB)\d+$'
    Add-Check -Id 'epson-driver' -Label 'Pilote Epson dédié' `
      -Status $(if ($driverLooksCorrect) { 'PASS' } else { 'FAIL' }) `
      -Evidence "Pilote Windows : $($printer.DriverName)."

    $statusText = [string]$printer.PrinterStatus
    $blocked = $statusText -match 'Offline|Error|PaperOut|Paused|DoorOpen|UserIntervention'
    $workOfflineProperty = $printer.PSObject.Properties['WorkOffline']
    $workOffline = if ($workOfflineProperty) { [string]$workOfflineProperty.Value } else { 'non communiqué' }
    Add-Check -Id 'epson-windows-status' -Label 'État imprimante Windows' `
      -Status $(if ($blocked) { 'FAIL' } elseif ($statusText -match 'Unknown|^$') { 'WARN' } else { 'PASS' }) `
      -Evidence "PrinterStatus : $statusText ; WorkOffline : $workOffline."

    $jobs = @(Get-PrintJob -PrinterName $printer.Name -ErrorAction SilentlyContinue)
    $blockedJobs = @($jobs | Where-Object { [string]$_.JobStatus -match 'Error|Blocked|Offline|PaperOut|Paused' })
    Add-Check -Id 'epson-print-queue' -Label 'File d’impression non bloquée' `
      -Status $(if ($blockedJobs.Count -eq 0) { 'PASS' } else { 'FAIL' }) `
      -Evidence "$($jobs.Count) tâche(s), dont $($blockedJobs.Count) bloquée(s)."
  }
} catch {
  Add-Check -Id 'epson-detected' -Label 'Epson TM-T20II détectée' -Status 'FAIL' -Evidence $_.Exception.Message
}

$qzCandidates = @(
  "$env:ProgramFiles\QZ Tray\qz-tray.exe",
  "${env:ProgramFiles(x86)}\QZ Tray\qz-tray.exe"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
$qzExe = $qzCandidates | Select-Object -First 1

if ($qzExe) {
  $qzVersion = (Get-Item -LiteralPath $qzExe).VersionInfo.ProductVersion
  Add-Check -Id 'qz-installed' -Label 'QZ Tray installé' -Status 'PASS' `
    -Evidence "Version : $qzVersion ; chemin : $qzExe."
} else {
  Add-Check -Id 'qz-installed' -Label 'QZ Tray installé' -Status 'FAIL' `
    -Evidence 'qz-tray.exe absent des dossiers Program Files.'
}

$qzProcesses = @(Get-QzRuntimeProcess)
Add-Check -Id 'qz-running' -Label 'QZ Tray actif' `
  -Status $(if ($qzProcesses.Count -gt 0) { 'PASS' } else { 'FAIL' }) `
  -Evidence $(if ($qzProcesses.Count -gt 0) { "PID : $($qzProcesses.ProcessId -join ', ') ($($qzProcesses.Name -join ', '))." } else { 'Aucun processus QZ Tray/javaw actif.' })

$newotegQzThumbprint = '8D566CDB6AAD1FBDFE9DE0FE85C3CC66D116E63B'
$newotegQzCertificatePaths = @(
  (Join-Path $env:ProgramData 'Newoteg\PrinterSetup\newoteg-qz-signing.crt'),
  (Join-Path $env:APPDATA 'Newoteg\PrinterSetup\newoteg-qz-signing.crt')
) | Where-Object { Test-Path -LiteralPath $_ }
$newotegQzCertificatePath = $newotegQzCertificatePaths | Where-Object {
  try {
    (New-Object Security.Cryptography.X509Certificates.X509Certificate2($_)).Thumbprint -eq $newotegQzThumbprint
  } catch { $false }
} | Select-Object -First 1
try {
  if (-not $newotegQzCertificatePath) { throw 'Certificat Newoteg absent des emplacements machine et utilisateur.' }
  $newotegQzCertificate = New-Object Security.Cryptography.X509Certificates.X509Certificate2($newotegQzCertificatePath)
  $certificateReady = $newotegQzCertificate.Thumbprint -eq $newotegQzThumbprint -and $newotegQzCertificate.NotAfter -gt (Get-Date)
  Add-Check -Id 'qz-newoteg-certificate' -Label 'Certificat de signature Newoteg valide' `
    -Status $(if ($certificateReady) { 'PASS' } else { 'FAIL' }) `
    -Evidence "Fichier : $newotegQzCertificatePath ; empreinte : $($newotegQzCertificate.Thumbprint) ; expiration : $($newotegQzCertificate.NotAfter.ToString('s'))."
} catch {
  Add-Check -Id 'qz-newoteg-certificate' -Label 'Certificat de signature Newoteg valide' -Status 'FAIL' -Evidence $_.Exception.Message
}

$qzPropertiesPath = if ($qzExe) { Join-Path (Split-Path -Parent $qzExe) 'qz-tray.properties' } else { $null }
$expectedOverride = ($newotegQzCertificatePath -replace '\\', '/')
$machineOverrideReady = $qzPropertiesPath -and (Test-Path -LiteralPath $qzPropertiesPath) -and
  ((Get-Content -Raw -LiteralPath $qzPropertiesPath) -match ('(?m)^authcert\.override=' + [Regex]::Escape($expectedOverride) + '\s*$'))
$userQzOptions = [Environment]::GetEnvironmentVariable('QZ_OPTS', 'User')
$userOverrideReady = $expectedOverride -and $userQzOptions -match ('(?i)-DtrustedRootCert=(?:"?' + [Regex]::Escape($expectedOverride) + '"?)')
$overrideReady = $machineOverrideReady -or $userOverrideReady
Add-Check -Id 'qz-newoteg-trust-root' -Label 'Newoteg déclaré comme autorité QZ' `
  -Status $(if ($overrideReady) { 'PASS' } else { 'FAIL' }) `
  -Evidence $(if ($machineOverrideReady) { "$qzPropertiesPath pointe vers $expectedOverride." } elseif ($userOverrideReady) { "QZ_OPTS utilisateur pointe vers $expectedOverride." } else { 'La confiance Newoteg est absente de authcert.override et de QZ_OPTS.' })

$qzAllowFiles = @(
  (Join-Path $env:ProgramData 'qz\allowed.dat'),
  (Join-Path $env:APPDATA 'qz\allowed.dat')
) | Where-Object { Test-Path -LiteralPath $_ }
$qzAllowMatch = $qzAllowFiles | Where-Object {
  (Get-Content -Raw -LiteralPath $_ -ErrorAction SilentlyContinue) -match $newotegQzThumbprint
} | Select-Object -First 1
Add-Check -Id 'qz-newoteg-allowed' -Label 'Newoteg préautorisé dans QZ' `
  -Status $(if ($qzAllowMatch) { 'PASS' } else { 'FAIL' }) `
  -Evidence $(if ($qzAllowMatch) { "Empreinte trouvée dans $qzAllowMatch." } else { 'Empreinte Newoteg absente des listes allowed.dat QZ.' })

try {
  $startupEntries = @(Get-CimInstance Win32_StartupCommand -ErrorAction Stop | Where-Object {
    $_.Name -match 'QZ Tray' -or $_.Command -match 'qz-tray'
  })
  Add-Check -Id 'qz-autostart-declared' -Label 'Démarrage QZ déclaré' `
    -Status $(if ($startupEntries.Count -gt 0) { 'PASS' } else { 'WARN' }) `
    -Evidence $(if ($startupEntries.Count -gt 0) { ($startupEntries | ForEach-Object { "$($_.Name) : $($_.Command)" }) -join ' ; ' } else { 'Entrée de démarrage non détectée ; le redémarrage réel reste obligatoire.' })
} catch {
  Add-Check -Id 'qz-autostart-declared' -Label 'Démarrage QZ déclaré' -Status 'WARN' -Evidence $_.Exception.Message
}

if ($RequireRemotePrint) {
  try {
    $privateProfiles = @(Get-NetConnectionProfile -ErrorAction Stop | Where-Object {
      $_.NetworkCategory -eq 'Private' -and $_.IPv4Connectivity -ne 'Disconnected'
    })
    Add-Check -Id 'network-private' -Label 'Réseau Windows privé' `
      -Status $(if ($privateProfiles.Count -gt 0) { 'PASS' } else { 'FAIL' }) `
      -Evidence $(if ($privateProfiles.Count -gt 0) { ($privateProfiles | ForEach-Object { "$($_.Name) [$($_.IPv4Connectivity)]" }) -join ' ; ' } else { 'Aucun profil réseau privé connecté.' })
  } catch {
    Add-Check -Id 'network-private' -Label 'Réseau Windows privé' -Status 'FAIL' -Evidence $_.Exception.Message
  }

  try {
    $qzRules = @(Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -ErrorAction Stop | Where-Object {
      $_.DisplayName -match 'Newoteg|QZ Tray'
    })
    $portRules = @($qzRules | Where-Object {
      $filter = $_ | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue
      $filter.Protocol -eq 'TCP' -and [string]$filter.LocalPort -eq '8181' -and $_.Profile -match 'Private'
    })
    Add-Check -Id 'qz-firewall-8181' -Label 'Pare-feu QZ WSS 8181 privé' `
      -Status $(if ($portRules.Count -gt 0) { 'PASS' } else { 'FAIL' }) `
      -Evidence $(if ($portRules.Count -gt 0) { "Règle(s) : $($portRules.DisplayName -join ', ')." } else { 'Aucune règle entrante active, privée, TCP 8181 pour Newoteg/QZ.' })
  } catch {
    Add-Check -Id 'qz-firewall-8181' -Label 'Pare-feu QZ WSS 8181 privé' -Status 'FAIL' -Evidence $_.Exception.Message
  }

  try {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 8181 -ErrorAction Stop)
    Add-Check -Id 'qz-listening-8181' -Label 'QZ écoute sur WSS 8181' `
      -Status $(if ($listeners.Count -gt 0) { 'PASS' } else { 'FAIL' }) `
      -Evidence $(if ($listeners.Count -gt 0) { "Adresse(s) : $($listeners.LocalAddress -join ', ')." } else { 'Aucune écoute TCP locale sur 8181.' })
  } catch {
    Add-Check -Id 'qz-listening-8181' -Label 'QZ écoute sur WSS 8181' -Status 'FAIL' -Evidence $_.Exception.Message
  }

  if ($QzServerHost) {
    $reachable = Test-NetConnection -ComputerName $QzServerHost -Port 8181 -InformationLevel Quiet -WarningAction SilentlyContinue
    Add-Check -Id 'qz-host-reachable' -Label 'Hôte QZ joignable sur 8181' `
      -Status $(if ($reachable) { 'PASS' } else { 'FAIL' }) `
      -Evidence "$QzServerHost`:8181 ; TCP : $reachable."
  } else {
    Add-Check -Id 'qz-host-reachable' -Label 'Hôte QZ joignable sur 8181' -Status 'FAIL' `
      -Evidence 'Paramètre -QzServerHost manquant : fournissez l’IP fixe ou le nom DNS utilisé par Android.'
  }

  $certificateRoots = @(
    "$env:APPDATA\qz",
    "$env:ProgramData\QZ Tray",
    "$env:ProgramFiles\QZ Tray",
    "${env:ProgramFiles(x86)}\QZ Tray"
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  $rootCertificate = $certificateRoots | ForEach-Object {
    Get-ChildItem -LiteralPath $_ -Filter 'root-ca.crt' -Recurse -ErrorAction SilentlyContinue
  } | Select-Object -First 1

  if ($rootCertificate) {
    try {
      $certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new($rootCertificate.FullName)
      $san = ($certificate.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' } | ForEach-Object { $_.Format($false) }) -join '; '
      $notExpired = $certificate.NotAfter -gt (Get-Date)
      Add-Check -Id 'qz-root-certificate' -Label 'Certificat racine QZ présent et valide' `
        -Status $(if ($notExpired) { 'PASS' } else { 'FAIL' }) `
        -Evidence "Fichier : $($rootCertificate.FullName) ; expiration : $($certificate.NotAfter.ToString('s')) ; sujet : $($certificate.Subject) ; SAN : $san. L’hôte exact est validé par le test WSS Android."
    } catch {
      Add-Check -Id 'qz-root-certificate' -Label 'Certificat racine QZ présent et valide' -Status 'FAIL' -Evidence $_.Exception.Message
    }
  } else {
    Add-Check -Id 'qz-root-certificate' -Label 'Certificat racine QZ présent et valide' -Status 'FAIL' `
      -Evidence 'root-ca.crt introuvable dans les dossiers QZ usuels.'
  }
} else {
  foreach ($item in @(
    @('network-private', 'Réseau Windows privé'),
    @('qz-firewall-8181', 'Pare-feu QZ WSS 8181 privé'),
    @('qz-listening-8181', 'QZ écoute sur WSS 8181'),
    @('qz-host-reachable', 'Hôte QZ joignable sur 8181'),
    @('qz-root-certificate', 'Certificat racine QZ présent et valide')
  )) {
    Add-Check -Id $item[0] -Label $item[1] -Status 'NA' -Evidence 'Impression distante non demandée pour cette exécution.'
  }
}

if ($RunWindowsTestPage) {
  if (-not $printer) {
    Add-Check -Id 'windows-test-page-sent' -Label 'Page de test Windows envoyée' -Status 'FAIL' -Evidence 'Aucune Epson sélectionnée.'
  } elseif ($PSCmdlet.ShouldProcess($printer.Name, 'Imprimer la page de test Windows')) {
    try {
      $escapedName = $printer.Name.Replace("'", "''")
      $cimPrinter = Get-CimInstance Win32_Printer -Filter "Name='$escapedName'" -ErrorAction Stop
      $result = Invoke-CimMethod -InputObject $cimPrinter -MethodName PrintTestPage -ErrorAction Stop
      Add-Check -Id 'windows-test-page-sent' -Label 'Page de test Windows envoyée' `
        -Status $(if ($result.ReturnValue -eq 0) { 'PASS' } else { 'FAIL' }) `
        -Evidence "Code Win32 : $($result.ReturnValue)."
    } catch {
      Add-Check -Id 'windows-test-page-sent' -Label 'Page de test Windows envoyée' -Status 'FAIL' -Evidence $_.Exception.Message
    }
  }
} else {
  Add-Check -Id 'windows-test-page-sent' -Label 'Page de test Windows envoyée' -Status 'NOT_RUN' `
    -Evidence 'Relancer avec -RunWindowsTestPage ou imprimer une page depuis les paramètres Windows.'
}

Write-Host ''
Write-Host 'Recette physique Newoteg — confirmez uniquement ce que vous observez réellement.' -ForegroundColor Cyan

Add-ManualCheck -Id 'paper-58mm' -Label 'Guide et réglage papier 58 mm' `
  -Prompt 'Le guide 58 mm est-il installé et la largeur 58 mm configurée dans l’imprimante ?'
Add-ManualCheck -Id 'windows-test-page-physical' -Label 'Page Windows physiquement lisible' `
  -Prompt 'Une page de test Windows est-elle réellement sortie, complète et lisible ?'
Add-ManualCheck -Id 'five-receipts' -Label 'Cinq tickets consécutifs' `
  -Prompt 'Cinq tickets Newoteg consécutifs sont-ils réellement sortis sans échec ?'
Add-ManualCheck -Id 'long-receipt' -Label 'Ticket long sans texte coupé' `
  -Prompt 'Le ticket long est-il complet, sans ligne ni montant coupé ?'
Add-ManualCheck -Id 'accents-and-amounts' -Label 'Accents et gros montants' `
  -Prompt 'Les accents et les gros montants sont-ils lisibles et correctement alignés ?'
Add-ManualCheck -Id 'duplicate-label' -Label 'Duplicata clairement identifié' `
  -Prompt 'Le ticket réimprimé porte-t-il clairement la mention DUPLICATA ?'
Add-ManualCheck -Id 'cut-and-layout' -Label 'Coupe, centrage et 32 colonnes' `
  -Prompt 'La coupe, les marges, le centrage et la mise en page 32 colonnes sont-ils corrects ?'
Add-ManualCheck -Id 'failure-no-duplicate-sale' -Label 'Panne sans vente dupliquée' `
  -Prompt 'Après un échec puis une relance d’impression, la vente est-elle restée unique ?'
Add-ManualCheck -Id 'barcode-scanner' -Label 'Lecteur code-barres réel' `
  -Prompt 'Le lecteur réel ajoute-t-il les produits et rend-il immédiatement le focus au scanner ?'
Add-ManualCheck -Id 'keyboard-only-sale' -Label 'Vente standard sans souris' `
  -Prompt 'Une vente standard complète peut-elle être finalisée au scanner et au clavier, sans souris ?'
Add-DurationCheck
Add-ManualCheck -Id 'print-audit-evidence' -Label 'Journal des impressions cohérent' `
  -Prompt 'Le journal d’impression montre-t-il le poste, l’utilisateur, les cinq succès, le duplicata et l’échec simulé ?'
Add-ManualCheck -Id 'offline-browser-restart' -Label 'File hors ligne après redémarrage' `
  -Prompt 'Une opération mise hors ligne survit-elle au redémarrage de l’application puis se synchronise-t-elle une seule fois ?'
Add-ManualCheck -Id 'android-wss' -Label 'Impression Android via WSS' `
  -Prompt 'Le téléphone Android imprime-t-il via le PC QZ sur le même Wi-Fi, en WSS sécurisé ?'
Add-ManualCheck -Id 'android-network-recovery' -Label 'Reprise après coupure Wi-Fi' `
  -Prompt 'Après coupure puis retour du Wi-Fi Android, un nouveau test imprime-t-il sans recréer la vente ?'
Add-ManualCheck -Id 'pc-reboot' -Label 'Redémarrage PC et QZ automatique' `
  -Prompt 'Après un vrai redémarrage du PC, QZ repart-il et Newoteg imprime-t-il sans reconfiguration ?'
Add-ManualCheck -Id 'mobile-360px' -Label 'Écrans principaux utilisables à 360 px' `
  -Prompt 'Sur le téléphone représentatif, les écrans principaux restent-ils lisibles et actionnables sans tableau horizontal incompréhensible ?'
Add-ManualCheck -Id 'role-flows' -Label 'Parcours des quatre rôles' `
  -Prompt 'Les parcours SUPER_ADMIN, ADMIN, VENDEUR et CAISSIER ont-ils été vérifiés sur la base de recette ?'

$failed = @($script:Checks | Where-Object { $_.status -eq 'FAIL' })
$notRun = @($script:Checks | Where-Object { $_.status -eq 'NOT_RUN' })
$overall = if ($failed.Count -gt 0) { 'FAIL' } elseif ($notRun.Count -gt 0) { 'INCOMPLETE' } else { 'PASS' }

New-Item -ItemType Directory -Path $ReportDirectory -Force | Out-Null
$stamp = $startedAt.ToString('yyyyMMdd-HHmmss')
$jsonPath = Join-Path $ReportDirectory "recette-newoteg-$stamp.json"
$markdownPath = Join-Path $ReportDirectory "recette-newoteg-$stamp.md"

$report = [pscustomobject]@{
  schemaVersion = 1
  overall = $overall
  startedAt = $startedAt.ToString('o')
  completedAt = (Get-Date).ToString('o')
  operator = $env:USERNAME
  computer = $env:COMPUTERNAME
  expectedPrinterName = $ExpectedPrinterName
  qzServerHost = $QzServerHost
  remotePrintRequired = [bool]$RequireRemotePrint
  checks = $script:Checks
}
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# Rapport de recette boutique Newoteg')
$lines.Add('')
$lines.Add("- Résultat global : **$overall**")
$lines.Add("- Début : $($startedAt.ToString('s'))")
$lines.Add("- Poste : $env:COMPUTERNAME")
$lines.Add("- Opérateur : $env:USERNAME")
$lines.Add("- Hôte QZ : $(if ($QzServerHost) { $QzServerHost } else { 'non renseigné' })")
$lines.Add('')
$lines.Add('| Contrôle | Source | Résultat | Preuve |')
$lines.Add('|---|---|---|---|')
foreach ($check in $script:Checks) {
  $lines.Add("| $(Escape-MarkdownCell $check.label) | $($check.source) | $($check.status) | $(Escape-MarkdownCell $check.evidence) |")
}
$lines.Add('')
$lines.Add('Un résultat PASS n’est valide que pour le poste, le matériel et le réseau identifiés dans ce rapport.')
$lines | Set-Content -LiteralPath $markdownPath -Encoding UTF8

Write-Host ''
Write-Host "Résultat global : $overall" -ForegroundColor $(if ($overall -eq 'PASS') { 'Green' } elseif ($overall -eq 'INCOMPLETE') { 'Yellow' } else { 'Red' })
Write-Host "Rapport Markdown : $markdownPath"
Write-Host "Rapport JSON     : $jsonPath"

if (-not $NoFailExit) {
  if ($overall -eq 'FAIL') { exit 1 }
  if ($overall -eq 'INCOMPLETE') { exit 2 }
}
