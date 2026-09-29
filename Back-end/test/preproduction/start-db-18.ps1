$ErrorActionPreference = 'Stop'
$rehearsalRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$rehearsalRuntime = Join-Path $rehearsalRoot '.local-postgres/refonte-e'
$rehearsalData = Join-Path $rehearsalRuntime 'pg18/data'
$rehearsalBin = Join-Path $rehearsalRuntime 'tooling/postgresql-18.6-3/pgsql/bin'
if (-not (Test-Path -LiteralPath (Join-Path $rehearsalBin 'postgres.exe'))) {
    throw 'Portable PostgreSQL 18.6 binaries are required in the local tooling directory.'
}
$rehearsalVersion = & (Join-Path $rehearsalBin 'postgres.exe') --version
if ($LASTEXITCODE -ne 0 -or $rehearsalVersion -notmatch 'PostgreSQL\) 18\.6$') {
    throw 'Unexpected PostgreSQL binary version.'
}
New-Item -ItemType Directory -Force -Path (Join-Path $rehearsalRuntime 'pg18') | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $rehearsalData 'PG_VERSION'))) {
    & (Join-Path $rehearsalBin 'initdb.exe') -D $rehearsalData -U refonte_test -A trust --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw 'Cannot initialize isolated PostgreSQL 18 cluster.' }
}
if ((Get-Content -LiteralPath (Join-Path $rehearsalData 'PG_VERSION') -Raw).Trim() -ne '18') {
    throw 'Unexpected cluster major version.'
}
& (Join-Path $rehearsalBin 'pg_ctl.exe') -D $rehearsalData status
if ($LASTEXITCODE -ne 0) {
    & (Join-Path $rehearsalBin 'pg_ctl.exe') -D $rehearsalData -l (Join-Path $rehearsalRuntime 'pg18/postgres.log') -o '-h 127.0.0.1 -p 55440' -w start
    if ($LASTEXITCODE -ne 0) { throw 'Cannot start isolated PostgreSQL 18 cluster.' }
}
Write-Output 'PostgreSQL 18.6 rehearsal ready on 127.0.0.1:55440; no Windows service installed.'
