[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$CertificatePath,
    [switch]$Json,
    [switch]$NoElevation,
    [string]$ResultPath
)

$ErrorActionPreference = 'Stop'
$expectedCertificateSha256 = 'A4E90DFDF90A47EFE8ECF23999EF61E4AAEFBD3BE372B2B09AA690BC289DA3D0'
$expectedThumbprint = '8D566CDB6AAD1FBDFE9DE0FE85C3CC66D116E63B'
$expectedSubject = 'CN=Newoteg Admin QZ Signing, O=Newoteg, C=CM'

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-Result {
    param(
        [string]$Status,
        [int]$Code,
        [string]$Message,
        [hashtable]$Details = @{}
    )

    $result = [ordered]@{
        status = $Status
        code = $Code
        message = $Message
        certificateThumbprint = $expectedThumbprint
    }
    foreach ($key in $Details.Keys) { $result[$key] = $Details[$key] }
    $payload = $result | ConvertTo-Json -Compress -Depth 5
    if ($ResultPath) {
        $parent = Split-Path -Parent $ResultPath
        if ($parent) { [void](New-Item -ItemType Directory -Path $parent -Force) }
        [IO.File]::WriteAllText($ResultPath, $payload, [Text.UTF8Encoding]::new($false))
    }
    if ($Json) { [Console]::Out.WriteLine($payload) } else { Write-Host $Message }
    return $Code
}

