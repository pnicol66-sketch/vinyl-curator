# Vinyl Curator - icon generator
#
# Redraws icon.svg's artwork as PNGs, because Safari ignores SVG manifest icons
# and Chrome's installability wants raster at 192/512. Pure .NET GDI+ so it runs
# on this machine with no Node/Python.
#
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File .\make-icons.ps1
#
# Artwork is kept in step with icon.svg by hand - if you change the SVG, change
# the $art table below to match.

Add-Type -AssemblyName System.Drawing

$BG = '#101013'   # sleeve / background
$art = @(
  @{ r = 192; fill = '#1c1c21' },                 # disc face
  @{ r = 190; stroke = '#2c2c33'; w = 5 },        # outer rim
  @{ r = 158; stroke = '#26262b'; w = 3 },        # grooves
  @{ r = 128; stroke = '#26262b'; w = 3 },
  @{ r =  98; stroke = '#26262b'; w = 3 },
  @{ r =  74; fill = '#f0a832' },                 # label
  @{ r =  11; fill = '#101013' }                  # spindle hole
)

function New-VinylIcon {
  param(
    [int]$Size,
    [string]$Path,
    [double]$ArtScale = 1.0,   # shrink the disc to leave a maskable safe zone
    [bool]$Rounded = $true     # $false = full-bleed square (maskable / apple-touch)
  )

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $s = $Size / 512.0
  $c = $Size / 2.0
  $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($BG))

  if ($Rounded) {
    $d = 100.0 * $s * 2
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc(0, 0, $d, $d, 180, 90)
    $gp.AddArc($Size - $d, 0, $d, $d, 270, 90)
    $gp.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
    $gp.AddArc(0, $Size - $d, $d, $d, 90, 90)
    $gp.CloseFigure()
    $g.FillPath($bgBrush, $gp)
    $gp.Dispose()
  } else {
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
  }

  foreach ($e in $art) {
    $r = $e.r * $s * $ArtScale
    $rect = New-Object System.Drawing.RectangleF(($c - $r), ($c - $r), ($r * 2), ($r * 2))
    if ($e.ContainsKey('fill')) {
      $b = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($e.fill))
      $g.FillEllipse($b, $rect)
      $b.Dispose()
    } else {
      $p = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($e.stroke), [single]($e.w * $s * $ArtScale))
      $g.DrawEllipse($p, $rect)
      $p.Dispose()
    }
  }

  $bgBrush.Dispose()
  $g.Dispose()
  $full = Join-Path $PSScriptRoot $Path
  $bmp.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("  {0}  ({1}x{1})" -f $Path, $Size)
}

Write-Output 'Writing icons:'

# Manifest, purpose "any" - rounded, transparent outside the corners.
New-VinylIcon -Size 192 -Path 'icon-192.png'
New-VinylIcon -Size 512 -Path 'icon-512.png'

# Manifest, purpose "maskable" - must be full-bleed, art inside the 80% safe zone.
New-VinylIcon -Size 512 -Path 'icon-512-maskable.png' -ArtScale 0.8 -Rounded $false

# iOS home screen - square and opaque; iOS applies its own rounding.
New-VinylIcon -Size 180 -Path 'apple-touch-icon.png' -Rounded $false

Write-Output 'Done.'
