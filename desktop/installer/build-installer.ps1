[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $projectRoot
$temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$buildDirectory = Join-Path $temporaryRoot 'PolytaInstallerBuild'
$releaseDirectory = Join-Path $projectRoot 'release'
$portalOutputFile = Join-Path $releaseDirectory 'Polyta-Portal-Setup.exe'
$adminOutputFile = Join-Path $releaseDirectory 'Polyta-Admin-Setup.exe'
$logoFile = Join-Path $repositoryRoot 'assets\img\logo-desktop.png'
$installerSourceFile = Join-Path $PSScriptRoot 'Installer.cs'
$desktopAppSourceFile = Join-Path $PSScriptRoot 'DesktopApp.cs'
$webViewVersion = '1.0.4129.50'
$dependencyCacheRoot = Join-Path $temporaryRoot 'PolytaInstallerDependencies'
$webViewPackageFile = Join-Path $dependencyCacheRoot "microsoft.web.webview2.$webViewVersion.nupkg"
$webViewPackageDirectory = Join-Path $dependencyCacheRoot "microsoft.web.webview2.$webViewVersion"
$compilerCandidates = @(
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
)
$compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $compiler) {
    throw 'Kompiler .NET Framework bawaan Windows tidak tersedia.'
}

$resolvedBuildDirectory = [System.IO.Path]::GetFullPath($buildDirectory)
if (-not $resolvedBuildDirectory.StartsWith($temporaryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Direktori build berada di luar folder temporary: $resolvedBuildDirectory"
}

if (Test-Path -LiteralPath $buildDirectory) {
    Remove-Item -LiteralPath $buildDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $buildDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $dependencyCacheRoot -Force | Out-Null

if (-not (Test-Path -LiteralPath $webViewPackageFile)) {
    $packageUrl = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$webViewVersion/microsoft.web.webview2.$webViewVersion.nupkg"
    Write-Host "Mengunduh Microsoft WebView2 SDK $webViewVersion..."
    Invoke-WebRequest -UseBasicParsing -Uri $packageUrl -OutFile $webViewPackageFile
}

if (-not (Test-Path -LiteralPath $webViewPackageDirectory)) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($webViewPackageFile, $webViewPackageDirectory)
}

$webViewCoreDll = Join-Path $webViewPackageDirectory 'lib\net462\Microsoft.Web.WebView2.Core.dll'
$webViewWinFormsDll = Join-Path $webViewPackageDirectory 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
$webViewLoaderX64Dll = Join-Path $webViewPackageDirectory 'runtimes\win-x64\native\WebView2Loader.dll'
$webViewLoaderX86Dll = Join-Path $webViewPackageDirectory 'runtimes\win-x86\native\WebView2Loader.dll'
@($webViewCoreDll, $webViewWinFormsDll, $webViewLoaderX64Dll, $webViewLoaderX86Dll) | ForEach-Object {
    if (-not (Test-Path -LiteralPath $_)) {
        throw "Komponen WebView2 tidak ditemukan: $_"
    }
}

$iconFile = Join-Path $buildDirectory 'polyta.ico'
Add-Type -AssemblyName System.Drawing

function New-OpaqueIconDib {
    param(
        [Parameter(Mandatory)][System.Drawing.Bitmap]$Source,
        [Parameter(Mandatory)][int]$Size
    )

    $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        # Latar putih digambar terlebih dahulu agar Windows tidak membentuk
        # kembali sudut transparan pada ikon shortcut.
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($Source, 0, 0, $Size, $Size)
    } finally {
        $graphics.Dispose()
    }

    $memory = [System.IO.MemoryStream]::new()
    $writer = [System.IO.BinaryWriter]::new($memory)
    try {
        $pixelBytes = $Size * $Size * 4
        $maskStride = [int]([Math]::Ceiling($Size / 32.0) * 4)

        # BITMAPINFOHEADER; tinggi dua kali lipat karena memuat bitmap dan mask.
        $writer.Write([uint32]40)
        $writer.Write([int32]$Size)
        $writer.Write([int32]($Size * 2))
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]0)
        $writer.Write([uint32]$pixelBytes)
        $writer.Write([int32]0)
        $writer.Write([int32]0)
        $writer.Write([uint32]0)
        $writer.Write([uint32]0)

        # Data ICO dibaca dari bawah ke atas dalam urutan BGRA. Alfa selalu
        # 255 dan mask seluruhnya nol sehingga setiap piksel tetap buram.
        for ($y = $Size - 1; $y -ge 0; $y--) {
            for ($x = 0; $x -lt $Size; $x++) {
                $pixel = $bitmap.GetPixel($x, $y)
                $writer.Write([byte]$pixel.B)
                $writer.Write([byte]$pixel.G)
                $writer.Write([byte]$pixel.R)
                $writer.Write([byte]255)
            }
        }
        $writer.Write([byte[]]::new($maskStride * $Size))
        return ,$memory.ToArray()
    } finally {
        $writer.Dispose()
        $memory.Dispose()
        $bitmap.Dispose()
    }
}

