[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$NoElevation,
    [string]$ResultPath
)

$ErrorActionPreference = 'Stop'
$supportedUsbId = 'VID_04B8&PID_0E15'
$validDriverPattern = '^EPSON TM-T20II\s+Receipt\d*$'
$validPortPattern = '^(ESDPRT|USB)\d+$'

function Write-RepairResult {
    param(
        [Parameter(Mandatory)]$Result,
        [Parameter(Mandatory)][int]$ExitCode
    )

    $serialized = $Result | ConvertTo-Json -Compress
    if (-not [string]::IsNullOrWhiteSpace($ResultPath)) {
        $resultDirectory = Split-Path -Parent $ResultPath
        if ($resultDirectory) { [void](New-Item -ItemType Directory -Path $resultDirectory -Force) }
        Set-Content -LiteralPath $ResultPath -Value $serialized -Encoding UTF8
    }
    if ($Json) { Write-Output $serialized }
    elseif ($Result.message) { Write-Host $Result.message }
    exit $ExitCode
}

function New-RepairResult {
    param(
        [string]$Status,
        [string]$Message,
        [bool]$Changed = $false,
        [string]$PrinterName = '',
        [string]$DriverName = '',
        [string]$PortName = '',
        [int]$InvalidQueueCount = 0
    )

    [pscustomobject]@{
        status = $Status
        message = $Message
        changed = $Changed
        printerName = $PrinterName
        driverName = $DriverName
        portName = $PortName
        invalidQueueCount = $InvalidQueueCount
        checkedAt = (Get-Date).ToString('o')
    }
}

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-ElevatedRepair {
    $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-NoElevation')
    if ($Json) { $arguments += '-Json' }
    if (-not [string]::IsNullOrWhiteSpace($ResultPath)) {
        $arguments += @('-ResultPath', "`"$ResultPath`"")
    }
    try {
        $process = Start-Process -FilePath 'powershell.exe' -Verb RunAs -WindowStyle Hidden -ArgumentList $arguments -Wait -PassThru
        exit $process.ExitCode
    } catch {
        Write-RepairResult (New-RepairResult -Status 'ELEVATION_CANCELLED' -Message 'L’autorisation administrateur a été annulée.') 5
    }
}

try {
    # Un compte caissier standard peut souvent creer une file locale lorsque
    # le pilote et le port Epson existent deja. On essaie d'abord sans UAC.
    try { Set-Service -Name Spooler -StartupType Automatic }
    catch { if (Test-Administrator) { throw } }
    if ((Get-Service -Name Spooler).Status -ne 'Running') { Start-Service -Name Spooler }

    $usbPresent = $false
    try {
        $usbPresent = [bool](Get-PnpDevice -PresentOnly -ErrorAction Stop | Where-Object {
            $_.InstanceId -like "*$supportedUsbId*"
        } | Select-Object -First 1)
    } catch {
        $usbPresent = [bool](Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue | Where-Object {
            $_.DeviceID -like "*$supportedUsbId*"
        } | Select-Object -First 1)
    }

    if (-not $usbPresent) {
        Write-RepairResult (New-RepairResult -Status 'USB_NOT_FOUND' -Message 'Epson TM-T20II non détectée sur le port USB attendu.') 10
    }

    $printers = @(Get-Printer)
    $invalidQueues = @($printers | Where-Object {
        $_.Name -match 'Coupon\s*Generator|CGenerator' -or
        $_.DriverName -match 'Coupon\s*Generator|CGenerator' -or
        $_.PortName -eq 'nul:'
    })
    $validQueue = $printers | Where-Object {
        $_.Name -notmatch 'Coupon\s*Generator|CGenerator' -and
        $_.DriverName -match $validDriverPattern -and
        $_.PortName -match $validPortPattern
    } | Select-Object -First 1

    if ($validQueue) {
        Write-RepairResult (New-RepairResult `
            -Status 'READY' `
            -Message "La file $($validQueue.Name) est déjà correctement reliée à $($validQueue.PortName)." `
            -PrinterName $validQueue.Name `
            -DriverName $validQueue.DriverName `
            -PortName $validQueue.PortName `
            -InvalidQueueCount $invalidQueues.Count) 0
    }

    $driver = Get-PrinterDriver | Where-Object {
        $_.Name -match $validDriverPattern -and $_.Name -notmatch 'CGenerator|Coupon'
    } | Sort-Object @{ Expression = { if ($_.Name -eq 'EPSON TM-T20II Receipt5') { 0 } else { 1 } } }, Name | Select-Object -First 1

    if (-not $driver) {
        Write-RepairResult (New-RepairResult `
            -Status 'DRIVER_NOT_FOUND' `
            -Message 'Le pilote EPSON TM-T20II Receipt est absent ou seule l’imprimante Coupon Generator est installée.' `
            -InvalidQueueCount $invalidQueues.Count) 11
    }

    $port = Get-PrinterPort | Where-Object {
        $_.Name -match $validPortPattern -and ($_.Description -match 'USB|EPSON' -or $_.PortMonitor -match 'USB|EPSON')
    } | Sort-Object @{ Expression = { if ($_.Name -match '^ESDPRT') { 0 } else { 1 } } }, Name | Select-Object -First 1

    if (-not $port) {
        Write-RepairResult (New-RepairResult `
            -Status 'PORT_NOT_FOUND' `
            -Message 'Le pilote existe mais aucun port USB Epson ESDPRT/USB utilisable n’a été créé.' `
            -DriverName $driver.Name `
            -InvalidQueueCount $invalidQueues.Count) 12
    }

    $queueName = $driver.Name
    $sameName = Get-Printer -Name $queueName -ErrorAction SilentlyContinue
    if ($sameName) {
        Set-Printer -Name $queueName -DriverName $driver.Name -PortName $port.Name
    } else {
        Add-Printer -Name $queueName -DriverName $driver.Name -PortName $port.Name
    }

    $deadline = (Get-Date).AddSeconds(20)
    do {
        Start-Sleep -Milliseconds 500
        $repaired = Get-Printer -Name $queueName -ErrorAction SilentlyContinue
    } until (($repaired -and $repaired.DriverName -match $validDriverPattern -and $repaired.PortName -match $validPortPattern) -or (Get-Date) -ge $deadline)

    if (-not $repaired -or $repaired.PortName -notmatch $validPortPattern) {
        throw 'Windows n’a pas confirmé la création de la file Epson sur le port USB.'
    }

    try { (New-Object -ComObject WScript.Network).SetDefaultPrinter($queueName) } catch { }

    Write-RepairResult (New-RepairResult `
        -Status 'REPAIRED' `
        -Message "File $queueName créée et reliée automatiquement au port $($port.Name)." `
        -Changed $true `
        -PrinterName $queueName `
        -DriverName $driver.Name `
        -PortName $port.Name `
        -InvalidQueueCount $invalidQueues.Count) 0
} catch {
    if (-not (Test-Administrator)) {
        if (-not $NoElevation) { Invoke-ElevatedRepair }
        Write-RepairResult (New-RepairResult -Status 'NEEDS_ADMIN' -Message "Windows exige une autorisation administrateur pour terminer la reparation : $($_.Exception.Message)") 5
    }
    Write-RepairResult (New-RepairResult -Status 'REPAIR_FAILED' -Message $_.Exception.Message) 20
}
