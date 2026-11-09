Add-Type -AssemblyName System.Drawing

$projectRoot = Join-Path $PSScriptRoot '..'
$roundedSource = Join-Path $projectRoot 'assets\icon-rounded.png'
$derivedDir = Join-Path $projectRoot 'assets\derived'
$brandDir = Join-Path $projectRoot 'src\assets\brand'
New-Item -ItemType Directory -Force -Path $derivedDir, $brandDir | Out-Null

$src = [System.Drawing.Bitmap]::FromFile($roundedSource)

# The supplied artwork is already a circular badge on transparency, so the
# alpha channel defines the icon bounds and no extra clipping is needed.
$minX = $src.Width
$minY = $src.Height
$maxX = 0
$maxY = 0
for ($y = 0; $y -lt $src.Height; $y += 1) {
  for ($x = 0; $x -lt $src.Width; $x += 1) {
    if ($src.GetPixel($x, $y).A -gt 8) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

$side = [Math]::Max($maxX - $minX + 1, $maxY - $minY + 1)
$cropRect = New-Object System.Drawing.Rectangle(
  [int]($minX + ($maxX - $minX + 1 - $side) / 2),
  [int]($minY + ($maxY - $minY + 1 - $side) / 2),
  [int]$side,
  [int]$side
)
$crop = $src.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

function New-Icon([int]$canvas, [double]$fillRatio) {
  $bitmap = New-Object System.Drawing.Bitmap($canvas, $canvas, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $drawSize = [int]($canvas * $fillRatio)
  $offset = [int](($canvas - $drawSize) / 2)
  $graphics.DrawImage($crop, $offset, $offset, $drawSize, $drawSize)
  $graphics.Dispose()
  return $bitmap
}

$appIcon = New-Icon -canvas 1024 -fillRatio 0.92
$appIcon.Save((Join-Path $derivedDir 'icon-source.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$appIcon.Dispose()

$brandMark = New-Icon -canvas 512 -fillRatio 0.92
$brandMark.Save((Join-Path $brandDir 'mark.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$brandMark.Dispose()

Write-Output "source circle: $($cropRect.X),$($cropRect.Y) $($cropRect.Width)x$($cropRect.Height)"

$crop.Dispose()
$src.Dispose()