$sourceBitmap = [System.Drawing.Bitmap]::FromFile($logoFile)
try {
    $iconSizes = @(16, 24, 32, 48, 64, 128, 256)
    $iconImages = @($iconSizes | ForEach-Object { New-OpaqueIconDib -Source $sourceBitmap -Size $_ })
    $stream = [System.IO.File]::Create($iconFile)
    $writer = [System.IO.BinaryWriter]::new($stream)
    try {
        $writer.Write([uint16]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]$iconSizes.Count)
        $offset = 6 + (16 * $iconSizes.Count)
        for ($index = 0; $index -lt $iconSizes.Count; $index++) {
            $size = $iconSizes[$index]
            $writer.Write([byte]$(if ($size -eq 256) { 0 } else { $size }))
            $writer.Write([byte]$(if ($size -eq 256) { 0 } else { $size }))
            $writer.Write([byte]0)
            $writer.Write([byte]0)
            $writer.Write([uint16]1)
            $writer.Write([uint16]32)
            $writer.Write([uint32]$iconImages[$index].Length)
            $writer.Write([uint32]$offset)
            $offset += $iconImages[$index].Length
        }
        $iconImages | ForEach-Object { $writer.Write([byte[]]$_) }
    } finally {
        $writer.Dispose()
        $stream.Dispose()
    }
} finally {
    $sourceBitmap.Dispose()
}

function Build-DesktopApp {
    param(
        [Parameter(Mandatory)][string]$OutputFile,
        [string]$Define
    )

    $compilerArguments = @(
        '/nologo',
        '/target:winexe',
        '/platform:anycpu',
        '/optimize+',
        ('/out:"{0}"' -f $OutputFile),
        ('/win32icon:"{0}"' -f $iconFile),
        '/reference:System.dll',
        '/reference:System.Core.dll',
        '/reference:System.Drawing.dll',
        '/reference:System.Windows.Forms.dll',
        ('/reference:"{0}"' -f $webViewCoreDll),
        ('/reference:"{0}"' -f $webViewWinFormsDll)
    )
    if ($Define) {
        $compilerArguments += ('/define:{0}' -f $Define)
    }
    $compilerArguments += ('"{0}"' -f $desktopAppSourceFile)

    $compilerOutput = & $compiler $compilerArguments 2>&1
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $OutputFile)) {
        $compilerOutput | ForEach-Object { Write-Error $_ }
        throw "Build aplikasi desktop gagal. Exit code compiler: $LASTEXITCODE"
    }
}

function Build-Installer {
    param(
        [Parameter(Mandatory)][string]$OutputFile,
        [Parameter(Mandatory)][string]$AppExecutable,
        [string]$Define
    )

    if (Test-Path -LiteralPath $OutputFile) {
        Remove-Item -LiteralPath $OutputFile -Force
    }

    $compilerArguments = @(
        '/nologo',
        '/target:winexe',
        '/optimize+',
        ('/out:"{0}"' -f $OutputFile),
        ('/win32icon:"{0}"' -f $iconFile),
        '/reference:System.dll',
        '/reference:System.Core.dll',
        '/reference:System.Drawing.dll',
        '/reference:System.Windows.Forms.dll',
        '/reference:Microsoft.CSharp.dll',
        ('/resource:"{0}",Polyta.DesktopApp.exe' -f $AppExecutable),
        ('/resource:"{0}",Polyta.WebView2.Core.dll' -f $webViewCoreDll),
        ('/resource:"{0}",Polyta.WebView2.WinForms.dll' -f $webViewWinFormsDll),
        ('/resource:"{0}",Polyta.WebView2Loader.x64.dll' -f $webViewLoaderX64Dll),
        ('/resource:"{0}",Polyta.WebView2Loader.x86.dll' -f $webViewLoaderX86Dll)
    )
    if ($Define) {
        $compilerArguments += ('/define:{0}' -f $Define)
    }
    $compilerArguments += ('"{0}"' -f $installerSourceFile)

    $compilerOutput = & $compiler $compilerArguments 2>&1
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $OutputFile)) {
        $compilerOutput | ForEach-Object { Write-Error $_ }
        throw "Build installer gagal. Exit code compiler: $LASTEXITCODE"
    }

    $artifact = Get-Item -LiteralPath $OutputFile
    $hash = Get-FileHash -LiteralPath $OutputFile -Algorithm SHA256
    Write-Host "Installer berhasil dibuat: $($artifact.FullName)"
    Write-Host "Ukuran: $($artifact.Length) byte"
    Write-Host "SHA-256: $($hash.Hash)"
}

$portalAppFile = Join-Path $buildDirectory 'Polyta-Portal.exe'
$adminAppFile = Join-Path $buildDirectory 'Polyta-Administrator.exe'
Build-DesktopApp -OutputFile $portalAppFile
Build-DesktopApp -OutputFile $adminAppFile -Define 'ADMIN'
Build-Installer -OutputFile $portalOutputFile -AppExecutable $portalAppFile
Build-Installer -OutputFile $adminOutputFile -AppExecutable $adminAppFile -Define 'ADMIN'
