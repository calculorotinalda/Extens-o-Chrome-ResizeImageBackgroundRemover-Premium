# generate_icons.ps1 - Chrome Extension Icons Generator

Add-Type -AssemblyName System.Drawing

$src = "C:\Users\alll\.gemini\antigravity-ide\brain\68a45315-18e5-4374-a698-b7ee9b7124a2\logo_1782163730302.png"
$destDir = "c:\antigravity\ResizeImageBackgroundRemover\icons"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

# Copy base logo
Copy-Item $src (Join-Path $destDir "logo.png") -Force
Write-Host "✓ Copied base logo.png"

# Resize icons
$sizes = @(16, 48, 128)
foreach ($size in $sizes) {
    $bmp = [System.Drawing.Image]::FromFile($src)
    $newBmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($newBmp)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bmp, 0, 0, $size, $size)
    
    $g.Dispose()
    $bmp.Dispose()
    
    $outputPath = Join-Path $destDir "icon$size.png"
    $newBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $newBmp.Dispose()
    
    Write-Host "✓ Generated icon${size}.png"
}

Write-Host "All extension icons generated successfully!"
