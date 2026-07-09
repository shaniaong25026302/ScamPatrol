

$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetRoot = (Get-Location).Path

$files = @(
  'db/schema.sql',
  'db/drafts-migration.sql',
  'src/models/case.model.js',
  'src/controllers/case.controller.js',
  'src/routes/cases.pages.routes.js',
  'views/cases/list.ejs',
  'views/cases/new.ejs',
  'views/cases/drafts.ejs',
  'views/partials/case-form.ejs',
  'views/partials/chat-widget.ejs',
  'public/js/chat-widget.js',
  'public/css/game.css',
  'public/css/styles.css'
)

foreach ($file in $files) {
  $src = Join-Path $sourceRoot $file
  $dest = Join-Path $targetRoot $file
  $destDir = Split-Path -Parent $dest
  if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  Copy-Item $src $dest -Force
  Write-Host "Copied $file"
}

Write-Host "Done. Now run: npm run dev, then git status"
