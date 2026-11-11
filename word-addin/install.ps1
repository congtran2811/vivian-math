# Installs the Vivian Math buttons into Microsoft Word.
#
# Builds VivianMath.dotm from VivianMath.bas with Word itself and saves it in
# Word's STARTUP folder, so Word loads it on every start.
# Prints one status line for the app to read: "OK <path>" or "ERR <code or message>".
param(
    [string]$ExePath = (Join-Path $env:LOCALAPPDATA 'Programs\vivian-math\Vivian Math.exe'),
    # Only when running from source: the project folder passed to electron.exe.
    [string]$AppPath = ''
)

$ErrorActionPreference = 'Stop'
$word = $null
$security = $null
$hadValue = $false
$oldValue = $null

try {
    if (Get-Process -Name WINWORD -ErrorAction SilentlyContinue) {
        Write-Output 'ERR WORD_RUNNING'
        exit 1
    }

    $curVer = (Get-ItemProperty -Path 'Registry::HKEY_CLASSES_ROOT\Word.Application\CurVer' -ErrorAction SilentlyContinue).'(default)'
    if (-not $curVer) {
        Write-Output 'ERR NO_WORD'
        exit 1
    }
    $version = ($curVer -replace '^Word\.Application\.', '') + '.0'

    # Where the Word buttons find the app (read by GetSetting in VivianMath.bas).
    $command = '"' + $ExePath + '"'
    if ($AppPath) { $command += ' "' + $AppPath + '"' }
    $settings = 'HKCU:\Software\VB and VBA Program Settings\VivianMath\Config'
    if (-not (Test-Path $settings)) { New-Item -Path $settings -Force | Out-Null }
    Set-ItemProperty -Path $settings -Name 'Command' -Value $command

    # Importing a macro module needs "Trust access to the VBA project object model".
    # Turn it on only for this install, then put the old setting back.
    $security = "HKCU:\Software\Microsoft\Office\$version\Word\Security"
    if (-not (Test-Path $security)) { New-Item -Path $security -Force | Out-Null }
    $existing = Get-ItemProperty -Path $security -Name 'AccessVBOM' -ErrorAction SilentlyContinue
    if ($existing) { $hadValue = $true; $oldValue = $existing.AccessVBOM }
    Set-ItemProperty -Path $security -Name 'AccessVBOM' -Value 1 -Type DWord

    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    $startup = $word.StartupPath
    if (-not (Test-Path $startup)) { New-Item -ItemType Directory -Path $startup -Force | Out-Null }
    # A plain string: Word's SaveAs rejects the PSObject wrapper Join-Path returns.
    [string]$target = Join-Path $startup 'VivianMath.dotm'
    # Word loads an older copy from STARTUP even when automated; unload it so the file can be replaced.
    foreach ($addIn in @($word.AddIns)) {
        if ($addIn.Name -eq 'VivianMath.dotm') { $addIn.Installed = $false }
    }
    if (Test-Path $target) { Remove-Item -Path $target -Force }

    $doc = $word.Documents.Add()
    $doc.VBProject.VBComponents.Import((Join-Path $PSScriptRoot 'VivianMath.bas')) | Out-Null
    # 15 = wdFormatXMLTemplateMacroEnabled (.dotm)
    $doc.SaveAs([ref]$target, [ref]15)
    $doc.Close([ref]0)

    Write-Output "OK $target"
}
catch {
    Write-Output ('ERR ' + ($_.Exception.Message -replace '\s+', ' '))
    exit 1
}
finally {
    if ($word) {
        try { $word.Quit([ref]0) } catch { }
        try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) } catch { }
        # Let Word finish shutting down before touching its settings again.
        for ($i = 0; $i -lt 50 -and (Get-Process -Name WINWORD -ErrorAction SilentlyContinue); $i++) {
            Start-Sleep -Milliseconds 200
        }
    }
    if ($security) {
        if ($hadValue) { Set-ItemProperty -Path $security -Name 'AccessVBOM' -Value $oldValue -Type DWord }
        else { Remove-ItemProperty -Path $security -Name 'AccessVBOM' -ErrorAction SilentlyContinue }
    }
}
