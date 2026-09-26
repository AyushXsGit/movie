param([string]$Link)
if ([string]::IsNullOrWhiteSpace($Link)) { exit 1 }

try {
    $uri = [System.Uri]$Link
    $encoded = [System.Web.HttpUtility]::ParseQueryString($uri.Query).Get('url')
    if ($encoded) {
        $url = $encoded
    } else {
        $url = $Link -replace '^moviehub-vlc://', ''
    }
} catch {
    $url = $Link -replace '^moviehub-vlc://', ''
}

if ([string]::IsNullOrWhiteSpace($url)) { exit 1 }

$paths = @(
    "$env:ProgramFiles\VideoLAN\VLC\vlc.exe",
    "$env:ProgramFiles(x86)\VideoLAN\VLC\vlc.exe",
    "$env:LOCALAPPDATA\Programs\VideoLAN\VLC\vlc.exe"
)
$vlc = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $vlc) { exit 1 }

Start-Process -FilePath $vlc -ArgumentList @($url)