function Quote-PowerShellArgument {
    param([string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

function Get-QzProcesses {
    return @(Get-CimInstance Win32_Process -Filter "Name = 'qz-tray.exe' OR Name = 'javaw.exe' OR Name = 'java.exe'" -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -ieq 'qz-tray.exe' -or
        $_.ExecutablePath -match '[\\/]QZ Tray[\\/]' -or
        $_.CommandLine -match 'qz-tray\.jar'
    })
}

function Test-QzPort {
    param([int]$Port)
    $client = New-Object Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(700)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

try {
    if ($env:OS -ne 'Windows_NT') {
        $code = Write-Result -Status 'UNSUPPORTED_OS' -Code 4 -Message 'Ce module QZ est prévu pour Windows.'
        exit $code
    }

    $resolvedCertificate = (Resolve-Path -LiteralPath $CertificatePath).Path
    $certificateHash = (Get-FileHash -LiteralPath $resolvedCertificate -Algorithm SHA256).Hash
    if ($certificateHash -ne $expectedCertificateSha256) {
        $code = Write-Result -Status 'INVALID_CERTIFICATE' -Code 20 -Message 'Le certificat QZ Newoteg ne correspond pas à la version officielle intégrée.'
        exit $code
    }

    $certificate = New-Object Security.Cryptography.X509Certificates.X509Certificate2($resolvedCertificate)
    if ($certificate.Thumbprint -ne $expectedThumbprint -or $certificate.Subject -ne $expectedSubject) {
        $code = Write-Result -Status 'INVALID_CERTIFICATE' -Code 20 -Message 'L’identité du certificat QZ Newoteg est invalide.'
        exit $code
    }
    if ($certificate.NotAfter.ToUniversalTime() -le [DateTime]::UtcNow.AddDays(30)) {
        $code = Write-Result -Status 'EXPIRED_CERTIFICATE' -Code 20 -Message 'Le certificat QZ Newoteg est expiré ou arrive à expiration.'
        exit $code
    }

    $qzDirectories = @(
        (Join-Path $env:ProgramFiles 'QZ Tray'),
        $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} 'QZ Tray' })
    ) | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'qz-tray.exe')) }
    $qzDirectory = $qzDirectories | Select-Object -First 1
    if (-not $qzDirectory) {
        $code = Write-Result -Status 'QZ_NOT_FOUND' -Code 10 -Message 'QZ Tray n’est pas encore installé. Installez QZ Tray puis relancez l’assistant Newoteg.'
        exit $code
    }

    if (-not (Test-IsAdministrator)) {
        if ($NoElevation) {
            $code = Write-Result -Status 'ADMIN_REQUIRED' -Code 5 -Message 'Les droits administrateur sont requis pour approuver Newoteg dans QZ Tray.'
            exit $code
        }

        $elevatedResult = if ($ResultPath) { $ResultPath } else { Join-Path $env:TEMP ("newoteg-qz-trust-{0}.json" -f [Guid]::NewGuid().ToString('N')) }
        $arguments = @(
            '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
            '-File', (Quote-PowerShellArgument $PSCommandPath),
            '-CertificatePath', (Quote-PowerShellArgument $resolvedCertificate),
            '-NoElevation', '-Json',
            '-ResultPath', (Quote-PowerShellArgument $elevatedResult)
        ) -join ' '
        try {
            $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -Verb RunAs -Wait -PassThru
        } catch {
            $code = Write-Result -Status 'ELEVATION_CANCELLED' -Code 5 -Message 'L’autorisation administrateur a été annulée ; QZ Tray n’a pas été configuré.'
            exit $code
        }
        if (Test-Path -LiteralPath $elevatedResult) {
            $payload = [IO.File]::ReadAllText($elevatedResult)
            if (-not $ResultPath) { Remove-Item -LiteralPath $elevatedResult -Force }
            if ($Json) { Write-Output $payload } else { Write-Host (($payload | ConvertFrom-Json).message) }
        }
        exit $process.ExitCode
    }

    $installDirectory = Join-Path $env:ProgramData 'Newoteg\PrinterSetup'
    [void](New-Item -ItemType Directory -Path $installDirectory -Force)
    $installedCertificate = Join-Path $installDirectory 'newoteg-qz-signing.crt'
    Copy-Item -LiteralPath $resolvedCertificate -Destination $installedCertificate -Force
    if ((Get-FileHash -LiteralPath $installedCertificate -Algorithm SHA256).Hash -ne $expectedCertificateSha256) {
        throw 'La copie locale du certificat QZ a échoué au contrôle d’intégrité.'
    }

    $propertiesPath = Join-Path $qzDirectory 'qz-tray.properties'
    if (-not (Test-Path -LiteralPath $propertiesPath)) {
        throw "Le fichier qz-tray.properties est absent de $qzDirectory."
    }
    $backupPath = "$propertiesPath.newoteg-backup"
    if (-not (Test-Path -LiteralPath $backupPath)) {
        Copy-Item -LiteralPath $propertiesPath -Destination $backupPath
    }

    $propertyValue = ($installedCertificate -replace '\\', '/')
    $propertyLine = "authcert.override=$propertyValue"
    $propertyLines = [Collections.Generic.List[string]]::new()
    $propertyFound = $false
    foreach ($line in [IO.File]::ReadAllLines($propertiesPath)) {
        if ($line -match '^\s*(authcert\.override|trustedRootCert)\s*=') {
            if (-not $propertyFound) { $propertyLines.Add($propertyLine) }
            $propertyFound = $true
        } else {
            $propertyLines.Add($line)
        }
    }
    if (-not $propertyFound) { $propertyLines.Add($propertyLine) }
    [IO.File]::WriteAllLines($propertiesPath, $propertyLines, [Text.UTF8Encoding]::new($false))

    foreach ($process in Get-QzProcesses) {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 800

    $qzConsole = Join-Path $qzDirectory 'qz-tray-console.exe'
    if (-not (Test-Path -LiteralPath $qzConsole)) {
        throw 'qz-tray-console.exe est introuvable.'
    }
    $allowProcess = Start-Process -FilePath $qzConsole -ArgumentList @('--allow', $installedCertificate) -Wait -PassThru -WindowStyle Hidden
    if ($allowProcess.ExitCode -ne 0) {
        $code = Write-Result -Status 'ALLOW_FAILED' -Code 22 -Message "QZ Tray n’a pas pu approuver le certificat Newoteg (code $($allowProcess.ExitCode))."
        exit $code
    }

    $allowFiles = @(
        (Join-Path $env:ProgramData 'qz\allowed.dat'),
        (Join-Path $env:APPDATA 'qz\allowed.dat')
    ) | Where-Object { Test-Path -LiteralPath $_ }
    $allowMatch = $allowFiles | Where-Object {
        (Get-Content -Raw -LiteralPath $_ -ErrorAction SilentlyContinue) -match $expectedThumbprint
    } | Select-Object -First 1
    if (-not $allowMatch) {
        $code = Write-Result -Status 'ALLOW_NOT_PERSISTED' -Code 22 -Message 'QZ Tray n’a pas mémorisé le certificat Newoteg dans sa liste approuvée.'
        exit $code
    }

    $qzExecutable = Join-Path $qzDirectory 'qz-tray.exe'
    Start-Process -FilePath $qzExecutable -WindowStyle Hidden
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ((Test-QzPort -Port 8181) -or (Test-QzPort -Port 8182)) {
            $ready = $true
            break
        }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) {
        $code = Write-Result -Status 'QZ_RESTART_FAILED' -Code 23 -Message 'Le certificat est installé, mais QZ Tray n’a pas redémarré. Redémarrez QZ Tray puis réessayez.'
        exit $code
    }

    $code = Write-Result -Status 'TRUST_READY' -Code 0 -Message 'Newoteg est approuvé dans QZ Tray : les impressions signées ne demanderont plus de validation.' -Details @{
        qzDirectory = $qzDirectory
        certificatePath = $installedCertificate
        propertiesPath = $propertiesPath
        allowFile = [string]$allowMatch
        expiresAt = $certificate.NotAfter.ToUniversalTime().ToString('o')
    }
    exit $code
} catch {
    $code = Write-Result -Status 'CONFIGURATION_FAILED' -Code 21 -Message ("La configuration QZ a échoué : " + $_.Exception.Message)
    exit $code
}
