[CmdletBinding()]
param(
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$sourceDirectory = Join-Path $PSScriptRoot 'printer-setup'
$sourcePath = Join-Path $sourceDirectory 'NewotegPrinterSetup.cs'
$manifestPath = Join-Path $sourceDirectory 'NewotegPrinterSetup.manifest'
$repairScriptPath = Join-Path $sourceDirectory 'Repair-NewotegEpsonPrinter.ps1'

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $repositoryRoot 'Font-end-admin\NEWOTEG-ECOMMERCE-feature-new-dashboard\public\downloads\Newoteg-Printer-Setup.exe'
}

$compilerCandidates = @(
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
)
$compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $compiler) {
    throw 'Compilateur .NET Framework 4 introuvable. Activez .NET Framework 4.x puis réessayez.'
}

$outputDirectory = Split-Path -Parent $OutputPath
[void](New-Item -ItemType Directory -Path $outputDirectory -Force)

$arguments = @(
    '/nologo',
    '/target:winexe',
    '/optimize+',
    "/out:$OutputPath",
    "/win32manifest:$manifestPath",
    "/resource:$repairScriptPath,Newoteg.RepairPrinter.ps1",
    '/reference:System.dll',
    '/reference:System.Core.dll',
    '/reference:System.Drawing.dll',
    '/reference:System.Windows.Forms.dll',
    '/reference:System.Management.dll',
    '/reference:System.ServiceProcess.dll',
    '/reference:System.IO.Compression.dll',
    '/reference:System.IO.Compression.FileSystem.dll',
    $sourcePath
)

& $compiler @arguments
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $OutputPath)) {
    throw "La compilation de l'assistant Newoteg a échoué."
}

$result = Get-Item -LiteralPath $OutputPath
Write-Host "Assistant créé : $($result.FullName) ($($result.Length) octets)"
