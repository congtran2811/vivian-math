# Removes the Vivian Math buttons from Microsoft Word. Close Word first.
$ErrorActionPreference = 'Stop'
if (Get-Process -Name WINWORD -ErrorAction SilentlyContinue) {
    Write-Output 'ERR WORD_RUNNING'
    exit 1
}
$target = Join-Path $env:APPDATA 'Microsoft\Word\STARTUP\VivianMath.dotm'
if (Test-Path $target) { Remove-Item -Path $target -Force }
Write-Output "OK $target"
