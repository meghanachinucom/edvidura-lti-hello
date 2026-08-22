# Nightly / manual Postgres backup (Windows / PowerShell).
# Usage:
#   .\scripts\backup_postgres.ps1
#   $env:DATABASE_URL="postgresql://..."; .\scripts\backup_postgres.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $Root "backups" }
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Out = Join-Path $BackupDir "edvidura-$Stamp.dump"

if ($env:DATABASE_URL) {
    Write-Host "Dumping via DATABASE_URL -> $Out"
    & pg_dump $env:DATABASE_URL --format=custom --file=$Out
} else {
    $running = docker ps --format "{{.Names}}" 2>$null
    if ($running -notcontains "db-db-1") {
        throw "Set DATABASE_URL or start db/ docker compose (db-db-1)."
    }
    Write-Host "Dumping via docker db-db-1 -> $Out"
    docker exec db-db-1 pg_dump -U edvidura -d edvidura --format=custom -f /tmp/edvidura.dump
    docker cp db-db-1:/tmp/edvidura.dump $Out
}

Get-ChildItem $BackupDir -Filter "edvidura-*.dump" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 14 |
    Remove-Item -Force

Write-Host "OK $Out"
Get-Item $Out | Format-List Name, Length, LastWriteTime
