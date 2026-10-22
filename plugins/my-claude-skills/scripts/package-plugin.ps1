param(
    [Parameter(Mandatory = $true)]
    [string] $OutputDirectory
)

$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $sourceRoot '.claude-plugin/plugin.json') -Raw | ConvertFrom-Json
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
$packageName = "$($manifest.name)-$($manifest.version)"
$stage = Join-Path $outputRoot $packageName
$archive = Join-Path $outputRoot "$packageName.zip"
if ((Test-Path -LiteralPath $stage) -or (Test-Path -LiteralPath $archive)) {
    throw "Output already exists: $packageName. Choose a fresh output directory."
}

New-Item -ItemType Directory -Path (Join-Path $stage '.claude-plugin') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceRoot '.claude-plugin/plugin.json') -Destination (Join-Path $stage '.claude-plugin/plugin.json')
foreach ($directory in @('skills', 'hooks', 'scripts', 'vendor', 'docs')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $directory) -Destination (Join-Path $stage $directory) -Recurse
}
foreach ($file in @('README.md', 'CLAUDE.md', 'GLOSSARY.md')) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $file) -Destination (Join-Path $stage $file)
}
New-Item -ItemType Directory -Path (Join-Path $stage '.claude') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceRoot '.claude/skills') -Destination (Join-Path $stage '.claude/skills') -Recurse

# A standalone plugin has one manifest at its root. Do not ship the enclosing
# marketplace or its separate savvy-progress plugin inside this upload.
$pluginManifests = @(Get-ChildItem -LiteralPath $stage -Recurse -Force -File | Where-Object {
    $_.Name -eq 'plugin.json' -and $_.Directory.Name -eq '.claude-plugin'
})
if ($pluginManifests.Count -ne 1) {
    throw "Expected exactly one plugin manifest; found $($pluginManifests.Count)."
}

Add-Type -AssemblyName System.IO.Compression
$zipStream = [IO.File]::Open($archive, [IO.FileMode]::CreateNew)
$zip = [IO.Compression.ZipArchive]::new($zipStream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in Get-ChildItem -LiteralPath $stage -Recurse -Force -File) {
        $entryName = [IO.Path]::GetRelativePath($stage, $file.FullName).Replace('\', '/')
        $entry = $zip.CreateEntry($entryName, [IO.Compression.CompressionLevel]::Optimal)
        $inputStream = [IO.File]::OpenRead($file.FullName)
        $entryStream = $entry.Open()
        try { $inputStream.CopyTo($entryStream) }
        finally { $entryStream.Dispose(); $inputStream.Dispose() }
    }
}
finally { $zip.Dispose(); $zipStream.Dispose() }

[pscustomobject]@{
    Stage = $stage
    Archive = $archive
    Skills = @(Get-ChildItem -LiteralPath (Join-Path $stage 'skills') -Directory).Count
    PluginManifests = $pluginManifests.Count
    SHA256 = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
}
